import { useEffect } from 'react'
import { useAXStore } from '../store/useAXStore'
import { offlineSync } from '../services/offlineSync'

export function useNetworkStatus() {
  const { isOnline, pendingSyncCount, isSyncing, setOnline, setPendingSyncCount, setIsSyncing, setLastSyncTime } = useAXStore()

  useEffect(() => {
    const refreshCount = async () => {
      const count = await offlineSync.getPendingCount()
      setPendingSyncCount(count)
    }

    refreshCount()

    const handleOnline = async () => {
      setOnline(true)
      setIsSyncing(true)
      await offlineSync.processQueue()
      await refreshCount()
      setIsSyncing(false)
      setLastSyncTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }))
    }

    const handleOffline = () => {
      setOnline(false)
      refreshCount()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline, setPendingSyncCount, setIsSyncing, setLastSyncTime])

  const manualSync = async () => {
    setIsSyncing(true)
    await offlineSync.processQueue()
    const count = await offlineSync.getPendingCount()
    setPendingSyncCount(count)
    setIsSyncing(false)
    setLastSyncTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }))
  }

  return { isOnline, pendingSyncCount, isSyncing, manualSync }
}
