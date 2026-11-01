import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateCommission,
  computeRepLedgerBalance,
  computeSalesTargetProgress,
} from '../src/components/sales_reps/AX_CommissionEngine.js'

describe('M4 Adversarial Challenge: Volume Rate Model Stress', () => {
  it('1.1 should handle zero sales and empty sales array with zero commission', () => {
    const rep = { commissionModel: 'volume_rate', stepAmount: 1000, stepRate: 50 }
    const resEmpty = calculateCommission(rep, [])
    assert.strictEqual(resEmpty.totalSales, 0)
    assert.strictEqual(resEmpty.totalCommission, 0)
    assert.strictEqual(resEmpty.breakdown[0].steps, 0)

    const resZero = calculateCommission(rep, [{ total: 0 }, { total: '0' }])
    assert.strictEqual(resZero.totalSales, 0)
    assert.strictEqual(resZero.totalCommission, 0)
  })

  it('1.2 should clamp pure negative sales and returns to zero commission without negative steps', () => {
    const rep = { commissionModel: 'volume_rate', stepAmount: 1000, stepRate: 50 }
    const resNegative = calculateCommission(rep, [{ total: -5000 }])
    assert.strictEqual(resNegative.totalSales, -5000)
    assert.strictEqual(resNegative.totalCommission, 0)
    assert.strictEqual(resNegative.breakdown[0].steps, 0)
  })

  it('1.3 should clamp net negative sales from excessive returns to zero commission', () => {
    const rep = { commissionModel: 'volume_rate', stepAmount: 1000, stepRate: 50 }
    const sales = [{ total: 4000 }, { total: -7000 }]
    const res = calculateCommission(rep, sales)
    assert.strictEqual(res.totalSales, -3000)
    assert.strictEqual(res.totalCommission, 0)
  })

  it('1.4 should compute stepped vs proportional volume on net positive sales with returns', () => {
    const sales = [{ total: 10000 }, { total: -2500 }]
    const steppedRep = { commissionModel: 'volume_rate', stepAmount: 1000, stepRate: 50, isProportional: false }
    const resStepped = calculateCommission(steppedRep, sales)
    assert.strictEqual(resStepped.totalSales, 7500)
    assert.strictEqual(resStepped.breakdown[0].steps, 7)
    assert.strictEqual(resStepped.totalCommission, 350)

    const propRep = { commissionModel: 'volume_rate', stepAmount: 1000, stepRate: 50, isProportional: true }
    const resProp = calculateCommission(propRep, sales)
    assert.strictEqual(resProp.totalSales, 7500)
    assert.strictEqual(resProp.breakdown[0].steps, 7.5)
    assert.strictEqual(resProp.totalCommission, 375)
  })

  it('1.5 should verify exact step boundary transitions at 999.99, 1000, 1999.99, and 2000', () => {
    const rep = { commissionModel: 'volume_rate', stepAmount: 1000, stepRate: 50 }
    assert.strictEqual(calculateCommission(rep, [{ total: 999.99 }]).totalCommission, 0)
    assert.strictEqual(calculateCommission(rep, [{ total: 1000 }]).totalCommission, 50)
    assert.strictEqual(calculateCommission(rep, [{ total: 1999.99 }]).totalCommission, 50)
    assert.strictEqual(calculateCommission(rep, [{ total: 2000 }]).totalCommission, 100)
  })

  it('1.6 should handle large commercial volumes (100M EGP) and fall back gracefully on invalid step amounts', () => {
    const rep = { commissionModel: 'volume_rate', stepAmount: 1000, stepRate: 50 }
    const resLarge = calculateCommission(rep, [{ total: 100000000 }])
    assert.strictEqual(resLarge.breakdown[0].steps, 100000)
    assert.strictEqual(resLarge.totalCommission, 5000000)

    const repZeroStep = { commissionModel: 'volume_rate', stepAmount: 0, stepRate: 50 }
    const resSafe = calculateCommission(repZeroStep, [{ total: 5000 }])
    assert.strictEqual(resSafe.breakdown[0].stepAmount, 1000)
    assert.strictEqual(resSafe.totalCommission, 250)

    const repConfigNested = {
      commissionModel: 'volume_rate',
      commissionConfig: { volumeRate: { stepAmount: 2000, stepRate: 100, proportional: true } },
    }
    const resNested = calculateCommission(repConfigNested, [{ total: 5000 }])
    assert.strictEqual(resNested.breakdown[0].stepAmount, 2000)
    assert.strictEqual(resNested.totalCommission, 250)
  })
})

