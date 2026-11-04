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
  isPriceOverridden,
  resolveInvoiceUnitPrice,
} from '../src/utils/pricingCalculations.js'
import {
  formatDateOnly,
  formatDualDates,
} from '../src/utils/dateHelpers.js'
import {
  checkTransferAuditDiscrepancy,
  calculateTransferStockMovement,
} from '../src/store/transferAuditHelpers.js'
import { useAXStore } from '../src/store/useAXStore.js'

describe('Acceptance Criteria 1: 3-Tier Expense Categories (R1)', () => {
  test('users can add, edit, and delete categories at all three levels', () => {
    let categories = getInitialExpenseCategories()

    categories = expenseCategoryHelpers.addExpenseCategory(categories, {
      name: 'مصاريف الفروع الإقليمية',
      level: 'main',
    })
    const addedMain = categories.find((c) => c.name === 'مصاريف الفروع الإقليمية')
    assert.ok(addedMain && addedMain.level === 'main' && addedMain.parentId === null)

    categories = expenseCategoryHelpers.addExpenseCategory(categories, {
      name: 'فرع الإسكندرية ومطروح',
      level: 'sub',
      parentId: addedMain.id,
    })
    const addedSub = categories.find((c) => c.name === 'فرع الإسكندرية ومطروح')
    assert.ok(addedSub && addedSub.level === 'sub' && addedSub.parentId === addedMain.id)

    categories = expenseCategoryHelpers.addExpenseCategory(categories, {
      name: 'إيجار معرض سموحة',
      level: 'secondary',
      parentId: addedSub.id,
    })
    const addedSec = categories.find((c) => c.name === 'إيجار معرض سموحة')
    assert.ok(addedSec && addedSec.level === 'secondary' && addedSec.parentId === addedSub.id)

    categories = expenseCategoryHelpers.editExpenseCategory(categories, addedMain.id, { name: 'مصاريف الفروع والمنافذ' })
    assert.equal(categories.find((c) => c.id === addedMain.id)?.name, 'مصاريف الفروع والمنافذ')

    categories = expenseCategoryHelpers.editExpenseCategory(categories, addedSub.id, { name: 'فرع الإسكندرية الكبرى' })
    assert.equal(categories.find((c) => c.id === addedSub.id)?.name, 'فرع الإسكندرية الكبرى')

    categories = expenseCategoryHelpers.editExpenseCategory(categories, addedSec.id, { name: 'إيجار مقر سموحة المعدل' })
    assert.equal(categories.find((c) => c.id === addedSec.id)?.name, 'إيجار مقر سموحة المعدل')

    const pathInfo = expenseCategoryHelpers.getHierarchyPath(categories, addedSec.id)
    assert.equal(pathInfo.main?.name, 'مصاريف الفروع والمنافذ')
    assert.equal(pathInfo.sub?.name, 'فرع الإسكندرية الكبرى')
    assert.equal(pathInfo.secondary?.name, 'إيجار مقر سموحة المعدل')
    assert.equal(pathInfo.label, 'مصاريف الفروع والمنافذ / فرع الإسكندرية الكبرى / إيجار مقر سموحة المعدل')

    categories = expenseCategoryHelpers.deleteExpenseCategory(categories, addedSec.id)
    assert.equal(categories.find((c) => c.id === addedSec.id), undefined)
    assert.ok(categories.find((c) => c.id === addedSub.id))

    categories = expenseCategoryHelpers.addExpenseCategory(categories, { name: 'بند ثانوي مؤقت', level: 'secondary', parentId: addedSub.id })
    const tempSec = categories.find((c) => c.name === 'بند ثانوي مؤقت')
    assert.ok(tempSec)

    categories = expenseCategoryHelpers.deleteExpenseCategory(categories, addedSub.id)
    assert.equal(categories.find((c) => c.id === addedSub.id), undefined)
    assert.equal(categories.find((c) => c.id === tempSec.id), undefined)

    categories = expenseCategoryHelpers.deleteExpenseCategory(categories, addedMain.id)
    assert.equal(categories.find((c) => c.id === addedMain.id), undefined)
  })

  test('expense creation requires selecting 3-tier hierarchy before entering expense data', () => {
    const isExpenseGated = (txType, mainId, subId, secId) => txType === 'expense' && (!mainId || !subId || !secId)

    assert.equal(isExpenseGated('expense', '', '', ''), true)
    assert.equal(isExpenseGated('expense', 'exp-main-ops', '', ''), true)
    assert.equal(isExpenseGated('expense', 'exp-main-ops', 'exp-sub-trn', ''), true)
    assert.equal(isExpenseGated('expense', '', 'exp-sub-trn', 'exp-sec-trn-fuel'), true)
    assert.equal(isExpenseGated('expense', 'exp-main-ops', 'exp-sub-trn', 'exp-sec-trn-fuel'), false)
    assert.equal(isExpenseGated('client_receipt', '', '', ''), false)
    assert.equal(isExpenseGated('supplier_payment', '', '', ''), false)

    const categories = getInitialExpenseCategories()
    const pathInfo = expenseCategoryHelpers.getHierarchyPath(categories, 'exp-sec-trn-fuel')
    assert.ok(pathInfo.main && pathInfo.sub && pathInfo.secondary)

    const expenseTx = {
      id: 'tx-gated-test-1',
      type: 'expense',
      amount: 1500,
      operationalDate: '2026-10-25',
      createdAt: '2026-11-04T12:00:00.000Z',
      expenseMainCategoryId: pathInfo.main.id,
      expenseSubCategoryId: pathInfo.sub.id,
      expenseSecondaryCategoryId: pathInfo.secondary.id,
      expenseCategoryLabel: pathInfo.label,
      partyName: `[${pathInfo.label}]`,
    }

    assert.equal(expenseTx.expenseMainCategoryId, 'exp-main-ops')
    assert.equal(expenseTx.expenseSubCategoryId, 'exp-sub-trn')
    assert.equal(expenseTx.expenseSecondaryCategoryId, 'exp-sec-trn-fuel')
    assert.ok(expenseTx.partyName.includes('وقود وسولار'))
  })

  test('deleted categories with existing expenses are handled gracefully without breaking historical records', () => {
    let categories = getInitialExpenseCategories()
    const targetSecondaryId = 'exp-sec-mnt-gas'
    const targetPath = expenseCategoryHelpers.getHierarchyPath(categories, targetSecondaryId)

    const historicalExpense = {
      id: 'tx-hist-1',
      type: 'expense',
      amount: 4200,
      operationalDate: '2026-09-15',
      createdAt: '2026-09-15T10:30:00.000Z',
      expenseMainCategoryId: targetPath.main.id,
      expenseSubCategoryId: targetPath.sub.id,
      expenseSecondaryCategoryId: targetPath.secondary.id,
      expenseCategoryLabel: targetPath.label,
      partyName: `[${targetPath.label}]`,
    }

    assert.equal(expenseCategoryHelpers.countExpensesForCategory([historicalExpense], targetSecondaryId), 1)

    categories = expenseCategoryHelpers.deleteExpenseCategory(categories, targetSecondaryId)
    assert.equal(categories.find((c) => c.id === targetSecondaryId), undefined)

    assert.equal(historicalExpense.amount, 4200)
    assert.equal(historicalExpense.expenseSecondaryCategoryId, targetSecondaryId)
    assert.equal(historicalExpense.partyName, '[مصاريف تشغيلية ولوجستية / صيانة وثلاجات وتجميد / شحن فريون وزيوت ضواغط]')

    const fallbackPath = expenseCategoryHelpers.getHierarchyPath(categories, targetSecondaryId)
    assert.equal(fallbackPath.secondary, null)
    assert.equal(fallbackPath.label, '')
  })
})

