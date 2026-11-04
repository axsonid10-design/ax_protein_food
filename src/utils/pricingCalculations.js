export function calculateSuggestedUnitPrices(params = {}) {
  const safeParams = params && typeof params === 'object' ? params : {}
  const {
    sellPrice = 0,
    buyPrice = 0,
    piecesPerCarton = null,
    weightPerCarton = null,
    unitType = 'كرتونة',
  } = safeParams

  const numSell = Number(sellPrice) || 0
  const numBuy = Number(buyPrice) || 0
  const numPieces = Number(piecesPerCarton) || 0
  const numWeight = Number(weightPerCarton) || (unitType === 'كرتونة' ? 10 : 0)

  const suggestedPieceSell =
    numPieces > 0 && numSell > 0
      ? Number((numSell / numPieces).toFixed(2))
      : null

  const suggestedPieceBuy =
    numPieces > 0 && numBuy > 0
      ? Number((numBuy / numPieces).toFixed(2))
      : null

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
  const unit = String(selectedUnit || item.unitType || 'كرتونة').trim()
  const cartonPrice = Number(isSale ? (item.sellPrice ?? 0) : (item.buyPrice ?? 0)) || 0

  if (unit === 'كرتونة') {
    return cartonPrice
  }

  if (unit === 'قطعة') {
    const piecePrice = Number(isSale ? item.pieceSellPrice : item.pieceBuyPrice)
    if (piecePrice > 0) {
      return piecePrice
    }
    const numPieces = Number(item.piecesPerCarton) || 0
    if (numPieces > 0 && cartonPrice > 0) {
      return Number((cartonPrice / numPieces).toFixed(2))
    }
    return cartonPrice
  }

  if (unit === 'كيلو') {
    const kgPrice = Number(isSale ? item.kgSellPrice : item.kgBuyPrice)
    if (kgPrice > 0) {
      return kgPrice
    }
    if (item.unitType === 'كيلو') {
      return cartonPrice
    }
    const numWeight = Number(item.weightPerCarton) || 0
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
  const u = String(unit || item?.unitType || 'كرتونة').trim()
  if (u === 'قطعة' && Number(item?.piecesPerCarton) > 0) {
    return qty / Number(item.piecesPerCarton)
  }
  if (u === 'كيلو' && Number(item?.weightPerCarton) > 0) {
    return qty / Number(item.weightPerCarton)
  }
  return qty
}
