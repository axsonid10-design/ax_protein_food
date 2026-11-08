# Comprehensive Architectural Analysis — Requirement R3: Standalone Expenses & Multi-Tier Cost Centers

## 1. Executive Summary & Problem Scope
The objective of Requirement R3 is to elevate expenses from simple treasury disbursement lines into an enterprise-grade standalone accounting module:
1. **Dedicated Standalone Page ("المصروفات")**: Provide a dedicated route and view for tracking operational and capital expenditures with rich metrics, filters, and full ledger views.
2. **Multi-Tier Cost Centers**: Enforce entity classification before selecting expense categories:
   - **Warehouses ("المخازن")**: Dynamically populating all active warehouses.
   - **Vehicles ("سيارات التوزيع")**: Dynamically populating all active distribution vans.
   - **Factory ("المصنع")**: Factory and processing lines.
   - **General ("عام / الإدارة العامة")**: Head office and general administrative operations.
   - **Shared Main Categories**: Main expense categories (Operations, Admin, Finance, Marketing, Employee Advances) remain shared across all entities.
3. **Split Payment Distribution**: Enable splitting a single expense across multiple treasuries/payment channels (e.g. part cash from main safe, part bank transfer or InstaPay).
4. **Deferred Expenses ("آجل") & Installment Scheduling**: Support recording unpaid or partially paid expenses with scheduled installment due dates and subsequent settlement actions.
5. **Overhaul of "إدارة بنود المصروفات" Modal**: Eliminate layout overlapping, broken mobile views, and state update race conditions in `AX_ExpenseCategoriesModal.jsx`.

---

## 2. Current Codebase Baseline & Structural Observations

### 2.1 Database & Schema Modeling
- **`ax_cash_transactions` Table**:
  - Live columns: `id`, `code`, `type` (`'expense' | 'client_receipt' | 'supplier_payment' | 'other_income'`), `party_type`, `party_id`, `party_name`, `amount`, `treasury_id`, `date`, `notes`, `created_at`.
  - Currently, when an expense is recorded via `AX_TreasuryTransactionModal`, it creates an `ax_cash_transactions` row where `party_type = 'expense'` and `party_name = '[Hierarchy Label]'`.
  - **Limitation**: `ax_cash_transactions` stores a single `treasury_id` per record and requires an immediate monetary debit. It cannot represent split multi-treasury disbursements or deferred ("آجل") liabilities with future installments without either a dedicated schema or multi-line transaction mapping.
- **`ax_categories` Table**:
  - Used strictly for commercial item categories (e.g. `مصنعات`, `مجزءات`, `خامات`, `سجق`).
- **Expense Categories Storage**:
  - Stored in `localStorage` under key `ax_expense_categories` and managed via `src/store/expenseCategoryHelpers.js`. Seed data contains 4 main categories, 8 subcategories, and 18 secondary categories.

### 2.2 Store Architecture & Critical Invariant Constraints
- **`src/store/useAXStore.js` File Limit Risk**:
  - `src/store/useAXStore.js` is currently **498 lines long** (out of the strict 500-line hard limit).
  - **Architectural Rule**: Adding state and action handlers directly inside `useAXStore.js` will breach the 500-line limit. All expense logic MUST be isolated in dedicated helper modules (`src/store/expenseStoreHelpers.js`) and referenced concisely.
- **Store State Collections**:
  - `warehouses`: Array of warehouses (including branches and storage freezers).
  - `distributors`: Array of sales representatives and distribution vans (`vanNumber`, `name`, `id`).
  - `treasuryAccounts`: Array of cash treasuries, banks, and mobile wallets (`balance`, `type`, `id`, `name`).
  - `cashTransactions`: Ledger of completed cash movements.

### 2.3 Navigation & Routing
- **`src/App.jsx`**:
  - Lines 279–294 mount module screens based on `activeTab`. No tab exists for `'expenses'`.
- **`src/components/navigation/AX_Sidebar.jsx`**:
  - Under "المالية والحسابات" (Financials), only `treasury` and `reports` are listed.
- **`src/components/navigation/AX_MobileNavbar.jsx`**:
  - 15 module tabs are present; `expenses` is missing.
- **`src/utils/permissionsConfig.js`**:
  - `MODULE_PERMISSIONS_CONFIG` does not include `expenses`. Role presets (`accountant`, `admin`, `cashier`, `warehouse_manager`) need proper default access permissions.

