import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { generateUUID } from '../utils/AX_UUID.js'

export const AX_CustomerOperationsService = {
  addCustomerInDB: async (customer, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !customer) return { success: false }
    try {
      const custId = customer.id || generateUUID()
      const row = {
        id: custId,
        name: (customer.name || '').trim(),
        phone: (customer.phone || '').trim(),
        address: (customer.address || '').trim() || (customer.isIncomplete ? 'بيانات ناقصة' : ''),
        balance: Number(customer.balance || 0),
        created_at: customer.createdAt || new Date().toISOString(),
      }
      const { error } = await supabase.from('ax_clients').insert(row)
      if (error) throw error

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_clients',
          action: 'INSERT',
          record_id: custId,
          new_data: { ...row, customerData: customer },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true, id: custId }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  updateCustomerInDB: async (customer, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !customer?.id) return { success: false }
    try {
      const row = {
        name: (customer.name || '').trim(),
        phone: (customer.phone || '').trim(),
        address: (customer.address || '').trim(),
        balance: Number(customer.balance || 0),
      }
      const { error } = await supabase.from('ax_clients').update(row).eq('id', customer.id)
      if (error) throw error

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_clients',
          action: 'UPDATE',
          record_id: customer.id,
          new_data: { ...row, customerData: customer },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteCustomerInDB: async (customerId, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !customerId) return { success: false }
    try {
      const { error } = await supabase.from('ax_clients').delete().eq('id', customerId)
      if (error) throw error

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_clients',
          action: 'DELETE',
          record_id: customerId,
          new_data: { id: customerId },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },
}

export default AX_CustomerOperationsService
