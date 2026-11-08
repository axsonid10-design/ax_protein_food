# Deep Technical Analysis: Requirements R1 & R2
**System**: AX_PROTEIN_FOOD (بروتين فود - لتجهيز وحفظ اللحوم المجمدة)  
**Author**: `explorer_survey_1`  
**Date**: 2026-11-08  
**Scope**: 
- **R1. Distribution Vans Management & Stock Loading**
- **R2. Van Daily Settlement (Financial, Stock & Expenses)**

---

## 1. Executive Summary

Requirements R1 and R2 transform the distribution module (`src/components/distribution/AX_VanDistribution.jsx`) from a rudimentary single-item cargo loading mockup into an enterprise-grade cold-chain van distribution and daily settlement subsystem.

Key findings:
1. **Warehouse Foundation Ready**: In `src/services/AX_OperationsService.js:175`, `VALID_WH_TYPES` already includes `'van'`. Using `'van'` warehouses for distribution vehicles allows vehicles to seamlessly inherit full native inventory tracking in `ax_inventory_stock`, instant multi-item transfers in `ax_transfers`, and audit logging without any breaking schema migrations.
2. **Sub-Unit & Fractional Packaging Engine Exists**: In `src/utils/pricingCalculations.js:110-125`, `getCartonEquivalent(qty, unit, item)` already supports carton, piece, bag ('كيس'), and tray ('طبق') conversions. Invoices already deduct carton equivalents (`src/store/storeCacheHelper.js:69-76`). This exact mathematical engine can be leveraged for fractional and packaging-breakdown van loading.
3. **Driver Linkage via `branch_id`**: In `ax_users_profiles`, users have `branch_id` (synced to `profile.branchId` in `AX_LoginScreen.jsx:120`). Linking a driver to their vehicle warehouse enables sales recorded by that driver to automatically deduct stock from the vehicle custody inventory.
4. **File Line Limit Constraint**: `useAXStore.js` is at 498 lines (limit 500), and `AX_VanDistribution.jsx` is at 495 lines (limit 500). Implementing R1 and R2 requires clean modular decomposition into sub-components (`AX_AddVehicleModal.jsx`, `AX_VanStockLoadingModal.jsx`, `AX_VanSettlementModal.jsx`, `AX_VanCustodySummaryCard.jsx`, `vanDistributionHelpers.js`).

---

## 2. Existing Codebase Analysis

### 2.1 Distribution Module Current State
- **File**: `src/components/distribution/AX_VanDistribution.jsx` (495 lines)
- **Current Behavior**:
  - Lines 23-27: Attempts to find vans via `distributors.map(...)` or `warehouses.filter(w => w.type === 'van')`, with a fallback hardcoded van `'b0000000-0000-0000-0000-000000000010'`.
  - Lines 40-44 & 280-344 (`showLoadModal`): Legacy single-item cargo loading. Users pick one warehouse, one item from a dropdown, and an integer quantity. There is no category filtering, no card-based selection, and no fractional packaging breakdown.
  - Lines 68-99 (`handleRemitCash`): A simple remittance form that creates a `pendingCashTransfer` from the van cash account (`c0000000-0000-0000-0000-000000000005`) to one selected treasury.
  - Missing: Vehicle creation/editing, driver account association, card-based stock loading, fractional packaging breakdowns, split payment remittances, itemized driver operational expenses (fuel), and remaining inventory returns.

### 2.2 Warehouse & Inventory Stock Tracking
- **Warehouses**: Handled in `AX_OperationsService.js:175-237` and `useAXStore.js:275-321`.
  - Valid types: `'cold_store'`, `'raw_materials'`, `'processing'`, `'finished_goods'`, `'van'`.
  - Stored in `ax_warehouses` table (`id`, `name`, `type`, `manager`, `phone`).
- **Inventory Stock**: Handled in `ax_inventory_stock` (`warehouse_id`, `item_id`, `quantity`, `unit`, `opening_balance`).
  - Read into `useAXStore.inventoryStock` as `{ warehouseId, itemId, quantity, unit, openingBalance }`.
  - Any warehouse with `type === 'van'` can hold stock rows in `inventoryStock` keyed by `warehouseId: van.id`.
- **Transfers**:
  - `src/store/transferHelpers.js:15-125` (`executeImmediateTransfer`):
    - Atomically decrements source warehouse and increments destination warehouse in `updatedStock` and Supabase.
    - Handles audit discrepancy checks (`checkTransferAuditDiscrepancy`).
    - Works with multiple items per transfer.

