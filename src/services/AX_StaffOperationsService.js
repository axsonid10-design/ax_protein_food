import { supabase } from './supabaseClient.js'
import { generateUUID } from '../utils/AX_UUID.js'

export const AX_StaffOperationsService = {
  addStaffInviteInDB: async (invite) => {
    if (!supabase?.from || !invite) return { success: false }
    try {
      const id = invite.id || generateUUID()
      const row = {
        id,
        token: invite.token,
        role: invite.role || (invite.roleTitle?.includes('مدير') ? 'admin' : 'staff'),
        role_title: invite.roleTitle || invite.role_title || 'موظف',
        warehouse_id: invite.warehouseId || invite.warehouse_id || 'all',
        warehouse_name: invite.warehouseName || invite.warehouse_name || 'كافة الفروع والمخازن',
        permissions: invite.permissions || {},
        status: invite.status || 'pending',
        expires_at: invite.expiresAt || invite.expires_at || new Date(Date.now() + 7 * 86400000).toISOString(),
        created_at: invite.createdAt || invite.created_at || new Date().toISOString(),
      }
      const { data, error } = await supabase.from('ax_staff_invites').insert([row]).select().single()
      if (error) throw error
      return { success: true, data: data || row }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  revokeStaffInviteInDB: async (inviteId) => {
    if (!supabase?.from || !inviteId) return { success: false }
    try {
      const { error } = await supabase.from('ax_staff_invites').delete().eq('id', inviteId)
      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  updateStaffPermissionsInDB: async (userId, updates) => {
    if (!supabase?.from || !userId) return { success: false }
    try {
      const row = {
        role: updates.roleTitle || updates.role || undefined,
        branch_id: updates.warehouseId === 'all' ? null : (updates.warehouseId || updates.branch_id),
        permissions: updates.permissions,
        updated_at: new Date().toISOString(),
      }
      Object.keys(row).forEach((k) => row[k] === undefined && delete row[k])
      const { error } = await supabase.from('ax_users_profiles').update(row).eq('id', userId)
      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  upsertEmployeeInDB: async (emp) => {
    if (!supabase?.from || !emp?.id) return { success: false }
    try {
      const row = {
        id: emp.id,
        full_name: emp.name || emp.full_name || '',
        email: emp.email || `${emp.phone || Date.now()}@proteinfood.local`,
        phone: emp.phone || null,
        role: emp.roleTitle || emp.role || 'موظف',
        is_active: emp.status === 'active',
        branch_id: emp.warehouseId === 'all' ? null : emp.warehouseId,
        permissions: emp.permissions || {},
        password_hash: 'manual_provisioned',
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('ax_users_profiles').upsert(row)
      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteEmployeeInDB: async (empId) => {
    if (!supabase?.from || !empId) return { success: false }
    try {
      const { error } = await supabase.from('ax_users_profiles').delete().eq('id', empId)
      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },
}
