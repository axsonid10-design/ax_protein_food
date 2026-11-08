# Handoff Report — Requirement R3: Standalone Expenses & Multi-Tier Cost Centers

## 1. Observation
1. **Expenses Navigation & Routing**:
   - `src/App.jsx` (lines 279–294): Only 16 tabs are mounted (`dashboard`, `items`, `warehouses`, `manufacturing`, `distribution`, `treasury`, `sales`, `purchases`, `invoices`, `customers`, `suppliers`, `sales_reps`, `reports`, `employees`, `staff`, `recycle_bin`). There is no tab or view for `'expenses'`.
   - `src/components/navigation/AX_Sidebar.jsx` (lines 76–81): Under "المالية والحسابات", only `treasury` and `reports` are configured.
   - `src/components/navigation/AX_MobileNavbar.jsx` (lines 30–46): Only 15 tabs are declared in `allTabs`; `'expenses'` is absent.
   - `src/utils/permissionsConfig.js` (lines 19–165): `MODULE_PERMISSIONS_CONFIG` lists 12 modules; `expenses` is not registered.
2. **Current Treasury & Expenses Architecture**:
   - `src/components/treasury/AX_TreasuryTransactionModal.jsx` (lines 96–114, 123–140): Expenses are captured as single-treasury cash disbursements (`type: 'expense'`) with category hierarchy snapshot strings in `partyName` (e.g. `[مصاريف تشغيلية ولوجستية / مصاريف شحن ونقل / وقود وسولار سيارات التوزيع]`).
   - `src/services/AX_OperationsService.js` (lines 21–68, `addCashTransactionInDB`): Expenses insert a row into `ax_cash_transactions` (`type = 'expense'`) and deduct directly from a single `treasury_id`.
   - Neither multi-treasury payment splitting nor deferred expenses with installment scheduling are supported in the current data pipeline.
3. **Expense Categories Modal & Defects**:
   - `src/components/treasury/AX_ExpenseCategoriesModal.jsx`:
     - Line 60–65: `if (addLevel === 'main') { const allMains = expenseCategoryHelpers.getMainCategories(expenseCategories); setSelectedMainId(allMains[allMains.length - 1]?.id || '') } else if (addLevel === 'sub') { setSelectedSubId(parentId) }`. The store update is asynchronous, causing the selection of a stale main category. Furthermore, setting `selectedSubId(parentId)` assigns the *Main* category ID to `selectedSubId`, breaking the secondary categories query (`getSecondaryCategories(categories, selectedSubId)` expects a subcategory ID).
     - Lines 213–225, 323–335, 429–441: Inline `<form>` replaces the item row inside ~240px wide columns. Check/X buttons clip and text wraps awkwardly.
     - Line 102: Modal container has `max-h-[92vh] overflow-y-auto` while each internal column has `overflow-y-auto max-h-[320px]`, producing nested scrollbars and severe mobile usability degradation when columns stack vertically.
4. **File Constraints & Project Invariants**:
   - `src/store/useAXStore.js` is currently **498 lines** long. The project has a hard ceiling of 500 lines per file. Adding code directly to `useAXStore.js` without modular helper isolation will cause immediate violation.
   - Project unit test suite runs via `node --test tests/*.test.js` (`npm test`) and currently passes **1,000 / 1,000 tests** in 4.5s.
   - Production build runs via `vite build` (`npm run build`) and succeeds cleanly in 5.46s with zero errors.

---

