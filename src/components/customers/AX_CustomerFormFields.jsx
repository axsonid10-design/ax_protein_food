import React from 'react'
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
} from 'lucide-react'
import { GOVERNORATES, DEFAULT_CATEGORIES } from './customerConstants'
import { getTransformedUrl } from '../../services/imageKitService'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'

export function AX_CustomerFormFields({
  name, setName,
  contactPerson, setContactPerson,
  phone, setPhone,
  phone2, setPhone2,
  commercialRegister, setCommercialRegister,
  taxNumber, setTaxNumber,
  governorate, setGovernorate,
  city, setCity,
  district, setDistrict,
  address, setAddress,
  primaryCategory, handlePrimaryCategoryChange,
  subCategory, setSubCategory,
  customSubCategory, setCustomSubCategory,
  isAddingCustomSub, setIsAddingCustomSub,
  openingBalance, setOpeningBalance,
  openingBalanceType, setOpeningBalanceType,
  openingBalanceDate, setOpeningBalanceDate,
  currentBalance, setCurrentBalance,
  isEditMode,
  attachments, isUploading, handleFileUpload, handleRemoveAttachment,
  notes, setNotes,
}) {
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
          <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            السجل التجاري
          </label>
          <input
            type="text"
            value={commercialRegister}
            onChange={(e) => setCommercialRegister(e.target.value)}
            placeholder="CR-XXXXXX"
            className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-mono bg-surface-lowest text-on-surface outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">البطاقة الضريبية</label>
          <input
            type="text"
            value={taxNumber}
            onChange={(e) => setTaxNumber(e.target.value)}
            placeholder="TX-XXX-XXX"
            className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-mono bg-surface-lowest text-on-surface outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">المحافظة</label>
          <select
            value={governorate}
            onChange={(e) => setGovernorate(e.target.value)}
            className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs font-semibold bg-surface-lowest text-on-surface outline-none cursor-pointer"
          >
            {GOVERNORATES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-primary" />
            التصنيف الرئيسي
          </label>
          <select
            value={primaryCategory}
            onChange={(e) => handlePrimaryCategoryChange(e.target.value)}
            className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs font-semibold bg-surface-lowest text-on-surface outline-none cursor-pointer"
          >
            {Object.keys(DEFAULT_CATEGORIES).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-on-surface">التصنيف الفرعي</label>
            <button
              type="button"
              onClick={() => setIsAddingCustomSub(!isAddingCustomSub)}
              className="text-[10px] text-primary hover:underline font-bold"
            >
              {isAddingCustomSub ? 'اختيار من القائمة' : '+ مخصص'}
            </button>
          </div>
          {isAddingCustomSub ? (
            <input
              type="text"
              value={customSubCategory}
              onChange={(e) => setCustomSubCategory(e.target.value)}
              placeholder="التصنيف الفرعي المخصص..."
              className="w-full px-3.5 py-2 rounded-full border border-primary text-xs font-semibold bg-surface-lowest text-on-surface outline-none"
            />
          ) : (
            <select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs font-semibold bg-surface-lowest text-on-surface outline-none cursor-pointer"
            >
              {(DEFAULT_CATEGORIES[primaryCategory] || ['عام']).map((sc) => (
                <option key={sc} value={sc}>{sc}</option>
              ))}
            </select>
          )}
        </div>
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
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-extrabold transition-all ${
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
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-extrabold transition-all ${
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
          <AX_CompanyDatePicker
            value={openingBalanceDate}
            onChange={setOpeningBalanceDate}
          />
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
          <span className="text-[11px] text-on-surface-variant">سجل، بطاقة ضريبية، واجهة</span>
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
                  className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
    </>
  )
}

export default AX_CustomerFormFields
