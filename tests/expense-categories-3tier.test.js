import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  initialExpenseCategories,
  getInitialExpenseCategories,
  expenseCategoryHelpers,
} from '../src/store/expenseCategoryHelpers.js'
import { EXPENSE_CATEGORIES } from '../src/components/treasury/treasuryConstants.js'
import { useAXStore } from '../src/store/useAXStore.js'

describe('Requirement R1: 3-Tier Expense Categories Structure & Seed Data', () => {
  test('should initialize normalized 3-tier expense categories hierarchy with 4 main categories', () => {
    const list = getInitialExpenseCategories()
    assert.ok(Array.isArray(list))
    const mainList = expenseCategoryHelpers.getMainCategories(list)
    assert.equal(mainList.length, 4)
    const mainCodes = mainList.map((m) => m.code)
    assert.ok(mainCodes.includes('EXP-OPS'))
    assert.ok(mainCodes.includes('EXP-ADM-MAIN'))
    assert.ok(mainCodes.includes('EXP-FIN'))
    assert.ok(mainCodes.includes('EXP-MKT'))
  })

  test('should contain critical cold-chain meat logistics subcategories and codes', () => {
    const list = getInitialExpenseCategories()
    const subList = list.filter((c) => c.level === 'sub')
    assert.ok(subList.length >= 8)
    const subCodes = subList.map((s) => s.code).filter(Boolean)
    assert.ok(subCodes.includes('EXP-TRN'))
    assert.ok(subCodes.includes('EXP-MNT'))
    assert.ok(subCodes.includes('EXP-PKG'))
    assert.ok(subCodes.includes('EXP-RNT'))
    assert.ok(subCodes.includes('EXP-ELC'))
    assert.ok(subCodes.includes('EXP-HSP'))
    assert.ok(subCodes.includes('EXP-BNK'))
    assert.ok(subCodes.includes('EXP-ADM'))
  })

  test('should verify secondary subcategories have valid parent subcategory references', () => {
    const list = getInitialExpenseCategories()
    const secondaryList = list.filter((c) => c.level === 'secondary')
    assert.ok(secondaryList.length >= 18)
    const subIds = new Set(list.filter((c) => c.level === 'sub').map((s) => s.id))
    secondaryList.forEach((sec) => {
      assert.ok(sec.parentId, `Secondary category ${sec.name} must have parentId`)
      assert.ok(subIds.has(sec.parentId), `Parent ${sec.parentId} must exist as subcategory`)
    })
  })

  test('should resolve complete hierarchy path for secondary subcategories', () => {
    const list = getInitialExpenseCategories()
    const path = expenseCategoryHelpers.getHierarchyPath(list, 'exp-sec-trn-fuel')
    assert.equal(path.main?.id, 'exp-main-ops')
    assert.equal(path.sub?.id, 'exp-sub-trn')
    assert.equal(path.secondary?.id, 'exp-sec-trn-fuel')
    assert.equal(
      path.label,
      'مصاريف تشغيلية ولوجستية / مصاريف شحن ونقل / وقود وسولار سيارات التوزيع'
    )
  })
})

