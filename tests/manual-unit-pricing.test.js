import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  calculateSuggestedUnitPrices,
  isPriceOverridden,
  resolveInvoiceUnitPrice,
} from '../src/utils/pricingCalculations.js'

test('R2 Milestone 2: Proportional Pricing Calculations', async (t) => {
  await t.test('calculates proportional kg and piece prices for standard carton', () => {
    const res = calculateSuggestedUnitPrices({
      sellPrice: 1000,
      buyPrice: 800,
      weightPerCarton: 10,
      piecesPerCarton: 20,
      unitType: 'كرتونة',
    })

    assert.equal(res.suggestedKgSell, 100)
    assert.equal(res.suggestedKgBuy, 80)
    assert.equal(res.suggestedPieceSell, 50)
    assert.equal(res.suggestedPieceBuy, 40)
  })

  await t.test('handles fractional division and rounds to two decimals', () => {
    const res = calculateSuggestedUnitPrices({
      sellPrice: 1000,
      weightPerCarton: 6,
      piecesPerCarton: 12,
      unitType: 'كرتونة',
    })

    assert.equal(res.suggestedKgSell, 166.67)
    assert.equal(res.suggestedPieceSell, 83.33)
  })

  await t.test('handles base unit type kilo directly', () => {
    const res = calculateSuggestedUnitPrices({
      sellPrice: 135,
      buyPrice: 110,
      unitType: 'كيلو',
    })

    assert.equal(res.suggestedKgSell, 135)
    assert.equal(res.suggestedKgBuy, 110)
    assert.equal(res.suggestedPieceSell, null)
  })

  await t.test('returns null for missing or zero packaging specs safely without NaN', () => {
    const res = calculateSuggestedUnitPrices({
      sellPrice: 0,
      buyPrice: 0,
      weightPerCarton: 0,
      piecesPerCarton: 0,
    })

    assert.equal(res.suggestedKgSell, null)
    assert.equal(res.suggestedKgBuy, null)
    assert.equal(res.suggestedPieceSell, null)
    assert.equal(res.suggestedPieceBuy, null)
  })
})

test('R2 Milestone 2: Price Override Detection', async (t) => {
  await t.test('detects identical price as not overridden', () => {
    assert.equal(isPriceOverridden(100, 100), false)
    assert.equal(isPriceOverridden('100.00', 100), false)
  })

  await t.test('detects higher manual price as overridden', () => {
    assert.equal(isPriceOverridden(115, 100), true)
    assert.equal(isPriceOverridden('120', 100), true)
  })

  await t.test('detects lower manual price as overridden', () => {
    assert.equal(isPriceOverridden(90, 100), true)
  })

  await t.test('handles empty or null values safely', () => {
    assert.equal(isPriceOverridden('', 100), false)
    assert.equal(isPriceOverridden(null, 100), false)
    assert.equal(isPriceOverridden(undefined, 100), false)
    assert.equal(isPriceOverridden(115, null), true)
    assert.equal(isPriceOverridden(115, undefined), true)
  })
})

