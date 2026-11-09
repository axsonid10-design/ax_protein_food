import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  toLocalDateString,
  getLocalTodayStr,
  formatTime12H,
  formatDateTime12H,
  matchesInvoiceTimeframe,
  formatDualDates,
} from '../src/utils/dateHelpers.js'

describe('R1: Invoice Creation Timestamp & 12-Hour Clock Formatting', () => {
  it('formatTime12H formats midday, midnight, morning, and afternoon in 12H clock', () => {
    const midday = new Date(2026, 10, 9, 12, 0, 0)
    assert.equal(formatTime12H(midday), '12:00 PM')

    const midnight = new Date(2026, 10, 9, 0, 0, 0)
    assert.equal(formatTime12H(midnight), '12:00 AM')

    const morning = new Date(2026, 10, 9, 9, 5, 0)
    assert.equal(formatTime12H(morning), '09:05 AM')

    const afternoon = new Date(2026, 10, 9, 14, 35, 0)
    assert.equal(formatTime12H(afternoon), '02:35 PM')
  })

  it('formatTime12H enforces Western numerals (0-9) and en-US AM/PM', () => {
    const times = [
      new Date(2026, 0, 1, 1, 15),
      new Date(2026, 5, 15, 13, 45),
      new Date(2026, 11, 31, 23, 59),
    ]
    for (const t of times) {
      const res = formatTime12H(t)
      assert.match(res, /\d{2}:\d{2}\s(AM|PM)/)
      assert.doesNotMatch(res, /[٠-٩]/)
      assert.doesNotMatch(res, /ص|م/)
    }
  })

  it('formatTime12H handles null, undefined, empty, and invalid dates safely', () => {
    assert.equal(formatTime12H(null), '—')
    assert.equal(formatTime12H(undefined), '—')
    assert.equal(formatTime12H(''), '—')
    assert.equal(formatTime12H('invalid-date'), 'invalid-date')
  })

  it('formatDateTime12H combines local date with 12H time', () => {
    const dt = new Date(2026, 10, 9, 16, 20, 0)
    const res = formatDateTime12H(dt)
    assert.match(res, /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}\s(AM|PM)$/)
    assert.doesNotMatch(res, /[٠-٩]/)
    assert.equal(formatDateTime12H(null), '—')
    assert.equal(formatDateTime12H('bad'), 'bad')
  })

  it('formatDualDates badgeLabel formats creation time using 12H clock', () => {
    const res = formatDualDates({
      operationalDate: '2026-11-09',
      createdAt: '2026-11-09T14:30:00.000Z',
    })
    assert.ok(res.badgeLabel.startsWith('قيد:'))
    assert.match(res.badgeLabel, /قيد:\s\d{2}:\d{2}\s(AM|PM)/)
    assert.doesNotMatch(res.badgeLabel, /[٠-٩]/)
  })
})

