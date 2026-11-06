import React from 'react'
import {
  ChevronDown,
  ChevronUp,
  Boxes,
  CheckCheck,
} from 'lucide-react'

export function AX_StockAuditCategoryGroup({
  category,
  items = [],
  onActualQtyChange,
  onUnitChange,
  onMarkCategoryMatched,
  onMarkItemZero,
  onMarkItemMatched,
  isExpanded = true,
  onToggleExpand,
}) {
  const totalItems = items.length
  const matchedCount = items.filter((i) => i.variance === 0).length
  const deficitCount = items.filter((i) => i.variance < 0).length
  const surplusCount = items.filter((i) => i.variance > 0).length

  return (
    <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs transition-all">
      <div
        className="p-3 bg-surface-low/70 border-b border-surface-container flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
            <Boxes className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-black text-on-surface">{category}</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono">
              {totalItems} صنف
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold">
            <span className="text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {matchedCount} مطابق
            </span>
            {deficitCount > 0 && (
              <span className="text-rose-700 bg-rose-500/10 px-2 py-0.5 rounded-full">
                {deficitCount} عجز
              </span>
            )}
            {surplusCount > 0 && (
              <span className="text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {surplusCount} زيادة
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onMarkCategoryMatched && onMarkCategoryMatched(category)}
            className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-primary/10 hover:text-primary text-[10px] font-bold text-on-surface-variant transition-colors flex items-center gap-1 cursor-pointer"
            title="تحديد جميع أصناف هذا القسم مطابقة للرصيد الدفتري"
          >
            <CheckCheck className="w-3 h-3 text-primary" />
            <span className="hidden xs:inline">الكل مطابق</span>
          </button>

          <button
            type="button"
            onClick={onToggleExpand}
            className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-surface-low/30 border-b border-surface-container text-on-surface-variant font-black h-9 text-[11px]">
                  <th className="px-3 whitespace-nowrap">اسم الصنف</th>
                  <th className="px-2 whitespace-nowrap text-center">وحدة الجرد</th>
                  <th className="px-3 whitespace-nowrap text-center">الرصيد الدفتري</th>
                  <th className="px-3 whitespace-nowrap text-center">العد الفعلي</th>
                  <th className="px-3 whitespace-nowrap text-center">الإجراء السريع</th>
                  <th className="px-2 whitespace-nowrap text-center">الفارق</th>
                  <th className="px-2 whitespace-nowrap text-center">الحالة</th>
                  <th className="px-3 whitespace-nowrap text-left">قيمة الفارق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container/40 font-bold">
                {items.map((r) => {
                  const currentAuditUnit = r.auditUnit || r.unit || 'كرتونة'
                  const baseUnit = r.baseUnit || r.unit || 'كرتونة'
                  const isUnitConverted = currentAuditUnit !== baseUnit

                  return (
                    <tr key={r.itemId} className="hover:bg-surface-low/30 transition-colors h-11">
                      <td className="px-3 font-black text-on-surface max-w-[200px] truncate" title={r.itemName}>
                        <div>
                          <span>{r.itemName}</span>
                          {r.weightPerCarton > 1 && (
                            <span className="text-[10px] text-on-surface-variant/70 block font-normal">
                              وزن الكرتونة: {r.weightPerCarton} كجم
                            </span>
                          )}
                          {r.piecesPerCarton > 1 && (
                            <span className="text-[10px] text-primary/80 block font-normal">
                              الكرتونة: {r.piecesPerCarton} قطعة
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-container border border-outline-variant/30 text-[10px]">
                          <button
                            type="button"
                            onClick={() => onUnitChange && onUnitChange(r.itemId, 'كرتونة')}
                            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                              currentAuditUnit === 'كرتونة'
                                ? 'bg-primary text-white font-black shadow-xs'
                                : 'text-on-surface-variant hover:text-on-surface font-bold'
                            }`}
                          >
                            كرتونة
                          </button>
                          <button
                            type="button"
                            onClick={() => onUnitChange && onUnitChange(r.itemId, 'كيلو')}
                            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                              currentAuditUnit === 'كيلو'
                                ? 'bg-primary text-white font-black shadow-xs'
                                : 'text-on-surface-variant hover:text-on-surface font-bold'
                            }`}
                          >
                            كيلو
                          </button>
                          <button
                            type="button"
                            onClick={() => onUnitChange && onUnitChange(r.itemId, 'قطعة')}
                            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                              currentAuditUnit === 'قطعة'
                                ? 'bg-primary text-white font-black shadow-xs'
                                : 'text-on-surface-variant hover:text-on-surface font-bold'
                            }`}
                          >
                            قطعة
                          </button>
                        </div>
                      </td>
                      <td className="px-3 text-center font-mono text-on-surface font-black whitespace-nowrap">
                        {r.systemQty} <span className="text-[10px] text-on-surface-variant font-normal">{baseUnit}</span>
                      </td>
                      <td className="px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-0.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={r.inputQty !== undefined ? r.inputQty : r.actualQty}
                            onChange={(e) => onActualQtyChange(r.itemId, e.target.value)}
                            className="w-20 h-7 px-2 rounded-lg bg-surface-low border border-outline-variant/50 text-center font-mono font-black text-on-surface focus:border-primary outline-none text-xs"
                          />
                          {isUnitConverted && (
                            <span className="text-[9px] text-primary font-black font-mono">
                              = {r.actualQtyNum} {baseUnit}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onMarkItemMatched(r.itemId)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                              r.variance === 0
                                ? 'bg-emerald-600 text-white'
                                : 'bg-surface-low text-on-surface-variant hover:bg-emerald-500/10 hover:text-emerald-700'
                            }`}
                            title="تحديد مطابق للرصيد الدفتري"
                          >
                            مطابق
                          </button>
                          <button
                            type="button"
                            onClick={() => onMarkItemZero(r.itemId)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                              r.actualQtyNum === 0
                                ? 'bg-rose-700 text-white'
                                : 'bg-surface-low text-on-surface-variant hover:bg-rose-500/10 hover:text-rose-700'
                            }`}
                            title="تحديد غير موجود (رصيد صفر)"
                          >
                            غير موجود
                          </button>
                        </div>
                      </td>
                      <td className="px-2 text-center font-mono font-black whitespace-nowrap">
                        <span
                          className={
                            r.variance === 0
                              ? 'text-on-surface-variant'
                              : r.variance < 0
                              ? 'text-rose-700'
                              : 'text-emerald-600'
                          }
                        >
                          {r.variance > 0 ? `+${r.variance}` : r.variance} {baseUnit}
                        </span>
                      </td>
                      <td className="px-2 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            r.status === 'matched'
                              ? 'bg-surface-low text-on-surface-variant border border-outline-variant/30'
                              : r.status === 'deficit'
                              ? 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                          }`}
                        >
                          {r.status === 'matched' && 'مطابق'}
                          {r.status === 'deficit' && 'عجز'}
                          {r.status === 'surplus' && 'فائض'}
                        </span>
                      </td>
                      <td className="px-3 text-left font-mono font-black whitespace-nowrap">
                        <span
                          className={
                            r.varianceCost === 0
                              ? 'text-on-surface-variant'
                              : r.varianceCost < 0
                              ? 'text-rose-700'
                              : 'text-emerald-600'
                          }
                        >
                          {r.varianceCost === 0
                            ? '—'
                            : `${r.varianceCost > 0 ? '+' : ''}${r.varianceCost.toLocaleString('en-US')} ج.م`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Bento Cards View */}
          <div className="md:hidden divide-y divide-surface-container/40 p-2 space-y-2">
            {items.map((r) => {
              const currentAuditUnit = r.auditUnit || r.unit || 'كرتونة'
              const baseUnit = r.baseUnit || r.unit || 'كرتونة'
              const isUnitConverted = currentAuditUnit !== baseUnit

              return (
                <div key={r.itemId} className="p-2.5 rounded-xl bg-surface-low/40 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-xs text-on-surface truncate">{r.itemName}</span>
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-container border border-outline-variant/30 text-[10px]">
                      <button
                        type="button"
                        onClick={() => onUnitChange && onUnitChange(r.itemId, 'كرتونة')}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          currentAuditUnit === 'كرتونة'
                            ? 'bg-primary text-white font-black'
                            : 'text-on-surface-variant font-bold'
                        }`}
                      >
                        كرتونة
                      </button>
                      <button
                        type="button"
                        onClick={() => onUnitChange && onUnitChange(r.itemId, 'كيلو')}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          currentAuditUnit === 'كيلو'
                            ? 'bg-primary text-white font-black'
                            : 'text-on-surface-variant font-bold'
                        }`}
                      >
                        كيلو
                      </button>
                      <button
                        type="button"
                        onClick={() => onUnitChange && onUnitChange(r.itemId, 'قطعة')}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          currentAuditUnit === 'قطعة'
                            ? 'bg-primary text-white font-black'
                            : 'text-on-surface-variant font-bold'
                        }`}
                      >
                        قطعة
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-1.5 rounded-lg bg-surface-lowest border border-outline-variant/20 flex justify-between">
                      <span className="text-on-surface-variant">الدفتري:</span>
                      <span className="font-black text-on-surface">{r.systemQty} {baseUnit}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-surface-lowest border border-outline-variant/20 flex justify-between">
                      <span className="text-on-surface-variant">الفارق:</span>
                      <span
                        className={`font-black ${
                          r.variance === 0
                            ? 'text-on-surface-variant'
                            : r.variance < 0
                            ? 'text-rose-700'
                            : 'text-emerald-600'
                        }`}
                      >
                        {r.variance > 0 ? `+${r.variance}` : r.variance} {baseUnit}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-surface-container/30">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onMarkItemMatched(r.itemId)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                          r.variance === 0 ? 'bg-emerald-600 text-white' : 'bg-surface-low text-on-surface-variant'
                        }`}
                      >
                        مطابق
                      </button>
                      <button
                        type="button"
                        onClick={() => onMarkItemZero(r.itemId)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                          r.actualQtyNum === 0 ? 'bg-rose-700 text-white' : 'bg-surface-low text-on-surface-variant'
                        }`}
                      >
                        غير موجود
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={r.inputQty !== undefined ? r.inputQty : r.actualQty}
                        onChange={(e) => onActualQtyChange(r.itemId, e.target.value)}
                        className="w-16 h-7 px-1.5 rounded-lg bg-surface-lowest border border-outline-variant/50 text-center font-mono font-black text-on-surface focus:border-primary outline-none text-xs"
                      />
                      <span className="text-[10px] font-bold text-on-surface-variant">{currentAuditUnit}</span>
                    </div>
                  </div>
                  {isUnitConverted && (
                    <div className="text-[10px] text-primary font-bold text-left font-mono">
                      يعادل: {r.actualQtyNum} {baseUnit}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default AX_StockAuditCategoryGroup
