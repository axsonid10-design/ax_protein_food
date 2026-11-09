import React, { useState, useEffect, useRef } from 'react'
import {
  Printer,
  X,
  Share2,
  Download,
  Copy,
  Building2,
  ArrowRightLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper'
import { getCompanyProfile } from '../../services/axCompanyProfileService'
import { AX_CompanyProfileModal } from '../profile/AX_CompanyProfileModal'
import {
  PAPER_FORMATS,
  formatPrintDate,
} from '../invoices/invoicePrintConstants'
import {
  downloadTransferImage,
  shareTransferImageToWhatsApp,
  copyInvoiceImageToClipboard,
} from '../../services/axInvoiceImageService'
import { formatTime12H } from '../../utils/dateHelpers'

export function AX_TransferPrintModal({ transfer, isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const warehouses = useAXStore((s) => s.warehouses || [])
  const items = useAXStore((s) => s.items || [])
  const [company, setCompany] = useState(getCompanyProfile)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [paperFormat, setPaperFormat] = useState('a4_portrait')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const printContentRef = useRef(null)

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
    const target = currentFormat.targetPx || 794
    if (screenWidth < target + 48) {
      const fit = Math.max(0.35, Math.min(1, (screenWidth - 36) / target))
      setZoomLevel(Number(fit.toFixed(2)))
    } else {
      setZoomLevel(1)
    }
  }, [paperFormat, isOpen, currentFormat.targetPx])

  if (!isOpen || !transfer) return null

  const fromWarehouse = warehouses.find((w) => w.id === (transfer.fromWarehouseId || transfer.from_warehouse_id || transfer.fromId))
  const toWarehouse = warehouses.find((w) => w.id === (transfer.toWarehouseId || transfer.to_warehouse_id || transfer.toId))
  const fromName = fromWarehouse?.name || 'المخزن المصدر'
  const toName = toWarehouse?.name || 'المخزن المستلم'

  const transferItems = (transfer.items || []).map((it) => {
    const itId = it.itemId || it.item_id || it.id
    const meta = items.find((x) => x.id === itId)
    return {
      ...it,
      displayName: getItemDisplayName(meta || it),
      unitName: it.unit || meta?.unitType || 'كرتونة',
      qty: Number(it.quantity) || 0,
      categoryName: it.primaryCategory || meta?.primaryCategory || '',
    }
  })

  const totalQuantity = transferItems.reduce((acc, it) => acc + it.qty, 0)
  const transferDate = formatPrintDate(transfer.confirmedAt || transfer.date || transfer.createdAt)
  const transferTime = (transfer.confirmedAt || transfer.createdAt) ? formatTime12H(transfer.confirmedAt || transfer.createdAt) : ''

  const handlePrint = () => {
    document.body.classList.remove('print-format-a4-portrait', 'print-format-a4-landscape', 'print-format-a5')
    if (currentFormat.bodyClass) document.body.classList.add(currentFormat.bodyClass)
    window.print()
    setTimeout(() => {
      document.body.classList.remove('print-format-a4-portrait', 'print-format-a4-landscape', 'print-format-a5')
    }, 1000)
  }

  const handleDownload = async () => {
    if (!printContentRef.current) return
    setIsExporting(true)
    try {
      await downloadTransferImage(transfer, printContentRef.current)
    } finally {
      setIsExporting(false)
    }
  }

  const handleWhatsAppShare = async () => {
    if (!printContentRef.current) return
    setIsExporting(true)
    try {
      await shareTransferImageToWhatsApp(transfer, printContentRef.current, fromName, toName)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyClipboard = async () => {
    if (!printContentRef.current) return
    setIsExporting(true)
    try {
      await copyInvoiceImageToClipboard(printContentRef.current)
    } finally {
      setIsExporting(false)
    }
  }

  const handleResetFit = () => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000
    const target = currentFormat.targetPx || 794
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
            <span className="p-1 rounded-full bg-primary/10 text-primary">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs sm:text-sm font-black text-on-surface">إذن تحويل مخزني</span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-black">
              {transfer.code}
            </span>
            <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-surface-low border border-outline-variant/30 text-[11px] font-bold text-on-surface-variant">
              A4 طولي (معتمد)
            </span>
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
              onClick={handleWhatsAppShare}
              disabled={isExporting}
              className="py-1.5 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
              title="مشاركة إذن التحويل فوراً على واتساب"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>مشاركة واتساب</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="py-1.5 px-3 rounded-full bg-surface-low hover:bg-surface-container text-on-surface border border-outline-variant/40 text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
              title="تحميل صورة الإذن PNG"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">تحميل صورة</span>
            </button>

            <button
              type="button"
              onClick={handleCopyClipboard}
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

        <div className="ax-print-viewport-container flex-1 overflow-auto p-2 sm:p-6 flex justify-center items-start print:p-0 print:overflow-visible touch-pan-x touch-pan-y">
          <div
            id="ax-transfer-print-sheet"
            ref={printContentRef}
            className="ax-a4-sheet bg-white text-slate-900 shadow-2xl transition-transform origin-top print:shadow-none print:m-0 format-a4-portrait select-text"
            style={{
              width: '210mm',
              minWidth: '210mm',
              minHeight: '297mm',
              padding: '14mm 12mm',
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
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
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
                    إذن تحويل مخزني
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">رقم الإذن: </span>
                    <strong className="text-slate-900">{transfer.code}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">التاريخ: </span>
                    <strong className="text-slate-900">{transferDate} {transferTime}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="p-2 rounded-lg bg-white border border-slate-200 space-y-0.5">
                <span className="text-slate-500 font-bold block text-[11px]">المخزن المصدر (المحول منه):</span>
                <strong className="text-sm font-black text-slate-900 block">{fromName}</strong>
                {fromWarehouse?.location && (
                  <span className="text-[10px] text-slate-500 block">{fromWarehouse.location}</span>
                )}
              </div>
              <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-0.5 text-left">
                <span className="text-emerald-800 font-bold block text-[11px]">المخزن المستلم (المحول إليه):</span>
                <strong className="text-sm font-black text-emerald-950 block">{toName}</strong>
                {toWarehouse?.location && (
                  <span className="text-[10px] text-emerald-700 block">{toWarehouse.location}</span>
                )}
              </div>
            </div>

            <div className="mb-3 overflow-hidden border border-slate-300 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#991b1b]/5 text-[#991b1b] border-b border-slate-300 font-black">
                  <tr className="h-8">
                    <th className="px-2 text-center w-8">م</th>
                    <th className="px-3">بيان الصنف والمواصفات</th>
                    <th className="px-3">التصنيف</th>
                    <th className="px-2.5 text-center">الوحدة</th>
                    <th className="px-4 text-left font-mono" style={{ whiteSpace: 'nowrap' }}>الكمية المحولة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transferItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-5 text-slate-400 font-bold">
                        لا توجد بنود مسجلة في هذا الإذن.
                      </td>
                    </tr>
                  ) : (
                    transferItems.map((item, idx) => (
                      <tr key={idx} className="h-7.5 hover:bg-slate-50/50">
                        <td className="px-2 text-center font-mono text-slate-500 text-[11px]">{idx + 1}</td>
                        <td className="px-3 font-bold text-slate-900">{item.displayName}</td>
                        <td className="px-3 text-slate-600 text-[11px]">{item.categoryName || 'عام'}</td>
                        <td className="px-2.5 text-center text-slate-700 font-bold text-[11px]">{item.unitName}</td>
                        <td className="px-4 text-left font-mono font-black text-slate-900 text-sm" style={{ whiteSpace: 'nowrap' }}>
                          {item.qty}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 text-slate-900 font-black">
                  <tr className="h-8">
                    <td colSpan={3} className="px-3 text-right">
                      إجمالي الأصناف: <span className="font-mono text-[#991b1b]">{transferItems.length}</span> صنف
                    </td>
                    <td className="px-2.5 text-center text-slate-600">إجمالي الكمية:</td>
                    <td className="px-4 text-left font-mono text-sm text-[#991b1b]" style={{ whiteSpace: 'nowrap' }}>
                      {totalQuantity}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {transfer.notes && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 mb-4 text-xs">
                <span className="font-bold text-slate-600 block mb-0.5 text-[11px]">ملاحظات التحويل:</span>
                <span className="text-slate-800">{transfer.notes}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 text-center text-xs mt-auto">
              <div className="space-y-6">
                <span className="font-bold text-slate-600 text-[11px] block">مسؤول مخزن الصرف</span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
                <span className="font-mono text-[10px] text-slate-400 block">{transfer.confirmedBy || transfer.confirmed_by || 'التوقيع والاعتماد'}</span>
              </div>

              <div className="space-y-6">
                <span className="font-bold text-slate-600 text-[11px] block">المندوب / السائق الناقل</span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
                <span className="font-mono text-[10px] text-slate-400 block">التوقيع والاستلام</span>
              </div>

              <div className="space-y-6">
                <span className="font-bold text-slate-600 text-[11px] block">مسؤول مخزن الاستلام</span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
                <span className="font-mono text-[10px] text-slate-400 block">التوقيع والفحص</span>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold font-mono">
              <span>بروتين فود — منظومة تجهيز وحفظ وتوزيع اللحوم المجمدة</span>
              <span>{transfer.code} • تم الإصدار إلكترونياً</span>
            </div>
          </div>
        </div>
      </div>

      <AX_CompanyProfileModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        onSave={(updated) => setCompany(updated)}
      />
    </>
  )
}

export default AX_TransferPrintModal
