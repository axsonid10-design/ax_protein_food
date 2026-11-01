# Handoff Report: Milestone 4 Explorer 3 (Service Integration, Persistence & Automated Test Suite)

## 1. Observation

### 1.1 Non-Existence of `AX_SalesRepOperationsService.js`
- **File Search:** `find_by_name` in `src/services/` returned 13 files (`AX_CategoryOperationsService.js`, `AX_CustomerOperationsService.js`, `AX_DatabaseSync.js`, `AX_ItemOperationsService.js`, `AX_OperationsService.js`, `AX_PushNotificationService.js`, `AX_StaffOperationsService.js`, `AX_SupplierOperationsService.js`, `axToast.js`, `imageKitService.js`, `offlineDB.js`, `offlineSync.js`, `supabaseClient.js`).
- `src/services/AX_SalesRepOperationsService.js` is **completely absent**.
- In `src/components/sales_reps/AX_SalesRepsManager.jsx` (lines 74–79):
  ```javascript
  const handleDeleteConfirm = () => {
    if (!deletingRep) return
    deleteSalesRep(deletingRep.id)
    showToast('تم حذف المندوب بنجاح', 'success')
    setDeletingRep(null)
  }
  ```
  Deletions only touch local store state without calling any backend/persistence service.
- In `src/components/sales_reps/AX_AddSalesRepModal.jsx` (line 78):
  `addSalesRep(newRep)` is called without invoking any database service.
- In `src/components/sales_reps/AX_EditSalesRepModal.jsx` (line 89):
  `updateSalesRep(rep.id, updates)` is called without invoking any database service.

### 1.2 Reference Service Architecture Patterns
- `src/services/AX_CustomerOperationsService.js` (lines 4–35) and `src/services/AX_SupplierOperationsService.js` (lines 4–35) establish the standard AXONID service contract:
  - Guard check: `if (!isSupabaseConfigured() || !supabase?.from || !record) return { success: false }`
  - Fallback error boundary: wrapped in `try { ... } catch (err) { return { success: false, error: err.message } }`
  - Mandatory activity logging trigger: `supabase.from('ax_activity_logs').insert(...)`
  - Safe return shape: `{ success: true, id }` or `{ success: false, error }`.

### 1.3 Critical Structural Bug in Sales Rep Ledger Persistence
- **Initial Data Structure:** `src/store/initialData.js` lines 379–386:
  ```javascript
  export const initialSalesRepLedger = [
    { id: 'tx-rep-1', repId: 'rep-1', date: '2026-10-01', type: 'opening_balance', amount: 12500, notes: 'رصيد افتتاحي مرحل للشهر الجاري' },
    { id: 'tx-rep-2', repId: 'rep-1', date: '2026-10-15', type: 'commission', amount: 8950, notes: '...', invoiceId: '...' },
    { id: 'tx-rep-3', repId: 'rep-1', date: '2026-10-20', type: 'payment', amount: 3000, notes: '...' },
    ...
  ]
  ```
  `initialSalesRepLedger` is an **Array** of transaction objects containing `repId`.
- **Store Definition:** `src/store/useAXStore.js`:
  - Line 78: `salesRepLedger: initialSalesRepLedger,` (initialized as an Array).
  - Lines 238–239:
    ```javascript
    deleteSalesRep: (id) => set((state) => ({
      salesReps: (state.salesReps || []).filter((r) => r.id !== id),
      salesRepLedger: (state.salesRepLedger || []).filter((tx) => tx.repId !== id),
    })),
    ```
    Confirms `salesRepLedger` is expected to be an Array filtered by `tx.repId`.
  - Lines 242–256:
    ```javascript
    addSalesRepTransaction: (tx) => set((state) => {
      if (!tx) return state
      const newTx = { id: tx.id || generateUUID(), date: tx.date || new Date().toISOString().split('T')[0], ...tx }
      const updatedLedger = [newTx, ...(state.salesRepLedger || [])]
      const updatedReps = (state.salesReps || []).map((r) => {
        if (r.id !== tx.repId) return r
        ...
      })
      return { salesRepLedger: updatedLedger, salesReps: updatedReps }
    }),
    ```
    Expects a single argument `tx` containing `repId`.
- **UI Mismatch 1 (Dictionary Access on Array):** `src/components/sales_reps/AX_SalesRepLedgerModal.jsx` (lines 21, 27–30):
  ```javascript
  const { salesRepLedger = {}, addSalesRepTransaction } = useAXStore()
  ...
  const repTransactions = useMemo(() => {
    if (!rep?.id) return []
    return salesRepLedger[rep.id] || []
  }, [rep, salesRepLedger])
  ```
  `salesRepLedger[rep.id]` queries an Array by string key (`rep-1`), which yields `undefined`. Consequently, `repTransactions` is ALWAYS empty (`[]`), and the ledger statement never renders transactions!
