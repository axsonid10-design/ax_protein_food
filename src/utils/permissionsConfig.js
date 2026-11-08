import {
  LayoutDashboard,
  Boxes,
  Warehouse,
  Scissors,
  Truck,
  Wallet,
  FileText,
  UserCog,
  Building2,
  DollarSign,
  Receipt,
  Scale,
  BarChart3,
  Users,
  BadgePercent,
} from 'lucide-react'

export const MODULE_PERMISSIONS_CONFIG = [
  {
    id: 'dashboard',
    label: 'الداشبورد والمؤشرات',
    icon: LayoutDashboard,
    type: 'scope_only',
    scopeKey: 'scope',
    scopeOptions: [
      { key: 'own', label: 'عملياته فقط' },
      { key: 'all', label: 'كل المنظومة' },
    ],
  },
  {
    id: 'invoices',
    label: 'المبيعات والفواتير',
    icon: FileText,
    type: 'scoped_options',
    scopeKey: 'scope',
    scopeOptions: [
      { key: 'own', label: 'فواتيره فقط' },
      { key: 'all', label: 'كل الفواتير' },
    ],
    options: [
      { key: 'create', label: 'إصدار فواتير بيع', default: true },
      { key: 'can_change_price', label: 'تعديل السعر يدوياً', default: false },
      { key: 'can_discount', label: 'تطبيق خصم', default: false },
      { key: 'cancel', label: 'مرتجع وإلغاء فاتورة', default: false },
      { key: 'delete', label: 'حذف الفاتورة نهائياً', default: false },
    ],
  },
  {
    id: 'items',
    label: 'دليل الأصناف',
    icon: Boxes,
    type: 'options',
    options: [
      { key: 'can_view_cost', label: 'رؤية أسعار الشراء والتكلفة', default: false },
      { key: 'create', label: 'إضافة أصناف جديدة', default: false },
      { key: 'edit', label: 'تعديل بيانات وأسعار الأصناف', default: false },
      { key: 'delete', label: 'حذف صنف من الدليل', default: false },
    ],
  },
  {
    id: 'warehouses',
    label: 'المخازن والتبريد',
    icon: Warehouse,
    type: 'options',
    options: [
      { key: 'can_view_all_warehouses', label: 'رؤية بضاعة كافة المخازن', default: false },
      { key: 'create_transfer', label: 'طلب تحويل مخزني', default: true },
      { key: 'approve_transfer', label: 'تأكيد واعتماد التحويلات', default: false },
      { key: 'audit_stock', label: 'إجراء جرد مخزني', default: false },
    ],
  },
  {
    id: 'manufacturing',
    label: 'التفكيك والتصنيع',
    icon: Scissors,
    type: 'options',
    options: [
      { key: 'create_order', label: 'إنشاء أمر تفكيك وتشغيل', default: true },
      { key: 'complete_order', label: 'اعتماد تسليم المصنعات', default: false },
      { key: 'edit_waste', label: 'تعديل نسب الهالك والفاقد', default: false },
    ],
  },
  {
    id: 'distribution',
    label: 'سيارات التوزيع والفان',
    icon: Truck,
    type: 'options',
    options: [
      { key: 'load_van', label: 'تحميل بضاعة الفان', default: true },
      { key: 'van_sale', label: 'البيع الميداني من السيارة', default: true },
      { key: 'return_stock', label: 'إرجاع البضاعة المتبقية للمخزن', default: true },
    ],
  },
  {
    id: 'treasury',
    label: 'الخزينة والماليات',
    icon: Wallet,
    type: 'options',
    options: [
      { key: 'can_view_all_accounts', label: 'رؤية أرصدة كافة الخزن والحسابات', default: false },
      { key: 'create_tx', label: 'تسجيل سند قبض / صرف', default: false },
      { key: 'approve_tx', label: 'اعتماد وترحيل السندات', default: false },
    ],
  },
  {
    id: 'reports',
    label: 'التقارير والمحاسبة',
    icon: BarChart3,
    type: 'options',
    options: [
      { key: 'view_financial', label: 'رؤية تقارير الأرباح والمصروفات', default: true },
      { key: 'view_ledgers', label: 'رؤية كشوف حسابات العملاء والموردين', default: true },
      { key: 'view_inventory', label: 'رؤية تقييم المخزون والبضاعة', default: true },
      { key: 'export_reports', label: 'طباعة وتصدير التقارير', default: true },
    ],
  },
  {
    id: 'customers',
    label: 'إدارة العملاء',
    icon: Users,
    type: 'options',
    options: [
      { key: 'create', label: 'إضافة عميل جديد', default: true },
      { key: 'edit', label: 'تعديل بيانات العملاء', default: true },
      { key: 'delete', label: 'حذف عميل', default: false },
      { key: 'view_balance', label: 'رؤية كشف الحساب والمديونيات', default: true },
    ],
  },
  {
    id: 'suppliers',
    label: 'إدارة الموردين',
    icon: Building2,
    type: 'options',
    options: [
      { key: 'create', label: 'إضافة مورد جديد', default: true },
      { key: 'edit', label: 'تعديل بيانات الموردين', default: true },
      { key: 'delete', label: 'حذف مورد', default: false },
      { key: 'view_balance', label: 'رؤية مستحقات المورد', default: true },
    ],
  },
  {
    id: 'sales_reps',
    label: 'المناديب والعمولات',
    icon: BadgePercent,
    type: 'options',
    options: [
      { key: 'create', label: 'إضافة مندوب جديد', default: false },
      { key: 'edit', label: 'تعديل بيانات ومستهدفات المندوب', default: false },
      { key: 'delete', label: 'حذف مندوب', default: false },
      { key: 'manage_commissions', label: 'تحديد وتعديل نسب العمولات', default: false },
      { key: 'view_ledger', label: 'رؤية كشف حساب العمولات والمسحوبات', default: true },
    ],
  },
  {
    id: 'staff',
    label: 'مستخدمي النظام والصلاحيات',
    icon: UserCog,
    type: 'options',
    options: [
      { key: 'invite_users', label: 'توليد روابط دعوة موظفين', default: false },
      { key: 'manage_permissions', label: 'تعديل مصفوفة الصلاحيات', default: false },
    ],
  },
  {
    id: 'expenses',
    label: 'المصروفات ومراكز التكلفة',
    icon: Receipt,
    type: 'options',
    options: [
      { key: 'create', label: 'تسجيل مصروف جديد', default: true },
      { key: 'edit', label: 'تعديل المصروفات', default: false },
      { key: 'delete', label: 'حذف مصروف', default: false },
      { key: 'manage_categories', label: 'إدارة بنود المصروفات', default: false },
      { key: 'settle_installments', label: 'سداد الأقساط المؤجلة', default: true },
    ],
  },
]

