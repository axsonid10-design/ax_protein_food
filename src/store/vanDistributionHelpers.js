import { generateUUID } from '../utils/AX_UUID.js'
import { getCartonEquivalent } from '../utils/pricingCalculations.js'
import { executeImmediateTransfer } from './transferHelpers.js'

export function getVanWarehouses(warehouses = [], distributors = []) {
  const fromWarehouses = (warehouses || []).filter((w) => w.type === 'van')
  if (fromWarehouses.length > 0) {
    return fromWarehouses.map((w) => ({
      id: w.id,
      name: w.name,
      type: 'van',
      plateNumber: w.plateNumber || w.plate_number || '',
      model: w.model || '',
      manager: w.manager || w.driverName || 'مندوب التوزيع',
      phone: w.phone || w.driverPhone || '',
      driverId: w.driverId || w.driver_id || '',
      driverName: w.manager || w.driverName || 'مندوب التوزيع',
      treasuryId: w.treasuryId || w.treasury_id || 'c0000000-0000-0000-0000-000000000005',
      status: w.status || 'active',
    }))
  }

  if (Array.isArray(distributors) && distributors.length > 0) {
    return distributors.map((d) => ({
      id: d.id,
      name: d.name,
      type: 'van',
      plateNumber: d.vanNumber || '',
      model: '',
      manager: d.name || 'مندوب التوزيع',
      phone: d.phone || '',
      driverId: d.id,
      driverName: d.name,
      treasuryId: 'c0000000-0000-0000-0000-000000000005',
      status: 'active',
    }))
  }

  return [
    {
      id: 'b0000000-0000-0000-0000-000000000010',
      name: 'سيارة التوزيع الميداني (1)',
      type: 'van',
      plateNumber: 'أ ب ج 1234',
      model: 'شيفروليه جامبو تبريد',
      manager: 'مندوب التوزيع الرئيسي',
      phone: '01000000000',
      driverId: '',
      driverName: 'مندوب التوزيع الرئيسي',
      treasuryId: 'c0000000-0000-0000-0000-000000000005',
      status: 'active',
    },
  ]
}

export function getVanCashAccount(treasuryAccounts = [], van = {}) {
  const accounts = Array.isArray(treasuryAccounts) ? treasuryAccounts : []
  const matchById = van?.treasuryId ? accounts.find((t) => t.id === van.treasuryId) : null
  if (matchById) return matchById

  const matchByType = accounts.find((t) => t.type === 'van_cash')
  if (matchByType) return matchByType

  return {
    id: 'c0000000-0000-0000-0000-000000000005',
    name: 'عهدة سيارة التوزيع (الكاش الميداني)',
    type: 'van_cash',
    balance: 0,
  }
}

export function getCartonEquivalentQuantity(quantity, unit = 'كرتونة', item = {}) {
  return getCartonEquivalent(quantity, unit, item)
}

export function calculateItemBreakdown(cartonQuantity, item = {}) {
  const totalCartons = Number(cartonQuantity) || 0
  const piecesPerCarton = Number(item?.piecesPerCarton ?? item?.pieces_per_carton ?? 0)
  const subUnitType = String(item?.subUnitType || item?.sub_unit_type || 'قطعة').trim()

  if (piecesPerCarton <= 0) {
    return {
      wholeCartons: totalCartons,
      subUnits: 0,
      subUnitType,
      piecesPerCarton: 0,
      totalCartons,
    }
  }

  const wholeCartons = Math.floor(totalCartons)
  const remainder = totalCartons - wholeCartons
  const subUnits = Math.round(remainder * piecesPerCarton)

  return {
    wholeCartons,
    subUnits,
    subUnitType,
    piecesPerCarton,
    totalCartons,
  }
}

export function calculateVanCustodyTotals(custodyStock = [], items = []) {
  const stockList = Array.isArray(custodyStock) ? custodyStock : []
  const itemsList = Array.isArray(items) ? items : []

  let totalCartons = 0
  let totalWeightKg = 0
  let totalValueEgp = 0
  let itemsCount = 0

  for (const s of stockList) {
    const qty = Number(s.quantity) || 0
    if (qty <= 0) continue
    itemsCount++
    totalCartons += qty

    const it = itemsList.find((i) => i.id === s.itemId || i.id === s.item_id)
    const wt = Number(it?.weightPerCarton ?? it?.weight_per_carton ?? 0)
    const pr = Number(it?.sellPrice ?? it?.sell_price ?? 0)

    totalWeightKg += qty * wt
    totalValueEgp += qty * pr
  }

  return {
    totalCartons: Number(totalCartons.toFixed(2)),
    totalWeightKg: Number(totalWeightKg.toFixed(2)),
    totalValueEgp: Number(totalValueEgp.toFixed(2)),
    itemsCount,
  }
}

