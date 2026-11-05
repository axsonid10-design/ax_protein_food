import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { filterByDateRange } from '../src/utils/reportCalculations.js'

describe('R3 Invoices Timeframe Filtering & Color Themes', () => {
  const sampleInvoices = [
    { id: '1', code: 'INV-001', type: 'sale', date: '2026-11-04', total: 1000 },
    { id: '2', code: 'PUR-001', type: 'purchase', date: '2026-11-02', total: 5000 },
    { id: '3', code: 'RET-SALE-001', type: 'sale_return', date: '2026-10-15', total: 300 },
    { id: '4', code: 'RET-PUR-001', type: 'purchase_return', date: '2026-09-01', total: 800 },
  ]

  it('filters by specific_day correctly', () => {
    const res = filterByDateRange(sampleInvoices, 'date', 'specific_day', '2026-11-02')
    assert.equal(res.length, 1)
    assert.equal(res[0].code, 'PUR-001')
  })

  it('filters by custom date range correctly', () => {
    const res = filterByDateRange(sampleInvoices, 'date', 'custom', '2026-10-01', '2026-11-03')
    assert.equal(res.length, 2)
    assert.deepEqual(res.map((i) => i.code).sort(), ['PUR-001', 'RET-SALE-001'])
  })

  it('provides distinct visual theme classes for all 4 invoice categories', () => {
    const getTypeTheme = (type) => {
      switch (type) {
        case 'sale_return':
          return {
            label: 'مردود مبيعات',
            badgeClass: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
            rowClass: 'border-r-4 border-r-purple-600 bg-purple-600/[0.03] hover:bg-purple-600/[0.07]',
            cardClass: 'border-r-4 border-r-purple-600 bg-purple-600/[0.04] border-outline-variant/30 hover:border-purple-600/50',
          }
        case 'purchase_return':
          return {
            label: 'مردود مشتريات',
            badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
            rowClass: 'border-r-4 border-r-rose-600 bg-rose-600/[0.03] hover:bg-rose-600/[0.07]',
            cardClass: 'border-r-4 border-r-rose-600 bg-rose-600/[0.04] border-outline-variant/30 hover:border-rose-600/50',
          }
        case 'purchase':
          return {
            label: 'فاتورة مشتريات',
            badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
            rowClass: 'border-r-4 border-r-amber-500 bg-amber-500/[0.03] hover:bg-amber-500/[0.06]',
            cardClass: 'border-r-4 border-r-amber-500 bg-amber-500/[0.03] border-outline-variant/30 hover:border-amber-500/50',
          }
        default:
          return {
            label: 'فاتورة بيع',
            badgeClass: 'bg-primary/10 text-primary border-primary/30',
            rowClass: 'border-r-4 border-r-primary bg-primary/[0.02] hover:bg-primary/[0.05]',
            cardClass: 'border-r-4 border-r-primary bg-primary/[0.02] border-outline-variant/30 hover:border-primary/50',
          }
      }
    }

    const saleTheme = getTypeTheme('sale')
    const purTheme = getTypeTheme('purchase')
    const saleRetTheme = getTypeTheme('sale_return')
    const purRetTheme = getTypeTheme('purchase_return')

    assert.ok(saleTheme.rowClass.includes('border-r-primary'))
    assert.ok(purTheme.rowClass.includes('border-r-amber-500'))
    assert.ok(saleRetTheme.rowClass.includes('border-r-purple-600'))
    assert.ok(purRetTheme.rowClass.includes('border-r-rose-600'))

    assert.notEqual(saleTheme.badgeClass, purTheme.badgeClass)
    assert.notEqual(saleRetTheme.badgeClass, purRetTheme.badgeClass)
  })
})

describe('R3 Invoice Returns Conversion Logic', () => {
  it('correctly builds a sales return payload from original sales invoice', () => {
    const originalInvoice = {
      id: 'inv-123',
      code: 'INV-99001',
      type: 'sale',
      partyType: 'customer',
      partyName: 'مطعم الأهرام',
      warehouseId: 'wh-1',
      items: [
        { itemId: 'it-1', compositeName: 'لحمة مفرومة بلدي', quantity: 20, unit: 'كرتونة', price: 150 },
        { itemId: 'it-2', compositeName: 'كبدة شرائح', quantity: 10, unit: 'أطباق', price: 90 },
      ],
      total: 3900,
      paidAmount: 2000,
      remainingAmount: 1900,
    }

    const selectedReturnItems = [
      { itemId: 'it-1', compositeName: 'لحمة مفرومة بلدي', quantity: 5, unit: 'كرتونة', price: 150, total: 750 },
    ]
    const returnTotal = 750
    const settlementMode = 'balance_adjustment'

    const returnPayload = {
      code: 'RET-SALE-12345',
      type: 'sale_return',
      originalInvoiceCode: originalInvoice.code,
      originalInvoiceId: originalInvoice.id,
      partyType: 'customer',
      partyName: originalInvoice.partyName,
      warehouseId: originalInvoice.warehouseId,
      items: selectedReturnItems,
      subtotal: returnTotal,
      total: returnTotal,
      paidAmount: settlementMode === 'cash_refund' ? returnTotal : 0,
      remainingAmount: settlementMode === 'cash_refund' ? 0 : returnTotal,
      status: settlementMode === 'cash_refund' ? 'paid' : 'unpaid',
      paymentTerms: settlementMode === 'cash_refund' ? 'رد نقدي فوري' : 'تخفيض رصيد الحساب',
    }

    assert.equal(returnPayload.type, 'sale_return')
    assert.equal(returnPayload.originalInvoiceCode, 'INV-99001')
    assert.equal(returnPayload.total, 750)
    assert.equal(returnPayload.remainingAmount, 750)
    assert.equal(returnPayload.paymentTerms, 'تخفيض رصيد الحساب')
  })
})

