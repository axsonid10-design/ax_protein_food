import { generateUUID } from '../utils/AX_UUID.js'
import { recalculateItemStock } from '../components/warehouses/itemMovementHelpers.js'
import { getCartonEquivalent } from '../utils/pricingCalculations.js'
import { offlineDB } from '../services/offlineDB.js'

export const updateLocalCachePayload = (key, value) => {
  try {
    const s = localStorage.getItem('ax_cached_db_payload')
    const parsed = s ? JSON.parse(s) : {}
    parsed[key] = value
    localStorage.setItem('ax_cached_db_payload', JSON.stringify(parsed))
  } catch {}
  try {
    if (typeof offlineDB !== 'undefined' && offlineDB?.cacheData) {
      offlineDB.cacheData(key, value).catch(() => {})
      offlineDB.getCachedData('full_database').then((cached) => {
        if (cached && typeof cached === 'object') {
          cached[key] = value
          offlineDB.cacheData('full_database', cached).catch(() => {})
        }
      }).catch(() => {})
    }
  } catch {}
}

export const processInvoiceStoreState = (state, inv) => {
  const isSaleReturn = inv.type === 'sale_return'
  const isPurchaseReturn = inv.type === 'purchase_return'
  const partyKind = inv.partyKind || inv.partyType || (inv.type === 'sale' || isSaleReturn ? 'customer' : 'supplier')
  const isCustomerRelated = partyKind === 'customer'
  let updatedClients = [...(state.clients || [])]
  let updatedSuppliers = [...(state.suppliers || [])]

  if (isCustomerRelated) {
    const cIdx = updatedClients.findIndex((c) => c.name === inv.partyName)
    const balanceDelta = isSaleReturn ? -inv.remainingAmount : inv.remainingAmount
    if (cIdx >= 0) {
      updatedClients[cIdx] = {
        ...updatedClients[cIdx],
        balance: (updatedClients[cIdx].balance || 0) + balanceDelta,
      }
    } else {
      updatedClients.unshift({
        id: generateUUID(),
        name: inv.partyName,
        balance: balanceDelta,
        phone: '',
        address: 'بيانات ناقصة',
      })
    }
  } else {
    const sIdx = updatedSuppliers.findIndex(
      (s) => s.name === inv.partyName || s.companyName === inv.partyName || s.id === inv.partyId
    )
    const isSupplierBuying = inv.type === 'sale' || isSaleReturn
    const balanceDelta = isSupplierBuying
      ? (isSaleReturn ? inv.remainingAmount : -inv.remainingAmount)
      : (isPurchaseReturn ? -inv.remainingAmount : inv.remainingAmount)

    if (sIdx >= 0) {
      updatedSuppliers[sIdx] = {
        ...updatedSuppliers[sIdx],
        balance: (updatedSuppliers[sIdx].balance || 0) + balanceDelta,
      }
    } else {
      updatedSuppliers.unshift({
        id: generateUUID(),
        name: inv.partyName,
        companyName: inv.partyName,
        balance: balanceDelta,
        phone: '',
        address: 'بيانات ناقصة',
      })
    }
  }

  let updatedStock = [...(state.inventoryStock || [])]
  inv.items?.forEach((item) => {
    const itId = item.itemId || item.id
    const itemMeta = (state.items || []).find((i) => i.id === itId)
    const cartonQty = getCartonEquivalent(item.quantity, item.unit, itemMeta || item)
    const sIdx = updatedStock.findIndex((s) => s.warehouseId === inv.warehouseId && s.itemId === itId)
    const delta = isSaleReturn ? cartonQty : (isPurchaseReturn ? -cartonQty : (inv.type === 'sale' ? -cartonQty : cartonQty))
    if (sIdx >= 0) {
      updatedStock[sIdx] = {
        ...updatedStock[sIdx],
        quantity: (updatedStock[sIdx].quantity || 0) + delta,
      }
    } else {
      updatedStock.push({
        warehouseId: inv.warehouseId,
        itemId: itId,
        quantity: delta,
        unit: itemMeta?.unitType || itemMeta?.unit_type || item.unit || 'كرتونة',
      })
    }
  })

  let updatedTreasuries = [...(state.treasuryAccounts || [])]
  let updatedCashTx = [...(state.cashTransactions || [])]

  if (inv.paidAmount > 0) {
    const tIdx = updatedTreasuries.findIndex((t) => t.id === inv.treasuryId)
    const trIndex = tIdx >= 0 ? tIdx : 0
    const isCashOut = (inv.type === 'purchase' && !isPurchaseReturn) || isSaleReturn
    const cashDelta = isCashOut ? -inv.paidAmount : inv.paidAmount

    if (updatedTreasuries[trIndex]) {
      updatedTreasuries[trIndex] = {
        ...updatedTreasuries[trIndex],
        balance: (updatedTreasuries[trIndex].balance || 0) + cashDelta,
      }
    }

    const txCode = (isCashOut ? 'PAY-' : 'REC-') + Date.now().toString().slice(-4)
    const txNotes = isSaleReturn
      ? `رد نقدية - مردود مبيعات ${inv.code}`
      : isPurchaseReturn
      ? `استرداد نقدية - مردود مشتريات ${inv.code}`
      : inv.type === 'sale'
      ? `تحصيل نقدي - فاتورة مبيعات ${inv.code}`
      : `سداد نقدي - فاتورة مشتريات ${inv.code}`

    updatedCashTx.unshift({
      id: generateUUID(),
      code: txCode,
      type: isCashOut ? 'supplier_payment' : 'client_receipt',
      partyName: inv.partyName,
      amount: inv.paidAmount,
      treasuryId: inv.treasuryId || updatedTreasuries[0]?.id,
      date: inv.date,
      notes: txNotes,
    })
  }

  const nextInvoices = [inv, ...state.invoices]
  updateLocalCachePayload('invoices', nextInvoices)
  updateLocalCachePayload('inventoryStock', updatedStock)
  updateLocalCachePayload('treasuryAccounts', updatedTreasuries)
  updateLocalCachePayload('clients', updatedClients)
  updateLocalCachePayload('suppliers', updatedSuppliers)

  return {
    invoices: nextInvoices,
    clients: updatedClients,
    suppliers: updatedSuppliers,
    inventoryStock: updatedStock,
    treasuryAccounts: updatedTreasuries,
    cashTransactions: updatedCashTx,
  }
}


