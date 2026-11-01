# Comprehensive Codebase & Architecture Investigation Report

**Project:** AX_PROTEIN_FOOD (بروتين فود - لتجهيز وحفظ اللحوم المجمدة)  
**Date:** 2026-10-31  
**Investigator:** Explorer 1 (Codebase & Architecture Explorer)  
**Integrity Mode:** Development (Read-Only Investigation)  

---

## 1. Executive Summary

This investigation provides a comprehensive architectural survey of the **AX_PROTEIN_FOOD** codebase located at `d:\AXONID_PROJECTS\AX_FROZEN_FOODS`. The system is a hybrid standalone PWA (React 18 + Vite 6 + Tailwind CSS + IndexedDB + Supabase) governing cold storage warehouses, frozen goods ingestion, meat disassembly/manufacturing, and field van sales.

The objective of this survey is to establish the complete architectural roadmap for implementing:
1. **Customers Management Module** (Hierarchical categories, geographic classification, debit/credit opening balances, ImageKit attachments).
2. **Suppliers Management Module** (Supply types, categories, contact details, payables/receivables opening balances).
3. **Sales Representatives & Commissions Module** (Representative profiles, sales targets, multi-model commission calculation engine, 360° representative ledger).
4. **Dashboard Enhancements** (User-configurable pinned inventory widget with branch/warehouse stock drilldown, real-time financial liability & debt metrics).
5. **Brand Theme Color Alignment** (Complete transition from arctic blue `#0284c7` to meat red/burgundy `#991b1b` / `#b91c1c`).
6. **Automated Testing Suite** (Verification of CRUD, commission math, balance aggregations, and architectural invariants).

---

## 2. Build Configuration & Development Environment

### 2.1 Dependencies & Versions (`package.json`)
- **React & DOM:** `^18.3.1`
- **Build Tool:** `vite@^6.0.11` with `@vitejs/plugin-react@^4.3.4`
- **PWA Plugin:** `vite-plugin-pwa@^1.3.0`
- **Styling:** `tailwindcss@^3.4.17`, `postcss@^8.5.1`, `autoprefixer@^10.4.20`, `clsx@^2.1.1`, `tailwind-merge@^2.6.0`
- **Icons:** `lucide-react@^1.16.0`
- **State Management:** `zustand@^5.0.3`
- **Database Client:** `@supabase/supabase-js@^2.117.2`
- **Utilities:** `canvas-confetti@^1.9.4`
- **Current Test Script:** `"node --test tests/*.test.js"`

### 2.2 Local Server Configuration (`vite.config.js`)
- **Port:** `8182` with `strictPort: true` and `host: true` (complying strictly with Rule 18 of AXONID Master Invariants to prevent local port collisions with other AXONID apps such as H&A Import on `8181`).
- **PWA Workbox Strategy:**
  - `registerType: 'autoUpdate'`
  - Precache buster: `globIgnores: ['**/version.json']` and `runtimeCaching` rule for `version.json` set to `NetworkOnly` (Quad-Lock PWA specification).
  - Background push worker: `sw-push-handler.js` imported via `importScripts`.

### 2.3 Existing Test Suite & Architectural Invariants
Executing `npm test` runs 9 test suites with **198 automated tests** passing in ~260ms via Node's native test runner (`node:test` + `node:assert/strict`).
Crucial architectural rules enforced by existing tests:
1. **Constitution File Invariants (`tests/file-invariants.test.js`):** Every `.js` and `.jsx` file inside `src/` is audited to never exceed **500 lines**. Exceeding 500 lines causes immediate test suite failure.
2. **React Hooks Integrity Scanner (`tests/hooks-integrity.test.js`):** Verifies that no component executes early returns (`if (!isOpen) return null`) before declaring React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `useAXStore`, `useBodyScrollLock`).
3. **Modal Deletion Invariants (`tests/items-operations.test.js`):** Forbids direct unconfirmed deletion; enforces mandatory use of `AX_ConfirmModal`.
4. **PWA Version Invariant (`tests/pwa-version.test.js`):** Enforces identical semver strings between `package.json` (`1.5.9`) and `public/version.json`.

