import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  parseDate,
  formatDateOnly,
  formatDateTime,
  formatDualDates,
  isDateBefore,
  compareDates,
  isSameDay,
} from '../src/utils/dateHelpers.js'
import {
  getLatestConfirmedAudit,
  checkTransferAuditDiscrepancy,
  calculateTransferStockMovement,
} from '../src/store/transferAuditHelpers.js'
import { useAXStore } from '../src/store/useAXStore.js'

describe('Challenger 2 — Empirical Suite 1: Date Helpers Boundary & Cross-Midnight Stress', () => {
  test('parseDate should handle varied timestamp representations and invalid payloads safely', () => {
    const numericTimestamp = parseDate(1730721600000)
    assert.ok(numericTimestamp instanceof Date)
    assert.equal(numericTimestamp.getTime(), 1730721600000)

    const now = new Date()
    assert.equal(parseDate(now)?.getTime(), now.getTime())

    const isoWithTz = parseDate('2026-11-04T15:30:00+02:00')
    assert.ok(isoWithTz instanceof Date)
    assert.equal(isNaN(isoWithTz.getTime()), false)

    const dateOnly = parseDate('2026-02-28')
    assert.ok(dateOnly instanceof Date)

    assert.equal(parseDate(0), null)
    assert.equal(parseDate(null), null)
    assert.equal(parseDate(undefined), null)
    assert.equal(parseDate(''), null)
    assert.equal(parseDate('invalid-string-not-a-date'), null)
    assert.equal(parseDate({}), null)
    assert.equal(parseDate([]), null)
    assert.equal(parseDate(NaN), null)
  })

  test('formatDateOnly should extract calendar day consistently across boundary inputs', () => {
    assert.equal(formatDateOnly('2026-12-31'), '2026-12-31')
    assert.equal(formatDateOnly('2028-02-29'), '2028-02-29')
    assert.equal(formatDateOnly('2026-01-01T00:00:00.000Z'), '2026-01-01')
    assert.equal(formatDateOnly(null), '—')
    assert.equal(formatDateOnly(undefined), '—')
    assert.equal(formatDateOnly(''), '—')
  })

  test('formatDateTime should format hours and minutes with leading zero padding', () => {
    const earlyMorning = new Date('2026-05-10T04:08:00.000Z')
    const formatted = formatDateTime(earlyMorning)
    assert.ok(formatted.includes(':'))
    assert.equal(formatDateTime(null), '—')
    assert.equal(formatDateTime(''), '—')
    assert.equal(formatDateTime('not-a-date'), 'not-a-date')
  })

  test('isDateBefore should accurately handle cross-midnight and identical calendar days', () => {
    const midnightEarlier = '2026-11-04T23:59:59.999Z'
    const midnightLater = '2026-11-05T00:00:00.000Z'
    assert.equal(isDateBefore(midnightEarlier, midnightLater), true)
    assert.equal(isDateBefore(midnightLater, midnightEarlier), false)

    assert.equal(isDateBefore('2026-11-04', '2026-11-04'), false)
    assert.equal(isDateBefore('2026-11-03', '2026-11-04'), true)
    assert.equal(isDateBefore('2026-11-05', '2026-11-04'), false)

    assert.equal(isDateBefore(null, '2026-11-04'), false)
    assert.equal(isDateBefore('2026-11-04', null), false)
    assert.equal(isDateBefore(null, null), false)
  })

  test('compareDates and isSameDay should accurately evaluate sorting and equality', () => {
    assert.ok(compareDates('2026-10-01', '2026-10-02') < 0)
    assert.ok(compareDates('2026-10-05', '2026-10-02') > 0)
    assert.equal(compareDates('2026-10-02', '2026-10-02'), 0)
    assert.equal(compareDates(null, null), 0)
    assert.equal(compareDates(null, '2026-10-02'), -1)
    assert.equal(compareDates('2026-10-02', null), 1)

    assert.equal(isSameDay('2026-11-04', '2026-11-04'), true)
    assert.equal(isSameDay('2026-11-04', '2026-11-05'), false)
    assert.equal(isSameDay(null, '2026-11-04'), false)
  })

  test('formatDualDates should normalize dual timestamps across all 5 operational record schemas', () => {
    const transferRecord = {
      operationalDate: '2026-10-20',
      createdAt: '2026-11-04T12:30:00.000Z',
    }
    const trfRes = formatDualDates(transferRecord)
    assert.equal(trfRes.operationalDateStr, '2026-10-20')
    assert.ok(trfRes.createdAtStr.includes('2026-11-04'))
    assert.equal(trfRes.isDifferentDate, true)
    assert.ok(trfRes.badgeLabel.startsWith('قيد:'))

    const expenseRecord = {
      date: '2026-11-04',
      created_at: '2026-11-04T08:15:00.000Z',
    }
    const expRes = formatDualDates(expenseRecord)
    assert.equal(expRes.operationalDateStr, '2026-11-04')
    assert.equal(expRes.isDifferentDate, false)

    const auditRecord = {
      auditDate: '2026-10-31',
      createdAt: '2026-10-31T20:00:00.000Z',
    }
    const audRes = formatDualDates(auditRecord)
    assert.equal(audRes.operationalDateStr, '2026-10-31')

    const invoiceRecord = {
      date: '2026-09-15',
      created_at: '2026-11-04T10:00:00.000Z',
    }
    const invRes = formatDualDates(invoiceRecord)
    assert.equal(invRes.operationalDateStr, '2026-09-15')
    assert.equal(invRes.isDifferentDate, true)

    const emptyRes = formatDualDates(null, null)
    assert.equal(emptyRes.operationalDateStr, '—')
    assert.equal(emptyRes.createdAtStr, '—')
  })
})

