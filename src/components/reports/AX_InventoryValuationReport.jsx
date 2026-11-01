import React, { useState, useMemo } from 'react'
import {
  Boxes,
  Warehouse,
  DollarSign,
  TrendingUp,
  Printer,
  FileSpreadsheet,
  Search,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import {
  formatCurrency,
  formatNumber,
  exportToCsv,
} from '../../utils/reportCalculations'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'

export function AX_InventoryValuationReport({
  inventoryStock = [],
  items = [],
  warehouses = [],
}) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const itemsMap = useMemo(() => {
    const map = {}
    items.forEach((it) => {
      map[it.id] = it
    })
    return map
  }, [items])

  const warehousesMap = useMemo(() => {
    const map = {}
    warehouses.forEach((w) => {
      map[w.id] = w.name
    })
    return map
  }, [warehouses])

  const calculatedStock = useMemo(() => {
    const filteredByWh = selectedWarehouseId === 'all'
      ? inventoryStock
      : inventoryStock.filter((s) => s.warehouseId === selectedWarehouseId)

    const list = []
    let totalCostValuation = 0
    let totalSellingValuation = 0
    let totalStockUnits = 0

    filteredByWh.forEach((s) => {
      const it = itemsMap[s.itemId]
      if (!it) return

      const qty = Number(s.quantity) || 0
      const buyPrice = Number(it.buyPrice) || 0
      const sellPrice = Number(it.sellPrice) || 0
      const totalCost = qty * buyPrice
      const totalSell = qty * sellPrice
      const profitPotential = totalSell - totalCost

      totalCostValuation += totalCost
      totalSellingValuation += totalSell
      totalStockUnits += qty

      const row = {
        id: `${s.warehouseId}-${s.itemId}`,
        itemCode: it.code || 'ITM',
        itemName: it.compositeName || it.name,
        category: it.primaryCategory || 'عام',
        warehouseId: s.warehouseId,
        warehouseName: warehousesMap[s.warehouseId] || 'مخزن',
        quantity: qty,
        unit: s.unit || it.unitType || 'كرتونة',
        buyPrice,
        sellPrice,
        totalCost,
        totalSell,
        profitPotential,
        marginPct: totalSell > 0 ? (profitPotential / totalSell) * 100 : 0,
        isLow: qty <= 20,
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !row.itemName.toLowerCase().includes(q) &&
          !row.itemCode.toLowerCase().includes(q) &&
          !row.category.toLowerCase().includes(q)
        ) {
          return
        }
      }

      list.push(row)
    })

    const totalPotentialProfit = totalSellingValuation - totalCostValuation
    const overallMarginPct =
      totalSellingValuation > 0 ? (totalPotentialProfit / totalSellingValuation) * 100 : 0

    return {
      list,
      totalCostValuation,
      totalSellingValuation,
      totalPotentialProfit,
      overallMarginPct,
      totalStockUnits,
    }
  }, [inventoryStock, itemsMap, warehousesMap, selectedWarehouseId, searchQuery])

  const totalPages = Math.ceil(calculatedStock.list.length / pageSize) || 1
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return calculatedStock.list.slice(start, start + pageSize)
  }, [calculatedStock.list, currentPage])

  const handleExport = () => {
    const headers = [
      'كود الصنف',
      'اسم الصنف',
      'القسم',
      'المخزن',
      'الكمية',
      'الوحدة',
      'سعر الشراء (ج.م)',
      'إجمالي التكلفة (ج.م)',
      'سعر البيع (ج.م)',
      'القيمة البيعية (ج.م)',
      'الربح المتوقع (ج.م)',
    ]
    const data = calculatedStock.list.map((r) => [
      r.itemCode,
      r.itemName,
      r.category,
      r.warehouseName,
      r.quantity,
      r.unit,
      r.buyPrice,
      r.totalCost,
      r.sellPrice,
      r.totalSell,
      r.profitPotential,
    ])
    exportToCsv(`تقييم_المخزون_${new Date().toISOString().split('T')[0]}`, headers, data)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/30">
        <div>
          <h3 className="text-sm sm:text-base font-black text-on-surface">
            تقرير ميزان حركة المخزون والتقييم المالي
          </h3>
          <span className="text-[11px] font-bold text-on-surface-variant">
            حساب القيمة التكليفية والبيعية لرأس المال المحبوس في ثلاجات التجميد
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
            <span>القيمة التكليفية للمخزون</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-base sm:text-lg font-black text-on-surface mt-1">
            {formatCurrency(calculatedStock.totalCostValuation)}
          </div>
          <div className="text-[10px] font-bold text-on-surface-variant mt-0.5">
            رأس المال المحبوس في البضاعة
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>القيمة البيعية المتوقعة</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-600 mt-1">
            {formatCurrency(calculatedStock.totalSellingValuation)}
          </div>
          <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
            عند بيع كامل الرصيد بالأسعار المقررة
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>الربح الكامن في المخزن</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-base sm:text-lg font-black text-primary mt-1">
            {formatCurrency(calculatedStock.totalPotentialProfit)}
          </div>
          <div className="text-[10px] font-bold text-primary mt-0.5">
            متوسط هامش {calculatedStock.overallMarginPct.toFixed(1)}%
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>إجمالي الوحدات التخزينية</span>
            <Boxes className="w-4 h-4 text-on-surface-variant" />
          </div>
          <div className="text-base sm:text-lg font-black text-on-surface mt-1">
            {formatNumber(calculatedStock.totalStockUnits)} وحدة
          </div>
          <div className="text-[10px] font-bold text-on-surface-variant mt-0.5">
            كرتونة وكيلو وقطعة
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-surface-lowest p-3 rounded-2xl border border-outline-variant/30">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-on-surface-variant absolute right-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث باسم الصنف، الكود، أو القسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pr-9 pl-3.5 rounded-full bg-surface-low border border-outline-variant/40 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        <div className="sm:w-56">
          <AX_SearchableSelect
            value={selectedWarehouseId}
            onChange={(val) => {
              setSelectedWarehouseId(val)
              setCurrentPage(1)
            }}
            options={[
              { value: 'all', label: 'كافة المخازن والثلاجات' },
              ...warehouses.map((w) => ({ value: w.id, label: w.name, badge: w.type === 'main' ? 'رئيسي' : 'فرع' })),
            ]}
            searchable={false}
          />
        </div>
      </div>

      <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-surface-low/80 border-b border-surface-container text-on-surface-variant font-black">
                <th className="py-3 px-3.5 whitespace-nowrap">كود الصنف</th>
                <th className="py-3 px-3.5">اسم الصنف</th>
                <th className="py-3 px-3.5 whitespace-nowrap">المخزن</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">الرصيد الفعلي</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">سعر الشراء</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">إجمالي التكلفة</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">سعر البيع</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">القيمة البيعية</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">الربح الكامن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container/60 font-bold">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-on-surface-variant text-xs">
                    لا توجد أصناف مطابقة للبحث أو المخزن المحدد
                  </td>
                </tr>
              ) : (
                paginatedList.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-low/40 transition-colors h-11">
                    <td className="py-2.5 px-3.5 font-mono text-primary font-black whitespace-nowrap">
                      {r.itemCode}
                    </td>
                    <td className="py-2.5 px-3.5 text-on-surface font-black max-w-[200px] truncate">
                      {r.itemName}
                    </td>
                    <td className="py-2.5 px-3.5 text-on-surface-variant text-[11px] whitespace-nowrap">
                      {r.warehouseName}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          r.isLow
                            ? 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
                            : 'bg-surface-low border border-outline-variant/30 text-on-surface'
                        }`}
                      >
                        {formatNumber(r.quantity)} {r.unit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono text-on-surface-variant whitespace-nowrap">
                      {formatCurrency(r.buyPrice)}
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono font-black text-on-surface whitespace-nowrap">
                      {formatCurrency(r.totalCost)}
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono text-on-surface-variant whitespace-nowrap">
                      {formatCurrency(r.sellPrice)}
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono text-emerald-600 whitespace-nowrap">
                      {formatCurrency(r.totalSell)}
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono font-black text-primary whitespace-nowrap">
                      {formatCurrency(r.profitPotential)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden divide-y divide-surface-container/60 p-3 space-y-2.5">
          {paginatedList.length === 0 ? (
            <div className="py-6 text-center text-on-surface-variant text-xs font-bold">
              لا توجد أصناف مطابقة للبحث أو المخزن المحدد
            </div>
          ) : (
            paginatedList.map((r) => (
              <div key={r.id} className="bg-surface-low/50 rounded-2xl p-3 space-y-2 border border-outline-variant/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-black text-primary">{r.itemCode}</span>
                  <span className="text-[10px] font-bold text-on-surface-variant">{r.warehouseName}</span>
                </div>
                <div className="text-xs font-black text-on-surface">{r.itemName}</div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-surface-container/50 text-[11px] font-bold">
                  <div>
                    <span className="text-on-surface-variant block text-[10px]">الرصيد:</span>
                    <span className="font-mono font-black text-on-surface">
                      {formatNumber(r.quantity)} {r.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block text-[10px]">قيمة التكلفة:</span>
                    <span className="font-mono font-black text-primary">{formatCurrency(r.totalCost)}</span>
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
              {Math.min(currentPage * pageSize, calculatedStock.list.length)} من {calculatedStock.list.length} صنف
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
