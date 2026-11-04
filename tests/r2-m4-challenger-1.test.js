import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  getInitialExpenseCategories,
  expenseCategoryHelpers,
} from '../src/store/expenseCategoryHelpers.js'
import {
  calculateSuggestedUnitPrices,
  calculateSuggestedPrices,
  isPriceOverridden,
  resolveInvoiceUnitPrice,
  resolveItemUnitPrice,
  getCartonEquivalent,
} from '../src/utils/pricingCalculations.js'
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

describe('Challenger 1 Stress 1: Deep & Adversarial Expense Category Hierarchies', () => {
  test('handles extreme unicode, arabic diacritics, and symbols without corruption', () => {
    let categories = getInitialExpenseCategories()
    const weirdName = 'مصاريف تجميد فائقة #123 — @قسم (أ) & [ب] / "خاص" & 100%!'

    categories = expenseCategoryHelpers.addExpenseCategory(categories, {
      name: weirdName,
      level: 'main',
    })
    const addedMain = categories.find((c) => c.name === weirdName)
    assert.ok(addedMain)
    assert.equal(addedMain.level, 'main')
    assert.equal(addedMain.parentId, null)

    const subName = 'تفريغ وتعبئة كبدة مُجَمَّدَة — طن/يوم'
    categories = expenseCategoryHelpers.addExpenseCategory(categories, {
      name: subName,
      level: 'sub',
      parentId: addedMain.id,
    })
    const addedSub = categories.find((c) => c.name === subName)
    assert.ok(addedSub)

    const secName = 'رسوم فحص بيطري مستعجل ⚡ 2026'
    categories = expenseCategoryHelpers.addExpenseCategory(categories, {
      name: secName,
      level: 'secondary',
      parentId: addedSub.id,
    })
    const addedSec = categories.find((c) => c.name === secName)
    assert.ok(addedSec)

    const pathRes = expenseCategoryHelpers.getHierarchyPath(categories, addedSec.id)
    assert.equal(pathRes.main?.id, addedMain.id)
    assert.equal(pathRes.sub?.id, addedSub.id)
    assert.equal(pathRes.secondary?.id, addedSec.id)
    assert.ok(pathRes.label.includes(weirdName))
    assert.ok(pathRes.label.includes(subName))
    assert.ok(pathRes.label.includes(secName))
  })

  test('bounded resolution prevents infinite loops in self-referencing and cyclic categories', () => {
    const cyclicCategories = [
      { id: 'cat-loop-1', name: 'حلقة رئيسية', level: 'secondary', parentId: 'cat-loop-1' },
      { id: 'cat-a', name: 'أ', level: 'secondary', parentId: 'cat-b' },
      { id: 'cat-b', name: 'ب', level: 'sub', parentId: 'cat-a' },
    ]

    const pathLoop = expenseCategoryHelpers.getHierarchyPath(cyclicCategories, 'cat-loop-1')
    assert.ok(pathLoop.secondary)
    assert.ok(typeof pathLoop.label === 'string')

    const pathCycle = expenseCategoryHelpers.getHierarchyPath(cyclicCategories, 'cat-a')
    assert.ok(pathCycle.secondary)
    assert.ok(typeof pathCycle.label === 'string')
  })

  test('handles orphaned categories and malformed array structures gracefully', () => {
    const brokenList = [
      null,
      undefined,
      { id: 'orphan-sec', name: 'فرع بلا أب', level: 'secondary', parentId: 'non-existent-sub' },
      { id: 'orphan-sub', name: 'فرعي بلا رئيسي', level: 'sub', parentId: 'non-existent-main' },
    ]

    const orphanPath = expenseCategoryHelpers.getHierarchyPath(brokenList, 'orphan-sec')
    assert.equal(orphanPath.secondary?.id, 'orphan-sec')
    assert.equal(orphanPath.sub, null)
    assert.equal(orphanPath.main, null)
    assert.equal(orphanPath.label, 'فرع بلا أب')

    const subPath = expenseCategoryHelpers.getHierarchyPath(brokenList, 'orphan-sub')
    assert.equal(subPath.secondary?.id, 'orphan-sub')
    assert.equal(subPath.sub, null)
    assert.equal(subPath.main, null)
    assert.equal(subPath.label, 'فرعي بلا رئيسي')

    const missingPath = expenseCategoryHelpers.getHierarchyPath(brokenList, 'missing-id')
    assert.equal(missingPath.secondary, null)
    assert.equal(missingPath.sub, null)
    assert.equal(missingPath.main, null)
    assert.equal(missingPath.label, '')

    assert.equal(expenseCategoryHelpers.hasChildren(brokenList, 'orphan-sec'), false)
    assert.equal(expenseCategoryHelpers.getChildren(brokenList, null).length, 0)
    assert.equal(expenseCategoryHelpers.countExpensesForCategory(null, 'orphan-sec'), 0)
  })

  test('validates payload gating on category creation and updates', () => {
    const list = getInitialExpenseCategories()
    const beforeLen = list.length

    assert.equal(expenseCategoryHelpers.addExpenseCategory(list, { name: '   ', level: 'main' }).length, beforeLen)
    assert.equal(expenseCategoryHelpers.addExpenseCategory(list, { name: 'بدون مستوى وأب', level: 'sub' }).length, beforeLen)
    assert.equal(expenseCategoryHelpers.addExpenseCategory(list, { name: 'ثانوي بلا أب', level: 'secondary' }).length, beforeLen)

    const updated = expenseCategoryHelpers.editExpenseCategory(list, 'non-existent-id', { name: 'جديد' })
    assert.equal(updated.length, beforeLen)

    const unchanged = expenseCategoryHelpers.deleteExpenseCategory(list, 'non-existent-id')
    assert.equal(unchanged.length, beforeLen)
  })
})

