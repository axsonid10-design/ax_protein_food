import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  ClipboardCheck,
  Warehouse,
  User,
  Clock,
  CheckCircle2,
  Printer,
  Boxes,
  Layers,
  Search,
  CheckCheck,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_StockAuditCategoryGroup } from './AX_StockAuditCategoryGroup'
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
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('ALL')
  const [collapsedCategories, setCollapsedCategories] = useState({})

  const activeWh = warehouses.find((w) => w.id === activeWhId) || warehouses[0]

  const [auditRows, setAuditRows] = useState([])

  useEffect(() => {
    const whStockMap = {}
    inventoryStock
      .filter((s) => s.warehouseId === activeWhId)
      .forEach((s) => {
        whStockMap[s.itemId] = {
          quantity: Number(s.quantity) || 0,
          unit: s.unit,
        }
      })

    const initialRows = (items || []).map((it) => {
      const stockEntry = whStockMap[it.id]
      const sysQty = stockEntry ? stockEntry.quantity : 0
      return {
        itemId: it.id,
        itemName: it.compositeName || it.name || 'صنف',
        category: it.primaryCategory || 'أصناف عامة',
        unit: stockEntry?.unit || it.unitType || 'كرتونة',
        costPrice: Number(it.buyPrice) || 0,
        systemQty: sysQty,
        actualQty: sysQty,
      }
    })

    setAuditRows(initialRows)
  }, [activeWhId, inventoryStock, items])

  const handleActualQtyChange = (itemId, val) => {
    setAuditRows((prev) =>
      prev.map((r) => {
        if (r.itemId !== itemId) return r
        const num = val === '' ? '' : Number(val)
        return { ...r, actualQty: num }
      })
    )
  }

  const handleMarkItemZero = (itemId) => {
    setAuditRows((prev) =>
      prev.map((r) => (r.itemId === itemId ? { ...r, actualQty: 0 } : r))
    )
  }

  const handleMarkItemMatched = (itemId) => {
    setAuditRows((prev) =>
      prev.map((r) => (r.itemId === itemId ? { ...r, actualQty: r.systemQty } : r))
    )
  }

  const handleMarkCategoryMatched = (catName) => {
    setAuditRows((prev) =>
      prev.map((r) => (r.category === catName ? { ...r, actualQty: r.systemQty } : r))
    )
  }

  const handleMarkAllMatched = () => {
    setAuditRows((prev) =>
      prev.map((r) => ({ ...r, actualQty: r.systemQty }))
    )
  }

  const toggleCategoryExpand = (catName) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }))
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

  const categoriesList = useMemo(() => {
    const cats = new Set()
    auditRows.forEach((r) => cats.add(r.category || 'أصناف عامة'))
    return Array.from(cats)
  }, [auditRows])

  const groupedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const groups = {}

    calculatedStats.enrichedRows.forEach((row) => {
      if (selectedCategoryTab !== 'ALL' && row.category !== selectedCategoryTab) {
        return
      }
      if (q && !row.itemName.toLowerCase().includes(q) && !row.category.toLowerCase().includes(q)) {
        return
      }

      const cat = row.category || 'أصناف عامة'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(row)
    })

    return groups
  }, [calculatedStats.enrichedRows, selectedCategoryTab, searchQuery])

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
      notes: auditNotes.trim() || 'تسوية جردية دورية شاملة لكافة الأصناف',
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

  const totalFilteredCount = Object.values(groupedRows).reduce((s, g) => s + g.length, 0)

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
                محضر جرد مخزني تفصيلي بالأقسام
              </h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                حصر كافة الأصناف بالقسم والوحدة، وتحديد الفعلي والمطابق والعجز تلقائياً
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
              <span>طباعة</span>
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
              <span className="text-[10px] text-on-surface-variant block">إجمالي أصناف المنظومة</span>
              <span className="text-base font-black text-on-surface block font-mono">
                {calculatedStats.enrichedRows.length} صنف
              </span>
              <span className="text-[10px] text-emerald-600 block">
                {calculatedStats.matchedCount} مطابق دفترياً
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
                فائض: +{calculatedStats.totalSurplusCost.toLocaleString('en-US')} ج.م
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
                التأثير المالي على الأرباح
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                type="button"
                onClick={() => setSelectedCategoryTab('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategoryTab === 'ALL'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                كافة الأقسام ({items.length})
              </button>
              {categoriesList.map((cat) => {
                const count = auditRows.filter((r) => r.category === cat).length
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryTab(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategoryTab === cat
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-on-surface-variant absolute right-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="بحث باسم الصنف أو القسم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pr-8 pl-3 rounded-full bg-surface-low border border-outline-variant/40 text-xs text-on-surface outline-none w-48 sm:w-56"
                />
              </div>

              <button
                type="button"
                onClick={handleMarkAllMatched}
                className="px-3 py-1 rounded-full bg-surface-low hover:bg-primary/10 hover:text-primary border border-outline-variant/30 text-xs font-bold text-on-surface flex items-center gap-1 transition-all cursor-pointer"
                title="تحديد كل أصناف المخزن مطابقة للرصيد الدفتري"
              >
                <CheckCheck className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">الكل مطابق</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {totalFilteredCount === 0 ? (
              <div className="p-8 text-center text-on-surface-variant bg-surface-lowest border border-outline-variant/30 rounded-2xl font-bold">
                لا توجد أصناف مطابقة للبحث أو للقسم المختار.
              </div>
            ) : (
              Object.entries(groupedRows).map(([catName, catItems]) => (
                <AX_StockAuditCategoryGroup
                  key={catName}
                  category={catName}
                  items={catItems}
                  onActualQtyChange={handleActualQtyChange}
                  onMarkCategoryMatched={handleMarkCategoryMatched}
                  onMarkItemZero={handleMarkItemZero}
                  onMarkItemMatched={handleMarkItemMatched}
                  isExpanded={!collapsedCategories[catName]}
                  onToggleExpand={() => toggleCategoryExpand(catName)}
                />
              ))
            )}
          </div>

          <div className="space-y-1">
            <label className="text-on-surface block text-[11px]">ملاحظات وتوصيات لجنة الجرد:</label>
            <input
              type="text"
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              placeholder="اكتب أسباب العجز أو الفائض وتوصيات الحفظ..."
              className="w-full h-10 px-3.5 rounded-xl bg-surface-low border border-outline-variant/40 focus:border-primary text-xs font-bold text-on-surface outline-none"
            />
          </div>

          <div className="pt-3 border-t border-surface-container flex items-center justify-between">
            <div className="text-[11px] text-on-surface-variant font-bold">
              سيتم تعديل رصيد المخزن المعتمد فوراً ليتطابق مع العد الفعلي.
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

export default AX_StockAuditModal
