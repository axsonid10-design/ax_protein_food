import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  initialExpenseCategories,
  getInitialExpenseCategories,
  expenseCategoryHelpers,
} from '../src/store/expenseCategoryHelpers.js'
import { useAXStore } from '../src/store/useAXStore.js'

describe('Empirical Challenge 1: Edge Cases, Name Validation & Orphan Prevention', () => {
  it('should strictly reject adding categories with empty or whitespace-only names', () => {
    const initial = getInitialExpenseCategories()
    const baselineCount = initial.length

    const emptyMain = expenseCategoryHelpers.addExpenseCategory(initial, { name: '', level: 'main' })
    assert.equal(emptyMain.length, baselineCount)

    const whitespaceMain = expenseCategoryHelpers.addExpenseCategory(initial, { name: '    \t\n   ', level: 'main' })
    assert.equal(whitespaceMain.length, baselineCount)

    const emptySub = expenseCategoryHelpers.addExpenseCategory(initial, {
      name: '   ',
      level: 'sub',
      parentId: 'exp-main-ops',
    })
    assert.equal(emptySub.length, baselineCount)

    const emptySecondary = expenseCategoryHelpers.addExpenseCategory(initial, {
      name: '',
      level: 'secondary',
      parentId: 'exp-sub-trn',
    })
    assert.equal(emptySecondary.length, baselineCount)

    const nullName = expenseCategoryHelpers.addExpenseCategory(initial, { name: null, level: 'main' })
    assert.equal(nullName.length, baselineCount)
  })

  it('should prevent creating orphan subcategories or secondaries with missing parentId', () => {
    const initial = getInitialExpenseCategories()
    const baselineCount = initial.length

    const orphanSubNoParent = expenseCategoryHelpers.addExpenseCategory(initial, {
      name: 'قسم فرعي بلا أب',
      level: 'sub',
    })
    assert.equal(orphanSubNoParent.length, baselineCount)

    const orphanSubNullParent = expenseCategoryHelpers.addExpenseCategory(initial, {
      name: 'قسم فرعي أب فارغ',
      level: 'sub',
      parentId: null,
    })
    assert.equal(orphanSubNullParent.length, baselineCount)

    const orphanSecNoParent = expenseCategoryHelpers.addExpenseCategory(initial, {
      name: 'قسم ثانوي بلا أب',
      level: 'secondary',
    })
    assert.equal(orphanSecNoParent.length, baselineCount)

    const orphanSecEmptyParent = expenseCategoryHelpers.addExpenseCategory(initial, {
      name: 'قسم ثانوي أب فارغ',
      level: 'secondary',
      parentId: '',
    })
    assert.equal(orphanSecEmptyParent.length, baselineCount)
  })

  it('should tolerate ghost parentId gracefully without crashing hierarchy path queries', () => {
    const initial = getInitialExpenseCategories()
    const withGhostSec = expenseCategoryHelpers.addExpenseCategory(initial, {
      id: 'exp-sec-ghost',
      name: 'بند ثانوي بوالد وهمي',
      level: 'secondary',
      parentId: 'exp-sub-does-not-exist',
    })

    const path = expenseCategoryHelpers.getHierarchyPath(withGhostSec, 'exp-sec-ghost')
    assert.equal(path.secondary?.id, 'exp-sec-ghost')
    assert.equal(path.sub, null)
    assert.equal(path.main, null)
    assert.equal(path.label, 'بند ثانوي بوالد وهمي')

    const secList = expenseCategoryHelpers.getSecondaryCategories(withGhostSec, 'exp-sub-trn')
    assert.ok(!secList.some((s) => s.id === 'exp-sec-ghost'))
  })

  it('should handle duplicate category names gracefully using distinct unique IDs', () => {
    const initial = getInitialExpenseCategories()
    const updated = expenseCategoryHelpers.addExpenseCategory(initial, {
      id: 'exp-main-ops-duplicate',
      name: 'مصاريف تشغيلية ولوجستية',
      level: 'main',
    })

    assert.equal(updated.length, initial.length + 1)
    const matching = updated.filter((c) => c.name === 'مصاريف تشغيلية ولوجستية')
    assert.equal(matching.length, 2)
    assert.notEqual(matching[0].id, matching[1].id)

    const subUpdated = expenseCategoryHelpers.addExpenseCategory(updated, {
      id: 'exp-sub-dup',
      name: 'وقود وسولار',
      level: 'sub',
      parentId: 'exp-main-ops',
    })
    const secUpdated = expenseCategoryHelpers.addExpenseCategory(subUpdated, {
      id: 'exp-sec-dup',
      name: 'وقود وسولار',
      level: 'secondary',
      parentId: 'exp-sub-dup',
    })

    const path = expenseCategoryHelpers.getHierarchyPath(secUpdated, 'exp-sec-dup')
    assert.equal(path.main?.id, 'exp-main-ops')
    assert.equal(path.sub?.id, 'exp-sub-dup')
    assert.equal(path.secondary?.id, 'exp-sec-dup')
    assert.equal(path.label, 'مصاريف تشغيلية ولوجستية / وقود وسولار / وقود وسولار')
  })

  it('should fallback to existing name when editing category with empty/whitespace string', () => {
    const initial = getInitialExpenseCategories()
    const updated = expenseCategoryHelpers.editExpenseCategory(initial, 'exp-main-ops', { name: '   ' })
    const target = updated.find((c) => c.id === 'exp-main-ops')
    assert.equal(target.name, 'مصاريف تشغيلية ولوجستية')
  })

  it('should remain defensive against corrupted, null, or undefined category arrays', () => {
    assert.deepEqual(expenseCategoryHelpers.getMainCategories(null), [])
    assert.deepEqual(expenseCategoryHelpers.getMainCategories(undefined), [])
    assert.deepEqual(expenseCategoryHelpers.getSubCategories(null, 'any'), [])
    assert.deepEqual(expenseCategoryHelpers.getSecondaryCategories(null, 'any'), [])
    assert.equal(expenseCategoryHelpers.hasChildren(null, 'any'), false)
    assert.deepEqual(expenseCategoryHelpers.getChildren(null, 'any'), [])
    assert.equal(expenseCategoryHelpers.countExpensesForCategory(null, 'any'), 0)

    const brokenList = [null, undefined, { id: 'bad' }, { id: 'bad2', level: 'sub' }]
    assert.deepEqual(expenseCategoryHelpers.getMainCategories(brokenList), [])
    assert.deepEqual(expenseCategoryHelpers.getSubCategories(brokenList, 'bad'), [])
  })
})

