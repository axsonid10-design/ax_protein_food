import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { processInvoiceStoreState } from '../src/store/storeCacheHelper.js'

describe('Supplier as Customer & Debt Offset (المقاصة)', () => {
  const initialSuppliers = [
    { id: 's1', name: 'شركة البركة للحوم', companyName: 'شركة البركة للحوم', balance: 20000 },
  ]
  const initialClients = [
    { id: 'c1', name: 'سوبر ماركت النور', balance: 5000 },
  ]
  const baseState = {
    invoices: [],
    suppliers: initialSuppliers,
    clients: initialClients,
    inventoryStock: [{ warehouseId: 'wh1', itemId: 'it1', quantity: 100 }],
    treasuryAccounts: [{ id: 'tr1', name: 'الخزينة الرئيسية', balance: 50000 }],
    cashTransactions: [],
  }

  it('offsets supplier debt when supplier purchases goods in a sales invoice', () => {
    const saleInvoiceToSupplier = {
      id: 'inv-sale-1',
      code: 'INV-1001',
      type: 'sale',
      partyType: 'supplier',
      partyKind: 'supplier',
      partyName: 'شركة البركة للحوم',
      warehouseId: 'wh1',
      items: [{ itemId: 'it1', quantity: 10, price: 500 }],
      total: 5000,
      paidAmount: 0,
      remainingAmount: 5000,
    }

    const nextState = processInvoiceStoreState(baseState, saleInvoiceToSupplier)
    const targetSupplier = nextState.suppliers.find((s) => s.id === 's1')

    assert.equal(targetSupplier.balance, 15000)
  })

  it('allows supplier balance to become negative if their purchases exceed payables', () => {
    const bigSaleInvoice = {
      id: 'inv-sale-2',
      code: 'INV-1002',
      type: 'sale',
      partyType: 'supplier',
      partyKind: 'supplier',
      partyName: 'شركة البركة للحوم',
      warehouseId: 'wh1',
      items: [{ itemId: 'it1', quantity: 60, price: 500 }],
      total: 30000,
      paidAmount: 0,
      remainingAmount: 30000,
    }

    const nextState = processInvoiceStoreState(baseState, bigSaleInvoice)
    const targetSupplier = nextState.suppliers.find((s) => s.id === 's1')

    assert.equal(targetSupplier.balance, -10000)
  })

  it('handles regular purchase invoice to supplier increasing payables', () => {
    const purchaseInvoice = {
      id: 'inv-pur-1',
      code: 'PUR-2001',
      type: 'purchase',
      partyType: 'supplier',
      partyKind: 'supplier',
      partyName: 'شركة البركة للحوم',
      warehouseId: 'wh1',
      items: [{ itemId: 'it1', quantity: 20, price: 400 }],
      total: 8000,
      paidAmount: 0,
      remainingAmount: 8000,
    }

    const nextState = processInvoiceStoreState(baseState, purchaseInvoice)
    const targetSupplier = nextState.suppliers.find((s) => s.id === 's1')

    assert.equal(targetSupplier.balance, 28000)
  })
})
