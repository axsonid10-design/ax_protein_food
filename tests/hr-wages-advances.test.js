import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import {
  calculateEmployeeDailyRate,
  computeMonthlyPayrollStats,
  calculateEmployeeWage,
  executeEmployeePeriodSettlement,
  getInitialAttendanceForDate,
  computeEmployeeCarriedBalance,
  saveStoredEmployeeDeduction,
  getStoredEmployeeDeductions,
  deleteStoredEmployeeDeduction,
  saveStoredPayrollSettlement,
  getStoredPayrollSettlements,
} from '../src/store/employeeHelpers.js'
import {
  initialExpenseCategories,
  expenseCategoryHelpers,
} from '../src/store/expenseCategoryHelpers.js'

describe('HR Wage Calculations, Daily Workers & Absence Invariants (R5)', () => {
  const dailyWorker = {
    id: 'emp-daily-1',
    name: 'محمود عبد الفتاح',
    salaryType: 'daily',
    dailyRate: 200,
    department: 'التشغيل والتعبئة',
  }

  const monthlyWorker = {
    id: 'emp-monthly-1',
    name: 'أحمد صبري',
    salaryType: 'monthly',
    baseSalary: 6000,
    department: 'المخازن المركزية',
  }

  it('calculates daily rate correctly for both daily and monthly workers', () => {
    assert.strictEqual(calculateEmployeeDailyRate(dailyWorker), 200)
    assert.strictEqual(calculateEmployeeDailyRate(monthlyWorker), 200)
  })

  it('daily worker must not be paid for excused absences or holidays', () => {
    const attendance = [
      { employeeId: 'emp-daily-1', date: '2026-11-01', status: 'present' },
      { employeeId: 'emp-daily-1', date: '2026-11-02', status: 'present' },
      { employeeId: 'emp-daily-1', date: '2026-11-03', status: 'half_day' },
      { employeeId: 'emp-daily-1', date: '2026-11-04', status: 'absent_excused' },
      { employeeId: 'emp-daily-1', date: '2026-11-05', status: 'absent_excused' },
      { employeeId: 'emp-daily-1', date: '2026-11-06', status: 'absent_excused' },
      { employeeId: 'emp-daily-1', date: '2026-11-07', status: 'holiday' },
      { employeeId: 'emp-daily-1', date: '2026-11-08', status: 'holiday' },
      { employeeId: 'emp-daily-1', date: '2026-11-09', status: 'absent_unexcused' },
    ]

    const stats = computeMonthlyPayrollStats(dailyWorker, attendance, [], '2026-11')
    assert.strictEqual(stats.presentDays, 2)
    assert.strictEqual(stats.halfDays, 1)
    assert.strictEqual(stats.excusedDays, 3)
    assert.strictEqual(stats.holidays, 2)
    assert.strictEqual(stats.unexcusedDays, 1)

    const expectedWorkedUnits = 2 + (1 * 0.5)
    assert.strictEqual(stats.earnedSalary, expectedWorkedUnits * 200)
    assert.strictEqual(stats.earnedSalary, 500)

    const contractWage = calculateEmployeeWage(dailyWorker, attendance, '2026-11')
    assert.strictEqual(contractWage.workedDays, 2.5)
    assert.strictEqual(contractWage.earnedWage, 500)
  })

  it('monthly worker calculates earned salary deducting unexcused absences and half days', () => {
    const attendance = [
      { employeeId: 'emp-monthly-1', date: '2026-11-01', status: 'absent_unexcused' },
      { employeeId: 'emp-monthly-1', date: '2026-11-02', status: 'half_day' },
      { employeeId: 'emp-monthly-1', date: '2026-11-03', status: 'absent_excused' },
      { employeeId: 'emp-monthly-1', date: '2026-11-04', status: 'holiday' },
    ]

    const stats = computeMonthlyPayrollStats(monthlyWorker, attendance, [], '2026-11')
    assert.strictEqual(stats.totalDeductionDays, 1.5)
    assert.strictEqual(stats.deductionAmount, 300)
    assert.strictEqual(stats.earnedSalary, 5700)
  })

  it('getInitialAttendanceForDate assigns dailyEarned = 0 for daily workers on excused absence or holiday', () => {
    const existing = [
      { employeeId: 'emp-daily-1', status: 'absent_excused', daily_earned: 0 },
      { employeeId: 'emp-monthly-1', status: 'absent_excused', daily_earned: 200 },
    ]
    const list = getInitialAttendanceForDate([dailyWorker, monthlyWorker], existing, '2026-11-10')
    const dailyRec = list.find((r) => r.employeeId === 'emp-daily-1')
    const monthlyRec = list.find((r) => r.employeeId === 'emp-monthly-1')

    assert.strictEqual(dailyRec.dailyEarned, 0)
    assert.strictEqual(monthlyRec.dailyEarned, 200)
  })
})

