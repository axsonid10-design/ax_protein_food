import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { useAXStore } from '../src/store/useAXStore.js'
import { AX_OperationsService } from '../src/services/AX_OperationsService.js'

function getFiles(dir, exts = ['.jsx', '.js'], fileList = []) {
  if (!fs.existsSync(dir)) return fileList
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      getFiles(fullPath, exts, fileList)
    } else if (exts.some((ext) => file.endsWith(ext))) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

describe('Milestone 1: Header & Navigation Cleanliness (R5)', () => {
  it('should verify 0 occurrences of prohibited phrase "تحديث لحظي" in all src files', () => {
    const srcDir = path.resolve(process.cwd(), 'src')
    const files = getFiles(srcDir)
    const matches = []

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8')
      if (content.includes('تحديث لحظي')) {
        matches.push(path.relative(process.cwd(), filePath))
      }
    }

    assert.strictEqual(
      matches.length,
      0,
      `Found prohibited phrase "تحديث لحظي" in: ${matches.join(', ')}`
    )
  })

  it('should verify AX_Header.jsx contains no scanning badge or indicator', () => {
    const headerPath = path.resolve(process.cwd(), 'src/components/navigation/AX_Header.jsx')
    const content = fs.readFileSync(headerPath, 'utf-8')
    assert.strictEqual(content.toLowerCase().includes('scanning'), false)
    assert.strictEqual(content.includes('1 scanning'), false)
  })
})

describe('Milestone 2: Treasury Deletion Persistence (R4)', () => {
  beforeEach(() => {
    if (typeof globalThis.localStorage === 'undefined') {
      const store = new Map()
      globalThis.localStorage = {
        getItem: (k) => store.get(k) || null,
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
      }
    }
  })

  it('should verify AX_OperationsService source includes defensive foreign key nullification', () => {
    const servicePath = path.resolve(process.cwd(), 'src/services/AX_OperationsService.js')
    const content = fs.readFileSync(servicePath, 'utf-8')
    assert.ok(content.includes('ax_cash_transactions'))
    assert.ok(content.includes('ax_cash_transfers'))
    assert.ok(content.includes('treasury_id: null'))
    assert.ok(content.includes('from_treasury_id: null'))
    assert.ok(content.includes('to_treasury_id: null'))
  })

  it('should persist treasury deletion across in-memory state and localStorage cached payload', () => {
    const testTreasuries = [
      { id: 'tr-persist-1', name: 'خزينة رئيسية تجريبية', balance: 5000, type: 'cash' },
      { id: 'tr-persist-2', name: 'خزينة فرعية تجريبية', balance: 2000, type: 'bank' },
    ]
    const testCashTx = [
      { id: 'tx-1', treasuryId: 'tr-persist-1', amount: 1000, notes: 'قبض' },
      { id: 'tx-2', treasuryId: 'tr-persist-2', amount: 500, notes: 'صرف' },
    ]

    useAXStore.setState({
      treasuryAccounts: testTreasuries,
      cashTransactions: testCashTx,
    })

    useAXStore.getState().deleteTreasuryAccount('tr-persist-1')

    const stateAfter = useAXStore.getState()
    const remainingIds = stateAfter.treasuryAccounts.map((t) => t.id)
    assert.strictEqual(remainingIds.includes('tr-persist-1'), false)
    assert.strictEqual(remainingIds.includes('tr-persist-2'), true)

    const updatedTx = stateAfter.cashTransactions.find((tx) => tx.id === 'tx-1')
    assert.strictEqual(updatedTx.isDeletedAccount, true)

    const rawPayload = globalThis.localStorage.getItem('ax_cached_db_payload')
    assert.ok(rawPayload)
    const cachedPayload = JSON.parse(rawPayload)
    const cachedIds = (cachedPayload.treasuryAccounts || []).map((t) => t.id)
    assert.strictEqual(cachedIds.includes('tr-persist-1'), false)

    const rawDeleted = globalThis.localStorage.getItem('ax_deleted_treasuries')
    assert.ok(rawDeleted)
    const deletedList = JSON.parse(rawDeleted)
    assert.ok(deletedList.includes('tr-persist-1'))
  })
})
