import React from 'react'
import {
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'

export function AX_TreasuryTransactionsTable({
  paginatedTransactions = [],
  getTreasuryName,
  totalPages,
  currentPage,
  totalTx,
  onPageChange,
}) {
  return (
    <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 shadow-level1 space-y-4">
      <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        سجل حركات النقدية
      </h3>

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
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container text-on-surface font-bold">
            {paginatedTransactions.map((tx) => (
              <tr key={tx.id} className="h-11 hover:bg-surface-low/50 transition-colors">
                <td className="px-3.5 whitespace-nowrap font-mono text-primary font-black">{tx.code}</td>
                <td className="px-3.5 whitespace-nowrap">
                  {tx.type === 'client_receipt' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      <ArrowDownLeft className="w-3 h-3" /> وارد قبض
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-error-container/40 text-error">
                      <ArrowUpRight className="w-3 h-3" /> صادر سداد
                    </span>
                  )}
                </td>
                <td className="px-3.5 whitespace-nowrap font-black">{tx.partyName}</td>
                <td className="px-3.5 whitespace-nowrap text-on-surface-variant">{getTreasuryName(tx.treasuryId)}</td>
                <td className="px-3.5 whitespace-nowrap font-mono font-black text-sm">
                  {(Number(tx.amount) || 0).toLocaleString('en-US')} ج.م
                </td>
                <td className="px-3.5 whitespace-nowrap text-on-surface-variant">{tx.date}</td>
                <td className="px-3.5 whitespace-nowrap text-on-surface-variant text-[11px] truncate max-w-xs">{tx.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {paginatedTransactions.map((tx) => (
          <div
            key={tx.id}
            className="bg-surface-low/50 border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-primary">{tx.code}</span>
              <span className="text-xs text-on-surface-variant">{tx.date}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-on-surface">{tx.partyName}</span>
              <span className="font-mono font-black text-sm text-primary">
                {(Number(tx.amount) || 0).toLocaleString('en-US')} ج.م
              </span>
            </div>
            <div className="text-xs text-on-surface-variant flex items-center justify-between pt-2 border-t border-surface-container">
              <span>{getTreasuryName(tx.treasuryId)}</span>
              <span className="italic">{tx.notes}</span>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-surface-container text-xs font-bold">
          <span className="text-on-surface-variant font-mono">
            إجمالي الحركات: {totalTx} • صفحة {currentPage} من {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-full bg-surface-low border border-outline-variant/30 disabled:opacity-40 hover:bg-surface-container transition-all"
              title="الصفحة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AX_TreasuryTransactionsTable
