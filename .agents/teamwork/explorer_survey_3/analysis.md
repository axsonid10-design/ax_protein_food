# Technical Investigation Report: Requirements R4, R5, and R6
**Project:** Protein Food (AX_FROZEN_FOODS)  
**Explorer:** Explorer 3 (Dashboard Theme & Testing Explorer)  
**Date:** 2026-10-31  
**Status:** Read-Only Survey Complete

---

## Executive Summary
This report presents the complete codebase survey and technical blueprints for:
1. **Requirement R4:** Dashboard Stock Drilldown & Financial Metrics (User-configurable pinned inventory widget, branch/warehouse stock drilldown modal, and real-time financial metrics for customer receivables, supplier liabilities, representative commission balances, and sales targets).
2. **Requirement R5:** Brand Theme Color Alignment (Migrating from cold sky/cyan blue to meat red / burgundy `#991b1b` / `#b91c1c` across Tailwind tokens, HTML/PWA manifests, CSS scrollbars, SVG chart gradients, splash/update banners, and documentation).
3. **Requirement R6:** Automated Testing & Verification (Vitest configuration setup, test suite inventory of 37 test cases covering R1 through R5, and backward compatibility with the existing 198 tests).

---

## 1. Requirement R4: Dashboard Stock Drilldown & Financial Metrics

### 1.1 Existing Dashboard Component Architecture
The dashboard resides in `src/components/dashboard/` and is mounted by `App.jsx` when `activeTab === 'dashboard'`.

```
src/components/dashboard/
├── AX_Dashboard.jsx                 # Master page container (196 lines)
├── AX_PeriodFilterBar.jsx          # Timeframe pills (today, 7days, month, year, custom)
├── AX_DashboardMetricsCards.jsx    # 4 top metric cards: Sales, Stock Value, Stock Qty, Cash
├── AX_QuickActionsBar.jsx          # Tab navigation shortcuts
├── AX_SalesFlowChart.jsx           # SVG Area curve chart with monthly/daily flow
├── AX_StockDistributionChart.jsx   # Donut & distribution breakdown by category
├── AX_TopSellingItemsChart.jsx     # Top moving products with bar meters
├── AX_ColdStorageCapacityCard.jsx  # Warehouse cold capacity & temperature tracking
├── AX_CashCreditSplitChart.jsx     # Cash vs Credit sales split
├── AX_ManufacturingYieldCard.jsx   # Meat disassembly & yield percentage summary
└── AX_OperationalAlerts.jsx        # Pending transfers & low stock warnings
```

### 1.2 Data Representation in State & Database
- **Items (`items` in store / `ax_items` in Supabase):**
  - Schema: `{ id, code, compositeName, primaryCategory, subCategory, secondaryCategory, unitType, units, weightPerCarton, buyPrice, sellPrice, pieceBuyPrice, pieceSellPrice, ... }`
- **Warehouses & Branches (`warehouses` in store / `ax_warehouses` in Supabase):**
  - Schema: `{ id, name, type, manager, phone }`
  - Types in `WAREHOUSE_TYPES` (`AX_AddWarehouseModal.jsx`):
    - `'cold_store'` (تجميد وحفظ رئيسي)
    - `'raw_materials'` (خامات وتوريد)
    - `'processing'` (تقطيع وتجهيز)
    - `'finished_goods'` (مصنعات وتعبئة)
    - `'van'` (سيارة توزيع / نقل)
    - `'branch'` (فرع مبيعات)
- **Inventory Stock (`inventoryStock` in store / `ax_inventory_stock` in Supabase):**
  - Schema: `{ warehouseId, itemId, quantity, unit }`
  - Stock is uniquely keyed by `(warehouseId, itemId)`.
- **Invoices (`invoices` in store / `ax_invoices` in Supabase):**
  - Schema: `{ id, code, type: 'sale' | 'purchase', partyName, date, total, paidAmount, remainingAmount, status, items: [...] }`
- **Customers (`clients` in store / `ax_clients` in Supabase):**
  - Current schema: `{ id, name, phone, balance, address }`
  - Required R1 enhancements: opening balance (debit/credit), 2-level categories, geographic classification, ImageKit attachments.
