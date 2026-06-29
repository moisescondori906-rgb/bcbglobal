self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

const CACHE_NAME = 'bcb-cache-v7.0.0'; // BCB GLOBAL - Nueva marca y caché


self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Manejador de peticiones para evitar errores con videos en Chrome (ERR_CACHE_OPERATION_NOT_SUPPORTED)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // NUNCA cachear videos ni usar el SW para peticiones de video (Range requests)
  if (url.pathname.endsWith('.mp4') || url.pathname.includes('/video/')) {
    return; // Dejar que el navegador maneje la petición normalmente
  }

  // Para otras peticiones, por ahora no hacemos nada (estrategia network-only por defecto)
  // Pero permitimos que el navegador maneje las peticiones de forma estándar.
});
