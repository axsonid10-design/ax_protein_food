import React, { useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'

export function AX_InvoicesStatementTab({
  invoices = [],
  clients = [],
  suppliers = [],
  onSelectInvoice,
}) {
  const [selectedParty, setSelectedParty] = useState(clients[0]?.name || suppliers[0]?.name || '')
  const [statementPage, setStatementPage] = useState(1)
  const PAGE_SIZE = 15

  const partyOptions = [
    ...(clients || []).map((c) => ({
      value: c.name,
      label: c.name,
      badge: 'عميل',
    })),
    ...(suppliers || []).map((s) => ({
      value: s.name || s.companyName,
      label: s.name || s.companyName,
      badge: 'مورد',
    })),
  ]

  const partyInvoices = (invoices || []).filter((i) => i && i.partyName === selectedParty)
  let runningBalance = 0

  const allStatementRows = partyInvoices.map((inv) => {
    const invTotal = Number(inv.total) || 0
    let typeLabel = 'فاتورة مبيعات'
    let debit = 0
    let credit = 0

    if (inv.type === 'sale') {
      typeLabel = 'فاتورة مبيعات'
      debit = invTotal
      runningBalance += invTotal
    } else if (inv.type === 'sale_return') {
      typeLabel = 'مردود مبيعات'
      credit = invTotal
      runningBalance -= invTotal
    } else if (inv.type === 'purchase') {
      typeLabel = 'فاتورة توريد مشتريات'
      credit = invTotal
      runningBalance += invTotal
    } else if (inv.type === 'purchase_return') {
      typeLabel = 'مردود مشتريات'
      debit = invTotal
      runningBalance -= invTotal
    }

    return {
      date: inv.date || '',
      type: typeLabel,
      refCode: inv.code || '',
      invoiceObj: inv,
      debit,
      credit,
      balance: runningBalance,
    }
  })

  const totalStmtRows = allStatementRows.length
  const totalStmtPages = Math.max(1, Math.ceil(totalStmtRows / PAGE_SIZE))
  const paginatedStmtRows = allStatementRows.slice(
    (statementPage - 1) * PAGE_SIZE,
    statementPage * PAGE_SIZE
  )

  return (
    <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 shadow-level1 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-container pb-4">
        <h3 className="text-sm font-black text-on-surface">كشف الحساب</h3>

        <div className="flex items-center gap-2 w-full sm:w-72">
          <span className="text-xs font-bold text-on-surface-variant whitespace-nowrap">الطرف:</span>
          <AX_SearchableSelect
            value={selectedParty}
            onChange={(val) => {
              setSelectedParty(val)
              setStatementPage(1)
            }}
            options={partyOptions}
            placeholder="اختر العميل أو المورد..."
          />
        </div>
      </div>

      <div className="hidden lg:block overflow-hidden rounded-2xl border border-surface-container">
        <table className="w-full text-right text-xs">
          <thead className="bg-surface-low border-b border-surface-container text-on-surface-variant font-black">
            <tr className="h-11">
              <th className="px-3.5 whitespace-nowrap">التاريخ</th>
              <th className="px-3.5 whitespace-nowrap">رقم السند/الفاتورة</th>
              <th className="px-3.5 whitespace-nowrap">نوع الحركة</th>
              <th className="px-3.5 whitespace-nowrap text-left">مدين (ج.م)</th>
              <th className="px-3.5 whitespace-nowrap text-left">دائن (ج.م)</th>
              <th className="px-3.5 whitespace-nowrap text-left font-black">الرصيد التراكمي (ج.م)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container text-on-surface font-bold">
            {paginatedStmtRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs font-bold text-on-surface-variant">
                  لا توجد حركات مسجلة لهذا الطرف.
                </td>
              </tr>
            ) : (
              paginatedStmtRows.map((row, idx) => (
                <tr key={idx} className="h-11 hover:bg-surface-low/50 transition-colors">
                  <td className="px-3.5 whitespace-nowrap text-on-surface-variant font-mono">{row.date}</td>
                  <td className="px-3.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectInvoice?.(row.invoiceObj)}
                      className="font-mono font-black text-primary hover:underline cursor-pointer"
                    >
                      {row.refCode}
                    </button>
                  </td>
                  <td className="px-3.5 whitespace-nowrap">{row.type}</td>
                  <td className="px-3.5 whitespace-nowrap font-mono text-left font-bold text-primary">
                    {row.debit > 0 ? (Number(row.debit) || 0).toLocaleString('en-US') : '-'}
                  </td>
                  <td className="px-3.5 whitespace-nowrap font-mono text-left font-bold text-error">
                    {row.credit > 0 ? (Number(row.credit) || 0).toLocaleString('en-US') : '-'}
                  </td>
                  <td className="px-3.5 whitespace-nowrap font-mono text-left font-black text-sm">
                    {(Number(row.balance) || 0).toLocaleString('en-US')} ج.م
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {paginatedStmtRows.length === 0 ? (
          <div className="py-8 text-center text-xs font-bold text-on-surface-variant bg-surface-low/30 rounded-2xl border border-dashed border-outline-variant/30">
            لا توجد حركات مسجلة لهذا الطرف.
          </div>
        ) : (
          paginatedStmtRows.map((row, idx) => (
            <div
              key={idx}
              className="bg-surface-low/50 border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectInvoice?.(row.invoiceObj)}
                  className="font-mono text-xs font-black text-primary cursor-pointer"
                >
                  {row.refCode}
                </button>
                <span className="text-xs text-on-surface-variant font-mono">{row.date}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-on-surface">{row.type}</span>
                <div className="flex gap-2 font-mono">
                  {row.debit > 0 && <span className="text-primary font-bold">+{row.debit.toLocaleString('en-US')}</span>}
                  {row.credit > 0 && <span className="text-error font-bold">-{row.credit.toLocaleString('en-US')}</span>}
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-surface-container text-xs">
                <span className="text-on-surface-variant font-bold">الرصيد التراكمي:</span>
                <span className="font-mono font-black text-on-surface">{(Number(row.balance) || 0).toLocaleString('en-US')} ج.م</span>
              </div>
            </div>
          ))
        )}
      </div>

      {totalStmtPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-surface-container text-xs font-bold">
          <span className="text-on-surface-variant font-mono">
            إجمالي العمليات: {totalStmtRows} • صفحة {statementPage} من {totalStmtPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatementPage((p) => Math.max(1, p - 1))}
              disabled={statementPage === 1}
              className="p-1.5 rounded-full bg-surface-low border border-outline-variant/30 disabled:opacity-40 hover:bg-surface-container transition-all cursor-pointer"
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-black">
              {statementPage}
            </span>
            <button
              type="button"
              onClick={() => setStatementPage((p) => Math.min(totalStmtPages, p + 1))}
              disabled={statementPage === totalStmtPages}
              className="p-1.5 rounded-full bg-surface-low border border-outline-variant/30 disabled:opacity-40 hover:bg-surface-container transition-all cursor-pointer"
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

export default AX_InvoicesStatementTab