describe('M4 Adversarial Challenge: Category Percentage Model Stress', () => {
  it('2.1 should compute commission accurately across mixed meat categories and item quantity*price', () => {
    const rep = {
      commissionModel: 'category_percentage',
      categoryRates: { 'لحوم': 0.025, 'مصنعات': 0.035, 'دواجن': 0.015, 'default': 0.02 },
    }
    const sales = [
      {
        total: 25000,
        items: [
          { itemId: 'item-beef', category: 'لحوم', quantity: 20, unitPrice: 500 },
          { itemId: 'item-proc', category: 'مصنعات', quantity: 10, price: 600 },
          { itemId: 'item-chick', category: 'دواجن', total: 4000 },
          { itemId: 'item-zero', category: 'لحوم', quantity: 0, unitPrice: 400 },
        ],
      },
    ]
    const res = calculateCommission(rep, sales)
    const expected = (10000 * 0.025) + (6000 * 0.035) + (4000 * 0.015) + 0
    assert.strictEqual(res.totalCommission, expected)
    assert.strictEqual(res.breakdown.length, 4)
  })

  it('2.2 should normalize whole percentage rates (>1) and decimal rates (<=1) consistently', () => {
    const rep = {
      commissionModel: 'category_percentage',
      categoryRates: { 'لحوم': 2.5, 'مصنعات': '3.5', 'دواجن': 0.015, 'خامات': 1.0, 'default': 2 },
    }
    const sales = [
      {
        total: 10000,
        items: [
          { itemId: 'i1', category: 'لحوم', total: 2000 },
          { itemId: 'i2', category: 'مصنعات', total: 2000 },
          { itemId: 'i3', category: 'دواجن', total: 2000 },
          { itemId: 'i4', category: 'خامات', total: 2000 },
          { itemId: 'i5', category: 'غير_معروف', total: 2000 },
        ],
      },
    ]
    const res = calculateCommission(rep, sales)
    const expected = (2000 * 0.025) + (2000 * 0.035) + (2000 * 0.015) + (2000 * 1.0) + (2000 * 0.02)
    assert.strictEqual(res.totalCommission, expected)
  })

  it('2.3 should fall back to default rate when sales lack items array but specify invoice total', () => {
    const rep = {
      commissionModel: 'category_percentage',
      categoryRates: { 'لحوم': 0.03, 'default': 2.5 },
    }
    const sales = [
      { id: 'inv-sim-1', total: 10000, items: [] },
      { id: 'inv-sim-2', total: 6000 },
    ]
    const res = calculateCommission(rep, sales)
    assert.strictEqual(res.totalSales, 16000)
    assert.strictEqual(res.totalCommission, 16000 * 0.025)
    assert.strictEqual(res.breakdown.length, 2)
    assert.strictEqual(res.breakdown[0].category, 'default')
    assert.strictEqual(res.breakdown[1].category, 'default')
  })
})

