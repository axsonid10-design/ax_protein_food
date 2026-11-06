import React, { useState } from 'react'
import {
  LayoutDashboard,
  Boxes,
  Warehouse,
  Scissors,
  Wallet,
  Truck,
  FileText,
  Search,
  Pin,
  ChevronDown,
  Clock,
  ShieldCheck,
  User,
  Users,
  UserCheck,
  Building2,
  BadgePercent,
  BarChart3,
  Trash2,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { hasModuleAccess } from '../../utils/permissionsConfig'

export function AX_Sidebar({ activeTab, onSelectTab, onOpenMasterControl }) {
  const { profile, transfers, pendingCashTransfers, recycleBin = [] } = useAXStore()
  const [isPinned, setIsPinned] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const isExpanded = isPinned || isHovered

  const pendingStockCount = (transfers || []).filter((t) => t && t.status === 'pending').length
  const pendingCashCount = (pendingCashTransfers || []).filter((p) => p && p.status === 'pending').length

  const userName = profile?.name || 'مدير النظام'
  const userInitials = 'PF'

  const isMaster = profile?.isMaster || profile?.role === 'super_admin'

  const menuSections = [
    {
      title: 'نظرة عامة',
      items: [
        { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
      ],
    },
    {
      title: 'الأصناف والمخازن',
      items: [
        { id: 'items', label: 'دليل الأصناف', icon: Boxes },
        { id: 'warehouses', label: 'المخازن', icon: Warehouse, badge: pendingStockCount },
        { id: 'manufacturing', label: 'التفكيك والتصنيع', icon: Scissors },
      ],
    },
    {
      title: 'العملاء والموردين والمناديب',
      items: [
        { id: 'customers', label: 'العملاء', icon: UserCheck },
        { id: 'suppliers', label: 'الموردين', icon: Building2 },
        { id: 'sales_reps', label: 'المناديب والعمولات', icon: BadgePercent },
        { id: 'distribution', label: 'سيارات التوزيع', icon: Truck },
      ],
    },
    {
      title: 'المالية والحسابات',
      items: [
        { id: 'treasury', label: 'الخزينة', icon: Wallet, badge: pendingCashCount },
        { id: 'invoices', label: 'الفواتير', icon: FileText },
        { id: 'reports', label: 'التقارير والمحاسبة', icon: BarChart3 },
      ],
    },
    {
      title: 'الإدارة وفريق العمل',
      items: [
        { id: 'staff', label: 'الموظفين', icon: Users },
        { id: 'recycle_bin', label: 'سجل المحذوفات', icon: Trash2, badge: (recycleBin || []).length || 0 },
      ],
    },
  ]

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`hidden lg:flex flex-col flex-shrink-0 bg-surface-lowest/95 backdrop-blur-md rounded-3xl border border-outline-variant/30 p-3 shadow-level2 space-y-3 sticky top-20 h-[calc(100vh-100px)] transition-all duration-300 ease-in-out z-30 ${
        isExpanded ? 'w-64' : 'w-[72px]'
      }`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-surface-container">
        {isExpanded ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo-clean-original.png"
                alt="بروتين فود"
                className="h-8 w-8 rounded-xl object-contain border border-primary/20"
                onError={(e) => {
                  e.currentTarget.src = '/logo-header.png'
                }}
              />
              <div className="leading-none text-right">
                <span className="text-sm font-black text-on-surface">بروتين فود</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1.5 rounded-xl transition-all ${
                isPinned ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-low'
              }`}
              title={isPinned ? 'إلغاء التثبيت' : 'تثبيت القائمة'}
            >
              <Pin className={`w-3.5 h-3.5 transition-transform ${isPinned ? 'rotate-45' : ''}`} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsPinned(true)}
            className="w-full flex items-center justify-center p-2 rounded-xl text-primary hover:bg-surface-low"
            title="تثبيت القائمة"
          >
            <Pin className="w-4 h-4" />
          </button>
        )}
      </div>

      {isExpanded ? (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالقوائم..."
            className="w-full h-8 pr-8 pl-3 rounded-xl bg-surface-low border border-outline-variant/30 text-[11px] font-bold text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
      ) : (
        <div className="flex justify-center py-1">
          <Search className="w-4 h-4 text-on-surface-variant opacity-60" />
        </div>
      )}

      <nav className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
        {menuSections.map((sec, secIdx) => {
          const visibleItems = sec.items.filter((item) => {
            if (!hasModuleAccess(profile, item.id)) return false
            return searchQuery ? item.label.includes(searchQuery) : true
          })

          if (visibleItems.length === 0) return null

          return (
            <div key={secIdx} className="space-y-1">
              {isExpanded && sec.title && (
                <div className="px-3 text-[10px] font-extrabold text-on-surface-variant/80 tracking-wider text-right">
                  {sec.title}
                </div>
              )}

              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      title={!isExpanded ? item.label : undefined}
                      className={`w-full py-2.5 rounded-2xl text-xs font-bold text-right transition-all flex items-center group ${
                        isExpanded ? 'px-3 justify-between' : 'px-0 justify-center'
                      } ${
                        isActive
                          ? 'bg-primary text-white shadow-level1'
                          : 'text-on-surface hover:bg-surface-low'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-white' : 'text-primary'
                          }`}
                        />
                        {isExpanded && <span className="truncate">{item.label}</span>}
                      </div>

                      {isExpanded && item.badge > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="pt-2 border-t border-surface-container space-y-1.5">
        {isExpanded ? (
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-surface-low border border-outline-variant/30">
            <div className="w-8 h-8 rounded-full bg-primary text-white font-black text-xs flex items-center justify-center flex-shrink-0">
              {userInitials}
            </div>
            <div className="text-right leading-none min-w-0 flex-1">
              <span className="text-xs font-black text-on-surface truncate block">{userName}</span>
              <span className="text-[10px] text-on-surface-variant font-bold">صلاحيات كاملة</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-primary text-white font-black text-xs flex items-center justify-center">
              {userInitials}
            </div>
          </div>
        )}

        {isExpanded ? (
          <a
            href="https://axsonid.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-surface-low hover:bg-surface-container border border-outline-variant/30 hover:border-primary/40 transition-all group"
            title="Created by AXONID"
          >
            <span className="text-[10px] font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">
              Created by
            </span>
            <span className="text-[11px] font-black font-mono text-primary group-hover:text-primary-dark transition-colors">
              AXONID
            </span>
          </a>
        ) : (
          <div className="flex justify-center">
            <a
              href="https://axsonid.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-full hover:bg-surface-low transition-transform hover:scale-110 block"
              title="Created by AXONID"
            >
              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[9px] font-black font-mono">
                AX
              </span>
            </a>
          </div>
        )}
      </div>
    </aside>
  )
}

export default AX_Sidebar
