import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

describe('Milestone 1: Multi-Stage Opening Stock Modification Workflow & UI Invariants', () => {
  const modalPath = path.resolve(process.cwd(), 'src/components/items/AX_ItemOpeningBalanceModal.jsx')
  const cardModalPath = path.resolve(process.cwd(), 'src/components/warehouses/AX_ItemMovementCardModal.jsx')
  const catalogPath = path.resolve(process.cwd(), 'src/components/items/AX_ItemsCatalog.jsx')

  it('verifies AX_ItemOpeningBalanceModal implements strict 3-stage confirmation sequence', () => {
    const content = fs.readFileSync(modalPath, 'utf8')
    assert.ok(content.includes('AX_ConfirmModal'), 'Must import and use AX_ConfirmModal')
    assert.ok(content.includes("workflowStep === 'confirm_start'"), 'Must handle Stage 1 confirm_start')
    assert.ok(content.includes("workflowStep === 'confirm_final'"), 'Must handle Stage 3 confirm_final')
    assert.ok(content.includes('confirmText="نعم، متأكد"'), 'Stage 1 confirm text must be "نعم، متأكد"')
    assert.ok(content.includes('cancelText="إلغاء"'), 'Stage 1 cancel text must be "إلغاء"')
    assert.ok(content.includes('confirmText="تأكيد أخير"'), 'Stage 3 confirm text must be "تأكيد أخير"')
    assert.ok(content.includes('cancelText="تراجع"'), 'Stage 3 cancel text must be "تراجع"')
    assert.ok(content.includes('هل أنت متأكد؟'), 'Confirmation modals must ask "هل أنت متأكد؟"')
    assert.ok(content.includes('saveItemOpeningBalance'), 'Stage 4 must invoke saveItemOpeningBalance')
    assert.ok(content.includes('axToast.success'), 'Stage 4 must notify via axToast.success')
    assert.ok(content.includes('AX_SearchableSelect'), 'Stage 2 must include AX_SearchableSelect for warehouse')
    assert.ok(content.includes('AX_CompanyDatePicker'), 'Stage 2 must include AX_CompanyDatePicker for date')
    assert.ok(content.includes('type="number"'), 'Stage 2 must include number input for opening quantity')
  })

  it('verifies AX_ItemMovementCardModal updates trigger button to "تغيير رصيد أول المدة"', () => {
    const content = fs.readFileSync(cardModalPath, 'utf8')
    assert.ok(content.includes('title="تغيير رصيد أول المدة"'), 'Must have title="تغيير رصيد أول المدة"')
    assert.ok(content.includes('<span>تغيير رصيد أول المدة</span>'), 'Must have button label "تغيير رصيد أول المدة"')
    assert.ok(content.includes('aria-label="تغيير رصيد أول المدة"'), 'Must have aria-label="تغيير رصيد أول المدة"')
  })

  it('verifies AX_ItemsCatalog updates opening balance button to "تغيير رصيد أول المدة"', () => {
    const content = fs.readFileSync(catalogPath, 'utf8')
    assert.ok(content.includes('title="تغيير رصيد أول المدة"'), 'Must have title="تغيير رصيد أول المدة"')
    assert.ok(content.includes('aria-label="تغيير رصيد أول المدة"'), 'Must have aria-label="تغيير رصيد أول المدة"')
  })

  it('verifies all touched files comply with file line limit (<= 500 lines)', () => {
    const files = [modalPath, cardModalPath, catalogPath]
    files.forEach((f) => {
      const lines = fs.readFileSync(f, 'utf8').split('\n').length
      assert.ok(lines <= 500, `${path.basename(f)} has ${lines} lines, exceeding 500 lines`)
    })
  })

  it('verifies zero code comments across all touched files', () => {
    const files = [modalPath, cardModalPath, catalogPath]
    files.forEach((f) => {
      const content = fs.readFileSync(f, 'utf8')
      const hasLineComment = /\/\/.*$/.test(content)
      const hasBlockComment = /\/\*[\s\S]*?\*\//.test(content)
      assert.strictEqual(hasLineComment || hasBlockComment, false, `${path.basename(f)} contains code comments`)
    })
  })
})
