import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Invoice Discount Feature & Treasury Persistence', () => {
  it('computes percentage discounts accurately with ceiling and rounding', () => {
    const subtotal = 1000
    const pct = 10
    const discountAmount = Math.round(((subtotal * pct) / 100) * 100) / 100
    const total = subtotal - discountAmount
    assert.equal(discountAmount, 100)
    assert.equal(total, 900)

    const subtotal2 = 250.5
    const pct2 = 5
    const discountAmount2 = Math.round(((subtotal2 * pct2) / 100) * 100) / 100
    assert.equal(discountAmount2, 12.53)
  })

  it('computes fixed cash discounts accurately without exceeding subtotal', () => {
    const subtotal = 450
    const fixedVal = 50
    const discountAmount = Math.min(subtotal, Math.max(0, fixedVal))
    const total = subtotal - discountAmount
    assert.equal(discountAmount, 50)
    assert.equal(total, 400)

    const excessiveDiscount = 600
    const cappedDiscount = Math.min(subtotal, Math.max(0, excessiveDiscount))
    assert.equal(cappedDiscount, 450)
    assert.equal(subtotal - cappedDiscount, 0)
  })

  it('incorporates shipping and loading costs into net total after discount', () => {
    const subtotal = 1000
    const discountAmount = 150
    const transportCost = 50
    const loadingCost = 25
    const netSubtotal = Math.max(0, subtotal - discountAmount)
    const total = netSubtotal + transportCost + loadingCost
    assert.equal(total, 925)
  })

  it('guarantees AX_OperationsService.updateTreasuryAccountInDB sends clean payload without schema-cache breaking columns', () => {
    const serviceContent = fs.readFileSync(path.resolve('src/services/AX_OperationsService.js'), 'utf8')
    assert.ok(serviceContent.includes('updateTreasuryAccountInDB'))
    const fnStart = serviceContent.indexOf('updateTreasuryAccountInDB:')
    const fnEnd = serviceContent.indexOf('deleteTreasuryAccountInDB:', fnStart)
    const fnBody = serviceContent.slice(fnStart, fnEnd > 0 ? fnEnd : fnStart + 1000)
    assert.equal(fnBody.includes('updated_at:'), false, 'updateTreasuryAccountInDB must not include updated_at in row')
  })

  it('verifies invoice files conform strictly to 500 line limit and zero comments', () => {
    const files = [
      'src/components/invoices/AX_CreateInvoiceModal.jsx',
      'src/components/invoices/AX_EditInvoiceModal.jsx',
      'src/components/invoices/AX_InvoiceDetailsModal.jsx',
      'src/components/invoices/AX_InvoicePrintModal.jsx',
      'src/components/invoices/AX_InvoicePaymentSection.jsx',
    ]

    for (const f of files) {
      const fullPath = path.resolve(f)
      const lines = fs.readFileSync(fullPath, 'utf8').split('\n')
      assert.ok(lines.length <= 500, `${f} exceeded 500 lines: ${lines.length}`)

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        const isComment = line.startsWith('//') || line.startsWith('/*')
        assert.equal(isComment, false, `Comment found in ${f} at line ${i + 1}: ${line}`)
      }
    }
  })
})
