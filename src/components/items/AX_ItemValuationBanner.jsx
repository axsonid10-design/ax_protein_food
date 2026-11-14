import React from 'react'
import { Calculator } from 'lucide-react'

export function AX_ItemValuationBanner({
  valuation = {},
  scopeTitle = 'إجمالي المخزون المتاح',
  compact = false,
}) {
  const {
    avgSellingPrice = 0,
    avgPiecePrice = null,
    totalCostValuation = 0,
    totalSellingValuation = 0,
    expectedProfit = 0,
    expectedMarginPct = 0,
  } = valuation || {}

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono font-bold">
        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20">
          تكلفة: {Number(totalCostValuation || 0).toLocaleString('en-US')} ج
        </span>
        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          م.بيع: {Number(avgSellingPrice || 0).toLocaleString('en-US')} ج
        </span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
          قيمة البيع: {Number(totalSellingValuation || 0).toLocaleString('en-US')} ج
        </span>
      </div>
    )
  }

  return (
    <div className="p-2.5 sm:p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 flex flex-wrap items-center justify-between gap-2.5 text-xs">
      <div className="flex items-center gap-2">
        <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
          <Calculator className="w-4 h-4" />
        </span>
        <div>
          <span className="text-[10px] font-bold text-on-surface-variant block">تقييم المخزون المالي (قيمة الصنف)</span>
          <span className="font-black text-on-surface text-xs">{scopeTitle}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-[11px] font-bold">
        <div className="px-2.5 py-1 rounded-xl bg-surface-low border border-outline-variant/20">
          <span className="text-on-surface-variant text-[10px] block font-sans">قيمة التكلفة (FIFO):</span>
          <span className="font-black text-amber-700">{Number(totalCostValuation || 0).toLocaleString('en-US')} ج.م</span>
        </div>

        <div className="px-2.5 py-1 rounded-xl bg-surface-low border border-outline-variant/20">
          <span className="text-on-surface-variant text-[10px] block font-sans">متوسط سعر البيع الفعلي:</span>
          <span className="font-black text-primary">{Number(avgSellingPrice || 0).toLocaleString('en-US')} ج.م</span>
          {avgPiecePrice > 0 && (
            <span className="text-[9px] text-on-surface-variant block font-sans">({avgPiecePrice} ج/قطعة)</span>
          )}
        </div>

        <div className="px-2.5 py-1 rounded-xl bg-surface-low border border-outline-variant/20">
          <span className="text-on-surface-variant text-[10px] block font-sans">إجمالي القيمة البيعية:</span>
          <span className="font-black text-emerald-700">{Number(totalSellingValuation || 0).toLocaleString('en-US')} ج.م</span>
        </div>

        <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
          <span className="text-[10px] block font-sans">الربح التقديري:</span>
          <span className="font-black">
            +{Number(expectedProfit || 0).toLocaleString('en-US')} ج.م ({expectedMarginPct}%)
          </span>
        </div>
      </div>
    </div>
  )
}

export default AX_ItemValuationBanner
