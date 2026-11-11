import React, { useState, useMemo } from 'react'
import {
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Trash2,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { AX_TreasuryFilterBar } from './AX_TreasuryFilterBar'
import { getLocalTodayStr } from '../../utils/dateHelpers'

export function AX_TreasuryTransactionsTable({
  transactions = [],
  paginatedTransactions: legacyPaginated = [],
  treasuryAccounts = [],
  clients: propClients,
  suppliers: propSuppliers,
  getTreasuryName,
  onDeleteTransaction,
}) {
  const storeClients = useAXStore((state) => state.clients) || []
  const storeSuppliers = useAXStore((state) => state.suppliers) || []
  const clients = propClients || storeClients
  const suppliers = propSuppliers || storeSuppliers

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTreasuryId, setSelectedTreasuryId] = useState('ALL')
  const [selectedType, setSelectedType] = useState('ALL')
  const [dateMode, setDateMode] = useState('all')
  const [singleDate, setSingleDate] = useState(() => getLocalTodayStr())
  const [fromDate, setFromDate] = useState(() => getLocalTodayStr())
  const [toDate, setToDate] = useState(() => getLocalTodayStr())
  const [partyKindFilter, setPartyKindFilter] = useState('ALL')
  const [selectedPartyKey, setSelectedPartyKey] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [txToDelete, setTxToDelete] = useState(null)
  const PAGE_SIZE = 15

  const rawList = transactions.length > 0 ? transactions : legacyPaginated

  const partyOptions = useMemo(() => {
    const opts = [{ value: 'ALL', label: 'جميع العملاء والموردين' }]
    if (partyKindFilter === 'ALL' || partyKindFilter === 'client') {
      clients.forEach((c) => {
        if (!c?.name) return
        opts.push({
          value: `client:${c.id}`,
          label: `${c.name}`,
          badge: 'عميل',
          partyId: c.id,
          partyName: c.name,
          partyKind: 'client',
        })
      })
    }
    if (partyKindFilter === 'ALL' || partyKindFilter === 'supplier') {
      suppliers.forEach((s) => {
        const sName = s?.name || s?.companyName
        if (!sName) return
        opts.push({
          value: `supplier:${s.id}`,
          label: `${sName}`,
          badge: 'مورد',
          partyId: s.id,
          partyName: sName,
          partyKind: 'supplier',
        })
      })
    }
    return opts
  }, [clients, suppliers, partyKindFilter])

  const selectedPartyObj = useMemo(
    () => partyOptions.find((o) => o.value === selectedPartyKey) || null,
    [partyOptions, selectedPartyKey]
  )

  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const todayStr = getLocalTodayStr()

    return rawList.filter((tx) => {
      if (!tx) return false
      if (selectedTreasuryId !== 'ALL' && (tx.treasuryId || tx.treasury_id) !== selectedTreasuryId) return false

      const isPayroll = tx.type === 'payroll' || tx.notes?.startsWith('[أجور ومرتبات]')
      const isExpense = tx.type === 'expense' && !isPayroll
      const isInflow = tx.type === 'client_receipt' || tx.type === 'other_income' || tx.type === 'misc_revenue'
      const isOutflow = !isInflow

      if (selectedType === 'inflow' && !isInflow) return false
      if (selectedType === 'outflow' && !isOutflow) return false
      if (selectedType === 'client_receipt' && tx.type !== 'client_receipt') return false
      if (selectedType === 'supplier_payment' && tx.type !== 'supplier_payment') return false
      if (selectedType === 'expense' && !isExpense) return false
      if (selectedType === 'payroll' && !isPayroll) return false
      if (selectedType === 'other_income' && tx.type !== 'other_income' && tx.type !== 'misc_revenue') return false

      const txDateStr = String(tx.operationalDate || tx.date || tx.createdAt || '').slice(0, 10)
      if (dateMode === 'today' && txDateStr !== todayStr) return false
      if (dateMode === 'single' && singleDate && txDateStr !== singleDate) return false
      if (dateMode === 'range') {
        if (fromDate && txDateStr < fromDate) return false
        if (toDate && txDateStr > toDate) return false
      }

      if (partyKindFilter === 'client') {
        const isClientTx = tx.partyType === 'client' || tx.type === 'client_receipt'
        if (!isClientTx) return false
      } else if (partyKindFilter === 'supplier') {
        const isSupplierTx = tx.partyType === 'supplier' || tx.type === 'supplier_payment'
        if (!isSupplierTx) return false
      }

      if (selectedPartyKey !== 'ALL' && selectedPartyObj) {
        const txPartyId = tx.partyId || tx.party_id || null
        const txPartyName = (tx.partyName || tx.party_name || '').trim()
        const targetName = (selectedPartyObj.partyName || '').trim()
        const matchedById = txPartyId && selectedPartyObj.partyId && txPartyId === selectedPartyObj.partyId
        const matchedByName = !txPartyId && txPartyName && txPartyName === targetName
        const matchedDirectName = txPartyName && txPartyName === targetName
        if (!matchedById && !matchedByName && !matchedDirectName) return false
      }

      if (q) {
        const hay = [tx.code, tx.partyName, tx.notes, tx.date].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [
    rawList,
    searchTerm,
    selectedTreasuryId,
    selectedType,
    dateMode,
    singleDate,
    fromDate,
    toDate,
    partyKindFilter,
    selectedPartyKey,
    selectedPartyObj,
  ])

  const summary = useMemo(() => {
    let inflow = 0
    let inflowCount = 0
    let outflow = 0
    let outflowCount = 0
    filteredList.forEach((tx) => {
      const amt = Number(tx.amount) || 0
      const isIn = tx.type === 'client_receipt' || tx.type === 'other_income' || tx.type === 'misc_revenue'
      if (isIn) {
        inflow += amt
        inflowCount += 1
      } else {
        outflow += amt
        outflowCount += 1
      }
    })
    return {
      inflow,
      inflowCount,
      outflow,
      outflowCount,
      net: inflow - outflow,
    }
  }, [filteredList])

  const hasActiveFilters =
    selectedType !== 'ALL' ||
    selectedTreasuryId !== 'ALL' ||
    dateMode !== 'all' ||
    partyKindFilter !== 'ALL' ||
    selectedPartyKey !== 'ALL' ||
    Boolean(searchTerm.trim())

  const handleResetFilters = () => {
    setSelectedType('ALL')
    setSelectedTreasuryId('ALL')
    setDateMode('all')
    setPartyKindFilter('ALL')
    setSelectedPartyKey('ALL')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const totalTx = filteredList.length
  const totalPages = Math.max(1, Math.ceil(totalTx / PAGE_SIZE))
  const paginatedTransactions = filteredList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 shadow-level1 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          سجل حركات النقدية ({totalTx})
        </h3>
      </div>

      <AX_TreasuryFilterBar
        searchTerm={searchTerm}
        onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1) }}
        selectedTreasuryId={selectedTreasuryId}
        onTreasuryChange={(v) => { setSelectedTreasuryId(v); setCurrentPage(1) }}
        treasuryAccounts={treasuryAccounts}
        selectedType={selectedType}
        onTypeChange={(v) => { setSelectedType(v); setCurrentPage(1) }}
        dateMode={dateMode}
        onDateModeChange={(v) => { setDateMode(v); setCurrentPage(1) }}
        singleDate={singleDate}
        onSingleDateChange={(v) => { setSingleDate(v); setCurrentPage(1) }}
        fromDate={fromDate}
        onFromDateChange={(v) => { setFromDate(v); setCurrentPage(1) }}
        toDate={toDate}
        onToDateChange={(v) => { setToDate(v); setCurrentPage(1) }}
        partyKindFilter={partyKindFilter}
        onPartyKindChange={(v) => { setPartyKindFilter(v); setSelectedPartyKey('ALL'); setCurrentPage(1) }}
        selectedPartyKey={selectedPartyKey}
        onPartyChange={(v) => { setSelectedPartyKey(v); setCurrentPage(1) }}
        partyOptions={partyOptions}
        summary={summary}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetFilters}
        onQuickTodayInflow={() => {
          setSelectedType('inflow')
          setDateMode('today')
          setCurrentPage(1)
        }}
        onQuickTodayOutflow={() => {
          setSelectedType('outflow')
          setDateMode('today')
          setCurrentPage(1)
        }}
      />

      <div className="hidden lg:block overflow-hidden rounded-2xl border border-surface-container">
        <table className="w-full text-right text-xs">
          <thead className="bg-surface-low border-b border-surface-container text-on-surface-variant font-black">
            <tr className="h-11">
              <th className="px-3.5 whitespace-nowrap">كود السند</th>
              <th className="px-3.5 whitespace-nowrap">النوع</th>
              <th className="px-3.5 whitespace-nowrap">الطرف</th>
              <th className="px-3.5 whitespace-nowrap">الخزينة</th>
              <th className="px-3.5 whitespace-nowrap">المبلغ</th>
              <th className="px-3.5 whitespace-nowrap">التاريخ</th>
              <th className="px-3.5 whitespace-nowrap">البيان</th>
              {onDeleteTransaction && <th className="px-3.5 whitespace-nowrap text-center">إجراء</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container text-on-surface font-bold">
            {paginatedTransactions.map((tx) => {
              const isPayroll = tx.type === 'payroll' || tx.notes?.startsWith('[أجور ومرتبات]')
              const isExpense = tx.type === 'expense' && !isPayroll
              return (
                <tr key={tx.id} className="h-11 hover:bg-surface-low/50 transition-colors">
                  <td className="px-3.5 whitespace-nowrap font-mono text-primary font-black">{tx.code}</td>
                  <td className="px-3.5 whitespace-nowrap">
                    {tx.type === 'client_receipt' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                        <ArrowDownLeft className="w-3 h-3" /> وارد قبض
                      </span>
                    ) : (tx.type === 'other_income' || tx.type === 'misc_revenue') ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 border border-teal-500/20">
                        <ArrowDownLeft className="w-3 h-3" /> إيرادات متنوعة
                      </span>
                    ) : isExpense ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                        <ArrowUpRight className="w-3 h-3" /> صادر مصروف
                      </span>
                    ) : isPayroll ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 border border-purple-500/20">
                        <ArrowUpRight className="w-3 h-3" /> صادر أجور
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-error-container/40 text-error">
                        <ArrowUpRight className="w-3 h-3" /> صادر سداد
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 whitespace-nowrap font-black">
                    {tx.partyName || (tx.expenseMainCategoryName ? `[${[tx.expenseMainCategoryName, tx.expenseSubCategoryName, tx.expenseSecondaryCategoryName].filter(Boolean).join(' / ')}]` : '-')}
                  </td>
                  <td className="px-3.5 whitespace-nowrap text-on-surface-variant">{getTreasuryName(tx.treasuryId)}</td>
                  <td className="px-3.5 whitespace-nowrap font-mono font-black text-sm">
                    {(Number(tx.amount) || 0).toLocaleString('en-US')} ج.م
                  </td>
                  <td className="px-3.5 whitespace-nowrap text-on-surface-variant font-mono">
                    <span>{tx.date}</span>
                    {tx.createdAt && (
                      <span className="text-[10px] text-on-surface-variant/70 mr-1.5">
                        قيد: {String(tx.createdAt).slice(11, 16) || String(tx.createdAt).slice(0, 10)}
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 whitespace-nowrap text-on-surface-variant text-[11px] truncate max-w-xs">{tx.notes}</td>
                  {onDeleteTransaction && (
                    <td className="px-3.5 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => setTxToDelete(tx)}
                        className="p-1.5 rounded-full text-error hover:bg-error-container/30 transition-colors cursor-pointer"
                        title="حذف وإلغاء السند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {paginatedTransactions.map((tx) => {
          const isPayroll = tx.type === 'payroll' || tx.notes?.startsWith('[أجور ومرتبات]')
          const isExpense = tx.type === 'expense' && !isPayroll
          return (
            <div
              key={tx.id}
              className="bg-surface-low/50 border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary">{tx.code}</span>
                <div className="text-left font-mono">
                  <span className="text-xs text-on-surface-variant block">{tx.date}</span>
                  {tx.createdAt && (
                    <span className="text-[10px] text-on-surface-variant/70 block">
                      قيد: {String(tx.createdAt).slice(11, 16)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-black text-sm text-on-surface block">
                    {tx.partyName || (tx.expenseMainCategoryName ? `[${[tx.expenseMainCategoryName, tx.expenseSubCategoryName, tx.expenseSecondaryCategoryName].filter(Boolean).join(' / ')}]` : '-')}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    {tx.type === 'client_receipt' ? 'وارد قبض' : (tx.type === 'other_income' || tx.type === 'misc_revenue') ? 'إيرادات متنوعة' : isExpense ? 'مصروف' : isPayroll ? 'أجور' : 'سداد مورد'}
                  </span>
                </div>
                <span className="font-mono font-black text-sm text-primary">
                  {(Number(tx.amount) || 0).toLocaleString('en-US')} ج.م
                </span>
              </div>
              <div className="text-xs text-on-surface-variant flex items-center justify-between pt-2 border-t border-surface-container">
                <span>{getTreasuryName(tx.treasuryId)}</span>
                <div className="flex items-center gap-2">
                  <span className="italic truncate max-w-[150px]">{tx.notes}</span>
                  {onDeleteTransaction && (
                    <button
                      type="button"
                      onClick={() => setTxToDelete(tx)}
                      className="p-1 rounded-full text-error hover:bg-error-container/30 cursor-pointer"
                      title="حذف السند"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-surface-container text-xs font-bold">
          <span className="text-on-surface-variant font-mono">
            إجمالي الحركات: {totalTx} • صفحة {currentPage} من {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-full bg-surface-low border border-outline-variant/30 disabled:opacity-40 hover:bg-surface-container transition-all"
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-black">
              {currentPage}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-full bg-surface-low border border-outline-variant/30 disabled:opacity-40 hover:bg-surface-container transition-all"
              title="الصفحة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AX_ConfirmModal
        isOpen={Boolean(txToDelete)}
        title="تأكيد إلغاء وحذف السند المالي"
        message={txToDelete ? `هل أنت متأكد من حذف السند (${txToDelete.code}) بمبلغ ${(Number(txToDelete.amount) || 0).toLocaleString('en-US')} ج.م؟ سيتم عكس تأثيره المالي على الخزينة والطرف المعني فوراً.` : ''}
        confirmText="تأكيد الحذف وعكس الرصيد"
        cancelText="تراجع"
        isDestructive={true}
        onConfirm={() => {
          if (txToDelete && onDeleteTransaction) onDeleteTransaction(txToDelete.id)
          setTxToDelete(null)
        }}
        onCancel={() => setTxToDelete(null)}
      />
    </div>
  )
}

export default AX_TreasuryTransactionsTable