describe('Challenger 1 Stress 2: Extreme Pricing Overrides & Precision Edge Cases', () => {
  test('handles massive price overrides exceeding carton rate by multiple orders of magnitude', () => {
    const item = {
      id: 'item-premium-wagyu',
      name: 'واغيو ياباني معتق A5',
      unitType: 'كرتونة',
      sellPrice: 500,
      buyPrice: 400,
      weightPerCarton: 10,
      piecesPerCarton: 5,
      pieceSellPrice: 25000,
      kgSellPrice: 15000,
    }

    const suggested = calculateSuggestedUnitPrices(item)
    assert.equal(suggested.suggestedPieceSell, 100)
    assert.equal(suggested.suggestedKgSell, 50)

    assert.equal(isPriceOverridden(item.pieceSellPrice, suggested.suggestedPieceSell), true)
    assert.equal(isPriceOverridden(item.kgSellPrice, suggested.suggestedKgSell), true)

    assert.equal(resolveInvoiceUnitPrice(item, 'قطعة', true), 25000)
    assert.equal(resolveInvoiceUnitPrice(item, 'كيلو', true), 15000)
    assert.equal(resolveInvoiceUnitPrice(item, 'كرتونة', true), 500)
  })

  test('handles fractional carton weights and micro-rates with precision rounding', () => {
    const fractionalItem = {
      sellPrice: 145.75,
      buyPrice: 112.33,
      weightPerCarton: 2.35,
      piecesPerCarton: 7,
      unitType: 'كرتونة',
    }

    const res = calculateSuggestedPrices(fractionalItem)
    assert.equal(res.suggestedKgSell, 62.02)
    assert.equal(res.suggestedPieceSell, 20.82)
    assert.equal(res.suggestedKgBuy, 47.8)
    assert.equal(res.suggestedPieceBuy, 16.05)

    assert.equal(isPriceOverridden(20.82, res.suggestedPieceSell), false)
    assert.equal(isPriceOverridden(20.825, res.suggestedPieceSell), false)
    assert.equal(isPriceOverridden(20.9, res.suggestedPieceSell), true)
  })

  test('handles zero carton contents, negative rates, and division-by-zero protection', () => {
    const zeroItem = {
      sellPrice: 300,
      buyPrice: 200,
      piecesPerCarton: 0,
      weightPerCarton: 0,
      unitType: 'قطعة',
    }

    const suggestions = calculateSuggestedUnitPrices(zeroItem)
    assert.equal(suggestions.suggestedPieceSell, null)
    assert.equal(suggestions.suggestedPieceBuy, null)
    assert.equal(suggestions.suggestedKgSell, null)

    assert.equal(isPriceOverridden(0, 50), false)
    assert.equal(isPriceOverridden(-20, 50), false)
    assert.equal(isPriceOverridden('invalid', 50), false)
    assert.equal(isPriceOverridden(undefined, 50), false)

    const emptyItem = null
    assert.equal(resolveItemUnitPrice(emptyItem, 'قطعة', true), 0)
    assert.equal(resolveItemUnitPrice({ sellPrice: 500 }, 'unknown-unit', true), 500)
  })

  test('computes carton equivalents across fractional quantities and fallback modes', () => {
    const item = { piecesPerCarton: 12, weightPerCarton: 24 }

    assert.equal(getCartonEquivalent(36, 'قطعة', item), 3)
    assert.equal(getCartonEquivalent(60, 'كيلو', item), 2.5)
    assert.equal(getCartonEquivalent(5, 'كرتونة', item), 5)
    assert.equal(getCartonEquivalent(0, 'قطعة', item), 0)
    assert.equal(getCartonEquivalent(-10, 'كيلو', item), 0)
    assert.equal(getCartonEquivalent(10, 'unknown', item), 10)
  })
})

