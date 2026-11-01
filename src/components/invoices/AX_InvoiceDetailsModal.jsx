import React from 'react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

export function AX_InvoiceDetailsModal({ invoice, onClose }) {
  useBodyScrollLock(Boolean(invoice))
  if (!invoice) return null

  const items = invoice.items || []
  const subtotal = Number(invoice.subtotal) || 0
  const transportCost = Number(invoice.transportCost) || 0
  const loadingCost = Number(invoice.loadingCost) || 0
  const total = Number(invoice.total) || 0
  const paidAmount = Number(invoice.paidAmount) || 0
  const remainingAmount = Number(invoice.remainingAmount) || 0
  const status = invoice.status || (remainingAmount > 0 ? (paidAmount > 0 ? 'partial' : 'unpaid') : 'paid')
  const paymentTerms = invoice.paymentTerms || (status === 'paid' ? 'مدفوع كلي' : status === 'partial' ? 'مدفوع جزئي' : 'غير مدفوع')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-level3 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary">
                {invoice.code}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                  status === 'paid'
                    ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                    : status === 'partial'
                    ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                    : 'bg-surface-low text-on-surface-variant border border-outline-variant/30'
                }`}
              >
                {status === 'paid' ? 'مدفوع كلي' : status === 'partial' ? 'مدفوع جزئي' : 'غير مدفوع'}
              </span>
            </div>
            <h3 className="text-base font-black text-on-surface mt-0.5">
              تفاصيل الفاتورة — {invoice.partyName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface text-xs font-bold px-3 py-1 rounded-full bg-surface-low cursor-pointer"
          >
            إغلاق
          </button>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-on-surface-variant block">بنود الفاتورة:</span>
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 rounded-xl bg-surface-low text-xs font-bold"
            >
              <span>{item.compositeName || 'صنف'}</span>
              <span className="font-mono">
                {item.quantity} {item.unit} × {item.price} = {(Number(item.total) || 0).toLocaleString('en-US')} ج.م
              </span>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-2xl bg-surface-low space-y-1.5 text-xs border border-surface-container">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">قيمة البضاعة:</span>
            <span className="font-mono font-bold">{subtotal.toLocaleString('en-US')} ج.م</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">مصاريف نقل وشحن:</span>
            <span className="font-mono font-bold">{transportCost.toLocaleString('en-US')} ج.م</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">مصاريف شيالة ومخازن:</span>
            <span className="font-mono font-bold">{loadingCost.toLocaleString('en-US')} ج.م</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-surface-container font-black text-sm text-primary">
            <span>إجمالي الفاتورة:</span>
            <span className="font-mono">{total.toLocaleString('en-US')} ج.م</span>
          </div>
          <div className="flex justify-between text-emerald-600 font-bold">
            <span>المبلغ المسدد:</span>
            <span className="font-mono">{paidAmount.toLocaleString('en-US')} ج.م</span>
          </div>
          <div className="flex justify-between text-error font-bold">
            <span>المتبقي الآجل:</span>
            <span className="font-mono">{remainingAmount.toLocaleString('en-US')} ج.م</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-surface-container text-[11px] text-on-surface-variant">
            <span>شروط السداد:</span>
            <span className="font-bold">{paymentTerms}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AX_InvoiceDetailsModal
