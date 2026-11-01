import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  PRESET_PERMISSIONS,
  hasModuleAccess,
  hasModulePermission,
  getFirstAccessibleTab,
  isMasterUser,
  normalizePermissions,
} from '../src/utils/permissionsConfig.js'

describe('Challenger 2 Verification: Sales Rep RBAC & Permission Matrix', () => {
  const adminUser = { id: 'u-admin', role: 'admin', permissions: PRESET_PERMISSIONS.admin.permissions }
  const accountantUser = { id: 'u-acc', role: 'accountant', permissions: PRESET_PERMISSIONS.accountant.permissions }
  const salesRepUser = { id: 'u-rep', role: 'sales_rep', permissions: PRESET_PERMISSIONS.sales_rep.permissions }
  const cashierUser = { id: 'u-cash', role: 'cashier', permissions: PRESET_PERMISSIONS.cashier.permissions }
  const warehouseUser = { id: 'u-wh', role: 'warehouse', permissions: PRESET_PERMISSIONS.warehouse.permissions }
  const whMgrUser = { id: 'u-whm', role: 'warehouse_manager', permissions: PRESET_PERMISSIONS.warehouse_manager.permissions }
  const cuttingUser = { id: 'u-cut', role: 'cutting_supervisor', permissions: PRESET_PERMISSIONS.cutting_supervisor.permissions }
  const vanUser = { id: 'u-van', role: 'van_driver', permissions: PRESET_PERMISSIONS.van_driver.permissions }
  const masterUser = { id: 'u-mst', role: 'super_admin', email: 'abdalshafy@axsonid.com', is_master: true }

  it('should grant admin full access and all action permissions on sales_reps', () => {
    assert.strictEqual(hasModuleAccess(adminUser, 'sales_reps'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'sales_reps', 'view'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'sales_reps', 'create'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'sales_reps', 'edit'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'sales_reps', 'delete'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'sales_reps', 'manage_commissions'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'sales_reps', 'view_ledger'), true)
  })

  it('should grant accountant access to manage sales reps but deny deletion', () => {
    assert.strictEqual(hasModuleAccess(accountantUser, 'sales_reps'), true)
    assert.strictEqual(hasModulePermission(accountantUser, 'sales_reps', 'view'), true)
    assert.strictEqual(hasModulePermission(accountantUser, 'sales_reps', 'create'), true)
    assert.strictEqual(hasModulePermission(accountantUser, 'sales_reps', 'edit'), true)
    assert.strictEqual(hasModulePermission(accountantUser, 'sales_reps', 'delete'), false)
    assert.strictEqual(hasModulePermission(accountantUser, 'sales_reps', 'manage_commissions'), true)
    assert.strictEqual(hasModulePermission(accountantUser, 'sales_reps', 'view_ledger'), true)
  })

  it('should grant sales_rep role view and view_ledger but deny mutating permissions', () => {
    assert.strictEqual(hasModuleAccess(salesRepUser, 'sales_reps'), true)
    assert.strictEqual(hasModulePermission(salesRepUser, 'sales_reps', 'view'), true)
    assert.strictEqual(hasModulePermission(salesRepUser, 'sales_reps', 'create'), false)
    assert.strictEqual(hasModulePermission(salesRepUser, 'sales_reps', 'edit'), false)
    assert.strictEqual(hasModulePermission(salesRepUser, 'sales_reps', 'delete'), false)
    assert.strictEqual(hasModulePermission(salesRepUser, 'sales_reps', 'manage_commissions'), false)
    assert.strictEqual(hasModulePermission(salesRepUser, 'sales_reps', 'view_ledger'), true)
  })

  it('should strictly deny cashier role access to sales_reps module', () => {
    assert.strictEqual(hasModuleAccess(cashierUser, 'sales_reps'), false)
    assert.strictEqual(hasModulePermission(cashierUser, 'sales_reps', 'view'), false)
    assert.strictEqual(hasModulePermission(cashierUser, 'sales_reps', 'create'), false)
    assert.strictEqual(hasModulePermission(cashierUser, 'sales_reps', 'manage_commissions'), false)
    assert.strictEqual(hasModulePermission(cashierUser, 'sales_reps', 'view_ledger'), false)
  })

  it('should strictly deny warehouse, warehouse_manager, cutting_supervisor, and van_driver access', () => {
    assert.strictEqual(hasModuleAccess(warehouseUser, 'sales_reps'), false)
    assert.strictEqual(hasModuleAccess(whMgrUser, 'sales_reps'), false)
    assert.strictEqual(hasModuleAccess(cuttingUser, 'sales_reps'), false)
    assert.strictEqual(hasModuleAccess(vanUser, 'sales_reps'), false)
  })

  it('should grant super_admin full master bypass across all sales_reps permissions', () => {
    assert.strictEqual(isMasterUser(masterUser), true)
    assert.strictEqual(hasModuleAccess(masterUser, 'sales_reps'), true)
    assert.strictEqual(hasModulePermission(masterUser, 'sales_reps', 'view'), true)
    assert.strictEqual(hasModulePermission(masterUser, 'sales_reps', 'delete'), true)
    assert.strictEqual(hasModulePermission(masterUser, 'sales_reps', 'manage_commissions'), true)
  })

  it('should redirect unauthorized roles away from sales_reps tab via getFirstAccessibleTab', () => {
    function simulateRouteGuard(user, targetTab) {
      if (!hasModuleAccess(user, targetTab)) {
        return getFirstAccessibleTab(user)
      }
      return targetTab
    }

    assert.strictEqual(simulateRouteGuard(cashierUser, 'sales_reps'), 'invoices')
    assert.strictEqual(simulateRouteGuard(warehouseUser, 'sales_reps'), 'dashboard')
    assert.strictEqual(simulateRouteGuard(cuttingUser, 'sales_reps'), 'items')
    assert.strictEqual(simulateRouteGuard(vanUser, 'sales_reps'), 'invoices')
    assert.strictEqual(simulateRouteGuard(adminUser, 'sales_reps'), 'sales_reps')
    assert.strictEqual(simulateRouteGuard(accountantUser, 'sales_reps'), 'sales_reps')
    assert.strictEqual(simulateRouteGuard(salesRepUser, 'sales_reps'), 'sales_reps')
  })

  it('should correctly filter sales_reps in navigation items based on role access', () => {
    const navItems = ['dashboard', 'items', 'warehouses', 'customers', 'suppliers', 'sales_reps', 'reports']
    const cashierNav = navItems.filter((tab) => hasModuleAccess(cashierUser, tab))
    assert.strictEqual(cashierNav.includes('sales_reps'), false)

    const whNav = navItems.filter((tab) => hasModuleAccess(warehouseUser, tab))
    assert.strictEqual(whNav.includes('sales_reps'), false)

    const adminNav = navItems.filter((tab) => hasModuleAccess(adminUser, tab))
    assert.strictEqual(adminNav.includes('sales_reps'), true)

    const accNav = navItems.filter((tab) => hasModuleAccess(accountantUser, tab))
    assert.strictEqual(accNav.includes('sales_reps'), true)

    const repNav = navItems.filter((tab) => hasModuleAccess(salesRepUser, tab))
    assert.strictEqual(repNav.includes('sales_reps'), true)
  })
})

