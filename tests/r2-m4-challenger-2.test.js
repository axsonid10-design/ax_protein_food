import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { useAXStore } from '../src/store/useAXStore.js'
import { expenseCategoryHelpers, getInitialExpenseCategories } from '../src/store/expenseCategoryHelpers.js'
import { calculateSuggestedUnitPrices, isPriceOverridden, resolveInvoiceUnitPrice } from '../src/utils/pricingCalculations.js'
import { formatDateOnly, formatDateTime, formatDualDates, isDateBefore, compareDates, isSameDay } from '../src/utils/dateHelpers.js'
import { getLatestConfirmedAudit, checkTransferAuditDiscrepancy, calculateTransferStockMovement } from '../src/store/transferAuditHelpers.js'

describe('Milestone 4 Challenger 2 — E2E Multi-Module Integration Lifecycle', () => {
  test('complete operational lifecycle across inventory audit, backdated transfer, invoice pricing override, and 3-tier expense', () => {
    const whCentral = { id: 'wh-central-e2e', name: 'المخزن المركزي للتبريد والتجميد' }
    const whVan = { id: 'wh-van-e2e', name: 'سيارة التوزيع المبردة 01' }
    const trSafe = { id: 'tr-main-safe', name: 'الخزينة الرئيسية', balance: 50000 }

    const itemTenderloin = {
      id: 'item-tenderloin-e2e',
      name: 'عرق فلتو بقري برازيلي فاخر',
      category: 'مجمدات لحوم',
      subCategory: 'لحوم قطعيات',
      unitType: 'كرتونة',
      piecesPerCarton: 20,
      weightPerCarton: 10,
      sellPrice: 2400,
      buyPrice: 1800,
      pieceSellPrice: 160,
      kgSellPrice: 290,
    }

    useAXStore.setState({
      warehouses: [whCentral, whVan],
      treasuryAccounts: [trSafe],
      items: [itemTenderloin],
      inventoryStock: [
        { warehouseId: 'wh-central-e2e', itemId: 'item-tenderloin-e2e', quantity: 100, unit: 'كرتونة' },
        { warehouseId: 'wh-van-e2e', itemId: 'item-tenderloin-e2e', quantity: 10, unit: 'كرتونة' },
      ],
      stockAudits: [],
      transfers: [],
      invoices: [],
      clients: [{ id: 'cl-prince', name: 'مطاعم البرنس العالمية', balance: 0 }],
      suppliers: [],
      cashTransactions: [],
      expenseCategories: getInitialExpenseCategories(),
    })

    const initialStock = useAXStore.getState().inventoryStock.find((s) => s.warehouseId === 'wh-central-e2e' && s.itemId === 'item-tenderloin-e2e')
    assert.equal(initialStock.quantity, 100)

    const auditSession = {
      id: 'aud-e2e-t1',
      code: 'AUD-T1-CENTRAL',
      warehouseId: 'wh-central-e2e',
      date: '2026-11-01',
      operationalDate: '2026-11-01',
      createdAt: '2026-11-01T10:00:00.000Z',
      status: 'approved',
    }
    const adjustedStocks = [{ warehouseId: 'wh-central-e2e', itemId: 'item-tenderloin-e2e', actualQty: 95, unit: 'كرتونة' }]
    useAXStore.getState().applyStockAudit({ session: auditSession, adjustedStocks })

    const stockAfterAudit = useAXStore.getState().inventoryStock.find((s) => s.warehouseId === 'wh-central-e2e' && s.itemId === 'item-tenderloin-e2e')
    assert.equal(stockAfterAudit.quantity, 95)
    assert.equal(useAXStore.getState().stockAudits.length, 1)

    const backdatedTransfer = {
      id: 'trf-e2e-t0',
      code: 'TRF-BACKDATED-01',
      fromId: 'wh-central-e2e',
      toId: 'wh-van-e2e',
      date: '2026-10-25',
      operationalDate: '2026-10-25',
      createdAt: '2026-11-04T09:15:00.000Z',
      status: 'pending',
      items: [{ itemId: 'item-tenderloin-e2e', quantity: 20, unit: 'كرتونة' }],
    }
    useAXStore.getState().addTransfer(backdatedTransfer)

    const storedTransfer = useAXStore.getState().transfers.find((t) => t.id === 'trf-e2e-t0')
    assert.ok(storedTransfer)
    assert.equal(storedTransfer.isAuditDiscrepancy, true)
    assert.ok(storedTransfer.auditDiscrepancyNote.includes('المخزن المركزي للتبريد والتجميد'))

    useAXStore.getState().confirmTransfer('trf-e2e-t0')

    const centralStockAfterTrf = useAXStore.getState().inventoryStock.find((s) => s.warehouseId === 'wh-central-e2e' && s.itemId === 'item-tenderloin-e2e')
    assert.equal(centralStockAfterTrf.quantity, 95)

    const vanStockAfterTrf = useAXStore.getState().inventoryStock.find((s) => s.warehouseId === 'wh-van-e2e' && s.itemId === 'item-tenderloin-e2e')
    assert.equal(vanStockAfterTrf.quantity, 30)

    const confirmedTrf = useAXStore.getState().transfers.find((t) => t.id === 'trf-e2e-t0')
    assert.equal(confirmedTrf.status, 'confirmed')
    assert.equal(confirmedTrf.isAuditDiscrepancy, true)

    const suggested = calculateSuggestedUnitPrices(itemTenderloin)
    assert.equal(suggested.suggestedKgSell, 240)
    assert.equal(suggested.suggestedPieceSell, 120)
    assert.equal(isPriceOverridden(290, suggested.suggestedKgSell), true)
    assert.equal(isPriceOverridden(160, suggested.suggestedPieceSell), true)
    assert.equal(resolveInvoiceUnitPrice(itemTenderloin, 'كيلو', true), 290)
    assert.equal(resolveInvoiceUnitPrice(itemTenderloin, 'قطعة', true), 160)
    assert.equal(resolveInvoiceUnitPrice(itemTenderloin, 'كرتونة', true), 2400)

    const salesInvoice = {
      id: 'inv-e2e-sale-01',
      code: 'INV-SALE-8801',
      type: 'sale',
      partyName: 'مطاعم البرنس العالمية',
      warehouseId: 'wh-central-e2e',
      treasuryId: 'tr-main-safe',
      date: '2026-11-03',
      operationalDate: '2026-11-03',
      createdAt: '2026-11-04T10:00:00.000Z',
      paidAmount: 5000,
      remainingAmount: 7000,
      total: 12000,
      items: [{ itemId: 'item-tenderloin-e2e', quantity: 5, unit: 'كرتونة', unitPrice: 2400, total: 12000 }],
    }
    useAXStore.getState().addInvoice(salesInvoice)

    const centralStockAfterSale = useAXStore.getState().inventoryStock.find((s) => s.warehouseId === 'wh-central-e2e' && s.itemId === 'item-tenderloin-e2e')
    assert.equal(centralStockAfterSale.quantity, 90)

    const updatedClient = useAXStore.getState().clients.find((c) => c.name === 'مطاعم البرنس العالمية')
    assert.equal(updatedClient.balance, 7000)

    const treasuryAfterSale = useAXStore.getState().treasuryAccounts.find((t) => t.id === 'tr-main-safe')
    assert.equal(treasuryAfterSale.balance, 55000)

    const isExpenseGated = (txType, mainId, subId, secId) => txType === 'expense' && (!mainId || !subId || !secId)
    assert.equal(isExpenseGated('expense', '', '', ''), true)
    assert.equal(isExpenseGated('expense', 'main-1', '', ''), true)
    assert.equal(isExpenseGated('expense', 'main-1', 'sub-1', ''), true)
    assert.equal(isExpenseGated('expense', 'main-1', 'sub-1', 'sec-1'), false)

    const mainCat = { id: 'exp-main-cold', name: 'مصاريف سلاسل التبريد والتجميد', level: 'main', parentId: null }
    const subCat = { id: 'exp-sub-maintenance', name: 'صيانة وحدات التجميد المركزية', level: 'sub', parentId: 'exp-main-cold' }
    const secCat = { id: 'exp-sec-freon', name: 'شحن غاز فريون للمخزن المركزي', level: 'secondary', parentId: 'exp-sub-maintenance' }

    useAXStore.getState().addExpenseCategory(mainCat)
    useAXStore.getState().addExpenseCategory(subCat)
    useAXStore.getState().addExpenseCategory(secCat)

    const pathInfo = expenseCategoryHelpers.getHierarchyPath(useAXStore.getState().expenseCategories, 'exp-sec-freon')
    assert.equal(pathInfo.main.name, 'مصاريف سلاسل التبريد والتجميد')
    assert.equal(pathInfo.sub.name, 'صيانة وحدات التجميد المركزية')
    assert.equal(pathInfo.secondary.name, 'شحن غاز فريون للمخزن المركزي')
    assert.equal(pathInfo.label, 'مصاريف سلاسل التبريد والتجميد / صيانة وحدات التجميد المركزية / شحن غاز فريون للمخزن المركزي')

    const expenseTx = {
      id: 'tx-e2e-exp-01',
      code: 'EXP-8801',
      type: 'expense',
      partyType: 'expense',
      partyName: `[${pathInfo.label}]`,
      amount: 6500,
      treasuryId: 'tr-main-safe',
      date: '2026-11-02',
      operationalDate: '2026-11-02',
      createdAt: '2026-11-04T11:20:00.000Z',
      notes: `${pathInfo.label} - صيانة دورية عاجلة`,
      expenseMainCategoryId: mainCat.id,
      expenseMainCategoryName: mainCat.name,
      expenseSubCategoryId: subCat.id,
      expenseSubCategoryName: subCat.name,
      expenseSecondaryCategoryId: secCat.id,
      expenseSecondaryCategoryName: secCat.name,
    }
    useAXStore.getState().addCashTransaction(expenseTx)

    const recordedExp = useAXStore.getState().cashTransactions.find((tx) => tx.id === 'tx-e2e-exp-01')
    assert.ok(recordedExp)
    assert.equal(recordedExp.amount, 6500)
    assert.equal(recordedExp.operationalDate, '2026-11-02')
    assert.equal(recordedExp.createdAt, '2026-11-04T11:20:00.000Z')

    const treasuryAfterExp = useAXStore.getState().treasuryAccounts.find((t) => t.id === 'tr-main-safe')
    assert.equal(treasuryAfterExp.balance, 48500)

    useAXStore.getState().deleteExpenseCategory('exp-sec-freon')
    const remainingCats = useAXStore.getState().expenseCategories
    assert.equal(remainingCats.some((c) => c.id === 'exp-sec-freon'), false)

    const ledgerAfterCatDelete = useAXStore.getState().cashTransactions.find((tx) => tx.id === 'tx-e2e-exp-01')
    assert.ok(ledgerAfterCatDelete)
    assert.equal(ledgerAfterCatDelete.amount, 6500)
    assert.equal(ledgerAfterCatDelete.operationalDate, '2026-11-02')
    assert.equal(ledgerAfterCatDelete.createdAt, '2026-11-04T11:20:00.000Z')
    assert.equal(ledgerAfterCatDelete.expenseSecondaryCategoryId, 'exp-sec-freon')
    assert.equal(ledgerAfterCatDelete.expenseSecondaryCategoryName, 'شحن غاز فريون للمخزن المركزي')
    assert.ok(ledgerAfterCatDelete.partyName.includes('شحن غاز فريون للمخزن المركزي'))

    const purchaseInvoice = {
      id: 'inv-e2e-purch-01',
      code: 'INV-PURCH-8801',
      type: 'purchase',
      partyName: 'شركة النيل للتوريدات الغذائية',
      warehouseId: 'wh-central-e2e',
      treasuryId: 'tr-main-safe',
      date: '2026-10-28',
      operationalDate: '2026-10-28',
      createdAt: '2026-11-04T08:00:00.000Z',
      paidAmount: 10000,
      remainingAmount: 15000,
      total: 25000,
      items: [{ itemId: 'item-tenderloin-e2e', quantity: 15, unit: 'كرتونة', unitPrice: 1666.67, total: 25000 }],
    }
    useAXStore.getState().addInvoice(purchaseInvoice)

    const record1 = formatDualDates(storedTransfer)
    assert.equal(record1.operationalDateStr, '2026-10-25')
    assert.ok(record1.createdAtStr.includes('2026-11-04'))
    assert.equal(record1.isDifferentDate, true)
    assert.ok(record1.badgeLabel.startsWith('قيد:'))

    const record2 = formatDualDates(auditSession)
    assert.equal(record2.operationalDateStr, '2026-11-01')
    assert.ok(record2.createdAtStr.includes('2026-11-01'))
    assert.equal(record2.isDifferentDate, false)

    const record3 = formatDualDates(salesInvoice)
    assert.equal(record3.operationalDateStr, '2026-11-03')
    assert.ok(record3.createdAtStr.includes('2026-11-04'))
    assert.equal(record3.isDifferentDate, true)

    const record4 = formatDualDates(purchaseInvoice)
    assert.equal(record4.operationalDateStr, '2026-10-28')
    assert.ok(record4.createdAtStr.includes('2026-11-04'))
    assert.equal(record4.isDifferentDate, true)

    const record5 = formatDualDates(expenseTx)
    assert.equal(record5.operationalDateStr, '2026-11-02')
    assert.ok(record5.createdAtStr.includes('2026-11-04'))
    assert.equal(record5.isDifferentDate, true)
  })
})

