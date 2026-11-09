import React, { useState, useEffect, useRef } from 'react'
import {
  Printer,
  X,
  Share2,
  Download,
  Copy,
  Building2,
  ArrowRightLeft,
  Calendar,
  UserCheck,
  CheckCircle2,
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

export function AX_TransferPrintModal({ transfer, isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const warehouses = useAXStore((s) => s.warehouses || [])
  const items = useAXStore((s) => s.items || [])
  const [company, setCompany] = useState(getCompanyProfile)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [paperFormat, setPaperFormat] = useState('a4_portrait')
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

  const handlePrint = () => {
    window.print()
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in overscroll-contain">
      <div className="flex flex-col w-full h-full sm:h-auto sm:max-w-4xl max-h-[100dvh] sm:max-h-[95vh] bg-surface-lowest border border-outline-variant/30 rounded-none sm:rounded-3xl shadow-level3 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-container bg-surface-low/80 shrink-0 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <ArrowRightLeft className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-on-surface">إذن تحويل مخزني: {transfer.code}</h3>
              <p className="text-[10px] font-mono text-on-surface-variant font-bold">{transferDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              disabled={isExporting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="مشاركة إذن التحويل فوراً على واتساب"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>مشاركة واتساب</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-lowest border border-outline-variant/30 hover:bg-surface-container text-on-surface text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="تحميل صورة الإذن PNG"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">تحميل PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
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

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 flex justify-center items-start">
          <div
            ref={printContentRef}
            className="w-full max-w-[760px] bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-md border border-slate-200 relative select-text font-sans"
            style={{ minHeight: '840px' }}
          >
            <div className="border-b-2 border-[#991b1b] pb-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo-clean-original.png"
                    alt="بروتين فود"
                    className="w-14 h-14 object-contain border border-slate-200 rounded-xl p-1 bg-white"
                    onError={(e) => { e.currentTarget.src = '/logo-header.png' }}
                  />
                  <div>
                    <h1 className="text-xl font-black text-[#991b1b] tracking-tight">{company.name || 'بروتين فود'}</h1>
                    <p className="text-xs font-bold text-slate-600">{company.subtitle || 'لتجهيز وحفظ وتوزيع اللحوم المجمدة'}</p>
                    {company.phone && <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">هاتف: {company.phone}</p>}
                  </div>
                </div>

                <div className="text-left font-mono">
                  <span className="inline-block px-3 py-1 rounded-full bg-slate-900 text-white font-black text-xs tracking-wider mb-1">
                    إذن تحويل مخزني
                  </span>
                  <div className="text-sm font-black text-[#991b1b]">{transfer.code}</div>
                  <div className="text-[11px] text-slate-500 font-bold">{transferDate}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">المخزن المصدر (المحول منه):</span>
                <span className="text-sm font-black text-slate-900 block">{fromName}</span>
                {fromWarehouse?.location && <span className="text-[10px] text-slate-500 block">{fromWarehouse.location}</span>}
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 block">المخزن المستلم (المحول إليه):</span>
                <span className="text-sm font-black text-emerald-950 block">{toName}</span>
                {toWarehouse?.location && <span className="text-[10px] text-emerald-700 block">{toWarehouse.location}</span>}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 mb-5">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black">
                  <tr className="h-9">
                    <th className="px-2 text-center w-10">م</th>
                    <th className="px-3">بيان الصنف</th>
                    <th className="px-3">التصنيف</th>
                    <th className="px-3 text-center">الوحدة</th>
                    <th className="px-4 text-left">الكمية المحولة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-bold">
                  {transferItems.map((item, idx) => (
                    <tr key={idx} className="h-8 hover:bg-slate-50/50">
                      <td className="px-2 text-center font-mono text-slate-500 text-[11px]">{idx + 1}</td>
                      <td className="px-3 font-black text-slate-900">{item.displayName}</td>
                      <td className="px-3 text-slate-600 text-[11px]">{item.categoryName || 'عام'}</td>
                      <td className="px-3 text-center font-bold text-slate-700 text-[11px]">{item.unitName}</td>
                      <td className="px-4 text-left font-mono font-black text-slate-900 text-sm">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-slate-900 font-black">
                  <tr className="h-9">
                    <td colSpan={3} className="px-3 text-right">
                      إجمالي الأصناف: <span className="font-mono text-[#991b1b]">{transferItems.length}</span> صنف
                    </td>
                    <td className="px-3 text-center text-slate-600">إجمالي الكمية:</td>
                    <td className="px-4 text-left font-mono text-sm text-[#991b1b]">{totalQuantity}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {transfer.notes && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 mb-5 text-xs">
                <span className="font-bold text-slate-600 block mb-0.5 text-[11px]">ملاحظات التحويل:</span>
                <span className="text-slate-800">{transfer.notes}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-200 text-center text-xs">
              <div className="space-y-8">
                <span className="font-bold text-slate-600 text-[11px] block">أمين المخزن المحول منه</span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
                <span className="font-mono text-[10px] text-slate-400 block">{transfer.confirmedBy || transfer.confirmed_by || 'التوقيع'}</span>
              </div>

              <div className="space-y-8">
                <span className="font-bold text-slate-600 text-[11px] block">المندوب / السائق الناقل</span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
                <span className="font-mono text-[10px] text-slate-400 block">التوقيع والاستلام</span>
              </div>

              <div className="space-y-8">
                <span className="font-bold text-slate-600 text-[11px] block">أمين المخزن المستلم</span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
                <span className="font-mono text-[10px] text-slate-400 block">التوقيع والفحص</span>
              </div>
            </div>

            <div className="mt-8 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>بروتين فود — منظومة إدارة المخازن والتوزيع</span>
              <span className="font-mono">{transfer.code} • {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>

      <AX_CompanyProfileModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        onSave={(updated) => setCompany(updated)}
      />
    </div>
  )
}

export default AX_TransferPrintModal
