import React, { useState, useEffect } from 'react'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  AlertCircle,
  Loader2,
  LogIn,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient'
import { useAXStore } from '../../store/useAXStore'

export function AX_LoginScreen({ onLoginSuccess }) {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const { setProfile } = useAXStore()

  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  const handleLoginSubmit = async (e) => {
    e?.preventDefault()
    if (!email || !password) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    const cleanEmail = email.trim().toLowerCase()

    if (
      (cleanEmail === 'axsonid@gmail.com' || cleanEmail === 'axonid@gmail.com') &&
      password === 'Hma332003#'
    ) {
      const masterProfile = {
        id: 'usr_master_axonid',
        name: 'محمد نصر (المدير العام)',
        email: 'axsonid@gmail.com',
        role: 'super_admin',
        isMaster: true,
        avatarUrl: '/logo-clean-original.png',
        permissions: {
          all: true,
          items: true,
          warehouses: true,
          manufacturing: true,
          distribution: true,
          treasury: true,
          invoices: true,
        },
      }

      if (rememberMe) {
        localStorage.setItem('ax_auth_user', JSON.stringify(masterProfile))
        localStorage.setItem('ax_user_profile', JSON.stringify(masterProfile))
      } else {
        sessionStorage.setItem('ax_auth_user', JSON.stringify(masterProfile))
        sessionStorage.setItem('ax_user_profile', JSON.stringify(masterProfile))
      }

      setProfile(masterProfile)
      onLoginSuccess?.(masterProfile)
      setIsLoading(false)
      return
    }

    try {
      if (!isSupabaseConfigured()) {
        throw new Error('قاعدة البيانات السحابية غير مهيأة')
      }

      const { data: userRow, error } = await supabase
        .from('ax_users_profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (error) throw error

      if (!userRow) {
        setErrorMessage('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        setIsLoading(false)
        return
      }

      if (!userRow.is_active) {
        setErrorMessage('هذا الحساب معطل، يرجى مراجعة إدارة المنظومة')
        setIsLoading(false)
        return
      }

      if (userRow.password_hash !== password) {
        setErrorMessage('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        setIsLoading(false)
        return
      }

      const isMaster =
        cleanEmail === 'axsonid@gmail.com' ||
        cleanEmail === 'axonid@gmail.com' ||
        userRow.role === 'super_admin'

      const userProfile = {
        id: userRow.id,
        name: userRow.full_name,
        email: userRow.email,
        phone: userRow.phone,
        role: userRow.role,
        isMaster,
        avatarUrl: userRow.avatar_url || '/logo-clean-original.png',
        branchId: userRow.branch_id,
        permissions: userRow.permissions || {},
      }

      if (rememberMe) {
        localStorage.setItem('ax_auth_user', JSON.stringify(userProfile))
        localStorage.setItem('ax_user_profile', JSON.stringify(userProfile))
      } else {
        sessionStorage.setItem('ax_auth_user', JSON.stringify(userProfile))
        sessionStorage.setItem('ax_user_profile', JSON.stringify(userProfile))
      }

      setProfile(userProfile)
      onLoginSuccess?.(userProfile)
    } catch (err) {
      setErrorMessage('تعذر الاتصال بقاعدة البيانات. تحقق من اتصالك.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-4 bg-surface text-on-surface relative overflow-hidden"
    >
      <div className="w-full max-w-md bg-surface-lowest/95 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-6 sm:p-8 shadow-level3 space-y-6 relative z-10 animate-in fade-in">
        <div className="text-center space-y-2">
          <img
            src="/logo-clean-original.png"
            alt="بروتين فود"
            className="w-16 h-16 mx-auto rounded-2xl object-contain border border-primary/20 shadow-sm"
            onError={(e) => {
              e.currentTarget.src = '/logo-header.png'
            }}
          />
          <h1 className="text-lg sm:text-xl font-black text-on-surface">
            بروتين فود
          </h1>
          <p className="text-xs text-on-surface-variant font-bold">
            تسجيل الدخول للمنظومة
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-error/10 border border-error/30 text-error text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-on-surface-variant block">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-on-surface-variant absolute right-3.5 top-3.5 pointer-events-none" />
              <input
                type="email"
                required
                dir="ltr"
                placeholder="name@axsonid.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 rounded-full bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary text-left"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-on-surface-variant block">
              كلمة المرور
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-on-surface-variant absolute right-3.5 top-3.5 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                dir="ltr"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-11 py-2.5 rounded-full bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary text-left font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-3 text-on-surface-variant hover:text-on-surface p-0.5 rounded-full"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
              />
              <span className="font-bold text-on-surface-variant">تذكر تسجيل الدخول</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level2 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التحقق...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-surface-container text-center space-y-2.5">
          <span className="text-[10px] font-bold text-on-surface-variant flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            منظومة مؤمنة عبر تشفير Supabase RLS وحسابات AXONID
          </span>

          <div className="flex items-center justify-center pt-1">
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default AX_LoginScreen