### 2.3 Packaging Breakdown & Catalog Structure
- **Items Catalog Schema**:
  - Handled in `src/services/AX_DatabaseSync.js:61-86` and `ax_items` table:
    - `unitType` / `unit_type`: Main unit, standard `'كرتونة'` or `'كيلو'`.
    - `subUnitType` / `sub_unit_type`: Sub-unit type (`'قطعة'`, `'كيس'`, `'طبق'`).
    - `piecesPerCarton` / `pieces_per_carton`: Number of sub-units in one carton.
    - `weightPerCarton` / `weight_per_carton`: Gross weight in kg per carton.
    - `sellPrice`, `buyPrice`, `pieceSellPrice`, `pieceBuyPrice`.
- **Conversion Functions** (`src/utils/pricingCalculations.js`):
  - `getCartonEquivalent(quantity, unit, item)`:
    - If `unit` is `'قطعة'`, `'كيس'`, or `'طبق'`, returns `Number((quantity / piecesPerCarton).toFixed(4))`.
    - If `unit === 'كرتونة'`, returns `quantity`.
  - Verified by `tests/sales-subunit-piece-carton-conversion.test.js`:
    - 20 pieces of kofta (piecesPerCarton = 20) = 1.0 carton.
    - 10 pieces = 0.5 cartons.
    - 6 bags of burger (piecesPerCarton = 12) = 0.5 cartons.

### 2.4 Driver User Linkage & Sales Inventory Deduction
- **User Accounts & Staff**:
  - Handled in `ax_users_profiles`, `src/services/AX_StaffOperationsService.js:40-79`.
  - Column `branch_id`: Represents the assigned warehouse/branch for that employee.
  - On login (`src/components/auth/AX_LoginScreen.jsx:120`), `branchId` is placed in `profile.branchId`.
- **Sales Inventory Deduction**:
  - When an invoice is saved (`addInvoice`), `src/store/storeCacheHelper.js:14-140` executes `processInvoiceStoreState`:
    ```javascript
    const sIdx = updatedStock.findIndex((s) => s.warehouseId === inv.warehouseId && s.itemId === itId)
    const delta = isSaleReturn ? cartonQty : (isPurchaseReturn ? -cartonQty : (inv.type === 'sale' ? -cartonQty : cartonQty))
    if (sIdx >= 0) {
      updatedStock[sIdx] = { ...updatedStock[sIdx], quantity: (updatedStock[sIdx].quantity || 0) + delta }
    } else {
      updatedStock.push({ warehouseId: inv.warehouseId, itemId: itId, quantity: delta, unit: itemMeta?.unitType || 'كرتونة' })
    }
    ```
  - **Critical Finding**: As long as `inv.warehouseId` equals the vehicle's `id`, stock is deducted directly from that vehicle!
  - **Current Gap**: In `src/components/invoices/AX_CreateInvoiceModal.jsx:84`, `warehouseId` unconditionally defaults to `warehouses[0]?.id || ''`. It ignores `profile.branchId`. Modifying `AX_CreateInvoiceModal.jsx` to default to `profile.branchId` when the user is linked to a van enables automatic van stock deduction when drivers create sales invoices.

### 2.5 Treasury, Remittance & Expense Structures
- **Treasuries**:
  - `initialTreasuryAccounts` (`src/store/initialData.js:42-48`):
    - `c0000000-0000-0000-0000-000000000001`: الخزينة الرئيسية (الكاش المركزي) (`type: 'cash'`)
    - `c0000000-0000-0000-0000-000000000002`: الحساب البنكي (الأهلي المصري) (`type: 'bank'`)
    - `c0000000-0000-0000-0000-000000000003`: فودافون كاش الشركات (`type: 'wallet'`)
    - `c0000000-0000-0000-0000-000000000004`: إنستا باي التجاري (`type: 'instapay'`)
    - `c0000000-0000-0000-0000-000000000005`: عهدة سيارة التوزيع (الكاش الميداني) (`type: 'van_cash'`)
- **Cash Transfers**:
  - `confirmCashTransfer(id)` in `src/store/useAXStore.js:442-461`:
    - Atomically decrements `fromTreasuryId` and increments `toTreasuryId`.
    - Synced with Supabase `ax_cash_transfers`.
