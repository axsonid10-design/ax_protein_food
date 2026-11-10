import { parseDate, formatDateOnly } from '../utils/dateHelpers.js'
import { getCartonEquivalent } from '../utils/pricingCalculations.js'

export const getLatestConfirmedAudit = (warehouseId, stockAudits = []) => {
  if (!warehouseId || !Array.isArray(stockAudits) || stockAudits.length === 0) return null

  const targetAudits = stockAudits.filter((a) => {
    const wId = a.warehouseId || a.warehouse_id
    const isApproved = a.status === 'confirmed' || a.status === 'approved' || !a.status || a.status === 'completed'
    return wId === warehouseId && isApproved
  })

  if (targetAudits.length === 0) return null

  return targetAudits.reduce((latest, current) => {
    const curDateRaw = current.operationalDate || current.auditDate || current.date || current.createdAt || current.created_at
    const latDateRaw = latest.operationalDate || latest.auditDate || latest.date || latest.createdAt || latest.created_at
    const curTime = parseDate(curDateRaw)?.getTime() || 0
    const latTime = parseDate(latDateRaw)?.getTime() || 0
    return curTime > latTime ? current : latest
  }, targetAudits[0])
}

const isDateOnlyString = (val) => typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)

export const checkTransferAuditDiscrepancy = (transfer, stockAudits = [], warehouses = []) => {
  if (!transfer) {
    return { isAuditDiscrepancy: false, isFromBackdated: false, isToBackdated: false, auditDiscrepancyNote: '' }
  }

  const fromWarehouseId = transfer.fromId || transfer.fromWarehouseId || transfer.from_warehouse_id
  const toWarehouseId = transfer.toId || transfer.toWarehouseId || transfer.to_warehouse_id

  const trfDateRaw = transfer.operationalDate || transfer.transactionDate || transfer.date || transfer.requestedAt || transfer.createdAt || transfer.created_at
  let trfDate = parseDate(trfDateRaw)

  if (!trfDate) {
    return { isAuditDiscrepancy: false, isFromBackdated: false, isToBackdated: false, auditDiscrepancyNote: '' }
  }

  let isDateOnly = isDateOnlyString(transfer.operationalDate) || isDateOnlyString(transfer.date)

  if (isDateOnly) {
    const creationTime = transfer.requestedAt || transfer.createdAt || transfer.created_at || transfer.confirmedAt || transfer.confirmed_at
    if (creationTime) {
      const parsedCreation = parseDate(creationTime)
      if (parsedCreation && formatDateOnly(parsedCreation) === formatDateOnly(trfDate)) {
        trfDate = parsedCreation
        isDateOnly = false
      }
    }
  }

  const trfDateStr = formatDateOnly(trfDate)

  const fromAudit = getLatestConfirmedAudit(fromWarehouseId, stockAudits)
  const toAudit = getLatestConfirmedAudit(toWarehouseId, stockAudits)

  let isFromBackdated = false
  let isToBackdated = false
  const notes = []

  const compareIsBackdated = (trfDt, auditDt, dateOnlyMode) => {
    if (!auditDt) return false
    if (dateOnlyMode) {
      return formatDateOnly(trfDt) < formatDateOnly(auditDt)
    }
    return trfDt.getTime() < auditDt.getTime()
  }

  if (fromAudit) {
    const fromAuditDateRaw = fromAudit.operationalDate || fromAudit.auditDate || fromAudit.date || fromAudit.createdAt || fromAudit.created_at
    const fromAuditDate = parseDate(fromAuditDateRaw)
    if (fromAuditDate && compareIsBackdated(trfDate, fromAuditDate, isDateOnly)) {
      isFromBackdated = true
      const fromWh = warehouses.find((w) => w.id === fromWarehouseId)
      const whName = fromWh?.name || fromAudit.warehouseName || 'مخزن الإرسال'
      const auditDateStr = formatDateOnly(fromAuditDate)
      notes.push(`مخزن الإرسال (${whName}) تم اعتماده بجرد سابق في ${auditDateStr} بعد تاريخ التحويل ${trfDateStr}`)
    }
  }

  if (toAudit) {
    const toAuditDateRaw = toAudit.operationalDate || toAudit.auditDate || toAudit.date || toAudit.createdAt || toAudit.created_at
    const toAuditDate = parseDate(toAuditDateRaw)
    if (toAuditDate && compareIsBackdated(trfDate, toAuditDate, isDateOnly)) {
      isToBackdated = true
      const toWh = warehouses.find((w) => w.id === toWarehouseId)
      const whName = toWh?.name || toAudit.warehouseName || 'مخزن الاستلام'
      const auditDateStr = formatDateOnly(toAuditDate)
      notes.push(`مخزن الاستلام (${whName}) تم اعتماده بجرد سابق في ${auditDateStr} بعد تاريخ التحويل ${trfDateStr}`)
    }
  }

  const isAuditDiscrepancy = isFromBackdated || isToBackdated
  const auditDiscrepancyNote = isAuditDiscrepancy
    ? `تنبيه جردي: ${notes.join(' • ')}`
    : ''

  return {
    isAuditDiscrepancy,
    isFromBackdated,
    isToBackdated,
    auditDiscrepancyNote
  }
}

const resolveBaseStockUnit = (item, itemMeta, existingRow) => {
  const isSub = (u) => u === 'قطعة' || u === 'كيس' || u === 'طبق' || (itemMeta?.subUnitType && u === itemMeta.subUnitType) || (itemMeta?.sub_unit_type && u === itemMeta.sub_unit_type)
  if (itemMeta?.unitType && !isSub(itemMeta.unitType)) return itemMeta.unitType
  if (itemMeta?.unit_type && !isSub(itemMeta.unit_type)) return itemMeta.unit_type
  if (existingRow?.unit && !isSub(existingRow.unit)) return existingRow.unit
  if (item?.unit && !isSub(item.unit)) return item.unit
  return 'كرتونة'
}

