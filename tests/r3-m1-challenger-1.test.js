import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  executeImmediateTransfer,
  recoverUnappliedTransfers,
  calculateTransferStockMovement,
} from '../src/store/transferHelpers.js'

describe('Challenger 1 Adversarial Stress Suite: Warehouse Transfers & Recovery', () => {
  const warehouseAlpha = 'wh-alpha-001'
  const warehouseBeta = 'wh-beta-002'
  const warehouseGamma = 'wh-gamma-003'
  const shopWarehouseId = 'b9fd5e22-324c-4399-9b3c-9dd100638280'

  const mock11TransferItems = [
    { itemId: '0283bc5d-1a56-4af3-8d2c-19828f8280e8', quantity: 38, unit: 'كرتونة', name: 'رنجه مارينا' },
    { itemId: 'f88c81a9-591d-427d-99d5-4dafa0445af4', quantity: 15, unit: 'كرتونة', name: 'برجر كيلو صلاح وعبدالفتاح' },
    { itemId: 'd9b1a001-1111-4111-8111-000000000001', quantity: 80, unit: 'كيلو', name: 'سجق أنس أفندى' },
    { itemId: 'd9b1a003-3333-4333-8333-000000000003', quantity: 3, unit: 'كرتونة', name: 'سمك ياباني' },
    { itemId: '5928de0e-1394-4f17-a18f-08c42639e756', quantity: 10, unit: 'كرتونة', name: 'سمك مكرونه وسط' },
    { itemId: '1384c44f-53bc-4cf0-968d-038789f8c731', quantity: 10, unit: 'كرتونة', name: 'لحمه رقبه ألانا' },
    { itemId: 'f181fd34-bc11-45c7-8e73-8426b5a310d3', quantity: 10, unit: 'كرتونة', name: 'لحمه سن ألانا' },
    { itemId: 'b5a4bd96-120a-415b-8979-cf1ba52d2129', quantity: 10, unit: 'كرتونة', name: 'لحمه كتف ألانا' },
    { itemId: '16ee02e8-7ba4-4dbc-b489-6d38723592b0', quantity: 1, unit: 'كرتونة', name: 'استربس صلاح وعبدالفتاح' },
    { itemId: '33cd94a4-17d7-4685-8372-ab24fad50220', quantity: 10, unit: 'كرتونة', name: 'لحمه صدر ألانا' },
  ]

  const mockLiverTransferItem = [
    { itemId: '7f8798e9-1e99-42ee-bbab-82656b7f3c0c', quantity: 25, unit: 'كرتونة', name: 'كبده هندى ألانا' },
  ]

  describe('executeImmediateTransfer: Multiple Items & Auto-Provisioning', () => {
    it('should accurately decrement source and auto-provision missing destination rows', async () => {
      const payload = {
        fromWarehouseId: warehouseAlpha,
        toWarehouseId: warehouseBeta,
        items: [
          { itemId: 'item-beef', quantity: 14.5, unit: 'كرتونة', name: 'لحم بقري' },
          { itemId: 'item-chicken', quantity: 20, unit: 'كرتونة', name: 'دجاج مجمد' },
          { itemId: 'item-kofta', quantity: 35.25, unit: 'كيلو', name: 'كفتة مشوية' },
          { itemId: 'item-shrimp', quantity: 8.75, unit: 'كرتونة', name: 'جمبري' },
        ],
        notes: 'تحويل أصناف متعددة',
        userName: 'المدير الفني',
      }

      const currentState = {
        inventoryStock: [
          { warehouseId: warehouseAlpha, itemId: 'item-beef', quantity: 100, unit: 'كرتونة' },
          { warehouseId: warehouseAlpha, itemId: 'item-chicken', quantity: 50, unit: 'كرتونة' },
          { warehouseId: warehouseAlpha, itemId: 'item-kofta', quantity: 80, unit: 'كيلو' },
          { warehouseId: warehouseAlpha, itemId: 'item-shrimp', quantity: 20, unit: 'كرتونة' },
          { warehouseId: warehouseBeta, itemId: 'item-beef', quantity: 10, unit: 'كرتونة' },
        ],
        stockAudits: [],
        warehouses: [
          { id: warehouseAlpha, name: 'المخزن أ' },
          { id: warehouseBeta, name: 'المخزن ب' },
        ],
      }

      const result = await executeImmediateTransfer(payload, currentState)

      assert.strictEqual(result.success, true)
      assert.strictEqual(result.transfer.status, 'confirmed')
      assert.strictEqual(result.transfer.items.length, 4)

      const getQty = (wId, iId) =>
        result.updatedStock.find((s) => s.warehouseId === wId && s.itemId === iId)?.quantity

      assert.strictEqual(getQty(warehouseAlpha, 'item-beef'), 85.5)
      assert.strictEqual(getQty(warehouseAlpha, 'item-chicken'), 30)
      assert.strictEqual(getQty(warehouseAlpha, 'item-kofta'), 44.75)
      assert.strictEqual(getQty(warehouseAlpha, 'item-shrimp'), 11.25)

      assert.strictEqual(getQty(warehouseBeta, 'item-beef'), 24.5)
      assert.strictEqual(getQty(warehouseBeta, 'item-chicken'), 20)
      assert.strictEqual(getQty(warehouseBeta, 'item-kofta'), 35.25)
      assert.strictEqual(getQty(warehouseBeta, 'item-shrimp'), 8.75)

      const chickenRow = result.updatedStock.find((s) => s.warehouseId === warehouseBeta && s.itemId === 'item-chicken')
      assert.strictEqual(chickenRow.unit, 'كرتونة')
      const koftaRow = result.updatedStock.find((s) => s.warehouseId === warehouseBeta && s.itemId === 'item-kofta')
      assert.strictEqual(koftaRow.unit, 'كيلو')
    })
  })

  describe('executeImmediateTransfer: Zero, Negative & Malformed Quantities', () => {
    it('should ignore non-positive quantities and process only valid items', async () => {
      const payload = {
        fromWarehouseId: warehouseAlpha,
        toWarehouseId: warehouseBeta,
        items: [
          { itemId: 'item-valid-1', quantity: 15, unit: 'كرتونة' },
          { itemId: 'item-zero', quantity: 0, unit: 'كرتونة' },
          { itemId: 'item-neg', quantity: -5, unit: 'كرتونة' },
          { itemId: 'item-null', quantity: null, unit: 'كرتونة' },
          { itemId: 'item-undef', quantity: undefined, unit: 'كرتونة' },
          { itemId: 'item-nan', quantity: 'not_a_number', unit: 'كرتونة' },
          { itemId: 'item-valid-2', quantity: '7.5', unit: 'كيلو' },
        ],
      }

      const currentState = {
        inventoryStock: [
          { warehouseId: warehouseAlpha, itemId: 'item-valid-1', quantity: 50, unit: 'كرتونة' },
          { warehouseId: warehouseAlpha, itemId: 'item-zero', quantity: 20, unit: 'كرتونة' },
          { warehouseId: warehouseAlpha, itemId: 'item-neg', quantity: 30, unit: 'كرتونة' },
          { warehouseId: warehouseAlpha, itemId: 'item-valid-2', quantity: 25, unit: 'كيلو' },
          { warehouseId: warehouseBeta, itemId: 'item-zero', quantity: 10, unit: 'كرتونة' },
        ],
        stockAudits: [],
        warehouses: [],
      }

      const result = await executeImmediateTransfer(payload, currentState)

      assert.strictEqual(result.success, true)
      assert.strictEqual(result.transfer.items.length, 2)

      const getQty = (wId, iId) =>
        result.updatedStock.find((s) => s.warehouseId === wId && s.itemId === iId)?.quantity

      assert.strictEqual(getQty(warehouseAlpha, 'item-valid-1'), 35)
      assert.strictEqual(getQty(warehouseAlpha, 'item-valid-2'), 17.5)
      assert.strictEqual(getQty(warehouseAlpha, 'item-zero'), 20)
      assert.strictEqual(getQty(warehouseAlpha, 'item-neg'), 30)

      assert.strictEqual(getQty(warehouseBeta, 'item-valid-1'), 15)
      assert.strictEqual(getQty(warehouseBeta, 'item-valid-2'), 7.5)
      assert.strictEqual(getQty(warehouseBeta, 'item-zero'), 10)

      assert.strictEqual(result.updatedStock.some((s) => s.itemId === 'item-neg' && s.warehouseId === warehouseBeta), false)
      assert.strictEqual(result.updatedStock.some((s) => s.itemId === 'item-nan'), false)
    })

    it('should fail with error if all items have non-positive quantities', async () => {
      const payload = {
        fromWarehouseId: warehouseAlpha,
        toWarehouseId: warehouseBeta,
        items: [
          { itemId: 'item-1', quantity: 0 },
          { itemId: 'item-2', quantity: -10 },
          { itemId: 'item-3', quantity: 'invalid' },
        ],
      }

      const result = await executeImmediateTransfer(payload, { inventoryStock: [] })
      assert.strictEqual(result.success, false)
      assert.strictEqual(result.error, 'No items selected')
    })
  })

  describe('executeImmediateTransfer: Simultaneous & Sequential Quantity Accumulation', () => {
    it('should accumulate quantities correctly across multiple sequential transfers to same destination', async () => {
      let state = {
        inventoryStock: [
          { warehouseId: warehouseAlpha, itemId: 'item-sausage', quantity: 200, unit: 'كيلو' },
          { warehouseId: warehouseBeta, itemId: 'item-sausage', quantity: 150, unit: 'كيلو' },
          { warehouseId: warehouseGamma, itemId: 'item-sausage', quantity: 0, unit: 'كيلو' },
        ],
        stockAudits: [],
        warehouses: [
          { id: warehouseAlpha, name: 'المخزن أ' },
          { id: warehouseBeta, name: 'المخزن ب' },
          { id: warehouseGamma, name: 'مخزن الوجهة' },
        ],
      }

      const transfer1 = await executeImmediateTransfer(
        {
          fromWarehouseId: warehouseAlpha,
          toWarehouseId: warehouseGamma,
          items: [{ itemId: 'item-sausage', quantity: 45.5, unit: 'كيلو' }],
        },
        state
      )
      assert.strictEqual(transfer1.success, true)
      state = { ...state, inventoryStock: transfer1.updatedStock }

      const transfer2 = await executeImmediateTransfer(
        {
          fromWarehouseId: warehouseBeta,
          toWarehouseId: warehouseGamma,
          items: [{ itemId: 'item-sausage', quantity: 30.25, unit: 'كيلو' }],
        },
        state
      )
      assert.strictEqual(transfer2.success, true)
      state = { ...state, inventoryStock: transfer2.updatedStock }

      const transfer3 = await executeImmediateTransfer(
        {
          fromWarehouseId: warehouseAlpha,
          toWarehouseId: warehouseGamma,
          items: [{ itemId: 'item-sausage', quantity: 24.25, unit: 'كيلو' }],
        },
        state
      )
      assert.strictEqual(transfer3.success, true)
      state = { ...state, inventoryStock: transfer3.updatedStock }

      const getQty = (wId, iId) =>
        state.inventoryStock.find((s) => s.warehouseId === wId && s.itemId === iId)?.quantity

      assert.strictEqual(getQty(warehouseAlpha, 'item-sausage'), 130.25)
      assert.strictEqual(getQty(warehouseBeta, 'item-sausage'), 119.75)
      assert.strictEqual(getQty(warehouseGamma, 'item-sausage'), 100)

      const gammaRows = state.inventoryStock.filter(
        (s) => s.warehouseId === warehouseGamma && s.itemId === 'item-sausage'
      )
      assert.strictEqual(gammaRows.length, 1)
    })
  })

  describe('recoverUnappliedTransfers: 3-Run Idempotency & Exact 11 Items Crediting', () => {
    it('should credit all 11 items on run 1 and strictly 0 items on runs 2 and 3', async () => {
      const initialTransfers = [
        {
          id: 'trf-43863-test',
          code: 'TRF-43863',
          fromId: warehouseAlpha,
          toId: shopWarehouseId,
          status: 'confirmed',
          items: mock11TransferItems,
        },
        {
          id: 'trf-77489-test',
          code: 'TRF-77489',
          fromId: warehouseAlpha,
          toId: shopWarehouseId,
          status: 'confirmed',
          items: mockLiverTransferItem,
        },
      ]

      const initialStock = [
        { warehouseId: shopWarehouseId, itemId: '0283bc5d-1a56-4af3-8d2c-19828f8280e8', quantity: 0, unit: 'كرتونة' },
        { warehouseId: shopWarehouseId, itemId: 'f88c81a9-591d-427d-99d5-4dafa0445af4', quantity: 3, unit: 'كرتونة' },
        { warehouseId: shopWarehouseId, itemId: 'd9b1a001-1111-4111-8111-000000000001', quantity: 40, unit: 'كيلو' },
        { warehouseId: shopWarehouseId, itemId: 'd9b1a003-3333-4333-8333-000000000003', quantity: 3, unit: 'كرتونة' },
        { warehouseId: shopWarehouseId, itemId: '5928de0e-1394-4f17-a18f-08c42639e756', quantity: 4, unit: 'كرتونة' },
        { warehouseId: shopWarehouseId, itemId: '16ee02e8-7ba4-4dbc-b489-6d38723592b0', quantity: 5, unit: 'كرتونة' },
        { warehouseId: shopWarehouseId, itemId: '33cd94a4-17d7-4685-8372-ab24fad50220', quantity: 4, unit: 'كرتونة' },
      ]

      const run1 = await recoverUnappliedTransfers([], initialTransfers, initialStock)

      assert.strictEqual(run1.recoveredTransfersCount, 2)
      assert.strictEqual(run1.creditedItemsCount, 11)

      const findStockRun1 = (itemId) =>
        run1.updatedStock.find((s) => s.warehouseId === shopWarehouseId && s.itemId === itemId)?.quantity

      assert.strictEqual(findStockRun1('0283bc5d-1a56-4af3-8d2c-19828f8280e8'), 38)
      assert.strictEqual(findStockRun1('f88c81a9-591d-427d-99d5-4dafa0445af4'), 18)
      assert.strictEqual(findStockRun1('d9b1a001-1111-4111-8111-000000000001'), 120)
      assert.strictEqual(findStockRun1('d9b1a003-3333-4333-8333-000000000003'), 6)
      assert.strictEqual(findStockRun1('5928de0e-1394-4f17-a18f-08c42639e756'), 14)
      assert.strictEqual(findStockRun1('1384c44f-53bc-4cf0-968d-038789f8c731'), 10)
      assert.strictEqual(findStockRun1('f181fd34-bc11-45c7-8e73-8426b5a310d3'), 10)
      assert.strictEqual(findStockRun1('b5a4bd96-120a-415b-8979-cf1ba52d2129'), 10)
      assert.strictEqual(findStockRun1('16ee02e8-7ba4-4dbc-b489-6d38723592b0'), 6)
      assert.strictEqual(findStockRun1('33cd94a4-17d7-4685-8372-ab24fad50220'), 14)
      assert.strictEqual(findStockRun1('7f8798e9-1e99-42ee-bbab-82656b7f3c0c'), 25)

      const run2 = await recoverUnappliedTransfers([], initialTransfers, run1.updatedStock)

      assert.strictEqual(run2.recoveredTransfersCount, 0)
      assert.strictEqual(run2.creditedItemsCount, 0)
      assert.strictEqual(run2.updatedStock.length, run1.updatedStock.length)

      const findStockRun2 = (itemId) =>
        run2.updatedStock.find((s) => s.warehouseId === shopWarehouseId && s.itemId === itemId)?.quantity

      assert.strictEqual(findStockRun2('0283bc5d-1a56-4af3-8d2c-19828f8280e8'), 38)
      assert.strictEqual(findStockRun2('f88c81a9-591d-427d-99d5-4dafa0445af4'), 18)
      assert.strictEqual(findStockRun2('d9b1a001-1111-4111-8111-000000000001'), 120)
      assert.strictEqual(findStockRun2('7f8798e9-1e99-42ee-bbab-82656b7f3c0c'), 25)

      const run3 = await recoverUnappliedTransfers([], initialTransfers, run2.updatedStock)

      assert.strictEqual(run3.recoveredTransfersCount, 0)
      assert.strictEqual(run3.creditedItemsCount, 0)
      assert.strictEqual(run3.updatedStock.length, run1.updatedStock.length)

      const findStockRun3 = (itemId) =>
        run3.updatedStock.find((s) => s.warehouseId === shopWarehouseId && s.itemId === itemId)?.quantity

      assert.strictEqual(findStockRun3('0283bc5d-1a56-4af3-8d2c-19828f8280e8'), 38)
      assert.strictEqual(findStockRun3('f88c81a9-591d-427d-99d5-4dafa0445af4'), 18)
      assert.strictEqual(findStockRun3('d9b1a001-1111-4111-8111-000000000001'), 120)
      assert.strictEqual(findStockRun3('7f8798e9-1e99-42ee-bbab-82656b7f3c0c'), 25)
    })

    it('should respect recovery flags from notes, isRecovered, and recoveredAt defensively', async () => {
      const transferWithNote = [
        {
          id: 'trf-note-id',
          code: 'TRF-43863',
          fromId: warehouseAlpha,
          toId: shopWarehouseId,
          status: 'confirmed',
          notes: 'ملاحظة تحويل • [تم استرداد الرصيد المفقود وتسويته بنجاح]',
          items: [{ itemId: 'item-a', quantity: 10, unit: 'كرتونة' }],
        },
      ]

      const resNote = await recoverUnappliedTransfers([], transferWithNote, [])
      assert.strictEqual(resNote.recoveredTransfersCount, 0)
      assert.strictEqual(resNote.creditedItemsCount, 0)

      const transferWithFlag = [
        {
          id: 'trf-flag-id',
          code: 'TRF-77489',
          fromId: warehouseAlpha,
          toId: shopWarehouseId,
          status: 'confirmed',
          isRecovered: true,
          items: [{ itemId: 'item-b', quantity: 15, unit: 'كرتونة' }],
        },
      ]

      const resFlag = await recoverUnappliedTransfers([], transferWithFlag, [])
      assert.strictEqual(resFlag.recoveredTransfersCount, 0)
      assert.strictEqual(resFlag.creditedItemsCount, 0)

      const transferWithTimestamp = [
        {
          id: 'trf-time-id',
          code: 'TRF-43863',
          fromId: warehouseAlpha,
          toId: shopWarehouseId,
          status: 'confirmed',
          recoveredAt: '2026-11-06T06:50:00Z',
          items: [{ itemId: 'item-c', quantity: 20, unit: 'كرتونة' }],
        },
      ]

      const resTime = await recoverUnappliedTransfers([], transferWithTimestamp, [])
      assert.strictEqual(resTime.recoveredTransfersCount, 0)
      assert.strictEqual(resTime.creditedItemsCount, 0)
    })
  })
})
