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
  Receipt,
} from 'lucide-react'

const MODEL_LABELS = {
  volume_rate: 'شريحة مبيعات',
  category_percentage: 'نسبة تصنيف',
  target_tier: 'شرائح تارجت',
  hybrid: 'نظام هجين',
}

export function AX_SalesRepsTable({
  salesReps = [],
  clients = [],
  onOpenLedger,
  onOpenCalculator,
  onOpenCollection,
  onEditRep,
  onDeleteRep,
}) {
  return (
    <div className="hidden lg:block w-full bg-surface-lowest border border-outline-variant/30 rounded-3xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-surface-container/60 border-b border-outline-variant/30 text-on-surface font-black select-none">
            <tr className="h-11">
              <th className="px-4 whitespace-nowrap">المندوب</th>
              <th className="px-3 whitespace-nowrap">الفرع / خط السير</th>
              <th className="px-3 whitespace-nowrap">المستهدف (التارجت)</th>
              <th className="px-3 whitespace-nowrap">نظام العمولة</th>
              <th className="px-3 whitespace-nowrap font-mono">الرصيد المستحق</th>
              <th className="px-3 whitespace-nowrap font-mono">مديونيات التحصيل</th>
              <th className="px-4 whitespace-nowrap text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {salesReps.map((r) => {
              const bal = Number(r.netBalance ?? r.currentBalance ?? r.balance ?? 0)
              const target = Number(r.targetAmount ?? r.salesTarget ?? 0)
              const assignedClients = (clients || []).filter((c) => (c.salesRepName || '').trim() === r.name?.trim())
              const debtClients = assignedClients.filter((c) => (Number(c.balance) || 0) > 0)
              const totalClientDebt = debtClients.reduce((sum, c) => sum + (Number(c.balance) || 0), 0)

              return (
                <tr
                  key={r.id}
                  className="h-12 hover:bg-surface-container/30 transition-colors duration-150"
                >
                  <td className="px-4 font-black text-on-surface whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate max-w-[180px]" title={r.name}>{r.name}</span>
                    </div>
                  </td>

                  <td className="px-3 text-on-surface-variant whitespace-nowrap font-bold">
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-outline-variant" />
                      {r.assignedBranch || 'الفرع الرئيسي'}
                    </span>
                  </td>

                  <td className="px-3 font-mono font-bold text-on-surface whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-primary" />
                      {target.toLocaleString('en-US')} ج.م
                    </span>
                  </td>

                  <td className="px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                      <BadgePercent className="w-3 h-3" />
                      {MODEL_LABELS[r.commissionModel] || r.commissionModel || 'شريحة'}
                    </span>
                  </td>

                  <td className="px-3 font-mono font-black whitespace-nowrap">
                    <span className={bal > 0 ? 'text-emerald-700' : 'text-on-surface-variant'}>
                      {bal.toLocaleString('en-US')} ج.م
                    </span>
                  </td>

                  <td className="px-3 font-mono whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onOpenCollection && onOpenCollection(r)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-800 transition-all font-black text-xs cursor-pointer border border-red-200"
                      title="عرض وطباعة كشف تحصيل مديونيات العملاء A4"
                    >
                      <Receipt className="w-3 h-3 text-red-700" />
                      <span>{totalClientDebt.toLocaleString('en-US')} ج.م</span>
                      <span className="text-[10px] text-red-600 font-normal">({debtClients.length})</span>
                    </button>
                  </td>

                  <td className="px-4 whitespace-nowrap text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenCollection && onOpenCollection(r)}
                        title="طباعة كشف تحصيل العملاء (A4)"
                        className="p-1.5 rounded-full border border-outline-variant/40 hover:border-red-500/40 text-red-800 hover:text-red-900 hover:bg-red-50 transition-all cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenCalculator(r)}
                        title="حاسبة العمولات"
                        className="p-1.5 rounded-full border border-outline-variant/40 hover:border-primary/40 text-on-surface-variant hover:text-primary hover:bg-surface-low transition-all"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenLedger(r)}
                        title="كشف حساب 360°"
                        className="p-1.5 rounded-full border border-outline-variant/40 hover:border-primary/40 text-on-surface-variant hover:text-primary hover:bg-surface-low transition-all"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditRep(r)}
                        title="تعديل المندوب"
                        className="p-1.5 rounded-full border border-outline-variant/40 hover:border-primary/40 text-on-surface-variant hover:text-primary hover:bg-surface-low transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRep(r)}
                        title="حذف المندوب"
                        className="p-1.5 rounded-full border border-outline-variant/40 hover:border-red-500/40 text-on-surface-variant hover:text-red-700 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AX_SalesRepsTable
