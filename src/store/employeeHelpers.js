export function calculateEmployeeDailyRate(emp) {
  if (!emp) return 0
  const salaryType = emp.salaryType || emp.salary_type || 'monthly'
  if (salaryType === 'daily') {
    return Number(emp.dailyRate ?? emp.daily_rate ?? 0)
  }
  const baseSalary = Number(emp.baseSalary ?? emp.base_salary ?? 0)
  return Math.round((baseSalary / 30) * 100) / 100
}

let inMemoryDeductions = []
let inMemorySettlements = []

export function getStoredEmployeeDeductions() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      const raw = localStorage.getItem('ax_employee_deductions')
      if (raw) return JSON.parse(raw)
    }
    return inMemoryDeductions
  } catch {
    return inMemoryDeductions
  }
}

export function saveStoredEmployeeDeduction(deduction) {
  try {
    const list = getStoredEmployeeDeductions()
    const next = [deduction, ...list.filter((d) => d && d.id !== deduction.id)]
    inMemoryDeductions = next
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem('ax_employee_deductions', JSON.stringify(next))
    }
    return next
  } catch {
    inMemoryDeductions = [deduction]
    return inMemoryDeductions
  }
}

export function deleteStoredEmployeeDeduction(id) {
  try {
    const list = getStoredEmployeeDeductions()
    const next = list.filter((d) => d && d.id !== id)
    inMemoryDeductions = next
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem('ax_employee_deductions', JSON.stringify(next))
    }
    return next
  } catch {
    return inMemoryDeductions
  }
}

export function getStoredPayrollSettlements() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      const raw = localStorage.getItem('ax_payroll_settlements')
      if (raw) return JSON.parse(raw)
    }
    return inMemorySettlements
  } catch {
    return inMemorySettlements
  }
}

export function saveStoredPayrollSettlement(settlement) {
  try {
    const list = getStoredPayrollSettlements()
    const next = [settlement, ...list.filter((s) => s && s.id !== settlement.id)]
    inMemorySettlements = next
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem('ax_payroll_settlements', JSON.stringify(next))
    }
    return next
  } catch {
    inMemorySettlements = [settlement]
    return inMemorySettlements
  }
}

export function computeEmployeeCarriedBalance(empId, currentMonth = '', settlements = []) {
  if (!empId) return 0
  const empSettlements = (Array.isArray(settlements) ? settlements : getStoredPayrollSettlements())
    .filter((s) => s && (s.employeeId === empId || s.employee_id === empId) && s.status === 'settled')

  if (currentMonth) {
    const pastSettlements = empSettlements
      .filter((s) => (s.yearMonth || s.settlementPeriod) < currentMonth)
      .sort((a, b) => ((b.yearMonth || b.settlementPeriod) || '').localeCompare((a.yearMonth || a.settlementPeriod) || ''))

    if (pastSettlements.length > 0) {
      return Number(pastSettlements[0].closingBalance) || 0
    }
  } else if (empSettlements.length > 0) {
    const sorted = [...empSettlements].sort((a, b) => ((b.yearMonth || b.settlementPeriod) || '').localeCompare((a.yearMonth || a.settlementPeriod) || ''))
    return Number(sorted[0].closingBalance) || 0
  }

  return 0
}

