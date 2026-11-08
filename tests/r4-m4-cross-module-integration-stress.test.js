import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
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
import {
  EXPENSE_COST_CENTER_TYPES,
  EXPENSE_PAYMENT_STATUSES,
  getCostCenterEntities,
  generateExpenseInstallments,
  createExpenseRecord,
  settleExpenseInstallment,
} from '../src/store/expenseStoreHelpers.js'
import {
  calculateEmployeeDailyRate,
  computeMonthlyPayrollStats,
  calculateEmployeeWage,
  executeEmployeePeriodSettlement,
  computeEmployeeCarriedBalance,
  saveStoredEmployeeDeduction,
} from '../src/store/employeeHelpers.js'
import { processInvoiceStoreState } from '../src/store/storeCacheHelper.js'

describe('Adversarial Cross-Module Integration Stress Harness (R1-R6)', () => {
  const masterItems = [
    { id: 'it-kofta', name: 'كفتة بقري متبلة', compositeName: 'كفتة بقري تجميد عالي', unitType: 'كرتونة', subUnitType: 'قطعة', piecesPerCarton: 20, weightPerCarton: 10, sellPrice: 1500, primaryCategory: 'مصنعات' },
    { id: 'it-burger', name: 'برجر بقري ممتاز', compositeName: 'برجر جامبو عائلي', unitType: 'كرتونة', subUnitType: 'كيس', piecesPerCarton: 12, weightPerCarton: 8, sellPrice: 1200, primaryCategory: 'مصنعات' },
    { id: 'it-liver', name: 'كبدة شرائح', compositeName: 'كبدة إسكندراني مجمدة', unitType: 'كرتونة', subUnitType: 'طبق', piecesPerCarton: 6, weightPerCarton: 6, sellPrice: 900, primaryCategory: 'كبده' },
  ]

  const masterWarehouses = [
    { id: 'wh-main-freezer', name: 'الثلاجة المركزية', type: 'cold_storage' },
    { id: 'van-gamma-01', name: 'سيارة جامبو جاما 1', type: 'van', plateNumber: 'ج م ا 1010', driverId: 'usr-driver-gamma', driverName: 'تامر إبراهيم', treasuryId: 'tr-van-gamma' },
  ]

  const masterTreasuries = [
    { id: 'tr-safe-cash', name: 'الخزينة المركزية', type: 'cash', balance: 50000 },
    { id: 'tr-bank-nbe', name: 'البنك الأهلي المصري', type: 'bank', balance: 200000 },
    { id: 'tr-instapay-01', name: 'إنستا باي التجاري', type: 'instapay', balance: 30000 },
    { id: 'tr-van-gamma', name: 'عهدة سيارة جاما 1', type: 'van_cash', balance: 0 },
  ]

  it('1. End-to-End Van Custody Loading, Driver Sales, Expense Deduction & Split Remittance', async () => {
    let inventoryStock = [
      { warehouseId: 'wh-main-freezer', itemId: 'it-kofta', quantity: 100, unit: 'كرتونة' },
      { warehouseId: 'wh-main-freezer', itemId: 'it-burger', quantity: 80, unit: 'كرتونة' },
    ]
    let state = { warehouses: masterWarehouses, items: masterItems, stockAudits: [], transfers: [], inventoryStock }
    const setState = (updater) => {
      state = typeof updater === 'function' ? updater(state) : { ...state, ...updater }
      inventoryStock = state.inventoryStock
    }

    const loadRes = await executeVanStockLoading({
      fromWarehouseId: 'wh-main-freezer',
      vanWarehouseId: 'van-gamma-01',
      items: [
        { itemId: 'it-kofta', rawQuantity: 15, selectedUnit: 'كرتونة' },
        { itemId: 'it-kofta', rawQuantity: 10, selectedUnit: 'قطعة' },
        { itemId: 'it-burger', rawQuantity: 36, selectedUnit: 'كيس' },
      ],
      operationalDate: '2026-11-09',
      userName: 'تامر إبراهيم',
    }, state, setState)

    assert.equal(loadRes.success, true)
    const vanKoftaStock = inventoryStock.find((s) => s.warehouseId === 'van-gamma-01' && s.itemId === 'it-kofta')
    const vanBurgerStock = inventoryStock.find((s) => s.warehouseId === 'van-gamma-01' && s.itemId === 'it-burger')
    const mainKoftaStock = inventoryStock.find((s) => s.warehouseId === 'wh-main-freezer' && s.itemId === 'it-kofta')
    const mainBurgerStock = inventoryStock.find((s) => s.warehouseId === 'wh-main-freezer' && s.itemId === 'it-burger')

    assert.equal(vanKoftaStock.quantity, 15.5)
    assert.equal(vanBurgerStock.quantity, 3.0)
    assert.equal(mainKoftaStock.quantity, 84.5)
    assert.equal(mainBurgerStock.quantity, 77.0)

    const breakdownKofta = calculateItemBreakdown(vanKoftaStock.quantity, masterItems[0])
    assert.equal(breakdownKofta.wholeCartons, 15)
    assert.equal(breakdownKofta.subUnits, 10)

    const driverInvoice1 = {
      id: 'inv-drv-101',
      type: 'sale',
      warehouseId: 'van-gamma-01',
      items: [
        { itemId: 'it-kofta', quantity: 5.5, unit: 'كرتونة' },
        { itemId: 'it-burger', quantity: 2.0, unit: 'كرتونة' },
      ],
    }

    const { inventoryStock: stockAfterSale1 } = processInvoiceStoreState({
      inventoryStock,
      items: masterItems,
      invoices: [],
      clients: [],
      suppliers: [],
      treasuryAccounts: masterTreasuries,
      cashTransactions: [],
    }, driverInvoice1)

    const vanKoftaAfterSale = stockAfterSale1.find((s) => s.warehouseId === 'van-gamma-01' && s.itemId === 'it-kofta')
    const vanBurgerAfterSale = stockAfterSale1.find((s) => s.warehouseId === 'van-gamma-01' && s.itemId === 'it-burger')
    assert.equal(vanKoftaAfterSale.quantity, 10.0)
    assert.equal(vanBurgerAfterSale.quantity, 1.0)

    let cashTxList = []
    let pendingTxList = []
    let treasuries = JSON.parse(JSON.stringify(masterTreasuries))

    const storeActions = {
      addCashTransaction: (tx) => {
        cashTxList.push(tx)
        treasuries = treasuries.map((t) => (t.id === tx.treasuryId ? { ...t, balance: t.balance - tx.amount } : t))
      },
      addPendingCashTransfer: (pct) => { pendingTxList.push(pct) },
      confirmCashTransfer: (id) => {
        const item = pendingTxList.find((p) => p.id === id)
        if (!item || item.status === 'confirmed') return
        item.status = 'confirmed'
        treasuries = treasuries.map((t) => {
          if (t.id === item.fromTreasuryId) return { ...t, balance: t.balance - item.amount }
          if (t.id === item.toTreasuryId) return { ...t, balance: t.balance + item.amount }
          return t
        })
      },
    }

    const settleState = { warehouses: masterWarehouses, items: masterItems, stockAudits: [], inventoryStock: stockAfterSale1 }
    const setSettleState = (updater) => {
      const next = typeof updater === 'function' ? updater(settleState) : updater
      if (next.inventoryStock) settleState.inventoryStock = next.inventoryStock
    }

    const settleRes = await executeVanSettlement({
      vanWarehouseId: 'van-gamma-01',
      driverId: 'usr-driver-gamma',
      driverName: 'تامر إبراهيم',
      vanName: 'سيارة جامبو جاما 1',
      settlementDate: '2026-11-09',
      grossCash: 15500,
      expenses: [
        { categoryId: 'exp-sec-trn-fuel', categoryName: 'وقود وسولار', amount: 800, notes: 'بنزينة السويس' },
        { categoryId: 'exp-sec-trn-tolls', categoryName: 'رسوم كارتة', amount: 200, notes: 'كارتة طريق السخنة' },
      ],
      revenue: {
        payments: [
          { destinationTreasuryId: 'tr-safe-cash', amount: 8000, method: 'cash' },
          { destinationTreasuryId: 'tr-bank-nbe', amount: 5000, method: 'transfer' },
          { destinationTreasuryId: 'tr-instapay-01', amount: 1500, method: 'instapay' },
        ],
      },
      stockSettlement: {
        action: 'return',
        targetWarehouseId: 'wh-main-freezer',
        items: [{ itemId: 'it-kofta', remainingQuantity: 8.0, unit: 'كرتونة' }],
      },
      vanTreasuryId: 'tr-van-gamma',
    }, storeActions, settleState, setSettleState)

    assert.equal(settleRes.success, true)
    assert.equal(settleRes.settlement.totalExpenses, 1000)
    assert.equal(settleRes.settlement.netRemitDue, 14500)
    assert.equal(settleRes.settlement.totalRemitted, 14500)
    assert.equal(settleRes.settlement.variance, 0)

    const finalSafeCash = treasuries.find((t) => t.id === 'tr-safe-cash')
    const finalBankNbe = treasuries.find((t) => t.id === 'tr-bank-nbe')
    const finalInstapay = treasuries.find((t) => t.id === 'tr-instapay-01')
    assert.equal(finalSafeCash.balance, 58000)
    assert.equal(finalBankNbe.balance, 205000)
    assert.equal(finalInstapay.balance, 31500)

    const finalMainKofta = settleState.inventoryStock.find((s) => s.warehouseId === 'wh-main-freezer' && s.itemId === 'it-kofta')
    const finalVanKofta = settleState.inventoryStock.find((s) => s.warehouseId === 'van-gamma-01' && s.itemId === 'it-kofta')
    assert.equal(finalMainKofta.quantity, 84.5 + 8.0)
    assert.equal(finalVanKofta.quantity, 2.0)
  })

  it('2. Multi-Tier Cost Center Expense Attribution with Deferred Installments Liquidation', async () => {
    let mockTreasuries = JSON.parse(JSON.stringify(masterTreasuries))
    let storeState = { treasuryAccounts: mockTreasuries, cashTransactions: [] }
    const setStoreState = (updater) => {
      storeState = typeof updater === 'function' ? updater(storeState) : { ...storeState, ...updater }
      mockTreasuries = storeState.treasuryAccounts
    }

    const warehouseEntities = getCostCenterEntities(EXPENSE_COST_CENTER_TYPES.WAREHOUSE, { warehouses: masterWarehouses })
    const vehicleEntities = getCostCenterEntities(EXPENSE_COST_CENTER_TYPES.VEHICLE, { warehouses: masterWarehouses })
    assert.equal(warehouseEntities.length, 1)
    assert.equal(warehouseEntities[0].id, 'wh-main-freezer')
    assert.equal(vehicleEntities.length, 1)
    assert.equal(vehicleEntities[0].id, 'van-gamma-01')

    const expensePayload = {
      totalAmount: 18000,
      costCenter: { entityType: 'warehouse', entityId: 'wh-main-freezer', entityName: 'الثلاجة المركزية' },
      mainCategoryId: 'exp-main-ops',
      mainCategoryName: 'مصاريف تشغيلية ولوجستية',
      subCategoryId: 'exp-sub-mnt',
      title: 'عمرة سنوية لضواغط التجميد',
      paymentType: 'partial',
      installmentCount: 3,
      payments: [
        { treasuryId: 'tr-safe-cash', amount: 3000, method: 'cash' },
        { treasuryId: 'tr-bank-nbe', amount: 6000, method: 'bank_transfer' },
      ],
    }

    const expRes = await createExpenseRecord(expensePayload, { storeState, setStoreState })
    assert.equal(expRes.success, true)
    assert.equal(expRes.expense.paidAmount, 9000)
    assert.equal(expRes.expense.remainingAmount, 9000)
    assert.equal(expRes.expense.paymentStatus, EXPENSE_PAYMENT_STATUSES.PARTIAL)
    assert.equal(expRes.expense.installments.length, 3)

    const installmentSum = expRes.expense.installments.reduce((acc, i) => acc + i.amount, 0)
    assert.equal(installmentSum, 9000)

    const safeCashAfterInitial = mockTreasuries.find((t) => t.id === 'tr-safe-cash')
    const bankNbeAfterInitial = mockTreasuries.find((t) => t.id === 'tr-bank-nbe')
    assert.equal(safeCashAfterInitial.balance, 47000)
    assert.equal(bankNbeAfterInitial.balance, 194000)

    const inst1 = expRes.expense.installments[0]
    const settleInst1 = await settleExpenseInstallment(
      expRes.expense.id,
      inst1.id,
      { treasuryId: 'tr-bank-nbe', treasuryName: 'البنك الأهلي المصري', method: 'bank_transfer' },
      { storeState, setStoreState }
    )
    assert.equal(settleInst1.success, true)
    assert.equal(settleInst1.expense.paidAmount, 12000)
    assert.equal(settleInst1.expense.remainingAmount, 6000)
    assert.equal(settleInst1.expense.paymentStatus, EXPENSE_PAYMENT_STATUSES.PARTIAL)

    const reSettleError = await settleExpenseInstallment(expRes.expense.id, inst1.id, {}, { storeState, setStoreState })
    assert.equal(reSettleError.success, false)
    assert.equal(reSettleError.error, 'هذا القسط مسدد بالفعل')

    const inst2 = settleInst1.expense.installments[1]
    const settleInst2 = await settleExpenseInstallment(
      expRes.expense.id,
      inst2.id,
      { treasuryId: 'tr-bank-nbe', treasuryName: 'البنك الأهلي المصري', method: 'bank_transfer' },
      { storeState, setStoreState }
    )
    assert.equal(settleInst2.success, true)

    const inst3 = settleInst2.expense.installments[2]
    const settleInst3 = await settleExpenseInstallment(
      expRes.expense.id,
      inst3.id,
      { treasuryId: 'tr-safe-cash', treasuryName: 'الخزينة المركزية', method: 'cash' },
      { storeState, setStoreState }
    )
    assert.equal(settleInst3.success, true)
    assert.equal(settleInst3.expense.paidAmount, 18000)
    assert.equal(settleInst3.expense.remainingAmount, 0)
    assert.equal(settleInst3.expense.paymentStatus, EXPENSE_PAYMENT_STATUSES.PAID)
  })

  it('3. Multi-Month HR Settlement, Disciplinary Deductions & Advance Negative Balances', async () => {
    const dailyEmployee = {
      id: 'emp-delta-daily',
      name: 'سامح فوزي',
      salaryType: 'daily',
      dailyRate: 250,
      department: 'التشفية والإنتاج',
    }

    const month1Attendance = [
      ...Array.from({ length: 20 }, (_, i) => ({
        employeeId: dailyEmployee.id,
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        status: 'present',
      })),
      { employeeId: dailyEmployee.id, date: '2026-08-21', status: 'half_day' },
      { employeeId: dailyEmployee.id, date: '2026-08-22', status: 'absent_excused' },
      { employeeId: dailyEmployee.id, date: '2026-08-23', status: 'holiday' },
      { employeeId: dailyEmployee.id, date: '2026-08-24', status: 'absent_unexcused' },
    ]

    const month1Deduction = {
      id: 'ded-m1-01',
      employeeId: dailyEmployee.id,
      amount: 250,
      targetMonth: '2026-08',
      type: 'financial_penalty',
      reason: 'عدم الالتزام بزي المعمل',
    }
    saveStoredEmployeeDeduction(month1Deduction)

    const month1Advance = {
      id: 'tx-adv-m1',
      partyType: 'employee',
      partyId: dailyEmployee.id,
      type: 'payroll',
      subType: 'advance',
      amount: 7000,
      date: '2026-08-15',
    }

    const statsM1 = computeMonthlyPayrollStats(
      dailyEmployee,
      month1Attendance,
      [month1Advance],
      '2026-08',
      [month1Deduction],
      []
    )

    const expectedEarnedM1 = (20 + 0.5) * 250
    assert.equal(statsM1.earnedSalary, expectedEarnedM1)
    assert.equal(statsM1.directDeductionAmount, 250)
    assert.equal(statsM1.advancesPaid, 7000)
    const expectedNetM1 = expectedEarnedM1 - 250 - 7000
    assert.equal(statsM1.netPayable, expectedNetM1)
    assert.equal(statsM1.netPayable, -2125)

    const settleM1 = await executeEmployeePeriodSettlement({
      employeeId: dailyEmployee.id,
      employeeName: dailyEmployee.name,
      settlementPeriod: '2026-08',
      grossWage: statsM1.earnedSalary,
      deductions: statsM1.totalDeductionAmount,
      advancesCleared: statsM1.advancesPaid,
      priorCarriedBalance: 0,
      netPayable: statsM1.netPayable,
      netPaidAmount: 0,
      settlementDate: '2026-08-31',
    })

    assert.equal(settleM1.success, true)
    assert.equal(settleM1.settlementRecord.closingBalance, -2125)

    const month2Attendance = Array.from({ length: 24 }, (_, i) => ({
      employeeId: dailyEmployee.id,
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      status: 'present',
    }))

    const allSettlementsM2 = [settleM1.settlementRecord]
    const carriedDebtIntoM2 = computeEmployeeCarriedBalance(dailyEmployee.id, '2026-09', allSettlementsM2)
    assert.equal(carriedDebtIntoM2, -2125)

    const statsM2 = computeMonthlyPayrollStats(
      dailyEmployee,
      month2Attendance,
      [],
      '2026-09',
      [],
      allSettlementsM2
    )

    assert.equal(statsM2.earnedSalary, 24 * 250)
    assert.equal(statsM2.priorCarriedBalance, -2125)
    assert.equal(statsM2.netPayable, 6000 - 2125)
    assert.equal(statsM2.netPayable, 3875)

    const settleM2 = await executeEmployeePeriodSettlement({
      employeeId: dailyEmployee.id,
      employeeName: dailyEmployee.name,
      settlementPeriod: '2026-09',
      grossWage: statsM2.earnedSalary,
      deductions: 0,
      advancesCleared: 0,
      priorCarriedBalance: -2125,
      netPayable: 3875,
      netPaidAmount: 2500,
      settlementDate: '2026-09-30',
    })

    assert.equal(settleM2.settlementRecord.closingBalance, 1375)

    const allSettlementsM3 = [settleM1.settlementRecord, settleM2.settlementRecord]
    const carriedCreditIntoM3 = computeEmployeeCarriedBalance(dailyEmployee.id, '2026-10', allSettlementsM3)
    assert.equal(carriedCreditIntoM3, 1375)

    const month3Attendance = Array.from({ length: 10 }, (_, i) => ({
      employeeId: dailyEmployee.id,
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      status: 'present',
    }))
    const month3Advance = {
      id: 'tx-adv-m3',
      partyType: 'employee',
      partyId: dailyEmployee.id,
      type: 'payroll',
      subType: 'advance',
      amount: 1000,
      date: '2026-10-05',
    }

    const statsM3 = computeMonthlyPayrollStats(
      dailyEmployee,
      month3Attendance,
      [month3Advance],
      '2026-10',
      [],
      allSettlementsM3
    )

    assert.equal(statsM3.earnedSalary, 10 * 250)
    assert.equal(statsM3.advancesPaid, 1000)
    assert.equal(statsM3.priorCarriedBalance, 1375)
    assert.equal(statsM3.netPayable, 2500 - 1000 + 1375)
    assert.equal(statsM3.netPayable, 2875)

    const settleM3 = await executeEmployeePeriodSettlement({
      employeeId: dailyEmployee.id,
      employeeName: dailyEmployee.name,
      settlementPeriod: '2026-10',
      grossWage: 2500,
      deductions: 0,
      advancesCleared: 1000,
      priorCarriedBalance: 1375,
      netPayable: 2875,
      netPaidAmount: 2875,
      settlementDate: '2026-10-31',
    })

    assert.equal(settleM3.settlementRecord.closingBalance, 0)
    const allSettlementsM4 = [...allSettlementsM3, settleM3.settlementRecord]
    const carriedIntoM4 = computeEmployeeCarriedBalance(dailyEmployee.id, '2026-11', allSettlementsM4)
    assert.equal(carriedIntoM4, 0)
  })

  it('4. Monte Carlo Fuzzing & Boundary Stress on Packaging & Fractional Equivalents', () => {
    for (let i = 0; i < 500; i++) {
      const piecesPerCarton = Math.floor(Math.random() * 30) + 1
      const wholePart = Math.floor(Math.random() * 50)
      const subPart = Math.floor(Math.random() * piecesPerCarton)
      const fractionalEquivalent = wholePart + subPart / piecesPerCarton

      const dummyItem = { unitType: 'كرتونة', subUnitType: 'قطعة', piecesPerCarton }
      const breakdown = calculateItemBreakdown(fractionalEquivalent, dummyItem)
      assert.equal(breakdown.wholeCartons, wholePart)
      assert.equal(breakdown.subUnits, subPart)
      assert.equal(Number(breakdown.totalCartons.toFixed(4)), Number(fractionalEquivalent.toFixed(4)))

      const reconverted = getCartonEquivalentQuantity(subPart, 'قطعة', dummyItem)
      assert.equal(Number(reconverted.toFixed(4)), Number((subPart / piecesPerCarton).toFixed(4)))
    }
  })

  it('5. Edge Case Stress on Zero-Activity Van Settlement & Daily Worker Zero Attendance', async () => {
    const zeroTotals = calculateSettlementTotals({ grossCash: 0, expenses: [], payments: [] })
    assert.equal(zeroTotals.grossCash, 0)
    assert.equal(zeroTotals.totalExpenses, 0)
    assert.equal(zeroTotals.netRemitDue, 0)
    assert.equal(zeroTotals.totalRemitted, 0)
    assert.equal(zeroTotals.variance, 0)

    const deficitTotals = calculateSettlementTotals({ grossCash: 200, expenses: [{ amount: 500 }], payments: [] })
    assert.equal(deficitTotals.totalExpenses, 500)
    assert.equal(deficitTotals.netRemitDue, 0)

    const dailyEmp = { id: 'emp-zero-att', name: 'عامل بدون حضور', salaryType: 'daily', dailyRate: 200 }
    const zeroStats = computeMonthlyPayrollStats(dailyEmp, [], [], '2026-11')
    assert.equal(zeroStats.earnedSalary, 0)
    assert.equal(zeroStats.netPayable, 0)
  })
})
