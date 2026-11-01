# Milestone 1 Remediation Changes

## Summary of Changes

### 1. `src/services/imageKitService.js`
- **Line 26**: Protected `getTransformedUrl` against `null` options:
  ```javascript
  const opts = options || {}
  const { width, w, height, h, quality, q, crop, c } = opts
  ```
- **Lines 35–41**: Clamped and sanitized numeric quality parameter to `[1, 100]`:
  ```javascript
  if (targetQ !== undefined && targetQ !== null && targetQ !== '') {
    const numQ = Number(targetQ)
    if (!isNaN(numQ)) {
      const clampedQ = Math.max(1, Math.min(100, Math.round(numQ)))
      trSegments.push(`q-${clampedQ}`)
    }
  }
  ```
- **Line count**: 124 lines (<= 500 limit).

### 2. `src/store/useAXStore.js`
- **Imports (Lines 2–14)**: Added explicit `.js` extensions to all internal relative imports:
  - `../services/AX_OperationsService.js`
  - `../services/AX_StaffOperationsService.js`
  - `../services/AX_DatabaseSync.js`
  - `../utils/AX_UUID.js`
  - `./categoryHelpers.js`
  - `./initialData.js`
- **Store Actions (Lines 227–235)**: Deduplicated records by ID before prepending in `addClient`, `addSupplier`, and `addSalesRep`:
  ```javascript
  addClient: (client) => set((state) => ({ clients: [client, ...state.clients.filter((c) => c.id !== client.id)] })),
  addSupplier: (supplier) => set((state) => ({ suppliers: [supplier, ...state.suppliers.filter((s) => s.id !== supplier.id)] })),
  addSalesRep: (rep) => set((state) => ({ salesReps: [rep, ...(state.salesReps || []).filter((r) => r.id !== rep.id)] })),
  ```
- **Sales Rep Ledger (Lines 242–255)**:
  - Added guard against `!tx`: `if (!tx) return state`.
  - Sanitized payment amounts with `Math.abs(Number(tx.amount) || 0)` to guarantee negative numbers deduct monotonically from rep balances without inversion.
- **Line count**: 487 lines (<= 500 limit).

### 3. `src/utils/permissionsConfig.js`
- **Role Presets (Lines 270–305)**:
  - Added `sales_rep` preset mapping van sales and rep ledger view capabilities.
  - Added `warehouse_manager` preset mapping full warehouse, stock audit, transfer approval, and inventory management capabilities.
- **Permissions Normalization (Lines 307–324)**:
  - Enhanced `normalizePermissions(rawPermissions)` to handle Array inputs:
    - Array containing `'all'` returns full admin permissions.
    - Array containing `'operational'` returns operational capabilities (warehouses, items, invoices, manufacturing, distribution, treasury, customers, suppliers).
- **Access Checks (Lines 344–365)**:
  - Updated `hasModulePermission` and `hasModuleAccess` to normalize array permissions automatically via `Array.isArray(user.permissions) ? normalizePermissions(user.permissions) : (user.permissions || {})`.
- **Line count**: 396 lines (<= 500 limit).

### 4. `GEMINI.md` & `DESIGN.md`
- **`GEMINI.md` Line 8**: Replaced legacy blue hex codes with Meat Red palette:
  `- **Primary Brand Colors:** Meat Red (`#991b1b`), Dark Burgundy Container (`#450a0a`), Crimson Red Accent (`#b91c1c`), Canvas Surface (`#f8fafc`).`
- **`DESIGN.md` Lines 17–24 & Line 75**: Updated primary/secondary color definitions and descriptive text to Meat Red `#991b1b`, Deep Burgundy `#450a0a`, and Crimson `#b91c1c`.
- **Search verification**: Zero occurrences of `#0284c7`, `#0c4a6e`, `#0891b2` remaining.

### 5. `tests/m1-challenger.test.js`
- Updated test assertions from verifying defect reproduction to verifying verified remediation behavior:
  - Quality clamping verifies `q-1` on `{ quality: -10 }`.
  - `null` options does not throw and returns raw URL.
  - Client deduplication verifies array length is 1 on duplicate ID.
  - `addSalesRepTransaction(null)` safely does not throw.
  - Negative payment amount sanitization verifies balance decreases to 500.
  - Added test suite for `sales_rep` / `warehouse_manager` presets and array permissions `['operational']` / `['all']`.
- **Line count**: 106 lines (<= 500 limit).
