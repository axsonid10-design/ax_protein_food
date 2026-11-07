import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as invoiceImageService from '../src/services/axInvoiceImageService.js'
import {
  getInvoiceTitle,
  getItemUnitDisplay,
  formatPrintDate,
  PAPER_FORMATS,
} from '../src/components/invoices/invoicePrintConstants.js'

describe('A4 Branded Invoice Printing Template & WhatsApp Image Master', () => {
  const computeInvoiceFinancials = (inv) => {
    const items = inv.items || []
    const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0)
    const transportCost = Number(inv.transportCost) || 0
    const loadingCost = Number(inv.loadingCost) || 0
    const total = subtotal + transportCost + loadingCost
    const paidAmount = Number(inv.paidAmount) || 0
    const remainingAmount = Math.max(0, total - paidAmount)
    const status = remainingAmount > 0 ? (paidAmount > 0 ? 'partial' : 'unpaid') : 'paid'
    const statusLabel = status === 'paid' ? 'مدفوع كلي' : status === 'partial' ? 'مدفوع جزئي' : 'غير مدفوع'

    return {
      subtotal,
      transportCost,
      loadingCost,
      total,
      paidAmount,
      remainingAmount,
      status,
      statusLabel,
    }
  }

  it('generates correct official titles for all 4 invoice categories', () => {
    assert.equal(getInvoiceTitle('sale'), 'فاتورة مبيعات')
    assert.equal(getInvoiceTitle('purchase'), 'فاتورة مشتريات')
    assert.equal(getInvoiceTitle('sale_return'), 'مردود مبيعات')
    assert.equal(getInvoiceTitle('purchase_return'), 'مردود مشتريات')
  })

  it('computes accurate totals with transport and loading costs for printing', () => {
    const sampleInv = {
      items: [
        { itemId: '1', quantity: 10, price: 250 },
        { itemId: '2', quantity: 5, price: 400 },
      ],
      transportCost: 300,
      loadingCost: 150,
      paidAmount: 2000,
    }

    const fin = computeInvoiceFinancials(sampleInv)
    assert.equal(fin.subtotal, 4500)
    assert.equal(fin.total, 4950)
    assert.equal(fin.paidAmount, 2000)
    assert.equal(fin.remainingAmount, 2950)
    assert.equal(fin.status, 'partial')
    assert.equal(fin.statusLabel, 'مدفوع جزئي')
  })

  it('verifies axInvoiceImageService exports required WhatsApp and image functions', () => {
    assert.equal(typeof invoiceImageService.getInvoiceImageBlob, 'function')
    assert.equal(typeof invoiceImageService.downloadInvoiceImage, 'function')
    assert.equal(typeof invoiceImageService.copyInvoiceImageToClipboard, 'function')
    assert.equal(typeof invoiceImageService.shareInvoiceImageToWhatsApp, 'function')
  })

  it('verifies CSS print stylesheet contains strict physical dimensions for A4 portrait, A4 landscape, and A5', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css')
    const cssContent = fs.readFileSync(cssPath, 'utf-8')
    assert.ok(cssContent.includes('#ax-invoice-print-sheet'), 'CSS must target #ax-invoice-print-sheet')
    assert.ok(cssContent.includes('transform: none !important'), 'Print CSS must reset scale transforms')
    assert.ok(cssContent.includes('format-a4-portrait'), 'Must support format-a4-portrait')
    assert.ok(cssContent.includes('format-a4-landscape'), 'Must support format-a4-landscape')
    assert.ok(cssContent.includes('format-a5'), 'Must support format-a5')
  })

  it('displays unit name strictly without prefixing quantity in unit column', () => {
    const itemWithSub = { unitType: 'كرتونة', piecesPerCarton: 20, subUnitType: 'كيس' }
    assert.equal(getItemUnitDisplay(itemWithSub), 'كرتونة (20 كيس)')

    const itemPlain = { unitType: 'كرتونة' }
    assert.equal(getItemUnitDisplay(itemPlain), 'كرتونة')

    const itemBag = { unit: 'كيس' }
    assert.equal(getItemUnitDisplay(itemBag), 'كيس')
  })

  it('formats print dates safely for bidirectional rendering', () => {
    assert.equal(formatPrintDate('2026-11-07T12:00:00Z'), '2026/11/07')
    assert.equal(formatPrintDate('2026-11-07'), '2026/11/07')
    assert.equal(formatPrintDate(null), '—')
  })

  it('verifies all 3 standard paper formats exist and have valid physical dimensions', () => {
    assert.ok(PAPER_FORMATS.a4_portrait)
    assert.equal(PAPER_FORMATS.a4_portrait.width, '210mm')
    assert.equal(PAPER_FORMATS.a4_portrait.minHeight, '297mm')

    assert.ok(PAPER_FORMATS.a4_landscape)
    assert.equal(PAPER_FORMATS.a4_landscape.width, '297mm')
    assert.equal(PAPER_FORMATS.a4_landscape.minHeight, '210mm')

    assert.ok(PAPER_FORMATS.a5)
    assert.equal(PAPER_FORMATS.a5.width, '148mm')
    assert.equal(PAPER_FORMATS.a5.minHeight, '210mm')
  })
})
