import React, { useState, useEffect } from 'react'
import { RefreshCw, Sparkles, X } from 'lucide-react'

export const RUNNING_VERSION = import.meta.env.VITE_APP_VERSION || '1.5.0'

const isNewerVersion = (remote, local) => {
  if (!remote || !local) return false
  if (remote === local) return false
  const rParts = String(remote).split('.').map((n) => parseInt(n, 10) || 0)
  const lParts = String(local).split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
    const r = rParts[i] || 0
    const l = lParts[i] || 0
    if (r > l) return true
    if (r < l) return false
  }
  return false
}

export function AppUpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [remoteVersion, setRemoteVersion] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const checkVersion = async () => {
    try {
      const res = await fetch(`/version.json?_t=${Date.now()}&_r=${Math.random().toString(36).substring(2)}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      if (!res.ok) return
      const data = await res.json()
      if (!data?.version) return

      if (isNewerVersion(data.version, RUNNING_VERSION)) {
        if (sessionStorage.getItem('ax_dismissed_update_version') === data.version) {
          return
        }
        setRemoteVersion(data.version)
        setUpdateAvailable(true)
      } else {
        setUpdateAvailable(false)
      }
    } catch {}
  }

  useEffect(() => {
    checkVersion()
    const interval = setInterval(checkVersion, 20000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkVersion()
    }
    const handleTrigger = () => checkVersion()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pageshow', handleTrigger)
    window.addEventListener('focus', handleTrigger)
    window.addEventListener('ax-pwa-ready', handleTrigger)
    window.addEventListener('ax-pwa-update-available', handleTrigger)
    window.addEventListener('ax-check-update', handleTrigger)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pageshow', handleTrigger)
      window.removeEventListener('focus', handleTrigger)
      window.removeEventListener('ax-pwa-ready', handleTrigger)
      window.removeEventListener('ax-pwa-update-available', handleTrigger)
      window.removeEventListener('ax-check-update', handleTrigger)
    }
  }, [])

  const applyUpdate = async () => {
    if (isUpdating) return
    setIsUpdating(true)
    sessionStorage.removeItem('ax_dismissed_update_version')
    localStorage.removeItem('ax_app_version')

    const bustUrl = window.location.origin + window.location.pathname + '?_v=' + Date.now()

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
          registrations.map(async (reg) => {
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' })
            }
            await reg.unregister().catch(() => {})
          })
        )
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map((name) => caches.delete(name))).catch(() => {})
      }
    } catch {}

    setTimeout(() => {
      window.location.replace(bustUrl)
    }, 150)
  }

  const dismissUpdate = () => {
    if (remoteVersion) {
      sessionStorage.setItem('ax_dismissed_update_version', remoteVersion)
    }
    setUpdateAvailable(false)
  }

  if (!updateAvailable || !remoteVersion) return null

  return (
    <div
      dir="rtl"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      className="fixed top-0 inset-x-0 z-[99999] pointer-events-auto bg-gradient-to-r from-[#991b1b] via-[#450a0a] to-[#991b1b] text-white border-b border-white/20 shadow-2xl pb-2.5 px-3 sm:px-6 transition-all duration-300 animate-in slide-in-from-top"
    >
      <div className="w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-rose-200 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-black">
              تحديث جديد للمنظومة
            </span>
            <span className="text-[11px] font-mono font-extrabold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">
              v{remoteVersion}
            </span>
            <span className="text-[11px] text-white/80 font-bold hidden md:inline-block">
              اضغط تحديث لتطبيق أحدث الميزات ومزامنة العمليات.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={applyUpdate}
            disabled={isUpdating}
            className="bg-white text-primary hover:bg-slate-100 px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-75 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'جاري التحديث...' : 'تحديث الآن'}</span>
          </button>
          <button
            type="button"
            onClick={dismissUpdate}
            aria-label="إغلاق التنبيه"
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AppUpdateNotifier
