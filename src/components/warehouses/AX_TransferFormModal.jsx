import React, { useState, useEffect, useMemo } from 'react'
import { ArrowLeftRight, X, Check, Save, AlertTriangle, Layers } from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { AX_TransferCategoryAccordionGroup } from './AX_TransferCategoryAccordion'
import { AX_TransferReviewModal } from './AX_TransferReviewModal'
import { AX_TransferPrintModal } from './AX_TransferPrintModal'
import { AX_DraftsManagerBanner } from '../common/AX_DraftsManagerBanner'
import { useDrafts } from '../../hooks/useDrafts'
import { checkTransferAuditDiscrepancy, executeImmediateTransfer } from '../../store/transferHelpers'
import { axToast } from '../../services/axToast'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

export function AX_TransferFormModal({ isOpen, onClose }) {
  useBodyScrollLock(isOpen)

  const warehouses = useAXStore((state) => state.warehouses) || []
  const items = useAXStore((state) => state.items) || []
  const inventoryStock = useAXStore((state) => state.inventoryStock) || []
  const stockAudits = useAXStore((state) => state.stockAudits) || []
  const profile = useAXStore((state) => state.profile)

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
  } = useDrafts('transfer')

  const allDestinations = useMemo(
    () =>
      warehouses.map((w) => ({
        id: w.id,
        name: w.name,
        type: w.type === 'van' ? 'distributor' : 'warehouse',
        badge:
          w.type === 'van'
            ? 'سيارة توزيع'
            : w.type === 'main'
            ? 'رئيسي'
            : w.type === 'cold_store'
            ? 'تجميد'
            : 'فرع',
        manager: w.manager || '',
      })),
    [warehouses]
  )

  const [fromId, setFromId] = useState(warehouses[0]?.id || '')
  const [toId, setToId] = useState(warehouses[1]?.id || '')
  const [operationalDate, setOperationalDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedQuantities, setSelectedQuantities] = useState({})
  const [notes, setNotes] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdTransferForPrint, setCreatedTransferForPrint] = useState(null)

  useEffect(() => {
    if (isOpen && !activeDraftId) {
      setOperationalDate(new Date().toISOString().split('T')[0])
    }
  }, [isOpen, activeDraftId])

  const handleSelectDraft = (draft) => {
    const p = draft.payload || {}
    if (p.fromId && warehouses.some((w) => w.id === p.fromId)) {
      setFromId(p.fromId)
    }
    if (p.toId && warehouses.some((w) => w.id === p.toId)) {
      setToId(p.toId)
    }
    if (p.operationalDate) {
      setOperationalDate(p.operationalDate)
    }
    if (p.selectedQuantities && typeof p.selectedQuantities === 'object') {
      setSelectedQuantities(p.selectedQuantities)
    }
    if (p.notes) {
      setNotes(p.notes)
    }
    resumeDraft(draft.id)
    axToast.success(`تم استئناف مسودة: ${draft.title}`)
  }

  const handleNewDraft = () => {
    detachActiveDraft()
    setSelectedQuantities({})
    setNotes('')
    axToast.info('تم بدء مسودة جديدة وحفظ السابقة')
  }

  useEffect(() => {
    if (!isOpen) return
    const hasItems = Object.keys(selectedQuantities).length > 0
    if (!hasItems && !notes.trim() && !activeDraftId) return

    const fromWh = warehouses.find((w) => w.id === fromId)?.name || 'المخزن'
    const toWh = warehouses.find((w) => w.id === toId)?.name || 'المخزن'
    const itemCount = Object.keys(selectedQuantities).length
    const title = `تحويل: من ${fromWh} إلى ${toWh} (${itemCount} أصناف)`
    const payload = {
      fromId,
      toId,
      operationalDate,
      selectedQuantities,
      notes,
    }
    saveDraftDebounced(payload, title)
  }, [fromId, toId, operationalDate, selectedQuantities, notes, isOpen, activeDraftId, warehouses, saveDraftDebounced])

  const handleQuantityChange = (itemId, quantity, unit, itemRef) => {
    setSelectedQuantities((prev) => {
      const copy = { ...prev }
      if (quantity <= 0) {
        delete copy[itemId]
      } else {
        copy[itemId] = {
          quantity,
          unit: unit || 'كرتونة',
          itemName: itemRef?.compositeName || itemRef?.name || '',
          primaryCategory: itemRef?.primaryCategory || 'أصناف عامة',
        }
      }
      return copy
    })
  }

  const liveDiscrepancy = checkTransferAuditDiscrepancy(
    { fromId, toId, date: operationalDate },
    stockAudits,
    warehouses
  )

  const selectedItemsList = useMemo(() => {
    return Object.keys(selectedQuantities)
      .map((itemId) => {
        const sel = selectedQuantities[itemId]
        const it = items.find((i) => i.id === itemId)
        return {
          itemId,
          quantity: Number(sel.quantity) || 0,
          unit: sel.unit || it?.unitType || 'كرتونة',
          itemName: sel.itemName || it?.compositeName || it?.name || 'صنف',
          primaryCategory: sel.primaryCategory || it?.primaryCategory || 'أصناف عامة',
        }
      })
      .filter((it) => it.quantity > 0)
  }, [selectedQuantities, items])

  const selectedItemsGrouped = useMemo(() => {
    const groups = {}
    selectedItemsList.forEach((it) => {
      const cat = it.primaryCategory || 'أصناف عامة'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(it)
    })
    return groups
  }, [selectedItemsList])

  const totalSelectedCount = selectedItemsList.length
  const totalSelectedQty = selectedItemsList.reduce((sum, it) => sum + it.quantity, 0)

  const handleSaveDraft = async () => {
    try {
      const fromWh = warehouses.find((w) => w.id === fromId)?.name || 'المخزن'
      const toWh = warehouses.find((w) => w.id === toId)?.name || 'المخزن'
      const itemCount = Object.keys(selectedQuantities).length
      const title = `تحويل: من ${fromWh} إلى ${toWh} (${itemCount} أصناف)`
      const payload = {
        fromId,
        toId,
        operationalDate,
        selectedQuantities,
        notes,
      }
      await saveDraft(payload, title, activeDraftId || `transfer_draft_${Date.now()}`)
      axToast.success('تم حفظ مسودة التحويل بنجاح')
    } catch {
      axToast.error('تعذر حفظ مسودة التحويل')
    }
  }

  const handleOpenReview = (e) => {
    e.preventDefault()
    if (!fromId || !toId || fromId === toId) {
      axToast.error('يرجى اختيار مخزن مصدر ومخزن مستلم مختلفين')
      return
    }

    if (selectedItemsList.length === 0) {
      axToast.error('يرجى اختيار صنف واحد على الأقل وتحديد الكمية')
      return
    }

    setShowReviewModal(true)
  }

  const handleConfirmImmediateTransfer = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const fromObj = allDestinations.find((d) => d.id === fromId)
      const toObj = allDestinations.find((d) => d.id === toId)

      const payload = {
        fromWarehouseId: fromId,
        toWarehouseId: toId,
        fromWarehouse: fromObj,
        toWarehouse: toObj,
        operationalDate,
        items: selectedItemsList,
        notes,
        userId: profile?.id || null,
        userName: profile?.name || 'مدير المنظومة',
      }

      const res = await executeImmediateTransfer(payload, {
        stockAudits,
        warehouses,
        inventoryStock,
      })

      if (res?.success) {
        useAXStore.setState((state) => ({
          transfers: [res.transfer, ...state.transfers],
          inventoryStock: res.updatedStock,
        }))

        if (activeDraftId) {
          await discardActiveDraft()
        }
        try {
          localStorage.removeItem('ax_transfer_draft')
        } catch {}

        axToast.success(`تم تنفيذ وتأكيد التحويل المخزني [${res.transfer.code}] بنجاح`)
        setShowReviewModal(false)
        setCreatedTransferForPrint(res.transfer)
      } else {
        axToast.error(res?.error || 'حدث خطأ أثناء تنفيذ التحويل')
      }
    } catch {
      axToast.error('فشل في تنفيذ التحويل المخزني')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen && !createdTransferForPrint) return null

  if (createdTransferForPrint) {
    return (
      <AX_TransferPrintModal
        isOpen={Boolean(createdTransferForPrint)}
        transfer={createdTransferForPrint}
        onClose={() => {
          setCreatedTransferForPrint(null)
          onClose()
        }}
      />
    )
  }

  const fromWarehouseObj = allDestinations.find((d) => d.id === fromId)
  const toWarehouseObj = allDestinations.find((d) => d.id === toId)

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overscroll-contain">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-3xl w-full shadow-level3 space-y-4 max-h-[92vh] flex flex-col overscroll-contain">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-primary/10 text-primary">
                <ArrowLeftRight className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-on-surface">إجراء تحويل بضاعة بين المخازن والفروع</h3>
                <p className="text-xs font-bold text-on-surface-variant">تحويل أرصدة أصناف فورية من مستودع لآخر</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleOpenReview} className="space-y-4 flex-1 overflow-y-auto pr-1">
            <AX_DraftsManagerBanner
              type="transfer"
              drafts={drafts}
              activeDraftId={activeDraftId}
              autoSaveStatus={autoSaveStatus}
              lastSavedAt={lastSavedAt}
              onSelectDraft={handleSelectDraft}
              onDeleteDraft={deleteDraft}
              onNewDraft={handleNewDraft}
              onSaveCurrent={handleSaveDraft}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-on-surface mb-1">من مخزن / فرع (المصدر):</label>
                <AX_SearchableSelect
                  value={fromId}
                  onChange={(val) => setFromId(val)}
                  options={allDestinations.map((d) => ({
                    value: d.id,
                    label: d.name,
                    badge: d.badge,
                  }))}
                  placeholder="اختر المخزن المصدر..."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-on-surface mb-1">إلى مخزن / سيارة / فرع (المستلم):</label>
                <AX_SearchableSelect
                  value={toId}
                  onChange={(val) => setToId(val)}
                  options={allDestinations
                    .filter((d) => d.id !== fromId)
                    .map((d) => ({
                      value: d.id,
                      label: d.name,
                      badge: d.badge,
                    }))}
                  placeholder="اختر المخزن المستلم..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-on-surface mb-1">تاريخ التحويل والتشغيل:</label>
                <AX_CompanyDatePicker
                  value={operationalDate}
                  onChange={(val) => setOperationalDate(val)}
                />
              </div>

              <div className="flex items-end">
                <div className="w-full p-2.5 rounded-2xl bg-surface-low border border-outline-variant/30 flex items-center justify-between text-xs">
                  <span className="font-bold text-on-surface-variant">إجمالي الأصناف المحددة:</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-black font-mono">
                      {totalSelectedCount} صنف
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-black font-mono">
                      {totalSelectedQty.toLocaleString('en-US')} كرتونة/وحدة
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {liveDiscrepancy.hasAuditDiscrepancy && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>تنبيه: يوجد محضر جرد سابق في المخزن المستلم بتأريخ أحدث من تاريخ التحويل.</span>
                </div>
                <p className="text-[11px] font-normal leading-relaxed text-amber-800 dark:text-amber-300">
                  سيتم التحويل بأمان تام وإضافة الرصيد إلى المخزن المستلم دون أن يتسبب في تصفير أو انخفاض رصيد البضائع الحالية.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>أصناف التحويل حسب الأقسام (اختر الأقسام وحدد الكميات):</span>
                </label>
                <div className="text-[11px] font-bold text-on-surface-variant">
                  {totalSelectedCount} أصناف مختارة ({totalSelectedQty} إجمالي)
                </div>
              </div>

              <AX_TransferCategoryAccordionGroup
                items={items}
                inventoryStock={inventoryStock}
                fromWarehouseId={fromId}
                selectedQuantities={selectedQuantities}
                onQuantityChange={handleQuantityChange}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-on-surface mb-1">ملاحظات التحويل</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="سبب التحويل أو رقم الإذن أو بوليصة الشحن..."
                className="w-full px-3 py-2.5 rounded-2xl bg-surface-low border border-outline-variant/40 text-on-surface text-xs font-bold focus:border-primary focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-surface-container flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-outline-variant/60 text-on-surface text-xs font-bold hover:bg-surface-container active:scale-95 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 text-secondary" />
                <span>حفظ كمسودة</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-full border border-outline-variant/40 text-on-surface-variant text-xs font-bold hover:bg-surface-low active:scale-95 transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={totalSelectedCount === 0}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>تم التحويل ومراجعة الأصناف</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <AX_TransferReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onBackToEdit={() => setShowReviewModal(false)}
        onConfirmImmediate={handleConfirmImmediateTransfer}
        fromWarehouse={fromWarehouseObj}
        toWarehouse={toWarehouseObj}
        operationalDate={operationalDate}
        notes={notes}
        selectedItemsGrouped={selectedItemsGrouped}
        isSubmitting={isSubmitting}
      />
    </>
  )
}

export default AX_TransferFormModal
