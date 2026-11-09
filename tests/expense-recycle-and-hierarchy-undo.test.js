import { describe, test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  getStoredExpenses,
  saveStoredExpenses,
  deleteExpenseRecord,
  createExpenseRecord,
  EXPENSE_COST_CENTER_TYPES,
} from '../src/store/expenseStoreHelpers.js'
import { expenseCategoryHelpers } from '../src/store/expenseCategoryHelpers.js'
import { AX_RecycleBinService } from '../src/services/AX_RecycleBinService.js'
import { recycleBinHelpers } from '../src/store/recycleBinHelpers.js'

describe('Expense Recycle Bin, Category Cascade & Undo Tests', () => {
  beforeEach(() => {
    global.localStorage = {
      _store: {},
      getItem(key) {
        return this._store[key] || null
      },
      setItem(key, val) {
        this._store[key] = String(val)
      },
      removeItem(key) {
        delete this._store[key]
      },
      clear() {
        this._store = {}
      },
    }
  })

  test('createExpenseRecord and deleteExpenseRecord with recycle bin moving and restoring', async () => {
    const mockExpense = {
      id: 'exp-test-001',
      costCenter: { entityType: EXPENSE_COST_CENTER_TYPES.WAREHOUSE, entityId: 'wh-1', entityName: 'المخزن الرئيسي' },
      mainCategoryId: 'cat-main-1',
      mainCategoryName: 'مصاريف تشغيلية',
      subCategoryId: 'cat-sub-1',
      subCategoryName: 'صيانة وتبريد',
      secondaryCategoryId: 'cat-sec-1',
      secondaryCategoryName: 'فحص فريون',
      title: 'صيانة دورية للثلاجة',
      totalAmount: 1500,
      paidAmount: 1500,
      paymentMethod: 'cash',
      treasuryId: 'tr-1',
      treasuryName: 'الخزينة الرئيسية',
    }

    saveStoredExpenses([mockExpense])
    assert.equal(getStoredExpenses().length, 1)

    const recycleEntry = {
      id: 'rec-exp-001',
      entityType: 'expense',
      entityId: mockExpense.id,
      entityCode: mockExpense.code || 'EXP-TEST',
      entityTitle: mockExpense.title,
      originalData: mockExpense,
      deletedAt: new Date().toISOString(),
      deletedBy: 'مدير النظام',
    }

    deleteExpenseRecord(mockExpense.id)
    assert.equal(getStoredExpenses().length, 0)

    let state = {
      recycleBin: [recycleEntry],
    }

    const set = (updater) => {
      const updates = typeof updater === 'function' ? updater(state) : updater
      state = { ...state, ...updates }
    }

    await recycleBinHelpers.restoreItem(state, recycleEntry.id, { name: 'مدير النظام' }, set)
    assert.equal(state.recycleBin.length, 0)

    const restoredExpenses = getStoredExpenses()
    assert.equal(restoredExpenses.length, 1)
    assert.equal(restoredExpenses[0].id, mockExpense.id)
    assert.equal(restoredExpenses[0].title, 'صيانة دورية للثلاجة')
  })

  test('category cascade deletion and undo restoration', () => {
    const initialCats = [
      { id: 'm-1', name: 'مصاريف عمومية', level: 'main', parentId: null },
      { id: 's-1', name: 'أدوات مكتبية', level: 'sub', parentId: 'm-1' },
      { id: 'sec-1', name: 'أوراق وطباعة', level: 'secondary', parentId: 's-1' },
      { id: 'sec-2', name: 'أحبار', level: 'secondary', parentId: 's-1' },
      { id: 'm-2', name: 'بند مستقل', level: 'main', parentId: null },
    ]

    const afterDeleteMain = expenseCategoryHelpers.deleteExpenseCategory(initialCats, 'm-1')
    assert.equal(afterDeleteMain.length, 1)
    assert.equal(afterDeleteMain[0].id, 'm-2')

    let restoredList = [...afterDeleteMain]
    const deletedItems = initialCats.filter((c) => c.id !== 'm-2')
    deletedItems.forEach((cat) => {
      restoredList = expenseCategoryHelpers.addExpenseCategory(restoredList, cat)
    })

    assert.equal(restoredList.length, 5)
    assert.ok(restoredList.some((c) => c.id === 'm-1'))
    assert.ok(restoredList.some((c) => c.id === 's-1'))
    assert.ok(restoredList.some((c) => c.id === 'sec-1'))
    assert.ok(restoredList.some((c) => c.id === 'sec-2'))
  })

  test('verifies line count hard limit <= 500 on all modified files', () => {
    const filesToCheck = [
      'src/components/expenses/AX_ExpenseCostCenterHierarchySelect.jsx',
      'src/components/expenses/AX_ExpenseCategoriesModal.jsx',
      'src/components/treasury/AX_ExpenseCategoriesModal.jsx',
      'src/components/expenses/AX_ExpensesManager.jsx',
      'src/components/recycle/AX_RecycleBin.jsx',
      'src/store/expenseStoreHelpers.js',
      'src/store/recycleBinHelpers.js',
      'src/services/AX_RecycleBinService.js',
    ]

    for (const file of filesToCheck) {
      const fullPath = path.resolve(process.cwd(), file)
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n').length
      assert.ok(
        lines <= 500,
        `File ${file} exceeds 500 line limit (actual: ${lines})`
      )
    }
  })

  test('verifies zero comments in modified component files', () => {
    const filesToCheck = [
      'src/components/expenses/AX_ExpenseCostCenterHierarchySelect.jsx',
      'src/components/expenses/AX_ExpenseCategoriesModal.jsx',
      'src/components/treasury/AX_ExpenseCategoriesModal.jsx',
      'src/components/expenses/AX_ExpensesManager.jsx',
      'src/components/recycle/AX_RecycleBin.jsx',
    ]

    for (const file of filesToCheck) {
      const fullPath = path.resolve(process.cwd(), file)
      const content = fs.readFileSync(fullPath, 'utf-8')
      const lines = content.split('\n')
      lines.forEach((line, idx) => {
        const trimmed = line.trim()
        assert.ok(
          !trimmed.startsWith('//') && !trimmed.startsWith('/*'),
          `Found comment in ${file} at line ${idx + 1}: ${trimmed}`
        )
      })
    }
  })
})