- **UI Mismatch 2 (Argument Signature Mismatch):**
  - In `AX_SalesRepLedgerModal.jsx` line 55:
    `addSalesRepTransaction(rep.id, tx)` passes `rep.id` as first argument, and `tx` without `repId` as second argument.
  - In `AX_SalesRepCommissionModal.jsx` line 70:
    `addSalesRepTransaction(rep.id, tx)` passes `rep.id` as first argument, and `tx` without `repId` as second argument.
  - In `useAXStore.js` line 242: `addSalesRepTransaction: (tx) => ...` receives the string `'rep-1'` as `tx`, resulting in a corrupted transaction and no rep balance update (`r.id !== tx.repId` never matches because `tx.repId` is `undefined`).

### 1.4 Test Infrastructure State & Dual-Runner Execution
- Current test execution results:
  - `npm test` (`node --test tests/*.test.js`): **419 passed, 0 failed** in 2.04 seconds.
  - `npm run test:vitest` (`vitest run`): **416 passed across 25 test files** in 4.58 seconds.
- `tests/tier1-sales-reps.test.js` (lines 6–114) duplicates `calculateCommission` and `computeRepLedgerBalance` as local functions inside the test file instead of importing from `src/components/sales_reps/AX_CommissionEngine.js`.
- There is currently no `tests/m4-sales-reps-integration.test.js` (analogous to `tests/m2-customers-integration.test.js` and `tests/m3-suppliers-integration.test.js`).

---

## 2. Logic Chain

1. **Service Layer Gap:**
   - Milestone 2 and Milestone 3 created `AX_CustomerOperationsService.js` and `AX_SupplierOperationsService.js` to handle persistence, Supabase synchronization, activity logging (`ax_activity_logs`), and graceful offline fallbacks.
   - Milestone 4 handles Sales Representatives (R3). Because `AX_SalesRepOperationsService.js` does not exist, Sales Rep operations (Add, Edit, Delete, Commission and Payout Ledger transactions) are currently in-memory only in UI modals.
   - Therefore, `src/services/AX_SalesRepOperationsService.js` must be implemented and connected to `AX_SalesRepsManager.jsx`, `AX_AddSalesRepModal.jsx`, `AX_EditSalesRepModal.jsx`, `AX_SalesRepCommissionModal.jsx`, and `AX_SalesRepLedgerModal.jsx`.

2. **Root Cause of Broken Ledger Modal:**
   - In `useAXStore.js` and `initialData.js`, `salesRepLedger` is an Array of transaction items with `repId: 'rep-1'`.
   - In `AX_SalesRepLedgerModal.jsx`, line 29 accesses `salesRepLedger[rep.id]`, assuming an Object map (`{ 'rep-1': [...] }`). On an Array, this returns `undefined`.
   - Furthermore, modals invoke `addSalesRepTransaction(rep.id, tx)`, whereas `useAXStore.js` was written as `addSalesRepTransaction: (tx) => ...`. The first parameter received is the string ID, not the transaction object.
   - Therefore, `addSalesRepTransaction` in `useAXStore.js` must be made polymorphic to handle both `(txWithRepId)` and `(repId, txObject)`, and `AX_SalesRepLedgerModal.jsx` must support Array filtering with fallback to dictionary access.

3. **Test Infrastructure Alignment:**
   - Per `TEST_INFRA.md` §1.1 ("Zero-Facade Guarantee"), tests must exercise production code. `tests/tier1-sales-reps.test.js` currently mocks its own calculation logic locally.
   - Refactoring `tests/tier1-sales-reps.test.js` to import directly from `src/components/sales_reps/AX_CommissionEngine.js` will validate the real production engine.
   - Creating `tests/m4-sales-reps-integration.test.js` will comprehensively verify:
     - Profile creation and field normalization.
     - Pure calculations of all 4 commission models (`volume_rate`, `category_percentage`, `target_tier`, `hybrid`).
     - Running balance ledger tracking and payout deductions.
     - Sales target progress calculation and zero-target guards.
     - Store state actions (`addSalesRep`, `updateSalesRep`, `deleteSalesRep`, `addSalesRepTransaction`).
     - Safe service execution when Supabase is unconfigured (`AX_SalesRepOperationsService.js`).
     - Role-Based Access Control (RBAC) permission enforcement for `sales_reps` in `src/utils/permissionsConfig.js`.