describe('Milestone 4 Challenger 2 — Multi-Audit Cascade & Boundary Stress', () => {
  const warehouses = [
    { id: 'wh-alpha', name: 'مخزن ألفا الرئيسي' },
    { id: 'wh-beta', name: 'مخزن بيتا للتوزيع' },
    { id: 'wh-gamma', name: 'مخزن جاما الاحتياطي' },
  ]

  const cascadedAudits = [
    { id: 'aud-a1', warehouseId: 'wh-alpha', date: '2026-10-10', status: 'approved' },
    { id: 'aud-a2', warehouseId: 'wh-alpha', date: '2026-10-25', status: 'confirmed' },
    { id: 'aud-a3', warehouseId: 'wh-alpha', date: '2026-11-02', status: 'approved' },
    { id: 'aud-a4', warehouseId: 'wh-alpha', date: '2026-11-05', status: 'draft' },
    { id: 'aud-a5', warehouseId: 'wh-alpha', date: '2026-11-06', status: 'rejected' },
    { id: 'aud-b1', warehouseId: 'wh-beta', date: '2026-10-30', status: 'approved' },
  ]

  test('latest confirmed audit strictly picks most recent approved date and ignores draft or rejected', () => {
    const latestAlpha = getLatestConfirmedAudit('wh-alpha', cascadedAudits)
    assert.equal(latestAlpha.id, 'aud-a3')
    assert.equal(latestAlpha.date, '2026-11-02')

    const latestBeta = getLatestConfirmedAudit('wh-beta', cascadedAudits)
    assert.equal(latestBeta.id, 'aud-b1')
    assert.equal(latestBeta.date, '2026-10-30')

    const latestGamma = getLatestConfirmedAudit('wh-gamma', cascadedAudits)
    assert.equal(latestGamma, null)
  })

  test('transfer at date between intermediate audits is shielded by latest confirmed audit', () => {
    const stock = [
      { warehouseId: 'wh-alpha', itemId: 'item-beef', quantity: 50, unit: 'كرتونة' },
      { warehouseId: 'wh-gamma', itemId: 'item-beef', quantity: 10, unit: 'كرتونة' },
    ]

    const transferBetweenAudits = {
      id: 'trf-between-audits',
      fromId: 'wh-alpha',
      toId: 'wh-gamma',
      operationalDate: '2026-10-28',
      items: [{ itemId: 'item-beef', quantity: 15, unit: 'كرتونة' }],
    }

    const { updatedStock, isFromBackdated, isToBackdated, isAuditDiscrepancy } =
      calculateTransferStockMovement(transferBetweenAudits, stock, cascadedAudits, warehouses)

    assert.equal(isAuditDiscrepancy, true)
    assert.equal(isFromBackdated, true)
    assert.equal(isToBackdated, false)

    const alphaStock = updatedStock.find((s) => s.warehouseId === 'wh-alpha')
    assert.equal(alphaStock.quantity, 50)

    const gammaStock = updatedStock.find((s) => s.warehouseId === 'wh-gamma')
    assert.equal(gammaStock.quantity, 25)
  })

  test('transfer executed after latest confirmed audit updates both warehouses normally', () => {
    const stock = [
      { warehouseId: 'wh-alpha', itemId: 'item-beef', quantity: 50, unit: 'كرتونة' },
      { warehouseId: 'wh-gamma', itemId: 'item-beef', quantity: 10, unit: 'كرتونة' },
    ]

    const postAuditTransfer = {
      id: 'trf-post-audit',
      fromId: 'wh-alpha',
      toId: 'wh-gamma',
      operationalDate: '2026-11-03',
      items: [{ itemId: 'item-beef', quantity: 15, unit: 'كرتونة' }],
    }

    const { updatedStock, isFromBackdated, isToBackdated, isAuditDiscrepancy } =
      calculateTransferStockMovement(postAuditTransfer, stock, cascadedAudits, warehouses)

    assert.equal(isAuditDiscrepancy, false)
    assert.equal(isFromBackdated, false)
    assert.equal(isToBackdated, false)

    const alphaStock = updatedStock.find((s) => s.warehouseId === 'wh-alpha')
    assert.equal(alphaStock.quantity, 35)

    const gammaStock = updatedStock.find((s) => s.warehouseId === 'wh-gamma')
    assert.equal(gammaStock.quantity, 25)
  })

  test('bilateral backdated transfer leaves entire inventory array 100% untouched', () => {
    const stock = [
      { warehouseId: 'wh-alpha', itemId: 'item-beef', quantity: 70, unit: 'كرتونة' },
      { warehouseId: 'wh-beta', itemId: 'item-beef', quantity: 20, unit: 'كرتونة' },
    ]

    const bilateralTransfer = {
      id: 'trf-bilateral-backdated',
      fromId: 'wh-alpha',
      toId: 'wh-beta',
      operationalDate: '2026-10-15',
      items: [{ itemId: 'item-beef', quantity: 10, unit: 'كرتونة' }],
    }

    const { updatedStock, isFromBackdated, isToBackdated, isAuditDiscrepancy, auditDiscrepancyNote } =
      calculateTransferStockMovement(bilateralTransfer, stock, cascadedAudits, warehouses)

    assert.equal(isAuditDiscrepancy, true)
    assert.equal(isFromBackdated, true)
    assert.equal(isToBackdated, true)
    assert.ok(auditDiscrepancyNote.includes('مخزن ألفا الرئيسي'))
    assert.ok(auditDiscrepancyNote.includes('مخزن بيتا للتوزيع'))

    const alphaStock = updatedStock.find((s) => s.warehouseId === 'wh-alpha')
    assert.equal(alphaStock.quantity, 70)

    const betaStock = updatedStock.find((s) => s.warehouseId === 'wh-beta')
    assert.equal(betaStock.quantity, 20)
  })
})