describe('M4 Adversarial Challenge: Target Tier Attainment Model Stress', () => {
  it('3.1 should probe exact boundary transitions at 79.99%, 80%, 99.99%, 100%, and 150%', () => {
    const rep = { commissionModel: 'target_tier', targetAmount: 100000, tierBonus: 500 }

    const res7999 = calculateCommission(rep, [{ total: 79990 }])
    assert.strictEqual(res7999.breakdown[0].attainmentPct, 80)
    assert.strictEqual(res7999.breakdown[0].appliedRate, 0.01)
    assert.strictEqual(res7999.totalCommission, 799.9)

    const res8000 = calculateCommission(rep, [{ total: 80000 }])
    assert.strictEqual(res8000.breakdown[0].appliedRate, 0.018)
    assert.strictEqual(res8000.totalCommission, 1440)

    const res9999 = calculateCommission(rep, [{ total: 99990 }])
    assert.strictEqual(res9999.breakdown[0].appliedRate, 0.018)
    assert.strictEqual(res9999.totalCommission, 1799.82)

    const res10000 = calculateCommission(rep, [{ total: 100000 }])
    assert.strictEqual(res10000.breakdown[0].appliedRate, 0.025)
    assert.strictEqual(res10000.breakdown[0].bonus, 500)
    assert.strictEqual(res10000.totalCommission, 3000)

    const res15000 = calculateCommission(rep, [{ total: 150000 }])
    assert.strictEqual(res15000.breakdown[0].appliedRate, 0.025)
    assert.strictEqual(res15000.breakdown[0].bonus, 500)
    assert.strictEqual(res15000.totalCommission, 4250)
  })

  it('3.2 should evaluate unsorted custom tier slabs and normalize slab rates correctly', () => {
    const rep = {
      commissionModel: 'target_tier',
      targetAmount: 50000,
      tiers: [
        { minAttainment: 0.8, rate: 2, bonus: 200 },
        { minAttainment: 1.2, rate: 4, bonus: 1500 },
        { minAttainment: 1.0, rate: 3, bonus: 800 },
      ],
    }

    const resBelow = calculateCommission(rep, [{ total: 30000 }])
    assert.strictEqual(resBelow.breakdown[0].appliedRate, 0.01)
    assert.strictEqual(resBelow.totalCommission, 300)

    const res80 = calculateCommission(rep, [{ total: 45000 }])
    assert.strictEqual(res80.breakdown[0].appliedRate, 0.02)
    assert.strictEqual(res80.breakdown[0].bonus, 200)
    assert.strictEqual(res80.totalCommission, (45000 * 0.02) + 200)

    const res120 = calculateCommission(rep, [{ total: 65000 }])
    assert.strictEqual(res120.breakdown[0].appliedRate, 0.04)
    assert.strictEqual(res120.breakdown[0].bonus, 1500)
    assert.strictEqual(res120.totalCommission, (65000 * 0.04) + 1500)
  })

  it('3.3 should guard against zero sales target without division by zero or NaN', () => {
    const rep = { commissionModel: 'target_tier', targetAmount: 0 }
    const res = calculateCommission(rep, [{ total: 50000 }])
    assert.strictEqual(res.breakdown[0].target, 0)
    assert.strictEqual(res.breakdown[0].appliedRate, 0.01)
    assert.strictEqual(res.breakdown[0].bonus, 0)
    assert.strictEqual(res.totalCommission, 500)
    assert.strictEqual(Number.isNaN(res.totalCommission), false)
  })
})

describe('M4 Adversarial Challenge: Hybrid Model Stress', () => {
  it('4.1 should combine normalized base rates with target attainment bonuses', () => {
    const rep = { commissionModel: 'hybrid', baseRate: 2.5, targetAmount: 100000 }

    const resLow = calculateCommission(rep, [{ total: 60000 }])
    assert.strictEqual(resLow.breakdown[0].tierBonus, 0)
    assert.strictEqual(resLow.totalCommission, 60000 * 0.025)

    const resMid = calculateCommission(rep, [{ total: 85000 }])
    assert.strictEqual(resMid.breakdown[0].tierBonus, 400)
    assert.strictEqual(resMid.totalCommission, (85000 * 0.025) + 400)

    const resHigh = calculateCommission(rep, [{ total: 110000 }])
    assert.strictEqual(resHigh.breakdown[0].tierBonus, 1000)
    assert.strictEqual(resHigh.totalCommission, (110000 * 0.025) + 1000)
  })

  it('4.2 should handle zero target in hybrid model safely with zero bonus', () => {
    const rep = { commissionModel: 'hybrid', baseRate: 0.02, targetAmount: 0 }
    const res = calculateCommission(rep, [{ total: 50000 }])
    assert.strictEqual(res.breakdown[0].tierBonus, 0)
    assert.strictEqual(res.totalCommission, 1000)
  })
})

