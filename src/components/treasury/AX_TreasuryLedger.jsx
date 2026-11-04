import React, { useState, useEffect } from 'react'
import {
  Wallet,
  Building2,
  Smartphone,
  CreditCard,
  Truck,
  Plus,
  Clock,
  CheckCircle2,
  ArrowLeftRight,
  Landmark,
  Edit2,
  Trash2,
  FolderTree,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_TreasuryTransactionsTable } from './AX_TreasuryTransactionsTable'
import { AX_AddTreasuryModal } from './AX_AddTreasuryModal'
import { AX_TreasuryTransactionModal } from './AX_TreasuryTransactionModal'
import { AX_ExpenseCategoriesModal } from './AX_ExpenseCategoriesModal'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { generateUUID } from '../../utils/AX_UUID'

export function AX_TreasuryLedger() {
  const {
    treasuryAccounts = [],
    cashTransactions = [],
    pendingCashTransfers = [],
    invoices = [],
    clients = [],
    suppliers = [],
    employees = [],
    activeModal,
    closeModal,
    addCashTransaction,
    addPendingCashTransfer,
    confirmCashTransfer,
    addTreasuryAccount,
    updateTreasuryAccount,
    deleteTreasuryAccount,
  } = useAXStore()

  const [activeSubTab, setActiveSubTab] = useState('transactions')
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showAddTreasuryModal, setShowAddTreasuryModal] = useState(false)
  const [showExpenseCategoriesModal, setShowExpenseCategoriesModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [deletingAccount, setDeletingAccount] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 15

  useEffect(() => {
    if (activeModal === 'create_transaction' || activeModal === 'add_transaction') {
      setShowTransactionModal(true)
      closeModal()
    } else if (activeModal === 'add_treasury') {
      setShowAddTreasuryModal(true)
      closeModal()
    } else if (activeModal === 'manage_expense_categories' || activeModal === 'expense_categories') {
      setShowExpenseCategoriesModal(true)
      closeModal()
    }
  }, [activeModal, closeModal])

  const defaultTreasuryId = treasuryAccounts[0]?.id || 'c0000000-0000-0000-0000-000000000001'

  const totalTx = cashTransactions?.length || 0
  const totalPages = Math.max(1, Math.ceil(totalTx / PAGE_SIZE))
  const paginatedTransactions = (cashTransactions || []).slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const [transferForm, setTransferForm] = useState({
    fromTreasuryId: treasuryAccounts.find((t) => t.type === 'van_cash')?.id || treasuryAccounts[1]?.id || defaultTreasuryId,
    toTreasuryId: defaultTreasuryId,
    amount: '',
    senderName: 'المندوب',
    notes: '',
  })

  const getTreasuryIcon = (type) => {
    switch (type) {
      case 'bank':
        return <Building2 className="w-5 h-5 text-secondary" />
      case 'wallet':
        return <Smartphone className="w-5 h-5 text-error" />
      case 'instapay':
        return <CreditCard className="w-5 h-5 text-primary" />
      case 'van_cash':
        return <Truck className="w-5 h-5 text-amber-600" />
      default:
        return <Wallet className="w-5 h-5 text-primary" />
    }
  }

  const getTreasuryName = (id) => {
    const acc = treasuryAccounts.find((t) => t.id === id)
    return acc?.name || (id ? '[حساب محذوف]' : '—')
  }

  const handleDeleteAccountClick = (account) => {
    const relatedTx = (cashTransactions || []).filter((tx) => tx.treasuryId === account.id).length
    const relatedInv = (invoices || []).filter((inv) => inv.treasuryId === account.id).length
    const relatedTrf = (pendingCashTransfers || []).filter((p) => p.fromTreasuryId === account.id || p.toTreasuryId === account.id).length
    const total = relatedTx + relatedInv + relatedTrf
    setDeletingAccount({
      ...account,
      hasOperations: total > 0,
      operationsCount: total,
    })
  }

  const handleCreateCashTransfer = (e) => {
    e.preventDefault()
    if (!transferForm.amount || Number(transferForm.amount) <= 0) return
    if (transferForm.fromTreasuryId === transferForm.toTreasuryId) return

    const newPct = {
      id: generateUUID(),
      code: `CTRF-${Date.now().toString().slice(-4)}`,
      fromTreasuryId: transferForm.fromTreasuryId,
      toTreasuryId: transferForm.toTreasuryId,
      amount: Number(transferForm.amount),
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      senderName: transferForm.senderName || 'أمين الخزينة',
      notes: transferForm.notes || 'تحويل نقدي بين الخزن',
    }

    addPendingCashTransfer(newPct)
    setShowTransferModal(false)
  }

  const pendingTransfersList = (pendingCashTransfers || []).filter((p) => p && p.status === 'pending')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-on-surface-variant">
          قنوات الدفع: {(treasuryAccounts || []).length} خزينة وحساب
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddTreasuryModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-low hover:bg-surface-container border border-outline-variant/30 text-xs font-black text-on-surface transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>إضافة خزينة / حساب</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-white text-xs font-black shadow-level1 hover:bg-secondary-hover transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>تحويل بين الخزن</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExpenseCategoriesModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-lowest border border-outline-variant/40 hover:bg-surface-container text-xs font-black text-on-surface shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <FolderTree className="w-4 h-4 text-primary" />
            <span>إدارة بنود المصروفات</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTransactionModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-black shadow-level1 hover:bg-primary-dark transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>سند قبض / صرف مباشر</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch gap-3">
        <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-3xl p-4 shadow-level2 md:w-64 shrink-0 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/80">إجمالي السيولة النقدية</span>
            <span className="p-1.5 rounded-xl bg-white/15">
              <Landmark className="w-4 h-4 text-white" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black font-mono">
              {(treasuryAccounts || []).reduce((sum, a) => sum + (Number(a.balance) || 0), 0).toLocaleString('en-US')} ج.م
            </div>
          </div>
          <span className="text-[11px] text-white/70">{(treasuryAccounts || []).length} قنوات دفع مفعّلة</span>
        </div>

        <div className="flex-1 min-w-0 flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x">
          {(treasuryAccounts || []).map((account) => (
            <div
              key={account.id}
              className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 shadow-level1 min-w-[210px] sm:min-w-[230px] shrink-0 snap-start flex flex-col justify-between space-y-2 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-surface-low border border-outline-variant/20">
                  {getTreasuryIcon(account.type)}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-low text-on-surface-variant border border-outline-variant/20">
                    {account.type === 'bank' ? 'بنكي' : account.type === 'wallet' ? 'محفظة' : account.type === 'instapay' ? 'إنستاباي' : account.type === 'van_cash' ? 'عهدة سيارة' : 'كاش'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingAccount(account)}
                    className="p-1 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                    title="تعديل الحساب"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAccountClick(account)}
                    className="p-1 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                    title="حذف الحساب"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant block truncate" title={account.name}>{account.name}</span>
                <div className="text-base font-black font-mono text-on-surface mt-1">
                  {(Number(account.balance) || 0).toLocaleString('en-US')} ج.م
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowAddTreasuryModal(true)}
            className="border-2 border-dashed border-outline-variant/50 hover:border-primary rounded-3xl p-4 min-w-[130px] shrink-0 snap-start flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:text-primary transition-all cursor-pointer group"
          >
            <span className="w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
              <Plus className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold whitespace-nowrap">إضافة حساب</span>
          </button>
        </div>
      </div>

      {pendingTransfersList.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-5 shadow-level1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
              تحويلات نقدية معلقة بانتظار إقرار الاستلام ({pendingTransfersList.length})
            </span>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-800">
              لا تسمع في الخزنة المستلمة إلا بعد الضغط على التأكيد
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingTransfersList.map((pct) => (
              <div
                key={pct.id}
                className="bg-surface-lowest border border-amber-500/30 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3"
              >
                <div className="space-y-1 text-right">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-700">{pct.code}</span>
                    <span className="text-[11px] text-on-surface-variant">{pct.date}</span>
                  </div>
                  <div className="text-base font-black font-mono text-primary">
                    {(Number(pct.amount) || 0).toLocaleString('en-US')} ج.م
                  </div>
                  <div className="text-xs text-on-surface-variant flex items-center gap-1.5 pt-1">
                    <span className="font-bold">{getTreasuryName(pct.fromTreasuryId)}</span>
                    <span>←</span>
                    <span className="font-bold text-primary">{getTreasuryName(pct.toTreasuryId)}</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">المرسل: {pct.senderName} • {pct.notes}</p>
                </div>

                <div className="pt-2 border-t border-surface-container flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-600">في الطريق</span>
                  <button
                    type="button"
                    onClick={() => confirmCashTransfer(pct.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-extrabold hover:bg-primary-dark shadow-sm transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تأكيد الاستلام</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {showTransferModal && (
        <form
          onSubmit={handleCreateCashTransfer}
          className="bg-surface-lowest border-2 border-secondary/30 rounded-3xl p-6 shadow-level2 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-surface-container pb-3">
            <span className="text-sm font-black text-on-surface flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-secondary" />
              تحويل بين الخزن
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant block">من خزينة</label>
              <AX_SearchableSelect
                value={transferForm.fromTreasuryId}
                onChange={(val) => setTransferForm({ ...transferForm, fromTreasuryId: val })}
                options={(treasuryAccounts || []).map((t) => ({
                  value: t.id,
                  label: t.name,
                  badge: `${(Number(t.balance) || 0).toLocaleString('en-US')} ج.م`,
                }))}
                placeholder="من خزينة..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant block">إلى خزينة</label>
              <AX_SearchableSelect
                value={transferForm.toTreasuryId}
                onChange={(val) => setTransferForm({ ...transferForm, toTreasuryId: val })}
                options={(treasuryAccounts || [])
                  .filter((t) => t.id !== transferForm.fromTreasuryId)
                  .map((t) => ({
                    value: t.id,
                    label: t.name,
                    badge: `${(Number(t.balance) || 0).toLocaleString('en-US')} ج.م`,
                  }))}
                placeholder="إلى خزينة..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant">المبلغ المحول (ج.م)</label>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              className="px-5 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-secondary text-white text-xs font-extrabold shadow-sm hover:bg-secondary-hover cursor-pointer"
            >
              إرسال إذن التحويل المالي
            </button>
          </div>
        </form>
      )}

      <AX_TreasuryTransactionsTable
        paginatedTransactions={paginatedTransactions}
        getTreasuryName={getTreasuryName}
        totalPages={totalPages}
        currentPage={currentPage}
        totalTx={totalTx}
        onPageChange={setCurrentPage}
      />

      <button
        type="button"
        onClick={() => setShowTransactionModal(true)}
        className="fixed bottom-20 lg:bottom-6 left-6 z-30 flex items-center gap-2 px-5 py-3 rounded-full bg-primary hover:bg-primary-dark text-white font-black text-xs sm:text-sm shadow-level3 active:scale-95 transition-all cursor-pointer"
        title="إصدار سند مالي جديد"
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>إصدار سند مالي</span>
      </button>

      <AX_TreasuryTransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        treasuryAccounts={treasuryAccounts}
        clients={clients}
        suppliers={suppliers}
        employees={employees}
        onSave={addCashTransaction}
      />

      <AX_AddTreasuryModal
        isOpen={showAddTreasuryModal}
        onClose={() => setShowAddTreasuryModal(false)}
        onSave={addTreasuryAccount}
      />

      <AX_AddTreasuryModal
        isOpen={Boolean(editingAccount)}
        onClose={() => setEditingAccount(null)}
        editingAccount={editingAccount}
        onSave={(updated) => {
          updateTreasuryAccount(updated)
          setEditingAccount(null)
        }}
      />

      <AX_ConfirmModal
        isOpen={Boolean(deletingAccount)}
        title="حذف الحساب المالي"
        message={
          deletingAccount?.hasOperations
            ? `تنبيه: الحساب المالي (${deletingAccount?.name}) مرتبط بـ (${deletingAccount?.operationsCount}) حركة تاريخية وسندات. سيتم حذف الحساب وخصم رصيده (${(Number(deletingAccount?.balance) || 0).toLocaleString('en-US')} ج.م) من السيولة، وستظل العمليات السابقة موثقة مع وسم [حساب محذوف]. هل تريد المتابعة وحذف الحساب؟`
            : `هل أنت متأكد من حذف الحساب / الخزينة (${deletingAccount?.name}) نهائياً وخصم رصيده من السيولة؟`
        }
        confirmText="تأكيد حذف الحساب"
        cancelText="إلغاء"
        isDestructive={true}
        requireHold={true}
        onConfirm={() => {
          deleteTreasuryAccount(deletingAccount.id)
          setDeletingAccount(null)
        }}
        onCancel={() => setDeletingAccount(null)}
      />

      <AX_ExpenseCategoriesModal
        isOpen={showExpenseCategoriesModal}
        onClose={() => setShowExpenseCategoriesModal(false)}
      />
    </div>
  )
}

export default AX_TreasuryLedger