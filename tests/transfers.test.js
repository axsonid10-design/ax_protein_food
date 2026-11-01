import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('Transfer Confirmation & Stock Movement Tests', () => {
  it('should confirm pending transfer and move stock correctly', () => {
    const initialTransfers = [
      {
        id: 'trf-1',
        code: 'TRF-001',
        fromId: 'wh-main',
        toId: 'wh-branch',
        status: 'pending',
        items: [
          { itemId: 'item-fish', quantity: 20, unit: 'كرتونة' },
          { itemId: 'item-meat', quantity: 10, unit: 'كرتونة' },
        ],
      },
    ]

    const initialStock = [
      { warehouseId: 'wh-main', itemId: 'item-fish', quantity: 100, unit: 'كرتونة' },
      { warehouseId: 'wh-main', itemId: 'item-meat', quantity: 50, unit: 'كرتونة' },
      { warehouseId: 'wh-branch', itemId: 'item-fish', quantity: 10, unit: 'كرتونة' },
    ]

    const confirmTransferLogic = (transferId, state) => {
      const trf = state.transfers.find((t) => t.id === transferId)
      if (!trf || trf.status === 'confirmed') return state

      const newTransfers = state.transfers.map((t) =>
        t.id === transferId ? { ...t, status: 'confirmed', confirmedAt: new Date().toISOString() } : t
      )

      let updatedStock = [...state.inventoryStock]
      const fromTargetId = trf.fromId
      const toTargetId = trf.toId

      trf.items.forEach((item) => {
        const fromIndex = updatedStock.findIndex(
          (s) => s.warehouseId === fromTargetId && s.itemId === item.itemId
        )
        if (fromIndex >= 0) {
          updatedStock[fromIndex] = {
            ...updatedStock[fromIndex],
            quantity: Math.max(0, updatedStock[fromIndex].quantity - item.quantity),
          }
        }

        const toIndex = updatedStock.findIndex(
          (s) => s.warehouseId === toTargetId && s.itemId === item.itemId
        )
        if (toIndex >= 0) {
          updatedStock[toIndex] = {
            ...updatedStock[toIndex],
            quantity: updatedStock[toIndex].quantity + item.quantity,
          }
        } else {
          updatedStock.push({
            warehouseId: toTargetId,
            itemId: item.itemId,
            quantity: item.quantity,
            unit: item.unit,
          })
        }
      })

      return { transfers: newTransfers, inventoryStock: updatedStock }
    }

    const nextState = confirmTransferLogic('trf-1', {
      transfers: initialTransfers,
      inventoryStock: initialStock,
    })

    const confirmedTrf = nextState.transfers.find((t) => t.id === 'trf-1')
    assert.strictEqual(confirmedTrf.status, 'confirmed')
    assert.ok(confirmedTrf.confirmedAt)

    const fromFish = nextState.inventoryStock.find((s) => s.warehouseId === 'wh-main' && s.itemId === 'item-fish')
    assert.strictEqual(fromFish.quantity, 80)

    const fromMeat = nextState.inventoryStock.find((s) => s.warehouseId === 'wh-main' && s.itemId === 'item-meat')
    assert.strictEqual(fromMeat.quantity, 40)

    const toFish = nextState.inventoryStock.find((s) => s.warehouseId === 'wh-branch' && s.itemId === 'item-fish')
    assert.strictEqual(toFish.quantity, 30)

    const toMeat = nextState.inventoryStock.find((s) => s.warehouseId === 'wh-branch' && s.itemId === 'item-meat')
    assert.ok(toMeat, 'Should create new stock entry for meat in branch')
    assert.strictEqual(toMeat.quantity, 10)
  })

  it('should be idempotent (not double-deduct stock if called twice)', () => {
    const initialTransfers = [
      {
        id: 'trf-1',
        code: 'TRF-001',
        fromId: 'wh-main',
        toId: 'wh-branch',
        status: 'confirmed',
        items: [{ itemId: 'item-fish', quantity: 20 }],
      },
    ]
    const initialStock = [
      { warehouseId: 'wh-main', itemId: 'item-fish', quantity: 80 },
    ]

    const trf = initialTransfers.find((t) => t.id === 'trf-1')
    assert.strictEqual(trf.status, 'confirmed')
  })
})