export const PRESET_PERMISSIONS = {
  cashier: {
    title: 'كاشير مبيعات',
    permissions: {
      dashboard: { view: false, scope: 'own' },
      invoices: { view: true, scope: 'own', create: true, can_change_price: false, can_discount: false, cancel: false, delete: false },
      items: { view: true, can_view_cost: false, create: false, edit: false, delete: false },
      warehouses: { view: true, can_view_all_warehouses: false, create_transfer: false, approve_transfer: false, audit_stock: false },
      manufacturing: { view: false, create_order: false, complete_order: false, edit_waste: false },
      distribution: { view: false, load_van: false, van_sale: false, return_stock: false },
      treasury: { view: true, can_view_all_accounts: false, create_tx: true, approve_tx: false },
      customers: { view: true, create: true, edit: false, delete: false, view_balance: true },
      suppliers: { view: false, create: false, edit: false, delete: false, view_balance: false },
      sales_reps: { view: false, create: false, edit: false, delete: false, manage_commissions: false, view_ledger: false },
      reports: { view: false, view_financial: false, view_ledgers: false, view_inventory: false, export_reports: false },
      staff: { view: false, invite_users: false, manage_permissions: false },
      expenses: { view: true, create: true, edit: false, delete: false, manage_categories: false, settle_installments: false },
    },
  },
  warehouse: {
    title: 'أمين مخزن تجميد',
    permissions: {
      dashboard: { view: true, scope: 'own' },
      invoices: { view: false, scope: 'own', create: false, can_change_price: false, can_discount: false, cancel: false, delete: false },
      items: { view: true, can_view_cost: true, create: true, edit: true, delete: false },
      warehouses: { view: true, can_view_all_warehouses: true, create_transfer: true, approve_transfer: true, audit_stock: true },
      manufacturing: { view: true, create_order: true, complete_order: false, edit_waste: false },
      distribution: { view: true, load_van: true, van_sale: false, return_stock: true },
      treasury: { view: false, can_view_all_accounts: false, create_tx: false, approve_tx: false },
      customers: { view: false, create: false, edit: false, delete: false, view_balance: false },
      suppliers: { view: true, create: true, edit: true, delete: false, view_balance: true },
      sales_reps: { view: false, create: false, edit: false, delete: false, manage_commissions: false, view_ledger: false },
      reports: { view: false, view_financial: false, view_ledgers: false, view_inventory: false, export_reports: false },
      staff: { view: false, invite_users: false, manage_permissions: false },
      expenses: { view: false, create: false, edit: false, delete: false, manage_categories: false, settle_installments: false },
    },
  },
  cutting_supervisor: {
    title: 'مشرف تفكيك وتشغيل',
    permissions: {
      dashboard: { view: false, scope: 'own' },
      invoices: { view: false, scope: 'own', create: false, can_change_price: false, can_discount: false, cancel: false, delete: false },
      items: { view: true, can_view_cost: false, create: false, edit: false, delete: false },
      warehouses: { view: true, can_view_all_warehouses: false, create_transfer: true, approve_transfer: false, audit_stock: false },
      manufacturing: { view: true, create_order: true, complete_order: true, edit_waste: true },
      distribution: { view: false, load_van: false, van_sale: false, return_stock: false },
      treasury: { view: false, can_view_all_accounts: false, create_tx: false, approve_tx: false },
      customers: { view: false, create: false, edit: false, delete: false, view_balance: false },
      suppliers: { view: false, create: false, edit: false, delete: false, view_balance: false },
      sales_reps: { view: false, create: false, edit: false, delete: false, manage_commissions: false, view_ledger: false },
      reports: { view: false, view_financial: false, view_ledgers: false, view_inventory: false, export_reports: false },
      staff: { view: false, invite_users: false, manage_permissions: false },
      expenses: { view: false, create: false, edit: false, delete: false, manage_categories: false, settle_installments: false },
    },
  },
  van_driver: {
    title: 'مندوب فان وتوزيع',
    permissions: {
      dashboard: { view: false, scope: 'own' },
      invoices: { view: true, scope: 'own', create: true, can_change_price: false, can_discount: false, cancel: false, delete: false },
      items: { view: true, can_view_cost: false, create: false, edit: false, delete: false },
      warehouses: { view: false, can_view_all_warehouses: false, create_transfer: false, approve_transfer: false, audit_stock: false },
      manufacturing: { view: false, create_order: false, complete_order: false, edit_waste: false },
      distribution: { view: true, load_van: true, van_sale: true, return_stock: true },
      treasury: { view: true, can_view_all_accounts: false, create_tx: true, approve_tx: false },
      customers: { view: true, create: true, edit: false, delete: false, view_balance: true },
      suppliers: { view: false, create: false, edit: false, delete: false, view_balance: false },
      sales_reps: { view: false, create: false, edit: false, delete: false, manage_commissions: false, view_ledger: false },
      reports: { view: false, view_financial: false, view_ledgers: false, view_inventory: false, export_reports: false },
      staff: { view: false, invite_users: false, manage_permissions: false },
      expenses: { view: false, create: false, edit: false, delete: false, manage_categories: false, settle_installments: false },
    },
  },
  accountant: {
    title: 'محاسب مالي',
    permissions: {
      dashboard: { view: true, scope: 'all' },
      invoices: { view: true, scope: 'all', create: true, can_change_price: true, can_discount: true, cancel: true, delete: false },
      items: { view: true, can_view_cost: true, create: false, edit: false, delete: false },
      warehouses: { view: true, can_view_all_warehouses: true, create_transfer: true, approve_transfer: true, audit_stock: true },
      manufacturing: { view: true, create_order: false, complete_order: false, edit_waste: false },
      distribution: { view: true, load_van: false, van_sale: false, return_stock: false },
      treasury: { view: true, can_view_all_accounts: true, create_tx: true, approve_tx: true },
      customers: { view: true, create: true, edit: true, delete: false, view_balance: true },
      suppliers: { view: true, create: true, edit: true, delete: false, view_balance: true },
      sales_reps: { view: true, create: true, edit: true, delete: false, manage_commissions: true, view_ledger: true },
      reports: { view: true, view_financial: true, view_ledgers: true, view_inventory: true, export_reports: true },
      staff: { view: false, invite_users: false, manage_permissions: false },
      expenses: { view: true, create: true, edit: true, delete: false, manage_categories: true, settle_installments: true },
    },
  },
  admin: {
    title: 'مدير عام وتشغيل',
    permissions: {
      dashboard: { view: true, scope: 'all' },
      invoices: { view: true, scope: 'all', create: true, can_change_price: true, can_discount: true, cancel: true, delete: true },
      items: { view: true, can_view_cost: true, create: true, edit: true, delete: true },
      warehouses: { view: true, can_view_all_warehouses: true, create_transfer: true, approve_transfer: true, audit_stock: true },
      manufacturing: { view: true, create_order: true, complete_order: true, edit_waste: true },
      distribution: { view: true, load_van: true, van_sale: true, return_stock: true },
      treasury: { view: true, can_view_all_accounts: true, create_tx: true, approve_tx: true },
      customers: { view: true, create: true, edit: true, delete: true, view_balance: true },
      suppliers: { view: true, create: true, edit: true, delete: true, view_balance: true },
      sales_reps: { view: true, create: true, edit: true, delete: true, manage_commissions: true, view_ledger: true },
      reports: { view: true, view_financial: true, view_ledgers: true, view_inventory: true, export_reports: true },
      staff: { view: true, invite_users: true, manage_permissions: true },
      expenses: { view: true, create: true, edit: true, delete: true, manage_categories: true, settle_installments: true },
    },
  },
  sales_rep: {
    title: 'مندوب مبيعات خارجي',
    permissions: {
      dashboard: { view: false, scope: 'own' },
      invoices: { view: true, scope: 'own', create: true, can_change_price: false, can_discount: false, cancel: false, delete: false },
      items: { view: true, can_view_cost: false, create: false, edit: false, delete: false },
      warehouses: { view: false, can_view_all_warehouses: false, create_transfer: false, approve_transfer: false, audit_stock: false },
      manufacturing: { view: false, create_order: false, complete_order: false, edit_waste: false },
      distribution: { view: true, load_van: true, van_sale: true, return_stock: true },
      treasury: { view: true, can_view_all_accounts: false, create_tx: true, approve_tx: false },
      customers: { view: true, create: true, edit: false, delete: false, view_balance: true },
      suppliers: { view: false, create: false, edit: false, delete: false, view_balance: false },
      sales_reps: { view: true, create: false, edit: false, delete: false, manage_commissions: false, view_ledger: true },
      reports: { view: false, view_financial: false, view_ledgers: false, view_inventory: false, export_reports: false },
      staff: { view: false, invite_users: false, manage_permissions: false },
      expenses: { view: false, create: false, edit: false, delete: false, manage_categories: false, settle_installments: false },
    },
  },
  warehouse_manager: {
    title: 'مدير مخازن وتبريد',
    permissions: {
      dashboard: { view: true, scope: 'all' },
      invoices: { view: false, scope: 'own', create: false, can_change_price: false, can_discount: false, cancel: false, delete: false },
      items: { view: true, can_view_cost: true, create: true, edit: true, delete: false },
      warehouses: { view: true, can_view_all_warehouses: true, create_transfer: true, approve_transfer: true, audit_stock: true },
      manufacturing: { view: true, create_order: true, complete_order: true, edit_waste: true },
      distribution: { view: true, load_van: true, van_sale: false, return_stock: true },
      treasury: { view: false, can_view_all_accounts: false, create_tx: false, approve_tx: false },
      customers: { view: false, create: false, edit: false, delete: false, view_balance: false },
      suppliers: { view: true, create: true, edit: true, delete: false, view_balance: true },
      sales_reps: { view: false, create: false, edit: false, delete: false, manage_commissions: false, view_ledger: false },
      reports: { view: true, view_financial: false, view_ledgers: false, view_inventory: true, export_reports: true },
      staff: { view: false, invite_users: false, manage_permissions: false },
      expenses: { view: true, create: true, edit: false, delete: false, manage_categories: false, settle_installments: false },
    },
  },
}

