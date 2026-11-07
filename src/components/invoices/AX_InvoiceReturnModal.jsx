import React, { useState, useEffect } from 'react'
import { RotateCcw, X, AlertTriangle, Check, Warehouse, Wallet } from 'lucide-react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { generateUUID } from '../../utils/AX_UUID'
import { axToast } from '../common/AX_Toast'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'

export function AX_InvoiceReturnModal({
  isOpen,
  onClose,
  invoice,
  warehouses = [],
  treasuryAccounts = [],
  onSaveReturn,
}) {
  useBodyScrollLock(isOpen, onClose)

  const [returnItems, setReturnItems] = useState([])
  const [returnWarehouseId, setReturnWarehouseId] = useState('')
  const [settlementMode, setSettlementMode] = useState('balance_adjustment')
  const [selectedTreasuryId, setSelectedTreasuryId] = useState('')
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0])
  const [returnNotes, setReturnNotes] = useState('')

  useEffect(() => {
    if (invoice && isOpen) {
      setReturnWarehouseId(invoice.warehouseId || warehouses[0]?.id || '')
      setSelectedTreasuryId(treasuryAccounts[0]?.id || '')
      setReturnDate(new Date().toISOString().split('T')[0])
      setSettlementMode('balance_adjustment')
      setReturnNotes('')

      const initial = (invoice.items || []).map((it) => ({
        itemId: it.itemId,
        name: getItemDisplayName(it),
        unit: it.unit || 'كرتونة',
        originalQty: Number(it.quantity) || 0,
        returnQty: Number(it.quantity) || 0,
        price: Number(it.price) || 0,
        selected: true,
      }))
      setReturnItems(initial)
    }
  }, [invoice, isOpen, warehouses, treasuryAccounts])

  if (!isOpen || !invoice) return null

  const isSale = invoice.type === 'sale'
  const isReturnOfSale = isSale
  const targetType = isReturnOfSale ? 'sale_return' : 'purchase_return'
  const typeTitle = isReturnOfSale ? 'تحويل لمردود مبيعات' : 'تحويل لمردود مشتريات'

  const handleToggleSelect = (idx) => {
    setReturnItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, selected: !it.selected, returnQty: !it.selected ? (it.returnQty || it.originalQty) : 0 } : it))
    )
  }

  const handleSelectAll = () => {
    setReturnItems((prev) =>
      prev.map((it) => ({ ...it, selected: true, returnQty: it.originalQty }))
    )
  }

  const handleDeselectAll = () => {
    setReturnItems((prev) =>
      prev.map((it) => ({ ...it, selected: false, returnQty: 0 }))
    )
  }

  const handleQtyChange = (idx, val) => {
    setReturnItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it
        const parsed = Math.max(0, Math.min(it.originalQty, Number(val) || 0))
        return { ...it, returnQty: parsed }
      })
    )
  }

  const activeSelectedItems = returnItems.filter((it) => it.selected && it.returnQty > 0)
  const returnTotal = activeSelectedItems.reduce(
    (sum, it) => sum + it.returnQty * it.price,
    0
  )

  const handleSubmit = (e) => {
    e.preventDefault()

    if (activeSelectedItems.length === 0) {
      axToast.error('يرجى تحديد صنف واحد على الأقل بكمية مرتجعة أكبر من صفر')
      return
    }

    if (!returnWarehouseId) {
      axToast.error('يرجى اختيار المخزن')
      return
    }

    const isCashRefund = settlementMode === 'cash_refund'
    const codePrefix = isReturnOfSale ? 'RET-SALE' : 'RET-PUR'

    const newReturnInv = {
      id: generateUUID(),
      code: `${codePrefix}-${Date.now().toString().slice(-5)}`,
      type: targetType,
      partyType: invoice.partyType || (isReturnOfSale ? 'customer' : 'supplier'),
      partyKind: invoice.partyKind || (isReturnOfSale ? 'customer' : 'supplier'),
      partyName: invoice.partyName,
      isIncompleteData: Boolean(invoice.isIncompleteData),
      originalInvoiceCode: invoice.code,
      originalInvoiceId: invoice.id,
      date: returnDate,
      operationalDate: returnDate,
      transactionDate: returnDate,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      warehouseId: returnWarehouseId,
      items: activeSelectedItems.map((it) => ({
        itemId: it.itemId,
        compositeName: it.name,
        quantity: it.returnQty,
        unit: it.unit,
        price: it.price,
        total: it.returnQty * it.price,
      })),
      transportCost: 0,
      loadingCost: 0,
      subtotal: returnTotal,
      total: returnTotal,
      paidAmount: isCashRefund ? returnTotal : 0,
      remainingAmount: isCashRefund ? 0 : returnTotal,
      status: targetType,
      paymentTerms: isCashRefund ? 'رد نقدي فوري' : (isReturnOfSale ? 'مردود مبيعات' : 'مردود مشتريات'),
      treasuryId: isCashRefund ? selectedTreasuryId : null,
      notes: `مردود على الفاتورة ${invoice.code}${returnNotes ? ` — ${returnNotes}` : ''}`,
    }

    onSaveReturn?.(newReturnInv)
    axToast.success(`تم إنشاء ${typeTitle} بنجاح وقيد الحركات`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overscroll-contain">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-lowest border border-outline-variant/30 rounded-none sm:rounded-3xl p-4 sm:p-6 shadow-level3 max-w-4xl w-full space-y-4 h-full sm:h-auto max-h-[100dvh] sm:max-h-[94vh] overflow-y-auto overscroll-contain mobile-form-zoom"
      >
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-700 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-on-surface">
                {typeTitle}
              </h3>
              <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
                <span>الفاتورة الأصلية: <strong className="text-primary">{invoice.code}</strong></span>
                <span>•</span>
                <span>الطرف: <strong className="text-on-surface">{invoice.partyName}</strong></span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant block flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5 text-primary" />
              <span>{isReturnOfSale ? 'مخزن إيداع المرتجع:' : 'مخزن صرف المرتجع:'}</span>
            </label>
            <AX_SearchableSelect
              value={returnWarehouseId}
              onChange={setReturnWarehouseId}
              options={warehouses.map((w) => ({
                value: w.id,
                label: w.name,
                badge: w.type === 'cold_store' ? 'تبريد' : 'مخزن',
              }))}
              placeholder="اختر المخزن..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant block">تاريخ تسجيل المردود:</label>
            <AX_CompanyDatePicker
              value={returnDate}
              onChange={setReturnDate}
            />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-start gap-2 text-on-surface">
          <AlertTriangle className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-black text-purple-900 block">ضمان النزاهة المحاسبية:</span>
            <span className="text-on-surface-variant leading-relaxed block text-[11px]">
              الفاتورة الأصلية <strong>({invoice.code})</strong> ستبقى ثابتة بكامل قيمتها وبنودها دفترياً، وسيتم إنشاء مستند مردود مستقل <strong>({targetType === 'purchase_return' ? 'مردود مشتريات' : 'مردود مبيعات'})</strong> يظهر في صفحة {targetType === 'purchase_return' ? 'مردودات المشتريات' : 'مردودات المبيعات'}.
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-black text-on-surface block">
              حدد بنود وكميات المرتجع:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/15 hover:bg-purple-500/25 text-purple-800 transition-all cursor-pointer"
              >
                إرجاع الفاتورة كاملة
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-1 rounded-full text-xs font-black bg-surface-low hover:bg-surface-container text-on-surface-variant transition-all cursor-pointer"
              >
                تحديد بنود معينة
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-surface-container">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-low border-b border-surface-container text-on-surface-variant font-black">
                <tr className="h-9">
                  <th className="px-3 w-8 text-center">اختيار</th>
                  <th className="px-3">الصنف</th>
                  <th className="px-3 text-center">{isReturnOfSale ? 'الكمية المباعة' : 'الكمية المشتراة'}</th>
                  <th className="px-3 text-center">الكمية المرتجعة</th>
                  <th className="px-3 text-left">السعر</th>
                  <th className="px-3 text-left">إجمالي المردود</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container text-on-surface font-bold">
                {returnItems.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`h-11 transition-colors ${
                      item.selected ? 'bg-purple-500/[0.03]' : 'opacity-60 bg-surface-lowest'
                    }`}
                  >
                    <td className="px-3 text-center">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleSelect(idx)}
                        className="w-4 h-4 rounded text-purple-600 cursor-pointer accent-purple-600"
                      />
                    </td>
                    <td className="px-3 whitespace-nowrap">{item.name}</td>
                    <td className="px-3 text-center font-mono text-on-surface-variant">
                      {item.originalQty} {item.unit}
                    </td>
                    <td className="px-3 text-center">
                      <input
                        type="number"
                        min="0.01"
                        max={item.originalQty}
                        step="any"
                        disabled={!item.selected}
                        value={item.returnQty}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        className="w-20 px-2 py-1 rounded-xl bg-surface-low border border-outline-variant/30 text-center font-mono font-bold text-xs focus:outline-none focus:border-purple-600 disabled:opacity-40"
                      />
                    </td>
                    <td className="px-3 text-left font-mono whitespace-nowrap">
                      {item.price.toLocaleString('en-US')} ج.م
                    </td>
                    <td className="px-3 text-left font-mono font-black text-purple-700 whitespace-nowrap">
                      {(item.selected ? item.returnQty * item.price : 0).toLocaleString('en-US')} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-low border border-surface-container space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-black text-on-surface flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-primary" />
              <span>طريقة التسوية المالية:</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSettlementMode('balance_adjustment')}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                  settlementMode === 'balance_adjustment'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-lowest border border-outline-variant/30 text-on-surface'
                }`}
              >
                تخفيض رصيد الحساب الآجل
              </button>
              <button
                type="button"
                onClick={() => setSettlementMode('cash_refund')}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                  settlementMode === 'cash_refund'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-surface-lowest border border-outline-variant/30 text-on-surface'
                }`}
              >
                رد نقدي فوري للطرف
              </button>
            </div>
          </div>

          {settlementMode === 'cash_refund' && (
            <div className="p-2.5 rounded-xl bg-surface-lowest border border-outline-variant/30 space-y-1.5 animate-in fade-in">
              <label className="text-[11px] font-bold text-on-surface-variant block">
                اختر الخزينة / الحساب لسداد الرد النقدي:
              </label>
              <AX_SearchableSelect
                value={selectedTreasuryId}
                onChange={setSelectedTreasuryId}
                options={treasuryAccounts.map((acc) => ({
                  value: acc.id,
                  label: `${acc.name} (${Number(acc.balance || 0).toLocaleString('en-US')} ج.م)`,
                }))}
                placeholder="اختر الخزينة..."
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-on-surface-variant block">سبب المردود / ملاحظات:</label>
            <input
              type="text"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="مثال: تلف عبوات أثناء النقل، خطأ في التوريد..."
              className="w-full px-3 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-purple-600"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-surface-container font-black text-sm">
            <span className="text-on-surface">إجمالي قيمة المردود المستحق:</span>
            <span className="font-mono text-purple-700 text-base">
              {returnTotal.toLocaleString('en-US')} ج.م
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={activeSelectedItems.length === 0}
            className="px-6 py-2 rounded-full bg-purple-700 hover:bg-purple-800 text-white text-xs font-black shadow-level1 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>حفظ المردود وقيد الحركات</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default AX_InvoiceReturnModal
