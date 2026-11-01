# Dispatch: Milestone 4 Explorer 2 (UI, Responsive Invariants & Navigation)

## Objective
Investigate Milestone 4 UI/UX and architectural conformance across `src/components/sales_reps/`, `src/components/navigation/`, and `src/App.jsx`.
Check adherence to AXONID standards:
1. Max lines per file: strictly <= 500 lines (`tests/file-invariants.test.js`).
2. Zero comments in production code.
3. Zero `window.confirm` (`AX_ConfirmModal` only).
4. 1:1 pulsing skeleton loader (`AX_SkeletonLoader`), zero spinners.
5. Full canvas layout (`w-full`), zero centered empty side gutters.
6. Modern pill-shaped buttons (`rounded-full`, `font-bold`).
7. Single-line desktop table rows (`hidden lg:block`, `h-12`) and mobile Bento cards (`lg:hidden`).
8. Meat red brand palette (`#991b1b` / `#450a0a` / `#b91c1c` / `#fee2e2`).
9. Active route navigation in `AX_Sidebar.jsx`, `AX_MobileNavbar.jsx`, and `src/App.jsx`.
Identify any formatting or layout regressions or line-count risks and propose remediation for the Worker.

## Key Files to Read
- `ORIGINAL_REQUEST.md`
- `PROJECT.md`
- `src/components/sales_reps/*`
- `src/components/navigation/AX_Sidebar.jsx`
- `src/components/navigation/AX_MobileNavbar.jsx`
- `src/App.jsx`
- `tests/file-invariants.test.js`

## Constraints
- Read-only exploration. DO NOT modify any code.
- Write handoff report to `.agents/teamwork/m4_explorer_2/handoff.md`.


## 2026-11-01T10:12:02Z
You are Milestone 4 Explorer 2 for the AX_PROTEIN_FOOD project.
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_explorer_2
Your dispatch assignment is detailed in: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_explorer_2\DISPATCH.md
MANDATORY: Read the original user request before starting work: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md
Also read d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md.

Explore Milestone 4 UI/UX and architectural conformance:
- Investigate `src/components/sales_reps/` files, line counts (<= 500 lines invariant), zero comments rule, zero window.confirm, 1:1 skeleton loader, pill buttons, meat red brand palette tokens, full canvas layout.
- Check single-line desktop rows (`hidden lg:block`, `h-12`) and mobile Bento cards (`lg:hidden`).
- Check navigation wiring in `src/components/navigation/AX_Sidebar.jsx`, `AX_MobileNavbar.jsx`, and `src/App.jsx`.
- Identify UI/UX gaps, line count risks, or navigation issues.
- Do NOT modify any code. Write your handoff report to:
`d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m4_explorer_2\handoff.md`.
Communicate your completion back to parent orchestrator via send_message.
