import React, { useState, useMemo } from 'react'
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  DollarSign,
  Printer,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import {
  formatCurrency,
  formatNumber,
  filterByDateRange,
  exportToCsv,
} from '../../utils/reportCalculations'

export function AX_CashFlowReport({
  treasuryAccounts = [],
  cashTransactions = [],
  invoices = [],
  timeframe = 'all',
  customStart = '',
  customEnd = '',
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const totalCurrentBalance = useMemo(() => {
    return treasuryAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0)
  }, [treasuryAccounts])

  const accountsMap = useMemo(() => {
    const map = {}
    treasuryAccounts.forEach((acc) => {
      map[acc.id] = acc.name
    })
    return map
  }, [treasuryAccounts])

  const flowData = useMemo(() => {
    const list = []

    cashTransactions.forEach((tx) => {
      const isReceipt = tx.type === 'client_receipt' || tx.type === 'in'
      const amt = Number(tx.amount) || 0

      list.push({
        id: tx.id,
        code: tx.code,
        date: tx.date || '2026-10-28',
        type: isReceipt ? 'تحصيل نقدي' : 'سداد وصرف',
        isReceipt,
        partyName: tx.partyName || 'غير محدد',
        accountName: accountsMap[tx.treasuryId] || 'خزينة',
        amount: amt,
        notes: tx.notes || 'سند نقدي',
      })
    })

    invoices.forEach((inv) => {
      const paid = Number(inv.paidAmount) || 0
      if (paid > 0) {
        const isSale = inv.type === 'sale'
        list.push({
          id: `inv-cash-${inv.id}`,
          code: `سداد-${inv.code}`,
          date: inv.date || '2026-10-28',
          type: isSale ? 'تحصيل فاتورة بيع' : 'سداد فاتورة شراء',
          isReceipt: isSale,
          partyName: inv.partyName,
          accountName: 'الخزينة الرئيسية (الكاش المركزي)',
          amount: paid,
          notes: inv.paymentTerms || '',
        })
      }
    })

    list.sort((a, b) => new Date(b.date) - new Date(a.date))

    const filtered = filterByDateRange(list, 'date', timeframe, customStart, customEnd)

    let totalIn = 0
    let totalOut = 0

    filtered.forEach((item) => {
      if (item.isReceipt) {
        totalIn += item.amount
      } else {
        totalOut += item.amount
      }
    })

    const netFlow = totalIn - totalOut

    return {
      totalIn,
      totalOut,
      netFlow,
      items: filtered,
    }
  }, [cashTransactions, invoices, accountsMap, timeframe, customStart, customEnd])

  const totalPages = Math.ceil(flowData.items.length / pageSize) || 1
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return flowData.items.slice(start, start + pageSize)
  }, [flowData.items, currentPage])

  const handleExport = () => {
    const headers = ['التاريخ', 'رقم السند/الفاتورة', 'نوع الحركة', 'الطرف', 'الخزينة/الحساب', 'المبلغ (ج.م)', 'ملاحظات']
    const data = flowData.items.map((it) => [
      it.date,
      it.code,
      it.type,
      it.partyName,
      it.accountName,
      it.amount,
      it.notes,
    ])
    exportToCsv(`حركة_السيولة_والخزائن_${new Date().toISOString().split('T')[0]}`, headers, data)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/30">
        <div>
          <h3 className="text-sm sm:text-base font-black text-on-surface">
            تقرير حركة السيولة والخزائن (Cash Flow)
          </h3>
          <span className="text-[11px] font-bold text-on-surface-variant">
            متابعة المقبوضات والمدفوعات وصافي التدفق النقدي وأرصدة الحسابات
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
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-full bg-primary text-white hover:bg-primary-dark text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة A4</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>إجمالي رصيد الخزائن الحالي</span>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className="text-base sm:text-lg font-black text-on-surface mt-1">
            {formatCurrency(totalCurrentBalance)}
          </div>
          <div className="text-[10px] font-bold text-on-surface-variant mt-0.5">
            موزعة على {treasuryAccounts.length} حسابات وقنوات
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>المقبوضات والتحصيلات</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-600 mt-1">
            {formatCurrency(flowData.totalIn)}
          </div>
          <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
            تدفقات نقدية داخلة
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>المدفوعات والمصروفات</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-rose-700 mt-1">
            {formatCurrency(flowData.totalOut)}
          </div>
          <div className="text-[10px] font-bold text-rose-700 mt-0.5">
            تدفقات نقدية خارجة
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>صافي التدفق للفترة</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div
            className={`text-base sm:text-lg font-black mt-1 ${
              flowData.netFlow >= 0 ? 'text-primary' : 'text-rose-700'
            }`}
          >
            {formatCurrency(flowData.netFlow)}
          </div>
          <div className="text-[10px] font-bold text-on-surface-variant mt-0.5">
            الفارق بين الداخل والخارج
          </div>
        </div>
      </div>

      <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
        <h4 className="text-xs font-black text-on-surface mb-2.5">أرصدة قنوات النقدية والبنوك الحالية:</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {treasuryAccounts.map((acc) => (
            <div
              key={acc.id}
              className="p-2.5 rounded-xl bg-surface-low border border-outline-variant/30 space-y-1"
            >
              <span className="text-[10px] font-bold text-on-surface-variant block truncate">
                {acc.name}
              </span>
              <span className="text-xs font-mono font-black text-on-surface block">
                {formatCurrency(acc.balance)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-surface-low/80 border-b border-surface-container text-on-surface-variant font-black">
                <th className="py-3 px-3.5 whitespace-nowrap">التاريخ</th>
                <th className="py-3 px-3.5 whitespace-nowrap">رقم الحركة</th>
                <th className="py-3 px-3.5 whitespace-nowrap">نوع الحركة</th>
                <th className="py-3 px-3.5">الطرف المعني</th>
                <th className="py-3 px-3.5">الخزينة / الحساب</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">المبلغ</th>
                <th className="py-3 px-3.5">البيان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container/60 font-bold">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-on-surface-variant text-xs">
                    لا توجد حركات نقدية مسجلة في الفترة المحددة
                  </td>
                </tr>
              ) : (
                paginatedItems.map((it) => (
                  <tr key={it.id} className="hover:bg-surface-low/40 transition-colors h-11">
                    <td className="py-2.5 px-3.5 font-mono text-on-surface-variant whitespace-nowrap">
                      {it.date}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-black text-primary whitespace-nowrap">
                      {it.code}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          it.isReceipt
                            ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
                        }`}
                      >
                        {it.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-on-surface max-w-[180px] truncate">
                      {it.partyName}
                    </td>
                    <td className="py-2.5 px-3.5 text-on-surface-variant text-[11px] whitespace-nowrap">
                      {it.accountName}
                    </td>
                    <td
                      className={`py-2.5 px-3.5 text-left font-mono font-black whitespace-nowrap ${
                        it.isReceipt ? 'text-emerald-600' : 'text-rose-700'
                      }`}
                    >
                      {it.isReceipt ? '+' : '-'} {formatCurrency(it.amount)}
                    </td>
                    <td className="py-2.5 px-3.5 text-on-surface-variant text-[11px] max-w-[200px] truncate">
                      {it.notes}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden divide-y divide-surface-container/60 p-3 space-y-2.5">
          {paginatedItems.length === 0 ? (
            <div className="py-6 text-center text-on-surface-variant text-xs font-bold">
              لا توجد حركات نقدية مسجلة في الفترة المحددة
            </div>
          ) : (
            paginatedItems.map((it) => (
              <div key={it.id} className="bg-surface-low/50 rounded-2xl p-3 space-y-2 border border-outline-variant/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-black text-primary">{it.code}</span>
                  <span className="font-mono text-[10px] text-on-surface-variant">{it.date}</span>
                </div>
                <div className="text-xs font-black text-on-surface">{it.partyName}</div>
                <div className="flex items-center justify-between pt-1 border-t border-surface-container/50 text-[11px] font-bold">
                  <span className="text-on-surface-variant text-[10px]">{it.accountName}</span>
                  <span
                    className={`font-mono font-black ${
                      it.isReceipt ? 'text-emerald-600' : 'text-rose-700'
                    }`}
                  >
                    {it.isReceipt ? '+' : '-'} {formatCurrency(it.amount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-surface-container text-xs font-bold text-on-surface-variant">
            <span>
              عرض {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, flowData.items.length)} من {flowData.items.length} حركة
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
