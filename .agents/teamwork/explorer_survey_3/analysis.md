# Comprehensive HR & Payroll Technical Survey & Architecture (R4, R5, R6)

## Executive Summary
This document provides a thorough audit of the Human Resources, Attendance, Wage Calculations, Employee Deductions, Employee Advances ("سلف"), and Wage Settlement architecture within the `AX_PROTEIN_FOOD` ERP system. It documents existing bugs, design defects, formulas, and specifies the exact components, store state adjustments, and test suites needed to fulfill Requirements R4, R5, and R6 under AXONID Master Invariants.

---

## 1. Requirement R4: HR Navigation & Mobile Responsive Layout

### 1.1 Current Implementation & Identified Defects
- **Target File**: `src/components/employees/AX_EmployeesManager.jsx`
- **Observations & Exact Line Citations**:
  1. **Top Tab Container Clipping & Overflow**:
     - At lines 77-119:
       ```jsx
       <div className="inline-flex items-center p-1 rounded-full bg-surface-low border border-outline-variant/30 gap-1 self-start sm:self-auto overflow-x-auto">
       ```
       On viewports <= 640px (mobile):
       The parent header card (lines 64-75) uses `flex-col sm:flex-row items-stretch sm:items-center`.
       The tab pill container is tagged with `self-start`. When active, on small screens (360px-390px) the 3 wide tabs ("سجل الحضور واليومية", "دليل الموظفين", "مسير الرواتب") overflow horizontally. Because the container is `self-start` without `max-w-full` or `w-full`, it clips or pushes against subsequent controls, cutting off the third tab or scrolling awkwardly.
     - The header also contains descriptive bloat at lines 71-73 (`<span className="text-[11px] font-bold text-on-surface-variant block">إدارة كادر العمل، تسجيل الحضور والانصراف، احتساب اليوميات ومسير الرواتب</span>`), which occupies vertical real estate on mobile and violates Rule 4 (Zero Descriptive Bloat / No Subtitles).
  2. **"Add Employee" Button Discoverability**:
     - At lines 148-158:
       ```jsx
       {activeTab === 'directory' && (
         <button
           type="button"
           onClick={handleOpenAddModal}
           className="fixed bottom-20 lg:bottom-6 left-6 z-30 flex items-center gap-2 px-5 py-3 rounded-full bg-primary hover:bg-primary-dark text-white font-black text-xs sm:text-sm shadow-level3 active:scale-95 transition-all cursor-pointer"
           title="إضافة موظف جديد"
         >
           <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
           <span>إضافة موظف جديد</span>
         </button>
       )}
       ```
       Defects:
       a. When `activeTab === 'attendance'` (which is the default landing tab upon entering HR!), there is **ZERO visible "Add Employee" button** anywhere on screen.
       b. When `activeTab === 'payroll'`, there is likewise no button. If a manager takes attendance or runs payroll and needs to register a new hire on the factory floor, they cannot discover how to add an employee.
       c. The fixed floating button is positioned at `bottom-20 left-6 z-30`. On mobile devices, `AX_MobileNavbar` is mounted at `fixed bottom-0` with `h-16`, meaning `bottom-20` is directly on top of the mobile navigation bar touch target zone, causing touch misfires.
  3. **Attendance Log, Daily Date & Date Picker Overlaps on Mobile**:
     - **Target File**: `src/components/employees/AX_EmployeeAttendanceSheet.jsx` (lines 197-234)
       ```jsx
       <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
             <Calendar className="w-5 h-5" />
           </div>
           <div>
             <span className="text-xs font-bold text-on-surface-variant block">تاريخ اليومية وسجل الحضور</span>
             <div className="w-48 mt-0.5">
               <AX_CompanyDatePicker
                 value={selectedDate}
                 onChange={setSelectedDate}
                 placeholder="اختر التاريخ..."
               />
             </div>
           </div>
         </div>
       ```
       Defects:
       a. The date picker wrapper has a fixed width `w-48` (192px). On mobile, alongside the `w-10` icon, it forces the row to wrap awkwardly against the action buttons ("تحضير الكل", "حفظ اليومية").
       b. Inside `src/components/common/AX_CompanyDatePicker.jsx` (line 87), the popup dropdown is hardcoded to `w-80` (320px) with `absolute right-0`. On a 360px-wide mobile screen in RTL, a 320px absolute container inside a constrained flex child causes horizontal viewport overflow and clips off the screen.
       c. Inside `AX_EmployeeAttendanceSheet.jsx` (lines 326-345), each attendance row on mobile displays 5 separate status buttons with lengthy text ("حاضر (كامل)", "نصف يوم", "غياب بعذر", "غياب بدون عذر", "إجازة / راحة"). On mobile, these wrap into 3 disorganized lines, overlapping the notes field and employee identity block.

