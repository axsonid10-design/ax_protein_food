import React from 'react'
import { FolderTree, Settings2, AlertCircle } from 'lucide-react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { expenseCategoryHelpers } from '../../store/expenseCategoryHelpers'

export function AX_ExpenseCategoryHierarchySelect({
  categories = [],
  mainId = '',
  subId = '',
  secondaryId = '',
  onChange,
  onManageClick,
}) {
  const mainCategories = expenseCategoryHelpers.getMainCategories(categories)
  const subCategories = mainId ? expenseCategoryHelpers.getSubCategories(categories, mainId) : []
  const secondaryCategories = subId ? expenseCategoryHelpers.getSecondaryCategories(categories, subId) : []

  const handleMainChange = (val) => {
    if (!onChange) return
    onChange({ mainId: val, subId: '', secondaryId: '' })
  }

  const handleSubChange = (val) => {
    if (!onChange) return
    onChange({ mainId, subId: val, secondaryId: '' })
  }

  const handleSecondaryChange = (val) => {
    if (!onChange) return
    onChange({ mainId, subId, secondaryId: val })
  }

  const isComplete = Boolean(mainId && subId && secondaryId)

  return (
    <div className="space-y-3 p-3.5 rounded-2xl bg-surface-low border border-outline-variant/30 text-right">
      <div className="flex items-center justify-between pb-2 border-b border-surface-container">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
            <FolderTree className="w-4 h-4" />
          </span>
          <span className="text-xs font-black text-on-surface">شجرة بنود المصروفات (3 مستويات) *</span>
        </div>
        {onManageClick && (
          <button
            type="button"
            onClick={onManageClick}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-lowest hover:bg-surface-container border border-outline-variant/40 text-[11px] font-bold text-primary transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>إدارة بنود المصروفات</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <label className="block text-[11px] font-bold text-on-surface-variant mb-1">القسم الرئيسي *</label>
          <AX_SearchableSelect
            value={mainId}
            onChange={handleMainChange}
            options={mainCategories.map((c) => ({
              value: c.id,
              label: c.name,
              badge: c.code || undefined,
            }))}
            placeholder="اختر القسم الرئيسي..."
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-on-surface-variant mb-1">القسم الفرعي *</label>
          <AX_SearchableSelect
            value={subId}
            onChange={handleSubChange}
            disabled={!mainId}
            options={subCategories.map((c) => ({
              value: c.id,
              label: c.name,
              badge: c.code || undefined,
            }))}
            placeholder={mainId ? 'اختر القسم الفرعي...' : 'اختر الرئيسي أولاً'}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-on-surface-variant mb-1">القسم الثانوي *</label>
          <AX_SearchableSelect
            value={secondaryId}
            onChange={handleSecondaryChange}
            disabled={!subId}
            options={secondaryCategories.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            placeholder={subId ? 'اختر القسم الثانوي...' : 'اختر الفرعي أولاً'}
          />
        </div>
      </div>

      {!isComplete ? (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>يرجى اختيار القسم الرئيسي والفرعي والثانوي لتفعيل إدخال المبلغ والملاحظات</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
          <FolderTree className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>
            البند المحدد: {expenseCategoryHelpers.getHierarchyPath(categories, secondaryId).label}
          </span>
        </div>
      )}
    </div>
  )
}
