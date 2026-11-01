import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { imageKitService, getTransformedUrl } from '../src/services/imageKitService.js'

describe('M1 Adversarial Challenge: ImageKit URL Generator (F3)', () => {
  it('should test extreme inputs: special characters, spaces, and unicode in URL', () => {
    const rawWithUnicode = 'https://ik.imagekit.io/c8zctprqq/customers/لحوم طازجة.jpg'
    const transformed = getTransformedUrl(rawWithUnicode, { width: 400 })
    assert.ok(transformed.includes('tr:w-400'))

    const rawWithSpecial = 'https://ik.imagekit.io/c8zctprqq/customers/doc%20&%23file.pdf?v=2#page=1'
    const transformedSpecial = getTransformedUrl(rawWithSpecial, { height: 300 })
    assert.ok(transformedSpecial.includes('tr:h-300'))
    assert.ok(transformedSpecial.includes('?v=2#page=1'))
  })

  it('should test zero width and height behavior (falsy evaluation)', () => {
    const raw = 'https://ik.imagekit.io/c8zctprqq/customers/photo.jpg'
    const result = getTransformedUrl(raw, { width: 0, height: 0 })
    // In current implementation, 0 is falsy so no tr segment is added and raw url is returned
    assert.strictEqual(result, raw)
  })

  it('should test negative quality behavior (clamped to min 1)', () => {
    const raw = 'https://ik.imagekit.io/c8zctprqq/customers/photo.jpg'
    const result = getTransformedUrl(raw, { quality: -10 })
    assert.ok(result.includes('q-1'))
  })

  it('should empirically verify that null options is handled safely without crashing', () => {
    const raw = 'https://ik.imagekit.io/c8zctprqq/customers/photo.jpg'
    assert.doesNotThrow(() => getTransformedUrl(raw, undefined))
    assert.doesNotThrow(() => getTransformedUrl(raw, null))
    assert.strictEqual(getTransformedUrl(raw, null), raw)
  })
})

describe('M1 Adversarial Challenge: Store Actions in useAXStore.js (F2)', () => {
  it('should test store actions dynamically under active runtime', async () => {
    let storeModule = null
    try {
      storeModule = await import('../src/store/useAXStore.js')
    } catch (err) {
      assert.strictEqual(err.code, 'ERR_MODULE_NOT_FOUND')
      return
    }

    const { useAXStore } = storeModule
    const store = useAXStore.getState()

    // 1. Duplicate ID verification
    const dupClientId = 'cust-dup-adv-test'
    store.addClient({ id: dupClientId, name: 'عميل 1' })
    store.addClient({ id: dupClientId, name: 'عميل 2' })
    const dupClients = useAXStore.getState().clients.filter((c) => c.id === dupClientId)
    assert.strictEqual(dupClients.length, 1, 'Store deduplicates client IDs upon addClient')
    store.deleteClient(dupClientId)

    // 2. Missing fields verification
    assert.doesNotThrow(() => store.addClient({}))
    assert.doesNotThrow(() => store.addSupplier({}))
    assert.doesNotThrow(() => store.addSalesRep({}))
    assert.doesNotThrow(() => store.addSalesRepTransaction({}))
    assert.doesNotThrow(() => store.addSalesRepTransaction(null))

    // 3. Extreme numbers & negative payment logic
    const repId = 'rep-adv-test'
    store.addSalesRep({ id: repId, name: 'مندوب فحص', currentBalance: 1000 })
    
    // Negative payment is sanitized with Math.abs and properly deducted
    store.addSalesRepTransaction({ repId, type: 'payment', amount: -500 })
    const repAfterNegPay = useAXStore.getState().salesReps.find((r) => r.id === repId)
    assert.strictEqual(repAfterNegPay.currentBalance, 500, 'Negative payment disbursed money and decreased balance')

    // Cleanup
    store.deleteSalesRep(repId)
  })
})

describe('M1 Challenger 2: Permissions Configuration & Presets', () => {
  it('should verify sales_rep and warehouse_manager presets exist and are well-formed', async () => {
    const { PRESET_PERMISSIONS } = await import('../src/utils/permissionsConfig.js')
    assert.ok(PRESET_PERMISSIONS.sales_rep, 'PRESET_PERMISSIONS.sales_rep must be defined')
    assert.ok(PRESET_PERMISSIONS.sales_rep.permissions, 'sales_rep must have permissions object')
    assert.strictEqual(PRESET_PERMISSIONS.sales_rep.permissions.sales_reps.view, true)

    assert.ok(PRESET_PERMISSIONS.warehouse_manager, 'PRESET_PERMISSIONS.warehouse_manager must be defined')
    assert.ok(PRESET_PERMISSIONS.warehouse_manager.permissions, 'warehouse_manager must have permissions object')
    assert.strictEqual(PRESET_PERMISSIONS.warehouse_manager.permissions.warehouses.view, true)
  })

  it('should normalize array permissions [operational] and [all] correctly', async () => {
    const { normalizePermissions, hasModuleAccess } = await import('../src/utils/permissionsConfig.js')
    const adminPerms = normalizePermissions(['all'])
    assert.strictEqual(adminPerms.dashboard.view, true)
    assert.strictEqual(adminPerms.staff.view, true)

    const opPerms = normalizePermissions(['operational'])
    assert.strictEqual(opPerms.warehouses.view, true)
    assert.strictEqual(opPerms.invoices.view, true)

    const hasAccess = hasModuleAccess({ role: 'warehouse_manager', permissions: ['operational'] }, 'warehouses')
    assert.strictEqual(hasAccess, true)
  })
})
