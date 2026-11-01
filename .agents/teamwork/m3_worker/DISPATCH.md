## 2026-11-01T09:46:24Z
You are Worker (Milestone 3: Suppliers Management Module Worker).
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m3_worker\

MANDATORY FIRST STEP:
Read the verbatim user request at:
d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- Master blueprint: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md
- Domain logic analysis: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_2\analysis.md
- Test readiness: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\TEST_READY.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Assigned Deliverables for Milestone 3 (Requirement R2):
1. Build `src/components/suppliers/` module (modular architecture, every file strictly <= 500 lines, zero code comments):
   - `AX_SuppliersManager.jsx`: Main view with header, search, supply type filter pills, summary metrics cards (total payables, receivables, supplier counts), FAB/add button, single-line desktop table, mobile Bento cards, and pagination.
   - `AX_SupplierModal.jsx`: Modal for adding/editing suppliers, supporting:
     * Full company profile: company name (اسم الشركة/المنشأة), contact person (المسؤول), phone, secondary phone, address, tax registration number, commercial registry.
     * Supply type (نوع التوريد: e.g. مستورد مباشر / مزارع محلية / مجازر آلية / موزع معتمد / مصنع تجهيز / تاجر جملة).
     * Departmental / category classification (لحوم حمراء ومصنعات / دواجن ومجمدات بيضاء / أسماك ومأكولات بحرية / خامات وتعبئة وتغليف).
     * Opening balance with explicit type: payable (دائن - له مستحقات/له رصيد) vs receivable (مدين - عليه دفعات مقدمة/عليه رصيد), and positive/negative zero normalization.
   - `AX_SupplierDetailsModal.jsx`: 360° supplier profile modal with financial metrics cards, purchase history, payment history, and running balance ledger.
   - `AX_SuppliersTable.jsx`: Desktop single-line rows table (`hidden lg:block`, `h-12`).
   - `AX_SupplierBentoCard.jsx`: High-aesthetic mobile Bento card (`lg:hidden`).
   - `AX_SuppliersBentoCards.jsx`: Grid container for mobile Bento cards.
   - `supplierConstants.js`: Constants for supply types and categories.
2. Build `src/services/AX_SupplierOperationsService.js`:
   - Supabase operations for `ax_suppliers` with `ax_activity_logs` logging.
3. Integrate Navigation & Route:
   - Add 'suppliers' tab item in `src/components/navigation/AX_Sidebar.jsx` (Truck or Building2 icon).
   - Add 'suppliers' in `src/components/navigation/AX_MobileNavbar.jsx`.
   - Mount `<AX_SuppliersManager />` under `activeTab === 'suppliers'` in `src/App.jsx`.
4. Adhere strictly to AXONID standards:
   - Modern pill buttons (`rounded-full`, `font-bold`), meat red brand theme (`#991b1b` / `#450a0a` / `#b91c1c`).
   - 1:1 pulsing skeleton loader on data loading (zero spinners).
   - Zero `window.confirm` (`AX_ConfirmModal` only).
   - Full canvas layout (`w-full`, no max-w-7xl centered gutters).
   - Dry technical Arabic (no marketing jargon).
5. Verification:
   - Run `npm test` and `npm run test:vitest`.
   - Run `npm run build`.
   - Verify all source files remain <= 500 lines.
