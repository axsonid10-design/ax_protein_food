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
      } else if (entityType === 'transfer') {
        await supabase.from('ax_transfers').upsert({
          id: rawData.id,
          code: rawData.code,
          from_warehouse_id: rawData.fromId || rawData.from_warehouse_id,
          to_warehouse_id: rawData.toId || rawData.to_warehouse_id,
          status: rawData.status || 'pending',
          items: rawData.items || [],
        }, { onConflict: 'id' })
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
