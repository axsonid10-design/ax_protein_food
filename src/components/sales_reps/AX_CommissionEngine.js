const normalizeRate = (r) => (Number(r) > 1 ? Number(r) / 100 : Number(r) || 0)

export function calculateCommission(rep, sales = [], periodTarget = null) {
  const target = periodTarget ?? rep.targetAmount ?? rep.salesTarget ?? 0
  let totalSales = 0
  let totalCommission = 0
  const breakdown = []

  sales.forEach((s) => {
    totalSales += Number(s.total) || 0
  })

  const model = rep.commissionModel || 'volume_rate'

  if (model === 'volume_rate') {
    const rawStepAmount = Number(rep.stepAmount ?? rep.commissionConfig?.volumeRate?.stepAmount)
    const stepAmount = rawStepAmount > 0 ? rawStepAmount : 1000
    const stepRate = Number(rep.stepRate ?? rep.commissionConfig?.volumeRate?.stepRate) || 50
    const isProportional = Boolean(rep.isProportional || rep.commissionConfig?.volumeRate?.proportional)
    let steps = 0
    if (totalSales > 0) {
      steps = isProportional ? (totalSales / stepAmount) : Math.floor(totalSales / stepAmount)
    }
    totalCommission = steps * stepRate
    breakdown.push({
      type: 'volume_rate',
      salesVolume: totalSales,
      stepAmount,
      stepRate,
      steps,
      commission: totalCommission,
    })
  } else if (model === 'category_percentage') {
    const rawCategoryRates = rep.categoryRates || rep.commissionConfig?.categoryRates || {
      'لحوم': 0.02,
      'مصنعات': 0.035,
      'مجزءات': 0.025,
      'دواجن': 0.02,
      'أسماك': 0.02,
      'خامات': 0.015,
      'default': 0.02,
    }

    sales.forEach((sale) => {
      const items = sale.items || []
      if (items.length === 0 && Number(sale.total) > 0) {
        const rate = normalizeRate(rawCategoryRates['default'] ?? 0.02)
        const comm = Number(sale.total) * rate
        totalCommission += comm
        breakdown.push({
          category: 'default',
          amount: Number(sale.total),
          rate,
          commission: comm,
        })
      } else {
        items.forEach((item) => {
          const cat = item.category || 'default'
          const rate = normalizeRate(rawCategoryRates[cat] ?? rawCategoryRates['default'] ?? 0.02)
          const itemTotal = Number(item.total) || ((Number(item.quantity) || 0) * (Number(item.unitPrice ?? item.price) || 0))
          const comm = itemTotal * rate
          totalCommission += comm
          breakdown.push({
            itemId: item.itemId,
            category: cat,
            amount: itemTotal,
            rate,
            commission: comm,
          })
        })
      }
    })
  } else if (model === 'target_tier') {
    const attainment = target > 0 ? totalSales / target : 0
    let rate = 0.01
    let bonus = 0

    if (Array.isArray(rep.tiers) && rep.tiers.length > 0) {
      const sortedTiers = [...rep.tiers].sort((a, b) => (Number(b.minAttainment) || 0) - (Number(a.minAttainment) || 0))
      const matched = sortedTiers.find((t) => attainment >= (Number(t.minAttainment) || 0))
      if (matched) {
        rate = normalizeRate(matched.rate)
        bonus = Number(matched.bonus) || 0
      }
    } else {
      if (attainment >= 1.0) {
        rate = 0.025
        bonus = Number(rep.tierBonus ?? rep.commissionConfig?.targetTier?.bonus ?? 500)
      } else if (attainment >= 0.8) {
        rate = 0.018
      }
    }

    totalCommission = Math.round((totalSales * rate + bonus) * 100) / 100
    breakdown.push({
      type: 'target_tier',
      totalSales,
      target,
      attainmentPct: Math.round(attainment * 100),
      appliedRate: rate,
      bonus,
      commission: totalCommission,
    })
  } else if (model === 'hybrid') {
    const rawBaseRate = rep.baseRate ?? rep.commissionConfig?.baseRate ?? 0.02
    const baseRate = normalizeRate(rawBaseRate)
    const baseComm = totalSales * baseRate
    const attainment = target > 0 ? totalSales / target : 0
    const tierBonus = attainment >= 1.0 ? 1000 : (attainment >= 0.8 ? 400 : 0)
    totalCommission = baseComm + tierBonus
    breakdown.push({
      type: 'hybrid',
      totalSales,
      baseRate,
      baseComm,
      tierBonus,
      commission: totalCommission,
    })
  }

  return { totalCommission, totalSales, breakdown }
}

export function computeRepLedgerBalance(openingBalance = 0, transactions = []) {
  let running = Number(openingBalance) || 0
  const history = []
  const sorted = [...transactions].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))

  sorted.forEach((tx) => {
    const amt = Number(tx.amount) || 0
    if (tx.type === 'commission' || tx.type === 'bonus') {
      running += amt
    } else if (tx.type === 'payment' || tx.type === 'disbursement' || tx.type === 'clawback' || tx.type === 'deduction' || tx.type === 'penalty') {
      running -= amt
    }
    history.push({ ...tx, runningBalance: running })
  })

  return { netBalance: running, history }
}

export function computeSalesTargetProgress(salesReps = [], periodSales = 0) {
  const totalTarget = salesReps.reduce((sum, r) => {
    return sum + (Number(r.salesTarget ?? r.targetAmount) || 0)
  }, 0)

  const achievementPct = totalTarget > 0 ? Math.round((periodSales / totalTarget) * 100) : 0
  const remainingTarget = Math.max(0, totalTarget - periodSales)

  return { totalTarget, periodSales, achievementPct, remainingTarget }
}