export function normalizePermissions(rawPermissions = {}) {
  if (Array.isArray(rawPermissions)) {
    if (rawPermissions.includes('all')) {
      return { ...PRESET_PERMISSIONS.admin.permissions }
    }
    if (rawPermissions.includes('operational')) {
      return {
        ...PRESET_PERMISSIONS.warehouse.permissions,
        invoices: { ...PRESET_PERMISSIONS.cashier.permissions.invoices },
        treasury: { ...PRESET_PERMISSIONS.cashier.permissions.treasury },
        customers: { ...PRESET_PERMISSIONS.cashier.permissions.customers },
      }
    }
    return {}
  }
  const source = (rawPermissions && typeof rawPermissions === 'object' && !Array.isArray(rawPermissions))
    ? rawPermissions
    : {}
  const result = {}
  MODULE_PERMISSIONS_CONFIG.forEach((mod) => {
    const userMod = source[mod.id] || {}
    result[mod.id] = {
      view: Boolean(userMod.view),
      ...(mod.scopeKey ? { scope: userMod.scope || 'own' } : {}),
      ...(mod.options
        ? mod.options.reduce((acc, opt) => {
            acc[opt.key] = userMod[opt.key] !== undefined ? Boolean(userMod[opt.key]) : Boolean(opt.default)
            return acc
          }, {})
        : {}),
    }
  })
  return result
}

