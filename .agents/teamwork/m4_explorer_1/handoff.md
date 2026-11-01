# Milestone 4 Investigation Report: Sales Representatives & Commission Engine (R3 / F13, F14, F15, F16)

## 1. Observation

### 1.1 Architecture & Component State
The Sales Representatives and Commission module resides under `src/components/sales_reps/` with 8 core files:
- `src/components/sales_reps/AX_CommissionEngine.js` (118 lines)
- `src/components/sales_reps/AX_SalesRepsManager.jsx` (261 lines)
- `src/components/sales_reps/AX_SalesRepsTable.jsx` (134 lines)
- `src/components/sales_reps/AX_SalesRepsBentoCards.jsx` (127 lines)
- `src/components/sales_reps/AX_AddSalesRepModal.jsx` (262 lines)
- `src/components/sales_reps/AX_EditSalesRepModal.jsx` (269 lines)
- `src/components/sales_reps/AX_SalesRepCommissionModal.jsx` (206 lines)
- `src/components/sales_reps/AX_SalesRepLedgerModal.jsx` (255 lines)
All 8 files strictly comply with the AXONID 500-line limit (verified via `npm test` running `tests/file-invariants.test.js`). The entire test suite currently passes with 419 passing tests across 40 suites.

### 1.2 Identified Bugs & Interface Discrepancies

#### A. Critical Ledger Discrepancy (Array vs Object & Function Arity)
In `src/store/initialData.js` (lines 379–386), `initialSalesRepLedger` is initialized as a flat Array of transactions:
```javascript
export const initialSalesRepLedger = [
  { id: 'tx-rep-1', repId: 'rep-1', date: '2026-10-01', type: 'opening_balance', amount: 12500, notes: 'رصيد افتتاحي مرحل للشهر الجاري' },
  { id: 'tx-rep-2', repId: 'rep-1', date: '2026-10-15', type: 'commission', amount: 8950, notes: '...', invoiceId: '...' },
  ...
]
```
In `src/store/useAXStore.js`:
- Line 78: `salesRepLedger: initialSalesRepLedger` (Array)
- Lines 242–256: `addSalesRepTransaction: (tx) => set((state) => ...)` (Unary function accepting transaction object `tx` with `tx.repId`).
- Line 239: `salesRepLedger: (state.salesRepLedger || []).filter((tx) => tx.repId !== id)`

However, in `src/components/sales_reps/AX_SalesRepLedgerModal.jsx`:
- Lines 21, 27–30:
  ```javascript
  const { salesRepLedger = {}, addSalesRepTransaction } = useAXStore()
  const repTransactions = useMemo(() => {
    if (!rep?.id) return []
    return salesRepLedger[rep.id] || []
  }, [rep, salesRepLedger])
  ```
  `salesRepLedger[rep.id]` assumes `salesRepLedger` is a Dictionary/Object. Since it is an Array, `salesRepLedger['rep-1']` evaluates to `undefined`, and `repTransactions` is always empty `[]`!
- Lines 48–55:
  ```javascript
  const tx = {
    id: `payout-${Date.now()}`,
    amount: amt,
    type: 'payment',
    description: payoutDescription.trim() || 'صرف عمولات / دفعة نقدية للمندوب',
    date: new Date().toISOString(),
  }
  addSalesRepTransaction(rep.id, tx)
  ```
  Here `addSalesRepTransaction(rep.id, tx)` passes 2 arguments: `rep.id` as first param, and `tx` as second. The store action expects `addSalesRepTransaction(tx)`, so it receives the string `rep.id` (e.g. `'rep-1'`) as `tx`! `tx.repId` is `undefined`, `tx.amount` is `undefined`, and `updatedLedger` gets corrupted with `['rep-1', ...]`.
- In `src/components/sales_reps/AX_SalesRepCommissionModal.jsx` (lines 62–70):
  The identical 2-argument invocation occurs: `addSalesRepTransaction(rep.id, tx)` where `tx` lacks `repId`.

