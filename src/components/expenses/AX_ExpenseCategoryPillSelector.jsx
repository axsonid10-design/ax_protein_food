import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Trash2, Check, X, Search, Sparkles } from 'lucide-react'

export function AX_ExpenseCategoryPillSelector({
  label = '',
  value = '',
  options = [],
  onChange,
  onAdd,
  onDelete,
  placeholder = 'اختر...',
  disabled = false,
  required = false,
  level = 'main',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setIsAdding(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((opt) => opt.id === value)

  const filteredOptions = options.filter((opt) => {
    if (!searchTerm) return true
    return (opt.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  })

  const handleSaveNew = (e) => {
    e?.preventDefault?.()
    const trimmed = (newName || '').trim()
    if (!trimmed) return
    onAdd?.(trimmed)
    setNewName('')
    setIsAdding(false)
    setIsOpen(false)
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    onDelete?.(id)
  }

  return (
    <div ref={containerRef} className="relative w-full space-y-1">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-black text-on-surface">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(!isAdding)
              setIsOpen(false)
            }}
            className="inline-flex items-center gap-1 text-[11px] font-black text-primary hover:text-primary-dark cursor-pointer transition-all"
          >
            <Plus className="w-3 h-3" />
            <span>إضافة بند</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="p-2 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5 animate-in fade-in">
          <input
            type="text"
            placeholder="اسم البند الجديد..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveNew(e)
              if (e.key === 'Escape') setIsAdding(false)
            }}
            className="w-full h-8 px-2.5 bg-surface-lowest border border-outline-variant/40 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
            autoFocus
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={handleSaveNew}
              disabled={!newName.trim()}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary hover:bg-primary-dark text-white text-[11px] font-black cursor-pointer disabled:opacity-40 transition-all"
            >
              <Check className="w-3 h-3" />
              <span>حفظ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setNewName('')
              }}
              className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-bold cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex-1 h-10 px-3 rounded-2xl bg-surface-lowest border text-right text-xs font-bold transition-all flex items-center justify-between gap-2 shadow-xs cursor-pointer select-none ${
            isOpen
              ? 'border-primary ring-2 ring-primary/20 text-on-surface'
              : 'border-outline-variant/40 text-on-surface hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-surface-container/30' : ''}`}
        >
          <span className="truncate block font-black">
            {selectedOption ? (
              selectedOption.name
            ) : (
              <span className="text-on-surface-variant font-medium">{placeholder}</span>
            )}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-on-surface-variant shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        </button>

        {selectedOption && !disabled && (
          <button
            type="button"
            onClick={(e) => handleDelete(e, selectedOption.id)}
            className="w-10 h-10 rounded-2xl bg-surface-lowest hover:bg-error/10 border border-outline-variant/30 hover:border-error/30 text-on-surface-variant hover:text-error flex items-center justify-center shrink-0 cursor-pointer transition-all"
            title="حذف هذا البند"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div
          dir="rtl"
          className="absolute z-50 top-full mt-1.5 inset-x-0 bg-surface-lowest border border-outline-variant/40 rounded-2xl shadow-level3 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {options.length > 5 && (
            <div className="p-2 border-b border-outline-variant/20 bg-surface-low/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="بحث سريع في البنود..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-8 pl-3 py-1 bg-surface-lowest border border-outline-variant/30 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="max-h-52 overflow-y-auto p-1 divide-y divide-outline-variant/10">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs font-bold text-on-surface-variant">
                لا توجد بنود مطابقة
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.id === value
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onChange?.(opt.id, opt.name)
                      setIsOpen(false)
                    }}
                    className={`p-2 rounded-xl flex items-center justify-between text-xs font-bold cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-black'
                        : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <span className="truncate">{opt.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, opt.id)}
                        className="p-1 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error cursor-pointer transition-all"
                        title="حذف البند"
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
