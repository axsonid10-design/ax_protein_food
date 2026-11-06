import { supabase } from './supabaseClient.js'
import { offlineDB } from './offlineDB.js'
import { generateUUID } from '../utils/AX_UUID.js'
import { AX_StaffOperationsService } from './AX_StaffOperationsService.js'
import { AX_CategoryOperationsService } from './AX_CategoryOperationsService.js'
import { AX_ItemOperationsService } from './AX_ItemOperationsService.js'
import { AX_InvoiceOperationsService } from './AX_InvoiceOperationsService.js'
import { AX_TransferOperationsService } from './AX_TransferOperationsService.js'
import { AX_EmployeesOperationsService } from './AX_EmployeesOperationsService.js'
import { AX_RecycleBinService } from './AX_RecycleBinService.js'
import { recoverUnappliedTransfers, executeImmediateTransfer } from '../store/transferHelpers.js'

export const AX_OperationsService = {
  ...AX_StaffOperationsService,
  ...AX_CategoryOperationsService,
  ...AX_ItemOperationsService,
  ...AX_InvoiceOperationsService,
  ...AX_TransferOperationsService,
  ...AX_EmployeesOperationsService,

  addCashTransactionInDB: async (tx, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !tx) return { success: false }
    const isPayroll = tx.type === 'payroll' || tx.partyType === 'employee'
    const isExpense = tx.type === 'expense' || isPayroll
    const dbType = isExpense ? 'expense' : (tx.type === 'supplier_payment' ? 'supplier_payment' : 'client_receipt')
    const dbPartyType = isPayroll ? 'employee' : (tx.partyType || (dbType === 'client_receipt' ? 'client' : (dbType === 'supplier_payment' ? 'supplier' : 'expense')))
    const txId = tx.id || generateUUID()
    const txRow = {
      id: txId,
      code: tx.code || (isPayroll ? `WAGE-${Date.now().toString().slice(-4)}` : `CTX-${Date.now().toString().slice(-4)}`),
      type: dbType,
      party_type: dbPartyType,
      party_id: tx.partyId || null,
      party_name: tx.partyName || tx.party_name || '',
      amount: Number(tx.amount || 0),
      treasury_id: tx.treasuryId || tx.treasury_id || null,
      date: tx.date || new Date().toISOString().split('T')[0],
      notes: tx.notes || (isPayroll ? `[أجور ومرتبات] ${tx.partyName || ''}` : null),
    }
    try {
      const { error } = await supabase.from('ax_cash_transactions').insert(txRow)
      if (error) throw error

      if (txRow.treasury_id && txRow.amount > 0) {
        const { data: tr } = await supabase.from('ax_treasuries').select('*').eq('id', txRow.treasury_id).maybeSingle()
        if (tr) {
          const isCashIn = txRow.type === 'client_receipt' || txRow.type === 'other_income' || txRow.type === 'misc_revenue'
          const delta = isCashIn ? txRow.amount : -txRow.amount
          await supabase.from('ax_treasuries').update({ balance: Number(tr.balance || 0) + delta }).eq('id', tr.id)
        }
      }

      if (txRow.party_name && txRow.amount > 0 && (dbType === 'client_receipt' || dbType === 'supplier_payment')) {
        const targetTable = dbType === 'client_receipt' ? 'ax_clients' : 'ax_suppliers'
        const { data: party } = await supabase.from(targetTable).select('*').eq('name', txRow.party_name).maybeSingle()
        if (party) {
          const newBal = Number(party.balance || 0) - txRow.amount
          await supabase.from(targetTable).update({ balance: newBal }).eq('id', party.id)
        }
      }

      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_cash_transactions', action: 'INSERT', record_id: txId, new_data: txRow, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      try { await offlineDB.enqueue('ax_cash_transactions', 'insert', txRow) } catch {}
      return { success: false, error: err.message, enqueued: true }
    }
  },

  addCashTransferInDB: async (transfer, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !transfer) return { success: false }
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
    try {
      const { error } = await supabase.from('ax_cash_transfers').insert(trfRow)
      if (error) throw error
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_cash_transfers', action: 'INSERT', record_id: trfId, new_data: trfRow, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      try { await offlineDB.enqueue('ax_cash_transfers', 'insert', trfRow) } catch {}
      return { success: false, error: err.message, enqueued: true }
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
    const VALID_TREASURY_TYPES = ['cash', 'bank', 'wallet', 'instapay', 'van_cash']
    const accId = account.id || generateUUID()
    const accType = VALID_TREASURY_TYPES.includes(account.type) ? account.type : 'cash'
    const row = { id: accId, name: account.name.trim(), type: accType, balance: Number(account.balance || 0) }
    try {
      const { error } = await supabase.from('ax_treasuries').insert(row)
      if (error) throw error
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_treasuries', action: 'INSERT', record_id: accId, new_data: row, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      try { await offlineDB.enqueue('ax_treasuries', 'insert', row) } catch {}
      return { success: false, error: err.message, enqueued: true }
    }
  },

  updateTreasuryAccountInDB: async (account, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !account?.id) return { success: false }
    const VALID_TYPES = ['cash', 'bank', 'wallet', 'instapay', 'van_cash']
    const accType = VALID_TYPES.includes(account.type) ? account.type : 'cash'
    const row = { name: account.name?.trim(), type: accType, balance: Number(account.balance || 0), updated_at: new Date().toISOString() }
    try {
      const { error } = await supabase.from('ax_treasuries').update(row).eq('id', account.id)
      if (error) throw error
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_treasuries', action: 'UPDATE', record_id: account.id, new_data: row, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      try { await offlineDB.enqueue('ax_treasuries', 'update', { ...row, id: account.id }) } catch {}
      return { success: false, error: err.message, enqueued: true }
    }
  },

  deleteTreasuryAccountInDB: async (accountId, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !accountId) return { success: false }
    try {
      await Promise.allSettled([supabase.from('ax_cash_transactions').update({ treasury_id: null }).eq('treasury_id', accountId), supabase.from('ax_cash_transfers').update({ from_treasury_id: null }).eq('from_treasury_id', accountId), supabase.from('ax_cash_transfers').update({ to_treasury_id: null }).eq('to_treasury_id', accountId)])
      const { error } = await supabase.from('ax_treasuries').delete().eq('id', accountId)
      if (error) throw error
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_treasuries', action: 'DELETE', record_id: accountId, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      try { await offlineDB.enqueue('ax_treasuries', 'delete', { id: accountId }) } catch {}
      return { success: false, error: err.message, enqueued: true }
    }
  },

  addWarehouseInDB: async (warehouse, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !warehouse?.name) return { success: false }
    const VALID_WH_TYPES = ['cold_store', 'raw_materials', 'processing', 'finished_goods', 'van']
    const whId = warehouse.id || generateUUID()
    const whType = VALID_WH_TYPES.includes(warehouse.type) ? warehouse.type : 'cold_store'
    const row = { id: whId, name: warehouse.name.trim(), type: whType, manager: warehouse.manager || null, phone: warehouse.phone || null }
    try {
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
      try { await offlineDB.enqueue('ax_warehouses', 'insert', row) } catch {}
      return { success: false, error: err.message, enqueued: true }
    }
  },

  editWarehouseInDB: async (warehouse, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !warehouse?.id) return { success: false }
    try {
      const VALID_WH_TYPES = ['cold_store', 'raw_materials', 'processing', 'finished_goods', 'van']
      const whType = VALID_WH_TYPES.includes(warehouse.type) ? warehouse.type : 'cold_store'
      const updateData = { name: warehouse.name.trim(), type: whType, manager: warehouse.manager || null, phone: warehouse.phone || null }
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

  updateManufacturingOrderInDB: async (order, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !order?.id) return { success: false }
    const row = {
      raw_item_id: order.rawItemId || order.raw_item_id || null,
      raw_warehouse_id: order.rawWarehouseId || order.raw_warehouse_id || null,
      consumed_quantity: Number(order.consumedQuantity || order.consumed_quantity || 0),
      consumed_unit: order.consumedUnit || order.consumed_unit || 'كرتونة',
      produced_items: order.producedItems || order.produced_items || [],
      operator: order.operator || null, notes: order.notes || null,
    }
    try {
      await supabase.from('ax_manufacturing_orders').update(row).eq('id', order.id)
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_manufacturing_orders', action: 'UPDATE', record_id: order.id, new_data: row, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) { return { success: false, error: err.message } }
  },

  deleteManufacturingOrderInDB: async (orderId, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !orderId) return { success: false }
    try {
      await supabase.from('ax_manufacturing_orders').delete().eq('id', orderId)
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_manufacturing_orders', action: 'DELETE', record_id: orderId, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) { return { success: false, error: err.message } }
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
  applyStockAuditInDB: async (auditPayload, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !auditPayload) return
    try {
      const { session, adjustedStocks = [] } = auditPayload
      if (session) {
        await supabase.from('ax_stock_audits').upsert({
          id: session.id,
          code: session.code,
          warehouse_id: session.warehouseId || session.warehouse_id,
          warehouse_name: session.warehouseName || session.warehouse_name,
          auditor_name: session.auditorName || session.auditor_name,
          audit_date: session.auditDate || session.date,
          operational_date: session.operationalDate || session.date,
          status: session.status || 'confirmed',
          items: session.items || [],
          items_count: session.itemsCount || (session.items || []).length,
          deficits_count: session.deficitsCount || 0,
          surpluses_count: session.surplusesCount || 0,
          total_variance_cost: session.totalVarianceCost || 0,
          notes: session.notes || null,
          created_at: session.createdAt || session.created_at || new Date().toISOString(),
        }, { onConflict: 'id' })
      }
      for (const adj of adjustedStocks) {
        const whId = adj.warehouseId || adj.warehouse_id
        const itId = adj.itemId || adj.item_id
        const qty = Number(adj.actualQty !== undefined ? adj.actualQty : adj.quantity) || 0
        if (whId && itId) {
          await supabase.from('ax_inventory_stock').upsert({ warehouse_id: whId, item_id: itId, quantity: qty, unit: adj.unit || 'كرتونة', updated_at: new Date().toISOString() }, { onConflict: 'warehouse_id,item_id' })
        }
      }
      try {
        await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_stock_audits', action: 'CONFIRM_AUDIT', record_id: session?.id, new_data: { code: session?.code, warehouseId: session?.warehouseId }, user_id: userProfile?.id || null })
      } catch {}
    } catch (err) {
      console.error('applyStockAuditInDB error:', err)
    }
  },
  rollbackStockAuditInDB: async (auditId, userProfile = null, auditFallback = null) => {
    if (!auditId) return { success: false }
    try {
      let audit = auditFallback
      if (supabase && typeof supabase.from === 'function') {
        const { data } = await supabase.from('ax_stock_audits').select('*').eq('id', auditId).maybeSingle()
        if (data) audit = data
      }
      if (!audit) audit = { id: auditId, warehouse_id: 'wh-1', items: [] }
      const whId = audit.warehouse_id || audit.warehouseId
      for (const it of (audit.items || [])) {
        const itemId = it.itemId || it.item_id
        const prevQty = Number(it.systemQty !== undefined ? it.systemQty : it.previousQty) || 0
        if (whId && itemId) {
          await supabase.from('ax_inventory_stock').upsert({ warehouse_id: whId, item_id: itemId, quantity: prevQty, unit: it.unit || 'كرتونة', updated_at: new Date().toISOString() }, { onConflict: 'warehouse_id,item_id' })
        }
      }
      await supabase.from('ax_stock_audits').update({ status: 'cancelled' }).eq('id', auditId)

      try {
        await AX_RecycleBinService.moveToRecycleBin({
          entityType: 'audit',
          entityId: auditId,
          entityCode: audit.code || `AUD-${String(auditId).slice(-4)}`,
          entityTitle: `محضر جرد: ${audit.warehouse_name || audit.warehouseName || 'المخزن'} (${audit.code || ''})`,
          originalData: audit,
          userProfile,
        })
      } catch {}

      try {
        await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_stock_audits', action: 'ROLLBACK_AUDIT', record_id: auditId, new_data: { code: audit.code, warehouse_id: whId }, user_id: userProfile?.id || null })
      } catch {}
      return { success: true, warehouseId: whId, items: audit.items || [] }
    } catch (err) {
      console.error('rollbackStockAuditInDB error:', err)
      return { success: false, error: err.message }
    }
  },
  recoverUnappliedTransfers,
  executeImmediateTransfer,
}
