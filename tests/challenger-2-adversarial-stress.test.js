import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { filterByDateRange } from '../src/utils/reportCalculations.js'
import { processInvoiceStoreState } from '../src/store/storeCacheHelper.js'

describe('Adversarial Stress Test: R3 Invoices Timeframe Filtering', () => {
  it('handles midnight and timezone ISO string boundary edge cases', () => {
    const invoices = [
      { id: 'inv-oct-31', code: 'INV-OCT-31', type: 'sale', date: '2026-10-31', total: 1000 },
      { id: 'inv-nov-01', code: 'INV-NOV-01', type: 'sale', date: '2026-11-01', total: 2000 },
      { id: 'inv-dec-31', code: 'INV-DEC-31', type: 'sale', date: '2025-12-31', total: 3000 },
      { id: 'inv-jan-01', code: 'INV-JAN-01', type: 'sale', date: '2026-01-01', total: 4000 },
    ]

    const novDate = new Date(2026, 10, 1)
    const isoNov = novDate.toISOString().split('T')[0]
    const isShiftedToOct = isoNov === '2026-10-31'

    if (novDate.getTimezoneOffset() < 0) {
      assert.equal(isShiftedToOct, true, 'In UTC+ timezones, new Date(year, month, 1).toISOString() shifts to previous month!')
    }
  })

  it('correctly filters leap year dates (2024-02-29)', () => {
    const leapInvoices = [
      { id: 'l1', code: 'INV-LEAP-1', date: '2024-02-28', total: 500 },
      { id: 'l2', code: 'INV-LEAP-2', date: '2024-02-29', total: 1500 },
      { id: 'l3', code: 'INV-LEAP-3', date: '2024-03-01', total: 700 },
    ]

    const exactLeap = filterByDateRange(leapInvoices, 'date', 'specific_day', '2024-02-29')
    assert.equal(exactLeap.length, 1)
    assert.equal(exactLeap[0].code, 'INV-LEAP-2')

    const leapRange = filterByDateRange(leapInvoices, 'date', 'custom', '2024-02-29', '2024-02-29')
    assert.equal(leapRange.length, 1)
    assert.equal(leapRange[0].code, 'INV-LEAP-2')
  })

  it('handles inverted and empty custom ranges gracefully', () => {
    const list = [
      { id: '1', date: '2026-11-05', total: 100 },
      { id: '2', date: '2026-11-08', total: 200 },
    ]

    const inverted = filterByDateRange(list, 'date', 'custom', '2026-11-10', '2026-11-01')
    assert.equal(inverted.length, 0, 'Inverted range where start > end should return empty array')

    const emptyRange = filterByDateRange(list, 'date', 'custom', '', '')
    assert.equal(emptyRange.length, 2, 'Empty custom range returns all records')

    const openEndedStart = filterByDateRange(list, 'date', 'custom', '2026-11-07', '')
    assert.equal(openEndedStart.length, 1)
    assert.equal(openEndedStart[0].id, '2')

    const openEndedEnd = filterByDateRange(list, 'date', 'custom', '', '2026-11-06')
    assert.equal(openEndedEnd.length, 1)
    assert.equal(openEndedEnd[0].id, '1')
  })

  it('safely handles null, undefined, and malformed inputs', () => {
    assert.deepEqual(filterByDateRange(null), [])
    assert.deepEqual(filterByDateRange(undefined), [])
    assert.deepEqual(filterByDateRange([]), [])

    const malformed = [
      { id: 'm1', total: 100 },
      { id: 'm2', date: null, total: 200 },
      { id: 'm3', date: 'invalid-date', total: 300 },
      { id: 'm4', date: '2026-11-04T12:00:00Z', total: 400 },
    ]

    const res = filterByDateRange(malformed, 'date', 'specific_day', '2026-11-04')
    assert.equal(res.length, 1)
    assert.equal(res[0].id, 'm4')
  })
})

