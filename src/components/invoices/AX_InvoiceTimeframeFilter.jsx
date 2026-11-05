import React from 'react'
import { Calendar, Filter } from 'lucide-react'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'

export function AX_InvoiceTimeframeFilter({
  timeframe = 'all',
  setTimeframe,
  specificDate = '',
  setSpecificDate,
  customStart = '',
  setCustomStart,
  customEnd = '',
  setCustomEnd,
}) {
  const options = [
    { id: 'all', label: 'كافة الفترات' },
    { id: 'today', label: 'اليوم' },
    { id: 'week', label: 'آخر 7 أيام' },
    { id: 'month', label: 'هذا الشهر' },
    { id: 'year', label: 'هذا العام' },
    { id: 'specific_day', label: 'يوم محدد' },
    { id: 'custom', label: 'نطاق مخصص' },
  ]

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <div className="flex items-center gap-1 text-on-surface-variant text-xs font-black pl-1 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>الفترة:</span>
        </div>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTimeframe(opt.id)}
            className={`px-3 py-1 rounded-full text-[11px] font-black whitespace-nowrap transition-all cursor-pointer ${
              timeframe === opt.id
                ? 'bg-secondary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:text-on-surface border border-outline-variant/20'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {timeframe === 'specific_day' && (
        <div className="p-3 bg-surface-low rounded-2xl border border-outline-variant/30 max-w-sm animate-in fade-in">
          <AX_CompanyDatePicker
            label="اختر التاريخ المحدد:"
            value={specificDate}
            onChange={setSpecificDate}
            placeholder="اختر اليوم..."
          />
        </div>
      )}

      {timeframe === 'custom' && (
        <div className="p-3 bg-surface-low rounded-2xl border border-outline-variant/30 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl animate-in fade-in">
          <AX_CompanyDatePicker
            label="من تاريخ:"
            value={customStart}
            onChange={setCustomStart}
            placeholder="تاريخ البداية..."
          />
          <AX_CompanyDatePicker
            label="إلى تاريخ:"
            value={customEnd}
            onChange={setCustomEnd}
            placeholder="تاريخ النهاية..."
          />
        </div>
      )}
    </div>
  )
}

export default AX_InvoiceTimeframeFilter
