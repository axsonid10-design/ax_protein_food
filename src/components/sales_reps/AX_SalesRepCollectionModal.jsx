import React, { useState, useMemo } from 'react'
import { Printer, X, ZoomIn, ZoomOut, RotateCcw, Building, Phone, MapPin, Receipt, AlertCircle } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'

export function AX_SalesRepCollectionModal({ rep, isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const { clients = [] } = useAXStore()
  const [zoomLevel, setZoomLevel] = useState(1)

  const repClients = useMemo(() => {
    if (!rep?.name) return []
    return clients.filter((c) => (c.salesRepName || '').trim() === rep.name.trim())
  }, [clients, rep])

  const indebtedClients = useMemo(() => {
    return repClients.filter((c) => (Number(c.balance) || 0) > 0)
  }, [repClients])

  const totalDebtToCollect = useMemo(() => {
    return indebtedClients.reduce((sum, c) => sum + (Number(c.balance) || 0), 0)
  }, [indebtedClients])

  if (!isOpen || !rep) return null

  const handlePrint = () => {
    window.print()
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md animate-fadeIn overscroll-contain">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-surface-lowest/90 border-b border-outline-variant/30 text-on-surface shadow-xs print:hidden z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-black">كشف تحصيل مديونيات العملاء الميداني (A4)</span>
          <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
            المندوب: {rep.name}
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
            <span>طباعة كشف التحصيل A4</span>
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
                    إدارة المبيعات والتوزيع الميداني • كشوف التحصيل الدورية
                  </p>
                </div>
              </div>

              <div className="text-left font-mono text-xs space-y-1">
                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary font-black text-sm text-center">
                  كشف تحصيل مديونيات العملاء
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">اسم المندوب: </span>
                  <strong className="text-slate-900">{rep.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">الهاتف: </span>
                  <strong className="text-slate-900">{rep.phone || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">تاريخ الكشف: </span>
                  <strong className="text-slate-900">{todayStr}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 font-bold block text-[11px]">إجمالي العملاء المخصصين:</span>
              <strong className="text-sm font-black text-slate-900">{repClients.length} عميل</strong>
            </div>
            <div>
              <span className="text-slate-500 font-bold block text-[11px]">عملاء عليهم مديونيات للتحصيل:</span>
              <strong className="text-sm font-black text-red-800">{indebtedClients.length} عميل</strong>
            </div>
            <div className="text-left font-mono">
              <span className="text-slate-500 font-bold block text-[11px]">المبلغ الإجمالي المطلوب توريده:</span>
              <strong className="text-base font-black text-primary">
                {totalDebtToCollect.toLocaleString('en-US')} ج.م
              </strong>
            </div>
          </div>

          <div className="mb-4 overflow-hidden border border-slate-300 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-primary/5 text-primary border-b border-slate-300 font-black">
                <tr className="h-9">
                  <th className="px-2 text-center w-8">م</th>
                  <th className="px-3">اسم العميل والمنشأة</th>
                  <th className="px-2 font-mono">الهاتف</th>
                  <th className="px-2">المنطقة / العنوان</th>
                  <th className="px-3 text-left font-mono">المبلغ المطلوب (ج.م)</th>
                  <th className="px-3 text-center w-28">المحصل فعلياً</th>
                  <th className="px-3 text-center w-28">توقيع المستلم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {indebtedClients.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400 font-bold">
                      لا توجد مديونيات مستحقة على عملاء هذا الموندوب حالياً (كافة الحسابات متوازنة أو مسددة).
                    </td>
                  </tr>
                ) : (
                  indebtedClients.map((c, idx) => {
                    const bal = Number(c.balance) || 0
                    return (
                      <tr key={c.id || idx} className="h-9">
                        <td className="px-2 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="px-3 font-bold text-slate-900">
                          <div>{c.name}</div>
                          {c.primaryCategory && (
                            <span className="text-[10px] text-slate-500 font-normal">{c.primaryCategory}</span>
                          )}
                        </td>
                        <td className="px-2 font-mono text-slate-700 text-[11px] whitespace-nowrap">
                          {c.phone || '—'}
                        </td>
                        <td className="px-2 text-slate-600 text-[11px] truncate max-w-[140px]" title={[c.governorate, c.city, c.district].filter(Boolean).join(' • ') || c.address}>
                          {[c.governorate, c.city, c.district].filter(Boolean).join(' • ') || c.address || '—'}
                        </td>
                        <td className="px-3 text-left font-mono font-black text-red-800 whitespace-nowrap">
                          {bal.toLocaleString('en-US')}
                        </td>
                        <td className="px-3 text-center border-l border-r border-dashed border-slate-300">
                        </td>
                        <td className="px-3 text-center">
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-400">
                <tr className="h-9">
                  <td colSpan="4" className="px-3 text-slate-900 font-black">
                    الإجمالي العام المستحق للتحصيل والتوريد لخزينة الشركة:
                  </td>
                  <td className="px-3 text-left font-mono font-black text-primary text-sm whitespace-nowrap">
                    {totalDebtToCollect.toLocaleString('en-US')} ج.م
                  </td>
                  <td colSpan="2" className="px-3 text-center text-[10px] text-slate-500 font-bold">
                    توريد نقدي / إيداع بنكي
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-300 text-xs text-center font-bold text-slate-700 mt-6">
            <div>
              <span className="block mb-8">المندوب المستلم للكشف</span>
              <span className="block border-t border-dashed border-slate-400 mx-4 pt-1 text-[11px] text-slate-500">
                {rep.name}
              </span>
            </div>
            <div>
              <span className="block mb-8">مسؤول الحسابات والخزينة</span>
              <span className="block border-t border-dashed border-slate-400 mx-4 pt-1 text-[11px] text-slate-500">
                التسليم والمطابقة
              </span>
            </div>
            <div>
              <span className="block mb-8">المدير المالي والتجاري</span>
              <span className="block border-t border-dashed border-slate-400 mx-4 pt-1 text-[11px] text-slate-500">
                الاعتماد والختم
              </span>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-400 font-mono border-t border-slate-200 pt-2">
            بروتين فود لتجهيز وحفظ اللحوم المجمدة • تم استخراج وطباعة كشف التحصيل رسمياً عبر منظومة AXONID
          </div>
        </div>
      </div>
    </div>
  )
}

export default AX_SalesRepCollectionModal