describe('Challenger 1 Stress 3: Microsecond & Timezone Operational Boundaries', () => {
  test('microsecond boundary: transfer at exact audit millisecond is considered concurrent, not backdated', () => {
    const exactTime = '2026-11-04T12:00:00.000Z'
    const transfer = {
      fromId: 'wh-source',
      toId: 'wh-dest',
      operationalDate: exactTime,
    }
    const audits = [
      {
        warehouseId: 'wh-source',
        auditDate: exactTime,
        status: 'confirmed',
      },
    ]

    const result = checkTransferAuditDiscrepancy(transfer, audits, [])
    assert.equal(result.isFromBackdated, false)
    assert.equal(result.isAuditDiscrepancy, false)

    const oneMilliBefore = {
      fromId: 'wh-source',
      toId: 'wh-dest',
      operationalDate: '2026-11-04T11:59:59.999Z',
    }
    const resultBefore = checkTransferAuditDiscrepancy(oneMilliBefore, audits, [])
    assert.equal(resultBefore.isFromBackdated, true)
    assert.equal(resultBefore.isAuditDiscrepancy, true)
  })

  test('timezone offsets in ISO strings compare absolute epoch timestamps correctly', () => {
    const transferWithOffset = {
      fromId: 'wh-cairo',
      toId: 'wh-alex',
      operationalDate: '2026-11-02T03:30:00+02:00',
    }
    const auditInUtc = [
      {
        warehouseId: 'wh-cairo',
        date: '2026-11-02T02:00:00Z',
        status: 'confirmed',
      },
    ]

    const res = checkTransferAuditDiscrepancy(transferWithOffset, auditInUtc, [])
    assert.equal(res.isFromBackdated, true)
  })

  test('formatDualDates handles edge-case properties, post-dated transfers, and malformed dates', () => {
    const postDated = {
      operationalDate: '2026-12-31',
      createdAt: '2026-11-04T10:00:00.000Z',
    }
    const dual = formatDualDates(postDated)
    assert.equal(dual.operationalDateStr, '2026-12-31')
    assert.equal(dual.isDifferentDate, true)
    assert.ok(dual.badgeLabel.startsWith('قيد:'))

    const altProps = {
      transaction_date: '2026-10-15',
      created_at: '2026-10-15T09:30:00.000Z',
    }
    const dualAlt = formatDualDates(altProps)
    assert.equal(dualAlt.operationalDateStr, '2026-10-15')
    assert.equal(dualAlt.isDifferentDate, false)

    const emptyDual = formatDualDates(null, null)
    assert.equal(emptyDual.operationalDateStr, '—')
    assert.equal(emptyDual.createdAtStr, '—')
    assert.equal(emptyDual.isDifferentDate, false)

    assert.equal(isDateBefore('2026-01-01', '2026-01-02'), true)
    assert.equal(isDateBefore('2026-01-02', '2026-01-01'), false)
    assert.equal(isDateBefore(null, '2026-01-01'), false)
    assert.equal(isSameDay('2026-05-01T10:00:00Z', '2026-05-01'), true)
    assert.equal(compareDates(null, null), 0)
    assert.equal(compareDates('2026-01-01', '2026-01-02') < 0, true)
  })
})

