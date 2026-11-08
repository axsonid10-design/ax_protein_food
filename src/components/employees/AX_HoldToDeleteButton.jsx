import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2 } from 'lucide-react'

export function AX_HoldToDeleteButton({
  onTrigger,
  durationMs = 2500,
  label = 'حذف',
  compact = false,
  className = '',
  title = 'اضغط مطولاً لمدة 2.5 ثانية للحذف',
  disabled = false,
}) {
  const [isHolding, setIsHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000))
  const animFrameRef = useRef(null)
  const startTimeRef = useRef(null)
  const triggeredRef = useRef(false)

  const stopHold = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    setIsHolding(false)
    setProgress(0)
    setSecondsLeft(Math.ceil(durationMs / 1000))
    startTimeRef.current = null
  }, [durationMs])

  const startHold = useCallback(
    (e) => {
      if (disabled) return
      if (e.button !== undefined && e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()

      triggeredRef.current = false
      setIsHolding(true)
      setProgress(0)
      const initialSeconds = Math.ceil(durationMs / 1000)
      setSecondsLeft(initialSeconds)
      const start = Date.now()
      startTimeRef.current = start

      const updateProgress = () => {
        const now = Date.now()
        const elapsed = now - start
        const currentProgress = Math.min(100, (elapsed / durationMs) * 100)
        const currentSeconds = Math.max(1, Math.ceil((durationMs - elapsed) / 1000))

        setProgress(currentProgress)
        setSecondsLeft(currentSeconds)

        if (elapsed >= durationMs) {
          if (!triggeredRef.current) {
            triggeredRef.current = true
            stopHold()
            try {
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([40, 40, 80])
              }
            } catch {}
            if (onTrigger) {
              onTrigger()
            }
          }
        } else {
          animFrameRef.current = requestAnimationFrame(updateProgress)
        }
      }

      animFrameRef.current = requestAnimationFrame(updateProgress)
    },
    [disabled, durationMs, onTrigger, stopHold]
  )

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [])

  const radius = compact ? 11 : 13
  const size = compact ? 28 : 32
  const center = size / 2
  const strokeWidth = compact ? 2.5 : 3
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress / 100)

  if (compact) {
    return (
      <button
        type="button"
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        title={title}
        className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all select-none touch-none cursor-pointer ${
          isHolding
            ? 'bg-rose-500/20 text-rose-700 scale-105 shadow-sm'
            : 'bg-surface-low hover:bg-rose-500/10 text-on-surface-variant hover:text-rose-700'
        } ${className}`}
      >
        <svg
          width={size}
          height={size}
          className="absolute inset-0 pointer-events-none -rotate-90"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="opacity-15"
          />
          {isHolding && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="#b91c1c"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          )}
        </svg>

        {isHolding ? (
          <span className="font-mono font-black text-[11px] text-rose-700 z-10 animate-pulse">
            {secondsLeft}
          </span>
        ) : (
          <Trash2 className="w-3.5 h-3.5 z-10" />
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onPointerDown={startHold}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      title={title}
      className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all select-none touch-none cursor-pointer text-xs font-black ${
        isHolding
          ? 'bg-rose-500/20 border-rose-600 text-rose-800 scale-95 shadow-sm'
          : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-800'
      } ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
        <svg
          width={22}
          height={22}
          className="absolute inset-0 pointer-events-none -rotate-90"
        >
          <circle
            cx={11}
            cy={11}
            r={8.5}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={2}
            className="opacity-20"
          />
          {isHolding && (
            <circle
              cx={11}
              cy={11}
              r={8.5}
              fill="transparent"
              stroke="#b91c1c"
              strokeWidth={2}
              strokeDasharray={2 * Math.PI * 8.5}
              strokeDashoffset={2 * Math.PI * 8.5 * (1 - progress / 100)}
              strokeLinecap="round"
            />
          )}
        </svg>
        {isHolding ? (
          <span className="font-mono font-black text-[10px] text-rose-800 z-10">
            {secondsLeft}
          </span>
        ) : (
          <Trash2 className="w-3 h-3 z-10" />
        )}
      </div>
      <span>{isHolding ? `جاري الحذف (${secondsLeft})...` : label}</span>
    </button>
  )
}

export default AX_HoldToDeleteButton
