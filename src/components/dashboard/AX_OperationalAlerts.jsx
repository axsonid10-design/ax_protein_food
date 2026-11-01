import React from 'react'
import { Clock, AlertTriangle, ArrowLeftRight, ChevronLeft } from 'lucide-react'

export function AX_OperationalAlerts({
  pendingTransfers = [],
  lowStockItems = [],
  getItem,
  onNavigateTab,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-surface-container pb-2">
          <span className="text-xs font-black text-on-surface flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>التحويلات المعلقة ({pendingTransfers.length})</span>
          </span>
          <button
            type="button"
            onClick={() => onNavigateTab('warehouses')}
            className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
          >
            <span>عرض الكل</span>
            <ChevronLeft className="w-3 h-3" />
          </button>
        </div>

        {pendingTransfers.length === 0 ? (
          <div className="py-6 text-center text-xs font-bold text-on-surface-variant">
            لا توجد أذونات تحويل معلقة حالياً
          </div>
        ) : (
          <div className="space-y-2">
            {pendingTransfers.slice(0, 3).map((trf) => (
              <div
                key={trf.id}
                onClick={() => onNavigateTab('warehouses')}
                className="p-2.5 sm:p-3 rounded-2xl bg-surface-low/70 border border-outline-variant/30 flex items-center justify-between gap-2 cursor-pointer hover:border-primary/50 transition-all text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-primary truncate">
                      {trf.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-bold border border-amber-500/20 shrink-0">
                      بانتظار التأكيد
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-on-surface-variant truncate block mt-0.5">
                    من: {trf.fromName} ← إلى: {trf.toName}
                  </span>
                </div>
                <div className="shrink-0 text-left">
                  <span className="text-[11px] font-mono font-bold text-on-surface-variant block">
                    {trf.items?.length || 0} بنود
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-surface-container pb-2">
          <span className="text-xs font-black text-on-surface flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-error" />
            <span>تنبيهات نواقص المخزون ({lowStockItems.length})</span>
          </span>
          <button
            type="button"
            onClick={() => onNavigateTab('warehouses')}
            className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
          >
            <span>مراجعة المخازن</span>
            <ChevronLeft className="w-3 h-3" />
          </button>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="py-6 text-center text-xs font-bold text-on-surface-variant">
            كافة مستويات المخزون في الحدود الآمنة
          </div>
        ) : (
          <div className="space-y-2">
            {lowStockItems.slice(0, 3).map((stk, idx) => {
              const itemObj = getItem(stk.itemId)
              return (
                <div
                  key={idx}
                  className="p-2.5 sm:p-3 rounded-2xl bg-surface-low/70 border border-outline-variant/30 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-black text-on-surface truncate block">
                      {itemObj?.compositeName || 'صنف'}
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-bold truncate block">
                      {itemObj?.primaryCategory} • {itemObj?.subCategory}
                    </span>
                  </div>
                  <div className="shrink-0 flex items-baseline gap-1 font-mono font-black text-error px-2.5 py-1 rounded-full bg-error/10 border border-error/20">
                    <span>{stk.quantity}</span>
                    <span className="text-[10px]">{stk.unit}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
