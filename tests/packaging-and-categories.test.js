import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getCategoryColor, getCategoryClass } from '../src/utils/categoryColors.js'

test('Packaging & Categories Invariants', async (t) => {
  await t.test('should provide valid pastel colors for all standard primary categories', () => {
    const categories = [
      'أسماك', 'لحوم', 'مصنعات', 'مجزءات', 'خامات',
      'رنجه', 'خضروات', 'الكبده', 'منتجات صلاح وعبدالفتاح',
      'متنوعه', 'كراتين', 'أكياس', 'أطباق'
    ]
    categories.forEach((cat) => {
      const color = getCategoryColor(cat)
      assert.ok(color.bg.includes('bg-'), `Category ${cat} should have bg`)
      assert.ok(color.text.includes('text-'), `Category ${cat} should have text`)
      assert.ok(color.border.includes('border-'), `Category ${cat} should have border`)

      const cls = getCategoryClass(cat)
      assert.ok(cls.length > 10, 'Class string should be valid')
    })
  })

  await t.test('should deterministically assign pastel color for arbitrary new category', () => {
    const custom = 'منتجات بحرية مجمدة خاصة'
    const color1 = getCategoryColor(custom)
    const color2 = getCategoryColor(custom)
    assert.deepEqual(color1, color2)
  })

  await t.test('AX_NotificationCenter must use responsive viewport positioning and suppress push when subscribed', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/notifications/AX_NotificationCenter.jsx')
    const content = fs.readFileSync(filePath, 'utf-8')
    assert.ok(content.includes('fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:top-12'), 'Must be responsive to mobile viewports')
    assert.ok(content.includes('!isSubscribed && ('), 'Must suppress setup prompt when already subscribed')
  })

  await t.test('AX_CategorySelect must support allowNone prop for optional secondary category', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/items/AX_CategorySelect.jsx')
    const content = fs.readFileSync(filePath, 'utf-8')
    assert.ok(content.includes('allowNone'), 'Must accept allowNone prop')
    assert.ok(content.includes('noneLabel'), 'Must accept noneLabel prop')
  })

  await t.test('AX_ItemPackagingFields must be modular and support carton, piece, grain, and weight levels', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/items/AX_ItemPackagingFields.jsx')
    assert.ok(fs.existsSync(filePath), 'AX_ItemPackagingFields.jsx must exist')
    const content = fs.readFileSync(filePath, 'utf-8')
    assert.ok(content.includes('piecesPerCarton'), 'Must handle piecesPerCarton')
    assert.ok(content.includes('grainsPerPiece'), 'Must handle grainsPerPiece')
    assert.ok(content.includes('pieceSellPrice'), 'Must handle pieceSellPrice')
    assert.ok(content.includes('grainSellPrice'), 'Must handle grainSellPrice')
  })

  await t.test('All new and modified files must obey 500 lines hard limit', () => {
    const files = [
      'src/utils/categoryColors.js',
      'src/components/items/AX_ItemPackagingFields.jsx',
      'src/components/items/AX_AddItemModal.jsx',
      'src/components/items/AX_EditItemModal.jsx',
      'src/components/items/AX_CategorySelect.jsx',
      'src/components/items/AX_ItemsCatalog.jsx',
      'src/components/notifications/AX_NotificationCenter.jsx',
      'src/services/AX_ItemOperationsService.js',
      'src/services/AX_OperationsService.js',
      'src/services/AX_DatabaseSync.js',
      'src/App.jsx'
    ]
    files.forEach((f) => {
      const full = path.resolve(process.cwd(), f)
      if (fs.existsSync(full)) {
        const count = fs.readFileSync(full, 'utf-8').split('\n').length
        assert.ok(count <= 500, `${f} exceeded 500 lines (${count} lines)`)
      }
    })
  })
})
