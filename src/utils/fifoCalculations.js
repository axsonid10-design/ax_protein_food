import { getCartonEquivalent } from './pricingCalculations.js'

export function buildPurchaseBatches(invoices = [], items = [], inventoryStock = []) {
  const safeInvoices = Array.isArray(invoices) ? invoices : []
  const safeItems = Array.isArray(items) ? items : []
  const safeStock = Array.isArray(inventoryStock) ? inventoryStock : []

  const itemsMap = new Map()
  safeItems.forEach((it) => {
    if (it && it.id) {
      itemsMap.set(it.id, it)
    }
  })

  const batches = []

  safeItems.forEach((item) => {
    const directOpening = Number(item.openingBalance ?? item.opening_balance ?? 0)
    const stockOpening = safeStock.reduce((acc, s) => {
      const sItemId = s.itemId || s.item_id
      if (sItemId === item.id) {
        return acc + Number(s.openingBalance ?? s.opening_balance ?? 0)
      }
      return acc
    }, 0)

    const rawOpening = directOpening > 0 ? directOpening : stockOpening
    if (rawOpening > 0) {
      const openingCartons = getCartonEquivalent(rawOpening, item.unitType || item.unit_type || 'كرتونة', item)
      const rawBuyPrice = item.buyPrice ?? item.buy_price
      const unitCost = Number(rawBuyPrice) > 0 ? Number(rawBuyPrice) : null

      batches.push({
        batchId: `open-${item.id}`,
        invoiceId: null,
        invoiceCode: 'رصيد أول المدة',
        date: String(item.openingDate || item.opening_date || '1970-01-01'),
        createdAt: '1970-01-01T00:00:00.000Z',
        itemId: item.id,
        unitCost,
        initialQty: openingCartons,
        remainingQty: openingCartons,
        isCostUndetermined: unitCost === null,
        isOpening: true,
      })
    }
  })

  const purchaseInvoices = safeInvoices
    .filter((inv) => {
      if (!inv || inv.status === 'cancelled' || inv.isCancelled) return false
      return inv.type === 'purchase'
    })
    .sort((a, b) => {
      const dateA = String(a.date || a.operationalDate || a.createdAt || a.created_at || '')
      const dateB = String(b.date || b.operationalDate || b.createdAt || b.created_at || '')
      if (dateA !== dateB) return dateA.localeCompare(dateB)
      const timeA = String(a.createdAt || a.created_at || '')
      const timeB = String(b.createdAt || b.created_at || '')
      return timeA.localeCompare(timeB)
    })

  purchaseInvoices.forEach((inv) => {
    const invDate = String(inv.date || inv.operationalDate || inv.createdAt || inv.created_at || '1970-01-01')
    const invCreated = String(inv.createdAt || inv.created_at || invDate)
    const invItems = Array.isArray(inv.items) ? inv.items : []

    invItems.forEach((row, idx) => {
      const rowItemId = row.itemId || row.item_id || row.id
      if (!rowItemId) return

      const catalogItem = itemsMap.get(rowItemId) || row
      const qtyInCartons = getCartonEquivalent(row.quantity, row.unit, catalogItem)
      if (qtyInCartons <= 0) return

      const rawPrice = row.price
      const isPriceEmpty = rawPrice === '' || rawPrice === null || rawPrice === undefined
      const numPrice = Number(rawPrice)
      const isUndetermined = isPriceEmpty || isNaN(numPrice) || numPrice <= 0

      let unitCostPerCarton = null
      if (!isUndetermined) {
        const lineTotal = Number(row.total) || (Number(row.quantity) * numPrice)
        unitCostPerCarton = qtyInCartons > 0 ? (lineTotal / qtyInCartons) : numPrice
      }

      batches.push({
        batchId: `${inv.id || 'purch'}-${rowItemId}-${idx}`,
        invoiceId: inv.id,
        invoiceCode: inv.code,
        date: invDate,
        createdAt: invCreated,
        itemId: rowItemId,
        unitCost: unitCostPerCarton,
        initialQty: qtyInCartons,
        remainingQty: qtyInCartons,
        isCostUndetermined: isUndetermined,
        isOpening: false,
      })
    })
  })

  const purchaseReturns = safeInvoices
    .filter((inv) => {
      if (!inv || inv.status === 'cancelled' || inv.isCancelled) return false
      return inv.type === 'purchase_return'
    })
    .sort((a, b) => {
      const dateA = String(a.date || a.operationalDate || a.createdAt || '')
      const dateB = String(b.date || b.operationalDate || b.createdAt || '')
      return dateA.localeCompare(dateB)
    })

  purchaseReturns.forEach((ret) => {
    const retItems = Array.isArray(ret.items) ? ret.items : []
    retItems.forEach((row) => {
      const rowItemId = row.itemId || row.item_id || row.id
      if (!rowItemId) return
      const catalogItem = itemsMap.get(rowItemId) || row
      let retQty = getCartonEquivalent(row.quantity, row.unit, catalogItem)
      if (retQty <= 0) return

      for (let i = batches.length - 1; i >= 0; i--) {
        const b = batches[i]
        if (b.itemId === rowItemId && b.remainingQty > 0) {
          const deduct = Math.min(b.remainingQty, retQty)
          b.remainingQty -= deduct
          retQty -= deduct
          if (retQty <= 0) break
        }
      }
    })
  })

  return batches
}

