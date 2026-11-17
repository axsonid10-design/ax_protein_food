export function roundMax3(val) {
  const num = Number(val)
  if (!Number.isFinite(num)) return 0
  return Number(num.toFixed(3))
}

export function formatStockPackages(quantity, unit, item) {
  const numQty = Number(quantity || 0)
  if (!Number.isFinite(numQty)) return '0'
  const currentUnit = unit || item?.unitType || item?.unit_type || 'كرتونة'
  const pieces = Number(item?.piecesPerCarton || item?.pieces_per_carton || 0)
  const subUnit = item?.subUnitType || item?.sub_unit_type || 'قطعة'

  if (currentUnit === 'كرتونة' && pieces > 1) {
    const totalSub = Math.round(numQty * pieces)
    if (totalSub === 0) return '0 كرتونة'
    const sign = totalSub < 0 ? '-' : ''
    const absSub = Math.abs(totalSub)
    const wholeCartons = Math.floor(absSub / pieces)
    const remPieces = absSub % pieces
    if (wholeCartons === 0) return `${sign}${remPieces} ${subUnit}`
    if (remPieces === 0) return `${sign}${wholeCartons} كرتونة`
    return `${sign}${wholeCartons} كرتونة و ${remPieces} ${subUnit}`
  }

  if (currentUnit === 'قطعة' || currentUnit === 'طبق' || currentUnit === 'كيس') {
    return `${Math.round(numQty)} ${currentUnit}`
  }

  return `${roundMax3(numQty)} ${currentUnit}`
}

export function formatDualUnits(quantity, unit, item) {
  const numQty = Number(quantity || 0)
  const currentUnit = unit || item?.unitType || 'كرتونة'
  const pieces = Number(item?.piecesPerCarton || item?.pieces_per_carton || 0)
  const subUnit = item?.subUnitType || item?.sub_unit_type || 'كيس'
  const weight = Number(item?.weightPerCarton || item?.weight_per_carton || 0)

  if (currentUnit === 'كرتونة' && pieces > 1) {
    const totalSub = Math.round(numQty * pieces)
    if (totalSub === 0) return `0 كرتونة (0 ${subUnit})`
    const sign = totalSub < 0 ? '-' : ''
    const absSub = Math.abs(totalSub)
    const wholeCartons = Math.floor(absSub / pieces)
    const remPieces = absSub % pieces
    if (wholeCartons === 0) return `${sign}${remPieces} ${subUnit}`
    if (remPieces === 0) return `${sign}${wholeCartons} كرتونة (${sign}${absSub.toLocaleString('en-US')} ${subUnit})`
    return `${sign}${wholeCartons} كرتونة و ${remPieces} ${subUnit} (${sign}${absSub.toLocaleString('en-US')} ${subUnit})`
  }

  if ((currentUnit === 'كيس' || currentUnit === 'قطعة' || currentUnit === 'طبق') && pieces > 1) {
    const wholeSub = Math.round(numQty)
    const formattedCartons = roundMax3(wholeSub / pieces)
    return `${wholeSub} ${currentUnit} (${formattedCartons} كرتونة)`
  }

  if (currentUnit === 'كرتونة' && weight > 0) {
    const cleanQty = roundMax3(numQty)
    const totalWeight = roundMax3(numQty * weight)
    return `${cleanQty} كرتونة (${totalWeight} كجم)`
  }

  if (currentUnit === 'كيلو') {
    return `${roundMax3(numQty)} كجم`
  }

  return `${roundMax3(numQty)} ${currentUnit}`
}

export function isItemPackagingIncomplete(item) {
  if (!item) return false
  if (!item.unitType) return true
  if (item.unitType === 'كرتونة') {
    const hasPieces = Number(item.piecesPerCarton || item.pieces_per_carton || 0) > 0
    const hasWeight = Number(item.weightPerCarton || item.weight_per_carton || 0) > 0
    const hasSubUnit = Boolean(item.subUnitType || item.sub_unit_type)
    if (!hasSubUnit || (!hasPieces && !hasWeight)) return true
  }
  return false
}

export function isItemMinAlertMissing(item) {
  if (!item) return false
  const alert = item.minStockAlert ?? item.min_stock_alert
  return alert === null || alert === undefined || alert === ''
}

export function isItemNearDepletion(item, currentStock) {
  if (!item) return false
  const alert = item.minStockAlert ?? item.min_stock_alert
  if (alert === null || alert === undefined || alert === '') return false
  const numAlert = Number(alert)
  if (numAlert <= 0) return false
  return Number(currentStock || 0) <= numAlert
}
