import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  getLatestConfirmedAudit,
  checkTransferAuditDiscrepancy,
  calculateTransferStockMovement,
} from '../src/store/transferAuditHelpers.js'
import { useAXStore } from '../src/store/useAXStore.js'
import {
  formatDateOnly,
  formatDateTime,
  formatDualDates,
  isDateBefore,
  compareDates,
  isSameDay,
} from '../src/utils/dateHelpers.js'

describe('Challenger 1 — Empirical Challenge 1: Unilateral & Bilateral Transfer Audit Shield', () => {
  const warehouses = [
    { id: 'wh-cairo-cold', name: 'مخزن القاهرة المركزي' },
    { id: 'wh-giza-branch', name: 'مخزن فرع الجيزة' },
    { id: 'wh-alex-freezer', name: 'مخزن تجميد الإسكندرية' },
  ]

  const mockAudits = [
    {
      id: 'aud-cairo-nov',
      warehouseId: 'wh-cairo-cold',
      date: '2026-11-01',
      status: 'confirmed',
    },
    {
      id: 'aud-giza-nov',
      warehouseId: 'wh-giza-branch',
      date: '2026-11-02',
      status: 'approved',
    },
  ]

  test('should shield source warehouse stock 100% when source is audited after transfer date', () => {
    const initialStock = [
      { warehouseId: 'wh-cairo-cold', itemId: 'meat-tenderloin', quantity: 80, unit: 'كرتونة' },
      { warehouseId: 'wh-alex-freezer', itemId: 'meat-tenderloin', quantity: 20, unit: 'كرتونة' },
    ]

    const transfer = {
      id: 'trf-source-backdated',
      fromId: 'wh-cairo-cold',
      toId: 'wh-alex-freezer',
      operationalDate: '2026-10-25',
      items: [{ itemId: 'meat-tenderloin', quantity: 25, unit: 'كرتونة' }],
    }

    const res = calculateTransferStockMovement(transfer, initialStock, mockAudits, warehouses)

    assert.equal(res.isAuditDiscrepancy, true)
    assert.equal(res.isFromBackdated, true)
    assert.equal(res.isToBackdated, false)
    assert.ok(res.auditDiscrepancyNote.includes('مخزن القاهرة المركزي'))
    assert.ok(!res.auditDiscrepancyNote.includes('مخزن تجميد الإسكندرية'))

    const cairoStock = res.updatedStock.find(
      (s) => s.warehouseId === 'wh-cairo-cold' && s.itemId === 'meat-tenderloin'
    )
    assert.equal(cairoStock.quantity, 80)

    const alexStock = res.updatedStock.find(
      (s) => s.warehouseId === 'wh-alex-freezer' && s.itemId === 'meat-tenderloin'
    )
    assert.equal(alexStock.quantity, 45)
  })

  test('should shield destination warehouse stock 100% when destination is audited after transfer date', () => {
    const initialStock = [
      { warehouseId: 'wh-alex-freezer', itemId: 'beef-cubes', quantity: 60, unit: 'كرتونة' },
      { warehouseId: 'wh-giza-branch', itemId: 'beef-cubes', quantity: 40, unit: 'كرتونة' },
    ]

    const transfer = {
      id: 'trf-dest-backdated',
      fromId: 'wh-alex-freezer',
      toId: 'wh-giza-branch',
      operationalDate: '2026-10-30',
      items: [{ itemId: 'beef-cubes', quantity: 15, unit: 'كرتونة' }],
    }

    const res = calculateTransferStockMovement(transfer, initialStock, mockAudits, warehouses)

    assert.equal(res.isAuditDiscrepancy, true)
    assert.equal(res.isFromBackdated, false)
    assert.equal(res.isToBackdated, true)
    assert.ok(res.auditDiscrepancyNote.includes('مخزن فرع الجيزة'))

    const alexStock = res.updatedStock.find(
      (s) => s.warehouseId === 'wh-alex-freezer' && s.itemId === 'beef-cubes'
    )
    assert.equal(alexStock.quantity, 45)

    const gizaStock = res.updatedStock.find(
      (s) => s.warehouseId === 'wh-giza-branch' && s.itemId === 'beef-cubes'
    )
    assert.equal(gizaStock.quantity, 40)
  })

  test('should shield BOTH warehouses when both were audited after transfer date', () => {
    const initialStock = [
      { warehouseId: 'wh-cairo-cold', itemId: 'minced-meat', quantity: 120, unit: 'كرتونة' },
      { warehouseId: 'wh-giza-branch', itemId: 'minced-meat', quantity: 50, unit: 'كرتونة' },
    ]

    const transfer = {
      id: 'trf-both-backdated',
      fromId: 'wh-cairo-cold',
      toId: 'wh-giza-branch',
      operationalDate: '2026-10-15',
      items: [{ itemId: 'minced-meat', quantity: 30, unit: 'كرتونة' }],
    }

    const res = calculateTransferStockMovement(transfer, initialStock, mockAudits, warehouses)

    assert.equal(res.isAuditDiscrepancy, true)
    assert.equal(res.isFromBackdated, true)
    assert.equal(res.isToBackdated, true)
    assert.ok(res.auditDiscrepancyNote.includes('مخزن القاهرة المركزي'))
    assert.ok(res.auditDiscrepancyNote.includes('مخزن فرع الجيزة'))

    const cairoStock = res.updatedStock.find(
      (s) => s.warehouseId === 'wh-cairo-cold' && s.itemId === 'minced-meat'
    )
    assert.equal(cairoStock.quantity, 120)

    const gizaStock = res.updatedStock.find(
      (s) => s.warehouseId === 'wh-giza-branch' && s.itemId === 'minced-meat'
    )
    assert.equal(gizaStock.quantity, 50)
  })

  test('should execute normal stock mutations when neither warehouse has a post-dating audit', () => {
    const initialStock = [
      { warehouseId: 'wh-cairo-cold', itemId: 'liver-slices', quantity: 70, unit: 'كرتونة' },
      { warehouseId: 'wh-alex-freezer', itemId: 'liver-slices', quantity: 10, unit: 'كرتونة' },
    ]

    const transfer = {
      id: 'trf-normal-postdated',
      fromId: 'wh-cairo-cold',
      toId: 'wh-alex-freezer',
      operationalDate: '2026-11-05',
      items: [{ itemId: 'liver-slices', quantity: 20, unit: 'كرتونة' }],
    }

    const res = calculateTransferStockMovement(transfer, initialStock, mockAudits, warehouses)

    assert.equal(res.isAuditDiscrepancy, false)
    assert.equal(res.isFromBackdated, false)
    assert.equal(res.isToBackdated, false)
    assert.equal(res.auditDiscrepancyNote, '')

    const cairoStock = res.updatedStock.find(
      (s) => s.warehouseId === 'wh-cairo-cold' && s.itemId === 'liver-slices'
    )
    assert.equal(cairoStock.quantity, 50)

    const alexStock = res.updatedStock.find(
      (s) => s.warehouseId === 'wh-alex-freezer' && s.itemId === 'liver-slices'
    )
    assert.equal(alexStock.quantity, 30)
  })
})

