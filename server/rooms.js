'use strict';
/* BidVerse · SALAS Y SESIONES (sin red: recibe "conexiones" con send()/close()). Así se puede probar sin abrir puertos.
   El servidor manda: el cliente solo pide pujar o pasar; el motor (engine.js) decide y este módulo reparte los resultados.
   Nunca se envía el poder de nadie: solo nombres, dinero y estado de la subasta. */
const crypto = require('crypto');
const BE = require('../engine.js');

const CODE_ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';           // sin 0/O/1/I/L para no confundir
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,15}$/u;          // 2-16 caracteres; nada de < > & " ' que pueda romper el HTML
const CODE_RE = /^[A-Z2-9]{5}$/;
const CATS = ['anime', 'ufc', 'futbol'];

const cleanName = s => {
  if (typeof s !== 'string' || s.length > 64) return null;
  const n = s.normalize('NFC').trim().replace(/\s+/g, ' ');
  return NAME_RE.test(n) ? n : null;
};
const snap = g => ({
  cat: g.cat, dv: g.dv, phase: g.phase, cur: g.cur ? g.cur.n : null, bid: g.bid, leader: g.leader, left: g.left, free: g.free, fp: !!g.fp,
  passed: [...g.passed], skips: [...g.skips], locked: g.locked,
  P: g.P.map(p => ({ m: p.m, c: p.c.map(c => ({ n: c.n, paid: c.paid, free: !!c.free })) })),
});

class Room {
  constructor(hub, code, cat) {
    Object.assign(this, { hub, code, cat, players: [null, null], g: null, phase: 'lobby', time: 0, sched: null, ticking: false, nextTick: 0, pausedMs: 0, idleMs: 0, wantAgain: [false, false], fight: null });
  }
  idx(s) { return this.players.indexOf(s); }
  names() { return this.players.map(s => (s ? s.name : null)); }
  avs() { return this.players.map(s => (s && s.av) || null); } // avatar = nombre de un personaje de anime (nunca una foto subida)
  send(i, msg) { const s = this.players[i]; if (s && s.conn) s.conn.send(msg); }
  all(msg) { this.send(0, msg); this.send(1, msg); }
  info() { return { t: 'room', code: this.code, cat: this.cat, names: this.names(), avs: this.avs(), phase: this.phase, connected: this.players.map(s => !!(s && s.conn)) }; }

  startGame() {
    this.g = BE.create({ cat: this.cat, pool: this.hub.pools[this.cat], divs: this.cat === 'futbol' ? (this.hub.futDivs || BE.FUT_DIVS) : this.hub.divs, rng: this.hub.rng });
    Object.assign(this, { phase: 'auction', time: 0, sched: null, ticking: false, pausedMs: 0, wantAgain: [false, false], fight: null, scored: false });
    [0, 1].forEach(i => this.send(i, { t: 'start', cat: this.cat, names: this.names(), avs: this.avs(), you: i }));
    this.apply(BE.next(this.g), null);
  }

