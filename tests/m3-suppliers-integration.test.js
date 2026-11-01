import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  SUPPLY_TYPES,
  SUPPLY_TYPE_LABELS,
  SUPPLIER_CATEGORIES,
  normalizeSupplyType,
  calculateSupplierBalance,
  getSupplyTypeLabel,
} from '../src/components/suppliers/supplierConstants.js'
import { AX_SupplierOperationsService } from '../src/services/AX_SupplierOperationsService.js'

describe('Milestone 3 Integration: Suppliers Module Requirements (R2)', () => {
  function processSupplier(data) {
    const rawOpening = Number(data.openingBalance) || 0
    const normalizedOpening = rawOpening === 0 ? 0 : rawOpening
    const openingType = data.openingBalanceType || 'payable'
    const signedBalance = normalizedOpening === 0 ? 0 : (openingType === 'payable' ? normalizedOpening : -normalizedOpening)

    return {
      id: data.id || `sup-${Date.now()}`,
      companyName: (data.companyName || '').trim(),
      name: (data.companyName || data.name || '').trim(),
      contactPerson: (data.contactPerson || '').trim(),
      phone: (data.phone || '').trim(),
      phone2: (data.phone2 || '').trim(),
      address: (data.address || '').trim(),
      supplyType: normalizeSupplyType(data.supplyType),
      category: data.category || 'خامات وتوريد',
      commercialRegistration: (data.commercialRegistration || data.commercialRegister || '').trim(),
      taxNumber: (data.taxNumber || '').trim(),
      openingBalance: normalizedOpening,
      openingBalanceType: openingType,
      balance: signedBalance,
      notes: (data.notes || '').trim(),
      createdAt: data.createdAt || new Date().toISOString(),
    }
  }

  it('should create complete supplier record with full profile fields', () => {
    const sup = processSupplier({
      id: 'sup-m3-01',
      companyName: 'شركة النيل لاستيراد اللحوم البرازيلية',
      contactPerson: 'الحاج إبراهيم منصور',
      phone: '01055667788',
      phone2: '01233445566',
      address: 'ميناء الإسكندرية - المنطقة الحرة',
      supplyType: 'frozen_meat',
      category: 'لحوم حمراء ومصنعات',
      commercialRegistration: '98765-CR',
      taxNumber: '123-456-789-TX',
      openingBalance: 450000,
      openingBalanceType: 'payable',
      notes: 'مورد معتمد بموجب تعاقد سنوي',
    })

    assert.strictEqual(sup.id, 'sup-m3-01')
    assert.strictEqual(sup.companyName, 'شركة النيل لاستيراد اللحوم البرازيلية')
    assert.strictEqual(sup.contactPerson, 'الحاج إبراهيم منصور')
    assert.strictEqual(sup.phone, '01055667788')
    assert.strictEqual(sup.phone2, '01233445566')
    assert.strictEqual(sup.address, 'ميناء الإسكندرية - المنطقة الحرة')
    assert.strictEqual(sup.supplyType, 'frozen_meat')
    assert.strictEqual(sup.category, 'لحوم حمراء ومصنعات')
    assert.strictEqual(sup.commercialRegistration, '98765-CR')
    assert.strictEqual(sup.taxNumber, '123-456-789-TX')
    assert.strictEqual(sup.openingBalance, 450000)
    assert.strictEqual(sup.openingBalanceType, 'payable')
    assert.strictEqual(sup.balance, 450000)
    assert.strictEqual(sup.notes, 'مورد معتمد بموجب تعاقد سنوي')
  })

  it('should accurately differentiate between payable and receivable opening balances', () => {
    const payableSup = processSupplier({
      companyName: 'مزارع الوادي للدواجن',
      openingBalance: 120000,
      openingBalanceType: 'payable',
    })
    assert.strictEqual(payableSup.balance, 120000, 'Payable balance must be positive liability')

    const receivableSup = processSupplier({
      companyName: 'مصنع الأهرام للتعبئة',
      openingBalance: 30000,
      openingBalanceType: 'receivable',
    })
    assert.strictEqual(receivableSup.balance, -30000, 'Receivable balance must be negative advance')

    const zeroSup = processSupplier({
      companyName: 'مورد رصيد صفري',
      openingBalance: 0,
      openingBalanceType: 'payable',
    })
    assert.strictEqual(zeroSup.balance, 0, 'Zero opening balance must normalize to exactly 0')
    assert.strictEqual(Object.is(zeroSup.balance, -0), false, 'Must not be -0')
  })

  it('should normalize unknown supply types to standard default frozen_meat', () => {
    assert.strictEqual(normalizeSupplyType('frozen_meat'), 'frozen_meat')
    assert.strictEqual(normalizeSupplyType('poultry'), 'poultry')
    assert.strictEqual(normalizeSupplyType('fish'), 'fish')
    assert.strictEqual(normalizeSupplyType('packaging'), 'packaging')
    assert.strictEqual(normalizeSupplyType('slaughterhouse'), 'slaughterhouse')
    assert.strictEqual(normalizeSupplyType('spices_seasoning'), 'spices_seasoning')
    assert.strictEqual(normalizeSupplyType('non_existent_type'), 'frozen_meat')
    assert.strictEqual(normalizeSupplyType('أسماك بحرية'), 'fish')
    assert.strictEqual(normalizeSupplyType('دواجن ومجزءات'), 'poultry')
  })

  it('should compute running balance correctly across multi-step purchase and disbursement transactions', () => {
    const opening = 80000
    const transactions = [
      { type: 'purchase_credit', amount: 120000 },
      { type: 'disbursement', amount: 50000 },
      { type: 'purchase_credit', amount: 60000 },
      { type: 'disbursement', amount: 110000 },
    ]
    const finalBalance = calculateSupplierBalance(opening, 'payable', transactions)
    assert.strictEqual(finalBalance, 100000)
  })

  it('should provide complete labels and category definitions for suppliers', () => {
    assert.ok(SUPPLY_TYPES.length >= 7)
    assert.ok(SUPPLIER_CATEGORIES.length >= 5)
    assert.strictEqual(getSupplyTypeLabel('frozen_meat'), 'لحوم مجمدة')
    assert.strictEqual(getSupplyTypeLabel('poultry'), 'دواجن ومصنعات')
    assert.strictEqual(getSupplyTypeLabel('fish'), 'أسماك ومأكولات')
    assert.strictEqual(getSupplyTypeLabel(''), 'عام')
  })

  it('should verify AX_SupplierOperationsService methods return safely when Supabase is unconfigured', async () => {
    const addRes = await AX_SupplierOperationsService.addSupplierInDB({
      id: 'sup-mock-test',
      companyName: 'مورد وهمي',
      phone: '01012345678',
      address: 'طنطا',
      balance: 5000,
    })
    assert.ok(typeof addRes === 'object')

    const updateRes = await AX_SupplierOperationsService.updateSupplierInDB({
      id: 'sup-mock-test',
      companyName: 'مورد وهمي معدل',
      balance: 10000,
    })
    assert.ok(typeof updateRes === 'object')

    const delRes = await AX_SupplierOperationsService.deleteSupplierInDB('sup-mock-test')
    assert.ok(typeof delRes === 'object')
  })
})
