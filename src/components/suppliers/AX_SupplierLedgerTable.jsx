import React, { useState, useMemo } from 'react'
import { ChevronRight, ChevronLeft, ArrowDownLeft, ArrowUpRight, Receipt, FileText } from 'lucide-react'

const PAGE_SIZE = 8

export function AX_SupplierLedgerTable({ ledgerEntries = [] }) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(ledgerEntries.length / PAGE_SIZE))
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return ledgerEntries.slice(start, start + PAGE_SIZE)
  }, [ledgerEntries, currentPage])

  const getTypeBadge = (type) => {
    switch (type) {
      case 'opening':
        return <span className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] font-bold">رصيد افتتاحي</span>
      case 'purchase_invoice':
        return <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">توريد ومشتريات</span>
      case 'sale_invoice':
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 text-[10px] font-bold">مبيعات للمورد (مقاصة)</span>
      case 'sale_return':
        return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">مردود مبيعات</span>
      case 'purchase_return':
        return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">مردود مشتريات</span>
      case 'disbursement':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">سند صرف نقدي</span>
      case 'receipt':
        return <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">سند قبض نقدي</span>
      default:
        return <span className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] font-bold">{type}</span>
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant px-1">
        <span>كشف العمليات والحركات المالية ({ledgerEntries.length} حركة)</span>
        {totalPages > 1 && (
          <span className="font-mono text-[11px]">
            صفحة {currentPage} من {totalPages}
          </span>
        )}
      </div>

      <div className="border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs bg-surface-lowest">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-surface-container/60 sticky top-0 border-b border-outline-variant/30 font-black select-none">
              <tr className="h-10">
                <th className="px-3">التاريخ</th>
                <th className="px-3">نوع الحركة</th>
                <th className="px-4">البيان والوصف</th>
                <th className="px-3 font-mono">دائن (له)</th>
                <th className="px-3 font-mono">مدين (عليه)</th>
                <th className="px-3 font-mono">الرصيد بعد الحركة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-on-surface-variant font-bold">
                    لا توجد حركات مالية مسجلة في كشف الحساب حالياً.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((row) => (
                  <tr key={row.id} className="h-10 hover:bg-surface-container/20">
                    <td className="px-3 font-mono text-[11px] whitespace-nowrap text-on-surface-variant">
                      {row.date?.split('T')[0] || row.date}
                    </td>
                    <td className="px-3 whitespace-nowrap">
                      {getTypeBadge(row.type)}
                    </td>
                    <td className="px-4 font-bold text-on-surface truncate max-w-[240px]">
                      {row.description}
                    </td>
                    <td className="px-3 font-mono text-red-800 font-bold whitespace-nowrap">
                      {row.credit > 0 ? `${row.credit.toLocaleString('en-US')} ج.م` : '—'}
                    </td>
                    <td className="px-3 font-mono text-emerald-700 font-bold whitespace-nowrap">
                      {row.debit > 0 ? `${row.debit.toLocaleString('en-US')} ج.م` : '—'}
                    </td>
                    <td className="px-3 font-mono font-black whitespace-nowrap">
                      <span className={row.runningBalance > 0 ? 'text-red-800' : row.runningBalance < 0 ? 'text-emerald-700' : 'text-on-surface-variant'}>
                        {Math.abs(row.runningBalance).toLocaleString('en-US')} ج.م
                      </span>
                      <span className="text-[10px] mr-1 text-on-surface-variant font-normal">
                        {row.runningBalance > 0 ? '(له)' : row.runningBalance < 0 ? '(عليه)' : ''}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 bg-surface-container/30 border-t border-outline-variant/30 text-xs font-bold text-on-surface-variant">
            <span>عرض {((currentPage - 1) * PAGE_SIZE) + 1} إلى {Math.min(currentPage * PAGE_SIZE, ledgerEntries.length)} من {ledgerEntries.length}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-full border border-outline-variant/40 hover:bg-surface-container disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="font-mono font-black px-2">{currentPage} / {totalPages}</span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded-full border border-outline-variant/40 hover:bg-surface-container disabled:opacity-30 cursor-pointer"
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

export default AX_SupplierLedgerTable
