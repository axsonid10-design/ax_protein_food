import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateFifoProfits, getInvoiceFifoProfit } from '../src/utils/fifoCalculations.js'
import { executeVanSettlement } from '../src/store/vanDistributionHelpers.js'

function buildCustomerLedgerEntries(customer, invoices, cashTransactions) {
  const entries = []
  const opBal = Number(customer.openingBalance) || 0
  const opType = customer.openingBalanceType || 'debit'
  const opSigned = opType === 'debit' ? opBal : -opBal

  if (opBal > 0) {
    entries.push({
      id: 'op-bal',
      date: customer.createdAt || new Date().toISOString(),
      type: 'opening',
      description: opType === 'debit' ? 'رصيد أول المدة مدين' : 'رصيد أول المدة دائن',
      debit: opType === 'debit' ? opBal : 0,
      credit: opType === 'credit' ? opBal : 0,
      runningBalance: opSigned,
    })
  }

  const customerInvoices = (invoices || []).filter(
    (inv) => inv && (inv.clientId === customer.id || inv.partyName === customer.name)
  )

  const paidInvoices = customerInvoices.filter(
    (i) => i.type !== 'sale_return' && (Number(i.paidAmount || i.cashPaid) || 0) > 0
  )
  const recordedInvoiceCodes = new Set(
    paidInvoices.map((i) => i.code).filter(Boolean)
  )
  const recordedInvoiceIds = new Set(
    paidInvoices.map((i) => i.id).filter(Boolean)
  )

  customerInvoices.forEach((inv) => {
    const isReturn = inv.type === 'sale_return'
    const invTotal = Number(inv.total || inv.totalAmount) || 0
    const paid = Number(inv.paidAmount || inv.cashPaid) || 0
    entries.push({
      id: inv.id,
      date: inv.date || inv.createdAt || new Date().toISOString(),
      type: isReturn ? 'sale_return' : 'invoice',
      reference: inv.code || inv.id.slice(0, 8),
      description: isReturn ? `مردود مبيعات ${inv.code || ''}` : `فاتورة مبيعات ${inv.code || ''}`,
      debit: isReturn ? 0 : invTotal,
      credit: isReturn ? invTotal : paid,
    })
  })

  const customerReceipts = (cashTransactions || []).filter(
    (tx) => tx && (tx.partyName === customer.name || tx.partyId === customer.id) &&
      (tx.type === 'client_receipt' || tx.type === 'receipt' || tx.type === 'cash_in')
  )

  customerReceipts.forEach((rc) => {
    const isLinkedToInvoice =
      (rc.invoiceId && (recordedInvoiceIds.has(rc.invoiceId) || recordedInvoiceCodes.has(rc.invoiceId))) ||
      (rc.invoiceCode && recordedInvoiceCodes.has(rc.invoiceCode)) ||
      (rc.referenceId && (recordedInvoiceIds.has(rc.referenceId) || recordedInvoiceCodes.has(rc.referenceId))) ||
      (rc.notes && (
        Array.from(recordedInvoiceCodes).some((code) => rc.notes.includes(code)) ||
        Array.from(recordedInvoiceIds).some((id) => rc.notes.includes(id))
      ))
    if (isLinkedToInvoice) return

    entries.push({
      id: rc.id,
      date: rc.date || rc.createdAt || new Date().toISOString(),
      type: 'payment',
      reference: rc.code || rc.id.slice(0, 8),
      description: rc.notes || 'سند تحصيل نقدي',
      debit: 0,
      credit: Number(rc.amount) || 0,
    })
  })

  entries.sort((a, b) => new Date(a.date) - new Date(b.date))

  let running = 0
  return entries.map((entry) => {
    const debit = entry.debit || 0
    const credit = entry.credit || 0
    running += (debit - credit)
    return { ...entry, runningBalance: running }
  })
}

function calculateReturnWithDiscount(invoice, itemsToReturn) {
  const originalSubtotal = Number(invoice?.subtotal) || Number(invoice?.total) || 1
  const originalDiscount = Number(invoice?.discountAmount) || 0
  const discountFactor = Math.max(0, Math.min(1, 1 - originalDiscount / originalSubtotal))

  const processedItems = itemsToReturn.map((it) => {
    const effectivePrice = Number((it.price * discountFactor).toFixed(2))
    return {
      ...it,
      effectivePrice,
      total: Number((it.quantity * effectivePrice).toFixed(2)),
    }
  })

  const returnTotal = Number(processedItems.reduce((acc, it) => acc + it.total, 0).toFixed(2))
  return {
    discountFactor,
    items: processedItems,
    returnTotal,
  }
}

