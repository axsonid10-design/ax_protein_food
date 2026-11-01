# Domain Logic & Entities Technical Investigation Report
**Project:** Protein Food (بروتين فود - لتجهيز وحفظ اللحوم المجمدة)  
**Agent:** Explorer 2 (Domain Logic & Entities Explorer)  
**Date:** 2026-10-31  
**Status:** Completed  

---

## 1. Executive Summary & Existing Codebase Baseline

### 1.1 Architectural Context
Protein Food is a standalone Hybrid PWA built on React 18, Vite 6, Tailwind CSS, IndexedDB (`ax_frozen_foods_db`), Zustand 5 (`useAXStore`), and Supabase (`gwxumpjezcwxhpuicwfi`).
The test suite currently contains **198 passing tests** across 9 test suites enforcing strict architectural invariants, including:
- Hard file limit of **500 lines per file**.
- React Hooks ordering integrity (zero conditional early returns before hooks).
- Zero `window.confirm()` or native alerts (`AX_ConfirmModal` mandatory).
- Zero spinners (`AX_SkeletonLoader` 1:1 geometry pulsing loader mandatory).
- RTL-first UI using Cairo and Tajawal fonts.

### 1.2 Current State of Customers, Suppliers, and Sales Reps
1. **Customers (`clients` / `ax_clients`):**
   - Currently, `initialClients` in `src/store/initialData.js` contains 3 primitive records:
     `{ id, name, phone, balance, address }`.
   - In Supabase, the table `ax_clients` contains only 5 columns: `id (uuid)`, `name (text)`, `phone (text)`, `address (text)`, `balance (numeric)`, and `created_at`.
   - There is **no dedicated Customer Management UI** (tab or component) in `src/components`. Customers are only referenced passively in dropdowns (`AX_CreateInvoiceModal.jsx`, `AX_TreasuryLedger.jsx`, `AX_Ledger360Report.jsx`, `AX_AgingDebtsReport.jsx`).
   - When an invoice is created with an unregistered client, `useAXStore.addInvoice` unshifts a placeholder customer with address set to `'بيانات ناقصة'`.
   - **Gap for R1:** Lacks structured opening balances (debit/credit), multi-level hierarchical categorization, independent 3-tier geographic classification, ImageKit media/document attachments, and full CRUD screens.

2. **Suppliers (`suppliers` / `ax_suppliers`):**
   - In `initialData.js`, `initialSuppliers` contains 2 primitive records:
     `{ id, name, phone, balance, address }`.
   - In Supabase, `ax_suppliers` contains only: `id (uuid)`, `name (text)`, `phone (text)`, `address (text)`, `balance (numeric)`, and `created_at`.
   - There is **no dedicated Supplier Management UI**. Suppliers are referenced only in purchase invoice inputs and treasury payments.
   - **Gap for R2:** Lacks official company name, contact person details, supply type (`supply_type`), departmental classification, debit/credit opening balance tracking, and full CRUD operations.

3. **Sales Representatives & Commissions (`salesReps` / `commissions`):**
   - The codebase currently has **zero** data structures, stores, or UI for sales representatives.
   - `initialDistributors` exists exclusively for field van drivers (`{ id, name, vanNumber }`), but contains no commission schemes, sales targets, or statements of account.
   - Invoices currently do not associate a sales representative (`salesRepId` is missing from `ax_invoices` and `AX_CreateInvoiceModal`).
   - **Gap for R3:** Complete absence of sales rep profiles, multi-model commission computation engine (volume-based, category/item percentage, target tier slabs), and dedicated statement of account (ledger) generation.

---

## 2. Requirement R1: Customers Management Module Specification

