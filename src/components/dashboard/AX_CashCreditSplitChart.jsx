import React, { useMemo } from 'react'
import { Wallet, Scale, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react'

export function AX_CashCreditSplitChart({ invoices = [] }) {
  const stats = useMemo(() => {
    const saleInvoices = invoices.filter((i) => i && i.type === 'sale')
    const totalSales = saleInvoices.reduce((acc, i) => acc + (Number(i.total) || 0), 0)
    const totalPaid = saleInvoices.reduce((acc, i) => acc + (Number(i.paidAmount) || 0), 0)
    const totalCredit = saleInvoices.reduce((acc, i) => acc + (Number(i.remainingAmount) || 0), 0)

    const paidPct = totalSales > 0 ? Math.round((totalPaid / totalSales) * 100) : 100
    const creditPct = 100 - paidPct

    return {
      totalSales,
      totalPaid,
      totalCredit,
      paidPct,
      creditPct,
      invoicesCount: saleInvoices.length,
    }
  }, [invoices])

  return (
    <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-surface-container pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-on-surface">
              توازن التحصيل والمديونيات
            </h4>
          </div>
        </div>

        <div className="flex items-baseline gap-1 text-xs font-mono font-black text-emerald-700">
          <span>{stats.paidPct}%</span>
          <span className="text-[10px] text-on-surface-variant font-bold">محصل</span>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        <div className="w-full h-3.5 rounded-full bg-surface-low overflow-hidden flex">
          <div
            className="h-full bg-emerald-600 transition-all duration-700"
            style={{ width: `${stats.paidPct}%` }}
            title={`مسدد: ${stats.paidPct}%`}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-700"
            style={{ width: `${stats.creditPct}%` }}
            title={`آجل: ${stats.creditPct}%`}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>نقدية محصلة ({stats.paidPct}%)</span>
            </div>
            <div className="flex items-baseline gap-1 font-mono font-black text-sm sm:text-base text-on-surface">
              <span>{stats.totalPaid.toLocaleString('en-US')}</span>
              <span className="text-[10px] font-bold text-on-surface-variant">ج.م</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <Clock className="w-3.5 h-3.5" />
              <span>متبقي آجل ({stats.creditPct}%)</span>
            </div>
            <div className="flex items-baseline gap-1 font-mono font-black text-sm sm:text-base text-on-surface">
              <span>{stats.totalCredit.toLocaleString('en-US')}</span>
              <span className="text-[10px] font-bold text-on-surface-variant">ج.م</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
