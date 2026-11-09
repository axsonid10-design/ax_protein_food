# Original User Request

## Initial Request — 2026-11-09T02:00:51Z

Use the full team. Implement a 3-stage confirmation workflow for modifying the opening stock balance ("رصيد أول المدة") of items per warehouse in AX_PROTEIN_FOOD, with interactive browser verification and multi-engineer calculation audits.

Working directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS
Integrity mode: development

## Requirements

### R1. Multi-Stage Opening Stock Modification Workflow
Provide a feature to change the opening stock balance ("رصيد أول المدة") of any item across warehouses, accessible from the item card/details modal in the items directory (`src/components/items/`). The workflow must enforce a strict 3-stage confirmation sequence:
1. Clicking "تغيير رصيد أول المدة" triggers a first confirmation modal asking "هل أنت متأكد؟".
2. Confirming displays a warehouse view allowing selection of the target warehouse and entry of the new opening quantity (and unit).
3. Submitting the new quantity triggers a second confirmation modal asking "هل أنت متأكد؟".
4. A final confirmation action ("تأكيد أخير") applies the modification.
All confirmation modals and actions must conform to project invariants (`AX_ConfirmModal` and pill-shaped action buttons `rounded-full`).

### R2. Inventory Recalculation & Data Integrity
Updating the opening stock balance must update `ax_inventory_stock` for the specified `item_id` and `warehouse_id` and invoke `recalculateItemStock` (in `src/components/warehouses/itemMovementHelpers.js`). The update must recompute running balances accurately without creating duplicate movement records, corrupting historical transactions, or introducing accounting discrepancies.

### R3. Interactive Browser Verification & Clean State Restoration
Verify the complete workflow interactively using mouse actions in the browser via Chrome DevTools MCP on the local running server (http://localhost:8182). Select an existing item and warehouse, execute the multi-step opening balance modification, refresh the page in the browser to verify data persistence and balance calculations, and then cleanly restore the item's original opening stock balance so that no test data or modified balances remain in the system.

### R4. Multi-Engineer Calculation & Architectural Review
Subject all stock calculation routines, movement helper functions, and state updates to thorough review across multiple team members to ensure zero calculation skew and complete compliance with project invariants (file length <= 500 lines, zero code comments, no `window.confirm`).

## Acceptance Criteria

### Workflow & Confirmation Modals
- [ ] Clicking "تغيير رصيد أول المدة" in the item details view opens an initial confirmation modal asking "هل أنت متأكد؟".
- [ ] Confirming the initial prompt opens the warehouse selection and quantity entry view.
- [ ] Submitting the updated quantity opens a second confirmation modal asking "هل أنت متأكد؟".
- [ ] Clicking the final confirmation button ("تأكيد أخير") applies the updated opening balance.
- [ ] Modals use `AX_ConfirmModal` and buttons are styled with pill shapes (`rounded-full`).

### Calculation & Consistency
- [ ] Updating opening balance updates `ax_inventory_stock` and triggers recalculation via `recalculateItemStock`.
- [ ] Recalculated stock balances and movements reflect the new opening balance without duplicate entries or numerical drift.
- [ ] Reloading the browser page confirms that the modified balance persists and displays correctly across item and warehouse views.

### Interactive Browser Verification & Teardown
- [ ] The modification workflow is executed and verified via mouse clicks in the browser at http://localhost:8182.
- [ ] After browser verification, the tested item and warehouse opening balance is restored to its exact initial value.
- [ ] A post-verification audit confirms zero remaining test records, zero uncommitted modifications, and 100% calculation consistency across all inventory data.

### Architectural Standards
- [ ] Calculation logic and code changes pass multi-party review with zero errors.
- [ ] All modified and created files are <= 500 lines and contain zero comments in code.
