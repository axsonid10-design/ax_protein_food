import React, { useState, useMemo, useEffect } from 'react'
import {
  Layers, Search, History, Edit3, Warehouse, ChevronLeft, ChevronRight,
  ShieldCheck, User, ArrowRight, X,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { supabase } from '../../services/supabaseClient'
import { AX_ItemOpeningBalanceModal } from './AX_ItemOpeningBalanceModal'

export function AX_OpeningBalancesManager() {
  const items = useAXStore((s) => s.items) || []
  const warehouses = useAXStore((s) => s.warehouses) || []
  const inventoryStock = useAXStore((s) => s.inventoryStock) || []

  const [selectedWarehouseId, setSelectedWarehouseId] = useState('ALL')
  const [balanceFilter, setBalanceFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemForOpeningBalance, setItemForOpeningBalance] = useState(null)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditLogs, setAuditLogs] = useState([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  const PAGE_SIZE = 15

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true)
    try {
      if (supabase && typeof supabase.from === 'function') {
        const { data, error } = await supabase
          .from('ax_activity_logs')
          .select('*')
          .eq('action', 'UPDATE_OPENING_BALANCE')
          .order('created_at', { ascending: false })
          .limit(100)
        if (!error && Array.isArray(data)) setAuditLogs(data)
      }
    } catch {} finally {
      setIsLoadingLogs(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const rows = useMemo(() => {
    const list = []
    const targetWarehouses = selectedWarehouseId === 'ALL'
      ? warehouses
      : warehouses.filter((w) => w.id === selectedWarehouseId)

    items.forEach((item) => {
      targetWarehouses.forEach((wh) => {
        const stock = inventoryStock.find((s) => s.itemId === item.id && s.warehouseId === wh.id)
        const openingBalance = Number(stock?.openingBalance) || 0
        list.push({
          item,
          warehouse: wh,
          openingBalance,
          currentQty: Number(stock?.quantity) || 0,
          openingDate: stock?.openingDate || 'غير محدد',
          unit: stock?.unit || item.unitType || 'كرتونة',
          hasOpening: openingBalance > 0,
        })
      })
    })
    return list
  }, [items, warehouses, inventoryStock, selectedWarehouseId])

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return rows.filter((r) => {
      if (balanceFilter === 'HAS_BALANCE' && !r.hasOpening) return false
      if (balanceFilter === 'ZERO_BALANCE' && r.hasOpening) return false
      if (!q) return true
      const name = (r.item.compositeName || r.item.name || '').toLowerCase()
      const code = (r.item.code || '').toLowerCase()
      const cat = (r.item.primaryCategory || '').toLowerCase()
      const whName = (r.warehouse.name || '').toLowerCase()
      return name.includes(q) || code.includes(q) || cat.includes(q) || whName.includes(q)
    })
  }, [rows, balanceFilter, searchQuery])

  const stats = useMemo(() => ({
    totalItemsCount: items.length,
    withOpeningCount: rows.filter((r) => r.hasOpening).length,
    totalOpeningQty: rows.reduce((sum, r) => sum + r.openingBalance, 0),
    logsCount: auditLogs.length,
  }), [items, rows, auditLogs])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, currentPage])

  const resolveItemName = (itemId) => {
    const it = items.find((i) => i.id === itemId)
    return it?.compositeName || it?.name || itemId || 'صنف'
  }

  const resolveWarehouseName = (whId) => {
    const wh = warehouses.find((w) => w.id === whId)
    return wh?.name || whId || 'المخزن الرئيسي'
  }

  const formatLogDate = (dStr) => {
    if (!dStr) return '—'
    try {
      return new Date(dStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return dStr
    }
  }

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-on-surface">أرصدة أول المدة وسجل التدقيق</h2>
            <p className="text-xs font-bold text-on-surface-variant">مراجعة وضبط أرصدة البداية لكافة الأصناف بالمخازن وتتبع أي تغييرات</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { fetchAuditLogs(); setShowAuditModal(true) }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-low hover:bg-surface-container border border-outline-variant/30 text-xs font-black text-on-surface transition-all active:scale-95 cursor-pointer shadow-xs self-stretch sm:self-auto justify-center"
        >
          <History className="w-4 h-4 text-primary" />
          <span>سجل التدقيق والتغييرات</span>
          {auditLogs.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-mono font-black">
              {auditLogs.length}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-on-surface-variant mb-1">إجمالي الأصناف</div>
          <div className="text-lg font-black text-on-surface font-mono">{stats.totalItemsCount}</div>
        </div>
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-on-surface-variant mb-1">أصناف برصيد أول مدة</div>
          <div className="text-lg font-black text-emerald-700 font-mono">{stats.withOpeningCount}</div>
        </div>
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-on-surface-variant mb-1">إجمالي كميات البداية</div>
          <div className="text-lg font-black text-primary font-mono">{stats.totalOpeningQty.toLocaleString('en-US')}</div>
        </div>
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-on-surface-variant mb-1">حركات التعديل المسجلة</div>
          <div className="text-lg font-black text-amber-700 font-mono">{stats.logsCount}</div>
        </div>
      </div>

      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              placeholder="بحث باسم الصنف، الكود، أو القسم..."
              className="w-full h-10 pr-10 pl-4 rounded-full bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedWarehouseId}
              onChange={(e) => { setSelectedWarehouseId(e.target.value); setCurrentPage(1) }}
              className="h-10 px-3.5 rounded-full bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">كل المخازن والفروع</option>
              {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
            </select>

            <select
              value={balanceFilter}
              onChange={(e) => { setBalanceFilter(e.target.value); setCurrentPage(1) }}
              className="h-10 px-3.5 rounded-full bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">كل الحالات</option>
              <option value="HAS_BALANCE">لها رصيد أول مدة (&gt; 0)</option>
              <option value="ZERO_BALANCE">بدون رصيد أول مدة (0)</option>
            </select>
          </div>
        </div>

        <div className="hidden lg:block overflow-x-auto rounded-2xl border border-outline-variant/20">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="h-11 bg-surface-low/80 text-on-surface-variant font-black border-b border-outline-variant/20">
                <th className="px-4 text-right">كود الصنف</th>
                <th className="px-4 text-right">اسم الصنف والتصنيف</th>
                <th className="px-4 text-right">المخزن</th>
                <th className="px-4 text-center">رصيد أول المدة</th>
                <th className="px-4 text-center">الوحدة</th>
                <th className="px-4 text-center">تاريخ البداية</th>
                <th className="px-4 text-center">الرصيد الحالي</th>
                <th className="px-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs font-bold text-on-surface-variant">لا توجد أصناف مطابقة للبحث</td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={`${row.item.id}-${row.warehouse.id}`} className="h-11 hover:bg-surface-low/40 transition-colors">
                    <td className="px-4 font-mono font-bold text-on-surface-variant">{row.item.code || '—'}</td>
                    <td className="px-4 font-black text-on-surface">
                      <div className="truncate max-w-[260px]">{row.item.compositeName || row.item.name}</div>
                      <div className="text-[10px] font-bold text-on-surface-variant truncate">{row.item.primaryCategory}</div>
                    </td>
                    <td className="px-4 font-bold text-on-surface">{row.warehouse.name}</td>
                    <td className="px-4 text-center font-mono font-black text-amber-800">{row.openingBalance}</td>
                    <td className="px-4 text-center text-[11px] font-bold text-on-surface-variant">{row.unit}</td>
                    <td className="px-4 text-center font-mono text-[11px] text-on-surface-variant">{row.openingDate}</td>
                    <td className="px-4 text-center font-mono font-black text-primary">{row.currentQty}</td>
                    <td className="px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setItemForOpeningBalance(row.item)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-black transition-all cursor-pointer active:scale-95"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>تعديل</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden space-y-2.5">
          {paginatedRows.length === 0 ? (
            <div className="py-8 text-center text-xs font-bold text-on-surface-variant">لا توجد أصناف مطابقة للبحث</div>
          ) : (
            paginatedRows.map((row) => (
              <div key={`m-${row.item.id}-${row.warehouse.id}`} className="bg-surface-low/60 border border-outline-variant/30 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-on-surface">{row.item.compositeName || row.item.name}</h4>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant mt-0.5">
                      <span>{row.item.code}</span>
                      <span>•</span>
                      <span>{row.warehouse.name}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setItemForOpeningBalance(row.item)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-white text-[11px] font-black transition-all cursor-pointer active:scale-95 shrink-0"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>تعديل</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-surface-lowest border border-outline-variant/20 text-center">
                  <div>
                    <div className="text-[10px] font-bold text-on-surface-variant">أول المدة</div>
                    <div className="text-xs font-black font-mono text-amber-800">{row.openingBalance} <span className="text-[10px]">{row.unit}</span></div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-on-surface-variant">التاريخ</div>
                    <div className="text-[10px] font-bold font-mono text-on-surface-variant truncate">{row.openingDate}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-on-surface-variant">الرصيد الحالي</div>
                    <div className="text-xs font-black font-mono text-primary">{row.currentQty} <span className="text-[10px]">{row.unit}</span></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20 text-xs">
            <span className="font-bold text-on-surface-variant">صفحة {currentPage} من {totalPages} (إجمالي {filteredRows.length} سجل)</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-full border border-outline-variant/30 hover:bg-surface-low disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-full border border-outline-variant/30 hover:bg-surface-low disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {itemForOpeningBalance && (
        <AX_ItemOpeningBalanceModal
          isOpen={Boolean(itemForOpeningBalance)}
          onClose={() => setItemForOpeningBalance(null)}
          item={itemForOpeningBalance}
          warehouses={warehouses}
        />
      )}

      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-level3 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-on-surface">سجل تدقيق أرصدة أول المدة</h3>
                  <p className="text-xs font-bold text-on-surface-variant">تتبع كل حركة تعديل لرصيد البداية: من قام بالتعديل ومتى والقيمة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {isLoadingLogs ? (
                <div className="py-8 text-center text-xs font-bold text-on-surface-variant">جاري جلب سجل التدقيق...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs font-bold text-on-surface-variant">لم يتم إجراء أي تعديل على أرصدة أول المدة حتى الآن</div>
              ) : (
                auditLogs.map((log) => {
                  const rawNew = log.new_data || {}
                  const rawOld = log.old_data || {}
                  const itName = rawNew.item_name || resolveItemName(rawNew.item_id)
                  const whName = rawNew.warehouse_name || resolveWarehouseName(rawNew.warehouse_id)
                  const actor = rawNew.user_name || (log.user_id === 'usr_master_axonid' ? 'الريس عثمان' : log.user_id || 'مدير المنظومة')
                  const newQty = rawNew.opening_balance
                  const oldQty = rawOld.opening_balance !== undefined ? rawOld.opening_balance : '—'
                  const unit = rawNew.unit || 'كرتونة'

                  return (
                    <div key={log.id} className="p-3.5 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-black text-on-surface">{itName}</h4>
                          <div className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1.5">
                            <Warehouse className="w-3 h-3 text-primary" />
                            <span>{whName}</span>
                          </div>
                        </div>
                        <div className="text-left">
                          <span className="text-[10px] font-mono font-bold text-on-surface-variant block">{formatLogDate(log.created_at)}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-lowest text-[10px] font-bold text-on-surface mt-1 border border-outline-variant/20">
                            <User className="w-2.5 h-2.5 text-primary" />
                            <span>{actor}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-lowest border border-outline-variant/20 text-xs font-black">
                        <span className="text-on-surface-variant text-[11px]">الرصيد:</span>
                        <span className="font-mono text-on-surface-variant line-through">{oldQty}</span>
                        <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                        <span className="font-mono text-amber-800">{newQty} {unit}</span>
                        <span className="mr-auto text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full">تم التحديث</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="pt-3 border-t border-surface-container flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-5 py-1.5 rounded-full bg-primary text-white text-xs font-black hover:bg-primary-dark transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AX_OpeningBalancesManager
