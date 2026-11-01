import React from 'react'
import {
  FileSpreadsheet,
  Edit2,
  Trash2,
  AlertTriangle,
  Phone,
  Tag,
  Building,
  Eye,
} from 'lucide-react'

export function AX_CustomersTable({
  customers = [],
  onOpenDetails,
  onOpenLedger,
  onEditCustomer,
  onDeleteCustomer,
}) {
  const handleDetailsClick = (c) => {
    if (onOpenDetails) onOpenDetails(c)
    else if (onOpenLedger) onOpenLedger(c)
  }

  return (
    <div className="hidden lg:block w-full bg-surface-lowest border border-outline-variant/30 rounded-3xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-surface-container/60 border-b border-outline-variant/30 text-on-surface font-black select-none">
            <tr className="h-11">
              <th className="px-4 whitespace-nowrap">العميل</th>
              <th className="px-3 whitespace-nowrap">الهاتف</th>
              <th className="px-3 whitespace-nowrap">الموقع الجغرافي</th>
              <th className="px-3 whitespace-nowrap">التصنيف</th>
              <th className="px-3 whitespace-nowrap font-mono">الرصيد الحالي</th>
              <th className="px-3 whitespace-nowrap text-center">الحالة</th>
              <th className="px-4 whitespace-nowrap text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {customers.map((c) => {
              const bal = Number(c.balance) || 0
              const isDebtor = bal > 0
              const isCreditor = bal < 0

              return (
                <tr
                  key={c.id}
                  className="h-12 hover:bg-surface-container/30 transition-colors duration-150"
                >
                  <td className="px-4 font-black text-on-surface whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Building className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate max-w-[180px]" title={c.name}>{c.name}</span>
                    </div>
                  </td>

                  <td className="px-3 font-mono text-on-surface-variant whitespace-nowrap">
                    {c.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-outline-variant" />
                        {c.phone}
                      </span>
                    ) : (
                      <span className="text-outline-variant">—</span>
                    )}
                  </td>

                  <td className="px-3 text-on-surface-variant whitespace-nowrap">
                    <span className="truncate max-w-[150px] inline-block" title={`${c.governorate || ''} ${c.city || ''} ${c.district || ''}`}>
                      {[c.governorate, c.city, c.district].filter(Boolean).join(' • ') || c.address || '—'}
                    </span>
                  </td>

                  <td className="px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-bold text-[11px]">
                      <Tag className="w-3 h-3 text-primary" />
                      {c.primaryCategory || 'عام'} {c.subCategory ? `• ${c.subCategory}` : ''}
                    </span>
                  </td>

                  <td className="px-3 font-mono font-black whitespace-nowrap">
                    <span className={isDebtor ? 'text-red-800' : isCreditor ? 'text-emerald-700' : 'text-on-surface-variant'}>
                      {Math.abs(bal).toLocaleString('en-US')} ج.م
                    </span>
                    <span className="text-[10px] mr-1 text-on-surface-variant font-normal">
                      {isDebtor ? '(مدين)' : isCreditor ? '(دائن)' : ''}
                    </span>
                  </td>

                  <td className="px-3 text-center whitespace-nowrap">
                    {c.isIncomplete ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 font-black text-[10px] border border-amber-500/30">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        بيانات ناقصة
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 font-bold text-[10px]">
                        مكتمل
                      </span>
                    )}
                  </td>

                  <td className="px-4 whitespace-nowrap text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDetailsClick(c)}
                        title="الملف التفصيلي 360°"
                        className="p-1.5 rounded-full border border-outline-variant/40 hover:border-primary/40 text-on-surface-variant hover:text-primary hover:bg-surface-low transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditCustomer && onEditCustomer(c)}
                        title="تعديل العميل"
                        className="p-1.5 rounded-full border border-outline-variant/40 hover:border-primary/40 text-on-surface-variant hover:text-primary hover:bg-surface-low transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCustomer && onDeleteCustomer(c)}
                        title="حذف العميل"
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

export default AX_CustomersTable
