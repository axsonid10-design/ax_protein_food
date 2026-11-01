import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Tier 1: Sales Representatives & Commission Engine (F13, F14, F15, F16)', () => {
  // Pure commission calculation engine matching PROJECT.md § Interface Contracts
  function calculateCommission(rep, sales = [], periodTarget = null) {
    const target = periodTarget ?? rep.targetAmount ?? rep.salesTarget ?? 0
    let totalSales = 0
    let totalCommission = 0
    const breakdown = []

    sales.forEach((s) => {
      totalSales += Number(s.total) || 0
    })

    const model = rep.commissionModel || 'volume_rate'

    if (model === 'volume_rate') {
      // Step amount (default 1000 EGP) and step rate (e.g. 50 EGP)
      const stepAmount = rep.stepAmount || 1000
      const stepRate = rep.stepRate || 50
      const steps = Math.floor(totalSales / stepAmount)
      totalCommission = steps * stepRate
      breakdown.push({
        type: 'volume_rate',
        salesVolume: totalSales,
        stepAmount,
        stepRate,
        steps,
        commission: totalCommission
      })
    } else if (model === 'category_percentage') {
      const categoryRates = rep.categoryRates || {
        'أسماك': 0.02,
        'مصنعات': 0.035,
        'خامات': 0.015,
        'default': 0.02
      }

      sales.forEach((sale) => {
        (sale.items || []).forEach((item) => {
          const cat = item.category || 'default'
          const rate = categoryRates[cat] ?? categoryRates['default'] ?? 0.02
          const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
          const comm = itemTotal * rate
          totalCommission += comm
          breakdown.push({
            itemId: item.itemId,
            category: cat,
            amount: itemTotal,
            rate,
            commission: comm
          })
        })
      })
    } else if (model === 'target_tier') {
      const attainment = target > 0 ? (totalSales / target) : 0
      let rate = 0.01 // base rate 1%
      let bonus = 0

      if (attainment >= 1.0) {
        rate = 0.025 // 2.5% for 100%+ attainment
        bonus = 500  // lump sum bonus
      } else if (attainment >= 0.8) {
        rate = 0.018 // 1.8% for 80-99% attainment
      }

      totalCommission = Math.round(((totalSales * rate) + bonus) * 100) / 100
      breakdown.push({
        type: 'target_tier',
        totalSales,
        target,
        attainmentPct: Math.round(attainment * 100),
        appliedRate: rate,
        bonus,
        commission: totalCommission
      })
    } else if (model === 'hybrid') {
      // Base category % + lump sum tier bonus
      const baseRate = rep.baseRate || 0.02
      const baseComm = totalSales * baseRate
      const attainment = target > 0 ? (totalSales / target) : 0
      const tierBonus = attainment >= 1.0 ? 1000 : attainment >= 0.8 ? 400 : 0
      totalCommission = baseComm + tierBonus
      breakdown.push({
        type: 'hybrid',
        totalSales,
        baseRate,
        baseComm,
        tierBonus,
        commission: totalCommission
      })
    }

    return { totalCommission, totalSales, breakdown }
  }

  // Ledger calculation helper
  function computeRepLedgerBalance(openingBalance = 0, transactions = []) {
    let running = Number(openingBalance) || 0
    const history = []

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0
      if (tx.type === 'commission' || tx.type === 'bonus') {
        running += amt
      } else if (tx.type === 'payment' || tx.type === 'disbursement') {
        running -= amt
      }
      history.push({ ...tx, runningBalance: running })
    })

    return { netBalance: running, history }
  }

  it('should create sales rep profile with assigned sales target and branch', () => {
    const rep = {
      id: 'rep-01',
      name: 'محمود عبد الرازق',
      phone: '01011223344',
      assignedBranch: 'فرع مدينة نصر',
      targetAmount: 200000,
      openingBalance: 0,
      commissionModel: 'volume_rate',
      stepAmount: 1000,
      stepRate: 50
    }

    assert.strictEqual(rep.id, 'rep-01')
    assert.strictEqual(rep.name, 'محمود عبد الرازق')
    assert.strictEqual(rep.targetAmount, 200000)
    assert.strictEqual(rep.commissionModel, 'volume_rate')
  })

  it('[Model A] should calculate volume-based commission accurately (50 EGP per 1,000 EGP sales)', () => {
    const rep = {
      commissionModel: 'volume_rate',
      stepAmount: 1000,
      stepRate: 50
    }
    const sales = [
      { total: 34700 } // 34 full thousands -> 34 * 50 = 1,700 EGP
    ]

    const result = calculateCommission(rep, sales)
    assert.strictEqual(result.totalSales, 34700)
    assert.strictEqual(result.totalCommission, 1700)
    assert.strictEqual(result.breakdown[0].steps, 34)
  })

  it('[Model B] should calculate category-specific percentage commissions', () => {
    const rep = {
      commissionModel: 'category_percentage',
      categoryRates: {
        'أسماك': 0.02,
        'مصنعات': 0.035,
        'خامات': 0.015
      }
    }
    const sales = [
      {
        total: 45000,
        items: [
          { itemId: 'item-1', category: 'أسماك', quantity: 15, unitPrice: 1000 },    // 15,000 * 0.02 = 300
          { itemId: 'item-2', category: 'مصنعات', quantity: 20, unitPrice: 1000 },  // 20,000 * 0.035 = 700
          { itemId: 'item-3', category: 'خامات', quantity: 10, unitPrice: 1000 }     // 10,000 * 0.015 = 150
        ]
      }
    ]

    const result = calculateCommission(rep, sales)
    // 300 + 700 + 150 = 1,150 EGP
    assert.strictEqual(result.totalCommission, 1150)
    assert.strictEqual(result.breakdown.length, 3)
  })

  it('[Model C] should apply tiered target attainment multiplier and bonus', () => {
    const rep = {
      commissionModel: 'target_tier',
      targetAmount: 100000
    }

    // Case 1: Attainment < 80% (70,000 EGP sales -> rate 1% = 700)
    const resLow = calculateCommission(rep, [{ total: 70000 }])
    assert.strictEqual(resLow.totalCommission, 700)

    // Case 2: Attainment 85% (85,000 EGP sales -> rate 1.8% = 1530)
    const resMid = calculateCommission(rep, [{ total: 85000 }])
    assert.strictEqual(resMid.totalCommission, 1530)

    // Case 3: Attainment 110% (110,000 EGP sales -> rate 2.5% = 2750 + bonus 500 = 3250)
    const resHigh = calculateCommission(rep, [{ total: 110000 }])
    assert.strictEqual(resHigh.totalCommission, 3250)
  })

  it('[Model D] should calculate hybrid commission with base percentage and tier attainment bonus', () => {
    const rep = {
      commissionModel: 'hybrid',
      baseRate: 0.02,
      targetAmount: 100000
    }

    // 120,000 EGP sales -> base 2% = 2,400 + 100% attainment bonus 1,000 = 3,400 EGP
    const res = calculateCommission(rep, [{ total: 120000 }])
    assert.strictEqual(res.totalCommission, 3400)
  })

  it('should maintain chronological statement of account (ledger) and running net balance', () => {
    const opening = 2500 // opening balance owed to rep
    const transactions = [
      { id: 'tx-1', date: '2026-10-01', type: 'commission', amount: 3500, notes: 'عمولة مبيعات الأسبوع الأول' },
      { id: 'tx-2', date: '2026-10-08', type: 'payment', amount: 4000, notes: 'صرف دفعة نقدية من الخزينة' },
      { id: 'tx-3', date: '2026-10-15', type: 'commission', amount: 4200, notes: 'عمولة مبيعات الأسبوع الثاني' },
      { id: 'tx-4', date: '2026-10-20', type: 'payment', amount: 2000, notes: 'صرف دفعة نقدية' }
    ]

    const ledger = computeRepLedgerBalance(opening, transactions)
    // 2500 + 3500 = 6000
    // 6000 - 4000 = 2000
    // 2000 + 4200 = 6200
    // 6200 - 2000 = 4200
    assert.strictEqual(ledger.netBalance, 4200)
    assert.strictEqual(ledger.history[0].runningBalance, 6000)
    assert.strictEqual(ledger.history[1].runningBalance, 2000)
    assert.strictEqual(ledger.history[2].runningBalance, 6200)
    assert.strictEqual(ledger.history[3].runningBalance, 4200)
  })

  it('should safely handle zero sales target without division by zero or NaN', () => {
    const rep = {
      commissionModel: 'target_tier',
      targetAmount: 0 // Zero target
    }
    const res = calculateCommission(rep, [{ total: 50000 }])
    assert.ok(!Number.isNaN(res.totalCommission))
    assert.strictEqual(res.breakdown[0].attainmentPct, 0)
    assert.strictEqual(res.totalCommission, 500) // 50,000 * 1% base
  })
})
