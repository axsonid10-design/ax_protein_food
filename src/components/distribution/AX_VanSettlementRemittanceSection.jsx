import React, { useMemo } from 'react'
import { CreditCard, Plus, Trash2, Wallet, ArrowDownLeft, AlertCircle } from 'lucide-react'

export function AX_VanSettlementRemittanceSection({
  remittanceRows = [],
  onAddRow,
  onRemoveRow,
  onChangeRow,
  onAutoFillRemaining,
  targetTreasuries = [],
  netBalance = 0,
  totalRemitted = 0,
}) {
  const selectedTreasuryIds = useMemo(
    () => new Set(remittanceRows.map((r) => r.treasuryId).filter(Boolean)),
    [remittanceRows]
  )

  const isNetNegative = netBalance < 0
  const maxAvailableToRemit = Math.max(0, netBalance)
  const remainingDue = Math.max(0, maxAvailableToRemit - totalRemitted)
  const hasOverRemitted = totalRemitted > maxAvailableToRemit && maxAvailableToRemit > 0
  const canAddMoreRows = targetTreasuries.length > remittanceRows.length && !isNetNegative

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-on-surface flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-primary" />
          توزيع وتوريد الإيرادات (تصفية متعددة القنوات: كاش + تحويل بنكي / إنستاباي)
        </span>
        <button
          type="button"
          onClick={onAddRow}
          disabled={!canAddMoreRows}
          className="inline-flex items-center gap-1 px-3.5 py-1 rounded-full bg-surface-low hover:bg-surface-container text-primary text-xs font-black transition-all cursor-pointer border border-outline-variant/30 disabled:opacity-40 disabled:cursor-not-allowed"
          title={!canAddMoreRows ? 'تم استخدام كافة الحسابات المتاحة أو الرصيد بالسالب' : 'إضافة حساب توريد'}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة حساب توريد</span>
        </button>
      </div>

      {isNetNegative && (
        <div className="p-3 rounded-2xl bg-error/10 border border-error/30 text-xs font-bold text-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            صافي عهدة السيارة بالسالب ({netBalance.toLocaleString('en-US')} ج.م). لا توجد مبالغ نقدية مستحقة للتوريد (الشركة مدينة للمندوب).
          </span>
        </div>
      )}

      {remittanceRows.length === 0 ? (
        <div className="p-3.5 rounded-2xl bg-surface-low/50 border border-outline-variant/20 text-center text-xs font-bold text-on-surface-variant">
          لم يتم تحديد أي مبالغ موردة للخزينة أو البنك حتى الآن.
        </div>
      ) : (
        <div className="space-y-2">
          {remittanceRows.map((row) => {
            const availableForThisRow = targetTreasuries.filter(
              (t) => t.id === row.treasuryId || !selectedTreasuryIds.has(t.id)
            )
            const currentTreasury = targetTreasuries.find((t) => t.id === row.treasuryId)
            const isCash = currentTreasury?.type === 'cash'

            return (
              <div
                key={row.id}
                className="p-2.5 rounded-2xl bg-surface-low border border-outline-variant/20 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
              >
                <div className="w-full sm:w-1/2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                    {isCash ? <Wallet className="w-4 h-4" /> : <CreditCard className="w-4 h-4 text-secondary" />}
                  </div>
                  <select
                    value={row.treasuryId}
                    onChange={(e) => onChangeRow(row.id, 'treasuryId', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                  >
                    {availableForThisRow.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.type === 'cash' ? 'خزينة كاش' : t.type === 'instapay' ? 'إنستاباي' : 'حساب بنكي'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-36">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="المبلغ (ج.م)..."
                    value={row.amount}
                    onChange={(e) => onChangeRow(row.id, 'amount', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-mono font-black text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onAutoFillRemaining(row.id)}
                    className="px-2.5 py-1 rounded-full bg-secondary-container/30 hover:bg-secondary-container/60 text-secondary text-[11px] font-black cursor-pointer transition-all flex items-center gap-1 shrink-0"
                    title="تعبئة المتبقي من الصافي"
                  >
                    <ArrowDownLeft className="w-3 h-3" />
                    <span>تعبئة المتبقي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveRow(row.id)}
                    className="p-1.5 rounded-full hover:bg-error/10 text-error flex justify-center items-center cursor-pointer transition-all shrink-0"
                    title="حذف سطر التوريد"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-2xl bg-surface-low border border-outline-variant/20 text-xs font-bold font-mono">
        <div>
          <span className="text-[11px] text-on-surface-variant block">الصافي للتوريد</span>
          <span className="text-sm font-black text-on-surface">
            {maxAvailableToRemit.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div>
          <span className="text-[11px] text-on-surface-variant block">إجمالي المورد الآن</span>
          <span className="text-sm font-black text-primary">
            {totalRemitted.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div>
          <span className="text-[11px] text-on-surface-variant block">المتبقي للتوريد</span>
          <span
            className={`text-sm font-black ${
              hasOverRemitted ? 'text-error' : remainingDue === 0 ? 'text-primary' : 'text-amber-600'
            }`}
          >
            {hasOverRemitted
              ? `+${(totalRemitted - maxAvailableToRemit).toLocaleString('en-US')} زيادة`
              : `${remainingDue.toLocaleString('en-US')} ج.م`}
          </span>
        </div>
      </div>
    </div>
  )
}
