import React, { useState, useEffect } from 'react'
import {
  Printer,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Share2,
  Download,
  Copy,
  Maximize2,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'
import { formatDualUnits } from '../../utils/itemUnitFormatters'
import {
  shareInvoiceImageToWhatsApp,
  downloadInvoiceImage,
  copyInvoiceImageToClipboard,
} from '../../services/axInvoiceImageService'

const PAPER_FORMATS = {
  a4_portrait: {
    id: 'a4_portrait',
    label: 'A4 طولي (معتمد)',
    width: '210mm',
    minHeight: '297mm',
    padding: '14mm 12mm',
    formatClass: 'format-a4-portrait',
    bodyClass: 'print-format-a4-portrait',
    targetPx: 794,
  },
  a4_landscape: {
    id: 'a4_landscape',
    label: 'A4 عرضي',
    width: '297mm',
    minHeight: '210mm',
    padding: '10mm 14mm',
    formatClass: 'format-a4-landscape',
    bodyClass: 'print-format-a4-landscape',
    targetPx: 1123,
  },
  a5: {
    id: 'a5',
    label: 'A5 مدمج',
    width: '148mm',
    minHeight: '210mm',
    padding: '8mm 8mm',
    formatClass: 'format-a5',
    bodyClass: 'print-format-a5',
    targetPx: 559,
  },
}

export function AX_InvoicePrintModal({ invoice, isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const [paperFormat, setPaperFormat] = useState('a4_portrait')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isExporting, setIsExporting] = useState(false)

  const currentFormat = PAPER_FORMATS[paperFormat] || PAPER_FORMATS.a4_portrait

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return
    const screenWidth = window.innerWidth
    const target = currentFormat.targetPx
    if (screenWidth < target + 48) {
      const fit = Math.max(0.35, Math.min(1, (screenWidth - 36) / target))
      setZoomLevel(Number(fit.toFixed(2)))
    } else {
      setZoomLevel(1)
    }
  }, [paperFormat, isOpen])

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
        return 'إشعار مردود مبيعات معتمد'
      case 'purchase_return':
        return 'إشعار مردود مشتريات معتمد'
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
    document.body.classList.remove('print-format-a4-portrait', 'print-format-a4-landscape', 'print-format-a5')
    if (currentFormat.bodyClass) {
      document.body.classList.add(currentFormat.bodyClass)
    }
    window.print()
    setTimeout(() => {
      document.body.classList.remove('print-format-a4-portrait', 'print-format-a4-landscape', 'print-format-a5')
    }, 1000)
  }

  const handleShareWhatsAppImage = async () => {
    const sheet = document.getElementById('ax-invoice-print-sheet')
    if (!sheet) return
    setIsExporting(true)
    try {
      await shareInvoiceImageToWhatsApp(invoice, sheet)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadImage = async () => {
    const sheet = document.getElementById('ax-invoice-print-sheet')
    if (!sheet) return
    setIsExporting(true)
    try {
      await downloadInvoiceImage(invoice, sheet)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyImage = async () => {
    const sheet = document.getElementById('ax-invoice-print-sheet')
    if (!sheet) return
    setIsExporting(true)
    try {
      await copyInvoiceImageToClipboard(sheet)
    } finally {
      setIsExporting(false)
    }
  }

  const handleResetFit = () => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000
    const target = currentFormat.targetPx
    if (screenWidth < target + 48) {
      const fit = Math.max(0.35, Math.min(1, (screenWidth - 36) / target))
      setZoomLevel(Number(fit.toFixed(2)))
    } else {
      setZoomLevel(1)
    }
  }

  return (
    <div className="ax-print-modal-backdrop fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md animate-fadeIn overscroll-contain">
      <div className="ax-print-controls flex items-center justify-between px-3 sm:px-6 py-2.5 bg-surface-lowest/95 border-b border-outline-variant/30 text-on-surface shadow-xs print:hidden z-10 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-black text-on-surface">طباعة ومشاركة الفاتورة</span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-black">
              {invoice.code}
            </span>
          </div>

          <div className="inline-flex items-center p-0.5 rounded-full bg-surface-low border border-outline-variant/30 text-[11px] font-bold">
            {Object.values(PAPER_FORMATS).map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setPaperFormat(fmt.id)}
                className={`px-2.5 py-1 rounded-full font-black cursor-pointer transition-all ${
                  paperFormat === fmt.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="hidden md:flex items-center gap-1 bg-surface-low rounded-full px-2 py-0.5 border border-outline-variant/30 text-xs font-bold">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
              className="p-1 hover:bg-surface-container rounded-full cursor-pointer text-on-surface-variant"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono px-1 text-[11px]">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
              className="p-1 hover:bg-surface-container rounded-full cursor-pointer text-on-surface-variant"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetFit}
              className="p-1 hover:bg-surface-container rounded-full cursor-pointer text-on-surface-variant"
              title="ملاءمة الشاشة"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleShareWhatsAppImage}
            disabled={isExporting}
            className="py-1.5 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
            title="مشاركة الفاتورة كصورة على واتساب"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>مشاركة واتساب</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="py-1.5 px-3 rounded-full bg-surface-low hover:bg-surface-container text-on-surface border border-outline-variant/40 text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
            title="تحميل صورة الفاتورة PNG عالية الجودة"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">تحميل صورة</span>
          </button>

          <button
            type="button"
            onClick={handleCopyImage}
            disabled={isExporting}
            className="hidden sm:flex py-1.5 px-2.5 rounded-full bg-surface-low hover:bg-surface-container text-on-surface border border-outline-variant/40 text-xs font-black shadow-xs items-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
            title="نسخ الصورة للحافظة للصقها مباشرة"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>نسخ</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="py-1.5 px-3.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-md flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
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

      <div className="ax-print-viewport-container flex-1 overflow-auto p-2 sm:p-6 flex justify-center items-start print:p-0 print:overflow-visible touch-pan-x touch-pan-y">
        <div
          id="ax-invoice-print-sheet"
          className={`bg-white text-slate-900 shadow-2xl transition-transform origin-top print:shadow-none print:m-0 ${currentFormat.formatClass}`}
          style={{
            width: currentFormat.width,
            minHeight: currentFormat.minHeight,
            padding: currentFormat.padding,
            boxSizing: 'border-box',
            transform: `scale(${zoomLevel})`,
          }}
        >
          <div className="border-b-2 border-primary pb-3 mb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-clean-original.png"
                  alt="Logo"
                  className="w-14 h-14 object-contain shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div>
                  <h1 className="text-lg font-black text-primary tracking-tight">بروتين فود</h1>
                  <h2 className="text-xs font-bold text-slate-700">لتجهيز وحفظ وتوزيع اللحوم المجمدة</h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    س.ت: 89452 • ب.ض: 452-896-123 • هاتف: 01000000000
                  </p>
                </div>
              </div>

              <div className="text-left font-mono text-xs space-y-1">
                <div className="inline-block px-3 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-black text-xs text-center">
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

          <div className="grid grid-cols-2 gap-2.5 mb-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
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

          <div className="mb-3 overflow-hidden border border-slate-300 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-primary/5 text-primary border-b border-slate-300 font-black">
                <tr className="h-8">
                  <th className="px-2 text-center w-8">م</th>
                  <th className="px-3">بيان الصنف والمواصفات</th>
                  <th className="px-2.5 text-center">الوحدة والبيان</th>
                  <th className="px-2.5 text-center font-mono">الكمية</th>
                  <th className="px-3 text-left font-mono" style={{ whiteSpace: 'nowrap' }}>السعر (ج.م)</th>
                  <th className="px-3 text-left font-mono" style={{ whiteSpace: 'nowrap' }}>الإجمالي (ج.م)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-slate-400 font-bold">
                      لا توجد بنود مسجلة في هذه الفاتورة.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const q = Number(it.quantity) || 0
                    const p = Number(it.price) || 0
                    const lineTot = Number(it.total) || q * p
                    const unitFormatted = formatDualUnits(q, it.unit, it)
                    return (
                      <tr key={idx} className="h-7.5 hover:bg-slate-50/50">
                        <td className="px-2 text-center font-mono text-slate-500 text-[11px]">{idx + 1}</td>
                        <td className="px-3 font-bold text-slate-900">{getItemDisplayName(it)}</td>
                        <td className="px-2.5 text-center text-slate-700 font-bold text-[11px]">{unitFormatted}</td>
                        <td className="px-2.5 text-center font-mono font-bold text-slate-900">{q}</td>
                        <td className="px-3 text-left font-mono text-slate-700" style={{ whiteSpace: 'nowrap' }}>
                          {p.toLocaleString('en-US')}
                        </td>
                        <td className="px-3 text-left font-mono font-black text-slate-900" style={{ whiteSpace: 'nowrap' }}>
                          {lineTot.toLocaleString('en-US')}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-600 block">شروط ومعلومات السداد:</span>
              <p className="text-slate-700 font-bold text-xs">{invoice.paymentTerms || getPaymentBadge()}</p>
              {invoice.treasuryId && (
                <p className="text-[11px] font-mono text-slate-500">الخزينة المقيدة: {invoice.treasuryId}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-1">
                * البضاعة الموضحة أعلاه مستلمة بحالة جيدة ومطابقة للمواصفات والأوزان المذكورة.
              </p>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1 font-mono text-xs">
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
                <span>إجمالي الفاتورة:</span>
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

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-300 text-xs text-center font-bold text-slate-700">
            <div>
              <span className="block mb-6 text-[11px]">توقيع المستلم / العميل</span>
              <span className="block border-t border-dashed border-slate-400 mx-3 pt-1 text-[10px] text-slate-500">الاسم والتوقيع</span>
            </div>
            <div>
              <span className="block mb-6 text-[11px]">أمين المخزن والتجهيز</span>
              <span className="block border-t border-dashed border-slate-400 mx-3 pt-1 text-[10px] text-slate-500">التسليم والمطابقة</span>
            </div>
            <div>
              <span className="block mb-6 text-[11px]">المدير المسؤول / الاعتماد</span>
              <span className="block border-t border-dashed border-slate-400 mx-3 pt-1 text-[10px] text-slate-500">الختم الرسمي</span>
            </div>
          </div>

          <div className="mt-4 text-center text-[10px] text-slate-400 font-mono border-t border-slate-200 pt-1.5 flex items-center justify-between">
            <span>بروتين فود لتجهيز وحفظ اللحوم المجمدة</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
              <CheckCircle2 className="w-3 h-3" />
              مستند معتمد رسمياً عبر منظومة AXONID
            </span>
            <span>{currentFormat.label}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AX_InvoicePrintModal
