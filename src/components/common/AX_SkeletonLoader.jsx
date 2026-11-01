import React from 'react'

export function AX_SkeletonLoader({ type = 'cards', count = 3, className = '' }) {
  if (type === 'dashboard') {
    return (
      <div className={`w-full space-y-5 pb-20 lg:pb-6 animate-pulse select-none ${className}`}>
        <div className="h-11 bg-surface-lowest border border-outline-variant/30 rounded-full p-2 flex items-center justify-between" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-lowest border border-outline-variant/30 rounded-2xl sm:rounded-3xl p-3 sm:p-4 h-24 sm:h-28 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-surface-container rounded-full" />
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-surface-container" />
              </div>
              <div>
                <div className="h-6 w-24 bg-surface-container-high rounded-md mb-1" />
                <div className="h-2.5 w-20 bg-surface-container-low rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-16 bg-surface-lowest border border-outline-variant/30 rounded-3xl p-4 flex items-center gap-2" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 h-64 flex flex-col justify-between">
            <div className="h-4 w-36 bg-surface-container rounded-full" />
            <div className="h-40 bg-surface-container-low rounded-2xl" />
          </div>
          <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 h-64 flex flex-col justify-between">
            <div className="h-4 w-36 bg-surface-container rounded-full" />
            <div className="h-40 bg-surface-container-low rounded-2xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 h-64 flex flex-col justify-between">
            <div className="h-4 w-36 bg-surface-container rounded-full" />
            <div className="h-40 bg-surface-container-low rounded-2xl" />
          </div>
          <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 h-64 flex flex-col justify-between">
            <div className="h-4 w-36 bg-surface-container rounded-full" />
            <div className="h-40 bg-surface-container-low rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }
  if (type === 'stats') {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-4 animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-20 bg-surface-container rounded-full" />
              <div className="h-8 w-8 bg-surface-container rounded-xl" />
            </div>
            <div className="h-7 w-28 bg-surface-container-high rounded-lg mb-2" />
            <div className="h-3 w-16 bg-surface-container rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className={`bg-surface-lowest border border-outline-variant/30 rounded-2xl p-4 animate-pulse ${className}`}>
        <div className="h-10 bg-surface-low rounded-xl mb-4" />
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-surface-container/50">
              <div className="h-4 w-12 bg-surface-container rounded" />
              <div className="h-4 w-32 bg-surface-container-high rounded" />
              <div className="h-4 w-24 bg-surface-container rounded" />
              <div className="h-4 w-20 bg-surface-container rounded ms-auto" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-5 animate-pulse shadow-level1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-surface-container" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-3/4 bg-surface-container-high rounded-full" />
              <div className="h-3 w-1/2 bg-surface-container rounded-full" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full bg-surface-container-low rounded-full" />
            <div className="h-3 w-4/5 bg-surface-container-low rounded-full" />
          </div>
          <div className="mt-5 pt-3 border-t border-surface-container/60 flex justify-between items-center">
            <div className="h-3 w-16 bg-surface-container rounded-full" />
            <div className="h-8 w-24 bg-surface-container rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default AX_SkeletonLoader
