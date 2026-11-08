import React, { useState } from 'react'
import { FolderTree, X, Plus, Edit2, Trash2, RotateCcw, Check, ChevronLeft } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock.js'
import { useAXStore } from '../../store/useAXStore.js'
import { expenseCategoryHelpers } from '../../store/expenseCategoryHelpers.js'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal.jsx'
import { generateUUID } from '../../utils/AX_UUID.js'

export function AX_ExpenseCategoriesModal({ isOpen, onClose }) {
  useBodyScrollLock(isOpen, onClose)
  const {
    expenseCategories = [], cashTransactions = [],
    addExpenseCategory, editExpenseCategory, deleteExpenseCategory, resetExpenseCategories,
  } = useAXStore()

  const mainCategories = expenseCategoryHelpers.getMainCategories(expenseCategories)
  const [selectedMainId, setSelectedMainId] = useState(mainCategories[0]?.id || '')
  const subCategories = selectedMainId ? expenseCategoryHelpers.getSubCategories(expenseCategories, selectedMainId) : []
  const [selectedSubId, setSelectedSubId] = useState(subCategories[0]?.id || '')
  const secondaryCategories = selectedSubId ? expenseCategoryHelpers.getSecondaryCategories(expenseCategories, selectedSubId) : []

  const [activeMobileTier, setActiveMobileTier] = useState('main')
  const [newMainName, setNewMainName] = useState('')
  const [newSubName, setNewSubName] = useState('')
  const [newSecName, setNewSecName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)

  if (!isOpen) return null

  const activeMain = mainCategories.find((c) => c.id === selectedMainId) || mainCategories[0]
  const activeSub = subCategories.find((c) => c.id === selectedSubId) || subCategories[0]

  const handleAddMain = (e) => {
    e.preventDefault()
    const name = newMainName.trim()
    if (!name) return
    const newId = `exp-main-${generateUUID()}`
    addExpenseCategory({ id: newId, name, level: 'main', parentId: null })
    setSelectedMainId(newId)
    setSelectedSubId('')
    setNewMainName('')
  }

  const handleAddSub = (e) => {
    e.preventDefault()
    const name = newSubName.trim()
    const parentId = selectedMainId || activeMain?.id
    if (!name || !parentId) return
    const newId = `exp-sub-${generateUUID()}`
    addExpenseCategory({ id: newId, name, level: 'sub', parentId })
    setSelectedSubId(newId)
    setNewSubName('')
  }

  const handleAddSecondary = (e) => {
    e.preventDefault()
    const name = newSecName.trim()
    const parentId = selectedSubId || activeSub?.id
    if (!name || !parentId) return
    const newId = `exp-sec-${generateUUID()}`
    addExpenseCategory({ id: newId, name, level: 'secondary', parentId })
    setNewSecName('')
  }

  const handleSaveEdit = (e) => {
    e.preventDefault()
    if (!editingId || !editName.trim()) return
    editExpenseCategory(editingId, { name: editName.trim() })
    setEditingId(null)
    setEditName('')
  }

  const handleDeleteTrigger = (cat) => {
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

  const renderItemRow = (item, isSelected, onSelect) => {
    if (editingId === item.id) {
      return (
        <form key={item.id} onSubmit={handleSaveEdit} className="p-2 rounded-xl bg-surface-container border border-primary/40 flex items-center gap-1.5">
          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 h-8 px-2 bg-surface-lowest border rounded-lg text-xs font-bold" autoFocus />
          <button type="submit" className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => setEditingId(null)} className="w-7 h-7 rounded-lg bg-surface-lowest border flex items-center justify-center cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </form>
      )
    }
    return (
      <div key={item.id} onClick={onSelect} className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${isSelected ? 'bg-primary/10 border-primary text-primary font-black shadow-xs' : 'bg-surface-lowest border-outline-variant/20 hover:bg-surface-container text-on-surface font-bold'}`}>
        <span className="text-xs truncate">{item.name}</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => { setEditingId(item.id); setEditName(item.name) }} className="w-6 h-6 rounded-md hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant cursor-pointer"><Edit2 className="w-3 h-3" /></button>
          <button type="button" onClick={() => handleDeleteTrigger(item)} className="w-6 h-6 rounded-md hover:bg-red-500/10 text-red-600 flex items-center justify-center cursor-pointer"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-scrim/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface-lowest rounded-3xl shadow-level3 border border-outline-variant/30 overflow-hidden text-right">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-outline-variant/30 bg-surface-container-low/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20"><FolderTree className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-on-surface">إدارة شجرة بنود المصروفات</h2>
              <p className="text-xs font-bold text-on-surface-variant">تهيئة البنود الرئيسية والفرعية والثانوية</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsResetConfirmOpen(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant/30 bg-surface-lowest hover:bg-surface-container text-xs font-black text-on-surface-variant transition-all cursor-pointer active:scale-95"><RotateCcw className="w-3.5 h-3.5" /><span>استعادة الافتراضي</span></button>
            <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-surface-lowest hover:bg-surface-container border border-outline-variant/30 flex items-center justify-center text-on-surface-variant cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="lg:hidden p-2 bg-surface-container-low/70 border-b border-outline-variant/20 flex items-center gap-1">
          <button type="button" onClick={() => setActiveMobileTier('main')} className={`flex-1 py-1 px-2 rounded-xl text-xs font-black transition-all ${activeMobileTier === 'main' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-lowest text-on-surface-variant'}`}>الرئيسية ({mainCategories.length})</button>
          <ChevronLeft className="w-3 h-3 text-outline-variant" />
          <button type="button" onClick={() => setActiveMobileTier('sub')} className={`flex-1 py-1 px-2 rounded-xl text-xs font-black transition-all ${activeMobileTier === 'sub' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-lowest text-on-surface-variant'}`}>الفرعية ({subCategories.length})</button>
          <ChevronLeft className="w-3 h-3 text-outline-variant" />
          <button type="button" onClick={() => setActiveMobileTier('secondary')} className={`flex-1 py-1 px-2 rounded-xl text-xs font-black transition-all ${activeMobileTier === 'secondary' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-lowest text-on-surface-variant'}`}>الثانوية ({secondaryCategories.length})</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            <div className={`space-y-3 flex flex-col ${activeMobileTier !== 'main' ? 'hidden lg:flex' : 'flex'}`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/20">
                <span className="text-xs font-black text-on-surface flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />1. البنود الرئيسية</span>
                <span className="text-[11px] font-bold text-on-surface-variant">{mainCategories.length} بند</span>
              </div>
              <form onSubmit={handleAddMain} className="flex gap-1.5">
                <input type="text" value={newMainName} onChange={(e) => setNewMainName(e.target.value)} placeholder="اسم البند الرئيسي..." className="flex-1 h-9 px-3 bg-surface-lowest border border-outline-variant/40 rounded-xl text-xs font-bold focus:outline-none focus:border-primary" />
                <button type="submit" disabled={!newMainName.trim()} className="h-9 px-3 rounded-xl bg-primary text-on-primary text-xs font-black flex items-center gap-1 disabled:opacity-40 cursor-pointer"><Plus className="w-3.5 h-3.5" />إضافة</button>
              </form>
              <div className="flex-1 max-h-[340px] overflow-y-auto space-y-1.5 pr-0.5">
                {mainCategories.map((main) => renderItemRow(main, main.id === selectedMainId, () => {
                  setSelectedMainId(main.id)
                  const subs = expenseCategoryHelpers.getSubCategories(expenseCategories, main.id)
                  setSelectedSubId(subs[0]?.id || '')
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) setActiveMobileTier('sub')
                }))}
              </div>
            </div>

            <div className={`space-y-3 flex flex-col ${activeMobileTier !== 'sub' ? 'hidden lg:flex' : 'flex'}`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/20">
                <span className="text-xs font-black text-on-surface flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />2. التصنيفات الفرعية</span>
                <span className="text-[11px] font-bold text-on-surface-variant">{activeMain ? activeMain.name : 'اختر بنداً'}</span>
              </div>
              <form onSubmit={handleAddSub} className="flex gap-1.5">
                <input type="text" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} disabled={!selectedMainId} placeholder={selectedMainId ? 'اسم التصنيف الفرعي...' : 'اختر بنداً أولاً'} className="flex-1 h-9 px-3 bg-surface-lowest border border-outline-variant/40 rounded-xl text-xs font-bold focus:outline-none focus:border-primary disabled:opacity-50" />
                <button type="submit" disabled={!newSubName.trim() || !selectedMainId} className="h-9 px-3 rounded-xl bg-primary text-on-primary text-xs font-black flex items-center gap-1 disabled:opacity-40 cursor-pointer"><Plus className="w-3.5 h-3.5" />إضافة</button>
              </form>
              <div className="flex-1 max-h-[340px] overflow-y-auto space-y-1.5 pr-0.5">
                {subCategories.length === 0 ? (
                  <div className="p-4 text-center text-xs font-bold text-on-surface-variant bg-surface-container-low/40 rounded-xl border border-dashed border-outline-variant/30">لا توجد تصنيفات فرعية</div>
                ) : (
                  subCategories.map((sub) => renderItemRow(sub, sub.id === selectedSubId, () => {
                    setSelectedSubId(sub.id)
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) setActiveMobileTier('secondary')
                  }))
                )}
              </div>
            </div>

            <div className={`space-y-3 flex flex-col ${activeMobileTier !== 'secondary' ? 'hidden lg:flex' : 'flex'}`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/20">
                <span className="text-xs font-black text-on-surface flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />3. التصنيفات الثانوية</span>
                <span className="text-[11px] font-bold text-on-surface-variant">{activeSub ? activeSub.name : 'اختر فرعاً'}</span>
              </div>
              <form onSubmit={handleAddSecondary} className="flex gap-1.5">
                <input type="text" value={newSecName} onChange={(e) => setNewSecName(e.target.value)} disabled={!selectedSubId} placeholder={selectedSubId ? 'اسم التصنيف الثانوي...' : 'اختر تصنيفاً أولاً'} className="flex-1 h-9 px-3 bg-surface-lowest border border-outline-variant/40 rounded-xl text-xs font-bold focus:outline-none focus:border-primary disabled:opacity-50" />
                <button type="submit" disabled={!newSecName.trim() || !selectedSubId} className="h-9 px-3 rounded-xl bg-primary text-on-primary text-xs font-black flex items-center gap-1 disabled:opacity-40 cursor-pointer"><Plus className="w-3.5 h-3.5" />إضافة</button>
              </form>
              <div className="flex-1 max-h-[340px] overflow-y-auto space-y-1.5 pr-0.5">
                {secondaryCategories.length === 0 ? (
                  <div className="p-4 text-center text-xs font-bold text-on-surface-variant bg-surface-container-low/40 rounded-xl border border-dashed border-outline-variant/30">لا توجد بنود ثانوية</div>
                ) : (
                  secondaryCategories.map((sec) => renderItemRow(sec, false, () => {}))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 border-t border-outline-variant/30 bg-surface-container-low/40 flex items-center justify-between">
          <div className="text-xs font-bold text-on-surface-variant truncate">
            {activeMain && (
              <span className="inline-flex items-center gap-1">
                <span>المسار:</span>
                <span className="font-black text-primary">{activeMain.name}</span>
                {activeSub && <><span>/</span><span className="text-on-surface">{activeSub.name}</span></>}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-full bg-surface-lowest hover:bg-surface-container border border-outline-variant/40 text-xs font-black text-on-surface cursor-pointer">إغلاق</button>
        </div>
      </div>

      <AX_ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="تأكيد حذف بند المصروف"
        message={deleteTarget ? `هل أنت متأكد من حذف البند "${deleteTarget.name}"؟ ${deleteTarget.childrenCount > 0 ? `سيتم أيضاً حذف ${deleteTarget.childrenCount} بند فرعي مرتبط به.` : ''}` : ''}
        confirmText="تأكيد الحذف"
        cancelText="تراجع"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <AX_ConfirmModal
        isOpen={isResetConfirmOpen}
        title="استعادة بنود المصروفات الافتراضية"
        message="هل ترغب في إعادة ضبط شجرة بنود المصروفات إلى القائمة الأصلية للمنظومة؟"
        confirmText="استعادة الآن"
        cancelText="إلغاء"
        isDestructive={true}
        onConfirm={() => { resetExpenseCategories(); setIsResetConfirmOpen(false) }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  )
}
