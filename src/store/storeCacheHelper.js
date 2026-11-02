import { generateUUID } from '../utils/AX_UUID.js'

export const updateLocalCachePayload = (key, value) => {
  try {
    const s = localStorage.getItem('ax_cached_db_payload')
    const parsed = s ? JSON.parse(s) : {}
    parsed[key] = value
    localStorage.setItem('ax_cached_db_payload', JSON.stringify(parsed))
  } catch {}
}

export const processInvoiceStoreState = (state, inv) => {
  const isSaleReturn = inv.type === 'sale_return'
  const isPurchaseReturn = inv.type === 'purchase_return'
  const isCustomerRelated = inv.type === 'sale' || isSaleReturn
  let updatedClients = [...state.clients]
  let updatedSuppliers = [...state.suppliers]

  if (isCustomerRelated) {
    const cIdx = updatedClients.findIndex((c) => c.name === inv.partyName)
    const balanceDelta = isSaleReturn ? -inv.remainingAmount : inv.remainingAmount
    if (cIdx >= 0) {
      updatedClients[cIdx] = {
        ...updatedClients[cIdx],
        balance: Math.max(0, (updatedClients[cIdx].balance || 0) + balanceDelta),
      }
    } else {
      updatedClients.unshift({
        id: generateUUID(),
        name: inv.partyName,
        balance: Math.max(0, balanceDelta),
        phone: '',
        address: 'بيانات ناقصة',
      })
    }
  } else {
    const sIdx = updatedSuppliers.findIndex((s) => s.name === inv.partyName)
    const balanceDelta = isPurchaseReturn ? -inv.remainingAmount : inv.remainingAmount
    if (sIdx >= 0) {
      updatedSuppliers[sIdx] = {
        ...updatedSuppliers[sIdx],
        balance: Math.max(0, (updatedSuppliers[sIdx].balance || 0) + balanceDelta),
      }
    } else {
      updatedSuppliers.unshift({
        id: generateUUID(),
        name: inv.partyName,
        balance: Math.max(0, balanceDelta),
        phone: '',
        address: 'بيانات ناقصة',
      })
    }
  }

  let updatedStock = [...state.inventoryStock]
  inv.items?.forEach((item) => {
    const sIdx = updatedStock.findIndex((s) => s.warehouseId === inv.warehouseId && s.itemId === item.itemId)
    const delta = isSaleReturn ? item.quantity : (isPurchaseReturn ? -item.quantity : (inv.type === 'sale' ? -item.quantity : item.quantity))
    if (sIdx >= 0) {
      updatedStock[sIdx] = {
        ...updatedStock[sIdx],
        quantity: Math.max(0, (updatedStock[sIdx].quantity || 0) + delta),
      }
    } else if (delta > 0) {
      updatedStock.push({
        warehouseId: inv.warehouseId,
        itemId: item.itemId,
        quantity: delta,
        unit: item.unit || 'كرتونة',
      })
    }
  })

  let updatedTreasuries = [...state.treasuryAccounts]
  let updatedCashTx = [...state.cashTransactions]

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