describe('Challenger 2 Verification: Sales Reps Search, Multi-Model Filtering & Corner Cases', () => {
  const sampleReps = [
    {
      id: 'rep-01',
      code: 'REP-101',
      name: 'كريم محمود المنشاوي',
      phone: '01012345678',
      assignedBranch: 'فرع الدلتا وتوزيع الغربية',
      assignedArea: 'الغربية وكفر الشيخ',
      targetAmount: 150000,
      salesTarget: 150000,
      commissionModel: 'volume_rate',
      balance: 18450,
      netBalance: 18450,
    },
    {
      id: 'rep-02',
      code: 'REP-102',
      name: 'سامح إبراهيم الجمل',
      phone: '01123456789',
      assignedBranch: 'فرع القناة والشرقية',
      assignedArea: 'الشرقية والإسماعيلية',
      targetAmount: 120000,
      salesTarget: 120000,
      commissionModel: 'category_percentage',
      balance: 14600,
      netBalance: 14600,
    },
    {
      id: 'rep-03',
      code: 'REP-103',
      name: 'ياسر فاروق المهدي',
      phone: '01234567890',
      assignedBranch: 'سيارة توزيع 1 (جامبو 7482)',
      assignedArea: 'الدقهلية ودمياط',
      targetAmount: 100000,
      salesTarget: 100000,
      commissionModel: 'target_tier',
      balance: 9800,
      netBalance: 9800,
    },
    {
      id: 'rep-04',
      code: 'REP-104',
      name: 'عمر خالد الصاوي',
      phone: '01511223344',
      assignedBranch: 'فرع الإسكندرية',
      assignedArea: 'الإسكندرية والبحيرة',
      targetAmount: 200000,
      salesTarget: 200000,
      commissionModel: 'hybrid',
      balance: 0,
      netBalance: 0,
    },
    {
      id: 'rep-05',
      code: 'REP-105',
      name: 'طارق عبد العزيز القاضي',
      phone: '01099887766',
      assignedBranch: 'فرع 6 أكتوبر',
      territory: 'الجيزة وأكتوبر',
      targetAmount: 180000,
      salesTarget: 180000,
      commissionModel: 'volume_rate',
      balance: 22000,
      netBalance: 22000,
    },
  ]

  function filterSalesReps(reps, { search = '', model = 'all' } = {}) {
    return reps.filter((r) => {
      const q = search.trim().toLowerCase()
      if (q) {
        const matchName = (r.name || '').toLowerCase().includes(q)
        const matchPhone = (r.phone || '').toLowerCase().includes(q)
        const matchBranch = (r.assignedBranch || '').toLowerCase().includes(q)
        const matchCode = (r.code || '').toLowerCase().includes(q)
        const matchArea = (r.assignedArea || r.territory || '').toLowerCase().includes(q)
        if (!matchName && !matchPhone && !matchBranch && !matchCode && !matchArea) return false
      }

      if (model !== 'all' && r.commissionModel !== model) {
        return false
      }

      return true
    })
  }

  it('should search reps by name, phone, code, branch, and area accurately', () => {
    const byName = filterSalesReps(sampleReps, { search: 'المنشاوي' })
    assert.strictEqual(byName.length, 1)
    assert.strictEqual(byName[0].id, 'rep-01')

    const byPhone = filterSalesReps(sampleReps, { search: '01123456789' })
    assert.strictEqual(byPhone.length, 1)
    assert.strictEqual(byPhone[0].id, 'rep-02')

    const byCode = filterSalesReps(sampleReps, { search: 'REP-103' })
    assert.strictEqual(byCode.length, 1)
    assert.strictEqual(byCode[0].id, 'rep-03')

    const byBranch = filterSalesReps(sampleReps, { search: 'الإسكندرية' })
    assert.strictEqual(byBranch.length, 1)
    assert.strictEqual(byBranch[0].id, 'rep-04')

    const byArea = filterSalesReps(sampleReps, { search: 'الغربية' })
    assert.strictEqual(byArea.length, 1)
    assert.strictEqual(byArea[0].id, 'rep-01')

    const byTerritory = filterSalesReps(sampleReps, { search: 'الجيزة' })
    assert.strictEqual(byTerritory.length, 1)
    assert.strictEqual(byTerritory[0].id, 'rep-05')
  })

  it('should return empty list when search term has no match', () => {
    const empty = filterSalesReps(sampleReps, { search: 'مندوب_غير_موجود_نهائيا' })
    assert.strictEqual(empty.length, 0)
  })

  it('should filter reps by commission model across all 4 operational types + hybrid', () => {
    const all = filterSalesReps(sampleReps, { model: 'all' })
    assert.strictEqual(all.length, 5)

    const volume = filterSalesReps(sampleReps, { model: 'volume_rate' })
    assert.strictEqual(volume.length, 2)
    assert.ok(volume.every((r) => r.commissionModel === 'volume_rate'))

    const category = filterSalesReps(sampleReps, { model: 'category_percentage' })
    assert.strictEqual(category.length, 1)
    assert.strictEqual(category[0].id, 'rep-02')

    const tier = filterSalesReps(sampleReps, { model: 'target_tier' })
    assert.strictEqual(tier.length, 1)
    assert.strictEqual(tier[0].id, 'rep-03')

    const hybrid = filterSalesReps(sampleReps, { model: 'hybrid' })
    assert.strictEqual(hybrid.length, 1)
    assert.strictEqual(hybrid[0].id, 'rep-04')
  })

  it('should combine search and commission model filter deterministically', () => {
    const combined = filterSalesReps(sampleReps, { search: 'فرع', model: 'volume_rate' })
    assert.strictEqual(combined.length, 2)

    const conflicting = filterSalesReps(sampleReps, { search: 'المنشاوي', model: 'hybrid' })
    assert.strictEqual(conflicting.length, 0)
  })

  it('should handle whitespace padding and uppercase query variations', () => {
    const padded = filterSalesReps(sampleReps, { search: '   REP-102   ' })
    assert.strictEqual(padded.length, 1)
    assert.strictEqual(padded[0].id, 'rep-02')

    const lowerCaseCode = filterSalesReps(sampleReps, { search: 'rep-101' })
    assert.strictEqual(lowerCaseCode.length, 1)
    assert.strictEqual(lowerCaseCode[0].id, 'rep-01')
  })
})

