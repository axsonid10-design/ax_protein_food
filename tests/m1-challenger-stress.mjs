import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
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

async function runChallengerStressTests() {
  const results = {
    passed: [],
    failed: [],
    vulnerabilities: [],
  }

  console.log('====================================================')
  console.log('CHALLENGER M1: EMPIRICAL STRESS TEST HARNESS')
  console.log('====================================================\n')

  // -----------------------------------------------------------------
  // 1. VAN DAILY SETTLEMENT: FINANCIAL RECONCILIATION & EDGE CASES
  // -----------------------------------------------------------------
  console.log('--- TEST 1: Van Settlement Financial Edge Cases ---')

  // 1.1 Zero expenses settlement math
  try {
    const zeroExpTotals = calculateSettlementTotals({
      grossCash: 12000,
      expenses: [],
      payments: [{ amount: 12000, method: 'cash' }],
    })
    assert.strictEqual(zeroExpTotals.grossCash, 12000)
    assert.strictEqual(zeroExpTotals.totalExpenses, 0)
    assert.strictEqual(zeroExpTotals.netRemitDue, 12000)
    assert.strictEqual(zeroExpTotals.totalRemitted, 12000)
    assert.strictEqual(zeroExpTotals.variance, 0)
    results.passed.push('1.1 Zero expenses settlement totals calculated correctly')
  } catch (err) {
    results.failed.push({ test: '1.1 Zero expenses totals', error: err.message })
  }

  // 1.2 Multiple expense lines (fuel + tolls + repairs + porterage)
  try {
    const multiExpTotals = calculateSettlementTotals({
      grossCash: 25000,
      expenses: [
        { amount: 800, categoryName: 'وقود وسولار' },
        { amount: 250, categoryName: 'رسوم كارتات ومواقف' },
        { amount: 1500, categoryName: 'صيانة طارئة للكاوتش' },
        { amount: 450, categoryName: 'مشالات وتعتيق' },
      ],
      payments: [
        { amount: 12000, method: 'cash' },
        { amount: 8000, method: 'transfer' },
        { amount: 2000, method: 'instapay' },
      ],
    })
    assert.strictEqual(multiExpTotals.totalExpenses, 3000)
    assert.strictEqual(multiExpTotals.netRemitDue, 22000)
    assert.strictEqual(multiExpTotals.totalRemitted, 22000)
    assert.strictEqual(multiExpTotals.variance, 0)
    results.passed.push('1.2 Multiple expense lines + 3-way split remittance calculated correctly')
  } catch (err) {
    results.failed.push({ test: '1.2 Multi expense + 3-way split', error: err.message })
  }

  // 1.3 Unbalanced remittances vs variance (deficit & surplus)
  try {
    const deficitTotals = calculateSettlementTotals({
      grossCash: 10000,
      expenses: [{ amount: 1000, categoryName: 'وقود' }],
      payments: [{ amount: 7000, method: 'cash' }], // net due is 9000, remitted is 7000
    })
    assert.strictEqual(deficitTotals.netRemitDue, 9000)
    assert.strictEqual(deficitTotals.totalRemitted, 7000)
    assert.strictEqual(deficitTotals.variance, -2000, 'Variance should be -2000 for deficit')

    const surplusTotals = calculateSettlementTotals({
      grossCash: 10000,
      expenses: [{ amount: 1000, categoryName: 'وقود' }],
      payments: [{ amount: 9500, method: 'cash' }],
    })
    assert.strictEqual(surplusTotals.variance, 500, 'Variance should be +500 for surplus')
    results.passed.push('1.3 Unbalanced remittances correctly produce negative and positive variances')
  } catch (err) {
    results.failed.push({ test: '1.3 Variance calculations', error: err.message })
  }

  // 1.4 CRITICAL BUG: confirmCashTransfer with status: 'confirmed' in useAXStore
  try {
    let mockTreasuries = [
      { id: 'treasury-van', name: 'عهدة السيارة', type: 'van_cash', balance: 15000 },
      { id: 'treasury-main-safe', name: 'الخزينة المركزية', type: 'cash', balance: 50000 },
      { id: 'treasury-bank-nbe', name: 'البنك الأهلي', type: 'bank', balance: 100000 },
    ]
    let mockPendingTransfers = []

    // Simulate real useAXStore implementation from useAXStore.js (lines 442-470)
    const realStoreActions = {
      addCashTransaction: (tx) => {
        const isCashIn = tx.type === 'client_receipt' || tx.type === 'other_income' || tx.type === 'misc_revenue'
        mockTreasuries = mockTreasuries.map((t) =>
          t.id === tx.treasuryId
            ? { ...t, balance: (Number(t.balance) || 0) + (isCashIn ? tx.amount : -tx.amount) }
            : t
        )
      },
      addPendingCashTransfer: (pct) => {
        mockPendingTransfers = [pct, ...mockPendingTransfers]
      },
      confirmCashTransfer: (id) => {
        // EXACT CODE FROM useAXStore.js lines 448-456:
        const currentList = mockPendingTransfers
        const target = currentList.find((p) => p && p.id === id)
        if (!target || target.status === 'confirmed') return // <--- EARLY RETURN GUARD
        const newTransfers = currentList.map((p) =>
          p && p.id === id ? { ...p, status: 'confirmed', confirmedAt: new Date().toISOString() } : p
        )
        const updatedTreasuries = mockTreasuries.map((t) => {
          let bal = Number(t.balance) || 0
          if (t.id === target.fromTreasuryId) bal = Math.max(0, bal - Number(target.amount || 0))
          if (t.id === target.toTreasuryId) bal = bal + Number(target.amount || 0)
          return { ...t, balance: bal }
        })
        mockPendingTransfers = newTransfers
        mockTreasuries = updatedTreasuries
      },
    }

    const settleRes = await executeVanSettlement(
      {
        vanWarehouseId: 'van-01',
        vanTreasuryId: 'treasury-van',
        vanName: 'سيارة 1',
        grossCash: 15000,
        expenses: [{ categoryName: 'سولار', amount: 1000 }],
        revenue: {
          payments: [
            { destinationTreasuryId: 'treasury-main-safe', amount: 10000, method: 'cash' },
            { destinationTreasuryId: 'treasury-bank-nbe', amount: 4000, method: 'transfer' },
          ],
        },
        stockSettlement: { action: 'retain' },
      },
      realStoreActions,
      {},
      () => {}
    )

    const vanBal = mockTreasuries.find((t) => t.id === 'treasury-van').balance
    const mainBal = mockTreasuries.find((t) => t.id === 'treasury-main-safe').balance
    const bankBal = mockTreasuries.find((t) => t.id === 'treasury-bank-nbe').balance

    // The expense debited 1000 from van (15000 -> 14000).
    // But the 10000 cash transfer and 4000 bank transfer WERE NOT EXECUTED because pct.status was already 'confirmed'!
    if (vanBal === 14000 && mainBal === 50000 && bankBal === 100000) {
      results.vulnerabilities.push({
        id: 'VULN-M1-01',
        severity: 'CRITICAL',
        title: 'Settlement cash remittance blocked by useAXStore confirmCashTransfer guard',
        detail:
          'executeVanSettlement creates pending cash transfers with status="confirmed". When it calls confirmCashTransfer(id), useAXStore.js line 449 executes `if (!target || target.status === "confirmed") return state`. As a result, no balance transfer occurs in the real store: van cash is not remitted, and destination safe/bank accounts are not credited.',
        expected: 'Van balance: 0, Main safe: 60000, Bank: 104000',
        actual: `Van balance: ${vanBal}, Main safe: ${mainBal}, Bank: ${bankBal}`,
      })
    } else {
      results.passed.push('1.4 Remittances executed balance transfer correctly')
    }
  } catch (err) {
    results.failed.push({ test: '1.4 Real store remittance test', error: err.message })
  }

  // -----------------------------------------------------------------
  // 2. STOCK RETAIN VS RETURN: ATOMIC CUSTODY INTEGRITY
  // -----------------------------------------------------------------
  console.log('\n--- TEST 2: Stock Retain vs Return ---')

  const baseItems = [
    { id: 'it-kofta', compositeName: 'كفتة بقري', unitType: 'كرتونة', weightPerCarton: 10, sellPrice: 1500 },
    { id: 'it-burger', compositeName: 'برجر عائلي', unitType: 'كرتونة', weightPerCarton: 8, sellPrice: 1200 },
  ]
  const baseWarehouses = [
    { id: 'van-01', name: 'سيارة التوزيع 1', type: 'van' },
    { id: 'wh-central', name: 'الثلاجة المركزية', type: 'cold_store' },
  ]

  // 2.1 Action: retain leaves custody stock untouched
  try {
    let mockStock = [
      { warehouseId: 'van-01', itemId: 'it-kofta', quantity: 12, unit: 'كرتونة' },
      { warehouseId: 'wh-central', itemId: 'it-kofta', quantity: 30, unit: 'كرتونة' },
    ]
    const resRetain = await executeVanSettlement(
      {
        vanWarehouseId: 'van-01',
        grossCash: 1000,
        expenses: [],
        revenue: { payments: [] },
        stockSettlement: {
          action: 'retain',
          targetWarehouseId: 'wh-central',
          items: [{ itemId: 'it-kofta', quantity: 12 }],
        },
      },
      {},
      { warehouses: baseWarehouses, inventoryStock: mockStock, stockAudits: [] },
      (updater) => {
        const next = typeof updater === 'function' ? updater({ inventoryStock: mockStock }) : updater
        if (next.inventoryStock) mockStock = next.inventoryStock
      }
    )

    assert.strictEqual(resRetain.settlement.stockAction, 'retain')
    assert.strictEqual(resRetain.settlement.returnedItemsCount, 0)
    assert.strictEqual(mockStock.find((s) => s.warehouseId === 'van-01').quantity, 12)
    assert.strictEqual(mockStock.find((s) => s.warehouseId === 'wh-central').quantity, 30)
    results.passed.push('2.1 Action retain preserves custody stock on van untouched')
  } catch (err) {
    results.failed.push({ test: '2.1 Stock retain', error: err.message })
  }

  // 2.2 Action: return atomically moves stock back to warehouse
  try {
    let mockStock = [
      { warehouseId: 'van-01', itemId: 'it-kofta', quantity: 8, unit: 'كرتونة' },
      { warehouseId: 'wh-central', itemId: 'it-kofta', quantity: 20, unit: 'كرتونة' },
    ]
    const resReturn = await executeVanSettlement(
      {
        vanWarehouseId: 'van-01',
        settlementDate: '2026-11-09',
        grossCash: 1000,
        expenses: [],
        revenue: { payments: [] },
        stockSettlement: {
          action: 'return',
          targetWarehouseId: 'wh-central',
          items: [{ itemId: 'it-kofta', remainingQuantity: 8, quantity: 8, unit: 'كرتونة' }],
        },
      },
      {},
      { warehouses: baseWarehouses, inventoryStock: mockStock, stockAudits: [] },
      (updater) => {
        const next = typeof updater === 'function' ? updater({ inventoryStock: mockStock }) : updater
        if (next.inventoryStock) mockStock = next.inventoryStock
      }
    )

    assert.strictEqual(resReturn.settlement.stockAction, 'return')
    assert.strictEqual(resReturn.settlement.returnedItemsCount, 1)
    const vanKofta = mockStock.find((s) => s.warehouseId === 'van-01')
    const whKofta = mockStock.find((s) => s.warehouseId === 'wh-central')
    assert.strictEqual(vanKofta ? vanKofta.quantity : 0, 0)
    assert.strictEqual(whKofta.quantity, 28)
    results.passed.push('2.2 Action return atomically decrements van and increments warehouse stock')
  } catch (err) {
    results.failed.push({ test: '2.2 Stock return atomic', error: err.message })
  }

  // 2.3 Edge Case: Return action with missing targetWarehouseId silently ignored
  try {
    let mockStock = [
      { warehouseId: 'van-01', itemId: 'it-kofta', quantity: 8, unit: 'كرتونة' },
      { warehouseId: 'wh-central', itemId: 'it-kofta', quantity: 20, unit: 'كرتونة' },
    ]
    const resMissingTarget = await executeVanSettlement(
      {
        vanWarehouseId: 'van-01',
        settlementDate: '2026-11-09',
        grossCash: 1000,
        expenses: [],
        revenue: { payments: [] },
        stockSettlement: {
          action: 'return',
          targetWarehouseId: '', // EMPTY
          items: [{ itemId: 'it-kofta', remainingQuantity: 8, unit: 'كرتونة' }],
        },
      },
      {},
      { warehouses: baseWarehouses, inventoryStock: mockStock, stockAudits: [] },
      (updater) => {
        const next = typeof updater === 'function' ? updater({ inventoryStock: mockStock }) : updater
        if (next.inventoryStock) mockStock = next.inventoryStock
      }
    )

    // The settlement reports success, but returnedItemsCount is 0 and stock did not return
    if (resMissingTarget.success && resMissingTarget.settlement.returnedItemsCount === 0) {
      results.vulnerabilities.push({
        id: 'VULN-M1-02',
        severity: 'MEDIUM',
        title: 'Settlement modal allows submitting stock return without selecting destination warehouse',
        detail:
          'When stockAction is "return", AX_VanSettlementModal does not validate that returnWarehouseId is non-empty before calling executeVanSettlement. If returnWarehouseId is empty, executeVanSettlement silently skips stock transfer but returns success=true with returnedItemsCount=0, giving the user a false impression that stock was returned.',
        expected: 'Modal should validate returnWarehouseId or executeVanSettlement should return error',
        actual: 'Settlement succeeds silently with returnedItemsCount=0 and stock left on van',
      })
    }
  } catch (err) {
    results.failed.push({ test: '2.3 Missing targetWarehouseId validation', error: err.message })
  }

  // -----------------------------------------------------------------
  // 3. VEHICLE CREATION VALIDATION: AUDIT OF AX_AddVehicleModal.jsx
  // -----------------------------------------------------------------
  console.log('\n--- TEST 3: Vehicle Creation Validation Audit ---')

  const modalSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/distribution/AX_AddVehicleModal.jsx'),
    'utf-8'
  )

  // 3.1 Duplicate plate number validation
  const hasDuplicatePlateCheck =
    modalSource.includes('some((w) => w.plateNumber') ||
    modalSource.includes('find((w) => w.plateNumber') ||
    modalSource.includes('plateNumber ===') ||
    modalSource.includes('رقم اللوحة مسجل')

  if (!hasDuplicatePlateCheck) {
    results.vulnerabilities.push({
      id: 'VULN-M1-03',
      severity: 'HIGH',
      title: 'Vehicle creation modal lacks duplicate plate number check',
      detail:
        'AX_AddVehicleModal.jsx does not read warehouses from useAXStore and does not check whether the entered plateNumber already exists on an active distribution vehicle. Multiple vehicles with identical plate numbers can be created, leading to ambiguous vehicle assignment and reporting collisions.',
      expected: 'Validation preventing duplicate plateNumber across existing warehouses/vehicles',
      actual: 'Zero duplicate plateNumber validation in AX_AddVehicleModal.jsx',
    })
  } else {
    results.passed.push('3.1 Duplicate plate number validation present')
  }

  // 3.2 Missing driver validation
  const enforcesDriverSelection =
    modalSource.includes('!driverId') && modalSource.includes('يرجى اختيار السائق')

  if (!enforcesDriverSelection) {
    results.vulnerabilities.push({
      id: 'VULN-M1-04',
      severity: 'MEDIUM',
      title: 'Vehicle creation allows saving without linked driver user account',
      detail:
        'When creating a vehicle, selecting a driver is not mandatory. If omitted, driverId defaults to null and manager defaults to "مندوب التوزيع". Without driverId, user profiles cannot be linked to the vehicle, breaking requirement R1 ("Link driver user accounts to their assigned vehicle so sales auto-deduct").',
      expected: 'Mandatory driver selection or warning that auto-sales deduction requires linked driver',
      actual: 'Silently defaults driverId to null without warning',
    })
  } else {
    results.passed.push('3.2 Driver selection is strictly enforced')
  }

  // -----------------------------------------------------------------
  // 4. UI STATE REACTIVITY & MODAL PERSISTENCE RESIDUALS
  // -----------------------------------------------------------------
  console.log('\n--- TEST 4: Modal Props & State Reactivity ---')

  const distributionSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/distribution/AX_VanDistribution.jsx'),
    'utf-8'
  )
  const loadingModalSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/distribution/AX_VanStockLoadingModal.jsx'),
    'utf-8'
  )
  const settlementModalSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/distribution/AX_VanSettlementModal.jsx'),
    'utf-8'
  )

  // Check if modals are always rendered with isOpen instead of conditional rendering
  const unmountedLoadingModal = distributionSource.includes('{showLoadModal &&')
  const unmountedSettlementModal = distributionSource.includes('{showSettlementModal &&')

  // Check if modals reset their state on isOpen toggle or currentVan change
  const loadingModalHasResetEffect =
    loadingModalSource.includes('useEffect(() => {') &&
    loadingModalSource.includes('setCartEntries({})')
  const settlementModalHasResetEffect =
    settlementModalSource.includes('useEffect(() => {') &&
    settlementModalSource.includes('setExpenseRows([])')

  if (!unmountedSettlementModal && !settlementModalHasResetEffect) {
    results.vulnerabilities.push({
      id: 'VULN-M1-05',
      severity: 'HIGH',
      title: 'Stale settlement state persistence across van switches (UI state leakage)',
      detail:
        'AX_VanSettlementModal is continuously mounted in AX_VanDistribution.jsx without unmounting ({showSettlementModal && ...}). It returns null when closed, preserving its React fiber and hook state. Because it lacks a useEffect resetting expenseRows, cashRemitAmount, bankRemitAmount, and notes when isOpen closes or when currentVan.id changes, data entered for Van A contaminates Van B if the user cancels and switches tabs.',
      expected: 'Reset state on modal close or currentVan change, or conditionally mount modal',
      actual: 'State persists in memory across modal closes and tab changes',
    })
  } else {
    results.passed.push('4.1 Settlement modal cleans up state on close/van switch')
  }

  if (!unmountedLoadingModal && !loadingModalHasResetEffect) {
    results.vulnerabilities.push({
      id: 'VULN-M1-06',
      severity: 'HIGH',
      title: 'Stale stock loading cart entries persistence across van switches',
      detail:
        'AX_VanStockLoadingModal is continuously mounted and lacks a useEffect resetting cartEntries and unitSelections on close or van switch. Selecting quantities for Van 1, closing the modal, and opening it for Van 2 presents the user with the previously entered quantities for Van 1.',
      expected: 'Reset cartEntries and unitSelections on close or van switch',
      actual: 'cartEntries persists across van switches',
    })
  } else {
    results.passed.push('4.2 Loading modal cleans up cart entries on close/van switch')
  }

  // -----------------------------------------------------------------
  // SUMMARY REPORT
  // -----------------------------------------------------------------
  console.log('\n====================================================')
  console.log('STRESS TEST SUMMARY RESULTS')
  console.log('====================================================')
  console.log(`Passed checks: ${results.passed.length}`)
  console.log(`Failed checks: ${results.failed.length}`)
  console.log(`Confirmed Vulnerabilities: ${results.vulnerabilities.length}`)

  for (const p of results.passed) {
    console.log(`  [PASS] ${p}`)
  }
  for (const f of results.failed) {
    console.log(`  [FAIL] ${f.test}: ${f.error}`)
  }
  for (const v of results.vulnerabilities) {
    console.log(`\n  [VULNERABILITY] [${v.severity}] ${v.id}: ${v.title}`)
    console.log(`    Detail: ${v.detail}`)
    console.log(`    Expected: ${v.expected}`)
    console.log(`    Actual: ${v.actual}`)
  }

  return results
}

runChallengerStressTests()
