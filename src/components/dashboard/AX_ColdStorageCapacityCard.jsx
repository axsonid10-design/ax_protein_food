import React, { useMemo } from 'react'
import { Warehouse, Snowflake, ThermometerSnowflake, ShieldCheck } from 'lucide-react'

export function AX_ColdStorageCapacityCard({ warehouses = [], inventoryStock = [] }) {
  const warehouseStats = useMemo(() => {
    return warehouses.map((wh) => {
      const stocks = inventoryStock.filter((s) => s.warehouseId === wh.id)
      const totalUnits = stocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
      const maxCapacity = wh.type === 'factory' ? 3000 : 2000
      const occupancyPct = Math.min(100, Math.round((totalUnits / maxCapacity) * 100))

      return {
        id: wh.id,
        name: wh.name,
        manager: wh.manager,
        type: wh.type,
        currentUnits: totalUnits,
        maxCapacity,
        occupancyPct,
        tempStatus: '-18°C',
        status: occupancyPct > 85 ? 'ممتلئ تقريباً' : 'سعة مثالية',
      }
    })
  }, [warehouses, inventoryStock])

  return (
    <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-surface-container pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ThermometerSnowflake className="w-4 h-4" />
          </div>
          <h4 className="text-xs sm:text-sm font-black text-on-surface">
            إشغال سلاسل التبريد وسعة المخازن
          </h4>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
          <Snowflake className="w-3 h-3 text-primary animate-spin-slow" />
          <span>تجميد آمن</span>
        </span>
      </div>

      <div className="space-y-4 pt-1">
        {warehouseStats.map((wh) => (
          <div
            key={wh.id}
            className="p-3.5 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-primary" />
                <span className="text-xs font-black text-on-surface">{wh.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  {wh.tempStatus}
                </span>
              </div>
              <div className="flex items-baseline gap-1 text-xs font-mono font-black text-primary">
                <span>{wh.occupancyPct}%</span>
                <span className="text-[10px] text-on-surface-variant font-bold">إشغال</span>
              </div>
            </div>

            <div className="w-full h-3 rounded-full bg-surface-container overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  wh.occupancyPct > 85 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.max(8, wh.occupancyPct)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-on-surface-variant">
              <span>
                المشغول: {wh.currentUnits.toLocaleString('en-US')} من {wh.maxCapacity.toLocaleString('en-US')} وحدة
              </span>
              <span className={wh.occupancyPct > 85 ? 'text-amber-700' : 'text-emerald-700'}>
                {wh.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
