import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Edit2, Trash2, Check, X, Tag } from 'lucide-react'

export function AX_CategorySelect({
  label,
  value,
  onChange,
  categories = [],
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  placeholder = 'اختر قسماً...',
  colorTheme = 'primary',
  allowNone = false,
  noneLabel = 'بدون قسم ثانوي (اختياري)',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [editingCatName, setEditingCatName] = useState(null)
  const [editCatText, setEditCatText] = useState('')

  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setIsAddingNew(false)
        setEditingCatName(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      if (spaceBelow < 260 && spaceAbove > spaceBelow) {
        setOpenUpward(true)
      } else {
        setOpenUpward(false)
      }
    }
  }, [isOpen])

  const handleCreateSubmit = (e) => {
    if (e?.preventDefault) e.preventDefault()
    const trimmed = newCatName.trim()
    if (!trimmed) return
    onAddCategory?.(trimmed)
    onChange(trimmed)
    setNewCatName('')
    setIsAddingNew(false)
  }

  const handleEditSubmit = (e, oldName) => {
    if (e?.preventDefault) e.preventDefault()
    const trimmed = editCatText.trim()
    if (!trimmed || trimmed === oldName) {
      setEditingCatName(null)
      return
    }
    onEditCategory?.(oldName, trimmed)
    if (value === oldName) onChange(trimmed)
    setEditingCatName(null)
  }

  return (
    <div ref={containerRef} className={`relative w-full space-y-1 ${isOpen ? 'z-50' : 'z-10'}`}>
      {label && (
        <label className="block text-xs font-black text-on-surface-variant text-right">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-2xl bg-surface-low border text-right text-xs font-bold transition-all flex items-center justify-between gap-2 shadow-sm cursor-pointer select-none ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-surface-lowest'
            : 'border-outline-variant/30 text-on-surface hover:border-primary/50 hover:bg-surface-lowest'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate font-black">
            {value ? value : <span className="text-on-surface-variant font-medium">{placeholder}</span>}
          </span>
        </div>
        {value && allowNone && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            className="p-1 rounded-full text-on-surface-variant hover:text-error hover:bg-surface-low transition-colors cursor-pointer"
            title="إلغاء التحديد"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-on-surface-variant shrink-0 transition-transform ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-[60] ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } inset-x-0 bg-surface-lowest border border-outline-variant/40 rounded-2xl shadow-level3 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="p-2 border-b border-surface-container bg-surface-low/50 flex items-center justify-between gap-2">
            {!isAddingNew ? (
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="w-full py-1.5 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة قسم جديد</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 w-full">
                <input
                  type="text"
                  autoFocus
                  placeholder="اسم القسم الجديد..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                      handleCreateSubmit(e)
                    }
                  }}
                  className="flex-1 px-2.5 py-1 rounded-lg bg-surface-lowest border border-outline-variant/40 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCreateSubmit(e)
                  }}
                  className="p-1 rounded-lg bg-primary text-white hover:bg-primary-dark cursor-pointer"
                  title="حفظ"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsAddingNew(false)
                  }}
                  className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer"
                  title="إلغاء"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto p-1.5 space-y-1">
            {allowNone && (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
                className={`w-full text-right px-2.5 py-1.5 rounded-xl transition-all text-xs font-bold flex items-center justify-between cursor-pointer ${
                  !value
                    ? 'bg-primary/10 text-primary font-black border border-primary/20'
                    : 'text-on-surface-variant hover:bg-surface-low'
                }`}
              >
                <span>{noneLabel}</span>
                {!value && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            )}
            {categories.length === 0 ? (
              <div className="py-3 text-center text-xs text-on-surface-variant font-bold">
                لا توجد أقسام مسجلة
              </div>
            ) : (
              categories.map((cat) => {
                const isSelected = value === cat
                const isEditing = editingCatName === cat

                if (isEditing) {
                  return (
                    <div
                      key={cat}
                      className="flex items-center gap-1.5 p-1 bg-surface-low rounded-xl"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editCatText}
                        onChange={(e) => setEditCatText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            e.stopPropagation()
                            handleEditSubmit(e, cat)
                          }
                        }}
                        className="flex-1 px-2 py-1 rounded-lg bg-surface-lowest border border-primary text-xs font-bold text-on-surface focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleEditSubmit(e, cat)
                        }}
                        className="p-1 rounded-lg bg-primary text-white cursor-pointer"
                        title="حفظ التعديل"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditingCatName(null)
                        }}
                        className="p-1 rounded-lg text-on-surface-variant cursor-pointer"
                        title="إلغاء"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                }

                return (
                  <div
                    key={cat}
                    className={`flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-primary text-white font-black shadow-sm'
                        : 'text-on-surface hover:bg-surface-low'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onChange(cat)
                        setIsOpen(false)
                      }}
                      className="flex-1 text-right text-xs truncate font-bold cursor-pointer"
                    >
                      {cat}
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditingCatName(cat)
                          setEditCatText(cat)
                        }}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          isSelected ? 'text-white/80 hover:text-white' : 'text-on-surface-variant hover:text-primary'
                        }`}
                        title="تعديل اسم القسم"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onDeleteCategory?.(cat)
                          if (value === cat) {
                            const remaining = categories.filter((c) => c !== cat)
                            onChange(remaining[0] || '')
                          }
                        }}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          isSelected ? 'text-white/80 hover:text-white' : 'text-on-surface-variant hover:text-error'
                        }`}
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
      )}
    </div>
  )
}

export default AX_CategorySelect