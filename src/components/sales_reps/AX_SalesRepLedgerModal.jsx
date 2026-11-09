import React, { useState, useMemo } from 'react'
import {
  X,
  FileSpreadsheet,
  Printer,
  DollarSign,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Phone,
  Building,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { computeRepLedgerBalance } from './AX_CommissionEngine'
import { showToast } from '../common/AX_Toast'
import { AX_SalesRepOperationsService } from '../../services/AX_SalesRepOperationsService.js'

export function AX_SalesRepLedgerModal({ rep, isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const { profile, salesRepLedger = [], addSalesRepTransaction } = useAXStore()

  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutDescription, setPayoutDescription] = useState('')
  const [showPayoutForm, setShowPayoutForm] = useState(false)

  const repTransactions = useMemo(() => {
    if (!rep?.id) return []
    if (Array.isArray(salesRepLedger)) {
      return salesRepLedger.filter((t) => t.repId === rep.id)
    }
    return salesRepLedger[rep.id] || []
  }, [rep, salesRepLedger])

  const { netBalance, history } = useMemo(() => {
    const opening = Number(rep?.openingBalance) || 0
    return computeRepLedgerBalance(opening, repTransactions)
  }, [rep, repTransactions])

  if (!isOpen || !rep) return null

  const handleRecordPayout = (e) => {
    e.preventDefault()
    const amt = Number(payoutAmount) || 0
    if (amt <= 0) {
      showToast('يرجى إدخال مبلغ صالح للصرف', 'warning')
      return
    }

    const tx = {
      id: `payout-${Date.now()}`,
      repId: rep.id,
      amount: amt,
      type: 'payment',
      description: payoutDescription.trim() || 'صرف عمولات / دفعة نقدية للمندوب',
      notes: payoutDescription.trim() || 'صرف عمولات / دفعة نقدية للمندوب',
      date: new Date().toISOString().split('T')[0],
    }

    addSalesRepTransaction(rep.id, tx)
    AX_SalesRepOperationsService.addSalesRepTransactionInDB(tx, profile)
    showToast('تم تسجيل صرف الدفعة بنجاح', 'success')
    setPayoutAmount('')
    setPayoutDescription('')
    setShowPayoutForm(false)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overflow-y-auto print:p-0 print:bg-white print:static print:block">
      <div className="ax-a4-sheet bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-4xl w-full shadow-level3 space-y-4 my-auto print:border-none print:shadow-none print:rounded-none print:w-[210mm] print:mx-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center print:hidden">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-on-surface">كشف حساب عمولات المندوب 360°</h3>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {rep.commissionModel || 'volume_rate'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-bold flex items-center gap-1.5 mt-0.5">
                <User className="w-3.5 h-3.5" />
                <span>{rep.name}</span>
                {rep.phone && (
                  <>
                    <span>•</span>
                    <Phone className="w-3 h-3" />
                    <span className="font-mono">{rep.phone}</span>
                  </>
                )}
                {rep.assignedBranch && (
                  <>
                    <span>•</span>
                    <Building className="w-3 h-3" />
                    <span>{rep.assignedBranch}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setShowPayoutForm((v) => !v)}
              className="py-1.5 px-3.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>صرف دفعة</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="py-1.5 px-3.5 rounded-full border border-outline-variant/50 text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              <span>طباعة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showPayoutForm && (
          <form onSubmit={handleRecordPayout} className="bg-surface-low/70 border border-outline-variant/30 rounded-2xl p-3.5 space-y-3">
            <h4 className="text-xs font-black text-on-surface">تسجيل صرف دفعة نقدية للمندوب</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="number"
                min="1"
                step="any"
                required
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="المبلغ المصروف (ج.م) *"
                className="w-full px-3 py-2 rounded-full border border-outline-variant/60 text-xs font-bold bg-surface-lowest text-on-surface font-mono"
              />
              <input
                type="text"
                value={payoutDescription}
                onChange={(e) => setPayoutDescription(e.target.value)}
                placeholder="ملاحظات أو رقم الإيصال..."
                className="w-full px-3 py-2 rounded-full border border-outline-variant/60 text-xs font-semibold bg-surface-lowest text-on-surface"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPayoutForm(false)}
                className="py-1.5 px-4 rounded-full border border-outline-variant/60 text-xs font-bold text-on-surface"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="py-1.5 px-5 rounded-full bg-emerald-700 text-white text-xs font-black shadow-xs hover:bg-emerald-800 transition-all"
              >
                تأكيد الصرف
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-on-surface-variant block">رصيد أول المدة</span>
            <span className="text-sm font-black font-mono text-on-surface">
              {Number(rep.openingBalance || 0).toLocaleString('en-US')} ج.م
            </span>
          </div>

          <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي العمولات المكتسبة</span>
            <span className="text-sm font-black font-mono text-emerald-700">
              {history.filter((h) => h.type === 'commission' || h.type === 'bonus').reduce((s, h) => s + (Number(h.amount) || 0), 0).toLocaleString('en-US')} ج.م
            </span>
          </div>

          <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي المنصرف للمندوب</span>
            <span className="text-sm font-black font-mono text-red-800">
              {history.filter((h) => h.type === 'payment' || h.type === 'disbursement').reduce((s, h) => s + (Number(h.amount) || 0), 0).toLocaleString('en-US')} ج.م
            </span>
          </div>

          <div className="bg-surface-low/70 border border-outline-variant/20 rounded-2xl p-3">
            <span className="text-[11px] font-bold text-on-surface-variant block">صافي الرصيد المستحق</span>
            <span className={`text-base font-black font-mono ${netBalance > 0 ? 'text-emerald-700' : 'text-on-surface-variant'}`}>
              {netBalance.toLocaleString('en-US')} ج.م
            </span>
          </div>
        </div>

        <div className="border border-outline-variant/30 rounded-2xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-container/60 sticky top-0 border-b border-outline-variant/30 text-on-surface font-black">
                <tr>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">البيان والحركة</th>
                  <th className="py-2.5 px-3 font-mono">مستحق للمندوب (+)</th>
                  <th className="py-2.5 px-3 font-mono">منصرف له (-)</th>
                  <th className="py-2.5 px-3 font-mono">الرصيد الجاري</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-on-surface-variant font-bold">
                      لا توجد حركات مسجلة لهذا المندوب بعد.
                    </td>
                  </tr>
                ) : (
                  history.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-on-surface-variant whitespace-nowrap">
                        {row.date ? String(row.date).split('T')[0] : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-on-surface">
                        <div className="flex items-center gap-1.5">
                          {row.type === 'commission' || row.type === 'bonus' ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-red-700 flex-shrink-0" />
                          )}
                          <span>{row.description || row.notes || 'حركة حساب'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                        {row.type === 'commission' || row.type === 'bonus' ? `${Number(row.amount).toLocaleString('en-US')} ج.م` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-red-800">
                        {row.type === 'payment' || row.type === 'disbursement' ? `${Number(row.amount).toLocaleString('en-US')} ج.م` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-black text-on-surface">
                        {row.runningBalance.toLocaleString('en-US')} ج.م
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AX_SalesRepLedgerModal