describe('Milestone 4 Challenger 2 — Unit Pricing Override Engine Precision', () => {
  test('handles zero and missing carton dimensions gracefully without NaN', () => {
    const zeroPiecesItem = { sellPrice: 1500, buyPrice: 1200, piecesPerCarton: 0, weightPerCarton: 0, unitType: 'قطعة' }
    const res = calculateSuggestedUnitPrices(zeroPiecesItem)
    assert.equal(res.suggestedPieceSell, null)
    assert.equal(res.suggestedPieceBuy, null)
    assert.equal(res.suggestedKgSell, null)
    assert.equal(res.suggestedKgBuy, null)

    const nullItemRes = calculateSuggestedUnitPrices(null)
    assert.equal(nullItemRes.suggestedPieceSell, null)
    assert.equal(nullItemRes.suggestedKgSell, null)
  })

  test('floating-point tolerance in isPriceOverridden matches expected boundary threshold', () => {
    assert.equal(isPriceOverridden(100.005, 100.0), false)
    assert.equal(isPriceOverridden(100.008, 100.0), false)
    assert.equal(isPriceOverridden(100.009, 100.0), false)
    assert.equal(isPriceOverridden(100.015, 100.0), true)
    assert.equal(isPriceOverridden(100.0, 100.0), false)
    assert.equal(isPriceOverridden(0, 100.0), false)
    assert.equal(isPriceOverridden(null, 100.0), false)
    assert.equal(isPriceOverridden(undefined, 100.0), false)
    assert.equal(isPriceOverridden('', 100.0), false)
    assert.equal(isPriceOverridden(150, null), true)
  })

  test('resolveInvoiceUnitPrice prioritizes manual override and unit types accurately', () => {
    const item = {
      sellPrice: 2000,
      buyPrice: 1500,
      piecesPerCarton: 10,
      weightPerCarton: 5,
      pieceSellPrice: 250,
      kgSellPrice: 450,
      pieceBuyPrice: 180,
      kgBuyPrice: 320,
    }

    assert.equal(resolveInvoiceUnitPrice(item, 'قطعة', true), 250)
    assert.equal(resolveInvoiceUnitPrice(item, 'قطعة', false), 180)
    assert.equal(resolveInvoiceUnitPrice(item, 'كيلو', true), 450)
    assert.equal(resolveInvoiceUnitPrice(item, 'كيلو', false), 320)
    assert.equal(resolveInvoiceUnitPrice(item, 'كرتونة', true), 2000)
    assert.equal(resolveInvoiceUnitPrice(item, 'كرتونة', false), 1500)

    const fallbackItem = { sellPrice: 1000, buyPrice: 800, piecesPerCarton: 5, weightPerCarton: 4, pieceSellPrice: null, kgSellPrice: null }
    assert.equal(resolveInvoiceUnitPrice(fallbackItem, 'قطعة', true), 200)
    assert.equal(resolveInvoiceUnitPrice(fallbackItem, 'كيلو', true), 250)
    assert.equal(resolveInvoiceUnitPrice(null, 'قطعة', true), 0)
  })
})

