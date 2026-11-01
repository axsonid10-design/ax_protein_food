import { supabase } from './supabaseClient.js'
import { generateUUID } from '../utils/AX_UUID.js'

export const AX_CategoryOperationsService = {
  addCategoryInDB: async (cat, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !cat?.name) return { success: false }
    try {
      const name = cat.name.trim()
      const level = cat.level || 'primary'
      let parentId = null
      if (level === 'sub' && cat.parentName) {
        const { data: parent } = await supabase.from('ax_categories').select('id').eq('name', cat.parentName.trim()).eq('level', 'primary').maybeSingle()
        parentId = parent?.id || null
      }
      const id = generateUUID()
      const { error } = await supabase.from('ax_categories').insert({ id, name, level, parent_id: parentId })
      if (error) throw error
      return { success: true, id }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  editCategoryInDB: async (payload, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !payload?.oldName || !payload?.newName) return { success: false }
    try {
      const oldName = payload.oldName.trim()
      const newName = payload.newName.trim()
      const level = payload.level || 'primary'
      const { error } = await supabase.from('ax_categories').update({ name: newName }).eq('name', oldName).eq('level', level)
      if (error) throw error
      if (level === 'primary') {
        await supabase.from('ax_items').update({ primary_category: newName }).eq('primary_category', oldName)
      } else if (level === 'sub') {
        await supabase.from('ax_items').update({ sub_category: newName }).eq('sub_category', oldName)
      } else if (level === 'secondary') {
        await supabase.from('ax_items').update({ secondary_category: newName }).eq('secondary_category', oldName)
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteCategoryInDB: async (payload, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !payload?.name) return { success: false }
    try {
      const name = payload.name.trim()
      const level = payload.level || 'primary'
      const { error } = await supabase.from('ax_categories').delete().eq('name', name).eq('level', level)
      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },
}
