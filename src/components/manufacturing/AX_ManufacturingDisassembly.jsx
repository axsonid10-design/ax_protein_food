import React, { useState, useEffect } from 'react'
import {
  Factory,
  Scissors,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Layers,
  ArrowDownCircle,
  ArrowUpCircle,
  FileSpreadsheet,
  AlertCircle,
  Check,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { axToast } from '../common/AX_Toast'
import { generateUUID } from '../../utils/AX_UUID'

export function AX_ManufacturingDisassembly() {
  const {
    items = [],
    warehouses = [],
    manufacturingOrders = [],
    addManufacturingOrder,
    updateManufacturingOrder,
    deleteManufacturingOrder,
    profile,
  } = useAXStore()

  const [isCreating, setIsCreating] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [deletingOrder, setDeletingOrder] = useState(null)

  const [rawItemId, setRawItemId] = useState(() => items[0]?.id || '')
  const [rawWarehouseId, setRawWarehouseId] = useState(() => warehouses[0]?.id || '')
  const [consumedQuantity, setConsumedQuantity] = useState(10)
  const [consumedUnit, setConsumedUnit] = useState('كرتونة')
  const [notes, setNotes] = useState('')

  const [producedItems, setProducedItems] = useState(() => {
    const defaultItem = items[1]?.id || items[0]?.id || ''
    const defaultWh = warehouses[0]?.id || ''
    return defaultItem ? [{ itemId: defaultItem, quantity: 10, unit: 'كيلو', targetWarehouseId: defaultWh }] : []
  })

  useEffect(() => {
    if (!rawItemId && items.length > 0) {
      setRawItemId(items[0].id)
      setConsumedUnit(items[0].unitType || 'كرتونة')
    }
    if (!rawWarehouseId && warehouses.length > 0) {
      setRawWarehouseId(warehouses[0].id)
    }
    if (producedItems.length === 0 && items.length > 0 && warehouses.length > 0) {
      setProducedItems([
        { itemId: items[1]?.id || items[0].id, quantity: 10, unit: 'كيلو', targetWarehouseId: warehouses[0].id },
      ])
    }
  }, [items, warehouses])

  const getItemName = (id) => (items || []).find((i) => i.id === id)?.compositeName || id
  const getWarehouseName = (id) => (warehouses || []).find((w) => w.id === id)?.name || id

  const handleAddProducedRow = () => {
    setProducedItems([
      ...producedItems,
      { itemId: (items || [])[0]?.id || '', quantity: 10, unit: 'كيلو', targetWarehouseId: (warehouses || [])[0]?.id || '' },
    ])
  }

  const handleRemoveProducedRow = (index) => {
    setProducedItems(producedItems.filter((_, i) => i !== index))
  }

  const handleProducedChange = (index, field, value) => {
    const updated = [...producedItems]
    updated[index] = { ...updated[index], [field]: value }
    setProducedItems(updated)
  }

  const handleStartEdit = (order) => {
    setEditingOrder(order)
    setRawItemId(order.rawItemId)
    setRawWarehouseId(order.rawWarehouseId)
    setConsumedQuantity(order.consumedQuantity)
    setConsumedUnit(order.consumedUnit || 'كرتونة')
    setNotes(order.notes || '')
    setProducedItems(
      order.producedItems && order.producedItems.length > 0
        ? order.producedItems.map((p) => ({ ...p }))
        : [{ itemId: items[0]?.id || '', quantity: 10, unit: 'كيلو', targetWarehouseId: warehouses[0]?.id || '' }]
    )
    setIsCreating(true)
  }

  const handleCancelForm = () => {
    setIsCreating(false)
    setEditingOrder(null)
  }

  const handleSubmitOrder = (e) => {
    e.preventDefault()
    if (consumedQuantity <= 0 || producedItems.length === 0) return

    if (editingOrder) {
      const updatedOrder = {
        ...editingOrder,
        rawItemId,
        rawWarehouseId,
        consumedQuantity: Number(consumedQuantity),
        consumedUnit,
        producedItems: producedItems.map((p) => ({
          ...p,
          quantity: Number(p.quantity),
        })),
        notes: notes || 'أمر تشغيل وتفكيك قياسي',
      }
      updateManufacturingOrder(updatedOrder)
      axToast.success('تم حفظ تعديلات إذن التشغيل بنجاح')
    } else {
      const newOrder = {
        id: generateUUID(),
        code: `MFG-${Date.now().toString().slice(-5)}`,
        date: new Date().toISOString().split('T')[0],
        rawItemId,
        rawWarehouseId,
        consumedQuantity: Number(consumedQuantity),
        consumedUnit,
        producedItems: producedItems.map((p) => ({
          ...p,
          quantity: Number(p.quantity),
        })),
        wastePercentage: 1.8,
        status: 'completed',
        operator: 'مشرف خط التقطيع والتصنيع',
        notes: notes || 'أمر تشغيل وتفكيك قياسي',
      }
      addManufacturingOrder(newOrder)
      axToast.success('تم اعتماد إذن التشغيل والتفكيك بنجاح')
    }

    setIsCreating(false)
    setEditingOrder(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-on-surface-variant">
          أوامر التشغيل: {(manufacturingOrders || []).length} أمر
        </span>

        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-black shadow-level1 hover:bg-primary-dark transition-all active:scale-95 cursor-pointer"
        >
          <Scissors className="w-4 h-4" />
          <span>{isCreating ? 'إغلاق التشغيل' : 'إذن تشغيل وتفكيك جديد'}</span>
        </button>
      </div>

      {isCreating && (
        <form
          onSubmit={handleSubmitOrder}
          className="bg-surface-lowest border-2 border-primary/20 rounded-3xl p-6 shadow-level2 space-y-6 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-surface-container pb-3">
            <span className="text-sm font-black text-on-surface flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary" />
              {editingOrder ? 'تعديل إذن تشغيل وتفكيك' : 'إذن تشغيل وتفكيك جديد'}
            </span>
          </div>

          <div className="bg-surface-low rounded-2xl p-4 border border-outline-variant/30 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-error">
              <ArrowDownCircle className="w-4 h-4" />
              الخام المستهلك (يتم خصمه من الرصيد):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-30">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant block">مخزن سحب الخام:</label>
                <AX_SearchableSelect
                  value={rawWarehouseId}
                  onChange={setRawWarehouseId}
                  options={(warehouses || []).map((w) => ({
                    value: w.id,
                    label: w.name,
                    badge: w.type === 'cold_store' ? 'تجميد' : w.type === 'raw_materials' ? 'خامات' : 'فرع',
                  }))}
                  placeholder="اختر مخزن السحب..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant block">الصنف الخام المستهلك:</label>
                <AX_SearchableSelect
                  value={rawItemId}
                  onChange={(val) => {
                    setRawItemId(val)
                    const selected = (items || []).find((it) => it.id === val)
                    if (selected) setConsumedUnit(selected.unitType || 'كرتونة')
                  }}
                  options={(items || []).map((it) => ({
                    value: it.id,
                    label: it.compositeName,
                    badge: it.primaryCategory,
                  }))}
                  placeholder="اختر الصنف الخام..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant block">الكمية المستهلكة ({consumedUnit}):</label>
                <div className="flex gap-1.5 items-center">
                  <input
                    type="number"
                    required
                    min="1"
                    value={consumedQuantity}
                    onChange={(e) => setConsumedQuantity(e.target.value)}
                    className="w-full h-10 px-3 rounded-2xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface outline-none focus:border-primary"
                  />
                  <div className="flex gap-1 shrink-0">
                    {['كرتونة', 'كيلو'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setConsumedUnit(u)}
                        className={`px-2.5 py-2 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                          consumedUnit === u
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-surface-lowest border border-outline-variant/30 text-on-surface'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-low rounded-2xl p-4 border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-primary">
                <ArrowUpCircle className="w-4 h-4" />
                المخرجات الناتجة (يتم إضافتها لمخازن التام والمجزءات):
              </div>
              <button
                type="button"
                onClick={handleAddProducedRow}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold hover:bg-primary/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة صنف ناتج</span>
              </button>
            </div>

            <div className="space-y-2">
              {producedItems.map((prod, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-surface-lowest p-3 rounded-2xl border border-outline-variant/30 items-center relative"
                  style={{ zIndex: producedItems.length - idx }}
                >
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant block mb-1">الصنف الناتج</label>
                    <AX_SearchableSelect
                      value={prod.itemId}
                      onChange={(val) => handleProducedChange(idx, 'itemId', val)}
                      options={(items || []).map((it) => ({
                        value: it.id,
                        label: it.compositeName,
                        sublabel: `${it.primaryCategory} • ${it.unitType}`,
                      }))}
                      placeholder="اختر الصنف..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant block mb-1">الكمية والوحدة</label>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="number"
                        min="1"
                        value={prod.quantity}
                        onChange={(e) => handleProducedChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2.5 py-2.5 rounded-2xl bg-surface-low text-xs font-bold text-on-surface border border-outline-variant/30 font-mono"
                      />
                      <div className="flex gap-1 shrink-0">
                        {['كيلو', 'كرتونة', 'قطعة'].map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => handleProducedChange(idx, 'unit', u)}
                            className={`px-2 py-1 rounded-xl text-[10px] font-black transition-all ${
                              prod.unit === u
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-surface-low text-on-surface border border-outline-variant/30'
                            }`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant block mb-1">المخزن المستلم</label>
                    <AX_SearchableSelect
                      value={prod.targetWarehouseId}
                      onChange={(val) => handleProducedChange(idx, 'targetWarehouseId', val)}
                      options={(warehouses || []).map((w) => ({
                        value: w.id,
                        label: w.name,
                      }))}
                      placeholder="اختر المخزن..."
                    />
                  </div>

                  <div className="flex items-center justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => handleRemoveProducedRow(idx)}
                      disabled={producedItems.length <= 1}
                      className="p-1.5 rounded-full text-error hover:bg-error-container/40 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancelForm}
              className="px-5 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold hover:bg-surface-high transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-primary text-white text-xs font-extrabold shadow-sm hover:bg-primary-dark transition-all cursor-pointer flex items-center gap-1.5"
            >
              {editingOrder ? <Check className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
              <span>{editingOrder ? 'حفظ التعديلات' : 'اعتماد أمر التشغيل'}</span>
            </button>
          </div>
        </form>
      )}

      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 shadow-level1 space-y-4">
        <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          سجل أوامر التشغيل
        </h3>

        <div className="space-y-3">
          {(manufacturingOrders || []).map((order) => (
            <div
              key={order.id}
              className="border border-outline-variant/30 rounded-2xl p-4 bg-surface-low/50 space-y-3"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {order.code}
                  </span>
                  <span className="text-xs text-on-surface-variant font-medium">{order.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-secondary-container text-secondary-on-container">
                    <CheckCircle2 className="w-3.5 h-3.5" /> تم التنفيذ واعتماد الأرصدة
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(order)}
                    className="p-1 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-lowest border border-outline-variant/30 transition-colors cursor-pointer"
                    title="تعديل إذن التشغيل"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingOrder(order)}
                    className="p-1 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/20 border border-outline-variant/30 transition-colors cursor-pointer"
                    title="حذف إذن التشغيل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2 border-t border-surface-container">
                <div className="space-y-1">
                  <span className="text-on-surface-variant text-[11px] block font-bold">الخام المستهلك:</span>
                  <div className="font-bold text-on-surface">
                    {getItemName(order.rawItemId)} — {order.consumedQuantity} {order.consumedUnit}
                  </div>
                  <div className="text-[11px] text-on-surface-variant">من: {getWarehouseName(order.rawWarehouseId)}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-on-surface-variant text-[11px] block font-bold">المخرجات التامة:</span>
                  <div className="space-y-1">
                    {(order.producedItems || []).map((p, pIdx) => (
                      <div key={pIdx} className="flex items-center justify-between bg-surface-lowest p-2 rounded-xl border border-outline-variant/20">
                        <div>
                          <span className="font-bold text-on-surface block">{getItemName(p.itemId)}</span>
                          <span className="text-[10px] text-on-surface-variant font-medium">
                            المستودع: {getWarehouseName(p.targetWarehouseId || order.rawWarehouseId)}
                          </span>
                        </div>
                        <span className="font-mono font-black text-primary">
                          {p.quantity} {p.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AX_ConfirmModal
        isOpen={Boolean(deletingOrder)}
        title="حذف إذن التشغيل والتفكيك"
        message={`هل أنت متأكد من حذف إذن التشغيل (${deletingOrder?.code})؟ سيتم إلغاء قيد العملية من السجلات.`}
        confirmText="تأكيد حذف الإذن"
        cancelText="إلغاء"
        isDestructive={true}
        requireHold={true}
        onConfirm={() => {
          deleteManufacturingOrder(deletingOrder.id)
          axToast.success('تم حذف إذن التشغيل بنجاح')
          setDeletingOrder(null)
        }}
        onCancel={() => setDeletingOrder(null)}
      />
    </div>
  )
}

export default AX_ManufacturingDisassembly
