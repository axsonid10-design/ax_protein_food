# Dispatch: Milestone 4 Reviewer 2 (Invariants & Architectural Reviewer)

## Objective
Independently audit Milestone 4 deliverables for adherence to AXONID core invariants and architectural constraints.

## Invariants to Audit
1. Strict file length: every single `.js` and `.jsx` file in `src/` must be <= 500 lines (`node --test tests/file-invariants.test.js`). Check `useAXStore.js` and all sales rep components.
2. Zero comments in production code: check for any `//` or `/* */` comments in `src/components/sales_reps/` and `src/services/AX_SalesRepOperationsService.js`.
3. Zero `window.confirm` or `alert()`: modal confirmations must use `AX_ConfirmModal`.
4. Modern pill-shaped buttons: `rounded-full font-bold` or `font-black`.
5. Full canvas layout: `w-full`, zero centered empty side gutters (`max-w-7xl` or `max-w-5xl` forbidden).
6. 1:1 pulsing skeleton loader (`AX_SkeletonLoader`), zero spinners.
7. Dual responsive presentation: single-line desktop table rows (`hidden lg:block`, `h-12`) and mobile Bento cards (`lg:hidden`).
8. Meat red brand palette: `#991b1b` / `#450a0a` / `#b91c1c` / `#fee2e2`.
9. Clean build and tests: verify `npm test` and `npm run test:vitest`.

## Required Files to Inspect
- `ORIGINAL_REQUEST.md` (Mandatory: read first)
- `PROJECT.md`
- `.agents/teamwork/m4_worker/handoff.md`
- `src/components/sales_reps/*`
- `src/services/AX_SalesRepOperationsService.js`
- `src/store/useAXStore.js`
- `tests/file-invariants.test.js`

## Output
Write your review report with a clear verdict (`APPROVE` or `REQUEST_CHANGES`) to:
`d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_reviewer_2\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.


## 2026-11-01T10:36:17Z
You are Milestone 4 Reviewer 2 for the AX_PROTEIN_FOOD project.
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_reviewer_2
Your dispatch assignment is detailed in: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_reviewer_2\DISPATCH.md
MANDATORY: Read the original user request before starting work: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
- d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md
- d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_worker\handoff.md

Review Milestone 4 architectural invariants:
- Verify file length: every `.js`/`.jsx` file in `src/` must be strictly <= 500 lines (`node --test tests/file-invariants.test.js`). Check `useAXStore.js` (was 497 lines).
- Verify zero comments in production code.
- Verify zero window.confirm, pill buttons, meat red theme, full canvas layout, skeleton loading.
- Run tests (`npm test`, `npm run test:vitest`) and `npm run build`.
- Issue a clear verdict: APPROVE or REQUEST_CHANGES.
- Write your report to: `d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_reviewer_2\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.
