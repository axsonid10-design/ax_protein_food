# BRIEFING — 2026-11-01T00:53:50Z

## Mission
Build and integrate Milestone 2: Customers Management Module (R1) with full profiles, debit/credit opening balances, 2-tier categorization, 3-tier geography, ImageKit attachments, 360° details modal, mobile Bento cards, desktop table, navigation integration, and unit tests.

## 🔒 My Identity
- Archetype: implementer / qa / specialist
- Roles: implementer, qa
- Working directory: d:\AXONID_PROJECTS\AX_FROZEN_FOODS\.agents\teamwork\m2_worker_2\
- Original parent: dc5da5ed-817b-4784-a7e6-1365172c95ec
- Milestone: Milestone 2: Customers Management Module

## 🔒 Key Constraints
- Pure syntax only, NO comments in code.
- Max lines per file: 500 lines (Hard limit).
- Dry technical Arabic only, zero marketing fluff.
- Zero empty side gutters (w-full full canvas).
- Modern pill buttons (rounded-full, font-bold).
- No spinners, 1:1 pulsing skeleton loader.
- No window.confirm (AX_ConfirmModal only).
- Debit (مدين - عليه مديونية) vs Credit (دائن - له رصيد مسبق).
- Dynamic 2-level categories (primary category and sub-category).
- Independent 3-tier geography (governorate, city/center, district, detailed address).
- Document and photo attachment via ImageKit (imageKitService.js).
- Genuine implementations only (DO NOT cheat, no fake/hardcoded mocks).
- Pass all unit tests (`npm test` / `npm run test:vitest`) and build (`npm run build`).

## Current Parent
- Conversation ID: dc5da5ed-817b-4784-a7e6-1365172c95ec
- Updated: 2026-11-01T00:53:50Z

## Task Summary
- **What to build**: Customers management module in `src/components/customers/` (`AX_CustomersManager.jsx`, `AX_CustomerModal.jsx`, `AX_CustomerDetailsModal.jsx`, `AX_CustomerBentoCard.jsx`, `AX_CustomersTable.jsx`, `AX_CustomerFormFields.jsx`, `AX_CustomerAttachments.jsx`, `customerConstants.js`), integrate into `src/components/navigation/AX_Sidebar.jsx`, `src/components/navigation/AX_MobileNavbar.jsx`, and `src/App.jsx`.
- **Success criteria**: Full CRUD, balance handling, category & geography, ImageKit attachment handling, responsive single-line table & mobile Bento cards, all tests passing, production build passing.
- **Interface contracts**: PROJECT.md, analysis.md, TEST_READY.md.
- **Code layout**: src/components/customers/

## Change Tracker
- **Files modified**:
  - `src/components/customers/customerConstants.js`: Governorates and 2-level category definitions
  - `src/components/customers/AX_CustomerAttachments.jsx`: ImageKit upload & preview
  - `src/components/customers/AX_CustomerBentoCard.jsx`: Mobile Bento card component
  - `src/components/customers/AX_CustomersBentoCards.jsx`: Bento cards container
  - `src/components/customers/AX_CustomersTable.jsx`: Single-line desktop rows table
  - `src/components/customers/AX_CustomerFormFields.jsx`: Modular input form segments
  - `src/components/customers/AX_CustomerModal.jsx`: Unified customer add/edit modal
  - `src/components/customers/AX_CustomerDetailsModal.jsx`: 360° customer profile modal & ledger
  - `src/components/customers/AX_CustomersManager.jsx`: Master customers manager view
  - `src/components/customers/AX_AddCustomerModal.jsx`: Backward-compatible wrapper
  - `src/components/customers/AX_EditCustomerModal.jsx`: Backward-compatible wrapper
  - `src/components/customers/AX_CustomerLedgerModal.jsx`: Backward-compatible wrapper
  - `src/services/AX_CustomerOperationsService.js`: Supabase CRUD & logging
  - `src/components/navigation/AX_Sidebar.jsx`: Added 'customers' tab item
  - `src/components/navigation/AX_MobileNavbar.jsx`: Added 'customers' tab item
  - `src/App.jsx`: Mounted AX_CustomersManager
  - `src/components/common/AX_Toast.jsx`: Exported showToast helper
  - `tests/m2-customers-integration.test.js`: Integration test suite
- **Build status**: Pass (`npm test`: 335 passed, `vitest`: 332 passed, `npm run build`: pass)
- **Pending issues**: None

## Quality Status
- **Build/test result**: 335/335 node tests passed, 332/332 vitest passed, Vite build passed
- **Lint status**: Clean
- **Tests added/modified**: `tests/m2-customers-integration.test.js`

## Loaded Skills
- None loaded directly

## Key Decisions Made
- Partitioned `AX_CustomerModal.jsx` into smaller modular subcomponents (`customerConstants.js`, `AX_CustomerAttachments.jsx`, `AX_CustomerFormFields.jsx`) to enforce the strict <= 500 lines invariant without sacrificing features.
- Single-line table rows for desktop (`h-12`) and Bento cards for mobile (`lg:hidden`).
- Separated debit vs credit opening balances cleanly with live status badges.
- Quick add support with incomplete data warning badge (`⚠️ بيانات ناقصة`).

## Artifact Index
- changes.md — record of code changes
- handoff.md — 5-component handoff report
- progress.md — liveness heartbeat
