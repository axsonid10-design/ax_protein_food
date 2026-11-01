export const categoryHelpers = {
  addCategory: (state, name) => {
    if (state.categories.includes(name)) return state
    return {
      categories: [...state.categories, name],
      subCategories: { ...state.subCategories, [name]: [] },
    }
  },
  editCategory: (state, oldName, newName) => {
    const newCats = state.categories.map((c) => (c === oldName ? newName : c))
    const newSubs = { ...state.subCategories }
    if (newSubs[oldName]) {
      newSubs[newName] = newSubs[oldName]
      delete newSubs[oldName]
    }
    const newItems = state.items.map((it) =>
      it.primaryCategory === oldName ? { ...it, primaryCategory: newName } : it
    )
    return { categories: newCats, subCategories: newSubs, items: newItems }
  },
  deleteCategory: (state, name) => {
    const newCats = state.categories.filter((c) => c !== name)
    const newSubs = { ...state.subCategories }
    delete newSubs[name]
    return { categories: newCats, subCategories: newSubs }
  },
  addSubCategory: (state, parentCat, name) => {
    const current = state.subCategories[parentCat] || []
    if (current.includes(name)) return state
    return {
      subCategories: {
        ...state.subCategories,
        [parentCat]: [...current, name],
      },
    }
  },
  editSubCategory: (state, parentCat, oldName, newName) => {
    const current = state.subCategories[parentCat] || []
    const updated = current.map((s) => (s === oldName ? newName : s))
    const newItems = state.items.map((it) =>
      it.primaryCategory === parentCat && it.subCategory === oldName
        ? {
            ...it,
            subCategory: newName,
            compositeName: `${newName} ${it.secondaryCategory || ''}`.trim(),
          }
        : it
    )
    return {
      subCategories: { ...state.subCategories, [parentCat]: updated },
      items: newItems,
    }
  },
  deleteSubCategory: (state, parentCat, name) => {
    const current = state.subCategories[parentCat] || []
    return {
      subCategories: {
        ...state.subCategories,
        [parentCat]: current.filter((s) => s !== name),
      },
    }
  },
  addSecondaryCategory: (state, name) => {
    if (state.secondaryCategories.includes(name)) return state
    return { secondaryCategories: [...state.secondaryCategories, name] }
  },
  editSecondaryCategory: (state, oldName, newName) => {
    const updated = state.secondaryCategories.map((s) => (s === oldName ? newName : s))
    const newItems = state.items.map((it) =>
      it.secondaryCategory === oldName
        ? {
            ...it,
            secondaryCategory: newName,
            compositeName: `${it.subCategory || ''} ${newName}`.trim(),
          }
        : it
    )
    return { secondaryCategories: updated, items: newItems }
  },
  deleteSecondaryCategory: (state, name) => ({
    secondaryCategories: state.secondaryCategories.filter((s) => s !== name),
  }),
}
