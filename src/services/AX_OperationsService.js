import { supabase } from './supabaseClient.js'
import { generateUUID } from '../utils/AX_UUID.js'
import { AX_StaffOperationsService } from './AX_StaffOperationsService.js'
import { AX_CategoryOperationsService } from './AX_CategoryOperationsService.js'
import { AX_ItemOperationsService } from './AX_ItemOperationsService.js'

export const AX_OperationsService = {
  ...AX_StaffOperationsService,
  ...AX_CategoryOperationsService,
  ...AX_ItemOperationsService,

  addInvoiceInDB: async (inv, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !inv) return { success: false }
    try {
      const invoiceId = inv.id || generateUUID()
      const invoiceRow = {
        id: invoiceId,
        code: inv.code || `INV-${Date.now().toString().slice(-5)}`,
        type: inv.type || 'sale',
        party_name: inv.partyName || inv.party_name || '',
        warehouse_id: inv.warehouseId || inv.warehouse_id || null,
        date: inv.date || new Date().toISOString().split('T')[0],
        transport_cost: Number(inv.transportCost || inv.transport_cost || 0),
        loading_cost: Number(inv.loadingCost || inv.loading_cost || 0),
        subtotal: Number(inv.subtotal || 0),
        total: Number(inv.total || 0),
        paid_amount: Number(inv.paidAmount ?? inv.paid_amount ?? 0),
        remaining_amount: Number(inv.remainingAmount ?? inv.remaining_amount ?? 0),
        status: inv.status || (Number(inv.remainingAmount || 0) > 0 ? (Number(inv.paidAmount || 0) > 0 ? 'partial' : 'unpaid') : 'paid'),
        payment_terms: inv.paymentTerms || inv.payment_terms || (Number(inv.remainingAmount || 0) > 0 ? 'مدفوع جزئي' : 'مدفوع كلي'),
        items: inv.items || [],
      }
      const { error: invErr } = await supabase.from('ax_invoices').insert(invoiceRow)
      if (invErr) throw invErr

      if (inv.items && inv.items.length > 0 && invoiceRow.warehouse_id) {
        for (const item of inv.items) {
          const itemId = item.itemId || item.id
          const qty = Number(item.quantity || 0)
          if (!itemId || qty <= 0) continue
          const { data: stockRow } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', invoiceRow.warehouse_id).eq('item_id', itemId).maybeSingle()
          if (stockRow) {
            const delta = invoiceRow.type === 'sale' ? -qty : qty
            const newQty = Math.max(0, Number(stockRow.quantity || 0) + delta)
            await supabase.from('ax_inventory_stock').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', stockRow.id)
          } else if (invoiceRow.type !== 'sale') {
            await supabase.from('ax_inventory_stock').insert({ id: generateUUID(), warehouse_id: invoiceRow.warehouse_id, item_id: itemId, quantity: qty, unit: item.unit || 'كرتونة' })
          }
        }
      }

      if (invoiceRow.paid_amount > 0) {
        let tId = inv.treasuryId || inv.treasury_id || null
        if (!tId) {
          const { data: firstTr } = await supabase.from('ax_treasuries').select('id').order('created_at').limit(1).maybeSingle()
          tId = firstTr?.id || null
        }
        const txCode = (invoiceRow.type === 'sale' ? 'REC-' : 'PAY-') + Date.now().toString().slice(-4)
        const txRow = {
          id: generateUUID(),
          code: txCode,
          type: invoiceRow.type === 'sale' ? 'client_receipt' : 'supplier_payment',
          party_type: invoiceRow.type === 'sale' ? 'client' : 'supplier',
          party_id: null,
          party_name: invoiceRow.party_name,
          amount: invoiceRow.paid_amount,
          treasury_id: tId,
          date: invoiceRow.date,
          notes: invoiceRow.type === 'sale' ? `تحصيل نقدي - فاتورة مبيعات ${invoiceRow.code}` : `سداد نقدي - فاتورة مشتريات ${invoiceRow.code}`,
        }
        await supabase.from('ax_cash_transactions').insert(txRow)
        if (tId) {
          const { data: tr } = await supabase.from('ax_treasuries').select('*').eq('id', tId).maybeSingle()
          if (tr) {
            const delta = invoiceRow.type === 'sale' ? invoiceRow.paid_amount : -invoiceRow.paid_amount
            await supabase.from('ax_treasuries').update({ balance: Number(tr.balance || 0) + delta }).eq('id', tr.id)
          }
        }
      }

      const rem = Number(invoiceRow.remaining_amount || 0)
      if (rem > 0 && invoiceRow.party_name) {
        const targetTable = invoiceRow.type === 'sale' ? 'ax_clients' : 'ax_suppliers'
        const { data: party } = await supabase.from(targetTable).select('*').eq('name', invoiceRow.party_name).maybeSingle()
        if (party) {
          await supabase.from(targetTable).update({ balance: Number(party.balance || 0) + rem }).eq('id', party.id)
        } else {
          await supabase.from(targetTable).insert({ id: generateUUID(), name: invoiceRow.party_name, phone: '', address: 'بيانات ناقصة', balance: rem })
        }
      }

      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_invoices', action: 'INSERT', record_id: invoiceId, new_data: invoiceRow, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  addCashTransactionInDB: async (tx, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !tx) return { success: false }
    try {
      const txId = tx.id || generateUUID()
      const txRow = {
        id: txId,
        code: tx.code || `CTX-${Date.now().toString().slice(-4)}`,
        type: tx.type || 'client_receipt',
        party_type: tx.partyType || (tx.type === 'client_receipt' ? 'client' : 'supplier'),
        party_id: tx.partyId || null,
        party_name: tx.partyName || tx.party_name || '',
        amount: Number(tx.amount || 0),
        treasury_id: tx.treasuryId || tx.treasury_id || null,
        date: tx.date || new Date().toISOString().split('T')[0],
        notes: tx.notes || null,
      }
      const { error } = await supabase.from('ax_cash_transactions').insert(txRow)
      if (error) throw error

      if (txRow.treasury_id && txRow.amount > 0) {
        const { data: tr } = await supabase.from('ax_treasuries').select('*').eq('id', txRow.treasury_id).maybeSingle()
        if (tr) {
          const delta = txRow.type === 'client_receipt' ? txRow.amount : -txRow.amount
          await supabase.from('ax_treasuries').update({ balance: Number(tr.balance || 0) + delta }).eq('id', tr.id)
        }
      }

      if (txRow.party_name && txRow.amount > 0) {
        const targetTable = txRow.type === 'client_receipt' ? 'ax_clients' : 'ax_suppliers'
        const { data: party } = await supabase.from(targetTable).select('*').eq('name', txRow.party_name).maybeSingle()
        if (party) {
          const newBal = Math.max(0, Number(party.balance || 0) - txRow.amount)
          await supabase.from(targetTable).update({ balance: newBal }).eq('id', party.id)
        }
      }

      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_cash_transactions', action: 'INSERT', record_id: txId, new_data: txRow, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  addCashTransferInDB: async (transfer, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !transfer) return { success: false }
    try {
      const trfId = transfer.id || generateUUID()
      const trfRow = {
        id: trfId,
        code: transfer.code || `CTRF-${Date.now().toString().slice(-4)}`,
        from_treasury_id: transfer.fromTreasuryId || transfer.from_treasury_id || null,
        to_treasury_id: transfer.toTreasuryId || transfer.to_treasury_id || null,
        amount: Number(transfer.amount || 0),
        status: 'pending',
        sender_name: transfer.senderName || transfer.sender_name || userProfile?.name || 'أمين الخزينة',
        date: transfer.date || new Date().toISOString().split('T')[0],
        notes: transfer.notes || null,
        created_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('ax_cash_transfers').insert(trfRow)
      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  confirmCashTransferInDB: async (transfer, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !transfer) return { success: false }
    try {
      const trfId = typeof transfer === 'string' ? transfer : transfer.id
      let trfData = typeof transfer === 'object' ? transfer : null
      if (!trfData?.from_treasury_id && !trfData?.fromTreasuryId) {
        const { data } = await supabase.from('ax_cash_transfers').select('*').eq('id', trfId).maybeSingle()
        trfData = data
      }
      if (!trfData) return { success: false }

      await supabase.from('ax_cash_transfers').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', trfId)
      const fromId = trfData.from_treasury_id || trfData.fromTreasuryId
      const toId = trfData.to_treasury_id || trfData.toTreasuryId
      const amt = Number(trfData.amount || 0)

      if (fromId) {
        const { data: fTr } = await supabase.from('ax_treasuries').select('balance').eq('id', fromId).maybeSingle()
        if (fTr) await supabase.from('ax_treasuries').update({ balance: Math.max(0, Number(fTr.balance || 0) - amt) }).eq('id', fromId)
      }
      if (toId) {
        const { data: tTr } = await supabase.from('ax_treasuries').select('balance').eq('id', toId).maybeSingle()
        if (tTr) await supabase.from('ax_treasuries').update({ balance: Number(tTr.balance || 0) + amt }).eq('id', toId)
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  addTreasuryAccountInDB: async (account, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !account?.name) return { success: false }
    try {
      const accId = account.id || generateUUID()
      const row = { id: accId, name: account.name.trim(), type: account.type || 'cash', balance: Number(account.balance || 0) }
      const { error } = await supabase.from('ax_treasuries').insert(row)
      if (error) throw error
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_treasuries', action: 'INSERT', record_id: accId, new_data: row, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  addWarehouseInDB: async (warehouse, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !warehouse?.name) return { success: false }
    try {
      const whId = warehouse.id || generateUUID()
      const row = { id: whId, name: warehouse.name.trim(), type: warehouse.type || 'branch', manager: warehouse.manager || null, phone: warehouse.phone || null }
      const { error } = await supabase.from('ax_warehouses').insert(row)
      if (error) throw error
      const creatorName = userProfile?.name || userProfile?.full_name || 'مدير المنظومة'
      const notifTitle = `🏢 إضافة مخزن جديد [${warehouse.name}]`
      const notifMsg = `قام "${creatorName}" بإضافة مخزن/فرع جديد بالمنظومة: ${warehouse.name}.`
      try { await supabase.from('ax_notifications').insert({ id: 'notif-' + Date.now(), title: notifTitle, message: notifMsg, type: 'warehouse_added', target_tab: 'warehouses', target_user_id: 'managers', read: false }) } catch {}
      if (typeof supabase.functions?.invoke === 'function') {
        try { supabase.functions.invoke('ax-web-push', { body: { project_slug: 'protein-food', userId: 'managers', title: notifTitle, message: notifMsg, link: '/?tab=warehouses', tag: `wh-add-${whId}` } }) } catch {}
      }
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_warehouses', action: 'INSERT', record_id: whId, new_data: row, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  editWarehouseInDB: async (warehouse, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !warehouse?.id) return { success: false }
    try {
      const updateData = { name: warehouse.name.trim(), type: warehouse.type || 'branch', manager: warehouse.manager || null, phone: warehouse.phone || null }
      const { error } = await supabase.from('ax_warehouses').update(updateData).eq('id', warehouse.id)
      if (error) throw error
      const editorName = userProfile?.name || userProfile?.full_name || 'مدير المنظومة'
      const editTitle = `✏️ تعديل بيانات مخزن [${warehouse.name}]`
      const editMsg = `قام "${editorName}" بتحديث بيانات المخزن: ${warehouse.name}.`
      try { await supabase.from('ax_notifications').insert({ id: 'notif-' + Date.now(), title: editTitle, message: editMsg, type: 'warehouse_updated', target_tab: 'warehouses', target_user_id: 'managers', read: false }) } catch {}
      if (typeof supabase.functions?.invoke === 'function') {
        try { supabase.functions.invoke('ax-web-push', { body: { project_slug: 'protein-food', userId: 'managers', title: editTitle, message: editMsg, link: '/?tab=warehouses', tag: `wh-edit-${warehouse.id}` } }) } catch {}
      }
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_warehouses', action: 'UPDATE', record_id: warehouse.id, new_data: updateData, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteWarehouseInDB: async (warehouseId, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !warehouseId) return { success: false }
    try {
      try { await supabase.from('ax_inventory_stock').delete().eq('warehouse_id', warehouseId) } catch {}
      const { error } = await supabase.from('ax_warehouses').delete().eq('id', warehouseId)
      if (error) throw error
      const deleterName = userProfile?.name || userProfile?.full_name || 'مدير المنظومة'
      const delTitle = `🗑️ حذف مخزن من المنظومة`
      const delMsg = `قام "${deleterName}" بحذف أحد المخازن من المنظومة.`
      try { await supabase.from('ax_notifications').insert({ id: 'notif-' + Date.now(), title: delTitle, message: delMsg, type: 'warehouse_deleted', target_tab: 'warehouses', target_user_id: 'managers', read: false }) } catch {}
      if (typeof supabase.functions?.invoke === 'function') {
        try { supabase.functions.invoke('ax-web-push', { body: { project_slug: 'protein-food', userId: 'managers', title: delTitle, message: delMsg, link: '/?tab=warehouses', tag: `wh-del-${warehouseId}` } }) } catch {}
      }
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_warehouses', action: 'DELETE', record_id: warehouseId, new_data: { id: warehouseId }, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  addManufacturingOrderInDB: async (order, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !order) return { success: false }
    try {
      const mfgId = order.id || generateUUID()
      const row = {
        id: mfgId, code: order.code || `MFG-${Date.now().toString().slice(-5)}`,
        date: order.date || new Date().toISOString().split('T')[0],
        raw_item_id: order.rawItemId || order.raw_item_id || null,
        raw_warehouse_id: order.rawWarehouseId || order.raw_warehouse_id || null,
        consumed_quantity: Number(order.consumedQuantity || order.consumed_quantity || 0),
        consumed_unit: order.consumedUnit || order.consumed_unit || 'كرتونة',
        produced_items: order.producedItems || order.produced_items || [],
        waste_percentage: Number(order.wastePercentage || order.waste_percentage || 0),
        operator: order.operator || null, notes: order.notes || null,
      }
      const { error } = await supabase.from('ax_manufacturing_orders').insert(row)
      if (error) throw error

      if (row.raw_warehouse_id && row.raw_item_id && row.consumed_quantity > 0) {
        const { data: rawStock } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', row.raw_warehouse_id).eq('item_id', row.raw_item_id).maybeSingle()
        if (rawStock) {
          const newQty = Math.max(0, Number(rawStock.quantity || 0) - row.consumed_quantity)
          await supabase.from('ax_inventory_stock').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', rawStock.id)
        }
      }

      if (row.produced_items && row.produced_items.length > 0) {
        for (const prod of row.produced_items) {
          const targetWh = prod.targetWarehouseId || row.raw_warehouse_id
          const qty = Number(prod.quantity || 0)
          if (!prod.itemId || qty <= 0 || !targetWh) continue
          const { data: pStock } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', targetWh).eq('item_id', prod.itemId).maybeSingle()
          if (pStock) {
            await supabase.from('ax_inventory_stock').update({ quantity: Number(pStock.quantity || 0) + qty, updated_at: new Date().toISOString() }).eq('id', pStock.id)
          } else {
            await supabase.from('ax_inventory_stock').insert({ id: generateUUID(), warehouse_id: targetWh, item_id: prod.itemId, quantity: qty, unit: prod.unit || 'كرتونة' })
          }
        }
      }

      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_manufacturing_orders', action: 'INSERT', record_id: mfgId, new_data: row, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  confirmTransferInDB: async (trf, updatedStock = [], userName = '') => {
    if (!supabase || typeof supabase.from !== 'function' || !trf?.id) return
    try {
      await supabase.from('ax_transfers').update({ status: 'confirmed', confirmed_at: new Date().toISOString(), confirmed_by: userName || 'مدير المنظومة' }).eq('id', trf.id)
      const transferItems = trf.items && trf.items.length > 0 ? trf.items : [{ itemId: trf.itemId, quantity: trf.quantity, unit: trf.unit }]
      const fromTargetId = trf.fromId || trf.from_warehouse_id
      const toTargetId = trf.toId || trf.to_warehouse_id

      for (const item of transferItems) {
        if (fromTargetId) {
          const fromRow = updatedStock.find((s) => s.warehouseId === fromTargetId && s.itemId === item.itemId)
          if (fromRow) {
            try { await supabase.from('ax_inventory_stock').upsert({ warehouse_id: fromTargetId, item_id: item.itemId, quantity: fromRow.quantity, unit: item.unit || fromRow.unit, updated_at: new Date().toISOString() }, { onConflict: 'warehouse_id,item_id' }) } catch {}
          }
        }
        if (toTargetId) {
          const toRow = updatedStock.find((s) => s.warehouseId === toTargetId && s.itemId === item.itemId)
          if (toRow) {
            try { await supabase.from('ax_inventory_stock').upsert({ warehouse_id: toTargetId, item_id: item.itemId, quantity: toRow.quantity, unit: item.unit || toRow.unit, updated_at: new Date().toISOString() }, { onConflict: 'warehouse_id,item_id' }) } catch {}
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

  cancelTransferInDB: async (transferId, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !transferId) return { success: false }
    try {
      const { error } = await supabase.from('ax_transfers').update({ status: 'cancelled' }).eq('id', transferId)
      if (error) throw error
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_transfers', action: 'UPDATE', record_id: transferId, new_data: { status: 'cancelled' }, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  addTransferInDB: async (newTrf) => {
    if (!supabase || typeof supabase.from !== 'function' || !newTrf?.id) return
    try {
      await supabase.from('ax_transfers').insert({
        id: newTrf.id,
        code: newTrf.code,
        from_warehouse_id: newTrf.fromId,
        to_warehouse_id: newTrf.toId,
        items: newTrf.items,
        status: newTrf.status || 'pending',
        requested_at: new Date().toISOString(),
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

  markNotificationReadInDB: async (id) => {
    try {
      if (supabase?.from) await supabase.from('ax_notifications').update({ read: true }).eq('id', id)
    } catch {}
  },
  markAllNotificationsReadInDB: async () => {
    try {
      if (supabase?.from) await supabase.from('ax_notifications').update({ read: true }).neq('read', true)
    } catch {}
  },
  addNotificationInDB: async (notif) => {
    if (!supabase?.from || !notif) return
    try {
      await supabase.from('ax_notifications').insert({
        id: notif.id || 'notif-' + Date.now(),
        title: notif.title,
        message: notif.message,
        type: notif.type || 'info',
        target_tab: notif.targetTab || 'dashboard',
        target_user_id: notif.targetUserId || null,
        exclude_user_id: notif.excludeUserId || null,
        read: false,
      })
    } catch {}
  },
}
