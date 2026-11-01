import React, { useState } from 'react'
import {
  X,
  Plus,
  Trash2,
  Boxes,
  Warehouse,
  CheckCircle2,
  DollarSign,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { generateUUID } from '../../utils/AX_UUID'

export function AX_BulkAddItemsModal({
  isOpen,
  onClose,
  onSaveMultiple,
  categories = [],
  subCategories = {},
  warehouses = [],
}) {
  useBodyScrollLock(isOpen)
  const defaultWh = warehouses[0]?.id || ''
  const defaultCat = categories[0] || 'أسماك'

  const [rows, setRows] = useState([
    {
      tempId: 'row-1',
      primaryCategory: defaultCat,
      subCategory: '',
      secondaryCategory: '',
      invoiceName: '',
      unitType: 'كرتونة',
      openingQty: '',
      warehouseId: defaultWh,
      buyPrice: '',
      sellPrice: '',
    },
  ])

  if (!isOpen) return null

  const handleAddRow = () => {
    setRows([
      {
        tempId: `row-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        primaryCategory: defaultCat,
        subCategory: '',
        secondaryCategory: '',
        invoiceName: '',
        unitType: 'كرتونة',
        openingQty: '',
        warehouseId: defaultWh,
        buyPrice: '',
        sellPrice: '',
      },
      ...rows,
    ])
  }

  const handleUpdateRow = (tempId, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.tempId !== tempId) return r
        const updated = { ...r, [field]: value }

        if (field === 'subCategory' || field === 'secondaryCategory') {
          if (!r.invoiceName || r.invoiceName === `${r.subCategory} ${r.secondaryCategory}`.trim()) {
            const parts = [
              field === 'subCategory' ? value : r.subCategory,
              field === 'secondaryCategory' ? value : r.secondaryCategory,
            ].filter(Boolean)
            updated.invoiceName = parts.join(' ').trim()
          }
        }
        return updated
      })
    )
  }

  const handleRemoveRow = (tempId) => {
    if (rows.length === 1) return
    setRows((prev) => prev.filter((r) => r.tempId !== tempId))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const validRows = rows.filter((r) => r.invoiceName.trim() || r.subCategory.trim())
    if (validRows.length === 0) return

    const preparedList = validRows.map((r, idx) => {
      const finalName = r.invoiceName.trim() || `${r.subCategory} ${r.secondaryCategory}`.trim() || `صنف مجمع ${idx + 1}`
      const buyNum = Number(r.buyPrice) || 0
      const sellNum = Number(r.sellPrice) || 0
      const qtyNum = Number(r.openingQty) || 0

      const generatedId = generateUUID()

      const item = {
        id: generatedId,
        primaryCategory: r.primaryCategory,
        subCategory: r.subCategory || finalName,
        secondaryCategory: r.secondaryCategory || 'عادي',
        compositeName: finalName,
        unitType: r.unitType,
        units: [r.unitType],
        weightPerCarton: r.unitType === 'كرتونة' ? 10 : 1,
        buyPrice: buyNum,
        sellPrice: sellNum,
        code: `PF-${Date.now().toString().slice(-4)}-${idx + 1}`,
      }

      const openingStock =
        qtyNum > 0
          ? {
              quantity: qtyNum,
              warehouseId: r.warehouseId || defaultWh,
              unit: r.unitType,
            }
          : null

      return { item, openingStock }
    })

    onSaveMultiple(preparedList)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden overscroll-contain">
        <div className="flex items-center justify-between p-4 border-b border-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-on-surface">
                إضافة أصناف متعددة دفعة واحدة
              </h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                تسجيل سطور الأصناف، رصيد البداية، والمخازن في عملية واحدة سريعة
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 text-xs font-bold">
          <div className="flex items-center justify-between bg-surface-low p-2.5 rounded-2xl border border-outline-variant/30">
            <span className="text-xs font-black text-on-surface">
              قائمة الأصناف المراد إدراجها ({rows.length} صنف)
            </span>
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3.5 py-1.5 rounded-full bg-primary text-white text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة سطر جديد</span>
            </button>
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => {
              const profit = Math.max(0, (Number(row.sellPrice) || 0) - (Number(row.buyPrice) || 0))
              return (
                <div
                  key={row.tempId}
                  className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xs animate-in zoom-in-95"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                    <span className="text-xs font-black text-primary flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                      <span>بيانات الصنف {index + 1}:</span>
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.tempId)}
                        className="text-on-surface-variant hover:text-error p-1 rounded-full transition-all cursor-pointer"
                        title="حذف هذا السطر"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-on-surface block text-[11px]">الاسم بالفاتورة:</label>
                      <input
                        type="text"
                        required
                        placeholder="اسم الصنف المعتمد..."
                        value={row.invoiceName}
                        onChange={(e) => handleUpdateRow(row.tempId, 'invoiceName', e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-surface-low border border-outline-variant/40 focus:border-primary text-xs font-black text-on-surface outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-on-surface block text-[11px]">القسم الرئيسي:</label>
                      <AX_SearchableSelect
                        value={row.primaryCategory}
                        onChange={(val) => handleUpdateRow(row.tempId, 'primaryCategory', val)}
                        options={categories.map((c) => ({ value: c, label: c }))}
                        searchable={false}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-on-surface block text-[11px]">وحدة التعامل:</label>
                      <div className="flex gap-1 h-9 items-center">
                        {['كرتونة', 'كيلو', 'قطعة'].map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => handleUpdateRow(row.tempId, 'unitType', u)}
                            className={`flex-1 h-full rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                              row.unitType === u
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-surface-low border border-outline-variant/30 text-on-surface hover:bg-surface-lowest'
                            }`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    <div className="space-y-1">
                      <label className="text-on-surface block text-[11px]">
                        {row.unitType === 'كرتونة' && 'عدد الكراتين:'}
                        {row.unitType === 'كيلو' && 'الوزن (كجم):'}
                        {row.unitType === 'قطعة' && 'عدد القطع:'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="رصيد البداية"
                        value={row.openingQty}
                        onChange={(e) => handleUpdateRow(row.tempId, 'openingQty', e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-surface-low border border-outline-variant/40 focus:border-primary text-xs font-mono font-bold text-on-surface outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-on-surface block text-[11px]">المخزن:</label>
                      <AX_SearchableSelect
                        value={row.warehouseId}
                        onChange={(val) => handleUpdateRow(row.tempId, 'warehouseId', val)}
                        options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                        searchable={false}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-on-surface block text-[11px]">سعر الشراء:</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={row.buyPrice}
                        onChange={(e) => handleUpdateRow(row.tempId, 'buyPrice', e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-surface-low border border-outline-variant/40 focus:border-primary text-xs font-mono font-bold text-on-surface outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-on-surface block text-[11px]">سعر البيع (الربح: {profit} ج.م):</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={row.sellPrice}
                        onChange={(e) => handleUpdateRow(row.tempId, 'sellPrice', e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-surface-low border border-outline-variant/40 focus:border-primary text-xs font-mono font-bold text-on-surface outline-none"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-3 border-t border-surface-container flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-4 py-2 rounded-full border border-outline-variant/40 hover:bg-surface-low text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة سطر إضافي</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full border border-outline-variant/50 text-xs font-bold text-on-surface hover:bg-surface-low transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ كافة الأصناف ({rows.length})</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
