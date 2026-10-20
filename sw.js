// Cache mínima para que la app abra sin conexión. Subir VERSION al cambiar archivos.
const VERSION = 'sg-v27';
const SHELL = ['./', 'index.html', 'logos.js', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Red primero (siempre la última versión); si no hay red, caché.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return; // los logos de terceros los carga el navegador directamente
  e.respondWith(fetch(e.request, {cache:'no-cache'}).then(r => {
    const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request)));
});
