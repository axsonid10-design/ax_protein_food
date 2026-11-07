export function isStrictlyBefore(opDate, baseDate, opTimestamp = null, baseTimestamp = null) {
  if (!baseDate || !opDate) return false

  const opDay = String(opDate).slice(0, 10)
  const baseDay = String(baseDate).slice(0, 10)

  if (opDay < baseDay) return true
  if (opDay > baseDay) return false

  const tOp = opTimestamp || (String(opDate).length > 10 ? opDate : null)
  const tBase = baseTimestamp || (String(baseDate).length > 10 ? baseDate : null)

  if (tOp && tBase) {
    const timeOp = new Date(tOp).getTime()
    const timeBase = new Date(tBase).getTime()
    if (!isNaN(timeOp) && !isNaN(timeBase)) {
      return timeOp < timeBase
    }
  }

  return false
}

export function recalculateItemStock({
  itemId,
  warehouseId,
  inventoryStock = [],
  purchases = [],
  sales = [],
  transfers = [],
  stockAudits = [],
  warehouses = [],
}) {
  if (!itemId || !warehouseId) return 0

  const stockRow = (inventoryStock || []).find(
    (s) =>
      (s.itemId || s.item_id) === itemId &&
      (s.warehouseId || s.warehouse_id) === warehouseId
  )
  const openingBalance = Number(
    stockRow?.openingBalance !== undefined
      ? stockRow.openingBalance
      : (stockRow?.opening_balance || 0)
  )
  const openingDate = stockRow?.openingDate || stockRow?.opening_date || ''

  const activeAudits = (stockAudits || []).filter((a) => {
    if (!a) return false
    const wId = a.warehouseId || a.warehouse_id
    const isCancelled = a.status === 'cancelled' || a.status === 'deleted'
    return !isCancelled && wId === warehouseId
  })

  let latestAudit = null
  let auditItem = null
  let latestAuditDate = ''

  activeAudits.forEach((aud) => {
    const aDate =
      aud.operationalDate || aud.auditDate || aud.date || aud.createdAt || aud.created_at || ''
    const found = (aud.items || []).find(
      (it) => (it.itemId || it.item_id || it.id) === itemId
    )
    if (found) {
      if (!latestAuditDate || new Date(aDate) >= new Date(latestAuditDate)) {
        latestAudit = aud
        auditItem = found
        latestAuditDate = aDate
      }
    }
  })

  let baseQty = openingBalance
  let baseDate = openingDate

  if (latestAudit && auditItem) {
    baseQty = Number(
      auditItem.actualQty !== undefined
        ? auditItem.actualQty
        : (auditItem.actualQtyNum !== undefined ? auditItem.actualQtyNum : (auditItem.quantity || 0))
    )
    baseDate = latestAuditDate
  }

  let postIn = 0
  let postOut = 0

  ;(purchases || []).forEach((inv) => {
    if (!inv) return
    const invWhId = inv.warehouseId || inv.warehouse_id
    if (invWhId !== warehouseId) return
    if (inv.status === 'cancelled' || inv.status === 'deleted') return
    const invDate = inv.operationalDate || inv.date || inv.createdAt || inv.created_at || ''
    if (baseDate && isStrictlyBefore(invDate, baseDate, inv.createdAt, latestAudit?.createdAt)) {
      return
    }
    const isReturn = inv.type === 'purchase_return'
    ;(inv.items || []).forEach((it) => {
      if ((it.itemId || it.item_id || it.id) === itemId) {
        const qty = Number(it.quantity) || 0
        if (isReturn) postOut += qty
        else postIn += qty
      }
    })
  })

  ;(sales || []).forEach((inv) => {
    if (!inv) return
    const invWhId = inv.warehouseId || inv.warehouse_id
    if (invWhId !== warehouseId) return
    if (inv.status === 'cancelled' || inv.status === 'deleted') return
    const invDate = inv.operationalDate || inv.date || inv.createdAt || inv.created_at || ''
    if (baseDate && isStrictlyBefore(invDate, baseDate, inv.createdAt, latestAudit?.createdAt)) {
      return
    }
    const isReturn = inv.type === 'sale_return'
    ;(inv.items || []).forEach((it) => {
      if ((it.itemId || it.item_id || it.id) === itemId) {
        const qty = Number(it.quantity) || 0
        if (isReturn) postIn += qty
        else postOut += qty
      }
    })
  })

  ;(transfers || []).forEach((trf) => {
    if (!trf) return
    if (trf.status === 'cancelled' || trf.status === 'rejected' || trf.status === 'deleted') return
    const isConfirmed =
      trf.status === 'confirmed' ||
      trf.status === 'completed' ||
      trf.isConfirmed ||
      trf.forceCredit ||
      trf.isImmediate
    if (!isConfirmed) return

    const fromWhId = trf.fromId || trf.fromWarehouseId || trf.from_warehouse_id
    const toWhId = trf.toId || trf.toWarehouseId || trf.to_warehouse_id

    if (Array.isArray(warehouses) && warehouses.length > 0) {
      if (toWhId && !warehouses.some((w) => w.id === toWhId)) return
      if (fromWhId && !warehouses.some((w) => w.id === fromWhId)) return
    }

    const trfDate =
      trf.operationalDate || trf.date || trf.requestedAt || trf.created_at || trf.createdAt || ''
    if (
      baseDate &&
      isStrictlyBefore(
        trfDate,
        baseDate,
        trf.createdAt || trf.requestedAt,
        latestAudit?.createdAt
      )
    ) {
      return
    }

    const tItems =
      Array.isArray(trf.items) && trf.items.length > 0
        ? trf.items
        : [{ itemId: trf.itemId || trf.item_id || trf.id, quantity: trf.quantity }]

    tItems.forEach((it) => {
      const itId = it.itemId || it.item_id || it.id
      if (itId === itemId) {
        const qty = Number(it.quantity) || 0
        if (toWhId === warehouseId) postIn += qty
        if (fromWhId === warehouseId) postOut += qty
      }
    })
  })

  return baseQty + postIn - postOut
}

