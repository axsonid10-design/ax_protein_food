import React from 'react'
import { LayoutGrid, Table as TableIcon, FolderKanban, Tag } from 'lucide-react'
import { AX_ItemStatusIndicators } from '../items/AX_ItemStatusIndicators'
import { formatDualUnits, isItemNearDepletion } from '../../utils/itemUnitFormatters'

export function AX_WarehouseInventoryViews({
  viewMode = 'grid',
  onChangeViewMode,
  stockRows = [],
  onSelectItem,
}) {
  if (!stockRows || stockRows.length === 0) {
    return (
      <div className="py-12 text-center text-on-surface-variant text-xs font-bold">
        لا توجد بضاعة مسجلة مطابقة في هذا المخزن حالياً
      </div>
    )
  }

  // Group by Primary Category directly (not subCategory) for 'categories' mode
  const primaryGroups = stockRows.reduce((acc, curr) => {
    const pCat = curr.item?.primaryCategory || 'عام'
    if (!acc[pCat]) acc[pCat] = []
    acc[pCat].push(curr)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
          {stockRows.map((s, idx) => {
            const it = s.item || {}
            const isNegative = Number(s.quantity) < 0
            const nearDepletion = isItemNearDepletion(it, s.quantity)
            return (
              <div
                key={idx}
                onClick={() => onSelectItem(it)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 text-right group ${
                  isNegative
                    ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/10'
                    : nearDepletion
                    ? 'bg-rose-500/5 border-2 border-rose-500/60 hover:border-rose-600 shadow-rose-500/10'
                    : 'bg-surface-lowest border-outline-variant/30 hover:border-primary/50 hover:bg-surface-low/50 shadow-xs'
                }`}
                title="انقر لعرض حركة الصنف 360°"
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-on-surface-variant font-bold">
                        {it.code || ''}
                      </span>
                      <AX_ItemStatusIndicators item={it} currentStock={s.quantity} showBadges={false} />
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-container text-on-surface-variant font-bold truncate max-w-[80px]">
                      {it.primaryCategory || 'عام'}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-on-surface mt-1 line-clamp-2 leading-snug">
                    {it.compositeName || 'صنف'}
                  </h4>
                  {nearDepletion && (
                    <div className="mt-1">
                      <AX_ItemStatusIndicators item={it} currentStock={s.quantity} showBadges={true} />
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-surface-container/40 flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-[10px] font-bold text-on-surface-variant truncate">
                    {formatDualUnits(s.quantity, s.unit, it)}
                  </span>
                  <span
                    className={`font-mono font-black text-xs px-2 py-0.5 rounded-full border ${
                      isNegative || nearDepletion
                        ? 'text-error bg-error/10 border-error/30'
                        : 'text-primary bg-primary/10 border-primary/20'
                    }`}
                  >
                    {s.quantity}
                    {isNegative && <span className="mr-0.5 text-[9px] font-bold">(سالب)</span>}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="overflow-x-auto border border-outline-variant/30 rounded-2xl bg-surface-lowest">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-surface-low border-b border-surface-container text-on-surface-variant font-black h-10 text-[11px]">
                <th className="px-3 w-10 text-center">#</th>
                <th className="px-3">كود الصنف</th>
                <th className="px-3">اسم الصنف</th>
                <th className="px-3">القسم الرئيسي</th>
                <th className="px-3 text-center">الرصيد بالمخزن</th>
                <th className="px-3 text-center">الوحدة</th>
                <th className="px-3 text-center">حركة الصنف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container/40 font-bold">
              {stockRows.map((s, idx) => {
                const it = s.item || {}
                const isNegative = Number(s.quantity) < 0
                return (
                  <tr
                    key={idx}
                    onClick={() => onSelectItem(it)}
                    className="h-11 hover:bg-surface-low/50 transition-colors cursor-pointer"
                  >
                    <td className="px-3 text-center text-on-surface-variant font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="px-3 font-mono text-primary text-[11px] font-bold">
                      {it.code || '—'}
                    </td>
                    <td className="px-3 text-on-surface font-black">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{it.compositeName || 'صنف'}</span>
                        <AX_ItemStatusIndicators item={it} currentStock={s.quantity} showBadges={true} />
                      </div>
                    </td>
                    <td className="px-3 text-on-surface-variant text-[11px]">
                      {it.primaryCategory || 'عام'}
                    </td>
                    <td className="px-3 text-center font-mono font-black text-sm">
                      <span
                        className={`px-2 py-0.5 rounded-full inline-block ${
                          isNegative
                            ? 'text-error bg-error/10 border border-error/30'
                            : 'text-primary bg-primary/10 border border-primary/20'
                        }`}
                      >
                        {s.quantity}
                        {isNegative && <span className="mr-1 text-[10px]">(سالب)</span>}
                      </span>
                    </td>
                    <td className="px-3 text-center text-on-surface-variant text-[11px] font-bold">
                      {formatDualUnits(s.quantity, s.unit, it)}
                    </td>
                    <td className="px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectItem(it)
                        }}
                        className="px-2.5 py-1 rounded-full bg-surface-low hover:bg-primary/10 hover:text-primary text-[10px] font-black border border-outline-variant/30 transition-all cursor-pointer"
                      >
                        عرض الحركة
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'categories' && (
        <div className="space-y-4">
          {Object.entries(primaryGroups).map(([catName, rows]) => (
            <div
              key={catName}
              className="bg-surface-low/40 border border-outline-variant/30 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-surface-container pb-2">
                <span className="text-xs font-black text-on-surface flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  <span>{catName}</span>
                </span>
                <span className="text-[11px] font-bold text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container">
                  {rows.length} أصناف
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {rows.map((s, idx) => {
                  const it = s.item || {}
                  const isNegative = Number(s.quantity) < 0
                  return (
                    <div
                      key={idx}
                      onClick={() => onSelectItem(it)}
                      className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs flex flex-col justify-between gap-1.5 cursor-pointer hover:border-primary/50 hover:bg-surface-low/50 transition-all"
                    >
                      <span className="text-xs font-black text-on-surface truncate">
                        {it.compositeName || 'صنف'}
                      </span>
                      <div className="flex items-center justify-between pt-1 border-t border-surface-container/30">
                        <span className="text-[10px] text-on-surface-variant font-bold">{s.unit}</span>
                        <span className={`font-mono font-black text-xs ${isNegative ? 'text-error' : 'text-primary'}`}>
                          {s.quantity}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
