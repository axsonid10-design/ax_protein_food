import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AX_alertTelegram } from './utils/AX_TelegramAlert'

;(function () {
  const _orig = Number.prototype.toLocaleString
  Number.prototype.toLocaleString = function (locale, opts) {
    const merged = { maximumFractionDigits: 3, ...opts }
    if (merged.maximumFractionDigits > 3) merged.maximumFractionDigits = 3
    return _orig.call(this, locale ?? 'en-US', merged)
  }
})()

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = String(event.error?.stack || event.error?.message || event.message || '')
    if (msg.includes('ResizeObserver') || msg.includes('ServiceWorker') || msg.includes('registerSW')) return
    if (event.error) {
      AX_alertTelegram('WINDOW_UNCAUGHT_ERROR', event.error)
    }
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason?.stack || event.reason?.message || event.reason || '')
    if (
      reasonStr.includes('registerSW') ||
      reasonStr.includes('ServiceWorker') ||
      reasonStr.includes('serviceWorker') ||
      reasonStr.includes('ResizeObserver') ||
      reasonStr.includes('AbortError') ||
      reasonStr.includes('Failed to fetch') ||
      reasonStr.includes('Load failed')
    ) {
      return
    }
    AX_alertTelegram('UNHANDLED_PROMISE_REJECTION', event.reason || 'Promise rejected')
  })

  if ('serviceWorker' in navigator) {
    const hadController = Boolean(navigator.serviceWorker.controller)
    let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return
      reloaded = true
      window.location.reload()
    })
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.warn('[PWA] SW registration suppressed:', err?.message || err)
      })
    })
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