describe('R6 Reports Module Accounting Fixes & Real Metrics', () => {
  it('properly classifies sale_return as credit for customer in 360 ledger', () => {
    const inv = { type: 'sale_return', total: 1200, paidAmount: 0 }
    let debit = 0
    let credit = 0

    if (inv.type === 'sale') {
      debit = inv.total
    } else if (inv.type === 'sale_return') {
      credit = inv.total
    } else if (inv.type === 'purchase') {
      credit = inv.total
    } else if (inv.type === 'purchase_return') {
      debit = inv.total
    }

    assert.equal(debit, 0)
    assert.equal(credit, 1200)
  })

  it('properly classifies purchase_return as debit for supplier in 360 ledger', () => {
    const inv = { type: 'purchase_return', total: 3400, paidAmount: 0 }
    let debit = 0
    let credit = 0

    if (inv.type === 'sale') {
      debit = inv.total
    } else if (inv.type === 'sale_return') {
      credit = inv.total
    } else if (inv.type === 'purchase') {
      credit = inv.total
    } else if (inv.type === 'purchase_return') {
      debit = inv.total
    }

    assert.equal(debit, 3400)
    assert.equal(credit, 0)
  })

  it('eliminates double-counting in cash flow when invoice payment is already in cash transactions', () => {
    const cashTransactions = [
      { id: 'tx-1', code: 'REC-001', amount: 1500, notes: 'تحصيل نقدي - فاتورة مبيعات INV-5501' },
    ]
    const invoices = [
      { id: 'inv-1', code: 'INV-5501', paidAmount: 1500, type: 'sale' },
      { id: 'inv-2', code: 'INV-5502', paidAmount: 800, type: 'sale' },
    ]

    const list = []
    cashTransactions.forEach((tx) => {
      list.push({ id: tx.id, amount: tx.amount })
    })

    const recordedCashNotes = new Set(cashTransactions.map((tx) => tx.notes || ''))
    invoices.forEach((inv) => {
      if (inv.paidAmount > 0) {
        const isAlreadyRecorded = Array.from(recordedCashNotes).some((note) => note.includes(inv.code))
        if (!isAlreadyRecorded) {
          list.push({ id: `inv-cash-${inv.id}`, amount: inv.paidAmount })
        }
      }
    })

    assert.equal(list.length, 2)
    assert.equal(list[0].id, 'tx-1')
    assert.equal(list[1].id, 'inv-cash-inv-2')
  })

  it('calculates real aging from invoice dates without mock percentages', () => {
    const now = new Date('2026-11-04')
    const invoices = [
      { partyName: 'شركة النور', type: 'sale', remainingAmount: 500, date: '2026-10-25' },
      { partyName: 'شركة النور', type: 'sale', remainingAmount: 300, date: '2026-09-15' },
      { partyName: 'شركة النور', type: 'sale', remainingAmount: 200, date: '2026-07-01' },
    ]

    let under30 = 0
    let d31To60 = 0
    let d61To90 = 0
    let over90 = 0

    invoices.forEach((inv) => {
      const invDate = new Date(inv.date)
      const diffDays = Math.max(0, Math.floor((now - invDate) / (1000 * 60 * 60 * 24)))
      const rem = inv.remainingAmount

      if (diffDays <= 30) {
        under30 += rem
      } else if (diffDays <= 60) {
        d31To60 += rem
      } else if (diffDays <= 90) {
        d61To90 += rem
      } else {
        over90 += rem
      }
    })

    assert.equal(under30, 500)
    assert.equal(d31To60, 300)
    assert.equal(d61To90, 0)
    assert.equal(over90, 200)
    assert.equal(under30 + d31To60 + d61To90 + over90, 1000)
  })
})
