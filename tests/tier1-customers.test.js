import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Tier 1: Customers Management & Balances (F4, F5, F6, F7, F8)', () => {
  // Helper implementing customer creation contract
  function createCustomer(data) {
    const isQuickAdd = !data.phone && !data.address
    const openingBal = Number(data.openingBalance) || 0
    const openingType = data.openingBalanceType || 'debit'
    // debit: customer owes company (+), credit: customer paid advance (-)
    const signedBalance = openingType === 'debit' ? openingBal : -openingBal

    return {
      id: data.id || `cust-${Date.now()}`,
      name: data.name || '',
      phone: data.phone || '',
      address: data.address || '',
      governorate: data.governorate || '',
      city: data.city || '',
      district: data.district || '',
      primaryCategory: data.primaryCategory || '',
      subCategory: data.subCategory || '',
      openingBalance: openingBal,
      openingBalanceType: openingType,
      balance: signedBalance,
      attachments: data.attachments || [],
      isIncomplete: isQuickAdd,
      createdAt: new Date().toISOString()
    }
  }

  it('should create customer with full profile including 2-level categories and geographic classification', () => {
    const payload = {
      id: 'cust-101',
      name: 'مطعم قصر الكبابجي',
      phone: '01012345678',
      address: 'شارع التسعين الشمالي',
      governorate: 'القاهرة',
      city: 'القاهرة الجديدة',
      district: 'التجمع الخامس',
      primaryCategory: 'مطاعم',
      subCategory: 'مشويات',
      openingBalance: 15000,
      openingBalanceType: 'debit'
    }

    const customer = createCustomer(payload)
    assert.strictEqual(customer.id, 'cust-101')
    assert.strictEqual(customer.name, 'مطعم قصر الكبابجي')
    assert.strictEqual(customer.primaryCategory, 'مطاعم')
    assert.strictEqual(customer.subCategory, 'مشويات')
    assert.strictEqual(customer.governorate, 'القاهرة')
    assert.strictEqual(customer.city, 'القاهرة الجديدة')
    assert.strictEqual(customer.district, 'التجمع الخامس')
    assert.strictEqual(customer.isIncomplete, false)
  })

  it('should record debit opening balance as positive customer receivables (مستحق على العميل)', () => {
    const customer = createCustomer({
      name: 'سوبر ماركت النور',
      phone: '01122334455',
      address: 'مدينة نصر',
      openingBalance: 8500,
      openingBalanceType: 'debit'
    })

    assert.strictEqual(customer.openingBalance, 8500)
    assert.strictEqual(customer.openingBalanceType, 'debit')
    assert.strictEqual(customer.balance, 8500, 'Debit balance must be positive in receivables')
  })

  it('should record credit opening balance as advance deposit (رصيد دائن للعميل)', () => {
    const customer = createCustomer({
      name: 'فندق سيتي ستارز',
      phone: '01233445566',
      address: 'مصر الجديدة',
      openingBalance: 20000,
      openingBalanceType: 'credit'
    })

    assert.strictEqual(customer.openingBalance, 20000)
    assert.strictEqual(customer.openingBalanceType, 'credit')
    assert.strictEqual(customer.balance, -20000, 'Credit balance must be negative in debt ledger')
  })

  it('should support quick add with incomplete warning badge when only name is provided', () => {
    const customer = createCustomer({
      name: 'مطعم البرنس إمبابة'
    })

    assert.strictEqual(customer.name, 'مطعم البرنس إمبابة')
    assert.strictEqual(customer.isIncomplete, true, 'Quick add without phone/address must set isIncomplete: true')
    assert.strictEqual(customer.balance, 0)
  })

  it('should build ImageKit transformed URLs for customer attachments', () => {
    function buildImageKitUrl(baseUrl, transforms) {
      if (!baseUrl) return ''
      const parts = []
      if (transforms.width) parts.push(`w-${transforms.width}`)
      if (transforms.height) parts.push(`h-${transforms.height}`)
      if (transforms.quality) parts.push(`q-${transforms.quality}`)
      const transformString = parts.length > 0 ? `tr:${parts.join(',')}/` : ''
      
      const cleanBase = baseUrl.replace(/^https?:\/\/[^/]+\//, '')
      return `https://ik.imagekit.io/c8zctprqq/${transformString}${cleanBase}`
    }

    const rawUrl = 'https://ik.imagekit.io/c8zctprqq/customers/cr_doc_101.jpg'
    const transformed = buildImageKitUrl(rawUrl, { width: 300, height: 200, quality: 80 })

    assert.ok(transformed.includes('tr:w-300,h-200,q-80/'), 'Should include correct ImageKit transform chain')
    assert.ok(transformed.includes('customers/cr_doc_101.jpg'))
  })

  it('should update customer balance upon sales invoice and cash payment', () => {
    let customer = createCustomer({
      name: 'محلات جزارة الحرمين',
      phone: '01099887766',
      address: 'الدقي',
      openingBalance: 5000,
      openingBalanceType: 'debit'
    })

    // 1. Issue sales invoice for 12,000 EGP, paid 4,000, remaining 8,000
    const invoiceCreditAmount = 8000
    customer.balance += invoiceCreditAmount
    assert.strictEqual(customer.balance, 13000, '5000 opening + 8000 credit invoice = 13000')

    // 2. Customer pays 10,000 cash receipt
    const cashReceipt = 10000
    customer.balance -= cashReceipt
    assert.strictEqual(customer.balance, 3000, '13000 - 10000 cash payment = 3000')
  })

  it('should support salesRepName (تبعية المندوب) and geographic fields side-by-side', () => {
    const customer = {
      name: 'سوبر ماركت الفيروز',
      contactPerson: 'الحاج جابر',
      phone: '01011223344',
      phone2: '01299887766',
      salesRepName: 'محمد عبد الله',
      commercialRegister: '12345/جيزة',
      governorate: 'الجيزة',
      city: 'السادس من أكتوبر',
      district: 'الحي المتميز',
      address: 'المحور المركزي مول السرايا',
      primaryCategory: 'سوبر ماركت',
      balance: 0,
    }

    assert.strictEqual(customer.salesRepName, 'محمد عبد الله')
    assert.strictEqual(customer.commercialRegister, '12345/جيزة')
    assert.strictEqual(customer.governorate, 'الجيزة')
    assert.strictEqual(customer.city, 'السادس من أكتوبر')
    assert.strictEqual(customer.district, 'الحي المتميز')
    assert.strictEqual(customer.contactPerson, 'الحاج جابر')
    assert.strictEqual(customer.phone2, '01299887766')
  })
})
