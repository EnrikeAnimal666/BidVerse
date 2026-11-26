/* BidVerse · service worker
   · Páginas, scripts y estilos: primero la red (así nunca se mezcla una versión vieja de la web con el servidor nuevo); sin red, lo guardado.
   · Fotos, fondos y dibujos de luchadores (pics/, bg/, luchadores/): primero lo guardado (no cambian; si se sustituye uno, game.js cambia el ?v= de la URL).
   · Nunca toca /api/ ni /ws (cuentas, ranking y partidas online van siempre por la red), ni archivos de otras webs (three.js, fuentes, fotos de Wikipedia). */
const V = 'bidverse-v1', SHELL = ['./', 'index.html', 'styles.css', 'engine.js', 'game.js', 'cpu.js', 'online.js', 'extras.js',
  'data-anime.js', 'data-ufc.js', 'data-futbol.js', 'data-imgs.js', 'lang/en.js', 'lang/es.js', 'lang/online.js', 'pics/logo-icon.png', 'pics/LogoBidVerse.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname === '/ws') return;
  const media = /^\/(pics|bg|luchadores)\//.test(u.pathname);
  e.respondWith(media ? cacheFirst(r) : networkFirst(r));
});
async function cacheFirst(r) {
  const c = await caches.open(V), hit = await c.match(r);
  if (hit) return hit;
  const res = await fetch(r);
  if (res.ok) c.put(r, res.clone()).catch(() => {});
  return res;
}
async function networkFirst(r) {
  const c = await caches.open(V);
  try {
    const res = await fetch(r);
    if (res.ok) c.put(r, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await c.match(r, { ignoreSearch: true }) || (r.mode === 'navigate' && await c.match('index.html'));
    if (hit) return hit;
    throw err;
  }
}
