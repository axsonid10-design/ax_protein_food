# Project: AX_PROTEIN_FOOD Enhancements & Bug Fixes

## Architecture
- **Stack**: React 18, Vite 6, Tailwind CSS, Zustand (`useAXStore.js`), IndexedDB (`offlineDB.js`), Supabase PostgreSQL.
- **Standards**: Zero comments in code, <500 lines per file (strictly enforced by `tests/file-invariants.test.js`), modern pill-shaped buttons, custom styled selectors/calendars (`AX_CompanyDatePicker`, `AX_SearchableSelect`), no full-screen spinners (`AX_SkeletonLoader` only).
- **Core State Flows**:
  - Store hydration via `AX_DatabaseSync.fetchFullDatabase()` reading from Supabase tables and caching into IndexedDB & localStorage.
  - Activity logs logged to `ax_activity_logs`.
  - Ledgers dynamically aggregated from invoices, cash transactions, and audited balance adjustments.

## Feature Inventory
Every feature from the Survey phase is mapped to an assigned milestone.
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Header Cleanliness | Remove prohibited phrase "تحديث لحظي" from UI and ensure no unnecessary scanning badges | M1 | Survey 3 (R5) |
| 2 | Treasury Deletion Persistence | Prevent deleted treasury accounts from resurrecting upon reload (FK nullification & store cleanup) | M2 | Survey 3 (R4) |
| 3 | Customer Card Body Click | Clicking anywhere on customer card body opens full 360° details modal | M3 | Survey 1 (R1) |
| 4 | Sales Rep Inline Creation | Styled sales rep dropdown with inline add button in customer form | M3 | Survey 1 (R1) |
| 5 | Dynamic Activity Categories | Styled category dropdown with ability to add and edit customer activity categories | M3 | Survey 1 (R1) |
| 6 | Audited Customer Balance Adjustment | Modifying balance creates audited "تسوية رصيد" ledger record without distorting treasury cash | M3 | Survey 1 (R1) |
| 7 | Supplier Card Body Click | Clicking anywhere on supplier card body opens full 360° details modal | M4 | Survey 1 (R2) |
| 8 | Supplier Overpayment Tracking | Track and display supplier overpayments in dedicated balance metrics and rows | M4 | Survey 1 (R2) |
| 9 | Invoices Statement Tab Modularization | Extract statement subview to `AX_InvoicesStatementTab.jsx` to prevent breaching 500-line limit | M5 | Survey 2 (R3) |
| 10 | Invoices Timeframe Filtering | Filter invoices by Day, Week, Month, Year, Custom range, and Specific day | M5 | Survey 2 (R3) |
| 11 | Invoices 4-Way Color-Coding | Color-code invoices list for Sales, Purchases, Sales Returns, and Purchase Returns | M5 | Survey 2 (R3) |
| 12 | Printable Sheet Preview | Display realistic paper-style invoice preview during and immediately upon invoice creation | M5 | Survey 2 (R3) |
| 13 | Invoice Return Conversion Flow | Convert an invoice or selected line items to official sales return with balance and stock reversal | M5 | Survey 2 (R3) |
| 14 | Reports KPI Cards Expansion | Expand summary metrics to 8 financial and operational cards | M6 | Survey 2 (R6) |
| 15 | Reports Date Filtering | Add "Specific Day" single-date picker to reports filtering | M6 | Survey 2 (R6) |
| 16 | Reports Clean Print Styling | Add `@media print` CSS and layout for clean A4/PDF export without UI chrome | M6 | Survey 2 (R6) |
| 17 | Reports Accounting Fixes | Fix return misclassification, cash flow double-counting, and mock percentages | M6 | Survey 2 (R6) |
| 18 | Verification & Invariants | Automated test suite validating all acceptance criteria and file invariants | M7 | Survey 1,2,3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Header & Navigation Cleanliness | Remove "تحديث لحظي" and check header bar | none | DONE (Verified 0 occurrences, clean header) |
| M2 | Treasury Deletion Persistence | Fix deleteTreasuryAccountInDB, FK handling, and offline store sync | none | DONE (Supabase FK ON DELETE SET NULL, multi-cache sync) |
| M3 | Customer Management & Details Modal | Card click, sales rep inline creation, dynamic categories, audited balance adjustment | none | DONE (Card click, sales rep inline add, dynamic categories, audited balance adjustment) |
| M4 | Supplier Management & Overpayment Tracking | Card click, supplier overpayment computation & metric display | none | DONE (Card click, overpayment tracking card, overpaid filter) |
| M5 | Invoices Workflow, Print Preview & Returns | Statement modularization, 4-way color coding, timeframe filtering, printable preview, return conversion | none | DONE (AX_InvoicesStatementTab, timeframe filter, 4-way themes, print preview, return modal) |
| M6 | Reports Module Refinement | 8 KPI cards, specific day filter, print CSS, accounting fixes | M5 | DONE (8 KPI cards, specific day filter, @media print CSS, 3 accounting fixes) |
| M7 | Comprehensive Verification & Invariants | End-to-end regression test suite and file invariants check | M1-M6 | DONE (Reviewers: APPROVE, Challengers: APPROVE, Auditor: CLEAN, 814/814 tests pass, build clean) |

## Interface Contracts
### Customer Balance Adjustment
- `customer_adjustments` entry:
  `{ id, customerId, customerName, previousBalance, newBalance, adjustmentAmount, adjustmentType: 'تسوية رصيد', notes, createdAt, timestamp }`
- Added to customer ledger without creating a `treasury_transaction` unless treasuryId is specified.

### Supplier Overpayment Calculation
- `overpaymentAmount = Math.max(0, totalSettledAmount - totalPurchasesAmount)`
- Rendered in `AX_SupplierDetailsModal.jsx` and `AX_SuppliersManager.jsx`.

### Invoice Return Conversion
- `convertInvoiceToReturn(originalInvoice, selectedItems, refundSettlement)`
  - Generates return invoice with `type: 'sale_return'`, `originalInvoiceId: originalInvoice.id`.
  - Reverses stock quantities (`delta = +quantity`).
  - Reverses customer balance (`balanceDelta = -returnAmount` if credited to account).

### Treasury Account Deletion
- Nullifies `ax_cash_transactions.treasury_id` and `ax_cash_transfers.from_treasury_id / to_treasury_id`.
- Deletes row from `ax_treasuries`.
- Updates `treasuryAccounts` in `useAXStore`, `localStorage`, and `offlineDB`.

## Code Layout
- `src/components/navigation/`: Header, sidebar, mobile navigation.
- `src/components/dashboard/`: Dashboard components, period filter bar.
- `src/components/customers/`: Customer bento cards, customer modal, details modal, form fields, category helpers.
- `src/components/suppliers/`: Supplier bento cards, supplier manager, supplier details modal.
- `src/components/invoices/`: Invoices manager, create invoice modal, print modal, details modal, return modal, statement tab, timeframe filter.
- `src/components/reports/`: Reports manager, sub-reports, print layouts.
- `src/services/`: `AX_OperationsService.js`, `AX_DatabaseSync.js`.
- `src/store/`: `useAXStore.js`, `storeCacheHelper.js`, `offlineDB.js`.
- `tests/`: `file-invariants.test.js`, `hooks-integrity.test.js`, and milestone integration tests.
