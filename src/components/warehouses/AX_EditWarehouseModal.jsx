import React, { useState, useEffect, useMemo } from 'react'
import { Warehouse, X, Check } from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { WAREHOUSE_TYPES } from './AX_AddWarehouseModal'

export function AX_EditWarehouseModal({ isOpen, onClose, warehouse }) {
  useBodyScrollLock(isOpen)
  const editWarehouse = useAXStore((state) => state.editWarehouse)
  const employees = useAXStore((state) => state.employees) || []
  const profile = useAXStore((state) => state.profile)

  const [name, setName] = useState('')
  const [type, setType] = useState('cold_store')
  const [manager, setManager] = useState('')
  const [phone, setPhone] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)

  const staffOptions = useMemo(() => {
    const list = []
    const profileName = profile?.full_name || profile?.name
    if (profileName) list.push({ name: profileName, role: 'أنت (المستخدم الحالي)' })
    employees.forEach((emp) => {
      if (emp?.name && !list.some((l) => l.name === emp.name)) {
        list.push({ name: emp.name, role: emp.roleTitle || 'موظف' })
      }
    })
    return list
  }, [profile, employees])

  useEffect(() => {
    if (warehouse) {
      setName(warehouse.name || '')
      const isKnownType = WAREHOUSE_TYPES.some((t) => t.value === warehouse.type)
      setType(isKnownType ? warehouse.type : 'cold_store')
      setManager(warehouse.manager || '')
      setPhone(warehouse.phone || '')
      setErrorMsg(null)
    }
  }, [warehouse, isOpen])

  if (!isOpen || !warehouse) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setErrorMsg(null)
    try {
      const validTypes = WAREHOUSE_TYPES.map((t) => t.value)
      const finalType = validTypes.includes(type) ? type : 'cold_store'

      editWarehouse({
        ...warehouse,
        name: name.trim(),
        type: finalType,
        manager: manager.trim() || 'مدير المخزن',
        phone: phone.trim() || null,
      })
      onClose()
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  const typeOptions = WAREHOUSE_TYPES.map((t) => ({ value: t.value, label: t.label }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-level3 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-primary/10 text-primary">
              <Warehouse className="w-5 h-5" />
            </span>
            <h3 className="text-base font-black text-on-surface">تعديل بيانات المخزن</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-error/10 border border-error/30 text-error text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-black text-on-surface mb-1">اسم المخزن أو الفرع *</label>
            <input
              type="text"
              required
              placeholder="مثال: ثلاجة تجميد فرع المنصورة"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-low border border-outline-variant/40 text-on-surface text-xs font-bold focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-on-surface mb-1">طبيعة ونوع المخزن *</label>
            <AX_SearchableSelect
              value={type}
              onChange={setType}
              options={typeOptions}
              searchable={false}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-on-surface mb-1">المسؤول عن المخزن</label>
              <div className="relative">
                <input
                  type="text"
                  list="edit-staff-manager-list"
                  placeholder="اختر أو اكتب الاسم..."
                  value={manager}
                  onChange={(e) => setManager(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-low border border-outline-variant/40 text-on-surface text-xs font-bold focus:border-primary focus:outline-none"
                />
                <datalist id="edit-staff-manager-list">
                  {staffOptions.map((s, idx) => (
                    <option key={idx} value={s.name}>
                      {s.role}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-on-surface mb-1">رقم الهاتف للتواصل</label>
              <input
                type="tel"
                placeholder="مثال: 01012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-low border border-outline-variant/40 text-on-surface text-xs font-bold focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-outline-variant/60 text-on-surface text-xs font-bold hover:bg-surface-container cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-level1 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AX_EditWarehouseModal