export function calculateSettlementTotals({ grossCash = 0, expenses = [], payments = [] }) {
  const expenseList = Array.isArray(expenses) ? expenses : []
  const paymentList = Array.isArray(payments) ? payments : []

  const totalExpenses = expenseList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
  const gross = Number(grossCash) || 0
  const netRemitDue = Math.max(0, gross - totalExpenses)
  const totalRemitted = paymentList.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
  const variance = totalRemitted - netRemitDue

  return {
    grossCash: gross,
    totalExpenses,
    netRemitDue,
    totalRemitted,
    variance,
  }
}

export async function executeVanStockLoading(
  {
    fromWarehouseId,
    vanWarehouseId,
    items = [],
    operationalDate = new Date().toISOString().split('T')[0],
    notes = '',
    userId = null,
    userName = 'مندوب التوزيع',
  },
  storeState = {},
  setStoreState = null
) {
  if (!fromWarehouseId || !vanWarehouseId) {
    return { success: false, error: 'يجب تحديد المخزن المصدر وسيارة التوزيع' }
  }

  const validItems = []
  const allItems = storeState.items || []

  for (const entry of items) {
    const rawQty = Number(entry.quantity ?? entry.rawQuantity) || 0
    if (rawQty <= 0) continue
    const itObj = allItems.find((i) => i.id === entry.itemId) || {}
    const unit = entry.selectedUnit || entry.unit || itObj?.unitType || 'كرتونة'
    const cartonQty = getCartonEquivalentQuantity(rawQty, unit, itObj)

    validItems.push({
      itemId: entry.itemId,
      quantity: cartonQty,
      rawQuantity: rawQty,
      unit: 'كرتونة',
      selectedUnit: unit,
      name: itObj.compositeName || itObj.name || entry.name || '',
      primaryCategory: itObj.primaryCategory || 'أصناف عامة',
    })
  }

  if (validItems.length === 0) {
    return { success: false, error: 'لم يتم اختيار أصناف للتحميل' }
  }

  const fromWarehouse = (storeState.warehouses || []).find((w) => w.id === fromWarehouseId)
  const vanWarehouse = (storeState.warehouses || []).find((w) => w.id === vanWarehouseId)

  const payload = {
    fromWarehouseId,
    toWarehouseId: vanWarehouseId,
    fromWarehouse,
    toWarehouse: vanWarehouse,
    operationalDate,
    items: validItems,
    notes: notes || `شحن بضاعة لسيارة التوزيع ${vanWarehouse?.name || ''}`,
    userId,
    userName,
  }

  const res = await executeImmediateTransfer(payload, {
    stockAudits: storeState.stockAudits || [],
    warehouses: storeState.warehouses || [],
    inventoryStock: storeState.inventoryStock || [],
  })

  if (res?.success) {
    if (typeof setStoreState === 'function') {
      setStoreState((state) => ({
        transfers: [res.transfer, ...(state.transfers || [])],
        inventoryStock: res.updatedStock,
      }))
    }
    return {
      success: true,
      transfer: res.transfer,
      updatedStock: res.updatedStock,
    }
  }

  return { success: false, error: res?.error || 'فشل تنفيذ تحويل البضاعة' }
}

