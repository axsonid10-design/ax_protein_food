import React, { useState, useMemo } from 'react'
import { PieChart as PieIcon, Layers } from 'lucide-react'

export function AX_StockDistributionChart({
  items = [],
  inventoryStock = [],
  warehouses = [],
}) {
  const [viewBy, setViewBy] = useState('category')

  const distribution = useMemo(() => {
    if (viewBy === 'warehouse') {
      const result = warehouses.map((wh, idx) => {
        const stocks = inventoryStock.filter((s) => s.warehouseId === wh.id)
        const totalQty = stocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
        const totalVal = stocks.reduce((sum, s) => {
          const it = items.find((i) => i.id === s.itemId)
          const price = Number(it?.buyPrice) || 0
          return sum + (Number(s.quantity) || 0) * price
        }, 0)
        const colors = ['#991b1b', '#450a0a', '#b91c1c', '#7f1d1d']
        return {
          id: wh.id,
          name: wh.name,
          qty: totalQty,
          value: totalVal,
          color: colors[idx % colors.length],
        }
      })
      const totalAllQty = result.reduce((a, b) => a + b.qty, 0) || 1
      return result.map((r) => ({
        ...r,
        pct: Math.round((r.qty / totalAllQty) * 100),
      }))
    }

    const catMap = {}
    inventoryStock.forEach((stk) => {
      const it = items.find((i) => i.id === stk.itemId)
      const cat = it?.primaryCategory || 'أخرى'
      if (!catMap[cat]) {
        catMap[cat] = { name: cat, qty: 0, value: 0 }
      }
      const qty = Number(stk.quantity) || 0
      const cost = Number(it?.buyPrice) || 0
      catMap[cat].qty += qty
      catMap[cat].value += qty * cost
    })

    const palette = ['#991b1b', '#450a0a', '#b91c1c', '#e11d48', '#7f1d1d']
    const entries = Object.values(catMap)
    const totalAllQty = entries.reduce((a, b) => a + b.qty, 0) || 1

    return entries.map((e, idx) => ({
      ...e,
      id: e.name,
      color: palette[idx % palette.length],
      pct: Math.round((e.qty / totalAllQty) * 100),
    }))
  }, [viewBy, items, inventoryStock, warehouses])

  const totalUnits = distribution.reduce((sum, d) => sum + d.qty, 0)
  const totalStockValue = distribution.reduce((sum, d) => sum + d.value, 0)

  const radius = 38
  const circumference = 2 * Math.PI * radius

  let accumulatedLength = 0
  const segments = distribution.map((d) => {
    const strokeDash = (Math.max(2, d.pct) / 100) * circumference
    const strokeOffset = -accumulatedLength
    accumulatedLength += strokeDash
    return {
      ...d,
      strokeDash: `${strokeDash} ${circumference}`,
      strokeOffset,
    }
  })

  return (
    <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-surface-container pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-on-surface">
              توزيع رصيد المخزون الفعلي
            </h4>
            <div className="flex items-baseline gap-1 text-[11px] font-bold text-on-surface-variant">
              <span>إجمالي:</span>
              <span className="font-mono font-black text-secondary">
                {totalUnits.toLocaleString('en-US')}
              </span>
              <span>وحدة</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-surface-low p-1 rounded-full border border-outline-variant/30">
          <button
            type="button"
            onClick={() => setViewBy('category')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              viewBy === 'category'
                ? 'bg-secondary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            بالأقسام
          </button>
          <button
            type="button"
            onClick={() => setViewBy('warehouse')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              viewBy === 'warehouse'
                ? 'bg-secondary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            بالمخازن
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
            {segments.map((s, idx) => (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth="12"
                strokeDasharray={s.strokeDash}
                strokeDashoffset={s.strokeOffset}
                className="transition-all duration-700"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="font-mono text-sm sm:text-base font-black text-on-surface leading-tight">
              {totalUnits.toLocaleString('en-US')}
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant">وحدة مخزنية</span>
          </div>
        </div>

        <div className="w-full space-y-2 text-xs font-bold">
          {distribution.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-surface-low/70 border border-outline-variant/30"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-on-surface truncate">{item.name}</span>
              </div>
              <div className="flex items-baseline gap-2 shrink-0">
                <span className="font-mono font-black text-on-surface">
                  {item.qty.toLocaleString('en-US')}
                </span>
                <span className="text-[10px] text-on-surface-variant font-mono">
                  ({item.pct}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
