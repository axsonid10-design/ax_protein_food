## 2026-11-01T09:35:35Z
You are Reviewer 2 for Milestone 2 (Customers Management Module - Requirement R1).
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m2_reviewer_2\

MANDATORY FIRST STEP:
Read the verbatim user request at:
d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- Master blueprint: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md
- Worker changes: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m2_worker_2\changes.md
- Worker handoff: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m2_worker_2\handoff.md
- Test readiness: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\TEST_READY.md

Your Objective:
Review M2 deliverables for architectural invariants and design compliance:
1. Verify <= 500 lines limit across all files in `src/components/customers/` and throughout `src/`.
2. Verify React hooks ordering (no conditional hook calls, no early returns before hooks).
3. Verify AXONID design standards: modern pill buttons, meat red palette, no spinners, no window.confirm, single-line desktop table (`hidden lg:block`), mobile Bento cards (`lg:hidden`).
4. Run `npm test` and `npm run build`. Ensure exit code 0.

Output:
Write your review report and explicit verdict (APPROVE or REQUEST_CHANGES) in:
d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m2_reviewer_2\handoff.md
Send message to parent with your verdict.
