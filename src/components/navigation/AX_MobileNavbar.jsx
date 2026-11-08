import React, { useRef, useEffect } from 'react'
import {
  LayoutDashboard,
  Boxes,
  Warehouse,
  Scissors,
  Wallet,
  Truck,
  FileText,
  Users,
  UserCheck,
  Building2,
  BadgePercent,
  BarChart3,
  Trash2,
  ShieldCheck,
  TrendingUp,
  ShoppingBag,
  Receipt,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { hasModuleAccess } from '../../utils/permissionsConfig'

export function AX_MobileNavbar({ activeTab, onSelectTab }) {
  const { profile, transfers, pendingCashTransfers, recycleBin = [] } = useAXStore()
  const activeTabRef = useRef(null)

  const pendingStockCount = (transfers || []).filter((t) => t && t.status === 'pending').length
  const pendingCashCount = (pendingCashTransfers || []).filter((p) => p && p.status === 'pending').length

  const allTabs = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard, badge: 0 },
    { id: 'items', label: 'الأصناف', icon: Boxes, badge: 0 },
    { id: 'warehouses', label: 'المخازن', icon: Warehouse, badge: pendingStockCount },
    { id: 'manufacturing', label: 'التصنيع', icon: Scissors, badge: 0 },
    { id: 'distribution', label: 'السيارات', icon: Truck, badge: 0 },
    { id: 'sales', label: 'المبيعات', icon: TrendingUp, badge: 0 },
    { id: 'purchases', label: 'المشتريات', icon: ShoppingBag, badge: 0 },
    { id: 'treasury', label: 'الخزينة', icon: Wallet, badge: pendingCashCount },
    { id: 'expenses', label: 'المصروفات', icon: Receipt, badge: 0 },
    { id: 'customers', label: 'العملاء', icon: UserCheck, badge: 0 },
    { id: 'suppliers', label: 'الموردين', icon: Building2, badge: 0 },
    { id: 'sales_reps', label: 'المناديب', icon: BadgePercent, badge: 0 },
    { id: 'reports', label: 'التقارير', icon: BarChart3, badge: 0 },
    { id: 'employees', label: 'الموظفين', icon: Users, badge: 0 },
    { id: 'staff', label: 'الصلاحيات', icon: ShieldCheck, badge: 0 },
    { id: 'recycle_bin', label: 'المحذوفات', icon: Trash2, badge: (recycleBin || []).length || 0 },
  ]

  const visibleTabs = allTabs.filter((tab) => hasModuleAccess(profile, tab.id))

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    }
  }, [activeTab])

  return (
    <div className="fixed bottom-3 sm:bottom-4 inset-x-0 z-40 flex justify-center px-2.5 sm:px-4 pointer-events-none lg:hidden">
      <nav
        dir="rtl"
        className="pointer-events-auto w-fit max-w-full bg-surface-lowest/95 backdrop-blur-xl border border-outline-variant/40 rounded-full py-1.5 px-2 flex items-center gap-1 overflow-x-auto shadow-2xl scrollbar-none overscroll-x-contain touch-pan-x"
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex-shrink-0 flex flex-col items-center justify-center gap-0.5 py-1 px-3 sm:px-3.5 rounded-full whitespace-nowrap transition-all duration-200 relative ${
                isActive
                  ? 'bg-primary text-white font-extrabold shadow-sm scale-105'
                  : 'text-on-surface-variant font-bold hover:text-on-surface hover:bg-surface-low'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-[10px] leading-tight select-none">{tab.label}</span>
              {tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default AX_MobileNavbar
