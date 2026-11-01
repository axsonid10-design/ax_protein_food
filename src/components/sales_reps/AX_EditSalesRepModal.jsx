import React, { useState, useEffect } from 'react'
import {
  X,
  UserCheck,
  Phone,
  Target,
  BadgePercent,
  DollarSign,
  Building,
  CheckCircle2,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { showToast } from '../common/AX_Toast'
import { AX_SalesRepOperationsService } from '../../services/AX_SalesRepOperationsService.js'

const COMMISSION_MODELS = [
  { id: 'volume_rate', label: 'شريحة مبيعات (لكل 1,000 ج.م)', desc: 'مبلغ ثابت لكل شريحة مبيعات' },
  { id: 'category_percentage', label: 'نسبة حسب تصنيف الصنف', desc: 'نسبة مئوية متباينة للأصناف والمصنعات' },
  { id: 'target_tier', label: 'شرائح تحقيق التارجت', desc: 'نسبة متصاعدة + مكافأة تحقيق 100%' },
  { id: 'hybrid', label: 'هجين (نسبة ثابتة + بونص التارجت)', desc: '2% أساسي + 1,000 ج.م بونص التارجت' },
]

export function AX_EditSalesRepModal({ rep, isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const { profile, updateSalesRep, warehouses = [] } = useAXStore()
  const branchOptions = warehouses.length > 0 ? warehouses.map((w) => w.name) : ['المخزن الرئيسي']

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [assignedBranch, setAssignedBranch] = useState(branchOptions[0] || 'المخزن الرئيسي')
  const [targetAmount, setTargetAmount] = useState('')
  const [commissionModel, setCommissionModel] = useState('volume_rate')
  const [stepAmount, setStepAmount] = useState('1000')
  const [stepRate, setStepRate] = useState('50')
  const [balance, setBalance] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (rep) {
      setName(rep.name || '')
      setPhone(rep.phone || '')
      setAssignedBranch(rep.assignedBranch || branchOptions[0] || 'المخزن الرئيسي')
      setTargetAmount(rep.targetAmount ?? rep.salesTarget ?? '')
      setCommissionModel(rep.commissionModel || 'volume_rate')
      setStepAmount(rep.stepAmount || 1000)
      setStepRate(rep.stepRate || 50)
      setBalance(rep.netBalance ?? rep.currentBalance ?? rep.balance ?? 0)
    }
  }, [rep])

  if (!isOpen || !rep) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      showToast('يرجى إدخال اسم المندوب', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      const numTarget = Number(targetAmount) || 0
      const numBal = Number(balance) || 0

      const updates = {
        name: name.trim(),
        phone: phone.trim(),
        assignedBranch,
        targetAmount: numTarget,
        salesTarget: numTarget,
        commissionModel,
        stepAmount: Number(stepAmount) || 1000,
        stepRate: Number(stepRate) || 50,
        netBalance: numBal,
        currentBalance: numBal,
        balance: numBal,
        updatedAt: new Date().toISOString(),
      }

      updateSalesRep(rep.id, updates)
      AX_SalesRepOperationsService.updateSalesRepInDB({ id: rep.id, ...updates }, profile)
      showToast('تم تحديث بيانات المندوب بنجاح', 'success')
      onClose()
    } catch {
      showToast('حدث خطأ أثناء تعديل بيانات المندوب', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-level3 space-y-4 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-on-surface">تعديل بيانات المندوب</h3>
              <p className="text-xs text-on-surface-variant font-mono">{rep.name}</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface">
                اسم المندوب <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-semibold bg-surface-lowest text-on-surface outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" />
                رقم الهاتف
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-semibold bg-surface-lowest text-on-surface outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-primary" />
                الفرع أو خط التوزيع
              </label>
              <select
                value={assignedBranch}
                onChange={(e) => setAssignedBranch(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-semibold bg-surface-lowest text-on-surface outline-none cursor-pointer"
              >
                {branchOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                المستهدف البيعي (التارجت ج.م)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-bold bg-surface-lowest text-on-surface outline-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-2 bg-surface-low/50 p-3.5 rounded-2xl border border-outline-variant/30">
            <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <BadgePercent className="w-3.5 h-3.5 text-primary" />
              نظام احتساب العمولة المعتمد
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMMISSION_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCommissionModel(m.id)}
                  className={`text-right p-2.5 rounded-xl border transition-all text-xs ${
                    commissionModel === m.id
                      ? 'border-primary bg-primary/10 text-primary font-black shadow-xs'
                      : 'border-outline-variant/40 bg-surface-lowest text-on-surface-variant hover:bg-surface-low'
                  }`}
                >
                  <div className="font-bold">{m.label}</div>
                  <div className="text-[10px] text-on-surface-variant/80 font-normal mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>

            {commissionModel === 'volume_rate' && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-on-surface">قيمة الشريحة (ج.م)</span>
                  <input
                    type="number"
                    value={stepAmount}
                    onChange={(e) => setStepAmount(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-full border border-outline-variant/50 text-xs font-mono font-bold bg-surface-lowest"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-on-surface">عمولة الشريحة (ج.م)</span>
                  <input
                    type="number"
                    value={stepRate}
                    onChange={(e) => setStepRate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-full border border-outline-variant/50 text-xs font-mono font-bold bg-surface-lowest"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1 bg-surface-low/50 p-3 rounded-2xl border border-outline-variant/30">
            <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              الرصيد الحالي المستحق للمندوب (ج.م)
            </label>
            <input
              type="number"
              step="any"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-bold bg-surface-lowest text-on-surface outline-none font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-5 rounded-full border border-outline-variant/60 text-xs sm:text-sm font-bold text-on-surface hover:bg-surface-container transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-black shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'تحديث البيانات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AX_EditSalesRepModal
