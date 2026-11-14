import React, { useState, useEffect } from 'react'
import { Landmark, Plus, X, Check } from 'lucide-react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { axToast } from '../common/AX_Toast'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { generateUUID } from '../../utils/AX_UUID'

export function AX_AddTreasuryModal({ isOpen, onClose, onSave, editingAccount = null }) {
  useBodyScrollLock(isOpen, onClose)
  const [name, setName] = useState('')
  const [type, setType] = useState('cash')
  const [openingBalance, setOpeningBalance] = useState('')
  const [balance, setBalance] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name || '')
      setType(editingAccount.type || 'cash')
      const ob = editingAccount.openingBalance !== undefined ? editingAccount.openingBalance : (editingAccount.opening_balance ?? 0)
      setOpeningBalance(String(ob))
      setBalance(editingAccount.balance !== undefined ? String(editingAccount.balance) : '')
    } else {
      setName('')
      setType('cash')
      setOpeningBalance('')
      setBalance('')
    }
    setErrorMsg(null)
  }, [editingAccount, isOpen])

  if (!isOpen) return null

  const isEdit = Boolean(editingAccount)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم الخزينة أو الحساب')
      return
    }

    const obNum = Number(openingBalance) || 0

    if (isEdit) {
      const oldOb = Number(editingAccount.openingBalance ?? editingAccount.opening_balance ?? 0)
      const obDelta = obNum - oldOb
      const prevBal = Number(editingAccount.balance || 0)
      const inputBal = Number(balance) || 0
      const finalBal = obDelta !== 0 && Math.abs(inputBal - prevBal) < 0.001 ? (prevBal + obDelta) : inputBal

      const updated = {
        ...editingAccount,
        name: name.trim(),
        type,
        openingBalance: obNum,
        balance: finalBal,
      }
      onSave(updated)
      axToast.success('تم حفظ وتعديل بيانات الخزينة ورصيد أول المدة بنجاح')
    } else {
      const newAcc = {
        id: generateUUID(),
        name: name.trim(),
        type,
        openingBalance: obNum,
        balance: obNum,
      }
      onSave(newAcc)
      axToast.success('تمت إضافة الحساب المالي ورصيد أول المدة بنجاح')
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-level3 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-primary/10 text-primary">
              <Landmark className="w-5 h-5" />
            </span>
            <h3 className="text-base font-black text-on-surface">
              {isEdit ? 'تعديل بيانات الخزينة / الحساب' : 'إضافة خزينة / حساب مالي جديد'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-error-container/20 border border-error text-error text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1">
              اسم الخزينة أو الحساب <span className="text-error">*</span>
            </label>
            <input
              type="text"
              placeholder="مثال: الخزينة الفرعية، حساب QNB، فودافون كاش 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1">نوع القناة المالية</label>
            <AX_SearchableSelect
              value={type}
              onChange={setType}
              options={[
                { value: 'cash', label: 'خزينة نقدية (كاش)' },
                { value: 'bank', label: 'حساب بنكي' },
                { value: 'wallet', label: 'محفظة إلكترونية' },
                { value: 'instapay', label: 'حساب إنستاباي (InstaPay)' },
                { value: 'van_cash', label: 'عهدة سيارة توزيع' },
              ]}
              searchable={false}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1">
              رصيد أول المدة الافتتاحي (ج.م)
            </label>
            <input
              type="number"
              placeholder="0"
              value={openingBalance}
              onChange={(e) => {
                setOpeningBalance(e.target.value)
                if (!isEdit) setBalance(e.target.value)
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary font-mono"
            />
            <span className="text-[10px] text-on-surface-variant block mt-0.5">
              الرصيد النقدي الذي بدأت به الخزينة قبل تسجيل أي حركات قبض أو صرف
            </span>
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">
                الرصيد المالي الحالي الدفتري (ج.م)
              </label>
              <input
                type="number"
                placeholder="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary font-mono"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-full border border-outline-variant/60 text-xs font-bold text-on-surface hover:bg-surface-container transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isEdit ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{isEdit ? 'حفظ التعديلات' : 'إضافة الحساب'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
