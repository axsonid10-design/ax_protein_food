import React from 'react'
import { Package, Boxes, Scale, CircleDot, DollarSign, ChevronDown } from 'lucide-react'

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
}) {
  const isCarton = unitType === 'كرتونة'
  const hasPieces = Boolean(Number(piecesPerCarton) > 0)
  const hasGrains = Boolean(Number(grainsPerPiece) > 0)

  const numBuy = Number(buyPrice) || 0
  const numSell = Number(sellPrice) || 0
  const numPieces = Number(piecesPerCarton) || 0
  const numGrains = Number(grainsPerPiece) || 0

  const suggestedPieceSell = numPieces > 0 && numSell > 0 ? (numSell / numPieces).toFixed(2) : ''
  const suggestedPieceBuy = numPieces > 0 && numBuy > 0 ? (numBuy / numPieces).toFixed(2) : ''

  const suggestedGrainSell = numGrains > 0 && Number(pieceSellPrice || suggestedPieceSell) > 0
    ? (Number(pieceSellPrice || suggestedPieceSell) / numGrains).toFixed(2)
    : ''

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

        {hasPieces && (
          <div className="p-3 rounded-2xl bg-surface-low/50 border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-on-surface">
              <span>أسعار القطعة (محددة بعدد {piecesPerCarton} قطعة)</span>
              {suggestedPieceSell && (
                <span className="text-[10px] font-mono text-primary font-bold">
                  سعر القطعة المقترح: {suggestedPieceSell} ج.م
                </span>
              )}
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
                  placeholder={suggestedPieceBuy || '0'}
                  value={pieceBuyPrice}
                  onChange={(e) => setPieceBuyPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right"
                />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">
                  سعر بيع القطعة (ج.م) *
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={suggestedPieceSell || '0'}
                  value={pieceSellPrice}
                  onChange={(e) => setPieceSellPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-primary/50 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
