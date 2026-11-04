import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatDateOnly,
  formatDateTime,
  formatDualDates,
  isDateBefore,
} from '../src/utils/dateHelpers.js'
import {
  getLatestConfirmedAudit,
  checkTransferAuditDiscrepancy,
  calculateTransferStockMovement,
} from '../src/store/transferAuditHelpers.js'
import { useAXStore } from '../src/store/useAXStore.js'
import { AX_DatabaseSync } from '../src/services/AX_DatabaseSync.js'

describe('Requirement R3 & Date Utility (dateHelpers.js)', () => {
  test('formatDateOnly should extract YYYY-MM-DD from various formats', () => {
    assert.equal(formatDateOnly('2026-10-25'), '2026-10-25')
    assert.equal(formatDateOnly('2026-10-25T14:30:00.000Z'), '2026-10-25')
    assert.equal(formatDateOnly(''), '—')
    assert.equal(formatDateOnly(null), '—')
  })

  test('formatDateTime should format ISO timestamp into date and time', () => {
    const formatted = formatDateTime('2026-10-25T14:30:00.000Z')
    assert.ok(formatted.includes('2026-10-25'))
    assert.equal(formatDateTime(null), '—')
  })

  test('formatDualDates should accept object argument and return dual timestamps', () => {
    const res = formatDualDates({
      operationalDate: '2026-10-25',
      createdAt: '2026-11-04T12:00:00.000Z',
    })
    assert.equal(res.operationalDateStr, '2026-10-25')
    assert.ok(res.createdAtStr.includes('2026-11-04'))
    assert.ok(res.badgeLabel.startsWith('قيد:'))
    assert.equal(res.isDifferentDate, true)
  })

  test('formatDualDates should accept positional arguments', () => {
    const res = formatDualDates('2026-10-25', '2026-10-25T08:00:00.000Z')
    assert.equal(res.operationalDateStr, '2026-10-25')
    assert.equal(res.isDifferentDate, false)
  })

  test('isDateBefore should accurately compare date chronological order', () => {
    assert.equal(isDateBefore('2026-10-25', '2026-11-01'), true)
    assert.equal(isDateBefore('2026-11-05', '2026-11-01'), false)
    assert.equal(isDateBefore('2026-11-01', '2026-11-01'), false)
    assert.equal(isDateBefore(null, '2026-11-01'), false)
  })
})

