import React, { useState, useMemo } from 'react'
import {
  BarChart3,
  TrendingUp,
  FileText,
  Wallet,
  Boxes,
  Clock,
  Scissors,
  Calendar,
  Filter,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { formatCurrency, filterByDateRange } from '../../utils/reportCalculations'

import { AX_IncomeStatementReport } from './AX_IncomeStatementReport'
import { AX_Ledger360Report } from './AX_Ledger360Report'
import { AX_CashFlowReport } from './AX_CashFlowReport'
import { AX_InventoryValuationReport } from './AX_InventoryValuationReport'
import { AX_AgingDebtsReport } from './AX_AgingDebtsReport'
import { AX_YieldDisassemblyReport } from './AX_YieldDisassemblyReport'

export function AX_ReportsManager() {
  const {
    invoices = [],
    items = [],
    clients = [],
    suppliers = [],
    treasuryAccounts = [],
    cashTransactions = [],
    inventoryStock = [],
    warehouses = [],
    disassemblyOrders = [],
  } = useAXStore()

  const [activeReportTab, setActiveReportTab] = useState('pnl')
  const [timeframe, setTimeframe] = useState('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const executiveKpis = useMemo(() => {
    const salesOnly = invoices.filter((i) => i.type === 'sale')
    const filteredSales = filterByDateRange(salesOnly, 'date', timeframe, customStart, customEnd)

    let totalSales = 0
    let totalCogs = 0

    const itemsCostMap = {}
    items.forEach((it) => {
      itemsCostMap[it.id] = Number(it.buyPrice) || 0
    })

    filteredSales.forEach((inv) => {
      totalSales += Number(inv.subtotal) || Number(inv.total) || 0
      ;(inv.items || []).forEach((line) => {
        const cost = itemsCostMap[line.itemId] || Number(line.price) * 0.82
        totalCogs += cost * (Number(line.quantity) || 1)
      })
    })

    const grossProfit = totalSales - totalCogs
    const totalCash = treasuryAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0)
    const totalClientDebts = clients.reduce((sum, c) => sum + (Number(c.balance) || 0), 0)
    const totalSupplierLiabilities = suppliers.reduce((sum, s) => sum + (Number(s.balance) || 0), 0)

    let inventoryValuation = 0
    ;(inventoryStock || []).forEach((stock) => {
      const it = items.find((i) => i.id === stock.itemId)
      const cost = Number(it?.buyPrice) || 0
      inventoryValuation += (Number(stock.quantity) || 0) * cost
    })

    const filteredOrders = filterByDateRange(disassemblyOrders, 'date', timeframe, customStart, customEnd)
    let totalInputWeight = 0
    let totalOutputWeight = 0
    filteredOrders.forEach((o) => {
      totalInputWeight += Number(o.inputQuantity || o.inputWeight || o.sourceWeight) || 0
      const outputs = o.outputs || o.items || []
      outputs.forEach((out) => {
        totalOutputWeight += Number(out.quantity || out.weight) || 0
      })
    })
    const totalWasteWeight = Math.max(0, totalInputWeight - totalOutputWeight)
    const wasteRate = totalInputWeight > 0 ? ((totalWasteWeight / totalInputWeight) * 100).toFixed(1) : 0

    const filteredInvoices = filterByDateRange(invoices, 'date', timeframe, customStart, customEnd)
    const totalOperationsCount = filteredInvoices.length + filteredOrders.length

    return {
      totalSales,
      grossProfit,
      totalCash,
      totalClientDebts,
      totalSupplierLiabilities,
      inventoryValuation,
      totalWasteWeight,
      wasteRate,
      disassemblyOrdersCount: filteredOrders.length,
      totalOperationsCount,
      invoicesCount: filteredInvoices.length,
      salesCount: filteredSales.length,
    }
  }, [invoices, items, treasuryAccounts, clients, suppliers, inventoryStock, disassemblyOrders, timeframe, customStart, customEnd])

  const reportTabs = [
    { id: 'pnl', label: 'الأرباح والخسائر (P&L)', icon: TrendingUp },
    { id: 'ledger', label: 'كشف حساب 360°', icon: FileText },
    { id: 'cash', label: 'حركة السيولة والخزائن', icon: Wallet },
    { id: 'inventory', label: 'تقييم المخزون', icon: Boxes },
    { id: 'aging', label: 'أعمار الديون', icon: Clock },
    { id: 'yield', label: 'تشغيل وتصنيع اللحوم', icon: Scissors },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-on-surface">
                التقارير والمحاسبة
              </h2>
              <span className="text-xs font-bold text-on-surface-variant">
                قوائم الدخل المالية، كشوف حسابات الأستاذ، أرصدة السيولة، وتقييم المخزون
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'today', label: 'اليوم' },
              { id: '7days', label: 'آخر 7 أيام' },
              { id: 'this_month', label: 'هذا الشهر' },
              { id: 'this_year', label: 'هذا العام' },
              { id: 'all', label: 'كافة الفترات' },
              { id: 'specific_day', label: 'يوم محدد' },
              { id: 'custom', label: 'نطاق مخصص' },
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  timeframe === tf.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-low hover:bg-surface-container text-on-surface border border-outline-variant/30'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {timeframe === 'specific_day' && (
          <div className="p-3 bg-surface-low rounded-2xl border border-outline-variant/30 max-w-sm animate-in fade-in">
            <AX_CompanyDatePicker
              label="اختر التاريخ المحدد:"
              value={customStart}
              onChange={setCustomStart}
              placeholder="اختر اليوم..."
            />
          </div>
        )}

        {timeframe === 'custom' && (
          <div className="p-3 bg-surface-low rounded-2xl border border-outline-variant/30 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
            <AX_CompanyDatePicker
              label="من تاريخ:"
              value={customStart}
              onChange={setCustomStart}
              placeholder="اختر تاريخ البداية"
            />
            <AX_CompanyDatePicker
              label="إلى تاريخ:"
              value={customEnd}
              onChange={setCustomEnd}
              placeholder="اختر تاريخ النهاية"
            />
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-surface-container">
          <div className="p-3 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-0.5">
            <span className="text-[10px] font-bold text-on-surface-variant block">مبيعات الفترة</span>
            <span className="text-sm sm:text-base font-black font-mono text-on-surface block">
              {formatCurrency(executiveKpis.totalSales)}
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant block">
              عدد {executiveKpis.salesCount} فاتورة بيع
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-0.5">
            <span className="text-[10px] font-bold text-on-surface-variant block">مجمل أرباح الفترة</span>
            <span className="text-sm sm:text-base font-black font-mono text-emerald-600 block">
              {formatCurrency(executiveKpis.grossProfit)}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 block">
              هامش {executiveKpis.totalSales > 0 ? ((executiveKpis.grossProfit / executiveKpis.totalSales) * 100).toFixed(1) : 0}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-0.5">
            <span className="text-[10px] font-bold text-on-surface-variant block">رصيد السيولة بالخزائن</span>
            <span className="text-sm sm:text-base font-black font-mono text-primary block">
              {formatCurrency(executiveKpis.totalCash)}
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant block">
              خزينة وبنوك ومحافظ
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-0.5">
            <span className="text-[10px] font-bold text-on-surface-variant block">مديونيات العملاء بالسوق</span>
            <span className="text-sm sm:text-base font-black font-mono text-rose-700 block">
              {formatCurrency(executiveKpis.totalClientDebts)}
            </span>
            <span className="text-[10px] font-bold text-rose-700 block">
              أرصدة آجلة مستحقة
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-0.5">
            <span className="text-[10px] font-bold text-on-surface-variant block">مستحقات الموردين</span>
            <span className="text-sm sm:text-base font-black font-mono text-amber-700 block">
              {formatCurrency(executiveKpis.totalSupplierLiabilities)}
            </span>
            <span className="text-[10px] font-bold text-amber-700 block">
              التزامات قائمة للتوريد
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-0.5">
            <span className="text-[10px] font-bold text-on-surface-variant block">تقييم المخزون بالتكلفة</span>
            <span className="text-sm sm:text-base font-black font-mono text-blue-700 block">
              {formatCurrency(executiveKpis.inventoryValuation)}
            </span>
            <span className="text-[10px] font-bold text-blue-700 block">
              كافة المخازن وثلاجات التبريد
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-0.5">
            <span className="text-[10px] font-bold text-on-surface-variant block">هالك تشغيل اللحوم</span>
            <span className="text-sm sm:text-base font-black font-mono text-purple-700 block">
              {executiveKpis.wasteRate}%
            </span>
            <span className="text-[10px] font-bold text-purple-700 block">
              {Number(executiveKpis.totalWasteWeight).toLocaleString('en-US')} كجم هالك ({executiveKpis.disassemblyOrdersCount} أمر)
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-0.5">
            <span className="text-[10px] font-bold text-on-surface-variant block">إجمالي حركات الفترة</span>
            <span className="text-sm sm:text-base font-black font-mono text-on-surface block">
              {executiveKpis.totalOperationsCount}
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant block">
              {executiveKpis.invoicesCount} فاتورة • {executiveKpis.disassemblyOrdersCount} تشغيل
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 scrollbar-none border-t border-surface-container">
          {reportTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeReportTab === tab.id

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveReportTab(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-primary text-white shadow-level1'
                    : 'bg-surface-low hover:bg-surface-container text-on-surface border border-outline-variant/30'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-primary'}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="animate-in fade-in duration-150">
        {activeReportTab === 'pnl' && (
          <AX_IncomeStatementReport
            invoices={invoices}
            items={items}
            timeframe={timeframe}
            customStart={customStart}
            customEnd={customEnd}
          />
        )}

        {activeReportTab === 'ledger' && (
          <AX_Ledger360Report
            clients={clients}
            suppliers={suppliers}
            invoices={invoices}
            cashTransactions={cashTransactions}
            timeframe={timeframe}
            customStart={customStart}
            customEnd={customEnd}
          />
        )}

        {activeReportTab === 'cash' && (
          <AX_CashFlowReport
            treasuryAccounts={treasuryAccounts}
            cashTransactions={cashTransactions}
            invoices={invoices}
            timeframe={timeframe}
            customStart={customStart}
            customEnd={customEnd}
          />
        )}

        {activeReportTab === 'inventory' && (
          <AX_InventoryValuationReport
            inventoryStock={inventoryStock}
            items={items}
            warehouses={warehouses}
          />
        )}

        {activeReportTab === 'aging' && (
          <AX_AgingDebtsReport
            clients={clients}
            suppliers={suppliers}
            invoices={invoices}
          />
        )}

        {activeReportTab === 'yield' && (
          <AX_YieldDisassemblyReport
            disassemblyOrders={disassemblyOrders}
            items={items}
            timeframe={timeframe}
            customStart={customStart}
            customEnd={customEnd}
          />
        )}
      </div>
    </div>
  )
}
