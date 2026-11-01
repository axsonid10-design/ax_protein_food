# Project: AX_PROTEIN_FOOD (Meat Red Alignment, Customers, Suppliers, Sales Reps, & Dashboard Drilldown)

## Architecture
- **Framework & Build:** React 18.3.1 + Vite 6.0.11 + Tailwind CSS 3.4.17 + PWA (Strict port 8182)
- **Primary Brand Colors:** Meat Red (`#991b1b`), Dark Burgundy (`#450a0a`), Secondary Accent Crimson (`#b91c1c`), Light Tint (`#fee2e2`), Surface Neutral (`#f8fafc`).
- **Typography:** Cairo & Tajawal, JetBrains Mono. RTL direction.
- **State & Storage:** Dual persistence: Zustand in-memory store (`useAXStore.js`) + IndexedDB (`ax_frozen_foods_db` via `offlineDB.js` with `offline_queue` and `cache_store`) + Supabase Realtime/REST sync.
- **Media Storage:** ImageKit integration (`https://ik.imagekit.io/c8zctprqq`) via `imageKitService.js` with offline base64 fallback.
- **Navigation:** Docked `AX_Sidebar` (desktop) + `AX_MobileNavbar` (mobile floating pill) + `App.jsx` tab router.
- **Testing Engine:** Vitest + Node native test runner (zero regressions on existing 198 tests).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Brand Theme Alignment | Align primary/secondary palette to meat red/burgundy (`#991b1b`, `#450a0a`, `#b91c1c`, `#fee2e2`) across Tailwind, HTML meta, manifest, CSS, charts, overlays, and components | M1 | ORIGINAL_REQUEST §R5 |
| F2 | Core Store & Permissions Extensions | Extend store and permissionsConfig to register clients, suppliers, and sales_reps with full state and actions | M1 | Survey deduplication |
| F3 | ImageKit Service Integration | Build `imageKitService.js` supporting direct uploads, transformations (`/tr:w-...,h-.../`), and offline preview fallback | M1 | ORIGINAL_REQUEST §R1 |
| F4 | Customer Hierarchical Categorization | Dynamic multi-level categories (primary category and sub-category) with dynamic management | M2 | ORIGINAL_REQUEST §R1 |
| F5 | Customer Geographic Classification | Independent 3-tier geographic fields (governorate, city/center, district, detailed address) | M2 | ORIGINAL_REQUEST §R1 |
| F6 | Customer Opening Balance Tracking | Explicit opening balance tracking (`openingBalance`, `openingBalanceType: 'debit' \| 'credit'`) registering in signed balance summaries | M2 | ORIGINAL_REQUEST §R1 |
| F7 | Customer Attachments & Gallery | Uploading and displaying customer photo attachments and document proofs integrated with ImageKit | M2 | ORIGINAL_REQUEST §R1 |
| F8 | Customer Management UI | Full CRUD operations, search, filters, desktop single-line table, mobile Bento cards, and navigation links | M2 | ORIGINAL_REQUEST §R1 |
| F9 | Supplier Profile & Attributes | Company name, contact person, phone, address, tax/commercial registration numbers | M3 | ORIGINAL_REQUEST §R2 |
| F10 | Supplier Supply Type & Category | Supply type (نوع التوريد: importer, farm, slaughterhouse, etc.) and departmental category | M3 | ORIGINAL_REQUEST §R2 |
| F11 | Supplier Opening Balance Tracking | Explicit opening balance tracking (`openingBalance`, `openingBalanceType: 'payable' \| 'receivable'`) | M3 | ORIGINAL_REQUEST §R2 |
| F12 | Supplier Management UI | Full CRUD operations, search, filters, desktop single-line table, mobile Bento cards, and navigation links | M3 | ORIGINAL_REQUEST §R2 |
| F13 | Sales Representative Profiles | Rep contact details, assigned sales territory, opening balance, and monthly sales targets | M4 | ORIGINAL_REQUEST §R3 |
| F14 | Multi-Model Commission Engine | Flexible calculation engine supporting: volume-based rates, category/item percentage, target tier attainment slabs, and hybrid models | M4 | ORIGINAL_REQUEST §R3 |
| F15 | Representative Statement of Account (Ledger) | Dedicated ledger modal tracking accrued commissions, disbursed payments, running net balance, with export/print | M4 | ORIGINAL_REQUEST §R3 |
| F16 | Sales Reps Management UI | Full CRUD operations, commission configuration modal, desktop single-line table, mobile Bento cards, navigation links | M4 | ORIGINAL_REQUEST §R3 |
| F17 | Configurable Pinned Inventory Widget | Dashboard widget allowing users to pin specific items to monitor, persisted in localStorage with smart fallbacks | M5 | ORIGINAL_REQUEST §R4 |
| F18 | Branch & Warehouse Stock Drilldown | Interactive modal displaying granular available stock quantities per branch and warehouse for any selected item | M5 | ORIGINAL_REQUEST §R4 |
| F19 | Real-Time Financial Summary Metrics | Dashboard metrics computing customer debts (receivables), supplier debts (payables), sales rep balances, and sales target progress | M5 | ORIGINAL_REQUEST §R4 |
| F20 | Vitest Infrastructure Setup | Configure Vitest in `vite.config.js` while maintaining seamless compatibility with existing 198 tests | E2E Track | ORIGINAL_REQUEST §R6 |
| F21 | Automated Test Suite (Tiers 1-4) | Comprehensive test suite covering customer/supplier CRUD, commission models, ledger balances, and dashboard inventory/financial aggregations | E2E Track | ORIGINAL_REQUEST §R6 |
| F22 | Final Verification & Adversarial Hardening | Phase 1: 100% E2E test pass; Phase 2: Tier 5 adversarial test cases and white-box gap closure | M6 | ORIGINAL_REQUEST §R6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Brand Theme Alignment & Core Infrastructure | F1, F2, F3 | none | DONE |
| M2 | Customers Management Module | F4, F5, F6, F7, F8 | M1 | DONE |
| M3 | Suppliers Management Module | F9, F10, F11, F12 | M1 | PLANNED |
| M4 | Sales Representatives & Commission Engine | F13, F14, F15, F16 | M1 | PLANNED |
| M5 | Dashboard Stock Drilldown & Financial Metrics | F17, F18, F19 | M2, M3, M4 | PLANNED |
| M6 | Final Milestone: 100% E2E Pass & Hardening | F22 (Pass all E2E tests, adversarial coverage) | M5, TEST_READY.md | PLANNED |

