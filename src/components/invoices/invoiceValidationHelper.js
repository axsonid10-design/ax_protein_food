import { getCartonEquivalent } from '../../utils/pricingCalculations.js'
import { getItemDisplayName } from '../../utils/AX_ItemNameHelper.js'

export function calculateDynamicRemainingStock(
  itemId,
  warehouseId,
  inventoryStock = [],
  invoiceItems = [],
  catalogItems = []
) {
  if (!warehouseId || !itemId) return 0
  const stockRow = (inventoryStock || []).find(
    (s) =>
      (s.warehouseId === warehouseId || s.warehouse_id === warehouseId) &&
      (s.itemId === itemId || s.item_id === itemId)
  )
  const baseStock = Number(stockRow?.quantity) || 0

  const totalEnteredCartons = (invoiceItems || []).reduce((acc, row) => {
    const rowItemId = row.itemId || row.item_id || row.id
    if (rowItemId !== itemId) return acc
    const rawQty = Number(row.quantity) || 0
    if (rawQty <= 0) return acc
    const itObj = (catalogItems || []).find((c) => c.id === rowItemId) || row
    return acc + getCartonEquivalent(rawQty, row.unit || itObj?.unitType || 'كرتونة', itObj)
  }, 0)

  const remaining = baseStock - totalEnteredCartons
  return Number.isInteger(remaining) ? remaining : Number(remaining.toFixed(2))
}

export function validateInvoiceItems(invoiceItems = [], catalogItems = [], options = {}) {
  if (!Array.isArray(invoiceItems) || invoiceItems.length === 0) {
    return {
      isValid: false,
      error: 'يجب إضافة صنف واحد على الأقل في الفاتورة',
      field: 'items',
    }
  }

  const isPurchase = options?.invType === 'purchase' || options?.invType === 'purchase_return'
  const priceLabel = isPurchase ? 'سعر الشراء' : 'سعر البيع'

  for (let i = 0; i < invoiceItems.length; i++) {
    const row = invoiceItems[i]
    const rowItemId = row.itemId || row.item_id || row.id
    const itemObj = (catalogItems || []).find((it) => it.id === rowItemId)
    const itemName = getItemDisplayName(itemObj || row) || ('البند #' + (i + 1))

    const rawQty = row.quantity
    const numQty = Number(rawQty)
    if (
      rawQty === '' ||
      rawQty === null ||
      rawQty === undefined ||
      isNaN(numQty) ||
      numQty <= 0
    ) {
      return {
        isValid: false,
        error: `لا يمكن حفظ الفاتورة: الكمية غير محددة أو صفرية للصنف [${itemName}]`,
        field: 'quantity',
        index: i,
        itemId: rowItemId,
      }
    }

    const rawPrice = row.price
    const numPrice = Number(rawPrice)
    if (
      rawPrice === '' ||
      rawPrice === null ||
      rawPrice === undefined ||
      isNaN(numPrice) ||
      numPrice <= 0
    ) {
      return {
        isValid: false,
        error: `لا يمكن حفظ الفاتورة: ${priceLabel} غير محدد أو صفري للصنف [${itemName}]`,
        field: 'price',
        index: i,
        itemId: rowItemId,
      }
    }
  }

  return { isValid: true, error: null }
}

export function getRemainingStockBadge(remainingStock) {
  const stock = Number(remainingStock) || 0
  if (stock > 0) {
    return {
      text: `متاح: ${stock}`,
      className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold',
      isNegative: false,
      isZero: false,
    }
  }
  if (stock === 0) {
    return {
      text: 'متاح: 0',
      className: 'bg-amber-500/10 text-amber-700 border-amber-500/30 font-bold',
      isNegative: false,
      isZero: true,
    }
  }
  return {
    text: `متاح: ${stock}`,
    className: 'bg-rose-600 text-white border-rose-700 font-black',
    isNegative: true,
    isZero: false,
  }
}
