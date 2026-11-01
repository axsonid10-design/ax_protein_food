import React, { useState, useEffect } from 'react'
import { Plus, AlertTriangle } from 'lucide-react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_InvoiceItemsEditor } from './AX_InvoiceItemsEditor'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { generateUUID } from '../../utils/AX_UUID'

export function AX_CreateInvoiceModal({
  isOpen,
  onClose,
  items = [],
  warehouses = [],
  clients = [],
  suppliers = [],
  treasuryAccounts = [],
  onSave,
}) {
  useBodyScrollLock(isOpen)

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

  const [draftItem, setDraftItem] = useState({
    itemId: '',
    quantity: 1,
    price: 0,
  })

  const [expandedRowIndex, setExpandedRowIndex] = useState(null)

  const selectedItemIds = new Set(invForm.items.map((row) => row.itemId))
  const availableItems = items.filter((it) => !selectedItemIds.has(it.id))

  useEffect(() => {
    if (isOpen) {
      const initialWarehouseId = warehouses[0]?.id || ''
      const initialPartyName = clients[0]?.name || ''
      setInvForm({
        type: 'sale',
        partyName: initialPartyName,
        isCustomParty: false,
        warehouseId: initialWarehouseId,
        date: new Date().toISOString().split('T')[0],
        transportCost: '',
        loadingCost: '',
        items: [],
      })
      setPaymentStatus('unpaid')
      setPaidInput('')
      setSelectedTreasuryId(treasuryAccounts[0]?.id || '')
      setExpandedRowIndex(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (!availableItems.some((it) => it.id === draftItem.itemId)) {
      const next = availableItems[0]
      if (next) {
        setDraftItem({
          itemId: next.id,
          quantity: 1,
          price: invForm.type === 'sale' ? (next.sellPrice ?? 0) : (next.buyPrice ?? 0),
        })
      } else {
        setDraftItem({
          itemId: '',
          quantity: 1,
          price: 0,
        })
      }
    }
  }, [invForm.items, availableItems, invForm.type])

  if (!isOpen) return null

  const isPartyInList = (name) => {
    const list = invForm.type === 'sale' ? clients : suppliers
    return list.some((p) => p.name === name)
  }

  const handleTypeChange = (type) => {
    const list = type === 'sale' ? clients : suppliers
    setInvForm((prev) => ({ ...prev, type, partyName: list[0]?.name || '', isCustomParty: false }))
    const curItem = items.find((i) => i.id === draftItem.itemId)
    if (curItem) {
      setDraftItem((prev) => ({
        ...prev,
        price: type === 'sale' ? (curItem.sellPrice ?? 0) : (curItem.buyPrice ?? 0),
      }))
    }
  }

  const handleDraftItemChange = (field, value) => {
    const updated = { ...draftItem, [field]: value }
    if (field === 'itemId') {
      const selected = items.find((i) => i.id === value)
      if (selected) updated.price = invForm.type === 'sale' ? (selected.sellPrice ?? 0) : (selected.buyPrice ?? 0)
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
      price: next ? (invForm.type === 'sale' ? (next.sellPrice ?? 0) : (next.buyPrice ?? 0)) : 0,
    })
  }

  const handleRemoveItem = (idx) => {
    setInvForm({ ...invForm, items: invForm.items.filter((_, i) => i !== idx) })
    if (expandedRowIndex === idx) setExpandedRowIndex(null)
    else if (expandedRowIndex > idx) setExpandedRowIndex(expandedRowIndex - 1)
  }

  const handleItemRowChange = (idx, field, value) => {
    const updated = [...invForm.items]
    updated[idx] = { ...updated[idx], [field]: value }
    setInvForm({ ...invForm, items: updated })
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

    const sub = computeSubtotal()
    const tot = computeTotal()
    const partyName = invForm.partyName.trim()

    let paidAmt = 0
    if (paymentStatus === 'paid') paidAmt = tot
    else if (paymentStatus === 'partial') paidAmt = Math.min(tot, Math.max(0, Number(paidInput) || 0))
    const remAmt = Math.max(0, tot - paidAmt)
    const paymentTerms = paymentStatus === 'paid' ? 'مدفوع كلي' : paymentStatus === 'partial' ? 'مدفوع جزئي' : 'غير مدفوع'

    const newInv = {
      id: generateUUID(),
      code: `INV-${Date.now().toString().slice(-5)}`,
      type: invForm.type,
      partyName,
      isIncompleteData: !isPartyInList(partyName),
      date: invForm.date,
      warehouseId: invForm.warehouseId,
      items: invForm.items.map((it) => {
        const itemObj = items.find((i) => i.id === it.itemId)
        return {
          itemId: it.itemId,
          compositeName: itemObj?.compositeName || '',
          quantity: Number(it.quantity) || 0,
          unit: itemObj?.unitType || 'كرتونة',
          price: Number(it.price) || 0,
          total: (Number(it.quantity) || 0) * (Number(it.price) || 0),
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

  const partyList = invForm.type === 'sale' ? clients : suppliers
  const isIncomplete = invForm.partyName && !isPartyInList(invForm.partyName)
  const currentTotal = computeTotal()
  const currentPaid = paymentStatus === 'paid' ? currentTotal : paymentStatus === 'partial' ? Math.min(currentTotal, Number(paidInput) || 0) : 0
  const currentRemaining = Math.max(0, currentTotal - currentPaid)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overscroll-contain">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-lowest border-2 border-secondary/30 rounded-3xl p-6 shadow-level3 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain"
      >
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <span className="text-sm font-black text-on-surface flex items-center gap-2">
            <Plus className="w-4 h-4 text-secondary" />
            إنشاء فاتورة
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => handleTypeChange('sale')}
              className={`px-3.5 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                invForm.type === 'sale' ? 'bg-primary text-white shadow-sm' : 'bg-surface-low text-on-surface'
              }`}
            >
              فاتورة مبيعات
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('purchase')}
              className={`px-3.5 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                invForm.type === 'purchase' ? 'bg-secondary text-white shadow-sm' : 'bg-surface-low text-on-surface'
              }`}
            >
              فاتورة مشتريات
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface-variant">
                {invForm.type === 'sale' ? 'العميل' : 'المورد'}
              </label>
              {isIncomplete && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  بيانات ناقصة
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                required
                placeholder={invForm.type === 'sale' ? 'اكتب اسم العميل أو اختر...' : 'اكتب اسم المورد أو اختر...'}
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
                badge: w.type === 'main' ? 'رئيسي' : 'فرع',
              }))}
              placeholder="اختر المخزن..."
            />
          </div>
        </div>

        <AX_InvoiceItemsEditor
          items={items}
          availableItems={availableItems}
          invoiceItems={invForm.items}
          draftItem={draftItem}
          onDraftItemChange={handleDraftItemChange}
          onCommitDraftItem={handleCommitDraftItem}
          onRemoveItem={handleRemoveItem}
          onItemRowChange={handleItemRowChange}
          expandedRowIndex={expandedRowIndex}
          setExpandedRowIndex={setExpandedRowIndex}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-surface-container">
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block">مصاريف نقل وشحن</label>
            <input
              type="number"
              placeholder="0"
              value={invForm.transportCost}
              onChange={(e) => setInvForm({ ...invForm, transportCost: e.target.value })}
              className="w-full px-3 py-1.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block">مصاريف شيالة وعمالة</label>
            <input
              type="number"
              placeholder="0"
              value={invForm.loadingCost}
              onChange={(e) => setInvForm({ ...invForm, loadingCost: e.target.value })}
              className="w-full px-3 py-1.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-surface-container">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-on-surface-variant">حالة وسداد الفاتورة:</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentStatus('unpaid')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  paymentStatus === 'unpaid' ? 'bg-secondary text-white shadow-xs' : 'bg-surface-low text-on-surface'
                }`}
              >
                غير مدفوع
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('partial')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  paymentStatus === 'partial' ? 'bg-amber-600 text-white shadow-xs' : 'bg-surface-low text-on-surface'
                }`}
              >
                مدفوع جزئي
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('paid')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  paymentStatus === 'paid' ? 'bg-primary text-white shadow-xs' : 'bg-surface-low text-on-surface'
                }`}
              >
                مدفوع كلي
              </button>
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
    </div>
  )
}

export default AX_CreateInvoiceModal
