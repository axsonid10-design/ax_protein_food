import React, { useState, useMemo } from 'react'
import {
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import {
  formatCurrency,
  filterByDateRange,
  exportToCsv,
} from '../../utils/reportCalculations'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'

export function AX_Ledger360Report({
  clients = [],
  suppliers = [],
  invoices = [],
  cashTransactions = [],
  timeframe = 'all',
  customStart = '',
  customEnd = '',
}) {
  const [partyType, setPartyType] = useState('client')
  const [selectedPartyId, setSelectedPartyId] = useState(() => clients[0]?.id || '')
  const [expandedRowId, setExpandedRowId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const partiesList = partyType === 'client' ? clients : suppliers
  const currentParty = partiesList.find((p) => p.id === selectedPartyId) || partiesList[0]

  const ledgerData = useMemo(() => {
    if (!currentParty) {
      return { initialBalance: 0, finalBalance: 0, totalDebit: 0, totalCredit: 0, transactions: [] }
    }

    const partyName = currentParty.name
    const partyInvoices = invoices.filter((inv) => inv.partyName === partyName)
    const partyCash = cashTransactions.filter((tx) => tx.partyName === partyName)
    const unifiedList = []

    const recordedInvoiceCodes = new Set(
      partyInvoices.filter((i) => (Number(i.paidAmount) || 0) > 0).map((i) => i.code)
    )

    partyInvoices.forEach((inv) => {
      const amount = Number(inv.total) || 0
      const paid = Number(inv.paidAmount) || 0

      let typeLabel = 'فاتورة بيع'
      let debit = 0
      let credit = 0

      if (inv.type === 'sale') {
        typeLabel = 'فاتورة بيع'
        debit = amount
      } else if (inv.type === 'sale_return') {
        typeLabel = 'مردود مبيعات'
        credit = amount
      } else if (inv.type === 'purchase') {
        typeLabel = 'فاتورة شراء'
        credit = amount
      } else if (inv.type === 'purchase_return') {
        typeLabel = 'مردود مشتريات'
        debit = amount
      }

      unifiedList.push({
        id: inv.id,
        code: inv.code,
        date: inv.date || '2026-10-28',
        type: typeLabel,
        category: 'invoice',
        debit,
        credit,
        items: inv.items || [],
        transport: Number(inv.transportCost) || 0,
        loading: Number(inv.loadingCost) || 0,
        notes: inv.paymentTerms || '',
      })

      if (paid > 0) {
        const isClientIn = inv.type === 'sale'
        const isClientOut = inv.type === 'sale_return'
        const isSupplierOut = inv.type === 'purchase'
        const paidLabel = isClientIn ? 'تحصيل من عميل' : isClientOut ? 'رد نقدي لعميل' : isSupplierOut ? 'سداد لمورد' : 'استرداد نقدي من مورد'
        const paidDebit = isClientOut || isSupplierOut ? paid : 0
        const paidCredit = isClientIn || (!isClientOut && !isSupplierOut) ? paid : 0

        unifiedList.push({
          id: `${inv.id}-paid`,
          code: `سداد-${inv.code}`,
          date: inv.date || '2026-10-28',
          type: paidLabel,
          category: 'payment',
          debit: paidDebit,
          credit: paidCredit,
          items: [],
          notes: `سداد مسجل على الفاتورة ${inv.code}`,
        })
      }
    })

    partyCash.forEach((tx) => {
      const isLinkedToInvoice = tx.notes && Array.from(recordedInvoiceCodes).some((code) => tx.notes.includes(code))
      if (isLinkedToInvoice) return

      const isClientReceipt = tx.type === 'client_receipt' || tx.type === 'in'
      const amt = Number(tx.amount) || 0

      unifiedList.push({
        id: tx.id,
        code: tx.code,
        date: tx.date || '2026-10-28',
        type: isClientReceipt ? 'سند قبض نقدية' : 'سند صرف نقدية',
        category: 'payment',
        debit: isClientReceipt ? 0 : amt,
        credit: isClientReceipt ? amt : 0,
        items: [],
        notes: tx.notes || 'سند نقدي مباشر على الحساب',
      })
    })

    unifiedList.sort((a, b) => new Date(a.date) - new Date(b.date))
    const filtered = filterByDateRange(unifiedList, 'date', timeframe, customStart, customEnd)

    let running = 0
    let totalDebit = 0
    let totalCredit = 0

    const transactions = filtered.map((item) => {
      totalDebit += item.debit
      totalCredit += item.credit
      running += item.debit - item.credit
      return { ...item, balance: running }
    })

    const initialBalance = Math.max(0, (Number(currentParty.balance) || 0) - running)
    const finalBalance = initialBalance + running

    return {
      initialBalance,
      finalBalance,
      totalDebit,
      totalCredit,
      transactions,
    }
  }, [currentParty, invoices, cashTransactions, timeframe, customStart, customEnd])

  const totalPages = Math.ceil(ledgerData.transactions.length / pageSize) || 1
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return ledgerData.transactions.slice(start, start + pageSize)
  }, [ledgerData.transactions, currentPage])

  const handleExport = () => {
    const headers = ['التاريخ', 'رقم المستند', 'نوع الحركة', 'مدين (ج.م)', 'دائن (ج.م)', 'الرصيد التراكمي (ج.م)', 'ملاحظات']
    const data = ledgerData.transactions.map((t) => [
      t.date,
      t.code,
      t.type,
      t.debit,
      t.credit,
      t.balance,
      t.notes,
    ])
    exportToCsv(`كشف_حساب_${currentParty?.name || 'طرف'}_${new Date().toISOString().split('T')[0]}`, headers, data)
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-on-surface">
              كشف حساب تفصيلي 360° (Detailed Ledger)
            </h3>
            <span className="text-[11px] font-bold text-on-surface-variant">
              تتبع الحركات المالية، الفواتير، السندات، والرصيد التراكمي للحساب
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleExport}
              className="px-3.5 py-1.5 rounded-full bg-surface-low hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>تصدير Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-full bg-primary text-white hover:bg-primary-dark text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة A4</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-surface-container">
          <div className="flex items-center gap-1 p-1 bg-surface-low rounded-full border border-outline-variant/30 shrink-0">
            <button
              type="button"
              onClick={() => {
                setPartyType('client')
                setSelectedPartyId(clients[0]?.id || '')
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                partyType === 'client' ? 'bg-primary text-white shadow-xs' : 'text-on-surface hover:text-primary'
              }`}
            >
              عملاء التوزيع
            </button>
            <button
              type="button"
              onClick={() => {
                setPartyType('supplier')
                setSelectedPartyId(suppliers[0]?.id || '')
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                partyType === 'supplier' ? 'bg-primary text-white shadow-xs' : 'text-on-surface hover:text-primary'
              }`}
            >
              موردي الخامات
            </button>
          </div>

          <div className="flex-1 min-w-[200px]">
            <AX_SearchableSelect
              value={currentParty?.id || ''}
              onChange={setSelectedPartyId}
              options={partiesList.map((p) => ({
                value: p.id,
                label: p.name,
                sublabel: p.address || p.phone,
                badge: `${(Number(p.balance) || 0).toLocaleString('en-US')} ج.م`,
              }))}
              placeholder="اختر الحساب..."
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-on-surface-variant">رصيد أول المدة</div>
          <div className="text-base sm:text-lg font-black text-on-surface mt-1">
            {formatCurrency(ledgerData.initialBalance)}
          </div>
          <div className="text-[10px] font-bold text-on-surface-variant mt-0.5">
            {currentParty?.phone || 'بدون هاتف'}
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-on-surface-variant">إجمالي حركات المدين (+)</div>
          <div className="text-base sm:text-lg font-black text-primary mt-1">
            {formatCurrency(ledgerData.totalDebit)}
          </div>
          <div className="text-[10px] font-bold text-on-surface-variant mt-0.5">
            فواتير ومستحقات
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-on-surface-variant">إجمالي حركات الدائن (-)</div>
          <div className="text-base sm:text-lg font-black text-emerald-600 mt-1">
            {formatCurrency(ledgerData.totalCredit)}
          </div>
          <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
            سدادات ومقبوضات
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-on-surface-variant">الرصيد الختامي المستحق</div>
          <div className="text-base sm:text-lg font-black text-rose-700 mt-1">
            {formatCurrency(ledgerData.finalBalance)}
          </div>
          <div className="text-[10px] font-bold text-rose-700 mt-0.5">
            صافي المديونية الحالية
          </div>
        </div>
      </div>

      <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-surface-low/80 border-b border-surface-container text-on-surface-variant font-black h-11">
                <th className="px-3.5 whitespace-nowrap">التاريخ</th>
                <th className="px-3.5 whitespace-nowrap">رقم المستند</th>
                <th className="px-3.5 whitespace-nowrap">نوع الحركة</th>
                <th className="px-3.5">البيان والملاحظات</th>
                <th className="px-3.5 text-left whitespace-nowrap">مدين (+)</th>
                <th className="px-3.5 text-left whitespace-nowrap">دائن (-)</th>
                <th className="px-3.5 text-left whitespace-nowrap">الرصيد التراكمي</th>
                <th className="px-3.5 text-center whitespace-nowrap">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container/60 font-bold">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-on-surface-variant text-xs">
                    لا توجد حركات مسجلة لهذا الحساب في الفترة المحددة
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isExpanded = expandedRowId === tx.id
                  const hasItems = tx.items && tx.items.length > 0

                  return (
                    <React.Fragment key={tx.id}>
                      <tr className="hover:bg-surface-low/40 transition-colors h-11">
                        <td className="px-3.5 font-mono text-on-surface-variant whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="px-3.5 font-mono font-black text-primary whitespace-nowrap">
                          {tx.code}
                        </td>
                        <td className="px-3.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              tx.category === 'invoice'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-3.5 text-on-surface-variant text-[11px] max-w-[220px] truncate">
                          {tx.notes}
                        </td>
                        <td className="px-3.5 text-left font-mono font-black text-on-surface whitespace-nowrap">
                          {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                        </td>
                        <td className="px-3.5 text-left font-mono font-black text-emerald-600 whitespace-nowrap">
                          {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                        </td>
                        <td className="px-3.5 text-left font-mono font-black text-on-surface whitespace-nowrap">
                          {formatCurrency(tx.balance)}
                        </td>
                        <td className="px-3.5 text-center whitespace-nowrap">
                          {hasItems ? (
                            <button
                              type="button"
                              onClick={() => setExpandedRowId(isExpanded ? null : tx.id)}
                              className="p-1 rounded-full hover:bg-surface-low text-primary cursor-pointer transition-all"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          ) : (
                            <span className="text-on-surface-variant text-[10px]">-</span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && hasItems && (
                        <tr className="bg-surface-low/30">
                          <td colSpan={8} className="p-3 text-xs">
                            <div className="bg-surface-lowest rounded-xl p-3 border border-outline-variant/30 space-y-2">
                              <span className="text-[11px] font-black text-primary block">
                                بنود الفاتورة المصغرة:
                              </span>
                              <div className="divide-y divide-surface-container/50 text-[11px]">
                                {tx.items.map((line, idx) => (
                                  <div key={idx} className="py-1.5 flex items-center justify-between">
                                    <span className="font-bold text-on-surface">
                                      {line.compositeName || line.name || 'صنف'}
                                    </span>
                                    <span className="font-mono text-on-surface-variant">
                                      {line.quantity} {line.unit} × {formatCurrency(line.price)} ={' '}
                                      <strong className="text-on-surface">{formatCurrency(line.total)}</strong>
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {(tx.transport > 0 || tx.loading > 0) && (
                                <div className="pt-1.5 border-t border-surface-container/50 flex items-center gap-3 text-[10px] font-bold text-on-surface-variant">
                                  {tx.transport > 0 && <span>نقل: {formatCurrency(tx.transport)}</span>}
                                  {tx.loading > 0 && <span>شيالة: {formatCurrency(tx.loading)}</span>}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden divide-y divide-surface-container/60 p-3 space-y-2.5">
          {paginatedTransactions.length === 0 ? (
            <div className="py-6 text-center text-on-surface-variant text-xs font-bold">
              لا توجد حركات مسجلة لهذا الحساب في الفترة المحددة
            </div>
          ) : (
            paginatedTransactions.map((tx) => (
              <div key={tx.id} className="bg-surface-low/50 rounded-2xl p-3 space-y-2 border border-outline-variant/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-black text-primary">{tx.code}</span>
                  <span className="font-mono text-[10px] text-on-surface-variant">{tx.date}</span>
                </div>
                <div className="text-xs font-bold text-on-surface">{tx.type} - {tx.notes}</div>
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-surface-container/50 text-[10px] font-mono font-bold">
                  <div>
                    <span className="text-on-surface-variant block">مدين:</span>
                    <span className="text-on-surface">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">دائن:</span>
                    <span className="text-emerald-600">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">الرصيد:</span>
                    <span className="text-rose-700 font-black">{formatCurrency(tx.balance)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-surface-container text-xs font-bold text-on-surface-variant">
            <span>
              عرض {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, ledgerData.transactions.length)} من {ledgerData.transactions.length} حركة
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-full hover:bg-surface-low disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-on-surface font-black">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-full hover:bg-surface-low disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AX_Ledger360Report
