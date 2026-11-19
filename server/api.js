'use strict';
/* BidVerse · API de cuentas y ranking (JSON por HTTP). La sesión viaja en la cabecera  Authorization: Bearer <código>
     POST /api/register  { user, pass, av? }  → { token, user }          errores: badName · badPass · taken
     POST /api/login     { user, pass }       → { token, user }          errores: wrong
     POST /api/logout                          → { ok: true }
     GET  /api/me                              → { user }                 errores: auth
     POST /api/profile   { av }                → { user }  (cambia la foto de perfil)
     GET  /api/ranking?period=week|all         → { period, since, players, rows: [...], me }
   Límite de intentos de entrar/registrarse por IP para que no se puedan probar contraseñas a lo bruto. */
const LIMIT = 10, WINDOW = 5 * 60000; // 10 intentos cada 5 minutos por IP

function makeApi(db, { avOk = () => true } = {}) {
  const tries = new Map();
  const slow = ip => { const now = Date.now(), t = tries.get(ip); if (!t || now - t.at > WINDOW) { tries.set(ip, { at: now, n: 1 }); return false; } return ++t.n > LIMIT; };
  setInterval(() => { const now = Date.now(); for (const [ip, t] of tries) if (now - t.at > WINDOW) tries.delete(ip); }, WINDOW).unref();

  const send = (res, code, obj) => {
    const body = JSON.stringify(obj);
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  };
  const body = req => new Promise(resolve => {
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return resolve(null);
    let raw = '', big = false;
    req.setEncoding('utf8');
    req.on('data', c => { raw += c; if (raw.length > 2048) { big = true; req.destroy(); } });
    req.on('end', () => { if (big) return resolve(null); try { const o = JSON.parse(raw); resolve(o && typeof o === 'object' ? o : null); } catch (e) { resolve(null); } });
    req.on('error', () => resolve(null));
  });
  const tokenOf = req => { const m = /^Bearer ([0-9a-f]{64})$/.exec(req.headers.authorization || ''); return m ? m[1] : null; };

  return async function api(req, res, ip) {
    const url = new URL(req.url, 'http://x'), route = req.method + ' ' + url.pathname;
    try {
      switch (route) {
        case 'POST /api/register': case 'POST /api/login': {
          if (slow(ip)) return send(res, 429, { err: 'slow' });
          const b = await body(req); if (!b) return send(res, 400, { err: 'bad' });
          const r = route.endsWith('register') ? await db.register(b.user, b.pass, avOk(b.av) ? b.av : null) : await db.login(b.user, b.pass);
          if (r.err) return send(res, r.err === 'taken' ? 409 : r.err === 'wrong' ? 401 : 400, r);
          return send(res, 200, r);
        }
        case 'POST /api/logout': await db.logout(tokenOf(req)); return send(res, 200, { ok: true });
        case 'GET /api/me': { const u = await db.byToken(tokenOf(req)); return u ? send(res, 200, { user: u }) : send(res, 401, { err: 'auth' }); }
        case 'POST /api/profile': {
          const u = await db.byToken(tokenOf(req)); if (!u) return send(res, 401, { err: 'auth' });
          const b = await body(req); if (!b) return send(res, 400, { err: 'bad' });
          return send(res, 200, { user: await db.setAvatar(u.id, avOk(b.av) ? b.av : null) });
        }
        case 'GET /api/ranking': {
          const u = await db.byToken(tokenOf(req));
          return send(res, 200, await db.ranking(url.searchParams.get('period') === 'week' ? 'week' : 'all', u && u.id));
        }
      }
      return send(res, 404, { err: 'notFound' });
    } catch (e) { console.error('error en la API:', e); return send(res, 500, { err: 'server' }); }
  };
}
module.exports = { makeApi };
