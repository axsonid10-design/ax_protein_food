import React from 'react'
import {
  Building,
  Phone,
  MapPin,
  Tag,
  AlertTriangle,
  FileSpreadsheet,
  Edit2,
  Trash2,
  PhoneCall,
  Eye,
  UserCheck,
} from 'lucide-react'
import { getTransformedUrl } from '../../services/imageKitService'

export function AX_CustomerBentoCard({
  customer,
  onOpenDetails,
  onOpenLedger,
  onEditCustomer,
  onDeleteCustomer,
}) {
  if (!customer) return null

  const bal = Number(customer.balance) || 0
  const isDebtor = bal > 0
  const isCreditor = bal < 0

  const primaryPhoto =
    customer.imageUrl ||
    (customer.attachments && customer.attachments.length > 0
      ? customer.attachments[0].thumbnailUrl || customer.attachments[0].url
      : null)

  const transformedPhoto = primaryPhoto
    ? getTransformedUrl(primaryPhoto, { width: 80, height: 80, quality: 80 })
    : null

  const handleOpenDetails = () => {
    if (onOpenDetails) onOpenDetails(customer)
    else if (onOpenLedger) onOpenLedger(customer)
  }

  return (
    <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between space-y-3 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {transformedPhoto ? (
            <img
              src={transformedPhoto}
              alt=""
              className="w-9 h-9 rounded-full object-cover border border-outline-variant/40 flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-black text-xs">
              <Building className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0 cursor-pointer" onClick={handleOpenDetails} title="عرض الملف التفصيلي 360°">
            <h4 className="text-xs sm:text-sm font-black text-on-surface hover:text-primary transition-colors truncate">{customer.name}</h4>
            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-medium">
              {customer.phone ? (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-0.5 font-mono text-primary hover:underline"
                >
                  <Phone className="w-2.5 h-2.5" />
                  <span>{customer.phone}</span>
                </a>
              ) : (
                <span className="text-outline-variant">بدون هاتف</span>
              )}
            </div>
          </div>
        </div>

        {customer.isIncomplete ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 font-black text-[10px] border border-amber-500/30 flex-shrink-0">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            بيانات ناقصة
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 font-bold text-[10px] flex-shrink-0">
            مكتمل
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-surface-container">
        <div className="flex items-center gap-1 text-[11px] text-on-surface-variant truncate">
          <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
          <span className="truncate">
            {[customer.governorate, customer.city, customer.district || customer.address].filter(Boolean).join(' • ') || 'غير محدد'}
          </span>
        </div>

        <div className="text-left font-mono font-black flex items-center gap-1">
          <span className={isDebtor ? 'text-red-800' : isCreditor ? 'text-emerald-700' : 'text-on-surface-variant'}>
            {Math.abs(bal).toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-on-surface-variant font-normal">
            {isDebtor ? '(مدين)' : isCreditor ? '(دائن)' : ''}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1.5 pt-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px] truncate max-w-[120px]" title={customer.salesRepName || 'إدارة مباشرة'}>
            <UserCheck className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{customer.salesRepName || 'إدارة مباشرة'}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-bold text-[10px] truncate max-w-[90px]">
            <Tag className="w-2.5 h-2.5 text-primary flex-shrink-0" />
            <span className="truncate">{customer.primaryCategory || 'عام'}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all"
              title="اتصال هاتفياً"
            >
              <PhoneCall className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={handleOpenDetails}
            className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all"
            title="الملف التفصيلي 360°"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEditCustomer && onEditCustomer(customer)}
            className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all"
            title="تعديل بيانات العميل"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteCustomer && onDeleteCustomer(customer)}
            className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-red-50 text-on-surface-variant hover:text-red-700 transition-all"
            title="حذف العميل"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AX_CustomerBentoCard
