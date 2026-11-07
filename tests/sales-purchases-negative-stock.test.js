import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  processInvoiceStoreState,
  revertInvoiceStoreState,
} from '../src/store/storeCacheHelper.js'

describe('Sales & Purchases Separation, Negative Stock, and Persistence', () => {
  it('should allow negative stock when processing sale invoice on items with 0 stock', () => {
    const prevState = {
      invoices: [],
      inventoryStock: [
        { itemId: 'item-1', warehouseId: 'wh-1', quantity: 0 },
      ],
      clients: [{ id: 'cust-1', name: 'عميل تجريبي', balance: 0 }],
      suppliers: [],
      treasuryAccounts: [{ id: 'tr-1', balance: 1000 }],
      cashTransactions: [],
    }

    const saleInvoice = {
      id: 'inv-sale-1',
      type: 'sale',
      partyName: 'عميل تجريبي',
      partyKind: 'customer',
      warehouseId: 'wh-1',
      paidAmount: 0,
      remainingAmount: 500,
      total: 500,
      items: [
        { itemId: 'item-1', quantity: 15, unitPrice: 33.33 },
      ],
    }

    const nextState = processInvoiceStoreState(prevState, saleInvoice)
    const stockRow = nextState.inventoryStock.find(
      (s) => s.itemId === 'item-1' && s.warehouseId === 'wh-1'
    )

    assert.ok(stockRow, 'Stock row must exist')
    assert.strictEqual(
      stockRow.quantity,
      -15,
      'Stock must be allowed to go negative (-15) without clamping to 0'
    )
    assert.strictEqual(
      nextState.clients[0].balance,
      500,
      'Customer receivable debt must increase by remaining amount'
    )
  })

  it('should allow negative stock even if item had no prior warehouse record', () => {
    const prevState = {
      invoices: [],
      inventoryStock: [],
      clients: [{ id: 'cust-1', name: 'عميل تجريبي', balance: 0 }],
      suppliers: [],
      treasuryAccounts: [],
      cashTransactions: [],
    }

    const saleInvoice = {
      id: 'inv-sale-2',
      type: 'sale',
      partyName: 'عميل تجريبي',
      partyKind: 'customer',
      warehouseId: 'wh-2',
      paidAmount: 0,
      remainingAmount: 200,
      items: [
        { itemId: 'item-unstocked', quantity: 8, unitPrice: 25 },
      ],
    }

    const nextState = processInvoiceStoreState(prevState, saleInvoice)
    const stockRow = nextState.inventoryStock.find(
      (s) => s.itemId === 'item-unstocked' && s.warehouseId === 'wh-2'
    )

    assert.ok(stockRow, 'Auto-provisioned stock row must exist')
    assert.strictEqual(
      stockRow.quantity,
      -8,
      'Stock must be provisioned directly at -8'
    )
  })

  it('should allow purchase return to deduct stock into negative', () => {
    const prevState = {
      invoices: [],
      inventoryStock: [
        { itemId: 'item-2', warehouseId: 'wh-1', quantity: 2 },
      ],
      clients: [],
      suppliers: [{ id: 'sup-1', name: 'مورد تجريبي', balance: 1000 }],
      treasuryAccounts: [{ id: 'tr-1', balance: 500 }],
      cashTransactions: [],
    }

    const purchaseReturn = {
      id: 'ret-pur-1',
      type: 'purchase_return',
      partyName: 'مورد تجريبي',
      partyKind: 'supplier',
      warehouseId: 'wh-1',
      paidAmount: 0,
      remainingAmount: 300,
      items: [
        { itemId: 'item-2', quantity: 5, unitPrice: 60 },
      ],
    }

    const nextState = processInvoiceStoreState(prevState, purchaseReturn)
    const stockRow = nextState.inventoryStock.find(
      (s) => s.itemId === 'item-2' && s.warehouseId === 'wh-1'
    )

    assert.ok(stockRow, 'Stock row must exist')
    assert.strictEqual(
      stockRow.quantity,
      -3,
      'Purchase return deducting 5 from 2 must yield -3 without clamping to 0'
    )
    assert.strictEqual(
      nextState.suppliers[0].balance,
      700,
      'Supplier payable liability must decrease by 300'
    )
  })

  it('should properly restore stock when reverting sale invoice with negative stock', () => {
    const currentState = {
      invoices: [{ id: 'inv-sale-1' }],
      inventoryStock: [
        { itemId: 'item-1', warehouseId: 'wh-1', quantity: -15 },
      ],
      clients: [{ id: 'cust-1', name: 'عميل تجريبي', balance: 500 }],
      suppliers: [],
      treasuryAccounts: [],
      cashTransactions: [],
    }

    const saleInvoice = {
      id: 'inv-sale-1',
      type: 'sale',
      partyName: 'عميل تجريبي',
      partyKind: 'customer',
      warehouseId: 'wh-1',
      remainingAmount: 500,
      paidAmount: 0,
      items: [
        { itemId: 'item-1', quantity: 15, unitPrice: 33.33 },
      ],
    }

    const revertedState = revertInvoiceStoreState(currentState, saleInvoice)
    const stockRow = revertedState.inventoryStock.find(
      (s) => s.itemId === 'item-1' && s.warehouseId === 'wh-1'
    )

    assert.strictEqual(
      stockRow.quantity,
      0,
      'Reverting sale invoice of 15 from -15 must return to 0'
    )
  })

  it('should correctly partition invoices between Sales and Purchases domain filters', () => {
    const allInvoices = [
      { id: '1', type: 'sale', code: 'INV-SALE-001' },
      { id: '2', type: 'sale_return', code: 'RET-SALE-001' },
      { id: '3', type: 'sale', status: 'sale_return', code: 'RET-SALE-002' },
      { id: '4', type: 'purchase', code: 'INV-PUR-001' },
      { id: '5', type: 'purchase_return', code: 'RET-PUR-001' },
      { id: '6', type: 'purchase', status: 'purchase_return', code: 'RET-PUR-002' },
    ]

    const salesInvoices = allInvoices.filter(
      (inv) =>
        inv.type === 'sale' ||
        inv.type === 'sale_return' ||
        inv.status === 'sale_return' ||
        inv.code?.startsWith('RET-SALE')
    )

    const purchasesInvoices = allInvoices.filter(
      (inv) =>
        inv.type === 'purchase' ||
        inv.type === 'purchase_return' ||
        inv.status === 'purchase_return' ||
        inv.code?.startsWith('RET-PUR')
    )

    assert.strictEqual(salesInvoices.length, 3, 'Must filter exactly 3 sales/sale returns')
    assert.strictEqual(purchasesInvoices.length, 3, 'Must filter exactly 3 purchases/purchase returns')

    const salesOnly = salesInvoices.filter((inv) => inv.type === 'sale' && inv.status !== 'sale_return')
    const salesReturnsOnly = salesInvoices.filter((inv) => inv.type === 'sale_return' || inv.status === 'sale_return')
    assert.strictEqual(salesOnly.length, 1)
    assert.strictEqual(salesReturnsOnly.length, 2)
  })

  it('should verify hydrateFromSupabase preserves locally added invoices not yet synced', () => {
    const existingInvoices = [
      { id: 'inv-db-1', code: 'INV-1' },
      { id: 'inv-local-offline-2', code: 'INV-2' },
    ]

    const incomingDbPayload = [
      { id: 'inv-db-1', code: 'INV-1' },
    ]

    const incomingIds = new Set(incomingDbPayload.map((x) => x.id))
    const preservedLocal = existingInvoices.filter((x) => !incomingIds.has(x.id))
    const mergedInvoices = [...incomingDbPayload, ...preservedLocal]

    assert.strictEqual(mergedInvoices.length, 2, 'Merged list must retain local offline invoice')
    assert.ok(
      mergedInvoices.some((x) => x.id === 'inv-local-offline-2'),
      'Locally added invoice must survive rehydration'
    )
  })
})