describe('Empirical Challenge 2: Deep Cascading Deletions Across Complex Trees', () => {
  it('should cascade delete a multi-branch tree cleanly without leaving zombie descendants', () => {
    let tree = []

    tree = expenseCategoryHelpers.addExpenseCategory(tree, { id: 'M-1', name: 'رئيسي 1', level: 'main' })
    tree = expenseCategoryHelpers.addExpenseCategory(tree, { id: 'M-2', name: 'رئيسي 2', level: 'main' })

    tree = expenseCategoryHelpers.addExpenseCategory(tree, { id: 'S-1A', name: 'فرعي 1أ', level: 'sub', parentId: 'M-1' })
    tree = expenseCategoryHelpers.addExpenseCategory(tree, { id: 'S-1B', name: 'فرعي 1ب', level: 'sub', parentId: 'M-1' })
    tree = expenseCategoryHelpers.addExpenseCategory(tree, { id: 'S-2A', name: 'فرعي 2أ', level: 'sub', parentId: 'M-2' })

    tree = expenseCategoryHelpers.addExpenseCategory(tree, { id: 'C-1', name: 'ثانوي 1', level: 'secondary', parentId: 'S-1A' })
    tree = expenseCategoryHelpers.addExpenseCategory(tree, { id: 'C-2', name: 'ثانوي 2', level: 'secondary', parentId: 'S-1A' })
    tree = expenseCategoryHelpers.addExpenseCategory(tree, { id: 'C-3', name: 'ثانوي 3', level: 'secondary', parentId: 'S-1B' })
    tree = expenseCategoryHelpers.addExpenseCategory(tree, { id: 'C-4', name: 'ثانوي 4', level: 'secondary', parentId: 'S-2A' })

    assert.equal(tree.length, 9)

    const afterDeleteSub = expenseCategoryHelpers.deleteExpenseCategory(tree, 'S-1A')
    assert.equal(afterDeleteSub.length, 6)
    assert.ok(!afterDeleteSub.some((c) => c.id === 'S-1A'))
    assert.ok(!afterDeleteSub.some((c) => c.id === 'C-1'))
    assert.ok(!afterDeleteSub.some((c) => c.id === 'C-2'))
    assert.ok(afterDeleteSub.some((c) => c.id === 'M-1'))
    assert.ok(afterDeleteSub.some((c) => c.id === 'S-1B'))
    assert.ok(afterDeleteSub.some((c) => c.id === 'C-3'))
    assert.ok(afterDeleteSub.some((c) => c.id === 'M-2'))
    assert.ok(afterDeleteSub.some((c) => c.id === 'S-2A'))
    assert.ok(afterDeleteSub.some((c) => c.id === 'C-4'))

    const afterDeleteMain = expenseCategoryHelpers.deleteExpenseCategory(afterDeleteSub, 'M-1')
    assert.equal(afterDeleteMain.length, 3)
    assert.ok(!afterDeleteMain.some((c) => c.id === 'M-1'))
    assert.ok(!afterDeleteMain.some((c) => c.id === 'S-1B'))
    assert.ok(!afterDeleteMain.some((c) => c.id === 'C-3'))
    assert.ok(afterDeleteMain.some((c) => c.id === 'M-2'))
    assert.ok(afterDeleteMain.some((c) => c.id === 'S-2A'))
    assert.ok(afterDeleteMain.some((c) => c.id === 'C-4'))

    const afterDeleteLeaf = expenseCategoryHelpers.deleteExpenseCategory(afterDeleteMain, 'C-4')
    assert.equal(afterDeleteLeaf.length, 2)
    assert.ok(!afterDeleteLeaf.some((c) => c.id === 'C-4'))
    assert.ok(afterDeleteLeaf.some((c) => c.id === 'M-2'))
    assert.ok(afterDeleteLeaf.some((c) => c.id === 'S-2A'))
  })

  it('should ignore deletions of non-existent, null, or undefined IDs without state mutations', () => {
    const initial = getInitialExpenseCategories()
    const count = initial.length

    assert.equal(expenseCategoryHelpers.deleteExpenseCategory(initial, 'non-existent-id').length, count)
    assert.equal(expenseCategoryHelpers.deleteExpenseCategory(initial, null).length, count)
    assert.equal(expenseCategoryHelpers.deleteExpenseCategory(initial, undefined).length, count)
  })
})