- **Itemized Expenses**:
  - `addCashTransaction(tx)` in `src/store/useAXStore.js:426-440`:
    - For `type: 'expense'`, decrements the selected `treasuryId` by `tx.amount`.
    - Supports `expenseMainCategoryId`, `expenseSubCategoryId`, `expenseSecondaryCategoryId`.
  - In `src/store/expenseCategoryHelpers.js:21-25`, relevant operational vehicle expense categories already exist:
    - `exp-sec-trn-fuel`: وقود وسولار سيارات التوزيع
    - `exp-sec-trn-porter`: مشالات وعتالة نقل وتنزيل
    - `exp-sec-trn-tolls`: رسوم طرق وكارتات ومواقف
    - `exp-sec-mnt-vans`: صيانة ميكانيكا سيارات التبريد

---

## 3. Technical Architecture for R1 (Vans & Stock Loading)

### 3.1 Data Model for Distribution Vehicles
Vehicles are modeled as `ax_warehouses` with `type: 'van'` and extended properties:
```typescript
interface DistributionVehicle {
  id: string; // UUID
  name: string; // e.g., "سيارة شيفروليه جامبو 1"
  type: 'van';
  plateNumber?: string; // رقم اللوحة, e.g. "أ ب ج 1234"
  model?: string; // طراز السيارة, e.g. "شيفروليه جامبو 2024"
  manager: string; // اسم المندوب / السائق المسؤول
  phone: string; // هاتف المندوب
  driverId?: string; // UUID of linked user in ax_users_profiles
  driverName?: string;
  treasuryId?: string; // Linked treasury custody (defaults to van_cash)
  status: 'active' | 'maintenance' | 'inactive';
}
```

Storage mechanism:
- Persisted to `ax_warehouses` table via `AX_OperationsService.addWarehouseInDB` and `editWarehouseInDB`.
- Additional fields (`plateNumber`, `driverId`, `model`, `treasuryId`) are serialized in local cache and local storage (`ax_cached_db_payload.warehouses`) with backward compatibility.
- Dedicated UI modal: `AX_AddVehicleModal.jsx` allowing quick vehicle creation with driver selection.

### 3.2 Linking Driver Accounts & Automatic Sales Deduction
1. **Driver Assignment**:
   - In `AX_AddVehicleModal.jsx` or vehicle settings, the admin selects the driver from `employees` / `usersProfiles`.
   - The driver's `branch_id` in `ax_users_profiles` is updated to match `vehicle.id`.
2. **Sales Invoice Defaulting**:
   - In `src/components/invoices/AX_CreateInvoiceModal.jsx`:
     ```javascript
     const userBranchId = profile?.branchId
     const isDriver = warehouses.find((w) => w.id === userBranchId)?.type === 'van'
     const initialWarehouseId = (userBranchId && warehouses.some((w) => w.id === userBranchId))
       ? userBranchId
       : warehouses[0]?.id || ''
     ```
   - When the logged-in driver creates a sale, `warehouseId` is preset to their assigned vehicle.
   - When the invoice is submitted, `processInvoiceStoreState` executes:
     `inv.warehouseId === vehicle.id` -> stock is decremented from `inventoryStock` for `vehicle.id`.
3. **Van Direct Sale**:
   - The sales button inside `AX_VanDistribution.jsx` records sales with `warehouseId: currentVan.id` and `treasuryId: currentVanCash.id`.

### 3.3 Card-Based Stock Loading UI (Replacing Legacy Cargo UI)
Component: `src/components/distribution/AX_VanStockLoadingModal.jsx`
Features:
- **Source Warehouse Selector**: Select from central/cold stores (filtering out vans).
- **Top Category Filter Bar**: Horizontal pill buttons for categories ('الكل', 'الكبده', 'لحوم', 'مصنعات', 'مجزءات', 'أسماك', 'خضروات', etc.).
- **Live Search**: Filter items by name or code.
- **Card-Based Grid (Bento Cards)**:
  - Each item card shows:
    - Item name & category badge.
    - Available stock at source warehouse in cartons & sub-units.
    - Packaging breakdown badge (e.g. `كرتونة = 20 قطعة` or `كرتونة سادة`).
    - Quantity controls: `-`, numeric input, `+`.
    - Unit toggle pills: `'كرتونة'` vs sub-unit (`'قطعة'`, `'كيس'`, `'طبق'`).
