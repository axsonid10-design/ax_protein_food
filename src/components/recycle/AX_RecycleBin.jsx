import React, { useState, useMemo } from 'react'
import {
  Trash2,
  RotateCcw,
  Search,
  Filter,
  FileText,
  Boxes,
  Users,
  Building2,
  ArrowLeftRight,
  ClipboardCheck,
  Calendar,
  User,
  AlertTriangle,
  Receipt,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { axToast } from '../common/AX_Toast'

const TYPE_CONFIG = {
  invoice: { label: 'فاتورة', icon: FileText, color: 'text-blue-700 bg-blue-500/10 border-blue-500/20' },
  item: { label: 'صنف', icon: Boxes, color: 'text-primary bg-primary/10 border-primary/20' },
  client: { label: 'عميل', icon: Users, color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20' },
  customer: { label: 'عميل', icon: Users, color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20' },
  supplier: { label: 'مورد', icon: Building2, color: 'text-amber-700 bg-amber-500/10 border-amber-500/20' },
  transfer: { label: 'إذن تحويل', icon: ArrowLeftRight, color: 'text-purple-700 bg-purple-500/10 border-purple-500/20' },
  audit: { label: 'محضر جرد', icon: ClipboardCheck, color: 'text-rose-700 bg-rose-500/10 border-rose-500/20' },
  expense: { label: 'مصروف', icon: Receipt, color: 'text-rose-700 bg-rose-500/10 border-rose-500/20' },
}

export function AX_RecycleBin() {
  const { recycleBin = [], restoreFromRecycleBin, purgeFromRecycleBin } = useAXStore()

  const [activeTab, setActiveTab] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [itemToRestore, setItemToRestore] = useState(null)
  const [itemToPurge, setItemToPurge] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 15

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return (recycleBin || []).filter((item) => {
      if (!item) return false
      const matchesTab =
        activeTab === 'ALL' ||
        (activeTab === 'invoices' && item.entityType === 'invoice') ||
        (activeTab === 'items' && item.entityType === 'item') ||
        (activeTab === 'parties' && (item.entityType === 'client' || item.entityType === 'customer' || item.entityType === 'supplier')) ||
        (activeTab === 'operations' && (item.entityType === 'transfer' || item.entityType === 'audit')) ||
        (activeTab === 'expenses' && item.entityType === 'expense')

      if (!matchesTab) return false
      if (!q) return true

      const title = String(item.entityTitle || '').toLowerCase()
      const code = String(item.entityCode || '').toLowerCase()
      const deleter = String(item.deletedBy || '').toLowerCase()
      return title.includes(q) || code.includes(q) || deleter.includes(q)
    })
  }, [recycleBin, activeTab, searchQuery])

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE) || 1
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredItems.slice(start, start + PAGE_SIZE)
  }, [filteredItems, currentPage])

  const handleConfirmRestore = async () => {
    if (!itemToRestore) return
    try {
      setIsProcessing(true)
      const res = await restoreFromRecycleBin(itemToRestore.id)
      if (res?.success) {
        axToast.success(`تم استرجاع "${itemToRestore.entityTitle || itemToRestore.entityCode}" بنجاح`)
        setItemToRestore(null)
      } else {
        axToast.error(res?.error || 'تعذر استرجاع العنصر')
      }
    } catch {
      axToast.error('حدث خطأ أثناء استرجاع العملية')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmPurge = async () => {
    if (!itemToPurge) return
    try {
      setIsProcessing(true)
      await purgeFromRecycleBin(itemToPurge.id)
      axToast.success(`تم الحذف النهائي لـ "${itemToPurge.entityTitle || itemToPurge.entityCode}"`)
      setItemToPurge(null)
    } catch {
      axToast.error('حدث خطأ أثناء الحذف النهائي')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-700 flex items-center justify-center">
            <Trash2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-on-surface">
              سجل المحذوفات وسلة المهملات
            </h1>
            <span className="text-xs font-bold text-on-surface-variant block">
              أرشيف كافة العمليات والفواتير والأصناف المحذوفة مع إمكانية استرجاعها فوراً
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-surface-lowest border border-outline-variant/30 text-on-surface">
            إجمالي المحذوفات: <span className="font-mono text-primary font-black">{recycleBin.length}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'invoices', label: 'الفواتير' },
            { id: 'items', label: 'الأصناف' },
            { id: 'parties', label: 'العملاء والموردين' },
            { id: 'operations', label: 'التحويلات والمخازن' },
            { id: 'expenses', label: 'المصروفات' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id)
                setCurrentPage(1)
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-low hover:bg-surface-container text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-on-surface-variant absolute right-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث في المحذوفات..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full h-9 pr-9 pl-3 rounded-full bg-surface-low border border-outline-variant/40 text-xs text-on-surface outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="hidden lg:block bg-surface-lowest border border-outline-variant/30 rounded-3xl overflow-hidden shadow-level1">
        <table className="w-full text-right text-xs">
          <thead className="bg-surface-low border-b border-surface-container text-on-surface-variant font-black">
            <tr className="h-11">
              <th className="px-3.5 whitespace-nowrap">النوع</th>
              <th className="px-3.5 whitespace-nowrap">البيان / الكود</th>
              <th className="px-3.5 whitespace-nowrap">حذفت بواسطة</th>
              <th className="px-3.5 whitespace-nowrap">تاريخ وساعة الحذف</th>
              <th className="px-3.5 whitespace-nowrap text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container text-on-surface font-bold">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-16 text-center text-on-surface-variant">
                  <Trash2 className="w-10 h-10 mx-auto text-on-surface-variant/30 mb-2" />
                  <p className="text-xs font-bold">سجل المحذوفات فارغ، لا توجد عناصر محذوفة</p>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const conf = TYPE_CONFIG[item.entityType] || { label: 'سجل', icon: FileText, color: 'text-on-surface bg-surface-container' }
                const Icon = conf.icon
                const dateStr = item.deletedAt ? new Date(item.deletedAt).toLocaleString('en-US') : '—'
                return (
                  <tr key={item.id} className="h-12 hover:bg-surface-low/50 transition-colors">
                    <td className="px-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${conf.color}`}>
                        <Icon className="w-3 h-3" />
                        <span>{conf.label}</span>
                      </span>
                    </td>
                    <td className="px-3.5 whitespace-nowrap font-black text-sm text-on-surface">
                      {item.entityCode && (
                        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-surface-low text-primary ml-2 border border-primary/20">
                          {item.entityCode}
                        </span>
                      )}
                      <span>{item.entityTitle || item.entityCode || 'عنصر محذوف'}</span>
                    </td>
                    <td className="px-3.5 whitespace-nowrap text-on-surface-variant">
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{item.deletedBy || 'مدير النظام'}</span>
                      </span>
                    </td>
                    <td className="px-3.5 whitespace-nowrap font-mono text-on-surface-variant text-[11px]">
                      {dateStr}
                    </td>
                    <td className="px-3.5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setItemToRestore(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 text-xs font-black border border-emerald-500/20 transition-all cursor-pointer active:scale-95"
                          title="استرجاع العملية وإعادتها للنظام"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>استرجاع</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToPurge(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 text-xs font-bold border border-rose-500/20 transition-all cursor-pointer active:scale-95"
                          title="حذف نهائي لا يمكن التراجع عنه"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف نهائي</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
        {paginatedItems.length === 0 ? (
          <div className="col-span-full py-16 text-center text-on-surface-variant bg-surface-lowest rounded-2xl border border-outline-variant/30">
            <Trash2 className="w-10 h-10 mx-auto text-on-surface-variant/30 mb-2" />
            <p className="text-xs font-bold">سجل المحذوفات فارغ، لا توجد عناصر محذوفة</p>
          </div>
        ) : (
          paginatedItems.map((item) => {
            const conf = TYPE_CONFIG[item.entityType] || { label: 'سجل', icon: FileText, color: 'text-on-surface bg-surface-container' }
            const Icon = conf.icon
            const dateStr = item.deletedAt ? new Date(item.deletedAt).toLocaleString('en-US') : '—'
            return (
              <div
                key={item.id}
                className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${conf.color}`}>
                    <Icon className="w-3 h-3" />
                    <span>{conf.label}</span>
                  </span>
                  <span className="text-[11px] font-mono text-on-surface-variant">{dateStr}</span>
                </div>

                <div>
                  {item.entityCode && (
                    <span className="font-mono text-xs font-black text-primary block">
                      {item.entityCode}
                    </span>
                  )}
                  <h3 className="text-sm font-black text-on-surface mt-0.5">
                    {item.entityTitle || item.entityCode || 'عنصر محذوف'}
                  </h3>
                  <span className="text-xs text-on-surface-variant font-bold block mt-1">
                    حذفت بواسطة: {item.deletedBy || 'مدير النظام'}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
                  <button
                    type="button"
                    onClick={() => setItemToRestore(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-black border border-emerald-500/20 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استرجاع</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemToPurge(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-700 text-xs font-bold border border-rose-500/20 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف نهائي</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <AX_ConfirmModal
        isOpen={Boolean(itemToRestore)}
        title="تأكيد استرجاع العملية"
        message={itemToRestore ? `هل أنت متأكد من استرجاع "${itemToRestore.entityTitle || itemToRestore.entityCode}" وإعادتها للنظام فوراً؟` : ''}
        confirmText={isProcessing ? 'جاري الاسترجاع...' : 'نعم، استرجاع العملية'}
        cancelText="تراجع"
        isDestructive={false}
        onConfirm={handleConfirmRestore}
        onCancel={() => !isProcessing && setItemToRestore(null)}
      />

      <AX_ConfirmModal
        isOpen={Boolean(itemToPurge)}
        title="تأكيد الحذف النهائي"
        message={itemToPurge ? `هل أنت متأكد من الحذف النهائي لـ "${itemToPurge.entityTitle || itemToPurge.entityCode}"؟ هذا الإجراء قطعي ولا يمكن التراجع عنه أبداً.` : ''}
        confirmText={isProcessing ? 'جاري الحذف...' : 'نعم، حذف نهائي'}
        cancelText="تراجع"
        isDestructive={true}
        onConfirm={handleConfirmPurge}
        onCancel={() => !isProcessing && setItemToPurge(null)}
      />
    </div>
  )
}

export default AX_RecycleBin
