import React, { useMemo } from 'react'
import {
  Truck,
  Wallet,
  Boxes,
  MapPin,
  ShoppingCart,
  ArrowUpRight,
  PackagePlus,
  Scale,
  Hash,
  Phone,
  FileCheck2,
  Trash2,
} from 'lucide-react'
import {
  calculateItemBreakdown,
  calculateVanCustodyTotals,
} from '../../store/vanDistributionHelpers'

export function AX_VanCustodySummaryCard({
  currentVan,
  currentVanCash,
  currentVanStock = [],
  items = [],
  onOpenLoadModal,
  onOpenSaleModal,
  onOpenSettlementModal,
  onDeleteVehicle,
}) {
  const getItemObj = (id) => items.find((i) => i.id === id) || {}

  const totals = useMemo(() => {
    return calculateVanCustodyTotals(currentVanStock, items)
  }, [currentVanStock, items])

  const cashBalance = Number(currentVanCash?.balance) || 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 shadow-level1 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-primary" />
              بيانات المركبة والمندوب
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                currentVan?.status === 'maintenance'
                  ? 'bg-amber-500/10 text-amber-700'
                  : currentVan?.status === 'inactive'
                  ? 'bg-error/10 text-error'
                  : 'bg-emerald-500/10 text-emerald-700'
              }`}>
                {currentVan?.status === 'maintenance'
                  ? 'في الصيانة'
                  : currentVan?.status === 'inactive'
                  ? 'لا تعمل'
                  : 'تعمل ميدانياً'}
              </span>
              {onDeleteVehicle && currentVan && (
                <button
                  type="button"
                  onClick={() => onDeleteVehicle(currentVan)}
                  className="p-1 rounded-full hover:bg-error/10 text-error/80 hover:text-error transition-all cursor-pointer"
                  title="حذف سيارة التوزيع"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-black text-base text-on-surface">{currentVan?.name}</h3>
            {currentVan?.plateNumber && (
              <div className="flex items-center gap-1 text-xs font-mono font-bold text-on-surface-variant">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span>لوحة: {currentVan.plateNumber}</span>
                {currentVan.model && <span>• {currentVan.model}</span>}
              </div>
            )}
            <div className="flex items-center gap-1 text-xs font-bold text-on-surface-variant">
              <span>المندوب: {currentVan?.manager || currentVan?.driverName || 'المندوب المسؤول'}</span>
              {currentVan?.phone && (
                <span className="font-mono text-primary mr-1">({currentVan.phone})</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-primary font-bold pt-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>خط سير التوزيع والعملاء الميدانيين</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant font-bold flex items-center gap-1">
                <Wallet className="w-4 h-4 text-primary" /> عهدة نقدية بالسيارة:
              </span>
              <span className="font-mono font-black text-primary text-sm">
                {cashBalance.toLocaleString('en-US')} ج.م
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenSaleModal}
                disabled={currentVanStock.length === 0}
                className="py-2 px-3 rounded-full bg-secondary hover:bg-secondary-hover text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>تسجيل بيع مباشر</span>
              </button>
              <button
                type="button"
                onClick={onOpenSettlementModal}
                className="py-2 px-3 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>تصفية وتسوية يومية</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 shadow-level1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-black text-on-surface">
                عهدة بضاعة السيارة ({currentVanStock.length} صنف)
              </h3>
            </div>

            <button
              type="button"
              onClick={onOpenLoadModal}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-black hover:bg-primary-dark transition-all cursor-pointer shadow-xs"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>شحن بضاعة للسيارة</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-surface-low border border-outline-variant/20">
            <div>
              <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي الكراتين</span>
              <span className="text-sm font-mono font-black text-primary">{totals.totalCartons} ك</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي الوزن</span>
              <span className="text-sm font-mono font-black text-on-surface">{totals.totalWeightKg} كجم</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-on-surface-variant block">القيمة التقديرية</span>
              <span className="text-sm font-mono font-black text-secondary">
                {totals.totalValueEgp.toLocaleString('en-US')} ج.م
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {currentVanStock.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs text-on-surface-variant font-bold">
                  لا توجد بضاعة محملة على السيارة حالياً.
                </p>
                <button
                  type="button"
                  onClick={onOpenLoadModal}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-surface-low border border-outline-variant/40 hover:border-primary text-xs font-bold text-primary transition-all cursor-pointer"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>تحميل أصناف للسيارة</span>
                </button>
              </div>
            ) : (
              currentVanStock.map((s, idx) => {
                const it = getItemObj(s.itemId)
                const breakdown = calculateItemBreakdown(s.quantity, it)

                return (
                  <div
                    key={s.itemId || idx}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-surface-low border border-outline-variant/20 hover:border-outline-variant/40 transition-all"
                  >
                    <div className="space-y-0.5">
                      <span className="font-black text-xs sm:text-sm text-on-surface">
                        {it.compositeName || it.name || s.itemId}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] font-bold text-on-surface-variant">
                        <span>{it.primaryCategory || 'صنف'}</span>
                        {breakdown.piecesPerCarton > 0 && (
                          <span className="text-primary font-mono">
                            ({breakdown.wholeCartons} كراتين
                            {breakdown.subUnits > 0 ? ` + ${breakdown.subUnits} ${breakdown.subUnitType}` : ''})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-left font-mono font-black text-sm text-primary">
                      {s.quantity} {s.unit || 'كرتونة'}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AX_VanCustodySummaryCard