### 2.1 Customer Entity Data Schema
```typescript
export interface Customer {
  id: string;                         // UUID v4
  code: string;                       // e.g. "CUST-1001"
  name: string;                       // e.g. "هايبر ماركت التوحيد والنور"
  commercialName?: string;            // اسم السجل التجاري / العلامة التجارية
  contactPerson?: string;             // مسؤول المشتريات / الاستلام
  phone: string;                      // رقم الهاتف الرئيسي (required)
  phone2?: string;                    // رقم الهاتف الإضافي
  email?: string;                     // البريد الإلكتروني
  
  // Categorization (Multi-level dynamic hierarchy)
  primaryCategory: string;            // e.g. "سلاسل تجارية وهايبر", "جملة ونصف جملة", "مطاعم وفنادق (HORECA)", "محلات مجمدات", "قطاعي"
  subCategory?: string;               // e.g. "فئة أ (كبار العملاء)", "وجبات سريعة", "محلات تجزئة"
  
  // Geographic Classification (Independent 3-tier hierarchy)
  governorate: string;                // e.g. "الغربية", "الدقهلية", "القاهرة", "الجيزة"
  city: string;                       // e.g. "طنطا", "المحلة الكبرى", "المنصورة"
  district?: string;                  // e.g. "حي النحاس", "شارع البحر", "حي الجامعة"
  address: string;                    // العنوان التفصيلي
  
  // Financial & Opening Balance Tracking
  openingBalance: number;             // الرصيد الافتتاحي (>= 0)
  openingBalanceType: 'debit' | 'credit'; 
  // 'debit'  = مدين (عليه فلوس للشركة - ذمم مدينة / Receivables)
  // 'credit' = دائن (له فلوس عند الشركة - دفعة مقدمة / Payables)
  openingBalanceDate: string;         // YYYY-MM-DD
  creditLimit?: number;               // سقف الائتمان الأقصى (ج.م)
  
  // Running Balance (Computed/Synchronized)
  balance: number;                    // صافي الرصيد الحالي
  
  // Media & Attachments (ImageKit)
  photoUrl?: string;                  // صورة واجهة المحل أو اللوجو
  documents?: CustomerDocument[];     // مستندات السجل والبطاقة الضريبية والعقود
  
  notes?: string;                     // ملاحظات عامة
  isActive: boolean;                  // نشط / موقوف
  createdAt: string;                  // ISO Timestamp
  updatedAt?: string;
}

export interface CustomerDocument {
  id: string;                         // UUID
  name: string;                       // اسم المستند (e.g. "سجل تجاري 2026")
  type: 'commercial_registry' | 'tax_card' | 'contract' | 'license' | 'other';
  url: string;                        // رابط ImageKit أو DataURL
  fileSize?: number;                  // حجم الملف بالبايت
  uploadedAt: string;                 // ISO Timestamp
}
```

### 2.2 Financial Opening Balance & Net Balance Formula
For any customer $C$:
$$\text{Opening Sign} = \begin{cases} +1 & \text{if } C.\text{openingBalanceType} == \text{'debit'} \text{ (Receivable)} \\ -1 & \text{if } C.\text{openingBalanceType} == \text{'credit'} \text{ (Advance Paid)} \end{cases}$$
$$\text{Signed Opening} = C.\text{openingBalance} \times \text{Opening Sign}$$
$$\text{Sales Invoices Total} = \sum_{\text{inv} \in \text{Sales}, \text{party} = C.\text{name}} \text{inv.total}$$
$$\text{Receipts & Payments} = \sum_{\text{tx} \in \text{Receipts}, \text{party} = C.\text{name}} \text{tx.amount} + \sum_{\text{inv} \in \text{Sales}} \text{inv.paidAmount}$$
$$\text{Net Running Balance} = \text{Signed Opening} + \text{Sales Invoices Total} - \text{Receipts \& Payments}$$

*Financial Interpretation:*
- $\text{Balance} > 0$: The customer owes money to Protein Food (ذمم مدينة - أصول متداولة).
- $\text{Balance} < 0$: The customer has an advance credit balance with Protein Food (دفعة مقدمة للعميل - التزام).
- $\text{Balance} = 0$: Settled account.

