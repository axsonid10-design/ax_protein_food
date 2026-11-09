import React, { useState, useEffect, useMemo } from 'react'
import { Plus, AlertTriangle, RotateCcw, Printer } from 'lucide-react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { AX_InvoiceItemsEditor } from './AX_InvoiceItemsEditor'
import { AX_InvoicePaymentSection } from './AX_InvoicePaymentSection'
import { AX_CustomerModal } from '../customers/AX_CustomerModal'
import { AX_SupplierModal } from '../suppliers/AX_SupplierModal'
import { AX_InvoicePrintModal } from './AX_InvoicePrintModal'
import { axToast } from '../common/AX_Toast'
import { useAXStore } from '../../store/useAXStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { generateUUID } from '../../utils/AX_UUID'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'
import { getCartonEquivalent } from '../../utils/pricingCalculations'
import { getLocalTodayStr } from '../../utils/dateHelpers'
import { validateInvoiceItems } from './invoiceValidationHelper'

export function AX_CreateInvoiceModal({
  isOpen, onClose, items = [], warehouses = [], clients = [], suppliers = [], treasuryAccounts = [], inventoryStock: propInventoryStock, onSave, defaultType = 'sale', lockGroup = null,
}) {
  useBodyScrollLock(isOpen, onClose)

  const profile = useAXStore((s) => s.profile)
  const storeInventoryStock = useAXStore((s) => s.inventoryStock) || []
  const inventoryStock = propInventoryStock || storeInventoryStock
  const userBranchId = profile?.branchId || profile?.branch_id
  const defaultWarehouseId = (userBranchId && warehouses.some((w) => w.id === userBranchId)) ? userBranchId : (warehouses[0]?.id || '')

  const [invForm, setInvForm] = useState({
    type: defaultType || 'sale', partyName: clients[0]?.name || '', isCustomParty: false,
    warehouseId: defaultWarehouseId, date: getLocalTodayStr(), transportCost: '', loadingCost: '', items: [],
  })

  const [paymentStatus, setPaymentStatus] = useState('unpaid'), [paidInput, setPaidInput] = useState('')
  const [discountType, setDiscountType] = useState('none'), [discountValue, setDiscountValue] = useState('')
  const [partyKind, setPartyKind] = useState(() => (defaultType === 'purchase' || defaultType === 'purchase_return' ? 'supplier' : 'customer'))
  const [selectedTreasuryId, setSelectedTreasuryId] = useState(treasuryAccounts[0]?.id || '')
  const [showCustomerModal, setShowCustomerModal] = useState(false), [showSupplierModal, setShowSupplierModal] = useState(false)
  const [previewInvoice, setPreviewInvoice] = useState(null), [isPostSavePrint, setIsPostSavePrint] = useState(false)
  const [isSaving, setIsSaving] = useState(false), [validationError, setValidationError] = useState(null)
  const [draftItem, setDraftItem] = useState({ itemId: '', quantity: 1, price: 0 }), [expandedRowIndex, setExpandedRowIndex] = useState(null)

  const isSaleType = invForm.type === 'sale' || invForm.type === 'sale_return'
  const partyList = partyKind === 'customer' ? clients : suppliers
  const selectedItemIds = new Set(invForm.items.map((row) => row.itemId))
  const availableItems = items.filter((it) => !selectedItemIds.has(it.id))

  const typeButtons = useMemo(() => {
    if (lockGroup === 'sales') return [['sale', 'فاتورة مبيعات', 'bg-primary text-white shadow-xs'], ['sale_return', 'مردود مبيعات', 'bg-purple-700 text-white shadow-xs']]
    if (lockGroup === 'purchases') return [['purchase', 'فاتورة مشتريات', 'bg-secondary text-white shadow-xs'], ['purchase_return', 'مردود مشتريات', 'bg-amber-600 text-white shadow-xs']]
    return [
      ['sale', 'فاتورة مبيعات', 'bg-primary text-white shadow-xs'],
      ['purchase', 'فاتورة مشتريات', 'bg-secondary text-white shadow-xs'],
      ['sale_return', 'مردود مبيعات', 'bg-purple-700 text-white shadow-xs'],
      ['purchase_return', 'مردود مشتريات', 'bg-amber-600 text-white shadow-xs'],
    ]
  }, [lockGroup])

  const getItemStock = (itemId, whId = invForm.warehouseId) => {
    if (!whId || !itemId) return 0
    const row = (inventoryStock || []).find((s) => s.warehouseId === whId && s.itemId === itemId)
    return Number(row?.quantity) || 0
  }

  useEffect(() => {
    if (isOpen) {
      const initialWarehouseId = defaultWarehouseId
      const resType = defaultType || 'sale'
      const initPartyKind = resType === 'purchase' || resType === 'purchase_return' ? 'supplier' : 'customer'
      const initPartyName = initPartyKind === 'customer' ? (clients[0]?.name || '') : (suppliers[0]?.companyName || suppliers[0]?.name || '')
      setInvForm({
        type: resType, partyName: initPartyName, isCustomParty: false,
        warehouseId: initialWarehouseId, date: getLocalTodayStr(), transportCost: '', loadingCost: '', items: [],
      })
      setPartyKind(initPartyKind); setPaymentStatus('unpaid'); setPaidInput(''); setDiscountType('none'); setDiscountValue('')
      setSelectedTreasuryId(treasuryAccounts[0]?.id || ''); setExpandedRowIndex(null)
      setShowCustomerModal(false); setShowSupplierModal(false); setPreviewInvoice(null); setIsPostSavePrint(false); setValidationError(null)
    }
  }, [isOpen, defaultType, defaultWarehouseId])

  useEffect(() => {
    if (!availableItems.some((it) => it.id === draftItem.itemId)) {
      const next = availableItems[0]
      if (next) {
        setDraftItem({
          itemId: next.id,
          quantity: 1,
          unit: next.unitType || 'كرتونة',
          price: isSaleType ? (next.sellPrice ?? 0) : (next.buyPrice ?? 0),
        })
      } else {
        setDraftItem({ itemId: '', quantity: 1, price: 0, unit: 'كرتونة' })
      }
    }
  }, [invForm.items, availableItems, isSaleType])

  if (!isOpen) return null

  const isPartyInList = (name) => partyList.some((p) => p.name === name)

  const handleTypeChange = (type) => {
    const isNewTypeSale = type === 'sale' || type === 'sale_return'
    const newKind = isNewTypeSale ? 'customer' : 'supplier'
    setPartyKind(newKind)
    const list = newKind === 'customer' ? clients : suppliers
    setInvForm((prev) => ({ ...prev, type, partyName: list[0]?.name || list[0]?.companyName || '', isCustomParty: false }))
    const curItem = items.find((i) => i.id === draftItem.itemId)
    if (curItem) {
      setDraftItem((prev) => ({
        ...prev,
        price: isNewTypeSale ? (curItem.sellPrice ?? 0) : (curItem.buyPrice ?? 0),
      }))
    }
  }

  const handleDraftItemChange = (fieldOrUpdates, value) => {
    setDraftItem((prev) => {
      const updates = typeof fieldOrUpdates === 'object' && fieldOrUpdates !== null
        ? fieldOrUpdates
        : { [fieldOrUpdates]: value }
      const updated = { ...prev, ...updates }
      if (updates.itemId) {
        const selected = items.find((i) => i.id === updates.itemId)
        if (selected) {
          updated.price = isSaleType ? (selected.sellPrice ?? 0) : (selected.buyPrice ?? 0)
          updated.unit = selected.unitType || 'كرتونة'
        }
      }
      return updated
    })
  }

  const handleCommitDraftItem = () => {
    if (!draftItem.itemId || Number(draftItem.quantity) <= 0) return
    const curObj = items.find((i) => i.id === draftItem.itemId)
    const committedItem = { ...draftItem, unit: draftItem.unit || curObj?.unitType || 'كرتونة' }
    const newItems = [committedItem, ...invForm.items]
    setInvForm({ ...invForm, items: newItems })
    const newSelected = new Set(newItems.map((r) => r.itemId))
    const nextAvail = items.filter((it) => !newSelected.has(it.id))
    const next = nextAvail[0]
    setDraftItem({
      itemId: next?.id || '', quantity: 1, unit: next?.unitType || 'كرتونة',
      price: next ? (isSaleType ? (next.sellPrice ?? 0) : (next.buyPrice ?? 0)) : 0,
    })
    setValidationError(null)
  }

  const handleDirectAddItem = (newItem) => {
    setInvForm((prev) => ({ ...prev, items: [newItem, ...prev.items] }))
    setValidationError(null)
  }

  const handleRemoveItem = (idx) => {
    setInvForm({ ...invForm, items: invForm.items.filter((_, i) => i !== idx) })
    if (expandedRowIndex === idx) setExpandedRowIndex(null)
    else if (expandedRowIndex > idx) setExpandedRowIndex(expandedRowIndex - 1)
    setValidationError(null)
  }

  const handleItemRowChange = (idx, fieldOrUpdates, value) => {
    setInvForm((prev) => {
      const row = prev.items[idx]
      if (!row) return prev
      const updates = typeof fieldOrUpdates === 'object' && fieldOrUpdates !== null ? fieldOrUpdates : { [fieldOrUpdates]: value }
      const updated = [...prev.items]
      updated[idx] = { ...updated[idx], ...updates }
      return { ...prev, items: updated }
    })
    setValidationError(null)
  }

  const computeSubtotal = () => invForm.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0)

  const computeDiscountAmount = (sub = computeSubtotal()) => {
    const val = Number(discountValue) || 0
    if (val <= 0 || discountType === 'none') return 0
    if (discountType === 'percent') return Math.round(((sub * Math.min(100, Math.max(0, val))) / 100) * 100) / 100
    return Math.min(sub, Math.max(0, val))
  }

  const computeTotal = () => {
    const sub = computeSubtotal()
    return Math.max(0, sub - computeDiscountAmount(sub)) + (Number(invForm.transportCost) || 0) + (Number(invForm.loadingCost) || 0)
  }

  const buildInvoicePayload = (isDraft = false) => {
    const sub = computeSubtotal(), discAmt = computeDiscountAmount(sub), tot = computeTotal()
    const partyName = invForm.partyName.trim()
    let paidAmt = paymentStatus === 'paid' ? tot : paymentStatus === 'partial' ? Math.min(tot, Math.max(0, Number(paidInput) || 0)) : 0
    const remAmt = Math.max(0, tot - paidAmt)
    let paymentTerms = paymentStatus === 'paid' ? 'مدفوع كلي' : paymentStatus === 'partial' ? 'مدفوع جزئي' : 'غير مدفوع'
    if (invForm.type === 'sale_return') paymentTerms = 'مردود مبيعات'
    if (invForm.type === 'purchase_return') paymentTerms = 'مردود مشتريات'

    const codePrefix = { sale_return: 'RET-SALE', purchase_return: 'RET-PUR', purchase: 'PUR' }[invForm.type] || 'INV'
    const matchedParty = partyList.find((p) => (p.name || '').trim() === partyName || (p.companyName || '').trim() === partyName)

    return {
      id: generateUUID(),
      code: isDraft ? `DRAFT-${Date.now().toString().slice(-4)}` : `${codePrefix}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      type: invForm.type, partyType: partyKind, partyKind, partyId: matchedParty?.id || null,
      partyName: partyName || 'مسودة غير محددة', isIncompleteData: !isPartyInList(partyName),
      date: invForm.date, operationalDate: invForm.date, transactionDate: invForm.date,
      createdAt: new Date().toISOString(), created_at: new Date().toISOString(),
      warehouseId: invForm.warehouseId,
      items: invForm.items.map((it) => {
        const itemObj = items.find((i) => i.id === it.itemId)
        const q = Number(it.quantity) || 0, p = Number(it.price) || 0
        return { itemId: it.itemId, compositeName: getItemDisplayName(itemObj || it), quantity: q, unit: it.unit || itemObj?.unitType || 'كرتونة', price: p, total: q * p }
      }),
      transportCost: Number(invForm.transportCost) || 0, loadingCost: Number(invForm.loadingCost) || 0,
      subtotal: sub, discountType, discountValue: Number(discountValue) || 0, discountAmount: discAmt,
      total: tot, paidAmount: paidAmt, remainingAmount: remAmt, status: paymentStatus, paymentTerms,
      treasuryId: selectedTreasuryId || treasuryAccounts[0]?.id || null,
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (invForm.items.length === 0 || isSaving) return

    const validation = validateInvoiceItems(invForm.items, items, { invType: invForm.type })
    if (!validation.isValid) {
      axToast.error(validation.error)
      setValidationError(validation.error)
      return
    }
    setValidationError(null)

    setIsSaving(true)
    try {
      const newInv = buildInvoicePayload(false)
      const res = await onSave(newInv)
      if (res && res.success === false) {
        axToast.error(res.error || 'فشل حفظ الفاتورة، يرجى المحاولة ثانية')
        setIsSaving(false)
        return
      }
      axToast.success(`تم حفظ الفاتورة [${newInv.code}] بنجاح`)
      setPreviewInvoice(newInv)
      setIsPostSavePrint(true)
    } catch {
      axToast.error('حدث خطأ أثناء حفظ الفاتورة')
    } finally {
      setIsSaving(false)
    }
  }

  const isIncomplete = invForm.partyName && !isPartyInList(invForm.partyName)
  const currentTotal = computeTotal()
  const currentPaid = paymentStatus === 'paid' ? currentTotal : paymentStatus === 'partial' ? Math.min(currentTotal, Number(paidInput) || 0) : 0
  const currentRemaining = Math.max(0, currentTotal - currentPaid)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overscroll-contain">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-lowest border-2 border-secondary/30 rounded-none sm:rounded-3xl p-4 sm:p-6 shadow-level3 w-full h-full sm:h-auto sm:max-w-6xl lg:max-w-7xl max-h-[100dvh] sm:max-h-[95vh] flex flex-col space-y-4 overflow-y-auto overscroll-contain mobile-form-zoom"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-surface-container pb-3">
          <span className="text-sm font-black text-on-surface flex items-center gap-2">
            <Plus className="w-4 h-4 text-secondary" />
            إنشاء فاتورة جديدة
          </span>
          <div className="grid grid-cols-2 sm:flex gap-1.5 w-full sm:w-auto">
            {typeButtons.map(([id, label, activeBg]) => (
              <button
                key={id}
                type="button"
                onClick={() => handleTypeChange(id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black transition-all cursor-pointer text-center ${
                  invForm.type === id ? activeBg : 'bg-surface-low text-on-surface'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-on-surface-variant">الطرف:</span>
                <div className="inline-flex rounded-full bg-surface-low p-0.5 border border-outline-variant/30">
                  <button type="button" onClick={() => { setPartyKind('customer'); setInvForm((prev) => ({ ...prev, partyName: clients[0]?.name || '' })); }} className={`px-2.5 py-0.5 rounded-full text-[11px] font-black transition-all cursor-pointer ${partyKind === 'customer' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}>
                    عميل
                  </button>
                  <button type="button" onClick={() => { setPartyKind('supplier'); setInvForm((prev) => ({ ...prev, partyName: suppliers[0]?.companyName || suppliers[0]?.name || '' })); }} className={`px-2.5 py-0.5 rounded-full text-[11px] font-black transition-all cursor-pointer ${partyKind === 'supplier' ? 'bg-secondary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}>
                    مورد
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isIncomplete && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    بيانات ناقصة
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => (partyKind === 'customer' ? setShowCustomerModal(true) : setShowSupplierModal(true))}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-primary hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{partyKind === 'customer' ? 'إضافة عميل' : 'إضافة مورد'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                required
                placeholder={partyKind === 'customer' ? 'اكتب اسم العميل أو اختر...' : 'اكتب اسم المورد أو اختر...'}
                value={invForm.partyName}
                onChange={(e) => setInvForm({ ...invForm, partyName: e.target.value })}
                className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                list="party-suggestions"
              />
              <datalist id="party-suggestions">
                {partyList.map((p) => (
                  <option key={p.id} value={p.name || p.companyName} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant block">مخزن الصرف / التوريد</label>
            <AX_SearchableSelect
              value={invForm.warehouseId}
              onChange={(val) => setInvForm({ ...invForm, warehouseId: val })}
              options={warehouses.map((w) => ({
                value: w.id,
                label: w.name,
                badge: w.type === 'cold_store' ? 'تبريد' : w.type === 'van' ? 'سيارة' : 'مخزن',
              }))}
              placeholder="اختر المخزن..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant block">تاريخ الفاتورة</label>
            <AX_CompanyDatePicker
              value={invForm.date}
              onChange={(val) => setInvForm((prev) => ({ ...prev, date: val }))}
            />
          </div>
        </div>

        <AX_InvoiceItemsEditor
          items={items} availableItems={availableItems} invoiceItems={invForm.items}
          invType={invForm.type} warehouseId={invForm.warehouseId} inventoryStock={inventoryStock}
          getItemStock={getItemStock} draftItem={draftItem}
          onDraftItemChange={handleDraftItemChange} onCommitDraftItem={handleCommitDraftItem}
          onAddItem={handleDirectAddItem} onRemoveItem={handleRemoveItem}
          onItemRowChange={handleItemRowChange} expandedRowIndex={expandedRowIndex}
          setExpandedRowIndex={setExpandedRowIndex}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-surface-container">
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block">مصاريف نقل وشحن</label>
            <input type="number" placeholder="0" value={invForm.transportCost} onChange={(e) => setInvForm({ ...invForm, transportCost: e.target.value })} className="w-full px-3 py-1.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block">مصاريف شيالة وعمالة</label>
            <input type="number" placeholder="0" value={invForm.loadingCost} onChange={(e) => setInvForm({ ...invForm, loadingCost: e.target.value })} className="w-full px-3 py-1.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono" />
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-surface-low/60 border border-outline-variant/20 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-on-surface-variant">الخصم التجاري / النقدي:</span>
            <div className="inline-flex rounded-full bg-surface-lowest p-0.5 border border-outline-variant/30 text-[11px] font-bold">
              {[
                ['none', 'بدون خصم'],
                ['fixed', 'خصم مبلغ (ج.م)'],
                ['percent', 'خصم نسبة (%)'],
              ].map(([t, lbl]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setDiscountType(t)
                    if (t === 'none') setDiscountValue('')
                  }}
                  className={`px-3 py-1 rounded-full font-black cursor-pointer transition-all ${
                    discountType === t ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {discountType !== 'none' && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percent' ? 100 : computeSubtotal()}
                  placeholder={discountType === 'percent' ? 'النسبة المئوية (مثال: 5)...' : 'المبلغ بالجنيه...'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface font-mono"
                />
              </div>
              <div className="text-xs font-bold font-mono text-emerald-700 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 shrink-0">
                قيمة الخصم: -{computeDiscountAmount().toLocaleString('en-US')} ج.م
              </div>
            </div>
          )}
        </div>

        <AX_InvoicePaymentSection
          paymentStatus={paymentStatus} setPaymentStatus={setPaymentStatus}
          paidInput={paidInput} setPaidInput={setPaidInput}
          selectedTreasuryId={selectedTreasuryId} setSelectedTreasuryId={setSelectedTreasuryId}
          treasuryAccounts={treasuryAccounts} currentTotal={currentTotal}
          currentPaid={currentPaid} currentRemaining={currentRemaining}
          subtotal={computeSubtotal()}
          discountAmount={computeDiscountAmount()}
          discountType={discountType}
          discountValue={Number(discountValue) || 0}
        />

        {validationError && (
          <div role="alert" className="flex items-center gap-2 p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-bold animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}

        <div className="flex items-center justify-end pt-2 border-t border-surface-container gap-2">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold cursor-pointer">
            إلغاء
          </button>
          <button
            type="button"
            disabled={invForm.items.length === 0}
            onClick={() => { setPreviewInvoice(buildInvoicePayload(true)); setIsPostSavePrint(false); }}
            className="px-4 py-2 rounded-full bg-surface-low border border-outline-variant/30 text-on-surface hover:bg-surface-container text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            title="معاينة شكل الفاتورة قبل الحفظ"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span>معاينة الفاتورة</span>
          </button>
          <button
            type="submit"
            disabled={invForm.items.length === 0 || isSaving}
            className="px-6 py-2 rounded-full bg-primary text-white text-xs font-extrabold shadow-sm hover:bg-primary-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
          </button>
        </div>
      </form>

      <AX_CustomerModal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} onSuccess={(c) => { setPartyKind('customer'); setInvForm((prev) => ({ ...prev, partyName: c.name })); setShowCustomerModal(false) }} />
      <AX_SupplierModal isOpen={showSupplierModal} onClose={() => setShowSupplierModal(false)} onSuccess={(s) => { setPartyKind('supplier'); setInvForm((prev) => ({ ...prev, partyName: s.companyName || s.name })); setShowSupplierModal(false) }} />
      <AX_InvoicePrintModal
        invoice={previewInvoice}
        isOpen={Boolean(previewInvoice)}
        onClose={() => {
          setPreviewInvoice(null)
          if (isPostSavePrint) {
            setIsPostSavePrint(false)
            onClose()
          }
        }}
      />
    </div>
  )
}

export default AX_CreateInvoiceModal
