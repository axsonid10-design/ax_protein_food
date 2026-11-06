import React from 'react'
import { Check, ArrowRight, X, Warehouse, ArrowLeftRight, Calendar, PackageCheck, Layers, FileText } from 'lucide-react'
import { formatDateOnly } from '../../utils/dateHelpers'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

export function AX_TransferReviewModal({
  isOpen,
  onClose,
  onBackToEdit,
  onConfirmImmediate,
  fromWarehouse,
  toWarehouse,
  operationalDate,
  notes = '',
  selectedItemsGrouped = {},
  isSubmitting = false,
}) {
  useBodyScrollLock(isOpen)

  if (!isOpen) return null

  const categories = Object.keys(selectedItemsGrouped || {})
  const totalItemsCount = categories.reduce(
    (sum, cat) => sum + (selectedItemsGrouped[cat] || []).length,
    0
  )
  const totalQuantities = categories.reduce(
    (sum, cat) =>
      sum +
      (selectedItemsGrouped[cat] || []).reduce((catSum, it) => catSum + (Number(it.quantity) || 0), 0),
    0
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-level3 space-y-4 max-h-[92vh] flex flex-col overscroll-contain">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-700">
              <PackageCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-on-surface">مراجعة واعتماد التحويل المخزني</h3>
              <p className="text-xs font-bold text-on-surface-variant">
                تأكيد فوري لحركة النقل وتحديث أرصدة المخازن آلياً
              </p>
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

        <div className="overflow-y-auto space-y-4 flex-1 pr-1 overscroll-contain">
          <div className="p-4 rounded-2xl bg-surface-low border border-outline-variant/30 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-primary" />
                <span className="font-bold text-on-surface-variant">من المخزن:</span>
                <span className="font-black text-on-surface">{fromWarehouse?.name || 'المصدر'}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-secondary" />
                <span className="font-bold text-on-surface-variant">إلى المخزن:</span>
                <span className="font-black text-on-surface">{toWarehouse?.name || 'المستلم'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-on-surface-variant" />
                <span className="font-bold text-on-surface-variant">تاريخ التحويل:</span>
                <span className="font-mono font-black text-on-surface">
                  {formatDateOnly(operationalDate)}
                </span>
              </div>
              {notes && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-on-surface-variant" />
                  <span className="font-bold text-on-surface-variant">ملاحظات:</span>
                  <span className="font-bold text-on-surface truncate">{notes}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-on-surface">
                الأصناف المحولة حسب الأقسام ({totalItemsCount} صنف)
              </span>
              <span className="text-xs font-black text-primary font-mono">
                إجمالي الكمية: {totalQuantities}
              </span>
            </div>

            {categories.map((cat) => {
              const catItems = selectedItemsGrouped[cat] || []
              if (catItems.length === 0) return null

              return (
                <div
                  key={cat}
                  className="rounded-2xl border border-outline-variant/30 bg-surface-lowest overflow-hidden shadow-xs"
                >
                  <div className="px-3.5 py-2 bg-surface-low border-b border-outline-variant/20 flex items-center justify-between">
                    <span className="text-xs font-black text-on-surface flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      {cat}
                    </span>
                    <span className="text-[11px] font-bold text-on-surface-variant">
                      {catItems.length} صنف
                    </span>
                  </div>

                  <div className="divide-y divide-outline-variant/20">
                    {catItems.map((item, idx) => (
                      <div
                        key={item.itemId || idx}
                        className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-surface-low/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          <span className="font-black text-on-surface truncate">
                            {item.itemName || item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-black text-primary text-sm">
                            {item.quantity}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-surface-low border border-outline-variant/30 text-on-surface-variant text-[11px] font-bold">
                            {item.unit || 'كرتونة'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-surface-container flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onBackToEdit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-outline-variant/60 text-on-surface text-xs font-bold hover:bg-surface-container active:scale-95 transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>تعديل الأصناف</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-full border border-outline-variant/40 text-on-surface-variant text-xs font-bold hover:bg-surface-low active:scale-95 transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={onConfirmImmediate}
              disabled={isSubmitting || totalItemsCount === 0}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري التنفيذ...' : 'تأكيد التحويل فوراً'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AX_TransferReviewModal
