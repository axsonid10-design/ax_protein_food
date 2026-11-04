import React, { useEffect, useState } from 'react'
import { Package, Boxes, Scale, CircleDot, DollarSign, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react'
import { calculateSuggestedUnitPrices, isPriceOverridden } from '../../utils/pricingCalculations'

export function AX_ItemPackagingFields({
  unitType,
  setUnitType,
  weightPerCarton,
  setWeightPerCarton,
  piecesPerCarton,
  setPiecesPerCarton,
  grainsPerPiece,
  setGrainsPerPiece,
  pieceWeight,
  setPieceWeight,
  grainWeight,
  setGrainWeight,
  buyPrice,
  setBuyPrice,
  sellPrice,
  setSellPrice,
  pieceBuyPrice,
  setPieceBuyPrice,
  pieceSellPrice,
  setPieceSellPrice,
  grainBuyPrice,
  setGrainBuyPrice,
  grainSellPrice,
  setGrainSellPrice,
  kgBuyPrice,
  setKgBuyPrice,
  kgSellPrice,
  setKgSellPrice,
}) {
  const isCarton = unitType === 'كرتونة'
  const hasPieces = Boolean(Number(piecesPerCarton) > 0)
  const hasGrains = Boolean(Number(grainsPerPiece) > 0)
  const numWeight = Number(weightPerCarton) || (isCarton ? 10 : 0)
  const hasKgPricing = isCarton || numWeight > 0

  const {
    suggestedPieceSell,
    suggestedPieceBuy,
    suggestedKgSell,
    suggestedKgBuy,
  } = calculateSuggestedUnitPrices({
    sellPrice,
    buyPrice,
    piecesPerCarton,
    weightPerCarton,
    unitType,
  })

  const [userOverrodeKgSell, setUserOverrodeKgSell] = useState(false)
  const [userOverrodePieceSell, setUserOverrodePieceSell] = useState(false)

  useEffect(() => {
    if (!userOverrodeKgSell && suggestedKgSell && setKgSellPrice && !kgSellPrice) {
      setKgSellPrice(String(suggestedKgSell))
    }
  }, [suggestedKgSell, userOverrodeKgSell, kgSellPrice, setKgSellPrice])

  useEffect(() => {
    if (!userOverrodePieceSell && suggestedPieceSell && setPieceSellPrice && !pieceSellPrice) {
      setPieceSellPrice(String(suggestedPieceSell))
    }
  }, [suggestedPieceSell, userOverrodePieceSell, pieceSellPrice, setPieceSellPrice])

  const isKgSellCustom = isPriceOverridden(kgSellPrice, suggestedKgSell)
  const isPieceSellCustom = isPriceOverridden(pieceSellPrice, suggestedPieceSell)

  return (
    <div className="space-y-4 pt-2 border-t border-surface-container">
      <div className="space-y-1.5">
        <label className="block text-xs font-black text-on-surface-variant text-right">
          وحدة التعامل والبيع الأساسية
        </label>
        <div className="grid grid-cols-3 gap-2">
          {['كرتونة', 'كيلو', 'قطعة'].map((u) => {
            const isSelected = unitType === u
            return (
              <button
                key={u}
                type="button"
                onClick={() => setUnitType(u)}
                className={`py-2 px-3 rounded-2xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface-low border-outline-variant/30 text-on-surface hover:bg-surface-container'
                }`}
              >
                {u === 'كرتونة' && <Package className="w-3.5 h-3.5" />}
                {u === 'كيلو' && <Scale className="w-3.5 h-3.5" />}
                {u === 'قطعة' && <Boxes className="w-3.5 h-3.5" />}
                <span>{u}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-surface-low/70 border border-outline-variant/30 rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-on-surface flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5 text-primary" />
            <span>تفاصيل التعبئة والتحويل (اختياري)</span>
          </span>
          <span className="text-[10px] text-on-surface-variant font-bold">
            يتيح البيع بالكرتونة والقطعة والكيلو
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isCarton && (
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">
                وزن الكرتونة (كجم)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="مثال: 10"
                value={weightPerCarton}
                onChange={(e) => setWeightPerCarton(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">
              عدد القطع في الكرتونة
            </label>
            <input
              type="number"
              min="0"
              placeholder="مثال: 12 (اختياري)"
              value={piecesPerCarton}
              onChange={(e) => setPiecesPerCarton(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right"
            />
          </div>
        </div>

        {hasPieces && (
          <div className="pt-2 border-t border-surface-container/60">
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">
                وزن القطعة الواحدة (اختياري)
              </label>
              <input
                type="text"
                placeholder="مثال: 800 جرام أو 0.8 كجم"
                value={pieceWeight}
                onChange={(e) => setPieceWeight(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-bold text-on-surface focus:outline-none focus:border-primary text-right"
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="block text-xs font-black text-on-surface-variant text-right">
          أسعار الشراء والبيع ({unitType})
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">
              سعر شراء {unitType} (ج.م)
            </span>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="w-full pr-8 pl-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right"
              />
              <DollarSign className="w-3.5 h-3.5 text-on-surface-variant absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">
              سعر بيع {unitType} (ج.م)
            </span>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-full pr-8 pl-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right"
              />
              <DollarSign className="w-3.5 h-3.5 text-primary absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {hasKgPricing && (
          <div className="p-3 rounded-2xl bg-surface-low/50 border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1.5 text-xs font-black text-on-surface">
              <span className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-primary" />
                <span>أسعار الكيلو (سعر تجزئة الكيلو من الكرتونة)</span>
              </span>
              <div className="flex items-center gap-2">
                {isKgSellCustom ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>سعر مخصص (تعديل يدوي)</span>
                    {suggestedKgSell && <span className="font-mono">• المقترح: {suggestedKgSell} ج.م</span>}
                  </span>
                ) : suggestedKgSell ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>سعر مقترح متطابق ({suggestedKgSell} ج.م)</span>
                  </span>
                ) : null}
                {isKgSellCustom && suggestedKgSell && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserOverrodeKgSell(false)
                      setKgSellPrice?.(String(suggestedKgSell))
                    }}
                    className="text-[10px] text-primary hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>استعادة المقترح</span>
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">
                  سعر شراء الكيلو (ج.م)
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={suggestedKgBuy ? String(suggestedKgBuy) : '0'}
                  value={kgBuyPrice || ''}
                  onChange={(e) => setKgBuyPrice?.(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right"
                />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">
                  سعر بيع الكيلو (ج.م)
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={suggestedKgSell ? String(suggestedKgSell) : '0'}
                  value={kgSellPrice || ''}
                  onChange={(e) => {
                    setUserOverrodeKgSell(true)
                    setKgSellPrice?.(e.target.value)
                  }}
                  className={`w-full px-3 py-2 rounded-xl bg-surface-lowest border text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right ${
                    isKgSellCustom ? 'border-amber-500/50' : 'border-primary/50'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {hasPieces && (
          <div className="p-3 rounded-2xl bg-surface-low/50 border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1.5 text-xs font-black text-on-surface">
              <span className="flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-primary" />
                <span>أسعار القطعة (محددة بعدد {piecesPerCarton} قطعة)</span>
              </span>
              <div className="flex items-center gap-2">
                {isPieceSellCustom ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>سعر مخصص (تعديل يدوي)</span>
                    {suggestedPieceSell && <span className="font-mono">• المقترح: {suggestedPieceSell} ج.م</span>}
                  </span>
                ) : suggestedPieceSell ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>سعر مقترح متطابق ({suggestedPieceSell} ج.م)</span>
                  </span>
                ) : null}
                {isPieceSellCustom && suggestedPieceSell && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserOverrodePieceSell(false)
                      setPieceSellPrice?.(String(suggestedPieceSell))
                    }}
                    className="text-[10px] text-primary hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>استعادة المقترح</span>
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">
                  سعر شراء القطعة (ج.م)
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={suggestedPieceBuy ? String(suggestedPieceBuy) : '0'}
                  value={pieceBuyPrice || ''}
                  onChange={(e) => setPieceBuyPrice?.(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right"
                />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">
                  سعر بيع القطعة (ج.م)
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={suggestedPieceSell ? String(suggestedPieceSell) : '0'}
                  value={pieceSellPrice || ''}
                  onChange={(e) => {
                    setUserOverrodePieceSell(true)
                    setPieceSellPrice?.(e.target.value)
                  }}
                  className={`w-full px-3 py-2 rounded-xl bg-surface-lowest border text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right ${
                    isPieceSellCustom ? 'border-amber-500/50' : 'border-primary/50'
                  }`}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