#### B. Description vs Notes Field Mismatch
In `src/store/initialData.js`, transaction descriptions are stored under `notes`. In `AX_SalesRepLedgerModal.jsx` line 230, the table renders `row.description`. It does not fall back to `row.notes`, causing initial transactions to display blank text in the statement.

#### C. Balance Shadowing & Inconsistent Field Updates
In `useAXStore.js` (lines 252–253):
```javascript
const cur = Number(r.currentBalance ?? r.netBalance ?? 0)
return { ...r, currentBalance: cur + delta }
```
When `addSalesRepTransaction` updates a rep, it only modifies `currentBalance`. But throughout the application (`AX_SalesRepsTable.jsx` line 43, `AX_SalesRepsBentoCards.jsx` line 31, `AX_Dashboard.jsx` line 136, and `AX_SalesRepsManager.jsx` line 69), balance is read as:
```javascript
const bal = Number(r.netBalance ?? r.currentBalance ?? r.balance ?? 0)
```
If `r.netBalance` exists from creation or initial data (e.g. `12500`), `r.netBalance ?? r.currentBalance` will continue returning `12500` because `netBalance` is not nullish! The rep's displayed balance never reflects subsequent commissions or payouts.

#### D. Commission Engine (`AX_CommissionEngine.js`) Gaps
1. **Model 1 (`volume_rate`)**:
   - `Math.floor(totalSales / stepAmount) * stepRate`: If `totalSales <= 0` (such as net sales after credit note return), `Math.floor(-500 / 1000)` yields `-1` steps, but `tier2-boundary-corner-cases.test.js` expects `0` commission for `netSales <= 0`.
   - Lacks guard when `stepAmount <= 0`.
   - Does not read nested config `rep.commissionConfig?.volumeRate?.stepAmount`.
   - PROJECT.md interface specifies support for both stepped and proportional (`(totalSales / stepAmount) * stepRate`).
2. **Model 2 (`category_percentage`)**:
   - Loops over `sale.items`. In `initialInvoices`, line items have `price` and `total` instead of `unitPrice`. If `item.unitPrice` is missing, `(quantity * unitPrice)` evaluates to 0. It must check `item.total ?? (quantity * (unitPrice ?? price))`.
   - If a sale is simulated with no items (`items: []`, e.g. in `AX_SalesRepCommissionModal.jsx`), `sale.items.forEach` produces 0 total commission. It should fall back to `default` category rate against `sale.total`.
   - In `initialSalesReps`, category percentages are whole numbers (e.g. `2.0`, `3.5`), while tests use decimals (`0.02`, `0.035`). Engine must normalize whole percentages: `rate > 1 ? rate / 100 : rate`.
   - Default categories in `AX_CommissionEngine.js` line 28–30 are `'أسماك'`, `'مصنعات'`, `'خامات'`. Need meat domain alignment (`'لحوم'`, `'مصنعات'`, `'مجزءات'`, `'دواجن'`).
3. **Model 3 (`target_tier`)**:
   - Attainment levels `< 80% (1%)`, `80-99% (1.8%)`, `>= 100% (2.5% + 500 bonus)` are hardcoded. Does not accept `rep.targetTiers` or custom bonus if specified in rep profile.
4. **Model 4 (`hybrid`)**:
   - `totalSales * baseRate + tierBonus`. Does not normalize `baseRate` if passed as whole percentage (e.g. 2 instead of 0.02).
5. **Ledger Balance Engine (`computeRepLedgerBalance`)**:
   - Only checks `tx.type === 'commission' || tx.type === 'bonus'` and `tx.type === 'payment' || tx.type === 'disbursement'`.
   - Ignores `tx.type === 'clawback'` and `tx.type === 'deduction'` (used in `tier3-cross-feature-combinations.test.js` line 171).
   - Does not sort transactions chronologically by `date`, risking out-of-order running balance calculation.

