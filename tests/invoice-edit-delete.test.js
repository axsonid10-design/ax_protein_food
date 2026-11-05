import test from 'node:test';
import assert from 'node:assert/strict';
import {
  revertInvoiceStoreState,
  deleteInvoiceStoreState,
  updateInvoiceStoreState
} from '../src/store/storeCacheHelper.js';

test('deleteInvoiceStoreState: sales invoice reversal', () => {
  const initialState = {
    invoices: [
      {
        id: 'inv-sale-1',
        type: 'sale',
        partyKind: 'customer',
        partyId: 'c1',
        partyName: 'عميل تجريبي',
        totalAmount: 1000,
        paidAmount: 400,
        remainingAmount: 600,
        treasuryId: 't1',
        warehouseId: 'w1',
        items: [
          { itemId: 'item-1', quantity: 10 }
        ]
      }
    ],
    inventoryStock: [
      { warehouseId: 'w1', itemId: 'item-1', quantity: 90 }
    ],
    clients: [
      { id: 'c1', name: 'عميل تجريبي', balance: 600 }
    ],
    suppliers: [],
    treasuryAccounts: [
      { id: 't1', balance: 1400 }
    ],
    cashTransactions: [
      { id: 'tx-1', referenceId: 'inv-sale-1', amount: 400 }
    ]
  };

  const nextState = deleteInvoiceStoreState(initialState, 'inv-sale-1');

  assert.equal(nextState.invoices.length, 0);
  assert.equal(nextState.inventoryStock[0].quantity, 100);
  assert.equal(nextState.clients[0].balance, 0);
  assert.equal(nextState.treasuryAccounts[0].balance, 1000);
});

test('deleteInvoiceStoreState: purchase invoice reversal', () => {
  const initialState = {
    invoices: [
      {
        id: 'inv-pur-1',
        type: 'purchase',
        partyKind: 'supplier',
        partyId: 's1',
        partyName: 'مورد تجريبي',
        totalAmount: 2000,
        paidAmount: 500,
        remainingAmount: 1500,
        treasuryId: 't1',
        warehouseId: 'w1',
        items: [
          { itemId: 'item-2', quantity: 20 }
        ]
      }
    ],
    inventoryStock: [
      { warehouseId: 'w1', itemId: 'item-2', quantity: 50 }
    ],
    clients: [],
    suppliers: [
      { id: 's1', name: 'مورد تجريبي', balance: 1500 }
    ],
    treasuryAccounts: [
      { id: 't1', balance: 500 }
    ],
    cashTransactions: [
      { id: 'tx-2', referenceId: 'inv-pur-1', amount: 500 }
    ]
  };

  const nextState = deleteInvoiceStoreState(initialState, 'inv-pur-1');

  assert.equal(nextState.invoices.length, 0);
  assert.equal(nextState.inventoryStock[0].quantity, 30);
  assert.equal(nextState.suppliers[0].balance, 0);
  assert.equal(nextState.treasuryAccounts[0].balance, 1000);
});

test('updateInvoiceStoreState: update line items and payment accurately', () => {
  const initialState = {
    invoices: [
      {
        id: 'inv-sale-2',
        type: 'sale',
        partyKind: 'customer',
        partyId: 'c1',
        partyName: 'عميل تجريبي',
        totalAmount: 1000,
        paidAmount: 1000,
        remainingAmount: 0,
        treasuryId: 't1',
        warehouseId: 'w1',
        items: [
          { itemId: 'item-1', quantity: 10 }
        ]
      }
    ],
    inventoryStock: [
      { warehouseId: 'w1', itemId: 'item-1', quantity: 90 }
    ],
    clients: [
      { id: 'c1', name: 'عميل تجريبي', balance: 0 }
    ],
    suppliers: [],
    treasuryAccounts: [
      { id: 't1', balance: 2000 }
    ],
    cashTransactions: []
  };

  const updatedInvoice = {
    id: 'inv-sale-2',
    type: 'sale',
    partyKind: 'customer',
    partyId: 'c1',
    partyName: 'عميل تجريبي',
    totalAmount: 1500,
    paidAmount: 500,
    remainingAmount: 1000,
    treasuryId: 't1',
    warehouseId: 'w1',
    items: [
      { itemId: 'item-1', quantity: 15 }
    ]
  };

  const nextState = updateInvoiceStoreState(initialState, 'inv-sale-2', updatedInvoice);

  assert.equal(nextState.invoices[0].totalAmount, 1500);
  assert.equal(nextState.invoices[0].paidAmount, 500);
  assert.equal(nextState.invoices[0].remainingAmount, 1000);
  assert.equal(nextState.inventoryStock[0].quantity, 85);
  assert.equal(nextState.clients[0].balance, 1000);
  assert.equal(nextState.treasuryAccounts[0].balance, 1500);
});
