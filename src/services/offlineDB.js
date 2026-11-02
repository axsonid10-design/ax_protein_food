const DB_NAME = 'ax_frozen_foods_db'
const DB_VERSION = 1
const QUEUE_STORE = 'offline_queue'
const CACHE_STORE = 'cache_store'

let dbInstance = null

const getDB = () => {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'key' })
      }
    }

    request.onsuccess = (e) => {
      dbInstance = e.target.result
      resolve(dbInstance)
    }

    request.onerror = (e) => {
      reject(e.target.error)
    }
  })
}

export const offlineDB = {
  async enqueue(table, action, payload) {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite')
      const store = tx.objectStore(QUEUE_STORE)
      const record = {
        table,
        action,
        payload,
        createdAt: new Date().toISOString(),
        retries: 0,
      }
      const req = store.add(record)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  },

  async getQueue() {
    const db = await getDB()
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
}
