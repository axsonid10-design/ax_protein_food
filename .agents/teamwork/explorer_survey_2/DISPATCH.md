## 2026-10-31T21:46:34Z
Sender: dc5da5ed-817b-4784-a7e6-1365172c95ec (parent)
Priority: MESSAGE_PRIORITY_HIGH

You are Explorer 2 (Domain Logic & Entities Explorer) for Project Survey.
Your working directory is: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_2\

MANDATORY FIRST STEP:
Read the verbatim user request at:
d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\ORIGINAL_REQUEST.md

Your Objective:
Conduct a thorough, read-only domain logic investigation of the codebase focusing on Requirements R1, R2, and R3:
1. Requirement R1: Customers Management Module
   - Customer profile data structures, opening balance tracking (debit/credit - receivables vs payables).
   - Dynamic multi-level hierarchical categories (primary category and sub-category).
   - Independent geographic classification (governorate, city/center, district).
   - ImageKit document and photo attachment uploading and rendering patterns.
2. Requirement R2: Suppliers Management Module
   - Supplier profile data structures, contact details, company name.
   - Supply type (نوع التوريد) and departmental/category classification.
   - Supplier opening balance tracking (payables vs receivables).
   - Full supplier management operations (CRUD, filtering, search).
3. Requirement R3: Sales Representatives & Commissions Module
   - Sales representative profiles, contact info, assigned sales targets, opening/running balances.
   - Flexible multi-model commission engine:
     a) Volume-based rates (e.g. per fixed sales volume like every 1,000 EGP).
     b) Item/category-specific commission percentages.
     c) Target tier alignments (attainment percentage bonuses/slabs).
   - Dedicated statement of account (ledger) data model and generation logic:
     accrued commissions, disbursed payments, running net balance.
4. Existing entities, stores, mock data, or database tables related to customers, suppliers, sales reps, sales, or invoices in the project.

Scope Boundaries:
- READ-ONLY investigation. You MUST NOT modify or create any source code, test, or data files.
- Write your metadata and report files ONLY within your working directory.

Outputs:
1. Write your detailed technical findings to:
   d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_2\analysis.md
2. Write your structured handoff to:
   d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_2\handoff.md
3. Send a brief message to parent via send_message with your handoff reference.

Completion Criteria:
- analysis.md and handoff.md are written with clear data schemas, mathematical formulations for the commission engine, ledger transaction models, and interface contracts.