- **Suppliers (`suppliers` in store / `ax_suppliers` in Supabase):**
  - Current schema: `{ id, name, phone, balance, address }`
  - Required R2 enhancements: company name, supply type (`نوع التوريد`), category, opening balance.
- **Sales Representatives (`salesReps` in store / `ax_sales_representatives` in Supabase):**
  - Required R3 new structure: `{ id, name, phone, assignedBranch, targetAmount, openingBalance, currentBalance, commissionModel, commissionRate }`.

---

### 1.3 Specification: User-Configurable Pinned Inventory Widget

#### Purpose
Allows managers to pin 3–8 high-priority meat products (e.g. frozen chicken thighs, beef shank, kofta, whole chicken) directly on the dashboard to track real-time stock levels at a glance without navigating to the item catalog.

#### Placement in Dashboard
Located immediately below `AX_DashboardMetricsCards` and above `AX_QuickActionsBar` or beside the operational charts in `AX_Dashboard.jsx`.

#### Architecture & State Flow
- **Persistence Key:** `localStorage.getItem('ax_dashboard_pinned_items')`
- **Fallback Strategy:** If no pins are saved in `localStorage`, the widget defaults to the top 4 active items from `items`:
  ```javascript
  const defaultPinnedIds = (items || []).slice(0, 4).map((i) => i.id)
  ```
- **Store Actions:**
  - `pinItem(itemId)`: Adds ID to `pinnedItemIds`, updates `localStorage`.
  - `unpinItem(itemId)`: Removes ID, updates `localStorage`.
  - `setPinnedItems(itemIds)`: Bulk replaces array of pinned IDs.

#### Component Interface: `AX_PinnedStockWidget.jsx`
```javascript
export function AX_PinnedStockWidget({
  items = [],
  inventoryStock = [],
  warehouses = [],
  onOpenDrilldown, // (item) => void
})
```

#### Widget UI Layout (Per Constitution & Anti-Patterns)
1. **Header Bar:**
   - Title: `الأصناف المثبتة للمتابعة الفورية`
   - Subtitle: `مراقبة رصيد أهم المنتجات وتوزيعها المخزني`
   - Actions: Pill button `تخصيص الأصناف` (with `SlidersHorizontal` / `Pin` icon) to open pin selection modal.
