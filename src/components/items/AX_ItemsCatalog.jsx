import React, { useState, useMemo } from 'react'
import { Boxes, Plus, Search, Filter, Tag, Scale, Trash2, Copy, Edit3, ChevronRight, ChevronLeft, ChevronDown, Layers, Activity } from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_CategorySelect } from './AX_CategorySelect'
import { AX_SearchableSelect } from '../common/AX_SearchableSelect'
import { AX_ConfirmModal } from '../common/AX_ConfirmModal'
import { axToast } from '../common/AX_Toast'
import { AX_AddItemModal } from './AX_AddItemModal'
import { AX_EditItemModal } from './AX_EditItemModal'
import { AX_BulkAddItemsModal } from './AX_BulkAddItemsModal'
import { AX_ItemMovementCardModal } from '../warehouses/AX_ItemMovementCardModal'
import { AX_ItemOpeningBalanceModal } from './AX_ItemOpeningBalanceModal'
import { AX_ItemStatusIndicators } from './AX_ItemStatusIndicators'
import { formatDualUnits, isItemNearDepletion } from '../../utils/itemUnitFormatters'
import { getCategoryClass } from '../../utils/categoryColors'

export function AX_ItemsCatalog() {
  const {
    items = [],
    categories = [],
    subCategories = {},
    secondaryCategories = [], warehouses = [], inventoryStock = [], invoices = [], transfers = [], stockAudits = [],
    addItem, addMultipleItems, editItem, deleteItem,
    addCategory, editCategory, deleteCategory, addSubCategory, editSubCategory, deleteSubCategory,
    addSecondaryCategory, editSecondaryCategory, deleteSecondaryCategory,
  } = useAXStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPrimary, setSelectedPrimary] = useState('الكل')
  const [isSingleAddOpen, setIsSingleAddOpen] = useState(false)
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState(null)
  const [selectedItemForCard, setSelectedItemForCard] = useState(null)
  const [itemForOpeningBalance, setItemForOpeningBalance] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCodeColumn, setShowCodeColumn] = useState(false)
  const PAGE_SIZE = 15

  const purchaseInvoices = useMemo(() => (invoices || []).filter((i) => i.type === 'purchase' || i.type === 'purchase_return'), [invoices])
  const salesInvoices = useMemo(() => (invoices || []).filter((i) => i.type === 'sale' || i.type === 'sale_return'), [invoices])

  const getItemStock = (itemId) => {
    return (inventoryStock || []).filter((s) => s.itemId === itemId).reduce((sum, s) => sum + Number(s.quantity || 0), 0)
  }

  const categoryHandlers = {
    addCategory, editCategory, deleteCategory,
    addSubCategory, editSubCategory, deleteSubCategory,
    addSecondaryCategory, editSecondaryCategory, deleteSecondaryCategory,
  }

  const renderItemActions = (item, isMobile = false) => (
    <div className="flex items-center justify-center gap-1.5">
      <button type="button" onClick={() => setSelectedItemForCard(item)} className="p-1 rounded-full text-primary hover:bg-primary/10 transition-colors cursor-pointer" title="عرض كارت حركة الصنف 360°">
        <Activity className={isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      </button>
      <button type="button" onClick={() => setItemForOpeningBalance(item)} className="p-1 rounded-full text-amber-700 hover:bg-amber-500/10 transition-colors cursor-pointer" title="تغيير رصيد أول المدة" aria-label="تغيير رصيد أول المدة">
        <Layers className={isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      </button>
      <button type="button" onClick={() => setItemToEdit(item)} className="p-1 rounded-full text-secondary hover:bg-secondary/10 transition-colors cursor-pointer" title="تعديل بيانات الصنف">
        <Edit3 className={isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      </button>
      <button type="button" onClick={() => handleQuickVariant(item)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/10 hover:bg-secondary/20 text-secondary text-[11px] font-black transition-all cursor-pointer" title="إضافة وزن أو تفريع بديل لنفس الصنف">
        <Copy className="w-3 h-3" />
        <span>تفريع</span>
      </button>
      <button type="button" onClick={() => setItemToDelete(item)} className="p-1 rounded-full text-error hover:bg-error-container/40 transition-colors cursor-pointer" title="حذف الصنف">
        <Trash2 className={isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      </button>
    </div>
  )

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    const targetId = itemToDelete.id
    try {
      setIsDeleting(true)
      await deleteItem(targetId)
      axToast.success('تم حذف الصنف بنجاح')
      setItemToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleQuickVariant = (item) => {
    setIsSingleAddOpen(true)
  }

  const term = searchTerm.trim().toLowerCase()
  const filteredItems = items.filter((item) => {
    if (!item) return false
    const compName = (item.compositeName || `${item.subCategory || ''} ${item.secondaryCategory || ''}`).toLowerCase()
    const itemCode = (item.code || '').toLowerCase()
    const primCat = (item.primaryCategory || '').toLowerCase()

    const matchesSearch =
      !term || compName.includes(term) || itemCode.includes(term) || primCat.includes(term)

    const matchesPrimary = selectedPrimary === 'الكل' || item.primaryCategory === selectedPrimary
    return matchesSearch && matchesPrimary
  })

  const totalItems = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-lowest p-3.5 sm:p-4 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div>
          <h2 className="text-sm sm:text-base font-black text-on-surface">دليل أصناف المجمدات والتصنيع</h2>
          <span className="text-xs font-bold text-on-surface-variant">
            إجمالي الأصناف: {filteredItems.length} صنف مسجل
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setIsBulkAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-low hover:bg-surface-container border border-outline-variant/30 text-xs font-black text-on-surface transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>إضافة متعددة (جملة)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSingleAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-xs font-black shadow-level1 hover:bg-primary-dark transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف ورصيد بداية</span>
          </button>
        </div>
      </div>

      {isSingleAddOpen && (
        <AX_AddItemModal
          isOpen={isSingleAddOpen}
          onClose={() => setIsSingleAddOpen(false)}
          onSave={(item, openingStock) => addItem(item, openingStock)}
          categories={categories}
          subCategories={subCategories}
          secondaryCategories={secondaryCategories}
          warehouses={warehouses}
          {...categoryHandlers}
        />
      )}

      {isBulkAddOpen && (
        <AX_BulkAddItemsModal
          isOpen={isBulkAddOpen}
          onClose={() => setIsBulkAddOpen(false)}
          onSaveMultiple={(list) => addMultipleItems(list)}
          categories={categories}
          subCategories={subCategories}
          warehouses={warehouses}
        />
      )}

      {itemToEdit && (
        <AX_EditItemModal
          isOpen={Boolean(itemToEdit)}
          item={itemToEdit}
          onClose={() => setItemToEdit(null)}
          onSave={(updated) => editItem(updated)}
          categories={categories}
          subCategories={subCategories}
          secondaryCategories={secondaryCategories}
          {...categoryHandlers}
        />
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-lowest border border-outline-variant/30 rounded-2xl p-3 shadow-level1">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-on-surface-variant absolute right-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث بالاسم، الكود، أو القسم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-4 py-2 rounded-full bg-surface-low border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowCodeColumn(!showCodeColumn)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            showCodeColumn
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'bg-surface-low text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
          }`}
          title="إظهار أو إخفاء عمود كود الصنف"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>{showCodeColumn ? 'إخفاء كود الصنف' : 'إظهار كود الصنف'}</span>
        </button>

        <div className="w-full sm:w-56 shrink-0">
          <AX_SearchableSelect
            value={selectedPrimary}
            onChange={(val) => {
              setSelectedPrimary(val)
              setCurrentPage(1)
            }}
            options={['الكل', ...categories].map((c) => ({
              value: c,
              label: c === 'الكل' ? 'جميع الأقسام' : `قسم: ${c}`,
            }))}
            searchable={false}
          />
        </div>
      </div>

      <div className="hidden lg:block bg-surface-lowest border border-outline-variant/30 rounded-3xl overflow-hidden shadow-level1">
        <table className="w-full text-right text-xs">
          <thead className="bg-surface-low border-b border-surface-container text-on-surface-variant font-black">
            <tr className="h-11">
              {showCodeColumn && <th className="px-3.5 whitespace-nowrap">كود الصنف</th>}
              <th className="px-3.5 whitespace-nowrap">الاسم بالفاتورة</th>
              <th className="px-3.5 whitespace-nowrap">القسم الرئيسي</th>
              <th className="px-3.5 whitespace-nowrap">الفرعي والتمييز</th>
              <th className="px-3.5 whitespace-nowrap">الوحدة</th>
              <th className="px-3.5 whitespace-nowrap">سعر الشراء</th>
              <th className="px-3.5 whitespace-nowrap">سعر البيع</th>
              <th className="px-3.5 whitespace-nowrap text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container text-on-surface font-bold">
            {paginatedItems.map((item) => {
              const stock = getItemStock(item.id)
              const nearDepletion = isItemNearDepletion(item, stock)
              return (
                <tr key={item.id} className={`h-11 transition-colors ${nearDepletion ? 'bg-rose-500/5 hover:bg-rose-500/10' : 'hover:bg-surface-low/50'}`}>
                  {showCodeColumn && (
                    <td className="px-3.5 whitespace-nowrap font-mono text-primary font-black">{item.code}</td>
                  )}
                  <td className="px-3.5 whitespace-nowrap font-black text-sm text-on-surface">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!showCodeColumn && item.code && (
                        <button
                          type="button"
                          onClick={() => setShowCodeColumn(true)}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-bold transition-all cursor-pointer ml-1 border border-primary/20"
                          title="كود الصنف - انقر لإظهار عمود الأكواد"
                        >
                          {item.code}
                        </button>
                      )}
                      <span
                        onClick={() => setSelectedItemForCard(item)}
                        className="cursor-pointer hover:text-primary hover:underline transition-colors"
                        title="انقر لعرض كارت حركة الصنف 360°"
                      >
                        {item.compositeName}
                      </span>
                      <span className="text-[11px] font-normal text-on-surface-variant font-mono">
                        ({item.weightPerCarton} كجم)
                      </span>
                      <AX_ItemStatusIndicators item={item} currentStock={stock} showBadges={true} />
                    </div>
                  </td>
                  <td className="px-3.5 whitespace-nowrap">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black border ${getCategoryClass(item.primaryCategory)}`}>
                      {item.primaryCategory}
                    </span>
                  </td>
                  <td className="px-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-on-surface">
                      <span>{item.subCategory}</span>
                      {item.secondaryCategory && (
                        <>
                          <span className="text-outline-variant">•</span>
                          <span className="px-1.5 py-0.2 rounded bg-surface-low text-on-surface-variant border border-outline-variant/20">
                            {item.secondaryCategory}
                          </span>
                        </>
                      )}
                      {Number(item.piecesPerCarton) > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 text-[10px]">
                          {item.piecesPerCarton} {item.subUnitType || 'كيس'}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3.5 whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-low border border-outline-variant/30 text-[11px] font-bold">
                      {item.unitType}
                      {Number(item.piecesPerCarton) > 0 && (
                        <span className="text-on-surface-variant mr-1 font-mono">({item.piecesPerCarton} {item.subUnitType || 'كيس'})</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3.5 whitespace-nowrap font-mono font-bold text-on-surface-variant">{item.buyPrice} ج.م</td>
                  <td className="px-3.5 whitespace-nowrap font-mono font-black text-primary">{item.sellPrice} ج.م</td>
                  <td className="px-3.5 whitespace-nowrap text-center">
                    {renderItemActions(item)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
        {paginatedItems.map((item) => {
          const stock = getItemStock(item.id)
          const nearDepletion = isItemNearDepletion(item, stock)
          return (
            <div
              key={item.id}
              className={`rounded-2xl p-4 shadow-level1 space-y-3 transition-all ${
                nearDepletion
                  ? 'bg-rose-500/5 border-2 border-rose-500/60 shadow-rose-500/10'
                  : 'bg-surface-lowest border border-outline-variant/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">{item.code}</span>
                    <AX_ItemStatusIndicators item={item} currentStock={stock} showBadges={true} />
                  </div>
                  <h3
                    onClick={() => setSelectedItemForCard(item)}
                    className="font-black text-sm text-on-surface mt-0.5 cursor-pointer hover:text-primary transition-colors"
                    title="انقر لعرض كارت حركة الصنف 360°"
                  >
                    {item.compositeName}
                  </h3>
                  <span className="text-[11px] text-on-surface-variant font-bold block mt-0.5">
                    {item.subCategory}
                    {item.secondaryCategory ? ` • ${item.secondaryCategory}` : ''}
                    {Number(item.piecesPerCarton) > 0 ? ` • ${item.piecesPerCarton} ${item.subUnitType || 'كيس'}` : ''}
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${getCategoryClass(item.primaryCategory)}`}>
                  {item.primaryCategory}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-surface-container">
                <div>
                  <span className="text-on-surface-variant text-[11px] block">سعر الشراء</span>
                  <span className="font-mono font-bold text-on-surface">{item.buyPrice} ج.م</span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-[11px] block">سعر البيع</span>
                  <span className="font-mono font-black text-primary">{item.sellPrice} ج.م</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-surface-container">
                <span className="text-on-surface-variant font-mono text-[11px] font-bold">
                  {formatDualUnits(stock, item.unitType, item)}
                </span>
                {renderItemActions(item, true)}
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-surface-container text-xs font-bold">
          <span className="text-on-surface-variant font-mono">
            إجمالي الأصناف: {totalItems} • صفحة {currentPage} من {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-full bg-surface-low border border-outline-variant/30 disabled:opacity-40 hover:bg-surface-container transition-all"
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-black">
              {currentPage}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-full bg-surface-low border border-outline-variant/30 disabled:opacity-40 hover:bg-surface-container transition-all"
              title="الصفحة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AX_ConfirmModal
        isOpen={Boolean(itemToDelete)}
        title="تأكيد حذف الصنف"
        message={itemToDelete ? `هل أنت متأكد من حذف الصنف "${itemToDelete.compositeName}" (${itemToDelete.code})؟ سيتم نقل الصنف لسجل المحذوفات.` : ''}
        confirmText={isDeleting ? 'جاري الحذف...' : 'نعم، حذف الصنف'}
        cancelText="إلغاء"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => !isDeleting && setItemToDelete(null)}
      />

      <AX_ItemMovementCardModal
        isOpen={Boolean(selectedItemForCard)}
        onClose={() => setSelectedItemForCard(null)}
        item={selectedItemForCard}
        warehouses={warehouses}
        inventoryStock={inventoryStock}
        purchaseInvoices={purchaseInvoices}
        salesInvoices={salesInvoices}
        transfers={transfers}
        stockAudits={stockAudits}
      />

      <AX_ItemOpeningBalanceModal
        isOpen={Boolean(itemForOpeningBalance)}
        onClose={() => setItemForOpeningBalance(null)}
        item={itemForOpeningBalance}
        warehouses={warehouses}
      />

      <button
        type="button"
        onClick={() => setIsSingleAddOpen(true)}
        className="fixed bottom-20 lg:bottom-6 left-6 z-30 flex items-center gap-2 px-5 py-3 rounded-full bg-primary hover:bg-primary-dark text-white font-black text-xs sm:text-sm shadow-level3 active:scale-95 transition-all cursor-pointer"
        title="إضافة صنف جديد"
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>إضافة صنف</span>
      </button>
    </div>
  )
}

export default AX_ItemsCatalog
