import React, { useState, useEffect, useCallback } from 'react'
import { AX_Header } from './components/navigation/AX_Header'
import { AX_InstallPwaBanner } from './components/common/AX_InstallPwaBanner'
import { AX_Sidebar } from './components/navigation/AX_Sidebar'
import { AX_MobileNavbar } from './components/navigation/AX_MobileNavbar'
import { AppUpdateNotifier } from './components/common/AppUpdateNotifier'
import { AX_MandatoryPushModal } from './components/notifications/AX_MandatoryPushModal'
import { AX_InAppErrorAlert } from './components/common/AX_InAppErrorAlert'
import { AX_ToastContainer } from './components/common/AX_Toast'
import { AX_WelcomeOverlay } from './components/common/AX_WelcomeOverlay'
import { AX_ErrorBoundary } from './components/common/AX_ErrorBoundary'
import { useAXStore } from './store/useAXStore'
import { supabase, isSupabaseConfigured } from './services/supabaseClient'
import { AX_DatabaseSync } from './services/AX_DatabaseSync'
import {
  hasModuleAccess,
  getFirstAccessibleTab,
  isMasterUser,
} from './utils/permissionsConfig'

import { AX_Dashboard } from './components/dashboard/AX_Dashboard'
import { AX_ItemsCatalog } from './components/items/AX_ItemsCatalog'
import { AX_WarehousesInventory } from './components/warehouses/AX_WarehousesInventory'
import { AX_ManufacturingDisassembly } from './components/manufacturing/AX_ManufacturingDisassembly'
import { AX_TreasuryLedger } from './components/treasury/AX_TreasuryLedger'
import { AX_VanDistribution } from './components/distribution/AX_VanDistribution'
import { AX_InvoicesManager } from './components/invoices/AX_InvoicesManager'
import { AX_CustomersManager } from './components/customers/AX_CustomersManager'
import { AX_SuppliersManager } from './components/suppliers/AX_SuppliersManager'
import { AX_SalesRepsManager } from './components/sales_reps/AX_SalesRepsManager'
import { AX_ReportsManager } from './components/reports/AX_ReportsManager'
import { AX_StaffManager } from './components/staff/AX_StaffManager'
import { AX_StaffOnboardingScreen } from './components/staff/AX_StaffOnboardingScreen'
import { AX_LoginScreen } from './components/auth/AX_LoginScreen'

