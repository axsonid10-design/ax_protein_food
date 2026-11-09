import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  calculateDynamicRemainingStock,
  validateInvoiceItems,
  getRemainingStockBadge,
} from '../src/components/invoices/invoiceValidationHelper.js'
import {
  toLocalDateString,
  getLocalTodayStr,
  formatTime12H,
  matchesInvoiceTimeframe,
} from '../src/utils/dateHelpers.js'
import {
  EXPENSE_COST_CENTER_TYPES,
  createExpenseRecord,
} from '../src/store/expenseStoreHelpers.js'
import {
  expenseCategoryHelpers,
  initialExpenseCategories,
} from '../src/store/expenseCategoryHelpers.js'

describe('Adversarial Stress 1: Sales Invoice Row Validations (Zero/Negative/Empty/NaN & Negative Stock)', () => {
  const catalog = [
    { id: 'item-beef-1', name: 'لحم بقري مفروم ممتاز', sellPrice: 220, buyPrice: 180, unitType: 'كرتونة' },
    { id: 'item-liver-2', name: 'كبدة بتلو شرائح', sellPrice: 310, buyPrice: 260, unitType: 'كرتونة', subUnitType: 'قطعة', piecesPerCarton: 20 },
    { id: 'item-burger-3', name: 'برجر جامبو', sellPrice: 190, buyPrice: 150, unitType: 'كرتونة' },
  ]

  const invalidQuantities = [
    0,
    '0',
    '0.0',
    '',
    '   ',
    null,
    undefined,
    -1,
    '-1',
    -0.001,
    NaN,
    'NaN',
    'abc',
  ]

  invalidQuantities.forEach((qtyVal) => {
    it(`blocks submission when row quantity is invalid: ${String(qtyVal)} (${typeof qtyVal})`, () => {
      const rows = [
        { itemId: 'item-beef-1', quantity: qtyVal, price: 220 },
      ]
      const res = validateInvoiceItems(rows, catalog, { invType: 'sale' })
      assert.strictEqual(res.isValid, false)
      assert.strictEqual(res.field, 'quantity')
      assert.strictEqual(res.index, 0)
      assert.strictEqual(res.itemId, 'item-beef-1')
      assert.ok(typeof res.error === 'string')
      assert.ok(res.error.includes('الكمية غير محددة أو صفرية'))
      assert.ok(res.error.includes('لحم بقري مفروم ممتاز'))
    })
  })

  const invalidPrices = [
    0,
    '0',
    '0.00',
    '',
    '   ',
    null,
    undefined,
    -1,
    '-1',
    -50,
    NaN,
    'NaN',
    'xyz',
  ]

  invalidPrices.forEach((priceVal) => {
    it(`blocks submission when row price is invalid: ${String(priceVal)} (${typeof priceVal})`, () => {
      const rows = [
        { itemId: 'item-liver-2', quantity: 5, price: priceVal },
      ]
      const res = validateInvoiceItems(rows, catalog, { invType: 'sale' })
      assert.strictEqual(res.isValid, false)
      assert.strictEqual(res.field, 'price')
      assert.strictEqual(res.index, 0)
      assert.strictEqual(res.itemId, 'item-liver-2')
      assert.ok(typeof res.error === 'string')
      assert.ok(res.error.includes('سعر البيع غير محدد أو صفري'))
      assert.ok(res.error.includes('كبدة بتلو شرائح'))
    })
  })

  it('differentiates price error label between sales and purchases invoices', () => {
    const saleRow = [{ itemId: 'item-beef-1', quantity: 4, price: 0 }]
    const saleRes = validateInvoiceItems(saleRow, catalog, { invType: 'sale' })
    assert.strictEqual(saleRes.isValid, false)
    assert.ok(saleRes.error.includes('سعر البيع غير محدد أو صفري'))

    const purchaseRow = [{ itemId: 'item-beef-1', quantity: 4, price: 0 }]
    const purchaseRes = validateInvoiceItems(purchaseRow, catalog, { invType: 'purchase' })
    assert.strictEqual(purchaseRes.isValid, false)
    assert.ok(purchaseRes.error.includes('سعر الشراء غير محدد أو صفري'))
  })

  it('detects error on subsequent row when preceding rows are valid', () => {
    const rows = [
      { itemId: 'item-beef-1', quantity: 10, price: 220 },
      { itemId: 'item-burger-3', quantity: 15, price: 190 },
      { itemId: 'item-liver-2', quantity: 0, price: 310 },
    ]
    const res = validateInvoiceItems(rows, catalog, { invType: 'sale' })
    assert.strictEqual(res.isValid, false)
    assert.strictEqual(res.field, 'quantity')
    assert.strictEqual(res.index, 2)
    assert.strictEqual(res.itemId, 'item-liver-2')
    assert.ok(res.error.includes('كبدة بتلو شرائح'))
  })

  it('allows save to succeed when remaining stock is negative but quantity and price are valid', () => {
    const inventory = [
      { itemId: 'item-beef-1', warehouseId: 'wh-main', quantity: 5 },
      { itemId: 'item-liver-2', warehouseId: 'wh-main', quantity: 0 },
      { itemId: 'item-burger-3', warehouseId: 'wh-main', quantity: -10 },
    ]

    const oversellingRows = [
      { itemId: 'item-beef-1', quantity: 20, price: 220 },
      { itemId: 'item-liver-2', quantity: 50, price: 310 },
      { itemId: 'item-burger-3', quantity: 5, price: 190 },
    ]

    const stockBeef = calculateDynamicRemainingStock('item-beef-1', 'wh-main', inventory, oversellingRows, catalog)
    assert.strictEqual(stockBeef, -15)
    const badgeBeef = getRemainingStockBadge(stockBeef)
    assert.strictEqual(badgeBeef.isNegative, true)
    assert.strictEqual(badgeBeef.text, 'متاح: -15')

    const stockLiver = calculateDynamicRemainingStock('item-liver-2', 'wh-main', inventory, oversellingRows, catalog)
    assert.strictEqual(stockLiver, -50)
    const badgeLiver = getRemainingStockBadge(stockLiver)
    assert.strictEqual(badgeLiver.isNegative, true)
    assert.strictEqual(badgeLiver.text, 'متاح: -50')

    const stockBurger = calculateDynamicRemainingStock('item-burger-3', 'wh-main', inventory, oversellingRows, catalog)
    assert.strictEqual(stockBurger, -15)
    const badgeBurger = getRemainingStockBadge(stockBurger)
    assert.strictEqual(badgeBurger.isNegative, true)
    assert.strictEqual(badgeBurger.text, 'متاح: -15')

    const validation = validateInvoiceItems(oversellingRows, catalog, { invType: 'sale' })
    assert.strictEqual(validation.isValid, true)
    assert.strictEqual(validation.error, null)
  })

  it('verifies submission blocking and alert banner in AX_CreateInvoiceModal.jsx', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'src/components/invoices/AX_CreateInvoiceModal.jsx'), 'utf-8')
    assert.ok(code.includes('validateInvoiceItems(invForm.items'))
    assert.ok(code.includes('if (!validation.isValid)'))
    assert.ok(code.includes('axToast.error(validation.error)'))
    assert.ok(code.includes('setValidationError(validation.error)'))
    assert.ok(code.includes('role="alert"'))
  })

  it('verifies submission blocking and alert banner in AX_EditInvoiceModal.jsx', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'src/components/invoices/AX_EditInvoiceModal.jsx'), 'utf-8')
    assert.ok(code.includes('validateInvoiceItems(invForm.items'))
    assert.ok(code.includes('if (!validation.isValid)'))
    assert.ok(code.includes('axToast.error(validation.error)'))
    assert.ok(code.includes('setValidationError(validation.error)'))
    assert.ok(code.includes('role="alert"'))
  })
})

