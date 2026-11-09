import React, { useEffect, useState } from 'react'
import { Package, Boxes, Scale, DollarSign, AlertTriangle, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react'
import { calculateSuggestedUnitPrices, isPriceOverridden } from '../../utils/pricingCalculations'

function PackagingPricingCard({ icon: Icon, title, buyPrice, onBuyPriceChange, suggestedBuy, sellPrice, onSellPriceChange, suggestedSell, isCustom, onReset }) {
  return (
    <div className="p-3 rounded-2xl bg-surface-low/50 border border-outline-variant/30 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-1.5 text-xs font-black text-on-surface">
        <span className="flex items-center gap-1.5">{Icon && <Icon className="w-3.5 h-3.5 text-primary" />}<span>{title}</span></span>
        <div className="flex items-center gap-2">
          {isCustom ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30">
              <Sparkles className="w-3 h-3 text-amber-600" /><span>سعر مخصص (تعديل يدوي)</span>
              {suggestedSell && <span className="font-mono">• المقترح: {suggestedSell} ج.م</span>}
            </span>
          ) : suggestedSell ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /><span>سعر مقترح متطابق ({suggestedSell} ج.م)</span>
            </span>
          ) : null}
          {isCustom && suggestedSell && onReset && (
            <button type="button" onClick={onReset} className="text-[10px] text-primary hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer">
              <RotateCcw className="w-2.5 h-2.5" /><span>استعادة المقترح</span>
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">سعر الشراء (ج.م)</span>
          <input type="number" min="0" step="any" placeholder={suggestedBuy ? String(suggestedBuy) : '0'} value={buyPrice || ''} onChange={(e) => onBuyPriceChange?.(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right" />
        </div>
        <div>
          <span className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">سعر البيع (ج.م)</span>
          <input type="number" min="0" step="any" placeholder={suggestedSell ? String(suggestedSell) : '0'} value={sellPrice || ''} onChange={(e) => onSellPriceChange?.(e.target.value)} className={`w-full px-3 py-2 rounded-xl bg-surface-lowest border text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right ${isCustom ? 'border-amber-500/50' : 'border-primary/50'}`} />
        </div>
      </div>
    </div>
  )
}

export function AX_ItemPackagingFields({
  unitType, setUnitType, weightPerCarton, setWeightPerCarton, piecesPerCarton, setPiecesPerCarton,
  grainsPerPiece, setGrainsPerPiece, pieceWeight, setPieceWeight, grainWeight, setGrainWeight,
  buyPrice, setBuyPrice, sellPrice, setSellPrice, pieceBuyPrice, setPieceBuyPrice,
  pieceSellPrice, setPieceSellPrice, grainBuyPrice, setGrainBuyPrice, grainSellPrice, setGrainSellPrice,
  kgBuyPrice, setKgBuyPrice, kgSellPrice, setKgSellPrice, subUnitType = 'طبق', setSubUnitType,
  minStockAlert = '', setMinStockAlert,
}) {
  const isCarton = unitType === 'كرتونة'
  const isKilo = unitType === 'كيلو'
  const isPiece = unitType === 'قطعة'
  const effectiveSubUnit = subUnitType === 'كيس' ? 'طبق' : (subUnitType || 'طبق')

  useEffect(() => {
    if (subUnitType === 'كيس') setSubUnitType?.('طبق')
  }, [subUnitType, setSubUnitType])

  const numWeight = Number(weightPerCarton) || (isCarton ? 10 : 0)
  const numPieceWeight = parseFloat(pieceWeight) || 0
  const hasPieces = Boolean(Number(piecesPerCarton) > 0 || (isKilo && numPieceWeight > 0))
  const hasKgPricing = isCarton || numWeight > 0 || isKilo

  const { suggestedPieceSell, suggestedPieceBuy, suggestedKgSell, suggestedKgBuy } = calculateSuggestedUnitPrices({
    sellPrice, buyPrice, piecesPerCarton, weightPerCarton, pieceWeight, unitType,
  })

  const [userOverrodeKgSell, setUserOverrodeKgSell] = useState(false)
  const [userOverrodePieceSell, setUserOverrodePieceSell] = useState(false)

  useEffect(() => {
    if (!userOverrodeKgSell && suggestedKgSell && setKgSellPrice && !kgSellPrice) setKgSellPrice(String(suggestedKgSell))
  }, [suggestedKgSell, userOverrodeKgSell, kgSellPrice, setKgSellPrice])

  useEffect(() => {
    if (!userOverrodePieceSell && suggestedPieceSell && setPieceSellPrice && !pieceSellPrice) setPieceSellPrice(String(suggestedPieceSell))
  }, [suggestedPieceSell, userOverrodePieceSell, pieceSellPrice, setPieceSellPrice])

  const isKgSellCustom = isPriceOverridden(kgSellPrice, suggestedKgSell)
  const isPieceSellCustom = isPriceOverridden(pieceSellPrice, suggestedPieceSell)

  return (
    <div className="space-y-4 pt-2 border-t border-surface-container">
      <div className="space-y-1.5">
        <label className="block text-xs font-black text-on-surface-variant text-right">وحدة التعامل والبيع الأساسية</label>
        <div className="grid grid-cols-3 gap-2">
          {['كرتونة', 'كيلو', 'قطعة'].map((u) => {
            const isSelected = unitType === u
            return (
              <button key={u} type="button" onClick={() => { setUnitType(u); if (u === 'كيلو' && (subUnitType === 'كيس' || !subUnitType)) setSubUnitType?.('طبق') }} className={`py-2 px-3 rounded-2xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${isSelected ? 'bg-primary text-white border-primary shadow-xs' : 'bg-surface-low border-outline-variant/30 text-on-surface hover:bg-surface-container'}`}>
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
            <span>{isCarton && 'تفاصيل التعبئة والوحدة الصغرى داخل الكرتونة'}{isKilo && 'تفاصيل تعبئة وتجزئة الكيلو'}{isPiece && 'تفاصيل تعبئة وتجزئة القطعة'}</span>
          </span>
          <span className="text-[10px] text-on-surface-variant font-bold">{isCarton && 'تجزئة الكرتونة لأطباق أو قطع أو كيلو'}{isKilo && 'تحديد وعاء الكيلو والوزن للطبق'}{isPiece && 'تحديد وزن القطعة وتعبئتها'}</span>
        </div>

        {isCarton && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-on-surface-variant text-right">الوحدة الصغرى للتجزئة داخل الكرتونة</label>
              <div className="grid grid-cols-3 gap-2">
                {['طبق', 'قطعة', 'كيلو'].map((sub) => (
                  <button key={sub} type="button" onClick={() => setSubUnitType?.(sub)} className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${effectiveSubUnit === sub ? 'bg-secondary text-white border-secondary shadow-xs' : 'bg-surface-lowest border-outline-variant/30 text-on-surface hover:bg-surface-container'}`}>{sub}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">وزن الكرتونة الإجمالي (كجم)</label>
                <input type="number" step="any" min="0" placeholder="مثال: 10 أو 20" value={weightPerCarton} onChange={(e) => setWeightPerCarton(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right" />
              </div>
              {effectiveSubUnit !== 'كيلو' && (
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">عدد {effectiveSubUnit === 'طبق' ? 'الأطباق' : 'القطع'} بالكرتونة</label>
                  <input type="number" min="0" placeholder="مثال: 12 أو 20" value={piecesPerCarton} onChange={(e) => setPiecesPerCarton(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right" />
                </div>
              )}
            </div>

            {effectiveSubUnit !== 'كيلو' && (
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">وزن {effectiveSubUnit} الواحد (كجم / جرام)</label>
                <input type="text" placeholder="مثال: 0.8 كجم أو 800 جرام" value={pieceWeight} onChange={(e) => setPieceWeight(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-bold text-on-surface focus:outline-none focus:border-primary text-right" />
              </div>
            )}
          </div>
        )}

        {isKilo && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-on-surface-variant text-right">وعاء وتعبئة الكيلو</label>
              <div className="grid grid-cols-4 gap-2">
                {['طبق', 'كرتونة', 'قطعة', 'سائب'].map((sub) => (
                  <button key={sub} type="button" onClick={() => setSubUnitType?.(sub)} className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${effectiveSubUnit === sub ? 'bg-secondary text-white border-secondary shadow-xs' : 'bg-surface-lowest border-outline-variant/30 text-on-surface hover:bg-surface-container'}`}>{sub}</button>
                ))}
              </div>
            </div>

            {effectiveSubUnit === 'طبق' && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">وزن الطبق الواحد (كجم) *</label>
                    <input type="number" step="any" min="0" placeholder="مثال: 0.5 أو 0.4 أو 0.8 كجم" value={pieceWeight} onChange={(e) => setPieceWeight(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">عدد الأطباق بالكرتونة (اختياري)</label>
                    <input type="number" min="0" placeholder="مثال: 10 أو 20 طبق" value={piecesPerCarton} onChange={(e) => setPiecesPerCarton(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right" />
                  </div>
                </div>
                {numPieceWeight > 0 && (
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-[11px] font-black text-primary flex items-center justify-between">
                    <span>وزن الطبق: {numPieceWeight} كجم</span>
                    <span>الكيلو = {(1 / numPieceWeight).toFixed(1)} طبق</span>
                  </div>
                )}
              </div>
            )}

            {effectiveSubUnit === 'كرتونة' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">إجمالي وزن الكرتونة (كجم) *</label>
                  <input type="number" step="any" min="0" placeholder="مثال: 10 أو 20 كجم" value={weightPerCarton} onChange={(e) => setWeightPerCarton(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right" />
                </div>
                {Number(weightPerCarton) > 0 && (
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-[11px] font-black text-primary">الكرتونة تحتوي على {weightPerCarton} كجم</div>
                )}
              </div>
            )}

            {effectiveSubUnit === 'قطعة' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">متوسط وزن القطعة (كجم)</label>
                  <input type="number" step="any" min="0" placeholder="مثال: 0.25 أو 1.5 كجم" value={pieceWeight} onChange={(e) => setPieceWeight(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">عدد القطع بالكرتونة (اختياري)</label>
                  <input type="number" min="0" placeholder="مثال: 12 قطعة" value={piecesPerCarton} onChange={(e) => setPiecesPerCarton(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right" />
                </div>
              </div>
            )}

            {effectiveSubUnit === 'سائب' && (
              <div className="p-2.5 rounded-xl bg-surface-lowest border border-outline-variant/30 text-[11px] font-bold text-on-surface-variant">بيع وتداول بالوزن الحر (كيلو / جرام) بالميزان مباشرة بدون تعبئة مسبقة</div>
            )}
          </div>
        )}

        {isPiece && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">وزن القطعة الواحدة (كجم)</label>
              <input type="text" placeholder="مثال: 0.5 كجم أو 800 جرام" value={pieceWeight} onChange={(e) => setPieceWeight(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-bold text-on-surface focus:outline-none focus:border-primary text-right" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">عدد القطع بالكرتونة (اختياري)</label>
              <input type="number" min="0" placeholder="مثال: 20 قطعة" value={piecesPerCarton} onChange={(e) => setPiecesPerCarton(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right" />
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-surface-container/60">
          <label className="block text-[11px] font-black text-rose-700 mb-1 text-right flex items-center justify-between">
            <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-rose-600" /><span>حد النواقص للتنبيه (الحد الأدنى للرصيد)</span></span>
            <span className="text-[10px] text-on-surface-variant font-bold">تلوين الصنف بالأحمر عند النقص</span>
          </label>
          <input type="number" min="0" step="any" placeholder={`مثال: 10 ${unitType} للتنبيه`} value={minStockAlert} onChange={(e) => setMinStockAlert?.(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface-lowest border border-rose-300 focus:border-rose-500 text-xs font-mono font-bold text-on-surface focus:outline-none text-right" />
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-xs font-black text-on-surface-variant text-right">أسعار الشراء والبيع ({unitType})</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">سعر شراء {unitType} (ج.م)</span>
            <div className="relative">
              <input type="number" min="0" step="any" placeholder="0" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} className="w-full pr-8 pl-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right" />
              <DollarSign className="w-3.5 h-3.5 text-on-surface-variant absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-bold text-on-surface-variant mb-1 text-right">سعر بيع {unitType} (ج.م)</span>
            <div className="relative">
              <input type="number" min="0" step="any" placeholder="0" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} className="w-full pr-8 pl-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary text-right" />
              <DollarSign className="w-3.5 h-3.5 text-primary absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {isCarton && hasKgPricing && (
          <PackagingPricingCard
            icon={Scale} title="أسعار الكيلو (تجزئة من الكرتونة)" buyPrice={kgBuyPrice} onBuyPriceChange={setKgBuyPrice}
            suggestedBuy={suggestedKgBuy} sellPrice={kgSellPrice}
            onSellPriceChange={(val) => { setUserOverrodeKgSell(true); setKgSellPrice?.(val) }}
            suggestedSell={suggestedKgSell} isCustom={isKgSellCustom}
            onReset={() => { setUserOverrodeKgSell(false); setKgSellPrice?.(String(suggestedKgSell)) }}
          />
        )}

        {(isCarton || isKilo) && hasPieces && effectiveSubUnit !== 'سائب' && (
          <PackagingPricingCard
            icon={Boxes} title={`أسعار ${effectiveSubUnit} (${isKilo ? `بوزن ${pieceWeight || 0} كجم` : `بعدد ${piecesPerCarton || 0}`})`}
            buyPrice={pieceBuyPrice} onBuyPriceChange={setPieceBuyPrice}
            suggestedBuy={suggestedPieceBuy} sellPrice={pieceSellPrice}
            onSellPriceChange={(val) => { setUserOverrodePieceSell(true); setPieceSellPrice?.(val) }}
            suggestedSell={suggestedPieceSell} isCustom={isPieceSellCustom}
            onReset={() => { setUserOverrodePieceSell(false); setPieceSellPrice?.(String(suggestedPieceSell)) }}
          />
        )}
      </div>
    </div>
  )
}