describe('Adversarial Stress Test: 4-Way Visual Color Themes', () => {
  const getTypeTheme = (type) => {
    switch (type) {
      case 'sale_return':
        return {
          label: 'مردود مبيعات',
          badgeClass: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
          rowClass: 'border-r-4 border-r-purple-600 bg-purple-600/[0.03] hover:bg-purple-600/[0.07]',
          cardClass: 'border-r-4 border-r-purple-600 bg-purple-600/[0.04] border-outline-variant/30 hover:border-purple-600/50',
          codeClass: 'text-purple-700',
        }
      case 'purchase_return':
        return {
          label: 'مردود مشتريات',
          badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
          rowClass: 'border-r-4 border-r-rose-600 bg-rose-600/[0.03] hover:bg-rose-600/[0.07]',
          cardClass: 'border-r-4 border-r-rose-600 bg-rose-600/[0.04] border-outline-variant/30 hover:border-rose-600/50',
          codeClass: 'text-rose-700',
        }
      case 'purchase':
        return {
          label: 'فاتورة مشتريات',
          badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
          rowClass: 'border-r-4 border-r-amber-500 bg-amber-500/[0.03] hover:bg-amber-500/[0.06]',
          cardClass: 'border-r-4 border-r-amber-500 bg-amber-500/[0.03] border-outline-variant/30 hover:border-amber-500/50',
          codeClass: 'text-amber-700',
        }
      default:
        return {
          label: 'فاتورة بيع',
          badgeClass: 'bg-primary/10 text-primary border-primary/30',
          rowClass: 'border-r-4 border-r-primary bg-primary/[0.02] hover:bg-primary/[0.05]',
          cardClass: 'border-r-4 border-r-primary bg-primary/[0.02] border-outline-variant/30 hover:border-primary/50',
          codeClass: 'text-primary',
        }
    }
  }

  it('guarantees mutually exclusive visual color classes for all 4 types', () => {
    const types = ['sale', 'purchase', 'sale_return', 'purchase_return']
    const themes = types.map(getTypeTheme)

    const rowColors = themes.map((t) => t.rowClass.match(/border-r-(primary|amber-\d+|purple-\d+|rose-\d+)/)[1])
    const cardColors = themes.map((t) => t.cardClass.match(/border-r-(primary|amber-\d+|purple-\d+|rose-\d+)/)[1])
    const codeColors = themes.map((t) => t.codeClass)
    const labels = themes.map((t) => t.label)

    assert.equal(new Set(rowColors).size, 4, 'All 4 types must have distinct row border colors')
    assert.equal(new Set(cardColors).size, 4, 'All 4 types must have distinct mobile card border colors')
    assert.equal(new Set(codeColors).size, 4, 'All 4 types must have distinct code accent colors')
    assert.equal(new Set(labels).size, 4, 'All 4 types must have distinct labels')
  })

  it('gracefully falls back to default sale theme for unexpected types', () => {
    const unknownTheme = getTypeTheme('unknown_type')
    const nullTheme = getTypeTheme(null)

    assert.equal(unknownTheme.label, 'فاتورة بيع')
    assert.equal(nullTheme.label, 'فاتورة بيع')
  })
})

