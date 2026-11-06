const DB_NAME = 'ax_frozen_foods_db'
const DB_VERSION = 2
const QUEUE_STORE = 'offline_queue'
const CACHE_STORE = 'cache_store'
const DRAFTS_STORE = 'drafts'

let dbInstance = null
const memoryQueue = []
const memoryCache = new Map()
const memoryDrafts = new Map()

const hasIndexedDB = typeof indexedDB !== 'undefined'
const hasLocalStorage = typeof localStorage !== 'undefined'

const getFallbackDrafts = () => {
  if (hasLocalStorage) {
    try {
      const raw = localStorage.getItem('ax_offline_drafts')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) return arr
      }
    } catch {}
  }
  return Array.from(memoryDrafts.values())
}

const persistFallbackDrafts = (draftsList) => {
  memoryDrafts.clear()
  draftsList.forEach((d) => {
    if (d?.id) memoryDrafts.set(d.id, d)
  })
  if (hasLocalStorage) {
    try {
      localStorage.setItem('ax_offline_drafts', JSON.stringify(draftsList))
    } catch {}
  }
}

const getDB = () => {
  if (!hasIndexedDB) return Promise.resolve(null)
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
        }
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
          const draftStore = db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' })
          draftStore.createIndex('type', 'type', { unique: false })
          draftStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
      }

      request.onsuccess = (e) => {
        dbInstance = e.target.result
        resolve(dbInstance)
      }

      request.onerror = (e) => {
        reject(e.target.error)
      }
    } catch (err) {
      resolve(null)
    }
  })
}

export const offlineDB = {
  async enqueue(table, action, payload) {
    const db = await getDB()
    const record = {
      table,
      action,
      payload,
      createdAt: new Date().toISOString(),
      retries: 0,
    }

    if (!db) {
      const id = Date.now() + Math.random()
      record.id = id
      memoryQueue.push(record)
      return id
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite')
      const store = tx.objectStore(QUEUE_STORE)
      const req = store.add(record)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  },

  async getQueue() {
    const db = await getDB()
    if (!db) return [...memoryQueue]

    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly')
      const store = tx.objectStore(QUEUE_STORE)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  },

  async removeQueueItem(id) {
    const db = await getDB()
    if (!db) {
      const idx = memoryQueue.findIndex((q) => q.id === id)
      if (idx !== -1) memoryQueue.splice(idx, 1)
      return true
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite')
      const store = tx.objectStore(QUEUE_STORE)
      const req = store.delete(id)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  },

  async clearQueue() {
    const db = await getDB()
    if (!db) {
      memoryQueue.length = 0
      return true
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite')
      const store = tx.objectStore(QUEUE_STORE)
      const req = store.clear()
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  },

  async cacheData(key, data) {
    const db = await getDB()
    if (!db) {
      memoryCache.set(key, { key, data, updatedAt: Date.now() })
      return true
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readwrite')
      const store = tx.objectStore(CACHE_STORE)
      const req = store.put({ key, data, updatedAt: Date.now() })
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  },

  async getCachedData(key) {
    const db = await getDB()
    if (!db) {
      const hit = memoryCache.get(key)
      return hit ? hit.data : null
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readonly')
      const store = tx.objectStore(CACHE_STORE)
      const req = store.get(key)
      req.onsuccess = () => resolve(req.result ? req.result.data : null)
      req.onerror = () => reject(req.error)
    })
  },

  async cacheSet(key, data) {
    return this.cacheData(key, data)
  },

  async cacheGet(key) {
    return this.getCachedData(key)
  },

  async cacheGetByField(key, field, value) {
    const list = (await this.getCachedData(key)) || []
    if (!Array.isArray(list)) return null
    return list.find((item) => item && String(item[field]) === String(value)) || null
  },

  async cacheAppend(key, item) {
    const list = (await this.getCachedData(key)) || []
    await this.cacheData(key, [item, ...(Array.isArray(list) ? list : [])])
  },

  async cacheUpdateItem(key, id, updates) {
    const list = (await this.getCachedData(key)) || []
    if (!Array.isArray(list)) return
    const updated = list.map((item) => (item.id === id ? { ...item, ...updates } : item))
    await this.cacheData(key, updated)
  },

  async cacheDeleteItem(key, id) {
    const list = (await this.getCachedData(key)) || []
    if (!Array.isArray(list)) return
    const filtered = list.filter((item) => item.id !== id)
    await this.cacheData(key, filtered)
  },

  async saveDraft(draft) {
    if (!draft || !draft.id) throw new Error('Draft must contain an id')
    const normalized = {
      ...draft,
      updatedAt: draft.updatedAt || new Date().toISOString(),
      createdAt: draft.createdAt || new Date().toISOString(),
    }

    const db = await getDB()
    if (!db) {
      const current = getFallbackDrafts().filter((d) => d.id !== normalized.id)
      current.unshift(normalized)
      persistFallbackDrafts(current)
      return normalized
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFTS_STORE, 'readwrite')
      const store = tx.objectStore(DRAFTS_STORE)
      const req = store.put(normalized)
      req.onsuccess = () => resolve(normalized)
      req.onerror = () => reject(req.error)
    })
  },

  async getDraft(id) {
    if (!id) return null
    const db = await getDB()
    if (!db) {
      const drafts = getFallbackDrafts()
      return drafts.find((d) => d.id === id) || null
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFTS_STORE, 'readonly')
      const store = tx.objectStore(DRAFTS_STORE)
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  },

  async getAllDrafts() {
    const db = await getDB()
    if (!db) {
      const drafts = getFallbackDrafts()
      return drafts.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFTS_STORE, 'readonly')
      const store = tx.objectStore(DRAFTS_STORE)
      const req = store.getAll()
      req.onsuccess = () => {
        const list = req.result || []
        list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
        resolve(list)
      }
      req.onerror = () => reject(req.error)
    })
  },

  async getDraftsByType(type) {
    const all = await this.getAllDrafts()
    if (!type) return all
    return all.filter((d) => d.type === type)
  },

  async deleteDraft(id) {
    if (!id) return false
    const db = await getDB()
    if (!db) {
      const current = getFallbackDrafts().filter((d) => d.id !== id)
      persistFallbackDrafts(current)
      return true
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFTS_STORE, 'readwrite')
      const store = tx.objectStore(DRAFTS_STORE)
      const req = store.delete(id)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  },

  async clearDrafts() {
    const db = await getDB()
    if (!db) {
      persistFallbackDrafts([])
      return true
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFTS_STORE, 'readwrite')
      const store = tx.objectStore(DRAFTS_STORE)
      const req = store.clear()
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  },
}