export function isMasterUser(user) {
  if (!user) return false
  const email = (user.email || '').trim().toLowerCase()
  return (
    email === 'axsonid@gmail.com' ||
    email === 'axonid@gmail.com' ||
    email === 'abdalshafy@axsonid.com' ||
    user.role === 'super_admin' ||
    user.is_master === true ||
    user.isMaster === true
  )
}

export function hasModulePermission(user, moduleId, action = 'view') {
  if (!user) return false
  if (isMasterUser(user) || user.role === 'admin') return true
  const perms = Array.isArray(user.permissions) ? normalizePermissions(user.permissions) : (user.permissions || {})
  const mod = perms[moduleId]
  if (!mod || !mod.view) return false
  if (action === 'view') return true
  return Boolean(mod[action])
}

export function hasModuleAccess(user, moduleId) {
  if (!user) return false
  if (isMasterUser(user)) return true
  if (moduleId === 'staff' || moduleId === 'recycle_bin') {
    return isMasterUser(user) || user.role === 'super_admin' || user.role === 'admin'
  }
  if (moduleId === 'employees') {
    return isMasterUser(user) || user.role === 'super_admin' || user.role === 'admin' || user.role === 'accountant' || user.role === 'branch_manager'
  }
  if (moduleId === 'expenses') {
    if (isMasterUser(user) || user.role === 'admin' || user.role === 'super_admin' || user.role === 'accountant') return true
    const perms = Array.isArray(user.permissions) ? normalizePermissions(user.permissions) : (user.permissions || {})
    const mod = perms[moduleId]
    return Boolean(mod && mod.view)
  }
  if (moduleId === 'sales' || moduleId === 'purchases') {
    if (isMasterUser(user) || user.role === 'admin' || user.role === 'super_admin') return true
    const perms = Array.isArray(user.permissions) ? normalizePermissions(user.permissions) : (user.permissions || {})
    const mod = perms[moduleId] || perms['invoices']
    return Boolean(mod && mod.view)
  }
  if (user.role === 'admin') return true
  const perms = Array.isArray(user.permissions) ? normalizePermissions(user.permissions) : (user.permissions || {})
  const mod = perms[moduleId]
  return Boolean(mod && mod.view)
}

export function getFirstAccessibleTab(user) {
  const tabsOrder = [
    'dashboard',
    'invoices',
    'items',
    'warehouses',
    'manufacturing',
    'distribution',
    'treasury',
    'expenses',
    'customers',
    'suppliers',
    'sales_reps',
    'reports',
    'employees',
    'staff',
  ]
  for (const tab of tabsOrder) {
    if (hasModuleAccess(user, tab)) return tab
  }
  return 'dashboard'
}