describe('Adversarial Stress 2: Date Range Filters & Strict "Today" Scope', () => {
  const todayStr = getLocalTodayStr()
  const todayDate = new Date()
  const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayStr = toLocalDateString(yesterdayDate)
  const lastMonthDate = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 15)
  const lastMonthStr = toLocalDateString(lastMonthDate)
  const lastYearDate = new Date(todayDate.getFullYear() - 1, 5, 20)
  const lastYearStr = toLocalDateString(lastYearDate)

  it('strictly returns records created today under "today" filter and excludes all past records', () => {
    const invToday = {
      id: 'inv-today-1',
      date: todayStr,
      createdAt: new Date().toISOString(),
    }
    const invYesterday = {
      id: 'inv-yesterday-1',
      date: yesterdayStr,
      createdAt: yesterdayDate.toISOString(),
    }
    const invLastMonth = {
      id: 'inv-last-month-1',
      date: lastMonthStr,
      createdAt: lastMonthDate.toISOString(),
    }
    const invLastYear = {
      id: 'inv-last-year-1',
      date: lastYearStr,
      createdAt: lastYearDate.toISOString(),
    }

    assert.strictEqual(matchesInvoiceTimeframe(invToday, { timeframe: 'today' }), true)
    assert.strictEqual(matchesInvoiceTimeframe(invToday, { timeframe: 'day' }), true)
    assert.strictEqual(matchesInvoiceTimeframe(invYesterday, { timeframe: 'today' }), false)
    assert.strictEqual(matchesInvoiceTimeframe(invYesterday, { timeframe: 'day' }), false)
    assert.strictEqual(matchesInvoiceTimeframe(invLastMonth, { timeframe: 'today' }), false)
    assert.strictEqual(matchesInvoiceTimeframe(invLastMonth, { timeframe: 'day' }), false)
    assert.strictEqual(matchesInvoiceTimeframe(invLastYear, { timeframe: 'today' }), false)
    assert.strictEqual(matchesInvoiceTimeframe(invLastYear, { timeframe: 'day' }), false)
  })

  it('correctly handles time-of-day variations on today without UTC day drift', () => {
    const parts = todayStr.split('-').map(Number)
    const earlyMorning = new Date(parts[0], parts[1] - 1, parts[2], 0, 5, 0)
    const midday = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
    const lateNight = new Date(parts[0], parts[1] - 1, parts[2], 23, 55, 0)

    assert.strictEqual(matchesInvoiceTimeframe({ id: 'em', date: todayStr, createdAt: earlyMorning.toISOString() }, { timeframe: 'today' }), true)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'md', date: todayStr, createdAt: midday.toISOString() }, { timeframe: 'today' }), true)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'ln', date: todayStr, createdAt: lateNight.toISOString() }, { timeframe: 'today' }), true)
  })

  it('correctly handles legacy invoices without createdAt relying solely on date', () => {
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'leg-1', date: todayStr }, { timeframe: 'today' }), true)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'leg-2', date: yesterdayStr }, { timeframe: 'today' }), false)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'leg-3', date: '2020-01-01' }, { timeframe: 'today' }), false)
  })

  it('custom range: accurately respects inclusive boundaries', () => {
    const range = { timeframe: 'custom', customStart: '2026-11-10', customEnd: '2026-11-15' }
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'b1', date: '2026-11-10' }, range), true)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'b2', date: '2026-11-12' }, range), true)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'b3', date: '2026-11-15' }, range), true)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'b4', date: '2026-11-09' }, range), false)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'b5', date: '2026-11-16' }, range), false)
  })

  it('custom range: inverted range (start > end) strictly returns false for all records', () => {
    const inverted = { timeframe: 'custom', customStart: '2026-11-20', customEnd: '2026-11-10' }
    const sampleDates = ['2026-11-05', '2026-11-10', '2026-11-15', '2026-11-20', '2026-11-25']
    for (const d of sampleDates) {
      assert.strictEqual(matchesInvoiceTimeframe({ id: `inv-${d}`, date: d }, inverted), false)
    }
  })

  it('custom range: single-day range matches only that specific date', () => {
    const single = { timeframe: 'custom', customStart: '2026-11-12', customEnd: '2026-11-12' }
    assert.strictEqual(matchesInvoiceTimeframe({ id: 's1', date: '2026-11-12' }, single), true)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 's2', date: '2026-11-11' }, single), false)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 's3', date: '2026-11-13' }, single), false)
  })

  it('custom range: open-ended start and open-ended end', () => {
    const openEnd = { timeframe: 'custom', customStart: '2026-11-10', customEnd: '' }
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'oe1', date: '2026-11-09' }, openEnd), false)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'oe2', date: '2026-11-10' }, openEnd), true)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'oe3', date: '2026-12-01' }, openEnd), true)

    const openStart = { timeframe: 'custom', customStart: '', customEnd: '2026-11-10' }
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'os1', date: '2026-11-01' }, openStart), true)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'os2', date: '2026-11-10' }, openStart), true)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'os3', date: '2026-11-11' }, openStart), false)

    const bothOpen = { timeframe: 'custom', customStart: '', customEnd: '' }
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'bo1', date: '2026-05-01' }, bothOpen), true)
  })

  it('supports positional arguments and gracefully rejects null/invalid inputs', () => {
    assert.strictEqual(matchesInvoiceTimeframe(null, 'today'), false)
    assert.strictEqual(matchesInvoiceTimeframe(undefined, 'today'), false)
    assert.strictEqual(matchesInvoiceTimeframe({}, 'today'), false)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'p1', date: todayStr }, 'today'), true)
    assert.strictEqual(matchesInvoiceTimeframe({ id: 'p2', date: '2026-11-08' }, 'custom', '', '2026-11-01', '2026-11-10'), true)
  })
})