describe('Milestone 4 Challenger 2 — 3-Tier Expense Categories Hierarchy Resilience', () => {
  test('cascading deletion of main category removes all sub and secondary descendants', () => {
    let categories = getInitialExpenseCategories()
    const main = { id: 'm-temp', name: 'رئيسي مؤقت', level: 'main', parentId: null }
    const sub = { id: 's-temp', name: 'فرعي مؤقت', level: 'sub', parentId: 'm-temp' }
    const sec1 = { id: 'sec-1-temp', name: 'ثانوي 1 مؤقت', level: 'secondary', parentId: 's-temp' }
    const sec2 = { id: 'sec-2-temp', name: 'ثانوي 2 مؤقت', level: 'secondary', parentId: 's-temp' }

    categories = expenseCategoryHelpers.addExpenseCategory(categories, main)
    categories = expenseCategoryHelpers.addExpenseCategory(categories, sub)
    categories = expenseCategoryHelpers.addExpenseCategory(categories, sec1)
    categories = expenseCategoryHelpers.addExpenseCategory(categories, sec2)

    assert.equal(expenseCategoryHelpers.hasChildren(categories, 'm-temp'), true)
    assert.equal(expenseCategoryHelpers.hasChildren(categories, 's-temp'), true)
    assert.equal(expenseCategoryHelpers.getChildren(categories, 's-temp').length, 2)

    categories = expenseCategoryHelpers.deleteExpenseCategory(categories, 'm-temp')
    assert.equal(categories.some((c) => c.id === 'm-temp'), false)
    assert.equal(categories.some((c) => c.id === 's-temp'), false)
    assert.equal(categories.some((c) => c.id === 'sec-1-temp'), false)
    assert.equal(categories.some((c) => c.id === 'sec-2-temp'), false)
  })

  test('historical transactions retain category metadata regardless of subsequent category operations', () => {
    let transactions = [
      { id: 'tx-1', amount: 500, expenseSecondaryCategoryId: 'sec-alpha' },
      { id: 'tx-2', amount: 300, expenseSecondaryCategoryId: 'sec-alpha' },
      { id: 'tx-3', amount: 800, expenseSecondaryCategoryId: 'sec-beta' },
    ]

    assert.equal(expenseCategoryHelpers.countExpensesForCategory(transactions, 'sec-alpha'), 2)
    assert.equal(expenseCategoryHelpers.countExpensesForCategory(transactions, 'sec-beta'), 1)
    assert.equal(expenseCategoryHelpers.countExpensesForCategory(transactions, 'sec-nonexistent'), 0)
    assert.equal(expenseCategoryHelpers.countExpensesForCategory(transactions, null), 0)
    assert.equal(expenseCategoryHelpers.countExpensesForCategory([], 'sec-alpha'), 0)
  })
})

