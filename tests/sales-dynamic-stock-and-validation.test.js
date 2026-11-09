import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import {
  calculateDynamicRemainingStock,
  validateInvoiceItems,
  getRemainingStockBadge,
} from '../src/components/invoices/invoiceValidationHelper.js'

describe('R3: Sales Invoices Dynamic Available Stock Calculation Engine', () => {
  const catalogItems = [
    {
      id: 'item-beef-1',
      name: 'لحم بقري مفروم',
      unitType: 'كرتونة',
      sellPrice: 250,
      buyPrice: 200,
    },
    {
      id: 'item-liver-2',
      name: 'كبدة شرائح',
      unitType: 'كرتونة',
      subUnitType: 'قطعة',
      piecesPerCarton: 24,
      sellPrice: 300,
      buyPrice: 240,
    },
    {
      id: 'item-burger-3',
      name: 'برجر عائلي',
      unitType: 'كرتونة',
      weightPerCarton: 10,
      sellPrice: 400,
      buyPrice: 320,
    },
  ]

  const inventoryStock = [
    { itemId: 'item-beef-1', warehouseId: 'wh-main', quantity: 10 },
    { itemId: 'item-liver-2', warehouseId: 'wh-main', quantity: 10 },
    { itemId: 'item-burger-3', warehouseId: 'wh-main', quantity: 0 },
  ]

  it('should return initial stock when no invoice items exist', () => {
    const remaining = calculateDynamicRemainingStock(
      'item-beef-1',
      'wh-main',
      inventoryStock,
      [],
      catalogItems
    )
    assert.strictEqual(remaining, 10)
  })

  it('should dynamically decrement stock as item quantities are entered (10 - 3 = 7)', () => {
    const invoiceItems = [{ itemId: 'item-beef-1', quantity: 3, unit: 'كرتونة', price: 250 }]
    const remaining = calculateDynamicRemainingStock(
      'item-beef-1',
      'wh-main',
      inventoryStock,
      invoiceItems,
      catalogItems
    )
    assert.strictEqual(remaining, 7)
  })

  it('should dynamically reach zero stock when entered quantity equals available stock (10 - 10 = 0)', () => {
    const invoiceItems = [{ itemId: 'item-beef-1', quantity: 10, unit: 'كرتونة', price: 250 }]
    const remaining = calculateDynamicRemainingStock(
      'item-beef-1',
      'wh-main',
      inventoryStock,
      invoiceItems,
      catalogItems
    )
    assert.strictEqual(remaining, 0)
  })

  it('should display remaining stock as a negative number when entered quantity exceeds stock (10 - 15 = -5)', () => {
    const invoiceItems = [{ itemId: 'item-beef-1', quantity: 15, unit: 'كرتونة', price: 250 }]
    const remaining = calculateDynamicRemainingStock(
      'item-beef-1',
      'wh-main',
      inventoryStock,
      invoiceItems,
      catalogItems
    )
    assert.strictEqual(remaining, -5)
  })

  it('should handle zero base stock and yield negative stock directly (0 - 4 = -4)', () => {
    const invoiceItems = [{ itemId: 'item-burger-3', quantity: 4, unit: 'كرتونة', price: 400 }]
    const remaining = calculateDynamicRemainingStock(
      'item-burger-3',
      'wh-main',
      inventoryStock,
      invoiceItems,
      catalogItems
    )
    assert.strictEqual(remaining, -4)
  })

  it('should aggregate entered quantities across multiple rows for the same item (10 - (4 + 8) = -2)', () => {
    const invoiceItems = [
      { itemId: 'item-beef-1', quantity: 4, unit: 'كرتونة', price: 250 },
      { itemId: 'item-beef-1', quantity: 8, unit: 'كرتونة', price: 240 },
    ]
    const remaining = calculateDynamicRemainingStock(
      'item-beef-1',
      'wh-main',
      inventoryStock,
      invoiceItems,
      catalogItems
    )
    assert.strictEqual(remaining, -2)
  })

  it('should accurately convert fractional units to carton equivalents (12 pieces of 24/carton = 0.5 -> 10 - 0.5 = 9.5)', () => {
    const invoiceItems = [
      { itemId: 'item-liver-2', quantity: 12, unit: 'قطعة', price: 15 },
    ]
    const remaining = calculateDynamicRemainingStock(
      'item-liver-2',
      'wh-main',
      inventoryStock,
      invoiceItems,
      catalogItems
    )
    assert.strictEqual(remaining, 9.5)
  })

  it('should safely handle empty or non-numeric quantity while typing without returning NaN', () => {
    const invoiceItems = [
      { itemId: 'item-beef-1', quantity: '', unit: 'كرتونة', price: 250 },
    ]
    const remaining = calculateDynamicRemainingStock(
      'item-beef-1',
      'wh-main',
      inventoryStock,
      invoiceItems,
      catalogItems
    )
    assert.strictEqual(remaining, 10)
    assert.strictEqual(isNaN(remaining), false)
  })

  it('should safely return 0 when itemId or warehouseId is missing', () => {
    assert.strictEqual(calculateDynamicRemainingStock(null, 'wh-main', inventoryStock), 0)
    assert.strictEqual(calculateDynamicRemainingStock('item-beef-1', null, inventoryStock), 0)
  })
})

