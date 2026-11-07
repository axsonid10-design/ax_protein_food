import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatDualUnits,
  isItemPackagingIncomplete,
  isItemMinAlertMissing,
  isItemNearDepletion,
} from '../src/utils/itemUnitFormatters.js'

describe('Dual-Unit Formatting and Stock Depletion Status Rules', () => {
  it('formats dual units correctly for carton with pieces and custom sub-unit', () => {
    const item = {
      unitType: 'كرتونة',
      subUnitType: 'كيس',
      piecesPerCarton: 20,
    }
    const result = formatDualUnits(5, 'كرتونة', item)
    assert.equal(result, '5 كرتونة (100 كيس)')
  })

  it('formats dual units correctly for sub-unit bags/pieces converting to cartons', () => {
    const item = {
      unitType: 'كرتونة',
      subUnitType: 'كيس',
      piecesPerCarton: 20,
    }
    const result = formatDualUnits(20, 'كيس', item)
    assert.equal(result, '20 كيس (1 كرتونة)')

    const result2 = formatDualUnits(30, 'كيس', { ...item, piecesPerCarton: 10 })
    assert.equal(result2, '30 كيس (3 كرتونة)')

    const resultFraction = formatDualUnits(20, 'كيس', { ...item, piecesPerCarton: 8 })
    assert.equal(resultFraction, '20 كيس (2.5 كرتونة)')
  })

  it('formats dual units for weight per carton when pieces not configured', () => {
    const item = {
      unitType: 'كرتونة',
      weightPerCarton: 10,
    }
    const result = formatDualUnits(4, 'كرتونة', item)
    assert.equal(result, '4 كرتونة (40 كجم)')
  })

  it('formats single kilo unit without carton conversion', () => {
    const item = {
      unitType: 'كيلو',
    }
    const result = formatDualUnits(50, 'كيلو', item)
    assert.equal(result, '50 كجم')
  })

  it('accurately identifies incomplete packaging definitions for yellow dot alert', () => {
    // Carton missing sub-unit and conversions
    assert.equal(isItemPackagingIncomplete({ unitType: 'كرتونة' }), true)
    // Carton missing pieces and weight
    assert.equal(isItemPackagingIncomplete({ unitType: 'كرتونة', subUnitType: 'كيس' }), true)
    // Fully configured carton
    assert.equal(isItemPackagingIncomplete({ unitType: 'كرتونة', subUnitType: 'كيس', piecesPerCarton: 20 }), false)
    assert.equal(isItemPackagingIncomplete({ unitType: 'كرتونة', subUnitType: 'كيلو', weightPerCarton: 10 }), false)
    // Single unit item (kilo)
    assert.equal(isItemPackagingIncomplete({ unitType: 'كيلو' }), false)
  })

  it('accurately detects missing min stock alert for red dot alert', () => {
    assert.equal(isItemMinAlertMissing({ minStockAlert: null }), true)
    assert.equal(isItemMinAlertMissing({ minStockAlert: undefined }), true)
    assert.equal(isItemMinAlertMissing({ minStockAlert: '' }), true)
    assert.equal(isItemMinAlertMissing({ minStockAlert: 10 }), false)
    assert.equal(isItemMinAlertMissing({ min_stock_alert: 5 }), false)
  })

  it('triggers near depletion active alert when stock falls to or below threshold', () => {
    const item = { minStockAlert: 15 }
    // Stock <= minStockAlert
    assert.equal(isItemNearDepletion(item, 10), true)
    assert.equal(isItemNearDepletion(item, 15), true)
    // Stock > minStockAlert
    assert.equal(isItemNearDepletion(item, 20), false)
    // Threshold not defined
    assert.equal(isItemNearDepletion({ minStockAlert: null }, 5), false)
  })
})