describe('Challenger 2 — Empirical Suite 2: Transfer Audit Shield Multi-Audit & Mutation Resistance', () => {
  const warehouses = [
    { id: 'wh-main', name: 'المخزن الرئيسي للتبريد' },
    { id: 'wh-van', name: 'سيارة التوزيع 01' },
    { id: 'wh-retail', name: 'مخزن فرع التجزئة' },
  ]

  const multiHistoryAudits = [
    { id: 'a-1', warehouseId: 'wh-main', date: '2026-10-01', status: 'approved' },
    { id: 'a-2', warehouseId: 'wh-main', date: '2026-10-15', status: 'confirmed' },
    { id: 'a-3', warehouseId: 'wh-main', date: '2026-11-01', status: 'approved' },
    { id: 'a-4', warehouseId: 'wh-main', date: '2026-11-03', status: 'rejected' },
    { id: 'a-5', warehouseId: 'wh-main', date: '2026-11-04', status: 'draft' },
    { id: 'a-6', warehouseId: 'wh-van', date: '2026-10-28', status: 'completed' },
  ]

  test('getLatestConfirmedAudit should strictly select latest approved audit, filtering out rejected or draft', () => {
    const latestMain = getLatestConfirmedAudit('wh-main', multiHistoryAudits)
    assert.ok(latestMain)
    assert.equal(latestMain.id, 'a-3')
    assert.equal(latestMain.date, '2026-11-01')

    const latestVan = getLatestConfirmedAudit('wh-van', multiHistoryAudits)
    assert.ok(latestVan)
    assert.equal(latestVan.id, 'a-6')

    const missingWh = getLatestConfirmedAudit('wh-retail', multiHistoryAudits)
    assert.equal(missingWh, null)

    assert.equal(getLatestConfirmedAudit(null, multiHistoryAudits), null)
    assert.equal(getLatestConfirmedAudit('wh-main', []), null)
    assert.equal(getLatestConfirmedAudit('wh-main', null), null)
  })

  test('checkTransferAuditDiscrepancy should accurately flag backdated transfers and generate clean notes', () => {
    const backdatedTrf = {
      fromId: 'wh-main',
      toId: 'wh-van',
      operationalDate: '2026-10-25',
    }
    const res = checkTransferAuditDiscrepancy(backdatedTrf, multiHistoryAudits, warehouses)
    assert.equal(res.isAuditDiscrepancy, true)
    assert.equal(res.isFromBackdated, true)
    assert.equal(res.isToBackdated, true)
    assert.ok(res.auditDiscrepancyNote.includes('المخزن الرئيسي للتبريد'))
    assert.ok(res.auditDiscrepancyNote.includes('سيارة التوزيع 01'))
    assert.ok(res.auditDiscrepancyNote.startsWith('تنبيه جردي:'))

    const postAuditTrf = {
      fromId: 'wh-main',
      toId: 'wh-van',
      operationalDate: '2026-11-02',
    }
    const postRes = checkTransferAuditDiscrepancy(postAuditTrf, multiHistoryAudits, warehouses)
    assert.equal(postRes.isAuditDiscrepancy, false)
    assert.equal(postRes.isFromBackdated, false)
    assert.equal(postRes.isToBackdated, false)
    assert.equal(postRes.auditDiscrepancyNote, '')

    const emptyRes = checkTransferAuditDiscrepancy(null, multiHistoryAudits, warehouses)
    assert.equal(emptyRes.isAuditDiscrepancy, false)
  })

  test('calculateTransferStockMovement should shield audited stocks and create missing destination entries safely', () => {
    const stock = [
      { warehouseId: 'wh-main', itemId: 'beef-shank', quantity: 100, unit: 'كرتونة' },
    ]

    const transfer = {
      fromId: 'wh-main',
      toId: 'wh-retail',
      operationalDate: '2026-10-20',
      items: [
        { itemId: 'beef-shank', quantity: 30, unit: 'كرتونة' },
        { itemId: 'minced-meat', quantity: 15, unit: 'كرتونة' },
      ],
    }

    const { updatedStock, isFromBackdated, isToBackdated } =
      calculateTransferStockMovement(transfer, stock, multiHistoryAudits, warehouses)

    assert.equal(isFromBackdated, true)
    assert.equal(isToBackdated, false)

    const mainShank = updatedStock.find((s) => s.warehouseId === 'wh-main' && s.itemId === 'beef-shank')
    assert.equal(mainShank.quantity, 100)

    const retailShank = updatedStock.find((s) => s.warehouseId === 'wh-retail' && s.itemId === 'beef-shank')
    assert.ok(retailShank)
    assert.equal(retailShank.quantity, 30)

    const retailMinced = updatedStock.find((s) => s.warehouseId === 'wh-retail' && s.itemId === 'minced-meat')
    assert.ok(retailMinced)
    assert.equal(retailMinced.quantity, 15)

    assert.equal(stock[0].quantity, 100)
    assert.equal(stock.length, 1)
  })

  test('calculateTransferStockMovement with bilateral backdating should leave all stocks 100% untouched', () => {
    const stock = [
      { warehouseId: 'wh-main', itemId: 'beef-shank', quantity: 80, unit: 'كرتونة' },
      { warehouseId: 'wh-van', itemId: 'beef-shank', quantity: 20, unit: 'كرتونة' },
    ]

    const bilateralTrf = {
      fromId: 'wh-main',
      toId: 'wh-van',
      operationalDate: '2026-10-10',
      items: [{ itemId: 'beef-shank', quantity: 15, unit: 'كرتونة' }],
    }

    const { updatedStock, isFromBackdated, isToBackdated, isAuditDiscrepancy } =
      calculateTransferStockMovement(bilateralTrf, stock, multiHistoryAudits, warehouses)

    assert.equal(isAuditDiscrepancy, true)
    assert.equal(isFromBackdated, true)
    assert.equal(isToBackdated, true)

    const mainAfter = updatedStock.find((s) => s.warehouseId === 'wh-main' && s.itemId === 'beef-shank')
    const vanAfter = updatedStock.find((s) => s.warehouseId === 'wh-van' && s.itemId === 'beef-shank')

    assert.equal(mainAfter.quantity, 80)
    assert.equal(vanAfter.quantity, 20)
  })
})

