import React from 'react'
import { FileCheck2, Printer, X, CheckCircle, ArrowDownLeft, Receipt } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

export function AX_VanSettlementReceiptModal({ isOpen, onClose, settlement }) {
  useBodyScrollLock(isOpen, onClose)

  if (!isOpen || !settlement) return null

  const handlePrint = () => {
    window.print()
  }

  const {
    code = 'SETTLE-VAN-0000',
    vanName = 'سيارة التوزيع',
    driverName = 'مندوب التوزيع',
    settlementDate = new Date().toISOString().split('T')[0],
    grossCash = 0,
    expenses = [],
    totalExpenses = 0,
    netRemitDue = 0,
    payments = [],
    totalRemitted = 0,
    variance = 0,
    stockAction = 'retain',
    returnedItemsCount = 0,
    transferCode = null,
    notes = '',
  } = settlement

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface-lowest border-2 border-primary/20 rounded-3xl shadow-level3 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-surface-container flex items-center justify-between bg-surface-lowest print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-secondary-on-container">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-on-surface">إشعار تسوية يومية معتمد</h3>
              <span className="text-[11px] font-bold text-on-surface-variant font-mono block">
                {code}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-full bg-surface-low hover:bg-surface-container text-primary cursor-pointer transition-all"
              title="طباعة الإشعار"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 print:p-0">
          <div className="border border-outline-variant/30 rounded-2xl p-4 sm:p-5 bg-surface-low/20 space-y-4 print:border-none">
            <div className="text-center space-y-1 border-b border-outline-variant/30 pb-3">
              <span className="text-xs font-bold text-primary block">بروتين فود لتجهيز وحفظ اللحوم المجمدة</span>
              <h2 className="text-base font-black text-on-surface">إيصال تصفية وتسوية يومية للمندوب</h2>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono font-bold text-on-surface-variant pt-1">
                <span>الكود: {code}</span>
                <span>•</span>
                <span>التاريخ: {settlementDate}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-bold">
              <div className="p-2.5 rounded-xl bg-surface-lowest border border-outline-variant/20">
                <span className="text-on-surface-variant block text-[11px]">السيارة</span>
                <span className="text-on-surface font-black">{vanName}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-lowest border border-outline-variant/20">
                <span className="text-on-surface-variant block text-[11px]">المندوب المسؤول</span>
                <span className="text-on-surface font-black">{driverName}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-surface-lowest border border-outline-variant/30 text-center font-mono">
              <div>
                <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي العهدة</span>
                <span className="text-sm font-black text-on-surface">{grossCash.toLocaleString('en-US')} ج.م</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-on-surface-variant block">المصاريف المخصومة</span>
                <span className="text-sm font-black text-error">-{totalExpenses.toLocaleString('en-US')} ج.م</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-on-surface-variant block">صافي المورد</span>
                <span className="text-sm font-black text-primary">{totalRemitted.toLocaleString('en-US')} ج.م</span>
              </div>
            </div>

            {expenses.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-on-surface flex items-center gap-1.5">
                  <span>المصاريف التشغيلية للمندوب ({expenses.length})</span>
                </h4>
                <div className="border border-outline-variant/20 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-right">
                    <thead className="bg-surface-low text-on-surface-variant font-bold border-b border-outline-variant/20">
                      <tr>
                        <th className="p-2">البند</th>
                        <th className="p-2">الملاحظات</th>
                        <th className="p-2 text-left font-mono">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      {expenses.map((exp, idx) => (
                        <tr key={idx} className="bg-surface-lowest">
                          <td className="p-2 font-bold text-on-surface">
                            {exp.expenseSecondaryCategoryName || exp.partyName || 'مصروف تشغيلي'}
                          </td>
                          <td className="p-2 text-on-surface-variant text-[11px]">{exp.notes || '-'}</td>
                          <td className="p-2 text-left font-mono font-bold text-error">
                            {(Number(exp.amount) || 0).toLocaleString('en-US')} ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {payments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-on-surface flex items-center gap-1.5">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-primary" />
                  <span>توزيع قنوات التوريد والتصفية ({payments.length})</span>
                </h4>
                <div className="border border-outline-variant/20 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-right">
                    <thead className="bg-surface-low text-on-surface-variant font-bold border-b border-outline-variant/20">
                      <tr>
                        <th className="p-2">قناة الاستلام</th>
                        <th className="p-2">الكود</th>
                        <th className="p-2 text-left font-mono">المبلغ المورد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      {payments.map((p, idx) => (
                        <tr key={idx} className="bg-surface-lowest">
                          <td className="p-2 font-bold text-on-surface">{p.notes || 'توريد نقدية'}</td>
                          <td className="p-2 text-on-surface-variant font-mono text-[11px]">{p.code || '-'}</td>
                          <td className="p-2 text-left font-mono font-bold text-primary">
                            {(Number(p.amount) || 0).toLocaleString('en-US')} ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-surface-lowest border border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
              <span className="text-on-surface-variant">حالة البضاعة المتبقية:</span>
              <span className="font-black text-primary">
                {stockAction === 'return'
                  ? `تم إرجاع البضاعة للمخزن (${returnedItemsCount} صنف) ${transferCode ? `• إذن ${transferCode}` : ''}`
                  : 'تم الإبقاء على رصيد البضاعة بعهدة السيارة'}
              </span>
            </div>

            {notes && (
              <div className="p-2.5 rounded-xl bg-surface-lowest border border-outline-variant/20 text-xs">
                <span className="text-on-surface-variant font-bold block mb-0.5">ملاحظات التسوية:</span>
                <span className="text-on-surface">{notes}</span>
              </div>
            )}

            <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-between text-[11px] font-bold text-on-surface-variant">
              <span>توقيع المندوب: _______________</span>
              <span>توقيع مسؤول الخزينة: _______________</span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-surface-container bg-surface-lowest flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 rounded-full bg-surface-low hover:bg-surface-container text-primary text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الإشعار</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black cursor-pointer transition-all shadow-level1"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  )
}

export default AX_VanSettlementReceiptModal
