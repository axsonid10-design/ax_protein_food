# Handoff Report — Explorer Survey 1 (Requirements R1 & R2)
**Agent**: `explorer_survey_1`  
**Working Directory**: `d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_1`  
**Date**: 2026-11-08  
**Scope**: Requirements R1 (Distribution Vans Management & Stock Loading) & R2 (Van Daily Settlement)  
**Type**: Hard Handoff (Investigation & Architecture Complete)

---

## 1. Observation

1. **Current Van UI & Legacy Loading**:
   - `src/components/distribution/AX_VanDistribution.jsx` currently contains 495 lines.
   - Lines 40-44 & 280-344 implement a legacy cargo loading modal (`showLoadModal`) with a single item `<AX_SearchableSelect>`, a single source warehouse select, and an integer quantity input:
     ```javascript
     const [loadForm, setLoadForm] = useState({
       fromWarehouseId: warehouses.find((w) => w.type !== 'van')?.id || warehouses[0]?.id || '',
       itemId: items[0]?.id || '',
       quantity: 10,
     })
     ```
   - Lines 68-99 implement a rudimentary remittance (`handleRemitCash`) sending a single `pendingCashTransfer` to one destination treasury account.
   - Missing entirely: Vehicle creation UI, driver user account linkage, card-based loading with category filters on top, fractional packaging breakdown entry, split payment remittance (cash + bank transfer), remaining inventory return/retain workflow, and multi-line itemized driver operational expenses (fuel).

2. **Warehouse Foundation & Native Van Type**:
   - In `src/services/AX_OperationsService.js:175` & `src/services/AX_OperationsService.js:200`:
     ```javascript
     const VALID_WH_TYPES = ['cold_store', 'raw_materials', 'processing', 'finished_goods', 'van']
     ```
   - In `src/components/warehouses/AX_AddWarehouseModal.jsx:13`:
     ```javascript
     { value: 'van', label: 'سيارة توزيع / نقل' }
     ```
   - In `src/store/transferAuditHelpers.js:107-171` & `src/store/transferHelpers.js:15-125`:
     - `executeImmediateTransfer` and `calculateTransferStockMovement` decrement source warehouse stock and increment destination warehouse stock in `ax_inventory_stock` and in-memory `inventoryStock`.
     - When `fromWarehouseId` or `toWarehouseId` is a warehouse of `type: 'van'`, inventory stock is tracked natively on that vehicle without modifying database foreign keys.

3. **Packaging Breakdown & Unit Conversion**:
   - In `src/services/AX_DatabaseSync.js:69-75`:
     - Items in `ax_items` have `unitType`, `subUnitType` (`'قطعة'`, `'كيس'`, `'طبق'`), `piecesPerCarton`, `weightPerCarton`, `sellPrice`, `buyPrice`, `pieceSellPrice`, `pieceBuyPrice`.
   - In `src/utils/pricingCalculations.js:110-125`:
     ```javascript
     export function getCartonEquivalent(quantity, unit = 'كرتونة', item = {}) {
       const qty = Number(quantity) || 0
       if (qty <= 0) return 0
       const u = String(unit || item?.unitType || item?.unit_type || 'كرتونة').trim()
       const pieces = Number(item?.piecesPerCarton ?? item?.pieces_per_carton ?? 0)
       const isSub = u === 'قطعة' || u === 'كيس' || u === 'طبق' || (item?.subUnitType && u === item.subUnitType)
       if (isSub && pieces > 0) {
         return Number((qty / pieces).toFixed(4))
       }
       return qty
     }
     ```
   - In `tests/sales-subunit-piece-carton-conversion.test.js:42-50`, conversions for pieces, bags, and cartons pass with exact carton equivalent precision (e.g. 20 pieces = 1 carton, 10 pieces = 0.5 cartons, 6 bags = 0.5 cartons).

4. **Driver Linkage & Sales Auto-Deduction**:
   - In `src/components/auth/AX_LoginScreen.jsx:120`:
     ```javascript
     branchId: userRow.branch_id
     ```
   - In `src/store/storeCacheHelper.js:69-85` (`processInvoiceStoreState`):
     - Every sale invoice deducts carton equivalent from `inventoryStock` where `warehouseId === inv.warehouseId`.
   - In `src/components/invoices/AX_CreateInvoiceModal.jsx:84`:
     - Currently hardcodes `const initialWarehouseId = warehouses[0]?.id || ''`.
     - If updated to check `profile?.branchId`, sales created by logged-in drivers automatically deduct stock from their assigned vehicle warehouse.