describe('Challenger 1 — Empirical Challenge 2: Audit Logs Immutability & Chronological Integrity', () => {
  test('should preserve audit sessions and items 100% untouched through full transfer lifecycle', () => {
    const certifiedAudits = Object.freeze([
      {
        id: 'aud-baseline-1',
        warehouseId: 'wh-wh1',
        warehouseName: 'المستودع الرئيسي',
        auditDate: '2026-11-01',
        status: 'approved',
        itemsCount: 15,
        totalVarianceCost: 0,
      },
    ])

    useAXStore.setState({
      warehouses: [
        { id: 'wh-wh1', name: 'المستودع الرئيسي' },
        { id: 'wh-wh2', name: 'مستودع العبور' },
      ],
      stockAudits: [...certifiedAudits],
      inventoryStock: [
        { warehouseId: 'wh-wh1', itemId: 'ribeye-cuts', quantity: 200, unit: 'كرتونة' },
        { warehouseId: 'wh-wh2', itemId: 'ribeye-cuts', quantity: 50, unit: 'كرتونة' },
      ],
      transfers: [],
    })

    const initialAuditSnapshot = JSON.stringify(useAXStore.getState().stockAudits)

    useAXStore.getState().addTransfer({
      id: 'trf-emp-back-1',
      code: 'TRF-EMP-001',
      fromId: 'wh-wh1',
      toId: 'wh-wh2',
      date: '2026-10-10',
      items: [{ itemId: 'ribeye-cuts', quantity: 40, unit: 'كرتونة' }],
      status: 'pending',
    })

    const trf1 = useAXStore.getState().transfers.find((t) => t.id === 'trf-emp-back-1')
    assert.equal(trf1.isAuditDiscrepancy, true)

    useAXStore.getState().confirmTransfer('trf-emp-back-1')

    const afterConfirmAuditSnapshot = JSON.stringify(useAXStore.getState().stockAudits)
    assert.equal(afterConfirmAuditSnapshot, initialAuditSnapshot)

    const wh1Stock = useAXStore.getState().inventoryStock.find(
      (s) => s.warehouseId === 'wh-wh1' && s.itemId === 'ribeye-cuts'
    )
    assert.equal(wh1Stock.quantity, 200)

    const wh2Stock = useAXStore.getState().inventoryStock.find(
      (s) => s.warehouseId === 'wh-wh2' && s.itemId === 'ribeye-cuts'
    )
    assert.equal(wh2Stock.quantity, 90)

    useAXStore.getState().addTransfer({
      id: 'trf-emp-normal-2',
      code: 'TRF-EMP-002',
      fromId: 'wh-wh1',
      toId: 'wh-wh2',
      date: '2026-11-03',
      items: [{ itemId: 'ribeye-cuts', quantity: 30, unit: 'كرتونة' }],
      status: 'pending',
    })

    useAXStore.getState().confirmTransfer('trf-emp-normal-2')

    const wh1StockAfterNormal = useAXStore.getState().inventoryStock.find(
      (s) => s.warehouseId === 'wh-wh1' && s.itemId === 'ribeye-cuts'
    )
    assert.equal(wh1StockAfterNormal.quantity, 170)

    const wh2StockAfterNormal = useAXStore.getState().inventoryStock.find(
      (s) => s.warehouseId === 'wh-wh2' && s.itemId === 'ribeye-cuts'
    )
    assert.equal(wh2StockAfterNormal.quantity, 120)

    const finalAuditSnapshot = JSON.stringify(useAXStore.getState().stockAudits)
    assert.equal(finalAuditSnapshot, initialAuditSnapshot)
  })

  test('should handle multi-item transfers with new destination items when destination is audited vs not audited', () => {
    const audits = [
      { id: 'aud-dest-shielded', warehouseId: 'wh-dest-audited', date: '2026-11-01', status: 'approved' },
    ]

    const initialStock = [
      { warehouseId: 'wh-source', itemId: 'item-a', quantity: 50, unit: 'كرتونة' },
      { warehouseId: 'wh-source', itemId: 'item-b', quantity: 60, unit: 'كرتونة' },
    ]

    const transferToAudited = {
      fromId: 'wh-source',
      toId: 'wh-dest-audited',
      operationalDate: '2026-10-20',
      items: [
        { itemId: 'item-a', quantity: 10, unit: 'كرتونة' },
        { itemId: 'item-b', quantity: 15, unit: 'كرتونة' },
      ],
    }

    const resAudited = calculateTransferStockMovement(transferToAudited, initialStock, audits)
    const newItemsInAudited = resAudited.updatedStock.filter((s) => s.warehouseId === 'wh-dest-audited')
    assert.equal(newItemsInAudited.length, 0)

    const transferToUnaudited = {
      fromId: 'wh-source',
      toId: 'wh-dest-fresh',
      operationalDate: '2026-10-20',
      items: [
        { itemId: 'item-a', quantity: 10, unit: 'كرتونة' },
        { itemId: 'item-b', quantity: 15, unit: 'كرتونة' },
      ],
    }

    const resUnaudited = calculateTransferStockMovement(transferToUnaudited, initialStock, audits)
    const freshDestA = resUnaudited.updatedStock.find((s) => s.warehouseId === 'wh-dest-fresh' && s.itemId === 'item-a')
    const freshDestB = resUnaudited.updatedStock.find((s) => s.warehouseId === 'wh-dest-fresh' && s.itemId === 'item-b')
    assert.ok(freshDestA)
    assert.equal(freshDestA.quantity, 10)
    assert.ok(freshDestB)
    assert.equal(freshDestB.quantity, 15)
  })
})

