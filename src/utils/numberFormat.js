export function formatNumber(val, optionsOrDecimals = 0) {
  if (val === null || val === undefined || val === '') return '0'
  const num = Number(val)
  if (isNaN(num)) return '0'
  const options = typeof optionsOrDecimals === 'number'
    ? { minimumFractionDigits: 0, maximumFractionDigits: optionsOrDecimals }
    : { minimumFractionDigits: 0, maximumFractionDigits: 2, ...optionsOrDecimals }
  return num.toLocaleString('en-US', options)
}

export function formatCurrency(val, maxDecimals = 0, currency = 'ج.م') {
  if (typeof maxDecimals === 'string') {
    currency = maxDecimals
    maxDecimals = 0
  }
  return `${formatNumber(val, maxDecimals)} ${currency}`
}

export function formatPercent(val, maxDecimals = 0) {
  return `${formatNumber(val, maxDecimals)}%`
}

export function formatDate(dateVal) {
  if (!dateVal) return '—'
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return String(dateVal)
  return d.toISOString().split('T')[0]
}

export function formatTime(timeVal) {
  if (!timeVal) return '—'
  const d = timeVal instanceof Date ? timeVal : new Date(timeVal)
  if (isNaN(d.getTime())) return String(timeVal)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDate,
  formatTime,
}
