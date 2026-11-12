/* VIC'TORY Trail : l'appli s'ouvre même sans réseau (les données viennent du dernier chargement). */
const V = 'vtr-0.3.0';
const CORE = ['./', 'index.html', 'app.js', 'parse.js', 'vendor/supabase.js', 'manifest.webmanifest', 'icons/logo.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V && x !== 'vtr-tiles').map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET') return;
  if (/supabase\.co$/.test(u.hostname)) return; // données : toujours en direct
  if (/tile\.opentopomap\.org/.test(u.hostname)) { e.respondWith(caches.open('vtr-tiles').then(c => c.match(e.request).then(m => m || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })))); return; }
  if (/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(u.hostname)) { e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; }))); return; }
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok && !u.search) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match('index.html'))));
});
