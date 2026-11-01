export const SUPPLY_TYPES = [
  { id: 'frozen_meat', label: 'لحوم مجمدة ومستوردة' },
  { id: 'poultry', label: 'دواجن ومصنعاتها' },
  { id: 'fish', label: 'أسماك ومأكولات بحرية' },
  { id: 'slaughterhouse', label: 'مجازر ومذابح آلية' },
  { id: 'packaging', label: 'كراتين وتعبئة وتغليف' },
  { id: 'spices_seasoning', label: 'توابل وإضافات تصنيع' },
  { id: 'direct_importer', label: 'مستورد مباشر' },
  { id: 'local_farms', label: 'مزارع محلية' },
  { id: 'factory', label: 'مصنع وتجهيز' },
  { id: 'wholesaler', label: 'تاجر جملة وموزع' },
  { id: 'general', label: 'توريدات عامة وخامات' },
]

export const SUPPLY_TYPE_LABELS = {
  frozen_meat: 'لحوم مجمدة',
  poultry: 'دواجن ومصنعات',
  fish: 'أسماك ومأكولات',
  slaughterhouse: 'مجازر ومذابح',
  packaging: 'تعبئة وتغليف',
  spices_seasoning: 'توابل وإضافات',
  direct_importer: 'مستورد مباشر',
  local_farms: 'مزارع محلية',
  factory: 'مصنع وتجهيز',
  wholesaler: 'تاجر جملة',
  general: 'توريدات عامة',
  'أسماك بحرية': 'أسماك ومأكولات',
  'دواجن ومجزءات': 'دواجن ومصنعات',
}

export const SUPPLIER_CATEGORIES = [
  'لحوم حمراء ومصنعات',
  'دواجن ومجمدات بيضاء',
  'أسماك ومأكولات بحرية',
  'خامات وتعبئة وتغليف',
  'توابل ومستلزمات تصنيع',
  'معدات وصيانة تبريد',
  'خامات وتوريد',
  'تجميد وحفظ',
]

export function normalizeSupplyType(rawType) {
  const allowed = ['frozen_meat', 'poultry', 'fish', 'packaging', 'slaughterhouse', 'spices_seasoning']
  if (allowed.includes(rawType)) return rawType
  if (rawType === 'direct_importer' || rawType === 'local_farms' || rawType === 'factory' || rawType === 'wholesaler') return 'frozen_meat'
  if (rawType === 'أسماك بحرية') return 'fish'
  if (rawType === 'دواجن ومجزءات') return 'poultry'
  return 'frozen_meat'
}

export function calculateSupplierBalance(opening, openingType, transactions = []) {
  const base = Number(opening) || 0
  let balance = base === 0 ? 0 : (openingType === 'payable' ? base : -base)
  transactions.forEach((tx) => {
    if (tx.type === 'purchase_credit') balance += Number(tx.amount) || 0
    if (tx.type === 'disbursement') balance -= Number(tx.amount) || 0
  })
  return balance === 0 ? 0 : balance
}

export function getSupplyTypeLabel(type) {
  if (!type) return 'عام'
  return SUPPLY_TYPE_LABELS[type] || type
}
