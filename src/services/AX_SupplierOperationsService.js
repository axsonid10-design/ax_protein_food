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
        phone2: (supplier.phone2 || '').trim() || null,
        contact_person: (supplier.contactPerson || supplier.contact_person || '').trim() || null,
        address: (supplier.address || '').trim() || null,
        tax_number: (supplier.taxNumber || supplier.tax_number || '').trim() || null,
        commercial_registration: (supplier.commercialRegistration || supplier.commercialRegister || supplier.commercial_registration || '').trim() || null,
        balance: Number(supplier.balance || 0),
        opening_balance: Number(supplier.openingBalance !== undefined ? supplier.openingBalance : (supplier.opening_balance || 0)),
        opening_balance_type: supplier.openingBalanceType || supplier.opening_balance_type || 'payable',
        opening_balance_date: supplier.openingBalanceDate || supplier.opening_balance_date || null,
        notes: (supplier.notes || '').trim() || null,
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
        phone2: (supplier.phone2 || '').trim() || null,
        contact_person: (supplier.contactPerson || supplier.contact_person || '').trim() || null,
        address: (supplier.address || '').trim() || null,
        tax_number: (supplier.taxNumber || supplier.tax_number || '').trim() || null,
        commercial_registration: (supplier.commercialRegistration || supplier.commercialRegister || supplier.commercial_registration || '').trim() || null,
        balance: Number(supplier.balance || 0),
        opening_balance: Number(supplier.openingBalance !== undefined ? supplier.openingBalance : (supplier.opening_balance || 0)),
        opening_balance_type: supplier.openingBalanceType || supplier.opening_balance_type || 'payable',
        opening_balance_date: supplier.openingBalanceDate || supplier.opening_balance_date || null,
        notes: (supplier.notes || '').trim() || null,
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
