const STATIC_CACHE = 'splash-air-static-v2';
const API_CACHE = 'splash-air-api-v1';
const QUEUE_DB = 'splash-air-offline-queue';
const QUEUE_STORE = 'requests';
const OFFLINE_URL = '/offline.html';

const QUEUEABLE_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const QUEUEABLE_PATHS = ['/api/jobs', '/api/gas-usage', '/api/gas-stock', '/api/inventory', '/api/consumables', '/api/checklists', '/api/diagnostics'];

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isQueueable(request) {
  const url = new URL(request.url);
  return isSameOrigin(request)
    && QUEUEABLE_METHODS.has(request.method)
    && QUEUEABLE_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`));
}

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function enqueueRequest(request) {
  const body = await request.clone().arrayBuffer();
  const headers = Array.from(request.headers.entries());
  const db = await openQueueDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).add({ url: request.url, method: request.method, headers, body, credentials: request.credentials });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function replayQueuedRequests() {
  const db = await openQueueDb();
  const entries = await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const request = tx.objectStore(QUEUE_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  for (const entry of entries) {
    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: new Headers(entry.headers),
        body: entry.body,
        credentials: entry.credentials || 'include',
      });
      if (!response.ok) continue;
      await new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, 'readwrite');
        tx.objectStore(QUEUE_STORE).delete(entry.id);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      break;
    }
  }
  db.close();
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(['/', OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('splash-air-') && key !== STATIC_CACHE)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!isSameOrigin(request)) return;

  if (isQueueable(request)) {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        try {
          await enqueueRequest(request);
          if ('sync' in self.registration) await self.registration.sync.register('splash-air-sync');
          return new Response(JSON.stringify({ success: true, queued: true, message: 'Saved offline and will sync when connected.' }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch {
          return new Response(JSON.stringify({ success: false, offline: true, message: 'Offline and unable to queue this change.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    })());
    return;
  }

  if (request.method !== 'GET') return;
  if (new URL(request.url).pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) await cache.put(request, response.clone());
          return response;
        } catch {
          return (await cache.match(request)) || new Response(JSON.stringify({ success: false, offline: true, message: 'Offline. Showing the last saved data.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) await cache.put(request, response.clone());
          return response;
        } catch {
          return (await cache.match(request)) || (await cache.match('/')) || caches.match(OFFLINE_URL);
        }
      })
    );
    return;
  }
  if (!['image', 'font', 'script', 'style'].includes(request.destination)) return;
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'splash-air-sync') event.waitUntil(replayQueuedRequests());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'REPLAY_OFFLINE_QUEUE') event.waitUntil(replayQueuedRequests());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const { title, body, url } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
