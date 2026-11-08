import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getVanWarehouses,
  getVanCashAccount,
  getCartonEquivalentQuantity,
  calculateItemBreakdown,
  calculateVanCustodyTotals,
  calculateSettlementTotals,
  executeVanStockLoading,
  executeVanSettlement,
} from '../src/store/vanDistributionHelpers.js'
import { processInvoiceStoreState } from '../src/store/storeCacheHelper.js'

describe('Empirical Challenge 1: Packaging Conversion Mathematics', () => {
  const itemKofta = { id: 'it-k20', name: 'كفتة', unitType: 'كرتونة', subUnitType: 'قطعة', piecesPerCarton: 20, weightPerCarton: 10, sellPrice: 1500 }
  const itemBurger = { id: 'it-b12', name: 'برجر', unitType: 'كرتونة', subUnitType: 'كيس', piecesPerCarton: 12, weightPerCarton: 9, sellPrice: 1200 }
  const itemLiver = { id: 'it-l6', name: 'كبدة', unitType: 'كرتونة', subUnitType: 'طبق', piecesPerCarton: 6, weightPerCarton: 6, sellPrice: 900 }
  const itemSolid = { id: 'it-s0', name: 'مفروم', unitType: 'كرتونة', subUnitType: null, piecesPerCarton: 0, weightPerCarton: 15, sellPrice: 2000 }

  it('converts fractional cartons with extreme precision', () => {
    assert.equal(getCartonEquivalentQuantity(0.25, 'كرتونة', itemKofta), 0.25)
    assert.equal(getCartonEquivalentQuantity(0.5, 'كرتونة', itemBurger), 0.5)
    assert.equal(getCartonEquivalentQuantity(1.333, 'كرتونة', itemLiver), 1.333)
    assert.equal(getCartonEquivalentQuantity(2.75, 'كرتونة', itemSolid), 2.75)
    assert.equal(getCartonEquivalentQuantity(0.05, 'كرتونة', itemKofta), 0.05)
  })

  it('converts sub-units for pieces, bags, and trays to carton equivalents', () => {
    assert.equal(getCartonEquivalentQuantity(1, 'قطعة', itemKofta), 0.05)
    assert.equal(getCartonEquivalentQuantity(5, 'قطعة', itemKofta), 0.25)
    assert.equal(getCartonEquivalentQuantity(10, 'قطعة', itemKofta), 0.5)
    assert.equal(getCartonEquivalentQuantity(20, 'قطعة', itemKofta), 1.0)
    assert.equal(getCartonEquivalentQuantity(25, 'قطعة', itemKofta), 1.25)

    assert.equal(getCartonEquivalentQuantity(3, 'كيس', itemBurger), 0.25)
    assert.equal(getCartonEquivalentQuantity(6, 'كيس', itemBurger), 0.5)
    assert.equal(getCartonEquivalentQuantity(12, 'كيس', itemBurger), 1.0)
    assert.equal(getCartonEquivalentQuantity(16, 'كيس', itemBurger), 1.3333)

    assert.equal(getCartonEquivalentQuantity(1, 'طبق', itemLiver), 0.1667)
    assert.equal(getCartonEquivalentQuantity(2, 'طبق', itemLiver), 0.3333)
    assert.equal(getCartonEquivalentQuantity(3, 'طبق', itemLiver), 0.5)
    assert.equal(getCartonEquivalentQuantity(6, 'طبق', itemLiver), 1.0)
    assert.equal(getCartonEquivalentQuantity(8, 'طبق', itemLiver), 1.3333)
  })

  it('reconstitutes whole cartons and sub-units in reverse breakdown', () => {
    const bK = calculateItemBreakdown(0.25, itemKofta)
    assert.equal(bK.wholeCartons, 0)
    assert.equal(bK.subUnits, 5)
    assert.equal(bK.subUnitType, 'قطعة')

    const bB = calculateItemBreakdown(0.5, itemBurger)
    assert.equal(bB.wholeCartons, 0)
    assert.equal(bB.subUnits, 6)
    assert.equal(bB.subUnitType, 'كيس')

    const bL = calculateItemBreakdown(1.3333, itemLiver)
    assert.equal(bL.wholeCartons, 1)
    assert.equal(bL.subUnits, 2)
    assert.equal(bL.subUnitType, 'طبق')

    const bS = calculateItemBreakdown(4.75, itemSolid)
    assert.equal(bS.wholeCartons, 4.75)
    assert.equal(bS.subUnits, 0)
  })

  it('handles degenerative, zero, and negative numeric inputs safely', () => {
    assert.equal(getCartonEquivalentQuantity(0, 'قطعة', itemKofta), 0)
    assert.equal(getCartonEquivalentQuantity(-10, 'كيس', itemBurger), 0)
    assert.equal(getCartonEquivalentQuantity(null, 'كرتونة', itemSolid), 0)
    assert.equal(getCartonEquivalentQuantity(undefined, 'كرتونة', itemSolid), 0)
    assert.equal(getCartonEquivalentQuantity('NaN', 'طبق', itemLiver), 0)

    const zeroB = calculateItemBreakdown(0, itemKofta)
    assert.equal(zeroB.wholeCartons, 0)
    assert.equal(zeroB.subUnits, 0)

    const negB = calculateItemBreakdown(-2.5, itemSolid)
    assert.equal(negB.wholeCartons, -2.5)
    assert.equal(negB.subUnits, 0)
  })

  it('aggregates total weight, total value, and carton counts with fractions', () => {
    const custody = [
      { warehouseId: 'van-1', itemId: 'it-k20', quantity: 1.25 },
      { warehouseId: 'van-1', itemId: 'it-b12', quantity: 0.5 },
      { warehouseId: 'van-1', itemId: 'it-l6', quantity: 1.3333 },
    ]
    const totals = calculateVanCustodyTotals(custody, [itemKofta, itemBurger, itemLiver])
    assert.equal(totals.itemsCount, 3)
    assert.equal(totals.totalCartons, 3.08)
    assert.equal(totals.totalWeightKg, Number((1.25 * 10 + 0.5 * 9 + 1.3333 * 6).toFixed(2)))
    assert.equal(totals.totalValueEgp, Number((1.25 * 1500 + 0.5 * 1200 + 1.3333 * 900).toFixed(2)))
  })
})

