import React, { useState, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Barcode,
  Building,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_CustomersTable } from './AX_CustomersTable'
import { AX_CustomersBentoCards } from './AX_CustomersBentoCards'
import { AX_CustomerModal } from './AX_CustomerModal'
import { AX_CustomerDetailsModal } from './AX_CustomerDetailsModal'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { AX_SkeletonLoader } from '../common/AX_SkeletonLoader'
import { AX_CustomerOperationsService } from '../../services/AX_CustomerOperationsService'
import { showToast } from '../common/AX_Toast'

const PAGE_SIZE = 15

export function AX_CustomersManager() {
  const { clients = [], deleteClient, profile } = useAXStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [balanceFilter, setBalanceFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [detailsCustomer, setDetailsCustomer] = useState(null)
  const [deletingCustomer, setDeletingCustomer] = useState(null)

  const [currentPage, setCurrentPage] = useState(1)
  const activeModal = useAXStore((s) => s.activeModal)
  const closeModal = useAXStore((s) => s.closeModal)

  useEffect(() => {
    if (activeModal === 'add_customer' || activeModal === 'create_customer') {
      setIsAddOpen(true)
      closeModal()
    }
  }, [activeModal, closeModal])

  const categories = useMemo(() => {
    const catSet = new Set()
    clients.forEach((c) => {
      if (c.primaryCategory) catSet.add(c.primaryCategory)
    })
    return ['all', ...Array.from(catSet)]
  }, [clients])

  const filteredCustomers = useMemo(() => {
    return clients.filter((c) => {
      const q = searchQuery.trim().toLowerCase()
      if (q) {
        const matchName = (c.name || '').toLowerCase().includes(q)
        const matchPhone = (c.phone || '').toLowerCase().includes(q)
        const matchPhone2 = (c.phone2 || '').toLowerCase().includes(q)
        const matchGov = (c.governorate || '').toLowerCase().includes(q)
        const matchCity = (c.city || '').toLowerCase().includes(q)
        const matchDistrict = (c.district || '').toLowerCase().includes(q)
        const matchCR = (c.commercialRegister || '').toLowerCase().includes(q)
        if (!matchName && !matchPhone && !matchPhone2 && !matchGov && !matchCity && !matchDistrict && !matchCR) {
          return false
        }
      }

      if (selectedCategory !== 'all' && c.primaryCategory !== selectedCategory) {
        return false
      }

      const bal = Number(c.balance) || 0
      if (balanceFilter === 'debtor' && bal <= 0) return false
      if (balanceFilter === 'creditor' && bal >= 0) return false
      if (balanceFilter === 'zero' && bal !== 0) return false
      if (balanceFilter === 'incomplete' && !c.isIncomplete) return false

      return true
    })
  }, [clients, searchQuery, balanceFilter, selectedCategory])

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE))
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredCustomers.slice(start, start + PAGE_SIZE)
  }, [filteredCustomers, currentPage])

  const totalReceivables = useMemo(() => {
    return clients.reduce((sum, c) => {
      const bal = Number(c.balance) || 0
      return bal > 0 ? sum + bal : sum
    }, 0)
  }, [clients])

  const totalPayablesAdvance = useMemo(() => {
    return clients.reduce((sum, c) => {
      const bal = Number(c.balance) || 0
      return bal < 0 ? sum + Math.abs(bal) : sum
    }, 0)
  }, [clients])

  const totalDebtorsCount = useMemo(() => {
    return clients.filter((c) => (Number(c.balance) || 0) > 0).length
  }, [clients])

  const totalCreditorsCount = useMemo(() => {
    return clients.filter((c) => (Number(c.balance) || 0) < 0).length
  }, [clients])

  const totalIncompleteCount = useMemo(() => {
    return clients.filter((c) => c.isIncomplete).length
  }, [clients])

  const handleDeleteConfirm = () => {
    if (!deletingCustomer) return
    deleteClient(deletingCustomer.id)
    AX_CustomerOperationsService.deleteCustomerInDB(deletingCustomer.id, profile)
    showToast('تم حذف العميل بنجاح', 'success')
    setDeletingCustomer(null)
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-on-surface">إدارة حسابات العملاء</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="self-start sm:self-center py-2.5 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-black shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة عميل</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs">
          <span className="text-[11px] font-bold text-on-surface-variant block">إجمالي العملاء</span>
          <span className="text-sm sm:text-base font-black font-mono text-on-surface">{clients.length}</span>
        </div>
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs">
          <span className="text-[11px] font-bold text-on-surface-variant block">ذمم مدينة (عليهم)</span>
          <span className="text-sm sm:text-base font-black font-mono text-red-800">
            {totalReceivables.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-on-surface-variant block font-bold">({totalDebtorsCount} عميل)</span>
        </div>
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs">
          <span className="text-[11px] font-bold text-on-surface-variant block">دفعات مقدمة (لهم)</span>
          <span className="text-sm sm:text-base font-black font-mono text-emerald-700">
            {totalPayablesAdvance.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-on-surface-variant block font-bold">({totalCreditorsCount} عميل)</span>
        </div>
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-xs">
          <span className="text-[11px] font-bold text-on-surface-variant block">بيانات ناقصة</span>
          <span className="text-sm sm:text-base font-black font-mono text-amber-700">{totalIncompleteCount}</span>
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
            placeholder="بحث بالاسم، الهاتف، المحافظة، المركز، أو السجل..."
            className="w-full pl-3 pr-10 py-2 rounded-full border border-outline-variant/50 focus:border-primary text-xs sm:text-sm bg-surface-lowest text-on-surface outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => { setBalanceFilter('all'); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
              balanceFilter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            الكل ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => { setBalanceFilter('debtor'); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
              balanceFilter === 'debtor'
                ? 'bg-red-800 text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            مدين ({totalDebtorsCount})
          </button>
          <button
            type="button"
            onClick={() => { setBalanceFilter('creditor'); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
              balanceFilter === 'creditor'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            دائن ({totalCreditorsCount})
          </button>
          <button
            type="button"
            onClick={() => { setBalanceFilter('incomplete'); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
              balanceFilter === 'incomplete'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            بيانات ناقصة ({totalIncompleteCount})
          </button>
        </div>
      </div>

      {categories.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { setSelectedCategory(cat); setCurrentPage(1) }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-on-surface text-surface-lowest'
                  : 'bg-surface-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {cat === 'all' ? 'كافة التصنيفات' : cat}
            </button>
          ))}
        </div>
      )}

      {filteredCustomers.length === 0 ? (
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-10 text-center space-y-2">
          <p className="text-sm font-bold text-on-surface">لا يوجد عملاء مطابقين للبحث أو الفلتر المختار.</p>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إضافة عميل جديد الآن</span>
          </button>
        </div>
      ) : (
        <>
          <AX_CustomersTable
            customers={paginatedCustomers}
            onOpenDetails={setDetailsCustomer}
            onOpenLedger={setDetailsCustomer}
            onEditCustomer={setEditingCustomer}
            onDeleteCustomer={setDeletingCustomer}
          />

          <AX_CustomersBentoCards
            customers={paginatedCustomers}
            onOpenDetails={setDetailsCustomer}
            onOpenLedger={setDetailsCustomer}
            onEditCustomer={setEditingCustomer}
            onDeleteCustomer={setDeletingCustomer}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 bg-surface-lowest border border-outline-variant/30 rounded-2xl text-xs font-bold text-on-surface-variant">
              <span>عرض {((currentPage - 1) * PAGE_SIZE) + 1} إلى {Math.min(currentPage * PAGE_SIZE, filteredCustomers.length)} من {filteredCustomers.length}</span>
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
        className="fixed bottom-20 lg:bottom-8 left-6 z-30 py-3 px-5 rounded-full bg-primary hover:bg-primary-dark text-white font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 hover:-translate-y-1 active:translate-y-0 transition-all"
        title="إضافة عميل جديد (FAB)"
      >
        <UserPlus className="w-4 h-4" />
        <span>إضافة عميل</span>
      </button>

      <AX_CustomerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        customer={null}
      />

      <AX_CustomerModal
        isOpen={Boolean(editingCustomer)}
        onClose={() => setEditingCustomer(null)}
        customer={editingCustomer}
      />

      <AX_CustomerDetailsModal
        isOpen={Boolean(detailsCustomer)}
        onClose={() => setDetailsCustomer(null)}
        customer={detailsCustomer}
      />

      <AX_ConfirmModal
        isOpen={Boolean(deletingCustomer)}
        title="حذف العميل"
        message={`هل أنت متأكد من حذف العميل (${deletingCustomer?.name}) نهائياً من المنظومة؟`}
        confirmText="تأكيد الحذف"
        cancelText="إلغاء"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingCustomer(null)}
      />
    </div>
  )
}

export default AX_CustomersManager