export function calculateFifoProfits(invoices = [], items = [], inventoryStock = []) {
  const safeInvoices = Array.isArray(invoices) ? invoices : []
  const safeItems = Array.isArray(items) ? items : []
  const safeStock = Array.isArray(inventoryStock) ? inventoryStock : []

  const itemsMap = new Map()
  safeItems.forEach((it) => {
    if (it && it.id) {
      itemsMap.set(it.id, it)
    }
  })

  const batches = buildPurchaseBatches(safeInvoices, safeItems, safeStock)

  const batchesByItem = new Map()
  batches.forEach((b) => {
    if (!batchesByItem.has(b.itemId)) {
      batchesByItem.set(b.itemId, [])
    }
    batchesByItem.get(b.itemId).push({ ...b })
  })

  const salesInvoices = safeInvoices
    .filter((inv) => {
      if (!inv || inv.status === 'cancelled' || inv.isCancelled) return false
      return inv.type === 'sale'
    })
    .sort((a, b) => {
      const dateA = String(a.date || a.operationalDate || a.createdAt || a.created_at || '')
      const dateB = String(b.date || b.operationalDate || b.createdAt || b.created_at || '')
      if (dateA !== dateB) return dateA.localeCompare(dateB)
      const timeA = String(a.createdAt || a.created_at || '')
      const timeB = String(b.createdAt || b.created_at || '')
      if (timeA && timeB && timeA !== timeB) return timeA.localeCompare(timeB)
      return String(a.code || a.id || '').localeCompare(String(b.code || b.id || ''))
    })

  const salesReturns = safeInvoices
    .filter((inv) => {
      if (!inv || inv.status === 'cancelled' || inv.isCancelled) return false
      return inv.type === 'sale_return'
    })
    .sort((a, b) => {
      const dateA = String(a.date || a.operationalDate || a.createdAt || a.created_at || '')
      const dateB = String(b.date || b.operationalDate || b.createdAt || b.created_at || '')
      if (dateA !== dateB) return dateA.localeCompare(dateB)
      const timeA = String(a.createdAt || a.created_at || '')
      const timeB = String(b.createdAt || b.created_at || '')
      if (timeA && timeB && timeA !== timeB) return timeA.localeCompare(timeB)
      return String(a.code || a.id || '').localeCompare(String(b.code || b.id || ''))
    })

  salesReturns.forEach((ret) => {
    const retItems = Array.isArray(ret.items) ? ret.items : []
    const retDate = String(ret.date || ret.operationalDate || ret.createdAt || ret.created_at || '1970-01-01')
    const retCreated = String(ret.createdAt || ret.created_at || retDate)

    retItems.forEach((row, idx) => {
      const rowItemId = row.itemId || row.item_id || row.id
      if (!rowItemId) return
      const catalogItem = itemsMap.get(rowItemId) || row
      const qtyInCartons = getCartonEquivalent(row.quantity, row.unit, catalogItem)
      if (qtyInCartons <= 0) return

      const catalogBuyPrice = Number(catalogItem.buyPrice ?? catalogItem.buy_price) || 0
      const unitCost = catalogBuyPrice > 0 ? catalogBuyPrice : (Number(row.price) || null)

      const returnBatch = {
        batchId: `ret-${ret.id || 'ret'}-${rowItemId}-${idx}`,
        invoiceId: ret.id,
        invoiceCode: ret.code || 'مردود مبيعات',
        date: retDate,
        createdAt: retCreated,
        itemId: rowItemId,
        unitCost,
        initialQty: qtyInCartons,
        remainingQty: qtyInCartons,
        isCostUndetermined: unitCost === null,
        isOpening: false,
        isReturn: true,
      }
      if (!batchesByItem.has(rowItemId)) {
        batchesByItem.set(rowItemId, [])
      }
      batchesByItem.get(rowItemId).unshift(returnBatch)
    })
  })

  const salesProfits = new Map()
  let totalRevenue = 0
  let totalCogs = 0
  let totalProfit = 0
  let hasPendingProfit = false
  let pendingCount = 0
  let calculatedCount = 0

  salesInvoices.forEach((inv) => {
    const invItems = Array.isArray(inv.items) ? inv.items : []
    const subtotal = Number(inv.subtotal) || Number(inv.total) || 0
    const discountAmount = Number(inv.discountAmount) || 0
    const netRevenue = Math.max(0, subtotal - discountAmount)
    let invCogs = 0
    let isInvoicePending = false
    const lines = []

    invItems.forEach((line) => {
      const rowItemId = line.itemId || line.item_id || line.id
      const catalogItem = itemsMap.get(rowItemId) || line
      const qtyNeeded = getCartonEquivalent(line.quantity, line.unit, catalogItem)
      const lineRevenue = Number(line.total) || (Number(line.quantity) * Number(line.price)) || 0

      if (qtyNeeded <= 0) {
        lines.push({
          itemId: rowItemId,
          quantity: 0,
          revenue: lineRevenue,
          cogs: 0,
          profit: lineRevenue,
          profitStatus: 'calculated',
          matchedBatches: [],
        })
        return
      }

      let remainingToDeplete = qtyNeeded
      let lineCogs = 0
      let lineHasUndetermined = false
      const matchedBatches = []
      const itemBatches = batchesByItem.get(rowItemId) || []

      for (let i = 0; i < itemBatches.length; i++) {
        const batch = itemBatches[i]
        if (batch.remainingQty <= 0) continue

        const takeQty = Math.min(batch.remainingQty, remainingToDeplete)
        batch.remainingQty -= takeQty
        remainingToDeplete -= takeQty

        if (batch.isCostUndetermined || batch.unitCost === null) {
          lineHasUndetermined = true
        } else {
          lineCogs += takeQty * batch.unitCost
        }

        matchedBatches.push({
          batchId: batch.batchId,
          invoiceId: batch.invoiceId,
          invoiceCode: batch.invoiceCode,
          unitCost: batch.unitCost,
          quantity: takeQty,
          isCostUndetermined: batch.isCostUndetermined || batch.unitCost === null,
        })

        if (remainingToDeplete <= 0.00001) break
      }

      if (remainingToDeplete > 0.00001) {
        lineHasUndetermined = true
        matchedBatches.push({
          batchId: 'unmatched-negative-stock',
          invoiceId: null,
          invoiceCode: 'رصيد سالب قبل التوريد',
          unitCost: null,
          quantity: remainingToDeplete,
          isCostUndetermined: true,
        })
      }

      if (lineHasUndetermined) {
        isInvoicePending = true
        lines.push({
          itemId: rowItemId,
          quantity: qtyNeeded,
          revenue: lineRevenue,
          cogs: null,
          profit: null,
          profitStatus: 'pending',
          matchedBatches,
        })
      } else {
        const lineProfit = lineRevenue - lineCogs
        invCogs += lineCogs
        lines.push({
          itemId: rowItemId,
          quantity: qtyNeeded,
          revenue: lineRevenue,
          cogs: Number(lineCogs.toFixed(2)),
          profit: Number(lineProfit.toFixed(2)),
          profitStatus: 'calculated',
          matchedBatches,
        })
      }
    })

    totalRevenue += netRevenue

    if (isInvoicePending) {
      hasPendingProfit = true
      pendingCount++
      salesProfits.set(inv.id, {
        invoiceId: inv.id,
        invoiceCode: inv.code,
        date: inv.date,
        partyName: inv.partyName,
        subtotal,
        discountAmount,
        netRevenue,
        cogs: null,
        profit: null,
        profitMargin: null,
        profitStatus: 'pending',
        isProfitPending: true,
        lines,
      })
    } else {
      calculatedCount++
      const profit = Number((netRevenue - invCogs).toFixed(2))
      const profitMargin = netRevenue > 0 ? Number(((profit / netRevenue) * 100).toFixed(2)) : 0
      const cogs = Number(invCogs.toFixed(2))

      totalCogs += cogs
      totalProfit += profit

      salesProfits.set(inv.id, {
        invoiceId: inv.id,
        invoiceCode: inv.code,
        date: inv.date,
        partyName: inv.partyName,
        subtotal,
        discountAmount,
        netRevenue,
        cogs,
        profit,
        profitMargin,
        profitStatus: 'calculated',
        isProfitPending: false,
        lines,
      })
    }
  })

  salesReturns.forEach((ret) => {
    const returnAmount = Number(ret.subtotal) || Number(ret.total) || 0
    const retItems = Array.isArray(ret.items) ? ret.items : []
    let retCogs = 0

    retItems.forEach((row) => {
      const rowItemId = row.itemId || row.item_id || row.id
      if (!rowItemId) return
      const catalogItem = itemsMap.get(rowItemId) || row
      const qtyInCartons = getCartonEquivalent(row.quantity, row.unit, catalogItem)
      const catalogBuyPrice = Number(catalogItem.buyPrice ?? catalogItem.buy_price) || 0
      const unitCost = catalogBuyPrice > 0 ? catalogBuyPrice : (Number(row.price) || 0)
      retCogs += qtyInCartons * unitCost
    })

    const returnCogs = Number(retCogs.toFixed(2))
    const returnProfit = Number((returnAmount - returnCogs).toFixed(2))

    totalRevenue = Number((totalRevenue - returnAmount).toFixed(2))
    totalCogs = Number((totalCogs - returnCogs).toFixed(2))
    totalProfit = Number((totalProfit - returnProfit).toFixed(2))

    salesProfits.set(ret.id, {
      invoiceId: ret.id,
      invoiceCode: ret.code,
      type: 'sale_return',
      date: ret.date,
      partyName: ret.partyName,
      subtotal: -returnAmount,
      discountAmount: 0,
      netRevenue: -returnAmount,
      cogs: -returnCogs,
      profit: -returnProfit,
      profitMargin: 0,
      profitStatus: 'calculated',
      isProfitPending: false,
      lines: [],
    })
  })

  totalRevenue = Number(totalRevenue.toFixed(2))
  totalCogs = Number(totalCogs.toFixed(2))
  totalProfit = Number(totalProfit.toFixed(2))
  const grossMarginPct = totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(2)) : 0

  return {
    salesProfits,
    totalRevenue,
    totalCogs,
    totalProfit,
    grossMarginPct,
    hasPendingProfit,
    pendingCount,
    calculatedCount,
  }
}

