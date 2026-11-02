export const initialCategories = [
  'الكبده',
  'كراتين',
  'أكياس',
  'أطباق',
  'خامات',
  'لحوم',
  'أسماك',
  'مصنعات',
  'مجزءات',
  'منتجات صلاح وعبدالفتاح',
  'رنجه',
  'خضروات',
  'متنوعه',
]

export const initialSubCategories = {
  'الكبده': ['كبده ناشيونال', 'كبده IBP', 'كبده هندى', 'كبده excel'],
  'لحوم': ['لحمه', 'لحمه كتف', 'لحمه سن', 'لحمه رقبه', 'لحمه صدر', 'لحمه قلب'],
  'أسماك': ['سمك ياباني', 'سمك تايوانى', 'سمك مكرونه', 'سمك دراك'],
  'مصنعات': ['برجر نص', 'برجر كيلو', 'كفته كبير', 'كفتة صغير', 'سجق'],
  'مجزءات': ['بانيه', 'استربس', 'جناح', 'دبوس', 'وراك', 'كبد وقوانص'],
  'رنجه': ['رنجه مارينا', 'رنجه كافيار'],
  'خضروات': ['ملوخيه', 'باميه', 'بسله ساده', 'بسله بالجزر', 'خضار مشكل', 'ورق عنب'],
  'متنوعه': ['جبنه موتزاريلا صغير', 'جبنه موتزاريلا كبير', 'زبده 10كيلو', 'زبده 5كيلو'],
}

export const initialSecondaryCategories = ['صلاح  و عبدالفتاح', 'أنس أفندى', 'ألانا', 'الحمد', 'فريش']

export const initialItems = []

export const initialWarehouses = []

export const initialDistributors = []

export const initialInventoryStock = []

export const initialTransfers = []

export const initialStockAudits = []

export const initialTreasuryAccounts = [
  { id: 'c0000000-0000-0000-0000-000000000001', name: 'الخزينة الرئيسية (الكاش المركزي)', balance: 0, type: 'cash' },
  { id: 'c0000000-0000-0000-0000-000000000002', name: 'الحساب البنكي (الأهلي المصري)', balance: 0, type: 'bank' },
  { id: 'c0000000-0000-0000-0000-000000000003', name: 'فودافون كاش الشركات', balance: 0, type: 'wallet' },
  { id: 'c0000000-0000-0000-0000-000000000004', name: 'إنستا باي التجاري', balance: 0, type: 'instapay' },
  { id: 'c0000000-0000-0000-0000-000000000005', name: 'عهدة سيارة التوزيع (الكاش الميداني)', balance: 0, type: 'van_cash' },
]

export const initialCashTransactions = []

export const initialPendingCashTransfers = []

export const initialManufacturingOrders = []

export const initialInvoices = []

export const initialClients = []

export const initialSuppliers = []

export const initialSalesReps = []

export const initialSalesRepLedger = []

export const initialNotifications = []
