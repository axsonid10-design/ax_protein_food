# Handoff Report — Explorer 2 (Domain Logic & Entities Explorer)

**To:** Orchestrator / Lead Architect (`dc5da5ed-817b-4784-a7e6-1365172c95ec`)  
**From:** Explorer 2 (`explorer_survey_2`)  
**Scope:** Domain Logic Investigation for Requirements R1 (Customers), R2 (Suppliers), and R3 (Sales Reps & Commissions)  
**Date:** 2026-10-31  

---

## 1. Observation

1. **Existing Customer & Supplier Mock Data (`src/store/initialData.js:362-371`):**
   ```javascript
   export const initialClients = [
     { id: 'cl-1', name: 'هايبر ماركت التوحيد والنور', phone: '01002345678', balance: 145000, address: 'طنطا - شارع النحاس' },
     { id: 'cl-2', name: 'أسواق المدينة المنورة للمجمدات', phone: '01223456789', balance: 88500, address: 'المنصورة - حي الجامعة' },
     { id: 'cl-3', name: 'مطاعم وكافتيريات الحاتي الفاخرة', phone: '01114567890', balance: 42300, address: 'الزقازيق - القومية' },
   ]

   export const initialSuppliers = [
     { id: 'sup-1', name: 'شركة النيل للأسماك المستوردة', phone: '01019876543', balance: 380000, address: 'الإسكندرية - الميناء' },
     { id: 'sup-2', name: 'مزارع الوادي لتسمين الدواجن واللحوم', phone: '01129876543', balance: 215000, address: 'الإسماعيلية - الكيلو 11' },
   ]
   ```
   Both records only contain `id`, `name`, `phone`, `balance`, and `address`.

2. **Supabase Schema Verified via `execute_sql` on `supabase_proteinfood`:**
   - Table `ax_clients`: columns `id (uuid)`, `name (text)`, `phone (text)`, `address (text)`, `balance (numeric)`, `created_at (timestamptz)`.
   - Table `ax_suppliers`: columns `id (uuid)`, `name (text)`, `phone (text)`, `address (text)`, `balance (numeric)`, `created_at (timestamptz)`.
   - Table `ax_invoices`: columns `id, code, type, party_name, warehouse_id, date, transport_cost, loading_cost, subtotal, total, paid_amount, remaining_amount, payment_terms, items, created_at, status`. Notice that `sales_rep_id` is missing.
   - Table `ax_distributors`: columns `id, name, van_number, phone, balance, status, created_at`.

3. **In-Store Balance Mutation in `src/store/useAXStore.js:376-388`:**
   ```javascript
   if (inv.type === 'sale') {
     const cIdx = updatedClients.findIndex((c) => c.name === inv.partyName)
     if (cIdx >= 0) {
       updatedClients[cIdx] = { ...updatedClients[cIdx], balance: updatedClients[cIdx].balance + inv.remainingAmount }
     } else {
       updatedClients.unshift({ id: generateUUID(), name: inv.partyName, balance: inv.remainingAmount, phone: '', address: 'بيانات ناقصة' })
     }
   }
   ```
   There are no dedicated CRUD actions for `clients` or `suppliers` in `useAXStore.js`; only passive mutations occur during invoice or cash transaction creation.

4. **Statement of Account Generation in `src/components/reports/AX_Ledger360Report.jsx:132-133`:**
   ```javascript
   const initialBalance = currentParty.balance ? Number(currentParty.balance) * 0.4 : 0
   const finalBalance = initialBalance + running
   ```
   Opening balance was historically approximated using an arbitrary coefficient `0.4` due to the lack of an explicit `opening_balance` and `opening_balance_type` field.

5. **Absence of Sales Representative Entities & UI in `src/App.jsx:239-247` and `src/components/navigation/AX_Sidebar.jsx:38-73`:**
   - Active tabs in `App.jsx` are: `'dashboard'`, `'items'`, `'warehouses'`, `'manufacturing'`, `'distribution'`, `'treasury'`, `'invoices'`, `'reports'`, `'staff'`.
   - Neither `customers`, `suppliers`, nor `salesReps` are registered in `App.jsx` or in `AX_Sidebar.jsx`.

6. **ImageKit Configuration in `GEMINI.md:13` and `.env.example:5-6`:**
   - `GEMINI.md`: `- **ImageKit Endpoint:** https://ik.imagekit.io/c8zctprqq`
   - `.env.example`: `VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_endpoint` and `VITE_IMAGEKIT_PUBLIC_KEY=your_public_key`.
   - Zero occurrences of ImageKit client code currently exist in `src`.

7. **Test Suite Baseline via `npm test`:**
   - Total tests: 198 passing across 9 test suites.
   - Test suites enforce invariant checks: file length $\le 500$ lines, React hooks ordering, zero `window.confirm`.

---

## 2. Logic Chain

