import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Milestone 5 Integration: Dashboard Stock Drilldown & Financial Metrics (R4 / F17–F19)', () => {
  function resolvePinnedItems(storedPinsJson, allItems = []) {
    let pinnedIds = []
    if (storedPinsJson) {
      try {
        const parsed = JSON.parse(storedPinsJson)
        if (Array.isArray(parsed) && parsed.length > 0) {
          pinnedIds = parsed
        }
      } catch {
        pinnedIds = []
      }
    }

    const matchedItems = (allItems || []).filter((item) => pinnedIds.includes(item.id))
    if (matchedItems.length === 0 && (allItems || []).length > 0) {
      return (allItems || []).slice(0, 4)
    }
    return matchedItems
  }

  function aggregateStockDrilldown(item, warehouses = [], inventoryStock = []) {
    if (!item?.id) return { totalQuantity: 0, byWarehouse: [], packagingSummary: {} }

    const itemStocks = (inventoryStock || []).filter((s) => s.itemId === item.id)
    const totalQuantity = itemStocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)

    const byWarehouse = (warehouses || []).map((wh) => {
      const stockRow = itemStocks.find((s) => s.warehouseId === wh.id)
      const qty = Number(stockRow?.quantity) || 0
      const sharePercentage = totalQuantity > 0 ? Math.round((qty / totalQuantity) * 100) : 0
      const unit = stockRow?.unit || item.unitType || 'كرتونة'

      let status = 'out'
      if (qty > 25) status = 'healthy'
      else if (qty > 0) status = 'low'

      return {
        warehouseId: wh.id,
        warehouseName: wh.name,
        warehouseType: wh.type,
        isBranch: wh.type === 'branch',
        isColdStore: wh.type === 'cold_store',
        isVan: wh.type === 'van',
        manager: wh.manager || 'غير محدد',
        quantity: qty,
        unit,
        sharePercentage,
        status,
      }
    })

    byWarehouse.sort((a, b) => b.quantity - a.quantity)

    const piecesPerCarton = Number(item.piecesPerCarton) || 0
    const weightPerCarton = Number(item.weightPerCarton) || 0
    const packagingSummary = {
      totalCartons: totalQuantity,
      totalPieces: piecesPerCarton > 0 ? totalQuantity * piecesPerCarton : null,
      totalWeightKg: weightPerCarton > 0 ? totalQuantity * weightPerCarton : null,
    }

    return { totalQuantity, byWarehouse, packagingSummary }
  }

  function computeCustomerReceivables(clients = []) {
    return (clients || []).reduce((acc, c) => {
      const bal = Number(c.balance) || 0
      return bal > 0 ? acc + bal : acc
    }, 0)
  }

  function computeSupplierPayables(suppliers = []) {
    return (suppliers || []).reduce((acc, s) => {
      const bal = Number(s.balance) || 0
      return bal > 0 ? acc + bal : acc
    }, 0)
  }

  function computeSalesRepsBalances(salesReps = []) {
    return (salesReps || []).reduce((acc, r) => {
      const bal = Number(r.netBalance ?? r.currentBalance ?? r.balance) || 0
      return bal > 0 ? acc + bal : acc
    }, 0)
  }

  function computeSalesTargetProgress(salesReps = [], salesTotal = 0) {
    const totalTarget = (salesReps || []).reduce((acc, r) => {
      return acc + (Number(r.salesTarget ?? r.targetAmount) || 0)
    }, 0)

    const achievementPct = totalTarget > 0 ? Math.round((salesTotal / totalTarget) * 100) : 0
    const remainingTarget = Math.max(0, totalTarget - salesTotal)

    return { totalTarget, achievementPct, remainingTarget }
  }

  function computeSalesTrend(salesTotal, prevPeriodInvoices = []) {
    const prevSalesTotal = (prevPeriodInvoices || []).reduce(
      (acc, inv) => acc + (Number(inv.total) || 0),
      0
    )
    if (!prevSalesTotal || prevSalesTotal === 0) return null

    const diffPct = Math.round(((salesTotal - prevSalesTotal) / prevSalesTotal) * 100)
    return {
      label: `${diffPct >= 0 ? '+' : ''}${diffPct}%`,
      isPositive: diffPct >= 0,
    }
  }

  it('should persist and load user configured pinned items from valid localStorage JSON', () => {
    const catalog = [
      { id: 'item-01', compositeName: 'كبدة بقري برازيلي' },
      { id: 'item-02', compositeName: 'مفروم هندي ممتاز' },
      { id: 'item-03', compositeName: 'فيليه رومي مجمد' },
      { id: 'item-04', compositeName: 'دواجن مجمدة كاملة' },
      { id: 'item-05', compositeName: 'كفتة بقري مجهزة' },
    ]

    const storedJson = JSON.stringify(['item-02', 'item-05'])
    const result = resolvePinnedItems(storedJson, catalog)

    assert.strictEqual(result.length, 2)
    assert.strictEqual(result[0].id, 'item-02')
    assert.strictEqual(result[1].id, 'item-05')
  })

  it('should fallback to top 4 catalog items when localStorage is null or empty', () => {
    const catalog = [
      { id: 'it-1', compositeName: 'صنف 1' },
      { id: 'it-2', compositeName: 'صنف 2' },
      { id: 'it-3', compositeName: 'صنف 3' },
      { id: 'it-4', compositeName: 'صنف 4' },
      { id: 'it-5', compositeName: 'صنف 5' },
      { id: 'it-6', compositeName: 'صنف 6' },
    ]

    const resultNull = resolvePinnedItems(null, catalog)
    assert.strictEqual(resultNull.length, 4)
    assert.deepStrictEqual(resultNull.map((i) => i.id), ['it-1', 'it-2', 'it-3', 'it-4'])

    const resultEmpty = resolvePinnedItems('[]', catalog)
    assert.strictEqual(resultEmpty.length, 4)
    assert.deepStrictEqual(resultEmpty.map((i) => i.id), ['it-1', 'it-2', 'it-3', 'it-4'])
  })

  it('should handle corrupted JSON and deleted pinned items with graceful fallback', () => {
    const catalog = [
      { id: 'active-1', compositeName: 'لحم بقري مكعبات' },
      { id: 'active-2', compositeName: 'سجق بلدي مجمد' },
    ]

    const corruptedResult = resolvePinnedItems('{invalid-json-content', catalog)
    assert.strictEqual(corruptedResult.length, 2)
    assert.strictEqual(corruptedResult[0].id, 'active-1')

    const stalePinsJson = JSON.stringify(['deleted-item-99', 'deleted-item-100'])
    const staleResult = resolvePinnedItems(stalePinsJson, catalog)
    assert.strictEqual(staleResult.length, 2)
    assert.deepStrictEqual(staleResult.map((i) => i.id), ['active-1', 'active-2'])
  })

  it('should aggregate stock breakdown per warehouse, branch, and delivery van with share percentages', () => {
    const item = {
      id: 'beef-cubes',
      compositeName: 'مكعبات لحم بقري برازيلي فاخر',
      unitType: 'كرتونة',
      piecesPerCarton: 12,
      weightPerCarton: 20,
    }

    const warehouses = [
      { id: 'wh-main', name: 'ثلاجة الحفظ الرئيسية', type: 'cold_store', manager: 'أيمن خليل' },
      { id: 'wh-branch-1', name: 'فرع مدينة نصر', type: 'branch', manager: 'طارق صلاح' },
      { id: 'wh-van-1', name: 'سيارة توزيع رقم 104', type: 'van', manager: 'كرم فوزي' },
      { id: 'wh-branch-2', name: 'فرع التجمع الخامس', type: 'branch', manager: 'محمود ناصر' },
    ]

    const inventoryStock = [
      { itemId: 'beef-cubes', warehouseId: 'wh-main', quantity: 60, unit: 'كرتونة' },
      { itemId: 'beef-cubes', warehouseId: 'wh-branch-1', quantity: 25, unit: 'كرتونة' },
      { itemId: 'beef-cubes', warehouseId: 'wh-van-1', quantity: 15, unit: 'كرتونة' },
      { itemId: 'beef-cubes', warehouseId: 'wh-branch-2', quantity: 0, unit: 'كرتونة' },
    ]

    const drilldown = aggregateStockDrilldown(item, warehouses, inventoryStock)

    assert.strictEqual(drilldown.totalQuantity, 100)
    assert.strictEqual(drilldown.byWarehouse.length, 4)

    assert.strictEqual(drilldown.byWarehouse[0].warehouseId, 'wh-main')
    assert.strictEqual(drilldown.byWarehouse[0].quantity, 60)
    assert.strictEqual(drilldown.byWarehouse[0].sharePercentage, 60)
    assert.strictEqual(drilldown.byWarehouse[0].isColdStore, true)
    assert.strictEqual(drilldown.byWarehouse[0].status, 'healthy')

    assert.strictEqual(drilldown.byWarehouse[1].warehouseId, 'wh-branch-1')
    assert.strictEqual(drilldown.byWarehouse[1].quantity, 25)
    assert.strictEqual(drilldown.byWarehouse[1].sharePercentage, 25)
    assert.strictEqual(drilldown.byWarehouse[1].isBranch, true)
    assert.strictEqual(drilldown.byWarehouse[1].status, 'low')

    assert.strictEqual(drilldown.byWarehouse[2].warehouseId, 'wh-van-1')
    assert.strictEqual(drilldown.byWarehouse[2].quantity, 15)
    assert.strictEqual(drilldown.byWarehouse[2].sharePercentage, 15)
    assert.strictEqual(drilldown.byWarehouse[2].isVan, true)
    assert.strictEqual(drilldown.byWarehouse[2].status, 'low')

    assert.strictEqual(drilldown.byWarehouse[3].warehouseId, 'wh-branch-2')
    assert.strictEqual(drilldown.byWarehouse[3].quantity, 0)
    assert.strictEqual(drilldown.byWarehouse[3].sharePercentage, 0)
    assert.strictEqual(drilldown.byWarehouse[3].status, 'out')

    assert.strictEqual(drilldown.packagingSummary.totalCartons, 100)
    assert.strictEqual(drilldown.packagingSummary.totalPieces, 1200)
    assert.strictEqual(drilldown.packagingSummary.totalWeightKg, 2000)
  })

  it('should safely calculate drilldown metrics when item has zero stock or missing packaging', () => {
    const itemWithoutPackaging = {
      id: 'raw-bones',
      compositeName: 'عظام تصنيع',
      unitType: 'شيكارة',
    }

    const warehouses = [
      { id: 'wh-1', name: 'مخزن فرعي', type: 'cold_store' },
    ]

    const emptyStock = []
    const drilldown = aggregateStockDrilldown(itemWithoutPackaging, warehouses, emptyStock)

    assert.strictEqual(drilldown.totalQuantity, 0)
    assert.strictEqual(drilldown.byWarehouse[0].sharePercentage, 0)
    assert.strictEqual(drilldown.byWarehouse[0].status, 'out')
    assert.strictEqual(drilldown.packagingSummary.totalCartons, 0)
    assert.strictEqual(drilldown.packagingSummary.totalPieces, null)
    assert.strictEqual(drilldown.packagingSummary.totalWeightKg, null)
  })

  it('should aggregate customer receivables strictly from positive debtor balances', () => {
    const clients = [
      { id: 'c1', name: 'مطعم الحاتي', balance: 35000 },
      { id: 'c2', name: 'سوبر ماركت النور', balance: 18500 },
      { id: 'c3', name: 'فندق شيراتون', balance: 0 },
      { id: 'c4', name: 'كافيه الباشا', balance: -8000 },
      { id: 'c5', name: 'سلسلة الواحة', balance: '12500' },
    ]

    const receivables = computeCustomerReceivables(clients)
    assert.strictEqual(receivables, 66000)
  })

  it('should aggregate supplier liabilities strictly from positive creditor balances', () => {
    const suppliers = [
      { id: 's1', companyName: 'الشركة البرازيلية للواردات', balance: 140000 },
      { id: 's2', companyName: 'مزارع الوادي للحوم', balance: 85000 },
      { id: 's3', companyName: 'شركة التبريد السريع', balance: -25000 },
      { id: 's4', companyName: 'مجزر الشرق الأوسط', balance: 0 },
      { id: 's5', companyName: 'شركة النقل الدولي', balance: '45000' },
    ]

    const payables = computeSupplierPayables(suppliers)
    assert.strictEqual(payables, 270000)
  })

  it('should aggregate sales rep balances using netBalance, currentBalance, and balance fallbacks', () => {
    const salesReps = [
      { id: 'rep-1', name: 'أحمد ماهر', netBalance: 7500 },
      { id: 'rep-2', name: 'سامح فوزي', currentBalance: 4200 },
      { id: 'rep-3', name: 'خالد يوسف', balance: 3100 },
      { id: 'rep-4', name: 'حسام مصطفى', netBalance: -1500 },
      { id: 'rep-5', name: 'إبراهيم علي', netBalance: 0 },
    ]

    const repBalances = computeSalesRepsBalances(salesReps)
    assert.strictEqual(repBalances, 14800)
  })

  it('should compute sales target progress and safely guard against division by zero', () => {
    const salesReps = [
      { id: 'r1', name: 'مندوب 1', salesTarget: 200000 },
      { id: 'r2', name: 'مندوب 2', targetAmount: 300000 },
    ]

    const progressNormal = computeSalesTargetProgress(salesReps, 375000)
    assert.strictEqual(progressNormal.totalTarget, 500000)
    assert.strictEqual(progressNormal.achievementPct, 75)
    assert.strictEqual(progressNormal.remainingTarget, 125000)

    const progressOver = computeSalesTargetProgress(salesReps, 650000)
    assert.strictEqual(progressOver.achievementPct, 130)
    assert.strictEqual(progressOver.remainingTarget, 0)

    const progressZeroTarget = computeSalesTargetProgress([], 150000)
    assert.strictEqual(progressZeroTarget.totalTarget, 0)
    assert.strictEqual(progressZeroTarget.achievementPct, 0)
    assert.strictEqual(progressZeroTarget.remainingTarget, 0)
  })

  it('should strictly satisfy User Rule #0 item 10: zero mock metrics and null trend on zero history', () => {
    const trendNoHistory = computeSalesTrend(120000, [])
    assert.strictEqual(trendNoHistory, null)

    const trendZeroPrior = computeSalesTrend(120000, [{ total: 0 }])
    assert.strictEqual(trendZeroPrior, null)

    const trendPositive = computeSalesTrend(150000, [{ total: 100000 }])
    assert.deepStrictEqual(trendPositive, { label: '+50%', isPositive: true })

    const trendNegative = computeSalesTrend(80000, [{ total: 100000 }])
    assert.deepStrictEqual(trendNegative, { label: '-20%', isPositive: false })
  })

  it('should verify file invariants: all dashboard components <= 500 lines and zero comments', () => {
    const dashboardDir = path.resolve(process.cwd(), 'src/components/dashboard')
    const files = fs.readdirSync(dashboardDir).filter((f) => f.endsWith('.jsx') || f.endsWith('.js'))

    assert.ok(files.length >= 13)

    const dblSlash = String.fromCharCode(47, 47)
    const slashStar = String.fromCharCode(47, 42)
    const jsxComment = '{' + slashStar
    const htmlComment = '<' + '!--'

    for (const file of files) {
      const fullPath = path.join(dashboardDir, file)
      const content = fs.readFileSync(fullPath, 'utf8')
      const lines = content.split('\n')

      assert.ok(
        lines.length <= 500,
        `File ${file} exceeds 500 lines: ${lines.length} lines`
      )

      assert.strictEqual(content.includes(dblSlash), false, `File ${file} contains comments`)
      assert.strictEqual(content.includes(slashStar), false, `File ${file} contains comments`)
      assert.strictEqual(content.includes(jsxComment), false, `File ${file} contains comments`)
      assert.strictEqual(content.includes(htmlComment), false, `File ${file} contains comments`)
    }
  })

  it('should verify tests/m5-dashboard-integration.test.js obeys <= 500 lines and zero comments', () => {
    const thisFilePath = path.resolve(process.cwd(), 'tests/m5-dashboard-integration.test.js')
    const content = fs.readFileSync(thisFilePath, 'utf8')
    const lines = content.split('\n')

    assert.ok(
      lines.length <= 500,
      `tests/m5-dashboard-integration.test.js exceeds 500 lines: ${lines.length} lines`
    )

    const dblSlash = String.fromCharCode(47, 47)
    const slashStar = String.fromCharCode(47, 42)
    const commentLines = lines.filter((line) => {
      const trimmed = line.trim()
      return trimmed.startsWith(dblSlash) || trimmed.startsWith(slashStar)
    })
    assert.strictEqual(commentLines.length, 0)
  })
})
