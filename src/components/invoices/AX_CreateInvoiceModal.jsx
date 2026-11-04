import React, { useState, useEffect } from 'react'
import { Plus, AlertTriangle, RotateCcw } from 'lucide-react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { AX_InvoiceItemsEditor } from './AX_InvoiceItemsEditor'
import { AX_CustomerModal } from '../customers/AX_CustomerModal'
import { AX_SupplierModal } from '../suppliers/AX_SupplierModal'
import { axToast } from '../common/AX_Toast'
import { useAXStore } from '../../store/useAXStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { generateUUID } from '../../utils/AX_UUID'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'
import { getCartonEquivalent } from '../../utils/pricingCalculations'

export function AX_CreateInvoiceModal({
  isOpen, onClose, items = [], warehouses = [], clients = [],
  suppliers = [], treasuryAccounts = [], inventoryStock: propInventoryStock, onSave,
}) {
  useBodyScrollLock(isOpen, onClose)

  const storeInventoryStock = useAXStore((s) => s.inventoryStock) || []
  const inventoryStock = propInventoryStock || storeInventoryStock

  const [invForm, setInvForm] = useState({
    type: 'sale',
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
  const [selectedTreasuryId, setSelectedTreasuryId] = useState(treasuryAccounts[0]?.id || '')
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)

  const [draftItem, setDraftItem] = useState({ itemId: '', quantity: 1, price: 0 })
  const [expandedRowIndex, setExpandedRowIndex] = useState(null)

  const isSaleType = invForm.type === 'sale' || invForm.type === 'sale_return'
  const partyList = isSaleType ? clients : suppliers
  const selectedItemIds = new Set(invForm.items.map((row) => row.itemId))
  const availableItems = items.filter((it) => !selectedItemIds.has(it.id))

  const getItemStock = (itemId, whId = invForm.warehouseId) => {
    if (!whId || !itemId) return 0
    const row = (inventoryStock || []).find((s) => s.warehouseId === whId && s.itemId === itemId)
    return Number(row?.quantity) || 0
  }

  useEffect(() => {
    if (isOpen) {
      const initialWarehouseId = warehouses[0]?.id || ''
      const initialPartyName = clients[0]?.name || ''
      setInvForm({
        type: 'sale', partyName: initialPartyName, isCustomParty: false,
        warehouseId: initialWarehouseId, date: new Date().toISOString().split('T')[0],
        transportCost: '', loadingCost: '', items: [],
      })
      setPaymentStatus('unpaid')
      setPaidInput('')
      setSelectedTreasuryId(treasuryAccounts[0]?.id || '')
      setExpandedRowIndex(null)
      setShowCustomerModal(false)
      setShowSupplierModal(false)
    }
  }, [isOpen])

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
    const list = isNewTypeSale ? clients : suppliers
    setInvForm((prev) => ({ ...prev, type, partyName: list[0]?.name || '', isCustomParty: false }))
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
    if (invForm.type === 'sale') {
      const itObj = items.find((i) => i.id === draftItem.itemId)
      const avail = getItemStock(draftItem.itemId, invForm.warehouseId)
      const reqCartons = getCartonEquivalent(draftItem.quantity, draftItem.unit || itObj?.unitType || 'كرتونة', itObj)
      if (avail <= 0 || reqCartons > avail) {
        axToast.error('رصيد الصنف غير متاح في المخزن المحدد')
        return
      }
    }
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
    if (invForm.type === 'sale') {
      const itObj = items.find((i) => i.id === newItem.itemId)
      const avail = getItemStock(newItem.itemId, invForm.warehouseId)
      const reqCartons = getCartonEquivalent(newItem.quantity, newItem.unit || itObj?.unitType || 'كرتونة', itObj)
      if (avail <= 0 || reqCartons > avail) {
        axToast.error('رصيد الصنف غير متاح في المخزن المحدد')
        return
      }
    }
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
      if (prev.type === 'sale' && updates.quantity !== undefined) {
        const itemObj = items.find((i) => i.id === row.itemId)
        const unitToCheck = updates.unit || row.unit || itemObj?.unitType || 'كرتونة'
        const reqCartons = getCartonEquivalent(updates.quantity, unitToCheck, itemObj)
        const availCartons = getItemStock(row.itemId, prev.warehouseId)
        if (availCartons <= 0 || reqCartons > availCartons) {
          axToast.error('رصيد الصنف غير متاح في المخزن المحدد')
          return prev
        }
      }
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (invForm.items.length === 0) return

    if (invForm.type === 'sale') {
      for (const it of invForm.items) {
        const itemObj = items.find((i) => i.id === it.itemId)
        const avail = getItemStock(it.itemId, invForm.warehouseId)
        const req = getCartonEquivalent(it.quantity, it.unit || itemObj?.unitType || 'كرتونة', itemObj)
        if (avail <= 0 || req > avail) {
          axToast.error('رصيد الصنف غير متاح في المخزن المحدد')
          return
        }
      }
    }

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

    const newInv = {
      id: generateUUID(),
      code: `${codePrefix}-${Date.now().toString().slice(-5)}`,
      type: invForm.type,
      partyName,
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
        return {
          itemId: it.itemId,
          compositeName: getItemDisplayName(itemObj || it),
          quantity: q,
          unit: it.unit || itemObj?.unitType || 'كرتونة',
          price: p,
          total: q * p,
        }
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

    onSave(newInv)
    onClose()
  }

  const isIncomplete = invForm.partyName && !isPartyInList(invForm.partyName)
  const currentTotal = computeTotal()
  const currentPaid = paymentStatus === 'paid' ? currentTotal : paymentStatus === 'partial' ? Math.min(currentTotal, Number(paidInput) || 0) : 0
  const currentRemaining = Math.max(0, currentTotal - currentPaid)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overscroll-contain">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-lowest border-2 border-secondary/30 rounded-3xl p-5 sm:p-6 shadow-level3 max-w-3xl w-full space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-surface-container pb-3">
          <span className="text-sm font-black text-on-surface flex items-center gap-2">
            <Plus className="w-4 h-4 text-secondary" />
            إنشاء فاتورة جديدة
          </span>
          <div className="grid grid-cols-2 sm:flex gap-1.5 w-full sm:w-auto">
            {[
              ['sale', 'فاتورة مبيعات', 'bg-primary text-white shadow-xs'],
              ['purchase', 'فاتورة مشتريات', 'bg-secondary text-white shadow-xs'],
              ['sale_return', 'مردود مبيعات', 'bg-purple-700 text-white shadow-xs'],
              ['purchase_return', 'مردود مشتريات', 'bg-amber-600 text-white shadow-xs'],
            ].map(([id, label, activeBg]) => (
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
              <label className="text-xs font-bold text-on-surface-variant">
                {isSaleType ? 'العميل' : 'المورد'}
              </label>
              <div className="flex items-center gap-2">
                {isIncomplete && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    بيانات ناقصة
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => isSaleType ? setShowCustomerModal(true) : setShowSupplierModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-primary hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isSaleType ? 'إضافة عميل' : 'إضافة مورد'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                required
                placeholder={isSaleType ? 'اكتب اسم العميل أو اختر...' : 'اكتب اسم المورد أو اختر...'}
                value={invForm.partyName}
                onChange={(e) => setInvForm({ ...invForm, partyName: e.target.value })}
                className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                list="party-suggestions"
              />
              <datalist id="party-suggestions">
                {partyList.map((p) => (
                  <option key={p.id} value={p.name} />
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

        <div className="space-y-2 pt-2 border-t border-surface-container">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-on-surface-variant">حالة وسداد الفاتورة:</label>
            <div className="flex items-center gap-1.5">
              {[
                ['unpaid', 'غير مدفوع', 'bg-secondary text-white shadow-xs'],
                ['partial', 'مدفوع جزئي', 'bg-amber-600 text-white shadow-xs'],
                ['paid', 'مدفوع كلي', 'bg-primary text-white shadow-xs'],
              ].map(([st, label, activeBg]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPaymentStatus(st)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    paymentStatus === st ? activeBg : 'bg-surface-low text-on-surface'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {paymentStatus !== 'unpaid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {paymentStatus === 'partial' && (
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant block mb-1">المبلغ المدفوع (ج.م)</label>
                  <input
                    type="number"
                    min="1"
                    max={currentTotal}
                    placeholder="المبلغ المدفوع..."
                    value={paidInput}
                    onChange={(e) => setPaidInput(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono"
                  />
                </div>
              )}
              <div className={paymentStatus === 'paid' ? 'sm:col-span-2' : ''}>
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1">الخزينة المسدد بها</label>
                <AX_SearchableSelect
                  value={selectedTreasuryId || treasuryAccounts[0]?.id}
                  onChange={setSelectedTreasuryId}
                  options={treasuryAccounts.map((t) => ({ value: t.id, label: t.name, badge: `${(Number(t.balance) || 0).toLocaleString('en-US')} ج.م` }))}
                  placeholder="اختر الخزينة..."
                  searchable={false}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-surface-container">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[11px] text-on-surface-variant block font-bold">الإجمالي:</span>
              <span className="text-sm font-black font-mono text-primary">
                {currentTotal.toLocaleString('en-US')} ج.م
              </span>
            </div>
            {paymentStatus !== 'unpaid' && (
              <div>
                <span className="text-[11px] text-on-surface-variant block font-bold">المسدد:</span>
                <span className="text-sm font-black font-mono text-emerald-600">
                  {currentPaid.toLocaleString('en-US')} ج.م
                </span>
              </div>
            )}
            {paymentStatus === 'partial' && (
              <div>
                <span className="text-[11px] text-on-surface-variant block font-bold">المتبقي:</span>
                <span className="text-sm font-black font-mono text-error">
                  {currentRemaining.toLocaleString('en-US')} ج.م
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={invForm.items.length === 0}
              className="px-6 py-2 rounded-full bg-primary text-white text-xs font-extrabold shadow-sm hover:bg-primary-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              حفظ الفاتورة
            </button>
          </div>
        </div>
      </form>

      <AX_CustomerModal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} onSuccess={(c) => { setInvForm((prev) => ({ ...prev, partyName: c.name })); setShowCustomerModal(false) }} />
      <AX_SupplierModal isOpen={showSupplierModal} onClose={() => setShowSupplierModal(false)} onSuccess={(s) => { setInvForm((prev) => ({ ...prev, partyName: s.companyName || s.name })); setShowSupplierModal(false) }} />
    </div>
  )
}

export default AX_CreateInvoiceModal
