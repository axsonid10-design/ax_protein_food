export function calculateSuggestedUnitPrices(params = {}) {
  const safeParams = params && typeof params === 'object' ? params : {}
  const {
    sellPrice = 0,
    buyPrice = 0,
    piecesPerCarton = null,
    weightPerCarton = null,
    pieceWeight = null,
    unitType = 'كرتونة',
  } = safeParams

  const numSell = Number(sellPrice) || 0
  const numBuy = Number(buyPrice) || 0
  const numPieces = Number(piecesPerCarton) || 0
  const numWeight = Number(weightPerCarton) || (unitType === 'كرتونة' ? 10 : 0)
  const numPieceWeight = parseFloat(pieceWeight) || 0

  let suggestedPieceSell = null
  let suggestedPieceBuy = null

  if (unitType === 'كيلو') {
    if (numPieceWeight > 0 && numSell > 0) {
      suggestedPieceSell = Number((numSell * numPieceWeight).toFixed(2))
    } else if (numPieces > 0 && numSell > 0) {
      suggestedPieceSell = Number((numSell / numPieces).toFixed(2))
    }
    if (numPieceWeight > 0 && numBuy > 0) {
      suggestedPieceBuy = Number((numBuy * numPieceWeight).toFixed(2))
    } else if (numPieces > 0 && numBuy > 0) {
      suggestedPieceBuy = Number((numBuy / numPieces).toFixed(2))
    }
  } else {
    suggestedPieceSell =
      numPieces > 0 && numSell > 0
        ? Number((numSell / numPieces).toFixed(2))
        : null

    suggestedPieceBuy =
      numPieces > 0 && numBuy > 0
        ? Number((numBuy / numPieces).toFixed(2))
        : null
  }

  const suggestedKgSell =
    unitType === 'كيلو' && numSell > 0
      ? numSell
      : numWeight > 0 && numSell > 0
      ? Number((numSell / numWeight).toFixed(2))
      : null

  const suggestedKgBuy =
    unitType === 'كيلو' && numBuy > 0
      ? numBuy
      : numWeight > 0 && numBuy > 0
      ? Number((numBuy / numWeight).toFixed(2))
      : null

  return {
    suggestedPieceSell,
    suggestedPieceBuy,
    suggestedKgSell,
    suggestedKgBuy,
  }
}

export const calculateSuggestedPrices = calculateSuggestedUnitPrices

export function isPriceOverridden(manualPrice, suggestedPrice) {
  if (manualPrice === '' || manualPrice === null || manualPrice === undefined) {
    return false
  }
  const m = Number(manualPrice)
  if (isNaN(m) || m <= 0) {
    return false
  }
  if (suggestedPrice === null || suggestedPrice === undefined || suggestedPrice === '') {
    return true
  }
  const s = Number(suggestedPrice)
  if (isNaN(s)) {
    return true
  }
  return Math.round(Math.abs(m - s) * 1000) / 1000 > 0.009
}

export function resolveInvoiceUnitPrice(item, selectedUnit = 'كرتونة', isSale = true) {
  if (!item) return 0
  const unit = String(selectedUnit || item.unitType || item.unit_type || 'كرتونة').trim()
  const cartonPrice = Number(isSale ? (item.sellPrice ?? item.sell_price ?? 0) : (item.buyPrice ?? item.buy_price ?? 0)) || 0

  if (unit === 'كرتونة') {
    return cartonPrice
  }

  const isSub = unit === 'قطعة' || unit === 'كيس' || unit === 'طبق' || (item.subUnitType && unit === item.subUnitType) || (item.sub_unit_type && unit === item.sub_unit_type)
  if (isSub) {
    const piecePrice = Number(isSale ? (item.pieceSellPrice ?? item.piece_sell_price) : (item.pieceBuyPrice ?? item.piece_buy_price))
    if (piecePrice > 0) {
      return piecePrice
    }
    const numPieces = Number(item.piecesPerCarton ?? item.pieces_per_carton) || 0
    if (numPieces > 0 && cartonPrice > 0) {
      return Number((cartonPrice / numPieces).toFixed(2))
    }
    return cartonPrice
  }

  if (unit === 'كيلو') {
    const kgPrice = Number(isSale ? (item.kgSellPrice ?? item.kg_sell_price) : (item.kgBuyPrice ?? item.kg_buy_price))
    if (kgPrice > 0) {
      return kgPrice
    }
    if (item.unitType === 'كيلو' || item.unit_type === 'كيلو') {
      return cartonPrice
    }
    const numWeight = Number(item.weightPerCarton ?? item.weight_per_carton) || 0
    if (numWeight > 0 && cartonPrice > 0) {
      return Number((cartonPrice / numWeight).toFixed(2))
    }
    return cartonPrice
  }

  return cartonPrice
}

export const resolveItemUnitPrice = resolveInvoiceUnitPrice

export function getCartonEquivalent(quantity, unit = 'كرتونة', item = {}) {
  const qty = Number(quantity) || 0
  if (qty <= 0) return 0
  const u = String(unit || item?.unitType || item?.unit_type || 'كرتونة').trim()
  const pieces = Number(item?.piecesPerCarton ?? item?.pieces_per_carton ?? 0)
  const weight = Number(item?.weightPerCarton ?? item?.weight_per_carton ?? 0)
  const isSub = u === 'قطعة' || u === 'كيس' || u === 'طبق' || (item?.subUnitType && u === item.subUnitType) || (item?.sub_unit_type && u === item.sub_unit_type)
  if (isSub && pieces > 0) {
    return Number((qty / pieces).toFixed(4))
  }
  if (u === 'كيلو' && weight > 0 && item?.unitType !== 'كيلو' && item?.unit_type !== 'كيلو') {
    return Number((qty / weight).toFixed(4))
  }
  return qty
}
