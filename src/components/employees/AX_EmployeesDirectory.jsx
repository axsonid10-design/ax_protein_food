import React, { useState, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Briefcase,
  Building,
  Edit2,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  AlertOctagon,
  Coins,
} from 'lucide-react'
import { AX_HoldToDeleteButton } from './AX_HoldToDeleteButton'
import { AX_EmployeeDeductionModal } from './AX_EmployeeDeductionModal'
import { AX_EmployeeAdvanceModal } from './AX_EmployeeAdvanceModal'
import { axToast } from '../common/AX_Toast'

export function AX_EmployeesDirectory({
  employees = [],
  attendanceRecords = [],
  cashTransactions = [],
  treasuryAccounts = [],
  directDeductions = [],
  payrollSettlements = [],
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onSaveDeduction,
  onSaveAdvance,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [employeeForDeduction, setEmployeeForDeduction] = useState(null)
  const [employeeForAdvance, setEmployeeForAdvance] = useState(null)

  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department).filter(Boolean))
    return ['ALL', ...Array.from(set)]
  }, [employees])

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return employees.filter((e) => {
      if (selectedDept !== 'ALL' && e.department !== selectedDept) return false
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false
      if (!q) return true
      return (
        e.name?.toLowerCase().includes(q) ||
        e.phone?.includes(q) ||
        e.jobTitle?.toLowerCase().includes(q) ||
        e.job_title?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q)
      )
    })
  }, [employees, searchQuery, selectedDept, statusFilter])

  const handleHoldDelete = async (emp) => {
    if (!emp) return
    try {
      await onDeleteEmployee(emp.id)
      axToast.success(`تم حذف الموظف "${emp.name}" ونقله لسلة المحذوفات بنجاح`)
    } catch {
      axToast.error('حدث خطأ أثناء حذف الموظف')
    }
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-on-surface-variant absolute right-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث بالاسم أو التليفون أو الوظيفة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pr-9 pl-3 rounded-full bg-surface-lowest border border-outline-variant/40 text-xs font-bold text-on-surface outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-full bg-surface-lowest border border-outline-variant/40 text-xs font-bold text-on-surface outline-none cursor-pointer"
          >
            <option value="ALL">كافة الحالات</option>
            <option value="active">نشط بالعمل</option>
            <option value="inactive">متوقف / منتهي</option>
          </select>

          <button
            type="button"
            onClick={onAddEmployee}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة موظف</span>
          </button>
        </div>
      </div>

      <div className="hidden lg:block bg-surface-lowest border border-outline-variant/30 rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-surface-low border-b border-surface-container text-on-surface-variant font-black h-11 text-[11px]">
              <th className="px-4">الكود / الاسم</th>
              <th className="px-3">الوظيفة والقسم</th>
              <th className="px-3">رقم الهاتف</th>
              <th className="px-3">نظام الراتب</th>
              <th className="px-3 text-left">قيمة الراتب / اليومية</th>
              <th className="px-3 text-center">تاريخ التعيين</th>
              <th className="px-3 text-center">الحالة</th>
              <th className="px-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container/50 font-bold">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-on-surface-variant">
                  لا يوجد موظفون مطابقون للشروط.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const isDaily = emp.salaryType === 'daily' || emp.salary_type === 'daily'
                const rateVal = Number(isDaily ? (emp.dailyRate ?? emp.daily_rate ?? 0) : (emp.baseSalary ?? emp.base_salary ?? 0))
                return (
                  <tr key={emp.id} className="h-12 hover:bg-surface-low/30 transition-colors">
                    <td className="px-4 text-on-surface font-black">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-black shrink-0">
                          {emp.name?.slice(0, 1)}
                        </div>
                        <div>
                          <div>{emp.name}</div>
                          <span className="text-[10px] text-on-surface-variant font-mono font-normal">
                            {emp.code || emp.id?.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 text-on-surface font-bold">
                      <div>{emp.jobTitle || emp.job_title || 'موظف'}</div>
                      <span className="text-[10px] text-on-surface-variant font-normal">{emp.department}</span>
                    </td>
                    <td className="px-3 font-mono text-on-surface-variant" dir="ltr">
                      {emp.phone || '—'}
                    </td>
                    <td className="px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isDaily ? 'bg-amber-500/10 text-amber-800 border border-amber-500/30' : 'bg-primary/10 text-primary border border-primary/30'
                      }`}>
                        {isDaily ? 'حساب يومية' : 'راتب شهري'}
                      </span>
                    </td>
                    <td className="px-3 text-left font-mono font-black text-on-surface">
                      {rateVal.toLocaleString('en-US')} <span className="text-[10px] font-normal text-on-surface-variant">{isDaily ? 'ج.م/يوم' : 'ج.م/شهر'}</span>
                    </td>
                    <td className="px-3 text-center font-mono text-[11px] text-on-surface-variant">
                      {emp.hireDate || emp.hire_date || '—'}
                    </td>
                    <td className="px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                        emp.status === 'active' ? 'bg-emerald-500/10 text-emerald-800' : 'bg-surface-container text-on-surface-variant'
                      }`}>
                        {emp.status === 'active' ? 'نشط' : 'متوقف'}
                      </span>
                    </td>
                    <td className="px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEmployeeForAdvance(emp)}
                          className="w-7 h-7 rounded-full bg-surface-low hover:bg-amber-500/10 flex items-center justify-center text-on-surface-variant hover:text-amber-700 transition-colors cursor-pointer"
                          title="صرف سلفة للموظف"
                        >
                          <Coins className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmployeeForDeduction(emp)}
                          className="w-7 h-7 rounded-full bg-surface-low hover:bg-rose-500/10 flex items-center justify-center text-on-surface-variant hover:text-rose-700 transition-colors cursor-pointer"
                          title="تسجيل خصم أو جزاء"
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditEmployee(emp)}
                          className="w-7 h-7 rounded-full bg-surface-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                          title="تعديل بيانات الموظف"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <AX_HoldToDeleteButton
                          compact={true}
                          durationMs={2500}
                          onTrigger={() => handleHoldDelete(emp)}
                          title="اضغط مطولاً لمدة 2.5 ثانية لحذف الموظف"
                        />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-2.5">
        {filteredEmployees.map((emp) => {
          const isDaily = emp.salaryType === 'daily' || emp.salary_type === 'daily'
          const rateVal = Number(isDaily ? (emp.dailyRate ?? emp.daily_rate ?? 0) : (emp.baseSalary ?? emp.base_salary ?? 0))
          return (
            <div
              key={emp.id}
              className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-on-surface">{emp.name}</h4>
                  <span className="text-[10px] text-on-surface-variant font-bold">
                    {emp.jobTitle || emp.job_title} • {emp.department}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEmployeeForAdvance(emp)}
                    className="w-7 h-7 rounded-full bg-surface-low text-amber-700 flex items-center justify-center cursor-pointer"
                    title="سلفة"
                  >
                    <Coins className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeForDeduction(emp)}
                    className="w-7 h-7 rounded-full bg-surface-low text-rose-700 flex items-center justify-center cursor-pointer"
                    title="خصم"
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditEmployee(emp)}
                    className="w-7 h-7 rounded-full bg-surface-low flex items-center justify-center text-on-surface-variant cursor-pointer"
                    title="تعديل"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <AX_HoldToDeleteButton
                    compact={true}
                    durationMs={2500}
                    onTrigger={() => handleHoldDelete(emp)}
                    title="اضغط مطولاً لمدة 2.5 ثانية لحذف الموظف"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono font-black pt-1 border-t border-surface-container">
                <span className="text-on-surface-variant text-[11px] font-normal">
                  {emp.phone || 'بدون هاتف'}
                </span>
                <span className="text-primary">
                  {rateVal.toLocaleString('en-US')} {isDaily ? 'ج.م/يوم' : 'ج.م/شهر'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {employeeForDeduction && (
        <AX_EmployeeDeductionModal
          isOpen={Boolean(employeeForDeduction)}
          onClose={() => setEmployeeForDeduction(null)}
          employee={employeeForDeduction}
          onSaveDeduction={onSaveDeduction}
        />
      )}

      {employeeForAdvance && (
        <AX_EmployeeAdvanceModal
          isOpen={Boolean(employeeForAdvance)}
          onClose={() => setEmployeeForAdvance(null)}
          employee={employeeForAdvance}
          attendanceRecords={attendanceRecords}
          cashTransactions={cashTransactions}
          treasuryAccounts={treasuryAccounts}
          directDeductions={directDeductions}
          payrollSettlements={payrollSettlements}
          onSaveAdvance={onSaveAdvance}
        />
      )}
    </div>
  )
}

export default AX_EmployeesDirectory
