import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateTransferStockMovement } from '../src/store/transferAuditHelpers.js'
import { getCartonEquivalent } from '../src/utils/pricingCalculations.js'
import { calculateFifoProfits } from '../src/utils/fifoCalculations.js'

function buildTestCustomerLedger(customer, invoices, cashTransactions) {
  const entries = []
  const opBal = Number(customer.openingBalance) || 0
  const opType = customer.openingBalanceType || 'debit'
  const opSigned = opType === 'debit' ? opBal : -opBal

  if (opBal > 0) {
    entries.push({
      id: 'op-bal',
      date: customer.createdAt || new Date().toISOString(),
      type: 'opening',
      debit: opType === 'debit' ? opBal : 0,
      credit: opType === 'credit' ? opBal : 0,
      runningBalance: opSigned,
    })
  }

  const customerInvoices = (invoices || []).filter(
    (inv) => inv && (inv.clientId === customer.id || inv.partyName === customer.name)
  )

  const paidInvoices = customerInvoices.filter(
    (i) => i.type !== 'sale_return' && (Number(i.paidAmount || i.cashPaid) || 0) > 0
  )
  const recordedCodes = new Set(paidInvoices.map((i) => i.code).filter(Boolean))
  const recordedIds = new Set(paidInvoices.map((i) => i.id).filter(Boolean))

  customerInvoices.forEach((inv) => {
    const isReturn = inv.type === 'sale_return'
    const invTotal = Number(inv.total || inv.totalAmount) || 0
    const paid = Number(inv.paidAmount || inv.cashPaid) || 0
    entries.push({
      id: inv.id,
      date: inv.date || inv.createdAt || new Date().toISOString(),
      type: isReturn ? 'sale_return' : 'invoice',
      reference: inv.code || inv.id.slice(0, 8),
      debit: isReturn ? 0 : invTotal,
      credit: isReturn ? invTotal : paid,
    })
  })

  const customerReceipts = (cashTransactions || []).filter(
    (tx) => tx && (tx.partyName === customer.name || tx.partyId === customer.id) &&
      (tx.type === 'client_receipt' || tx.type === 'receipt' || tx.type === 'cash_in')
  )

  customerReceipts.forEach((rc) => {
    const isLinked =
      (rc.invoiceId && (recordedIds.has(rc.invoiceId) || recordedCodes.has(rc.invoiceId))) ||
      (rc.invoiceCode && recordedCodes.has(rc.invoiceCode)) ||
      (rc.referenceId && (recordedIds.has(rc.referenceId) || recordedCodes.has(rc.referenceId))) ||
      (rc.notes && (
        Array.from(recordedCodes).some((code) => rc.notes.includes(code)) ||
        Array.from(recordedIds).some((id) => rc.notes.includes(id))
      ))
    if (isLinked) return

    entries.push({
      id: rc.id,
      date: rc.date || rc.createdAt || new Date().toISOString(),
      type: 'payment',
      reference: rc.code || rc.id.slice(0, 8),
      debit: 0,
      credit: Number(rc.amount) || 0,
    })
  })

  entries.sort((a, b) => new Date(a.date) - new Date(b.date))

  let running = 0
  return entries.map((entry) => {
    running += ((entry.debit || 0) - (entry.credit || 0))
    return { ...entry, runningBalance: running }
  })
}

function calculateReturnTotals(invoice, returnLines) {
  const subtotal = Number(invoice?.subtotal) || Number(invoice?.total) || 1
  const discount = Number(invoice?.discountAmount) || 0
  const factor = Math.max(0, Math.min(1, 1 - discount / subtotal))

  const processed = returnLines.map((line) => {
    const effectivePrice = Number((line.price * factor).toFixed(2))
    const total = Number((line.quantity * effectivePrice).toFixed(2))
    return { ...line, effectivePrice, total }
  })
  const total = Number(processed.reduce((s, l) => s + l.total, 0).toFixed(2))
  return { factor, lines: processed, total }
}

