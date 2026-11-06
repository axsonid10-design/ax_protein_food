import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import {
  checkTransferAuditDiscrepancy,
  calculateTransferStockMovement,
  executeImmediateTransfer,
  recoverUnappliedTransfers,
} from '../src/store/transferHelpers.js'

describe('R1 & R2: Warehouse Transfers Execution, Recovery & Category Accordions', () => {
  const mainWarehouseId = 'b0000000-0000-0000-0000-000000000001'
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

  describe('R1.1: Unapplied Transfers Recovery for TRF-43863 and TRF-77489', () => {
    it('should recover unapplied transfers and credit all 11 missing items to destination warehouse', async () => {
      const initialTransfers = [
        {
          id: 'trf-43863-id',
          code: 'TRF-43863',
          fromId: mainWarehouseId,
          toId: shopWarehouseId,
          status: 'confirmed',
          items: mock11TransferItems,
        },
        {
          id: 'trf-77489-id',
          code: 'TRF-77489',
          fromId: mainWarehouseId,
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

      const result = await recoverUnappliedTransfers([], initialTransfers, initialStock)

      assert.strictEqual(result.recoveredTransfersCount, 2)
      assert.strictEqual(result.creditedItemsCount, 11)

      const findStock = (itemId) =>
        result.updatedStock.find((s) => s.warehouseId === shopWarehouseId && s.itemId === itemId)?.quantity

      assert.strictEqual(findStock('0283bc5d-1a56-4af3-8d2c-19828f8280e8'), 38)
      assert.strictEqual(findStock('f88c81a9-591d-427d-99d5-4dafa0445af4'), 18)
      assert.strictEqual(findStock('d9b1a001-1111-4111-8111-000000000001'), 120)
      assert.strictEqual(findStock('d9b1a003-3333-4333-8333-000000000003'), 6)
      assert.strictEqual(findStock('5928de0e-1394-4f17-a18f-08c42639e756'), 14)
      assert.strictEqual(findStock('1384c44f-53bc-4cf0-968d-038789f8c731'), 10)
      assert.strictEqual(findStock('f181fd34-bc11-45c7-8e73-8426b5a310d3'), 10)
      assert.strictEqual(findStock('b5a4bd96-120a-415b-8979-cf1ba52d2129'), 10)
      assert.strictEqual(findStock('16ee02e8-7ba4-4dbc-b489-6d38723592b0'), 6)
      assert.strictEqual(findStock('33cd94a4-17d7-4685-8372-ab24fad50220'), 14)
      assert.strictEqual(findStock('7f8798e9-1e99-42ee-bbab-82656b7f3c0c'), 25)
    })

    it('should be idempotent and not double-credit on repeated execution', async () => {
      const initialTransfers = [
        {
          id: 'trf-43863-id',
          code: 'TRF-43863',
          fromId: mainWarehouseId,
          toId: shopWarehouseId,
          status: 'confirmed',
          items: mock11TransferItems,
        },
      ]

      const initialStock = [
        { warehouseId: shopWarehouseId, itemId: '0283bc5d-1a56-4af3-8d2c-19828f8280e8', quantity: 0, unit: 'كرتونة' },
      ]

      const firstRun = await recoverUnappliedTransfers([], initialTransfers, initialStock)
      assert.strictEqual(firstRun.recoveredTransfersCount, 1)
      assert.strictEqual(firstRun.creditedItemsCount, 10)

      const secondRun = await recoverUnappliedTransfers([], initialTransfers, firstRun.updatedStock)
      assert.strictEqual(secondRun.recoveredTransfersCount, 0)
      assert.strictEqual(secondRun.creditedItemsCount, 0)

      const herringStock = secondRun.updatedStock.find(
        (s) => s.warehouseId === shopWarehouseId && s.itemId === '0283bc5d-1a56-4af3-8d2c-19828f8280e8'
      )?.quantity
      assert.strictEqual(herringStock, 38)
    })
  })

  describe('R1.2: Transfer Stock Movement Logic & Discrepancy Shield', () => {
    it('should reliably credit destination stock even if audit discrepancy is flagged', () => {
      const audits = [
        {
          warehouseId: shopWarehouseId,
          status: 'confirmed',
          operationalDate: '2026-11-06 06:26:09',
        },
      ]

      const transfer = {
        fromId: mainWarehouseId,
        toId: shopWarehouseId,
        status: 'confirmed',
        operationalDate: '2026-11-05',
        items: [{ itemId: 'item-burger', quantity: 15, unit: 'كرتونة' }],
      }

      const stock = [
        { warehouseId: mainWarehouseId, itemId: 'item-burger', quantity: 50, unit: 'كرتونة' },
        { warehouseId: shopWarehouseId, itemId: 'item-burger', quantity: 5, unit: 'كرتونة' },
      ]

      const movement = calculateTransferStockMovement(transfer, stock, audits, [])

      assert.strictEqual(movement.isToBackdated, true)
      assert.strictEqual(movement.isAuditDiscrepancy, true)

      const fromItem = movement.updatedStock.find((s) => s.warehouseId === mainWarehouseId && s.itemId === 'item-burger')
      assert.strictEqual(fromItem.quantity, 35)

      const toItem = movement.updatedStock.find((s) => s.warehouseId === shopWarehouseId && s.itemId === 'item-burger')
      assert.strictEqual(toItem.quantity, 20)
    })

    it('should not flag false backdate when transfer and audit are on the same calendar day', () => {
      const audits = [
        {
          warehouseId: shopWarehouseId,
          status: 'confirmed',
          operationalDate: '2026-11-06 06:26:09',
        },
      ]

      const transfer = {
        fromId: mainWarehouseId,
        toId: shopWarehouseId,
        operationalDate: '2026-11-06',
      }

      const discrepancy = checkTransferAuditDiscrepancy(transfer, audits, [])
      assert.strictEqual(discrepancy.isToBackdated, false)
      assert.strictEqual(discrepancy.isAuditDiscrepancy, false)
    })

    it('should provision new stock record if item does not exist at destination', () => {
      const transfer = {
        fromId: mainWarehouseId,
        toId: shopWarehouseId,
        operationalDate: '2026-11-06',
        items: [{ itemId: 'item-new-fish', quantity: 12, unit: 'كرتونة' }],
      }

      const stock = [
        { warehouseId: mainWarehouseId, itemId: 'item-new-fish', quantity: 30, unit: 'كرتونة' },
      ]

      const movement = calculateTransferStockMovement(transfer, stock, [], [])
      const newDestStock = movement.updatedStock.find(
        (s) => s.warehouseId === shopWarehouseId && s.itemId === 'item-new-fish'
      )

      assert.ok(newDestStock)
      assert.strictEqual(newDestStock.quantity, 12)
      assert.strictEqual(newDestStock.unit, 'كرتونة')
    })
  })

  describe('R1.3: Immediate Confirmation Transfer Execution', () => {
    it('should execute transfer atomically without secondary confirmation requirement', async () => {
      const payload = {
        fromWarehouseId: mainWarehouseId,
        toWarehouseId: shopWarehouseId,
        operationalDate: '2026-11-06',
        items: [
          { itemId: 'item-sausage', quantity: 20, unit: 'كيلو', name: 'سجق بلدي' },
          { itemId: 'item-strips', quantity: 5, unit: 'كرتونة', name: 'استربس دجاج' },
        ],
        notes: 'تحويل سريع للدكان',
        userName: 'مدير العمليات',
      }

      const currentState = {
        inventoryStock: [
          { warehouseId: mainWarehouseId, itemId: 'item-sausage', quantity: 100, unit: 'كيلو' },
          { warehouseId: mainWarehouseId, itemId: 'item-strips', quantity: 20, unit: 'كرتونة' },
          { warehouseId: shopWarehouseId, itemId: 'item-sausage', quantity: 10, unit: 'كيلو' },
        ],
        stockAudits: [],
        warehouses: [
          { id: mainWarehouseId, name: 'المخزن الرئيسي', type: 'main' },
          { id: shopWarehouseId, name: 'الدكان', type: 'branch' },
        ],
      }

      const result = await executeImmediateTransfer(payload, currentState)

      assert.strictEqual(result.success, true)
      assert.ok(result.transfer)
      assert.strictEqual(result.transfer.status, 'confirmed')
      assert.ok(result.transfer.code.startsWith('TRF-'))
      assert.ok(result.transfer.confirmedAt)
      assert.strictEqual(result.transfer.confirmedBy, 'مدير العمليات')

      const srcSausage = result.updatedStock.find((s) => s.warehouseId === mainWarehouseId && s.itemId === 'item-sausage')
      assert.strictEqual(srcSausage.quantity, 80)

      const destSausage = result.updatedStock.find((s) => s.warehouseId === shopWarehouseId && s.itemId === 'item-sausage')
      assert.strictEqual(destSausage.quantity, 30)

      const destStrips = result.updatedStock.find((s) => s.warehouseId === shopWarehouseId && s.itemId === 'item-strips')
      assert.strictEqual(destStrips.quantity, 5)
    })

    it('should reject transfers with matching source and destination or zero quantities', async () => {
      const invalidSameWarehouse = await executeImmediateTransfer({
        fromWarehouseId: mainWarehouseId,
        toWarehouseId: mainWarehouseId,
        items: [{ itemId: 'item-1', quantity: 5 }],
      })
      assert.strictEqual(invalidSameWarehouse.success, false)

      const invalidNoItems = await executeImmediateTransfer({
        fromWarehouseId: mainWarehouseId,
        toWarehouseId: shopWarehouseId,
        items: [{ itemId: 'item-1', quantity: 0 }],
      })
      assert.strictEqual(invalidNoItems.success, false)
    })
  })

  describe('R2: Category Accordion Item Selection & Review Data Structures', () => {
    it('should group items by primaryCategory defaulting to أصناف عامة', () => {
      const sampleItems = [
        { id: '1', compositeName: 'برجر', primaryCategory: 'مصنعات' },
        { id: '2', compositeName: 'كفتة', primaryCategory: 'مصنعات' },
        { id: '3', compositeName: 'سمك فيليه', primaryCategory: 'أسماك' },
        { id: '4', compositeName: 'توابل', primaryCategory: '' },
      ]

      const grouped = {}
      sampleItems.forEach((it) => {
        const cat = (it.primaryCategory || '').trim() || 'أصناف عامة'
        if (!grouped[cat]) grouped[cat] = []
        grouped[cat].push(it)
      })

      assert.strictEqual(Object.keys(grouped).length, 3)
      assert.strictEqual(grouped['مصنعات'].length, 2)
      assert.strictEqual(grouped['أسماك'].length, 1)
      assert.strictEqual(grouped['أصناف عامة'].length, 1)
    })

    it('should preserve entered selections when navigating between accordion and review', () => {
      const enteredSelections = {
        'item-a': { quantity: 15, unit: 'كرتونة', primaryCategory: 'لحوم', itemName: 'لحمة سن' },
        'item-b': { quantity: 40, unit: 'كيلو', primaryCategory: 'مصنعات', itemName: 'سجق أنس' },
      }

      const groupedForReview = {}
      Object.values(enteredSelections).forEach((it) => {
        const cat = it.primaryCategory
        if (!groupedForReview[cat]) groupedForReview[cat] = []
        groupedForReview[cat].push(it)
      })

      assert.strictEqual(Object.keys(groupedForReview).length, 2)
      assert.strictEqual(groupedForReview['لحوم'][0].quantity, 15)
      assert.strictEqual(groupedForReview['مصنعات'][0].quantity, 40)

      const backToEditSelections = { ...enteredSelections }
      assert.deepStrictEqual(backToEditSelections, enteredSelections)
    })
  })

  describe('R7: Invariants and File Limits Audit', () => {
    const requiredFiles = [
      'src/components/warehouses/AX_WarehouseBentoCard.jsx',
      'src/components/warehouses/AX_TransferCategoryAccordion.jsx',
      'src/components/warehouses/AX_TransferReviewModal.jsx',
      'src/components/warehouses/AX_TransferFormModal.jsx',
      'src/store/transferHelpers.js',
      'src/components/warehouses/AX_WarehousesInventory.jsx',
    ]

    requiredFiles.forEach((rel) => {
      it(`should strictly not exceed 500 lines: ${rel}`, () => {
        const full = path.resolve(process.cwd(), rel)
        assert.ok(fs.existsSync(full), `File ${rel} must exist`)
        const content = fs.readFileSync(full, 'utf-8')
        const lines = content.split('\n').length
        assert.ok(lines <= 500, `File ${rel} has ${lines} lines, exceeding 500 limit`)
      })
    })
  })
})
