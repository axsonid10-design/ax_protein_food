# BRIEFING — 2026-10-31T21:47:00Z

## Mission
Conduct a thorough, read-only domain logic and entity investigation of the codebase for Requirements R1 (Customers), R2 (Suppliers), and R3 (Sales Reps & Commissions Engine), synthesizing existing patterns, data schemas, mathematical formulations, and ledger architecture.

## 🔒 My Identity
- Archetype: explorer
- Roles: Domain Logic & Entities Explorer, Synthesis Specialist
- Working directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\explorer_survey_2
- Original parent: dc5da5ed-817b-4784-a7e6-1365172c95ec
- Milestone: Project Survey & Architecture Blueprint

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Strictly read-only on codebase (no modifications to src, tests, or app data)
- Write metadata, analysis, and handoff exclusively within .agents/teamwork/explorer_survey_2/
- Deliver self-contained analysis.md and handoff.md with mathematical commission formulas, ledger schemas, and interface contracts

## Current Parent
- Conversation ID: dc5da5ed-817b-4784-a7e6-1365172c95ec
- Updated: not yet

## Investigation State
- **Explored paths**: `ORIGINAL_REQUEST.md`, `GEMINI.md`, `package.json`, `src/App.jsx`, `src/store/initialData.js`, `src/store/useAXStore.js`, `src/store/categoryHelpers.js`, `src/services/AX_OperationsService.js`, `src/services/AX_DatabaseSync.js`, `src/services/offlineDB.js`, `src/components/invoices/`, `src/components/reports/`, `src/components/treasury/`, `src/components/profile/`, Supabase tables via MCP (`ax_clients`, `ax_suppliers`, `ax_invoices`, `ax_distributors`)
- **Key findings**:
  * Customers and Suppliers exist only as primitive mock objects (`id, name, phone, address, balance`) without opening balance debit/credit types, categories, or geographic hierarchies.
  * Sales Representatives and Commission Engine are completely absent; distributors only exist as van drivers.
  * 198 tests are passing in 9 test suites; strict file length limit of 500 lines per file must be respected.
  * ImageKit endpoint `https://ik.imagekit.io/c8zctprqq` is defined in GEMINI.md but has no client utility in `src`.
- **Unexplored areas**: None for domain requirements R1, R2, R3; full analysis and handoff generated.

## Key Decisions Made
- Formulated exact mathematical equations for commission models A (volume), B (category/item %), C (target tier slabs), and D (hybrid).
- Established 3-tier geographic classification and dynamic category tree models for customers.
- Specified formal debit/credit signed opening balances for customers and suppliers to eliminate ad-hoc approximations.
- Designed component architecture keeping all new files under 400 lines (well within the 500-line invariant).

## Artifact Index
- `DISPATCH.md` — Incoming dispatch message
- `BRIEFING.md` — Agent operational memory
- `progress.md` — Liveness and step tracking
- `analysis.md` — Technical domain analysis and specifications
- `handoff.md` — Final structured handoff report
