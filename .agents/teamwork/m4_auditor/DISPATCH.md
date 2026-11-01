# Dispatch: Milestone 4 Forensic Integrity Auditor

## Objective
Execute a comprehensive forensic integrity audit of Milestone 4: Sales Representatives & Commission Engine (Requirement R3 / Features F13–F16).

## Mandatory Forensic Checks
1. Genuine Implementation Audit: Verify that `src/services/AX_SalesRepOperationsService.js`, `src/components/sales_reps/AX_CommissionEngine.js`, `AX_SalesRepsManager.jsx`, `AX_SalesRepLedgerModal.jsx`, and `tests/m4-sales-reps-integration.test.js` implement genuine logic.
   - NO hardcoded test results or expected output strings.
   - NO dummy/facade implementations.
   - NO circumvented tests or bypassed validations.
2. Invariant Compliance:
   - File length: strictly <= 500 lines for all `.js`/`.jsx` files in `src/`.
   - Comments: zero comments (`//` or `/* */`) in production code.
   - Modals: zero `window.confirm` or `alert()`.
   - Layout: full canvas, zero empty side gutters.
   - Theme: primary meat red `#991b1b` tokens.
3. Test & Build Execution:
   - Run `npm test` and inspect results.
   - Run `npm run test:vitest` and inspect results.
   - Run `npm run build` and inspect build artifacts.

## Non-Negotiable Hard Veto
If any integrity violation or cheating is detected, report `INTEGRITY VIOLATION` immediately.
If all checks pass genuinely, report `CLEAN`.

## Output
Write your full forensic audit report to:
`d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_auditor\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.


## 2026-11-01T10:36:38Z
You are the Milestone 4 Forensic Integrity Auditor for the AX_PROTEIN_FOOD project.
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_auditor
Your dispatch assignment is detailed in: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_auditor\DISPATCH.md
MANDATORY: Read the original user request before starting work: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
- d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md
- d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_worker\handoff.md

Conduct a thorough forensic integrity audit of Milestone 4:
1. Verify genuine implementation in `src/services/AX_SalesRepOperationsService.js`, `src/components/sales_reps/AX_CommissionEngine.js`, `AX_SalesRepsManager.jsx`, `AX_SalesRepLedgerModal.jsx`, and `tests/m4-sales-reps-integration.test.js`.
   - Check for hardcoded test strings, dummy facades, or test circumvention.
2. Invariant verification:
   - Check strict <= 500 lines for every single file in `src/` (especially `src/store/useAXStore.js` and `src/components/sales_reps/*`).
   - Check for zero comments (`//` or `/* */`) in production code.
   - Check zero window.confirm, pill buttons, full canvas, meat red theme tokens.
3. Test & build validation:
   - Run `npm test`, `npm run test:vitest`, and `npm run build`.

NON-NEGOTIABLE HARD VETO:
If any cheating, dummy facades, or hardcoded shortcuts are found, report INTEGRITY VIOLATION.
If genuine and authentic, report CLEAN.

Write your forensic audit report to:
`d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_auditor\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.
