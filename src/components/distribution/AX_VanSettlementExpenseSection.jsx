import React, { useState, useMemo } from 'react'
import { Fuel, Plus, Trash2, Check, Sparkles } from 'lucide-react'

export function AX_VanSettlementExpenseSection({
  expenseRows = [],
  onAddRow,
  onRemoveRow,
  onChangeRow,
  onAddNewCategory,
  totalExpenses = 0,
  expenseCategories = [],
}) {
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const availableCategories = useMemo(() => {
    const list = Array.isArray(expenseCategories) ? expenseCategories : []
    const secondaryCats = list.filter((c) => c && c.level === 'secondary' && !c.isDeleted)
    if (secondaryCats.length > 0) {
      return secondaryCats
    }
    return [
      { id: 'exp-sec-trn-fuel', name: 'وقود وسولار سيارات التوزيع' },
      { id: 'exp-sec-trn-tolls', name: 'رسوم طرق وكارتات ومواقف' },
      { id: 'exp-sec-trn-porter', name: 'مشالات وعتالة نقل وتنزيل' },
      { id: 'exp-sec-mnt-vans', name: 'صيانة ميكانيكا سيارات التبريد' },
    ]
  }, [expenseCategories])

  const handleCreateCategory = (e) => {
    e?.preventDefault?.()
    const trimmed = String(newCategoryName || '').trim()
    if (!trimmed) return
    if (typeof onAddNewCategory === 'function') {
      const created = onAddNewCategory(trimmed)
      if (created?.id) {
        onAddRow(created.id, created.name)
      }
    }
    setNewCategoryName('')
    setIsAddingNewCategory(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-on-surface flex items-center gap-1.5">
          <Fuel className="w-4 h-4 text-primary" />
          المصاريف التشغيلية للمندوب (سولار، كارتات، صيانة، مشالات)
        </span>
        <div className="flex items-center gap-2">
          {!isAddingNewCategory ? (
            <button
              type="button"
              onClick={() => setIsAddingNewCategory(true)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container/30 hover:bg-secondary-container/60 text-secondary text-xs font-bold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ بند جديد عام</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onAddRow(availableCategories[0]?.id, availableCategories[0]?.name)}
            className="inline-flex items-center gap-1 px-3.5 py-1 rounded-full bg-surface-low hover:bg-surface-container text-primary text-xs font-black transition-all cursor-pointer border border-outline-variant/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة مصروف</span>
          </button>
        </div>
      </div>

      {isAddingNewCategory && (
        <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center gap-2 animate-in fade-in">
          <span className="text-xs font-black text-primary shrink-0">اسم البند الجديد:</span>
          <input
            type="text"
            placeholder="مثال: غسيل وتشحيم سيارات التوزيع..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleCreateCategory()
              }
            }}
            className="w-full sm:flex-1 px-3 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
            autoFocus
          />
          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black cursor-pointer disabled:opacity-40 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>حفظ وتثبيت</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingNewCategory(false)
                setNewCategoryName('')
              }}
              className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {expenseRows.length === 0 ? (
        <div className="p-3.5 rounded-2xl bg-surface-low/50 border border-outline-variant/20 text-center text-xs font-bold text-on-surface-variant">
          لم يتم تسجيل أي مصاريف تشغيلية خلال جولة اليوم.
        </div>
      ) : (
        <div className="space-y-2">
          {expenseRows.map((row) => (
            <div
              key={row.id}
              className="p-2.5 rounded-2xl bg-surface-low border border-outline-variant/20 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
            >
              <div className="w-full sm:w-1/3">
                <select
                  value={row.categoryId}
                  onChange={(e) => {
                    const selected = availableCategories.find((c) => c.id === e.target.value)
                    onChangeRow(row.id, 'categoryId', e.target.value, selected?.name)
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-black text-on-surface focus:outline-none focus:border-primary"
                >
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-28">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="المبلغ (ج.م)"
                  value={row.amount}
                  onChange={(e) => onChangeRow(row.id, 'amount', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-mono font-black text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="w-full sm:w-36">
                <select
                  value={row.paymentMethod || 'van_custody'}
                  onChange={(e) => onChangeRow(row.id, 'paymentMethod', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-[11px] font-bold text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="van_custody">عهدة السيارة (كاش)</option>
                  <option value="driver_personal">من جيب المندوب</option>
                  <option value="transfer">تحويل بنكي / إنستاباي</option>
                </select>
              </div>

              <div className="w-full sm:flex-1">
                <input
                  type="text"
                  placeholder="بيان وملاحظة تفصيلية..."
                  value={row.notes}
                  onChange={(e) => onChangeRow(row.id, 'notes', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="button"
                onClick={() => onRemoveRow(row.id)}
                className="self-end sm:self-center p-1.5 rounded-full hover:bg-error/10 text-error flex justify-center items-center cursor-pointer transition-all shrink-0"
                title="حذف البند"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-surface-low border border-outline-variant/20 text-xs font-bold">
            <span className="text-on-surface-variant">إجمالي المصاريف المسجلة:</span>
            <span className="font-mono font-black text-error">-{totalExpenses.toLocaleString('en-US')} ج.م</span>
          </div>
        </div>
      )}
    </div>
  )
}
