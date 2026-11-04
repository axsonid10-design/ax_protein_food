import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  initialExpenseCategories,
  getInitialExpenseCategories,
  expenseCategoryHelpers,
} from '../src/store/expenseCategoryHelpers.js'
import { useAXStore } from '../src/store/useAXStore.js'

describe('Challenger 2 — Adversarial Challenge 1: Form Gating & Submission Logic', () => {
  const isGated = (txType, mainId, subId, secId) => {
    return txType === 'expense' && (!mainId || !subId || !secId)
  }

  test('should gate expense submission across all partial tier states', () => {
    assert.equal(isGated('expense', '', '', ''), true)
    assert.equal(isGated('expense', 'exp-main-ops', '', ''), true)
    assert.equal(isGated('expense', 'exp-main-ops', 'exp-sub-trn', ''), true)
    assert.equal(isGated('expense', '', 'exp-sub-trn', 'exp-sec-trn-fuel'), true)
    assert.equal(isGated('expense', 'exp-main-ops', '', 'exp-sec-trn-fuel'), true)
    assert.equal(isGated('expense', null, undefined, ''), true)
    assert.equal(isGated('expense', 'exp-main-ops', 'exp-sub-trn', 'exp-sec-trn-fuel'), false)
  })

  test('should not gate non-expense transactions regardless of category states', () => {
    assert.equal(isGated('client_receipt', '', '', ''), false)
    assert.equal(isGated('supplier_payment', '', '', ''), false)
    assert.equal(isGated('payroll', '', '', ''), false)
  })

  test('should simulate form submission blocking when gated', () => {
    let savedTx = null
    const mockOnSave = (tx) => { savedTx = tx }

    const simulateSubmit = ({ txType, mainId, subId, secId, amount, notes }) => {
      const gated = isGated(txType, mainId, subId, secId)
      if (gated) return false
      const numAmount = Number(amount)
      if (!numAmount || numAmount <= 0) return false

      const pathInfo = expenseCategoryHelpers.getHierarchyPath(getInitialExpenseCategories(), secId)
      mockOnSave({
        type: txType,
        amount: numAmount,
        notes,
        expenseMainCategoryId: pathInfo.main?.id,
        expenseSubCategoryId: pathInfo.sub?.id,
        expenseSecondaryCategoryId: pathInfo.secondary?.id,
        partyName: `[${pathInfo.label}]`,
      })
      return true
    }

    const blockedResult1 = simulateSubmit({
      txType: 'expense',
      mainId: 'exp-main-ops',
      subId: 'exp-sub-trn',
      secId: '',
      amount: '500',
      notes: 'شحن ثلاجة',
    })
    assert.equal(blockedResult1, false)
    assert.equal(savedTx, null)

    const blockedResult2 = simulateSubmit({
      txType: 'expense',
      mainId: '',
      subId: '',
      secId: '',
      amount: '500',
      notes: 'شحن ثلاجة',
    })
    assert.equal(blockedResult2, false)
    assert.equal(savedTx, null)

    const successResult = simulateSubmit({
      txType: 'expense',
      mainId: 'exp-main-ops',
      subId: 'exp-sub-trn',
      secId: 'exp-sec-trn-fuel',
      amount: '1250',
      notes: 'سولار سيارات التوزيع',
    })
    assert.equal(successResult, true)
    assert.ok(savedTx)
    assert.equal(savedTx.amount, 1250)
    assert.equal(savedTx.expenseSecondaryCategoryId, 'exp-sec-trn-fuel')
    assert.ok(savedTx.partyName.includes('وقود وسولار سيارات التوزيع'))
  })

  test('should verify AX_TreasuryTransactionModal file enforces gating invariants in source code', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/treasury/AX_TreasuryTransactionModal.jsx')
    const content = fs.readFileSync(modalPath, 'utf-8')

    assert.ok(
      content.includes("isExpenseGated = txType === 'expense' && (!expenseMainId || !expenseSubId || !expenseSecondaryId)"),
      'Must define isExpenseGated formula exactly'
    )
    assert.ok(
      content.includes('if (isExpenseGated) return'),
      'handleSubmit must abort if isExpenseGated is true'
    )
    assert.ok(
      content.includes('disabled={isExpenseGated}'),
      'Amount, notes, and submit inputs must be disabled when isExpenseGated'
    )
    assert.ok(
      content.includes('setExpenseMainId'),
      'Must manage expenseMainId state'
    )
    assert.ok(
      content.includes('setExpenseSubId'),
      'Must manage expenseSubId state'
    )
    assert.ok(
      content.includes('setExpenseSecondaryId'),
      'Must manage expenseSecondaryId state'
    )
  })
})

