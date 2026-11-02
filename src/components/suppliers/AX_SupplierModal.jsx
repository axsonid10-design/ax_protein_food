import React, { useState, useEffect } from 'react'
import {
  X,
  Building2,
  User,
  Phone,
  MapPin,
  Tag,
  DollarSign,
  FileText,
  CheckCircle2,
  Layers,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { AX_SupplierOperationsService } from '../../services/AX_SupplierOperationsService'
import { showToast } from '../common/AX_Toast'
import { generateUUID } from '../../utils/AX_UUID'
import { SUPPLY_TYPES, SUPPLIER_CATEGORIES } from './supplierConstants'
import { AX_CompanyDatePicker } from '../common/AX_CompanyDatePicker'

export function AX_SupplierModal({ isOpen, onClose, supplier = null, onSuccess }) {
  useBodyScrollLock(isOpen, onClose)
  const { addSupplier, updateSupplier, profile } = useAXStore()

  const [companyName, setCompanyName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [phone2, setPhone2] = useState('')
  const [address, setAddress] = useState('')
  const [supplyType, setSupplyType] = useState('frozen_meat')
  const [category, setCategory] = useState('لحوم حمراء ومصنعات')
  const [taxNumber, setTaxNumber] = useState('')
  const [commercialRegistration, setCommercialRegistration] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [openingBalanceType, setOpeningBalanceType] = useState('payable')
  const [openingBalanceDate, setOpeningBalanceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [currentBalance, setCurrentBalance] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditMode = Boolean(supplier && supplier.id)

  useEffect(() => {
    if (supplier) {
      setCompanyName(supplier.companyName || supplier.name || '')
      setContactPerson(supplier.contactPerson || '')
      setPhone(supplier.phone || '')
      setPhone2(supplier.phone2 || '')
      setAddress(supplier.address || '')
      setSupplyType(supplier.supplyType || 'frozen_meat')
      setCategory(supplier.category || 'لحوم حمراء ومصنعات')
      setTaxNumber(supplier.taxNumber || '')
      setCommercialRegistration(supplier.commercialRegistration || supplier.commercialRegister || '')
      setOpeningBalance(supplier.openingBalance !== undefined ? String(supplier.openingBalance) : '')
      setOpeningBalanceType(supplier.openingBalanceType || 'payable')
      setOpeningBalanceDate(supplier.openingBalanceDate || supplier.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0])
      setCurrentBalance(supplier.balance !== undefined ? String(supplier.balance) : '0')
      setNotes(supplier.notes || '')
    } else {
      setCompanyName('')
      setContactPerson('')
      setPhone('')
      setPhone2('')
      setAddress('')
      setSupplyType('frozen_meat')
      setCategory('لحوم حمراء ومصنعات')
      setTaxNumber('')
      setCommercialRegistration('')
      setOpeningBalance('')
      setOpeningBalanceType('payable')
      setOpeningBalanceDate(new Date().toISOString().split('T')[0])
      setCurrentBalance('')
      setNotes('')
    }
  }, [supplier, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!companyName.trim()) {
      showToast('يرجى إدخال اسم الشركة أو المورد', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      const rawOpening = Number(openingBalance) || 0
      const normalizedOpening = rawOpening === 0 ? 0 : rawOpening
      const signedOpening = normalizedOpening === 0 ? 0 : (openingBalanceType === 'payable' ? normalizedOpening : -normalizedOpening)

      if (isEditMode) {
        const parsedBal = currentBalance !== '' ? Number(currentBalance) : supplier.balance
        const finalBal = isNaN(parsedBal) ? 0 : (parsedBal === 0 ? 0 : parsedBal)
        const updated = {
          ...supplier,
          companyName: companyName.trim(),
          name: companyName.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          phone2: phone2.trim(),
          address: address.trim(),
          supplyType,
          category,
          taxNumber: taxNumber.trim(),
          commercialRegistration: commercialRegistration.trim(),
          openingBalance: normalizedOpening,
          openingBalanceType,
          openingBalanceDate,
          balance: finalBal,
          notes: notes.trim(),
          updatedAt: new Date().toISOString(),
        }

        updateSupplier(supplier.id, updated)
        AX_SupplierOperationsService.updateSupplierInDB(updated, profile)
        showToast('تم تحديث بيانات المورد بنجاح', 'success')
      } else {
        const newSupplier = {
          id: generateUUID(),
          companyName: companyName.trim(),
          name: companyName.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          phone2: phone2.trim(),
          address: address.trim(),
          supplyType,
          category,
          taxNumber: taxNumber.trim(),
          commercialRegistration: commercialRegistration.trim(),
          openingBalance: normalizedOpening,
          openingBalanceType,
          openingBalanceDate,
          balance: signedOpening,
          notes: notes.trim(),
          createdAt: new Date().toISOString(),
        }

        addSupplier(newSupplier)
        await AX_SupplierOperationsService.addSupplierInDB(newSupplier, profile)
        showToast('تمت إضافة المورد بنجاح', 'success')
        if (onSuccess) onSuccess(newSupplier)
      }

      onClose()
    } catch {
      showToast('حدث خطأ أثناء حفظ بيانات المورد', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-level3 space-y-4 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-on-surface">
                {isEditMode ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                اسم الشركة / جهة التوريد <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="مثال: شركة النيل لاستيراد اللحوم"
                className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-semibold bg-surface-lowest text-on-surface outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                المسؤول / مندوب التوريد
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="اسم الشخص المسؤول"
                className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-semibold bg-surface-lowest text-on-surface outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" />
                رقم الهاتف الرئيسي
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-mono bg-surface-lowest text-on-surface outline-none text-right"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" />
                رقم هاتف إضافي
              </label>
              <input
                type="tel"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                placeholder="01xxxxxxxxx (اختياري)"
                dir="ltr"
                className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-mono bg-surface-lowest text-on-surface outline-none text-right"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              العنوان / مقر الشركة
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="مثال: المنطقة الحرة - ميناء الإسكندرية"
              className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-semibold bg-surface-lowest text-on-surface outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                نوع التوريد
              </label>
              <select
                value={supplyType}
                onChange={(e) => setSupplyType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-bold bg-surface-lowest text-on-surface outline-none cursor-pointer"
              >
                {SUPPLY_TYPES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                القسم / التصنيف
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-bold bg-surface-lowest text-on-surface outline-none cursor-pointer"
              >
                {SUPPLIER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                رقم السجل التجاري
              </label>
              <input
                type="text"
                value={commercialRegistration}
                onChange={(e) => setCommercialRegistration(e.target.value)}
                placeholder="رقم السجل التجاري"
                className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-mono bg-surface-lowest text-on-surface outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                رقم البطاقة الضريبية
              </label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="رقم التسجيل الضريبي"
                className="w-full px-3.5 py-2.5 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-mono bg-surface-lowest text-on-surface outline-none"
              />
            </div>
          </div>

          <div className="p-3.5 bg-surface-container/30 border border-outline-variant/30 rounded-2xl space-y-2.5">
            <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              الرصيد الافتتاحي والمعاملة المالية
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1">المبلغ الافتتاحي</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 rounded-full border border-outline-variant/60 focus:border-primary text-xs sm:text-sm font-mono font-black bg-surface-lowest text-on-surface outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1">طبيعة الحساب</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpeningBalanceType('payable')}
                    className={`flex-1 py-2 px-3 rounded-full text-xs font-black transition-all ${
                      openingBalanceType === 'payable'
                        ? 'bg-red-800 text-white shadow-xs'
                        : 'bg-surface-lowest border border-outline-variant/40 text-on-surface-variant'
                    }`}
                  >
                    دائن (له)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpeningBalanceType('receivable')}
                    className={`flex-1 py-2 px-3 rounded-full text-xs font-black transition-all ${
                      openingBalanceType === 'receivable'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-surface-lowest border border-outline-variant/40 text-on-surface-variant'
                    }`}
                  >
                    مدين (عليه)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1">تاريخ رصيد أول المدة</label>
                <AX_CompanyDatePicker
                  value={openingBalanceDate}
                  onChange={setOpeningBalanceDate}
                />
              </div>
            </div>

            {isEditMode && (
              <div className="pt-2 border-t border-surface-container flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface-variant">الرصيد الفعلي الحالي:</span>
                <input
                  type="number"
                  step="any"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(e.target.value)}
                  className="w-36 px-3 py-1 rounded-full border border-outline-variant/60 focus:border-primary text-xs font-mono font-black bg-surface-lowest text-on-surface outline-none text-left"
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface">ملاحظات إضافية</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="شروط السداد، مواعيد التسليم، بيانات إضافية..."
              className="w-full px-3.5 py-2 rounded-2xl border border-outline-variant/60 focus:border-primary text-xs bg-surface-lowest text-on-surface outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-5 rounded-full border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container text-xs font-bold transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-black shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditMode ? 'حفظ التعديلات' : 'إضافة المورد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AX_SupplierModal