- **Fractional Entry & Packaging Breakdown**:
  - Supports decimal fractions (e.g. `0.5`, `1.5`, `2.25` cartons).
  - When entering sub-units (e.g. 10 pieces for a 20-piece carton), automatically displays carton equivalent (`0.5 كرتونة`).
- **Load Execution**:
  - Summary footer showing total items and total cartons loaded.
  - One-click confirmation invokes `executeImmediateTransfer` (`fromWarehouseId: sourceId, toWarehouseId: van.id, items: validItems`), updating both warehouses atomically.

---

## 4. Technical Architecture for R2 (Van Daily Settlement)

### 4.1 Settlement Workflow Structure
Component: `src/components/distribution/AX_VanSettlementModal.jsx`

The workflow contains three synchronized settlement pillars:
1. **Financial Settlement (Split Payment Channels)**
2. **Itemized Driver Operational Expenses**
3. **Remaining Stock Settlement (Retain vs Return)**

### 4.2 Multi-Line Itemized Driver Expenses
During their daily route, drivers incur operational expenses (fuel, tolls, porterage, mechanical repairs).
- In the settlement modal:
  - Dynamic expense item rows:
    - Expense Category (from `initialExpenseCategories`: fuel, tolls, porterage, maintenance, hospitality).
    - Amount (EGP).
    - Notes (e.g., "تفويل بنزين محطة شل طنطا").
    - Action to add multiple lines or remove rows.
  - Total operational expenses: `totalExpenses = sum(line.amount)`.
  - When confirmed, each line creates a cash transaction:
    ```javascript
    {
      id: generateUUID(),
      code: `EXP-${Date.now().toString().slice(-4)}`,
      type: 'expense',
      partyType: 'expense',
      partyName: `مصاريف سيارة: ${line.categoryName}`,
      amount: Number(line.amount),
      treasuryId: vanTreasuryId,
      date: settlementDate,
      notes: `تسوية يومية - ${currentVan.name}: ${line.notes}`,
      expenseSecondaryCategoryId: line.categoryId,
      expenseSecondaryCategoryName: line.categoryName
    }
    ```
  - This automatically deducts the expenses from the van's cash custody.

### 4.3 Split Payment Method Remittance
After deducting operational expenses from gross collected cash:
`netRemitAmount = Math.max(0, grossCustodyCash - totalExpenses)`

The driver/cashier remits this net amount into company channels:
- Multi-channel allocation:
  - Channel 1: `treasuryId` (e.g., "الخزينة الرئيسية - كاش"), `amount`
  - Channel 2: `treasuryId` (e.g., "الحساب البنكي - الأهلي المصري" or "إنستا باي"), `amount`
- Live validation:
  - Displays `allocatedTotal = sum(channel.amount)`.
  - Displays remaining unallocated or float retained in van.
- On confirmation, creates and confirms remittance transfers:
  ```javascript
  {
    id: generateUUID(),
    code: `REMIT-${Date.now().toString().slice(-4)}`,
    fromTreasuryId: vanTreasuryId,
    toTreasuryId: channel.treasuryId,
    amount: Number(channel.amount),
    status: 'confirmed',
    date: settlementDate,
    senderName: currentVan.manager,
    notes: `تصفية يومية وتوريد (${channel.treasuryName}) - ${currentVan.name}`
  }
  ```
  Updating treasury accounts in real time.

### 4.4 Remaining Stock Settlement (Retain vs Return)
Displays all items currently remaining on the vehicle custody inventory (`inventoryStock.filter(s => s.warehouseId === currentVan.id)`).
- **Option A: Retain on Vehicle ("إبقاء الرصيد بالسيارة")**:
  - Stock stays as custody on `van.id` for the next day's route.
- **Option B: Return to Warehouse ("إرجاع الرصيد للمخزن")**:
  - User chooses destination warehouse (e.g., central cold store).
  - Can return all or partial quantities.
  - Invokes `executeImmediateTransfer` with `fromWarehouseId: currentVan.id` and `toWarehouseId: targetWarehouseId`.
  - Van custody inventory is decremented to 0 (or remaining balance), and central warehouse inventory is replenished.

### 4.5 Settlement Receipt & Audit Log
- Creates a structured settlement summary record:
  ```javascript
  interface VanSettlementRecord {
    id: string;
    code: string; // e.g. "SETTLE-VAN-12345"
    vanId: string;
    vanName: string;
    driverName: string;
    date: string;
    grossCash: number;
    expenses: Array<{ categoryName: string; amount: number; notes: string }>;
    totalExpenses: number;
    netRemitted: number;
    splitPayments: Array<{ treasuryId: string; treasuryName: string; amount: number }>;
    stockAction: 'retained' | 'returned';
    returnedItemsCount?: number;
    createdAt: string;
  }
  ```