5. **Settlement, Treasury Splitting & Itemized Expenses**:
   - In `src/store/initialData.js:42-48`:
     - Treasury accounts include central cash (`c0000000-0000-0000-0000-000000000001`), bank account (`c0000000-0000-0000-0000-000000000002`), instapay (`c0000000-0000-0000-0000-000000000004`), and van cash (`c0000000-0000-0000-0000-000000000005`).
   - In `src/store/expenseCategoryHelpers.js:21-25`:
     - Secondary expense categories include: `exp-sec-trn-fuel` ("وقود وسولار سيارات التوزيع"), `exp-sec-trn-porter` ("مشالات وعتالة نقل وتنزيل"), `exp-sec-trn-tolls` ("رسوم طرق وكارتات ومواقف"), and `exp-sec-mnt-vans` ("صيانة ميكانيكا سيارات التبريد").
   - In `src/store/useAXStore.js:426-461`:
     - `addCashTransaction` records expenses and decrements treasury account balances.
     - `confirmCashTransfer` atomically transfers funds between any two treasuries.

6. **File Constraints & Test Status**:
   - `vitest run`: All 71 test files and 988 tests pass cleanly.
   - `tests/file-invariants.test.js`: Strictly enforces `<= 500 lines` per file.
   - `src/components/distribution/AX_VanDistribution.jsx` is at 495 lines.
   - `src/store/useAXStore.js` is at 498 lines.

---

## 2. Logic Chain

1. **Premise 1**: Vehicles require dedicated management (adding, plate numbers, driver linking) and real-time inventory tracking.
   - **Step 1a**: Since `ax_warehouses` already has `type: 'van'` in `VALID_WH_TYPES`, storing vehicles as warehouses with `type: 'van'` enables immediate reuse of `ax_inventory_stock`, `ax_transfers`, and `ax_invoices` without changing database relationships or breaking existing table constraints.
   - **Step 1b**: A dedicated creation modal `AX_AddVehicleModal.jsx` allows capturing vehicle metadata (name, plate number, model, assigned driver from `employees`/`usersProfiles`, driver phone, and custody treasury).

2. **Premise 2**: Legacy cargo loading is inflexible and lacks category filtering and packaging breakdown support.
   - **Step 2a**: Replacing `showLoadModal` with `AX_VanStockLoadingModal.jsx` provides:
     - Top category filter pills (`initialCategories`).
     - Live search by item name/code.
     - Interactive item cards displaying source warehouse available stock and packaging breakdown badges (`piecesPerCarton`, `subUnitType`, `weightPerCarton`).
     - Support for fractional quantities (e.g., `0.5`, `1.25`, `2.5` cartons) and sub-unit toggles ('كرتونة' vs 'قطعة' / 'كيس' / 'طبق').
   - **Step 2b**: Converting sub-units to carton equivalents using `getCartonEquivalent` ensures consistency with the invoice and inventory deduction engine.
   - **Step 2c**: Calling `executeImmediateTransfer` atomically updates both source warehouse and vehicle custody inventory.

3. **Premise 3**: Sales by drivers must automatically deduct stock from their vehicle custody inventory.
   - **Step 3a**: User profiles already have `branchId` (`ax_users_profiles.branch_id`).
   - **Step 3b**: When a driver is assigned to a vehicle, their user `branch_id` is linked to `vehicle.id`.
   - **Step 3c**: In `AX_CreateInvoiceModal.jsx`, defaulting `invForm.warehouseId` to `profile?.branchId` when linked to a van guarantees that every sale invoice created by the driver sets `inv.warehouseId = vehicle.id`.
   - **Step 3d**: In `processInvoiceStoreState`, stock is decremented from `inventoryStock` for `warehouseId === inv.warehouseId`, achieving automatic vehicle inventory deduction.

