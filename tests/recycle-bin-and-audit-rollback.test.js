import test from 'node:test'
import assert from 'node:assert/strict'
import { recycleBinHelpers } from '../src/store/recycleBinHelpers.js'

test('Recycle Bin & Stock Audit Rollback Suite', async (t) => {
  await t.test('1. Recycle Bin: restore item moves record back to active items', async () => {
    let updatedState = null
    const dummySet = (updater) => {
      updatedState = updater({
        recycleBin: [{ id: 'rec-1', entityType: 'item', entityId: 'it-1', originalData: { id: 'it-1', code: 'ITM-01', compositeName: 'لحم بقري مفروم' } }],
        items: [],
      })
    }

    const state = {
      recycleBin: [{ id: 'rec-1', entityType: 'item', entityId: 'it-1', originalData: { id: 'it-1', code: 'ITM-01', compositeName: 'لحم بقري مفروم' } }],
    }

    const res = await recycleBinHelpers.restoreItem(state, 'rec-1', { id: 'u1', name: 'المسؤول' }, dummySet)
    assert.ok(res.success)
    assert.equal(updatedState.items.length, 1)
    assert.equal(updatedState.items[0].code, 'ITM-01')
    assert.equal(updatedState.recycleBin.length, 0)
  })

  await t.test('2. Stock Audit Rollback: reverts quantities to previous systemQty', async () => {
    let storeUpdate = null
    const dummySet = (updater) => {
      storeUpdate = updater({
        stockAudits: [{ id: 'aud-1', code: 'AUD-999', status: 'confirmed' }],
        inventoryStock: [{ warehouseId: 'wh-1', itemId: 'item-10', quantity: 200 }],
      })
    }

    const res = await recycleBinHelpers.rollbackAudit('aud-1', { id: 'u1', name: 'المسؤول' }, dummySet)
    assert.ok(res.success)
    assert.equal(storeUpdate.stockAudits[0].status, 'cancelled')
  })
})
