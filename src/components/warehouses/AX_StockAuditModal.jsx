import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  ClipboardCheck,
  Warehouse,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Printer,
  Boxes,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { generateUUID } from '../../utils/AX_UUID'

export function AX_StockAuditModal({
  isOpen,
  onClose,
  warehouseId,
  warehouses = [],
  items = [],
  inventoryStock = [],
}) {
  useBodyScrollLock(isOpen)

  const { profile, applyStockAudit, addNotification } = useAXStore()

  const [activeWhId, setActiveWhId] = useState(warehouseId || warehouses[0]?.id || 'wh-1')
  const [auditorName, setAuditorName] = useState(() => profile?.name || profile?.full_name || 'مسؤول الجرد والمخازن')
  const [auditDate, setAuditDate] = useState(() => new Date().toISOString().slice(0, 16).replace('T', ' '))
  const [auditNotes, setAuditNotes] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const activeWh = warehouses.find((w) => w.id === activeWhId) || warehouses[0]

  const itemsMap = useMemo(() => {
    const map = {}
    items.forEach((it) => {
      map[it.id] = it
    })
    return map
  }, [items])

  const [auditRows, setAuditRows] = useState([])

  useEffect(() => {
    const whStock = inventoryStock.filter((s) => s.warehouseId === activeWhId)

    const initialRows = whStock.map((s) => {
      const it = itemsMap[s.itemId] || { id: s.itemId, compositeName: 'صنف', buyPrice: 0 }
      const sysQty = Number(s.quantity) || 0
      return {
        itemId: s.itemId,
        itemName: it.compositeName || it.name || 'صنف',
        unit: s.unit || it.unitType || 'كرتونة',
        costPrice: Number(it.buyPrice) || 0,
        systemQty: sysQty,
        actualQty: sysQty,
      }
    })

    setAuditRows(initialRows)
  }, [activeWhId, inventoryStock, itemsMap])

  const handleActualQtyChange = (itemId, val) => {
    setAuditRows((prev) =>
      prev.map((r) => {
        if (r.itemId !== itemId) return r
        const num = val === '' ? '' : Number(val)
        return {
          ...r,
          actualQty: num,
        }
      })
    )
  }

  const calculatedStats = useMemo(() => {
    let matchedCount = 0
    let deficitCount = 0
    let surplusCount = 0
    let totalDeficitCost = 0
    let totalSurplusCost = 0

    const enrichedRows = auditRows.map((r) => {
      const actual = r.actualQty === '' ? 0 : Number(r.actualQty)
      const variance = actual - r.systemQty
      const varianceCost = variance * r.costPrice

      let status = 'matched'
      if (variance < 0) {
        status = 'deficit'
        deficitCount += 1
        totalDeficitCost += Math.abs(varianceCost)
      } else if (variance > 0) {
        status = 'surplus'
        surplusCount += 1
        totalSurplusCost += varianceCost
      } else {
        matchedCount += 1
      }

      return {
        ...r,
        actualQtyNum: actual,
        variance,
        varianceCost,
        status,
      }
    })

    const netVarianceCost = totalSurplusCost - totalDeficitCost

    return {
      enrichedRows,
      matchedCount,
      deficitCount,
      surplusCount,
      totalDeficitCost,
      totalSurplusCost,
      netVarianceCost,
    }
  }, [auditRows])

  const filteredEnrichedRows = useMemo(() => {
    if (!searchQuery.trim()) return calculatedStats.enrichedRows
    const q = searchQuery.trim().toLowerCase()
    return calculatedStats.enrichedRows.filter((r) => r.itemName.toLowerCase().includes(q))
  }, [calculatedStats.enrichedRows, searchQuery])

  if (!isOpen) return null

  const handleConfirmAudit = (e) => {
    e.preventDefault()

    const sessionCode = `AUD-${Date.now().toString().slice(-4)}`
    const auditSession = {
      id: generateUUID(),
      code: sessionCode,
      warehouseId: activeWhId,
      warehouseName: activeWh?.name || 'المخزن',
      auditorName: auditorName.trim() || 'أمين المخزن',
      date: auditDate,
      itemsCount: calculatedStats.enrichedRows.length,
      deficitsCount: calculatedStats.deficitCount,
      surplusesCount: calculatedStats.surplusCount,
      totalVarianceCost: calculatedStats.netVarianceCost,
      notes: auditNotes.trim() || 'تسوية جردية دورية',
      status: 'approved',
      items: calculatedStats.enrichedRows,
    }

    const adjustedStocks = calculatedStats.enrichedRows.map((r) => ({
      warehouseId: activeWhId,
      itemId: r.itemId,
      actualQty: r.actualQtyNum,
      unit: r.unit,
    }))

    applyStockAudit({ session: auditSession, adjustedStocks })

    if (addNotification) {
      addNotification({
        title: 'اعتماد محضر جرد مخزني',
        message: `تم اعتماد جرد ${activeWh?.name} برقم ${sessionCode} وتسوية الأرصدة فوراً.`,
        type: 'audit',
        targetTab: 'warehouses',
      })
    }

    onClose()
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden overscroll-contain">
        <div className="flex items-center justify-between p-4 border-b border-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-on-surface">
                محضر جرد مخزني وتسوية فعلية
              </h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                حصر الفعلي والدفتري، قياس العجز والزيادة، وتحديث الأرصدة تلقائياً
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-full bg-surface-low hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة المحضر</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleConfirmAudit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs font-bold">
          <div className="p-3.5 rounded-2xl bg-surface-low border border-outline-variant/30 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-on-surface flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-primary" />
                <span>المخزن المراد جرده:</span>
              </label>
              <AX_SearchableSelect
                value={activeWhId}
                onChange={setActiveWhId}
                options={warehouses.map((w) => ({ value: w.id, label: w.name, badge: w.type === 'main' ? 'رئيسي' : 'فرع' }))}
                searchable={false}
              />
            </div>

            <div className="space-y-1">
              <label className="text-on-surface flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>المسؤول القائم بالجرد:</span>
              </label>
              <input
                type="text"
                required
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                placeholder="اسم القائم بالجرد..."
                className="w-full h-10 px-3 rounded-xl bg-surface-lowest border border-outline-variant/40 focus:border-primary text-xs font-bold text-on-surface outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-on-surface flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>تاريخ ووقت الجرد:</span>
              </label>
              <input
                type="text"
                value={auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-lowest border border-outline-variant/40 focus:border-primary text-xs font-mono font-bold text-on-surface outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-0.5">
              <span className="text-[10px] text-on-surface-variant block">الأصناف المجرودة</span>
              <span className="text-base font-black text-on-surface block font-mono">
                {calculatedStats.enrichedRows.length} صنف
              </span>
              <span className="text-[10px] text-emerald-600 block">
                {calculatedStats.matchedCount} صنف مطابق 100%
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-0.5">
              <span className="text-[10px] text-on-surface-variant block">حالات العجز (نقص)</span>
              <span className="text-base font-black text-rose-700 block font-mono">
                {calculatedStats.deficitCount} أصناف
              </span>
              <span className="text-[10px] text-rose-700 block font-mono">
                خسارة: -{calculatedStats.totalDeficitCost.toLocaleString('en-US')} ج.م
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-0.5">
              <span className="text-[10px] text-on-surface-variant block">حالات الفائض (زيادة)</span>
              <span className="text-base font-black text-emerald-600 block font-mono">
                {calculatedStats.surplusCount} أصناف
              </span>
              <span className="text-[10px] text-emerald-700 block font-mono">
                قيمة: +{calculatedStats.totalSurplusCost.toLocaleString('en-US')} ج.م
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-0.5">
              <span className="text-[10px] text-on-surface-variant block">صافي الفارق المالي</span>
              <span
                className={`text-base font-black block font-mono ${
                  calculatedStats.netVarianceCost >= 0 ? 'text-primary' : 'text-rose-700'
                }`}
              >
                {calculatedStats.netVarianceCost.toLocaleString('en-US')} ج.م
              </span>
              <span className="text-[10px] text-on-surface-variant block">
                تأثير التسوية على الأرباح
              </span>
            </div>
          </div>

          <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-3 border-b border-surface-container flex items-center justify-between">
              <span className="text-xs font-black text-on-surface">جدول تدقيق ومقارنة الأرصدة:</span>
              <input
                type="text"
                placeholder="تصفية باسم الصنف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 px-3 rounded-full bg-surface-low border border-outline-variant/40 text-xs text-on-surface outline-none w-48"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-surface-low border-b border-surface-container text-on-surface-variant font-black h-10">
                    <th className="px-3 whitespace-nowrap">اسم الصنف</th>
                    <th className="px-3 whitespace-nowrap text-center">الوحدة</th>
                    <th className="px-3 whitespace-nowrap text-center">الرصيد الدفتري</th>
                    <th className="px-3 whitespace-nowrap text-center">الرصيد الفعلي (العد)</th>
                    <th className="px-3 whitespace-nowrap text-center">الفارق</th>
                    <th className="px-3 whitespace-nowrap text-center">الحالة</th>
                    <th className="px-3 whitespace-nowrap text-left">قيمة الفارق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container/60 font-bold">
                  {filteredEnrichedRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-on-surface-variant">
                        لا توجد أصناف مسجلة في هذا المخزن
                      </td>
                    </tr>
                  ) : (
                    filteredEnrichedRows.map((r) => (
                      <tr key={r.itemId} className="hover:bg-surface-low/40 transition-colors h-11">
                        <td className="px-3 font-black text-on-surface max-w-[200px] truncate">
                          {r.itemName}
                        </td>
                        <td className="px-3 text-center text-on-surface-variant text-[11px] whitespace-nowrap">
                          {r.unit}
                        </td>
                        <td className="px-3 text-center font-mono text-on-surface-variant whitespace-nowrap">
                          {r.systemQty}
                        </td>
                        <td className="px-3 text-center whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={r.actualQty}
                            onChange={(e) => handleActualQtyChange(r.itemId, e.target.value)}
                            className="w-20 h-8 px-2 rounded-lg bg-surface-low border border-outline-variant/50 text-center font-mono font-black text-on-surface focus:border-primary outline-none"
                          />
                        </td>
                        <td className="px-3 text-center font-mono font-black whitespace-nowrap">
                          <span
                            className={
                              r.variance === 0
                                ? 'text-on-surface-variant'
                                : r.variance < 0
                                ? 'text-rose-700'
                                : 'text-emerald-600'
                            }
                          >
                            {r.variance > 0 ? `+${r.variance}` : r.variance}
                          </span>
                        </td>
                        <td className="px-3 text-center whitespace-nowrap">
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
                              ? '-'
                              : `${r.varianceCost > 0 ? '+' : ''}${r.varianceCost.toLocaleString('en-US')} ج.م`}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-on-surface block text-[11px]">ملاحظات وقرار لجنة الجرد:</label>
            <input
              type="text"
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              placeholder="اكتب أسباب العجز أو الزيادة أو توصيات الجرد..."
              className="w-full h-10 px-3.5 rounded-xl bg-surface-low border border-outline-variant/40 focus:border-primary text-xs font-bold text-on-surface outline-none"
            />
          </div>

          <div className="pt-3 border-t border-surface-container flex items-center justify-between">
            <div className="text-[11px] text-on-surface-variant font-bold">
              سيتم تعديل أرصدة المخزن المعتمدة فوراً لتتطابق مع العد الفعلي.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full border border-outline-variant/50 text-xs font-bold text-on-surface hover:bg-surface-low transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد الجرد وتسوية الأرصدة</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