describe('Direct Deductions & Disciplinary Penalties (R5)', () => {
  const employee = {
    id: 'emp-penalty-1',
    name: 'سيد رجب',
    salaryType: 'monthly',
    baseSalary: 5000,
  }

  it('integrates direct financial deductions into computeMonthlyPayrollStats', () => {
    const deductions = [
      { id: 'd1', employeeId: 'emp-penalty-1', type: 'financial_penalty', amount: 250, targetMonth: '2026-11' },
      { id: 'd2', employeeId: 'emp-penalty-1', type: 'damage_compensation', amount: 150, targetMonth: '2026-11' },
      { id: 'd3', employeeId: 'emp-penalty-1', type: 'financial_penalty', amount: 500, targetMonth: '2026-12' },
    ]

    const stats = computeMonthlyPayrollStats(employee, [], [], '2026-11', deductions)
    assert.strictEqual(stats.directDeductionAmount, 400)
    assert.strictEqual(stats.totalDeductionAmount, 400)
    assert.strictEqual(stats.netPayable, 4600)
  })

  it('supports storing, retrieving, and deleting direct deductions in storage helpers', () => {
    const record = {
      id: 'test-ded-1',
      employeeId: 'emp-penalty-1',
      type: 'financial_penalty',
      amount: 100,
      date: '2026-11-05',
      targetMonth: '2026-11',
      reason: 'تأخير غير مبرر',
    }

    saveStoredEmployeeDeduction(record)
    const stored = getStoredEmployeeDeductions()
    assert.ok(stored.some((d) => d.id === 'test-ded-1'))

    deleteStoredEmployeeDeduction('test-ded-1')
    const afterDelete = getStoredEmployeeDeductions()
    assert.ok(!afterDelete.some((d) => d.id === 'test-ded-1'))
  })
})

describe('Employee Advances & Negative Balance Support (R6)', () => {
  const employee = {
    id: 'emp-adv-1',
    name: 'كريم حسام',
    salaryType: 'daily',
    dailyRate: 250,
  }

  it('includes dedicated expense category exp-main-adv and 3-tier sub/secondary categories', () => {
    const mainCat = initialExpenseCategories.find((c) => c.id === 'exp-main-adv')
    assert.ok(mainCat, 'exp-main-adv must exist in initialExpenseCategories')
    assert.strictEqual(mainCat.level, 'main')
    assert.strictEqual(mainCat.name, 'سلف وقروض العاملين')
    assert.strictEqual(mainCat.code, 'EXP-ADV')

    const subCats = expenseCategoryHelpers.getSubCategories(initialExpenseCategories, 'exp-main-adv')
    assert.ok(subCats.length >= 2)
    assert.ok(subCats.some((s) => s.id === 'exp-sub-emp-adv'))
    assert.ok(subCats.some((s) => s.id === 'exp-sub-emp-loan'))

    const secCats = expenseCategoryHelpers.getSecondaryCategories(initialExpenseCategories, 'exp-sub-emp-adv')
    assert.ok(secCats.length >= 3)
    assert.ok(secCats.some((s) => s.id === 'exp-sec-adv-factory'))
    assert.ok(secCats.some((s) => s.id === 'exp-sec-adv-drivers'))
  })

  it('allows advance amounts exceeding accrued balance resulting in a negative balance', () => {
    const attendance = [
      { employeeId: 'emp-adv-1', date: '2026-11-01', status: 'present' },
      { employeeId: 'emp-adv-1', date: '2026-11-02', status: 'present' },
    ]
    const transactions = [
      { partyId: 'emp-adv-1', partyType: 'employee', type: 'payroll', subType: 'advance', amount: 1200, date: '2026-11-03' },
    ]

    const stats = computeMonthlyPayrollStats(employee, attendance, transactions, '2026-11')
    assert.strictEqual(stats.earnedSalary, 500)
    assert.strictEqual(stats.advancesPaid, 1200)
    assert.strictEqual(stats.netPayable, -700)
  })
})

