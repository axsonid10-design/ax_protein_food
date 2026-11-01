import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, Check, X } from 'lucide-react'

export function AX_SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'اختر...',
  searchable = true,
  disabled = false,
  className = '',
  dropdownClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
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

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
    if (!isOpen) {
      setSearchTerm('')
    }
  }, [isOpen, searchable])

  const selectedOption = options.find((opt) => String(opt.value) === String(value))

  const filteredOptions = options.filter((opt) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const labelMatch = opt.label?.toLowerCase().includes(term)
    const subMatch = opt.sublabel?.toLowerCase().includes(term)
    return labelMatch || subMatch
  })

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-50' : 'z-10'} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-2xl bg-surface-low border text-right text-xs font-bold transition-all flex items-center justify-between gap-2 shadow-sm cursor-pointer select-none ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-surface-lowest text-on-surface'
            : 'border-outline-variant/30 text-on-surface hover:border-primary/50 hover:bg-surface-lowest'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0 text-primary">{selectedOption.icon}</span>
          )}
          <span className="truncate block font-black">
            {selectedOption ? selectedOption.label : <span className="text-on-surface-variant font-medium">{placeholder}</span>}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-on-surface-variant shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          dir="rtl"
          className={`absolute z-[60] ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } inset-x-0 bg-surface-lowest border border-outline-variant/40 rounded-2xl shadow-level3 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${dropdownClassName}`}
        >
          {searchable && (
            <div className="p-2 border-b border-surface-container bg-surface-low/50 relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="ابحث في الخيارات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary text-right"
              />
              <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-4 top-3.5 pointer-events-none" />
            </div>
          )}

          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-on-surface-variant font-bold">
                لا توجد نتائج مطابقة
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setIsOpen(false)
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-right text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white font-black shadow-sm'
                        : 'text-on-surface hover:bg-surface-low'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="truncate">
                        <span className="block truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span
                            className={`text-[10px] block truncate ${
                              isSelected ? 'text-white/80' : 'text-on-surface-variant'
                            }`}
                          >
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-surface-low text-primary'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AX_SearchableSelect
