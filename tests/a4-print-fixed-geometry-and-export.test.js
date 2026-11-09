import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('A4 Print Master: Fixed Geometry, Zero Mobile Squishing & Image Export', () => {
  const rootDir = process.cwd()

  it('AX_InvoicePrintModal enforces A4 physical dimensions, ax-a4-sheet and zoom controls', () => {
    const filePath = path.join(rootDir, 'src', 'components', 'invoices', 'AX_InvoicePrintModal.jsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    assert.ok(content.includes('ax-a4-sheet'), 'Must contain ax-a4-sheet class')
    assert.ok(content.includes('id="ax-invoice-print-sheet"'), 'Must have ax-invoice-print-sheet id')
    assert.ok(content.includes('minWidth: currentFormat.width'), 'Must lock minWidth to currentFormat.width')
    assert.ok(content.includes("transformOrigin: 'top center'"), 'Must have top center origin')
    assert.ok(!content.includes('hidden md:flex items-center gap-1 bg-surface-low rounded-full px-2'), 'Zoom controls must be visible on mobile too')
  })

  it('AX_TransferPrintModal enforces A4 physical dimensions, ax-a4-sheet and zoom controls', () => {
    const filePath = path.join(rootDir, 'src', 'components', 'warehouses', 'AX_TransferPrintModal.jsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    assert.ok(content.includes('ax-a4-sheet'), 'Must contain ax-a4-sheet class')
    assert.ok(content.includes('id="ax-transfer-print-sheet"'), 'Must have ax-transfer-print-sheet id')
    assert.ok(content.includes('210mm'), 'Must enforce 210mm A4 width')
    assert.ok(content.includes('297mm'), 'Must enforce 297mm A4 minHeight')
    assert.ok(content.includes('zoomLevel'), 'Must support interactive zoom on mobile and desktop')
    assert.ok(content.includes("whiteSpace: 'nowrap'"), 'Numeric columns must not wrap')
  })

  it('axInvoiceImageService locks capture to exact 794px A4 width regardless of device screen', () => {
    const filePath = path.join(rootDir, 'src', 'services', 'axInvoiceImageService.js')
    const content = fs.readFileSync(filePath, 'utf-8')

    assert.ok(content.includes('targetWidth = 794'), 'Target width must be locked to 794px')
    assert.ok(content.includes("element.style.width = '794px'"), 'Element style width must be locked to 794px')
    assert.ok(content.includes('canvasWidth: targetWidth * 2'), 'Must export at 2x crisp print density')
  })

  it('src/index.css includes A4 print rules for invoices, transfers and table visibility in print', () => {
    const filePath = path.join(rootDir, 'src', 'index.css')
    const content = fs.readFileSync(filePath, 'utf-8')

    assert.ok(content.includes('#ax-transfer-print-sheet'), 'Must style transfer sheet in print')
    assert.ok(content.includes('.ax-a4-sheet'), 'Must style ax-a4-sheet in print')
    assert.ok(content.includes('width: 210mm !important'), 'Must enforce 210mm width in print')
    assert.ok(content.includes('min-height: 297mm !important'), 'Must enforce 297mm minHeight in print')
    assert.ok(content.includes('.hidden.lg\\:block') || content.includes('table.hidden.lg\\:block'), 'Must unhide desktop tables during print')
    assert.ok(content.includes('.lg\\:hidden'), 'Must suppress mobile bento cards during print')
  })

  it('AX_VanSettlementReceiptModal has print-ready A4 classes', () => {
    const filePath = path.join(rootDir, 'src', 'components', 'distribution', 'AX_VanSettlementReceiptModal.jsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    assert.ok(content.includes('ax-a4-sheet'), 'Must have ax-a4-sheet class')
    assert.ok(content.includes('print:w-[210mm]'), 'Must enforce 210mm print width')
  })

  it('all modified files adhere to <= 500 lines limit and zero comments', () => {
    const files = [
      'src/components/invoices/AX_InvoicePrintModal.jsx',
      'src/components/warehouses/AX_TransferPrintModal.jsx',
      'src/components/distribution/AX_VanSettlementReceiptModal.jsx',
      'src/components/reports/AX_Ledger360Report.jsx',
      'src/components/employees/AX_EmployeePayrollLedger.jsx',
      'src/services/axInvoiceImageService.js',
    ]

    for (const rel of files) {
      const full = path.join(rootDir, rel)
      const text = fs.readFileSync(full, 'utf-8')
      const lines = text.split('\n')
      assert.ok(lines.length <= 500, `${rel} has ${lines.length} lines, which exceeds 500`)

      const single = text.match(/^[ \t]*\/\/.*$/gm) || []
      const multi = text.match(/\/\*[\s\S]*?\*\//gm) || []
      assert.equal(single.length + multi.length, 0, `${rel} contains comments: ${[...single, ...multi].slice(0, 3).join(', ')}`)
    }
  })
})
