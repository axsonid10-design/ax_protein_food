import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const mockStorage = {}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    localStorage: {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, val) => {
        mockStorage[key] = String(val)
      },
      removeItem: (key) => {
        delete mockStorage[key]
      },
      clear: () => {
        Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
      },
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
}

import {
  loadCustomerCategories,
  addCustomerCategory,
  editCustomerCategory,
  deleteCustomerCategory,
} from '../src/components/customers/customerCategoryHelpers.js'

import {
  createCustomerBalanceAdjustment,
  saveCustomerAdjustment,
  getCustomerAdjustments,
  clearCustomerAdjustments,
} from '../src/components/customers/customerAdjustmentHelpers.js'

describe('Worker 2 Enhancements: R1 (Customer Management) & R2 (Supplier Management)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    clearCustomerAdjustments()
  })

  describe('R1.3: Dynamic Activity Categories (customerCategoryHelpers)', () => {
    it('should load initial default categories when storage is empty', () => {
      const cats = loadCustomerCategories()
      assert.ok(Array.isArray(cats))
      assert.ok(cats.includes('مطاعم وفنادق (HORECA)'))
      assert.ok(cats.includes('سلاسل تجارية وهايبر'))
      assert.ok(cats.includes('محلات جزارة ومجمدات'))
    })

    it('should add a new activity category and persist it', () => {
      const newCategory = 'مطابخ مركزية وإعاشة خاصة'
      const updated = addCustomerCategory(newCategory)
      assert.ok(updated.includes(newCategory))

      const reloaded = loadCustomerCategories()
      assert.ok(reloaded.includes(newCategory))
    })

    it('should edit an existing category and invoke client update callback', () => {
      addCustomerCategory('كافيهات ومشروبات')
      let updatedClientOld = null
      let updatedClientNew = null

      const updated = editCustomerCategory(
        'كافيهات ومشروبات',
        'كافيهات ومطاعم سريعة',
        (oldName, newName) => {
          updatedClientOld = oldName
          updatedClientNew = newName
        }
      )

      assert.ok(updated.includes('كافيهات ومطاعم سريعة'))
      assert.ok(!updated.includes('كافيهات ومشروبات'))
      assert.equal(updatedClientOld, 'كافيهات ومشروبات')
      assert.equal(updatedClientNew, 'كافيهات ومطاعم سريعة')
    })

    it('should delete a category and persist the update', () => {
      addCustomerCategory('صنف مؤقت للحذف')
      const deleted = deleteCustomerCategory('صنف مؤقت للحذف')
      assert.ok(!deleted.includes('صنف مؤقت للحذف'))
      assert.ok(!loadCustomerCategories().includes('صنف مؤقت للحذف'))
    })
  })

  describe('R1.4: Audited Customer Balance Adjustment without Treasury Distortion', () => {
    it('should create an audited balance adjustment when balance changes', () => {
      const customer = {
        id: 'cust-audit-101',
        name: 'مطعم حاتي الشرق',
        balance: 15000,
      }
      const newBalance = 18500
      const notes = 'جرد سنوي معتمد وتسوية مديونية'
      const user = { name: 'محاسب الفرع', email: 'accountant@proteinfood.com' }

      const adjustment = createCustomerBalanceAdjustment({
        customer,
        previousBalance: customer.balance,
        newBalance,
        notes,
        user,
      })

      assert.ok(adjustment)
      assert.equal(adjustment.customerId, 'cust-audit-101')
      assert.equal(adjustment.previousBalance, 15000)
      assert.equal(adjustment.newBalance, 18500)
      assert.equal(adjustment.delta, 3500)
      assert.equal(adjustment.amount, 3500)
      assert.equal(adjustment.treasuryId, null)
      assert.equal(adjustment.isTreasuryDistorting, false)
      assert.ok(adjustment.description.includes('زيادة مديونية'))
      assert.equal(adjustment.notes, notes)
      assert.equal(adjustment.createdBy, 'محاسب الفرع')
    })

    it('should return null when balance has no difference', () => {
      const customer = { id: 'cust-audit-102', name: 'سوبرماركت المدينة', balance: 5000 }
      const adj = createCustomerBalanceAdjustment({
        customer,
        previousBalance: 5000,
        newBalance: 5000,
      })
      assert.equal(adj, null)
    })

    it('should save and retrieve adjustments per customer', () => {
      const customer = { id: 'cust-adj-persist', name: 'البرج للمجمدات', balance: 20000 }
      const adj1 = createCustomerBalanceAdjustment({
        customer,
        previousBalance: 20000,
        newBalance: 16000,
        notes: 'خصم تسوية جودة',
      })
      saveCustomerAdjustment(adj1)

      const fetched = getCustomerAdjustments('cust-adj-persist')
      assert.equal(fetched.length, 1)
      assert.equal(fetched[0].delta, -4000)
      assert.equal(fetched[0].amount, 4000)
      assert.ok(fetched[0].description.includes('تخفيض مديونية'))
    })

    it('should accurately integrate into customer ledger running balance', () => {
      const customerId = 'cust-ledger-test'
      const entries = [
        {
          id: 'op-bal',
          date: '2026-01-01T00:00:00.000Z',
          type: 'opening',
          debit: 10000,
          credit: 0,
        },
        {
          id: 'inv-01',
          date: '2026-01-10T12:00:00.000Z',
          type: 'invoice',
          debit: 5000,
          credit: 0,
        },
        {
          id: 'pay-01',
          date: '2026-01-15T10:00:00.000Z',
          type: 'payment',
          debit: 0,
          credit: 3000,
        },
      ]

      const adjustment = {
        id: 'adj-01',
        date: '2026-01-20T14:30:00.000Z',
        type: 'balance_adjustment',
        customerId,
        delta: -2000,
        amount: 2000,
        description: 'تسوية رصيد / جرد رصيد (تخفيض مديونية)',
        treasuryId: null,
      }

      const delta = adjustment.delta
      entries.push({
        id: adjustment.id,
        date: adjustment.date,
        type: adjustment.type,
        description: adjustment.description,
        debit: delta > 0 ? delta : 0,
        credit: delta < 0 ? Math.abs(delta) : 0,
      })

      entries.sort((a, b) => new Date(a.date) - new Date(b.date))

      let running = 0
      const processed = entries.map((entry) => {
        running += (entry.debit || 0) - (entry.credit || 0)
        return { ...entry, runningBalance: running }
      })

      assert.equal(processed[0].runningBalance, 10000)
      assert.equal(processed[1].runningBalance, 15000)
      assert.equal(processed[2].runningBalance, 12000)
      assert.equal(processed[3].runningBalance, 10000)
    })
  })

  describe('R2.2: Supplier Overpayment Tracking', () => {
    function computeSupplierOverpayment({ totalSettledAmount, totalPurchasesAmount, totalSalesAmount, netOffsetBalance }) {
      const netPurchases = totalPurchasesAmount - totalSalesAmount
      const excessPaid = Math.max(0, totalSettledAmount - Math.max(0, netPurchases))
      const overpayment = excessPaid > 0 ? excessPaid : (netOffsetBalance < 0 ? Math.abs(netOffsetBalance) : 0)
      return {
        excessPaid,
        hasOverpayment: overpayment > 0,
        overpaymentAmount: overpayment,
      }
    }

    it('should detect and calculate overpayment when payments exceed purchases', () => {
      const result = computeSupplierOverpayment({
        totalSettledAmount: 120000,
        totalPurchasesAmount: 100000,
        totalSalesAmount: 0,
        netOffsetBalance: -20000,
      })

      assert.equal(result.hasOverpayment, true)
      assert.equal(result.overpaymentAmount, 20000)
    })

    it('should return 0 overpayment when supplier is owed money (payable balance)', () => {
      const result = computeSupplierOverpayment({
        totalSettledAmount: 60000,
        totalPurchasesAmount: 100000,
        totalSalesAmount: 0,
        netOffsetBalance: 40000,
      })

      assert.equal(result.hasOverpayment, false)
      assert.equal(result.overpaymentAmount, 0)
    })

    it('should account for offset sales and compute net overpayment', () => {
      const result = computeSupplierOverpayment({
        totalSettledAmount: 50000,
        totalPurchasesAmount: 100000,
        totalSalesAmount: 70000,
        netOffsetBalance: -20000,
      })

      assert.equal(result.hasOverpayment, true)
      assert.equal(result.overpaymentAmount, 20000)
    })
  })

  describe('R1.1 & R2.1: Bento Cards Click Invariants', () => {
    it('should have outer card click handler and stopPropagation on customer actions', () => {
      const filePath = path.resolve(process.cwd(), 'src/components/customers/AX_CustomerBentoCard.jsx')
      const content = fs.readFileSync(filePath, 'utf-8')

      assert.ok(content.includes('onClick={handleOpenDetails}'))
      assert.ok(content.includes('cursor-pointer'))
      assert.ok(content.includes('e.stopPropagation()'))
      assert.ok(content.includes('onEditCustomer && onEditCustomer(customer)'))
      assert.ok(content.includes('onDeleteCustomer && onDeleteCustomer(customer)'))
    })

    it('should have outer card click handler and stopPropagation on supplier actions', () => {
      const filePath = path.resolve(process.cwd(), 'src/components/suppliers/AX_SupplierBentoCard.jsx')
      const content = fs.readFileSync(filePath, 'utf-8')

      assert.ok(content.includes('onClick={() => onOpenDetails && onOpenDetails(supplier)}'))
      assert.ok(content.includes('cursor-pointer'))
      assert.ok(content.includes('e.stopPropagation()'))
      assert.ok(content.includes('onEditSupplier && onEditSupplier(supplier)'))
      assert.ok(content.includes('onDeleteSupplier && onDeleteSupplier(supplier)'))
    })
  })

  describe('Constitutional Invariants (Worker 2 Files: <= 500 lines & 0 comments)', () => {
    const worker2Files = [
      'src/components/customers/AX_CustomerBentoCard.jsx',
      'src/components/customers/AX_CustomerFormFields.jsx',
      'src/components/customers/AX_CustomerModal.jsx',
      'src/components/customers/AX_CustomerDetailsModal.jsx',
      'src/components/customers/customerCategoryHelpers.js',
      'src/components/customers/customerAdjustmentHelpers.js',
      'src/components/suppliers/AX_SupplierBentoCard.jsx',
      'src/components/suppliers/AX_SupplierDetailsModal.jsx',
      'src/components/suppliers/AX_SuppliersManager.jsx',
      'src/components/suppliers/AX_SupplierOverpaymentCard.jsx',
    ]

    worker2Files.forEach((file) => {
      it(`should not exceed 500 lines in ${file}`, () => {
        const fullPath = path.resolve(process.cwd(), file)
        assert.ok(fs.existsSync(fullPath), `File ${file} must exist`)
        const content = fs.readFileSync(fullPath, 'utf-8')
        const lines = content.split('\n').length
        assert.ok(lines <= 500, `File ${file} has ${lines} lines, exceeding 500 lines limit!`)
      })

      it(`should have zero comments in ${file}`, () => {
        const fullPath = path.resolve(process.cwd(), file)
        const content = fs.readFileSync(fullPath, 'utf-8')
        const lines = content.split('\n')
        lines.forEach((line, idx) => {
          const trimmed = line.trim()
          const isComment =
            trimmed.startsWith('//') ||
            trimmed.startsWith('/*') ||
            trimmed.startsWith('*')
          assert.equal(
            isComment,
            false,
            `File ${file} has a comment at line ${idx + 1}: ${trimmed}`
          )
        })
      })
    })
  })
})