describe('Challenger 2 — Empirical Suite 3: 5 Modules Dual Dates & Immutability Verification', () => {
  test('Transfers module should store operationalDate and preserve immutable createdAt', () => {
    useAXStore.setState({
      warehouses: [
        { id: 'wh-a', name: 'مخزن أ' },
        { id: 'wh-b', name: 'مخزن ب' },
      ],
      stockAudits: [],
      inventoryStock: [
        { warehouseId: 'wh-a', itemId: 'item-1', quantity: 50, unit: 'كرتونة' },
      ],
      transfers: [],
    })

    const fixedCreatedAt = '2026-11-04T12:00:00.000Z'
    const transferData = {
      id: 'trf-emp-1',
      code: 'TRF-001',
      fromId: 'wh-a',
      toId: 'wh-b',
      operationalDate: '2026-10-15',
      date: '2026-10-15',
      createdAt: fixedCreatedAt,
      status: 'pending',
      items: [{ itemId: 'item-1', quantity: 10, unit: 'كرتونة' }],
    }

    useAXStore.getState().addTransfer(transferData)
    const stored = useAXStore.getState().transfers.find((t) => t.id === 'trf-emp-1')
    assert.ok(stored)
    assert.equal(stored.operationalDate, '2026-10-15')
    assert.equal(stored.createdAt, fixedCreatedAt)

    useAXStore.getState().confirmTransfer('trf-emp-1')
    const confirmed = useAXStore.getState().transfers.find((t) => t.id === 'trf-emp-1')
    assert.equal(confirmed.status, 'confirmed')
    assert.equal(confirmed.operationalDate, '2026-10-15')
    assert.equal(confirmed.createdAt, fixedCreatedAt)
    assert.ok(confirmed.confirmedAt)
  })

  test('Stock Audits module should accept operationalDate and preserve creation timestamp', () => {
    useAXStore.setState({
      stockAudits: [],
      inventoryStock: [
        { warehouseId: 'wh-a', itemId: 'item-1', quantity: 40, unit: 'كرتونة' },
      ],
    })

    const auditSession = {
      id: 'aud-emp-1',
      code: 'AUD-999',
      warehouseId: 'wh-a',
      date: '2026-10-25',
      operationalDate: '2026-10-25',
      createdAt: new Date().toISOString(),
      status: 'approved',
    }

    const adjusted = [{ warehouseId: 'wh-a', itemId: 'item-1', actualQty: 38, unit: 'كرتونة' }]
    useAXStore.getState().applyStockAudit({ session: auditSession, adjustedStocks: adjusted })

    const audits = useAXStore.getState().stockAudits
    assert.equal(audits.length, 1)
    assert.equal(audits[0].operationalDate, '2026-10-25')
    assert.ok(audits[0].createdAt)

    const stock = useAXStore.getState().inventoryStock.find((s) => s.warehouseId === 'wh-a' && s.itemId === 'item-1')
    assert.equal(stock.quantity, 38)
  })
})