#### E. Sales Reps Manager UI & Filter Gaps
- `AX_SalesRepsManager.jsx` filter bar (lines 118–163) has buttons for `all`, `volume_rate`, `target_tier`, and `category_percentage`. The `hybrid` model is missing from the filter pills.
- Search filter (lines 43–46) checks `name`, `phone`, and `assignedBranch`, but does NOT search `code` (e.g. `REP-101`) or `assignedArea` / `territory`.
- No branch or territory route filter dropdown.
- Top KPI summary cards (`totalTarget`, `totalCommissionsDue`) are computed in `useMemo` (lines 63–72) but never rendered in the UI, unlike `AX_CustomersManager.jsx` and `AX_SuppliersManager.jsx`.
- `AX_AddSalesRepModal.jsx` and `AX_EditSalesRepModal.jsx` omit the `assignedArea` / `territory` field.

#### F. Supabase Operations Service (`AX_SalesRepOperationsService.js`) Missing
M2 has `AX_CustomerOperationsService.js` and M3 has `AX_SupplierOperationsService.js` to persist changes to `ax_customers` / `ax_suppliers` and log activity to `ax_activity_logs`. M4 currently has no `AX_SalesRepOperationsService.js`.

---

## 2. Logic Chain

1. **Premise 1**: When a user opens `AX_SalesRepLedgerModal`, `repTransactions` is derived from `salesRepLedger[rep.id]`.
2. **Observation 1**: `salesRepLedger` in `useAXStore.js` is an Array, not an Object.
3. **Inference 1**: `salesRepLedger[rep.id]` returns `undefined`. Therefore, no transactions are ever displayed in the statement of account table, violating R3 acceptance criterion: "Each representative has an accessible statement of account displaying all commission earnings, payments, and net remaining balance."
4. **Premise 2**: When a user records a payout or applies a commission in either modal, `addSalesRepTransaction(rep.id, tx)` is called with 2 arguments, where `tx` does not include `repId`.
5. **Observation 2**: In `useAXStore.js`, `addSalesRepTransaction` is defined as `(tx) => ...`.
6. **Inference 2**: The store receives the string `rep.id` as `tx`. `tx.repId` is `undefined`, and `tx.amount` evaluates to `NaN`. This corrupts the ledger array and prevents payouts from registering.
7. **Premise 3**: In `AX_SalesRepsTable`, `AX_SalesRepsBentoCards`, and `AX_Dashboard`, balance is read as `r.netBalance ?? r.currentBalance ?? r.balance`.
8. **Observation 3**: In `useAXStore.js`, `addSalesRepTransaction` only mutates `currentBalance` on the rep object, leaving `netBalance` intact.
9. **Inference 3**: Any sales rep initialized with `netBalance` will continue showing the old static opening balance in tables, Bento cards, and dashboard metrics, even after recording payouts or commissions.
10. **Premise 4**: In `AX_CommissionEngine.js`, `volume_rate` uses `Math.floor(totalSales / stepAmount)`.
11. **Observation 4**: When `totalSales` is negative (returns), `Math.floor(-500 / 1000)` produces `-1` steps, whereas tests require `0` when net sales `<= 0`.
12. **Inference 4**: Negative net sales volumes produce erroneous step calculations unless clamped with `Math.max(0, ...)`.
13. **Premise 5**: In `AX_SalesRepsManager`, reps with `commissionModel === 'hybrid'` cannot be filtered because no filter pill exists for `hybrid`.
14. **Inference 5**: The UI fails to support one of the 4 required commission models in its primary filtering interface.

---

## 3. Caveats

- **No Code Modifications Made**: In accordance with the Explorer mandate, zero code was modified during this investigation.
- **Existing Tests Scope**: The existing 419 tests pass because unit tests in `tier1-sales-reps.test.js` import local helper copies of `calculateCommission` and `computeRepLedgerBalance` and test isolated pure logic rather than mounting the store and modals directly. This explains why the `salesRepLedger` Array vs Object bug was not caught by Tier 1 tests.
- **Supabase Backend Schema**: The live Supabase schema for `ax_sales_reps` and `ax_sales_rep_ledger` should be verified by the Worker or handled gracefully with fallback (as done in `AX_CustomerOperationsService` and `AX_SupplierOperationsService`).

---

## 4. Conclusion & Concrete Recommendations for Worker

To fully satisfy Milestone 4 (Requirement R3 / Features F13–F16), the Worker should execute the following concrete steps:

