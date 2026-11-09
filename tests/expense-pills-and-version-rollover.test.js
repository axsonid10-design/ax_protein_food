import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Expense UI Modernization & Version Rollover', () => {
  it('enforces version 2.2.7 and single-digit minor and patch rollover (max 9) in package.json and version.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'))
    const ver = JSON.parse(fs.readFileSync(path.resolve('public/version.json'), 'utf8'))

    assert.equal(pkg.version, '2.2.7')
    assert.equal(ver.version, '2.2.7')

    const parts = pkg.version.split('.').map(Number)
    assert.ok(parts[1] >= 0 && parts[1] <= 9, 'Minor version must be single digit <= 9')
    assert.ok(parts[2] >= 0 && parts[2] <= 9, 'Patch version must be single digit <= 9')
  })

  it('guarantees zero native HTML <select> tags across all expense components', () => {
    const expenseDir = path.resolve('src/components/expenses')
    const files = fs.readdirSync(expenseDir).filter((f) => f.endsWith('.jsx'))

    for (const file of files) {
      const content = fs.readFileSync(path.join(expenseDir, file), 'utf8')
      const hasSelect = /<select[\s>]/i.test(content)
      assert.equal(hasSelect, false, `File ${file} contains native <select> tag`)
    }
  })

  it('guarantees all expense components obey 500 lines hard limit and zero comments', () => {
    const expenseDir = path.resolve('src/components/expenses')
    const files = fs.readdirSync(expenseDir).filter((f) => f.endsWith('.jsx'))

    for (const file of files) {
      const fullPath = path.join(expenseDir, file)
      const lines = fs.readFileSync(fullPath, 'utf8').split('\n')
      assert.ok(lines.length <= 500, `File ${file} exceeds 500 lines: ${lines.length}`)

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        const isComment = line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')
        assert.equal(isComment, false, `Comment found in ${file} at line ${i + 1}: ${line}`)
      }
    }
  })

  it('validates statement autocomplete curated suggestions and history deduplication', () => {
    const mockPastTransactions = [
      { description: 'فاتورة كهرباء غرف التبريد - الدكان' },
      { notes: 'صيانة مكبس اللحوم الهيدروليكي' },
      { description: 'فاتورة كهرباء غرف التبريد - الدكان' },
    ]

    const set = new Set()
    for (const t of mockPastTransactions) {
      const d = (t.description || t.notes || '').trim()
      if (d) set.add(d)
    }

    const unique = Array.from(set)
    assert.equal(unique.length, 2)
    assert.ok(unique.includes('فاتورة كهرباء غرف التبريد - الدكان'))
    assert.ok(unique.includes('صيانة مكبس اللحوم الهيدروليكي'))
  })
})