describe('Milestone 4 Challenger 2 — File Invariants & Zero Comments Verification', () => {
  const root = process.cwd()

  test('tests/r2-m4-challenger-2.test.js must be <= 500 lines and have zero comments', () => {
    const filePath = path.join(root, 'tests', 'r2-m4-challenger-2.test.js')
    assert.ok(fs.existsSync(filePath))
    const code = fs.readFileSync(filePath, 'utf-8')
    const lines = code.split('\n')
    assert.ok(lines.length <= 500, `Line count is ${lines.length}, must be <= 500`)

    const commentPattern = /^\s*(\/\/|\/\*|\*)/
    const linesWithComments = lines.filter((l) => commentPattern.test(l))
    assert.equal(linesWithComments.length, 0, `File has comments: ${JSON.stringify(linesWithComments)}`)
  })

  test('all R1-R4 core and helper files must be <= 500 lines', () => {
    const files = [
      'src/store/useAXStore.js',
      'src/store/storeCacheHelper.js',
      'src/store/expenseCategoryHelpers.js',
      'src/store/transferAuditHelpers.js',
      'src/utils/dateHelpers.js',
      'src/utils/pricingCalculations.js',
      'src/components/treasury/AX_TreasuryTransactionModal.jsx',
      'src/components/invoices/AX_CreateInvoiceModal.jsx',
      'src/components/warehouses/AX_TransferFormModal.jsx',
    ]

    for (const rel of files) {
      const full = path.join(root, rel)
      assert.ok(fs.existsSync(full), `File must exist: ${rel}`)
      const content = fs.readFileSync(full, 'utf-8')
      const count = content.split('\n').length
      assert.ok(count <= 500, `${rel} has ${count} lines, which exceeds 500`)
    }
  })
})
