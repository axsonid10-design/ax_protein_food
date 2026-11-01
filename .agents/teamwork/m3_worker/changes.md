# Milestone 3 Changes: Suppliers Management Module (Requirement R2)

## Summary of Changes
Implemented the complete, production-ready Suppliers Management Module for AX_PROTEIN_FOOD adhering to AXONID Constitution V6.0 (zero code comments, strictly <= 500 lines per file, full canvas layout, 1:1 skeleton loader, zero window.confirm, modern pill buttons, meat red brand palette).

## Files Created & Updated

1. `src/components/suppliers/supplierConstants.js` (NEW, 65 lines)
   - Defines `SUPPLY_TYPES` array covering all domain classifications (frozen_meat, poultry, fish, slaughterhouse, packaging, spices_seasoning, direct_importer, local_farms, factory, wholesaler, general).
   - Defines `SUPPLY_TYPE_LABELS` lookup map for concise Arabic labels.
   - Defines `SUPPLIER_CATEGORIES` list for departmental classification (لحوم حمراء ومصنعات, دواجن ومجمدات بيضاء, أسماك ومأكولات بحرية, خامات وتعبئة وتغليف, etc.).
   - Normalization helpers: `normalizeSupplyType` and `calculateSupplierBalance` with `-0` vs `0` zero normalization.

2. `src/services/AX_SupplierOperationsService.js` (NEW, 91 lines)
   - Supabase CRUD client for `ax_suppliers` table (`addSupplierInDB`, `updateSupplierInDB`, `deleteSupplierInDB`).
   - Atomic audit logging into `ax_activity_logs` for all operations.
   - Robust offline and unconfigured Supabase resilience.

3. `src/components/suppliers/AX_SupplierModal.jsx` (NEW, 413 lines)
   - Unified modal for creating and updating suppliers.
   - Full profile capture: company name, commercial name, contact person, primary phone, secondary phone, address, tax registration number, commercial registry.
   - Supply type selector from `SUPPLY_TYPES` and category selector from `SUPPLIER_CATEGORIES`.
   - Opening balance tracking with explicit type selection (`payable` / دائن vs `receivable` / مدين) and `-0` normalization.
   - Integrates `useBodyScrollLock` and stores changes into `useAXStore` and `AX_SupplierOperationsService`.

4. `src/components/suppliers/AX_SupplierDetailsModal.jsx` (NEW, 459 lines)
   - 360° supplier profile and running balance statement.
   - 4 summary metrics: opening balance, total purchases, total paid, and net running balance.
   - Chronological running balance ledger table with running balance calculations.
   - Tabular history of purchase invoices (`invoices` with `type === 'purchase'`).
   - History of cash payouts and disbursements (`cashTransactions`).
   - Corporate profile review tab.
   - Responsive print styling for A4 export.

5. `src/components/suppliers/AX_SupplierBentoCard.jsx` (NEW, 121 lines)
   - Dedicated mobile Bento card (`lg:hidden`).
   - High-density aesthetic presentation with supply type badge, phone dial link, department badge, and colored liability indicators.
   - Quick action pill buttons for 360° details, edit modal, and delete modal.

6. `src/components/suppliers/AX_SuppliersBentoCards.jsx` (UPDATED, 29 lines)
   - Responsive grid container rendering `AX_SupplierBentoCard` elements.

7. `src/components/suppliers/AX_SuppliersTable.jsx` (UPDATED, 148 lines)
   - Single-line desktop rows table (`hidden lg:block`, row height `h-12`).
   - Columns: Company/Supplier, Contact Person, Phone, Supply Type, Department, Net Balance, Action buttons.

8. `src/components/suppliers/AX_SuppliersManager.jsx` (UPDATED, 391 lines)
   - Master module view with full canvas layout.
   - Header with operational statistics and Add Supplier action.
   - 4 summary metric widgets: total suppliers, payables liabilities (لهم), advance receivables (عليهم), and zero settled accounts.
   - Search bar across company, contact, phone, address, tax, and commercial registration numbers.
   - Balance filter pills: All, Payable, Receivable, Zero.
   - Supply type filter pills and department filter pills.
   - Desktop single-line table and mobile Bento cards with pagination (15 items per page).
   - Fixed Floating Action Button (FAB) for rapid supplier entry.
   - Integrated modals: `AX_SupplierModal`, `AX_SupplierDetailsModal`, and `AX_ConfirmModal`.

9. Compatibility Wrappers:
   - `src/components/suppliers/AX_AddSupplierModal.jsx` (UPDATED, 9 lines): Clean wrapper to `AX_SupplierModal`.
   - `src/components/suppliers/AX_EditSupplierModal.jsx` (UPDATED, 9 lines): Clean wrapper to `AX_SupplierModal`.
   - `src/components/suppliers/AX_SupplierLedgerModal.jsx` (UPDATED, 9 lines): Clean wrapper to `AX_SupplierDetailsModal`.

10. Navigation & Router Integration:
    - `src/components/navigation/AX_Sidebar.jsx`: Integrated `suppliers` tab under section 'العملاء والموردين والمناديب'.
    - `src/components/navigation/AX_MobileNavbar.jsx`: Integrated `suppliers` tab in mobile floating pill.
    - `src/App.jsx`: Mounted `<AX_SuppliersManager />` with `hasModuleAccess` permission guard.

11. `tests/m3-suppliers-integration.test.js` (NEW, 137 lines)
    - Comprehensive dual-runner automated test suite covering supplier creation, profile completeness, payable/receivable balance distinctions, zero balance normalization, supply type normalization fallback, multi-step transaction running balance calculations, and `AX_SupplierOperationsService` resilience.
