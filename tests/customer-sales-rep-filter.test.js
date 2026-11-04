import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Customer Sales Rep Filtering', () => {
  const sampleClients = [
    { id: 'c1', name: 'عميل 1', salesRepName: 'أحمد محمود', balance: 5000 },
    { id: 'c2', name: 'عميل 2', salesRepName: 'أحمد محمود', balance: 0 },
    { id: 'c3', name: 'عميل 3', salesRepName: 'محمود خليل', balance: 12000 },
    { id: 'c4', name: 'عميل 4', salesRepName: '', balance: -2000 },
    { id: 'c5', name: 'عميل 5', salesRepName: 'إدارة مباشرة (بدون مندوب)', balance: 3000 },
  ]

  const salesReps = [
    { id: 'r1', name: 'أحمد محمود' },
    { id: 'r2', name: 'محمود خليل' },
    { id: 'r3', name: 'علي حسن' },
  ]

  it('correctly aggregates rep counts including direct management and 0-count reps', () => {
    const repMap = new Map()
    sampleClients.forEach((c) => {
      const rep = (c.salesRepName || '').trim() || 'إدارة مباشرة (بدون مندوب)'
      repMap.set(rep, (repMap.get(rep) || 0) + 1)
    })
    salesReps.forEach((r) => {
      if (r?.name && !repMap.has(r.name)) {
        repMap.set(r.name, 0)
      }
    })
    const entries = Array.from(repMap.entries()).map(([name, count]) => ({ name, count }))

    assert.equal(entries.find((e) => e.name === 'أحمد محمود')?.count, 2)
    assert.equal(entries.find((e) => e.name === 'محمود خليل')?.count, 1)
    assert.equal(entries.find((e) => e.name === 'علي حسن')?.count, 0)
    assert.equal(entries.find((e) => e.name === 'إدارة مباشرة (بدون مندوب)')?.count, 2)
  })

  it('filters clients list accurately when a specific sales rep is selected', () => {
    const filterByRep = (clients, repName) => {
      if (repName === 'all') return clients
      return clients.filter((c) => {
        const rep = (c.salesRepName || '').trim() || 'إدارة مباشرة (بدون مندوب)'
        return rep === repName
      })
    }

    const ahmedClients = filterByRep(sampleClients, 'أحمد محمود')
    assert.equal(ahmedClients.length, 2)
    assert.deepEqual(ahmedClients.map((c) => c.id), ['c1', 'c2'])

    const directClients = filterByRep(sampleClients, 'إدارة مباشرة (بدون مندوب)')
    assert.equal(directClients.length, 2)
    assert.deepEqual(directClients.map((c) => c.id), ['c4', 'c5'])

    const allClients = filterByRep(sampleClients, 'all')
    assert.equal(allClients.length, 5)
  })
})
