Implement distribution van management and daily settlement workflows, standalone multi-tier expense and cost-center accounting, and employee HR navigation, calculations, hold-to-delete confirmation, and expense advance tracking in the Protein Food ERP production system.

Working directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS
Integrity mode: development

## Requirements

### R1. Distribution Vans Management & Stock Loading
Support adding distribution vehicles to the system. Provide inventory transfer/loading into vehicles utilizing a card-based selection layout with category filters on top, replacing the legacy cargo shipping UI. Support packaging breakdowns and fractional quantity entry based on packaging types (cartons containing pieces, bags, trays, or plain cartons). Track real-time vehicle custody inventory. Link driver user accounts to their assigned vehicle so that sales transactions recorded by the driver automatically deduct from the vehicle's custody inventory.

### R2. Van Daily Settlement (Financial, Stock & Expenses)
Provide an end-of-day settlement workflow for distribution vehicles. Settle collected revenue with support for split payment methods (part cash, part bank transfer). Settle remaining inventory with options to retain stock on the vehicle or return items back to warehouse inventory. Allow recording and deducting operational expenses incurred by the driver (e.g., fuel) directly during the settlement by adding multiple itemized expense lines.

### R3. Standalone Expenses & Multi-Tier Cost Centers
Provide a dedicated standalone Expenses page ("المصروفات"). Implement a multi-tier classification hierarchy where users select a cost center entity before choosing the main expense category: Warehouses (dynamically listing all warehouses), Vehicles (dynamically listing all distribution vans), Factory ("المصنع"), or General. Main expense categories must be shared across entities. Support splitting expense payments across multiple treasuries/accounts (e.g. part cash, part transfer), and support deferred expenses ("آجل") with installment scheduling. Overhaul the Expense Categories Management modal ("إدارة بنود المصروفات") to eliminate overlapping and broken form elements, ensuring smooth category creation and editing.

### R4. HR Navigation & Mobile Responsive Layout
Fix the employee management navigation bar so that top tabs ("سجل الحضور واليومية", "دليل الموظفين") do not clip or hide subsequent controls. Fix mobile layout overlaps between attendance logs, daily dates, and date pickers. Ensure the "Add Employee" button is clearly positioned and easily discoverable.

### R5. Hold-to-Delete Confirmation, Wage Calculations & Deductions
Implement a hold-to-delete button with an animated countdown timer before executing deletions on employee records. Audit and correct wage and attendance calculation formulas to guarantee accuracy. Provide a deduction action on employee records to apply wage penalties or deductions directly.

### R6. Employee Advances & Wage Settlements
Provide a dedicated main expense category for employee loans and advances ("سلف"). When recording an advance against an employee, display their current remaining balance and net dues; allow recording amounts exceeding their balance, resulting in a negative balance. Provide an employee settlement process that clears settled periods without double-counting past months, while preserving active balances for unsettled periods.

## Acceptance Criteria

### Distribution Vans & Stock Loading
- [ ] Users can add and manage distribution vehicles.
- [ ] Stock transfer/loading into vehicles uses the card-based layout with category filters at the top.
- [ ] Items support fractional quantity entries according to their packaging breakdown (cartons with pieces, bags, trays, or plain cartons).
- [ ] Real-time custody inventory on each vehicle is accurately tracked and displayed.
- [ ] Sales recorded by a driver user automatically deduct stock from their assigned vehicle.

### Vehicle End-of-Day Settlement
- [ ] Settlement allows recording collected revenue split between cash and bank transfer channels.
- [ ] Settlement allows choosing whether remaining inventory stays on the vehicle or returns to warehouse stock.
- [ ] Operational expenses (e.g., fuel) can be itemized as multiple expense lines and deducted during the vehicle settlement.

### Expenses & Cost Centers
- [ ] A dedicated "المصروفات" page is accessible as a standalone view.
- [ ] Users can select a cost center entity (Warehouse, Vehicle, Factory, General) before selecting the main expense category.
- [ ] Active warehouses and vehicles are dynamically populated in the cost center selector.
- [ ] Expense payments can be split across multiple payment channels/treasuries.
- [ ] Deferred expenses ("آجل") can be recorded with scheduled payment dates.
- [ ] The "إدارة بنود المصروفات" modal renders cleanly without overlapping fields, allowing adding and editing categories.

### HR UI & Mobile Optimization
- [ ] The top tab bar in HR ("سجل الحضور واليومية", "دليل الموظفين") displays all tabs and subsequent controls without clipping or horizontal overflow.
- [ ] Attendance logs, daily dates, and date pickers display without overlap or misalignment on mobile screens.
- [ ] The "Add Employee" button is clearly visible and functional in the employee directory.

### Hold-to-Delete, Wage Calculations & Deductions
- [ ] Deleting an employee requires holding the delete button with an animated countdown timer before deletion triggers.
- [ ] Attendance and wage calculations produce verified, correct totals.
- [ ] Deductions can be applied to an employee directly from their record or card.

### Employee Advances & Settlements
- [ ] A dedicated expense category exists for employee advances ("سلف").
- [ ] Recording an employee advance displays their current dues and allows recording amounts exceeding their balance (resulting in a negative balance).
- [ ] Employee wage settlements clear the settled period without double-counting past months, while retaining unpaid balances.

### Verification & Architectural Quality
- [ ] Automated tests verify vehicle inventory deductions, settlement math, multi-channel expense splitting, employee wage calculations, and settlement balances.
- [ ] All automated tests pass cleanly with zero failures.
- [ ] All modified and new files adhere to project invariants (<= 500 lines per file, zero comments in code, and AXONID UI/UX standards).
