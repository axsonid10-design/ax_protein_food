# Handoff Report — Explorer Survey 1

**Agent:** Explorer 1 (Codebase & Architecture Explorer)  
**Task:** Project Survey & Architectural Mapping  
**Working Directory:** `d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_1\`  
**Target Recipient:** Orchestrator / Parent Agent (`dc5da5ed-817b-4784-a7e6-1365172c95ec`)  
**Date:** 2026-10-31  

---

## 1. Observation

1. **Build & Development Tooling (`package.json`, lines 1-32):**
   - React 18.3.1, Vite 6.0.11, vite-plugin-pwa 1.3.0, Tailwind CSS 3.4.17, Zustand 5.0.3, @supabase/supabase-js 2.117.2, Lucide React 1.16.0.
   - Script `"test": "node --test tests/*.test.js"`.
2. **Local Port & Server Configuration (`vite.config.js`, lines 84-88):**
   - Configured port is `8182` with `strictPort: true` and `host: true`.
   - Manifest theme color is `'#0284c7'`.
3. **Existing Test Suite Output (`npm test`):**
   - Ran command `npm test`.
   - Result: 9 test suites, **198 passing tests**, 0 failures, execution duration 259ms.
   - Audited invariants in `tests/file-invariants.test.js`: every `.js`/`.jsx` file in `src/` must NOT exceed 500 lines.
   - Audited invariants in `tests/hooks-integrity.test.js`: no component may execute early return before declaring React hooks.
4. **Routing & Navigation Architecture (`src/App.jsx`, lines 34, 230-249):**
   - Client-side tab state in Zustand: `activeTab`, persisted in URL `?tab=` and `localStorage`.
   - Access controlled by `hasModuleAccess(profile, activeTab)`.
   - Desktop sidebar (`AX_Sidebar.jsx`) and mobile navbar (`AX_MobileNavbar.jsx`).
   - Modules currently present: `dashboard`, `items`, `warehouses`, `manufacturing`, `distribution`, `treasury`, `invoices`, `reports`, `staff`.
   - Modules missing per user request: `customers`, `suppliers`, `sales_reps`.
5. **State Management & Persistence (`src/store/useAXStore.js`, `src/services/`):**
   - Dual persistence: `localStorage` + IndexedDB (`ax_frozen_foods_db` via `offlineDB.js` with `offline_queue` and `cache_store`).
   - Supabase client in `supabaseClient.js` connected to `https://gwxumpjezcwxhpuicwfi.supabase.co`.
   - `AX_DatabaseSync.js` performs startup hydration via `Promise.all` across 17 tables and subscribes to Postgres realtime replication.
   - `clients` and `suppliers` exist in Zustand state (`initialClients`, `initialSuppliers`), but have no dedicated management screens or full CRUD handlers.
   - `sales_reps` and commission calculation structures are completely absent.
6. **ImageKit Configuration (`.env`, lines 5-6):**
   - `VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/c8zctprqq`
   - `VITE_IMAGEKIT_PUBLIC_KEY=public_xKb4EU48gwQEN3k+IkcmynMLljE=`
   - No components currently import or call ImageKit. Avatar upload in `AX_UserProfileModal.jsx` reads local base64 via `FileReader`.
7. **Color Theme Tokens (`tailwind.config.js`, lines 15-26):**
   - `primary.DEFAULT: '#0284c7'`, `primary.container: '#0c4a6e'`, `secondary.DEFAULT: '#0891b2'`.
   - Hardcoded references to `#0284c7` exist in `index.html`, `vite.config.js`, `public/manifest.json`, `index.css`, `AppUpdateNotifier.jsx`, `AX_InstallPwaBanner.jsx`, `AX_SalesFlowChart.jsx`, and `AX_StockDistributionChart.jsx`.

---

## 2. Logic Chain

1. **Routing Expansion:**
   - From Observation 4, `App.jsx` checks `hasModuleAccess(profile, activeTab)` and renders components based on `activeTab`.
   - Therefore, introducing `customers`, `suppliers`, and `sales_reps` requires:
     a) Registering permissions in `src/utils/permissionsConfig.js`.
     b) Adding tab navigation items to `AX_Sidebar.jsx` and `AX_MobileNavbar.jsx`.
     c) Mounting `<AX_CustomersManager />`, `<AX_SuppliersManager />`, and `<AX_SalesRepsManager />` conditionally in `App.jsx`.