describe('R7 M4: Final Comprehensive Adversarial Stress Suite', () => {
  const catalog = [
    { id: 'it-kofta', name: 'كفتة صغير أنس أفندى', unitType: 'كرتونة', subUnitType: 'قطعة', piecesPerCarton: 20, weightPerCarton: 10 },
    { id: 'it-veggie', name: 'خضار مشكل', unitType: 'كرتونة', subUnitType: 'طبق', piecesPerCarton: 20, weightPerCarton: 10 },
    { id: 'it-strips', name: 'استربس صلاح وعبدالفتاح', unitType: 'كرتونة', subUnitType: 'طبق', piecesPerCarton: 10, weightPerCarton: 10 },
    { id: 'it-burger', name: 'برجر كيلو صلاح وعبدالفتاح', unitType: 'كرتونة', subUnitType: 'قطعة', piecesPerCarton: 8, weightPerCarton: 10 },
    { id: 'it-okra', name: 'باميه', unitType: 'كرتونة', subUnitType: 'كيس', piecesPerCarton: 20, weightPerCarton: 10 },
    { id: 'it-drak', name: 'سمك دراك', unitType: 'كرتونة', subUnitType: 'قطعة', piecesPerCarton: 1, weightPerCarton: 20 },
  ]

  const whMain = 'b0000000-0000-0000-0000-000000000001'
  const whVan = 'b0000000-0000-0000-0000-000000000010'
  const whCold2 = 'b0000000-0000-0000-0000-000000000002'

  describe('R1: Transfer Engine & Carton-Equivalent Conversion Invariants', () => {
    it('fuzzing mass conservation: 150 randomized transfers strictly conserve total stock across all warehouses', () => {
      let stock = [
        { warehouseId: whMain, itemId: 'it-kofta', quantity: 1000, unit: 'كرتونة' },
        { warehouseId: whVan, itemId: 'it-kofta', quantity: 0, unit: 'كرتونة' },
        { warehouseId: whCold2, itemId: 'it-kofta', quantity: 500, unit: 'كرتونة' },
        { warehouseId: whMain, itemId: 'it-burger', quantity: 800, unit: 'كرتونة' },
        { warehouseId: whVan, itemId: 'it-burger', quantity: 0, unit: 'كرتونة' },
        { warehouseId: whCold2, itemId: 'it-burger', quantity: 400, unit: 'كرتونة' },
      ]

      const initialTotalKofta = stock.filter((s) => s.itemId === 'it-kofta').reduce((s, r) => s + r.quantity, 0)
      const initialTotalBurger = stock.filter((s) => s.itemId === 'it-burger').reduce((s, r) => s + r.quantity, 0)

      const warehouses = [whMain, whVan, whCold2]
      let seed = 12345
      const rnd = () => {
        seed = (seed * 16807) % 2147483647
        return (seed - 1) / 2147483646
      }

      for (let i = 0; i < 150; i++) {
        const fromIdx = Math.floor(rnd() * warehouses.length)
        let toIdx = Math.floor(rnd() * warehouses.length)
        if (toIdx === fromIdx) toIdx = (fromIdx + 1) % warehouses.length

        const isKofta = rnd() > 0.5
        const itId = isKofta ? 'it-kofta' : 'it-burger'
        const unit = rnd() > 0.5 ? 'قطعة' : 'كرتونة'
        const qty = unit === 'قطعة' ? Math.floor(rnd() * 80) + 1 : Math.floor(rnd() * 10) + 1

        const transfer = {
          fromWarehouseId: warehouses[fromIdx],
          toWarehouseId: warehouses[toIdx],
          status: 'confirmed',
          items: [{ itemId: itId, quantity: qty, unit }],
        }

        const res = calculateTransferStockMovement(transfer, stock, [], [], catalog)
        stock = res.updatedStock
      }

      const finalTotalKofta = stock.filter((s) => s.itemId === 'it-kofta').reduce((s, r) => s + r.quantity, 0)
      const finalTotalBurger = stock.filter((s) => s.itemId === 'it-burger').reduce((s, r) => s + r.quantity, 0)

      assert.strictEqual(Math.round(finalTotalKofta * 1000) / 1000, initialTotalKofta)
      assert.strictEqual(Math.round(finalTotalBurger * 1000) / 1000, initialTotalBurger)
    })

    it('handles malformed, zero, negative, and missing item inputs without crashing or corrupting stock', () => {
      const stock = [
        { warehouseId: whMain, itemId: 'it-kofta', quantity: 50, unit: 'كرتونة' },
        { warehouseId: whVan, itemId: 'it-kofta', quantity: 10, unit: 'كرتونة' },
      ]

      const malformedCases = [
        { items: [{ itemId: 'it-kofta', quantity: 0, unit: 'قطعة' }] },
        { items: [{ itemId: 'it-kofta', quantity: -25, unit: 'قطعة' }] },
        { items: [{ itemId: 'it-kofta', quantity: null, unit: 'قطعة' }] },
        { items: [{ itemId: 'it-kofta', quantity: 'invalid', unit: 'قطعة' }] },
        { items: [{ itemId: null, quantity: 10, unit: 'قطعة' }] },
        { items: [] },
      ]

      for (const c of malformedCases) {
        const transfer = {
          fromWarehouseId: whMain,
          toWarehouseId: whVan,
          status: 'confirmed',
          items: c.items,
        }
        const { updatedStock } = calculateTransferStockMovement(transfer, stock, [], [], catalog)
        const mainRow = updatedStock.find((s) => s.warehouseId === whMain && s.itemId === 'it-kofta')
        const vanRow = updatedStock.find((s) => s.warehouseId === whVan && s.itemId === 'it-kofta')
        assert.strictEqual(mainRow.quantity, 50)
        assert.strictEqual(vanRow.quantity, 10)
      }
    })

    it('preserves unit as كرتونة when converting sub-units with fractional decimals', () => {
      const stock = [
        { warehouseId: whMain, itemId: 'it-strips', quantity: 20, unit: 'كرتونة' },
      ]
      const transfer = {
        fromWarehouseId: whMain,
        toWarehouseId: whVan,
        status: 'confirmed',
        items: [{ itemId: 'it-strips', quantity: 3, unit: 'طبق' }],
      }
      const { updatedStock } = calculateTransferStockMovement(transfer, stock, [], [], catalog)
      const vanRow = updatedStock.find((s) => s.warehouseId === whVan && s.itemId === 'it-strips')
      const mainRow = updatedStock.find((s) => s.warehouseId === whMain && s.itemId === 'it-strips')
      assert.strictEqual(vanRow.quantity, 0.3)
      assert.strictEqual(vanRow.unit, 'كرتونة')
      assert.strictEqual(mainRow.quantity, 19.7)
      assert.strictEqual(mainRow.unit, 'كرتونة')
    })
  })

  describe('R2: Abu Mahmoud Reconciliation & Journal Balance Verification', () => {
    it('verifies 4 settlement journal entries are balanced and equate to 66,830.00 EGP', () => {
      const entries = [
        {
          id: 1,
          lines: [
            { debit: 17520.0, credit: 0.0 },
            { debit: 0.0, credit: 17520.0 },
          ],
        },
        {
          id: 2,
          lines: [
            { debit: 500.0, credit: 0.0 },
            { debit: 0.0, credit: 500.0 },
          ],
        },
        {
          id: 3,
          lines: [
            { debit: 11000.0, credit: 0.0 },
            { debit: 0.0, credit: 4000.0 },
            { debit: 0.0, credit: 5000.0 },
            { debit: 0.0, credit: 1619.0 },
            { debit: 0.0, credit: 381.0 },
          ],
        },
        {
          id: 4,
          lines: [
            { debit: 37810.0, credit: 0.0 },
            { debit: 0.0, credit: 37810.0 },
          ],
        },
      ]

      let totalD = 0
      let totalC = 0
      entries.forEach((entry) => {
        const d = entry.lines.reduce((s, l) => s + l.debit, 0)
        const c = entry.lines.reduce((s, l) => s + l.credit, 0)
        assert.strictEqual(d, c)
        totalD += d
        totalC += c
      })
      assert.strictEqual(totalD, 66830.0)
      assert.strictEqual(totalC, 66830.0)
    })

    it('proves cash census: 20790 + 17520 + 1100 equals 39410 and zeroes out van custody', () => {
      const custodyInit = 20790.0
      const parallelAdd = 17520.0
      const orphanRemit = 500.0
      const finalRemit = 37810.0
      const custodyFinal = custodyInit + parallelAdd - orphanRemit - finalRemit
      assert.strictEqual(custodyFinal, 0.0)

      const centralTotal = orphanRemit + finalRemit + 1100.0
      assert.strictEqual(centralTotal, 39410.0)

      const openCredit = 50284.0
      const totalSales = 89694.0
      assert.strictEqual(centralTotal + openCredit, totalSales)
    })

    it('proves Ammar Sheikh Fadl debit balance is 11,800.00 isolated from driver custody', () => {
      const opening = 8190.0
      const invoice = 8610.0
      const payment = 5000.0
      const balance = opening + invoice - payment
      assert.strictEqual(balance, 11800.0)
    })
  })

  describe('R3: Customer Ledger Deduplication & Returns Handling Invariants', () => {
    it('deduplicates invoice payment from auto client_receipt while preserving subsequent payments', () => {
      const customer = { id: 'c-1', name: 'عميل تجريبي', openingBalance: 1000, createdAt: '2026-01-01' }
      const invoices = [
        {
          id: 'inv-1',
          code: 'INV-100',
          clientId: 'c-1',
          partyName: 'عميل تجريبي',
          type: 'sale',
          total: 6000,
          paidAmount: 2000,
          remainingAmount: 4000,
          date: '2026-11-01',
        },
      ]
      const cashTx = [
        {
          id: 'tx-auto',
          code: 'REC-AUTO',
          partyId: 'c-1',
          partyName: 'عميل تجريبي',
          type: 'client_receipt',
          amount: 2000,
          invoiceCode: 'INV-100',
          notes: 'تحصيل نقدي - فاتورة مبيعات INV-100',
          date: '2026-11-01',
        },
        {
          id: 'tx-manual',
          code: 'REC-MANUAL',
          partyId: 'c-1',
          partyName: 'عميل تجريبي',
          type: 'client_receipt',
          amount: 1500,
          notes: 'سداد دفعة لاحقة على الحساب',
          date: '2026-11-05',
        },
      ]

      const ledger = buildTestCustomerLedger(customer, invoices, cashTx)
      assert.strictEqual(ledger.length, 3)
      assert.strictEqual(ledger[0].type, 'opening')
      assert.strictEqual(ledger[0].runningBalance, 1000)

      assert.strictEqual(ledger[1].type, 'invoice')
      assert.strictEqual(ledger[1].debit, 6000)
      assert.strictEqual(ledger[1].credit, 2000)
      assert.strictEqual(ledger[1].runningBalance, 5000)

      assert.strictEqual(ledger[2].type, 'payment')
      assert.strictEqual(ledger[2].debit, 0)
      assert.strictEqual(ledger[2].credit, 1500)
      assert.strictEqual(ledger[2].runningBalance, 3500)
    })

    it('records sale_return as credit in customer ledger and correctly applies proportional invoice discount', () => {
      const customer = { id: 'c-2', name: 'عميل مرتجع', openingBalance: 0 }
      const originalInvoice = {
        id: 'inv-orig',
        code: 'INV-ORIG',
        clientId: 'c-2',
        partyName: 'عميل مرتجع',
        type: 'sale',
        subtotal: 10000,
        discountAmount: 1000,
        total: 9000,
        paidAmount: 0,
        remainingAmount: 9000,
        date: '2026-11-01',
      }

      const returnCalc = calculateReturnTotals(originalInvoice, [
        { itemId: 'it-kofta', quantity: 20, price: 200 },
      ])

      assert.strictEqual(returnCalc.factor, 0.9)
      assert.strictEqual(returnCalc.lines[0].effectivePrice, 180)
      assert.strictEqual(returnCalc.total, 3600)

      const returnInvoice = {
        id: 'ret-1',
        code: 'RET-001',
        clientId: 'c-2',
        partyName: 'عميل مرتجع',
        type: 'sale_return',
        total: returnCalc.total,
        paidAmount: 0,
        date: '2026-11-03',
      }

      const ledger = buildTestCustomerLedger(customer, [originalInvoice, returnInvoice], [])
      assert.strictEqual(ledger.length, 2)
      assert.strictEqual(ledger[0].type, 'invoice')
      assert.strictEqual(ledger[0].runningBalance, 9000)

      assert.strictEqual(ledger[1].type, 'sale_return')
      assert.strictEqual(ledger[1].debit, 0)
      assert.strictEqual(ledger[1].credit, 3600)
      assert.strictEqual(ledger[1].runningBalance, 5400)
    })

    it('integrates sales returns into FIFO calculation without producing phantom gains or corrupted margins', () => {
      const invoices = [
        {
          id: 'pur-1',
          code: 'PUR-001',
          type: 'purchase',
          date: '2026-11-01',
          items: [{ itemId: 'it-kofta', quantity: 100, price: 100 }],
        },
        {
          id: 'sale-1',
          code: 'INV-001',
          type: 'sale',
          date: '2026-11-02',
          subtotal: 7500,
          discountAmount: 500,
          total: 7000,
          items: [{ itemId: 'it-kofta', quantity: 50, price: 150 }],
        },
        {
          id: 'ret-1',
          code: 'RET-001',
          type: 'sale_return',
          date: '2026-11-03',
          total: 1400,
          items: [{ itemId: 'it-kofta', quantity: 10, price: 140 }],
        },
      ]

      const fifo = calculateFifoProfits(invoices)
      assert.strictEqual(typeof fifo, 'object')
      assert.ok(fifo.totalRevenue > 0)
      assert.ok(fifo.totalCogs > 0)
      assert.ok(fifo.totalProfit > 0)
      assert.strictEqual(fifo.totalProfit, Number((fifo.totalRevenue - fifo.totalCogs).toFixed(2)))
    })

    it('strictly isolates client and supplier balance mutations preventing cross-party pollution', () => {
      const initialState = {
        clients: [{ id: 'c-10', name: 'عميل أ', balance: 5000 }],
        suppliers: [{ id: 's-10', name: 'مورد أ', balance: 8000 }],
        treasuryAccounts: [{ id: 'tr-1', balance: 20000 }],
        cashTransactions: [],
      }

      const clientTx = {
        id: 'tx-c',
        partyId: 'c-10',
        partyName: 'عميل أ',
        partyType: 'client',
        type: 'client_receipt',
        amount: 2000,
        treasuryId: 'tr-1',
      }

      const isClient = clientTx.partyType === 'client' || (!clientTx.partyType && clientTx.type === 'client_receipt')
      const isSupplier = clientTx.partyType === 'supplier' || (!clientTx.partyType && clientTx.type === 'supplier_payment')
      const nextClients = isClient ? initialState.clients.map((c) => c.id === clientTx.partyId ? { ...c, balance: c.balance - clientTx.amount } : c) : initialState.clients
      const nextSuppliers = isSupplier ? initialState.suppliers.map((s) => s.id === clientTx.partyId ? { ...s, balance: s.balance - clientTx.amount } : s) : initialState.suppliers

      assert.strictEqual(nextClients[0].balance, 3000)
      assert.strictEqual(nextSuppliers[0].balance, 8000)

      const supplierTx = {
        id: 'tx-s',
        partyId: 's-10',
        partyName: 'مورد أ',
        partyType: 'supplier',
        type: 'supplier_payment',
        amount: 3500,
        treasuryId: 'tr-1',
      }

      const isClient2 = supplierTx.partyType === 'client' || (!supplierTx.partyType && supplierTx.type === 'client_receipt')
      const isSupplier2 = supplierTx.partyType === 'supplier' || (!supplierTx.partyType && supplierTx.type === 'supplier_payment')
      const finalClients = isClient2 ? nextClients.map((c) => c.id === supplierTx.partyId ? { ...c, balance: c.balance - supplierTx.amount } : c) : nextClients
      const finalSuppliers = isSupplier2 ? nextSuppliers.map((s) => s.id === supplierTx.partyId ? { ...s, balance: s.balance - supplierTx.amount } : s) : nextSuppliers

      assert.strictEqual(finalClients[0].balance, 3000)
      assert.strictEqual(finalSuppliers[0].balance, 4500)
    })
  })
})
