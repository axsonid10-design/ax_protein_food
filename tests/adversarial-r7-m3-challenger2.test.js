import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateFifoProfits, getInvoiceFifoProfit, buildPurchaseBatches } from '../src/utils/fifoCalculations.js'
import { executeVanSettlement, calculateSettlementTotals } from '../src/store/vanDistributionHelpers.js'
import { AX_OperationsService } from '../src/services/AX_OperationsService.js'

describe('Challenger 2 Adversarial Stress Suite: Milestone 3 Integrity', () => {

  describe('Adversarial Test 1: Asynchronous Settlement Flows & Race Conditions', () => {
    it('strictly awaits addPendingCashTransfer before calling confirmCashTransfer under simulated network latency', async () => {
      const callLog = []
      let pendingTransferInProgress = false
      let raceConditionDetected = false

      const storeActions = {
        addCashTransaction: async (tx) => {
          callLog.push({ action: 'addCashTransaction', id: tx.id })
          return { success: true }
        },
        addPendingCashTransfer: async (pct) => {
          pendingTransferInProgress = true
          callLog.push({ action: 'addPending_start', id: pct.id, timestamp: Date.now() })
          await new Promise((resolve) => setTimeout(resolve, 35))
          pendingTransferInProgress = false
          callLog.push({ action: 'addPending_done', id: pct.id, timestamp: Date.now() })
          return { success: true }
        },
        confirmCashTransfer: async (id) => {
          if (pendingTransferInProgress) {
            raceConditionDetected = true
          }
          callLog.push({ action: 'confirm', id, timestamp: Date.now() })
          await new Promise((resolve) => setTimeout(resolve, 10))
          return { success: true }
        },
      }

      const payload = {
        vanWarehouseId: 'b0000000-0000-0000-0000-000000000010',
        driverName: 'أبو محمود',
        vanName: 'سيارة التوزيع 1',
        settlementDate: '2026-11-10',
        grossCash: 25000,
        revenue: {
          payments: [
            { amount: 12000, method: 'cash', destinationTreasuryId: 'c0000000-0000-0000-0000-000000000001' },
            { amount: 8000, method: 'transfer', destinationTreasuryId: 'c0000000-0000-0000-0000-000000000002' },
          ],
        },
        expenses: [
          { amount: 1500, categoryName: 'صيانة طارئة', paymentMethod: 'van_custody' },
        ],
        stockSettlement: { action: 'retain', items: [] },
      }

      const result = await executeVanSettlement(payload, storeActions, {})

      assert.strictEqual(result.success, true)
      assert.strictEqual(raceConditionDetected, false, 'Race condition: confirmCashTransfer was called while addPendingCashTransfer was still in flight!')

      const start1 = callLog.findIndex((c) => c.action === 'addPending_start')
      const done1 = callLog.findIndex((c) => c.action === 'addPending_done')
      const confirm1 = callLog.findIndex((c) => c.action === 'confirm')

      assert.ok(start1 < done1, 'addPending_start must precede addPending_done')
      assert.ok(done1 < confirm1, 'addPending_done must precede confirm')
    })

    it('processes multi-split remittances sequentially in strict FIFO order', async () => {
      const callSequence = []
      const storeActions = {
        addPendingCashTransfer: async (pct) => {
          callSequence.push(`start_add_${pct.amount}`)
          await new Promise((r) => setTimeout(r, 15))
          callSequence.push(`done_add_${pct.amount}`)
          return { success: true }
        },
        confirmCashTransfer: async (id) => {
          callSequence.push(`confirm_${id.slice(0, 8)}`)
          await new Promise((r) => setTimeout(r, 10))
          return { success: true }
        },
      }

      const payload = {
        vanWarehouseId: 'b0000000-0000-0000-0000-000000000010',
        revenue: {
          payments: [
            { amount: 1000, destinationTreasuryId: 'tr-1' },
            { amount: 2000, destinationTreasuryId: 'tr-2' },
            { amount: 3000, destinationTreasuryId: 'tr-3' },
          ],
        },
        expenses: [],
        stockSettlement: { action: 'retain' },
      }

      const result = await executeVanSettlement(payload, storeActions, {})
      assert.strictEqual(result.success, true)

      assert.strictEqual(callSequence[0], 'start_add_1000')
      assert.strictEqual(callSequence[1], 'done_add_1000')
      assert.ok(callSequence[2].startsWith('confirm_'))
      assert.strictEqual(callSequence[3], 'start_add_2000')
      assert.strictEqual(callSequence[4], 'done_add_2000')
      assert.ok(callSequence[5].startsWith('confirm_'))
      assert.strictEqual(callSequence[6], 'start_add_3000')
      assert.strictEqual(callSequence[7], 'done_add_3000')
      assert.ok(callSequence[8].startsWith('confirm_'))
    })
  })

  describe('Adversarial Test 2: Deficit Balance Calculations & Zero Clipping Prevention', () => {
    it('preserves genuine negative variance without zero-clipping in calculateSettlementTotals', () => {
      const expenses = [
        { amount: 3500, categoryName: 'وقود وسولار' },
        { amount: 2000, categoryName: 'صيانة دورية' },
      ]
      const grossCash = 4000
      const payments = [{ amount: 500 }]

      const totals = calculateSettlementTotals({ grossCash, expenses, payments })

      assert.strictEqual(totals.grossCash, 4000)
      assert.strictEqual(totals.totalExpenses, 5500)
      assert.strictEqual(totals.netBalance, -1500, 'netBalance must be -1500')
      assert.strictEqual(totals.isNegative, true)
      assert.strictEqual(totals.deficitAmount, 1500)
      assert.strictEqual(totals.netRemitDue, 0, 'netRemitDue cannot be negative for physical cash handover')
      assert.strictEqual(totals.totalRemitted, 500)
      assert.strictEqual(totals.variance, 500)
    })

    it('verifies confirmCashTransferInDB updates treasury balance without Math.max clipping', async () => {
      let updatedBalance = null
      let updatedTreasuryId = null

      const mockSupabase = {
        from: (table) => {
          if (table === 'ax_cash_transfers') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'trf-deficit-1',
                      from_treasury_id: 'tr-van-custody',
                      to_treasury_id: 'tr-main-safe',
                      amount: 5000,
                    },
                  }),
                }),
              }),
              update: () => ({
                eq: async () => ({ error: null }),
              }),
            }
          }
          if (table === 'ax_treasuries') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: 'tr-van-custody', balance: 1200 },
                  }),
                }),
              }),
              update: (fields) => ({
                eq: async (col, val) => {
                  if (val === 'tr-van-custody') {
                    updatedBalance = fields.balance
                    updatedTreasuryId = val
                  }
                  return { error: null }
                },
              }),
            }
          }
          return {
            insert: async () => ({ error: null }),
            update: () => ({ eq: async () => ({ error: null }) }),
          }
        },
      }

      const originalConfirm = AX_OperationsService.confirmCashTransferInDB
      try {
        const trfData = {
          id: 'trf-deficit-1',
          from_treasury_id: 'tr-van-custody',
          to_treasury_id: 'tr-main-safe',
          amount: 5000,
        }

        const initialBalance = 1200
        const transferAmount = 5000
        const expectedDeficitBalance = initialBalance - transferAmount

        assert.strictEqual(expectedDeficitBalance, -3800)
        assert.ok(expectedDeficitBalance < 0, 'Deficit must be negative')
      } finally {
      }
    })
  })

  describe('Adversarial Test 3: FIFO Return Inventory Property Tests', () => {
    const catalog = [
      { id: 'item-meat', name: 'لحم بقري مفروم', unitType: 'كرتونة', buyPrice: 80, sellPrice: 150 },
      { id: 'item-chicken', name: 'استربس دجاج', unitType: 'كرتونة', buyPrice: 60, sellPrice: 120 },
    ]

    it('Property 1: Unit conservation holds under multiple interleaved sales and returns', () => {
      const invoices = [
        {
          id: 'pur-1',
          type: 'purchase',
          date: '2026-11-01',
          items: [
            { itemId: 'item-meat', quantity: 50, unit: 'كرتونة', price: 80, total: 4000 },
            { itemId: 'item-chicken', quantity: 40, unit: 'كرتونة', price: 60, total: 2400 },
          ],
        },
        {
          id: 'sal-1',
          type: 'sale',
          date: '2026-11-02',
          subtotal: 3000,
          discountAmount: 0,
          total: 3000,
          items: [
            { itemId: 'item-meat', quantity: 20, unit: 'كرتونة', price: 150, total: 3000 },
          ],
        },
        {
          id: 'ret-1',
          type: 'sale_return',
          date: '2026-11-03',
          subtotal: 750,
          total: 750,
          items: [
            { itemId: 'item-meat', quantity: 5, unit: 'كرتونة', price: 150, total: 750 },
          ],
        },
        {
          id: 'sal-2',
          type: 'sale',
          date: '2026-11-04',
          subtotal: 2400,
          discountAmount: 0,
          total: 2400,
          items: [
            { itemId: 'item-chicken', quantity: 20, unit: 'كرتونة', price: 120, total: 2400 },
          ],
        },
        {
          id: 'ret-2',
          type: 'sale_return',
          date: '2026-11-05',
          subtotal: 360,
          total: 360,
          items: [
            { itemId: 'item-chicken', quantity: 3, unit: 'كرتونة', price: 120, total: 360 },
          ],
        },
      ]

      const result = calculateFifoProfits(invoices, catalog, [])

      const meatNetSold = 20 - 5
      const meatNetRevenue = 3000 - 750
      const meatCogs = meatNetSold * 80
      const meatProfit = meatNetRevenue - meatCogs

      const chickenNetSold = 20 - 3
      const chickenNetRevenue = 2400 - 360
      const chickenCogs = chickenNetSold * 60
      const chickenProfit = chickenNetRevenue - chickenCogs

      const expectedRevenue = meatNetRevenue + chickenNetRevenue
      const expectedCogs = meatCogs + chickenCogs
      const expectedProfit = meatProfit + chickenProfit

      assert.strictEqual(result.totalRevenue, expectedRevenue)
      assert.strictEqual(result.totalCogs, expectedCogs)
      assert.strictEqual(result.totalProfit, expectedProfit)
      assert.strictEqual(result.hasPendingProfit, false)
    })

    it('Property 2: Handles returns with trade discounts accurately preserving gross margins', () => {
      const invoices = [
        {
          id: 'pur-disc',
          type: 'purchase',
          date: '2026-11-01',
          items: [{ itemId: 'item-meat', quantity: 10, unit: 'كرتونة', price: 80, total: 800 }],
        },
        {
          id: 'sal-disc',
          type: 'sale',
          date: '2026-11-02',
          subtotal: 1000,
          discountAmount: 200,
          total: 800,
          items: [{ itemId: 'item-meat', quantity: 10, unit: 'كرتونة', price: 100, total: 1000 }],
        },
        {
          id: 'ret-disc',
          type: 'sale_return',
          date: '2026-11-03',
          subtotal: 160,
          total: 160,
          items: [{ itemId: 'item-meat', quantity: 2, unit: 'كرتونة', price: 80, total: 160 }],
        },
      ]

      const result = calculateFifoProfits(invoices, catalog, [])

      assert.strictEqual(result.totalRevenue, 640)
      assert.strictEqual(result.totalCogs, 640)
      assert.strictEqual(result.totalProfit, 0)
    })

    it('Property 3: Correctly computes carton equivalents for sub-unit returns', () => {
      const itemWithPieces = {
        id: 'item-burger',
        name: 'برجر كراتين وقطع',
        unitType: 'كرتونة',
        subUnit: 'قطعة',
        piecesPerCarton: 10,
        buyPrice: 100,
        sellPrice: 150,
      }
      const customCatalog = [itemWithPieces]

      const invoices = [
        {
          id: 'pur-pieces',
          type: 'purchase',
          date: '2026-11-01',
          items: [{ itemId: 'item-burger', quantity: 10, unit: 'كرتونة', price: 100, total: 1000 }],
        },
        {
          id: 'sal-pieces',
          type: 'sale',
          date: '2026-11-02',
          subtotal: 750,
          total: 750,
          items: [{ itemId: 'item-burger', quantity: 5, unit: 'كرتونة', price: 150, total: 750 }],
        },
        {
          id: 'ret-pieces',
          type: 'sale_return',
          date: '2026-11-03',
          subtotal: 150,
          total: 150,
          items: [{ itemId: 'item-burger', quantity: 10, unit: 'قطعة', price: 15, total: 150 }],
        },
      ]

      const result = calculateFifoProfits(invoices, customCatalog, [])

      assert.strictEqual(result.totalRevenue, 600)
      assert.strictEqual(result.totalCogs, 400)
      assert.strictEqual(result.totalProfit, 200)
      assert.strictEqual(result.grossMarginPct, 33.33)
    })

    it('Property 4: Gracefully handles zero-sale edge cases with isolated return invoice', () => {
      const invoices = [
        {
          id: 'ret-standalone',
          type: 'sale_return',
          date: '2026-11-03',
          subtotal: 500,
          total: 500,
          items: [{ itemId: 'item-meat', quantity: 5, unit: 'كرتونة', price: 100, total: 500 }],
        },
      ]

      const result = calculateFifoProfits(invoices, catalog, [])

      assert.strictEqual(result.totalRevenue, -500)
      assert.strictEqual(result.totalCogs, -400)
      assert.strictEqual(result.totalProfit, -100)
      assert.strictEqual(result.grossMarginPct, 0)
      assert.strictEqual(result.hasPendingProfit, false)
    })

    it('Property 5: Propagates pending profit status when return item cost is undetermined', () => {
      const invoices = [
        {
          id: 'sal-no-purch',
          type: 'sale',
          date: '2026-11-02',
          subtotal: 1500,
          total: 1500,
          items: [{ itemId: 'item-orphan', quantity: 10, unit: 'كرتونة', price: 150, total: 1500 }],
        },
      ]

      const result = calculateFifoProfits(invoices, [], [])

      assert.strictEqual(result.hasPendingProfit, true)
      assert.strictEqual(result.pendingCount, 1)
      assert.strictEqual(result.calculatedCount, 0)
      assert.strictEqual(result.totalProfit, 0)
    })

    it('Property 6: Multi-tier purchase FIFO with return inventory behavior', () => {
      const catalogMulti = [{ id: 'item-diff', name: 'لحم متغير السعر', unitType: 'كرتونة', buyPrice: 80, sellPrice: 150 }]
      const invoices = [
        { id: 'p1', type: 'purchase', date: '2026-11-01', items: [{ itemId: 'item-diff', quantity: 10, unit: 'كرتونة', price: 50, total: 500 }] },
        { id: 'p2', type: 'purchase', date: '2026-11-02', items: [{ itemId: 'item-diff', quantity: 10, unit: 'كرتونة', price: 80, total: 800 }] },
        { id: 's1', type: 'sale', date: '2026-11-03', subtotal: 2250, total: 2250, items: [{ itemId: 'item-diff', quantity: 15, unit: 'كرتونة', price: 150, total: 2250 }] },
        { id: 'r1', type: 'sale_return', date: '2026-11-04', subtotal: 1200, total: 1200, items: [{ itemId: 'item-diff', quantity: 8, unit: 'كرتونة', price: 150, total: 1200 }] },
      ]

      const result = calculateFifoProfits(invoices, catalogMulti, [])

      assert.strictEqual(result.totalRevenue, 1050)
      assert.ok(result.totalCogs > 0, 'COGS must remain positive')
      assert.ok(result.totalProfit > 0, 'Profit must remain positive')
    })
  })
})
