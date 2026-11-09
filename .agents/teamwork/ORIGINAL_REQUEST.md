# Original User Request

## Initial Request — 2026-11-09T14:22:23Z

Refactor and fix invoice creation timestamp formatting, date range filtering, dynamic stock deduction, FIFO cost and profit calculation, and expense registration forms in AX_PROTEIN_FOOD.

Working directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS
Integrity mode: development

## Requirements

### R1. Invoice Creation Timestamp & 12-Hour Format
Display the invoice creation timestamp alongside the invoice number in both Sales and Purchases invoices. Format all time displays using a 12-hour clock (hh:mm AM/PM) instead of 24-hour time across invoice headers, lists, and detail views.

### R2. Invoice Date Range & "Today" Filter
Fix the date filter in both Sales and Purchases invoice modules so that selecting "Today" strictly displays invoices created on the current calendar day. Ensure custom date range filters accurately scope invoices within the selected start and end dates.

### R3. Dynamic Available Stock Indicator & Zero-Value Validation in Sales Invoices
In the Sales Invoice creation interface, dynamically decrement and display the remaining available stock for each product in real-time as item quantities are entered. If the entered quantity exceeds available stock, display the remaining stock as a negative number while continuing to allow the invoice to be saved. Prevent saving the invoice and show a clear alert if any product line has a unit sale price or quantity that is zero or empty.

### R4. Purchase Cost Tracking & Sales Profit Calculation (FIFO)
Track inventory items with multiple purchase costs across purchase batches. When selling items, calculate profit using First-In, First-Out (FIFO) matching against available purchase batches. If a product's purchase price was not determined at the time of purchase, defer profit calculation safely and display profit as pending/uncalculated.

### R5. Expense Registration Form Simplification
Refactor the expense registration modal by completely removing the "Cost Center" selection and the "Description/Statement of Expense/Project" field. Retain the hierarchical expense classification structure (Main Category, Sub-category, Secondary Item). Reposition the "Total Expense Amount" field to appear at the bottom, directly above the settlement and payment method section.

## Acceptance Criteria

### Invoice Formatting & Filtering
- [ ] Both Sales and Purchases invoices show creation timestamp formatted in 12-hour clock with AM/PM indicator.
- [ ] Invoices list filtered by "Today" returns exclusively records created on the current calendar day.
- [ ] Invoices list filtered by custom date ranges includes all records within the range and excludes records outside of it.

### Sales Stock & Zero Validation
- [ ] Entering quantities in sales invoice rows decrements the displayed available stock dynamically in real-time.
- [ ] If entered quantity exceeds available stock, remaining stock displays as negative and invoice saving remains allowed.
- [ ] Attempting to save a sales invoice with any item whose unit sale price is 0, empty, or unentered displays an alert and blocks submission.
- [ ] Attempting to save a sales invoice with any item whose quantity is 0, empty, or unentered displays an alert and blocks submission.

### Multi-Price Inventory & FIFO Profit
- [ ] Multiple purchase invoices for the same product at different prices create distinct cost batches with their respective quantities.
- [ ] Sales profit calculation depletes purchase batches using FIFO (earliest purchased stock cost first).
- [ ] Items sold without a defined purchase cost do not cause calculation errors and indicate uncalculated or pending profit.

### Expenses Form Structure
- [ ] The "Cost Center" field and selection dropdown are absent from the expense registration modal.
- [ ] The "Description / Statement of Expense / Project" field is absent from the expense registration modal.
- [ ] The hierarchical expense classification (Main Category, Sub-category, Secondary Item) remains present and functional.
- [ ] The "Total Expense Amount" input field is positioned directly before the settlement and payment method section.

### Verification & Test Suite
- [ ] Existing automated tests in `tests/*.test.js` pass, with new/updated tests covering the modified invoice, expense, and calculation workflows.
- [ ] Browser/E2E test verification confirms UI calculations, form validations, and clean console without runtime errors.

## Verification Resources
- Existing test suite located in `tests/*.test.js`.
- Browser/E2E verification tests checking invoice workflows, stock calculations, modal behaviors, and expense submissions.

## Follow-up — 2026-11-09T15:11:25Z

Update from user to add to the roadmap:
The user has requested adding a dedicated, standalone module for Direct/Unlinked Returns (مرتجعات حرة ومباشرة بدون فاتورة سابقة سواء لعميل أو مورد):
- Direct sales return (مرتجع مبيعات حر بدون فاتورة): returns goods into the specified warehouse (increases stock), and either refunds cash from the selected treasury or deducts from the client's debit balance.
- Direct purchase return (مرتجع مشتريات حر بدون فاتورة): returns goods out of the specified warehouse (decreases stock), and either receives cash into the selected treasury or deducts from the supplier's balance.
- Standalone page: `AX_ReturnsManager.jsx` with tabs for Sales Returns and Purchase Returns, bento stats, printable A4/PNG receipt with 1-click WhatsApp share, and navigation integration.
- The user authorized immediate approval of the plan. Complete architectural specification is documented in `direct_returns_plan.md`. Please incorporate this as a planned milestone in the project roadmap.


## Follow-up — 2026-11-09T15:12:09Z

Update from user to add to the roadmap:
The user has requested adding a dedicated, standalone module for Direct/Unlinked Returns (مرتجعات حرة ومباشرة بدون فاتورة سابقة سواء لعميل أو مورد):
- Direct sales return (مرتجع مبيعات حر بدون فاتورة): returns goods into the specified warehouse (increases stock), and either refunds cash from the selected treasury or deducts from the client's debit balance.
- Direct purchase return (مرتجع مشتريات حر بدون فاتورة): returns goods out of the specified warehouse (decreases stock), and either receives cash into the selected treasury or deducts from the supplier's balance.
- Standalone page: `AX_ReturnsManager.jsx` with tabs for Sales Returns and Purchase Returns, bento stats, printable A4/PNG receipt with 1-click WhatsApp share, and navigation integration.
- The user authorized immediate approval of the plan. Complete architectural specification is documented in `direct_returns_plan.md`. Please incorporate this as a planned milestone in the project roadmap.