describe('Challenger 1 — Empirical Challenge 3: Idempotency & Edge Case Robustness', () => {
  test('should guarantee strict idempotency under rapid sequential confirmTransfer calls', () => {
    useAXStore.setState({
      transfers: [
        {
          id: 'trf-idem-1',
          code: 'TRF-IDEM-001',
          fromId: 'wh-src',
          toId: 'wh-dst',
          date: '2026-11-04',
          status: 'pending',
          items: [{ itemId: 'item-x', quantity: 10, unit: 'كرتونة' }],
        },
      ],
      inventoryStock: [
        { warehouseId: 'wh-src', itemId: 'item-x', quantity: 50, unit: 'كرتونة' },
        { warehouseId: 'wh-dst', itemId: 'item-x', quantity: 10, unit: 'كرتونة' },
      ],
      stockAudits: [],
      warehouses: [],
    })

    for (let i = 0; i < 15; i++) {
      useAXStore.getState().confirmTransfer('trf-idem-1')
    }

    const srcStock = useAXStore.getState().inventoryStock.find(
      (s) => s.warehouseId === 'wh-src' && s.itemId === 'item-x'
    )
    const dstStock = useAXStore.getState().inventoryStock.find(
      (s) => s.warehouseId === 'wh-dst' && s.itemId === 'item-x'
    )

    assert.equal(srcStock.quantity, 40)
    assert.equal(dstStock.quantity, 20)
  })

  test('should allow negative stock balances when transferring more than available stock', () => {
    const stock = [{ warehouseId: 'wh-dry', itemId: 'item-overdraw', quantity: 5, unit: 'كرتونة' }]
    const transfer = {
      fromId: 'wh-dry',
      toId: 'wh-wet',
      date: '2026-11-04',
      items: [{ itemId: 'item-overdraw', quantity: 50, unit: 'كرتونة' }],
    }

    const { updatedStock } = calculateTransferStockMovement(transfer, stock, [])
    const dryStock = updatedStock.find((s) => s.warehouseId === 'wh-dry')
    assert.equal(dryStock.quantity, -45)
  })

  test('should handle null, empty, or zero-quantity transfers gracefully without throwing', () => {
    assert.doesNotThrow(() => calculateTransferStockMovement(null))
    assert.doesNotThrow(() => calculateTransferStockMovement({}))
    assert.doesNotThrow(() => checkTransferAuditDiscrepancy(null))
    assert.doesNotThrow(() => checkTransferAuditDiscrepancy({}))
    assert.doesNotThrow(() => getLatestConfirmedAudit(null, null))

    const zeroTransfer = {
      fromId: 'wh-1',
      toId: 'wh-2',
      date: '2026-11-04',
      items: [{ itemId: 'item-zero', quantity: 0, unit: 'كرتونة' }],
    }
    const initial = [{ warehouseId: 'wh-1', itemId: 'item-zero', quantity: 10, unit: 'كرتونة' }]
    const { updatedStock } = calculateTransferStockMovement(zeroTransfer, initial, [])
    assert.equal(updatedStock[0].quantity, 10)
  })
})

