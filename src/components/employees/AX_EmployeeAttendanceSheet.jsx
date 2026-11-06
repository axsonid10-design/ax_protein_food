import React, { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Coffee,
  Save,
  CheckCheck,
  Search,
  Filter,
  UserCheck,
} from 'lucide-react'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { axToast } from '../common/AX_Toast'
import { getInitialAttendanceForDate, calculateEmployeeDailyRate } from '../../store/employeeHelpers'

const STATUS_CONFIG = {
  present: {
    label: 'حاضر (كامل)',
    color: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30 hover:bg-emerald-500/20',
    activeColor: 'bg-emerald-700 text-white border-emerald-700 shadow-xs',
    icon: CheckCircle2,
  },
  half_day: {
    label: 'نصف يوم',
    color: 'bg-amber-500/10 text-amber-800 border-amber-500/30 hover:bg-amber-500/20',
    activeColor: 'bg-amber-600 text-white border-amber-600 shadow-xs',
    icon: Clock,
  },
  absent_excused: {
    label: 'غياب بعذر',
    color: 'bg-blue-500/10 text-blue-800 border-blue-500/30 hover:bg-blue-500/20',
    activeColor: 'bg-blue-700 text-white border-blue-700 shadow-xs',
    icon: AlertTriangle,
  },
  absent_unexcused: {
    label: 'غياب بدون عذر',
    color: 'bg-rose-500/10 text-rose-800 border-rose-500/30 hover:bg-rose-500/20',
    activeColor: 'bg-rose-700 text-white border-rose-700 shadow-xs',
    icon: XCircle,
  },
  holiday: {
    label: 'إجازة / راحة',
    color: 'bg-purple-500/10 text-purple-800 border-purple-500/30 hover:bg-purple-500/20',
    activeColor: 'bg-purple-700 text-white border-purple-700 shadow-xs',
    icon: Coffee,
  },
}

