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
} from '../src/utils/permissionsConfig.js'

describe('Challenger 2 Verification: Supplier RBAC & Role Permission Matrix', () => {
  const adminUser = { id: 'u-admin', role: 'admin', permissions: PRESET_PERMISSIONS.admin.permissions }
  const accountantUser = { id: 'u-acc', role: 'accountant', permissions: PRESET_PERMISSIONS.accountant.permissions }
  const cashierUser = { id: 'u-cash', role: 'cashier', permissions: PRESET_PERMISSIONS.cashier.permissions }
  const warehouseUser = { id: 'u-wh', role: 'warehouse', permissions: PRESET_PERMISSIONS.warehouse.permissions }
  const whMgrUser = { id: 'u-whm', role: 'warehouse_manager', permissions: PRESET_PERMISSIONS.warehouse_manager.permissions }
  const cuttingUser = { id: 'u-cut', role: 'cutting_supervisor', permissions: PRESET_PERMISSIONS.cutting_supervisor.permissions }
  const vanUser = { id: 'u-van', role: 'van_driver', permissions: PRESET_PERMISSIONS.van_driver.permissions }
  const salesRepUser = { id: 'u-rep', role: 'sales_rep', permissions: PRESET_PERMISSIONS.sales_rep.permissions }
  const masterUser = { id: 'u-mst', role: 'super_admin', email: 'abdalshafy@axsonid.com', is_master: true }

  it('should grant admin full access and all action permissions on suppliers', () => {
    assert.strictEqual(hasModuleAccess(adminUser, 'suppliers'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'suppliers', 'view'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'suppliers', 'create'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'suppliers', 'edit'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'suppliers', 'delete'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'suppliers', 'view_balance'), true)
  })

  it('should grant accountant access to view, create, edit, but deny supplier deletion', () => {
    assert.strictEqual(hasModuleAccess(accountantUser, 'suppliers'), true)
    assert.strictEqual(hasModulePermission(accountantUser, 'suppliers', 'view'), true)
    assert.strictEqual(hasModulePermission(accountantUser, 'suppliers', 'create'), true)
    assert.strictEqual(hasModulePermission(accountantUser, 'suppliers', 'edit'), true)
    assert.strictEqual(hasModulePermission(accountantUser, 'suppliers', 'delete'), false)
    assert.strictEqual(hasModulePermission(accountantUser, 'suppliers', 'view_balance'), true)
  })

  it('should grant warehouse role access to view, create, edit, but deny supplier deletion', () => {
    assert.strictEqual(hasModuleAccess(warehouseUser, 'suppliers'), true)
    assert.strictEqual(hasModulePermission(warehouseUser, 'suppliers', 'view'), true)
    assert.strictEqual(hasModulePermission(warehouseUser, 'suppliers', 'create'), true)
    assert.strictEqual(hasModulePermission(warehouseUser, 'suppliers', 'edit'), true)
    assert.strictEqual(hasModulePermission(warehouseUser, 'suppliers', 'delete'), false)
    assert.strictEqual(hasModulePermission(warehouseUser, 'suppliers', 'view_balance'), true)
  })

  it('should strictly deny cashier role all access and permissions to suppliers module', () => {
    assert.strictEqual(hasModuleAccess(cashierUser, 'suppliers'), false)
    assert.strictEqual(hasModulePermission(cashierUser, 'suppliers', 'view'), false)
    assert.strictEqual(hasModulePermission(cashierUser, 'suppliers', 'create'), false)
    assert.strictEqual(hasModulePermission(cashierUser, 'suppliers', 'edit'), false)
    assert.strictEqual(hasModulePermission(cashierUser, 'suppliers', 'delete'), false)
    assert.strictEqual(hasModulePermission(cashierUser, 'suppliers', 'view_balance'), false)
  })

  it('should strictly deny van driver, cutting supervisor, and sales rep access to suppliers', () => {
    assert.strictEqual(hasModuleAccess(vanUser, 'suppliers'), false)
    assert.strictEqual(hasModulePermission(vanUser, 'suppliers', 'view'), false)
    assert.strictEqual(hasModuleAccess(cuttingUser, 'suppliers'), false)
    assert.strictEqual(hasModulePermission(cuttingUser, 'suppliers', 'view'), false)
    assert.strictEqual(hasModuleAccess(salesRepUser, 'suppliers'), false)
    assert.strictEqual(hasModulePermission(salesRepUser, 'suppliers', 'view'), false)
  })

  it('should grant warehouse manager access and master user full bypass', () => {
    assert.strictEqual(hasModuleAccess(whMgrUser, 'suppliers'), true)
    assert.strictEqual(isMasterUser(masterUser), true)
    assert.strictEqual(hasModuleAccess(masterUser, 'suppliers'), true)
    assert.strictEqual(hasModulePermission(masterUser, 'suppliers', 'delete'), true)
  })

  it('should redirect unauthorized cashier away from suppliers tab via getFirstAccessibleTab', () => {
    const firstTab = getFirstAccessibleTab(cashierUser)
    assert.notStrictEqual(firstTab, 'suppliers')
    assert.strictEqual(firstTab, 'invoices')

    function simulateRouteGuard(user, targetTab) {
      if (!hasModuleAccess(user, targetTab)) {
        return getFirstAccessibleTab(user)
      }
      return targetTab
    }

    assert.strictEqual(simulateRouteGuard(cashierUser, 'suppliers'), 'invoices')
    assert.strictEqual(simulateRouteGuard(vanUser, 'suppliers'), 'invoices')
    assert.strictEqual(simulateRouteGuard(cuttingUser, 'suppliers'), 'items')
    assert.strictEqual(simulateRouteGuard(adminUser, 'suppliers'), 'suppliers')
    assert.strictEqual(simulateRouteGuard(accountantUser, 'suppliers'), 'suppliers')
    assert.strictEqual(simulateRouteGuard(warehouseUser, 'suppliers'), 'suppliers')
  })

  it('should filter out suppliers tab in navigation menus for cashier while retaining it for allowed roles', () => {
    const allMenuTabs = ['dashboard', 'invoices', 'items', 'warehouses', 'customers', 'suppliers', 'sales_reps']
    const cashierVisible = allMenuTabs.filter((id) => hasModuleAccess(cashierUser, id))
    assert.strictEqual(cashierVisible.includes('suppliers'), false)
    assert.strictEqual(cashierVisible.includes('invoices'), true)

    const adminVisible = allMenuTabs.filter((id) => hasModuleAccess(adminUser, id))
    assert.strictEqual(adminVisible.includes('suppliers'), true)

    const accountantVisible = allMenuTabs.filter((id) => hasModuleAccess(accountantUser, id))
    assert.strictEqual(accountantVisible.includes('suppliers'), true)

    const warehouseVisible = allMenuTabs.filter((id) => hasModuleAccess(warehouseUser, id))
    assert.strictEqual(warehouseVisible.includes('suppliers'), true)
  })
})