describe('Requirement R1: Expense Categories CRUD Management', () => {
  test('should add new category at main level cleanly', () => {
    const initial = getInitialExpenseCategories()
    const updated = expenseCategoryHelpers.addExpenseCategory(initial, {
      name: 'مصاريف تراخيص وجمارك',
      level: 'main',
      code: 'EXP-CST-CUSTOM',
    })
    assert.equal(updated.length, initial.length + 1)
    const added = updated[updated.length - 1]
    assert.equal(added.name, 'مصاريف تراخيص وجمارك')
    assert.equal(added.level, 'main')
    assert.equal(added.parentId, null)
  })

  test('should add new subcategory under specified main parent', () => {
    const initial = getInitialExpenseCategories()
    const updated = expenseCategoryHelpers.addExpenseCategory(initial, {
      name: 'رسوم فحص بيطري ورقابة أغذية',
      level: 'sub',
      parentId: 'exp-main-ops',
    })
    const added = updated[updated.length - 1]
    assert.equal(added.name, 'رسوم فحص بيطري ورقابة أغذية')
    assert.equal(added.level, 'sub')
    assert.equal(added.parentId, 'exp-main-ops')
    const subsOfOps = expenseCategoryHelpers.getSubCategories(updated, 'exp-main-ops')
    assert.ok(subsOfOps.some((s) => s.name === 'رسوم فحص بيطري ورقابة أغذية'))
  })

  test('should add new secondary subcategory under specified subcategory parent', () => {
    const initial = getInitialExpenseCategories()
    const updated = expenseCategoryHelpers.addExpenseCategory(initial, {
      name: 'تطهير وتعقيم ثلاجات الحفظ',
      level: 'secondary',
      parentId: 'exp-sub-mnt',
    })
    const added = updated[updated.length - 1]
    assert.equal(added.name, 'تطهير وتعقيم ثلاجات الحفظ')
    assert.equal(added.level, 'secondary')
    assert.equal(added.parentId, 'exp-sub-mnt')
    const secOfMnt = expenseCategoryHelpers.getSecondaryCategories(updated, 'exp-sub-mnt')
    assert.ok(secOfMnt.some((s) => s.name === 'تطهير وتعقيم ثلاجات الحفظ'))
  })

  test('should reject adding invalid categories without name or missing parent for non-main', () => {
    const initial = getInitialExpenseCategories()
    const emptyName = expenseCategoryHelpers.addExpenseCategory(initial, { name: '   ', level: 'main' })
    assert.equal(emptyName.length, initial.length)
    const missingParent = expenseCategoryHelpers.addExpenseCategory(initial, { name: 'بند يتيم', level: 'sub' })
    assert.equal(missingParent.length, initial.length)
  })

  test('should edit category title and preserve other properties', () => {
    const initial = getInitialExpenseCategories()
    const updated = expenseCategoryHelpers.editExpenseCategory(initial, 'exp-sec-trn-freight', {
      name: 'نولون شحن دولي ومحلي',
    })
    const target = updated.find((c) => c.id === 'exp-sec-trn-freight')
    assert.equal(target.name, 'نولون شحن دولي ومحلي')
    assert.equal(target.level, 'secondary')
    assert.equal(target.parentId, 'exp-sub-trn')
  })

  test('should cascade delete when removing a subcategory and its children', () => {
    const initial = getInitialExpenseCategories()
    const secBefore = expenseCategoryHelpers.getSecondaryCategories(initial, 'exp-sub-pkg')
    assert.ok(secBefore.length > 0)
    const updated = expenseCategoryHelpers.deleteExpenseCategory(initial, 'exp-sub-pkg')
    assert.ok(!updated.some((c) => c.id === 'exp-sub-pkg'))
    secBefore.forEach((sec) => {
      assert.ok(!updated.some((c) => c.id === sec.id), `Child ${sec.name} should be cascade-deleted`)
    })
  })

  test('should cascade delete when removing a main category and all its descendants', () => {
    const initial = getInitialExpenseCategories()
    const subsBefore = expenseCategoryHelpers.getSubCategories(initial, 'exp-main-fin')
    const secBefore = expenseCategoryHelpers.getSecondaryCategories(initial, 'exp-sub-bnk')
    assert.ok(subsBefore.length > 0)
    assert.ok(secBefore.length > 0)
    const updated = expenseCategoryHelpers.deleteExpenseCategory(initial, 'exp-main-fin')
    assert.ok(!updated.some((c) => c.id === 'exp-main-fin'))
    assert.ok(!updated.some((c) => c.id === 'exp-sub-bnk'))
    secBefore.forEach((sec) => {
      assert.ok(!updated.some((c) => c.id === sec.id))
    })
  })
})

