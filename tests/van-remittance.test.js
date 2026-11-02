import { describe, it } from 'node:test'
import assert from 'node:assert'
import { useAXStore } from '../src/store/useAXStore.js'

describe('Van Cash Remittance & Settlement System', () => {
  it('should initialize with distinct van_cash treasury account', () => {
    const treasuries = useAXStore.getState().treasuryAccounts
    assert(Array.isArray(treasuries), 'treasuryAccounts should be an array')
    const vanCash = treasuries.find((t) => t.type === 'van_cash')
    assert(vanCash, 'van_cash treasury account must exist')
    const centralCash = treasuries.find((t) => t.type === 'cash')
    assert(centralCash, 'central cash treasury account must exist')
    assert.notStrictEqual(vanCash.id, centralCash.id, 'van cash and central cash must have different ids')
  })

  it('should create and confirm van cash remittance atomically', () => {
    const vanId = 'c0000000-0000-0000-0000-000000000005'
    const centralId = 'c0000000-0000-0000-0000-000000000001'

    useAXStore.setState({
      treasuryAccounts: [
        { id: centralId, name: 'الخزينة الرئيسية', balance: 5000, type: 'cash' },
        { id: vanId, name: 'عهدة سيارة التوزيع', balance: 1500, type: 'van_cash' },
      ],
      pendingCashTransfers: [],
    })

    const transfer = {
      id: 'remit-test-1',
      code: 'REMIT-9999',
      fromTreasuryId: vanId,
      toTreasuryId: centralId,
      amount: 500,
      status: 'pending',
      senderName: 'المندوب',
      notes: 'تصفية نقدية تجريبية',
    }

    useAXStore.getState().addPendingCashTransfer(transfer)

    const pending = useAXStore.getState().pendingCashTransfers
    assert.strictEqual(pending.length, 1)
    assert.strictEqual(pending[0].id, 'remit-test-1')
    assert.strictEqual(pending[0].status, 'pending')

    useAXStore.getState().confirmCashTransfer('remit-test-1')

    const state = useAXStore.getState()
    const updatedVan = state.treasuryAccounts.find((t) => t.id === vanId)
    const updatedCentral = state.treasuryAccounts.find((t) => t.id === centralId)
    const updatedTransfer = state.pendingCashTransfers.find((p) => p.id === 'remit-test-1')

    assert.strictEqual(updatedTransfer.status, 'confirmed')
    assert.strictEqual(updatedVan.balance, 1000)
    assert.strictEqual(updatedCentral.balance, 5500)
  })

  it('should handle uninitialized or null pendingCashTransfers gracefully', () => {
    useAXStore.setState({ pendingCashTransfers: null })

    assert.doesNotThrow(() => {
      useAXStore.getState().addPendingCashTransfer({
        id: 'remit-safe-null',
        code: 'REMIT-0001',
        fromTreasuryId: 'c1',
        toTreasuryId: 'c2',
        amount: 200,
      })
    })

    const list = useAXStore.getState().pendingCashTransfers
    assert(Array.isArray(list))
    assert.strictEqual(list.length, 1)
  })
})