2. **Pinned Grid:**
   - Responsive Bento grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3`.
   - Card structure:
     - Top row: Category badge (`getCategoryClass`) + composite item name + Pin icon.
     - Middle row: Total available stock formatted with unit (e.g. `275 كرتونة`).
     - Bottom row: Stock health badge (`متوفر` in emerald, `رصيد منخفض` in amber if <= 25, `نافد` in rose if 0).
     - Hover/Click effect: `cursor-pointer hover:border-primary/50 active:scale-98` with subtle arrow indicator to trigger drilldown.

---

### 1.4 Specification: Stock Drilldown Modal (`AX_StockDrilldownModal.jsx`)

#### Trigger
Clicking any pinned item card in `AX_PinnedStockWidget` opens `AX_StockDrilldownModal`.

#### Component Interface
```javascript
export function AX_StockDrilldownModal({
  isOpen,
  onClose,
  item = null,
  warehouses = [],
  inventoryStock = [],
})
```

#### Aggregation Algorithm
```javascript
const drilldownData = useMemo(() => {
  if (!item?.id) return { totalQty: 0, locations: [] }

  const itemStocks = inventoryStock.filter((s) => s.itemId === item.id)
  const totalQty = itemStocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)

  const locations = warehouses.map((wh) => {
    const stockRow = itemStocks.find((s) => s.warehouseId === wh.id)
    const qty = Number(stockRow?.quantity) || 0
    const pct = totalQty > 0 ? Math.round((qty / totalQty) * 100) : 0
    const unit = stockRow?.unit || item.unitType || 'كرتونة'

    let status = 'out'
    if (qty > 25) status = 'healthy'
    else if (qty > 0) status = 'low'

    return {
      warehouseId: wh.id,
      name: wh.name,
      type: wh.type,
      isBranch: wh.type === 'branch',
      isColdStore: wh.type === 'cold_store',
      manager: wh.manager || 'غير محدد',
      quantity: qty,
      unit,
      sharePercentage: pct,
      status,
    }
  })

  // Sort locations: Branches and Main Cold Stores first, then descending by quantity
  locations.sort((a, b) => b.quantity - a.quantity)

  return { totalQty, locations }
}, [item, warehouses, inventoryStock])
```

#### Modal Presentation
- **Header:**
  - Item Composite Name (`item.compositeName`), Code (`item.code`), Primary Category badge.
  - Total Stock Pill (`إجمالي الرصيد: 410 كرتونة`).
- **Desktop View (`hidden lg:block`):**
  - Single-line compact table:
    - فرع / مخزن (Name + Type badge)
    - النوع (فرع مبيعات / تجميد رئيسي / سيارة توزيع)
    - المسؤول (Manager)
    - الرصيد المتاح (Formatted Quantity + Unit)
    - النسبة من الإجمالي (Progress mini-bar + `pct%`)
    - حالة الرصيد (Badge: متوفر / حرج / نافد)
- **Mobile View (`lg:hidden`):**
  - Responsive Bento cards per location with 2-column key metric pairs and progress bar.
- **Packaging Drilldown Sub-bar:**
  - If item has `piecesPerCarton` or `weightPerCarton`:
    - Shows total cartons, total pieces, and estimated total weight in kg.

---

### 1.5 Specification: Real-Time Financial Summary Metrics

#### Business Requirements
Display real-time totals for:
1. **Total Customer Debts (Receivables - مستحقات المنظومة لدى العملاء)**
2. **Total Supplier Liabilities (Payables - التزامات المنظومة للموردين)**
3. **Sales Representative Balances (أرصدة ومستحقات المناديب)**
4. **Sales Target Progress (نسبة تحقيق المستهدف البيعي للمبيعات)**

#### Calculation Formulations
```javascript
// 1. Total Customer Debts (Receivables)
// Accounts where customer owes money (positive receivables balance)
const totalCustomerDebts = useMemo(() => {
  return (clients || []).reduce((sum, c) => {
    const bal = Number(c.balance) || 0
    return sum + (bal > 0 ? bal : 0)
  }, 0)
}, [clients])

const indebtedCustomersCount = useMemo(() => {
  return (clients || []).filter((c) => (Number(c.balance) || 0) > 0).length
}, [clients])

// 2. Total Supplier Liabilities (Payables)
// Accounts where supplier is owed money (positive payable liabilities)
const totalSupplierLiabilities = useMemo(() => {
  return (suppliers || []).reduce((sum, s) => {
    const bal = Number(s.balance) || 0
    return sum + (bal > 0 ? bal : 0)
  }, 0)
}, [suppliers])

const creditorSuppliersCount = useMemo(() => {
  return (suppliers || []).filter((s) => (Number(s.balance) || 0) > 0).length
}, [suppliers])

// 3. Sales Representative Balances (Accrued Net Commissions Payable)
const totalSalesRepsBalance = useMemo(() => {
  return (salesReps || []).reduce((sum, rep) => {
    const bal = Number(rep.netBalance ?? rep.currentBalance ?? rep.balance) || 0
    return sum + (bal > 0 ? bal : 0)
  }, 0)
}, [salesReps])

