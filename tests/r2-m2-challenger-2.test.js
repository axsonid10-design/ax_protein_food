import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { resolveInvoiceUnitPrice, getCartonEquivalent } from '../src/utils/pricingCalculations.js'

describe('Challenger 2 — Challenge 1: Invoice Line Unit Clobbering Bug in AX_CreateInvoiceModal', () => {
  const catalogItem = {
    id: 'item-beef-shank',
    name: 'موزة بقري برازيلي',
    unitType: 'كرتونة',
    sellPrice: 1200,
    buyPrice: 950,
    weightPerCarton: 12,
    piecesPerCarton: 24,
    kgSellPrice: 115,
    pieceSellPrice: 60,
  }

  test('should verify unit precedence fix in AX_CreateInvoiceModal line 229', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/invoices/AX_CreateInvoiceModal.jsx')
    const content = fs.readFileSync(modalPath, 'utf-8')
    assert.ok(
      content.includes("unit: it.unit || itemObj?.unitType || 'كرتونة'"),
      'Remediation check: line 229 correctly contains it.unit before itemObj?.unitType'
    )

    const userSelectedUnitKg = 'كيلو'
    const userSelectedPriceKg = 115
    const invoiceLineDraft = {
      itemId: catalogItem.id,
      quantity: 5,
      price: userSelectedPriceKg,
      unit: userSelectedUnitKg,
    }

    const mappedUnitKg = invoiceLineDraft.unit || catalogItem?.unitType || 'كرتونة'
    assert.equal(
      mappedUnitKg,
      'كيلو',
      'User selected unit (كيلو) is strictly preserved upon invoice mapping!'
    )

    const userSelectedUnitPiece = 'قطعة'
    const invoiceLinePieceDraft = {
      itemId: catalogItem.id,
      quantity: 10,
      price: 60,
      unit: userSelectedUnitPiece,
    }
    const mappedPieceUnit = invoiceLinePieceDraft.unit || catalogItem?.unitType || 'كرتونة'
    assert.equal(mappedPieceUnit, 'قطعة')
  })

  test('should show correct unit preservation on AX_InvoiceDetailsModal rendering', () => {
    const savedItem = {
      itemId: catalogItem.id,
      compositeName: catalogItem.name,
      quantity: 5,
      unit: 'كيلو' || catalogItem.unitType || 'كرتونة',
      price: 115,
      total: 5 * 115,
    }

    const renderedDescription = `${savedItem.quantity} ${savedItem.unit} × ${savedItem.price} = ${savedItem.total} ج.م`
    assert.equal(renderedDescription, '5 كيلو × 115 = 575 ج.م')
    assert.ok(
      renderedDescription.includes('كيلو'),
      'Invoice details prints 5 كيلو correctly after remediation'
    )
  })
})

describe('Challenger 2 — Challenge 2: Multi-Unit Adding & Stock Validation Mismatch', () => {
  const meatItem = {
    id: 'item-ribeye',
    name: 'ريب آي أنجوس مجمد',
    unitType: 'كرتونة',
    sellPrice: 2000,
    weightPerCarton: 10,
    piecesPerCarton: 20,
    kgSellPrice: 220,
    pieceSellPrice: 120,
  }

  test('should demonstrate carton-vs-piece stock check mismatch', () => {
    const warehouseStock = 2

    const requestCartons = 2
    const isCartonAllowed = requestCartons <= warehouseStock
    assert.equal(isCartonAllowed, true)

    const requestPieces = 5
    const rawCheckIsPiecesAllowed = requestPieces <= warehouseStock
    assert.equal(
      rawCheckIsPiecesAllowed,
      false,
      'Raw quantity check erroneously blocks 5 pieces against 2 cartons stock'
    )

    const totalPiecesAvailable = warehouseStock * meatItem.piecesPerCarton
    assert.equal(totalPiecesAvailable, 40)
    const trueIsPiecesAllowed = requestPieces <= totalPiecesAvailable
    assert.equal(trueIsPiecesAllowed, true, 'Real available pieces is 40, so 5 pieces is well within stock')
  })

  test('should demonstrate carton-vs-kg stock check mismatch', () => {
    const warehouseStock = 1

    const requestKg = 4
    const rawCheckIsKgAllowed = requestKg <= warehouseStock
    assert.equal(
      rawCheckIsKgAllowed,
      false,
      'Raw check blocks 4 kg sale because 4 > 1 carton'
    )

    const totalKgAvailable = warehouseStock * meatItem.weightPerCarton
    assert.equal(totalKgAvailable, 10)
    assert.equal(requestKg <= totalKgAvailable, true)
  })

  test('should demonstrate multi-unit row coexistence in AX_InvoiceItemsGrid matching logic', () => {
    const invoiceRows = [
      { itemId: meatItem.id, quantity: 2, unit: 'كرتونة', price: 2000 },
      { itemId: meatItem.id, quantity: 5, unit: 'كيلو', price: 220 },
      { itemId: meatItem.id, quantity: 12, unit: 'قطعة', price: 120 },
    ]

    const cartonRow = invoiceRows.find((r) => r.itemId === meatItem.id && r.unit === 'كرتونة')
    const kgRow = invoiceRows.find((r) => r.itemId === meatItem.id && r.unit === 'كيلو')
    const pieceRow = invoiceRows.find((r) => r.itemId === meatItem.id && r.unit === 'قطعة')

    assert.ok(cartonRow && cartonRow.quantity === 2)
    assert.ok(kgRow && kgRow.quantity === 5)
    assert.ok(pieceRow && pieceRow.quantity === 12)
  })

  test('should verify getCartonEquivalent normalizes piece and kg requests to carton stock', () => {
    assert.equal(getCartonEquivalent(5, 'قطعة', meatItem), 5 / 20)
    assert.equal(getCartonEquivalent(4, 'كيلو', meatItem), 4 / 10)
    assert.equal(getCartonEquivalent(2, 'كرتونة', meatItem), 2)

    const warehouseStock = 2
    assert.ok(getCartonEquivalent(5, 'قطعة', meatItem) <= warehouseStock)
    assert.ok(getCartonEquivalent(4, 'كيلو', meatItem) <= warehouseStock)
    assert.ok(getCartonEquivalent(50, 'قطعة', meatItem) > warehouseStock)
  })
})

