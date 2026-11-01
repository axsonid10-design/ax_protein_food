import React, { useState } from 'react'
import {
  TrendingUp,
  Warehouse,
  Boxes,
  Wallet,
  ArrowUpRight,
  Users,
  Building2,
  BadgePercent,
  Target,
  Layers,
  Scale,
} from 'lucide-react'

export function AX_DashboardMetricsCards({
  salesTotal = 0,
  stockValue = 0,
  stockQuantity = 0,
  cashBalance = 0,
  salesCount = 0,
  warehousesCount = 0,
  itemsCount = 0,
  accountsCount = 0,
  salesTrend = null,
  customerReceivables,
  supplierPayables,
  repPayables,
  salesTarget = 0,
  targetAchievementPct,
  totalCustomerDebts,
  totalSupplierDebts,
  totalRepBalances,
  salesTargetProgress,
}) {
  const [activeMetricSegment, setActiveMetricSegment] = useState('operational')

  const effectiveReceivables = Number((customerReceivables !== undefined ? customerReceivables : totalCustomerDebts) || 0)
  const effectivePayables = Number((supplierPayables !== undefined ? supplierPayables : totalSupplierDebts) || 0)
  const effectiveRepPayables = Number((repPayables !== undefined ? repPayables : totalRepBalances) || 0)
  const effectiveTargetPct = Number((targetAchievementPct !== undefined ? targetAchievementPct : salesTargetProgress) || 0)

  const operationalCards = [
    {
      id: 'sales',
      title: 'إجمالي المبيعات',
      value: Number(salesTotal || 0).toLocaleString('en-US'),
      unit: 'ج.م',
      icon: TrendingUp,
      iconColor: 'text-emerald-700 bg-emerald-500/10',
      subtitle: `${salesCount} فاتورة`,
      trend: salesTrend ? salesTrend.label : null,
      isPositive: salesTrend ? salesTrend.isPositive : true,
    },
    {
      id: 'stockValue',
      title: 'قيمة المخزون',
      value: Number(stockValue || 0).toLocaleString('en-US'),
      unit: 'ج.م',
      icon: Warehouse,
      iconColor: 'text-primary bg-primary/10',
      subtitle: `${warehousesCount} مخازن`,
      trend: null,
    },
    {
      id: 'stockUnits',
      title: 'رصيد المخزون',
      value: Number(stockQuantity || 0).toLocaleString('en-US'),
      unit: 'وحدة',
      icon: Boxes,
      iconColor: 'text-rose-700 bg-rose-500/10',
      subtitle: `${itemsCount} صنف مسجل`,
      trend: null,
    },
    {
      id: 'liquidity',
      title: 'السيولة والخزن',
      value: Number(cashBalance || 0).toLocaleString('en-US'),
      unit: 'ج.م',
      icon: Wallet,
      iconColor: 'text-amber-700 bg-amber-500/10',
      subtitle: `${accountsCount} حسابات وخزن`,
      trend: null,
    },
  ]

  const financialCards = [
    {
      id: 'receivables',
      title: 'ديون العملاء (لنا)',
      value: Number(effectiveReceivables || 0).toLocaleString('en-US'),
      unit: 'ج.م',
      icon: Users,
      iconColor: 'text-red-800 bg-red-700/10',
      subtitle: 'مستحقات آجلة لدى العملاء',
    },
    {
      id: 'payables',
      title: 'ديون الموردين (علينا)',
      value: Number(effectivePayables || 0).toLocaleString('en-US'),
      unit: 'ج.م',
      icon: Building2,
      iconColor: 'text-red-950 bg-red-950/10',
      subtitle: 'التزامات توريد مستحقة السداد',
    },
    {
      id: 'repCommissions',
      title: 'عمولات المناديب المستحقة',
      value: Number(effectiveRepPayables || 0).toLocaleString('en-US'),
      unit: 'ج.م',
      icon: BadgePercent,
      iconColor: 'text-emerald-800 bg-emerald-700/10',
      subtitle: 'صافي مستحقات أرباح البيع',
    },
    {
      id: 'targetAchievement',
      title: 'مستهدف التارجت العام',
      value: `${effectiveTargetPct}%`,
      unit: salesTarget > 0 ? `من ${Number(salesTarget).toLocaleString('en-US')} ج.م` : '',
      icon: Target,
      iconColor: 'text-primary bg-primary/10',
      subtitle: effectiveTargetPct >= 100 ? 'تم تحقيق المستهدف' : 'جاري المتابعة',
    },
  ]

  const hasDebts = (Number(effectiveReceivables) || 0) > 0 || (Number(effectivePayables) || 0) > 0

  const renderCard = (card) => {
    const Icon = card.icon
    return (
      <div
        key={card.id}
        className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-all group"
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-bold text-on-surface-variant truncate">
            {card.title}
          </span>
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${card.iconColor}`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="mt-1.5 sm:mt-2">
          <div className="flex items-baseline gap-1 whitespace-nowrap overflow-hidden">
            <span className="text-base sm:text-xl font-black font-mono text-on-surface tracking-tight truncate">
              {card.value}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant shrink-0">
              {card.unit}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] font-bold truncate">
            {card.trend && (
              <span className="inline-flex items-center gap-0.5 text-emerald-700 shrink-0">
                <ArrowUpRight className="w-3 h-3" />
                <span>{card.trend}</span>
              </span>
            )}
            <span className="text-on-surface-variant/80 truncate">
              {card.subtitle}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center p-1 rounded-full bg-surface-lowest border border-outline-variant/40 shadow-xs gap-1">
          <button
            type="button"
            onClick={() => setActiveMetricSegment('operational')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
              activeMetricSegment === 'operational'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-low'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>حركة التشغيل والمخزون</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMetricSegment('financial')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
              activeMetricSegment === 'financial'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-low'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>الديون والالتزامات</span>
            {hasDebts && (
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            setActiveMetricSegment(activeMetricSegment === 'all' ? 'operational' : 'all')
          }
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border transition-all cursor-pointer ${
            activeMetricSegment === 'all'
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-surface-lowest border-outline-variant/30 text-on-surface-variant hover:bg-surface-low'
          }`}
          title="عرض جميع المؤشرات دفعة واحدة"
        >
          <Layers className="w-3 h-3" />
          <span>{activeMetricSegment === 'all' ? 'طي المؤشرات' : 'عرض الكل'}</span>
        </button>
      </div>

      {(activeMetricSegment === 'operational' || activeMetricSegment === 'all') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 animate-in fade-in duration-200">
          {operationalCards.map(renderCard)}
        </div>
      )}

      {(activeMetricSegment === 'financial' || activeMetricSegment === 'all') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 animate-in fade-in duration-200">
          {financialCards.map(renderCard)}
        </div>
      )}
    </div>
  )
}

export default AX_DashboardMetricsCards