describe('R3: Remaining Stock Badge Styling & Text Specifications', () => {
  it('should render emerald pill with positive remaining stock', () => {
    const badge = getRemainingStockBadge(7)
    assert.strictEqual(badge.text, 'متاح: 7')
    assert.ok(badge.className.includes('bg-emerald-500/10'))
    assert.ok(badge.className.includes('text-emerald-700'))
    assert.strictEqual(badge.isNegative, false)
    assert.strictEqual(badge.isZero, false)
  })

  it('should render amber pill with exactly zero remaining stock', () => {
    const badge = getRemainingStockBadge(0)
    assert.strictEqual(badge.text, 'متاح: 0')
    assert.ok(badge.className.includes('bg-amber-500/10'))
    assert.ok(badge.className.includes('text-amber-700'))
    assert.strictEqual(badge.isNegative, false)
    assert.strictEqual(badge.isZero, true)
  })

  it('should render rose-600 pill with clearly visible minus sign for negative remaining stock', () => {
    const badge = getRemainingStockBadge(-2)
    assert.strictEqual(badge.text, 'متاح: -2')
    assert.ok(badge.className.includes('bg-rose-600'))
    assert.ok(badge.className.includes('text-white'))
    assert.strictEqual(badge.isNegative, true)
    assert.strictEqual(badge.isZero, false)
  })
})

describe('R3: Zero-Value & Empty Field Validation Engine', () => {
  const catalog = [
    { id: 'it-1', name: 'لحم بلدي ممتاز' },
    { id: 'it-2', name: 'كبدة ضأن' },
  ]

  it('should fail validation when invoice items array is empty', () => {
    const res = validateInvoiceItems([], catalog)
    assert.strictEqual(res.isValid, false)
    assert.strictEqual(res.field, 'items')
    assert.ok(res.error.includes('صنف واحد على الأقل'))
  })

  it('should block saving and identify empty quantity', () => {
    const items = [
      { itemId: 'it-1', quantity: '', price: 150 },
    ]
    const res = validateInvoiceItems(items, catalog)
    assert.strictEqual(res.isValid, false)
    assert.strictEqual(res.field, 'quantity')
    assert.ok(res.error.includes('الكمية غير محددة أو صفرية'))
    assert.ok(res.error.includes('لحم بلدي ممتاز'))
  })

  it('should block saving and identify zero quantity', () => {
    const items = [
      { itemId: 'it-1', quantity: 0, price: 150 },
    ]
    const res = validateInvoiceItems(items, catalog)
    assert.strictEqual(res.isValid, false)
    assert.strictEqual(res.field, 'quantity')
    assert.ok(res.error.includes('الكمية غير محددة أو صفرية'))
  })

  it('should block saving and identify negative quantity', () => {
    const items = [
      { itemId: 'it-1', quantity: -3, price: 150 },
    ]
    const res = validateInvoiceItems(items, catalog)
    assert.strictEqual(res.isValid, false)
    assert.strictEqual(res.field, 'quantity')
  })

  it('should block saving and identify empty sale price in sales invoice', () => {
    const items = [
      { itemId: 'it-1', quantity: 5, price: '' },
    ]
    const res = validateInvoiceItems(items, catalog, { invType: 'sale' })
    assert.strictEqual(res.isValid, false)
    assert.strictEqual(res.field, 'price')
    assert.ok(res.error.includes('سعر البيع غير محدد أو صفري'))
    assert.ok(res.error.includes('لحم بلدي ممتاز'))
  })

  it('should block saving and identify zero price', () => {
    const items = [
      { itemId: 'it-1', quantity: 5, price: 0 },
    ]
    const res = validateInvoiceItems(items, catalog, { invType: 'sale' })
    assert.strictEqual(res.isValid, false)
    assert.strictEqual(res.field, 'price')
    assert.ok(res.error.includes('سعر البيع غير محدد أو صفري'))
  })

  it('should block saving and use purchase label for purchases invoices', () => {
    const items = [
      { itemId: 'it-2', quantity: 5, price: 0 },
    ]
    const res = validateInvoiceItems(items, catalog, { invType: 'purchase' })
    assert.strictEqual(res.isValid, false)
    assert.strictEqual(res.field, 'price')
    assert.ok(res.error.includes('سعر الشراء غير محدد أو صفري'))
    assert.ok(res.error.includes('كبدة ضأن'))
  })

  it('should catch error on second row when first row is valid', () => {
    const items = [
      { itemId: 'it-1', quantity: 10, price: 100 },
      { itemId: 'it-2', quantity: 0, price: 50 },
    ]
    const res = validateInvoiceItems(items, catalog)
    assert.strictEqual(res.isValid, false)
    assert.strictEqual(res.field, 'quantity')
    assert.strictEqual(res.index, 1)
    assert.ok(res.error.includes('كبدة ضأن'))
  })

  it('should succeed when all rows have positive quantity and positive price', () => {
    const items = [
      { itemId: 'it-1', quantity: 10, price: 100 },
      { itemId: 'it-2', quantity: 5, price: 50 },
    ]
    const res = validateInvoiceItems(items, catalog)
    assert.strictEqual(res.isValid, true)
    assert.strictEqual(res.error, null)
  })

  it('MUST NOT block submission when stock is negative as long as quantity and price are valid', () => {
    const items = [
      { itemId: 'it-1', quantity: 100, price: 250 },
    ]
    const remainingStock = calculateDynamicRemainingStock(
      'it-1',
      'wh-main',
      [{ itemId: 'it-1', warehouseId: 'wh-main', quantity: 5 }],
      items,
      catalog
    )
    assert.strictEqual(remainingStock, -95)
    const res = validateInvoiceItems(items, catalog)
    assert.strictEqual(res.isValid, true)
    assert.strictEqual(res.error, null)
  })
})

