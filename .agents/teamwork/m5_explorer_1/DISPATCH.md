# Dispatch: Milestone 5 Explorer 1 (Functional & Financial Metrics Scope)

## Objective
Investigate Milestone 5: Dashboard Stock Drilldown & Financial Metrics (Requirement R4 / Features F17, F18, F19).
Specifically examine financial metric aggregations in `src/components/dashboard/AX_DashboardMetricsCards.jsx` and `src/components/dashboard/AX_Dashboard.jsx`:
1. Customer Debts / Receivables: calculation of `totalCustomerDebts` across all clients/customers (signed positive debit balances).
2. Supplier Liabilities / Payables: calculation of `totalSupplierDebts` across all suppliers (payable balances where supplier is owed money).
3. Sales Rep Commission Balances: calculation of `totalRepBalances` across all active sales reps (`netBalance ?? currentBalance ?? balance`).
4. Sales Target Progress: calculation of `salesTargetProgress` (`totalTarget`, `periodSales`, `achievementPct`).
5. Zero Mock Metrics Rule: User Rule #0 item 10 strictly forbids fake dashboard metrics (e.g. `+12.5%`). Metrics must be computed 100% from store/DB data.

## Key Files to Read
- `ORIGINAL_REQUEST.md` (Mandatory: read first)
- `PROJECT.md`
- `src/components/dashboard/AX_DashboardMetricsCards.jsx`
- `src/components/dashboard/AX_Dashboard.jsx`
- `src/store/useAXStore.js`
- `tests/tier1-dashboard-financials.test.js`

## Constraints
- Read-only exploration. DO NOT modify any code.
- Write handoff report to `.agents/teamwork/m5_explorer_1/handoff.md`.

## 2026-11-01T10:44:55Z
You are Milestone 5 Explorer 1 for the AX_PROTEIN_FOOD project.
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m5_explorer_1
Your dispatch assignment is detailed in: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m5_explorer_1\DISPATCH.md
MANDATORY: Read the original user request before starting work: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md
Also read d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md.

Explore Milestone 5 (Dashboard Financial Metrics - Requirement R4 / Features F17, F18, F19):
- Examine `src/components/dashboard/AX_DashboardMetricsCards.jsx` and `src/components/dashboard/AX_Dashboard.jsx`.
- Verify financial metric calculations: `totalCustomerDebts` (receivables), `totalSupplierDebts` (liabilities/payables), `totalRepBalances` (sales rep commission balances), `salesTargetProgress` (sales target attainment %).
- Check compliance with User Rule #0 item 10 (Zero fake/mock metrics invariant).
- Do NOT modify any code. Write your handoff report to:
`d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m5_explorer_1\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.