describe('Adversarial Stress 3: Expense Registration Modal Simplification & Store Integration', () => {
  const modalPath = path.resolve(process.cwd(), 'src/components/expenses/AX_CreateExpenseModal.jsx')
  const selectPath = path.resolve(process.cwd(), 'src/components/expenses/AX_ExpenseCostCenterHierarchySelect.jsx')
  const modalCode = fs.readFileSync(modalPath, 'utf-8')
  const selectCode = fs.readFileSync(selectPath, 'utf-8')

  it('verifies complete absence of Cost Center DOM selector elements in AX_CreateExpenseModal', () => {
    assert.strictEqual(modalCode.includes('AX_ExpenseStatementAutocomplete'), false)
    assert.strictEqual(modalCode.includes('يرجى تحديد مركز التكلفة'), false)
    assert.strictEqual(modalCode.includes('ربط بمركز التكلفة'), false)
    assert.strictEqual(modalCode.includes('costCenter.entityType'), false)
    assert.ok(modalCode.includes('hideCostCenter={true}'))
  })

  it('verifies complete absence of Description / Statement input elements in AX_CreateExpenseModal', () => {
    assert.strictEqual(modalCode.includes('بيان المصروف'), false)
    assert.strictEqual(modalCode.includes('وصف المصروف'), false)
    assert.strictEqual(modalCode.includes('statementOfExpense'), false)
    assert.strictEqual(modalCode.includes('statementAutocomplete'), false)
  })

  it('verifies AX_ExpenseCostCenterHierarchySelect hides cost center section when hideCostCenter is true', () => {
    assert.ok(selectCode.includes('hideCostCenter = false'))
    assert.ok(selectCode.includes('!hideCostCenter && ('))
    assert.ok(selectCode.includes('currentEntityType === EXPENSE_COST_CENTER_TYPES.WAREHOUSE'))
  })

  it('verifies 3-tier hierarchy selectors (main, sub, secondary) are present and functional', () => {
    assert.ok(selectCode.includes('level="main"'))
    assert.ok(selectCode.includes('level="sub"'))
    assert.ok(selectCode.includes('level="secondary"'))

    const mainCats = expenseCategoryHelpers.getMainCategories(initialExpenseCategories)
    assert.ok(Array.isArray(mainCats) && mainCats.length >= 3)
    const firstMain = mainCats[0]
    const subCats = expenseCategoryHelpers.getSubCategories(initialExpenseCategories, firstMain.id)
    assert.ok(Array.isArray(subCats) && subCats.length >= 1)
    const firstSub = subCats[0]
    const secCats = expenseCategoryHelpers.getSecondaryCategories(initialExpenseCategories, firstSub.id)
    assert.ok(Array.isArray(secCats))
  })

  it('verifies Total Expense Amount is positioned directly above the settlement section in DOM structure', () => {
    const hierarchyIdx = modalCode.indexOf('<AX_ExpenseCostCenterHierarchySelect')
    const totalAmountIdx = modalCode.indexOf('إجمالي قيمة المصروف (ج.م)')
    const settlementIdx = modalCode.indexOf('طريقة وتسوية السداد')

    assert.ok(hierarchyIdx > 0, 'Hierarchy selector must exist in modal')
    assert.ok(totalAmountIdx > 0, 'Total expense amount must exist in modal')
    assert.ok(settlementIdx > 0, 'Settlement section must exist in modal')

    assert.ok(
      hierarchyIdx < totalAmountIdx,
      'Hierarchy selector must precede Total Expense Amount'
    )
    assert.ok(
      totalAmountIdx < settlementIdx,
      'Total Expense Amount must be positioned directly above the settlement section'
    )
  })

  it('verifies store integration: saves expense with default General cost center and synthesized title', async () => {
    const mockStore = {
      expenses: [],
      treasuryAccounts: [{ id: 'tr-test-1', name: 'الخزينة الرئيسية', balance: 100000 }],
      cashTransactions: [],
      offlineQueue: [],
    }

    const synthesized = 'مصاريف تشغيلية ولوجستية ← صيانة وإصلاحات غرف التبريد ← صيانة سنوية'
    const payload = {
      date: '2026-11-09',
      costCenter: {
        entityType: EXPENSE_COST_CENTER_TYPES.GENERAL,
        entityId: null,
        entityName: 'عام',
      },
      mainCategoryId: 'exp-main-ops',
      mainCategoryName: 'مصاريف تشغيلية ولوجستية',
      subCategoryId: 'exp-sub-ref',
      subCategoryName: 'صيانة وإصلاحات غرف التبريد',
      secondaryCategoryId: 'exp-sec-ref-annual',
      secondaryCategoryName: 'صيانة سنوية',
      title: synthesized,
      description: synthesized,
      payeeName: 'الشركة الهندسية للتبريد',
      totalAmount: 4800,
      paymentType: 'immediate',
      payments: [
        { treasuryId: 'tr-test-1', treasuryName: 'الخزينة الرئيسية', amount: 4800, method: 'cash' },
      ],
      installments: [],
      notes: 'تمت الصيانة بنجاح',
    }

    let updatedStore = null
    const res = await createExpenseRecord(payload, {
      storeState: mockStore,
      setStoreState: (updater) => {
        updatedStore = typeof updater === 'function' ? updater(mockStore) : updater
      },
      profile: { id: 'usr-ch-2', username: 'challenger2' },
    })

    assert.strictEqual(res.success, true)
    assert.ok(res.expense)
    assert.strictEqual(res.expense.title, synthesized)
    assert.strictEqual(res.expense.description, synthesized)
    assert.strictEqual(res.expense.costCenter.entityType, EXPENSE_COST_CENTER_TYPES.GENERAL)
    assert.strictEqual(res.expense.costCenter.entityName, 'عام')
    assert.strictEqual(res.expense.totalAmount, 4800)
    assert.strictEqual(res.expense.paidAmount, 4800)
    assert.strictEqual(res.expense.remainingAmount, 0)
    assert.strictEqual(res.expense.paymentStatus, 'paid')

    if (updatedStore) {
      const treasury = updatedStore.treasuryAccounts.find((t) => t.id === 'tr-test-1')
      assert.strictEqual(treasury.balance, 100000 - 4800)
    }
  })
})

