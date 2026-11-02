import React, { useState, useEffect } from 'react'
import {
  X,
  UserPlus,
  UserCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { uploadImage } from '../../services/imageKitService'
import { AX_CustomerOperationsService } from '../../services/AX_CustomerOperationsService'
import { showToast } from '../common/AX_Toast'
import { generateUUID } from '../../utils/AX_UUID'
import { DEFAULT_CATEGORIES } from './customerConstants'
import { AX_CustomerFormFields } from './AX_CustomerFormFields'

export function AX_CustomerModal({ isOpen, onClose, customer = null, onSuccess }) {
  useBodyScrollLock(isOpen, onClose)
  const { addClient, updateClient, profile } = useAXStore()

  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [phone2, setPhone2] = useState('')
  const [commercialRegister, setCommercialRegister] = useState('')
  const [taxNumber, setTaxNumber] = useState('')
  const [governorate, setGovernorate] = useState('القاهرة')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [primaryCategory, setPrimaryCategory] = useState('مطاعم وفنادق (HORECA)')
  const [subCategory, setSubCategory] = useState('مشويات وكباب')
  const [customSubCategory, setCustomSubCategory] = useState('')
  const [isAddingCustomSub, setIsAddingCustomSub] = useState(false)
  const [openingBalance, setOpeningBalance] = useState('')
  const [openingBalanceType, setOpeningBalanceType] = useState('debit')
  const [openingBalanceDate, setOpeningBalanceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [currentBalance, setCurrentBalance] = useState('')
  const [notes, setNotes] = useState('')
  const [attachments, setAttachments] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditMode = Boolean(customer && customer.id)

  useEffect(() => {
    if (customer) {
      setName(customer.name || '')
      setContactPerson(customer.contactPerson || '')
      setPhone(customer.phone || '')
      setPhone2(customer.phone2 || '')
      setCommercialRegister(customer.commercialRegister || '')
      setTaxNumber(customer.taxNumber || '')
      setGovernorate(customer.governorate || 'القاهرة')
      setCity(customer.city || '')
      setDistrict(customer.district || '')
      setAddress(customer.address || '')
      setPrimaryCategory(customer.primaryCategory || 'مطاعم وفنادق (HORECA)')
      setSubCategory(customer.subCategory || 'مشويات وكباب')
      setOpeningBalance(customer.openingBalance !== undefined ? String(customer.openingBalance) : '')
      setOpeningBalanceType(customer.openingBalanceType || 'debit')
      setOpeningBalanceDate(customer.openingBalanceDate || customer.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0])
      setCurrentBalance(customer.balance !== undefined ? String(customer.balance) : '0')
      setNotes(customer.notes || '')
      setAttachments(customer.attachments || [])
    } else {
      setName('')
      setContactPerson('')
      setPhone('')
      setPhone2('')
      setCommercialRegister('')
      setTaxNumber('')
      setGovernorate('القاهرة')
      setCity('')
      setDistrict('')
      setAddress('')
      setPrimaryCategory('مطاعم وفنادق (HORECA)')
      setSubCategory('مشويات وكباب')
      setCustomSubCategory('')
      setIsAddingCustomSub(false)
      setOpeningBalance('')
      setOpeningBalanceType('debit')
      setOpeningBalanceDate(new Date().toISOString().split('T')[0])
      setCurrentBalance('')
      setNotes('')
      setAttachments([])
    }
  }, [customer, isOpen])

  if (!isOpen) return null

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setIsUploading(true)
    try {
      for (const file of files) {
        const uploaded = await uploadImage(file, '/customers')
        setAttachments((prev) => [...prev, uploaded])
      }
      showToast('تم رفع المستند بنجاح', 'success')
    } catch {
      showToast('تعذر رفع المستند', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  const handlePrimaryCategoryChange = (val) => {
    setPrimaryCategory(val)
    const subs = DEFAULT_CATEGORIES[val] || ['عام']
    setSubCategory(subs[0] || 'عام')
    setIsAddingCustomSub(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      showToast('يرجى إدخال اسم العميل', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      const rawOpening = Number(openingBalance) || 0
      const normalizedOpening = rawOpening === 0 ? 0 : rawOpening
      const signedOpening = normalizedOpening === 0 ? 0 : (openingBalanceType === 'debit' ? normalizedOpening : -normalizedOpening)
      const finalSub = isAddingCustomSub && customSubCategory.trim() ? customSubCategory.trim() : subCategory
      const isIncomplete = !phone.trim() && !address.trim() && !city.trim()

      if (isEditMode) {
        const parsedBal = currentBalance !== '' ? Number(currentBalance) : customer.balance
        const finalBal = isNaN(parsedBal) ? 0 : (parsedBal === 0 ? 0 : parsedBal)
        const updated = {
          ...customer,
          name: name.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          phone2: phone2.trim(),
          commercialRegister: commercialRegister.trim(),
          taxNumber: taxNumber.trim(),
          governorate: governorate || '',
          city: city.trim(),
          district: district.trim(),
          address: address.trim(),
          primaryCategory: primaryCategory || '',
          subCategory: finalSub || '',
          openingBalance: normalizedOpening,
          openingBalanceType,
          openingBalanceDate,
          balance: finalBal,
          notes: notes.trim(),
          attachments,
          isIncomplete,
          updatedAt: new Date().toISOString(),
        }
        updateClient(customer.id, updated)
        AX_CustomerOperationsService.updateCustomerInDB(updated, profile)
        showToast('تم تحديث بيانات العميل بنجاح', 'success')
      } else {
        const newCust = {
          id: generateUUID(),
          name: name.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          phone2: phone2.trim(),
          commercialRegister: commercialRegister.trim(),
          taxNumber: taxNumber.trim(),
          governorate: governorate || '',
          city: city.trim(),
          district: district.trim(),
          address: address.trim(),
          primaryCategory: primaryCategory || '',
          subCategory: finalSub || '',
          openingBalance: normalizedOpening,
          openingBalanceType,
          openingBalanceDate,
          balance: signedOpening,
          notes: notes.trim(),
          attachments,
          isIncomplete,
          createdAt: new Date().toISOString(),
        }
        addClient(newCust)
        await AX_CustomerOperationsService.addCustomerInDB(newCust, profile)
        showToast(isIncomplete ? 'تمت إضافة العميل مع شارة بيانات ناقصة' : 'تمت إضافة العميل بنجاح', 'success')
        if (onSuccess) onSuccess(newCust)
      }
      onClose()
    } catch {
      showToast('حدث خطأ أثناء حفظ العميل', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isQuickMode = !phone.trim() && !address.trim() && !city.trim()

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-level3 space-y-4 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black">
              {isEditMode ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-on-surface">
                {isEditMode ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
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

        {!isEditMode && isQuickMode && name.trim() && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-2 text-xs font-bold text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>إضافة سريعة: سيتم وسم العميل بشارة (بيانات ناقصة) لعدم إدخال الهاتف أو العنوان.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
          <AX_CustomerFormFields
            name={name} setName={setName}
            contactPerson={contactPerson} setContactPerson={setContactPerson}
            phone={phone} setPhone={setPhone}
            phone2={phone2} setPhone2={setPhone2}
            commercialRegister={commercialRegister} setCommercialRegister={setCommercialRegister}
            taxNumber={taxNumber} setTaxNumber={setTaxNumber}
            governorate={governorate} setGovernorate={setGovernorate}
            city={city} setCity={setCity}
            district={district} setDistrict={setDistrict}
            address={address} setAddress={setAddress}
            primaryCategory={primaryCategory} handlePrimaryCategoryChange={handlePrimaryCategoryChange}
            subCategory={subCategory} setSubCategory={setSubCategory}
            customSubCategory={customSubCategory} setCustomSubCategory={setCustomSubCategory}
            isAddingCustomSub={isAddingCustomSub} setIsAddingCustomSub={setIsAddingCustomSub}
            openingBalance={openingBalance} setOpeningBalance={setOpeningBalance}
            openingBalanceType={openingBalanceType} setOpeningBalanceType={setOpeningBalanceType}
            openingBalanceDate={openingBalanceDate} setOpeningBalanceDate={setOpeningBalanceDate}
            currentBalance={currentBalance} setCurrentBalance={setCurrentBalance}
            isEditMode={isEditMode}
            attachments={attachments} isUploading={isUploading} handleFileUpload={handleFileUpload} handleRemoveAttachment={handleRemoveAttachment}
            notes={notes} setNotes={setNotes}
          />

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-5 rounded-full border border-outline-variant/60 text-xs font-bold text-on-surface hover:bg-surface-container transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="py-2 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : isEditMode ? 'تحديث البيانات' : 'حفظ العميل'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AX_CustomerModal
