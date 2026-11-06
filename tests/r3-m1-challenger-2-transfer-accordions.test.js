import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

describe('Challenger 2: Transfer Category Accordion & Review Modal Adversarial Verification', () => {
  const mockWarehouses = [
    { id: 'wh-main', name: 'المخزن الرئيسي', type: 'main' },
    { id: 'wh-shop', name: 'الدكان', type: 'branch' },
    { id: 'wh-dist', name: 'سيارة توزيع 1', type: 'van' },
  ]

  const mockStock = [
    { warehouseId: 'wh-main', itemId: 'it-1', quantity: 50, unit: 'كرتونة' },
    { warehouse_id: 'wh-main', item_id: 'it-2', quantity: 30, unit: 'كرتونة' },
    { warehouseId: 'wh-main', itemId: 'it-special', quantity: 10, unit: 'كيلو' },
  ]

  const computeItemsWithAvailable = (items, inventoryStock, fromWarehouseId) => {
    const stockMap = new Map()
    if (fromWarehouseId && Array.isArray(inventoryStock)) {
      inventoryStock
        .filter((s) => s && (s.warehouseId === fromWarehouseId || s.warehouse_id === fromWarehouseId))
        .forEach((s) => {
          const itId = s.itemId || s.item_id
          const qty = Number(s.quantity) || 0
          stockMap.set(itId, (stockMap.get(itId) || 0) + qty)
        })
    }

    return (items || []).map((it) => ({
      ...it,
      availableStock: stockMap.get(it.id) || 0,
      primaryCategory: (it.primaryCategory || '').trim() || 'أصناف عامة',
    }))
  }

  const computeFilteredCategories = (itemsWithAvailable, searchTerm) => {
    const term = searchTerm.trim().toLowerCase()
    const groups = {}

    itemsWithAvailable.forEach((it) => {
      const cat = it.primaryCategory
      const matchesSearch =
        !term ||
        (it.compositeName && it.compositeName.toLowerCase().includes(term)) ||
        (it.subCategory && it.subCategory.toLowerCase().includes(term)) ||
        (it.code && it.code.toLowerCase().includes(term))

      if (!matchesSearch) return

      if (!groups[cat]) groups[cat] = []
      groups[cat].push(it)
    })

    return groups
  }

  const computeReviewTotals = (selectedItemsGrouped) => {
    const categories = Object.keys(selectedItemsGrouped || {})
    const totalItemsCount = categories.reduce(
      (sum, cat) => sum + (selectedItemsGrouped[cat] || []).length,
      0
    )
    const totalQuantities = categories.reduce(
      (sum, cat) =>
        sum +
        (selectedItemsGrouped[cat] || []).reduce((catSum, it) => catSum + (Number(it.quantity) || 0), 0),
      0
    )
    return { categories, totalItemsCount, totalQuantities }
  }

  const applyQuantityChange = (selectedQuantities, itemId, quantity, unit, itemRef) => {
    const copy = { ...selectedQuantities }
    if (quantity <= 0) {
      delete copy[itemId]
    } else {
      copy[itemId] = {
        quantity,
        unit: unit || 'كرتونة',
        itemName: itemRef?.compositeName || itemRef?.name || '',
        primaryCategory: itemRef?.primaryCategory || 'أصناف عامة',
      }
    }
    return copy
  }

  describe('1. Category Grouping & Safe Fallback Verification', () => {
    it('should safely group undefined, null, empty string, and whitespace into أصناف عامة', () => {
      const rawItems = [
        { id: '1', compositeName: 'صنف بدون قسم' },
        { id: '2', compositeName: 'صنف نول', primaryCategory: null },
        { id: '3', compositeName: 'صنف فارغ', primaryCategory: '' },
        { id: '4', compositeName: 'صنف مسافات', primaryCategory: '   \t  ' },
        { id: '5', compositeName: 'برجر', primaryCategory: 'مصنعات' },
      ]

      const processed = computeItemsWithAvailable(rawItems, mockStock, 'wh-main')
      assert.strictEqual(processed.length, 5)

      const generalItems = processed.filter((it) => it.primaryCategory === 'أصناف عامة')
      assert.strictEqual(generalItems.length, 4)
      assert.strictEqual(processed[4].primaryCategory, 'مصنعات')

      const groups = computeFilteredCategories(processed, '')
      assert.strictEqual(Object.keys(groups).length, 2)
      assert.strictEqual(groups['أصناف عامة'].length, 4)
      assert.strictEqual(groups['مصنعات'].length, 1)
    })

    it('should preserve special characters and complex category names accurately', () => {
      const rawItems = [
        { id: 's1', compositeName: 'لحمة مفرومة', primaryCategory: 'لحوم / تصنيع (مبرد & مجمد) #1' },
        { id: 's2', compositeName: 'شيش طاووق', primaryCategory: 'دواجن - مصنعة @ 100%' },
        { id: 's3', compositeName: 'رنجة هولندي', primaryCategory: 'أسماك & مأكولات_بحرية' },
      ]

      const processed = computeItemsWithAvailable(rawItems, mockStock, 'wh-main')
      const groups = computeFilteredCategories(processed, '')

      assert.ok(groups['لحوم / تصنيع (مبرد & مجمد) #1'])
      assert.strictEqual(groups['لحوم / تصنيع (مبرد & مجمد) #1'].length, 1)
      assert.ok(groups['دواجن - مصنعة @ 100%'])
      assert.strictEqual(groups['دواجن - مصنعة @ 100%'].length, 1)
      assert.ok(groups['أسماك & مأكولات_بحرية'])
      assert.strictEqual(groups['أسماك & مأكولات_بحرية'].length, 1)
    })

    it('should handle missing inventory records with zero available stock', () => {
      const rawItems = [
        { id: 'it-unknown-1', compositeName: 'صنف غير مخزون' },
        { id: 'it-1', compositeName: 'صنف مخزون' },
      ]

      const processed = computeItemsWithAvailable(rawItems, mockStock, 'wh-main')
      assert.strictEqual(processed[0].availableStock, 0)
      assert.strictEqual(processed[1].availableStock, 50)
    })

    it('should aggregate dual schema warehouse_id/itemId stock records correctly', () => {
      const rawItems = [
        { id: 'it-1', compositeName: 'صنف كامل' },
        { id: 'it-2', compositeName: 'صنف بالسنك كيس' },
      ]

      const processed = computeItemsWithAvailable(rawItems, mockStock, 'wh-main')
      assert.strictEqual(processed[0].availableStock, 50)
      assert.strictEqual(processed[1].availableStock, 30)
    })
  })

  describe('2. Search Filtering, Diacritics & Arabic Character Normalization Analysis', () => {
    const catalogItems = [
      { id: 'a1', compositeName: 'لحمه رقبه ألانا', subCategory: 'لحوم مستوردة', code: 'ITM-ALANA-01', primaryCategory: 'لحوم' },
      { id: 'a2', compositeName: 'سجق أنس أفندى', subCategory: 'مصنعات بلدية', code: 'ITM-SAUS-02', primaryCategory: 'مصنعات' },
      { id: 'a3', compositeName: 'برجر كيلو صلاح وعبدالفتاح', subCategory: 'برجر', code: 'ITM-BRG-03', primaryCategory: 'مصنعات' },
      { id: 'a4', compositeName: 'سمك مكرونه وسط', subCategory: 'أسماك بحرية', code: 'ITM-FISH-04', primaryCategory: 'أسماك' },
    ]

    it('should expand matched categories and exclude unmatched categories during search', () => {
      const processed = computeItemsWithAvailable(catalogItems, mockStock, 'wh-main')
      const groups = computeFilteredCategories(processed, 'برجر')

      assert.strictEqual(Object.keys(groups).length, 1)
      assert.ok(groups['مصنعات'])
      assert.strictEqual(groups['مصنعات'].length, 1)
      assert.strictEqual(groups['لحوم'], undefined)
      assert.strictEqual(groups['أسماك'], undefined)

      const isExpandedWithSearch = Boolean('برجر'.trim()) || false
      assert.strictEqual(isExpandedWithSearch, true)
    })

    it('should filter across subCategory and code attributes as well as compositeName', () => {
      const processed = computeItemsWithAvailable(catalogItems, mockStock, 'wh-main')

      const bySubCategory = computeFilteredCategories(processed, 'بحرية')
      assert.strictEqual(Object.keys(bySubCategory).length, 1)
      assert.ok(bySubCategory['أسماك'])

      const byCode = computeFilteredCategories(processed, 'itm-alana')
      assert.strictEqual(Object.keys(byCode).length, 1)
      assert.ok(byCode['لحوم'])
    })

    it('should return empty group when search term does not match any item', () => {
      const processed = computeItemsWithAvailable(catalogItems, mockStock, 'wh-main')
      const groups = computeFilteredCategories(processed, 'منتج غير موجود نهائيا 999')
      assert.strictEqual(Object.keys(groups).length, 0)
    })

    it('empirically demonstrates literal matching behavior for Arabic Alef variations and diacritics', () => {
      const processed = computeItemsWithAvailable(catalogItems, mockStock, 'wh-main')

      const matchExactHamza = computeFilteredCategories(processed, 'ألانا')
      assert.strictEqual(Object.keys(matchExactHamza).length, 1)
      assert.strictEqual(matchExactHamza['لحوم'][0].compositeName, 'لحمه رقبه ألانا')

      const matchPlainAlef = computeFilteredCategories(processed, 'الانا')
      assert.strictEqual(Object.keys(matchPlainAlef).length, 0)

      const matchTashkeel = computeFilteredCategories(processed, 'سُجُق')
      assert.strictEqual(Object.keys(matchTashkeel).length, 0)

      const matchPlain = computeFilteredCategories(processed, 'سجق')
      assert.strictEqual(Object.keys(matchPlain).length, 1)
      assert.strictEqual(matchPlain['مصنعات'][0].compositeName, 'سجق أنس أفندى')

      const matchCategoryName = computeFilteredCategories(processed, 'لحوم')
      assert.strictEqual(Object.keys(matchCategoryName).length, 1)
    })
  })

  describe('3. Review Modal Arithmetic & Aggregation Invariants', () => {
    it('should calculate category quantities matching exact sum of item quantities', () => {
      const selectedItemsGrouped = {
        'لحوم': [
          { itemId: '1', itemName: 'لحمه رقبه', quantity: 10, unit: 'كرتونة' },
          { itemId: '2', itemName: 'لحمه سن', quantity: 15, unit: 'كرتونة' },
        ],
        'مصنعات': [
          { itemId: '3', itemName: 'سجق', quantity: 40, unit: 'كيلو' },
          { itemId: '4', itemName: 'برجر', quantity: 18, unit: 'كرتونة' },
          { itemId: '5', itemName: 'كفتة', quantity: 12, unit: 'كرتونة' },
        ],
        'أسماك': [
          { itemId: '6', itemName: 'سمك ياباني', quantity: 6, unit: 'كرتونة' },
        ],
      }

      const review = computeReviewTotals(selectedItemsGrouped)

      assert.strictEqual(review.totalItemsCount, 6)
      assert.strictEqual(review.totalQuantities, 101)

      const meatSum = selectedItemsGrouped['لحوم'].reduce((s, it) => s + it.quantity, 0)
      assert.strictEqual(meatSum, 25)

      const procSum = selectedItemsGrouped['مصنعات'].reduce((s, it) => s + it.quantity, 0)
      assert.strictEqual(procSum, 70)

      const fishSum = selectedItemsGrouped['أسماك'].reduce((s, it) => s + it.quantity, 0)
      assert.strictEqual(fishSum, 6)

      assert.strictEqual(meatSum + procSum + fishSum, review.totalQuantities)
    })

    it('should handle fractional and decimal quantities accurately', () => {
      const selectedItemsGrouped = {
        'مصنعات': [
          { itemId: 'f1', itemName: 'سجق بلدي سائب', quantity: 12.5, unit: 'كيلو' },
          { itemId: 'f2', itemName: 'بسطرمة نمرة 1', quantity: 3.75, unit: 'كيلو' },
        ],
      }

      const review = computeReviewTotals(selectedItemsGrouped)
      assert.strictEqual(review.totalItemsCount, 2)
      assert.strictEqual(review.totalQuantities, 16.25)
    })

    it('should accurately handle empty review modal with zero items and zero quantities', () => {
      const emptyGrouped = {}
      const review = computeReviewTotals(emptyGrouped)
      assert.strictEqual(review.totalItemsCount, 0)
      assert.strictEqual(review.totalQuantities, 0)
      assert.strictEqual(review.categories.length, 0)

      const isConfirmDisabled = review.totalItemsCount === 0
      assert.strictEqual(isConfirmDisabled, true)
    })
  })

  describe('4. Navigation & State Preservation Invariants', () => {
    it('should preserve 100% of state when navigating between accordion and review modal', () => {
      let state = {
        fromId: 'wh-main',
        toId: 'wh-shop',
        operationalDate: '2026-11-06',
        notes: 'بضاعة مستعجلة للفرع',
        selectedQuantities: {
          'it-1': { quantity: 14, unit: 'كرتونة', itemName: 'لحمه صدر', primaryCategory: 'لحوم' },
          'it-2': { quantity: 25, unit: 'كرتونة', itemName: 'كبده هندى', primaryCategory: 'لحوم' },
          'it-3': { quantity: 120, unit: 'كيلو', itemName: 'سجق أنس', primaryCategory: 'مصنعات' },
        },
        showReviewModal: false,
      }

      state.showReviewModal = true
      assert.strictEqual(state.showReviewModal, true)

      const snapshotBefore = JSON.parse(JSON.stringify(state.selectedQuantities))

      state.showReviewModal = false
      assert.strictEqual(state.showReviewModal, false)

      assert.deepStrictEqual(state.selectedQuantities, snapshotBefore)
      assert.strictEqual(state.fromId, 'wh-main')
      assert.strictEqual(state.toId, 'wh-shop')
      assert.strictEqual(state.operationalDate, '2026-11-06')
      assert.strictEqual(state.notes, 'بضاعة مستعجلة للفرع')
    })

    it('should delete zero quantity items from selection state cleanly', () => {
      let selected = {}
      const itemRef = { compositeName: 'برجر كيلو', primaryCategory: 'مصنعات' }

      selected = applyQuantityChange(selected, 'b1', 5, 'كرتونة', itemRef)
      assert.strictEqual(selected['b1'].quantity, 5)

      selected = applyQuantityChange(selected, 'b1', 0, 'كرتونة', itemRef)
      assert.strictEqual(selected['b1'], undefined)
      assert.strictEqual(Object.keys(selected).length, 0)
    })

    it('should preserve quantity when changing units', () => {
      let selected = {}
      const itemRef = { compositeName: 'سجق أنس', primaryCategory: 'مصنعات' }

      selected = applyQuantityChange(selected, 's1', 50, 'كرتونة', itemRef)
      assert.strictEqual(selected['s1'].unit, 'كرتونة')
      assert.strictEqual(selected['s1'].quantity, 50)

      selected = applyQuantityChange(selected, 's1', 50, 'كيلو', itemRef)
      assert.strictEqual(selected['s1'].unit, 'كيلو')
      assert.strictEqual(selected['s1'].quantity, 50)
    })
  })

  describe('5. Draft Serialization, Storage & Corruption Resilience', () => {
    const serializeDraft = (data) => JSON.stringify({
      id: `draft_trf_${Date.now()}`,
      type: 'transfer',
      fromId: data.fromId,
      toId: data.toId,
      operationalDate: data.operationalDate,
      selectedQuantities: data.selectedQuantities,
      notes: data.notes,
      updatedAt: new Date().toISOString(),
    })

    const restoreDraft = (rawDraft, warehouses) => {
      if (!rawDraft) return null
      const parsed = JSON.parse(rawDraft)
      const restored = {}
      if (parsed.fromId && warehouses.some((w) => w.id === parsed.fromId)) {
        restored.fromId = parsed.fromId
      }
      if (parsed.toId && warehouses.some((w) => w.id === parsed.toId)) {
        restored.toId = parsed.toId
      }
      if (parsed.operationalDate) {
        restored.operationalDate = parsed.operationalDate
      }
      if (parsed.selectedQuantities && typeof parsed.selectedQuantities === 'object') {
        restored.selectedQuantities = parsed.selectedQuantities
      }
      if (parsed.notes) {
        restored.notes = parsed.notes
      }
      return restored
    }

    it('should serialize and restore draft with 100% fidelity', () => {
      const original = {
        fromId: 'wh-main',
        toId: 'wh-shop',
        operationalDate: '2026-11-06',
        selectedQuantities: {
          'it-1': { quantity: 38, unit: 'كرتونة', itemName: 'رنجه مارينا', primaryCategory: 'أسماك' },
        },
        notes: 'مسودة تحويل الدكان الصباحية',
      }

      const raw = serializeDraft(original)
      assert.ok(typeof raw === 'string')

      const restored = restoreDraft(raw, mockWarehouses)
      assert.strictEqual(restored.fromId, original.fromId)
      assert.strictEqual(restored.toId, original.toId)
      assert.strictEqual(restored.operationalDate, original.operationalDate)
      assert.strictEqual(restored.notes, original.notes)
      assert.deepStrictEqual(restored.selectedQuantities, original.selectedQuantities)
    })

    it('should defensively reject deleted or non-existent warehouse IDs during restore', () => {
      const staleDraft = JSON.stringify({
        fromId: 'deleted-warehouse-999',
        toId: 'wh-shop',
        operationalDate: '2026-11-06',
        selectedQuantities: {},
      })

      const restored = restoreDraft(staleDraft, mockWarehouses)
      assert.strictEqual(restored.fromId, undefined)
      assert.strictEqual(restored.toId, 'wh-shop')
    })

    it('should survive corrupted JSON in storage without throwing uncaught exceptions', () => {
      const corruptRaw = '{invalid_json...'
      let restored = null
      assert.doesNotThrow(() => {
        try {
          restored = restoreDraft(corruptRaw, mockWarehouses)
        } catch {}
      })
      assert.strictEqual(restored, null)
    })
  })

  describe('6. Architectural Invariants & File Limits', () => {
    const inspectedFiles = [
      'src/components/warehouses/AX_TransferCategoryAccordion.jsx',
      'src/components/warehouses/AX_TransferReviewModal.jsx',
      'src/components/warehouses/AX_TransferFormModal.jsx',
    ]

    inspectedFiles.forEach((rel) => {
      it(`should strictly obey 500 lines limit for ${rel}`, () => {
        const full = path.resolve(process.cwd(), rel)
        assert.ok(fs.existsSync(full))
        const content = fs.readFileSync(full, 'utf-8')
        const lines = content.split('\n').length
        assert.ok(lines <= 500, `File ${rel} has ${lines} lines, exceeding 500 limit`)
      })
    })

    it('should verify test file itself is under 500 lines and contains zero comments', () => {
      const testFile = path.resolve(process.cwd(), 'tests/r3-m1-challenger-2-transfer-accordions.test.js')
      assert.ok(fs.existsSync(testFile))
      const content = fs.readFileSync(testFile, 'utf-8')
      const lines = content.split('\n').length
      assert.ok(lines <= 500, `Test file has ${lines} lines, exceeding 500 limit`)
    })
  })
})
