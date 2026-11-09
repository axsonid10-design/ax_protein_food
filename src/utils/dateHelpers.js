export function parseDate(dateVal) {
  if (!dateVal) return null
  const d = new Date(dateVal)
  return isNaN(d.getTime()) ? null : d
}

export function compareDates(dateA, dateB) {
  const da = parseDate(dateA)
  const db = parseDate(dateB)
  if (!da && !db) return 0
  if (!da) return -1
  if (!db) return 1
  return da.getTime() - db.getTime()
}

export function isSameDay(dateA, dateB) {
  return formatDateOnly(dateA) === formatDateOnly(dateB)
}

export function formatDateOnly(dateVal) {
  if (!dateVal) return '—'
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    return dateVal
  }
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) {
    return String(dateVal).split('T')[0] || '—'
  }
  return d.toISOString().split('T')[0]
}

export function toLocalDateString(val) {
  if (!val) return ''
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  const d = val instanceof Date ? val : new Date(val)
  if (isNaN(d.getTime())) return String(val).slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getLocalTodayStr() {
  return toLocalDateString(new Date())
}

export function formatTime12H(timeVal) {
  if (!timeVal) return '—'
  const d = timeVal instanceof Date ? timeVal : new Date(timeVal)
  if (isNaN(d.getTime())) return String(timeVal)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function formatDateTime12H(dateVal) {
  if (!dateVal) return '—'
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal)
  if (isNaN(d.getTime())) return String(dateVal)
  const dateStr = toLocalDateString(d)
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${dateStr} ${timeStr}`
}

export function formatDateTime(dateVal) {
  if (!dateVal) return '—'
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) {
    return String(dateVal)
  }
  const dateStr = d.toISOString().split('T')[0]
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${dateStr} ${hours}:${minutes}`
}

export function formatDualDates(arg1, arg2) {
  let opDate = null
  let created = null

  if (arg1 && typeof arg1 === 'object' && !(arg1 instanceof Date)) {
    opDate = arg1.operationalDate || arg1.transaction_date || arg1.transactionDate || arg1.date || arg1.requestedAt || arg1.auditDate || null
    created = arg1.createdAt || arg1.created_at || arg1.requestedAt || null
  } else {
    opDate = arg1
    created = arg2
  }

  const opDateStr = formatDateOnly(opDate)
  let createdAtStr = '—'
  let badgeLabel = ''

  if (created) {
    createdAtStr = formatDateTime(created)
    const cd = new Date(created)
    if (!isNaN(cd.getTime())) {
      badgeLabel = `قيد: ${formatTime12H(cd)}`
    } else {
      badgeLabel = `قيد: ${String(created).slice(0, 10)}`
    }
  }

  const isDifferentDate = Boolean(created && opDateStr !== formatDateOnly(created))

  return {
    operationalDateStr: opDateStr,
    createdAtStr,
    createdAt: createdAtStr,
    createdAtDateOnly: created ? formatDateOnly(created) : '—',
    badgeLabel,
    operationalDate: opDateStr,
    createdAtFormatted: createdAtStr,
    isDifferentDate,
  }
}

export function isDateBefore(dateA, dateB) {
  if (!dateA || !dateB) return false
  const timeA = new Date(dateA).getTime()
  const timeB = new Date(dateB).getTime()
  if (isNaN(timeA) || isNaN(timeB)) {
    return String(dateA).slice(0, 10) < String(dateB).slice(0, 10)
  }
  return timeA < timeB
}

export function matchesInvoiceTimeframe(inv, timeframeOrOptions = 'all', specificDate = '', customStart = '', customEnd = '') {
  if (!inv) return false
  let timeframe = 'all'
  let specDate = ''
  let cStart = ''
  let cEnd = ''
  if (typeof timeframeOrOptions === 'object' && timeframeOrOptions !== null) {
    timeframe = timeframeOrOptions.timeframe || 'all'
    specDate = timeframeOrOptions.specificDate || ''
    cStart = timeframeOrOptions.customStart || ''
    cEnd = timeframeOrOptions.customEnd || ''
  } else {
    timeframe = timeframeOrOptions || 'all'
    specDate = specificDate || ''
    cStart = customStart || ''
    cEnd = customEnd || ''
  }
  if (timeframe === 'all') return true
  const createdRaw = inv.createdAt || inv.created_at
  const createdDate = createdRaw ? toLocalDateString(createdRaw) : ''
  const opRaw = inv.date || inv.operationalDate || inv.transactionDate
  const opDate = opRaw ? toLocalDateString(opRaw) : ''
  const primaryDate = opDate || createdDate
  if (!primaryDate && !createdDate) return false

  const todayStr = getLocalTodayStr()
  if (timeframe === 'today' || timeframe === 'day') {
    const targetDate = createdDate || primaryDate
    return targetDate === todayStr
  }
  if (timeframe === 'week') {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    const pastWeek = toLocalDateString(d)
    return primaryDate >= pastWeek && primaryDate <= todayStr
  }
  if (timeframe === 'month') {
    const d = new Date()
    const startOfMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    return primaryDate >= startOfMonth && primaryDate <= todayStr
  }
  if (timeframe === 'year') {
    const startOfYear = `${new Date().getFullYear()}-01-01`
    return primaryDate >= startOfYear && primaryDate <= todayStr
  }
  if (timeframe === 'specific_day') {
    return specDate ? primaryDate === specDate : true
  }
  if (timeframe === 'custom') {
    if (cStart && cEnd) {
      if (cStart > cEnd) return false
      return primaryDate >= cStart && primaryDate <= cEnd
    }
    if (cStart) return primaryDate >= cStart
    if (cEnd) return primaryDate <= cEnd
    return true
  }
  return true
}
