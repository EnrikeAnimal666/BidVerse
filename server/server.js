'use strict';
/* BidVerse · SERVIDOR (sin dependencias). Sirve la web y las partidas online.
   Uso:  node server/server.js            -> solo en tu ordenador: http://localhost:3000
         node server/server.js --lan      -> también visible para otros dispositivos de tu red local
         node server/server.js --port 8080 */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const ws = require('./ws.js'), { Hub } = require('./rooms.js');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.ico': 'image/x-icon' };
// Solo se sirve esto: nada de server/, tests/, .git, node_modules…
const FILES = new Set(['index.html', 'styles.css', 'game.js', 'engine.js', 'online.js', 'data-anime.js', 'data-ufc.js', 'data-futbol.js', 'data-imgs.js']);
const DIRS = new Set(['lang', 'pics', 'bg']);

function loadPools() { // los datos son scripts de navegador: se evalúan aquí para tener los mismos personajes que el cliente
  const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var ');
  const out = {};
  new Function('out', read('data-anime.js') + read('data-ufc.js') + read('data-futbol.js') + ';out.anime=POOLS.anime;out.ufc=UFC;out.divs=UFC_DIVS;out.futbol=FUT;out.futDivs=FUT_DIVS')(out);
  return { pools: { anime: out.anime, ufc: out.ufc, futbol: out.futbol }, divs: out.divs, futDivs: out.futDivs };
}

function staticHandler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
  let p; try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (p === '/') p = '/index.html';
  const parts = p.split('/').filter(Boolean);
  const ok = parts.length && !parts.some(x => x.startsWith('.') || x.includes('\\') || x.includes('\0')) &&
    ((parts.length === 1 && FILES.has(parts[0])) || (parts.length === 2 && DIRS.has(parts[0])));
  const file = ok ? path.join(ROOT, ...parts) : null, type = file && MIME[path.extname(file).toLowerCase()];
  if (!file || !type || !file.startsWith(ROOT + path.sep)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('No encontrado'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('No encontrado'); }
    // ETag: el navegador solo vuelve a descargar un archivo si ha cambiado; las imágenes además se guardan 1 día
    const etag = '"' + st.size.toString(36) + '-' + Math.floor(st.mtimeMs).toString(36) + '"';
    const head = { ETag: etag, 'Cache-Control': DIRS.has(parts[0]) && parts[0] !== 'lang' ? 'public, max-age=86400' : 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, head); return res.end(); }
    res.writeHead(200, Object.assign({ 'Content-Type': type, 'Content-Length': st.size }, head));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

function create({ port = 3000, host = '127.0.0.1', speed = 1, maxPerIp = 12, allowedOrigins = [], trustProxy = false, maxRooms = 300 } = {}) {
  const { pools, divs, futDivs } = loadPools();
  const rng = () => crypto.randomInt(0x100000000) / 0x100000000;
  const hub = new Hub({ pools, divs, futDivs, rng, speed, maxRooms });
  const server = http.createServer(staticHandler);
  server.requestTimeout = 15000; server.headersTimeout = 10000; server.maxHeadersCount = 40;
  const perIp = new Map();
  const ipOf = req => (trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';

  // Solo la propia web puede abrir el websocket desde un navegador (evita que otra página use la sesión de un jugador)
  const allowOrigin = (origin, hostHeader) => { try { return new URL(origin).host === hostHeader || allowedOrigins.includes(origin); } catch (e) { return false; } };

  server.on('upgrade', (req, socket) => {
    const ip = ipOf(req);
    if ((perIp.get(ip) || 0) >= maxPerIp) { socket.end('HTTP/1.1 429 Too Many Requests\r\nContent-Length: 0\r\n\r\n'); return; }
    const conn = ws.accept(req, socket, { path: '/ws', allowOrigin, maxPayload: 2048 });
    if (!conn) return;
    perIp.set(ip, (perIp.get(ip) || 0) + 1);
    let tokens = 12, last = Date.now(), strikes = 0, hi = false;
    const hello = setTimeout(() => { if (!hi) conn.close(1008, 'hello'); }, 5000);
    conn.on('message', raw => {
      const now = Date.now(); tokens = Math.min(12, tokens + (now - last) * 0.01); last = now; // 10 mensajes/s con ráfagas de 12
      if (tokens < 1) { if (++strikes > 40) conn.close(1008, 'rate'); return; }
      tokens -= 1;
      let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
      if (msg && msg.t === 'hello') hi = true;
      try { hub.handle(conn, msg); } catch (e) { console.error('error en mensaje:', e); conn.send({ t: 'err', code: 'server' }); }
    });
    conn.on('close', () => { clearTimeout(hello); const n = (perIp.get(ip) || 1) - 1; n ? perIp.set(ip, n) : perIp.delete(ip); hub.disconnect(conn); });
  });
  const timer = setInterval(() => hub.step(100), 100);
  return new Promise(resolve => server.listen(port, host, () => resolve({ server, hub, port: server.address().port, close: () => { clearInterval(timer); server.closeAllConnections?.(); server.close(); } })));
}
module.exports = { create };

if (require.main === module) {
  const a = process.argv.slice(2), lan = a.includes('--lan'), pi = a.indexOf('--port');
  const port = pi >= 0 ? parseInt(a[pi + 1], 10) || 3000 : parseInt(process.env.PORT, 10) || 3000;
    // En un hosting (Render, Railway…) la plataforma define PORT y hay que escuchar en todas las interfaces
  const host = process.env.HOST || (lan || process.env.PORT ? '0.0.0.0' : '127.0.0.1');
  create({ port, host, trustProxy: process.env.TRUST_PROXY === '1', allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean) }).then(s => {
    console.log('\n  BidVerse está en marcha.\n');
    console.log('  En este ordenador:  http://localhost:' + s.port + (host === '0.0.0.0' && !lan ? '  (escuchando en 0.0.0.0)' : ''));
    if (lan) { for (const l of Object.values(os.networkInterfaces()).flat()) if (l && l.family === 'IPv4' && !l.internal) console.log('  En tu red local:    http://' + l.address + ':' + s.port); }
    else console.log('  (para que otros dispositivos de tu red entren, arráncalo con --lan)');
    console.log('\n  Para pararlo: Ctrl+C\n');
  }).catch(e => { console.error(e.code === 'EADDRINUSE' ? 'El puerto ' + port + ' ya está en uso. Prueba: node server/server.js --port 3001' : e); process.exit(1); });
}