describe('Challenger 1 — Empirical Challenge 4: Audit Status Filtering & Chronology Sorting', () => {
  test('should ignore non-approved audits even if they carry later chronological timestamps', () => {
    const audits = [
      { id: 'aud-early-approved', warehouseId: 'wh-poly', date: '2026-10-15', status: 'approved' },
      { id: 'aud-late-rejected', warehouseId: 'wh-poly', date: '2026-11-01', status: 'rejected' },
      { id: 'aud-latest-cancelled', warehouseId: 'wh-poly', date: '2026-11-03', status: 'cancelled' },
    ]

    const latest = getLatestConfirmedAudit('wh-poly', audits)
    assert.ok(latest)
    assert.equal(latest.id, 'aud-early-approved')
    assert.equal(latest.date, '2026-10-15')
  })

  test('should resolve correct latest audit when audits are passed out of chronological order', () => {
    const audits = [
      { id: 'aud-mid', warehouse_id: 'wh-order', auditDate: '2026-10-20', status: 'confirmed' },
      { id: 'aud-newest', warehouse_id: 'wh-order', operationalDate: '2026-11-02', status: 'completed' },
      { id: 'aud-oldest', warehouse_id: 'wh-order', date: '2026-09-01', status: 'confirmed' },
    ]

    const latest = getLatestConfirmedAudit('wh-order', audits)
    assert.ok(latest)
    assert.equal(latest.id, 'aud-newest')
  })

  test('should return null when warehouseId has no approved audits', () => {
    const audits = [
      { id: 'aud-draft', warehouseId: 'wh-unconfirmed', date: '2026-11-01', status: 'draft' },
    ]
    assert.equal(getLatestConfirmedAudit('wh-unconfirmed', audits), null)
    assert.equal(getLatestConfirmedAudit('wh-nonexistent', audits), null)
  })
})

