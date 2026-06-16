/* Quartzbase PWA — Service Worker (cache + push notifications) */
const CACHE = 'nexus-v1'
const OFFLINE = '/offline'

// Pages to pre-cache for offline access
const PRECACHE_PAGES = [OFFLINE]

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE_PAGES))
      .catch(() => {})
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)

  // Skip auth, API calls and non-same-origin requests
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/auth/')) return

  // Cache-first for Next.js static chunks (they have content hashes)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached
        return fetch(e.request).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()))
          return res
        })
      })
    )
    return
  }

  // Network-first for page navigations; fall back to cache then offline page
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()))
          return res
        })
        .catch(() =>
          caches.match(e.request)
            .then(cached => cached ?? caches.match(OFFLINE))
        )
    )
  }
})

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener('push', e => {
  let data = {}
  try { data = e.data?.json() ?? {} } catch {}
  const title = data.title ?? 'Quartzbase'
  const options = {
    body:    data.body  ?? '',
    icon:    data.icon  ?? '/api/pwa/icon?size=192',
    badge:   data.badge ?? '/api/pwa/icon?size=96',
    data:    { url: (data.data && data.data.url) ? data.data.url : '/employee' },
    vibrate: [100, 50, 100],
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) ? e.notification.data.url : '/employee'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const match = cls.find(c => c.url.includes(url))
      if (match) return match.focus()
      return self.clients.openWindow(url)
    })
  )
})
