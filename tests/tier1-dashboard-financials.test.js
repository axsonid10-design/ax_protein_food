import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Tier 1: Dashboard Financial Summary Metrics (F19)', () => {
  // Pure aggregation functions matching explorer_survey_3 §1.5
  function computeCustomerReceivables(clients = []) {
    let total = 0
    let count = 0
    clients.forEach((c) => {
      const bal = Number(c.balance) || 0
      if (bal > 0) {
        total += bal
        count++
      }
    })
    return { totalReceivables: total, indebtedCount: count }
  }

  function computeSupplierPayables(suppliers = []) {
    let total = 0
    let count = 0
    suppliers.forEach((s) => {
      const bal = Number(s.balance) || 0
      if (bal > 0) {
        total += bal
        count++
      }
    })
    return { totalPayables: total, creditorCount: count }
  }

  function computeSalesRepsBalances(salesReps = []) {
    let total = 0
    let count = 0
    salesReps.forEach((r) => {
      const bal = Number(r.netBalance ?? r.currentBalance ?? r.balance) || 0
      if (bal > 0) {
        total += bal
        count++
      }
    })
    return { totalRepPayables: total, creditorRepCount: count }
  }

  function computeSalesTargetProgress(salesReps = [], periodSales = 0) {
    const totalTarget = salesReps.reduce((sum, r) => {
      return sum + (Number(r.salesTarget ?? r.targetAmount) || 0)
    }, 0)

    const achievementPct = totalTarget > 0 ? Math.round((periodSales / totalTarget) * 100) : 0
    const remainingTarget = Math.max(0, totalTarget - periodSales)

    return { totalTarget, periodSales, achievementPct, remainingTarget }
  }

  it('should aggregate total customer receivables strictly from positive balances (لنا عند العملاء)', () => {
    const clients = [
      { id: 'c1', name: 'عميل أ', balance: 12000 },  // owes 12,000 (+)
      { id: 'c2', name: 'عميل ب', balance: 25000 },  // owes 25,000 (+)
      { id: 'c3', name: 'عميل ج', balance: -5000 },  // credit deposit 5,000 (advance) -> should NOT add to receivables
      { id: 'c4', name: 'عميل د', balance: 0 }       // zero balance
    ]

    const { totalReceivables, indebtedCount } = computeCustomerReceivables(clients)
    assert.strictEqual(totalReceivables, 37000, '12000 + 25000 = 37000')
    assert.strictEqual(indebtedCount, 2)
  })

  it('should aggregate total supplier liabilities strictly from positive balances (علينا للموردين)', () => {
    const suppliers = [
      { id: 's1', companyName: 'مورد أ', balance: 80000 },   // company owes 80,000 (+)
      { id: 's2', companyName: 'مورد ب', balance: 140000 },  // company owes 140,000 (+)
      { id: 's3', companyName: 'مورد ج', balance: -20000 },  // advance paid to supplier (-)
      { id: 's4', companyName: 'مورد د', balance: 0 }
    ]

    const { totalPayables, creditorCount } = computeSupplierPayables(suppliers)
    assert.strictEqual(totalPayables, 220000, '80000 + 140000 = 220000')
    assert.strictEqual(creditorCount, 2)
  })

  it('should aggregate total sales representatives net commissions payable', () => {
    const salesReps = [
      { id: 'r1', name: 'مندوب أ', netBalance: 4500 },
      { id: 'r2', name: 'مندوب ب', netBalance: 6200 },
      { id: 'r3', name: 'مندوب ج', netBalance: 0 }
    ]

    const { totalRepPayables, creditorRepCount } = computeSalesRepsBalances(salesReps)
    assert.strictEqual(totalRepPayables, 10700, '4500 + 6200 = 10700')
    assert.strictEqual(creditorRepCount, 2)
  })

  it('should compute overall sales target achievement percentage and remaining target amount', () => {
    const salesReps = [
      { id: 'r1', targetAmount: 150000 },
      { id: 'r2', targetAmount: 250000 },
      { id: 'r3', targetAmount: 100000 }
    ] // Total Target = 500,000 EGP

    const periodSales = 375000 // 375,000 / 500,000 = 75%
    const progress = computeSalesTargetProgress(salesReps, periodSales)

    assert.strictEqual(progress.totalTarget, 500000)
    assert.strictEqual(progress.achievementPct, 75)
    assert.strictEqual(progress.remainingTarget, 125000)
  })

  it('should safely return zero achievement when total sales target is zero', () => {
    const salesReps = [
      { id: 'r1', targetAmount: 0 },
      { id: 'r2', targetAmount: 0 }
    ]
    const progress = computeSalesTargetProgress(salesReps, 50000)

    assert.strictEqual(progress.totalTarget, 0)
    assert.strictEqual(progress.achievementPct, 0)
    assert.strictEqual(progress.remainingTarget, 0)
  })

  it('should produce zeroed metrics cleanly when dataset arrays are empty', () => {
    const rec = computeCustomerReceivables([])
    const pay = computeSupplierPayables([])
    const rep = computeSalesRepsBalances([])
    const trg = computeSalesTargetProgress([], 0)

    assert.strictEqual(rec.totalReceivables, 0)
    assert.strictEqual(rec.indebtedCount, 0)
    assert.strictEqual(pay.totalPayables, 0)
    assert.strictEqual(pay.creditorCount, 0)
    assert.strictEqual(rep.totalRepPayables, 0)
    assert.strictEqual(trg.achievementPct, 0)
  })
})
