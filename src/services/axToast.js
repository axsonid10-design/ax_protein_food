let listeners = []
let toasts = []
const timers = new Map()

const notify = () => {
  const snapshot = [...toasts]
  listeners.forEach((fn) => {
    try {
      fn(snapshot)
    } catch (e) {}
  })
}

const clearTimer = (id) => {
  if (timers.has(id)) {
    clearTimeout(timers.get(id))
    timers.delete(id)
  }
}

const createOrUpdateToast = (type, message, options = {}) => {
  const id = options.id || `ax_toast_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const duration = options.duration ?? (type === 'loading' ? Infinity : 3500)

  clearTimer(id)

  const existingIndex = toasts.findIndex((t) => t.id === id)
  const newToast = {
    id,
    type,
    message,
    duration,
    createdAt: Date.now(),
    ...options,
  }

  if (existingIndex !== -1) {
    toasts = toasts.map((t, idx) => (idx === existingIndex ? newToast : t))
  } else {
    toasts = [newToast, ...toasts].slice(0, 5)
  }

  if (duration !== Infinity && duration > 0) {
    const timer = setTimeout(() => {
      dismissToast(id)
    }, duration)
    timers.set(id, timer)
  }

  notify()
  return id
}

const dismissToast = (id) => {
  if (id) {
    clearTimer(id)
    toasts = toasts.filter((t) => t.id !== id)
  } else {
    timers.forEach((timer) => clearTimeout(timer))
    timers.clear()
    toasts = []
  }
  notify()
}

export const axToast = {
  success: (message, options) => createOrUpdateToast('success', message, options),
  error: (message, options) => createOrUpdateToast('error', message, options),
  info: (message, options) => createOrUpdateToast('info', message, options),
  loading: (message, options) => createOrUpdateToast('loading', message, options),
  dismiss: (id) => dismissToast(id),
}

export const subscribeToToasts = (listener) => {
  listeners.push(listener)
  listener([...toasts])
  return () => {
    listeners = listeners.filter((fn) => fn !== listener)
  }
}

export const getToasts = () => [...toasts]
