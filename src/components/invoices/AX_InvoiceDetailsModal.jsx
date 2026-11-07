import React, { useState } from 'react'
import { Printer, X, RotateCcw, Edit3, Trash2 } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'
import { AX_InvoicePrintModal } from './AX_InvoicePrintModal'
import { AX_InvoiceReturnModal } from './AX_InvoiceReturnModal'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'

export function AX_InvoiceDetailsModal({
  invoice,
  onClose,
  warehouses = [],
  treasuryAccounts = [],
  onSaveReturn,
  onEdit,
  onDelete,
}) {
  useBodyScrollLock(Boolean(invoice))
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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

  const isEligibleForReturn = invoice.type === 'sale' || invoice.type === 'purchase'

  const getTypeLabel = (type) => {
    switch (type) {
      case 'sale_return':
        return 'مردود مبيعات'
      case 'purchase_return':
        return 'مردود مشتريات'
      case 'purchase':
        return 'فاتورة مشتريات'
      default:
        return 'فاتورة بيع'
    }
  }

  const getTypeStyle = (type) => {
    switch (type) {
      case 'sale_return':
        return 'bg-purple-500/10 text-purple-700 border-purple-500/30'
      case 'purchase_return':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/30'
      case 'purchase':
        return 'bg-secondary/10 text-secondary border-secondary/30'
      default:
        return 'bg-primary/10 text-primary border-primary/30'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-level3 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-primary">
                {invoice.code}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getTypeStyle(invoice.type)}`}>
                {getTypeLabel(invoice.type)}
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
            <div className="flex items-center gap-3 text-xs font-mono text-on-surface-variant mt-1">
              <span>تاريخ الفاتورة: <strong className="text-on-surface">{invoice.date || invoice.operationalDate || '—'}</strong></span>
              {(invoice.createdAt || invoice.created_at) && (
                <span>تاريخ القيد: <strong className="text-on-surface">{invoice.createdAt || invoice.created_at}</strong></span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(invoice)
                  onClose()
                }}
                className="py-1.5 px-3 rounded-full bg-surface-low hover:bg-surface-container text-on-surface text-xs font-black border border-outline-variant/30 flex items-center gap-1 transition-all cursor-pointer"
                title="تعديل بيانات الفاتورة"
              >
                <Edit3 className="w-3.5 h-3.5 text-secondary" />
                <span>تعديل</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="py-1.5 px-3 rounded-full bg-error/10 hover:bg-error/20 text-error text-xs font-black border border-error/20 flex items-center gap-1 transition-all cursor-pointer"
                title="حذف الفاتورة والتراجع عن أثرها المحاسبي"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف</span>
              </button>
            )}
            {isEligibleForReturn && (
              <button
                type="button"
                onClick={() => setShowReturnModal(true)}
                className="py-1.5 px-3 rounded-full bg-purple-700 hover:bg-purple-800 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="تحويل الفاتورة أو بنود منها إلى مردود"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تسجيل مردود</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="py-1.5 px-3.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة ومشاركة الفاتورة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-on-surface-variant block">بنود الفاتورة:</span>
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 rounded-xl bg-surface-low text-xs font-bold"
            >
              <span>{getItemDisplayName(item)}</span>
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

      <AX_InvoicePrintModal
        invoice={invoice}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />

      <AX_InvoiceReturnModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        invoice={invoice}
        warehouses={warehouses}
        treasuryAccounts={treasuryAccounts}
        onSaveReturn={(ret) => {
          onSaveReturn?.(ret)
          setShowReturnModal(false)
          onClose()
        }}
      />

      <AX_ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete?.(invoice.id)
          setShowDeleteConfirm(false)
          onClose()
        }}
        title="تأكيد حذف الفاتورة"
        message={`هل أنت متأكد من حذف الفاتورة (${invoice.code})؟ سيتم عكس كميات المخزون وتعديل رصيد ${invoice.partyName} والخزينة تلقائياً.`}
        confirmText="نعم، حذف الفاتورة"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  )
}

export default AX_InvoiceDetailsModal
