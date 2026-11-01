import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  SUPPLY_TYPES,
  SUPPLY_TYPE_LABELS,
  SUPPLIER_CATEGORIES,
  normalizeSupplyType,
  calculateSupplierBalance,
  getSupplyTypeLabel,
} from '../src/components/suppliers/supplierConstants.js'
import { initialSuppliers, initialCashTransactions, initialInvoices } from '../src/store/initialData.js'

describe('M3 Adversarial Challenge 1: Supplier Balance Calculations & Invariants', () => {
  function computeSupplierBalance(openingBalance, openingBalanceType) {
    const raw = Number(openingBalance) || 0
    const normalized = raw === 0 ? 0 : raw
    return normalized === 0 ? 0 : (openingBalanceType === 'payable' ? normalized : -normalized)
  }

  function computeLedgerRunningBalance(supplier, purchases = [], payouts = []) {
    const entries = []
    const opBal = Number(supplier.openingBalance) || 0
    const opType = supplier.openingBalanceType || 'payable'
    const opSigned = opType === 'payable' ? opBal : -opBal

    if (opBal > 0) {
      entries.push({
        id: 'op-bal',
        date: supplier.createdAt || '2026-10-01T00:00:00.000Z',
        type: 'opening',
        credit: opType === 'payable' ? opBal : 0,
        debit: opType === 'receivable' ? opBal : 0,
      })
    }

    purchases.forEach((inv) => {
      const invTotal = Number(inv.totalAmount || inv.total) || 0
      const paid = Number(inv.paidAmount || inv.cashPaid) || 0
      entries.push({
        id: inv.id,
        date: inv.date || inv.createdAt || '2026-10-01T00:00:00.000Z',
        type: 'purchase_invoice',
        credit: invTotal,
        debit: paid,
      })
    })

    payouts.forEach((po) => {
      entries.push({
        id: po.id,
        date: po.date || po.createdAt || '2026-10-01T00:00:00.000Z',
        type: 'disbursement',
        credit: 0,
        debit: Number(po.amount) || 0,
      })
    })

    entries.sort((a, b) => new Date(a.date) - new Date(b.date))

    let running = 0
    return entries.map((entry) => {
      const credit = entry.credit || 0
      const debit = entry.debit || 0
      running += (credit - debit)
      return { ...entry, runningBalance: running }
    })
  }

  it('1.1 should correctly sign payable opening balance as positive company liability', () => {
    const bal = computeSupplierBalance(75000, 'payable')
    assert.strictEqual(bal, 75000)
    assert.ok(bal > 0)
  })

  it('1.2 should correctly sign receivable opening balance as negative advance payment', () => {
    const bal = computeSupplierBalance(25000, 'receivable')
    assert.strictEqual(bal, -25000)
    assert.ok(bal < 0)
  })

  it('1.3 should normalize zero opening balance to positive 0 regardless of balance type', () => {
    const payZero = computeSupplierBalance(0, 'payable')
    const recZero = computeSupplierBalance(0, 'receivable')
    const strZero = computeSupplierBalance('0.00', 'payable')
    const emptyZero = computeSupplierBalance('', 'receivable')

    assert.strictEqual(payZero, 0)
    assert.strictEqual(recZero, 0)
    assert.strictEqual(strZero, 0)
    assert.strictEqual(emptyZero, 0)
    assert.strictEqual(Object.is(payZero, -0), false)
    assert.strictEqual(Object.is(recZero, -0), false)
  })

  it('1.4 should handle extreme balance of 50,000,000 EGP with full precision', () => {
    const extremeAmount = 50000000
    const balPayable = computeSupplierBalance(extremeAmount, 'payable')
    const balReceivable = computeSupplierBalance(extremeAmount, 'receivable')

    assert.strictEqual(balPayable, 50000000)
    assert.strictEqual(balReceivable, -50000000)

    const formatted = balPayable.toLocaleString('ar-EG')
    assert.ok(formatted.length > 0)
  })

  it('1.5 should verify complex multi-step 360° ledger running balance sequence', () => {
    const supplier = {
      id: 'sup-adv-01',
      name: 'شركة الأمل للتوريدات والتبريد',
      openingBalance: 100000,
      openingBalanceType: 'payable',
      createdAt: '2026-10-01T08:00:00.000Z',
    }

    const purchases = [
      {
        id: 'pur-1',
        supplierId: 'sup-adv-01',
        date: '2026-10-05T10:00:00.000Z',
        total: 250000,
        paidAmount: 50000,
      },
      {
        id: 'pur-2',
        supplierId: 'sup-adv-01',
        date: '2026-10-15T12:00:00.000Z',
        total: 180000,
        paidAmount: 180000,
      },
      {
        id: 'pur-3',
        supplierId: 'sup-adv-01',
        date: '2026-10-25T14:00:00.000Z',
        total: 120000,
        paidAmount: 0,
      },
    ]

    const payouts = [
      {
        id: 'pay-1',
        partyId: 'sup-adv-01',
        date: '2026-10-10T11:00:00.000Z',
        amount: 80000,
      },
      {
        id: 'pay-2',
        partyId: 'sup-adv-01',
        date: '2026-10-20T09:00:00.000Z',
        amount: 150000,
      },
    ]

    const ledger = computeLedgerRunningBalance(supplier, purchases, payouts)
    assert.strictEqual(ledger.length, 6)

    assert.strictEqual(ledger[0].id, 'op-bal')
    assert.strictEqual(ledger[0].runningBalance, 100000)

    assert.strictEqual(ledger[1].id, 'pur-1')
    assert.strictEqual(ledger[1].runningBalance, 300000)

    assert.strictEqual(ledger[2].id, 'pay-1')
    assert.strictEqual(ledger[2].runningBalance, 220000)

    assert.strictEqual(ledger[3].id, 'pur-2')
    assert.strictEqual(ledger[3].runningBalance, 220000)

    assert.strictEqual(ledger[4].id, 'pay-2')
    assert.strictEqual(ledger[4].runningBalance, 70000)

    assert.strictEqual(ledger[5].id, 'pur-3')
    assert.strictEqual(ledger[5].runningBalance, 190000)
  })
})