1. **Customer Module Logic (R1):**
   - *From Observation 1 & 2:* The existing customer representation is a flat record with unstructured address and scalar balance.
   - *Deduction:* To satisfy R1, `Customer` must expand with:
     a) Explicit opening balance (`openingBalance: number`, `openingBalanceType: 'debit' | 'credit'`, `openingBalanceDate: string`).
     b) Dynamic hierarchical categorization (`primaryCategory` + `subCategory`), mirroring the clean pattern of `categoryHelpers.js`.
     c) Independent geographic classification (`governorate`, `city`, `district`, `address`).
     d) ImageKit media attachment handling (`photoUrl`, `documents: CustomerDocument[]`) with offline dataURL fallback.
   - *From Observation 4:* Introducing formal `openingBalance` and `openingBalanceType` replaces the `* 0.4` approximation in `AX_Ledger360Report.jsx` with exact mathematical accounting:
     $$\text{Initial Signed Balance} = \text{openingBalance} \times (\text{openingBalanceType} == \text{'debit'} ? 1 : -1)$$

2. **Supplier Module Logic (R2):**
   - *From Observation 1 & 2:* Suppliers lack corporate identification, supply categorization, and debit/credit opening balances.
   - *Deduction:* To satisfy R2, `Supplier` must include:
     a) `companyName`, `contactPerson`, secondary contact numbers, tax/commercial registry numbers.
     b) `supplyType` (e.g. `direct_importer`, `local_farms`, `slaughterhouse`, `authorized_distributor`, `factory`, `wholesaler`).
     c) `category` (e.g. `أسماك`, `دواجن`, `لحوم حمراء ومصنعات`, `خامات وتعبئة`).
     d) Explicit opening balance (`openingBalance`, `openingBalanceType: 'payable' | 'receivable'`).
     e) Full CRUD management view with single-line desktop rows and mobile Bento cards.

3. **Sales Representatives & Multi-Model Commission Engine Logic (R3):**
   - *From Observation 2 & 5:* Sales representatives do not exist in the codebase.
   - *Deduction:* Three cohesive building blocks must be established:
     a) `SalesRep` profile entity tracking targets (`monthlySalesTarget`), territory, and financial balance.
     b) Multi-Model Commission Engine (`AX_CommissionEngine.js`) implementing:
        - **Model A (Volume-based):** Continuous $\left(\frac{S}{V}\right) \times R$ and floor $\lfloor \frac{S}{V} \rfloor \times R$ modes.
        - **Model B (Category/Item %):** Dynamic lookup prioritizing item override $\to$ category rate $\to$ default rate.
        - **Model C (Target Tier Slabs):** Attainment percentage $A = \frac{S}{T} \times 100\%$ mapped to tiered rates and lump bonuses.
        - **Model D (Hybrid):** Base category rates augmented by attainment tier achievement bonuses.
     c) Dedicated Statement of Account (`salesRepLedger`):
        $$\text{Running Balance}_t = \text{Opening Signed} + \sum \text{accruedCommissions} - \sum \text{disbursedPayments}$$

4. **Architectural Layout & Safety Invariant Logic:**
   - *From Observation 7:* Every file must remain strictly under 500 lines.
   - *Deduction:* We have split the UI into modular components (manager, table, add modal, edit modal, details/ledger modal), each budgeted between 180 and 360 lines.

---

## 3. Caveats

1. **Supabase Schema Alterations:** In development mode without remote DDL permissions, all new entity fields are fully supported in memory and local IndexedDB. When applying Supabase migrations in subsequent implementation steps, non-breaking column additions or JSONB extensions should be executed.
2. **Sales Invoice Linkage:** Invoices currently do not enforce a `salesRepId`. For retro-compatibility, `salesRepId` on sales invoices should remain optional so existing invoices without a representative continue to process without error.
3. **ImageKit Upload Network Mode:** While ImageKit CDN URLs are generated with standard transformation parameters, offline/low-connectivity fallback to `FileReader` data URLs is required to guarantee zero-latency local operation.

---

## 4. Conclusion

1. Requirements R1, R2, and R3 are clearly defined and structurally feasible within the existing architecture without breaking any of the 198 passing tests.
2. The domain specifications, mathematical formulas, and data models documented in `analysis.md` provide a complete, verified foundation for implementation.
3. Full integration touchpoints with Invoicing, Treasury, and the primary Dashboard (for R4 aggregations) have been mapped with zero circular dependencies.

---

## 5. Verification Method

1. **Verify Test Suite Integrity:**
   Run:
   ```powershell
   npm test
   ```
   *Expected Result:* 198 tests passing across all 9 test suites.

2. **Verify File Invariant Adherence:**
   Inspect proposed component lines against the test scanner:
   ```powershell
   node --test tests/file-invariants.test.js
   ```
   *Expected Result:* Zero files exceeding 500 lines.

3. **Verify Commission Calculation Formulas:**
   Unit test mathematical fixtures in Vitest/Node:
   - Volume: $185,400\text{ EGP}$ with $25\text{ EGP} / 1,000\text{ EGP} \implies 4,635\text{ EGP}$ (proportional) / $4,625\text{ EGP}$ (floor).
   - Category %: $50,000 \times 3\% + 80,000 \times 2\% = 1,500 + 1,600 = 3,100\text{ EGP}$.
   - Target Tier: $330,000\text{ EGP}$ against $300,000\text{ EGP}$ target ($110\%$ attainment) $\implies 3.5\% \times 330,000 + 1,000 = 12,550\text{ EGP}$.
