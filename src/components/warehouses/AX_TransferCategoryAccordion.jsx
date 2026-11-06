import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search, Plus, Minus, Package, Layers, CheckCircle2 } from 'lucide-react'

export function AX_TransferCategoryAccordion({
  category,
  items = [],
  selectedQuantities = {},
  onQuantityChange,
  isExpanded = false,
  onToggleExpand,
}) {
  const selectedCount = items.filter((it) => (Number(selectedQuantities[it.id]?.quantity) || 0) > 0).length
  const totalCategoryQty = items.reduce(
    (sum, it) => sum + (Number(selectedQuantities[it.id]?.quantity) || 0),
    0
  )

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
            const currentSel = selectedQuantities[it.id] || { quantity: 0, unit: it.unitType || 'كرتونة' }
            const currentQty = Number(currentSel.quantity) || 0
            const currentUnit = currentSel.unit || it.unitType || 'كرتونة'
            const avail = Number(it.availableStock) || 0

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
                        المتاح: <strong className={avail > 0 ? 'text-primary' : 'text-error'}>{avail}</strong> {it.unitType || 'كرتونة'}
                      </span>
                      {it.subCategory && it.subCategory !== 'عام' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-surface-low text-[10px] font-bold text-on-surface-variant border border-outline-variant/30">
                          {it.subCategory}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <div className="flex items-center border border-outline-variant/40 rounded-full bg-surface-low p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => onQuantityChange(it.id, Math.max(0, currentQty - 1), currentUnit, it)}
                      disabled={currentQty <= 0}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-lowest active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={currentQty === 0 ? '' : currentQty}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0)
                        onQuantityChange(it.id, val, currentUnit, it)
                      }}
                      className="w-14 text-center font-mono font-black text-xs text-on-surface bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => onQuantityChange(it.id, currentQty + 1, currentUnit, it)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-primary hover:bg-surface-lowest active:scale-95 cursor-pointer font-black"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex gap-1">
                    {['كرتونة', 'كيلو', 'قطعة'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => onQuantityChange(it.id, currentQty, u, it)}
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

export function AX_TransferCategoryAccordionGroup({
  items = [],
  inventoryStock = [],
  fromWarehouseId,
  selectedQuantities = {},
  onQuantityChange,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState({})

  const itemsWithAvailable = useMemo(() => {
    const stockMap = new Map()
    if (fromWarehouseId && Array.isArray(inventoryStock)) {
      inventoryStock
        .filter((s) => s && (s.warehouseId === fromWarehouseId || s.warehouse_id === fromWarehouseId))
        .forEach((s) => {
          const itId = s.itemId || s.item_id
          const qty = Number(s.quantity) || 0
          stockMap.set(itId, (stockMap.get(itId) || 0) + qty)
        })
    }

    return (items || []).map((it) => ({
      ...it,
      availableStock: stockMap.get(it.id) || 0,
      primaryCategory: (it.primaryCategory || '').trim() || 'أصناف عامة',
    }))
  }, [items, inventoryStock, fromWarehouseId])

  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const groups = {}

    itemsWithAvailable.forEach((it) => {
      const cat = it.primaryCategory
      const matchesSearch =
        !term ||
        (it.compositeName && it.compositeName.toLowerCase().includes(term)) ||
        (it.subCategory && it.subCategory.toLowerCase().includes(term)) ||
        (it.code && it.code.toLowerCase().includes(term))

      if (!matchesSearch) return

      if (!groups[cat]) groups[cat] = []
      groups[cat].push(it)
    })

    return groups
  }, [itemsWithAvailable, searchTerm])

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
              <AX_TransferCategoryAccordion
                key={cat}
                category={cat}
                items={filteredCategories[cat]}
                selectedQuantities={selectedQuantities}
                onQuantityChange={onQuantityChange}
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

export default AX_TransferCategoryAccordion