describe('R2: Invoice Date Range & Strict "Today" Calendar Day Filtering', () => {
  it('getLocalTodayStr returns local system date in YYYY-MM-DD format', () => {
    const today = getLocalTodayStr()
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/)
    const d = new Date()
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    assert.equal(today, expected)
  })

  it('toLocalDateString prevents UTC shift for local calendar dates', () => {
    assert.equal(toLocalDateString('2026-11-09'), '2026-11-09')
    assert.equal(toLocalDateString(''), '')
    assert.equal(toLocalDateString(null), '')
  })

  it('matchesInvoiceTimeframe strictly matches today records for "today" and "day" options', () => {
    const todayStr = getLocalTodayStr()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = toLocalDateString(yesterday)

    const todayInvoice = {
      id: 'inv-today',
      code: 'INV-T01',
      date: todayStr,
      createdAt: new Date().toISOString(),
    }
    const yesterdayInvoice = {
      id: 'inv-yesterday',
      code: 'INV-Y01',
      date: yesterdayStr,
      createdAt: yesterday.toISOString(),
    }

    assert.equal(matchesInvoiceTimeframe(todayInvoice, { timeframe: 'today' }), true)
    assert.equal(matchesInvoiceTimeframe(todayInvoice, { timeframe: 'day' }), true)
    assert.equal(matchesInvoiceTimeframe(yesterdayInvoice, { timeframe: 'today' }), false)
    assert.equal(matchesInvoiceTimeframe(yesterdayInvoice, { timeframe: 'day' }), false)
  })

  it('matchesInvoiceTimeframe handles early morning local invoices without UTC shift', () => {
    const todayStr = getLocalTodayStr()
    const parts = todayStr.split('-').map(Number)
    const earlyMorningLocal = new Date(parts[0], parts[1] - 1, parts[2], 1, 15, 0)

    const earlyMorningInvoice = {
      id: 'inv-early',
      code: 'INV-EARLY-01',
      date: todayStr,
      createdAt: earlyMorningLocal.toISOString(),
    }

    assert.equal(matchesInvoiceTimeframe(earlyMorningInvoice, { timeframe: 'today' }), true)
  })

  it('matchesInvoiceTimeframe supports mock/legacy invoices with only date property', () => {
    const todayStr = getLocalTodayStr()
    const mockInvoice = {
      id: 'mock-1',
      date: todayStr,
    }
    assert.equal(matchesInvoiceTimeframe(mockInvoice, { timeframe: 'today' }), true)
    assert.equal(matchesInvoiceTimeframe({ id: 'mock-2', date: '2025-01-01' }, { timeframe: 'today' }), false)
  })

  it('matchesInvoiceTimeframe handles week, month, and year timeframes correctly', () => {
    const todayStr = getLocalTodayStr()
    const now = new Date()
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)

    const recentInv = { id: 'r1', date: toLocalDateString(fiveDaysAgo) }
    const olderInv = { id: 'r2', date: toLocalDateString(tenDaysAgo) }

    assert.equal(matchesInvoiceTimeframe(recentInv, { timeframe: 'week' }), true)
    assert.equal(matchesInvoiceTimeframe(olderInv, { timeframe: 'week' }), false)

    const thisMonthInv = { id: 'm1', date: todayStr }
    assert.equal(matchesInvoiceTimeframe(thisMonthInv, { timeframe: 'month' }), true)
    assert.equal(matchesInvoiceTimeframe(thisMonthInv, { timeframe: 'year' }), true)
  })

  it('matchesInvoiceTimeframe custom range is inclusive and rejects inverted range', () => {
    const inv1 = { id: 'c1', date: '2026-11-04' }
    const inv2 = { id: 'c2', date: '2026-11-08' }
    const inv3 = { id: 'c3', date: '2026-11-12' }

    const range = { timeframe: 'custom', customStart: '2026-11-04', customEnd: '2026-11-08' }
    assert.equal(matchesInvoiceTimeframe(inv1, range), true)
    assert.equal(matchesInvoiceTimeframe(inv2, range), true)
    assert.equal(matchesInvoiceTimeframe(inv3, range), false)

    const singleDayRange = { timeframe: 'custom', customStart: '2026-11-08', customEnd: '2026-11-08' }
    assert.equal(matchesInvoiceTimeframe(inv1, singleDayRange), false)
    assert.equal(matchesInvoiceTimeframe(inv2, singleDayRange), true)

    const invertedRange = { timeframe: 'custom', customStart: '2026-11-10', customEnd: '2026-11-01' }
    assert.equal(matchesInvoiceTimeframe(inv1, invertedRange), false)
    assert.equal(matchesInvoiceTimeframe(inv2, invertedRange), false)
    assert.equal(matchesInvoiceTimeframe(inv3, invertedRange), false)

    const openStart = { timeframe: 'custom', customStart: '2026-11-07', customEnd: '' }
    assert.equal(matchesInvoiceTimeframe(inv1, openStart), false)
    assert.equal(matchesInvoiceTimeframe(inv2, openStart), true)
    assert.equal(matchesInvoiceTimeframe(inv3, openStart), true)

    const openEnd = { timeframe: 'custom', customStart: '', customEnd: '2026-11-05' }
    assert.equal(matchesInvoiceTimeframe(inv1, openEnd), true)
    assert.equal(matchesInvoiceTimeframe(inv2, openEnd), false)

    const emptyCustom = { timeframe: 'custom', customStart: '', customEnd: '' }
    assert.equal(matchesInvoiceTimeframe(inv1, emptyCustom), true)
  })

  it('matchesInvoiceTimeframe accepts both object and positional parameter signatures', () => {
    const todayStr = getLocalTodayStr()
    const inv = { id: 'pos-1', date: todayStr }
    assert.equal(matchesInvoiceTimeframe(inv, 'today'), true)
    assert.equal(matchesInvoiceTimeframe(inv, 'custom', '', todayStr, todayStr), true)
    assert.equal(matchesInvoiceTimeframe(null, 'today'), false)
  })
})