describe('Challenger 2 — Adversarial Challenge 2: Category Cascade Switching & State Resets', () => {
  test('should simulate hierarchy select onChange handlers and verify cascade resets', () => {
    let selectState = {
      mainId: 'exp-main-ops',
      subId: 'exp-sub-trn',
      secondaryId: 'exp-sec-trn-fuel',
    }

    const handleMainChange = (newMain) => {
      selectState = { mainId: newMain, subId: '', secondaryId: '' }
    }

    const handleSubChange = (newSub) => {
      selectState = { ...selectState, subId: newSub, secondaryId: '' }
    }

    const handleSecondaryChange = (newSec) => {
      selectState = { ...selectState, secondaryId: newSec }
    }

    assert.equal(Boolean(selectState.mainId && selectState.subId && selectState.secondaryId), true)

    handleMainChange('exp-main-adm')
    assert.equal(selectState.mainId, 'exp-main-adm')
    assert.equal(selectState.subId, '')
    assert.equal(selectState.secondaryId, '')
    assert.equal(Boolean(selectState.mainId && selectState.subId && selectState.secondaryId), false)

    handleSubChange('exp-sub-rnt')
    assert.equal(selectState.mainId, 'exp-main-adm')
    assert.equal(selectState.subId, 'exp-sub-rnt')
    assert.equal(selectState.secondaryId, '')
    assert.equal(Boolean(selectState.mainId && selectState.subId && selectState.secondaryId), false)

    handleSecondaryChange('exp-sec-rnt-central')
    assert.equal(selectState.secondaryId, 'exp-sec-rnt-central')
    assert.equal(Boolean(selectState.mainId && selectState.subId && selectState.secondaryId), true)

    handleSubChange('exp-sub-elc')
    assert.equal(selectState.subId, 'exp-sub-elc')
    assert.equal(selectState.secondaryId, '')
    assert.equal(Boolean(selectState.mainId && selectState.subId && selectState.secondaryId), false)
  })

  test('should verify child category filtering changes synchronously when parent changes', () => {
    const categories = getInitialExpenseCategories()

    const mainOpsSubs = expenseCategoryHelpers.getSubCategories(categories, 'exp-main-ops')
    assert.ok(mainOpsSubs.some((s) => s.id === 'exp-sub-trn'))
    assert.ok(mainOpsSubs.some((s) => s.id === 'exp-sub-mnt'))
    assert.ok(mainOpsSubs.some((s) => s.id === 'exp-sub-pkg'))
    assert.ok(!mainOpsSubs.some((s) => s.id === 'exp-sub-rnt'))

    const mainAdmSubs = expenseCategoryHelpers.getSubCategories(categories, 'exp-main-adm')
    assert.ok(mainAdmSubs.some((s) => s.id === 'exp-sub-rnt'))
    assert.ok(mainAdmSubs.some((s) => s.id === 'exp-sub-elc'))
    assert.ok(!mainAdmSubs.some((s) => s.id === 'exp-sub-trn'))

    const trnSecs = expenseCategoryHelpers.getSecondaryCategories(categories, 'exp-sub-trn')
    assert.ok(trnSecs.some((s) => s.id === 'exp-sec-trn-fuel'))
    assert.ok(!trnSecs.some((s) => s.id === 'exp-sec-mnt-rooms'))

    const rntSecs = expenseCategoryHelpers.getSecondaryCategories(categories, 'exp-sub-rnt')
    assert.ok(rntSecs.some((s) => s.id === 'exp-sec-rnt-central'))
    assert.ok(!rntSecs.some((s) => s.id === 'exp-sec-trn-fuel'))
  })

  test('should verify AX_ExpenseCategoryHierarchySelect file enforces reset invariants in source code', () => {
    const selectPath = path.resolve(process.cwd(), 'src/components/treasury/AX_ExpenseCategoryHierarchySelect.jsx')
    const content = fs.readFileSync(selectPath, 'utf-8')

    assert.ok(
      content.includes("onChange({ mainId: val, subId: '', secondaryId: '' })"),
      'handleMainChange must reset subId and secondaryId'
    )
    assert.ok(
      content.includes("onChange({ mainId, subId: val, secondaryId: '' })"),
      'handleSubChange must reset secondaryId'
    )
    assert.ok(
      content.includes('disabled={!mainId}'),
      'subId select must be disabled when mainId is not selected'
    )
    assert.ok(
      content.includes('disabled={!subId}'),
      'secondaryId select must be disabled when subId is not selected'
    )
  })
})

