import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Printer,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import {
  formatCurrency,
  formatNumber,
  filterByDateRange,
  exportToCsv,
} from '../../utils/reportCalculations'
import { calculateFifoProfits } from '../../utils/fifoCalculations'

export function AX_IncomeStatementReport({
  invoices = [],
  items = [],
  inventoryStock = [],
  timeframe = 'all',
  customStart = '',
  customEnd = '',
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const filteredSales = useMemo(() => {
    const salesOnly = invoices.filter((inv) => inv.type === 'sale')
    return filterByDateRange(salesOnly, 'date', timeframe, customStart, customEnd)
  }, [invoices, timeframe, customStart, customEnd])

  const filteredReturns = useMemo(() => {
    const returnsOnly = invoices.filter((inv) => inv.type === 'sale_return')
    return filterByDateRange(returnsOnly, 'date', timeframe, customStart, customEnd)
  }, [invoices, timeframe, customStart, customEnd])

  const calculations = useMemo(() => {
    const fifoResults = calculateFifoProfits(invoices, items, inventoryStock)

    let grossSales = 0
    let totalDiscount = 0
    let totalTransport = 0
    let totalLoading = 0
    let totalCogs = 0
    let grossProfit = 0
    let pendingCount = 0
    let calculatedCount = 0

    const rows = filteredSales.map((inv) => {
      const invItems = inv.items || []
      const subtotal = Number(inv.subtotal) || Number(inv.total) || 0
      const discount = Number(inv.discountAmount) || 0
      const netSubtotal = Math.max(0, subtotal - discount)
      const transport = Number(inv.transportCost) || 0
      const loading = Number(inv.loadingCost) || 0

      grossSales += subtotal
      totalDiscount += discount
      totalTransport += transport
      totalLoading += loading

      const fifoData = fifoResults.salesProfits.get(inv.id)
      const isPending = !fifoData || fifoData.profitStatus === 'pending' || fifoData.isProfitPending

      if (isPending) {
        pendingCount++
        return {
          id: inv.id,
          code: inv.code,
          date: inv.date,
          partyName: inv.partyName,
          itemsCount: invItems.length,
          subtotal: netSubtotal,
          grossSubtotal: subtotal,
          discountAmount: discount,
          cogs: null,
          profit: null,
          margin: null,
          profitStatus: 'pending',
          transport,
          loading,
        }
      }

      calculatedCount++
      const cogs = Number(fifoData.cogs) || 0
      const profit = Number(fifoData.profit) || 0
      const margin = typeof fifoData.profitMargin === 'number' ? fifoData.profitMargin : (netSubtotal > 0 ? (profit / netSubtotal) * 100 : 0)

      totalCogs += cogs
      grossProfit += profit

      return {
        id: inv.id,
        code: inv.code,
        date: inv.date,
        partyName: inv.partyName,
        itemsCount: invItems.length,
        subtotal: netSubtotal,
        grossSubtotal: subtotal,
        discountAmount: discount,
        cogs,
        profit,
        margin,
        profitStatus: 'calculated',
        transport,
        loading,
      }
    })

    const totalReturns = filteredReturns.reduce((sum, inv) => sum + (Number(inv.total) || Number(inv.subtotal) || 0), 0)
    let returnsCogs = 0
    let returnsProfit = 0
    filteredReturns.forEach((ret) => {
      const fifoRet = fifoResults.salesProfits.get(ret.id)
      if (fifoRet) {
        returnsCogs += Math.abs(Number(fifoRet.cogs) || 0)
        returnsProfit += Math.abs(Number(fifoRet.profit) || 0)
      } else {
        const retAmt = Number(ret.total) || Number(ret.subtotal) || 0
        returnsProfit += retAmt
      }
    })
    const netSales = Math.max(0, grossSales - totalDiscount - totalReturns)
    const netCogs = Math.max(0, totalCogs - returnsCogs)
    const adjustedGrossProfit = Math.max(0, grossProfit - returnsProfit)
    const grossMarginPct = netSales > 0 ? (adjustedGrossProfit / netSales) * 100 : 0
    const operatingExpenses = totalTransport + totalLoading
    const netOperatingProfit = adjustedGrossProfit - operatingExpenses
    const netMarginPct = netSales > 0 ? (netOperatingProfit / netSales) * 100 : 0
    const hasPending = pendingCount > 0

    return {
      grossSales,
      totalDiscount,
      totalReturns,
      netSales,
      totalCogs: netCogs,
      grossProfit: adjustedGrossProfit,
      grossMarginPct,
      operatingExpenses,
      netOperatingProfit,
      netMarginPct,
      hasPending,
      pendingCount,
      calculatedCount,
      rows,
    }
  }, [invoices, items, inventoryStock, filteredSales, filteredReturns])

  const totalPages = Math.ceil(calculations.rows.length / pageSize) || 1
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return calculations.rows.slice(start, start + pageSize)
  }, [calculations.rows, currentPage])

  const handleExport = () => {
    const headers = [
      'رقم الفاتورة',
      'التاريخ',
      'العميل',
      'عدد البنود',
      'قيمة البيع (ج.م)',
      'التكلفة (ج.م)',
      'مجمل الربح (ج.م)',
      'نسبة الربح %',
      'مصاريف نقل وشيالة (ج.م)',
    ]
    const data = calculations.rows.map((r) => [
      r.code,
      r.date,
      r.partyName,
      r.itemsCount,
      r.subtotal,
      r.profitStatus === 'pending' ? 'قيد الاحتساب' : r.cogs,
      r.profitStatus === 'pending' ? 'قيد الاحتساب' : r.profit,
      r.profitStatus === 'pending' ? 'قيد الاحتساب' : r.margin.toFixed(1),
      r.transport + r.loading,
    ])
    exportToCsv(`تقرير_الأرباح_والخسائر_${new Date().toISOString().split('T')[0]}`, headers, data)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/30">
        <div>
          <h3 className="text-sm sm:text-base font-black text-on-surface">
            قائمة الأرباح والخسائر ومجمل الربح (P&L)
          </h3>
          <span className="text-[11px] font-bold text-on-surface-variant">
            حساب تكلفة المبيعات (COGS) ومجمل الأرباح والمصروفات التشغيلية
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
            <span>صافي إيرادات المبيعات</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-base sm:text-lg font-black text-on-surface mt-1">
            {formatCurrency(calculations.netSales)}
          </div>
          <div className="text-[10px] font-bold text-on-surface-variant mt-0.5">
            {calculations.totalReturns > 0 || calculations.totalDiscount > 0
              ? `إجمالي ${formatCurrency(calculations.grossSales)} (خصم ${formatCurrency(calculations.totalDiscount)} • مردود ${formatCurrency(calculations.totalReturns)})`
              : `عدد ${filteredSales.length} فاتورة مبيعات`}
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>تكلفة البضاعة (COGS)</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-amber-700 mt-1">
            {formatCurrency(calculations.totalCogs)}
          </div>
          <div className="text-[10px] font-bold text-on-surface-variant mt-0.5">
            {calculations.hasPending
              ? `محسوبة بنظام FIFO (${calculations.pendingCount} معلق)`
              : 'محسوبة بنظام الوارد أولاً صادر أولاً (FIFO)'}
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>مجمل الربح التجاري</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-600 mt-1">
            {formatCurrency(calculations.grossProfit)}
          </div>
          <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
            {calculations.hasPending
              ? `هامش ${calculations.grossMarginPct.toFixed(1)}% (${calculations.pendingCount} قيد الاحتساب)`
              : `هامش ربح ${calculations.grossMarginPct.toFixed(1)}%`}
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>صافي الربح التشغيلي</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-base sm:text-lg font-black text-primary mt-1">
            {formatCurrency(calculations.netOperatingProfit)}
          </div>
          <div className="text-[10px] font-bold text-on-surface-variant mt-0.5">
            بعد خصم مصاريف النقل والشيالة
          </div>
        </div>
      </div>

      <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-surface-low/80 border-b border-surface-container text-on-surface-variant font-black">
                <th className="py-3 px-3.5 whitespace-nowrap">رقم الفاتورة</th>
                <th className="py-3 px-3.5 whitespace-nowrap">التاريخ</th>
                <th className="py-3 px-3.5">العميل</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">البنود</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">قيمة البيع</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">التكلفة</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">الربح</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">النسبة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container/60 font-bold">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-on-surface-variant text-xs">
                    لا توجد فواتير مبيعات مسجلة في الفترة المحددة
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-low/40 transition-colors h-11">
                    <td className="py-2.5 px-3.5 font-mono text-primary font-black whitespace-nowrap">
                      {r.code}
                    </td>
                    <td className="py-2.5 px-3.5 text-on-surface-variant font-mono whitespace-nowrap">
                      {r.date}
                    </td>
                    <td className="py-2.5 px-3.5 text-on-surface max-w-[200px] truncate">
                      {r.partyName}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-surface-low border border-outline-variant/30 text-[10px]">
                        {r.itemsCount} صنف
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono font-black text-on-surface whitespace-nowrap">
                      {formatCurrency(r.subtotal)}
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono text-amber-700 whitespace-nowrap">
                      {r.profitStatus === 'pending' ? (
                        <span className="text-on-surface-variant text-[11px]">قيد الاحتساب</span>
                      ) : (
                        formatCurrency(r.cogs)
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono font-black text-emerald-600 whitespace-nowrap">
                      {r.profitStatus === 'pending' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[10px] font-black">
                          قيد الاحتساب
                        </span>
                      ) : (
                        formatCurrency(r.profit)
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono whitespace-nowrap">
                      {r.profitStatus === 'pending' ? (
                        <span className="px-2 py-0.5 rounded-full bg-surface-low text-on-surface-variant border border-outline-variant/30 text-[10px]">
                          —
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px]">
                          {r.margin.toFixed(1)}%
                        </span>
                      )}
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
              لا توجد فواتير مبيعات مسجلة في الفترة المحددة
            </div>
          ) : (
            paginatedRows.map((r) => (
              <div key={r.id} className="bg-surface-low/50 rounded-2xl p-3 space-y-2 border border-outline-variant/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-black text-primary">{r.code}</span>
                  <span className="font-mono text-[10px] text-on-surface-variant">{r.date}</span>
                </div>
                <div className="text-xs font-black text-on-surface">{r.partyName}</div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-surface-container/50 text-[11px] font-bold">
                  <div>
                    <span className="text-on-surface-variant block text-[10px]">المبيعات:</span>
                    <span className="font-mono font-black text-on-surface">{formatCurrency(r.subtotal)}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block text-[10px]">الربح:</span>
                    {r.profitStatus === 'pending' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[10px] font-black inline-block mt-0.5">
                        قيد الاحتساب
                      </span>
                    ) : (
                      <span className="font-mono font-black text-emerald-600">
                        {formatCurrency(r.profit)} ({r.margin.toFixed(1)}%)
                      </span>
                    )}
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
              {Math.min(currentPage * pageSize, calculations.rows.length)} من {calculations.rows.length} فاتورة
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
