import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPurchaseBatches,
  calculateFifoProfits,
  getInvoiceFifoProfit,
  formatProfitStatus,
} from '../src/utils/fifoCalculations.js'
import {
  calculateDynamicRemainingStock,
  validateInvoiceItems,
  getRemainingStockBadge,
} from '../src/components/invoices/invoiceValidationHelper.js'
import {
  formatTime12H,
  formatDateTime12H,
  toLocalDateString,
  getLocalTodayStr,
  matchesInvoiceTimeframe,
} from '../src/utils/dateHelpers.js'

describe('CHALLENGER 1: Stress & Empirical Validation Suite', () => {
  const catalog = [
    { id: 'beef-cuts-1', name: 'لحم بقري قطع', unitType: 'كرتونة', weightPerCarton: 20, buyPrice: 2000, sellPrice: 2600 },
    { id: 'chicken-pack-2', name: 'دجاج مجمد', unitType: 'كرتونة', piecesPerCarton: 12, subUnitType: 'قطعة', buyPrice: 1200, sellPrice: 1560 },
    { id: 'liver-tray-3', name: 'أطباق كبدة', unitType: 'كرتونة', piecesPerCarton: 20, subUnitType: 'طبق', buyPrice: 1000, sellPrice: 1400 },
  ]

  describe('1. FIFO Profit Calculations: Stress & Adversarial Scenarios', () => {
    it('handles multi-batch depletion with fractional packaging units (pieces)', () => {
      const invoices = [
        { id: 'pur-c1', type: 'purchase', date: '2026-11-01', items: [{ itemId: 'chicken-pack-2', quantity: 10, unit: 'كرتونة', price: 1200, total: 12000 }] },
        { id: 'pur-c2', type: 'purchase', date: '2026-11-03', items: [{ itemId: 'chicken-pack-2', quantity: 10, unit: 'كرتونة', price: 1440, total: 14400 }] },
        { id: 'sal-c1', type: 'sale', date: '2026-11-04', subtotal: 900, total: 900, items: [{ itemId: 'chicken-pack-2', quantity: 6, unit: 'قطعة', price: 150, total: 900 }] },
        { id: 'sal-c2', type: 'sale', date: '2026-11-05', subtotal: 2880, total: 2880, items: [{ itemId: 'chicken-pack-2', quantity: 18, unit: 'قطعة', price: 160, total: 2880 }] },
      ]
      const result = calculateFifoProfits(invoices, catalog, [])
      const sal1 = result.salesProfits.get('sal-c1')
      assert.equal(sal1.profitStatus, 'calculated')
      assert.equal(sal1.lines[0].quantity, 0.5)
      assert.equal(sal1.cogs, 600)
      assert.equal(sal1.profit, 300)
      assert.equal(sal1.profitMargin, 33.33)

      const sal2 = result.salesProfits.get('sal-c2')
      assert.equal(sal2.profitStatus, 'calculated')
      assert.equal(sal2.lines[0].quantity, 1.5)
      assert.equal(sal2.cogs, 1800)
      assert.equal(sal2.profit, 1080)
      assert.equal(sal2.profitMargin, 37.5)

      assert.equal(result.hasPendingProfit, false)
      assert.equal(result.totalRevenue, 3780)
      assert.equal(result.totalCogs, 2400)
      assert.equal(result.totalProfit, 1380)
    })

    it('handles multi-batch depletion with fractional packaging units (kg)', () => {
      const invoices = [
        { id: 'pur-b1', type: 'purchase', date: '2026-11-01', items: [{ itemId: 'beef-cuts-1', quantity: 5, unit: 'كرتونة', price: 2000, total: 10000 }] },
        { id: 'pur-b2', type: 'purchase', date: '2026-11-03', items: [{ itemId: 'beef-cuts-1', quantity: 5, unit: 'كرتونة', price: 2400, total: 12000 }] },
        { id: 'sal-kg1', type: 'sale', date: '2026-11-04', subtotal: 3250, total: 3250, items: [{ itemId: 'beef-cuts-1', quantity: 25, unit: 'كيلو', price: 130, total: 3250 }] },
        { id: 'sal-kg2', type: 'sale', date: '2026-11-05', subtotal: 11900, total: 11900, items: [{ itemId: 'beef-cuts-1', quantity: 85, unit: 'كيلو', price: 140, total: 11900 }] },
      ]
      const result = calculateFifoProfits(invoices, catalog, [])
      const sal1 = result.salesProfits.get('sal-kg1')
      assert.equal(sal1.profitStatus, 'calculated')
      assert.equal(sal1.lines[0].quantity, 1.25)
      assert.equal(sal1.cogs, 2500)
      assert.equal(sal1.profit, 750)

      const sal2 = result.salesProfits.get('sal-kg2')
      assert.equal(sal2.profitStatus, 'calculated')
      assert.equal(sal2.lines[0].quantity, 4.25)
      assert.equal(sal2.cogs, 8700)
      assert.equal(sal2.profit, 3200)
      assert.equal(sal2.lines[0].matchedBatches.length, 2)
      assert.equal(sal2.lines[0].matchedBatches[0].quantity, 3.75)
      assert.equal(sal2.lines[0].matchedBatches[0].unitCost, 2000)
      assert.equal(sal2.lines[0].matchedBatches[1].quantity, 0.5)
      assert.equal(sal2.lines[0].matchedBatches[1].unitCost, 2400)
      assert.equal(result.hasPendingProfit, false)
      assert.equal(result.totalRevenue, 15150)
      assert.equal(result.totalCogs, 11200)
      assert.equal(result.totalProfit, 3950)
    })

    it('correctly calculates complex sale spanning 4 purchase batches with different prices', () => {
      const invoices = [
        { id: 'p1', type: 'purchase', date: '2026-11-01', items: [{ itemId: 'beef-cuts-1', quantity: 5, unit: 'كرتونة', price: 1000, total: 5000 }] },
        { id: 'p2', type: 'purchase', date: '2026-11-02', items: [{ itemId: 'beef-cuts-1', quantity: 10, unit: 'كرتونة', price: 1200, total: 12000 }] },
        { id: 'p3', type: 'purchase', date: '2026-11-03', items: [{ itemId: 'beef-cuts-1', quantity: 8, unit: 'كرتونة', price: 1500, total: 12000 }] },
        { id: 'p4', type: 'purchase', date: '2026-11-04', items: [{ itemId: 'beef-cuts-1', quantity: 12, unit: 'كرتونة', price: 2000, total: 24000 }] },
        { id: 's-span', type: 'sale', date: '2026-11-05', subtotal: 45000, total: 45000, items: [{ itemId: 'beef-cuts-1', quantity: 18, unit: 'كرتونة', price: 2500, total: 45000 }] },
        { id: 's-next', type: 'sale', date: '2026-11-06', subtotal: 26000, total: 26000, items: [{ itemId: 'beef-cuts-1', quantity: 10, unit: 'كرتونة', price: 2600, total: 26000 }] },
      ]
      const result = calculateFifoProfits(invoices, catalog, [])
      const spanSale = result.salesProfits.get('s-span')
      assert.equal(spanSale.profitStatus, 'calculated')
      assert.equal(spanSale.cogs, 5 * 1000 + 10 * 1200 + 3 * 1500)
      assert.equal(spanSale.profit, 45000 - 21500)
      assert.equal(spanSale.lines[0].matchedBatches.length, 3)

      const nextSale = result.salesProfits.get('s-next')
      assert.equal(nextSale.profitStatus, 'calculated')
      assert.equal(nextSale.cogs, 5 * 1500 + 5 * 2000)
      assert.equal(nextSale.profit, 26000 - 17500)
      assert.equal(nextSale.lines[0].matchedBatches.length, 2)
      assert.equal(result.hasPendingProfit, false)
      assert.equal(result.totalRevenue, 71000)
      assert.equal(result.totalCogs, 39000)
      assert.equal(result.totalProfit, 32000)
      assert.equal(result.grossMarginPct, 45.07)
    })

    it('safely defers profit on negative stock / overselling scenarios before purchase batches exist', () => {
      const invoices = [
        { id: 's-oversell', type: 'sale', date: '2026-11-01', subtotal: 10000, total: 10000, items: [{ itemId: 'beef-cuts-1', quantity: 5, unit: 'كرتونة', price: 2000, total: 10000 }] },
      ]
      const result = calculateFifoProfits(invoices, catalog, [])
      const overSale = result.salesProfits.get('s-oversell')
      assert.equal(overSale.profitStatus, 'pending')
      assert.equal(overSale.isProfitPending, true)
      assert.equal(overSale.cogs, null)
      assert.equal(overSale.profit, null)
      assert.equal(overSale.profitMargin, null)

      assert.equal(result.hasPendingProfit, true)
      assert.equal(result.pendingCount, 1)
      assert.equal(result.calculatedCount, 0)
      assert.equal(result.totalRevenue, 10000)
      assert.equal(result.totalCogs, 0)
      assert.equal(result.totalProfit, 0)
      assert.equal(result.grossMarginPct, 0)
      assert.equal(Number.isNaN(result.totalRevenue), false)
      assert.equal(Number.isNaN(result.totalCogs), false)
      assert.equal(Number.isNaN(result.totalProfit), false)
      assert.equal(Number.isNaN(result.grossMarginPct), false)
      assert.equal(formatProfitStatus(overSale.profit, overSale.profitStatus), 'قيد الاحتساب')
    })

    it('safely defers profit when sale partially matches existing batch and exceeds remaining stock', () => {
      const invoices = [
        { id: 'p-partial', type: 'purchase', date: '2026-11-01', items: [{ itemId: 'beef-cuts-1', quantity: 3, unit: 'كرتونة', price: 1000, total: 3000 }] },
        { id: 's-partial', type: 'sale', date: '2026-11-02', subtotal: 10000, total: 10000, items: [{ itemId: 'beef-cuts-1', quantity: 5, unit: 'كرتونة', price: 2000, total: 10000 }] },
      ]
      const result = calculateFifoProfits(invoices, catalog, [])
      const saleEntry = result.salesProfits.get('s-partial')
      assert.equal(saleEntry.profitStatus, 'pending')
      assert.equal(saleEntry.isProfitPending, true)
      assert.equal(saleEntry.cogs, null)
      assert.equal(saleEntry.profit, null)
      assert.equal(result.hasPendingProfit, true)
    })

    it('retroactively converts pending profit to exact calculated profit when purchase price is provided', () => {
      const pendingInvoices = [
        { id: 'pur-zero', type: 'purchase', date: '2026-11-01', items: [{ itemId: 'beef-cuts-1', quantity: 10, unit: 'كرتونة', price: 0, total: 0 }] },
        { id: 'sal-pending', type: 'sale', date: '2026-11-02', subtotal: 15000, total: 15000, items: [{ itemId: 'beef-cuts-1', quantity: 6, unit: 'كرتونة', price: 2500, total: 15000 }] },
      ]
      const res1 = calculateFifoProfits(pendingInvoices, catalog, [])
      assert.equal(res1.salesProfits.get('sal-pending').profitStatus, 'pending')
      assert.equal(res1.hasPendingProfit, true)

      const updatedInvoices = [
        { id: 'pur-zero', type: 'purchase', date: '2026-11-01', items: [{ itemId: 'beef-cuts-1', quantity: 10, unit: 'كرتونة', price: 1800, total: 18000 }] },
        { id: 'sal-pending', type: 'sale', date: '2026-11-02', subtotal: 15000, total: 15000, items: [{ itemId: 'beef-cuts-1', quantity: 6, unit: 'كرتونة', price: 2500, total: 15000 }] },
      ]
      const res2 = calculateFifoProfits(updatedInvoices, catalog, [])
      const calcSale = res2.salesProfits.get('sal-pending')
      assert.equal(calcSale.profitStatus, 'calculated')
      assert.equal(calcSale.isProfitPending, false)
      assert.equal(calcSale.cogs, 6 * 1800)
      assert.equal(calcSale.profit, 15000 - 10800)
      assert.equal(calcSale.profitMargin, 28)
      assert.equal(res2.hasPendingProfit, false)
      assert.equal(res2.totalProfit, 4200)
      assert.equal(formatProfitStatus(calcSale.profit, calcSale.profitStatus), '4,200.00 ج.م')
    })

    it('evaluates mixed sales where some lines are costed and some lines are uncosted', () => {
      const invoices = [
        { id: 'pur-only-beef', type: 'purchase', date: '2026-11-01', items: [{ itemId: 'beef-cuts-1', quantity: 10, unit: 'كرتونة', price: 1000, total: 10000 }] },
        {
          id: 'sal-mixed',
          type: 'sale',
          date: '2026-11-02',
          subtotal: 14000,
          total: 14000,
          items: [
            { itemId: 'beef-cuts-1', quantity: 4, unit: 'كرتونة', price: 1500, total: 6000 },
            { itemId: 'liver-tray-3', quantity: 5, unit: 'كرتونة', price: 1600, total: 8000 },
          ],
        },
      ]
      const result = calculateFifoProfits(invoices, catalog, [])
      const mixedSale = result.salesProfits.get('sal-mixed')
      assert.equal(mixedSale.profitStatus, 'pending')
      assert.equal(mixedSale.isProfitPending, true)
      assert.equal(mixedSale.cogs, null)
      assert.equal(mixedSale.profit, null)
      assert.equal(mixedSale.lines.length, 2)
      assert.equal(mixedSale.lines[0].itemId, 'beef-cuts-1')
      assert.equal(mixedSale.lines[0].profitStatus, 'calculated')
      assert.equal(mixedSale.lines[0].cogs, 4000)
      assert.equal(mixedSale.lines[0].profit, 2000)
      assert.equal(mixedSale.lines[1].itemId, 'liver-tray-3')
      assert.equal(mixedSale.lines[1].profitStatus, 'pending')
      assert.equal(mixedSale.lines[1].cogs, null)
      assert.equal(mixedSale.lines[1].profit, null)
      assert.equal(result.hasPendingProfit, true)
      assert.equal(result.totalRevenue, 14000)
      assert.equal(result.totalCogs, 0)
      assert.equal(result.totalProfit, 0)
    })
  })

  describe('2. Dynamic Stock Calculations & Quantity Edge Cases', () => {
    const inventoryStock = [
      { itemId: 'beef-cuts-1', warehouseId: 'wh-cairo', quantity: 50 },
      { itemId: 'chicken-pack-2', warehouseId: 'wh-cairo', quantity: 100 },
      { itemId: 'beef-cuts-1', warehouseId: 'wh-alex', quantity: 20 },
    ]

    it('calculates dynamic remaining stock across simultaneous multi-row entries in various units', () => {
      const invoiceItems = [
        { itemId: 'beef-cuts-1', quantity: 5, unit: 'كرتونة', price: 2600 },
        { itemId: 'beef-cuts-1', quantity: 20, unit: 'كيلو', price: 130 },
        { itemId: 'chicken-pack-2', quantity: 24, unit: 'قطعة', price: 130 },
        { itemId: 'beef-cuts-1', quantity: 10, unit: 'كيلو', price: 130 },
      ]
      const beefRemaining = calculateDynamicRemainingStock('beef-cuts-1', 'wh-cairo', inventoryStock, invoiceItems, catalog)
      assert.equal(beefRemaining, 43.5)
      const chickenRemaining = calculateDynamicRemainingStock('chicken-pack-2', 'wh-cairo', inventoryStock, invoiceItems, catalog)
      assert.equal(chickenRemaining, 98)
      const alexRemaining = calculateDynamicRemainingStock('beef-cuts-1', 'wh-alex', inventoryStock, invoiceItems, catalog)
      assert.equal(alexRemaining, 13.5)
    })

    it('handles edge case quantities: micro-fractions, large scale, and negative balances', () => {
      const microItems = [{ itemId: 'beef-cuts-1', quantity: 0.05, unit: 'كرتونة', price: 2600 }]
      const microStock = calculateDynamicRemainingStock('beef-cuts-1', 'wh-cairo', inventoryStock, microItems, catalog)
      assert.equal(microStock, 49.95)

      const megaStock = [{ itemId: 'beef-cuts-1', warehouseId: 'wh-cairo', quantity: 10000000 }]
      const megaItems = [{ itemId: 'beef-cuts-1', quantity: 9999999, unit: 'كرتونة', price: 2600 }]
      const megaRemaining = calculateDynamicRemainingStock('beef-cuts-1', 'wh-cairo', megaStock, megaItems, catalog)
      assert.equal(megaRemaining, 1)

      const oversellItems = [{ itemId: 'beef-cuts-1', quantity: 70, unit: 'كرتونة', price: 2600 }]
      const negativeRemaining = calculateDynamicRemainingStock('beef-cuts-1', 'wh-cairo', inventoryStock, oversellItems, catalog)
      assert.equal(negativeRemaining, -20)

      const negativeBadge = getRemainingStockBadge(negativeRemaining)
      assert.equal(negativeBadge.text, 'متاح: -20')
      assert.equal(negativeBadge.isNegative, true)
      assert.equal(negativeBadge.isZero, false)

      const zeroBadge = getRemainingStockBadge(0)
      assert.equal(zeroBadge.text, 'متاح: 0')
      assert.equal(zeroBadge.isNegative, false)
      assert.equal(zeroBadge.isZero, true)

      const positiveBadge = getRemainingStockBadge(10)
      assert.equal(positiveBadge.text, 'متاح: 10')
      assert.equal(positiveBadge.isNegative, false)
      assert.equal(positiveBadge.isZero, false)
    })

    it('enforces validation rules: blocks 0/empty values but strictly permits negative stock', () => {
      const resQtyZero = validateInvoiceItems([{ itemId: 'beef-cuts-1', quantity: 0, price: 2600 }], catalog)
      assert.equal(resQtyZero.isValid, false)
      assert.equal(resQtyZero.field, 'quantity')

      const resQtyEmpty = validateInvoiceItems([{ itemId: 'beef-cuts-1', quantity: '', price: 2600 }], catalog)
      assert.equal(resQtyEmpty.isValid, false)
      assert.equal(resQtyEmpty.field, 'quantity')

      const resPriceZero = validateInvoiceItems([{ itemId: 'beef-cuts-1', quantity: 5, price: 0 }], catalog)
      assert.equal(resPriceZero.isValid, false)
      assert.equal(resPriceZero.field, 'price')

      const resPriceEmpty = validateInvoiceItems([{ itemId: 'beef-cuts-1', quantity: 5, price: '' }], catalog)
      assert.equal(resPriceEmpty.isValid, false)
      assert.equal(resPriceEmpty.field, 'price')

      const resValidOversell = validateInvoiceItems([{ itemId: 'beef-cuts-1', quantity: 500, price: 2600 }], catalog)
      assert.equal(resValidOversell.isValid, true)
    })
  })

  describe('3. 12-Hour Timestamp Formatting & Timezone Midnight Boundaries', () => {
    it('accurately formats 12H clock boundaries: Midday, Midnight, 23:59, 01:00', () => {
      assert.equal(formatTime12H(new Date(2026, 10, 9, 12, 0, 0)), '12:00 PM')
      assert.equal(formatTime12H(new Date(2026, 10, 9, 0, 0, 0)), '12:00 AM')
      assert.equal(formatTime12H(new Date(2026, 10, 9, 23, 59, 0)), '11:59 PM')
      assert.equal(formatTime12H(new Date(2026, 10, 9, 1, 0, 0)), '01:00 AM')
      assert.equal(formatTime12H(new Date(2026, 10, 9, 13, 0, 0)), '01:00 PM')
      assert.equal(formatTime12H(new Date(2026, 10, 9, 0, 30, 0)), '12:30 AM')
      assert.equal(formatTime12H(new Date(2026, 10, 9, 12, 30, 0)), '12:30 PM')
    })

    it('formats date and time together cleanly using formatDateTime12H', () => {
      assert.equal(formatDateTime12H(new Date(2026, 10, 9, 15, 45, 0)), '2026-11-09 03:45 PM')
    })

    it('ensures local calendar day matching across UTC+2/UTC+3 timezone boundaries', () => {
      const todayStr = getLocalTodayStr()
      const parts = todayStr.split('-').map(Number)
      const localMidnightPlus5 = new Date(parts[0], parts[1] - 1, parts[2], 0, 5, 0)
      const invEarly = { id: 'inv-early-tz', date: todayStr, createdAt: localMidnightPlus5.toISOString() }
      assert.equal(matchesInvoiceTimeframe(invEarly, { timeframe: 'today' }), true)

      const localBeforeMidnight = new Date(parts[0], parts[1] - 1, parts[2], 23, 55, 0)
      const invLate = { id: 'inv-late-tz', date: todayStr, createdAt: localBeforeMidnight.toISOString() }
      assert.equal(matchesInvoiceTimeframe(invLate, { timeframe: 'today' }), true)

      const yesterday = new Date(parts[0], parts[1] - 1, parts[2] - 1, 23, 59, 0)
      const invYesterday = { id: 'inv-yest-tz', date: toLocalDateString(yesterday), createdAt: yesterday.toISOString() }
      assert.equal(matchesInvoiceTimeframe(invYesterday, { timeframe: 'today' }), false)
    })
  })
})
