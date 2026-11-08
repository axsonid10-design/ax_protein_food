## 2026-11-08T21:49:50Z
You are explorer_survey_3. Your working directory is d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_3.

Read d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.

Your scope is to investigate Requirements R4, R5, and R6:
### R4. HR Navigation & Mobile Responsive Layout
Fix the employee management navigation bar so that top tabs ("سجل الحضور واليومية", "دليل الموظفين") do not clip or hide subsequent controls. Fix mobile layout overlaps between attendance logs, daily dates, and date pickers. Ensure the "Add Employee" button is clearly positioned and easily discoverable.

### R5. Hold-to-Delete Confirmation, Wage Calculations & Deductions
Implement a hold-to-delete button with an animated countdown timer before executing deletions on employee records. Audit and correct wage and attendance calculation formulas to guarantee accuracy. Provide a deduction action on employee records to apply wage penalties or deductions directly.

### R6. Employee Advances & Wage Settlements
Provide a dedicated main expense category for employee loans and advances ("سلف"). When recording an advance against an employee, display their current remaining balance and net dues; allow recording amounts exceeding their balance, resulting in a negative balance. Provide an employee settlement process that clears settled periods without double-counting past months, while preserving active balances for unsettled periods.

Investigate the authoritative codebase in d:\AXONID_PROJECTS\AX_FROZEN_FOODS:
1. Search and inspect all HR-related files: `src/components/employees/`, `src/components/attendance/`, `src/store/`, `useAXStore.js`, etc.
2. Examine the navigation bar and top tabs ("سجل الحضور واليومية", "دليل الموظفين") and controls clipping / overflow behavior on desktop and mobile.
3. Examine mobile layout overlaps between attendance logs, daily dates, and date pickers.
4. Locate the "Add Employee" button and see why it might be obscured or hard to discover.
5. Check how employee deletion is currently implemented and design the hold-to-delete button with animated countdown timer.
6. Audit existing wage and attendance calculation formulas in the codebase. Document any calculation bugs, edge cases, or discrepancies.
7. Check employee deductions, loans/advances ("سلف"), and how they link to expenses and employee balances.
8. Check the employee settlement process: how periods are settled, where past months could be double-counted, and how to maintain correct unsettled active balances.
9. Identify the exact files to modify or create, adhering to AXONID rules (<= 500 lines per file, zero comments, pill buttons, full canvas).

Document your findings and recommendations in d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_3\analysis.md and d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_3\handoff.md. Update progress.md as you work.
When done, send a message to your caller with a summary of findings and the path to your handoff.md.