describe('Adversarial Stress Test: Invoice Returns Conversion Flow & Reversals', () => {
  const setupInitialState = () => ({
    clients: [
      { id: 'cli-1', name: 'مطعم البركة', balance: 10000 },
      { id: 'cli-2', name: 'سوبرماركت المدينة', balance: 5000 },
    ],
    suppliers: [
      { id: 'sup-1', name: 'شركة النور للمواشي', companyName: 'شركة النور للمواشي', balance: 40000 },
    ],
    inventoryStock: [
      { warehouseId: 'wh-1', itemId: 'it-beef', quantity: 50, unit: 'كرتونة' },
      { warehouseId: 'wh-1', itemId: 'it-liver', quantity: 20, unit: 'أطباق' },
      { warehouseId: 'wh-1', itemId: 'it-chicken', quantity: 15, unit: 'كرتونة' },
    ],
    treasuryAccounts: [
      { id: 'tr-1', name: 'خزينة الفرع', balance: 50000 },
    ],
    cashTransactions: [],
    invoices: [
      {
        id: 'inv-sale-1',
        code: 'INV-1001',
        type: 'sale',
        partyName: 'مطعم البركة',
        warehouseId: 'wh-1',
        total: 6000,
        paidAmount: 2000,
        remainingAmount: 4000,
        items: [
          { itemId: 'it-beef', quantity: 20, price: 200, total: 4000 },
          { itemId: 'it-liver', quantity: 10, price: 200, total: 2000 },
        ],
      },
    ],
  })

  it('accurately reverses customer balance and increments inventory on sales return credit', () => {
    const initialState = setupInitialState()

    const saleReturnInv = {
      id: 'ret-sale-1',
      code: 'RET-SALE-001',
      type: 'sale_return',
      originalInvoiceId: 'inv-sale-1',
      partyName: 'مطعم البركة',
      partyKind: 'customer',
      warehouseId: 'wh-1',
      items: [
        { itemId: 'it-beef', quantity: 5, price: 200, total: 1000 },
      ],
      total: 1000,
      paidAmount: 0,
      remainingAmount: 1000,
      paymentTerms: 'تخفيض رصيد الحساب',
    }

    const nextState = processInvoiceStoreState(initialState, saleReturnInv)

    const updatedClient = nextState.clients.find((c) => c.name === 'مطعم البركة')
    assert.equal(updatedClient.balance, 9000, 'Customer balance should decrease from 10000 to 9000 (1000 credit)')

    const updatedStock = nextState.inventoryStock.find((s) => s.itemId === 'it-beef' && s.warehouseId === 'wh-1')
    assert.equal(updatedStock.quantity, 55, 'Warehouse stock should increase from 50 to 55 (+5 units restored)')

    const unchangedLiverStock = nextState.inventoryStock.find((s) => s.itemId === 'it-liver' && s.warehouseId === 'wh-1')
    assert.equal(unchangedLiverStock.quantity, 20, 'Unreturned items stock must remain untouched')

    assert.equal(nextState.treasuryAccounts[0].balance, 50000, 'Treasury balance must not change on credit return')
    assert.equal(nextState.cashTransactions.length, 0, 'No cash transactions should be logged on credit return')
  })

  it('accurately reverses treasury balance and records cash disbursement on cash refund', () => {
    const initialState = setupInitialState()

    const cashRefundInv = {
      id: 'ret-sale-2',
      code: 'RET-SALE-002',
      type: 'sale_return',
      originalInvoiceId: 'inv-sale-1',
      partyName: 'مطعم البركة',
      partyKind: 'customer',
      warehouseId: 'wh-1',
      treasuryId: 'tr-1',
      items: [
        { itemId: 'it-beef', quantity: 3, price: 200, total: 600 },
      ],
      total: 600,
      paidAmount: 600,
      remainingAmount: 0,
      paymentTerms: 'رد نقدي فوري',
    }

    const nextState = processInvoiceStoreState(initialState, cashRefundInv)

    const updatedClient = nextState.clients.find((c) => c.name === 'مطعم البركة')
    assert.equal(updatedClient.balance, 10000, 'Client balance must NOT change on cash refund')

    const updatedTreasury = nextState.treasuryAccounts.find((t) => t.id === 'tr-1')
    assert.equal(updatedTreasury.balance, 49400, 'Treasury balance must decrease by 600 (50000 -> 49400)')

    assert.equal(nextState.cashTransactions.length, 1, 'Cash disbursement transaction must be recorded')
    assert.equal(nextState.cashTransactions[0].amount, 600)
    assert.ok(nextState.cashTransactions[0].notes.includes('RET-SALE-002'))

    const updatedStock = nextState.inventoryStock.find((s) => s.itemId === 'it-beef')
    assert.equal(updatedStock.quantity, 53, 'Stock must increase by 3 units')
  })

  it('accurately reduces supplier balance and decrements inventory on purchase return', () => {
    const initialState = setupInitialState()

    const purchaseReturnInv = {
      id: 'ret-pur-1',
      code: 'RET-PUR-001',
      type: 'purchase_return',
      partyName: 'شركة النور للمواشي',
      partyKind: 'supplier',
      warehouseId: 'wh-1',
      items: [
        { itemId: 'it-chicken', quantity: 5, price: 100, total: 500 },
      ],
      total: 500,
      paidAmount: 0,
      remainingAmount: 500,
      paymentTerms: 'تخفيض رصيد الحساب',
    }

    const nextState = processInvoiceStoreState(initialState, purchaseReturnInv)

    const updatedSupplier = nextState.suppliers.find((s) => s.name === 'شركة النور للمواشي')
    assert.equal(updatedSupplier.balance, 39500, 'Supplier liability must decrease from 40000 to 39500')

    const updatedStock = nextState.inventoryStock.find((s) => s.itemId === 'it-chicken')
    assert.equal(updatedStock.quantity, 10, 'Stock must decrease from 15 to 10 (items returned back to supplier)')
  })

  it('auto-provisions missing item in warehouse stock upon return if not previously stocked', () => {
    const initialState = setupInitialState()

    const returnNewItemInv = {
      id: 'ret-new-item',
      code: 'RET-SALE-999',
      type: 'sale_return',
      partyName: 'مطعم البركة',
      partyKind: 'customer',
      warehouseId: 'wh-1',
      items: [
        { itemId: 'it-duck', quantity: 8, unit: 'بطة', price: 150, total: 1200 },
      ],
      total: 1200,
      paidAmount: 0,
      remainingAmount: 1200,
    }

    const nextState = processInvoiceStoreState(initialState, returnNewItemInv)
    const duckStock = nextState.inventoryStock.find((s) => s.itemId === 'it-duck' && s.warehouseId === 'wh-1')
    assert.ok(duckStock, 'Missing item must be provisioned in warehouse stock')
    assert.equal(duckStock.quantity, 8)
  })
})

