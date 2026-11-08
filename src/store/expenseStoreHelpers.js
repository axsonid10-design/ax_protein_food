import { generateUUID } from '../utils/AX_UUID.js'
import { getVanWarehouses } from './vanDistributionHelpers.js'
import { AX_OperationsService } from '../services/AX_OperationsService.js'

export const EXPENSE_PAYMENT_STATUSES = {
  PAID: 'paid',
  PARTIAL: 'partial',
  DEFERRED: 'deferred',
}

export const EXPENSE_COST_CENTER_TYPES = {
  WAREHOUSE: 'warehouse',
  VEHICLE: 'vehicle',
  FACTORY: 'factory',
  GENERAL: 'general',
}

export const EXPENSE_STATUS_LABELS = {
  paid: 'مدفوع كلي',
  partial: 'مدفوع جزئي',
  deferred: 'غير مدفوع',
}

export const EXPENSE_COST_CENTER_LABELS = {
  warehouse: 'المخازن والتبريد',
  vehicle: 'سيارات التوزيع',
  factory: 'المصنع والتجهيز',
  general: 'عام / الإدارة العامة',
}

let inMemoryExpenses = []

export function getStoredExpenses() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      const stored = localStorage.getItem('ax_expenses')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    }
  } catch {}
  return inMemoryExpenses
}

export function saveStoredExpenses(expenses = []) {
  inMemoryExpenses = Array.isArray(expenses) ? [...expenses] : []
  try {
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem('ax_expenses', JSON.stringify(expenses))
    }
  } catch {}
}

export function getCostCenterEntities(type, { warehouses = [], distributors = [] } = {}) {
  if (type === EXPENSE_COST_CENTER_TYPES.WAREHOUSE) {
    const list = (warehouses || []).filter((w) => w && w.type !== 'van')
    const finalWarehouses = list.length > 0 ? list : (warehouses || [])
    return finalWarehouses.map((w) => ({
      id: w.id,
      name: w.name,
      type: 'warehouse',
      code: w.code || '',
    }))
  }

  if (type === EXPENSE_COST_CENTER_TYPES.VEHICLE) {
    const vans = getVanWarehouses(warehouses, distributors)
    return vans.map((v) => ({
      id: v.id,
      name: v.name,
      type: 'vehicle',
      plateNumber: v.plateNumber || '',
      driverName: v.driverName || v.manager || '',
      treasuryId: v.treasuryId || '',
    }))
  }

  if (type === EXPENSE_COST_CENTER_TYPES.FACTORY) {
    return [{ id: 'factory-main', name: 'المصنع الرئيسي / خطوط التشفية والتجهيز', type: 'factory' }]
  }

  if (type === EXPENSE_COST_CENTER_TYPES.GENERAL) {
    return [{ id: 'general-hq', name: 'الإدارة العامة والمقر الرئيسي', type: 'general' }]
  }

  return []
}

export function generateExpenseInstallments(totalRemaining, installmentCount = 1, firstDueDate = null) {
  const count = Math.max(1, parseInt(installmentCount, 10) || 1)
  const remaining = Math.max(0, Number(totalRemaining) || 0)
  if (remaining <= 0) return []

  const baseAmount = Math.floor((remaining / count) * 100) / 100
  const installments = []
  let accumulated = 0
  const startDate = firstDueDate ? new Date(firstDueDate) : new Date()
  if (isNaN(startDate.getTime())) startDate.setTime(Date.now())

  for (let i = 0; i < count; i++) {
    const dueDateObj = new Date(startDate)
    dueDateObj.setMonth(dueDateObj.getMonth() + i)
    const y = dueDateObj.getFullYear()
    const m = String(dueDateObj.getMonth() + 1).padStart(2, '0')
    const d = String(dueDateObj.getDate()).padStart(2, '0')
    const dueDateStr = `${y}-${m}-${d}`

    const isLast = i === count - 1
    const amount = isLast ? Math.round((remaining - accumulated) * 100) / 100 : baseAmount
    accumulated += amount

    installments.push({
      id: generateUUID(),
      installmentNumber: i + 1,
      dueDate: dueDateStr,
      amount,
      status: 'pending',
      paidDate: null,
      treasuryId: null,
      treasuryName: null,
      notes: '',
    })
  }

  return installments
}

