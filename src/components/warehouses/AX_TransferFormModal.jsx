import React, { useState, useEffect, useMemo } from 'react'
import { ArrowLeftRight, X, Check, Save, AlertTriangle, Layers } from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { AX_TransferCategoryAccordionGroup } from './AX_TransferCategoryAccordion'
import { AX_TransferReviewModal } from './AX_TransferReviewModal'
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

  useEffect(() => {
    if (!isOpen) return
    try {
      const rawDraft = localStorage.getItem('ax_transfer_draft')
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft)
        if (parsed.fromId && warehouses.some((w) => w.id === parsed.fromId)) {
          setFromId(parsed.fromId)
        }
        if (parsed.toId && warehouses.some((w) => w.id === parsed.toId)) {
          setToId(parsed.toId)
        }
        if (parsed.operationalDate) {
          setOperationalDate(parsed.operationalDate)
        }
        if (parsed.selectedQuantities && typeof parsed.selectedQuantities === 'object') {
          setSelectedQuantities(parsed.selectedQuantities)
        }
        if (parsed.notes) {
          setNotes(parsed.notes)
        }
      }
    } catch {}
  }, [isOpen, warehouses])

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
    const grouped = {}
    selectedItemsList.forEach((it) => {
      const cat = it.primaryCategory
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(it)
    })
    return grouped
  }, [selectedItemsList])

  const totalSelectedCount = selectedItemsList.length
  const totalSelectedQty = selectedItemsList.reduce((sum, it) => sum + it.quantity, 0)

  const handleSaveDraft = () => {
    try {
      const draft = {
        id: `draft_trf_${Date.now()}`,
        type: 'transfer',
        fromId,
        toId,
        operationalDate,
        selectedQuantities,
        notes,
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem('ax_transfer_draft', JSON.stringify(draft))
      axToast.success('تم حفظ مسودة التحويل بنجاح')
    } catch {
      axToast.error('تعذر حفظ المسودة')
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

        try {
          localStorage.removeItem('ax_transfer_draft')
        } catch {}

        axToast.success(`تم تنفيذ وتأكيد التحويل المخزني [${res.transfer.code}] بنجاح`)
        setShowReviewModal(false)
        onClose()
      } else {
        axToast.error(res?.error || 'حدث خطأ أثناء تنفيذ التحويل')
      }
    } catch {
      axToast.error('فشل في تنفيذ التحويل المخزني')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

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
                <h3 className="text-base font-black text-on-surface">إنشاء إذن تحويل مخزني</h3>
                <p className="text-xs font-bold text-on-surface-variant">
                  اختيار الأصناف بالأقسام واعتماد فوري للأرصدة
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleOpenReview} className="flex-1 overflow-y-auto space-y-4 pr-1 overscroll-contain">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-30">
              <div className="relative z-20">
                <label className="block text-xs font-black text-on-surface mb-1">المحول منه</label>
                <AX_SearchableSelect
                  value={fromId}
                  onChange={setFromId}
                  options={allDestinations.map((d) => ({
                    value: d.id,
                    label: d.name,
                    badge: d.type === 'warehouse' ? 'مخزن' : 'موزع',
                  }))}
                  placeholder="اختر الجهة المحول منها..."
                />
              </div>

              <div className="relative z-10">
                <label className="block text-xs font-black text-on-surface mb-1">المستلم</label>
                <AX_SearchableSelect
                  value={toId}
                  onChange={setToId}
                  options={allDestinations
                    .filter((d) => d.id !== fromId)
                    .map((d) => ({
                      value: d.id,
                      label: d.name,
                      badge: d.type === 'warehouse' ? 'مخزن' : 'موزع',
                    }))}
                  placeholder="اختر المستلم..."
                />
              </div>
            </div>

            <div className="relative z-20">
              <label className="block text-xs font-black text-on-surface mb-1">تاريخ العملية</label>
              <AX_CompanyDatePicker
                value={operationalDate}
                onChange={setOperationalDate}
                placeholder="اختر تاريخ التحويل..."
              />
            </div>

            {liveDiscrepancy.isAuditDiscrepancy && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-bold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{liveDiscrepancy.auditDiscrepancyNote}</span>
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-surface-container">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-on-surface flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-primary" />
                    الأصناف المراد تحويلها
                  </span>
                  {totalSelectedCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-black font-mono">
                      {totalSelectedCount} صنف ({totalSelectedQty})
                    </span>
                  )}
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
