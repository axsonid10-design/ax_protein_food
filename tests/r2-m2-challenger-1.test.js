import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  calculateSuggestedUnitPrices,
  isPriceOverridden,
  resolveInvoiceUnitPrice,
} from '../src/utils/pricingCalculations.js'

describe('Challenger 1 — Adversarial Challenge 1: Zero / NaN / Negative Division Safety', () => {
  test('should return nulls when called with undefined or empty object without throwing', () => {
    assert.doesNotThrow(() => calculateSuggestedUnitPrices())
    assert.doesNotThrow(() => calculateSuggestedUnitPrices(undefined))
    assert.doesNotThrow(() => calculateSuggestedUnitPrices({}))

    const emptyRes = calculateSuggestedUnitPrices()
    assert.deepEqual(emptyRes, {
      suggestedPieceSell: null,
      suggestedPieceBuy: null,
      suggestedKgSell: null,
      suggestedKgBuy: null,
    })
  })

  test('should verify calculateSuggestedUnitPrices defensively guards against null argument without throwing', () => {
    assert.doesNotThrow(() => calculateSuggestedUnitPrices(null))
    const nullRes = calculateSuggestedUnitPrices(null)
    assert.deepEqual(nullRes, {
      suggestedPieceSell: null,
      suggestedPieceBuy: null,
      suggestedKgSell: null,
      suggestedKgBuy: null,
    })
  })

  test('should safely reject zero and negative sell/buy prices without producing NaN or negative rates', () => {
    const resZero = calculateSuggestedUnitPrices({
      sellPrice: 0,
      buyPrice: 0,
      piecesPerCarton: 10,
      weightPerCarton: 5,
    })
    assert.equal(resZero.suggestedPieceSell, null)
    assert.equal(resZero.suggestedPieceBuy, null)
    assert.equal(resZero.suggestedKgSell, null)
    assert.equal(resZero.suggestedKgBuy, null)

    const resNeg = calculateSuggestedUnitPrices({
      sellPrice: -1000,
      buyPrice: -800,
      piecesPerCarton: 10,
      weightPerCarton: 5,
    })
    assert.equal(resNeg.suggestedPieceSell, null)
    assert.equal(resNeg.suggestedPieceBuy, null)
    assert.equal(resNeg.suggestedKgSell, null)
    assert.equal(resNeg.suggestedKgBuy, null)
  })

  test('should safely reject zero, negative, and non-numeric piecesPerCarton', () => {
    const resZeroPieces = calculateSuggestedUnitPrices({
      sellPrice: 500,
      buyPrice: 400,
      piecesPerCarton: 0,
    })
    assert.equal(resZeroPieces.suggestedPieceSell, null)
    assert.equal(resZeroPieces.suggestedPieceBuy, null)

    const resNegPieces = calculateSuggestedUnitPrices({
      sellPrice: 500,
      buyPrice: 400,
      piecesPerCarton: -5,
    })
    assert.equal(resNegPieces.suggestedPieceSell, null)
    assert.equal(resNegPieces.suggestedPieceBuy, null)

    const resInvalidPieces = calculateSuggestedUnitPrices({
      sellPrice: 500,
      buyPrice: 400,
      piecesPerCarton: 'غير_رقمي',
    })
    assert.equal(resInvalidPieces.suggestedPieceSell, null)
    assert.equal(resInvalidPieces.suggestedPieceBuy, null)
  })

  test('should handle extreme numbers, floating point packaging, and tiny fractions', () => {
    const resFloat = calculateSuggestedUnitPrices({
      sellPrice: 1482,
      buyPrice: 1185.6,
      weightPerCarton: 12.35,
      piecesPerCarton: 24,
      unitType: 'كرتونة',
    })
    assert.equal(resFloat.suggestedKgSell, 120)
    assert.equal(resFloat.suggestedKgBuy, 96)
    assert.equal(resFloat.suggestedPieceSell, 61.75)
    assert.equal(resFloat.suggestedPieceBuy, 49.4)

    const resLarge = calculateSuggestedUnitPrices({
      sellPrice: 10000000,
      piecesPerCarton: 3,
      unitType: 'كرتونة',
    })
    assert.equal(resLarge.suggestedPieceSell, 3333333.33)

    const resTiny = calculateSuggestedUnitPrices({
      sellPrice: 0.1,
      piecesPerCarton: 3,
      unitType: 'كرتونة',
    })
    assert.equal(resTiny.suggestedPieceSell, 0.03)
  })
})