export default function App() {
  const { profile, setProfile, activeTab, setActiveTab, hydrateFromSupabase } = useAXStore()
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('ax_welcome_seen')
    }
    return false
  })

  useEffect(() => {
    const syncDatabase = () => {
      AX_DatabaseSync.fetchFullDatabase().then((data) => {
        if (data) hydrateFromSupabase(data)
      })
    }

    syncDatabase()

    if (!isSupabaseConfigured() || !supabase?.channel) return
    const dataChannel = supabase
      .channel('realtime:app_data_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ax_items' }, syncDatabase)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ax_warehouses' }, syncDatabase)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ax_clients' }, syncDatabase)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ax_suppliers' }, syncDatabase)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ax_invoices' }, syncDatabase)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ax_inventory_stock' }, syncDatabase)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ax_manufacturing_orders' }, syncDatabase)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ax_categories' }, syncDatabase)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ax_treasuries' }, syncDatabase)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ax_cash_transactions' }, syncDatabase)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ax_notifications' }, syncDatabase)
      .subscribe()

    return () => {
      supabase.removeChannel(dataChannel)
    }
  }, [hydrateFromSupabase])

  const handleForceLogout = useCallback(() => {
    try {
      localStorage.removeItem('ax_auth_user')
      localStorage.removeItem('ax_user_profile')
      localStorage.removeItem('ax_active_tab')
      sessionStorage.removeItem('ax_auth_user')
      sessionStorage.removeItem('ax_user_profile')
    } catch (e) {}
    setProfile(null)
  }, [setProfile])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('_v=')) {
      const params = new URLSearchParams(window.location.search)
      params.delete('_v')
      const newQuery = params.toString() ? `?${params.toString()}` : ''
      const cleanUrl = window.location.pathname + newQuery + (window.location.hash || '')
      window.history.replaceState({}, document.title, cleanUrl)
    }
  }, [])

  useEffect(() => {
    if (!profile?.id) return
    if (!hasModuleAccess(profile, activeTab)) {
      const allowedTab = getFirstAccessibleTab(profile)
      setActiveTab(allowedTab)
    }
  }, [profile, activeTab, setActiveTab])

  useEffect(() => {
    if (!profile?.id || isMasterUser(profile)) return

    const channel = supabase
      .channel(`realtime:user_profile_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ax_users_profiles',
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            if (payload.old?.id === profile.id) {
              handleForceLogout()
            }
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new?.id === profile.id) {
              if (payload.new.is_active === false) {
                handleForceLogout()
              } else {
                const updated = {
                  ...profile,
                  ...payload.new,
                  name: payload.new.full_name || profile.name,
                  permissions: payload.new.permissions || profile.permissions,
                  role: payload.new.role || profile.role,
                }
                setProfile(updated)
                try {
                  localStorage.setItem('ax_auth_user', JSON.stringify(updated))
                  localStorage.setItem('ax_user_profile', JSON.stringify(updated))
                } catch (e) {}
                if (!hasModuleAccess(updated, activeTab)) {
                  setActiveTab(getFirstAccessibleTab(updated))
                }
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, activeTab, setActiveTab, handleForceLogout])

  useEffect(() => {
    if (!profile?.id || isMasterUser(profile)) return

    const handleFocus = async () => {
      try {
        const { data, error } = await supabase
          .from('ax_users_profiles')
          .select('id, is_active, permissions, role, full_name')
          .eq('id', profile.id)
          .maybeSingle()

        if (error) return

        if (!data || !data.is_active) {
          handleForceLogout()
        } else {
          const updated = {
            ...profile,
            ...data,
            name: data.full_name || profile.name,
            permissions: data.permissions || profile.permissions,
            role: data.role || profile.role,
          }
          setProfile(updated)
          try {
            localStorage.setItem('ax_auth_user', JSON.stringify(updated))
            localStorage.setItem('ax_user_profile', JSON.stringify(updated))
          } catch (e) {}
          if (!hasModuleAccess(updated, activeTab)) {
            setActiveTab(getFirstAccessibleTab(updated))
          }
        }
      } catch (e) {}
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [profile, activeTab, setActiveTab, handleForceLogout])

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const inviteToken = urlParams ? urlParams.get('invite') : null

  if (inviteToken) {
    return (
      <AX_StaffOnboardingScreen
        inviteToken={inviteToken}
        onComplete={(user) => {
          setProfile(user)
          window.history.replaceState({}, document.title, window.location.pathname)
        }}
      />
    )
  }

  if (!profile?.id) {
    return <AX_LoginScreen onLoginSuccess={setProfile} />
  }

  return (
    <div className="min-h-screen flex flex-col font-cairo bg-surface text-on-surface">
      {showWelcome && (
        <AX_WelcomeOverlay
          appName="بروتين فود - لتجهيز وحفظ اللحوم المجمدة"
          userName={profile?.name || profile?.full_name}
          onComplete={() => {
            sessionStorage.setItem('ax_welcome_seen', 'true')
            setShowWelcome(false)
          }}
        />
      )}

      <AX_Header />
      <AX_InstallPwaBanner />
      <AppUpdateNotifier />
      <AX_InAppErrorAlert />
      <AX_ToastContainer />
      <AX_MandatoryPushModal profile={profile} />

      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-6 flex gap-5 items-start">
        <AX_Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        <section className="flex-1 min-w-0 w-full space-y-4">
          <div className="animate-in fade-in duration-150">
            <AX_ErrorBoundary onReset={() => setActiveTab(getFirstAccessibleTab(profile))}>
              {activeTab === 'dashboard' && hasModuleAccess(profile, 'dashboard') && <AX_Dashboard />}
              {activeTab === 'items' && hasModuleAccess(profile, 'items') && <AX_ItemsCatalog />}
              {activeTab === 'warehouses' && hasModuleAccess(profile, 'warehouses') && <AX_WarehousesInventory />}
              {activeTab === 'manufacturing' && hasModuleAccess(profile, 'manufacturing') && <AX_ManufacturingDisassembly />}
              {activeTab === 'distribution' && hasModuleAccess(profile, 'distribution') && <AX_VanDistribution />}
              {activeTab === 'treasury' && hasModuleAccess(profile, 'treasury') && <AX_TreasuryLedger />}
              {activeTab === 'invoices' && hasModuleAccess(profile, 'invoices') && <AX_InvoicesManager />}
              {activeTab === 'customers' && hasModuleAccess(profile, 'customers') && <AX_CustomersManager />}
              {activeTab === 'suppliers' && hasModuleAccess(profile, 'suppliers') && <AX_SuppliersManager />}
              {activeTab === 'sales_reps' && hasModuleAccess(profile, 'sales_reps') && <AX_SalesRepsManager />}
              {activeTab === 'reports' && hasModuleAccess(profile, 'reports') && <AX_ReportsManager />}
              {activeTab === 'staff' && hasModuleAccess(profile, 'staff') && <AX_StaffManager />}
            </AX_ErrorBoundary>
          </div>

          <footer className="w-full border border-outline-variant/30 bg-surface-lowest/95 backdrop-blur-md py-3 px-4 sm:px-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs font-black text-on-surface-variant shadow-sm mt-8 mb-28 lg:mb-4 transition-all text-center sm:text-right select-none">
            <div className="flex items-center gap-2">
              <span>بروتين فود © 2026 — كافة الحقوق محفوظة</span>
              <span className="text-outline-variant font-mono">•</span>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new Event('ax-check-update'))
                }}
                className="text-[10px] font-mono font-black text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2.5 py-0.5 rounded-full cursor-pointer transition-all active:scale-95"
                title="فحص وجود تحديثات جديدة للمنظومة"
              >
                v{import.meta.env.VITE_APP_VERSION || '1.7.0'}
              </button>
            </div>
            <a
              href="https://axsonid.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface-low hover:bg-surface-container text-on-surface-variant hover:text-primary border border-outline-variant/30 hover:border-primary/40 transition-all font-mono font-black text-[11px] group cursor-pointer shadow-xs"
              title="Created by AXONID"
            >
              <span className="font-sans font-bold text-outline-variant group-hover:text-on-surface-variant">Created by</span>
              <span className="text-primary font-black tracking-wide group-hover:text-primary-dark">AXONID</span>
            </a>
          </footer>
        </section>
      </main>

      <AX_MobileNavbar activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  )
}