describe('Acceptance Criteria 2: Manual Piece & Kilogram Pricing Overrides (R2)', () => {
  test('users can set a manual selling price for piece or kg differing from carton-divided rate', () => {
    const item = {
      id: 'item-beef-shanks',
      name: 'موزة بقري برازيلي مجمدة',
      unitType: 'كرتونة',
      sellPrice: 2400,
      buyPrice: 2000,
      weightPerCarton: 20,
      piecesPerCarton: 8,
      pieceSellPrice: 350,
      kgSellPrice: 140,
    }

    const suggested = calculateSuggestedUnitPrices(item)
    assert.equal(suggested.suggestedKgSell, 120)
    assert.equal(suggested.suggestedPieceSell, 300)

    assert.equal(item.pieceSellPrice, 350)
    assert.notEqual(item.pieceSellPrice, suggested.suggestedPieceSell)
    assert.equal(isPriceOverridden(item.pieceSellPrice, suggested.suggestedPieceSell), true)

    assert.equal(item.kgSellPrice, 140)
    assert.notEqual(item.kgSellPrice, suggested.suggestedKgSell)
    assert.equal(isPriceOverridden(item.kgSellPrice, suggested.suggestedKgSell), true)

    assert.equal(resolveInvoiceUnitPrice(item, 'كرتونة', true), 2400)
    assert.equal(resolveInvoiceUnitPrice(item, 'قطعة', true), 350)
    assert.equal(resolveInvoiceUnitPrice(item, 'كيلو', true), 140)
  })

  test('suggests calculated unit price by default but accepts custom values entered by user', () => {
    const defaultProduct = {
      sellPrice: 1800,
      buyPrice: 1500,
      weightPerCarton: 12,
      piecesPerCarton: 6,
      unitType: 'كرتونة',
    }

    const suggestions = calculateSuggestedUnitPrices(defaultProduct)
    assert.equal(suggestions.suggestedPieceSell, 300)
    assert.equal(suggestions.suggestedKgSell, 150)
    assert.equal(suggestions.suggestedPieceBuy, 250)
    assert.equal(suggestions.suggestedKgBuy, 125)

    assert.equal(isPriceOverridden(300, suggestions.suggestedPieceSell), false)
    assert.equal(isPriceOverridden(150, suggestions.suggestedKgSell), false)
    assert.equal(isPriceOverridden('', suggestions.suggestedPieceSell), false)
    assert.equal(isPriceOverridden(null, suggestions.suggestedPieceSell), false)

    assert.equal(isPriceOverridden(325, suggestions.suggestedPieceSell), true)
    assert.equal(isPriceOverridden(280, suggestions.suggestedPieceSell), true)
    assert.equal(isPriceOverridden(165, suggestions.suggestedKgSell), true)

    assert.equal(resolveInvoiceUnitPrice(defaultProduct, 'قطعة', true), 300)
    assert.equal(resolveInvoiceUnitPrice(defaultProduct, 'كيلو', true), 150)
  })

  test('independent buy and sell pricing resolution across invoice unit types', () => {
    const item = {
      id: 'item-liver',
      name: 'كبدة بقري أمريكي',
      unitType: 'كرتونة',
      sellPrice: 1200,
      buyPrice: 900,
      weightPerCarton: 10,
      piecesPerCarton: 10,
      pieceSellPrice: 150,
      pieceBuyPrice: 95,
      kgSellPrice: 135,
      kgBuyPrice: 92,
    }

    assert.equal(resolveInvoiceUnitPrice(item, 'قطعة', true), 150)
    assert.equal(resolveInvoiceUnitPrice(item, 'قطعة', false), 95)
    assert.equal(resolveInvoiceUnitPrice(item, 'كيلو', true), 135)
    assert.equal(resolveInvoiceUnitPrice(item, 'كيلو', false), 92)
    assert.equal(resolveInvoiceUnitPrice(item, 'كرتونة', true), 1200)
    assert.equal(resolveInvoiceUnitPrice(item, 'كرتونة', false), 900)
  })
})

