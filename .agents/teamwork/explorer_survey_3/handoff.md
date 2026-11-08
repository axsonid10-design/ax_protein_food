# Handoff Report: Technical Investigation of R4, R5, and R6

## 1. Observation
Direct, verified findings with line numbers and file paths across the codebase:

1. **HR Navigation Clipping & Fluff (R4)**:
   - `src/components/employees/AX_EmployeesManager.jsx`:
     - Line 77: `<div className="inline-flex items-center p-1 rounded-full bg-surface-low border border-outline-variant/30 gap-1 self-start sm:self-auto overflow-x-auto">` is contained in a parent with `flex-col sm:flex-row items-stretch sm:items-center justify-between` (line 64). On mobile viewports (<= 640px), `self-start` without `w-full` causes the 3 tab pills to clip or push outside the viewport boundary.
     - Lines 71-73: `<span className="text-[11px] font-bold text-on-surface-variant block">إدارة كادر العمل، تسجيل الحضور والانصراف، احتساب اليوميات ومسير الرواتب</span>` is descriptive filler text violating Project Rule 4 ("حظر حشو الكلام والتسويق والزوائد التفسيرية").
2. **"Add Employee" Button Obscured (R4)**:
   - `src/components/employees/AX_EmployeesManager.jsx`:
     - Lines 148-158: The FAB `<button ... title="إضافة موظف جديد">` is conditionally rendered **only** when `activeTab === 'directory'`. On the default landing tab (`activeTab === 'attendance'`) and on `activeTab === 'payroll'`, the button does not exist in the DOM.
     - Line 152: `className="fixed bottom-20 lg:bottom-6 left-6 z-30 ..."` directly collides with the mobile navbar (`AX_MobileNavbar` at `fixed bottom-0` with height ~64px), obstructing touch interactions on mobile.
3. **Mobile Layout Overlaps in Attendance Sheet (R4)**:
   - `src/components/employees/AX_EmployeeAttendanceSheet.jsx`:
     - Line 204: `<div className="w-48 mt-0.5"><AX_CompanyDatePicker ... /></div>` restricts date picker to 192px width, but the date picker popup inside `src/components/common/AX_CompanyDatePicker.jsx` (line 87) is hardcoded to `w-80` (320px) with `absolute right-0`. On 360px-390px screens, this causes overflow and clips off-screen.
     - Lines 326-345: The 5 attendance status buttons with verbose Arabic text ("حاضر (كامل)", "نصف يوم", "غياب بعذر", "غياب بدون عذر", "إجازة / راحة") wrap into 3-4 awkward lines per employee row on mobile, overlapping the notes input (line 348).
4. **Employee Deletion Mechanism (R5)**:
   - `src/components/employees/AX_EmployeesDirectory.jsx`:
     - Lines 192-200 and lines 234-241: Clicking the delete button simply calls `setEmployeeToDelete(emp)` and triggers `AX_ConfirmModal` (lines 257-268). There is currently **no hold-to-delete confirmation or animated countdown timer**.
5. **Wage Calculation Flaws (R5)**:
   - `src/store/employeeHelpers.js`:
     - Lines 61-63:
       ```javascript
       const workedUnits = presentDays + (halfDays * 0.5) + excusedDays + holidays
       earnedSalary = Math.round(workedUnits * dailyRate * 100) / 100
       deductionAmount = Math.round(totalDeductionDays * dailyRate * 100) / 100
       ```
       For daily workers, `workedUnits` incorrectly adds `excusedDays + holidays`. A worker with 2 present days, 5 excused days, and 4 holidays is credited with 11 days of wage instead of 2.
     - `src/components/employees/AX_EmployeeAttendanceSheet.jsx`:
       Lines 81-90: Setting status to `absent_excused` or `holiday` sets `dailyEarned: r.dailyRate` even when the employee is on daily rate (`salaryType === 'daily'`).
     - There is no direct financial penalty / deduction tracking for disciplinary actions.
6. **Advances & Expense Categories (R6)**:
   - `src/store/expenseCategoryHelpers.js`:
     - Lines 3-55: `initialExpenseCategories` has 4 main categories (`exp-main-ops`, `exp-main-adm`, `exp-main-fin`, `exp-main-mkt`). There is **no dedicated main category for employee loans and advances ("سلف")**.
   - `src/components/treasury/AX_TreasuryTransactionModal.jsx`:
     - Lines 291-323: Selecting `txType === 'payroll'` presents a basic input field `employeeName` without displaying current net dues, accrued balance, or calculating negative balances when an advance exceeds balance.