*Vitest Note:* The user request mentions automated testing with Vitest. Because the project is currently configured with `node:test` (198 passing tests), the automated tests for the new features can be added in `tests/*.test.js` running natively with zero extra network overhead, or Vitest can be installed alongside if requested.

---

## 3. Routing & Navigation Architecture

### 3.1 Routing Model (`src/App.jsx`)
The application operates as a Single-Page Application (SPA) driven by client-side tab state managed within Zustand (`activeTab`).
- **Tab State Synchronization:**
  - Tab state is read on boot from URL query parameters (`window.location.search?tab=...`), falling back to `localStorage.getItem('ax_active_tab') || 'dashboard'`.
  - When switching tabs, `setActiveTab` updates Zustand, writes to `localStorage`, and updates the browser URL without reload (`window.history.replaceState({}, '', url.toString())`).
- **Role-Based Access Control (RBAC):**
  - Tab access is guarded by `hasModuleAccess(profile, activeTab)` (`src/utils/permissionsConfig.js`).
  - If a user lacks permission for the active tab, `App.jsx` automatically redirects to `getFirstAccessibleTab(profile)`.
- **Canvas Geometry:**
  - Enforces Rule 1 (Zero Empty Side Gutters): `<main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 pb-24 lg:pb-6 flex gap-5 items-start">`.
  - Content stretches from edge to edge with zero restrictive `max-w-7xl mx-auto` containers.

### 3.2 Navigation Components
- **Desktop Sidebar (`src/components/navigation/AX_Sidebar.jsx`):**
  - Docked to right side (RTL), sticky at `top-20`, dynamic width `w-64` (expanded/pinned) and `w-[72px]` (collapsed/hover).
  - Modules grouped into logical sections: نظرة عامة, الأصناف والمخازن, التوزيع الميداني, المالية والحسابات, الإدارة وفريق العمل.
  - Interactive search input for filtering menu items.
  - Badge counters for pending actions (pending transfers, pending cash transfers).
- **Mobile Bottom Navigation (`src/components/navigation/AX_MobileNavbar.jsx`):**
  - Floating pill bar at screen bottom (`fixed bottom-3 inset-x-0 z-40 flex justify-center`).
  - Styled with `backdrop-blur-xl`, rounded pills, horizontal swipe, and automatic `scrollIntoView` for active tab.
- **Header (`src/components/navigation/AX_Header.jsx`):**
  - Displays dynamic tab title, online/offline status pill with animated wifi icon, pending sync queue trigger, notification center bell with unread badge, avatar with user profile modal trigger, and logout confirmation.

### 3.3 Required Navigation Extensions
To integrate the new modules, the following updates are required:
1. `src/utils/permissionsConfig.js`: Add definitions for `customers`, `suppliers`, and `sales_reps` in `MODULE_PERMISSIONS_CONFIG` and assign default permissions across role presets (`cashier`, `warehouse`, `accountant`, `admin`, `van_driver`).
2. `src/components/navigation/AX_Sidebar.jsx`:
   - Add `{ id: 'customers', label: 'إدارة العملاء', icon: UserCheck }` under المالية والحسابات or dedicated partners section.
   - Add `{ id: 'suppliers', label: 'إدارة الموردين', icon: Building2 }` under الأصناف والمخازن or partners section.
   - Add `{ id: 'sales_reps', label: 'المناديب والعمولات', icon: BadgePercent }` under التوزيع الميداني or المالية.
3. `src/components/navigation/AX_MobileNavbar.jsx`: Add tabs to `allTabs` array with permission guards.
4. `src/App.jsx`: Add lazy/modular imports and conditional render blocks for `<AX_CustomersManager />`, `<AX_SuppliersManager />`, and `<AX_SalesRepsManager />`.

---

## 4. State Management & Data Persistence

