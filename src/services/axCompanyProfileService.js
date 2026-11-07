const DEFAULT_COMPANY_PROFILE = {
  name: 'بروتين فود',
  subtitle: 'لتجهيز وحفظ وتوزيع اللحوم المجمدة',
  crNumber: '89452',
  taxNumber: '452-896-123',
  phone: '01000000000',
  address: 'المنطقة الصناعية - مخازن التبريد المركزية',
}

const STORAGE_KEY = 'ax_company_profile'

export function getCompanyProfile() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (raw) return { ...DEFAULT_COMPANY_PROFILE, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULT_COMPANY_PROFILE }
}

export function saveCompanyProfile(updates) {
  const current = getCompanyProfile()
  const next = { ...current, ...updates }
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('ax_company_profile_updated', { detail: next }))
    }
  } catch {}
  return next
}
