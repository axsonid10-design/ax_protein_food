import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import {
  recalculateItemStock,
  calculateItemMovements,
} from '../src/components/warehouses/itemMovementHelpers.js'
import {
  saveItemOpeningBalanceState,
} from '../src/store/storeCacheHelper.js'
import { offlineDB } from '../src/services/offlineDB.js'
import { AX_ItemOperationsService } from '../src/services/AX_ItemOperationsService.js'
import { offlineSync } from '../src/services/offlineSync.js'

describe('Milestone 2: Opening Stock Recalculation Engine & Data Integrity', () => {
  it('modifies opening balance with positive, zero, and decimal quantities accurately', () => {
    const baseState = {
      inventoryStock: [
        { itemId: 'item-beef-mince', warehouseId: 'wh-main', openingBalance: 100, openingDate: '2026-11-01', quantity: 100, unit: 'كرتونة' },
      ],
      items: [{ id: 'item-beef-mince', unitType: 'كرتونة' }],
      invoices: [],
      transfers: [],
      stockAudits: [],
      warehouses: [{ id: 'wh-main', name: 'المخزن الرئيسي' }],
    }

    const pos = saveItemOpeningBalanceState(baseState, {
      itemId: 'item-beef-mince',
      warehouseId: 'wh-main',
      quantity: 150,
      date: '2026-11-01',
    })
    assert.strictEqual(pos.newStock, 150)
    assert.strictEqual(pos.finalStockRow.openingBalance, 150)
    assert.strictEqual(pos.finalStockRow.quantity, 150)

    const zero = saveItemOpeningBalanceState(baseState, {
      itemId: 'item-beef-mince',
      warehouseId: 'wh-main',
      quantity: 0,
      date: '2026-11-01',
    })
    assert.strictEqual(zero.newStock, 0)
    assert.strictEqual(zero.finalStockRow.openingBalance, 0)
    assert.strictEqual(zero.finalStockRow.quantity, 0)

    const dec = saveItemOpeningBalanceState(baseState, {
      itemId: 'item-beef-mince',
      warehouseId: 'wh-main',
      quantity: 42.75,
      date: '2026-11-01',
    })
    assert.strictEqual(dec.newStock, 42.75)
    assert.strictEqual(dec.finalStockRow.openingBalance, 42.75)
    assert.strictEqual(dec.finalStockRow.quantity, 42.75)

    const str = saveItemOpeningBalanceState(baseState, {
      itemId: 'item-beef-mince',
      warehouseId: 'wh-main',
      quantity: '88.5',
      date: '2026-11-01',
    })
    assert.strictEqual(str.newStock, 88.5)
    assert.strictEqual(str.finalStockRow.openingBalance, 88.5)

    const inv = saveItemOpeningBalanceState(baseState, {
      itemId: 'item-beef-mince',
      warehouseId: 'wh-main',
      quantity: 'invalid',
      date: '2026-11-01',
    })
    assert.strictEqual(inv.newStock, 0)
    assert.strictEqual(inv.finalStockRow.openingBalance, 0)
  })

  it('recalculates stock accurately with simulated purchases, sales, and transfers', () => {
    const inventoryStock = [
      { itemId: 'item-burger', warehouseId: 'wh-1', openingBalance: 50, openingDate: '2026-11-01', quantity: 50, unit: 'كرتونة' },
    ]
    const purchases = [
      { id: 'p-1', warehouseId: 'wh-1', date: '2026-11-02', type: 'purchase', items: [{ itemId: 'item-burger', quantity: 30, unit: 'كرتونة' }] },
      { id: 'p-ret-1', warehouseId: 'wh-1', date: '2026-11-03', type: 'purchase_return', items: [{ itemId: 'item-burger', quantity: 5, unit: 'كرتونة' }] },
    ]
    const sales = [
      { id: 's-1', warehouseId: 'wh-1', date: '2026-11-04', type: 'sale', items: [{ itemId: 'item-burger', quantity: 15, unit: 'كرتونة' }] },
      { id: 's-ret-1', warehouseId: 'wh-1', date: '2026-11-05', type: 'sale_return', items: [{ itemId: 'item-burger', quantity: 2, unit: 'كرتونة' }] },
    ]
    const transfers = [
      { id: 't-in', fromId: 'wh-2', toId: 'wh-1', date: '2026-11-06', status: 'confirmed', items: [{ itemId: 'item-burger', quantity: 10, unit: 'كرتونة' }] },
      { id: 't-out', fromId: 'wh-1', toId: 'wh-2', date: '2026-11-07', status: 'confirmed', items: [{ itemId: 'item-burger', quantity: 4, unit: 'كرتونة' }] },
      { id: 't-pend', fromId: 'wh-1', toId: 'wh-2', date: '2026-11-08', status: 'pending', items: [{ itemId: 'item-burger', quantity: 100, unit: 'كرتونة' }] },
    ]
    const warehouses = [
      { id: 'wh-1', name: 'المخزن الرئيسي' },
      { id: 'wh-2', name: 'مخزن الفرع' },
    ]

    const expected = 50 + 30 - 5 - 15 + 2 + 10 - 4
    const stock = recalculateItemStock({
      itemId: 'item-burger',
      warehouseId: 'wh-1',
      inventoryStock,
      purchases,
      sales,
      transfers,
      stockAudits: [],
      warehouses,
    })
    assert.strictEqual(stock, expected)
    assert.strictEqual(stock, 68)

    const updated = recalculateItemStock({
      itemId: 'item-burger',
      warehouseId: 'wh-1',
      inventoryStock: [{ itemId: 'item-burger', warehouseId: 'wh-1', openingBalance: 80, openingDate: '2026-11-01', quantity: 80, unit: 'كرتونة' }],
      purchases,
      sales,
      transfers,
      stockAudits: [],
      warehouses,
    })
    assert.strictEqual(updated, 80 + 30 - 5 - 15 + 2 + 10 - 4)
    assert.strictEqual(updated, 98)
  })

  it('guarantees complete multi-warehouse isolation without cross-contamination', () => {
    const inventoryStock = [
      { itemId: 'item-hotdog', warehouseId: 'wh-alpha', openingBalance: 200, openingDate: '2026-11-01', quantity: 200, unit: 'كرتونة' },
      { itemId: 'item-hotdog', warehouseId: 'wh-beta', openingBalance: 50, openingDate: '2026-11-01', quantity: 50, unit: 'كرتونة' },
    ]
    const purchases = [
      { id: 'p-alpha', warehouseId: 'wh-alpha', date: '2026-11-02', type: 'purchase', items: [{ itemId: 'item-hotdog', quantity: 20, unit: 'كرتونة' }] },
    ]
    const sales = [
      { id: 's-beta', warehouseId: 'wh-beta', date: '2026-11-03', type: 'sale', items: [{ itemId: 'item-hotdog', quantity: 10, unit: 'كرتونة' }] },
    ]
    const warehouses = [
      { id: 'wh-alpha', name: 'مخزن ألفا' },
      { id: 'wh-beta', name: 'مخزن بيتا' },
    ]

    const sA1 = recalculateItemStock({ itemId: 'item-hotdog', warehouseId: 'wh-alpha', inventoryStock, purchases, sales, transfers: [], stockAudits: [], warehouses })
    const sB1 = recalculateItemStock({ itemId: 'item-hotdog', warehouseId: 'wh-beta', inventoryStock, purchases, sales, transfers: [], stockAudits: [], warehouses })
    assert.strictEqual(sA1, 220)
    assert.strictEqual(sB1, 40)

    const updated = inventoryStock.map((s) => s.warehouseId === 'wh-alpha' ? { ...s, openingBalance: 300 } : s)
    const sA2 = recalculateItemStock({ itemId: 'item-hotdog', warehouseId: 'wh-alpha', inventoryStock: updated, purchases, sales, transfers: [], stockAudits: [], warehouses })
    const sB2 = recalculateItemStock({ itemId: 'item-hotdog', warehouseId: 'wh-beta', inventoryStock: updated, purchases, sales, transfers: [], stockAudits: [], warehouses })
    assert.strictEqual(sA2, 320)
    assert.strictEqual(sB2, 40)
  })

  it('handles running balance accuracy when stock audits exist vs when no audit exists', () => {
    const inventoryStock = [
      { itemId: 'item-pastrami', warehouseId: 'wh-cold', openingBalance: 60, openingDate: '2026-11-01', quantity: 60, unit: 'كرتونة' },
    ]
    const purchases = [
      { id: 'p-pre', warehouseId: 'wh-cold', date: '2026-11-02', type: 'purchase', items: [{ itemId: 'item-pastrami', quantity: 40, unit: 'كرتونة' }] },
    ]
    const sales = [
      { id: 's-pre', warehouseId: 'wh-cold', date: '2026-11-03', type: 'sale', items: [{ itemId: 'item-pastrami', quantity: 20, unit: 'كرتونة' }] },
    ]

    const stockNoAudit = recalculateItemStock({
      itemId: 'item-pastrami',
      warehouseId: 'wh-cold',
      inventoryStock,
      purchases,
      sales,
      transfers: [],
      stockAudits: [],
    })
    assert.strictEqual(stockNoAudit, 80)

    const stockAudits = [
      { id: 'aud-cold-1', warehouseId: 'wh-cold', auditDate: '2026-11-05', status: 'approved', items: [{ itemId: 'item-pastrami', actualQty: 500 }] },
    ]
    const postSales = [
      ...sales,
      { id: 's-post', warehouseId: 'wh-cold', date: '2026-11-06', type: 'sale', items: [{ itemId: 'item-pastrami', quantity: 25, unit: 'كرتونة' }] },
    ]

    const stockWithAudit = recalculateItemStock({
      itemId: 'item-pastrami',
      warehouseId: 'wh-cold',
      inventoryStock,
      purchases,
      sales: postSales,
      transfers: [],
      stockAudits,
    })
    assert.strictEqual(stockWithAudit, 475)

    const modifiedOpening = inventoryStock.map((s) => ({ ...s, openingBalance: 999 }))
    const stockAfterModWithAudit = recalculateItemStock({
      itemId: 'item-pastrami',
      warehouseId: 'wh-cold',
      inventoryStock: modifiedOpening,
      purchases,
      sales: postSales,
      transfers: [],
      stockAudits,
    })
    assert.strictEqual(stockAfterModWithAudit, 475)

    const cancelledAudits = stockAudits.map((a) => ({ ...a, status: 'cancelled' }))
    const stockCancelled = recalculateItemStock({
      itemId: 'item-pastrami',
      warehouseId: 'wh-cold',
      inventoryStock,
      purchases,
      sales: postSales,
      transfers: [],
      stockAudits: cancelledAudits,
    })
    assert.strictEqual(stockCancelled, 60 + 40 - 20 - 25)
    assert.strictEqual(stockCancelled, 55)
  })

  it('guarantees calculateItemMovements integrity and zero duplicate entries', () => {
    const inventoryStock = [
      { itemId: 'item-chicken-pane', warehouseId: 'wh-froz', openingBalance: 120, openingDate: '2026-11-01', quantity: 120, unit: 'كرتونة' },
    ]
    const purchases = [
      { id: 'inv-p1', warehouseId: 'wh-froz', date: '2026-11-02', type: 'purchase', items: [{ itemId: 'item-chicken-pane', quantity: 50, unit: 'كرتونة' }] },
    ]
    const sales = [
      { id: 'inv-s1', warehouseId: 'wh-froz', date: '2026-11-03', type: 'sale', items: [{ itemId: 'item-chicken-pane', quantity: 30, unit: 'كرتونة' }] },
    ]
    const transfers = [
      { id: 'trf-1', fromId: 'wh-froz', toId: 'wh-shop', date: '2026-11-04', status: 'confirmed', items: [{ itemId: 'item-chicken-pane', quantity: 10, unit: 'كرتونة' }] },
    ]
    const stockAudits = [
      { id: 'aud-1', warehouseId: 'wh-froz', auditDate: '2026-11-05', status: 'approved', items: [{ itemId: 'item-chicken-pane', actualQty: 125 }] },
    ]
    const warehouses = [
      { id: 'wh-froz', name: 'مخزن التجميد' },
      { id: 'wh-shop', name: 'مخزن المحل' },
    ]

    const movements = calculateItemMovements({
      itemId: 'item-chicken-pane',
      selectedWhId: 'wh-froz',
      items: [{ id: 'item-chicken-pane', unitType: 'كرتونة' }],
      purchases,
      sales,
      transfers,
      stockAudits,
      warehouses,
      inventoryStock,
    })

    assert.strictEqual(movements.openingBalance, 120)
    assert.ok(Array.isArray(movements.movementsList))
    assert.strictEqual(movements.movementsList.length, 4)

    const ids = movements.movementsList.map((m) => m.id)
    const uniqueIds = new Set(ids)
    assert.strictEqual(uniqueIds.size, ids.length)

    const chronological = [...movements.movementsList].reverse()
    let expectedRunning = movements.openingBalance
    chronological.forEach((m) => {
      if (m.isAudit) {
        expectedRunning = m.actualQty
      } else {
        expectedRunning = expectedRunning + (m.inQty || 0) - (m.outQty || 0)
      }
      assert.strictEqual(m.balanceAfter, expectedRunning)
    })

    assert.strictEqual(purchases[0].items[0].quantity, 50)
    assert.strictEqual(sales[0].items[0].quantity, 30)
    assert.strictEqual(transfers[0].items[0].quantity, 10)
    assert.strictEqual(stockAudits[0].items[0].actualQty, 125)
  })

  it('persists opening balance across state, cache helper, and offlineDB queue', async () => {
    const testState = {
      inventoryStock: [
        { warehouse_id: 'wh-a', item_id: 'item-kebab', quantity: 10, opening_balance: 10, unit: 'طبق' },
      ],
      items: [{ id: 'item-kebab', unitType: 'طبق' }],
      invoices: [],
      transfers: [],
      stockAudits: [],
      warehouses: [{ id: 'wh-a', name: 'المخزن' }],
    }

    const { inventoryStock, newStock, finalStockRow } = saveItemOpeningBalanceState(testState, {
      itemId: 'item-kebab',
      warehouseId: 'wh-a',
      quantity: 75.5,
      date: '2026-11-09',
    })

    assert.strictEqual(newStock, 75.5)
    assert.strictEqual(finalStockRow.openingBalance, 75.5)
    assert.strictEqual(finalStockRow.quantity, 75.5)
    assert.strictEqual(inventoryStock.length, 1)

    const cachedData = await offlineDB.getCachedData('inventoryStock')
    if (cachedData) {
      assert.ok(Array.isArray(cachedData))
      const found = cachedData.find((s) => (s.itemId || s.item_id) === 'item-kebab')
      assert.ok(found)
      assert.strictEqual(found.openingBalance, 75.5)
    }

    const dbRes = await AX_ItemOperationsService.saveOpeningBalanceInDB({
      itemId: 'item-kebab',
      warehouseId: 'wh-a',
      quantity: 75.5,
      date: '2026-11-09',
      unit: 'طبق',
      newStock: 75.5,
    })
    assert.ok(dbRes.success)

    const pendingQueue = await offlineDB.getQueue()
    assert.ok(Array.isArray(pendingQueue))

    const mutationRes = await offlineSync.performMutation('ax_inventory_stock', 'upsert', {
      warehouse_id: 'wh-a',
      item_id: 'item-kebab',
      opening_balance: 75.5,
      quantity: 75.5,
      unit: 'طبق',
    })
    assert.ok(mutationRes)
  })

  it('enforces constitution invariants: <= 500 lines and zero comments on all touched files', () => {
    const filesToAudit = [
      'src/store/storeCacheHelper.js',
      'src/store/useAXStore.js',
      'src/services/AX_ItemOperationsService.js',
      'src/services/offlineSync.js',
      'src/components/warehouses/itemMovementHelpers.js',
      'tests/opening-stock-recalculation.test.js',
    ]

    filesToAudit.forEach((rel) => {
      const full = path.resolve(process.cwd(), rel)
      assert.ok(fs.existsSync(full), `File must exist: ${rel}`)
      const content = fs.readFileSync(full, 'utf-8')
      const lines = content.split('\n')
      assert.ok(
        lines.length <= 500,
        `File ${rel} exceeds 500 lines limit! Current: ${lines.length}`
      )

      const commentLines = lines.filter((l) => {
        const trimmed = l.trim()
        return (
          trimmed.startsWith('//') ||
          trimmed.startsWith('/*') ||
          trimmed.startsWith('*')
        )
      })
      assert.strictEqual(
        commentLines.length,
        0,
        `File ${rel} contains code comments: ${JSON.stringify(commentLines)}`
      )
    })
  })
})