### 4.1 Zustand Store Architecture (`src/store/useAXStore.js`)
The application state is centralized in `useAXStore`. Existing store slices include:
- `profile`: Authenticated user profile with permissions matrix.
- `items`: Frozen food items catalog with composite names, units, and carton packaging.
- `inventoryStock`: Warehouse stock quantities array: `{ warehouseId, itemId, quantity, unit }`.
- `warehouses`: Physical and mobile storage facilities: `{ id, name, type, manager }`.
- `transfers`: Stock transfer orders between warehouses.
- `treasuryAccounts`: Cash drawers and bank accounts: `{ id, name, type, balance }`.
- `cashTransactions`: Ledger of deposits and disbursements: `{ id, code, type, partyName, amount, treasuryId, date, notes }`.
- `invoices`: Sales and purchase invoices: `{ id, code, type, partyName, total, paidAmount, remainingAmount, items, status }`.
- `clients`: Existing simple array: `{ id, name, phone, address, balance }`.
- `suppliers`: Existing simple array: `{ id, name, phone, address, balance }`.
- `distributors`: Van operators: `{ id, name, vanNumber }`.
- `manufacturingOrders`: Cutting and disassembly processing batches.
- `stockAudits`: Physical inventory audit records.
- `notifications`: In-app system alerts.
- `employees` & `staffInvites`: Team members and onboarding tokens.

### 4.2 Offline Storage & Sync Engine
1. **IndexedDB (`src/services/offlineDB.js`):**
   - Database name: `ax_frozen_foods_db` (Version 1).
   - Object Store 1: `offline_queue` (KeyPath `id`, autoIncrement) stores pending mutations `{ table, action, payload, createdAt, retries }`.
   - Object Store 2: `cache_store` (KeyPath `key`) stores cached datasets for offline availability.
2. **Offline Synchronizer (`src/services/offlineSync.js`):**
   - Automatically processes queued operations sequentially when network connectivity is restored (`window.addEventListener('online', ...)`).
   - Handles `insert`, `update`, and `delete` operations with fallback queuing if an operation fails.
3. **Database Hydration (`src/services/AX_DatabaseSync.js`):**
   - On application startup, executes a single parallel `Promise.all` fetching all active tables from Supabase.
   - Maps PostgreSQL snake_case columns to frontend camelCase properties and hydrates Zustand.
   - Registers real-time PostgreSQL replication channels for live synchronization across connected clients.

---

## 5. ImageKit Integration Analysis

### 5.1 Current Status
- Credentials exist in `.env`:
  ```env
  VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/c8zctprqq
  VITE_IMAGEKIT_PUBLIC_KEY=public_xKb4EU48gwQEN3k+IkcmynMLljE=
  ```
- **Finding:** No components currently connect to ImageKit. For example, `AX_UserProfileModal.jsx` reads images locally using `FileReader.readAsDataURL()` and saves the base64 string directly to localStorage.

### 5.2 Required Implementation Architecture (`src/services/imageKitService.js`)
To fulfill Requirement R1 (Customer images and documents upload):
1. **Client-Side Upload Method:**
   ImageKit allows client-side direct uploads via `https://upload.imagekit.io/api/v1/files/upload`.
   - Payload: FormData containing `file`, `fileName`, `publicKey` (`VITE_IMAGEKIT_PUBLIC_KEY`), `tags`, and `folder` (e.g. `/protein_food/customers/`).
   - For signed uploads without exposing private keys (complying with Rule 16 "Zero Secrets in Vite"): Route authentication token generation through a Supabase Edge Function (`imagekit-auth`) or provide unsigned client upload preset / direct client upload handler with base64/blob storage fallback.
2. **URL Transformation Helper:**
   Utility function `getImageKitUrl(filePathOrUrl, { width, height, quality = 80, crop = 'maintain_ratio' })`:
   Generates optimized CDN URLs:
   `${VITE_IMAGEKIT_URL_ENDPOINT}/tr:w-${width},h-${height},q-${quality}/${cleanPath}`
