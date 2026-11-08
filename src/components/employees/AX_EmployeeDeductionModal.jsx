import React, { useState, useMemo } from 'react'
import {
  AlertOctagon,
  X,
  DollarSign,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { axToast } from '../common/AX_Toast'
import { calculateEmployeeDailyRate, saveStoredEmployeeDeduction } from '../../store/employeeHelpers'

const DEDUCTION_TYPES = [
  { id: 'financial_penalty', label: 'جزاء مالي مباشر', icon: DollarSign },
  { id: 'days_deduction', label: 'خصم أيام عمل', icon: Clock },
  { id: 'damage_compensation', label: 'تعويض تلفيات / عهدة', icon: ShieldAlert },
]

export function AX_EmployeeDeductionModal({
  isOpen,
  onClose,
  employee,
  selectedMonth = '',
  onSaveDeduction,
}) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const defaultMonth = selectedMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [deductionType, setDeductionType] = useState('financial_penalty')
  const [amount, setAmount] = useState('')
  const [days, setDays] = useState('1')
  const [date, setDate] = useState(todayStr)
  const [targetMonth, setTargetMonth] = useState(defaultMonth)
  const [reason, setReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const dailyRate = useMemo(() => {
    return employee ? calculateEmployeeDailyRate(employee) : 0
  }, [employee])

  const computedAmount = useMemo(() => {
    if (deductionType === 'days_deduction') {
      const numDays = Number(days) || 0
      return Math.round(numDays * dailyRate * 100) / 100
    }
    return Math.round((Number(amount) || 0) * 100) / 100
  }, [deductionType, days, dailyRate, amount])

  if (!isOpen || !employee) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (computedAmount <= 0) {
      axToast.error('يرجى تحديد قيمة الخصم أو عدد الأيام بشكل صحيح')
      return
    }
    if (!reason.trim()) {
      axToast.error('يرجى كتابة سبب الجزاء أو الملاحظات')
      return
    }

    try {
      setIsSaving(true)
      const deductionRecord = {
        id: `ded_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        employeeId: employee.id,
        employee_id: employee.id,
        employeeName: employee.name,
        type: deductionType,
        days: deductionType === 'days_deduction' ? Number(days) : null,
        amount: computedAmount,
        date,
        targetMonth,
        reason: reason.trim(),
        createdAt: new Date().toISOString(),
      }

      saveStoredEmployeeDeduction(deductionRecord)
      if (onSaveDeduction) {
        await onSaveDeduction(deductionRecord)
      }

      axToast.success(`تم تسجيل خصم بقيمة ${computedAmount.toLocaleString('en-US')} ج.م على ${employee.name}`)
      onClose()
    } catch {
      axToast.error('تعذر تسجيل الخصم')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-700 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-on-surface">تسجيل خصم / جزاء مالي</h3>
              <span className="text-xs font-bold text-on-surface-variant block">
                {employee.name} • {employee.jobTitle || employee.job_title || 'موظف'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-surface-low/50 border border-outline-variant/20 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold block">نظام الراتب</span>
            <span className="font-black text-on-surface">
              {employee.salaryType === 'daily' ? 'حساب يومية' : 'راتب شهري'}
            </span>
          </div>
          <div className="text-left">
            <span className="text-[10px] text-on-surface-variant font-bold block">معدل اليومية</span>
            <span className="font-black font-mono text-primary">{dailyRate.toLocaleString('en-US')} ج.م/يوم</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-black text-on-surface mb-1.5">نوع الخصم أو الجزاء *</label>
            <div className="grid grid-cols-3 gap-1.5">
              {DEDUCTION_TYPES.map((t) => {
                const Icon = t.icon
                const isSelected = deductionType === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDeductionType(t.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/10 border-rose-500 text-rose-800 shadow-xs'
                        : 'bg-surface-low border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-black">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {deductionType === 'days_deduction' ? (
            <div className="space-y-2">
              <label className="block text-xs font-black text-on-surface">عدد أيام الخصم *</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  required
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="flex-1 h-10 px-3.5 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-rose-500 outline-none text-sm font-mono font-black text-on-surface"
                />
                <div className="px-3.5 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono font-black text-rose-800 whitespace-nowrap">
                  = {computedAmount.toLocaleString('en-US')} ج.م
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-black text-on-surface mb-1">قيمة الخصم (ج.م) *</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-10 px-3.5 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-rose-500 outline-none text-sm font-mono font-black text-on-surface"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-black text-on-surface mb-1">تاريخ الخصم</label>
              <AX_CompanyDatePicker
                value={date}
                onChange={(newDate) => {
                  setDate(newDate)
                  if (newDate && newDate.length >= 7) {
                    setTargetMonth(newDate.substring(0, 7))
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-on-surface mb-1">شهر المحاسبة المطبق عليه</label>
              <div className="w-full h-11 px-4 rounded-full bg-surface-low border border-outline-variant/40 flex items-center justify-between text-xs font-mono font-black text-on-surface">
                <span>{targetMonth}</span>
                <span className="text-[10px] font-sans font-bold text-on-surface-variant">تلقائي من التاريخ</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-on-surface mb-1">سبب الجزاء والملاحظات *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تأخير متكرر عن الوردية، إتلاف أدوات، مخالفة تعليمات السلامة..."
              className="w-full h-10 px-3.5 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-rose-500 outline-none text-xs font-bold text-on-surface"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-surface-low hover:bg-surface-container text-xs font-bold text-on-surface-variant cursor-pointer transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-rose-700 hover:bg-rose-800 text-white text-xs font-black cursor-pointer shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>{isSaving ? 'جاري التسجيل...' : 'تأكيد تسجيل الخصم'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AX_EmployeeDeductionModal
