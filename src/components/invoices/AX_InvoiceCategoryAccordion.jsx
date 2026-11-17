import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search, Plus, Minus, Package, Layers, CheckCircle2 } from 'lucide-react'
import { formatStockPackages, roundMax3 } from '../../utils/itemUnitFormatters'
import { resolveInvoiceUnitPrice } from '../../utils/pricingCalculations'
import { calculateDynamicRemainingStock } from './invoiceValidationHelper'

export function AX_InvoiceCategoryAccordion({
  category,
  items = [],
  invoiceItems = [],
  invType = 'sale',
  warehouseId,
  inventoryStock = [],
  getItemStock,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem,
  onItemRowChange,
  isExpanded = false,
  onToggleExpand,
}) {
  const [localUnits, setLocalUnits] = useState({})
  const isSale = invType === 'sale' || invType === 'sale_return'

  const selectedCount = items.filter((it) => invoiceItems.some((row) => row.itemId === it.id)).length
  const totalCategoryQty = roundMax3(
    items.reduce((sum, it) => {
      const row = invoiceItems.find((r) => r.itemId === it.id)
      return sum + (row ? Number(row.quantity) || 0 : 0)
    }, 0)
  )

  const getStock = (itemId) => {
    if (typeof getItemStock === 'function') return getItemStock(itemId, warehouseId)
    if (!warehouseId || !itemId) return 0
    const row = (inventoryStock || []).find((s) => s.warehouseId === warehouseId && s.itemId === itemId)
    return Number(row?.quantity) || 0
  }

  const getAvailStock = (itemId) => {
    if (invType === 'sale') {
      return calculateDynamicRemainingStock(itemId, warehouseId, inventoryStock, invoiceItems, items)
    }
    return getStock(itemId)
  }

  return (
    <div className="border border-outline-variant/30 rounded-2xl bg-surface-lowest overflow-hidden transition-all shadow-sm">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-4 py-3 bg-surface-low hover:bg-surface-container flex items-center justify-between text-right transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
            <Layers className="w-4 h-4" />
          </span>
          <span className="text-xs font-black text-on-surface">{category}</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-lowest text-on-surface-variant text-[11px] font-bold border border-outline-variant/30">
            {items.length} صنف
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-[11px] font-black animate-fadeIn">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>
                {selectedCount} صنف ({totalCategoryQty})
              </span>
            </span>
          )}
          <span className="p-1 rounded-full text-on-surface-variant">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 space-y-2 border-t border-outline-variant/20 bg-surface-lowest animate-fadeIn">
          {items.map((it) => {
            const rowIndex = invoiceItems.findIndex((r) => r.itemId === it.id)
            const currentSel = rowIndex >= 0 ? invoiceItems[rowIndex] : null
            const currentQty = currentSel ? Number(currentSel.quantity) || 0 : 0
            const currentUnit = currentSel?.unit || localUnits[it.id] || it.unitType || 'كرتونة'
            const avail = getAvailStock(it.id)

            const subUnit = Number(it.piecesPerCarton || it.pieces_per_carton) > 0 ? (it.subUnitType || it.sub_unit_type || 'قطعة') : null
            const unitOptions = Array.from(new Set([it.unitType || 'كرتونة', subUnit, 'طبق', 'قطعة', 'كيس', 'كيلو'].filter(Boolean)))

            const currentPrice = currentSel?.price !== undefined
              ? Number(currentSel.price) || 0
              : resolveInvoiceUnitPrice(it, currentUnit, isSale)

            const handleQtyChange = (newQty) => {
              const safeQty = roundMax3(Math.max(0, newQty))
              if (safeQty === 0) {
                if (rowIndex >= 0) onRemoveItem?.(rowIndex)
              } else if (rowIndex >= 0) {
                onUpdateQuantity?.(rowIndex, safeQty)
              } else {
                const initPrice = resolveInvoiceUnitPrice(it, currentUnit, isSale)
                onAddItem?.({
                  itemId: it.id,
                  quantity: safeQty,
                  price: initPrice,
                  unit: currentUnit,
                })
              }
            }

            const handleUnitSelect = (newUnit) => {
              setLocalUnits((prev) => ({ ...prev, [it.id]: newUnit }))
              const newPrice = resolveInvoiceUnitPrice(it, newUnit, isSale)
              if (rowIndex >= 0) {
                onItemRowChange?.(rowIndex, { unit: newUnit, price: newPrice })
              }
            }

            return (
              <div
                key={it.id}
                className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
                  currentQty > 0
                    ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                    : 'border-outline-variant/30 bg-surface-lowest hover:border-outline-variant/60'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      currentQty > 0 ? 'bg-primary text-white' : 'bg-surface-low text-on-surface-variant'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-on-surface truncate">
                      {it.compositeName || it.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] font-bold text-on-surface-variant">
                        المتاح: <strong className={avail > 0 ? 'text-primary' : 'text-error'}>{formatStockPackages(avail, it.unitType, it)}</strong>
                      </span>
                      <span className="text-[11px] font-bold text-secondary font-mono">
                        السعر: {currentPrice} ج.م / {currentUnit}
                      </span>
                      {it.subCategory && it.subCategory !== 'عام' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-surface-low text-[10px] font-bold text-on-surface-variant border border-outline-variant/30">
                          {it.subCategory}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                  <div className="flex items-center border border-outline-variant/40 rounded-full bg-surface-low p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(currentQty - 1)}
                      disabled={currentQty <= 0}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-lowest active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={currentQty === 0 ? '' : currentQty}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0)
                        handleQtyChange(val)
                      }}
                      className="w-14 text-center font-mono font-black text-xs text-on-surface bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleQtyChange(currentQty + 1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-primary hover:bg-surface-lowest active:scale-95 cursor-pointer font-black"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex gap-1 flex-wrap">
                    {unitOptions.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => handleUnitSelect(u)}
                        className={`px-2 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                          currentUnit === u
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-surface-low border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AX_InvoiceCategoryAccordionGroup({
  items = [],
  invoiceItems = [],
  invType = 'sale',
  warehouseId,
  inventoryStock = [],
  getItemStock,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem,
  onItemRowChange,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState({})

  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const groups = {}

    items.forEach((it) => {
      const cat = (it.primaryCategory || '').trim() || 'أصناف عامة'
      const matchesSearch =
        !term ||
        (it.compositeName && it.compositeName.toLowerCase().includes(term)) ||
        (it.subCategory && it.subCategory.toLowerCase().includes(term)) ||
        (it.code && it.code.toLowerCase().includes(term)) ||
        cat.toLowerCase().includes(term)

      if (!matchesSearch) return

      if (!groups[cat]) groups[cat] = []
      groups[cat].push(it)
    })

    return groups
  }, [items, searchTerm])

  const categoryNames = Object.keys(filteredCategories)

  const toggleCategory = (cat) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }))
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="ابحث بالاسم أو الكود لتصفية الأصناف في الأقسام..."
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-surface-low border border-outline-variant/40 text-on-surface text-xs font-bold focus:border-primary focus:outline-none"
        />
        <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-3 pointer-events-none" />
      </div>

      {categoryNames.length === 0 ? (
        <div className="p-6 text-center text-xs font-bold text-on-surface-variant bg-surface-low rounded-2xl border border-dashed border-outline-variant/40">
          لا توجد أصناف مطابقة للبحث
        </div>
      ) : (
        <div className="space-y-2">
          {categoryNames.map((cat) => {
            const isAutoExpanded = Boolean(searchTerm.trim()) || Boolean(expandedCategories[cat])
            return (
              <AX_InvoiceCategoryAccordion
                key={cat}
                category={cat}
                items={filteredCategories[cat]}
                invoiceItems={invoiceItems}
                invType={invType}
                warehouseId={warehouseId}
                inventoryStock={inventoryStock}
                getItemStock={getItemStock}
                onAddItem={onAddItem}
                onUpdateQuantity={onUpdateQuantity}
                onRemoveItem={onRemoveItem}
                onItemRowChange={onItemRowChange}
                isExpanded={isAutoExpanded}
                onToggleExpand={() => toggleCategory(cat)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AX_InvoiceCategoryAccordionGroup
