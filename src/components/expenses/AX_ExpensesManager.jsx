import React, { useState, useMemo, useEffect } from 'react'
import {
  Receipt, Plus, FolderTree, Search, CheckCircle2, Clock, Calendar, Eye, Trash2, X,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore.js'
import {
  getStoredExpenses, deleteExpenseRecord, settleExpenseInstallment,
  calculateExpenseKPIs, filterExpenses, EXPENSE_COST_CENTER_TYPES, EXPENSE_STATUS_LABELS,
} from '../../store/expenseStoreHelpers.js'
import { AX_CreateExpenseModal } from './AX_CreateExpenseModal.jsx'
import { AX_ExpenseCategoriesModal } from './AX_ExpenseCategoriesModal.jsx'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal.jsx'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker.jsx'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect.jsx'

export function AX_ExpensesManager() {
  const storeState = useAXStore()
  const { treasuryAccounts = [], profile } = storeState

  const [expenses, setExpenses] = useState(() => getStoredExpenses())
  const [timeframe, setTimeframe] = useState('month')
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [costCenterType, setCostCenterType] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false)
  const [selectedExpenseForDetails, setSelectedExpenseForDetails] = useState(null)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [settlingInstallment, setSettlingInstallment] = useState(null)
  const [settleTreasuryId, setSettleTreasuryId] = useState(treasuryAccounts[0]?.id || '')
  const [settleMethod, setSettleMethod] = useState('cash')
  const [settleDate, setSettleDate] = useState(() => new Date().toISOString().slice(0, 10))

  const settleTreasuryOptions = useMemo(() => (
    treasuryAccounts.map((t) => ({
      value: t.id,
      label: t.name,
      badge: `${t.balance?.toLocaleString('en-US') || 0} ج.م`
    }))
  ), [treasuryAccounts])

  const refreshExpenses = () => setExpenses(getStoredExpenses())
  const kpis = useMemo(() => calculateExpenseKPIs(expenses, timeframe, customRange), [expenses, timeframe, customRange])
  const filteredExpenses = useMemo(() => filterExpenses(expenses, { timeframe, customRange, costCenterType, paymentStatus, search }), [expenses, timeframe, customRange, costCenterType, paymentStatus, search])

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize))
  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredExpenses.slice(start, start + pageSize)
  }, [filteredExpenses, page, pageSize])

  useEffect(() => { setPage(1) }, [timeframe, customRange, costCenterType, paymentStatus, search])

  const handleDeleteExpense = () => {
    if (!deleteTargetId) return
    deleteExpenseRecord(deleteTargetId)
    refreshExpenses()
    if (selectedExpenseForDetails?.id === deleteTargetId) setSelectedExpenseForDetails(null)
    setDeleteTargetId(null)
  }

  const handleSettleInstallmentSubmit = async (e) => {
    e.preventDefault()
    if (!selectedExpenseForDetails || !settlingInstallment || !settleTreasuryId) return
    const treasury = treasuryAccounts.find((t) => t.id === settleTreasuryId)
    const res = await settleExpenseInstallment(
      selectedExpenseForDetails.id, settlingInstallment.id,
      { treasuryId: settleTreasuryId, treasuryName: treasury ? treasury.name : '', method: settleMethod, date: settleDate, amount: settlingInstallment.amount },
      { storeState, setStoreState: useAXStore.setState, profile }
    )
    if (res?.success) { refreshExpenses(); setSelectedExpenseForDetails(res.expense); setSettlingInstallment(null) }
  }

  const kpiCards = [
    { title: 'إجمالي المصروفات', val: kpis.totalExpenses, sub: `${kpis.count} حركة`, color: 'text-on-surface', Icon: Receipt },
    { title: 'المدفوع نقداً وبنكياً', val: kpis.totalPaid, sub: 'تم خصمها من الخزائن', color: 'text-emerald-700', Icon: CheckCircle2 },
    { title: 'الالتزامات المؤجلة (آجل)', val: kpis.totalDeferred, sub: 'متبقي غير مسدد', color: 'text-amber-700', Icon: Clock },
    { title: 'أقساط قادمة مستحقة', val: kpis.upcomingInstallmentsTotal, sub: `${kpis.upcomingInstallmentsCount} قسط مجدول`, color: 'text-indigo-700', Icon: Calendar },
  ]

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface-lowest/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-outline-variant/30 shadow-level1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs"><Receipt className="w-6 h-6" /></div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-on-surface">المصروفات ومراكز التكلفة</h1>
            <p className="text-xs font-bold text-on-surface-variant">تسجيل وتقسيم المصروفات، سداد الأقساط، وتتبع مراكز التكلفة</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button type="button" onClick={() => setIsCategoriesModalOpen(true)} className="flex-1 sm:flex-initial h-10 px-4 rounded-full border border-outline-variant/40 bg-surface-lowest hover:bg-surface-container text-xs font-black text-on-surface flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"><FolderTree className="w-4 h-4 text-on-surface-variant" /><span>بنود المصروفات</span></button>
          <button type="button" onClick={() => setIsCreateModalOpen(true)} className="flex-1 sm:flex-initial h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-on-primary text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-level1 active:scale-95"><Plus className="w-4 h-4" /><span>تسجيل مصروف</span></button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {kpiCards.map((k, idx) => (
          <div key={idx} className="p-3.5 rounded-2xl bg-surface-lowest border border-outline-variant/30 shadow-level1">
            <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant mb-1.5"><span>{k.title}</span><k.Icon className="w-4 h-4 text-primary" /></div>
            <div className={`text-lg sm:text-2xl font-black ${k.color}`}>{k.val.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span></div>
            <div className="text-[11px] font-bold text-on-surface-variant mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface-lowest/90 backdrop-blur-md p-3.5 rounded-2xl border border-outline-variant/30 shadow-level1 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black text-on-surface-variant ml-1">الفترة:</span>
            {['today', 'week', 'month', 'all'].map((t) => (
              <button key={t} type="button" onClick={() => setTimeframe(t)} className={`h-8 px-3 rounded-full text-xs font-black transition-all cursor-pointer ${timeframe === t ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container/60 hover:bg-surface-container text-on-surface'}`}>{{ today: 'اليوم', week: '٧ أيام', month: 'هذا الشهر', all: 'الكل' }[t]}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black text-on-surface-variant ml-1">مركز التكلفة:</span>
            {[{ id: 'all', label: 'الكل' }, { id: EXPENSE_COST_CENTER_TYPES.WAREHOUSE, label: 'المخازن' }, { id: EXPENSE_COST_CENTER_TYPES.VEHICLE, label: 'السيارات' }, { id: EXPENSE_COST_CENTER_TYPES.FACTORY, label: 'المصنع' }, { id: EXPENSE_COST_CENTER_TYPES.GENERAL, label: 'عام' }].map((c) => (
              <button key={c.id} type="button" onClick={() => setCostCenterType(c.id)} className={`h-8 px-3 rounded-full text-xs font-black transition-all cursor-pointer ${costCenterType === c.id ? 'bg-on-surface text-surface-lowest shadow-xs' : 'bg-surface-container/60 hover:bg-surface-container text-on-surface'}`}>{c.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black text-on-surface-variant ml-1">السداد:</span>
            {[{ id: 'all', label: 'الكل' }, { id: 'paid', label: 'مدفوع كلي' }, { id: 'partial', label: 'مدفوع جزئي' }, { id: 'deferred', label: 'غير مدفوع' }].map((s) => (
              <button key={s.id} type="button" onClick={() => setPaymentStatus(s.id)} className={`h-8 px-2.5 rounded-full text-xs font-black transition-all cursor-pointer ${paymentStatus === s.id ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-surface-container/60 hover:bg-surface-container text-on-surface'}`}>{s.label}</button>
            ))}
          </div>
        </div>
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث سريع برقم المصروف، الوصف، جهة الصرف، أو مركز التكلفة..." className="w-full h-10 pr-10 pl-4 bg-surface-container/40 border border-outline-variant/30 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary" />
        </div>
      </div>

      <div className="hidden lg:block bg-surface-lowest rounded-3xl border border-outline-variant/30 shadow-level1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="h-11 bg-surface-container-low/60 border-b border-outline-variant/30 text-on-surface-variant font-black">
                <th className="px-4 whitespace-nowrap">الكود</th><th className="px-3 whitespace-nowrap">التاريخ</th><th className="px-3 whitespace-nowrap">مركز التكلفة</th><th className="px-3 whitespace-nowrap">البند والتصنيف</th><th className="px-3 whitespace-nowrap">البيان / المستفيد</th><th className="px-3 whitespace-nowrap text-left">الإجمالي</th><th className="px-3 whitespace-nowrap text-left">المدفوع</th><th className="px-3 whitespace-nowrap text-left">المتبقي</th><th className="px-3 whitespace-nowrap text-center">حالة السداد</th><th className="px-4 whitespace-nowrap text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {paginatedExpenses.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-xs font-bold text-on-surface-variant">لا توجد حركات مصروفات تطابق معايير الفلترة المحددة</td></tr>
              ) : (
                paginatedExpenses.map((exp) => (
                  <tr key={exp.id} className="h-12 hover:bg-surface-container/40 transition-colors">
                    <td className="px-4 font-mono font-black text-primary whitespace-nowrap">{exp.code}</td>
                    <td className="px-3 whitespace-nowrap font-bold text-on-surface-variant">{exp.date}</td>
                    <td className="px-3 whitespace-nowrap"><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface font-black text-[11px]">{exp.costCenter?.entityName || 'عام'}</span></td>
                    <td className="px-3 whitespace-nowrap font-bold text-on-surface truncate max-w-[200px]" title={exp.mainCategoryName}>{exp.mainCategoryName} {exp.subCategoryName ? `› ${exp.subCategoryName}` : ''}</td>
                    <td className="px-3 whitespace-nowrap font-bold text-on-surface truncate max-w-[180px]" title={exp.title}>{exp.title}</td>
                    <td className="px-3 whitespace-nowrap font-black text-on-surface text-left font-mono">{exp.totalAmount?.toLocaleString('en-US')}</td>
                    <td className="px-3 whitespace-nowrap font-bold text-emerald-700 text-left font-mono">{exp.paidAmount?.toLocaleString('en-US')}</td>
                    <td className="px-3 whitespace-nowrap font-bold text-amber-700 text-left font-mono">{exp.remainingAmount?.toLocaleString('en-US')}</td>
                    <td className="px-3 whitespace-nowrap text-center"><span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black ${exp.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' : exp.paymentStatus === 'partial' ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20' : 'bg-red-500/10 text-red-700 border border-red-500/20'}`}>{EXPENSE_STATUS_LABELS[exp.paymentStatus] || 'غير مدفوع'}</span></td>
                    <td className="px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button type="button" onClick={() => setSelectedExpenseForDetails(exp)} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-primary cursor-pointer transition-all active:scale-95" title="تفاصيل وسداد الأقساط"><Eye className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setDeleteTargetId(exp.id)} className="w-8 h-8 rounded-full hover:bg-red-500/10 flex items-center justify-center text-red-600 cursor-pointer transition-all active:scale-95" title="حذف المصروف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-3 bg-surface-container-low/40 border-t border-outline-variant/30 flex items-center justify-between text-xs font-black">
            <span className="text-on-surface-variant">صفحة {page} من {totalPages} ({filteredExpenses.length} مصروف)</span>
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-full border border-outline-variant/40 bg-surface-lowest hover:bg-surface-container disabled:opacity-40 cursor-pointer">السابق</button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-full border border-outline-variant/40 bg-surface-lowest hover:bg-surface-container disabled:opacity-40 cursor-pointer">التالي</button>
            </div>
          </div>
        )}
      </div>

      <div className="lg:hidden space-y-3">
        {paginatedExpenses.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-on-surface-variant bg-surface-lowest rounded-2xl border border-outline-variant/30">لا توجد حركات مصروفات مسجلة</div>
        ) : (
          paginatedExpenses.map((exp) => (
            <div key={exp.id} className="p-4 rounded-2xl bg-surface-lowest border border-outline-variant/30 shadow-level1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-xs text-primary">{exp.code}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${exp.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-700' : exp.paymentStatus === 'partial' ? 'bg-amber-500/10 text-amber-700' : 'bg-red-500/10 text-red-700'}`}>{EXPENSE_STATUS_LABELS[exp.paymentStatus]}</span>
              </div>
              <div>
                <h3 className="text-xs font-black text-on-surface">{exp.title}</h3>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant mt-1"><span>{exp.costCenter?.entityName}</span><span>•</span><span>{exp.mainCategoryName}</span></div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low/60 flex items-center justify-between text-xs font-black">
                <div><span className="text-[10px] text-on-surface-variant block font-bold">الإجمالي</span><span>{exp.totalAmount?.toLocaleString('en-US')} ج.م</span></div>
                <div><span className="text-[10px] text-emerald-700 block font-bold">المدفوع</span><span className="text-emerald-700">{exp.paidAmount?.toLocaleString('en-US')} ج.م</span></div>
                <div><span className="text-[10px] text-amber-700 block font-bold">المتبقي</span><span className="text-amber-700">{exp.remainingAmount?.toLocaleString('en-US')} ج.م</span></div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-bold text-on-surface-variant">{exp.date}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setSelectedExpenseForDetails(exp)} className="h-8 px-3 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center gap-1 cursor-pointer"><Eye className="w-3.5 h-3.5" /><span>التفاصيل</span></button>
                  <button type="button" onClick={() => setDeleteTargetId(exp.id)} className="h-8 px-2.5 rounded-full text-red-600 hover:bg-red-500/10 flex items-center justify-center cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button type="button" onClick={() => setIsCreateModalOpen(true)} className="lg:hidden fixed bottom-20 left-4 z-40 h-12 px-5 rounded-full bg-primary text-on-primary font-black text-xs flex items-center gap-2 shadow-level3 cursor-pointer active:scale-95"><Plus className="w-5 h-5" /><span>تسجيل مصروف</span></button>

      <AX_CreateExpenseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreated={refreshExpenses} />
      <AX_ExpenseCategoriesModal isOpen={isCategoriesModalOpen} onClose={() => setIsCategoriesModalOpen(false)} />

      {selectedExpenseForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-scrim/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-surface-lowest rounded-3xl shadow-level3 border border-outline-variant/30 overflow-hidden text-right">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-outline-variant/30 bg-surface-container-low/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Receipt className="w-5 h-5" /></div>
                <div><h2 className="text-base font-black text-on-surface">تفاصيل سند المصروف</h2><p className="text-xs font-bold text-on-surface-variant font-mono">{selectedExpenseForDetails.code}</p></div>
              </div>
              <button type="button" onClick={() => setSelectedExpenseForDetails(null)} className="w-9 h-9 rounded-full bg-surface-lowest border border-outline-variant/30 flex items-center justify-center cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-surface-container-low/40 p-3.5 rounded-2xl">
                <div><span className="text-[11px] font-bold text-on-surface-variant block">مركز التكلفة</span><span className="text-xs font-black text-on-surface">{selectedExpenseForDetails.costCenter?.entityName}</span></div>
                <div><span className="text-[11px] font-bold text-on-surface-variant block">البند الرئيسي</span><span className="text-xs font-black text-on-surface">{selectedExpenseForDetails.mainCategoryName}</span></div>
                <div><span className="text-[11px] font-bold text-on-surface-variant block">إجمالي القيمة</span><span className="text-xs font-black text-on-surface">{selectedExpenseForDetails.totalAmount?.toLocaleString('en-US')} ج.م</span></div>
                <div><span className="text-[11px] font-bold text-on-surface-variant block">المتبقي الآجل</span><span className="text-xs font-black text-amber-700">{selectedExpenseForDetails.remainingAmount?.toLocaleString('en-US')} ج.م</span></div>
              </div>
              {selectedExpenseForDetails.payments && selectedExpenseForDetails.payments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-on-surface">سجل المدفوعات المنفذة ({selectedExpenseForDetails.payments.length})</h3>
                  <div className="space-y-1.5">
                    {selectedExpenseForDetails.payments.map((p) => (
                      <div key={p.id} className="p-2.5 rounded-xl border border-outline-variant/20 bg-surface-lowest flex items-center justify-between text-xs font-bold">
                        <div><span className="text-on-surface">{p.treasuryName || 'خزينة'}</span><span className="text-on-surface-variant text-[11px] mr-2">({p.method === 'cash' ? 'نقدي' : p.method === 'bank_transfer' ? 'تحويل بنكي' : 'إنستاباي'})</span></div>
                        <div className="flex items-center gap-3"><span className="text-[11px] text-on-surface-variant">{p.date}</span><span className="font-mono font-black text-emerald-700">{p.amount?.toLocaleString('en-US')} ج.م</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedExpenseForDetails.installments && selectedExpenseForDetails.installments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-on-surface">جدول الأقساط المؤجلة ({selectedExpenseForDetails.installments.length})</h3>
                  <div className="space-y-2">
                    {selectedExpenseForDetails.installments.map((inst) => (
                      <div key={inst.id} className="p-3 rounded-xl border border-outline-variant/20 bg-surface-lowest flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2.5"><span className="font-black text-primary">قسط #{inst.installmentNumber}</span><span className="text-on-surface-variant font-bold">استحقاق: {inst.dueDate}</span></div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-on-surface">{inst.amount?.toLocaleString('en-US')} ج.م</span>
                          {inst.status === 'paid' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[11px] font-black">مسدد ({inst.paidDate})</span>
                          ) : (
                            <button type="button" onClick={() => setSettlingInstallment(inst)} className="px-3 py-1 rounded-full bg-primary text-on-primary text-[11px] font-black cursor-pointer shadow-xs active:scale-95">سداد القسط الآن</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {settlingInstallment && (
                <form onSubmit={handleSettleInstallmentSubmit} className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                  <div className="flex items-center justify-between text-xs font-black text-primary">
                    <span>سداد القسط #{settlingInstallment.installmentNumber} بمبلغ {settlingInstallment.amount?.toLocaleString('en-US')} ج.م</span>
                    <button type="button" onClick={() => setSettlingInstallment(null)} className="text-on-surface-variant cursor-pointer">إلغاء</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                    <AX_SearchableSelect
                      value={settleTreasuryId}
                      onChange={setSettleTreasuryId}
                      options={settleTreasuryOptions}
                      placeholder="اختر الخزينة..."
                      searchable={true}
                    />
                    <div className="inline-flex items-center gap-1 bg-surface-lowest p-1 rounded-2xl border border-outline-variant/30 w-full justify-around">
                      {[
                        { id: 'cash', label: 'نقدي' },
                        { id: 'bank_transfer', label: 'تحويل' },
                        { id: 'instapay', label: 'إنستاباي' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSettleMethod(m.id)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                            settleMethod === m.id
                              ? 'bg-primary text-on-primary shadow-xs'
                              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <AX_CompanyDatePicker value={settleDate} onChange={setSettleDate} />
                  </div>
                  <button type="submit" className="w-full py-2 rounded-xl bg-primary text-on-primary text-xs font-black cursor-pointer shadow-xs">تأكيد سداد القسط وخصم المبلغ من الخزينة</button>
                </form>
              )}
            </div>
            <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low/40 flex justify-end">
              <button type="button" onClick={() => setSelectedExpenseForDetails(null)} className="px-5 py-2 rounded-full border border-outline-variant/40 bg-surface-lowest text-xs font-black cursor-pointer">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      <AX_ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="تأكيد حذف المصروف"
        message="هل أنت متأكد من حذف هذا المصروف؟ سيتم إزالته من السجلات."
        confirmText="تأكيد الحذف"
        cancelText="تراجع"
        isDestructive={true}
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
