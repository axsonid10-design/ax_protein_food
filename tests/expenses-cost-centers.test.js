import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  EXPENSE_COST_CENTER_TYPES,
  EXPENSE_PAYMENT_STATUSES,
  getCostCenterEntities,
  generateExpenseInstallments,
  createExpenseRecord,
  settleExpenseInstallment,
  calculateExpenseKPIs,
  filterExpenses,
  getStoredExpenses,
  saveStoredExpenses,
  deleteExpenseRecord,
} from '../src/store/expenseStoreHelpers.js'
import { expenseCategoryHelpers, initialExpenseCategories } from '../src/store/expenseCategoryHelpers.js'
import {
  hasModuleAccess,
  hasModulePermission,
  getFirstAccessibleTab,
  MODULE_PERMISSIONS_CONFIG,
  PRESET_PERMISSIONS,
} from '../src/utils/permissionsConfig.js'

describe('R3 Standalone Expenses & Multi-Tier Cost Centers', () => {
  const mockWarehouses = [
    { id: 'wh-1', name: 'ثلاجة المجمدات الرئيسية (1)', type: 'cold_storage', code: 'WH-01' },
    { id: 'wh-2', name: 'مخزن اللحوم المصنعة (2)', type: 'general', code: 'WH-02' },
    { id: 'van-wh-1', name: 'فان توزيع جامبو 1', type: 'van', plateNumber: 'أ ب ج 1111', manager: 'سائق 1' },
  ]

  const mockDistributors = [
    { id: 'dist-1', name: 'مندوب توزيع 1', vanNumber: 'ط ر ق 5555', phone: '01011111111' },
  ]

  const mockTreasuries = [
    { id: 'tr-cash', name: 'الخزينة الرئيسية (كاش)', type: 'cash', balance: 50000 },
    { id: 'tr-bank', name: 'حساب البنك الأهلي', type: 'bank', balance: 100000 },
    { id: 'tr-insta', name: 'محفظة إنستاباي', type: 'wallet', balance: 20000 },
  ]

  describe('1. Multi-Tier Cost Center Hierarchy & Entity Listing', () => {
    test('dynamically filters and lists active warehouses excluding vans', () => {
      const entities = getCostCenterEntities(EXPENSE_COST_CENTER_TYPES.WAREHOUSE, {
        warehouses: mockWarehouses,
        distributors: mockDistributors,
      })
      assert.equal(entities.length, 2)
      assert.equal(entities[0].id, 'wh-1')
      assert.equal(entities[1].id, 'wh-2')
      assert.equal(entities.some((e) => e.type === 'van'), false)
    })

    test('dynamically populates distribution vehicles from warehouses and distributors', () => {
      const vehicles = getCostCenterEntities(EXPENSE_COST_CENTER_TYPES.VEHICLE, {
        warehouses: mockWarehouses,
        distributors: mockDistributors,
      })
      assert.ok(vehicles.length >= 1)
      assert.equal(vehicles[0].type, 'vehicle')
      assert.ok(vehicles[0].plateNumber || vehicles[0].name)
    })

    test('resolves fixed factory cost center entity', () => {
      const factory = getCostCenterEntities(EXPENSE_COST_CENTER_TYPES.FACTORY)
      assert.equal(factory.length, 1)
      assert.equal(factory[0].id, 'factory-main')
      assert.equal(factory[0].type, 'factory')
      assert.ok(factory[0].name.includes('المصنع'))
    })

    test('resolves fixed general management cost center entity', () => {
      const general = getCostCenterEntities(EXPENSE_COST_CENTER_TYPES.GENERAL)
      assert.equal(general.length, 1)
      assert.equal(general[0].id, 'general-hq')
      assert.equal(general[0].type, 'general')
      assert.ok(general[0].name.includes('الإدارة'))
    })
  })

  describe('2. Shared Category Hierarchy across Cost Centers', () => {
    test('main categories are shared across all entities', () => {
      const mains = expenseCategoryHelpers.getMainCategories(initialExpenseCategories)
      assert.ok(mains.length >= 4)
      const opsMain = mains.find((m) => m.id === 'exp-main-ops')
      assert.ok(opsMain)
      assert.equal(opsMain.name, 'مصاريف تشغيلية ولوجستية')
    })

    test('subcategories correctly filter by main category id', () => {
      const subs = expenseCategoryHelpers.getSubCategories(initialExpenseCategories, 'exp-main-ops')
      assert.ok(subs.length >= 3)
      assert.ok(subs.every((s) => s.parentId === 'exp-main-ops'))
    })

    test('secondary categories correctly filter by subcategory id', () => {
      const secs = expenseCategoryHelpers.getSecondaryCategories(initialExpenseCategories, 'exp-sub-trn')
      assert.ok(secs.length >= 3)
      assert.ok(secs.every((s) => s.parentId === 'exp-sub-trn'))
    })

    test('computes full hierarchy path breadcrumb correctly', () => {
      const pathInfo = expenseCategoryHelpers.getHierarchyPath(initialExpenseCategories, 'exp-sec-trn-fuel')
      assert.equal(pathInfo.main?.id, 'exp-main-ops')
      assert.equal(pathInfo.sub?.id, 'exp-sub-trn')
      assert.equal(pathInfo.secondary?.id, 'exp-sec-trn-fuel')
      assert.ok(pathInfo.label.includes('مصاريف تشغيلية ولوجستية'))
      assert.ok(pathInfo.label.includes('وقود وسولار سيارات التوزيع'))
    })
  })

  describe('3. Multi-Channel Split Payments & Treasury Debits', () => {
    test('creates immediate expense splitting payment across cash safe and bank transfer', async () => {
      let state = {
        treasuryAccounts: JSON.parse(JSON.stringify(mockTreasuries)),
        cashTransactions: [],
      }
      const setStoreState = (updater) => {
        state = typeof updater === 'function' ? updater(state) : { ...state, ...updater }
      }

      const payload = {
        totalAmount: 12500,
        costCenter: {
          entityType: 'warehouse',
          entityId: 'wh-1',
          entityName: 'ثلاجة المجمدات الرئيسية (1)',
        },
        mainCategoryId: 'exp-main-ops',
        mainCategoryName: 'مصاريف تشغيلية ولوجستية',
        subCategoryId: 'exp-sub-mnt',
        subCategoryName: 'صيانة وثلاجات وتجميد',
        title: 'صيانة ضواغط التبريد',
        payeeName: 'شركة الإيمان للتبريد',
        paymentType: 'immediate',
        payments: [
          { treasuryId: 'tr-cash', amount: 5000, method: 'cash' },
          { treasuryId: 'tr-bank', amount: 7500, method: 'bank_transfer' },
        ],
      }

      const res = await createExpenseRecord(payload, {
        storeState: state,
        setStoreState,
      })

      assert.equal(res.success, true)
      assert.equal(res.expense.paidAmount, 12500)
      assert.equal(res.expense.remainingAmount, 0)
      assert.equal(res.expense.paymentStatus, EXPENSE_PAYMENT_STATUSES.PAID)
      assert.equal(res.expense.payments.length, 2)

      const cashAcc = state.treasuryAccounts.find((t) => t.id === 'tr-cash')
      const bankAcc = state.treasuryAccounts.find((t) => t.id === 'tr-bank')
      assert.equal(cashAcc.balance, 45000)
      assert.equal(bankAcc.balance, 92500)
      assert.equal(state.cashTransactions.length, 2)
      assert.equal(state.cashTransactions[0].partyType, 'expense')
    })
  })

  describe('4. Deferred Expenses & Installment Scheduling', () => {
    test('generates installment schedules evenly dividing remaining amount', () => {
      const installments = generateExpenseInstallments(10000, 4, '2026-05-01')
      assert.equal(installments.length, 4)
      const sum = installments.reduce((acc, i) => acc + i.amount, 0)
      assert.equal(sum, 10000)
      assert.equal(installments[0].dueDate, '2026-05-01')
      assert.equal(installments[1].dueDate, '2026-06-01')
      assert.equal(installments[0].status, 'pending')
    })

    test('creates partial down-payment expense and deferred installment schedule', async () => {
      let state = {
        treasuryAccounts: JSON.parse(JSON.stringify(mockTreasuries)),
        cashTransactions: [],
      }
      const setStoreState = (updater) => {
        state = typeof updater === 'function' ? updater(state) : { ...state, ...updater }
      }

      const payload = {
        totalAmount: 30000,
        costCenter: { entityType: 'factory', entityId: 'factory-main', entityName: 'المصنع الرئيسي' },
        mainCategoryId: 'exp-main-ops',
        mainCategoryName: 'مصاريف تشغيلية',
        title: 'شراء كراتين وتغليف بالآجل',
        paymentType: 'partial',
        payments: [{ treasuryId: 'tr-cash', amount: 10000, method: 'cash' }],
        installmentCount: 2,
        firstDueDate: '2026-06-01',
      }

      const res = await createExpenseRecord(payload, { storeState: state, setStoreState })
      assert.equal(res.success, true)
      assert.equal(res.expense.paidAmount, 10000)
      assert.equal(res.expense.remainingAmount, 20000)
      assert.equal(res.expense.paymentStatus, EXPENSE_PAYMENT_STATUSES.PARTIAL)
      assert.equal(res.expense.installments.length, 2)
      assert.equal(res.expense.installments[0].amount, 10000)
      assert.equal(res.expense.installments[1].amount, 10000)

      const cashAcc = state.treasuryAccounts.find((t) => t.id === 'tr-cash')
      assert.equal(cashAcc.balance, 40000)
    })

    test('settles an individual installment, debits treasury, and updates status', async () => {
      let state = {
        treasuryAccounts: JSON.parse(JSON.stringify(mockTreasuries)),
        cashTransactions: [],
      }
      const setStoreState = (updater) => {
        state = typeof updater === 'function' ? updater(state) : { ...state, ...updater }
      }

      const payload = {
        totalAmount: 10000,
        costCenter: { entityType: 'general', entityId: 'general-hq', entityName: 'الإدارة' },
        mainCategoryId: 'exp-main-adm',
        mainCategoryName: 'مصاريف إدارية',
        title: 'إيجار مقر إداري مؤجل',
        paymentType: 'deferred',
        installmentCount: 2,
        firstDueDate: '2026-07-01',
      }

      const createRes = await createExpenseRecord(payload, { storeState: state, setStoreState })
      assert.equal(createRes.expense.paymentStatus, EXPENSE_PAYMENT_STATUSES.DEFERRED)
      assert.equal(createRes.expense.paidAmount, 0)
      assert.equal(createRes.expense.remainingAmount, 10000)

      const instId = createRes.expense.installments[0].id
      const settleRes = await settleExpenseInstallment(
        createRes.expense.id,
        instId,
        { treasuryId: 'tr-bank', method: 'bank_transfer', date: '2026-07-01' },
        { storeState: state, setStoreState }
      )

      assert.equal(settleRes.success, true)
      assert.equal(settleRes.installment.status, 'paid')
      assert.equal(settleRes.installment.treasuryId, 'tr-bank')
      assert.equal(settleRes.expense.paidAmount, 5000)
      assert.equal(settleRes.expense.remainingAmount, 5000)
      assert.equal(settleRes.expense.paymentStatus, EXPENSE_PAYMENT_STATUSES.PARTIAL)

      const bankAcc = state.treasuryAccounts.find((t) => t.id === 'tr-bank')
      assert.equal(bankAcc.balance, 95000)
    })
  })

  describe('5. Expense Categories Operations & Hierarchy Integrity', () => {
    test('adds main category cleanly with designated UUID and parentId null', () => {
      const newCat = {
        id: 'exp-main-custom-test',
        name: 'مصاريف استهلاك وتطوير',
        level: 'main',
        parentId: null,
      }
      const updated = expenseCategoryHelpers.addExpenseCategory(initialExpenseCategories, newCat)
      const found = updated.find((c) => c.id === 'exp-main-custom-test')
      assert.ok(found)
      assert.equal(found.name, 'مصاريف استهلاك وتطوير')
      assert.equal(found.level, 'main')
    })

    test('adds subcategory with designated parentId without corruption', () => {
      const newSub = {
        id: 'exp-sub-custom-test',
        name: 'تطوير البنية السحابية',
        level: 'sub',
        parentId: 'exp-main-adm',
      }
      const updated = expenseCategoryHelpers.addExpenseCategory(initialExpenseCategories, newSub)
      const found = updated.find((c) => c.id === 'exp-sub-custom-test')
      assert.ok(found)
      assert.equal(found.parentId, 'exp-main-adm')
      const subs = expenseCategoryHelpers.getSubCategories(updated, 'exp-main-adm')
      assert.ok(subs.some((s) => s.id === 'exp-sub-custom-test'))
    })

    test('deleting main category cascades cleanly removing child subs and secondaries', () => {
      const initial = expenseCategoryHelpers.getInitialExpenseCategories()
      const beforeCount = initial.length
      const updated = expenseCategoryHelpers.deleteExpenseCategory(initial, 'exp-main-ops')
      assert.ok(updated.length < beforeCount)
      assert.equal(updated.some((c) => c.id === 'exp-main-ops'), false)
      assert.equal(updated.some((c) => c.parentId === 'exp-main-ops'), false)
      assert.equal(updated.some((c) => c.parentId === 'exp-sub-trn'), false)
    })
  })

  describe('6. Expense KPIs & Filter Logic', () => {
    test('computes KPI metrics accurately', () => {
      const sample = [
        {
          id: 'e1',
          date: '2026-05-10',
          totalAmount: 1000,
          paidAmount: 1000,
          remainingAmount: 0,
          paymentStatus: 'paid',
          costCenter: { entityType: 'warehouse' },
          installments: [],
        },
        {
          id: 'e2',
          date: '2026-05-15',
          totalAmount: 5000,
          paidAmount: 2000,
          remainingAmount: 3000,
          paymentStatus: 'partial',
          costCenter: { entityType: 'vehicle' },
          installments: [{ id: 'i1', amount: 3000, status: 'pending' }],
        },
      ]

      const kpis = calculateExpenseKPIs(sample, 'all')
      assert.equal(kpis.count, 2)
      assert.equal(kpis.totalExpenses, 6000)
      assert.equal(kpis.totalPaid, 3000)
      assert.equal(kpis.totalDeferred, 3000)
      assert.equal(kpis.upcomingInstallmentsCount, 1)
      assert.equal(kpis.upcomingInstallmentsTotal, 3000)
    })

    test('filters by cost center type and payment status', () => {
      const sample = [
        { id: 'e1', costCenter: { entityType: 'warehouse' }, paymentStatus: 'paid' },
        { id: 'e2', costCenter: { entityType: 'vehicle' }, paymentStatus: 'partial' },
        { id: 'e3', costCenter: { entityType: 'warehouse' }, paymentStatus: 'deferred' },
      ]

      const whOnly = filterExpenses(sample, { costCenterType: 'warehouse' })
      assert.equal(whOnly.length, 2)

      const partialOnly = filterExpenses(sample, { paymentStatus: 'partial' })
      assert.equal(partialOnly.length, 1)
      assert.equal(partialOnly[0].id, 'e2')
    })
  })

  describe('7. Navigation Routing & Permissions Matrix', () => {
    test('verifies expenses module is declared in MODULE_PERMISSIONS_CONFIG', () => {
      const mod = MODULE_PERMISSIONS_CONFIG.find((m) => m.id === 'expenses')
      assert.ok(mod)
      assert.equal(mod.label, 'المصروفات ومراكز التكلفة')
      assert.ok(mod.options.some((o) => o.key === 'create'))
      assert.ok(mod.options.some((o) => o.key === 'manage_categories'))
      assert.ok(mod.options.some((o) => o.key === 'settle_installments'))
    })

    test('grants expenses access to accountant, admin, and master users', () => {
      const accountantUser = { role: 'accountant', email: 'acc@protein.com' }
      const adminUser = { role: 'admin', email: 'admin@protein.com' }
      const driverUser = { role: 'driver', email: 'driver@protein.com' }

      assert.equal(hasModuleAccess(accountantUser, 'expenses'), true)
      assert.equal(hasModuleAccess(adminUser, 'expenses'), true)
      assert.equal(hasModuleAccess(driverUser, 'expenses'), false)
    })

    test('includes expenses in getFirstAccessibleTab order', () => {
      const accountantUser = { role: 'accountant', permissions: { expenses: { view: true } } }
      const tab = getFirstAccessibleTab(accountantUser)
      assert.ok(typeof tab === 'string')
    })
  })
})
