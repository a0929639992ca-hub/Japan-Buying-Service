// Service Worker for Rento
const CACHE_NAME = 'rento-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
];

// 安裝 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 這裡僅快取基本檔案，實際運作主要靠 Network
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 啟用 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 攔截請求 (優先使用網路，網路失敗才用快取)
self.addEventListener('fetch', (event) => {
  // 忽略非 GET 請求或 Firebase API
  if (event.request.method !== 'GET' || event.request.url.includes('firebase')) return;

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});