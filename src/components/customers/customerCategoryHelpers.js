import { DEFAULT_CATEGORIES } from './customerConstants.js'

const CATEGORIES_STORAGE_KEY = 'ax_customer_categories'

export const getInitialCategories = () => {
  return Object.keys(DEFAULT_CATEGORIES)
}

export const loadCustomerCategories = () => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(CATEGORIES_STORAGE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {}
  return getInitialCategories()
}

export const saveCustomerCategories = (categories) => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories))
      window.dispatchEvent(
        new CustomEvent('ax_customer_categories_updated', { detail: categories })
      )
    }
  } catch {}
}

export const addCustomerCategory = (categoryName) => {
  const trimmed = (categoryName || '').trim()
  if (!trimmed) return loadCustomerCategories()
  const current = loadCustomerCategories()
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed]
    saveCustomerCategories(updated)
    return updated
  }
  return current
}

export const editCustomerCategory = (oldName, newName, onClientsUpdated = null) => {
  const cleanOld = (oldName || '').trim()
  const cleanNew = (newName || '').trim()
  if (!cleanOld || !cleanNew || cleanOld === cleanNew) {
    return loadCustomerCategories()
  }
  const current = loadCustomerCategories()
  const updated = current.map((cat) => (cat === cleanOld ? cleanNew : cat))
  saveCustomerCategories(updated)
  if (typeof onClientsUpdated === 'function') {
    onClientsUpdated(cleanOld, cleanNew)
  }
  return updated
}

export const deleteCustomerCategory = (categoryName) => {
  const clean = (categoryName || '').trim()
  const current = loadCustomerCategories()
  const updated = current.filter((cat) => cat !== clean)
  saveCustomerCategories(updated)
  return updated
}
