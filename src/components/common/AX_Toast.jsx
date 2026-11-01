import React, { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, Loader2, X } from 'lucide-react'
import { axToast, subscribeToToasts } from '../../services/axToast.js'

export { axToast }
export const showToast = (message, type = 'info') => (axToast[type] ? axToast[type](message) : axToast.info(message))

export function AX_ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    return subscribeToToasts(setToasts)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      dir="rtl"
      className="fixed top-5 inset-x-0 z-[9999] pointer-events-none flex flex-col items-center gap-2.5 px-4 sm:px-6 select-none"
      role="region"
      aria-label="التنبيهات اللحظية"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success'
        const isError = toast.type === 'error'
        const isInfo = toast.type === 'info'
        const isLoading = toast.type === 'loading'

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto max-w-md w-full sm:w-auto min-w-[280px] sm:min-w-[320px] flex items-center justify-between gap-3 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-xl border transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
              isSuccess
                ? 'bg-slate-950/95 text-white border-emerald-500/50 shadow-emerald-950/40'
                : isError
                ? 'bg-slate-950/95 text-white border-rose-500/50 shadow-rose-950/40'
                : isInfo
                ? 'bg-slate-950/95 text-white border-primary/50 shadow-primary-950/40'
                : 'bg-slate-950/95 text-white border-amber-500/50 shadow-amber-950/40'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0 flex items-center justify-center">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 stroke-[2.5]" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400 stroke-[2.5]" />}
                {isInfo && <Info className="w-5 h-5 text-rose-300 stroke-[2.5]" />}
                {isLoading && <Loader2 className="w-5 h-5 text-amber-400 animate-spin stroke-[2.5]" />}
              </span>
              <span className="text-xs sm:text-sm font-black font-cairo text-white leading-normal truncate">
                {toast.message}
              </span>
            </div>

            <button
              type="button"
              onClick={() => axToast.dismiss(toast.id)}
              className="shrink-0 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default AX_ToastContainer