test('R2 Milestone 2: Multi-Unit Price Resolution for Invoices', async (t) => {
  const item = {
    id: 'item-1',
    sellPrice: 1000,
    buyPrice: 800,
    weightPerCarton: 10,
    piecesPerCarton: 20,
    unitType: 'كرتونة',
    kgSellPrice: 115,
    kgBuyPrice: 90,
    pieceSellPrice: 65,
    pieceBuyPrice: 48,
  }

  await t.test('resolves carton selling price correctly', () => {
    const price = resolveInvoiceUnitPrice(item, 'كرتونة', true)
    assert.equal(price, 1000)
  })

  await t.test('resolves manual overridden kg selling price correctly', () => {
    const price = resolveInvoiceUnitPrice(item, 'كيلو', true)
    assert.equal(price, 115)
  })

  await t.test('resolves manual overridden piece selling price correctly', () => {
    const price = resolveInvoiceUnitPrice(item, 'قطعة', true)
    assert.equal(price, 65)
  })

  await t.test('falls back to proportional suggested price when manual override is not set', () => {
    const itemWithoutOverrides = {
      id: 'item-2',
      sellPrice: 1000,
      buyPrice: 800,
      weightPerCarton: 10,
      piecesPerCarton: 20,
      unitType: 'كرتونة',
      kgSellPrice: null,
      pieceSellPrice: null,
    }

    assert.equal(resolveInvoiceUnitPrice(itemWithoutOverrides, 'كرتونة', true), 1000)
    assert.equal(resolveInvoiceUnitPrice(itemWithoutOverrides, 'كيلو', true), 100)
    assert.equal(resolveInvoiceUnitPrice(itemWithoutOverrides, 'قطعة', true), 50)
  })

  await t.test('resolves purchase unit prices correctly for supplier invoices', () => {
    assert.equal(resolveInvoiceUnitPrice(item, 'كرتونة', false), 800)
    assert.equal(resolveInvoiceUnitPrice(item, 'كيلو', false), 90)
    assert.equal(resolveInvoiceUnitPrice(item, 'قطعة', false), 48)
  })

  await t.test('handles null or missing item safely without crash', () => {
    assert.equal(resolveInvoiceUnitPrice(null, 'كيلو', true), 0)
    assert.equal(resolveInvoiceUnitPrice(undefined, 'قطعة', false), 0)
  })
})

test('R2 Milestone 2: File Structure and Invariants Audit', async (t) => {
  const files = [
    'src/utils/pricingCalculations.js',
    'src/components/items/AX_ItemPackagingFields.jsx',
    'src/components/items/AX_AddItemModal.jsx',
    'src/components/items/AX_EditItemModal.jsx',
    'src/components/invoices/AX_InvoiceItemsEditor.jsx',
    'src/components/invoices/AX_InvoiceItemsGrid.jsx',
  ]

  for (const relPath of files) {
    const fullPath = path.resolve(process.cwd(), relPath)
    await t.test(`verifies file exists and obeys <= 500 lines: ${relPath}`, () => {
      assert.ok(fs.existsSync(fullPath), `${relPath} should exist`)
      const content = fs.readFileSync(fullPath, 'utf-8')
      const lines = content.split('\n').length
      assert.ok(lines <= 500, `${relPath} has ${lines} lines, exceeding 500 lines limit!`)
    })
  }

  await t.test('verifies packaging fields include kg and piece price inputs and suggested calculation', () => {
    const pPath = path.resolve(process.cwd(), 'src/components/items/AX_ItemPackagingFields.jsx')
    const content = fs.readFileSync(pPath, 'utf-8')
    assert.ok(content.includes('kgSellPrice'), 'Must handle kgSellPrice')
    assert.ok(content.includes('kgBuyPrice'), 'Must handle kgBuyPrice')
    assert.ok(content.includes('pieceSellPrice'), 'Must handle pieceSellPrice')
    assert.ok(content.includes('calculateSuggestedUnitPrices'), 'Must use calculateSuggestedUnitPrices')
    assert.ok(content.includes('isPriceOverridden'), 'Must use isPriceOverridden')
  })

  await t.test('verifies invoice items editor and grid support unit selection and pricing resolution', () => {
    const ePath = path.resolve(process.cwd(), 'src/components/invoices/AX_InvoiceItemsEditor.jsx')
    const eContent = fs.readFileSync(ePath, 'utf-8')
    assert.ok(eContent.includes('resolveInvoiceUnitPrice'), 'Editor must use resolveInvoiceUnitPrice')
    assert.ok(eContent.includes('handleUnitChange'), 'Editor must support handleUnitChange')

    const gPath = path.resolve(process.cwd(), 'src/components/invoices/AX_InvoiceItemsGrid.jsx')
    const gContent = fs.readFileSync(gPath, 'utf-8')
    assert.ok(gContent.includes('resolveInvoiceUnitPrice'), 'Grid must use resolveInvoiceUnitPrice')
    assert.ok(gContent.includes('selectedUnits'), 'Grid must support selectedUnits')
  })
})
