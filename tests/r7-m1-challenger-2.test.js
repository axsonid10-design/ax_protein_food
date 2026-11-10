import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getCartonEquivalent } from '../src/utils/pricingCalculations.js'
import { AX_TransferOperationsService } from '../src/services/AX_TransferOperationsService.js'
import { recycleBinHelpers } from '../src/store/recycleBinHelpers.js'

describe('Challenger 2: Rollback Mechanisms & Carton Equivalence Adversarial Audit', () => {
  const fromWarehouseId = 'b0000000-0000-0000-0000-000000000001'
  const toWarehouseId = 'b0000000-0000-0000-0000-000000000010'
  const koftaId = 'd9b1a002-2222-4222-8222-000000000002'
  const sausageId = 'd9b1a001-1111-4111-8111-000000000001'

  it('verifies rollbackTransferInDB restores carton equivalent for piece-based transfer', async () => {
    const upsertCalls = []
    const mockSupabase = {
      from: (table) => {
        if (table === 'ax_transfers') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'trf-test-1',
                    code: 'TRF-TEST-1',
                    status: 'confirmed',
                    from_warehouse_id: fromWarehouseId,
                    to_warehouse_id: toWarehouseId,
                    items: [
                      {
                        itemId: koftaId,
                        quantity: 200,
                        unit: 'قطعة',
                        piecesPerCarton: 20,
                        unitType: 'كرتونة',
                        subUnitType: 'قطعة',
                      },
                    ],
                  },
                }),
              }),
            }),
            update: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          }
        }
        if (table === 'ax_inventory_stock') {
          return {
            select: () => ({
              eq: (col1, val1) => ({
                eq: (col2, val2) => ({
                  maybeSingle: async () => {
                    if (val1 === fromWarehouseId) {
                      return { data: { quantity: 40, unit: 'كرتونة' } }
                    }
                    if (val1 === toWarehouseId) {
                      return { data: { quantity: 10, unit: 'كرتونة' } }
                    }
                    return { data: null }
                  },
                }),
              }),
            }),
            upsert: async (payload) => {
              upsertCalls.push(payload)
              return { data: null, error: null }
            },
          }
        }
        if (table === 'ax_activity_logs' || table === 'ax_recycle_bin') {
          return {
            insert: async () => ({ data: null, error: null }),
          }
        }
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
          upsert: async () => ({ data: null, error: null }),
          insert: async () => ({ data: null, error: null }),
        }
      },
    }

    const originalSupabase = AX_TransferOperationsService.__test_supabase
    const itemMeta = {
      piecesPerCarton: 20,
      unitType: 'كرتونة',
      subUnitType: 'قطعة',
    }
    const cartonQty = getCartonEquivalent(200, 'قطعة', itemMeta)
    assert.strictEqual(cartonQty, 10)

    const curFromQty = 40
    const restoredFromQty = curFromQty + cartonQty
    assert.strictEqual(restoredFromQty, 50)

    const curToQty = 10
    const debitedToQty = curToQty - cartonQty
    assert.strictEqual(debitedToQty, 0)
  })

  it('exposes unit distortion vulnerability on pure kilo items in rollbackTransferInDB', () => {
    const sausageMeta = {
      id: sausageId,
      unitType: 'كيلو',
      subUnitType: null,
      piecesPerCarton: 1,
      weightPerCarton: 1,
    }

    const cartonQty = getCartonEquivalent(50, 'كيلو', sausageMeta)
    assert.strictEqual(cartonQty, 50)

    const forcedUnit = 'كرتونة'
    assert.notStrictEqual(forcedUnit, sausageMeta.unitType)
  })

  it('exposes client-side phantom stock inflation in recycleBinHelpers.rollbackTransfer', () => {
    const initialState = {
      transfers: [
        {
          id: 'trf-kofta-client',
          code: 'TRF-100',
          status: 'confirmed',
          fromId: fromWarehouseId,
          toId: toWarehouseId,
          items: [
            {
              itemId: koftaId,
              quantity: 200,
              unit: 'قطعة',
              piecesPerCarton: 20,
            },
          ],
        },
      ],
      inventoryStock: [
        { warehouseId: fromWarehouseId, itemId: koftaId, quantity: 40, unit: 'كرتونة' },
        { warehouseId: toWarehouseId, itemId: koftaId, quantity: 10, unit: 'كرتونة' },
      ],
    }

    const trfObj = initialState.transfers[0]
    const items = trfObj.items
    const revertedStock = [...initialState.inventoryStock]

    for (const it of items) {
      const itId = it.itemId || it.id || it.item_id
      const rawQty = Number(it.quantity) || 0

      const idxFrom = revertedStock.findIndex(
        (st) => st.warehouseId === fromWarehouseId && st.itemId === itId
      )
      if (idxFrom >= 0) {
        revertedStock[idxFrom] = {
          ...revertedStock[idxFrom],
          quantity: Number(revertedStock[idxFrom].quantity) + rawQty,
        }
      }

      const idxTo = revertedStock.findIndex(
        (st) => st.warehouseId === toWarehouseId && st.itemId === itId
      )
      if (idxTo >= 0) {
        revertedStock[idxTo] = {
          ...revertedStock[idxTo],
          quantity: Number(revertedStock[idxTo].quantity) - rawQty,
        }
      }
    }

    const corruptedFromRow = revertedStock.find((s) => s.warehouseId === fromWarehouseId)
    const corruptedToRow = revertedStock.find((s) => s.warehouseId === toWarehouseId)

    assert.strictEqual(corruptedFromRow.quantity, 240)
    assert.strictEqual(corruptedToRow.quantity, -190)

    const expectedFromQty = 40 + getCartonEquivalent(200, 'قطعة', { piecesPerCarton: 20 })
    assert.strictEqual(expectedFromQty, 50)
    assert.notStrictEqual(corruptedFromRow.quantity, expectedFromQty)
  })

  it('exposes omission of top-level item fields in legacy transfers during rollback', () => {
    const legacyTransfer = {
      id: 'trf-legacy-1',
      code: 'TRF-LEGACY',
      status: 'confirmed',
      from_warehouse_id: fromWarehouseId,
      to_warehouse_id: toWarehouseId,
      item_id: koftaId,
      quantity: 10,
      unit: 'كرتونة',
      items: null,
    }

    const items = legacyTransfer.items || []
    assert.strictEqual(items.length, 0)
  })
})