describe('Challenger 2 Verification: Supplier Search, Filters, and Empty State Harness', () => {
  const sampleSuppliers = [
    {
      id: 'sup-01',
      companyName: 'شركة النيل لاستيراد اللحوم البرازيلية',
      name: 'شركة النيل لاستيراد اللحوم البرازيلية',
      contactPerson: 'الحاج إبراهيم منصور',
      phone: '01011223344',
      phone2: '01299887766',
      address: 'ميناء الإسكندرية - المنطقة الحرة',
      taxNumber: 'TX-12345',
      commercialRegistration: 'CR-98765',
      supplyType: 'frozen_meat',
      category: 'لحوم حمراء ومصنعات',
      balance: 450000,
    },
    {
      id: 'sup-02',
      companyName: 'مزارع الوادي للدواجن ومجزءات الدجاج',
      name: 'مزارع الوادي للدواجن ومجزءات الدجاج',
      contactPerson: 'المهندس محمود الشريف',
      phone: '01155443322',
      phone2: '',
      address: 'طريق مصر الإسكندرية الصحراوي',
      taxNumber: 'TX-67890',
      commercialRegistration: 'CR-54321',
      supplyType: 'poultry',
      category: 'دواجن ومجزءات',
      balance: -35000,
    },
    {
      id: 'sup-03',
      companyName: 'شركة مبردات البحر الأحمر للأسماك',
      name: 'شركة مبردات البحر الأحمر للأسماك',
      contactPerson: 'الربان سامح عثمان',
      phone: '01233445566',
      phone2: '01577889900',
      address: 'السويس - الميناء البحري',
      taxNumber: 'TX-99887',
      commercialRegistration: 'CR-11223',
      supplyType: 'fish',
      category: 'أسماك بحرية ومأكولات',
      balance: 0,
    },
    {
      id: 'sup-04',
      companyName: 'مصنع الأهرام للتغليف والكرتون',
      name: 'مصنع الأهرام للتغليف والكرتون',
      contactPerson: 'أحمد سعيد النجار',
      phone: '01099887766',
      phone2: '',
      address: 'العاشر من رمضان - المنطقة الصناعية',
      taxNumber: 'TX-33445',
      commercialRegistration: 'CR-66778',
      supplyType: 'packaging',
      category: 'مواد تعبئة وتغليف',
      balance: 15000,
    },
    {
      id: 'sup-05',
      companyName: 'مورد مجازر الأمل الآلية',
      name: 'مورد مجازر الأمل الآلية',
      contactPerson: 'علاء عبد الرحمن',
      phone: '01066778899',
      phone2: '',
      address: 'القليوبية - بنها',
      taxNumber: 'TX-44556',
      commercialRegistration: 'CR-77889',
      supplyType: 'slaughterhouse',
      category: 'لحوم حمراء ومصنعات',
      balance: 90000,
    },
  ]

  function filterSuppliers(list, { search = '', supplyType = 'all', category = 'all', balance = 'all' } = {}) {
    return list.filter((s) => {
      const q = search.trim().toLowerCase()
      if (q) {
        const matchName = (s.companyName || s.name || '').toLowerCase().includes(q)
        const matchContact = (s.contactPerson || '').toLowerCase().includes(q)
        const matchPhone = (s.phone || '').toLowerCase().includes(q)
        const matchPhone2 = (s.phone2 || '').toLowerCase().includes(q)
        const matchAddress = (s.address || '').toLowerCase().includes(q)
        const matchTax = (s.taxNumber || '').toLowerCase().includes(q)
        const matchCR = (s.commercialRegistration || s.commercialRegister || '').toLowerCase().includes(q)
        if (!matchName && !matchContact && !matchPhone && !matchPhone2 && !matchAddress && !matchTax && !matchCR) {
          return false
        }
      }

      if (supplyType !== 'all') {
        const supType = s.supplyType || 'frozen_meat'
        if (supType !== supplyType) {
          if (supplyType === 'frozen_meat' && (supType === 'direct_importer' || supType === 'local_farms')) {
          } else if (supplyType === 'fish' && supType === 'أسماك بحرية') {
          } else if (supplyType === 'poultry' && supType === 'دواجن ومجزءات') {
          } else {
            return false
          }
        }
      }

      if (category !== 'all' && s.category !== category) return false

      const bal = Number(s.balance) || 0
      if (balance === 'payable' && bal <= 0) return false
      if (balance === 'receivable' && bal >= 0) return false
      if (balance === 'zero' && bal !== 0) return false

      return true
    })
  }

  it('should filter suppliers by phone vs company name vs contact person', () => {
    const byCompany = filterSuppliers(sampleSuppliers, { search: 'البحر الأحمر' })
    assert.strictEqual(byCompany.length, 1)
    assert.strictEqual(byCompany[0].id, 'sup-03')

    const byPhone = filterSuppliers(sampleSuppliers, { search: '01011223344' })
    assert.strictEqual(byPhone.length, 1)
    assert.strictEqual(byPhone[0].id, 'sup-01')

    const byPhone2 = filterSuppliers(sampleSuppliers, { search: '01299887766' })
    assert.strictEqual(byPhone2.length, 1)
    assert.strictEqual(byPhone2[0].id, 'sup-01')

    const byContact = filterSuppliers(sampleSuppliers, { search: 'الشريف' })
    assert.strictEqual(byContact.length, 1)
    assert.strictEqual(byContact[0].id, 'sup-02')

    const byCR = filterSuppliers(sampleSuppliers, { search: 'CR-98765' })
    assert.strictEqual(byCR.length, 1)
    assert.strictEqual(byCR[0].id, 'sup-01')

    const byTax = filterSuppliers(sampleSuppliers, { search: 'TX-33445' })
    assert.strictEqual(byTax.length, 1)
    assert.strictEqual(byTax[0].id, 'sup-04')
  })

  it('should return empty array when search query matches zero records', () => {
    const emptyResult = filterSuppliers(sampleSuppliers, { search: 'شركة_غير_موجودة_نهائيا_999' })
    assert.strictEqual(emptyResult.length, 0)
  })

  it('should filter by supply type accurately including cold chain domain types', () => {
    const meat = filterSuppliers(sampleSuppliers, { supplyType: 'frozen_meat' })
    assert.strictEqual(meat.length, 1)
    assert.strictEqual(meat[0].id, 'sup-01')

    const poultry = filterSuppliers(sampleSuppliers, { supplyType: 'poultry' })
    assert.strictEqual(poultry.length, 1)
    assert.strictEqual(poultry[0].id, 'sup-02')

    const fish = filterSuppliers(sampleSuppliers, { supplyType: 'fish' })
    assert.strictEqual(fish.length, 1)
    assert.strictEqual(fish[0].id, 'sup-03')

    const packaging = filterSuppliers(sampleSuppliers, { supplyType: 'packaging' })
    assert.strictEqual(packaging.length, 1)
    assert.strictEqual(packaging[0].id, 'sup-04')

    const all = filterSuppliers(sampleSuppliers, { supplyType: 'all' })
    assert.strictEqual(all.length, 5)
  })

  it('should filter by departmental category', () => {
    const meatCat = filterSuppliers(sampleSuppliers, { category: 'لحوم حمراء ومصنعات' })
    assert.strictEqual(meatCat.length, 2)
    assert.strictEqual(meatCat[0].id, 'sup-01')
    assert.strictEqual(meatCat[1].id, 'sup-05')

    const nonExistent = filterSuppliers(sampleSuppliers, { category: 'قسم_وهمي' })
    assert.strictEqual(nonExistent.length, 0)
  })

  it('should filter by balance status: payable, receivable, and zero', () => {
    const payables = filterSuppliers(sampleSuppliers, { balance: 'payable' })
    assert.strictEqual(payables.length, 3)
    payables.forEach((s) => assert.ok(s.balance > 0))

    const receivables = filterSuppliers(sampleSuppliers, { balance: 'receivable' })
    assert.strictEqual(receivables.length, 1)
    assert.strictEqual(receivables[0].id, 'sup-02')
    assert.strictEqual(receivables[0].balance, -35000)

    const zeros = filterSuppliers(sampleSuppliers, { balance: 'zero' })
    assert.strictEqual(zeros.length, 1)
    assert.strictEqual(zeros[0].id, 'sup-03')
    assert.strictEqual(zeros[0].balance, 0)
  })

  it('should handle composite multi-filter criteria correctly', () => {
    const combined = filterSuppliers(sampleSuppliers, {
      search: 'النيل',
      supplyType: 'frozen_meat',
      category: 'لحوم حمراء ومصنعات',
      balance: 'payable',
    })
    assert.strictEqual(combined.length, 1)
    assert.strictEqual(combined[0].id, 'sup-01')

    const conflicting = filterSuppliers(sampleSuppliers, {
      search: 'النيل',
      supplyType: 'poultry',
    })
    assert.strictEqual(conflicting.length, 0)
  })
})