- Stored in `ax_van_settlements` (with fallback to local storage / `useAXStore`).
- Displays a clean paper-style summary receipt modal (`AX_VanSettlementReceiptModal.jsx`) with print capability.

---

## 5. Invariants & Risk Mitigation

| Invariant | Risk | Mitigation |
|---|---|---|
| **Max 500 lines per file** | `AX_VanDistribution.jsx` is at 495 lines; adding R1/R2 in one file breaks `tests/file-invariants.test.js`. | Decompose into sub-components under 350 lines each: `AX_AddVehicleModal.jsx`, `AX_VanStockLoadingModal.jsx`, `AX_VanSettlementModal.jsx`, `AX_VanCustodySummaryCard.jsx`, `vanDistributionHelpers.js`. |
| **Store Line Limit** | `useAXStore.js` is at 498 lines; adding new actions in `useAXStore.js` directly will exceed 500 lines. | Delegate operations to helper functions (`vanStoreHelpers.js`) and reuse existing generic store methods (`addWarehouse`, `addCashTransaction`, `confirmCashTransfer`, `addInvoice`, `executeImmediateTransfer`). |
| **No comments in code** | Constitution bans comments in production code. | Zero comments in any code files. All documentation belongs in reports and analysis. |
| **React Hook Order** | Violating hook rules triggers failures in `tests/hooks-integrity.test.js`. | Ensure all hooks (`useState`, `useEffect`, `useMemo`, `useBodyScrollLock`) are imported from `'react'` and called at the top of components before any conditional early returns. |
| **Full Canvas & Design Standards** | Violating Rule 0 design invariants (no `max-w-7xl` center container, pill buttons, soft colors, Cairo/Tajawal font). | Containers use `w-full px-3 sm:px-6 lg:px-8`, buttons are `rounded-full font-black`, 1:1 skeleton loaders, custom company date picker. |
| **Negative Stock & Pricing** | Fractional calculations might introduce floating-point inaccuracies. | Use `Number((val).toFixed(4))` consistently across carton equivalents as established in `tests/sales-subunit-piece-carton-conversion.test.js`. |

---

## 6. Implementation File Plan

### 6.1 New Files to Create:
1. `src/components/distribution/vanDistributionHelpers.js`
   - Calculation helpers for packaging breakdown display, fractional quantity parsing, settlement totals, and formatting.
2. `src/components/distribution/AX_AddVehicleModal.jsx`
   - Modal to add/manage distribution vehicles with plate number, driver linking, model, and custody treasury.
3. `src/components/distribution/AX_VanStockLoadingModal.jsx`
   - Card-based selection layout with category filters on top, fractional packaging breakdown inputs, and instant transfer loading.
4. `src/components/distribution/AX_VanSettlementModal.jsx`
   - End-of-day settlement modal with financial revenue split payments, itemized driver operational expenses, and stock retain/return options.
5. `src/components/distribution/AX_VanCustodySummaryCard.jsx`
   - Custody overview card displaying loaded inventory, packaging breakdowns, current cash custody, and action buttons.
6. `src/components/distribution/AX_VanSettlementReceiptModal.jsx`
   - Printable paper-style settlement receipt modal for daily reconciliation.
7. `tests/van-distribution-settlement.test.js`
   - Comprehensive unit and integration test suite covering vehicle management, card-based stock loading, fractional packaging breakdowns, driver sales deductions, split payment remittances, and itemized expense deductions.

### 6.2 Existing Files to Update:
1. `src/components/distribution/AX_VanDistribution.jsx`
   - Refactor to clean coordinator component (reducing from 495 lines to ~280 lines), incorporating vehicle management tabs/buttons, custody card, stock loading modal, and daily settlement modal.
2. `src/components/invoices/AX_CreateInvoiceModal.jsx`
   - Add minimal driver warehouse default logic (2-3 lines): if `profile?.branchId` matches a vehicle warehouse, default `warehouseId` to that vehicle so driver sales automatically deduct from the vehicle custody inventory.
3. `src/store/initialData.js`
   - Ensure default van warehouses and custody accounts are initialized cleanly.
