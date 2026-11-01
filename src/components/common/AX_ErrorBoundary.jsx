import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { AX_alertTelegram } from '../../utils/AX_TelegramAlert'

export class AX_ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    if (typeof console !== 'undefined') {
      console.error('AX_ErrorBoundary caught:', error, errorInfo)
    }
    AX_alertTelegram('REACT_BOUNDARY_ERROR', { error: error?.message || String(error), componentStack: errorInfo?.componentStack })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full bg-surface-lowest border-2 border-error/30 rounded-3xl p-8 sm:p-12 shadow-level2 text-center space-y-5 my-4">
          <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto ring-8 ring-error/5">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-base sm:text-lg font-black text-on-surface">
              حدث تنبيه غير متوقع أثناء عرض البيانات
            </h2>
            <p className="text-xs text-on-surface-variant font-bold">
              تم حصر التنبيه بنجاح لحماية استقرار باقي المنظومة ومنع انقطاع الشاشة.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تحميل هذه الشاشة</span>
            </button>

            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-low border border-outline-variant/40 hover:bg-surface-container text-on-surface text-xs font-black transition-all active:scale-95 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>تحديث كامل للمنظومة</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default AX_ErrorBoundary