## 2. Logic Chain
1. **From Observation 1**: Because `'expenses'` is missing from `App.jsx`, `AX_Sidebar.jsx`, `AX_MobileNavbar.jsx`, and `permissionsConfig.js`, users cannot access a dedicated standalone Expenses view. Therefore, creating `src/components/expenses/AX_ExpensesManager.jsx` and registering `'expenses'` across navigation and permissions files is necessary and safe.
2. **From Observation 2**: Because `ax_cash_transactions` models only single immediate debits against one treasury, multi-treasury split payments and deferred installment scheduling require a unified expense entity (`AX_Expense`). When split payments or installments are settled, multiple `ax_cash_transactions` rows are generated (one per debited treasury), maintaining exact liquidity balances across all `treasuryAccounts` while preserving full accounting traceability.
3. **From Observation 3**: The bug where `selectedSubId` is set to `parentId` (a main category ID) causes secondary categories to disappear or fail to load for newly created subcategories. Fixing `AX_ExpenseCategoriesModal.jsx` to correctly resolve the newly added category and decoupling the inline edit forms into cleanly spaced UI components will eliminate layout overlapping and resolve the bug completely.
4. **From Observation 4**: Because `useAXStore.js` is at 498 lines, placing expense store logic directly in `useAXStore.js` will breach the strict 500-line invariant. Delegating all expense actions to `src/store/expenseStoreHelpers.js` (mirroring the established pattern of `recycleBinHelpers.js` and `transferHelpers.js`) allows full feature support while keeping `useAXStore.js` strictly under 500 lines.

---

## 3. Caveats
1. **Van Vehicle Data Source**: In the current codebase, vehicles are represented through `distributors` (with `vanNumber`) or `warehouses` with `type === 'van'`. As explorer_survey_1 is investigating Requirement R1 (adding distribution vans), the Cost Center selector should dynamically read from `warehouses` (filtered for warehouses vs vans) or `distributors` to ensure seamless interoperability.
2. **Employee Advances (R6 Interoperability)**: Requirement R6 introduces employee advances ("سلف"). The category hierarchy in `expenseCategoryHelpers.js` is shared across entities; if R6 introduces an advance category, R3's standalone Expenses page will automatically support tracking and filtering it without friction.

---

## 4. Conclusion
Requirement R3 is fully architected and ready for implementation. The solution consists of:
1. **Standalone Expenses Module**: `src/components/expenses/AX_ExpensesManager.jsx` with KPI cards, multi-tier filters, single-line desktop table, mobile Bento cards, and FAB.
2. **Multi-Tier Cost Center Hierarchy**: `src/components/expenses/AX_ExpenseCostCenterHierarchySelect.jsx` enforcing Cost Center entity selection (Warehouses, Vehicles, Factory, General) before choosing the shared 3-tier expense category.
3. **Split Payments & Installment Scheduler**: `src/components/expenses/AX_CreateExpenseModal.jsx` and `AX_ExpenseDetailsModal.jsx` supporting split payments across multiple treasuries and deferred expense installment scheduling with individual installment settlement.
4. **Modal Overhaul**: Fixing layout overlaps, state race conditions, and parent ID binding in `src/components/treasury/AX_ExpenseCategoriesModal.jsx`.
5. **Architectural Safety**: Isolating store logic in `src/store/expenseStoreHelpers.js` and `AX_ExpenseOperationsService.js` to strictly preserve the <= 500 lines hard limit across all files.

---

## 5. Verification Method
1. **Unit Test Execution**:
   - Run `npm test` (`node --test tests/*.test.js`).
   - Run vitest if applicable: `npx vitest run`.
   - Verify that all 1,000 existing tests pass, plus new tests in `tests/standalone-expenses-multitier.test.js`.
2. **Build Integrity**:
   - Run `npm run build` (`vite build`) to verify zero bundling or syntax errors.
3. **Code Compliance Checks**:
   - Run line-count checks across all created and modified files (`Get-Content <file> | Measure-Object -Line`) to ensure each file is strictly <= 500 lines.
   - Verify zero comments in production code, pill buttons (`rounded-full`), and full-canvas layouts (`w-full px-3 sm:px-6 lg:px-8`).
4. **Invalidation Conditions**:
   - Any failure in existing treasury, invoices, or category tests.
   - Any file exceeding 500 lines.
   - Any inability to select dynamic warehouses or distribution vehicles in the cost center selector.
