import React, { useState, useEffect } from 'react'
import {
  Boxes,
  X,
  CheckCircle2,
  Scan,
  AlertCircle,
  Warehouse,
  Plus,
} from 'lucide-react'
import { generateUUID } from '../../utils/AX_UUID'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { AX_CategorySelect } from './AX_CategorySelect'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { AX_ItemPackagingFields } from './AX_ItemPackagingFields'
import { axToast } from '../common/AX_Toast'
import { useAXStore } from '../../store/useAXStore'

export function AX_AddItemModal({
  isOpen,
  onClose,
  onSave,
  categories = [],
  subCategories = {},
  secondaryCategories = [],
  warehouses: propWarehouses = [],
  addWarehouse: propAddWarehouse,
  addCategory,
  editCategory,
  deleteCategory,
  addSubCategory,
  editSubCategory,
  deleteSubCategory,
  addSecondaryCategory,
  editSecondaryCategory,
  deleteSecondaryCategory,
}) {
  useBodyScrollLock(isOpen, onClose)

  const storeWarehouses = useAXStore((s) => s.warehouses) || []
  const storeAddWarehouse = useAXStore((s) => s.addWarehouse)
  const warehouses = storeWarehouses.length > 0 ? storeWarehouses : propWarehouses
  const addWarehouse = propAddWarehouse || storeAddWarehouse

  const [primaryCategory, setPrimaryCategory] = useState(categories[0] || 'الكبده')
  const [subCategory, setSubCategory] = useState('')
  const [secondaryCategory, setSecondaryCategory] = useState('')
  const [compositeName, setCompositeName] = useState('')
  const [code, setCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [unitType, setUnitType] = useState('كرتونة')
  const [subUnitType, setSubUnitType] = useState('طبق')
  const [minStockAlert, setMinStockAlert] = useState('')
  const [openingQty, setOpeningQty] = useState('')
  const [openingStockDate, setOpeningStockDate] = useState(() => new Date().toISOString().split('T')[0])
  const [weightPerCarton, setWeightPerCarton] = useState('10')
  const [piecesPerCarton, setPiecesPerCarton] = useState('')
  const [grainsPerPiece, setGrainsPerPiece] = useState('')
  const [pieceWeight, setPieceWeight] = useState(''); const [grainWeight, setGrainWeight] = useState('')
  const [targetWarehouseId, setTargetWarehouseId] = useState(warehouses[0]?.id || '')
  const [buyPrice, setBuyPrice] = useState(''); const [sellPrice, setSellPrice] = useState('')
  const [pieceBuyPrice, setPieceBuyPrice] = useState(''); const [pieceSellPrice, setPieceSellPrice] = useState('')
  const [grainBuyPrice, setGrainBuyPrice] = useState(''); const [grainSellPrice, setGrainSellPrice] = useState('')
  const [kgBuyPrice, setKgBuyPrice] = useState(''); const [kgSellPrice, setKgSellPrice] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)

  const [isQuickWarehouseOpen, setIsQuickWarehouseOpen] = useState(false)
  const [quickWhName, setQuickWhName] = useState('')
  const [quickWhType, setQuickWhType] = useState('main')
  const [quickWhManager, setQuickWhManager] = useState('')

  useEffect(() => {
    if (isOpen) {
      setPrimaryCategory(categories[0] || 'الكبده'); setSubCategory(''); setSecondaryCategory(''); setCompositeName('')
      setCode(`PF-${Math.floor(1000 + Math.random() * 9000)}`); setUnitType('كرتونة'); setSubUnitType('طبق'); setMinStockAlert(''); setOpeningQty('')
      setOpeningStockDate(new Date().toISOString().split('T')[0]); setWeightPerCarton('10')
      setPiecesPerCarton(''); setGrainsPerPiece(''); setPieceWeight(''); setGrainWeight('')
      setTargetWarehouseId(warehouses[0]?.id || '')
      setBuyPrice(''); setSellPrice(''); setPieceBuyPrice(''); setPieceSellPrice(''); setGrainBuyPrice(''); setGrainSellPrice('')
      setKgBuyPrice(''); setKgSellPrice('')
      setErrorMsg(null); setIsQuickWarehouseOpen(false); setQuickWhName(''); setQuickWhType('cold_store'); setQuickWhManager('')
    }
  }, [isOpen])

  useEffect(() => {
    const parts = [primaryCategory, subCategory, secondaryCategory].filter(Boolean)
    const suggested = parts.join(' ').trim()
    if (suggested) setCompositeName(suggested)
  }, [primaryCategory, subCategory, secondaryCategory])

  const availableSubs = subCategories[primaryCategory] || []

  const handleScanBarcode = () => {
    setIsScanning(true)
    setTimeout(() => {
      setCode(`622${Date.now().toString().slice(-10)}`)
      setIsScanning(false)
    }, 300)
  }

  const handleSaveQuickWarehouse = () => {
    const trimmed = quickWhName.trim()
    if (!trimmed) return
    const VALID_WH_TYPES = ['cold_store', 'raw_materials', 'processing', 'finished_goods', 'van']
    const newWh = {
      id: generateUUID(),
      name: trimmed,
      type: VALID_WH_TYPES.includes(quickWhType) ? quickWhType : 'cold_store',
      manager: quickWhManager.trim() || 'المشرف المسؤول',
    }
    addWarehouse?.(newWh)
    setTargetWarehouseId(newWh.id)
    setQuickWhName('')
    setQuickWhType('cold_store')
    setQuickWhManager('')
    setIsQuickWarehouseOpen(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!subCategory.trim()) {
      setErrorMsg('يرجى اختيار أو كتابة القسم الفرعي (النوع)')
      return
    }

    const numSell = Number(sellPrice) || 0
    const numBuy = Number(buyPrice) || 0
    const numPieces = Number(piecesPerCarton) || 0
    const numWeight = unitType === 'كرتونة' ? (Number(weightPerCarton) || 10) : 1
    const suggestedPieceSell = numPieces > 0 && numSell > 0 ? Number((numSell / numPieces).toFixed(2)) : null
    const finalPieceSell = Number(pieceSellPrice) > 0 ? Number(pieceSellPrice) : suggestedPieceSell
    const suggestedKgSell = numWeight > 0 && numSell > 0 ? Number((numSell / numWeight).toFixed(2)) : null
    const finalKgSell = Number(kgSellPrice) > 0 ? Number(kgSellPrice) : suggestedKgSell

    const finalName = compositeName.trim() || [primaryCategory, subCategory.trim(), secondaryCategory?.trim()].filter(Boolean).join(' ')
    const generatedId = generateUUID()

    const newItem = {
      id: generatedId,
      primaryCategory,
      subCategory: subCategory.trim(),
      secondaryCategory: secondaryCategory?.trim() || null,
      compositeName: finalName,
      unitType,
      subUnitType: unitType === 'كرتونة' || unitType === 'كيلو' ? (subUnitType === 'كيس' ? 'طبق' : (subUnitType || 'طبق')) : null,
      minStockAlert: minStockAlert !== '' && minStockAlert !== null && minStockAlert !== undefined ? Number(minStockAlert) : null,
      units: Array.from(new Set([unitType, subUnitType && subUnitType !== 'سائب' ? (subUnitType === 'كيس' ? 'طبق' : subUnitType) : null, 'كيلو'].filter(Boolean))),
      weightPerCarton: unitType === 'كرتونة' ? Number(weightPerCarton) || 10 : 1,
      piecesPerCarton: Number(piecesPerCarton) || null,
      grainsPerPiece: Number(grainsPerPiece) || null,
      pieceWeight: pieceWeight?.trim() || null,
      grainWeight: grainWeight?.trim() || null,
      buyPrice: numBuy,
      sellPrice: numSell,
      kgBuyPrice: Number(kgBuyPrice) || null,
      kgSellPrice: finalKgSell,
      pieceBuyPrice: Number(pieceBuyPrice) || null,
      pieceSellPrice: finalPieceSell,
      grainBuyPrice: Number(grainBuyPrice) || null,
      grainSellPrice: Number(grainSellPrice) || null,
      code: code.trim() || `PF-${Date.now().toString().slice(-4)}`,
    }

    const openingStock =
      Number(openingQty) > 0
        ? {
            quantity: Number(openingQty),
            warehouseId: targetWarehouseId,
            unit: unitType,
            date: openingStockDate,
          }
        : null

    onSave(newItem, openingStock)
    axToast.success('تمت إضافة الصنف بنجاح')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-surface-lowest border border-outline-variant/40 rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-primary/10 text-primary">
              <Boxes className="w-5 h-5" />
            </span>
            <div className="text-right">
              <h3 className="text-sm sm:text-base font-black text-on-surface">إضافة صنف مجمدات جديد</h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                تحديد المستويات، التعبئة، والأسعار
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-error/10 border border-error/20 flex items-center gap-2 text-error text-xs font-bold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-on-surface block text-right">كود الصنف (باركود):</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="توليد تلقائي"
                  className="w-full h-10 pr-3.5 pl-16 rounded-xl bg-surface-low border border-outline-variant/40 focus:border-primary text-on-surface font-mono font-bold outline-none text-right"
                />
                <button
                  type="button"
                  onClick={handleScanBarcode}
                  className={`absolute left-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg border border-outline-variant/30 text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                    isScanning
                      ? 'bg-primary text-white animate-pulse'
                      : 'bg-surface-lowest hover:bg-primary hover:text-white text-on-surface-variant'
                  }`}
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>{isScanning ? 'مسح...' : 'مسح'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-on-surface block text-right">الاسم التجاري بالفاتورة:</label>
              <input
                type="text"
                value={compositeName}
                onChange={(e) => setCompositeName(e.target.value)}
                placeholder="يتشكل تلقائياً من الأقسام..."
                className="w-full h-10 px-3.5 rounded-xl bg-surface-low border border-outline-variant/40 focus:border-primary text-on-surface font-bold outline-none text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <AX_CategorySelect
              label="القسم الرئيسي"
              value={primaryCategory}
              onChange={(val) => {
                setPrimaryCategory(val)
                setSubCategory('')
              }}
              categories={categories}
              onAddCategory={addCategory}
              onEditCategory={editCategory}
              onDeleteCategory={deleteCategory}
              placeholder="اختر الرئيسي..."
            />

            <AX_CategorySelect
              label="القسم الفرعي (النوع) *"
              value={subCategory}
              onChange={setSubCategory}
              categories={availableSubs}
              onAddCategory={(name) => addSubCategory(primaryCategory, name)}
              onEditCategory={(oldN, newN) => editSubCategory(primaryCategory, oldN, newN)}
              onDeleteCategory={(name) => deleteSubCategory(primaryCategory, name)}
              placeholder="اختر الفرعي..."
            />

            <AX_CategorySelect
              label="القسم الثانوي (الحجم)"
              value={secondaryCategory}
              onChange={setSecondaryCategory}
              categories={secondaryCategories}
              onAddCategory={addSecondaryCategory}
              onEditCategory={editSecondaryCategory}
              onDeleteCategory={deleteSecondaryCategory}
              allowNone={true}
              noneLabel="بدون قسم ثانوي (اختياري)"
              placeholder="اختر الثانوي (اختياري)..."
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-3">
            <span className="text-xs font-black text-on-surface flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-primary" />
              <span>إيداع رصيد بداية المدة (افتتاح رصيد):</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-on-surface block text-right">الكمية الافتتاحية:</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={openingQty}
                  onChange={(e) => setOpeningQty(e.target.value)}
                  placeholder="0 (اختياري)"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-lowest border border-outline-variant/40 focus:border-primary text-on-surface font-mono font-bold outline-none text-right"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-on-surface block">المخزن المودع به:</label>
                  <button
                    type="button"
                    onClick={() => setIsQuickWarehouseOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>إضافة مخزن</span>
                  </button>
                </div>
                <AX_SearchableSelect
                  value={targetWarehouseId}
                  onChange={setTargetWarehouseId}
                  options={warehouses.map((w) => ({
                    value: w.id,
                    label: w.name,
                    badge: w.type === 'main' ? 'رئيسي' : w.type === 'cold_store' ? 'تبريد' : 'فرع',
                  }))}
                  searchable={false}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-on-surface block text-right">تاريخ رصيد أول المدة:</label>
                <AX_CompanyDatePicker
                  value={openingStockDate}
                  onChange={setOpeningStockDate}
                />
              </div>
            </div>
          </div>

          <AX_ItemPackagingFields
            unitType={unitType}
            setUnitType={setUnitType}
            weightPerCarton={weightPerCarton}
            setWeightPerCarton={setWeightPerCarton}
            piecesPerCarton={piecesPerCarton}
            setPiecesPerCarton={setPiecesPerCarton}
            grainsPerPiece={grainsPerPiece}
            setGrainsPerPiece={setGrainsPerPiece}
            pieceWeight={pieceWeight}
            setPieceWeight={setPieceWeight}
            grainWeight={grainWeight}
            setGrainWeight={setGrainWeight}
            buyPrice={buyPrice}
            setBuyPrice={setBuyPrice}
            sellPrice={sellPrice}
            setSellPrice={setSellPrice}
            pieceBuyPrice={pieceBuyPrice}
            setPieceBuyPrice={setPieceBuyPrice}
            pieceSellPrice={pieceSellPrice}
            setPieceSellPrice={setPieceSellPrice}
            grainBuyPrice={grainBuyPrice}
            setGrainBuyPrice={setGrainBuyPrice}
            grainSellPrice={grainSellPrice}
            setGrainSellPrice={setGrainSellPrice}
            kgBuyPrice={kgBuyPrice}
            setKgBuyPrice={setKgBuyPrice}
            kgSellPrice={kgSellPrice}
            setKgSellPrice={setKgSellPrice}
            subUnitType={subUnitType}
            setSubUnitType={setSubUnitType}
            minStockAlert={minStockAlert}
            setMinStockAlert={setMinStockAlert}
          />

          <div className="pt-3 border-t border-surface-container flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-outline-variant/50 text-xs font-bold text-on-surface hover:bg-surface-low transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ وتثبيت الصنف</span>
            </button>
          </div>
        </form>
      </div>

      {isQuickWarehouseOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-surface-lowest border border-outline-variant/40 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                  <Warehouse className="w-4 h-4" />
                </span>
                <span className="text-xs font-black text-on-surface">إضافة مخزن جديد سريع</span>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickWarehouseOpen(false)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold text-right">
              <div>
                <label className="block text-on-surface-variant mb-1">اسم المخزن:</label>
                <input
                  type="text"
                  value={quickWhName}
                  onChange={(e) => setQuickWhName(e.target.value)}
                  placeholder="مثال: مخزن الدقي تجميد..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-low border border-outline-variant/40 focus:border-primary text-on-surface outline-none text-right"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1">نوع المخزن:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'cold_store', label: 'تجميد وحفظ' },
                    { id: 'raw_materials', label: 'خامات' },
                    { id: 'finished_goods', label: 'مصنعات' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setQuickWhType(t.id)}
                      className={`py-1.5 rounded-xl text-center text-[11px] font-black border transition-all cursor-pointer ${
                        quickWhType === t.id
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-lowest border-outline-variant/30 text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1">المشرف المسؤول (اختياري):</label>
                <input
                  type="text"
                  value={quickWhManager}
                  onChange={(e) => setQuickWhManager(e.target.value)}
                  placeholder="اسم المشرف..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-low border border-outline-variant/40 focus:border-primary text-on-surface outline-none text-right"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickWarehouseOpen(false)}
                  className="px-4 py-1.5 rounded-full border border-outline-variant/40 text-on-surface hover:bg-surface-low cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickWarehouse}
                  className="px-4 py-1.5 rounded-full bg-primary hover:bg-primary-dark text-white font-black cursor-pointer shadow-xs"
                >
                  تأكيد المخزن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
