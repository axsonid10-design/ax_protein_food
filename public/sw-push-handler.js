let lastPushBody = ''
let lastPushTime = 0

self.addEventListener('push', function (event) {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (_) {
    payload = { body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'بروتين فود — إشعار فوري'
  const body = payload.body || payload.message || 'تنبيه تشغيلي جديد من منظومة المجمدات'
  const now = Date.now()

  if (body === lastPushBody && (now - lastPushTime) < 3500) {
    return
  }
  lastPushBody = body
  lastPushTime = now

  const origin = self.location.origin
  const toAbsolute = (url, fallback) => {
    const val = url || fallback
    if (!val) return undefined
    if (val.startsWith('http://') || val.startsWith('https://')) return val
    return `${origin}${val.startsWith('/') ? '' : '/'}${val}`
  }

  const icon = toAbsolute(payload.icon, '/pwa-192x192.png')
  const badge = toAbsolute(payload.badge, '/pwa-192x192.png')
  const image = payload.image ? toAbsolute(payload.image, null) : toAbsolute('/og-image.png', null)
  const link = payload.link || payload.url || (payload.data && (payload.data.url || payload.data.link)) || '/'
  const stableTag = payload.tag || ('ax-push-' + (body || '').slice(0, 25).trim())

  const notificationOptions = {
    body,
    icon,
    badge,
    image,
    dir: 'rtl',
    lang: 'ar-EG',
    tag: stableTag,
    renotify: false,
    requireInteraction: true,
    vibrate: [300, 150, 300, 150, 300],
    data: {
      link,
      url: link,
      timestamp: Date.now(),
      ...payload.data
    },
    actions: [
      { action: 'open', title: 'فتح المنظومة' },
      { action: 'dismiss', title: 'إغلاق' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  if (event.action === 'dismiss' || event.action === 'close') {
    return
  }

  const targetUrl =
    (event.notification.data && (event.notification.data.link || event.notification.data.url)) ||
    '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl)
          }
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data
    self.registration.showNotification(title, options)
  }
})
