export function calculateEmployeeDailyRate(emp) {
  if (!emp) return 0
  const salaryType = emp.salaryType || emp.salary_type || 'monthly'
  if (salaryType === 'daily') {
    return Number(emp.dailyRate ?? emp.daily_rate ?? 0)
  }
  const baseSalary = Number(emp.baseSalary ?? emp.base_salary ?? 0)
  return Math.round((baseSalary / 30) * 100) / 100
}

export function computeMonthlyPayrollStats(employee, attendanceRecords = [], cashTransactions = [], yearMonth = '') {
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
      advancesPaid: 0,
      netPayable: 0,
    }
  }

  const empId = employee.id
  const empRecords = attendanceRecords.filter((a) => {
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
  let deductionAmount = 0
  const totalDeductionDays = unexcusedDays + (halfDays * 0.5)

  if (salaryType === 'monthly') {
    deductionAmount = Math.round(totalDeductionDays * dailyRate * 100) / 100
    earnedSalary = Math.max(0, Math.round((baseSalary - deductionAmount) * 100) / 100)
  } else {
    const workedUnits = presentDays + (halfDays * 0.5) + excusedDays + holidays
    earnedSalary = Math.round(workedUnits * dailyRate * 100) / 100
    deductionAmount = Math.round(totalDeductionDays * dailyRate * 100) / 100
  }

  const advancesPaid = (cashTransactions || []).filter((tx) => {
    const isEmp = tx.partyType === 'employee' || tx.party_type === 'employee'
    const matchesId = (tx.partyId || tx.party_id) === empId || (tx.partyName || tx.party_name) === employee.name
    const txDate = tx.date || ''
    const matchesMonth = !yearMonth || txDate.startsWith(yearMonth)
    return isEmp && matchesId && matchesMonth
  }).reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)

  const netPayable = Math.round((earnedSalary - advancesPaid) * 100) / 100

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
    deductionAmount,
    advancesPaid,
    netPayable,
  }
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
    if (rec) {
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
        dailyEarned: Number(rec.daily_earned ?? rec.dailyEarned ?? dailyRate),
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
