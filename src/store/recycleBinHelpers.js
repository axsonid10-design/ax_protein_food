import { AX_RecycleBinService } from '../services/AX_RecycleBinService.js'
import { AX_OperationsService } from '../services/AX_OperationsService.js'

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
        } else if (res.entityType === 'transfer' && res.restoredData) {
          updates.transfers = [{ ...res.restoredData, status: 'confirmed' }, ...(s.transfers || []).filter((t) => t.id !== res.restoredData.id)]
          const fromId = res.restoredData.from_warehouse_id || res.restoredData.fromId
          const toId = res.restoredData.to_warehouse_id || res.restoredData.toId
          const stockCopy = [...(s.inventoryStock || [])]
          for (const item of (res.restoredData.items || [])) {
            const itId = item.itemId || item.id || item.item_id
            const qty = Number(item.quantity) || 0
            if (!itId || qty <= 0) continue
            if (fromId) {
              const idx = stockCopy.findIndex((st) => st.warehouseId === fromId && st.itemId === itId)
              if (idx >= 0) stockCopy[idx] = { ...stockCopy[idx], quantity: Math.max(0, (Number(stockCopy[idx].quantity) || 0) - qty) }
            }
            if (toId) {
              const idx = stockCopy.findIndex((st) => st.warehouseId === toId && st.itemId === itId)
              if (idx >= 0) stockCopy[idx] = { ...stockCopy[idx], quantity: (Number(stockCopy[idx].quantity) || 0) + qty }
            }
          }
          updates.inventoryStock = stockCopy
        } else if (res.entityType === 'audit' && res.restoredData) {
          updates.stockAudits = [{ ...res.restoredData, status: 'approved' }, ...(s.stockAudits || []).filter((a) => a.id !== res.restoredData.id)]
          const whId = res.restoredData.warehouse_id || res.restoredData.warehouseId
          const stockCopy = [...(s.inventoryStock || [])]
          for (const item of (res.restoredData.items || [])) {
            const itId = item.itemId || item.item_id
            const actQty = Number(item.actualQtyNum !== undefined ? item.actualQtyNum : item.actualQty) || 0
            const idx = stockCopy.findIndex((st) => st.warehouseId === whId && st.itemId === itId)
            if (idx >= 0) stockCopy[idx] = { ...stockCopy[idx], quantity: actQty }
          }
          updates.inventoryStock = stockCopy
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
    const auditObj = (state?.stockAudits || []).find((a) => a.id === auditId)
    const res = await AX_OperationsService.rollbackStockAuditInDB(auditId, userProfile, auditObj)
    if (res.success) {
      set((s) => {
        const nextAudits = (s.stockAudits || []).map((a) => (a.id === auditId ? { ...a, status: 'cancelled' } : a))
        const whId = res.warehouseId
        const revertedStock = [...(s.inventoryStock || [])]
        for (const it of (res.items || [])) {
          const itId = it.itemId || it.item_id
          const prevQty = Number(it.systemQty !== undefined ? it.systemQty : it.previousQty) || 0
          const idx = revertedStock.findIndex((st) => st.warehouseId === whId && st.itemId === itId)
          if (idx >= 0) {
            revertedStock[idx] = { ...revertedStock[idx], quantity: prevQty }
          }
        }
        return { stockAudits: nextAudits, inventoryStock: revertedStock }
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
        const fromId = res.transfer?.from_warehouse_id || res.transfer?.fromId
        const toId = res.transfer?.to_warehouse_id || res.transfer?.toId
        const items = res.transfer?.items || []
        const revertedStock = [...(s.inventoryStock || [])]

        for (const it of items) {
          const itId = it.itemId || it.id || it.item_id
          const qty = Number(it.quantity) || 0
          if (!itId || qty <= 0) continue

          if (fromId) {
            const idx = revertedStock.findIndex((st) => st.warehouseId === fromId && st.itemId === itId)
            if (idx >= 0) {
              revertedStock[idx] = { ...revertedStock[idx], quantity: (Number(revertedStock[idx].quantity) || 0) + qty }
            }
          }
          if (toId) {
            const idx = revertedStock.findIndex((st) => st.warehouseId === toId && st.itemId === itId)
            if (idx >= 0) {
              revertedStock[idx] = { ...revertedStock[idx], quantity: Math.max(0, (Number(revertedStock[idx].quantity) || 0) - qty) }
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

        return {
          transfers: nextTransfers,
          inventoryStock: revertedStock,
          recycleBin: [recycleEntry, ...(s.recycleBin || [])],
        }
      })
    }
    return res
  },
}
