import React, { useState } from 'react'
import {
  FileText,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  Save,
} from 'lucide-react'

export function AX_DraftsManagerBanner({
  type = 'transfer',
  drafts = [],
  activeDraftId = null,
  autoSaveStatus = 'idle',
  lastSavedAt = null,
  onSelectDraft,
  onDeleteDraft,
  onNewDraft,
  onSaveCurrent,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const activeDraft = drafts.find((d) => d.id === activeDraftId)

  const formatTime = (date) => {
    if (!date) return ''
    try {
      const d = typeof date === 'string' ? new Date(date) : date
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const typeLabel = type === 'transfer' ? 'التحويل' : 'الجرد'

  return (
    <div className="w-full bg-surface-low/80 border border-outline-variant/30 rounded-2xl p-2.5 sm:p-3 mb-3 text-xs font-bold transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/40 text-on-surface">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>مسودات {typeLabel}</span>
            {drafts.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center font-mono">
                {drafts.length}
              </span>
            )}
          </div>

          {activeDraft && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate max-w-[180px] sm:max-w-[260px]">
                نشطة: {activeDraft.title}
              </span>
              {autoSaveStatus === 'saving' && (
                <span className="text-[10px] text-amber-600 font-normal mr-1">جارٍ الحفظ...</span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="text-[10px] text-emerald-600 font-normal mr-1">
                  تم الحفظ {lastSavedAt ? formatTime(lastSavedAt) : ''}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onSaveCurrent && (
            <button
              type="button"
              onClick={onSaveCurrent}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-lowest border border-outline-variant/40 hover:bg-surface-container text-on-surface text-[11px] font-bold active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              <Save className="w-3 h-3 text-secondary" />
              <span>حفظ كمسودة</span>
            </button>
          )}

          {activeDraft && onNewDraft && (
            <button
              type="button"
              onClick={onNewDraft}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-lowest border border-outline-variant/40 hover:bg-surface-container text-on-surface text-[11px] font-bold active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>مسودة جديدة</span>
            </button>
          )}

          {drafts.length > 0 && (
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-black active:scale-95 transition-all cursor-pointer"
            >
              <span>{isOpen ? 'إخفاء المسودات' : `عرض المسودات (${drafts.length})`}</span>
              {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {isOpen && drafts.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-outline-variant/20 space-y-1.5 max-h-48 overflow-y-auto">
          {drafts.map((d) => {
            const isActive = d.id === activeDraftId
            return (
              <div
                key={d.id}
                className={`flex items-center justify-between gap-2 p-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-surface-lowest border border-outline-variant/20 hover:border-outline-variant/40'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-primary text-white' : 'bg-surface-low text-on-surface-variant'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-black text-on-surface truncate">
                      {d.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-normal">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(d.updatedAt)}</span>
                      </span>
                      {d.warehouseName && (
                        <span className="px-1.5 py-0.2 rounded-md bg-surface-low text-on-surface">
                          {d.warehouseName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectDraft) onSelectDraft(d)
                      setIsOpen(false)
                    }}
                    className={`px-3 py-1 rounded-full text-[11px] font-black transition-all active:scale-95 cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-surface-container hover:bg-primary hover:text-white text-on-surface'
                    }`}
                  >
                    {isActive ? 'قيد العمل' : 'استئناف'}
                  </button>
                  {onDeleteDraft && (
                    <button
                      type="button"
                      onClick={() => onDeleteDraft(d.id)}
                      className="w-7 h-7 rounded-full bg-surface-low hover:bg-rose-500/10 text-on-surface-variant hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                      title="حذف المسودة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AX_DraftsManagerBanner
