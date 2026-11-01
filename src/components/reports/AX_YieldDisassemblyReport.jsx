import React, { useState, useMemo } from 'react'
import {
  Scissors,
  Scale,
  AlertOctagon,
  Percent,
  Printer,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import {
  formatCurrency,
  formatNumber,
  filterByDateRange,
  exportToCsv,
} from '../../utils/reportCalculations'

export function AX_YieldDisassemblyReport({
  disassemblyOrders = [],
  items = [],
  timeframe = 'all',
  customStart = '',
  customEnd = '',
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const itemsMap = useMemo(() => {
    const map = {}
    items.forEach((it) => {
      map[it.id] = it
    })
    return map
  }, [items])

  const filteredOrders = useMemo(() => {
    return filterByDateRange(disassemblyOrders, 'date', timeframe, customStart, customEnd)
  }, [disassemblyOrders, timeframe, customStart, customEnd])

  const yieldStats = useMemo(() => {
    let totalRawQty = 0
    let totalProducedQty = 0
    let totalWasteCost = 0
    let sumWastePct = 0

    const rows = filteredOrders.map((ord) => {
      const rawItem = itemsMap[ord.rawItemId]
      const rawQty = Number(ord.consumedQuantity) || 0
      const rawBuyPrice = Number(rawItem?.buyPrice) || 850
      const wastePct = Number(ord.wastePercentage) || 0
      const yieldPct = Math.max(0, 100 - wastePct)

      let prodQty = 0
      const prodNames = []
      ;(ord.producedItems || []).forEach((p) => {
        const pQty = Number(p.quantity) || 0
        prodQty += pQty
        const pItem = itemsMap[p.itemId]
        prodNames.push(`${pItem?.compositeName || pItem?.name || 'منتج'} (${pQty} ${p.unit || 'كجم'})`)
      })

      const rawTotalCost = rawQty * rawBuyPrice
      const wasteCost = (rawTotalCost * wastePct) / 100

      totalRawQty += rawQty
      totalProducedQty += prodQty
      totalWasteCost += wasteCost
      sumWastePct += wastePct

      return {
        id: ord.id,
        code: ord.code || `DIS-${ord.id}`,
        date: ord.date || '2026-10-28',
        rawItemName: rawItem?.compositeName || rawItem?.name || 'خام تجميد',
        consumedQty: rawQty,
        consumedUnit: ord.consumedUnit || 'كرتونة',
        producedSummary: prodNames.join(' + ') || 'مصنعات ومجزءات',
        producedQty: prodQty,
        wastePct,
        yieldPct,
        wasteCost,
        operator: ord.operator || 'مشرف التجهيز',
      }
    })

    const avgWastePct = rows.length > 0 ? sumWastePct / rows.length : 0
    const avgYieldPct = Math.max(0, 100 - avgWastePct)

    return {
      totalRawQty,
      totalProducedQty,
      totalWasteCost,
      avgWastePct,
      avgYieldPct,
      rows,
    }
  }, [filteredOrders, itemsMap])

  const totalPages = Math.ceil(yieldStats.rows.length / pageSize) || 1
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return yieldStats.rows.slice(start, start + pageSize)
  }, [yieldStats.rows, currentPage])

  const handleExport = () => {
    const headers = [
      'رقم أمر التشغيل',
      'التاريخ',
      'الخام المستهلك',
      'الكمية المستهلكة',
      'المخرجات الناتجة',
      'نسبة الهالك %',
      'نسبة التصافي %',
      'تكلفة الهالك (ج.م)',
      'المشرف المسؤول',
    ]
    const data = yieldStats.rows.map((r) => [
      r.code,
      r.date,
      r.rawItemName,
      `${r.consumedQty} ${r.consumedUnit}`,
      r.producedSummary,
      r.wastePct.toFixed(1),
      r.yieldPct.toFixed(1),
      r.wasteCost,
      r.operator,
    ])
    exportToCsv(`محاسبة_التصنيع_والهادر_${new Date().toISOString().split('T')[0]}`, headers, data)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/30">
        <div>
          <h3 className="text-sm sm:text-base font-black text-on-surface">
            تقرير كفاءة التفكيك والتشغيل ومحاسبة الهادر (Yield & Waste)
          </h3>
          <span className="text-[11px] font-bold text-on-surface-variant">
            متابعة نسب التصافي ونسب الهالك الفعلي وتكلفة الفاقد التشغيلي
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleExport}
            className="px-3.5 py-1.5 rounded-full bg-surface-low hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-full bg-primary text-white hover:bg-primary-dark text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة A4</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>إجمالي الخام المشغل</span>
            <Scissors className="w-4 h-4 text-primary" />
          </div>
          <div className="text-base sm:text-lg font-black text-on-surface mt-1">
            {formatNumber(yieldStats.totalRawQty)} وحدة خام
          </div>
          <div className="text-[10px] font-bold text-on-surface-variant mt-0.5">
            في {yieldStats.rows.length} أوامر تشغيل
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>متوسط نسبة التصافي</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-600 mt-1">
            {yieldStats.avgYieldPct.toFixed(1)}%
          </div>
          <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
            مخرجات تامة صالحة للتوزيع
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>متوسط نسبة الهادر</span>
            <Scale className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-amber-700 mt-1">
            {yieldStats.avgWastePct.toFixed(1)}%
          </div>
          <div className="text-[10px] font-bold text-amber-700 mt-0.5">
            فاقد سوائل وتشذيب ودهون
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>قيمة خسارة الهادر</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-rose-700 mt-1">
            {formatCurrency(yieldStats.totalWasteCost)}
          </div>
          <div className="text-[10px] font-bold text-rose-700 mt-0.5">
            محسوبة بسعر شراء اللحوم الخام
          </div>
        </div>
      </div>

      <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-surface-low/80 border-b border-surface-container text-on-surface-variant font-black">
                <th className="py-3 px-3.5 whitespace-nowrap">رقم الإذن</th>
                <th className="py-3 px-3.5 whitespace-nowrap">التاريخ</th>
                <th className="py-3 px-3.5">الخام المستهلك</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">كمية الخام</th>
                <th className="py-3 px-3.5">المخرجات المنتجة</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">نسبة الهادر</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">نسبة التصافي</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">تكلفة الهالك</th>
                <th className="py-3 px-3.5 whitespace-nowrap">المسؤول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container/60 font-bold">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-on-surface-variant text-xs">
                    لا توجد أوامر تشغيل مسجلة في الفترة المحددة
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-low/40 transition-colors h-11">
                    <td className="py-2.5 px-3.5 font-mono text-primary font-black whitespace-nowrap">
                      {r.code}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-on-surface-variant whitespace-nowrap">
                      {r.date}
                    </td>
                    <td className="py-2.5 px-3.5 text-on-surface font-black max-w-[150px] truncate">
                      {r.rawItemName}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-surface-low border border-outline-variant/30 text-[10px]">
                        {r.consumedQty} {r.consumedUnit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-on-surface-variant text-[11px] max-w-[220px] truncate">
                      {r.producedSummary}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[10px]">
                        {r.wastePct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px]">
                        {r.yieldPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono font-black text-rose-700 whitespace-nowrap">
                      {formatCurrency(r.wasteCost)}
                    </td>
                    <td className="py-2.5 px-3.5 text-on-surface-variant text-[11px] whitespace-nowrap">
                      {r.operator}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden divide-y divide-surface-container/60 p-3 space-y-2.5">
          {paginatedRows.length === 0 ? (
            <div className="py-6 text-center text-on-surface-variant text-xs font-bold">
              لا توجد أوامر تشغيل مسجلة في الفترة المحددة
            </div>
          ) : (
            paginatedRows.map((r) => (
              <div key={r.id} className="bg-surface-low/50 rounded-2xl p-3 space-y-2 border border-outline-variant/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-black text-primary">{r.code}</span>
                  <span className="text-[10px] font-bold text-on-surface-variant">{r.date}</span>
                </div>
                <div className="text-xs font-black text-on-surface">خام: {r.rawItemName} ({r.consumedQty} {r.consumedUnit})</div>
                <div className="text-[11px] text-on-surface-variant font-bold">{r.producedSummary}</div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-surface-container/50 text-[11px] font-bold">
                  <div>
                    <span className="text-on-surface-variant block text-[10px]">الهادر:</span>
                    <span className="font-mono text-amber-700">{r.wastePct.toFixed(1)}% ({formatCurrency(r.wasteCost)})</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block text-[10px]">التصافي:</span>
                    <span className="font-mono text-emerald-600">{r.yieldPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-surface-container text-xs font-bold text-on-surface-variant">
            <span>
              عرض {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, yieldStats.rows.length)} من {yieldStats.rows.length} أمر تشغيل
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-full hover:bg-surface-low disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-on-surface font-black">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-full hover:bg-surface-low disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
