import React, { useMemo, useEffect } from 'react'
import { Warehouse, Truck, Factory, Building2, Layers, CheckCircle2 } from 'lucide-react'
import {
  EXPENSE_COST_CENTER_TYPES,
  EXPENSE_COST_CENTER_LABELS,
  getCostCenterEntities,
} from '../../store/expenseStoreHelpers.js'
import { expenseCategoryHelpers } from '../../store/expenseCategoryHelpers.js'
import { useAXStore } from '../../store/useAXStore.js'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect.jsx'
import { AX_ExpenseCategoryPillSelector } from './AX_ExpenseCategoryPillSelector.jsx'
import { generateUUID } from '../../utils/AX_UUID.js'
import { axToast } from '../common/AX_Toast.jsx'

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
  const addExpenseCategory = useAXStore((state) => state.addExpenseCategory)
  const deleteExpenseCategory = useAXStore((state) => state.deleteExpenseCategory)

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

  const handleEntityIdSelect = (id) => {
    if (disabled) return
    const found = availableEntities.find((item) => item.id === id)
    onCostCenterChange?.({
      entityType: currentEntityType,
      entityId: id,
      entityName: found ? found.name : costCenter?.entityName || '',
    })
  }

  const handleMainCategorySelect = (mainId, mainName) => {
    if (disabled) return
    const availableSubs = mainId ? expenseCategoryHelpers.getSubCategories(categories, mainId) : []
    const firstSub = availableSubs[0]
    const availableSecs = firstSub ? expenseCategoryHelpers.getSecondaryCategories(categories, firstSub.id) : []
    const firstSec = availableSecs[0]

    onCategoryChange?.({
      mainCategoryId: mainId,
      mainCategoryName: mainName || (mainCategories.find((m) => m.id === mainId)?.name || ''),
      subCategoryId: firstSub ? firstSub.id : '',
      subCategoryName: firstSub ? firstSub.name : '',
      secondaryCategoryId: firstSec ? firstSec.id : '',
      secondaryCategoryName: firstSec ? firstSec.name : '',
    })
  }

  const handleAddMain = (name) => {
    const newId = `exp-main-${generateUUID()}`
    addExpenseCategory?.({ id: newId, name, level: 'main', parentId: null })
    axToast.success(`تمت إضافة البند الرئيسي "${name}"`)
    handleMainCategorySelect(newId, name)
  }

  const handleDeleteMain = (id) => {
    deleteExpenseCategory?.(id)
    axToast.info('تم حذف البند الرئيسي')
    if (id === selectedMainCategoryId) {
      onCategoryChange?.({
        mainCategoryId: '',
        mainCategoryName: '',
        subCategoryId: '',
        subCategoryName: '',
        secondaryCategoryId: '',
        secondaryCategoryName: '',
      })
    }
  }

  const handleSubCategorySelect = (subId, subName) => {
    if (disabled) return
    const availableSecs = subId ? expenseCategoryHelpers.getSecondaryCategories(categories, subId) : []
    const firstSec = availableSecs[0]

    onCategoryChange?.({
      mainCategoryId: selectedMainCategoryId,
      mainCategoryName: activeMain ? activeMain.name : '',
      subCategoryId: subId,
      subCategoryName: subName || (subCategories.find((s) => s.id === subId)?.name || ''),
      secondaryCategoryId: firstSec ? firstSec.id : '',
      secondaryCategoryName: firstSec ? firstSec.name : '',
    })
  }

  const handleAddSub = (name) => {
    if (!selectedMainCategoryId) {
      axToast.error('يرجى اختيار البند الرئيسي أولاً لإضافة تصنيف فرعي تحته')
      return
    }
    const newId = `exp-sub-${generateUUID()}`
    addExpenseCategory?.({ id: newId, name, level: 'sub', parentId: selectedMainCategoryId })
    axToast.success(`تمت إضافة التصنيف الفرعي "${name}"`)
    handleSubCategorySelect(newId, name)
  }

  const handleDeleteSub = (id) => {
    deleteExpenseCategory?.(id)
    axToast.info('تم حذف التصنيف الفرعي')
    if (id === selectedSubCategoryId) {
      onCategoryChange?.({
        mainCategoryId: selectedMainCategoryId,
        mainCategoryName: activeMain ? activeMain.name : '',
        subCategoryId: '',
        subCategoryName: '',
        secondaryCategoryId: '',
        secondaryCategoryName: '',
      })
    }
  }

  const handleSecondaryCategorySelect = (secId, secName) => {
    if (disabled) return
    onCategoryChange?.({
      mainCategoryId: selectedMainCategoryId,
      mainCategoryName: activeMain ? activeMain.name : '',
      subCategoryId: selectedSubCategoryId,
      subCategoryName: activeSub ? activeSub.name : '',
      secondaryCategoryId: secId,
      secondaryCategoryName: secName || (secondaryCategories.find((s) => s.id === secId)?.name || ''),
    })
  }

  const handleAddSecondary = (name) => {
    if (!selectedSubCategoryId) {
      axToast.error('يرجى اختيار التصنيف الفرعي أولاً لإضافة تصنيف ثانوي تحته')
      return
    }
    const newId = `exp-sec-${generateUUID()}`
    addExpenseCategory?.({ id: newId, name, level: 'secondary', parentId: selectedSubCategoryId })
    axToast.success(`تمت إضافة التصنيف الثانوي "${name}"`)
    handleSecondaryCategorySelect(newId, name)
  }

  const handleDeleteSecondary = (id) => {
    deleteExpenseCategory?.(id)
    axToast.info('تم حذف التصنيف الثانوي')
    if (id === selectedSecondaryCategoryId) {
      onCategoryChange?.({
        mainCategoryId: selectedMainCategoryId,
        mainCategoryName: activeMain ? activeMain.name : '',
        subCategoryId: selectedSubCategoryId,
        subCategoryName: activeSub ? activeSub.name : '',
        secondaryCategoryId: '',
        secondaryCategoryName: '',
      })
    }
  }

  const entityOptions = useMemo(() => {
    return availableEntities.map((ent) => ({
      value: ent.id,
      label: ent.name + (ent.plateNumber ? ` (${ent.plateNumber})` : ''),
    }))
  }, [availableEntities])

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
            <AX_SearchableSelect
              value={costCenter?.entityId || ''}
              onChange={handleEntityIdSelect}
              options={entityOptions}
              disabled={disabled}
              placeholder="اختر الجهة أو الفرع أو المركبة..."
            />
          </div>
        ) : (
          <div className="h-10 px-3 bg-surface-lowest border border-outline-variant/30 rounded-2xl flex items-center justify-between text-xs font-bold text-on-surface">
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <AX_ExpenseCategoryPillSelector
            label="البند الرئيسي"
            value={selectedMainCategoryId}
            options={mainCategories}
            onChange={handleMainCategorySelect}
            onAdd={handleAddMain}
            onDelete={handleDeleteMain}
            placeholder="اختر البند الرئيسي..."
            required={true}
            disabled={disabled}
            level="main"
          />

          <AX_ExpenseCategoryPillSelector
            label="التصنيف الفرعي"
            value={selectedSubCategoryId}
            options={subCategories}
            onChange={handleSubCategorySelect}
            onAdd={handleAddSub}
            onDelete={handleDeleteSub}
            placeholder={selectedMainCategoryId ? 'اختر التصنيف الفرعي...' : 'اختر الرئيسي أولاً'}
            required={true}
            disabled={disabled || !selectedMainCategoryId}
            level="sub"
          />

          <AX_ExpenseCategoryPillSelector
            label="التصنيف الثانوي (اختياري)"
            value={selectedSecondaryCategoryId}
            options={secondaryCategories}
            onChange={handleSecondaryCategorySelect}
            onAdd={handleAddSecondary}
            onDelete={handleDeleteSecondary}
            placeholder={selectedSubCategoryId ? 'اختر التصنيف الثانوي...' : 'بدون تصنيف ثانوي'}
            required={false}
            disabled={disabled || !selectedSubCategoryId}
            level="secondary"
          />
        </div>
      </div>

      <div className="bg-surface-lowest border border-primary/20 rounded-2xl px-3 py-2 flex flex-wrap items-center gap-1.5 text-xs font-bold">
        <span className="text-primary font-black">المسار:</span>
        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-black">
          {costCenter?.entityName || 'عام'}
        </span>
        <span className="text-outline-variant font-black">←</span>
        <span className="text-on-surface font-black">{activeMain ? activeMain.name : 'لم يحدد'}</span>
        {activeSub && (
          <>
            <span className="text-outline-variant font-black">←</span>
            <span className="text-on-surface-variant font-black">{activeSub.name}</span>
          </>
        )}
        {activeSec && (
          <>
            <span className="text-outline-variant font-black">←</span>
            <span className="text-on-surface-variant text-[11px] font-bold">{activeSec.name}</span>
          </>
        )}
      </div>
    </div>
  )
}
