import React from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

export function AX_ConfirmModal({
  isOpen,
  title = 'تأكيد الإجراء',
  message = 'هل أنت متأكد من تنفيذ هذا الإجراء؟',
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  isDestructive = false,
  onConfirm,
  onCancel,
}) {
  useBodyScrollLock(isOpen)
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-6 max-w-md w-full shadow-level3 text-center space-y-4 overscroll-contain">
        <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${
          isDestructive ? 'bg-error-container text-error' : 'bg-secondary-container text-secondary-on-container'
        }`}>
          <AlertTriangle className="w-7 h-7 text-primary" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-black text-on-surface">{title}</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">{message}</p>
        </div>

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
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-full font-extrabold text-sm text-white transition-all duration-150 shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2 ${
              isDestructive ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary-dark'
            }`}
          >
            <Check className="w-4 h-4" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AX_ConfirmModal
