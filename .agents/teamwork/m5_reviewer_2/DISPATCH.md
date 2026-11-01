# Dispatch: Milestone 5 Reviewer 2 (Invariants & Architectural Reviewer)

## Objective
Independently audit Milestone 5 deliverables for adherence to AXONID core invariants and architectural constraints.

## Invariants to Audit
1. Strict file length: every file in `src/components/dashboard/` must be strictly <= 500 lines (`node --test tests/file-invariants.test.js`).
2. Zero comments in production code: check for any `//` or `/* */` comments in `src/components/dashboard/`.
3. Zero `window.confirm` or `alert()`: modal confirmations must use `AX_ConfirmModal`.
4. Modern pill-shaped buttons: `rounded-full font-bold` or `font-black`.
5. Full canvas layout: `w-full`, zero centered empty side gutters (`max-w-7xl` or `max-w-5xl` forbidden).
6. 1:1 pulsing skeleton loader (`AX_SkeletonLoader type="dashboard"`), zero spinners.
7. Mobile responsiveness: 2-column Bento cards on mobile (`grid-cols-2`), compact desktop rows.
8. Meat red brand palette: `#991b1b` / `#450a0a` / `#b91c1c` / `#fee2e2`.
9. Clean build and tests: verify `npm test` and `npm run test:vitest`.

## Output
Write your review report with a clear verdict (`APPROVE` or `REQUEST_CHANGES`) to:
`d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m5_reviewer_2\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.

## 2026-11-01T11:06:04Z
[Message] timestamp=2026-11-01T11:06:04Z sender=dc5da5ed-817b-4784-a7e6-1365172c95ec priority=MESSAGE_PRIORITY_HIGH content=You are the Milestone 5 Invariants & Architectural Reviewer for AX_PROTEIN_FOOD.
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m5_reviewer_2
Read d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m5_reviewer_2\DISPATCH.md and d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md.
Also read d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m5_worker\handoff.md.

Independently audit Milestone 5 deliverables against AXONID invariants:
1. File lengths: all files in src/components/dashboard/ must be <= 500 lines (node --test tests/file-invariants.test.js).
2. Zero comments: verify NO comments (// or /* */) exist in any production dashboard files.
3. Zero window.confirm or alert(): verify AX_ConfirmModal is used where needed.
4. Pill-shaped buttons (rounded-full font-bold), full canvas layout (w-full, no max-w-7xl).
5. 1:1 pulsing skeleton loader (AX_SkeletonLoader), zero spinners.
6. Verify npm test and npm run test:vitest.

Write your handoff report with a clear verdict (APPROVE or REQUEST_CHANGES) to:
d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m5_reviewer_2\handoff.md
Send a completion message back to parent orchestrator via send_message.