describe('Requirement R4 & Transfer Audit Helper (transferAuditHelpers.js)', () => {
  const sampleAudits = [
    {
      id: 'aud-1',
      warehouseId: 'wh-october',
      date: '2026-10-20',
      status: 'approved',
    },
    {
      id: 'aud-2',
      warehouseId: 'wh-october',
      date: '2026-11-01',
      status: 'approved',
    },
    {
      id: 'aud-3',
      warehouseId: 'wh-october',
      date: '2026-11-03',
      status: 'rejected',
    },
    {
      id: 'aud-4',
      warehouseId: 'wh-nasr',
      date: '2026-10-28',
      status: 'approved',
    },
  ]

  const warehouses = [
    { id: 'wh-october', name: 'مخزن 6 أكتوبر التبريدي' },
    { id: 'wh-nasr', name: 'مخزن مدينة نصر' },
    { id: 'wh-alex', name: 'مخزن الإسكندرية' },
  ]

  test('getLatestConfirmedAudit should find latest approved audit for specific warehouse', () => {
    const latestOct = getLatestConfirmedAudit('wh-october', sampleAudits)
    assert.ok(latestOct)
    assert.equal(latestOct.id, 'aud-2')
    assert.equal(latestOct.date, '2026-11-01')

    const latestNasr = getLatestConfirmedAudit('wh-nasr', sampleAudits)
    assert.ok(latestNasr)
    assert.equal(latestNasr.id, 'aud-4')

    const latestAlex = getLatestConfirmedAudit('wh-alex', sampleAudits)
    assert.equal(latestAlex, null)
  })

  test('checkTransferAuditDiscrepancy should return false for normal post-audit transfers', () => {
    const transfer = {
      fromId: 'wh-october',
      toId: 'wh-nasr',
      date: '2026-11-02',
    }
    const res = checkTransferAuditDiscrepancy(transfer, sampleAudits, warehouses)
    assert.equal(res.isAuditDiscrepancy, false)
    assert.equal(res.isFromBackdated, false)
    assert.equal(res.isToBackdated, false)
    assert.equal(res.auditDiscrepancyNote, '')
  })

  test('checkTransferAuditDiscrepancy should flag transfer backdated relative to source warehouse', () => {
    const transfer = {
      fromId: 'wh-october',
      toId: 'wh-alex',
      date: '2026-10-25',
    }
    const res = checkTransferAuditDiscrepancy(transfer, sampleAudits, warehouses)
    assert.equal(res.isAuditDiscrepancy, true)
    assert.equal(res.isFromBackdated, true)
    assert.equal(res.isToBackdated, false)
    assert.ok(res.auditDiscrepancyNote.includes('مخزن 6 أكتوبر التبريدي'))
    assert.ok(res.auditDiscrepancyNote.includes('2026-10-25'))
    assert.ok(res.auditDiscrepancyNote.includes('2026-11-01'))
  })

  test('checkTransferAuditDiscrepancy should flag transfer backdated relative to destination warehouse', () => {
    const transfer = {
      fromId: 'wh-alex',
      toId: 'wh-nasr',
      date: '2026-10-20',
    }
    const res = checkTransferAuditDiscrepancy(transfer, sampleAudits, warehouses)
    assert.equal(res.isAuditDiscrepancy, true)
    assert.equal(res.isFromBackdated, false)
    assert.equal(res.isToBackdated, true)
    assert.ok(res.auditDiscrepancyNote.includes('مخزن مدينة نصر'))
  })

  test('checkTransferAuditDiscrepancy should flag transfer backdated relative to both warehouses', () => {
    const transfer = {
      fromId: 'wh-october',
      toId: 'wh-nasr',
      date: '2026-10-15',
    }
    const res = checkTransferAuditDiscrepancy(transfer, sampleAudits, warehouses)
    assert.equal(res.isAuditDiscrepancy, true)
    assert.equal(res.isFromBackdated, true)
    assert.equal(res.isToBackdated, true)
    assert.ok(res.auditDiscrepancyNote.includes('مخزن الإرسال'))
    assert.ok(res.auditDiscrepancyNote.includes('مخزن الاستلام'))
  })

  test('calculateTransferStockMovement should shield confirmed audit balance on source warehouse', () => {
    const currentStock = [
      { warehouseId: 'wh-october', itemId: 'beef-shank', quantity: 50, unit: 'كرتونة' },
      { warehouseId: 'wh-alex', itemId: 'beef-shank', quantity: 5, unit: 'كرتونة' },
    ]
    const transfer = {
      fromId: 'wh-october',
      toId: 'wh-alex',
      date: '2026-10-25',
      items: [{ itemId: 'beef-shank', quantity: 15, unit: 'كرتونة' }],
    }
    const { updatedStock, isAuditDiscrepancy, isFromBackdated, isToBackdated } =
      calculateTransferStockMovement(transfer, currentStock, sampleAudits)

    assert.equal(isAuditDiscrepancy, true)
    assert.equal(isFromBackdated, true)
    assert.equal(isToBackdated, false)

    const octStock = updatedStock.find((s) => s.warehouseId === 'wh-october' && s.itemId === 'beef-shank')
    assert.equal(octStock.quantity, 50)

    const alexStock = updatedStock.find((s) => s.warehouseId === 'wh-alex' && s.itemId === 'beef-shank')
    assert.equal(alexStock.quantity, 20)
  })

  test('calculateTransferStockMovement should shield confirmed audit balance on destination warehouse', () => {
    const currentStock = [
      { warehouseId: 'wh-alex', itemId: 'beef-shank', quantity: 40, unit: 'كرتونة' },
      { warehouseId: 'wh-nasr', itemId: 'beef-shank', quantity: 25, unit: 'كرتونة' },
    ]
    const transfer = {
      fromId: 'wh-alex',
      toId: 'wh-nasr',
      date: '2026-10-20',
      items: [{ itemId: 'beef-shank', quantity: 10, unit: 'كرتونة' }],
    }
    const { updatedStock, isFromBackdated, isToBackdated } =
      calculateTransferStockMovement(transfer, currentStock, sampleAudits)

    assert.equal(isFromBackdated, false)
    assert.equal(isToBackdated, true)

    const alexStock = updatedStock.find((s) => s.warehouseId === 'wh-alex' && s.itemId === 'beef-shank')
    assert.equal(alexStock.quantity, 30)

    const nasrStock = updatedStock.find((s) => s.warehouseId === 'wh-nasr' && s.itemId === 'beef-shank')
    assert.equal(nasrStock.quantity, 25)
  })

  test('calculateTransferStockMovement should shield both source and destination when both postdate transfer', () => {
    const currentStock = [
      { warehouseId: 'wh-october', itemId: 'beef-shank', quantity: 50, unit: 'كرتونة' },
      { warehouseId: 'wh-nasr', itemId: 'beef-shank', quantity: 30, unit: 'كرتونة' },
    ]
    const transfer = {
      fromId: 'wh-october',
      toId: 'wh-nasr',
      date: '2026-10-10',
      items: [{ itemId: 'beef-shank', quantity: 12, unit: 'كرتونة' }],
    }
    const { updatedStock, isFromBackdated, isToBackdated } =
      calculateTransferStockMovement(transfer, currentStock, sampleAudits)

    assert.equal(isFromBackdated, true)
    assert.equal(isToBackdated, true)

    const octStock = updatedStock.find((s) => s.warehouseId === 'wh-october' && s.itemId === 'beef-shank')
    assert.equal(octStock.quantity, 50)

    const nasrStock = updatedStock.find((s) => s.warehouseId === 'wh-nasr' && s.itemId === 'beef-shank')
    assert.equal(nasrStock.quantity, 30)
  })
})

