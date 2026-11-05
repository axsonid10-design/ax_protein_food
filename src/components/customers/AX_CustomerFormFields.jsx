import React, { useState, useEffect, useRef } from 'react'
import {
  Building,
  Phone,
  FileText,
  MapPin,
  Tag,
  DollarSign,
  Upload,
  Image as ImageIcon,
  X,
  UserCheck,
  UserPlus,
  Plus,
  Edit2,
} from 'lucide-react'
import { GOVERNORATES } from './customerConstants'
import { getTransformedUrl } from '../../services/imageKitService'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_AddSalesRepModal } from '../sales_reps/AX_AddSalesRepModal'
import {
  loadCustomerCategories,
  addCustomerCategory,
  editCustomerCategory,
} from './customerCategoryHelpers'

export function AX_CustomerFormFields({
  name, setName,
  contactPerson, setContactPerson,
  phone, setPhone,
  phone2, setPhone2,
  commercialRegister, setCommercialRegister,
  salesRepName, setSalesRepName,
  salesReps = [],
  governorate, setGovernorate,
  city, setCity,
  district, setDistrict,
  address, setAddress,
  primaryCategory, handlePrimaryCategoryChange,
  openingBalance, setOpeningBalance,
  openingBalanceType, setOpeningBalanceType,
  openingBalanceDate, setOpeningBalanceDate,
  currentBalance, setCurrentBalance,
  isEditMode,
  attachments, isUploading, handleFileUpload, handleRemoveAttachment,
  notes, setNotes,
}) {
  const [isAddRepOpen, setIsAddRepOpen] = useState(false)
  const prevRepsRef = useRef(salesReps)

  const [categories, setCategories] = useState(() => loadCustomerCategories())
  const [isAddCatOpen, setIsAddCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [isEditCatOpen, setIsEditCatOpen] = useState(false)
  const [editCatName, setEditCatName] = useState('')

  useEffect(() => {
    if (isAddRepOpen && salesReps.length > prevRepsRef.current.length) {
      const added = salesReps.find(
        (r) => !prevRepsRef.current.some((p) => (p.id && p.id === r.id) || p.name === r.name)
      ) || salesReps[salesReps.length - 1]
      if (added?.name) {
        setSalesRepName(added.name)
      }
    }
    prevRepsRef.current = salesReps
  }, [salesReps, isAddRepOpen, setSalesRepName])

  useEffect(() => {
    const handleCategoriesUpdate = (e) => {
      if (Array.isArray(e.detail)) setCategories(e.detail)
    }
    window.addEventListener('ax_customer_categories_updated', handleCategoriesUpdate)
    return () => window.removeEventListener('ax_customer_categories_updated', handleCategoriesUpdate)
  }, [])

  const salesRepOptions = [
    { value: '', label: 'إدارة مباشرة (بدون مندوب)' },
    ...salesReps.map((r) => ({
      value: r.name,
      label: r.name,
      sublabel: r.phone || r.assignedBranch || 'مندوب مبيعات',
    })),
  ]

  const categoryOptions = categories.map((c) => ({ value: c, label: c }))
  const governorateOptions = GOVERNORATES.map((g) => ({ value: g, label: g }))

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-primary" />
            اسم المنشأة / العميل <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: مطعم قصر الكبابجي"
            className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-semibold bg-surface-lowest text-on-surface outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">المسؤول / الاستلام</label>
          <input
            type="text"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="اسم المسؤول"
            className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-semibold bg-surface-lowest text-on-surface outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-primary" />
            الهاتف الرئيسي
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010XXXXXXXX"
            className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-mono bg-surface-lowest text-on-surface outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">هاتف إضافي</label>
          <input
            type="tel"
            value={phone2}
            onChange={(e) => setPhone2(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-mono bg-surface-lowest text-on-surface outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              تبعية المندوب
            </label>
            <button
              type="button"
              onClick={() => {
                prevRepsRef.current = salesReps
                setIsAddRepOpen(true)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-[11px] font-bold cursor-pointer"
              title="إضافة مندوب مبيعات جديد"
            >
              <UserPlus className="w-3 h-3" />
              <span>+ مندوب جديد</span>
            </button>
          </div>
          <AX_SearchableSelect
            value={salesRepName}
            onChange={(val) => setSalesRepName(val)}
            placeholder="اختر المندوب المسؤول..."
            options={salesRepOptions}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            السجل التجاري
          </label>
          <input
            type="text"
            value={commercialRegister}
            onChange={(e) => setCommercialRegister(e.target.value)}
            placeholder="سجل تجاري / ترخيص المنشأة"
            className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-mono bg-surface-lowest text-on-surface outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">المحافظة</label>
          <AX_SearchableSelect
            value={governorate}
            onChange={(val) => setGovernorate(val)}
            placeholder="اختر المحافظة..."
            options={governorateOptions}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">المدينة / المركز</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="مثال: طنطا"
            className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs font-semibold bg-surface-lowest text-on-surface outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">الحي / المنطقة</label>
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="مثال: حي النحاس"
            className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs font-semibold bg-surface-lowest text-on-surface outline-none"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          العنوان التفصيلي
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="الشارع، رقم العقار، علامة مميزة"
          className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-semibold bg-surface-lowest text-on-surface outline-none"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-primary" />
            تصنيف النشاط
          </label>
          <div className="flex items-center gap-1">
            {primaryCategory && (
              <button
                type="button"
                onClick={() => {
                  setEditCatName(primaryCategory)
                  setIsEditCatOpen((prev) => !prev)
                  setIsAddCatOpen(false)
                }}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-outline-variant/40 bg-surface-lowest text-on-surface-variant hover:text-primary transition-all text-[11px] font-bold cursor-pointer"
                title="تعديل اسم التصنيف المحدد"
              >
                <Edit2 className="w-2.5 h-2.5" />
                <span>تعديل</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setNewCatName('')
                setIsAddCatOpen((prev) => !prev)
                setIsEditCatOpen(false)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-[11px] font-bold cursor-pointer"
              title="إضافة تصنيف نشاط جديد"
            >
              <Plus className="w-3 h-3" />
              <span>+ تصنيف جديد</span>
            </button>
          </div>
        </div>

        <AX_SearchableSelect
          value={primaryCategory}
          onChange={(val) => handlePrimaryCategoryChange(val)}
          placeholder="اختر تصنيف النشاط..."
          options={categoryOptions}
        />

        {isAddCatOpen && (
          <div className="p-3 bg-surface-low border border-primary/30 rounded-2xl space-y-2 mt-1">
            <span className="text-xs font-black text-on-surface block">إضافة تصنيف نشاط جديد</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="مثال: مطابخ إعاشة ومستشفيات"
                className="flex-1 px-3 py-1.5 rounded-full border border-outline-variant/50 text-xs font-bold bg-surface-lowest outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => {
                  if (newCatName.trim()) {
                    const updated = addCustomerCategory(newCatName.trim())
                    setCategories(updated)
                    handlePrimaryCategoryChange(newCatName.trim())
                    setIsAddCatOpen(false)
                    setNewCatName('')
                  }
                }}
                className="px-3.5 py-1.5 rounded-full bg-primary text-white text-xs font-black shadow-xs hover:bg-primary-dark transition-all cursor-pointer"
              >
                إضافة
              </button>
              <button
                type="button"
                onClick={() => setIsAddCatOpen(false)}
                className="px-3 py-1.5 rounded-full border border-outline-variant/40 text-xs font-bold text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {isEditCatOpen && (
          <div className="p-3 bg-surface-low border border-amber-500/30 rounded-2xl space-y-2 mt-1">
            <span className="text-xs font-black text-on-surface block">تعديل اسم التصنيف الحالي</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editCatName}
                onChange={(e) => setEditCatName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-full border border-outline-variant/50 text-xs font-bold bg-surface-lowest outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => {
                  if (editCatName.trim() && primaryCategory) {
                    const updated = editCustomerCategory(primaryCategory, editCatName.trim())
                    setCategories(updated)
                    handlePrimaryCategoryChange(editCatName.trim())
                    setIsEditCatOpen(false)
                  }
                }}
                className="px-3.5 py-1.5 rounded-full bg-primary text-white text-xs font-black shadow-xs hover:bg-primary-dark transition-all cursor-pointer"
              >
                حفظ التعديل
              </button>
              <button
                type="button"
                onClick={() => setIsEditCatOpen(false)}
                className="px-3 py-1.5 rounded-full border border-outline-variant/40 text-xs font-bold text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-low/50 p-2.5 rounded-2xl border border-outline-variant/30">
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-primary" />
            رصيد أول المدة
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            placeholder="0.00"
            className="w-full px-3.5 py-1.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-mono font-bold bg-surface-lowest text-on-surface outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">طبيعة الرصيد</label>
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setOpeningBalanceType('debit')}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                openingBalanceType === 'debit'
                  ? 'bg-red-800 text-white shadow-xs'
                  : 'bg-surface-lowest border border-outline-variant/50 text-on-surface-variant'
              }`}
            >
              مدين (عليه)
            </button>
            <button
              type="button"
              onClick={() => setOpeningBalanceType('credit')}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                openingBalanceType === 'credit'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-surface-lowest border border-outline-variant/50 text-on-surface-variant'
              }`}
            >
              دائن (له)
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">تاريخ رصيد أول المدة</label>
          <AX_CompanyDatePicker value={openingBalanceDate} onChange={setOpeningBalanceDate} />
        </div>
      </div>

      {isEditMode && (
        <div className="space-y-1 bg-surface-low/30 p-2.5 rounded-2xl border border-outline-variant/20">
          <label className="text-xs font-bold text-on-surface">تعديل صافي الرصيد الحالي (ج.م)</label>
          <input
            type="number"
            step="any"
            value={currentBalance}
            onChange={(e) => setCurrentBalance(e.target.value)}
            className="w-full px-3.5 py-1.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs font-mono font-bold bg-surface-lowest text-on-surface outline-none"
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-bold text-on-surface flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-primary" />
            مستندات وصور العميل (ImageKit)
          </span>
          <span className="text-[11px] text-on-surface-variant">سجل، ترخيص، واجهة</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-dashed border-primary/50 text-primary hover:bg-primary/5 text-xs font-bold transition-all">
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'جاري الرفع...' : 'رفع مستند'}</span>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              disabled={isUploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {attachments.map((att, idx) => {
            const thumb = att.thumbnailUrl || att.url
            const displayThumb = thumb ? getTransformedUrl(thumb, { width: 80, height: 80, quality: 75 }) : thumb
            return (
              <div key={idx} className="relative group w-12 h-12 rounded-xl overflow-hidden border border-outline-variant/40 bg-surface-low flex items-center justify-center">
                {thumb ? (
                  <img src={displayThumb} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-5 h-5 text-on-surface-variant" />
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-on-surface">ملاحظات عامة</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أي ملاحظات تخص التعامل وساعات الاستلام..."
          className="w-full px-3.5 py-1.5 rounded-2xl border border-outline-variant/60 focus:border-primary text-xs bg-surface-lowest text-on-surface outline-none resize-none"
        />
      </div>

      <AX_AddSalesRepModal isOpen={isAddRepOpen} onClose={() => setIsAddRepOpen(false)} />
    </>
  )
}

export default AX_CustomerFormFields