export function computeMonthlyPayrollStats(employee, attendanceRecords = [], cashTransactions = [], yearMonth = '', directDeductions = [], payrollSettlements = []) {
  if (!employee) {
    return {
      presentDays: 0,
      halfDays: 0,
      excusedDays: 0,
      unexcusedDays: 0,
      holidays: 0,
      totalDeductionDays: 0,
      earnedSalary: 0,
      deductionAmount: 0,
      directDeductionAmount: 0,
      totalDeductionAmount: 0,
      advancesPaid: 0,
      priorCarriedBalance: 0,
      netPayable: 0,
      isSettled: false,
      settlementRecord: null,
      closingBalance: 0,
    }
  }

  const empId = employee.id
  const empRecords = (attendanceRecords || []).filter((a) => {
    const aEmpId = a.employeeId || a.employee_id
    const aDate = a.date || ''
    return aEmpId === empId && (!yearMonth || aDate.startsWith(yearMonth))
  })

  let presentDays = 0
  let halfDays = 0
  let excusedDays = 0
  let unexcusedDays = 0
  let holidays = 0

  empRecords.forEach((r) => {
    const st = r.status
    if (st === 'present') presentDays += 1
    else if (st === 'half_day') halfDays += 1
    else if (st === 'absent_excused') excusedDays += 1
    else if (st === 'absent_unexcused') unexcusedDays += 1
    else if (st === 'holiday') holidays += 1
  })

  const salaryType = employee.salaryType || employee.salary_type || 'monthly'
  const baseSalary = Number(employee.baseSalary ?? employee.base_salary ?? 0)
  const dailyRate = calculateEmployeeDailyRate(employee)

  let earnedSalary = 0
  let absenceDeduction = 0
  const totalDeductionDays = unexcusedDays + (halfDays * 0.5)

  if (salaryType === 'monthly') {
    absenceDeduction = Math.round(totalDeductionDays * dailyRate * 100) / 100
    earnedSalary = Math.max(0, Math.round((baseSalary - absenceDeduction) * 100) / 100)
  } else {
    const workedUnits = presentDays + (halfDays * 0.5)
    earnedSalary = Math.round(workedUnits * dailyRate * 100) / 100
    absenceDeduction = Math.round(totalDeductionDays * dailyRate * 100) / 100
  }

  const allDeductions = Array.isArray(directDeductions) && directDeductions.length > 0 ? directDeductions : getStoredEmployeeDeductions()
  const empDirectDeductions = allDeductions.filter((d) => {
    if (!d) return false
    const matchesEmp = d.employeeId === empId || d.employee_id === empId
    const matchesMonth = !yearMonth || d.targetMonth === yearMonth || (d.date && d.date.startsWith(yearMonth))
    return matchesEmp && matchesMonth
  })
  const directDeductionAmount = Math.round(empDirectDeductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) * 100) / 100
  const totalDeductionAmount = Math.round((absenceDeduction + directDeductionAmount) * 100) / 100

  const allSettlements = Array.isArray(payrollSettlements) && payrollSettlements.length > 0 ? payrollSettlements : getStoredPayrollSettlements()
  const settlementRecord = allSettlements.find((s) => {
    if (!s) return false
    const matchesEmp = s.employeeId === empId || s.employee_id === empId
    const matchesMonth = (s.yearMonth || s.settlementPeriod) === yearMonth
    return matchesEmp && matchesMonth && s.status === 'settled'
  }) || null

  const isSettled = Boolean(settlementRecord)

  const advancesPaid = (cashTransactions || []).filter((tx) => {
    if (!tx) return false
    const isEmp = tx.partyType === 'employee' || tx.party_type === 'employee'
    const matchesId = (tx.partyId || tx.party_id) === empId || (tx.partyName || tx.party_name) === employee.name
    const txDate = tx.date || ''
    const matchesMonth = !yearMonth || txDate.startsWith(yearMonth)
    const isSettlement = tx.subType === 'settlement' || tx.type === 'settlement'
    return isEmp && matchesId && matchesMonth && !isSettlement
  }).reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)

  const priorCarriedBalance = computeEmployeeCarriedBalance(empId, yearMonth, allSettlements)

  const netPayable = Math.round((earnedSalary - directDeductionAmount - advancesPaid + priorCarriedBalance) * 100) / 100
  const closingBalance = isSettled ? (Number(settlementRecord.closingBalance) || 0) : netPayable

  return {
    presentDays,
    halfDays,
    excusedDays,
    unexcusedDays,
    holidays,
    totalDeductionDays,
    dailyRate,
    baseSalary,
    earnedSalary,
    deductionAmount: absenceDeduction,
    directDeductionAmount,
    totalDeductionAmount,
    advancesPaid,
    priorCarriedBalance,
    netPayable,
    isSettled,
    settlementRecord,
    closingBalance,
  }
}

