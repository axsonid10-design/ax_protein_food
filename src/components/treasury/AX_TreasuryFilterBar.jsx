import React from 'react'
import {
  Search,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  RotateCcw,
  Users,
} from 'lucide-react'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'

export function AX_TreasuryFilterBar({
  searchTerm,
  onSearchChange,
  selectedTreasuryId,
  onTreasuryChange,
  treasuryAccounts = [],
  selectedType,
  onTypeChange,
  dateMode,
  onDateModeChange,
  singleDate,
  onSingleDateChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  partyKindFilter,
  onPartyKindChange,
  selectedPartyKey,
  onPartyChange,
  partyOptions = [],
  summary = { inflow: 0, inflowCount: 0, outflow: 0, outflowCount: 0, net: 0 },
  hasActiveFilters = false,
  onResetFilters,
  onQuickTodayInflow,
  onQuickTodayOutflow,
}) {
  const typeButtons = [
    { id: 'ALL', label: 'الكل' },
    { id: 'inflow', label: 'وارد الخزنة' },
    { id: 'outflow', label: 'صادر الخزنة' },
    { id: 'client_receipt', label: 'وارد قبض' },
    { id: 'supplier_payment', label: 'سداد مورد' },
    { id: 'expense', label: 'مصروفات' },
    { id: 'payroll', label: 'أجور' },
  ]

  const dateModes = [
    { id: 'all', label: 'كل التواريخ' },
    { id: 'today', label: 'اليوم' },
    { id: 'single', label: 'يوم محدد' },
    { id: 'range', label: 'بين تاريخين' },
  ]

  const isTodayInflowActive = selectedType === 'inflow' && dateMode === 'today'
  const isTodayOutflowActive = selectedType === 'outflow' && dateMode === 'today'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl p-3 bg-emerald-500/10 border border-emerald-500/25 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-black text-emerald-800">
            <span className="flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              وارد الخزنة
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800">
              {summary.inflowCount} حركة
            </span>
          </div>
          <div className="font-mono font-black text-sm sm:text-base text-emerald-700 mt-1">
            +{Number(summary.inflow || 0).toLocaleString('en-US')} ج.م
          </div>
        </div>

        <div className="rounded-2xl p-3 bg-rose-500/10 border border-rose-500/25 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-black text-rose-800">
            <span className="flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              صادر الخزنة
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-800">
              {summary.outflowCount} حركة
            </span>
          </div>
          <div className="font-mono font-black text-sm sm:text-base text-rose-700 mt-1">
            -{Number(summary.outflow || 0).toLocaleString('en-US')} ج.م
          </div>
        </div>

        <div className="rounded-2xl p-3 bg-surface-low border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-black text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-primary" />
              صافي الحركة
            </span>
          </div>
          <div
            className={`font-mono font-black text-sm sm:text-base mt-1 ${
              summary.net >= 0 ? 'text-primary' : 'text-error'
            }`}
          >
            {summary.net >= 0 ? '+' : ''}
            {Number(summary.net || 0).toLocaleString('en-US')} ج.م
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {typeButtons.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => onTypeChange(btn.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                selectedType === btn.id && !isTodayInflowActive && !isTodayOutflowActive
                  ? 'bg-primary text-white shadow-xs'
                  : selectedType === btn.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-low text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onQuickTodayInflow}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
              isTodayInflowActive
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            <ArrowDownLeft className="w-3 h-3" />
            وارد اليوم
          </button>
          <button
            type="button"
            onClick={onQuickTodayOutflow}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
              isTodayOutflowActive
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-500/10 text-rose-700 border border-rose-500/30 hover:bg-rose-500/20'
            }`}
          >
            <ArrowUpRight className="w-3 h-3" />
            صادر اليوم
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-surface-container text-on-surface hover:bg-surface-container-high transition-all cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              إعادة ضبط
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center bg-surface-low/60 p-3 rounded-2xl border border-outline-variant/20">
        <div className="lg:col-span-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-black text-on-surface-variant flex items-center gap-1 ml-1">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            الفترة:
          </span>
          {dateModes.map((dm) => (
            <button
              key={dm.id}
              type="button"
              onClick={() => onDateModeChange(dm.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                dateMode === dm.id
                  ? 'bg-secondary text-white shadow-xs'
                  : 'bg-surface-lowest text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
              }`}
            >
              {dm.label}
            </button>
          ))}
        </div>

        {dateMode === 'single' && (
          <div className="lg:col-span-4">
            <AX_CompanyDatePicker
              value={singleDate}
              onChange={onSingleDateChange}
              placeholder="اختر التاريخ..."
            />
          </div>
        )}

        {dateMode === 'range' && (
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <AX_CompanyDatePicker
              value={fromDate}
              onChange={onFromDateChange}
              placeholder="من تاريخ..."
            />
            <AX_CompanyDatePicker
              value={toDate}
              onChange={onToDateChange}
              placeholder="إلى تاريخ..."
            />
          </div>
        )}

        <div className={dateMode === 'single' ? 'lg:col-span-4' : dateMode === 'range' ? 'lg:col-span-3' : 'lg:col-span-8'}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="inline-flex rounded-full bg-surface-lowest p-0.5 border border-outline-variant/30 shrink-0 self-start sm:self-auto">
              {[
                { id: 'ALL', label: 'كل الجهات' },
                { id: 'client', label: 'عميل' },
                { id: 'supplier', label: 'مورد' },
              ].map((pk) => (
                <button
                  key={pk.id}
                  type="button"
                  onClick={() => onPartyKindChange(pk.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                    partyKindFilter === pk.id
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {pk.label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[180px]">
              <AX_SearchableSelect
                value={selectedPartyKey}
                onChange={onPartyChange}
                options={partyOptions}
                placeholder="تحديد عميل أو مورد..."
                icon={Users}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-on-surface-variant absolute right-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث بكود السند، اسم الطرف، البيان، أو التاريخ..."
            className="w-full h-9 pr-9 pl-3.5 rounded-full bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
        {treasuryAccounts.length > 0 && (
          <div className="sm:w-56">
            <AX_SearchableSelect
              value={selectedTreasuryId}
              onChange={onTreasuryChange}
              options={[
                { value: 'ALL', label: 'جميع الخزائن والحسابات' },
                ...treasuryAccounts.map((t) => ({ value: t.id, label: t.name })),
              ]}
              searchable={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default AX_TreasuryFilterBar
