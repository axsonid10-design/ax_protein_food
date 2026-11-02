import React, { useState } from 'react'
import {
  FileText,
  Plus,
  Eye,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_InvoiceDetailsModal } from './AX_InvoiceDetailsModal'
import { AX_CreateInvoiceModal } from './AX_CreateInvoiceModal'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'

export function AX_InvoicesManager() {
  const { invoices, items, warehouses, clients, suppliers, treasuryAccounts, inventoryStock, addInvoice } = useAXStore()

  const [activeSubView, setActiveSubView] = useState('invoices')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedParty, setSelectedParty] = useState(clients[0]?.name || '')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState(null)
  const [invoicePage, setInvoicePage] = useState(1)
  const [statementPage, setStatementPage] = useState(1)
  const activeModal = useAXStore((s) => s.activeModal)
  const closeModal = useAXStore((s) => s.closeModal)

  React.useEffect(() => {
    if (activeModal === 'create_invoice') {
      setShowCreateModal(true)
      closeModal()
    }
  }, [activeModal, closeModal])

  const PAGE_SIZE = 15

  const filteredInvoices = (invoices || []).filter((inv) => {
    if (typeFilter === 'all') return true
    return inv.type === typeFilter
  })

  const totalInvoices = filteredInvoices.length
  const totalInvPages = Math.max(1, Math.ceil(totalInvoices / PAGE_SIZE))
  const paginatedInvoices = filteredInvoices.slice(
    (invoicePage - 1) * PAGE_SIZE,
    invoicePage * PAGE_SIZE
  )

  const getTypeBadge = (type) => {
    switch (type) {
      case 'sale_return':
        return { label: 'مردود مبيعات', className: 'bg-purple-500/10 text-purple-700 border-purple-500/30' }
      case 'purchase_return':
        return { label: 'مردود مشتريات', className: 'bg-amber-500/10 text-amber-700 border-amber-500/30' }
      case 'purchase':
        return { label: 'فاتورة مشتريات', className: 'bg-secondary/10 text-secondary border-secondary/30' }
      default:
        return { label: 'فاتورة بيع', className: 'bg-primary/10 text-primary border-primary/30' }
    }
  }

  const getPartyStatementRows = () => {
    const partyInvoices = (invoices || []).filter((i) => i && i.partyName === selectedParty)
    let runningBalance = 0

    return partyInvoices.map((inv) => {
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
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubView('invoices')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
              activeSubView === 'invoices'
                ? 'bg-primary text-white shadow-level1'
                : 'bg-surface-lowest border border-outline-variant/30 text-on-surface hover:bg-surface-container'
            }`}
          >
            سجل الفواتير
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView('statement')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
              activeSubView === 'statement'
                ? 'bg-primary text-white shadow-level1'
                : 'bg-surface-lowest border border-outline-variant/30 text-on-surface hover:bg-surface-container'
            }`}
          >
            كشف الحساب التفاعلي
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary text-white text-xs font-black hover:bg-secondary-hover shadow-level1 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>فاتورة جديدة</span>
        </button>
      </div>

      {activeSubView === 'invoices' ? (
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 shadow-level1 space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'sale', label: 'مبيعات' },
              { id: 'purchase', label: 'مشتريات' },
              { id: 'sale_return', label: 'مردودات مبيعات' },
              { id: 'purchase_return', label: 'مردودات مشتريات' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setTypeFilter(tab.id)
                  setInvoicePage(1)
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-black whitespace-nowrap transition-all cursor-pointer ${
                  typeFilter === tab.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-low text-on-surface-variant hover:text-on-surface border border-outline-variant/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden lg:block overflow-hidden rounded-2xl border border-surface-container">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-low border-b border-surface-container text-on-surface-variant font-black">
                <tr className="h-11">
                  <th className="px-3.5 whitespace-nowrap">رقم الفاتورة</th>
                  <th className="px-3.5 whitespace-nowrap">النوع</th>
                  <th className="px-3.5 whitespace-nowrap">الطرف</th>
                  <th className="px-3.5 whitespace-nowrap">التاريخ</th>
                  <th className="px-3.5 whitespace-nowrap">نقل ومشال</th>
                  <th className="px-3.5 whitespace-nowrap">الإجمالي</th>
                  <th className="px-3.5 whitespace-nowrap">شروط السداد</th>
                  <th className="px-3.5 whitespace-nowrap text-center">عرض</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container text-on-surface font-bold">
                {paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs font-bold text-on-surface-variant">
                      لا توجد فواتير تطابق هذا التصنيف. اضغط على "فاتورة جديدة" بالأعلى لتسجيل حركة بيع أو شراء.
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv) => {
                    const badge = getTypeBadge(inv.type)
                    return (
                      <tr key={inv.id} className="h-11 hover:bg-surface-low/50 transition-colors">
                        <td className="px-3.5 whitespace-nowrap font-mono text-primary font-black">{inv.code}</td>
                        <td className="px-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-3.5 whitespace-nowrap font-black">{inv.partyName}</td>
                        <td className="px-3.5 whitespace-nowrap text-on-surface-variant">{inv.date}</td>
                        <td className="px-3.5 whitespace-nowrap font-mono font-bold text-on-surface-variant">
                          {((Number(inv.transportCost) || 0) + (Number(inv.loadingCost) || 0)).toLocaleString('en-US')} ج.م
                        </td>
                        <td className="px-3.5 whitespace-nowrap font-mono font-black text-primary">
                          {(Number(inv.total) || 0).toLocaleString('en-US')} ج.م
                        </td>
                        <td className="px-3.5 whitespace-nowrap">
                          <span className="text-[11px] font-bold text-on-surface-variant">
                            {inv.paymentTerms}
                          </span>
                        </td>
                        <td className="px-3.5 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForModal(inv)}
                            className="p-1.5 rounded-full hover:bg-surface-container text-primary transition-colors cursor-pointer"
                            title="عرض تفاصيل الفاتورة"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {paginatedInvoices.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-on-surface-variant bg-surface-low/30 rounded-2xl border border-dashed border-outline-variant/30">
                لا توجد فواتير تطابق هذا التصنيف.
              </div>
            ) : (
              paginatedInvoices.map((inv) => {
                const badge = getTypeBadge(inv.type)
                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoiceForModal(inv)}
                    className="bg-surface-low/50 border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-primary">{inv.code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant">{inv.date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-on-surface">{inv.partyName}</span>
                      <span className="font-mono font-black text-primary text-sm">
                        {(Number(inv.total) || 0).toLocaleString('en-US')} ج.م
                      </span>
                    </div>
                    <div className="text-[11px] text-on-surface-variant flex items-center justify-between pt-2 border-t border-surface-container">
                      <span>نقل ومشال: {((Number(inv.transportCost) || 0) + (Number(inv.loadingCost) || 0)).toLocaleString('en-US')} ج.م</span>
                      <span className="font-bold text-secondary">عرض البنود ←</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {totalInvPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-surface-container text-xs font-bold">
              <span className="text-on-surface-variant font-mono">
                إجمالي الفواتير: {totalInvoices} • صفحة {invoicePage} من {totalInvPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                  disabled={invoicePage === 1}
                  className="p-1.5 rounded-full bg-surface-low border border-outline-variant/30 disabled:opacity-40 hover:bg-surface-container transition-all"
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-black">
                  {invoicePage}
                </span>
                <button
                  type="button"
                  onClick={() => setInvoicePage((p) => Math.min(totalInvPages, p + 1))}
                  disabled={invoicePage === totalInvPages}
                  className="p-1.5 rounded-full bg-surface-low border border-outline-variant/30 disabled:opacity-40 hover:bg-surface-container transition-all"
                  title="الصفحة التالية"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 shadow-level1 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-container pb-4">
            <h3 className="text-sm font-black text-on-surface">كشف الحساب</h3>

            <div className="flex items-center gap-2 w-full sm:w-64">
              <span className="text-xs font-bold text-on-surface-variant whitespace-nowrap">الطرف:</span>
              <AX_SearchableSelect
                value={selectedParty}
                onChange={(val) => {
                  setSelectedParty(val)
                  setStatementPage(1)
                }}
                options={[
                  ...(clients || []).map((c) => ({
                    value: c.name,
                    label: c.name,
                    badge: 'عميل',
                  })),
                  ...(suppliers || []).map((s) => ({
                    value: s.name,
                    label: s.name,
                    badge: 'مورد',
                  })),
                ]}
                placeholder="اختر العميل أو المورد..."
              />
            </div>
          </div>

          {(() => {
            const allStatementRows = getPartyStatementRows()
            const totalStmtRows = allStatementRows.length
            const totalStmtPages = Math.max(1, Math.ceil(totalStmtRows / PAGE_SIZE))
            const paginatedStmtRows = allStatementRows.slice(
              (statementPage - 1) * PAGE_SIZE,
              statementPage * PAGE_SIZE
            )

            return (
              <>
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
                      {paginatedStmtRows.map((row, idx) => (
                        <tr key={idx} className="h-11 hover:bg-surface-low/50 transition-colors">
                          <td className="px-3.5 whitespace-nowrap text-on-surface-variant">{row.date}</td>
                          <td className="px-3.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceForModal(row.invoiceObj)}
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
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:hidden">
                  {paginatedStmtRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="bg-surface-low/50 border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForModal(row.invoiceObj)}
                          className="font-mono text-xs font-black text-primary"
                        >
                          {row.refCode}
                        </button>
                        <span className="text-xs text-on-surface-variant">{row.date}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-on-surface">{row.type}</span>
                        <div className="flex gap-2 font-mono">
                          {row.debit > 0 && <span className="text-primary font-bold">+{row.debit.toLocaleString('en-US')}</span>}
                          {row.credit > 0 && <span className="text-error font-bold">-{row.credit.toLocaleString('en-US')}</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-surface-container text-xs">
                        <span className="text-on-surface-variant font-bold">الرصيد:</span>
                        <span className="font-mono font-black text-on-surface">{(Number(row.balance) || 0).toLocaleString('en-US')} ج.م</span>
                      </div>
                    </div>
                  ))}
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
                        className="p-1.5 rounded-full bg-surface-low border border-outline-variant/30 disabled:opacity-40 hover:bg-surface-container transition-all"
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
                        className="p-1.5 rounded-full bg-surface-low border border-outline-variant/30 disabled:opacity-40 hover:bg-surface-container transition-all"
                        title="الصفحة التالية"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-20 lg:bottom-6 left-6 z-30 flex items-center gap-2 px-5 py-3 rounded-full bg-secondary hover:bg-secondary-hover text-white font-black text-xs sm:text-sm shadow-level3 active:scale-95 transition-all cursor-pointer"
        title="إنشاء فاتورة جديدة"
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>فاتورة جديدة</span>
      </button>

      <AX_InvoiceDetailsModal
        invoice={selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
      />

      <AX_CreateInvoiceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        items={items}
        warehouses={warehouses}
        clients={clients}
        suppliers={suppliers}
        treasuryAccounts={treasuryAccounts}
        inventoryStock={inventoryStock}
        onSave={addInvoice}
      />
    </div>
  )
}

export default AX_InvoicesManager
