import React, { useState, useMemo, useEffect } from 'react'
import { PackagePlus, X, Search, Check, Layers, AlertCircle, ShoppingCart } from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { axToast } from '../common/AX_Toast'
import { executeVanStockLoading, getCartonEquivalentQuantity } from '../../store/vanDistributionHelpers'

export function AX_VanStockLoadingModal({ isOpen, onClose, currentVan, onLoaded }) {
  useBodyScrollLock(isOpen, onClose)
  const warehouses = useAXStore((state) => state.warehouses) || []
  const items = useAXStore((state) => state.items) || []
  const inventoryStock = useAXStore((state) => state.inventoryStock) || []
  const stockAudits = useAXStore((state) => state.stockAudits) || []
  const profile = useAXStore((state) => state.profile)

  const nonVanWarehouses = useMemo(() => {
    return warehouses.filter((w) => w.type !== 'van' && w.id !== currentVan?.id)
  }, [warehouses, currentVan])

  const [fromWarehouseId, setFromWarehouseId] = useState(
    nonVanWarehouses[0]?.id || warehouses[0]?.id || ''
  )
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cartEntries, setCartEntries] = useState({})
  const [unitSelections, setUnitSelections] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = useMemo(() => {
    const set = new Set()
    for (const it of items) {
      if (it?.primaryCategory) set.add(it.primaryCategory)
    }
    return ['all', ...Array.from(set)]
  }, [items])

  const getItemStockAtSource = (itemId) => {
    if (!fromWarehouseId || !itemId) return 0
    const row = inventoryStock.find(
      (s) => (s.warehouseId === fromWarehouseId || s.warehouse_id === fromWarehouseId) && (s.itemId === itemId || s.item_id === itemId)
    )
    return Number(row?.quantity) || 0
  }

  const filteredItems = useMemo(() => {
    let result = items || []
    if (selectedCategory !== 'all') {
      result = result.filter((it) => it.primaryCategory === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (it) =>
          (it.compositeName && it.compositeName.toLowerCase().includes(q)) ||
          (it.name && it.name.toLowerCase().includes(q)) ||
          (it.code && it.code.toLowerCase().includes(q))
      )
    }
    return result
  }, [items, selectedCategory, searchQuery])

  const loadSummary = useMemo(() => {
    let totalItems = 0
    let totalCartons = 0
    let totalWeight = 0

    for (const [itemId, rawVal] of Object.entries(cartEntries)) {
      const num = Number(rawVal) || 0
      if (num <= 0) continue

      const it = items.find((i) => i.id === itemId)
      const u = unitSelections[itemId] || it?.unitType || 'كرتونة'
      const cartonEq = getCartonEquivalentQuantity(num, u, it)

      totalItems++
      totalCartons += cartonEq
      const wt = Number(it?.weightPerCarton ?? it?.weight_per_carton ?? 0)
      totalWeight += cartonEq * wt
    }

    return {
      totalItems,
      totalCartons: Number(totalCartons.toFixed(2)),
      totalWeight: Number(totalWeight.toFixed(2)),
    }
  }, [cartEntries, unitSelections, items])

  useEffect(() => {
    setCartEntries({})
    setUnitSelections({})
    setSearchQuery('')
    setSelectedCategory('all')
    if (nonVanWarehouses[0]?.id) {
      setFromWarehouseId(nonVanWarehouses[0].id)
    }
  }, [isOpen, currentVan?.id])

  if (!isOpen) return null

  const handleQuantityChange = (itemId, val) => {
    setCartEntries((prev) => ({
      ...prev,
      [itemId]: val,
    }))
  }

  const handleUnitToggle = (itemId, unit) => {
    setUnitSelections((prev) => ({
      ...prev,
      [itemId]: unit,
    }))
  }

  const handleQuickAdd = (itemId, amount) => {
    const current = Number(cartEntries[itemId]) || 0
    const next = Math.max(0, Number((current + amount).toFixed(2)))
    setCartEntries((prev) => ({
      ...prev,
      [itemId]: next === 0 ? '' : next,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fromWarehouseId) {
      axToast.error('يرجى تحديد المخزن المصدر للشحن')
      return
    }

    const itemsToLoad = []
    for (const [itemId, rawVal] of Object.entries(cartEntries)) {
      const num = Number(rawVal) || 0
      if (num <= 0) continue

      const it = items.find((i) => i.id === itemId)
      const unit = unitSelections[itemId] || it?.unitType || 'كرتونة'

      itemsToLoad.push({
        itemId,
        rawQuantity: num,
        quantity: num,
        selectedUnit: unit,
        unit,
      })
    }

    if (itemsToLoad.length === 0) {
      axToast.error('يرجى إدخال كميات للأصناف المراد شحنها')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await executeVanStockLoading(
        {
          fromWarehouseId,
          vanWarehouseId: currentVan?.id,
          items: itemsToLoad,
          operationalDate: new Date().toISOString().split('T')[0],
          notes: `شحن حمولة بضاعة لسيارة ${currentVan?.name || ''}`,
          userId: profile?.id,
          userName: profile?.name || 'مدير المنظومة',
        },
        {
          items,
          warehouses,
          inventoryStock,
          stockAudits,
        },
        useAXStore.setState
      )

      if (res?.success) {
        axToast.success(`تم شحن ${loadSummary.totalCartons} كرتونة مكافئة لسيارة ${currentVan?.name} بنجاح`)
        if (typeof onLoaded === 'function') onLoaded(res)
        onClose()
      } else {
        axToast.error(res?.error || 'فشل تنفيذ الشحن المخزني')
      }
    } catch {
      axToast.error('حدث خطأ أثناء تحميل بضاعة السيارة')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface-lowest border-2 border-primary/20 rounded-3xl shadow-level3 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-surface-container flex items-center justify-between bg-surface-lowest">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-on-surface">
                شحن بضاعة لسيارة: {currentVan?.name}
              </h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                تحميل كروت الأصناف وتجزئة الكراتين والقطع للسيارة
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5 border-b border-surface-container bg-surface-low/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                المخزن المصدر للشحن
              </label>
              <AX_SearchableSelect
                value={fromWarehouseId}
                onChange={setFromWarehouseId}
                options={nonVanWarehouses.map((w) => ({
                  value: w.id,
                  label: w.name,
                  badge: w.type === 'cold_store' ? 'تجميد رئيسي' : 'مخزن فرعي',
                }))}
                placeholder="اختر المخزن المصدر..."
              />
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="بحث سريع بالصنف أو الكود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3.5 py-2 rounded-2xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface focus:border-primary transition-all"
              />
              <Search className="w-4 h-4 text-on-surface-variant absolute right-3 top-2.5" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-level1'
                    : 'bg-surface-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {cat === 'all' ? 'جميع الأقسام' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-on-surface-variant">
              لا توجد أصناف مطابقة للبحث أو القسم المختار
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredItems.map((it) => {
                const stockAtSrc = getItemStockAtSource(it.id)
                const currentVal = cartEntries[it.id] ?? ''
                const selectedUnit = unitSelections[it.id] || it.unitType || 'كرتونة'
                const hasSub = it.subUnitType && Number(it.piecesPerCarton || 0) > 0
                const cartonEq = Number(currentVal) > 0 ? getCartonEquivalentQuantity(Number(currentVal), selectedUnit, it) : 0

                return (
                  <div
                    key={it.id}
                    className={`rounded-2xl border p-3.5 space-y-2.5 transition-all ${
                      Number(currentVal) > 0
                        ? 'bg-primary/5 border-primary shadow-xs'
                        : 'bg-surface-lowest border-outline-variant/30 hover:border-outline-variant'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-black text-on-surface line-clamp-1">
                          {it.compositeName || it.name}
                        </h4>
                        <span className="text-[11px] font-bold text-on-surface-variant block mt-0.5">
                          {it.primaryCategory || 'صنف'} • {it.code || ''}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-surface-low border border-outline-variant/30 text-[10px] font-mono font-bold text-on-surface shrink-0">
                        متاح: {stockAtSrc} ك
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-on-surface-variant">
                      <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px]">
                        {hasSub ? `1 ك = ${it.piecesPerCarton} ${it.subUnitType}` : 'كرتونة مصمتة'}
                      </span>
                      {Number(it.weightPerCarton || 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px]">
                          {it.weightPerCarton} كجم/ك
                        </span>
                      )}
                    </div>

                    <div className="pt-1 space-y-2">
                      {hasSub && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUnitToggle(it.id, 'كرتونة')}
                            className={`flex-1 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                              selectedUnit === 'كرتونة'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-surface-low text-on-surface hover:bg-surface-container'
                            }`}
                          >
                            كرتونة
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnitToggle(it.id, it.subUnitType)}
                            className={`flex-1 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                              selectedUnit === it.subUnitType
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-surface-low text-on-surface hover:bg-surface-container'
                            }`}
                          >
                            {it.subUnitType}
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(it.id, -1)}
                          className="w-7 h-7 rounded-full bg-surface-low hover:bg-surface-container flex items-center justify-center font-bold text-on-surface cursor-pointer text-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="الكمية..."
                          value={currentVal}
                          onChange={(e) => handleQuantityChange(it.id, e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-mono font-bold text-center text-on-surface focus:border-primary transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(it.id, 1)}
                          className="w-7 h-7 rounded-full bg-surface-low hover:bg-surface-container flex items-center justify-center font-bold text-on-surface cursor-pointer text-xs"
                        >
                          +
                        </button>
                      </div>

                      {selectedUnit !== 'كرتونة' && Number(currentVal) > 0 && (
                        <div className="text-[11px] font-bold text-primary flex items-center justify-between px-1">
                          <span>المعادل بالكرتونة:</span>
                          <span className="font-mono font-black">{cartonEq} كرتونة</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-surface-container bg-surface-lowest flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs font-bold text-on-surface">
            <div>
              <span className="text-on-surface-variant ml-1">الأصناف المحددة:</span>
              <span className="font-mono font-black text-primary">{loadSummary.totalItems}</span>
            </div>
            <div>
              <span className="text-on-surface-variant ml-1">إجمالي الكراتين:</span>
              <span className="font-mono font-black text-primary">{loadSummary.totalCartons} ك</span>
            </div>
            {loadSummary.totalWeight > 0 && (
              <div className="hidden sm:block">
                <span className="text-on-surface-variant ml-1">الوزن التقريبي:</span>
                <span className="font-mono font-black text-on-surface">{loadSummary.totalWeight} كجم</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full bg-surface-container hover:bg-surface-high text-on-surface-variant text-xs font-bold cursor-pointer transition-all"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || loadSummary.totalItems === 0}
              className="px-6 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all"
            >
              <PackagePlus className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري التحميل...' : 'تأكيد شحن البضاعة'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AX_VanStockLoadingModal
