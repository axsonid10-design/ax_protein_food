import React, { useState, useEffect } from 'react'
import { X, CheckCircle2, Tag, Edit3, AlertCircle } from 'lucide-react'
import { AX_CategorySelect } from './AX_CategorySelect'
import { AX_ItemPackagingFields } from './AX_ItemPackagingFields'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { axToast } from '../common/AX_Toast'

export function AX_EditItemModal({
  isOpen,
  item,
  onClose,
  onSave,
  categories = [],
  subCategories = {},
  secondaryCategories = [],
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
  useBodyScrollLock(isOpen && Boolean(item))

  const [primaryCategory, setPrimaryCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [secondaryCategory, setSecondaryCategory] = useState('')
  const [compositeName, setCompositeName] = useState('')
  const [code, setCode] = useState('')
  const [unitType, setUnitType] = useState('كرتونة')
  const [weightPerCarton, setWeightPerCarton] = useState('10')
  const [piecesPerCarton, setPiecesPerCarton] = useState('')
  const [grainsPerPiece, setGrainsPerPiece] = useState('')
  const [pieceWeight, setPieceWeight] = useState('')
  const [grainWeight, setGrainWeight] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [pieceBuyPrice, setPieceBuyPrice] = useState('')
  const [pieceSellPrice, setPieceSellPrice] = useState('')
  const [grainBuyPrice, setGrainBuyPrice] = useState('')
  const [grainSellPrice, setGrainSellPrice] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (item && isOpen) {
      setPrimaryCategory(item.primaryCategory || categories[0] || 'أسماك')
      setSubCategory(item.subCategory || '')
      setSecondaryCategory(item.secondaryCategory || '')
      setCompositeName(item.compositeName || '')
      setCode(item.code || '')
      setUnitType(item.unitType || 'كرتونة')
      setWeightPerCarton(String(item.weightPerCarton || 10))
      setPiecesPerCarton(String(item.piecesPerCarton || ''))
      setGrainsPerPiece(String(item.grainsPerPiece || ''))
      setPieceWeight(String(item.pieceWeight || ''))
      setGrainWeight(String(item.grainWeight || ''))
      setBuyPrice(String(item.buyPrice || ''))
      setSellPrice(String(item.sellPrice || ''))
      setPieceBuyPrice(String(item.pieceBuyPrice || ''))
      setPieceSellPrice(String(item.pieceSellPrice || ''))
      setGrainBuyPrice(String(item.grainBuyPrice || ''))
      setGrainSellPrice(String(item.grainSellPrice || ''))
      setErrorMsg(null)
    }
  }, [item, isOpen, categories])

  if (!isOpen || !item) return null

  const availableSubs = subCategories[primaryCategory] || []

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!subCategory.trim()) {
      setErrorMsg('يرجى اختيار أو كتابة القسم الفرعي (النوع)')
      return
    }

    if (Number(piecesPerCarton) > 0 && !pieceSellPrice && Number(pieceSellPrice) !== 0) {
      setErrorMsg('يرجى تحديد سعر بيع القطعة')
      return
    }

    if (Number(grainsPerPiece) > 0 && !grainSellPrice && Number(grainSellPrice) !== 0) {
      setErrorMsg('يرجى تحديد سعر بيع الحبة')
      return
    }

    const finalName = compositeName.trim() || [subCategory.trim(), secondaryCategory?.trim()].filter(Boolean).join(' ')

    const updated = {
      ...item,
      primaryCategory,
      subCategory: subCategory.trim(),
      secondaryCategory: secondaryCategory?.trim() || null,
      compositeName: finalName,
      unitType,
      units: [unitType, Number(piecesPerCarton) > 0 ? 'قطعة' : null, Number(grainsPerPiece) > 0 ? 'حبة' : null, 'كيلو'].filter(Boolean),
      weightPerCarton: unitType === 'كرتونة' ? Number(weightPerCarton) || 10 : 1,
      piecesPerCarton: Number(piecesPerCarton) || null,
      grainsPerPiece: Number(grainsPerPiece) || null,
      pieceWeight: pieceWeight?.trim() || null,
      grainWeight: grainWeight?.trim() || null,
      buyPrice: Number(buyPrice) || 0,
      sellPrice: Number(sellPrice) || 0,
      pieceBuyPrice: Number(pieceBuyPrice) || null,
      pieceSellPrice: Number(pieceSellPrice) || null,
      grainBuyPrice: Number(grainBuyPrice) || null,
      grainSellPrice: Number(grainSellPrice) || null,
      code: code.trim() || item.code,
    }

    try {
      onSave(updated)
      axToast.success('تم حفظ تعديلات الصنف بنجاح')
      onClose()
    } catch {
      axToast.error('فشل تعديل الصنف')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden overscroll-contain">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
              <Edit3 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-on-surface">تعديل بيانات الصنف</h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">تعديل التوصيف والأسعار والتعبئة</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs font-bold overscroll-contain">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-error/10 border border-error/30 text-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-black">{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-black text-primary flex items-center gap-1.5">
              <Tag className="w-4 h-4" />
              <span>الاسم المعتمد بالفاتورة:</span>
            </label>
            <input
              type="text"
              required
              value={compositeName}
              onChange={(e) => setCompositeName(e.target.value)}
              placeholder="اكتب اسم الصنف كما سيظهر في الفاتورة والطباعة..."
              className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-primary/40 focus:border-primary text-on-surface font-black text-sm outline-none transition-all shadow-xs text-right"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 relative z-30">
            <AX_CategorySelect
              label="القسم الرئيسي"
              value={primaryCategory}
              onChange={(val) => { setPrimaryCategory(val); setSubCategory(''); }}
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
              onAddCategory={(name) => addSubCategory?.(primaryCategory, name)}
              onEditCategory={(oldN, newN) => editSubCategory?.(primaryCategory, oldN, newN)}
              onDeleteCategory={(name) => deleteSubCategory?.(primaryCategory, name)}
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
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AX_EditItemModal