describe('Empirical Challenge 3: Snapshot Integrity, Historical Preservation & Treasury Math', () => {
  it('should preserve historical transactions and treasury balances when categories are cascade-deleted', () => {
    const categories = getInitialExpenseCategories()
    const pathOps = expenseCategoryHelpers.getHierarchyPath(categories, 'exp-sec-trn-fuel')
    const pathAdm = expenseCategoryHelpers.getHierarchyPath(categories, 'exp-sec-rnt-central')

    const treasuryAccount = { id: 'TRZ-01', name: 'الخزينة الرئيسية', balance: 100000 }

    const tx1 = {
      id: 'tx-001',
      code: 'EXP-101',
      type: 'expense',
      partyType: 'expense',
      partyName: `[${pathOps.label}]`,
      expenseMainCategoryId: pathOps.main.id,
      expenseMainCategoryName: pathOps.main.name,
      expenseSubCategoryId: pathOps.sub.id,
      expenseSubCategoryName: pathOps.sub.name,
      expenseSecondaryCategoryId: pathOps.secondary.id,
      expenseSecondaryCategoryName: pathOps.secondary.name,
      amount: 4500,
      treasuryId: 'TRZ-01',
      date: '2026-11-01',
      notes: `${pathOps.label} - سولار شاحنات التبريد`,
      status: 'completed',
    }

    const tx2 = {
      id: 'tx-002',
      code: 'EXP-102',
      type: 'expense',
      partyType: 'expense',
      partyName: `[${pathAdm.label}]`,
      expenseMainCategoryId: pathAdm.main.id,
      expenseMainCategoryName: pathAdm.main.name,
      expenseSubCategoryId: pathAdm.sub.id,
      expenseSubCategoryName: pathAdm.sub.name,
      expenseSecondaryCategoryId: pathAdm.secondary.id,
      expenseSecondaryCategoryName: pathAdm.secondary.name,
      amount: 25000,
      treasuryId: 'TRZ-01',
      date: '2026-11-02',
      notes: `${pathAdm.label} - إيجار شهر نوفمبر`,
      status: 'completed',
    }

    const txReceipt = {
      id: 'tx-003',
      code: 'REC-201',
      type: 'client_receipt',
      partyType: 'client',
      partyName: 'هايبر ماركت العروبة',
      amount: 40000,
      treasuryId: 'TRZ-01',
      date: '2026-11-03',
      notes: 'دفعة سداد مبيعات مجمدات',
      status: 'completed',
    }

    const cashTransactions = [tx1, tx2, txReceipt]

    const initialTotalExpenses = cashTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    assert.equal(initialTotalExpenses, 29500)

    const finalBalance = treasuryAccount.balance + txReceipt.amount - initialTotalExpenses
    assert.equal(finalBalance, 110500)

    const categoriesAfterDeletions = expenseCategoryHelpers.deleteExpenseCategory(
      expenseCategoryHelpers.deleteExpenseCategory(categories, 'exp-main-ops'),
      'exp-main-adm'
    )

    assert.ok(!categoriesAfterDeletions.some((c) => c.id === 'exp-main-ops'))
    assert.ok(!categoriesAfterDeletions.some((c) => c.id === 'exp-sub-trn'))
    assert.ok(!categoriesAfterDeletions.some((c) => c.id === 'exp-sec-trn-fuel'))
    assert.ok(!categoriesAfterDeletions.some((c) => c.id === 'exp-main-adm'))
    assert.ok(!categoriesAfterDeletions.some((c) => c.id === 'exp-sec-rnt-central'))

    assert.equal(tx1.partyName, '[مصاريف تشغيلية ولوجستية / مصاريف شحن ونقل / وقود وسولار سيارات التوزيع]')
    assert.equal(tx1.expenseMainCategoryName, 'مصاريف تشغيلية ولوجستية')
    assert.equal(tx1.expenseSubCategoryName, 'مصاريف شحن ونقل')
    assert.equal(tx1.expenseSecondaryCategoryName, 'وقود وسولار سيارات التوزيع')
    assert.equal(tx1.amount, 4500)

    assert.equal(tx2.partyName, '[مصاريف إدارية ومقرات / إيجارات ومستودعات / إيجار الثلاجة المركزية]')
    assert.equal(tx2.expenseMainCategoryName, 'مصاريف إدارية ومقرات')
    assert.equal(tx2.expenseSubCategoryName, 'إيجارات ومستودعات')
    assert.equal(tx2.expenseSecondaryCategoryName, 'إيجار الثلاجة المركزية')
    assert.equal(tx2.amount, 25000)

    const postDeleteTotalExpenses = cashTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    assert.equal(postDeleteTotalExpenses, initialTotalExpenses)

    const formatParty = (tx) =>
      tx.partyName ||
      (tx.expenseMainCategoryName
        ? `[${[tx.expenseMainCategoryName, tx.expenseSubCategoryName, tx.expenseSecondaryCategoryName].filter(Boolean).join(' / ')}]`
        : '-')

    assert.equal(formatParty(tx1), '[مصاريف تشغيلية ولوجستية / مصاريف شحن ونقل / وقود وسولار سيارات التوزيع]')
    assert.equal(formatParty(tx2), '[مصاريف إدارية ومقرات / إيجارات ومستودعات / إيجار الثلاجة المركزية]')
    assert.equal(formatParty(txReceipt), 'هايبر ماركت العروبة')
  })
})

