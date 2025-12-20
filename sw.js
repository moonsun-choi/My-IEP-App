
const CACHE_NAME = 'my-iep-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json'
];

// 서비스 워커 설치 및 리소스 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 이전 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 네트워크 요청 가로채기 (Stale-While-Revalidate 전략)
self.addEventListener('fetch', (event) => {
  // POST 요청이나 Google Drive API는 캐시하지 않음
  if (event.request.method !== 'GET' || event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // 유효한 응답이면 캐시에 저장
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 오프라인일 때 캐시된 응답이 없으면 기본 처리
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
