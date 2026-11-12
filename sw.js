/* VIC'TORY Trail : l'appli s'ouvre même sans réseau (les données viennent du dernier chargement). */
const V = 'vtr-1.1.0';
const CORE = ['./', 'index.html', 'app.js', 'parse.js', 'plan.js', 'twin-worker.js', 'vendor/supabase.js', 'manifest.webmanifest', 'icons/logo.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V && x !== 'vtr-tiles').map(x => caches.delete(x)))).then(() => self.clients.claim())); });
// partage depuis l'appli de la montre (Android) : on garde les fichiers puis on ouvre l'import
async function shared(req) {
  const fd = await req.formData(), c = await caches.open('vtr-share'); let i = 0;
  for (const f of fd.getAll('files')) { if (!(f instanceof File)) continue; await c.put('./partage/' + Date.now() + '-' + (i++), new Response(f, { headers: { 'x-name': encodeURIComponent(f.name || 'partage.fit') } })); }
  return Response.redirect('./#/partage', 303);
}
self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch (x) { d = { title: 'VIC\'TORY Trail', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'VIC\'TORY Trail', { body: d.body || '', tag: d.tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = e.notification.data && e.notification.data.url || './';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) if ('focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); } return clients.openWindow(url); }));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method === 'POST' && u.origin === location.origin && /\/partage\/?$/.test(u.pathname)) { e.respondWith(shared(e.request)); return; }
  if (e.request.method !== 'GET') return;
  if (/supabase\.co$/.test(u.hostname)) return; // données : toujours en direct
  if (/tile\.opentopomap\.org/.test(u.hostname)) { e.respondWith(caches.open('vtr-tiles').then(c => c.match(e.request).then(m => m || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })))); return; }
  if (/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(u.hostname)) { e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; }))); return; }
  if (u.origin !== location.origin) return;
  // toujours revalider auprès du serveur (sinon le cache HTTP de GitHub Pages peut servir une ancienne version 10 min)
  e.respondWith(fetch(u.href, { cache: 'no-cache', credentials: 'same-origin' }).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(u.origin + u.pathname, c)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match('index.html'))));
});
