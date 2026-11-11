import { supabase } from './supabaseClient.js'
import { generateUUID } from '../utils/AX_UUID.js'
import { getCartonEquivalent } from '../utils/pricingCalculations.js'

export const AX_ManufacturingOperationsService = {
  addManufacturingOrderInDB: async (order, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !order) return { success: false }
    try {
      const mfgId = order.id || generateUUID()
      const row = {
        id: mfgId,
        code: order.code || `MFG-${Date.now().toString().slice(-5)}`,
        date: order.date || new Date().toISOString().split('T')[0],
        raw_item_id: order.rawItemId || order.raw_item_id || null,
        raw_warehouse_id: order.rawWarehouseId || order.raw_warehouse_id || null,
        consumed_quantity: Number(order.consumedQuantity || order.consumed_quantity || 0),
        consumed_unit: order.consumedUnit || order.consumed_unit || 'كرتونة',
        produced_items: order.producedItems || order.produced_items || [],
        waste_percentage: Number(order.wastePercentage || order.waste_percentage || 0),
        operator: order.operator || null,
        notes: order.notes || null,
      }
      const { error } = await supabase.from('ax_manufacturing_orders').insert(row)
      if (error) throw error

      if (row.raw_warehouse_id && row.raw_item_id && row.consumed_quantity > 0) {
        let rawMeta = order
        try {
          const { data: dbIt } = await supabase.from('ax_items').select('unit_type, sub_unit_type, pieces_per_carton, weight_per_carton').eq('id', row.raw_item_id).maybeSingle()
          if (dbIt) rawMeta = { ...order, ...dbIt }
        } catch {}
        const cCartons = getCartonEquivalent(row.consumed_quantity, row.consumed_unit, rawMeta)
        const { data: rawStock } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', row.raw_warehouse_id).eq('item_id', row.raw_item_id).maybeSingle()
        if (rawStock) {
          const newQty = Number(rawStock.quantity || 0) - cCartons
          await supabase.from('ax_inventory_stock').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', rawStock.id)
        }
      }

      if (row.produced_items && row.produced_items.length > 0) {
        for (const prod of row.produced_items) {
          const targetWh = prod.targetWarehouseId || row.raw_warehouse_id
          const qty = Number(prod.quantity || 0)
          if (!prod.itemId || qty <= 0 || !targetWh) continue
          let prodMeta = prod
          try {
            const { data: dbP } = await supabase.from('ax_items').select('unit_type, sub_unit_type, pieces_per_carton, weight_per_carton').eq('id', prod.itemId).maybeSingle()
            if (dbP) prodMeta = { ...prod, ...dbP }
          } catch {}
          const pCartons = getCartonEquivalent(qty, prod.unit, prodMeta)
          const { data: pStock } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', targetWh).eq('item_id', prod.itemId).maybeSingle()
          if (pStock) {
            await supabase.from('ax_inventory_stock').update({ quantity: Number(pStock.quantity || 0) + pCartons, updated_at: new Date().toISOString() }).eq('id', pStock.id)
          } else {
            await supabase.from('ax_inventory_stock').insert({ id: generateUUID(), warehouse_id: targetWh, item_id: prod.itemId, quantity: pCartons, unit: prodMeta.unit_type || prod.unit || 'كرتونة' })
          }
        }
      }

      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_manufacturing_orders', action: 'INSERT', record_id: mfgId, new_data: row, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  updateManufacturingOrderInDB: async (order, userProfile = null, oldOrderFallback = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !order?.id) return { success: false }
    const row = {
      raw_item_id: order.rawItemId || order.raw_item_id || null,
      raw_warehouse_id: order.rawWarehouseId || order.raw_warehouse_id || null,
      consumed_quantity: Number(order.consumedQuantity || order.consumed_quantity || 0),
      consumed_unit: order.consumedUnit || order.consumed_unit || 'كرتونة',
      produced_items: order.producedItems || order.produced_items || [],
      waste_percentage: Number(order.wastePercentage ?? order.waste_percentage ?? 0),
      operator: order.operator || null,
      notes: order.notes || null,
    }
    try {
      let oldOrd = oldOrderFallback
      if (!oldOrd) { const { data } = await supabase.from('ax_manufacturing_orders').select('*').eq('id', order.id).maybeSingle(); oldOrd = data }
      if (oldOrd) {
        const oWh = oldOrd.raw_warehouse_id || oldOrd.rawWarehouseId, oIt = oldOrd.raw_item_id || oldOrd.rawItemId, oQty = Number(oldOrd.consumed_quantity || oldOrd.consumedQuantity || 0), oUnit = oldOrd.consumed_unit || oldOrd.consumedUnit || 'كرتونة'
        if (oWh && oIt && oQty > 0) {
          const { data: dbIt } = await supabase.from('ax_items').select('unit_type, sub_unit_type, pieces_per_carton, weight_per_carton').eq('id', oIt).maybeSingle()
          const cCartons = getCartonEquivalent(oQty, oUnit, dbIt || oldOrd)
          const { data: rs } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', oWh).eq('item_id', oIt).maybeSingle()
          if (rs) await supabase.from('ax_inventory_stock').update({ quantity: Number(rs.quantity || 0) + cCartons, updated_at: new Date().toISOString() }).eq('id', rs.id)
        }
        for (const p of (oldOrd.produced_items || oldOrd.producedItems || [])) {
          const tWh = p.targetWarehouseId || p.warehouseId || oWh, pIt = p.itemId || p.item_id, pQty = Number(p.quantity || 0)
          if (tWh && pIt && pQty > 0) {
            const { data: dbP } = await supabase.from('ax_items').select('unit_type, sub_unit_type, pieces_per_carton, weight_per_carton').eq('id', pIt).maybeSingle()
            const pCartons = getCartonEquivalent(pQty, p.unit, dbP || p)
            const { data: ps } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', tWh).eq('item_id', pIt).maybeSingle()
            if (ps) await supabase.from('ax_inventory_stock').update({ quantity: Number(ps.quantity || 0) - pCartons, updated_at: new Date().toISOString() }).eq('id', ps.id)
          }
        }
      }
      if (row.raw_warehouse_id && row.raw_item_id && row.consumed_quantity > 0) {
        const { data: dbIt } = await supabase.from('ax_items').select('unit_type, sub_unit_type, pieces_per_carton, weight_per_carton').eq('id', row.raw_item_id).maybeSingle()
        const cCartons = getCartonEquivalent(row.consumed_quantity, row.consumed_unit, dbIt || order)
        const { data: rs } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', row.raw_warehouse_id).eq('item_id', row.raw_item_id).maybeSingle()
        if (rs) await supabase.from('ax_inventory_stock').update({ quantity: Number(rs.quantity || 0) - cCartons, updated_at: new Date().toISOString() }).eq('id', rs.id)
      }
      for (const p of row.produced_items) {
        const tWh = p.targetWarehouseId || p.warehouseId || row.raw_warehouse_id, pIt = p.itemId || p.item_id, pQty = Number(p.quantity || 0)
        if (tWh && pIt && pQty > 0) {
          const { data: dbP } = await supabase.from('ax_items').select('unit_type, sub_unit_type, pieces_per_carton, weight_per_carton').eq('id', pIt).maybeSingle()
          const pCartons = getCartonEquivalent(pQty, p.unit, dbP || p)
          const { data: ps } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', tWh).eq('item_id', pIt).maybeSingle()
          if (ps) await supabase.from('ax_inventory_stock').update({ quantity: Number(ps.quantity || 0) + pCartons, updated_at: new Date().toISOString() }).eq('id', ps.id)
          else await supabase.from('ax_inventory_stock').insert({ id: generateUUID(), warehouse_id: tWh, item_id: pIt, quantity: pCartons, unit: dbP?.unit_type || p.unit || 'كرتونة' })
        }
      }
      await supabase.from('ax_manufacturing_orders').update(row).eq('id', order.id)
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_manufacturing_orders', action: 'UPDATE', record_id: order.id, new_data: row, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) { return { success: false, error: err.message } }
  },

  deleteManufacturingOrderInDB: async (orderId, userProfile = null, orderFallback = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !orderId) return { success: false }
    try {
      let ord = orderFallback
      if (!ord) { const { data } = await supabase.from('ax_manufacturing_orders').select('*').eq('id', orderId).maybeSingle(); ord = data }
      const rawWh = ord?.raw_warehouse_id || ord?.rawWarehouseId, rawIt = ord?.raw_item_id || ord?.rawItemId, cQty = Number(ord?.consumed_quantity || ord?.consumedQuantity || 0), cUnit = ord?.consumed_unit || ord?.consumedUnit || 'كرتونة'
      if (rawWh && rawIt && cQty > 0) {
        const { data: dbIt } = await supabase.from('ax_items').select('unit_type, sub_unit_type, pieces_per_carton, weight_per_carton').eq('id', rawIt).maybeSingle()
        const cCartons = getCartonEquivalent(cQty, cUnit, dbIt || ord)
        const { data: rs } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', rawWh).eq('item_id', rawIt).maybeSingle()
        if (rs) await supabase.from('ax_inventory_stock').update({ quantity: Number(rs.quantity || 0) + cCartons, updated_at: new Date().toISOString() }).eq('id', rs.id)
      }
      for (const p of (ord?.produced_items || ord?.producedItems || [])) {
        const tWh = p.targetWarehouseId || p.warehouseId || rawWh, pIt = p.itemId || p.item_id, pQty = Number(p.quantity || 0)
        if (tWh && pIt && pQty > 0) {
          const { data: dbP } = await supabase.from('ax_items').select('unit_type, sub_unit_type, pieces_per_carton, weight_per_carton').eq('id', pIt).maybeSingle()
          const pCartons = getCartonEquivalent(pQty, p.unit, dbP || p)
          const { data: ps } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', tWh).eq('item_id', pIt).maybeSingle()
          if (ps) await supabase.from('ax_inventory_stock').update({ quantity: Number(ps.quantity || 0) - pCartons, updated_at: new Date().toISOString() }).eq('id', ps.id)
        }
      }
      await supabase.from('ax_manufacturing_orders').delete().eq('id', orderId)
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_manufacturing_orders', action: 'DELETE', record_id: orderId, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) { return { success: false, error: err.message } }
  },
}
