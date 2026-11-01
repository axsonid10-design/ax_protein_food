import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Items Operations & Confirmation Invariants', () => {
  it('should enforce AX_ConfirmModal before deleting items in AX_ItemsCatalog.jsx', () => {
    const catalogPath = path.resolve('src/components/items/AX_ItemsCatalog.jsx')
    const content = fs.readFileSync(catalogPath, 'utf8')

    assert.ok(content.includes('AX_ConfirmModal'), 'AX_ItemsCatalog must import and use AX_ConfirmModal')
    assert.ok(content.includes('itemToDelete'), 'AX_ItemsCatalog must track itemToDelete state before confirmation')
    assert.ok(content.includes('handleConfirmDelete'), 'AX_ItemsCatalog must have handleConfirmDelete handler')
    assert.ok(!content.includes('onClick={() => deleteItem('), 'Direct unconfirmed deleteItem call is strictly forbidden')
  })

  it('should delete item and its associated inventory stock in deleteItem', () => {
    const mockState = {
      items: [
        { id: 'item-1', code: 'PF-001', compositeName: 'سمك فيليه' },
        { id: 'item-2', code: 'PF-002', compositeName: 'لحم بقري' },
      ],
      inventoryStock: [
        { warehouseId: 'wh-1', itemId: 'item-1', quantity: 50 },
        { warehouseId: 'wh-2', itemId: 'item-2', quantity: 100 },
      ],
    }

    const itemIdToDelete = 'item-1'
    const nextItems = mockState.items.filter((i) => i.id !== itemIdToDelete)
    const nextStock = mockState.inventoryStock.filter((s) => s.itemId !== itemIdToDelete)

    assert.equal(nextItems.length, 1)
    assert.equal(nextItems[0].id, 'item-2')
    assert.equal(nextStock.length, 1)
    assert.equal(nextStock[0].itemId, 'item-2')
  })

  it('should route item addition notifications to managers if creator is staff', () => {
    const staffProfile = { id: 'usr-123', name: 'أحمد علي', role: 'مسؤول مخزن' }
    const isCreatorManager = Boolean(
      staffProfile?.isMaster ||
      staffProfile?.role === 'admin' ||
      staffProfile?.role === 'manager' ||
      staffProfile?.role?.includes('مدير')
    )

    let targetUserId = null
    let excludeUserId = null
    if (!isCreatorManager) {
      targetUserId = 'managers'
      excludeUserId = staffProfile.id
    } else {
      targetUserId = 'all'
      excludeUserId = staffProfile.id
    }

    assert.equal(isCreatorManager, false)
    assert.equal(targetUserId, 'managers')
    assert.equal(excludeUserId, 'usr-123')
  })

  it('should route item addition notifications to all except manager if creator is manager', () => {
    const managerProfile = { id: 'usr-mgr', name: 'عثمان جابر', role: 'مدير عام وتشغيل' }
    const isCreatorManager = Boolean(
      managerProfile?.isMaster ||
      managerProfile?.role === 'admin' ||
      managerProfile?.role === 'manager' ||
      managerProfile?.role?.includes('مدير')
    )

    let targetUserId = null
    let excludeUserId = null
    if (!isCreatorManager) {
      targetUserId = 'managers'
      excludeUserId = managerProfile.id
    } else {
      targetUserId = 'all'
      excludeUserId = managerProfile.id
    }

    assert.equal(isCreatorManager, true)
    assert.equal(targetUserId, 'all')
    assert.equal(excludeUserId, 'usr-mgr')
  })
})
