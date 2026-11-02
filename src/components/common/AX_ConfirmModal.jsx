import React, { useState, useRef, useEffect } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

export function AX_ConfirmModal({
  isOpen,
  title = 'تأكيد الإجراء',
  message = 'هل أنت متأكد من تنفيذ هذا الإجراء؟',
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  isDestructive = false,
  requireHold = false,
  holdDurationMs = 1500,
  onConfirm,
  onCancel,
}) {
  useBodyScrollLock(isOpen)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setProgress(0)
      if (timerRef.current) cancelAnimationFrame(timerRef.current)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleStartHold = () => {
    if (!requireHold) return
    startTimeRef.current = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current
      const pct = Math.min(100, (elapsed / holdDurationMs) * 100)
      setProgress(pct)
      if (pct >= 100) {
        setProgress(100)
        onConfirm?.()
      } else {
        timerRef.current = requestAnimationFrame(tick)
      }
    }
    timerRef.current = requestAnimationFrame(tick)
  }

  const handleCancelHold = () => {
    if (!requireHold) return
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current)
      timerRef.current = null
    }
    setProgress(0)
  }

  const handleClick = () => {
    if (!requireHold) {
      onConfirm?.()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-6 max-w-md w-full shadow-level3 text-center space-y-4 overscroll-contain">
        <div
          className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${
            isDestructive ? 'bg-error-container text-error' : 'bg-secondary-container text-secondary-on-container'
          }`}
        >
          <AlertTriangle className="w-7 h-7 text-primary" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-black text-on-surface">{title}</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">{message}</p>
        </div>

        {requireHold && (
          <div className="text-[11px] font-bold text-primary bg-primary/10 py-1 px-3 rounded-full inline-block">
            اضغط مع الاستمرار على زر التأكيد لاكتمال الشحن والأمان
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-full border border-outline-variant/60 text-on-surface font-semibold text-sm hover:bg-surface-container transition-all duration-150 flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleClick}
            onMouseDown={handleStartHold}
            onMouseUp={handleCancelHold}
            onMouseLeave={handleCancelHold}
            onTouchStart={handleStartHold}
            onTouchEnd={handleCancelHold}
            className={`relative overflow-hidden flex-1 py-2.5 px-4 rounded-full font-extrabold text-sm text-white transition-all duration-150 shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2 select-none cursor-pointer ${
              isDestructive ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary-dark'
            }`}
          >
            {requireHold && (
              <div
                className="absolute inset-y-0 right-0 bg-white/35 transition-all pointer-events-none"
                style={{ width: `${progress}%` }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>
                {requireHold
                  ? progress > 0
                    ? `جاري التأكيد... ${Math.round(progress)}%`
                    : confirmText || 'اضغط مطولاً للتأكيد'
                  : confirmText}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AX_ConfirmModal
