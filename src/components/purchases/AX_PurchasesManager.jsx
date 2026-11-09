import React, { useState, useMemo } from 'react'
import {
  Plus,
  Eye,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Edit3,
  Trash2,
  ShoppingBag,
  Receipt,
  DollarSign,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_InvoiceDetailsModal } from '../invoices/AX_InvoiceDetailsModal'
import { AX_CreateInvoiceModal } from '../invoices/AX_CreateInvoiceModal'
import { AX_EditInvoiceModal } from '../invoices/AX_EditInvoiceModal'
import { AX_InvoiceTimeframeFilter } from '../invoices/AX_InvoiceTimeframeFilter'
import { AX_InvoiceReturnModal } from '../invoices/AX_InvoiceReturnModal'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { getInvoiceTypeTheme } from '../invoices/invoiceThemeHelper'
import { formatTime12H, matchesInvoiceTimeframe } from '../../utils/dateHelpers'

export function AX_PurchasesManager() {
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

  const [activeSubView, setActiveSubView] = useState('purchases')
  const [purchaseTab, setPurchaseTab] = useState('all')
  const [timeframe, setTimeframe] = useState('all')
  const [specificDate, setSpecificDate] = useState('')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState(null)
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState(null)
  const [invoiceToDelete, setInvoiceToDelete] = useState(null)
  const [invoiceForReturn, setInvoiceForReturn] = useState(null)
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 15

  const purchaseInvoices = useMemo(() => {
    return (invoices || []).filter((inv) => inv.type === 'purchase' || inv.type === 'purchase_return')
  }, [invoices])

  const filteredPurchases = useMemo(() => {
    return purchaseInvoices.filter((inv) => {
      if (purchaseTab === 'purchases_only' && inv.type !== 'purchase') return false
      if (purchaseTab === 'returns_only' && inv.type !== 'purchase_return') return false

      return matchesInvoiceTimeframe(inv, { timeframe, specificDate, customStart, customEnd })
    })
  }, [purchaseInvoices, purchaseTab, timeframe, specificDate, customStart, customEnd])

  const totalGrossPurchases = useMemo(() => {
    return filteredPurchases
      .filter((i) => i.type === 'purchase')
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
  }, [filteredPurchases])

  const totalPurchaseReturns = useMemo(() => {
    return filteredPurchases
      .filter((i) => i.type === 'purchase_return')
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
  }, [filteredPurchases])

  const netPurchases = totalGrossPurchases - totalPurchaseReturns

  const totalItemsCount = filteredPurchases.length
  const totalPages = Math.max(1, Math.ceil(totalItemsCount / PAGE_SIZE))
  const paginatedPurchases = filteredPurchases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubView('purchases')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
              activeSubView === 'purchases'
                ? 'bg-secondary text-white shadow-level1'
                : 'bg-surface-lowest border border-outline-variant/30 text-on-surface hover:bg-surface-container'
            }`}
          >
            سجل المشتريات والمردودات
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary text-white text-xs font-black hover:bg-secondary-hover shadow-level1 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>فاتورة مشتريات جديدة</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
            <span>إجمالي المشتريات:</span>
            <ShoppingBag className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-mono font-black text-base sm:text-xl text-amber-700">
            {totalGrossPurchases.toLocaleString('en-US')} <span className="text-xs font-normal text-on-surface-variant">ج.م</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
            <span>مردودات المشتريات:</span>
            <RotateCcw className="w-4 h-4 text-rose-600" />
          </div>
          <div className="font-mono font-black text-base sm:text-xl text-rose-700">
            {totalPurchaseReturns.toLocaleString('en-US')} <span className="text-xs font-normal text-on-surface-variant">ج.م</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
            <span>صافي المشتريات:</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className={`font-mono font-black text-base sm:text-xl ${netPurchases < 0 ? 'text-error' : 'text-primary'}`}>
            {netPurchases.toLocaleString('en-US')} <span className="text-xs font-normal text-on-surface-variant">ج.م</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
            <span>عدد العمليات:</span>
            <Receipt className="w-4 h-4 text-secondary" />
          </div>
          <div className="font-mono font-black text-base sm:text-xl text-on-surface">
            {filteredPurchases.length} <span className="text-xs font-normal text-on-surface-variant">حركة</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-level1 space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {[
              { id: 'all', label: 'كافة حركات المشتريات' },
              { id: 'purchases_only', label: 'فواتير المشتريات' },
              { id: 'returns_only', label: 'مردودات المشتريات' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setPurchaseTab(tab.id)
                  setPage(1)
                }}
                className={`px-3.5 py-1 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  purchaseTab === tab.id
                    ? 'bg-secondary text-white shadow-xs'
                    : 'bg-surface-low text-on-surface-variant hover:text-on-surface border border-outline-variant/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AX_InvoiceTimeframeFilter
            timeframe={timeframe}
            setTimeframe={(tf) => { setTimeframe(tf); setPage(1); }}
            specificDate={specificDate}
            setSpecificDate={(d) => { setSpecificDate(d); setPage(1); }}
            customStart={customStart}
            setCustomStart={(s) => { setCustomStart(s); setPage(1); }}
            customEnd={customEnd}
            setCustomEnd={(e) => { setCustomEnd(e); setPage(1); }}
          />
        </div>

        <div className="hidden lg:block overflow-hidden rounded-2xl border border-surface-container">
          <table className="w-full text-right text-xs">
            <thead className="bg-surface-low border-b border-surface-container text-on-surface-variant font-black">
              <tr className="h-11">
                <th className="px-3.5 whitespace-nowrap">رقم الفاتورة</th>
                <th className="px-3.5 whitespace-nowrap">النوع</th>
                <th className="px-3.5 whitespace-nowrap">المورد</th>
                <th className="px-3.5 whitespace-nowrap">التاريخ</th>
                <th className="px-3.5 whitespace-nowrap">نقل ومشال</th>
                <th className="px-3.5 whitespace-nowrap">الإجمالي</th>
                <th className="px-3.5 whitespace-nowrap">السداد</th>
                <th className="px-3.5 whitespace-nowrap text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-on-surface font-bold">
              {paginatedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs font-bold text-on-surface-variant">
                    لا توجد فواتير مشتريات مطابقة لهذا التصنيف أو الفترة المحددة.
                  </td>
                </tr>
              ) : (
                paginatedPurchases.map((inv) => {
                  const theme = getInvoiceTypeTheme(inv.type)
                  const canReturn = inv.type === 'purchase'

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoiceForModal(inv)}
                      className={`h-11 transition-colors cursor-pointer ${theme.rowClass}`}
                    >
                      <td className="px-3.5 whitespace-nowrap">
                        <div className={`font-mono font-black ${theme.codeClass}`}>{inv.code}</div>
                        {(inv.createdAt || inv.created_at) && (
                          <div className="text-[10px] text-on-surface-variant font-mono">
                            {formatTime12H(inv.createdAt || inv.created_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${theme.badgeClass}`}>
                          {theme.label}
                        </span>
                      </td>
                      <td className="px-3.5 whitespace-nowrap font-black">{inv.partyName}</td>
                      <td className="px-3.5 whitespace-nowrap text-on-surface-variant font-mono">
                        <div>{inv.date || inv.operationalDate}</div>
                        {(inv.createdAt || inv.created_at) && (
                          <div className="text-[10px] text-on-surface-variant/70">
                            قيد: {formatTime12H(inv.createdAt || inv.created_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 whitespace-nowrap font-mono font-bold text-on-surface-variant">
                        {((Number(inv.transportCost) || 0) + (Number(inv.loadingCost) || 0)).toLocaleString('en-US')} ج.م
                      </td>
                      <td className="px-3.5 whitespace-nowrap font-mono font-black text-secondary">
                        {(Number(inv.total) || 0).toLocaleString('en-US')} ج.م
                      </td>
                      <td className="px-3.5 whitespace-nowrap">
                        <span className="text-[11px] font-bold text-on-surface-variant">
                          {inv.paymentTerms}
                        </span>
                      </td>
                      <td className="px-3.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {canReturn && (
                            <button
                              type="button"
                              onClick={() => setInvoiceForReturn(inv)}
                              className="p-1 rounded-full text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 transition-all cursor-pointer"
                              title="تسجيل مردود مشتريات"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForModal(inv)}
                            className="p-1 rounded-full text-primary bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForEdit(inv)}
                            className="p-1 rounded-full text-secondary bg-secondary/10 hover:bg-secondary/20 transition-all cursor-pointer"
                            title="تعديل الفاتورة"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setInvoiceToDelete(inv)}
                            className="p-1 rounded-full text-error bg-error/10 hover:bg-error/20 transition-all cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        <div className="lg:hidden space-y-2.5">
          {paginatedPurchases.length === 0 ? (
            <div className="py-8 text-center text-xs font-bold text-on-surface-variant">
              لا توجد فواتير مشتريات مسجلة في هذا النطاق
            </div>
          ) : (
            paginatedPurchases.map((inv) => {
              const theme = getInvoiceTypeTheme(inv.type)
              const canReturn = inv.type === 'purchase'
              return (
                <div key={inv.id} className={`p-3 rounded-2xl border ${theme.rowClass} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-mono font-black text-xs ${theme.codeClass}`}>{inv.code}</span>
                      {(inv.createdAt || inv.created_at) && (
                        <span className="text-[10px] text-on-surface-variant font-mono">
                          • {formatTime12H(inv.createdAt || inv.created_at)}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${theme.badgeClass}`}>
                      {theme.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-on-surface">{inv.partyName}</span>
                    <span className="font-mono text-on-surface-variant text-[11px]">{inv.date || inv.operationalDate}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-surface-container/60 text-xs font-mono">
                    <span className="text-on-surface-variant">{inv.paymentTerms}</span>
                    <span className="font-black text-secondary text-sm">{(Number(inv.total) || 0).toLocaleString('en-US')} ج.م</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-surface-container/40">
                    {canReturn && (
                      <button
                        type="button"
                        onClick={() => setInvoiceForReturn(inv)}
                        className="px-2.5 py-1 rounded-full text-[10px] font-black text-rose-700 bg-rose-500/10 cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>مردود</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceForModal(inv)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-black text-primary bg-primary/10 cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>عرض</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceForEdit(inv)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-black text-secondary bg-secondary/10 cursor-pointer flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>تعديل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceToDelete(inv)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-black text-error bg-error/10 cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-surface-container">
            <span className="text-xs font-bold text-on-surface-variant">
              صفحة {page} من {totalPages} ({totalItemsCount} عملية)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AX_InvoiceReturnModal
        isOpen={Boolean(invoiceForReturn)}
        onClose={() => setInvoiceForReturn(null)}
        invoice={invoiceForReturn}
        warehouses={warehouses}
        treasuryAccounts={treasuryAccounts}
        onSaveReturn={(ret) => { addInvoice(ret); setPurchaseTab('returns_only') }}
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
        defaultType="purchase"
        lockGroup="purchases"
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

      <AX_InvoiceDetailsModal
        isOpen={Boolean(selectedInvoiceForModal)}
        onClose={() => setSelectedInvoiceForModal(null)}
        invoice={selectedInvoiceForModal}
        warehouses={warehouses}
        treasuryAccounts={treasuryAccounts}
        onSaveReturn={(ret) => { addInvoice(ret); setPurchaseTab('returns_only') }}
        onEdit={(inv) => setSelectedInvoiceForEdit(inv)}
        onDelete={(id) => {
          const inv = (invoices || []).find((i) => i.id === id)
          if (inv) setInvoiceToDelete(inv)
        }}
      />

      <AX_ConfirmModal
        isOpen={Boolean(invoiceToDelete)}
        title="تأكيد حذف الفاتورة"
        message={invoiceToDelete ? `هل أنت متأكد من حذف الفاتورة ${invoiceToDelete.code}؟ سيتم إلغاء أثرها وعكس حركاتها وترحيلها لسجل المحذوفات.` : ''}
        confirmText="حذف وترحيل للمحذوفات"
        cancelText="إلغاء"
        isDestructive={true}
        onConfirm={() => {
          if (invoiceToDelete) {
            deleteInvoice(invoiceToDelete.id)
            setInvoiceToDelete(null)
          }
        }}
        onCancel={() => setInvoiceToDelete(null)}
      />
    </div>
  )
}

export default AX_PurchasesManager
