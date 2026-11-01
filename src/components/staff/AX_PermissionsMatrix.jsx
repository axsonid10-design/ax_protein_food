import React from 'react'
import { Check, CheckSquare, Square } from 'lucide-react'
import { MODULE_PERMISSIONS_CONFIG } from '../../utils/permissionsConfig'

export function AX_PermissionsMatrix({ permissions = {}, onChange, disabled = false }) {
  const handleToggleModule = (modId) => {
    if (disabled) return
    const current = Boolean(permissions[modId]?.view)
    const nextView = !current

    onChange({
      ...permissions,
      [modId]: {
        ...permissions[modId],
        view: nextView,
      },
    })
  }

  const handleToggleOption = (modId, optKey) => {
    if (disabled) return
    const mod = permissions[modId] || { view: true }
    const currentVal = Boolean(mod[optKey])

    onChange({
      ...permissions,
      [modId]: {
        ...mod,
        [optKey]: !currentVal,
      },
    })
  }

  const handleSetScope = (modId, scopeVal) => {
    if (disabled) return
    const mod = permissions[modId] || { view: true }

    onChange({
      ...permissions,
      [modId]: {
        ...mod,
        scope: scopeVal,
      },
    })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {MODULE_PERMISSIONS_CONFIG.map((mod) => {
        const Icon = mod.icon
        const modState = permissions[mod.id] || { view: false }
        const isActive = Boolean(modState.view)

        return (
          <div
            key={mod.id}
            className={`rounded-2xl p-3.5 transition-all flex flex-col justify-between border ${
              isActive
                ? 'bg-surface-lowest border-primary/30 shadow-xs'
                : 'bg-surface-low/30 border-outline-variant/20 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-on-surface truncate">
                    {mod.label}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleToggleModule(mod.id)}
                  className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors focus:outline-none shrink-0 cursor-pointer ${
                    isActive ? 'bg-primary justify-end' : 'bg-surface-container justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
                </button>
              </div>

              {isActive ? (
                <div className="space-y-2 pt-1 border-t border-surface-container/60">
                  {mod.type === 'scope_only' && (
                    <div>
                      <div className="text-[10px] font-bold text-on-surface-variant mb-1">
                        نطاق البيانات:
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface-low border border-outline-variant/20">
                        {mod.scopeOptions.map((sc) => {
                          const isScopeSelected = (modState.scope || 'own') === sc.key
                          return (
                            <button
                              key={sc.key}
                              type="button"
                              disabled={disabled}
                              onClick={() => handleSetScope(mod.id, sc.key)}
                              className={`py-1 px-2 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                isScopeSelected
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'text-on-surface-variant hover:text-on-surface'
                              }`}
                            >
                              {sc.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {mod.type === 'scoped_options' && (
                    <div>
                      <div className="text-[10px] font-bold text-on-surface-variant mb-1">
                        نطاق الفواتير:
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface-low border border-outline-variant/20 mb-2">
                        {mod.scopeOptions.map((sc) => {
                          const isScopeSelected = (modState.scope || 'own') === sc.key
                          return (
                            <button
                              key={sc.key}
                              type="button"
                              disabled={disabled}
                              onClick={() => handleSetScope(mod.id, sc.key)}
                              className={`py-1 px-2 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                isScopeSelected
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'text-on-surface-variant hover:text-on-surface'
                              }`}
                            >
                              {sc.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {mod.options && mod.options.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-on-surface-variant">
                        الصلاحيات التنفيذية:
                      </div>
                      <div className="space-y-1">
                        {mod.options.map((opt) => {
                          const isOptChecked = Boolean(modState[opt.key])
                          return (
                            <div
                              key={opt.key}
                              onClick={() => handleToggleOption(mod.id, opt.key)}
                              className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all select-none cursor-pointer ${
                                isOptChecked
                                  ? 'bg-surface-lowest border-primary/20 text-on-surface font-bold'
                                  : 'border-transparent text-on-surface-variant hover:bg-surface-low'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                                  isOptChecked
                                    ? 'bg-primary border-primary text-white'
                                    : 'border-outline-variant/60 bg-surface-low'
                                }`}
                              >
                                {isOptChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="text-[11px] font-bold leading-none">
                                {opt.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-2 text-center text-[11px] text-on-surface-variant font-bold">
                  القسم محجوب بالكامل عن الموظف
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
