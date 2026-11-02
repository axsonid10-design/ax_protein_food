import React from 'react'
import {
  FileSpreadsheet,
  Edit2,
  Trash2,
  Building2,
  Phone,
  Layers,
  Tag,
} from 'lucide-react'
import { getSupplyTypeLabel } from './supplierConstants'

export function AX_SuppliersTable({
  suppliers = [],
  onOpenDetails,
  onOpenLedger,
  onEditSupplier,
  onDeleteSupplier,
}) {
  const handleDetails = onOpenDetails || onOpenLedger

  return (
    <div className="hidden lg:block w-full bg-surface-lowest border border-outline-variant/30 rounded-3xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-surface-container/60 border-b border-outline-variant/30 text-on-surface font-black select-none">
            <tr className="h-11">
              <th className="px-4 whitespace-nowrap">الشركة / المورد</th>
              <th className="px-3 whitespace-nowrap">المسؤول</th>
              <th className="px-3 whitespace-nowrap">الهاتف</th>
              <th className="px-3 whitespace-nowrap">نوع التوريد</th>
              <th className="px-3 whitespace-nowrap">القسم</th>
              <th className="px-3 whitespace-nowrap font-mono">الرصيد المستحق</th>
              <th className="px-4 whitespace-nowrap text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {suppliers.map((s) => {
              const bal = Number(s.balance) || 0
              const isPayable = bal > 0
              const isReceivable = bal < 0

              return (
                <tr
                  key={s.id}
                  className="h-12 hover:bg-surface-container/30 transition-colors duration-150"
                >
                  <td className="px-4 font-black text-on-surface whitespace-nowrap">
                    <div
                      className="flex items-center gap-2 cursor-pointer group"
                      onClick={() => onOpenDetails && onOpenDetails(s)}
                      title="عرض الملف المالي والتفصيلي 360°"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate max-w-[200px] group-hover:text-primary transition-colors font-black" title={s.companyName || s.name}>
                        {s.companyName || s.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-3 text-on-surface-variant font-bold whitespace-nowrap">
                    {s.contactPerson || '—'}
                  </td>

                  <td className="px-3 font-mono text-on-surface-variant whitespace-nowrap">
                    {s.phone ? (
                      <a
                        href={`tel:${s.phone}`}
                        className="flex items-center gap-1 hover:text-primary hover:underline"
                        dir="ltr"
                      >
                        <Phone className="w-3 h-3 text-outline-variant" />
                        {s.phone}
                      </a>
                    ) : (
                      <span className="text-outline-variant">—</span>
                    )}
                  </td>

                  <td className="px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                      <Layers className="w-3 h-3" />
                      {getSupplyTypeLabel(s.supplyType)}
                    </span>
                  </td>

                  <td className="px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-bold text-[11px]">
                      <Tag className="w-3 h-3 text-outline-variant" />
                      {s.category || 'خامات'}
                    </span>
                  </td>

                  <td className="px-3 font-mono font-black whitespace-nowrap">
                    <span
                      className={
                        isPayable
                          ? 'text-red-800'
                          : isReceivable
                          ? 'text-emerald-700'
                          : 'text-on-surface-variant'
                      }
                    >
                      {Math.abs(bal).toLocaleString('en-US')} ج.م
                    </span>
                    <span className="text-[10px] mr-1 text-on-surface-variant font-normal">
                      {isPayable ? '(له)' : isReceivable ? '(مقدم له)' : ''}
                    </span>
                  </td>

                  <td className="px-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDetails(s)}
                        className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all cursor-pointer"
                        title="كشف حساب 360°"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditSupplier(s)}
                        className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all cursor-pointer"
                        title="تعديل بيانات المورد"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSupplier(s)}
                        className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-red-50 text-on-surface-variant hover:text-red-700 transition-all cursor-pointer"
                        title="حذف المورد"
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

export default AX_SuppliersTable
