import { create } from 'zustand'
import { AX_OperationsService } from '../services/AX_OperationsService.js'
import { AX_StaffOperationsService } from '../services/AX_StaffOperationsService.js'
import { AX_CustomerOperationsService } from '../services/AX_CustomerOperationsService.js'
import { AX_SupplierOperationsService } from '../services/AX_SupplierOperationsService.js'
import { AX_SalesRepOperationsService } from '../services/AX_SalesRepOperationsService.js'
import { AX_DatabaseSync } from '../services/AX_DatabaseSync.js'
import { offlineDB } from '../services/offlineDB.js'
import { generateUUID } from '../utils/AX_UUID.js'
import { categoryHelpers } from './categoryHelpers.js'
import { recycleBinHelpers } from './recycleBinHelpers.js'
import { expenseCategoryHelpers, initialExpenseCategories } from './expenseCategoryHelpers.js'
import { updateLocalCachePayload, processInvoiceStoreState, saveSalesRepState, updateSalesRepState, deleteSalesRepState, updateInvoiceStoreState, deleteInvoiceStoreState, saveItemOpeningBalanceState, applyManufacturingOrderState, updateManufacturingOrderState, deleteManufacturingOrderState, editItemStoreState } from './storeCacheHelper.js'
import { checkTransferAuditDiscrepancy, calculateTransferStockMovement } from './transferAuditHelpers.js'
import {
  initialCategories, initialSubCategories, initialSecondaryCategories, initialItems, initialWarehouses, initialDistributors, initialInventoryStock, initialTransfers, initialStockAudits, initialTreasuryAccounts, initialCashTransactions, initialPendingCashTransfers, initialManufacturingOrders, initialInvoices, initialClients, initialSuppliers, initialSalesReps, initialSalesRepLedger, initialNotifications,
} from './initialData.js'

