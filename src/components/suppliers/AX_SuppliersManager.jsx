import React, { useState, useMemo, useEffect } from 'react'
import {
  Building2,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Layers,
  ChevronRight,
  ChevronLeft,
  Truck,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_SuppliersTable } from './AX_SuppliersTable'
import { AX_SuppliersBentoCards } from './AX_SuppliersBentoCards'
import { AX_SupplierModal } from './AX_SupplierModal'
import { AX_SupplierDetailsModal } from './AX_SupplierDetailsModal'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { AX_SupplierOperationsService } from '../../services/AX_SupplierOperationsService'
import { showToast } from '../common/AX_Toast'
import { SUPPLY_TYPES } from './supplierConstants'

const PAGE_SIZE = 15

export function AX_SuppliersManager() {
  const { suppliers = [], deleteSupplier, profile } = useAXStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [balanceFilter, setBalanceFilter] = useState('all')
  const [supplyTypeFilter, setSupplyTypeFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [detailsSupplier, setDetailsSupplier] = useState(null)
  const [deletingSupplier, setDeletingSupplier] = useState(null)

  const [currentPage, setCurrentPage] = useState(1)
  const activeModal = useAXStore((s) => s.activeModal)
  const closeModal = useAXStore((s) => s.closeModal)

  useEffect(() => {
    if (activeModal === 'add_supplier' || activeModal === 'create_supplier') {
      setIsAddOpen(true)
      closeModal()
    }
  }, [activeModal, closeModal])

  const categories = useMemo(() => {
    const set = new Set()
    suppliers.forEach((s) => {
      if (s.category) set.add(s.category)
    })
    return ['all', ...Array.from(set)]
  }, [suppliers])

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.trim().toLowerCase()
      if (q) {
        const matchName = (s.companyName || s.name || '').toLowerCase().includes(q)
        const matchContact = (s.contactPerson || '').toLowerCase().includes(q)
        const matchPhone = (s.phone || '').toLowerCase().includes(q)
        const matchPhone2 = (s.phone2 || '').toLowerCase().includes(q)
        const matchAddress = (s.address || '').toLowerCase().includes(q)
        const matchTax = (s.taxNumber || '').toLowerCase().includes(q)
        const matchCR = (s.commercialRegistration || s.commercialRegister || '').toLowerCase().includes(q)
        if (!matchName && !matchContact && !matchPhone && !matchPhone2 && !matchAddress && !matchTax && !matchCR) {
          return false
        }
      }

      if (supplyTypeFilter !== 'all') {
        const supType = s.supplyType || 'frozen_meat'
        if (supType !== supplyTypeFilter) {
          if (supplyTypeFilter === 'frozen_meat' && (supType === 'direct_importer' || supType === 'local_farms')) {
          } else if (supplyTypeFilter === 'fish' && supType === 'أسماك بحرية') {
          } else if (supplyTypeFilter === 'poultry' && supType === 'دواجن ومجزءات') {
          } else {
            return false
          }
        }
      }

      if (selectedCategory !== 'all' && s.category !== selectedCategory) {
        return false
      }

      const bal = Number(s.balance) || 0
      if (balanceFilter === 'payable' && bal <= 0) return false
      if (balanceFilter === 'receivable' && bal >= 0) return false
      if (balanceFilter === 'zero' && bal !== 0) return false

      return true
    })
  }, [suppliers, searchQuery, balanceFilter, supplyTypeFilter, selectedCategory])

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / PAGE_SIZE))
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredSuppliers.slice(start, start + PAGE_SIZE)
  }, [filteredSuppliers, currentPage])

  const totalPayables = useMemo(() => {
    return suppliers.reduce((sum, s) => {
      const bal = Number(s.balance) || 0
      return bal > 0 ? sum + bal : sum
    }, 0)
  }, [suppliers])

  const totalReceivables = useMemo(() => {
    return suppliers.reduce((sum, s) => {
      const bal = Number(s.balance) || 0
      return bal < 0 ? sum + Math.abs(bal) : sum
    }, 0)
  }, [suppliers])

  const totalPayableCount = useMemo(() => {
    return suppliers.filter((s) => (Number(s.balance) || 0) > 0).length
  }, [suppliers])

  const totalReceivableCount = useMemo(() => {
    return suppliers.filter((s) => (Number(s.balance) || 0) < 0).length
  }, [suppliers])

  const totalZeroCount = useMemo(() => {
    return suppliers.filter((s) => (Number(s.balance) || 0) === 0).length
  }, [suppliers])

  const handleDeleteConfirm = () => {
    if (!deletingSupplier) return
    deleteSupplier(deletingSupplier.id)
    AX_SupplierOperationsService.deleteSupplierInDB(deletingSupplier.id, profile)
    showToast('تم حذف المورد بنجاح', 'success')
    setDeletingSupplier(null)
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-on-surface">إدارة حسابات الموردين والجهات</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="self-start sm:self-center py-2.5 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-black shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مورد</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs">
          <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي الموردين</span>
          <span className="text-sm sm:text-base font-black font-mono text-on-surface">{suppliers.length}</span>
        </div>
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs">
          <span className="text-[11px] font-bold text-on-surface-variant block">مستحقات للموردين (لهم)</span>
          <span className="text-sm sm:text-base font-black font-mono text-red-800">
            {totalPayables.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-on-surface-variant block font-bold">({totalPayableCount} مورد)</span>
        </div>
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs">
          <span className="text-[11px] font-bold text-on-surface-variant block">دفعات مقدمة (عليهم)</span>
          <span className="text-sm sm:text-base font-black font-mono text-emerald-700">
            {totalReceivables.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-on-surface-variant block font-bold">({totalReceivableCount} مورد)</span>
        </div>
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs">
          <span className="text-[11px] font-bold text-on-surface-variant block">حسابات متوازنة (صفر)</span>
          <span className="text-sm sm:text-base font-black font-mono text-on-surface-variant">{totalZeroCount}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-surface-lowest border border-outline-variant/30 rounded-2xl p-2.5 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-outline-variant absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="بحث باسم الشركة، المسؤول، الهاتف، السجل، أو البطاقة الضريبية..."
            className="w-full pl-3 pr-10 py-2 rounded-full border border-outline-variant/50 focus:border-primary text-xs sm:text-sm bg-surface-lowest text-on-surface outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => { setBalanceFilter('all'); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
              balanceFilter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            الكل ({suppliers.length})
          </button>
          <button
            type="button"
            onClick={() => { setBalanceFilter('payable'); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
              balanceFilter === 'payable'
                ? 'bg-red-800 text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            مستحق له ({totalPayableCount})
          </button>
          <button
            type="button"
            onClick={() => { setBalanceFilter('receivable'); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
              balanceFilter === 'receivable'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            مقدم له ({totalReceivableCount})
          </button>
          <button
            type="button"
            onClick={() => { setBalanceFilter('zero'); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
              balanceFilter === 'zero'
                ? 'bg-surface-container text-on-surface shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            صفر ({totalZeroCount})
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
        <button
          type="button"
          onClick={() => { setSupplyTypeFilter('all'); setCurrentPage(1) }}
          className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
            supplyTypeFilter === 'all'
              ? 'bg-on-surface text-surface-lowest'
              : 'bg-surface-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          كافة أنواع التوريد
        </button>
        {SUPPLY_TYPES.slice(0, 7).map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => { setSupplyTypeFilter(st.id); setCurrentPage(1) }}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
              supplyTypeFilter === st.id
                ? 'bg-primary text-white'
                : 'bg-surface-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {categories.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { setSelectedCategory(cat); setCurrentPage(1) }}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-primary/20 text-primary border border-primary/30 font-black'
                  : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {cat === 'all' ? 'كافة الأقسام' : cat}
            </button>
          ))}
        </div>
      )}

      {filteredSuppliers.length === 0 ? (
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-10 text-center space-y-2">
          <p className="text-sm font-bold text-on-surface">لا يوجد موردين مطابقين للبحث أو الفلتر المختار.</p>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة مورد جديد الآن</span>
          </button>
        </div>
      ) : (
        <>
          <AX_SuppliersTable
            suppliers={paginatedSuppliers}
            onOpenDetails={setDetailsSupplier}
            onOpenLedger={setDetailsSupplier}
            onEditSupplier={setEditingSupplier}
            onDeleteSupplier={setDeletingSupplier}
          />

          <AX_SuppliersBentoCards
            suppliers={paginatedSuppliers}
            onOpenDetails={setDetailsSupplier}
            onOpenLedger={setDetailsSupplier}
            onEditSupplier={setEditingSupplier}
            onDeleteSupplier={setDeletingSupplier}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 bg-surface-lowest border border-outline-variant/30 rounded-2xl text-xs font-bold text-on-surface-variant">
              <span>عرض {((currentPage - 1) * PAGE_SIZE) + 1} إلى {Math.min(currentPage * PAGE_SIZE, filteredSuppliers.length)} من {filteredSuppliers.length}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="font-mono font-black px-2">{currentPage} / {totalPages}</span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container disabled:opacity-40 transition-all cursor-pointer"
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
        title="إضافة مورد جديد (FAB)"
      >
        <Plus className="w-4 h-4" />
        <span>إضافة مورد</span>
      </button>

      <AX_SupplierModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        supplier={null}
      />

      <AX_SupplierModal
        isOpen={Boolean(editingSupplier)}
        onClose={() => setEditingSupplier(null)}
        supplier={editingSupplier}
      />

      <AX_SupplierDetailsModal
        isOpen={Boolean(detailsSupplier)}
        onClose={() => setDetailsSupplier(null)}
        supplier={detailsSupplier}
      />

      <AX_ConfirmModal
        isOpen={Boolean(deletingSupplier)}
        title="حذف المورد"
        message={`هل أنت متأكد من حذف المورد (${deletingSupplier?.companyName || deletingSupplier?.name}) نهائياً من المنظومة؟`}
        confirmText="تأكيد الحذف"
        cancelText="إلغاء"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingSupplier(null)}
      />
    </div>
  )
}

export default AX_SuppliersManager