3. **Document Attachment Model:**
   For each customer record:
   ```json
   {
     "imageUrl": "https://ik.imagekit.io/c8zctprqq/customers/cust-1.jpg",
     "documents": [
       {
         "id": "doc-uuid-1",
         "name": "السجل التجاري.pdf",
         "url": "https://ik.imagekit.io/c8zctprqq/customers/docs/cr_123.pdf",
         "type": "application/pdf",
         "size": 1048576,
         "uploadedAt": "2026-10-31"
       }
     ]
   }
   ```

---

## 6. Database Schema & Data Models

### 6.1 Existing Tables Catalog
The Supabase database instance (`gwxumpjezcwxhpuicwfi.supabase.co`) hosts the following operational tables:
1. `ax_items`
2. `ax_warehouses`
3. `ax_inventory_stock`
4. `ax_stock_audits`
5. `ax_transfers`
6. `ax_treasuries`
7. `ax_cash_transactions`
8. `ax_cash_transfers`
9. `ax_invoices`
10. `ax_clients` (Currently simple schema: `id`, `name`, `phone`, `address`, `balance`)
11. `ax_suppliers` (Currently simple schema: `id`, `name`, `phone`, `address`, `balance`)
12. `ax_distributors`
13. `ax_notifications`
14. `ax_categories`
15. `ax_manufacturing_orders`
16. `ax_users_profiles`
17. `ax_staff_invites`
18. `ax_activity_logs`

### 6.2 Proposed Schema Upgrades

#### A. Customers Table (`ax_clients`) Extensions
To fulfill Requirement R1:
```sql
ALTER TABLE ax_clients
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_type VARCHAR(10) DEFAULT 'debit', -- 'debit' (مدين - عليه) or 'credit' (دائن - له)
  ADD COLUMN IF NOT EXISTS primary_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS governorate VARCHAR(100),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notes TEXT;
```

#### B. Suppliers Table (`ax_suppliers`) Extensions
To fulfill Requirement R2:
```sql
ALTER TABLE ax_suppliers
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS supply_type VARCHAR(100), -- نوع التوريد (لحوم مستوردة، دواجن، مصنعات، أسماك)
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_type VARCHAR(10) DEFAULT 'credit', -- 'credit' (دائن - مستحق له) or 'debit' (مدين - دفعة مقدمة)
  ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS commercial_register VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notes TEXT;
```