describe('Challenger 1 — Adversarial Challenge 2: Override Detection Precision & Threshold Boundaries', () => {
  test('should test sub-cent tolerance boundaries (0.009 threshold)', () => {
    assert.equal(isPriceOverridden(100.005, 100), false)
    assert.equal(isPriceOverridden(100.008, 100), false)
    assert.equal(isPriceOverridden(99.992, 100), false)

    assert.equal(isPriceOverridden(100.01, 100), true)
    assert.equal(isPriceOverridden(100.009, 100), false)
    assert.equal(isPriceOverridden(99.99, 100), true)
  })

  test('should treat non-positive or blank manual prices as NOT overridden', () => {
    assert.equal(isPriceOverridden(0, 100), false)
    assert.equal(isPriceOverridden('0', 100), false)
    assert.equal(isPriceOverridden(-25, 100), false)
    assert.equal(isPriceOverridden('', 100), false)
    assert.equal(isPriceOverridden('   ', 100), false)
    assert.equal(isPriceOverridden(null, 100), false)
    assert.equal(isPriceOverridden(undefined, 100), false)
    assert.equal(isPriceOverridden('invalid-num', 100), false)
  })

  test('should detect valid manual price as overridden when suggested price is missing or uncomputable', () => {
    assert.equal(isPriceOverridden(125, null), true)
    assert.equal(isPriceOverridden(125, undefined), true)
    assert.equal(isPriceOverridden(125, ''), true)
    assert.equal(isPriceOverridden(125, 'uncomputable'), true)
    assert.equal(isPriceOverridden(125, NaN), true)
  })

  test('should handle string vs numeric type equivalence correctly', () => {
    assert.equal(isPriceOverridden('150.00', 150), false)
    assert.equal(isPriceOverridden(150, '150.00'), false)
    assert.equal(isPriceOverridden('150', '150'), false)
    assert.equal(isPriceOverridden('175.5', 150), true)
  })
})

describe('Challenger 1 — Adversarial Challenge 3: Multi-Unit Resolution & Retail Markup Invariants', () => {
  const standardMeatCarton = {
    id: 'item-beef-liver',
    name: 'كبدة بقري برازيلي فاخر',
    sellPrice: 1000,
    buyPrice: 800,
    weightPerCarton: 10,
    piecesPerCarton: 20,
    unitType: 'كرتونة',
  }

  test('should permit retail markup higher than carton rate for piece and kg (R2 Acceptance Criteria)', () => {
    const itemWithMarkup = {
      ...standardMeatCarton,
      kgSellPrice: 135,
      pieceSellPrice: 75,
      kgBuyPrice: 95,
      pieceBuyPrice: 52,
    }

    assert.equal(resolveInvoiceUnitPrice(itemWithMarkup, 'كيلو', true), 135)
    assert.equal(resolveInvoiceUnitPrice(itemWithMarkup, 'قطعة', true), 75)
    assert.equal(resolveInvoiceUnitPrice(itemWithMarkup, 'كرتونة', true), 1000)

    assert.equal(resolveInvoiceUnitPrice(itemWithMarkup, 'كيلو', false), 95)
    assert.equal(resolveInvoiceUnitPrice(itemWithMarkup, 'قطعة', false), 52)
    assert.equal(resolveInvoiceUnitPrice(itemWithMarkup, 'كرتونة', false), 800)
  })

  test('should handle asymmetric partial overrides (override on sale only or purchase only)', () => {
    const itemPartial = {
      ...standardMeatCarton,
      kgSellPrice: 140,
      kgBuyPrice: null,
      pieceSellPrice: null,
      pieceBuyPrice: 45,
    }

    assert.equal(resolveInvoiceUnitPrice(itemPartial, 'كيلو', true), 140)
    assert.equal(resolveInvoiceUnitPrice(itemPartial, 'كيلو', false), 80)

    assert.equal(resolveInvoiceUnitPrice(itemPartial, 'قطعة', true), 50)
    assert.equal(resolveInvoiceUnitPrice(itemPartial, 'قطعة', false), 45)
  })

  test('should gracefully fall back when item has zero or missing packaging specs', () => {
    const itemNoSpecs = {
      id: 'item-no-specs',
      sellPrice: 600,
      buyPrice: 500,
      unitType: 'كرتونة',
      weightPerCarton: 0,
      piecesPerCarton: 0,
      kgSellPrice: 0,
      pieceSellPrice: 0,
    }

    assert.equal(resolveInvoiceUnitPrice(itemNoSpecs, 'كيلو', true), 600)
    assert.equal(resolveInvoiceUnitPrice(itemNoSpecs, 'قطعة', true), 600)
    assert.equal(resolveInvoiceUnitPrice(itemNoSpecs, 'كرتونة', true), 600)
  })

  test('should handle corrupted, empty, or unexpected unit types without throwing', () => {
    assert.equal(resolveInvoiceUnitPrice(null, 'كيلو', true), 0)
    assert.equal(resolveInvoiceUnitPrice(undefined, 'قطعة', true), 0)
    assert.equal(resolveInvoiceUnitPrice({}, 'كرتونة', true), 0)

    assert.equal(resolveInvoiceUnitPrice(standardMeatCarton, '  كيلو  ', true), 100)
    assert.equal(resolveInvoiceUnitPrice(standardMeatCarton, '  قطعة  ', true), 50)
    assert.equal(resolveInvoiceUnitPrice(standardMeatCarton, '  كرتونة  ', true), 1000)
    assert.equal(resolveInvoiceUnitPrice(standardMeatCarton, 'وحدة_غير_معروفة', true), 1000)
    assert.equal(resolveInvoiceUnitPrice(standardMeatCarton, '', true), 1000)
  })

  test('should verify items natively sold in kilos resolve correctly', () => {
    const itemKiloNative = {
      id: 'item-kilo-meat',
      name: 'لحم بقري بالعظم بلدي',
      sellPrice: 320,
      buyPrice: 280,
      unitType: 'كيلو',
    }

    assert.equal(resolveInvoiceUnitPrice(itemKiloNative, 'كيلو', true), 320)
    assert.equal(resolveInvoiceUnitPrice(itemKiloNative, 'كيلو', false), 280)
    assert.equal(resolveInvoiceUnitPrice(itemKiloNative, 'كرتونة', true), 320)
  })
})

