export function buildInitialAuditRows(items = [], inventoryStock = [], warehouseId = '') {
  const whStockMap = {}
  inventoryStock
    .filter((s) => s.warehouseId === warehouseId)
    .forEach((s) => {
      whStockMap[s.itemId] = {
        quantity: Number(s.quantity) || 0,
        unit: s.unit,
      }
    })

  return items.map((it) => {
    const stockEntry = whStockMap[it.id]
    const sysQty = stockEntry ? stockEntry.quantity : 0
    const baseUnit = stockEntry?.unit || it.unitType || it.unit_type || 'كرتونة'
    const weightPerCarton = Number(it.weightPerCarton || it.weight_per_carton) || (baseUnit === 'كرتونة' ? 20 : 1)
    const piecesPerCarton = Number(it.piecesPerCarton || it.pieces_per_carton) || 1

    return {
      itemId: it.id,
      itemName: it.compositeName || it.name || 'صنف',
      category: it.primaryCategory || 'أصناف عامة',
      baseUnit,
      auditUnit: baseUnit,
      weightPerCarton,
      piecesPerCarton,
      unit: baseUnit,
      costPrice: Number(it.buyPrice ?? it.buy_price) || 0,
      sellPrice: Number(it.sellPrice ?? it.sell_price) || 0,
      systemQty: sysQty,
      actualQty: sysQty,
      inputQty: sysQty,
    }
  })
}

export function calculateAuditStats(auditRows = []) {
  let matchedCount = 0
  let deficitCount = 0
  let surplusCount = 0
  let totalDeficitCost = 0
  let totalSurplusCost = 0

  const enrichedRows = auditRows.map((r) => {
    const baseUnit = r.baseUnit || r.unit || 'كرتونة'
    const auditUnit = r.auditUnit || baseUnit
    const weightPerCarton = Number(r.weightPerCarton) || 20
    const piecesPerCarton = Number(r.piecesPerCarton) || 1

    const rawInput = r.inputQty !== undefined ? r.inputQty : r.actualQty
    const numInput = rawInput === '' ? 0 : Number(rawInput)

    let actualInBase = numInput
    if (auditUnit === baseUnit) {
      actualInBase = numInput
    } else if (baseUnit === 'كرتونة' && auditUnit === 'كيلو') {
      actualInBase = weightPerCarton > 0 ? numInput / weightPerCarton : numInput
    } else if (baseUnit === 'كيلو' && auditUnit === 'كرتونة') {
      actualInBase = numInput * weightPerCarton
    } else if (baseUnit === 'كرتونة' && auditUnit === 'قطعة') {
      actualInBase = piecesPerCarton > 0 ? numInput / piecesPerCarton : numInput
    } else if (baseUnit === 'قطعة' && auditUnit === 'كرتونة') {
      actualInBase = numInput * piecesPerCarton
    } else if (baseUnit === 'كيلو' && auditUnit === 'قطعة') {
      const pieceWeight = weightPerCarton > 0 && piecesPerCarton > 0 ? weightPerCarton / piecesPerCarton : 1
      actualInBase = numInput * pieceWeight
    } else if (baseUnit === 'قطعة' && auditUnit === 'كيلو') {
      const pieceWeight = weightPerCarton > 0 && piecesPerCarton > 0 ? weightPerCarton / piecesPerCarton : 1
      actualInBase = pieceWeight > 0 ? numInput / pieceWeight : numInput
    }

    actualInBase = Math.round(actualInBase * 100) / 100
    const variance = Math.round((actualInBase - r.systemQty) * 100) / 100
    const varianceCost = Math.round(variance * r.costPrice * 100) / 100

    let status = 'matched'
    if (variance < 0) {
      status = 'deficit'
      deficitCount += 1
      totalDeficitCost += Math.abs(varianceCost)
    } else if (variance > 0) {
      status = 'surplus'
      surplusCount += 1
      totalSurplusCost += varianceCost
    } else {
      matchedCount += 1
    }

    return {
      ...r,
      baseUnit,
      auditUnit,
      weightPerCarton,
      piecesPerCarton,
      actualQty: actualInBase,
      actualQtyNum: actualInBase,
      inputQty: rawInput,
      variance,
      varianceCost,
      status,
    }
  })

  const netVarianceCost = totalSurplusCost - totalDeficitCost

  return {
    enrichedRows,
    matchedCount,
    deficitCount,
    surplusCount,
    totalDeficitCost,
    totalSurplusCost,
    netVarianceCost,
  }
}

export function groupAuditRowsByCategory(enrichedRows = [], selectedCategoryTab = 'ALL', searchQuery = '') {
  const q = searchQuery.trim().toLowerCase()
  const groups = {}

  enrichedRows.forEach((row) => {
    if (selectedCategoryTab !== 'ALL' && row.category !== selectedCategoryTab) {
      return
    }
    if (q && !row.itemName.toLowerCase().includes(q) && !row.category.toLowerCase().includes(q)) {
      return
    }

    const cat = row.category || 'أصناف عامة'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(row)
  })

  return groups
}