---

## 3. Caveats

1. **Supabase Database Schema:**
   - The Supabase project currently contains table `ax_distributors` with columns (`id`, `name`, `van_number`, `phone`, `balance`, `status`, `created_at`). Table `ax_sales_reps` does not yet exist in Supabase DDL.
   - `AX_SalesRepOperationsService.js` must safely target `ax_distributors` (or handle missing tables) inside a `try/catch` block so that environments without Supabase credentials or custom tables never throw errors or crash the UI.
2. **File Size Invariants:**
   - AXONID Rule 7 and `tests/file-invariants.test.js` enforce a strict 500-line limit per file. All created or modified files must stay strictly under 500 lines.
3. **No Code Modification Constraint:**
   - In accordance with the Explorer role instructions, no source files were modified during this investigation. Concrete implementation templates are provided below for the Worker.

---

## 4. Conclusion & Concrete Implementation Recommendations for Worker

### Recommendation 1: Create `src/services/AX_SalesRepOperationsService.js` (< 130 lines)
The file must export `AX_SalesRepOperationsService` with the following methods:
- `addSalesRepInDB(salesRep, userProfile = null)`
- `updateSalesRepInDB(salesRep, userProfile = null)`
- `deleteSalesRepInDB(salesRepId, userProfile = null)`
- `addSalesRepTransactionInDB(tx, userProfile = null)`

```javascript
import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { generateUUID } from '../utils/AX_UUID.js'

export const AX_SalesRepOperationsService = {
  addSalesRepInDB: async (rep, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !rep) return { success: false }
    try {
      const repId = rep.id || generateUUID()
      const row = {
        id: repId,
        name: (rep.name || '').trim(),
        phone: (rep.phone || '').trim(),
        balance: Number(rep.currentBalance ?? rep.netBalance ?? rep.balance ?? 0),
        status: 'active',
        van_number: (rep.assignedBranch || '').trim(),
        created_at: rep.createdAt || new Date().toISOString(),
      }

      try {
        await supabase.from('ax_distributors').insert(row)
      } catch {}

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_sales_reps',
          action: 'INSERT',
          record_id: repId,
          new_data: { ...row, repData: rep },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true, id: repId }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  updateSalesRepInDB: async (rep, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !rep?.id) return { success: false }
    try {
      const row = {
        name: (rep.name || '').trim(),
        phone: (rep.phone || '').trim(),
        balance: Number(rep.currentBalance ?? rep.netBalance ?? rep.balance ?? 0),
      }

      try {
        await supabase.from('ax_distributors').update(row).eq('id', rep.id)
      } catch {}

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_sales_reps',
          action: 'UPDATE',
          record_id: rep.id,
          new_data: { ...row, repData: rep },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteSalesRepInDB: async (repId, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !repId) return { success: false }
    try {
      try {
        await supabase.from('ax_distributors').delete().eq('id', repId)
      } catch {}

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_sales_reps',
          action: 'DELETE',
          record_id: repId,
          new_data: { id: repId },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  addSalesRepTransactionInDB: async (tx, userProfile = null) => {
    if (!isSupabaseConfigured() || !supabase?.from || !tx) return { success: false }
    try {
      const txId = tx.id || generateUUID()
      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_sales_rep_ledger',
          action: 'INSERT',
          record_id: txId,
          new_data: tx,
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true, id: txId }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },
}

export default AX_SalesRepOperationsService
```

### Recommendation 2: Patch `useAXStore.js` `addSalesRepTransaction` Signature
Replace lines 242–256 in `src/store/useAXStore.js`:
```javascript
  addSalesRepTransaction: (arg1, arg2) => set((state) => {
    const tx = arg2 ? { ...arg2, repId: arg1 } : arg1
    if (!tx || !tx.repId) return state
    const amount = Math.abs(Number(tx.amount) || 0)
    let delta = 0
    if (tx.type === 'commission' || tx.type === 'bonus') delta = amount
    else if (tx.type === 'payment' || tx.type === 'disbursement') delta = -amount
    const newTx = {
      id: tx.id || generateUUID(),
      repId: tx.repId,
      date: tx.date || new Date().toISOString().split('T')[0],
      amount,
      type: tx.type,
      notes: tx.notes || tx.description || '',
      description: tx.description || tx.notes || '',
      invoiceId: tx.invoiceId || null,
    }
    const currentLedger = Array.isArray(state.salesRepLedger) ? state.salesRepLedger : []
    const updatedLedger = [newTx, ...currentLedger]
    const updatedReps = (state.salesReps || []).map((r) => {
      if (r.id !== tx.repId) return r
      const cur = Number(r.currentBalance ?? r.netBalance ?? r.balance ?? 0)
      const nextBal = cur + delta
      return { ...r, currentBalance: nextBal, netBalance: nextBal, balance: nextBal }
    })
    return { salesRepLedger: updatedLedger, salesReps: updatedReps }
  }),
```

