import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Treasury Account Force Deletion & Historical Cascade', () => {
  const initialAccounts = [
    { id: 't1', name: 'الخزينة الرئيسية', balance: 50000, type: 'cash' },
    { id: 't2', name: 'حساب بنكي تجاري', balance: 500, type: 'bank' },
  ]

  const sampleTransactions = [
    { id: 'tx1', treasuryId: 't1', amount: 1000, description: 'سند قبض' },
    { id: 'tx2', treasuryId: 't2', amount: 500, description: 'إيداع بنكي' },
  ]

  const deleteTreasuryAccountLogic = (state, id) => {
    const deletedAccount = state.treasuryAccounts.find((t) => t.id === id)
    const nextAccounts = state.treasuryAccounts.filter((t) => t.id !== id)
    const nextTransactions = (state.cashTransactions || []).map((tx) => {
      if (tx.treasuryId === id) {
        return {
          ...tx,
          treasuryName: `[حساب محذوف: ${deletedAccount?.name || 'خزينة'}]`,
          isDeletedAccount: true,
        }
      }
      return tx
    })
    return {
      treasuryAccounts: nextAccounts,
      cashTransactions: nextTransactions,
    }
  }

  const getTreasuryName = (accounts, id) => {
    const acc = accounts.find((t) => t.id === id)
    return acc?.name || (id ? '[حساب محذوف]' : '—')
  }

  it('deletes account, deducts its balance from total liquidity, and marks historical transactions', () => {
    const state = {
      treasuryAccounts: initialAccounts,
      cashTransactions: sampleTransactions,
    }

    const initialTotalLiquidity = state.treasuryAccounts.reduce((sum, t) => sum + Number(t.balance), 0)
    assert.equal(initialTotalLiquidity, 50500)

    const nextState = deleteTreasuryAccountLogic(state, 't2')

    assert.equal(nextState.treasuryAccounts.length, 1)
    assert.equal(nextState.treasuryAccounts.find((t) => t.id === 't2'), undefined)

    const nextTotalLiquidity = nextState.treasuryAccounts.reduce((sum, t) => sum + Number(t.balance), 0)
    assert.equal(nextTotalLiquidity, 50000)

    const historicalTx = nextState.cashTransactions.find((tx) => tx.id === 'tx2')
    assert.equal(historicalTx.isDeletedAccount, true)
    assert.match(historicalTx.treasuryName, /حساب محذوف: حساب بنكي تجاري/)

    assert.equal(getTreasuryName(nextState.treasuryAccounts, 't2'), '[حساب محذوف]')
    assert.equal(getTreasuryName(nextState.treasuryAccounts, 't1'), 'الخزينة الرئيسية')
  })
})
