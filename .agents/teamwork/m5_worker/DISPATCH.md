## 2026-11-01T10:53:59Z

# Dispatch: Milestone 5 Worker (Dashboard Stock Drilldown & Financial Metrics - Requirement R4)

## Objective
Consolidate, enhance, and verify Milestone 5: Dashboard Stock Drilldown & Financial Metrics (Requirement R4 / Features F17, F18, F19).

## Explorer Findings & Scope to Execute
Synthesized from `m5_explorer_1/handoff.md`, `m5_explorer_2/handoff.md`, and `m5_explorer_3/handoff.md`:

1. **Verify & Refine `src/components/dashboard/AX_PinnedStockWidget.jsx`**:
   - Ensure `localStorage` key `'ax_dashboard_pinned_items'` is used.
   - Fallback to top-4 items when empty or when pinned items are deleted.
   - Pinned cards clickable to trigger stock drilldown modal.

2. **Verify & Refine `src/components/dashboard/AX_StockDrilldownModal.jsx`**:
   - Stock breakdown per warehouse and branch individually (`wh.type === 'branch'`, `wh.type === 'cold_store'`, `wh.type === 'van'`).
   - Calculate available cartons, pieces (`qty * piecesPerCarton`), total weight in kg (`qty * weightPerCarton`), share percentage, and health status (`healthy`, `low`, `out`).

3. **Verify & Refine `src/components/dashboard/AX_DashboardMetricsCards.jsx` & `AX_Dashboard.jsx`**:
   - Total customer debts/receivables (`totalCustomerDebts`: positive client balances).
   - Total supplier liabilities/payables (`totalSupplierDebts`: positive supplier balances).
   - Total sales representative commission balances (`totalRepBalances`: positive rep balances using fallback order `r.netBalance ?? r.currentBalance ?? r.balance`).
   - Sales target progress attainment (`salesTargetProgress`: real sales vs rep targets).
   - Strict User Rule #0 item 10 compliance: ZERO fake/mock metrics, all dynamic from DB/store, trend is `null` when no prior data.

4. **Author Comprehensive Automated Integration Suite**:
   - Create `tests/m5-dashboard-integration.test.js` (using `node:test` and `node:assert/strict`) covering:
     1. Pinned stock widget selection & `localStorage` persistence with top-4 fallback.
     2. Warehouse and branch stock drilldown breakdown logic.
     3. Financial liability metrics calculations.
     4. Sales target attainment percentage and zero-target safety.
     5. Zero fake/mock metrics assertion.
     6. File invariants: strictly <= 500 lines per file and zero comments.

5. **Verification Requirements**:
   - Run `npm test` and verify all tests pass with 0 failures.
   - Run `npm run test:vitest` and verify all test files pass with 0 failures.
   - Run `npm run build` and verify clean production build exits with code 0.
   - Verify every file in `src/components/dashboard/` is strictly <= 500 lines and contains 0 comments.
