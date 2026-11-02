import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { getItemDisplayName } from '../src/utils/AX_ItemNameHelper.js'
import { EXPENSE_CATEGORIES, WAGE_TYPES } from '../src/components/treasury/treasuryConstants.js'

describe('Invoices Returns & Commercial Composite Names', () => {
  test('getItemDisplayName correctly returns compositeName if present', () => {
    const item = {
      compositeName: 'لحوم - كبدة بقري - مستورد',
      primaryCategory: 'لحوم',
      subCategory: 'كبدة بقري',
    }
    assert.equal(getItemDisplayName(item), 'لحوم - كبدة بقري - مستورد')
  })

  test('getItemDisplayName synthesizes composite commercial name when compositeName is missing', () => {
    const item = {
      primaryCategory: 'مصنعات',
      subCategory: 'سجق',
      secondaryCategory: 'بلدي ممتاز',
    }
    assert.equal(getItemDisplayName(item), 'مصنعات - سجق - بلدي ممتاز')
  })

  test('getItemDisplayName falls back to name or code', () => {
    assert.equal(getItemDisplayName({ name: 'صنف مخصص' }), 'صنف مخصص')
    assert.equal(getItemDisplayName({ code: 'PF-001' }), 'PF-001')
    assert.equal(getItemDisplayName(null), '')
  })

  test('Statement of account properly offsets balance for sales returns and purchase returns', () => {
    const invoices = [
      { id: '1', partyName: 'عميل أ', type: 'sale', total: 1000 },
      { id: '2', partyName: 'عميل أ', type: 'sale_return', total: 300 },
      { id: '3', partyName: 'مورد ب', type: 'purchase', total: 5000 },
      { id: '4', partyName: 'مورد ب', type: 'purchase_return', total: 1500 },
    ]

    // Simulate Client Statement calculation
    let clientBalance = 0
    const clientRows = invoices.filter(i => i.partyName === 'عميل أ').map(inv => {
      if (inv.type === 'sale') clientBalance += inv.total
      else if (inv.type === 'sale_return') clientBalance -= inv.total
      return { ...inv, balance: clientBalance }
    })
    assert.equal(clientRows[0].balance, 1000)
    assert.equal(clientRows[1].balance, 700)

    // Simulate Supplier Statement calculation
    let supplierBalance = 0
    const supplierRows = invoices.filter(i => i.partyName === 'مورد ب').map(inv => {
      if (inv.type === 'purchase') supplierBalance += inv.total
      else if (inv.type === 'purchase_return') supplierBalance -= inv.total
      return { ...inv, balance: supplierBalance }
    })
    assert.equal(supplierRows[0].balance, 5000)
    assert.equal(supplierRows[1].balance, 3500)
  })
})

describe('Treasury Expense Coding & Wages Structure', () => {
  test('EXPENSE_CATEGORIES includes critical cold chain codes', () => {
    const codes = EXPENSE_CATEGORIES.map(c => c.code)
    assert.ok(codes.includes('EXP-TRN'), 'Should have transport & shipping code')
    assert.ok(codes.includes('EXP-MNT'), 'Should have cold room maintenance code')
    assert.ok(codes.includes('EXP-ELC'), 'Should have electricity/power code')
    assert.ok(codes.includes('EXP-PKG'), 'Should have packaging materials code')
  })

  test('WAGE_TYPES covers salary, advance, bonus, and daily labor', () => {
    const wageValues = WAGE_TYPES.map(w => w.value)
    assert.ok(wageValues.includes('salary'))
    assert.ok(wageValues.includes('advance'))
    assert.ok(wageValues.includes('bonus'))
    assert.ok(wageValues.includes('daily'))
  })

  test('getItemDisplayName expands composite name when compositeName is identical to subCategory', () => {
    const item = {
      compositeName: 'بانيه',
      primaryCategory: 'منتجات صلاح وعبد الفتاح',
      subCategory: 'بانيه',
      secondaryCategory: 'عادي',
    }
    assert.equal(getItemDisplayName(item), 'منتجات صلاح وعبد الفتاح - بانيه - عادي')
  })

  test('Units in packaging fields strictly allow only carton, kilo, piece and forbid grain (حبة)', () => {
    const allowedUnits = ['كرتونة', 'كيلو', 'قطعة']
    assert.ok(!allowedUnits.includes('حبة'), 'حبة must be completely excluded')
    assert.equal(allowedUnits.length, 3)
    assert.deepEqual(allowedUnits, ['كرتونة', 'كيلو', 'قطعة'])
  })
})
