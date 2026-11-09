import React, { useState, useMemo } from 'react'
import { X, Check, Plus, Trash2, Calendar, Wallet, Receipt, Sparkles, CreditCard } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock.js'
import { useAXStore } from '../../store/useAXStore.js'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker.jsx'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect.jsx'
import { AX_ExpenseCostCenterHierarchySelect } from './AX_ExpenseCostCenterHierarchySelect.jsx'
import { AX_ExpenseStatementAutocomplete } from './AX_ExpenseStatementAutocomplete.jsx'
import {
  EXPENSE_COST_CENTER_TYPES,
  createExpenseRecord,
  generateExpenseInstallments,
} from '../../store/expenseStoreHelpers.js'

export function AX_CreateExpenseModal({ isOpen, onClose, onCreated }) {
  useBodyScrollLock(isOpen, onClose)
  const storeState = useAXStore()
  const { treasuryAccounts = [], warehouses = [], distributors = [], expenseCategories = [], profile } = storeState

  const defaultTreasury = useMemo(() => treasuryAccounts.find((t) => t.type === 'cash') || treasuryAccounts[0], [treasuryAccounts])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [costCenter, setCostCenter] = useState({ entityType: EXPENSE_COST_CENTER_TYPES.WAREHOUSE, entityId: '', entityName: '' })
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState('')
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState('')
  const [selectedSecondaryCategoryId, setSelectedSecondaryCategoryId] = useState('')
  const [categoryNames, setCategoryNames] = useState({ mainCategoryName: '', subCategoryName: '', secondaryCategoryName: '' })
  const [title, setTitle] = useState('')
  const [payeeName, setPayeeName] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [paymentType, setPaymentType] = useState('immediate')
  const [notes, setNotes] = useState('')
  const [payments, setPayments] = useState(() => [{ id: 'p-1', treasuryId: defaultTreasury?.id || '', treasuryName: defaultTreasury?.name || '', amount: '', method: 'cash', notes: '' }])
  const [installmentCount, setInstallmentCount] = useState(1)
  const [firstDueDate, setFirstDueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [installments, setInstallments] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const treasuryOptions = useMemo(() => (
    treasuryAccounts.map((t) => ({
      value: t.id,
      label: t.name,
      badge: `${t.balance?.toLocaleString('en-US') || 0} ج.م`
    }))
  ), [treasuryAccounts])

  if (!isOpen) return null

  const parsedTotal = Math.max(0, parseFloat(totalAmount) || 0)
  const totalPaid = payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0)
  const remaining = Math.max(0, Math.round((parsedTotal - totalPaid) * 100) / 100)

  const handleCategoryChange = (catData) => {
    setSelectedMainCategoryId(catData.mainCategoryId)
    setSelectedSubCategoryId(catData.subCategoryId)
    setSelectedSecondaryCategoryId(catData.secondaryCategoryId)
    setCategoryNames({ mainCategoryName: catData.mainCategoryName, subCategoryName: catData.subCategoryName, secondaryCategoryName: catData.secondaryCategoryName })
  }

  const handlePaymentTypeSwitch = (type) => {
    setPaymentType(type)
    setErrorMessage('')
    if (type === 'immediate') {
      setPayments([{ id: 'p-1', treasuryId: defaultTreasury?.id || '', treasuryName: defaultTreasury?.name || '', amount: parsedTotal > 0 ? String(parsedTotal) : '', method: 'cash', notes: '' }])
      setInstallments([])
    } else if (type === 'partial') {
      const half = parsedTotal > 0 ? Math.round((parsedTotal / 2) * 100) / 100 : ''
      setPayments([{ id: 'p-1', treasuryId: defaultTreasury?.id || '', treasuryName: defaultTreasury?.name || '', amount: half ? String(half) : '', method: 'cash', notes: '' }])
      const rem = parsedTotal > 0 ? Math.round((parsedTotal - (half || 0)) * 100) / 100 : 0
      setInstallments(generateExpenseInstallments(rem, installmentCount, firstDueDate))
    } else if (type === 'deferred') {
      setPayments([])
      setInstallments(generateExpenseInstallments(parsedTotal, installmentCount, firstDueDate))
    }
  }

  const handleAddPaymentRow = () => {
    const unallocated = Math.max(0, parsedTotal - totalPaid)
    setPayments([...payments, { id: `p-${Date.now()}`, treasuryId: defaultTreasury?.id || '', treasuryName: defaultTreasury?.name || '', amount: unallocated > 0 ? String(unallocated) : '', method: 'cash', notes: '' }])
  }

  const handleUpdatePayment = (id, field, value) => {
    setPayments(payments.map((p) => {
      if (p.id !== id) return p
      if (field === 'treasuryId') {
        const t = treasuryAccounts.find((acc) => acc.id === value)
        return { ...p, treasuryId: value, treasuryName: t ? t.name : '' }
      }
      return { ...p, [field]: value }
    }))
  }

  const handleUpdateInstallment = (idx, field, value) => {
    const updated = [...installments]
    if (updated[idx]) {
      updated[idx] = { ...updated[idx], [field]: value }
      setInstallments(updated)
    }
  }

  const handleInstallmentCountChange = (num) => {
    setInstallmentCount(num)
    const baseAmount = paymentType === 'deferred' ? parsedTotal : remaining
    if (baseAmount > 0) {
      setInstallments(generateExpenseInstallments(baseAmount, num, firstDueDate))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    if (!costCenter.entityType) { setErrorMessage('يرجى تحديد مركز التكلفة'); return }
    if (!selectedMainCategoryId) { setErrorMessage('يرجى اختيار البند الرئيسي للمصروف'); return }
    if (!title.trim()) { setErrorMessage('يرجى إدخال بيان / وصف المصروف'); return }
    if (parsedTotal <= 0) { setErrorMessage('يرجى إدخال مبلغ صحيح للمصروف'); return }

    if (paymentType === 'immediate') {
      if (Math.abs(totalPaid - parsedTotal) > 0.01) { setErrorMessage(`إجمالي المدفوع (${totalPaid} ج.م) لا يساوي قيمة المصروف (${parsedTotal} ج.م)`); return }
    } else if (paymentType === 'partial') {
      if (totalPaid <= 0 || totalPaid >= parsedTotal) { setErrorMessage('في حالة الدفع الجزئي، يجب أن يكون المدفوع أكبر من صفر وأقل من الإجمالي'); return }
      const instSum = installments.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0)
      if (Math.abs(instSum - remaining) > 0.1) { setErrorMessage(`مجموع الأقساط (${instSum} ج.م) لا يساوي المبلغ المتبقي (${remaining} ج.م)`); return }
    } else if (paymentType === 'deferred') {
      const instSum = installments.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0)
      if (Math.abs(instSum - parsedTotal) > 0.1) { setErrorMessage(`مجموع الأقساط (${instSum} ج.م) لا يساوي قيمة المصروف (${parsedTotal} ج.م)`); return }
    }

    setIsSubmitting(true)
    try {
      const payload = {
        date, costCenter, mainCategoryId: selectedMainCategoryId, mainCategoryName: categoryNames.mainCategoryName,
        subCategoryId: selectedSubCategoryId, subCategoryName: categoryNames.subCategoryName,
        secondaryCategoryId: selectedSecondaryCategoryId, secondaryCategoryName: categoryNames.secondaryCategoryName,
        title: title.trim(), description: title.trim(), payeeName: payeeName.trim() || 'جهة الصرف', totalAmount: parsedTotal, paymentType,
        payments: payments.map((p) => ({ treasuryId: p.treasuryId, treasuryName: p.treasuryName, amount: parseFloat(p.amount) || 0, method: p.method, notes: p.notes })),
        installments: installments.map((inst, idx) => ({ installmentNumber: idx + 1, dueDate: inst.dueDate, amount: parseFloat(inst.amount) || 0, notes: inst.notes || '' })),
        notes: notes.trim(),
      }
      const res = await createExpenseRecord(payload, { storeState, setStoreState: useAXStore.setState, profile })
      if (res?.success) { onCreated?.(res.expense); onClose?.() } else { setErrorMessage(res?.error || 'فشل في حفظ المصروف') }
    } catch { setErrorMessage('حدث خطأ أثناء حفظ المصروف') } finally { setIsSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-scrim/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-surface-lowest rounded-3xl shadow-level3 border border-outline-variant/30 overflow-hidden text-right">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-outline-variant/30 bg-surface-container-low/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20"><Receipt className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-on-surface">تسجيل مصروف تشغيلي جديد</h2>
              <p className="text-xs font-bold text-on-surface-variant">ربط بمركز التكلفة وتقسيم السداد وجدولة الأقساط</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-surface-lowest hover:bg-surface-container border border-outline-variant/30 flex items-center justify-center text-on-surface-variant cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMessage && <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs font-black text-red-600 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-600" /><span>{errorMessage}</span></div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">تاريخ تسجيل المصروف <span className="text-red-500">*</span></label>
              <AX_CompanyDatePicker value={date} onChange={setDate} />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">إجمالي قيمة المصروف (ج.م) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0" value={totalAmount} onChange={(e) => { setTotalAmount(e.target.value); if (paymentType === 'immediate') setPayments((prev) => prev.length === 1 ? [{ ...prev[0], amount: e.target.value }] : prev) }} placeholder="0.00" className="w-full h-11 px-3.5 bg-surface-lowest border border-outline-variant/40 rounded-2xl text-base font-black text-on-surface focus:outline-none focus:border-primary" />
            </div>
          </div>

          <AX_ExpenseCostCenterHierarchySelect costCenter={costCenter} onCostCenterChange={setCostCenter} categories={expenseCategories} selectedMainCategoryId={selectedMainCategoryId} selectedSubCategoryId={selectedSubCategoryId} selectedSecondaryCategoryId={selectedSecondaryCategoryId} onCategoryChange={handleCategoryChange} warehouses={warehouses} distributors={distributors} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">بيان / وصف المصروف <span className="text-red-500">*</span></label>
              <AX_ExpenseStatementAutocomplete
                value={title}
                onChange={setTitle}
                pastTransactions={storeState.cashTransactions}
                selectedMainCategoryName={categoryNames.mainCategoryName}
                selectedSubCategoryName={categoryNames.subCategoryName}
                placeholder="مثال: فاتورة صيانة غرف تبريد..."
                disabled={isSubmitting}
                required={true}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">جهة الصرف / المستفيد / المقاول</label>
              <input type="text" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="اسم المستلم أو الشركة..." className="w-full h-10 px-3 bg-surface-lowest border border-outline-variant/40 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary" />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-outline-variant/20">
            <label className="text-xs font-black text-on-surface flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-primary" />طريقة وتسوية السداد</label>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => handlePaymentTypeSwitch('immediate')} className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${paymentType === 'immediate' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-surface-lowest text-on-surface border-outline-variant/30 hover:bg-surface-container'}`}>سداد فوري</button>
              <button type="button" onClick={() => handlePaymentTypeSwitch('partial')} className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${paymentType === 'partial' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-surface-lowest text-on-surface border-outline-variant/30 hover:bg-surface-container'}`}>مدفوع جزئي وآجل</button>
              <button type="button" onClick={() => handlePaymentTypeSwitch('deferred')} className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${paymentType === 'deferred' ? 'bg-primary text-on-primary border-primary shadow-xs' : 'bg-surface-lowest text-on-surface border-outline-variant/30 hover:bg-surface-container'}`}>غير مدفوع (آجل)</button>
            </div>
          </div>

          {(paymentType === 'immediate' || paymentType === 'partial') && (
            <div className="space-y-2.5 p-3.5 bg-surface-container-low/40 rounded-2xl border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-on-surface flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-emerald-600" />قنوات الصرف المتعددة</span>
                <button type="button" onClick={handleAddPaymentRow} className="inline-flex items-center gap-1 text-[11px] font-black text-primary hover:underline cursor-pointer"><Plus className="w-3 h-3" />إضافة قناة دفع أخرى</button>
              </div>
              <div className="space-y-2.5">
                {payments.map((p) => (
                  <div key={p.id} className="p-2.5 bg-surface-lowest rounded-2xl border border-outline-variant/20 shadow-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-5">
                        <AX_SearchableSelect
                          value={p.treasuryId}
                          onChange={(val) => handleUpdatePayment(p.id, 'treasuryId', val)}
                          options={treasuryOptions}
                          placeholder="اختر الخزينة / الحساب..."
                          searchable={true}
                        />
                      </div>
                      <div className="sm:col-span-4 flex items-center justify-center">
                        <div className="inline-flex items-center gap-1 bg-surface-container/40 p-1 rounded-xl border border-outline-variant/20 w-full justify-around">
                          {[
                            { id: 'cash', label: 'نقدي' },
                            { id: 'bank_transfer', label: 'تحويل' },
                            { id: 'instapay', label: 'إنستاباي' },
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleUpdatePayment(p.id, 'method', m.id)}
                              className={`flex-1 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer text-center ${
                                p.method === m.id
                                  ? 'bg-primary text-on-primary shadow-xs'
                                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-lowest'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={p.amount}
                          onChange={(e) => handleUpdatePayment(p.id, 'amount', e.target.value)}
                          placeholder="المبلغ"
                          className="w-full h-10 px-3 bg-surface-lowest border border-outline-variant/40 rounded-xl text-xs font-black text-on-surface text-center focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        {payments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setPayments(payments.filter((row) => row.id !== p.id))}
                            className="w-8 h-8 rounded-full text-red-600 hover:bg-red-500/10 flex items-center justify-center cursor-pointer transition-colors"
                            title="حذف القناة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1 text-xs font-black text-on-surface-variant">
                <span>إجمالي المدفوع نقداً/بنكياً: <strong className="text-emerald-700">{totalPaid.toLocaleString('en-US')} ج.م</strong></span>
                {paymentType === 'partial' && <span>المتبقي الآجل: <strong className="text-amber-700">{remaining.toLocaleString('en-US')} ج.م</strong></span>}
              </div>
            </div>
          )}

          {(paymentType === 'partial' || paymentType === 'deferred') && (
            <div className="space-y-2.5 p-3.5 bg-surface-container-low/40 rounded-2xl border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-on-surface flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary" />جدولة الأقساط المؤجلة</span>
                <button type="button" onClick={() => setInstallments(generateExpenseInstallments(paymentType === 'deferred' ? parsedTotal : remaining, installmentCount, firstDueDate))} className="inline-flex items-center gap-1 text-[11px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 cursor-pointer active:scale-95"><Sparkles className="w-3 h-3" />توليد الجدول تلقائياً</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1.5">عدد الأقساط</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 6, 12].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleInstallmentCountChange(num)}
                        className={`px-3 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                          installmentCount === num
                            ? 'bg-primary text-on-primary shadow-xs'
                            : 'bg-surface-lowest text-on-surface border border-outline-variant/30 hover:border-primary/50'
                        }`}
                      >
                        {num} {num === 1 ? 'قسط' : 'أقساط'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1.5">تاريخ استحقاق أول قسط</label>
                  <AX_CompanyDatePicker value={firstDueDate} onChange={setFirstDueDate} />
                </div>
              </div>
              {installments.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {installments.map((inst, idx) => (
                    <div key={inst.id} className="grid grid-cols-12 gap-2 items-center bg-surface-lowest p-2 rounded-xl border border-outline-variant/20 text-xs">
                      <div className="col-span-2 font-black text-primary">قسط #{idx + 1}</div>
                      <div className="col-span-5"><AX_CompanyDatePicker value={inst.dueDate} onChange={(newDate) => handleUpdateInstallment(idx, 'dueDate', newDate)} /></div>
                      <div className="col-span-5"><input type="number" step="0.01" value={inst.amount} onChange={(e) => handleUpdateInstallment(idx, 'amount', e.target.value)} className="w-full h-8 px-2 bg-surface-container/40 border border-outline-variant/30 rounded-lg font-black text-on-surface" /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">ملاحظات إضافية</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي تفاصيل أو اشتراطات أخرى..." className="w-full p-2.5 bg-surface-lowest border border-outline-variant/40 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary" />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/30">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2 rounded-full border border-outline-variant/40 bg-surface-lowest text-xs font-black text-on-surface hover:bg-surface-container cursor-pointer transition-all">إلغاء</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-full bg-primary hover:bg-primary-dark text-on-primary text-xs font-black flex items-center gap-2 cursor-pointer shadow-level1 transition-all active:scale-95 disabled:opacity-50"><Check className="w-4 h-4" /><span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ وتسجيل المصروف'}</span></button>
          </div>
        </form>
      </div>
    </div>
  )
}
