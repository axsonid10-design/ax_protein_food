import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { axToast, subscribeToToasts, getToasts } from '../src/services/axToast.js'

describe('AX_Toast Notification System Unit & Integration Tests', () => {
  beforeEach(() => {
    axToast.dismiss()
  })

  it('should trigger success toast and return generated id', () => {
    let currentToasts = []
    const unsubscribe = subscribeToToasts((t) => {
      currentToasts = t
    })

    const id = axToast.success('عملية ناجحة')
    assert.ok(id)
    assert.equal(currentToasts.length, 1)
    assert.equal(currentToasts[0].id, id)
    assert.equal(currentToasts[0].type, 'success')
    assert.equal(currentToasts[0].message, 'عملية ناجحة')

    unsubscribe()
  })

  it('should trigger error, info, and loading toasts correctly', () => {
    const errorId = axToast.error('حدث خطأ')
    const infoId = axToast.info('تنبيه هام')
    const loadingId = axToast.loading('جاري المعالجة...')

    const all = getToasts()
    assert.equal(all.length, 3)

    const loadingToast = all.find((t) => t.id === loadingId)
    assert.ok(loadingToast)
    assert.equal(loadingToast.type, 'loading')
    assert.equal(loadingToast.duration, Infinity)
  })

  it('should support updating a loading toast via { id }', () => {
    const loadingId = axToast.loading('جاري التفعيل...')
    let all = getToasts()
    let target = all.find((t) => t.id === loadingId)
    assert.equal(target.type, 'loading')
    assert.equal(target.message, 'جاري التفعيل...')

    const updatedId = axToast.success('تم التفعيل بنجاح', { id: loadingId })
    assert.equal(updatedId, loadingId)

    all = getToasts()
    target = all.find((t) => t.id === loadingId)
    assert.equal(target.type, 'success')
    assert.equal(target.message, 'تم التفعيل بنجاح')
    assert.equal(target.duration, 3500)
  })

  it('should dismiss specific toast by id and dismiss all when no id passed', () => {
    const id1 = axToast.info('توست 1')
    const id2 = axToast.info('توست 2')
    assert.equal(getToasts().length, 2)

    axToast.dismiss(id1)
    assert.equal(getToasts().length, 1)
    assert.equal(getToasts()[0].id, id2)

    axToast.dismiss()
    assert.equal(getToasts().length, 0)
  })

  it('AX_PushNotificationCard.jsx must remove fake dummy toast stub and import real axToast', () => {
    const filePath = path.resolve('src/components/notifications/AX_PushNotificationCard.jsx')
    const content = fs.readFileSync(filePath, 'utf8')

    assert.ok(!content.includes('const toast = {'), 'Must not contain any fake const toast = { stub')
    assert.ok(content.includes("from '../common/AX_Toast'"), 'Must import from AX_Toast')
  })

  it('AX_Toast.jsx and AX_ToastContainer must exist and satisfy interface requirements', () => {
    const filePath = path.resolve('src/components/common/AX_Toast.jsx')
    const content = fs.readFileSync(filePath, 'utf8')

    assert.ok(content.includes('export { axToast }') || content.includes('export const axToast'), 'Must export axToast')
    assert.ok(content.includes('AX_ToastContainer'), 'Must export AX_ToastContainer')
    assert.ok(content.includes('z-[9999]'), 'Must use z-[9999]')
    assert.ok(content.includes('pointer-events-none'), 'Wrapper must use pointer-events-none')
    assert.ok(content.includes('pointer-events-auto'), 'Toasts must use pointer-events-auto')
  })

  it('Key operations must integrate axToast for operational confirmations', () => {
    const addItemPath = path.resolve('src/components/items/AX_AddItemModal.jsx')
    const addItemContent = fs.readFileSync(addItemPath, 'utf8')
    assert.ok(addItemContent.includes('axToast.success'), 'AX_AddItemModal must call axToast.success')

    const editItemPath = path.resolve('src/components/items/AX_EditItemModal.jsx')
    const editItemContent = fs.readFileSync(editItemPath, 'utf8')
    assert.ok(editItemContent.includes('axToast.success'), 'AX_EditItemModal must call axToast.success')

    const catalogPath = path.resolve('src/components/items/AX_ItemsCatalog.jsx')
    const catalogContent = fs.readFileSync(catalogPath, 'utf8')
    assert.ok(catalogContent.includes('axToast.success'), 'AX_ItemsCatalog must call axToast.success')

    const transferPath = path.resolve('src/components/warehouses/AX_TransferInspectionModal.jsx')
    const transferContent = fs.readFileSync(transferPath, 'utf8')
    assert.ok(transferContent.includes('axToast.success'), 'AX_TransferInspectionModal must call axToast.success')

    const treasuryPath = path.resolve('src/components/treasury/AX_AddTreasuryModal.jsx')
    const treasuryContent = fs.readFileSync(treasuryPath, 'utf8')
    assert.ok(treasuryContent.includes('axToast.success'), 'AX_AddTreasuryModal must call axToast.success')

    const appPath = path.resolve('src/App.jsx')
    const appContent = fs.readFileSync(appPath, 'utf8')
    assert.ok(appContent.includes('<AX_ToastContainer />') || appContent.includes('<AX_ToastContainer/>'), 'App.jsx must mount AX_ToastContainer')
    assert.ok(appContent.includes('v1.5.') || appContent.includes('v1.6.') || appContent.includes('v1.7.') || appContent.includes('VITE_APP_VERSION'), 'App.jsx must display current version')
  })
})
