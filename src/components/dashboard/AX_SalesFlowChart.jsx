import React, { useState, useMemo } from 'react'
import { TrendingUp, BarChart3, Layers } from 'lucide-react'

export function AX_SalesFlowChart({
  period = 'month',
  startDate,
  endDate,
  invoices = [],
}) {
  const [metricMode, setMetricMode] = useState('sales')

  const chartData = useMemo(() => {
    const validInvoices = Array.isArray(invoices)
      ? invoices.filter((inv) => inv && inv.type === 'sale')
      : []

    const now = new Date()

    if (period === 'today') {
      const todayStr = now.toISOString().split('T')[0]
      const slots = [
        { label: '09:00 ص', startH: 8, endH: 11 },
        { label: '12:00 م', startH: 11, endH: 14 },
        { label: '03:00 م', startH: 14, endH: 17 },
        { label: '06:00 م', startH: 17, endH: 20 },
        { label: '09:00 م', startH: 20, endH: 24 },
      ]
      return slots.map((s) => {
        const matching = validInvoices.filter((i) => {
          if (!i.date?.startsWith(todayStr)) return false
          const hour = i.time ? parseInt(i.time.split(':')[0], 10) : 12
          return hour >= s.startH && hour < s.endH
        })
        const salesVal = matching.reduce((sum, i) => sum + (Number(i.total) || 0), 0)
        const paidVal = matching.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0)
        return {
          label: s.label,
          sales: salesVal,
          paid: paidVal,
          count: matching.length,
        }
      })
    }

    if (period === '7days') {
      const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
      const days = []
      for (let offset = 6; offset >= 0; offset--) {
        const d = new Date(now)
        d.setDate(d.getDate() - offset)
        const dateStr = d.toISOString().split('T')[0]
        const label = dayNames[d.getDay()]

        const matching = validInvoices.filter((i) => i.date === dateStr)
        const salesVal = matching.reduce((sum, i) => sum + (Number(i.total) || 0), 0)
        const paidVal = matching.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0)
        days.push({
          label,
          date: dateStr,
          sales: salesVal,
          paid: paidVal,
          count: matching.length,
        })
      }
      return days
    }

    if (period === 'year') {
      const currentYear = now.getFullYear()
      const months = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ]
      return months.map((mName, mIdx) => {
        const mPrefix = `${currentYear}-${String(mIdx + 1).padStart(2, '0')}`
        const matching = validInvoices.filter((i) => i.date?.startsWith(mPrefix))
        const salesVal = matching.reduce((sum, i) => sum + (Number(i.total) || 0), 0)
        const paidVal = matching.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0)
        return {
          label: mName,
          sales: salesVal,
          paid: paidVal,
          count: matching.length,
        }
      })
    }

    if (period === 'custom' && startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffMs = Math.max(1, end.getTime() - start.getTime())
      const stepMs = diffMs / 5
      const intervals = []
      for (let i = 0; i < 5; i++) {
        const bStart = new Date(start.getTime() + i * stepMs)
        const bEnd = new Date(start.getTime() + (i + 1) * stepMs)
        const label = `${bStart.getDate()}/${bStart.getMonth() + 1}`

        const matching = validInvoices.filter((i) => {
          const d = new Date(i.date)
          return d >= bStart && d <= bEnd
        })
        const salesVal = matching.reduce((sum, i) => sum + (Number(i.total) || 0), 0)
        const paidVal = matching.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0)
        intervals.push({
          label,
          sales: salesVal,
          paid: paidVal,
          count: matching.length,
        })
      }
      return intervals
    }

    const currentYear = now.getFullYear()
    const currentMonthPrefix = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const weeks = [
      { label: 'الأسبوع 1', startDay: 1, endDay: 7 },
      { label: 'الأسبوع 2', startDay: 8, endDay: 14 },
      { label: 'الأسبوع 3', startDay: 15, endDay: 21 },
      { label: 'الأسبوع 4', startDay: 22, endDay: 31 },
    ]

    return weeks.map((w) => {
      const matching = validInvoices.filter((i) => {
        if (!i.date?.startsWith(currentMonthPrefix)) return false
        const day = parseInt(i.date.split('-')[2], 10)
        return day >= w.startDay && day <= w.endDay
      })
      const salesVal = matching.reduce((sum, i) => sum + (Number(i.total) || 0), 0)
      const paidVal = matching.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0)
      return {
        label: w.label,
        sales: salesVal,
        paid: paidVal,
        count: matching.length,
      }
    })
  }, [period, startDate, endDate, invoices])

  const [hoverIndex, setHoverIndex] = useState(
    chartData.length > 0 ? chartData.length - 1 : 0
  )

  const activeIndex = hoverIndex < chartData.length ? hoverIndex : Math.max(0, chartData.length - 1)
  const activePoint = chartData[activeIndex] || { label: '', sales: 0, paid: 0, count: 0 }

  const values = chartData.map((d) => (metricMode === 'sales' ? d.sales : d.paid))
  const maxVal = Math.max(...values, 1000)
  const chartMax = Math.ceil((maxVal * 1.15) / 1000) * 1000

  const width = 600
  const height = 180
  const paddingX = 40
  const paddingY = 25

  const getX = (idx) =>
    paddingX + (idx * (width - 2 * paddingX)) / Math.max(1, chartData.length - 1)
  const getY = (val) =>
    height - paddingY - ((val || 0) / chartMax) * (height - 2 * paddingY)

  const points = chartData.map((d, i) => {
    const val = metricMode === 'sales' ? d.sales : d.paid
    return `${getX(i)},${getY(val)}`
  }).join(' ')

  const areaPoints = `${getX(0)},${height - paddingY} ${points} ${getX(
    chartData.length - 1
  )},${height - paddingY}`

  const totalPeriodValue = values.reduce((a, b) => a + b, 0)

  return (
    <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-surface-container pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-on-surface">
              حركة المبيعات والتدفقات
            </h4>
            <div className="flex items-baseline gap-1 text-[11px] font-bold text-on-surface-variant">
              <span>الإجمالي:</span>
              <span className="font-mono font-black text-primary">
                {totalPeriodValue.toLocaleString('en-US')}
              </span>
              <span>ج.م</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-surface-low p-1 rounded-full border border-outline-variant/30">
          <button
            type="button"
            onClick={() => setMetricMode('sales')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              metricMode === 'sales'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            المبيعات
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('paid')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              metricMode === 'paid'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            المحصل نقداً
          </button>
        </div>
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 sm:h-52 overflow-visible select-none"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#991b1b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((pct, idx) => {
            const y = height - paddingY - pct * (height - 2 * paddingY)
            const labelVal = Math.round(pct * chartMax)
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-on-surface-variant font-mono"
                >
                  {labelVal >= 1000 ? `${Math.round(labelVal / 1000)}k` : labelVal}
                </text>
              </g>
            )
          })}

          <polygon points={areaPoints} fill="url(#chartGradient)" />

          <polyline
            points={points}
            fill="none"
            stroke="#991b1b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {chartData.length > 0 && (
            <g>
              <line
                x1={getX(activeIndex)}
                y1={paddingY}
                x2={getX(activeIndex)}
                y2={height - paddingY}
                stroke="#991b1b"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(activeIndex)}
                cy={getY(metricMode === 'sales' ? activePoint.sales : activePoint.paid)}
                r="5"
                fill="#991b1b"
                stroke="#ffffff"
                strokeWidth="2.5"
                className="transition-all duration-150"
              />
            </g>
          )}

          {chartData.map((d, i) => (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
              onClick={() => setHoverIndex(i)}
            >
              <rect
                x={getX(i) - 25}
                y={paddingY}
                width={50}
                height={height - paddingY}
                fill="transparent"
              />
              <text
                x={getX(i)}
                y={height - 8}
                textAnchor="middle"
                className={`text-[10px] font-bold ${
                  i === activeIndex ? 'fill-primary font-black' : 'fill-on-surface-variant'
                }`}
              >
                {d.label}
              </text>
            </g>
          ))}
        </svg>

        <div className="mt-2 p-2.5 rounded-2xl bg-surface-low border border-outline-variant/30 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-bold text-on-surface">{activePoint.label}</span>
          </div>
          <div className="flex items-baseline gap-1 font-mono font-black text-primary">
            <span>
              {(metricMode === 'sales' ? activePoint.sales : activePoint.paid).toLocaleString('en-US')}
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant">ج.م</span>
            <span className="text-[10px] font-bold text-on-surface-variant mr-1">
              ({activePoint.count} فواتير)
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
