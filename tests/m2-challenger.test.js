import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { imageKitService, getTransformedUrl, uploadImage } from '../src/services/imageKitService.js'
import { GOVERNORATES, DEFAULT_CATEGORIES } from '../src/components/customers/customerConstants.js'

describe('M2 Adversarial Challenge 1: Customer Balances & 360° Ledger Calculations', () => {
  function computeBalance(openingBalance, openingBalanceType) {
    const raw = Number(openingBalance) || 0
    const normalized = raw === 0 ? 0 : raw
    return normalized === 0 ? 0 : (openingBalanceType === 'debit' ? normalized : -normalized)
  }

  function computeLedgerRunningBalance(customer, invoices = [], cashTransactions = []) {
    const entries = []
    const opBal = Number(customer.openingBalance) || 0
    const opType = customer.openingBalanceType || 'debit'
    const opSigned = opType === 'debit' ? opBal : -opBal

    if (opBal > 0) {
      entries.push({
        id: 'op-bal',
        date: customer.createdAt || '2026-01-01T00:00:00.000Z',
        type: 'opening',
        debit: opType === 'debit' ? opBal : 0,
        credit: opType === 'credit' ? opBal : 0,
      })
    }

    const customerInvoices = invoices.filter(
      (inv) => inv && (inv.clientId === customer.id || inv.partyName === customer.name)
    )

    customerInvoices.forEach((inv) => {
      const invTotal = Number(inv.total || inv.totalAmount) || 0
      const paid = Number(inv.paidAmount || inv.cashPaid) || 0
      entries.push({
        id: inv.id,
        date: inv.date || inv.createdAt || '2026-01-01T00:00:00.000Z',
        type: 'invoice',
        debit: invTotal,
        credit: paid,
      })
    })

    const customerReceipts = cashTransactions.filter(
      (tx) => tx && (tx.partyName === customer.name || tx.partyId === customer.id) &&
        (tx.type === 'client_receipt' || tx.type === 'receipt' || tx.type === 'cash_in')
    )

    customerReceipts.forEach((rc) => {
      entries.push({
        id: rc.id,
        date: rc.date || rc.createdAt || '2026-01-01T00:00:00.000Z',
        type: 'payment',
        debit: 0,
        credit: Number(rc.amount) || 0,
      })
    })

    entries.sort((a, b) => new Date(a.date) - new Date(b.date))

    let running = 0
    return entries.map((entry) => {
      const debit = entry.debit || 0
      const credit = entry.credit || 0
      running += (debit - credit)
      return { ...entry, runningBalance: running }
    })
  }

  it('1.1 should correctly sign debit opening balance as positive receivable', () => {
    const bal = computeBalance(50000, 'debit')
    assert.strictEqual(bal, 50000)
    assert.ok(bal > 0, 'Debit balance must be positive')
  })

  it('1.2 should correctly sign credit opening balance as negative advance liability', () => {
    const bal = computeBalance(35000, 'credit')
    assert.strictEqual(bal, -35000)
    assert.ok(bal < 0, 'Credit balance must be negative')
  })

  it('1.3 should normalize zero opening balance to positive 0 regardless of balance type', () => {
    const debitZero = computeBalance(0, 'debit')
    const creditZero = computeBalance(0, 'credit')
    const stringZero = computeBalance('0.00', 'credit')
    const emptyZero = computeBalance('', 'debit')

    assert.strictEqual(debitZero, 0)
    assert.strictEqual(creditZero, 0)
    assert.strictEqual(stringZero, 0)
    assert.strictEqual(emptyZero, 0)
    assert.strictEqual(Object.is(creditZero, -0), false, 'Zero must not be negative zero (-0)')
  })

  it('1.4 should handle extreme balance of 100,000,000 EGP with full precision', () => {
    const extremeAmount = 100000000
    const balDebit = computeBalance(extremeAmount, 'debit')
    const balCredit = computeBalance(extremeAmount, 'credit')

    assert.strictEqual(balDebit, 100000000)
    assert.strictEqual(balCredit, -100000000)

    const formatted = balDebit.toLocaleString('ar-EG')
    assert.ok(formatted.length > 0)
  })

  it('1.5 should verify complex multi-step 360° ledger running balance sequence', () => {
    const customer = {
      id: 'cust-adv-01',
      name: 'مجمع مطاعم الشروق',
      openingBalance: 40000,
      openingBalanceType: 'debit',
      createdAt: '2026-10-01T08:00:00.000Z',
    }

    const invoices = [
      {
        id: 'inv-1',
        clientId: 'cust-adv-01',
        date: '2026-10-05T10:00:00.000Z',
        total: 25000,
        paidAmount: 5000,
      },
      {
        id: 'inv-2',
        clientId: 'cust-adv-01',
        date: '2026-10-15T12:00:00.000Z',
        total: 15000,
        paidAmount: 15000,
      },
      {
        id: 'inv-3',
        clientId: 'cust-adv-01',
        date: '2026-10-25T14:00:00.000Z',
        total: 10000,
        paidAmount: 0,
      },
    ]

    const cashReceipts = [
      {
        id: 'rc-1',
        partyId: 'cust-adv-01',
        type: 'client_receipt',
        date: '2026-10-10T11:00:00.000Z',
        amount: 30000,
      },
      {
        id: 'rc-2',
        partyId: 'cust-adv-01',
        type: 'client_receipt',
        date: '2026-10-20T09:00:00.000Z',
        amount: 40000,
      },
    ]

    const ledger = computeLedgerRunningBalance(customer, invoices, cashReceipts)
    assert.strictEqual(ledger.length, 6, 'Ledger must have exactly 6 chronological events')

    // Step 1: Opening balance (debit 40,000) -> running: 40,000
    assert.strictEqual(ledger[0].id, 'op-bal')
    assert.strictEqual(ledger[0].runningBalance, 40000)

    // Step 2: Invoice 1 (total 25,000, paid 5,000 => net +20,000) -> running: 60,000
    assert.strictEqual(ledger[1].id, 'inv-1')
    assert.strictEqual(ledger[1].runningBalance, 60000)

    // Step 3: Cash Receipt 1 (credit 30,000) -> running: 30,000
    assert.strictEqual(ledger[2].id, 'rc-1')
    assert.strictEqual(ledger[2].runningBalance, 30000)

    // Step 4: Invoice 2 (total 15,000, paid 15,000 => net 0) -> running: 30,000
    assert.strictEqual(ledger[3].id, 'inv-2')
    assert.strictEqual(ledger[3].runningBalance, 30000)

    // Step 5: Cash Receipt 2 (credit 40,000 overpayment) -> running: -10,000 (customer has credit advance)
    assert.strictEqual(ledger[4].id, 'rc-2')
    assert.strictEqual(ledger[4].runningBalance, -10000)

    // Step 6: Invoice 3 (total 10,000, paid 0 => net +10,000) -> running: 0 (balance settled)
    assert.strictEqual(ledger[5].id, 'inv-3')
    assert.strictEqual(ledger[5].runningBalance, 0)
  })

  it('1.6 should aggregate customer totals across debtors and creditors correctly', () => {
    const clients = [
      { id: 'c1', balance: 100000, isIncomplete: false },
      { id: 'c2', balance: -25000, isIncomplete: false },
      { id: 'c3', balance: 0, isIncomplete: true },
      { id: 'c4', balance: 50000, isIncomplete: true },
      { id: 'c5', balance: -75000, isIncomplete: false },
    ]

    const totalReceivables = clients.reduce((sum, c) => (c.balance > 0 ? sum + c.balance : sum), 0)
    const totalPayablesAdvance = clients.reduce((sum, c) => (c.balance < 0 ? sum + Math.abs(c.balance) : sum), 0)
    const debtorsCount = clients.filter((c) => c.balance > 0).length
    const creditorsCount = clients.filter((c) => c.balance < 0).length
    const incompleteCount = clients.filter((c) => c.isIncomplete).length

    assert.strictEqual(totalReceivables, 150000, 'Receivables must sum all positive debtor balances')
    assert.strictEqual(totalPayablesAdvance, 100000, 'Payables advance must sum absolute value of negative creditor balances')
    assert.strictEqual(debtorsCount, 2)
    assert.strictEqual(creditorsCount, 2)
    assert.strictEqual(incompleteCount, 2)
  })
})

