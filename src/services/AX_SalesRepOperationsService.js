import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { offlineDB } from './offlineDB.js'
import { generateUUID } from '../utils/AX_UUID.js'

export const AX_SalesRepOperationsService = {
  addSalesRepInDB: async (rep, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !rep) return { success: false }
    try {
      const repId = rep.id || generateUUID()
      const row = {
        id: repId,
        name: (rep.name || '').trim(),
        phone: (rep.phone || '').trim(),
        balance: Number(rep.currentBalance ?? rep.netBalance ?? rep.balance ?? 0),
        status: rep.status || 'active',
        van_number: (rep.assignedBranch || rep.vanNumber || '').trim(),
        target_amount: Number(rep.targetAmount ?? rep.salesTarget ?? 0),
        commission_model: rep.commissionModel || 'volume_rate',
        step_amount: Number(rep.stepAmount || 1000),
        step_rate: Number(rep.stepRate || 50),
        opening_balance: Number(rep.openingBalance || 0),
        metadata: rep.metadata || {},
        created_at: rep.createdAt || new Date().toISOString(),
      }

      const { error } = await supabase.from('ax_distributors').upsert(row, { onConflict: 'id' })
      if (error) {
        try {
          await offlineDB.enqueue('ax_distributors', 'upsert', row)
        } catch {}
      }

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_distributors',
          action: 'INSERT',
          record_id: repId,
          new_data: { ...row, repData: rep },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true, id: repId }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  updateSalesRepInDB: async (rep, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !rep?.id) return { success: false }
    try {
      const row = {
        name: (rep.name || '').trim(),
        phone: (rep.phone || '').trim(),
        balance: Number(rep.currentBalance ?? rep.netBalance ?? rep.balance ?? 0),
        van_number: (rep.assignedBranch || rep.vanNumber || '').trim(),
        target_amount: Number(rep.targetAmount ?? rep.salesTarget ?? 0),
        commission_model: rep.commissionModel || 'volume_rate',
        step_amount: Number(rep.stepAmount || 1000),
        step_rate: Number(rep.stepRate || 50),
        status: rep.status || 'active',
      }

      const { error } = await supabase.from('ax_distributors').update(row).eq('id', rep.id)
      if (error) {
        try {
          await offlineDB.enqueue('ax_distributors', 'update', { id: rep.id, ...row })
        } catch {}
      }

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_distributors',
          action: 'UPDATE',
          record_id: rep.id,
          new_data: { ...row, repData: rep },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteSalesRepInDB: async (repId, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !repId) return { success: false }
    try {
      const { error } = await supabase.from('ax_distributors').delete().eq('id', repId)
      if (error) {
        try {
          await offlineDB.enqueue('ax_distributors', 'delete', { id: repId })
        } catch {}
      }

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_distributors',
          action: 'DELETE',
          record_id: repId,
          new_data: { id: repId },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  addSalesRepTransactionInDB: async (tx, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !tx) return { success: false }
    try {
      const txId = tx.id || generateUUID()
      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_sales_rep_ledger',
          action: 'INSERT',
          record_id: txId,
          new_data: tx,
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true, id: txId }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },
}

export default AX_SalesRepOperationsService