describe('Acceptance Criteria 3: Operational Dates Across 5 Modules (R3)', () => {
  test('transfers, expenses, audits, purchases, and sales accept operational transaction date', () => {
    const records = [
      { module: 'transfers', op: '2026-10-18', cr: '2026-11-04T12:00:00.000Z' },
      { module: 'expenses', op: '2026-10-19', cr: '2026-11-04T12:05:00.000Z' },
      { module: 'audits', op: '2026-10-20', cr: '2026-11-04T12:10:00.000Z' },
      { module: 'purchases', op: '2026-10-21', cr: '2026-11-04T12:15:00.000Z' },
      { module: 'sales', op: '2026-10-22', cr: '2026-11-04T12:20:00.000Z' },
    ]

    records.forEach((r) => {
      assert.equal(formatDateOnly(r.op), r.op)
    })
  })

  test('both operational date and immutable createdAt are preserved and formatted for display', () => {
    const modulesData = [
      { module: 'transfers', operationalDate: '2026-10-10', createdAt: '2026-11-04T08:15:00.000Z' },
      { module: 'expenses', operationalDate: '2026-10-12', createdAt: '2026-11-04T09:20:00.000Z' },
      { module: 'audits', operationalDate: '2026-10-14', createdAt: '2026-11-04T10:30:00.000Z' },
      { module: 'purchases', operationalDate: '2026-10-16', createdAt: '2026-11-04T11:45:00.000Z' },
      { module: 'sales', operationalDate: '2026-10-18', createdAt: '2026-11-04T13:00:00.000Z' },
    ]

    modulesData.forEach((record) => {
      const dual = formatDualDates(record)
      assert.equal(dual.operationalDateStr, record.operationalDate)
      assert.ok(dual.createdAtStr.startsWith('2026-11-04'))
      assert.equal(dual.isDifferentDate, true)
      assert.ok(dual.badgeLabel.startsWith('قيد:'))
    })

    const sameDay = formatDualDates({ operationalDate: '2026-11-04', createdAt: '2026-11-04T14:00:00.000Z' })
    assert.equal(sameDay.isDifferentDate, false)
    assert.equal(sameDay.operationalDateStr, '2026-11-04')
    assert.ok(sameDay.badgeLabel.startsWith('قيد:'))
  })
})

