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
}
