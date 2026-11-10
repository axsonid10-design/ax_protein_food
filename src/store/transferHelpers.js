import { supabase } from '../services/supabaseClient.js'
import { generateUUID } from '../utils/AX_UUID.js'
import {
  checkTransferAuditDiscrepancy,
  calculateTransferStockMovement,
  getLatestConfirmedAudit,
} from './transferAuditHelpers.js'

export {
  checkTransferAuditDiscrepancy,
  calculateTransferStockMovement,
  getLatestConfirmedAudit,
}

export async function executeImmediateTransfer(
  {
    fromWarehouseId,
    toWarehouseId,
    operationalDate,
    items = [],
    notes = '',
    userId = null,
    userName = '',
    fromWarehouse = null,
    toWarehouse = null,
    draftId = null,
  },
  currentState = {}
) {
  const fromTargetId = fromWarehouseId || fromWarehouse?.id
  const toTargetId = toWarehouseId || toWarehouse?.id

  if (!fromTargetId || !toTargetId || fromTargetId === toTargetId) {
    return { success: false, error: 'Invalid warehouses' }
  }

  const validItems = (items || [])
    .filter((it) => Number(it.quantity) > 0)
    .map((it) => ({
      itemId: it.itemId || it.id,
      quantity: Number(it.quantity),
      unit: it.unit || 'كرتونة',
      name: it.name || it.itemName || it.compositeName || '',
      primaryCategory: it.primaryCategory || 'أصناف عامة',
      piecesPerCarton: it.piecesPerCarton ?? it.pieces_per_carton,
      weightPerCarton: it.weightPerCarton ?? it.weight_per_carton,
      unitType: it.unitType || it.unit_type,
      subUnitType: it.subUnitType || it.sub_unit_type,
    }))

  if (validItems.length === 0) {
    return { success: false, error: 'No items selected' }
  }

  const nowIso = new Date().toISOString()
  const opDate = operationalDate || nowIso.split('T')[0]
  const timePart = nowIso.split('T')[1] || '12:00:00.000Z'
  const opDateTimeIso = `${opDate}T${timePart}`
  const trfCode = `TRF-${Date.now().toString().slice(-5)}`
  const trfId = generateUUID()

  const discrepancy = checkTransferAuditDiscrepancy(
    { fromId: fromTargetId, toId: toTargetId, date: opDate },
    currentState.stockAudits || [],
    currentState.warehouses || []
  )

  const newTransfer = {
    id: trfId,
    code: trfCode,
    fromId: fromTargetId,
    fromWarehouseId: fromTargetId,
    fromName: fromWarehouse?.name || fromTargetId,
    fromType: fromWarehouse?.type || 'warehouse',
    toId: toTargetId,
    toWarehouseId: toTargetId,
    toName: toWarehouse?.name || toTargetId,
    toType: toWarehouse?.type || 'warehouse',
    items: validItems,
    status: 'confirmed',
    date: opDate,
    operationalDate: opDate,
    createdAt: opDateTimeIso,
    requestedAt: opDateTimeIso,
    confirmedAt: opDateTimeIso,
    confirmedBy: userName || 'مدير المنظومة',
    notes: (notes || '').trim(),
    isAuditDiscrepancy: discrepancy.isAuditDiscrepancy,
    auditDiscrepancyNote: discrepancy.auditDiscrepancyNote,
  }

  const itemsCatalog = currentState.items || []
  const { updatedStock } = calculateTransferStockMovement(
    newTransfer,
    currentState.inventoryStock || [],
    currentState.stockAudits || [],
    currentState.warehouses || [],
    itemsCatalog
  )

  if (supabase && typeof supabase.from === 'function') {
    try {
      await supabase.from('ax_transfers').insert({
        id: newTransfer.id,
        code: newTransfer.code,
        from_warehouse_id: fromTargetId,
        to_warehouse_id: toTargetId,
        items: validItems,
        status: 'confirmed',
        date: opDate,
        requested_at: newTransfer.requestedAt,
        confirmed_at: newTransfer.confirmedAt,
        confirmed_by: newTransfer.confirmedBy,
        notes: newTransfer.notes || null,
      })

      for (const item of validItems) {
        const fromRow = updatedStock.find(
          (s) =>
            (s.warehouseId === fromTargetId || s.warehouse_id === fromTargetId) &&
            (s.itemId === item.itemId || s.item_id === item.itemId)
        )
        if (fromRow) {
          await supabase.from('ax_inventory_stock').upsert(
            {
              warehouse_id: fromTargetId,
              item_id: item.itemId,
              quantity: fromRow.quantity,
              unit: fromRow.unit || 'كرتونة',
              updated_at: nowIso,
            },
            { onConflict: 'warehouse_id,item_id' }
          )
        }

        const toRow = updatedStock.find(
          (s) =>
            (s.warehouseId === toTargetId || s.warehouse_id === toTargetId) &&
            (s.itemId === item.itemId || s.item_id === item.itemId)
        )
        if (toRow) {
          await supabase.from('ax_inventory_stock').upsert(
            {
              warehouse_id: toTargetId,
              item_id: item.itemId,
              quantity: toRow.quantity,
              unit: toRow.unit || 'كرتونة',
              updated_at: nowIso,
            },
            { onConflict: 'warehouse_id,item_id' }
          )
        }
      }

      const notifTitle = `✅ تم تنفيذ وتأكيد التحويل المخزني [${trfCode}]`
      const notifMsg = `تم نقل ${validItems.length} صنف من ${newTransfer.fromName} إلى ${newTransfer.toName} وتحديث الأرصدة فوراً.`
      try {
        await supabase.from('ax_notifications').insert({
          id: 'notif-' + Date.now(),
          title: notifTitle,
          message: notifMsg,
          type: 'transfer',
          target_tab: 'warehouses',
          read: false,
        })
      } catch {}

      if (typeof supabase.functions?.invoke === 'function') {
        try {
          supabase.functions.invoke('ax-web-push', {
            body: {
              project_slug: 'protein-food',
              userId: 'all',
              title: notifTitle,
              message: notifMsg,
              link: '/?tab=warehouses',
              tag: `trf-imm-${Date.now()}`,
            },
          })
        } catch {}
      }
    } catch {}
  }

  return {
    success: true,
    transfer: newTransfer,
    updatedStock,
  }
}

