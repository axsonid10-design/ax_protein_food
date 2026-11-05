import React, { useState, useMemo } from 'react'
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  Printer,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  DollarSign,
} from 'lucide-react'
import {
  formatCurrency,
  formatNumber,
  exportToCsv,
} from '../../utils/reportCalculations'

export function AX_AgingDebtsReport({
  clients = [],
  suppliers = [],
  invoices = [],
}) {
  const [debtType, setDebtType] = useState('clients')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const agingData = useMemo(() => {
    const list = debtType === 'clients' ? clients : suppliers
    const targetType = debtType === 'clients' ? 'sale' : 'purchase'

    let totalAll = 0
    let totalUnder30 = 0
    let total31To60 = 0
    let total61To90 = 0
    let totalOver90 = 0

    const rows = list.map((party) => {
      const balance = Number(party.balance) || 0
      totalAll += balance

      const partyInvoices = invoices.filter(
        (inv) => inv.partyName === party.name && inv.type === targetType && Number(inv.remainingAmount) > 0
      )

      let under30 = 0
      let d31To60 = 0
      let d61To90 = 0
      let over90 = 0

      if (partyInvoices.length > 0) {
        const now = new Date()
        partyInvoices.forEach((inv) => {
          const rawDate = inv.date || inv.operationalDate || inv.createdAt
          const invDate = rawDate ? new Date(rawDate) : now
          const diffDays = Math.max(0, Math.floor((now - invDate) / (1000 * 60 * 60 * 24)))
          const rem = Number(inv.remainingAmount) || 0

          if (diffDays <= 30) {
            under30 += rem
          } else if (diffDays <= 60) {
            d31To60 += rem
          } else if (diffDays <= 90) {
            d61To90 += rem
          } else {
            over90 += rem
          }
        })

        const invoicesTotal = under30 + d31To60 + d61To90 + over90
        const unallocated = balance - invoicesTotal
        if (unallocated > 0) {
          under30 += unallocated
        }
      } else if (balance > 0) {
        const now = new Date()
        const rawCreated = party.createdAt || party.created_at
        const partyDate = rawCreated ? new Date(rawCreated) : now
        const diffDays = Math.max(0, Math.floor((now - partyDate) / (1000 * 60 * 60 * 24)))

        if (diffDays <= 30) {
          under30 = balance
        } else if (diffDays <= 60) {
          d31To60 = balance
        } else if (diffDays <= 90) {
          d61To90 = balance
        } else {
          over90 = balance
        }
      }

      totalUnder30 += under30
      total31To60 += d31To60
      total61To90 += d61To90
      totalOver90 += over90

      let riskLevel = 'منخفض'
      if (over90 > 0 || d61To90 > balance * 0.4) {
        riskLevel = 'حرج'
      } else if (d31To60 > balance * 0.3) {
        riskLevel = 'متوسط'
      }

      return {
        id: party.id,
        name: party.name,
        phone: party.phone || 'غير مسجل',
        address: party.address || 'الفرع الرئيسي',
        balance,
        under30,
        d31To60,
        d61To90,
        over90,
        riskLevel,
      }
    })

    rows.sort((a, b) => b.balance - a.balance)

    return {
      totalAll,
      totalUnder30,
      total31To60,
      total61To90,
      totalOver90,
      rows,
    }
  }, [clients, suppliers, invoices, debtType])

  const totalPages = Math.ceil(agingData.rows.length / pageSize) || 1
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return agingData.rows.slice(start, start + pageSize)
  }, [agingData.rows, currentPage])

  const handleExport = () => {
    const headers = [
      'اسم الطرف',
      'الهاتف',
      'العنوان',
      'إجمالي المديونية (ج.م)',
      '0 - 30 يوم (ج.م)',
      '31 - 60 يوم (ج.م)',
      '61 - 90 يوم (ج.م)',
      '+90 يوم متعثر (ج.م)',
      'درجة المخاطر',
    ]
    const data = agingData.rows.map((r) => [
      r.name,
      r.phone,
      r.address,
      r.balance,
      r.under30,
      r.d31To60,
      r.d61To90,
      r.over90,
      r.riskLevel,
    ])
    exportToCsv(
      `أعمار_الديون_${debtType === 'clients' ? 'العملاء' : 'الموردين'}_${new Date().toISOString().split('T')[0]}`,
      headers,
      data
    )
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-on-surface">
              تقرير أعمار الديون والمستحقات (Aging of Accounts)
            </h3>
            <span className="text-[11px] font-bold text-on-surface-variant">
              تحليل آجال استحقاق الأرصدة وفرز المتأخرات والديون الحرجة
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleExport}
              className="px-3.5 py-1.5 rounded-full bg-surface-low hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>تصدير Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-full bg-primary text-white hover:bg-primary-dark text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة A4</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-surface-low rounded-full border border-outline-variant/30 w-fit">
          <button
            type="button"
            onClick={() => {
              setDebtType('clients')
              setCurrentPage(1)
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              debtType === 'clients'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface hover:text-primary'
            }`}
          >
            مديونيات العملاء (Receivables)
          </button>
          <button
            type="button"
            onClick={() => {
              setDebtType('suppliers')
              setCurrentPage(1)
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              debtType === 'suppliers'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface hover:text-primary'
            }`}
          >
            مستحقات الموردين (Payables)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>إجمالي المديونيات</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-base sm:text-lg font-black text-on-surface mt-1">
            {formatCurrency(agingData.totalAll)}
          </div>
          <div className="text-[10px] font-bold text-on-surface-variant mt-0.5">
            على {agingData.rows.length} حساب
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>ديون جارية (0-30 يوم)</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-600 mt-1">
            {formatCurrency(agingData.totalUnder30)}
          </div>
          <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
            ضمن فترة الائتمان المقررة
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>متوسطة التأخر (31-60 يوم)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-amber-700 mt-1">
            {formatCurrency(agingData.total31To60)}
          </div>
          <div className="text-[10px] font-bold text-amber-700 mt-0.5">
            تحتاج متابعة وتذكير
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold">
            <span>حرجة ومتعثرة (+60 يوم)</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-rose-700 mt-1">
            {formatCurrency(agingData.total61To90 + agingData.totalOver90)}
          </div>
          <div className="text-[10px] font-bold text-rose-700 mt-0.5">
            إيقاف الائتمان ومطالبة فورية
          </div>
        </div>
      </div>

      <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-surface-low/80 border-b border-surface-container text-on-surface-variant font-black">
                <th className="py-3 px-3.5">اسم الطرف</th>
                <th className="py-3 px-3.5 whitespace-nowrap">الهاتف</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">إجمالي الرصيد</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">0 - 30 يوم</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">31 - 60 يوم</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">61 - 90 يوم</th>
                <th className="py-3 px-3.5 text-left whitespace-nowrap">+90 يوم</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">درجة المخاطر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container/60 font-bold">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-on-surface-variant text-xs">
                    لا توجد حسابات مسجلة
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-low/40 transition-colors h-11">
                    <td className="py-2.5 px-3.5 text-on-surface font-black max-w-[200px] truncate">
                      {r.name}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-on-surface-variant whitespace-nowrap">
                      {r.phone}
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono font-black text-on-surface whitespace-nowrap">
                      {formatCurrency(r.balance)}
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono text-emerald-600 whitespace-nowrap">
                      {formatCurrency(r.under30)}
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono text-amber-700 whitespace-nowrap">
                      {formatCurrency(r.d31To60)}
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono text-rose-700 whitespace-nowrap">
                      {formatCurrency(r.d61To90)}
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono font-black text-rose-700 whitespace-nowrap">
                      {formatCurrency(r.over90)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          r.riskLevel === 'حرج'
                            ? 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
                            : r.riskLevel === 'متوسط'
                            ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                        }`}
                      >
                        {r.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden divide-y divide-surface-container/60 p-3 space-y-2.5">
          {paginatedRows.length === 0 ? (
            <div className="py-6 text-center text-on-surface-variant text-xs font-bold">
              لا توجد حسابات مسجلة
            </div>
          ) : (
            paginatedRows.map((r) => (
              <div key={r.id} className="bg-surface-low/50 rounded-2xl p-3 space-y-2 border border-outline-variant/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-on-surface truncate">{r.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      r.riskLevel === 'حرج'
                        ? 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                    }`}
                  >
                    {r.riskLevel}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-surface-container/50 text-[11px] font-bold">
                  <span className="text-on-surface-variant font-mono">{r.phone}</span>
                  <span className="font-mono font-black text-rose-700">{formatCurrency(r.balance)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-surface-container text-xs font-bold text-on-surface-variant">
            <span>
              عرض {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, agingData.rows.length)} من {agingData.rows.length} حساب
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-full hover:bg-surface-low disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-on-surface font-black">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-full hover:bg-surface-low disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
