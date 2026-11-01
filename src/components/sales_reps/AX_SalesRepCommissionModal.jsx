import React, { useState, useMemo } from 'react'
import {
  X,
  BadgePercent,
  Calculator,
  Target,
  DollarSign,
  TrendingUp,
  Layers,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { calculateCommission } from './AX_CommissionEngine'
import { showToast } from '../common/AX_Toast'
import { AX_SalesRepOperationsService } from '../../services/AX_SalesRepOperationsService.js'

export function AX_SalesRepCommissionModal({ rep, isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const { profile, invoices = [], addSalesRepTransaction } = useAXStore()

  const [simulatedSales, setSimulatedSales] = useState('')
  const [useRealInvoices, setUseRealInvoices] = useState(true)

  const repInvoices = useMemo(() => {
    if (!rep?.id) return []
    return (invoices || []).filter(
      (inv) => inv && (inv.salesRepId === rep.id || inv.repName === rep.name)
    )
  }, [rep, invoices])

  const realSalesTotal = useMemo(() => {
    return repInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount || inv.total) || 0), 0)
  }, [repInvoices])

  const calculationResult = useMemo(() => {
    if (!rep) return { totalCommission: 0, totalSales: 0, breakdown: [] }

    if (useRealInvoices) {
      const salesPayload = repInvoices.map((inv) => ({
        total: Number(inv.totalAmount || inv.total) || 0,
        items: inv.items || [],
      }))
      return calculateCommission(rep, salesPayload)
    } else {
      const amount = Number(simulatedSales) || 0
      return calculateCommission(rep, [{ total: amount, items: [] }])
    }
  }, [rep, useRealInvoices, repInvoices, simulatedSales])

  if (!isOpen || !rep) return null

  const target = Number(rep.targetAmount ?? rep.salesTarget ?? 0)
  const attainmentPct = target > 0 ? Math.round((calculationResult.totalSales / target) * 100) : 0

  const handleApplyToLedger = () => {
    if (calculationResult.totalCommission <= 0) {
      showToast('لا توجد عمولة مستحقة للترحيل', 'warning')
      return
    }

    const tx = {
      id: `comm-${Date.now()}`,
      repId: rep.id,
      amount: calculationResult.totalCommission,
      type: 'commission',
      description: `عمولة مبيعات بقيمة ${calculationResult.totalSales.toLocaleString('en-US')} ج.م (نظام ${rep.commissionModel || 'volume_rate'})`,
      notes: `عمولة مبيعات بقيمة ${calculationResult.totalSales.toLocaleString('en-US')} ج.م (نظام ${rep.commissionModel || 'volume_rate'})`,
      date: new Date().toISOString().split('T')[0],
    }

    addSalesRepTransaction(rep.id, tx)
    AX_SalesRepOperationsService.addSalesRepTransactionInDB(tx, profile)
    showToast('تم ترحيل العمولة لحساب المندوب بنجاح', 'success')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-level3 space-y-4 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-on-surface">حاسبة ومحرك العمولات</h3>
              <p className="text-xs text-on-surface-variant font-mono">{rep.name} • {rep.assignedBranch || 'الفرع الرئيسي'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 p-1 bg-surface-low rounded-full border border-outline-variant/30 text-xs font-bold">
          <button
            type="button"
            onClick={() => setUseRealInvoices(true)}
            className={`flex-1 py-1.5 px-3 rounded-full transition-all ${
              useRealInvoices ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'
            }`}
          >
            فواتير المبيعات الفعلية ({repInvoices.length} فاتورة)
          </button>
          <button
            type="button"
            onClick={() => setUseRealInvoices(false)}
            className={`flex-1 py-1.5 px-3 rounded-full transition-all ${
              !useRealInvoices ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'
            }`}
          >
            محاكاة بمبلغ مبيعات مخصص
          </button>
        </div>

        {!useRealInvoices && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface">أدخل مبلغ المبيعات المراد حسابه (ج.م)</label>
            <input
              type="number"
              min="0"
              value={simulatedSales}
              onChange={(e) => setSimulatedSales(e.target.value)}
              placeholder="مثال: 50000"
              className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-sm font-bold bg-surface-lowest text-on-surface font-mono outline-none"
            />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي المبيعات</span>
            <span className="text-sm font-black font-mono text-on-surface">
              {calculationResult.totalSales.toLocaleString('en-US')} ج.م
            </span>
          </div>

          <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-on-surface-variant block">المستهدف (التارجت)</span>
            <span className="text-sm font-black font-mono text-on-surface">
              {target.toLocaleString('en-US')} ج.م
            </span>
          </div>

          <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-on-surface-variant block">نسبة التحقيق</span>
            <span className={`text-sm font-black font-mono ${attainmentPct >= 100 ? 'text-emerald-700' : 'text-primary'}`}>
              {attainmentPct}%
            </span>
          </div>

          <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-on-surface-variant block">العمولة المستحقة</span>
            <span className="text-base font-black font-mono text-emerald-700">
              {calculationResult.totalCommission.toLocaleString('en-US')} ج.م
            </span>
          </div>
        </div>

        <div className="border border-outline-variant/30 rounded-2xl p-3.5 bg-surface-low/40 space-y-2">
          <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            تفاصيل صيغة الاحتساب المطبقة ({rep.commissionModel || 'volume_rate'})
          </span>

          {calculationResult.breakdown.map((b, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-outline-variant/20 last:border-none">
              <span className="text-on-surface-variant">
                {b.type === 'volume_rate' && `${b.steps} شريحة × ${b.stepRate} ج.م لكل ${b.stepAmount} ج.م مبيعات`}
                {b.type === 'category_percentage' && `${b.category}: ${b.amount?.toLocaleString('en-US')} ج.م × ${(b.rate * 100)}%`}
                {b.type === 'target_tier' && `نسبة ${(b.appliedRate * 100)}% ${b.bonus > 0 ? `+ بونص تحقيق ${b.bonus} ج.م` : ''}`}
                {b.type === 'hybrid' && `عمولة أساسية ${b.baseComm?.toLocaleString('en-US')} ج.م + بونص ${b.tierBonus} ج.م`}
              </span>
              <span className="font-mono font-black text-emerald-700">
                {(b.commission || 0).toLocaleString('en-US')} ج.م
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-container">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-full border border-outline-variant/60 text-xs sm:text-sm font-bold text-on-surface hover:bg-surface-container transition-all"
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={handleApplyToLedger}
            className="py-2.5 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-black shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ترحيل العمولة للحساب</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AX_SalesRepCommissionModal