export async function executeVanSettlement(
  {
    vanWarehouseId,
    driverId = '',
    driverName = '',
    vanName = '',
    settlementDate = new Date().toISOString().split('T')[0],
    grossCash = 0,
    revenue = { payments: [] },
    expenses = [],
    stockSettlement = { action: 'retain', targetWarehouseId: '', items: [] },
    notes = '',
    vanTreasuryId = 'c0000000-0000-0000-0000-000000000005',
  },
  storeActions = {},
  storeState = {},
  setStoreState = null
) {
  const { addCashTransaction, addPendingCashTransfer, confirmCashTransfer } = storeActions
  const recordedExpenses = []
  const recordedPayments = []

  for (const exp of expenses || []) {
    const amt = Number(exp.amount) || 0
    if (amt <= 0) continue

    const tx = {
      id: generateUUID(),
      code: `EXP-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`,
      type: 'expense',
      partyType: 'expense',
      partyName: `مصاريف سيارة: ${exp.categoryName || 'مصروف تشغيلي'}`,
      amount: amt,
      treasuryId: vanTreasuryId,
      date: settlementDate,
      notes: `تسوية يومية - ${vanName || 'سيارة'}: ${exp.notes || exp.description || ''}`,
      expenseSecondaryCategoryId: exp.categoryId || exp.expenseCategoryId || 'exp-sec-trn-fuel',
      expenseSecondaryCategoryName: exp.categoryName || 'وقود وسولار سيارات التوزيع',
    }

    if (typeof addCashTransaction === 'function') {
      addCashTransaction(tx)
    }
    recordedExpenses.push(tx)
  }

  for (const pay of revenue?.payments || []) {
    const amt = Number(pay.amount) || 0
    if (amt <= 0) continue

    const pctId = generateUUID()
    const pct = {
      id: pctId,
      code: `REMIT-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`,
      fromTreasuryId: vanTreasuryId,
      toTreasuryId: pay.destinationTreasuryId || pay.treasuryId,
      amount: amt,
      status: 'pending',
      date: settlementDate,
      senderName: driverName || 'مندوب التوزيع',
      notes: `تصفية يومية (${pay.method === 'transfer' ? 'تحويل بنكي' : pay.method === 'instapay' ? 'إنستاباي' : 'كاش خزينة'}) - ${vanName}`,
    }

    if (typeof addPendingCashTransfer === 'function') {
      addPendingCashTransfer(pct)
    }
    if (typeof confirmCashTransfer === 'function') {
      confirmCashTransfer(pctId)
    }
    recordedPayments.push(pct)
  }

  if (stockSettlement?.action === 'return' && !stockSettlement?.targetWarehouseId) {
    return {
      success: false,
      error: 'يرجى تحديد المخزن المستلم للبضاعة المرتجعة',
    }
  }

  let stockTransferResult = null
  if (
    stockSettlement?.action === 'return' &&
    stockSettlement?.targetWarehouseId &&
    Array.isArray(stockSettlement?.items) &&
    stockSettlement.items.length > 0
  ) {
    const returnItems = stockSettlement.items
      .filter((it) => Number(it.remainingQuantity ?? it.quantity) > 0)
      .map((it) => ({
        itemId: it.itemId,
        quantity: Number(it.remainingQuantity ?? it.quantity),
        unit: it.unit || 'كرتونة',
        name: it.name || '',
      }))

    if (returnItems.length > 0) {
      const fromWh = (storeState.warehouses || []).find((w) => w.id === vanWarehouseId)
      const toWh = (storeState.warehouses || []).find((w) => w.id === stockSettlement.targetWarehouseId)

      const payload = {
        fromWarehouseId: vanWarehouseId,
        toWarehouseId: stockSettlement.targetWarehouseId,
        fromWarehouse: fromWh,
        toWarehouse: toWh,
        operationalDate: settlementDate,
        items: returnItems,
        notes: `إرجاع بضاعة متبقية من سيارة التوزيع ${vanName} إلى ${toWh?.name || 'المخزن'}`,
        userName: driverName || 'مندوب التوزيع',
      }

      const res = await executeImmediateTransfer(payload, {
        stockAudits: storeState.stockAudits || [],
        warehouses: storeState.warehouses || [],
        inventoryStock: storeState.inventoryStock || [],
      })

      if (res?.success) {
        stockTransferResult = res.transfer
        if (typeof setStoreState === 'function') {
          setStoreState((state) => ({
            transfers: [res.transfer, ...(state.transfers || [])],
            inventoryStock: res.updatedStock,
          }))
        }
      }
    }
  }

  const totals = calculateSettlementTotals({
    grossCash,
    expenses: recordedExpenses,
    payments: recordedPayments,
  })

  const settlementRecord = {
    id: generateUUID(),
    code: `SETTLE-VAN-${Date.now().toString().slice(-5)}`,
    vanWarehouseId,
    vanName,
    driverId,
    driverName,
    settlementDate,
    grossCash,
    expenses: recordedExpenses,
    totalExpenses: totals.totalExpenses,
    netRemitDue: totals.netRemitDue,
    payments: recordedPayments,
    totalRemitted: totals.totalRemitted,
    variance: totals.variance,
    stockAction: stockSettlement?.action || 'retain',
    returnedItemsCount: stockTransferResult ? stockSettlement.items.length : 0,
    transferCode: stockTransferResult?.code || null,
    notes,
    createdAt: new Date().toISOString(),
  }

  return {
    success: true,
    settlement: settlementRecord,
  }
}
