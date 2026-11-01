import React, { useState, useMemo } from 'react'
import { BarChart2, Flame } from 'lucide-react'

export function AX_TopSellingItemsChart({ invoices = [], items = [] }) {
  const [metric, setMetric] = useState('revenue')

  const topItems = useMemo(() => {
    const itemStats = {}

    invoices
      .filter((inv) => inv && inv.type === 'sale')
      .forEach((inv) => {
        ;(inv.items || []).forEach((row) => {
          const id = row.itemId
          const name = row.compositeName || 'صنف'
          if (!itemStats[id]) {
            itemStats[id] = { id, name, revenue: 0, quantity: 0, unit: row.unit || 'كرتونة' }
          }
          itemStats[id].revenue += Number(row.total || (row.quantity * row.price) || 0)
          itemStats[id].quantity += Number(row.quantity || 0)
        })
      })

    const list = Object.values(itemStats)
    list.sort((a, b) => (metric === 'revenue' ? b.revenue - a.revenue : b.quantity - a.quantity))
    return list.slice(0, 5)
  }, [invoices, metric])

  const maxVal = Math.max(...topItems.map((i) => (metric === 'revenue' ? i.revenue : i.quantity)), 1)

  return (
    <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-surface-container pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-on-surface">
              الأصناف الأكثر حركة وطلباً
            </h4>
            <span className="text-[11px] font-bold text-on-surface-variant">
              ترتيب حركة السحب والمبيعات الحقيقية
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-surface-low p-1 rounded-full border border-outline-variant/30">
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              metric === 'revenue'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            بالإيراد (ج.م)
          </button>
          <button
            type="button"
            onClick={() => setMetric('quantity')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              metric === 'quantity'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            بالكمية المباعة
          </button>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {topItems.length === 0 ? (
          <div className="py-8 text-center text-xs font-bold text-on-surface-variant">
            لا توجد مبيعات مسجلة في هذه الفترة
          </div>
        ) : (
          topItems.map((item, idx) => {
            const val = metric === 'revenue' ? item.revenue : item.quantity
            const pct = Math.round((val / maxVal) * 100)
            const colors = ['bg-primary', 'bg-red-700', 'bg-rose-600', 'bg-amber-600', 'bg-secondary']
            const barColor = colors[idx % colors.length]

            return (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded-full bg-surface-low border border-outline-variant/30 flex items-center justify-center font-mono text-[10px] text-on-surface-variant shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-on-surface truncate">{item.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1 font-mono font-black text-on-surface shrink-0">
                    <span>{val.toLocaleString('en-US')}</span>
                    <span className="text-[10px] font-bold text-on-surface-variant">
                      {metric === 'revenue' ? 'ج.م' : item.unit}
                    </span>
                  </div>
                </div>

                <div className="w-full h-2.5 rounded-full bg-surface-low overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${Math.max(6, pct)}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
