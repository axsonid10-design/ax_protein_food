import React, { useState, useMemo } from 'react'
import { Truck, Plus, X, User, Phone, Hash, Wallet } from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { generateUUID } from '../../utils/AX_UUID'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { axToast } from '../common/AX_Toast'

export function AX_AddVehicleModal({ isOpen, onClose, onCreated }) {
  useBodyScrollLock(isOpen, onClose)
  const addWarehouse = useAXStore((state) => state.addWarehouse)
  const warehouses = useAXStore((state) => state.warehouses) || []
  const employees = useAXStore((state) => state.employees) || []
  const treasuryAccounts = useAXStore((state) => state.treasuryAccounts) || []
  const profile = useAXStore((state) => state.profile)

  const [name, setName] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [driverId, setDriverId] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [isManualDriver, setIsManualDriver] = useState(false)
  const [status, setStatus] = useState('active')
  const [errorMsg, setErrorMsg] = useState(null)

  const staffOptions = useMemo(() => {
    const list = []
    const profileName = profile?.full_name || profile?.name
    if (profile?.id && profileName) {
      list.push({ value: profile.id, label: `${profileName} (أنت)`, phone: profile.phone || '' })
    }
    for (const emp of employees) {
      if (emp?.id && emp?.name && !list.some((l) => l.value === emp.id)) {
        list.push({
          value: emp.id,
          label: `${emp.name} (${emp.roleTitle || 'مندوب / سائق'})`,
          phone: emp.phone || '',
        })
      }
    }
    return list
  }, [profile, employees])

  if (!isOpen) return null

  const handleDriverChange = (selectedId) => {
    setDriverId(selectedId)
    const emp = staffOptions.find((s) => s.value === selectedId)
    if (emp) {
      const cleanName = emp.label.split(' (')[0]
      setDriverName(cleanName)
      if (emp.phone) setDriverPhone(emp.phone)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم أو مسمى السيارة')
      return
    }
    if (!plateNumber.trim()) {
      setErrorMsg('يرجى إدخال رقم اللوحة المرورية')
      return
    }

    const cleanPlate = plateNumber.trim()
    const isDuplicatePlate = warehouses.some(
      (w) => w.type === 'van' && w.plateNumber && w.plateNumber.trim() === cleanPlate
    )
    if (isDuplicatePlate) {
      const msg = 'رقم اللوحة مسجل بالفعل لسيارة أخرى'
      setErrorMsg(msg)
      axToast.error(msg)
      return
    }

    const finalDriver = driverName.trim() || (staffOptions.find((s) => s.value === driverId)?.label?.split(' (')[0]) || 'مندوب التوزيع'

    try {
      const fallbackTreasury = treasuryAccounts.find((t) => t.type === 'van_cash')?.id || treasuryAccounts[0]?.id || 'c0000000-0000-0000-0000-000000000005'

      const newVehicle = {
        id: generateUUID(),
        name: name.trim(),
        type: 'van',
        plateNumber: cleanPlate,
        model: '',
        manager: finalDriver,
        driverName: finalDriver,
        driverId: isManualDriver ? null : (driverId || null),
        phone: driverPhone.trim() || null,
        treasuryId: fallbackTreasury,
        status,
        createdAt: new Date().toISOString(),
      }

      addWarehouse(newVehicle)
      axToast.success(`تمت إضافة سيارة التوزيع [${newVehicle.name}] بنجاح`)
      if (typeof onCreated === 'function') {
        onCreated(newVehicle)
      }
      onClose()
    } catch {
      setErrorMsg('فشل في حفظ بيانات السيارة')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface-lowest border-2 border-primary/20 rounded-3xl p-5 sm:p-6 shadow-level3 max-w-lg w-full space-y-4">
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-on-surface">إضافة سيارة توزيع جديدة</h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                تسجيل بيانات المركبة ومسؤول التوزيع
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-error/10 border border-error/20 text-xs font-bold text-error">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                اسم أو مسمى السيارة <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: سيارة جامبو 1 - الدلتا"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 mb-1">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span>رقم اللوحة المرورية</span> <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: س ع ص 4821"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface font-mono focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant block">
              حالة السيارة التشغيلية
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`py-2 px-3 rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  status === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-surface-low border border-outline-variant/30 text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-300" />
                <span>تعمل</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('maintenance')}
                className={`py-2 px-3 rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  status === 'maintenance'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-surface-low border border-outline-variant/30 text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-300" />
                <span>في الصيانة</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={`py-2 px-3 rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  status === 'inactive'
                    ? 'bg-error text-white shadow-xs'
                    : 'bg-surface-low border border-outline-variant/30 text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-error-container" />
                <span>لا تعمل</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-low/60 border border-outline-variant/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-primary flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                المندوب المسؤول
              </span>
              {staffOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsManualDriver(!isManualDriver)
                    setDriverId('')
                  }}
                  className="text-[11px] text-primary hover:underline font-bold cursor-pointer"
                >
                  {isManualDriver ? 'اختيار من فريق العمل' : 'كتابة اسم يدوي'}
                </button>
              )}
            </div>

            <div>
              {!isManualDriver && staffOptions.length > 0 ? (
                <AX_SearchableSelect
                  value={driverId}
                  onChange={handleDriverChange}
                  options={staffOptions}
                  placeholder="اختر السائق من فريق العمل..."
                />
              ) : (
                <input
                  type="text"
                  placeholder="اسم المندوب أو السائق..."
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface focus:border-primary transition-all"
                />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>رقم هاتف المندوب / السيارة</span>
              </label>
              <input
                type="tel"
                dir="ltr"
                placeholder="010XXXXXXXX"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-lowest border border-outline-variant/30 text-xs font-bold text-on-surface font-mono text-right focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface-low/80 border border-outline-variant/20 flex items-center gap-2.5 text-xs">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-on-surface block">خزينة وعهدة السيارة</span>
              <span className="text-[11px] text-on-surface-variant font-bold">
                تُخصص عهدة نقدية مستقلة للسيارة تلقائياً لتسجيل المبيعات والمصاريف وتصفيتها يومياً.
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-surface-container hover:bg-surface-high text-on-surface-variant text-xs font-bold cursor-pointer transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة وتفعيل السيارة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AX_AddVehicleModal
