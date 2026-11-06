import React, { useState, useMemo } from 'react'
import {
  X,
  Package,
  Boxes,
  TrendingUp,
  ShoppingBag,
  ArrowLeftRight,
  ClipboardCheck,
  Calendar,
  Warehouse,
  Printer,
  ChevronDown,
} from 'lucide-react'

export function AX_ItemMovementCardModal({
  isOpen,
  onClose,
  item = null,
  warehouses = [],
  inventoryStock = [],
  purchaseInvoices = [],
  salesInvoices = [],
  transfers = [],
  stockAudits = [],
}) {
  const [activeTab, setActiveTab] = useState('timeline')

  const itemId = item?.id

  const stockPerWarehouse = useMemo(() => {
    if (!itemId) return []
    return (inventoryStock || [])
      .filter((s) => s && s.itemId === itemId)
      .map((s) => {
        const wh = warehouses.find((w) => w.id === s.warehouseId)
        return {
          warehouseId: s.warehouseId,
          warehouseName: wh?.name || 'مخزن غير محدد',
          warehouseType: wh?.type || 'warehouse',
          quantity: Number(s.quantity) || 0,
          unit: s.unit || item?.unitType || 'كرتونة',
        }
      })
  }, [itemId, inventoryStock, warehouses, item])

  const totalCurrentStock = useMemo(() => {
    return stockPerWarehouse.reduce((acc, s) => acc + s.quantity, 0)
  }, [stockPerWarehouse])

  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { monthlyPurchases, monthlySales, allMovements } = useMemo(() => {
    if (!itemId) {
      return { monthlyPurchases: 0, monthlySales: 0, allMovements: [] }
    }

    const movements = []
    let mPurchases = 0
    let mSales = 0

    ;(purchaseInvoices || []).forEach((inv) => {
      const invDate = inv.date || inv.operationalDate || inv.createdAt || ''
      const isThisMonth = String(invDate).startsWith(currentMonthStr)
      ;(inv.items || []).forEach((it) => {
        if (it.itemId === itemId || it.id === itemId) {
          const qty = Number(it.quantity) || 0
          const price = Number(it.price || it.buyPrice || 0)
          if (isThisMonth) mPurchases += qty
          movements.push({
            id: `purch-${inv.id}-${it.itemId}`,
            type: 'purchase',
            date: invDate,
            title: `توريد مشتريات [${inv.code || 'فاتورة'}]`,
            party: inv.supplierName || 'مورد',
            inQty: qty,
            outQty: 0,
            unitPrice: price,
            totalCost: qty * price,
            notes: inv.notes || '',
          })
        }
      })
    })

    ;(salesInvoices || []).forEach((inv) => {
      const invDate = inv.date || inv.operationalDate || inv.createdAt || ''
      const isThisMonth = String(invDate).startsWith(currentMonthStr)
      ;(inv.items || []).forEach((it) => {
        if (it.itemId === itemId || it.id === itemId) {
          const qty = Number(it.quantity) || 0
          const price = Number(it.price || it.sellPrice || 0)
          if (isThisMonth) mSales += qty
          movements.push({
            id: `sale-${inv.id}-${it.itemId}`,
            type: 'sale',
            date: invDate,
            title: `فاتورة بيع [${inv.code || 'فاتورة'}]`,
            party: inv.clientName || inv.customerName || 'عميل',
            inQty: 0,
            outQty: qty,
            unitPrice: price,
            totalCost: qty * price,
            notes: inv.notes || '',
          })
        }
      })
    })

    ;(transfers || []).forEach((trf) => {
      if (trf.status !== 'confirmed') return
      const trfDate = trf.operationalDate || trf.date || trf.requestedAt || ''
      const tItems = trf.items || [{ itemId: trf.itemId, quantity: trf.quantity }]
      tItems.forEach((it) => {
        if (it.itemId === itemId) {
          const qty = Number(it.quantity) || 0
          movements.push({
            id: `trf-${trf.id}-${it.itemId}`,
            type: 'transfer',
            date: trfDate,
            title: `تحويل مخزني [${trf.code || 'تحويل'}]`,
            party: `من ${trf.fromName || 'مخزن'} إلى ${trf.toName || 'مخزن'}`,
            inQty: qty,
            outQty: qty,
            isTransfer: true,
            notes: trf.notes || '',
          })
        }
      })
    })

    ;(stockAudits || []).forEach((aud) => {
      const audDate = aud.auditDate || aud.date || aud.createdAt || ''
      ;(aud.items || []).forEach((it) => {
        if (it.itemId === itemId) {
          const variance = Number(it.variance || 0)
          if (variance !== 0) {
            movements.push({
              id: `aud-${aud.id}-${it.itemId}`,
              type: 'audit',
              date: audDate,
              title: `تسوية جردية [${aud.code || 'محضر'}]`,
              party: aud.warehouseName || 'المخزن',
              inQty: variance > 0 ? variance : 0,
              outQty: variance < 0 ? Math.abs(variance) : 0,
              varianceCost: Number(it.varianceCost || 0),
              notes: `دفتري: ${it.systemQty} • فعلي: ${it.actualQtyNum || it.actualQty}`,
            })
          }
        }
      })
    })

    movements.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

    return {
      monthlyPurchases: mPurchases,
      monthlySales: mSales,
      allMovements: movements,
    }
  }, [itemId, purchaseInvoices, salesInvoices, transfers, stockAudits, currentMonthStr])

  if (!isOpen || !item) return null

  const buyPrice = Number(item.buyPrice ?? item.buy_price ?? 0)
  const sellPrice = Number(item.sellPrice ?? item.sell_price ?? 0)
  const marginPct = buyPrice > 0 ? Math.round(((sellPrice - buyPrice) / buyPrice) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
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
              </div>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                القسم: {item.primaryCategory || 'عام'} • الوحدة الأساسية: {item.unitType || 'كرتونة'}
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

        <div className="p-3 sm:p-4 border-b border-surface-container bg-surface-low/30 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                <span>الرصيد الإجمالي:</span>
                <Boxes className="w-4 h-4 text-primary" />
              </div>
              <div className="font-mono font-black text-lg sm:text-xl text-primary">
                {totalCurrentStock.toLocaleString('en-US')}{' '}
                <span className="text-xs font-normal text-on-surface-variant">{item.unitType || 'كرتونة'}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                <span>مشتريات الشهر:</span>
                <ShoppingBag className="w-4 h-4 text-amber-600" />
              </div>
              <div className="font-mono font-black text-lg sm:text-xl text-amber-700">
                {monthlyPurchases.toLocaleString('en-US')}{' '}
                <span className="text-xs font-normal text-on-surface-variant">{item.unitType || 'كرتونة'}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                <span>مبيعات الشهر:</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="font-mono font-black text-lg sm:text-xl text-emerald-700">
                {monthlySales.toLocaleString('en-US')}{' '}
                <span className="text-xs font-normal text-on-surface-variant">{item.unitType || 'كرتونة'}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                <span>سعر الشراء / البيع:</span>
                <span className="text-[10px] text-emerald-700 font-mono font-black">+{marginPct}%</span>
              </div>
              <div className="font-mono font-black text-xs sm:text-sm text-on-surface flex items-baseline justify-between pt-1">
                <span>ش: {buyPrice.toLocaleString('en-US')} ج</span>
                <span className="text-primary font-black">ب: {sellPrice.toLocaleString('en-US')} ج</span>
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
              حركة الصنف 360° ({allMovements.length})
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
              توزيع المخزون ({stockPerWarehouse.length})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {activeTab === 'timeline' && (
            <div>
              {allMovements.length === 0 ? (
                <div className="py-16 text-center text-on-surface-variant space-y-2">
                  <Package className="w-10 h-10 mx-auto text-on-surface-variant/40" />
                  <p className="text-xs font-bold">لا توجد حركات مسجلة لهذا الصنف حتى الآن</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-surface-low/60 border-b border-surface-container text-on-surface-variant font-black h-9 text-[11px]">
                        <th className="px-3">التاريخ</th>
                        <th className="px-3">نوع الحركة</th>
                        <th className="px-3">الجهة / المخزن</th>
                        <th className="px-3 text-center">الوارد</th>
                        <th className="px-3 text-center">المنصرف</th>
                        <th className="px-3 text-left">السعر / التكلفة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container/40 font-bold">
                      {allMovements.map((m) => (
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
                                  : m.type === 'transfer'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-rose-500/10 text-rose-800'
                              }`}
                            >
                              {m.title}
                            </span>
                          </td>
                          <td className="px-3 text-on-surface font-black truncate max-w-[180px]">
                            {m.party}
                          </td>
                          <td className="px-3 text-center font-mono font-black text-emerald-600">
                            {m.inQty > 0 ? `+${m.inQty}` : '—'}
                          </td>
                          <td className="px-3 text-center font-mono font-black text-rose-700">
                            {m.outQty > 0 ? `-${m.outQty}` : '—'}
                          </td>
                          <td className="px-3 text-left font-mono font-black text-on-surface">
                            {m.unitPrice > 0 ? `${m.unitPrice.toLocaleString('en-US')} ج.م` : '—'}
                          </td>
                        </tr>
                      ))}
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
                            {s.quantity}
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
    </div>
  )
}

export default AX_ItemMovementCardModal
