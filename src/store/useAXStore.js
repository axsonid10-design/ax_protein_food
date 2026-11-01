import { create } from 'zustand'
import { AX_OperationsService } from '../services/AX_OperationsService.js'
import { AX_StaffOperationsService } from '../services/AX_StaffOperationsService.js'
import { AX_CustomerOperationsService } from '../services/AX_CustomerOperationsService.js'
import { AX_SupplierOperationsService } from '../services/AX_SupplierOperationsService.js'
import { AX_DatabaseSync } from '../services/AX_DatabaseSync.js'
import { generateUUID } from '../utils/AX_UUID.js'
import { categoryHelpers } from './categoryHelpers.js'
import {
  initialCategories, initialSubCategories, initialSecondaryCategories,
  initialItems, initialWarehouses, initialDistributors, initialInventoryStock,
  initialTransfers, initialStockAudits, initialTreasuryAccounts,
  initialCashTransactions, initialPendingCashTransfers, initialManufacturingOrders,
  initialInvoices, initialClients, initialSuppliers, initialSalesReps,
  initialSalesRepLedger, initialNotifications,
} from './initialData.js'

export const useAXStore = create((set, get) => ({
  profile: (() => {
    try {
      const s = localStorage.getItem('ax_auth_user') || localStorage.getItem('ax_user_profile') || sessionStorage.getItem('ax_auth_user')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })(),
  isAuthLoading: false,
  realtimeTrigger: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingSyncCount: 0,
  isSyncing: false,
  lastSyncTime: null,
  activeModal: null,
  modalData: null,
  activeTab: (() => {
    try {
      if (typeof window !== 'undefined') {
        const p = new URLSearchParams(window.location.search).get('tab')
        return p || localStorage.getItem('ax_active_tab') || 'dashboard'
      }
    } catch {}
    return 'dashboard'
  })(),

  categories: initialCategories,
  subCategories: initialSubCategories,
  secondaryCategories: initialSecondaryCategories,

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
      const s = localStorage.getItem('ax_cached_db_payload')
      if (s) c = JSON.parse(s)
    } catch {}
    return {
      items: c?.items || initialItems,
      warehouses: c?.warehouses || initialWarehouses,
      distributors: c?.distributors || initialDistributors,
      inventoryStock: c?.inventoryStock || initialInventoryStock,
      transfers: c?.transfers || initialTransfers,
      stockAudits: c?.stockAudits || initialStockAudits,
      treasuryAccounts: c?.treasuryAccounts || initialTreasuryAccounts,
      cashTransactions: c?.cashTransactions || initialCashTransactions,
      pendingCashTransfers: c?.pendingCashTransfers || initialPendingCashTransfers,
      manufacturingOrders: c?.manufacturingOrders || initialManufacturingOrders,
      invoices: c?.invoices || initialInvoices,
      clients: c?.clients || initialClients,
      suppliers: c?.suppliers || initialSuppliers,
      salesReps: c?.salesReps || initialSalesReps,
      salesRepLedger: c?.salesRepLedger || initialSalesRepLedger,
      notifications: c?.notifications || initialNotifications,
    }
  })(),

  fetchDatabaseState: async () => {
    const payload = await AX_DatabaseSync.fetchFullDatabase()
    if (payload) get().hydrateFromSupabase(payload)
    return payload
  },

  hydrateFromSupabase: (payload) =>
    set((state) => ({
      ...state,
      ...payload,
      ...(payload?.clients ? { clients: payload.clients } : {}),
      ...(payload?.suppliers ? { suppliers: payload.suppliers } : {}),
      ...(payload?.salesReps ? { salesReps: payload.salesReps } : {}),
      ...(payload?.salesRepLedger ? { salesRepLedger: payload.salesRepLedger } : {}),
      ...(payload?.manufacturingOrders ? { manufacturingOrders: payload.manufacturingOrders } : {}),
      ...(payload?.pendingCashTransfers || payload?.cashTransfers
        ? { pendingCashTransfers: payload.pendingCashTransfers || payload.cashTransfers }
        : {}),
      ...(payload?.staffInvites ? { staffInvites: payload.staffInvites } : {}),
      ...(payload?.categories ? { categories: payload.categories } : {}),
      ...(payload?.subCategories ? { subCategories: payload.subCategories } : {}),
      ...(payload?.secondaryCategories ? { secondaryCategories: payload.secondaryCategories } : {}),
    })),

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
    try {
      localStorage.setItem('ax_active_tab', activeTab)
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('tab', activeTab)
        window.history.replaceState({}, '', url.toString())
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
          updatedStock[existIdx] = { ...updatedStock[existIdx], quantity: Number(openingStock.quantity), unit: openingStock.unit || item.unitType }
        } else {
          updatedStock.push({ warehouseId: openingStock.warehouseId, itemId: item.id, quantity: Number(openingStock.quantity), unit: openingStock.unit || item.unitType })
        }
      }
      return { items: [item, ...state.items], inventoryStock: updatedStock }
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
            updatedStock[existIdx] = { ...updatedStock[existIdx], quantity: Number(openingStock.quantity), unit: openingStock.unit || item.unitType }
          } else {
            updatedStock.push({ warehouseId: openingStock.warehouseId, itemId: item.id, quantity: Number(openingStock.quantity), unit: openingStock.unit || item.unitType })
          }
        }
      })
      return { items: [...newItems, ...state.items], inventoryStock: updatedStock }
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
        const idx = updatedInventory.findIndex((s) => s.warehouseId === adj.warehouseId && s.itemId === adj.itemId)
        if (idx !== -1) {
          updatedInventory[idx] = { ...updatedInventory[idx], quantity: Number(adj.actualQty), unit: adj.unit || updatedInventory[idx].unit }
        } else {
          updatedInventory.push({ warehouseId: adj.warehouseId, itemId: adj.itemId, quantity: Number(adj.actualQty), unit: adj.unit || 'كرتونة' })
        }
      })
      return { stockAudits: newAudits, inventoryStock: updatedInventory }
    })
  },

  editItem: (item) => {
    AX_OperationsService.editItemInDB(item, get().profile)
    set((state) => ({
      items: state.items.map((i) => (i.id === item.id ? { ...i, ...item } : i)),
    }))
  },

  deleteItem: (id) => {
    AX_OperationsService.deleteItemInDB(id, get().profile)
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
      inventoryStock: state.inventoryStock.filter((s) => s.itemId !== id),
    }))
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

  addClient: (client) => { AX_CustomerOperationsService.addCustomerInDB(client, get().profile); set((state) => ({ clients: [client, ...state.clients.filter((c) => c.id !== client.id)] })) },
  updateClient: (id, updates) => { AX_CustomerOperationsService.updateCustomerInDB({ id, ...updates }, get().profile); set((state) => ({ clients: state.clients.map((c) => (c.id === id ? { ...c, ...updates } : c)) })) },
  deleteClient: (id) => { AX_CustomerOperationsService.deleteCustomerInDB(id, get().profile); set((state) => ({ clients: state.clients.filter((c) => c.id !== id) })) },

  addSupplier: (supplier) => { AX_SupplierOperationsService.addSupplierInDB(supplier, get().profile); set((state) => ({ suppliers: [supplier, ...state.suppliers.filter((s) => s.id !== supplier.id)] })) },
  updateSupplier: (id, updates) => { AX_SupplierOperationsService.updateSupplierInDB({ id, ...updates }, get().profile); set((state) => ({ suppliers: state.suppliers.map((s) => (s.id === id ? { ...s, ...updates } : s)) })) },
  deleteSupplier: (id) => { AX_SupplierOperationsService.deleteSupplierInDB(id, get().profile); set((state) => ({ suppliers: state.suppliers.filter((s) => s.id !== id) })) },

  addSalesRep: (rep) => set((state) => ({ salesReps: [rep, ...(state.salesReps || []).filter((r) => r.id !== rep.id)] })),
  updateSalesRep: (id, updates) => set((state) => ({ salesReps: (state.salesReps || []).map((r) => (r.id === id ? { ...r, ...updates } : r)) })),
  deleteSalesRep: (id) => set((state) => ({
    salesReps: (state.salesReps || []).filter((r) => r.id !== id),
    salesRepLedger: (state.salesRepLedger || []).filter((tx) => tx.repId !== id),
  })),

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
    const updatedReps = (state.salesReps || []).map((r) => {
      if (r.id !== newTx.repId) return r
      const cur = Number(r.currentBalance ?? r.netBalance ?? r.balance ?? 0)
      const nextBal = cur + delta
      return { ...r, currentBalance: nextBal, netBalance: nextBal, balance: nextBal }
    })
    return { salesRepLedger: updatedLedger, salesReps: updatedReps }
  }),

  updateSystemSettings: (newSettings) => set((state) => {
    const updated = { ...state.systemSettings, ...newSettings }
    try { localStorage.setItem('ax_system_settings', JSON.stringify(updated)) } catch {}
    return { systemSettings: updated }
  }),

  addWarehouse: (newWh) => { AX_OperationsService.addWarehouseInDB(newWh, get().profile); set((state) => ({ warehouses: [...state.warehouses, newWh] })) },
  editWarehouse: (updatedWh) => { AX_OperationsService.editWarehouseInDB(updatedWh, get().profile); set((state) => ({ warehouses: state.warehouses.map((w) => (w.id === updatedWh.id ? { ...w, ...updatedWh } : w)) })) },
  deleteWarehouse: (id) => { AX_OperationsService.deleteWarehouseInDB(id, get().profile); set((state) => ({ warehouses: state.warehouses.filter((w) => w.id !== id), inventoryStock: state.inventoryStock.filter((s) => s.warehouseId !== id) })) },
  addTreasuryAccount: (account) => { AX_OperationsService.addTreasuryAccountInDB(account, get().profile); set((state) => ({ treasuryAccounts: [...state.treasuryAccounts, account] })) },

  confirmTransfer: (transferId) => set((state) => {
    const trf = state.transfers.find((t) => t.id === transferId)
    if (!trf || trf.status === 'confirmed') return state

    const newTransfers = state.transfers.map((t) =>
      t.id === transferId ? { ...t, status: 'confirmed', confirmedAt: new Date().toISOString() } : t
    )

    let updatedStock = [...state.inventoryStock]
    const fromTargetId = trf.fromId || trf.fromWarehouseId
    const toTargetId = trf.toId || trf.toWarehouseId
    const transferItems = trf.items && trf.items.length > 0 ? trf.items : [{ itemId: trf.itemId, quantity: trf.quantity, unit: trf.unit }]

    transferItems.forEach((item) => {
      const fromIndex = updatedStock.findIndex((s) => s.warehouseId === fromTargetId && s.itemId === item.itemId)
      if (fromIndex >= 0) {
        updatedStock[fromIndex] = { ...updatedStock[fromIndex], quantity: Math.max(0, updatedStock[fromIndex].quantity - item.quantity) }
      }
      const toIndex = updatedStock.findIndex((s) => s.warehouseId === toTargetId && s.itemId === item.itemId)
      if (toIndex >= 0) {
        updatedStock[toIndex] = { ...updatedStock[toIndex], quantity: updatedStock[toIndex].quantity + item.quantity }
      } else {
        updatedStock.push({ warehouseId: toTargetId, itemId: item.itemId, quantity: item.quantity, unit: item.unit })
      }
    })

    AX_OperationsService.confirmTransferInDB(trf, updatedStock, state.profile?.name)
    return { transfers: newTransfers, inventoryStock: updatedStock }
  }),

  addTransfer: (newTrf) => {
    AX_OperationsService.addTransferInDB(newTrf)
    set((state) => ({ transfers: [newTrf, ...state.transfers] }))
  },

  cancelTransfer: (transferId) => {
    AX_OperationsService.cancelTransferInDB(transferId, get().profile)
    set((state) => ({
      transfers: state.transfers.map((t) => (t.id === transferId ? { ...t, status: 'cancelled' } : t)),
    }))
  },

  addManufacturingOrder: (order) => {
    AX_OperationsService.addManufacturingOrderInDB(order, get().profile)
    set((state) => {
      let updatedStock = [...state.inventoryStock]
      const rawIdx = updatedStock.findIndex((s) => s.warehouseId === order.rawWarehouseId && s.itemId === order.rawItemId)
      if (rawIdx >= 0) {
        updatedStock[rawIdx] = { ...updatedStock[rawIdx], quantity: Math.max(0, updatedStock[rawIdx].quantity - order.consumedQuantity) }
      }
      order.producedItems?.forEach((prod) => {
        const pIdx = updatedStock.findIndex((s) => s.warehouseId === prod.targetWarehouseId && s.itemId === prod.itemId)
        if (pIdx >= 0) {
          updatedStock[pIdx] = { ...updatedStock[pIdx], quantity: updatedStock[pIdx].quantity + prod.quantity }
        } else {
          updatedStock.push({ warehouseId: prod.targetWarehouseId, itemId: prod.itemId, quantity: prod.quantity, unit: prod.unit || 'كرتونة' })
        }
      })
      return {
        manufacturingOrders: [order, ...state.manufacturingOrders],
        inventoryStock: updatedStock,
      }
    })
  },

  addCashTransaction: (tx) => {
    AX_OperationsService.addCashTransactionInDB(tx, get().profile)
    set((state) => {
      const updatedTreasuries = state.treasuryAccounts.map((t) => t.id === tx.treasuryId ? { ...t, balance: t.balance + (tx.type === 'client_receipt' ? tx.amount : -tx.amount) } : t)
      const updatedClients = state.clients.map((c) => (tx.partyId === c.id || tx.partyName === c.name) ? { ...c, balance: Math.max(0, c.balance - tx.amount) } : c)
      const updatedSuppliers = state.suppliers.map((s) => (tx.partyId === s.id || tx.partyName === s.name) ? { ...s, balance: Math.max(0, s.balance - tx.amount) } : s)
      return { cashTransactions: [tx, ...state.cashTransactions], treasuryAccounts: updatedTreasuries, clients: updatedClients, suppliers: updatedSuppliers }
    })
  },

  confirmCashTransfer: (id) => {
    const pct = get().pendingCashTransfers.find((p) => p.id === id)
    if (pct) AX_OperationsService.confirmCashTransferInDB(pct, get().profile)
    set((state) => {
      const target = state.pendingCashTransfers.find((p) => p.id === id)
      if (!target || target.status === 'confirmed') return state
      const newTransfers = state.pendingCashTransfers.map((p) => p.id === id ? { ...p, status: 'confirmed', confirmedAt: new Date().toISOString() } : p)
      const updatedTreasuries = state.treasuryAccounts.map((t) => {
        if (t.id === target.fromTreasuryId) return { ...t, balance: Math.max(0, t.balance - target.amount) }
        if (t.id === target.toTreasuryId) return { ...t, balance: t.balance + target.amount }
        return t
      })
      return { pendingCashTransfers: newTransfers, treasuryAccounts: updatedTreasuries }
    })
  },

  addPendingCashTransfer: (pct) => {
    AX_OperationsService.addCashTransferInDB(pct, get().profile)
    set((state) => ({ pendingCashTransfers: [pct, ...state.pendingCashTransfers] }))
  },

  addInvoice: (inv) => {
    AX_OperationsService.addInvoiceInDB(inv, get().profile)
    set((state) => {
      let updatedClients = [...state.clients]
      let updatedSuppliers = [...state.suppliers]
      if (inv.type === 'sale') {
        const cIdx = updatedClients.findIndex((c) => c.name === inv.partyName)
        if (cIdx >= 0) {
          updatedClients[cIdx] = { ...updatedClients[cIdx], balance: updatedClients[cIdx].balance + inv.remainingAmount }
        } else {
          updatedClients.unshift({ id: generateUUID(), name: inv.partyName, balance: inv.remainingAmount, phone: '', address: 'بيانات ناقصة' })
        }
      } else {
        const sIdx = updatedSuppliers.findIndex((s) => s.name === inv.partyName)
        if (sIdx >= 0) {
          updatedSuppliers[sIdx] = { ...updatedSuppliers[sIdx], balance: updatedSuppliers[sIdx].balance + inv.remainingAmount }
        } else {
          updatedSuppliers.unshift({ id: generateUUID(), name: inv.partyName, balance: inv.remainingAmount, phone: '', address: 'بيانات ناقصة' })
        }
      }
      let updatedStock = [...state.inventoryStock]
      inv.items?.forEach((item) => {
        const sIdx = updatedStock.findIndex((s) => s.warehouseId === inv.warehouseId && s.itemId === item.itemId)
        if (sIdx >= 0) {
          const delta = inv.type === 'sale' ? -item.quantity : item.quantity
          updatedStock[sIdx] = { ...updatedStock[sIdx], quantity: Math.max(0, updatedStock[sIdx].quantity + delta) }
        }
      })
      let updatedTreasuries = [...state.treasuryAccounts]
      let updatedCashTx = [...state.cashTransactions]
      if (inv.paidAmount > 0) {
        const tIdx = updatedTreasuries.findIndex((t) => t.id === inv.treasuryId)
        const trIndex = tIdx >= 0 ? tIdx : 0
        if (updatedTreasuries[trIndex]) {
          const delta = inv.type === 'sale' ? inv.paidAmount : -inv.paidAmount
          updatedTreasuries[trIndex] = { ...updatedTreasuries[trIndex], balance: updatedTreasuries[trIndex].balance + delta }
        }
        updatedCashTx.unshift({
          id: generateUUID(),
          code: (inv.type === 'sale' ? 'REC-' : 'PAY-') + Date.now().toString().slice(-4),
          type: inv.type === 'sale' ? 'client_receipt' : 'supplier_payment',
          partyName: inv.partyName,
          amount: inv.paidAmount,
          treasuryId: inv.treasuryId || updatedTreasuries[0]?.id,
          date: inv.date,
          notes: inv.type === 'sale' ? `تحصيل نقدي - فاتورة مبيعات ${inv.code}` : `سداد نقدي - فاتورة مشتريات ${inv.code}`,
        })
      }
      return {
        invoices: [inv, ...state.invoices],
        clients: updatedClients,
        suppliers: updatedSuppliers,
        inventoryStock: updatedStock,
        treasuryAccounts: updatedTreasuries,
        cashTransactions: updatedCashTx,
      }
    })
  },

  addEmployee: (emp) => {
    AX_StaffOperationsService.upsertEmployeeInDB(emp)
    set((state) => {
      const updated = [emp, ...state.employees.filter((e) => e.id !== emp.id)]
      try { localStorage.setItem('ax_staff_employees', JSON.stringify(updated)) } catch {}
      return { employees: updated }
    })
  },
  updateEmployee: (id, updates) => {
    const cur = get().employees.find((e) => e.id === id)
    if (cur) AX_StaffOperationsService.upsertEmployeeInDB({ ...cur, ...updates })
    set((state) => {
      const updated = state.employees.map((e) => (e.id === id ? { ...e, ...updates } : e))
      try { localStorage.setItem('ax_staff_employees', JSON.stringify(updated)) } catch {}
      return { employees: updated }
    })
  },
  deleteEmployee: (id) => {
    AX_StaffOperationsService.deleteEmployeeInDB(id)
    set((state) => {
      const updated = state.employees.filter((e) => e.id !== id)
      try { localStorage.setItem('ax_staff_employees', JSON.stringify(updated)) } catch {}
      return { employees: updated }
    })
  },
  toggleEmployeeStatus: (id) => set((state) => {
    const updated = state.employees.map((e) => (e.id === id ? { ...e, status: e.status === 'active' ? 'suspended' : 'active' } : e))
    try { localStorage.setItem('ax_staff_employees', JSON.stringify(updated)) } catch {}
    return { employees: updated }
  }),

  addStaffInvite: async (invite) => {
    const res = await AX_StaffOperationsService.addStaffInviteInDB(invite)
    const saved = res?.data || invite
    set((state) => {
      const updated = [saved, ...state.staffInvites.filter((i) => i.id !== saved.id)]
      try { localStorage.setItem('ax_staff_invites', JSON.stringify(updated)) } catch {}
      return { staffInvites: updated }
    })
    return res
  },

  revokeStaffInvite: async (inviteId) => {
    await AX_StaffOperationsService.revokeStaffInviteInDB(inviteId)
    set((state) => {
      const updated = state.staffInvites.filter((i) => i.id !== inviteId)
      try { localStorage.setItem('ax_staff_invites', JSON.stringify(updated)) } catch {}
      return { staffInvites: updated }
    })
  },

  updateStaffPermissions: async (userId, updates) => {
    await AX_StaffOperationsService.updateStaffPermissionsInDB(userId, updates)
    set((state) => {
      const updated = state.employees.map((e) => (e.id === userId ? { ...e, ...updates } : e))
      try { localStorage.setItem('ax_staff_employees', JSON.stringify(updated)) } catch {}
      return { employees: updated }
    })
  },
}))
