import React from 'react'
import { Warehouse, Edit3, Trash2 } from 'lucide-react'

const getWarehouseTypeLabel = (type) => ({
  cold_store: 'تجميد وحفظ',
  raw_materials: 'خامات وتوريد',
  processing: 'تقطيع وتجهيز',
  finished_goods: 'مصنعات وتعبئة',
  van: 'سيارة توزيع',
  branch: 'فرع مبيعات',
  main: 'رئيسي',
}[type] || type || 'مخزن')

export function AX_WarehouseBentoCard({
  warehouse,
  isSelected,
  onSelect,
  whStock = [],
  getItem,
  onEdit,
  onDelete,
}) {
  const totalValuation = whStock.reduce(
    (acc, s) =>
      acc +
      (Number(s.quantity) || 0) *
        (Number(getItem?.(s.itemId)?.sellPrice ?? getItem?.(s.itemId)?.buyPrice ?? 0)),
    0
  )

  return (
    <div
      onClick={onSelect}
      className={`bg-surface-lowest border-2 rounded-3xl p-4 shadow-sm transition-all cursor-pointer flex flex-col justify-between gap-3 ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
          : 'border-outline-variant/30 hover:border-primary/50 hover:bg-surface-low'
      }`}
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-2xl bg-secondary/10 text-secondary">
            <Warehouse className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-surface-low text-on-surface-variant text-[10px] font-bold border border-outline-variant/30">
              {getWarehouseTypeLabel(warehouse.type)}
            </span>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(warehouse)
                }}
                className="p-1 rounded-full hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                title="تعديل بيانات المخزن"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(warehouse)
                }}
                className="p-1 rounded-full hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                title="حذف المخزن"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <h3 className="font-black text-sm text-on-surface pt-1">{warehouse.name}</h3>
        <span className="text-[11px] text-on-surface-variant font-bold block">
          المسؤول: {warehouse.manager}
        </span>
      </div>

      <div className="pt-2 border-t border-surface-container flex items-center justify-between text-xs">
        <span className="text-on-surface-variant font-bold">قيمة البيع:</span>
        <span className="font-mono font-black text-primary">
          {totalValuation.toLocaleString('en-US')} ج.م
        </span>
      </div>
    </div>
  )
}

export default AX_WarehouseBentoCard
