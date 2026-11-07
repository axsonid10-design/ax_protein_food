import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  isStrictlyBefore,
  recalculateItemStock,
  calculateItemMovements,
} from '../src/components/warehouses/itemMovementHelpers.js'
import { recycleBinHelpers } from '../src/store/recycleBinHelpers.js'

describe('Stock Audit Deletion, Transfer Preservation & Negative Balance Calculations', () => {
  test('isStrictlyBefore correctly handles date-only vs ISO strings', () => {
    assert.strictEqual(isStrictlyBefore('2026-11-05', '2026-11-06'), true)
    assert.strictEqual(isStrictlyBefore('2026-11-06', '2026-11-06'), false)
    assert.strictEqual(isStrictlyBefore('2026-11-06', '2026-11-06T15:00:00.000Z'), false)
    assert.strictEqual(isStrictlyBefore('2026-11-06T10:00:00.000Z', '2026-11-06T15:00:00.000Z'), true)
    assert.strictEqual(isStrictlyBefore('2026-11-06T18:00:00.000Z', '2026-11-06T15:00:00.000Z'), false)
    assert.strictEqual(isStrictlyBefore('2026-11-07', '2026-11-06'), false)
    assert.strictEqual(isStrictlyBefore('', '2026-11-06'), false)
    assert.strictEqual(isStrictlyBefore('2026-11-06', ''), false)
  })

  test('recalculateItemStock accurately preserves transfers with database column aliases', () => {
    const itemId = 'item-beef-1'
    const wh1 = 'wh-main'
    const wh2 = 'wh-shop'

    const inventoryStock = [
      { warehouseId: wh1, itemId, openingBalance: 100, openingDate: '2026-11-01' },
      { warehouseId: wh2, itemId, openingBalance: 20, openingDate: '2026-11-01' },
    ]

    const purchases = [
      {
        id: 'p-1',
        type: 'purchase',
        warehouseId: wh1,
        date: '2026-11-02',
        items: [{ itemId, quantity: 50 }],
      },
    ]

    const sales = [
      {
        id: 's-1',
        type: 'sale',
        warehouseId: wh1,
        date: '2026-11-03',
        items: [{ itemId, quantity: 30 }],
      },
    ]

    const transfers = [
      {
        id: 'trf-1',
        from_warehouse_id: wh1,
        to_warehouse_id: wh2,
        date: '2026-11-04',
        status: 'confirmed',
        items: [{ item_id: itemId, quantity: 25 }],
      },
    ]

    const stockWh1 = recalculateItemStock({
      itemId,
      warehouseId: wh1,
      inventoryStock,
      purchases,
      sales,
      transfers,
      stockAudits: [],
      warehouses: [{ id: wh1, name: 'الرئيسي' }, { id: wh2, name: 'الدكان' }],
    })

    const stockWh2 = recalculateItemStock({
      itemId,
      warehouseId: wh2,
      inventoryStock,
      purchases,
      sales,
      transfers,
      stockAudits: [],
      warehouses: [{ id: wh1, name: 'الرئيسي' }, { id: wh2, name: 'الدكان' }],
    })

    assert.strictEqual(stockWh1, 100 + 50 - 30 - 25)
    assert.strictEqual(stockWh2, 20 + 25)
  })

  test('recalculateItemStock anchors to audit when active, and restores all transfers when audit is deleted', () => {
    const itemId = 'item-sausage-1'
    const wh1 = 'wh-main'
    const wh2 = 'wh-shop'

    const inventoryStock = [
      { warehouseId: wh1, itemId, openingBalance: 80, openingDate: '2026-11-01' },
    ]

    const transfers = [
      {
        id: 'trf-before-audit',
        fromId: wh1,
        toId: wh2,
        date: '2026-11-02',
        status: 'confirmed',
        items: [{ itemId, quantity: 15 }],
      },
      {
        id: 'trf-after-audit',
        fromId: wh1,
        toId: wh2,
        date: '2026-11-06',
        status: 'confirmed',
        items: [{ itemId, quantity: 10 }],
      },
    ]

    const auditOnWh1 = {
      id: 'aud-101',
      code: 'AUD-001',
      warehouse_id: wh1,
      auditDate: '2026-11-05',
      status: 'approved',
      items: [{ itemId, actualQty: 500 }],
    }

    const stockDuringAudit = recalculateItemStock({
      itemId,
      warehouseId: wh1,
      inventoryStock,
      purchases: [],
      sales: [],
      transfers,
      stockAudits: [auditOnWh1],
    })

    assert.strictEqual(stockDuringAudit, 500 - 10)

    const stockAfterCancelledAudit = recalculateItemStock({
      itemId,
      warehouseId: wh1,
      inventoryStock,
      purchases: [],
      sales: [],
      transfers,
      stockAudits: [{ ...auditOnWh1, status: 'cancelled' }],
    })

    assert.strictEqual(stockAfterCancelledAudit, 80 - 15 - 10)

    const stockAfterDeletedAudit = recalculateItemStock({
      itemId,
      warehouseId: wh1,
      inventoryStock,
      purchases: [],
      sales: [],
      transfers,
      stockAudits: [],
    })

    assert.strictEqual(stockAfterDeletedAudit, 80 - 15 - 10)
  })

  test('allows negative stock naturally across sales, purchases, and transfers', () => {
    const itemId = 'item-mince-1'
    const wh1 = 'wh-main'

    const inventoryStock = [
      { warehouseId: wh1, itemId, openingBalance: 0, openingDate: '2026-11-01' },
    ]

    const sales = [
      {
        id: 's-neg',
        type: 'sale',
        warehouseId: wh1,
        date: '2026-11-02',
        items: [{ itemId, quantity: 40 }],
      },
    ]

    const transfers = [
      {
        id: 'trf-neg',
        fromWarehouseId: wh1,
        toWarehouseId: 'wh-other',
        date: '2026-11-03',
        status: 'confirmed',
        items: [{ itemId, quantity: 15 }],
      },
    ]

    const negativeStock = recalculateItemStock({
      itemId,
      warehouseId: wh1,
      inventoryStock,
      purchases: [],
      sales,
      transfers,
      stockAudits: [],
    })

    assert.strictEqual(negativeStock, -55)
  })

  test('deleteAudit completely purges audit and recalculates stock accurately', async () => {
    let appState = {
      stockAudits: [
        {
          id: 'aud-to-purge',
          code: 'AUD-999',
          warehouseId: 'wh-main',
          auditDate: '2026-11-04',
          status: 'approved',
          items: [{ itemId: 'item-1', actualQty: 1000 }],
        },
      ],
      inventoryStock: [
        { warehouseId: 'wh-main', itemId: 'item-1', quantity: 1000, openingBalance: 50, openingDate: '2026-11-01' },
      ],
      invoices: [
        { id: 'p-1', type: 'purchase', warehouseId: 'wh-main', date: '2026-11-02', items: [{ itemId: 'item-1', quantity: 70 }] },
      ],
      transfers: [
        { id: 'trf-1', fromId: 'wh-main', toId: 'wh-shop', status: 'confirmed', date: '2026-11-03', items: [{ itemId: 'item-1', quantity: 20 }] },
      ],
      recycleBin: [],
      warehouses: [{ id: 'wh-main' }, { id: 'wh-shop' }],
    }

    const setFn = (updater) => {
      const updates = typeof updater === 'function' ? updater(appState) : updater
      appState = { ...appState, ...updates }
    }

    const res = await recycleBinHelpers.deleteAudit('aud-to-purge', { name: 'الريس' }, setFn, appState)

    assert.strictEqual(res.success, true)
    assert.strictEqual(appState.stockAudits.length, 0)
    assert.strictEqual(appState.recycleBin.length, 1)
    assert.strictEqual(appState.recycleBin[0].entityType, 'audit')

    const mainStockRow = appState.inventoryStock.find((s) => s.warehouseId === 'wh-main' && s.itemId === 'item-1')
    assert.strictEqual(mainStockRow.quantity, 50 + 70 - 20)
  })

  test('calculateItemMovements reflects all transfers, audits, purchases, and sales in chronological ledger', () => {
    const itemId = 'item-steak'
    const wh1 = 'wh-main'

    const movements = calculateItemMovements({
      itemId,
      selectedWhId: wh1,
      purchases: [
        { id: 'p-1', code: 'PUR-01', date: '2026-11-02', warehouseId: wh1, items: [{ itemId, quantity: 100, price: 200 }] },
      ],
      sales: [
        { id: 's-1', code: 'SAL-01', date: '2026-11-04', warehouseId: wh1, items: [{ itemId, quantity: 40, price: 300 }] },
      ],
      transfers: [
        { id: 't-1', code: 'TRF-01', date: '2026-11-03', status: 'confirmed', fromId: wh1, toId: 'wh-shop', items: [{ itemId, quantity: 20 }] },
      ],
      stockAudits: [],
      currentStock: 40,
      warehouses: [{ id: wh1, name: 'المخزن الرئيسي' }, { id: 'wh-shop', name: 'مخزن الدكان' }],
      inventoryStock: [{ warehouseId: wh1, itemId, openingBalance: 0, openingDate: '2026-11-01' }],
    })

    assert.strictEqual(movements.openingBalance, 0)
    assert.strictEqual(movements.totalInward, 100)
    assert.strictEqual(movements.totalOutward, 60)
    assert.strictEqual(movements.currentStock, 40)
    assert.strictEqual(movements.movementsList.length, 3)
  })
})
