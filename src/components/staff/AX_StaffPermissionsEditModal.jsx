import React, { useState, useEffect } from 'react'
import { X, ShieldCheck, Check, Sparkles, Building2 } from 'lucide-react'
import {
  PRESET_PERMISSIONS,
  normalizePermissions,
} from '../../utils/permissionsConfig'
import { AX_PermissionsMatrix } from './AX_PermissionsMatrix'
import { useAXStore } from '../../store/useAXStore'
import { supabase } from '../../services/supabaseClient'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'

export function AX_StaffPermissionsEditModal({ isOpen, onClose, user, warehouses = [] }) {
  useBodyScrollLock(isOpen && Boolean(user))

  const { updateEmployee, updateStaffPermissions } = useAXStore()

  const [roleTitle, setRoleTitle] = useState('')
  const [warehouseId, setWarehouseId] = useState('all')
  const [permissions, setPermissions] = useState({})
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      setRoleTitle(user.roleTitle || user.role || 'موظف')
      setWarehouseId(user.warehouseId || 'all')
      setPermissions(normalizePermissions(user.permissions || {}))
    }
  }, [user])

  if (!isOpen || !user) return null

  const applyPreset = (presetKey) => {
    const preset = PRESET_PERMISSIONS[presetKey]
    if (preset) {
      setRoleTitle(preset.title)
      setPermissions(normalizePermissions(preset.permissions))
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const whObj = warehouses.find((w) => w.id === warehouseId)
    const whName = warehouseId === 'all' ? 'كافة الفروع والمخازن' : whObj?.name || 'مخزن'

    if (updateStaffPermissions) {
      await updateStaffPermissions(user.id, {
        roleTitle: roleTitle.trim(),
        warehouseId,
        warehouseName: whName,
        permissions,
      })
    } else {
      updateEmployee(user.id, {
        roleTitle: roleTitle.trim(),
        warehouseId,
        warehouseName: whName,
        permissions,
      })
      try {
        await supabase
          .from('ax_users_profiles')
          .update({
            role: roleTitle.trim(),
            branch_id: warehouseId === 'all' ? null : warehouseId,
            permissions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      } catch (err) {}
    }

    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
      onClose()
    }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden overscroll-contain">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-on-surface">
                تعديل صلاحيات: {user.name}
              </h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                تخصيص مصفوفة الأذونات والتحكم في الأقسام المفتوحة
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {savedSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 font-black text-xs text-center flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              <span>تم حفظ الصلاحيات بنجاح وتطبيقها فوراً</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-on-surface">
                قوالب سريعة:
              </span>
              <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>إعادة ضبط سريعة</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'cashier', label: 'كاشير مبيعات' },
                { key: 'warehouse', label: 'أمين مخزن تجميد' },
                { key: 'cutting_supervisor', label: 'مشرف تصنيع' },
                { key: 'van_driver', label: 'مندوب توزيع' },
                { key: 'accountant', label: 'محاسب مالي' },
                { key: 'admin', label: 'مدير عام' },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  className="px-3 py-1.5 rounded-full bg-surface-low hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface transition-all active:scale-95 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
            <div className="space-y-1.5">
              <label className="text-on-surface">المسمى الوظيفي المعتمد:</label>
              <input
                type="text"
                required
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary text-on-surface font-bold outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-on-surface">المخزن / الفرع المسؤول عنه:</label>
              <AX_SearchableSelect
                value={warehouseId}
                onChange={setWarehouseId}
                options={[
                  { value: 'all', label: 'كافة الفروع والمخازن' },
                  ...warehouses.map((wh) => ({
                    value: wh.id,
                    label: wh.name,
                    badge: wh.type === 'factory' ? 'مصنع' : wh.type === 'van' ? 'فان توزيع' : '',
                  })),
                ]}
                searchable={false}
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-surface-container">
            <span className="text-xs font-black text-on-surface block">
              مصفوفة الصلاحيات الموديلية:
            </span>
            <AX_PermissionsMatrix
              permissions={permissions}
              onChange={setPermissions}
            />
          </div>

          <div className="pt-3 border-t border-surface-container flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-outline-variant/50 text-xs font-bold text-on-surface hover:bg-surface-low transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>حفظ الصلاحيات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
