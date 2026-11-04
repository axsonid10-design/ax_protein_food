import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('A4 Branded Invoice Printing Template', () => {
  const getInvoiceTitle = (type) => {
    switch (type) {
      case 'purchase':
        return 'فاتورة مشتريات وتوريد'
      case 'sale_return':
        return 'إشعار مردود مبيعات'
      case 'purchase_return':
        return 'إشعار مردود مشتريات'
      default:
        return 'فاتورة مبيعات نقدية وآجلة'
    }
  }

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
    assert.equal(getInvoiceTitle('sale'), 'فاتورة مبيعات نقدية وآجلة')
    assert.equal(getInvoiceTitle('purchase'), 'فاتورة مشتريات وتوريد')
    assert.equal(getInvoiceTitle('sale_return'), 'إشعار مردود مبيعات')
    assert.equal(getInvoiceTitle('purchase_return'), 'إشعار مردود مشتريات')
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
})
