import React, { useState, useMemo, useEffect } from 'react'
import {
  FileCheck2,
  X,
  Plus,
  Trash2,
  Wallet,
  Boxes,
  Fuel,
  CreditCard,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { axToast } from '../common/AX_Toast'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { executeVanSettlement } from '../../store/vanDistributionHelpers'

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'exp-sec-trn-fuel', name: 'وقود وسولار سيارات التوزيع' },
  { id: 'exp-sec-trn-tolls', name: 'رسوم طرق وكارتات ومواقف' },
  { id: 'exp-sec-trn-porter', name: 'مشالات وعتالة نقل وتنزيل' },
  { id: 'exp-sec-mnt-vans', name: 'صيانة ميكانيكا سيارات التبريد' },
]

export function AX_VanSettlementModal({
  isOpen,
  onClose,
  currentVan,
  currentVanCash,
  currentVanStock = [],
  onSettlementCompleted,
}) {
  useBodyScrollLock(isOpen, onClose)
  const treasuryAccounts = useAXStore((state) => state.treasuryAccounts) || []
  const warehouses = useAXStore((state) => state.warehouses) || []
  const items = useAXStore((state) => state.items) || []
  const stockAudits = useAXStore((state) => state.stockAudits) || []
  const inventoryStock = useAXStore((state) => state.inventoryStock) || []

  const addCashTransaction = useAXStore((state) => state.addCashTransaction)
  const addPendingCashTransfer = useAXStore((state) => state.addPendingCashTransfer)
  const confirmCashTransfer = useAXStore((state) => state.confirmCashTransfer)

  const nonVanWarehouses = useMemo(
    () => warehouses.filter((w) => w.type !== 'van' && w.id !== currentVan?.id),
    [warehouses, currentVan]
  )

  const targetTreasuries = useMemo(
    () => treasuryAccounts.filter((t) => t.id !== currentVanCash?.id),
    [treasuryAccounts, currentVanCash]
  )

  const defaultCashTreasury = targetTreasuries.find((t) => t.type === 'cash') || targetTreasuries[0]
  const defaultBankTreasury = targetTreasuries.find((t) => t.type === 'bank' || t.type === 'instapay') || targetTreasuries[1]
  const custodyCashBalance = Number(currentVanCash?.balance) || 0

  const [settlementDate, setSettlementDate] = useState(() => new Date().toISOString().split('T')[0])
  const [expenseRows, setExpenseRows] = useState([])
  const [cashRemitAmount, setCashRemitAmount] = useState('')
  const [cashTreasuryId, setCashTreasuryId] = useState(defaultCashTreasury?.id || '')
  const [bankRemitAmount, setBankRemitAmount] = useState('')
  const [bankTreasuryId, setBankTreasuryId] = useState(defaultBankTreasury?.id || '')
  const [stockAction, setStockAction] = useState('retain')
  const [returnWarehouseId, setReturnWarehouseId] = useState(nonVanWarehouses[0]?.id || '')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddExpenseRow = () => {
    setExpenseRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random()}`,
        categoryId: DEFAULT_EXPENSE_CATEGORIES[0].id,
        categoryName: DEFAULT_EXPENSE_CATEGORIES[0].name,
        amount: '',
        notes: '',
      },
    ])
  }

  const handleRemoveExpenseRow = (rowId) => {
    setExpenseRows((prev) => prev.filter((r) => r.id !== rowId))
  }

  const handleExpenseChange = (rowId, field, val) => {
    setExpenseRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r
        if (field === 'categoryId') {
          const cat = DEFAULT_EXPENSE_CATEGORIES.find((c) => c.id === val)
          return { ...r, categoryId: val, categoryName: cat?.name || val }
        }
        return { ...r, [field]: val }
      })
    )
  }

  const totalExpenses = useMemo(
    () => expenseRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
    [expenseRows]
  )

  const netRemitDue = Math.max(0, custodyCashBalance - totalExpenses)
  const totalRemitted = (Number(cashRemitAmount) || 0) + (Number(bankRemitAmount) || 0)

  const handleAutoFillRemaining = (channel = 'cash') => {
    const unallocated = Math.max(0, custodyCashBalance - totalExpenses)
    if (channel === 'cash') {
      setCashRemitAmount(Math.max(0, unallocated - (Number(bankRemitAmount) || 0)))
    } else {
      setBankRemitAmount(Math.max(0, unallocated - (Number(cashRemitAmount) || 0)))
    }
  }

  useEffect(() => {
    setExpenseRows([])
    setCashRemitAmount('')
    setBankRemitAmount('')
    setNotes('')
    setStockAction('retain')
    if (defaultCashTreasury?.id) setCashTreasuryId(defaultCashTreasury.id)
    if (defaultBankTreasury?.id) setBankTreasuryId(defaultBankTreasury.id)
    if (nonVanWarehouses[0]?.id) setReturnWarehouseId(nonVanWarehouses[0].id)
  }, [isOpen, currentVan?.id])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (totalExpenses > custodyCashBalance) {
      axToast.error('إجمالي المصاريف يتجاوز رصيد العهدة النقدية للسيارة')
      return
    }

    if (totalRemitted > netRemitDue) {
      axToast.error('إجمالي مبالغ التوريد يتجاوز صافي العهدة المتاح')
      return
    }

    if (stockAction === 'return' && !returnWarehouseId) {
      axToast.error('يرجى تحديد المخزن المستلم للبضاعة المرتجعة')
      return
    }

    const validPayments = []
    if (Number(cashRemitAmount) > 0) {
      const tId = cashTreasuryId || defaultCashTreasury?.id
      const tr = targetTreasuries.find((t) => t.id === tId)
      validPayments.push({
        destinationTreasuryId: tId,
        amount: Number(cashRemitAmount),
        method: 'cash',
        treasuryName: tr?.name || 'الخزينة الرئيسية',
      })
    }

    if (Number(bankRemitAmount) > 0) {
      const tId = bankTreasuryId || defaultBankTreasury?.id
      const tr = targetTreasuries.find((t) => t.id === tId)
      validPayments.push({
        destinationTreasuryId: tId,
        amount: Number(bankRemitAmount),
        method: tr?.type === 'instapay' ? 'instapay' : 'transfer',
        treasuryName: tr?.name || 'الحساب البنكي',
      })
    }

    const returnStockPayload = {
      action: stockAction,
      targetWarehouseId: stockAction === 'return' ? returnWarehouseId : null,
      items:
        stockAction === 'return'
          ? currentVanStock.map((s) => ({
              itemId: s.itemId,
              quantity: s.quantity,
              unit: s.unit || 'كرتونة',
            }))
          : [],
    }

    setIsSubmitting(true)
    try {
      const res = await executeVanSettlement(
        {
          vanWarehouseId: currentVan?.id,
          driverId: currentVan?.driverId,
          driverName: currentVan?.manager || currentVan?.driverName || 'المندوب',
          vanName: currentVan?.name || 'سيارة التوزيع',
          settlementDate,
          grossCash: custodyCashBalance,
          revenue: { payments: validPayments },
          expenses: expenseRows.filter((r) => Number(r.amount) > 0),
          stockSettlement: returnStockPayload,
          notes,
          vanTreasuryId: currentVanCash?.id,
        },
        { addCashTransaction, addPendingCashTransfer, confirmCashTransfer },
        { warehouses, items, stockAudits, inventoryStock },
        useAXStore.setState
      )

      if (res?.success) {
        axToast.success(`تم إتمام التسوية اليومية لسيارة ${currentVan?.name} بنجاح`)
        if (typeof onSettlementCompleted === 'function') {
          onSettlementCompleted(res.settlement)
        }
        onClose()
      } else {
        axToast.error('فشل في إتمام التسوية')
      }
    } catch {
      axToast.error('حدث خطأ أثناء تنفيذ تسوية السيارة')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface-lowest border-2 border-primary/20 rounded-3xl shadow-level3 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-surface-container flex items-center justify-between bg-surface-lowest">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-on-surface">تصفية وتسوية يومية: {currentVan?.name}</h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                تصفية المبيعات والمصاريف وتوريد النقدية وتسوية البضاعة المتبقية
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-surface-low border border-outline-variant/30 text-center font-mono">
            <div>
              <span className="text-xs font-bold text-on-surface-variant block">إجمالي عهدة الكاش</span>
              <span className="text-base font-black text-on-surface">{custodyCashBalance.toLocaleString('en-US')} ج.م</span>
            </div>
            <div>
              <span className="text-xs font-bold text-on-surface-variant block">مصاريف المندوب</span>
              <span className="text-base font-black text-error">-{totalExpenses.toLocaleString('en-US')} ج.م</span>
            </div>
            <div>
              <span className="text-xs font-bold text-on-surface-variant block">الصافي للتوريد</span>
              <span className="text-base font-black text-primary">{netRemitDue.toLocaleString('en-US')} ج.م</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-on-surface flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-primary" />
                المصاريف التشغيلية للمندوب (سولار، كارتات، مشالات)
              </span>
              <button
                type="button"
                onClick={handleAddExpenseRow}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-low hover:bg-surface-container text-primary text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة بند مصروف</span>
              </button>
            </div>

            {expenseRows.length === 0 ? (
              <div className="p-2.5 rounded-2xl bg-surface-low/50 border border-outline-variant/20 text-center text-xs font-bold text-on-surface-variant">
                لم يتم تسجيل أي مصاريف تشغيلية خلال جولة اليوم.
              </div>
            ) : (
              <div className="space-y-1.5">
                {expenseRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2 rounded-2xl bg-surface-low border border-outline-variant/20">
                    <select
                      value={row.categoryId}
                      onChange={(e) => handleExpenseChange(row.id, 'categoryId', e.target.value)}
                      className="sm:col-span-4 px-2.5 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface"
                    >
                      {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      placeholder="المبلغ (ج.م)"
                      value={row.amount}
                      onChange={(e) => handleExpenseChange(row.id, 'amount', e.target.value)}
                      className="sm:col-span-3 px-2.5 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-mono font-bold text-on-surface"
                    />
                    <input
                      type="text"
                      placeholder="بيان وملاحظة المصروف..."
                      value={row.notes}
                      onChange={(e) => handleExpenseChange(row.id, 'notes', e.target.value)}
                      className="sm:col-span-4 px-2.5 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExpenseRow(row.id)}
                      className="sm:col-span-1 p-1 rounded-full hover:bg-error/10 text-error flex justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <span className="text-xs font-black text-on-surface flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-primary" />
              توزيع توريد الإيرادات (تصفية متعددة القنوات: كاش + تحويل بنكي / إنستاباي)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-on-surface flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-primary" />
                    توريد نقدي (كاش)
                  </span>
                  <button type="button" onClick={() => handleAutoFillRemaining('cash')} className="text-[11px] text-primary hover:underline cursor-pointer">
                    تعبئة المتبقي
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="المبلغ نقداً..."
                  value={cashRemitAmount}
                  onChange={(e) => setCashRemitAmount(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-mono font-bold text-on-surface"
                />
                <select
                  value={cashTreasuryId}
                  onChange={(e) => setCashTreasuryId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface"
                >
                  {targetTreasuries.filter((t) => t.type === 'cash').map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-on-surface flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-secondary" />
                    توريد بنكي / إنستاباي
                  </span>
                  <button type="button" onClick={() => handleAutoFillRemaining('bank')} className="text-[11px] text-secondary hover:underline cursor-pointer">
                    تعبئة المتبقي
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="مبلغ التحويل..."
                  value={bankRemitAmount}
                  onChange={(e) => setBankRemitAmount(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-mono font-bold text-on-surface"
                />
                <select
                  value={bankTreasuryId}
                  onChange={(e) => setBankTreasuryId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface"
                >
                  {targetTreasuries.filter((t) => t.type !== 'cash').map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.type === 'instapay' ? 'إنستاباي' : 'بنك'})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-surface-low border border-outline-variant/20 text-xs font-bold">
              <span>إجمالي المبالغ الموردة الآن:</span>
              <span className="font-mono font-black text-primary text-sm">{totalRemitted.toLocaleString('en-US')} ج.م</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black text-on-surface flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-primary" />
              تسوية البضاعة المتبقية بالسيارة ({currentVanStock.length} صنف)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-2 transition-all ${stockAction === 'retain' ? 'bg-primary/5 border-primary' : 'bg-surface-low border-outline-variant/30'}`}>
                <input type="radio" name="stockAction" checked={stockAction === 'retain'} onChange={() => setStockAction('retain')} />
                <span className="text-xs font-black text-on-surface">إبقاء الرصيد بعهدة السيارة</span>
              </label>
              <label className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-2 transition-all ${stockAction === 'return' ? 'bg-primary/5 border-primary' : 'bg-surface-low border-outline-variant/30'}`}>
                <input type="radio" name="stockAction" checked={stockAction === 'return'} onChange={() => setStockAction('return')} />
                <span className="text-xs font-black text-on-surface">إرجاع البضاعة للمخزن المركزي</span>
              </label>
            </div>
            {stockAction === 'return' && (
              <AX_SearchableSelect
                value={returnWarehouseId}
                onChange={setReturnWarehouseId}
                options={nonVanWarehouses.map((w) => ({ value: w.id, label: w.name }))}
                placeholder="اختر المخزن المستلم للبضاعة المرتجعة..."
              />
            )}
          </div>

          <input
            type="text"
            placeholder="ملاحظات ختامية للتسوية..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface"
          />
        </form>

        <div className="p-4 border-t border-surface-container bg-surface-lowest flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold cursor-pointer">
            إلغاء
          </button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 flex items-center gap-1.5 cursor-pointer disabled:opacity-40">
            <FileCheck2 className="w-4 h-4" />
            <span>{isSubmitting ? 'جاري التنفيذ...' : 'اعتماد وحفظ التسوية'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AX_VanSettlementModal