describe('Period Wage Settlement & Balance Carry-Forward (R6)', () => {
  const employee = {
    id: 'emp-settle-1',
    name: 'جمال توفيق',
    salaryType: 'monthly',
    baseSalary: 7000,
  }

  it('settles a period, clears it, and prevents double-counting while preserving carry-forward', async () => {
    const attendanceOct = [
      { employeeId: 'emp-settle-1', date: '2026-10-05', status: 'absent_unexcused' },
    ]
    const txOct = [
      { partyId: 'emp-settle-1', partyType: 'employee', type: 'payroll', amount: 1500, date: '2026-10-15' },
    ]

    const statsOct = computeMonthlyPayrollStats(employee, attendanceOct, txOct, '2026-10')
    const dailyRate = Math.round((7000 / 30) * 100) / 100
    const expectedDeductions = dailyRate
    const expectedEarned = Math.round((7000 - expectedDeductions) * 100) / 100
    const expectedNet = Math.round((expectedEarned - 1500) * 100) / 100

    assert.strictEqual(statsOct.earnedSalary, expectedEarned)
    assert.strictEqual(statsOct.netPayable, expectedNet)

    const settlementRes = await executeEmployeePeriodSettlement({
      employeeId: employee.id,
      employeeName: employee.name,
      settlementPeriod: '2026-10',
      grossWage: statsOct.earnedSalary,
      deductions: statsOct.totalDeductionAmount,
      advancesCleared: statsOct.advancesPaid,
      priorCarriedBalance: 0,
      netPayable: statsOct.netPayable,
      netPaidAmount: statsOct.netPayable,
      settlementDate: '2026-10-31',
    })

    assert.strictEqual(settlementRes.success, true)
    assert.strictEqual(settlementRes.settlementRecord.closingBalance, 0)
    assert.strictEqual(settlementRes.settlementRecord.status, 'settled')

    const settlements = [settlementRes.settlementRecord]
    const carriedBal = computeEmployeeCarriedBalance(employee.id, '2026-11', settlements)
    assert.strictEqual(carriedBal, 0)

    const statsNov = computeMonthlyPayrollStats(employee, [], [], '2026-11', [], settlements)
    assert.strictEqual(statsNov.earnedSalary, 7000)
    assert.strictEqual(statsNov.advancesPaid, 0)
    assert.strictEqual(statsNov.priorCarriedBalance, 0)
    assert.strictEqual(statsNov.netPayable, 7000)
  })

  it('carries forward residual balance when period is partially settled', async () => {
    const settlementRecord = {
      id: 'settle_2026-10_emp-partial',
      employeeId: 'emp-partial-1',
      employeeName: 'هاني شاكر',
      yearMonth: '2026-10',
      settlementPeriod: '2026-10',
      settlementDate: '2026-10-31',
      netPayable: 5000,
      netPaidAmount: 3500,
      closingBalance: 1500,
      status: 'settled',
    }

    const carried = computeEmployeeCarriedBalance('emp-partial-1', '2026-11', [settlementRecord])
    assert.strictEqual(carried, 1500)

    const emp = { id: 'emp-partial-1', name: 'هاني شاكر', salaryType: 'monthly', baseSalary: 4000 }
    const statsNov = computeMonthlyPayrollStats(emp, [], [], '2026-11', [], [settlementRecord])
    assert.strictEqual(statsNov.priorCarriedBalance, 1500)
    assert.strictEqual(statsNov.netPayable, 5500)
  })

  it('carries forward overdrawn negative balance as a debt into next period', async () => {
    const overdrawnSettlement = {
      id: 'settle_2026-10_emp-overdrawn',
      employeeId: 'emp-overdrawn-1',
      employeeName: 'خالد يوسف',
      yearMonth: '2026-10',
      settlementPeriod: '2026-10',
      settlementDate: '2026-10-31',
      netPayable: -800,
      netPaidAmount: 0,
      closingBalance: -800,
      status: 'settled',
    }

    const carried = computeEmployeeCarriedBalance('emp-overdrawn-1', '2026-11', [overdrawnSettlement])
    assert.strictEqual(carried, -800)

    const emp = { id: 'emp-overdrawn-1', name: 'خالد يوسف', salaryType: 'monthly', baseSalary: 5000 }
    const statsNov = computeMonthlyPayrollStats(emp, [], [], '2026-11', [], [overdrawnSettlement])
    assert.strictEqual(statsNov.priorCarriedBalance, -800)
    assert.strictEqual(statsNov.netPayable, 4200)
  })

  it('settlement payouts with subType settlement are never counted as advances against subsequent or current salaries', () => {
    const emp = { id: 'emp-settle-adv-test', name: 'سامح شكري', salaryType: 'monthly', baseSalary: 6000 }
    const txs = [
      { partyId: 'emp-settle-adv-test', partyType: 'employee', type: 'payroll', subType: 'settlement', amount: 5000, date: '2026-11-02' },
      { partyId: 'emp-settle-adv-test', partyType: 'employee', type: 'payroll', subType: 'advance', amount: 1000, date: '2026-11-05' },
    ]
    const stats = computeMonthlyPayrollStats(emp, [], txs, '2026-11')
    assert.strictEqual(stats.advancesPaid, 1000)
    assert.strictEqual(stats.netPayable, 5000)
  })

  it('AX_EmployeeSettlementModal executes period settlements and records closing balances', async () => {
    const res = await executeEmployeePeriodSettlement({
      employeeId: 'emp-modal-test',
      employeeName: 'حسام حسن',
      settlementPeriod: '2026-11',
      grossWage: 5000,
      deductions: 500,
      advancesCleared: 500,
      priorCarriedBalance: 0,
      netPayable: 4000,
      netPaidAmount: 3000,
      settlementDate: '2026-11-30',
    })
    assert.strictEqual(res.success, true)
    assert.strictEqual(res.settlementRecord.closingBalance, 1000)
    assert.strictEqual(res.settlementRecord.status, 'settled')
  })
})