describe('Challenger 2 Verification: Supplier Pagination Engine & Financial Aggregations', () => {
  const PAGE_SIZE = 15

  const generatedSuppliers = []
  for (let i = 1; i <= 38; i++) {
    generatedSuppliers.push({
      id: `sup-gen-${String(i).padStart(2, '0')}`,
      companyName: `شركة التوريدات رقم ${i}`,
      name: `شركة التوريدات رقم ${i}`,
      contactPerson: `مسؤول ${i}`,
      phone: `010000000${String(i).padStart(2, '0')}`,
      supplyType: i % 2 === 0 ? 'frozen_meat' : 'poultry',
      category: i % 3 === 0 ? 'لحوم حمراء ومصنعات' : 'خامات وتوريد',
      balance: i % 4 === 0 ? 10000 * i : i % 4 === 1 ? -5000 * i : 0,
    })
  }

  function paginate(items, page, pageSize = PAGE_SIZE) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
    const safePage = Math.min(Math.max(1, page), totalPages)
    const start = (safePage - 1) * pageSize
    return {
      items: items.slice(start, start + pageSize),
      currentPage: safePage,
      totalPages,
      totalCount: items.length,
    }
  }

  it('should correctly paginate 38 suppliers across 3 pages of 15, 15, and 8', () => {
    assert.strictEqual(generatedSuppliers.length, 38)

    const p1 = paginate(generatedSuppliers, 1, PAGE_SIZE)
    assert.strictEqual(p1.currentPage, 1)
    assert.strictEqual(p1.totalPages, 3)
    assert.strictEqual(p1.items.length, 15)
    assert.strictEqual(p1.items[0].id, 'sup-gen-01')
    assert.strictEqual(p1.items[14].id, 'sup-gen-15')

    const p2 = paginate(generatedSuppliers, 2, PAGE_SIZE)
    assert.strictEqual(p2.currentPage, 2)
    assert.strictEqual(p2.totalPages, 3)
    assert.strictEqual(p2.items.length, 15)
    assert.strictEqual(p2.items[0].id, 'sup-gen-16')
    assert.strictEqual(p2.items[14].id, 'sup-gen-30')

    const p3 = paginate(generatedSuppliers, 3, PAGE_SIZE)
    assert.strictEqual(p3.currentPage, 3)
    assert.strictEqual(p3.totalPages, 3)
    assert.strictEqual(p3.items.length, 8)
    assert.strictEqual(p3.items[0].id, 'sup-gen-31')
    assert.strictEqual(p3.items[7].id, 'sup-gen-38')
  })

  it('should clamp out-of-range page requests gracefully', () => {
    const overflow = paginate(generatedSuppliers, 999, PAGE_SIZE)
    assert.strictEqual(overflow.currentPage, 3)
    assert.strictEqual(overflow.items.length, 8)

    const underflow = paginate(generatedSuppliers, -10, PAGE_SIZE)
    assert.strictEqual(underflow.currentPage, 1)
    assert.strictEqual(underflow.items.length, 15)
  })

  it('should verify financial aggregation integrity across suppliers', () => {
    const payables = generatedSuppliers.reduce((sum, s) => {
      const bal = Number(s.balance) || 0
      return bal > 0 ? sum + bal : sum
    }, 0)

    const receivables = generatedSuppliers.reduce((sum, s) => {
      const bal = Number(s.balance) || 0
      return bal < 0 ? sum + Math.abs(bal) : sum
    }, 0)

    const payCount = generatedSuppliers.filter((s) => (Number(s.balance) || 0) > 0).length
    const recCount = generatedSuppliers.filter((s) => (Number(s.balance) || 0) < 0).length
    const zeroCount = generatedSuppliers.filter((s) => (Number(s.balance) || 0) === 0).length

    assert.ok(payables > 0)
    assert.ok(receivables > 0)
    assert.strictEqual(payCount + recCount + zeroCount, generatedSuppliers.length)
  })
})

