import React, { useState, useEffect } from 'react'
import { Sparkles, Activity } from 'lucide-react'

export function AX_WelcomeOverlay({ appName = 'بروتين فود - لتجهيز وحفظ اللحوم المجمدة', userName, onComplete }) {
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [isMounted, setIsMounted] = useState(true)

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true)
    }, 1250)

    const unmountTimer = setTimeout(() => {
      setIsMounted(false)
      onComplete?.()
    }, 1650)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(unmountTimer)
    }
  }, [onComplete])

  const handleDismiss = () => {
    setIsFadingOut(true)
    setTimeout(() => {
      setIsMounted(false)
      onComplete?.()
    }, 250)
  }

  if (!isMounted) return null

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-400 ease-out ${
        isFadingOut ? 'opacity-0 scale-98 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 45%, #450a0a 0%, #290404 55%, #140202 100%)',
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[420px] sm:w-[600px] h-[420px] sm:h-[600px] rounded-full bg-red-500/15 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-lg mx-auto">
        <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-red-400/40 backdrop-blur-md shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-rose-300 animate-spin" />
          <span className="text-[11px] sm:text-xs font-black tracking-[0.2em] uppercase font-mono text-rose-300">
            WELCOME
          </span>
          {userName && (
            <>
              <span className="text-white/40 text-xs">|</span>
              <span className="text-xs font-bold text-white max-w-[200px] truncate">
                {userName}
              </span>
            </>
          )}
        </div>

        <div className="relative my-2 flex flex-col items-center">
          <h1 className="text-6xl sm:text-8xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-100 via-red-400 to-rose-200 drop-shadow-[0_8px_20px_rgba(153,27,27,0.45)]">
            AXONID
          </h1>
          <div className="w-24 sm:w-36 h-1 rounded-full bg-gradient-to-r from-transparent via-rose-400 to-transparent mt-2 opacity-80" />
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-200">
          <Activity className="w-4 h-4 text-rose-400" />
          <span>{appName}</span>
        </div>

        <div className="mt-6 flex items-center gap-1.5 text-[10px] font-mono text-white/50 tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>COLD-CHAIN ENTERPRISE SYSTEM</span>
        </div>
      </div>
    </div>
  )
}

export default AX_WelcomeOverlay