export function calculateItemMovements({
  itemId,
  selectedWhId = 'ALL',
  purchases = [],
  sales = [],
  transfers = [],
  stockAudits = [],
  currentStock = 0,
  warehouses = [],
  inventoryStock = [],
}) {
  if (!itemId) {
    return { movementsList: [], openingBalance: 0, totalInward: 0, totalOutward: 0 }
  }

  const raw = []

  ;(purchases || []).forEach((inv) => {
    if (!inv || inv.status === 'cancelled' || inv.status === 'deleted') return
    const invWhId = inv.warehouseId || inv.warehouse_id
    if (selectedWhId !== 'ALL' && invWhId && invWhId !== selectedWhId) return
    const invDate = inv.operationalDate || inv.date || inv.createdAt || inv.created_at || ''
    const isReturn = inv.type === 'purchase_return'
    ;(inv.items || []).forEach((it) => {
      const itId = it.itemId || it.item_id || it.id
      if (itId === itemId) {
        const qty = Number(it.quantity) || 0
        const price = Number(it.price || it.buyPrice || 0)
        raw.push({
          id: `purch-${inv.id}-${itId}`,
          type: isReturn ? 'purchase_return' : 'purchase',
          date: invDate,
          title: isReturn
            ? `مردود مشتريات [${inv.code || 'فاتورة'}]`
            : `توريد مشتريات [${inv.code || 'فاتورة'}]`,
          party: inv.partyName || inv.supplierName || 'مورد',
          inQty: isReturn ? 0 : qty,
          outQty: isReturn ? qty : 0,
          unitPrice: price,
          totalCost: qty * price,
        })
      }
    })
  })

  ;(sales || []).forEach((inv) => {
    if (!inv || inv.status === 'cancelled' || inv.status === 'deleted') return
    const invWhId = inv.warehouseId || inv.warehouse_id
    if (selectedWhId !== 'ALL' && invWhId && invWhId !== selectedWhId) return
    const invDate = inv.operationalDate || inv.date || inv.createdAt || inv.created_at || ''
    const isReturn = inv.type === 'sale_return'
    ;(inv.items || []).forEach((it) => {
      const itId = it.itemId || it.item_id || it.id
      if (itId === itemId) {
        const qty = Number(it.quantity) || 0
        const price = Number(it.price || it.sellPrice || 0)
        raw.push({
          id: `sale-${inv.id}-${itId}`,
          type: isReturn ? 'sale_return' : 'sale',
          date: invDate,
          title: isReturn
            ? `مردود مبيعات [${inv.code || 'فاتورة'}]`
            : `فاتورة مبيعات [${inv.code || 'فاتورة'}]`,
          party: inv.partyName || inv.clientName || inv.customerName || 'عميل',
          inQty: isReturn ? qty : 0,
          outQty: isReturn ? 0 : qty,
          unitPrice: price,
          totalCost: qty * price,
        })
      }
    })
  })

  ;(transfers || []).forEach((trf) => {
    if (!trf) return
    if (trf.status === 'cancelled' || trf.status === 'rejected' || trf.status === 'deleted') return
    const isConfirmed =
      trf.status === 'confirmed' ||
      trf.status === 'completed' ||
      trf.isConfirmed ||
      trf.forceCredit ||
      trf.isImmediate
    if (!isConfirmed) return

    const fromWhId = trf.fromId || trf.fromWarehouseId || trf.from_warehouse_id
    const toWhId = trf.toId || trf.toWarehouseId || trf.to_warehouse_id

    if (Array.isArray(warehouses) && warehouses.length > 0) {
      if (toWhId && !warehouses.some((w) => w.id === toWhId)) return
      if (fromWhId && !warehouses.some((w) => w.id === fromWhId)) return
    }

    const fromName = trf.fromName || warehouses.find((w) => w.id === fromWhId)?.name || 'مخزن'
    const toName = trf.toName || warehouses.find((w) => w.id === toWhId)?.name || 'مخزن'
    const trfDate =
      trf.operationalDate || trf.date || trf.requestedAt || trf.created_at || trf.createdAt || ''
    const tItems =
      Array.isArray(trf.items) && trf.items.length > 0
        ? trf.items
        : [{ itemId: trf.itemId || trf.item_id || trf.id, quantity: trf.quantity }]

    tItems.forEach((it) => {
      const itId = it.itemId || it.item_id || it.id
      if (itId === itemId) {
        const qty = Number(it.quantity) || 0
        if (selectedWhId === 'ALL') {
          raw.push({
            id: `trf-${trf.id}-${itId}`,
            type: 'transfer',
            date: trfDate,
            title: `تحويل داخلي [${trf.code || 'تحويل'}]`,
            party: `من ${fromName} إلى ${toName}`,
            fromWarehouseName: fromName,
            toWarehouseName: toName,
            inQty: qty,
            outQty: qty,
            isInternal: true,
          })
        } else if (fromWhId === selectedWhId) {
          raw.push({
            id: `trf-out-${trf.id}-${itId}`,
            type: 'transfer_out',
            date: trfDate,
            title: `تحويل صادر [${trf.code || 'تحويل'}]`,
            party: `منصرف إلى: ${toName}`,
            fromWarehouseName: fromName,
            toWarehouseName: toName,
            inQty: 0,
            outQty: qty,
          })
        } else if (toWhId === selectedWhId) {
          raw.push({
            id: `trf-in-${trf.id}-${itId}`,
            type: 'transfer_in',
            date: trfDate,
            title: `تحويل وارد [${trf.code || 'تحويل'}]`,
            party: `وارد من: ${fromName}`,
            fromWarehouseName: fromName,
            toWarehouseName: toName,
            inQty: qty,
            outQty: 0,
          })
        }
      }
    })
  })

  ;(stockAudits || []).forEach((aud) => {
    if (!aud || aud.status === 'cancelled' || aud.status === 'deleted') return
    const audWhId = aud.warehouseId || aud.warehouse_id
    if (selectedWhId !== 'ALL' && audWhId && audWhId !== selectedWhId) return
    const audDate =
      aud.operationalDate || aud.auditDate || aud.date || aud.createdAt || aud.created_at || ''
    const whName =
      aud.warehouseName ||
      aud.warehouse_name ||
      warehouses.find((w) => w.id === audWhId)?.name ||
      'المخزن'
    ;(aud.items || []).forEach((it) => {
      const itId = it.itemId || it.item_id || it.id
      if (itId === itemId) {
        const actualQty = Number(
          it.actualQty !== undefined
            ? it.actualQty
            : (it.actualQtyNum !== undefined ? it.actualQtyNum : (it.quantity || 0))
        )
        raw.push({
          id: `aud-${aud.id}-${itId}`,
          type: 'audit',
          isAudit: true,
          actualQty,
          date: audDate,
          title: `محضر جرد [${aud.code || 'محضر'}]`,
          party: whName,
          unitPrice: Number(it.varianceCost || 0) / (Math.abs(Number(it.variance || 1)) || 1),
        })
      }
    })
  })

  raw.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))

  let registeredOpening = 0
  let hasRegisteredOpening = false
  if (Array.isArray(inventoryStock) && inventoryStock.length > 0) {
    if (selectedWhId === 'ALL') {
      const rows = inventoryStock.filter((s) => (s.itemId || s.item_id) === itemId)
      if (rows.length > 0) {
        registeredOpening = rows.reduce(
          (sum, s) =>
            sum +
            Number(
              s.openingBalance !== undefined
                ? s.openingBalance
                : (s.opening_balance || 0)
            ),
          0
        )
        hasRegisteredOpening = rows.some(
          (s) => s.openingBalance !== undefined || s.opening_balance !== undefined
        )
      }
    } else {
      const match = inventoryStock.find(
        (s) =>
          (s.itemId || s.item_id) === itemId &&
          (s.warehouseId || s.warehouse_id) === selectedWhId
      )
      if (match && (match.openingBalance !== undefined || match.opening_balance !== undefined)) {
        registeredOpening = Number(
          match.openingBalance !== undefined
            ? match.openingBalance
            : (match.opening_balance || 0)
        )
        hasRegisteredOpening = true
      }
    }
  }

  let netIn = 0
  let netOut = 0
  raw.forEach((m) => {
    if (!m.isAudit && !(selectedWhId === 'ALL' && m.isInternal)) {
      netIn += m.inQty || 0
      netOut += m.outQty || 0
    }
  })

  const opening = hasRegisteredOpening ? registeredOpening : (currentStock - netIn + netOut)

  let running = opening
  const withRunning = raw.map((m) => {
    if (m.isAudit) {
      const diff = m.actualQty - running
      m.inQty = diff > 0 ? diff : 0
      m.outQty = diff < 0 ? Math.abs(diff) : 0
      m.title = `محضر جرد (${diff >= 0 ? 'مطابق/فائض' : 'عجز'}) [${m.id.split('-')[1] || 'محضر'}]`
      running = m.actualQty
      return { ...m, balanceAfter: running }
    }
    if (!(selectedWhId === 'ALL' && m.isInternal)) {
      running = running + (m.inQty || 0) - (m.outQty || 0)
    }
    return { ...m, balanceAfter: running }
  })

  return {
    movementsList: withRunning.reverse(),
    openingBalance: opening,
    totalInward: netIn,
    totalOutward: netOut,
    currentStock: running,
  }
}
