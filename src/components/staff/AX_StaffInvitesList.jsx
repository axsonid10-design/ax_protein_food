import React, { useState } from 'react'
import { Link, Copy, Check, Trash2, Clock, Building2, ShieldCheck, Share2, MessageCircle } from 'lucide-react'

export function AX_StaffInvitesList({ invites = [], onDeleteInvite }) {
  const [copiedId, setCopiedId] = useState(null)

  const handleCopy = async (invite) => {
    const inviteUrl = `${window.location.origin}/?invite=${invite.token}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedId(invite.id)
      setTimeout(() => setCopiedId(null), 2500)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = inviteUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedId(invite.id)
      setTimeout(() => setCopiedId(null), 2500)
    }
  }

  const handleShareWhatsApp = (invite) => {
    const inviteUrl = `${window.location.origin}/?invite=${invite.token}`
    const rTitle = invite.roleTitle || invite.role_title || 'موظف'
    const whTitle = invite.warehouseName || invite.warehouse_name || 'كافة الفروع والمخازن'
    const text = `دعوة انضمام لمنظومة بروتين فود\nالوظيفة: ${rTitle}\nالفرع/المخزن: ${whTitle}\nرابط تفعيل حسابك مباشرة:\n${inviteUrl}`
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank')
  }

  if (invites.length === 0) {
    return (
      <div className="py-12 text-center bg-surface-lowest border border-outline-variant/30 rounded-3xl p-6 space-y-2">
        <Link className="w-8 h-8 text-on-surface-variant mx-auto opacity-40" />
        <h4 className="text-xs font-black text-on-surface">لا توجد روابط دعوة معلقة حالياً</h4>
        <p className="text-[11px] font-bold text-on-surface-variant">
          يمكنك توليد رابط دعوة جديد للموظفين وتحديد صلاحياتهم بالضغط على "دعوة موظف جديد".
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {invites.map((inv) => {
        const isCopied = copiedId === inv.id
        const expTime = inv.expiresAt || inv.expires_at
        const isExpired = expTime && new Date(expTime) < new Date()
        const rTitle = inv.roleTitle || inv.role_title || 'موظف'
        const whTitle = inv.warehouseName || inv.warehouse_name || 'كافة الفروع والمخازن'
        const cDate = inv.createdAt || inv.created_at

        return (
          <div
            key={inv.id}
            className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                  {inv.token}
                </span>
                <span className="text-xs font-black text-on-surface">
                  {rTitle}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-low border border-outline-variant/30 text-on-surface-variant">
                  {whTitle}
                </span>
                {isExpired && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 border border-rose-500/20">
                    منتهي الصلاحية
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] font-bold text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>تاريخ الصدور: {cDate ? cDate.split('T')[0] : 'اليوم'}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleCopy(inv)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                }`}
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'تم النسخ!' : 'نسخ رابط الانضمام'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareWhatsApp(inv)}
                className="px-3.5 py-1.5 rounded-full text-xs font-black bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                title="مشاركة عبر واتساب"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </button>

              <button
                type="button"
                onClick={() => onDeleteInvite(inv.id)}
                className="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-rose-500/10 transition-all cursor-pointer"
                title="إلغاء رابط الدعوة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
