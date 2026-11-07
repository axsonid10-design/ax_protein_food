export function formatDualUnits(quantity, unit, item) {
  const numQty = Number(quantity || 0)
  const currentUnit = unit || item?.unitType || 'كرتونة'
  const pieces = Number(item?.piecesPerCarton || item?.pieces_per_carton || 0)
  const subUnit = item?.subUnitType || item?.sub_unit_type || 'كيس'
  const weight = Number(item?.weightPerCarton || item?.weight_per_carton || 0)

  if (currentUnit === 'كرتونة' && pieces > 1) {
    const totalSub = numQty * pieces
    return `${numQty} كرتونة (${totalSub.toLocaleString('en-US')} ${subUnit})`
  }

  if ((currentUnit === 'كيس' || currentUnit === 'قطعة' || currentUnit === 'طبق') && pieces > 1) {
    const cartons = numQty / pieces
    const formattedCartons = Number.isInteger(cartons) ? cartons : Number(cartons.toFixed(2))
    return `${numQty} ${currentUnit} (${formattedCartons} كرتونة)`
  }

  if (currentUnit === 'كرتونة' && weight > 0) {
    const totalWeight = numQty * weight
    return `${numQty} كرتونة (${totalWeight} كجم)`
  }

  if (currentUnit === 'كيلو') {
    return `${numQty} كجم`
  }

  return `${numQty} ${currentUnit}`
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
