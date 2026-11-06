import React from 'react'

export function AX_StockAuditStatsBar({ stats }) {
  if (!stats) return null

  const {
    enrichedRows = [],
    matchedCount = 0,
    deficitCount = 0,
    totalDeficitCost = 0,
    surplusCount = 0,
    totalSurplusCost = 0,
    netVarianceCost = 0,
  } = stats

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-0.5">
        <span className="text-[10px] text-on-surface-variant block">إجمالي أصناف المنظومة</span>
        <span className="text-base font-black text-on-surface block font-mono">
          {enrichedRows.length} صنف
        </span>
        <span className="text-[10px] text-emerald-600 block">
          {matchedCount} مطابق دفترياً
        </span>
      </div>

      <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-0.5">
        <span className="text-[10px] text-on-surface-variant block">حالات العجز (نقص)</span>
        <span className="text-base font-black text-rose-700 block font-mono">
          {deficitCount} أصناف
        </span>
        <span className="text-[10px] text-rose-700 block font-mono">
          خسارة: -{totalDeficitCost.toLocaleString('en-US')} ج.م
        </span>
      </div>

      <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-0.5">
        <span className="text-[10px] text-on-surface-variant block">حالات الفائض (زيادة)</span>
        <span className="text-base font-black text-emerald-600 block font-mono">
          {surplusCount} أصناف
        </span>
        <span className="text-[10px] text-emerald-700 block font-mono">
          فائض: +{totalSurplusCost.toLocaleString('en-US')} ج.م
        </span>
      </div>

      <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-0.5">
        <span className="text-[10px] text-on-surface-variant block">صافي الفارق المالي</span>
        <span
          className={`text-base font-black block font-mono ${
            netVarianceCost >= 0 ? 'text-primary' : 'text-rose-700'
          }`}
        >
          {netVarianceCost.toLocaleString('en-US')} ج.م
        </span>
        <span className="text-[10px] text-on-surface-variant block">
          التأثير المالي على الأرباح
        </span>
      </div>
    </div>
  )
}

export default AX_StockAuditStatsBar
