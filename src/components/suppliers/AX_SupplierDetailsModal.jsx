import React, { useState, useMemo } from 'react'
import { X, Building2, Printer } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useAXStore } from '../../store/useAXStore'
import { AX_SupplierLedgerTable } from './AX_SupplierLedgerTable'
import { AX_SupplierProfileTab } from './AX_SupplierProfileTab'
import { AX_SupplierOverpaymentCard } from './AX_SupplierOverpaymentCard'

export function AX_SupplierDetailsModal({ supplier, isOpen, onClose }) {
  useBodyScrollLock(isOpen)
  const { invoices = [], cashTransactions = [] } = useAXStore()
  const [activeTab, setActiveTab] = useState('ledger')

  const supplierPurchases = useMemo(() => {
    if (!supplier?.id) return []
    return (invoices || []).filter(
      (inv) =>
        inv &&
        (inv.type === 'purchase' || inv.type === 'purchase_return') &&
        (inv.supplierId === supplier.id ||
          inv.partyId === supplier.id ||
          inv.partyName === supplier.companyName ||
          inv.partyName === supplier.name)
    )
  }, [supplier, invoices])

  const supplierSales = useMemo(() => {
    if (!supplier?.id) return []
    return (invoices || []).filter(
      (inv) =>
        inv &&
        (inv.type === 'sale' || inv.type === 'sale_return') &&
        (inv.partyId === supplier.id ||
          inv.supplierId === supplier.id ||
          inv.partyName === supplier.companyName ||
          inv.partyName === supplier.name)
    )
  }, [supplier, invoices])

  const supplierPayouts = useMemo(() => {
    if (!supplier?.id) return []
    return (cashTransactions || []).filter(
      (tx) =>
        tx &&
        (tx.partyId === supplier.id ||
          tx.partyName === supplier.companyName ||
          tx.partyName === supplier.name) &&
        (tx.type === 'payment' || tx.type === 'cash_out' || tx.type === 'supplier_payment') && !tx.notes?.includes('فاتورة مشتريات') && !tx.notes?.includes('مردود مبيعات')
    )
  }, [supplier, cashTransactions])

  const supplierReceipts = useMemo(() => {
    if (!supplier?.id) return []
    return (cashTransactions || []).filter(
      (tx) =>
        tx &&
        (tx.partyId === supplier.id ||
          tx.partyName === supplier.companyName ||
          tx.partyName === supplier.name) &&
        (tx.type === 'receipt' || tx.type === 'cash_in' || tx.type === 'supplier_refund' || (tx.type === 'client_receipt' && (tx.partyId === supplier.id || tx.partyName === supplier.name || tx.partyName === supplier.companyName)))
    )
  }, [supplier, cashTransactions])

  const ledgerEntries = useMemo(() => {
    if (!supplier?.id) return []
    const entries = []
    const opBal = Number(supplier.openingBalance) || 0
    const opType = supplier.openingBalanceType || 'payable'
    const opSigned = opType === 'payable' ? opBal : -opBal

    if (opBal > 0) {
      entries.push({
        id: 'op-bal',
        date: supplier.createdAt || new Date().toISOString(),
        type: 'opening',
        description: `رصيد أول المدة (${opType === 'payable' ? 'دائن / مستحق له' : 'مدين / مقدم له'})`,
        credit: opType === 'payable' ? opBal : 0,
        debit: opType === 'receivable' ? opBal : 0,
        runningBalance: opSigned,
      })
    }

    supplierPurchases.forEach((inv) => {
      const invTotal = Number(inv.totalAmount || inv.total) || 0
      const isReturn = inv.type === 'purchase_return'
      const paid = Number(inv.paidAmount || inv.cashPaid) || 0

      entries.push({
        id: inv.id,
        date: inv.createdAt || inv.date || new Date().toISOString(),
        type: isReturn ? 'purchase_return' : 'purchase_invoice',
        reference: inv.invoiceNumber || inv.code || inv.id,
        description: isReturn
          ? `مردود مشتريات وتوريد #${inv.invoiceNumber || inv.code || inv.id.slice(0, 8)}`
          : `فاتورة شراء وتوريد #${inv.invoiceNumber || inv.code || inv.id.slice(0, 8)}`,
        credit: isReturn ? 0 : invTotal,
        debit: isReturn ? invTotal : paid,
      })
    })

    supplierSales.forEach((inv) => {
      const invTotal = Number(inv.totalAmount || inv.total) || 0
      const isReturn = inv.type === 'sale_return'
      const paid = Number(inv.paidAmount || inv.cashPaid) || 0

      entries.push({
        id: inv.id,
        date: inv.createdAt || inv.date || new Date().toISOString(),
        type: isReturn ? 'sale_return' : 'sale_invoice',
        reference: inv.invoiceNumber || inv.code || inv.id,
        description: isReturn
          ? `مردود مبيعات للمورد #${inv.invoiceNumber || inv.code || inv.id.slice(0, 8)}`
          : `فاتورة مبيعات للمورد (مقاصة) #${inv.invoiceNumber || inv.code || inv.id.slice(0, 8)}`,
        credit: isReturn ? invTotal : paid,
        debit: isReturn ? 0 : invTotal,
      })
    })

    supplierPayouts.forEach((po) => {
      entries.push({
        id: po.id,
        date: po.createdAt || po.date || new Date().toISOString(),
        type: 'disbursement',
        reference: po.id,
        description: po.description || 'سند صرف نقدي / سداد للمورد',
        credit: 0,
        debit: Number(po.amount) || 0,
      })
    })

    supplierReceipts.forEach((rc) => {
      entries.push({
        id: rc.id,
        date: rc.createdAt || rc.date || new Date().toISOString(),
        type: 'receipt',
        reference: rc.id,
        description: rc.description || 'سند قبض نقدي / تحصيل من المورد',
        credit: Number(rc.amount) || 0,
        debit: 0,
      })
    })

    entries.sort((a, b) => new Date(a.date) - new Date(b.date))

    let running = 0
    return entries.map((entry) => {
      const credit = entry.credit || 0
      const debit = entry.debit || 0
      running += (credit - debit)
      return { ...entry, runningBalance: running }
    })
  }, [supplier, supplierPurchases, supplierSales, supplierPayouts, supplierReceipts])

  const totalPurchasesAmount = useMemo(() => {
    return supplierPurchases.reduce((sum, inv) => {
      const t = Number(inv.totalAmount || inv.total) || 0
      return inv.type === 'purchase_return' ? sum - t : sum + t
    }, 0)
  }, [supplierPurchases])

  const totalSalesAmount = useMemo(() => {
    return supplierSales.reduce((sum, inv) => {
      const t = Number(inv.totalAmount || inv.total) || 0
      return inv.type === 'sale_return' ? sum - t : sum + t
    }, 0)
  }, [supplierSales])

  const totalSettledAmount = useMemo(() => {
    const fromPurchasesPaid = supplierPurchases.reduce((sum, inv) => sum + (Number(inv.paidAmount || inv.cashPaid) || 0), 0)
    const fromPayouts = supplierPayouts.reduce((sum, po) => sum + (Number(po.amount) || 0), 0)
    return fromPurchasesPaid + fromPayouts
  }, [supplierPurchases, supplierPayouts])

  if (!isOpen || !supplier) return null

  const netOffsetBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].runningBalance : (Number(supplier.balance) || 0)
  const isPayable = netOffsetBalance > 0
  const isReceivable = netOffsetBalance < 0

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-surface-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-6 max-w-4xl w-full shadow-level3 space-y-5 my-auto print:border-none print:shadow-none print:rounded-none">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center print:hidden">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-on-surface">
                  {supplier.companyName || supplier.name}
                </h3>
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                    isPayable
                      ? 'bg-red-800 text-white'
                      : isReceivable
                      ? 'bg-emerald-700 text-white'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {isPayable ? 'دائن (مستحق له)' : isReceivable ? 'مدين (لنا عنده - رصيد بالسالب)' : 'حساب متوازن'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-bold flex items-center gap-2 mt-0.5">
                <span>المسؤول: {supplier.contactPerson || 'غير محدد'}</span>
                {supplier.phone && <span>• {supplier.phone}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="py-1.5 px-3 rounded-full border border-outline-variant/50 hover:bg-surface-container text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة A4</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <AX_SupplierOverpaymentCard
          supplier={supplier}
          totalPurchasesAmount={totalPurchasesAmount}
          totalSalesAmount={totalSalesAmount}
          totalSettledAmount={totalSettledAmount}
          netOffsetBalance={netOffsetBalance}
          purchasesCount={supplierPurchases.length}
          salesCount={supplierSales.length}
        />

        <div className="flex items-center gap-1.5 border-b border-surface-container pb-2 overflow-x-auto print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`py-1.5 px-3.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'ledger'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            كشف الحساب 360° ({ledgerEntries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`py-1.5 px-3.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'purchases'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            فواتير التوريد ({supplierPurchases.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`py-1.5 px-3.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'sales'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            مبيعات للمورد / مقاصة ({supplierSales.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payouts')}
            className={`py-1.5 px-3.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'payouts'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            السندات النقدية ({supplierPayouts.length + supplierReceipts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-1.5 px-3.5 rounded-full text-xs font-black transition-all ${
              activeTab === 'profile'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            الملف المؤسسي
          </button>
        </div>

        {activeTab === 'ledger' && (
          <AX_SupplierLedgerTable ledgerEntries={ledgerEntries} />
        )}

        {activeTab === 'purchases' && (
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {supplierPurchases.length === 0 ? (
              <p className="text-center py-8 text-xs font-bold text-on-surface-variant">
                لا توجد فواتير شراء وتوريد مسجلة لهذا المورد.
              </p>
            ) : (
              supplierPurchases.map((inv) => {
                const total = Number(inv.totalAmount || inv.total) || 0
                const paid = Number(inv.paidAmount || inv.cashPaid) || 0
                const remaining = Math.max(0, total - paid)
                return (
                  <div
                    key={inv.id}
                    className="p-3 bg-surface-lowest border border-outline-variant/30 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-on-surface">#{inv.code || inv.invoiceNumber || inv.id.slice(0, 8)}</span>
                        <span className="text-[11px] font-mono text-on-surface-variant">{inv.date}</span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant block mt-0.5">
                        الأصناف: {inv.items ? inv.items.length : 1} صنف • {inv.paymentTerms || 'توريد'}
                      </span>
                    </div>

                    <div className="text-left font-mono">
                      <span className="font-black text-on-surface block">{total.toLocaleString('en-US')} ج.م</span>
                      <span className="text-[10px] text-on-surface-variant">
                        مسدد: {paid.toLocaleString('en-US')} • متبقي: {remaining.toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {supplierSales.length === 0 ? (
              <p className="text-center py-8 text-xs font-bold text-on-surface-variant">
                لا توجد فواتير مبيعات مسجلة لهذا المورد حتى الآن.
              </p>
            ) : (
              supplierSales.map((inv) => {
                const total = Number(inv.totalAmount || inv.total) || 0
                const paid = Number(inv.paidAmount || inv.cashPaid) || 0
                const remaining = Math.max(0, total - paid)
                const isRet = inv.type === 'sale_return'
                return (
                  <div
                    key={inv.id}
                    className="p-3 bg-surface-lowest border border-outline-variant/30 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-on-surface">#{inv.code || inv.invoiceNumber || inv.id.slice(0, 8)}</span>
                        <span className="text-[11px] font-mono text-on-surface-variant">{inv.date}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 text-[10px] font-bold">
                          {isRet ? 'مردود مبيعات' : 'مبيعات (مقاصة)'}
                        </span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant block mt-0.5">
                        الأصناف: {inv.items ? inv.items.length : 1} صنف • {inv.paymentTerms || 'مبيعات'}
                      </span>
                    </div>

                    <div className="text-left font-mono">
                      <span className="font-black text-amber-800 block">{total.toLocaleString('en-US')} ج.م</span>
                      <span className="text-[10px] text-on-surface-variant">
                        مسدد: {paid.toLocaleString('en-US')} • متبقي: {remaining.toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {supplierPayouts.length === 0 && supplierReceipts.length === 0 ? (
              <p className="text-center py-8 text-xs font-bold text-on-surface-variant">
                لا توجد سندات صرف أو قبض مسجلة لهذا المورد.
              </p>
            ) : (
              <>
                {supplierPayouts.map((po) => (
                  <div
                    key={po.id}
                    className="p-3 bg-surface-lowest border border-outline-variant/30 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">سند صرف للمورد</span>
                        <span className="font-bold text-on-surface">{po.description || 'سداد نقدي'}</span>
                      </div>
                      <span className="text-[11px] font-mono text-on-surface-variant">{po.date || po.createdAt?.split('T')[0]}</span>
                    </div>
                    <span className="font-mono font-black text-emerald-700">
                      {(Number(po.amount) || 0).toLocaleString('en-US')} ج.م
                    </span>
                  </div>
                ))}
                {supplierReceipts.map((rc) => (
                  <div
                    key={rc.id}
                    className="p-3 bg-surface-lowest border border-outline-variant/30 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">سند قبض من المورد</span>
                        <span className="font-bold text-on-surface">{rc.description || 'تحصيل نقدي'}</span>
                      </div>
                      <span className="text-[11px] font-mono text-on-surface-variant">{rc.date || rc.createdAt?.split('T')[0]}</span>
                    </div>
                    <span className="font-mono font-black text-blue-700">
                      {(Number(rc.amount) || 0).toLocaleString('en-US')} ج.م
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <AX_SupplierProfileTab supplier={supplier} />
        )}
      </div>
    </div>
  )
}

export default AX_SupplierDetailsModal