export function AX_EmployeeAttendanceSheet({
  employees = [],
  employeeAttendance = [],
  onSaveAttendance,
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [attendanceSheet, setAttendanceSheet] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const list = getInitialAttendanceForDate(employees, employeeAttendance, selectedDate)
    setAttendanceSheet(list)
  }, [selectedDate, employees, employeeAttendance])

  const handleStatusChange = (empId, newStatus) => {
    setAttendanceSheet((prev) =>
      prev.map((r) => {
        if (r.employeeId !== empId) return r
        let deductionDays = 0
        let dailyEarned = r.dailyRate

        if (newStatus === 'present') {
          deductionDays = 0
          dailyEarned = r.dailyRate
        } else if (newStatus === 'half_day') {
          deductionDays = 0.5
          dailyEarned = Math.round(r.dailyRate * 0.5 * 100) / 100
        } else if (newStatus === 'absent_excused') {
          deductionDays = 0
          dailyEarned = r.dailyRate
        } else if (newStatus === 'absent_unexcused') {
          deductionDays = 1
          dailyEarned = 0
        } else if (newStatus === 'holiday') {
          deductionDays = 0
          dailyEarned = r.dailyRate
        }

        return {
          ...r,
          status: newStatus,
          deductionDays,
          dailyEarned,
        }
      })
    )
  }

  const handleNotesChange = (empId, text) => {
    setAttendanceSheet((prev) =>
      prev.map((r) => (r.employeeId === empId ? { ...r, notes: text } : r))
    )
  }

  const handleAttendAll = () => {
    setAttendanceSheet((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'present',
        deductionDays: 0,
        dailyEarned: r.dailyRate,
      }))
    )
    axToast.info('تم تحديد حضور الجميع لليوم، اضغط حفظ لتأكيد السجل')
  }

  const handleSave = async () => {
    if (attendanceSheet.length === 0) {
      axToast.error('لا يوجد موظفون لتسجيل حضورهم')
      return
    }

    try {
      setIsSaving(true)
      const recordsToSave = attendanceSheet.map((r) => ({
        id: `${selectedDate}_${r.employeeId}`,
        date: selectedDate,
        employee_id: r.employeeId,
        employee_name: r.employeeName,
        status: r.status,
        deduction_days: r.deductionDays,
        daily_earned: r.dailyEarned,
        notes: r.notes || null,
      }))

      await onSaveAttendance(recordsToSave)
      axToast.success(`تم حفظ يومية وسجل حضور ${selectedDate} بنجاح`)
    } catch {
      axToast.error('تعذر حفظ سجل الحضور')
    } finally {
      setIsSaving(false)
    }
  }

  const stats = useMemo(() => {
    let present = 0
    let half = 0
    let excused = 0
    let unexcused = 0
    let holiday = 0
    let totalEarned = 0

    attendanceSheet.forEach((r) => {
      if (r.status === 'present') present += 1
      else if (r.status === 'half_day') half += 1
      else if (r.status === 'absent_excused') excused += 1
      else if (r.status === 'absent_unexcused') unexcused += 1
      else if (r.status === 'holiday') holiday += 1
      totalEarned += Number(r.dailyEarned || 0)
    })

    return {
      present,
      half,
      excused,
      unexcused,
      holiday,
      totalCount: attendanceSheet.length,
      totalEarned: Math.round(totalEarned * 100) / 100,
    }
  }, [attendanceSheet])

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return attendanceSheet.filter((r) => {
      if (selectedDept !== 'ALL' && r.department !== selectedDept) return false
      if (!q) return true
      return (
        r.employeeName?.toLowerCase().includes(q) ||
        r.jobTitle?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q)
      )
    })
  }, [attendanceSheet, searchQuery, selectedDept])

  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department).filter(Boolean))
    return ['ALL', ...Array.from(set)]
  }, [employees])

  return (
    <div className="space-y-3.5">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-on-surface-variant block">تاريخ اليومية وسجل الحضور</span>
              <div className="w-48 mt-0.5">
                <AX_CompanyDatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  placeholder="اختر التاريخ..."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAttendAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-low hover:bg-surface-container border border-outline-variant/40 text-xs font-black text-on-surface transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <CheckCheck className="w-4 h-4 text-emerald-700" />
              <span>تحضير الكل (كامل)</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ اليومية'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-surface-container">
          <div className="p-2.5 rounded-2xl bg-surface-low/50 border border-outline-variant/20 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-on-surface-variant">إجمالي الموظفين</span>
            <span className="text-base font-black font-mono text-on-surface">{stats.totalCount}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-emerald-800">حاضر (كامل)</span>
            <span className="text-base font-black font-mono text-emerald-800">{stats.present}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-amber-800">نصف يوم</span>
            <span className="text-base font-black font-mono text-amber-800">{stats.half}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-blue-800">غياب بعذر (لا يُخصم)</span>
            <span className="text-base font-black font-mono text-blue-800">{stats.excused}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-rose-800">غياب بدون عذر (يُخصم)</span>
            <span className="text-base font-black font-mono text-rose-800">{stats.unexcused}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-purple-800">إجازة / راحة</span>
            <span className="text-base font-black font-mono text-purple-800">{stats.holiday}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-on-surface-variant absolute right-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الوظيفة أو القسم..."
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

      <div className="space-y-2">
        {filteredRows.length === 0 ? (
          <div className="p-8 text-center bg-surface-lowest rounded-3xl border border-outline-variant/30 text-on-surface-variant font-bold text-xs">
            لا يوجد موظفون مطابقون لبحثك أو لم يتم إضافة موظفين بعد.
          </div>
        ) : (
          filteredRows.map((r) => {
            const currentStatus = r.status || 'present'
            return (
              <div
                key={r.employeeId}
                className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 hover:border-outline-variant/60 transition-all"
              >
                <div className="flex items-center gap-3 min-w-[240px]">
                  <div className="w-9 h-9 rounded-2xl bg-surface-low border border-outline-variant/30 flex items-center justify-center font-black text-on-surface text-xs shrink-0">
                    {r.employeeName?.slice(0, 2) || 'ع'}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-on-surface">{r.employeeName}</h4>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant mt-0.5">
                      <span>{r.jobTitle || 'موظف'}</span>
                      <span>•</span>
                      <span className="text-primary font-mono">{r.department}</span>
                      <span>•</span>
                      <span className="font-mono">
                        {r.salaryType === 'daily' ? `${r.dailyRate} ج.م/يوم` : 'شهري'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {Object.keys(STATUS_CONFIG).map((stKey) => {
                    const cfg = STATUS_CONFIG[stKey]
                    const Icon = cfg.icon
                    const isSelected = currentStatus === stKey
                    return (
                      <button
                        key={stKey}
                        type="button"
                        onClick={() => handleStatusChange(r.employeeId, stKey)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-black border transition-all cursor-pointer ${
                          isSelected ? cfg.activeColor : cfg.color
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center gap-2 min-w-[180px]">
                  <input
                    type="text"
                    placeholder="ملاحظات (إذن، خصم، عذر)..."
                    value={r.notes || ''}
                    onChange={(e) => handleNotesChange(r.employeeId, e.target.value)}
                    className="w-full h-8 px-2.5 rounded-xl bg-surface-low/60 border border-outline-variant/40 text-[11px] font-bold text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