## Parallel Track: E2E Testing Track
| Track | Scope | Deliverable | Status |
|---|---|---|---|
| E2E Testing Track | F20, F21 (Tiers 1-4 test suite across all features) | `TEST_INFRA.md`, Vitest test suite, `TEST_READY.md` | PLANNED |

## Code Layout
- `tailwind.config.js` — Meat red/burgundy color palette tokens
- `index.html`, `public/manifest.json`, `vite.config.js` — Theme color meta & PWA headers
- `src/index.css` — Global scrollbar & theme utilities
- `src/services/imageKitService.js` — ImageKit upload & URL transformations
- `src/utils/permissionsConfig.js` — Module permissions for customers, suppliers, sales_reps
- `src/store/useAXStore.js` — Unified Zustand store for clients, suppliers, salesReps, and ledger transactions
- `src/store/initialData.js` — Initial rich mock datasets for clients, suppliers, reps, and commission rules
- `src/components/customers/` — Customers manager, table, cards, modals, category selector, attachment uploader (all <500 lines)
- `src/components/suppliers/` — Suppliers manager, table, cards, modals, supply type selector (all <500 lines)
- `src/components/sales_reps/` — Sales reps manager, commission config modal, ledger modal, cards (all <500 lines)
- `src/components/sales_reps/AX_CommissionEngine.js` — Mathematical engine for commission calculation
- `src/components/dashboard/AX_PinnedStockWidget.jsx` — Pinned stock widget
- `src/components/dashboard/AX_StockDrilldownModal.jsx` — Warehouse/branch stock breakdown modal
- `src/components/dashboard/AX_DashboardMetricsCards.jsx` — Enhanced financial liability & target metrics
- `src/components/navigation/AX_Sidebar.jsx` & `AX_MobileNavbar.jsx` — Navigation items
- `src/App.jsx` — Route mounting
- `tests/` — Automated test files audited for file invariants & hook rules

## Interface Contracts
### ImageKit Service (`src/services/imageKitService.js`)
- `uploadImage(file: File, folder?: string): Promise<{ url: string, fileId: string, name: string }>`
- `getTransformedUrl(url: string, { width, height, quality }): string`

### Commission Engine (`src/components/sales_reps/AX_CommissionEngine.js`)
- `calculateCommission(rep: SalesRep, sales: SaleTransaction[], periodTarget?: number): { totalCommission: number, breakdown: CommissionItem[] }`
- Commission Models supported:
  1. `volume_rate`: `Math.floor(salesVolume / stepAmount) * stepRate` or proportional `(salesVolume / stepAmount) * stepRate`.
  2. `category_percentage`: `sum(itemAmount * rate)`.
  3. `target_tier`: Attainment percentage mapped to tiered rates + lump sum bonus.
  4. `hybrid`: Base category % + tier attainment bonus.

### Sales Rep Ledger Transaction
- `{ id: string, repId: string, date: string, type: 'commission' | 'payment' | 'opening_balance', amount: number, notes: string, invoiceId?: string }`
- Running balance: `openingSigned + sum(commission) - sum(payment)`

### Pinned Stock Widget
- Storage key: `'ax_dashboard_pinned_items'` (array of item IDs).
- Drilldown payload: `{ item: Item, totalQuantity: number, byWarehouse: Array<{ warehouseId, warehouseName, warehouseType, quantity, unit }> }`
