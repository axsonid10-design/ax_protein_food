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
      const h = String(cd.getHours()).padStart(2, '0')
      const m = String(cd.getMinutes()).padStart(2, '0')
      badgeLabel = `قيد: ${h}:${m}`
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
