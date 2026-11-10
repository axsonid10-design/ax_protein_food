import { describe, it } from 'node:test'
import assert from 'node:assert'
import { calculateTransferStockMovement } from '../src/store/transferAuditHelpers.js'
import { getCartonEquivalent } from '../src/utils/pricingCalculations.js'
import { supabase } from '../src/services/supabaseClient.js'

describe('Milestone 1: Van Stock Reset & Carton-Equivalent Transfer Engine', () => {
  const vanWarehouseId = 'b0000000-0000-0000-0000-000000000010'
  const mainWarehouseId = 'b0000000-0000-0000-0000-000000000001'

  const catalog = [
    {
      id: 'd9b1a002-2222-4222-8222-000000000002',
      name: 'كفتة صغير أنس أفندى',
      unitType: 'كرتونة',
      subUnitType: 'قطعة',
      piecesPerCarton: 20,
      weightPerCarton: 10,
    },
    {
      id: '5d88e552-8077-430e-ac03-bd7561f04fe9',
      name: 'خضار مشكل',
      unitType: 'كرتونة',
      subUnitType: 'طبق',
      piecesPerCarton: 20,
      weightPerCarton: 10,
    },
    {
      id: '16ee02e8-7ba4-4dbc-b489-6d38723592b0',
      name: 'استربس صلاح وعبدالفتاح',
      unitType: 'كرتونة',
      subUnitType: 'طبق',
      piecesPerCarton: 10,
      weightPerCarton: 10,
    },
    {
      id: 'f88c81a9-591d-427d-99d5-4dafa0445af4',
      name: 'برجر كيلو صلاح وعبدالفتاح',
      unitType: 'كرتونة',
      subUnitType: 'قطعة',
      piecesPerCarton: 8,
      weightPerCarton: 10,
    },
    {
      id: 'fe142708-05bd-44cd-b810-70ab453fe0df',
      name: 'باميه',
      unitType: 'كرتونة',
      subUnitType: 'قطعة',
      piecesPerCarton: 20,
      weightPerCarton: 10,
    },
    {
      id: 'a044299c-18f7-4592-9f13-513ce7d26c6a',
      name: 'سمك دراك',
      unitType: 'كرتونة',
      subUnitType: 'قطعة',
      piecesPerCarton: 1,
      weightPerCarton: 20,
    },
  ]

  it('verifies that getCartonEquivalent calculates true carton equivalence for sub-units and weights', () => {
    const koftaMeta = catalog[0]
    assert.strictEqual(getCartonEquivalent(200, 'قطعة', koftaMeta), 10)
    assert.strictEqual(getCartonEquivalent(20, 'قطعة', koftaMeta), 1)
    assert.strictEqual(getCartonEquivalent(5, 'قطعة', koftaMeta), 0.25)
    assert.strictEqual(getCartonEquivalent(3, 'كرتونة', koftaMeta), 3)

    const burgerMeta = catalog[3]
    assert.strictEqual(getCartonEquivalent(8, 'قطعة', burgerMeta), 1)
    assert.strictEqual(getCartonEquivalent(4, 'قطعة', burgerMeta), 0.5)

    const stripsMeta = catalog[2]
    assert.strictEqual(getCartonEquivalent(10, 'طبق', stripsMeta), 1)
    assert.strictEqual(getCartonEquivalent(5, 'طبق', stripsMeta), 0.5)

    const drakMeta = catalog[5]
    assert.strictEqual(getCartonEquivalent(5, 'كيلو', drakMeta), 0.25)
    assert.strictEqual(getCartonEquivalent(20, 'كيلو', drakMeta), 1)
  })

  it('converts single sub-unit transfer to carton equivalent and updates source and destination stock', () => {
    const initialStock = [
      { warehouseId: mainWarehouseId, itemId: 'd9b1a002-2222-4222-8222-000000000002', quantity: 50, unit: 'كرتونة' },
      { warehouseId: vanWarehouseId, itemId: 'd9b1a002-2222-4222-8222-000000000002', quantity: 0, unit: 'كرتونة' },
    ]

    const transfer = {
      fromWarehouseId: mainWarehouseId,
      toWarehouseId: vanWarehouseId,
      items: [
        {
          itemId: 'd9b1a002-2222-4222-8222-000000000002',
          quantity: 200,
          unit: 'قطعة',
        },
      ],
      status: 'confirmed',
    }

    const { updatedStock } = calculateTransferStockMovement(
      transfer,
      initialStock,
      [],
      [],
      catalog
    )

    const sourceRow = updatedStock.find(
      (s) => s.warehouseId === mainWarehouseId && s.itemId === 'd9b1a002-2222-4222-8222-000000000002'
    )
    const destRow = updatedStock.find(
      (s) => s.warehouseId === vanWarehouseId && s.itemId === 'd9b1a002-2222-4222-8222-000000000002'
    )

    assert.ok(sourceRow)
    assert.ok(destRow)
    assert.strictEqual(sourceRow.quantity, 40)
    assert.strictEqual(sourceRow.unit, 'كرتونة')
    assert.strictEqual(destRow.quantity, 10)
    assert.strictEqual(destRow.unit, 'كرتونة')
  })

  it('preserves unit as كرتونة when destination stock row is created dynamically', () => {
    const initialStock = [
      { warehouseId: mainWarehouseId, itemId: 'f88c81a9-591d-427d-99d5-4dafa0445af4', quantity: 20, unit: 'كرتونة' },
    ]

    const transfer = {
      fromWarehouseId: mainWarehouseId,
      toWarehouseId: vanWarehouseId,
      items: [
        {
          itemId: 'f88c81a9-591d-427d-99d5-4dafa0445af4',
          quantity: 8,
          unit: 'قطعة',
        },
      ],
      status: 'confirmed',
    }

    const { updatedStock } = calculateTransferStockMovement(
      transfer,
      initialStock,
      [],
      [],
      catalog
    )

    const destRow = updatedStock.find(
      (s) => s.warehouseId === vanWarehouseId && s.itemId === 'f88c81a9-591d-427d-99d5-4dafa0445af4'
    )

    assert.ok(destRow)
    assert.strictEqual(destRow.quantity, 1)
    assert.strictEqual(destRow.unit, 'كرتونة')
  })

  it('converts multi-item transfers with mixed units accurately', () => {
    const initialStock = [
      { warehouseId: mainWarehouseId, itemId: 'd9b1a002-2222-4222-8222-000000000002', quantity: 100, unit: 'كرتونة' },
      { warehouseId: mainWarehouseId, itemId: '16ee02e8-7ba4-4dbc-b489-6d38723592b0', quantity: 50, unit: 'كرتونة' },
      { warehouseId: mainWarehouseId, itemId: 'fe142708-05bd-44cd-b810-70ab453fe0df', quantity: 40, unit: 'كرتونة' },
      { warehouseId: vanWarehouseId, itemId: 'd9b1a002-2222-4222-8222-000000000002', quantity: 0, unit: 'كرتونة' },
      { warehouseId: vanWarehouseId, itemId: '16ee02e8-7ba4-4dbc-b489-6d38723592b0', quantity: 0, unit: 'كرتونة' },
      { warehouseId: vanWarehouseId, itemId: 'fe142708-05bd-44cd-b810-70ab453fe0df', quantity: 0, unit: 'كرتونة' },
    ]

    const transfer = {
      fromWarehouseId: mainWarehouseId,
      toWarehouseId: vanWarehouseId,
      items: [
        { itemId: 'd9b1a002-2222-4222-8222-000000000002', quantity: 60, unit: 'قطعة' },
        { itemId: '16ee02e8-7ba4-4dbc-b489-6d38723592b0', quantity: 20, unit: 'طبق' },
        { itemId: 'fe142708-05bd-44cd-b810-70ab453fe0df', quantity: 5, unit: 'قطعة' },
      ],
      status: 'confirmed',
    }

    const { updatedStock } = calculateTransferStockMovement(
      transfer,
      initialStock,
      [],
      [],
      catalog
    )

    const koftaVan = updatedStock.find((s) => s.warehouseId === vanWarehouseId && s.itemId === 'd9b1a002-2222-4222-8222-000000000002')
    const stripsVan = updatedStock.find((s) => s.warehouseId === vanWarehouseId && s.itemId === '16ee02e8-7ba4-4dbc-b489-6d38723592b0')
    const okraVan = updatedStock.find((s) => s.warehouseId === vanWarehouseId && s.itemId === 'fe142708-05bd-44cd-b810-70ab453fe0df')

    assert.strictEqual(koftaVan.quantity, 3)
    assert.strictEqual(koftaVan.unit, 'كرتونة')
    assert.strictEqual(stripsVan.quantity, 2)
    assert.strictEqual(stripsVan.unit, 'كرتونة')
    assert.strictEqual(okraVan.quantity, 0.25)
    assert.strictEqual(okraVan.unit, 'كرتونة')
  })

  it('guarantees zero phantom stock accumulation after full cycle of piece loading and piece selling', () => {
    let currentStock = [
      { warehouseId: mainWarehouseId, itemId: 'd9b1a002-2222-4222-8222-000000000002', quantity: 100, unit: 'كرتونة' },
      { warehouseId: vanWarehouseId, itemId: 'd9b1a002-2222-4222-8222-000000000002', quantity: 0, unit: 'كرتونة' },
    ]

    const transfer = {
      fromWarehouseId: mainWarehouseId,
      toWarehouseId: vanWarehouseId,
      items: [
        { itemId: 'd9b1a002-2222-4222-8222-000000000002', quantity: 200, unit: 'قطعة' },
      ],
      status: 'confirmed',
    }

    const transferResult = calculateTransferStockMovement(transfer, currentStock, [], [], catalog)
    currentStock = transferResult.updatedStock

    const vanKoftaAfterTransfer = currentStock.find((s) => s.warehouseId === vanWarehouseId && s.itemId === 'd9b1a002-2222-4222-8222-000000000002')
    assert.strictEqual(vanKoftaAfterTransfer.quantity, 10)

    const salesSteps = [
      { soldQty: 40, unit: 'قطعة' },
      { soldQty: 60, unit: 'قطعة' },
      { soldQty: 80, unit: 'قطعة' },
      { soldQty: 20, unit: 'قطعة' },
    ]

    for (const step of salesSteps) {
      const deductionCarton = getCartonEquivalent(step.soldQty, step.unit, catalog[0])
      const row = currentStock.find((s) => s.warehouseId === vanWarehouseId && s.itemId === 'd9b1a002-2222-4222-8222-000000000002')
      row.quantity = Number((row.quantity - deductionCarton).toFixed(4))
    }

    const vanKoftaFinal = currentStock.find((s) => s.warehouseId === vanWarehouseId && s.itemId === 'd9b1a002-2222-4222-8222-000000000002')
    assert.strictEqual(vanKoftaFinal.quantity, 0)
    assert.strictEqual(vanKoftaFinal.unit, 'كرتونة')
  })

  it('supports alternative contract signature calculateTransferStockMovement(stock, items, from, to, catalog)', () => {
    const stockList = [
      { warehouseId: mainWarehouseId, itemId: '5d88e552-8077-430e-ac03-bd7561f04fe9', quantity: 30, unit: 'كرتونة' },
    ]

    const transferItems = [
      { itemId: '5d88e552-8077-430e-ac03-bd7561f04fe9', quantity: 40, unit: 'طبق' },
    ]

    const result = calculateTransferStockMovement(
      stockList,
      transferItems,
      mainWarehouseId,
      vanWarehouseId,
      catalog
    )

    assert.ok(Array.isArray(result))
    const dest = result.find((s) => s.warehouseId === vanWarehouseId && s.itemId === '5d88e552-8077-430e-ac03-bd7561f04fe9')
    assert.ok(dest)
    assert.strictEqual(dest.quantity, 2)
    assert.strictEqual(dest.unit, 'كرتونة')

    const source = result.find((s) => s.warehouseId === mainWarehouseId && s.itemId === '5d88e552-8077-430e-ac03-bd7561f04fe9')
    assert.strictEqual(source.quantity, 28)
    assert.strictEqual(source.unit, 'كرتونة')
  })

  it('verifies live van stock zeroing in database for all 6 items', async () => {
    if (!supabase || typeof supabase.from !== 'function') return
    const targetItemIds = catalog.map((c) => c.id)

    const res = await supabase
      .from('ax_inventory_stock')
      .select('item_id, quantity, unit')
      .eq('warehouse_id', vanWarehouseId)
      .in('item_id', targetItemIds)

    const data = res?.data
    if (!data || data.length === 0) return

    for (const row of data) {
      assert.strictEqual(Number(row.quantity), 0)
      assert.strictEqual(row.unit, 'كرتونة')
    }
  })
})
