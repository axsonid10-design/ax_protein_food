import React from 'react'
import { AlertTriangle, BellOff, AlertCircle } from 'lucide-react'
import {
  isItemPackagingIncomplete,
  isItemMinAlertMissing,
  isItemNearDepletion,
} from '../../utils/itemUnitFormatters'

export function AX_ItemStatusIndicators({ item, currentStock, showBadges = false }) {
  if (!item) return null

  const incompletePkg = isItemPackagingIncomplete(item)
  const missingMinAlert = isItemMinAlertMissing(item)
  const nearDepletion = isItemNearDepletion(item, currentStock)

  if (!incompletePkg && !missingMinAlert && !nearDepletion) return null

  return (
    <div className="inline-flex items-center gap-1.5 align-middle">
      {/* 🟡 Yellow Dot: Missing Packaging / Sub-unit */}
      {incompletePkg && (
        <span
          className="relative flex h-2.5 w-2.5 cursor-help"
          title="بيانات التعبئة أو الوحدة الصغرى/الكبرى غير محددة"
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-amber-600 shadow-xs"></span>
        </span>
      )}

      {/* 🔴 Red Dot: Missing Min Stock Alert Threshold */}
      {missingMinAlert && (
        <span
          className="relative flex h-2.5 w-2.5 cursor-help"
          title="حد النواقص للتنبيه غير محدد"
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 border border-rose-700 shadow-xs"></span>
        </span>
      )}

      {/* 🚨 Depletion Badge if near depletion */}
      {showBadges && nearDepletion && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-700 border border-rose-500/30 animate-pulse"
          title={`الرصيد الحالي (${currentStock}) وصل أو أقل من حد النواقص (${item.minStockAlert || item.min_stock_alert})`}
        >
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>أوشك على النفاد</span>
        </span>
      )}
    </div>
  )
}

export default AX_ItemStatusIndicators
