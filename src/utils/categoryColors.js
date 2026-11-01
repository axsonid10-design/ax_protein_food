const PRESET_COLORS = {
  'أسماك': { bg: 'bg-amber-600/10', text: 'text-amber-800', border: 'border-amber-600/25' },
  'لحوم': { bg: 'bg-red-800/10', text: 'text-red-900', border: 'border-red-800/25' },
  'مصنعات': { bg: 'bg-rose-700/10', text: 'text-rose-800', border: 'border-rose-700/25' },
  'مجزءات': { bg: 'bg-burgundy-700/10', text: 'text-burgundy-800', border: 'border-burgundy-700/25' },
  'خامات': { bg: 'bg-emerald-700/10', text: 'text-emerald-800', border: 'border-emerald-700/25' },
  'رنجه': { bg: 'bg-amber-700/10', text: 'text-amber-900', border: 'border-amber-700/25' },
  'خضروات': { bg: 'bg-lime-700/10', text: 'text-lime-800', border: 'border-lime-700/25' },
  'الكبده': { bg: 'bg-red-900/10', text: 'text-red-950', border: 'border-red-900/25' },
  'منتجات صلاح وعبدالفتاح': { bg: 'bg-red-800/10', text: 'text-red-900', border: 'border-red-800/25' },
  'متنوعه': { bg: 'bg-rose-600/10', text: 'text-rose-800', border: 'border-rose-600/25' },
  'كراتين': { bg: 'bg-amber-800/10', text: 'text-amber-900', border: 'border-amber-800/25' },
  'أكياس': { bg: 'bg-slate-600/10', text: 'text-slate-800', border: 'border-slate-600/25' },
  'أطباق': { bg: 'bg-slate-500/10', text: 'text-slate-800', border: 'border-slate-500/25' },
}

const PALETTE = [
  { bg: 'bg-red-800/10', text: 'text-red-900', border: 'border-red-800/25' },
  { bg: 'bg-rose-700/10', text: 'text-rose-800', border: 'border-rose-700/25' },
  { bg: 'bg-amber-700/10', text: 'text-amber-900', border: 'border-amber-700/25' },
  { bg: 'bg-red-900/10', text: 'text-red-950', border: 'border-red-900/25' },
  { bg: 'bg-emerald-700/10', text: 'text-emerald-800', border: 'border-emerald-700/25' },
  { bg: 'bg-amber-600/10', text: 'text-amber-800', border: 'border-amber-600/25' },
  { bg: 'bg-rose-800/10', text: 'text-rose-900', border: 'border-rose-800/25' },
  { bg: 'bg-slate-600/10', text: 'text-slate-800', border: 'border-slate-600/25' },
]

export function getCategoryColor(categoryName) {
  if (!categoryName) return PALETTE[0]
  const trimmed = categoryName.trim()
  if (PRESET_COLORS[trimmed]) {
    return PRESET_COLORS[trimmed]
  }
  let hash = 0
  for (let i = 0; i < trimmed.length; i++) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % PALETTE.length
  return PALETTE[index]
}

export function getCategoryClass(categoryName) {
  const color = getCategoryColor(categoryName)
  return `${color.bg} ${color.text} ${color.border}`
}
