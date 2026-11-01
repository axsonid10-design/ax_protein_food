import React, { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export function AX_InstallPwaBanner() {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean(sessionStorage.getItem('ax_pwa_session_dismissed'))
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true)
      return
    }

    if (sessionStorage.getItem('ax_pwa_session_dismissed')) {
      setIsDismissed(true)
      return
    }

    if (window.__deferredPwaPrompt) {
      setCanInstall(true)
    }

    const handlePwaReady = () => setCanInstall(true)
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      window.__deferredPwaPrompt = e
      setCanInstall(true)
    }
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      window.__deferredPwaPrompt = null
    }

    window.addEventListener('ax-pwa-ready', handlePwaReady)
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('ax-pwa-ready', handlePwaReady)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    const promptEvent = window.__deferredPwaPrompt
    if (promptEvent) {
      promptEvent.prompt()
      const { outcome } = await promptEvent.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setCanInstall(false)
      }
      window.__deferredPwaPrompt = null
    } else {
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        alert('لتثبيت التطبيق على جهازك: اضغط على زر المشاركة ثم اختر "إضافة إلى الشاشة الرئيسية"')
      } else {
        alert('لتثبيت التطبيق: افتح خيارات المتصفح (⋮) ثم اختر "تثبيت التطبيق" أو "Install App"')
      }
    }
  }

  const handleDismiss = () => {
    sessionStorage.setItem('ax_pwa_session_dismissed', 'true')
    setIsDismissed(true)
  }

  if (isInstalled || isDismissed) {
    return null
  }

  return (
    <div className="w-full bg-[#450a0a] text-white border-b border-[#991b1b]/40 px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3 text-xs shadow-sm animate-in fade-in">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-full overflow-hidden border border-[#b91c1c] bg-white shrink-0 shadow-xs flex items-center justify-center">
          <img src="/pwa-192x192.png" alt="بروتين فود" className="w-full h-full object-cover" />
        </div>
        <span className="font-black text-slate-100 truncate">
          تثبيت التطبيق
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#991b1b] hover:bg-[#7f1d1d] text-white font-black text-xs shadow-sm transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>تثبيت التطبيق</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="إغلاق التنبيه"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default AX_InstallPwaBanner