describe('Challenger 2 Verification: Pagination Engine (PAGE_SIZE = 15) & Boundaries', () => {
  const PAGE_SIZE = 15

  const generatedReps = []
  for (let i = 1; i <= 38; i++) {
    generatedReps.push({
      id: `rep-gen-${String(i).padStart(2, '0')}`,
      code: `REP-${String(i).padStart(3, '0')}`,
      name: `مندوب مبيعات رقم ${i}`,
      phone: `010000000${String(i).padStart(2, '0')}`,
      assignedBranch: i % 2 === 0 ? 'فرع الدلتا' : 'فرع القناة',
      targetAmount: 50000 + i * 2000,
      salesTarget: 50000 + i * 2000,
      commissionModel: i % 4 === 0 ? 'hybrid' : i % 3 === 0 ? 'target_tier' : i % 2 === 0 ? 'category_percentage' : 'volume_rate',
      balance: i * 1500,
      netBalance: i * 1500,
    })
  }

  function paginateReps(list, page, pageSize = PAGE_SIZE) {
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize))
    const safePage = Math.min(Math.max(1, page), totalPages)
    const start = (safePage - 1) * pageSize
    return {
      items: list.slice(start, start + pageSize),
      currentPage: safePage,
      totalPages,
      totalCount: list.length,
    }
  }

  it('should correctly partition 38 sales reps across 3 pages (15, 15, 8)', () => {
    assert.strictEqual(generatedReps.length, 38)

    const p1 = paginateReps(generatedReps, 1)
    assert.strictEqual(p1.currentPage, 1)
    assert.strictEqual(p1.totalPages, 3)
    assert.strictEqual(p1.items.length, 15)
    assert.strictEqual(p1.items[0].id, 'rep-gen-01')
    assert.strictEqual(p1.items[14].id, 'rep-gen-15')

    const p2 = paginateReps(generatedReps, 2)
    assert.strictEqual(p2.currentPage, 2)
    assert.strictEqual(p2.totalPages, 3)
    assert.strictEqual(p2.items.length, 15)
    assert.strictEqual(p2.items[0].id, 'rep-gen-16')
    assert.strictEqual(p2.items[14].id, 'rep-gen-30')

    const p3 = paginateReps(generatedReps, 3)
    assert.strictEqual(p3.currentPage, 3)
    assert.strictEqual(p3.totalPages, 3)
    assert.strictEqual(p3.items.length, 8)
    assert.strictEqual(p3.items[0].id, 'rep-gen-31')
    assert.strictEqual(p3.items[7].id, 'rep-gen-38')
  })

  it('should clamp out-of-range pages gracefully without exception', () => {
    const underflow = paginateReps(generatedReps, -5)
    assert.strictEqual(underflow.currentPage, 1)
    assert.strictEqual(underflow.items.length, 15)

    const zero = paginateReps(generatedReps, 0)
    assert.strictEqual(zero.currentPage, 1)

    const overflow = paginateReps(generatedReps, 999)
    assert.strictEqual(overflow.currentPage, 3)
    assert.strictEqual(overflow.items.length, 8)
  })

  it('should handle exactly 15 records on a single page with totalPages = 1', () => {
    const exact15 = generatedReps.slice(0, 15)
    const res = paginateReps(exact15, 1)
    assert.strictEqual(res.totalPages, 1)
    assert.strictEqual(res.items.length, 15)
  })

  it('should handle 0 records cleanly returning totalPages = 1 and items = []', () => {
    const empty = paginateReps([], 1)
    assert.strictEqual(empty.totalPages, 1)
    assert.strictEqual(empty.items.length, 0)
    assert.strictEqual(empty.totalCount, 0)
  })

  it('should verify metric strip aggregations across 38 generated reps', () => {
    const totalTarget = generatedReps.reduce((sum, r) => sum + (Number(r.targetAmount) || 0), 0)
    const totalDue = generatedReps.reduce((sum, r) => {
      const b = Number(r.netBalance) || 0
      return b > 0 ? sum + b : sum
    }, 0)

    assert.ok(totalTarget > 0)
    assert.ok(totalDue > 0)
    assert.strictEqual(totalDue, generatedReps.reduce((sum, r) => sum + r.balance, 0))
  })
})

