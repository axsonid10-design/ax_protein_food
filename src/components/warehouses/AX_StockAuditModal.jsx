import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  ClipboardCheck,
  Warehouse,
  User,
  Clock,
  CheckCircle2,
  Printer,
  Search,
  CheckCheck,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { AX_StockAuditCategoryGroup } from './AX_StockAuditCategoryGroup'
import { AX_StockAuditStatsBar } from './AX_StockAuditStatsBar'
import { AX_DraftsManagerBanner } from '../common/AX_DraftsManagerBanner'
import { useDrafts } from '../../hooks/useDrafts'
import { axToast } from '../../services/axToast'
import { generateUUID } from '../../utils/AX_UUID'
import {
  buildInitialAuditRows,
  calculateAuditStats,
  groupAuditRowsByCategory,
} from './stockAuditHelpers'

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

  const {
    drafts,
    activeDraftId,
    setActiveDraftId,
    autoSaveStatus,
    lastSavedAt,
    saveDraft,
    saveDraftDebounced,
    resumeDraft,
    deleteDraft,
    detachActiveDraft,
    discardActiveDraft,
  } = useDrafts('stock_audit')

  const [activeWhId, setActiveWhId] = useState(warehouseId || warehouses[0]?.id || 'wh-1')
  const [auditorName, setAuditorName] = useState(() => profile?.name || profile?.full_name || 'مسؤول الجرد والمخازن')
  const [auditDate, setAuditDate] = useState(() => new Date().toISOString().split('T')[0])
  const [auditNotes, setAuditNotes] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('ALL')
  const [collapsedCategories, setCollapsedCategories] = useState({})

  const activeWh = warehouses.find((w) => w.id === activeWhId) || warehouses[0]
  const [auditRows, setAuditRows] = useState([])

  useEffect(() => {
    if (isOpen && !activeDraftId) {
      setAuditDate(new Date().toISOString().split('T')[0])
    }
  }, [isOpen, activeDraftId])

  useEffect(() => {
    if (activeDraftId) return
    const initialRows = buildInitialAuditRows(items, inventoryStock, activeWhId)
    setAuditRows(initialRows)
  }, [activeWhId, inventoryStock, items, activeDraftId, isOpen])

  const handleActualQtyChange = (itemId, val) => {
    setAuditRows((prev) =>
      prev.map((r) => {
        if (r.itemId !== itemId) return r
        return { ...r, inputQty: val }
      })
    )
  }

  const handleUnitChange = (itemId, newUnit) => {
    setAuditRows((prev) =>
      prev.map((r) => {
        if (r.itemId !== itemId) return r
        return { ...r, auditUnit: newUnit }
      })
    )
  }

  const handleMarkItemZero = (itemId) => {
    setAuditRows((prev) =>
      prev.map((r) => (r.itemId === itemId ? { ...r, inputQty: 0, actualQty: 0 } : r))
    )
  }

  const handleMarkItemMatched = (itemId) => {
    setAuditRows((prev) =>
      prev.map((r) => (r.itemId === itemId ? { ...r, auditUnit: r.baseUnit || r.unit, inputQty: r.systemQty, actualQty: r.systemQty } : r))
    )
  }

  const handleMarkCategoryMatched = (catName) => {
    setAuditRows((prev) =>
      prev.map((r) => (r.category === catName ? { ...r, auditUnit: r.baseUnit || r.unit, inputQty: r.systemQty, actualQty: r.systemQty } : r))
    )
  }

  const handleMarkAllMatched = () => {
    setAuditRows((prev) =>
      prev.map((r) => ({ ...r, auditUnit: r.baseUnit || r.unit, inputQty: r.systemQty, actualQty: r.systemQty }))
    )
  }

  const toggleCategoryExpand = (catName) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }))
  }

  const calculatedStats = useMemo(() => calculateAuditStats(auditRows), [auditRows])

  useEffect(() => {
    if (isOpen && auditRows.length > 0) {
      const isDirty = auditRows.some((r) => r.actualQty !== r.systemQty) || auditNotes.trim() !== ''
      if (isDirty || activeDraftId) {
        const title = `جرد: ${activeWh?.name || 'المخزن'} (${calculatedStats.deficitCount + calculatedStats.surplusCount} فروقات)`
        const payload = {
          warehouseId: activeWhId,
          warehouseName: activeWh?.name,
          auditorName,
          auditDate,
          auditNotes,
          selectedCategoryTab,
          auditRows,
        }
        saveDraftDebounced(payload, title)
      }
    }
  }, [auditRows, auditNotes, auditDate, activeWhId, isOpen, activeDraftId, activeWh?.name, calculatedStats.deficitCount, calculatedStats.surplusCount, saveDraftDebounced, selectedCategoryTab, auditorName])

  const handleSelectDraft = (draft) => {
    const p = draft.payload || {}
    if (p.warehouseId) setActiveWhId(p.warehouseId)
    if (p.auditorName) setAuditorName(p.auditorName)
    if (p.auditDate) setAuditDate(p.auditDate)
    if (p.auditNotes) setAuditNotes(p.auditNotes)
    if (p.selectedCategoryTab) setSelectedCategoryTab(p.selectedCategoryTab)
    if (Array.isArray(p.auditRows) && p.auditRows.length > 0) {
      setAuditRows(p.auditRows)
    }
    resumeDraft(draft.id)
    axToast.success(`تم استئناف مسودة: ${draft.title}`)
  }

  const handleSaveCurrentDraft = async () => {
    try {
      const title = `جرد: ${activeWh?.name || 'المخزن'} (${calculatedStats.enrichedRows.length} صنف)`
      const payload = {
        warehouseId: activeWhId,
        warehouseName: activeWh?.name,
        auditorName,
        auditDate,
        auditNotes,
        selectedCategoryTab,
        auditRows,
      }
      await saveDraft(payload, title, activeDraftId || `audit_draft_${activeWhId}_${Date.now()}`)
      axToast.success('تم حفظ مسودة الجرد بنجاح')
    } catch {
      axToast.error('تعذر حفظ مسودة الجرد')
    }
  }

  const handleNewDraft = () => {
    detachActiveDraft()
    setAuditNotes('')
    axToast.info('تم بدء مسودة جرد جديدة وحفظ السابقة')
  }

  const categoriesList = useMemo(() => {
    const cats = new Set()
    auditRows.forEach((r) => cats.add(r.category || 'أصناف عامة'))
    return Array.from(cats)
  }, [auditRows])

  const groupedRows = useMemo(
    () => groupAuditRowsByCategory(calculatedStats.enrichedRows, selectedCategoryTab, searchQuery),
    [calculatedStats.enrichedRows, selectedCategoryTab, searchQuery]
  )

  if (!isOpen) return null

  const handleConfirmAudit = async (e) => {
    e.preventDefault()

    const sessionCode = `AUD-${Date.now().toString().slice(-4)}`
    const auditSession = {
      id: generateUUID(),
      code: sessionCode,
      warehouseId: activeWhId,
      warehouseName: activeWh?.name || 'المخزن',
      auditorName: auditorName.trim() || 'أمين المخزن',
      date: auditDate,
      operationalDate: auditDate,
      transactionDate: auditDate,
      auditDate: auditDate,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
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

    if (activeDraftId) {
      await discardActiveDraft()
    }

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
          <AX_DraftsManagerBanner
            type="stock_audit"
            drafts={drafts}
            activeDraftId={activeDraftId}
            autoSaveStatus={autoSaveStatus}
            lastSavedAt={lastSavedAt}
            onSelectDraft={handleSelectDraft}
            onDeleteDraft={deleteDraft}
            onNewDraft={handleNewDraft}
            onSaveCurrent={handleSaveCurrentDraft}
          />

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
                <span>تاريخ العملية (الجرد):</span>
              </label>
              <AX_CompanyDatePicker
                value={auditDate}
                onChange={setAuditDate}
                placeholder="اختر تاريخ الجرد..."
              />
            </div>
          </div>

          <AX_StockAuditStatsBar stats={calculatedStats} />

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
                  onUnitChange={handleUnitChange}
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
