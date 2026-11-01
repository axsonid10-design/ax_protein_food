import React, { useState, useEffect } from 'react'
import { BellRing, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import { AX_PushNotificationService } from '../../services/AX_PushNotificationService'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

export function AX_MandatoryPushModal({ profile }) {
  const [isOpen, setIsOpen] = useState(false)
  useBodyScrollLock(isOpen)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    if (!profile?.id) {
      setIsOpen(false)
      return
    }

    if (!AX_PushNotificationService.isSupported()) {
      return
    }

    const perm = AX_PushNotificationService.getPermissionState()
    const isSubscribed = localStorage.getItem('ax_push_subscribed') === 'true'
    const dismissCount = parseInt(localStorage.getItem('ax_push_dismiss_count') || '0', 10)

    if (perm === 'granted') {
      localStorage.setItem('ax_push_subscribed', 'true')
      setIsOpen(false)
      AX_PushNotificationService.subscribeUser(profile.id).catch(() => {})
      return
    }

    if (perm === 'denied' || isSubscribed || dismissCount >= 1) {
      setIsOpen(false)
      return
    }

    const postponed = sessionStorage.getItem(`ax_push_postponed_${profile.id}`)
    if (!postponed) {
      setIsOpen(true)
    }
  }, [profile?.id])

  const handleActivate = async () => {
    if (!profile?.id) return
    setLoading(true)
    setStatusMessage('')

    try {
      const res = await AX_PushNotificationService.subscribeUser(profile.id)
      const newPerm = AX_PushNotificationService.getPermissionState()

      if (res.success || newPerm === 'granted') {
        localStorage.setItem('ax_push_subscribed', 'true')
        setStatusMessage('تم تفعيل إشعارات سلاسل التبريد بنجاح!')
        try {
          await AX_PushNotificationService.sendTestPush(profile.id)
        } catch {}
        setTimeout(() => {
          setIsOpen(false)
        }, 800)
      } else {
        setStatusMessage('يرجى منح الإذن من نافذة المتصفح.')
      }
    } catch {
      setStatusMessage('تعذر إكمال التفعيل حالياً.')
    } finally {
      setLoading(false)
    }
  }

  const handlePostpone = () => {
    const current = parseInt(localStorage.getItem('ax_push_dismiss_count') || '0', 10)
    localStorage.setItem('ax_push_dismiss_count', (current + 1).toString())
    if (profile?.id) {
      sessionStorage.setItem(`ax_push_postponed_${profile.id}`, 'true')
    }
    setIsOpen(false)
  }

  const isGranted =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    (Notification.permission === 'granted' || Notification.permission === 'denied')

  if (!isOpen || isGranted) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-6 max-w-sm w-full shadow-level3 text-center space-y-4 overscroll-contain">
        <div className="w-14 h-14 mx-auto rounded-full bg-secondary-container text-secondary-on-container flex items-center justify-center">
          <BellRing className="w-7 h-7 text-primary" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-black text-on-surface">
            إشعارات النظام
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
            تنبيهات فورية بأذون الاستلام والتحويلات المعلقة حتى والتطبيق مغلق.
          </p>
        </div>

        {statusMessage && (
          <div className="p-2.5 rounded-xl bg-surface-container text-xs font-bold text-primary flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleActivate}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-full bg-primary hover:bg-primary-container text-white font-extrabold text-sm shadow-level1 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{loading ? 'جاري التفعيل...' : 'تفعيل الإشعارات الفورية'}</span>
          </button>

          <button
            type="button"
            onClick={handlePostpone}
            className="w-full py-2 px-4 rounded-full text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
          >
            تذكيري لاحقاً
          </button>
        </div>
      </div>
    </div>
  )
}

export default AX_MandatoryPushModal
