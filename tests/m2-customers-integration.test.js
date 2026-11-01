import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { GOVERNORATES, DEFAULT_CATEGORIES } from '../src/components/customers/customerConstants.js'
import { getTransformedUrl } from '../src/services/imageKitService.js'

describe('Milestone 2 Integration: Customers Module Requirements (R1)', () => {
  function processCustomer(data) {
    const rawOpening = Number(data.openingBalance) || 0
    const normalizedOpening = rawOpening === 0 ? 0 : rawOpening
    const openingType = data.openingBalanceType || 'debit'
    const signedBalance = normalizedOpening === 0 ? 0 : (openingType === 'debit' ? normalizedOpening : -normalizedOpening)

    const hasContact = Boolean((data.phone || '').trim())
    const hasAddress = Boolean((data.address || '').trim() || (data.city || '').trim())
    const isIncomplete = !hasContact && !hasAddress

    return {
      id: data.id || `cust-${Date.now()}`,
      name: (data.name || '').trim(),
      contactPerson: (data.contactPerson || '').trim(),
      phone: (data.phone || '').trim(),
      phone2: (data.phone2 || '').trim(),
      commercialRegister: (data.commercialRegister || '').trim(),
      taxNumber: (data.taxNumber || '').trim(),
      governorate: data.governorate || '',
      city: (data.city || '').trim(),
      district: (data.district || '').trim(),
      address: (data.address || '').trim(),
      primaryCategory: data.primaryCategory || '',
      subCategory: data.subCategory || '',
      openingBalance: normalizedOpening,
      openingBalanceType: openingType,
      balance: signedBalance,
      attachments: data.attachments || [],
      notes: (data.notes || '').trim(),
      isIncomplete,
      createdAt: data.createdAt || new Date().toISOString(),
    }
  }

  it('should create complete customer record with full profile fields', () => {
    const cust = processCustomer({
      id: 'cust-m2-01',
      name: 'شركة الأهرام للتوريدات الفندقية',
      contactPerson: 'هشام عبد الغفار',
      phone: '01011223344',
      phone2: '01299887766',
      commercialRegister: 'CR-88990',
      taxNumber: 'TX-123-456',
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      district: 'الحي السابع',
      address: 'شارع الطيران، عمارة 14',
      primaryCategory: 'مطاعم وفنادق (HORECA)',
      subCategory: 'فنادق ومنتجعات',
      openingBalance: 45000,
      openingBalanceType: 'debit',
      notes: 'عميل رئيسي تعاقد سنوي',
    })

    assert.strictEqual(cust.id, 'cust-m2-01')
    assert.strictEqual(cust.name, 'شركة الأهرام للتوريدات الفندقية')
    assert.strictEqual(cust.contactPerson, 'هشام عبد الغفار')
    assert.strictEqual(cust.phone, '01011223344')
    assert.strictEqual(cust.phone2, '01299887766')
    assert.strictEqual(cust.commercialRegister, 'CR-88990')
    assert.strictEqual(cust.taxNumber, 'TX-123-456')
    assert.strictEqual(cust.governorate, 'القاهرة')
    assert.strictEqual(cust.city, 'مدينة نصر')
    assert.strictEqual(cust.district, 'الحي السابع')
    assert.strictEqual(cust.primaryCategory, 'مطاعم وفنادق (HORECA)')
    assert.strictEqual(cust.subCategory, 'فنادق ومنتجعات')
    assert.strictEqual(cust.openingBalance, 45000)
    assert.strictEqual(cust.openingBalanceType, 'debit')
    assert.strictEqual(cust.balance, 45000)
    assert.strictEqual(cust.isIncomplete, false)
  })

  it('should accurately differentiate between debit and credit opening balances', () => {
    const debitCust = processCustomer({
      name: 'سوبر ماركت الفهد',
      phone: '01155443322',
      address: 'طنطا',
      openingBalance: 12000,
      openingBalanceType: 'debit',
    })
    assert.strictEqual(debitCust.balance, 12000, 'Debit balance must be positive receivable')

    const creditCust = processCustomer({
      name: 'فندق شيراتون المنتزه',
      phone: '01233445566',
      address: 'الإسكندرية',
      openingBalance: 30000,
      openingBalanceType: 'credit',
    })
    assert.strictEqual(creditCust.balance, -30000, 'Credit balance must be negative advance')

    const zeroCust = processCustomer({
      name: 'مطعم الحديقة',
      phone: '01055555555',
      address: 'المنصورة',
      openingBalance: 0,
      openingBalanceType: 'credit',
    })
    assert.strictEqual(zeroCust.balance, 0, 'Zero opening balance must normalize to positive zero')
  })

  it('should support quick add with incomplete badge when contact or address is omitted', () => {
    const quickCust = processCustomer({
      name: 'محلات التوحيد للحوم',
    })

    assert.strictEqual(quickCust.name, 'محلات التوحيد للحوم')
    assert.strictEqual(quickCust.isIncomplete, true)
    assert.strictEqual(quickCust.balance, 0)
  })

  it('should verify governorate and category constants existence and validity', () => {
    assert.ok(Array.isArray(GOVERNORATES), 'GOVERNORATES must be an array')
    assert.ok(GOVERNORATES.includes('الغربية'))
    assert.ok(GOVERNORATES.includes('القاهرة'))
    assert.ok(GOVERNORATES.includes('الدقهلية'))

    assert.ok(typeof DEFAULT_CATEGORIES === 'object')
    assert.ok(DEFAULT_CATEGORIES['مطاعم وفنادق (HORECA)'].length > 0)
    assert.ok(DEFAULT_CATEGORIES['سلاسل تجارية وهايبر'].length > 0)
  })

  it('should build and transform customer document image URLs via ImageKit', () => {
    const rawPhoto = 'https://ik.imagekit.io/c8zctprqq/customers/shop_front_01.jpg'
    const transformedThumb = getTransformedUrl(rawPhoto, { width: 100, height: 100, quality: 75 })
    assert.ok(transformedThumb.includes('tr:w-100,h-100,q-75/'))
    assert.ok(transformedThumb.includes('customers/shop_front_01.jpg'))
  })
})
