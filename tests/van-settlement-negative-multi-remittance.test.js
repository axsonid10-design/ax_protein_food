import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  calculateSettlementTotals,
  executeVanSettlement,
} from '../src/store/vanDistributionHelpers.js'
import { expenseCategoryHelpers } from '../src/store/expenseCategoryHelpers.js'

describe('Van Settlement: Negative Deficit & Dynamic Multi-Remittance', () => {
  it('correctly calculates negative netBalance and negative flag when expenses exceed cash custody (20,000 vs 20,100)', () => {
    const grossCash = 20000
    const expenses = [
      { id: 'exp-1', amount: 15000, categoryName: 'سولار وقود' },
      { id: 'exp-2', amount: 5100, categoryName: 'صيانة طارئة' },
    ]
    const payments = []

    const totals = calculateSettlementTotals({ grossCash, expenses, payments })

    assert.strictEqual(totals.grossCash, 20000)
    assert.strictEqual(totals.totalExpenses, 20100)
    assert.strictEqual(totals.netBalance, -100)
    assert.strictEqual(totals.isNegative, true)
    assert.strictEqual(totals.deficitAmount, 100)
    assert.strictEqual(totals.netRemitDue, 0)
    assert.strictEqual(totals.totalRemitted, 0)
    assert.strictEqual(totals.variance, 0)
  })

  it('executes full settlement when expenses exceed gross cash without error', async () => {
    let cashTransactions = []
    let pendingTransfers = []

    const storeActions = {
      addCashTransaction: (tx) => cashTransactions.push(tx),
      addPendingCashTransfer: (pct) => pendingTransfers.push(pct),
      confirmCashTransfer: () => {},
    }

    const res = await executeVanSettlement(
      {
        vanWarehouseId: 'van-wh-101',
        vanName: 'سيارة التوزيع 1',
        driverName: 'أحمد علي',
        settlementDate: '2026-11-09',
        grossCash: 20000,
        revenue: { payments: [] },
        expenses: [
          { amount: 20100, categoryId: 'exp-sec-trn-fuel', categoryName: 'وقود وسولار', paymentMethod: 'van_custody' },
        ],
        stockSettlement: { action: 'retain' },
        vanTreasuryId: 'c0000000-0000-0000-0000-000000000005',
      },
      storeActions,
      {},
      null
    )

    assert.strictEqual(res.success, true)
    assert.strictEqual(res.settlement.grossCash, 20000)
    assert.strictEqual(res.settlement.totalExpenses, 20100)
    assert.strictEqual(res.settlement.netBalance, -100)
    assert.strictEqual(res.settlement.isNegative, true)
    assert.strictEqual(res.settlement.deficitAmount, 100)
    assert.strictEqual(res.settlement.totalRemitted, 0)
    assert.strictEqual(cashTransactions.length, 1)
    assert.strictEqual(cashTransactions[0].amount, 20100)
  })

  it('supports adding and persisting new shared expense categories globally', () => {
    let categories = expenseCategoryHelpers.getInitialExpenseCategories()
    const initialCount = categories.length

    const newCat = {
      id: 'exp-sec-custom-carwash',
      name: 'غسيل وتشحيم سيارات التوزيع',
      level: 'secondary',
      parentId: 'exp-sub-trn',
    }

    const nextCategories = expenseCategoryHelpers.addExpenseCategory(categories, newCat)
    assert.strictEqual(nextCategories.length, initialCount + 1)

    const found = nextCategories.find((c) => c.name === 'غسيل وتشحيم سيارات التوزيع')
    assert.ok(found)
    assert.strictEqual(found.id, 'exp-sec-custom-carwash')
    assert.strictEqual(found.parentId, 'exp-sub-trn')
  })

  it('verifies unique treasury selection filtering logic', () => {
    const targetTreasuries = [
      { id: 't-cash-1', name: 'الخزينة الرئيسية', type: 'cash' },
      { id: 't-bank-1', name: 'البنك الأهلي', type: 'bank' },
      { id: 't-insta-1', name: 'إنستاباي', type: 'instapay' },
    ]

    const remittanceRows = [
      { id: 'r1', treasuryId: 't-cash-1', amount: 5000 },
      { id: 'r2', treasuryId: 't-bank-1', amount: 3000 },
    ]

    const selectedIds = new Set(remittanceRows.map((r) => r.treasuryId).filter(Boolean))

    const availableForR1 = targetTreasuries.filter(
      (t) => t.id === 't-cash-1' || !selectedIds.has(t.id)
    )
    assert.strictEqual(availableForR1.length, 2)
    assert.deepStrictEqual(availableForR1.map((t) => t.id), ['t-cash-1', 't-insta-1'])

    const nextAvailable = targetTreasuries.find((t) => !selectedIds.has(t.id))
    assert.strictEqual(nextAvailable.id, 't-insta-1')
  })
})
