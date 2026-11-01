import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { categoryHelpers } from '../src/store/categoryHelpers.js'
import { generateUUID, isValidUUID } from '../src/utils/AX_UUID.js'

describe('Categories Multi-Level Operations & Helpers', () => {
  const baseState = {
    categories: ['أسماك', 'لحوم'],
    subCategories: {
      'أسماك': ['سمك ياباني'],
      'لحوم': ['مفروم'],
    },
    secondaryCategories: ['صغير', 'كبير'],
    items: [
      {
        id: generateUUID(),
        primaryCategory: 'أسماك',
        subCategory: 'سمك ياباني',
        secondaryCategory: 'صغير',
        compositeName: 'سمك ياباني صغير',
      },
    ],
  }

  test('should add new primary category and initialize empty subcategories list', () => {
    const next = categoryHelpers.addCategory(baseState, 'دواجن')
    assert.ok(next.categories.includes('دواجن'))
    assert.deepEqual(next.subCategories['دواجن'], [])
  })

  test('should edit primary category and cascade to items and subCategories', () => {
    const next = categoryHelpers.editCategory(baseState, 'أسماك', 'مأكولات بحرية')
    assert.ok(next.categories.includes('مأكولات بحرية'))
    assert.ok(!next.categories.includes('أسماك'))
    assert.deepEqual(next.subCategories['مأكولات بحرية'], ['سمك ياباني'])
    assert.equal(next.items[0].primaryCategory, 'مأكولات بحرية')
  })

  test('should delete primary category and clean its subcategories', () => {
    const next = categoryHelpers.deleteCategory(baseState, 'لحوم')
    assert.ok(!next.categories.includes('لحوم'))
    assert.equal(next.subCategories['لحوم'], undefined)
  })

  test('should add subcategory under specific primary category', () => {
    const next = categoryHelpers.addSubCategory(baseState, 'أسماك', 'ماكريل')
    assert.ok(next.subCategories['أسماك'].includes('ماكريل'))
    assert.ok(next.subCategories['أسماك'].includes('سمك ياباني'))
  })

  test('should edit subcategory and update composite item names', () => {
    const next = categoryHelpers.editSubCategory(baseState, 'أسماك', 'سمك ياباني', 'بلطي مجمد')
    assert.ok(next.subCategories['أسماك'].includes('بلطي مجمد'))
    assert.equal(next.items[0].subCategory, 'بلطي مجمد')
    assert.equal(next.items[0].compositeName, 'بلطي مجمد صغير')
  })

  test('should delete subcategory from primary parent', () => {
    const next = categoryHelpers.deleteSubCategory(baseState, 'أسماك', 'سمك ياباني')
    assert.ok(!next.subCategories['أسماك'].includes('سمك ياباني'))
  })

  test('should add, edit, and delete secondary categories cleanly', () => {
    const added = categoryHelpers.addSecondaryCategory(baseState, 'جامبو')
    assert.ok(added.secondaryCategories.includes('جامبو'))

    const edited = categoryHelpers.editSecondaryCategory(baseState, 'صغير', 'وسط')
    assert.ok(edited.secondaryCategories.includes('وسط'))
    assert.equal(edited.items[0].secondaryCategory, 'وسط')
    assert.equal(edited.items[0].compositeName, 'سمك ياباني وسط')

    const deleted = categoryHelpers.deleteSecondaryCategory(baseState, 'كبير')
    assert.ok(!deleted.secondaryCategories.includes('كبير'))
  })
})

