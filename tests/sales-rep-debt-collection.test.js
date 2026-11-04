import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Sales Rep Debt Cards & Collection Sheet Calculations', () => {
  const sampleClients = [
    { id: 'c1', name: 'عميل أ', salesRepName: 'أحمد محمود', balance: 15000, phone: '0101' },
    { id: 'c2', name: 'عميل ب', salesRepName: 'أحمد محمود', balance: 7500, phone: '0102' },
    { id: 'c3', name: 'عميل ج', salesRepName: 'أحمد محمود', balance: 0, phone: '0103' },
    { id: 'c4', name: 'عميل د', salesRepName: 'أحمد محمود', balance: -2000, phone: '0104' },
    { id: 'c5', name: 'عميل هـ', salesRepName: 'محمود خليل', balance: 12000, phone: '0105' },
    { id: 'c6', name: 'عميل و', salesRepName: '', balance: 5000, phone: '0106' },
  ]

  const computeRepDebtStats = (clients, repName) => {
    const repClients = (clients || []).filter((c) => (c.salesRepName || '').trim() === (repName || '').trim())
    const indebtedClients = repClients.filter((c) => (Number(c.balance) || 0) > 0)
    const totalDebt = indebtedClients.reduce((sum, c) => sum + (Number(c.balance) || 0), 0)
    return {
      totalAssignedCount: repClients.length,
      indebtedCount: indebtedClients.length,
      totalDebtToCollect: totalDebt,
      indebtedClients,
    }
  }

  it('accurately calculates assigned indebted customers and total debt to collect for a rep', () => {
    const stats = computeRepDebtStats(sampleClients, 'أحمد محمود')
    assert.equal(stats.totalAssignedCount, 4)
    assert.equal(stats.indebtedCount, 2)
    assert.equal(stats.totalDebtToCollect, 22500)
    assert.deepEqual(stats.indebtedClients.map((c) => c.id), ['c1', 'c2'])
  })

  it('correctly handles reps with zero debts or zero assigned clients', () => {
    const emptyStats = computeRepDebtStats(sampleClients, 'مندوب غير موجود')
    assert.equal(emptyStats.totalAssignedCount, 0)
    assert.equal(emptyStats.indebtedCount, 0)
    assert.equal(emptyStats.totalDebtToCollect, 0)
    assert.deepEqual(emptyStats.indebtedClients, [])
  })
})
