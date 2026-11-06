# Original User Request

## Approved Task Prompt — 2026-11-06T11:55:30Z

Investigate and resolve warehouse transfer execution, recovery, and inventory valuation synchronization, redesign the transfer item picker into collapsible category accordions with an immediate confirmation review modal, implement hybrid local-and-cloud drafts for stock audits and transfers, and enhance the stock audit workflow with catalog unit alignment, on-the-fly item creation/editing, and multi-unit conversions for the Protein Food production system.

Working directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS
Integrity mode: development

## Requirements

### R1. Warehouse Transfer Execution, Confirmation & Recovery
Investigate existing transfer records to recover and apply any pending or unapplied transfer from the main warehouse to the shop. When creating a transfer, provide a manual "Save as Draft" option, and upon clicking completion ("تم التحويل"), display a comprehensive review modal grouping all selected products under their respective categories with their quantities; upon clicking "Confirm Transfer" in this review modal, execute the transfer immediately so stock balances are deducted from the source warehouse and credited to the destination warehouse directly without requiring a separate later confirmation step.

### R2. Category Accordion Transfer Item Selection
Redesign the product selection interface in the warehouse transfer modal into collapsible category/department sections that start collapsed; opening any category allows picking items and specifying quantities smoothly. After selections are made, present the grouped summary review screen before final transfer confirmation.

### R3. Persistent Drafts System for Transfers & Stock Audits
Implement multi-draft support for both warehouse transfers and stock audits. Drafts must automatically save to local IndexedDB to survive page refreshes or accidental window closing, while synchronizing to Supabase so saved drafts can be listed, resumed, edited, or deleted from any device or session.

### R4. Stock Audit Unit Alignment & Quick Item Actions
Correct the stock audit display so each product's auditing unit strictly matches its defined catalog unit (resolving the issue where items such as "لحمة صدر الحمد" and "لحمة سن الحمد" show in kilograms instead of cartons). Provide one-click actions directly inside the stock audit modal to add a brand-new product or open the full product edit modal without leaving the audit screen.

### R5. Dynamic Multi-Unit Stock Counting
Support recording inventory counts in multiple packaging units (e.g., carton, kilogram, piece) directly on the fly within the stock audit interface, allowing users to specify unit conversion ratios (such as kilograms per carton) when calculating total inventory in the item's primary unit.

### R6. Warehouse Valuation & Multi-Device Inventory Sync
Investigate and resolve discrepancies in warehouse financial valuations (such as the "الدكان" shop displaying ~1,050,000 EGP on one device while showing different amounts on another). Standardize inventory valuation calculations to clearly distinguish cost-price valuation from selling-price valuation, and resolve client-side cache desynchronization so that stock figures and valuations synchronize in real time and match identically across all devices and users.

### R7. Verification & Architectural Invariants
All features, transfer inventory movements, draft storage/sync, multi-unit calculations, and warehouse valuation aggregations must be validated with comprehensive automated tests using the project's test suite. Every modified and newly created file must strictly adhere to project invariants, including the 500-line hard limit per file, no comments in code, and AXONID design standards.

## Acceptance Criteria

### Transfer Execution & Confirmation
- [ ] Past unapplied transfers (including the main warehouse to shop transfer) are investigated and can be applied or recovered.
- [ ] Warehouse transfer creation includes a "Save as Draft" action.
- [ ] Completing transfer selection displays a review modal grouping all selected items by category with quantities.
- [ ] Confirming the review modal immediately updates stock quantities (deducting from source, adding to destination) in a single operational flow.

### Transfer Item Selection UI
- [ ] Transfer product list organizes items into collapsible category accordions that open to allow item selection and quantity entry.
- [ ] Users can navigate back to modify selections or quantities from the review stage before confirming.

### Drafts Management
- [ ] Work-in-progress transfers and stock audits automatically persist in IndexedDB and restore seamlessly upon page refresh.
- [ ] Drafts synchronize with Supabase and appear in a selectable drafts list accessible across devices.
- [ ] Multiple drafts can be created, selected, resumed, and deleted independently for both transfers and audits.

### Stock Audit Workflow & Units
- [ ] Product audit units match catalog registration units exactly (specifically verifying "لحمة صدر الحمد" and "لحمة سن الحمد" display as cartons).
- [ ] Users can trigger the "Add Product" and "Edit Product" modals directly from within the stock audit interface.
- [ ] Users can enter audit counts across multiple units (carton, kg, piece) with configurable conversion ratios calculating total base units accurately.

### Warehouse Valuation & Cross-Device Sync
- [ ] Financial valuations for the "الدكان" warehouse accurately reflect actual inventory without stale cache skewing totals.
- [ ] Valuation views explicitly distinguish and accurately calculate cost valuation (سعر الشراء) and sales valuation (سعر البيع).
- [ ] Changes to stock quantities or valuations synchronize in real-time across devices, ensuring identical figures appear for all concurrent users.

### Automated Testing & Code Quality
- [ ] Automated tests verify transfer balance calculations, immediate confirmation execution, draft persistence, multi-unit conversion formulas, and valuation consistency.
- [ ] All project tests pass cleanly with zero failures.
- [ ] No file exceeds 500 lines (`tests/file-invariants.test.js` passes), zero comments in code, and custom AXONID components are utilized.
