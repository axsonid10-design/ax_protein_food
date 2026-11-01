# TEST_INFRA.md — Automated E2E Testing Infrastructure
**Project:** AX_PROTEIN_FOOD (بروتين فود - لتجهيز وحفظ اللحوم المجمدة)  
**Track:** E2E Testing Track (Features F20 & F21)  
**Test Runner:** Vitest 5.0.5 + Node.js Native Test Runner (Dual Mode)  
**Environment:** Node / Browser-compatible headless execution  
**Date:** 2026-10-31  

---

## 1. Test Philosophy & Principles

### 1.1 Opaque-Box & Requirement-Driven
Testing is strictly decoupled from volatile internal UI implementation details. Tests validate interface contracts, business rules, mathematical precision, and state invariants specified in `PROJECT.md` and `ORIGINAL_REQUEST.md`:
- **Deterministic Oracles:** Expected outputs are derived strictly from authoritative specifications (e.g., commission formulas, double-entry ledger running balances, warehouse stock distribution algorithms).
- **Zero-Facade Guarantee:** Every test exercises real computational logic, schema constraints, and state transitions. No dummy assertion passes or mock facades are permitted.
- **Progressive Testability & Isolation:** Each test suite is self-contained and manages its own state fixtures without inter-test dependencies or execution-order assumptions.

### 1.2 The 4-Tier Test Methodology
The test suite is organized into four complementary analytical tiers:
1. **Tier 1: Feature Coverage (Happy Path & Interface Contracts)**
   Verifies that every core feature executes its primary functionality correctly according to specification (>=5 test cases per feature).
2. **Tier 2: Boundary & Corner Cases (Extreme Inputs & Limits)**
   Stresses numerical limits, zero balances, negative inputs, threshold boundaries, division-by-zero guards, and missing references (>=5 test cases per feature).
3. **Tier 3: Cross-Feature Combinations (Pairwise Operational Interactions)**
   Validates multi-entity workflows where actions in one domain cascade to another (e.g. sales invoice updating both customer receivable balance and sales representative commission ledger).
4. **Tier 4: Real-World Scenarios (End-to-End Operational Lifecycle)**
   Simulates end-to-end commercial operations in a meat processing and cold storage enterprise: meat cutting, bulk customer order delivery, payment receipt, and tiered commission attainment.

---

## 2. Test Architecture & Runner Configuration

### 2.1 Dual-Runner Compatibility
The test infrastructure supports both **Vitest** (modern ESM runner) and **Node.js Native Test Runner** (`node:test` + `node:assert/strict`) interchangeably with zero regressions:
- All test suites use standard ESM syntax with `node:test` and `node:assert/strict`.
- Vitest resolves `node:test` seamlessly via `tests/setup/node-test-shim.js` configured in `vitest.config.js`.
- Existing 198 architectural, hook integrity, and invariant tests run unmodified and pass with 100% success rate.

### 2.2 Runner Commands
```bash
# Run full suite via Vitest (Default modern runner)
npm run test:vitest
# or: npx vitest run

# Run full suite via Node Native Test Runner
npm test
# or: node --test tests/*.test.js
```

### 2.3 Runner Configuration (`vitest.config.js`)
```javascript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'node:test': path.resolve(__dirname, 'tests/setup/node-test-shim.js')
    }
  },
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 15000,
    include: ['tests/**/*.test.{js,jsx}']
  }
})
```

---

## 3. Feature Inventory Coverage Mapping

| Feature # | Feature Name | Test Suite File | Tier Level | Target Tests |
|---|---|---|---|---|
| **F4, F5, F6, F7, F8** | Customers Management & Balances | `tests/tier1-customers.test.js` | Tier 1 | >= 6 tests |
| **F9, F10, F11, F12** | Suppliers Management & Liabilities | `tests/tier1-suppliers.test.js` | Tier 1 | >= 6 tests |
| **F13, F14, F15, F16** | Sales Reps & Commission Models | `tests/tier1-sales-reps.test.js` | Tier 1 | >= 8 tests |
| **F17, F18** | Dashboard Pinned Stock & Drilldown | `tests/tier1-dashboard-drilldown.test.js` | Tier 1 | >= 6 tests |
| **F19** | Dashboard Financial Metrics | `tests/tier1-dashboard-financials.test.js` | Tier 1 | >= 6 tests |
| **F4–F19** | Boundary, Corner & Edge Cases | `tests/tier2-boundary-corner-cases.test.js` | Tier 2 | >= 12 tests |
| **F4–F19** | Cross-Feature Cascades | `tests/tier3-cross-feature-combinations.test.js` | Tier 3 | >= 6 tests |
| **F1–F19** | Real-World Commercial Lifecycle | `tests/tier4-real-world-scenarios.test.js` | Tier 4 | >= 4 scenarios |
| **F1, F20** | Theme Alignment & Invariants | `tests/tier5-theme-and-invariants.test.js` | Invariants | >= 6 tests |
| **Baseline** | PWA, Hooks, Transfers, Toast, Categories | `tests/*.test.js` (9 existing suites) | Regressions | 198 tests |

---

## 4. Quality Gates & Acceptance Verification

1. **Clean Run Guarantee:** All tests in both baseline and new tiers must exit with status `0` and zero failures.
2. **Speed & Efficiency:** The full suite must execute in under 10 seconds locally.
3. **No Mocks on Pure Logic:** Mathematical commission calculations, ledger balance aggregations, and stock percentages must use real formulas, not stubbed mocks.
4. **File Length Compliance:** All new test suite files must strictly comply with the AXONID 500-line limit per file invariant.
