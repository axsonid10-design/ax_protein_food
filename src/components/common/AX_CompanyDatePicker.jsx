import React, { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

const DAY_NAMES = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']

const parseSafeDate = (val) => {
  if (!val) return new Date()
  if (typeof val === 'string' && val.includes('-')) {
    const [y, m, d] = val.split('-').map(Number)
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d)
    }
  }
  return new Date(val)
}

export function AX_CompanyDatePicker({ value, onChange, placeholder = 'اختر التاريخ', label }) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState('days')
  const [selectedDate, setSelectedDate] = useState(() => (value ? parseSafeDate(value) : new Date()))
  const [currentMonth, setCurrentMonth] = useState(() => selectedDate.getMonth())
  const [currentYear, setCurrentYear] = useState(() => selectedDate.getFullYear())
  const containerRef = useRef(null)

  useEffect(() => {
    if (value) {
      const d = parseSafeDate(value)
      setSelectedDate(d)
      setCurrentMonth(d.getMonth())
      setCurrentYear(d.getFullYear())
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()

  const handleSelectDay = (day) => {
    const d = new Date(currentYear, currentMonth, day)
    const yearStr = String(currentYear)
    const monthStr = String(currentMonth + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const formatted = `${yearStr}-${monthStr}-${dayStr}`
    onChange?.(formatted)
    setSelectedDate(d)
    setIsOpen(false)
  }

  const formatDisplay = (val) => {
    if (!val) return ''
    const d = parseSafeDate(val)
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="block text-xs font-bold text-on-surface mb-1.5">{label}</label>}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 px-4 rounded-full border border-outline-variant bg-surface-lowest text-on-surface flex items-center justify-between text-sm shadow-sm hover:border-primary transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <span className={value ? 'font-bold text-on-surface' : 'text-on-surface-variant'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-primary" />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full mt-2 left-0 sm:left-auto right-auto sm:right-0 w-80 max-w-[calc(100vw-1.5rem)] bg-surface-lowest border border-outline-variant/30 rounded-3xl p-3 sm:p-4 shadow-level3 backdrop-blur-md overflow-hidden animate-fadeIn">
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-center bg-no-repeat bg-contain" style={{ backgroundImage: "url('/site-bg-watermark.png')" }} />

          <div className="relative flex items-center justify-between pb-3 mb-3 border-b border-surface-container">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                className="px-2.5 py-1 rounded-full text-xs font-bold text-primary hover:bg-surface-container transition-colors"
              >
                {MONTH_NAMES[currentMonth]}
              </button>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                className="px-2.5 py-1 rounded-full text-xs font-bold text-primary hover:bg-surface-container transition-colors"
              >
                {currentYear}
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11)
                    setCurrentYear(y => y - 1)
                  } else {
                    setCurrentMonth(m => m - 1)
                  }
                }}
                className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0)
                    setCurrentYear(y => y + 1)
                  } else {
                    setCurrentMonth(m => m + 1)
                  }
                }}
                className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {viewMode === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {MONTH_NAMES.map((m, idx) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setCurrentMonth(idx)
                    setViewMode('days')
                  }}
                  className={`py-2 px-1 text-xs font-bold rounded-xl transition-all ${
                    currentMonth === idx ? 'bg-primary text-white' : 'hover:bg-surface-container text-on-surface'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {viewMode === 'years' && (
            <div className="grid grid-cols-3 gap-2 py-2 max-h-48 overflow-y-auto">
              {Array.from({ length: 20 }).map((_, idx) => {
                const yr = new Date().getFullYear() - 10 + idx
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setCurrentYear(yr)
                      setViewMode('days')
                    }}
                    className={`py-2 px-1 text-xs font-bold rounded-xl transition-all ${
                      currentYear === yr ? 'bg-primary text-white' : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    {yr}
                  </button>
                )
              })}
            </div>
          )}

          {viewMode === 'days' && (
            <div>
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {DAY_NAMES.map(d => (
                  <span key={d} className="text-[11px] font-bold text-on-surface-variant py-1">
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <span key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const isSelected =
                    value &&
                    selectedDate.getDate() === day &&
                    selectedDate.getMonth() === currentMonth &&
                    selectedDate.getFullYear() === currentYear

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={`h-8 w-8 mx-auto rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AX_CompanyDatePicker
