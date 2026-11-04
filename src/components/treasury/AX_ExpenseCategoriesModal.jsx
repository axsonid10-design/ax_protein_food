import React, { useState } from 'react'
import {
  FolderTree,
  X,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Check,
  ChevronLeft,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { expenseCategoryHelpers } from '../../store/expenseCategoryHelpers'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'

export function AX_ExpenseCategoriesModal({ isOpen, onClose }) {
  useBodyScrollLock(isOpen)

  const {
    expenseCategories = [],
    cashTransactions = [],
    addExpenseCategory,
    editExpenseCategory,
    deleteExpenseCategory,
    resetExpenseCategories,
  } = useAXStore()

  const mainCategories = expenseCategoryHelpers.getMainCategories(expenseCategories)
  const [selectedMainId, setSelectedMainId] = useState(mainCategories[0]?.id || '')

  const subCategories = selectedMainId ? expenseCategoryHelpers.getSubCategories(expenseCategories, selectedMainId) : []
  const [selectedSubId, setSelectedSubId] = useState(subCategories[0]?.id || '')

  const secondaryCategories = selectedSubId ? expenseCategoryHelpers.getSecondaryCategories(expenseCategories, selectedSubId) : []

  const activeMain = mainCategories.find((c) => c.id === selectedMainId) || mainCategories[0]
  const activeSub = subCategories.find((c) => c.id === selectedSubId) || subCategories[0]

  const [addLevel, setAddLevel] = useState(null)
  const [addName, setAddName] = useState('')
  const [addCode, setAddCode] = useState('')
  const [addParentMainId, setAddParentMainId] = useState('')
  const [addParentSubId, setAddParentSubId] = useState('')

  const [editingItem, setEditingItem] = useState(null)
  const [editName, setEditName] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)

  if (!isOpen) return null

  const handleOpenAdd = (level) => {
    setAddLevel(level)
    setAddName('')
    setAddCode('')
    setAddParentMainId(activeMain?.id || mainCategories[0]?.id || '')
    setAddParentSubId(activeSub?.id || subCategories[0]?.id || '')
  }

  const handleSaveAdd = (e) => {
    e.preventDefault()
    const name = addName.trim()
    if (!name) return

    let parentId = null
    if (addLevel === 'sub') parentId = addParentMainId || activeMain?.id
    if (addLevel === 'secondary') parentId = addParentSubId || activeSub?.id

    addExpenseCategory({
      name,
      level: addLevel,
      parentId,
      code: addCode.trim() || null,
    })

    if (addLevel === 'main') {
      const allMains = expenseCategoryHelpers.getMainCategories(expenseCategories)
      setSelectedMainId(allMains[allMains.length - 1]?.id || '')
    } else if (addLevel === 'sub') {
      setSelectedSubId(parentId)
    }

    setAddLevel(null)
    setAddName('')
    setAddCode('')
  }

  const handleStartEdit = (cat) => {
    setEditingItem(cat)
    setEditName(cat.name)
  }

  const handleSaveEdit = (e) => {
    e.preventDefault()
    if (!editingItem || !editName.trim()) return
    editExpenseCategory(editingItem.id, { name: editName.trim() })
    setEditingItem(null)
    setEditName('')
  }

  const handleDeleteClick = (cat) => {
    const childrenCount = expenseCategoryHelpers.getChildren(expenseCategories, cat.id).length
    const expenseCount = expenseCategoryHelpers.countExpensesForCategory(cashTransactions, cat.id)
    setDeleteTarget({ ...cat, childrenCount, expenseCount })
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    deleteExpenseCategory(deleteTarget.id)
    if (deleteTarget.id === selectedMainId) {
      const remaining = mainCategories.filter((m) => m.id !== deleteTarget.id)
      setSelectedMainId(remaining[0]?.id || '')
      setSelectedSubId('')
    } else if (deleteTarget.id === selectedSubId) {
      const remaining = subCategories.filter((s) => s.id !== deleteTarget.id)
      setSelectedSubId(remaining[0]?.id || '')
    }
    setDeleteTarget(null)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-4xl w-full shadow-level3 space-y-4 max-h-[92vh] flex flex-col text-right">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-primary/10 text-primary">
              <FolderTree className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-on-surface">إدارة وتكويد بنود المصروفات (3 مستويات)</h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                قسم رئيسي ← قسم فرعي ← قسم ثانوي لتتبع تكاليف سلاسل الإمداد والتجميد
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetExpenseCategories}
              title="استعادة البنود الافتراضية"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container text-[11px] font-bold text-on-surface transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الافتراضي</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-h-[360px] overflow-y-auto flex-1 p-1">
          <div className="flex flex-col bg-surface-low rounded-2xl border border-outline-variant/30 p-3 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <span className="text-xs font-black text-on-surface">1. الأقسام الرئيسية ({mainCategories.length})</span>
              <button
                type="button"
                onClick={() => handleOpenAdd('main')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-white text-[11px] font-black shadow-xs hover:bg-primary-dark transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة</span>
              </button>
            </div>
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[300px]">
              {mainCategories.map((main) => {
                const isSelected = (selectedMainId || activeMain?.id) === main.id
                return (
                  <div
                    key={main.id}
                    onClick={() => {
                      setSelectedMainId(main.id)
                      const subs = expenseCategoryHelpers.getSubCategories(expenseCategories, main.id)
                      setSelectedSubId(subs[0]?.id || '')
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-surface-lowest text-on-surface border-outline-variant/20 hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ChevronLeft className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-on-surface-variant'}`} />
                      <span className="truncate">{main.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(main)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-surface-container text-on-surface-variant'}`}
                        title="تعديل الاسم"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(main)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-error-container/20 text-error'}`}
                        title="حذف القسم"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col bg-surface-low rounded-2xl border border-outline-variant/30 p-3 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <span className="text-xs font-black text-on-surface">2. الأقسام الفرعية ({subCategories.length})</span>
              <button
                type="button"
                onClick={() => handleOpenAdd('sub')}
                disabled={!activeMain}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-white text-[11px] font-black shadow-xs hover:bg-secondary-hover transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة</span>
              </button>
            </div>
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[300px]">
              {subCategories.length === 0 ? (
                <div className="text-center py-8 text-[11px] text-on-surface-variant font-bold">لا توجد أقسام فرعية</div>
              ) : (
                subCategories.map((sub) => {
                  const isSelected = (selectedSubId || activeSub?.id) === sub.id
                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSubId(sub.id)}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-secondary text-white border-secondary shadow-xs'
                          : 'bg-surface-lowest text-on-surface border-outline-variant/20 hover:border-secondary/40'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ChevronLeft className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-on-surface-variant'}`} />
                        <span className="truncate">{sub.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(sub)}
                          className={`p-1 rounded-md transition-colors cursor-pointer ${isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-surface-container text-on-surface-variant'}`}
                          title="تعديل الاسم"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(sub)}
                          className={`p-1 rounded-md transition-colors cursor-pointer ${isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-error-container/20 text-error'}`}
                          title="حذف القسم"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex flex-col bg-surface-low rounded-2xl border border-outline-variant/30 p-3 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <span className="text-xs font-black text-on-surface">3. الأقسام الثانوية ({secondaryCategories.length})</span>
              <button
                type="button"
                onClick={() => handleOpenAdd('secondary')}
                disabled={!activeSub}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-700 text-white text-[11px] font-black shadow-xs hover:bg-emerald-800 transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة</span>
              </button>
            </div>
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[300px]">
              {secondaryCategories.length === 0 ? (
                <div className="text-center py-8 text-[11px] text-on-surface-variant font-bold">لا توجد أقسام ثانوية</div>
              ) : (
                secondaryCategories.map((sec) => (
                  <div
                    key={sec.id}
                    className="flex items-center justify-between p-2 rounded-xl border bg-surface-lowest text-on-surface border-outline-variant/20 text-xs font-bold hover:border-emerald-500/40 transition-all"
                  >
                    <span className="truncate">{sec.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(sec)}
                        className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
                        title="تعديل الاسم"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(sec)}
                        className="p-1 rounded-md hover:bg-error-container/20 text-error transition-colors cursor-pointer"
                        title="حذف البند"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {addLevel && (
          <div className="p-3.5 rounded-2xl bg-surface-low border border-primary/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-primary">
                {addLevel === 'main' ? 'إضافة قسم رئيسي جديد' : addLevel === 'sub' ? 'إضافة قسم فرعي جديد' : 'إضافة قسم ثانوي جديد'}
              </span>
              <button type="button" onClick={() => setAddLevel(null)} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAdd} className="space-y-2.5">
              {addLevel === 'sub' && (
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">القسم الرئيسي التابع له *</label>
                  <AX_SearchableSelect value={addParentMainId} onChange={setAddParentMainId} options={mainCategories.map((m) => ({ value: m.id, label: m.name }))} />
                </div>
              )}
              {addLevel === 'secondary' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">القسم الرئيسي *</label>
                    <AX_SearchableSelect
                      value={addParentMainId}
                      onChange={(id) => {
                        setAddParentMainId(id)
                        const subs = expenseCategoryHelpers.getSubCategories(expenseCategories, id)
                        setAddParentSubId(subs[0]?.id || '')
                      }}
                      options={mainCategories.map((m) => ({ value: m.id, label: m.name }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">القسم الفرعي *</label>
                    <AX_SearchableSelect
                      value={addParentSubId}
                      onChange={setAddParentSubId}
                      options={expenseCategoryHelpers.getSubCategories(expenseCategories, addParentMainId).map((s) => ({ value: s.id, label: s.name }))}
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">اسم البند أو التصنيف *</label>
                  <input
                    type="text"
                    required
                    placeholder="اكتب اسم البند..."
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">كود محاسبي (اختياري)</label>
                  <input
                    type="text"
                    placeholder="EXP-..."
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-mono font-bold text-on-surface outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end pt-1">
                <button type="button" onClick={() => setAddLevel(null)} className="px-3.5 py-1.5 rounded-full border border-outline-variant/40 text-xs font-bold text-on-surface hover:bg-surface-container">إلغاء</button>
                <button type="submit" className="px-4 py-1.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-xs cursor-pointer">حفظ البند</button>
              </div>
            </form>
          </div>
        )}

        {editingItem && (
          <div className="p-3.5 rounded-2xl bg-surface-low border border-secondary/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-secondary">
                تعديل اسم {editingItem.level === 'main' ? 'القسم الرئيسي' : editingItem.level === 'sub' ? 'القسم الفرعي' : 'القسم الثانوي'}
              </span>
              <button type="button" onClick={() => setEditingItem(null)} className="text-on-surface-variant hover:text-on-surface"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="flex items-center gap-2">
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface outline-none"
              />
              <button type="submit" className="px-4 py-1.5 rounded-full bg-secondary hover:bg-secondary-hover text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>حفظ التعديل</span>
              </button>
            </form>
          </div>
        )}

        {deleteTarget && (
          <div className="p-3.5 rounded-2xl bg-error-container/20 border border-error/30 space-y-2 animate-fadeIn">
            <div className="flex items-center gap-2 text-error">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-black">
                تأكيد حذف {deleteTarget.level === 'main' ? 'القسم الرئيسي' : deleteTarget.level === 'sub' ? 'القسم الفرعي' : 'القسم الثانوي'}: "{deleteTarget.name}"
              </span>
            </div>
            {deleteTarget.childrenCount > 0 && (
              <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                ⚠️ تنبيه: سيتم حذف كافة الأقسام التابعة لهذا القسم ({deleteTarget.childrenCount} أقسام).
              </div>
            )}
            {deleteTarget.expenseCount > 0 ? (
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                🛡️ أمان تاريخي: الحركات المالية السابقة المسجلة تحت هذا البند ({deleteTarget.expenseCount} حركة) ستبقى محفوظة باسم البند كما هي ولن تتأثر.
              </div>
            ) : (
              <div className="text-[11px] font-bold text-on-surface-variant">لا توجد حركات مالية سابقة مرتبطة مباشرة بهذا البند.</div>
            )}
            <div className="flex items-center gap-2 justify-end pt-1">
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-3.5 py-1.5 rounded-full border border-outline-variant/60 text-xs font-bold text-on-surface hover:bg-surface-container">تراجع</button>
              <button type="button" onClick={handleConfirmDelete} className="px-4 py-1.5 rounded-full bg-error hover:bg-error/90 text-white text-xs font-black shadow-xs cursor-pointer">تأكيد الحذف</button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-surface-container shrink-0">
          <span className="text-[11px] font-bold text-on-surface-variant">إجمالي البنود المعرفة: {expenseCategories.length} بنداً موزعة على 3 مستويات</span>
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 transition-all cursor-pointer">إغلاق</button>
        </div>
      </div>
    </div>
  )
}
