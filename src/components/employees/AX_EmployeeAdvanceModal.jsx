import React, { useState, useMemo } from 'react'
import {
  Coins,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { axToast } from '../common/AX_Toast'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { computeMonthlyPayrollStats } from '../../store/employeeHelpers'

export function AX_EmployeeAdvanceModal({
  isOpen,
  onClose,
  employee,
  selectedMonth = '',
  attendanceRecords = [],
  cashTransactions = [],
  treasuryAccounts = [],
  directDeductions = [],
  payrollSettlements = [],
  onSaveAdvance,
}) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const defaultMonth = selectedMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [amount, setAmount] = useState('')
  const [subCategoryId, setSubCategoryId] = useState('exp-sub-emp-adv')
  const [treasuryId, setTreasuryId] = useState(() => treasuryAccounts[0]?.id || '')
  const [date, setDate] = useState(todayStr)
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const currentStats = useMemo(() => {
    if (!employee) return null
    return computeMonthlyPayrollStats(
      employee,
      attendanceRecords,
      cashTransactions,
      defaultMonth,
      directDeductions,
      payrollSettlements
    )
  }, [employee, attendanceRecords, cashTransactions, defaultMonth, directDeductions, payrollSettlements])

  const currentNetDues = useMemo(() => {
    return currentStats ? currentStats.netPayable : 0
  }, [currentStats])

  const numericAmount = Number(amount) || 0
  const projectedBalance = Math.round((currentNetDues - numericAmount) * 100) / 100
  const isNegative = projectedBalance < 0

  if (!isOpen || !employee) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (numericAmount <= 0) {
      axToast.error('يرجى إدخال مبلغ صحيح للسلفة')
      return
    }

    const selectedTreasury = treasuryAccounts.find((t) => t.id === treasuryId) || treasuryAccounts[0]
    if (!selectedTreasury) {
      axToast.error('يرجى تحديد خزينة الصرف')
      return
    }

    try {
      setIsSaving(true)
      const advanceTx = {
        id: `tx_adv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        date,
        type: 'payroll',
        subType: 'advance',
        expenseMainCategoryId: 'exp-main-adv',
        expenseSubCategoryId: subCategoryId,
        partyType: 'employee',
        partyId: employee.id,
        party_id: employee.id,
        partyName: employee.name,
        amount: numericAmount,
        treasuryId: selectedTreasury.id,
        treasuryName: selectedTreasury.name,
        notes: notes.trim() || `سلفة نقدية على الراتب لشهر ${defaultMonth} للموظف ${employee.name}`,
        createdAt: new Date().toISOString(),
      }

      if (onSaveAdvance) {
        await onSaveAdvance(advanceTx)
      }

      if (isNegative) {
        axToast.info(`تم صرف السلفة مع تسجيل رصيد سالب (مديونية سلفة) بقيمة ${Math.abs(projectedBalance).toLocaleString('en-US')} ج.م`)
      } else {
        axToast.success(`تم صرف سلفة بقيمة ${numericAmount.toLocaleString('en-US')} ج.م للموظف ${employee.name} بنجاح`)
      }

      onClose()
    } catch {
      axToast.error('تعذر تسجيل وصرف السلفة')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-on-surface">صرف سلفة لموظف</h3>
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

        <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-surface-low/50 border border-outline-variant/20 text-xs">
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold block">المستحق المكتسب الحالي</span>
            <span className="font-mono font-black text-on-surface">
              {currentStats?.earnedSalary?.toLocaleString('en-US') || 0} ج.م
            </span>
          </div>

          <div className="text-left">
            <span className="text-[10px] text-on-surface-variant font-bold block">إجمالي الخصومات والسلف السابقة</span>
            <span className="font-mono font-black text-rose-700">
              -{(Number(currentStats?.totalDeductionAmount || 0) + Number(currentStats?.advancesPaid || 0)).toLocaleString('en-US')} ج.م
            </span>
          </div>

          <div className="col-span-2 pt-2 border-t border-surface-container flex items-center justify-between">
            <span className="font-bold text-on-surface text-xs">صافي المستحق القائم قبل السلفة:</span>
            <span className={`font-mono font-black text-sm ${currentNetDues >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {currentNetDues.toLocaleString('en-US')} ج.م
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-black text-on-surface mb-1">مبلغ السلفة المطلوب (ج.م) *</label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-11 px-3.5 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-amber-500 outline-none text-base font-mono font-black text-on-surface"
            />
          </div>

          {numericAmount > 0 && (
            <div
              className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                isNegative
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-800'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {isNegative ? (
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                )}
                <span>
                  {isNegative
                    ? 'رصيد سالب (مديونية سلفة تتجاوز المستحق):'
                    : 'الرصيد المتبقي للموظف بعد السلفة:'}
                </span>
              </div>
              <span className="font-mono font-black text-sm">
                {isNegative
                  ? `-${Math.abs(projectedBalance).toLocaleString('en-US')} ج.م`
                  : `${projectedBalance.toLocaleString('en-US')} ج.م`}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-black text-on-surface mb-1">بند السلفة *</label>
              <select
                value={subCategoryId}
                onChange={(e) => setSubCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-amber-500 outline-none text-xs font-bold text-on-surface cursor-pointer"
              >
                <option value="exp-sub-emp-adv">سلف مؤقتة على الراتب</option>
                <option value="exp-sub-emp-loan">قروض وسلف طويلة الأجل</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-on-surface mb-1">الخزينة المنصرف منها *</label>
              <select
                value={treasuryId}
                onChange={(e) => setTreasuryId(e.target.value)}
                className="w-full h-10 px-3 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-amber-500 outline-none text-xs font-bold text-on-surface cursor-pointer"
              >
                {treasuryAccounts.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({Number(t.balance || 0).toLocaleString('en-US')} ج.م)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-on-surface mb-1">تاريخ صرف السلفة</label>
            <AX_CompanyDatePicker
              value={date}
              onChange={setDate}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-on-surface mb-1">بيان الصرف وملاحظات السلفة</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: سلفة علاجية طارئة، قسط سلفة معتمد..."
              className="w-full h-10 px-3.5 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-amber-500 outline-none text-xs font-bold text-on-surface"
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
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-black cursor-pointer shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              <Coins className="w-4 h-4" />
              <span>{isSaving ? 'جاري الصرف...' : 'تأكيد وصرف السلفة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AX_EmployeeAdvanceModal