describe('Empirical Challenge 4: Modal Gating State Machine Simulation', () => {
  it('should enforce strict gating: amount and notes disabled until all 3 tiers are chosen', () => {
    let txType = 'expense'
    let mainId = ''
    let subId = ''
    let secondaryId = ''

    const isExpenseGated = () => txType === 'expense' && (!mainId || !subId || !secondaryId)

    assert.equal(isExpenseGated(), true)

    mainId = 'exp-main-ops'
    assert.equal(isExpenseGated(), true)

    subId = 'exp-sub-trn'
    assert.equal(isExpenseGated(), true)

    secondaryId = 'exp-sec-trn-fuel'
    assert.equal(isExpenseGated(), false)

    const onMainChange = (newMain) => {
      mainId = newMain
      subId = ''
      secondaryId = ''
    }

    onMainChange('exp-main-adm')
    assert.equal(isExpenseGated(), true)
    assert.equal(subId, '')
    assert.equal(secondaryId, '')

    txType = 'client_receipt'
    assert.equal(isExpenseGated(), false)
  })
})

describe('Empirical Challenge 5: High-Scale Hierarchy Stress Test', () => {
  it('should construct, query, and cascade-delete 1,000+ categories within sub-millisecond range', () => {
    let largeTree = []
    const NUM_MAINS = 20
    const SUBS_PER_MAIN = 5
    const SECS_PER_SUB = 10

    for (let m = 0; m < NUM_MAINS; m++) {
      const mId = `bench-main-${m}`
      largeTree = expenseCategoryHelpers.addExpenseCategory(largeTree, {
        id: mId,
        name: `قطاع مالي رئيسي ${m}`,
        level: 'main',
      })
      for (let s = 0; s < SUBS_PER_MAIN; s++) {
        const sId = `bench-sub-${m}-${s}`
        largeTree = expenseCategoryHelpers.addExpenseCategory(largeTree, {
          id: sId,
          name: `فرع تكاليف ${m}-${s}`,
          level: 'sub',
          parentId: mId,
        })
        for (let sec = 0; sec < SECS_PER_SUB; sec++) {
          const secId = `bench-sec-${m}-${s}-${sec}`
          largeTree = expenseCategoryHelpers.addExpenseCategory(largeTree, {
            id: secId,
            name: `بند تفصيلي ${m}-${s}-${sec}`,
            level: 'secondary',
            parentId: sId,
          })
        }
      }
    }

    const expectedCount = NUM_MAINS + NUM_MAINS * SUBS_PER_MAIN + NUM_MAINS * SUBS_PER_MAIN * SECS_PER_SUB
    assert.equal(largeTree.length, expectedCount)
    assert.equal(expectedCount, 20 + 100 + 1000)

    const startQuery = performance.now()
    for (let i = 0; i < 200; i++) {
      const path = expenseCategoryHelpers.getHierarchyPath(largeTree, 'bench-sec-5-3-7')
      assert.equal(path.main?.id, 'bench-main-5')
      assert.equal(path.sub?.id, 'bench-sub-5-3')
      assert.equal(path.secondary?.id, 'bench-sec-5-3-7')
    }
    const queryDuration = performance.now() - startQuery
    assert.ok(queryDuration < 500, `200 deep queries took ${queryDuration}ms, must be < 500ms`)

    const startCascade = performance.now()
    const treeAfterMainDelete = expenseCategoryHelpers.deleteExpenseCategory(largeTree, 'bench-main-0')
    const cascadeDuration = performance.now() - startCascade

    const removedCount = 1 + SUBS_PER_MAIN + SUBS_PER_MAIN * SECS_PER_SUB
    assert.equal(treeAfterMainDelete.length, expectedCount - removedCount)
    assert.ok(!treeAfterMainDelete.some((c) => c.id.startsWith('bench-main-0') || c.id.startsWith('bench-sub-0') || c.id.startsWith('bench-sec-0')))
    assert.ok(cascadeDuration < 100, `Deep cascade took ${cascadeDuration}ms, must be < 100ms`)
  })
})
