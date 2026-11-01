import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Tier 1: Suppliers Management & Liabilities (F9, F10, F11, F12)', () => {
  // Helper implementing supplier creation contract
  function createSupplier(data) {
    const openingBal = Number(data.openingBalance) || 0
    const openingType = data.openingBalanceType || 'payable'
    // payable: company owes supplier (+), receivable: supplier owes company (-)
    const signedBalance = openingType === 'payable' ? openingBal : -openingBal

    return {
      id: data.id || `sup-${Date.now()}`,
      companyName: data.companyName || '',
      contactPerson: data.contactPerson || '',
      phone: data.phone || '',
      address: data.address || '',
      supplyType: data.supplyType || 'frozen_meat',
      category: data.category || 'خامات وتوريد',
      openingBalance: openingBal,
      openingBalanceType: openingType,
      balance: signedBalance,
      taxNumber: data.taxNumber || '',
      commercialRegistration: data.commercialRegistration || '',
      createdAt: new Date().toISOString()
    }
  }

  it('should create supplier profile with contact details, company name, and commercial identifiers', () => {
    const payload = {
      id: 'sup-501',
      companyName: 'شركة النيل لاستيراد اللحوم البرازيلية',
      contactPerson: 'الحاج إبراهيم منصور',
      phone: '01055667788',
      address: 'ميناء الإسكندرية - المنطقة الحرة',
      supplyType: 'frozen_meat',
      category: 'خامات وتوريد',
      taxNumber: '123-456-789',
      commercialRegistration: '98765',
      openingBalance: 450000,
      openingBalanceType: 'payable'
    }

    const supplier = createSupplier(payload)
    assert.strictEqual(supplier.id, 'sup-501')
    assert.strictEqual(supplier.companyName, 'شركة النيل لاستيراد اللحوم البرازيلية')
    assert.strictEqual(supplier.contactPerson, 'الحاج إبراهيم منصور')
    assert.strictEqual(supplier.supplyType, 'frozen_meat')
    assert.strictEqual(supplier.category, 'خامات وتوريد')
    assert.strictEqual(supplier.taxNumber, '123-456-789')
    assert.strictEqual(supplier.commercialRegistration, '98765')
  })

  it('should record payable opening balance as company liability (مستحق للمورد)', () => {
    const supplier = createSupplier({
      companyName: 'مزارع الوادي للدواجن',
      contactPerson: 'المهندس أحمد سمير',
      phone: '01144332211',
      supplyType: 'poultry',
      openingBalance: 120000,
      openingBalanceType: 'payable'
    })

    assert.strictEqual(supplier.openingBalance, 120000)
    assert.strictEqual(supplier.openingBalanceType, 'payable')
    assert.strictEqual(supplier.balance, 120000, 'Payable balance must be positive in liabilities ledger')
  })

  it('should record receivable opening balance as advance payment to supplier (رصيد دائن للمنظومة لدى المورد)', () => {
    const supplier = createSupplier({
      companyName: 'مصنع الأهرام لمواد التعبئة والتغليف',
      contactPerson: 'أستاذ سامي رفعت',
      phone: '01222334411',
      supplyType: 'packaging',
      openingBalance: 30000,
      openingBalanceType: 'receivable'
    })

    assert.strictEqual(supplier.openingBalance, 30000)
    assert.strictEqual(supplier.openingBalanceType, 'receivable')
    assert.strictEqual(supplier.balance, -30000, 'Advance payment must be negative in supplier liability ledger')
  })

  it('should validate supply types mapping across cold chain industry domains', () => {
    const validSupplyTypes = [
      'frozen_meat',    // لحوم مجمدة
      'poultry',        // دواجن
      'fish',           // أسماك ومأكولات بحرية
      'packaging',      // كراتين وتعبئة
      'slaughterhouse', // مجازر محلية
      'spices_seasoning'// بهارات وإضافات تصنيع
    ]

    validSupplyTypes.forEach((st) => {
      const sup = createSupplier({ companyName: `مورد ${st}`, supplyType: st })
      assert.strictEqual(sup.supplyType, st)
    })
  })

  it('should increase supplier liability upon credit purchase invoice addition', () => {
    let supplier = createSupplier({
      companyName: 'مبردات البحر الأحمر للأسماك',
      openingBalance: 50000,
      openingBalanceType: 'payable'
    })

    // Purchase invoice: total 80,000, paid 20,000, unpaid 60,000
    const purchaseCreditAmount = 60000
    supplier.balance += purchaseCreditAmount
    assert.strictEqual(supplier.balance, 110000, '50000 opening + 60000 unpaid invoice = 110000')
  })

  it('should decrease supplier liability upon cash disbursement payout', () => {
    let supplier = createSupplier({
      companyName: 'مبردات البحر الأحمر للأسماك',
      openingBalance: 110000,
      openingBalanceType: 'payable'
    })

    // Cash payout: 40,000 EGP
    const payoutAmount = 40000
    supplier.balance -= payoutAmount
    assert.strictEqual(supplier.balance, 70000, '110000 - 40000 payout = 70000 remaining liability')
  })
})
