import React, { useState, useEffect } from 'react'
import {
  Printer,
  X,
  ZoomIn,
  ZoomOut,
  Share2,
  Download,
  Copy,
  Maximize2,
  Loader2,
  Building2,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'
import { getCompanyProfile } from '../../services/axCompanyProfileService'
import { AX_CompanyProfileModal } from '../profile/AX_CompanyProfileModal'
import {
  PAPER_FORMATS,
  formatPrintDate,
  getInvoiceTitle,
  getItemUnitDisplay,
} from './invoicePrintConstants'
import {
  shareInvoiceImageToWhatsApp,
  downloadInvoiceImage,
  copyInvoiceImageToClipboard,
} from '../../services/axInvoiceImageService'
import { formatTime12H } from '../../utils/dateHelpers'

export function AX_InvoicePrintModal({ invoice, isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const warehouses = useAXStore((s) => s.warehouses || [])
  const [company, setCompany] = useState(getCompanyProfile)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [paperFormat, setPaperFormat] = useState('a4_portrait')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isExporting, setIsExporting] = useState(false)

  const currentFormat = PAPER_FORMATS[paperFormat] || PAPER_FORMATS.a4_portrait

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e?.detail) setCompany(e.detail)
      else setCompany(getCompanyProfile())
    }
    window.addEventListener('ax_company_profile_updated', handleUpdate)
    return () => window.removeEventListener('ax_company_profile_updated', handleUpdate)
  }, [])

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
  const discountAmount = Number(invoice.discountAmount || invoice.discount_amount || 0)
  const discountType = invoice.discountType || invoice.discount_type || 'none'
  const discountValue = Number(invoice.discountValue || invoice.discount_value || 0)
  const transportCost = Number(invoice.transportCost) || 0
  const loadingCost = Number(invoice.loadingCost) || 0
  const total = Number(invoice.total) || 0
  const paidAmount = Number(invoice.paidAmount) || 0
  const remainingAmount = Number(invoice.remainingAmount) || 0
  const status = invoice.status || (remainingAmount > 0 ? (paidAmount > 0 ? 'partial' : 'unpaid') : 'paid')
  const paymentBadge = status === 'paid' ? 'مدفوع كلي' : status === 'partial' ? 'مدفوع جزئي' : 'غير مدفوع (آجل)'

  const getWarehouseName = (whId) => {
    if (!whId) return 'المخزن الرئيسي'
    const wh = warehouses.find((w) => w.id === whId || w.code === whId || w.name === whId)
    if (wh) return wh.name
    if (whId === 'wh-main' || whId === 'main') return 'المخزن الرئيسي'
    return whId
  }

  const handlePrint = () => {
    document.body.classList.remove('print-format-a4-portrait', 'print-format-a4-landscape', 'print-format-a5')
    if (currentFormat.bodyClass) document.body.classList.add(currentFormat.bodyClass)
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
    <>
      <div className="ax-print-modal-backdrop fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md animate-fadeIn overscroll-contain">
        <div className="ax-print-controls flex items-center justify-between px-3 sm:px-6 py-2 bg-surface-lowest/95 border-b border-outline-variant/30 text-on-surface shadow-xs print:hidden z-10 gap-2 flex-wrap">
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
            <button
              type="button"
              onClick={() => setShowCompanyModal(true)}
              className="py-1 px-2.5 rounded-full bg-surface-low hover:bg-surface-container text-on-surface border border-outline-variant/40 text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-all"
              title="تعديل بيانات المؤسسة والترويسة"
            >
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">بيانات المؤسسة</span>
            </button>

            <div className="flex items-center gap-1 bg-surface-low rounded-full px-2 py-0.5 border border-outline-variant/30 text-xs font-bold">
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
              title="مشاركة صورة الفاتورة فوراً على واتساب"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>مشاركة واتساب</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="py-1.5 px-3 rounded-full bg-surface-low hover:bg-surface-container text-on-surface border border-outline-variant/40 text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
              title="تحميل صورة الفاتورة PNG"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">تحميل صورة</span>
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isExporting}
              className="hidden sm:flex py-1.5 px-2.5 rounded-full bg-surface-low hover:bg-surface-container text-on-surface border border-outline-variant/40 text-xs font-black shadow-xs items-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
              title="نسخ الصورة للحافظة"
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
            className={`ax-a4-sheet bg-white text-slate-900 shadow-2xl transition-transform origin-top print:shadow-none print:m-0 ${currentFormat.formatClass}`}
            style={{
              width: currentFormat.width,
              minWidth: currentFormat.width,
              minHeight: currentFormat.minHeight,
              padding: currentFormat.padding,
              boxSizing: 'border-box',
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
            }}
          >
            <div className="border-b-2 border-[#991b1b] pb-3 mb-3">
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
                    <h1 className="text-xl font-black text-[#991b1b] leading-tight">
                      {company.name || 'بروتين فود'}
                    </h1>
                    <h2 className="text-xs font-bold text-slate-700 mt-0.5">
                      {company.subtitle || 'لتجهيز وحفظ وتوزيع اللحوم المجمدة'}
                    </h2>
                    <div className="text-[11px] text-slate-600 font-mono mt-1 flex items-center gap-2 flex-wrap">
                      {company.crNumber && (
                        <span>س.ت: <bdi dir="ltr">{company.crNumber}</bdi></span>
                      )}
                      {company.taxNumber && (
                        <>
                          <span>•</span>
                          <span>ب.ض: <bdi dir="ltr">{company.taxNumber}</bdi></span>
                        </>
                      )}
                      {company.phone && (
                        <>
                          <span>•</span>
                          <span>هاتف: <bdi dir="ltr">{company.phone}</bdi></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-left font-mono text-xs space-y-1">
                  <div className="inline-block px-3 py-1 rounded-full bg-[#991b1b]/10 border border-[#991b1b]/30 text-[#991b1b] font-black text-xs text-center">
                    {getInvoiceTitle(invoice.type)}
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">رقم الفاتورة: </span>
                    <strong className="text-slate-900">{invoice.code}</strong>
                    {(invoice.createdAt || invoice.created_at) && (
                      <span className="text-slate-500 text-[10px] mr-1">
                        ({formatTime12H(invoice.createdAt || invoice.created_at)})
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">التاريخ: </span>
                    <bdi dir="ltr" className="font-mono font-bold text-slate-900 inline-block">
                      {formatPrintDate(invoice.date || invoice.operationalDate)}
                    </bdi>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">حالة السداد: </span>
                    <strong className="text-[#991b1b]">{paymentBadge}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-bold block text-[11px]">الطرف المعني:</span>
                <strong className="text-sm font-black text-slate-900 block">
                  {invoice.partyName || (invoice.type === 'purchase' ? 'مورد غير محدد' : 'عميل نقدي')}
                </strong>
                {invoice.partyPhone && (
                  <span className="text-slate-600 font-mono text-[11px] block mt-0.5">
                    هاتف: <bdi dir="ltr">{invoice.partyPhone}</bdi>
                  </span>
                )}
              </div>
              <div className="text-left">
                <span className="text-slate-500 font-bold block text-[11px]">بيانات التوريد والصرف:</span>
                <span className="text-slate-700 block text-[11px]">
                  المخزن: <strong className="text-slate-900 font-bold">{getWarehouseName(invoice.warehouseId)}</strong>
                </span>
                <span className="text-slate-700 block text-[11px]">
                  تاريخ القيد: <bdi dir="ltr" className="font-mono">{formatPrintDate(invoice.createdAt || invoice.date)}{(invoice.createdAt || invoice.created_at) ? ` ${formatTime12H(invoice.createdAt || invoice.created_at)}` : ''}</bdi>
                </span>
              </div>
            </div>

            <div className="mb-3 overflow-hidden border border-slate-300 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#991b1b]/5 text-[#991b1b] border-b border-slate-300 font-black">
                  <tr className="h-8">
                    <th className="px-2 text-center w-8">م</th>
                    <th className="px-3">بيان الصنف والمواصفات</th>
                    <th className="px-2.5 text-center">الوحدة</th>
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
                      return (
                        <tr key={idx} className="h-7.5 hover:bg-slate-50/50">
                          <td className="px-2 text-center font-mono text-slate-500 text-[11px]">{idx + 1}</td>
                          <td className="px-3 font-bold text-slate-900">{getItemDisplayName(it)}</td>
                          <td className="px-2.5 text-center text-slate-700 font-bold text-[11px]">{getItemUnitDisplay(it)}</td>
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
                <p className="text-slate-700 font-bold text-xs">{invoice.paymentTerms || paymentBadge}</p>
                {invoice.treasuryId && (
                  <p className="text-[11px] font-mono text-slate-500">الخزينة المقيدة: {invoice.treasuryId}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  • البضاعة الموضحة أعلاه مستلمة بحالة جيدة ومطابقة للمواصفات والأوزان المذكورة.
                </p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>قيمة البضاعة:</span>
                  <span className="font-bold">{subtotal.toLocaleString('en-US')} ج.م</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>قيمة الخصم {discountType === 'percent' ? `(${discountValue}%)` : ''}:</span>
                    <span>-{discountAmount.toLocaleString('en-US')} ج.م</span>
                  </div>
                )}
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
                <div className="flex justify-between pt-1 border-t border-slate-300 text-sm font-black text-[#991b1b]">
                  <span>إجمالي الفاتورة:</span>
                  <span>{total.toLocaleString('en-US')} ج.م</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold text-xs">
                  <span>المبلغ المسدد:</span>
                  <span>{paidAmount.toLocaleString('en-US')} ج.م</span>
                </div>
                <div className="flex justify-between text-[#991b1b] font-black text-xs">
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

            <div className="mt-4 border-t border-slate-200 pt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-bold">
              <span>{company.subtitle || 'بروتين فود لتجهيز وحفظ وتوزيع اللحوم المجمدة'}</span>
              <span className="font-mono font-black text-slate-700 tracking-wider">AXSONID</span>
            </div>
          </div>
        </div>
      </div>

      <AX_CompanyProfileModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
      />
    </>
  )
}

export default AX_InvoicePrintModal