describe('Hold-to-Delete, Navigation & Mobile Layout Invariants (R4, R5)', () => {
  const managerFile = path.resolve(process.cwd(), 'src/components/employees/AX_EmployeesManager.jsx')
  const attendanceFile = path.resolve(process.cwd(), 'src/components/employees/AX_EmployeeAttendanceSheet.jsx')
  const directoryFile = path.resolve(process.cwd(), 'src/components/employees/AX_EmployeesDirectory.jsx')
  const holdButtonFile = path.resolve(process.cwd(), 'src/components/employees/AX_HoldToDeleteButton.jsx')
  const deductionModalFile = path.resolve(process.cwd(), 'src/components/employees/AX_EmployeeDeductionModal.jsx')
  const advanceModalFile = path.resolve(process.cwd(), 'src/components/employees/AX_EmployeeAdvanceModal.jsx')
  const settlementModalFile = path.resolve(process.cwd(), 'src/components/employees/AX_EmployeeSettlementModal.jsx')
  const ledgerFile = path.resolve(process.cwd(), 'src/components/employees/AX_EmployeePayrollLedger.jsx')

  it('AX_EmployeesManager.jsx eliminates marketing subtitle and provides responsive tab bar', () => {
    const content = fs.readFileSync(managerFile, 'utf-8')
    assert.ok(!content.includes('إدارة كادر العمل، تسجيل الحضور'), 'Marketing subtitle bloat must be removed')
    assert.ok(content.includes('overflow-x-auto'), 'Tabs container must allow horizontal overflow scrolling')
    assert.ok(content.includes('bottom-24'), 'Mobile FAB button must be positioned at bottom-24 avoiding navbar collision')
    assert.ok(content.includes('إضافة موظف'), 'Add employee button must be present in header')
  })

  it('AX_EmployeeAttendanceSheet.jsx provides compact 5-column grid and responsive date picker', () => {
    const content = fs.readFileSync(attendanceFile, 'utf-8')
    assert.ok(content.includes('grid-cols-5'), 'Mobile attendance buttons must use 5-column grid')
    assert.ok(content.includes('w-full sm:w-56'), 'Date picker container must be responsive')
    assert.ok(content.includes('shortLabel'), 'Compact short labels must be provided for mobile viewports')
  })

  it('AX_HoldToDeleteButton.jsx implements 2.5s animated SVG countdown timer', () => {
    const content = fs.readFileSync(holdButtonFile, 'utf-8')
    assert.ok(content.includes('durationMs = 2500'), 'Default duration must be 2500ms (2.5s)')
    assert.ok(content.includes('strokeDasharray'), 'Must render circular animated SVG progress')
    assert.ok(content.includes('onPointerDown'), 'Must listen to pointer down events')
    assert.ok(content.includes('onPointerUp'), 'Must cancel on pointer up')
    assert.ok(content.includes('onPointerLeave'), 'Must cancel on pointer leave')
  })

  it('AX_EmployeesDirectory.jsx integrates AX_HoldToDeleteButton and deduction/advance actions', () => {
    const content = fs.readFileSync(directoryFile, 'utf-8')
    assert.ok(content.includes('AX_HoldToDeleteButton'), 'Directory must import and render AX_HoldToDeleteButton')
    assert.ok(content.includes('AX_EmployeeDeductionModal'), 'Directory must integrate AX_EmployeeDeductionModal')
    assert.ok(content.includes('AX_EmployeeAdvanceModal'), 'Directory must integrate AX_EmployeeAdvanceModal')
  })

  it('AX_EmployeePayrollLedger.jsx mounts AX_EmployeeSettlementModal and executes period settlements', () => {
    const content = fs.readFileSync(ledgerFile, 'utf-8')
    assert.ok(content.includes('AX_EmployeeSettlementModal'), 'AX_EmployeePayrollLedger must mount AX_EmployeeSettlementModal')
    assert.ok(content.includes('executeEmployeePeriodSettlement') || content.includes('onConfirmSettlement'), 'Must support executing period settlement')
    assert.ok(!content.includes('selectedEmployeeForPayout'), 'Legacy inline payout modal must be removed')
  })

  it('Deduction, Advance, and Settlement modals do not use native date inputs and mount AX_CompanyDatePicker', () => {
    const files = [
      deductionModalFile,
      advanceModalFile,
      settlementModalFile,
    ]
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8')
      assert.ok(content.includes('AX_CompanyDatePicker'), `${path.basename(f)} must import and mount AX_CompanyDatePicker`)
      assert.ok(!content.includes('type="date"'), `${path.basename(f)} must not use native type="date"`)
    }
  })

  it('all Milestone 3 components and helper files exist, obey 500 lines limit, and have zero comments', () => {
    const files = [
      managerFile,
      attendanceFile,
      directoryFile,
      holdButtonFile,
      deductionModalFile,
      advanceModalFile,
      settlementModalFile,
      ledgerFile,
      path.resolve(process.cwd(), 'src/store/employeeHelpers.js'),
      path.resolve(process.cwd(), 'src/store/expenseCategoryHelpers.js'),
      path.resolve(process.cwd(), 'tests/hr-wages-advances.test.js'),
    ]

    for (const f of files) {
      assert.ok(fs.existsSync(f), `File must exist: ${f}`)
      const content = fs.readFileSync(f, 'utf-8')
      const lines = content.split('\n').length
      assert.ok(lines <= 500, `File ${path.basename(f)} has ${lines} lines, exceeding 500 lines limit!`)

      const codeLines = content.split('\n')
      for (let i = 0; i < codeLines.length; i++) {
        const line = codeLines[i].trim()
        assert.ok(!line.startsWith('//'), `Forbidden comment at ${path.basename(f)} line ${i + 1}`)
        assert.ok(!line.startsWith('/*'), `Forbidden block comment at ${path.basename(f)} line ${i + 1}`)
      }
    }
  })
})