export const saveSalesRepState = (state, rep) => {
  const updated = [rep, ...(state.salesReps || []).filter((r) => r.id !== rep.id)]
  updateLocalCachePayload('salesReps', updated)
  return { salesReps: updated }
}

export const updateSalesRepState = (state, id, updates) => {
  const updated = (state.salesReps || []).map((r) => (r.id === id ? { ...r, ...updates } : r))
  updateLocalCachePayload('salesReps', updated)
  return { salesReps: updated }
}

export const deleteSalesRepState = (state, id) => {
  const updatedReps = (state.salesReps || []).filter((r) => r.id !== id)
  const updatedLedger = (state.salesRepLedger || []).filter((tx) => tx.repId !== id)
  updateLocalCachePayload('salesReps', updatedReps)
  updateLocalCachePayload('salesRepLedger', updatedLedger)
  return { salesReps: updatedReps, salesRepLedger: updatedLedger }
}


export const revertInvoiceStoreState = (state, inv) => {
  if (!inv) return state
  const isSaleReturn = inv.type === 'sale_return'
  const isPurchaseReturn = inv.type === 'purchase_return'
  const partyKind = inv.partyKind || inv.partyType || (inv.type === 'sale' || isSaleReturn ? 'customer' : 'supplier')
  const isCustomerRelated = partyKind === 'customer'

  let updatedClients = [...(state.clients || [])]
  let updatedSuppliers = [...(state.suppliers || [])]

  if (isCustomerRelated) {
    const cIdx = updatedClients.findIndex((c) => c.name === inv.partyName || c.id === inv.partyId)
    const balanceDelta = isSaleReturn ? inv.remainingAmount : -inv.remainingAmount
    if (cIdx >= 0) {
      updatedClients[cIdx] = {
        ...updatedClients[cIdx],
        balance: (updatedClients[cIdx].balance || 0) + balanceDelta,
      }
    }
  } else {
    const sIdx = updatedSuppliers.findIndex((s) => s.name === inv.partyName || s.companyName === inv.partyName || s.id === inv.partyId)
    const isSupplierBuying = inv.type === 'sale' || isSaleReturn
    const balanceDelta = isSupplierBuying
      ? (isSaleReturn ? -inv.remainingAmount : inv.remainingAmount)
      : (isPurchaseReturn ? inv.remainingAmount : -inv.remainingAmount)
    if (sIdx >= 0) {
      updatedSuppliers[sIdx] = {
        ...updatedSuppliers[sIdx],
        balance: (updatedSuppliers[sIdx].balance || 0) + balanceDelta,
      }
    }
  }

  let updatedStock = [...(state.inventoryStock || [])]
  inv.items?.forEach((item) => {
    const itId = item.itemId || item.id
    const itemMeta = (state.items || []).find((i) => i.id === itId)
    const cartonQty = getCartonEquivalent(item.quantity, item.unit, itemMeta || item)
    const sIdx = updatedStock.findIndex((s) => s.warehouseId === inv.warehouseId && s.itemId === itId)
    const delta = isSaleReturn ? -cartonQty : (isPurchaseReturn ? cartonQty : (inv.type === 'sale' ? cartonQty : -cartonQty))
    if (sIdx >= 0) {
      updatedStock[sIdx] = {
        ...updatedStock[sIdx],
        quantity: (updatedStock[sIdx].quantity || 0) + delta,
      }
    } else {
      updatedStock.push({
        warehouseId: inv.warehouseId,
        itemId: itId,
        quantity: delta,
        unit: itemMeta?.unitType || itemMeta?.unit_type || item.unit || 'كرتونة',
      })
    }
  })

  let updatedTreasuries = [...(state.treasuryAccounts || [])]
  let updatedCashTx = [...(state.cashTransactions || [])]

  if (inv.paidAmount > 0) {
    const tIdx = updatedTreasuries.findIndex((t) => t.id === inv.treasuryId)
    const trIndex = tIdx >= 0 ? tIdx : 0
    const isCashOut = (inv.type === 'purchase' && !isPurchaseReturn) || isSaleReturn
    const cashDelta = isCashOut ? inv.paidAmount : -inv.paidAmount

    if (updatedTreasuries[trIndex]) {
      updatedTreasuries[trIndex] = {
        ...updatedTreasuries[trIndex],
        balance: (updatedTreasuries[trIndex].balance || 0) + cashDelta,
      }
    }

    if (inv.code) {
      updatedCashTx = updatedCashTx.filter((tx) => !tx.notes?.includes(inv.code) && !tx.description?.includes(inv.code))
    }
  }

  return {
    clients: updatedClients,
    suppliers: updatedSuppliers,
    inventoryStock: updatedStock,
    treasuryAccounts: updatedTreasuries,
    cashTransactions: updatedCashTx,
  }
}

