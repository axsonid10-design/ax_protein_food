import { supabase } from '../services/supabaseClient'

const AX_ADMIN_CHAT_ID = '837246270'
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8959762689:AAFxDRv1Q7h7UDAy8tirQTqCf3ar5t9QpyI'

let lastErrorHash = ''
let lastSentTime = 0

const isBenignBrowserError = (err) => {
  if (!err) return false
  const s = String(err?.message || err?.reason || err || '').toLowerCase()
  return (
    s.includes('the object is in an invalid state') ||
    s.includes('failed to update a serviceworker') ||
    s.includes('resizeobserver loop') ||
    s.includes('user aborted a request') ||
    s.includes('abort_err') ||
    s.includes('aborterror') ||
    s.includes('chrome-extension://') ||
    s.includes('moz-extension://') ||
    s.includes('script error')
  )
}

export const AX_alertTelegram = async (label, errorObj, userEmail = '') => {
  if (isBenignBrowserError(errorObj)) {
    return
  }

  try {
    const time = new Date().toLocaleTimeString('en-GB')
    const page = typeof window !== 'undefined' ? window.location.pathname + window.location.search : 'Unknown'
    const systemName = typeof document !== 'undefined' ? document.title : 'AX_FROZEN_FOODS'

    let errStr = ''
    if (errorObj instanceof Error) {
      errStr = (errorObj.stack || errorObj.message || String(errorObj)).substring(0, 800)
    } else if (typeof errorObj === 'object') {
      errStr = JSON.stringify(errorObj, null, 2).substring(0, 800)
    } else {
      errStr = String(errorObj).substring(0, 800)
    }

    const currentHash = `${label}_${errStr.substring(0, 80)}_${page}`
    const now = Date.now()
    if (currentHash === lastErrorHash && now - lastSentTime < 30000) {
      return
    }
    lastErrorHash = currentHash
    lastSentTime = now

    const text = `🚨 خطأ في النظام [${systemName}]\n🔴 ${label}\n\n⏰ ${time}\n📍 ${page}\n\n${errStr}`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3500)
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: AX_ADMIN_CHAT_ID, text }),
        signal: controller.signal
      }).catch(() => {})
      clearTimeout(timeoutId)
    } catch {}

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent('ax-system-error-alert', {
          detail: {
            label,
            errStr,
            time,
            page,
            source: `${systemName} | ${userEmail || 'anonymous'} | ${page}`,
          },
        })
      )
    }

    if (supabase && typeof supabase.functions?.invoke === 'function') {
      supabase.functions.invoke('ax-web-push', {
        body: {
          project_slug: 'protein-food',
          userId: 'all',
          title: `🚨 رادار الأخطاء [${systemName}]`,
          message: `🔴 ${label}: ${errStr.substring(0, 130)}`,
          link: '/?tab=dashboard',
          tag: `err-${now}`
        }
      }).catch(() => {})
    }

    if (supabase && typeof supabase.from === 'function') {
      try {
        await supabase.from('ax_system_errors').insert({
          label,
          error_message: `[${label}] ${errStr.substring(0, 200)}`,
          stack_trace: errStr,
          source: `${systemName} | ${userEmail || 'anonymous'} | ${page}`,
          page_path: page,
          system_name: systemName,
          user_email: userEmail || null
        })
      } catch {}

      try {
        await supabase.from('ax_notifications').insert({
          title: `🚨 تنبيه خطأ تشغيلي: ${label}`,
          message: errStr.substring(0, 160),
          type: 'error',
          target_tab: 'dashboard',
          read: false
        })
      } catch {}
    }
  } catch {}
}