// 4. Sales Target Attainment Progress
const salesTargetMetrics = useMemo(() => {
  const totalTarget = (salesReps || []).reduce((sum, rep) => {
    return sum + (Number(rep.salesTarget ?? rep.targetAmount) || 0)
  }, 0)

  // Current period total sales from filteredInvoices
  const achievementPct = totalTarget > 0 ? Math.round((salesTotal / totalTarget) * 100) : 0
  const remainingTarget = Math.max(0, totalTarget - salesTotal)

  return {
    totalTarget,
    achievementPct,
    remainingTarget,
  }
}, [salesReps, salesTotal])
```

#### UI Presentation Options
- **Option A (Integrated Dual-Row Metrics in `AX_DashboardMetricsCards.jsx`):**
  - Row 1: Operational Assets (إجمالي المبيعات، قيمة المخزون، رصيد الوحدات، السيولة والخزن).
  - Row 2: Financial Balances & Liabilities (مديونيات العملاء، التزامات الموردين، مستحقات المناديب، تحقيق المستهدف).
- **Option B (Dedicated `AX_FinancialSummaryRow.jsx`):**
  - 4 specialized cards with distinct indicator colors:
    - Card 1: `مديونيات العملاء (لنا)` → Rose/Primary tint, icon `ArrowDownLeft` / `Users`, subtitle `${indebtedCustomersCount} عميل مدين`.
    - Card 2: `التزامات الموردين (علينا)` → Amber/Orange tint, icon `ArrowUpRight` / `Truck`, subtitle `${creditorSuppliersCount} مورد دائن`.
    - Card 3: `أرصدة وعمولات المناديب` → Purple/Indigo tint, icon `BadgePercent` / `UserCheck`, subtitle `مستحقات معلقة للمناديب`.
    - Card 4: `تحقيق المستهدف البيعي` → Emerald tint, icon `Target`, percentage badge with progress ring/bar.

---

## 2. Requirement R5: Brand Theme Color Alignment

### 2.1 Current Color System Audit
Currently, the codebase uses a cool marine/ice blue palette intended for arctic cold storage (`#0284c7`, `#0c4a6e`, `#0891b2`). The Protein Food corporate brand requires warm meat red and rich burgundy tones (`#991b1b`, `#b91c1c`, `#450a0a`).

### 2.2 Complete Codebase Occurrences of Blue/Cyan Palette

| File Path | Line(s) | Existing Value | Required Replacement |
|---|---|---|---|
| `tailwind.config.js` | 16-20 | `primary.DEFAULT: '#0284c7'`<br>`primary.container: '#0c4a6e'`<br>`primary.on-container: '#bae6fd'`<br>`primary.dark: '#0369a1'` | `primary.DEFAULT: '#991b1b'` (Red-800)<br>`primary.container: '#450a0a'` (Red-950)<br>`primary.on-container: '#fecaca'` (Red-200)<br>`primary.dark: '#7f1d1d'` (Red-900) |
| `tailwind.config.js` | 22-26 | `secondary.DEFAULT: '#0891b2'`<br>`secondary.container: '#cffafe'`<br>`secondary.on-container: '#155e75'`<br>`secondary.hover: '#0e7490'` | `secondary.DEFAULT: '#b91c1c'` (Red-700)<br>`secondary.container: '#fee2e2'` (Red-100)<br>`secondary.on-container: '#7f1d1d'` (Red-900)<br>`secondary.hover: '#991b1b'` (Red-800) |
| `index.html` | 11 | `<meta name="theme-color" content="#0284c7" />` | `<meta name="theme-color" content="#991b1b" />` |
| `public/manifest.json` | 5 | `"theme_color": "#0284c7"` | `"theme_color": "#991b1b"` |
| `vite.config.js` | 39 | `theme_color: '#0284c7'` | `theme_color: '#991b1b'` |
| `src/index.css` | 40 | `::-webkit-scrollbar-thumb:hover { background: #0284c7; }` | `background: #991b1b;` |
| `src/components/common/AppUpdateNotifier.jsx` | 121 | `from-[#0284c7] via-[#0c4a6e] to-[#0284c7]` | `from-[#991b1b] via-[#450a0a] to-[#991b1b]` |
| `src/components/common/AppUpdateNotifier.jsx` | 126 | `text-cyan-300` | `text-rose-200` |
| `src/components/common/AX_InstallPwaBanner.jsx` | 81 | `bg-[#0c4a6e] border-[#0284c7]/40` | `bg-[#450a0a] border-[#991b1b]/40` |
| `src/components/common/AX_InstallPwaBanner.jsx` | 95 | `bg-[#0284c7] hover:bg-[#0369a1]` | `bg-[#991b1b] hover:bg-[#7f1d1d]` |
| `src/components/common/AX_WelcomeOverlay.jsx` | 41 | `radial-gradient(..., #0c4a6e 0%, #032b43 55%, #02121e 100%)` | `radial-gradient(..., #450a0a 0%, #290404 55%, #140202 100%)` |
| `src/components/common/AX_WelcomeOverlay.jsx` | 45 | `bg-cyan-500/15` | `bg-red-500/15` |
| `src/components/common/AX_WelcomeOverlay.jsx` | 49, 50, 51 | `border-cyan-400/40 text-cyan-300` | `border-red-400/40 text-rose-300` |
| `src/components/common/AX_WelcomeOverlay.jsx` | 65 | `from-sky-100 via-cyan-400 to-sky-200 drop-shadow-[0_8px_20px_rgba(2,132,199,0.45)]` | `from-rose-100 via-red-400 to-rose-200 drop-shadow-[0_8px_20px_rgba(153,27,27,0.45)]` |
| `src/components/common/AX_WelcomeOverlay.jsx` | 68, 72 | `via-cyan-400`, `text-cyan-400` | `via-rose-400`, `text-rose-400` |
| `src/components/dashboard/AX_SalesFlowChart.jsx` | 227, 228, 263, 276, 284 | SVG stops, stroke, fill `#0284c7` | `#991b1b` |
| `src/components/dashboard/AX_StockDistributionChart.jsx` | 21, 50 | `['#0284c7', '#0c4a6e', '#0891b2', '#38bdf8', '#0369a1']` | `['#991b1b', '#450a0a', '#b91c1c', '#e11d48', '#7f1d1d']` |
| `src/components/dashboard/AX_TopSellingItemsChart.jsx` | 83 | `['bg-primary', 'bg-secondary', 'bg-cyan-600', 'bg-sky-500', 'bg-teal-600']` | `['bg-primary', 'bg-secondary', 'bg-rose-600', 'bg-red-600', 'bg-amber-600']` |
| `src/components/dashboard/AX_DashboardMetricsCards.jsx` | 49 | `text-sky-600 bg-sky-500/10` | `text-rose-700 bg-rose-500/10` |
| `DESIGN.md` | 17, 19, 21, 23, 75 | Blue color specs | Updated Meat Red / Burgundy tokens |
| `GEMINI.md` | 8 | Blue color specs | `#991b1b`, `#450a0a`, `#b91c1c` |

