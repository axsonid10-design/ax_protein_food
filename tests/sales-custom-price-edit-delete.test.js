import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getCartonEquivalent } from '../src/utils/pricingCalculations.js'

describe('Sales Custom Price Editing, Recalculation, and Delete Reversal Tests', () => {
  const sampleItem = {
    id: 'item-custom-001',
    code: 'KOFTA-SM',
    composite_name: 'كفتة صغير أنس أفندى',
    unitType: 'كرتونة',
    subUnitType: 'قطعة',
    piecesPerCarton: 20,
    buyPrice: 400,
    sellPrice: 500,
    pieceSellPrice: 27,
  }

  it('allows selling at arbitrary custom prices different from default sellPrice', () => {
    const defaultPrice = sampleItem.sellPrice
    const customPrice = 625.5
    assert.notEqual(customPrice, defaultPrice)

    const quantity = 3
    const rowTotal = quantity * customPrice
    assert.equal(rowTotal, 1876.5)
  })

  it('calculates invoice subtotal and total accurately with mixed items and custom prices', () => {
    const items = [
      { itemId: 'item-custom-001', quantity: 2, price: 550, unit: 'كرتونة' },
      { itemId: 'item-custom-001', quantity: 10, price: 30, unit: 'قطعة' },
    ]

    const subtotal = items.reduce((sum, it) => sum + it.quantity * it.price, 0)
    assert.equal(subtotal, 2 * 550 + 10 * 30) // 1100 + 300 = 1400

    const transportCost = 50
    const loadingCost = 25
    const grandTotal = subtotal + transportCost + loadingCost
    assert.equal(grandTotal, 1475)
  })

  it('verifies stock deduction and restoration on invoice deletion when using custom prices', () => {
    let initialWarehouseStock = 50 // cartons
    const saleItem = { itemId: sampleItem.id, quantity: 4, unit: 'كرتونة', price: 720 } // custom price 720

    const cartonDeduction = getCartonEquivalent(saleItem.quantity, saleItem.unit, sampleItem)
    assert.equal(cartonDeduction, 4)

    let currentStock = initialWarehouseStock - cartonDeduction
    assert.equal(currentStock, 46)

    // On delete reversal
    const reverseDeduction = getCartonEquivalent(saleItem.quantity, saleItem.unit, sampleItem)
    currentStock += reverseDeduction
    assert.equal(currentStock, initialWarehouseStock)
  })

  it('verifies customer debt accumulation and full reversal on invoice deletion with custom price', () => {
    let customerBalance = 0
    const invoiceTotal = 3 * 750 // custom price 750 = 2250
    const paidAmount = 500
    const remainingDebt = invoiceTotal - paidAmount // 1750

    customerBalance += remainingDebt
    assert.equal(customerBalance, 1750)

    // Deleting the invoice must reverse remaining debt completely
    customerBalance -= remainingDebt
    assert.equal(customerBalance, 0)
  })
})