2. **Data Model Extensions:**
   - From Observation 5, `ax_clients` and `ax_suppliers` only hold minimal fields (`id, name, phone, address, balance`).
   - Requirement R1 demands opening balance (debit/credit), hierarchical categories (primary and sub-category), geographic fields (governorate, city, district), and ImageKit attachments.
   - Requirement R2 demands supplier company name, supply type, category, and opening balance (payables/receivables).
   - Requirement R3 requires an entirely new entity structure for sales representatives, commission formulas, and rep transaction ledgers.
   - Therefore, the store, initial data, and Supabase sync logic must be updated to support these properties without breaking existing invoice and treasury balance calculations.
3. **ImageKit Client Architecture:**
   - From Observation 6, ImageKit credentials exist in `.env`, but no client integration exists.
   - Therefore, creating `src/services/imageKitService.js` to handle direct client uploads (with base64 fallback) and URL transformations (`/tr:w-...,h-.../`) is required to support customer image and document attachments.
4. **Dashboard Pinned Inventory & Financial Metrics:**
   - From Observation 5, `inventoryStock` contains `{ warehouseId, itemId, quantity, unit }` and `warehouses` contains all storage locations.
   - Therefore, a pinned inventory widget can be created by storing selected item IDs in `localStorage`, calculating aggregate stock, and providing a drilldown modal showing quantities in each warehouse individually.
   - Aggregate financial metrics for customer receivables, supplier payables, rep balances, and sales targets can be computed directly from `clients`, `suppliers`, `reps`, and `invoices` within `AX_DashboardMetricsCards.jsx`.
5. **Brand Theme Migration:**
   - From Observation 7, theme colors are configured in `tailwind.config.js` with semantic classes (`bg-primary`, `text-primary`, `bg-secondary`, `bg-primary/10`).
   - Updating `primary` to `#991b1b` / `#7f1d1d` and `secondary` to `#b91c1c` / `#fef2f2`, along with updating `index.html`, `vite.config.js`, `manifest.json`, `AppUpdateNotifier.jsx`, `AX_InstallPwaBanner.jsx`, and SVG charts will cleanly achieve the meat red/burgundy brand alignment without visual defects.
6. **Architectural Safety & Invariants:**
   - From Observation 3, any file exceeding 500 lines or violating hook call order causes test failure.
   - Therefore, all new components must be split into focused subcomponents (e.g. separate managers, modals, category selectors, and tables) ensuring every file remains well under 500 lines.

---

## 3. Caveats

1. **Network vs Offline Execution:**
   - In offline mode or when Supabase credentials cannot connect, mutations fall back to IndexedDB `offline_queue`. All mock and offline fallbacks must remain functional.
2. **Vitest vs Node Native Test Runner:**
   - The user request mentions Vitest (`using Vitest`), but the existing codebase uses Node's native test runner (`node:test` in `tests/*.test.js`). Both approaches can be supported (Vitest can run the existing and new test suites, or new tests can run with `node --test`).
3. **ImageKit Direct Upload Authentication:**
   - Without a backend private key on the client (per Rule 16), direct ImageKit upload must use public key client upload or mock upload with local preview fallback if network is restricted.

---

## 4. Conclusion

The existing architecture of AX_PROTEIN_FOOD is exceptionally well-structured, fast (tests run in 259ms), and strictly governed by AXONID design standards and file invariants. The requirements from `ORIGINAL_REQUEST.md` (Customers, Suppliers, Sales Reps & Commissions, Dashboard Drilldown & Financial Metrics, Meat Red Brand Theme, and Automated Tests) can be implemented in a clean 6-milestone sequence with zero disruption to existing warehouse, manufacturing, distribution, and treasury modules.

A complete technical analysis report has been written to:
`d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_1\analysis.md`

---

## 5. Verification Method

To independently verify all findings:
1. **Run Test Suite:**
   ```powershell
   npm test
   ```
   *Expected:* 9 test suites pass, 198 tests pass, 0 failures.
2. **Inspect File Lengths:**
   Check `tests/file-invariants.test.js` to verify all files in `src/` are audited for $\le 500$ lines.
3. **Verify Local Port:**
   Inspect `vite.config.js` lines 84-88 to verify `port: 8182` and `strictPort: true`.
4. **Verify Theme Tokens:**
   Inspect `tailwind.config.js` lines 14-26 to inspect the current blue color definitions.
5. **Review Analysis Report:**
   Read `d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_1\analysis.md` for full architectural blueprints, schemas, and milestone breakdown.