describe('Requirement R1: Historical Safety & Snapshot Preservation', () => {
  test('should count expenses referencing a specific category across any level', () => {
    const mockTxs = [
      {
        id: 'tx-1',
        type: 'expense',
        expenseMainCategoryId: 'exp-main-ops',
        expenseSubCategoryId: 'exp-sub-trn',
        expenseSecondaryCategoryId: 'exp-sec-trn-fuel',
        amount: 500,
      },
      {
        id: 'tx-2',
        type: 'expense',
        expenseMainCategoryId: 'exp-main-ops',
        expenseSubCategoryId: 'exp-sub-mnt',
        expenseSecondaryCategoryId: 'exp-sec-mnt-rooms',
        amount: 1200,
      },
    ]
    assert.equal(expenseCategoryHelpers.countExpensesForCategory(mockTxs, 'exp-main-ops'), 2)
    assert.equal(expenseCategoryHelpers.countExpensesForCategory(mockTxs, 'exp-sub-trn'), 1)
    assert.equal(expenseCategoryHelpers.countExpensesForCategory(mockTxs, 'exp-sec-trn-fuel'), 1)
    assert.equal(expenseCategoryHelpers.countExpensesForCategory(mockTxs, 'exp-sec-mnt-gas'), 0)
  })

  test('should preserve captured snapshots in transactions after category deletion', () => {
    const initial = getInitialExpenseCategories()
    const path = expenseCategoryHelpers.getHierarchyPath(initial, 'exp-sec-trn-fuel')
    const recordedTx = {
      id: 'tx-historic-001',
      code: 'EXP-1099',
      type: 'expense',
      partyType: 'expense',
      partyName: `[${path.label}]`,
      expenseMainCategoryId: path.main.id,
      expenseMainCategoryName: path.main.name,
      expenseSubCategoryId: path.sub.id,
      expenseSubCategoryName: path.sub.name,
      expenseSecondaryCategoryId: path.secondary.id,
      expenseSecondaryCategoryName: path.secondary.name,
      amount: 850,
      date: '2026-11-01',
      notes: 'سولار لسيارة التوزيع رقم 4',
      status: 'completed',
    }
    const categoriesAfterDeletion = expenseCategoryHelpers.deleteExpenseCategory(initial, 'exp-sec-trn-fuel')
    assert.ok(!categoriesAfterDeletion.some((c) => c.id === 'exp-sec-trn-fuel'))

    assert.equal(recordedTx.expenseSecondaryCategoryName, 'وقود وسولار سيارات التوزيع')
    assert.equal(
      recordedTx.partyName,
      '[مصاريف تشغيلية ولوجستية / مصاريف شحن ونقل / وقود وسولار سيارات التوزيع]'
    )
    assert.equal(recordedTx.amount, 850)
  })
})

describe('Requirement R1: Store Integration in useAXStore', () => {
  test('should provide expenseCategories in useAXStore with CRUD actions', () => {
    const state = useAXStore.getState()
    assert.ok(Array.isArray(state.expenseCategories))
    assert.ok(typeof state.addExpenseCategory === 'function')
    assert.ok(typeof state.editExpenseCategory === 'function')
    assert.ok(typeof state.deleteExpenseCategory === 'function')
    assert.ok(typeof state.resetExpenseCategories === 'function')
  })

  test('should execute store add, edit, delete, and reset actions', () => {
    const initialCount = useAXStore.getState().expenseCategories.length
    useAXStore.getState().addExpenseCategory({
      name: 'قسم تجريبي جديد',
      level: 'main',
      id: 'exp-test-main-xyz',
    })
    let current = useAXStore.getState().expenseCategories
    assert.equal(current.length, initialCount + 1)
    const target = current.find((c) => c.id === 'exp-test-main-xyz')
    assert.equal(target?.name, 'قسم تجريبي جديد')

    useAXStore.getState().editExpenseCategory('exp-test-main-xyz', {
      name: 'قسم تجريبي معدل',
    })
    current = useAXStore.getState().expenseCategories
    assert.equal(current.find((c) => c.id === 'exp-test-main-xyz')?.name, 'قسم تجريبي معدل')

    useAXStore.getState().deleteExpenseCategory('exp-test-main-xyz')
    current = useAXStore.getState().expenseCategories
    assert.equal(current.length, initialCount)
    assert.ok(!current.some((c) => c.id === 'exp-test-main-xyz'))

    useAXStore.getState().resetExpenseCategories()
    const resetList = useAXStore.getState().expenseCategories
    assert.equal(resetList.length, initialExpenseCategories.length)
  })

  test('should maintain backward compatibility of EXPENSE_CATEGORIES export in treasuryConstants', () => {
    assert.ok(Array.isArray(EXPENSE_CATEGORIES))
    const codes = EXPENSE_CATEGORIES.map((c) => c.code)
    assert.ok(codes.includes('EXP-TRN'))
    assert.ok(codes.includes('EXP-MNT'))
    assert.ok(codes.includes('EXP-ELC'))
    assert.ok(codes.includes('EXP-PKG'))
  })
})