### 2.4 Layout & Logic Deficiencies in `AX_ExpenseCategoriesModal.jsx`
1. **State Update Race Condition on Category Addition**:
   - In `handleSaveAdd` (lines 60–65), `setSelectedMainId(allMains[allMains.length - 1]?.id)` runs before the asynchronous store mutation finishes, selecting the prior last category instead of the newly created one.
   - For subcategories (`addLevel === 'sub'`), it calls `setSelectedSubId(parentId)` where `parentId` is the *Main* category ID, breaking the 3rd secondary column completely.
2. **Cramped Inline Edit Inputs**:
   - Lines 213–225, 323–335, and 429–441 replace list items with an inline form inside ~240px columns, squishing buttons and causing text truncation and border clipping.
3. **Double Scrollbars & Overflow Stacking**:
   - Modal wrapper has `max-h-[92vh] overflow-y-auto` while each internal column has `overflow-y-auto max-h-[320px]`.
   - On mobile (`grid-cols-1`), columns stack vertically, requiring excessive scrolling to navigate between tiers.

---

## 3. Architectural Design for Requirement R3

### 3.1 Data Model: Unified Expense Structure
An expense entity encapsulates cost-center hierarchy, classification, payment splits, and installment schedules:

```typescript
interface AX_Expense {
  id: string; // UUID
  code: string; // e.g. "EXP-2026-0042"
  title: string; // Brief description / memo
  costCenterType: 'warehouse' | 'vehicle' | 'factory' | 'general';
  costCenterId: string | null; // Warehouse ID or Vehicle ID
  costCenterName: string; // e.g. "ثلاجة المنارة الرئيسية" or "فان رقم 1 - جامبو"
  
  // Classification Hierarchy
  expenseMainCategoryId: string;
  expenseMainCategoryName: string;
  expenseSubCategoryId: string;
  expenseSubCategoryName: string;
  expenseSecondaryCategoryId?: string;
  expenseSecondaryCategoryName?: string;
  
  // Financials
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'partial' | 'deferred'; // 'مدفوع كلي' | 'مدفوع جزئي' | 'غير مدفوع (آجل)'
  payeeName: string; // Creditor / Beneficiary / Contractor
  date: string; // YYYY-MM-DD
  operationalDate: string;
  notes: string;
  
  // Multi-Treasury Split Payments
  payments: Array<{
    id: string;
    treasuryId: string;
    treasuryName: string;
    amount: number;
    paymentMethod: 'cash' | 'bank_transfer' | 'instapay' | 'cheque';
    date: string;
    transactionCode: string;
    notes?: string;
  }>;
  
  // Deferred Installment Scheduling
  installments: Array<{
    id: string;
    installmentNumber: number;
    dueDate: string; // YYYY-MM-DD
    amount: number;
    status: 'pending' | 'paid';
    paidDate?: string | null;
    treasuryId?: string | null;
    treasuryName?: string | null;
    notes?: string;
  }>;
  
  createdAt: string;
  created_at: string;
}
```

### 3.2 Component Architecture

```
src/components/expenses/
├── AX_ExpensesManager.jsx                # Main Standalone Page (Stats, Filters, Desktop Table, Mobile Bento)
├── AX_CreateExpenseModal.jsx             # Creation Modal (Cost Center -> Category -> Split / Deferred)
├── AX_ExpenseDetailsModal.jsx            # 360° Inspection & Installment Settlement Action Modal
├── AX_ExpenseCostCenterHierarchySelect.jsx # Multi-Tier Selector (Cost Center Entity -> 3-Tier Category)
└── expenseConstants.js                   # Cost center options, badges, payment status translations
```

#### A. `AX_ExpensesManager.jsx` (Standalone Page)
- **Geometry**: Full canvas (`w-full px-3 sm:px-6 lg:px-8 py-4`), zero side gutters.
- **Header & Metric Cards**:
  1. *Total Expenses This Month*: Sum of all expenses incurred in the current period.
  2. *Cash Paid Outflow*: Sum of all executed treasury payments.
  3. *Deferred Liabilities ("آجل")*: Total unpaid balance across active deferred expenses.
  4. *Pending Installments*: Count and amount of upcoming due installments.
- **Filter Controls**:
  - Timeframe pills: "اليوم", "آخر 7 أيام", "الشهر الحالي", "الكل", "مخصص" (via `AX_CompanyDatePicker`).
  - Cost Center Filter: "الكل", "المخازن", "السيارات", "المصنع", "عام".
  - Specific Entity Filter: Filter by specific warehouse or distribution van.
  - Category Filter: Filter by Main Expense Category.
  - Payment Status Filter: "الكل", "مدفوع كلي", "مدفوع جزئي", "آجل".
  - Search Input: Smart unified search by title, code, payee, notes.
