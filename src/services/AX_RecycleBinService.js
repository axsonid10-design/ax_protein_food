import { supabase } from './supabaseClient.js'
import { generateUUID } from '../utils/AX_UUID.js'
import { AX_InvoiceOperationsService } from './AX_InvoiceOperationsService.js'

export const AX_RecycleBinService = {
  moveToRecycleBin: async ({
    entityType,
    entityId,
    entityCode = '',
    entityTitle = '',
    originalData = {},
    userProfile = null,
  }) => {
    if (!supabase || typeof supabase.from !== 'function') return null
    try {
      const record = {
        id: generateUUID(),
        entity_type: entityType,
        entity_id: String(entityId),
        entity_code: entityCode || '',
        entity_title: entityTitle || entityCode || 'عنصر محذوف',
        deleted_by: userProfile?.name || 'مدير النظام',
        deleted_at: new Date().toISOString(),
        original_data: originalData,
        metadata: {
          user_id: userProfile?.id || null,
        },
      }
      const { error } = await supabase.from('ax_recycle_bin').insert(record)
      if (error) {
        console.error('[RECYCLE_BIN_INSERT_ERR]', error)
      }
      return record
    } catch (err) {
      console.error('[RECYCLE_BIN_EXCEPTION]', err)
      return null
    }
  },

  restoreFromRecycleBin: async (item, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !item) return { success: false }
    try {
      const entityType = item.entity_type || item.entityType
      const rawData = item.original_data || item.originalData || {}

      if (entityType === 'invoice') {
        await AX_InvoiceOperationsService.addInvoiceInDB(rawData, userProfile)
      } else if (entityType === 'item') {
        await supabase.from('ax_items').upsert({
          id: rawData.id,
          code: rawData.code,
          composite_name: rawData.compositeName || rawData.composite_name,
          primary_category: rawData.primaryCategory || rawData.primary_category,
          sub_category: rawData.subCategory || rawData.sub_category,
          secondary_category: rawData.secondaryCategory || rawData.secondary_category,
          unit_type: rawData.unitType || rawData.unit_type || 'كرتونة',
          weight_per_carton: Number(rawData.weightPerCarton || rawData.weight_per_carton || 0),
          pieces_per_carton: rawData.piecesPerCarton || rawData.pieces_per_carton,
          buy_price: Number(rawData.buyPrice || rawData.buy_price || 0),
          sell_price: Number(rawData.sellPrice || rawData.sell_price || 0),
        }, { onConflict: 'id' })
      } else if (entityType === 'client') {
        await supabase.from('ax_clients').upsert({
          id: rawData.id,
          name: rawData.name,
          phone: rawData.phone || '',
          balance: Number(rawData.balance || 0),
        }, { onConflict: 'id' })
      } else if (entityType === 'supplier') {
        await supabase.from('ax_suppliers').upsert({
          id: rawData.id,
          name: rawData.name,
          phone: rawData.phone || '',
          balance: Number(rawData.balance || 0),
        }, { onConflict: 'id' })
      } else if (entityType === 'employee') {
        await supabase.from('ax_company_employees').upsert({
          id: rawData.id,
          code: rawData.code,
          name: rawData.name,
          phone: rawData.phone || null,
          national_id: rawData.national_id || rawData.nationalId || null,
          department: rawData.department || 'التشغيل والمصنع',
          job_title: rawData.job_title || rawData.jobTitle || 'عامل تشغيل',
          salary_type: rawData.salary_type || rawData.salaryType || 'monthly',
          base_salary: Number(rawData.base_salary ?? rawData.baseSalary ?? 0),
          daily_rate: Number(rawData.daily_rate ?? rawData.dailyRate ?? 0),
          hire_date: rawData.hire_date || rawData.hireDate || null,
          status: rawData.status || 'active',
          notes: rawData.notes || null,
        }, { onConflict: 'id' })
      } else if (entityType === 'transfer') {
        const fromId = rawData.from_warehouse_id || rawData.fromId
        const toId = rawData.to_warehouse_id || rawData.toId
        const items = rawData.items || []

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
              quantity: curFromQty - qty,
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
              quantity: curToQty + qty,
              unit: item.unit || toStock?.unit || 'كرتونة',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'warehouse_id,item_id' })
          }
        }

        await supabase.from('ax_transfers').update({ status: 'confirmed' }).eq('id', rawData.id)
      } else if (entityType === 'audit') {
        const whId = rawData.warehouse_id || rawData.warehouseId
        for (const it of (rawData.items || [])) {
          const itId = it.itemId || it.item_id
          const actQty = Number(it.actualQtyNum !== undefined ? it.actualQtyNum : it.actualQty) || 0
          if (whId && itId) {
            await supabase.from('ax_inventory_stock').upsert({
              warehouse_id: whId,
              item_id: itId,
              quantity: actQty,
              unit: it.unit || 'كرتونة',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'warehouse_id,item_id' })
          }
        }
        await supabase.from('ax_stock_audits').update({ status: 'approved' }).eq('id', rawData.id)
      }

      await supabase.from('ax_recycle_bin').delete().eq('id', item.id)
      return { success: true, restoredData: rawData, entityType }
    } catch (err) {
      console.error('[RESTORE_ERR]', err)
      return { success: false, error: err.message }
    }
  },

  purgeFromRecycleBin: async (id) => {
    if (!supabase || typeof supabase.from !== 'function' || !id) return false
    try {
      await supabase.from('ax_recycle_bin').delete().eq('id', id)
      return true
    } catch (err) {
      console.error('[PURGE_ERR]', err)
      return false
    }
  },
}