  // Reparte lo que ha pasado en el motor. actor = jugador que hizo la acción (para enviarle solo a él los errores).
  apply(res, actor) {
    const g = this.g, ev = [];
    for (const e of res.ev) { if (e.t === 'err') { if (actor != null) this.send(actor, { t: 'err', code: e.code, arg: e.arg }); } else ev.push(e); }
    if (res.wait) this.sched = { at: this.time + res.wait.ms, act: res.wait.act };
    const bidding = g.phase === 'bidding';
    if (bidding && !this.ticking) { this.ticking = true; this.nextTick = this.time + 1000; } else if (!bidding) this.ticking = false;
    if (ev.length === 1 && ev[0].t === 'tick') this.all({ t: 'tick', left: g.left });
    else if (ev.length) this.all({ t: 'state', s: snap(g), ev });
    if (g.phase === 'fight' && this.phase === 'auction') { // subasta terminada: en anime cada uno elige su orden; luego se resuelve el combate en el servidor
      this.sched = null; this.ticking = false;
      if (this.cat === 'anime' && g.P.some(p => p.c.length > 1)) this.startOrder(); else this.fightNow();
    }
  }
  // ORDEN DE COMBATE (anime): cada jugador manda su orden en secreto; si se acaba el tiempo, se queda el orden de compra
  startOrder() {
    Object.assign(this, { phase: 'order', ord: [null, null], ordAt: this.time + this.hub.orderMs });
    this.all({ t: 'order', ms: this.hub.orderMs, done: [false, false] });
  }
  setOrder(s, perm) {
    const i = this.idx(s);
    if (i < 0 || this.phase !== 'order' || this.ord[i] || !Array.isArray(perm) || perm.length > 3) return;
    if (!BE.order(this.g, i, perm)) return;
    this.ord[i] = perm; this.all({ t: 'orderReady', i });
    if (this.ord[0] && this.ord[1]) this.fightNow();
  }
  fightNow() {
    this.phase = 'fight'; this.sched = null; this.ticking = false;
    const f = Object.assign({ t: 'fight' }, BE.resolve(this.g)), g = this.g; // { kind: 'anime' | 'ufc' | 'futbol', script }
    const w = f.kind === 'ufc' ? f.script.result.w : f.script.winner;        // 0 | 1 | -1 (empate)
    this.fight = null; // se envía cuando la partida ya está guardada (la base de datos puede tardar un poco)
    Promise.resolve(this.score(w, 'fight')).then(pts => {
      if (this.g !== g || !this.hub.rooms.has(this.code)) return; // la sala ya no existe
      f.pts = pts; this.fight = f; this.all(f); // pts = puntos del ranking: { d: [Δ jugador 1, Δ jugador 2], r: [puntos nuevos…] } o null
    });
  }
  // Guarda la partida en la base de datos y reparte los puntos. Solo cuenta entre dos cuentas distintas y una vez por partida.
  // Devuelve una promesa con los puntos, o null si la partida no cuenta.
  score(w, reason) {
    const users = this.hub.users, uids = this.players.map(s => s && s.uid);
    if (!users || this.scored || !uids[0] || !uids[1] || uids[0] === uids[1]) return null;
    this.scored = true;
    return Promise.resolve().then(() => users.record({ cat: this.cat, uids, w, reason })).catch(e => { console.error('no se pudo guardar la partida:', e); return null; });
  }

  bid(s, amount) {
    const i = this.idx(s);
    if (i < 0 || this.phase !== 'auction' || !this.players[1] || this.paused()) return;
    if (!(typeof amount === 'number' || (typeof amount === 'string' && amount.length <= 12))) return;
    this.apply(BE.place(this.g, i, amount), i);
  }
  skip(s) {
    const i = this.idx(s);
    if (i < 0 || this.phase !== 'auction' || !this.players[1] || this.paused()) return;
    this.apply(BE.skip(this.g, i), i);
  }
  paused() { return this.players.some(s => !s || !s.conn); }

  advance(dt) {
    const anyConn = this.players.some(s => s && s.conn);
    this.idleMs = anyConn ? 0 : this.idleMs + dt;
    if (this.phase === 'order') { this.time += dt; if (this.time >= this.ordAt) this.fightNow(); return; }
    if (this.phase !== 'auction') return;
    if (this.paused()) { this.pausedMs += dt; if (this.pausedMs > this.hub.abandonMs) this.abandon(); return; }
    this.pausedMs = 0;
    const target = this.time + dt;
    while (this.phase === 'auction') { // procesa en orden los eventos de tiempo que caen dentro de este intervalo
      const ts = this.sched ? this.sched.at : Infinity, tt = this.ticking ? this.nextTick : Infinity, e = Math.min(ts, tt);
      if (e > target) break;
      this.time = e;
      if (ts <= tt) { const a = this.sched.act; this.sched = null; this.apply(a === 'close' ? BE.close(this.g, false) : BE.next(this.g), null); }
      else { this.nextTick += 1000; this.apply(BE.tick(this.g), null); }
    }
    if (this.phase === 'auction') this.time = target;
  }

  onDisconnect(s) { const i = this.idx(s); if (this.players[1]) this.send(1 - i, { t: 'peer', i, connected: false }); }
  rejoin(s) {
    const i = this.idx(s);
    if (this.phase === 'lobby') return s.conn.send(this.info());
    s.conn.send({ t: 'start', cat: this.cat, names: this.names(), avs: this.avs(), you: i, resume: true });
    s.conn.send({ t: 'state', s: snap(this.g), ev: this.g.cur ? [{ t: 'lot' }] : [] });
    if (this.phase === 'order') s.conn.send({ t: 'order', ms: Math.max(0, this.ordAt - this.time), done: this.ord.map(Boolean) });
    if (this.phase === 'fight' && this.fight) s.conn.send(this.fight);
    this.send(1 - i, { t: 'peer', i, connected: true });
  }
  again(s) {
    const i = this.idx(s);
    if (i < 0 || this.phase !== 'fight' || !this.players[1]) return;
    this.wantAgain[i] = true;
    if (this.wantAgain[0] && this.wantAgain[1]) this.startGame(); else this.send(1 - i, { t: 'again' });
  }
  leave(s) {
    const i = this.idx(s); if (i < 0) return;
    const other = this.players[1 - i];
    const p = other && (this.phase === 'auction' || this.phase === 'order') ? this.score(1 - i, 'leave') : null; // abandonar a mitad = derrota
    if (other) { other.room = null; other.idx = -1; }
    s.room = null; s.idx = -1; this.hub.rooms.delete(this.code);
    if (other) Promise.resolve(p).then(pts => { if (!other.room) this.send(1 - i, { t: 'peerleft', pts, you: 1 - i }); });
  }
  abandon() { // alguien no ha vuelto a tiempo: si solo falta uno, pierde él
    const off = [0, 1].filter(i => !this.players[i] || !this.players[i].conn);
    const p = off.length === 1 ? this.score(1 - off[0], 'timeout') : null;
    Promise.resolve(p).then(pts => [0, 1].forEach(i => { const s = this.players[i]; if (s && !s.room) this.send(i, { t: 'peerleft', timeout: true, pts, you: i }); }));
    this.players.forEach(s => { if (s) { s.room = null; s.idx = -1; } });
    this.hub.rooms.delete(this.code);
  }
}

