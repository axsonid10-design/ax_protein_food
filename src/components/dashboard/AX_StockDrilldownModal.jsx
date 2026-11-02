import React, { useMemo } from 'react'
import {
  X,
  Boxes,
  Building,
  Truck,
  Warehouse,
  Package,
  Layers,
  Percent,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'

export function AX_StockDrilldownModal({ item, isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const { warehouses = [], inventoryStock = [] } = useAXStore()

  const drilldownData = useMemo(() => {
    if (!item?.id) return { totalQuantity: 0, byWarehouse: [], packagingSummary: {} }

    const itemStocks = (inventoryStock || []).filter((s) => s.itemId === item.id)
    const totalQuantity = itemStocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)

    const byWarehouse = (warehouses || []).map((wh) => {
      const stockRow = itemStocks.find((s) => s.warehouseId === wh.id)
      const qty = Number(stockRow?.quantity) || 0
      const sharePercentage = totalQuantity > 0 ? Math.round((qty / totalQuantity) * 100) : 0
      const unit = stockRow?.unit || item.unitType || 'كرتونة'

      let status = 'out'
      if (qty > 25) status = 'healthy'
      else if (qty > 0) status = 'low'

      return {
        warehouseId: wh.id,
        warehouseName: wh.name,
        warehouseType: wh.type,
        isBranch: wh.type === 'branch',
        isColdStore: wh.type === 'cold_store',
        isVan: wh.type === 'van',
        manager: wh.manager || 'غير محدد',
        quantity: qty,
        unit,
        sharePercentage,
        status,
      }
    })

    byWarehouse.sort((a, b) => b.quantity - a.quantity)

    const piecesPerCarton = Number(item.piecesPerCarton) || 0
    const weightPerCarton = Number(item.weightPerCarton) || 0
    const packagingSummary = {
      totalCartons: totalQuantity,
      totalPieces: piecesPerCarton > 0 ? totalQuantity * piecesPerCarton : null,
      totalWeightKg: weightPerCarton > 0 ? totalQuantity * weightPerCarton : null,
    }

    return { totalQuantity, byWarehouse, packagingSummary }
  }, [item, warehouses, inventoryStock])

  if (!isOpen || !item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-level3 space-y-4 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-on-surface">
                {getItemDisplayName(item)}
              </h3>
              <p className="text-xs text-on-surface-variant font-mono">
                كود الصنف: {item.code || item.id} • الوحدة: {item.unitType || 'كرتونة'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3 text-center">
            <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي المخزون</span>
            <span className="text-lg font-black font-mono text-primary">
              {drilldownData.totalQuantity.toLocaleString('en-US')} {item.unitType || 'كرتونة'}
            </span>
          </div>

          <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3 text-center">
            <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي القطع</span>
            <span className="text-lg font-black font-mono text-on-surface">
              {drilldownData.packagingSummary.totalPieces !== null
                ? `${drilldownData.packagingSummary.totalPieces.toLocaleString('en-US')} قطعة`
                : '—'}
            </span>
          </div>

          <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3 text-center">
            <span className="text-[11px] font-bold text-on-surface-variant block">الوزن الإجمالي</span>
            <span className="text-lg font-black font-mono text-emerald-700">
              {drilldownData.packagingSummary.totalWeightKg !== null
                ? `${drilldownData.packagingSummary.totalWeightKg.toLocaleString('en-US')} كجم`
                : '—'}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-black text-on-surface flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            توزيع الرصيد عبر الفروع وثلاجات الحفظ وسيارات التوزيع
          </h4>

          <div className="border border-outline-variant/30 rounded-2xl overflow-hidden">
            <div className="max-h-60 overflow-y-auto overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-surface-container/60 sticky top-0 border-b border-outline-variant/30 font-black">
                  <tr>
                    <th className="py-2.5 px-3">الفرع / المخزن</th>
                    <th className="py-2.5 px-3">المسؤول</th>
                    <th className="py-2.5 px-3 font-mono">الكمية</th>
                    <th className="py-2.5 px-3 font-mono text-center">النسبة</th>
                    <th className="py-2.5 px-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {drilldownData.byWarehouse.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-on-surface-variant font-bold">
                        لا يوجد رصيد مخزني مسجل لهذا الصنف في أي فرع.
                      </td>
                    </tr>
                  ) : (
                    drilldownData.byWarehouse.map((row) => (
                      <tr key={row.warehouseId} className="hover:bg-surface-container/30 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-on-surface">
                          <div className="flex items-center gap-1.5">
                            {row.isVan ? (
                              <Truck className="w-3.5 h-3.5 text-primary" />
                            ) : row.isBranch ? (
                              <Building className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <Warehouse className="w-3.5 h-3.5 text-primary" />
                            )}
                            <span>{row.warehouseName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-on-surface-variant font-semibold">
                          {row.manager}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-on-surface">
                          {row.quantity.toLocaleString('en-US')} {row.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-center">
                          {row.sharePercentage}%
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {row.status === 'healthy' ? (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 font-bold text-[10px]">
                              متوفر
                            </span>
                          ) : row.status === 'low' ? (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 font-bold text-[10px]">
                              منخفض
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-red-500/15 text-red-800 font-bold text-[10px]">
                              نفد
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}

export default AX_StockDrilldownModal
