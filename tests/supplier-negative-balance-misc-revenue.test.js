import test from 'node:test';
import assert from 'node:assert/strict';
import { useAXStore } from '../src/store/useAXStore.js';

test('Supplier balance can be negative upon advance/overpayment', () => {
  const supplier = { id: 'sup-neg-1', name: 'مورد لحوم مجمدة الدلتا', balance: 1000 };
  const treasury = { id: 'tr-neg-1', name: 'الخزينة الرئيسية', balance: 50000 };

  useAXStore.setState({
    suppliers: [supplier],
    treasuryAccounts: [treasury],
    cashTransactions: [],
  });

  useAXStore.getState().addCashTransaction({
    id: 'tx-neg-1',
    code: 'PAY-9901',
    treasuryId: 'tr-neg-1',
    partyId: 'sup-neg-1',
    partyName: 'مورد لحوم مجمدة الدلتا',
    amount: 3500,
    type: 'supplier_payment',
    date: '2026-11-06',
  });

  const state = useAXStore.getState();
  const updatedSup = state.suppliers.find((s) => s.id === 'sup-neg-1');
  const updatedTr = state.treasuryAccounts.find((t) => t.id === 'tr-neg-1');

  assert.equal(updatedSup.balance, -2500);
  assert.equal(updatedTr.balance, 46500);
  assert.equal(state.cashTransactions.length, 1);
});

test('Diverse Revenue (other_income) increases treasury balance and records transaction', () => {
  const treasury = { id: 'tr-rev-1', name: 'الحساب البنكي', balance: 20000 };

  useAXStore.setState({
    suppliers: [{ id: 'sup-1', name: 'مورد ثابت', balance: 5000 }],
    clients: [{ id: 'client-1', name: 'عميل ثابت', balance: 4000 }],
    treasuryAccounts: [treasury],
    cashTransactions: [],
  });

  useAXStore.getState().addCashTransaction({
    id: 'tx-rev-1',
    code: 'REV-8801',
    treasuryId: 'tr-rev-1',
    partyType: 'income',
    partyName: 'بيع فوارغ كراتين وتغليف',
    amount: 6000,
    type: 'other_income',
    date: '2026-11-06',
    notes: '[إيرادات متنوعة] بيع فوارغ كراتين وتغليف',
  });

  const state = useAXStore.getState();
  const updatedTr = state.treasuryAccounts.find((t) => t.id === 'tr-rev-1');
  const updatedSup = state.suppliers.find((s) => s.id === 'sup-1');
  const updatedClient = state.clients.find((c) => c.id === 'client-1');

  assert.equal(updatedTr.balance, 26000);
  assert.equal(updatedSup.balance, 5000);
  assert.equal(updatedClient.balance, 4000);
  assert.equal(state.cashTransactions[0].type, 'other_income');
  assert.equal(state.cashTransactions[0].amount, 6000);
});
