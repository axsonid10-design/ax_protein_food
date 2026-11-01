import React, { useState, useEffect } from 'react'
import { X, User, Phone, Mail, Building, Briefcase, DollarSign, Shield, Check } from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'

export function AX_EmployeeModal({ isOpen, onClose, employee = null }) {
  useBodyScrollLock(isOpen)

  const { warehouses = [], addEmployee, updateEmployee } = useAXStore()

  const [name, setName] = useState('')
  const [role, setRole] = useState('warehouse_manager')
  const [roleTitle, setRoleTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [warehouseId, setWarehouseId] = useState('all')
  const [monthlySalary, setMonthlySalary] = useState('')
  const [salesCommission, setSalesCommission] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [status, setStatus] = useState('active')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (employee) {
      setName(employee.name || '')
      setRole(employee.role || 'warehouse_manager')
      setRoleTitle(employee.roleTitle || '')
      setPhone(employee.phone || '')
      setEmail(employee.email || '')
      setWarehouseId(employee.warehouseId || 'all')
      setMonthlySalary(employee.monthlySalary || '')
      setSalesCommission(employee.salesCommission || '')
      setNationalId(employee.nationalId || '')
      setStatus(employee.status || 'active')
    } else {
      setName('')
      setRole('warehouse_manager')
      setRoleTitle('أمين مخزن')
      setPhone('')
      setEmail('')
      setWarehouseId('all')
      setMonthlySalary('')
      setSalesCommission('')
      setNationalId('')
      setStatus('active')
    }
    setErrorMsg('')
  }, [employee, isOpen])

  if (!isOpen) return null

  const roleOptions = [
    { id: 'admin', label: 'مدير عام / تشغيل', defaultTitle: 'مدير عام' },
    { id: 'warehouse_manager', label: 'أمين مخزن وتبريد', defaultTitle: 'أمين مخزن تجميد' },
    { id: 'operator', label: 'مشرف تفكيك وتصنيع', defaultTitle: 'مشرف قسم التقطيع' },
    { id: 'driver', label: 'مندوب توزيع وسائق', defaultTitle: 'مندوب توزيع ميداني' },
    { id: 'cashier', label: 'مسؤول خزينة ومبيعات', defaultTitle: 'مسؤول مبيعات وخزينة' },
  ]

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole)
    const opt = roleOptions.find((r) => r.id === selectedRole)
    if (opt && (!roleTitle || roleOptions.some((ro) => ro.defaultTitle === roleTitle))) {
      setRoleTitle(opt.defaultTitle)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم الموظف بالكامل')
      return
    }

    const whObj = warehouses.find((w) => w.id === warehouseId)
    const warehouseName = warehouseId === 'all' ? 'كافة الفروع والمخازن' : whObj?.name || 'مخزن'

    try {
      if (employee) {
        updateEmployee(employee.id, {
          name: name.trim(),
          role,
          roleTitle: roleTitle.trim() || 'موظف',
          phone: phone.trim(),
          email: email.trim(),
          warehouseId,
          warehouseName,
          monthlySalary: Number(monthlySalary) || 0,
          salesCommission: Number(salesCommission) || 0,
          nationalId: nationalId.trim(),
          status,
        })
      } else {
        const newCode = `EMP-${String(Date.now()).slice(-3)}`
        addEmployee({
          id: `emp-${Date.now()}`,
          code: newCode,
          name: name.trim(),
          role,
          roleTitle: roleTitle.trim() || 'موظف',
          phone: phone.trim(),
          email: email.trim(),
          warehouseId,
          warehouseName,
          status,
          hireDate: new Date().toISOString().split('T')[0],
          monthlySalary: Number(monthlySalary) || 0,
          salesCommission: Number(salesCommission) || 0,
          nationalId: nationalId.trim(),
          permissions: [role === 'admin' ? 'all' : 'operational'],
        })
      }
      onClose()
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ بيانات الموظف')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overscroll-contain">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden overscroll-contain">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-on-surface">
                {employee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
              </h3>
              <span className="text-[11px] font-bold text-on-surface-variant block">
                تحديد الوظيفة والصلاحيات والفرع المسؤول عنه
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs font-bold">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-error/10 border border-error/20 text-error font-black text-xs text-center">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-on-surface flex items-center gap-1.5">
              <span>اسم الموظف بالكامل:</span>
              <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: ك/ محمد أحمد الشافعي"
              className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary focus:bg-surface-lowest text-on-surface font-bold outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-on-surface">التصنيف الوظيفي:</label>
              <AX_SearchableSelect
                value={role}
                onChange={handleRoleChange}
                options={roleOptions.map((opt) => ({ value: opt.id, label: opt.label }))}
                searchable={false}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-on-surface">المسمى الوظيفي المباشر:</label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="مثال: أمين مخزن التبريد"
                className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary focus:bg-surface-lowest text-on-surface font-bold outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-on-surface">رقم الهاتف للتواصل:</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary focus:bg-surface-lowest text-on-surface font-mono font-bold outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-on-surface">البريد الإلكتروني:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@domain.com"
                className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary focus:bg-surface-lowest text-on-surface font-bold outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-on-surface">المخزن / الفرع المسؤول عنه:</label>
            <AX_SearchableSelect
              value={warehouseId}
              onChange={setWarehouseId}
              options={[
                { value: 'all', label: 'كافة الفروع والمخازن (إدارة عامة)' },
                ...warehouses.map((wh) => ({
                  value: wh.id,
                  label: wh.name,
                  badge: wh.type === 'factory' ? 'مصنع' : wh.type === 'van' ? 'فان توزيع' : 'مخزن',
                })),
              ]}
              searchable={false}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-on-surface">الراتب الأساسي (ج.م):</label>
              <input
                type="number"
                min="0"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                placeholder="0"
                className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary focus:bg-surface-lowest text-on-surface font-mono font-bold outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-on-surface">عمولة المبيعات (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={salesCommission}
                onChange={(e) => setSalesCommission(e.target.value)}
                placeholder="0%"
                className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary focus:bg-surface-lowest text-on-surface font-mono font-bold outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-on-surface">حالة الحساب:</label>
              <div className="flex gap-1 h-11 items-center">
                {[
                  { id: 'active', label: 'نشط' },
                  { id: 'suspended', label: 'موقوف' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id)}
                    className={`flex-1 h-full rounded-2xl text-xs font-black transition-all cursor-pointer ${
                      status === s.id
                        ? s.id === 'active'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-rose-600 text-white shadow-xs'
                        : 'bg-surface-low border border-outline-variant/30 text-on-surface hover:bg-surface-lowest'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-on-surface">الرقم القومي (اختياري):</label>
            <input
              type="text"
              maxLength="14"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder="الرقم القومي 14 رقم"
              className="w-full h-11 px-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 focus:border-primary focus:bg-surface-lowest text-on-surface font-mono font-bold outline-none transition-all"
            />
          </div>

          <div className="pt-3 border-t border-surface-container flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-outline-variant/50 text-on-surface font-bold hover:bg-surface-low transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white font-black shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{employee ? 'حفظ التعديلات' : 'إضافة الموظف'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
