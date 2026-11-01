# Dispatch: Milestone 4 Explorer 3 (Service Integration, Persistence & Test Coverage)

## Objective
Investigate Milestone 4 backend/service integration and automated testing.
Check:
1. Does `src/services/AX_SalesRepOperationsService.js` exist? What Supabase CRUD operations, fallback handling, and offline sync are needed?
2. How are sales rep transactions stored and synced in `useAXStore.js` and IndexedDB?
3. Review `tests/tier1-sales-reps.test.js` and any other existing tests. What unit, boundary, and adversarial tests are missing for R3?
4. What test runner requirements must be satisfied (`npm test` and `npm run test:vitest`)?
Propose a comprehensive test plan and service architecture recommendations for the Worker.

## Key Files to Read
- `ORIGINAL_REQUEST.md`
- `PROJECT.md`
- `src/services/AX_CustomerOperationsService.js` (reference architecture)
- `src/services/AX_SupplierOperationsService.js` (reference architecture)
- `src/store/useAXStore.js`
- `src/services/offlineDB.js`
- `tests/tier1-sales-reps.test.js`
- `TEST_INFRA.md`

## Constraints
- Read-only exploration. DO NOT modify any code.
- Write handoff report to `.agents/teamwork/m4_explorer_3/handoff.md`.


## 2026-11-01T10:12:12Z
You are Milestone 4 Explorer 3 for the AX_PROTEIN_FOOD project.
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_explorer_3
Your dispatch assignment is detailed in: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_explorer_3\DISPATCH.md
MANDATORY: Read the original user request before starting work: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md
Also read d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md.

Explore Milestone 4 backend/service integration and automated testing:
- Check if `src/services/AX_SalesRepOperationsService.js` exists or needs to be built (compare with `AX_CustomerOperationsService.js` and `AX_SupplierOperationsService.js`).
- Inspect sales rep ledger persistence in `useAXStore.js` and `offlineDB.js`.
- Analyze existing tests in `tests/tier1-sales-reps.test.js`.
- Determine what automated tests are required for the Worker to write/run so both `npm test` and `npm run test:vitest` pass cleanly.
- Do NOT modify any code. Write your handoff report to:
`d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_explorer_3\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.
