import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  getVanWarehouses,
  getVanCashAccount,
  getCartonEquivalentQuantity,
  calculateItemBreakdown,
  calculateVanCustodyTotals,
  calculateSettlementTotals,
  executeVanStockLoading,
  executeVanSettlement,
} from '../src/store/vanDistributionHelpers.js'
import { processInvoiceStoreState } from '../src/store/storeCacheHelper.js'

describe('R1 & R2: Van Distribution & Settlement Engine Tests', () => {
  const sampleItems = [
    {
      id: 'it-meat-kofta',
      name: 'كفتة بقري متبلة',
      compositeName: 'كفتة بقري تجميد عالي',
      unitType: 'كرتونة',
      subUnitType: 'قطعة',
      piecesPerCarton: 20,
      weightPerCarton: 10,
      sellPrice: 1500,
      primaryCategory: 'مصنعات',
    },
    {
      id: 'it-meat-burger',
      name: 'برجر بقري ممتاز',
      compositeName: 'برجر جامبو عائلي',
      unitType: 'كرتونة',
      subUnitType: 'كيس',
      piecesPerCarton: 12,
      weightPerCarton: 8,
      sellPrice: 1200,
      primaryCategory: 'مصنعات',
    },
    {
      id: 'it-meat-liver',
      name: 'كبدة بقري شرائح',
      compositeName: 'كبدة إسكندراني مجمدة',
      unitType: 'كرتونة',
      subUnitType: 'طبق',
      piecesPerCarton: 6,
      weightPerCarton: 6,
      sellPrice: 900,
      primaryCategory: 'الكبده',
    },
    {
      id: 'it-solid-carton',
      name: 'لحم بقري مفروم خشن',
      compositeName: 'مفروم بقري كرتونة مصمتة',
      unitType: 'كرتونة',
      subUnitType: null,
      piecesPerCarton: 0,
      weightPerCarton: 15,
      sellPrice: 2000,
      primaryCategory: 'لحوم',
    },
  ]

  const sampleWarehouses = [
    {
      id: 'wh-central-cold',
      name: 'الثلاجة المركزية الرئيسية',
      type: 'cold_store',
      manager: 'أحمد سعيد',
    },
    {
      id: 'van-jumbo-01',
      name: 'سيارة شيفروليه جامبو 1',
      type: 'van',
      plateNumber: 'س ع ص 4821',
      model: 'شيفروليه تبريد 2024',
      manager: 'محمود كمال',
      driverName: 'محمود كمال',
      phone: '01011223344',
      driverId: 'usr-driver-mk',
      treasuryId: 'c0000000-0000-0000-0000-000000000005',
      status: 'active',
    },
  ]

  const sampleTreasuries = [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      name: 'الخزينة الرئيسية (الكاش المركزي)',
      type: 'cash',
      balance: 100000,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      name: 'الحساب البنكي (الأهلي المصري)',
      type: 'bank',
      balance: 250000,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000004',
      name: 'إنستا باي التجاري',
      type: 'instapay',
      balance: 40000,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000005',
      name: 'عهدة سيارة التوزيع (الكاش الميداني)',
      type: 'van_cash',
      balance: 15000,
    },
  ]

  describe('1. Vehicle Management & Treasury Custody', () => {
    it('accurately filters and normalizes distribution vehicles from warehouses', () => {
      const vans = getVanWarehouses(sampleWarehouses, [])
      assert.strictEqual(vans.length, 1)
      assert.strictEqual(vans[0].id, 'van-jumbo-01')
      assert.strictEqual(vans[0].plateNumber, 'س ع ص 4821')
      assert.strictEqual(vans[0].type, 'van')
      assert.strictEqual(vans[0].driverId, 'usr-driver-mk')
    })

    it('falls back to distributors or default vehicle when no warehouse vans exist', () => {
      const fallbackDistributors = [
        { id: 'dist-101', name: 'مندوب الإسكندرية', vanNumber: 'ط د ر 9911', phone: '01200000000' },
      ]
      const vansFromDist = getVanWarehouses([], fallbackDistributors)
      assert.strictEqual(vansFromDist.length, 1)
      assert.strictEqual(vansFromDist[0].plateNumber, 'ط د ر 9911')

      const vansEmpty = getVanWarehouses([], [])
      assert.strictEqual(vansEmpty.length, 1)
      assert.strictEqual(vansEmpty[0].type, 'van')
    })

    it('retrieves the dedicated van cash treasury account correctly', () => {
      const van = sampleWarehouses[1]
      const acc = getVanCashAccount(sampleTreasuries, van)
      assert.strictEqual(acc.id, 'c0000000-0000-0000-0000-000000000005')
      assert.strictEqual(acc.balance, 15000)
    })
  })

  describe('2. Packaging Breakdown & Fractional Calculations', () => {
    it('converts sub-units accurately to carton equivalents', () => {
      const kofta = sampleItems[0]
      assert.strictEqual(getCartonEquivalentQuantity(20, 'قطعة', kofta), 1.0)
      assert.strictEqual(getCartonEquivalentQuantity(10, 'قطعة', kofta), 0.5)
      assert.strictEqual(getCartonEquivalentQuantity(5, 'قطعة', kofta), 0.25)
      assert.strictEqual(getCartonEquivalentQuantity(3, 'كرتونة', kofta), 3.0)

      const burger = sampleItems[1]
      assert.strictEqual(getCartonEquivalentQuantity(6, 'كيس', burger), 0.5)

      const liver = sampleItems[2]
      assert.strictEqual(getCartonEquivalentQuantity(3, 'طبق', liver), 0.5)

      const solid = sampleItems[3]
      assert.strictEqual(getCartonEquivalentQuantity(2.5, 'كرتونة', solid), 2.5)
    })

    it('calculates item breakdown into whole cartons and remaining sub-units', () => {
      const kofta = sampleItems[0]
      const breakdown = calculateItemBreakdown(5.5, kofta)
      assert.strictEqual(breakdown.wholeCartons, 5)
      assert.strictEqual(breakdown.subUnits, 10)
      assert.strictEqual(breakdown.subUnitType, 'قطعة')
      assert.strictEqual(breakdown.totalCartons, 5.5)

      const solid = sampleItems[3]
      const breakdownSolid = calculateItemBreakdown(3.25, solid)
      assert.strictEqual(breakdownSolid.wholeCartons, 3.25)
      assert.strictEqual(breakdownSolid.subUnits, 0)
    })

    it('calculates vehicle custody inventory summary metrics accurately', () => {
      const custodyStock = [
        { warehouseId: 'van-jumbo-01', itemId: 'it-meat-kofta', quantity: 10 },
        { warehouseId: 'van-jumbo-01', itemId: 'it-meat-burger', quantity: 5.5 },
      ]
      const totals = calculateVanCustodyTotals(custodyStock, sampleItems)
      assert.strictEqual(totals.itemsCount, 2)
      assert.strictEqual(totals.totalCartons, 15.5)
      assert.strictEqual(totals.totalWeightKg, 10 * 10 + 5.5 * 8)
      assert.strictEqual(totals.totalValueEgp, 10 * 1500 + 5.5 * 1200)
    })
  })

  describe('3. Card-Based Stock Loading & Atomic Transfer', () => {
    it('executes atomic van stock loading from central warehouse to van custody', async () => {
      let state = {
        warehouses: sampleWarehouses,
        items: sampleItems,
        stockAudits: [],
        transfers: [],
        inventoryStock: [
          { warehouseId: 'wh-central-cold', itemId: 'it-meat-kofta', quantity: 50, unit: 'كرتونة' },
          { warehouseId: 'wh-central-cold', itemId: 'it-meat-burger', quantity: 40, unit: 'كرتونة' },
        ],
      }

      const setState = (updater) => {
        const next = typeof updater === 'function' ? updater(state) : updater
        state = { ...state, ...next }
      }

      const res = await executeVanStockLoading(
        {
          fromWarehouseId: 'wh-central-cold',
          vanWarehouseId: 'van-jumbo-01',
          items: [
            { itemId: 'it-meat-kofta', rawQuantity: 10, selectedUnit: 'كرتونة' },
            { itemId: 'it-meat-burger', rawQuantity: 12, selectedUnit: 'كيس' },
          ],
          operationalDate: '2026-11-08',
        },
        state,
        setState
      )

      assert.strictEqual(res.success, true)
      assert.strictEqual(state.transfers.length, 1)

      const centralKofta = state.inventoryStock.find(
        (s) => s.warehouseId === 'wh-central-cold' && s.itemId === 'it-meat-kofta'
      )
      const vanKofta = state.inventoryStock.find(
        (s) => s.warehouseId === 'van-jumbo-01' && s.itemId === 'it-meat-kofta'
      )
      assert.strictEqual(centralKofta.quantity, 40)
      assert.strictEqual(vanKofta.quantity, 10)

      const centralBurger = state.inventoryStock.find(
        (s) => s.warehouseId === 'wh-central-cold' && s.itemId === 'it-meat-burger'
      )
      const vanBurger = state.inventoryStock.find(
        (s) => s.warehouseId === 'van-jumbo-01' && s.itemId === 'it-meat-burger'
      )
      assert.strictEqual(centralBurger.quantity, 39)
      assert.strictEqual(vanBurger.quantity, 1.0)
    })
  })

  describe('4. Driver Linkage & Automatic Sales Deduction', () => {
    it('automatically deducts stock from assigned vehicle when driver records a sales invoice', () => {
      const driverProfile = {
        id: 'usr-driver-mk',
        name: 'محمود كمال',
        branchId: 'van-jumbo-01',
      }

      const initialStock = [
        { warehouseId: 'van-jumbo-01', itemId: 'it-meat-kofta', quantity: 15, unit: 'كرتونة' },
      ]

      const saleInvoice = {
        id: 'inv-driver-sale-1',
        type: 'sale',
        warehouseId: driverProfile.branchId,
        items: [
          { itemId: 'it-meat-kofta', quantity: 3, unit: 'كرتونة' },
        ],
      }

      const { inventoryStock: updatedStock } = processInvoiceStoreState(
        {
          inventoryStock: initialStock,
          items: sampleItems,
          invoices: [],
          clients: [],
          suppliers: [],
          treasuryAccounts: [],
          cashTransactions: [],
        },
        saleInvoice
      )

      const vanKofta = updatedStock.find(
        (s) => s.warehouseId === 'van-jumbo-01' && s.itemId === 'it-meat-kofta'
      )
      assert.strictEqual(vanKofta.quantity, 12)
    })
  })

  describe('5. Van Daily Settlement (Financial Split, Itemized Expenses, Stock Retain/Return)', () => {
    it('calculates settlement totals, expenses, net remittances, and variances', () => {
      const totals = calculateSettlementTotals({
        grossCash: 20000,
        expenses: [
          { amount: 500, categoryName: 'وقود وسولار' },
          { amount: 150, categoryName: 'رسوم كارتات ومواقف' },
        ],
        payments: [
          { amount: 10000, method: 'cash' },
          { amount: 9350, method: 'transfer' },
        ],
      })

      assert.strictEqual(totals.grossCash, 20000)
      assert.strictEqual(totals.totalExpenses, 650)
      assert.strictEqual(totals.netRemitDue, 19350)
      assert.strictEqual(totals.totalRemitted, 19350)
      assert.strictEqual(totals.variance, 0)
    })

    it('executes full settlement with itemized expenses, split remittance, and stock return', async () => {
      let cashTransactions = []
      let pendingTransfers = []
      let treasuryAccounts = [...sampleTreasuries]
      let inventoryStock = [
        { warehouseId: 'van-jumbo-01', itemId: 'it-meat-kofta', quantity: 4, unit: 'كرتونة' },
        { warehouseId: 'wh-central-cold', itemId: 'it-meat-kofta', quantity: 20, unit: 'كرتونة' },
      ]

      const storeActions = {
        addCashTransaction: (tx) => {
          cashTransactions.push(tx)
          treasuryAccounts = treasuryAccounts.map((t) =>
            t.id === tx.treasuryId ? { ...t, balance: t.balance - tx.amount } : t
          )
        },
        addPendingCashTransfer: (pct) => {
          pendingTransfers.push(pct)
        },
        confirmCashTransfer: (id) => {
          const target = pendingTransfers.find((p) => p && p.id === id)
          if (!target || target.status === 'confirmed') return
          target.status = 'confirmed'
          treasuryAccounts = treasuryAccounts.map((t) => {
            if (t.id === target.fromTreasuryId) return { ...t, balance: t.balance - target.amount }
            if (t.id === target.toTreasuryId) return { ...t, balance: t.balance + target.amount }
            return t
          })
        },
      }

      const storeState = {
        warehouses: sampleWarehouses,
        items: sampleItems,
        stockAudits: [],
        inventoryStock,
      }

      const setStoreState = (updater) => {
        const next = typeof updater === 'function' ? updater(storeState) : updater
        if (next.inventoryStock) inventoryStock = next.inventoryStock
      }

      const res = await executeVanSettlement(
        {
          vanWarehouseId: 'van-jumbo-01',
          driverId: 'usr-driver-mk',
          driverName: 'محمود كمال',
          vanName: 'سيارة شيفروليه جامبو 1',
          settlementDate: '2026-11-08',
          grossCash: 15000,
          expenses: [
            { categoryId: 'exp-sec-trn-fuel', categoryName: 'وقود وسولار', amount: 400, notes: 'سولار محطة طنطا' },
            { categoryId: 'exp-sec-trn-tolls', categoryName: 'كارتات طرق', amount: 100, notes: 'طريق المحلة' },
          ],
          revenue: {
            payments: [
              { destinationTreasuryId: 'c0000000-0000-0000-0000-000000000001', amount: 10000, method: 'cash' },
              { destinationTreasuryId: 'c0000000-0000-0000-0000-000000000002', amount: 4500, method: 'transfer' },
            ],
          },
          stockSettlement: {
            action: 'return',
            targetWarehouseId: 'wh-central-cold',
            items: [{ itemId: 'it-meat-kofta', remainingQuantity: 4, unit: 'كرتونة' }],
          },
          notes: 'تسوية يومية نموذجية خط الدلتا',
          vanTreasuryId: 'c0000000-0000-0000-0000-000000000005',
        },
        storeActions,
        storeState,
        setStoreState
      )

      assert.strictEqual(res.success, true)
      assert.strictEqual(res.settlement.totalExpenses, 500)
      assert.strictEqual(res.settlement.totalRemitted, 14500)
      assert.strictEqual(res.settlement.variance, 0)
      assert.strictEqual(cashTransactions.length, 2)
      assert.strictEqual(pendingTransfers.length, 2)

      const vanTreasury = treasuryAccounts.find((t) => t.id === 'c0000000-0000-0000-0000-000000000005')
      const centralCash = treasuryAccounts.find((t) => t.id === 'c0000000-0000-0000-0000-000000000001')
      const bankAcc = treasuryAccounts.find((t) => t.id === 'c0000000-0000-0000-0000-000000000002')

      assert.strictEqual(vanTreasury.balance, 0)
      assert.strictEqual(centralCash.balance, 110000)
      assert.strictEqual(bankAcc.balance, 254500)

      const returnedVanKofta = inventoryStock.find(
        (s) => s.warehouseId === 'van-jumbo-01' && s.itemId === 'it-meat-kofta'
      )
      const centralKoftaStock = inventoryStock.find(
        (s) => s.warehouseId === 'wh-central-cold' && s.itemId === 'it-meat-kofta'
      )
      assert.strictEqual(returnedVanKofta.quantity, 0)
      assert.strictEqual(centralKoftaStock.quantity, 24)
    })

    it('retains remaining stock on vehicle when retain option is selected', async () => {
      const storeActions = {
        addCashTransaction: () => {},
        addPendingCashTransfer: () => {},
        confirmCashTransfer: () => {},
      }
      const storeState = {
        warehouses: sampleWarehouses,
        items: sampleItems,
        stockAudits: [],
        inventoryStock: [
          { warehouseId: 'van-jumbo-01', itemId: 'it-meat-kofta', quantity: 5, unit: 'كرتونة' },
        ],
      }

      const res = await executeVanSettlement(
        {
          vanWarehouseId: 'van-jumbo-01',
          settlementDate: '2026-11-08',
          grossCash: 1000,
          expenses: [],
          revenue: { payments: [{ destinationTreasuryId: 'c0000000-0000-0000-0000-000000000001', amount: 1000, method: 'cash' }] },
          stockSettlement: { action: 'retain' },
        },
        storeActions,
        storeState
      )

      assert.strictEqual(res.success, true)
      assert.strictEqual(res.settlement.stockAction, 'retain')
      assert.strictEqual(res.settlement.returnedItemsCount, 0)
    })

    it('fails when stock return action is selected without specifying targetWarehouseId', async () => {
      const res = await executeVanSettlement(
        {
          vanWarehouseId: 'van-jumbo-01',
          settlementDate: '2026-11-08',
          grossCash: 1000,
          expenses: [],
          revenue: { payments: [] },
          stockSettlement: {
            action: 'return',
            targetWarehouseId: '',
            items: [{ itemId: 'it-meat-kofta', remainingQuantity: 5, unit: 'كرتونة' }],
          },
        },
        {},
        { warehouses: sampleWarehouses, inventoryStock: [] }
      )
      assert.strictEqual(res.success, false)
      assert.strictEqual(res.error, 'يرجى تحديد المخزن المستلم للبضاعة المرتجعة')
    })

    it('validates duplicate vehicle plate numbers and driver requirement', () => {
      const existingVans = sampleWarehouses.filter((w) => w.type === 'van')
      const isDuplicate = existingVans.some((v) => v.plateNumber?.trim() === 'س ع ص 4821')
      const isNonDuplicate = existingVans.some((v) => v.plateNumber?.trim() === 'د ط ك 9999')
      assert.strictEqual(isDuplicate, true)
      assert.strictEqual(isNonDuplicate, false)
      const hasDriver = Boolean(existingVans[0].driverId)
      assert.strictEqual(hasDriver, true)
    })
  })
})
