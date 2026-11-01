import React from 'react'
import {
  Phone,
  Power,
  Key,
  Trash2,
} from 'lucide-react'

export function AX_StaffTable({
  filteredEmployees = [],
  getRoleBadge,
  onEditPermissions,
  onConfirmDelete,
  onConfirmToggle,
}) {
  return (
    <>
      <div className="hidden lg:block bg-surface-lowest border border-outline-variant/30 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-surface-low border-b border-surface-container text-[11px] font-black text-on-surface-variant h-11">
                <th className="px-4 py-2">كود الحساب</th>
                <th className="px-4 py-2">المستخدم وبيانات الدخول</th>
                <th className="px-4 py-2">الدور والمسمى الوظيفي</th>
                <th className="px-4 py-2">الفرع / المخزن التابع له</th>
                <th className="px-4 py-2">هاتف الاتصال</th>
                <th className="px-4 py-2">حالة الدخول</th>
                <th className="px-4 py-2 text-center">الصلاحيات</th>
                <th className="px-4 py-2 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-xs font-bold text-on-surface">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-on-surface-variant font-bold">
                    لا يوجد مستخدمين مسجلين مطابقين لمعايير الفلترة
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const roleBadge = getRoleBadge(emp.role)
                  const RoleIcon = roleBadge.icon
                  const isActive = emp.status === 'active'

                  return (
                    <tr
                      key={emp.id}
                      className="h-12 hover:bg-surface-low/60 transition-colors"
                    >
                      <td className="px-4 py-2 font-mono font-black text-primary text-[11px] whitespace-nowrap">
                        {emp.code}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isActive ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-rose-500'
                            }`}
                          />
                          <div>
                            <span className="font-black text-on-surface block leading-tight">
                              {emp.name}
                            </span>
                            <span className="text-[10px] font-mono text-on-surface-variant block mt-0.5">
                              {emp.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${roleBadge.color}`}
                        >
                          <RoleIcon className="w-3 h-3" />
                          <span>{emp.roleTitle}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2 text-on-surface-variant text-[11px] whitespace-nowrap">
                        {emp.warehouseName}
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] whitespace-nowrap">
                        <a
                          href={`tel:${emp.phone}`}
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{emp.phone}</span>
                        </a>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onConfirmToggle(emp.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-700 border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{isActive ? 'نشط' : 'معطل'}</span>
                        </button>
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onEditPermissions(emp)}
                          className="px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-black text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Key className="w-3 h-3" />
                          <span>تعديل الصلاحيات</span>
                        </button>
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onConfirmDelete(emp.id)}
                          className="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="حذف الحساب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
        {filteredEmployees.length === 0 ? (
          <div className="col-span-full py-12 text-center text-on-surface-variant font-bold bg-surface-lowest border border-outline-variant/30 rounded-3xl">
            لا يوجد مستخدمين مسجلين مطابقين لمعايير الفلترة
          </div>
        ) : (
          filteredEmployees.map((emp) => {
            const roleBadge = getRoleBadge(emp.role)
            const RoleIcon = roleBadge.icon
            const isActive = emp.status === 'active'

            return (
              <div
                key={emp.id}
                className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isActive ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <span className="font-black text-sm text-on-surface block leading-tight">
                        {emp.name}
                      </span>
                      <span className="text-[11px] font-mono text-on-surface-variant block mt-0.5">
                        {emp.code} • {emp.email}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${roleBadge.color}`}
                  >
                    <RoleIcon className="w-3 h-3" />
                    <span>{emp.roleTitle}</span>
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-surface-low border border-outline-variant/20 flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant font-bold">الفرع / المخزن:</span>
                  <span className="font-black text-on-surface">{emp.warehouseName}</span>
                </div>

                <div className="pt-2 border-t border-surface-container flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onConfirmToggle(emp.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{isActive ? 'نشط' : 'معطل'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditPermissions(emp)}
                      className="px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-black text-[11px] flex items-center gap-1 transition-all"
                    >
                      <Key className="w-3 h-3" />
                      <span>الصلاحيات</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onConfirmDelete(emp.id)}
                      className="p-1 rounded-full text-on-surface-variant hover:text-error hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

export default AX_StaffTable
