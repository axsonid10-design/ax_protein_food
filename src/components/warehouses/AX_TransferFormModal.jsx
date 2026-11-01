import React, { useState } from 'react'
import { ArrowLeftRight, Plus, Trash2, X, Check } from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { generateUUID } from '../../utils/AX_UUID'

export function AX_TransferFormModal({ isOpen, onClose }) {
  useBodyScrollLock(isOpen)

  const warehouses = useAXStore((state) => state.warehouses) || []
  const items = useAXStore((state) => state.items) || []
  const addTransfer = useAXStore((state) => state.addTransfer)

  const allDestinations = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type === 'van' ? 'distributor' : 'warehouse',
    badge: w.type === 'van' ? 'سيارة توزيع' : w.type === 'main' ? 'رئيسي' : w.type === 'cold_store' ? 'تجميد' : 'فرع',
    manager: w.manager || '',
  }))

  const [fromId, setFromId] = useState(warehouses[0]?.id || '')
  const [toId, setToId] = useState(warehouses[1]?.id || '')
  const [transferItems, setTransferItems] = useState([
    { itemId: items[0]?.id || '', quantity: '', unit: 'كرتونة' },
  ])
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const handleAddItemRow = () => {
    setTransferItems([...transferItems, { itemId: items[0]?.id || '', quantity: '', unit: 'كرتونة' }])
  }

  const handleRemoveRow = (idx) => {
    if (transferItems.length <= 1) return
    setTransferItems(transferItems.filter((_, i) => i !== idx))
  }

  const handleRowChange = (idx, field, value) => {
    const updated = [...transferItems]
    updated[idx] = { ...updated[idx], [field]: value }
    if (field === 'itemId') {
      const selectedItem = items.find((it) => it.id === value)
      if (selectedItem) {
        updated[idx].unit = selectedItem.unitType || 'كرتونة'
      }
    }
    setTransferItems(updated)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (fromId === toId) return

    const validItems = transferItems
      .filter((it) => Number(it.quantity) > 0)
      .map((it) => ({
        itemId: it.itemId,
        quantity: Number(it.quantity),
        unit: it.unit,
      }))

    if (validItems.length === 0) return

    const fromObj = allDestinations.find((d) => d.id === fromId)
    const toObj = allDestinations.find((d) => d.id === toId)

    const generatedId = generateUUID()

    const newTransfer = {
      id: generatedId,
      code: `TRF-${Date.now().toString().slice(-5)}`,
      fromId,
      fromType: fromObj?.type || 'warehouse',
      fromName: fromObj?.name || fromId,
      toId,
      toType: toObj?.type || 'warehouse',
      toName: toObj?.name || toId,
      items: validItems,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      confirmedAt: null,
      notes: notes.trim(),
    }

    addTransfer(newTransfer)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-level3 space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-primary/10 text-primary">
              <ArrowLeftRight className="w-5 h-5" />
            </span>
            <h3 className="text-base font-black text-on-surface">إنشاء إذن تحويل مخزني</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-30">
            <div className="relative z-20">
              <label className="block text-xs font-black text-on-surface mb-1">المحول منه</label>
              <AX_SearchableSelect
                value={fromId}
                onChange={setFromId}
                options={allDestinations.map((d) => ({
                  value: d.id,
                  label: d.name,
                  badge: d.type === 'warehouse' ? 'مخزن' : 'موزع',
                }))}
                placeholder="اختر الجهة المحول منها..."
              />
            </div>

            <div className="relative z-10">
              <label className="block text-xs font-black text-on-surface mb-1">المستلم</label>
              <AX_SearchableSelect
                value={toId}
                onChange={setToId}
                options={allDestinations
                  .filter((d) => d.id !== fromId)
                  .map((d) => ({
                    value: d.id,
                    label: d.name,
                    badge: d.type === 'warehouse' ? 'مخزن' : 'موزع',
                  }))}
                placeholder="اختر المستلم..."
              />
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-surface-container relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-on-surface">الأصناف المراد تحويلها</span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black hover:bg-primary/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة صنف آخر</span>
              </button>
            </div>

            <div className="space-y-2 p-1 overflow-visible">
              {transferItems.map((row, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-2xl bg-surface-low border border-outline-variant/30 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 relative"
                  style={{ zIndex: transferItems.length - idx }}
                >
                  <div className="flex-1 min-w-0">
                    <AX_SearchableSelect
                      value={row.itemId}
                      onChange={(val) => handleRowChange(idx, 'itemId', val)}
                      options={items.map((it) => ({
                        value: it.id,
                        label: it.compositeName,
                        sublabel: `${it.primaryCategory} • ${it.unitType}`,
                      }))}
                      placeholder="اختر الصنف..."
                    />
                  </div>

                  <div className="w-24 shrink-0">
                    <input
                      type="number"
                      min="1"
                      placeholder="الكمية"
                      value={row.quantity}
                      onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-on-surface text-xs font-bold text-center focus:border-primary focus:outline-none font-mono"
                      required
                    />
                  </div>

                  <div className="flex gap-1 shrink-0">
                    {['كرتونة', 'كيلو', 'قطعة'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => handleRowChange(idx, 'unit', u)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all ${
                          row.unit === u
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-surface-lowest border border-outline-variant/30 text-on-surface-variant'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>

                  {transferItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors self-end sm:self-center cursor-pointer"
                      title="حذف البند"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-on-surface mb-1">ملاحظات التحويل</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="سبب التحويل أو رقم البوليصة..."
              className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-on-surface text-xs font-bold focus:border-primary focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-outline-variant/60 text-on-surface text-xs font-bold hover:bg-surface-container"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              إصدار إذن التحويل
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AX_TransferFormModal