### 1.2 Proposed Architecture & Solutions for R4
1. **Header & Navigation Bar Overhaul in `AX_EmployeesManager.jsx`**:
   - Remove descriptive marketing fluff subtitle.
   - Make the top tabs container fully responsive:
     `w-full sm:w-auto overflow-x-auto no-scrollbar scroll-smooth flex items-center justify-start sm:justify-end gap-1 p-1 rounded-full bg-surface-low border border-outline-variant/30 shrink-0`
   - Mount a primary "إضافة موظف" pill button directly in the top header card beside the tabs, visible **at all times** across all 3 tabs:
     ```jsx
     <button
       type="button"
       onClick={handleOpenAddModal}
       className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-xs shrink-0 cursor-pointer active:scale-95 transition-all"
     >
       <UserPlus className="w-3.5 h-3.5" />
       <span>إضافة موظف</span>
     </button>
     ```
   - Keep the secondary FAB on mobile, but adjust coordinates to `bottom-24 left-4 z-30` so it clears `AX_MobileNavbar` cleanly.
2. **Mobile Date Picker & Attendance Sheet Alignment in `AX_EmployeeAttendanceSheet.jsx`**:
   - In the header bar, use a responsive layout:
     Mobile: `flex flex-col gap-3 w-full`. Date picker container expands to `w-full sm:w-56`.
   - Update `AX_CompanyDatePicker.jsx` popover dropdown:
     `w-[calc(100vw-2rem)] max-w-xs sm:w-80 right-0 sm:right-auto` so it never spills over the screen edge on mobile.
   - For mobile attendance rows:
     Add a compact 5-column grid segmented pill bar (`grid grid-cols-5 gap-1 w-full sm:w-auto`) with short labels ("حاضر", "نصف", "بعذر", "غياب", "راحة") and icons, preventing multi-line wrapping and layout overlap.

---

## 2. Requirement R5: Hold-to-Delete Confirmation, Wage Calculations & Deductions

### 2.1 Hold-to-Delete Button with Animated Countdown Timer
- **Current State**:
  In `AX_EmployeesDirectory.jsx` (lines 192-200, 234-241), clicking delete immediately opens `AX_ConfirmModal`.
- **Requirement**:
  "Implement a hold-to-delete button with an animated countdown timer before executing deletions on employee records."
- **Component Design (`src/components/common/AX_HoldToDeleteButton.jsx`)**:
  - **Props**:
    * `onTrigger`: `() => Promise<void> | void`
    * `durationMs`: `2500` (2.5 seconds hold)
    * `label`: Default "حذف"
    * `compact`: Boolean (for table row icon mode)
  - **Mechanism**:
    * Uses `pointerdown` / `touchstart` / `mousedown` events to initiate hold state.
    * Active timer tracks remaining time: counts down `3... 2... 1...`.
    * Circular SVG or linear fill progress bar animates from 0% to 100% in crimson red (`#991b1b`).
    * On `pointerup`, `mouseleave`, `touchend`, or `touchcancel`: timer immediately cancels and resets without executing deletion.
    * Only upon 100% elapsed time does the callback trigger, accompanied by haptic vibration (`navigator.vibrate?.([40, 40, 80])`) and an `axToast.success` notification.
  - **Integration**:
    * Used in `AX_EmployeesDirectory.jsx` in both Desktop table rows and Mobile Bento cards.