### 2.3 Exact Proposed Tailwind Color Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#991b1b',        // Red-800: Rich meat red (buttons, active tabs, main accents)
          container: '#450a0a',      // Red-950: Deep burgundy container (banners, headers)
          'on-container': '#fecaca',  // Red-200: Soft high-contrast text on container
          dark: '#7f1d1d',           // Red-900: Active and hover state
        },
        secondary: {
          DEFAULT: '#b91c1c',        // Red-700: Crimson meat accent
          container: '#fee2e2',      // Red-100: Soft tinted badge background
          'on-container': '#7f1d1d',  // Red-900: Deep burgundy text
          hover: '#991b1b',          // Red-800
        },
        burgundy: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        // Remaining surface, on-surface, outline tokens remain identical
      }
    }
  }
}
```

---

## 3. Requirement R6: Automated Testing & Verification

### 3.1 Current Test Infrastructure Status
- **Current Runner:** Node.js native test runner (`node:test` + `node:assert/strict`) configured in `package.json`:
  ```json
  "scripts": {
    "test": "node --test tests/*.test.js"
  }
  ```
- **Current Test Count:** 198 tests across 9 files, all passing in 398ms.
- **Requirement R6:** Explicitly mandates automated tests using **Vitest** for verifying customer/supplier balance calculations, commission models, and dashboard balance aggregations.

### 3.2 Vitest Configuration & Setup Architecture
To seamlessly satisfy R6 without breaking existing tests:
1. **Package Dependency:**
   Add `vitest` to `devDependencies` in `package.json`.
2. **Vite / Vitest Configuration (`vite.config.js` or `vitest.config.js`):**
   ```javascript
   // vitest.config.js or in vite.config.js test block
   import { defineConfig } from 'vitest/config'
   import react from '@vitejs/plugin-react'

   export default defineConfig({
     plugins: [react()],
     test: {
       environment: 'node',
       globals: true,
       include: ['tests/**/*.test.{js,jsx}'],
     },
   })
   ```
3. **Execution Script:**
   ```json
   "scripts": {
     "test": "vitest run",
     "test:watch": "vitest",
     "test:node": "node --test tests/*.test.js"
   }
   ```
   *Note:* Vitest natively executes `describe`, `it`, and `node:assert` assertions seamlessly, so existing 198 tests run identically under Vitest.

---

### 3.3 Vitest Test Case Inventory (Requirements R1 to R5)

#### Test Suite 1: Customers Module (`tests/customers.test.js`) — 8 Test Cases
1. `should create customer with full profile including commercial registration and tax number`
2. `should enforce quick add with incomplete warning badge when only name is provided`
3. `should assign and validate two-level category hierarchy (primary and subcategory)`
4. `should assign independent geographic classification (governorate, center/city, district)`
5. `should calculate debit opening balance as customer receivables (مستحق على العميل)`
6. `should calculate credit opening balance as advance deposit (رصيد دائن للعميل)`
7. `should construct valid ImageKit attachment URLs for customer identity and tax documents`
8. `should update customer balance upon sales invoice registration and cash receipt`

#### Test Suite 2: Suppliers Module (`tests/suppliers.test.js`) — 6 Test Cases
1. `should create supplier profile with contact details and company name`
2. `should categorize supplier by supply type (لحوم مجمدة، دواجن، أسماك، تعبئة)`
3. `should map supplier to operational factory/warehouse category`
4. `should record supplier opening balance as payable liability (مستحق للمورد)`
5. `should increase supplier liability upon purchase invoice addition`
6. `should decrease supplier liability upon cash disbursement payout`

#### Test Suite 3: Sales Representatives & Commissions Engine (`tests/sales-reps-commissions.test.js`) — 9 Test Cases
1. `should create sales representative profile with assigned target and initial balance`
2. `[Model A] should calculate volume-based commission (e.g. 50 EGP per 1,000 EGP sales)`
   - *Formula:* `Math.floor(invoiceTotal / 1000) * 50`
   - *Example:* 34,700 EGP invoice → 34 × 50 = 1,700 EGP.
3. `[Model B] should calculate category-specific percentage commission`
   - *Fish items (2%):* 15,000 EGP → 300 EGP.
   - *Processed items (3.5%):* 20,000 EGP → 700 EGP.
   - *Raw items (1.5%):* 10,000 EGP → 150 EGP.
   - *Total:* 1,150 EGP.
4. `[Model C] should apply tiered target attainment multiplier`
   - Attainment < 80%: 1.0x (Base rate).
   - Attainment 80%–99%: 1.2x.
   - Attainment >= 100%: 1.5x bonus.
5. `should compute chronological statement of account running net balance`
   - `Net = Opening + AccruedCommissions - Payouts`
6. `should deduct cash payout from sales rep ledger balance`
7. `should link sales representative ID to invoice on invoice creation`
8. `should safely handle zero sales target without division by zero or NaN`
9. `should export clean representative ledger formatted for print/audit`

#### Test Suite 4: Dashboard Aggregations, Pinned Items & Drilldowns (`tests/dashboard-aggregations.test.js`) — 8 Test Cases
1. `should persist and load user pinned items to/from localStorage`
2. `should fallback to top 4 stock items when no user pins exist`
3. `should aggregate item stock across all warehouses and branch locations accurately`
4. `should distinguish sales branches from central cold storage and vans in drilldown`
5. `should compute total customer debts (receivables) across all customer accounts`
6. `should compute total supplier liabilities (payables) across all supplier accounts`
7. `should compute aggregate sales rep net commission balances`
8. `should compute overall sales target achievement percentage accurately`

#### Test Suite 5: Brand Theme & Architectural Invariants (`tests/theme-invariants.test.js`) — 6 Test Cases
1. `should ensure tailwind.config.js primary tokens match meat red (#991b1b)`
2. `should ensure tailwind.config.js secondary tokens match crimson (#b91c1c)`
3. `should ensure index.html meta theme-color matches #991b1b`
4. `should ensure manifest.json and vite.config.js theme_color matches #991b1b`
5. `should verify zero occurrences of obsolete #0284c7 in theme token definitions`
6. `should enforce 500 lines per file hard limit on all new and existing source files`

---

## 4. Implementation Readiness & Handoff Summary
All findings, data schemas, component interfaces, token mappings, and test specifications have been codified and ready for the implementation phase.
