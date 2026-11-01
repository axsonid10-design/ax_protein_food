import React, { useState, useEffect, useRef } from 'react'
import {
  Bell,
  BellRing,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  ArrowLeftRight,
  Wallet,
  Send,
  Loader2,
  X,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_PushNotificationService } from '../../services/AX_PushNotificationService'

export function AX_NotificationCenter({ isOpen, onClose }) {
  const {
    profile,
    notifications = [],
    markAllNotificationsRead,
    markNotificationRead,
    setActiveTab,
  } = useAXStore()

  const panelRef = useRef(null)

  const [pushStatus, setPushStatus] = useState('checking')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loadingPush, setLoadingPush] = useState(false)
  const [testingPush, setTestingPush] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')

  useEffect(() => {
    checkStatus()
  }, [profile?.id, isOpen])

  useEffect(() => {
    const handleOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside)
    }
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [isOpen, onClose])

  const checkStatus = async () => {
    if (!AX_PushNotificationService.isSupported()) {
      setPushStatus('unsupported')
      return
    }

    const perm = AX_PushNotificationService.getPermissionState()
    setPushStatus(perm)

    if (perm === 'granted' && profile?.id) {
      const sub = await AX_PushNotificationService.getActiveSubscription()
      setIsSubscribed(Boolean(sub))
    } else {
      setIsSubscribed(false)
    }
  }

  const handleEnablePush = async () => {
    if (!profile?.id) return
    setLoadingPush(true)
    setFeedbackMsg('')

    try {
      const res = await AX_PushNotificationService.subscribeUser(profile.id)
      const perm = AX_PushNotificationService.getPermissionState()

      if (res.success || perm === 'granted') {
        setIsSubscribed(true)
        setPushStatus('granted')
        setFeedbackMsg('تم تفعيل إشعارات الهاتف 24/7 بنجاح!')
        handleTestPush()
      } else if (res.reason === 'permission_denied') {
        setPushStatus('denied')
        setFeedbackMsg('تم رفض إذن الإشعارات من المتصفح.')
      } else {
        setFeedbackMsg('تعذر التفعيل، يرجى المحاولة لاحقاً.')
      }
    } catch {
      setFeedbackMsg('حدث خطأ أثناء التفعيل.')
    } finally {
      setLoadingPush(false)
    }
  }

  const handleTestPush = async () => {
    if (!profile?.id) return
    setTestingPush(true)
    setFeedbackMsg('')

    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200])
        }
        try {
          const reg = await navigator.serviceWorker.ready
          const origin = window.location.origin
          reg.showNotification('بروتين فود — إشعار فوري', {
            body: 'تم اختبار وصول إشعارات الهاتف واهتزاز الجهاز بنجاح!',
            icon: `${origin}/pwa-192x192.png`,
            badge: `${origin}/pwa-192x192.png`,
            image: `${origin}/og-image.png`,
            tag: 'test-push',
            vibrate: [200, 100, 200],
          })
        } catch {
          const origin = window.location.origin
          new Notification('بروتين فود — إشعار فوري', {
            body: 'تم اختبار وصول إشعارات الهاتف واهتزاز الجهاز بنجاح!',
            icon: `${origin}/pwa-192x192.png`,
          })
        }
      }

      await AX_PushNotificationService.sendTestPush(profile.id)
      setFeedbackMsg('تم إرسال إشعار تجريبي لجهازك بنجاح!')
    } catch {
      setFeedbackMsg('تم إرسال التنبيه التجريبي للجهاز.')
    } finally {
      setTestingPush(false)
    }
  }

  const handleItemClick = (notif) => {
    markNotificationRead(notif.id)
    if (notif.targetTab) {
      setActiveTab(notif.targetTab)
      onClose()
    }
  }

  if (!isOpen) return null

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div
      ref={panelRef}
      className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:top-12 sm:left-0 sm:left-4 z-50 w-auto sm:w-[380px] max-w-[calc(100vw-16px)] bg-surface-lowest border border-outline-variant/30 rounded-3xl shadow-xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-right"
      dir="rtl"
    >
      <div className="flex items-center justify-between border-b border-surface-container pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-black text-on-surface">
                مركز الإشعارات والتنبيهات
              </h3>
              {isSubscribed && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  مفعلة 24/7
                </span>
              )}
            </div>
            <span className="text-[11px] font-bold text-on-surface-variant">
              {unreadCount > 0 ? `${unreadCount} إشعارات غير مقروءة` : 'لا توجد تنبيهات جديدة'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-surface-low text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!isSubscribed && (
        <div className="p-3 rounded-2xl bg-surface-low border border-outline-variant/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-on-surface">
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              <span>إشعارات الهاتف (Web Push)</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
              غير مفعلة
            </span>
          </div>

          <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed">
            تصلك التنبيهات حتى والتطبيق مغلق وشاشة الهاتف مقفولة برنين واهتزاز فوري.
          </p>

          {feedbackMsg && (
            <div className="p-2 rounded-xl bg-primary/10 text-primary text-[11px] font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{feedbackMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={loadingPush}
              className="flex-1 py-1.5 px-3 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loadingPush ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>تفعيل إشعارات الهاتف</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black text-on-surface">سجل التنبيهات الحية</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
            >
              تحديد الكل كمقروء
            </button>
          )}
        </div>

        <div className="max-h-60 overflow-y-auto no-scrollbar space-y-2">
          {notifications.length === 0 ? (
            <div className="py-6 text-center text-xs font-bold text-on-surface-variant">
              لا توجد تنبيهات مسجلة
            </div>
          ) : (
            notifications.map((notif) => {
              const isUnread = !notif.read
              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                    isUnread
                      ? 'bg-primary/5 border-primary/30 hover:border-primary'
                      : 'bg-surface-low border-outline-variant/30 hover:border-outline-variant'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.type === 'transfer'
                        ? 'bg-amber-500/10 text-amber-600'
                        : notif.type === 'warning'
                        ? 'bg-error/10 text-error'
                        : 'bg-emerald-500/10 text-emerald-600'
                    }`}
                  >
                    {notif.type === 'transfer' ? (
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    ) : notif.type === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <Wallet className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-on-surface truncate block">
                        {notif.title}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant font-medium leading-tight truncate mt-0.5">
                      {notif.message}
                    </p>
                    <span className="text-[10px] font-mono text-outline-variant font-bold block mt-1">
                      {notif.time}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