describe('Challenger 2 Verification: UI Structure, Modals, FAB & Layout Standards', () => {
  const salesRepsDir = path.resolve(process.cwd(), 'src/components/sales_reps')
  const managerPath = path.join(salesRepsDir, 'AX_SalesRepsManager.jsx')
  const managerContent = fs.readFileSync(managerPath, 'utf8')

  it('should enforce full canvas width and forbid centered max-w-7xl containers', () => {
    assert.strictEqual(managerContent.includes('max-w-7xl mx-auto'), false)
    assert.strictEqual(managerContent.includes('max-w-5xl'), false)
    assert.strictEqual(managerContent.includes('w-full'), true)
  })

  it('should mount all required modals and confirmation dialog', () => {
    assert.strictEqual(managerContent.includes('<AX_AddSalesRepModal'), true)
    assert.strictEqual(managerContent.includes('<AX_EditSalesRepModal'), true)
    assert.strictEqual(managerContent.includes('<AX_SalesRepCommissionModal'), true)
    assert.strictEqual(managerContent.includes('<AX_SalesRepLedgerModal'), true)
    assert.strictEqual(managerContent.includes('<AX_ConfirmModal'), true)
  })

  it('should provide Floating Action Button (FAB) and pulse skeleton loader on auth loading', () => {
    assert.strictEqual(managerContent.includes('fixed bottom-20 lg:bottom-8 left-6'), true)
    assert.strictEqual(managerContent.includes('rounded-full'), true)
    assert.strictEqual(managerContent.includes('AX_SkeletonLoader'), true)
    assert.strictEqual(managerContent.includes('isAuthLoading'), true)
  })

  it('should maintain single-line desktop table and mobile bento cards coexistence', () => {
    const tableContent = fs.readFileSync(path.join(salesRepsDir, 'AX_SalesRepsTable.jsx'), 'utf8')
    assert.strictEqual(tableContent.includes('hidden lg:block'), true)
    assert.strictEqual(tableContent.includes('h-11'), true)
    assert.strictEqual(tableContent.includes('h-12'), true)

    const bentoContent = fs.readFileSync(path.join(salesRepsDir, 'AX_SalesRepsBentoCards.jsx'), 'utf8')
    assert.strictEqual(bentoContent.includes('lg:hidden'), true)
  })

  it('should strictly verify all sales reps files are <= 500 lines and contain 0 comments', () => {
    const files = fs.readdirSync(salesRepsDir)
    assert.ok(files.length >= 8)

    files.forEach((f) => {
      if (!f.endsWith('.js') && !f.endsWith('.jsx')) return
      const filePath = path.join(salesRepsDir, f)
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      assert.ok(lines.length <= 500, `File ${f} has ${lines.length} lines, exceeding 500 limit`)

      const codeLines = lines
        .map((l) => l.trim())
        .filter((l) => l.startsWith('//') || l.startsWith('/*'))
      assert.strictEqual(codeLines.length, 0, `File ${f} contains forbidden code comments`)
    })
  })
})
