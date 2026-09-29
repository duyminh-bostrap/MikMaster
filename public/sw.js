/*
 * Service worker tối thiểu để MikMaster cài được như app và mở được khi gateway tạm tắt.
 * - /api/*: không bao giờ cache (trạng thái máy chiếu phải là thật).
 * - Trang HTML: mạng trước, rớt mạng thì dùng bản đã lưu (để bản build mới được nhận ngay).
 * - /assets/* (tên file có hash): cache trước.
 */
const CACHE = 'mikmaster-v1'
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone()
        caches.open(CACHE).then(c => c.put('/', copy))
        return res
      }).catch(() => caches.match('/')),
    )
    return
  }

  event.respondWith(
    caches.match(req).then(hit => hit ?? fetch(req).then(res => {
      if (res.ok && (url.pathname.startsWith('/assets/') || SHELL.includes(url.pathname))) {
        const copy = res.clone()
        caches.open(CACHE).then(c => c.put(req, copy))
      }
      return res
    })),
  )
})