export function calculateEmployeeWage(employee, attendanceRecords = [], monthYear = '', settlements = [], cashTransactions = [], deductions = []) {
  const stats = computeMonthlyPayrollStats(employee, attendanceRecords, cashTransactions, monthYear, deductions, settlements)
  return {
    baseSalary: stats.baseSalary,
    dailyRate: stats.dailyRate,
    workedDays: stats.presentDays + (stats.halfDays * 0.5),
    earnedWage: stats.earnedSalary,
    deductionAmount: stats.totalDeductionAmount,
    advancesPaid: stats.advancesPaid,
    netDues: stats.netPayable,
    settledStatus: stats.isSettled,
  }
}

export async function executeEmployeePeriodSettlement(payload = {}) {
  const {
    employeeId,
    employeeName = '',
    settlementPeriod = '',
    grossWage = 0,
    deductions = 0,
    advancesCleared = 0,
    priorCarriedBalance = 0,
    netPayable = 0,
    netPaidAmount = 0,
    treasuryId = null,
    settlementDate = new Date().toISOString().split('T')[0],
    notes = '',
  } = payload

  const closingBalance = Math.round(((Number(netPayable) || 0) - (Number(netPaidAmount) || 0)) * 100) / 100
  const settlementRecord = {
    id: `settle_${settlementPeriod}_${employeeId}`,
    employeeId,
    employeeName,
    yearMonth: settlementPeriod,
    settlementPeriod,
    settlementDate,
    settledAt: new Date().toISOString(),
    grossWage: Number(grossWage) || 0,
    earnedSalary: Number(grossWage) || 0,
    deductions: Number(deductions) || 0,
    advancesCleared: Number(advancesCleared) || 0,
    priorCarriedBalance: Number(priorCarriedBalance) || 0,
    netPayable: Number(netPayable) || 0,
    netPaidAmount: Number(netPaidAmount) || 0,
    amountPaid: Number(netPaidAmount) || 0,
    closingBalance,
    treasuryId,
    status: 'settled',
    notes: notes || `تسوية مسير شهر ${settlementPeriod} للموظف ${employeeName}`,
  }

  saveStoredPayrollSettlement(settlementRecord)
  return { success: true, settlementRecord }
}

export function getInitialAttendanceForDate(employees = [], existingRecords = [], targetDate = '') {
  const map = new Map()
  ;(existingRecords || []).forEach((r) => {
    const empId = r.employeeId || r.employee_id
    if (empId) map.set(empId, r)
  })

  return (employees || []).filter((e) => e.status !== 'inactive').map((emp) => {
    const rec = map.get(emp.id)
    const dailyRate = calculateEmployeeDailyRate(emp)
    const isDaily = (emp.salaryType || emp.salary_type) === 'daily'
    if (rec) {
      let dailyEarned = Number(rec.daily_earned ?? rec.dailyEarned ?? dailyRate)
      if (isDaily && (rec.status === 'absent_excused' || rec.status === 'holiday' || rec.status === 'absent_unexcused')) {
        dailyEarned = 0
      } else if (isDaily && rec.status === 'half_day') {
        dailyEarned = Math.round(dailyRate * 0.5 * 100) / 100
      }
      return {
        id: rec.id || `${targetDate}_${emp.id}`,
        date: targetDate,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        jobTitle: emp.jobTitle || emp.job_title,
        salaryType: emp.salaryType || emp.salary_type,
        dailyRate,
        status: rec.status || 'present',
        deductionDays: Number(rec.deduction_days ?? rec.deductionDays ?? 0),
        dailyEarned,
        notes: rec.notes || '',
      }
    }
    return {
      id: `${targetDate}_${emp.id}`,
      date: targetDate,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      jobTitle: emp.jobTitle || emp.job_title,
      salaryType: emp.salaryType || emp.salary_type,
      dailyRate,
      status: 'present',
      deductionDays: 0,
      dailyEarned: dailyRate,
      notes: '',
    }
  })
}
