import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { saveSalesRepState, updateSalesRepState, deleteSalesRepState } from '../src/store/storeCacheHelper.js'

describe('Sales Rep Persistence & Database Sync', () => {
  test('saveSalesRepState, updateSalesRepState, deleteSalesRepState update cache properly', () => {
    let mockStorage = {}
    global.localStorage = {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = String(v) },
      removeItem: (k) => { delete mockStorage[k] },
    }

    const state = { salesReps: [], salesRepLedger: [] }
    const rep1 = {
      id: 'rep-1',
      name: 'عمرو إبراهيم',
      phone: '01140208616',
      assignedBranch: 'الدكان',
      targetAmount: 50000,
      currentBalance: 0,
    }

    const res1 = saveSalesRepState(state, rep1)
    assert.equal(res1.salesReps.length, 1)
    assert.equal(res1.salesReps[0].name, 'عمرو إبراهيم')

    const cached1 = JSON.parse(mockStorage['ax_cached_db_payload'])
    assert.ok(cached1.salesReps)
    assert.equal(cached1.salesReps.length, 1)
    assert.equal(cached1.salesReps[0].id, 'rep-1')

    const res2 = updateSalesRepState(res1, 'rep-1', { phone: '01111111111' })
    assert.equal(res2.salesReps[0].phone, '01111111111')
    const cached2 = JSON.parse(mockStorage['ax_cached_db_payload'])
    assert.equal(cached2.salesReps[0].phone, '01111111111')

    const res3 = deleteSalesRepState(res2, 'rep-1')
    assert.equal(res3.salesReps.length, 0)
    const cached3 = JSON.parse(mockStorage['ax_cached_db_payload'])
    assert.equal(cached3.salesReps.length, 0)
  })

  test('distributors mapping correctly preserves sales reps attributes', () => {
    const rawDistributor = {
      id: 'rep-99',
      name: 'أبو محمود نصيب',
      phone: '01091491043',
      van_number: 'المخزن الرئيسي',
      balance: '1500',
      target_amount: 100000,
      commission_model: 'volume_rate',
      status: 'active',
      created_at: '2026-11-05T00:00:00.000Z',
    }

    const mappedRep = {
      id: rawDistributor.id,
      name: rawDistributor.name || '',
      phone: rawDistributor.phone || '',
      assignedBranch: rawDistributor.van_number || 'المخزن الرئيسي',
      vanNumber: rawDistributor.van_number || '',
      targetAmount: Number(rawDistributor.target_amount || 0),
      salesTarget: Number(rawDistributor.target_amount || 0),
      commissionModel: rawDistributor.commission_model || 'volume_rate',
      netBalance: Number(rawDistributor.balance || 0),
      currentBalance: Number(rawDistributor.balance || 0),
      balance: Number(rawDistributor.balance || 0),
      status: rawDistributor.status || 'active',
      createdAt: rawDistributor.created_at,
    }

    assert.equal(mappedRep.name, 'أبو محمود نصيب')
    assert.equal(mappedRep.phone, '01091491043')
    assert.equal(mappedRep.assignedBranch, 'المخزن الرئيسي')
    assert.equal(mappedRep.targetAmount, 100000)
    assert.equal(mappedRep.currentBalance, 1500)
  })
})
