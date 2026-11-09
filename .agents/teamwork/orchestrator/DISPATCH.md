# Dispatch History

## 2026-10-31T21:44:50Z
Sender: af7793ce-e1db-458c-9fc7-8aa004d475cb
Priority: MESSAGE_PRIORITY_HIGH

Build and integrate the Customers, Suppliers, and Sales Representatives modules, enhance the Dashboard with custom pinned item stock drilldowns and financial liability metrics, and align the primary application theme to meat red/burgundy for the Protein Food operational system.

Working directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS
Integrity mode: development

## Requirements
- R1. Customers Management Module
- R2. Suppliers Management Module
- R3. Sales Representatives & Commissions Module
- R4. Dashboard Stock Drilldown & Financial Metrics
- R5. Brand Theme Color Alignment
- R6. Verification & Automated Testing


## 2026-11-06T11:59:01Z
Sender: b0604580-9b11-4d49-bbed-8a701304e725
Priority: MESSAGE_PRIORITY_HIGH

Investigate and resolve warehouse transfer execution, recovery, and inventory valuation synchronization, redesign the transfer item picker into collapsible category accordions with an immediate confirmation review modal, implement hybrid local-and-cloud drafts for stock audits and transfers, and enhance the stock audit workflow with catalog unit alignment, on-the-fly item creation/editing, and multi-unit conversions for the Protein Food production system.

Working directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS
Integrity mode: development

## Requirements
- R1. Warehouse Transfer Execution, Confirmation & Recovery
- R2. Category Accordion Transfer Item Selection
- R3. Persistent Drafts System for Transfers & Stock Audits
- R4. Stock Audit Unit Alignment & Quick Item Actions
- R5. Dynamic Multi-Unit Stock Counting
- R6. Warehouse Valuation & Multi-Device Inventory Sync
- R7. Verification & Architectural Invariants


## 2026-11-08T21:47:41Z
Sender: ffe5849c-ffd5-4508-a987-6e6a6fe7a68d
Priority: MESSAGE_PRIORITY_HIGH

Implement distribution van management and daily settlement workflows, standalone multi-tier expense and cost-center accounting, and employee HR navigation, calculations, hold-to-delete confirmation, and expense advance tracking in the Protein Food ERP production system.

Working directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS
Integrity mode: development

## Requirements
- R1. Distribution Vans Management & Stock Loading
- R2. Van Daily Settlement (Financial, Stock & Expenses)
- R3. Standalone Expenses & Multi-Tier Cost Centers
- R4. HR Navigation & Mobile Responsive Layout
- R5. Hold-to-Delete Confirmation, Wage Calculations & Deductions
- R6. Employee Advances & Wage Settlements

## 2026-11-09T02:01:38Z
Sender: 5503c1f7-0527-4104-ac42-f82e3118dc62
Priority: MESSAGE_PRIORITY_HIGH

Use the full team. Implement a 3-stage confirmation workflow for modifying the opening stock balance ("رصيد أول المدة") of items per warehouse in AX_PROTEIN_FOOD, with interactive browser verification and multi-engineer calculation audits.

Working directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS
Integrity mode: development

## Requirements
- R1. Multi-Stage Opening Stock Modification Workflow
- R2. Inventory Recalculation & Data Integrity
- R3. Interactive Browser Verification & Clean State Restoration
- R4. Multi-Engineer Calculation & Architectural Review

## 2026-11-09T14:23:34Z
Sender: 68fd6901-c4ce-4e51-a816-288c09094b51
Priority: MESSAGE_PRIORITY_HIGH

Refactor and fix invoice creation timestamp formatting, date range filtering, dynamic stock deduction, FIFO cost and profit calculation, and expense registration forms in AX_PROTEIN_FOOD.

Working directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS
Integrity mode: development

## Requirements
- R1. Invoice Creation Timestamp & 12-Hour Format
- R2. Invoice Date Range & "Today" Filter
- R3. Dynamic Available Stock Indicator & Zero-Value Validation in Sales Invoices
- R4. Purchase Cost Tracking & Sales Profit Calculation (FIFO)
- R5. Expense Registration Form Simplification

## 2026-11-09T15:12:09Z
Sender: 68fd6901-c4ce-4e51-a816-288c09094b51
Priority: MESSAGE_PRIORITY_HIGH

Update from user to add to the roadmap:
The user has requested adding a dedicated, standalone module for Direct/Unlinked Returns (مرتجعات حرة ومباشرة بدون فاتورة سابقة سواء لعميل أو مورد):
- Direct sales return (مرتجع مبيعات حر بدون فاتورة): returns goods into the specified warehouse (increases stock), and either refunds cash from the selected treasury or deducts from the client's debit balance.
- Direct purchase return (مرتجع مشتريات حر بدون فاتورة): returns goods out of the specified warehouse (decreases stock), and either receives cash into the selected treasury or deducts from the supplier's balance.
- Standalone page: `AX_ReturnsManager.jsx` with tabs for Sales Returns and Purchase Returns, bento stats, printable A4/PNG receipt with 1-click WhatsApp share, and navigation integration.
- The user authorized immediate approval of the plan. Complete architectural specification is documented in `direct_returns_plan.md`. Please incorporate this as a planned milestone in the project roadmap.
