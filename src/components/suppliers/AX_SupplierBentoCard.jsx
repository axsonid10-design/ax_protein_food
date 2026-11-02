import React from 'react'
import {
  FileSpreadsheet,
  Edit2,
  Trash2,
  Building2,
  Phone,
  Layers,
  Tag,
  MapPin,
} from 'lucide-react'
import { getSupplyTypeLabel } from './supplierConstants'

export function AX_SupplierBentoCard({
  supplier,
  onOpenDetails,
  onEditSupplier,
  onDeleteSupplier,
}) {
  const bal = Number(supplier.balance) || 0
  const isPayable = bal > 0
  const isReceivable = bal < 0

  return (
    <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 cursor-pointer" onClick={() => onOpenDetails && onOpenDetails(supplier)} title="عرض الملف التفصيلي 360°">
            <h4 className="text-xs font-black text-on-surface hover:text-primary transition-colors truncate">
              {supplier.companyName || supplier.name}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
              {supplier.contactPerson && (
                <span className="font-bold truncate">{supplier.contactPerson}</span>
              )}
              {supplier.phone && (
                <a
                  href={`tel:${supplier.phone}`}
                  className="flex items-center gap-0.5 font-mono text-primary hover:underline"
                  dir="ltr"
                >
                  <Phone className="w-2.5 h-2.5" />
                  {supplier.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex-shrink-0">
          <Layers className="w-2.5 h-2.5" />
          {getSupplyTypeLabel(supplier.supplyType)}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-container">
        <div className="flex items-center gap-1 text-[11px] text-on-surface-variant truncate">
          <MapPin className="w-3 h-3 text-outline-variant flex-shrink-0" />
          <span className="truncate">{supplier.address || 'غير محدد'}</span>
        </div>

        <div className="text-left font-mono font-black">
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
        </div>
      </div>

      <div className="flex items-center justify-between gap-1.5 pt-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-bold text-[10px] truncate">
          <Tag className="w-2.5 h-2.5 text-outline-variant" />
          {supplier.category || 'خامات'}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenDetails(supplier)}
            className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all cursor-pointer"
            title="كشف حساب 360°"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEditSupplier(supplier)}
            className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all cursor-pointer"
            title="تعديل"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteSupplier(supplier)}
            className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-red-50 text-on-surface-variant hover:text-red-700 transition-all cursor-pointer"
            title="حذف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AX_SupplierBentoCard