describe('M4 Adversarial Challenge: 360° Ledger Arithmetic & Stress', () => {
  it('5.1 should sort shuffled transactions chronologically and compute running balance', () => {
    const openingBalance = 5000
    const shuffledTxs = [
      { id: 'tx-4', date: '2026-10-25', type: 'payment', amount: 3000 },
      { id: 'tx-2', date: '2026-10-10', type: 'bonus', amount: 1500 },
      { id: 'tx-1', date: '2026-10-02', type: 'commission', amount: 4000 },
      { id: 'tx-3', date: '2026-10-18', type: 'clawback', amount: 1000 },
    ]
    const { netBalance, history } = computeRepLedgerBalance(openingBalance, shuffledTxs)

    assert.strictEqual(history[0].id, 'tx-1')
    assert.strictEqual(history[0].runningBalance, 9000)
    assert.strictEqual(history[1].id, 'tx-2')
    assert.strictEqual(history[1].runningBalance, 10500)
    assert.strictEqual(history[2].id, 'tx-3')
    assert.strictEqual(history[2].runningBalance, 9500)
    assert.strictEqual(history[3].id, 'tx-4')
    assert.strictEqual(history[3].runningBalance, 6500)
    assert.strictEqual(netBalance, 6500)
  })

  it('5.2 should subtract disbursements, clawbacks, deductions, and penalties correctly', () => {
    const opening = 20000
    const txs = [
      { id: 'p1', date: '2026-10-01', type: 'disbursement', amount: 5000 },
      { id: 'p2', date: '2026-10-02', type: 'deduction', amount: 2000 },
      { id: 'p3', date: '2026-10-03', type: 'penalty', amount: 1000 },
      { id: 'p4', date: '2026-10-04', type: 'payment', amount: 4000 },
      { id: 'p5', date: '2026-10-05', type: 'clawback', amount: 1500 },
    ]
    const { netBalance, history } = computeRepLedgerBalance(opening, txs)
    assert.strictEqual(netBalance, 20000 - 5000 - 2000 - 1000 - 4000 - 1500)
    assert.strictEqual(history[4].runningBalance, 6500)
  })

  it('5.3 should support negative opening balances and handle running balance crossing zero', () => {
    const opening = -5000
    const txs = [
      { id: 'c1', date: '2026-10-01', type: 'commission', amount: 3000 },
      { id: 'c2', date: '2026-10-02', type: 'commission', amount: 4000 },
      { id: 'p1', date: '2026-10-03', type: 'payment', amount: 5000 },
    ]
    const { netBalance, history } = computeRepLedgerBalance(opening, txs)
    assert.strictEqual(history[0].runningBalance, -2000)
    assert.strictEqual(history[1].runningBalance, 2000)
    assert.strictEqual(history[2].runningBalance, -3000)
    assert.strictEqual(netBalance, -3000)
  })

  it('5.4 should handle empty transaction history without throwing', () => {
    const { netBalance, history } = computeRepLedgerBalance(7500, [])
    assert.strictEqual(netBalance, 7500)
    assert.strictEqual(history.length, 0)

    const defaultRes = computeRepLedgerBalance()
    assert.strictEqual(defaultRes.netBalance, 0)
    assert.strictEqual(defaultRes.history.length, 0)
  })
})

describe('M4 Adversarial Challenge: Sales Target Progress Aggregation', () => {
  it('6.1 should aggregate multiple sales reps targets and calculate achievement percentage', () => {
    const reps = [
      { id: 'r1', targetAmount: 100000 },
      { id: 'r2', salesTarget: 150000 },
      { id: 'r3', targetAmount: 50000 },
    ]
    const progress = computeSalesTargetProgress(reps, 225000)
    assert.strictEqual(progress.totalTarget, 300000)
    assert.strictEqual(progress.periodSales, 225000)
    assert.strictEqual(progress.achievementPct, 75)
    assert.strictEqual(progress.remainingTarget, 75000)
  })

  it('6.2 should clamp remaining target to 0 when achievement exceeds 100%', () => {
    const reps = [{ targetAmount: 100000 }]
    const progress = computeSalesTargetProgress(reps, 140000)
    assert.strictEqual(progress.achievementPct, 140)
    assert.strictEqual(progress.remainingTarget, 0)
  })

  it('6.3 should return zeros when rep list has zero targets or is empty', () => {
    const emptyProgress = computeSalesTargetProgress([], 10000)
    assert.strictEqual(emptyProgress.totalTarget, 0)
    assert.strictEqual(emptyProgress.achievementPct, 0)
    assert.strictEqual(emptyProgress.remainingTarget, 0)

    const zeroTargetReps = [{ targetAmount: 0 }, { salesTarget: 0 }]
    const zeroProgress = computeSalesTargetProgress(zeroTargetReps, 20000)
    assert.strictEqual(zeroProgress.totalTarget, 0)
    assert.strictEqual(zeroProgress.achievementPct, 0)
    assert.strictEqual(zeroProgress.remainingTarget, 0)
  })
})