### 2.3 Dynamic Hierarchical Customer Categories
Categories are managed as a dynamic tree in store state (`customerCategories` and `customerSubCategories`):
- **Seed Categories:**
  1. `سلاسل تجارية وهايبر`: `['فئة أ (مساحات كبرى)', 'فئة ب (سلاسل ميني)']`
  2. `مطاعم وفنادق (HORECA)`: `['فنادق وقرى سياحية', 'مطاعم مشويات وتجهيز', 'مطاعم وجبات سريعة', 'مطابخ إعاشة']`
  3. `تجار جملة ونصف جملة`: `['وكلاء مراكز وتوزيع', 'تجار جملة قطاع لحوم']`
  4. `محلات وسوبر ماركت`: `['محلات لحوم ومجمدات متخصصة', 'سوبر ماركت ممتاز']`
  5. `قطاعي وتوصيل منزلي`: `['عملاء طلبات خاصة', 'منفذ بيع المصنع']`

### 2.4 Independent Geographic Classification Dictionary
Egyptian geographic data hierarchy for instant selection and filtering:
- **الغربية:** طنطا، المحلة الكبرى، زفتى، كفر الزيات، السنطة، بسيون، سمنود، قطور.
- **الدقهلية:** المنصورة، ميت غمر، السنبلاوين، طلخا، بلقاس، دكرنس، أجا.
- **القاهرة:** مدينة نصر، مصر الجديدة، المعادي، التجمع، وسط البلد، شبرا، حلوان.
- **الجيزة:** الدقي، المهندسين، الهرم، فيصل، 6 أكتوبر، الشيخ زايد، الحوامدية.
- **الإسكندرية:** سموحة، المنتزه، الرمل، ميامي، العجمي، محرم بك، برج العرب.
- **القليوبية:** بنها، شبرا الخيمة، قليوب، قها، طوخ، الخانكة.
- **الشرقية:** الزقازيق، العاشر من رمضان، بلبيس، فاقوس، منيا القمح.
- **كفر الشيخ:** كفر الشيخ، دسوق، فوه، مطوبس، بيلا، الحامول.
- **البحيرة:** دمنهور، كفر الدوار، إيتاي البارود، كوم حمادة.

### 2.5 ImageKit Upload & Rendering Architecture
- **CDN Configuration:**
  - Base Endpoint: `https://ik.imagekit.io/c8zctprqq` (from `GEMINI.md`).
- **Image URL Transformer Function:**
  ```javascript
  export function getImageKitUrl(pathOrUrl, transformations = {}) {
    if (!pathOrUrl) return '/logo-clean-original.png';
    if (pathOrUrl.startsWith('data:')) return pathOrUrl; // Offline local fallback
    
    const params = [];
    if (transformations.width) params.push(`w-${transformations.width}`);
    if (transformations.height) params.push(`h-${transformations.height}`);
    if (transformations.cropMode) params.push(`cm-${transformations.cropMode}`);
    if (transformations.quality) params.push(`q-${transformations.quality}`);
    else params.push('q-80');
    params.push('fo-auto');
    
    const trStr = `tr=${params.join(',')}`;
    return pathOrUrl.includes('?') ? `${pathOrUrl}&${trStr}` : `${pathOrUrl}?${trStr}`;
  }
  ```