describe('Challenger 2 Verification: Architectural Invariants & File Structure', () => {
  const suppliersDir = path.resolve(process.cwd(), 'src/components/suppliers')

  it('should ensure all supplier source files are strictly <= 500 lines', () => {
    const files = fs.readdirSync(suppliersDir)
    assert.ok(files.length > 0)
    files.forEach((file) => {
      if (!file.endsWith('.js') && !file.endsWith('.jsx')) return
      const fullPath = path.join(suppliersDir, file)
      const lines = fs.readFileSync(fullPath, 'utf8').split('\n').length
      assert.ok(
        lines <= 500,
        `Supplier component ${file} exceeds 500 lines (${lines} lines)`
      )
    })
  })

  it('should ensure full canvas width and responsive layout standards in AX_SuppliersManager', () => {
    const content = fs.readFileSync(path.join(suppliersDir, 'AX_SuppliersManager.jsx'), 'utf8')
    assert.strictEqual(content.includes('max-w-7xl mx-auto'), false)
    assert.strictEqual(content.includes('w-full'), true)
    assert.strictEqual(content.includes('rounded-full'), true)
  })

  it('should ensure desktop single-line table and mobile bento coexistence', () => {
    const tableContent = fs.readFileSync(path.join(suppliersDir, 'AX_SuppliersTable.jsx'), 'utf8')
    assert.strictEqual(tableContent.includes('hidden lg:block'), true)
    assert.strictEqual(tableContent.includes('h-12'), true)

    const bentoContent = fs.readFileSync(path.join(suppliersDir, 'AX_SuppliersBentoCards.jsx'), 'utf8')
    assert.strictEqual(bentoContent.includes('lg:hidden'), true)
  })
})
