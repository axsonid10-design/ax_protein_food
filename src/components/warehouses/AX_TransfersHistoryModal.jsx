import React, { useState, useMemo } from 'react'
import {
  X,
  Search,
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Clock,
  Ban,
  ChevronDown,
  ChevronUp,
  Printer,
  PackageCheck,
} from 'lucide-react'

export function AX_TransfersHistoryModal({
  isOpen,
  onClose,
  transfers = [],
  warehouses = [],
  getItem,
  onInspectTransfer,
}) {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL')
  const [selectedWhFilter, setSelectedWhFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTransferId, setExpandedTransferId] = useState(null)

  const filteredTransfers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return (transfers || [])
      .filter((t) => {
        if (!t) return false
        const status = t.status || 'confirmed'
        if (selectedStatusFilter !== 'ALL' && status !== selectedStatusFilter) return false

        const fromId = t.fromId || t.fromWarehouseId || t.from_warehouse_id
        const toId = t.toId || t.toWarehouseId || t.to_warehouse_id
        const whMatch =
          selectedWhFilter === 'ALL' || fromId === selectedWhFilter || toId === selectedWhFilter
        if (!whMatch) return false

        if (!q) return true
        const code = String(t.code || '').toLowerCase()
        const fromName = String(t.fromName || '').toLowerCase()
        const toName = String(t.toName || '').toLowerCase()
        const notes = String(t.notes || '').toLowerCase()
        return code.includes(q) || fromName.includes(q) || toName.includes(q) || notes.includes(q)
      })
      .sort((a, b) => {
        const dateA = new Date(a.operationalDate || a.date || a.createdAt || a.requestedAt || 0).getTime()
        const dateB = new Date(b.operationalDate || b.date || b.createdAt || b.requestedAt || 0).getTime()
        return dateB - dateA
      })
  }, [transfers, selectedStatusFilter, selectedWhFilter, searchQuery])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-on-surface">
                أرشيف وسجل التحويلات المخزنية
              </h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                تتبع كافة حركات النقل والشحن بين المخازن والسيارات وحالات الاستلام
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 sm:p-4 bg-surface-low/50 border-b border-surface-container flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] flex-wrap">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="w-3.5 h-3.5 text-on-surface-variant absolute right-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث برقم الإذن أو المخزن..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pr-8 pl-3 rounded-full bg-surface-lowest border border-outline-variant/40 text-xs text-on-surface outline-none"
              />
            </div>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="h-8 px-3 rounded-full bg-surface-lowest border border-outline-variant/40 text-xs font-bold text-on-surface outline-none cursor-pointer"
            >
              <option value="ALL">كافة الحالات</option>
              <option value="confirmed">تم الاستلام (مؤكد)</option>
              <option value="pending">قيد الشحن (معلق)</option>
              <option value="cancelled">ملغي</option>
            </select>

            <select
              value={selectedWhFilter}
              onChange={(e) => setSelectedWhFilter(e.target.value)}
              className="h-8 px-3 rounded-full bg-surface-lowest border border-outline-variant/40 text-xs font-bold text-on-surface outline-none cursor-pointer"
            >
              <option value="ALL">كافة المخازن</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
            <span>إجمالي التحويلات:</span>
            <span className="font-mono font-black text-amber-700 px-2 py-0.5 rounded-full bg-amber-500/10">
              {filteredTransfers.length}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {filteredTransfers.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant space-y-2">
              <ArrowLeftRight className="w-10 h-10 mx-auto text-on-surface-variant/40" />
              <p className="text-xs font-bold">لا توجد تحويلات سابقة مطابقة</p>
            </div>
          ) : (
            filteredTransfers.map((trf) => {
              const isExpanded = expandedTransferId === trf.id
              const trfItems =
                trf.items && trf.items.length > 0
                  ? trf.items
                  : [{ itemId: trf.itemId, quantity: trf.quantity, unit: trf.unit }]
              const status = trf.status || 'confirmed'

              return (
                <div
                  key={trf.id}
                  className="bg-surface-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs transition-all hover:border-amber-500/40"
                >
                  <div
                    onClick={() => setExpandedTransferId(isExpanded ? null : trf.id)}
                    className="p-3 sm:p-4 cursor-pointer select-none flex flex-wrap items-center justify-between gap-3 bg-surface-low/30 hover:bg-surface-low/60 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-amber-800 bg-amber-500/15 px-2.5 py-0.5 rounded-full">
                          {trf.code}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            status === 'confirmed'
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : status === 'pending'
                              ? 'bg-amber-500/15 text-amber-800'
                              : 'bg-rose-500/10 text-rose-700'
                          }`}
                        >
                          {status === 'confirmed' && <CheckCircle2 className="w-3 h-3" />}
                          {status === 'pending' && <Clock className="w-3 h-3" />}
                          {status === 'cancelled' && <Ban className="w-3 h-3" />}
                          <span>
                            {status === 'confirmed'
                              ? 'تم الاستلام'
                              : status === 'pending'
                              ? 'قيد الشحن'
                              : 'ملغي'}
                          </span>
                        </span>

                        <span className="text-[11px] font-mono text-on-surface-variant flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {String(
                            trf.operationalDate || trf.date || trf.requestedAt || ''
                          ).slice(0, 10)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                        <span className="text-on-surface-variant text-[11px]">من:</span>
                        <span className="font-black">{trf.fromName || 'مخزن الإرسال'}</span>
                        <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600 shrink-0 mx-1" />
                        <span className="text-on-surface-variant text-[11px]">إلى:</span>
                        <span className="font-black text-primary">{trf.toName || 'مخزن الاستلام'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-on-surface-variant font-mono">
                        {trfItems.length} صنف
                      </span>

                      {status === 'pending' && onInspectTransfer && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onClose()
                            onInspectTransfer(trf)
                          }}
                          className="px-3 py-1 rounded-full bg-primary text-white text-[11px] font-black flex items-center gap-1 hover:bg-primary-dark cursor-pointer"
                        >
                          <PackageCheck className="w-3 h-3" />
                          <span>فحص واستلام</span>
                        </button>
                      )}

                      <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 sm:p-4 border-t border-surface-container bg-surface-lowest space-y-3">
                      {trf.notes && (
                        <div className="p-2.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs text-on-surface font-bold">
                          <span className="text-[10px] text-on-surface-variant block">ملاحظات الإذن:</span>
                          {trf.notes}
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="bg-surface-low/50 border-b border-surface-container text-on-surface-variant font-black h-8 text-[11px]">
                              <th className="px-3">الصنف</th>
                              <th className="px-3 text-center">الكمية المحولة</th>
                              <th className="px-3 text-center">الوحدة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-container/40 font-bold">
                            {trfItems.map((item, idx) => {
                              const itObj = getItem ? getItem(item.itemId) : {}
                              const itName =
                                item.name ||
                                item.itemName ||
                                itObj?.compositeName ||
                                itObj?.name ||
                                'صنف'
                              const qty = Number(item.quantity || 0)
                              const unit = item.unit || itObj?.unitType || 'كرتونة'

                              return (
                                <tr key={item.itemId || idx} className="h-9 hover:bg-surface-low/30">
                                  <td className="px-3 text-on-surface font-black truncate max-w-[240px]">
                                    {itName}
                                  </td>
                                  <td className="px-3 text-center font-mono font-black text-primary">
                                    {qty}
                                  </td>
                                  <td className="px-3 text-center text-on-surface-variant text-[11px]">
                                    {unit}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {trf.confirmedBy && (
                        <div className="text-[11px] text-on-surface-variant/80 text-left font-bold">
                          تم التأكيد والاستلام بواسطة: {trf.confirmedBy}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="p-3 border-t border-surface-container shrink-0 flex items-center justify-between bg-surface-low/40">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-surface-lowest border border-outline-variant/40 hover:bg-surface-container text-xs font-bold text-on-surface cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة تقرير</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-full bg-primary text-white text-xs font-black hover:bg-primary-dark transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}

export default AX_TransfersHistoryModal
