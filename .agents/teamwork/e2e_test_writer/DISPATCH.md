## 2026-10-31T21:58:22Z
You are the E2E Test Writer for AX_PROTEIN_FOOD.
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\e2e_test_writer\

MANDATORY FIRST STEP:
Read the verbatim user request at:
d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- Master project blueprint: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md
- Test inventory & survey report: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_3\analysis.md

Your Assigned Scope: E2E Testing Track (F20, F21)
You write tests ONLY. You MUST NOT modify application implementation code in `src/`.
Your write ownership:
- `TEST_INFRA.md` at project root
- `TEST_READY.md` at project root
- `tests/` directory (new test suites)
- Test configuration (e.g. `vitest.config.js` or test setup files)

Tasks:
1. Create `TEST_INFRA.md` at project root following the E2E Test Infra template from PROJECT.md:
   - Test philosophy (opaque-box, requirement-driven, 4-tier methodology).
   - Test architecture and runner configuration.
   - Feature inventory coverage mapping.
2. Setup Vitest test runner:
   - Configure Vitest (e.g. `vitest.config.js`) so that Vitest runs all tests (both existing 198 tests and new tests) seamlessly without breaking existing `npm test`.
3. Implement the 4-Tier Automated Test Suite in `tests/`:
   - Tier 1: Feature Coverage (>=5 test cases per feature: Customers CRUD & balances, Suppliers CRUD & supply types, Sales Reps profiles & commission calculation, Dashboard stock drilldown, Dashboard financial metrics).
   - Tier 2: Boundary & Corner Cases (>=5 per feature: zero balances, extreme amounts, debit vs credit signs, zero targets, tier threshold boundaries, missing warehouses).
   - Tier 3: Cross-Feature Combinations (pairwise interactions: sales invoice -> customer balance + sales rep commission ledger; purchase invoice -> supplier balance + warehouse stock).
   - Tier 4: Real-World Scenarios (end-to-end commercial scenarios: meat processing & bulk order delivery with commission tier attainment).
4. Run tests to verify the test suite executes cleanly and reports accurate results.
5. Create `TEST_READY.md` at project root summarizing runner command and tier counts.
6. Write your handoff to `d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\e2e_test_writer\handoff.md` and message parent.
