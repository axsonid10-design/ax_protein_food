import React, { useState, useEffect, useMemo } from 'react'
import {
  Boxes,
  Pin,
  Settings,
  ChevronLeft,
  X,
  Search,
  Check,
  Package,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_StockDrilldownModal } from './AX_StockDrilldownModal'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'

export function AX_PinnedStockWidget() {
  const { items = [], inventoryStock = [] } = useAXStore()

  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('ax_dashboard_pinned_items')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return (items || []).slice(0, 4).map((i) => i.id)
  })

  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [selectedDrilldownItem, setSelectedDrilldownItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem('ax_dashboard_pinned_items', JSON.stringify(pinnedIds))
    } catch {}
  }, [pinnedIds])

  const pinnedItems = useMemo(() => {
    const list = (items || []).filter((i) => pinnedIds.includes(i.id))
    if (list.length === 0 && (items || []).length > 0) {
      return (items || []).slice(0, 4)
    }
    return list
  }, [items, pinnedIds])

  const getItemQuantity = (itemId) => {
    return (inventoryStock || [])
      .filter((s) => s.itemId === itemId)
      .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
  }

  const togglePin = (itemId) => {
    setPinnedIds((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId)
      } else {
        return [...prev, itemId]
      }
    })
  }

  return (
    <div className="w-full bg-surface-lowest border border-outline-variant/30 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Boxes className="w-4 h-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-black text-on-surface">مراقبة كميات الأصناف المختارة</h3>
        </div>

        <button
          type="button"
          onClick={() => setIsConfigOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-outline-variant/40 hover:bg-surface-low text-xs font-bold text-on-surface-variant hover:text-primary transition-all cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>تحديد الأصناف</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {pinnedItems.map((item) => {
          const qty = getItemQuantity(item.id)
          const piecesPerCarton = Number(item.piecesPerCarton) || 0
          const weightPerCarton = Number(item.weightPerCarton) || 0

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedDrilldownItem(item)}
              className="text-right bg-surface-low/60 hover:bg-surface-container/60 border border-outline-variant/30 hover:border-primary/50 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 transition-all duration-200 group flex flex-col justify-between space-y-1.5 cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-1 w-full">
                <span className="text-xs font-black text-on-surface truncate group-hover:text-primary transition-colors">
                  {getItemDisplayName(item)}
                </span>
                <ChevronLeft className="w-3.5 h-3.5 text-outline-variant group-hover:-translate-x-0.5 transition-transform shrink-0" />
              </div>

              <div className="flex items-baseline gap-1 pt-0.5">
                <span className="text-base sm:text-xl font-black font-mono text-primary">
                  {qty.toLocaleString('en-US')}
                </span>
                <span className="text-[11px] font-bold text-on-surface-variant">
                  {item.unitType || 'كرتونة'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-bold pt-1 border-t border-outline-variant/20 w-full">
                <span>{piecesPerCarton > 0 ? `${(qty * piecesPerCarton).toLocaleString('en-US')} قطعة` : '—'}</span>
                <span>{weightPerCarton > 0 ? `${(qty * weightPerCarton).toLocaleString('en-US')} كجم` : '—'}</span>
              </div>
            </button>
          )
        })}
      </div>

      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-level3 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <Pin className="w-5 h-5 text-primary" />
                <h4 className="text-sm font-black text-on-surface">اختيار الأصناف المعروضة بالرئيسية</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="w-8 h-8 rounded-full border border-outline-variant/40 flex items-center justify-center text-on-surface-variant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-outline-variant absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الأصناف..."
                className="w-full pl-3 pr-9 py-2 rounded-full border border-outline-variant/60 text-xs font-semibold bg-surface-lowest text-on-surface outline-none"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-outline-variant/20 border border-outline-variant/30 rounded-2xl">
              {(items || [])
                .filter((item) => {
                  const q = searchQuery.trim().toLowerCase()
                  if (!q) return true
                  const displayName = getItemDisplayName(item).toLowerCase()
                  const sub = (item.subCategory || '').toLowerCase()
                  const prim = (item.primaryCategory || '').toLowerCase()
                  const sec = (item.secondaryCategory || '').toLowerCase()
                  const code = (item.code || '').toLowerCase()
                  return displayName.includes(q) || sub.includes(q) || prim.includes(q) || sec.includes(q) || code.includes(q)
                })
                .map((item) => {
                  const isPinned = pinnedIds.includes(item.id)
                  return (
                    <div
                      key={item.id}
                      onClick={() => togglePin(item.id)}
                      className="p-2.5 flex items-center justify-between hover:bg-surface-container/40 cursor-pointer transition-colors text-xs"
                    >
                      <div>
                        <span className="font-bold text-on-surface block">{getItemDisplayName(item)}</span>
                        <span className="text-[10px] text-on-surface-variant font-mono">{item.primaryCategory ? `${item.primaryCategory} • ` : ''}{item.code || item.id}</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        isPinned ? 'bg-primary text-white border-primary' : 'border-outline-variant/50 text-transparent'
                      }`}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )
                })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="py-2 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black"
              >
                تم الحفظ
              </button>
            </div>
          </div>
        </div>
      )}

      <AX_StockDrilldownModal
        item={selectedDrilldownItem}
        isOpen={Boolean(selectedDrilldownItem)}
        onClose={() => setSelectedDrilldownItem(null)}
      />
    </div>
  )
}

export default AX_PinnedStockWidget
