import React, { useState, useMemo, useEffect, useRef } from 'react'
import { X, Layers, Warehouse, AlertCircle, ArrowLeft, Package, Boxes, Scale } from 'lucide-react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { axToast } from '../common/AX_Toast'

export function AX_ItemOpeningBalanceModal({ isOpen, onClose, item, warehouses = [] }) {
  useBodyScrollLock(isOpen, onClose)

  const inventoryStock = useAXStore((s) => s.inventoryStock) || []
  const saveItemOpeningBalance = useAXStore((s) => s.saveItemOpeningBalance)

  const [workflowStep, setWorkflowStep] = useState('confirm_start')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(() => warehouses[0]?.id || '')
  const [openingQty, setOpeningQty] = useState('')
  const [openingDate, setOpeningDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [entryMode, setEntryMode] = useState('dual')
  const [cartonsPart, setCartonsPart] = useState('')
  const [piecesPart, setPiecesPart] = useState('')
  const prevIsOpenRef = useRef(false)

  const piecesPerCarton = Number(item?.piecesPerCarton || item?.pieces_per_carton || 0)
  const weightPerCarton = Number(item?.weightPerCarton || item?.weight_per_carton || 0)
  const subUnitName = item?.subUnitType || item?.sub_unit_type || 'قطعة'
  const baseUnit = item?.unitType || 'كرتونة'
  const isCarton = baseUnit === 'كرتونة'
  const hasPieces = isCarton && piecesPerCarton > 1

  const syncBreakdown = (val) => {
    const num = Number(val)
    if (!isNaN(num) && num > 0 && hasPieces) {
      const c = Math.floor(num)
      const p = Math.round((num - c) * piecesPerCarton)
      setCartonsPart(c > 0 ? String(c) : '')
      setPiecesPart(p > 0 ? String(p) : '')
    } else {
      setCartonsPart('')
      setPiecesPart('')
    }
  }

  const handleCartonsChange = (cVal) => {
    setCartonsPart(cVal)
    const c = Number(cVal) || 0
    const p = Number(piecesPart) || 0
    const total = piecesPerCarton > 0 ? c + (p / piecesPerCarton) : c
    const rounded = Number.isInteger(total) ? total : Number(total.toFixed(4))
    setOpeningQty(total > 0 ? String(rounded) : (cVal === '' && piecesPart === '' ? '' : '0'))
  }

  const handlePiecesChange = (pVal) => {
    setPiecesPart(pVal)
    const c = Number(cartonsPart) || 0
    const p = Number(pVal) || 0
    const total = piecesPerCarton > 0 ? c + (p / piecesPerCarton) : c
    const rounded = Number.isInteger(total) ? total : Number(total.toFixed(4))
    setOpeningQty(total > 0 ? String(rounded) : (cartonsPart === '' && pVal === '' ? '' : '0'))
  }

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setWorkflowStep('confirm_start')
      setIsSubmitting(false)
      const initialWhId = warehouses[0]?.id || ''
      setSelectedWarehouseId(initialWhId)
      const match = (inventoryStock || []).find((s) => s.itemId === item?.id && s.warehouseId === initialWhId)
      if (match && match.openingBalance !== undefined) {
        setOpeningQty(String(match.openingBalance))
        syncBreakdown(match.openingBalance)
        if (match.openingDate && match.openingDate !== 'غير محدد') {
          setOpeningDate(match.openingDate)
        } else {
          setOpeningDate(new Date().toISOString().split('T')[0])
        }
      } else {
        setOpeningQty('')
        setCartonsPart('')
        setPiecesPart('')
        setOpeningDate(new Date().toISOString().split('T')[0])
      }
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen, item?.id, warehouses, inventoryStock])

  const stockRows = useMemo(() => {
    if (!item?.id) return []
    return warehouses.map((wh) => {
      const match = (inventoryStock || []).find((s) => s.itemId === item.id && s.warehouseId === wh.id)
      return {
        warehouseId: wh.id,
        warehouseName: wh.name,
        openingBalance: Number(match?.openingBalance) || 0,
        openingDate: match?.openingDate || 'غير محدد',
        currentStock: Number(match?.quantity) || 0,
        unit: match?.unit || item.unitType || 'كرتونة',
      }
    })
  }, [item?.id, item?.unitType, warehouses, inventoryStock])

  const selectedStockRow = useMemo(() => {
    return stockRows.find((r) => r.warehouseId === selectedWarehouseId)
  }, [stockRows, selectedWarehouseId])

  const targetWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === selectedWarehouseId)
  }, [warehouses, selectedWarehouseId])

  const handleSelectWarehouse = (whId) => {
    setSelectedWarehouseId(whId)
    const row = stockRows.find((r) => r.warehouseId === whId)
    if (row && row.openingBalance !== undefined) {
      setOpeningQty(String(row.openingBalance))
      syncBreakdown(row.openingBalance)
      if (row.openingDate && row.openingDate !== 'غير محدد') {
        setOpeningDate(row.openingDate)
      }
    } else {
      setOpeningQty('')
      setCartonsPart('')
      setPiecesPart('')
    }
  }

  const handleStage2Submit = (e) => {
    e?.preventDefault()
    if (!selectedWarehouseId) {
      axToast.error('يرجى اختيار المخزن')
      return
    }
    const parsedQty = Number(openingQty)
    if (isNaN(parsedQty) || openingQty === '') {
      axToast.error('يرجى إدخال كمية صحيحة')
      return
    }
    setWorkflowStep('confirm_final')
  }

  const handleFinalExecution = async () => {
    const parsedQty = Number(openingQty)
    if (!selectedWarehouseId || isNaN(parsedQty)) {
      axToast.error('يرجى التأكد من صحة البيانات')
      setWorkflowStep('warehouse_form')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await saveItemOpeningBalance({
        itemId: item.id,
        warehouseId: selectedWarehouseId,
        quantity: parsedQty,
        date: openingDate,
        unit: selectedStockRow?.unit || item.unitType || 'كرتونة',
      })
      if (res?.success) {
        axToast.success(`تم اعتماد رصيد أول المدة [${parsedQty} ${item.unitType || 'كرتونة'}] بنجاح`)
        onClose()
      } else {
        axToast.error('حدث خطأ أثناء الحفظ')
        setWorkflowStep('warehouse_form')
      }
    } catch {
      axToast.error('فشل حفظ رصيد أول المدة')
      setWorkflowStep('warehouse_form')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !item) return null

  const whOptions = warehouses.map((w) => ({ value: w.id, label: w.name }))
  const activeUnit = selectedStockRow?.unit || item.unitType || 'كرتونة'
  const activeWarehouseName = targetWarehouse?.name || 'المخزن المحدد'

  if (workflowStep === 'confirm_start') {
    return (
      <AX_ConfirmModal
        isOpen={isOpen && workflowStep === 'confirm_start'}
        title="تأكيد تعديل رصيد أول المدة"
        message={`هل أنت متأكد؟ هل ترغب في تغيير رصيد أول المدة للصنف "${item.compositeName || item.name}"؟`}
        confirmText="نعم، متأكد"
        cancelText="إلغاء"
        onConfirm={() => setWorkflowStep('warehouse_form')}
        onCancel={onClose}
      />
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-2xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden mobile-form-zoom">
          <div className="flex items-center justify-between p-4 border-b border-surface-container shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                <Layers className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-on-surface">رصيد أول المدة للصنف</h3>
                  <span className="font-mono text-xs font-bold text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container">
                    {item.code}
                  </span>
                </div>
                <p className="text-xs font-bold text-on-surface-variant mt-0.5">{item.compositeName || item.name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-surface-container/60 hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleStage2Submit} className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p>
                يحدد رصيد أول المدة كمية البداية للصنف في المخزن وتاريخها الافتتاحي. في حال وجود محضر جرد معتمد لاحق، يظل الرصيد الفعلي الحالي مثبتاً على العد الفعلي للجرد.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-on-surface mb-1">المخزن المستهدف:</label>
                <AX_SearchableSelect
                  value={selectedWarehouseId}
                  onChange={handleSelectWarehouse}
                  options={whOptions}
                  placeholder="اختر المخزن"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-on-surface mb-1">تاريخ رصيد أول المدة:</label>
                <AX_CompanyDatePicker
                  value={openingDate}
                  onChange={setOpeningDate}
                />
              </div>
            </div>

            <div className="space-y-3 p-3.5 rounded-2xl bg-surface-container-low/50 border border-outline-variant/30">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-primary" />
                  <span>الكمية الافتتاحية ({baseUnit}):</span>
                </label>
                {hasPieces && (
                  <div className="flex items-center p-0.5 bg-surface-lowest rounded-full border border-outline-variant/30 text-[11px] font-black">
                    <button
                      type="button"
                      onClick={() => setEntryMode('dual')}
                      className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                        entryMode === 'dual'
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      كراتين + {subUnitName}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryMode('total')}
                      className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                        entryMode === 'total'
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      إدخال إجمالي
                    </button>
                  </div>
                )}
              </div>

              {hasPieces && entryMode === 'dual' ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="block text-[11px] font-bold text-on-surface-variant mb-1">
                        عدد الكراتين الكاملة:
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={cartonsPart}
                          onChange={(e) => handleCartonsChange(e.target.value)}
                          placeholder="مثلاً: 10"
                          className="w-full h-10 px-3 pr-3 pl-12 rounded-xl bg-surface-lowest border border-outline-variant/30 text-on-surface font-mono font-bold text-xs focus:outline-none focus:border-primary"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-on-surface-variant pointer-events-none">
                          كرتونة
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold text-on-surface-variant mb-1">
                        عدد الـ {subUnitName} الفردية:
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={piecesPart}
                          onChange={(e) => handlePiecesChange(e.target.value)}
                          placeholder={`أقل من ${piecesPerCarton}`}
                          className="w-full h-10 px-3 pr-3 pl-12 rounded-xl bg-surface-lowest border border-outline-variant/30 text-on-surface font-mono font-bold text-xs focus:outline-none focus:border-primary"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-on-surface-variant pointer-events-none">
                          {subUnitName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface-lowest border border-outline-variant/20 flex items-center justify-between text-xs font-bold text-on-surface">
                    <span className="text-on-surface-variant text-[11px]">الرصيد الإجمالي المحسوب:</span>
                    <span className="font-mono font-black text-amber-800">
                      {openingQty || 0} كرتونة
                      {piecesPerCarton > 0 && Number(openingQty) > 0 && (
                        <span className="text-primary text-[11px] mr-1">
                          ({Math.round(Number(openingQty) * piecesPerCarton)} {subUnitName})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={openingQty}
                    onChange={(e) => {
                      setOpeningQty(e.target.value)
                      syncBreakdown(e.target.value)
                    }}
                    placeholder="أدخل كمية أول المدة..."
                    required
                    className="w-full h-11 px-4 rounded-2xl bg-surface-lowest border border-outline-variant/30 text-on-surface font-mono font-bold text-sm focus:outline-none focus:border-primary"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant pointer-events-none">
                    {baseUnit}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-black text-on-surface mb-2 flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-primary" />
                أرصدة الصنف في كافة المخازن:
              </h4>
              <div className="border border-surface-container rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-surface-container-low/60 text-on-surface-variant font-black h-9 border-b border-surface-container">
                      <th className="px-3">المخزن</th>
                      <th className="px-3 text-center">رصيد أول المدة</th>
                      <th className="px-3 text-center">تاريخ البداية</th>
                      <th className="px-3 text-center">الرصيد الفعلي الحالي</th>
                      <th className="px-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container font-bold">
                    {stockRows.map((r) => (
                      <tr
                        key={r.warehouseId}
                        className={`h-10 hover:bg-surface-container-low/40 ${
                          r.warehouseId === selectedWarehouseId ? 'bg-primary/5' : ''
                        }`}
                      >
                        <td className="px-3 font-black text-on-surface">{r.warehouseName}</td>
                        <td className="px-3 text-center font-mono text-amber-800 font-black">
                          {r.openingBalance} {r.unit}
                        </td>
                        <td className="px-3 text-center font-mono text-on-surface-variant text-[11px]">
                          {r.openingDate}
                        </td>
                        <td className="px-3 text-center font-mono font-black">
                          <span className={r.currentStock < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                            {r.currentStock} {r.unit}
                          </span>
                        </td>
                        <td className="px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleSelectWarehouse(r.warehouseId)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-black bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                          >
                            تعديل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </form>

          <div className="p-3 border-t border-surface-container flex items-center justify-end gap-2 bg-surface-container-lowest shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full border border-outline-variant/40 text-on-surface-variant text-xs font-black hover:bg-surface-container transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleStage2Submit}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>متابعة التعديل</span>
            </button>
          </div>
        </div>
      </div>

      <AX_ConfirmModal
        isOpen={isOpen && workflowStep === 'confirm_final'}
        title="تأكيد نهائي لتعديل الرصيد"
        message={`هل أنت متأكد؟ سيتم اعتماد رصيد أول المدة الجديد (${openingQty} ${activeUnit}) لمخزن "${activeWarehouseName}".`}
        confirmText="تأكيد أخير"
        cancelText="تراجع"
        onConfirm={handleFinalExecution}
        onCancel={() => setWorkflowStep('warehouse_form')}
      />
    </>
  )
}

export default AX_ItemOpeningBalanceModal
