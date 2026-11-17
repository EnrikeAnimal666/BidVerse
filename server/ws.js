'use strict';
/* WebSocket mínimo (RFC 6455) sin dependencias: solo lo que BidVerse necesita.
   Texto UTF-8, ping/pong, cierre. Rechaza: tramas sin máscara del cliente, binarias, fragmentadas y de más de maxPayload bytes. */
const crypto = require('crypto');
const { EventEmitter } = require('events');
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const utf8 = new TextDecoder('utf-8', { fatal: true });

class Conn extends EventEmitter {
  constructor(socket, { maxPayload = 4096, pingMs = 20000, deadMs = 60000 } = {}) {
    super();
    this.socket = socket; this.maxPayload = maxPayload; this.buf = Buffer.alloc(0); this.open = true; this.last = Date.now();
    socket.setNoDelay(true);
    socket.on('data', d => this._data(d));
    socket.on('close', () => this._closed());
    socket.on('error', () => this._closed());
    this._ping = setInterval(() => {
      if (Date.now() - this.last > deadMs) return this.terminate();
      this._frame(0x9, Buffer.alloc(0));
    }, pingMs);
  }
  _data(d) {
    this.last = Date.now();
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    if (this.buf.length > this.maxPayload * 4 + 64) return this.close(1009, 'too big');
    for (;;) {
      if (!this.open || this.buf.length < 2) return;
      const b0 = this.buf[0], b1 = this.buf[1], fin = !!(b0 & 0x80), op = b0 & 0x0f, masked = !!(b1 & 0x80);
      if (b0 & 0x70) return this.close(1002, 'rsv');                 // sin extensiones
      if (!masked) return this.close(1002, 'unmasked');               // un cliente siempre enmascara
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; const hi = this.buf.readUInt32BE(2); if (hi) return this.close(1009, 'too big'); len = this.buf.readUInt32BE(6); off = 10; }
      if (op >= 0x8 && (len > 125 || !fin)) return this.close(1002, 'control');
      if (len > this.maxPayload) return this.close(1009, 'too big');
      if (this.buf.length < off + 4 + len) return;
      const mask = this.buf.subarray(off, off + 4), data = Buffer.from(this.buf.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < len; i++) data[i] ^= mask[i & 3];
      this.buf = this.buf.subarray(off + 4 + len);
      if (op === 0x1) {
        if (!fin) return this.close(1003, 'fragmented');
        let s; try { s = utf8.decode(data); } catch (e) { return this.close(1007, 'utf8'); }
        this.emit('message', s);
      } else if (op === 0x8) { return this.close(1000, ''); }
      else if (op === 0x9) this._frame(0xA, data);
      else if (op === 0xA) { /* pong: ya cuenta como actividad */ }
      else return this.close(1003, 'unsupported');                  // binario, continuación…
    }
  }
  _frame(op, payload) {
    if (!this.open && op !== 0x8) return;
    const n = payload.length; let h;
    if (n < 126) h = Buffer.from([0x80 | op, n]);
    else if (n < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(n, 2); }
    else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeUInt32BE(n, 6); }
    try { this.socket.write(Buffer.concat([h, payload])); } catch (e) { /* socket ya cerrado */ }
  }
  send(obj) { if (this.open) this._frame(0x1, Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj))); }
  close(code = 1000, reason = '') {
    if (!this.open) return;
    const r = Buffer.from(String(reason).slice(0, 100)), p = Buffer.alloc(2 + r.length); p.writeUInt16BE(code, 0); r.copy(p, 2);
    this._frame(0x8, p); this.open = false;
    try { this.socket.end(); } catch (e) { /* nada */ }
    setTimeout(() => this.terminate(), 2000).unref();
    this._closed();
  }
  terminate() { this.open = false; try { this.socket.destroy(); } catch (e) { /* nada */ } this._closed(); }
  _closed() { if (this._done) return; this._done = true; this.open = false; clearInterval(this._ping); this.emit('close'); }
}

// Valida y completa el "upgrade" HTTP. Devuelve Conn o null (y responde el error).
function accept(req, socket, { path = '/ws', allowOrigin = () => true, ...opts } = {}) {
  const fail = (code, msg) => { try { socket.end(`HTTP/1.1 ${code} ${msg}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); } catch (e) { /* nada */ } return null; };
  if (req.method !== 'GET' || (req.url || '').split('?')[0] !== path) return fail(404, 'Not Found');
  if (!/^websocket$/i.test(req.headers.upgrade || '') || !/upgrade/i.test(req.headers.connection || '')) return fail(400, 'Bad Request');
  if (req.headers['sec-websocket-version'] !== '13') return fail(426, 'Upgrade Required');
  const key = req.headers['sec-websocket-key'];
  if (typeof key !== 'string' || Buffer.from(key, 'base64').length !== 16) return fail(400, 'Bad Request');
  if (req.headers.origin && !allowOrigin(req.headers.origin, req.headers.host)) return fail(403, 'Forbidden');
  const sum = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${sum}\r\n\r\n`);
  return new Conn(socket, opts);
}
module.exports = { accept, Conn };
