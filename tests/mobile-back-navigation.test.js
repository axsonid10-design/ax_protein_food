import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { AX_BackNavigation } from '../src/utils/AX_BackNavigation.js'
import { useAXStore } from '../src/store/useAXStore.js'

describe('Mobile Hardware Back Button & SPA Navigation Engine', () => {
  beforeEach(() => {
    AX_BackNavigation.modalStack = []
    AX_BackNavigation.isProgrammaticPop = false
    AX_BackNavigation.lastBackPressTime = 0
    useAXStore.setState({ activeTab: 'dashboard' })
  })

  it('should register modal into modalStack and unregister cleanly', () => {
    let closed = false
    const onClose = () => { closed = true }
    AX_BackNavigation.registerModal('modal-1', onClose)

    assert.strictEqual(AX_BackNavigation.modalStack.length, 1)
    assert.strictEqual(AX_BackNavigation.modalStack[0].id, 'modal-1')

    AX_BackNavigation.unregisterModal('modal-1')
    assert.strictEqual(AX_BackNavigation.modalStack.length, 0)
    assert.strictEqual(closed, false)
  })

  it('should close topmost modal when back event fires with open modals', () => {
    let closed1 = false
    let closed2 = false
    AX_BackNavigation.registerModal('m1', () => { closed1 = true })
    AX_BackNavigation.registerModal('m2', () => { closed2 = true })

    assert.strictEqual(AX_BackNavigation.modalStack.length, 2)

    AX_BackNavigation.handlePopState({ state: { tab: 'dashboard' } })

    assert.strictEqual(closed2, true, 'Topmost modal m2 must close first')
    assert.strictEqual(closed1, false, 'Modal m1 must remain open')
    assert.strictEqual(AX_BackNavigation.modalStack.length, 1)

    AX_BackNavigation.handlePopState({ state: { tab: 'dashboard' } })

    assert.strictEqual(closed1, true, 'Modal m1 must close on second back press')
    assert.strictEqual(AX_BackNavigation.modalStack.length, 0)
  })

  it('should switch activeTab when back event fires without open modals', () => {
    useAXStore.setState({ activeTab: 'invoices' })

    AX_BackNavigation.handlePopState({ state: { tab: 'items' } })

    assert.strictEqual(useAXStore.getState().activeTab, 'items')
  })

  it('should detect open modals accurately with hasOpenModal', () => {
    assert.strictEqual(AX_BackNavigation.hasOpenModal(), false)

    AX_BackNavigation.registerModal('test-modal', () => {})
    assert.strictEqual(AX_BackNavigation.hasOpenModal(), true)

    AX_BackNavigation.unregisterModal('test-modal')
    assert.strictEqual(AX_BackNavigation.hasOpenModal(), false)
  })

  it('should record lastBackPressTime when on dashboard without modals', () => {
    useAXStore.setState({ activeTab: 'dashboard' })
    const before = Date.now()

    AX_BackNavigation.handlePopState({ state: { tab: 'dashboard' } })

    assert.ok(AX_BackNavigation.lastBackPressTime >= before)
  })
})
