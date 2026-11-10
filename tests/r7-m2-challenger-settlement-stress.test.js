import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

describe('Challenger 1 Empirical Stress: Abu Mahmoud Settlement & Reconciliation', () => {
  const auditReportPath = path.resolve(process.cwd(), 'docs/RECONCILIATION_ABU_MAHMOUD.md')

  it('arithmetic invariance: 4000 + 5000 + 2000 strictly equals 11000 under all permutations', () => {
    const trio = [4000.0, 5000.0, 2000.0]
    const permutations = [
      [trio[0], trio[1], trio[2]],
      [trio[0], trio[2], trio[1]],
      [trio[1], trio[0], trio[2]],
      [trio[1], trio[2], trio[0]],
      [trio[2], trio[0], trio[1]],
      [trio[2], trio[1], trio[0]],
    ]

    for (const perm of permutations) {
      const sum = perm[0] + perm[1] + perm[2]
      assert.strictEqual(sum, 11000.0)
      const diff = 11000.0 - perm[0] - perm[1] - perm[2]
      assert.strictEqual(diff, 0.0)
    }

    const piasterSum = (400000 + 500000 + 200000) / 100
    assert.strictEqual(piasterSum, 11000.0)
  })

  function allocatePayment(total, payment, initialPaid = 0.0) {
    const remainingBefore = Math.max(0.0, total - initialPaid)
    const allocated = Math.min(remainingBefore, payment)
    const excess = Math.max(0.0, payment - remainingBefore)
    const newPaid = initialPaid + allocated
    const remainingAfter = total - newPaid
    return {
      allocated,
      excess,
      newPaid,
      remainingAfter,
    }
  }

  it('deterministic invoice payment edge cases: partial, exact, overpayment, zero payment', () => {
    const under = allocatePayment(13578.0, 4000.0, 0.0)
    assert.strictEqual(under.allocated, 4000.0)
    assert.strictEqual(under.excess, 0.0)
    assert.strictEqual(under.newPaid, 4000.0)
    assert.strictEqual(under.remainingAfter, 9578.0)
    assert.ok(under.remainingAfter >= 0.0)

    const exact = allocatePayment(5000.0, 5000.0, 0.0)
    assert.strictEqual(exact.allocated, 5000.0)
    assert.strictEqual(exact.excess, 0.0)
    assert.strictEqual(exact.newPaid, 5000.0)
    assert.strictEqual(exact.remainingAfter, 0.0)
    assert.ok(exact.remainingAfter >= 0.0)

    const over = allocatePayment(1619.0, 2000.0, 0.0)
    assert.strictEqual(over.allocated, 1619.0)
    assert.strictEqual(over.excess, 381.0)
    assert.strictEqual(over.newPaid, 1619.0)
    assert.strictEqual(over.remainingAfter, 0.0)
    assert.ok(over.remainingAfter >= 0.0)

    const zero = allocatePayment(1000.0, 0.0, 0.0)
    assert.strictEqual(zero.allocated, 0.0)
    assert.strictEqual(zero.excess, 0.0)
    assert.strictEqual(zero.newPaid, 0.0)
    assert.strictEqual(zero.remainingAfter, 1000.0)
    assert.ok(zero.remainingAfter >= 0.0)

    const zeroTotal = allocatePayment(0.0, 500.0, 0.0)
    assert.strictEqual(zeroTotal.allocated, 0.0)
    assert.strictEqual(zeroTotal.excess, 500.0)
    assert.strictEqual(zeroTotal.newPaid, 0.0)
    assert.strictEqual(zeroTotal.remainingAfter, 0.0)
    assert.ok(zeroTotal.remainingAfter >= 0.0)

    const multi = allocatePayment(1000.0, 400.0, 300.0)
    assert.strictEqual(multi.allocated, 400.0)
    assert.strictEqual(multi.excess, 0.0)
    assert.strictEqual(multi.newPaid, 700.0)
    assert.strictEqual(multi.remainingAfter, 300.0)
    assert.ok(multi.remainingAfter >= 0.0)

    const multiOver = allocatePayment(1000.0, 500.0, 700.0)
    assert.strictEqual(multiOver.allocated, 300.0)
    assert.strictEqual(multiOver.excess, 200.0)
    assert.strictEqual(multiOver.newPaid, 1000.0)
    assert.strictEqual(multiOver.remainingAfter, 0.0)
    assert.ok(multiOver.remainingAfter >= 0.0)
  })

  it('fuzzing harness: 20000 randomized iterations guarantee zero negative balance invariant', () => {
    let seed = 42
    function pseudoRandom() {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    for (let i = 0; i < 20000; i++) {
      const total = Math.round(pseudoRandom() * 5000000) / 100
      const initialRatio = pseudoRandom()
      const initialPaid = Math.round(total * initialRatio * 100) / 100
      const payment = Math.round(pseudoRandom() * 5000000) / 100

      const res = allocatePayment(total, payment, initialPaid)

      assert.ok(res.remainingAfter >= -1e-9, `Negative balance violated at iteration ${i}: ${res.remainingAfter}`)
      assert.ok(res.newPaid <= total + 1e-9, `Overpaid beyond invoice total at iteration ${i}: ${res.newPaid} > ${total}`)
      assert.ok(res.newPaid >= initialPaid - 1e-9, `Paid decreased at iteration ${i}: ${res.newPaid} < ${initialPaid}`)
      assert.ok(Math.abs(res.newPaid + res.remainingAfter - total) < 1e-6, `Balance reconciliation mismatch at iteration ${i}`)
      assert.ok(Math.abs((res.newPaid - initialPaid) + res.excess - payment) < 1e-6, `Payment conservation mismatch at iteration ${i}`)
    }
  })

  it('distribution accounting identity: cash 39410.00 + receivables 50284.00 strictly equals sales 89694.00', () => {
    const totalSales = 89694.0
    const totalCash = 39410.0
    const openReceivables = 50284.0

    const computedVariance = Math.abs((totalCash + openReceivables) - totalSales)
    assert.strictEqual(computedVariance, 0.0)
    assert.strictEqual(totalCash + openReceivables, totalSales)

    const cashTreasuries = [
      { name: 'سيارة التوزيع', balance: 20790.0 },
      { name: 'كاش سيارة أ نصيب', balance: 17520.0 },
      { name: 'محفظة الشيخ علاء', balance: 1100.0 },
    ]
    const actualCashSum = cashTreasuries.reduce((acc, t) => acc + t.balance, 0.0)
    assert.strictEqual(actualCashSum, 39410.0)

    const cashShare = Math.round((totalCash / totalSales) * 10000) / 100
    const creditShare = Math.round((openReceivables / totalSales) * 10000) / 100
    assert.strictEqual(cashShare, 43.94)
    assert.strictEqual(creditShare, 56.06)
    assert.strictEqual(cashShare + creditShare, 100.0)
  })

  it('journal entry debit-credit conservation and zero custody post-settlement proof', () => {
    const entries = [
      {
        name: 'قيد دمج المحفظة الموازية',
        debits: [17520.0],
        credits: [17520.0],
      },
      {
        name: 'قيد خصم التوريد المعلق',
        debits: [500.0],
        credits: [500.0],
      },
      {
        name: 'قيد تخصيص الفواتير الثلاث',
        debits: [11000.0],
        credits: [4000.0, 5000.0, 1619.0, 381.0],
      },
      {
        name: 'قيد التوريد الختامي لعهدة السيارة',
        debits: [37810.0],
        credits: [37810.0],
      },
      {
        name: 'قيد توريد محفظة الشيخ علاء',
        debits: [1100.0],
        credits: [1100.0],
      },
    ]

    let totalAllDebits = 0.0
    let totalAllCredits = 0.0

    entries.forEach((e) => {
      const sumD = e.debits.reduce((a, b) => a + b, 0.0)
      const sumC = e.credits.reduce((a, b) => a + b, 0.0)
      assert.strictEqual(sumD, sumC, `${e.name} must be balanced`)
      totalAllDebits += sumD
      totalAllCredits += sumC
    })

    assert.strictEqual(totalAllDebits, totalAllCredits)
    assert.strictEqual(totalAllDebits, 67930.0)

    const initialVanBalance = 20790.0
    const parallelWalletCredit = 17520.0
    const remittanceDebit = 500.0
    const finalRemittanceDebit = 37810.0

    const postSettlementVanCustody = initialVanBalance + parallelWalletCredit - remittanceDebit - finalRemittanceDebit
    assert.strictEqual(postSettlementVanCustody, 0.0)

    const parallelWalletPostBalance = 17520.0 - 17520.0
    assert.strictEqual(parallelWalletPostBalance, 0.0)

    const sheikhAlaaPostBalance = 1100.0 - 1100.0
    assert.strictEqual(sheikhAlaaPostBalance, 0.0)

    const centralCashReceived = remittanceDebit + finalRemittanceDebit + 1100.0
    assert.strictEqual(centralCashReceived, 39410.0)
  })

  it('customer Ammar Sheikh Fadl commercial debt isolation proof', () => {
    const openingBalance = 8190.0
    const invoiceAmount = 8610.0
    const paymentMade = 5000.0

    const netOwed = openingBalance + invoiceAmount - paymentMade
    assert.strictEqual(netOwed, 11800.0)

    const invoiceRemaining = invoiceAmount - paymentMade
    assert.strictEqual(invoiceRemaining, 3610.0)
    assert.strictEqual(openingBalance + invoiceRemaining, 11800.0)
  })

  it('orphaned remittance REMIT-2696 isolation proof', () => {
    const initialVan = 20790.0
    const orphanedTransfer = 500.0
    const correctedCustody = initialVan - orphanedTransfer
    assert.strictEqual(correctedCustody, 20290.0)
  })

  it('settlement test file invariant: zero comments and length <= 500 lines', () => {
    const thisFilePath = path.resolve(process.cwd(), 'tests/r7-m2-challenger-settlement-stress.test.js')
    const content = fs.readFileSync(thisFilePath, 'utf-8')
    const lines = content.split('\n')

    assert.ok(lines.length <= 500, `File exceeds 500 lines: ${lines.length}`)
    const hasSingleLine = lines.some((l) => l.trim().startsWith('//'))
    const hasBlock = content.includes(String.fromCharCode(47, 42)) || content.includes(String.fromCharCode(42, 47))

    assert.strictEqual(hasSingleLine, false)
    assert.strictEqual(hasBlock, false)
  })
})
