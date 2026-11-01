import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDate,
  formatTime,
} from '../src/utils/numberFormat.js'

describe('Number Formatting & Western Numerals Unification', () => {
  it('formatNumber should format numbers using Western Arabic numerals with comma separators', () => {
    assert.strictEqual(formatNumber(1250000), '1,250,000')
    assert.strictEqual(formatNumber(0), '0')
    assert.strictEqual(formatNumber(null), '0')
    assert.strictEqual(formatNumber('invalid'), '0')
    assert.strictEqual(formatNumber(45.678, { maximumFractionDigits: 2 }), '45.68')
    assert.strictEqual(formatNumber(45.678, 2), '45.68')
  })

  it('formatCurrency should append currency unit and format numbers with Western numerals', () => {
    assert.strictEqual(formatCurrency(54000), '54,000 ج.م')
    assert.strictEqual(formatCurrency(0), '0 ج.م')
    assert.strictEqual(formatCurrency(1250.5, 1, 'دولار'), '1,250.5 دولار')
  })

  it('formatPercent should format numbers as percentage', () => {
    assert.strictEqual(formatPercent(75.5, 1), '75.5%')
    assert.strictEqual(formatPercent(100), '100%')
  })

  it('formatDate should format dates with Western numerals in ISO format', () => {
    const d = new Date('2026-11-01T12:00:00Z')
    const formatted = formatDate(d)
    assert.match(formatted, /^\d{4}-\d{2}-\d{2}$/)
    assert.strictEqual(formatted, '2026-11-01')
  })

  it('formatTime should format times with Western numerals', () => {
    const d = new Date(2026, 10, 1, 14, 30, 0)
    const formatted = formatTime(d)
    assert.match(formatted, /\d{1,2}:\d{2}/)
    assert.doesNotMatch(formatted, /[٠-٩]/)
  })

  it('should enforce zero occurrences of bare toLocaleString or ar-EG in src', () => {
    const srcDir = path.resolve(process.cwd(), 'src')
    function scanDir(dir) {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        const fullPath = path.join(dir, file)
        if (fs.statSync(fullPath).isDirectory()) {
          scanDir(fullPath)
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
          const content = fs.readFileSync(fullPath, 'utf8')
          assert.doesNotMatch(
            content,
            /toLocaleString\((?!.*en-US)/,
            `File ${fullPath} contains bare or non-en-US toLocaleString`
          )
          assert.doesNotMatch(
            content,
            /ar-EG/,
            `File ${fullPath} contains ar-EG locale`
          )
        }
      }
    }
    scanDir(srcDir)
  })
})
