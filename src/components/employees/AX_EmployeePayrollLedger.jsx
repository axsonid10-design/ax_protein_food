import React, { useState, useMemo } from 'react'
import {
  Calendar,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowDownLeft,
  Search,
  Wallet,
  Printer,
  ChevronLeft,
} from 'lucide-react'
import { computeMonthlyPayrollStats } from '../../store/employeeHelpers'
import { axToast } from '../common/AX_Toast'
import { useAXStore } from '../../store/useAXStore'

export function AX_EmployeePayrollLedger({
  employees = [],
  employeeAttendance = [],
  cashTransactions = [],
  onPaySalary,
}) {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [selectedEmployeeForPayout, setSelectedEmployeeForPayout] = useState(null)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutTreasuryId, setPayoutTreasuryId] = useState('')
  const [payoutNotes, setPayoutNotes] = useState('')
  const [isPaying, setIsPaying] = useState(false)

  const treasuryAccounts = useAXStore((s) => s.treasuryAccounts || [])

  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department).filter(Boolean))
    return ['ALL', ...Array.from(set)]
  }, [employees])

  const payrollRows = useMemo(() => {
    return employees
      .filter((e) => e.status !== 'inactive')
      .map((emp) => {
        const stats = computeMonthlyPayrollStats(emp, employeeAttendance, cashTransactions, selectedMonth)
        return {
          employee: emp,
          stats,
        }
      })
  }, [employees, employeeAttendance, cashTransactions, selectedMonth])

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return payrollRows.filter((r) => {
      const emp = r.employee
      if (selectedDept !== 'ALL' && emp.department !== selectedDept) return false
      if (!q) return true
      return (
        emp.name?.toLowerCase().includes(q) ||
        emp.jobTitle?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q)
      )
    })
  }, [payrollRows, searchQuery, selectedDept])

  const totals = useMemo(() => {
    let totalEarned = 0
    let totalDeductions = 0
    let totalAdvances = 0
    let totalNet = 0

    payrollRows.forEach((r) => {
      totalEarned += r.stats.earnedSalary
      totalDeductions += r.stats.deductionAmount
      totalAdvances += r.stats.advancesPaid
      totalNet += Math.max(0, r.stats.netPayable)
    })

    return {
      totalEarned: Math.round(totalEarned * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalAdvances: Math.round(totalAdvances * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
    }
  }, [payrollRows])

  const handleOpenPayout = (row) => {
    setSelectedEmployeeForPayout(row)
    setPayoutAmount(Math.max(0, row.stats.netPayable))
    setPayoutTreasuryId(treasuryAccounts[0]?.id || '')
    setPayoutNotes(`صرف راتب شهر ${selectedMonth}`)
  }

  const handleConfirmPayout = async (e) => {
    e.preventDefault()
    if (!selectedEmployeeForPayout || !payoutAmount || Number(payoutAmount) <= 0) {
      axToast.error('يرجى إدخال مبلغ صحيح للصرف')
      return
    }

    try {
      setIsPaying(true)
      const emp = selectedEmployeeForPayout.employee
      const tx = {
        type: 'payroll',
        partyType: 'employee',
        partyId: emp.id,
        partyName: emp.name,
        amount: Number(payoutAmount),
        treasuryId: payoutTreasuryId || treasuryAccounts[0]?.id || null,
        date: new Date().toISOString().split('T')[0],
        notes: payoutNotes || `صرف أجور شهر ${selectedMonth} للموظف ${emp.name}`,
      }

      if (onPaySalary) {
        await onPaySalary(tx)
        axToast.success(`تم صرف مبلغ ${Number(payoutAmount).toLocaleString('en-US')} ج.م للموظف ${emp.name} بنجاح`)
        setSelectedEmployeeForPayout(null)
      }
    } catch {
      axToast.error('تعذر تسجيل عملية صرف الراتب')
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <div className="space-y-3.5">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-bold text-on-surface-variant block">شهر المحاسبة ومسير الرواتب</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-8 px-3 rounded-full bg-surface-low border border-outline-variant/40 text-xs font-mono font-black text-on-surface outline-none cursor-pointer mt-0.5"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-low hover:bg-surface-container border border-outline-variant/40 text-xs font-bold text-on-surface transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف المسير</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-surface-container">
          <div className="p-3 rounded-2xl bg-surface-low/50 border border-outline-variant/20 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant">إجمالي المستحق الأساسي</span>
            <span className="text-base sm:text-lg font-black font-mono text-on-surface mt-1">
              {totals.totalEarned.toLocaleString('en-US')} <span className="text-[10px]">ج.م</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-rose-800">إجمالي خصومات الغياب</span>
            <span className="text-base sm:text-lg font-black font-mono text-rose-800 mt-1">
              -{totals.totalDeductions.toLocaleString('en-US')} <span className="text-[10px]">ج.م</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-amber-800">سلف ومسحوبات مسددة</span>
            <span className="text-base sm:text-lg font-black font-mono text-amber-800 mt-1">
              {totals.totalAdvances.toLocaleString('en-US')} <span className="text-[10px]">ج.م</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-primary">صافي المطلوب صرفه</span>
            <span className="text-base sm:text-lg font-black font-mono text-primary mt-1">
              {totals.totalNet.toLocaleString('en-US')} <span className="text-[10px]">ج.م</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-on-surface-variant absolute right-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث بالاسم أو القسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pr-9 pl-3 rounded-full bg-surface-lowest border border-outline-variant/40 text-xs font-bold text-on-surface outline-none"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="h-9 px-3 rounded-full bg-surface-lowest border border-outline-variant/40 text-xs font-bold text-on-surface outline-none cursor-pointer"
        >
          <option value="ALL">كافة الأقسام</option>
          {departments.filter((d) => d !== 'ALL').map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden lg:block bg-surface-lowest border border-outline-variant/30 rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-surface-low border-b border-surface-container text-on-surface-variant font-black h-11 text-[11px]">
              <th className="px-4">الموظف</th>
              <th className="px-3">نظام الحساب</th>
              <th className="px-3 text-center">حضور فعلي</th>
              <th className="px-3 text-center">غياب بعذر</th>
              <th className="px-3 text-center">غياب بدون عذر</th>
              <th className="px-3 text-left">المستحق</th>
              <th className="px-3 text-left">الخصم</th>
              <th className="px-3 text-left">السلف</th>
              <th className="px-4 text-left">الصافي</th>
              <th className="px-3 text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container/50 font-bold">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan="10" className="p-8 text-center text-on-surface-variant">
                  لا توجد سجلات مطابقة للشهر المختار.
                </td>
              </tr>
            ) : (
              filteredRows.map(({ employee, stats }) => (
                <tr key={employee.id} className="h-12 hover:bg-surface-low/30 transition-colors">
                  <td className="px-4 text-on-surface font-black">
                    <div>{employee.name}</div>
                    <span className="text-[10px] text-on-surface-variant font-normal">{employee.jobTitle} • {employee.department}</span>
                  </td>
                  <td className="px-3 text-on-surface-variant">
                    {employee.salaryType === 'daily' ? `${stats.dailyRate} ج.م/يوم` : `${stats.baseSalary} ج.م/شهر`}
                  </td>
                  <td className="px-3 text-center font-mono text-emerald-800 font-black">
                    {stats.presentDays + (stats.halfDays * 0.5)} يوم
                  </td>
                  <td className="px-3 text-center font-mono text-blue-800 font-bold">
                    {stats.excusedDays} يوم
                  </td>
                  <td className="px-3 text-center font-mono text-rose-800 font-black">
                    {stats.unexcusedDays > 0 ? `${stats.unexcusedDays} يوم` : '—'}
                  </td>
                  <td className="px-3 text-left font-mono font-black text-on-surface">
                    {stats.earnedSalary.toLocaleString('en-US')}
                  </td>
                  <td className="px-3 text-left font-mono font-black text-rose-800">
                    {stats.deductionAmount > 0 ? `-${stats.deductionAmount.toLocaleString('en-US')}` : '—'}
                  </td>
                  <td className="px-3 text-left font-mono font-black text-amber-800">
                    {stats.advancesPaid > 0 ? stats.advancesPaid.toLocaleString('en-US') : '—'}
                  </td>
                  <td className="px-4 text-left font-mono font-black text-primary text-sm">
                    {stats.netPayable.toLocaleString('en-US')} ج.م
                  </td>
                  <td className="px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenPayout({ employee, stats })}
                      className="px-3 py-1 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white font-black text-[11px] transition-all cursor-pointer"
                    >
                      صرف
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-2.5">
        {filteredRows.map(({ employee, stats }) => (
          <div
            key={employee.id}
            className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-on-surface">{employee.name}</h4>
                <span className="text-[10px] text-on-surface-variant font-bold">
                  {employee.jobTitle} • {employee.department}
                </span>
              </div>
              <span className="text-xs font-mono font-black text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                {stats.netPayable.toLocaleString('en-US')} ج.م
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono pt-2 border-t border-surface-container">
              <div className="p-1.5 rounded-xl bg-surface-low">
                <span className="block text-on-surface-variant text-[9px]">حضور</span>
                <span className="font-black text-emerald-800">{stats.presentDays} يوم</span>
              </div>
              <div className="p-1.5 rounded-xl bg-rose-500/5">
                <span className="block text-rose-800 text-[9px]">غياب مخصوم</span>
                <span className="font-black text-rose-800">{stats.unexcusedDays} يوم</span>
              </div>
              <div className="p-1.5 rounded-xl bg-amber-500/5">
                <span className="block text-amber-800 text-[9px]">سلف مسددة</span>
                <span className="font-black text-amber-800">{stats.advancesPaid} ج.م</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPayout({ employee, stats })}
              className="w-full py-1.5 rounded-full bg-primary text-white font-black text-xs cursor-pointer"
            >
              صرف الراتب أو سلفة
            </button>
          </div>
        ))}
      </div>

      {selectedEmployeeForPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div>
                <h4 className="text-sm font-black text-on-surface">صرف أجور / سلفة</h4>
                <span className="text-[11px] font-bold text-on-surface-variant block">
                  {selectedEmployeeForPayout.employee.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployeeForPayout(null)}
                className="w-7 h-7 rounded-full bg-surface-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPayout} className="space-y-3">
              <div>
                <label className="block text-xs font-black text-on-surface mb-1">المبلغ المطلوب صرفه (ج.م) *</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-primary outline-none text-sm font-mono font-black text-on-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-on-surface mb-1">الخزينة المنصرف منها *</label>
                <select
                  value={payoutTreasuryId}
                  onChange={(e) => setPayoutTreasuryId(e.target.value)}
                  className="w-full h-10 px-3 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-primary outline-none text-xs font-bold text-on-surface cursor-pointer"
                >
                  {treasuryAccounts.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (الرصيد: {Number(t.balance || 0).toLocaleString('en-US')} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-on-surface mb-1">بيان الصرف والملاحظات</label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-surface-lowest border border-outline-variant/50 focus:border-primary outline-none text-xs font-bold text-on-surface"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeForPayout(null)}
                  className="px-4 py-2 rounded-full bg-surface-low text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="px-5 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black cursor-pointer disabled:opacity-50"
                >
                  {isPaying ? 'جاري الصرف...' : 'تأكيد وصرف المبلغ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
