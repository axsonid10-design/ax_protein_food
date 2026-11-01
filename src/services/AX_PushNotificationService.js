import { supabase } from './supabaseClient'

const VAPID_PUBLIC_KEY = 'BN_WE73GEGmGJDVQmIzM1rSd3ac2e9v2twABBM_cBqATkowZ_9e0_sTNa3FwA5yI39ZnqPEvYI4Qe3ZwXX2SqRI'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64Url(buffer) {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const AX_PushNotificationService = {
  isSupported: () => {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  },

  getPermissionState: () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission
  },

  getActiveSubscription: async () => {
    if (!AX_PushNotificationService.isSupported()) return null
    try {
      const reg = await navigator.serviceWorker.ready
      return await reg.pushManager.getSubscription()
    } catch {
      return null
    }
  },

  subscribeUser: async (userId) => {
    if (!userId) return { success: false, reason: 'missing_user_id' }
    if (!AX_PushNotificationService.isSupported()) return { success: false, reason: 'unsupported' }

    try {
      let permission = Notification.permission
      if (permission === 'default') {
        permission = await Notification.requestPermission()
      }

      if (permission !== 'granted') {
        return { success: false, reason: 'permission_denied' }
      }

      const reg = await navigator.serviceWorker.ready
      let subscription = await reg.pushManager.getSubscription()

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        })
      }

      const subJson = typeof subscription.toJSON === 'function' ? subscription.toJSON() : {}
      const p256dh = (subJson.keys && subJson.keys.p256dh) || (subscription.getKey ? arrayBufferToBase64Url(subscription.getKey('p256dh')) : '') || ''
      const auth = (subJson.keys && subJson.keys.auth) || (subscription.getKey ? arrayBufferToBase64Url(subscription.getKey('auth')) : '') || ''

      if (!subscription.endpoint || !p256dh || !auth) {
        return { success: false, reason: 'invalid_keys' }
      }

      const { data, error } = await supabase
        .from('ax_push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
          project_slug: 'protein-food',
          updated_at: new Date().toISOString()
        }, { onConflict: 'endpoint' })
        .select()
        .single()

      if (error) throw error

      return { success: true, subscription, record: data }
    } catch (err) {
      return { success: false, reason: err.message || 'unknown_error' }
    }
  },

  unsubscribeUser: async (userId) => {
    if (!AX_PushNotificationService.isSupported()) return { success: false }

    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()

      if (subscription) {
        await supabase
          .from('ax_push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint)

        await subscription.unsubscribe()
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  sendTestPush: async (userId) => {
    const { data, error } = await supabase.functions.invoke('ax-web-push', {
      body: {
        project_slug: 'protein-food',
        userId: userId || 'all',
        title: 'بروتين فود — تنبيه فوري',
        body: 'تم تأكيد وصول إشعارات الهاتف واهتزاز الجهاز بنجاح 24/7!',
        link: '/',
        icon: 'https://protein-food.axsonid.com/pwa-192x192.png',
        badge: 'https://protein-food.axsonid.com/pwa-192x192.png',
        image: 'https://protein-food.axsonid.com/og-image.png',
        tag: 'ax-test-push-' + Date.now()
      }
    })

    if (error) throw error
    return data
  }
}
