import React from 'react'
import {
  FileSpreadsheet,
  Calculator,
  Edit2,
  Trash2,
  User,
  Building,
  Target,
  BadgePercent,
  Phone,
} from 'lucide-react'

const MODEL_LABELS = {
  volume_rate: 'شريحة مبيعات',
  category_percentage: 'نسبة تصنيف',
  target_tier: 'شرائح تارجت',
  hybrid: 'نظام هجين',
}

export function AX_SalesRepsBentoCards({
  salesReps,
  onOpenLedger,
  onOpenCalculator,
  onEditRep,
  onDeleteRep,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
      {salesReps.map((r) => {
        const bal = Number(r.netBalance ?? r.currentBalance ?? r.balance ?? 0)
        const target = Number(r.targetAmount ?? r.salesTarget ?? 0)

        return (
          <div
            key={r.id}
            className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-on-surface truncate">{r.name}</h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                    {r.phone && (
                      <span className="flex items-center gap-0.5 font-mono">
                        <Phone className="w-2.5 h-2.5" />
                        {r.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex-shrink-0">
                <BadgePercent className="w-2.5 h-2.5" />
                {MODEL_LABELS[r.commissionModel] || 'شريحة'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-surface-container">
              <div>
                <span className="text-[10px] text-on-surface-variant block">المستهدف (التارجت)</span>
                <span className="font-mono font-bold text-on-surface">
                  {target.toLocaleString('en-US')} ج.م
                </span>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-on-surface-variant block">الرصيد المستحق</span>
                <span className={`font-mono font-black ${bal > 0 ? 'text-emerald-700' : 'text-on-surface-variant'}`}>
                  {bal.toLocaleString('en-US')} ج.م
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-1">
              <span className="inline-flex items-center gap-1 text-[10px] text-on-surface-variant font-bold truncate">
                <Building className="w-3 h-3 text-outline-variant flex-shrink-0" />
                <span className="truncate">{r.assignedBranch || 'الفرع الرئيسي'}</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenCalculator(r)}
                  className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all"
                  title="حاسبة العمولات"
                >
                  <Calculator className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLedger(r)}
                  className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all"
                  title="كشف حساب"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onEditRep(r)}
                  className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all"
                  title="تعديل"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRep(r)}
                  className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-red-50 text-on-surface-variant hover:text-red-700 transition-all"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default AX_SalesRepsBentoCards
