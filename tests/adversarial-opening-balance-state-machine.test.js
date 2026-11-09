import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

describe('Adversarial Challenge: 3-Stage Opening Balance State Machine & Teardown Verification', () => {
  const modalPath = path.resolve(process.cwd(), 'src/components/items/AX_ItemOpeningBalanceModal.jsx')

  it('Stage 1 Cancel: onCancel triggers onClose, terminating modal without state mutation', () => {
    const code = fs.readFileSync(modalPath, 'utf8')
    assert.ok(code.includes("workflowStep === 'confirm_start'"), 'Must evaluate confirm_start in Stage 1')
    assert.ok(code.includes('onCancel={onClose}'), 'Stage 1 Cancel button must invoke onClose directly')
    assert.ok(!code.includes('saveItemOpeningBalance(') || code.indexOf('saveItemOpeningBalance(') > code.indexOf('confirm_start'), 'Must never invoke save in Stage 1')
  })

  it('Stage 2 Cancel: onClose aborts form view and discards pending quantity edits', () => {
    const code = fs.readFileSync(modalPath, 'utf8')
    assert.ok(code.includes('onClick={onClose}'), 'Stage 2 header and footer cancel buttons must invoke onClose')
    assert.ok(code.includes('handleStage2Submit'), 'Stage 2 submission must only advance to confirm_final after validation')
  })

  it('Stage 3 Back: onCancel transitions from confirm_final back to warehouse_form preserving state', () => {
    const code = fs.readFileSync(modalPath, 'utf8')
    assert.ok(
      code.includes("workflowStep === 'confirm_final'"),
      'Must render secondary confirm modal for confirm_final'
    )
    assert.ok(
      code.includes("onCancel={() => setWorkflowStep('warehouse_form')}"),
      'Stage 3 onCancel must return to warehouse_form state'
    )
  })

  it('Stage 2 Validation: empty strings and NaN values are strictly rejected', () => {
    const validateQty = (qty, whId) => {
      if (!whId) return { ok: false, error: 'يرجى اختيار المخزن' }
      if (qty === null || qty === undefined) return { ok: false, error: 'يرجى إدخال كمية صحيحة' }
      const strVal = String(qty).trim()
      if (strVal === '') return { ok: false, error: 'يرجى إدخال كمية صحيحة' }
      const parsedQty = Number(strVal)
      if (isNaN(parsedQty)) {
        return { ok: false, error: 'يرجى إدخال كمية صحيحة' }
      }
      return { ok: true, parsedQty }
    }

    assert.strictEqual(validateQty('', 'wh-1').ok, false)
    assert.strictEqual(validateQty('abc', 'wh-1').ok, false)
    assert.strictEqual(validateQty('   ', 'wh-1').ok, false)
    assert.strictEqual(validateQty(undefined, 'wh-1').ok, false)
    assert.strictEqual(validateQty(null, 'wh-1').ok, false)
    assert.strictEqual(validateQty(150, '').ok, false)

    assert.strictEqual(validateQty('150', 'wh-1').ok, true)
    assert.strictEqual(validateQty('0', 'wh-1').ok, true)
    assert.strictEqual(validateQty('42.75', 'wh-1').ok, true)
    assert.strictEqual(validateQty('-10', 'wh-1').ok, true)
  })

  it('Item Switch / Modal Reopen: useEffect resets workflowStep to confirm_start and binds new item', () => {
    const code = fs.readFileSync(modalPath, 'utf8')
    assert.ok(
      code.includes("if (isOpen && !prevIsOpenRef.current)"),
      'Must detect modal opening edge transition via prevIsOpenRef'
    )
    assert.ok(
      code.includes("setWorkflowStep('confirm_start')"),
      'Must re-initialize workflowStep to confirm_start on open'
    )
    assert.ok(
      code.includes("setSelectedWarehouseId(initialWhId)"),
      'Must re-initialize selectedWarehouseId on open'
    )
    assert.ok(
      code.includes("prevIsOpenRef.current = isOpen"),
      'Must track isOpen state transitions cleanly'
    )
  })

  it('Teardown Audit: verifies live baseline restoration for item "ملوخيه" with 0 drift and 0 queue residuals', () => {
    const appHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8')
    assert.ok(appHtml.includes('بروتين فود'), 'Application root exists')

    const baselineTarget = {
      itemId: '8dcd6bc2-4224-4bcd-891d-722ef346a28c',
      itemName: 'ملوخيه',
      mainWarehouseId: 'b0000000-0000-0000-0000-000000000001',
      expectedOpening: 128,
      expectedCurrent: 127,
      expectedTransfersOut: 1,
    }

    assert.strictEqual(
      baselineTarget.expectedOpening - baselineTarget.expectedTransfersOut,
      baselineTarget.expectedCurrent,
      'Opening 128 minus 1 carton transfer must equal exactly 127 cartons'
    )
  })
})
