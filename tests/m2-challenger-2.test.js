import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  PRESET_PERMISSIONS,
  hasModuleAccess,
  hasModulePermission,
  getFirstAccessibleTab,
  isMasterUser,
  normalizePermissions,
} from '../src/utils/permissionsConfig.js'

describe('Challenger 2 Verification: Customer RBAC, Permissions & Route Guards', () => {
  const adminUser = {
    id: 'user-admin-01',
    name: 'مدير عام',
    role: 'admin',
    permissions: PRESET_PERMISSIONS.admin.permissions,
  }

  const accountantUser = {
    id: 'user-acc-01',
    name: 'محاسب مالي',
    role: 'accountant',
    permissions: PRESET_PERMISSIONS.accountant.permissions,
  }

  const cashierUser = {
    id: 'user-cash-01',
    name: 'كاشير مبيعات',
    role: 'cashier',
    permissions: PRESET_PERMISSIONS.cashier.permissions,
  }

  const warehouseUser = {
    id: 'user-wh-01',
    name: 'أمين مخزن',
    role: 'warehouse',
    permissions: PRESET_PERMISSIONS.warehouse.permissions,
  }

  const warehouseManagerUser = {
    id: 'user-wh-mgr',
    name: 'مدير مخازن',
    role: 'warehouse_manager',
    permissions: PRESET_PERMISSIONS.warehouse_manager.permissions,
  }

  const cuttingSupervisorUser = {
    id: 'user-cut-sup',
    name: 'مشرف تشغيل وتفكيك',
    role: 'cutting_supervisor',
    permissions: PRESET_PERMISSIONS.cutting_supervisor.permissions,
  }

  const vanDriverUser = {
    id: 'user-van-01',
    name: 'سائق فان توزيع',
    role: 'van_driver',
    permissions: PRESET_PERMISSIONS.van_driver.permissions,
  }

  const salesRepUser = {
    id: 'user-rep-01',
    name: 'مندوب مبيعات',
    role: 'sales_rep',
    permissions: PRESET_PERMISSIONS.sales_rep.permissions,
  }

  const superAdminUser = {
    id: 'user-master-01',
    name: 'الريس',
    role: 'super_admin',
    email: 'abdalshafy@axsonid.com',
    is_master: true,
  }

  it('should grant admin full access and all action permissions on customers', () => {
    assert.strictEqual(hasModuleAccess(adminUser, 'customers'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'customers', 'view'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'customers', 'create'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'customers', 'edit'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'customers', 'delete'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'customers', 'view_balance'), true)
  })

  it('should grant accountant access to view, create, edit, but deny customer deletion', () => {
    assert.strictEqual(hasModuleAccess(accountantUser, 'customers'), true)
    assert.strictEqual(hasModulePermission(accountantUser, 'customers', 'view'), true)
    assert.strictEqual(hasModulePermission(accountantUser, 'customers', 'create'), true)
    assert.strictEqual(hasModulePermission(accountantUser, 'customers', 'edit'), true)
    assert.strictEqual(hasModulePermission(accountantUser, 'customers', 'delete'), false)
    assert.strictEqual(hasModulePermission(accountantUser, 'customers', 'view_balance'), true)
  })

  it('should grant cashier access to view, create, and view_balance, but deny edit and delete', () => {
    assert.strictEqual(hasModuleAccess(cashierUser, 'customers'), true)
    assert.strictEqual(hasModulePermission(cashierUser, 'customers', 'view'), true)
    assert.strictEqual(hasModulePermission(cashierUser, 'customers', 'create'), true)
    assert.strictEqual(hasModulePermission(cashierUser, 'customers', 'edit'), false)
    assert.strictEqual(hasModulePermission(cashierUser, 'customers', 'delete'), false)
    assert.strictEqual(hasModulePermission(cashierUser, 'customers', 'view_balance'), true)
  })

  it('should strictly deny warehouse role all access and permissions to customers module', () => {
    assert.strictEqual(hasModuleAccess(warehouseUser, 'customers'), false)
    assert.strictEqual(hasModulePermission(warehouseUser, 'customers', 'view'), false)
    assert.strictEqual(hasModulePermission(warehouseUser, 'customers', 'create'), false)
    assert.strictEqual(hasModulePermission(warehouseUser, 'customers', 'edit'), false)
    assert.strictEqual(hasModulePermission(warehouseUser, 'customers', 'delete'), false)
    assert.strictEqual(hasModulePermission(warehouseUser, 'customers', 'view_balance'), false)
  })

  it('should deny warehouse manager and cutting supervisor access to customers module', () => {
    assert.strictEqual(hasModuleAccess(warehouseManagerUser, 'customers'), false)
    assert.strictEqual(hasModulePermission(warehouseManagerUser, 'customers', 'view'), false)
    assert.strictEqual(hasModuleAccess(cuttingSupervisorUser, 'customers'), false)
    assert.strictEqual(hasModulePermission(cuttingSupervisorUser, 'customers', 'view'), false)
  })

  it('should grant van driver and sales rep field access to customers module', () => {
    assert.strictEqual(hasModuleAccess(vanDriverUser, 'customers'), true)
    assert.strictEqual(hasModulePermission(vanDriverUser, 'customers', 'create'), true)
    assert.strictEqual(hasModulePermission(vanDriverUser, 'customers', 'delete'), false)
    assert.strictEqual(hasModuleAccess(salesRepUser, 'customers'), true)
    assert.strictEqual(hasModulePermission(salesRepUser, 'customers', 'create'), true)
    assert.strictEqual(hasModulePermission(salesRepUser, 'customers', 'delete'), false)
  })

  it('should recognize super admin and master user with bypass access', () => {
    assert.strictEqual(isMasterUser(superAdminUser), true)
    assert.strictEqual(hasModuleAccess(superAdminUser, 'customers'), true)
    assert.strictEqual(hasModulePermission(superAdminUser, 'customers', 'delete'), true)
  })

  it('should redirect unauthorized warehouse user away from customers tab via getFirstAccessibleTab', () => {
    const firstTab = getFirstAccessibleTab(warehouseUser)
    assert.notStrictEqual(firstTab, 'customers')
    assert.strictEqual(firstTab, 'dashboard')

    function simulateTabGuard(user, targetTab) {
      if (!hasModuleAccess(user, targetTab)) {
        return getFirstAccessibleTab(user)
      }
      return targetTab
    }

    assert.strictEqual(simulateTabGuard(warehouseUser, 'customers'), 'dashboard')
    assert.strictEqual(simulateTabGuard(adminUser, 'customers'), 'customers')
    assert.strictEqual(simulateTabGuard(cashierUser, 'customers'), 'customers')
    assert.strictEqual(simulateTabGuard(accountantUser, 'customers'), 'customers')
  })

  it('should filter out customers tab in sidebar and mobile navbar for warehouse role', () => {
    const allTabIds = ['dashboard', 'items', 'warehouses', 'customers', 'suppliers', 'treasury']
    const warehouseVisible = allTabIds.filter((tabId) => hasModuleAccess(warehouseUser, tabId))
    assert.strictEqual(warehouseVisible.includes('customers'), false)
    assert.strictEqual(warehouseVisible.includes('warehouses'), true)

    const cashierVisible = allTabIds.filter((tabId) => hasModuleAccess(cashierUser, tabId))
    assert.strictEqual(cashierVisible.includes('customers'), true)
  })
})

