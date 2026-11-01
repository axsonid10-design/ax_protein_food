import React, { useState, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Target,
  BadgePercent,
  TrendingUp,
  DollarSign,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_SalesRepsTable } from './AX_SalesRepsTable'
import { AX_SalesRepsBentoCards } from './AX_SalesRepsBentoCards'
import { AX_AddSalesRepModal } from './AX_AddSalesRepModal'
import { AX_EditSalesRepModal } from './AX_EditSalesRepModal'
import { AX_SalesRepCommissionModal } from './AX_SalesRepCommissionModal'
import { AX_SalesRepLedgerModal } from './AX_SalesRepLedgerModal'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { showToast } from '../common/AX_Toast'
import { AX_SkeletonLoader } from '../common/AX_SkeletonLoader'
import { AX_SalesRepOperationsService } from '../../services/AX_SalesRepOperationsService.js'

const PAGE_SIZE = 15

export function AX_SalesRepsManager() {
  const { profile, salesReps = [], isAuthLoading, deleteSalesRep } = useAXStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [modelFilter, setModelFilter] = useState('all')

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingRep, setEditingRep] = useState(null)
  const [calculatorRep, setCalculatorRep] = useState(null)
  const [ledgerRep, setLedgerRep] = useState(null)
  const [deletingRep, setDeletingRep] = useState(null)

  const [currentPage, setCurrentPage] = useState(1)

  const filteredReps = useMemo(() => {
    return (salesReps || []).filter((r) => {
      const q = searchQuery.trim().toLowerCase()
      if (q) {
        const matchName = (r.name || '').toLowerCase().includes(q)
        const matchPhone = (r.phone || '').toLowerCase().includes(q)
        const matchBranch = (r.assignedBranch || '').toLowerCase().includes(q)
        const matchCode = (r.code || '').toLowerCase().includes(q)
        const matchArea = (r.assignedArea || r.territory || '').toLowerCase().includes(q)
        if (!matchName && !matchPhone && !matchBranch && !matchCode && !matchArea) return false
      }

      if (modelFilter !== 'all' && r.commissionModel !== modelFilter) {
        return false
      }

      return true
    })
  }, [salesReps, searchQuery, modelFilter])

  const totalPages = Math.max(1, Math.ceil(filteredReps.length / PAGE_SIZE))
  const paginatedReps = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredReps.slice(start, start + PAGE_SIZE)
  }, [filteredReps, currentPage])

  const totalTarget = useMemo(() => {
    return (salesReps || []).reduce((sum, r) => sum + (Number(r.targetAmount ?? r.salesTarget) || 0), 0)
  }, [salesReps])

  const totalCommissionsDue = useMemo(() => {
    return (salesReps || []).reduce((sum, r) => {
      const b = Number(r.netBalance ?? r.currentBalance ?? r.balance) || 0
      return b > 0 ? sum + b : sum
    }, 0)
  }, [salesReps])

  const handleDeleteConfirm = () => {
    if (!deletingRep) return
    deleteSalesRep(deletingRep.id)
    AX_SalesRepOperationsService.deleteSalesRepInDB(deletingRep.id, profile)
    showToast('تم حذف المندوب بنجاح', 'success')
    setDeletingRep(null)
  }

  if (isAuthLoading) {
    return (
      <div className="w-full space-y-4">
        <AX_SkeletonLoader type="table" count={5} />
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <BadgePercent className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-on-surface">إدارة مناديب المبيعات والعمولات</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="self-start sm:self-center py-2.5 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-black shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مندوب</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs">
          <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي المناديب</span>
          <span className="text-sm sm:text-base font-black font-mono text-on-surface">{salesReps.length}</span>
        </div>
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs">
          <span className="text-[11px] font-bold text-on-surface-variant block">المستهدف البيعي الكلي</span>
          <span className="text-sm sm:text-base font-black font-mono text-primary">
            {totalTarget.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs">
          <span className="text-[11px] font-bold text-on-surface-variant block">عمولات مستحقة لهم</span>
          <span className="text-sm sm:text-base font-black font-mono text-emerald-700">
            {totalCommissionsDue.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs">
          <span className="text-[11px] font-bold text-on-surface-variant block">شرائح العمولات</span>
          <span className="text-sm sm:text-base font-black font-mono text-on-surface-variant">4 أنظمة</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-surface-lowest border border-outline-variant/30 rounded-2xl p-2.5 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-outline-variant absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="بحث باسم المندوب، الفرع، أو الهاتف..."
            className="w-full pl-3 pr-9 py-2 rounded-full border border-outline-variant/50 focus:border-primary text-xs sm:text-sm bg-surface-lowest text-on-surface outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => { setModelFilter('all'); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
              modelFilter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            الكل ({salesReps.length})
          </button>
          <button
            type="button"
            onClick={() => { setModelFilter('volume_rate'); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
              modelFilter === 'volume_rate'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            شريحة مبيعات
          </button>
          <button
            type="button"
            onClick={() => { setModelFilter('target_tier'); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
              modelFilter === 'target_tier'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            شرائح تارجت
          </button>
          <button
            type="button"
            onClick={() => { setModelFilter('category_percentage'); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
              modelFilter === 'category_percentage'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            نسبة أصناف
          </button>
          <button
            type="button"
            onClick={() => { setModelFilter('hybrid'); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
              modelFilter === 'hybrid'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            نظام هجين
          </button>
        </div>
      </div>

      {filteredReps.length === 0 ? (
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-10 text-center space-y-2">
          <p className="text-sm font-bold text-on-surface">لا يوجد مناديب مطابقين للبحث أو الفلتر المختار.</p>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إضافة مندوب مبيعات جديد</span>
          </button>
        </div>
      ) : (
        <>
          <AX_SalesRepsTable
            salesReps={paginatedReps}
            onOpenLedger={setLedgerRep}
            onOpenCalculator={setCalculatorRep}
            onEditRep={setEditingRep}
            onDeleteRep={setDeletingRep}
          />

          <AX_SalesRepsBentoCards
            salesReps={paginatedReps}
            onOpenLedger={setLedgerRep}
            onOpenCalculator={setCalculatorRep}
            onEditRep={setEditingRep}
            onDeleteRep={setDeletingRep}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 bg-surface-lowest border border-outline-variant/30 rounded-2xl text-xs font-bold text-on-surface-variant">
              <span>عرض {((currentPage - 1) * PAGE_SIZE) + 1} إلى {Math.min(currentPage * PAGE_SIZE, filteredReps.length)} من {filteredReps.length}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container disabled:opacity-40 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="font-mono font-black px-2">{currentPage} / {totalPages}</span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container disabled:opacity-40 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-20 lg:bottom-8 left-6 z-30 py-3 px-5 rounded-full bg-primary hover:bg-primary-dark text-white font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 hover:-translate-y-1 active:translate-y-0 transition-all cursor-pointer"
        title="إضافة مندوب جديد (FAB)"
      >
        <UserPlus className="w-4 h-4" />
        <span>إضافة مندوب</span>
      </button>

      <AX_AddSalesRepModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      <AX_EditSalesRepModal
        rep={editingRep}
        isOpen={Boolean(editingRep)}
        onClose={() => setEditingRep(null)}
      />

      <AX_SalesRepCommissionModal
        rep={calculatorRep}
        isOpen={Boolean(calculatorRep)}
        onClose={() => setCalculatorRep(null)}
      />

      <AX_SalesRepLedgerModal
        rep={ledgerRep}
        isOpen={Boolean(ledgerRep)}
        onClose={() => setLedgerRep(null)}
      />

      <AX_ConfirmModal
        isOpen={Boolean(deletingRep)}
        title="حذف المندوب"
        message={`هل أنت متأكد من حذف المندوب (${deletingRep?.name}) نهائياً من المنظومة؟`}
        confirmText="تأكيد الحذف"
        cancelText="إلغاء"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingRep(null)}
      />
    </div>
  )
}

export default AX_SalesRepsManager