describe('Constitution File Invariants & Hard Limits (Milestone 2)', () => {
  const targetFiles = [
    'src/components/invoices/invoiceValidationHelper.js',
    'src/components/invoices/AX_InvoiceItemsEditor.jsx',
    'src/components/invoices/AX_InvoiceItemsGrid.jsx',
    'src/components/invoices/AX_CreateInvoiceModal.jsx',
    'src/components/invoices/AX_EditInvoiceModal.jsx',
  ]

  targetFiles.forEach((rel) => {
    it(`should not exceed 500 lines: ${rel}`, () => {
      const full = path.resolve(process.cwd(), rel)
      assert.ok(fs.existsSync(full), `File ${rel} must exist`)
      const content = fs.readFileSync(full, 'utf-8')
      const lineCount = content.split('\n').length
      assert.ok(
        lineCount <= 500,
        `File ${rel} has ${lineCount} lines, exceeding 500 lines limit!`
      )
    })

    it(`should contain zero comments: ${rel}`, () => {
      const full = path.resolve(process.cwd(), rel)
      const content = fs.readFileSync(full, 'utf-8')
      const single = content.match(/\/\/.*$/gm)
      const multi = content.match(/\/\*[\s\S]*?\*\//gm)
      assert.strictEqual(
        single?.length || 0,
        0,
        `File ${rel} contains single-line comments`
      )
      assert.strictEqual(
        multi?.length || 0,
        0,
        `File ${rel} contains multi-line comments`
      )
    })
  })

  it('AX_CreateInvoiceModal.jsx must be safely under 485 lines', () => {
    const full = path.resolve(process.cwd(), 'src/components/invoices/AX_CreateInvoiceModal.jsx')
    const content = fs.readFileSync(full, 'utf-8')
    const lines = content.split('\n').length
    assert.ok(lines <= 485, `AX_CreateInvoiceModal.jsx has ${lines} lines, expected <= 485`)
  })

  it('AX_CreateInvoiceModal.jsx must contain role="alert" inline error banner', () => {
    const full = path.resolve(process.cwd(), 'src/components/invoices/AX_CreateInvoiceModal.jsx')
    const content = fs.readFileSync(full, 'utf-8')
    assert.ok(content.includes('role="alert"'), 'Must render role="alert" banner')
    assert.ok(content.includes('validationError'), 'Must bind validationError state')
  })

  it('AX_EditInvoiceModal.jsx must contain role="alert" inline error banner', () => {
    const full = path.resolve(process.cwd(), 'src/components/invoices/AX_EditInvoiceModal.jsx')
    const content = fs.readFileSync(full, 'utf-8')
    assert.ok(content.includes('role="alert"'), 'Must render role="alert" banner')
    assert.ok(content.includes('validationError'), 'Must bind validationError state')
  })
})
