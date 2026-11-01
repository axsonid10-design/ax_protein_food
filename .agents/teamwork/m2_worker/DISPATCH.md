## 2026-10-31T22:28:12Z
You are Worker 3 (Milestone 2: Customers Management Module Worker).
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m2_worker\

MANDATORY FIRST STEP:
Read the verbatim user request at:
d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- Master blueprint: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\PROJECT.md
- Domain logic analysis: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_2\analysis.md
- Test inventory & requirements: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\TEST_READY.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Assigned Deliverables for Milestone 2 (Requirement R1):
1. Build `src/components/customers/` module (modular architecture, every file strictly <= 500 lines):
   - `AX_CustomersManager.jsx`: Main view with header, search, filter pills, stats bar, FAB/add button, single-line desktop table, mobile Bento cards, pagination.
   - `AX_CustomerModal.jsx`: Modal for adding/editing customers, supporting:
     * Full profile: name, phone, secondary phone, commercial register / tax card.
     * Opening balance with type: debit (مدين - عليه مديونية/receivable) vs credit (دائن - له رصيد مسبق/payable).
     * Hierarchical categorization: 2-level dynamic categories (primary category and sub-category).
     * Geographic classification: independent 3-tier geography (governorate, city/center, district, detailed address).
     * Document & photo attachments upload via ImageKit (`imageKitService.js`) with preview, remove, and thumbnail display.
   - `AX_CustomerDetailsModal.jsx`: 360° customer profile modal displaying full customer info, debt/credit status, transaction history, and document gallery.
   - `AX_CustomerBentoCard.jsx`: High-aesthetic mobile Bento card (`lg:hidden`).
2. Integrate Navigation & Route:
   - Add 'customers' tab item in `src/components/navigation/AX_Sidebar.jsx` (Users/UserCheck icon).
   - Add 'customers' in `src/components/navigation/AX_MobileNavbar.jsx`.
   - Mount `<AX_CustomersManager />` under `activeTab === 'customers'` in `src/App.jsx`.
3. Adhere strictly to AXONID standards:
   - Modern pill buttons (`rounded-full`, `font-bold`), meat red brand theme (`#991b1b` / `#450a0a` / `#b91c1c`).
   - 1:1 pulsing skeleton loader on data loading (zero spinners).
   - Zero `window.confirm` (`AX_ConfirmModal` only).
   - Full canvas layout (w-full, no max-w-7xl centered gutters).
   - Dry technical Arabic (no marketing jargon).
4. Verification:
   - Run `npm test` and `npm run test:vitest`.
   - Run `npm run build`.
   - Verify all source files remain <= 500 lines.

Outputs:
1. Write changes to: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m2_worker\changes.md
2. Write handoff to: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m2_worker\handoff.md
3. Send message to parent via send_message when complete.
