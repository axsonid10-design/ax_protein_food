import React, { useMemo, useEffect } from 'react'
import { Warehouse, Truck, Factory, Building2, Layers, CheckCircle2 } from 'lucide-react'
import {
  EXPENSE_COST_CENTER_TYPES,
  EXPENSE_COST_CENTER_LABELS,
  getCostCenterEntities,
} from '../../store/expenseStoreHelpers.js'
import { expenseCategoryHelpers } from '../../store/expenseCategoryHelpers.js'

export function AX_ExpenseCostCenterHierarchySelect({
  costCenter = { entityType: EXPENSE_COST_CENTER_TYPES.WAREHOUSE, entityId: '', entityName: '' },
  onCostCenterChange,
  categories = [],
  selectedMainCategoryId = '',
  selectedSubCategoryId = '',
  selectedSecondaryCategoryId = '',
  onCategoryChange,
  warehouses = [],
  distributors = [],
  disabled = false,
}) {
  const currentEntityType = costCenter?.entityType || EXPENSE_COST_CENTER_TYPES.WAREHOUSE
  const availableEntities = useMemo(() => {
    return getCostCenterEntities(currentEntityType, { warehouses, distributors })
  }, [currentEntityType, warehouses, distributors])

  useEffect(() => {
    if (!costCenter?.entityId && availableEntities.length > 0) {
      const first = availableEntities[0]
      onCostCenterChange?.({
        entityType: currentEntityType,
        entityId: first.id,
        entityName: first.name,
      })
    }
  }, [currentEntityType, availableEntities, costCenter?.entityId, onCostCenterChange])

  const mainCategories = useMemo(() => {
    return expenseCategoryHelpers.getMainCategories(categories)
  }, [categories])

  const subCategories = useMemo(() => {
    return selectedMainCategoryId
      ? expenseCategoryHelpers.getSubCategories(categories, selectedMainCategoryId)
      : []
  }, [categories, selectedMainCategoryId])

  const secondaryCategories = useMemo(() => {
    return selectedSubCategoryId
      ? expenseCategoryHelpers.getSecondaryCategories(categories, selectedSubCategoryId)
      : []
  }, [categories, selectedSubCategoryId])

  const activeMain = mainCategories.find((c) => c.id === selectedMainCategoryId)
  const activeSub = subCategories.find((c) => c.id === selectedSubCategoryId)
  const activeSec = secondaryCategories.find((c) => c.id === selectedSecondaryCategoryId)

  const handleEntityTypeChange = (type) => {
    if (disabled) return
    const entities = getCostCenterEntities(type, { warehouses, distributors })
    const first = entities[0]
    onCostCenterChange?.({
      entityType: type,
      entityId: first ? first.id : '',
      entityName: first ? first.name : EXPENSE_COST_CENTER_LABELS[type] || 'عام',
    })
  }

  const handleEntityIdChange = (e) => {
    if (disabled) return
    const id = e.target.value
    const found = availableEntities.find((item) => item.id === id)
    onCostCenterChange?.({
      entityType: currentEntityType,
      entityId: id,
      entityName: found ? found.name : costCenter?.entityName || '',
    })
  }

  const handleMainCategoryChange = (e) => {
    if (disabled) return
    const mainId = e.target.value
    const foundMain = mainCategories.find((m) => m.id === mainId)
    const availableSubs = mainId ? expenseCategoryHelpers.getSubCategories(categories, mainId) : []
    const firstSub = availableSubs[0]
    const availableSecs = firstSub ? expenseCategoryHelpers.getSecondaryCategories(categories, firstSub.id) : []
    const firstSec = availableSecs[0]

    onCategoryChange?.({
      mainCategoryId: mainId,
      mainCategoryName: foundMain ? foundMain.name : '',
      subCategoryId: firstSub ? firstSub.id : '',
      subCategoryName: firstSub ? firstSub.name : '',
      secondaryCategoryId: firstSec ? firstSec.id : '',
      secondaryCategoryName: firstSec ? firstSec.name : '',
    })
  }

  const handleSubCategoryChange = (e) => {
    if (disabled) return
    const subId = e.target.value
    const foundSub = subCategories.find((s) => s.id === subId)
    const availableSecs = subId ? expenseCategoryHelpers.getSecondaryCategories(categories, subId) : []
    const firstSec = availableSecs[0]

    onCategoryChange?.({
      mainCategoryId: selectedMainCategoryId,
      mainCategoryName: activeMain ? activeMain.name : '',
      subCategoryId: subId,
      subCategoryName: foundSub ? foundSub.name : '',
      secondaryCategoryId: firstSec ? firstSec.id : '',
      secondaryCategoryName: firstSec ? firstSec.name : '',
    })
  }

  const handleSecondaryCategoryChange = (e) => {
    if (disabled) return
    const secId = e.target.value
    const foundSec = secondaryCategories.find((s) => s.id === secId)

    onCategoryChange?.({
      mainCategoryId: selectedMainCategoryId,
      mainCategoryName: activeMain ? activeMain.name : '',
      subCategoryId: selectedSubCategoryId,
      subCategoryName: activeSub ? activeSub.name : '',
      secondaryCategoryId: secId,
      secondaryCategoryName: foundSec ? foundSec.name : '',
    })
  }

  return (
    <div className="w-full space-y-3.5 bg-surface-container-low/50 border border-outline-variant/30 rounded-2xl p-3.5 sm:p-4 transition-all">
      <div className="space-y-2">
        <label className="text-xs font-black text-on-surface flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            1. تحديد مركز التكلفة والجهة المستفيدة أولاً
          </span>
          <span className="text-[11px] font-bold text-on-surface-variant">خطوة إلزامية</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleEntityTypeChange(EXPENSE_COST_CENTER_TYPES.WAREHOUSE)}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
              currentEntityType === EXPENSE_COST_CENTER_TYPES.WAREHOUSE
                ? 'bg-primary text-on-primary border-primary shadow-xs'
                : 'bg-surface-lowest text-on-surface hover:bg-surface-container border-outline-variant/30'
            }`}
          >
            <Warehouse className="w-4 h-4 flex-shrink-0" />
            <span>المخازن والتبريد</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleEntityTypeChange(EXPENSE_COST_CENTER_TYPES.VEHICLE)}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
              currentEntityType === EXPENSE_COST_CENTER_TYPES.VEHICLE
                ? 'bg-primary text-on-primary border-primary shadow-xs'
                : 'bg-surface-lowest text-on-surface hover:bg-surface-container border-outline-variant/30'
            }`}
          >
            <Truck className="w-4 h-4 flex-shrink-0" />
            <span>سيارات التوزيع</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleEntityTypeChange(EXPENSE_COST_CENTER_TYPES.FACTORY)}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
              currentEntityType === EXPENSE_COST_CENTER_TYPES.FACTORY
                ? 'bg-primary text-on-primary border-primary shadow-xs'
                : 'bg-surface-lowest text-on-surface hover:bg-surface-container border-outline-variant/30'
            }`}
          >
            <Factory className="w-4 h-4 flex-shrink-0" />
            <span>المصنع والتجهيز</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleEntityTypeChange(EXPENSE_COST_CENTER_TYPES.GENERAL)}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
              currentEntityType === EXPENSE_COST_CENTER_TYPES.GENERAL
                ? 'bg-primary text-on-primary border-primary shadow-xs'
                : 'bg-surface-lowest text-on-surface hover:bg-surface-container border-outline-variant/30'
            }`}
          >
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <span>عام / الإدارة</span>
          </button>
        </div>

        {availableEntities.length > 1 ? (
          <div className="pt-1">
            <select
              value={costCenter?.entityId || ''}
              onChange={handleEntityIdChange}
              disabled={disabled}
              className="w-full h-10 px-3 bg-surface-lowest border border-outline-variant/40 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer"
            >
              {availableEntities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name} {ent.plateNumber ? `(${ent.plateNumber})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="h-9 px-3 bg-surface-lowest/70 border border-outline-variant/20 rounded-xl flex items-center justify-between text-xs font-bold text-on-surface">
            <span>{costCenter?.entityName || availableEntities[0]?.name || 'المصنع / الإدارة'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-outline-variant/20">
        <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" />
          2. تصنيف وبند المصروف المشترك
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <span className="block text-[11px] font-bold text-on-surface-variant mb-1">
              البند الرئيسي <span className="text-red-500">*</span>
            </span>
            <select
              value={selectedMainCategoryId || ''}
              onChange={handleMainCategoryChange}
              disabled={disabled}
              className="w-full h-10 px-2.5 bg-surface-lowest border border-outline-variant/40 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer"
            >
              <option value="">-- اختر البند الرئيسي --</option>
              {mainCategories.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-[11px] font-bold text-on-surface-variant mb-1">
              التصنيف الفرعي <span className="text-red-500">*</span>
            </span>
            <select
              value={selectedSubCategoryId || ''}
              onChange={handleSubCategoryChange}
              disabled={disabled || !selectedMainCategoryId}
              className="w-full h-10 px-2.5 bg-surface-lowest border border-outline-variant/40 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer disabled:opacity-50"
            >
              <option value="">-- اختر التصنيف الفرعي --</option>
              {subCategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-[11px] font-bold text-on-surface-variant mb-1">التصنيف الثانوي (اختياري)</span>
            <select
              value={selectedSecondaryCategoryId || ''}
              onChange={handleSecondaryCategoryChange}
              disabled={disabled || !selectedSubCategoryId}
              className="w-full h-10 px-2.5 bg-surface-lowest border border-outline-variant/40 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer disabled:opacity-50"
            >
              <option value="">-- بدون تصنيف ثانوى --</option>
              {secondaryCategories.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-surface-lowest border border-primary/20 rounded-xl px-3 py-2 flex flex-wrap items-center gap-1.5 text-xs font-bold">
        <span className="text-primary font-black">المسار:</span>
        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-black">
          {costCenter?.entityName || 'عام'}
        </span>
        <span className="text-outline-variant font-black">←</span>
        <span className="text-on-surface font-black">{activeMain ? activeMain.name : 'لم يحدد'}</span>
        {activeSub && (
          <>
            <span className="text-outline-variant font-black">←</span>
            <span className="text-on-surface-variant">{activeSub.name}</span>
          </>
        )}
        {activeSec && (
          <>
            <span className="text-outline-variant font-black">←</span>
            <span className="text-on-surface-variant text-[11px]">{activeSec.name}</span>
          </>
        )}
      </div>
    </div>
  )
}
