import React, { useState } from 'react'
import { ShieldCheck, Building2, Users, Sliders, CheckCircle2, Lock } from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'

export function AX_MasterSystemControl({ isOpen, onClose }) {
  const { profile, systemSettings, updateSystemSettings, warehouses } = useAXStore()

  const isMaster = profile?.isMaster || profile?.role === 'super_admin'

  const [maxWh, setMaxWh] = useState(systemSettings?.maxWarehouses || 3)
  const [maxUsr, setMaxUsr] = useState(systemSettings?.maxUsers || 5)
  const [savedSuccess, setSavedSuccess] = useState(false)

  if (!isOpen) return null

  if (!isMaster) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-surface-lowest border border-error/30 rounded-3xl p-6 text-center space-y-3 max-w-sm w-full">
          <Lock className="w-10 h-10 text-error mx-auto" />
          <h3 className="text-sm font-black text-on-surface">صلاحية محظورة</h3>
          <p className="text-xs text-on-surface-variant font-bold">
            هذه الشاشة مخصصة لإدارة التراخيص العامة لـ AXONID فقط.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-primary text-white text-xs font-black"
          >
            إغلاق
          </button>
        </div>
      </div>
    )
  }

  const handleSave = (e) => {
    e.preventDefault()
    updateSystemSettings({
      maxWarehouses: Number(maxWh) || 1,
      maxUsers: Number(maxUsr) || 1,
    })
    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
      onClose()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <form
        onSubmit={handleSave}
        className="bg-surface-lowest border-2 border-primary/30 rounded-3xl p-6 shadow-level3 max-w-md w-full space-y-5"
      >
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-black text-on-surface">إدارة تراخيص العميل</h3>
              <span className="text-[11px] font-mono text-primary font-bold">
                AXONID Master Sentinel
              </span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-black border border-amber-500/20">
            خاص بالمدير العام
          </span>
        </div>

        {savedSuccess && (
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>تم حفظ حدود الخطة والتراخيص بنجاح</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-surface-low p-3.5 rounded-2xl border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-on-surface flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" />
                الحد الأقصى للفروع والمخازن
              </span>
              <span className="font-mono font-bold text-on-surface-variant text-[11px]">
                المستخدم حالياً: {warehouses.length}
              </span>
            </div>
            <input
              type="number"
              min="1"
              max="50"
              required
              value={maxWh}
              onChange={(e) => setMaxWh(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-bold text-on-surface font-mono"
            />
            <span className="text-[10px] text-on-surface-variant block">
              لن يتمكن العميل من إنشاء مخازن أو فروع تتجاوز هذا العدد.
            </span>
          </div>

          <div className="bg-surface-low p-3.5 rounded-2xl border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-on-surface flex items-center gap-1.5">
                <Users className="w-4 h-4 text-secondary" />
                الحد الأقصى لمستخدمي النظام
              </span>
            </div>
            <input
              type="number"
              min="1"
              max="100"
              required
              value={maxUsr}
              onChange={(e) => setMaxUsr(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-bold text-on-surface font-mono"
            />
            <span className="text-[10px] text-on-surface-variant block">
              يحدد سقف الحسابات والموظفين المسموح بإنشائهم في المنظومة.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold hover:bg-surface-high transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
          >
            حفظ التراخيص
          </button>
        </div>
      </form>
    </div>
  )
}

export default AX_MasterSystemControl
