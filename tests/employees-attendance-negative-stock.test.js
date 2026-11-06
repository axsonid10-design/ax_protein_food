import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  calculateEmployeeDailyRate,
  computeMonthlyPayrollStats,
  getInitialAttendanceForDate,
} from '../src/store/employeeHelpers.js'
import { calculateTransferStockMovement } from '../src/store/transferAuditHelpers.js'

describe('Negative Stock Balances & Overdraw Transfers', () => {
  it('should allow stock to go below zero on transfers without clamping to zero', () => {
    const initialStock = [
      { warehouseId: 'wh-main', itemId: 'item-burger', quantity: 10, unit: 'كرتونة' },
    ]
    const transfer = {
      fromId: 'wh-main',
      toId: 'wh-dukan',
      status: 'confirmed',
      items: [{ itemId: 'item-burger', quantity: 15, unit: 'كرتونة' }],
    }

    const { updatedStock } = calculateTransferStockMovement(transfer, initialStock, [])
    const mainStock = updatedStock.find((s) => s.warehouseId === 'wh-main' && s.itemId === 'item-burger')
    const dukanStock = updatedStock.find((s) => s.warehouseId === 'wh-dukan' && s.itemId === 'item-burger')

    assert.equal(mainStock.quantity, -5, 'Source warehouse must drop to -5')
    assert.equal(dukanStock.quantity, 15, 'Target warehouse must receive 15')
  })

  it('should auto-provision source stock row with negative balance if not previously in warehouse', () => {
    const initialStock = []
    const transfer = {
      fromId: 'wh-van-1',
      toId: 'wh-main',
      status: 'confirmed',
      items: [{ itemId: 'item-liver', quantity: 8, unit: 'كرتونة' }],
    }

    const { updatedStock } = calculateTransferStockMovement(transfer, initialStock, [])
    const vanStock = updatedStock.find((s) => s.warehouseId === 'wh-van-1' && s.itemId === 'item-liver')
    assert.equal(vanStock.quantity, -8, 'Auto-provisioned source warehouse item must be -8')
  })
})

describe('Company Employees, Attendance & Payroll Computations', () => {
  it('should calculate daily rate correctly for monthly vs daily employees', () => {
    const monthlyEmp = { id: 'e1', name: 'علي حسن', salaryType: 'monthly', baseSalary: 6000 }
    const dailyEmp = { id: 'e2', name: 'محمد فتحي', salaryType: 'daily', dailyRate: 250 }

    assert.equal(calculateEmployeeDailyRate(monthlyEmp), 200, '6000 / 30 = 200 EGP/day')
    assert.equal(calculateEmployeeDailyRate(dailyEmp), 250, 'Daily rate directly 250 EGP/day')
  })

  it('should deduct unexcused absences and NOT deduct excused absences from monthly salary', () => {
    const employee = {
      id: 'emp-worker-1',
      name: 'محمود عبد الرازق',
      salaryType: 'monthly',
      baseSalary: 6000, // 200 EGP/day
    }

    const attendanceRecords = [
      { employeeId: 'emp-worker-1', date: '2026-11-01', status: 'present' },
      { employeeId: 'emp-worker-1', date: '2026-11-02', status: 'present' },
      { employeeId: 'emp-worker-1', date: '2026-11-03', status: 'absent_excused' }, // بعذر -> لا يخصم
      { employeeId: 'emp-worker-1', date: '2026-11-04', status: 'absent_unexcused' }, // بدون عذر -> يخصم يومية
      { employeeId: 'emp-worker-1', date: '2026-11-05', status: 'half_day' }, // نصف يوم -> يخصم نصف يومية
      { employeeId: 'emp-worker-1', date: '2026-11-06', status: 'holiday' }, // راحة -> لا يخصم
    ]

    const stats = computeMonthlyPayrollStats(employee, attendanceRecords, [], '2026-11')

    assert.equal(stats.presentDays, 2)
    assert.equal(stats.excusedDays, 1)
    assert.equal(stats.unexcusedDays, 1)
    assert.equal(stats.halfDays, 1)
    assert.equal(stats.holidays, 1)

    // Deductions: 1 unexcused day (200) + 0.5 half day (100) = 300 EGP
    assert.equal(stats.deductionAmount, 300, 'Total deductions must be 300 EGP')
    assert.equal(stats.earnedSalary, 5700, 'Earned salary must be 6000 - 300 = 5700 EGP')
    assert.equal(stats.netPayable, 5700, 'Net payable without advances is 5700 EGP')
  })

  it('should subtract cash advances from net payable salary', () => {
    const employee = {
      id: 'emp-worker-2',
      name: 'سيد إبراهيم',
      salaryType: 'monthly',
      baseSalary: 7500, // 250 EGP/day
    }

    const attendanceRecords = [
      { employeeId: 'emp-worker-2', date: '2026-11-01', status: 'present' },
      { employeeId: 'emp-worker-2', date: '2026-11-02', status: 'absent_unexcused' }, // 1 day deduction (250)
    ]

    const cashTransactions = [
      { partyType: 'employee', partyId: 'emp-worker-2', amount: 1500, date: '2026-11-03' }, // سلفة 1500
    ]

    const stats = computeMonthlyPayrollStats(employee, attendanceRecords, cashTransactions, '2026-11')
    assert.equal(stats.deductionAmount, 250)
    assert.equal(stats.earnedSalary, 7250)
    assert.equal(stats.advancesPaid, 1500)
    assert.equal(stats.netPayable, 5750, '7250 earned - 1500 advance = 5750 EGP')
  })

  it('should generate default attendance sheet with all active employees defaulted to present', () => {
    const employees = [
      { id: 'emp-1', name: 'شريف أحمد', department: 'المصنع', salaryType: 'monthly', baseSalary: 6000, status: 'active' },
      { id: 'emp-2', name: 'كريم ممدوح', department: 'التوزيع', salaryType: 'daily', dailyRate: 200, status: 'active' },
      { id: 'emp-inactive', name: 'سابق', status: 'inactive' },
    ]

    const sheet = getInitialAttendanceForDate(employees, [], '2026-11-07')
    assert.equal(sheet.length, 2, 'Only active employees should appear in attendance sheet')
    assert.equal(sheet[0].status, 'present')
    assert.equal(sheet[1].status, 'present')
    assert.equal(sheet[0].dailyEarned, 200)
    assert.equal(sheet[1].dailyEarned, 200)
  })
})