export const deleteInvoiceStoreState = (state, invoiceId) => {
  const inv = (state.invoices || []).find((i) => i.id === invoiceId)
  if (!inv) return state
  const reverted = revertInvoiceStoreState(state, inv)
  const nextInvoices = (state.invoices || []).filter((i) => i.id !== invoiceId)

  updateLocalCachePayload('invoices', nextInvoices)
  updateLocalCachePayload('inventoryStock', reverted.inventoryStock)
  updateLocalCachePayload('treasuryAccounts', reverted.treasuryAccounts)
  updateLocalCachePayload('clients', reverted.clients)
  updateLocalCachePayload('suppliers', reverted.suppliers)
  updateLocalCachePayload('cashTransactions', reverted.cashTransactions)

  return {
    ...reverted,
    invoices: nextInvoices,
  }
}

export const updateInvoiceStoreState = (state, invoiceIdOrInv, updatedInvData) => {
  const invoiceId = typeof invoiceIdOrInv === 'string' ? invoiceIdOrInv : invoiceIdOrInv?.id
  const updatedInv = typeof invoiceIdOrInv === 'string' ? updatedInvData : invoiceIdOrInv
  const oldInv = (state.invoices || []).find((i) => i.id === invoiceId)
  const cleanState = oldInv ? { ...state, ...revertInvoiceStoreState(state, oldInv), invoices: (state.invoices || []).filter((i) => i.id !== invoiceId) } : state
  const fullUpdatedInv = { ...oldInv, ...updatedInv, id: invoiceId }
  return processInvoiceStoreState(cleanState, fullUpdatedInv)
}

export const saveItemOpeningBalanceState = (state, { itemId, warehouseId, quantity, date, unit }) => {
  const purchases = state.invoices?.filter((i) => i.type === 'purchase' || i.type === 'purchase_return') || []
  const sales = state.invoices?.filter((i) => i.type === 'sale' || i.type === 'sale_return') || []

  let updatedInventory = [...(state.inventoryStock || [])]
  const idx = updatedInventory.findIndex(
    (s) => (s.warehouseId || s.warehouse_id) === warehouseId && (s.itemId || s.item_id) === itemId
  )
  const prevItem = idx !== -1 ? updatedInventory[idx] : null
  const baseUnit = unit || prevItem?.unit || 'كرتونة'
  const parsedQty = !isNaN(Number(quantity)) && quantity !== '' && quantity !== null ? Number(quantity) : 0

  const tempStockRow = {
    warehouseId,
    itemId,
    unit: baseUnit,
    ...(prevItem || {}),
    warehouseId,
    itemId,
    openingBalance: parsedQty,
    openingDate: date || null,
  }

  if (idx !== -1) {
    updatedInventory[idx] = tempStockRow
  } else {
    updatedInventory.push(tempStockRow)
  }

  const nextCurrentStock = recalculateItemStock({
    itemId,
    warehouseId,
    inventoryStock: updatedInventory,
    items: state.items || [],
    purchases,
    sales,
    transfers: state.transfers || [],
    stockAudits: state.stockAudits || [],
    warehouses: state.warehouses || [],
  })

  const finalStockRow = { ...tempStockRow, quantity: nextCurrentStock }
  const finalInventory = updatedInventory.map((s) =>
    (s.warehouseId || s.warehouse_id) === warehouseId && (s.itemId || s.item_id) === itemId ? finalStockRow : s
  )

  updateLocalCachePayload('inventoryStock', finalInventory)
  return { inventoryStock: finalInventory, newStock: nextCurrentStock, finalStockRow }
}