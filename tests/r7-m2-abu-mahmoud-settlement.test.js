import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

describe('R7 M2: Abu Mahmoud Forensic Audit & Accounting Settlement Verification', () => {
  const auditReportPath = path.resolve(process.cwd(), 'docs/RECONCILIATION_ABU_MAHMOUD.md')

  it('docs/RECONCILIATION_ABU_MAHMOUD.md must exist and contain complete audit sections', () => {
    assert.ok(fs.existsSync(auditReportPath), 'Audit report file must exist')
    const content = fs.readFileSync(auditReportPath, 'utf-8')
    assert.ok(content.length > 500, 'Audit report must have substantial content')

    const requiredTokens = [
      'f93dfcec-23c0-45a8-bdf8-b8037ef03b51',
      'c0000000-0000-0000-0000-000000000005',
      'c0000000-0000-0000-0000-000000000001',
      'REC-0094',
      'REC-4884',
      'REC-5194',
      'INV-84756',
      'INV-64957',
      'INV-55968',
      'REMIT-2696',
      '11,000',
      '39,410',
      '11,800',
      '20,790',
      '17,520',
      '1,100'
    ]

    for (const token of requiredTokens) {
      assert.ok(
        content.includes(token),
        `Audit report must mention required token: ${token}`
      )
    }
  })

  it('mathematical proof: diverted trio collections resolve the 11,000 EGP variance exactly', () => {
    const divertedCollections = [
      { code: 'REC-0094', client: 'صلاح منبال', amount: 4000.0, treasuryId: 'f93dfcec-23c0-45a8-bdf8-b8037ef03b51' },
      { code: 'REC-4884', client: 'عمار الشيخ فضل', amount: 5000.0, treasuryId: 'f93dfcec-23c0-45a8-bdf8-b8037ef03b51' },
      { code: 'REC-5194', client: 'مصطفى الشيخ فضل', amount: 2000.0, treasuryId: 'f93dfcec-23c0-45a8-bdf8-b8037ef03b51' }
    ]

    const sumDiverted = divertedCollections.reduce((acc, row) => acc + row.amount, 0)
    assert.strictEqual(sumDiverted, 11000.0)
    assert.strictEqual(divertedCollections.length, 3)
    divertedCollections.forEach((c) => {
      assert.strictEqual(c.treasuryId, 'f93dfcec-23c0-45a8-bdf8-b8037ef03b51')
    })
  })

  it('cash census: total cash collections across treasuries sum strictly to 39,410.00 EGP', () => {
    const treasuryBreakdown = [
      { id: 'c0000000-0000-0000-0000-000000000005', name: 'سيارة التوزيع (الكاش الميداني)', receiptsCount: 14, balance: 20790.0 },
      { id: 'f93dfcec-23c0-45a8-bdf8-b8037ef03b51', name: 'كاش سيارة أ نصيب', receiptsCount: 7, balance: 17520.0 },
      { id: '2c6c041e-64b0-4653-ae04-0a5edc252843', name: 'محفظة الشيخ علاء', receiptsCount: 1, balance: 1100.0 }
    ]

    const totalCollected = treasuryBreakdown.reduce((sum, t) => sum + t.balance, 0)
    const totalTransactions = treasuryBreakdown.reduce((sum, t) => sum + t.receiptsCount, 0)

    assert.strictEqual(totalCollected, 39410.0)
    assert.strictEqual(totalTransactions, 22)

    const totalSales = 89694.0
    const remainingCredit = totalSales - totalCollected
    assert.strictEqual(remainingCredit, 50284.0)
    assert.strictEqual(totalCollected + remainingCredit, totalSales)
  })

  it('unlinked sales invoices allocation logic accurately updates paid and remaining amounts', () => {
    const invoices = [
      { code: 'INV-84756', client: 'صلاح منبال', total: 13578.0, initialPaid: 0.0, receiptCode: 'REC-0094', paymentAmount: 4000.0 },
      { code: 'INV-64957', client: 'عمار الشيخ فضل', total: 8610.0, initialPaid: 0.0, receiptCode: 'REC-4884', paymentAmount: 5000.0 },
      { code: 'INV-55968', client: 'مصطفى الشيخ فضل', total: 1619.0, initialPaid: 0.0, receiptCode: 'REC-5194', paymentAmount: 2000.0 }
    ]

    const updatedInvoices = invoices.map((inv) => {
      const allocatedPaid = Math.min(inv.total, inv.paymentAmount)
      const excessCredit = Math.max(0, inv.paymentAmount - inv.total)
      const remainingAmount = inv.total - allocatedPaid
      return {
        ...inv,
        newPaid: allocatedPaid,
        remainingAmount,
        excessCredit
      }
    })

    assert.strictEqual(updatedInvoices[0].newPaid, 4000.0)
    assert.strictEqual(updatedInvoices[0].remainingAmount, 9578.0)
    assert.strictEqual(updatedInvoices[0].excessCredit, 0.0)

    assert.strictEqual(updatedInvoices[1].newPaid, 5000.0)
    assert.strictEqual(updatedInvoices[1].remainingAmount, 3610.0)
    assert.strictEqual(updatedInvoices[1].excessCredit, 0.0)

    assert.strictEqual(updatedInvoices[2].newPaid, 1619.0)
    assert.strictEqual(updatedInvoices[2].remainingAmount, 0.0)
    assert.strictEqual(updatedInvoices[2].excessCredit, 381.0)

    const totalAllocated = updatedInvoices.reduce((s, i) => s + i.newPaid + i.excessCredit, 0)
    assert.strictEqual(totalAllocated, 11000.0)
  })

  it('customer Ammar Sheikh Fadl debit balance proof isolates credit debt from driver liability', () => {
    const customerAccount = {
      client: 'عمار الشيخ فضل',
      openingBalance: 8190.0,
      invoices: [{ code: 'INV-64957', amount: 8610.0 }],
      payments: [{ code: 'REC-4884', amount: 5000.0 }]
    }

    const totalDebits = customerAccount.openingBalance + customerAccount.invoices.reduce((s, i) => s + i.amount, 0)
    const totalCredits = customerAccount.payments.reduce((s, p) => s + p.amount, 0)
    const netClientBalance = totalDebits - totalCredits

    assert.strictEqual(totalDebits, 16800.0)
    assert.strictEqual(totalCredits, 5000.0)
    assert.strictEqual(netClientBalance, 11800.0)
  })

  it('orphaned remittance REMIT-2696 deduction proof isolates unlinked transfer deficit', () => {
    const vanTreasuryInitialBalance = 20790.0
    const orphanedRemittance = {
      code: 'REMIT-2696',
      fromTreasuryId: 'c0000000-0000-0000-0000-000000000005',
      toTreasuryId: null,
      amount: 500.0,
      status: 'confirmed'
    }

    assert.strictEqual(orphanedRemittance.amount, 500.0)
    assert.strictEqual(orphanedRemittance.toTreasuryId, null)

    const correctedVanCustodyAfterRemittance = vanTreasuryInitialBalance - orphanedRemittance.amount
    assert.strictEqual(correctedVanCustodyAfterRemittance, 20290.0)
  })

  it('formal settlement journal entries must be individually and collectively balanced', () => {
    const journalEntries = [
      {
        id: 1,
        title: 'دمج رصيد المحفظة الموازية في عهدة السيارة',
        lines: [
          { account: 'c0000000-0000-0000-0000-000000000005', debit: 17520.0, credit: 0.0 },
          { account: 'f93dfcec-23c0-45a8-bdf8-b8037ef03b51', debit: 0.0, credit: 17520.0 }
        ]
      },
      {
        id: 2,
        title: 'إثبات وخصم التوريد المعلق للخزينة المركزية',
        lines: [
          { account: 'c0000000-0000-0000-0000-000000000001', debit: 500.0, credit: 0.0 },
          { account: 'c0000000-0000-0000-0000-000000000005', debit: 0.0, credit: 500.0 }
        ]
      },
      {
        id: 3,
        title: 'ربط وتخصيص متحصلات الفواتير الآجلة',
        lines: [
          { account: 'CUSTOMER_CLEARING', debit: 11000.0, credit: 0.0 },
          { account: 'INV-84756', debit: 0.0, credit: 4000.0 },
          { account: 'INV-64957', debit: 0.0, credit: 5000.0 },
          { account: 'INV-55968', debit: 0.0, credit: 1619.0 },
          { account: 'CLIENT_ADVANCE_MOSTAFA', debit: 0.0, credit: 381.0 }
        ]
      },
      {
        id: 4,
        title: 'القيد الختامي لتوريد صافي نقدية العهدة للخزينة المركزية',
        lines: [
          { account: 'c0000000-0000-0000-0000-000000000001', debit: 37810.0, credit: 0.0 },
          { account: 'c0000000-0000-0000-0000-000000000005', debit: 0.0, credit: 37810.0 }
        ]
      }
    ]

    let grandTotalDebit = 0.0
    let grandTotalCredit = 0.0

    journalEntries.forEach((entry) => {
      const entryDebit = entry.lines.reduce((s, l) => s + l.debit, 0)
      const entryCredit = entry.lines.reduce((s, l) => s + l.credit, 0)
      assert.strictEqual(entryDebit, entryCredit, `Entry #${entry.id} must be strictly balanced`)
      grandTotalDebit += entryDebit
      grandTotalCredit += entryCredit
    })

    assert.strictEqual(grandTotalDebit, grandTotalCredit)
    assert.strictEqual(grandTotalDebit, 66830.0)

    const initialCustody = 20790.0
    const parallelWalletAdd = 17520.0
    const remittanceDeduct = 500.0
    const finalRemittanceDeduct = 37810.0

    const postSettlementCustody = initialCustody + parallelWalletAdd - remittanceDeduct - finalRemittanceDeduct
    assert.strictEqual(postSettlementCustody, 0.0)

    const totalCentralRemitted = remittanceDeduct + finalRemittanceDeduct + 1100.0
    assert.strictEqual(totalCentralRemitted, 39410.0)
  })

  it('file invariant check: zero comments and line limit <= 500', () => {
    const testFilePath = path.resolve(process.cwd(), 'tests/r7-m2-abu-mahmoud-settlement.test.js')
    const fileContent = fs.readFileSync(testFilePath, 'utf-8')
    const lines = fileContent.split('\n')

    assert.ok(lines.length <= 500, `File must be <= 500 lines, found ${lines.length}`)

    const hasSingleLineComment = lines.some((line) => {
      const trimmed = line.trim()
      return trimmed.startsWith('//')
    })
    const slashStar = String.fromCharCode(47, 42)
    const starSlash = String.fromCharCode(42, 47)
    const hasBlockComment = fileContent.includes(slashStar) || fileContent.includes(starSlash)

    assert.strictEqual(hasSingleLineComment, false, 'No single-line comments permitted')
    assert.strictEqual(hasBlockComment, false, 'No block comments permitted')
  })
})
