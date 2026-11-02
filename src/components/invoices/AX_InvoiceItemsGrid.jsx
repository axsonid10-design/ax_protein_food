import React, { useState, useMemo } from 'react'
import { Search, Plus, Minus, Check, Layers } from 'lucide-react'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'
import { axToast } from '../common/AX_Toast'

export function AX_InvoiceItemsGrid({
  items = [],
  invoiceItems = [],
  invType = 'sale',
  warehouseId,
  inventoryStock = [],
  getItemStock,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem,
}) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

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
      const cat = it.primaryCategory || 'أقسام عامة'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(it)
    })
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }))
  }, [filteredItems, selectedCategory, searchQuery])

  const invoiceItemsMap = useMemo(() => {
    const map = new Map()
    invoiceItems.forEach((row, index) => {
      map.set(row.itemId, { index, quantity: Number(row.quantity) || 0 })
    })
    return map
  }, [invoiceItems])

  const isSale = invType === 'sale' || invType === 'sale_return'

  const getStock = (itemId) => {
    if (typeof getItemStock === 'function') return getItemStock(itemId, warehouseId)
    if (!warehouseId || !itemId) return 0
    const row = (inventoryStock || []).find((s) => s.warehouseId === warehouseId && s.itemId === itemId)
    return Number(row?.quantity) || 0
  }

  const handleCardClick = (item) => {
    const existing = invoiceItemsMap.get(item.id)
    const avail = getStock(item.id)
    if (invType === 'sale') {
      if (avail <= 0) {
        axToast.error('رصيد الصنف غير متاح في المخزن المحدد')
        return
      }
      if (existing && existing.quantity + 1 > avail) {
        axToast.error('رصيد الصنف غير متاح في المخزن المحدد')
        return
      }
    }
    if (existing) {
      onUpdateQuantity(existing.index, existing.quantity + 1)
    } else {
      const price = isSale ? (item.sellPrice ?? 0) : (item.buyPrice ?? 0)
      onAddItem({
        itemId: item.id,
        quantity: 1,
        price,
      })
    }
  }

  const handleMinusClick = (e, item) => {
    e.stopPropagation()
    const existing = invoiceItemsMap.get(item.id)
    if (!existing) return
    if (existing.quantity > 1) {
      onUpdateQuantity(existing.index, existing.quantity - 1)
    } else {
      onRemoveItem(existing.index)
    }
  }

  const handlePlusClick = (e, item) => {
    e.stopPropagation()
    const existing = invoiceItemsMap.get(item.id)
    const avail = getStock(item.id)
    if (invType === 'sale') {
      if (avail <= 0 || (existing && existing.quantity + 1 > avail)) {
        axToast.error('رصيد الصنف غير متاح في المخزن المحدد')
        return
      }
    }
    if (existing) {
      onUpdateQuantity(existing.index, existing.quantity + 1)
    } else {
      handleCardClick(item)
    }
  }

  return (
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

      <div className="max-h-64 overflow-y-auto space-y-3.5 p-0.5">
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

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {section.items.map((item) => {
                  const added = invoiceItemsMap.get(item.id)
                  const price = isSale ? (item.sellPrice ?? 0) : (item.buyPrice ?? 0)
                  const isAdded = Boolean(added)
                  const avail = getStock(item.id)
                  const isOutOfStock = invType === 'sale' && avail <= 0

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleCardClick(item)}
                      className={`p-2.5 rounded-2xl border transition-all text-right flex flex-col justify-between select-none cursor-pointer group ${
                        isOutOfStock
                          ? 'bg-surface-low/50 border-rose-500/30 opacity-80'
                          : isAdded
                          ? 'bg-primary/10 border-primary/40 shadow-xs'
                          : 'bg-surface-low/70 hover:bg-surface-low border-outline-variant/30 hover:border-primary/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-surface-lowest text-on-surface-variant border border-outline-variant/20 shrink-0">
                            {item.unitType || 'كرتونة'}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${
                            avail > 0
                              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                          }`}>
                            {avail > 0 ? `متاح: ${avail}` : 'رصيد 0'}
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

                      <div className="mt-2 pt-1.5 border-t border-surface-container flex items-center justify-between">
                        <span className="text-xs font-black font-mono text-primary">
                          {Number(price).toLocaleString('en-US')} ج.م
                        </span>

                        {isAdded ? (
                          <div className="flex items-center gap-1 bg-surface-lowest rounded-full p-0.5 border border-primary/30">
                            <button
                              type="button"
                              onClick={(e) => handleMinusClick(e, item)}
                              className="w-5 h-5 rounded-full bg-surface-low hover:bg-error hover:text-white flex items-center justify-center text-on-surface transition-colors cursor-pointer"
                              title="إنقاص الكمية"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="font-mono text-xs font-black px-1 text-primary">
                              {added.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handlePlusClick(e, item)}
                              className="w-5 h-5 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center transition-colors cursor-pointer"
                              title="زيادة الكمية"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCardClick(item)
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white text-[11px] font-bold transition-all cursor-pointer"
                          >
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
  )
}

export default AX_InvoiceItemsGrid