function simulateAddCashTransaction(state, tx) {
  const isCashIn = tx.type === 'client_receipt' || tx.type === 'other_income' || tx.type === 'misc_revenue'
  const isClient = tx.partyType === 'client' || (!tx.partyType && tx.type === 'client_receipt')
  const isSupplier = tx.partyType === 'supplier' || (!tx.partyType && tx.type === 'supplier_payment')
  const updatedTreasuries = state.treasuryAccounts.map((t) => t.id === tx.treasuryId ? { ...t, balance: (Number(t.balance) || 0) + (isCashIn ? tx.amount : -tx.amount) } : t)
  const updatedClients = isClient ? state.clients.map((c) => (tx.partyId === c.id || tx.partyName === c.name) ? { ...c, balance: (Number(c.balance) || 0) - tx.amount } : c) : state.clients
  const updatedSuppliers = isSupplier ? state.suppliers.map((s) => (tx.partyId === s.id || tx.partyName === s.name) ? { ...s, balance: (Number(s.balance) || 0) - tx.amount } : s) : state.suppliers
  return {
    cashTransactions: [tx, ...state.cashTransactions],
    treasuryAccounts: updatedTreasuries,
    clients: updatedClients,
    suppliers: updatedSuppliers,
  }
}

describe('R7-M3: System-Wide Accounting Engine Reconciliation', () => {
  describe('Feature 10: Customer Ledger Payment Deduplication', () => {
    it('deduplicates invoice cash payments and does not double-count auto client_receipt', () => {
      const customer = { id: 'cust-101', name: 'سوبر ماركت النور', openingBalance: 0 }
      const invoices = [
        {
          id: 'inv-101',
          code: 'INV-2026-001',
          clientId: 'cust-101',
          partyName: 'سوبر ماركت النور',
          type: 'sale',
          total: 5000,
          paidAmount: 2000,
          remainingAmount: 3000,
          date: '2026-11-01',
        },
      ]
      const cashTransactions = [
        {
          id: 'ctx-001',
          code: 'REC-001',
          partyId: 'cust-101',
          partyName: 'سوبر ماركت النور',
          type: 'client_receipt',
          amount: 2000,
          notes: 'تحصيل نقدي - فاتورة مبيعات INV-2026-001',
          date: '2026-11-01',
        },
      ]

      const ledger = buildCustomerLedgerEntries(customer, invoices, cashTransactions)

      assert.strictEqual(ledger.length, 1)
      assert.strictEqual(ledger[0].debit, 5000)
      assert.strictEqual(ledger[0].credit, 2000)
      assert.strictEqual(ledger[0].runningBalance, 3000)
    })

    it('preserves independent manual receipts when invoice paid is 0', () => {
      const customer = { id: 'cust-102', name: 'ماركت الفتح', openingBalance: 0 }
      const invoices = [
        {
          id: 'inv-102',
          code: 'INV-2026-002',
          clientId: 'cust-102',
          partyName: 'ماركت الفتح',
          type: 'sale',
          total: 4000,
          paidAmount: 0,
          remainingAmount: 4000,
          date: '2026-11-01',
        },
      ]
      const cashTransactions = [
        {
          id: 'ctx-002',
          code: 'REC-002',
          partyId: 'cust-102',
          partyName: 'ماركت الفتح',
          type: 'client_receipt',
          amount: 1500,
          notes: 'دفعة نقدية لاحقة على الحساب INV-2026-002',
          date: '2026-11-05',
        },
      ]

      const ledger = buildCustomerLedgerEntries(customer, invoices, cashTransactions)

      assert.strictEqual(ledger.length, 2)
      assert.strictEqual(ledger[0].debit, 4000)
      assert.strictEqual(ledger[0].credit, 0)
      assert.strictEqual(ledger[1].debit, 0)
      assert.strictEqual(ledger[1].credit, 1500)
      assert.strictEqual(ledger[1].runningBalance, 2500)
    })
  })

  describe('Feature 11: Customer Ledger Sales Returns Credit', () => {
    it('credits customer on sale_return invoices to reduce account balance', () => {
      const customer = { id: 'cust-103', name: 'شركة البركة', openingBalance: 10000, openingBalanceType: 'debit', createdAt: '2026-11-01' }
      const invoices = [
        {
          id: 'ret-101',
          code: 'RET-SALE-001',
          clientId: 'cust-103',
          partyName: 'شركة البركة',
          type: 'sale_return',
          total: 2500,
          paidAmount: 0,
          date: '2026-11-02',
        },
      ]

      const ledger = buildCustomerLedgerEntries(customer, invoices, [])

      assert.strictEqual(ledger.length, 2)
      assert.strictEqual(ledger[0].type, 'opening')
      assert.strictEqual(ledger[0].runningBalance, 10000)
      assert.strictEqual(ledger[1].type, 'sale_return')
      assert.strictEqual(ledger[1].debit, 0)
      assert.strictEqual(ledger[1].credit, 2500)
      assert.strictEqual(ledger[1].runningBalance, 7500)
    })
  })

  describe('Feature 12: Proportional Discount in Returns Modal', () => {
    it('applies original invoice discount percentage to return unit price', () => {
      const invoice = {
        id: 'inv-disc-1',
        code: 'INV-DISC-01',
        subtotal: 10000,
        discountAmount: 2000,
        total: 8000,
      }
      const itemsToReturn = [
        { itemId: 'item-1', name: 'كفتة بقري', quantity: 10, price: 500 },
      ]

      const result = calculateReturnWithDiscount(invoice, itemsToReturn)

      assert.strictEqual(result.discountFactor, 0.8)
      assert.strictEqual(result.items[0].effectivePrice, 400)
      assert.strictEqual(result.items[0].total, 4000)
      assert.strictEqual(result.returnTotal, 4000)
    })

    it('returns full price when original invoice had zero discount', () => {
      const invoice = {
        id: 'inv-disc-2',
        code: 'INV-DISC-02',
        subtotal: 5000,
        discountAmount: 0,
        total: 5000,
      }
      const itemsToReturn = [
        { itemId: 'item-2', name: 'برجر كيلو', quantity: 5, price: 300 },
      ]

      const result = calculateReturnWithDiscount(invoice, itemsToReturn)

      assert.strictEqual(result.discountFactor, 1)
      assert.strictEqual(result.items[0].effectivePrice, 300)
      assert.strictEqual(result.items[0].total, 1500)
      assert.strictEqual(result.returnTotal, 1500)
    })
  })

  describe('Feature 13: FIFO Engine Net Revenue & Returns Support', () => {
    const catalog = [
      { id: 'item-beef', name: 'لحم سويدي', unitType: 'كرتونة', buyPrice: 50, sellPrice: 100 },
    ]

    it('calculates gross profit using net revenue subtracting discount', () => {
      const invoices = [
        {
          id: 'pur-1',
          type: 'purchase',
          date: '2026-11-01',
          items: [{ itemId: 'item-beef', quantity: 10, unit: 'كرتونة', price: 50, total: 500 }],
        },
        {
          id: 'sal-1',
          type: 'sale',
          date: '2026-11-02',
          subtotal: 500,
          discountAmount: 100,
          total: 400,
          items: [{ itemId: 'item-beef', quantity: 5, unit: 'كرتونة', price: 100, total: 500 }],
        },
      ]

      const result = calculateFifoProfits(invoices, catalog, [])

      assert.strictEqual(result.totalRevenue, 400)
      assert.strictEqual(result.totalCogs, 250)
      assert.strictEqual(result.totalProfit, 150)
      assert.strictEqual(result.grossMarginPct, 37.5)

      const single = getInvoiceFifoProfit(invoices[1], invoices, catalog, [])
      assert.strictEqual(single.netRevenue, 400)
      assert.strictEqual(single.cogs, 250)
      assert.strictEqual(single.profit, 150)
    })

    it('reverses revenue, COGS and profit when sales returns occur', () => {
      const invoices = [
        {
          id: 'pur-2',
          type: 'purchase',
          date: '2026-11-01',
          items: [{ itemId: 'item-beef', quantity: 20, unit: 'كرتونة', price: 50, total: 1000 }],
        },
        {
          id: 'sal-2',
          type: 'sale',
          date: '2026-11-02',
          subtotal: 1000,
          discountAmount: 0,
          total: 1000,
          items: [{ itemId: 'item-beef', quantity: 10, unit: 'كرتونة', price: 100, total: 1000 }],
        },
        {
          id: 'ret-2',
          type: 'sale_return',
          date: '2026-11-03',
          subtotal: 200,
          total: 200,
          items: [{ itemId: 'item-beef', quantity: 2, unit: 'كرتونة', price: 100, total: 200 }],
        },
      ]

      const result = calculateFifoProfits(invoices, catalog, [])

      assert.strictEqual(result.totalRevenue, 800)
      assert.strictEqual(result.totalCogs, 400)
      assert.strictEqual(result.totalProfit, 400)
      assert.strictEqual(result.grossMarginPct, 50)
    })
  })

  describe('Feature 15: Party Balance Cross-Pollution Guard', () => {
    it('strictly updates client balance and preserves supplier when partyType is client', () => {
      const state = {
        treasuryAccounts: [{ id: 'tr-1', balance: 50000 }],
        clients: [{ id: 'client-1', name: 'الشركة العالمية', balance: 12000 }],
        suppliers: [{ id: 'supp-1', name: 'الشركة العالمية', balance: 25000 }],
        cashTransactions: [],
      }

      const tx = {
        id: 'tx-101',
        type: 'client_receipt',
        partyType: 'client',
        partyName: 'الشركة العالمية',
        partyId: 'client-1',
        amount: 3000,
        treasuryId: 'tr-1',
      }

      const nextState = simulateAddCashTransaction(state, tx)

      assert.strictEqual(nextState.clients[0].balance, 9000)
      assert.strictEqual(nextState.suppliers[0].balance, 25000)
      assert.strictEqual(nextState.treasuryAccounts[0].balance, 53000)
    })

    it('strictly updates supplier balance and preserves client when partyType is supplier', () => {
      const state = {
        treasuryAccounts: [{ id: 'tr-1', balance: 50000 }],
        clients: [{ id: 'client-1', name: 'الشركة العالمية', balance: 12000 }],
        suppliers: [{ id: 'supp-1', name: 'الشركة العالمية', balance: 25000 }],
        cashTransactions: [],
      }

      const tx = {
        id: 'tx-102',
        type: 'supplier_payment',
        partyType: 'supplier',
        partyName: 'الشركة العالمية',
        partyId: 'supp-1',
        amount: 5000,
        treasuryId: 'tr-1',
      }

      const nextState = simulateAddCashTransaction(state, tx)

      assert.strictEqual(nextState.suppliers[0].balance, 20000)
      assert.strictEqual(nextState.clients[0].balance, 12000)
      assert.strictEqual(nextState.treasuryAccounts[0].balance, 45000)
    })

    it('does not mutate client or supplier balances when partyType is expense', () => {
      const state = {
        treasuryAccounts: [{ id: 'tr-1', balance: 50000 }],
        clients: [{ id: 'client-1', name: 'الشركة العالمية', balance: 12000 }],
        suppliers: [{ id: 'supp-1', name: 'الشركة العالمية', balance: 25000 }],
        cashTransactions: [],
      }

      const tx = {
        id: 'tx-103',
        type: 'expense',
        partyType: 'expense',
        partyName: 'الشركة العالمية',
        amount: 1500,
        treasuryId: 'tr-1',
      }

      const nextState = simulateAddCashTransaction(state, tx)

      assert.strictEqual(nextState.clients[0].balance, 12000)
      assert.strictEqual(nextState.suppliers[0].balance, 25000)
      assert.strictEqual(nextState.treasuryAccounts[0].balance, 48500)
    })
  })

  describe('Feature 16: Van Cash Transfer Async Await Flow', () => {
    it('executes van daily settlement with awaited pending cash transfer confirmation', async () => {
      const recordedCalls = []
      const storeActions = {
        addCashTransaction: async (tx) => {
          recordedCalls.push({ action: 'addCashTransaction', tx })
          return { success: true }
        },
        addPendingCashTransfer: async (pct) => {
          recordedCalls.push({ action: 'addPendingCashTransfer', pct })
          return { success: true }
        },
        confirmCashTransfer: async (id) => {
          recordedCalls.push({ action: 'confirmCashTransfer', id })
          return { success: true }
        },
      }

      const payload = {
        vanWarehouseId: 'b0000000-0000-0000-0000-000000000010',
        driverName: 'أبو محمود',
        vanName: 'سيارة التوزيع 1',
        settlementDate: '2026-11-09',
        grossCash: 15000,
        revenue: {
          payments: [
            { amount: 10000, method: 'cash', destinationTreasuryId: 'c0000000-0000-0000-0000-000000000001' },
            { amount: 5000, method: 'transfer', destinationTreasuryId: 'c0000000-0000-0000-0000-000000000002' },
          ],
        },
        expenses: [
          { amount: 1000, categoryName: 'سولار وبنزين', paymentMethod: 'van_custody' },
        ],
        stockSettlement: { action: 'retain', items: [] },
      }

      const result = await executeVanSettlement(payload, storeActions, {})

      assert.strictEqual(result.success, true)
      assert.strictEqual(recordedCalls.filter((c) => c.action === 'addPendingCashTransfer').length, 2)
      assert.strictEqual(recordedCalls.filter((c) => c.action === 'confirmCashTransfer').length, 2)
      assert.strictEqual(recordedCalls.filter((c) => c.action === 'addCashTransaction').length, 1)

      const transfer1Id = recordedCalls.find((c) => c.action === 'addPendingCashTransfer' && c.pct.amount === 10000).pct.id
      assert.ok(recordedCalls.some((c) => c.action === 'confirmCashTransfer' && c.id === transfer1Id))
    })
  })
})