describe('Empirical Challenge 2: Van Inventory Loading Edge Cases', () => {
  const warehouses = [
    { id: 'wh-src', name: 'ثلاجة المصنع', type: 'cold_store' },
    { id: 'wh-van', name: 'سيارة جامبو', type: 'van', plateNumber: 'ج م ب 5555' },
  ]
  const items = [
    { id: 'it-1', name: 'كفتة', piecesPerCarton: 20, unitType: 'كرتونة', subUnitType: 'قطعة' },
    { id: 'it-2', name: 'برجر', piecesPerCarton: 12, unitType: 'كرتونة', subUnitType: 'كيس' },
  ]

  it('handles loading when source warehouse has exactly zero stock', async () => {
    let state = {
      warehouses, items, stockAudits: [], transfers: [],
      inventoryStock: [{ warehouseId: 'wh-src', itemId: 'it-1', quantity: 0, unit: 'كرتونة' }],
    }
    const setState = (u) => { state = { ...state, ...(typeof u === 'function' ? u(state) : u) } }
    const res = await executeVanStockLoading(
      { fromWarehouseId: 'wh-src', vanWarehouseId: 'wh-van', items: [{ itemId: 'it-1', rawQuantity: 5, selectedUnit: 'كرتونة' }] },
      state, setState
    )
    assert.equal(res.success, true)
    const src = state.inventoryStock.find((s) => s.warehouseId === 'wh-src' && s.itemId === 'it-1')
    const van = state.inventoryStock.find((s) => s.warehouseId === 'wh-van' && s.itemId === 'it-1')
    assert.equal(src.quantity, -5)
    assert.equal(van.quantity, 5)
  })

  it('auto-provisions source stock row with negative quantity when item was unstocked', async () => {
    let state = { warehouses, items, stockAudits: [], transfers: [], inventoryStock: [] }
    const setState = (u) => { state = { ...state, ...(typeof u === 'function' ? u(state) : u) } }
    const res = await executeVanStockLoading(
      { fromWarehouseId: 'wh-src', vanWarehouseId: 'wh-van', items: [{ itemId: 'it-2', rawQuantity: 24, selectedUnit: 'كيس' }] },
      state, setState
    )
    assert.equal(res.success, true)
    const src = state.inventoryStock.find((s) => s.warehouseId === 'wh-src' && s.itemId === 'it-2')
    const van = state.inventoryStock.find((s) => s.warehouseId === 'wh-van' && s.itemId === 'it-2')
    assert.equal(src.quantity, -2)
    assert.equal(van.quantity, 2)
  })

  it('rejects loading when warehouses are missing, identical, or items are empty', async () => {
    const s = { warehouses, items, stockAudits: [], inventoryStock: [] }
    const rMiss = await executeVanStockLoading({ fromWarehouseId: null, vanWarehouseId: 'wh-van', items: [{ itemId: 'it-1', rawQuantity: 1 }] }, s)
    assert.equal(rMiss.success, false)
    const rEmpty = await executeVanStockLoading({ fromWarehouseId: 'wh-src', vanWarehouseId: 'wh-van', items: [] }, s)
    assert.equal(rEmpty.success, false)
    const rZero = await executeVanStockLoading({ fromWarehouseId: 'wh-src', vanWarehouseId: 'wh-van', items: [{ itemId: 'it-1', rawQuantity: 0 }] }, s)
    assert.equal(rZero.success, false)
    const rSame = await executeVanStockLoading({ fromWarehouseId: 'wh-src', vanWarehouseId: 'wh-src', items: [{ itemId: 'it-1', rawQuantity: 5 }] }, s)
    assert.equal(rSame.success, false)
  })

  it('correctly decrements positive stock and increments van stock atomically with mixed units', async () => {
    let state = {
      warehouses, items, stockAudits: [], transfers: [],
      inventoryStock: [
        { warehouseId: 'wh-src', itemId: 'it-1', quantity: 50, unit: 'كرتونة' },
        { warehouseId: 'wh-src', itemId: 'it-2', quantity: 30, unit: 'كرتونة' },
        { warehouseId: 'wh-van', itemId: 'it-1', quantity: 4, unit: 'كرتونة' },
      ],
    }
    const setState = (u) => { state = { ...state, ...(typeof u === 'function' ? u(state) : u) } }
    const res = await executeVanStockLoading(
      {
        fromWarehouseId: 'wh-src', vanWarehouseId: 'wh-van',
        items: [
          { itemId: 'it-1', rawQuantity: 10, selectedUnit: 'قطعة' },
          { itemId: 'it-2', rawQuantity: 6, selectedUnit: 'كيس' },
        ],
      },
      state, setState
    )
    assert.equal(res.success, true)
    const sK = state.inventoryStock.find((s) => s.warehouseId === 'wh-src' && s.itemId === 'it-1')
    const vK = state.inventoryStock.find((s) => s.warehouseId === 'wh-van' && s.itemId === 'it-1')
    const sB = state.inventoryStock.find((s) => s.warehouseId === 'wh-src' && s.itemId === 'it-2')
    const vB = state.inventoryStock.find((s) => s.warehouseId === 'wh-van' && s.itemId === 'it-2')
    assert.equal(sK.quantity, 49.5)
    assert.equal(vK.quantity, 4.5)
    assert.equal(sB.quantity, 29.5)
    assert.equal(vB.quantity, 0.5)
  })
})