7. **Settlement Architecture Flaw (R6)**:
   - `src/store/employeeHelpers.js`:
     - Lines 66-72: `advancesPaid` filters transactions via `txDate.startsWith(yearMonth)`. This fails to carry forward unsettled balances or loans from past months into active periods, and misattributes delayed salary payouts to the wrong month.
     - There is no `payrollSettlements` tracking to mark settled periods as cleared.

---

## 2. Logic Chain
1. *From Observation 1*: The tab bar clips because `self-start` prevents it from taking full container width on mobile, and descriptive subtitles waste vertical canvas space. Therefore, removing the subtitle and giving the tab wrapper `w-full sm:w-auto overflow-x-auto` eliminates clipping.
2. *From Observation 2*: The "Add Employee" button is undiscoverable on attendance and payroll tabs because it is conditionally mounted only on the directory tab. Moving a primary "Add Employee" button to the top header card makes it universally visible across all tabs. Raising the mobile FAB to `bottom-24` prevents touch overlap with `AX_MobileNavbar`.
3. *From Observation 3*: Mobile attendance overlaps occur because the date picker popup has fixed `w-80` and the 5 status buttons have verbose text. Constraining the popup to `w-[calc(100vw-2rem)]` and using a compact 5-column segmented grid on mobile eliminates wrapping and overlaps.
4. *From Observation 4*: Deletions can happen accidentally via single-click dialog. A dedicated `AX_HoldToDeleteButton` with `pointerdown`/`pointerup` listeners and an animated 2.5s SVG countdown ensures intentional deletion without modals.
5. *From Observation 5*: Daily workers are currently paid for excused absences and holidays due to line 61 of `employeeHelpers.js`. Correcting `workedUnits = presentDays + (halfDays * 0.5)` for daily workers resolves the calculation bug. Adding a direct deduction modal (`AX_EmployeeDeductionModal`) provides the required penalty workflow.
6. *From Observation 6*: Recording advances without category tracking prevents proper accounting. Adding `exp-main-adv` ("سلف وقروض العاملين") with sub and secondary tiers creates proper 3-tier cost accounting. Providing an advance modal that compares requested amount with current net dues and permits negative balance satisfies R6.
7. *From Observation 7*: Month-only date string filtering (`txDate.startsWith(yearMonth)`) causes past unpaid wages and loans to disappear in future months. Introducing a persistent `payrollSettlements` collection enables locking settled periods so they are never double-counted, while accumulating unpaid or overdrawn balances into active unsettled periods.

---

## 3. Caveats
- No caveats regarding code access; all relevant HR, Treasury, Expense, and Attendance files have been inspected.
- Note on file length: `src/store/useAXStore.js` is currently 498 lines. All new logic should be encapsulated in helper files (`employeeHelpers.js`, etc.) to keep `useAXStore.js` and component files strictly under the 500 lines limit.

---

## 4. Conclusion
The codebase contains well-structured foundations for employees and attendance, but suffers from:
1. UI clipping and discoverability issues in navigation (R4).
2. Calculation discrepancies for daily workers and absent confirmation mechanisms for deletion (R5).
3. Missing 3-tier expense advance hierarchy and a period settlement mechanism that preserves active balances without double-counting (R6).

All recommended modifications are modular, cleanly architected with 4 dedicated new component files (`AX_HoldToDeleteButton.jsx`, `AX_EmployeeDeductionModal.jsx`, `AX_EmployeeAdvanceModal.jsx`, `AX_EmployeeSettlementModal.jsx`), and preserve all project invariants.

---

## 5. Verification Method
1. **Existing Test Suite Baseline**:
   - Run `npm test` to verify all 1000 existing tests pass.
2. **Formula & Calculation Verification**:
   - Inspect `src/store/employeeHelpers.js`:
     * Daily worker formula: `workedUnits = presentDays + (halfDays * 0.5)`.
     * Monthly worker formula: `earnedSalary = Math.max(0, baseSalary - deductionAmount)`.
     * Direct deduction integration into `totalDeductionAmount`.
3. **Layout & Invariant Verification**:
   - Verify all modified and new files obey `<= 500 lines`:
     `powershell -Command "Get-ChildItem -Path src/components/employees, src/store/employeeHelpers.js | Select-Object Name, @{Name='Lines';Expression={(Get-Content $_.FullName | Measure-Object -Line).Lines}}"`
   - Verify no console or lint errors.
