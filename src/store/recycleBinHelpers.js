import { supabase } from '../services/supabaseClient.js'
import { AX_RecycleBinService } from '../services/AX_RecycleBinService.js'
import { AX_OperationsService } from '../services/AX_OperationsService.js'
import { recalculateItemStock } from '../components/warehouses/itemMovementHelpers.js'

export const recycleBinHelpers = {
  restoreItem: async (state, id, userProfile, set) => {
    const item = (state.recycleBin || []).find((r) => r.id === id)
    if (!item) return { success: false }
    const res = await AX_RecycleBinService.restoreFromRecycleBin(item, userProfile)
    if (res.success) {
      set((s) => {
        const nextRecycle = (s.recycleBin || []).filter((r) => r.id !== id)
        const updates = { recycleBin: nextRecycle }
        if (res.entityType === 'invoice' && res.restoredData) {
          updates.invoices = [res.restoredData, ...(s.invoices || []).filter((i) => i.id !== res.restoredData.id)]
        } else if (res.entityType === 'item' && res.restoredData) {
          updates.items = [res.restoredData, ...(s.items || []).filter((i) => i.id !== res.restoredData.id)]
        } else if (res.entityType === 'client' && res.restoredData) {
          updates.clients = [res.restoredData, ...(s.clients || []).filter((c) => c.id !== res.restoredData.id)]
        } else if (res.entityType === 'supplier' && res.restoredData) {
          updates.suppliers = [res.restoredData, ...(s.suppliers || []).filter((sup) => sup.id !== res.restoredData.id)]
        } else if (res.entityType === 'employee' && res.restoredData) {
          updates.companyEmployees = [res.restoredData, ...(s.companyEmployees || []).filter((e) => e.id !== res.restoredData.id)]
        } else if (res.entityType === 'transfer' && res.restoredData) {
          updates.transfers = [{ ...res.restoredData, status: 'confirmed' }, ...(s.transfers || []).filter((t) => t.id !== res.restoredData.id)]
          const fromId = res.restoredData.from_warehouse_id || res.restoredData.fromWarehouseId || res.restoredData.fromId
          const toId = res.restoredData.to_warehouse_id || res.restoredData.toWarehouseId || res.restoredData.toId
          const stockCopy = [...(s.inventoryStock || [])]
          for (const item of (res.restoredData.items || [])) {
            const itId = item.itemId || item.id || item.item_id
            const qty = Number(item.quantity) || 0
            if (!itId || qty <= 0) continue
            if (fromId) {
              const idx = stockCopy.findIndex((st) => (st.warehouseId || st.warehouse_id) === fromId && (st.itemId || st.item_id) === itId)
              if (idx >= 0) stockCopy[idx] = { ...stockCopy[idx], quantity: (Number(stockCopy[idx].quantity) || 0) - qty }
              else stockCopy.push({ warehouseId: fromId, itemId: itId, quantity: -qty, unit: item.unit || 'كرتونة' })
            }
            if (toId) {
              const idx = stockCopy.findIndex((st) => (st.warehouseId || st.warehouse_id) === toId && (st.itemId || st.item_id) === itId)
              if (idx >= 0) stockCopy[idx] = { ...stockCopy[idx], quantity: (Number(stockCopy[idx].quantity) || 0) + qty }
              else stockCopy.push({ warehouseId: toId, itemId: itId, quantity: qty, unit: item.unit || 'كرتونة' })
            }
          }
          updates.inventoryStock = stockCopy
        } else if (res.entityType === 'audit' && res.restoredData) {
          updates.stockAudits = [{ ...res.restoredData, status: 'approved' }, ...(s.stockAudits || []).filter((a) => a.id !== res.restoredData.id)]
          const whId = res.restoredData.warehouse_id || res.restoredData.warehouseId
          const stockCopy = [...(s.inventoryStock || [])]
          for (const item of (res.restoredData.items || [])) {
            const itId = item.itemId || item.item_id || item.id
            const actQty = Number(item.actualQtyNum !== undefined ? item.actualQtyNum : item.actualQty) || 0
            const idx = stockCopy.findIndex((st) => (st.warehouseId || st.warehouse_id) === whId && (st.itemId || st.item_id) === itId)
            if (idx >= 0) stockCopy[idx] = { ...stockCopy[idx], quantity: actQty }
            else stockCopy.push({ warehouseId: whId, itemId: itId, quantity: actQty, unit: item.unit || 'كرتونة' })
          }
          updates.inventoryStock = stockCopy
        } else if (res.entityType === 'expense' && res.restoredData) {
          try {
            const rawExpenses = JSON.parse(localStorage.getItem('ax_expenses') || '[]')
            const nextExpenses = [res.restoredData, ...rawExpenses.filter((e) => e.id !== res.restoredData.id)]
            localStorage.setItem('ax_expenses', JSON.stringify(nextExpenses))
          } catch {}
        }
        return updates
      })
    }
    return res
  },

  purgeItem: async (id, set) => {
    await AX_RecycleBinService.purgeFromRecycleBin(id)
    set((s) => ({
      recycleBin: (s.recycleBin || []).filter((r) => r.id !== id),
    }))
  },

  rollbackAudit: async (auditId, userProfile, set, state = null) => {
    const s = state || {}
    const auditObj = (s.stockAudits || []).find((a) => a.id === auditId)
    const whId = auditObj?.warehouse_id || auditObj?.warehouseId
    const purchases = s.invoices?.filter((i) => i.type === 'purchase' || i.type === 'purchase_return') || []
    const sales = s.invoices?.filter((i) => i.type === 'sale' || i.type === 'sale_return') || []
    const nextAudits = (s.stockAudits || []).map((a) => (a.id === auditId ? { ...a, status: 'cancelled' } : a))
    const revertedStock = [...(s.inventoryStock || [])]
    const recalculatedStockMap = {}

    for (const it of (auditObj?.items || [])) {
      const itId = it.itemId || it.item_id || it.id
      const nextStock = recalculateItemStock({
        itemId: itId,
        warehouseId: whId,
        inventoryStock: revertedStock,
        purchases,
        sales,
        transfers: s.transfers || [],
        stockAudits: nextAudits,
        warehouses: s.warehouses || [],
      })
      recalculatedStockMap[itId] = nextStock
      const idx = revertedStock.findIndex((st) => (st.warehouseId || st.warehouse_id) === whId && (st.itemId || st.item_id) === itId)
      if (idx >= 0) {
        revertedStock[idx] = { ...revertedStock[idx], quantity: nextStock }
      } else if (whId && itId) {
        revertedStock.push({ warehouseId: whId, itemId: itId, quantity: nextStock, unit: it.unit || 'كرتونة' })
      }
    }

    const res = await AX_OperationsService.rollbackStockAuditInDB(auditId, userProfile, auditObj, recalculatedStockMap)
    if (res.success) {
      set((curr) => {
        const finalAudits = (curr.stockAudits || []).map((a) => (a.id === auditId ? { ...a, status: 'cancelled' } : a))
        const finalStock = [...(curr.inventoryStock || [])]
        for (const [itId, targetQty] of Object.entries(recalculatedStockMap)) {
          const idx = finalStock.findIndex((st) => (st.warehouseId || st.warehouse_id) === whId && (st.itemId || st.item_id) === itId)
          if (idx >= 0) {
            finalStock[idx] = { ...finalStock[idx], quantity: targetQty }
          } else if (whId && itId) {
            finalStock.push({ warehouseId: whId, itemId: itId, quantity: targetQty, unit: 'كرتونة' })
          }
        }
        try {
          const payload = JSON.parse(localStorage.getItem('ax_cached_db_payload') || '{}')
          payload.inventoryStock = finalStock
          payload.stockAudits = finalAudits
          localStorage.setItem('ax_cached_db_payload', JSON.stringify(payload))
          localStorage.setItem('ax_stock_audits', JSON.stringify(finalAudits))
        } catch {}
        return { stockAudits: finalAudits, inventoryStock: finalStock }
      })
    }
    return res
  },

  deleteAudit: async (auditId, userProfile, set, state = null) => {
    const s = state || {}
    const auditObj = (s.stockAudits || []).find((a) => a.id === auditId)
    const whId = auditObj?.warehouse_id || auditObj?.warehouseId
    const purchases = s.invoices?.filter((i) => i.type === 'purchase' || i.type === 'purchase_return') || []
    const sales = s.invoices?.filter((i) => i.type === 'sale' || i.type === 'sale_return') || []
    const nextAudits = (s.stockAudits || []).filter((a) => a.id !== auditId)
    const revertedStock = [...(s.inventoryStock || [])]
    const recalculatedStockMap = {}

    for (const it of (auditObj?.items || [])) {
      const itId = it.itemId || it.item_id || it.id
      const nextStock = recalculateItemStock({
        itemId: itId,
        warehouseId: whId,
        inventoryStock: revertedStock,
        purchases,
        sales,
        transfers: s.transfers || [],
        stockAudits: nextAudits,
        warehouses: s.warehouses || [],
      })
      recalculatedStockMap[itId] = nextStock
      const idx = revertedStock.findIndex((st) => (st.warehouseId || st.warehouse_id) === whId && (st.itemId || st.item_id) === itId)
      if (idx >= 0) {
        revertedStock[idx] = { ...revertedStock[idx], quantity: nextStock }
      } else if (whId && itId) {
        revertedStock.push({ warehouseId: whId, itemId: itId, quantity: nextStock, unit: it.unit || 'كرتونة' })
      }
    }

    const res = await AX_OperationsService.deleteStockAuditInDB(auditId, userProfile, auditObj, recalculatedStockMap)
    if (res.success) {
      set((curr) => {
        const finalAudits = (curr.stockAudits || []).filter((a) => a.id !== auditId)
        const finalStock = [...(curr.inventoryStock || [])]
        for (const [itId, targetQty] of Object.entries(recalculatedStockMap)) {
          const idx = finalStock.findIndex((st) => (st.warehouseId || st.warehouse_id) === whId && (st.itemId || st.item_id) === itId)
          if (idx >= 0) {
            finalStock[idx] = { ...finalStock[idx], quantity: targetQty }
          } else if (whId && itId) {
            finalStock.push({ warehouseId: whId, itemId: itId, quantity: targetQty, unit: 'كرتونة' })
          }
        }
        const recycleEntry = {
          id: `rec-${Date.now()}`,
          entityType: 'audit',
          entityId: auditId,
          entityCode: auditObj?.code || `AUD-${String(auditId).slice(-4)}`,
          entityTitle: `محضر جرد: ${auditObj?.warehouseName || auditObj?.warehouse_name || 'المخزن'} (${auditObj?.code || ''})`,
          originalData: auditObj,
          deletedAt: new Date().toISOString(),
          deletedBy: userProfile?.name || 'مدير النظام',
        }
        try {
          const payload = JSON.parse(localStorage.getItem('ax_cached_db_payload') || '{}')
          payload.inventoryStock = finalStock
          payload.stockAudits = finalAudits
          localStorage.setItem('ax_cached_db_payload', JSON.stringify(payload))
          localStorage.setItem('ax_stock_audits', JSON.stringify(finalAudits))
        } catch {}
        return {
          stockAudits: finalAudits,
          inventoryStock: finalStock,
          recycleBin: [recycleEntry, ...(curr.recycleBin || [])],
        }
      })
    }
    return res
  },

  rollbackTransfer: async (transferId, userProfile, set, state = null) => {
    const trfObj = (state?.transfers || []).find((t) => t.id === transferId)
    const res = await AX_OperationsService.rollbackTransferInDB(transferId, userProfile, trfObj)
    if (res.success) {
      set((s) => {
        const nextTransfers = (s.transfers || []).map((t) => (t.id === transferId ? { ...t, status: 'cancelled' } : t))
        const fromId = res.transfer?.from_warehouse_id || res.transfer?.fromWarehouseId || res.transfer?.fromId || trfObj?.fromId || trfObj?.from_warehouse_id
        const toId = res.transfer?.to_warehouse_id || res.transfer?.toWarehouseId || res.transfer?.toId || trfObj?.toId || trfObj?.to_warehouse_id
        const items = res.transfer?.items || trfObj?.items || []
        const revertedStock = [...(s.inventoryStock || [])]

        for (const it of items) {
          const itId = it.itemId || it.id || it.item_id
          const qty = Number(it.quantity) || 0
          if (!itId || qty <= 0) continue

          if (fromId) {
            const idx = revertedStock.findIndex((st) => (st.warehouseId || st.warehouse_id) === fromId && (st.itemId || st.item_id) === itId)
            if (idx >= 0) {
              revertedStock[idx] = { ...revertedStock[idx], quantity: (Number(revertedStock[idx].quantity) || 0) + qty }
            } else {
              revertedStock.push({ warehouseId: fromId, itemId: itId, quantity: qty, unit: it.unit || 'كرتونة' })
            }
          }
          if (toId) {
            const idx = revertedStock.findIndex((st) => (st.warehouseId || st.warehouse_id) === toId && (st.itemId || st.item_id) === itId)
            if (idx >= 0) {
              revertedStock[idx] = { ...revertedStock[idx], quantity: (Number(revertedStock[idx].quantity) || 0) - qty }
            } else {
              revertedStock.push({ warehouseId: toId, itemId: itId, quantity: -qty, unit: it.unit || 'كرتونة' })
            }
          }
        }

        const recycleEntry = {
          id: `rec-${Date.now()}`,
          entityType: 'transfer',
          entityId: transferId,
          entityCode: res.transfer?.code || `TRF-${String(transferId).slice(-4)}`,
          entityTitle: `إذن تحويل ${res.transfer?.code || ''} (${items.length} صنف)`,
          originalData: res.transfer,
          deletedAt: new Date().toISOString(),
          deletedBy: userProfile?.name || 'مدير النظام',
        }

        try {
          const payload = JSON.parse(localStorage.getItem('ax_cached_db_payload') || '{}')
          payload.inventoryStock = revertedStock
          payload.transfers = nextTransfers
          localStorage.setItem('ax_cached_db_payload', JSON.stringify(payload))
        } catch {}

        return {
          transfers: nextTransfers,
          inventoryStock: revertedStock,
          recycleBin: [recycleEntry, ...(s.recycleBin || [])],
        }
      })
    }
    return res
  },

  deleteTransfer: async (transferId, userProfile, set, state = null) => {
    const s = state || {}
    const trfObj = (s.transfers || []).find((t) => t.id === transferId)
    if (trfObj && trfObj.status === 'confirmed') {
      await recycleBinHelpers.rollbackTransfer(transferId, userProfile, set, state)
    }
    if (supabase && typeof supabase.from === 'function') {
      try {
        await supabase.from('ax_transfers').delete().eq('id', transferId)
      } catch {}
    }
    set((curr) => {
      const nextTransfers = (curr.transfers || []).filter((t) => t.id !== transferId)
      try {
        const payload = JSON.parse(localStorage.getItem('ax_cached_db_payload') || '{}')
        payload.transfers = nextTransfers
        localStorage.setItem('ax_cached_db_payload', JSON.stringify(payload))
      } catch {}
      return { transfers: nextTransfers }
    })
    return { success: true }
  },
}
