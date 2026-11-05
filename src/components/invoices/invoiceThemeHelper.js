export const getInvoiceTypeTheme = (type) => {
  switch (type) {
    case 'sale_return':
      return {
        label: 'مردود مبيعات',
        badgeClass: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
        rowClass: 'border-r-4 border-r-purple-600 bg-purple-600/[0.03] hover:bg-purple-600/[0.07]',
        cardClass: 'border-r-4 border-r-purple-600 bg-purple-600/[0.04] border-outline-variant/30 hover:border-purple-600/50',
        codeClass: 'text-purple-700',
      }
    case 'purchase_return':
      return {
        label: 'مردود مشتريات',
        badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
        rowClass: 'border-r-4 border-r-rose-600 bg-rose-600/[0.03] hover:bg-rose-600/[0.07]',
        cardClass: 'border-r-4 border-r-rose-600 bg-rose-600/[0.04] border-outline-variant/30 hover:border-rose-600/50',
        codeClass: 'text-rose-700',
      }
    case 'purchase':
      return {
        label: 'فاتورة مشتريات',
        badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
        rowClass: 'border-r-4 border-r-amber-500 bg-amber-500/[0.03] hover:bg-amber-500/[0.06]',
        cardClass: 'border-r-4 border-r-amber-500 bg-amber-500/[0.03] border-outline-variant/30 hover:border-amber-500/50',
        codeClass: 'text-amber-700',
      }
    default:
      return {
        label: 'فاتورة بيع',
        badgeClass: 'bg-primary/10 text-primary border-primary/30',
        rowClass: 'border-r-4 border-r-primary bg-primary/[0.02] hover:bg-primary/[0.05]',
        cardClass: 'border-r-4 border-r-primary bg-primary/[0.02] border-outline-variant/30 hover:border-primary/50',
        codeClass: 'text-primary',
      }
  }
}