### 1. Fix `useAXStore.js` & `salesRepLedger` Signature Flexibility
In `src/store/useAXStore.js`:
- Update `addSalesRepTransaction` to support both `(tx)` and `(repId, tx)` signatures:
  ```javascript
  addSalesRepTransaction: (repIdOrTx, maybeTx) => set((state) => {
    const rawTx = typeof repIdOrTx === 'string'
      ? { ...maybeTx, repId: repIdOrTx }
      : (typeof repIdOrTx === 'object' ? repIdOrTx : maybeTx)
    if (!rawTx) return state

    const newTx = {
      id: rawTx.id || generateUUID(),
      date: rawTx.date || new Date().toISOString().split('T')[0],
      description: rawTx.description || rawTx.notes || '',
      notes: rawTx.notes || rawTx.description || '',
      ...rawTx,
    }
    const updatedLedger = [newTx, ...(state.salesRepLedger || [])]
    const amount = Math.abs(Number(newTx.amount) || 0)
    let delta = 0
    if (newTx.type === 'commission' || newTx.type === 'bonus') delta = amount
    else if (newTx.type === 'payment' || newTx.type === 'disbursement' || newTx.type === 'clawback' || newTx.type === 'deduction') delta = -amount

    const updatedReps = (state.salesReps || []).map((r) => {
      if (r.id !== newTx.repId) return r
      const cur = Number(r.currentBalance ?? r.netBalance ?? r.balance ?? 0)
      const nextBal = cur + delta
      return { ...r, netBalance: nextBal, currentBalance: nextBal, balance: nextBal }
    })
    return { salesRepLedger: updatedLedger, salesReps: updatedReps }
  }),
  ```

### 2. Fix `AX_SalesRepLedgerModal.jsx` and `AX_SalesRepCommissionModal.jsx`
- In `AX_SalesRepLedgerModal.jsx`:
  - Handle both Array and Object forms of `salesRepLedger`:
    ```javascript
    const repTransactions = useMemo(() => {
      if (!rep?.id) return []
      if (Array.isArray(salesRepLedger)) {
        return salesRepLedger.filter((t) => t.repId === rep.id)
      }
      return salesRepLedger[rep.id] || []
    }, [rep, salesRepLedger])
    ```
  - In payout form submission, ensure `repId: rep.id`, `notes`, and `description` are included in `tx`:
    ```javascript
    const tx = {
      id: `payout-${Date.now()}`,
      repId: rep.id,
      amount: amt,
      type: 'payment',
      description: payoutDescription.trim() || 'صرف عمولات / دفعة نقدية للمندوب',
      notes: payoutDescription.trim() || 'صرف عمولات / دفعة نقدية للمندوب',
      date: new Date().toISOString(),
    }
    addSalesRepTransaction(rep.id, tx)
    ```
  - In the history table, render `row.description || row.notes || 'حركة حساب'`.
- In `AX_SalesRepCommissionModal.jsx`:
  - In `handleApplyToLedger`, ensure `repId: rep.id`, `notes`, and `description` are included in `tx`.

### 3. Enhance `AX_CommissionEngine.js`
- **Volume Model**: Guard against `<= 0` sales and invalid step amount:
  ```javascript
  const stepAmount = Number(rep.stepAmount ?? rep.commissionConfig?.volumeRate?.stepAmount) > 0
    ? Number(rep.stepAmount ?? rep.commissionConfig?.volumeRate?.stepAmount)
    : 1000
  const stepRate = Number(rep.stepRate ?? rep.commissionConfig?.volumeRate?.stepRate) || 50
  const isProportional = Boolean(rep.isProportional || rep.commissionConfig?.volumeRate?.proportional)
  let steps = 0
  if (totalSales > 0) {
    steps = isProportional ? (totalSales / stepAmount) : Math.floor(totalSales / stepAmount)
  }
  totalCommission = steps * stepRate
  ```