class Hub {
  // users = base de datos de cuentas (server/db.js). Con ella, para crear o entrar en una sala hay que haber iniciado sesión.
  constructor({ pools, divs, futDivs, rng, speed = 1, maxRooms = 300, abandonMs = 90000, orderMs = 25000, users = null }) {
    Object.assign(this, { pools, divs, futDivs, rng, speed, maxRooms, abandonMs, orderMs, users, rooms: new Map(), sessions: new Map(), queue: new Map(), real: 0, sweep: 0 }); // queue: categoría → jugadores buscando partida
    this.avNames = new Set(((pools && pools.anime) || []).map(c => c.n)); // solo se aceptan avatares de esta lista
  }
  cleanAv(v) { return typeof v === 'string' && this.avNames.has(v) ? v : null; }
  // BUSCAR PARTIDA: cola por categoría. El primero que espera (conectado, sin sala y de otra cuenta) se empareja con el que llega.
  seek(s, cat) {
    const conn = s.conn;
    if (s.room) return conn.send({ t: 'err', code: 'inRoom' });
    if (this.users && !s.uid) return conn.send({ t: 'err', code: 'needLogin' });
    if (!CATS.includes(cat)) return conn.send({ t: 'err', code: 'badCat' });
    this.unseek(s);
    const q = this.queue.get(cat) || [];
    const i = q.findIndex(o => o !== s && o.conn && !o.room && !(s.uid && o.uid === s.uid));
    if (i >= 0) {
      if (this.rooms.size >= this.maxRooms) return conn.send({ t: 'err', code: 'busy' });
      const code = this.newCode(); if (!code) return conn.send({ t: 'err', code: 'busy' });
      const o = q.splice(i, 1)[0]; o.seek = null;
      const r = new Room(this, code, cat); r.quick = true;
      r.players[0] = o; r.players[1] = s; o.room = r; o.idx = 0; s.room = r; s.idx = 1; this.rooms.set(code, r);
      r.startGame(); return;
    }
    q.push(s); this.queue.set(cat, q); s.seek = cat;
    conn.send({ t: 'seeking', cat, n: q.length });
  }
  unseek(s) { if (!s || !s.seek) return; const q = this.queue.get(s.seek); if (q) { const i = q.indexOf(s); if (i >= 0) q.splice(i, 1); } s.seek = null; }
  newCode() {
    for (let k = 0; k < 50; k++) {
      let c = ''; for (let i = 0; i < 5; i++) c += CODE_ALPHA[crypto.randomInt(CODE_ALPHA.length)];
      if (!this.rooms.has(c)) return c;
    }
    return null;
  }
  async hello(conn, msg) {
    // cuenta con la sesión iniciada (o null). Se consulta antes que nada: la base de datos puede tardar y mientras tanto la conexión puede cerrarse
    const acc = this.users && typeof msg.auth === 'string' ? await this.users.byToken(msg.auth).catch(e => { console.error('sesión:', e.message); return null; }) : null;
    if (conn.open === false) return;
    let s = typeof msg.token === 'string' && /^[0-9a-f]{32}$/.test(msg.token) ? this.sessions.get(msg.token) : null;
    if (!s) {
      if (this.sessions.size >= 5000) return conn.send({ t: 'err', code: 'busy' });
      const name = cleanName(msg.name) || 'Invitado' + (100 + crypto.randomInt(900));
      s = { token: crypto.randomBytes(16).toString('hex'), name, av: this.cleanAv(msg.av), uid: null, room: null, idx: -1, conn: null, last: this.real };
      this.sessions.set(s.token, s);
    } else if (!s.room) {
      if (msg.name != null) { const n = cleanName(msg.name); if (n) s.name = n; }
      if (msg.av !== undefined) s.av = this.cleanAv(msg.av);
    }
    if (!s.room) { // fuera de una partida, la cuenta manda: su nombre y su foto salen de la base de datos
      s.uid = acc ? acc.id : null;
      if (acc) { s.name = acc.name; s.av = this.cleanAv(acc.av); }
    }
    if (s.conn && s.conn !== conn) { const old = s.conn; s.conn = null; old.send({ t: 'kicked' }); old.close(1000, 'other tab'); } // una sola pestaña por sesión
    s.conn = conn; conn.sess = s; s.last = this.real;
    conn.send({ t: 'welcome', token: s.token, name: s.name, user: s.uid ? s.name : null });
    if (s.room) s.room.rejoin(s);
  }
  // Los mensajes de cada conexión se atienden en orden: el 'hello' (que consulta la base de datos) termina antes de mirar el siguiente
  handle(conn, msg) {
    conn.q = (conn.q || Promise.resolve()).then(() => this.handleNow(conn, msg)).catch(e => { console.error('error en mensaje:', e); conn.send({ t: 'err', code: 'server' }); });
    return conn.q;
  }
  handleNow(conn, msg) {
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;
    if (msg.t === 'hello') return this.hello(conn, msg);
    const s = conn.sess; if (!s) return conn.send({ t: 'err', code: 'noHello' });
    s.last = this.real;
    switch (msg.t) {
      case 'seek': return this.seek(s, msg.cat);
      case 'unseek': this.unseek(s); return conn.send({ t: 'unseeked' });
      case 'create': {
        this.unseek(s);
        if (s.room) return conn.send({ t: 'err', code: 'inRoom' });
        if (this.users && !s.uid) return conn.send({ t: 'err', code: 'needLogin' });
        if (!CATS.includes(msg.cat)) return conn.send({ t: 'err', code: 'badCat' });
        if (this.rooms.size >= this.maxRooms) return conn.send({ t: 'err', code: 'busy' });
        const code = this.newCode(); if (!code) return conn.send({ t: 'err', code: 'busy' });
        const r = new Room(this, code, msg.cat); r.players[0] = s; s.room = r; s.idx = 0; this.rooms.set(code, r);
        return conn.send(r.info());
      }
      case 'join': {
        this.unseek(s);
        const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : '';
        if (s.room) return conn.send({ t: 'err', code: 'inRoom' });
        if (this.users && !s.uid) return conn.send({ t: 'err', code: 'needLogin' });
        if (!CODE_RE.test(code)) return conn.send({ t: 'err', code: 'noRoom' });
        const r = this.rooms.get(code);
        if (!r) return conn.send({ t: 'err', code: 'noRoom' });
        if (r.players[1]) return conn.send({ t: 'err', code: 'full' });
        if (s.uid && r.players[0] && r.players[0].uid === s.uid) return conn.send({ t: 'err', code: 'self' }); // la misma cuenta en dos pestañas
        r.players[1] = s; s.room = r; s.idx = 1; r.startGame(); return;
      }
      case 'bid': if (s.room) s.room.bid(s, msg.amount); return;
      case 'skip': if (s.room) s.room.skip(s); return;
      case 'order': if (s.room) s.room.setOrder(s, msg.order); return;
      case 'rematch': if (s.room) s.room.again(s); return;
      case 'leave': this.unseek(s); if (s.room) s.room.leave(s); return;
    }
  }
  disconnect(conn) {
    const s = conn.sess; if (!s || s.conn !== conn) return;
    s.conn = null; s.last = this.real; this.unseek(s); // al volver, el cliente pide otra vez buscar partida
    if (s.room) s.room.onDisconnect(s);
  }
  // dt = milisegundos reales; el tiempo de juego avanza dt*speed (speed>1 solo en pruebas)
  step(dt) {
    this.real += dt;
    for (const r of this.rooms.values()) r.advance(dt * this.speed);
    this.sweep += dt;
    if (this.sweep >= 60000) { this.sweep = 0; this.cleanup(); }
  }
  cleanup() {
    for (const [c, r] of this.rooms) if (r.idleMs > 600000) { r.players.forEach(s => { if (s) { s.room = null; s.idx = -1; } }); this.rooms.delete(c); }
    for (const [t, s] of this.sessions) if (!s.conn && !s.room && this.real - s.last > 1800000) { this.unseek(s); this.sessions.delete(t); }
  }
}
module.exports = { Hub, Room, cleanName, snap, CODE_RE };