import React, { useState, useMemo, useEffect } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  Building,
  Warehouse,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  Trash2,
  Power,
  Scissors,
  Truck,
  DollarSign,
  Briefcase,
  AlertCircle,
  Sliders,
  Link,
  Shield,
  Key,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_StaffInviteModal } from './AX_StaffInviteModal'
import { AX_StaffPermissionsEditModal } from './AX_StaffPermissionsEditModal'
import { AX_StaffInvitesList } from './AX_StaffInvitesList'
import { AX_StaffTable } from './AX_StaffTable'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { supabase } from '../../services/supabaseClient'

export function AX_StaffManager() {
  const {
    employees = [],
    warehouses = [],
    deleteEmployee,
    toggleEmployeeStatus,
    profile,
    staffInvites = [],
    revokeStaffInvite,
  } = useAXStore()

  const [activeSubTab, setActiveSubTab] = useState('staff')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [editPermissionsUser, setEditPermissionsUser] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmToggleId, setConfirmToggleId] = useState(null)
  const [confirmRevokeInviteId, setConfirmRevokeInviteId] = useState(null)

  const [invites, setInvites] = useState(() => {
    if (staffInvites && staffInvites.length > 0) return staffInvites
    try {
      return JSON.parse(localStorage.getItem('ax_staff_invites') || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (staffInvites && staffInvites.length >= 0) {
      setInvites(staffInvites)
    }
  }, [staffInvites])

  useEffect(() => {
    const fetchCloudData = async () => {
      try {
        const { data: inviteData } = await supabase
          .from('ax_staff_invites')
          .select('*')
          .order('created_at', { ascending: false })

        if (inviteData) {
          const mappedInvites = inviteData.map((d) => ({
            id: d.id,
            token: d.token,
            role: d.role,
            roleTitle: d.role_title || d.role,
            role_title: d.role_title || d.role,
            warehouseId: d.warehouse_id,
            warehouse_id: d.warehouse_id,
            warehouseName: d.warehouse_name || 'كافة الفروع والمخازن',
            warehouse_name: d.warehouse_name || 'كافة الفروع والمخازن',
            permissions: d.permissions,
            status: d.status,
            expiresAt: d.expires_at,
            expires_at: d.expires_at,
            createdAt: d.created_at,
            created_at: d.created_at,
          }))
          setInvites(mappedInvites)
          try {
            localStorage.setItem('ax_staff_invites', JSON.stringify(mappedInvites))
          } catch (e) {}
        }
      } catch (err) {}

      try {
        const { data: usersData } = await supabase.from('ax_users_profiles').select('*')
        if (usersData) {
          const mappedUsers = usersData.map((u) => {
            const whObj = warehouses.find((w) => w.id === u.branch_id)
            return {
              id: u.id,
              code: `EMP-${String(u.id).slice(-4)}`,
              name: u.full_name,
              role: u.role === 'super_admin' ? 'admin' : 'staff',
              roleTitle: u.role || 'موظف',
              phone: u.phone || '',
              email: u.email,
              warehouseId: u.branch_id || 'all',
              warehouseName: u.branch_id ? (whObj?.name || 'مخزن') : 'كافة الفروع والمخازن',
              status: u.is_active ? 'active' : 'suspended',
              permissions: u.permissions || {},
            }
          })

          try {
            localStorage.setItem('ax_staff_employees', JSON.stringify(mappedUsers))
          } catch (e) {}
          useAXStore.setState({ employees: mappedUsers })
        }
      } catch (err) {}
    }

    fetchCloudData()
  }, [warehouses])

  const activeCount = employees.filter((e) => e.status === 'active').length
  const adminCount = employees.filter((e) => e.role === 'admin').length
  const opsCount = employees.filter((e) => e.role !== 'admin').length

  const pendingInvitesCount = invites.filter(
    (i) => i.status === 'pending' && (!i.expiresAt || new Date(i.expiresAt) > new Date())
  ).length

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (roleFilter !== 'all' && emp.role !== roleFilter) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        emp.name?.toLowerCase().includes(q) ||
        emp.code?.toLowerCase().includes(q) ||
        emp.phone?.includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.roleTitle?.toLowerCase().includes(q) ||
        emp.warehouseName?.toLowerCase().includes(q)
      )
    })
  }, [employees, roleFilter, searchQuery])

  const handleInviteCreated = (newInvite) => {
    setInvites((prev) => [newInvite, ...prev])
  }

  const handleDeleteInvite = (inviteId) => {
    setConfirmRevokeInviteId(inviteId)
  }

  const handleConfirmRevokeInvite = async () => {
    if (confirmRevokeInviteId) {
      const inviteId = confirmRevokeInviteId
      const updated = invites.filter((i) => i.id !== inviteId)
      setInvites(updated)
      if (revokeStaffInvite) {
        await revokeStaffInvite(inviteId)
      } else {
        try { localStorage.setItem('ax_staff_invites', JSON.stringify(updated)) } catch {}
        try { await supabase.from('ax_staff_invites').delete().eq('id', inviteId) } catch (e) {}
      }
      setConfirmRevokeInviteId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (confirmDeleteId) {
      deleteEmployee(confirmDeleteId)
      try {
        await supabase.from('ax_users_profiles').delete().eq('id', confirmDeleteId)
      } catch (e) {}
      setConfirmDeleteId(null)
    }
  }

  const handleConfirmToggle = async () => {
    if (confirmToggleId) {
      const target = employees.find((e) => e.id === confirmToggleId)
      const nextStatus = target?.status === 'active' ? false : true
      toggleEmployeeStatus(confirmToggleId)
      try {
        await supabase
          .from('ax_users_profiles')
          .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
          .eq('id', confirmToggleId)
      } catch (e) {}
      setConfirmToggleId(null)
    }
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return {
          label: 'إدارة عليا',
          color: 'bg-primary/10 text-primary border-primary/20',
          icon: ShieldCheck,
        }
      case 'warehouse_manager':
        return {
          label: 'أمين مخزن',
          color: 'bg-secondary/10 text-secondary border-secondary/20',
          icon: Warehouse,
        }
      case 'operator':
        return {
          label: 'تفكيك وتشغيل',
          color: 'bg-rose-500/10 text-rose-800 border-rose-500/20',
          icon: Scissors,
        }
      case 'driver':
        return {
          label: 'توزيع ومبيعات',
          color: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
          icon: Truck,
        }
      case 'cashier':
        return {
          label: 'خزينة وتحصيل',
          color: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20',
          icon: DollarSign,
        }
      default:
        return {
          label: 'مستخدم نظام',
          color: 'bg-surface-low text-on-surface-variant border-outline-variant/30',
          icon: Briefcase,
        }
    }
  }

  return (
    <div className="w-full space-y-4 pb-20 lg:pb-6 animate-in fade-in duration-200">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-on-surface leading-tight">
              إدارة مستخدمي المنظومة والصلاحيات
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-bold text-on-surface-variant">
                حسابات الدخول ومصفوفة الصلاحيات الفردية
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-black transition-all shadow-sm shrink-0 cursor-pointer bg-primary hover:bg-primary-dark text-white active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>دعوة موظف جديد</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-on-surface-variant block">
              إجمالي المستخدمين
            </span>
            <div className="flex items-baseline gap-1 mt-1 whitespace-nowrap">
              <span className="text-base sm:text-2xl font-black font-mono text-on-surface">
                {employees.length}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant">حساب</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-on-surface-variant block">
              الحسابات المفعلة
            </span>
            <div className="flex items-baseline gap-1 mt-1 whitespace-nowrap">
              <span className="text-base sm:text-2xl font-black font-mono text-emerald-600">
                {activeCount}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant">نشط</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-on-surface-variant block">
              صلاحيات الإدارة
            </span>
            <div className="flex items-baseline gap-1 mt-1 whitespace-nowrap">
              <span className="text-base sm:text-2xl font-black font-mono text-primary">
                {adminCount}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant">مدير</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-on-surface-variant block">
              الدعوات المعلقة
            </span>
            <div className="flex items-baseline gap-1 mt-1 whitespace-nowrap">
              <span className="text-base sm:text-2xl font-black font-mono text-amber-600">
                {pendingInvitesCount}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant">دعوة</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Link className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-surface-container pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('staff')}
          className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'staff'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span>المستخدمين المعتمدين ({employees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('invites')}
          className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'invites'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span>روابط الدعوة المعلقة</span>
          {pendingInvitesCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">
              {pendingInvitesCount}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'invites' ? (
        <AX_StaffInvitesList
          invites={invites}
          onDeleteInvite={handleDeleteInvite}
        />
      ) : (
        <div className="space-y-4">
          <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-3 sm:p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-on-surface-variant absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="البحث بالاسم، الكود، الوظيفة، أو رقم الهاتف..."
                  className="w-full h-10 pr-9 pl-4 rounded-full bg-surface-low border border-outline-variant/40 focus:border-primary text-xs font-bold text-on-surface outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'كافة الأدوار' },
                  { id: 'admin', label: 'الإدارة' },
                  { id: 'warehouse_manager', label: 'المخازن' },
                  { id: 'operator', label: 'التصنيع' },
                  { id: 'driver', label: 'التوزيع' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRoleFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      roleFilter === f.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <AX_StaffTable
            filteredEmployees={filteredEmployees}
            getRoleBadge={getRoleBadge}
            onEditPermissions={setEditPermissionsUser}
            onConfirmDelete={setConfirmDeleteId}
            onConfirmToggle={setConfirmToggleId}
          />
        </div>
      )}

      <AX_StaffInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteCreated={handleInviteCreated}
        warehouses={warehouses}
      />

      <AX_StaffPermissionsEditModal
        isOpen={Boolean(editPermissionsUser)}
        onClose={() => setEditPermissionsUser(null)}
        user={editPermissionsUser}
        warehouses={warehouses}
      />

      <AX_ConfirmModal
        isOpen={Boolean(confirmDeleteId)}
        title="حذف حساب المستخدم"
        message="هل أنت متأكد من حذف هذا الحساب نهائياً وإلغاء صلاحيات دخوله للنظام؟"
        confirmText="تأكيد الحذف"
        cancelText="تراجع"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <AX_ConfirmModal
        isOpen={Boolean(confirmToggleId)}
        title="تعديل حالة حساب المستخدم"
        message="هل أنت متأكد من تبديل حالة حساب الدخول بين مفعل ومعطل؟"
        confirmText="تأكيد التبديل"
        cancelText="إلغاء"
        isDestructive={false}
        onConfirm={handleConfirmToggle}
        onCancel={() => setConfirmToggleId(null)}
      />

      <AX_ConfirmModal
        isOpen={Boolean(confirmRevokeInviteId)}
        title="إلغاء رابط الدعوة"
        message="هل أنت متأكد من إلغاء وحذف رابط الدعوة هذا نهائياً من المنظومة؟"
        confirmText="تأكيد الإلغاء"
        cancelText="تراجع"
        isDestructive={true}
        onConfirm={handleConfirmRevokeInvite}
        onCancel={() => setConfirmRevokeInviteId(null)}
      />
    </div>
  )
}
