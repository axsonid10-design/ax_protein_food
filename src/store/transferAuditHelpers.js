import { parseDate, formatDateOnly } from '../utils/dateHelpers.js'

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

export const checkTransferAuditDiscrepancy = (transfer, stockAudits = [], warehouses = []) => {
  if (!transfer) {
    return { isAuditDiscrepancy: false, isFromBackdated: false, isToBackdated: false, auditDiscrepancyNote: '' }
  }

  const fromWarehouseId = transfer.fromId || transfer.fromWarehouseId
  const toWarehouseId = transfer.toId || transfer.toWarehouseId

  const trfDateRaw = transfer.operationalDate || transfer.transactionDate || transfer.date || transfer.requestedAt || transfer.createdAt || transfer.created_at
  const trfDate = parseDate(trfDateRaw)

  if (!trfDate) {
    return { isAuditDiscrepancy: false, isFromBackdated: false, isToBackdated: false, auditDiscrepancyNote: '' }
  }

  const trfDateStr = formatDateOnly(trfDate)

  const fromAudit = getLatestConfirmedAudit(fromWarehouseId, stockAudits)
  const toAudit = getLatestConfirmedAudit(toWarehouseId, stockAudits)

  let isFromBackdated = false
  let isToBackdated = false
  const notes = []

  if (fromAudit) {
    const fromAuditDateRaw = fromAudit.operationalDate || fromAudit.auditDate || fromAudit.date || fromAudit.createdAt || fromAudit.created_at
    const fromAuditDate = parseDate(fromAuditDateRaw)
    if (fromAuditDate && trfDate.getTime() < fromAuditDate.getTime()) {
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
    if (toAuditDate && trfDate.getTime() < toAuditDate.getTime()) {
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

export const calculateTransferStockMovement = (transfer, currentStock = [], stockAudits = [], warehouses = []) => {
  if (!transfer) return { updatedStock: [...currentStock], discrepancyInfo: {} }

  const discrepancyInfo = checkTransferAuditDiscrepancy(transfer, stockAudits, warehouses)
  const { isFromBackdated, isToBackdated } = discrepancyInfo

  let updatedStock = [...currentStock]
  const fromTargetId = transfer.fromId || transfer.fromWarehouseId
  const toTargetId = transfer.toId || transfer.toWarehouseId
  const transferItems = transfer.items && transfer.items.length > 0
    ? transfer.items
    : [{ itemId: transfer.itemId, quantity: transfer.quantity, unit: transfer.unit }]

  transferItems.forEach((item) => {
    if (!item?.itemId || !item?.quantity) return

    if (!isFromBackdated && fromTargetId) {
      const fromIndex = updatedStock.findIndex((s) => s.warehouseId === fromTargetId && s.itemId === item.itemId)
      if (fromIndex >= 0) {
        updatedStock[fromIndex] = {
          ...updatedStock[fromIndex],
          quantity: Math.max(0, updatedStock[fromIndex].quantity - item.quantity)
        }
      }
    }

    if (!isToBackdated && toTargetId) {
      const toIndex = updatedStock.findIndex((s) => s.warehouseId === toTargetId && s.itemId === item.itemId)
      if (toIndex >= 0) {
        updatedStock[toIndex] = {
          ...updatedStock[toIndex],
          quantity: updatedStock[toIndex].quantity + item.quantity
        }
      } else {
        updatedStock.push({
          warehouseId: toTargetId,
          itemId: item.itemId,
          quantity: item.quantity,
          unit: item.unit || 'كرتونة'
        })
      }
    }
  })

  return {
    updatedStock,
    isAuditDiscrepancy: discrepancyInfo.isAuditDiscrepancy,
    isFromBackdated,
    isToBackdated,
    auditDiscrepancyNote: discrepancyInfo.auditDiscrepancyNote,
    discrepancyInfo
  }
}
