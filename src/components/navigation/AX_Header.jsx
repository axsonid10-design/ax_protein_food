import React, { useState } from 'react'
import { Wifi, WifiOff, RefreshCw, LogOut, Bell } from 'lucide-react'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { useAXStore } from '../../store/useAXStore'
import { AX_UserProfileModal } from '../profile/AX_UserProfileModal'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { AX_NotificationCenter } from '../notifications/AX_NotificationCenter'
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient'

const tabTitles = {
  dashboard: 'لوحة التحكم',
  items: 'دليل الأصناف',
  warehouses: 'المخازن',
  manufacturing: 'التفكيك والتصنيع',
  distribution: 'سيارات التوزيع',
  treasury: 'دفتر الخزينة',
  invoices: 'إدارة الفواتير',
  customers: 'العملاء',
  suppliers: 'الموردين',
  sales_reps: 'المناديب والعمولات',
  reports: 'التقارير والمحاسبة',
  staff: 'الموظفين والصلاحيات',
}

export function AX_Header() {
  const { isOnline, pendingSyncCount, isSyncing, manualSync } = useNetworkStatus()
  const { activeTab, profile, setProfile, notifications = [] } = useAXStore()

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut()
      }
      localStorage.removeItem('ax_user_profile')
      localStorage.removeItem('ax_auth_user')
      sessionStorage.removeItem('ax_auth_user')
      setProfile(null)
      window.location.reload()
    } catch (err) {
      window.location.reload()
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-surface-lowest/95 backdrop-blur-md border-b border-surface-container shadow-level1 px-3 sm:px-6 lg:px-8 py-2">
        <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/logo-header.png"
              alt="بروتين فود"
              className="h-7 sm:h-8 w-auto object-contain cursor-pointer shrink-0"
              onError={(e) => {
                e.currentTarget.src = '/logo-clean-original.png'
              }}
            />
            <span className="text-outline-variant/40 hidden sm:inline select-none">|</span>
            <h1 className="text-xs sm:text-sm font-black text-on-surface whitespace-nowrap truncate">
              {tabTitles[activeTab] || 'الرئيسية'}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {pendingSyncCount > 0 && (
              <button
                type="button"
                onClick={manualSync}
                disabled={isSyncing || !isOnline}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-secondary-on-container text-[11px] font-extrabold hover:bg-secondary-container/80 transition-all shadow-sm disabled:opacity-50"
                title="مزامنة العمليات المعلقة"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingSyncCount}</span>
              </button>
            )}

            {isOnline ? (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600"
                title="متصل سحابياً"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            ) : (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600"
                title="أوفلاين (محلي)"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
              </div>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative flex items-center justify-center w-8 h-8 rounded-full bg-surface-low hover:bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:text-primary transition-all active:scale-95 cursor-pointer"
                title="مركز الإشعارات والتنبيهات"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-error text-white text-[10px] font-black flex items-center justify-center ring-2 ring-surface animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AX_NotificationCenter
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="flex items-center p-0.5 rounded-full border-2 border-primary/30 hover:border-primary transition-all active:scale-95 cursor-pointer"
              title="الملف الشخصي وإعدادات الحساب"
            >
              <img
                src={profile?.avatarUrl || '/logo-clean-original.png'}
                alt={profile?.name || 'حسابي'}
                className="w-7 h-7 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/logo-clean-original.png'
                }}
              />
            </button>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-error/10 hover:bg-error/20 text-error border border-error/20 transition-all active:scale-95 cursor-pointer text-xs font-black"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5 text-error" />
              <span className="hidden md:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      <AX_UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      <AX_ConfirmModal
        isOpen={showLogoutConfirm}
        title="تسجيل الخروج"
        message="هل أنت متأكد من رغبتك في تسجيل الخروج من منظومة بروتين فود؟"
        confirmText="خروج"
        cancelText="إلغاء"
        isDestructive={true}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  )
}

export default AX_Header