export const calculateTransferStockMovement = (transfer, currentStock = [], stockAudits = [], warehouses = [], itemsCatalog = []) => {
  let effectiveTransfer = transfer
  let effectiveStock = currentStock
  let effectiveAudits = stockAudits
  let effectiveWarehouses = warehouses
  let effectiveCatalog = itemsCatalog
  let isAlternativeSignature = false

  if (Array.isArray(transfer)) {
    isAlternativeSignature = true
    effectiveStock = transfer
    effectiveTransfer = {
      fromWarehouseId: stockAudits,
      toWarehouseId: warehouses,
      items: currentStock,
      status: 'confirmed',
    }
    effectiveAudits = []
    effectiveWarehouses = []
    effectiveCatalog = itemsCatalog
  }

  if (!effectiveTransfer) return { updatedStock: [...effectiveStock], discrepancyInfo: {} }

  const discrepancyInfo = checkTransferAuditDiscrepancy(effectiveTransfer, effectiveAudits, effectiveWarehouses)
  const { isFromBackdated, isToBackdated } = discrepancyInfo

  let updatedStock = [...effectiveStock]
  const fromTargetId = effectiveTransfer.fromId || effectiveTransfer.fromWarehouseId || effectiveTransfer.from_warehouse_id
  const toTargetId = effectiveTransfer.toId || effectiveTransfer.toWarehouseId || effectiveTransfer.to_warehouse_id
  const transferItems = effectiveTransfer.items && effectiveTransfer.items.length > 0
    ? effectiveTransfer.items
    : [{ itemId: effectiveTransfer.itemId || effectiveTransfer.item_id || effectiveTransfer.id, quantity: effectiveTransfer.quantity, unit: effectiveTransfer.unit }]

  const isConfirmed = effectiveTransfer.status === 'confirmed' || effectiveTransfer.isConfirmed || effectiveTransfer.forceCredit || effectiveTransfer.isImmediate
  const shouldCreditDestination = !isToBackdated || isConfirmed
  const shouldDebitSource = !isFromBackdated || isConfirmed

  transferItems.forEach((item) => {
    const itId = item?.itemId || item?.item_id || item?.id
    if (!itId || item?.quantity === undefined || item?.quantity === null) return
    const rawQty = Number(item.quantity) || 0
    if (rawQty <= 0) return

    const catalogItem = (effectiveCatalog || []).find((c) => (c.id === itId || c.itemId === itId))
    const itemMeta = catalogItem ? { ...item, ...catalogItem } : item
    const movementQty = getCartonEquivalent(rawQty, item.unit, itemMeta)
    if (movementQty <= 0) return

    const existingFromRow = updatedStock.find(
      (s) =>
        (s.warehouseId === fromTargetId || s.warehouse_id === fromTargetId) &&
        ((s.itemId || s.item_id) === itId)
    )
    const existingToRow = updatedStock.find(
      (s) =>
        (s.warehouseId === toTargetId || s.warehouse_id === toTargetId) &&
        ((s.itemId || s.item_id) === itId)
    )
    const baseUnit = resolveBaseStockUnit(item, itemMeta, existingFromRow || existingToRow)

    if (shouldDebitSource && fromTargetId) {
      const fromIndex = updatedStock.findIndex(
        (s) =>
          (s.warehouseId === fromTargetId || s.warehouse_id === fromTargetId) &&
          ((s.itemId || s.item_id) === itId)
      )
      if (fromIndex >= 0) {
        updatedStock[fromIndex] = {
          ...updatedStock[fromIndex],
          quantity: (Number(updatedStock[fromIndex].quantity) || 0) - movementQty,
          unit: baseUnit,
        }
      } else {
        updatedStock.push({
          warehouseId: fromTargetId,
          itemId: itId,
          quantity: -movementQty,
          unit: baseUnit,
        })
      }
    }

    if (shouldCreditDestination && toTargetId) {
      const toIndex = updatedStock.findIndex(
        (s) =>
          (s.warehouseId === toTargetId || s.warehouse_id === toTargetId) &&
          ((s.itemId || s.item_id) === itId)
      )
      if (toIndex >= 0) {
        updatedStock[toIndex] = {
          ...updatedStock[toIndex],
          quantity: (Number(updatedStock[toIndex].quantity) || 0) + movementQty,
          unit: baseUnit,
        }
      } else {
        updatedStock.push({
          warehouseId: toTargetId,
          itemId: itId,
          quantity: movementQty,
          unit: baseUnit,
        })
      }
    }
  })

  if (isAlternativeSignature) {
    updatedStock.updatedStock = updatedStock
    updatedStock.isAuditDiscrepancy = discrepancyInfo.isAuditDiscrepancy
    updatedStock.isFromBackdated = isFromBackdated
    updatedStock.isToBackdated = isToBackdated
    updatedStock.auditDiscrepancyNote = discrepancyInfo.auditDiscrepancyNote
    updatedStock.discrepancyInfo = discrepancyInfo
    return updatedStock
  }

  return {
    updatedStock,
    isAuditDiscrepancy: discrepancyInfo.isAuditDiscrepancy,
    isFromBackdated,
    isToBackdated,
    auditDiscrepancyNote: discrepancyInfo.auditDiscrepancyNote,
    discrepancyInfo
  }
}