### Recommendation 3: Fix `AX_SalesRepLedgerModal.jsx` Array Filtering & Payout Call
1. In line 27–30 of `src/components/sales_reps/AX_SalesRepLedgerModal.jsx`:
   ```javascript
   const repTransactions = useMemo(() => {
     if (!rep?.id) return []
     if (Array.isArray(salesRepLedger)) {
       return salesRepLedger.filter((t) => t.repId === rep.id)
     }
     return salesRepLedger[rep.id] || []
   }, [rep, salesRepLedger])
   ```
2. In `handleRecordPayout` (line 47–56):
   ```javascript
   const tx = {
     id: `payout-${Date.now()}`,
     repId: rep.id,
     amount: amt,
     type: 'payment',
     notes: payoutDescription.trim() || 'صرف عمولات / دفعة نقدية للمندوب',
     description: payoutDescription.trim() || 'صرف عمولات / دفعة نقدية للمندوب',
     date: new Date().toISOString().split('T')[0],
   }
   addSalesRepTransaction(rep.id, tx)
   AX_SalesRepOperationsService.addSalesRepTransactionInDB(tx, profile)
   ```

### Recommendation 4: Connect Service Calls Across Sales Reps Components
- `AX_SalesRepsManager.jsx`: In `handleDeleteConfirm`, call `AX_SalesRepOperationsService.deleteSalesRepInDB(deletingRep.id, profile)`.
- `AX_AddSalesRepModal.jsx`: In `handleSubmit`, call `AX_SalesRepOperationsService.addSalesRepInDB(newRep, profile)`.
- `AX_EditSalesRepModal.jsx`: In `handleSubmit`, call `AX_SalesRepOperationsService.updateSalesRepInDB({ id: rep.id, ...updates }, profile)`.
- `AX_SalesRepCommissionModal.jsx`: In `handleApplyToLedger`, ensure `tx` includes `repId: rep.id` and call `AX_SalesRepOperationsService.addSalesRepTransactionInDB(tx, profile)`.

### Recommendation 5: Create `tests/m4-sales-reps-integration.test.js` (< 250 lines)
Must include:
1. `should normalize and create full sales rep profile with target and branch`
2. `should calculate commissions across volume_rate, category_percentage, target_tier, and hybrid models via AX_CommissionEngine`
3. `should accurately calculate ledger running balance with opening balance and payouts via computeRepLedgerBalance`
4. `should compute sales target progress and handle zero target cleanly via computeSalesTargetProgress`
5. `should update store state and cascade deletions to salesRepLedger`
6. `should safely invoke AX_SalesRepOperationsService methods without errors when Supabase is unconfigured`
7. `should strictly enforce sales_reps RBAC permissions across all preset roles`

### Recommendation 6: Refactor `tests/tier1-sales-reps.test.js`
Replace lines 6–114 with direct imports from `src/components/sales_reps/AX_CommissionEngine.js`:
```javascript
import { calculateCommission, computeRepLedgerBalance } from '../src/components/sales_reps/AX_CommissionEngine.js'
```

---

## 5. Verification Method

1. **Run Full Test Suite via Node Native Test Runner:**
   ```powershell
   npm test
   ```
   **Expected:** All tests pass with exit code `0` (419+ tests).
2. **Run Full Test Suite via Vitest:**
   ```powershell
   npm run test:vitest
   ```
   **Expected:** All 26 test files pass with exit code `0`.
3. **Verify File Line Invariants:**
   Run `node --test tests/file-invariants.test.js` to ensure neither `src/services/AX_SalesRepOperationsService.js` nor any modified components exceed 500 lines.
4. **Invalidation Conditions:**
   - If `AX_SalesRepOperationsService.js` throws unhandled rejections when Supabase is unconfigured.
   - If `AX_SalesRepLedgerModal.jsx` fails to render ledger entries for `rep-1` or `rep-2` from `initialSalesRepLedger`.
   - If calling `addSalesRepTransaction(rep.id, tx)` fails to deduct payout from rep's `currentBalance`.
