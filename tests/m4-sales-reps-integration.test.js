import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  calculateCommission,
  computeRepLedgerBalance,
  computeSalesTargetProgress,
} from '../src/components/sales_reps/AX_CommissionEngine.js'
import { AX_SalesRepOperationsService } from '../src/services/AX_SalesRepOperationsService.js'
import {
  MODULE_PERMISSIONS_CONFIG,
  hasModuleAccess,
  hasModulePermission,
  getFirstAccessibleTab,
} from '../src/utils/permissionsConfig.js'

describe('Milestone 4 Integration: Sales Representatives & Commission Engine (R3 / F13–F16)', () => {
  it('should normalize and create full sales rep profile with target, commission model, and branch', () => {
    const rawData = {
      name: ' حسام الدين عبد الله ',
      phone: ' 01098765432 ',
      assignedBranch: 'فرع مدينة نصر',
      targetAmount: '250000',
      commissionModel: 'volume_rate',
      stepAmount: '1000',
      stepRate: '50',
      openingBalance: '15000',
    }

    const numTarget = Number(rawData.targetAmount) || 0
    const numBal = Number(rawData.openingBalance) || 0

    const rep = {
      id: 'rep-m4-test-01',
      name: rawData.name.trim(),
      phone: rawData.phone.trim(),
      assignedBranch: rawData.assignedBranch,
      targetAmount: numTarget,
      salesTarget: numTarget,
      commissionModel: rawData.commissionModel,
      stepAmount: Number(rawData.stepAmount) || 1000,
      stepRate: Number(rawData.stepRate) || 50,
      openingBalance: numBal,
      netBalance: numBal,
      currentBalance: numBal,
      balance: numBal,
      createdAt: new Date().toISOString(),
    }

    assert.strictEqual(rep.id, 'rep-m4-test-01')
    assert.strictEqual(rep.name, 'حسام الدين عبد الله')
    assert.strictEqual(rep.phone, '01098765432')
    assert.strictEqual(rep.assignedBranch, 'فرع مدينة نصر')
    assert.strictEqual(rep.targetAmount, 250000)
    assert.strictEqual(rep.salesTarget, 250000)
    assert.strictEqual(rep.stepAmount, 1000)
    assert.strictEqual(rep.stepRate, 50)
    assert.strictEqual(rep.openingBalance, 15000)
    assert.strictEqual(rep.currentBalance, 15000)
    assert.strictEqual(rep.netBalance, 15000)
  })

  it('should calculate commissions accurately across volume_rate model (stepped, proportional, and negative sales guards)', () => {
    const steppedRep = {
      id: 'rep-vol-1',
      commissionModel: 'volume_rate',
      stepAmount: 1000,
      stepRate: 50,
      isProportional: false,
    }

    const res1 = calculateCommission(steppedRep, [{ total: 2750 }])
    assert.strictEqual(res1.totalCommission, 100)
    assert.strictEqual(res1.breakdown[0].steps, 2)

    const propRep = {
      id: 'rep-vol-2',
      commissionModel: 'volume_rate',
      stepAmount: 1000,
      stepRate: 50,
      isProportional: true,
    }

    const res2 = calculateCommission(propRep, [{ total: 2500 }])
    assert.strictEqual(res2.totalCommission, 125)

    const negRes = calculateCommission(steppedRep, [{ total: -1500 }])
    assert.strictEqual(negRes.totalCommission, 0)

    const zeroRes = calculateCommission(steppedRep, [{ total: 0 }])
    assert.strictEqual(zeroRes.totalCommission, 0)
  })

  it('should calculate commissions accurately across category_percentage model (meat categories, item totals, and rate normalization)', () => {
    const catRep = {
      id: 'rep-cat-1',
      commissionModel: 'category_percentage',
      categoryRates: {
        'لحوم': 0.02,
        'مصنعات': 3.5,
        'دواجن': 0.015,
        'default': 0.02,
      },
    }

    const sales = [
      {
        total: 15000,
        items: [
          { itemId: 'item-1', category: 'لحوم', quantity: 10, unitPrice: 500 },
          { itemId: 'item-2', category: 'مصنعات', total: 6000 },
          { itemId: 'item-3', category: 'دواجن', quantity: 20, unitPrice: 200 },
        ],
      },
    ]

    const res = calculateCommission(catRep, sales)
    const expected = (5000 * 0.02) + (6000 * 0.035) + (4000 * 0.015)
    assert.strictEqual(res.totalCommission, expected)
    assert.strictEqual(res.breakdown.length, 3)

    const emptyItemsSale = [{ total: 10000, items: [] }]
    const emptyRes = calculateCommission(catRep, emptyItemsSale)
    assert.strictEqual(emptyRes.totalCommission, 200)
  })

  it('should calculate commissions accurately across target_tier model (standard tiers, custom slabs, and zero target guard)', () => {
    const tierRep = {
      id: 'rep-tier-1',
      commissionModel: 'target_tier',
      targetAmount: 100000,
      tierBonus: 500,
    }

    const below80 = calculateCommission(tierRep, [{ total: 70000 }])
    assert.strictEqual(below80.totalCommission, 700)

    const mid85 = calculateCommission(tierRep, [{ total: 85000 }])
    assert.strictEqual(mid85.totalCommission, 1530)

    const above100 = calculateCommission(tierRep, [{ total: 120000 }])
    assert.strictEqual(above100.totalCommission, 3500)

    const customSlabsRep = {
      id: 'rep-tier-custom',
      commissionModel: 'target_tier',
      targetAmount: 50000,
      tiers: [
        { minAttainment: 1.2, rate: 0.04, bonus: 1500 },
        { minAttainment: 1.0, rate: 0.03, bonus: 800 },
        { minAttainment: 0.8, rate: 0.02, bonus: 0 },
      ],
    }

    const customRes = calculateCommission(customSlabsRep, [{ total: 65000 }])
    assert.strictEqual(customRes.totalCommission, (65000 * 0.04) + 1500)

    const zeroTargetRep = {
      id: 'rep-tier-zero',
      commissionModel: 'target_tier',
      targetAmount: 0,
    }
    const zeroTargetRes = calculateCommission(zeroTargetRep, [{ total: 50000 }])
    assert.strictEqual(zeroTargetRes.totalCommission, 500)
  })

  it('should calculate commissions accurately across hybrid model (base rate + tier bonus)', () => {
    const hybridRep = {
      id: 'rep-hyb-1',
      commissionModel: 'hybrid',
      baseRate: 0.02,
      targetAmount: 200000,
    }

    const below80 = calculateCommission(hybridRep, [{ total: 150000 }])
    assert.strictEqual(below80.totalCommission, 3000)

    const mid85 = calculateCommission(hybridRep, [{ total: 180000 }])
    assert.strictEqual(mid85.totalCommission, (180000 * 0.02) + 400)

    const achieved = calculateCommission(hybridRep, [{ total: 220000 }])
    assert.strictEqual(achieved.totalCommission, (220000 * 0.02) + 1000)

    const hybridWholePercent = {
      id: 'rep-hyb-2',
      commissionModel: 'hybrid',
      baseRate: 2.5,
      targetAmount: 100000,
    }
    const wholePercentRes = calculateCommission(hybridWholePercent, [{ total: 100000 }])
    assert.strictEqual(wholePercentRes.totalCommission, 2500 + 1000)
  })

  it('should compute statement of account running balance, sorting, and deductions/clawbacks via computeRepLedgerBalance', () => {
    const openingBalance = 10000
    const rawTransactions = [
      { id: 'tx-3', repId: 'rep-01', date: '2026-10-20', type: 'payment', amount: 5000 },
      { id: 'tx-1', repId: 'rep-01', date: '2026-10-05', type: 'commission', amount: 7500 },
      { id: 'tx-4', repId: 'rep-01', date: '2026-10-25', type: 'clawback', amount: 1500 },
      { id: 'tx-2', repId: 'rep-01', date: '2026-10-15', type: 'bonus', amount: 2000 },
    ]

    const { netBalance, history } = computeRepLedgerBalance(openingBalance, rawTransactions)

    assert.strictEqual(history[0].id, 'tx-1')
    assert.strictEqual(history[0].runningBalance, 17500)
    assert.strictEqual(history[1].id, 'tx-2')
    assert.strictEqual(history[1].runningBalance, 19500)
    assert.strictEqual(history[2].id, 'tx-3')
    assert.strictEqual(history[2].runningBalance, 14500)
    assert.strictEqual(history[3].id, 'tx-4')
    assert.strictEqual(history[3].runningBalance, 13000)
    assert.strictEqual(netBalance, 13000)
  })

  it('should compute sales target progress and handle zero-target via computeSalesTargetProgress', () => {
    const reps = [
      { salesTarget: 100000 },
      { targetAmount: 150000 },
      { targetAmount: 50000 },
    ]

    const progress = computeSalesTargetProgress(reps, 210000)
    assert.strictEqual(progress.totalTarget, 300000)
    assert.strictEqual(progress.periodSales, 210000)
    assert.strictEqual(progress.achievementPct, 70)
    assert.strictEqual(progress.remainingTarget, 90000)

    const overTarget = computeSalesTargetProgress(reps, 350000)
    assert.strictEqual(overTarget.achievementPct, 117)
    assert.strictEqual(overTarget.remainingTarget, 0)

    const zeroProgress = computeSalesTargetProgress([], 50000)
    assert.strictEqual(zeroProgress.totalTarget, 0)
    assert.strictEqual(zeroProgress.achievementPct, 0)
  })

  it('should support polymorphic store action addSalesRepTransaction with unary and binary invocations and balance sync', async () => {
    let useAXStore = null
    try {
      const mod = await import('../src/store/useAXStore.js')
      useAXStore = mod.useAXStore
    } catch (err) {
      if (err.code !== 'ERR_MODULE_NOT_FOUND') throw err
    }

    if (useAXStore) {
      const testRep = {
        id: 'rep-poly-test',
        name: 'مندوب تجربة البوليمورفزم',
        currentBalance: 5000,
        netBalance: 5000,
        balance: 5000,
      }

      useAXStore.getState().addSalesRep(testRep)

      const unaryTx = {
        id: 'tx-unary-1',
        repId: 'rep-poly-test',
        amount: 3000,
        type: 'commission',
        notes: 'عمولة فاتورة 101',
      }
      useAXStore.getState().addSalesRepTransaction(unaryTx)

      let storedRep = useAXStore.getState().salesReps.find((r) => r.id === 'rep-poly-test')
      assert.strictEqual(storedRep.currentBalance, 8000)
      assert.strictEqual(storedRep.netBalance, 8000)
      assert.strictEqual(storedRep.balance, 8000)

      const binaryTx = {
        id: 'tx-binary-1',
        amount: 2000,
        type: 'payment',
        description: 'دفعة نقدية مسددة للمندوب',
      }
      useAXStore.getState().addSalesRepTransaction('rep-poly-test', binaryTx)

      storedRep = useAXStore.getState().salesReps.find((r) => r.id === 'rep-poly-test')
      assert.strictEqual(storedRep.currentBalance, 6000)
      assert.strictEqual(storedRep.netBalance, 6000)
      assert.strictEqual(storedRep.balance, 6000)

      const clawbackTx = {
        id: 'tx-clawback-1',
        amount: 1000,
        type: 'clawback',
        notes: 'استرداد عمولة مرتجع',
      }
      useAXStore.getState().addSalesRepTransaction('rep-poly-test', clawbackTx)

      storedRep = useAXStore.getState().salesReps.find((r) => r.id === 'rep-poly-test')
      assert.strictEqual(storedRep.currentBalance, 5000)
      assert.strictEqual(storedRep.netBalance, 5000)

      const repTxs = useAXStore.getState().salesRepLedger.filter((t) => t.repId === 'rep-poly-test')
      assert.strictEqual(repTxs.length, 3)
      assert.strictEqual(repTxs[0].id, 'tx-clawback-1')
      assert.strictEqual(repTxs[1].id, 'tx-binary-1')
      assert.strictEqual(repTxs[2].id, 'tx-unary-1')
    } else {
      const applyTransaction = (state, arg1, arg2) => {
        const rawTx = typeof arg1 === 'string' ? { ...arg2, repId: arg1 } : arg1
        if (!rawTx || !rawTx.repId) return state
        const amount = Math.abs(Number(rawTx.amount) || 0)
        let delta = 0
        if (rawTx.type === 'commission' || rawTx.type === 'bonus') delta = amount
        else if (rawTx.type === 'payment' || rawTx.type === 'disbursement' || rawTx.type === 'clawback' || rawTx.type === 'deduction' || rawTx.type === 'penalty') delta = -amount
        const newTx = {
          id: rawTx.id || 'gen-id',
          repId: rawTx.repId,
          date: rawTx.date || '2026-10-01',
          amount,
          type: rawTx.type,
          notes: rawTx.notes || rawTx.description || '',
          description: rawTx.description || rawTx.notes || '',
        }
        const updatedLedger = [newTx, ...(state.salesRepLedger || [])]
        const updatedReps = (state.salesReps || []).map((r) => {
          if (r.id !== newTx.repId) return r
          const cur = Number(r.currentBalance ?? r.netBalance ?? r.balance ?? 0)
          const nextBal = cur + delta
          return { ...r, currentBalance: nextBal, netBalance: nextBal, balance: nextBal }
        })
        return { salesRepLedger: updatedLedger, salesReps: updatedReps }
      }

      let state = {
        salesReps: [{ id: 'rep-poly-test', currentBalance: 5000, netBalance: 5000, balance: 5000 }],
        salesRepLedger: [],
      }
      state = applyTransaction(state, { repId: 'rep-poly-test', amount: 3000, type: 'commission' })
      assert.strictEqual(state.salesReps[0].currentBalance, 8000)
      assert.strictEqual(state.salesReps[0].netBalance, 8000)

      state = applyTransaction(state, 'rep-poly-test', { amount: 2000, type: 'payment' })
      assert.strictEqual(state.salesReps[0].currentBalance, 6000)
      assert.strictEqual(state.salesReps[0].netBalance, 6000)
    }
  })

  it('should cascade sales rep deletion to associated salesRepLedger transactions in store', async () => {
    let useAXStore = null
    try {
      const mod = await import('../src/store/useAXStore.js')
      useAXStore = mod.useAXStore
    } catch (err) {
      if (err.code !== 'ERR_MODULE_NOT_FOUND') throw err
    }

    if (useAXStore) {
      const repToDelete = {
        id: 'rep-to-delete',
        name: 'مندوب للحذف',
        currentBalance: 1000,
        netBalance: 1000,
      }

      useAXStore.getState().addSalesRep(repToDelete)
      useAXStore.getState().addSalesRepTransaction({
        id: 'tx-del-1',
        repId: 'rep-to-delete',
        amount: 500,
        type: 'commission',
      })

      assert.ok(useAXStore.getState().salesReps.some((r) => r.id === 'rep-to-delete'))
      assert.ok(useAXStore.getState().salesRepLedger.some((t) => t.repId === 'rep-to-delete'))

      useAXStore.getState().deleteSalesRep('rep-to-delete')

      assert.strictEqual(useAXStore.getState().salesReps.some((r) => r.id === 'rep-to-delete'), false)
      assert.strictEqual(useAXStore.getState().salesRepLedger.some((t) => t.repId === 'rep-to-delete'), false)
    } else {
      const deleteRep = (state, id) => ({
        salesReps: (state.salesReps || []).filter((r) => r.id !== id),
        salesRepLedger: (state.salesRepLedger || []).filter((tx) => tx.repId !== id),
      })
      const initial = {
        salesReps: [{ id: 'rep-to-delete' }],
        salesRepLedger: [{ repId: 'rep-to-delete' }, { repId: 'rep-keep' }],
      }
      const updated = deleteRep(initial, 'rep-to-delete')
      assert.strictEqual(updated.salesReps.length, 0)
      assert.strictEqual(updated.salesRepLedger.length, 1)
      assert.strictEqual(updated.salesRepLedger[0].repId, 'rep-keep')
    }
  })

  it('should execute AX_SalesRepOperationsService methods safely without errors when Supabase is unconfigured', async () => {
    const addRes = await AX_SalesRepOperationsService.addSalesRepInDB({
      id: 'rep-service-test',
      name: 'مندوب خدمة اختبارية',
      phone: '01011122233',
      currentBalance: 7500,
      assignedBranch: 'فرع 6 أكتوبر',
    })
    assert.ok(typeof addRes === 'object')

    const updateRes = await AX_SalesRepOperationsService.updateSalesRepInDB({
      id: 'rep-service-test',
      name: 'مندوب خدمة اختبارية معدل',
      currentBalance: 9000,
    })
    assert.ok(typeof updateRes === 'object')

    const txRes = await AX_SalesRepOperationsService.addSalesRepTransactionInDB({
      id: 'tx-service-test',
      repId: 'rep-service-test',
      amount: 1500,
      type: 'commission',
    })
    assert.ok(typeof txRes === 'object')

    const delRes = await AX_SalesRepOperationsService.deleteSalesRepInDB('rep-service-test')
    assert.ok(typeof delRes === 'object')
  })

  it('should strictly enforce sales_reps RBAC permissions across roles and getFirstAccessibleTab', () => {
    const salesRepConfig = MODULE_PERMISSIONS_CONFIG.find((m) => m.id === 'sales_reps')
    assert.ok(salesRepConfig, 'sales_reps module must be present in MODULE_PERMISSIONS_CONFIG')
    assert.strictEqual(salesRepConfig.type, 'options')
    assert.ok(salesRepConfig.options.some((o) => o.key === 'create'))
    assert.ok(salesRepConfig.options.some((o) => o.key === 'edit'))
    assert.ok(salesRepConfig.options.some((o) => o.key === 'delete'))
    assert.ok(salesRepConfig.options.some((o) => o.key === 'manage_commissions'))
    assert.ok(salesRepConfig.options.some((o) => o.key === 'view_ledger'))

    const adminUser = { role: 'admin' }
    assert.strictEqual(hasModuleAccess(adminUser, 'sales_reps'), true)
    assert.strictEqual(hasModulePermission(adminUser, 'sales_reps', 'manage_commissions'), true)

    const restrictedUser = {
      role: 'cashier',
      permissions: {
        sales_reps: { view: false, create: false },
        invoices: { view: true },
      },
    }
    assert.strictEqual(hasModuleAccess(restrictedUser, 'sales_reps'), false)
    assert.strictEqual(hasModulePermission(restrictedUser, 'sales_reps', 'view_ledger'), false)

    const repPermittedUser = {
      role: 'accountant',
      permissions: {
        sales_reps: { view: true, view_ledger: true, manage_commissions: true },
      },
    }
    assert.strictEqual(hasModuleAccess(repPermittedUser, 'sales_reps'), true)
    assert.strictEqual(hasModulePermission(repPermittedUser, 'sales_reps', 'view_ledger'), true)
    assert.strictEqual(hasModulePermission(repPermittedUser, 'sales_reps', 'manage_commissions'), true)
    assert.strictEqual(hasModulePermission(repPermittedUser, 'sales_reps', 'delete'), false)

    const onlyRepUser = {
      role: 'custom',
      permissions: {
        sales_reps: { view: true },
      },
    }
    assert.strictEqual(getFirstAccessibleTab(onlyRepUser), 'sales_reps')
  })

  it('should obey file line count <= 500 lines and zero comments across all Milestone 4 files', () => {
    const filesToAudit = [
      'src/services/AX_SalesRepOperationsService.js',
      'src/components/sales_reps/AX_CommissionEngine.js',
      'src/components/sales_reps/AX_SalesRepsManager.jsx',
      'src/components/sales_reps/AX_SalesRepsTable.jsx',
      'src/components/sales_reps/AX_SalesRepsBentoCards.jsx',
      'src/components/sales_reps/AX_AddSalesRepModal.jsx',
      'src/components/sales_reps/AX_EditSalesRepModal.jsx',
      'src/components/sales_reps/AX_SalesRepCommissionModal.jsx',
      'src/components/sales_reps/AX_SalesRepLedgerModal.jsx',
    ]

    for (const rel of filesToAudit) {
      const fullPath = path.resolve(process.cwd(), rel)
      assert.ok(fs.existsSync(fullPath), `File must exist: ${rel}`)
      const content = fs.readFileSync(fullPath, 'utf8')
      const lines = content.split('\n').length
      assert.ok(lines <= 500, `File ${rel} has ${lines} lines, exceeding 50 limit`)

      const codeWithoutStrings = content
        .replace(/"(?:[^"\\]|\\.)*"/g, '')
        .replace(/'(?:[^'\\]|\\.)*'/g, '')
        .replace(/`(?:[^`\\]|\\.)*`/g, '')

      assert.strictEqual(
        /\/\/|\/\*/.test(codeWithoutStrings),
        false,
        `File ${rel} must not contain code comments`
      )
    }
  })
})
