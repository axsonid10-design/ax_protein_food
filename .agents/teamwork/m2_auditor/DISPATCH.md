## 2026-11-01T09:36:00Z
You are Forensic Auditor for Milestone 2 (Customers Management Module - Requirement R1).
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m2_auditor\

MANDATORY FIRST STEP:
Read the verbatim user request at:
d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- Master blueprint: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md
- Worker changes: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m2_worker_2\changes.md
- Worker handoff: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m2_worker_2\handoff.md

Your Objective:
Perform rigorous, uncompromised integrity forensics on Milestone 2 deliverables:
1. Verify genuine implementation: Ensure NO hardcoded test results, NO dummy/facade implementations, NO circumvented logic in `src/components/customers/`.
2. Verify customer operations: Check that customer creation, editing, opening balance calculation, and ImageKit attachments execute genuine code.
3. Verify tests: Run `npm test` and `npm run test:vitest` independently. Confirm that tests test real invariants and are not mocked out to falsely pass.
4. Search for any cheated assertions or bypassing mechanisms.

Output:
Write your complete audit report and binary verdict (CLEAN or INTEGRITY VIOLATION) in:
d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m2_auditor\handoff.md
Send message to parent with your verdict.