describe('AX_CategorySelect & AX_AddItemModal Geometry & Invariants', () => {
  const catSelectPath = path.resolve('src/components/items/AX_CategorySelect.jsx')
  const addItemModalPath = path.resolve('src/components/items/AX_AddItemModal.jsx')
  const treasuryLedgerPath = path.resolve('src/components/treasury/AX_TreasuryLedger.jsx')
  const antiPatternsPath = path.resolve('AX_DESIGN_ANTI_PATTERNS.md')
  const rules2610Path = path.resolve('AX_RULES_2610.md')

  test('AX_CategorySelect must not contain nested <form> tags', () => {
    const content = fs.readFileSync(catSelectPath, 'utf8')
    assert.ok(!content.includes('<form'), 'AX_CategorySelect must not contain <form> tags to prevent nesting bugs')
    assert.ok(content.includes('onDeleteCategory?.(cat)'), 'Must allow deleting any category without length restriction')
  })

  test('AX_AddItemModal must provide quick warehouse add button and handle unit toggles', () => {
    const content = fs.readFileSync(addItemModalPath, 'utf8')
    const pkgPath = path.resolve('src/components/items/AX_ItemPackagingFields.jsx')
    const pkgContent = fs.existsSync(pkgPath) ? fs.readFileSync(pkgPath, 'utf8') : ''
    assert.ok(content.includes('isQuickWarehouseOpen'), 'Must support quick warehouse open state')
    assert.ok(content.includes('إضافة مخزن'), 'Must have quick add warehouse button')
    assert.ok(content.includes("unitType === 'كرتونة'") || pkgContent.includes("unitType === 'كرتونة'"), 'Average carton weight must only render for carton unit type')
    assert.ok(content.includes('Scan') || content.includes('باركود'), 'Must support barcode scanning trigger')
  })

  test('AX_TreasuryLedger must mount AX_AddTreasuryModal and use stacked snap track', () => {
    const content = fs.readFileSync(treasuryLedgerPath, 'utf8')
    assert.ok(content.includes('AX_AddTreasuryModal'), 'Must import and mount AX_AddTreasuryModal')
    assert.ok(content.includes('showAddTreasuryModal'), 'Must wire showAddTreasuryModal')
    assert.ok(content.includes('overflow-x-auto') && content.includes('snap-x'), 'Must use stacked horizontal scrolling carousel')
  })

  test('Constitution and Rules 2610 must enforce Rule 28 for version release push broadcast', () => {
    const apContent = fs.readFileSync(antiPatternsPath, 'utf8')
    const rContent = fs.readFileSync(rules2610Path, 'utf8')
    assert.ok(apContent.includes('البث التلقائي لإشعار تحديث المنظومة لكافة المستخدمين'), 'Must document Rule 28 in anti patterns')
    assert.ok(rContent.includes('البث التلقائي لإشعار تحديث المنظومة لكافة المستخدمين'), 'Must document Rule 28 in rules 2610')
  })

  test('Constitution and Rules 2610 must enforce Rule 29 (20% subagent threshold) and Rule 30 (secondary labs vault isolation)', () => {
    const apContent = fs.readFileSync(antiPatternsPath, 'utf8')
    const rContent = fs.readFileSync(rules2610Path, 'utf8')
    assert.ok(apContent.includes('عتبة التفويض التلقائي الصارمة للوكلاء الفرعيين'), 'Must document Rule 29 in anti patterns')
    assert.ok(rContent.includes('عتبة التفويض التلقائي الصارمة للوكلاء الفرعيين'), 'Must document Rule 29 in rules 2610')
    assert.ok(apContent.includes('بروتوكول عزل الأجهزة الثانوية وقفل مشاريع سوبابيز المسجلة مسبقاً'), 'Must document Rule 30 in anti patterns')
    assert.ok(rContent.includes('بروتوكول عزل الأجهزة الثانوية وقفل مشاريع سوبابيز المسجلة مسبقاً'), 'Must document Rule 30 in rules 2610')
  })

  test('Constitution and Rules 2610 must enforce Rule 11 / Anti-Pattern 31 (Operational actions push to managers)', () => {
    const apContent = fs.readFileSync(antiPatternsPath, 'utf8')
    const rContent = fs.readFileSync(rules2610Path, 'utf8')
    const itemOpsContent = fs.readFileSync(path.resolve('src/services/AX_ItemOperationsService.js'), 'utf8')
    assert.ok(apContent.includes('إشعار Web Push الفوري للمديرين عند إضافة وتعديل الأصناف'), 'Must document Item 31 in anti patterns')
    assert.ok(rContent.includes('إشعار Web Push الفوري للمديرين عند إضافة وتعديل الأصناف'), 'Must document Rule 11 in rules 2610')
    assert.ok(itemOpsContent.includes("ax-web-push") && itemOpsContent.includes("project_slug: 'protein-food'"), 'Item operations service must trigger ax-web-push with project_slug')
  })
})
