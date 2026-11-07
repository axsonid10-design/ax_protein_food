import React, { useState, useRef } from 'react'
import { User, Camera, KeyRound, Lock, Check, X, ShieldAlert, CheckCircle2, Building2, Hash, Phone, MapPin } from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { getCompanyProfile, saveCompanyProfile } from '../../services/axCompanyProfileService'

export function AX_UserProfileModal({ isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const { profile, updateProfile } = useAXStore()
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('profile')
  const [name, setName] = useState(profile?.name || 'مدير النظام')
  const [email, setEmail] = useState(profile?.email || 'admin@protein-food.com')
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatarUrl || '/logo-clean-original.png')

  const [companyForm, setCompanyForm] = useState(getCompanyProfile)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'حجم الصورة يجب ألا يتجاوز 2 ميجابايت' })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result
      if (typeof dataUrl === 'string') {
        setAvatarPreview(dataUrl)
        updateProfile({ avatarUrl: dataUrl })
        setFeedback({ type: 'success', message: 'تم تحديث الصورة الشخصية بنجاح' })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    if (!name.trim()) return

    updateProfile({ name: name.trim(), email: email.trim(), avatarUrl: avatarPreview })
    setFeedback({ type: 'success', message: 'تم حفظ بيانات الحساب بنجاح' })
  }

  const handleSaveCompany = (e) => {
    e.preventDefault()
    if (!companyForm.name?.trim()) return
    saveCompanyProfile(companyForm)
    setFeedback({ type: 'success', message: 'تم حفظ بيانات المؤسسة والترويسة بنجاح' })
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setFeedback({ type: '', message: '' })

    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'كلمة المرور يجب ألا تقل عن 6 خانات' })
      return
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'كلمة المرور وتأكيدها غير متطابقين' })
      return
    }

    setIsSubmitting(true)
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
      }

      setFeedback({ type: 'success', message: 'تم تغيير كلمة المرور بنجاح' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'حدث خطأ أثناء تحديث كلمة المرور' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPasswordLink = async () => {
    if (!email) {
      setFeedback({ type: 'error', message: 'يرجى إدخال البريد الإلكتروني أولاً' })
      return
    }

    setIsSubmitting(true)
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
      }
      setFeedback({ type: 'success', message: `تم إرسال رابط استعادة كلمة المرور إلى ${email}` })
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'تعذر إرسال رابط الاستعادة' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-level3 space-y-4 overscroll-contain">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-primary/10 text-primary">
              <User className="w-5 h-5" />
            </span>
            <div className="text-right">
              <h3 className="text-base font-black text-on-surface">الملف الشخصي وإعدادات الحساب</h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                {profile?.role === 'admin' ? 'مدير المنظومة' : 'مستخدم'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex rounded-full bg-surface-low p-1 border border-outline-variant/30 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile')
              setFeedback({ type: '', message: '' })
            }}
            className={`flex-1 py-1.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'profile' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            البيانات الشخصية
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('company')
              setFeedback({ type: '', message: '' })
            }}
            className={`flex-1 py-1.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'company' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            بيانات المؤسسة
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('password')
              setFeedback({ type: '', message: '' })
            }}
            className={`flex-1 py-1.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'password' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            الأمان
          </button>
        </div>

        {feedback.message && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex flex-col items-center justify-center gap-2 pt-1">
              <div className="relative group">
                <img
                  src={avatarPreview}
                  alt={name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-primary/20 shadow-sm"
                  onError={(e) => {
                    e.currentTarget.src = '/logo-clean-original.png'
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-white shadow-level2 hover:bg-primary-dark transition-all transform active:scale-95 cursor-pointer"
                  title="تغيير الصورة"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <span className="text-[11px] font-bold text-on-surface-variant">انقر الكاميرا لتغيير صورتك</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-on-surface mb-1">اسم المستخدم</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-on-surface text-xs font-bold focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-on-surface mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-on-surface text-xs font-bold focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                حفظ التعديلات
              </button>
            </div>
          </form>
        )}

        {activeTab === 'company' && (
          <form onSubmit={handleSaveCompany} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>اسم الشركة / المنشأة</span>
              </label>
              <input
                type="text"
                required
                value={companyForm.name || ''}
                onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-bold text-on-surface outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-on-surface">النشاط / الوصف التجاري</label>
              <input
                type="text"
                value={companyForm.subtitle || ''}
                onChange={(e) => setCompanyForm((p) => ({ ...p, subtitle: e.target.value }))}
                className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-bold text-on-surface outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-black text-on-surface">س.ت (السجل)</label>
                <input
                  type="text"
                  value={companyForm.crNumber || ''}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, crNumber: e.target.value }))}
                  className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-mono font-bold text-on-surface outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-on-surface">ب.ض (الضريبة)</label>
                <input
                  type="text"
                  value={companyForm.taxNumber || ''}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, taxNumber: e.target.value }))}
                  className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-mono font-bold text-on-surface outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>رقم الهاتف الرسمي</span>
              </label>
              <input
                type="text"
                value={companyForm.phone || ''}
                onChange={(e) => setCompanyForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-mono font-bold text-on-surface outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>العنوان / المقر</span>
              </label>
              <input
                type="text"
                value={companyForm.address || ''}
                onChange={(e) => setCompanyForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full px-3 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-bold text-on-surface outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>حفظ بيانات المؤسسة</span>
            </button>
          </form>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div>
              <label className="block text-xs font-black text-on-surface mb-1">كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6 خانات على الأقل"
                  className="w-full px-4 py-2 pl-9 rounded-2xl bg-surface-low border border-outline-variant/40 text-on-surface text-xs font-bold focus:border-primary focus:outline-none"
                  required
                />
                <Lock className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-on-surface mb-1">تأكيد كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور"
                  className="w-full px-4 py-2 pl-9 rounded-2xl bg-surface-low border border-outline-variant/40 text-on-surface text-xs font-bold focus:border-primary focus:outline-none"
                  required
                />
                <Lock className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div className="pt-1 flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                {isSubmitting ? 'جاري التحديث...' : 'تغيير كلمة المرور'}
              </button>

              <button
                type="button"
                onClick={handleResetPasswordLink}
                disabled={isSubmitting}
                className="w-full py-2 text-center text-xs font-bold text-primary hover:underline transition-all"
              >
                نسيت كلمة المرور؟ إرسال رابط الاستعادة للبريد
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default AX_UserProfileModal
