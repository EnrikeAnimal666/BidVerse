// Pruebas del SERVIDOR: archivos estáticos (que no se pueda leer nada privado), API de cuentas y ranking, puntos Elo,
// límite de intentos y que el websocket solo se abra desde la propia web. Base de datos SQLite temporal (se borra al acabar).
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http'), assert = require('assert');
delete process.env.DATABASE_URL; // nunca tocar la base de datos de verdad
const { create } = require('../server/server.js'), DB = require('../server/db.js');

let n = 0;
const ok = (c, m) => { assert(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

// Petición HTTP cruda (sin normalizar la ruta, para probar ../ y %2e%2e)
function req(port, method, p, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, method, path: p, headers }, res => {
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => { const raw = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(raw); } catch (e) { /* no es JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, raw, json }); });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}
const post = (port, p, body, token) => req(port, 'POST', p, { body, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}) });
const get = (port, p, token) => req(port, 'GET', p, { headers: token ? { Authorization: 'Bearer ' + token } : {} });

// ¿Acepta el servidor el websocket con este Origin? (true = 101 Switching Protocols)
function upgrade(port, origin) {
  return new Promise(resolve => {
    const r = http.request({ host: '127.0.0.1', port, path: '/ws', headers: Object.assign({ Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==' }, origin ? { Origin: origin } : {}) });
    r.on('upgrade', (res, socket) => { socket.destroy(); resolve(true); });
    r.on('response', res => { res.resume(); resolve(false); });
    r.on('error', () => resolve(false));
    r.on('close', () => resolve(false));
    r.end();
  });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bidverse-server-'));
(async () => {
  // ---- Elo (sin servidor) ----
  eq(DB.elo(1000, 1000, 1), 16, 'Elo: mismo nivel, gana A -> +16');
  eq(DB.elo(1000, 1000, 0.5), 0, 'Elo: empate al mismo nivel -> 0');
  ok(DB.elo(1000, 1400, 1) > DB.elo(1400, 1000, 1), 'Elo: ganar a alguien mejor da más');
  ok(DB.elo(1000, 1400, 1) <= 32 && DB.elo(1400, 1000, 0) >= -32, 'Elo: nunca más de 32');
  eq(new Date(DB.weekStart(Date.UTC(2026, 10, 26, 15))).toISOString(), '2026-11-23T00:00:00.000Z', 'la semana empieza el lunes 00:00 UTC');

  const S = await create({ port: 0, dbFile: path.join(tmp, 'test.db') }), P = S.port;
  try {
    // ---- archivos estáticos ----
    let r = await get(P, '/');
    ok(r.status === 200 && /text\/html/.test(r.headers['content-type']) && /BidVerse/.test(r.raw), 'GET / sirve index.html');
    ok(r.headers['x-frame-options'] === 'DENY' && r.headers['x-content-type-options'] === 'nosniff', 'cabeceras de seguridad');
    const etag = r.headers.etag;
    r = await req(P, 'GET', '/', { headers: { 'If-None-Match': etag } }); eq(r.status, 304, 'ETag: 304 si no ha cambiado');
    r = await req(P, 'HEAD', '/engine.js'); ok(r.status === 200 && r.raw === '', 'HEAD sin cuerpo');
    r = await req(P, 'POST', '/index.html'); eq(r.status, 405, 'POST a un archivo: 405');
    r = await get(P, '/pics/Goku.jpg'); ok(r.status === 200 && r.headers['content-type'] === 'image/jpeg', 'sirve las fotos');
    r = await get(P, '/lang/es.js'); eq(r.status, 200, 'sirve lang/');
    for (const p of ['/server/db.js', '/server/server.js', '/tests/engine.test.js', '/.git/config', '/.gitignore', '/render.yaml',
      '/../server/db.js', '/%2e%2e/server/db.js', '/pics/../server/db.js', '/pics/%2e%2e/server/db.js', '/pics/..%2fserver%2fdb.js',
      '/pics/..%5cserver%5cdb.js', '/server%2fdb.js', '/server/data/test.db', '/pics/nada.jpg', '/%00', '/%E0%A4%A']) {
      r = await get(P, p); ok(r.status === 404 || r.status === 400, 'no se sirve ' + p + ' (' + r.status + ')');
      ok(!/require\(|CREATE TABLE|\[core\]/.test(r.raw), 'nada privado en la respuesta de ' + p);
    }

    // ---- cuentas ----
    r = await post(P, '/api/register', { user: 'Ana', pass: 'secreto123', av: 'Goku' });
    ok(r.status === 200 && /^[0-9a-f]{64}$/.test(r.json.token), 'registro: devuelve una sesión');
    eq([r.json.user.name, r.json.user.av, r.json.user.rating], ['Ana', 'Goku', DB.START], 'registro: nombre, avatar y 1000 puntos');
    const tA = r.json.token;
    r = await post(P, '/api/register', { user: 'ana', pass: 'otraclave' }); ok(r.status === 409 && r.json.err === 'taken', 'nombre repetido (sin distinguir mayúsculas)');
    r = await post(P, '/api/register', { user: 'a b', pass: 'secreto123' }); eq(r.json.err, 'badName', 'nombre con espacio: no');
    r = await post(P, '/api/register', { user: 'Beto', pass: '123' }); eq(r.json.err, 'badPass', 'contraseña corta: no');
    r = await post(P, '/api/register', { user: 'Beto', pass: 'secreto456', av: '<script>' });
    ok(r.status === 200 && r.json.user.av === null, 'avatar que no es un personaje: se ignora');
    const tB = r.json.token, idA = (await get(P, '/api/me', tA)).json.user.id, idB = r.json.user.id;
    r = await post(P, '/api/login', { user: 'ANA', pass: 'mal' }); ok(r.status === 401 && r.json.err === 'wrong', 'contraseña incorrecta: 401');
    r = await post(P, '/api/login', { user: 'nadie', pass: 'secreto123' }); eq(r.json.err, 'wrong', 'usuario inexistente: mismo error (no revela si existe)');
    r = await post(P, '/api/login', { user: 'ANA', pass: 'secreto123' }); ok(r.status === 200 && r.json.token !== tA, 'login: sesión nueva');
    const tA2 = r.json.token;
    ok(!fs.readFileSync(path.join(tmp, 'test.db')).includes('secreto123'), 'la contraseña no se guarda en claro');

    r = await get(P, '/api/me', tA); eq(r.json.user.name, 'Ana', '/api/me con sesión');
    r = await get(P, '/api/me'); eq(r.status, 401, '/api/me sin sesión: 401');
    r = await get(P, '/api/me', 'f'.repeat(64)); eq(r.status, 401, '/api/me con sesión falsa: 401');
    r = await post(P, '/api/profile', { av: 'Luffy' }, tB); eq(r.json.user.av, 'Luffy', 'cambiar avatar');
    r = await post(P, '/api/profile', { av: 'Luffy' }); eq(r.status, 401, 'cambiar avatar sin sesión: 401');
    r = await req(P, 'POST', '/api/profile', { body: '{"av":"Goku"}', headers: { Authorization: 'Bearer ' + tB } }); eq(r.status, 400, 'sin Content-Type JSON: 400');
    // cuerpo demasiado grande: el servidor corta la conexión (o responde 400) sin llegar a leerlo entero
    r = await post(P, '/api/profile', '{"av":"' + 'x'.repeat(3000) + '"}', tB).catch(e => ({ status: e.code }));
    ok(r.status === 400 || r.status === 'ECONNRESET', 'cuerpo demasiado grande: rechazado (' + r.status + ')');
    eq((await get(P, '/api/me', tB)).json.user.av, 'Luffy', 'y el avatar no cambia');
    r = await post(P, '/api/profile', '{roto', tB); eq(r.status, 400, 'JSON roto: 400');
    r = await get(P, '/api/nada'); eq(r.status, 404, 'ruta desconocida: 404');

    // ---- ranking y puntos ----
    r = await get(P, '/api/ranking?period=all'); ok(r.status === 200 && r.json.players === 0, 'ranking vacío al principio');
    const pts = await S.db.record({ cat: 'anime', uids: [idA, idB], w: 0 });
    eq(pts, { d: [16, -16], r: [1016, 984] }, 'gana Ana: +16 / -16');
    const dd = DB.elo(1016, 984, 0.5); ok(dd < 0, 'empate: el que va por delante pierde algo');
    eq((await S.db.record({ cat: 'ufc', uids: [idA, idB], w: -1 })).d, [dd, -dd], 'empate: reparto Elo');
    r = await get(P, '/api/ranking?period=all', tB);
    eq(r.json.rows.map(x => [x.name, x.pts, x.w, x.l, x.d, x.games]), [['Ana', 1016 + dd, 1, 0, 1, 2], ['Beto', 984 - dd, 0, 1, 1, 2]], 'ranking histórico');
    ok(r.json.rows[1].me && !r.json.rows[0].me && r.json.rows.every(x => x.id === undefined), 'marca tu fila y no expone ids');
    r = await get(P, '/api/ranking?period=week');
    ok(r.json.period === 'week' && r.json.rows[0].name === 'Ana' && r.json.rows[0].pts > 0, 'ranking semanal');

    // ---- cerrar sesión ----
    r = await post(P, '/api/logout', {}, tA); eq(r.status, 200, 'logout');
    r = await get(P, '/api/me', tA); eq(r.status, 401, 'la sesión cerrada ya no vale');
    r = await get(P, '/api/me', tA2); eq(r.status, 200, 'las otras sesiones siguen');

    // ---- websocket: solo desde la propia web ----
    ok(await upgrade(P, 'http://127.0.0.1:' + P), 'websocket desde la propia web: sí');
    ok(!(await upgrade(P, 'https://malvada.example')), 'websocket desde otra web: no');

    // ---- límite de intentos (al final: gasta los intentos de esta IP) ----
    let slow = false;
    for (let i = 0; i < 12 && !slow; i++) slow = (await post(P, '/api/login', { user: 'Ana', pass: 'prueba' + i })).status === 429;
    ok(slow, 'demasiados intentos de entrar: 429');
    r = await post(P, '/api/login', { user: 'Ana', pass: 'secreto123' }); eq(r.status, 429, 'bloqueado incluso con la contraseña buena');

    console.log('OK', n, 'comprobaciones del servidor');
  } catch (e) { console.error('FALLO:', e); process.exitCode = 1; }
  finally { S.close(); setTimeout(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* Windows puede tardar en soltar el archivo */ } process.exit(process.exitCode || 0); }, 300); }
})();
