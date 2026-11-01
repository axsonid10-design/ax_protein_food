import React from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, PackagePlus } from 'lucide-react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'

export function AX_InvoiceItemsEditor({
  items = [],
  availableItems = [],
  invoiceItems = [],
  draftItem,
  onDraftItemChange,
  onCommitDraftItem,
  onRemoveItem,
  onItemRowChange,
  expandedRowIndex,
  setExpandedRowIndex,
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-surface-container">
      <span className="text-xs font-black text-on-surface block">إضافة بند جديد (بالأعلى):</span>

      {availableItems.length === 0 ? (
        <div className="bg-surface-low border border-outline-variant/30 p-3 rounded-2xl text-center text-xs font-bold text-on-surface-variant">
          تم إدراج جميع الأصناف المتاحة في الفاتورة ({items.length} صنف)
        </div>
      ) : (
        <div className="bg-primary/5 border border-primary/20 p-3 rounded-2xl space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <div className="sm:col-span-6">
              <AX_SearchableSelect
                value={draftItem.itemId}
                onChange={(val) => onDraftItemChange('itemId', val)}
                options={availableItems.map((it) => ({
                  value: it.id,
                  label: it.compositeName,
                  sublabel: `${it.primaryCategory} • ${it.unitType}`,
                }))}
                placeholder="اختر الصنف المراد إضافته..."
              />
            </div>

            <div className="sm:col-span-3">
              <input
                type="number"
                min="1"
                placeholder="الكمية"
                value={draftItem.quantity}
                onChange={(e) => onDraftItemChange('quantity', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-lowest text-xs font-bold text-on-surface border border-outline-variant/30 font-mono"
              />
            </div>

            <div className="sm:col-span-3">
              <input
                type="number"
                min="1"
                placeholder="السعر"
                value={draftItem.price}
                onChange={(e) => onDraftItemChange('price', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-lowest text-xs font-bold text-on-surface border border-outline-variant/30 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onCommitDraftItem}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-black hover:bg-primary-dark transition-all cursor-pointer shadow-sm"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>إدراج البند بالفاتورة</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
        <span className="text-[11px] font-bold text-on-surface-variant block">
          البنود المضافة ({invoiceItems.length}):
        </span>

        {invoiceItems.length === 0 ? (
          <div className="p-4 text-center text-xs font-bold text-on-surface-variant/70 border border-dashed border-outline-variant/40 rounded-xl">
            لم يتم إضافة أي بنود بالفاتورة بعد. اختر صنفاً واضغط "إدراج البند بالفاتورة" بالأعلى.
          </div>
        ) : (
          invoiceItems.map((row, idx) => {
            const itObj = items.find((i) => i.id === row.itemId)
            const isExpanded = expandedRowIndex === idx
            const rowTotal = (Number(row.quantity) || 0) * (Number(row.price) || 0)

            return (
              <div
                key={idx}
                className="bg-surface-low border border-outline-variant/30 rounded-xl p-2.5 space-y-2 transition-all"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] text-primary font-black bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-black text-on-surface truncate">
                      {itObj?.compositeName || 'صنف'}
                    </span>
                    <span className="text-on-surface-variant text-[11px] font-mono">
                      ({row.quantity} {itObj?.unitType || 'كرتونة'} × {row.price} ج.م)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-black text-primary text-xs">
                      {rowTotal.toLocaleString('en-US')} ج.م
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedRowIndex(isExpanded ? null : idx)}
                      className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container cursor-pointer"
                      title={isExpanded ? 'طي التفاصيل' : 'تعديل الكمية والسعر'}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      className="p-1 rounded-full text-error hover:bg-error-container/40 cursor-pointer"
                      title="حذف البند"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-container">
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant block">الكمية</label>
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => onItemRowChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2 py-1 rounded-lg bg-surface-lowest text-xs font-mono font-bold border border-outline-variant/30"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant block">السعر (ج.م)</label>
                      <input
                        type="number"
                        min="1"
                        value={row.price}
                        onChange={(e) => onItemRowChange(idx, 'price', e.target.value)}
                        className="w-full px-2 py-1 rounded-lg bg-surface-lowest text-xs font-mono font-bold border border-outline-variant/30"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AX_InvoiceItemsEditor