#### C. Sales Representatives Table (`ax_sales_reps`) (New Entity)
To fulfill Requirement R3:
```sql
CREATE TABLE IF NOT EXISTS ax_sales_reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(100),
  national_id VARCHAR(50),
  assigned_area VARCHAR(100),
  opening_balance NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  sales_target NUMERIC DEFAULT 0,
  commission_model VARCHAR(50) NOT NULL DEFAULT 'percentage_tiered',
  -- Commission Configuration (Flexible Multi-Model):
  -- Model 1: rate_per_thousand (amount per 1,000 EGP of sales)
  rate_per_thousand NUMERIC DEFAULT 0,
  -- Model 2: category_rates: { "أسماك": 2.5, "لحوم": 3.0, "مصنعات": 4.0 }
  category_rates JSONB DEFAULT '{}'::jsonb,
  -- Model 3: tier_rates: [ { "min": 0, "max": 50000, "rate": 2 }, { "min": 50001, "max": 100000, "rate": 3.5 } ]
  tier_rates JSONB DEFAULT '[]'::jsonb,
  target_bonus_rate NUMERIC DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### D. Sales Rep Commission Ledger Table (`ax_rep_transactions`) (New Entity)
```sql
CREATE TABLE IF NOT EXISTS ax_rep_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID REFERENCES ax_sales_reps(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'commission_accrual', 'disbursement_payment', 'bonus', 'adjustment'
  amount NUMERIC NOT NULL,
  invoice_id UUID REFERENCES ax_invoices(id),
  treasury_id UUID REFERENCES ax_treasuries(id),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Commission Engine & Sales Reps Architecture

### 7.1 Commission Calculation Engine (`src/utils/commissionEngine.js`)
The multi-model commission engine must support three calculation formulas:
1. **Fixed Amount per Sales Volume (Rate per 1,000 EGP):**
   $$\text{Commission} = \left(\frac{\text{Sales Total}}{1000}\right) \times \text{Rate Per Thousand}$$
2. **Category-Specific Percentage Model:**
   $$\text{Commission} = \sum_{\text{items}} \left(\text{Item Sales Total} \times \frac{\text{Category Rate \%}}{100}\right)$$
3. **Tiered Target Achievement Model:**
   - Evaluates total sales against defined volume tiers (`min` to `max`).
   - If sales exceed target, an optional target attainment bonus (`target_bonus_rate`) is applied on surplus or total volume.

### 7.2 Representative 360° Statement of Account (Ledger)
Derived directly from `AX_Ledger360Report.jsx` patterns:
- Tracks chronologically:
  - Opening balance
  - Accrued commissions from validated sales invoices
  - Payments disbursed to the rep via cash transactions (`PAY-xxx`)
  - Running net balance (`Opening + Accrued Commissions - Payments Disbursed`)
- Includes filter by date range, printable A4 ledger sheet, and CSV export.

---

## 8. Dashboard Stock Drilldown & Financial Metrics Design

### 8.1 Pinned Inventory Widget
Requirement R4 mandates user-configurable pinned inventory monitoring:
- **State Storage:** Persisted in `localStorage.getItem('ax_pinned_item_ids')` and Zustand.
- **Widget Interface:**
  - Displays a clean horizontal carousel or grid of pinned item cards showing composite item name, code, total system quantity, and primary packaging unit.
  - "تثبيت أصناف" button opens a lightweight multi-select modal (`AX_PinItemsModal`) with search to check/uncheck monitored items.
- **Drilldown Modal (`AX_StockDrilldownModal`):**
  - Clicking any pinned item opens a detailed modal showing:
    - Total quantity and value.
    - Table / Bento breakdown per branch/warehouse:
      - Warehouse Name (`warehouses.name`)
      - Warehouse Type (`cold_store`, `processing`, `van`, etc.)
      - Available Stock (`quantity`)
      - Unit (`unit`)
      - Estimated Value (`quantity * buyPrice`)

### 8.2 Real-Time Financial Summary Metrics
Update `AX_DashboardMetricsCards.jsx` to calculate and present:
1. **ديون العملاء (Receivables):**
   $$\sum \text{Client Debts} = \sum_{c \in \text{clients}} (\text{Current Balance} \text{ where } \text{balanceType} = \text{'debit'})$$
2. **التزامات الموردين (Payables):**
   $$\sum \text{Supplier Liabilities} = \sum_{s \in \text{suppliers}} (\text{Current Balance} \text{ where } \text{balanceType} = \text{'credit'})$$
3. **أرصدة المناديب (Rep Balances):**
   $$\sum \text{Rep Balances} = \sum_{r \in \text{reps}} \text{Current Net Commission Balance}$$
4. **نسبة تحقيق الأهداف (Target Progress):**
   $$\text{Attainment \%} = \frac{\sum \text{Sales Revenue}}{\sum \text{Rep Targets}} \times 100$$

---

## 9. Brand Theme Color Alignment Plan

### 9.1 Color Token Migration Palette
Requirement R5 mandates updating the application's primary visual theme from arctic blue to **meat red / burgundy** consistent with the Protein Food logo:

| Token | Old Color (Arctic Blue) | New Color (Meat Red / Burgundy) | Usage |
|---|---|---|---|
| `primary.DEFAULT` | `#0284c7` | `#991b1b` (Tailwind Red-800) | Primary buttons, active tabs, highlights |
| `primary.container` | `#0c4a6e` | `#450a0a` (Tailwind Red-950) | Container headers, banner backgrounds |
| `primary.on-container` | `#bae6fd` | `#ffe4e6` (Rose-100) | Text on primary containers |
| `primary.dark` | `#0369a1` | `#7f1d1d` (Tailwind Red-900) | Hover states, active borders |
| `secondary.DEFAULT` | `#0891b2` | `#b91c1c` (Tailwind Red-700) | Secondary action buttons, chips |
| `secondary.container` | `#cffafe` | `#fef2f2` (Red-50) | Light alert tags, filter pills |
| `secondary.on-container`| `#155e75` | `#991b1b` (Red-800) | Text on secondary containers |

### 9.2 File Update Checklist for Theme Alignment
1. `tailwind.config.js`: Update `theme.extend.colors.primary` and `secondary`.
2. `index.html`: Update `<meta name="theme-color" content="#991b1b" />`.
3. `vite.config.js`: Update `manifest.theme_color: '#991b1b'`.
4. `public/manifest.json`: Update `"theme_color": "#991b1b"`.
5. `src/index.css`: Update selection and custom scrollbar backgrounds.
6. `src/components/common/AppUpdateNotifier.jsx`: Update gradient stops from `[#0284c7]` to `[#991b1b]`.
7. `src/components/common/AX_InstallPwaBanner.jsx`: Update background and button styles.
8. `src/components/common/AX_WelcomeOverlay.jsx`: Update radial gradient and text clip gradients.
9. `src/components/dashboard/AX_SalesFlowChart.jsx` & `AX_StockDistributionChart.jsx`: Update SVG gradient stops and palette arrays.
10. `DESIGN.md` & `GEMINI.md`: Update brand design system tokens to reflect the new red/burgundy palette.

---

## 10. Recommended Milestone Decomposition

To ensure seamless execution adhering to the 500-line invariant and zero regressions on the 198 existing tests:

### Milestone 1: Brand Theme Alignment & Core Infrastructure
- Update `tailwind.config.js`, `vite.config.js`, `index.html`, `public/manifest.json`, and common layout components to meat red/burgundy.
- Create `src/services/imageKitService.js` and `src/utils/commissionEngine.js`.
- Update store initial data and hydration helpers for customers, suppliers, and sales reps.

### Milestone 2: Customers Management Module
- Create `src/components/customers/AX_CustomersManager.jsx`.
- Create `src/components/customers/AX_CustomerModal.jsx` (with hierarchical categories, governorate/city/district selectors, debit/credit opening balances, and ImageKit image/doc attachments).
- Create `src/components/customers/AX_CustomerCategorySelect.jsx`.
- Wire permissions in `permissionsConfig.js` and navigation in `AX_Sidebar.jsx` and `AX_MobileNavbar.jsx`.

### Milestone 3: Suppliers Management Module
- Create `src/components/suppliers/AX_SuppliersManager.jsx`.
- Create `src/components/suppliers/AX_SupplierModal.jsx` (with supply types, company name, category, payables/receivables opening balance).
- Wire permissions in `permissionsConfig.js` and navigation in `AX_Sidebar.jsx` and `AX_MobileNavbar.jsx`.

### Milestone 4: Sales Representatives & Commissions Module
- Create `src/components/reps/AX_SalesRepsManager.jsx`.
- Create `src/components/reps/AX_SalesRepModal.jsx` (commission models, target, opening balance).
- Create `src/components/reps/AX_SalesRepLedgerModal.jsx` (360° statement of account, accrued commissions, payments).
- Wire permissions and navigation.

### Milestone 5: Dashboard Enhancements
- Create `src/components/dashboard/AX_PinnedInventoryWidget.jsx` and `AX_StockDrilldownModal.jsx`.
- Update `AX_DashboardMetricsCards.jsx` with customer receivables, supplier liabilities, rep balances, and target progress.
- Embed pinned inventory widget into `AX_Dashboard.jsx`.

### Milestone 6: Automated Testing & Verification
- Add comprehensive automated unit and integration tests in `tests/` verifying customer/supplier balance math, commission formulas, and dashboard aggregations.
- Verify all files adhere to the 500-line hard limit and React hooks integrity.
- Run full test suite and confirm 0 failures.
