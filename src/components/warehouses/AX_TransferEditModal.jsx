import React, { useMemo } from 'react'
import { X, Save, Plus, Trash2, Package } from 'lucide-react'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'

export function AX_TransferEditModal({
  transfer,
  warehouses = [],
  items = [],
  getItem,
  editDate,
  setEditDate,
  editFromId,
  setEditFromId,
  editToId,
  setEditToId,
  editNotes,
  setEditNotes,
  editItems = [],
  setEditItems,
  isProcessing,
  onSave,
  onClose,
}) {
  if (!transfer) return null

  const itemOptions = useMemo(() => {
    return (items || []).map((it) => ({
      value: it.id,
      label: it.compositeName || it.name,
      sublabel: `${it.code || 'صنف'} • ${it.unitType || 'كرتونة'}`,
    }))
  }, [items])

  const handleItemChange = (index, newItemId) => {
    const itObj = (items || []).find((c) => c.id === newItemId) || (getItem ? getItem(newItemId) : {})
    const updated = [...editItems]
    updated[index] = {
      ...updated[index],
      itemId: newItemId,
      name: itObj?.compositeName || itObj?.name || 'صنف',
      unit: updated[index]?.unit || itObj?.unitType || 'كرتونة',
    }
    setEditItems(updated)
  }

  const handleQuantityChange = (index, val) => {
    const updated = [...editItems]
    updated[index] = { ...updated[index], quantity: Math.max(0, Number(val) || 0) }
    setEditItems(updated)
  }

  const handleUnitChange = (index, unit) => {
    const updated = [...editItems]
    updated[index] = { ...updated[index], unit }
    setEditItems(updated)
  }

  const handleAddRow = () => {
    setEditItems([
      ...editItems,
      { itemId: '', name: '', quantity: 1, unit: 'كرتونة' },
    ])
  }

  const handleRemoveRow = (index) => {
    const updated = editItems.filter((_, idx) => idx !== index)
    setEditItems(updated)
  }

  const getAvailableUnits = (itemId) => {
    const it = (items || []).find((c) => c.id === itemId) || (getItem ? getItem(itemId) : {})
    const set = new Set(['كرتونة'])
    if (it?.unitType) set.add(it.unitType)
    if (it?.unit_type) set.add(it.unit_type)
    if (it?.subUnitType) set.add(it.subUnitType)
    if (it?.sub_unit_type) set.add(it.sub_unit_type)
    set.add('طبق')
    set.add('قطعة')
    set.add('كيس')
    set.add('كيلو')
    return Array.from(set).filter(Boolean)
  }

  const hasValidItems = editItems.some((it) => it.itemId && Number(it.quantity) > 0)
  const isFormValid = editDate && editFromId && editToId && editFromId !== editToId && hasValidItems

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-surface rounded-3xl shadow-level3 border border-outline-variant/40 flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-container shrink-0 bg-surface-low/30">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <Package className="w-4 h-4" />
            </span>
            <span className="font-black text-sm text-on-surface">
              تعديل إذن التحويل [{transfer.code}]
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-high flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-on-surface mb-1.5">مخزن الإرسال:</label>
              <AX_SearchableSelect
                options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                value={editFromId}
                onChange={setEditFromId}
                placeholder="اختر مخزن الإرسال..."
              />
            </div>
            <div>
              <label className="block text-xs font-black text-on-surface mb-1.5">مخزن الاستلام:</label>
              <AX_SearchableSelect
                options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                value={editToId}
                onChange={setEditToId}
                placeholder="اختر مخزن الاستلام..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-on-surface mb-1.5">تاريخ التحويل:</label>
            <AX_CompanyDatePicker
              value={editDate}
              onChange={setEditDate}
              placeholder="اختر تاريخ التحويل..."
            />
          </div>

          <div>
            <label className="block text-xs font-black text-on-surface mb-1.5">ملاحظات:</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
              placeholder="ملاحظات الإذن (اختياري)..."
              className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs text-on-surface font-bold outline-none resize-none focus:border-primary/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-black text-on-surface">الأصناف والكميات المحولة:</label>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-bold">
                  {editItems.length} صنف
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 text-xs font-black cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة صنف</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {editItems.map((item, idx) => {
                const availableUnits = getAvailableUnits(item.itemId)
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl border border-outline-variant/30 bg-surface-lowest hover:border-outline-variant/60 transition-all space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <AX_SearchableSelect
                          options={itemOptions}
                          value={item.itemId}
                          onChange={(val) => handleItemChange(idx, val)}
                          placeholder="اختر الصنف..."
                        />
                      </div>
                      <div className="w-24 shrink-0">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity === 0 ? '' : item.quantity}
                          placeholder="الكمية"
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          className="w-full h-10 text-center rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-mono font-black text-primary outline-none focus:border-primary/60 px-2"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="w-9 h-9 rounded-2xl bg-error/10 hover:bg-error/20 text-error flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                        title="حذف البند"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-surface-container/40">
                      <span className="text-[11px] font-bold text-on-surface-variant ml-1">نوع العبوة:</span>
                      {availableUnits.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => handleUnitChange(idx, u)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                            item.unit === u
                              ? 'bg-primary text-white shadow-sm ring-1 ring-primary/40'
                              : 'bg-surface-low border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

              {editItems.length === 0 && (
                <div className="p-6 text-center rounded-2xl border border-dashed border-outline-variant/50 text-on-surface-variant text-xs font-bold">
                  لا توجد أصناف في هذا الإذن. انقر على &quot;إضافة صنف&quot; لإضافة بنود التحويل.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-surface-container shrink-0 bg-surface-low/30">
          <span className="text-[11px] font-bold text-on-surface-variant">
            {editFromId === editToId && editFromId ? '⚠️ لا يمكن التحويل لنفس المخزن' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-bold text-xs cursor-pointer hover:bg-surface-high transition-colors"
            >
              تراجع
            </button>
            <button
              type="button"
              disabled={isProcessing || !isFormValid}
              onClick={onSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary text-white font-black text-xs hover:bg-primary-dark cursor-pointer disabled:opacity-40 transition-all active:scale-95 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {isProcessing ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AX_TransferEditModal
