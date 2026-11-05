import React, { useState, useEffect } from 'react'
import {
  Plus,
  Eye,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Edit3,
  Trash2,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_InvoiceDetailsModal } from './AX_InvoiceDetailsModal'
import { AX_CreateInvoiceModal } from './AX_CreateInvoiceModal'
import { AX_EditInvoiceModal } from './AX_EditInvoiceModal'
import { AX_InvoicesStatementTab } from './AX_InvoicesStatementTab'
import { AX_InvoiceTimeframeFilter } from './AX_InvoiceTimeframeFilter'
import { AX_InvoiceReturnModal } from './AX_InvoiceReturnModal'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { getInvoiceTypeTheme } from './invoiceThemeHelper'

export function AX_InvoicesManager() {
  const {
    invoices,
    items,
    warehouses,
    clients,
    suppliers,
    treasuryAccounts,
    inventoryStock,
    addInvoice,
    updateInvoice,
    deleteInvoice,
  } = useAXStore()

  const [activeSubView, setActiveSubView] = useState('invoices')
  const [typeFilter, setTypeFilter] = useState('all')
  const [timeframe, setTimeframe] = useState('all')
  const [specificDate, setSpecificDate] = useState('')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState(null)
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState(null)
  const [invoiceToDelete, setInvoiceToDelete] = useState(null)
  const [invoiceForReturn, setInvoiceForReturn] = useState(null)
  const [invoicePage, setInvoicePage] = useState(1)

  const activeModal = useAXStore((s) => s.activeModal)
  const closeModal = useAXStore((s) => s.closeModal)

  useEffect(() => {
    if (activeModal === 'create_invoice') {
      setShowCreateModal(true)
      closeModal()
    }
  }, [activeModal, closeModal])

  const PAGE_SIZE = 15

  const filteredInvoices = (invoices || []).filter((inv) => {
    if (typeFilter !== 'all' && inv.type !== typeFilter) return false
    if (timeframe === 'all') return true

    const rawDate = inv.date || inv.operationalDate || inv.createdAt
    if (!rawDate) return false
    const itemDate = String(rawDate).slice(0, 10)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    if (timeframe === 'day') return itemDate === todayStr

    if (timeframe === 'week') {
      const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      return itemDate >= pastWeek && itemDate <= todayStr
    }

    if (timeframe === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      return itemDate >= startOfMonth && itemDate <= todayStr
    }

    if (timeframe === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
      return itemDate >= startOfYear && itemDate <= todayStr
    }

    if (timeframe === 'specific_day') return specificDate ? itemDate === specificDate : true

    if (timeframe === 'custom') {
      if (customStart && customEnd) return itemDate >= customStart && itemDate <= customEnd
      if (customStart) return itemDate >= customStart
      if (customEnd) return itemDate <= customEnd
      return true
    }

    return true
  })

  const totalInvoices = filteredInvoices.length
  const totalInvPages = Math.max(1, Math.ceil(totalInvoices / PAGE_SIZE))
  const paginatedInvoices = filteredInvoices.slice((invoicePage - 1) * PAGE_SIZE, invoicePage * PAGE_SIZE)

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
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {[
                { id: 'all', label: 'كافة الأنواع' },
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

            <AX_InvoiceTimeframeFilter
              timeframe={timeframe}
              setTimeframe={(tf) => { setTimeframe(tf); setInvoicePage(1); }}
              specificDate={specificDate}
              setSpecificDate={(d) => { setSpecificDate(d); setInvoicePage(1); }}
              customStart={customStart}
              setCustomStart={(s) => { setCustomStart(s); setInvoicePage(1); }}
              customEnd={customEnd}
              setCustomEnd={(e) => { setCustomEnd(e); setInvoicePage(1); }}
            />
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
                  <th className="px-3.5 whitespace-nowrap text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container text-on-surface font-bold">
                {paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs font-bold text-on-surface-variant">
                      لا توجد فواتير تطابق هذا التصنيف أو الفترة المحددة.
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv) => {
                    const theme = getInvoiceTypeTheme(inv.type)
                    const canReturn = inv.type === 'sale' || inv.type === 'purchase'

                    return (
                      <tr key={inv.id} className={`h-11 transition-colors ${theme.rowClass}`}>
                        <td className={`px-3.5 whitespace-nowrap font-mono font-black ${theme.codeClass}`}>
                          {inv.code}
                        </td>
                        <td className="px-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${theme.badgeClass}`}>
                            {theme.label}
                          </span>
                        </td>
                        <td className="px-3.5 whitespace-nowrap font-black">{inv.partyName}</td>
                        <td className="px-3.5 whitespace-nowrap text-on-surface-variant font-mono">
                          <div>{inv.date || inv.operationalDate}</div>
                          {inv.createdAt && (
                            <div className="text-[10px] text-on-surface-variant/70">
                              قيد: {String(inv.createdAt).slice(11, 16) || String(inv.createdAt).slice(0, 10)}
                            </div>
                          )}
                        </td>
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
                          <div className="flex items-center justify-center gap-1.5">
                            {canReturn && (
                              <button
                                type="button"
                                onClick={() => setInvoiceForReturn(inv)}
                                className="p-1.5 rounded-full hover:bg-purple-500/10 text-purple-700 transition-colors cursor-pointer"
                                title="تحويل لمردود"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceForEdit(inv)}
                              className="p-1.5 rounded-full hover:bg-secondary/10 text-secondary transition-colors cursor-pointer"
                              title="تعديل الفاتورة"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setInvoiceToDelete(inv)}
                              className="p-1.5 rounded-full hover:bg-error/10 text-error transition-colors cursor-pointer"
                              title="حذف الفاتورة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceForModal(inv)}
                              className="p-1.5 rounded-full hover:bg-surface-container text-primary transition-colors cursor-pointer"
                              title="عرض تفاصيل الفاتورة"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
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
                لا توجد فواتير تطابق هذا التصنيف أو الفترة المحددة.
              </div>
            ) : (
              paginatedInvoices.map((inv) => {
                const theme = getInvoiceTypeTheme(inv.type)
                const canReturn = inv.type === 'sale' || inv.type === 'purchase'

                return (
                  <div
                    key={inv.id}
                    className={`rounded-2xl p-4 shadow-sm space-y-2 transition-colors ${theme.cardClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-xs font-black ${theme.codeClass}`}>{inv.code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${theme.badgeClass}`}>
                          {theme.label}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-on-surface-variant font-mono">
                        {inv.date || inv.operationalDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-on-surface">{inv.partyName}</span>
                      <span className="font-mono font-black text-primary text-sm">
                        {(Number(inv.total) || 0).toLocaleString('en-US')} ج.م
                      </span>
                    </div>

                    <div className="text-[11px] text-on-surface-variant flex items-center justify-between pt-2 border-t border-surface-container">
                      <span>نقل ومشال: {((Number(inv.transportCost) || 0) + (Number(inv.loadingCost) || 0)).toLocaleString('en-US')} ج.م</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {canReturn && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setInvoiceForReturn(inv)
                            }}
                            className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-700 font-black text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>مردود</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedInvoiceForEdit(inv)
                          }}
                          className="px-2 py-1 rounded-full bg-secondary/10 text-secondary font-black text-[10px] flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setInvoiceToDelete(inv)
                          }}
                          className="px-2 py-1 rounded-full bg-error/10 text-error font-black text-[10px] flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>حذف</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForModal(inv)}
                          className="font-bold text-primary cursor-pointer text-xs"
                        >
                          عرض ←
                        </button>
                      </div>
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
                  className="p-1.5 rounded-full bg-surface-low border border-outline-variant/30 disabled:opacity-40 hover:bg-surface-container transition-all cursor-pointer"
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
                  className="p-1.5 rounded-full bg-surface-low border border-outline-variant/30 disabled:opacity-40 hover:bg-surface-container transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <AX_InvoicesStatementTab
          invoices={invoices}
          clients={clients}
          suppliers={suppliers}
          onSelectInvoice={(inv) => setSelectedInvoiceForModal(inv)}
        />
      )}

      <button
        type="button"
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-20 lg:bottom-6 left-6 z-30 flex items-center gap-2 px-5 py-3 rounded-full bg-secondary hover:bg-secondary-hover text-white font-black text-xs sm:text-sm shadow-level3 active:scale-95 transition-all cursor-pointer"
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>فاتورة جديدة</span>
      </button>

      <AX_InvoiceDetailsModal
        invoice={selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
        warehouses={warehouses}
        treasuryAccounts={treasuryAccounts}
        onSaveReturn={addInvoice}
        onEdit={(inv) => setSelectedInvoiceForEdit(inv)}
        onDelete={(id) => {
          const inv = (invoices || []).find((i) => i.id === id)
          if (inv) setInvoiceToDelete(inv)
        }}
      />

      <AX_InvoiceReturnModal
        isOpen={Boolean(invoiceForReturn)}
        onClose={() => setInvoiceForReturn(null)}
        invoice={invoiceForReturn}
        warehouses={warehouses}
        treasuryAccounts={treasuryAccounts}
        onSaveReturn={addInvoice}
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

      <AX_EditInvoiceModal
        isOpen={Boolean(selectedInvoiceForEdit)}
        onClose={() => setSelectedInvoiceForEdit(null)}
        invoice={selectedInvoiceForEdit}
        items={items}
        warehouses={warehouses}
        clients={clients}
        suppliers={suppliers}
        treasuryAccounts={treasuryAccounts}
        inventoryStock={inventoryStock}
        onSave={updateInvoice}
      />

      <AX_ConfirmModal
        isOpen={Boolean(invoiceToDelete)}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={() => {
          if (invoiceToDelete) deleteInvoice(invoiceToDelete.id)
          setInvoiceToDelete(null)
          if (selectedInvoiceForModal?.id === invoiceToDelete?.id) {
            setSelectedInvoiceForModal(null)
          }
        }}
        title="تأكيد حذف الفاتورة"
        message={`هل أنت متأكد من حذف الفاتورة (${invoiceToDelete?.code})؟ سيتم عكس كميات المخزون وتعديل رصيد ${invoiceToDelete?.partyName} والخزينة تلقائياً.`}
        confirmText="نعم، حذف الفاتورة"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  )
}

export default AX_InvoicesManager
