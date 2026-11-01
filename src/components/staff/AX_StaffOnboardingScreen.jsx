import React, { useState, useEffect } from 'react'
import {
  User,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { supabase } from '../../services/supabaseClient'

export function AX_StaffOnboardingScreen({ inviteToken, onComplete }) {
  const { addEmployee, setProfile } = useAXStore()

  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorStatus, setErrorStatus] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    const fetchInvite = async () => {
      if (!inviteToken) {
        setErrorStatus('لم يتم العثور على رمز دعوة صالح')
        setLoading(false)
        return
      }

      try {
        let found = null

        try {
          const { data, error } = await supabase
            .from('ax_staff_invites')
            .select('*')
            .eq('token', inviteToken)
            .maybeSingle()

          if (!error && data) {
            found = {
              ...data,
              roleTitle: data.role_title || data.role,
              warehouseId: data.warehouse_id,
              warehouseName: data.warehouse_name || 'كافة الفروع والمخازن',
              expiresAt: data.expires_at,
            }
          }
        } catch (e) {}

        if (!found) {
          try {
            const savedInvites = JSON.parse(localStorage.getItem('ax_staff_invites') || '[]')
            found = savedInvites.find((i) => i.token === inviteToken)
          } catch (e) {}
        }

        if (!found) {
          setErrorStatus('رابط الدعوة غير صالح أو غير موجود')
        } else if (found.status === 'accepted') {
          setErrorStatus('تم استخدام رابط الدعوة هذا من قبل وتسجيل الحساب بالفعل')
        } else if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
          setErrorStatus('انتهت صلاحية رابط الدعوة، يرجى طلب رابط جديد من الإدارة')
        } else {
          setInvite(found)
        }
      } catch (err) {
        setErrorStatus('حدث خطأ أثناء فحص رابط الدعوة')
      } finally {
        setLoading(false)
      }
    }

    fetchInvite()
  }, [inviteToken])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')

    if (!fullName.trim() || !phone.trim() || !password) {
      setSubmitError('يرجى ملء كافة الحقول الأساسية المطلوبة')
      return
    }

    if (password.length < 6) {
      setSubmitError('كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام')
      return
    }

    if (password !== confirmPassword) {
      setSubmitError('كلمتا المرور غير متطابقتين')
      return
    }

    setSubmitting(true)

    try {
      const cleanEmail = (email.trim() || `${phone.trim()}@axsonid.com`).toLowerCase()

      try {
        const { data: existingUser } = await supabase
          .from('ax_users_profiles')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle()

        if (existingUser) {
          setSubmitError('هذا البريد الإلكتروني مسجل بالفعل في المنظومة')
          setSubmitting(false)
          return
        }
      } catch (e) {}

      const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      const roleVal = invite.roleTitle || invite.role_title || invite.role || 'موظف'
      const branchVal = invite.warehouseId || invite.warehouse_id || null

      const newProfile = {
        id: newUserId,
        full_name: fullName.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        password_hash: password,
        role: roleVal,
        branch_id: branchVal,
        permissions: invite.permissions || {},
        is_active: true,
        avatar_url: '/logo-clean-original.png',
      }

      try {
        await supabase.from('ax_users_profiles').insert([newProfile])
      } catch (e) {}

      if (invite.id) {
        try {
          await supabase
            .from('ax_staff_invites')
            .update({
              status: 'accepted',
              claimed_at: new Date().toISOString(),
              claimed_by_email: cleanEmail,
              claimed_by_name: fullName.trim(),
            })
            .eq('id', invite.id)
        } catch (e) {}
      }

      try {
        const savedInvites = JSON.parse(localStorage.getItem('ax_staff_invites') || '[]')
        const updatedInvites = savedInvites.map((i) =>
          i.token === inviteToken ? { ...i, status: 'accepted' } : i
        )
        localStorage.setItem('ax_staff_invites', JSON.stringify(updatedInvites))
      } catch (e) {}

      const storeEmployee = {
        id: newUserId,
        code: `EMP-${String(Date.now()).slice(-3)}`,
        name: fullName.trim(),
        role: invite.role || 'staff',
        roleTitle: roleVal,
        phone: phone.trim(),
        email: cleanEmail,
        warehouseId: branchVal || 'all',
        warehouseName: invite.warehouseName || invite.warehouse_name || 'كافة الفروع والمخازن',
        status: 'active',
        hireDate: new Date().toISOString().split('T')[0],
        permissions: invite.permissions || {},
      }

      try {
        addEmployee(storeEmployee)
      } catch (e) {}

      const userSession = {
        id: newUserId,
        name: fullName.trim(),
        role: invite.role || 'staff',
        roleTitle: roleVal,
        phone: phone.trim(),
        email: cleanEmail,
        warehouseId: branchVal || 'all',
        permissions: invite.permissions || {},
        avatarUrl: '/logo-clean-original.png',
      }

      try {
        localStorage.setItem('ax_auth_user', JSON.stringify(userSession))
        localStorage.setItem('ax_user_profile', JSON.stringify(userSession))
      } catch (e) {}

      setProfile(userSession)
      window.history.replaceState({}, '', '/')

      if (onComplete) {
        onComplete(userSession)
      } else {
        window.location.href = '/'
      }
    } catch (err) {
      setSubmitError(err.message || 'حدث خطأ أثناء إتمام التسجيل')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface-low" dir="rtl">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-8 max-w-lg w-full space-y-4 animate-pulse">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-surface-container" />
          <div className="h-5 bg-surface-container rounded-full w-48 mx-auto" />
          <div className="h-4 bg-surface-container rounded-full w-32 mx-auto" />
          <div className="space-y-3 pt-4">
            <div className="h-11 bg-surface-container rounded-2xl w-full" />
            <div className="h-11 bg-surface-container rounded-2xl w-full" />
            <div className="h-11 bg-surface-container rounded-2xl w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (errorStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface-low" dir="rtl">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-on-surface">تعذر استخدام رابط الدعوة</h3>
          <p className="text-xs font-bold text-on-surface-variant leading-relaxed">
            {errorStatus}
          </p>
          <div className="pt-2">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-xs font-black shadow-sm"
            >
              <span>الذهاب لصفحة الدخول</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-low" dir="rtl">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in duration-200">
        <div className="text-center space-y-2">
          <img
            src="/logo-clean-original.png"
            alt="بروتين فود"
            className="w-12 h-12 mx-auto object-contain"
            onError={(e) => {
              e.currentTarget.src = '/logo-header.png'
            }}
          />
          <h2 className="text-lg sm:text-xl font-black text-on-surface">
            تفعيل حساب الموظف بالمنظومة
          </h2>
          <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary">
              <ShieldCheck className="w-4 h-4" />
              <span>المسمى: {invite.roleTitle}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface-low border border-outline-variant/40 text-xs font-bold text-on-surface-variant">
              <span>الفرع/المخزن: {invite.warehouseName}</span>
            </span>
          </div>
        </div>

        {submitError && (
          <div className="p-3 rounded-2xl bg-error/10 border border-error/20 text-error font-black text-xs text-center">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-bold">
          <div className="space-y-1">
            <label className="text-on-surface flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>الاسم ثلاثي:</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: أحمد عبد الله الشافعي"
              className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary text-on-surface font-bold outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-on-surface flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span>رقم الهاتف (لتسجيل الدخول):</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010xxxxxxxx"
              className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary text-on-surface font-mono font-bold outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-on-surface flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span>البريد الإلكتروني (اختياري):</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@protein-food.com"
              className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary text-on-surface font-bold outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-on-surface flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>كلمة المرور:</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full h-11 pr-3.5 pl-9 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary text-on-surface font-mono font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-on-surface flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>تأكيد كلمة المرور:</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="******"
                className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary text-on-surface font-mono font-bold outline-none"
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-full bg-primary hover:bg-primary-dark text-white font-black text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'جاري تفعيل الحساب...' : 'تفعيل الحساب والدخول للنظام'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
