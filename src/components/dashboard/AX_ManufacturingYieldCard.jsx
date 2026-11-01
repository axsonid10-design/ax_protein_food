import React, { useMemo } from 'react'
import { Hammer, CheckCircle2, AlertOctagon, TrendingUp } from 'lucide-react'

export function AX_ManufacturingYieldCard({ manufacturingOrders = [] }) {
  const stats = useMemo(() => {
    const totalOrders = manufacturingOrders.length
    if (totalOrders === 0) {
      return {
        totalOrders: 0,
        yieldEfficiency: 0,
        avgWaste: 0,
        totalRawConsumed: 0,
        totalProduced: 0,
      }
    }

    const totalRawConsumed = manufacturingOrders.reduce(
      (sum, o) => sum + (Number(o.consumedQuantity) || 0),
      0
    )
    const totalProduced = manufacturingOrders.reduce((sum, o) => {
      const itemsSum = (o.producedItems || []).reduce(
        (s, it) => s + (Number(it.quantity) || 0),
        0
      )
      return sum + itemsSum
    }, 0)

    const totalWastePct = manufacturingOrders.reduce(
      (sum, o) => sum + (Number(o.wastePercentage) || 0),
      0
    )
    const avgWaste = Math.round((totalWastePct / totalOrders) * 10) / 10
    const yieldEfficiency = Math.max(0, Math.round((100 - avgWaste) * 10) / 10)

    return {
      totalOrders,
      yieldEfficiency,
      avgWaste,
      totalRawConsumed,
      totalProduced,
    }
  }, [manufacturingOrders])

  return (
    <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-surface-container pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
            <Hammer className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-on-surface">
              كفاءة التفكيك والتشغيل
            </h4>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-bold border border-emerald-500/20">
          <TrendingUp className="w-3 h-3" />
          <span>إنتاجية فائقة</span>
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="space-y-3 flex-1">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-on-surface">كفاءة الاستخراج الصافي</span>
              <span className="font-mono font-black text-primary">{stats.yieldEfficiency}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-low overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${stats.yieldEfficiency}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-on-surface-variant">نسبة الهدر والفاقد</span>
              <span className="font-mono font-black text-amber-700">{stats.avgWaste}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-low overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-700"
                style={{ width: `${stats.avgWaste * 10}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-surface-low border border-outline-variant/30 text-center shrink-0 w-28">
          <span className="text-[10px] font-bold text-on-surface-variant block">أوامر منجزة</span>
          <span className="text-lg font-black font-mono text-primary block mt-0.5">
            {stats.totalOrders}
          </span>
          <span className="text-[10px] font-bold text-emerald-700 block mt-0.5">
            مكتمل 100%
          </span>
        </div>
      </div>
    </div>
  )
}
