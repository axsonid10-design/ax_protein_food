import { useState, useEffect, useCallback, useRef } from 'react'
import { AX_DraftsService } from '../services/AX_DraftsService'

export function useDrafts(type = 'transfer') {
  const [drafts, setDrafts] = useState([])
  const [activeDraftId, setActiveDraftId] = useState(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const statusTimerRef = useRef(null)

  const loadDrafts = useCallback(async () => {
    try {
      const list = await AX_DraftsService.getDrafts(type)
      setDrafts(list)
      return list
    } catch {
      return []
    }
  }, [type])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  const saveDraft = useCallback(
    async (payload, title, customId) => {
      const draftId = customId || activeDraftId || `draft_${type}_${Date.now()}`
      const draft = {
        id: draftId,
        type,
        title: title || `مسودة ${type === 'transfer' ? 'تحويل' : 'جرد'} ${new Date().toLocaleTimeString('en-US')}`,
        payload,
        updatedAt: new Date().toISOString(),
      }
      setAutoSaveStatus('saving')
      try {
        const saved = await AX_DraftsService.saveDraftImmediate(draft)
        setActiveDraftId(saved.id)
        setAutoSaveStatus('saved')
        setLastSavedAt(new Date())
        await loadDrafts()
        return saved
      } catch (err) {
        setAutoSaveStatus('error')
        throw err
      }
    },
    [type, activeDraftId, loadDrafts]
  )

  const saveDraftDebounced = useCallback(
    (payload, title, customId) => {
      const draftId = customId || activeDraftId || `draft_${type}_${Date.now()}`
      if (!activeDraftId) {
        setActiveDraftId(draftId)
      }
      const draft = {
        id: draftId,
        type,
        title: title || `مسودة ${type === 'transfer' ? 'تحويل' : 'جرد'} ${new Date().toLocaleTimeString('en-US')}`,
        payload,
        updatedAt: new Date().toISOString(),
      }
      setAutoSaveStatus('saving')
      AX_DraftsService.saveDraftDebounced(draft)
        .then(() => {
          if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
          statusTimerRef.current = setTimeout(() => {
            setAutoSaveStatus('saved')
            setLastSavedAt(new Date())
          }, 400)
        })
        .catch(() => {
          setAutoSaveStatus('error')
        })
    },
    [type, activeDraftId]
  )

  const resumeDraft = useCallback(
    (id) => {
      const found = drafts.find((d) => d.id === id)
      if (found) {
        setActiveDraftId(found.id)
        return found
      }
      return null
    },
    [drafts]
  )

  const deleteDraft = useCallback(
    async (id) => {
      if (!id) return
      await AX_DraftsService.deleteDraft(id)
      setDrafts((prev) => prev.filter((d) => d.id !== id))
      if (activeDraftId === id) {
        setActiveDraftId(null)
        setAutoSaveStatus('idle')
      }
    },
    [activeDraftId]
  )

  const detachActiveDraft = useCallback(() => {
    setActiveDraftId(null)
    setAutoSaveStatus('idle')
  }, [])

  const discardActiveDraft = useCallback(async () => {
    if (activeDraftId) {
      await AX_DraftsService.deleteDraft(activeDraftId)
      setDrafts((prev) => prev.filter((d) => d.id !== activeDraftId))
      setActiveDraftId(null)
      setAutoSaveStatus('idle')
    }
  }, [activeDraftId])

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    }
  }, [])

  return {
    drafts,
    activeDraftId,
    setActiveDraftId,
    autoSaveStatus,
    lastSavedAt,
    loadDrafts,
    saveDraft,
    saveDraftDebounced,
    resumeDraft,
    deleteDraft,
    detachActiveDraft,
    discardActiveDraft,
  }
}
