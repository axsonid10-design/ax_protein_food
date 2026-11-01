import React from 'react'
import { Calendar } from 'lucide-react'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'

export function AX_PeriodFilterBar({
  period,
  setPeriod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}) {
  const options = [
    { id: 'today', label: 'اليوم' },
    { id: '7days', label: '7 أيام' },
    { id: 'month', label: 'الشهر الحالي' },
    { id: 'year', label: 'السنة' },
    { id: 'custom', label: 'مخصص' },
  ]

  return (
    <div className="space-y-3">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl sm:rounded-full p-1.5 shadow-sm flex items-center justify-between gap-1 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {options.map((opt) => {
            const isActive = period === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriod(opt.id)}
                className={`h-8 px-3.5 sm:px-4 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-low'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-on-surface-variant">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>تحديث لحظي</span>
        </div>
      </div>

      {period === 'custom' && (
        <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-surface-lowest border border-outline-variant/30 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
          <AX_CompanyDatePicker
            label="من تاريخ:"
            value={startDate}
            onChange={setStartDate}
          />
          <AX_CompanyDatePicker
            label="إلى تاريخ:"
            value={endDate}
            onChange={setEndDate}
          />
        </div>
      )}
    </div>
  )
}