export const calculateBatchProfits = calculateFifoProfits
export const calculateBatchMargins = calculateFifoProfits

export function getInvoiceFifoProfit(saleInvoice, invoices = [], items = [], inventoryStock = []) {
  if (!saleInvoice || saleInvoice.type !== 'sale') {
    return {
      invoiceId: saleInvoice?.id || null,
      subtotal: 0,
      cogs: 0,
      profit: 0,
      profitMargin: 0,
      profitStatus: 'calculated',
      isProfitPending: false,
      lines: [],
    }
  }

  const safeInvoices = Array.isArray(invoices) ? [...invoices] : []
  const exists = safeInvoices.some((i) => i && i.id === saleInvoice.id)
  if (!exists) {
    safeInvoices.push(saleInvoice)
  }

  const result = calculateFifoProfits(safeInvoices, items, inventoryStock)
  const entry = result.salesProfits.get(saleInvoice.id)
  if (entry) return entry

  return {
    invoiceId: saleInvoice.id,
    subtotal: Number(saleInvoice.subtotal) || Number(saleInvoice.total) || 0,
    cogs: null,
    profit: null,
    profitMargin: null,
    profitStatus: 'pending',
    isProfitPending: true,
    lines: [],
  }
}

export function formatProfitStatus(profit, status) {
  if (status === 'pending' || profit === null || profit === undefined || isNaN(Number(profit))) {
    return 'قيد الاحتساب'
  }
  return Number(profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ج.م'
}