describe('M3 Adversarial Challenge 2: Supply Types & Category Normalization', () => {
  it('2.1 should preserve all officially recognized domain supply types', () => {
    const knownTypes = ['frozen_meat', 'poultry', 'fish', 'packaging', 'slaughterhouse', 'spices_seasoning']
    knownTypes.forEach((t) => {
      assert.strictEqual(normalizeSupplyType(t), t)
    })
  })

  it('2.2 should map legacy Arabic supply type aliases to canonical tokens', () => {
    assert.strictEqual(normalizeSupplyType('أسماك بحرية'), 'fish')
    assert.strictEqual(normalizeSupplyType('دواجن ومجزءات'), 'poultry')
  })

  it('2.3 should fallback unknown, null, undefined, or empty supply types to frozen_meat', () => {
    assert.strictEqual(normalizeSupplyType(''), 'frozen_meat')
    assert.strictEqual(normalizeSupplyType(null), 'frozen_meat')
    assert.strictEqual(normalizeSupplyType(undefined), 'frozen_meat')
    assert.strictEqual(normalizeSupplyType('alien_supplier_xyz'), 'frozen_meat')
    assert.strictEqual(normalizeSupplyType('   '), 'frozen_meat')
    assert.strictEqual(normalizeSupplyType(12345), 'frozen_meat')
    assert.strictEqual(normalizeSupplyType({}), 'frozen_meat')
  })

  it('2.4 should provide correct human-readable Arabic labels via getSupplyTypeLabel', () => {
    assert.strictEqual(getSupplyTypeLabel('frozen_meat'), 'لحوم مجمدة')
    assert.strictEqual(getSupplyTypeLabel('poultry'), 'دواجن ومصنعات')
    assert.strictEqual(getSupplyTypeLabel('fish'), 'أسماك ومأكولات')
    assert.strictEqual(getSupplyTypeLabel('packaging'), 'تعبئة وتغليف')
    assert.strictEqual(getSupplyTypeLabel('slaughterhouse'), 'مجازر ومذابح')
    assert.strictEqual(getSupplyTypeLabel('spices_seasoning'), 'توابل وإضافات')
    assert.strictEqual(getSupplyTypeLabel('direct_importer'), 'مستورد مباشر')
    assert.strictEqual(getSupplyTypeLabel(''), 'عام')
    assert.strictEqual(getSupplyTypeLabel(null), 'عام')
    assert.strictEqual(getSupplyTypeLabel(undefined), 'عام')
    assert.strictEqual(getSupplyTypeLabel('custom_unknown'), 'custom_unknown')
  })

  it('2.5 should verify SUPPLIER_CATEGORIES catalog completeness', () => {
    assert.ok(SUPPLIER_CATEGORIES.length >= 6)
    assert.ok(SUPPLIER_CATEGORIES.includes('لحوم حمراء ومصنعات'))
    assert.ok(SUPPLIER_CATEGORIES.includes('دواجن ومجمدات بيضاء'))
    assert.ok(SUPPLIER_CATEGORIES.includes('أسماك ومأكولات بحرية'))
    assert.ok(SUPPLIER_CATEGORIES.includes('خامات وتعبئة وتغليف'))
  })
})

describe('M3 Adversarial Challenge 3: Ledger Arithmetic Invariants & Edge Cases', () => {
  it('3.1 should increment payable debt upon credit purchase order', () => {
    const initial = 50000
    const tx = [{ type: 'purchase_credit', amount: 35000 }]
    const result = calculateSupplierBalance(initial, 'payable', tx)
    assert.strictEqual(result, 85000)
  })

  it('3.2 should decrement payable debt upon cash disbursement payout', () => {
    const initial = 85000
    const tx = [{ type: 'disbursement', amount: 45000 }]
    const result = calculateSupplierBalance(initial, 'payable', tx)
    assert.strictEqual(result, 40000)
  })

  it('3.3 should transition into negative advance balance when disbursement exceeds debt', () => {
    const initial = 20000
    const tx = [{ type: 'disbursement', amount: 35000 }]
    const result = calculateSupplierBalance(initial, 'payable', tx)
    assert.strictEqual(result, -15000)
  })

  it('3.4 should absorb advance balance when subsequent credit purchase occurs', () => {
    const initialAdvance = 15000
    const tx = [{ type: 'purchase_credit', amount: 40000 }]
    const result = calculateSupplierBalance(initialAdvance, 'receivable', tx)
    assert.strictEqual(result, 25000)
  })

  it('3.5 should handle zero resulting balance without returning negative zero', () => {
    const initial = 50000
    const tx = [{ type: 'disbursement', amount: 50000 }]
    const result = calculateSupplierBalance(initial, 'payable', tx)
    assert.strictEqual(result, 0)
    assert.strictEqual(Object.is(result, -0), false)
  })

  it('3.6 should handle extreme transaction volumes up to 100,000,000 EGP accurately', () => {
    const result = calculateSupplierBalance(50000000, 'payable', [
      { type: 'purchase_credit', amount: 50000000 },
      { type: 'disbursement', amount: 30000000 },
      { type: 'disbursement', amount: 70000000 },
    ])
    assert.strictEqual(result, 0)
    assert.strictEqual(Object.is(result, -0), false)
  })
})
