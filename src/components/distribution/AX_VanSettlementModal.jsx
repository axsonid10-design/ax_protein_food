import React, { useState, useMemo, useEffect } from 'react'
import { FileCheck2, X, AlertTriangle } from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { axToast } from '../common/AX_Toast'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_VanSettlementExpenseSection } from './AX_VanSettlementExpenseSection'
import { AX_VanSettlementRemittanceSection } from './AX_VanSettlementRemittanceSection'
import { executeVanSettlement } from '../../store/vanDistributionHelpers'
import { generateUUID } from '../../utils/AX_UUID'

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
  const expenseCategories = useAXStore((state) => state.expenseCategories) || []
  const addExpenseCategory = useAXStore((state) => state.addExpenseCategory)

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
  const custodyCashBalance = Number(currentVanCash?.balance) || 0

  const [settlementDate, setSettlementDate] = useState(() => new Date().toISOString().split('T')[0])
  const [expenseRows, setExpenseRows] = useState([])
  const [remittanceRows, setRemittanceRows] = useState([])
  const [stockAction, setStockAction] = useState('retain')
  const [returnWarehouseId, setReturnWarehouseId] = useState(nonVanWarehouses[0]?.id || '')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalExpenses = useMemo(
    () => expenseRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
    [expenseRows]
  )

  const netBalance = custodyCashBalance - totalExpenses
  const isNetNegative = netBalance < 0

  const totalRemitted = useMemo(
    () => remittanceRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
    [remittanceRows]
  )

  useEffect(() => {
    if (!isOpen) return
    setExpenseRows([])
    setRemittanceRows(
      defaultCashTreasury
        ? [
            {
              id: `remit-${generateUUID()}`,
              treasuryId: defaultCashTreasury.id,
              amount: '',
              method: defaultCashTreasury.type === 'cash' ? 'cash' : 'transfer',
            },
          ]
        : []
    )
    setNotes('')
    setStockAction('retain')
    if (nonVanWarehouses[0]?.id) setReturnWarehouseId(nonVanWarehouses[0].id)
  }, [isOpen, currentVan?.id])

  if (!isOpen) return null

  const handleAddNewCategory = (categoryName) => {
    const trimmed = String(categoryName || '').trim()
    if (!trimmed) return null
    const newId = `exp-sec-${generateUUID()}`
    const newCat = {
      id: newId,
      name: trimmed,
      level: 'secondary',
      parentId: 'exp-sub-trn',
      code: 'EXP-CUSTOM',
      createdAt: new Date().toISOString(),
    }
    if (typeof addExpenseCategory === 'function') {
      addExpenseCategory(newCat)
    }
    axToast.success(`تم حفظ البند "${trimmed}" وتثبيته في النظام`)
    return newCat
  }

  const handleAddExpenseRow = (categoryId, categoryName) => {
    setExpenseRows((prev) => [
      ...prev,
      {
        id: `row-${generateUUID()}`,
        categoryId: categoryId || 'exp-sec-trn-fuel',
        categoryName: categoryName || 'وقود وسولار سيارات التوزيع',
        amount: '',
        paymentMethod: 'van_custody',
        notes: '',
      },
    ])
  }

  const handleRemoveExpenseRow = (rowId) => {
    setExpenseRows((prev) => prev.filter((r) => r.id !== rowId))
  }

  const handleChangeExpenseRow = (rowId, field, val, extraName) => {
    setExpenseRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r
        if (field === 'categoryId') {
          return { ...r, categoryId: val, categoryName: extraName || r.categoryName }
        }
        return { ...r, [field]: val }
      })
    )
  }

  const handleAddRemittanceRow = () => {
    const selectedIds = new Set(remittanceRows.map((r) => r.treasuryId).filter(Boolean))
    const nextAvailable = targetTreasuries.find((t) => !selectedIds.has(t.id))
    if (!nextAvailable) {
      axToast.error('تم استخدام كافة الحسابات والخزائن المتاحة للتوريد')
      return
    }

    setRemittanceRows((prev) => [
      ...prev,
      {
        id: `remit-${generateUUID()}`,
        treasuryId: nextAvailable.id,
        amount: '',
        method: nextAvailable.type === 'cash' ? 'cash' : 'transfer',
      },
    ])
  }

  const handleRemoveRemittanceRow = (rowId) => {
    setRemittanceRows((prev) => prev.filter((r) => r.id !== rowId))
  }

  const handleChangeRemittanceRow = (rowId, field, val) => {
    setRemittanceRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r
        if (field === 'treasuryId') {
          const targetTr = targetTreasuries.find((t) => t.id === val)
          return {
            ...r,
            treasuryId: val,
            method: targetTr?.type === 'cash' ? 'cash' : 'transfer',
          }
        }
        return { ...r, [field]: val }
      })
    )
  }

  const handleAutoFillRemaining = (rowId) => {
    const otherRowsSum = remittanceRows
      .filter((r) => r.id !== rowId)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    const remaining = Math.max(0, netBalance - otherRowsSum)
    setRemittanceRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, amount: remaining > 0 ? remaining : '' } : r))
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isNetNegative && totalRemitted > 0) {
      axToast.error('لا يمكن توريد مبالغ إضافية بينما صافي عهدة السيارة بالسالب')
      return
    }

    if (!isNetNegative && totalRemitted > netBalance) {
      axToast.error('إجمالي مبالغ التوريد يتجاوز صافي العهدة المتاح')
      return
    }

    if (stockAction === 'return' && !returnWarehouseId) {
      axToast.error('يرجى تحديد المخزن المستلم للبضاعة المرتجعة')
      return
    }

    const validPayments = remittanceRows
      .filter((r) => Number(r.amount) > 0)
      .map((r) => {
        const tr = targetTreasuries.find((t) => t.id === r.treasuryId)
        return {
          destinationTreasuryId: r.treasuryId,
          amount: Number(r.amount),
          method: tr?.type === 'cash' ? 'cash' : tr?.type === 'instapay' ? 'instapay' : 'transfer',
          treasuryName: tr?.name || 'الخزينة',
        }
      })

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
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-surface-low border border-outline-variant/30 text-center font-mono">
            <div>
              <span className="text-xs font-bold text-on-surface-variant block">إجمالي عهدة الكاش</span>
              <span className="text-base font-black text-on-surface">
                {custodyCashBalance.toLocaleString('en-US')} ج.م
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-on-surface-variant block">مصاريف المندوب</span>
              <span className="text-base font-black text-error">
                -{totalExpenses.toLocaleString('en-US')} ج.م
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-on-surface-variant block">
                {isNetNegative ? 'الرصيد بالسالب (مستحق)' : 'الصافي للتوريد'}
              </span>
              <div className="flex items-center justify-center gap-1">
                {isNetNegative && <AlertTriangle className="w-4 h-4 text-error" />}
                <span className={`text-base font-black ${isNetNegative ? 'text-error' : 'text-primary'}`}>
                  {isNetNegative
                    ? `-${Math.abs(netBalance).toLocaleString('en-US')} ج.م`
                    : `${netBalance.toLocaleString('en-US')} ج.م`}
                </span>
              </div>
            </div>
          </div>

          <AX_VanSettlementExpenseSection
            expenseRows={expenseRows}
            onAddRow={handleAddExpenseRow}
            onRemoveRow={handleRemoveExpenseRow}
            onChangeRow={handleChangeExpenseRow}
            onAddNewCategory={handleAddNewCategory}
            totalExpenses={totalExpenses}
            expenseCategories={expenseCategories}
          />

          <AX_VanSettlementRemittanceSection
            remittanceRows={remittanceRows}
            onAddRow={handleAddRemittanceRow}
            onRemoveRow={handleRemoveRemittanceRow}
            onChangeRow={handleChangeRemittanceRow}
            onAutoFillRemaining={handleAutoFillRemaining}
            targetTreasuries={targetTreasuries}
            netBalance={netBalance}
            totalRemitted={totalRemitted}
          />

          <div className="space-y-2">
            <span className="text-xs font-black text-on-surface block">
              تسوية البضاعة المتبقية بالسيارة ({currentVanStock.length} صنف)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-2 transition-all ${
                  stockAction === 'retain' ? 'bg-primary/5 border-primary' : 'bg-surface-low border-outline-variant/30'
                }`}
              >
                <input
                  type="radio"
                  name="stockAction"
                  checked={stockAction === 'retain'}
                  onChange={() => setStockAction('retain')}
                />
                <span className="text-xs font-black text-on-surface">إبقاء الرصيد بعهدة السيارة</span>
              </label>
              <label
                className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-2 transition-all ${
                  stockAction === 'return' ? 'bg-primary/5 border-primary' : 'bg-surface-low border-outline-variant/30'
                }`}
              >
                <input
                  type="radio"
                  name="stockAction"
                  checked={stockAction === 'return'}
                  onChange={() => setStockAction('return')}
                />
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
            className="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
          />
        </form>

        <div className="p-4 border-t border-surface-container bg-surface-lowest flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold cursor-pointer transition-all"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>{isSubmitting ? 'جاري التنفيذ...' : 'اعتماد وحفظ التسوية'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AX_VanSettlementModal