- **File Ingest & Fallback Protocol:**
  - Validates file size ($\le 5\text{MB}$) and MIME types (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`).
  - Reads via `FileReader.readAsDataURL` for zero-latency client render and offline resilience.
  - Asynchronously uploads to ImageKit storage or Supabase Storage, updating the URL.

---

## 3. Requirement R2: Suppliers Management Module Specification

### 3.1 Supplier Entity Data Schema
```typescript
export interface Supplier {
  id: string;                         // UUID v4
  code: string;                       // e.g. "SUP-101"
  name: string;                       // اسم المورد / الشهرة التجارية (e.g. "شركة النيل للأسماك المستوردة")
  companyName: string;                // الاسم الرسمي للشركة / السجل التجاري
  contactPerson: string;              // مسؤول المبيعات والتوريد
  phone: string;                      // رقم الهاتف الرئيسي (required)
  phone2?: string;                    // رقم هاتف إضافي
  email?: string;                     // البريد الإلكتروني
  
  // Classification
  supplyType: 'direct_importer' | 'local_farms' | 'slaughterhouse' | 'authorized_distributor' | 'factory' | 'wholesaler';
  // نوع التوريد: "مستورد خارجي", "مزارع محلية", "مجازر ومذابح", "وكيل معتمد وموزع", "مصنع ومصنعات", "تاجر جملة"
  
  category: string; 
  // التصنيف / القسم: "أسماك ومأكولات بحرية", "دواجن ومجزءات", "لحوم حمراء ومصنعات", "مواد وخامات تعبئة وتغليف", "توابل ومستلزمات تصنيع", "معدات وصيانة تبريد"
  
  // Geography
  governorate?: string;
  city?: string;
  address: string;
  
  // Financial & Opening Balance Tracking
  openingBalance: number;             // الرصيد الافتتاحي (>= 0)
  openingBalanceType: 'payable' | 'receivable'; 
  // 'payable'    = دائن (له فلوس عند الشركة - التزامات موردين / Payables)
  // 'receivable' = مدين (عليه فلوس للشركة - دفعة مقدمة / Advance to Supplier)
  openingBalanceDate: string;         // YYYY-MM-DD
  
  // Running Balance (Computed/Synchronized)
  balance: number;                    // صافي الرصيد الحالي للمورد
  
  commercialRecord?: string;          // رقم السجل التجاري
  taxNumber?: string;                 // رقم البطاقة الضريبية
  notes?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}
```

### 3.2 Supplier Financial Opening Balance & Running Balance Formula
For any supplier $S$:
$$\text{Opening Sign} = \begin{cases} +1 & \text{if } S.\text{openingBalanceType} == \text{'payable'} \text{ (Liability)} \\ -1 & \text{if } S.\text{openingBalanceType} == \text{'receivable'} \text{ (Prepaid Advance)} \end{cases}$$
$$\text{Signed Opening} = S.\text{openingBalance} \times \text{Opening Sign}$$
$$\text{Purchase Invoices Total} = \sum_{\text{inv} \in \text{Purchase}, \text{party} = S.\text{name}} \text{inv.total}$$
$$\text{Disbursed Payments} = \sum_{\text{tx} \in \text{SupplierPayments}, \text{party} = S.\text{name}} \text{tx.amount} + \sum_{\text{inv} \in \text{Purchase}} \text{inv.paidAmount}$$
$$\text{Net Supplier Liability} = \text{Signed Opening} + \text{Purchase Invoices Total} - \text{Disbursed Payments}$$

*Financial Interpretation:*
- $\text{Balance} > 0$: Protein Food owes money to the supplier (التزام مالي / ذمم دائنة).
- $\text{Balance} < 0$: Protein Food paid an advance deposit to the supplier (دفعة مقدمة للمورد / أصل متداول).
- $\text{Balance} = 0$: Account balanced.

### 3.3 Supplier Management Operations (CRUD & Safeguards)
- **Search & Filtering:**
  - Multi-attribute text search (name, company name, phone, code).
  - Supply type filter pills (`مستورد خارجي`، `مزارع محلية`، `مجازر ومذابح`، `وكيل معتمد`، `مصنع`، `تاجر جملة`).
  - Department filter pills (`أسماك`، `دواجن`، `لحوم`، `تعبئة وتغليف`، `توابل`، `صيانة`).
  - Balance status tabs (`الكل`، `مديونية مستحقة له`، `مسدد صفر`، `دفعة مقدمة`).
- **Deletion Safety Gate:**
  - Deletion is guarded by `AX_ConfirmModal`.
  - Disallow deletion if the supplier has linked purchase invoices or an active non-zero balance; offer archive/deactivate toggle instead.

---

## 4. Requirement R3: Sales Representatives & Commissions Module Specification

### 4.1 Sales Representative Entity Schema
```typescript
export interface SalesRep {
  id: string;                         // UUID v4
  code: string;                       // e.g. "REP-101"
  name: string;                       // e.g. "أحمد فؤاد الشناوي"
  phone: string;                      // رقم الهاتف
  phone2?: string;
  nationalId?: string;                // الرقم القومي (14 رقم)
  territory: string;                  // المنطقة البيعية / خط السير (e.g. "طنطا والمحلة الكبرى")
  assignedWarehouseId?: string;       // الفرع أو المخزن المشرف عليه
  assignedVanId?: string;             // سيارة التوزيع المرتبطة إن وجدت
  
  // Sales Targets
  monthlySalesTarget: number;         // مستهدف المبيعات الشهري بالجنية (e.g. 500,000 ج.م)
  
  // Opening Balance & Financial Status
  openingBalance: number;             // الرصيد الافتتاحي (>= 0)
  openingBalanceType: 'due_to_rep' | 'advance_paid';
  // 'due_to_rep'    = عمولات مستحقة سابقة للمندوب (له فلوس عند الشركة / Credit)
  // 'advance_paid'  = سلفة أو عهدة مسحوبة على المندوب (عليه فلوس للشركة / Debit)
  openingBalanceDate: string;         // YYYY-MM-DD
  
  // Running Balance
  currentBalance: number;             // صافي الرصيد الحالي (مستحق له أو عليه)
  
  // Commission Engine Assignment
  commissionModel: 'volume_based' | 'item_category' | 'target_tier' | 'hybrid';
  commissionConfig: CommissionConfig;
  
  hireDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}
```

### 4.2 Multi-Model Commission Engine Mathematical Specifications

#### Commission Configuration Structure
```typescript
export interface CommissionConfig {
  // Model A: Volume-based parameters
  volumeRate?: {
    trancheVolume: number;            // e.g. 1,000 EGP
    ratePerTranche: number;           // e.g. 25 EGP
    mode: 'proportional' | 'floor';   // Proportional (default) vs Floor Tranches
  };
  
  // Model B: Item / Category percentages
  itemCategoryRates?: {
    defaultPercentage: number;        // e.g. 1.5%
    categoryPercentages: Record<string, number>; 
    // e.g. { 'مصنعات': 3.0, 'أسماك': 2.0, 'مجزءات': 2.5, 'لحوم': 2.0, 'خامات': 1.0 }
    itemPercentages?: Record<string, number>; 
    // e.g. { 'a0000000-0000-0000-0000-000000000003': 3.5 }
  };
  
  // Model C: Target tier alignments
  targetTierSlabs?: Array<{
    minAttainment: number;            // e.g. 0%
    maxAttainment: number;            // e.g. 70%
    commissionRate: number;           // e.g. 0.5%
    lumpBonus: number;                // e.g. 0 EGP
    label: string;                    // e.g. "دون التارجت"
  }>;
}
```

#### Detailed Mathematical Formulations

##### Model A: Volume-Based Rates (المعدل لكل حجم مبيعات)
Given total sales volume $S$ achieved by representative:
- **Proportional (Continuous) Mode:**
  $$C_{\text{volume}} = \left( \frac{S}{V_{\text{tranche}}} \right) \times R_{\text{tranche}} = S \times \left( \frac{R_{\text{tranche}}}{V_{\text{tranche}}} \right)$$
- **Floor (Discrete Tranches) Mode:**
  $$C_{\text{volume}} = \left\lfloor \frac{S}{V_{\text{tranche}}} \right\rfloor \times R_{\text{tranche}}$$
*Concrete Example:* $S = 185,400\text{ EGP}$, $V_{\text{tranche}} = 1,000\text{ EGP}$, $R_{\text{tranche}} = 25\text{ EGP}$:
- Proportional: $\frac{185,400}{1,000} \times 25 = 185.4 \times 25 = 4,635\text{ EGP}$.
- Floor: $\lfloor 185.4 \rfloor \times 25 = 185 \times 25 = 4,625\text{ EGP}$.

##### Model B: Item & Category Specific Commission Percentages (النسب المئوية حسب الصنف والقسم)
Given sales invoice line items $k = 1 \dots N$ with price $P_k$, quantity $Q_k$, line total $L_k = P_k \times Q_k$, item ID $\text{id}_k$, and primary category $\text{cat}_k$:
The effective rate $r(k)$ is resolved using strict cascading priority:
$$r(k) = \begin{cases} 
\text{itemPercentages}[\text{id}_k] & \text{if defined} \\
\text{categoryPercentages}[\text{cat}_k] & \text{else if defined} \\
\text{defaultPercentage} & \text{otherwise}
\end{cases}$$
The total commission is:
$$C_{\text{item\_cat}} = \sum_{k=1}^N \left( L_k \times \frac{r(k)}{100} \right)$$
*Concrete Example:*
- Invoice Line 1: Kofta (Category `مصنعات`, 3.0%): $50,000 \times 0.03 = 1,500\text{ EGP}$.
- Invoice Line 2: Japanese Fish (Category `أسماك`, 2.0%): $80,000 \times 0.02 = 1,600\text{ EGP}$.
- Invoice Line 3: Raw Chicken (Category `خامات`, 1.0%): $40,000 \times 0.01 = 400\text{ EGP}$.
Total = $1,500 + 1,600 + 400 = 3,500\text{ EGP}$.

##### Model C: Target Tier Alignments & Slabs (شرائح تحقيق التارجت والمكافآت)
Given representative monthly sales target $T$ and achieved sales $S$:
Attainment percentage $A$:
$$A = \begin{cases} \left( \frac{S}{T} \right) \times 100\% & \text{if } T > 0 \\ 0\% & \text{if } T = 0 \end{cases}$$
The attainment $A$ selects the tier slab $[\text{minAttainment}_j, \text{maxAttainment}_j)$:
| Tier | Attainment Range ($A$) | Rate ($r_{\text{tier}}$) | Lump Bonus ($B_{\text{tier}}$) | Title |
|:---|:---|:---|:---|:---|
| Slab 1 | $0\% \le A < 70\%$ | 0.5% | 0 EGP | دون التارجت (Penalty) |
| Slab 2 | $70\% \le A < 90\%$ | 1.5% | 0 EGP | أداء قياسي (Base) |
| Slab 3 | $90\% \le A < 100\%$ | 2.5% | 0 EGP | اقتراب من الهدف (Good) |
| Slab 4 | $100\% \le A < 120\%$ | 3.5% | 1,000 EGP | تحقيق الهدف (Achiever Bonus) |
| Slab 5 | $A \ge 120\%$ | 5.0% | 2,500 EGP | أداء استثنائي (Over-achiever Bonus) |

The commission formula is:
$$C_{\text{target\_tier}} = \left( S \times \frac{r_{\text{tier}}}{100} \right) + B_{\text{tier}}$$
*Concrete Example:* Target $T = 300,000\text{ EGP}$. Actual Sales $S = 330,000\text{ EGP}$.
$A = \frac{330,000}{300,000} \times 100\% = 110\%$.
Slab 4 applies ($r_{\text{tier}} = 3.5\%$, $B_{\text{tier}} = 1,000\text{ EGP}$):
$$C_{\text{target\_tier}} = (330,000 \times 0.035) + 1,000 = 11,550 + 1,000 = 12,550\text{ EGP}$$

##### Model D: Hybrid Formulation
Combines item/category base commission with attainment tier bonuses:
$$C_{\text{hybrid}} = C_{\text{item\_cat}} + B_{\text{tier}}(A)$$
or applies an attainment multiplier $M(A)$ to volume rates:
$$C_{\text{hybrid}} = C_{\text{volume}} \times M(A)$$

---

### 4.3 Statement of Account (Ledger) Specification for Sales Reps

#### Ledger Entry Schema
```typescript
export interface SalesRepLedgerEntry {
  id: string;                         // UUID v4
  repId: string;                      // المعرف الفريد للمندوب
  code: string;                       // e.g. "COM-2026-081" or "PAY-9102"
  date: string;                       // YYYY-MM-DD
  type: 'opening_balance' | 'commission_accrual' | 'disbursement_payment' | 'bonus' | 'deduction';
  
  // Financial movement
  accruedAmount: number;              // عمولة مستحقة للمندوب (Credit to rep: +)
  disbursedAmount: number;            // سداد نقدي أو سلفة مصروفة (Debit to rep: -)
  runningBalance: number;             // الرصيد التراكمي بعد هذه الحركة
  
  // Operational references
  invoiceId?: string;                 // فاتورة المبيعات المرتبطة إن وجدت
  invoiceCode?: string;               // كود الفاتورة
  salesVolume?: number;               // حجم المبيعات المرتبط بالعمولة
  commissionModelUsed?: string;       // نموذج العمولة المطبق
  rateApplied?: string;               // النسبة المطبقة (e.g. "3.5%" or "25 EGP / 1000")
  
  treasuryId?: string;                // الخزينة المصروف منها
  treasuryName?: string;              // اسم الخزينة
  
  notes: string;                      // بيان الحركة
  createdAt: string;
}
```

#### Running Net Balance Invariant Theorem
Let $E_1, E_2, \dots, E_m$ be the ledger entries ordered chronologically by `date`.
For $t = 1 \dots m$:
$$\Delta_t = E_t.\text{accruedAmount} - E_t.\text{disbursedAmount}$$
$$\text{RunningBalance}_t = \text{RunningBalance}_{t-1} + \Delta_t$$
where $\text{RunningBalance}_0 = \text{Signed Opening Balance}$.

*Financial Direction:*
- Positive Balance ($> 0$): Company liability (مستحق للمندوب طرف الشركة).
- Negative Balance ($< 0$): Company receivable (سلفة / عهدة مستحقة على المندوب).
- Zero Balance ($= 0$): Fully reconciled.

---

## 5. Integration Architecture & Contracts

### 5.1 Store Modifications (`useAXStore.js`)
The Zustand store needs to expose cohesive domain slices for customers, suppliers, and sales reps:
```javascript
// Customers Slice
customers: initialClients,
addCustomer: (customer) => { ... },
editCustomer: (customer) => { ... },
deleteCustomer: (customerId) => { ... },

// Suppliers Slice
suppliers: initialSuppliers,
addSupplier: (supplier) => { ... },
editSupplier: (supplier) => { ... },
deleteSupplier: (supplierId) => { ... },

// Sales Reps Slice
salesReps: initialSalesReps,
addSalesRep: (rep) => { ... },
editSalesRep: (rep) => { ... },
deleteSalesRep: (repId) => { ... },

// Rep Ledger & Commission Settlement Slice
salesRepLedgers: initialSalesRepLedgers,
addCommissionAccrual: (entry) => { ... },
disburseRepPayment: (paymentPayload) => { ... },
```

### 5.2 Invoice Creation Contract Modification (`AX_CreateInvoiceModal.jsx`)
In `AX_CreateInvoiceModal`:
- Add Sales Rep selection dropdown (`salesRepId`) when `invForm.type === 'sale'`.
- When a sales invoice is created:
  - If a sales rep is selected, invoke `calculateCommission(rep, invoice)` via the Commission Engine.
  - Automatically append a `commission_accrual` entry to `salesRepLedger`.
  - Update `salesRep.currentBalance += accruedCommission`.

### 5.3 Treasury Integration Contract (`AX_TreasuryLedger.jsx`)
In `AX_TreasuryLedger`:
- Expand `partyType` options in `txForm` to include `'sales_rep'`.
- When paying out commissions or advances to a representative:
  - Debit selected Treasury account (`treasury.balance -= amount`).
  - Credit Cash Transactions (`type: 'rep_disbursement'`).
  - Append a `disbursement_payment` entry to the sales rep's ledger (`disbursedAmount = amount`).
  - Update `salesRep.currentBalance -= amount`.

### 5.4 Dashboard Linkage Contract (Requirement R4 Synchronization)
The enhanced Dashboard metrics can compute aggregates directly from the updated stores without any fake metrics:
- **Total Customer Receivables:**
  $$\sum_{c \in \text{customers}} \max(0, c.\text{balance})$$
- **Total Supplier Liabilities:**
  $$\sum_{s \in \text{suppliers}} \max(0, s.\text{balance})$$
- **Total Sales Rep Balances:**
  $$\sum_{r \in \text{salesReps}} \max(0, r.\text{currentBalance})$$
- **Overall Target Attainment:**
  $$\frac{\sum_{r \in \text{salesReps}} r.\text{actualSales}}{\sum_{r \in \text{salesReps}} r.\text{monthlySalesTarget}} \times 100\%$$

---

## 6. Layout & File Hierarchy Strategy (Adhering to 500-Line Limit)
To strictly uphold Constitution File Invariant **Rule #7 (Max 500 lines per file)**, components must be segmented into focused, cohesive units:

```
src/
├── components/
│   ├── customers/
│   │   ├── AX_CustomersManager.jsx          (~320 lines) - Master view, stats, search & filter pills, pagination
│   │   ├── AX_CustomerTable.jsx             (~220 lines) - Single-line desktop rows + Mobile Bento cards
│   │   ├── AX_AddCustomerModal.jsx          (~340 lines) - Multi-tab create form (General, Geo, Opening Balance, Media)
│   │   ├── AX_EditCustomerModal.jsx         (~310 lines) - Edit form
│   │   └── AX_CustomerDetailsModal.jsx      (~280 lines) - 360 view, docs preview, ledger shortcut
│   ├── suppliers/
│   │   ├── AX_SuppliersManager.jsx          (~300 lines) - Master view, stats, supply type filter pills
│   │   ├── AX_SupplierTable.jsx             (~210 lines) - Desktop table + Mobile Bento cards
│   │   ├── AX_AddSupplierModal.jsx          (~310 lines) - Add supplier form with supply type & category
│   │   ├── AX_EditSupplierModal.jsx         (~290 lines) - Edit supplier form
│   │   └── AX_SupplierDetailsModal.jsx      (~240 lines) - Supplier profile & purchase summary
│   ├── salesReps/
│   │   ├── AX_SalesRepsManager.jsx          (~310 lines) - Master view, target progress bars, stats
│   │   ├── AX_SalesRepTable.jsx             (~230 lines) - Single-line desktop rows + Mobile cards
│   │   ├── AX_AddSalesRepModal.jsx          (~340 lines) - Multi-model commission config builder
│   │   ├── AX_EditSalesRepModal.jsx         (~300 lines) - Edit profile and target
│   │   ├── AX_SalesRepLedgerModal.jsx       (~360 lines) - Statement of account, statement PDF/CSV export
│   │   └── AX_DisburseRepPaymentModal.jsx   (~220 lines) - Quick treasury payout modal
│   └── common/
│       └── AX_ImageKitUploader.jsx          (~180 lines) - Reusable drag-and-drop ImageKit file & photo uploader
├── services/
│   ├── AX_CustomerOperationsService.js      (~180 lines) - Customer DB/IndexedDB sync
│   ├── AX_SupplierOperationsService.js      (~160 lines) - Supplier DB/IndexedDB sync
│   ├── AX_SalesRepOperationsService.js      (~190 lines) - Rep & Ledger DB sync
│   └── AX_CommissionEngine.js               (~190 lines) - Pure functional mathematical calculation engine
```

Every proposed file is deliberately budgeted well below 400 lines to ensure zero risk of exceeding the 500-line constitutional barrier.
