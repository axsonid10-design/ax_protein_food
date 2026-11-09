import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  recalculateItemStock,
  calculateItemMovements,
} from '../src/components/warehouses/itemMovementHelpers.js'
import {
  saveItemOpeningBalanceState,
} from '../src/store/storeCacheHelper.js'

describe('R5-M4 Adversarial Calculation Stress Challenge', () => {
  describe('Stress Test 1: Extreme & Boundary Values', () => {
    it('handles exact zero opening balance both as number and string', () => {
      const state = {
        inventoryStock: [{ itemId: 'item-beef', warehouseId: 'wh-main', openingBalance: 500, quantity: 500 }],
        items: [{ id: 'item-beef', unitType: 'كرتونة' }],
        invoices: [],
        transfers: [],
        stockAudits: [],
        warehouses: [{ id: 'wh-main' }],
      }
      const rNum = saveItemOpeningBalanceState(state, { itemId: 'item-beef', warehouseId: 'wh-main', quantity: 0, date: '2026-11-01' })
      assert.strictEqual(rNum.newStock, 0)
      assert.strictEqual(rNum.finalStockRow.openingBalance, 0)
      assert.strictEqual(rNum.finalStockRow.quantity, 0)
      const rStr = saveItemOpeningBalanceState(state, { itemId: 'item-beef', warehouseId: 'wh-main', quantity: '0', date: '2026-11-01' })
      assert.strictEqual(rStr.newStock, 0)
      assert.strictEqual(rStr.finalStockRow.openingBalance, 0)
      assert.strictEqual(rStr.finalStockRow.quantity, 0)
    })

    it('handles fractional micro-quantities without calculation skew or precision loss', () => {
      const state = {
        inventoryStock: [{ itemId: 'item-beef', warehouseId: 'wh-main', openingBalance: 0, quantity: 0 }],
        items: [{ id: 'item-beef', unitType: 'كرتونة' }],
        invoices: [],
        transfers: [],
        stockAudits: [],
        warehouses: [{ id: 'wh-main' }],
      }
      for (const frac of [0.001, 0.0001, 0.125, 0.3333, '0.005']) {
        const expected = Number(frac)
        const res = saveItemOpeningBalanceState(state, { itemId: 'item-beef', warehouseId: 'wh-main', quantity: frac, date: '2026-11-01' })
        assert.strictEqual(res.newStock, expected)
        assert.strictEqual(res.finalStockRow.openingBalance, expected)
      }
    })

    it('handles astronomical quantities without overflow or numerical distortion', () => {
      const state = {
        inventoryStock: [],
        items: [{ id: 'item-beef', unitType: 'كرتونة' }],
        invoices: [],
        transfers: [],
        stockAudits: [],
        warehouses: [{ id: 'wh-main' }],
      }
      for (const num of [1000000, 10000000, '5000000.5']) {
        const expected = Number(num)
        const res = saveItemOpeningBalanceState(state, { itemId: 'item-beef', warehouseId: 'wh-main', quantity: num, date: '2026-11-01' })
        assert.strictEqual(res.newStock, expected)
        assert.strictEqual(res.finalStockRow.openingBalance, expected)
        assert.strictEqual(res.finalStockRow.quantity, expected)
      }
    })

    it('handles negative opening balances cleanly without NaN or corrupt state', () => {
      const state = {
        inventoryStock: [{ itemId: 'item-beef', warehouseId: 'wh-main', openingBalance: 10, quantity: 10 }],
        items: [{ id: 'item-beef', unitType: 'كرتونة' }],
        invoices: [{ id: 'p1', warehouseId: 'wh-main', date: '2026-11-02', type: 'purchase', items: [{ itemId: 'item-beef', quantity: 30, unit: 'كرتونة' }] }],
        transfers: [],
        stockAudits: [],
        warehouses: [{ id: 'wh-main' }],
      }
      const res = saveItemOpeningBalanceState(state, { itemId: 'item-beef', warehouseId: 'wh-main', quantity: -50, date: '2026-11-01' })
      assert.strictEqual(res.finalStockRow.openingBalance, -50)
      assert.strictEqual(res.newStock, -20)
      assert.strictEqual(res.finalStockRow.quantity, -20)
    })

    it('sanitizes invalid corrupted inputs to default zero', () => {
      const state = {
        inventoryStock: [],
        items: [{ id: 'item-beef', unitType: 'كرتونة' }],
        invoices: [],
        transfers: [],
        stockAudits: [],
        warehouses: [{ id: 'wh-main' }],
      }
      for (const val of ['', '   ', null, undefined, 'abc', NaN, '$$$']) {
        const res = saveItemOpeningBalanceState(state, { itemId: 'item-beef', warehouseId: 'wh-main', quantity: val, date: '2026-11-01' })
        assert.strictEqual(res.newStock, 0)
        assert.strictEqual(res.finalStockRow.openingBalance, 0)
      }
    })
  })

  describe('Stress Test 2: High Concurrency & Interleaved Transactions', () => {
    it('accurately computes stock across 200 interleaved purchases, sales, returns and transfers', () => {
      const openingBalance = 1000
      const openingDate = '2026-11-01'
      const purchases = []
      const sales = []
      const transfers = []
      let expectedNet = openingBalance

      for (let i = 1; i <= 50; i++) {
        const pQty = 10 + (i % 5)
        purchases.push({ id: `p-${i}`, warehouseId: 'wh-stress', date: `2026-11-02T10:${String(i % 60).padStart(2, '0')}:00Z`, type: 'purchase', items: [{ itemId: 'item-burger', quantity: pQty, unit: 'كرتونة' }] })
        expectedNet += pQty

        const prQty = 2
        purchases.push({ id: `pr-${i}`, warehouseId: 'wh-stress', date: `2026-11-02T11:${String(i % 60).padStart(2, '0')}:00Z`, type: 'purchase_return', items: [{ itemId: 'item-burger', quantity: prQty, unit: 'كرتونة' }] })
        expectedNet -= prQty

        const sQty = 5 + (i % 3)
        sales.push({ id: `s-${i}`, warehouseId: 'wh-stress', date: `2026-11-03T14:${String(i % 60).padStart(2, '0')}:00Z`, type: 'sale', items: [{ itemId: 'item-burger', quantity: sQty, unit: 'كرتونة' }] })
        expectedNet -= sQty

        const srQty = 1
        sales.push({ id: `sr-${i}`, warehouseId: 'wh-stress', date: `2026-11-03T15:${String(i % 60).padStart(2, '0')}:00Z`, type: 'sale_return', items: [{ itemId: 'item-burger', quantity: srQty, unit: 'كرتونة' }] })
        expectedNet += srQty

        const tinQty = 4
        transfers.push({ id: `trf-in-${i}`, fromId: 'wh-other', toId: 'wh-stress', date: `2026-11-04T09:${String(i % 60).padStart(2, '0')}:00Z`, status: 'confirmed', items: [{ itemId: 'item-burger', quantity: tinQty, unit: 'كرتونة' }] })
        expectedNet += tinQty

        const toutQty = 3
        transfers.push({ id: `trf-out-${i}`, fromId: 'wh-stress', toId: 'wh-other', date: `2026-11-04T10:${String(i % 60).padStart(2, '0')}:00Z`, status: 'confirmed', items: [{ itemId: 'item-burger', quantity: toutQty, unit: 'كرتونة' }] })
        expectedNet -= toutQty

        transfers.push({ id: `trf-pend-${i}`, fromId: 'wh-stress', toId: 'wh-other', date: '2026-11-04T12:00:00Z', status: 'pending', items: [{ itemId: 'item-burger', quantity: 999, unit: 'كرتونة' }] })
        purchases.push({ id: `p-canc-${i}`, warehouseId: 'wh-stress', date: '2026-11-04T13:00:00Z', type: 'purchase', status: 'cancelled', items: [{ itemId: 'item-burger', quantity: 999, unit: 'كرتونة' }] })
      }

      const calculated = recalculateItemStock({
        itemId: 'item-burger',
        warehouseId: 'wh-stress',
        inventoryStock: [{ itemId: 'item-burger', warehouseId: 'wh-stress', openingBalance, openingDate }],
        purchases,
        sales,
        transfers,
        stockAudits: [],
        warehouses: [{ id: 'wh-stress' }, { id: 'wh-other' }],
      })
      assert.strictEqual(calculated, expectedNet)
    })

    it('filters transactions strictly before opening balance date while retaining same-day operations', () => {
      const openingDate = '2026-11-05'
      const purchases = [
        { id: 'p-prior', warehouseId: 'wh-1', date: '2026-11-04', type: 'purchase', items: [{ itemId: 'item-x', quantity: 50, unit: 'كرتونة' }] },
        { id: 'p-same-day', warehouseId: 'wh-1', date: '2026-11-05', type: 'purchase', items: [{ itemId: 'item-x', quantity: 20, unit: 'كرتونة' }] },
        { id: 'p-after', warehouseId: 'wh-1', date: '2026-11-06', type: 'purchase', items: [{ itemId: 'item-x', quantity: 30, unit: 'كرتونة' }] },
      ]
      const stock = recalculateItemStock({
        itemId: 'item-x',
        warehouseId: 'wh-1',
        inventoryStock: [{ itemId: 'item-x', warehouseId: 'wh-1', openingBalance: 100, openingDate }],
        purchases,
        sales: [],
        transfers: [],
        stockAudits: [],
        warehouses: [{ id: 'wh-1' }],
      })
      assert.strictEqual(stock, 100 + 20 + 30)
    })
  })

  describe('Stress Test 3: Audit Anchor Boundaries', () => {
    it('strictly preserves audit anchor when opening stock balance is modified', () => {
      const stockAudits = [
        { id: 'aud-alpha', warehouseId: 'wh-audit', auditDate: '2026-11-10', status: 'approved', items: [{ itemId: 'item-sausage', actualQty: 400 }] },
      ]
      const purchases = [
        { id: 'p-pre', warehouseId: 'wh-audit', date: '2026-11-05', type: 'purchase', items: [{ itemId: 'item-sausage', quantity: 150, unit: 'كرتونة' }] },
        { id: 'p-post', warehouseId: 'wh-audit', date: '2026-11-12', type: 'purchase', items: [{ itemId: 'item-sausage', quantity: 50, unit: 'كرتونة' }] },
      ]
      const sales = [
        { id: 's-pre', warehouseId: 'wh-audit', date: '2026-11-06', type: 'sale', items: [{ itemId: 'item-sausage', quantity: 70, unit: 'كرتونة' }] },
        { id: 's-post', warehouseId: 'wh-audit', date: '2026-11-13', type: 'sale', items: [{ itemId: 'item-sausage', quantity: 30, unit: 'كرتونة' }] },
      ]
      const expectedAfterAudit = 400 + 50 - 30

      const runWithOpening = (opening) =>
        recalculateItemStock({
          itemId: 'item-sausage',
          warehouseId: 'wh-audit',
          inventoryStock: [{ itemId: 'item-sausage', warehouseId: 'wh-audit', openingBalance: opening, openingDate: '2026-11-01' }],
          purchases,
          sales,
          transfers: [],
          stockAudits,
          warehouses: [{ id: 'wh-audit' }],
        })

      assert.strictEqual(runWithOpening(100), expectedAfterAudit)
      assert.strictEqual(runWithOpening(0), expectedAfterAudit)
      assert.strictEqual(runWithOpening(999999), expectedAfterAudit)
      assert.strictEqual(runWithOpening(-500), expectedAfterAudit)
    })

    it('falls back to modified opening balance when audits are cancelled', () => {
      const stockAudits = [
        { id: 'aud-cancelled', warehouseId: 'wh-audit', auditDate: '2026-11-10', status: 'cancelled', items: [{ itemId: 'item-sausage', actualQty: 400 }] },
      ]
      const purchases = [
        { id: 'p-1', warehouseId: 'wh-audit', date: '2026-11-05', type: 'purchase', items: [{ itemId: 'item-sausage', quantity: 50, unit: 'كرتونة' }] },
      ]
      const stock = recalculateItemStock({
        itemId: 'item-sausage',
        warehouseId: 'wh-audit',
        inventoryStock: [{ itemId: 'item-sausage', warehouseId: 'wh-audit', openingBalance: 250, openingDate: '2026-11-01' }],
        purchases,
        sales: [],
        transfers: [],
        stockAudits,
        warehouses: [{ id: 'wh-audit' }],
      })
      assert.strictEqual(stock, 250 + 50)
    })
  })

  describe('Stress Test 4: Multi-Warehouse Isolation', () => {
    it('modifying warehouse A opening balance does not mutate warehouse B, C, or D stocks', () => {
      const state = {
        inventoryStock: [
          { itemId: 'item-nuggets', warehouseId: 'wh-a', openingBalance: 100, quantity: 100 },
          { itemId: 'item-nuggets', warehouseId: 'wh-b', openingBalance: 200, quantity: 200 },
          { itemId: 'item-nuggets', warehouseId: 'wh-c', openingBalance: 300, quantity: 300 },
          { itemId: 'item-nuggets', warehouseId: 'wh-d', openingBalance: 400, quantity: 400 },
        ],
        items: [{ id: 'item-nuggets', unitType: 'كرتونة' }],
        invoices: [
          { id: 'inv-a', warehouseId: 'wh-a', date: '2026-11-02', type: 'purchase', items: [{ itemId: 'item-nuggets', quantity: 50, unit: 'كرتونة' }] },
          { id: 'inv-b', warehouseId: 'wh-b', date: '2026-11-02', type: 'sale', items: [{ itemId: 'item-nuggets', quantity: 20, unit: 'كرتونة' }] },
        ],
        transfers: [
          { id: 'trf-ab', fromId: 'wh-a', toId: 'wh-b', date: '2026-11-03', status: 'confirmed', items: [{ itemId: 'item-nuggets', quantity: 30, unit: 'كرتونة' }] },
        ],
        stockAudits: [],
        warehouses: [
          { id: 'wh-a', name: 'مخزن أ' },
          { id: 'wh-b', name: 'مخزن ب' },
          { id: 'wh-c', name: 'مخزن ج' },
          { id: 'wh-d', name: 'مخزن د' },
        ],
      }

      const res = saveItemOpeningBalanceState(state, {
        itemId: 'item-nuggets',
        warehouseId: 'wh-a',
        quantity: 500,
        date: '2026-11-01',
      })

      const stockA = res.inventoryStock.find((s) => s.warehouseId === 'wh-a')
      const stockB = res.inventoryStock.find((s) => s.warehouseId === 'wh-b')
      const stockC = res.inventoryStock.find((s) => s.warehouseId === 'wh-c')
      const stockD = res.inventoryStock.find((s) => s.warehouseId === 'wh-d')

      assert.strictEqual(stockA.openingBalance, 500)
      assert.strictEqual(stockA.quantity, 500 + 50 - 30)
      assert.strictEqual(stockB.openingBalance, 200)
      assert.strictEqual(stockB.quantity, 200)
      assert.strictEqual(stockC.openingBalance, 300)
      assert.strictEqual(stockC.quantity, 300)
      assert.strictEqual(stockD.openingBalance, 400)
      assert.strictEqual(stockD.quantity, 400)
      assert.strictEqual(res.inventoryStock.length, 4)
    })
  })

  describe('Stress Test 5: calculateItemMovements Deduplication & Traversal', () => {
    it('produces zero duplicate IDs and maintains exact running balance traversal across 150 operations', () => {
      const purchases = []
      const sales = []
      const transfers = []
      const stockAudits = []

      for (let i = 1; i <= 30; i++) {
        purchases.push({
          id: `p-${i}`,
          warehouseId: 'wh-move',
          date: `2026-11-02T10:${String(i).padStart(2, '0')}:00Z`,
          type: 'purchase',
          items: [{ itemId: 'item-kofta', quantity: 10, unit: 'كرتونة', price: 100 }],
        })
        sales.push({
          id: `s-${i}`,
          warehouseId: 'wh-move',
          date: `2026-11-03T11:${String(i).padStart(2, '0')}:00Z`,
          type: 'sale',
          items: [{ itemId: 'item-kofta', quantity: 4, unit: 'كرتونة', price: 150 }],
        })
        transfers.push({
          id: `t-${i}`,
          fromId: 'wh-move',
          toId: 'wh-dest',
          date: `2026-11-04T12:${String(i).padStart(2, '0')}:00Z`,
          status: 'confirmed',
          items: [{ itemId: 'item-kofta', quantity: 2, unit: 'كرتونة' }],
        })
      }

      stockAudits.push({
        id: 'aud-mid',
        warehouseId: 'wh-move',
        auditDate: '2026-11-03T15:00:00Z',
        status: 'approved',
        items: [{ itemId: 'item-kofta', actualQty: 350 }],
      })

      const resAll = calculateItemMovements({
        itemId: 'item-kofta',
        selectedWhId: 'ALL',
        items: [{ id: 'item-kofta', unitType: 'كرتونة' }],
        purchases,
        sales,
        transfers,
        stockAudits,
        inventoryStock: [{ itemId: 'item-kofta', warehouseId: 'wh-move', openingBalance: 50 }],
        warehouses: [{ id: 'wh-move' }, { id: 'wh-dest' }],
      })
      assert.ok(Array.isArray(resAll.movementsList))
      const idsAll = resAll.movementsList.map((m) => m.id)
      assert.strictEqual(new Set(idsAll).size, idsAll.length)

      const resWh = calculateItemMovements({
        itemId: 'item-kofta',
        selectedWhId: 'wh-move',
        items: [{ id: 'item-kofta', unitType: 'كرتونة' }],
        purchases,
        sales,
        transfers,
        stockAudits,
        inventoryStock: [{ itemId: 'item-kofta', warehouseId: 'wh-move', openingBalance: 50 }],
        warehouses: [{ id: 'wh-move' }, { id: 'wh-dest' }],
      })
      const idsWh = resWh.movementsList.map((m) => m.id)
      assert.strictEqual(new Set(idsWh).size, idsWh.length)

      const chronological = [...resWh.movementsList].reverse()
      let running = resWh.openingBalance
      for (const m of chronological) {
        if (m.isAudit) {
          running = m.actualQty
        } else {
          running = running + (m.inQty || 0) - (m.outQty || 0)
        }
        assert.strictEqual(m.balanceAfter, running)
      }
    })
  })

  describe('Invariant Validation: Line Counts & Comments', () => {
    it('verifies itemMovementHelpers and storeCacheHelper are <= 500 lines and contain 0 comments', () => {
      const files = [
        'src/components/warehouses/itemMovementHelpers.js',
        'src/store/storeCacheHelper.js',
        'tests/r5-m4-challenger-stress.test.js',
      ]
      for (const rel of files) {
        const full = path.resolve(process.cwd(), rel)
        assert.ok(fs.existsSync(full), `File not found: ${rel}`)
        const lines = fs.readFileSync(full, 'utf-8').split('\n')
        assert.ok(lines.length <= 500, `File ${rel} has ${lines.length} lines, exceeding 500 lines limit`)
        const comments = lines.filter((l) => {
          const t = l.trim()
          return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')
        })
        assert.strictEqual(comments.length, 0, `File ${rel} contains code comments: ${comments.length}`)
      }
    })
  })
})