describe('Challenger 2 — Adversarial Challenge 3: Management Modal Operations (CRUD & Resets)', () => {
  test('should test rename operations at all 3 tiers with property preservation', () => {
    let list = getInitialExpenseCategories()

    list = expenseCategoryHelpers.editExpenseCategory(list, 'exp-main-ops', {
      name: 'مصاريف التشغيل واللوجستيات الكبرى',
    })
    const main = list.find((c) => c.id === 'exp-main-ops')
    assert.equal(main.name, 'مصاريف التشغيل واللوجستيات الكبرى')
    assert.equal(main.level, 'main')
    assert.equal(main.code, 'EXP-OPS')

    list = expenseCategoryHelpers.editExpenseCategory(list, 'exp-sub-trn', {
      name: 'أسطول الشحن والنقل البري',
    })
    const sub = list.find((c) => c.id === 'exp-sub-trn')
    assert.equal(sub.name, 'أسطول الشحن والنقل البري')
    assert.equal(sub.parentId, 'exp-main-ops')

    list = expenseCategoryHelpers.editExpenseCategory(list, 'exp-sec-trn-fuel', {
      name: 'سولار وبنزين سيارات التوزيع المبردة',
    })
    const sec = list.find((c) => c.id === 'exp-sec-trn-fuel')
    assert.equal(sec.name, 'سولار وبنزين سيارات التوزيع المبردة')
    assert.equal(sec.parentId, 'exp-sub-trn')

    const pathInfo = expenseCategoryHelpers.getHierarchyPath(list, 'exp-sec-trn-fuel')
    assert.equal(
      pathInfo.label,
      'مصاريف التشغيل واللوجستيات الكبرى / أسطول الشحن والنقل البري / سولار وبنزين سيارات التوزيع المبردة'
    )

    const blankAttempt = expenseCategoryHelpers.editExpenseCategory(list, 'exp-main-ops', { name: '   ' })
    assert.equal(blankAttempt.find((c) => c.id === 'exp-main-ops').name, 'مصاريف التشغيل واللوجستيات الكبرى')
  })

  test('should stress-test rapid add and delete sequences across tiers', () => {
    let list = getInitialExpenseCategories()
    const initialLen = list.length

    for (let i = 1; i <= 20; i++) {
      list = expenseCategoryHelpers.addExpenseCategory(list, {
        id: `stress-main-${i}`,
        name: `قسم رئيسي تجريبي ${i}`,
        level: 'main',
      })
      list = expenseCategoryHelpers.addExpenseCategory(list, {
        id: `stress-sub-${i}`,
        name: `قسم فرعي تجريبي ${i}`,
        level: 'sub',
        parentId: `stress-main-${i}`,
      })
      list = expenseCategoryHelpers.addExpenseCategory(list, {
        id: `stress-sec-${i}`,
        name: `قسم ثانوي تجريبي ${i}`,
        level: 'secondary',
        parentId: `stress-sub-${i}`,
      })
    }

    assert.equal(list.length, initialLen + 60)

    for (let i = 1; i <= 10; i++) {
      list = expenseCategoryHelpers.deleteExpenseCategory(list, `stress-sec-${i}`)
    }
    assert.equal(list.length, initialLen + 50)

    for (let i = 11; i <= 15; i++) {
      list = expenseCategoryHelpers.deleteExpenseCategory(list, `stress-sub-${i}`)
    }
    assert.equal(list.length, initialLen + 40)

    for (let i = 16; i <= 20; i++) {
      list = expenseCategoryHelpers.deleteExpenseCategory(list, `stress-main-${i}`)
    }
    assert.equal(list.length, initialLen + 25)

    for (let i = 1; i <= 10; i++) {
      list = expenseCategoryHelpers.deleteExpenseCategory(list, `stress-main-${i}`)
    }
    assert.equal(list.length, initialLen + 5)
  })

  test('should verify reset to defaults completely reverts modifications', () => {
    const store = useAXStore.getState()
    store.resetExpenseCategories()
    const baseline = useAXStore.getState().expenseCategories.length

    store.addExpenseCategory({ id: 'temp-main-1', name: 'بند مؤقت 1', level: 'main' })
    store.addExpenseCategory({ id: 'temp-sub-1', name: 'بند مؤقت فرعي', level: 'sub', parentId: 'temp-main-1' })
    store.editExpenseCategory('exp-main-ops', { name: 'اسم تم تدميره' })
    store.deleteExpenseCategory('exp-sub-trn')

    const modified = useAXStore.getState().expenseCategories
    assert.notEqual(modified.length, baseline)
    assert.equal(modified.find((c) => c.id === 'exp-main-ops')?.name, 'اسم تم تدميره')
    assert.equal(modified.some((c) => c.id === 'exp-sub-trn'), false)

    store.resetExpenseCategories()
    const afterReset = useAXStore.getState().expenseCategories
    assert.equal(afterReset.length, baseline)
    assert.equal(afterReset.find((c) => c.id === 'exp-main-ops')?.name, 'مصاريف تشغيلية ولوجستية')
    assert.equal(afterReset.some((c) => c.id === 'exp-sub-trn'), true)
  })

  test('should verify AX_ExpenseCategoriesModal handles selection resets on deletion in source code', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/treasury/AX_ExpenseCategoriesModal.jsx')
    const content = fs.readFileSync(modalPath, 'utf-8')

    assert.ok(
      content.includes('deleteExpenseCategory(deleteTarget.id)'),
      'Must invoke deleteExpenseCategory on confirmation'
    )
    assert.ok(
      content.includes('setSelectedMainId(remaining[0]?.id ||'),
      'Must reassign selectedMainId when deleting currently selected main category'
    )
    assert.ok(
      content.includes("setSelectedSubId('')"),
      'Must clear selectedSubId when parent main is deleted'
    )
    assert.ok(
      content.includes('resetExpenseCategories'),
      'Must provide reset to default action'
    )
  })
})

