import React, { useState } from 'react'
import { Printer, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'

export function AX_InvoicePrintModal({ invoice, isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const [zoomLevel, setZoomLevel] = useState(1)

  if (!isOpen || !invoice) return null

  const items = invoice.items || []
  const subtotal = Number(invoice.subtotal) || 0
  const transportCost = Number(invoice.transportCost) || 0
  const loadingCost = Number(invoice.loadingCost) || 0
  const total = Number(invoice.total) || 0
  const paidAmount = Number(invoice.paidAmount) || 0
  const remainingAmount = Number(invoice.remainingAmount) || 0
  const status = invoice.status || (remainingAmount > 0 ? (paidAmount > 0 ? 'partial' : 'unpaid') : 'paid')

  const getTitle = (type) => {
    switch (type) {
      case 'purchase':
        return 'فاتورة مشتريات وتوريد'
      case 'sale_return':
        return 'إشعار مردود مبيعات'
      case 'purchase_return':
        return 'إشعار مردود مشتريات'
      default:
        return 'فاتورة مبيعات نقدية وآجلة'
    }
  }

  const getPaymentBadge = () => {
    if (status === 'paid') return 'مدفوع كلي'
    if (status === 'partial') return 'مدفوع جزئي'
    return 'غير مدفوع (آجل)'
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md animate-fadeIn overscroll-contain">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-surface-lowest/90 border-b border-outline-variant/30 text-on-surface shadow-xs print:hidden z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-black">معاينة وطباعة الفاتورة القياسية (A4)</span>
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-black">
            {invoice.code}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 bg-surface-low rounded-full px-2 py-1 border border-outline-variant/30 text-xs font-bold">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
              className="p-1 hover:bg-surface-container rounded-full cursor-pointer"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono px-1.5">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="p-1 hover:bg-surface-container rounded-full cursor-pointer"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:bg-surface-container rounded-full cursor-pointer"
              title="إعادة ضبط"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="py-1.5 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة A4</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start print:p-0 print:overflow-visible">
        <div
          className="bg-white text-slate-900 shadow-2xl transition-transform origin-top print:shadow-none print:w-full print:m-0 print:p-6"
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '16mm 14mm',
            boxSizing: 'border-box',
            transform: `scale(${zoomLevel})`,
          }}
        >
          <div className="border-b-2 border-primary pb-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-clean-original.png"
                  alt="Logo"
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div>
                  <h1 className="text-xl font-black text-primary tracking-tight">بروتين فود</h1>
                  <h2 className="text-xs font-bold text-slate-700">لتجهيز وحفظ وتوزيع اللحوم المجمدة</h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    س.ت: 89452 • ب.ض: 452-896-123 • هاتف: 01000000000
                  </p>
                </div>
              </div>

              <div className="text-left font-mono text-xs space-y-1">
                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary font-black text-sm text-center">
                  {getTitle(invoice.type)}
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">رقم الفاتورة: </span>
                  <strong className="text-slate-900">{invoice.code}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">التاريخ: </span>
                  <strong className="text-slate-900">{invoice.date || invoice.operationalDate || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">حالة السداد: </span>
                  <strong className="text-primary">{getPaymentBadge()}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 font-bold block text-[11px]">الطرف المعني:</span>
              <strong className="text-sm font-black text-slate-900 block">{invoice.partyName}</strong>
              <span className="text-slate-600 text-[11px] block mt-0.5">
                {invoice.partyType === 'supplier' || invoice.partyKind === 'supplier' ? 'حساب مورد معتمد' : 'حساب عميل معتمد'}
              </span>
            </div>
            <div className="text-left">
              <span className="text-slate-500 font-bold block text-[11px]">بيانات التوريد والصرف:</span>
              <span className="font-mono text-slate-700 block text-[11px]">المخزن: {invoice.warehouseId || 'المخزن الرئيسي'}</span>
              <span className="font-mono text-slate-700 block text-[11px]">تاريخ القيد: {invoice.createdAt?.split('T')[0] || invoice.date}</span>
            </div>
          </div>

          <div className="mb-4 overflow-hidden border border-slate-300 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-primary/5 text-primary border-b border-slate-300 font-black">
                <tr className="h-9">
                  <th className="px-2.5 text-center w-10">م</th>
                  <th className="px-3">بيان الصنف والمواصفات</th>
                  <th className="px-3 text-center">الوحدة</th>
                  <th className="px-3 text-center font-mono">الكمية</th>
                  <th className="px-3 text-left font-mono">السعر (ج.م)</th>
                  <th className="px-3 text-left font-mono">الإجمالي (ج.م)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-slate-400 font-bold">
                      لا توجد بنود مسجلة في هذه الفاتورة.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const q = Number(it.quantity) || 0
                    const p = Number(it.price) || 0
                    const lineTot = Number(it.total) || q * p
                    return (
                      <tr key={idx} className="h-8">
                        <td className="px-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="px-3 font-bold text-slate-900">{getItemDisplayName(it)}</td>
                        <td className="px-3 text-center text-slate-600 font-bold text-[11px]">{it.unit || 'كرتونة'}</td>
                        <td className="px-3 text-center font-mono font-bold text-slate-900">{q}</td>
                        <td className="px-3 text-left font-mono text-slate-700">{p.toLocaleString('en-US')}</td>
                        <td className="px-3 text-left font-mono font-black text-slate-900">{lineTot.toLocaleString('en-US')}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-600 block">شروط ومعلومات السداد:</span>
              <p className="text-slate-700 font-bold text-xs">{invoice.paymentTerms || getPaymentBadge()}</p>
              {invoice.treasuryId && (
                <p className="text-[11px] font-mono text-slate-500">الخزينة المقيدة: {invoice.treasuryId}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-2">
                * البضاعة الموضحة أعلاه مستلمة بحالة جيدة ومطابقة للمواصفات والأوزان المذكورة.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>قيمة البضاعة:</span>
                <span className="font-bold">{subtotal.toLocaleString('en-US')} ج.م</span>
              </div>
              {transportCost > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>مصاريف نقل وشحن:</span>
                  <span className="font-bold">{transportCost.toLocaleString('en-US')} ج.م</span>
                </div>
              )}
              {loadingCost > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>مصاريف شيالة وعمالة:</span>
                  <span className="font-bold">{loadingCost.toLocaleString('en-US')} ج.م</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-300 text-sm font-black text-primary">
                <span>إجمالي الفاتورة النهائي:</span>
                <span>{total.toLocaleString('en-US')} ج.م</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold text-xs">
                <span>المبلغ المسدد:</span>
                <span>{paidAmount.toLocaleString('en-US')} ج.م</span>
              </div>
              <div className="flex justify-between text-red-800 font-black text-xs">
                <span>المتبقي المستحق:</span>
                <span>{remainingAmount.toLocaleString('en-US')} ج.م</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-300 text-xs text-center font-bold text-slate-700">
            <div>
              <span className="block mb-8">توقيع المستلم / العميل</span>
              <span className="block border-t border-dashed border-slate-400 mx-4 pt-1 text-[11px] text-slate-500">الاسم والتوقيع</span>
            </div>
            <div>
              <span className="block mb-8">أمين المخزن والتجهيز</span>
              <span className="block border-t border-dashed border-slate-400 mx-4 pt-1 text-[11px] text-slate-500">التسليم والمطابقة</span>
            </div>
            <div>
              <span className="block mb-8">المدير المسؤول / الاعتماد</span>
              <span className="block border-t border-dashed border-slate-400 mx-4 pt-1 text-[11px] text-slate-500">الختم الرسمي</span>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-400 font-mono border-t border-slate-200 pt-2">
            بروتين فود لتجهيز وحفظ اللحوم المجمدة • تم استخراج وطباعة المستند رسمياً عبر منظومة AXONID
          </div>
        </div>
      </div>
    </div>
  )
}

export default AX_InvoicePrintModal