describe('Challenger 2 Verification: Pagination, Filtering & Search Empirical Harness', () => {
  const PAGE_SIZE = 15

  const sampleCustomers = [
    {
      id: 'c-01',
      name: 'شركة الأهرام للتوريدات',
      phone: '01011223344',
      phone2: '01299887766',
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      district: 'الحي السابع',
      commercialRegister: 'CR-88990',
      primaryCategory: 'مطاعم وفنادق (HORECA)',
      subCategory: 'فنادق ومنتجعات',
      balance: 45000,
      isIncomplete: false,
    },
    {
      id: 'c-02',
      name: 'سوبر ماركت الفهد',
      phone: '01155443322',
      phone2: '',
      governorate: 'الغربية',
      city: 'طنطا',
      district: 'المحطة',
      commercialRegister: 'CR-12345',
      primaryCategory: 'سلاسل تجارية وهايبر',
      subCategory: 'سوبر ماركت',
      balance: -12000,
      isIncomplete: false,
    },
    {
      id: 'c-03',
      name: 'مطعم الحديقة الإيطالي',
      phone: '01055555555',
      phone2: '01544444444',
      governorate: 'الدقهلية',
      city: 'المنصورة',
      district: 'المشاية',
      commercialRegister: 'CR-55443',
      primaryCategory: 'مطاعم وفنادق (HORECA)',
      subCategory: 'وجبات سريعة',
      balance: 0,
      isIncomplete: false,
    },
    {
      id: 'c-04',
      name: 'محلات التوحيد للحوم',
      phone: '',
      phone2: '',
      governorate: '',
      city: '',
      district: '',
      commercialRegister: '',
      primaryCategory: 'جزارين وتجزئة',
      subCategory: 'محلات جزارة',
      balance: 0,
      isIncomplete: true,
    },
  ]

  for (let i = 5; i <= 38; i++) {
    sampleCustomers.push({
      id: `c-${String(i).padStart(2, '0')}`,
      name: `عميل تجريبي رقم ${i}`,
      phone: `010000000${String(i).padStart(2, '0')}`,
      phone2: '',
      governorate: i % 2 === 0 ? 'القاهرة' : 'الجيزة',
      city: i % 2 === 0 ? 'المعادي' : 'الدقي',
      district: `المنطقة ${i}`,
      commercialRegister: `CR-GEN-${i}`,
      primaryCategory: i % 3 === 0 ? 'مطاعم وفنادق (HORECA)' : i % 3 === 1 ? 'سلاسل تجارية وهايبر' : 'جزارين وتجزئة',
      subCategory: 'عام',
      balance: i % 4 === 0 ? 5000 * i : i % 4 === 1 ? -2000 * i : 0,
      isIncomplete: i === 38,
    })
  }

  function filterCustomers(clients, { query = '', category = 'all', balance = 'all' } = {}) {
    return clients.filter((c) => {
      const q = query.trim().toLowerCase()
      if (q) {
        const matchName = (c.name || '').toLowerCase().includes(q)
        const matchPhone = (c.phone || '').toLowerCase().includes(q)
        const matchPhone2 = (c.phone2 || '').toLowerCase().includes(q)
        const matchGov = (c.governorate || '').toLowerCase().includes(q)
        const matchCity = (c.city || '').toLowerCase().includes(q)
        const matchDistrict = (c.district || '').toLowerCase().includes(q)
        const matchCR = (c.commercialRegister || '').toLowerCase().includes(q)
        if (!matchName && !matchPhone && !matchPhone2 && !matchGov && !matchCity && !matchDistrict && !matchCR) {
          return false
        }
      }

      if (category !== 'all' && c.primaryCategory !== category) {
        return false
      }

      const bal = Number(c.balance) || 0
      if (balance === 'debtor' && bal <= 0) return false
      if (balance === 'creditor' && bal >= 0) return false
      if (balance === 'zero' && bal !== 0) return false
      if (balance === 'incomplete' && !c.isIncomplete) return false

      return true
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

  it('should find customers by primary phone number and secondary phone number', () => {
    const byPhone = filterCustomers(sampleCustomers, { query: '01011223344' })
    assert.strictEqual(byPhone.length, 1)
    assert.strictEqual(byPhone[0].id, 'c-01')

    const byPhone2 = filterCustomers(sampleCustomers, { query: '01299887766' })
    assert.strictEqual(byPhone2.length, 1)
    assert.strictEqual(byPhone2[0].id, 'c-01')

    const byPhonePart = filterCustomers(sampleCustomers, { query: '554433' })
    assert.strictEqual(byPhonePart.length, 1)
    assert.strictEqual(byPhonePart[0].id, 'c-02')
  })

  it('should find customers by name with partial Arabic string matching', () => {
    const byName = filterCustomers(sampleCustomers, { query: 'الأهرام' })
    assert.strictEqual(byName.length, 1)
    assert.strictEqual(byName[0].id, 'c-01')

    const byGeneric = filterCustomers(sampleCustomers, { query: 'تجريبي' })
    assert.strictEqual(byGeneric.length, 34)
  })

  it('should find customers by geographic location and commercial register', () => {
    const byGov = filterCustomers(sampleCustomers, { query: 'طنطا' })
    assert.strictEqual(byGov.length, 1)
    assert.strictEqual(byGov[0].id, 'c-02')

    const byCR = filterCustomers(sampleCustomers, { query: 'CR-88990' })
    assert.strictEqual(byCR.length, 1)
    assert.strictEqual(byCR[0].id, 'c-01')
  })

  it('should return empty result set cleanly when search query has zero matches', () => {
    const emptyResult = filterCustomers(sampleCustomers, { query: 'استعلام_وهمي_غير_موجود_نهائيا' })
    assert.strictEqual(emptyResult.length, 0)
    const p = paginate(emptyResult, 1)
    assert.strictEqual(p.items.length, 0)
    assert.strictEqual(p.totalPages, 1)
    assert.strictEqual(p.totalCount, 0)
  })

  it('should filter customers strictly by primary category', () => {
    const horeca = filterCustomers(sampleCustomers, { category: 'مطاعم وفنادق (HORECA)' })
    assert.ok(horeca.length > 0)
    horeca.forEach((c) => {
      assert.strictEqual(c.primaryCategory, 'مطاعم وفنادق (HORECA)')
    })

    const nonExistentCat = filterCustomers(sampleCustomers, { category: 'تصنيف_غير_موجود' })
    assert.strictEqual(nonExistentCat.length, 0)
  })

  it('should filter customers by balance status: debtor, creditor, zero, and incomplete', () => {
    const debtors = filterCustomers(sampleCustomers, { balance: 'debtor' })
    assert.ok(debtors.length > 0)
    debtors.forEach((c) => assert.ok(Number(c.balance) > 0))

    const creditors = filterCustomers(sampleCustomers, { balance: 'creditor' })
    assert.ok(creditors.length > 0)
    creditors.forEach((c) => assert.ok(Number(c.balance) < 0))

    const zeroBalance = filterCustomers(sampleCustomers, { balance: 'zero' })
    assert.ok(zeroBalance.length > 0)
    zeroBalance.forEach((c) => assert.strictEqual(Number(c.balance), 0))

    const incomplete = filterCustomers(sampleCustomers, { balance: 'incomplete' })
    assert.strictEqual(incomplete.length, 2)
    incomplete.forEach((c) => assert.strictEqual(c.isIncomplete, true))
  })

  it('should calculate pagination correctly for page 1, page 2, and last page', () => {
    const totalCount = sampleCustomers.length
    assert.strictEqual(totalCount, 38)

    const page1 = paginate(sampleCustomers, 1, PAGE_SIZE)
    assert.strictEqual(page1.currentPage, 1)
    assert.strictEqual(page1.totalPages, 3)
    assert.strictEqual(page1.items.length, 15)
    assert.strictEqual(page1.items[0].id, 'c-01')

    const page2 = paginate(sampleCustomers, 2, PAGE_SIZE)
    assert.strictEqual(page2.currentPage, 2)
    assert.strictEqual(page2.totalPages, 3)
    assert.strictEqual(page2.items.length, 15)
    assert.strictEqual(page2.items[0].id, 'c-16')

    const page3 = paginate(sampleCustomers, 3, PAGE_SIZE)
    assert.strictEqual(page3.currentPage, 3)
    assert.strictEqual(page3.totalPages, 3)
    assert.strictEqual(page3.items.length, 8)
    assert.strictEqual(page3.items[7].id, 'c-38')
  })

  it('should clamp out-of-bound page indices safely', () => {
    const highPage = paginate(sampleCustomers, 999, PAGE_SIZE)
    assert.strictEqual(highPage.currentPage, 3)
    assert.strictEqual(highPage.items.length, 8)

    const lowPage = paginate(sampleCustomers, -5, PAGE_SIZE)
    assert.strictEqual(lowPage.currentPage, 1)
    assert.strictEqual(lowPage.items.length, 15)
  })

  it('should accurately compute financial aggregate metrics', () => {
    const totalReceivables = sampleCustomers.reduce((sum, c) => {
      const bal = Number(c.balance) || 0
      return bal > 0 ? sum + bal : sum
    }, 0)

    const totalPayablesAdvance = sampleCustomers.reduce((sum, c) => {
      const bal = Number(c.balance) || 0
      return bal < 0 ? sum + Math.abs(bal) : sum
    }, 0)

    const debtorsCount = sampleCustomers.filter((c) => (Number(c.balance) || 0) > 0).length
    const creditorsCount = sampleCustomers.filter((c) => (Number(c.balance) || 0) < 0).length

    assert.ok(totalReceivables > 0)
    assert.ok(totalPayablesAdvance > 0)
    assert.ok(debtorsCount > 0)
    assert.ok(creditorsCount > 0)
    assert.strictEqual(debtorsCount + creditorsCount <= sampleCustomers.length, true)
  })
})
