export function formatCurrency(amount) {
  const num = Number(amount) || 0
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م`
}

export function formatNumber(val) {
  const num = Number(val) || 0
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function filterByDateRange(items = [], dateField = 'date', timeframe = 'all', customStart = '', customEnd = '') {
  if (!Array.isArray(items)) return []
  if (timeframe === 'all') return items

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  return items.filter((item) => {
    const rawVal = item[dateField]
    if (!rawVal) return false
    const itemDateStr = String(rawVal).split('T')[0]

    if (timeframe === 'today') {
      return itemDateStr === todayStr
    }

    if (timeframe === '7days') {
      const past7 = new Date()
      past7.setDate(now.getDate() - 7)
      const past7Str = past7.toISOString().split('T')[0]
      return itemDateStr >= past7Str && itemDateStr <= todayStr
    }

    if (timeframe === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      return itemDateStr >= startOfMonth && itemDateStr <= todayStr
    }

    if (timeframe === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
      return itemDateStr >= startOfYear && itemDateStr <= todayStr
    }

    if (timeframe === 'specific_day' || timeframe === 'specific') {
      const targetDay = customStart || todayStr
      return itemDateStr === targetDay
    }

    if (timeframe === 'custom') {
      if (customStart && customEnd) {
        return itemDateStr >= customStart && itemDateStr <= customEnd
      }
      if (customStart) {
        return itemDateStr >= customStart
      }
      if (customEnd) {
        return itemDateStr <= customEnd
      }
      return true
    }

    return true
  })
}

export function exportToCsv(filename, headers, rows) {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((field) => {
          const str = String(field ?? '').replace(/"/g, '""')
          return `"${str}"`
        })
        .join(',')
    ),
  ].join('\r\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
