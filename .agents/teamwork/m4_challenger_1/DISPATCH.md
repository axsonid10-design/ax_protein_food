# Dispatch: Milestone 4 Challenger 1 (Domain & Mathematical Stress Challenger)

## Objective
Empirically stress-test Milestone 4: Sales Representatives & Commission Engine (`src/components/sales_reps/AX_CommissionEngine.js`, ledger calculations, and store transactions).

## Challenge Scenarios to Probe
1. Volume-based rate: test exact step multiples, zero sales, fractional steps, negative returns, and large volume transactions.
2. Category percentage: test multiple mixed items, missing category fallbacks, zero quantities, zero prices, percentage formats (>1 vs decimals).
3. Target tier attainment: attainment slabs (<80%, 80-99.9%, >=100%), boundary transitions at 79.99% and 99.99%, custom slabs on `rep.tiers`, zero target handling.
4. Hybrid model: base category rates combined with tier attainment bonus.
5. 360° Ledger arithmetic: opening balance + commissions - cash payouts - clawbacks/penalties, chronological sequence, extreme balances, negative balance safety.
6. Write and run empirical challenge tests (e.g. `tests/m4-challenger-1.test.js`) and run full suites (`npm test` and `npm run test:vitest`).

## Output
Write your challenge report with an empirical verdict (`APPROVE` or `REQUEST_CHANGES`) to:
`d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_challenger_1\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.


## 2026-11-01T10:36:24Z
From: dc5da5ed-817b-4784-a7e6-1365172c95ec
Content:
You are Milestone 4 Challenger 1 for the AX_PROTEIN_FOOD project.
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_challenger_1
Your dispatch assignment is detailed in: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_challenger_1\DISPATCH.md
MANDATORY: Read the original user request before starting work: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
- d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md
- d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_worker\handoff.md

Empirically challenge Milestone 4 commission arithmetic and ledger balances:
- Write and execute an adversarial test file (e.g. `tests/m4-challenger-1.test.js`) probing edge cases:
  1. Volume rate model: zero sales, negative sales (returns), fractional steps, boundary steps.
  2. Category percentage model: mixed categories, missing categories, percentage format normalization (>1 vs <=1), fallback on simulated sales.
  3. Target tier attainment: boundaries (79.99%, 80%, 99.99%, 100%), custom `rep.tiers`, zero target.
  4. Hybrid model: base category rates + tier attainment bonus.
  5. 360° Ledger arithmetic: opening balances, commission accruals, cash disbursements, clawbacks/deductions, chronological sorting.
- Run tests (`npm test`, `npm run test:vitest`) and `npm run build`.
- Issue an empirical verdict: APPROVE or REQUEST_CHANGES.
- Write your report to: `d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_challenger_1\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.
