import React, { useState, useEffect, useMemo } from 'react'
import {
  Boxes, ArrowLeftRight, Plus, Clock, Search,
  PackageCheck, Tag, ClipboardCheck, Ban, AlertTriangle,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_WarehouseBentoCard } from './AX_WarehouseBentoCard'
import { AX_TransferInspectionModal } from './AX_TransferInspectionModal'
import { AX_TransferFormModal } from './AX_TransferFormModal'
import { AX_AddWarehouseModal } from './AX_AddWarehouseModal'
import { AX_EditWarehouseModal } from './AX_EditWarehouseModal'
import { AX_StockAuditModal } from './AX_StockAuditModal'
import { AX_StockAuditsHistoryModal } from './AX_StockAuditsHistoryModal'
import { AX_TransfersHistoryModal } from './AX_TransfersHistoryModal'
import { AX_ItemMovementCardModal } from './AX_ItemMovementCardModal'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'

export function AX_WarehousesInventory() {
  const warehouses = useAXStore((state) => state.warehouses) || []
  const items = useAXStore((state) => state.items) || []
  const inventoryStock = useAXStore((state) => state.inventoryStock) || []
  const transfers = useAXStore((state) => state.transfers) || []
  const stockAudits = useAXStore((state) => state.stockAudits) || []
  const invoices = useAXStore((state) => state.invoices) || []
  const purchaseInvoices = useMemo(() => (invoices || []).filter((i) => i.type === 'purchase' || i.type === 'purchase_return'), [invoices])
  const salesInvoices = useMemo(() => (invoices || []).filter((i) => i.type === 'sale' || i.type === 'sale_return'), [invoices])
  const cancelTransfer = useAXStore((state) => state.cancelTransfer)
  const deleteWarehouse = useAXStore((state) => state.deleteWarehouse)

  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || '')
  const [showAuditsHistoryModal, setShowAuditsHistoryModal] = useState(false)
  const [showTransfersHistoryModal, setShowTransfersHistoryModal] = useState(false)
  const [selectedItemForCard, setSelectedItemForCard] = useState(null)
  const [selectedPrimaryCategory, setSelectedPrimaryCategory] = useState('الكل')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (warehouses.length > 0 && (!selectedWarehouseId || !warehouses.some((w) => w.id === selectedWarehouseId))) {
      setSelectedWarehouseId(warehouses[0].id)
    }
  }, [warehouses, selectedWarehouseId])

  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState(null)
  const [warehouseToDelete, setWarehouseToDelete] = useState(null)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [inspectingTransfer, setInspectingTransfer] = useState(null)
  const [transferToCancel, setTransferToCancel] = useState(null)

  const pendingTransfers = (transfers || []).filter((t) => t && t.status === 'pending')
  const selectedWarehouse =
    (warehouses || []).find((w) => w.id === selectedWarehouseId) ||
    warehouses[0] || null

  const getItem = (id) =>
    (items || []).find((i) => i.id === id) || {
      id,
      compositeName: 'صنف',
      primaryCategory: 'عام',
      subCategory: 'عام',
      secondaryCategory: '',
      unitType: 'كرتونة',
      code: id,
    }

  const currentWhStock = (inventoryStock || [])
    .filter((s) => s && s.warehouseId === selectedWarehouseId && Number(s.quantity) !== 0)
    .map((s) => ({
      ...s,
      item: getItem(s.itemId),
    }))

  const allPrimaryCategories = [
    'الكل',
    ...Array.from(new Set(currentWhStock.map((s) => s.item?.primaryCategory).filter(Boolean))),
  ]

  const term = searchTerm.trim().toLowerCase()
  const filteredStock = currentWhStock.filter((s) => {
    const it = s.item || {}
    const matchesCategory =
      selectedPrimaryCategory === 'الكل' || it.primaryCategory === selectedPrimaryCategory

    const matchesSearch =
      !term ||
      Boolean(it.compositeName && it.compositeName.toLowerCase().includes(term)) ||
      Boolean(it.subCategory && it.subCategory.toLowerCase().includes(term)) ||
      Boolean(it.secondaryCategory && it.secondaryCategory.toLowerCase().includes(term))

    return matchesCategory && matchesSearch
  })

  const subCategoryGroups = filteredStock.reduce((acc, curr) => {
    const sub = curr.item?.subCategory || 'عام'
    if (!acc[sub]) acc[sub] = []
    acc[sub].push(curr)
    return acc
  }, {})

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-on-surface">
            شبكة المخازن ({warehouses.length} مخزن وفرع)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAuditsHistoryModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-lowest border border-outline-variant/40 hover:bg-surface-low text-on-surface text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
            title="عرض أرشيف وسجل محاضر الجرد السابقة"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-secondary" />
            <span>سجل محاضر الجرد</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTransfersHistoryModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-lowest border border-outline-variant/40 hover:bg-surface-low text-on-surface text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
            title="عرض أرشيف وتاريخ كافة التحويلات المخزنية"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
            <span>أرشيف التحويلات</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAuditModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-lowest border border-outline-variant/40 hover:bg-surface-low text-on-surface text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-primary" />
            <span>بدء جرد مخزني</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddWarehouseModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-lowest border border-outline-variant/40 hover:bg-surface-low text-on-surface text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة مخزن / فرع</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>طلب تحويل مخزني</span>
          </button>
        </div>
      </div>

      {pendingTransfers.length > 0 && (
        <div className="bg-surface-lowest border-2 border-amber-500/50 rounded-3xl p-4 sm:p-5 shadow-level1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-on-surface flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
              تحويلات معلقة بانتظار التأكيد ({pendingTransfers.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingTransfers.map((trf) => {
              const trfItems =
                trf.items && trf.items.length > 0
                  ? trf.items
                  : [{ itemId: trf.itemId, quantity: trf.quantity, unit: trf.unit }]

              return (
                <div
                  key={trf.id}
                  onClick={() => setInspectingTransfer(trf)}
                  className="bg-surface-low/80 hover:bg-surface-low border border-amber-500/40 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3 cursor-pointer transition-all hover:border-amber-600"
                >
                  <div className="space-y-2 text-right">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-black text-amber-800 bg-amber-500/20 px-2.5 py-0.5 rounded-full">
                          {trf.code}
                        </span>
                        {trf.isAuditDiscrepancy && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-500/30 text-[10px] font-black flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            ⚠️ فارق جردي
                          </span>
                        )}
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-[11px] font-bold text-on-surface-variant block">
                          {trf.operationalDate || trf.date || trf.requestedAt}
                        </span>
                        {trf.createdAt && (
                          <span className="text-[10px] text-on-surface-variant/70 block">
                            قيد: {String(trf.createdAt).slice(11, 16)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center justify-between text-xs font-bold">
                      <div className="text-right min-w-0">
                        <span className="text-[10px] text-on-surface-variant block">المحول منه:</span>
                        <span className="text-on-surface font-black truncate block">
                          {trf.fromName || trf.fromWarehouseId}
                        </span>
                      </div>
                      <ArrowLeftRight className="w-4 h-4 text-amber-600 shrink-0 mx-2" />
                      <div className="text-left min-w-0">
                        <span className="text-[10px] text-on-surface-variant block">المستلم:</span>
                        <span className="text-primary font-black truncate block">
                          {trf.toName || trf.toWarehouseId}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-on-surface font-black flex items-center justify-between pt-1">
                      <span>إجمالي البنود: {trfItems.length} صنف</span>
                      <span className="text-[11px] text-amber-800 font-bold">انقر لفحص البنود والاستلام</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> قيد الشحن
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setTransferToCancel(trf)
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-error/10 hover:bg-error/20 text-error text-xs font-black transition-all active:scale-95 cursor-pointer"
                        title="إلغاء إذن التحويل"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>إلغاء</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setInspectingTransfer(trf)
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-black hover:bg-primary-dark shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>فحص واستلام</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {warehouses.map((wh) => (
          <AX_WarehouseBentoCard
            key={wh.id}
            warehouse={wh}
            isSelected={selectedWarehouseId === wh.id}
            onSelect={() => {
              setSelectedWarehouseId(wh.id)
              setSelectedPrimaryCategory('الكل')
            }}
            whStock={(inventoryStock || []).filter((s) => s.warehouseId === wh.id)}
            getItem={getItem}
            onEdit={setEditingWarehouse}
            onDelete={setWarehouseToDelete}
          />
        ))}
      </div>

      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 shadow-level1 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-primary/10 text-primary">
              <Boxes className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-on-surface">
                أصناف {selectedWarehouse?.name}
              </h3>
            </div>
          </div>

          <div className="w-full sm:w-64 relative">
            <input
              type="text"
              placeholder="ابحث في أصناف المخزن..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-on-surface text-xs font-bold focus:border-primary focus:outline-none"
            />
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        {allPrimaryCategories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-on-surface-variant ml-1 whitespace-nowrap">القسم الرئيسي:</span>
            {allPrimaryCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedPrimaryCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  selectedPrimaryCategory === cat
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-low border border-outline-variant/30 text-on-surface hover:bg-surface-container'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {Object.keys(subCategoryGroups).length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-xs font-bold">
            لا توجد بضاعة مسجلة مطابقة في هذا المخزن حالياً
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(subCategoryGroups).map(([subCatName, stockRows]) => (
              <div
                key={subCatName}
                className="bg-surface-low/50 border border-outline-variant/30 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-surface-container pb-2">
                  <span className="text-xs font-black text-on-surface flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    القسم الفرعي: {subCatName}
                  </span>
                  <span className="text-[11px] font-bold text-on-surface-variant">
                    {stockRows.length} منتجات
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {stockRows.map((s, idx) => {
                    const it = s.item || {}
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedItemForCard(it)}
                        className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-sm flex flex-col justify-between gap-2 cursor-pointer hover:border-primary/50 hover:bg-surface-low/50 transition-all group"
                        title="انقر لعرض كارت حركة الصنف 360°"
                      >
                        <div>
                          <span className="text-xs font-black text-on-surface block">
                            {it.compositeName || 'صنف'}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-on-surface-variant mt-0.5">
                            <span className="font-bold">{it.primaryCategory || 'عام'}</span>
                            <span>•</span>
                            <span>{it.secondaryCategory || 'عادي'}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-surface-container flex items-center justify-between">
                          <span className="text-[11px] font-mono text-outline-variant font-bold">
                            {it.code || ''}
                          </span>
                          <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-full border ${
                            Number(s.quantity) < 0
                              ? 'text-error bg-error/10 border-error/30'
                              : 'text-primary bg-primary/10 border-primary/20'
                          }`}>
                            {s.quantity} {s.unit}
                            {Number(s.quantity) < 0 && <span className="mr-1 text-[10px] font-bold">(سالب)</span>}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowTransferModal(true)}
        className="fixed bottom-20 lg:bottom-6 left-6 z-30 flex items-center gap-2 px-5 py-3 rounded-full bg-primary hover:bg-primary-dark text-white font-black text-xs sm:text-sm shadow-level3 active:scale-95 transition-all cursor-pointer"
        title="طلب تحويل مخزني جديد"
      >
        <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>طلب تحويل مخزني</span>
      </button>

      <AX_TransferFormModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
      />

      <AX_AddWarehouseModal
        isOpen={showAddWarehouseModal}
        onClose={() => setShowAddWarehouseModal(false)}
      />

      {editingWarehouse && (
        <AX_EditWarehouseModal
          isOpen={Boolean(editingWarehouse)}
          onClose={() => setEditingWarehouse(null)}
          warehouse={editingWarehouse}
        />
      )}

      {warehouseToDelete && (
        <AX_ConfirmModal
          isOpen={Boolean(warehouseToDelete)}
          title="تأكيد حذف المخزن"
          message={`هل أنت متأكد من حذف مخزن "${warehouseToDelete.name}"؟ سيتم حذف بيانات المخزن وأرصدته نهائياً.`}
          confirmText="نعم، حذف المخزن"
          cancelText="تراجع"
          isDestructive={true}
          onConfirm={() => {
            if (warehouseToDelete) {
              deleteWarehouse(warehouseToDelete.id)
              if (selectedWarehouseId === warehouseToDelete.id) {
                const remaining = warehouses.filter((w) => w.id !== warehouseToDelete.id)
                setSelectedWarehouseId(remaining[0]?.id || '')
              }
              setWarehouseToDelete(null)
            }
          }}
          onCancel={() => setWarehouseToDelete(null)}
        />
      )}

      <AX_TransferInspectionModal
        transfer={inspectingTransfer}
        isOpen={Boolean(inspectingTransfer)}
        onClose={() => setInspectingTransfer(null)}
      />

      <AX_StockAuditModal isOpen={showAuditModal} onClose={() => setShowAuditModal(false)} warehouseId={selectedWarehouseId} warehouses={warehouses} items={items} inventoryStock={inventoryStock} />

      <AX_ConfirmModal
        isOpen={Boolean(transferToCancel)}
        title="تأكيد إلغاء إذن التحويل"
        message={transferToCancel ? `هل أنت متأكد من إلغاء إذن التحويل "${transferToCancel.code}"؟ سيتم إلغاء الحركة نهائياً.` : ''}
        confirmText="نعم، إلغاء الإذن"
        cancelText="تراجع"
        isDestructive={true}
        onConfirm={() => {
          if (transferToCancel) {
            cancelTransfer(transferToCancel.id)
            setTransferToCancel(null)
          }
        }}
        onCancel={() => setTransferToCancel(null)}
      />

      <AX_StockAuditsHistoryModal isOpen={showAuditsHistoryModal} onClose={() => setShowAuditsHistoryModal(false)} audits={stockAudits} warehouses={warehouses} />

      <AX_TransfersHistoryModal
        isOpen={showTransfersHistoryModal}
        onClose={() => setShowTransfersHistoryModal(false)}
        transfers={transfers}
        warehouses={warehouses}
        getItem={(id) => items.find((i) => i.id === id)}
      />

      <AX_ItemMovementCardModal
        isOpen={Boolean(selectedItemForCard)}
        onClose={() => setSelectedItemForCard(null)}
        item={selectedItemForCard}
        initialWarehouseId={selectedWarehouseId}
        warehouses={warehouses}
        inventoryStock={inventoryStock}
        purchaseInvoices={purchaseInvoices}
        salesInvoices={salesInvoices}
        transfers={transfers}
        stockAudits={stockAudits}
      />
    </div>
  )
}

export default AX_WarehousesInventory
