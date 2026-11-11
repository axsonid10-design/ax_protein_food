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
        opening_balance: Number(customer.openingBalance !== undefined ? customer.openingBalance : (customer.opening_balance || 0)),
        opening_balance_type: customer.openingBalanceType || customer.opening_balance_type || 'debit',
        opening_balance_date: customer.openingBalanceDate || customer.opening_balance_date || null,
        created_at: customer.createdAt || new Date().toISOString(),
        sales_rep_name: (customer.salesRepName || '').trim() || null,
        commercial_register: (customer.commercialRegister || '').trim() || null,
        contact_person: (customer.contactPerson || '').trim() || null,
        phone2: (customer.phone2 || '').trim() || null,
        governorate: (customer.governorate || '').trim() || null,
        city: (customer.city || '').trim() || null,
        district: (customer.district || '').trim() || null,
        primary_category: (customer.primaryCategory || '').trim() || null,
        notes: (customer.notes || '').trim() || null,
        attachments: customer.attachments || [],
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
      const hasDelta = customer.balanceDelta !== undefined && customer.balanceDelta !== null
      const deltaVal = hasDelta ? Number(customer.balanceDelta) || 0 : 0
      const row = {
        name: (customer.name || '').trim(),
        phone: (customer.phone || '').trim(),
        address: (customer.address || '').trim(),
        opening_balance: Number(customer.openingBalance !== undefined ? customer.openingBalance : (customer.opening_balance || 0)),
        opening_balance_type: customer.openingBalanceType || customer.opening_balance_type || 'debit',
        opening_balance_date: customer.openingBalanceDate || customer.opening_balance_date || null,
        sales_rep_name: (customer.salesRepName || '').trim() || null,
        commercial_register: (customer.commercialRegister || '').trim() || null,
        contact_person: (customer.contactPerson || '').trim() || null,
        phone2: (customer.phone2 || '').trim() || null,
        governorate: (customer.governorate || '').trim() || null,
        city: (customer.city || '').trim() || null,
        district: (customer.district || '').trim() || null,
        primary_category: (customer.primaryCategory || '').trim() || null,
        notes: (customer.notes || '').trim() || null,
        attachments: customer.attachments || [],
      }
      if (!hasDelta) {
        row.balance = Number(customer.balance || 0)
      }
      const { error } = await supabase.from('ax_clients').update(row).eq('id', customer.id)
      if (error) throw error
      if (hasDelta && Math.abs(deltaVal) >= 0.0001) {
        if (typeof supabase.rpc === 'function') {
          const { error: rpcErr } = await supabase.rpc('ax_adjust_party_balance', {
            p_kind: 'client',
            p_id: customer.id,
            p_delta: deltaVal,
          })
          if (rpcErr) {
            await supabase.from('ax_clients').update({ balance: Number(customer.balance || 0) }).eq('id', customer.id)
          }
        } else {
          await supabase.from('ax_clients').update({ balance: Number(customer.balance || 0) }).eq('id', customer.id)
        }
      }

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
