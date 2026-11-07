export const PAPER_FORMATS = {
  a4_portrait: {
    id: 'a4_portrait',
    label: 'A4 طولي (معتمد)',
    width: '210mm',
    minHeight: '297mm',
    padding: '14mm 12mm',
    formatClass: 'format-a4-portrait',
    bodyClass: 'print-format-a4-portrait',
    targetPx: 794,
  },
  a4_landscape: {
    id: 'a4_landscape',
    label: 'A4 عرضي',
    width: '297mm',
    minHeight: '210mm',
    padding: '10mm 14mm',
    formatClass: 'format-a4-landscape',
    bodyClass: 'print-format-a4-landscape',
    targetPx: 1123,
  },
  a5: {
    id: 'a5',
    label: 'A5 مدمج',
    width: '148mm',
    minHeight: '210mm',
    padding: '8mm 8mm',
    formatClass: 'format-a5',
    bodyClass: 'print-format-a5',
    targetPx: 559,
  },
}

export function formatPrintDate(dateStr) {
  if (!dateStr) return '—'
  const str = String(dateStr).split('T')[0]
  const parts = str.split('-')
  if (parts.length === 3) {
    return `${parts[0]}/${parts[1]}/${parts[2]}`
  }
  return str
}

export function getInvoiceTitle(type) {
  switch (type) {
    case 'purchase':
      return 'فاتورة مشتريات'
    case 'sale_return':
      return 'مردود مبيعات'
    case 'purchase_return':
      return 'مردود مشتريات'
    default:
      return 'فاتورة مبيعات'
  }
}

export function getItemUnitDisplay(it) {
  const u = it.unit || it.unitType || 'كرتونة'
  const pieces = Number(it.piecesPerCarton || it.pieces_per_carton || 0)
  const subUnit = it.subUnitType || it.sub_unit_type
  const weight = Number(it.weightPerCarton || it.weight_per_carton || 0)
  if (u === 'كرتونة' && pieces > 1 && subUnit) {
    return `كرتونة (${pieces} ${subUnit})`
  }
  if (u === 'كرتونة' && weight > 0) {
    return `كرتونة (${weight} كجم)`
  }
  return u
}
