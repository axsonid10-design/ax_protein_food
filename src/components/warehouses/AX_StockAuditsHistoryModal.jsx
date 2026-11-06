import React, { useState, useMemo } from 'react'
import {
  X,
  Search,
  ClipboardCheck,
  Calendar,
  Warehouse,
  User,
  ChevronDown,
  ChevronUp,
  Printer,
  Boxes,
  RotateCcw,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { axToast } from '../common/AX_Toast'

export function AX_StockAuditsHistoryModal({
  isOpen,
  onClose,
  audits = [],
  warehouses = [],
}) {
  const rollbackStockAudit = useAXStore((state) => state.rollbackStockAudit)
  const [selectedWhFilter, setSelectedWhFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedAuditId, setExpandedAuditId] = useState(null)
  const [auditToRollback, setAuditToRollback] = useState(null)
  const [isRollingBack, setIsRollingBack] = useState(false)

  const handleConfirmRollback = async () => {
    if (!auditToRollback) return
    try {
      setIsRollingBack(true)
      const res = await rollbackStockAudit(auditToRollback.id)
      if (res?.success) {
        axToast.success(`تم إلغاء محضر الجرد [${auditToRollback.code}] واسترجاع كميات الأصناف السابقة`)
        setAuditToRollback(null)
      } else {
        axToast.error(res?.error || 'تعذر إلغاء المحضر')
      }
    } catch {
      axToast.error('حدث خطأ أثناء إلغاء المحضر')
    } finally {
      setIsRollingBack(false)
    }
  }

  const filteredAudits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return (audits || [])
      .filter((a) => {
        if (!a) return false
        const whMatch =
          selectedWhFilter === 'ALL' ||
          a.warehouseId === selectedWhFilter ||
          a.warehouse_id === selectedWhFilter
        if (!whMatch) return false

        if (!q) return true
        const code = String(a.code || '').toLowerCase()
        const auditor = String(a.auditorName || a.auditor_name || '').toLowerCase()
        const whName = String(a.warehouseName || a.warehouse_name || '').toLowerCase()
        const notes = String(a.notes || '').toLowerCase()
        return code.includes(q) || auditor.includes(q) || whName.includes(q) || notes.includes(q)
      })
      .sort((a, b) => {
        const dateA = new Date(a.auditDate || a.date || a.createdAt || 0).getTime()
        const dateB = new Date(b.auditDate || b.date || b.createdAt || 0).getTime()
        return dateB - dateA
      })
  }, [audits, selectedWhFilter, searchQuery])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-on-surface">
                سجل محاضر الجرد المخزني
              </h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                أرشيف كامل لكافة عمليات الجرد ومسؤولي التوثيق وفوارق العجز والزيادة
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
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-on-surface-variant absolute right-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث برقم المحضر أو القائم بالجرد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pr-8 pl-3 rounded-full bg-surface-lowest border border-outline-variant/40 text-xs text-on-surface outline-none"
              />
            </div>

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
            <span>إجمالي المحاضر:</span>
            <span className="font-mono font-black text-primary px-2 py-0.5 rounded-full bg-primary/10">
              {filteredAudits.length}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {filteredAudits.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant space-y-2">
              <ClipboardCheck className="w-10 h-10 mx-auto text-on-surface-variant/40" />
              <p className="text-xs font-bold">لا توجد محاضر جرد سابقة مطابقة</p>
            </div>
          ) : (
            filteredAudits.map((audit) => {
              const isExpanded = expandedAuditId === audit.id
              const auditItems = Array.isArray(audit.items) ? audit.items : []
              const deficits = Number(audit.deficitsCount || audit.deficits_count || 0)
              const surpluses = Number(audit.surplusesCount || audit.surpluses_count || 0)
              const totalVariance = Number(
                audit.totalVarianceCost || audit.total_variance_cost || 0
              )

              return (
                <div
                  key={audit.id}
                  className="bg-surface-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs transition-all hover:border-primary/40"
                >
                  <div
                    onClick={() => setExpandedAuditId(isExpanded ? null : audit.id)}
                    className="p-3 sm:p-4 cursor-pointer select-none flex flex-wrap items-center justify-between gap-3 bg-surface-low/30 hover:bg-surface-low/60 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                          {audit.code}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-on-surface">
                          <Warehouse className="w-3.5 h-3.5 text-secondary" />
                          <span>{audit.warehouseName || audit.warehouse_name || 'المخزن'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-on-surface-variant">
                          <User className="w-3.5 h-3.5 text-on-surface-variant" />
                          <span>{audit.auditorName || audit.auditor_name || 'المسؤول'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-on-surface-variant font-bold pt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          {String(
                            audit.auditDate || audit.date || audit.createdAt || ''
                          ).slice(0, 10)}
                        </span>
                        <span>•</span>
                        <span>{auditItems.length} صنف</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-black">
                        {deficits > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 text-[10px]">
                            عجز: {deficits}
                          </span>
                        )}
                        {surpluses > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px]">
                            فائض: {surpluses}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] ${
                            totalVariance === 0
                              ? 'bg-surface-container text-on-surface-variant'
                              : totalVariance < 0
                              ? 'bg-rose-500/10 text-rose-700'
                              : 'bg-emerald-500/10 text-emerald-700'
                          }`}
                        >
                          {totalVariance === 0
                            ? 'مطابق تماماً'
                            : `${totalVariance > 0 ? '+' : ''}${totalVariance.toLocaleString('en-US')} ج.م`}
                        </span>
                      </div>

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
                      {audit.notes && (
                        <div className="p-2.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs text-on-surface font-bold">
                          <span className="text-[10px] text-on-surface-variant block">ملاحظات المحضر:</span>
                          {audit.notes}
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="bg-surface-low/50 border-b border-surface-container text-on-surface-variant font-black h-8 text-[11px]">
                              <th className="px-3">الصنف</th>
                              <th className="px-2 text-center">الوحدة</th>
                              <th className="px-3 text-center">الرصيد الدفتري</th>
                              <th className="px-3 text-center">العد الفعلي</th>
                              <th className="px-2 text-center">الفارق</th>
                              <th className="px-3 text-left">قيمة الفارق</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-container/40 font-bold">
                            {auditItems.map((item, idx) => {
                              const itName = item.itemName || item.name || 'صنف'
                              const unit = item.unit || 'كرتونة'
                              const sys = Number(item.systemQty || 0)
                              const act = Number(
                                item.actualQtyNum !== undefined
                                  ? item.actualQtyNum
                                  : item.actualQty || 0
                              )
                              const diff = act - sys
                              const cost = Number(item.varianceCost || 0)

                              return (
                                <tr key={item.itemId || idx} className="h-9 hover:bg-surface-low/30">
                                  <td className="px-3 text-on-surface font-black truncate max-w-[200px]">
                                    {itName}
                                  </td>
                                  <td className="px-2 text-center text-on-surface-variant text-[11px]">
                                    {item.auditUnit && item.auditUnit !== unit ? (
                                      <span>
                                        {item.auditUnit} <span className="text-[10px] text-primary font-bold">({unit})</span>
                                      </span>
                                    ) : (
                                      unit
                                    )}
                                  </td>
                                  <td className="px-3 text-center font-mono font-black">{sys}</td>
                                  <td className="px-3 text-center font-mono font-black text-primary">
                                    {act}
                                    {item.inputQty !== undefined && String(item.inputQty) !== String(act) && (
                                      <span className="block text-[10px] font-bold text-on-surface-variant">
                                        (المدخل: {item.inputQty} {item.auditUnit})
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 text-center font-mono font-black">
                                    <span
                                      className={
                                        diff === 0
                                          ? 'text-on-surface-variant'
                                          : diff < 0
                                          ? 'text-rose-700'
                                          : 'text-emerald-600'
                                      }
                                    >
                                      {diff > 0 ? `+${diff}` : diff}
                                    </span>
                                  </td>
                                  <td className="px-3 text-left font-mono font-black">
                                    <span
                                      className={
                                        cost === 0
                                          ? 'text-on-surface-variant'
                                          : cost < 0
                                          ? 'text-rose-700'
                                          : 'text-emerald-600'
                                      }
                                    >
                                      {cost === 0
                                        ? '—'
                                        : `${cost > 0 ? '+' : ''}${cost.toLocaleString('en-US')} ج.م`}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-surface-container">
                        <div className="flex items-center gap-2">
                          {audit.status === 'cancelled' ? (
                            <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 text-xs font-black border border-rose-500/20">
                              تم إلغاء هذا المحضر واسترجاع أرصدته الدفترية
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAuditToRollback(audit)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 text-xs font-black border border-rose-500/20 transition-all cursor-pointer active:scale-95"
                              title="إلغاء هذا المحضر واسترجاع كميات الأصناف الدفترية لما كانت عليه قبل الجرد"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>إلغاء المحضر واسترجاع الأرصدة الأصلية</span>
                            </button>
                          )}
                        </div>
                      </div>
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

      <AX_ConfirmModal
        isOpen={Boolean(auditToRollback)}
        title="تأكيد إلغاء محضر الجرد"
        message={auditToRollback ? `هل أنت متأكد من إلغاء محضر الجرد "${auditToRollback.code}"؟ سيتم إلغاء التسويات وعكس كميات كافة أصناف المحضر فوراً لتعود لأرصدتها السابقة قبل الجرد.` : ''}
        confirmText="نعم، إلغاء واسترجاع الأرصدة"
        cancelText="تراجع"
        isDestructive={true}
        onConfirm={handleConfirmRollback}
        onCancel={() => setAuditToRollback(null)}
      />
    </div>
  )
}

export default AX_StockAuditsHistoryModal
