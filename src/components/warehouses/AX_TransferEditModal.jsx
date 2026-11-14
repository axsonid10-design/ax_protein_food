import React from 'react'
import { X, Save } from 'lucide-react'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'

export function AX_TransferEditModal({
  transfer,
  warehouses = [],
  getItem,
  editDate,
  setEditDate,
  editFromId,
  setEditFromId,
  editToId,
  setEditToId,
  editNotes,
  setEditNotes,
  editItems,
  setEditItems,
  isProcessing,
  onSave,
  onClose,
}) {
  if (!transfer) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface rounded-3xl shadow-level3 border border-outline-variant/40 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-container shrink-0">
          <span className="font-black text-sm text-on-surface">
            تعديل إذن التحويل [{transfer.code}]
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-high flex items-center justify-center cursor-pointer"
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
            <label className="block text-xs font-black text-on-surface mb-2">الأصناف والكميات:</label>
            <div className="rounded-2xl border border-outline-variant/30 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-surface-low border-b border-surface-container text-on-surface-variant font-black h-8 text-[11px]">
                    <th className="px-3">الصنف</th>
                    <th className="px-3 text-center w-28">الكمية</th>
                    <th className="px-3 text-center w-20">الوحدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container/40">
                  {editItems.map((item, idx) => {
                    const itObj = getItem ? getItem(item.itemId) : {}
                    const itName = item.name || item.itemName || itObj?.compositeName || itObj?.name || 'صنف'
                    const unit = item.unit || itObj?.unitType || 'كرتونة'
                    return (
                      <tr key={item.itemId || idx} className="h-10 hover:bg-surface-low/30">
                        <td className="px-3 font-black text-on-surface truncate max-w-[180px]">{itName}</td>
                        <td className="px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editItems[idx].quantity}
                            onChange={(e) => {
                              const updated = [...editItems]
                              updated[idx] = { ...updated[idx], quantity: Number(e.target.value) || 0 }
                              setEditItems(updated)
                            }}
                            className="w-20 h-7 text-center rounded-full bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-black text-primary outline-none focus:border-primary/60 px-2"
                          />
                        </td>
                        <td className="px-3 text-center text-on-surface-variant text-[11px] font-bold">{unit}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-surface-container shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-bold text-xs cursor-pointer"
          >
            تراجع
          </button>
          <button
            type="button"
            disabled={isProcessing || !editDate || !editFromId || !editToId}
            onClick={onSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary text-white font-black text-xs hover:bg-primary-dark cursor-pointer disabled:opacity-50 transition-all active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            {isProcessing ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AX_TransferEditModal
