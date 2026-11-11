import React from 'react'
import { Calendar, Search, X, Warehouse, CreditCard } from 'lucide-react'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { useAXStore } from '../../store/useAXStore'

export function AX_InvoiceTimeframeFilter({
  timeframe = 'all',
  setTimeframe,
  specificDate = '',
  setSpecificDate,
  customStart = '',
  setCustomStart,
  customEnd = '',
  setCustomEnd,
  searchQuery = '',
  setSearchQuery,
  statusFilter = 'all',
  setStatusFilter,
  warehouseFilter = 'all',
  setWarehouseFilter,
}) {
  const { warehouses = [] } = useAXStore()

  const options = [
    { id: 'all', label: 'كافة الفترات' },
    { id: 'today', label: 'اليوم' },
    { id: 'week', label: 'آخر 7 أيام' },
    { id: 'month', label: 'هذا الشهر' },
    { id: 'year', label: 'هذا العام' },
    { id: 'specific_day', label: 'يوم محدد' },
    { id: 'custom', label: 'نطاق مخصص' },
  ]

  const statusOptions = [
    { id: 'all', label: 'كافة الحالات' },
    { id: 'paid', label: 'مدفوع كلي' },
    { id: 'partial', label: 'مدفوع جزئي' },
    { id: 'unpaid', label: 'غير مدفوع' },
  ]

  return (
    <div className="space-y-2.5">
      {(typeof setSearchQuery === 'function' || typeof setStatusFilter === 'function' || typeof setWarehouseFilter === 'function') && (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {typeof setSearchQuery === 'function' && (
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-on-surface-variant absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم العميل/المورد، رقم الفاتورة، أو الصنف..."
                className="w-full h-9 pr-9 pl-8 rounded-full bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="w-5 h-5 rounded-full bg-surface-container hover:bg-error/10 hover:text-error text-on-surface-variant flex items-center justify-center absolute left-2.5 top-1/2 -translate-y-1/2 transition-all cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {typeof setStatusFilter === 'function' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
              <div className="flex items-center gap-1 text-on-surface-variant text-xs font-black pl-1 shrink-0">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                <span>الدفع:</span>
              </div>
              {statusOptions.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-black whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === st.id
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface-low text-on-surface-variant hover:text-on-surface border border-outline-variant/20'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}

          {typeof setWarehouseFilter === 'function' && warehouses.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
              <div className="flex items-center gap-1 text-on-surface-variant text-xs font-black pl-1 shrink-0">
                <Warehouse className="w-3.5 h-3.5 text-primary" />
                <span>المخزن:</span>
              </div>
              <button
                type="button"
                onClick={() => setWarehouseFilter('all')}
                className={`px-3 py-1 rounded-full text-[11px] font-black whitespace-nowrap transition-all cursor-pointer ${
                  warehouseFilter === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-low text-on-surface-variant hover:text-on-surface border border-outline-variant/20'
                }`}
              >
                الكل
              </button>
              {warehouses.map((wh) => (
                <button
                  key={wh.id}
                  type="button"
                  onClick={() => setWarehouseFilter(wh.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-black whitespace-nowrap transition-all cursor-pointer ${
                    warehouseFilter === wh.id
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface-low text-on-surface-variant hover:text-on-surface border border-outline-variant/20'
                  }`}
                >
                  {wh.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
