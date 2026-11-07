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

export function AX_CreateInvoiceModal({
  isOpen, onClose, items = [], warehouses = [], clients = [],
  suppliers = [], treasuryAccounts = [], inventoryStock: propInventoryStock, onSave,
  defaultType = 'sale', lockGroup = null,
}) {
  useBodyScrollLock(isOpen, onClose)

  const storeInventoryStock = useAXStore((s) => s.inventoryStock) || []
  const inventoryStock = propInventoryStock || storeInventoryStock

  const [invForm, setInvForm] = useState({
    type: defaultType || 'sale',
    partyName: clients[0]?.name || '',
    isCustomParty: false,
    warehouseId: warehouses[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    transportCost: '',
    loadingCost: '',
    items: [],
  })

  const [paymentStatus, setPaymentStatus] = useState('unpaid')
  const [paidInput, setPaidInput] = useState('')
  const [partyKind, setPartyKind] = useState(() => (defaultType === 'purchase' || defaultType === 'purchase_return' ? 'supplier' : 'customer'))
  const [selectedTreasuryId, setSelectedTreasuryId] = useState(treasuryAccounts[0]?.id || '')
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [previewInvoice, setPreviewInvoice] = useState(null)
  const [isPostSavePrint, setIsPostSavePrint] = useState(false)

  const [draftItem, setDraftItem] = useState({ itemId: '', quantity: 1, price: 0 })
  const [expandedRowIndex, setExpandedRowIndex] = useState(null)

  const isSaleType = invForm.type === 'sale' || invForm.type === 'sale_return'
  const partyList = partyKind === 'customer' ? clients : suppliers
  const selectedItemIds = new Set(invForm.items.map((row) => row.itemId))
  const availableItems = items.filter((it) => !selectedItemIds.has(it.id))

  const typeButtons = useMemo(() => {
    if (lockGroup === 'sales') {
      return [
        ['sale', 'فاتورة مبيعات', 'bg-primary text-white shadow-xs'],
        ['sale_return', 'مردود مبيعات', 'bg-purple-700 text-white shadow-xs'],
      ]
    }
    if (lockGroup === 'purchases') {
      return [
        ['purchase', 'فاتورة مشتريات', 'bg-secondary text-white shadow-xs'],
        ['purchase_return', 'مردود مشتريات', 'bg-amber-600 text-white shadow-xs'],
      ]
    }
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
      const initialWarehouseId = warehouses[0]?.id || ''
      const resType = defaultType || 'sale'
      const initPartyKind = resType === 'purchase' || resType === 'purchase_return' ? 'supplier' : 'customer'
      const initPartyName = initPartyKind === 'customer' ? (clients[0]?.name || '') : (suppliers[0]?.companyName || suppliers[0]?.name || '')
      setInvForm({
        type: resType, partyName: initPartyName, isCustomParty: false,
        warehouseId: initialWarehouseId, date: new Date().toISOString().split('T')[0],
        transportCost: '', loadingCost: '', items: [],
      })
      setPartyKind(initPartyKind)
      setPaymentStatus('unpaid')
      setPaidInput('')
      setSelectedTreasuryId(treasuryAccounts[0]?.id || '')
      setExpandedRowIndex(null)
      setShowCustomerModal(false)
      setShowSupplierModal(false)
      setPreviewInvoice(null)
      setIsPostSavePrint(false)
    }
  }, [isOpen, defaultType])

  useEffect(() => {
    if (!availableItems.some((it) => it.id === draftItem.itemId)) {
      const next = availableItems[0]
      if (next) {
        setDraftItem({
          itemId: next.id,
          quantity: 1,
          price: isSaleType ? (next.sellPrice ?? 0) : (next.buyPrice ?? 0),
        })
      } else {
        setDraftItem({ itemId: '', quantity: 1, price: 0 })
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

  const handleDraftItemChange = (field, value) => {
    const updated = { ...draftItem, [field]: value }
    if (field === 'itemId') {
      const selected = items.find((i) => i.id === value)
      if (selected) updated.price = isSaleType ? (selected.sellPrice ?? 0) : (selected.buyPrice ?? 0)
    }
    setDraftItem(updated)
  }

  const handleCommitDraftItem = () => {
    if (!draftItem.itemId || Number(draftItem.quantity) <= 0) return
    const newItems = [draftItem, ...invForm.items]
    setInvForm({ ...invForm, items: newItems })
    const newSelected = new Set(newItems.map((r) => r.itemId))
    const nextAvail = items.filter((it) => !newSelected.has(it.id))
    const next = nextAvail[0]
    setDraftItem({
      itemId: next?.id || '',
      quantity: 1,
      price: next ? (isSaleType ? (next.sellPrice ?? 0) : (next.buyPrice ?? 0)) : 0,
    })
  }

  const handleDirectAddItem = (newItem) => {
    setInvForm((prev) => ({
      ...prev,
      items: [newItem, ...prev.items],
    }))
  }

  const handleRemoveItem = (idx) => {
    setInvForm({ ...invForm, items: invForm.items.filter((_, i) => i !== idx) })
    if (expandedRowIndex === idx) setExpandedRowIndex(null)
    else if (expandedRowIndex > idx) setExpandedRowIndex(expandedRowIndex - 1)
  }

  const handleItemRowChange = (idx, fieldOrUpdates, value) => {
    setInvForm((prev) => {
      const row = prev.items[idx]
      if (!row) return prev
      const updates = typeof fieldOrUpdates === 'object' && fieldOrUpdates !== null
        ? fieldOrUpdates
        : { [fieldOrUpdates]: value }
      const updated = [...prev.items]
      updated[idx] = { ...updated[idx], ...updates }
      return { ...prev, items: updated }
    })
  }

  const computeSubtotal = () => {
    return invForm.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0)
  }

  const computeTotal = () => {
    return computeSubtotal() + (Number(invForm.transportCost) || 0) + (Number(invForm.loadingCost) || 0)
  }

  const buildInvoicePayload = (isDraft = false) => {
    const sub = computeSubtotal()
    const tot = computeTotal()
    const partyName = invForm.partyName.trim()

    let paidAmt = 0
    if (paymentStatus === 'paid') paidAmt = tot
    else if (paymentStatus === 'partial') paidAmt = Math.min(tot, Math.max(0, Number(paidInput) || 0))
    const remAmt = Math.max(0, tot - paidAmt)

    let paymentTerms = paymentStatus === 'paid' ? 'مدفوع كلي' : paymentStatus === 'partial' ? 'مدفوع جزئي' : 'غير مدفوع'
    if (invForm.type === 'sale_return') paymentTerms = 'مردود مبيعات'
    if (invForm.type === 'purchase_return') paymentTerms = 'مردود مشتريات'

    const codePrefix = { sale_return: 'RET-SALE', purchase_return: 'RET-PUR', purchase: 'PUR' }[invForm.type] || 'INV'

    return {
      id: generateUUID(),
      code: isDraft ? `DRAFT-${Date.now().toString().slice(-4)}` : `${codePrefix}-${Date.now().toString().slice(-5)}`,
      type: invForm.type,
      partyType: partyKind,
      partyKind,
      partyName: partyName || 'مسودة غير محددة',
      isIncompleteData: !isPartyInList(partyName),
      date: invForm.date,
      operationalDate: invForm.date,
      transactionDate: invForm.date,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      warehouseId: invForm.warehouseId,
      items: invForm.items.map((it) => {
        const itemObj = items.find((i) => i.id === it.itemId)
        const q = Number(it.quantity) || 0, p = Number(it.price) || 0
        return { itemId: it.itemId, compositeName: getItemDisplayName(itemObj || it), quantity: q, unit: it.unit || itemObj?.unitType || 'كرتونة', price: p, total: q * p }
      }),
      transportCost: Number(invForm.transportCost) || 0,
      loadingCost: Number(invForm.loadingCost) || 0,
      subtotal: sub,
      total: tot,
      paidAmount: paidAmt,
      remainingAmount: remAmt,
      status: paymentStatus,
      paymentTerms,
      treasuryId: selectedTreasuryId || treasuryAccounts[0]?.id || null,
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (invForm.items.length === 0) return

    const newInv = buildInvoicePayload(false)
    onSave(newInv)
    setPreviewInvoice(newInv)
    setIsPostSavePrint(true)
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
                  <button
                    type="button"
                    onClick={() => {
                      setPartyKind('customer')
                      setInvForm((prev) => ({ ...prev, partyName: clients[0]?.name || '' }))
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                      partyKind === 'customer'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    عميل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPartyKind('supplier')
                      setInvForm((prev) => ({ ...prev, partyName: suppliers[0]?.companyName || suppliers[0]?.name || '' }))
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                      partyKind === 'supplier'
                        ? 'bg-secondary text-white shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
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
          items={items}
          availableItems={availableItems}
          invoiceItems={invForm.items}
          invType={invForm.type}
          warehouseId={invForm.warehouseId}
          inventoryStock={inventoryStock}
          getItemStock={getItemStock}
          draftItem={draftItem}
          onDraftItemChange={handleDraftItemChange}
          onCommitDraftItem={handleCommitDraftItem}
          onAddItem={handleDirectAddItem}
          onRemoveItem={handleRemoveItem}
          onItemRowChange={handleItemRowChange}
          expandedRowIndex={expandedRowIndex}
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

        <AX_InvoicePaymentSection
          paymentStatus={paymentStatus}
          setPaymentStatus={setPaymentStatus}
          paidInput={paidInput}
          setPaidInput={setPaidInput}
          selectedTreasuryId={selectedTreasuryId}
          setSelectedTreasuryId={setSelectedTreasuryId}
          treasuryAccounts={treasuryAccounts}
          currentTotal={currentTotal}
          currentPaid={currentPaid}
          currentRemaining={currentRemaining}
        />

        <div className="flex items-center justify-end pt-2 border-t border-surface-container gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={invForm.items.length === 0}
            onClick={() => {
              const draft = buildInvoicePayload(true)
              setPreviewInvoice(draft)
              setIsPostSavePrint(false)
            }}
            className="px-4 py-2 rounded-full bg-surface-low border border-outline-variant/30 text-on-surface hover:bg-surface-container text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            title="معاينة شكل الفاتورة قبل الحفظ"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span>معاينة الفاتورة</span>
          </button>
          <button
            type="submit"
            disabled={invForm.items.length === 0}
            className="px-6 py-2 rounded-full bg-primary text-white text-xs font-extrabold shadow-sm hover:bg-primary-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            حفظ الفاتورة
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