### 2.2 Wage & Attendance Calculations Audit & Formula Corrections
- **Target File**: `src/store/employeeHelpers.js`
- **Discrepancies & Flaws Found**:
  1. **Daily Worker Paid for Non-Work Days**:
     - Current line 61:
       ```javascript
       const workedUnits = presentDays + (halfDays * 0.5) + excusedDays + holidays
       earnedSalary = Math.round(workedUnits * dailyRate * 100) / 100
       ```
       **Flaw**: In daily wage labor ("عمالة يومية"), a daily worker is paid strictly for days worked. Adding `excusedDays + holidays` artificially inflates their salary for days they never set foot in the factory! If an employee worked 2 days, had 5 excused absences and 4 weekend/holidays, the existing system pays them for 11 days (2 + 5 + 4 = 11 days * dailyRate)!
       **Correction**:
       For daily workers:
       ```javascript
       const workedUnits = presentDays + (halfDays * 0.5)
       earnedSalary = Math.round(workedUnits * dailyRate * 100) / 100
       ```
  2. **Attendance Sheet Daily Earned Mismatch**:
     - In `AX_EmployeeAttendanceSheet.jsx` (lines 81-90):
       When status is set to `absent_excused` or `holiday`, `dailyEarned` is unconditionally assigned `r.dailyRate`.
       **Correction**: For daily workers, `dailyEarned` on `absent_excused` and `holiday` must be `0`.
  3. **Absence Deductions vs Direct Financial Penalties**:
     - Current code only computes absence deductions: `unexcusedDays * dailyRate + halfDays * 0.5 * dailyRate`.
     - It lacks support for direct financial penalties / deductions (جزاءات وخصومات مباشرة, e.g. disciplinary penalty, safety violation, equipment damage).

### 2.3 Direct Deduction Action on Employee Records
- **Component to Create**: `src/components/employees/AX_EmployeeDeductionModal.jsx`
  - Allows HR or supervisors to apply direct wage penalties/deductions to an employee.
  - Deduction fields:
    * `type`: "financial_penalty" (مبلغ مالي بالجنيه), "days_deduction" (خصم أيام عمل), or "damage_compensation" (تعويض تلفيات).
    * `amount`: EGP amount (or days converted via `dailyRate`).
    * `date`: Operational date via `AX_CompanyDatePicker`.
    * `reason`: Disciplinary reason or violation notes.
    * `targetMonth`: Year-Month string (e.g. `2026-11`).
  - Stored in store state `employeeDeductions` (and `localStorage.setItem('ax_employee_deductions')`).
  - Reflects immediately in `computeMonthlyPayrollStats`:
    `totalDeductionAmount = absenceDeductions + directDeductions`.
  - Added as an action button on employee directory rows/cards and payroll ledger rows.

---

## 3. Requirement R6: Employee Advances & Wage Settlements

### 3.1 Dedicated Main Expense Category for Employee Advances ("سلف")
- **Target File**: `src/store/expenseCategoryHelpers.js`
- **Modifications**:
  Add a dedicated 3-tier expense category structure for employee advances:
  - **Main Category**:
    * `id`: `'exp-main-adv'`
    * `name`: `'سلف وقروض العاملين'`
    * `code`: `'EXP-ADV'`
    * `level`: `'main'`
    * `parentId`: `null`
  - **Sub-Categories**:
    * `'exp-sub-emp-adv'`: `'سلف مؤقتة على الراتب'` (`parentId`: `'exp-main-adv'`, code: `'EXP-ADV-SAL'`)
    * `'exp-sub-emp-loan'`: `'قروض وسلف طويلة الأجل'` (`parentId`: `'exp-main-adv'`, code: `'EXP-ADV-LON'`)
  - **Secondary Categories**:
    * `'exp-sec-adv-factory'`: `'سلف عمال تشغيل وتقطيع'` (`parentId`: `'exp-sub-emp-adv'`)
    * `'exp-sec-adv-drivers'`: `'سلف سائقي توزيع وحركة'` (`parentId`: `'exp-sub-emp-adv'`)
    * `'exp-sec-adv-general'`: `'سلف عامة للموظفين'` (`parentId`: `'exp-sub-emp-adv'`)
    * `'exp-sec-loan-personal'`: `'قروض شخصية للعاملين'` (`parentId`: `'exp-sub-emp-loan'`)

