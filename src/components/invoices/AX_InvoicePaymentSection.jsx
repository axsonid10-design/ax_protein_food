import React from 'react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'

export function AX_InvoicePaymentSection({
  paymentStatus,
  setPaymentStatus,
  paidInput,
  setPaidInput,
  selectedTreasuryId,
  setSelectedTreasuryId,
  treasuryAccounts = [],
  currentTotal = 0,
  currentPaid = 0,
  currentRemaining = 0,
  subtotal = 0,
  discountAmount = 0,
  discountType = 'none',
  discountValue = 0,
}) {
  return (
    <div className="space-y-2 pt-2 border-t border-surface-container">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-on-surface-variant">حالة وسداد الفاتورة:</label>
        <div className="flex items-center gap-1.5">
          {[
            ['unpaid', 'غير مدفوع', 'bg-secondary text-white shadow-xs'],
            ['partial', 'مدفوع جزئي', 'bg-amber-600 text-white shadow-xs'],
            ['paid', 'مدفوع كلي', 'bg-primary text-white shadow-xs'],
          ].map(([st, label, activeBg]) => (
            <button
              key={st}
              type="button"
              onClick={() => setPaymentStatus(st)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                paymentStatus === st ? activeBg : 'bg-surface-low text-on-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {paymentStatus !== 'unpaid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {paymentStatus === 'partial' && (
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-1">المبلغ المدفوع (ج.م)</label>
              <input
                type="number"
                min="1"
                max={currentTotal}
                placeholder="المبلغ المدفوع..."
                value={paidInput}
                onChange={(e) => setPaidInput(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono"
              />
            </div>
          )}
          <div className={paymentStatus === 'paid' ? 'sm:col-span-2' : ''}>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-1">الخزينة المسدد بها</label>
            <AX_SearchableSelect
              value={selectedTreasuryId || treasuryAccounts[0]?.id}
              onChange={setSelectedTreasuryId}
              options={treasuryAccounts.map((t) => ({
                value: t.id,
                label: t.name,
                badge: `${(Number(t.balance) || 0).toLocaleString('en-US')} ج.م`,
              }))}
              placeholder="اختر الخزينة..."
              searchable={false}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 pt-1 flex-wrap font-mono">
        {discountAmount > 0 && (
          <div>
            <span className="text-[11px] text-on-surface-variant block font-bold font-sans">قبل الخصم:</span>
            <span className="text-xs font-bold text-slate-400 line-through">
              {Number(subtotal).toLocaleString('en-US')} ج.م
            </span>
          </div>
        )}
        {discountAmount > 0 && (
          <div>
            <span className="text-[11px] text-emerald-700 block font-bold font-sans">
              قيمة الخصم {discountType === 'percent' ? `(${discountValue}%)` : ''}:
            </span>
            <span className="text-xs font-black text-emerald-600">
              -{Number(discountAmount).toLocaleString('en-US')} ج.م
            </span>
          </div>
        )}
        <div>
          <span className="text-[11px] text-on-surface-variant block font-bold font-sans">
            {discountAmount > 0 ? 'الصافي النهائي:' : 'الإجمالي:'}
          </span>
          <span className="text-sm font-black text-primary">
            {currentTotal.toLocaleString('en-US')} ج.م
          </span>
        </div>
        {paymentStatus !== 'unpaid' && (
          <div>
            <span className="text-[11px] text-on-surface-variant block font-bold font-sans">المسدد:</span>
            <span className="text-sm font-black text-emerald-600">
              {currentPaid.toLocaleString('en-US')} ج.م
            </span>
          </div>
        )}
        {paymentStatus === 'partial' && (
          <div>
            <span className="text-[11px] text-on-surface-variant block font-bold font-sans">المتبقي:</span>
            <span className="text-sm font-black text-error">
              {currentRemaining.toLocaleString('en-US')} ج.م
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default AX_InvoicePaymentSection