describe('Challenger 1 Stress 4: Asymmetric & Multi-Item Transfer Movements', () => {
  const warehouses = [
    { id: 'wh-main-freeze', name: 'ثلاجة المصنع الرئيسية' },
    { id: 'wh-transit-hub', name: 'مستودع العبور والتوزيع' },
  ]

  test('unilateral destination audit protects destination while source deducts stock normally', () => {
    const stock = [
      { warehouseId: 'wh-main-freeze', itemId: 'meat-flank', quantity: 70, unit: 'كرتونة' },
      { warehouseId: 'wh-transit-hub', itemId: 'meat-flank', quantity: 15, unit: 'كرتونة' },
    ]

    const audits = [
      {
        warehouseId: 'wh-transit-hub',
        operationalDate: '2026-11-03',
        status: 'approved',
      },
    ]

    const transfer = {
      id: 'trf-dest-only-backdated',
      fromId: 'wh-main-freeze',
      toId: 'wh-transit-hub',
      operationalDate: '2026-10-28',
      items: [{ itemId: 'meat-flank', quantity: 20, unit: 'كرتونة' }],
    }

    const res = calculateTransferStockMovement(transfer, stock, audits, warehouses)

    assert.equal(res.isAuditDiscrepancy, true)
    assert.equal(res.isFromBackdated, false)
    assert.equal(res.isToBackdated, true)

    const sourceStock = res.updatedStock.find((s) => s.warehouseId === 'wh-main-freeze')
    assert.equal(sourceStock?.quantity, 50)

    const destStock = res.updatedStock.find((s) => s.warehouseId === 'wh-transit-hub')
    assert.equal(destStock?.quantity, 15)
  })

  test('multi-item transfer with unseeded destination warehouse creates records atomically when unshielded', () => {
    const stock = [
      { warehouseId: 'wh-main-freeze', itemId: 'item-ribs', quantity: 40, unit: 'كرتونة' },
      { warehouseId: 'wh-main-freeze', itemId: 'item-brisket', quantity: 60, unit: 'كرتونة' },
    ]

    const audits = []

    const transfer = {
      id: 'trf-multi-unseeded',
      fromId: 'wh-main-freeze',
      toId: 'wh-transit-hub',
      operationalDate: '2026-11-04',
      items: [
        { itemId: 'item-ribs', quantity: 15, unit: 'كرتونة' },
        { itemId: 'item-brisket', quantity: 25, unit: 'كرتونة' },
      ],
    }

    const res = calculateTransferStockMovement(transfer, stock, audits, warehouses)
    assert.equal(res.isAuditDiscrepancy, false)

    const destRibs = res.updatedStock.find((s) => s.warehouseId === 'wh-transit-hub' && s.itemId === 'item-ribs')
    const destBrisket = res.updatedStock.find((s) => s.warehouseId === 'wh-transit-hub' && s.itemId === 'item-brisket')
    assert.equal(destRibs?.quantity, 15)
    assert.equal(destBrisket?.quantity, 25)

    const sourceRibs = res.updatedStock.find((s) => s.warehouseId === 'wh-main-freeze' && s.itemId === 'item-ribs')
    const sourceBrisket = res.updatedStock.find((s) => s.warehouseId === 'wh-main-freeze' && s.itemId === 'item-brisket')
    assert.equal(sourceRibs?.quantity, 25)
    assert.equal(sourceBrisket?.quantity, 35)
  })

  test('unapproved audits (draft/rejected) do not trigger discrepancy or block stock movement', () => {
    const stock = [
      { warehouseId: 'wh-main-freeze', itemId: 'item-shank', quantity: 30, unit: 'كرتونة' },
      { warehouseId: 'wh-transit-hub', itemId: 'item-shank', quantity: 10, unit: 'كرتونة' },
    ]

    const draftAudits = [
      { warehouseId: 'wh-main-freeze', operationalDate: '2026-11-05', status: 'draft' },
      { warehouseId: 'wh-transit-hub', operationalDate: '2026-11-05', status: 'rejected' },
    ]

    const transfer = {
      fromId: 'wh-main-freeze',
      toId: 'wh-transit-hub',
      operationalDate: '2026-10-20',
      items: [{ itemId: 'item-shank', quantity: 10, unit: 'كرتونة' }],
    }

    const res = calculateTransferStockMovement(transfer, stock, draftAudits, warehouses)
    assert.equal(res.isAuditDiscrepancy, false)
    assert.equal(res.isFromBackdated, false)
    assert.equal(res.isToBackdated, false)

    const source = res.updatedStock.find((s) => s.warehouseId === 'wh-main-freeze')
    const dest = res.updatedStock.find((s) => s.warehouseId === 'wh-transit-hub')
    assert.equal(source?.quantity, 20)
    assert.equal(dest?.quantity, 20)
  })

  test('picks the strictly latest audit when multiple confirmed audits exist for the same warehouse', () => {
    const audits = [
      { id: 'aud-old', warehouseId: 'wh-main-freeze', operationalDate: '2026-10-01', status: 'confirmed' },
      { id: 'aud-mid', warehouseId: 'wh-main-freeze', operationalDate: '2026-10-20', status: 'confirmed' },
      { id: 'aud-latest', warehouseId: 'wh-main-freeze', operationalDate: '2026-11-02', status: 'confirmed' },
    ]

    const latest = getLatestConfirmedAudit('wh-main-freeze', audits)
    assert.equal(latest?.id, 'aud-latest')
    assert.equal(latest?.operationalDate, '2026-11-02')

    const transfer = {
      fromId: 'wh-main-freeze',
      toId: 'wh-transit-hub',
      operationalDate: '2026-10-25',
      items: [{ itemId: 'test-item', quantity: 5, unit: 'كرتونة' }],
    }

    const disc = checkTransferAuditDiscrepancy(transfer, audits, warehouses)
    assert.equal(disc.isFromBackdated, true)
    assert.ok(disc.auditDiscrepancyNote.includes('2026-11-02'))
  })
})