### 3.2 Recording Advances with Dynamic Balance & Overdraw Support
- **Requirements**:
  "When recording an advance against an employee, display their current remaining balance and net dues; allow recording amounts exceeding their balance, resulting in a negative balance."
- **Implementation**:
  - Create a dedicated modal `src/components/employees/AX_EmployeeAdvanceModal.jsx` and link it to both `AX_EmployeePayrollLedger.jsx` and `AX_TreasuryTransactionModal.jsx`.
  - Upon selecting an employee:
    1. System computes:
       * `earnedSalary`: Current accrued earnings in active period.
       * `deductions`: Total absence and direct deductions.
       * `existingAdvances`: Total unsettled advances previously taken.
       * `netDues`: `earnedSalary - deductions - existingAdvances`.
    2. Input field for advance amount `advanceAmount`.
    3. Live projection banner:
       * `projectedBalance = netDues - advanceAmount`.
       * If `projectedBalance >= 0`: Green badge showing remaining dues.
       * If `projectedBalance < 0`: Amber/Rose warning badge:
         `رصيد سالب (مديونية سلفة على الموظف): ${Math.abs(projectedBalance)} ج.م`.
       * System explicitly allows submission with negative balance (no blocking or clamping).
    4. Upon save:
       * Disburses cash from selected treasury account (`addCashTransaction`).
       * Records transaction with `type: 'payroll'`, `subType: 'advance'`, `partyType: 'employee'`, `partyId: employee.id`.
       * Appends advance to employee's active ledger.

### 3.3 Employee Settlement Process (Period Clearing & Balance Carry-Forward)
- **Current Bug & Critical Flaw**:
  In `employeeHelpers.js` (lines 66-74):
  `advancesPaid` filters transactions using:
  `txDate.startsWith(yearMonth)`.
  This produces two catastrophic errors:
  1. **Lost Unpaid Dues / Advances Across Months**: If an employee has unpaid salary or outstanding advance in October, navigating to November completely forgets October's balance because `txDate` doesn't match November!
  2. **Double-Counting or Misattribution**: If an employer pays October's remaining salary on November 2nd, the system subtracts that payment from November's earned salary, double-counting or corrupting November's dues!
- **Settlement Architecture**:
  1. **Store State**: `payrollSettlements` (persisted in `localStorage.getItem('ax_payroll_settlements')`).
  2. **Settlement Schema**:
     ```javascript
     {
       id: `settle_${yearMonth}_${employee.id}`,
       employeeId: employee.id,
       employeeName: employee.name,
       yearMonth: '2026-11',
       settledAt: new Date().toISOString(),
       earnedSalary: 6000,
       absenceDeductions: 200,
       directDeductions: 100,
       advancesDeducted: 1500,
       priorCarriedBalance: 0,
       netPayable: 4200,
       amountPaid: 4200,
       closingBalance: 0, // 0 if fully paid; residual (+ or -) carried to next period
       treasuryId: 'treasury-1',
       status: 'settled',
       notes: 'تسوية مسير شهر نوفمبر 2026'
     }
     ```
  3. **Settlement Workflow**:
     - In `AX_EmployeePayrollLedger.jsx`:
       Add a "تسوية الشهر" (Settle Period) button per employee and a "تسوية جماعية للمسير" (Batch Settle) button.
     - When a month is settled:
       * It creates a settlement record.
       * The period is marked as settled.
       * All attendance and advance records for that period are tagged as cleared/settled so they are **NEVER double-counted** in subsequent months.
       * Any remaining balance (e.g. if salary was only partially paid, or if advances exceeded salary leaving a negative debt) is recorded as `closingBalance` and automatically carried forward into the employee's active balance for subsequent unsettled periods.
  4. **Formula for Active Periods**:
     ```javascript
     // Prior balance carried from last settled period or cumulative past unsettled periods:
     const carriedBalance = computeEmployeeCarriedBalance(emp.id, yearMonth, payrollSettlements, allAttendance, allTransactions, allDeductions);
     const currentPeriodNet = earnedSalary - totalDeductions - periodAdvances;
     const totalNetPayable = currentPeriodNet + carriedBalance;
     ```

