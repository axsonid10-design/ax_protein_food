export function getItemDisplayName(item) {
  if (!item) return ''
  if (typeof item === 'string') return item
  const comp = item.compositeName?.trim()
  const sub = item.subCategory?.trim()
  const prim = item.primaryCategory?.trim()
  const sec = item.secondaryCategory?.trim()

  if (comp) {
    if (sub && comp === sub && prim && comp !== prim) {
      const parts = [prim, comp, sec].filter(Boolean)
      return parts.join(' - ')
    }
    return comp
  }

  const parts = [prim, sub, sec].filter(Boolean)
  if (parts.length > 0) return parts.join(' - ')
  return item.name || item.code || 'صنف'
}

export default getItemDisplayName
