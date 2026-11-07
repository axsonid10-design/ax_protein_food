import React, { useState, useEffect } from 'react'
import { Building2, X, Check, Phone, FileText, MapPin, Hash } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { getCompanyProfile, saveCompanyProfile } from '../../services/axCompanyProfileService'
import { axToast } from '../common/AX_Toast'

export function AX_CompanyProfileModal({ isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const [form, setForm] = useState(getCompanyProfile)

  useEffect(() => {
    if (isOpen) {
      setForm(getCompanyProfile())
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name?.trim()) {
      axToast.error('يرجى إدخال اسم المؤسسة')
      return
    }
    saveCompanyProfile(form)
    axToast.success('تم حفظ بيانات المؤسسة والفاتورة بنجاح')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-level3 max-w-lg w-full space-y-4">
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-on-surface">بيانات المؤسسة والترويسة الرسمية</h3>
              <p className="text-[11px] font-bold text-on-surface-variant">البيانات الظاهرة أعلى الفواتير المطبوعة والمشتركة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>اسم المنشأة / الشركة</span>
            </label>
            <input
              type="text"
              required
              value={form.name || ''}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="مثال: بروتين فود"
              className="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-bold text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>النشاط / الوصف التجاري</span>
            </label>
            <input
              type="text"
              value={form.subtitle || ''}
              onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
              placeholder="مثال: لتجهيز وحفظ وتوزيع اللحوم المجمدة"
              className="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-bold text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span>رقم السجل التجاري (س.ت)</span>
              </label>
              <input
                type="text"
                value={form.crNumber || ''}
                onChange={(e) => setForm((p) => ({ ...p, crNumber: e.target.value }))}
                placeholder="مثال: 89452"
                className="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-mono font-bold text-on-surface outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span>رقم البطاقة الضريبية (ب.ض)</span>
              </label>
              <input
                type="text"
                value={form.taxNumber || ''}
                onChange={(e) => setForm((p) => ({ ...p, taxNumber: e.target.value }))}
                placeholder="مثال: 452-896-123"
                className="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-mono font-bold text-on-surface outline-none focus:border-primary"
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
              value={form.phone || ''}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="مثال: 01000000000"
              className="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-mono font-bold text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>المقر / العنوان الرسمي</span>
            </label>
            <input
              type="text"
              value={form.address || ''}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="مثال: المنطقة الصناعية - مخازن التبريد"
              className="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs font-bold text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-outline-variant/40 text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>حفظ البيانات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AX_CompanyProfileModal
