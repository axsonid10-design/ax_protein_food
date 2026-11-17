import React, { useState, useMemo } from 'react'
import { Search, Plus, Minus, Check, Layers, Trash2 } from 'lucide-react'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'
import { formatStockPackages, roundMax3 } from '../../utils/itemUnitFormatters'

function getAvailableUnitsForItem(item) {
  const subUnit = Number(item?.piecesPerCarton || item?.pieces_per_carton) > 0
    ? (item?.subUnitType || item?.sub_unit_type || 'قطعة')
    : (item?.subUnitType || item?.sub_unit_type || null)
  return Array.from(new Set([item?.unitType || 'كرتونة', 'كيلو', subUnit].filter(Boolean)))
}

function getStockBadgeInfo(avail, item) {
  const qty = Number(avail) || 0
  const formatted = formatStockPackages(qty, item?.unitType, item)
  if (qty > 0) {
    return {
      text: `متاح: ${formatted}`,
      className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold',
      isNegative: false,
    }
  }
  if (qty === 0) {
    return {
      text: `متاح: ${formatted}`,
      className: 'bg-amber-500/10 text-amber-700 border-amber-500/30 font-bold',
      isNegative: false,
    }
  }
  return {
    text: `متاح: ${formatted}`,
    className: 'bg-rose-600 text-white border-rose-700 font-black',
    isNegative: true,
  }
}

