import React, { useState, useMemo } from 'react'
import {
  X,
  Building2,
  Phone,
  MapPin,
  FileSpreadsheet,
  Printer,
  FileText,
  DollarSign,
  Layers,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Calendar,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { getSupplyTypeLabel } from './supplierConstants'

export function AX_SupplierDetailsModal({ supplier, isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const { invoices = [], cashTransactions = [] } = useAXStore()
  const [activeTab, setActiveTab] = useState('ledger')

  const supplierPurchases = useMemo(() => {
    if (!supplier?.id) return []
    return (invoices || []).filter(
      (inv) =>
        inv &&
        inv.type === 'purchase' &&
        (inv.supplierId === supplier.id ||
          inv.partyName === supplier.companyName ||
          inv.partyName === supplier.name)
    )
  }, [supplier, invoices])

  const supplierPayouts = useMemo(() => {
    if (!supplier?.id) return []
    return (cashTransactions || []).filter(
      (tx) =>
        tx &&
        (tx.partyId === supplier.id ||
          tx.partyName === supplier.companyName ||
          tx.partyName === supplier.name) &&
        (tx.type === 'payment' || tx.type === 'cash_out')
    )
  }, [supplier, cashTransactions])

  const ledgerEntries = useMemo(() => {
    if (!supplier?.id) return []
    const entries = []
    const opBal = Number(supplier.openingBalance) || 0
    const opType = supplier.openingBalanceType || 'payable'
    const opSigned = opType === 'payable' ? opBal : -opBal

    if (opBal > 0) {
      entries.push({
        id: 'op-bal',
        date: supplier.createdAt || new Date().toISOString(),
        type: 'opening',
        description: `رصيد أول المدة (${opType === 'payable' ? 'دائن / مستحق له' : 'مدين / مقدم له'})`,
        credit: opType === 'payable' ? opBal : 0,
        debit: opType === 'receivable' ? opBal : 0,
        runningBalance: opSigned,
      })
    }

    supplierPurchases.forEach((inv) => {
      const invTotal = Number(inv.totalAmount || inv.total) || 0
      const paid = Number(inv.paidAmount || inv.cashPaid) || 0
      const unpaid = Math.max(0, invTotal - paid)

      entries.push({
        id: inv.id,
        date: inv.createdAt || inv.date || new Date().toISOString(),
        type: 'purchase_invoice',
        reference: inv.invoiceNumber || inv.code || inv.id,
        description: `فاتورة شراء وتوريد #${inv.invoiceNumber || inv.code || inv.id.slice(0, 8)}`,
        credit: invTotal,
        debit: paid,
        remaining: unpaid,
      })
    })

    supplierPayouts.forEach((po) => {
      entries.push({
        id: po.id,
        date: po.createdAt || po.date || new Date().toISOString(),
        type: 'disbursement',
        reference: po.id,
        description: po.description || 'سند صرف نقدي / دفعة للمورد',
        credit: 0,
        debit: Number(po.amount) || 0,
      })
    })

    entries.sort((a, b) => new Date(a.date) - new Date(b.date))

    let running = 0
    return entries.map((entry) => {
      const credit = entry.credit || 0
      const debit = entry.debit || 0
      running += (credit - debit)
      return { ...entry, runningBalance: running }
    })
  }, [supplier, supplierPurchases, supplierPayouts])

  const totalPurchasesAmount = useMemo(() => {
    return supplierPurchases.reduce((sum, inv) => sum + (Number(inv.totalAmount || inv.total) || 0), 0)
  }, [supplierPurchases])

  const totalPaidAmount = useMemo(() => {
    const fromInvoices = supplierPurchases.reduce((sum, inv) => sum + (Number(inv.paidAmount || inv.cashPaid) || 0), 0)
    const fromPayouts = supplierPayouts.reduce((sum, po) => sum + (Number(po.amount) || 0), 0)
    return fromInvoices + fromPayouts
  }, [supplierPurchases, supplierPayouts])

  if (!isOpen || !supplier) return null

  const netBalance = Number(supplier.balance) || 0
  const isPayable = netBalance > 0
  const isReceivable = netBalance < 0

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-4xl w-full shadow-level3 space-y-5 my-auto print:border-none print:shadow-none print:rounded-none">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center print:hidden">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-on-surface">
                  {supplier.companyName || supplier.name}
                </h3>
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                    isPayable
                      ? 'bg-red-800 text-white'
                      : isReceivable
                      ? 'bg-emerald-700 text-white'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {isPayable ? 'دائن (مستحق له)' : isReceivable ? 'مدين (مقدم له)' : 'حساب متوازن'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-bold flex items-center gap-2 mt-0.5">
                <span>المسؤول: {supplier.contactPerson || 'غير محدد'}</span>
                {supplier.phone && <span>• {supplier.phone}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="py-1.5 px-3 rounded-full border border-outline-variant/50 hover:bg-surface-container text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة A4</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-surface-container/20 border border-outline-variant/20 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-on-surface-variant block">رصيد أول المدة</span>
            <span className="text-sm sm:text-base font-black font-mono text-on-surface">
              {(Number(supplier.openingBalance) || 0).toLocaleString('en-US')} ج.م
            </span>
            <span className="text-[10px] text-on-surface-variant block">
              {supplier.openingBalanceType === 'payable' ? 'دائن (له)' : 'مدين (مقدم له)'}
            </span>
          </div>

          <div className="bg-surface-container/20 border border-outline-variant/20 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي المشتريات</span>
            <span className="text-sm sm:text-base font-black font-mono text-on-surface">
              {totalPurchasesAmount.toLocaleString('en-US')} ج.م
            </span>
            <span className="text-[10px] text-on-surface-variant block">
              ({supplierPurchases.length} فاتورة توريد)
            </span>
          </div>

          <div className="bg-surface-container/20 border border-outline-variant/20 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي المسدد</span>
            <span className="text-sm sm:text-base font-black font-mono text-emerald-700">
              {totalPaidAmount.toLocaleString('en-US')} ج.م
            </span>
            <span className="text-[10px] text-on-surface-variant block">
              ({supplierPayouts.length} دفعة وسند)
            </span>
          </div>

          <div className="bg-surface-container/20 border border-outline-variant/20 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-on-surface-variant block">صافي الرصيد الحالي</span>
            <span
              className={`text-sm sm:text-base font-black font-mono ${
                isPayable ? 'text-red-800' : isReceivable ? 'text-emerald-700' : 'text-on-surface'
              }`}
            >
              {Math.abs(netBalance).toLocaleString('en-US')} ج.م
            </span>
            <span className="text-[10px] font-bold block text-on-surface-variant">
              {isPayable ? 'مستحق للمورد (له)' : isReceivable ? 'دفعة مقدمة (لنا)' : 'حساب خالص'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-b border-surface-container pb-2 overflow-x-auto print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`py-1.5 px-3.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'ledger'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            كشف الحساب 360° ({ledgerEntries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`py-1.5 px-3.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'purchases'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            فواتير التوريد ({supplierPurchases.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payouts')}
            className={`py-1.5 px-3.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'payouts'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            المدفوعات والصرف ({supplierPayouts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-1.5 px-3.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'profile'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            الملف المؤسسي
          </button>
        </div>

        {activeTab === 'ledger' && (
          <div className="border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-surface-container/60 sticky top-0 border-b border-outline-variant/30 font-black">
                  <tr className="h-10">
                    <th className="px-3">التاريخ</th>
                    <th className="px-3">نوع الحركة</th>
                    <th className="px-4">البيان والوصف</th>
                    <th className="px-3 font-mono">دائن (استحقاق)</th>
                    <th className="px-3 font-mono">مدين (مسدد)</th>
                    <th className="px-3 font-mono">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-on-surface-variant font-bold">
                        لا توجد حركات مالية مسجلة في كشف الحساب حالياً.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((row) => (
                      <tr key={row.id} className="h-10 hover:bg-surface-container/20">
                        <td className="px-3 font-mono text-[11px] whitespace-nowrap text-on-surface-variant">
                          {row.date.split('T')[0]}
                        </td>
                        <td className="px-3 whitespace-nowrap">
                          {row.type === 'opening' && (
                            <span className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] font-bold">
                              افتتاحي
                            </span>
                          )}
                          {row.type === 'purchase_invoice' && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                              فاتورة توريد
                            </span>
                          )}
                          {row.type === 'disbursement' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                              سند صرف
                            </span>
                          )}
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
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'purchases' && (
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {supplierPurchases.length === 0 ? (
              <p className="text-center py-8 text-xs font-bold text-on-surface-variant">
                لا توجد فواتير شراء وتوريد مسجلة لهذا المورد.
              </p>
            ) : (
              supplierPurchases.map((inv) => {
                const total = Number(inv.totalAmount || inv.total) || 0
                const paid = Number(inv.paidAmount || inv.cashPaid) || 0
                const remaining = Math.max(0, total - paid)
                return (
                  <div
                    key={inv.id}
                    className="p-3 bg-surface-lowest border border-outline-variant/30 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-on-surface">#{inv.code || inv.invoiceNumber || inv.id.slice(0, 8)}</span>
                        <span className="text-[11px] font-mono text-on-surface-variant">{inv.date}</span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant block mt-0.5">
                        الأصناف: {inv.items ? inv.items.length : 1} صنف • {inv.paymentTerms || 'توريد'}
                      </span>
                    </div>

                    <div className="text-left font-mono">
                      <span className="font-black text-on-surface block">{total.toLocaleString('en-US')} ج.م</span>
                      <span className="text-[10px] text-on-surface-variant">
                        مسدد: {paid.toLocaleString('en-US')} • متبقي: {remaining.toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {supplierPayouts.length === 0 ? (
              <p className="text-center py-8 text-xs font-bold text-on-surface-variant">
                لا توجد سندات صرف أو دفعات نقدية مسجلة لهذا المورد.
              </p>
            ) : (
              supplierPayouts.map((po) => (
                <div
                  key={po.id}
                  className="p-3 bg-surface-lowest border border-outline-variant/30 rounded-2xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-on-surface block">{po.description || 'سند صرف نقدي'}</span>
                    <span className="text-[11px] font-mono text-on-surface-variant">{po.date || po.createdAt?.split('T')[0]}</span>
                  </div>
                  <span className="font-mono font-black text-emerald-700">
                    {(Number(po.amount) || 0).toLocaleString('en-US')} ج.م
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-surface-container/20 p-4 rounded-2xl border border-outline-variant/20">
            <div>
              <span className="text-on-surface-variant font-bold block">اسم الشركة / المنشأة:</span>
              <span className="font-black text-on-surface">{supplier.companyName || supplier.name}</span>
            </div>
            <div>
              <span className="text-on-surface-variant font-bold block">الشخص المسؤول:</span>
              <span className="font-black text-on-surface">{supplier.contactPerson || '—'}</span>
            </div>
            <div>
              <span className="text-on-surface-variant font-bold block">رقم الهاتف:</span>
              <span className="font-mono text-on-surface">{supplier.phone || '—'}</span>
            </div>
            <div>
              <span className="text-on-surface-variant font-bold block">هاتف إضافي:</span>
              <span className="font-mono text-on-surface">{supplier.phone2 || '—'}</span>
            </div>
            <div>
              <span className="text-on-surface-variant font-bold block">نوع التوريد:</span>
              <span className="font-bold text-primary">{getSupplyTypeLabel(supplier.supplyType)}</span>
            </div>
            <div>
              <span className="text-on-surface-variant font-bold block">القسم / التصنيف:</span>
              <span className="font-bold text-on-surface">{supplier.category || 'خامات'}</span>
            </div>
            <div>
              <span className="text-on-surface-variant font-bold block">السجل التجاري:</span>
              <span className="font-mono text-on-surface">{supplier.commercialRegistration || supplier.commercialRegister || '—'}</span>
            </div>
            <div>
              <span className="text-on-surface-variant font-bold block">البطاقة الضريبية:</span>
              <span className="font-mono text-on-surface">{supplier.taxNumber || '—'}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-on-surface-variant font-bold block">العنوان:</span>
              <span className="text-on-surface">{supplier.address || '—'}</span>
            </div>
            {supplier.notes && (
              <div className="sm:col-span-2">
                <span className="text-on-surface-variant font-bold block">ملاحظات:</span>
                <span className="text-on-surface">{supplier.notes}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AX_SupplierDetailsModal