export async function createExpenseRecord(payload = {}, options = {}) {
  const { storeState = null, setStoreState = null, profile = null } = options
  const totalAmount = Math.max(0, Number(payload.totalAmount) || 0)
  const rawPayments = Array.isArray(payload.payments) ? payload.payments : []
  const validPayments = rawPayments
    .filter((p) => p && Number(p.amount) > 0 && p.treasuryId)
    .map((p) => ({
      id: p.id || generateUUID(),
      treasuryId: p.treasuryId,
      treasuryName: p.treasuryName || '',
      amount: Number(p.amount) || 0,
      method: p.method || 'cash',
      date: p.date || payload.date || new Date().toISOString().slice(0, 10),
      transactionCode: `TX-EXP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
      notes: p.notes || '',
    }))

  const paidAmount = validPayments.reduce((acc, p) => acc + p.amount, 0)
  const remainingAmount = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100)

  let paymentStatus = EXPENSE_PAYMENT_STATUSES.DEFERRED
  if (remainingAmount <= 0 && totalAmount > 0) {
    paymentStatus = EXPENSE_PAYMENT_STATUSES.PAID
  } else if (paidAmount > 0) {
    paymentStatus = EXPENSE_PAYMENT_STATUSES.PARTIAL
  }

  let installments = []
  if (Array.isArray(payload.installments) && payload.installments.length > 0) {
    installments = payload.installments.map((inst, idx) => ({
      id: inst.id || generateUUID(),
      installmentNumber: inst.installmentNumber || idx + 1,
      dueDate: inst.dueDate || payload.date || new Date().toISOString().slice(0, 10),
      amount: Number(inst.amount) || 0,
      status: inst.status || 'pending',
      paidDate: inst.paidDate || null,
      treasuryId: inst.treasuryId || null,
      treasuryName: inst.treasuryName || null,
      notes: inst.notes || '',
    }))
  } else if (Array.isArray(payload.deferredSchedule?.installments) && payload.deferredSchedule.installments.length > 0) {
    installments = payload.deferredSchedule.installments.map((inst, idx) => ({
      id: inst.id || generateUUID(),
      installmentNumber: inst.installmentNumber || idx + 1,
      dueDate: inst.dueDate || payload.deferredSchedule?.dueDate || payload.date || new Date().toISOString().slice(0, 10),
      amount: Number(inst.amount) || 0,
      status: inst.status || 'pending',
      paidDate: inst.paidDate || null,
      treasuryId: inst.treasuryId || null,
      treasuryName: inst.treasuryName || null,
      notes: inst.notes || '',
    }))
  } else if (remainingAmount > 0) {
    installments = generateExpenseInstallments(
      remainingAmount,
      payload.installmentCount || 1,
      payload.deferredSchedule?.dueDate || payload.dueDate || payload.date
    )
  }

  const expenseCode = payload.code || `EXP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`
  const expenseRecord = {
    id: payload.id || generateUUID(),
    code: expenseCode,
    title: payload.title || payload.description || 'مصروف تشغيلي',
    description: payload.description || payload.title || '',
    date: payload.date || new Date().toISOString().slice(0, 10),
    operationalDate: payload.operationalDate || payload.date || new Date().toISOString().slice(0, 10),
    costCenter: {
      entityType: payload.costCenter?.entityType || EXPENSE_COST_CENTER_TYPES.GENERAL,
      entityId: payload.costCenter?.entityId || null,
      entityName: payload.costCenter?.entityName || 'عام / الإدارة العامة',
    },
    mainCategoryId: payload.mainCategoryId || '',
    mainCategoryName: payload.mainCategoryName || '',
    subCategoryId: payload.subCategoryId || null,
    subCategoryName: payload.subCategoryName || '',
    secondaryCategoryId: payload.secondaryCategoryId || null,
    secondaryCategoryName: payload.secondaryCategoryName || '',
    payeeName: payload.payeeName || payload.creditor || 'جهة الصرف',
    totalAmount,
    paidAmount,
    remainingAmount,
    paymentType: payload.paymentType || (remainingAmount === 0 ? 'immediate' : (paidAmount > 0 ? 'partial' : 'deferred')),
    paymentStatus,
    payments: validPayments,
    installments,
    employeeId: payload.employeeId || null,
    notes: payload.notes || '',
    createdAt: new Date().toISOString(),
  }

  if (validPayments.length > 0 && storeState) {
    const treasuries = Array.isArray(storeState.treasuryAccounts) ? [...storeState.treasuryAccounts] : []
    const newTxList = []

    validPayments.forEach((p) => {
      const tIdx = treasuries.findIndex((t) => t.id === p.treasuryId)
      if (tIdx >= 0) {
        treasuries[tIdx] = {
          ...treasuries[tIdx],
          balance: Number(treasuries[tIdx].balance || 0) - p.amount,
        }
      }

      const txRecord = {
        id: generateUUID(),
        code: p.transactionCode,
        type: 'expense',
        partyType: 'expense',
        partyId: expenseRecord.id,
        partyName: `[${expenseRecord.costCenter.entityName}] ${expenseRecord.mainCategoryName || 'مصروفات'}`,
        amount: p.amount,
        treasuryId: p.treasuryId,
        date: p.date,
        notes: `[${expenseRecord.code}] ${expenseRecord.title} - سداد عبر ${p.method}`,
        createdAt: new Date().toISOString(),
      }

      newTxList.push(txRecord)
      try {
        AX_OperationsService.addCashTransactionInDB(txRecord, profile)
      } catch {}
    })

    if (typeof setStoreState === 'function') {
      setStoreState((state) => ({
        treasuryAccounts: treasuries,
        cashTransactions: [...newTxList, ...(state.cashTransactions || [])],
      }))
    }
  }

  const existingExpenses = getStoredExpenses()
  const updatedExpenses = [expenseRecord, ...existingExpenses.filter((e) => e.id !== expenseRecord.id)]
  saveStoredExpenses(updatedExpenses)

  return { success: true, expense: expenseRecord }
}

export async function settleExpenseInstallment(expenseId, installmentId, settlementPayload = {}, options = {}) {
  const { storeState = null, setStoreState = null, profile = null } = options
  const existingExpenses = getStoredExpenses()
  const expIdx = existingExpenses.findIndex((e) => e.id === expenseId)
  if (expIdx < 0) return { success: false, error: 'سجل المصروف غير موجود' }

  const expense = { ...existingExpenses[expIdx] }
  const installments = [...(expense.installments || [])]
  const instIdx = installments.findIndex((i) => i.id === installmentId)
  if (instIdx < 0) return { success: false, error: 'القسط المحدد غير موجود' }

  const targetInstallment = installments[instIdx]
  if (targetInstallment.status === 'paid') return { success: false, error: 'هذا القسط مسدد بالفعل' }

  const settleAmount = Number(settlementPayload.amount || targetInstallment.amount) || 0
  const treasuryId = settlementPayload.treasuryId
  const treasuryName = settlementPayload.treasuryName || ''
  const paymentMethod = settlementPayload.method || 'cash'
  const payDate = settlementPayload.date || new Date().toISOString().slice(0, 10)
  const txCode = `TX-INST-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`

  installments[instIdx] = {
    ...targetInstallment,
    status: 'paid',
    paidDate: payDate,
    treasuryId,
    treasuryName,
    paymentMethod,
    notes: settlementPayload.notes || targetInstallment.notes || '',
  }

  const newPayment = {
    id: generateUUID(),
    treasuryId,
    treasuryName,
    amount: settleAmount,
    method: paymentMethod,
    date: payDate,
    transactionCode: txCode,
    notes: `سداد قسط #${targetInstallment.installmentNumber} لمصروف ${expense.code}`,
  }

  const updatedPayments = [...(expense.payments || []), newPayment]
  const updatedPaidAmount = Math.round(((expense.paidAmount || 0) + settleAmount) * 100) / 100
  const updatedRemaining = Math.max(0, Math.round(((expense.totalAmount || 0) - updatedPaidAmount) * 100) / 100)

  let nextStatus = EXPENSE_PAYMENT_STATUSES.PARTIAL
  if (updatedRemaining <= 0 || installments.every((i) => i.status === 'paid')) {
    nextStatus = EXPENSE_PAYMENT_STATUSES.PAID
  }

  expense.installments = installments
  expense.payments = updatedPayments
  expense.paidAmount = updatedPaidAmount
  expense.remainingAmount = updatedRemaining
  expense.paymentStatus = nextStatus

  existingExpenses[expIdx] = expense
  saveStoredExpenses(existingExpenses)

  if (treasuryId && storeState) {
    const treasuries = Array.isArray(storeState.treasuryAccounts) ? [...storeState.treasuryAccounts] : []
    const tIdx = treasuries.findIndex((t) => t.id === treasuryId)
    if (tIdx >= 0) {
      treasuries[tIdx] = {
        ...treasuries[tIdx],
        balance: Number(treasuries[tIdx].balance || 0) - settleAmount,
      }
    }

    const txRecord = {
      id: generateUUID(),
      code: txCode,
      type: 'expense',
      partyType: 'expense',
      partyId: expense.id,
      partyName: `[${expense.costCenter?.entityName || 'عام'}] سداد قسط ${expense.mainCategoryName || 'مصروف'}`,
      amount: settleAmount,
      treasuryId,
      date: payDate,
      notes: `[سداد قسط ${expense.code}] ${settlementPayload.notes || ''}`,
      createdAt: new Date().toISOString(),
    }

    try {
      AX_OperationsService.addCashTransactionInDB(txRecord, profile)
    } catch {}

    if (typeof setStoreState === 'function') {
      setStoreState((state) => ({
        treasuryAccounts: treasuries,
        cashTransactions: [txRecord, ...(state.cashTransactions || [])],
      }))
    }
  }

  return { success: true, expense, installment: installments[instIdx] }
}

export function deleteExpenseRecord(expenseId) {
  const existingExpenses = getStoredExpenses()
  const nextList = existingExpenses.filter((e) => e.id !== expenseId)
  saveStoredExpenses(nextList)
  return { success: true }
}

export function calculateExpenseKPIs(expenses = [], timeframe = 'all', customRange = null) {
  const list = filterExpenses(expenses, { timeframe, customRange })
  const totalExpenses = list.reduce((acc, e) => acc + (Number(e.totalAmount) || 0), 0)
  const totalPaid = list.reduce((acc, e) => acc + (Number(e.paidAmount) || 0), 0)
  const totalDeferred = list.reduce((acc, e) => acc + (Number(e.remainingAmount) || 0), 0)

  let upcomingInstallmentsCount = 0
  let upcomingInstallmentsTotal = 0

  list.forEach((e) => {
    if (Array.isArray(e.installments)) {
      e.installments.forEach((inst) => {
        if (inst && inst.status === 'pending') {
          upcomingInstallmentsCount += 1
          upcomingInstallmentsTotal += Number(inst.amount) || 0
        }
      })
    }
  })

  return {
    count: list.length,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalDeferred: Math.round(totalDeferred * 100) / 100,
    upcomingInstallmentsCount,
    upcomingInstallmentsTotal: Math.round(upcomingInstallmentsTotal * 100) / 100,
  }
}

export function filterExpenses(expenses = [], filters = {}) {
  const rawList = Array.isArray(expenses) ? expenses : []
  const {
    timeframe = 'all',
    customRange = null,
    costCenterType = 'all',
    costCenterId = 'all',
    mainCategoryId = 'all',
    paymentStatus = 'all',
    search = '',
  } = filters

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return rawList.filter((e) => {
    if (!e) return false

    if (timeframe === 'today') {
      if (e.date !== todayStr) return false
    } else if (timeframe === 'week') {
      const eDate = new Date(e.date)
      const diffDays = (now.getTime() - eDate.getTime()) / (1000 * 3600 * 24)
      if (diffDays < 0 || diffDays > 7) return false
    } else if (timeframe === 'month') {
      const curYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      if (!String(e.date || '').startsWith(curYearMonth)) return false
    } else if (timeframe === 'custom' && customRange) {
      const { start, end } = customRange
      if (start && e.date < start) return false
      if (end && e.date > end) return false
    }

    if (costCenterType !== 'all' && e.costCenter?.entityType !== costCenterType) return false
    if (costCenterId !== 'all' && e.costCenter?.entityId !== costCenterId) return false
    if (mainCategoryId !== 'all' && e.mainCategoryId !== mainCategoryId) return false
    if (paymentStatus !== 'all' && e.paymentStatus !== paymentStatus) return false

    if (search && String(search).trim()) {
      const term = String(search).trim().toLowerCase()
      const haystack = [
        e.code,
        e.title,
        e.description,
        e.payeeName,
        e.costCenter?.entityName,
        e.mainCategoryName,
        e.subCategoryName,
        e.secondaryCategoryName,
        e.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(term)) return false
    }

    return true
  })
}
