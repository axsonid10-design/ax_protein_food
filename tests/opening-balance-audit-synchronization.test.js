import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  calculateItemMovements,
  recalculateItemStock,
} from '../src/components/warehouses/itemMovementHelpers.js'
import { saveItemOpeningBalanceState } from '../src/store/storeCacheHelper.js'

describe('Item Opening Balance & Stock Audit Synchronization', () => {
  it('should calculate current stock purely from opening balance when no audit exists', () => {
    const inventoryStock = [
      { itemId: 'item-sausage', warehouseId: 'wh-shop', openingBalance: 100, openingDate: '2026-11-01', quantity: 100 },
    ]
    const purchases = [
      {
        id: 'p1',
        warehouseId: 'wh-shop',
        date: '2026-11-02',
        type: 'purchase',
        items: [{ itemId: 'item-sausage', quantity: 50 }],
      },
    ]
    const sales = [
      {
        id: 's1',
        warehouseId: 'wh-shop',
        date: '2026-11-03',
        type: 'sale',
        items: [{ itemId: 'item-sausage', quantity: 20 }],
      },
    ]

    const stock = recalculateItemStock({
      itemId: 'item-sausage',
      warehouseId: 'wh-shop',
      inventoryStock,
      purchases,
      sales,
      transfers: [],
      stockAudits: [],
    })

    assert.strictEqual(stock, 130, '100 opening + 50 purchase - 20 sale = 130')
  })

  it('should anchor current stock to audit count (1000) and NOT add opening balance on top (prevent 1100 bug)', () => {
    const inventoryStock = [
      { itemId: 'item-sausage', warehouseId: 'wh-shop', openingBalance: 100, openingDate: '2026-11-01', quantity: 100 },
    ]
    const purchases = [
      {
        id: 'p1',
        warehouseId: 'wh-shop',
        date: '2026-11-02',
        type: 'purchase',
        items: [{ itemId: 'item-sausage', quantity: 50 }],
      },
    ]
    const sales = [
      {
        id: 's1',
        warehouseId: 'wh-shop',
        date: '2026-11-03',
        type: 'sale',
        items: [{ itemId: 'item-sausage', quantity: 20 }],
      },
    ]

    const stockAudits = [
      {
        id: 'aud-1',
        code: 'AUD-001',
        warehouseId: 'wh-shop',
        auditDate: '2026-11-05',
        status: 'approved',
        items: [{ itemId: 'item-sausage', actualQty: 1000 }],
      },
    ]

    const stockAtAudit = recalculateItemStock({
      itemId: 'item-sausage',
      warehouseId: 'wh-shop',
      inventoryStock,
      purchases,
      sales,
      transfers: [],
      stockAudits,
    })

    assert.strictEqual(stockAtAudit, 1000, 'Must be exactly 1000 from audit count, not 1100 or 1130!')

    // If a post-audit sale of 30 happens on 2026-11-06:
    const postSales = [
      ...sales,
      {
        id: 's2',
        warehouseId: 'wh-shop',
        date: '2026-11-06',
        type: 'sale',
        items: [{ itemId: 'item-sausage', quantity: 30 }],
      },
    ]

    const stockAfterPostSale = recalculateItemStock({
      itemId: 'item-sausage',
      warehouseId: 'wh-shop',
      inventoryStock,
      purchases,
      sales: postSales,
      transfers: [],
      stockAudits,
    })

    assert.strictEqual(stockAfterPostSale, 970, '1000 audit baseline - 30 post-audit sale = 970')
  })

  it('should not allow historical movements before audit date to alter post-audit stock', () => {
    const inventoryStock = [
      { itemId: 'item-sausage', warehouseId: 'wh-shop', openingBalance: 100, openingDate: '2026-11-01', quantity: 100 },
    ]
    const stockAudits = [
      {
        id: 'aud-1',
        code: 'AUD-001',
        warehouseId: 'wh-shop',
        auditDate: '2026-11-05',
        status: 'approved',
        items: [{ itemId: 'item-sausage', actualQty: 1000 }],
      },
    ]

    // Enter an old backdated invoice on 2026-11-02
    const sales = [
      {
        id: 's-old',
        warehouseId: 'wh-shop',
        date: '2026-11-02',
        type: 'sale',
        items: [{ itemId: 'item-sausage', quantity: 40 }],
      },
    ]

    const stock = recalculateItemStock({
      itemId: 'item-sausage',
      warehouseId: 'wh-shop',
      inventoryStock,
      purchases: [],
      sales,
      transfers: [],
      stockAudits,
    })

    assert.strictEqual(stock, 1000, 'Current stock remains 1000 because audit physical count superseded pre-audit dates')
  })

  it('should cleanly roll back stock to opening balance + all movements when audit is cancelled', () => {
    const inventoryStock = [
      { itemId: 'item-sausage', warehouseId: 'wh-shop', openingBalance: 100, openingDate: '2026-11-01', quantity: 970 },
    ]
    const purchases = [
      {
        id: 'p1',
        warehouseId: 'wh-shop',
        date: '2026-11-02',
        type: 'purchase',
        items: [{ itemId: 'item-sausage', quantity: 50 }],
      },
    ]
    const sales = [
      {
        id: 's1',
        warehouseId: 'wh-shop',
        date: '2026-11-03',
        type: 'sale',
        items: [{ itemId: 'item-sausage', quantity: 20 }],
      },
      {
        id: 's2',
        warehouseId: 'wh-shop',
        date: '2026-11-06',
        type: 'sale',
        items: [{ itemId: 'item-sausage', quantity: 30 }],
      },
    ]

    // Audit cancelled
    const stockAudits = [
      {
        id: 'aud-1',
        code: 'AUD-001',
        warehouseId: 'wh-shop',
        auditDate: '2026-11-05',
        status: 'cancelled',
        items: [{ itemId: 'item-sausage', actualQty: 1000 }],
      },
    ]

    const rolledBackStock = recalculateItemStock({
      itemId: 'item-sausage',
      warehouseId: 'wh-shop',
      inventoryStock,
      purchases,
      sales,
      transfers: [],
      stockAudits,
    })

    assert.strictEqual(rolledBackStock, 100, 'Cancelled audit is ignored: 100 opening + 50 purchase - 20 sale - 30 sale = 100')
  })

  it('should update opening balance via saveItemOpeningBalanceState without crashing', () => {
    const state = {
      inventoryStock: [
        { itemId: 'item-1', warehouseId: 'wh-1', quantity: 50, openingBalance: 50, openingDate: '2026-11-01' },
      ],
      invoices: [],
      transfers: [],
      stockAudits: [],
    }

    const res = saveItemOpeningBalanceState(state, {
      itemId: 'item-1',
      warehouseId: 'wh-1',
      quantity: 120,
      date: '2026-11-01',
      unit: 'كرتونة',
    })

    assert.strictEqual(res.newStock, 120)
    const stockRow = res.inventoryStock.find((s) => s.itemId === 'item-1' && s.warehouseId === 'wh-1')
    assert.strictEqual(stockRow.openingBalance, 120)
    assert.strictEqual(stockRow.quantity, 120)
  })

  it('should render correct running balances in calculateItemMovements with audit reset', () => {
    const inventoryStock = [
      { itemId: 'item-sausage', warehouseId: 'wh-shop', openingBalance: 100, openingDate: '2026-11-01' },
    ]
    const purchases = [
      {
        id: 'p1',
        warehouseId: 'wh-shop',
        date: '2026-11-02',
        type: 'purchase',
        items: [{ itemId: 'item-sausage', quantity: 50 }],
      },
    ]
    const sales = [
      {
        id: 's1',
        warehouseId: 'wh-shop',
        date: '2026-11-03',
        type: 'sale',
        items: [{ itemId: 'item-sausage', quantity: 20 }],
      },
    ]
    const stockAudits = [
      {
        id: 'aud-1',
        code: 'AUD-001',
        warehouseId: 'wh-shop',
        auditDate: '2026-11-05',
        status: 'approved',
        items: [{ itemId: 'item-sausage', actualQty: 1000 }],
      },
    ]

    const result = calculateItemMovements({
      itemId: 'item-sausage',
      selectedWhId: 'wh-shop',
      purchases,
      sales,
      transfers: [],
      stockAudits,
      currentStock: 1000,
      warehouses: [{ id: 'wh-shop', name: 'الدكان' }],
      inventoryStock,
    })

    assert.strictEqual(result.openingBalance, 100)
    const chron = result.movementsList.slice().reverse()
    // First movement: purchase of 50 -> running balance = 150
    assert.strictEqual(chron[0].balanceAfter, 150)
    // Second movement: sale of 20 -> running balance = 130
    assert.strictEqual(chron[1].balanceAfter, 130)
    // Third movement: audit resetting to 1000 -> running balance = 1000
    assert.strictEqual(chron[2].balanceAfter, 1000)
    assert.strictEqual(result.currentStock, 1000)
  })
})