describe('Code Layout, File Invariants & Structural Verification', () => {
  const root = process.cwd()
  const modifiedFiles = [
    'src/utils/dateHelpers.js',
    'src/components/sales/AX_SalesManager.jsx',
    'src/components/purchases/AX_PurchasesManager.jsx',
    'src/components/invoices/AX_InvoicesManager.jsx',
    'src/components/invoices/AX_InvoiceDetailsModal.jsx',
    'src/components/invoices/AX_EditInvoiceModal.jsx',
    'src/components/invoices/AX_InvoicePrintModal.jsx',
    'src/components/invoices/AX_CreateInvoiceModal.jsx',
  ]

  for (const rel of modifiedFiles) {
    it(`file ${rel} must not exceed 500 lines`, () => {
      const full = path.resolve(root, rel)
      const content = fs.readFileSync(full, 'utf8')
      const lines = content.split('\n').length
      assert.ok(lines <= 500, `${rel} has ${lines} lines, exceeding the 500 lines hard limit!`)
    })

    it(`file ${rel} must contain zero code comments`, () => {
      const full = path.resolve(root, rel)
      const lines = fs.readFileSync(full, 'utf8').split('\n')
      lines.forEach((line, idx) => {
        const trimmed = line.trim()
        const isComment =
          trimmed.startsWith('//') ||
          trimmed.startsWith('/*') ||
          (trimmed.includes('//') && !trimmed.includes('://'))
        assert.equal(
          isComment,
          false,
          `Found prohibited comment in ${rel}:${idx + 1}: ${trimmed}`
        )
      })
    })

    it(`file ${rel} must not contain bare toLocaleString or ar-EG`, () => {
      const full = path.resolve(root, rel)
      const content = fs.readFileSync(full, 'utf8')
      assert.doesNotMatch(content, /toLocaleString\((?!.*en-US)/)
      assert.doesNotMatch(content, /ar-EG/)
    })
  }

  it('AX_SalesManager and AX_PurchasesManager display 12H timestamp alongside invoice code', () => {
    const salesSrc = fs.readFileSync(path.resolve(root, 'src/components/sales/AX_SalesManager.jsx'), 'utf8')
    assert.ok(salesSrc.includes('formatTime12H'), 'AX_SalesManager must import and use formatTime12H')
    assert.ok(salesSrc.includes('matchesInvoiceTimeframe'), 'AX_SalesManager must use matchesInvoiceTimeframe')

    const purchasesSrc = fs.readFileSync(path.resolve(root, 'src/components/purchases/AX_PurchasesManager.jsx'), 'utf8')
    assert.ok(purchasesSrc.includes('formatTime12H'), 'AX_PurchasesManager must import and use formatTime12H')
    assert.ok(purchasesSrc.includes('matchesInvoiceTimeframe'), 'AX_PurchasesManager must use matchesInvoiceTimeframe')
  })

  it('AX_InvoicesManager preserves required test invariant strings and integrates 12H timestamp', () => {
    const invSrc = fs.readFileSync(path.resolve(root, 'src/components/invoices/AX_InvoicesManager.jsx'), 'utf8')
    assert.ok(invSrc.includes('formatTime12H'), 'AX_InvoicesManager must use formatTime12H')
    assert.ok(invSrc.includes('قيد:'), 'AX_InvoicesManager must retain "قيد:" badge')
    assert.ok(invSrc.includes('operationalDate'), 'AX_InvoicesManager must retain operationalDate')
  })

  it('AX_InvoiceDetailsModal displays 12H timestamp in header and formats registration date', () => {
    const detailsSrc = fs.readFileSync(path.resolve(root, 'src/components/invoices/AX_InvoiceDetailsModal.jsx'), 'utf8')
    assert.ok(detailsSrc.includes('formatTime12H'), 'AX_InvoiceDetailsModal must use formatTime12H')
    assert.ok(detailsSrc.includes('formatDateTime12H'), 'AX_InvoiceDetailsModal must use formatDateTime12H')
    assert.ok(detailsSrc.includes('تاريخ الفاتورة:'), 'AX_InvoiceDetailsModal must retain "تاريخ الفاتورة:"')
    assert.ok(detailsSrc.includes('تاريخ القيد:'), 'AX_InvoiceDetailsModal must retain "تاريخ القيد:"')
  })

  it('AX_CreateInvoiceModal initializes date using getLocalTodayStr to prevent UTC drift', () => {
    const createSrc = fs.readFileSync(path.resolve(root, 'src/components/invoices/AX_CreateInvoiceModal.jsx'), 'utf8')
    assert.ok(createSrc.includes('getLocalTodayStr()'), 'AX_CreateInvoiceModal must use getLocalTodayStr()')
    assert.doesNotMatch(createSrc, /date:\s*new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/)
  })
})
