import React, { useState, useMemo } from 'react'
import {
  X,
  Building,
  Phone,
  MapPin,
  Tag,
  DollarSign,
  FileSpreadsheet,
  Printer,
  Calendar,
  FileText,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Image as ImageIcon,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { getTransformedUrl } from '../../services/imageKitService'

export function AX_CustomerDetailsModal({ customer, isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const { invoices = [], cashTransactions = [] } = useAXStore()
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [activeTab, setActiveTab] = useState('summary')

  const ledgerEntries = useMemo(() => {
    if (!customer?.id) return []

    const entries = []
    const opBal = Number(customer.openingBalance) || 0
    const opType = customer.openingBalanceType || 'debit'
    const opSigned = opType === 'debit' ? opBal : -opBal

    if (opBal > 0) {
      entries.push({
        id: 'op-bal',
        date: customer.createdAt || new Date().toISOString(),
        type: 'opening',
        description: `رصيد أول المدة (${opType === 'debit' ? 'مدين / مستحق عليه' : 'دائن / دفعة مقدمة'})`,
        debit: opType === 'debit' ? opBal : 0,
        credit: opType === 'credit' ? opBal : 0,
        runningBalance: opSigned,
      })
    }

    const customerInvoices = (invoices || []).filter(
      (inv) => inv && (inv.clientId === customer.id || inv.partyName === customer.name)
    )

    customerInvoices.forEach((inv) => {
      const invTotal = Number(inv.total || inv.totalAmount) || 0
      const paid = Number(inv.paidAmount || inv.cashPaid) || 0
      entries.push({
        id: inv.id,
        date: inv.date || inv.createdAt || new Date().toISOString(),
        type: 'invoice',
        reference: inv.code || inv.id.slice(0, 8),
        description: `فاتورة مبيعات ${inv.code ? `[${inv.code}]` : ''}`,
        debit: invTotal,
        credit: paid,
      })
    })

    const customerReceipts = (cashTransactions || []).filter(
      (tx) => tx && (tx.partyName === customer.name || tx.partyId === customer.id) &&
        (tx.type === 'client_receipt' || tx.type === 'receipt' || tx.type === 'cash_in')
    )

    customerReceipts.forEach((rc) => {
      entries.push({
        id: rc.id,
        date: rc.date || rc.createdAt || new Date().toISOString(),
        type: 'payment',
        reference: rc.code || rc.id.slice(0, 8),
        description: rc.notes || 'سند تحصيل نقدي',
        debit: 0,
        credit: Number(rc.amount) || 0,
      })
    })

    entries.sort((a, b) => new Date(a.date) - new Date(b.date))

    let running = 0
    return entries.map((entry) => {
      const debit = entry.debit || 0
      const credit = entry.credit || 0
      running += (debit - credit)
      return { ...entry, runningBalance: running }
    })
  }, [customer, invoices, cashTransactions])

  if (!isOpen || !customer) return null

  const netBalance = customer.balance ?? (ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].runningBalance : 0)
  const isDebtor = netBalance > 0
  const isCreditor = netBalance < 0

  const totalDebits = ledgerEntries.reduce((s, e) => s + (e.debit || 0), 0)
  const totalCredits = ledgerEntries.reduce((s, e) => s + (e.credit || 0), 0)

  const attachmentsList = customer.attachments || []

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-4xl w-full shadow-level3 space-y-4 my-auto print:border-none print:shadow-none print:rounded-none">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm flex-shrink-0 print:hidden">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-on-surface">{customer.name}</h3>
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                  isDebtor ? 'bg-red-800 text-white' : isCreditor ? 'bg-emerald-700 text-white' : 'bg-surface-container text-on-surface'
                }`}>
                  {isDebtor ? 'مدين (مستحق عليه)' : isCreditor ? 'دائن (له مقدم)' : 'رصيد صفر (مسدد)'}
                </span>
                {customer.isIncomplete && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 border border-amber-500/30">
                    بيانات ناقصة
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant font-medium flex items-center gap-2 mt-0.5">
                <span className="font-mono text-primary">{customer.phone || 'بدون هاتف'}</span>
                <span>•</span>
                <span>{[customer.governorate, customer.city, customer.district].filter(Boolean).join(' - ') || 'الموقع غير محدد'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="py-1.5 px-3.5 rounded-full border border-outline-variant/50 text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              <span>طباعة</span>
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

        <div className="flex items-center gap-2 border-b border-surface-container pb-1 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'summary'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            نظرة عامة والملف
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'ledger'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            كشف حساب 360° ({ledgerEntries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'docs'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            المستندات والصور ({attachmentsList.length})
          </button>
        </div>

        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3">
                <span className="text-[11px] font-bold text-on-surface-variant block">صافي الرصيد الحالي</span>
                <span className={`text-base font-black font-mono ${isDebtor ? 'text-red-800' : isCreditor ? 'text-emerald-700' : 'text-on-surface'}`}>
                  {Math.abs(netBalance).toLocaleString('en-US')} ج.م
                </span>
              </div>
              <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3">
                <span className="text-[11px] font-bold text-on-surface-variant block">رصيد أول المدة</span>
                <span className="text-sm font-black font-mono text-on-surface">
                  {Number(customer.openingBalance || 0).toLocaleString('en-US')} ج.م
                </span>
                <span className="text-[10px] text-on-surface-variant block">
                  {customer.openingBalanceType === 'debit' ? 'مدين / مستحق عليه' : 'دائن / رصيد مقدم'}
                </span>
              </div>
              <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3">
                <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي المسحوبات (مدين)</span>
                <span className="text-sm font-black font-mono text-red-800">
                  {totalDebits.toLocaleString('en-US')} ج.م
                </span>
              </div>
              <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3">
                <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي السداد (دائن)</span>
                <span className="text-sm font-black font-mono text-emerald-700">
                  {totalCredits.toLocaleString('en-US')} ج.م
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-surface-low/40 border border-outline-variant/20 rounded-2xl p-4">
              <div className="space-y-2">
                <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
                  <span className="text-on-surface-variant font-bold">مسؤول المشتريات:</span>
                  <span className="font-black text-on-surface">{customer.contactPerson || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
                  <span className="text-on-surface-variant font-bold">الهاتف الإضافي:</span>
                  <span className="font-mono font-bold text-on-surface">{customer.phone2 || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
                  <span className="text-on-surface-variant font-bold">التصنيف:</span>
                  <span className="font-bold text-primary">
                    {customer.primaryCategory || 'عام'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
                  <span className="text-on-surface-variant font-bold">السجل التجاري:</span>
                  <span className="font-mono font-bold text-on-surface">{customer.commercialRegister || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
                  <span className="text-on-surface-variant font-bold">تبعية المندوب:</span>
                  <span className="font-bold text-primary">{customer.salesRepName || 'إدارة مباشرة'}</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
                  <span className="text-on-surface-variant font-bold">العنوان التفصيلي:</span>
                  <span className="font-bold text-on-surface truncate max-w-[200px]" title={customer.address}>
                    {customer.address || '—'}
                  </span>
                </div>
              </div>
            </div>

            {customer.notes && (
              <div className="bg-surface-low/30 border border-outline-variant/20 rounded-2xl p-3 text-xs">
                <span className="text-on-surface-variant font-bold block mb-1">ملاحظات:</span>
                <p className="text-on-surface font-medium">{customer.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="border border-outline-variant/30 rounded-2xl overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-surface-container/60 sticky top-0 border-b border-outline-variant/30 text-on-surface font-black">
                  <tr>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">البيان والحركة</th>
                    <th className="py-2.5 px-3 font-mono">مدين (+)</th>
                    <th className="py-2.5 px-3 font-mono">دائن (-)</th>
                    <th className="py-2.5 px-3 font-mono">الرصيد الجاري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-on-surface-variant font-bold">
                        لا توجد حركات مسجلة لهذا العميل حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((row) => (
                      <tr key={row.id} className="hover:bg-surface-container/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-on-surface-variant whitespace-nowrap">
                          {row.date ? String(row.date).split('T')[0] : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-on-surface">
                          <div className="flex items-center gap-1.5">
                            {row.debit > 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-red-700 flex-shrink-0" />
                            ) : (
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            )}
                            <span>{row.description}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-red-800">
                          {row.debit > 0 ? `${row.debit.toLocaleString('en-US')} ج.م` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          {row.credit > 0 ? `${row.credit.toLocaleString('en-US')} ج.م` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-on-surface">
                          {row.runningBalance.toLocaleString('en-US')} ج.م
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-3">
            {attachmentsList.length === 0 ? (
              <div className="p-8 text-center bg-surface-low/30 rounded-2xl border border-outline-variant/20">
                <ImageIcon className="w-8 h-8 text-outline-variant mx-auto mb-2" />
                <p className="text-xs font-bold text-on-surface-variant">لا توجد مستندات أو صور مرفقة لهذا العميل.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {attachmentsList.map((att, idx) => {
                  const thumb = att.thumbnailUrl || att.url
                  const displayThumb = thumb ? getTransformedUrl(thumb, { width: 300, height: 200, quality: 80 }) : thumb
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedPhoto(att.url)}
                      className="group cursor-pointer rounded-2xl overflow-hidden border border-outline-variant/40 bg-surface-lowest hover:border-primary transition-all shadow-xs"
                    >
                      <div className="h-28 bg-surface-low overflow-hidden relative">
                        <img src={displayThumb} alt={att.name || 'مستند'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <ExternalLink className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="p-2 text-[11px] font-bold text-on-surface truncate">
                        {att.name || `مستند ${idx + 1}`}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {selectedPhoto && (
          <div
            className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh]">
              <img src={selectedPhoto} alt="" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AX_CustomerDetailsModal
