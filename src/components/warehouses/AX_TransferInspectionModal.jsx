import React, { useState } from 'react'
import { CheckCircle2, Clock, X, ArrowLeftRight, PackageCheck, AlertCircle, Ban, AlertTriangle, Calendar } from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { axToast } from '../common/AX_Toast'
import { formatDualDates } from '../../utils/dateHelpers'

export function AX_TransferInspectionModal({ transfer, isOpen, onClose }) {
  useBodyScrollLock(isOpen && Boolean(transfer))
  const { items, confirmTransfer, cancelTransfer } = useAXStore()
  const [inspectedItems, setInspectedItems] = useState({})
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)

  if (!isOpen || !transfer) return null

  const dates = formatDualDates(transfer)

  const transferItems = transfer.items && transfer.items.length > 0
    ? transfer.items
    : [{ itemId: transfer.itemId, quantity: transfer.quantity, unit: transfer.unit }]

  const getItem = (id) => items.find((i) => i.id === id) || {}

  const toggleInspect = (idx) => {
    setInspectedItems((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  const handleConfirm = () => {
    confirmTransfer(transfer.id)
    axToast.success('تم تأكيد واستلام إذن التحويل بنجاح')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-level3 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-amber-500/10 text-amber-800">
              <Clock className="w-5 h-5 text-amber-700" />
            </span>
            <div className="text-right">
              <h3 className="text-sm sm:text-base font-black text-on-surface">فحص واستلام شحنة التحويل</h3>
              <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono mt-0.5">
                <span className="font-bold text-amber-800">{transfer.code}</span>
                <span className="text-on-surface-variant">• تاريخ العملية: {dates.operationalDate || transfer.requestedAt}</span>
                {dates.isDifferentDate && (
                  <span className="text-[10px] text-on-surface-variant/80 font-sans">
                    (أُضيف في: {dates.createdAt})
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-surface-low border border-outline-variant/30 flex items-center justify-between text-xs font-bold">
          <div className="text-right">
            <span className="text-[10px] text-on-surface-variant block">المحول منه:</span>
            <span className="text-on-surface font-black">{transfer.fromName || transfer.fromWarehouseId}</span>
          </div>
          <ArrowLeftRight className="w-4 h-4 text-primary shrink-0" />
          <div className="text-left">
            <span className="text-[10px] text-on-surface-variant block">المستلم:</span>
            <span className="text-primary font-black">{transfer.toName || transfer.toWarehouseId}</span>
          </div>
        </div>

        {transfer.isAuditDiscrepancy && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-bold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-black block">تنبيه فارق جردي:</span>
              <span className="block text-[11px] leading-relaxed">{transfer.auditDiscrepancyNote}</span>
              <span className="block text-[10px] text-amber-800">
                لن يتم تعديل أرصدة المخازن التي تم جردها بعد هذا التاريخ حفاظاً على نتائج الجرد الفعلي.
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-on-surface px-1">
            <span>بنود الشحنة ({transferItems.length} صنف)</span>
            <span className="text-[11px] text-on-surface-variant font-medium">راجع كل بند قبل التأكيد</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto p-1">
            {transferItems.map((item, idx) => {
              const it = getItem(item.itemId)
              const isChecked = Boolean(inspectedItems[idx])

              return (
                <div
                  key={idx}
                  onClick={() => toggleInspect(idx)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isChecked
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-on-surface'
                      : 'bg-surface-lowest border-outline-variant/40 hover:bg-surface-low'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-emerald-600 text-white' : 'border border-outline-variant text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="text-right min-w-0">
                      <span className="text-xs font-black text-on-surface block truncate">
                        {it.compositeName || item.itemId}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-bold block">
                        {it.primaryCategory} • {it.subCategory}
                      </span>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="font-mono text-xs font-black text-primary px-2.5 py-1 rounded-full bg-surface-low border border-primary/20">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {transfer.notes && (
          <div className="p-2.5 rounded-2xl bg-surface-low text-xs text-on-surface-variant">
            <span className="font-bold text-on-surface ml-1">ملاحظة:</span>
            {transfer.notes}
          </div>
        )}

        <div className="pt-2 flex flex-col gap-2">
          {transfer.status === 'pending' ? (
            <>
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full py-3 px-4 rounded-full bg-primary hover:bg-primary-dark text-white font-black text-xs sm:text-sm shadow-level2 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <PackageCheck className="w-4 h-4" />
                تأكيد الاستلام وإضافة الرصيد للمستلم
              </button>
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(true)}
                className="w-full py-2.5 px-4 rounded-full bg-error/10 hover:bg-error/20 text-error font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Ban className="w-4 h-4" />
                إلغاء إذن التحويل
              </button>
            </>
          ) : (
            <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 text-center text-xs font-black">
              تم استلام الشحنة وتأكيدها بالرصيد
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-center text-xs font-bold text-on-surface-variant hover:text-on-surface"
          >
            إغلاق النافذة
          </button>
        </div>

        <AX_ConfirmModal
          isOpen={isCancelConfirmOpen}
          title="تأكيد إلغاء إذن التحويل"
          message={`هل أنت متأكد من إلغاء إذن التحويل "${transfer.code}"؟ سيتم إلغاء الحركة نهائياً.`}
          confirmText="نعم، إلغاء الإذن"
          cancelText="تراجع"
          isDestructive={true}
          onConfirm={() => {
            cancelTransfer(transfer.id)
            setIsCancelConfirmOpen(false)
            onClose()
          }}
          onCancel={() => setIsCancelConfirmOpen(false)}
        />
      </div>
    </div>
  )
}

export default AX_TransferInspectionModal
