import { useAXStore } from '../store/useAXStore.js'
import { axToast } from '../services/axToast.js'

class BackNavigationManager {
  constructor() {
    this.modalStack = []
    this.isProgrammaticPop = false
    this.isInitialized = false
    this.lastBackPressTime = 0
  }

  init() {
    if (typeof window === 'undefined' || this.isInitialized) return
    this.isInitialized = true

    const currentTab = new URLSearchParams(window.location.search).get('tab') || 'dashboard'
    window.history.replaceState({ tab: currentTab, isRoot: true }, '', window.location.href)
    window.history.pushState({ tab: currentTab, isGuard: true }, '', window.location.href)

    window.addEventListener('popstate', (e) => this.handlePopState(e))
  }

  registerModal(id, onClose) {
    this.modalStack.push({ id, onClose, pushedHistory: typeof window !== 'undefined' })
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({ isModal: true, modalId: id }, '', window.location.href)
      } catch {}
    }
  }

  unregisterModal(id) {
    const idx = this.modalStack.findIndex((m) => m.id === id)
    if (idx === -1) return

    const [removed] = this.modalStack.splice(idx, 1)
    if (removed?.pushedHistory && typeof window !== 'undefined') {
      this.isProgrammaticPop = true
      try {
        window.history.back()
      } catch {
        this.isProgrammaticPop = false
      }
    }
  }

  hasOpenModal() {
    if (this.modalStack.length > 0) return true
    if (typeof document !== 'undefined') {
      return Boolean(document.querySelector('.fixed.inset-0.z-50, div[role="dialog"]'))
    }
    return false
  }

  handlePopState(e) {
    if (this.isProgrammaticPop) {
      this.isProgrammaticPop = false
      return
    }

    if (this.modalStack.length > 0) {
      const top = this.modalStack.pop()
      if (top && typeof top.onClose === 'function') {
        top.pushedHistory = false
        top.onClose()
      }
      return
    }

    if (typeof document !== 'undefined') {
      const domModal = document.querySelector('.fixed.inset-0.z-50, div[role="dialog"]')
      if (domModal) {
        const cancelBtn = Array.from(domModal.querySelectorAll('button')).find((b) => {
          const t = b.innerText.trim()
          return t === 'إلغاء' || t === 'إغلاق' || t === 'خروج' || b.getAttribute('aria-label') === 'إغلاق'
        })
        if (cancelBtn) {
          cancelBtn.click()
          return
        }
      }
    }

    const stateTab = e?.state?.tab
    const urlTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null
    const targetTab = stateTab || urlTab || 'dashboard'
    const currentTab = useAXStore.getState().activeTab

    if (targetTab !== currentTab) {
      useAXStore.setState({ activeTab: targetTab })
      try {
        localStorage.setItem('ax_active_tab', targetTab)
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.set('tab', targetTab)
          window.history.replaceState({ tab: targetTab }, '', url.toString())
        }
      } catch {}
      return
    }

    if (currentTab === 'dashboard') {
      const now = Date.now()
      if (now - this.lastBackPressTime < 2000) {
        if (typeof window !== 'undefined') {
          window.history.go(-1)
        }
      } else {
        this.lastBackPressTime = now
        if (typeof window !== 'undefined') {
          window.history.pushState({ tab: 'dashboard', isGuard: true }, '', window.location.href)
        }
        axToast.info('اضغط مرة أخرى للخروج من التطبيق')
      }
    }
  }
}

export const AX_BackNavigation = new BackNavigationManager()
