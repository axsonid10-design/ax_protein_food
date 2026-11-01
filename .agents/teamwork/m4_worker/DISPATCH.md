# Dispatch: Milestone 4 Worker (Sales Representatives & Commission Engine - Requirement R3)

## Objective
Implement all functional enhancements, service persistence, ledger bug fixes, UI/UX parity, and integration test coverage for Milestone 4 (Sales Representatives & Commission Engine - Requirement R3 / Features F13, F14, F15, F16).

## Explorer Findings to Implement
Synthesized from `m4_explorer_1/handoff.md`, `m4_explorer_2/handoff.md`, and `m4_explorer_3/handoff.md`:

1. **Create `src/services/AX_SalesRepOperationsService.js`**:
   - Reference `src/services/AX_CustomerOperationsService.js` and `src/services/AX_SupplierOperationsService.js`.
   - Export `createSalesRep`, `updateSalesRep`, `deleteSalesRep`, `recordCommissionTransaction`, `recordPayoutTransaction`.
   - Include Supabase availability checks (`isSupabaseConfigured()`), try/catch blocks with offline fallbacks, and activity logging into `ax_activity_logs`.

2. **Fix Ledger Persistence in `src/store/useAXStore.js`**:
   - Update `addSalesRepTransaction` to be polymorphic:
     - Handle unary call `addSalesRepTransaction(tx)` where `tx.repId` is present.
     - Handle binary call `addSalesRepTransaction(repId, tx)` where `repId` is passed as first argument.
   - When updating representative balance in `addSalesRepTransaction`, update BOTH `currentBalance` and `netBalance` to prevent UI balance shadowing.
   - Support `notes` and `description` interchangeability.

3. **Fix Ledger & Commission Modals**:
   - In `src/components/sales_reps/AX_SalesRepLedgerModal.jsx`:
     - Fix `repTransactions` calculation to support Array storage: `Array.isArray(salesRepLedger) ? salesRepLedger.filter(t => t.repId === rep.id) : (salesRepLedger[rep.id] || [])`.
     - In table rendering, fall back to `row.description || row.notes || '-'`.
     - Ensure `addSalesRepTransaction` call passes valid transaction object.
   - In `src/components/sales_reps/AX_SalesRepCommissionModal.jsx`:
     - Ensure `addSalesRepTransaction` call passes valid transaction object with `repId`.

4. **Enhance `src/components/sales_reps/AX_CommissionEngine.js`**:
   - Volume model: Guard against negative totalSales with `Math.max(0, totalSales)` before `Math.floor(...)`.
   - Category percentage: Support item total calculation via `(item.quantity * item.unitPrice)` or `item.total || item.amount`. Normalize rate (e.g. if user entered `5` instead of `0.05`, treat `> 1` as percentage divided by 100).
   - Target tier model: Support optional `rep.tiers` custom attainment slabs with fallback to standard tiers.
   - Ledger calculation: Handle deductions/clawbacks (`deduction`, `penalty`, `clawback`).

5. **UI/UX Parity in `src/components/sales_reps/AX_SalesRepsManager.jsx`**:
   - Render 4-card KPI summary metrics strip (Total Reps, Total Target, Total Commissions Due, Commission Models).
   - Add Floating Action Button (FAB) for adding representative (`fixed bottom-20 lg:bottom-8 left-6`).
   - Add `hybrid` filter pill to the model filter bar.
   - Support `AX_SkeletonLoader` when loading.
   - In `src/components/sales_reps/AX_AddSalesRepModal.jsx`: Remove subtitle `<p>` fluff under header.

6. **Create Comprehensive Automated Integration Tests**:
   - Create `tests/m4-sales-reps-integration.test.js` (written with `node:test` and `node:assert/strict`) covering:
     - All 4 commission models (volume_rate, category_percentage, target_tier, hybrid).
     - Full ledger running balance calculations and payouts.
     - Target progress attainment calculation.
     - Store actions and cascading deletion.
     - Service fallback safety.
     - File invariants (strictly <= 500 lines, 0 comments).

7. **Verification Requirements**:
   - Run `npm test` and verify all tests pass with 0 failures.
   - Run `npm run test:vitest` and verify all test files pass with 0 failures.
   - Run `npm run build` and verify clean production build exits with code 0.
   - Verify every file in `src/` is strictly <= 500 lines and contains 0 comments.


## 2026-11-01T10:21:08Z
You are the Milestone 4 Implementation Worker for the AX_PROTEIN_FOOD project.
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_worker
Your dispatch assignment is detailed in: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_worker\DISPATCH.md

MANDATORY: Read the original user request before starting work: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
- d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md
- d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_explorer_1\handoff.md
- d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_explorer_2\handoff.md
- d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_explorer_3\handoff.md