export function AX_TransferItemsGrid({
  items = [],
  selectedQuantities = {},
  onQuantityChange,
  layoutMode = 'grid',
}) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [localUnits, setLocalUnits] = useState({})

  const categories = useMemo(() => {
    const cats = new Set()
    items.forEach((it) => {
      if (it.primaryCategory) cats.add(it.primaryCategory)
    })
    return ['all', ...Array.from(cats)]
  }, [items])

  const filteredItems = useMemo(() => {
    let res = items
    if (selectedCategory !== 'all') {
      res = res.filter((it) => it.primaryCategory === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      res = res.filter((it) => {
        const name = getItemDisplayName(it).toLowerCase()
        const sub = (it.subCategory || '').toLowerCase()
        const prim = (it.primaryCategory || '').toLowerCase()
        const code = (it.code || '').toLowerCase()
        return name.includes(q) || sub.includes(q) || prim.includes(q) || code.includes(q)
      })
    }
    return res
  }, [items, selectedCategory, searchQuery])

  const groupedSections = useMemo(() => {
    if (selectedCategory !== 'all') {
      return [{ category: selectedCategory, items: filteredItems }]
    }
    if (searchQuery.trim()) {
      return [{ category: `نتائج البحث (${filteredItems.length})`, items: filteredItems }]
    }
    const map = new Map()
    filteredItems.forEach((it) => {
      const cat = it.primaryCategory || 'أصناف عامة'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(it)
    })
    return Array.from(map.entries()).map(([category, secItems]) => ({ category, items: secItems }))
  }, [filteredItems, selectedCategory, searchQuery])

  const selectedList = useMemo(() => {
    return items
      .filter((it) => (Number(selectedQuantities[it.id]?.quantity) || 0) > 0)
      .map((it) => ({
        item: it,
        quantity: Number(selectedQuantities[it.id]?.quantity) || 0,
        unit: selectedQuantities[it.id]?.unit || it.unitType || 'كرتونة',
      }))
  }, [items, selectedQuantities])

  const getActiveUnit = (item) =>
    selectedQuantities[item.id]?.unit || localUnits[item.id] || item.unitType || 'كرتونة'

  const handleSelectUnit = (e, item, unit) => {
    e.stopPropagation()
    setLocalUnits((prev) => ({ ...prev, [item.id]: unit }))
    const curQty = Number(selectedQuantities[item.id]?.quantity) || 0
    if (curQty > 0) {
      onQuantityChange(item.id, curQty, unit, item)
    }
  }

  const handleIncrement = (e, item) => {
    e.stopPropagation()
    const unit = getActiveUnit(item)
    const curQty = Number(selectedQuantities[item.id]?.quantity) || 0
    onQuantityChange(item.id, roundMax3(curQty + 1), unit, item)
  }

  const handleDecrement = (e, item) => {
    e.stopPropagation()
    const unit = getActiveUnit(item)
    const curQty = Number(selectedQuantities[item.id]?.quantity) || 0
    const nextQty = curQty > 1 ? roundMax3(curQty - 1) : 0
    onQuantityChange(item.id, nextQty, unit, item)
  }

  const handleInputQuantity = (item, rawVal) => {
    const unit = getActiveUnit(item)
    const val = Math.max(0, Number(rawVal) || 0)
    onQuantityChange(item.id, roundMax3(val), unit, item)
  }

  return (
    <div className="space-y-3">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-on-surface">
            <Layers className="w-4 h-4 text-primary" />
            <span>شبكة الأصناف السريعة</span>
            <span className="text-[11px] text-on-surface-variant font-bold">
              ({filteredItems.length} صنف)
            </span>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              placeholder="بحث فوري في الأصناف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 rounded-full bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-black whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-low text-on-surface-variant hover:text-on-surface border border-outline-variant/20'
              }`}
            >
              {cat === 'all' ? 'جميع الأقسام' : cat}
            </button>
          ))}
        </div>

        <div className="max-h-72 overflow-y-auto space-y-3.5 p-0.5">
          {filteredItems.length === 0 ? (
            <div className="py-6 text-center text-xs font-bold text-on-surface-variant">
              لا توجد أصناف تطابق هذا البحث أو القسم.
            </div>
          ) : (
            groupedSections.map((section) => (
              <div key={section.category} className="space-y-1.5">
                <div className="sticky top-0 z-10 bg-surface-lowest/95 backdrop-blur-sm py-1 px-2.5 rounded-xl border border-outline-variant/30 flex items-center justify-between text-[11px] font-black text-primary shadow-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {section.category}
                  </span>
                  <span className="text-[10px] font-mono text-on-surface-variant font-bold">
                    {section.items.length} صنف
                  </span>
                </div>

                <div className={layoutMode === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2'}>
                  {section.items.map((item) => {
                    const availableUnits = getAvailableUnitsForItem(item)
                    const activeUnit = getActiveUnit(item)
                    const addedQty = Number(selectedQuantities[item.id]?.quantity) || 0
                    const isAdded = addedQty > 0
                    const avail = Number(item.availableStock) || 0
                    const stockBadge = getStockBadgeInfo(avail, item)

                    return (
                      <div
                        key={item.id}
                        onClick={(e) => handleIncrement(e, item)}
                        className={`p-2.5 rounded-2xl border transition-all text-right flex flex-col justify-between select-none cursor-pointer group ${
                          stockBadge.isNegative
                            ? 'bg-rose-500/15 border-2 border-rose-600 text-rose-950 shadow-xs'
                            : isAdded
                            ? 'bg-primary/10 border-primary/40 shadow-xs'
                            : 'bg-surface-low/70 hover:bg-surface-low border-outline-variant/30 hover:border-primary/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              {availableUnits.map((u) => (
                                <button
                                  key={u}
                                  type="button"
                                  onClick={(e) => handleSelectUnit(e, item, u)}
                                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md border transition-all cursor-pointer ${
                                    activeUnit === u
                                      ? 'bg-primary text-white border-primary shadow-xs font-black'
                                      : 'bg-surface-lowest text-on-surface-variant hover:text-on-surface border-outline-variant/30'
                                  }`}
                                >
                                  {u}
                                </button>
                              ))}
                            </div>
                            <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md border shrink-0 ${stockBadge.className}`}>
                              {stockBadge.text}
                            </span>
                            {isAdded && (
                              <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-black text-on-surface line-clamp-2 leading-tight">
                            {getItemDisplayName(item)}
                          </h4>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-surface-container flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {activeUnit}
                          </span>

                          {isAdded ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 bg-surface-lowest rounded-full p-0.5 border border-primary/30"
                            >
                              <button type="button" onClick={(e) => handleDecrement(e, item)} className="w-5 h-5 rounded-full bg-surface-low hover:bg-error hover:text-white flex items-center justify-center text-on-surface transition-colors cursor-pointer" title="إنقاص الكمية">
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <input
                                type="number" min="0" step="any" value={addedQty}
                                onChange={(e) => handleInputQuantity(item, e.target.value)}
                                className="w-10 text-center font-mono text-xs font-black text-primary bg-transparent focus:outline-none"
                              />
                              <button type="button" onClick={(e) => handleIncrement(e, item)} className="w-5 h-5 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center transition-colors cursor-pointer" title="زيادة الكمية">
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={(e) => handleIncrement(e, item)} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white text-[11px] font-bold transition-all cursor-pointer">
                              <Plus className="w-3 h-3" />
                              <span>إضافة</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
        <span className="text-[11px] font-bold text-on-surface-variant block">
          البنود المختارة للتحويل ({selectedList.length}):
        </span>

        {selectedList.length === 0 ? (
          <div className="p-3 text-center text-xs font-bold text-on-surface-variant/70 border border-dashed border-outline-variant/40 rounded-xl">
            لم يتم اختيار أصناف للتحويل بعد. انقر على أي صنف من الشبكة بالأعلى لإضافته.
          </div>
        ) : (
          selectedList.map(({ item, quantity, unit }, idx) => {
            const availableUnits = getAvailableUnitsForItem(item)
            const stockBadge = getStockBadgeInfo(item.availableStock, item)
            return (
              <div key={item.id} className="rounded-2xl p-2.5 bg-surface-low border border-outline-variant/30 hover:border-primary/40 space-y-2 transition-all">
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-[11px] text-primary font-black bg-primary/10 px-2 py-0.5 rounded-full shrink-0">#{idx + 1}</span>
                    <span className="font-black text-on-surface truncate">{getItemDisplayName(item)}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${stockBadge.className}`}>{stockBadge.text}</span>
                  </div>
                  <button type="button" onClick={() => onQuantityChange(item.id, 0, unit, item)} className="p-1 rounded-full text-error hover:bg-error-container/40 transition-colors cursor-pointer" title="حذف البند">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-1.5 border-t border-surface-container">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] font-bold text-on-surface-variant">الوحدة:</span>
                    {availableUnits.map((u) => (
                      <button
                        key={u} type="button" onClick={(e) => handleSelectUnit(e, item, u)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${unit === u ? 'bg-primary text-white border-primary shadow-xs font-black' : 'bg-surface-lowest border-outline-variant/30 text-on-surface hover:bg-surface-container'}`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 bg-surface-lowest px-2 py-0.5 rounded-xl border border-outline-variant/40 focus-within:border-primary">
                    <span className="text-[10px] font-bold text-on-surface-variant">الكمية:</span>
                    <input type="number" min="0" step="any" value={quantity} onChange={(e) => handleInputQuantity(item, e.target.value)} className="w-16 text-center font-mono text-xs font-black text-primary bg-transparent focus:outline-none" />
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

export default AX_TransferItemsGrid