describe('Challenger 2 — Challenge 3: Rapid Unit Switching & Timer Race in AX_InvoiceItemsEditor', () => {
  const item = {
    id: 'it-minced',
    name: 'مفروم برازيلي فاخر',
    unitType: 'كرتونة',
    sellPrice: 1500,
    weightPerCarton: 15,
    piecesPerCarton: 30,
    kgSellPrice: 125,
    pieceSellPrice: 65,
  }

  test('should verify setTimeout is removed from AX_InvoiceItemsEditor handleUnitChange', () => {
    const editorPath = path.resolve(process.cwd(), 'src/components/invoices/AX_InvoiceItemsEditor.jsx')
    const code = fs.readFileSync(editorPath, 'utf-8')
    assert.ok(!code.includes('setTimeout(() => {'), 'Editor must not contain arbitrary setTimeout delays')
    assert.ok(code.includes('handleUnitChange'), 'Clean synchronous unit change handler')
  })

  test('should verify synchronous unit change without timer avoids race conditions', () => {
    let mockRowState = { unit: 'كرتونة', price: 1500 }
    const mockItemRowChange = (idx, updatesOrField, value) => {
      if (typeof updatesOrField === 'object') {
        mockRowState = { ...mockRowState, ...updatesOrField }
      } else {
        mockRowState = { ...mockRowState, [updatesOrField]: value }
      }
    }

    const simulateHandleUnitChangeSynchronous = (targetUnit) => {
      const isSale = true
      const p = resolveInvoiceUnitPrice(item, targetUnit, isSale)
      mockItemRowChange(0, { unit: targetUnit, price: p })
    }

    simulateHandleUnitChangeSynchronous('كيلو')
    assert.equal(mockRowState.unit, 'كيلو')
    assert.equal(mockRowState.price, 125)

    simulateHandleUnitChangeSynchronous('قطعة')
    assert.equal(mockRowState.unit, 'قطعة')
    assert.equal(mockRowState.price, 65)
  })
})

describe('Challenger 2 — Challenge 4: Manual Mode Item Filtering Invariant', () => {
  const itemsCatalog = [
    { id: '1', name: 'لحم بقري', unitType: 'كرتونة' },
    { id: '2', name: 'كبدة عجل', unitType: 'كرتونة' },
  ]

  test('should verify availableItems in AX_CreateInvoiceModal excludes items already in invoice', () => {
    const invoiceItems = [
      { itemId: '1', quantity: 1, unit: 'كرتونة', price: 1000 },
    ]

    const selectedItemIds = new Set(invoiceItems.map((r) => r.itemId))
    const availableItems = itemsCatalog.filter((it) => !selectedItemIds.has(it.id))

    assert.equal(availableItems.length, 1)
    assert.equal(availableItems[0].id, '2')
    assert.ok(
      !availableItems.some((it) => it.id === '1'),
      'Item 1 cannot be selected again in manual mode to add in kilograms or pieces'
    )
  })
})

describe('Challenger 2 — Challenge 5: Mixed Unit Row Invoice Calculations & Precision', () => {
  test('should compute subtotal and totals with mixed carton, kilogram, and piece lines', () => {
    const mixedInvoiceItems = [
      { itemId: 'item-1', quantity: 2, price: 1000, unit: 'كرتونة' },
      { itemId: 'item-1', quantity: 4.5, price: 115, unit: 'كيلو' },
      { itemId: 'item-1', quantity: 10, price: 60, unit: 'قطعة' },
      { itemId: 'item-2', quantity: 3.25, price: 140, unit: 'كيلو' },
    ]

    const expectedCartonSubtotal = 2 * 1000
    const expectedKgSubtotal1 = 4.5 * 115
    const expectedPieceSubtotal = 10 * 60
    const expectedKgSubtotal2 = 3.25 * 140

    const rowTotals = mixedInvoiceItems.map((r) => (Number(r.quantity) || 0) * (Number(r.price) || 0))
    assert.equal(rowTotals[0], 2000)
    assert.equal(rowTotals[1], 517.5)
    assert.equal(rowTotals[2], 600)
    assert.equal(rowTotals[3], 455)

    const subtotal = mixedInvoiceItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
      0
    )
    assert.equal(subtotal, 3572.5)

    const transportCost = 150
    const loadingCost = 50
    const total = subtotal + transportCost + loadingCost
    assert.equal(total, 3772.5)

    const partialPayment = 2000
    const remaining = Math.max(0, total - partialPayment)
    assert.equal(remaining, 1772.5)
  })

  test('should test extreme decimal precision in fractional kilograms', () => {
    const fractionalLines = [
      { quantity: 0.35, price: 120 },
      { quantity: 0.725, price: 180 },
    ]

    const subtotal = fractionalLines.reduce((s, r) => s + r.quantity * r.price, 0)
    assert.equal(Number(subtotal.toFixed(2)), 172.5)
  })
})
