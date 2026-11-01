import React, { useState, useEffect } from 'react'
import { AlertOctagon, Copy, X, Check } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useAXStore } from '../../store/useAXStore'

export function AX_InAppErrorAlert() {
  const profile = useAXStore((state) => state.profile)
  const isMaster =
    profile?.isMaster ||
    profile?.role === 'super_admin' ||
    profile?.email === 'axsonid@gmail.com' ||
    profile?.email === 'axonid@gmail.com'

  const [activeAlert, setActiveAlert] = useState(null)
  const [copied, setCopied] = useState(false)

  const triggerAlert = (data) => {
    setActiveAlert({
      id: Date.now(),
      label: data.label || 'خطأ تشغيلي',
      message: data.error_message || data.errStr || data.message || 'حدث خطأ غير متوقع',
      stack: data.stack_trace || data.stack || data.errStr || '',
      source: data.source || data.page || 'المنظومة',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
    })
    setCopied(false)

    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200])
      }
    } catch {}
  }

  useEffect(() => {
    if (!isMaster) return

    const handleLocal = (e) => {
      if (e?.detail) {
        triggerAlert(e.detail)
      }
    }

    window.addEventListener('ax-system-error-alert', handleLocal)

    let channel = null
    if (supabase && typeof supabase.channel === 'function') {
      channel = supabase
        .channel('realtime:ax_system_errors')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ax_system_errors' },
          (payload) => {
            if (payload?.new) {
              triggerAlert(payload.new)
            }
          }
        )
        .subscribe()
    }

    return () => {
      window.removeEventListener('ax-system-error-alert', handleLocal)
      if (channel && supabase && typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(channel)
      }
    }
  }, [isMaster])

  useEffect(() => {
    if (!activeAlert) return
    const timer = setTimeout(() => {
      setActiveAlert(null)
    }, 15000)
    return () => clearTimeout(timer)
  }, [activeAlert])

  const handleCopy = () => {
    if (!activeAlert) return
    const textToCopy = `🚨 تقرير خطأ من شاشة المشرف:
• العنوان: ${activeAlert.label}
• الوقت: ${activeAlert.time}
• المصدر: ${activeAlert.source}
• التفاصيل:
${activeAlert.stack || activeAlert.message}`

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  if (!isMaster || !activeAlert) return null

  return (
    <div
      dir="rtl"
      className="fixed top-14 inset-x-3 sm:inset-x-auto sm:left-6 sm:max-w-md z-[99998] animate-in slide-in-from-top-4 duration-200"
    >
      <div className="bg-rose-950/95 text-white border-2 border-rose-500/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl space-y-2">
        <div className="flex items-center justify-between gap-2 border-b border-rose-800/60 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-rose-600 flex items-center justify-center animate-pulse">
              <AlertOctagon className="w-3.5 h-3.5 text-white" />
            </span>
            <span className="text-xs font-black text-rose-200">
              رادار أخطاء المنظومة (إشعار المشرف)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveAlert(null)}
            className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-800/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1 text-right">
          <div className="text-xs font-black text-white flex items-center justify-between">
            <span>{activeAlert.label}</span>
            <span className="text-[10px] font-mono text-rose-300">{activeAlert.time}</span>
          </div>
          <p className="text-[11px] text-rose-200 font-bold line-clamp-2 leading-relaxed">
            {activeAlert.message}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-rose-900/40">
          <span className="text-[10px] font-mono text-rose-300 truncate max-w-[180px]">
            {activeAlert.source}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black transition-all active:scale-95 cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'تم النسخ' : 'نسخ للأيجنت'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AX_InAppErrorAlert
