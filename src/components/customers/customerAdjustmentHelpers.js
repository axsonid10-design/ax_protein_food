import { generateUUID } from '../../utils/AX_UUID.js'

const ADJUSTMENTS_STORAGE_KEY = 'ax_customer_balance_adjustments'

export const loadAllCustomerAdjustments = () => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(ADJUSTMENTS_STORAGE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch {}
  return []
}

export const getCustomerAdjustments = (customerId) => {
  if (!customerId) return []
  const all = loadAllCustomerAdjustments()
  return all
    .filter((adj) => adj && (adj.customerId === customerId || adj.partyId === customerId))
    .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt))
}

export const createCustomerBalanceAdjustment = ({
  customer,
  previousBalance,
  newBalance,
  notes = '',
  user = null,
}) => {
  if (!customer?.id) return null
  const prev = Number(previousBalance) || 0
  const next = Number(newBalance) || 0
  const delta = next - prev
  if (Math.abs(delta) < 0.0001) return null

  const id = `adj-${Date.now()}-${generateUUID().slice(0, 8)}`
  const now = new Date().toISOString()

  return {
    id,
    date: now,
    createdAt: now,
    type: 'balance_adjustment',
    customerId: customer.id,
    customerName: customer.name || '',
    previousBalance: prev,
    newBalance: next,
    delta,
    amount: Math.abs(delta),
    description: `تسوية رصيد / جرد رصيد (${delta > 0 ? 'زيادة مديونية' : 'تخفيض مديونية'})`,
    notes: (notes || '').trim() || 'تسوية رصيد حساب العميل المعتمدة',
    treasuryId: null,
    isTreasuryDistorting: false,
    createdBy: user?.name || user?.email || 'مدير المنظومة',
  }
}

export const saveCustomerAdjustment = (adjustment) => {
  if (!adjustment || !adjustment.id) return
  try {
    const all = loadAllCustomerAdjustments()
    const updated = [...all, adjustment]
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ADJUSTMENTS_STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(
        new CustomEvent('ax_customer_adjustments_updated', { detail: adjustment })
      )
    }
  } catch {}
}

export const clearCustomerAdjustments = (customerId = null) => {
  try {
    if (typeof window !== 'undefined') {
      if (!customerId) {
        window.localStorage.removeItem(ADJUSTMENTS_STORAGE_KEY)
      } else {
        const all = loadAllCustomerAdjustments()
        const filtered = all.filter((adj) => adj.customerId !== customerId && adj.partyId !== customerId)
        window.localStorage.setItem(ADJUSTMENTS_STORAGE_KEY, JSON.stringify(filtered))
      }
    }
  } catch {}
}