- **Category Model**:
  - Normalize rates (`rate > 1 ? rate / 100 : rate`).
  - Read item total with fallback: `Number(item.total) || ((Number(item.quantity) || 0) * (Number(item.unitPrice ?? item.price) || 0))`.
  - Fallback for empty `items` array with non-zero `sale.total`: apply default rate against `sale.total`.
  - Add meat processing category defaults (`'لحوم'`, `'مصنعات'`, `'مجزءات'`, `'دواجن'`, `'أسماك'`, `'خامات'`).
- **Target Tier Model**:
  - Accept `rep.targetTiers` or `rep.commissionConfig?.targetTiers` with fallback to standard tiers: `<80% -> 1%`, `80-99% -> 1.8%`, `>=100% -> 2.5% + 500 EGP`.
- **Hybrid Model**:
  - Support `rep.baseRate ?? rep.commissionConfig?.baseRate ?? 0.02` (normalized if > 1) plus tier attainment bonus.
- **Ledger Balance Calculation (`computeRepLedgerBalance`)**:
  - Sort entries chronologically: `[...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))`.
  - Support `tx.type === 'clawback'` and `tx.type === 'deduction'`.
  - Avoid duplicate application of opening balance if already reflected in `openingBalance`.

### 4. Enhance `AX_SalesRepsManager.jsx`
- Add the missing `hybrid` model filter button:
  ```jsx
  <button
    type="button"
    onClick={() => { setModelFilter('hybrid'); setCurrentPage(1) }}
    className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
      modelFilter === 'hybrid' ? 'bg-primary text-white shadow-xs' : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
    }`}
  >
    نظام هجين
  </button>
  ```
- Expand search matching to include `code`, `assignedArea`, `territory`, `notes`.
- Add territory/branch filter dropdown to allow filtering by branch or distribution route.
- Render top 4 Bento KPI summary cards (إجمالي المناديب، إجمالي المستهدف، العمولات المستحقة، متوسط التحقيق) matching `AX_CustomersManager` and `AX_SuppliersManager`.
- Add `assignedArea` (المنطقة الجغرافية / خط السير) and `code` input fields to `AX_AddSalesRepModal.jsx` and `AX_EditSalesRepModal.jsx`.

### 5. Create `AX_SalesRepOperationsService.js`
- Create `src/services/AX_SalesRepOperationsService.js` mirroring `AX_CustomerOperationsService.js` and `AX_SupplierOperationsService.js`, with methods:
  - `addSalesRepInDB(rep, userProfile)`
  - `updateSalesRepInDB(rep, userProfile)`
  - `deleteSalesRepInDB(repId, userProfile)`
  - `addSalesRepTransactionInDB(repId, tx, userProfile)`
- Gracefully handles offline fallback and logs to `ax_activity_logs`.

### 6. Create Comprehensive Test Suite
- Create `tests/m4-challenger-sales-reps.test.js` covering:
  - All 4 commission models (normal, boundary, zero, and extreme values).
  - Commission clawback on credit returns.
  - Statement of account running balances, payouts, and monotonic sorting.
  - Integration between store `addSalesRepTransaction`, rep `netBalance`/`currentBalance`, and dashboard aggregations.
  - File invariant check (all files <= 500 lines).

---

## 5. Verification Method

To independently verify the findings and any future worker implementation:
1. **Full Test Suite Run**:
   ```powershell
   npm test
   ```
   Must pass 100% of tests with zero failures or regressions.
2. **File Invariant Verification**:
   ```powershell
   node --test tests/file-invariants.test.js
   ```
   Ensures all modified and new files remain <= 500 lines.
3. **Specific Sales Reps Unit & Integration Tests**:
   ```powershell
   node --test tests/tier1-sales-reps.test.js
   node --test tests/tier2-boundary-corner-cases.test.js
   node --test tests/tier3-cross-feature-combinations.test.js
   ```
4. **Invalidation Conditions**:
   - If `salesRepLedger` remains treated as an Object without supporting the store's Array shape, ledger history will fail to render.
   - If `addSalesRepTransaction` is called with `(rep.id, tx)` without store signature flexibility, payouts will fail silently.
   - If `netBalance` is not updated alongside `currentBalance`, dashboard liability metrics will report stale amounts.