describe('Challenger 2 — Adversarial Challenge 4: Edge Cases & Malformed Inputs', () => {
  test('should handle non-existent ID or null ID in category helpers without exception', () => {
    const initial = getInitialExpenseCategories()
    assert.doesNotThrow(() => expenseCategoryHelpers.deleteExpenseCategory(initial, null))
    assert.doesNotThrow(() => expenseCategoryHelpers.deleteExpenseCategory(initial, undefined))
    assert.doesNotThrow(() => expenseCategoryHelpers.deleteExpenseCategory(initial, 'non-existent-id'))
    assert.doesNotThrow(() => expenseCategoryHelpers.editExpenseCategory(initial, null, {}))
    assert.doesNotThrow(() => expenseCategoryHelpers.editExpenseCategory(initial, 'non-existent-id', { name: 'foo' }))
    assert.doesNotThrow(() => expenseCategoryHelpers.getHierarchyPath(initial, null))
    assert.doesNotThrow(() => expenseCategoryHelpers.getHierarchyPath(initial, 'non-existent-id'))
    assert.doesNotThrow(() => expenseCategoryHelpers.hasChildren(initial, null))
    assert.doesNotThrow(() => expenseCategoryHelpers.getChildren(initial, null))
    assert.doesNotThrow(() => expenseCategoryHelpers.countExpensesForCategory(null, null))
  })

  test('should return empty path safely for corrupted or orphaned category pointers', () => {
    const corruptedCategories = [
      { id: 'sec-orphan', name: 'يتيم', level: 'secondary', parentId: 'sub-missing' },
    ]
    const pathInfo = expenseCategoryHelpers.getHierarchyPath(corruptedCategories, 'sec-orphan')
    assert.equal(pathInfo.secondary?.id, 'sec-orphan')
    assert.equal(pathInfo.sub, null)
    assert.equal(pathInfo.main, null)
    assert.equal(pathInfo.label, 'يتيم')
  })
})