- **Desktop Table (`hidden lg:block`)**:
  - Single-line compact row (Rule #16) with code, date, cost center badge, category path, payee, total, paid, remaining, status pill, and action triggers.
  - Pagination bar (15 records per page, Rule #17).
- **Mobile Bento Cards (`lg:hidden`)**:
  - Responsive Bento cards displaying key indicators, cost center tags, progress bar (paid vs remaining), and action buttons.
- **Floating Action Button (FAB)**:
  - Bottom-anchored pill button for quick expense creation.

#### B. `AX_ExpenseCostCenterHierarchySelect.jsx` (Multi-Tier Selector)
- **Step 1: Cost Center Selection**:
  - Radio/Pill group: "المخازن والتبريد", "سيارات التوزيع", "المصنع والتجهيز", "عام / الإدارة العامة".
  - Dynamic Secondary Selector:
    - If "المخازن" -> dynamic dropdown of `warehouses`.
    - If "سيارات التوزيع" -> dynamic dropdown of `distributors` (vans).
    - If "المصنع" -> "المصنع الرئيسي / خطوط التفكيك".
    - If "عام" -> "الإدارة العامة والمقرات".
- **Step 2: Category Hierarchy Selection**:
  - Main Category (shared across all cost centers).
  - Subcategory (dependent on Main).
  - Secondary Category (dependent on Subcategory).
- **Confirmation Breadcrumb**:
  - Displays formatted badge: `[مركز التكلفة: ثلاجة 1] ← مصاريف تشغيلية ← صيانة وثلاجات ← قطع غيار`.

#### C. `AX_CreateExpenseModal.jsx` (Creation & Payment Modal)
- **Payment Distribution Mode**:
  - Three distinct payment tabs:
    1. *سداد فوري (قناة واحدة أو متعددة)*: Immediate full payment.
    2. *مدفوع جزئي وآجل بالتقسيط*: Partial down-payment with remaining balance scheduled in installments.
    3. *آجل بالكامل (بدون سداد فوري)*: 100% deferred into scheduled installments.
- **Split Payment Channel Interface**:
  - User can add multiple payment rows:
    - `[ الخزينة / الحساب ]` `[ طريقة الدفع (نقدي / تحويل بنكي / إنستاباي) ]` `[ المبلغ ]` `[ زر حذف ]`
  - Real-time validation ensures sum of split payments matches `paidAmount`.
- **Installment Scheduler Interface**:
  - Number of installments selector (e.g. 1 to 12).
  - "توليد جدول الأقساط": Automatically divides remaining amount across due dates (monthly intervals).
  - User can manually edit due dates (via `AX_CompanyDatePicker`), amounts, and notes per installment.
  - Real-time indicator validates `Sum(installments) === remainingAmount`.

#### D. `AX_ExpenseDetailsModal.jsx` (360° Inspection & Settlement)
- Displays complete breakdown of expense, payee details, cost center allocation, and payment history.
- Lists all scheduled installments. For each pending installment, provides a "سداد القسط" button:
  - Opens a lightweight payment modal allowing user to choose the treasury, date, and payment method.
  - Automatically records the payment, updates the installment status to `'paid'`, deducts from the treasury, generates a `cashTransaction`, and updates the expense status.

#### E. Overhaul of `AX_ExpenseCategoriesModal.jsx`
- Replace crammed inline edit forms with an isolated edit dialog or clean expanded card.
- Resolve state race condition in `handleSaveAdd` so that new categories are immediately selected upon creation.
- Fix subcategory selection bug where `selectedSubId` was assigned `parentId` instead of the subcategory id.
- Add responsive view toggle on mobile: Step navigation ("الرئيسية" -> "الفرعية" -> "الثانوية") with breadcrumb back button, preventing triple vertical scrolling.
- Integrate `AX_ConfirmModal` for deletion confirmations.

---

## 4. State Management & Service Architecture

### 4.1 Store Modularization (`src/store/expenseStoreHelpers.js`)
To respect the **500-line hard limit in `useAXStore.js`**, all complex business logic is placed in `expenseStoreHelpers.js`:

```javascript
export const expenseStoreHelpers = {
  addExpense: (get, set, expense) => { ... },
  updateExpense: (get, set, id, updates) => { ... },
  deleteExpense: (get, set, id) => { ... },
  payInstallment: (get, set, expenseId, installmentId, paymentDetails) => { ... },
}
```

### 4.2 Treasury Balance & Cash Outflow Synchronization
Whenever an expense payment occurs (either upfront split payment or installment settlement):
1. **Treasury Debit**: Deducts the amount from `treasuryAccounts.find(t => t.id === payment.treasuryId).balance`.
2. **Cash Transaction Record**: Generates an `ax_cash_transactions` record:
   - `type`: `'expense'`
   - `partyType`: `'expense'`
   - `partyName`: `[${expense.costCenterName}] ${expense.expenseMainCategoryName}`
   - `amount`: `payment.amount`
   - `treasuryId`: `payment.treasuryId`
   - `notes`: `[سند مصروف ${expense.code}] ${expense.title} - سداد عبر ${payment.paymentMethod}`
   - `expenseId`: `expense.id`
3. **Database & Offline Queue**:
   - Calls `AX_OperationsService.addCashTransactionInDB` for each debit.
   - Saves expense payload to `ax_expenses` (in offlineDB and Supabase if table exists).
   - Syncs local cache (`localStorage.setItem('ax_expenses', ...)` and `updateLocalCachePayload`).

---

## 5. File Manifest & Implementation Plan

| Action | File Path | Scope & Rationale |
|---|---|---|
| **CREATE** | `src/components/expenses/AX_ExpensesManager.jsx` | Standalone Expenses page with KPI widgets, filter bar, compact desktop table, mobile Bento cards, FAB. |
| **CREATE** | `src/components/expenses/AX_CreateExpenseModal.jsx` | Expense creation modal with Cost Center hierarchy, shared category selector, split treasury payments, and installment scheduler. |
| **CREATE** | `src/components/expenses/AX_ExpenseDetailsModal.jsx` | 360° Expense inspection and installment settlement action modal. |
| **CREATE** | `src/components/expenses/AX_ExpenseCostCenterHierarchySelect.jsx` | Reusable multi-tier selector (Cost Center Entity -> 3-Tier Expense Category). |
| **CREATE** | `src/components/expenses/expenseConstants.js` | Constants for cost center types, payment statuses, and installment status badges. |
| **CREATE** | `src/store/expenseStoreHelpers.js` | Encapsulates expense store mutations, treasury debits, and installment actions (keeps `useAXStore.js` <= 500 lines). |
| **CREATE** | `src/services/AX_ExpenseOperationsService.js` | Service layer for expense DB persistence, activity logging, and offline queue. |
| **CREATE** | `tests/standalone-expenses-multitier.test.js` | Comprehensive automated test suite verifying cost center selection, split payments, deferred installments, and category modal fixes. |
| **MODIFY** | `src/components/treasury/AX_ExpenseCategoriesModal.jsx` | Fix layout clipping, race conditions in category addition, and broken subcategory ID assignment. |
| **MODIFY** | `src/components/navigation/AX_Sidebar.jsx` | Add "المصروفات" under "المالية والحسابات" with Receipt icon. |
| **MODIFY** | `src/components/navigation/AX_MobileNavbar.jsx` | Add "المصروفات" tab to mobile navigation pill. |
| **MODIFY** | `src/utils/permissionsConfig.js` | Register `expenses` module, update preset permissions, and configure access checks. |
| **MODIFY** | `src/App.jsx` | Mount `AX_ExpensesManager` when `activeTab === 'expenses'`. |
| **MODIFY** | `src/store/useAXStore.js` | Add `expenses` state and delegate actions to `expenseStoreHelpers.js` without exceeding 500 lines. |

---

## 6. Verification & Test Strategy
1. **Cost Center Dynamic Population**:
   - Verify active warehouses and vehicles are dynamically populated in the cost center selector.
   - Verify "المصنع" and "عام" properly assign cost center metadata.
2. **Split Payments Math**:
   - Verify an expense split across 2+ treasuries creates corresponding cash outflow transactions and deducts each treasury balance accurately.
3. **Deferred Expenses & Installments**:
   - Verify deferred expense with 0 paid registers 0 immediate treasury deduction and creates scheduled installments.
   - Verify settling an installment creates a cash transaction and marks the installment as paid.
4. **Expense Categories Modal**:
   - Verify adding main, sub, and secondary categories operates without state errors or broken parent assignments.
5. **Code Invariants**:
   - Verify all files remain strictly <= 500 lines.
   - Verify all existing 1,000 unit tests continue to pass with 0 failures.
