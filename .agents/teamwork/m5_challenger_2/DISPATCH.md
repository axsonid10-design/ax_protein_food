# Dispatch: Milestone 5 Challenger 2 (Financial Metrics & Zero Mock Rule Challenger)

## Objective
Empirically stress-test Milestone 5: Financial Metrics Calculations (`AX_DashboardMetricsCards.jsx` & `AX_Dashboard.jsx`) and Zero Mock Metrics Rule.

## Challenge Scenarios to Probe
1. Financial aggregations with signed/negative opening balances, zero balances, string-encoded balances, floating-point currencies.
2. Distinct liability channels:
   - Customers: verify only positive balances (`balance > 0`) are summed into customer receivables.
   - Suppliers: verify only positive balances (`balance > 0`) are summed into supplier liabilities.
   - Reps: verify positive balances (`netBalance ?? currentBalance ?? balance > 0`) are summed into rep balances.
3. Sales Target Attainment: periodSales = 0, target = 0 (division by zero guard), attainment > 1000%, target remaining calculations.
4. Strict Zero Fake/Mock Metrics (User Rule #0 item 10): assert that trends return `null` on zero historical data and no hardcoded metrics strings exist.
5. Write and execute an adversarial test file (e.g. `tests/m5-challenger-2.test.js`) and run `npm test` and `npm run test:vitest`.

## Output
Write your challenge report with an empirical verdict (`APPROVE` or `REQUEST_CHANGES`) to:
`d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m5_challenger_2\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.

## 2026-11-01T11:06:04Z
You are Milestone 5 Challenger 2 (Financial Metrics & Zero Mock Rule Challenger) for AX_PROTEIN_FOOD.
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m5_challenger_2
Read d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m5_challenger_2\DISPATCH.md and d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md.
Also read d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m5_worker\handoff.md.

Empirically stress-test Milestone 5 Financial Metrics:
1. Verify customer receivables, supplier liabilities, and sales rep balances with positive/negative/zero balances and string conversions.
2. Verify customer receivables strictly sum positive debtor balances (bal > 0).
3. Verify supplier liabilities strictly sum positive creditor balances (bal > 0).
4. Verify sales rep commission balances sum positive balances using netBalance ?? currentBalance ?? balance fallback.
5. Verify sales target attainment and division by zero safety when target is zero.
6. Verify strict User Rule #0 item 10 compliance: zero mock metrics, null trends on zero historical sales.
7. Author an adversarial test file: tests/m5-challenger-2.test.js (ensure <= 500 lines and zero comments).
8. Run your test and verify npm test and npm run test:vitest pass.

Write your handoff report with an empirical verdict (APPROVE or REQUEST_CHANGES) to:
d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m5_challenger_2\handoff.md
Send a completion message back to parent orchestrator via send_message.