---

## 4. File Inventory & Line Count Governance

To comply strictly with the project invariant of **<= 500 lines per file** and clean component separation:

| Target File | Current Lines | Proposed Action | Estimated Result Lines |
|---|---|---|---|
| `src/components/employees/AX_EmployeesManager.jsx` | 176 | Update navigation tabs, remove fluff text, add header "Add Employee" button | ~190 lines (OK) |
| `src/components/employees/AX_EmployeesDirectory.jsx` | 272 | Integrate `AX_HoldToDeleteButton` and "خصم" trigger | ~295 lines (OK) |
| `src/components/employees/AX_EmployeeAttendanceSheet.jsx` | 364 | Fix mobile date picker wrapping & compact mobile status segmented bar | ~390 lines (OK) |
| `src/components/employees/AX_EmployeePayrollLedger.jsx` | 413 | Extract modals to separate files; add settlement & advance triggers | ~380 lines (OK) |
| `src/components/common/AX_HoldToDeleteButton.jsx` | *NEW* | Reusable Hold-to-Delete button with animated radial countdown | ~120 lines (OK) |
| `src/components/employees/AX_EmployeeDeductionModal.jsx` | *NEW* | Disciplinary deductions and penalties modal | ~180 lines (OK) |
| `src/components/employees/AX_EmployeeAdvanceModal.jsx` | *NEW* | Employee advance modal with dynamic balance & negative balance support | ~200 lines (OK) |
| `src/components/employees/AX_EmployeeSettlementModal.jsx` | *NEW* | Period wage settlement & balance carry-forward modal | ~210 lines (OK) |
| `src/store/employeeHelpers.js` | 134 | Update formulas (daily worker fix, deductions, settlements, carry-forward) | ~260 lines (OK) |
| `src/store/expenseCategoryHelpers.js` | 170 | Add 3-tier employee advances expense category hierarchy | ~205 lines (OK) |
| `src/store/useAXStore.js` | 498 | Add settlements & deductions slices by delegating to helpers (keep <= 500) | ~495 lines (OK) |

---

## 5. Automated Verification Plan
1. `tests/employee-r4-navigation-mobile.test.js`:
   - Verifies responsive tab bar class invariants and absence of marketing subtitle text.
   - Verifies "إضافة موظف" button existence and accessibility across all tabs.
   - Verifies `AX_CompanyDatePicker` popover mobile max-width containment.
2. `tests/employee-r5-hold-to-delete-wages.test.js`:
   - Verifies daily worker wage calculation does not pay for excused absences or holidays.
   - Verifies monthly worker wage calculation correctly deducts unexcused absences.
   - Verifies financial penalties / direct deductions subtract accurately from net salary.
3. `tests/employee-r6-advances-settlements.test.js`:
   - Verifies presence of 3-tier "سلف وقروض العاملين" expense category in `initialExpenseCategories`.
   - Verifies advance calculation allows negative balance when advance exceeds accrued dues.
   - Verifies period settlement marks month as settled, prevents double-counting in next month, and correctly carries forward unpaid balances or overdrawn debt.