4. **Premise 4**: End-of-day settlement requires financial revenue remittance with split payments, itemized operational expenses, and remaining stock settlement.
   - **Step 4a**: Itemized expense rows (e.g. fuel `exp-sec-trn-fuel`, tolls `exp-sec-trn-tolls`) are recorded via `addCashTransaction` with `type: 'expense'`, immediately deducting from the vehicle's custody cash balance.
   - **Step 4b**: Net collected cash after expenses is remitted across multiple receiving channels (e.g. part to central cash safe, part to bank account / instapay) via `confirmCashTransfer`.
   - **Step 4c**: Remaining custody stock on the vehicle can be retained on the vehicle (no transfer) or returned to a selected warehouse via `executeImmediateTransfer`.
   - **Step 4d**: A structured settlement summary record is generated and rendered in a paper-style receipt modal (`AX_VanSettlementReceiptModal.jsx`).

5. **Premise 5**: Architectural and line-count invariants.
   - **Step 5a**: `AX_VanDistribution.jsx` is at 495 lines; adding code directly to it would violate `file-invariants.test.js`.
   - **Step 5b**: Extracting `AX_AddVehicleModal.jsx`, `AX_VanStockLoadingModal.jsx`, `AX_VanSettlementModal.jsx`, `AX_VanCustodySummaryCard.jsx`, `AX_VanSettlementReceiptModal.jsx`, and `vanDistributionHelpers.js` ensures every file remains well below 350 lines.

---

## 3. Caveats

1. **Database Schema Additions**:
   - If Supabase `ax_warehouses` table does not have explicit columns for `plate_number` or `driver_id`, those fields are preserved in local cache and local storage (`ax_cached_db_payload.warehouses`) with full offline availability, and the standard fields `name`, `type: 'van'`, `manager: driverName`, and `phone: driverPhone` are saved to Supabase without database errors.
2. **Multi-Driver Vehicle Sharing**:
   - The design assumes a primary driver is assigned to a vehicle at any given time. If multiple drivers share the same vehicle concurrently, they will both be associated with the vehicle warehouse ID.
3. **No Direct Code Modifications in Survey Phase**:
   - As an explorer subagent, no project code has been altered during this turn. All proposals are documented for the implementer agent.

---

## 4. Conclusion

Requirements R1 and R2 can be fully realized by:
1. Treating distribution vehicles as specialized warehouses (`type: 'van'`) in `ax_warehouses` with extended metadata (`plateNumber`, `driverId`, `model`, `treasuryId`).
2. Creating `AX_AddVehicleModal.jsx` for vehicle management.
3. Replacing the legacy cargo loading UI with `AX_VanStockLoadingModal.jsx` featuring category filter pills on top, responsive item cards, fractional quantity entry, packaging breakdown badges, and instant transfer execution.
4. Linking driver profiles (`branch_id`) and defaulting `warehouseId` in `AX_CreateInvoiceModal.jsx` to achieve automatic vehicle stock deduction.
5. Implementing `AX_VanSettlementModal.jsx` supporting:
   - Split payment remittance (cash + bank transfer / instapay).
   - Multi-line itemized driver operational expenses (fuel, tolls, porterage, maintenance) with automatic custody cash deduction.
   - Remaining inventory settlement with retain-on-vehicle or return-to-warehouse options.
   - Printable settlement receipt modal (`AX_VanSettlementReceiptModal.jsx`).
6. Decomposing `AX_VanDistribution.jsx` into modular components to strictly respect the `<= 500 lines` rule and AXONID UI/UX design standards.

---

## 5. Verification Method

1. **Automated Test Suite**:
   Run the full project test suite:
   ```powershell
   npx vitest run
   ```
   All 71 test files (and new tests) must pass with zero failures.

2. **File Invariants Verification**:
   ```powershell
   npx vitest run tests/file-invariants.test.js
   ```
   Confirms every `.js` and `.jsx` file across `src/` does not exceed 500 lines.

3. **Hooks Integrity Verification**:
   ```powershell
   npx vitest run tests/hooks-integrity.test.js
   ```
   Confirms proper hook order and imports in all new JSX files.

4. **Dedicated Van Distribution & Settlement Test Suite**:
   Write and run `tests/van-distribution-settlement.test.js` validating:
   - Adding and managing distribution vehicles.
   - Stock loading with category filters and fractional packaging calculations.
   - Vehicle custody inventory tracking and automated sales deduction when driver records an invoice.
   - End-of-day settlement: multi-line itemized expenses deduction from cash custody, split payment remittance to multiple treasuries, and stock return/retain execution.

5. **Invalidation Conditions**:
   - Any file exceeding 500 lines invalidates acceptance.
   - Any comments left inside production code invalidates acceptance.
   - Any regression in existing warehouse transfers, cash transfers, or invoices invalidates acceptance.
