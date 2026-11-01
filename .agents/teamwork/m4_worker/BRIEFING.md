# BRIEFING — 2026-11-01T10:35:00Z

## Mission
Implement Milestone 4: Sales Representatives & Commission Engine (Requirement R3 / Features F13, F14, F15, F16) with persistence service, store ledger bug fix, UI parity, and integration test coverage.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_worker
- Original parent: dc5da5ed-817b-4784-a7e6-1365172c95ec
- Milestone: M4 (Sales Representatives & Commission Engine)

## 🔒 Key Constraints
- All files in `src/` must be strictly <= 500 lines (`tests/file-invariants.test.js`).
- Zero comments in production code. Pure syntax only.
- Zero window.confirm or alert(). AX_ConfirmModal only.
- Modern pill-shaped buttons (`rounded-full`, `font-bold`).
- Meat red brand palette (`#991b1b` / `#450a0a` / `#b91c1c` / `#fee2e2`).
- Strict write ownership:
  - `src/services/AX_SalesRepOperationsService.js` (NEW)
  - `src/components/sales_reps/AX_CommissionEngine.js`
  - `src/components/sales_reps/AX_SalesRepsManager.jsx`
  - `src/components/sales_reps/AX_SalesRepLedgerModal.jsx`
  - `src/components/sales_reps/AX_SalesRepCommissionModal.jsx`
  - `src/components/sales_reps/AX_AddSalesRepModal.jsx`
  - `src/components/sales_reps/AX_EditSalesRepModal.jsx`
  - `src/components/sales_reps/salesRepConstants.js` (NEW if needed)
  - `src/store/useAXStore.js`
  - `tests/m4-sales-reps-integration.test.js` (NEW)
- Run `npm test`, `npm run test:vitest`, and `npm run build` with 100% pass and 0 errors.

## Current Parent
- Conversation ID: dc5da5ed-817b-4784-a7e6-1365172c95ec
- Updated: 2026-11-01T10:35:00Z

## Task Summary
- **What to build**: Production service `AX_SalesRepOperationsService.js`, fix polymorphic `addSalesRepTransaction` and balance shadowing in `useAXStore.js`, fix ledger Array filtering and payout argument passing in `AX_SalesRepLedgerModal.jsx` & `AX_SalesRepCommissionModal.jsx`, enhance `AX_CommissionEngine.js` (zero/negative guards, meat categories, custom slabs, deductions/clawbacks), enhance `AX_SalesRepsManager.jsx` (KPI summary cards, FAB, hybrid pill filter, skeleton loader), clean fluff in `AX_AddSalesRepModal.jsx`, and create comprehensive `tests/m4-sales-reps-integration.test.js`.
- **Success criteria**: All tests pass in both Node test runner and Vitest, production build succeeds cleanly, file invariants strictly <= 500 lines, 0 comments.
- **Interface contracts**: PROJECT.md § Interface Contracts
- **Code layout**: PROJECT.md § Code Layout

## Key Decisions Made
- `addSalesRepTransaction` supports both `(repId, tx)` and `(tx)` with polymorphic unpacking, syncing `currentBalance`, `netBalance`, and `balance`.
- `AX_SalesRepOperationsService.js` mirrors `AX_CustomerOperationsService.js` with offline safety and activity logging to `ax_activity_logs`.
- `AX_CommissionEngine.js` handles all 4 models and edge cases cleanly with rate normalization and zero sales guards.
- UI/UX parity completed with 4-card KPI summary cards, FAB, hybrid pill filter, and skeleton loading in `AX_SalesRepsManager.jsx`.

## Artifact Index
- `src/services/AX_SalesRepOperationsService.js` — Supabase operations & activity logs
- `src/components/sales_reps/AX_CommissionEngine.js` — Multi-model commission calculation & ledger balances
- `src/components/sales_reps/AX_SalesRepsManager.jsx` — Manager view with KPI cards, FAB, filters
- `src/components/sales_reps/AX_SalesRepLedgerModal.jsx` — Statement of account modal with payout & ledger
- `src/components/sales_reps/AX_SalesRepCommissionModal.jsx` — Commission calculation & ledger modal
- `src/components/sales_reps/AX_AddSalesRepModal.jsx` — Rep creation modal without fluff
- `src/components/sales_reps/AX_EditSalesRepModal.jsx` — Rep edit modal with service link
- `src/store/useAXStore.js` — Store actions for sales reps & ledger
- `tests/m4-sales-reps-integration.test.js` — Comprehensive integration tests (12 tests)

## Change Tracker
- **Files modified**:
  - `src/services/AX_SalesRepOperationsService.js`: created persistence service (117 lines)
  - `src/components/sales_reps/AX_CommissionEngine.js`: enhanced 4 models & ledger (152 lines)
  - `src/components/sales_reps/AX_SalesRepsManager.jsx`: added KPI cards, FAB, hybrid filter (318 lines)
  - `src/components/sales_reps/AX_SalesRepLedgerModal.jsx`: fixed ledger Array access & service calls (262 lines)
  - `src/components/sales_reps/AX_SalesRepCommissionModal.jsx`: fixed tx structure & service calls (210 lines)
  - `src/components/sales_reps/AX_AddSalesRepModal.jsx`: removed fluff p tag & added service call (263 lines)
  - `src/components/sales_reps/AX_EditSalesRepModal.jsx`: added service call (271 lines)
  - `src/store/useAXStore.js`: polymorphic addSalesRepTransaction & balance sync (497 lines)
  - `tests/m4-sales-reps-integration.test.js`: added 12 comprehensive tests (498 lines)
- **Build status**: PASS (Clean exit code 0)
- **Pending issues**: None

## Quality Status
- **Build/test result**: `npm test` -> 432 passed (41 suites); `npm run test:vitest` -> 429 passed (26 files); `npm run build` -> exit 0
- **Lint status**: 0 violations, all files <= 500 lines, 0 comments in production code
- **Tests added/modified**: `tests/m4-sales-reps-integration.test.js` (12 tests)

## Loaded Skills
- None explicitly required to copy.
