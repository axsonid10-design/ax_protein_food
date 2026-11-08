import React, { useState, useMemo } from 'react'
import {
  CheckCheck,
  X,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react'
import { axToast } from '../common/AX_Toast'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import {
  computeMonthlyPayrollStats,
  executeEmployeePeriodSettlement,
} from '../../store/employeeHelpers'

export function AX_EmployeeSettlementModal({
  isOpen,
  onClose,
  employee,
  selectedMonth = '',
  attendanceRecords = [],
  cashTransactions = [],
  treasuryAccounts = [],
  directDeductions = [],
  payrollSettlements = [],
  onConfirmSettlement,
}) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const defaultMonth = selectedMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [settlementDate, setSettlementDate] = useState(todayStr)
  const [treasuryId, setTreasuryId] = useState(() => treasuryAccounts[0]?.id || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const stats = useMemo(() => {
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

  const initialPayout = useMemo(() => {
    if (!stats) return '0'
    return String(Math.max(0, stats.netPayable))
  }, [stats])

  const [netPaidAmount, setNetPaidAmount] = useState(initialPayout)
  const [notes, setNotes] = useState(() => `تسوية أجور شهر ${defaultMonth} للموظف ${employee?.name || ''}`)

  const numericPaid = Number(netPaidAmount) || 0
  const closingBalance = useMemo(() => {
    if (!stats) return 0
    return Math.round((stats.netPayable - numericPaid) * 100) / 100
  }, [stats, numericPaid])

  if (!isOpen || !employee || !stats) return null

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (numericPaid < 0) {
      axToast.error('لا يمكن أن يكون المبلغ المنصرف سالباً')
      return
    }

    const selectedTreasury = treasuryAccounts.find((t) => t.id === treasuryId) || treasuryAccounts[0]
    if (numericPaid > 0 && !selectedTreasury) {
      axToast.error('يرجى تحديد خزينة صرف المبلغ')
      return
    }

    try {
      setIsSubmitting(true)
      const settlementPayload = {
        employeeId: employee.id,
        employeeName: employee.name,
        settlementPeriod: defaultMonth,
        grossWage: stats.earnedSalary,
        deductions: stats.totalDeductionAmount,
        advancesCleared: stats.advancesPaid,
        priorCarriedBalance: stats.priorCarriedBalance,
        netPayable: stats.netPayable,
        netPaidAmount: numericPaid,
        treasuryId: numericPaid > 0 ? selectedTreasury?.id : null,
        settlementDate,
        notes: notes.trim(),
      }

      const res = await executeEmployeePeriodSettlement(settlementPayload)
      let payoutTx = null

      if (numericPaid > 0 && selectedTreasury) {
        payoutTx = {
          id: `tx_settle_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          date: settlementDate,
          type: 'payroll',
          subType: 'settlement',
          partyType: 'employee',
          partyId: employee.id,
          party_id: employee.id,
          partyName: employee.name,
          amount: numericPaid,
          treasuryId: selectedTreasury.id,
          treasuryName: selectedTreasury.name,
          notes: notes.trim() || `صرف أجور تسوية شهر ${defaultMonth} للموظف ${employee.name}`,
          settlementPeriod: defaultMonth,
          createdAt: new Date().toISOString(),
        }
      }

      if (onConfirmSettlement) {
        await onConfirmSettlement(res.settlementRecord, payoutTx)
      }

      axToast.success(`تمت تسوية أجور شهر ${defaultMonth} للموظف ${employee.name} بنجاح`)
      onClose()
    } catch {
      axToast.error('تعذر إتمام تسوية الفترة')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CheckCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-on-surface">
                تسوية مسير أجور الفترة ({defaultMonth})
              </h3>
              <span className="text-xs font-bold text-on-surface-variant block">
                {employee.name} • {employee.jobTitle || employee.job_title} ({employee.department})
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

        {stats.isSettled && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              هذا الشهر تمت تسويته مسبقاً بتاريخ {stats.settlementRecord?.settlementDate || stats.settlementRecord?.settledAt?.split('T')[0]}. إعادة التأكيد ستحدث بيانات التسوية.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3.5 rounded-2xl bg-surface-low/50 border border-outline-variant/20 text-xs font-mono">
          <div className="p-2 rounded-xl bg-surface-lowest">
            <span className="text-[10px] text-on-surface-variant font-sans font-bold block">أيام الحضور الفعلي</span>
            <span className="font-black text-emerald-800">{stats.presentDays + (stats.halfDays * 0.5)} يوم</span>
          </div>

          <div className="p-2 rounded-xl bg-surface-lowest">
            <span className="text-[10px] text-on-surface-variant font-sans font-bold block">إجمالي الراتب المكتسب</span>
            <span className="font-black text-on-surface">{stats.earnedSalary.toLocaleString('en-US')} ج.م</span>
          </div>

          <div className="p-2 rounded-xl bg-surface-lowest">
            <span className="text-[10px] text-rose-800 font-sans font-bold block">إجمالي الخصومات</span>
            <span className="font-black text-rose-800">-{stats.totalDeductionAmount.toLocaleString('en-US')} ج.م</span>
          </div>

          <div className="p-2 rounded-xl bg-surface-lowest">
            <span className="text-[10px] text-amber-800 font-sans font-bold block">السلف المسحوبة</span>
            <span className="font-black text-amber-800">-{stats.advancesPaid.toLocaleString('en-US')} ج.م</span>
          </div>

          <div className="p-2 rounded-xl bg-surface-lowest">
            <span className="text-[10px] text-on-surface-variant font-sans font-bold block">رصيد سابق مرحل</span>
            <span className={`font-black ${stats.priorCarriedBalance >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
              {stats.priorCarriedBalance.toLocaleString('en-US')} ج.م
            </span>
          </div>

          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <span className="text-[10px] text-primary font-sans font-bold block">صافي مستحق التسوية</span>
            <span className="font-black text-primary text-sm">{stats.netPayable.toLocaleString('en-US')} ج.م</span>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="space-y-3.5">
          <div>
            <label className="block text-xs font-black text-on-surface mb-1">
              المبلغ المراد صرفه وإخلاء طرفه الآن (ج.م) *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={netPaidAmount}
              onChange={(e) => setNetPaidAmount(e.target.value)}
              className="w-full h-11 px-3.5 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-primary outline-none text-base font-mono font-black text-on-surface"
            />
          </div>

          <div className="p-3 rounded-2xl border text-xs font-bold flex items-center justify-between bg-surface-low/60 border-outline-variant/30">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-primary shrink-0" />
              <span>الرصيد المتبقي بعد التسوية (يُرحل للفترة القادمة):</span>
            </div>
            <span className={`font-mono font-black text-sm ${closingBalance === 0 ? 'text-on-surface' : closingBalance > 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
              {closingBalance.toLocaleString('en-US')} ج.م
            </span>
          </div>

          {numericPaid > 0 && (
            <div>
              <label className="block text-xs font-black text-on-surface mb-1">الخزينة المنصرف منها الراتب *</label>
              <select
                value={treasuryId}
                onChange={(e) => setTreasuryId(e.target.value)}
                className="w-full h-10 px-3 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-primary outline-none text-xs font-bold text-on-surface cursor-pointer"
              >
                {treasuryAccounts.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (رصيدها: {Number(t.balance || 0).toLocaleString('en-US')} ج.م)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-on-surface mb-1">تاريخ إثبات التسوية</label>
            <AX_CompanyDatePicker
              value={settlementDate}
              onChange={setSettlementDate}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-on-surface mb-1">بيان التسوية والملاحظات</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-3.5 rounded-2xl bg-surface-lowest border border-outline-variant/50 focus:border-primary outline-none text-xs font-bold text-on-surface"
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-6 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black cursor-pointer shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري التسوية...' : 'إتمام وتثبيت التسوية'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AX_EmployeeSettlementModal
