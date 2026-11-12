// LISNR Lightweight Service Worker for PWA installation & background audio support
const CACHE_NAME = 'lisnr-v1'
const STATIC_ASSETS = ['/', '/manifest.json', '/icon.svg', '/logo.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Never cache audio streams, WebSockets, or Supabase API calls
  const url = event.request.url
  if (
    url.includes('/api/') ||
    url.includes('/ws') ||
    url.includes(':8000') ||
    url.includes('.r2.dev') ||
    url.includes('supabase.co') ||
    event.request.method !== 'GET'
  ) {
    return
  }

  // Network-first for dynamic navigation, cache-first for static icons
  if (url.endsWith('.svg') || url.endsWith('.png') || url.endsWith('.woff2')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
            }
            return response
          })
        )
      })
    )
  }
})