describe('Empirical Challenge 3: Driver Sales Auto-Deduction', () => {
  const vanA = 'van-alex-1'
  const vanB = 'van-cairo-2'
  const centralWh = 'wh-central'
  const items = [
    { id: 'it-meat-1', piecesPerCarton: 20, subUnitType: 'قطعة', unitType: 'كرتونة' },
    { id: 'it-meat-2', piecesPerCarton: 12, subUnitType: 'كيس', unitType: 'كرتونة' },
  ]

  it('deducts exact carton equivalent from driver assigned van without touching other vans', () => {
    const driverProfile = { id: 'usr-d1', branchId: vanA }
    const initialState = {
      invoices: [], clients: [{ id: 'cl-1', name: 'ماركت الفتح', balance: 0 }], suppliers: [],
      treasuryAccounts: [{ id: 'tr-v1', balance: 0 }], cashTransactions: [], items,
      inventoryStock: [
        { warehouseId: vanA, itemId: 'it-meat-1', quantity: 20, unit: 'كرتونة' },
        { warehouseId: vanB, itemId: 'it-meat-1', quantity: 30, unit: 'كرتونة' },
        { warehouseId: centralWh, itemId: 'it-meat-1', quantity: 100, unit: 'كرتونة' },
      ],
    }
    const saleInvoice = {
      id: 'inv-1', code: 'INV-1001', type: 'sale', partyName: 'ماركت الفتح',
      warehouseId: driverProfile.branchId, paidAmount: 0, remainingAmount: 1500,
      items: [{ itemId: 'it-meat-1', quantity: 5, unit: 'كرتونة' }],
    }
    const nextState = processInvoiceStoreState(initialState, saleInvoice)
    assert.equal(nextState.inventoryStock.find((s) => s.warehouseId === vanA && s.itemId === 'it-meat-1').quantity, 15)
    assert.equal(nextState.inventoryStock.find((s) => s.warehouseId === vanB && s.itemId === 'it-meat-1').quantity, 30)
    assert.equal(nextState.inventoryStock.find((s) => s.warehouseId === centralWh && s.itemId === 'it-meat-1').quantity, 100)
  })

  it('deducts fractional carton equivalent when driver sells in sub-units', () => {
    const driverProfile = { id: 'usr-d1', branchId: vanA }
    const initialState = {
      invoices: [], clients: [{ id: 'cl-1', name: 'ماركت النصر', balance: 0 }], suppliers: [],
      treasuryAccounts: [{ id: 'tr-v1', balance: 0 }], cashTransactions: [], items,
      inventoryStock: [{ warehouseId: vanA, itemId: 'it-meat-1', quantity: 10, unit: 'كرتونة' }],
    }
    const saleInvoiceSub = {
      id: 'inv-2', code: 'INV-1002', type: 'sale', partyName: 'ماركت النصر',
      warehouseId: driverProfile.branchId, paidAmount: 0, remainingAmount: 500,
      items: [{ itemId: 'it-meat-1', quantity: 10, unit: 'قطعة' }],
    }
    const nextState = processInvoiceStoreState(initialState, saleInvoiceSub)
    assert.equal(nextState.inventoryStock.find((s) => s.warehouseId === vanA && s.itemId === 'it-meat-1').quantity, 9.5)
  })

  it('increments van stock back upon sales return invoice', () => {
    const driverProfile = { id: 'usr-d1', branchId: vanA }
    const initialState = {
      invoices: [], clients: [{ id: 'cl-1', name: 'ماركت النصر', balance: 500 }], suppliers: [],
      treasuryAccounts: [{ id: 'tr-v1', balance: 0 }], cashTransactions: [], items,
      inventoryStock: [{ warehouseId: vanA, itemId: 'it-meat-1', quantity: 9.5, unit: 'كرتونة' }],
    }
    const returnInvoice = {
      id: 'ret-1', code: 'RET-1003', type: 'sale_return', partyName: 'ماركت النصر',
      warehouseId: driverProfile.branchId, paidAmount: 0, remainingAmount: 100,
      items: [{ itemId: 'it-meat-1', quantity: 10, unit: 'قطعة' }],
    }
    const nextState = processInvoiceStoreState(initialState, returnInvoice)
    assert.equal(nextState.inventoryStock.find((s) => s.warehouseId === vanA && s.itemId === 'it-meat-1').quantity, 10.0)
  })
})

