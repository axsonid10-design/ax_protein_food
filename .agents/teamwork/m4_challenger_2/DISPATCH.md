# Dispatch: Milestone 4 Challenger 2 (UI, Search, Pagination & RBAC Challenger)

## Objective
Empirically test UI, search/filtering, pagination, and role-based access control (RBAC) across Milestone 4 sales rep features.

## Challenge Scenarios to Probe
1. Search & Filter: search by name, phone, code, assignedArea, territory; filter by commissionModel (`all`, `volume_rate`, `category_percentage`, `target_tier`, `hybrid`).
2. Pagination: test boundary behavior when rep count exceeds PAGE_SIZE (15), page switching, empty search results.
3. Modals & FAB: check add modal, edit modal, commission config modal, ledger statement modal, and FAB button.
4. RBAC: verify `sales_reps` module permissions and preset behaviors (`admin`, `accountant`, `cashier`, `sales_rep`, `warehouse_manager`).
5. Write and execute empirical tests (e.g. `tests/m4-challenger-2.test.js`) and run `npm test` and `npm run test:vitest`.

## Output
Write your challenge report with an empirical verdict (`APPROVE` or `REQUEST_CHANGES`) to:
`d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_challenger_2\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.


## 2026-11-01T10:36:31Z
You are Milestone 4 Challenger 2 for the AX_PROTEIN_FOOD project.
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_challenger_2
Your dispatch assignment is detailed in: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_challenger_2\DISPATCH.md
MANDATORY: Read the original user request before starting work: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
- d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md
- d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_worker\handoff.md

Empirically challenge Milestone 4 UI, search/filtering, pagination, and RBAC:
- Write and execute an adversarial test file (e.g. `tests/m4-challenger-2.test.js`) probing:
  1. Search across name, phone, code, assignedArea, territory.
  2. Filter by commission model (`all`, `volume_rate`, `category_percentage`, `target_tier`, `hybrid`).
  3. Pagination (PAGE_SIZE = 15): page switching, boundary clamping, empty search results.
  4. Role-based access control across cashier, accountant, admin, warehouse, van driver, cutting supervisor, and sales rep roles.
- Run tests (`npm test`, `npm run test:vitest`) and `npm run build`.
- Issue an empirical verdict: APPROVE or REQUEST_CHANGES.
- Write your report to: `d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_challenger_2\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.
