import React, { useState, useMemo } from 'react'
import { useAXStore } from '../../store/useAXStore'
import { AX_PeriodFilterBar } from './AX_PeriodFilterBar'
import { AX_DashboardMetricsCards } from './AX_DashboardMetricsCards'
import { AX_PinnedStockWidget } from './AX_PinnedStockWidget'
import { AX_QuickActionsBar } from './AX_QuickActionsBar'
import { AX_SalesFlowChart } from './AX_SalesFlowChart'
import { AX_StockDistributionChart } from './AX_StockDistributionChart'
import { AX_TopSellingItemsChart } from './AX_TopSellingItemsChart'
import { AX_ColdStorageCapacityCard } from './AX_ColdStorageCapacityCard'
import { AX_CashCreditSplitChart } from './AX_CashCreditSplitChart'
import { AX_ManufacturingYieldCard } from './AX_ManufacturingYieldCard'
import { AX_OperationalAlerts } from './AX_OperationalAlerts'
import { AX_SkeletonLoader } from '../common/AX_SkeletonLoader'

export function AX_Dashboard() {
  const {
    items = [],
    warehouses = [],
    inventoryStock = [],
    invoices = [],
    transfers = [],
    treasuryAccounts = [],
    manufacturingOrders = [],
    clients = [],
    suppliers = [],
    salesReps = [],
    setActiveTab,
    isAuthLoading = false,
  } = useAXStore()

  const [period, setPeriod] = useState('month')
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  const getItem = (id) => items.find((i) => i.id === id)

  const filteredInvoices = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    return invoices.filter((inv) => {
      if (!inv || !inv.date) return false
      const d = inv.date

      if (period === 'today') {
        return d.startsWith(todayStr)
      }
      if (period === '7days') {
        const past7 = new Date(now)
        past7.setDate(past7.getDate() - 7)
        return d >= past7.toISOString().split('T')[0]
      }
      if (period === 'year') {
        return d.startsWith(String(now.getFullYear()))
      }
      if (period === 'custom') {
        if (startDate && d < startDate) return false
        if (endDate && d > endDate) return false
        return true
      }
      const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return d.startsWith(currentMonthPrefix)
    })
  }, [invoices, period, startDate, endDate])

  const salesInvoices = filteredInvoices.filter((i) => i.type === 'sale')
  const salesTotal = salesInvoices.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0)

  const purchaseInvoices = filteredInvoices.filter((i) => i.type === 'purchase')
  const purchasesTotal = purchaseInvoices.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0)

  const salesTrend = useMemo(() => {
    const now = new Date()
    let prevPeriodInvoices = []

    if (period === 'today') {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().split('T')[0]
      prevPeriodInvoices = invoices.filter((inv) => inv && inv.type === 'sale' && inv.date?.startsWith(yStr))
    } else if (period === '7days') {
      const past7 = new Date(now)
      past7.setDate(past7.getDate() - 7)
      const past14 = new Date(now)
      past14.setDate(past14.getDate() - 14)
      const p7Str = past7.toISOString().split('T')[0]
      const p14Str = past14.toISOString().split('T')[0]
      prevPeriodInvoices = invoices.filter((inv) => inv && inv.type === 'sale' && inv.date >= p14Str && inv.date < p7Str)
    } else if (period === 'year') {
      const prevYearStr = String(now.getFullYear() - 1)
      prevPeriodInvoices = invoices.filter((inv) => inv && inv.type === 'sale' && inv.date?.startsWith(prevYearStr))
    } else if (period === 'month') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthPrefix = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
      prevPeriodInvoices = invoices.filter((inv) => inv && inv.type === 'sale' && inv.date?.startsWith(prevMonthPrefix))
    }

    const prevSalesTotal = prevPeriodInvoices.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0)
    if (!prevSalesTotal || prevSalesTotal === 0) return null

    const diffPct = Math.round(((salesTotal - prevSalesTotal) / prevSalesTotal) * 100)
    return {
      label: `${diffPct >= 0 ? '+' : ''}${diffPct}%`,
      isPositive: diffPct >= 0,
    }
  }, [invoices, period, salesTotal])

  const purchasesTrend = useMemo(() => {
    const now = new Date()
    let prevPeriodInvoices = []

    if (period === 'today') {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().split('T')[0]
      prevPeriodInvoices = invoices.filter((inv) => inv && inv.type === 'purchase' && inv.date?.startsWith(yStr))
    } else if (period === '7days') {
      const past7 = new Date(now)
      past7.setDate(past7.getDate() - 7)
      const past14 = new Date(now)
      past14.setDate(past14.getDate() - 14)
      const p7Str = past7.toISOString().split('T')[0]
      const p14Str = past14.toISOString().split('T')[0]
      prevPeriodInvoices = invoices.filter((inv) => inv && inv.type === 'purchase' && inv.date >= p14Str && inv.date < p7Str)
    } else if (period === 'year') {
      const prevYearStr = String(now.getFullYear() - 1)
      prevPeriodInvoices = invoices.filter((inv) => inv && inv.type === 'purchase' && inv.date?.startsWith(prevYearStr))
    } else if (period === 'month') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthPrefix = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
      prevPeriodInvoices = invoices.filter((inv) => inv && inv.type === 'purchase' && inv.date?.startsWith(prevMonthPrefix))
    }

    const prevPurchasesTotal = prevPeriodInvoices.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0)
    if (!prevPurchasesTotal || prevPurchasesTotal === 0) return null

    const diffPct = Math.round(((purchasesTotal - prevPurchasesTotal) / prevPurchasesTotal) * 100)
    return {
      label: `${diffPct >= 0 ? '+' : ''}${diffPct}%`,
      isPositive: diffPct <= 0,
    }
  }, [invoices, period, purchasesTotal])

  const totalStockQuantity = inventoryStock.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0)
  const totalStockValue = inventoryStock.reduce((acc, s) => {
    const it = getItem(s.itemId)
    const price = Number(it?.sellPrice ?? it?.buyPrice ?? 0)
    return acc + (Number(s.quantity) || 0) * price
  }, 0)

  const totalCashBalance = treasuryAccounts.reduce(
    (acc, accnt) => acc + (Number(accnt.balance) || 0),
    0
  )

  const customerReceivables = useMemo(() => {
    return (clients || []).reduce((acc, c) => {
      const bal = Number(c.balance) || 0
      return bal > 0 ? acc + bal : acc
    }, 0)
  }, [clients])

  const supplierPayables = useMemo(() => {
    return (suppliers || []).reduce((acc, s) => {
      const bal = Number(s.balance) || 0
      return bal > 0 ? acc + bal : acc
    }, 0)
  }, [suppliers])

  const repPayables = useMemo(() => {
    return (salesReps || []).reduce((acc, r) => {
      const bal = Number(r.netBalance ?? r.currentBalance ?? r.balance) || 0
      return bal > 0 ? acc + bal : acc
    }, 0)
  }, [salesReps])

  const totalSalesTarget = useMemo(() => {
    return (salesReps || []).reduce((acc, r) => {
      return acc + (Number(r.salesTarget ?? r.targetAmount) || 0)
    }, 0)
  }, [salesReps])

  const targetAchievementPct = totalSalesTarget > 0 ? Math.round((salesTotal / totalSalesTarget) * 100) : 0

  const pendingTransfers = transfers.filter((t) => t && t.status === 'pending')
  const lowStockItems = inventoryStock.filter((s) => Number(s.quantity) > 0 && Number(s.quantity) <= 25)

  if (isAuthLoading) {
    return <AX_SkeletonLoader type="dashboard" />
  }

  return (
    <div className="w-full space-y-3.5 sm:space-y-4 pb-20 lg:pb-6 animate-in fade-in duration-200">
      <AX_PeriodFilterBar
        period={period}
        setPeriod={setPeriod}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
      />

      <AX_DashboardMetricsCards
        salesTotal={salesTotal}
        purchasesTotal={purchasesTotal}
        purchasesCount={purchaseInvoices.length}
        purchasesTrend={purchasesTrend}
        stockValue={totalStockValue}
        stockQuantity={totalStockQuantity}
        cashBalance={totalCashBalance}
        salesCount={salesInvoices.length}
        warehousesCount={warehouses.length}
        itemsCount={items.length}
        accountsCount={treasuryAccounts.length}
        salesTrend={salesTrend}
        customerReceivables={customerReceivables}
        supplierPayables={supplierPayables}
        repPayables={repPayables}
        salesTarget={totalSalesTarget}
        targetAchievementPct={targetAchievementPct}
      />

      <AX_PinnedStockWidget />

      <AX_QuickActionsBar onNavigateTab={setActiveTab} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AX_SalesFlowChart
          period={period}
          startDate={startDate}
          endDate={endDate}
          invoices={invoices}
        />

        <AX_StockDistributionChart
          items={items}
          inventoryStock={inventoryStock}
          warehouses={warehouses}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AX_TopSellingItemsChart
          invoices={filteredInvoices}
          items={items}
        />

        <AX_ColdStorageCapacityCard
          warehouses={warehouses}
          inventoryStock={inventoryStock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AX_CashCreditSplitChart
          invoices={filteredInvoices}
        />

        <AX_ManufacturingYieldCard
          manufacturingOrders={manufacturingOrders}
        />
      </div>

      <AX_OperationalAlerts
        pendingTransfers={pendingTransfers}
        lowStockItems={lowStockItems}
        getItem={getItem}
        onNavigateTab={setActiveTab}
      />
    </div>
  )
}

export default AX_Dashboard
