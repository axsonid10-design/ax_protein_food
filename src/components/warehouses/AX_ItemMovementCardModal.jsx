import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Package,
  Boxes,
  TrendingUp,
  ShoppingBag,
  Warehouse,
  Printer,
  History,
  Layers,
} from 'lucide-react'
import { calculateItemMovements } from './itemMovementHelpers'
import { AX_ItemOpeningBalanceModal } from '../items/AX_ItemOpeningBalanceModal'

export function AX_ItemMovementCardModal({
  isOpen,
  onClose,
  item = null,
  initialWarehouseId = 'ALL',
  warehouses = [],
  inventoryStock = [],
  invoices = [],
  purchaseInvoices = [],
  salesInvoices = [],
  transfers = [],
  stockAudits = [],
}) {
  const [activeTab, setActiveTab] = useState('timeline')
  const [selectedWhId, setSelectedWhId] = useState(initialWarehouseId || 'ALL')
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedWhId(initialWarehouseId || 'ALL')
    }
  }, [isOpen, initialWarehouseId])

  const itemId = item?.id

  const stockPerWarehouse = useMemo(() => {
    if (!itemId) return []
    return (warehouses || []).map((wh) => {
      const s = (inventoryStock || []).find((st) => st && st.itemId === itemId && st.warehouseId === wh.id)
      return {
        warehouseId: wh.id,
        warehouseName: wh.name || 'مخزن',
        warehouseType: wh.type || 'cold_store',
        quantity: Number(s?.quantity) || 0,
        unit: s?.unit || item?.unitType || 'كرتونة',
      }
    })
  }, [itemId, warehouses, inventoryStock, item])

  const totalCurrentStock = useMemo(() => {
    return stockPerWarehouse.reduce((acc, s) => acc + s.quantity, 0)
  }, [stockPerWarehouse])

  const currentStock = useMemo(() => {
    if (selectedWhId === 'ALL') return totalCurrentStock
    const found = stockPerWarehouse.find((s) => s.warehouseId === selectedWhId)
    return found ? found.quantity : 0
  }, [selectedWhId, totalCurrentStock, stockPerWarehouse])

  const selectedWarehouseObj = useMemo(() => {
    if (selectedWhId === 'ALL') return null
    return (warehouses || []).find((w) => w.id === selectedWhId) || null
  }, [selectedWhId, warehouses])

  const effectivePurchases = useMemo(() => {
    if (purchaseInvoices && purchaseInvoices.length > 0) return purchaseInvoices
    return (invoices || []).filter((i) => i.type === 'purchase' || i.type === 'purchase_return')
  }, [purchaseInvoices, invoices])

  const effectiveSales = useMemo(() => {
    if (salesInvoices && salesInvoices.length > 0) return salesInvoices
    return (invoices || []).filter((i) => i.type === 'sale' || i.type === 'sale_return')
  }, [salesInvoices, invoices])

  const { movementsList, openingBalance, totalInward, totalOutward } = useMemo(() => {
    return calculateItemMovements({
      itemId,
      selectedWhId,
      items: item ? [item] : [],
      purchases: effectivePurchases,
      sales: effectiveSales,
      transfers,
      stockAudits,
      currentStock,
      warehouses,
      inventoryStock,
    })
  }, [itemId, item, selectedWhId, effectivePurchases, effectiveSales, transfers, stockAudits, currentStock, warehouses, inventoryStock])

  if (!isOpen || !item) return null

  const buyPrice = Number(item.buyPrice ?? item.buy_price ?? 0)
  const sellPrice = Number(item.sellPrice ?? item.sell_price ?? 0)
  const marginPct = buyPrice > 0 ? Math.round(((sellPrice - buyPrice) / buyPrice) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-container shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Package className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-on-surface">
                  {item.compositeName || item.name}
                </h3>
                <span className="font-mono text-xs font-bold text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container">
                  {item.code || 'صنف'}
                </span>
                {selectedWarehouseObj && (
                  <span className="text-xs font-black text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    مخزن: {selectedWarehouseObj.name}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                القسم: {item.primaryCategory || 'عام'} • الوحدة: {item.unitType || 'كرتونة'}
                {Number(item.weightPerCarton || item.weight_per_carton) > 1 && (
                  <span> • وزن الكرتونة: {item.weightPerCarton || item.weight_per_carton} كجم</span>
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2.5 bg-surface-low/30 border-b border-surface-container overflow-x-auto scrollbar-none shrink-0 flex items-center gap-1.5">
          <span className="text-[11px] font-black text-on-surface-variant whitespace-nowrap ml-1">تحديد المخزن:</span>
          <button
            type="button"
            onClick={() => setSelectedWhId('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedWhId === 'ALL'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-lowest border border-outline-variant/40 text-on-surface hover:bg-surface-container'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>كافة المخازن</span>
            <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
              totalCurrentStock < 0 ? 'bg-rose-500 text-white' : selectedWhId === 'ALL' ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
            }`}>
              {totalCurrentStock.toLocaleString('en-US')}
            </span>
          </button>

          {stockPerWarehouse.map((w) => {
            const isSelected = selectedWhId === w.warehouseId
            return (
              <button
                key={w.warehouseId}
                type="button"
                onClick={() => setSelectedWhId(w.warehouseId)}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-lowest border border-outline-variant/40 text-on-surface hover:bg-surface-container'
                }`}
              >
                <Warehouse className="w-3.5 h-3.5" />
                <span>{w.warehouseName}</span>
                <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                  w.quantity < 0
                    ? 'bg-rose-500 text-white'
                    : isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-container text-on-surface-variant'
                }`}>
                  {w.quantity.toLocaleString('en-US')}
                </span>
              </button>
            )
          })}
        </div>

        <div className="p-3 sm:p-4 border-b border-surface-container bg-surface-low/30 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                <span>رصيد أول المدة:</span>
                <button
                  type="button"
                  onClick={() => setIsOpeningModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                  title="تغيير رصيد أول المدة"
                  aria-label="تغيير رصيد أول المدة"
                >
                  <Layers className="w-3 h-3" />
                  <span>تغيير رصيد أول المدة</span>
                </button>
              </div>
              <div className={`font-mono font-black text-lg sm:text-xl ${openingBalance < 0 ? 'text-error' : 'text-on-surface'}`}>
                {openingBalance.toLocaleString('en-US')}{' '}
                <span className="text-xs font-normal text-on-surface-variant">{item.unitType || 'كرتونة'}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                <span>الرصيد الحالي {selectedWhId === 'ALL' ? '(الكل)' : `(${selectedWarehouseObj?.name || 'المخزن'})`}:</span>
                <Boxes className="w-4 h-4 text-primary" />
              </div>
              <div className={`font-mono font-black text-lg sm:text-xl flex items-center gap-1.5 ${currentStock < 0 ? 'text-error' : 'text-primary'}`}>
                <span>{currentStock.toLocaleString('en-US')}</span>
                <span className="text-xs font-normal text-on-surface-variant">{item.unitType || 'كرتونة'}</span>
                {currentStock < 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-700 font-black border border-rose-500/20">
                    سالب
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                <span>إجمالي الوارد:</span>
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="font-mono font-black text-lg sm:text-xl text-emerald-700">
                +{totalInward.toLocaleString('en-US')}{' '}
                <span className="text-xs font-normal text-on-surface-variant">{item.unitType || 'كرتونة'}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                <span>إجمالي المنصرف:</span>
                <TrendingUp className="w-4 h-4 text-rose-600" />
              </div>
              <div className="font-mono font-black text-lg sm:text-xl text-rose-700">
                -{totalOutward.toLocaleString('en-US')}{' '}
                <span className="text-xs font-normal text-on-surface-variant">{item.unitType || 'كرتونة'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-2 sm:p-3 bg-surface-low/50 border-b border-surface-container flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-lowest border border-outline-variant/40 text-on-surface hover:bg-surface-container'
              }`}
            >
              حركة الصنف ({movementsList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                activeTab === 'stock'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-lowest border border-outline-variant/40 text-on-surface hover:bg-surface-container'
              }`}
            >
              توزيع الأرصدة ({stockPerWarehouse.length})
            </button>
          </div>
          <div className="text-[11px] font-bold text-on-surface-variant hidden sm:flex items-center gap-2">
            <span>سعر الشراء: <strong className="text-on-surface font-mono">{buyPrice.toLocaleString('en-US')} ج</strong></span>
            <span>•</span>
            <span>سعر البيع: <strong className="text-primary font-mono">{sellPrice.toLocaleString('en-US')} ج</strong></span>
            <span className="text-emerald-700 font-mono font-black">({marginPct}%)</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {activeTab === 'timeline' && (
            <div>
              {movementsList.length === 0 && openingBalance === 0 ? (
                <div className="py-16 text-center text-on-surface-variant space-y-2">
                  <Package className="w-10 h-10 mx-auto text-on-surface-variant/40" />
                  <p className="text-xs font-bold">لا توجد حركات أو أرصدة مسجلة لهذا الصنف في هذا النطاق</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-surface-low/60 border-b border-surface-container text-on-surface-variant font-black h-9 text-[11px]">
                        <th className="px-3">التاريخ</th>
                        <th className="px-3">نوع الحركة</th>
                        <th className="px-3">الجهة / البيان</th>
                        <th className="px-3 text-center">الوارد</th>
                        <th className="px-3 text-center">المنصرف</th>
                        <th className="px-3 text-center">الرصيد بعد الحركة</th>
                        <th className="px-3 text-left">السعر / التكلفة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container/40 font-bold">
                      {movementsList.map((m) => (
                        <tr key={m.id} className="h-10 hover:bg-surface-low/30">
                          <td className="px-3 font-mono text-on-surface-variant whitespace-nowrap text-[11px]">
                            {String(m.date || '').slice(0, 10)}
                          </td>
                          <td className="px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                m.type === 'purchase'
                                  ? 'bg-amber-500/10 text-amber-800'
                                  : m.type === 'sale'
                                  ? 'bg-emerald-500/10 text-emerald-800'
                                  : m.type.startsWith('transfer')
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-rose-500/10 text-rose-800'
                              }`}
                            >
                              {m.title}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-on-surface font-bold whitespace-nowrap">
                            {m.type === 'transfer_out' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-800 text-[11px] font-black border border-rose-500/20">
                                <span>منصرف تحويل إلى:</span>
                                <span className="font-black text-rose-950">{m.toWarehouseName || m.party}</span>
                              </span>
                            ) : m.type === 'transfer_in' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-[11px] font-black border border-emerald-500/20">
                                <span>وارد تحويل من:</span>
                                <span className="font-black text-emerald-950">{m.fromWarehouseName || m.party}</span>
                              </span>
                            ) : m.type === 'transfer' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface text-[11px] font-bold border border-outline-variant/30">
                                <span className="text-secondary font-black">{m.fromWarehouseName || 'المخزن'}</span>
                                <span className="text-primary font-black">⬅️ إلى: {m.toWarehouseName || 'المخزن'}</span>
                              </span>
                            ) : (
                              <span className="font-black text-on-surface text-xs">{m.party}</span>
                            )}
                          </td>
                          <td className="px-3 text-center font-mono font-black text-emerald-600">
                            {m.inQty > 0 ? (
                              <span>
                                +{m.inQty}
                                {m.unit && m.unit !== 'كرتونة' && (
                                  <span className="block text-[9px] text-on-surface-variant font-normal">({m.rawQty} {m.unit})</span>
                                )}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 text-center font-mono font-black text-rose-700">
                            {m.outQty > 0 ? (
                              <span>
                                -{m.outQty}
                                {m.unit && m.unit !== 'كرتونة' && (
                                  <span className="block text-[9px] text-on-surface-variant font-normal">({m.rawQty} {m.unit})</span>
                                )}
                              </span>
                            ) : '—'}
                          </td>
                          <td className={`px-3 text-center font-mono font-black ${
                            m.balanceAfter < 0 ? 'text-error' : 'text-primary'
                          }`}>
                            {m.balanceAfter.toLocaleString('en-US')}
                          </td>
                          <td className="px-3 text-left font-mono font-black text-on-surface">
                            {m.unitPrice > 0 ? `${m.unitPrice.toLocaleString('en-US')} ج.م` : '—'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-secondary/5 font-black text-on-surface border-t-2 border-secondary/20">
                        <td className="px-3 py-2 text-secondary text-[11px]">بداية الفترة</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-secondary/15 text-secondary">
                            رصيد أول المدة
                          </span>
                        </td>
                        <td className="px-3 py-2 text-on-surface-variant text-[11px]">
                          الرصيد الدفتري الافتتاحي
                        </td>
                        <td className="px-3 py-2 text-center text-on-surface-variant">—</td>
                        <td className="px-3 py-2 text-center text-on-surface-variant">—</td>
                        <td className={`px-3 py-2 text-center font-mono text-sm ${
                          openingBalance < 0 ? 'text-error' : 'text-secondary font-black'
                        }`}>
                          {openingBalance.toLocaleString('en-US')}
                        </td>
                        <td className="px-3 py-2 text-left text-on-surface-variant">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-2">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-surface-low/60 border-b border-surface-container text-on-surface-variant font-black h-9 text-[11px]">
                      <th className="px-3">المخزن</th>
                      <th className="px-3 text-center">الرصيد الحالي</th>
                      <th className="px-3 text-center">الوحدة</th>
                      <th className="px-3 text-left">قيمة التكلفة</th>
                      <th className="px-3 text-left">قيمة البيع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container/40 font-bold">
                    {stockPerWarehouse.map((s) => {
                      const costVal = s.quantity * buyPrice
                      const sellVal = s.quantity * sellPrice
                      return (
                        <tr key={s.warehouseId} className="h-10 hover:bg-surface-low/30">
                          <td className="px-3 text-on-surface font-black flex items-center gap-1.5 pt-2.5">
                            <Warehouse className="w-3.5 h-3.5 text-secondary" />
                            <span>{s.warehouseName}</span>
                          </td>
                          <td className={`px-3 text-center font-mono font-black text-sm ${
                            Number(s.quantity) < 0 ? 'text-error' : 'text-primary'
                          }`}>
                            {s.quantity.toLocaleString('en-US')}
                            {Number(s.quantity) < 0 && (
                              <span className="mr-1 text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-700">
                                سالب
                              </span>
                            )}
                          </td>
                          <td className="px-3 text-center text-on-surface-variant text-[11px]">
                            {s.unit}
                          </td>
                          <td className="px-3 text-left font-mono font-black text-on-surface">
                            {costVal.toLocaleString('en-US')} ج.م
                          </td>
                          <td className="px-3 text-left font-mono font-black text-primary">
                            {sellVal.toLocaleString('en-US')} ج.م
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-surface-container shrink-0 flex items-center justify-between bg-surface-low/40">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-surface-lowest border border-outline-variant/40 hover:bg-surface-container text-xs font-bold text-on-surface cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة بطاقة الصنف</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-full bg-primary text-white text-xs font-black hover:bg-primary-dark transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>

      <AX_ItemOpeningBalanceModal
        isOpen={isOpeningModalOpen}
        onClose={() => setIsOpeningModalOpen(false)}
        item={item}
        warehouses={warehouses}
      />
    </div>
  )
}

export default AX_ItemMovementCardModal
