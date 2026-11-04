import { generateUUID } from '../utils/AX_UUID.js'

export const initialExpenseCategories = [
  { id: 'exp-main-ops', name: 'مصاريف تشغيلية ولوجستية', level: 'main', parentId: null, code: 'EXP-OPS', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-main-adm', name: 'مصاريف إدارية ومقرات', level: 'main', parentId: null, code: 'EXP-ADM-MAIN', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-main-fin', name: 'مصاريف بنكية وتمويلية', level: 'main', parentId: null, code: 'EXP-FIN', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-main-mkt', name: 'مصاريف تسويق وبيوع', level: 'main', parentId: null, code: 'EXP-MKT', createdAt: '2026-01-01T00:00:00.000Z' },

  { id: 'exp-sub-trn', name: 'مصاريف شحن ونقل', level: 'sub', parentId: 'exp-main-ops', code: 'EXP-TRN', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sub-mnt', name: 'صيانة وثلاجات وتجميد', level: 'sub', parentId: 'exp-main-ops', code: 'EXP-MNT', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sub-pkg', name: 'مواد تعبئة وتغليف', level: 'sub', parentId: 'exp-main-ops', code: 'EXP-PKG', createdAt: '2026-01-01T00:00:00.000Z' },

  { id: 'exp-sub-rnt', name: 'إيجارات ومستودعات', level: 'sub', parentId: 'exp-main-adm', code: 'EXP-RNT', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sub-elc', name: 'طاقة ومرافق خدمية', level: 'sub', parentId: 'exp-main-adm', code: 'EXP-ELC', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sub-hsp', name: 'نثرية وبوفيه وضيافة', level: 'sub', parentId: 'exp-main-adm', code: 'EXP-HSP', createdAt: '2026-01-01T00:00:00.000Z' },

  { id: 'exp-sub-bnk', name: 'رسوم بنكية وعمولات', level: 'sub', parentId: 'exp-main-fin', code: 'EXP-BNK', createdAt: '2026-01-01T00:00:00.000Z' },

  { id: 'exp-sub-adv', name: 'دعاية وترويج', level: 'sub', parentId: 'exp-main-mkt', code: 'EXP-ADM', createdAt: '2026-01-01T00:00:00.000Z' },

  { id: 'exp-sec-trn-freight', name: 'نولون ونقل بضائع خارجية', level: 'secondary', parentId: 'exp-sub-trn', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-trn-fuel', name: 'وقود وسولار سيارات التوزيع', level: 'secondary', parentId: 'exp-sub-trn', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-trn-porter', name: 'مشالات وعتالة نقل وتنزيل', level: 'secondary', parentId: 'exp-sub-trn', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-trn-tolls', name: 'رسوم طرق وكارتات ومواقف', level: 'secondary', parentId: 'exp-sub-trn', createdAt: '2026-01-01T00:00:00.000Z' },

  { id: 'exp-sec-mnt-rooms', name: 'صيانة غرف التبريد والكمبروسرات', level: 'secondary', parentId: 'exp-sub-mnt', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-mnt-gas', name: 'شحن فريون وزيوت ضواغط', level: 'secondary', parentId: 'exp-sub-mnt', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-mnt-generators', name: 'قطع غيار ومولدات كهرباء', level: 'secondary', parentId: 'exp-sub-mnt', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-mnt-vans', name: 'صيانة ميكانيكا سيارات التبريد', level: 'secondary', parentId: 'exp-sub-mnt', createdAt: '2026-01-01T00:00:00.000Z' },

  { id: 'exp-sec-pkg-cartons', name: 'كراتين وصناديق تجميد', level: 'secondary', parentId: 'exp-sub-pkg', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-pkg-vacuum', name: 'أكياس فاكيوم وشرنك غذائي', level: 'secondary', parentId: 'exp-sub-pkg', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-pkg-foam', name: 'أطباق فوم واسترتش تغليف', level: 'secondary', parentId: 'exp-sub-pkg', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-pkg-labels', name: 'بكر لاصق واستيكرات تتبع', level: 'secondary', parentId: 'exp-sub-pkg', createdAt: '2026-01-01T00:00:00.000Z' },

  { id: 'exp-sec-rnt-central', name: 'إيجار الثلاجة المركزية', level: 'secondary', parentId: 'exp-sub-rnt', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-rnt-warehouse', name: 'إيجار مخزن المجمدات', level: 'secondary', parentId: 'exp-sub-rnt', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-rnt-office', name: 'إيجار المكاتب الإدارية', level: 'secondary', parentId: 'exp-sub-rnt', createdAt: '2026-01-01T00:00:00.000Z' },

  { id: 'exp-sec-elc-power', name: 'فواتير كهرباء غرف التجميد', level: 'secondary', parentId: 'exp-sub-elc', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-elc-water', name: 'فواتير مياه وصرف', level: 'secondary', parentId: 'exp-sub-elc', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-elc-net', name: 'اشتراكات إنترنت واتصالات', level: 'secondary', parentId: 'exp-sub-elc', createdAt: '2026-01-01T00:00:00.000Z' },

  { id: 'exp-sec-hsp-buffet', name: 'بوفيه وضيافة ومستلزمات شاي', level: 'secondary', parentId: 'exp-sub-hsp', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-hsp-hygiene', name: 'أدوات ومطهرات نظافة معتمدة', level: 'secondary', parentId: 'exp-sub-hsp', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-hsp-stationery', name: 'مستلزمات ورقية وأدوات مكتبية', level: 'secondary', parentId: 'exp-sub-hsp', createdAt: '2026-01-01T00:00:00.000Z' },

  { id: 'exp-sec-bnk-transfers', name: 'عمولات تحويل بنكي وإنستاباي', level: 'secondary', parentId: 'exp-sub-bnk', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-bnk-fees', name: 'مصاريف إدارة حسابات بنكية', level: 'secondary', parentId: 'exp-sub-bnk', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-bnk-pos', name: 'عمولات نقاط البيع وبوابات الدفع', level: 'secondary', parentId: 'exp-sub-bnk', createdAt: '2026-01-01T00:00:00.000Z' },

  { id: 'exp-sec-adv-print', name: 'مطبوعات وبروشورات تجارية', level: 'secondary', parentId: 'exp-sub-adv', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-adv-digital', name: 'إعلانات رقمية ومواقع التواصل', level: 'secondary', parentId: 'exp-sub-adv', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'exp-sec-adv-samples', name: 'عينات تذوق وهدايا ترويجية', level: 'secondary', parentId: 'exp-sub-adv', createdAt: '2026-01-01T00:00:00.000Z' },
]

export const getInitialExpenseCategories = () => JSON.parse(JSON.stringify(initialExpenseCategories))

export const expenseCategoryHelpers = {
  getInitialExpenseCategories,

  getMainCategories: (categories = []) =>
    (Array.isArray(categories) ? categories : []).filter((c) => c && c.level === 'main' && !c.isDeleted),

  getSubCategories: (categories = [], mainId = null) => {
    const list = Array.isArray(categories) ? categories : []
    return list.filter((c) => c && c.level === 'sub' && !c.isDeleted && (!mainId || c.parentId === mainId))
  },

  getSecondaryCategories: (categories = [], subId = null) => {
    const list = Array.isArray(categories) ? categories : []
    return list.filter((c) => c && c.level === 'secondary' && !c.isDeleted && (!subId || c.parentId === subId))
  },

  getHierarchyPath: (categories = [], secondaryId = null) => {
    const list = Array.isArray(categories) ? categories : []
    const sec = list.find((c) => c && c.id === secondaryId)
    const sub = sec ? list.find((c) => c && c.id === sec.parentId) : null
    const main = sub ? list.find((c) => c && c.id === sub.parentId) : null
    const parts = [main?.name, sub?.name, sec?.name].filter(Boolean)
    return {
      main: main || null,
      sub: sub || null,
      secondary: sec || null,
      label: parts.length > 0 ? parts.join(' / ') : '',
    }
  },

  addExpenseCategory: (categories = [], payload = {}) => {
    const list = Array.isArray(categories) ? categories : []
    const rawName = typeof payload === 'string' ? payload : payload.name
    const name = String(rawName || '').trim()
    if (!name) return list
    const level = payload.level || 'main'
    const parentId = level === 'main' ? null : (payload.parentId || null)
    if (level !== 'main' && !parentId) return list
    const id = payload.id || `exp-${level}-${generateUUID()}`
    const newCat = {
      id,
      name,
      level,
      parentId,
      code: payload.code || null,
      createdAt: payload.createdAt || new Date().toISOString(),
    }
    return [...list, newCat]
  },

  editExpenseCategory: (categories = [], idOrPayload = {}, updates = {}) => {
    const list = Array.isArray(categories) ? categories : []
    const id = typeof idOrPayload === 'string' ? idOrPayload : idOrPayload?.id
    const payloadUpdates = typeof idOrPayload === 'object' && idOrPayload !== null ? idOrPayload : updates
    const targetUpdates = { ...payloadUpdates, ...updates }
    delete targetUpdates.id
    if (!id) return list
    return list.map((c) => {
      if (!c || c.id !== id) return c
      const nextName = targetUpdates.name !== undefined ? String(targetUpdates.name).trim() : c.name
      return {
        ...c,
        ...targetUpdates,
        name: nextName || c.name,
      }
    })
  },

  deleteExpenseCategory: (categories = [], id = null) => {
    const list = Array.isArray(categories) ? categories : []
    if (!id) return list
    const target = list.find((c) => c && c.id === id)
    if (!target) return list

    let idsToRemove = new Set([id])
    if (target.level === 'main') {
      const childSubs = list.filter((c) => c && c.parentId === id)
      childSubs.forEach((s) => {
        idsToRemove.add(s.id)
        list.filter((c) => c && c.parentId === s.id).forEach((sec) => idsToRemove.add(sec.id))
      })
    } else if (target.level === 'sub') {
      list.filter((c) => c && c.parentId === id).forEach((sec) => idsToRemove.add(sec.id))
    }

    return list.filter((c) => !idsToRemove.has(c.id))
  },

  hasChildren: (categories = [], id = null) => {
    if (!id) return false
    const list = Array.isArray(categories) ? categories : []
    return list.some((c) => c && c.parentId === id && !c.isDeleted)
  },

  getChildren: (categories = [], id = null) => {
    if (!id) return []
    const list = Array.isArray(categories) ? categories : []
    return list.filter((c) => c && c.parentId === id && !c.isDeleted)
  },

  countExpensesForCategory: (cashTransactions = [], categoryId = null) => {
    if (!categoryId) return 0
    const list = Array.isArray(cashTransactions) ? cashTransactions : []
    return list.filter((tx) =>
      tx &&
      (tx.expenseMainCategoryId === categoryId ||
        tx.expenseSubCategoryId === categoryId ||
        tx.expenseSecondaryCategoryId === categoryId)
    ).length
  },
}
