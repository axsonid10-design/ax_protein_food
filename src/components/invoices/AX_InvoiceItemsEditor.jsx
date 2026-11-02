import React, { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp, PackagePlus, LayoutGrid, ListPlus } from 'lucide-react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_InvoiceItemsGrid } from './AX_InvoiceItemsGrid'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'

export function AX_InvoiceItemsEditor({
  items = [],
  availableItems = [],
  invoiceItems = [],
  invType = 'sale',
  warehouseId,
  inventoryStock = [],
  getItemStock,
  draftItem,
  onDraftItemChange,
  onCommitDraftItem,
  onAddItem,
  onRemoveItem,
  onItemRowChange,
  expandedRowIndex,
  setExpandedRowIndex,
}) {
  const [inputMode, setInputMode] = useState('grid')

  const getStock = (itemId) => {
    if (typeof getItemStock === 'function') return getItemStock(itemId, warehouseId)
    if (!warehouseId || !itemId) return 0
    const row = (inventoryStock || []).find((s) => s.warehouseId === warehouseId && s.itemId === itemId)
    return Number(row?.quantity) || 0
  }

  const handleGridAddItem = (newItem) => {
    if (onAddItem) {
      onAddItem(newItem)
    } else {
      if (onDraftItemChange) {
        onDraftItemChange('itemId', newItem.itemId)
        onDraftItemChange('quantity', newItem.quantity)
        onDraftItemChange('price', newItem.price)
      }
      if (onCommitDraftItem) {
        setTimeout(() => onCommitDraftItem(), 10)
      }
    }
  }

  return (
    <div className="space-y-3 pt-2 border-t border-surface-container">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-on-surface">إضافة بنود الفاتورة:</span>
        <div className="flex items-center gap-1 bg-surface-low p-0.5 rounded-full border border-outline-variant/30">
          <button
            type="button"
            onClick={() => setInputMode('grid')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
              inputMode === 'grid' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span>شبكة الأصناف</span>
          </button>
          <button
            type="button"
            onClick={() => setInputMode('manual')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
              inputMode === 'manual' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <ListPlus className="w-3 h-3" />
            <span>إدخال يدوي</span>
          </button>
        </div>
      </div>

      {inputMode === 'grid' ? (
        <AX_InvoiceItemsGrid
          items={items}
          invoiceItems={invoiceItems}
          invType={invType}
          warehouseId={warehouseId}
          inventoryStock={inventoryStock}
          getItemStock={getItemStock}
          onAddItem={handleGridAddItem}
          onUpdateQuantity={(idx, q) => onItemRowChange(idx, 'quantity', q)}
          onRemoveItem={onRemoveItem}
        />
      ) : availableItems.length === 0 ? (
        <div className="bg-surface-low border border-outline-variant/30 p-3 rounded-2xl text-center text-xs font-bold text-on-surface-variant">
          تم إدراج جميع الأصناف المتاحة في الفاتورة ({items.length} صنف)
        </div>
      ) : (
        <div className="bg-primary/5 border border-primary/20 p-3 rounded-2xl space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <div className="sm:col-span-6">
              <AX_SearchableSelect
                value={draftItem?.itemId || ''}
                onChange={(val) => onDraftItemChange('itemId', val)}
                options={availableItems.map((it) => ({
                  value: it.id,
                  label: getItemDisplayName(it),
                  sublabel: `${it.primaryCategory || ''} • ${it.unitType || 'كرتونة'}${invType === 'sale' ? ` • متاح: ${getStock(it.id)}` : ''}`,
                }))}
                placeholder="اختر الصنف المراد إضافته..."
              />
            </div>

            <div className="sm:col-span-3">
              <input
                type="number"
                min="1"
                placeholder="الكمية"
                value={draftItem?.quantity || 1}
                onChange={(e) => onDraftItemChange('quantity', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-lowest text-xs font-bold text-on-surface border border-outline-variant/30 font-mono"
              />
            </div>

            <div className="sm:col-span-3">
              <input
                type="number"
                min="0.1"
                step="any"
                placeholder="السعر"
                value={draftItem?.price || 0}
                onChange={(e) => onDraftItemChange('price', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-lowest text-xs font-bold text-on-surface border border-outline-variant/30 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {invType === 'sale' && draftItem?.itemId ? (
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                getStock(draftItem.itemId) > 0
                  ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-700 border-rose-500/30'
              }`}>
                المتاح بالمخزن: {getStock(draftItem.itemId)} {items.find((i) => i.id === draftItem.itemId)?.unitType || 'كرتونة'}
              </span>
            ) : <span />}

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

      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
        <span className="text-[11px] font-bold text-on-surface-variant block">
          البنود المضافة للفاتورة ({invoiceItems.length}):
        </span>

        {invoiceItems.length === 0 ? (
          <div className="p-4 text-center text-xs font-bold text-on-surface-variant/70 border border-dashed border-outline-variant/40 rounded-xl">
            لم يتم إضافة أي بنود بالفاتورة بعد. اختر صنفاً من الشبكة بالأعلى بنقرة واحدة.
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
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="font-mono text-[11px] text-primary font-black bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-black text-on-surface truncate">
                      {getItemDisplayName(itObj || row)}
                    </span>
                    <span className="text-on-surface-variant text-[11px] font-mono">
                      ({row.quantity} {itObj?.unitType || row.unit || 'كرتونة'} × {row.price} ج.م)
                    </span>
                    {invType === 'sale' && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                        getStock(row.itemId) >= Number(row.quantity)
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-700 border-rose-500/30'
                      }`}>
                        متاح: {getStock(row.itemId)}
                      </span>
                    )}
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
                        min="0.1"
                        step="any"
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
