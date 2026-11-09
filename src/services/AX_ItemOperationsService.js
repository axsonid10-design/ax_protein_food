import { supabase } from './supabaseClient.js'
import { offlineDB } from './offlineDB.js'
import { generateUUID } from '../utils/AX_UUID.js'
import { AX_RecycleBinService } from './AX_RecycleBinService.js'

export const AX_ItemOperationsService = {
  addItemInDB: async (item, openingStock = null, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !item?.id) return { success: false }
    try {
      const { error: itemErr } = await supabase.from('ax_items').insert({
        id: item.id,
        code: item.code,
        composite_name: item.compositeName,
        primary_category: item.primaryCategory,
        sub_category: item.subCategory,
        secondary_category: item.secondaryCategory || null,
        unit_type: item.unitType,
        sub_unit_type: item.subUnitType || null,
        min_stock_alert: item.minStockAlert !== null && item.minStockAlert !== undefined && item.minStockAlert !== '' ? Number(item.minStockAlert) : null,
        weight_per_carton: item.weightPerCarton || (item.unitType === 'كرتونة' ? 10 : 1),
        pieces_per_carton: item.piecesPerCarton || null,
        grains_per_piece: item.grainsPerPiece || null,
        piece_weight: item.pieceWeight || null,
        grain_weight: item.grainWeight || null,
        buy_price: item.buyPrice || 0,
        sell_price: item.sellPrice || 0,
        piece_buy_price: item.pieceBuyPrice || null,
        piece_sell_price: item.pieceSellPrice || null,
        grain_buy_price: item.grainBuyPrice || null,
        grain_sell_price: item.grainSellPrice || null,
      })
      if (itemErr) throw itemErr

      if (openingStock && Number(openingStock.quantity) > 0 && openingStock.warehouseId) {
        try { await supabase.from('ax_inventory_stock').insert({ warehouse_id: openingStock.warehouseId, item_id: item.id, quantity: Number(openingStock.quantity), unit: openingStock.unit || item.unitType }) } catch {}
      }

      const creatorName = userProfile?.name || userProfile?.full_name || 'أحد المستخدمين'
      const isCreatorManager = Boolean(userProfile?.isMaster || userProfile?.role === 'admin' || userProfile?.role === 'manager' || userProfile?.role === 'super_admin' || userProfile?.role?.includes('مدير') || userProfile?.email === 'axsonid@gmail.com' || userProfile?.email === 'amrsorea84@gmail.com')
      const notifTitle = !isCreatorManager ? `✨ إضافة صنف جديد [${item.code}]` : `📦 صنف جديد بالمنظومة [${item.code}]`
      const notifMsg = !isCreatorManager ? `قام الموظف "${creatorName}" بإضافة صنف جديد: ${item.compositeName}.` : `أضاف المدير "${creatorName}" صنفاً جديداً: ${item.compositeName}.`

      try { await supabase.from('ax_notifications').insert({ id: 'notif-' + Date.now(), title: notifTitle, message: notifMsg, type: 'item_added', target_tab: 'items', target_user_id: isCreatorManager ? 'all' : 'managers', exclude_user_id: userProfile?.id || null, read: false }) } catch {}
      if (typeof supabase.functions?.invoke === 'function') {
        try {
          supabase.functions.invoke('ax-web-push', {
            body: {
              project_slug: 'protein-food',
              userId: isCreatorManager ? 'all' : 'managers',
              excludeUserId: userProfile?.id || null,
              title: notifTitle,
              message: notifMsg,
              link: '/?tab=items',
              tag: `item-add-${item.id}`
            }
          })
        } catch {}
      }
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_items', action: 'INSERT', record_id: item.id, new_data: item, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  addMultipleItemsInDB: async (itemsListWithStock = [], userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !itemsListWithStock.length) return { success: false }
    try {
      const itemRows = itemsListWithStock.map(({ item }) => ({
        id: item.id,
        code: item.code,
        composite_name: item.compositeName,
        primary_category: item.primaryCategory,
        sub_category: item.subCategory,
        secondary_category: item.secondaryCategory || null,
        unit_type: item.unitType,
        sub_unit_type: item.subUnitType || null,
        min_stock_alert: item.minStockAlert !== null && item.minStockAlert !== undefined && item.minStockAlert !== '' ? Number(item.minStockAlert) : null,
        weight_per_carton: item.weightPerCarton || (item.unitType === 'كرتونة' ? 10 : 1),
        pieces_per_carton: item.piecesPerCarton || null,
        grains_per_piece: item.grainsPerPiece || null,
        piece_weight: item.pieceWeight || null,
        grain_weight: item.grainWeight || null,
        buy_price: item.buyPrice || 0,
        sell_price: item.sellPrice || 0,
        piece_buy_price: item.pieceBuyPrice || null,
        piece_sell_price: item.pieceSellPrice || null,
        grain_buy_price: item.grainBuyPrice || null,
        grain_sell_price: item.grainSellPrice || null,
      }))
      const { error: batchErr } = await supabase.from('ax_items').insert(itemRows)
      if (batchErr) throw batchErr

      const stockRows = []
      itemsListWithStock.forEach(({ item, openingStock }) => {
        if (openingStock && Number(openingStock.quantity) > 0 && openingStock.warehouseId) {
          stockRows.push({
            id: generateUUID(),
            warehouse_id: openingStock.warehouseId,
            item_id: item.id,
            quantity: Number(openingStock.quantity),
            unit: openingStock.unit || item.unitType,
          })
        }
      })
      if (stockRows.length > 0) {
        try { await supabase.from('ax_inventory_stock').insert(stockRows) } catch {}
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  editItemInDB: async (item, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !item?.id) return { success: false }
    try {
      const updateData = {
        code: item.code,
        composite_name: item.compositeName,
        primary_category: item.primaryCategory,
        sub_category: item.subCategory,
        secondary_category: item.secondaryCategory || null,
        unit_type: item.unitType,
        sub_unit_type: item.subUnitType || null,
        min_stock_alert: item.minStockAlert !== null && item.minStockAlert !== undefined && item.minStockAlert !== '' ? Number(item.minStockAlert) : null,
        weight_per_carton: item.weightPerCarton || (item.unitType === 'كرتونة' ? 10 : 1),
        pieces_per_carton: item.piecesPerCarton || null,
        grains_per_piece: item.grainsPerPiece || null,
        piece_weight: item.pieceWeight || null,
        grain_weight: item.grainWeight || null,
        buy_price: item.buyPrice || 0,
        sell_price: item.sellPrice || 0,
        piece_buy_price: item.pieceBuyPrice || null,
        piece_sell_price: item.pieceSellPrice || null,
        grain_buy_price: item.grainBuyPrice || null,
        grain_sell_price: item.grainSellPrice || null,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('ax_items').update(updateData).eq('id', item.id)
      if (error) throw error
      const editorName = userProfile?.name || userProfile?.full_name || 'أحد المستخدمين'
      const editTitle = `✏️ تعديل صنف [${item.code}]`
      const editMsg = `قام "${editorName}" بتعديل بيانات الصنف: ${item.compositeName || item.subCategory || item.code}.`
      try { await supabase.from('ax_notifications').insert({ id: 'notif-' + Date.now(), title: editTitle, message: editMsg, type: 'item_updated', target_tab: 'items', target_user_id: 'managers', exclude_user_id: userProfile?.id || null, read: false }) } catch {}
      if (typeof supabase.functions?.invoke === 'function') {
        try {
          supabase.functions.invoke('ax-web-push', {
            body: {
              project_slug: 'protein-food',
              userId: 'managers',
              excludeUserId: userProfile?.id || null,
              title: editTitle,
              message: editMsg,
              link: '/?tab=items',
              tag: `item-edit-${item.id}`
            }
          })
        } catch {}
      }
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_items', action: 'UPDATE', record_id: item.id, new_data: updateData, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteItemInDB: async (itemId, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !itemId) return { success: false }
    try {
      const { data: itemData } = await supabase.from('ax_items').select('*').eq('id', itemId).maybeSingle()
      if (itemData) {
        await AX_RecycleBinService.moveToRecycleBin({
          entityType: 'item',
          entityId: itemId,
          entityCode: itemData.code,
          entityTitle: `صنف: ${itemData.composite_name || itemData.code || itemId}`,
          originalData: itemData,
          userProfile,
        })
      }
      try { await supabase.from('ax_inventory_stock').delete().eq('item_id', itemId) } catch {}
      const { error } = await supabase.from('ax_items').delete().eq('id', itemId)
      if (error) throw error
      const deleterName = userProfile?.name || userProfile?.full_name || 'أحد المستخدمين'
      const delTitle = `🗑️ حذف صنف من المنظومة`
      const delMsg = `قام "${deleterName}" بحذف صنف من المنظومة.`
      try { await supabase.from('ax_notifications').insert({ id: 'notif-' + Date.now(), title: delTitle, message: delMsg, type: 'item_deleted', target_tab: 'items', target_user_id: 'managers', exclude_user_id: userProfile?.id || null, read: false }) } catch {}
      if (typeof supabase.functions?.invoke === 'function') {
        try {
          supabase.functions.invoke('ax-web-push', {
            body: {
              project_slug: 'protein-food',
              userId: 'managers',
              excludeUserId: userProfile?.id || null,
              title: delTitle,
              message: delMsg,
              link: '/?tab=items',
              tag: `item-del-${itemId}`
            }
          })
        } catch {}
      }
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_items', action: 'DELETE', record_id: itemId, new_data: { id: itemId }, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  applyStockAuditInDB: async (auditPayload, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !auditPayload?.session) return { success: false }
    try {
      const { session, adjustedStocks = [] } = auditPayload
      const auditRow = {
        id: session.id,
        code: session.code,
        warehouse_id: session.warehouseId,
        warehouse_name: session.warehouseName,
        auditor_name: session.auditorName,
        audit_date: session.date,
        items_count: session.itemsCount,
        deficits_count: session.deficitsCount,
        surpluses_count: session.surplusesCount,
        total_variance_cost: session.totalVarianceCost,
        notes: session.notes,
        status: session.status || 'approved',
        items: session.items || [],
      }
      try { await supabase.from('ax_stock_audits').upsert(auditRow, { onConflict: 'id' }) } catch {}
      for (const adj of adjustedStocks) {
        if (!adj.warehouseId || !adj.itemId) continue
        try {
          await supabase.from('ax_inventory_stock').upsert({
            warehouse_id: adj.warehouseId,
            item_id: adj.itemId,
            quantity: Number(adj.actualQty || 0),
            unit: adj.unit || 'كرتونة',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'warehouse_id,item_id' })
        } catch {}
      }
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_stock_audits', action: 'INSERT', record_id: session.id, new_data: auditRow, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  saveOpeningBalanceInDB: async ({ itemId, warehouseId, quantity, date, unit, newStock }, userProfile = null) => {
    if (!itemId || !warehouseId) return { success: false }
    const parsedQty = !isNaN(Number(quantity)) && quantity !== '' && quantity !== null ? Number(quantity) : 0
    const stockRow = {
      warehouse_id: warehouseId,
      item_id: itemId,
      opening_balance: parsedQty,
      opening_date: date || null,
      quantity: Number(newStock !== undefined ? newStock : parsedQty) || 0,
      unit: unit || 'كرتونة',
      updated_at: new Date().toISOString(),
    }
    if (!supabase || typeof supabase.from !== 'function') {
      try {
        await offlineDB.enqueue('ax_inventory_stock', 'upsert', stockRow)
      } catch {}
      return { success: true, offline: true }
    }
    try {
      const { error } = await supabase.from('ax_inventory_stock').upsert(stockRow, {
        onConflict: 'warehouse_id,item_id',
      })
      if (error) throw error
      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_inventory_stock',
          action: 'UPDATE_OPENING_BALANCE',
          record_id: `${warehouseId}:${itemId}`,
          new_data: stockRow,
          user_id: userProfile?.id || null,
        })
      } catch {}
      return { success: true }
    } catch (err) {
      try {
        await offlineDB.enqueue('ax_inventory_stock', 'upsert', stockRow)
      } catch {}
      return { success: false, error: err.message }
    }
  },
}
