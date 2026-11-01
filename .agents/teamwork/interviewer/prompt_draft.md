Build and integrate the Customers, Suppliers, and Sales Representatives modules, enhance the Dashboard with custom pinned item stock drilldowns and financial liability metrics, and align the primary application theme to meat red/burgundy for the Protein Food operational system.

Working directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS
Integrity mode: development

## Requirements

### R1. Customers Management Module
A dedicated customers management section allowing full customer record creation and management.
- Supports comprehensive customer profiles including opening balance (debit/credit - receivables or payables).
- Supports dynamic multi-level hierarchical categories (primary category and sub-category) as well as independent geographic classification (governorate, city/center, district).
- Supports uploading and displaying customer images and documents integrated with ImageKit.

### R2. Suppliers Management Module
A dedicated suppliers management section allowing full supplier record creation and management.
- Captures supplier contact details, company name, supply type (نوع التوريد), and departmental/category classification.
- Tracks supplier opening balance (payables or receivables).
- Provides complete management operations and record maintenance for suppliers.

### R3. Sales Representatives & Commissions Module
A dedicated sales representatives page supporting sales rep profiles and commission tracking.
- Tracks representative profiles, assigned sales targets, and initial/current financial balances.
- Implements a flexible multi-model commission engine supporting volume-based rates (e.g. per fixed sales amount such as every 1,000 EGP), item/category-specific commission percentages, and target tier alignments.
- Generates a dedicated statement of account (ledger) for each representative showing accrued commissions, disbursed payments, and running net balance.

### R4. Dashboard Stock Drilldown & Financial Metrics
Enhance the primary dashboard with operational tracking tools:
- A user-configurable pinned inventory widget where users select specific items to monitor; selecting any pinned item opens a detailed breakdown showing available quantities per branch and warehouse.
- Real-time financial summary metrics tracking total customer debts (receivables), supplier liabilities (payables), sales representative balances, and sales target progress.

### R5. Brand Theme Color Alignment
Update the application's primary visual theme from blue to meat red / burgundy shades (`#991b1b` / `#b91c1c` and matching palette) consistent with the Protein Food logo and brand identity.

### R6. Verification & Automated Testing
The implementation must include automated component and integration tests (using Vitest) verifying customer/supplier CRUD and categorization, commission calculation correctness across defined models, and dashboard balance aggregations.

## Acceptance Criteria

### Customers & Suppliers
- [ ] Customers can be created, updated, and classified by two-level categories (primary and secondary) and geographic fields (city/center).
- [ ] Customer opening balances accurately reflect whether the customer owes money (debit) or is owed money (credit) and register in balance summaries.
- [ ] Customer photo attachments upload to ImageKit and display reliably on customer profiles.
- [ ] Suppliers can be created and managed with company name, supply type, category, and opening balance (payables/receivables).

### Sales Representatives & Commissions
- [ ] Sales representatives can be created with contact details, opening balances, and assigned sales targets.
- [ ] The commission engine accurately computes commissions based on: fixed amounts per sales volume, percentage per product/category, and target attainment.
- [ ] Each representative has an accessible statement of account displaying all commission earnings, payments, and net remaining balance.

### Dashboard & Analytics
- [ ] Users can configure and pin selected inventory items on the dashboard.
- [ ] Clicking any pinned inventory item opens a modal breakdown showing available quantities in each branch/warehouse individually.
- [ ] Dashboard metrics calculate and display accurate aggregate totals for: customer debts (receivables), supplier debts (payables), representative commission balances, and target achievements.

### Brand Appearance
- [ ] The primary theme colors across buttons, navigation elements, active states, and highlights are updated from blue to meat red/burgundy matching the brand logo.

### Automated Testing
- [ ] Automated test suite runs and passes with zero failures, covering customer/supplier balance calculations, commission logic, and dashboard inventory aggregation.