describe('M2 Adversarial Challenge 2: Categories, Geography & Unusual Inputs', () => {
  function processCustomerData(raw) {
    const rawOpening = Number(raw.openingBalance) || 0
    const normalizedOpening = rawOpening === 0 ? 0 : rawOpening
    const signedOpening = normalizedOpening === 0 ? 0 : (raw.openingBalanceType === 'credit' ? -normalizedOpening : normalizedOpening)

    const finalSub = raw.isAddingCustomSub && raw.customSubCategory?.trim()
      ? raw.customSubCategory.trim()
      : (raw.subCategory || '')

    const phone = (raw.phone || '').trim()
    const city = (raw.city || '').trim()
    const address = (raw.address || '').trim()
    const isIncomplete = !phone && !city && !address

    return {
      name: (raw.name || '').trim(),
      contactPerson: (raw.contactPerson || '').trim(),
      phone,
      governorate: raw.governorate || '',
      city,
      district: (raw.district || '').trim(),
      address,
      primaryCategory: raw.primaryCategory || 'عام',
      subCategory: finalSub || 'عام',
      balance: signedOpening,
      isIncomplete,
    }
  }

  it('2.1 should handle empty strings and missing fields with graceful fallbacks', () => {
    const result = processCustomerData({
      name: '  ',
      phone: '',
      city: '',
      address: '',
      primaryCategory: '',
      subCategory: '',
    })

    assert.strictEqual(result.name, '')
    assert.strictEqual(result.primaryCategory, 'عام')
    assert.strictEqual(result.subCategory, 'عام')
    assert.strictEqual(result.isIncomplete, true, 'Customer with zero contact/address is flagged incomplete')
    assert.strictEqual(result.balance, 0)
  })

  it('2.2 should preserve Arabic diacritics (tashkeel) and unicode text without distortion', () => {
    const payload = {
      name: 'مَطْعَمُ السَّعَادَةِ لِلْمَأْكُولَاتِ',
      phone: '01012345678',
      city: 'الْمَنْصُورَةُ',
      address: 'شَارِعُ الْجَيْشِ',
      primaryCategory: 'مَطَاعِمٌ وَفَنَادِقُ',
      subCategory: 'مَشْوِيَّاتٌ وَكَبَابٌ',
      openingBalance: 12500,
      openingBalanceType: 'debit',
    }

    const processed = processCustomerData(payload)
    assert.strictEqual(processed.name, 'مَطْعَمُ السَّعَادَةِ لِلْمَأْكُولَاتِ')
    assert.strictEqual(processed.primaryCategory, 'مَطَاعِمٌ وَفَنَادِقُ')
    assert.strictEqual(processed.subCategory, 'مَشْوِيَّاتٌ وَكَبَابٌ')
    assert.strictEqual(processed.city, 'الْمَنْصُورَةُ')
    assert.strictEqual(processed.isIncomplete, false)
  })

  it('2.3 should withstand extremely long input strings without memory corruption', () => {
    const longName = 'شركة '.repeat(100) + ' للتجارة'
    const longAddress = 'شارع رقم '.repeat(150)
    const longSub = 'تصنيف مخصص '.repeat(50)

    const processed = processCustomerData({
      name: longName,
      phone: '01000000000',
      address: longAddress,
      isAddingCustomSub: true,
      customSubCategory: longSub,
    })

    assert.strictEqual(processed.name, longName.trim())
    assert.strictEqual(processed.address, longAddress.trim())
    assert.strictEqual(processed.subCategory, longSub.trim())
  })

  it('2.4 should switch to custom subcategory when isAddingCustomSub is enabled', () => {
    const standard = processCustomerData({
      name: 'عميل 1',
      primaryCategory: 'محلات جزارة ومجمدات',
      subCategory: 'لحوم مجمدة ومستوردة',
      isAddingCustomSub: false,
      customSubCategory: 'تصنيف يدوي لن يظهر',
    })
    assert.strictEqual(standard.subCategory, 'لحوم مجمدة ومستوردة')

    const custom = processCustomerData({
      name: 'عميل 2',
      primaryCategory: 'محلات جزارة ومجمدات',
      subCategory: 'لحوم مجمدة ومستوردة',
      isAddingCustomSub: true,
      customSubCategory: 'مجمدات كبدة وقلوب مستوردة',
    })
    assert.strictEqual(custom.subCategory, 'مجمدات كبدة وقلوب مستوردة')
  })

  it('2.5 should verify quick add completeness logic matrix', () => {
    // Only name -> incomplete
    assert.strictEqual(processCustomerData({ name: 'س' }).isIncomplete, true)
    // Name + phone -> complete
    assert.strictEqual(processCustomerData({ name: 'س', phone: '010' }).isIncomplete, false)
    // Name + city -> complete
    assert.strictEqual(processCustomerData({ name: 'س', city: 'طنطا' }).isIncomplete, false)
    // Name + address -> complete
    assert.strictEqual(processCustomerData({ name: 'س', address: 'ش النصر' }).isIncomplete, false)
  })
})