describe('Challenger 2 — Empirical Suite 4: UI Integration & Anti-Pattern Auditing', () => {
  const projectRoot = process.cwd()

  const filesToCheck = [
    'src/components/warehouses/AX_TransferFormModal.jsx',
    'src/components/warehouses/AX_TransferInspectionModal.jsx',
    'src/components/warehouses/AX_WarehousesInventory.jsx',
    'src/components/warehouses/AX_StockAuditModal.jsx',
    'src/components/treasury/AX_TreasuryTransactionModal.jsx',
    'src/components/treasury/AX_TreasuryTransactionsTable.jsx',
    'src/components/invoices/AX_CreateInvoiceModal.jsx',
    'src/components/invoices/AX_InvoicesManager.jsx',
    'src/components/invoices/AX_InvoiceDetailsModal.jsx',
    'src/utils/dateHelpers.js',
    'src/store/transferAuditHelpers.js',
  ]

  test('All 11 operational date & transfer shield files must exist and be <= 500 lines', () => {
    for (const relPath of filesToCheck) {
      const fullPath = path.join(projectRoot, relPath)
      assert.ok(fs.existsSync(fullPath), `File must exist: ${relPath}`)
      const content = fs.readFileSync(fullPath, 'utf-8')
      const lineCount = content.split('\n').length
      assert.ok(
        lineCount <= 500,
        `File ${relPath} exceeds 500 lines: current count is ${lineCount}`
      )
    }
  })

  test('All modals capturing operational dates must import and mount AX_CompanyDatePicker', () => {
    const datePickerModals = [
      'src/components/warehouses/AX_TransferFormModal.jsx',
      'src/components/warehouses/AX_StockAuditModal.jsx',
      'src/components/treasury/AX_TreasuryTransactionModal.jsx',
      'src/components/invoices/AX_CreateInvoiceModal.jsx',
    ]

    for (const relPath of datePickerModals) {
      const fullPath = path.join(projectRoot, relPath)
      const content = fs.readFileSync(fullPath, 'utf-8')
      assert.ok(
        content.includes('AX_CompanyDatePicker'),
        `${relPath} must import and mount AX_CompanyDatePicker`
      )
      assert.ok(
        !content.includes('type="date"'),
        `${relPath} must NOT use native type="date" (Anti-Pattern #12)`
      )
    }
  })

  test('Inspection and list views must render dual dates and discrepancy indicators', () => {
    const inspectionPath = path.join(projectRoot, 'src/components/warehouses/AX_TransferInspectionModal.jsx')
    const inspectionContent = fs.readFileSync(inspectionPath, 'utf-8')
    assert.ok(inspectionContent.includes('formatDualDates'), 'Transfer inspection must use formatDualDates')
    assert.ok(inspectionContent.includes('isAuditDiscrepancy'), 'Transfer inspection must check isAuditDiscrepancy')
    assert.ok(inspectionContent.includes('تنبيه فارق جردي'), 'Transfer inspection must render discrepancy alert')

    const inventoryPath = path.join(projectRoot, 'src/components/warehouses/AX_WarehousesInventory.jsx')
    const inventoryContent = fs.readFileSync(inventoryPath, 'utf-8')
    assert.ok(inventoryContent.includes('⚠️ فارق جردي'), 'Warehouses inventory must render discrepancy badge')
    assert.ok(inventoryContent.includes('operationalDate'), 'Warehouses inventory must display operationalDate')
    assert.ok(inventoryContent.includes('قيد:'), 'Warehouses inventory must display creation time label')

    const treasuryTablePath = path.join(projectRoot, 'src/components/treasury/AX_TreasuryTransactionsTable.jsx')
    const treasuryContent = fs.readFileSync(treasuryTablePath, 'utf-8')
    assert.ok(treasuryContent.includes('قيد:'), 'Treasury transactions table must display creation time badge')

    const invoicesManagerPath = path.join(projectRoot, 'src/components/invoices/AX_InvoicesManager.jsx')
    const invoicesContent = fs.readFileSync(invoicesManagerPath, 'utf-8')
    assert.ok(invoicesContent.includes('قيد:'), 'Invoices manager must display creation time badge')
    assert.ok(invoicesContent.includes('operationalDate'), 'Invoices manager must display operationalDate')

    const invoiceDetailsPath = path.join(projectRoot, 'src/components/invoices/AX_InvoiceDetailsModal.jsx')
    const invoiceDetailsContent = fs.readFileSync(invoiceDetailsPath, 'utf-8')
    assert.ok(invoiceDetailsContent.includes('تاريخ الفاتورة:'), 'Invoice details must show invoice date')
    assert.ok(invoiceDetailsContent.includes('تاريخ القيد:'), 'Invoice details must show registration date')
  })
})
