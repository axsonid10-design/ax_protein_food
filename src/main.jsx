import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AX_alertTelegram } from './utils/AX_TelegramAlert'

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.error) {
      AX_alertTelegram('WINDOW_UNCAUGHT_ERROR', event.error)
    }
  })
  window.addEventListener('unhandledrejection', (event) => {
    AX_alertTelegram('UNHANDLED_PROMISE_REJECTION', event.reason || 'Promise rejected')
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
