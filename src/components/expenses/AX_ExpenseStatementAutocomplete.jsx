import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Sparkles, X, Check, Clock } from 'lucide-react'

const DEFAULT_POPULAR_STATEMENTS = [
  'فاتورة كهرباء وطاقة غرف التجميد والكمبروسرات',
  'وقود وسولار سيارات التوزيع خطوط الميدان',
  'رسوم طرق وكارتات ومواقف سيارات النقل',
  'صيانة دورية وتغيير زيوت وفلاتر سيارات التبريد',
  'مشالات وعتالة نقل وتنزيل شحنات اللحوم',
  'إيجار الثلاجة المركزية عن الشهر الحالي',
  'أكياس فاكيوم وكراتين واسترتش تعبئة وتغليف',
  'أدوات ومطهرات نظافة معتمدة للثلاجات',
  'مستلزمات بوفيه وضيافة وأدوات مكتبية',
  'شحن فريون وزيوت ضواغط كمبروسرات التبريد',
]

export function AX_ExpenseStatementAutocomplete({
  value = '',
  onChange,
  pastTransactions = [],
  selectedMainCategoryName = '',
  selectedSubCategoryName = '',
  placeholder = 'مثال: فاتورة صيانة غرف تبريد...',
  disabled = false,
  required = true,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const uniqueStatements = useMemo(() => {
    const set = new Set()
    DEFAULT_POPULAR_STATEMENTS.forEach((s) => set.add(s))

    const txList = Array.isArray(pastTransactions) ? pastTransactions : []
    txList.forEach((tx) => {
      const note = (tx.notes || tx.title || tx.description || '').trim()
      if (note && note.length >= 4 && !note.startsWith('تسوية') && !note.startsWith('تحويل')) {
        set.add(note)
      }
    })

    return Array.from(set)
  }, [pastTransactions])

  const filtered = useMemo(() => {
    const trimmed = (value || '').trim().toLowerCase()
    if (!trimmed) {
      return uniqueStatements.slice(0, 8)
    }
    return uniqueStatements
      .filter((s) => s.toLowerCase().includes(trimmed))
      .slice(0, 8)
  }, [uniqueStatements, value])

  const handleSelect = (stmt) => {
    onChange?.(stmt)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full space-y-1">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-on-surface">
          بيان / وصف المصروف {required && <span className="text-red-500">*</span>}
        </label>
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange?.('')}
            className="text-[11px] text-on-surface-variant hover:text-error flex items-center gap-0.5 cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>مسح</span>
          </button>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChange?.(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full h-10 pr-3 pl-8 bg-surface-lowest border border-outline-variant/40 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary shadow-xs transition-all"
        />
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-primary/70" />
        </div>
      </div>

      {isOpen && !disabled && (
        <div
          dir="rtl"
          className="absolute z-50 top-full mt-1.5 inset-x-0 bg-surface-lowest border border-outline-variant/40 rounded-2xl shadow-level3 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-2 space-y-2"
        >
          <div className="flex items-center justify-between px-1 text-[10px] font-black text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-primary" />
              <span>اقتراحات سريعة مسجلة مسبقاً</span>
            </span>
            <span className="text-primary font-mono">{filtered.length} خيار</span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
            {filtered.length === 0 ? (
              <div className="p-2 text-center text-xs font-bold text-on-surface-variant">
                اكتب بياناً جديداً بحرية تامة...
              </div>
            ) : (
              filtered.map((stmt, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelect(stmt)}
                  className="p-2 rounded-xl hover:bg-primary/10 text-xs font-bold text-on-surface cursor-pointer flex items-center justify-between gap-2 transition-all group"
                >
                  <span className="truncate group-hover:text-primary">{stmt}</span>
                  {value === stmt && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