describe('Empirical Challenge 4: Settlement Calculations & Cash Split Remittances', () => {
  it('calculates totals, expenses, net dues, and exact zero variance for split payments', () => {
    const totals = calculateSettlementTotals({
      grossCash: 45000,
      expenses: [{ amount: 1200 }, { amount: 350 }, { amount: 450 }],
      payments: [{ amount: 20000 }, { amount: 15000 }, { amount: 8000 }],
    })
    assert.equal(totals.grossCash, 45000)
    assert.equal(totals.totalExpenses, 2000)
    assert.equal(totals.netRemitDue, 43000)
    assert.equal(totals.totalRemitted, 43000)
    assert.equal(totals.variance, 0)
  })

  it('detects under-remittance and over-remittance variances accurately', () => {
    const under = calculateSettlementTotals({ grossCash: 10000, expenses: [{ amount: 1000 }], payments: [{ amount: 8500 }] })
    assert.equal(under.netRemitDue, 9000)
    assert.equal(under.totalRemitted, 8500)
    assert.equal(under.variance, -500)

    const over = calculateSettlementTotals({ grossCash: 10000, expenses: [{ amount: 1000 }], payments: [{ amount: 9500 }] })
    assert.equal(over.netRemitDue, 9000)
    assert.equal(over.totalRemitted, 9500)
    assert.equal(over.variance, 500)
  })

  it('handles negative net dues gracefully when expenses exceed gross cash', () => {
    const excess = calculateSettlementTotals({ grossCash: 1500, expenses: [{ amount: 2000 }], payments: [] })
    assert.equal(excess.grossCash, 1500)
    assert.equal(excess.totalExpenses, 2000)
    assert.equal(excess.netRemitDue, 0)
    assert.equal(excess.totalRemitted, 0)
    assert.equal(excess.variance, 0)
  })

  it('executes full settlement with multi-treasury remittance and remaining stock return', async () => {
    let cashTx = []
    let pendingTx = []
    let treasuries = [
      { id: 'tr-van', type: 'van_cash', balance: 25000 },
      { id: 'tr-safe', type: 'cash', balance: 50000 },
      { id: 'tr-bank', type: 'bank', balance: 100000 },
    ]
    let invStock = [
      { warehouseId: 'van-1', itemId: 'it-1', quantity: 8, unit: 'كرتونة' },
      { warehouseId: 'wh-main', itemId: 'it-1', quantity: 50, unit: 'كرتونة' },
    ]

    const storeActions = {
      addCashTransaction: (tx) => {
        cashTx.push(tx)
        treasuries = treasuries.map((t) => t.id === tx.treasuryId ? { ...t, balance: t.balance - tx.amount } : t)
      },
      addPendingCashTransfer: (pct) => { pendingTx.push(pct) },
      confirmCashTransfer: (id) => {
        const target = pendingTx.find((p) => p.id === id)
        if (target) {
          treasuries = treasuries.map((t) => {
            if (t.id === target.fromTreasuryId) return { ...t, balance: t.balance - target.amount }
            if (t.id === target.toTreasuryId) return { ...t, balance: t.balance + target.amount }
            return t
          })
        }
      },
    }

    const storeState = {
      warehouses: [{ id: 'van-1', name: 'سيارة 1', type: 'van' }, { id: 'wh-main', name: 'مخزن رئيسي', type: 'cold_store' }],
      items: [{ id: 'it-1', name: 'كفتة', piecesPerCarton: 20 }],
      stockAudits: [],
      inventoryStock: invStock,
    }
    const setStoreState = (u) => {
      const next = typeof u === 'function' ? u(storeState) : u
      if (next.inventoryStock) invStock = next.inventoryStock
    }

    const res = await executeVanSettlement(
      {
        vanWarehouseId: 'van-1', driverId: 'drv-1', vanName: 'سيارة 1', settlementDate: '2026-11-08', grossCash: 25000,
        expenses: [{ amount: 800, categoryName: 'سولار محطة' }, { amount: 200, categoryName: 'كارتة طريق' }],
        revenue: {
          payments: [
            { destinationTreasuryId: 'tr-safe', amount: 14000, method: 'cash' },
            { destinationTreasuryId: 'tr-bank', amount: 10000, method: 'transfer' },
          ],
        },
        stockSettlement: { action: 'return', targetWarehouseId: 'wh-main', items: [{ itemId: 'it-1', remainingQuantity: 8, unit: 'كرتونة' }] },
        vanTreasuryId: 'tr-van',
      },
      storeActions, storeState, setStoreState
    )

    assert.equal(res.success, true)
    assert.equal(res.settlement.totalExpenses, 1000)
    assert.equal(res.settlement.netRemitDue, 24000)
    assert.equal(res.settlement.totalRemitted, 24000)
    assert.equal(res.settlement.variance, 0)
    assert.equal(treasuries.find((t) => t.id === 'tr-van').balance, 0)
    assert.equal(treasuries.find((t) => t.id === 'tr-safe').balance, 64000)
    assert.equal(treasuries.find((t) => t.id === 'tr-bank').balance, 110000)
    assert.equal(invStock.find((s) => s.warehouseId === 'van-1' && s.itemId === 'it-1').quantity, 0)
    assert.equal(invStock.find((s) => s.warehouseId === 'wh-main' && s.itemId === 'it-1').quantity, 58)
  })
})
