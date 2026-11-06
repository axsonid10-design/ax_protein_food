import { supabase } from './supabaseClient.js'
import { generateUUID } from '../utils/AX_UUID.js'
import { AX_RecycleBinService } from './AX_RecycleBinService.js'

export const AX_TransferOperationsService = {
  confirmTransferInDB: async (trf, updatedStock = [], userName = '') => {
    if (!supabase || typeof supabase.from !== 'function' || !trf?.id) return
    try {
      await supabase.from('ax_transfers').update({ status: 'confirmed', confirmed_at: new Date().toISOString(), confirmed_by: userName || 'مدير المنظومة' }).eq('id', trf.id)
      const transferItems = trf.items && trf.items.length > 0 ? trf.items : [{ itemId: trf.itemId, quantity: trf.quantity, unit: trf.unit }]
      const fromTargetId = trf.fromId || trf.from_warehouse_id
      const toTargetId = trf.toId || trf.to_warehouse_id

      for (const item of transferItems) {
        if (!item?.itemId && !item?.item_id) continue
        const itId = item.itemId || item.item_id
        const itQty = Number(item.quantity) || 0

        if (fromTargetId) {
          const fromRow = updatedStock.find((s) => (s.warehouseId === fromTargetId || s.warehouse_id === fromTargetId) && (s.itemId === itId || s.item_id === itId))
          let finalFromQty = fromRow ? Number(fromRow.quantity) : null
          if (finalFromQty === null) {
            const { data: curStock } = await supabase.from('ax_inventory_stock').select('quantity').eq('warehouse_id', fromTargetId).eq('item_id', itId).maybeSingle()
            if (curStock) finalFromQty = (Number(curStock.quantity) || 0) - itQty
            else finalFromQty = -itQty
          }
          if (finalFromQty !== null) {
            try { await supabase.from('ax_inventory_stock').upsert({ warehouse_id: fromTargetId, item_id: itId, quantity: finalFromQty, unit: item.unit || fromRow?.unit || 'كرتونة', updated_at: new Date().toISOString() }, { onConflict: 'warehouse_id,item_id' }) } catch {}
          }
        }
        if (toTargetId) {
          const toRow = updatedStock.find((s) => (s.warehouseId === toTargetId || s.warehouse_id === toTargetId) && (s.itemId === itId || s.item_id === itId))
          let finalToQty = toRow ? Number(toRow.quantity) : null
          if (finalToQty === null) {
            const { data: curStock } = await supabase.from('ax_inventory_stock').select('quantity').eq('warehouse_id', toTargetId).eq('item_id', itId).maybeSingle()
            finalToQty = ((Number(curStock?.quantity) || 0) + itQty)
          }
          if (finalToQty !== null) {
            try { await supabase.from('ax_inventory_stock').upsert({ warehouse_id: toTargetId, item_id: itId, quantity: finalToQty, unit: item.unit || toRow?.unit || 'كرتونة', updated_at: new Date().toISOString() }, { onConflict: 'warehouse_id,item_id' }) } catch {}
          }
        }
      }

      const transferTitle = `✅ تم فحص واستلام إذن التحويل [${trf.code || 'تحويل'}]`
      const transferMsg = `تم تأكيد إذن التحويل ونقل الأصناف للمستلم بنجاح.`
      try { await supabase.from('ax_notifications').insert({ id: 'notif-' + Date.now(), title: transferTitle, message: transferMsg, type: 'transfer', target_tab: 'warehouses', read: false }) } catch {}
      if (typeof supabase.functions?.invoke === 'function') {
        try { supabase.functions.invoke('ax-web-push', { body: { project_slug: 'protein-food', userId: 'all', title: transferTitle, message: transferMsg, link: '/?tab=warehouses', tag: `trf-conf-${Date.now()}` } }) } catch {}
      }
    } catch {}
  },

  updateTransferInDB: async (transferId, updates = {}, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !transferId) return { success: false }
    try {
      const dbUpdates = {}
      if (updates.date || updates.operationalDate) {
        dbUpdates.date = updates.date || updates.operationalDate
        const timePart = new Date().toISOString().split('T')[1] || '12:00:00.000Z'
        dbUpdates.requested_at = `${dbUpdates.date}T${timePart}`
      }
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes
      if (updates.status) dbUpdates.status = updates.status

      const { error } = await supabase.from('ax_transfers').update(dbUpdates).eq('id', transferId)
      if (error) throw error

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_transfers',
          action: 'UPDATE',
          record_id: transferId,
          new_data: dbUpdates,
          user_id: userProfile?.id || null,
        })
      } catch {}
      return { success: true }
    } catch (err) {
      console.error('updateTransferInDB error:', err)
      return { success: false, error: err.message }
    }
  },

  rollbackTransferInDB: async (transferId, userProfile = null, transferFallback = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !transferId) return { success: false }
    try {
      let trf = transferFallback
      if (!trf?.items || trf.items.length === 0) {
        const { data } = await supabase.from('ax_transfers').select('*').eq('id', transferId).maybeSingle()
        if (data) trf = data
      }
      if (!trf) return { success: false, error: 'Transfer not found' }

      const fromId = trf.from_warehouse_id || trf.fromId || trf.fromWarehouseId
      const toId = trf.to_warehouse_id || trf.toId || trf.toWarehouseId
      const items = trf.items || []

      if (trf.status === 'confirmed') {
        for (const item of items) {
          const itemId = item.itemId || item.id || item.item_id
          const qty = Number(item.quantity) || 0
          if (!itemId || qty <= 0) continue

          if (fromId) {
            const { data: fromStock } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', fromId).eq('item_id', itemId).maybeSingle()
            const curFromQty = Number(fromStock?.quantity || 0)
            await supabase.from('ax_inventory_stock').upsert({
              warehouse_id: fromId,
              item_id: itemId,
              quantity: curFromQty + qty,
              unit: item.unit || fromStock?.unit || 'كرتونة',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'warehouse_id,item_id' })
          }

          if (toId) {
            const { data: toStock } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', toId).eq('item_id', itemId).maybeSingle()
            const curToQty = Number(toStock?.quantity || 0)
            await supabase.from('ax_inventory_stock').upsert({
              warehouse_id: toId,
              item_id: itemId,
              quantity: curToQty - qty,
              unit: item.unit || toStock?.unit || 'كرتونة',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'warehouse_id,item_id' })
          }
        }
      }

      await supabase.from('ax_transfers').update({ status: 'cancelled' }).eq('id', transferId)

      try {
        await AX_RecycleBinService.moveToRecycleBin({
          entityType: 'transfer',
          entityId: transferId,
          entityCode: trf.code || `TRF-${String(transferId).slice(-4)}`,
          entityTitle: `إذن تحويل ${trf.code || ''} (${items.length} صنف)`,
          originalData: trf,
          userProfile,
        })
      } catch {}

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_transfers',
          action: 'ROLLBACK_TRANSFER',
          record_id: transferId,
          new_data: { code: trf.code, fromId, toId },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true, transfer: trf }
    } catch (err) {
      console.error('rollbackTransferInDB error:', err)
      return { success: false, error: err.message }
    }
  },

  cancelTransferInDB: async (transferId, userProfile = null) => {
    return await AX_TransferOperationsService.rollbackTransferInDB(transferId, userProfile)
  },

  addTransferInDB: async (newTrf) => {
    if (!supabase || typeof supabase.from !== 'function' || !newTrf?.id) return
    try {
      const opDate = newTrf.operationalDate || newTrf.date || new Date().toISOString().split('T')[0]
      const timePart = new Date().toISOString().split('T')[1] || '12:00:00.000Z'
      const reqIso = `${opDate}T${timePart}`
      await supabase.from('ax_transfers').insert({
        id: newTrf.id,
        code: newTrf.code,
        from_warehouse_id: newTrf.fromId,
        to_warehouse_id: newTrf.toId,
        items: newTrf.items,
        status: newTrf.status || 'pending',
        date: opDate,
        requested_at: reqIso,
        notes: newTrf.notes || null,
      })
      const trfTitle = `📦 إذن تحويل مخزني جديد [${newTrf.code}]`
      const trfMsg = `تم إنشاء إذن تحويل أصناف جديد وبانتظار الفحص والاستلام بالمخزن.`
      try { await supabase.from('ax_notifications').insert({ id: 'notif-' + Date.now(), title: trfTitle, message: trfMsg, type: 'transfer', target_tab: 'warehouses', read: false }) } catch {}

      if (typeof supabase.functions?.invoke === 'function') {
        try { supabase.functions.invoke('ax-web-push', { body: { project_slug: 'protein-food', userId: 'all', title: trfTitle, message: trfMsg, link: '/?tab=warehouses', tag: `trf-new-${Date.now()}` } }) } catch {}
      }
    } catch {}
  },
}
