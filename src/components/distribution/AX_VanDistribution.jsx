import React, { useState } from 'react'
import { Truck, Wallet, Boxes, MapPin, CheckCircle2, Clock, ArrowUpRight, Plus, ShoppingCart, PackagePlus } from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { generateUUID } from '../../utils/AX_UUID'
import { showToast } from '../common/AX_Toast'

export function AX_VanDistribution() {
  const {
    warehouses = [],
    distributors = [],
    treasuryAccounts = [],
    inventoryStock = [],
    items = [],
    clients = [],
    addPendingCashTransfer,
    confirmTransfer,
    addTransfer,
    addInvoice,
  } = useAXStore()

  const vanWarehouses = (distributors && distributors.length > 0)
    ? distributors.map((d) => ({ id: d.id, name: d.name, manager: d.vanNumber || 'المندوب' }))
    : (warehouses || []).filter((w) => w.type === 'van')

  const [selectedVanId, setSelectedVanId] = useState(vanWarehouses[0]?.id || 'dst-1')
  const [remitAmount, setRemitAmount] = useState('')
  const [showRemitModal, setShowRemitModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [showSaleModal, setShowSaleModal] = useState(false)

  const [loadForm, setLoadForm] = useState({
    fromWarehouseId: warehouses.find((w) => w.type !== 'van')?.id || warehouses[0]?.id || '',
    itemId: items[0]?.id || '',
    quantity: 10,
  })

  const [saleForm, setSaleForm] = useState({
    itemId: '',
    clientName: clients[0]?.name || 'عميل نقدي',
    quantity: 1,
    price: 100,
  })

  const getVanCashAccount = (vanId) => {
    return (treasuryAccounts || []).find((t) => t.type === 'van_cash') || treasuryAccounts?.[0] || { balance: 0, id: 'c0000000-0000-0000-0000-000000000001' }
  }

  const getItemName = (id) => (items || []).find((i) => i.id === id)?.compositeName || id
  const getItemObj = (id) => (items || []).find((i) => i.id === id)

  const currentVan = vanWarehouses.find((w) => w.id === selectedVanId) || vanWarehouses[0] || { id: 'dst-1', name: 'سيارة التوزيع', manager: 'المندوب' }
  const currentVanStock = (inventoryStock || []).filter((s) => s.warehouseId === currentVan?.id)
  const currentVanCash = getVanCashAccount(currentVan?.id)

  const handleRemitCash = (e) => {
    e.preventDefault()
    if (!remitAmount || Number(remitAmount) <= 0) return

    try {
      const newPct = {
        id: generateUUID(),
        code: `REMIT-${Date.now().toString().slice(-4)}`,
        fromTreasuryId: currentVanCash.id,
        toTreasuryId: treasuryAccounts[0]?.id || 'c0000000-0000-0000-0000-000000000001',
        amount: Number(remitAmount),
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        senderName: currentVan.manager,
        notes: `توريد وتصفية نقدية من ${currentVan.name}`,
      }

      addPendingCashTransfer(newPct)
      setRemitAmount('')
      setShowRemitModal(false)
      showToast('تم إرسال إشعار توريد وتصفية النقدية بنجاح', 'success')
    } catch (err) {
      showToast(err?.message || 'حدث خطأ أثناء إرسال إشعار التوريد', 'error')
    }
  }

  const handleLoadStock = (e) => {
    e.preventDefault()
    if (!loadForm.itemId || Number(loadForm.quantity) <= 0 || !loadForm.fromWarehouseId) return

    const itObj = getItemObj(loadForm.itemId)
    const newTrf = {
      id: generateUUID(),
      code: `TRF-${Date.now().toString().slice(-4)}`,
      fromId: loadForm.fromWarehouseId,
      toId: currentVan.id,
      items: [{ itemId: loadForm.itemId, quantity: Number(loadForm.quantity), unit: itObj?.unitType || 'كرتونة' }],
      status: 'confirmed',
      requestedAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      notes: `شحن بضاعة لسيارة التوزيع ${currentVan.name}`,
    }

    addTransfer(newTrf)
    confirmTransfer(newTrf.id)
    setShowLoadModal(false)
  }

  const handleVanSale = (e) => {
    e.preventDefault()
    if (!saleForm.itemId || Number(saleForm.quantity) <= 0) return

    const itObj = getItemObj(saleForm.itemId)
    const qty = Number(saleForm.quantity)
    const unitPrice = Number(saleForm.price) || 0
    const tot = qty * unitPrice

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
          compositeName: itObj?.compositeName || '',
          quantity: qty,
          unit: itObj?.unitType || 'كرتونة',
          price: unitPrice,
          total: tot,
        },
      ],
      transportCost: 0,
      loadingCost: 0,
      subtotal: tot,
      total: tot,
      paidAmount: tot,
      remainingAmount: 0,
      status: 'paid',
      paymentTerms: 'مدفوع كلي',
      treasuryId: currentVanCash.id,
    }

    addInvoice(newInv)
    setShowSaleModal(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-on-surface-variant">
          اختر سيارة المندوب:
        </span>

        <div className="flex items-center gap-2">
          {vanWarehouses.map((van) => (
            <button
              key={van.id}
              type="button"
              onClick={() => setSelectedVanId(van.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                selectedVanId === van.id
                  ? 'bg-primary text-white shadow-level1'
                  : 'bg-surface-lowest border border-outline-variant/30 text-on-surface hover:bg-surface-container'
              }`}
            >
              {van.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 shadow-level1 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">بيانات السيارة والمندوب</span>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-secondary-on-container text-[11px] font-bold">
              متصل ميدانياً
            </span>
          </div>

          <div>
            <h3 className="font-black text-base text-on-surface">{currentVan?.name}</h3>
            <span className="text-xs text-on-surface-variant font-bold block mt-1">
              المندوب المسؤول: {currentVan?.manager}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-primary font-bold mt-2">
              <MapPin className="w-3.5 h-3.5" />
              <span>خط سير الدلتا • طنطا والمحلة الكبرى</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant font-bold flex items-center gap-1">
                <Wallet className="w-4 h-4 text-primary" /> عهدة نقدية بالسيارة:
              </span>
              <span className="font-mono font-black text-primary text-sm">
                {(Number(currentVanCash?.balance) || 0).toLocaleString('en-US')} ج.م
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSaleModal(true)}
                disabled={currentVanStock.length === 0}
                className="py-2 px-3 rounded-full bg-secondary hover:bg-secondary-hover text-white text-xs font-black shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>تسجيل بيع</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRemitModal(true)}
                className="py-2 px-3 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>توريد نقدية</span>
              </button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 shadow-level1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
              <Boxes className="w-4 h-4 text-primary" />
              بضاعة السيارة
            </h3>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-on-surface-variant">
                أصناف: {currentVanStock.length}
              </span>

              <button
                type="button"
                onClick={() => setShowLoadModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-black hover:bg-primary-dark transition-all cursor-pointer shadow-xs"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>شحن بضاعة للسيارة</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {currentVanStock.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs text-on-surface-variant font-bold">
                  السيارة خالية حالياً، يمكنك شحن أصناف من المخازن المركزية.
                </p>
                <button
                  type="button"
                  onClick={() => setShowLoadModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-surface-low border border-outline-variant/40 hover:border-primary text-xs font-bold text-primary transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>تحميل أصناف للسيارة</span>
                </button>
              </div>
            ) : (
              currentVanStock.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-surface-low border border-outline-variant/20"
                >
                  <div className="space-y-0.5">
                    <span className="font-black text-sm text-on-surface">{getItemName(s.itemId)}</span>
                  </div>
                  <div className="text-left font-mono font-black text-base text-primary">
                    {s.quantity} {s.unit}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showLoadModal && (
        <form
          onSubmit={handleLoadStock}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-surface-lowest border-2 border-primary/30 rounded-3xl p-6 shadow-level3 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <span className="text-sm font-black text-on-surface flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-primary" />
                شحن بضاعة إلى {currentVan.name}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">المخزن المصدر</label>
                <AX_SearchableSelect
                  value={loadForm.fromWarehouseId}
                  onChange={(val) => setLoadForm({ ...loadForm, fromWarehouseId: val })}
                  options={warehouses.filter((w) => w.id !== currentVan.id).map((w) => ({ value: w.id, label: w.name, badge: w.type === 'main' ? 'رئيسي' : 'فرع' }))}
                  placeholder="اختر المخزن المصدر..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">الصنف المراد شحنه</label>
                <AX_SearchableSelect
                  value={loadForm.itemId}
                  onChange={(val) => setLoadForm({ ...loadForm, itemId: val })}
                  options={items.map((it) => ({ value: it.id, label: it.compositeName, sublabel: it.unitType }))}
                  placeholder="اختر الصنف..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">الكمية المشحونة</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={loadForm.quantity}
                  onChange={(e) => setLoadForm({ ...loadForm, quantity: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowLoadModal(false)}
                className="px-5 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-full bg-primary text-white text-xs font-extrabold shadow-sm hover:bg-primary-dark cursor-pointer"
              >
                تأكيد الشحن للسيارة
              </button>
            </div>
          </div>
        </form>
      )}

      {showSaleModal && (
        <form
          onSubmit={handleVanSale}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-surface-lowest border-2 border-secondary/30 rounded-3xl p-6 shadow-level3 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <span className="text-sm font-black text-on-surface flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-secondary" />
                تسجيل بيع نقدي من {currentVan.name}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">الصنف المباع من السيارة</label>
                <AX_SearchableSelect
                  value={saleForm.itemId || currentVanStock[0]?.itemId || ''}
                  onChange={(val) => {
                    const it = getItemObj(val)
                    setSaleForm({ ...saleForm, itemId: val, price: it?.sellPrice || 100 })
                  }}
                  options={currentVanStock.map((s) => ({
                    value: s.itemId,
                    label: getItemName(s.itemId),
                    badge: `${s.quantity} ${s.unit} متاح`,
                  }))}
                  placeholder="اختر الصنف من السيارة..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">اسم العميل / المستلم</label>
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
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">الكمية المباعة</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={currentVanStock.find((s) => s.itemId === (saleForm.itemId || currentVanStock[0]?.itemId))?.quantity || 999}
                    value={saleForm.quantity}
                    onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">سعر الوحدة (ج.م)</label>
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
                <span className="text-on-surface-variant">إجمالي المبلغ المحصل بالسيارة:</span>
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
                className="px-6 py-2 rounded-full bg-secondary text-white text-xs font-extrabold shadow-sm hover:bg-secondary-hover cursor-pointer"
              >
                قيد البيع واستلام النقدية
              </button>
            </div>
          </div>
        </form>
      )}

      {showRemitModal && (
        <form
          onSubmit={handleRemitCash}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-surface-lowest border-2 border-primary/30 rounded-3xl p-6 shadow-level3 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <span className="text-sm font-black text-on-surface flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-primary" />
                توريد نقدية السيارة للخزينة
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant">المبلغ المراد توريده (ج.م)</label>
              <input
                type="number"
                required
                min="1"
                max={currentVanCash?.balance || 999999}
                placeholder="0"
                value={remitAmount}
                onChange={(e) => setRemitAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-surface-low border border-outline-variant/30 text-sm font-bold text-on-surface font-mono"
              />
              <span className="text-[11px] text-on-surface-variant block">
                الرصيد المتاح بعهدة السيارة: {(Number(currentVanCash?.balance) || 0).toLocaleString('en-US')} ج.م
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowRemitModal(false)}
                className="px-5 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-full bg-primary text-white text-xs font-extrabold shadow-sm hover:bg-primary-dark cursor-pointer"
              >
                إرسال إشعار التوريد
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

export default AX_VanDistribution
