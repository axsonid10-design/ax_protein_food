import React, { useState, useEffect } from 'react'
import { Download, CheckCircle2 } from 'lucide-react'

export function AX_InstallPwaButton({ className = '' }) {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true)
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
    if (!promptEvent) return

    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setCanInstall(false)
    }
    window.__deferredPwaPrompt = null
  }

  if (isInstalled) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container border border-secondary text-secondary-on-container text-xs font-bold ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
        <span>تطبيق مثبت</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-dark text-white font-extrabold text-xs shadow-level1 transition-all duration-150 active:scale-95 cursor-pointer ${className}`}
      title="تثبيت المنظومة كتطبيق مستقل على هاتفك"
    >
      <Download className="w-3.5 h-3.5" />
      <span>تثبيت التطبيق</span>
    </button>
  )
}

export default AX_InstallPwaButton