describe('Adversarial Stress 4: Constitutional Invariants & Code Hygiene', () => {
  const auditedFiles = [
    'src/components/invoices/invoiceValidationHelper.js',
    'src/components/invoices/AX_CreateInvoiceModal.jsx',
    'src/components/invoices/AX_EditInvoiceModal.jsx',
    'src/utils/dateHelpers.js',
    'src/components/expenses/AX_CreateExpenseModal.jsx',
    'src/components/expenses/AX_ExpenseCostCenterHierarchySelect.jsx',
    'tests/r6-m4-challenger-2-workflow-validation.test.js',
  ]

  auditedFiles.forEach((rel) => {
    it(`verifies line count does not exceed 500 lines: ${rel}`, () => {
      const fullPath = path.resolve(process.cwd(), rel)
      assert.ok(fs.existsSync(fullPath), `File ${rel} must exist`)
      const content = fs.readFileSync(fullPath, 'utf-8')
      const lines = content.split('\n').length
      assert.ok(
        lines <= 500,
        `File ${rel} has ${lines} lines, exceeding the 500-line hard limit!`
      )
    })

    it(`verifies zero code comments: ${rel}`, () => {
      const fullPath = path.resolve(process.cwd(), rel)
      const content = fs.readFileSync(fullPath, 'utf-8')
      const slash = String.fromCharCode(47)
      const doubleSlash = slash + slash
      const slashStar = slash + String.fromCharCode(42)
      const lines = content.split('\n')
      lines.forEach((line, idx) => {
        const trimmed = line.trim()
        const isComment =
          trimmed.startsWith(doubleSlash) ||
          trimmed.startsWith(slashStar) ||
          (trimmed.includes(doubleSlash) && !trimmed.includes(':' + doubleSlash))
        assert.strictEqual(
          isComment,
          false,
          `File ${rel} contains prohibited comment at line ${idx + 1}: ${trimmed}`
        )
      })
    })
  })
})
