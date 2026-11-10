import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateFifoProfits, getInvoiceFifoProfit } from '../src/utils/fifoCalculations.js'

function buildCustomerLedgerEntriesModal(customer, invoices, cashTransactions) {
  const entries = []
  const opBal = Number(customer.openingBalance) || 0
  const opType = customer.openingBalanceType || 'debit'
  const opSigned = opType === 'debit' ? opBal : -opBal

  if (opBal > 0) {
    entries.push({
      id: 'op-bal',
      date: customer.createdAt || new Date().toISOString(),
      type: 'opening',
      description: `رصيد أول المدة (${opType === 'debit' ? 'مدين / مستحق عليه' : 'دائن / دفعة مقدمة'})`,
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
  const recordedInvoiceCodes = new Set(paidInvoices.map((i) => i.code).filter(Boolean))
  const recordedInvoiceIds = new Set(paidInvoices.map((i) => i.id).filter(Boolean))

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
    running += ((entry.debit || 0) - (entry.credit || 0))
    return { ...entry, runningBalance: running }
  })
}

function calculateReturnModalDiscount(invoice, itemsToReturn) {
  const discountFactor = (invoice?.subtotal && Number(invoice.subtotal) > 0)
    ? Math.max(0, Math.min(1, 1 - (Number(invoice.discountAmount) || 0) / Number(invoice.subtotal)))
    : 1

  const activeSelectedItems = itemsToReturn.filter((it) => it.selected !== false && (it.returnQty || it.quantity) > 0)
  const returnTotal = Number(activeSelectedItems.reduce(
    (sum, it) => sum + (it.returnQty || it.quantity) * Number((it.price * discountFactor).toFixed(2)),
    0
  ).toFixed(2))

  return {
    discountFactor,
    activeSelectedItems: activeSelectedItems.map((it) => ({
      ...it,
      effectivePrice: Number((it.price * discountFactor).toFixed(2)),
      total: Number(((it.returnQty || it.quantity) * Number((it.price * discountFactor).toFixed(2))).toFixed(2)),
    })),
    returnTotal,
  }
}

function applyCashTransactionToState(state, tx) {
  const isCashIn = tx.type === 'client_receipt' || tx.type === 'other_income' || tx.type === 'misc_revenue'
  const isClient = tx.partyType === 'client' || (!tx.partyType && tx.type === 'client_receipt')
  const isSupplier = tx.partyType === 'supplier' || (!tx.partyType && tx.type === 'supplier_payment')
  const updatedTreasuries = state.treasuryAccounts.map((t) => t.id === tx.treasuryId ? { ...t, balance: (Number(t.balance) || 0) + (isCashIn ? tx.amount : -tx.amount) } : t)
  const updatedClients = isClient ? state.clients.map((c) => (tx.partyId === c.id || tx.partyName === c.name) ? { ...c, balance: (Number(c.balance) || 0) - tx.amount } : c) : state.clients
  const updatedSuppliers = isSupplier ? state.suppliers.map((s) => (tx.partyId === s.id || tx.partyName === s.name) ? { ...s, balance: (Number(s.balance) || 0) - tx.amount } : s) : state.suppliers
  return { cashTransactions: [tx, ...state.cashTransactions], treasuryAccounts: updatedTreasuries, clients: updatedClients, suppliers: updatedSuppliers }
}

describe('Adversarial Stress Harness: Milestone 3 Accounting Integrity', () => {
  describe('1. Customer Ledger Deduplication & Edge Cases', () => {
    it('CRITICAL EDGE CASE: Multiple receipts for the same invoice with down payment', () => {
      const customer = { id: 'cust-stress-1', name: 'عميل التحدي 1', openingBalance: 0 }
      const invoice = { id: 'inv-stress-1', code: 'INV-2026-901', clientId: 'cust-stress-1', partyName: 'عميل التحدي 1', type: 'sale', total: 10000, paidAmount: 2000, remainingAmount: 8000, date: '2026-11-01' }
      const autoReceipt = { id: 'rec-auto-1', code: 'REC-901', partyId: 'cust-stress-1', partyName: 'عميل التحدي 1', type: 'client_receipt', amount: 2000, notes: 'تحصيل نقدي - فاتورة مبيعات INV-2026-901', date: '2026-11-01' }
      const secondReceipt = { id: 'rec-manual-2', code: 'REC-902', partyId: 'cust-stress-1', partyName: 'عميل التحدي 1', type: 'client_receipt', amount: 3000, notes: 'دفعة ثانية مسددة على الفاتورة INV-2026-901', date: '2026-11-05' }
      const thirdReceipt = { id: 'rec-manual-3', code: 'REC-903', partyId: 'cust-stress-1', partyName: 'عميل التحدي 1', type: 'client_receipt', amount: 5000, notes: 'سداد متبقي الفاتورة INV-2026-901 بالكامل', date: '2026-11-08' }

      const ledger = buildCustomerLedgerEntriesModal(customer, [invoice], [autoReceipt, secondReceipt, thirdReceipt])
      const finalBalance = ledger[ledger.length - 1].runningBalance
      assert.strictEqual(finalBalance, 8000)
    })

    it('SUBSTRING COLLISION: Invoice code prefix collision causes false deduplication', () => {
      const customer = { id: 'cust-stress-2', name: 'عميل التحدي 2', openingBalance: 0 }
      const paidInvoice = { id: 'inv-prefix-1', code: 'INV-1', clientId: 'cust-stress-2', partyName: 'عميل التحدي 2', type: 'sale', total: 1000, paidAmount: 1000, remainingAmount: 0, date: '2026-11-01' }
      const unpaidInvoice = { id: 'inv-prefix-2', code: 'INV-10', clientId: 'cust-stress-2', partyName: 'عميل التحدي 2', type: 'sale', total: 5000, paidAmount: 0, remainingAmount: 5000, date: '2026-11-02' }
      const receiptForInvoice10 = { id: 'rec-prefix-10', code: 'REC-10', partyId: 'cust-stress-2', partyName: 'عميل التحدي 2', type: 'client_receipt', amount: 5000, notes: 'سداد الفاتورة INV-10', date: '2026-11-03' }

      const ledger = buildCustomerLedgerEntriesModal(customer, [paidInvoice, unpaidInvoice], [receiptForInvoice10])
      const finalBalance = ledger[ledger.length - 1].runningBalance
      assert.strictEqual(finalBalance, 5000)
    })

    it('CASH SALES RETURN: Cash refund on return causes customer ledger divergence', () => {
      const customer = { id: 'cust-stress-3', name: 'عميل التحدي 3', openingBalance: 5000, openingBalanceType: 'debit', createdAt: '2026-11-01' }
      const cashReturnInvoice = { id: 'ret-cash-1', code: 'RET-SALE-801', clientId: 'cust-stress-3', partyName: 'عميل التحدي 3', type: 'sale_return', total: 2000, paidAmount: 2000, remainingAmount: 0, date: '2026-11-02' }
      const ledger = buildCustomerLedgerEntriesModal(customer, [cashReturnInvoice], [])
      assert.strictEqual(ledger.length, 2)
      assert.strictEqual(ledger[1].type, 'sale_return')
      assert.strictEqual(ledger[1].credit, 2000)
      assert.strictEqual(ledger[1].runningBalance, 3000)
    })

    it('RECEIPTS WITHOUT NOTES: Preserves independent receipt when notes are missing or empty', () => {
      const customer = { id: 'cust-stress-4', name: 'عميل التحدي 4', openingBalance: 0 }
      const invoice = { id: 'inv-stress-4', code: 'INV-2026-904', clientId: 'cust-stress-4', partyName: 'عميل التحدي 4', type: 'sale', total: 6000, paidAmount: 0, remainingAmount: 6000, date: '2026-11-01' }
      const receiptNoNotes = { id: 'rec-no-notes', code: 'REC-904', partyId: 'cust-stress-4', partyName: 'عميل التحدي 4', type: 'client_receipt', amount: 2500, notes: null, date: '2026-11-02' }
      const ledger = buildCustomerLedgerEntriesModal(customer, [invoice], [receiptNoNotes])
      assert.strictEqual(ledger.length, 2)
      assert.strictEqual(ledger[1].credit, 2500)
      assert.strictEqual(ledger[1].runningBalance, 3500)
    })
  })

  describe('2. Return Modal Proportional Discount Logic', () => {
    it('0% discount preserves original item list price exactly', () => {
      const res = calculateReturnModalDiscount({ subtotal: 4000, discountAmount: 0, total: 4000 }, [{ itemId: 'i-1', price: 200, returnQty: 5 }])
      assert.strictEqual(res.discountFactor, 1)
      assert.strictEqual(res.returnTotal, 1000)
      assert.strictEqual(res.activeSelectedItems[0].effectivePrice, 200)
    })

    it('100% discount reduces return price and total to 0.00', () => {
      const res = calculateReturnModalDiscount({ subtotal: 4000, discountAmount: 4000, total: 0 }, [{ itemId: 'i-1', price: 200, returnQty: 5 }])
      assert.strictEqual(res.discountFactor, 0)
      assert.strictEqual(res.returnTotal, 0)
      assert.strictEqual(res.activeSelectedItems[0].effectivePrice, 0)
    })

    it('Discount greater than 100% is clamped to 0 factor without negative prices', () => {
      const res = calculateReturnModalDiscount({ subtotal: 1000, discountAmount: 1500, total: 0 }, [{ itemId: 'i-1', price: 100, returnQty: 2 }])
      assert.strictEqual(res.discountFactor, 0)
      assert.strictEqual(res.returnTotal, 0)
    })

    it('Float fractions (e.g. 1/3 discount) rounded safely to 2 decimal places', () => {
      const res = calculateReturnModalDiscount({ subtotal: 300, discountAmount: 100, total: 200 }, [{ itemId: 'i-1', price: 100, returnQty: 3 }])
      assert.strictEqual(Number(res.discountFactor.toFixed(4)), 0.6667)
      assert.strictEqual(res.activeSelectedItems[0].effectivePrice, 66.67)
      assert.strictEqual(res.returnTotal, 200.01)
    })

    it('Missing subtotal defaults safely to discountFactor 1 without NaN', () => {
      const res = calculateReturnModalDiscount({ discountAmount: 50 }, [{ itemId: 'i-1', price: 100, returnQty: 2 }])
      assert.strictEqual(res.discountFactor, 1)
      assert.strictEqual(res.returnTotal, 200)
    })
  })

  describe('3. FIFO Engine Net Revenue & Profit Invariants', () => {
    const catalog = [{ id: 'item-lamb', name: 'لحم ضأن', unitType: 'كرتونة', buyPrice: 80, sellPrice: 120 }]

    it('STRICT INVARIANT: profit = net revenue - COGS for profitable sales', () => {
      const invoices = [
        { id: 'p1', type: 'purchase', date: '2026-11-01', items: [{ itemId: 'item-lamb', quantity: 100, unit: 'كرتونة', price: 80, total: 8000 }] },
        { id: 's1', type: 'sale', date: '2026-11-02', subtotal: 3600, discountAmount: 600, total: 3000, items: [{ itemId: 'item-lamb', quantity: 30, unit: 'كرتونة', price: 120, total: 3600 }] },
      ]
      const result = calculateFifoProfits(invoices, catalog, [])
      assert.strictEqual(result.totalRevenue, 3000)
      assert.strictEqual(result.totalCogs, 2400)
      assert.strictEqual(result.totalProfit, 600)
      assert.strictEqual(result.totalProfit, Number((result.totalRevenue - result.totalCogs).toFixed(2)))
      assert.strictEqual(result.grossMarginPct, 20)
    })

    it('STRICT INVARIANT: negative margin (loss) correctly reports profit = netRevenue - COGS < 0', () => {
      const invoices = [
        { id: 'pl', type: 'purchase', date: '2026-11-01', items: [{ itemId: 'item-lamb', quantity: 10, unit: 'كرتونة', price: 100, total: 1000 }] },
        { id: 'sl', type: 'sale', date: '2026-11-02', subtotal: 800, discountAmount: 100, total: 700, items: [{ itemId: 'item-lamb', quantity: 10, unit: 'كرتونة', price: 80, total: 800 }] },
      ]
      const result = calculateFifoProfits(invoices, catalog, [])
      assert.strictEqual(result.totalRevenue, 700)
      assert.strictEqual(result.totalCogs, 1000)
      assert.strictEqual(result.totalProfit, -300)
      assert.strictEqual(result.totalProfit, Number((result.totalRevenue - result.totalCogs).toFixed(2)))
    })

    it('STRICT INVARIANT: Multi-tier batch exhaustion under FIFO', () => {
      const invoices = [
        { id: 'pt1', type: 'purchase', date: '2026-11-01', items: [{ itemId: 'item-lamb', quantity: 10, unit: 'كرتونة', price: 50, total: 500 }] },
        { id: 'pt2', type: 'purchase', date: '2026-11-02', items: [{ itemId: 'item-lamb', quantity: 20, unit: 'كرتونة', price: 70, total: 1400 }] },
        { id: 'st1', type: 'sale', date: '2026-11-03', subtotal: 2500, discountAmount: 200, total: 2300, items: [{ itemId: 'item-lamb', quantity: 25, unit: 'كرتونة', price: 100, total: 2500 }] },
      ]
      const result = calculateFifoProfits(invoices, catalog, [])
      assert.strictEqual(result.totalRevenue, 2300)
      assert.strictEqual(result.totalCogs, 1550)
      assert.strictEqual(result.totalProfit, 750)
      assert.strictEqual(result.totalProfit, Number((result.totalRevenue - result.totalCogs).toFixed(2)))
    })

    it('STRICT INVARIANT: Sales returns reversing revenue and COGS preserves profit equality', () => {
      const invoices = [
        { id: 'prb', type: 'purchase', date: '2026-11-01', items: [{ itemId: 'item-lamb', quantity: 50, unit: 'كرتونة', price: 80, total: 4000 }] },
        { id: 'srb', type: 'sale', date: '2026-11-02', subtotal: 3000, discountAmount: 0, total: 3000, items: [{ itemId: 'item-lamb', quantity: 25, unit: 'كرتونة', price: 120, total: 3000 }] },
        { id: 'rsb', type: 'sale_return', date: '2026-11-03', subtotal: 600, total: 600, items: [{ itemId: 'item-lamb', quantity: 5, unit: 'كرتونة', price: 120, total: 600 }] },
      ]
      const result = calculateFifoProfits(invoices, catalog, [])
      assert.strictEqual(result.totalRevenue, 2400)
      assert.strictEqual(result.totalCogs, 1600)
      assert.strictEqual(result.totalProfit, 800)
      assert.strictEqual(result.totalProfit, Number((result.totalRevenue - result.totalCogs).toFixed(2)))
    })

    it('BEHAVIOR OBSERVATION: Pending profit leaves COGS and profit null without corrupting totals', () => {
      const invoices = [
        { id: 'snp', type: 'sale', date: '2026-11-02', subtotal: 2000, discountAmount: 200, total: 1800, items: [{ itemId: 'item-lamb', quantity: 15, unit: 'كرتونة', price: 133.33, total: 2000 }] },
      ]
      const result = calculateFifoProfits(invoices, catalog, [])
      assert.strictEqual(result.hasPendingProfit, true)
      assert.strictEqual(result.pendingCount, 1)
      assert.strictEqual(result.calculatedCount, 0)
      assert.strictEqual(result.totalRevenue, 1800)
      assert.strictEqual(result.totalCogs, 0)
      assert.strictEqual(result.totalProfit, 0)
      const single = getInvoiceFifoProfit(invoices[0], invoices, catalog, [])
      assert.strictEqual(single.profitStatus, 'pending')
      assert.strictEqual(single.cogs, null)
      assert.strictEqual(single.profit, null)
    })
  })

  describe('4. Party Balance Isolation & Cross-Pollution Guard', () => {
    it('Identical ID and identical Name between client and supplier never cross-contaminates', () => {
      const collisionId = 'party-collision-uuid-999'
      const collisionName = 'مؤسسة الهلال للتجارة والتوريدات'
      const state = {
        treasuryAccounts: [{ id: 'tr-main', balance: 100000 }],
        clients: [{ id: collisionId, name: collisionName, balance: 15000 }],
        suppliers: [{ id: collisionId, name: collisionName, balance: 40000 }],
        cashTransactions: [],
      }
      const clientReceiptTx = { id: 'tx-cr-1', type: 'client_receipt', partyType: 'client', partyId: collisionId, partyName: collisionName, amount: 5000, treasuryId: 'tr-main' }
      const stateAfterClientReceipt = applyCashTransactionToState(state, clientReceiptTx)
      assert.strictEqual(stateAfterClientReceipt.clients[0].balance, 10000)
      assert.strictEqual(stateAfterClientReceipt.suppliers[0].balance, 40000)
      assert.strictEqual(stateAfterClientReceipt.treasuryAccounts[0].balance, 105000)

      const supplierPaymentTx = { id: 'tx-sp-1', type: 'supplier_payment', partyType: 'supplier', partyId: collisionId, partyName: collisionName, amount: 8000, treasuryId: 'tr-main' }
      const stateAfterSupplierPayment = applyCashTransactionToState(stateAfterClientReceipt, supplierPaymentTx)
      assert.strictEqual(stateAfterSupplierPayment.clients[0].balance, 10000)
      assert.strictEqual(stateAfterSupplierPayment.suppliers[0].balance, 32000)
      assert.strictEqual(stateAfterSupplierPayment.treasuryAccounts[0].balance, 97000)
    })

    it('Preserves negative and credit balances without clipping to zero', () => {
      const state = {
        treasuryAccounts: [{ id: 'tr-main', balance: 1000 }],
        clients: [{ id: 'c-neg', name: 'عميل دائن', balance: -500 }],
        suppliers: [{ id: 's-neg', name: 'مورد مدين', balance: -200 }],
        cashTransactions: [],
      }
      const txClient = { id: 'tx-neg-c', type: 'client_receipt', partyType: 'client', partyId: 'c-neg', partyName: 'عميل دائن', amount: 300, treasuryId: 'tr-main' }
      const next = applyCashTransactionToState(state, txClient)
      assert.strictEqual(next.clients[0].balance, -800)
    })
  })
})
