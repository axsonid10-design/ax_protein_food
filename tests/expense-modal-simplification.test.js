import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  EXPENSE_COST_CENTER_TYPES,
  createExpenseRecord,
  getCostCenterEntities,
} from '../src/store/expenseStoreHelpers.js'
import { expenseCategoryHelpers, initialExpenseCategories } from '../src/store/expenseCategoryHelpers.js'

describe('R5: Expense Registration Form Simplification', () => {
  const modalFilePath = path.resolve(process.cwd(), 'src/components/expenses/AX_CreateExpenseModal.jsx')
  const selectFilePath = path.resolve(process.cwd(), 'src/components/expenses/AX_ExpenseCostCenterHierarchySelect.jsx')
  const modalContent = fs.readFileSync(modalFilePath, 'utf-8')
  const selectContent = fs.readFileSync(selectFilePath, 'utf-8')

  describe('1. Static Invariants & Component Removals', () => {
    test('AX_ExpenseStatementAutocomplete is completely absent from AX_CreateExpenseModal', () => {
      assert.equal(modalContent.includes('AX_ExpenseStatementAutocomplete'), false)
      assert.equal(modalContent.includes('pastTransactions'), false)
    })

    test('Cost Center selection state and inputs are absent from AX_CreateExpenseModal', () => {
      assert.equal(modalContent.includes('costCenter.entityType'), false)
      assert.equal(modalContent.includes('يرجى تحديد مركز التكلفة'), false)
      assert.equal(modalContent.includes('ربط بمركز التكلفة'), false)
      assert.ok(modalContent.includes('hideCostCenter={true}'))
    })

    test('AX_ExpenseCostCenterHierarchySelect supports hideCostCenter prop', () => {
      assert.ok(selectContent.includes('hideCostCenter = false'))
      assert.ok(selectContent.includes('!hideCostCenter && ('))
    })

    test('Total Expense Amount is positioned directly above payment/settlement section', () => {
      const amountIndex = modalContent.indexOf('إجمالي قيمة المصروف (ج.م)')
      const settlementIndex = modalContent.indexOf('طريقة وتسوية السداد')
      const hierarchyIndex = modalContent.indexOf('AX_ExpenseCostCenterHierarchySelect')

      assert.ok(amountIndex > 0)
      assert.ok(settlementIndex > 0)
      assert.ok(hierarchyIndex > 0)
      assert.ok(hierarchyIndex < amountIndex)
      assert.ok(amountIndex < settlementIndex)
    })
  })

  describe('2. Hierarchical 3-Tier Classification Preservation', () => {
    test('3-tier categories (main, sub, secondary) remain functional in hierarchy helper', () => {
      const mains = expenseCategoryHelpers.getMainCategories(initialExpenseCategories)
      assert.ok(mains.length >= 3)

      const mainId = mains[0].id
      const subs = expenseCategoryHelpers.getSubCategories(initialExpenseCategories, mainId)
      assert.ok(subs.length >= 1)

      const subId = subs[0].id
      const secs = expenseCategoryHelpers.getSecondaryCategories(initialExpenseCategories, subId)
      assert.ok(Array.isArray(secs))
    })

    test('AX_ExpenseCostCenterHierarchySelect maintains all 3 pill selectors', () => {
      assert.ok(selectContent.includes('level="main"'))
      assert.ok(selectContent.includes('level="sub"'))
      assert.ok(selectContent.includes('level="secondary"'))
    })
  })

  describe('3. Backend General Default & Synthesized Title', () => {
    test('createExpenseRecord accepts General default cost center and synthesized title', async () => {
      const mockState = {
        expenses: [],
        treasuryAccounts: [{ id: 'tr-1', name: 'الخزينة', balance: 50000 }],
        cashTransactions: [],
        offlineQueue: [],
      }

      const synthesizedTitle = 'مصاريف تشغيلية ولوجستية ← صيانة وإصلاحات غرف التبريد ← صيانة سنوية'
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
        title: synthesizedTitle,
        description: synthesizedTitle,
        payeeName: 'شركة التبريد الفني',
        totalAmount: 3500,
        paymentType: 'immediate',
        payments: [{ treasuryId: 'tr-1', treasuryName: 'الخزينة', amount: 3500, method: 'cash' }],
        installments: [],
        notes: '',
      }

      let updatedStoreState = null
      const res = await createExpenseRecord(payload, {
        storeState: mockState,
        setStoreState: (updater) => {
          updatedStoreState = typeof updater === 'function' ? updater(mockState) : updater
        },
        profile: { id: 'usr-1', username: 'admin' },
      })

      assert.equal(res.success, true)
      assert.ok(res.expense)
      assert.equal(res.expense.title, synthesizedTitle)
      assert.equal(res.expense.costCenter.entityType, EXPENSE_COST_CENTER_TYPES.GENERAL)
      assert.equal(res.expense.costCenter.entityName, 'عام')
      assert.equal(res.expense.totalAmount, 3500)
    })
  })

  describe('4. File Invariants (<= 500 lines & zero comments)', () => {
    test('AX_CreateExpenseModal.jsx strictly satisfies line limit and zero comments', () => {
      const lines = modalContent.split('\n').length
      assert.ok(lines <= 500, `Modal lines (${lines}) exceeded 500`)
      assert.equal(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*/.test(modalContent), false)
    })

    test('AX_ExpenseCostCenterHierarchySelect.jsx strictly satisfies line limit and zero comments', () => {
      const lines = selectContent.split('\n').length
      assert.ok(lines <= 500, `Select lines (${lines}) exceeded 500`)
      assert.equal(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*/.test(selectContent), false)
    })
  })
})