describe('Challenger 1 — Empirical Challenge 5: Date Utility Edge Cases', () => {
  test('formatDualDates should identify different operational vs creation dates correctly', () => {
    const diff = formatDualDates({
      operationalDate: '2026-10-20',
      createdAt: '2026-11-04T10:30:00Z',
    })
    assert.equal(diff.isDifferentDate, true)
    assert.equal(diff.operationalDateStr, '2026-10-20')
    assert.ok(diff.createdAtStr.includes('2026-11-04'))

    const same = formatDualDates({
      operationalDate: '2026-11-04',
      createdAt: '2026-11-04T08:00:00Z',
    })
    assert.equal(same.isDifferentDate, false)
  })

  test('compareDates and isSameDay should handle null, undefined, and valid inputs symmetrically', () => {
    assert.equal(compareDates(null, null), 0)
    assert.equal(compareDates(null, '2026-11-01'), -1)
    assert.equal(compareDates('2026-11-01', null), 1)
    assert.ok(compareDates('2026-10-01', '2026-11-01') < 0)
    assert.ok(compareDates('2026-11-01', '2026-10-01') > 0)

    assert.equal(isSameDay('2026-11-04T10:00:00Z', '2026-11-04'), true)
    assert.equal(isSameDay('2026-11-04', '2026-11-05'), false)
  })

  test('isDateBefore should accurately handle ISO and date-only strings', () => {
    assert.equal(isDateBefore('2026-10-15', '2026-10-16'), true)
    assert.equal(isDateBefore('2026-10-16', '2026-10-15'), false)
    assert.equal(isDateBefore('2026-10-15', '2026-10-15'), false)
    assert.equal(isDateBefore(null, '2026-10-15'), false)
    assert.equal(isDateBefore('2026-10-15', null), false)
  })
})