export async function recoverUnappliedTransfers(
  stockAudits = [],
  transfers = [],
  currentStock = []
) {
  let updatedStock = Array.isArray(currentStock) ? [...currentStock] : []
  let recoveredTransfersCount = 0
  let creditedItemsCount = 0

  const targetCodes = ['TRF-43863', 'TRF-77489']

  let candidateTransfers = (transfers || []).filter((t) => {
    if (!t) return false
    const isTarget = targetCodes.includes(t.code) || t.isUnapplied
    const isConfirmed = t.status === 'confirmed'
    const alreadyRecovered = Boolean(
      t.isRecovered ||
        t.recoveredAt ||
        (t.notes && typeof t.notes === 'string' && t.notes.includes('استرداد'))
    )
    return isTarget && isConfirmed && !alreadyRecovered
  })

  if (
    candidateTransfers.length === 0 &&
    (!transfers || transfers.length === 0) &&
    supabase &&
    typeof supabase.from === 'function'
  ) {
    try {
      const { data } = await supabase.from('ax_transfers').select('*').in('code', targetCodes)
      if (Array.isArray(data)) {
        candidateTransfers = data.filter(
          (t) => !(t.notes && typeof t.notes === 'string' && t.notes.includes('استرداد'))
        )
      }
    } catch {}
  }

  for (const trf of candidateTransfers) {
    const toTargetId = trf.toId || trf.toWarehouseId || trf.to_warehouse_id
    const trfItems =
      trf.items && trf.items.length > 0
        ? trf.items
        : [{ itemId: trf.itemId, quantity: trf.quantity, unit: trf.unit }]

    let anyCredited = false
    for (const item of trfItems) {
      if (!item?.itemId || item?.quantity === undefined || item?.quantity === null) continue
      const qty = Number(item.quantity) || 0
      if (qty <= 0) continue

      const stockIdx = updatedStock.findIndex(
        (s) =>
          (s.warehouseId === toTargetId || s.warehouse_id === toTargetId) &&
          (s.itemId === item.itemId || s.item_id === item.itemId)
      )

      if (stockIdx >= 0) {
        updatedStock[stockIdx] = {
          ...updatedStock[stockIdx],
          quantity: (Number(updatedStock[stockIdx].quantity) || 0) + qty,
        }
      } else {
        updatedStock.push({
          warehouseId: toTargetId,
          itemId: item.itemId,
          quantity: qty,
          unit: item.unit || 'كرتونة',
        })
      }
      creditedItemsCount++
      anyCredited = true

      if (supabase && typeof supabase.from === 'function') {
        try {
          const finalQty = stockIdx >= 0 ? updatedStock[stockIdx].quantity : qty
          await supabase.from('ax_inventory_stock').upsert(
            {
              warehouse_id: toTargetId,
              item_id: item.itemId,
              quantity: finalQty,
              unit: item.unit || 'كرتونة',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'warehouse_id,item_id' }
          )
        } catch {}
      }
    }

    if (anyCredited) {
      recoveredTransfersCount++
      trf.isRecovered = true
      trf.recoveredAt = new Date().toISOString()
      if (supabase && typeof supabase.from === 'function') {
        try {
          const recoveryNote = trf.notes
            ? `${trf.notes} • [تم استرداد الرصيد المفقود وتسويته بنجاح]`
            : '[تم استرداد الرصيد المفقود وتسويته بنجاح]'
          await supabase.from('ax_transfers').update({ notes: recoveryNote }).eq('id', trf.id)
          await supabase.from('ax_activity_logs').insert({
            id: generateUUID(),
            table_name: 'ax_transfers',
            action: 'RECOVER_UNAPPLIED',
            record_id: trf.id,
            new_data: { code: trf.code, recoveredAt: trf.recoveredAt },
          })
        } catch {}
      }
    }
  }

  return {
    recoveredTransfersCount,
    creditedItemsCount,
    updatedStock,
  }
}