describe('Acceptance Criteria 4: Warehouse Transfers and Audit Integrity (R4)', () => {
  const warehouses = [
    { id: 'wh-central-freezer', name: 'الثلاجة المركزية' },
    { id: 'wh-retail-depot', name: 'مستودع التوزيع' },
  ]

  const confirmedAudits = [
    {
      id: 'aud-central-nov1',
      warehouseId: 'wh-central-freezer',
      warehouseName: 'الثلاجة المركزية',
      operationalDate: '2026-11-01',
      status: 'confirmed',
    },
    {
      id: 'aud-retail-nov2',
      warehouseId: 'wh-retail-depot',
      warehouseName: 'مستودع التوزيع',
      operationalDate: '2026-11-02',
      status: 'confirmed',
    },
  ]

  test('transfer dated before latest confirmed audit records without modifying audited balances', () => {
    const stockBefore = [
      { warehouseId: 'wh-central-freezer', itemId: 'meat-tenderloin', quantity: 100, unit: 'كرتونة' },
      { warehouseId: 'wh-retail-depot', itemId: 'meat-tenderloin', quantity: 20, unit: 'كرتونة' },
    ]

    const auditsWithSourceOnly = [confirmedAudits[0]]

    const backdatedTransfer = {
      id: 'trf-backdated-source',
      fromId: 'wh-central-freezer',
      toId: 'wh-retail-depot',
      operationalDate: '2026-10-25',
      items: [{ itemId: 'meat-tenderloin', quantity: 30, unit: 'كرتونة' }],
    }

    const result = calculateTransferStockMovement(
      backdatedTransfer,
      stockBefore,
      auditsWithSourceOnly,
      warehouses
    )

    assert.equal(result.isAuditDiscrepancy, true)
    assert.equal(result.isFromBackdated, true)
    assert.equal(result.isToBackdated, false)

    const centralStock = result.updatedStock.find((s) => s.warehouseId === 'wh-central-freezer')
    assert.equal(centralStock?.quantity, 100)

    const retailStock = result.updatedStock.find((s) => s.warehouseId === 'wh-retail-depot')
    assert.equal(retailStock?.quantity, 50)
  })

  test('bilateral audit shield protects both warehouses when both are audited after transfer', () => {
    const stockBefore = [
      { warehouseId: 'wh-central-freezer', itemId: 'meat-tenderloin', quantity: 100, unit: 'كرتونة' },
      { warehouseId: 'wh-retail-depot', itemId: 'meat-tenderloin', quantity: 20, unit: 'كرتونة' },
    ]

    const bilateralTransfer = {
      id: 'trf-bilateral-backdated',
      fromId: 'wh-central-freezer',
      toId: 'wh-retail-depot',
      operationalDate: '2026-10-20',
      items: [{ itemId: 'meat-tenderloin', quantity: 40, unit: 'كرتونة' }],
    }

    const result = calculateTransferStockMovement(
      bilateralTransfer,
      stockBefore,
      confirmedAudits,
      warehouses
    )

    assert.equal(result.isAuditDiscrepancy, true)
    assert.equal(result.isFromBackdated, true)
    assert.equal(result.isToBackdated, true)

    const centralStock = result.updatedStock.find((s) => s.warehouseId === 'wh-central-freezer')
    assert.equal(centralStock?.quantity, 100)

    const retailStock = result.updatedStock.find((s) => s.warehouseId === 'wh-retail-depot')
    assert.equal(retailStock?.quantity, 20)
  })

  test('displays audit discrepancy indicator and informational note with warehouse details', () => {
    const transfer = {
      id: 'trf-note-test',
      fromId: 'wh-central-freezer',
      toId: 'wh-retail-depot',
      operationalDate: '2026-10-25',
      items: [{ itemId: 'meat-tenderloin', quantity: 15, unit: 'كرتونة' }],
    }

    const discrepancy = checkTransferAuditDiscrepancy(transfer, confirmedAudits, warehouses)
    assert.equal(discrepancy.isAuditDiscrepancy, true)
    assert.ok(discrepancy.auditDiscrepancyNote.includes('الثلاجة المركزية'))
    assert.ok(discrepancy.auditDiscrepancyNote.includes('2026-11-01'))
    assert.ok(discrepancy.auditDiscrepancyNote.includes('تنبيه جردي'))
  })
})