describe('Challenger 1 Stress 5: Invariants & Store Resilience', () => {
  test('confirmTransfer idempotency and non-existent transfer handling in useAXStore', () => {
    const store = useAXStore.getState()
    const initialTransfersCount = store.transfers.length

    store.confirmTransfer('non-existent-transfer-id')
    assert.equal(useAXStore.getState().transfers.length, initialTransfersCount)

    const dummyTrf = {
      id: 'trf-idempotency-check',
      fromId: 'wh-october',
      toId: 'wh-cairo',
      operationalDate: '2026-10-10',
      items: [{ itemId: 'meat-tenderloin', quantity: 2, unit: 'كرتونة' }],
      status: 'pending',
    }
    store.addTransfer(dummyTrf)
    assert.ok(useAXStore.getState().transfers.some((t) => t.id === dummyTrf.id))

    store.confirmTransfer(dummyTrf.id)
    const firstConfirm = useAXStore.getState().transfers.find((t) => t.id === dummyTrf.id)
    assert.equal(firstConfirm?.status, 'confirmed')
    const firstConfirmedAt = firstConfirm?.confirmedAt

    store.confirmTransfer(dummyTrf.id)
    const secondConfirm = useAXStore.getState().transfers.find((t) => t.id === dummyTrf.id)
    assert.equal(secondConfirm?.status, 'confirmed')
    assert.equal(secondConfirm?.confirmedAt, firstConfirmedAt)
  })

  test('file invariant verification: tests/r2-m4-challenger-1.test.js has <= 500 lines and 0 comments', () => {
    const filePath = path.resolve(process.cwd(), 'tests/r2-m4-challenger-1.test.js')
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    assert.ok(lines.length <= 500, `File has ${lines.length} lines, exceeding 500 lines!`)

    const slashSlash = String.fromCharCode(47, 47)
    const slashStar = String.fromCharCode(47, 42)
    const comments = lines.filter((l) => {
      const trimmed = l.trim()
      return trimmed.startsWith(slashSlash) || (trimmed.startsWith(slashStar) && !trimmed.includes('String.fromCharCode'))
    })
    assert.equal(comments.length, 0, 'Found comment lines in code!')
  })
})
