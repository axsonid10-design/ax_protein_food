import { describe, test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { AX_RecycleBinService } from '../src/services/AX_RecycleBinService.js'
import { recycleBinHelpers } from '../src/store/recycleBinHelpers.js'
import { getVanWarehouses } from '../src/store/vanDistributionHelpers.js'

describe('Vehicle Management, Deletion & Recycle Bin Tests', () => {
  beforeEach(() => {
    global.localStorage = {
      _store: {},
      getItem(key) {
        return this._store[key] || null
      },
      setItem(key, val) {
        this._store[key] = String(val)
      },
      removeItem(key) {
        delete this._store[key]
      },
      clear() {
        this._store = {}
      },
    }
  })

  test('deleting a vehicle and restoring it via recycleBinHelpers', async () => {
    const mockVehicle = {
      id: 'van-test-100',
      name: 'جامبو التوزيع الخاصة',
      type: 'van',
      plateNumber: 'أ ب ج 9999',
      manager: 'أحمد علي',
      driverName: 'أحمد علي',
      phone: '01012345678',
      treasuryId: 'tr-van-cash',
      status: 'active',
    }

    let state = {
      warehouses: [mockVehicle],
      recycleBin: [],
    }

    const set = (updater) => {
      const updates = typeof updater === 'function' ? updater(state) : updater
      state = { ...state, ...updates }
    }

    state.warehouses = state.warehouses.filter((w) => w.id !== mockVehicle.id)
    assert.equal(state.warehouses.length, 0)

    const recycleEntry = {
      id: 'rec-veh-100',
      entityType: 'vehicle',
      entityId: mockVehicle.id,
      entityCode: mockVehicle.plateNumber,
      entityTitle: mockVehicle.name,
      originalData: mockVehicle,
      deletedAt: new Date().toISOString(),
      deletedBy: 'مدير النظام',
    }

    state.recycleBin.push(recycleEntry)
    assert.equal(state.recycleBin.length, 1)

    await recycleBinHelpers.restoreItem(state, recycleEntry.id, { name: 'مدير النظام' }, set)
    assert.equal(state.recycleBin.length, 0)
    assert.equal(state.warehouses.length, 1)
    assert.equal(state.warehouses[0].id, mockVehicle.id)
    assert.equal(state.warehouses[0].name, 'جامبو التوزيع الخاصة')
  })

  test('AX_AddVehicleModal source contains 3 status pills and clean phone input', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/distribution/AX_AddVehicleModal.jsx')
    const content = fs.readFileSync(modalPath, 'utf-8')

    assert.ok(content.includes("setStatus('active')"), 'Must support active pill')
    assert.ok(content.includes("setStatus('maintenance')"), 'Must support maintenance pill')
    assert.ok(content.includes("setStatus('inactive')"), 'Must support inactive pill')
    assert.ok(content.includes('تعمل'), 'Must have label تعمل')
    assert.ok(content.includes('في الصيانة'), 'Must have label في الصيانة')
    assert.ok(content.includes('لا تعمل'), 'Must have label لا تعمل')
    assert.ok(!content.includes('<select'), 'Must not contain native select elements')
    assert.ok(content.includes('Phone className="w-3.5 h-3.5 text-primary"'), 'Phone icon must be in label')
    assert.ok(!content.includes('Phone className="w-3.5 h-3.5 text-on-surface-variant absolute left-3'), 'Phone icon must not be inside input')
  })

  test('AX_VanCustodySummaryCard integrates vehicle deletion button', () => {
    const cardPath = path.resolve(process.cwd(), 'src/components/distribution/AX_VanCustodySummaryCard.jsx')
    const content = fs.readFileSync(cardPath, 'utf-8')

    assert.ok(content.includes('onDeleteVehicle'), 'Card must accept onDeleteVehicle prop')
    assert.ok(content.includes('Trash2'), 'Card must render Trash2 icon for deletion')
  })

  test('AX_VanDistribution mounts AX_ConfirmModal for vehicle deletion', () => {
    const distPath = path.resolve(process.cwd(), 'src/components/distribution/AX_VanDistribution.jsx')
    const content = fs.readFileSync(distPath, 'utf-8')

    assert.ok(content.includes('AX_ConfirmModal'), 'Must mount AX_ConfirmModal')
    assert.ok(content.includes('handleConfirmDeleteVehicle'), 'Must implement handleConfirmDeleteVehicle')
    assert.ok(content.includes('deleteWarehouse'), 'Must invoke deleteWarehouse')
  })

  test('verifies line limits <= 500 on all modified files', () => {
    const files = [
      'src/components/distribution/AX_AddVehicleModal.jsx',
      'src/components/distribution/AX_VanCustodySummaryCard.jsx',
      'src/components/distribution/AX_VanDistribution.jsx',
      'src/components/recycle/AX_RecycleBin.jsx',
      'src/components/employees/AX_HoldToDeleteButton.jsx',
      'src/store/useAXStore.js',
      'src/store/recycleBinHelpers.js',
      'src/services/AX_RecycleBinService.js',
    ]

    for (const file of files) {
      const fullPath = path.resolve(process.cwd(), file)
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n').length
      assert.ok(lines <= 500, `File ${file} exceeds 500 lines (${lines})`)
    }
  })

  test('verifies zero comments in modified component files', () => {
    const files = [
      'src/components/distribution/AX_AddVehicleModal.jsx',
      'src/components/distribution/AX_VanCustodySummaryCard.jsx',
      'src/components/distribution/AX_VanDistribution.jsx',
      'src/components/recycle/AX_RecycleBin.jsx',
      'src/components/employees/AX_HoldToDeleteButton.jsx',
    ]

    for (const file of files) {
      const fullPath = path.resolve(process.cwd(), file)
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n')
      lines.forEach((line, idx) => {
        const trimmed = line.trim()
        assert.ok(!trimmed.startsWith('//') && !trimmed.startsWith('/*'), `Found comment in ${file}:${idx + 1}`)
      })
    }
  })
})
