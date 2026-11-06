import React from 'react'
import { DollarSign, AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react'

export function AX_SupplierOverpaymentCard({
  supplier,
  totalPurchasesAmount = 0,
  totalSalesAmount = 0,
  totalSettledAmount = 0,
  netOffsetBalance = 0,
  purchasesCount = 0,
  salesCount = 0,
}) {
  const isPayable = netOffsetBalance > 0
  const isReceivable = netOffsetBalance < 0

  const netPurchases = totalPurchasesAmount - totalSalesAmount
  const excessPaid = Math.max(0, totalSettledAmount - Math.max(0, netPurchases))
  const overpaymentAmount = excessPaid > 0 ? excessPaid : (netOffsetBalance < 0 ? Math.abs(netOffsetBalance) : 0)
  const hasOverpayment = overpaymentAmount > 0

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-surface-container/20 border border-outline-variant/20 rounded-2xl p-3">
          <span className="text-[11px] font-bold text-on-surface-variant block">رصيد أول المدة</span>
          <span className="text-sm sm:text-base font-black font-mono text-on-surface">
            {(Number(supplier?.openingBalance) || 0).toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-on-surface-variant block">
            {supplier?.openingBalanceType === 'payable' ? 'دائن (له)' : 'مدين (مقدم له)'}
          </span>
        </div>

        <div className="bg-surface-container/20 border border-outline-variant/20 rounded-2xl p-3">
          <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي التوريدات (مشترياتنا)</span>
          <span className="text-sm sm:text-base font-black font-mono text-on-surface">
            {totalPurchasesAmount.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-on-surface-variant block">
            ({purchasesCount} فاتورة توريد)
          </span>
        </div>

        <div className="bg-surface-container/20 border border-outline-variant/20 rounded-2xl p-3">
          <span className="text-[11px] font-bold text-on-surface-variant block">مبيعات للمورد (مقاصة)</span>
          <span className="text-sm sm:text-base font-black font-mono text-amber-700">
            {totalSalesAmount.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-on-surface-variant block">
            ({salesCount} فاتورة بيع)
          </span>
        </div>

        <div className="bg-surface-container/20 border border-outline-variant/20 rounded-2xl p-3">
          <span className="text-[11px] font-bold text-on-surface-variant block">صافي الحساب بالمقاصة</span>
          <span
            className={`text-sm sm:text-base font-black font-mono ${
              isPayable ? 'text-red-800' : isReceivable ? 'text-emerald-700' : 'text-on-surface'
            }`}
          >
            {isReceivable ? `-${Math.abs(netOffsetBalance).toLocaleString('en-US')}` : netOffsetBalance.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] font-bold block text-on-surface-variant">
            {isPayable ? 'مستحق للمورد (له)' : isReceivable ? 'مطلوب من المورد (لنا عنده - بالسالب)' : 'حساب خالص'}
          </span>
        </div>
      </div>

      <div
        className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
          hasOverpayment
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950'
            : 'bg-surface-container/15 border-outline-variant/20 text-on-surface'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              hasOverpayment ? 'bg-emerald-600 text-white shadow-xs' : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black">المدفوعات الزائدة للمورد (Overpayments)</span>
              {hasOverpayment ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px]">
                  فائض مسدد
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-bold">
                  لا يوجد فائض
                </span>
              )}
            </div>
            <span className="text-[11px] text-on-surface-variant block">
              {hasOverpayment
                ? 'مبالغ مسددة بالزيادة عن قيمة البضائع الموردة، مستحقة الاسترداد نقداً أو ببضائع'
                : 'إجمالي المسدد لا يتجاوز قيمة البضائع المعتمدة'}
            </span>
          </div>
        </div>

        <div className="text-left font-mono shrink-0">
          <span
            className={`text-base font-black block ${
              hasOverpayment ? 'text-emerald-700' : 'text-on-surface-variant'
            }`}
          >
            {overpaymentAmount.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-on-surface-variant block">
            {hasOverpayment ? 'رصيد دائن لصالحنا لدى المورد' : 'مسدد كلياً ومتطابق'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default AX_SupplierOverpaymentCard
