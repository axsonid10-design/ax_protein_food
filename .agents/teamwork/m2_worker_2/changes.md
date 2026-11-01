# Changes Summary — Milestone 2: Customers Management Module (R1)

## Overview
Implemented complete Customers Management Module (Requirement R1) for `AX_PROTEIN_FOOD` (بروتين فود - لتجهيز وحفظ اللحوم المجمدة) adhering strictly to AXONID V6.0 Rules 2610, the Master Design Anti-Patterns, and Meat Red brand identity (`#991b1b` / `#450a0a` / `#b91c1c`).

## Modified & Created Files

### 1. Customers Module (`src/components/customers/`)
- **`customerConstants.js`** (38 lines):
  - Defined Egyptian governorates and 2-level primary / subcategory definitions (مجازر وتوريدات، مطاعم وفنادق، محلات جزارة وماركت، تجار جملة وتجزئة).
- **`AX_CustomerAttachments.jsx`** (82 lines):
  - File upload, preview, and deletion via ImageKit (`uploadImage`, `getTransformedUrl`).
- **`AX_CustomerBentoCard.jsx`** (159 lines):
  - High-aesthetic mobile Bento card (`lg:hidden`) displaying debt/credit tags, phone calling links, location badges, and action buttons.
- **`AX_CustomersBentoCards.jsx`** (28 lines):
  - Responsive Bento card grid container mapping customers.
- **`AX_CustomersTable.jsx`** (145 lines):
  - Single-line desktop rows table (`hidden lg:block`, `h-12`) with compact columns, debit/credit badges, quick contact triggers, and 360° modal launcher.
- **`AX_CustomerFormFields.jsx`** (335 lines):
  - Modular form field segments for basic profile, commercial registration, tax number, 2-tier categories, 3-tier geography, and debit/credit opening balances.
- **`AX_CustomerModal.jsx`** (279 lines):
  - Unified modal for adding and editing customers. Handles quick-add mode (`isIncomplete` badge), ImageKit attachments, and database synchronization.
- **`AX_CustomerDetailsModal.jsx`** (385 lines):
  - 360° customer profile modal featuring financial metrics (receivables/credit, sales volume, invoices, settlements), ledger transaction history, document gallery with zoom, and print ledger capability.
- **`AX_CustomersManager.jsx`** (352 lines):
  - Main view orchestrating header, summary stats bar, search and category filter pills, FAB button, desktop table, mobile Bento cards, and pagination.
- **`AX_AddCustomerModal.jsx`**, **`AX_EditCustomerModal.jsx`**, **`AX_CustomerLedgerModal.jsx`** (9 lines each):
  - Backward-compatible wrappers pointing to unified modal architecture.

### 2. Services & Common Components
- **`src/services/AX_CustomerOperationsService.js`** (89 lines):
  - Dedicated Supabase service executing atomic DB operations (`addCustomerInDB`, `updateCustomerInDB`, `deleteCustomerInDB`) and logging to `ax_activity_logs`.
- **`src/components/common/AX_Toast.jsx`**:
  - Exported `showToast` helper to ensure compatibility across modules and tests.

### 3. Navigation & App Integration
- **`src/components/navigation/AX_Sidebar.jsx`**:
  - Registered `customers` item with `UserCheck` icon under `العملاء والتوزيع` navigation group.
- **`src/components/navigation/AX_MobileNavbar.jsx`**:
  - Registered `customers` item with `UserCheck` icon in mobile bottom pill navbar.
- **`src/App.jsx`**:
  - Imported `AX_CustomersManager` and mounted under `activeTab === 'customers'`. Preserved `v1.5.9` version tag.

### 4. Tests
- **`tests/m2-customers-integration.test.js`**:
  - Integration suite verifying customer creation, debit/credit balance separation, quick-add incomplete badge, and ImageKit attachment URL transformation.

## Verification Summary
- **Lines of code per file**: All 12 customer files strictly <= 500 lines (verified by `tests/file-invariants.test.js`).
- **Code comments**: 0 comments in production code.
- **Tests**: 335 tests passed across 27 suites (`npm test`); 332 tests passed across 20 suites (`npm run test:vitest`).
- **Build**: Vite production build succeeded cleanly with Service Worker generation.
