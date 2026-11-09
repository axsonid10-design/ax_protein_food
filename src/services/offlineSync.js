import { offlineDB } from './offlineDB.js'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

let isSyncing = false

export const offlineSync = {
  async getPendingCount() {
    try {
      const queue = await offlineDB.getQueue()
      return queue.length
    } catch {
      return 0
    }
  },

  async processQueue(onProgress) {
    if (isSyncing) return { status: 'already_syncing' }
    if (!navigator.onLine) return { status: 'offline' }
    if (!isSupabaseConfigured()) {
      const queue = await offlineDB.getQueue()
      return { status: 'unconfigured', pending: queue.length }
    }

    isSyncing = true
    try {
      const queue = await offlineDB.getQueue()
      if (queue.length === 0) {
        isSyncing = false
        return { status: 'empty', synced: 0 }
      }

      let synced = 0
      for (const item of queue) {
        try {
          const { table, action, payload } = item

          if (action === 'insert') {
            const { error } = await supabase.from(table).insert(payload)
            if (error) throw error
          } else if (action === 'upsert') {
            const onConflict = item.onConflict || (table === 'ax_inventory_stock' ? 'warehouse_id,item_id' : undefined)
            const { error } = await supabase.from(table).upsert(payload, onConflict ? { onConflict } : undefined)
            if (error) throw error
          } else if (action === 'update') {
            const { id, ...updates } = payload
            const { error } = await supabase.from(table).update(updates).eq('id', id)
            if (error) throw error
          } else if (action === 'delete') {
            const { id } = payload
            const { error } = await supabase.from(table).delete().eq('id', id)
            if (error) throw error
          }

          await offlineDB.removeQueueItem(item.id)
          synced += 1

          if (onProgress) {
            onProgress({ current: synced, total: queue.length })
          }
        } catch {
          break
        }
      }

      isSyncing = false
      return { status: 'success', synced }
    } catch (err) {
      isSyncing = false
      return { status: 'error', error: err.message }
    }
  },

  async performMutation(table, action, payload) {
    if (!navigator.onLine || !isSupabaseConfigured()) {
      const queueId = await offlineDB.enqueue(table, action, payload)
      return { mode: 'offline', queueId, data: payload }
    }

    try {
      let result = null
      if (action === 'insert') {
        const { data, error } = await supabase.from(table).insert(payload).select()
        if (error) throw error
        result = data
      } else if (action === 'upsert') {
        const onConflict = payload?.onConflict || (table === 'ax_inventory_stock' ? 'warehouse_id,item_id' : undefined)
        const { data, error } = await supabase.from(table).upsert(payload, onConflict ? { onConflict } : undefined).select()
        if (error) throw error
        result = data
      } else if (action === 'update') {
        const { id, ...updates } = payload
        const { data, error } = await supabase.from(table).update(updates).eq('id', id).select()
        if (error) throw error
        result = data
      } else if (action === 'delete') {
        const { id } = payload
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
        result = { id }
      }
      return { mode: 'online', data: result }
    } catch {
      const queueId = await offlineDB.enqueue(table, action, payload)
      return { mode: 'offline_fallback', queueId, data: payload }
    }
  },
}
