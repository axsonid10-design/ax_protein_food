import React, { useState } from 'react'
import {
  X,
  Link,
  Copy,
  Check,
  Share2,
  Building2,
  Sparkles,
  Send,
  UserCheck,
  MessageCircle,
} from 'lucide-react'
import {
  PRESET_PERMISSIONS,
  normalizePermissions,
} from '../../utils/permissionsConfig'
import { AX_PermissionsMatrix } from './AX_PermissionsMatrix'
import { useAXStore } from '../../store/useAXStore'
import { supabase } from '../../services/supabaseClient'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'

export function AX_StaffInviteModal({ isOpen, onClose, onInviteCreated, warehouses = [] }) {
  useBodyScrollLock(isOpen)

  const { systemSettings, employees = [], addStaffInvite } = useAXStore()

  const [roleTitle, setRoleTitle] = useState('كاشير مبيعات')
  const [assignedWarehouseId, setAssignedWarehouseId] = useState('all')
  const [permissions, setPermissions] = useState(() =>
    normalizePermissions(PRESET_PERMISSIONS.cashier.permissions)
  )
  const [generatedLink, setGeneratedLink] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  if (!isOpen) return null

  const applyPreset = (presetKey) => {
    const preset = PRESET_PERMISSIONS[presetKey]
    if (preset) {
      setRoleTitle(preset.title)
      setPermissions(normalizePermissions(preset.permissions))
    }
  }

  const handleCreateInvite = async (e) => {
    e.preventDefault()

    if (!roleTitle.trim()) {
      setErrorMessage('يرجى تحديد المسمى الوظيفي للموظف')
      return
    }

    setErrorMessage('')

    const token = `inv_${Math.random().toString(36).substring(2, 8)}${Date.now().toString(36)}`
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const whObj = warehouses.find((w) => w.id === assignedWarehouseId)
    const whName = assignedWarehouseId === 'all' ? 'كافة الفروع والمخازن' : whObj?.name || 'مخزن'

    const dbPayload = {
      token,
      role: roleTitle.includes('مدير') ? 'admin' : 'staff',
      role_title: roleTitle.trim(),
      warehouse_id: assignedWarehouseId,
      warehouse_name: whName,
      permissions,
      status: 'pending',
      expires_at: expiresAt,
    }

    let createdId = `invite-${Date.now()}`
    try {
      const { data, error } = await supabase
        .from('ax_staff_invites')
        .insert([dbPayload])
        .select()
        .single()
      if (!error && data?.id) {
        createdId = data.id
      }
    } catch (err) {}

    const localPayload = {
      id: createdId,
      token,
      role: dbPayload.role,
      roleTitle: dbPayload.role_title,
      role_title: dbPayload.role_title,
      warehouseId: assignedWarehouseId,
      warehouseName: whName,
      warehouse_id: assignedWarehouseId,
      warehouse_name: whName,
      permissions,
      status: 'pending',
      expiresAt,
      expires_at: expiresAt,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    try {
      const savedInvites = JSON.parse(localStorage.getItem('ax_staff_invites') || '[]')
      localStorage.setItem('ax_staff_invites', JSON.stringify([localPayload, ...savedInvites]))
    } catch (err) {}

    const inviteUrl = `${window.location.origin}/?invite=${token}`
    setGeneratedLink(inviteUrl)
    if (addStaffInvite) addStaffInvite(localPayload)
    if (onInviteCreated) onInviteCreated(localPayload)
  }

  const handleCopy = async () => {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2500)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = generatedLink
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2500)
    }
  }

  const handleShareWhatsApp = () => {
    if (!generatedLink) return
    const whObj = warehouses.find((w) => w.id === assignedWarehouseId)
    const whName = assignedWarehouseId === 'all' ? 'كافة الفروع والمخازن' : whObj?.name || 'مخزن'
    const text = `دعوة انضمام لمنظومة بروتين فود\nالوظيفة: ${roleTitle}\nالفرع/المخزن: ${whName}\nرابط تفعيل حسابك مباشرة:\n${generatedLink}`
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden overscroll-contain">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-on-surface">
                دعوة موظف جديد للنظام
              </h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                تحديد الصلاحيات وتوليد رابط تسجيل ذاتي للموظف
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

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-error/10 border border-error/20 text-error font-black text-xs text-center">
              {errorMessage}
            </div>
          )}

          {generatedLink ? (
            <div className="p-4 sm:p-6 rounded-3xl bg-surface-low border border-outline-variant/30 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-on-surface">
                  تم توليد رابط دعوة الموظف بنجاح
                </h4>
                <p className="text-xs font-bold text-on-surface-variant max-w-md mx-auto">
                  أرسل هذا الرابط للموظف ليقوم بإنشاء حسابه وكلمة المرور وتفعيل دخوله بالصلاحيات المحددة فوراً.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-lg mx-auto bg-surface-lowest p-2 rounded-2xl border border-outline-variant/40">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-transparent text-xs font-mono font-bold text-primary px-2 py-2 outline-none select-all"
                />
                <div className="flex items-center gap-1.5 shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-primary text-white hover:bg-primary-dark'
                    }`}
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="px-3.5 py-2 rounded-xl text-xs font-black bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>واتساب</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setGeneratedLink('')
                    onClose()
                  }}
                  className="px-6 py-2 rounded-full border border-outline-variant/50 text-xs font-black text-on-surface hover:bg-surface-lowest transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-on-surface">
                    قوالب الصلاحيات السريعة (Presets):
                  </span>
                  <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تخصيص فوري</span>
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
                  <label className="text-on-surface">المسمى الوظيفي للموظف:</label>
                  <input
                    type="text"
                    required
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="مثال: كاشير فرع التوزيع"
                    className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary text-on-surface font-bold outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-on-surface">المخزن / الفرع المخصص له:</label>
                  <AX_SearchableSelect
                    value={assignedWarehouseId}
                    onChange={setAssignedWarehouseId}
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
                  <Link className="w-4 h-4" />
                  <span>توليد رابط الدعوة</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