describe('Challenger 1 — Adversarial Challenge 4: Component Integration & File Invariants', () => {
  test('should verify pricingCalculations exports aliases for backward compatibility', () => {
    const mod = path.resolve(process.cwd(), 'src/utils/pricingCalculations.js')
    const content = fs.readFileSync(mod, 'utf-8')
    assert.ok(content.includes('calculateSuggestedPrices = calculateSuggestedUnitPrices'))
    assert.ok(content.includes('resolveItemUnitPrice = resolveInvoiceUnitPrice'))
  })

  test('should verify AX_ItemPackagingFields.jsx manages override badges and suggested price restore', () => {
    const fieldsPath = path.resolve(process.cwd(), 'src/components/items/AX_ItemPackagingFields.jsx')
    const content = fs.readFileSync(fieldsPath, 'utf-8')
    assert.ok(content.includes('userOverrodeKgSell'))
    assert.ok(content.includes('userOverrodePieceSell'))
    assert.ok(content.includes('سعر مخصص (تعديل يدوي)'))
    assert.ok(content.includes('استعادة المقترح'))
  })

  test('should verify AX_AddItemModal and AX_EditItemModal persist kg and piece prices', () => {
    const addPath = path.resolve(process.cwd(), 'src/components/items/AX_AddItemModal.jsx')
    const addContent = fs.readFileSync(addPath, 'utf-8')
    assert.ok(addContent.includes('kgSellPrice:'))
    assert.ok(addContent.includes('kgBuyPrice:'))
    assert.ok(addContent.includes('pieceSellPrice:'))
    assert.ok(addContent.includes('pieceBuyPrice:'))

    const editPath = path.resolve(process.cwd(), 'src/components/items/AX_EditItemModal.jsx')
    const editContent = fs.readFileSync(editPath, 'utf-8')
    assert.ok(editContent.includes('kgSellPrice:'))
    assert.ok(editContent.includes('kgBuyPrice:'))
    assert.ok(editContent.includes('pieceSellPrice:'))
    assert.ok(editContent.includes('pieceBuyPrice:'))
  })

  test('should verify all relevant source and test files satisfy <= 500 lines invariant', () => {
    const filesToAudit = [
      'src/utils/pricingCalculations.js',
      'src/components/items/AX_ItemPackagingFields.jsx',
      'src/components/items/AX_AddItemModal.jsx',
      'src/components/items/AX_EditItemModal.jsx',
      'src/components/invoices/AX_InvoiceItemsEditor.jsx',
      'src/components/invoices/AX_InvoiceItemsGrid.jsx',
      'tests/manual-unit-pricing.test.js',
      'tests/r2-m2-challenger-1.test.js',
    ]

    for (const rel of filesToAudit) {
      const full = path.resolve(process.cwd(), rel)
      assert.ok(fs.existsSync(full), `File must exist: ${rel}`)
      const lines = fs.readFileSync(full, 'utf-8').split('\n').length
      assert.ok(lines <= 500, `${rel} has ${lines} lines, exceeding 500 lines limit!`)
    }
  })
})
