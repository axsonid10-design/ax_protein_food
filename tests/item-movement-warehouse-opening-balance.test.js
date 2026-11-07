import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { calculateItemMovements } from '../src/components/warehouses/itemMovementHelpers.js'

describe('Item Movement & Opening Balance Calculations', () => {
  const warehouses = [
    { id: 'wh-main', name: 'المخزن الرئيسي' },
    { id: 'wh-shop', name: 'مخزن الدكان' },
    { id: 'wh-van', name: 'سيارة 1' },
  ]

  test('calculates opening balance and running balances across ALL warehouses', () => {
    const purchases = [
      {
        id: 'p1',
        warehouseId: 'wh-main',
        date: '2026-11-01',
        items: [{ itemId: 'item-1', quantity: 50, price: 100 }],
      },
    ]

    const sales = [
      {
        id: 's1',
        warehouseId: 'wh-main',
        date: '2026-11-03',
        items: [{ itemId: 'item-1', quantity: 20, price: 120 }],
      },
    ]

    const transfers = [
      {
        id: 't1',
        fromId: 'wh-main',
        toId: 'wh-shop',
        status: 'confirmed',
        date: '2026-11-04',
        items: [{ itemId: 'item-1', quantity: 15 }],
      },
    ]

    const result = calculateItemMovements({
      itemId: 'item-1',
      selectedWhId: 'ALL',
      purchases,
      sales,
      transfers,
      stockAudits: [],
      currentStock: 30,
      warehouses,
    })

    assert.equal(result.totalInward, 50)
    assert.equal(result.totalOutward, 20)
    assert.equal(result.openingBalance, 0)
    assert.equal(result.movementsList.length, 3)
  })

  test('calculates warehouse-specific movements, opening balance, and running balance for main warehouse', () => {
    const purchases = [
      {
        id: 'p1',
        warehouseId: 'wh-main',
        date: '2026-11-01',
        items: [{ itemId: 'item-1', quantity: 100, price: 100 }],
      },
    ]

    const sales = [
      {
        id: 's1',
        warehouseId: 'wh-main',
        date: '2026-11-02',
        items: [{ itemId: 'item-1', quantity: 30, price: 120 }],
      },
      {
        id: 's2',
        warehouseId: 'wh-shop',
        date: '2026-11-03',
        items: [{ itemId: 'item-1', quantity: 10, price: 120 }],
      },
    ]

    const transfers = [
      {
        id: 't1',
        fromId: 'wh-main',
        toId: 'wh-shop',
        status: 'confirmed',
        date: '2026-11-04',
        items: [{ itemId: 'item-1', quantity: 25 }],
      },
    ]

    const result = calculateItemMovements({
      itemId: 'item-1',
      selectedWhId: 'wh-main',
      purchases,
      sales,
      transfers,
      stockAudits: [],
      currentStock: 45,
      warehouses,
    })

    assert.equal(result.totalInward, 100)
    assert.equal(result.totalOutward, 55)
    assert.equal(result.openingBalance, 0)
    assert.equal(result.movementsList.length, 3)

    const chronList = result.movementsList.slice().reverse()
    assert.equal(chronList[0].balanceAfter, 100)
    assert.equal(chronList[1].balanceAfter, 70)
    assert.equal(chronList[2].balanceAfter, 45)
  })

  test('calculates transfer into recipient warehouse and allows negative stock running balances', () => {
    const transfers = [
      {
        id: 't1',
        fromId: 'wh-main',
        toId: 'wh-shop',
        status: 'confirmed',
        date: '2026-11-02',
        items: [{ itemId: 'item-1', quantity: 10 }],
      },
    ]

    const sales = [
      {
        id: 's1',
        warehouseId: 'wh-shop',
        date: '2026-11-03',
        items: [{ itemId: 'item-1', quantity: 15, price: 120 }],
      },
    ]

    const result = calculateItemMovements({
      itemId: 'item-1',
      selectedWhId: 'wh-shop',
      purchases: [],
      sales,
      transfers,
      stockAudits: [],
      currentStock: -5,
      warehouses,
    })

    assert.equal(result.totalInward, 10)
    assert.equal(result.totalOutward, 15)
    assert.equal(result.openingBalance, 0)
    assert.equal(result.currentStock ?? -5, -5)

    const chronList = result.movementsList.slice().reverse()
    assert.equal(chronList[0].balanceAfter, 10)
    assert.equal(chronList[1].balanceAfter, -5)
  })
})
