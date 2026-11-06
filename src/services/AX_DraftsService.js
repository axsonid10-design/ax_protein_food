import { offlineDB } from './offlineDB.js'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const debounceTimers = new Map()
const pendingCloudSync = new Set()

const normalizeDraftForSupabase = (draft) => ({
  id: String(draft.id),
  type: String(draft.type),
  title: String(draft.title || 'مسودة غير معنونة'),
  warehouse_id: draft.warehouseId || draft.warehouse_id || null,
  warehouse_name: draft.warehouseName || draft.warehouse_name || null,
  payload: draft.payload || {},
  user_name: draft.userName || draft.user_name || null,
  created_at: draft.createdAt || new Date().toISOString(),
  updated_at: draft.updatedAt || new Date().toISOString(),
})

const mapSupabaseToDraft = (row) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  warehouseId: row.warehouse_id,
  warehouseName: row.warehouse_name,
  payload: row.payload,
  userName: row.user_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const AX_DraftsService = {
  async saveDraft(draft) {
    if (!draft || !draft.id) throw new Error('Draft must contain an id')
    const normalized = {
      ...draft,
      updatedAt: draft.updatedAt || new Date().toISOString(),
      createdAt: draft.createdAt || new Date().toISOString(),
    }

    const localRecord = await offlineDB.saveDraft(normalized)
    this.syncDraftToCloud(localRecord).catch(() => {})
    return localRecord
  },

  async syncDraftToCloud(draft) {
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine
    if (!isSupabaseConfigured() || !isOnline) {
      pendingCloudSync.add(draft.id)
      return { synced: false, mode: 'offline' }
    }

    try {
      const payload = normalizeDraftForSupabase(draft)
      const { error } = await supabase.from('ax_drafts').upsert(payload)
      if (error) {
        pendingCloudSync.add(draft.id)
        return { synced: false, error: error.message }
      }
      pendingCloudSync.delete(draft.id)
      return { synced: true }
    } catch (err) {
      pendingCloudSync.add(draft.id)
      return { synced: false, error: err.message }
    }
  },

  saveDraftDebounced(draft, delay = 800) {
    if (!draft || !draft.id) return Promise.reject(new Error('Draft must contain an id'))

    const normalized = {
      ...draft,
      updatedAt: new Date().toISOString(),
      createdAt: draft.createdAt || new Date().toISOString(),
    }

    const localPromise = offlineDB.saveDraft(normalized)

    if (debounceTimers.has(draft.id)) {
      clearTimeout(debounceTimers.get(draft.id))
    }

    const timer = setTimeout(() => {
      debounceTimers.delete(draft.id)
      this.syncDraftToCloud(normalized).catch(() => {})
    }, delay)

    debounceTimers.set(draft.id, timer)
    return localPromise
  },

  async saveDraftImmediate(draft) {
    if (!draft || !draft.id) throw new Error('Draft must contain an id')
    if (debounceTimers.has(draft.id)) {
      clearTimeout(debounceTimers.get(draft.id))
      debounceTimers.delete(draft.id)
    }

    const normalized = {
      ...draft,
      updatedAt: new Date().toISOString(),
      createdAt: draft.createdAt || new Date().toISOString(),
    }

    const localRecord = await offlineDB.saveDraft(normalized)
    await this.syncDraftToCloud(localRecord)
    return localRecord
  },

  async getDrafts(type) {
    const local = await offlineDB.getDraftsByType(type)

    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine
    if (!isSupabaseConfigured() || !isOnline) {
      return local
    }

    try {
      let query = supabase.from('ax_drafts').select('*').order('updated_at', { ascending: false })
      if (type) {
        query = query.eq('type', type)
      }
      const { data, error } = await query
      if (error || !Array.isArray(data)) {
        return local
      }

      const mergedMap = new Map()
      local.forEach((d) => mergedMap.set(d.id, d))

      for (const row of data) {
        const remote = mapSupabaseToDraft(row)
        const existing = mergedMap.get(remote.id)
        if (!existing) {
          mergedMap.set(remote.id, remote)
          offlineDB.saveDraft(remote).catch(() => {})
        } else {
          const rTime = new Date(remote.updatedAt || 0).getTime()
          const lTime = new Date(existing.updatedAt || 0).getTime()
          if (rTime > lTime) {
            mergedMap.set(remote.id, remote)
            offlineDB.saveDraft(remote).catch(() => {})
          }
        }
      }

      const mergedList = Array.from(mergedMap.values())
      mergedList.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      return mergedList
    } catch {
      return local
    }
  },

  async getDraftById(id) {
    if (!id) return null
    const local = await offlineDB.getDraft(id)
    if (local) return local

    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine
    if (!isSupabaseConfigured() || !isOnline) return null

    try {
      const { data, error } = await supabase.from('ax_drafts').select('*').eq('id', id).maybeSingle()
      if (error || !data) return null
      const remote = mapSupabaseToDraft(data)
      await offlineDB.saveDraft(remote)
      return remote
    } catch {
      return null
    }
  },

  async deleteDraft(id) {
    if (!id) return false
    if (debounceTimers.has(id)) {
      clearTimeout(debounceTimers.get(id))
      debounceTimers.delete(id)
    }
    pendingCloudSync.delete(id)

    await offlineDB.deleteDraft(id)

    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine
    if (isSupabaseConfigured() && isOnline) {
      try {
        await supabase.from('ax_drafts').delete().eq('id', id)
      } catch {}
    } else {
      offlineDB.enqueue('ax_drafts', 'delete', { id }).catch(() => {})
    }

    return true
  },

  async syncPendingDrafts() {
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine
    if (!isSupabaseConfigured() || !isOnline) return { synced: 0, failed: 0 }

    let synced = 0
    let failed = 0

    const pendingIds = Array.from(pendingCloudSync)
    for (const id of pendingIds) {
      try {
        const draft = await offlineDB.getDraft(id)
        if (draft) {
          const res = await this.syncDraftToCloud(draft)
          if (res.synced) synced += 1
          else failed += 1
        }
      } catch {
        failed += 1
      }
    }

    return { synced, failed }
  },

  clearAllTimers() {
    for (const timer of debounceTimers.values()) {
      clearTimeout(timer)
    }
    debounceTimers.clear()
  },
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('online', () => {
    AX_DraftsService.syncPendingDrafts().catch(() => {})
  })
}
