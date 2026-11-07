import React, { useState, useEffect } from 'react'
import { Edit3, X, AlertTriangle, Printer, RotateCcw } from 'lucide-react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { AX_InvoiceItemsEditor } from './AX_InvoiceItemsEditor'
import { AX_InvoicePaymentSection } from './AX_InvoicePaymentSection'
import { AX_InvoicePrintModal } from './AX_InvoicePrintModal'
import { axToast } from '../common/AX_Toast'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'

export function AX_EditInvoiceModal({
  isOpen,
  onClose,
  invoice,
  items = [],
  warehouses = [],
  clients = [],
  suppliers = [],
  treasuryAccounts = [],
  inventoryStock = [],
  onSave,
}) {
  useBodyScrollLock(isOpen, onClose)

  const [invForm, setInvForm] = useState({
    type: 'sale',
    partyName: '',
    warehouseId: '',
    date: '',
    transportCost: '',
    loadingCost: '',
    items: [],
  })

  const [partyKind, setPartyKind] = useState('customer')
  const [paymentStatus, setPaymentStatus] = useState('unpaid')
  const [paidInput, setPaidInput] = useState('')
  const [selectedTreasuryId, setSelectedTreasuryId] = useState('')
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [draftItem, setDraftItem] = useState({ itemId: '', quantity: 1, price: 0 })
  const [expandedRowIndex, setExpandedRowIndex] = useState(null)

  useEffect(() => {
    if (invoice && isOpen) {
      const isCust = invoice.partyKind ? invoice.partyKind === 'customer' : (invoice.type === 'sale' || invoice.type === 'sale_return')
      setPartyKind(isCust ? 'customer' : 'supplier')
      setInvForm({
        type: invoice.type || 'sale',
        partyName: invoice.partyName || '',
        warehouseId: invoice.warehouseId || warehouses[0]?.id || '',
        date: invoice.date || invoice.operationalDate || new Date().toISOString().split('T')[0],
        transportCost: invoice.transportCost || '',
        loadingCost: invoice.loadingCost || '',
        items: Array.isArray(invoice.items) ? invoice.items.map((it) => ({ ...it })) : [],
      })
      const paid = Number(invoice.paidAmount) || 0
      const total = Number(invoice.total) || 0
      setPaidInput(paid > 0 ? String(paid) : '')
      setPaymentStatus(paid >= total && total > 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid'))
      setSelectedTreasuryId(invoice.treasuryId || treasuryAccounts[0]?.id || '')
      setDraftItem({ itemId: '', quantity: 1, price: 0 })
      setExpandedRowIndex(null)
    }
  }, [invoice, isOpen, warehouses, treasuryAccounts])

  if (!isOpen || !invoice) return null

  const isSaleType = invForm.type === 'sale' || invForm.type === 'sale_return'
  const partyList = partyKind === 'customer' ? clients : suppliers
  const selectedItemIds = new Set(invForm.items.map((row) => row.itemId))
  const availableItems = items.filter((it) => !selectedItemIds.has(it.id))

  const subtotal = invForm.items.reduce((sum, row) => sum + (Number(row.total) || 0), 0)
  const transportVal = Number(invForm.transportCost) || 0
  const loadingVal = Number(invForm.loadingCost) || 0
  const total = subtotal + transportVal + loadingVal

  const paidAmount = paymentStatus === 'paid'
    ? total
    : paymentStatus === 'partial'
    ? Math.min(Number(paidInput) || 0, total)
    : 0

  const remainingAmount = Math.max(0, total - paidAmount)

  const handleUpdateItem = (index, field, value) => {
    setInvForm((prev) => {
      const nextItems = [...prev.items]
      const current = { ...nextItems[index], [field]: value }
      const qty = Number(field === 'quantity' ? value : current.quantity) || 0
      const prc = Number(field === 'price' ? value : current.price) || 0
      current.total = qty * prc
      nextItems[index] = current
      return { ...prev, items: nextItems }
    })
  }

  const handleRemoveItem = (index) => {
    setInvForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }))
  }

  const handleAddDraftItem = () => {
    if (!draftItem.itemId || Number(draftItem.quantity) <= 0) {
      axToast.error('يرجى اختيار الصنف وتحديد الكمية بشكل صحيح')
      return
    }
    const it = items.find((i) => i.id === draftItem.itemId)
    if (!it) return
    const rowPrice = Number(draftItem.price) || (isSaleType ? Number(it.sellPrice || 0) : Number(it.buyPrice || 0))
    const rowQty = Number(draftItem.quantity) || 1
    const newItem = {
      itemId: it.id,
      name: getItemDisplayName(it),
      quantity: rowQty,
      price: rowPrice,
      total: rowQty * rowPrice,
      unit: it.unitType || 'كرتونة',
      weightPerCarton: it.weightPerCarton || 0,
      piecesPerCarton: it.piecesPerCarton || 0,
    }
    setInvForm((prev) => ({
      ...prev,
      items: [newItem, ...prev.items],
    }))
    setDraftItem({ itemId: '', quantity: 1, price: 0 })
    setExpandedRowIndex(null)
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!invForm.partyName.trim()) {
      axToast.error('يرجى اختيار أو إدخال الطرف')
      return
    }
    if (invForm.items.length === 0) {
      axToast.error('يجب إضافة صنف واحد على الأقل في الفاتورة')
      return
    }

    const updatedData = {
      ...invoice,
      ...invForm,
      partyKind,
      partyType: partyKind,
      subtotal,
      transportCost: transportVal,
      loadingCost: loadingVal,
      total,
      paidAmount,
      remainingAmount,
      treasuryId: paidAmount > 0 ? selectedTreasuryId : null,
      paymentTerms: paymentStatus === 'paid' ? 'مدفوع كلي' : paymentStatus === 'partial' ? 'مدفوع جزئي' : 'غير مدفوع',
      updatedAt: new Date().toISOString(),
    }

    onSave?.(invoice.id, updatedData)
    axToast.success('تم تعديل الفاتورة وتحديث الأرصدة بنجاح')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-none sm:rounded-3xl p-4 sm:p-6 shadow-level3 sm:max-w-6xl lg:max-w-7xl w-full space-y-4 my-auto h-full sm:h-auto max-h-[100dvh] sm:max-h-[94vh] overflow-y-auto mobile-form-zoom">
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-secondary">{invoice.code}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-low border border-outline-variant/30 font-bold">
                  تعديل فاتورة
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-on-surface">
                تعديل بيانات الفاتورة
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="py-1.5 px-3 rounded-full bg-surface-low hover:bg-surface-container text-on-surface text-xs font-black border border-outline-variant/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>معاينة A4</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-surface-low/50 p-3.5 rounded-2xl border border-outline-variant/20">
            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">نوع الفاتورة</label>
              <select
                value={invForm.type}
                onChange={(e) => setInvForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full h-10 px-3 rounded-full bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-secondary"
              >
                <option value="sale">فاتورة بيع</option>
                <option value="purchase">فاتورة مشتريات</option>
                <option value="sale_return">مردود مبيعات</option>
                <option value="purchase_return">مردود مشتريات</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">المخزن المعني</label>
              <select
                value={invForm.warehouseId}
                onChange={(e) => setInvForm((p) => ({ ...p, warehouseId: e.target.value }))}
                className="w-full h-10 px-3 rounded-full bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-secondary"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">تاريخ العملية</label>
              <AX_CompanyDatePicker
                value={invForm.date}
                onChange={(val) => setInvForm((p) => ({ ...p, date: val }))}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">
                الطرف ({partyKind === 'customer' ? 'عميل' : 'مورد'})
              </label>
              <AX_SearchableSelect
                options={partyList.map((p) => ({ value: p.name || p.companyName, label: p.name || p.companyName }))}
                value={invForm.partyName}
                onChange={(val) => setInvForm((p) => ({ ...p, partyName: val }))}
                placeholder="اختر الطرف..."
              />
            </div>
          </div>

          <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-black text-on-surface flex items-center justify-between">
              <span>بنود الفاتورة ({invForm.items.length})</span>
            </h4>

            <AX_InvoiceItemsEditor
              items={invForm.items}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveItem}
              draftItem={draftItem}
              setDraftItem={setDraftItem}
              onAddDraftItem={handleAddDraftItem}
              availableItems={availableItems}
              isSaleType={isSaleType}
              expandedRowIndex={expandedRowIndex}
              setExpandedRowIndex={setExpandedRowIndex}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">مصاريف نقل وشحن (ج.م)</label>
              <input
                type="number"
                min="0"
                value={invForm.transportCost}
                onChange={(e) => setInvForm((p) => ({ ...p, transportCost: e.target.value }))}
                placeholder="0"
                className="w-full h-10 px-3.5 rounded-full bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">مصاريف شيالة ومخازن (ج.م)</label>
              <input
                type="number"
                min="0"
                value={invForm.loadingCost}
                onChange={(e) => setInvForm((p) => ({ ...p, loadingCost: e.target.value }))}
                placeholder="0"
                className="w-full h-10 px-3.5 rounded-full bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono"
              />
            </div>
          </div>

          <AX_InvoicePaymentSection
            paymentStatus={paymentStatus}
            setPaymentStatus={setPaymentStatus}
            paidInput={paidInput}
            setPaidInput={setPaidInput}
            total={total}
            paidAmount={paidAmount}
            remainingAmount={remainingAmount}
            selectedTreasuryId={selectedTreasuryId}
            setSelectedTreasuryId={setSelectedTreasuryId}
            treasuryAccounts={treasuryAccounts}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full border border-outline-variant/30 text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-secondary hover:bg-secondary-hover text-white text-xs font-black shadow-level1 transition-all active:scale-95 cursor-pointer"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>

      <AX_InvoicePrintModal
        invoice={{ ...invoice, ...invForm, partyKind, total, paidAmount, remainingAmount }}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />
    </div>
  )
}

export default AX_EditInvoiceModal
