import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPurchaseBatches,
  calculateFifoProfits,
  getInvoiceFifoProfit,
  formatProfitStatus,
} from '../src/utils/fifoCalculations.js'

describe('R4: Purchase Cost Tracking & Sales Profit Calculation (FIFO)', () => {
  const mockCatalogItems = [
    {
      id: 'item-beef-1',
      name: 'لحم بقري مجمد سويدي',
      unitType: 'كرتونة',
      buyPrice: 1000,
      sellPrice: 1300,
      weightPerCarton: 20,
    },
    {
      id: 'item-chicken-2',
      name: 'دجاج مجمد برازيلي',
      unitType: 'كرتونة',
      piecesPerCarton: 10,
      subUnitType: 'قطعة',
      buyPrice: 600,
      sellPrice: 850,
    },
  ]

  describe('1. Multi-Price Purchase Batch Formulation', () => {
    test('builds distinct chronological cost batches for multiple purchases of same item', () => {
      const invoices = [
        {
          id: 'pur-1',
          code: 'PUR-001',
          type: 'purchase',
          date: '2026-11-01',
          items: [
            { itemId: 'item-beef-1', quantity: 10, unit: 'كرتونة', price: 1000, total: 10000 },
          ],
        },
        {
          id: 'pur-2',
          code: 'PUR-002',
          type: 'purchase',
          date: '2026-11-03',
          items: [
            { itemId: 'item-beef-1', quantity: 15, unit: 'كرتونة', price: 1100, total: 16500 },
          ],
        },
        {
          id: 'pur-3',
          code: 'PUR-003',
          type: 'purchase',
          date: '2026-11-05',
          items: [
            { itemId: 'item-beef-1', quantity: 20, unit: 'كرتونة', price: 1200, total: 24000 },
          ],
        },
      ]

      const batches = buildPurchaseBatches(invoices, mockCatalogItems, [])
      assert.equal(batches.length, 3)

      assert.equal(batches[0].invoiceId, 'pur-1')
      assert.equal(batches[0].unitCost, 1000)
      assert.equal(batches[0].initialQty, 10)
      assert.equal(batches[0].remainingQty, 10)
      assert.equal(batches[0].isCostUndetermined, false)

      assert.equal(batches[1].invoiceId, 'pur-2')
      assert.equal(batches[1].unitCost, 1100)
      assert.equal(batches[1].initialQty, 15)
      assert.equal(batches[1].remainingQty, 15)

      assert.equal(batches[2].invoiceId, 'pur-3')
      assert.equal(batches[2].unitCost, 1200)
      assert.equal(batches[2].initialQty, 20)
      assert.equal(batches[2].remainingQty, 20)
    })

    test('incorporates opening balance as the first chronological purchase batch', () => {
      const itemsWithOpening = [
        {
          ...mockCatalogItems[0],
          openingBalance: 5,
          openingDate: '2026-10-31',
          buyPrice: 950,
        },
      ]
      const invoices = [
        {
          id: 'pur-1',
          code: 'PUR-001',
          type: 'purchase',
          date: '2026-11-02',
          items: [
            { itemId: 'item-beef-1', quantity: 10, unit: 'كرتونة', price: 1000, total: 10000 },
          ],
        },
      ]

      const batches = buildPurchaseBatches(invoices, itemsWithOpening, [])
      assert.equal(batches.length, 2)
      assert.equal(batches[0].batchId, 'open-item-beef-1')
      assert.equal(batches[0].isOpening, true)
      assert.equal(batches[0].unitCost, 950)
      assert.equal(batches[0].remainingQty, 5)

      assert.equal(batches[1].invoiceId, 'pur-1')
      assert.equal(batches[1].unitCost, 1000)
    })
  })

  describe('2. FIFO Matching & Sales Profit Calculation', () => {
    test('depletes earliest purchase batches first (FIFO single batch)', () => {
      const invoices = [
        {
          id: 'pur-1',
          code: 'PUR-001',
          type: 'purchase',
          date: '2026-11-01',
          items: [{ itemId: 'item-beef-1', quantity: 10, unit: 'كرتونة', price: 1000, total: 10000 }],
        },
        {
          id: 'pur-2',
          code: 'PUR-002',
          type: 'purchase',
          date: '2026-11-03',
          items: [{ itemId: 'item-beef-1', quantity: 10, unit: 'كرتونة', price: 1200, total: 12000 }],
        },
        {
          id: 'sal-1',
          code: 'SAL-001',
          type: 'sale',
          date: '2026-11-02',
          subtotal: 5 * 1400,
          total: 5 * 1400,
          items: [{ itemId: 'item-beef-1', quantity: 5, unit: 'كرتونة', price: 1400, total: 7000 }],
        },
      ]

      const result = calculateFifoProfits(invoices, mockCatalogItems, [])
      const sal1 = result.salesProfits.get('sal-1')

      assert.ok(sal1)
      assert.equal(sal1.profitStatus, 'calculated')
      assert.equal(sal1.isProfitPending, false)
      assert.equal(sal1.cogs, 5 * 1000)
      assert.equal(sal1.profit, 7000 - 5000)
      assert.equal(sal1.profitMargin, Number(((2000 / 7000) * 100).toFixed(2)))
    })

    test('correctly calculates weighted COGS when a sale spans across multiple batches', () => {
      const invoices = [
        {
          id: 'pur-1',
          code: 'PUR-001',
          type: 'purchase',
          date: '2026-11-01',
          items: [{ itemId: 'item-beef-1', quantity: 10, unit: 'كرتونة', price: 1000, total: 10000 }],
        },
        {
          id: 'pur-2',
          code: 'PUR-002',
          type: 'purchase',
          date: '2026-11-03',
          items: [{ itemId: 'item-beef-1', quantity: 10, unit: 'كرتونة', price: 1200, total: 12000 }],
        },
        {
          id: 'sal-1',
          code: 'SAL-001',
          type: 'sale',
          date: '2026-11-04',
          subtotal: 15 * 1500,
          total: 15 * 1500,
          items: [{ itemId: 'item-beef-1', quantity: 15, unit: 'كرتونة', price: 1500, total: 22500 }],
        },
      ]

      const result = calculateFifoProfits(invoices, mockCatalogItems, [])
      const sal1 = result.salesProfits.get('sal-1')

      assert.ok(sal1)
      assert.equal(sal1.profitStatus, 'calculated')
      assert.equal(sal1.cogs, 10 * 1000 + 5 * 1200)
      assert.equal(sal1.profit, 22500 - 16000)
      assert.equal(sal1.profitMargin, Number(((6500 / 22500) * 100).toFixed(2)))
      assert.equal(sal1.lines[0].matchedBatches.length, 2)
      assert.equal(sal1.lines[0].matchedBatches[0].quantity, 10)
      assert.equal(sal1.lines[0].matchedBatches[0].unitCost, 1000)
      assert.equal(sal1.lines[0].matchedBatches[1].quantity, 5)
      assert.equal(sal1.lines[0].matchedBatches[1].unitCost, 1200)
    })
  })

  describe('3. Undetermined Purchase Cost & Safe Deferral ("قيد الاحتساب")', () => {
    test('safely flags profit as pending when purchase invoice has 0 or null price', () => {
      const invoices = [
        {
          id: 'pur-pending',
          code: 'PUR-PENDING',
          type: 'purchase',
          date: '2026-11-01',
          items: [{ itemId: 'item-beef-1', quantity: 10, unit: 'كرتونة', price: 0, total: 0 }],
        },
        {
          id: 'sal-1',
          code: 'SAL-001',
          type: 'sale',
          date: '2026-11-02',
          subtotal: 5 * 1500,
          total: 5 * 1500,
          items: [{ itemId: 'item-beef-1', quantity: 5, unit: 'كرتونة', price: 1500, total: 7500 }],
        },
      ]

      const result = calculateFifoProfits(invoices, mockCatalogItems, [])
      const sal1 = result.salesProfits.get('sal-1')

      assert.ok(sal1)
      assert.equal(sal1.profitStatus, 'pending')
      assert.equal(sal1.isProfitPending, true)
      assert.equal(sal1.cogs, null)
      assert.equal(sal1.profit, null)
      assert.equal(sal1.profitMargin, null)

      assert.equal(result.hasPendingProfit, true)
      assert.equal(result.pendingCount, 1)
      assert.equal(result.calculatedCount, 0)
      assert.equal(result.totalCogs, 0)
      assert.equal(result.totalProfit, 0)
      assert.equal(result.totalRevenue, 7500)
    })

    test('flags profit as pending when selling quantity exceeds available purchase batches (negative stock)', () => {
      const invoices = [
        {
          id: 'pur-1',
          code: 'PUR-001',
          type: 'purchase',
          date: '2026-11-01',
          items: [{ itemId: 'item-beef-1', quantity: 5, unit: 'كرتونة', price: 1000, total: 5000 }],
        },
        {
          id: 'sal-oversell',
          code: 'SAL-OVER',
          type: 'sale',
          date: '2026-11-02',
          subtotal: 10 * 1500,
          total: 10 * 1500,
          items: [{ itemId: 'item-beef-1', quantity: 10, unit: 'كرتونة', price: 1500, total: 15000 }],
        },
      ]

      const result = calculateFifoProfits(invoices, mockCatalogItems, [])
      const salOver = result.salesProfits.get('sal-oversell')

      assert.ok(salOver)
      assert.equal(salOver.profitStatus, 'pending')
      assert.equal(salOver.isProfitPending, true)
      assert.equal(salOver.cogs, null)
      assert.equal(salOver.profit, null)
      assert.equal(result.hasPendingProfit, true)
    })

    test('retroactive price update immediately switches status from pending to calculated', () => {
      const initialInvoices = [
        {
          id: 'pur-1',
          code: 'PUR-001',
          type: 'purchase',
          date: '2026-11-01',
          items: [{ itemId: 'item-beef-1', quantity: 10, unit: 'كرتونة', price: 0, total: 0 }],
        },
        {
          id: 'sal-1',
          code: 'SAL-001',
          type: 'sale',
          date: '2026-11-02',
          subtotal: 5 * 1400,
          total: 5 * 1400,
          items: [{ itemId: 'item-beef-1', quantity: 5, unit: 'كرتونة', price: 1400, total: 7000 }],
        },
      ]

      const initialResult = calculateFifoProfits(initialInvoices, mockCatalogItems, [])
      assert.equal(initialResult.salesProfits.get('sal-1').profitStatus, 'pending')

      const updatedInvoices = [
        {
          id: 'pur-1',
          code: 'PUR-001',
          type: 'purchase',
          date: '2026-11-01',
          items: [{ itemId: 'item-beef-1', quantity: 10, unit: 'كرتونة', price: 1050, total: 10500 }],
        },
        {
          id: 'sal-1',
          code: 'SAL-001',
          type: 'sale',
          date: '2026-11-02',
          subtotal: 5 * 1400,
          total: 5 * 1400,
          items: [{ itemId: 'item-beef-1', quantity: 5, unit: 'كرتونة', price: 1400, total: 7000 }],
        },
      ]

      const updatedResult = calculateFifoProfits(updatedInvoices, mockCatalogItems, [])
      const updatedSal1 = updatedResult.salesProfits.get('sal-1')

      assert.equal(updatedSal1.profitStatus, 'calculated')
      assert.equal(updatedSal1.cogs, 5 * 1050)
      assert.equal(updatedSal1.profit, 7000 - 5250)
      assert.equal(updatedResult.hasPendingProfit, false)
      assert.equal(updatedResult.totalProfit, 1750)
    })
  })

  describe('4. Formatting & Single Invoice Helper', () => {
    test('formatProfitStatus formats calculated profit with currency and pending as Arabic label', () => {
      assert.equal(formatProfitStatus(1750, 'calculated'), '1,750.00 ج.م')
      assert.equal(formatProfitStatus(null, 'pending'), 'قيد الاحتساب')
      assert.equal(formatProfitStatus(undefined, 'pending'), 'قيد الاحتساب')
      assert.equal(formatProfitStatus(NaN, 'pending'), 'قيد الاحتساب')
    })

    test('getInvoiceFifoProfit retrieves single invoice evaluation cleanly', () => {
      const invoices = [
        {
          id: 'pur-1',
          type: 'purchase',
          date: '2026-11-01',
          items: [{ itemId: 'item-beef-1', quantity: 10, unit: 'كرتونة', price: 1000, total: 10000 }],
        },
      ]
      const sale = {
        id: 'sal-new',
        type: 'sale',
        date: '2026-11-02',
        subtotal: 2 * 1400,
        total: 2 * 1400,
        items: [{ itemId: 'item-beef-1', quantity: 2, unit: 'كرتونة', price: 1400, total: 2800 }],
      }

      const fifo = getInvoiceFifoProfit(sale, invoices, mockCatalogItems, [])
      assert.equal(fifo.profitStatus, 'calculated')
      assert.equal(fifo.profit, 2800 - 2000)
      assert.equal(fifo.cogs, 2000)
    })
  })
})