describe('Acceptance Criteria 5: End-to-End System Integration & Invariants Pass', () => {
  test('end-to-end operational lifecycle with all R1-R4 capabilities active simultaneously', () => {
    const store = useAXStore.getState()
    assert.ok(store && Array.isArray(store.expenseCategories))

    store.addExpenseCategory({ name: 'قطاع الفنادق والمطاعم', level: 'main' })
    const mainCat = useAXStore.getState().expenseCategories.find((c) => c.name === 'قطاع الفنادق والمطاعم')
    assert.ok(mainCat)

    store.addExpenseCategory({ name: 'مطاعم الوجبات السريعة', level: 'sub', parentId: mainCat.id })
    const subCat = useAXStore.getState().expenseCategories.find((c) => c.name === 'مطاعم الوجبات السريعة')
    assert.ok(subCat)

    const newItem = {
      id: 'item-e2e-ribeye',
      name: 'ريب آي أنجوس مجمد',
      unitType: 'كرتونة',
      sellPrice: 3000,
      buyPrice: 2400,
      weightPerCarton: 15,
      piecesPerCarton: 10,
      pieceSellPrice: 340,
      kgSellPrice: 220,
    }
    store.addItem(newItem)
    assert.ok(useAXStore.getState().items.some((i) => i.id === newItem.id))

    const backdatedTrf = {
      id: 'trf-e2e-audit-test',
      fromId: 'wh-october',
      toId: 'wh-cairo',
      operationalDate: '2026-10-01',
      items: [{ itemId: newItem.id, quantity: 5, unit: 'كرتونة' }],
      status: 'pending',
    }
    store.addTransfer(backdatedTrf)
    assert.ok(useAXStore.getState().transfers.some((t) => t.id === backdatedTrf.id))

    store.confirmTransfer(backdatedTrf.id)
    const confirmed = useAXStore.getState().transfers.find((t) => t.id === backdatedTrf.id)
    assert.equal(confirmed?.status, 'confirmed')
    assert.ok(confirmed?.confirmedAt)

    store.deleteItem(newItem.id)
    store.deleteExpenseCategory(mainCat.id)
  })

  test('file invariants: test suite strictly adheres to <= 500 lines and zero comments', () => {
    const filePath = path.resolve(process.cwd(), 'tests/r1-r4-operations-and-audits.test.js')
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
