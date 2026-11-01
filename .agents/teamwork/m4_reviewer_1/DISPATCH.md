# Dispatch: Milestone 4 Reviewer 1 (Functional Reviewer - Requirement R3)

## Objective
Independently review and verify the functional correctness of Milestone 4: Sales Representatives & Commission Engine (Requirement R3 / Features F13–F16).

## Scope to Verify
1. Sales Reps Directory & Profiles: Contact information, assigned territory/route, monthly/periodic sales target, initial balance.
2. Commission Engine (`src/components/sales_reps/AX_CommissionEngine.js`):
   - Model 1: Volume-based rate (e.g. 25 EGP per 1,000 EGP sales).
   - Model 2: Item/category percentage (specific % per item or category).
   - Model 3: Target tier attainment slabs (attainment % mapped to tiered rates + lump sum bonuses).
   - Model 4: Hybrid model.
3. Statement of Account / 360° Rep Ledger Modal (`src/components/sales_reps/AX_SalesRepLedgerModal.jsx`):
   - Accrued commissions from sales transactions.
   - Disbursed cash payments / payouts.
   - Running net balance (`openingBalance + commissions - payments - clawbacks`).
4. Persistence service (`src/services/AX_SalesRepOperationsService.js`) and store synchronization (`src/store/useAXStore.js`).
5. Run test verification commands: `npm test`, `npm run test:vitest`, and `npm run build`.

## Required Files to Inspect
- `ORIGINAL_REQUEST.md` (Mandatory: read first)
- `PROJECT.md`
- `.agents/teamwork/m4_worker/handoff.md`
- `src/components/sales_reps/*`
- `src/services/AX_SalesRepOperationsService.js`
- `src/store/useAXStore.js`
- `tests/m4-sales-reps-integration.test.js`

## Output
Write your review report with a clear verdict (`APPROVE` or `REQUEST_CHANGES`) to:
`d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_reviewer_1\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.


## 2026-11-01T10:36:10Z
Received dispatch from parent (dc5da5ed-817b-4784-a7e6-1365172c95ec):
Verify Milestone 4 functional completeness (R3), 4 commission calculation models in `AX_CommissionEngine.js`, ledger statements in `AX_SalesRepLedgerModal.jsx`, persistence via `AX_SalesRepOperationsService.js`. Run tests and build. Issue verdict.
