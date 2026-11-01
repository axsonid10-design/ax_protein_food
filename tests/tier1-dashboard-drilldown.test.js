import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Tier 1: Dashboard Stock Drilldown & Pinned Inventory (F17, F18)', () => {
  // Pure helper simulating localStorage pinning operations
  function resolvePinnedItems(storedPinsJson, allItems = []) {
    let pinnedIds = []
    if (storedPinsJson) {
      try {
        const parsed = JSON.parse(storedPinsJson)
        if (Array.isArray(parsed) && parsed.length > 0) {
          pinnedIds = parsed
        }
      } catch {
        pinnedIds = []
      }
    }

    if (pinnedIds.length === 0) {
      pinnedIds = allItems.slice(0, 4).map((i) => i.id)
    }

    return allItems.filter((item) => pinnedIds.includes(item.id))
  }

  // Pure helper simulating drilldown aggregation algorithm
  function aggregateItemDrilldown(item, warehouses = [], inventoryStock = []) {
    if (!item?.id) return { totalQuantity: 0, byWarehouse: [] }

    const itemStocks = inventoryStock.filter((s) => s.itemId === item.id)
    const totalQuantity = itemStocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)

    const byWarehouse = warehouses.map((wh) => {
      const stockRow = itemStocks.find((s) => s.warehouseId === wh.id)
      const qty = Number(stockRow?.quantity) || 0
      const sharePercentage = totalQuantity > 0 ? Math.round((qty / totalQuantity) * 100) : 0
      const unit = stockRow?.unit || item.unitType || 'كرتونة'

      let status = 'out'
      if (qty > 25) status = 'healthy'
      else if (qty > 0) status = 'low'

      return {
        warehouseId: wh.id,
        warehouseName: wh.name,
        warehouseType: wh.type,
        isBranch: wh.type === 'branch',
        isColdStore: wh.type === 'cold_store',
        isVan: wh.type === 'van',
        manager: wh.manager || 'غير محدد',
        quantity: qty,
        unit,
        sharePercentage,
        status
      }
    })

    // Sort descending by quantity
    byWarehouse.sort((a, b) => b.quantity - a.quantity)

    // Packaging multi-tier estimation
    const piecesPerCarton = Number(item.piecesPerCarton) || 0
    const weightPerCarton = Number(item.weightPerCarton) || 0
    const packagingSummary = {
      totalCartons: totalQuantity,
      totalPieces: piecesPerCarton > 0 ? totalQuantity * piecesPerCarton : null,
      totalWeightKg: weightPerCarton > 0 ? totalQuantity * weightPerCarton : null
    }

    return { totalQuantity, byWarehouse, packagingSummary }
  }

  const sampleItems = [
    { id: 'item-1', code: 'PF-001', compositeName: 'شيش طاووق متبل مجمد', unitType: 'كرتونة', piecesPerCarton: 12, weightPerCarton: 10 },
    { id: 'item-2', code: 'PF-002', compositeName: 'كفتة بقري مجهزة للشواء', unitType: 'كرتونة', piecesPerCarton: 20, weightPerCarton: 10 },
    { id: 'item-3', code: 'PF-003', compositeName: 'فيليه سمك بلطي أبيض', unitType: 'كرتونة', piecesPerCarton: 10, weightPerCarton: 5 },
    { id: 'item-4', code: 'PF-004', compositeName: 'سجق بلدي مجمد سوبر', unitType: 'كرتونة', piecesPerCarton: 15, weightPerCarton: 7.5 },
    { id: 'item-5', code: 'PF-005', compositeName: 'كبدة وقوانص دجاج معبأة', unitType: 'كرتونة' }
  ]

  const sampleWarehouses = [
    { id: 'wh-main', name: 'مخزن التجميد الرئيسي (أكتوبر)', type: 'cold_store', manager: 'كابتن محمود' },
    { id: 'wh-proc', name: 'عنبر التقطيع والتجهيز', type: 'processing', manager: 'شيف مصطفى' },
    { id: 'wh-br1', name: 'فرع مبيعات مدينة نصر', type: 'branch', manager: 'أ/ سامح' },
    { id: 'wh-van1', name: 'سيارة توزيع شمال القاهرة 01', type: 'van', manager: 'سائق/ عماد' }
  ]

  it('should fallback to top 4 catalog items when no pinned items exist in localStorage', () => {
    const pinned = resolvePinnedItems(null, sampleItems)
    assert.strictEqual(pinned.length, 4)
    assert.strictEqual(pinned[0].id, 'item-1')
    assert.strictEqual(pinned[3].id, 'item-4')
  })

  it('should load user configured pinned items from valid JSON in storage', () => {
    const stored = JSON.stringify(['item-2', 'item-5'])
    const pinned = resolvePinnedItems(stored, sampleItems)
    assert.strictEqual(pinned.length, 2)
    assert.strictEqual(pinned[0].id, 'item-2')
    assert.strictEqual(pinned[1].id, 'item-5')
  })

  it('should aggregate item stock across all warehouses and calculate total quantity', () => {
    const item = sampleItems[0] // item-1
    const inventoryStock = [
      { warehouseId: 'wh-main', itemId: 'item-1', quantity: 200, unit: 'كرتونة' },
      { warehouseId: 'wh-proc', itemId: 'item-1', quantity: 50, unit: 'كرتونة' },
      { warehouseId: 'wh-br1', itemId: 'item-1', quantity: 20, unit: 'كرتونة' },
      { warehouseId: 'wh-van1', itemId: 'item-1', quantity: 10, unit: 'كرتونة' }
    ]

    const result = aggregateItemDrilldown(item, sampleWarehouses, inventoryStock)
    assert.strictEqual(result.totalQuantity, 280)
    assert.strictEqual(result.byWarehouse.length, 4)
  })

  it('should calculate accurate stock share percentage per warehouse', () => {
    const item = sampleItems[0] // total = 200
    const inventoryStock = [
      { warehouseId: 'wh-main', itemId: 'item-1', quantity: 150 }, // 150/200 = 75%
      { warehouseId: 'wh-br1', itemId: 'item-1', quantity: 50 }     // 50/200 = 25%
    ]

    const result = aggregateItemDrilldown(item, sampleWarehouses, inventoryStock)
    const mainWh = result.byWarehouse.find((w) => w.warehouseId === 'wh-main')
    const brWh = result.byWarehouse.find((w) => w.warehouseId === 'wh-br1')
    const vanWh = result.byWarehouse.find((w) => w.warehouseId === 'wh-van1')

    assert.strictEqual(mainWh.sharePercentage, 75)
    assert.strictEqual(mainWh.status, 'healthy')
    assert.strictEqual(brWh.sharePercentage, 25)
    assert.strictEqual(brWh.status, 'healthy')
    assert.strictEqual(vanWh.quantity, 0)
    assert.strictEqual(vanWh.sharePercentage, 0)
    assert.strictEqual(vanWh.status, 'out')
  })

  it('should classify warehouse types correctly (branch vs cold store vs van)', () => {
    const item = sampleItems[1]
    const inventoryStock = [
      { warehouseId: 'wh-main', itemId: 'item-2', quantity: 100 },
      { warehouseId: 'wh-br1', itemId: 'item-2', quantity: 15 }
    ]

    const result = aggregateItemDrilldown(item, sampleWarehouses, inventoryStock)
    const cold = result.byWarehouse.find((w) => w.warehouseId === 'wh-main')
    const branch = result.byWarehouse.find((w) => w.warehouseId === 'wh-br1')
    const van = result.byWarehouse.find((w) => w.warehouseId === 'wh-van1')

    assert.strictEqual(cold.isColdStore, true)
    assert.strictEqual(branch.isBranch, true)
    assert.strictEqual(van.isVan, true)
    assert.strictEqual(branch.status, 'low', '15 units should be low stock')
  })

  it('should calculate packaging breakdown: cartons, pieces, and total weight in kg', () => {
    const item = sampleItems[0] // piecesPerCarton: 12, weightPerCarton: 10 kg
    const inventoryStock = [
      { warehouseId: 'wh-main', itemId: 'item-1', quantity: 150 }
    ]

    const result = aggregateItemDrilldown(item, sampleWarehouses, inventoryStock)
    assert.strictEqual(result.packagingSummary.totalCartons, 150)
    assert.strictEqual(result.packagingSummary.totalPieces, 1800, '150 cartons * 12 pieces = 1800')
    assert.strictEqual(result.packagingSummary.totalWeightKg, 1500, '150 cartons * 10 kg = 1500 kg')
  })
})
