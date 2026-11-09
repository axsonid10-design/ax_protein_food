import React, { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp, PackagePlus, LayoutGrid, ListPlus } from 'lucide-react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_InvoiceItemsGrid } from './AX_InvoiceItemsGrid'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'
import { resolveInvoiceUnitPrice, getCartonEquivalent } from '../../utils/pricingCalculations'

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

  const handleUnitChange = (idx, newUnit) => {
    const row = invoiceItems[idx]
    if (!row) return
    const itObj = items.find((i) => i.id === row.itemId)
    const isSale = invType === 'sale' || invType === 'sale_return'
    const catalogPrice = resolveInvoiceUnitPrice(itObj, newUnit, isSale)
    if (catalogPrice > 0) {
      onItemRowChange(idx, { unit: newUnit, price: catalogPrice })
    } else if (Number(row.price) > 0) {
      onItemRowChange(idx, 'unit', newUnit)
    } else {
      onItemRowChange(idx, { unit: newUnit, price: catalogPrice || 0 })
    }
  }

  const handleGridAddItem = (newItem) => {
    if (onAddItem) {
      onAddItem(newItem)
    } else {
      if (onDraftItemChange) {
        onDraftItemChange({
          itemId: newItem.itemId,
          quantity: newItem.quantity,
          price: newItem.price,
          unit: newItem.unit || 'كرتونة',
        })
      }
      if (onCommitDraftItem) {
        onCommitDraftItem()
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

          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              {draftItem?.itemId && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-on-surface-variant">الوحدة:</span>
                  {(() => {
                    const selObj = items.find((i) => i.id === draftItem.itemId)
                    const subUnit = Number(selObj?.piecesPerCarton || selObj?.pieces_per_carton) > 0 ? (selObj?.subUnitType || selObj?.sub_unit_type || 'قطعة') : null
                    const unitOptions = Array.from(new Set([selObj?.unitType || 'كرتونة', 'كيلو', subUnit].filter(Boolean)))
                    const activeDraftUnit = draftItem?.unit || selObj?.unitType || 'كرتونة'
                    return unitOptions.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          const p = resolveInvoiceUnitPrice(selObj, u, invType === 'sale' || invType === 'sale_return')
                          onDraftItemChange({ unit: u, price: p })
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                          activeDraftUnit === u
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-surface-lowest border-outline-variant/30 text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        {u}
                      </button>
                    ))
                  })()}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
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
            const currentUnit = row.unit || itObj?.unitType || 'كرتونة'
            const subUnit = Number(itObj?.piecesPerCarton || itObj?.pieces_per_carton) > 0 ? (itObj?.subUnitType || itObj?.sub_unit_type || 'قطعة') : null
            const availableUnits = Array.from(new Set([itObj?.unitType || 'كرتونة', 'كيلو', subUnit].filter(Boolean)))

            const isNegativeStock = invType === 'sale' && (getStock(row.itemId) <= 0 || getStock(row.itemId) < getCartonEquivalent(row.quantity, currentUnit, itObj))

            return (
              <div
                key={idx}
                className={`rounded-2xl p-2.5 sm:p-3 space-y-2 transition-all border ${
                  isNegativeStock
                    ? 'bg-rose-500/10 border-2 border-rose-500/60 shadow-xs'
                    : 'bg-surface-low border-outline-variant/30 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-[11px] text-primary font-black bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-black text-on-surface truncate text-xs sm:text-sm">
                      {getItemDisplayName(itObj || row)}
                    </span>
                    {invType === 'sale' && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                        !isNegativeStock
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                          : 'bg-rose-600 text-white border-rose-700 font-black'
                      }`}>
                        {isNegativeStock ? `سالب: رصيد المخزن (${getStock(row.itemId)})` : `متاح: ${getStock(row.itemId)}`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-black text-primary text-xs sm:text-sm bg-primary/5 px-2.5 py-0.5 rounded-full border border-primary/20">
                      {rowTotal.toLocaleString('en-US')} ج.م
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      className="p-1 rounded-full text-error hover:bg-error-container/40 transition-colors cursor-pointer"
                      title="حذف البند"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-1.5 border-t border-surface-container">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-on-surface-variant">الوحدة:</span>
                    {availableUnits.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => handleUnitChange(idx, u)}
                        className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ${
                          currentUnit === u
                            ? 'bg-primary text-white border-primary shadow-xs font-black'
                            : 'bg-surface-lowest border-outline-variant/30 text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-surface-lowest px-2 py-0.5 rounded-xl border border-outline-variant/40 focus-within:border-primary">
                      <label className="text-[10px] font-bold text-on-surface-variant">الكمية:</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={row.quantity}
                        onChange={(e) => onItemRowChange(idx, 'quantity', e.target.value)}
                        className="w-14 sm:w-16 px-1 py-0.5 rounded-md bg-surface-low text-xs font-mono font-black text-primary border border-outline-variant/20 text-center outline-none focus:bg-white focus:border-primary"
                      />
                      <span className="text-[10px] font-bold text-on-surface-variant">{currentUnit}</span>
                    </div>

                    <div className="flex items-center gap-1 bg-surface-lowest px-2 py-0.5 rounded-xl border border-primary/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-2xs">
                      <label className="text-[10px] font-bold text-primary">السعر:</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.price}
                        onChange={(e) => onItemRowChange(idx, 'price', e.target.value)}
                        className="w-16 sm:w-20 px-1 py-0.5 rounded-md bg-surface-low text-xs font-mono font-black text-primary border border-outline-variant/20 text-center outline-none focus:bg-white focus:border-primary"
                        title="أدخل أي سعر بيع مخصص"
                      />
                      <span className="text-[10px] font-bold text-on-surface-variant">ج.م</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AX_InvoiceItemsEditor
