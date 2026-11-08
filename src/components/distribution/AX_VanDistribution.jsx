import React, { useState, useMemo } from 'react'
import {
  Truck,
  Plus,
  ShoppingCart,
  Boxes,
  CheckCircle2,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { generateUUID } from '../../utils/AX_UUID'
import { axToast } from '../common/AX_Toast'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import {
  getVanWarehouses,
  getVanCashAccount,
} from '../../store/vanDistributionHelpers'
import { AX_AddVehicleModal } from './AX_AddVehicleModal'
import { AX_VanStockLoadingModal } from './AX_VanStockLoadingModal'
import { AX_VanCustodySummaryCard } from './AX_VanCustodySummaryCard'
import { AX_VanSettlementModal } from './AX_VanSettlementModal'
import { AX_VanSettlementReceiptModal } from './AX_VanSettlementReceiptModal'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'

export function AX_VanDistribution() {
  const warehouses = useAXStore((state) => state.warehouses) || []
  const distributors = useAXStore((state) => state.distributors) || []
  const treasuryAccounts = useAXStore((state) => state.treasuryAccounts) || []
  const inventoryStock = useAXStore((state) => state.inventoryStock) || []
  const items = useAXStore((state) => state.items) || []
  const clients = useAXStore((state) => state.clients) || []
  const addInvoice = useAXStore((state) => state.addInvoice)

  const vanWarehouses = useMemo(() => {
    return getVanWarehouses(warehouses, distributors)
  }, [warehouses, distributors])

  const [selectedVanId, setSelectedVanId] = useState(() => vanWarehouses[0]?.id || '')

  const currentVan = useMemo(() => {
    return vanWarehouses.find((w) => w.id === selectedVanId) || vanWarehouses[0]
  }, [vanWarehouses, selectedVanId])

  const currentVanCash = useMemo(() => {
    return getVanCashAccount(treasuryAccounts, currentVan)
  }, [treasuryAccounts, currentVan])

  const currentVanStock = useMemo(() => {
    if (!currentVan?.id) return []
    return inventoryStock.filter(
      (s) =>
        (s.warehouseId === currentVan.id || s.warehouse_id === currentVan.id) &&
        Number(s.quantity) > 0
    )
  }, [inventoryStock, currentVan])

  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [activeSettlementReceipt, setActiveSettlementReceipt] = useState(null)

  useBodyScrollLock(showSaleModal, () => setShowSaleModal(false))

  const [saleForm, setSaleForm] = useState({
    itemId: '',
    clientName: clients[0]?.name || 'عميل نقدي',
    quantity: 1,
    price: 100,
  })

  const getItemObj = (id) => items.find((i) => i.id === id) || {}

  const handleOpenDirectSale = () => {
    const firstStockItem = currentVanStock[0]
    const itObj = firstStockItem ? getItemObj(firstStockItem.itemId) : null
    setSaleForm({
      itemId: firstStockItem?.itemId || '',
      clientName: clients[0]?.name || 'عميل نقدي',
      quantity: 1,
      price: itObj?.sellPrice || 100,
    })
    setShowSaleModal(true)
  }

  const handleExecuteVanSale = (e) => {
    e.preventDefault()
    if (!saleForm.itemId || Number(saleForm.quantity) <= 0) {
      axToast.error('يرجى اختيار صنف وتحديد كمية مباعة صحيحة')
      return
    }

    const itObj = getItemObj(saleForm.itemId)
    const qty = Number(saleForm.quantity)
    const unitPrice = Number(saleForm.price) || 0
    const totalAmount = qty * unitPrice

    const newInv = {
      id: generateUUID(),
      code: `INV-${Date.now().toString().slice(-5)}`,
      type: 'sale',
      partyName: saleForm.clientName.trim(),
      date: new Date().toISOString().split('T')[0],
      warehouseId: currentVan.id,
      items: [
        {
          itemId: saleForm.itemId,
          compositeName: itObj?.compositeName || itObj?.name || '',
          quantity: qty,
          unit: itObj?.unitType || 'كرتونة',
          price: unitPrice,
          total: totalAmount,
        },
      ],
      transportCost: 0,
      loadingCost: 0,
      subtotal: totalAmount,
      total: totalAmount,
      paidAmount: totalAmount,
      remainingAmount: 0,
      status: 'paid',
      paymentTerms: 'مدفوع كلي',
      treasuryId: currentVanCash.id,
    }

    try {
      addInvoice(newInv)
      axToast.success(`تم قيد البيع النقدي الميداني [${newInv.code}] بنجاح`)
      setShowSaleModal(false)
    } catch {
      axToast.error('فشل في تسجيل عملية البيع')
    }
  }

  const handleVehicleCreated = (newVehicle) => {
    setSelectedVanId(newVehicle.id)
  }

  const handleSettlementFinished = (settlementRecord) => {
    setActiveSettlementReceipt(settlementRecord)
    setShowReceiptModal(true)
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {vanWarehouses.map((van) => (
            <button
              key={van.id}
              type="button"
              onClick={() => setSelectedVanId(van.id)}
              className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                currentVan?.id === van.id
                  ? 'bg-primary text-white shadow-level1'
                  : 'bg-surface-lowest border border-outline-variant/30 text-on-surface hover:bg-surface-container'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{van.name}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAddVehicleModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary hover:bg-secondary-hover text-white text-xs font-black transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة سيارة جديدة</span>
        </button>
      </div>

      <AX_VanCustodySummaryCard
        currentVan={currentVan}
        currentVanCash={currentVanCash}
        currentVanStock={currentVanStock}
        items={items}
        onOpenLoadModal={() => setShowLoadModal(true)}
        onOpenSaleModal={handleOpenDirectSale}
        onOpenSettlementModal={() => setShowSettlementModal(true)}
      />

      <AX_AddVehicleModal
        isOpen={showAddVehicleModal}
        onClose={() => setShowAddVehicleModal(false)}
        onCreated={handleVehicleCreated}
      />

      {showLoadModal && (
        <AX_VanStockLoadingModal
          isOpen={showLoadModal}
          onClose={() => setShowLoadModal(false)}
          currentVan={currentVan}
        />
      )}

      {showSettlementModal && (
        <AX_VanSettlementModal
          isOpen={showSettlementModal}
          onClose={() => setShowSettlementModal(false)}
          currentVan={currentVan}
          currentVanCash={currentVanCash}
          currentVanStock={currentVanStock}
          onSettlementCompleted={handleSettlementFinished}
        />
      )}

      <AX_VanSettlementReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        settlement={activeSettlementReceipt}
      />

      {showSaleModal && (
        <form
          onSubmit={handleExecuteVanSale}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-surface-lowest border-2 border-secondary/30 rounded-3xl p-5 sm:p-6 shadow-level3 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <span className="text-sm font-black text-on-surface flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-secondary" />
                تسجيل بيع نقدي من {currentVan?.name}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  الصنف المباع من السيارة
                </label>
                <AX_SearchableSelect
                  value={saleForm.itemId || currentVanStock[0]?.itemId || ''}
                  onChange={(val) => {
                    const it = getItemObj(val)
                    setSaleForm({
                      ...saleForm,
                      itemId: val,
                      price: it?.sellPrice || 100,
                    })
                  }}
                  options={currentVanStock.map((s) => ({
                    value: s.itemId,
                    label: getItemObj(s.itemId)?.compositeName || s.itemId,
                    badge: `${s.quantity} ${s.unit || 'كرتونة'} متاح`,
                  }))}
                  placeholder="اختر الصنف من رصيد السيارة..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  اسم العميل / المستلم
                </label>
                <input
                  type="text"
                  required
                  placeholder="اسم العميل أو المحل..."
                  value={saleForm.clientName}
                  onChange={(e) => setSaleForm({ ...saleForm, clientName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    الكمية المباعة (كرتونة)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.1"
                    value={saleForm.quantity}
                    onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    سعر الكرتونة (ج.م)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={saleForm.price}
                    onChange={(e) => setSaleForm({ ...saleForm, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-surface-low flex items-center justify-between text-xs font-black">
                <span className="text-on-surface-variant">إجمالي التحصيل الميداني:</span>
                <span className="font-mono text-primary text-sm">
                  {((Number(saleForm.quantity) || 0) * (Number(saleForm.price) || 0)).toLocaleString('en-US')} ج.م
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="px-5 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-full bg-secondary hover:bg-secondary-hover text-white text-xs font-black shadow-xs cursor-pointer transition-all"
              >
                قيد البيع واستلام النقدية
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

export default AX_VanDistribution
