import React from 'react'
import { getSupplyTypeLabel } from './supplierConstants'

export function AX_SupplierProfileTab({ supplier }) {
  if (!supplier) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-surface-container/20 p-4 rounded-2xl border border-outline-variant/20">
      <div>
        <span className="text-on-surface-variant font-bold block">اسم الشركة / المنشأة:</span>
        <span className="font-black text-on-surface">{supplier.companyName || supplier.name}</span>
      </div>
      <div>
        <span className="text-on-surface-variant font-bold block">الشخص المسؤول:</span>
        <span className="font-black text-on-surface">{supplier.contactPerson || '—'}</span>
      </div>
      <div>
        <span className="text-on-surface-variant font-bold block">رقم الهاتف:</span>
        <span className="font-mono text-on-surface">{supplier.phone || '—'}</span>
      </div>
      <div>
        <span className="text-on-surface-variant font-bold block">هاتف إضافي:</span>
        <span className="font-mono text-on-surface">{supplier.phone2 || '—'}</span>
      </div>
      <div>
        <span className="text-on-surface-variant font-bold block">نوع التوريد:</span>
        <span className="font-bold text-primary">{getSupplyTypeLabel(supplier.supplyType)}</span>
      </div>
      <div>
        <span className="text-on-surface-variant font-bold block">القسم / التصنيف:</span>
        <span className="font-bold text-on-surface">{supplier.category || 'خامات'}</span>
      </div>
      <div>
        <span className="text-on-surface-variant font-bold block">السجل التجاري:</span>
        <span className="font-mono text-on-surface">{supplier.commercialRegistration || supplier.commercialRegister || '—'}</span>
      </div>
      <div>
        <span className="text-on-surface-variant font-bold block">البطاقة الضريبية:</span>
        <span className="font-mono text-on-surface">{supplier.taxNumber || '—'}</span>
      </div>
      <div className="sm:col-span-2">
        <span className="text-on-surface-variant font-bold block">العنوان:</span>
        <span className="text-on-surface">{supplier.address || '—'}</span>
      </div>
      {supplier.notes && (
        <div className="sm:col-span-2">
          <span className="text-on-surface-variant font-bold block">ملاحظات:</span>
          <span className="text-on-surface">{supplier.notes}</span>
        </div>
      )}
    </div>
  )
}

export default AX_SupplierProfileTab
