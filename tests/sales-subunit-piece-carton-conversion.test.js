import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveInvoiceUnitPrice, getCartonEquivalent } from '../src/utils/pricingCalculations.js'
import { processInvoiceStoreState, revertInvoiceStoreState } from '../src/store/storeCacheHelper.js'
import { recalculateItemStock, calculateItemMovements } from '../src/components/warehouses/itemMovementHelpers.js'

describe('Sales Sub-Unit (Piece / Bag) to Carton Conversion & Stock Integrity', () => {
  const koftaItem = {
    id: 'd9b1a002-2222-4222-8222-000000000002',
    name: 'كفتة صغير أنس أفندى',
    compositeName: 'كفتة صغير أنس أفندى',
    unitType: 'كرتونة',
    subUnitType: 'قطعة',
    piecesPerCarton: 20,
    weightPerCarton: 10,
    sellPrice: 540,
    buyPrice: 440,
    pieceSellPrice: 27,
    pieceBuyPrice: 22,
  }

  const burgerItem = {
    id: 'item-burger-01',
    name: 'برجر أنس',
    compositeName: 'برجر أنس',
    unitType: 'كرتونة',
    subUnitType: 'كيس',
    piecesPerCarton: 12,
    weightPerCarton: 10,
    sellPrice: 720,
    buyPrice: 600,
    pieceSellPrice: 60,
  }

  it('1. resolveInvoiceUnitPrice resolves piece price and fallback correctly', () => {
    assert.equal(resolveInvoiceUnitPrice(koftaItem, 'كرتونة', true), 540)
    assert.equal(resolveInvoiceUnitPrice(koftaItem, 'قطعة', true), 27)
    assert.equal(resolveInvoiceUnitPrice(koftaItem, 'قطعة', false), 22)
    assert.equal(resolveInvoiceUnitPrice(burgerItem, 'كيس', true), 60)
  })

  it('2. getCartonEquivalent converts sub-units to exact carton equivalents', () => {
    assert.equal(getCartonEquivalent(20, 'قطعة', koftaItem), 1)
    assert.equal(getCartonEquivalent(10, 'قطعة', koftaItem), 0.5)
    assert.equal(getCartonEquivalent(40, 'قطعة', koftaItem), 2)
    assert.equal(getCartonEquivalent(1, 'كرتونة', koftaItem), 1)
    assert.equal(getCartonEquivalent(12, 'كيس', burgerItem), 1)
    assert.equal(getCartonEquivalent(24, 'كيس', burgerItem), 2)
    assert.equal(getCartonEquivalent(6, 'كيس', burgerItem), 0.5)
  })

  it('3. processInvoiceStoreState deducts carton equivalent (1 carton for 20 pieces), NOT 20 cartons', () => {
    const initialState = {
      items: [koftaItem],
      invoices: [],
      clients: [{ id: 'c1', name: 'عميل 1', balance: 0 }],
      suppliers: [],
      inventoryStock: [
        { warehouseId: 'wh-van', itemId: koftaItem.id, quantity: 10, unit: 'كرتونة' },
      ],
      treasuryAccounts: [{ id: 'tr-1', balance: 5000 }],
      cashTransactions: [],
    }

    const saleInvoice = {
      id: 'inv-sale-kofta-20',
      code: 'INV-1001',
      type: 'sale',
      warehouseId: 'wh-van',
      partyName: 'عميل 1',
      partyKind: 'customer',
      total: 540,
      paidAmount: 540,
      remainingAmount: 0,
      treasuryId: 'tr-1',
      items: [
        {
          itemId: koftaItem.id,
          compositeName: koftaItem.compositeName,
          quantity: 20,
          unit: 'قطعة',
          price: 27,
          total: 540,
        },
      ],
    }

    const nextState = processInvoiceStoreState(initialState, saleInvoice)
    const vanStock = nextState.inventoryStock.find((s) => s.warehouseId === 'wh-van' && s.itemId === koftaItem.id)

    assert.equal(vanStock.quantity, 9)
    assert.notEqual(vanStock.quantity, -10)
  })

  it('4. revertInvoiceStoreState restores 1 carton (for 20 pieces), NOT 20 cartons', () => {
    const stateAfterSale = {
      items: [koftaItem],
      invoices: [],
      clients: [{ id: 'c1', name: 'عميل 1', balance: 0 }],
      suppliers: [],
      inventoryStock: [
        { warehouseId: 'wh-van', itemId: koftaItem.id, quantity: 9, unit: 'كرتونة' },
      ],
      treasuryAccounts: [{ id: 'tr-1', balance: 5540 }],
      cashTransactions: [],
    }

    const saleInvoice = {
      id: 'inv-sale-kofta-20',
      code: 'INV-1001',
      type: 'sale',
      warehouseId: 'wh-van',
      partyName: 'عميل 1',
      partyKind: 'customer',
      total: 540,
      paidAmount: 540,
      remainingAmount: 0,
      treasuryId: 'tr-1',
      items: [
        {
          itemId: koftaItem.id,
          compositeName: koftaItem.compositeName,
          quantity: 20,
          unit: 'قطعة',
          price: 27,
          total: 540,
        },
      ],
    }

    const revertedState = revertInvoiceStoreState(stateAfterSale, saleInvoice)
    const vanStock = revertedState.inventoryStock.find((s) => s.warehouseId === 'wh-van' && s.itemId === koftaItem.id)

    assert.equal(vanStock.quantity, 10)
    assert.notEqual(vanStock.quantity, 29)
  })

  it('5. recalculateItemStock accurately computes net carton balance from piece sales', () => {
    const current = recalculateItemStock({
      itemId: koftaItem.id,
      warehouseId: 'wh-van',
      inventoryStock: [{ warehouseId: 'wh-van', itemId: koftaItem.id, openingBalance: 10 }],
      items: [koftaItem],
      purchases: [],
      sales: [
        {
          warehouseId: 'wh-van',
          status: 'completed',
          type: 'sale',
          items: [{ itemId: koftaItem.id, quantity: 20, unit: 'قطعة' }],
        },
      ],
      transfers: [],
      stockAudits: [],
    })

    assert.equal(current, 9)
  })

  it('6. calculateItemMovements reports carton outQty with rawQty piece annotations', () => {
    const movements = calculateItemMovements({
      itemId: koftaItem.id,
      selectedWhId: 'wh-van',
      items: [koftaItem],
      currentStock: 9,
      sales: [
        {
          id: 'inv-1',
          code: 'INV-1',
          warehouseId: 'wh-van',
          status: 'completed',
          type: 'sale',
          items: [{ itemId: koftaItem.id, quantity: 20, unit: 'قطعة', price: 27 }],
        },
      ],
      inventoryStock: [{ warehouseId: 'wh-van', itemId: koftaItem.id, openingBalance: 10 }],
    })

    const saleMove = movements.movementsList.find((m) => m.type === 'sale')
    assert.ok(saleMove)
    assert.equal(saleMove.outQty, 1)
    assert.equal(saleMove.rawQty, 20)
    assert.equal(saleMove.unit, 'قطعة')
  })
})
