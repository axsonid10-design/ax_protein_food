import React from 'react'
import {
  Plus,
  ArrowLeftRight,
  Wallet,
  Boxes,
  UserCheck,
  Building2,
  BadgePercent,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'

export function AX_QuickActionsBar({ onNavigateTab }) {
  const openModal = useAXStore((s) => s.openModal)

  const actions = [
    {
      id: 'invoice',
      label: 'إصدار فاتورة',
      icon: Plus,
      color: 'bg-primary hover:bg-primary-dark text-white',
      tab: 'invoices',
      modal: 'create_invoice',
    },
    {
      id: 'customer',
      label: 'إضافة عميل',
      icon: UserCheck,
      color: 'bg-secondary hover:bg-secondary-hover text-white',
      tab: 'customers',
      modal: 'add_customer',
    },
    {
      id: 'supplier',
      label: 'إضافة مورد',
      icon: Building2,
      color: 'bg-primary-container hover:bg-primary text-white',
      tab: 'suppliers',
      modal: 'add_supplier',
    },
    {
      id: 'sales_rep',
      label: 'حساب مندوب',
      icon: BadgePercent,
      color: 'bg-emerald-800 hover:bg-emerald-900 text-white',
      tab: 'sales_reps',
    },
    {
      id: 'transfer',
      label: 'تحويل مخزني',
      icon: ArrowLeftRight,
      color: 'bg-surface-lowest hover:bg-primary/5 text-primary border border-primary/25',
      tab: 'warehouses',
    },
    {
      id: 'treasury',
      label: 'سند مالي',
      icon: Wallet,
      color: 'bg-surface-lowest hover:bg-primary/5 text-primary border border-primary/25',
      tab: 'treasury',
      modal: 'create_transaction',
    },
    {
      id: 'items',
      label: 'دليل الأصناف',
      icon: Boxes,
      color: 'bg-surface-lowest hover:bg-primary/5 text-primary border border-primary/25',
      tab: 'items',
    },
  ]

  const handleActionClick = (act) => {
    onNavigateTab(act.tab)
    if (act.modal) {
      openModal(act.modal)
    }
  }

  return (
    <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 shadow-xs space-y-2">
      <h3 className="text-xs font-black text-on-surface">إجراءات تشغيلية سريعة</h3>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {actions.map((act) => {
          const Icon = act.icon
          return (
            <button
              key={act.id}
              type="button"
              onClick={() => handleActionClick(act)}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer ${act.color}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{act.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default AX_QuickActionsBar