export const useAXStore = create((set, get) => ({
  profile: (() => { try { const s = localStorage.getItem('ax_auth_user') || localStorage.getItem('ax_user_profile') || sessionStorage.getItem('ax_auth_user'); return s ? JSON.parse(s) : null } catch { return null } })(),
  isAuthLoading: false,
  realtimeTrigger: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingSyncCount: 0,
  isSyncing: false,
  lastSyncTime: null,
  activeModal: null,
  modalData: null,
  activeTab: (() => { try { if (typeof window !== 'undefined') { const p = new URLSearchParams(window.location.search).get('tab'); return p || localStorage.getItem('ax_active_tab') || 'dashboard' } } catch {}; return 'dashboard' })(),
  invoiceTypeFilter: 'all',
  companyEmployees: (() => { try { const s = localStorage.getItem('ax_company_employees'); if (s) return JSON.parse(s) } catch {}; return [] })(),
  employeeAttendance: (() => { try { const s = localStorage.getItem('ax_employee_attendance'); if (s) return JSON.parse(s) } catch {}; return [] })(),

  categories: initialCategories,
  subCategories: initialSubCategories,
  secondaryCategories: initialSecondaryCategories,
  expenseCategories: (() => {
    try { const s = localStorage.getItem('ax_expense_categories'); if (s) return JSON.parse(s) } catch {}
    return initialExpenseCategories
  })(),

  systemSettings: (() => {
    try { const s = localStorage.getItem('ax_system_settings'); if (s) return JSON.parse(s) } catch {}
    return { maxWarehouses: 999, maxUsers: 999, activeModules: ['dashboard', 'items', 'warehouses', 'manufacturing', 'distribution', 'treasury', 'invoices', 'reports', 'staff'] }
  })(),
  employees: (() => {
    try { const s = localStorage.getItem('ax_staff_employees'); if (s) return JSON.parse(s) } catch {}
    return []
  })(),
  staffInvites: (() => {
    try { const s = localStorage.getItem('ax_staff_invites'); if (s) return JSON.parse(s) } catch {}
    return []
  })(),

  ...(() => {
    let c = null
    try {
      const cachedVer = localStorage.getItem('ax_cached_payload_version')
      const currentVer = import.meta.env.VITE_APP_VERSION || '2.3.0'
      const s = localStorage.getItem('ax_cached_db_payload')
      if (s) c = JSON.parse(s)
      if (cachedVer !== currentVer) localStorage.setItem('ax_cached_payload_version', currentVer)
    } catch {}
    return {
      items: c?.items || initialItems, warehouses: c?.warehouses || initialWarehouses,
      distributors: c?.distributors || initialDistributors, inventoryStock: c?.inventoryStock || initialInventoryStock,
      transfers: c?.transfers || initialTransfers, stockAudits: c?.stockAudits || initialStockAudits,
      treasuryAccounts: c?.treasuryAccounts || initialTreasuryAccounts, cashTransactions: c?.cashTransactions || initialCashTransactions,
      pendingCashTransfers: c?.pendingCashTransfers || initialPendingCashTransfers, manufacturingOrders: c?.manufacturingOrders || initialManufacturingOrders,
      invoices: c?.invoices || initialInvoices, clients: c?.clients || initialClients, suppliers: c?.suppliers || initialSuppliers,
      salesReps: c?.salesReps || initialSalesReps, salesRepLedger: c?.salesRepLedger || initialSalesRepLedger,
      notifications: c?.notifications || initialNotifications, recycleBin: c?.recycleBin || [],
    }
  })(),

  fetchDatabaseState: async () => {
    const payload = await AX_DatabaseSync.fetchFullDatabase()
    if (payload) get().hydrateFromSupabase(payload)
    return payload
  },

  hydrateFromSupabase: (payload) => set((state) => {
    const nextState = {
      ...state,
      ...payload,
      invoices: Array.isArray(payload?.invoices) ? payload.invoices : state.invoices,
      salesRepLedger: Array.isArray(payload?.salesRepLedger) ? payload.salesRepLedger : state.salesRepLedger,
      ...(payload?.cashTransfers && !payload?.pendingCashTransfers ? { pendingCashTransfers: payload.cashTransfers } : {}),
    }
    try { localStorage.setItem('ax_cached_db_payload', JSON.stringify(payload)); localStorage.setItem('ax_cached_payload_version', import.meta.env.VITE_APP_VERSION || '2.3.0') } catch {}
    return nextState
  }),

  markAllNotificationsRead: () => {
    try { Promise.resolve(AX_OperationsService.markAllNotificationsReadInDB()).catch(() => {}) } catch {}
    set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) }))
  },
  markNotificationRead: (id) => {
    try { Promise.resolve(AX_OperationsService.markNotificationReadInDB(id)).catch(() => {}) } catch {}
    set((state) => ({ notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
  },
  addNotification: (notif) => {
    const item = { id: notif.id || 'notif-' + Date.now(), time: 'الآن', read: false, ...notif }
    try { Promise.resolve(AX_OperationsService.addNotificationInDB(item)).catch(() => {}) } catch {}
    set((state) => ({ notifications: [item, ...state.notifications] }))
  },

  setProfile: (profile) => set({ profile }),
  updateProfile: (updates) => set((state) => {
    const next = { ...state.profile, ...updates }
    try { localStorage.setItem('ax_user_profile', JSON.stringify(next)) } catch {}
    return { profile: next }
  }),
  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  triggerRealtime: () => set((state) => ({ realtimeTrigger: state.realtimeTrigger + 1 })),
  setOnline: (isOnline) => set({ isOnline }),
  setPendingSyncCount: (pendingSyncCount) => set({ pendingSyncCount }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setActiveTab: (activeTab) => {
    const prevTab = get().activeTab
    try {
      localStorage.setItem('ax_active_tab', activeTab)
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href); url.searchParams.set('tab', activeTab)
        if (prevTab !== activeTab) window.history.pushState({ tab: activeTab, type: 'ax_tab' }, '', url.toString())
        else window.history.replaceState({ tab: activeTab, type: 'ax_tab' }, '', url.toString())
      }
    } catch {}
    set({ activeTab })
  },

  openModal: (modalName, modalData = null) => set({ activeModal: modalName, modalData }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  addItem: (item, openingStock = null) => {
    AX_OperationsService.addItemInDB(item, openingStock, get().profile)
    set((state) => {
      let updatedStock = [...state.inventoryStock]
      if (openingStock && Number(openingStock.quantity) > 0 && openingStock.warehouseId) {
        const existIdx = updatedStock.findIndex((s) => s.warehouseId === openingStock.warehouseId && s.itemId === item.id)
        if (existIdx !== -1) {
          updatedStock[existIdx] = { ...updatedStock[existIdx], quantity: Number(openingStock.quantity), openingBalance: Number(openingStock.quantity), unit: openingStock.unit || item.unitType }
        } else {
          updatedStock.push({ warehouseId: openingStock.warehouseId, itemId: item.id, quantity: Number(openingStock.quantity), openingBalance: Number(openingStock.quantity), unit: openingStock.unit || item.unitType })
        }
      }
      const nextItems = [item, ...state.items]
      updateLocalCachePayload('items', nextItems)
      updateLocalCachePayload('inventoryStock', updatedStock)
      return { items: nextItems, inventoryStock: updatedStock }
    })
  },

  addMultipleItems: (itemsListWithStock = []) => {
    AX_OperationsService.addMultipleItemsInDB(itemsListWithStock, get().profile)
    set((state) => {
      const newItems = []
      let updatedStock = [...state.inventoryStock]
      itemsListWithStock.forEach(({ item, openingStock }) => {
        newItems.push(item)
        if (openingStock && Number(openingStock.quantity) > 0 && openingStock.warehouseId) {
          const existIdx = updatedStock.findIndex((s) => s.warehouseId === openingStock.warehouseId && s.itemId === item.id)
          if (existIdx !== -1) {
            updatedStock[existIdx] = { ...updatedStock[existIdx], quantity: Number(openingStock.quantity), openingBalance: Number(openingStock.quantity), unit: openingStock.unit || item.unitType }
          } else {
            updatedStock.push({ warehouseId: openingStock.warehouseId, itemId: item.id, quantity: Number(openingStock.quantity), openingBalance: Number(openingStock.quantity), unit: openingStock.unit || item.unitType })
          }
        }
      })
      const nextItems = [...newItems, ...state.items]
      updateLocalCachePayload('items', nextItems)
      updateLocalCachePayload('inventoryStock', updatedStock)
      return { items: nextItems, inventoryStock: updatedStock }
    })
  },

  applyStockAudit: (auditPayload) => {
    AX_OperationsService.applyStockAuditInDB(auditPayload, get().profile)
    set((state) => {
      const { session, adjustedStocks = [] } = auditPayload
      const newAudits = [session, ...(state.stockAudits || [])]
      try { localStorage.setItem('ax_stock_audits', JSON.stringify(newAudits)) } catch {}

      let updatedInventory = [...state.inventoryStock]
      adjustedStocks.forEach((adj) => {
        const idx = updatedInventory.findIndex((s) => (s.warehouseId || s.warehouse_id) === adj.warehouseId && (s.itemId || s.item_id) === adj.itemId)
        if (idx !== -1) updatedInventory[idx] = { ...updatedInventory[idx], quantity: Number(adj.actualQty), unit: adj.unit || updatedInventory[idx].unit }
        else updatedInventory.push({ warehouseId: adj.warehouseId, itemId: adj.itemId, quantity: Number(adj.actualQty), unit: adj.unit || 'كرتونة' })
      })
      updateLocalCachePayload('stockAudits', newAudits)
      updateLocalCachePayload('inventoryStock', updatedInventory)
      return { stockAudits: newAudits, inventoryStock: updatedInventory }
    })
  },

  editItem: (item) => { AX_OperationsService.editItemInDB(item, get().profile); set((state) => editItemStoreState(state, item)) },
  deleteItem: (id) => { const it = (get().items || []).find((i) => i.id === id); AX_OperationsService.deleteItemInDB(id, get().profile); set((state) => { const nextItems = state.items.filter((i) => i.id !== id); const nextStock = state.inventoryStock.filter((s) => (s.itemId || s.item_id) !== id); updateLocalCachePayload('items', nextItems); updateLocalCachePayload('inventoryStock', nextStock); return { items: nextItems, inventoryStock: nextStock, recycleBin: it ? [{ id: generateUUID(), entityType: 'item', entityId: id, entityCode: it.code, entityTitle: `صنف: ${it.compositeName || it.code}`, originalData: it, deletedAt: new Date().toISOString() }, ...(state.recycleBin || [])] : state.recycleBin } }) },
  saveItemOpeningBalance: async (payload) => {
    const item = (get().items || []).find((i) => i.id === payload.itemId), warehouse = (get().warehouses || []).find((w) => w.id === payload.warehouseId)
    const existingStock = (get().inventoryStock || []).find((s) => (s.itemId || s.item_id) === payload.itemId && (s.warehouseId || s.warehouse_id) === payload.warehouseId)
    const oldOpeningBalance = existingStock?.openingBalance !== undefined ? Number(existingStock.openingBalance) : Number(existingStock?.opening_balance || 0)
    const { inventoryStock, newStock, finalStockRow } = saveItemOpeningBalanceState(get(), payload)
    set({ inventoryStock })
    try { await AX_OperationsService.saveOpeningBalanceInDB({ ...payload, quantity: !isNaN(Number(payload.quantity)) ? Number(payload.quantity) : 0, unit: finalStockRow?.unit, newStock, itemName: item?.compositeName || item?.name || '', warehouseName: warehouse?.name || '', oldOpeningBalance }, get().profile) } catch {}
    return { success: true, newStock, updatedStock: finalStockRow }
  },
  addCategory: (name) => { AX_OperationsService.addCategoryInDB({ name, level: 'primary' }, get().profile); set((state) => categoryHelpers.addCategory(state, name)) },
  editCategory: (oldName, newName) => { AX_OperationsService.editCategoryInDB({ oldName, newName, level: 'primary' }, get().profile); set((state) => categoryHelpers.editCategory(state, oldName, newName)) },
  deleteCategory: (name) => { AX_OperationsService.deleteCategoryInDB({ name, level: 'primary' }, get().profile); set((state) => categoryHelpers.deleteCategory(state, name)) },
  addSubCategory: (p, name) => { AX_OperationsService.addCategoryInDB({ name, level: 'sub', parentName: p }, get().profile); set((state) => categoryHelpers.addSubCategory(state, p, name)) },
  editSubCategory: (p, o, n) => { AX_OperationsService.editCategoryInDB({ oldName: o, newName: n, level: 'sub', parentName: p }, get().profile); set((state) => categoryHelpers.editSubCategory(state, p, o, n)) },
  deleteSubCategory: (p, name) => { AX_OperationsService.deleteCategoryInDB({ name, level: 'sub', parentName: p }, get().profile); set((state) => categoryHelpers.deleteSubCategory(state, p, name)) },
  addSecondaryCategory: (name) => { AX_OperationsService.addCategoryInDB({ name, level: 'secondary' }, get().profile); set((state) => categoryHelpers.addSecondaryCategory(state, name)) },
  editSecondaryCategory: (o, n) => { AX_OperationsService.editCategoryInDB({ oldName: o, newName: n, level: 'secondary' }, get().profile); set((state) => categoryHelpers.editSecondaryCategory(state, o, n)) },
  deleteSecondaryCategory: (name) => { AX_OperationsService.deleteCategoryInDB({ name, level: 'secondary' }, get().profile); set((state) => categoryHelpers.deleteSecondaryCategory(state, name)) },
  addExpenseCategory: (cat) => set((state) => { const next = expenseCategoryHelpers.addExpenseCategory(state.expenseCategories, cat); try { localStorage.setItem('ax_expense_categories', JSON.stringify(next)) } catch {}; return { expenseCategories: next } }),
  editExpenseCategory: (id, updates) => set((state) => { const next = expenseCategoryHelpers.editExpenseCategory(state.expenseCategories, id, updates); try { localStorage.setItem('ax_expense_categories', JSON.stringify(next)) } catch {}; return { expenseCategories: next } }),
  deleteExpenseCategory: (id) => set((state) => { const next = expenseCategoryHelpers.deleteExpenseCategory(state.expenseCategories, id); try { localStorage.setItem('ax_expense_categories', JSON.stringify(next)) } catch {}; return { expenseCategories: next } }),
  resetExpenseCategories: () => set(() => { const init = expenseCategoryHelpers.getInitialExpenseCategories(); try { localStorage.setItem('ax_expense_categories', JSON.stringify(init)) } catch {}; return { expenseCategories: init } }),

  addClient: (client) => { AX_CustomerOperationsService.addCustomerInDB(client, get().profile); set((state) => { const next = [client, ...state.clients.filter((c) => c.id !== client.id)]; updateLocalCachePayload('clients', next); return { clients: next } }) },
  updateClient: (id, updates) => { AX_CustomerOperationsService.updateCustomerInDB({ id, ...updates }, get().profile); set((state) => { const next = state.clients.map((c) => (c.id === id ? { ...c, ...updates } : c)); updateLocalCachePayload('clients', next); return { clients: next } }) },
  deleteClient: (id) => { AX_CustomerOperationsService.deleteCustomerInDB(id, get().profile); set((state) => { const next = state.clients.filter((c) => c.id !== id); updateLocalCachePayload('clients', next); return { clients: next } }) },

  addSupplier: (supplier) => { AX_SupplierOperationsService.addSupplierInDB(supplier, get().profile); set((state) => { const next = [supplier, ...state.suppliers.filter((s) => s.id !== supplier.id)]; updateLocalCachePayload('suppliers', next); return { suppliers: next } }) },
  updateSupplier: (id, updates) => { AX_SupplierOperationsService.updateSupplierInDB({ id, ...updates }, get().profile); set((state) => { const next = state.suppliers.map((s) => (s.id === id ? { ...s, ...updates } : s)); updateLocalCachePayload('suppliers', next); return { suppliers: next } }) },
  deleteSupplier: (id) => { AX_SupplierOperationsService.deleteSupplierInDB(id, get().profile); set((state) => { const next = state.suppliers.filter((s) => s.id !== id); updateLocalCachePayload('suppliers', next); return { suppliers: next } }) },

  addSalesRep: (rep) => { AX_SalesRepOperationsService.addSalesRepInDB(rep, get().profile); set((state) => saveSalesRepState(state, rep)) },
  updateSalesRep: (id, updates) => { AX_SalesRepOperationsService.updateSalesRepInDB({ id, ...updates }, get().profile); set((state) => updateSalesRepState(state, id, updates)) },
  deleteSalesRep: (id) => { AX_SalesRepOperationsService.deleteSalesRepInDB(id, get().profile); set((state) => deleteSalesRepState(state, id)) },

  addSalesRepTransaction: (arg1, arg2) => set((state) => {
    const rawTx = typeof arg1 === 'string' ? { ...arg2, repId: arg1 } : arg1
    if (!rawTx || !rawTx.repId) return state
    const amount = Math.abs(Number(rawTx.amount) || 0)
    let delta = 0
    if (rawTx.type === 'commission' || rawTx.type === 'bonus') delta = amount
    else if (rawTx.type === 'payment' || rawTx.type === 'disbursement' || rawTx.type === 'clawback' || rawTx.type === 'deduction' || rawTx.type === 'penalty') delta = -amount
    const newTx = {
      id: rawTx.id || generateUUID(), repId: rawTx.repId,
      date: rawTx.date || new Date().toISOString().split('T')[0],
      amount, type: rawTx.type,
      notes: rawTx.notes || rawTx.description || '',
      description: rawTx.description || rawTx.notes || '',
      invoiceId: rawTx.invoiceId || null,
    }
    const currentLedger = Array.isArray(state.salesRepLedger) ? state.salesRepLedger : []
    const updatedLedger = [newTx, ...currentLedger]
    let updatedRepObj = null
    const repSpecificLedger = updatedLedger.filter((t) => t.repId === newTx.repId)
    const updatedReps = (state.salesReps || []).map((r) => {
      if (r.id !== newTx.repId) return r
      const cur = Number(r.currentBalance ?? r.netBalance ?? r.balance ?? 0)
      const nextBal = cur + delta
      updatedRepObj = { ...r, currentBalance: nextBal, netBalance: nextBal, balance: nextBal, metadata: { ...(r.metadata || {}), ledger: repSpecificLedger } }
      return updatedRepObj
    })
    AX_SalesRepOperationsService.addSalesRepTransactionInDB(newTx, state.profile, updatedRepObj, repSpecificLedger)
    updateLocalCachePayload('salesReps', updatedReps); updateLocalCachePayload('salesRepLedger', updatedLedger); return { salesRepLedger: updatedLedger, salesReps: updatedReps }
  }),

  updateSystemSettings: (newSettings) => set((state) => {
    const updated = { ...state.systemSettings, ...newSettings }
    try { localStorage.setItem('ax_system_settings', JSON.stringify(updated)) } catch {}
    return { systemSettings: updated }
  }),

  addWarehouse: (newWh) => {
    const wh = { ...newWh, id: newWh.id || generateUUID() }; AX_OperationsService.addWarehouseInDB(wh, get().profile)
    set((state) => { const nextWh = [...state.warehouses, wh]; updateLocalCachePayload('warehouses', nextWh); return { warehouses: nextWh } })
  },
  editWarehouse: (updatedWh) => {
    AX_OperationsService.editWarehouseInDB(updatedWh, get().profile)
    set((state) => { const nextWh = state.warehouses.map((w) => (w.id === updatedWh.id ? { ...w, ...updatedWh } : w)); updateLocalCachePayload('warehouses', nextWh); return { warehouses: nextWh } })
  },
  deleteWarehouse: (id) => {
    AX_OperationsService.deleteWarehouseInDB(id, get().profile)
    set((state) => {
      const nextWh = state.warehouses.filter((w) => w.id !== id)
      const nextDist = (state.distributors || []).filter((d) => d.id !== id)
      let stockCopy = state.inventoryStock.filter((s) => (s.warehouseId || s.warehouse_id) !== id)
      const nextTransfers = (state.transfers || []).map((t) => {
        const fromId = t.fromId || t.fromWarehouseId || t.from_warehouse_id
        const toId = t.toId || t.toWarehouseId || t.to_warehouse_id
        if (toId === id && t.status === 'confirmed') {
          for (const item of (t.items || [])) {
            const itId = item.itemId || item.id || item.item_id
            const qty = Number(item.quantity) || 0
            if (fromId && itId && qty > 0) {
              const sIdx = stockCopy.findIndex((s) => (s.warehouseId || s.warehouse_id) === fromId && (s.itemId || s.item_id) === itId)
              if (sIdx >= 0) stockCopy[sIdx] = { ...stockCopy[sIdx], quantity: (Number(stockCopy[sIdx].quantity) || 0) + qty }
              else stockCopy.push({ warehouseId: fromId, itemId: itId, quantity: qty, unit: item.unit || 'كرتونة' })
            }
          }
          return { ...t, status: 'cancelled', notes: (t.notes ? `${t.notes} • ` : '') + 'ملغي لحذف مخزن الاستلام' }
        }
        if (fromId === id && t.status === 'confirmed') {
          return { ...t, status: 'cancelled', notes: (t.notes ? `${t.notes} • ` : '') + 'ملغي لحذف مخزن الإرسال' }
        }
        return t
      })
      updateLocalCachePayload('warehouses', nextWh); updateLocalCachePayload('distributors', nextDist); updateLocalCachePayload('transfers', nextTransfers); updateLocalCachePayload('inventoryStock', stockCopy)
      return { warehouses: nextWh, distributors: nextDist, transfers: nextTransfers, inventoryStock: stockCopy }
    })
  },
  addTreasuryAccount: (account) => { const acc = { ...account, id: account.id || generateUUID(), openingBalance: Number(account.openingBalance ?? account.balance ?? 0) }; AX_OperationsService.addTreasuryAccountInDB(acc, get().profile); set((state) => { const nextTr = [...state.treasuryAccounts, acc]; updateLocalCachePayload('treasuryAccounts', nextTr); return { treasuryAccounts: nextTr } }) },
  updateTreasuryAccount: (account) => { AX_OperationsService.updateTreasuryAccountInDB(account, get().profile); set((state) => { const nextTr = state.treasuryAccounts.map((t) => (t.id === account.id ? { ...t, ...account } : t)); updateLocalCachePayload('treasuryAccounts', nextTr); return { treasuryAccounts: nextTr } }) },
  saveTreasuryOpeningBalance: ({ treasuryId, openingBalance, currentBalance }) => { AX_OperationsService.saveTreasuryOpeningBalanceInDB({ treasuryId, openingBalance, currentBalance }, get().profile); set((state) => { const nextTr = (state.treasuryAccounts || []).map((t) => (t.id === treasuryId ? { ...t, openingBalance: Number(openingBalance || 0), balance: Number(currentBalance || 0) } : t)); updateLocalCachePayload('treasuryAccounts', nextTr); return { treasuryAccounts: nextTr } }) },
  deleteTreasuryAccount: (id) => {
    AX_OperationsService.deleteTreasuryAccountInDB(id, get().profile)
    set((state) => {
      const deletedAccount = state.treasuryAccounts.find((t) => t.id === id)
      const nextTr = state.treasuryAccounts.filter((t) => t.id !== id)
      const updatedCashTx = (state.cashTransactions || []).map((tx) =>
        tx.treasuryId === id ? { ...tx, treasuryName: `[حساب محذوف: ${deletedAccount?.name || 'خزينة'}]`, isDeletedAccount: true } : tx
      )
      updateLocalCachePayload('treasuryAccounts', nextTr)
      updateLocalCachePayload('cashTransactions', updatedCashTx)
      try {
        const raw = localStorage.getItem('ax_deleted_treasuries')
        const list = raw ? JSON.parse(raw) : []
        if (!list.includes(id)) { list.push(id); localStorage.setItem('ax_deleted_treasuries', JSON.stringify(list)) }
      } catch {}
      try {
        offlineDB.getCachedData('full_database').then((cached) => {
          if (cached && Array.isArray(cached.treasuryAccounts)) {
            cached.treasuryAccounts = cached.treasuryAccounts.filter((t) => t.id !== id)
            if (Array.isArray(cached.cashTransactions)) {
              cached.cashTransactions = cached.cashTransactions.map((tx) => tx.treasuryId === id ? { ...tx, treasuryName: `[حساب محذوف: ${deletedAccount?.name || 'خزينة'}]`, isDeletedAccount: true } : tx)
            }
            offlineDB.cacheData('full_database', cached).catch(() => {})
          }
        }).catch(() => {})
        offlineDB.cacheDeleteItem('treasuryAccounts', id).catch(() => {})
      } catch {}
      return { treasuryAccounts: nextTr, cashTransactions: updatedCashTx }
    })
  },

  confirmTransfer: (transferId) => set((state) => {
    const trf = state.transfers.find((t) => t.id === transferId)
    if (!trf || trf.status === 'confirmed') return state
    const { updatedStock, isAuditDiscrepancy, auditDiscrepancyNote } = calculateTransferStockMovement(trf, state.inventoryStock, state.stockAudits, state.warehouses, state.items)
    const newTransfers = state.transfers.map((t) =>
      t.id === transferId
        ? { ...t, status: 'confirmed', confirmedAt: new Date().toISOString(), isAuditDiscrepancy: t.isAuditDiscrepancy ?? isAuditDiscrepancy, auditDiscrepancyNote: t.auditDiscrepancyNote || auditDiscrepancyNote }
        : t
    )
    AX_OperationsService.confirmTransferInDB(trf, updatedStock, state.profile?.name)
    updateLocalCachePayload('transfers', newTransfers); updateLocalCachePayload('inventoryStock', updatedStock)
    return { transfers: newTransfers, inventoryStock: updatedStock }
  }),

  addTransfer: (newTrf) => {
    const discrepancy = checkTransferAuditDiscrepancy(newTrf, get().stockAudits, get().warehouses)
    const enriched = {
      ...newTrf,
      isAuditDiscrepancy: newTrf.isAuditDiscrepancy ?? discrepancy.isAuditDiscrepancy,
      auditDiscrepancyNote: newTrf.auditDiscrepancyNote || discrepancy.auditDiscrepancyNote,
    }
    AX_OperationsService.addTransferInDB(enriched)
    set((state) => { const next = [enriched, ...state.transfers]; updateLocalCachePayload('transfers', next); return { transfers: next } })
  },

  cancelTransfer: (transferId) => recycleBinHelpers.rollbackTransfer(transferId, get().profile, set, get()),

  addManufacturingOrder: (order) => {
    AX_OperationsService.addManufacturingOrderInDB(order, get().profile)
    set((state) => applyManufacturingOrderState(state, order))
  },
  updateManufacturingOrder: (order) => {
    const oldOrder = (get().manufacturingOrders || []).find((m) => m.id === order.id)
    AX_OperationsService.updateManufacturingOrderInDB(order, get().profile, oldOrder)
    set((state) => updateManufacturingOrderState(state, order))
  },
  deleteManufacturingOrder: (orderId) => {
    const order = (get().manufacturingOrders || []).find((m) => m.id === orderId)
    AX_OperationsService.deleteManufacturingOrderInDB(orderId, get().profile, order)
    set((state) => deleteManufacturingOrderState(state, orderId))
  },
  addCashTransaction: (tx) => {
    AX_OperationsService.addCashTransactionInDB(tx, get().profile)
    set((state) => {
      const isCashIn = tx.type === 'client_receipt' || tx.type === 'other_income' || tx.type === 'misc_revenue'
      const isClient = tx.partyType === 'client' || (!tx.partyType && tx.type === 'client_receipt')
      const isSupplier = tx.partyType === 'supplier' || (!tx.partyType && tx.type === 'supplier_payment')
      const pId = tx.partyId || tx.party_id || null
      const updatedTreasuries = state.treasuryAccounts.map((t) => t.id === tx.treasuryId ? { ...t, balance: (Number(t.balance) || 0) + (isCashIn ? tx.amount : -tx.amount) } : t)
      const updatedClients = isClient ? state.clients.map((c) => ((pId && c.id === pId) || (!pId && tx.partyName === c.name)) ? { ...c, balance: (Number(c.balance) || 0) - tx.amount } : c) : state.clients
      const updatedSuppliers = isSupplier ? state.suppliers.map((s) => ((pId && s.id === pId) || (!pId && tx.partyName === s.name)) ? { ...s, balance: (Number(s.balance) || 0) - tx.amount } : s) : state.suppliers
      const nextTx = [tx, ...state.cashTransactions]
      updateLocalCachePayload('cashTransactions', nextTx); updateLocalCachePayload('treasuryAccounts', updatedTreasuries)
      updateLocalCachePayload('clients', updatedClients); updateLocalCachePayload('suppliers', updatedSuppliers)
      return { cashTransactions: nextTx, treasuryAccounts: updatedTreasuries, clients: updatedClients, suppliers: updatedSuppliers }
    })
  },
  deleteCashTransaction: (txId) => {
    const tx = (get().cashTransactions || []).find((t) => t.id === txId)
    if (!tx) return
    AX_OperationsService.deleteCashTransactionInDB(tx, get().profile)
    set((state) => {
      const isCashIn = tx.type === 'client_receipt' || tx.type === 'other_income' || tx.type === 'misc_revenue'
      const isClient = tx.partyType === 'client' || (!tx.partyType && tx.type === 'client_receipt')
      const isSupplier = tx.partyType === 'supplier' || (!tx.partyType && tx.type === 'supplier_payment')
      const amt = Number(tx.amount) || 0
      const pId = tx.partyId || tx.party_id || null
      const updatedTreasuries = state.treasuryAccounts.map((t) => t.id === (tx.treasuryId || tx.treasury_id) ? { ...t, balance: (Number(t.balance) || 0) + (isCashIn ? -amt : amt) } : t)
      const updatedClients = isClient ? state.clients.map((c) => ((pId && c.id === pId) || (!pId && tx.partyName === c.name)) ? { ...c, balance: (Number(c.balance) || 0) + amt } : c) : state.clients
      const updatedSuppliers = isSupplier ? state.suppliers.map((s) => ((pId && s.id === pId) || (!pId && tx.partyName === s.name)) ? { ...s, balance: (Number(s.balance) || 0) + amt } : s) : state.suppliers
      const nextTx = state.cashTransactions.filter((t) => t.id !== txId)
      updateLocalCachePayload('cashTransactions', nextTx); updateLocalCachePayload('treasuryAccounts', updatedTreasuries)
      updateLocalCachePayload('clients', updatedClients); updateLocalCachePayload('suppliers', updatedSuppliers)
      return { cashTransactions: nextTx, treasuryAccounts: updatedTreasuries, clients: updatedClients, suppliers: updatedSuppliers }
    })
  },

  confirmCashTransfer: (id) => {
    const list = Array.isArray(get().pendingCashTransfers) ? get().pendingCashTransfers : []
    const pct = list.find((p) => p && p.id === id)
    const pPromise = pct ? AX_OperationsService.confirmCashTransferInDB(pct, get().profile) : Promise.resolve()
    set((state) => {
      const currentList = Array.isArray(state.pendingCashTransfers) ? state.pendingCashTransfers : []
      const target = currentList.find((p) => p && p.id === id)
      if (!target || target.status === 'confirmed') return state
      const newTransfers = currentList.map((p) => (p && p.id === id ? { ...p, status: 'confirmed', confirmedAt: new Date().toISOString() } : p))
      const updatedTreasuries = (state.treasuryAccounts || []).map((t) => {
        let bal = Number(t.balance) || 0
        if (t.id === target.fromTreasuryId) bal = bal - Number(target.amount || 0)
        if (t.id === target.toTreasuryId) bal = bal + Number(target.amount || 0)
        return { ...t, balance: bal }
      })
      updateLocalCachePayload('pendingCashTransfers', newTransfers); updateLocalCachePayload('treasuryAccounts', updatedTreasuries)
      return { pendingCashTransfers: newTransfers, treasuryAccounts: updatedTreasuries }
    })
    return pPromise
  },

  addPendingCashTransfer: (pct) => {
    set((state) => {
      const currentList = Array.isArray(state.pendingCashTransfers) ? state.pendingCashTransfers : []
      const nextP = [pct, ...currentList]
      updateLocalCachePayload('pendingCashTransfers', nextP)
      return { pendingCashTransfers: nextP }
    })
    try { return AX_OperationsService.addCashTransferInDB(pct, get().profile) } catch { return Promise.resolve() }
  },

  addInvoice: async (inv) => {
    set((state) => processInvoiceStoreState(state, inv))
    const res = await AX_OperationsService.addInvoiceInDB(inv, get().profile)
    return res
  },
  updateInvoice: (id, updates) => { const oldInv = (get().invoices || []).find((i) => i.id === id); if (oldInv) AX_OperationsService.updateInvoiceInDB(oldInv, { ...oldInv, ...updates, id }, get().profile); set((state) => updateInvoiceStoreState(state, id, updates)) },
  deleteInvoice: (id) => { const inv = (get().invoices || []).find((i) => i.id === id); if (inv) AX_OperationsService.deleteInvoiceInDB(inv, get().profile); set((state) => { const next = deleteInvoiceStoreState(state, id); return { ...next, recycleBin: inv ? [{ id: generateUUID(), entityType: 'invoice', entityId: id, entityCode: inv.code, entityTitle: `فاتورة ${inv.code || ''} - ${inv.partyName || ''}`, originalData: inv, deletedAt: new Date().toISOString() }, ...(state.recycleBin || [])] : state.recycleBin } }) },
  restoreFromRecycleBin: (id) => recycleBinHelpers.restoreItem(get(), id, get().profile, set),
  purgeFromRecycleBin: (id) => recycleBinHelpers.purgeItem(id, set),
  rollbackStockAudit: (auditId) => recycleBinHelpers.rollbackAudit(auditId, get().profile, set, get()),
  deleteStockAudit: (auditId) => recycleBinHelpers.deleteAudit(auditId, get().profile, set, get()),
  updateTransfer: (id, updates) => { AX_OperationsService.updateTransferInDB(id, updates, get().profile); set((state) => { const next = (state.transfers || []).map((t) => t.id === id ? { ...t, ...updates } : t); updateLocalCachePayload('transfers', next); return { transfers: next } }) },
  rollbackTransfer: (id) => recycleBinHelpers.rollbackTransfer(id, get().profile, set, get()),
  deleteTransfer: (id) => recycleBinHelpers.deleteTransfer(id, get().profile, set, get()),

  addEmployee: (emp) => { AX_StaffOperationsService.upsertEmployeeInDB(emp); set((state) => { const updated = [emp, ...state.employees.filter((e) => e.id !== emp.id)]; try { localStorage.setItem('ax_staff_employees', JSON.stringify(updated)) } catch {}; return { employees: updated } }) },
  updateEmployee: (id, updates) => { const cur = get().employees.find((e) => e.id === id); if (cur) AX_StaffOperationsService.upsertEmployeeInDB({ ...cur, ...updates }); set((state) => { const updated = state.employees.map((e) => (e.id === id ? { ...e, ...updates } : e)); try { localStorage.setItem('ax_staff_employees', JSON.stringify(updated)) } catch {}; return { employees: updated } }) },
  deleteEmployee: (id) => { AX_StaffOperationsService.deleteEmployeeInDB(id); set((state) => { const updated = state.employees.filter((e) => e.id !== id); try { localStorage.setItem('ax_staff_employees', JSON.stringify(updated)) } catch {}; return { employees: updated } }) },
  toggleEmployeeStatus: (id) => set((state) => { const updated = state.employees.map((e) => (e.id === id ? { ...e, status: e.status === 'active' ? 'suspended' : 'active' } : e)); try { localStorage.setItem('ax_staff_employees', JSON.stringify(updated)) } catch {}; return { employees: updated } }),
  addStaffInvite: async (invite) => { const res = await AX_StaffOperationsService.addStaffInviteInDB(invite); const saved = res?.data || invite; set((state) => { const updated = [saved, ...state.staffInvites.filter((i) => i.id !== saved.id)]; try { localStorage.setItem('ax_staff_invites', JSON.stringify(updated)) } catch {}; return { staffInvites: updated } }); return res },
  revokeStaffInvite: async (inviteId) => { await AX_StaffOperationsService.revokeStaffInviteInDB(inviteId); set((state) => { const updated = state.staffInvites.filter((i) => i.id !== inviteId); try { localStorage.setItem('ax_staff_invites', JSON.stringify(updated)) } catch {}; return { staffInvites: updated } }) },
  updateStaffPermissions: async (userId, updates) => { await AX_StaffOperationsService.updateStaffPermissionsInDB(userId, updates); set((state) => { const updated = state.employees.map((e) => (e.id === userId ? { ...e, ...updates } : e)); try { localStorage.setItem('ax_staff_employees', JSON.stringify(updated)) } catch {}; return { employees: updated } }) },

  addCompanyEmployee: async (emp) => { const res = await AX_OperationsService.addCompanyEmployeeInDB(emp, get().profile); const saved = res?.data || emp; set((state) => { const next = [saved, ...(state.companyEmployees || []).filter((e) => e.id !== saved.id)]; try { localStorage.setItem('ax_company_employees', JSON.stringify(next)) } catch {}; return { companyEmployees: next } }); return res },
  updateCompanyEmployee: async (id, updates) => { const res = await AX_OperationsService.updateCompanyEmployeeInDB(id, updates, get().profile); set((state) => { const next = (state.companyEmployees || []).map((e) => (e.id === id ? { ...e, ...updates } : e)); try { localStorage.setItem('ax_company_employees', JSON.stringify(next)) } catch {}; return { companyEmployees: next } }); return res },
  deleteCompanyEmployee: async (id) => { const emp = (get().companyEmployees || []).find((e) => e.id === id); const res = await AX_OperationsService.deleteCompanyEmployeeInDB(id, get().profile, emp); set((state) => { const next = (state.companyEmployees || []).filter((e) => e.id !== id); try { localStorage.setItem('ax_company_employees', JSON.stringify(next)) } catch {}; return { companyEmployees: next } }); return res },
  saveEmployeeAttendance: async (records) => { const res = await AX_OperationsService.saveAttendanceBatchInDB(records, get().profile); set((state) => { const existing = [...(state.employeeAttendance || [])]; records.forEach((r) => { const idx = existing.findIndex((e) => e.date === r.date && (e.employeeId === (r.employeeId || r.employee_id) || e.employee_id === (r.employeeId || r.employee_id))); if (idx >= 0) existing[idx] = { ...existing[idx], ...r }; else existing.push(r) }); try { localStorage.setItem('ax_employee_attendance', JSON.stringify(existing)) } catch {}; return { employeeAttendance: existing } }); return res },
  loadCompanyEmployees: async () => { const res = await AX_OperationsService.fetchCompanyEmployeesFromDB(); if (res?.success && res.data) { set({ companyEmployees: res.data }); try { localStorage.setItem('ax_company_employees', JSON.stringify(res.data)) } catch {} } },
}))