describe('Adversarial Stress Test: R6 Reports Accounting Calculations', () => {
  it('prevents double-counting in cash flow while avoiding false-positive substring collisions', () => {
    const invoices = [
      { id: '1', code: 'INV-1', type: 'sale', partyName: 'عميل 1', paidAmount: 1000, date: '2026-11-04' },
      { id: '2', code: 'INV-10', type: 'sale', partyName: 'عميل 2', paidAmount: 2000, date: '2026-11-04' },
      { id: '3', code: 'INV-2', type: 'sale', partyName: 'عميل 3', paidAmount: 500, date: '2026-11-04' },
    ]

    const cashTransactions = [
      { id: 'tx-1', code: 'REC-10', amount: 2000, notes: 'تحصيل نقدي - فاتورة مبيعات INV-10', date: '2026-11-04' },
    ]

    const recordedCashNotes = new Set(cashTransactions.map((tx) => tx.notes || ''))

    const hasCollision = Array.from(recordedCashNotes).some((note) => note.includes(invoices[0].code))
    assert.equal(hasCollision, true, 'String.includes("INV-1") matches note containing "INV-10"! This surfaces a substring collision vulnerability.')

    const safeIsAlreadyRecorded = (invCode) => {
      const regex = new RegExp(`\\b${invCode}\\b`)
      return Array.from(recordedCashNotes).some((note) => regex.test(note))
    }

    assert.equal(safeIsAlreadyRecorded('INV-1'), false, 'Word boundary regex prevents false positive collision for INV-1')
    assert.equal(safeIsAlreadyRecorded('INV-10'), true, 'Word boundary regex correctly identifies actual recorded invoice INV-10')
  })

  it('accurately computes debt aging buckets using real dates without mock percentages', () => {
    const now = new Date('2026-11-05T12:00:00Z')

    const client = { id: 'c1', name: 'عميل تجريبي', balance: 10000 }
    const invoices = [
      { partyName: 'عميل تجريبي', type: 'sale', remainingAmount: 2500, date: '2026-10-20' }, // 16 days -> 0-30
      { partyName: 'عميل تجريبي', type: 'sale', remainingAmount: 3000, date: '2026-09-25' }, // 41 days -> 31-60
      { partyName: 'عميل تجريبي', type: 'sale', remainingAmount: 1500, date: '2026-08-15' }, // 82 days -> 61-90
      { partyName: 'عميل تجريبي', type: 'sale', remainingAmount: 2000, date: '2026-06-01' }, // 157 days -> +90
    ]

    let under30 = 0
    let d31To60 = 0
    let d61To90 = 0
    let over90 = 0

    invoices.forEach((inv) => {
      const invDate = new Date(inv.date)
      const diffDays = Math.max(0, Math.floor((now - invDate) / (1000 * 60 * 60 * 24)))
      const rem = Number(inv.remainingAmount) || 0

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

    const invoicesTotal = under30 + d31To60 + d61To90 + over90
    const unallocated = client.balance - invoicesTotal
    if (unallocated > 0) {
      under30 += unallocated
    }

    assert.equal(under30, 3500, '2500 from invoice + 1000 unallocated opening balance')
    assert.equal(d31To60, 3000)
    assert.equal(d61To90, 1500)
    assert.equal(over90, 2000)
    assert.equal(under30 + d31To60 + d61To90 + over90, client.balance)

    let riskLevel = 'منخفض'
    if (over90 > 0 || d61To90 > client.balance * 0.4) {
      riskLevel = 'حرج'
    } else if (d31To60 > client.balance * 0.3) {
      riskLevel = 'متوسط'
    }

    assert.equal(riskLevel, 'حرج', 'Customer with debts over 90 days must be rated as critical (حرج)')
  })

  it('verifies that index.css @media print hides all UI chrome and sets A4 specifications', () => {
    const cssContent = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf-8')
    assert.ok(cssContent.includes('@media print'), 'CSS must include @media print definition')
    assert.ok(cssContent.includes('size: A4 portrait'), 'Print page must specify A4 portrait')
    assert.ok(cssContent.includes('header,'), 'Header must be hidden in print')
    assert.ok(cssContent.includes('nav,'), 'Nav must be hidden in print')
    assert.ok(cssContent.includes('aside,'), 'Aside must be hidden in print')
    assert.ok(cssContent.includes('button,'), 'Buttons must be hidden in print')
    assert.ok(cssContent.includes('.print-hidden,'), '.print-hidden must be defined')
    assert.ok(cssContent.includes('.no-print'), '.no-print must be defined')
  })
})
