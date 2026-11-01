import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { generateUUID } from '../utils/AX_UUID.js'

export const AX_SupplierOperationsService = {
  addSupplierInDB: async (supplier, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !supplier) return { success: false }
    try {
      const supId = supplier.id || generateUUID()
      const row = {
        id: supId,
        name: (supplier.companyName || supplier.name || '').trim(),
        phone: (supplier.phone || '').trim(),
        address: (supplier.address || '').trim(),
        balance: Number(supplier.balance || 0),
        created_at: supplier.createdAt || new Date().toISOString(),
      }
      const { error } = await supabase.from('ax_suppliers').insert(row)
      if (error) throw error

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_suppliers',
          action: 'INSERT',
          record_id: supId,
          new_data: { ...row, supplierData: supplier },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true, id: supId }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  updateSupplierInDB: async (supplier, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !supplier?.id) return { success: false }
    try {
      const row = {
        name: (supplier.companyName || supplier.name || '').trim(),
        phone: (supplier.phone || '').trim(),
        address: (supplier.address || '').trim(),
        balance: Number(supplier.balance || 0),
      }
      const { error } = await supabase.from('ax_suppliers').update(row).eq('id', supplier.id)
      if (error) throw error

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_suppliers',
          action: 'UPDATE',
          record_id: supplier.id,
          new_data: { ...row, supplierData: supplier },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteSupplierInDB: async (supplierId, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !supplierId) return { success: false }
    try {
      const { error } = await supabase.from('ax_suppliers').delete().eq('id', supplierId)
      if (error) throw error

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_suppliers',
          action: 'DELETE',
          record_id: supplierId,
          new_data: { id: supplierId },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },
}

export default AX_SupplierOperationsService
