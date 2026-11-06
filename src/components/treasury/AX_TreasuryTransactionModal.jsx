import React, { useState } from 'react'
import {
  Wallet,
  X,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Users,
  Coins,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { generateUUID } from '../../utils/AX_UUID'
import { EXPENSE_CATEGORIES, WAGE_TYPES } from './treasuryConstants.js'
import { AX_ExpenseCategoryHierarchySelect } from './AX_ExpenseCategoryHierarchySelect.jsx'
import { AX_ExpenseCategoriesModal } from './AX_ExpenseCategoriesModal.jsx'
import { expenseCategoryHelpers } from '../../store/expenseCategoryHelpers.js'

export { EXPENSE_CATEGORIES, WAGE_TYPES }

export function AX_TreasuryTransactionModal({
  isOpen,
  onClose,
  treasuryAccounts = [],
  clients = [],
  suppliers = [],
  employees = [],
  expenseCategories: propCategories,
  onSave,
}) {
  useBodyScrollLock(isOpen)

  const storeCategories = useAXStore((state) => state.expenseCategories) || []
  const expenseCategories = propCategories || storeCategories

  const defaultTreasuryId = treasuryAccounts[0]?.id || ''

  const [txType, setTxType] = useState('client_receipt')
  const [partyName, setPartyName] = useState(clients[0]?.name || '')
  const [amount, setAmount] = useState('')
  const [treasuryId, setTreasuryId] = useState(defaultTreasuryId)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const [expenseCode, setExpenseCode] = useState(EXPENSE_CATEGORIES[0]?.code || 'EXP-TRN')
  const [customExpenseName, setCustomExpenseName] = useState('')

  const [expenseMainId, setExpenseMainId] = useState('')
  const [expenseSubId, setExpenseSubId] = useState('')
  const [expenseSecondaryId, setExpenseSecondaryId] = useState('')
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)

  const [wageType, setWageType] = useState('salary')
  const [employeeName, setEmployeeName] = useState(employees[0]?.name || '')

  if (!isOpen) return null

  const isExpenseGated = txType === 'expense' && (!expenseMainId || !expenseSubId || !expenseSecondaryId)

  const handleTabSwitch = (type) => {
    setTxType(type)
    if (type === 'client_receipt') {
      setPartyName(clients[0]?.name || '')
    } else if (type === 'supplier_payment') {
      setPartyName(suppliers[0]?.name || '')
    } else if (type === 'other_income') {
      setPartyName('بيع فوارغ وكراتين وتغليف')
    } else if (type === 'payroll') {
      setEmployeeName(employees[0]?.name || '')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isExpenseGated) return
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) return

    let finalParty = partyName.trim()
    let finalPartyType = 'client'
    let prefix = 'REC'
    let finalNotes = notes.trim()
    let extraFields = {}

    if (txType === 'supplier_payment') {
      finalPartyType = 'supplier'
      prefix = 'PAY'
    } else if (txType === 'other_income') {
      finalPartyType = 'income'
      prefix = 'REV'
      finalParty = partyName.trim() || 'إيرادات متنوعة'
      finalNotes = finalNotes ? `[إيرادات متنوعة] ${finalParty}: ${finalNotes}` : `[إيرادات متنوعة] ${finalParty}`
    } else if (txType === 'expense') {
      finalPartyType = 'expense'
      prefix = 'EXP'
      const path = expenseCategoryHelpers.getHierarchyPath(expenseCategories, expenseSecondaryId)
      const mainCat = path.main
      const subCat = path.sub
      const secCat = path.secondary
      const hierarchyLabel = path.label || 'مصروف تشغيلي'
      finalParty = `[${hierarchyLabel}]`
      finalNotes = finalNotes ? `${hierarchyLabel} - ${finalNotes}` : hierarchyLabel
      extraFields = {
        expenseMainCategoryId: mainCat?.id || expenseMainId,
        expenseMainCategoryName: mainCat?.name || '',
        expenseSubCategoryId: subCat?.id || expenseSubId,
        expenseSubCategoryName: subCat?.name || '',
        expenseSecondaryCategoryId: secCat?.id || expenseSecondaryId,
        expenseSecondaryCategoryName: secCat?.name || '',
      }
    } else if (txType === 'payroll') {
      finalPartyType = 'employee'
      prefix = 'WAGE'
      const wageObj = WAGE_TYPES.find((w) => w.value === wageType)
      const wageLabel = wageObj?.label || 'أجر / راتب'
      finalParty = employeeName.trim() || 'موظف'
      finalNotes = `[أجور ومرتبات - ${wageLabel}] ${finalParty}: ${finalNotes || wageLabel}`
    }

    const newTx = {
      id: generateUUID(),
      code: `${prefix}-${Date.now().toString().slice(-4)}`,
      type: txType,
      partyType: finalPartyType,
      partyName: finalParty,
      amount: numAmount,
      treasuryId: treasuryId || defaultTreasuryId,
      date,
      operationalDate: date,
      transactionDate: date,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      notes: finalNotes || 'سند مالي',
      status: 'completed',
      ...extraFields,
    }

    onSave(newTx)
    setAmount('')
    setNotes('')
    setCustomExpenseName('')
    setExpenseMainId('')
    setExpenseSubId('')
    setExpenseSecondaryId('')
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-level3 space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-primary/10 text-primary">
                <Coins className="w-5 h-5" />
              </span>
              <h3 className="text-base font-black text-on-surface">إصدار سند مالي جديد</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-surface-low rounded-2xl border border-outline-variant/20">
            <button
              type="button"
              onClick={() => handleTabSwitch('client_receipt')}
              className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all cursor-pointer text-center ${
                txType === 'client_receipt' ? 'bg-emerald-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-lowest'
              }`}
            >
              وارد عميل
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('supplier_payment')}
              className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all cursor-pointer text-center ${
                txType === 'supplier_payment' ? 'bg-error text-white shadow-xs' : 'text-on-surface hover:bg-surface-lowest'
              }`}
            >
              صادر مورد
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('other_income')}
              className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all cursor-pointer text-center ${
                txType === 'other_income' ? 'bg-teal-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-lowest'
              }`}
            >
              إيرادات متنوعة
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('expense')}
              className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all cursor-pointer text-center ${
                txType === 'expense' ? 'bg-amber-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-lowest'
              }`}
            >
              مصروفات
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('payroll')}
              className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all cursor-pointer text-center ${
                txType === 'payroll' ? 'bg-purple-700 text-white shadow-xs' : 'text-on-surface hover:bg-surface-lowest'
              }`}
            >
              أجور ومرتبات
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-bold">
            {txType === 'client_receipt' && (
              <div>
                <label className="block text-on-surface-variant mb-1 text-right">العميل المحصل منه *</label>
                <AX_SearchableSelect
                  value={partyName}
                  onChange={setPartyName}
                  options={clients.map((c) => ({
                    value: c.name,
                    label: c.name,
                    badge: `${(Number(c.balance) || 0).toLocaleString('en-US')} ج.م`,
                  }))}
                  placeholder="اختر العميل..."
                />
              </div>
            )}

            {txType === 'supplier_payment' && (
              <div>
                <label className="block text-on-surface-variant mb-1 text-right">المورد المسدد له *</label>
                <AX_SearchableSelect
                  value={partyName}
                  onChange={setPartyName}
                  options={suppliers.map((s) => ({
                    value: s.name,
                    label: s.name,
                    badge: `${(Number(s.balance) || 0).toLocaleString('en-US')} ج.م`,
                  }))}
                  placeholder="اختر المورد..."
                />
              </div>
            )}

            {txType === 'other_income' && (
              <div>
                <label className="block text-on-surface-variant mb-1 text-right">مصدر / بند الإيراد *</label>
                <input
                  type="text"
                  required
                  placeholder="اكتب مصدر الإيراد أو اختر..."
                  list="income-source-suggestions"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface outline-none focus:border-primary text-right"
                />
                <datalist id="income-source-suggestions">
                  <option value="بيع فوارغ وكراتين وتغليف" />
                  <option value="بيع مخلفات ودهون تشفية" />
                  <option value="عوائد وأرباح بنكية / فوائد" />
                  <option value="إيراد خدمات تبريد وتخزين للغير" />
                  <option value="إيراد نقل وشحن بسيارات التوزيع" />
                  <option value="تسوية فروق نقدية بالزيادة" />
                  <option value="إيرادات متنوعة أخرى" />
                </datalist>
              </div>
            )}

            {txType === 'expense' && (
              <AX_ExpenseCategoryHierarchySelect
                categories={expenseCategories}
                mainId={expenseMainId}
                subId={expenseSubId}
                secondaryId={expenseSecondaryId}
                onChange={({ mainId, subId, secondaryId }) => {
                  setExpenseMainId(mainId)
                  setExpenseSubId(subId)
                  setExpenseSecondaryId(secondaryId)
                }}
                onManageClick={() => setShowCategoriesModal(true)}
              />
            )}

            {txType === 'payroll' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-on-surface-variant mb-1 text-right">الموظف / العامل المستحق *</label>
                  <input
                    type="text"
                    required
                    placeholder="اكتب اسم الموظف أو اختر..."
                    list="employee-suggestions"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-low border border-outline-variant/30 text-on-surface outline-none"
                  />
                  <datalist id="employee-suggestions">
                    {employees.map((emp) => (
                      <option key={emp.id || emp.name} value={emp.name}>
                        {emp.roleTitle || 'موظف'}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 text-right">نوع استحقاق الأجر *</label>
                  <AX_SearchableSelect
                    value={wageType}
                    onChange={setWageType}
                    options={WAGE_TYPES}
                    searchable={false}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-on-surface-variant mb-1 text-right">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  required
                  min="0.1"
                  step="any"
                  disabled={isExpenseGated}
                  placeholder={isExpenseGated ? 'اختر درجات المصروف الثلاث أولاً...' : '0.00'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right ${
                    isExpenseGated ? 'opacity-40 cursor-not-allowed bg-surface-lowest' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 text-right">قناة الخزينة / الحساب *</label>
                <AX_SearchableSelect
                  value={treasuryId}
                  onChange={setTreasuryId}
                  options={treasuryAccounts.map((t) => ({
                    value: t.id,
                    label: t.name,
                    badge: `${(Number(t.balance) || 0).toLocaleString('en-US')} ج.م`,
                  }))}
                  placeholder="اختر الخزينة..."
                />
              </div>
            </div>

            <div>
              <label className="block text-on-surface-variant mb-1 text-right">التاريخ *</label>
              <AX_CompanyDatePicker
                value={date}
                onChange={setDate}
              />
            </div>

            <div>
              <label className="block text-on-surface-variant mb-1 text-right">ملاحظات وبيان السند</label>
              <input
                type="text"
                disabled={isExpenseGated}
                placeholder={isExpenseGated ? 'اختر درجات المصروف الثلاث أولاً...' : 'مثال: دفعة تحت الحساب، إكرامية، فاتورة رقم...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface outline-none ${
                  isExpenseGated ? 'opacity-40 cursor-not-allowed bg-surface-lowest' : ''
                }`}
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-full border border-outline-variant/60 text-xs font-bold text-on-surface hover:bg-surface-container transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isExpenseGated}
                className={`flex-1 py-2.5 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                  isExpenseGated ? 'opacity-40 cursor-not-allowed hover:bg-primary active:scale-100' : ''
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل السند</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <AX_ExpenseCategoriesModal
        isOpen={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
      />
    </>
  )
}