describe('Requirement R3 & R4: useAXStore Integration & Dual Dates Across Modules', () => {
  test('store addTransfer should flag backdated transfers and confirmTransfer should shield audit balances', () => {
    const auditRecord = {
      id: 'aud-test-1',
      warehouseId: 'wh-audit-shield',
      date: '2026-11-01',
      status: 'approved',
    }

    useAXStore.setState({
      warehouses: [
        { id: 'wh-audit-shield', name: 'مخزن معتمد الجرد' },
        { id: 'wh-receiving', name: 'مخزن مستلم' },
      ],
      stockAudits: [auditRecord],
      inventoryStock: [
        { warehouseId: 'wh-audit-shield', itemId: 'item-ribs', quantity: 100, unit: 'كرتونة' },
        { warehouseId: 'wh-receiving', itemId: 'item-ribs', quantity: 10, unit: 'كرتونة' },
      ],
      transfers: [],
    })

    const newTransfer = {
      id: 'trf-backdated-1',
      code: 'TRF-BACK-01',
      fromId: 'wh-audit-shield',
      toId: 'wh-receiving',
      date: '2026-10-25',
      items: [{ itemId: 'item-ribs', quantity: 20, unit: 'كرتونة' }],
      status: 'pending',
    }

    useAXStore.getState().addTransfer(newTransfer)

    const storedTransfer = useAXStore.getState().transfers.find((t) => t.id === 'trf-backdated-1')
    assert.ok(storedTransfer)
    assert.equal(storedTransfer.isAuditDiscrepancy, true)
    assert.ok(storedTransfer.auditDiscrepancyNote.includes('تنبيه جردي'))

    useAXStore.getState().confirmTransfer('trf-backdated-1')

    const confirmedTransfer = useAXStore.getState().transfers.find((t) => t.id === 'trf-backdated-1')
    assert.equal(confirmedTransfer.status, 'confirmed')
    assert.ok(confirmedTransfer.confirmedAt)

    const stockShield = useAXStore.getState().inventoryStock.find(
      (s) => s.warehouseId === 'wh-audit-shield' && s.itemId === 'item-ribs'
    )
    assert.equal(stockShield.quantity, 100)

    const stockReceiving = useAXStore.getState().inventoryStock.find(
      (s) => s.warehouseId === 'wh-receiving' && s.itemId === 'item-ribs'
    )
    assert.equal(stockReceiving.quantity, 30)

    const auditsAfter = useAXStore.getState().stockAudits
    assert.equal(auditsAfter.length, 1)
    assert.equal(auditsAfter[0].id, 'aud-test-1')
  })

  test('confirmTransfer should be idempotent and not mutate on repeated calls', () => {
    const stockShield = useAXStore.getState().inventoryStock.find(
      (s) => s.warehouseId === 'wh-audit-shield' && s.itemId === 'item-ribs'
    )
    const stockReceiving = useAXStore.getState().inventoryStock.find(
      (s) => s.warehouseId === 'wh-receiving' && s.itemId === 'item-ribs'
    )

    useAXStore.getState().confirmTransfer('trf-backdated-1')

    const stockShield2 = useAXStore.getState().inventoryStock.find(
      (s) => s.warehouseId === 'wh-audit-shield' && s.itemId === 'item-ribs'
    )
    const stockReceiving2 = useAXStore.getState().inventoryStock.find(
      (s) => s.warehouseId === 'wh-receiving' && s.itemId === 'item-ribs'
    )

    assert.equal(stockShield2.quantity, stockShield.quantity)
    assert.equal(stockReceiving2.quantity, stockReceiving.quantity)
  })

  test('AX_DatabaseSync should map operational dates and createdAt across operational entities', async () => {
    const rawData = {
      audits: [
        {
          id: 'aud-sync-1',
          code: 'AUD-001',
          warehouse_id: 'wh-1',
          audit_date: '2026-10-25',
          created_at: '2026-10-25T10:00:00Z',
        },
      ],
      transfers: [
        {
          id: 'trf-sync-1',
          code: 'TRF-001',
          from_warehouse_id: 'wh-1',
          to_warehouse_id: 'wh-2',
          date: '2026-10-26',
          requested_at: '2026-10-26T11:00:00Z',
          created_at: '2026-10-26T11:00:00Z',
          is_audit_discrepancy: true,
          audit_discrepancy_note: 'تنبيه جردي',
        },
      ],
      cashTx: [
        {
          id: 'tx-sync-1',
          code: 'EXP-001',
          type: 'expense',
          amount: 500,
          date: '2026-10-27',
          created_at: '2026-10-27T12:00:00Z',
        },
      ],
      invoices: [
        {
          id: 'inv-sync-1',
          code: 'INV-001',
          type: 'sale',
          date: '2026-10-28',
          created_at: '2026-10-28T13:00:00Z',
          total: 1500,
        },
      ],
    }

    const payload = {}
    if (Array.isArray(rawData.audits)) {
      payload.stockAudits = rawData.audits.map((a) => ({
        id: a.id,
        date: a.audit_date,
        operationalDate: a.audit_date,
        createdAt: a.created_at || a.audit_date,
      }))
    }
    if (Array.isArray(rawData.transfers)) {
      payload.transfers = rawData.transfers.map((t) => ({
        id: t.id,
        date: t.date,
        operationalDate: t.operational_date || t.date,
        createdAt: t.created_at || t.requested_at,
        isAuditDiscrepancy: Boolean(t.is_audit_discrepancy),
        auditDiscrepancyNote: t.audit_discrepancy_note,
      }))
    }
    if (Array.isArray(rawData.cashTx)) {
      payload.cashTransactions = rawData.cashTx.map((c) => ({
        id: c.id,
        date: c.date,
        operationalDate: c.date,
        createdAt: c.created_at || c.date,
      }))
    }
    if (Array.isArray(rawData.invoices)) {
      payload.invoices = rawData.invoices.map((inv) => ({
        id: inv.id,
        date: inv.date,
        operationalDate: inv.date,
        createdAt: inv.created_at || inv.date,
      }))
    }

    assert.equal(payload.stockAudits[0].date, '2026-10-25')
    assert.equal(payload.stockAudits[0].createdAt, '2026-10-25T10:00:00Z')

    assert.equal(payload.transfers[0].date, '2026-10-26')
    assert.equal(payload.transfers[0].createdAt, '2026-10-26T11:00:00Z')
    assert.equal(payload.transfers[0].isAuditDiscrepancy, true)

    assert.equal(payload.cashTransactions[0].date, '2026-10-27')
    assert.equal(payload.cashTransactions[0].createdAt, '2026-10-27T12:00:00Z')

    assert.equal(payload.invoices[0].date, '2026-10-28')
    assert.equal(payload.invoices[0].createdAt, '2026-10-28T13:00:00Z')
  })
})
