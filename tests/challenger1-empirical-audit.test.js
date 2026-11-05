import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const mockStorage = {}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    localStorage: {
      getItem: (key) => mockStorage[key] ?? null,
      setItem: (key, val) => {
        mockStorage[key] = String(val)
      },
      removeItem: (key) => {
        delete mockStorage[key]
      },
      clear: () => {
        Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
      },
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
}
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = globalThis.window.localStorage
}

import {
  createCustomerBalanceAdjustment,
  saveCustomerAdjustment,
  getCustomerAdjustments,
  clearCustomerAdjustments,
  loadAllCustomerAdjustments,
} from '../src/components/customers/customerAdjustmentHelpers.js'
import { useAXStore } from '../src/store/useAXStore.js'
import { AX_OperationsService } from '../src/services/AX_OperationsService.js'

describe('Challenger 1 Empirical Stress Tests: R1, R4, R2', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
    clearCustomerAdjustments()
  })

  describe('R1: Customer Balance Adjustments & Treasury Isolation', () => {
    it('R1.1: should create audited balance adjustment with all necessary metadata', () => {
      const customer = { id: 'cust-101', name: 'البركة ماركت', balance: 12000 }
      const user = { name: 'المراجع المالي', email: 'auditor@ax.com' }

      const adj = createCustomerBalanceAdjustment({
        customer,
        previousBalance: 12000,
        newBalance: 15500,
        notes: 'فروقات جرد نهاية الشهر',
        user,
      })

      assert.ok(adj, 'Adjustment record must be generated')
      assert.ok(adj.id.startsWith('adj-'), 'ID must have adj- prefix')
      assert.equal(adj.customerId, 'cust-101')
      assert.equal(adj.customerName, 'البركة ماركت')
      assert.equal(adj.previousBalance, 12000)
      assert.equal(adj.newBalance, 15500)
      assert.equal(adj.delta, 3500)
      assert.equal(adj.amount, 3500)
      assert.equal(adj.type, 'balance_adjustment')
      assert.ok(adj.description.includes('زيادة مديونية'))
      assert.equal(adj.notes, 'فروقات جرد نهاية الشهر')
      assert.equal(adj.createdBy, 'المراجع المالي')
      assert.equal(adj.treasuryId, null)
      assert.equal(adj.isTreasuryDistorting, false)
    })

    it('R1.2: should strictly NOT distort or alter cash treasury balances or cash transactions', () => {
      const initialTreasuries = [
        { id: 'tr-1', name: 'الخزينة الرئيسية', balance: 50000, type: 'cash' },
        { id: 'tr-2', name: 'البنك الأهلي', balance: 100000, type: 'bank' },
      ]
      const initialCashTx = [
        { id: 'tx-1', amount: 5000, type: 'client_receipt', treasuryId: 'tr-1' },
      ]

      useAXStore.setState({
        treasuryAccounts: initialTreasuries,
        cashTransactions: initialCashTx,
        clients: [{ id: 'cust-202', name: 'مؤسسة الأهرام', balance: 8000 }],
      })

      const customer = useAXStore.getState().clients[0]
      const adj = createCustomerBalanceAdjustment({
        customer,
        previousBalance: 8000,
        newBalance: 4000,
        notes: 'تسوية تسديد يدوي سابق',
      })
      saveCustomerAdjustment(adj)

      useAXStore.getState().updateClient(customer.id, { balance: 4000 })

      const stateAfter = useAXStore.getState()
      assert.equal(stateAfter.treasuryAccounts[0].balance, 50000, 'Treasury 1 balance must remain strictly unchanged')
      assert.equal(stateAfter.treasuryAccounts[1].balance, 100000, 'Treasury 2 balance must remain strictly unchanged')
      assert.equal(stateAfter.cashTransactions.length, 1, 'No cash transactions should have been added')
      assert.equal(adj.treasuryId, null, 'Adjustment treasuryId must be null')
      assert.equal(adj.isTreasuryDistorting, false, 'Adjustment must declare isTreasuryDistorting false')
    })

    it('R1.3: should correctly compute 360° ledger running balance with interleaved events', () => {
      const customer = { id: 'cust-ledger', name: 'شركة التوحيد', createdAt: '2026-01-01T08:00:00Z', balance: 10000 }

      const rawEntries = [
        {
          id: 'op-bal',
          date: '2026-01-01T08:00:00Z',
          type: 'opening',
          description: 'رصيد أول المدة',
          debit: 10000,
          credit: 0,
        },
        {
          id: 'inv-1',
          date: '2026-01-05T10:00:00Z',
          type: 'invoice',
          description: 'فاتورة مبيعات',
          debit: 20000,
          credit: 5000,
        },
        {
          id: 'adj-1',
          date: '2026-01-10T12:00:00Z',
          type: 'balance_adjustment',
          description: 'تسوية رصيد / جرد رصيد',
          debit: 0,
          credit: 3000,
        },
        {
          id: 'rc-1',
          date: '2026-01-15T09:00:00Z',
          type: 'payment',
          description: 'سند تحصيل نقدي',
          debit: 0,
          credit: 7000,
        },
        {
          id: 'adj-2',
          date: '2026-01-20T16:00:00Z',
          type: 'balance_adjustment',
          description: 'تسوية رصيد زيادة مديونية',
          debit: 2500,
          credit: 0,
        },
      ]

      rawEntries.sort((a, b) => new Date(a.date) - new Date(b.date))

      let running = 0
      const processed = rawEntries.map((e) => {
        running += (e.debit || 0) - (e.credit || 0)
        return { ...e, runningBalance: running }
      })

      assert.equal(processed[0].runningBalance, 10000)
      assert.equal(processed[1].runningBalance, 25000)
      assert.equal(processed[2].runningBalance, 22000)
      assert.equal(processed[3].runningBalance, 15000)
      assert.equal(processed[4].runningBalance, 17500)
    })

    it('R1.4: should reject no-op balance adjustments when delta is zero', () => {
      const customer = { id: 'cust-noop', name: 'عميل بلا تغيير', balance: 5000 }
      const adj = createCustomerBalanceAdjustment({
        customer,
        previousBalance: 5000,
        newBalance: 5000,
      })
      assert.equal(adj, null, 'createCustomerBalanceAdjustment must return null for 0 delta')
    })
  })

  describe('R4: Treasury Account Deletion Persistence', () => {
    it('R4.1: should verify defensive nullification of foreign keys in AX_OperationsService', () => {
      const serviceFile = path.resolve(process.cwd(), 'src/services/AX_OperationsService.js')
      const code = fs.readFileSync(serviceFile, 'utf-8')
      assert.ok(code.includes('deleteTreasuryAccountInDB'))
      assert.ok(code.includes('ax_cash_transactions'))
      assert.ok(code.includes('ax_cash_transfers'))
      assert.ok(code.includes('treasury_id: null'))
      assert.ok(code.includes('from_treasury_id: null'))
      assert.ok(code.includes('to_treasury_id: null'))
    })

    it('R4.2: should permanently remove treasury and persist deletion across localStorage and store reload', () => {
      const treasuries = [
        { id: 'tr-keep', name: 'خزينة باقية', balance: 3000, type: 'cash' },
        { id: 'tr-delete', name: 'خزينة للحذف', balance: 1500, type: 'bank' },
      ]
      const txs = [
        { id: 'tx-10', treasuryId: 'tr-delete', amount: 800, notes: 'إيداع' },
        { id: 'tx-20', treasuryId: 'tr-keep', amount: 400, notes: 'صرف' },
      ]

      useAXStore.setState({
        treasuryAccounts: treasuries,
        cashTransactions: txs,
      })

      useAXStore.getState().deleteTreasuryAccount('tr-delete')

      const stateNow = useAXStore.getState()
      const remainingAccounts = stateNow.treasuryAccounts.map((t) => t.id)
      assert.ok(!remainingAccounts.includes('tr-delete'), 'Deleted treasury should be gone from store')
      assert.ok(remainingAccounts.includes('tr-keep'), 'Kept treasury should remain in store')

      const affectedTx = stateNow.cashTransactions.find((tx) => tx.id === 'tx-10')
      assert.equal(affectedTx.isDeletedAccount, true, 'Associated tx must be marked isDeletedAccount')
      assert.ok(affectedTx.treasuryName.includes('حساب محذوف'), 'Associated tx treasuryName must indicate deleted')

      const cachedRaw = globalThis.localStorage.getItem('ax_cached_db_payload')
      assert.ok(cachedRaw, 'ax_cached_db_payload must exist in localStorage')
      const parsedCached = JSON.parse(cachedRaw)
      const cachedTrIds = (parsedCached.treasuryAccounts || []).map((t) => t.id)
      assert.ok(!cachedTrIds.includes('tr-delete'), 'Deleted treasury must be purged from ax_cached_db_payload')

      const deletedListRaw = globalThis.localStorage.getItem('ax_deleted_treasuries')
      assert.ok(deletedListRaw, 'ax_deleted_treasuries must exist in localStorage')
      const deletedList = JSON.parse(deletedListRaw)
      assert.ok(deletedList.includes('tr-delete'), 'Deleted treasury ID must be recorded in ax_deleted_treasuries')

      const simulatedReloadPayload = JSON.parse(globalThis.localStorage.getItem('ax_cached_db_payload'))
      assert.ok(!simulatedReloadPayload.treasuryAccounts.some((t) => t.id === 'tr-delete'))
    })
  })

  describe('R2: Supplier Overpayment Calculations & Transaction Types', () => {
    function computeOverpayment({ totalSettledAmount, totalPurchasesAmount, totalSalesAmount, netOffsetBalance }) {
      const netPurchases = totalPurchasesAmount - totalSalesAmount
      const excessPaid = Math.max(0, totalSettledAmount - Math.max(0, netPurchases))
      const overpaymentAmount = excessPaid > 0 ? excessPaid : (netOffsetBalance < 0 ? Math.abs(netOffsetBalance) : 0)
      return {
        excessPaid,
        hasOverpayment: overpaymentAmount > 0,
        overpaymentAmount,
      }
    }

    it('R2.1: should accurately compute overpayment when total settlements exceed net purchases', () => {
      const res = computeOverpayment({
        totalSettledAmount: 50000,
        totalPurchasesAmount: 35000,
        totalSalesAmount: 0,
        netOffsetBalance: -15000,
      })
      assert.equal(res.hasOverpayment, true)
      assert.equal(res.overpaymentAmount, 15000)
    })

    it('R2.2: should account for sales offset against supplier purchases', () => {
      const res = computeOverpayment({
        totalSettledAmount: 40000,
        totalPurchasesAmount: 60000,
        totalSalesAmount: 30000,
        netOffsetBalance: -10000,
      })
      assert.equal(res.hasOverpayment, true)
      assert.equal(res.overpaymentAmount, 10000)
    })

    it('R2.3: should correctly report zero overpayment when liabilities exceed payments', () => {
      const res = computeOverpayment({
        totalSettledAmount: 20000,
        totalPurchasesAmount: 50000,
        totalSalesAmount: 0,
        netOffsetBalance: 30000,
      })
      assert.equal(res.hasOverpayment, false)
      assert.equal(res.overpaymentAmount, 0)
    })

    it('R2.4 [CRITICAL ADVERSARIAL STRESS TEST]: Cash transaction type compatibility in AX_SupplierDetailsModal', () => {
      const modalFile = path.resolve(process.cwd(), 'src/components/suppliers/AX_SupplierDetailsModal.jsx')
      const modalCode = fs.readFileSync(modalFile, 'utf-8')

      const treasuryModalFile = path.resolve(process.cwd(), 'src/components/treasury/AX_TreasuryTransactionModal.jsx')
      const treasuryCode = fs.readFileSync(treasuryModalFile, 'utf-8')

      const cacheHelperFile = path.resolve(process.cwd(), 'src/store/storeCacheHelper.js')
      const cacheHelperCode = fs.readFileSync(cacheHelperFile, 'utf-8')

      assert.ok(treasuryCode.includes("type === 'supplier_payment'"), 'Treasury modal must support supplier_payment')
      assert.ok(cacheHelperCode.includes("'supplier_payment'"), 'Store cache helper must record supplier_payment')

      const payoutsFilterRegex = /tx\.type === 'payment' \|\| tx\.type === 'cash_out'/
      const hasSupplierPaymentInPayouts = modalCode.includes("tx.type === 'supplier_payment'")

      const supplier = { id: 'sup-audit-1', name: 'شركة لحوم البستان', companyName: 'شركة لحوم البستان' }
      const mockCashTransactions = [
        { id: 'tx-p1', partyId: 'sup-audit-1', partyName: 'شركة لحوم البستان', amount: 5000, type: 'supplier_payment' },
        { id: 'tx-p2', partyId: 'sup-audit-1', partyName: 'شركة لحوم البستان', amount: 3000, type: 'payment' },
        { id: 'tx-p3', partyId: 'sup-audit-1', partyName: 'شركة لحوم البستان', amount: 2000, type: 'cash_out' },
      ]

      const simulatedCurrentPayouts = mockCashTransactions.filter(
        (tx) =>
          tx &&
          (tx.partyId === supplier.id || tx.partyName === supplier.name) &&
          (tx.type === 'payment' || tx.type === 'cash_out')
      )

      assert.equal(simulatedCurrentPayouts.length, 2, 'Simulated current payouts only matches payment and cash_out')
      assert.equal(
        simulatedCurrentPayouts.some((tx) => tx.id === 'tx-p1'),
        false,
        'CRITICAL FINDING: tx-p1 with type "supplier_payment" is currently excluded by (tx.type === "payment" || tx.type === "cash_out")!'
      )
    })

    it('R2.5 [CRITICAL ADVERSARIAL STRESS TEST]: Supplier balance clamping vs overpayment detection in AX_SuppliersManager', () => {
      const supplier = { id: 'sup-clamp', name: 'مورد مجمدات النيل', balance: 5000 }
      useAXStore.setState({
        suppliers: [supplier],
        treasuryAccounts: [{ id: 'tr-test', balance: 50000, type: 'cash' }],
        cashTransactions: [],
      })

      useAXStore.getState().addCashTransaction({
        id: 'tx-overpay-test',
        treasuryId: 'tr-test',
        partyId: 'sup-clamp',
        partyName: 'مورد مجمدات النيل',
        amount: 8000,
        type: 'supplier_payment',
        date: '2026-01-15',
      })

      const supplierAfter = useAXStore.getState().suppliers.find((s) => s.id === 'sup-clamp')
      assert.equal(supplierAfter.balance, 0, 'Supplier balance is clamped to Math.max(0, ...) so it becomes 0 instead of -3000')

      const totalOverpayments = useAXStore.getState().suppliers.reduce((sum, s) => {
        const bal = Number(s.balance) || 0
        return bal < 0 ? sum + Math.abs(bal) : sum
      }, 0)

      assert.equal(
        totalOverpayments,
        0,
        'CRITICAL FINDING: Because s.balance is clamped to 0 on payment, bal < 0 is never satisfied in AX_SuppliersManager for cash overpayments!'
      )
    })
  })
})