describe('M2 Adversarial Challenge 3: ImageKit Handling & Offline Fallbacks', () => {
  it('3.1 should safely handle malformed, non-url, and null inputs in getTransformedUrl', () => {
    assert.strictEqual(getTransformedUrl(null), '')
    assert.strictEqual(getTransformedUrl(undefined), '')
    assert.strictEqual(getTransformedUrl(''), '')
    assert.strictEqual(getTransformedUrl(12345), '')
    assert.strictEqual(getTransformedUrl('ftp://not-http.com/file.jpg'), 'ftp://not-http.com/file.jpg')
    assert.strictEqual(getTransformedUrl('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=')
    assert.strictEqual(getTransformedUrl('https://example.com/other-cdn/image.jpg'), 'https://example.com/other-cdn/image.jpg')
  })

  it('3.2 should construct valid ImageKit transformation strings with multiple chained options', () => {
    const raw = 'https://ik.imagekit.io/c8zctprqq/customers/tax_cert.jpg'
    const transformed = getTransformedUrl(raw, { width: 400, height: 300, quality: 85, crop: 'maintain_ratio' })

    assert.ok(transformed.includes('tr:w-400,h-300,q-85,c-maintain_ratio'))
    assert.ok(transformed.includes('customers/tax_cert.jpg'))
  })

  it('3.3 should replace existing transformation string rather than stacking duplicates', () => {
    const initialUrl = 'https://ik.imagekit.io/c8zctprqq/tr:w-100,h-100/customers/avatar.jpg'
    const updatedUrl = getTransformedUrl(initialUrl, { width: 500, height: 500 })

    assert.ok(updatedUrl.includes('tr:w-500,h-500'))
    assert.strictEqual(updatedUrl.includes('tr:w-100'), false, 'Old transformation must be replaced, not stacked')
  })

  it('3.4 should reject uploadImage when file is missing', async () => {
    await assert.rejects(
      async () => {
        await uploadImage(null)
      },
      {
        message: 'No file provided for upload',
      }
    )
  })

  it('3.5 should fallback to base64 Data URL when environment is offline or upload fails', async () => {
    // Construct a mock File object
    const mockFile = {
      name: 'cr_copy.jpg',
      size: 1024,
      type: 'image/jpeg',
    }

    // In Node environment without global FormData / network fetch, uploadImage gracefully returns local fallback
    const res = await uploadImage(mockFile, '/customers')
    assert.ok(res.fileId.startsWith('local-'))
    assert.strictEqual(res.name, 'cr_copy.jpg')
    assert.strictEqual(res.isLocalFallback, true)
  })
})
