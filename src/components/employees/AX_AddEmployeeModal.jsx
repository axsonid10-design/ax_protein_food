import React, { useState } from 'react'
import { X, UserPlus, Phone, Briefcase, Building, DollarSign, Calendar, FileText } from 'lucide-react'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { axToast } from '../common/AX_Toast'

const DEPARTMENTS = [
  'التشغيل والمصنع',
  'التقطيع والتجهيز',
  'التخزين والمخازن',
  'الحركة والتوزيع',
  'الإدارة والمالية',
]

const COMMON_TITLES = [
  'عامل تقطيع',
  'مساعد شيف',
  'أمين مخزن',
  'سائق توزيع',
  'عامل نظافة',
  'فني صيانة وتبريد',
  'مشرف وردية',
  'عامل تشغيل عام',
]

export function AX_AddEmployeeModal({
  isOpen,
  onClose,
  onSave,
  employeeToEdit = null,
}) {
  const [name, setName] = useState(employeeToEdit?.name || '')
  const [phone, setPhone] = useState(employeeToEdit?.phone || '')
  const [department, setDepartment] = useState(employeeToEdit?.department || 'التشغيل والمصنع')
  const [jobTitle, setJobTitle] = useState(employeeToEdit?.jobTitle || employeeToEdit?.job_title || 'عامل تقطيع')
  const [salaryType, setSalaryType] = useState(employeeToEdit?.salaryType || employeeToEdit?.salary_type || 'monthly')
  const [baseSalary, setBaseSalary] = useState(employeeToEdit?.baseSalary ?? employeeToEdit?.base_salary ?? 6000)
  const [dailyRate, setDailyRate] = useState(employeeToEdit?.dailyRate ?? employeeToEdit?.daily_rate ?? 200)
  const [hireDate, setHireDate] = useState(employeeToEdit?.hireDate || employeeToEdit?.hire_date || new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState(employeeToEdit?.notes || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      axToast.error('يرجى كتابة اسم الموظف')
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        name: trimmedName,
        phone: phone.trim() || null,
        department,
        jobTitle,
        salaryType,
        baseSalary: Number(baseSalary) || 0,
        dailyRate: salaryType === 'daily' ? (Number(dailyRate) || 0) : Math.round(((Number(baseSalary) || 0) / 30) * 100) / 100,
        hireDate,
        notes: notes.trim() || null,
        status: employeeToEdit?.status || 'active',
      }

      await onSave(payload)
      axToast.success(employeeToEdit ? 'تم تحديث بيانات الموظف بنجاح' : 'تم إضافة الموظف الجديد بنجاح')
      onClose()
    } catch {
      axToast.error('حدث خطأ أثناء حفظ بيانات الموظف')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-on-surface">
                {employeeToEdit ? `تعديل بيانات: ${employeeToEdit.name}` : 'إضافة موظف / عامل جديد'}
              </h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                تسجيل بيانات العمل، نظام الراتب، واليومية المعتمدة
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

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3.5 flex-1">
          <div>
            <label className="block text-xs font-black text-on-surface mb-1">اسم الموظف / العامل *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: أحمد محمود إبراهيم"
              className="w-full h-10 px-3.5 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-primary outline-none text-xs font-bold text-on-surface"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-on-surface mb-1">رقم الهاتف</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-on-surface-variant absolute right-3 top-3 pointer-events-none" />
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010xxxxxxxx"
                  className="w-full h-10 pr-9 pl-3 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-primary outline-none text-xs font-mono font-bold text-on-surface text-right"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-on-surface mb-1">القسم</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-10 px-3 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-primary outline-none text-xs font-bold text-on-surface cursor-pointer"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-on-surface mb-1">المسمى الوظيفي</label>
              <input
                type="text"
                list="common-titles"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="اختر أو اكتب المسمى..."
                className="w-full h-10 px-3.5 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-primary outline-none text-xs font-bold text-on-surface"
              />
              <datalist id="common-titles">
                {COMMON_TITLES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-black text-on-surface mb-1">تاريخ التعيين</label>
              <AX_CompanyDatePicker
                value={hireDate}
                onChange={setHireDate}
                placeholder="اختر التاريخ..."
              />
            </div>
          </div>

          <div className="p-3 bg-surface-low/60 rounded-2xl border border-outline-variant/30 space-y-2.5">
            <label className="block text-xs font-black text-on-surface">نظام احتساب الراتب *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSalaryType('monthly')}
                className={`py-2 px-3 rounded-full text-xs font-black border transition-all cursor-pointer ${
                  salaryType === 'monthly'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface-lowest border-outline-variant/40 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                راتب شهري ثابت
              </button>
              <button
                type="button"
                onClick={() => setSalaryType('daily')}
                className={`py-2 px-3 rounded-full text-xs font-black border transition-all cursor-pointer ${
                  salaryType === 'daily'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface-lowest border-outline-variant/40 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                حساب باليومية
              </button>
            </div>

            {salaryType === 'monthly' ? (
              <div className="pt-1">
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  قيمة الراتب الشهري الأساسي (ج.م)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-xl bg-surface-lowest border border-outline-variant/50 focus:border-primary outline-none text-xs font-mono font-black text-on-surface"
                  />
                  <span className="text-[11px] font-bold text-on-surface-variant shrink-0 font-mono">
                    اليومية المحسوبة: {baseSalary > 0 ? (Math.round((baseSalary / 30) * 100) / 100) : 0} ج.م
                  </span>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  قيمة يومية العمل (ج.م)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-xl bg-surface-lowest border border-outline-variant/50 focus:border-primary outline-none text-xs font-mono font-black text-on-surface"
                  />
                  <span className="text-[11px] font-bold text-on-surface-variant shrink-0 font-mono">
                    التقدير الشهري: {(Number(dailyRate) || 0) * 26} ج.م (26 يوم)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-black text-on-surface mb-1">ملاحظات إضافية</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: طبيعة العمل، مواعيد خاصة، تفاصيل العقد..."
              className="w-full h-9 px-3.5 rounded-xl bg-surface-lowest border border-outline-variant/50 focus:border-primary outline-none text-xs font-bold text-on-surface"
            />
          </div>

          <div className="pt-3 border-t border-surface-container flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-surface-low hover:bg-surface-container text-on-surface text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'جاري الحفظ...' : (employeeToEdit ? 'تحديث البيانات' : 'إضافة الموظف')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
