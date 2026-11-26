// Pantallas del móvil y animaciones de BidVerse (subasta, ¡Vendido!, ¡Combate!, pelea) dibujadas en canvas 2D.
// Todo depende solo del tiempo global t, así la misma "partida" se ve igual en el móvil 3D y a pantalla completa.
import { K, E, clamp, prog, lerp, rng, TAU, pulse, noise } from './util.js';

export const W = 1080, H = 1920;          // contenido a pantalla completa
export const PW = 1080, PH = 2334;        // textura de la pantalla del móvil
const C = { bg: '#0a0a0b', card: '#141416', ink: '#f3e6c8', mut: '#9a9aa3', acc: '#e63946', p1: '#ff3344', p2: '#3d8bff', gold: '#f5c542', green: '#35d04f', teal: '#3ed3b5' };
const PCOL = [C.p1, C.p2];
const F = (w, s, fam = 'Nunito') => `${w} ${s}px "${fam}"`;
const DISP = 'Big Shoulders Display';

// guion de la partida
export const T = {
  wake: 4.75, dial: 5.15, answer: 7.35, hang: 10.0,
  browser: 10.05, typeA: 10.35, typeB: 10.95, go: 11.15, menu: 11.6, tapAnime: 12.3, room: 12.55, joined: 13.2, start: 13.85,
  auction: 14.0, sold: 18.5, wipe: 20.0, fight: 20.75, slash: 21.7, cutin: 22.55, beam: 23.35, ko: 24.25, win: 25.15,
};
export const BIDS = [[14.5, 0, 3], [15.0, 1, 6], [15.5, 0, 9], [16.25, 1, 12], [17.0, 0, 15]];

function rr(x, X, Y, w, h, r) { x.beginPath(); x.roundRect(X, Y, w, h, r); }
function cover(x, img, X, Y, w, h, ox = 0.5, oy = 0.25, zoom = 1) {
  if (!img || !img.width) return;
  const s = Math.max(w / img.width, h / img.height) * zoom;
  const iw = img.width * s, ih = img.height * s;
  x.save(); x.beginPath(); x.rect(X, Y, w, h); x.clip();
  x.drawImage(img, X + (w - iw) * ox, Y + (h - ih) * oy, iw, ih);
  x.restore();
}
function text(x, s, X, Y, font, col, align = 'left', ls = 0, base = 'alphabetic') {
  x.font = font; x.fillStyle = col; x.textAlign = align; x.textBaseline = base; x.letterSpacing = ls + 'px';
  x.fillText(s, X, Y); x.letterSpacing = '0px';
}
function gavel(x, X, Y, s, rot, col = '#f3e6c8', col2 = '#e63946') {
  x.save(); x.translate(X, Y); x.rotate(rot); x.scale(s, s);
  x.fillStyle = col; rr(x, -6, -2, 12, 120, 6); x.fill();             // mango
  x.save(); x.translate(0, -20); x.rotate(Math.PI / 2);
  x.fillStyle = col; rr(x, -26, -70, 52, 140, 12); x.fill();          // cabeza
  x.fillStyle = col2; x.fillRect(-26, -46, 52, 10); x.fillRect(-26, 36, 52, 10);
  x.restore(); x.restore();
}
function confetti(x, t, t0, seed, ox, oy, n = 90, spread = 1, cols = ['#ff3344', '#f5c542', '#3d8bff', '#3ed3b5', '#ffffff', '#a678ff']) {
  const d = t - t0; if (d < 0 || d > 3.2) return;
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.4 * spread, v = 900 + r() * 1500, w = 14 + r() * 16, h = 8 + r() * 10, sp = (r() - 0.5) * 20, c = cols[i % cols.length];
    const dr = 1.6 + r();
    const px = ox + Math.cos(a) * v * (1 - Math.exp(-d * dr)) / dr + Math.sin(d * 3 + i) * 40 * d;
    const py = oy + Math.sin(a) * v * (1 - Math.exp(-d * dr)) / dr + 900 * d * d * 0.5;
    x.save(); x.globalAlpha = clamp(3.2 - d); x.translate(px, py); x.rotate(sp * d); x.scale(1, Math.cos(d * (6 + i % 5)));
    x.fillStyle = c; x.fillRect(-w / 2, -h / 2, w, h); x.restore();
  }
}
function glow(x, X, Y, r, col, a = 1) {
  const g = x.createRadialGradient(X, Y, 0, X, Y, r);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.save(); x.globalAlpha = a; x.globalCompositeOperation = 'lighter'; x.fillStyle = g; x.fillRect(X - r, Y - r, r * 2, r * 2); x.restore();
}
function tap(x, X, Y, t, t0) { // indicador de toque
  const d = t - t0; if (d < -0.12 || d > 0.5) return;
  if (d < 0) { x.save(); x.globalAlpha = 0.5 * (1 + d / 0.12); x.fillStyle = '#fff'; x.beginPath(); x.arc(X, Y, 44, 0, TAU); x.fill(); x.restore(); return; }
  x.save();
  x.globalAlpha = 0.55 * (1 - d / 0.5); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(X, Y, 44 + d * 40, 0, TAU); x.fill();
  x.globalAlpha = 0.8 * (1 - d / 0.5); x.strokeStyle = '#fff'; x.lineWidth = 6; x.beginPath(); x.arc(X, Y, 50 + d * 260, 0, TAU); x.stroke();
  x.restore();
}

export function createUI(img, opt = {}) {
  const SITE = opt.site || 'bidverse-cdiy.onrender.com';
  const [phC, phX] = mk(PW, PH);
  const [phC2, phX2] = mk(PW, PH);
  const [conC, conX] = mk(W, H);
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

  // fondo de juego: oscuro con resplandores rojo/azul, rejilla de puntos y martillos tenues
  function gameBg(x, t, w, h, k = 1) {
    x.fillStyle = C.bg; x.fillRect(0, 0, w, h);
    glow(x, -80, h * 0.92, 900, 'rgba(255,51,68,.28)', k);
    glow(x, w + 80, h * 0.95, 900, 'rgba(61,139,255,.26)', k);
    glow(x, w * 0.5, -200, 700, 'rgba(122,60,240,.22)', k);
    x.fillStyle = 'rgba(255,255,255,.05)';
    for (let yy = 30; yy < h; yy += 44) for (let xx = 22; xx < w; xx += 44) x.fillRect(xx, yy, 3, 3);
    x.save(); x.globalAlpha = 0.07;
    [[120, h * 0.2, -0.6], [w - 120, h * 0.35, 0.7], [160, h * 0.78, 0.5], [w - 150, h * 0.86, -0.5]].forEach(([gx, gy, gr], i) => gavel(x, gx, gy + Math.sin(t * 0.8 + i) * 12, 1.3, gr + Math.sin(t * 0.6 + i) * 0.05));
    x.restore();
  }
  function logo(x, X, Y, h, align = 'left') {
    const im = img.logo; if (!im) return;
    const w = (im.width / im.height) * h;
    x.drawImage(im, align === 'center' ? X - w / 2 : X, Y, w, h);
  }
  function statusBar(x, t, dark = true, time = '5:43') {
    const col = dark ? '#fff' : '#111';
    text(x, time, 110, 100, F(800, 44), col, 'left');
    // notch / isla
    x.fillStyle = '#000'; rr(x, PW / 2 - 140, 34, 280, 82, 41); x.fill();
    x.fillStyle = col;
    for (let i = 0; i < 4; i++) { rr(x, 790 + i * 20, 92 - (i + 1) * 11, 13, (i + 1) * 11, 3); x.fill(); }
    x.strokeStyle = col; x.lineWidth = 3.5; rr(x, 890, 66, 76, 38, 11); x.stroke(); rr(x, 896, 72, 50, 26, 6); x.fill();
    x.fillRect(968, 78, 6, 14);
  }
  function homeBar(x, dark = true) { x.fillStyle = dark ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.8)'; rr(x, PW / 2 - 170, PH - 46, 340, 13, 7); x.fill(); }
  function roundMask(x) { // esquinas redondeadas de la pantalla
    x.save(); x.globalCompositeOperation = 'destination-in'; x.fillStyle = '#000'; rr(x, 0, 0, PW, PH, 150); x.fill(); x.restore();
  }

  // ---------- avatares de los muñecos ----------
  function avatar(x, X, Y, r, who, ring = '#fff') {
    x.save(); x.beginPath(); x.arc(X, Y, r, 0, TAU); x.clip();
    const g = x.createLinearGradient(X, Y - r, X, Y + r);
    g.addColorStop(0, who === 'dani' ? '#9cc4ff' : '#ffb08a'); g.addColorStop(1, who === 'dani' ? '#2f5fd6' : '#d8452f');
    x.fillStyle = g; x.fillRect(X - r, Y - r, r * 2, r * 2);
    // cuerpo (sudadera del color de su jugador: Leo rojo, Dani azul)
    x.fillStyle = who === 'dani' ? '#3d7bf0' : '#ef4b3f'; x.beginPath(); x.ellipse(X, Y + r * 1.05, r * 0.75, r * 0.6, 0, 0, TAU); x.fill();
    // cara
    x.fillStyle = who === 'dani' ? '#c98d64' : '#f1c19c'; x.beginPath(); x.arc(X, Y + r * 0.05, r * 0.52, 0, TAU); x.fill();
    x.fillStyle = who === 'dani' ? '#c4501e' : '#3a2416';
    if (who === 'dani') { for (let i = 0; i < 11; i++) { const a = Math.PI + (i / 10) * Math.PI; x.beginPath(); x.arc(X + Math.cos(a) * r * 0.5, Y + Math.sin(a) * r * 0.46 - r * 0.06, r * 0.19, 0, TAU); x.fill(); } }
    else { x.beginPath(); x.arc(X, Y - r * 0.08, r * 0.54, Math.PI * 1.05, Math.PI * 1.95); x.fill(); x.beginPath(); x.moveTo(X - r * 0.5, Y - r * 0.12); x.lineTo(X + r * 0.1, Y - r * 0.45); x.lineTo(X + r * 0.52, Y - r * 0.1); x.lineTo(X + r * 0.3, Y - r * 0.52); x.lineTo(X - r * 0.4, Y - r * 0.5); x.fill(); }
    x.fillStyle = '#fff'; [-1, 1].forEach(s => { x.beginPath(); x.ellipse(X + s * r * 0.19, Y + r * 0.06, r * 0.12, r * 0.14, 0, 0, TAU); x.fill(); });
    x.fillStyle = '#1a0f0a'; [-1, 1].forEach(s => { x.beginPath(); x.arc(X + s * r * 0.19, Y + r * 0.08, r * 0.075, 0, TAU); x.fill(); });
    x.strokeStyle = '#4a1a16'; x.lineWidth = r * 0.05; x.beginPath(); x.arc(X, Y + r * 0.22, r * 0.14, 0.2, Math.PI - 0.2); x.stroke();
    x.restore();
    x.strokeStyle = ring; x.lineWidth = r * 0.07; x.beginPath(); x.arc(X, Y, r, 0, TAU); x.stroke();
  }

  // ---------- pantallas de llamada / bloqueo ----------
  function lockScreen(x, t) {
    const g = x.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, '#2b1d6b'); g.addColorStop(0.6, '#7a3cf0'); g.addColorStop(1, '#2f8cff');
    x.fillStyle = g; x.fillRect(0, 0, PW, PH);
    glow(x, 300, 900, 700, 'rgba(255,120,200,.35)'); glow(x, 800, 1600, 700, 'rgba(80,200,255,.3)');
    statusBar(x, t);
    text(x, 'Sunday, November 24', PW / 2, 420, F(700, 52), 'rgba(255,255,255,.85)', 'center');
    text(x, '5:42', PW / 2, 700, F(900, 300, DISP), '#fff', 'center');
    homeBar(x);
  }
  function callScreen(x, t, who) {
    const other = who === 'leo' ? 'dani' : 'leo';
    const g = x.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, '#16112b'); g.addColorStop(1, '#0b0b12');
    x.fillStyle = g; x.fillRect(0, 0, PW, PH);
    glow(x, PW / 2, 760, 620, other === 'dani' ? 'rgba(61,139,255,.35)' : 'rgba(255,170,60,.3)');
    statusBar(x, t);
    const incoming = who === 'dani' && t < T.answer;
    const connected = t >= T.answer;
    const pul = incoming ? 1 + Math.sin(t * 14) * 0.03 : 1;
    if (incoming) for (let i = 0; i < 3; i++) { const k = ((t * 1.3 + i / 3) % 1); x.strokeStyle = `rgba(255,255,255,${0.35 * (1 - k)})`; x.lineWidth = 6; x.beginPath(); x.arc(PW / 2, 760, 230 + k * 200, 0, TAU); x.stroke(); }
    avatar(x, PW / 2, 760, 220 * pul, other);
    text(x, other === 'dani' ? 'Dani 🎮' : 'Leo 🛋️', PW / 2, 1120, F(900, 96), '#fff', 'center');
    const sub = incoming ? 'Incoming call…' : connected ? `00:${String(Math.floor(t - T.answer)).padStart(2, '0')}` : 'Calling' + '...'.slice(0, 1 + Math.floor(t * 3) % 3);
    text(x, sub, PW / 2, 1200, F(700, 52), 'rgba(255,255,255,.7)', 'center');
    if (incoming) {
      [[-1, '#ff3b30', '✕'], [1, '#34c759', '✆']].forEach(([s, c, ic]) => {
        const bx = PW / 2 + s * 250, by = 1900 + (s > 0 ? Math.sin(t * 10) * 12 : 0);
        x.fillStyle = c; x.beginPath(); x.arc(bx, by, 110, 0, TAU); x.fill();
        text(x, ic, bx, by + 30, F(900, 90), '#fff', 'center');
      });
      text(x, 'Decline', PW / 2 - 250, 2080, F(700, 40), '#ddd', 'center'); text(x, 'Accept', PW / 2 + 250, 2080, F(700, 40), '#ddd', 'center');
    } else {
      const ic = ['🔇', '⌨', '🔊', '➕', '📹', '👤'];
      ic.forEach((s, i) => { const bx = PW / 2 + ((i % 3) - 1) * 270, by = 1450 + Math.floor(i / 3) * 260; x.fillStyle = 'rgba(255,255,255,.14)'; x.beginPath(); x.arc(bx, by, 95, 0, TAU); x.fill(); text(x, s, bx, by + 26, F(700, 70), '#fff', 'center'); });
      x.fillStyle = '#ff3b30'; x.beginPath(); x.arc(PW / 2, 2010, 110, 0, TAU); x.fill(); text(x, '✆', PW / 2, 2045, F(900, 90), '#fff', 'center');
    }
    homeBar(x);
  }
  function feedScreen(x, t) { // Dani haciendo scroll aburrido
    x.fillStyle = '#f2f2f5'; x.fillRect(0, 0, PW, PH);
    const off = (t * 260) % 700;
    for (let i = -1; i < 5; i++) {
      const y = 260 + i * 700 - off;
      x.fillStyle = '#fff'; rr(x, 40, y, PW - 80, 640, 30); x.fill();
      x.fillStyle = '#d9d9e0'; x.beginPath(); x.arc(110, y + 70, 40, 0, TAU); x.fill();
      x.fillStyle = '#c9c9d2'; rr(x, 170, y + 45, 300, 24, 12); x.fill(); rr(x, 170, y + 82, 180, 20, 10); x.fill();
      x.fillStyle = ['#cfd3e8', '#e8d3cf', '#d3e8cf'][(i + 9) % 3]; rr(x, 70, y + 140, PW - 140, 400, 20); x.fill();
      x.fillStyle = '#d0d0d8'; rr(x, 70, y + 570, 420, 22, 11); x.fill();
    }
    x.fillStyle = '#f2f2f5'; x.fillRect(0, 0, PW, 160);
    statusBar(x, t, false); homeBar(x, false);
  }

  // ---------- navegador + web de BidVerse ----------
  const URL_TXT = 'bidverse';
  function browserChrome(x, t, url, loading) {
    x.fillStyle = '#1c1b22'; x.fillRect(0, 0, PW, 330);
    statusBar(x, t);
    x.fillStyle = '#2d2c35'; rr(x, 40, 175, PW - 80, 110, 55); x.fill();
    text(x, '🔒', 100, 248, F(700, 40), '#aaa', 'left');
    text(x, url, 160, 250, F(700, 50), '#fff', 'left');
    if (loading > 0 && loading < 1) { x.fillStyle = '#7a3cf0'; x.fillRect(0, 322, PW * E.outC(loading), 8); }
  }
  function keyboard(x, t, y, hl) {
    x.fillStyle = '#25242b'; x.fillRect(0, y, PW, PH - y);
    const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    rows.forEach((row, ri) => {
      const kw = 96, gap = 10, total = row.length * kw + (row.length - 1) * gap, x0 = (PW - total) / 2;
      [...row].forEach((ch, i) => {
        const kx = x0 + i * (kw + gap), ky = y + 40 + ri * 150, on = hl === ch;
        x.fillStyle = on ? '#7a3cf0' : '#3b3a44'; rr(x, kx, ky, kw, 124, 16); x.fill();
        text(x, ch, kx + kw / 2, ky + 82, F(700, 54), '#fff', 'center');
        if (on) { x.fillStyle = '#7a3cf0'; rr(x, kx - 14, ky - 150, kw + 28, 150, 20); x.fill(); text(x, ch, kx + kw / 2, ky - 50, F(800, 80), '#fff', 'center'); }
      });
    });
    x.fillStyle = '#3b3a44'; rr(x, 230, y + 500, 620, 124, 16); x.fill();
    x.fillStyle = hl === '⏎' ? '#9b6bff' : '#7a3cf0'; rr(x, 870, y + 500, 170, 124, 16); x.fill(); text(x, 'Go', 955, y + 582, F(800, 52), '#fff', 'center');
  }
  function browserTyping(x, t) {
    x.fillStyle = '#121117'; x.fillRect(0, 0, PW, PH);
    const n = clamp(Math.floor((t - T.typeA) / ((T.typeB - T.typeA) / URL_TXT.length)) + 1, 0, URL_TXT.length);
    const typed = t < T.typeA ? '' : URL_TXT.slice(0, n);
    const hl = t >= T.typeA && t < T.typeB ? URL_TXT[n - 1] : t >= T.go - 0.12 && t < T.go + 0.05 ? '⏎' : '';
    browserChrome(x, t, typed + (Math.floor(t * 4) % 2 ? '|' : ''), 0);
    if (!typed) text(x, 'Search or type URL', 160, 250, F(600, 50), '#777', 'left');
    if (typed.length >= 3) {
      x.fillStyle = '#1c1b22'; rr(x, 40, 310, PW - 80, 230, 30); x.fill();
      x.drawImage(img.icon, 80, 352, 80, 80);
      text(x, 'BidVerse', 190, 390, F(900, 54), '#fff');
      text(x, 'Live auction · Anime · UFC · Football', 190, 450, F(600, 36), '#aaa');
      text(x, SITE, 190, 500, F(700, 34), '#9b6bff');
    }
    keyboard(x, t, 1500, hl);
    homeBar(x);
  }
  function marquee(x, t, y, h = 66) {
    const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#e63946'); g.addColorStop(1, '#7a3cf0');
    x.fillStyle = g; x.fillRect(0, y, W, h);
    const s = 'BIDVERSE ✦ LIVE AUCTION ✦ ANIME ✦ UFC ✦ FOOTBALL ✦ POWER SCALE ✦ ';
    x.save(); x.beginPath(); x.rect(0, y, W, h); x.clip();
    x.font = F(800, 30); x.letterSpacing = '6px';
    const sw = x.measureText(s).width, off = (t * 160) % sw;
    for (let k = -1; k < 3; k++) { x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText(s, k * sw - off, y + h / 2 + 2); }
    x.letterSpacing = '0px'; x.restore();
  }
  function modeCard(x, t, X, Y, w, h, im, title, line, desc, chip, pressed, ox = 0.5, oy = 0.3) {
    x.save();
    const sc = 1 - pressed * 0.04; x.translate(X + w / 2, Y + h / 2); x.scale(sc, sc); x.translate(-(X + w / 2), -(Y + h / 2));
    rr(x, X, Y, w, h, 46); x.save(); x.clip();
    x.filter = 'grayscale(1) contrast(1.1) brightness(.75)'; cover(x, im, X, Y, w, h, ox, oy); x.filter = 'none';
    const g = x.createLinearGradient(0, Y, 0, Y + h); g.addColorStop(0, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,.85)');
    x.fillStyle = g; x.fillRect(X, Y, w, h);
    x.restore();
    text(x, title, X + 52, Y + h - 250, F(900, 150, DISP), '#fff', 'left', 1);
    x.fillStyle = line; rr(x, X + 52, Y + h - 222, 120, 12, 6); x.fill();
    text(x, desc, X + 52, Y + h - 150, F(600, 36), 'rgba(255,255,255,.88)', 'left');
    x.fillStyle = 'rgba(255,255,255,.14)'; rr(x, X + 52, Y + h - 104, 220, 64, 32); x.fill();
    text(x, chip, X + 162, Y + h - 61, F(700, 30), '#fff', 'center');
    x.fillStyle = '#fff'; rr(x, X + w - 360, Y + h - 112, 310, 82, 41); x.fill();
    text(x, 'Create room →', X + w - 205, Y + h - 58, F(900, 38), '#111', 'center');
    x.restore();
  }
  function menuPage(x, t, h) {
    x.fillStyle = '#0d0c10'; x.fillRect(0, 0, W, h);
    glow(x, W * 0.3, 260, 600, 'rgba(122,60,240,.35)');
    const k = prog(t, T.menu, T.menu + 0.5);
    const scroll = K(t, [[T.menu, 0], [T.menu + 0.45, 0], [T.tapAnime - 0.15, 330, 'ioC']]);
    x.save(); x.translate(0, -scroll);
    marquee(x, t, 0);
    x.save(); x.globalAlpha = k; const ls = lerp(0.85, 1, E.outBack(k));
    x.translate(W / 2, 300); x.scale(ls, ls); logo(x, 0, -110, 220, 'center'); x.restore();
    const by = 520, bl = [['Log in', '#f3e6c8', '#111'], ['Ranking', 'rgba(255,255,255,.08)', '#f3e6c8'], ['Power scale', 'rgba(255,255,255,.08)', '#f3e6c8']];
    let bx = 60;
    x.font = F(800, 38);
    bl.forEach(([s, bg, fg], i) => {
      const bw = x.measureText(s).width + 90;
      const kk = E.outBackS(prog(t, T.menu + 0.1 + i * 0.06, T.menu + 0.45 + i * 0.06));
      x.save(); x.globalAlpha = clamp(kk); x.translate(0, (1 - kk) * 40);
      x.fillStyle = bg; rr(x, bx, by, bw, 100, 50); x.fill(); x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 2; x.stroke();
      text(x, s, bx + bw / 2, by + 64, F(800, 38), fg, 'center'); x.restore();
      bx += bw + 24;
    });
    const pr = pulse(t, T.tapAnime - 0.05, T.tapAnime + 0.2, 0.05, 0.15);
    const cards = [[img.anime, 'ANIME', '#e8487a', '$20 · 3 characters each · Goku, Naruto, Luffy…', '169 characters', 0.5, 0.3],
      [img.ufc, 'UFC', '#e63946', '$40 · one fighter per weight class…', '117 fighters', 0.5, 0.4],
      [img.futbol, 'FOOTBALL', '#35d04f', 'Sign an XI of legends and stars · 4-3-3', '300 players', 0.5, 0.35]];
    cards.forEach((c, i) => {
      const kk = E.outC(prog(t, T.menu + 0.15 + i * 0.1, T.menu + 0.6 + i * 0.1));
      x.save(); x.globalAlpha = kk; x.translate(0, (1 - kk) * 120);
      modeCard(x, t, 60, 700 + i * 720, W - 120, 680, c[0], c[1], c[2], c[3], c[4], i === 0 ? pr : 0, c[5], c[6]);
      x.restore();
    });
    x.restore();
    tap(x, W - 60 - 205, 700 + 680 - 58 - scroll, t, T.tapAnime);
  }
  function roomPage(x, t, h) {
    menuPage(x, t, h);
    const k = E.outC(prog(t, T.room, T.room + 0.3));
    x.fillStyle = `rgba(0,0,0,${0.7 * k})`; x.fillRect(0, 0, W, h);
    x.save(); x.translate(0, (1 - k) * 300); x.globalAlpha = k;
    const bx = 70, by = 380, bw = W - 140, bh = 1100;
    x.fillStyle = '#16151b'; rr(x, bx, by, bw, bh, 50); x.fill(); x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = 3; x.stroke();
    text(x, 'Online match', bx + 70, by + 130, F(900, 64), '#f3e6c8');
    text(x, '✕', bx + bw - 90, by + 128, F(800, 56), '#888');
    const lines = ['Send this code or link to your', 'opponent. The game starts when they join.'];
    lines.forEach((l, i) => text(x, l, bx + 70, by + 230 + i * 56, F(600, 40), '#b9b6c3'));
    const code = 'K7Q2X';
    [...code].forEach((ch, i) => {
      const kk = E.outBack(prog(t, T.room + 0.2 + i * 0.07, T.room + 0.5 + i * 0.07));
      const cx = bx + 95 + i * 160, cy = by + 380;
      x.save(); x.translate(cx + 65, cy + 95); x.scale(1, kk); x.fillStyle = '#24222c'; rr(x, -65, -95, 130, 190, 24); x.fill();
      x.strokeStyle = '#7a3cf0'; x.lineWidth = 4; x.stroke();
      text(x, ch, 0, 52, F(900, 140, DISP), '#fff', 'center'); x.restore();
    });
    x.fillStyle = '#7a3cf0'; rr(x, bx + 70, by + 650, 400, 110, 55); x.fill(); text(x, 'Copy link', bx + 270, by + 718, F(900, 40), '#fff', 'center');
    x.strokeStyle = 'rgba(255,255,255,.25)'; rr(x, bx + 500, by + 650, 300, 110, 55); x.stroke(); text(x, 'Cancel', bx + 650, by + 718, F(800, 40), '#ddd', 'center');
    // esperando / unido
    const j = prog(t, T.joined, T.joined + 0.35);
    if (t < T.joined) {
      for (let i = 0; i < 3; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * (Math.floor(t * 6) % 3 === i)})`; x.beginPath(); x.arc(bx + 110 + i * 40, by + 900, 12, 0, TAU); x.fill(); }
      text(x, 'Waiting for your opponent…', bx + 200, by + 914, F(700, 42), '#b9b6c3');
    } else {
      const s = E.outBack(j);
      x.save(); x.translate(bx + 150, by + 900); x.scale(s, s); avatar(x, 0, 0, 80, 'dani', C.p2); x.restore();
      x.fillStyle = C.green; x.beginPath(); x.arc(bx + 205, by + 955, 30 * s, 0, TAU); x.fill(); text(x, '✓', bx + 205, by + 968, F(900, 40), '#fff', 'center');
      x.save(); x.globalAlpha = j; text(x, 'Dani joined!', bx + 270, by + 895, F(900, 52), '#fff'); text(x, 'The auction is starting…', bx + 270, by + 950, F(700, 38), C.teal); x.restore();
    }
    x.restore();
    confetti(x, t, T.joined, 5, W / 2, 1300, 50, 0.8);
    tap(x, 110 + 400 / 2 + 70 - 70 + 70, 380 + 650 + 55, t, 99);
  }

  // ---------- subasta ----------
  const ROST = { 0: ['Gojo', 'Itachi'], 1: ['Sukuna', 'Naruto'] };
  const MONEY = [19, 18];
  function bidState(t) {
    let b = null, prev = null;
    for (const x_ of BIDS) if (t >= x_[0]) { prev = b; b = x_; }
    return { b, prev };
  }
  function playerPanel(x, t, p, X, Y, w, h, extra) {
    const c = PCOL[p];
    x.fillStyle = 'rgba(20,20,24,.92)'; rr(x, X, Y, w, h, 14); x.fill();
    x.fillStyle = c; x.fillRect(X, Y, w, 7);
    const g = x.createLinearGradient(X, Y, X, Y + h); g.addColorStop(0, p ? 'rgba(61,139,255,.16)' : 'rgba(255,51,68,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(X, Y + 7, w, h - 7);
    const al = p ? 'right' : 'left', tx = p ? X + w - 30 : X + 30;
    text(x, `PLAYER ${p + 1}`, tx, Y + 56, F(800, 28), c, al, 6);
    text(x, p ? 'Dani' : 'Leo', tx, Y + 122, F(900, 58), '#fff', al);
    const m = MONEY[p] - (extra.spent || 0);
    const pop = extra.pop || 0;
    x.save(); x.translate(p ? X + 40 : X + w - 40, Y + 120); x.scale(1 + pop * 0.3, 1 + pop * 0.3);
    text(x, '$' + m, 0, 0, F(900, 66, DISP), pop > 0.05 ? C.gold : C.ink, p ? 'left' : 'right'); x.restore();
    const names = [...ROST[p], ...(extra.add ? [extra.add] : [])];
    for (let i = 0; i < 3; i++) {
      const sx = p ? X + w - 30 - (i + 1) * 104 + 14 : X + 30 + i * 104, sy = Y + 160;
      const n = names[i];
      if (n) { x.save(); rr(x, sx, sy, 90, 110, 10); x.clip(); cover(x, img[n], sx, sy, 90, 110, 0.5, 0.2); x.restore(); x.strokeStyle = c; x.lineWidth = 4; rr(x, sx, sy, 90, 110, 10); x.stroke(); }
      else { x.setLineDash([10, 8]); x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 3; rr(x, sx, sy, 90, 110, 10); x.stroke(); x.setLineDash([]); }
      if (n && n === extra.add) { const k = E.outBack(prog(t, T.sold + 0.5, T.sold + 0.9)); x.save(); x.globalAlpha = 1 - k; x.strokeStyle = '#fff'; x.lineWidth = 10; rr(x, sx - 10 * k, sy - 10 * k, 90 + 20 * k, 110 + 20 * k, 14); x.stroke(); x.restore(); }
    }
  }
  function auction(x, t, h) {
    gameBg(x, t, W, h);
    const { b, prev } = bidState(t);
    const sold = t >= T.sold;
    const lead = b ? b[1] : -1, price = b ? b[2] : 0, inc = b ? b[2] - (prev ? prev[2] : 0) : 0;
    const since = b ? t - b[0] : 9;
    const flash = b ? Math.exp(-since * 7) : 0;
    // cabecera
    logo(x, 50, 48, 118);
    x.fillStyle = 'rgba(255,255,255,.08)'; rr(x, W - 330, 70, 280, 74, 37); x.fill();
    text(x, 'ROOM K7Q2X', W - 190, 119, F(800, 30), C.ink, 'center', 4);
    // paneles de jugadores
    const soldK = prog(t, T.sold + 0.5, T.sold + 0.7);
    playerPanel(x, t, 0, 40, 200, 490, 300, { add: soldK > 0 ? 'Goku' : null, spent: soldK > 0 ? 15 : 0, pop: pulse(t, T.sold + 0.5, T.sold + 0.9, 0.05, 0.3) });
    playerPanel(x, t, 1, 550, 200, 490, 300, {});
    // tarjeta del lote
    const inK = E.outBack(prog(t, T.auction - 0.05, T.auction + 0.4));
    const cx = W / 2, cw = 800, ch = 1090, cy = 560;
    x.save(); x.translate(cx, cy + ch / 2); x.scale(inK, inK); x.rotate((1 - inK) * -0.15); x.translate(-cx, -(cy + ch / 2));
    const lc = lead < 0 ? '#55545c' : PCOL[lead];
    if (lead >= 0) glow(x, cx, cy + ch / 2, 700, lead ? 'rgba(61,139,255,.35)' : 'rgba(255,51,68,.35)', 0.6 + flash * 0.8);
    x.fillStyle = C.card; rr(x, cx - cw / 2, cy, cw, ch, 10); x.fill();
    x.lineWidth = 10 + flash * 10; x.strokeStyle = lc; rr(x, cx - cw / 2, cy, cw, ch, 10); x.stroke();
    text(x, 'DRAGON BALL', cx - cw / 2 + 40, cy + 70, F(800, 34), C.ink, 'left', 8);
    text(x, 'LOT 5 / 6', cx + cw / 2 - 40, cy + 70, F(800, 28), C.mut, 'right', 4);
    const iy = cy + 105, ih = 640;
    cover(x, img.Goku, cx - cw / 2 + 8, iy, cw - 16, ih, 0.5, 0.25, 1 + since * 0.004);
    if (flash > 0.01) { x.save(); x.globalAlpha = flash * 0.5; x.fillStyle = lc; x.fillRect(cx - cw / 2 + 8, iy, cw - 16, ih); x.restore(); }
    text(x, 'Goku', cx - cw / 2 + 50, iy + ih + 120, F(900, 112), C.ink);
    text(x, '★ 7430', cx + cw / 2 - 50, iy + ih + 110, F(900, 56, DISP), C.gold, 'right');
    text(x, 'LAST BID', cx - cw / 2 + 50, iy + ih + 200, F(700, 32), C.mut, 'left', 6);
    const bump = 1 + Math.exp(-since * 9) * 0.45 * (b ? 1 : 0);
    x.save(); x.translate(cx - cw / 2 + 50, iy + ih + 310); x.scale(bump, bump);
    text(x, b ? '$' + price : '—', 0, 0, F(900, 140, DISP), C.ink); x.restore();
    if (b) {
      const fl = prog(since, 0, 0.9);
      x.save(); x.globalAlpha = 1 - fl * 0.6; text(x, '+$' + inc, cx + cw / 2 - 50, iy + ih + 220 - fl * 40, F(900, 70), lc, 'right'); x.restore();
      x.fillStyle = lc; rr(x, cx + cw / 2 - 330, iy + ih + 245, 280, 76, 6); x.fill();
      text(x, lead ? 'DANI' : 'LEO', cx + cw / 2 - 190, iy + ih + 297, F(900, 38), '#fff', 'center', 6);
    }
    // vendido
    if (sold) {
      const k = prog(t, T.sold, T.sold + 0.35);
      x.save(); x.globalAlpha = 0.6 * clamp(k * 2); x.fillStyle = '#000'; rr(x, cx - cw / 2, cy, cw, ch, 10); x.fill(); x.restore();
      const s = lerp(3.2, 1, E.outBack(k));
      x.save(); x.translate(cx, iy + ih * 0.52); x.rotate(-0.14); x.scale(s, s); x.globalAlpha = clamp(k * 3);
      x.strokeStyle = C.p1; x.lineWidth = 14; rr(x, -330, -110, 660, 220, 26); x.stroke();
      x.lineWidth = 5; rr(x, -306, -88, 612, 176, 18); x.stroke();
      text(x, 'SOLD!', 0, 52, F(900, 170, DISP), C.p1, 'center', 4);
      x.restore();
      const gk = prog(t, T.sold - 0.35, T.sold);
      const ga = gk < 1 ? lerp(-1.3, 0.35, E.inC(gk)) : 0.35 - Math.sin(prog(t, T.sold, T.sold + 0.4) * Math.PI) * 0.35;
      const gA = 1 - prog(t, T.sold + 0.9, T.sold + 1.2);
      x.save(); x.globalAlpha = gA; gavel(x, cx + 300, iy + ih + 40, 2.3, ga); x.restore();
      if (k > 0 && k < 1) { x.save(); x.globalAlpha = 1 - k; x.strokeStyle = '#fff'; x.lineWidth = 16; x.beginPath(); x.arc(cx, iy + ih * 0.52, 200 + k * 500, 0, TAU); x.stroke(); x.restore(); }
    }
    x.restore();
    // temporizador
    let tm;
    if (!b) tm = 10 - (t - T.auction) * 2;
    else if (b[0] >= 17) tm = 10 - since * 6.8;
    else tm = 10 - since * 3;
    tm = sold ? 0 : clamp(tm, 0, 10);
    const ty = 1720, urgent = tm < 3.5 && !sold;
    const tc = urgent ? (Math.floor(t * 6) % 2 ? C.p1 : C.ink) : C.ink;
    x.save(); x.translate(110, ty); const tb = urgent ? 1 + 0.15 * (1 - (tm % 1)) : 1; x.scale(tb, tb);
    text(x, '0:' + String(Math.ceil(tm)).padStart(2, '0'), 0, 30, F(900, 92, DISP), tc, 'center'); x.restore();
    x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(200, ty - 14, W - 260, 30);
    x.fillStyle = urgent ? C.p1 : C.ink; x.fillRect(200, ty - 14, (W - 260) * (tm / 10), 30);
    // texto informativo
    const info = sold ? 'Leo takes Goku for $15 · $4 left' : b ? `${lead ? 'Dani' : 'Leo'} bids $${price} · outbid them!` : 'Base price: $1 · type your bid.';
    text(x, info, W / 2, 1830, F(700, 40), sold ? C.gold : '#c9c6d2', 'center');
    // toques de Leo en el botón (cuando puja él)
    BIDS.forEach(bb => { if (bb[1] === 0) tap(x, W - 200, 1640, t, bb[0] - 0.02); });
    if (sold) confetti(x, t, T.sold + 0.05, 17, W / 2, 900, 130, 1.2);
  }

  // ---------- combate ----------
  const HP = { p1: 7430, p2: 3110 };
  function hpAt(t) {
    const g = t < T.slash + 0.15 ? 1 : lerp(1, 5556 / 7430, E.outC(prog(t, T.slash + 0.15, T.slash + 0.6)));
    const s = t < T.beam + 0.3 ? 1 : lerp(1, 0, E.outC(prog(t, T.beam + 0.3, T.beam + 0.9)));
    return [g, s];
  }
  function hud(x, t, p, X, Y, w, frac, name, star, starCol, starTxt, team) {
    const c = PCOL[p], al = p ? 'right' : 'left', tx = p ? X + w - 34 : X + 34;
    const g = x.createLinearGradient(X, Y, X, Y + 380); g.addColorStop(0, p ? 'rgba(61,139,255,.2)' : 'rgba(255,51,68,.2)'); g.addColorStop(1, 'rgba(20,20,24,.6)');
    x.fillStyle = g; x.fillRect(X, Y, w, 380); x.fillStyle = c; x.fillRect(X, Y, w, 7);
    text(x, `PLAYER ${p + 1}`, tx, Y + 62, F(800, 32), c, al, 8);
    text(x, name, tx, Y + 122, F(900, 36), c, al, 8);
    x.font = F(900, 30); const sw = x.measureText(starTxt).width + 70;
    const sx = p ? X + w - 34 - sw : X + 34;
    x.save(); x.shadowColor = starCol; x.shadowBlur = 20; x.fillStyle = starCol; rr(x, sx, Y + 150, sw, 62, 8); x.fill(); x.restore();
    text(x, '★ ' + starTxt, sx + sw / 2, Y + 192, F(900, 30), p ? '#fff' : '#111', 'center');
    const max = p ? HP.p2 : HP.p1, cur = Math.max(0, Math.round(max * frac));
    x.textBaseline = 'alphabetic';
    if (p) { text(x, '/ ' + max, tx, Y + 280, F(700, 32), C.mut, 'right'); x.font = F(700, 32); const ww = x.measureText('/ ' + max).width; text(x, String(cur), tx - ww - 12, Y + 282, F(900, 76, DISP), '#fff', 'right'); }
    else { x.font = F(900, 76, DISP); const ww = x.measureText(String(cur)).width; text(x, String(cur), tx, Y + 282, F(900, 76, DISP), '#fff'); text(x, '/ ' + max, tx + ww + 12, Y + 280, F(700, 32), C.mut); }
    const bx = X + 34, bw = w - 68, by = Y + 304;
    x.fillStyle = '#0c0c0e'; rr(x, bx, by, bw, 40, 20); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.15)'; x.lineWidth = 3; x.stroke();
    if (frac > 0.002) {
      const fw = bw * frac;
      const hc = frac > 0.5 ? ['#3be85a', '#1fb53d'] : frac > 0.25 ? ['#ffb02e', '#e08a12'] : ['#ff4d4d', '#c81e1e'];
      const gg = x.createLinearGradient(0, by, 0, by + 40); gg.addColorStop(0, hc[0]); gg.addColorStop(1, hc[1]);
      x.fillStyle = gg; rr(x, p ? bx + bw - fw : bx, by, fw, 40, 20); x.fill();
    }
    for (let i = 0; i < 3; i++) { x.fillStyle = i < (p ? 3 : 3) ? '#3d8bff' : '#333'; x.fillRect(p ? bx + bw - (i + 1) * 120 : bx + i * 120, by + 56, 104, 12); }
    team.forEach((n, i) => {
      const tw = 86, th = 104, tx_ = p ? X + w - 34 - (i + 1) * (tw + 14) + 14 : X + 34 + i * (tw + 14), ty = Y + 390;
      x.save(); x.translate(tx_ + tw / 2, ty + th / 2); x.rotate(p ? 0.06 : -0.06);
      rr(x, -tw / 2, -th / 2, tw, th, 6); x.save(); x.clip(); cover(x, img[n], -tw / 2, -th / 2, tw, th, 0.5, 0.2); x.restore();
      x.strokeStyle = i === 0 ? c : 'rgba(255,255,255,.35)'; x.lineWidth = i === 0 ? 7 : 3; rr(x, -tw / 2, -th / 2, tw, th, 6); x.stroke(); x.restore();
    });
  }
  function fcard(x, t, p, X, Y, w, h, im, aura, ko) {
    const c = PCOL[p];
    // aura de llamas
    if (!ko) {
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const ph = t * 3 + i * 1.7 + p * 9, fx = X + w / 2 + Math.sin(ph) * w * 0.25, fy = Y + h * 0.6 - ((t * 0.9 + i / 7) % 1) * h * 0.9;
        const rad = w * (0.45 + 0.15 * Math.sin(ph * 1.3)) * aura;
        const g = x.createRadialGradient(fx, fy, 0, fx, fy, rad);
        g.addColorStop(0, p ? 'rgba(90,120,255,.42)' : 'rgba(255,60,80,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.fillRect(fx - rad, fy - rad, rad * 2, rad * 2);
      }
      x.restore();
    }
    x.save(); x.shadowColor = ko ? 'transparent' : c; x.shadowBlur = 60 * aura;
    x.fillStyle = '#000'; rr(x, X - 10, Y - 10, w + 20, h + 20, 14); x.fill(); x.restore();
    if (ko) x.filter = 'grayscale(1) brightness(.45)';
    cover(x, im, X, Y, w, h, 0.5, 0.2); x.filter = 'none';
    x.strokeStyle = ko ? '#444' : c; x.lineWidth = 10; rr(x, X - 2, Y - 2, w + 4, h + 4, 10); x.stroke();
  }
  function numPop(x, t, t0, s, X, Y, size, col = C.gold) {
    const d = t - t0; if (d < 0 || d > 1.4) return;
    const k = E.outBack(prog(d, 0, 0.22)), a = 1 - prog(d, 1.0, 1.4);
    x.save(); x.globalAlpha = a; x.translate(X, Y - d * 60); x.scale(k, k); x.rotate(-0.06);
    x.font = F(900, size, DISP); x.textAlign = 'center'; x.lineJoin = 'round';
    x.lineWidth = size * 0.12; x.strokeStyle = '#1a0d00'; x.strokeText(s, 0, 0);
    x.fillStyle = col; x.fillText(s, 0, 0); x.restore();
  }
  function fight(x, t, h) {
    gameBg(x, t, W, h, 0.8);
    logo(x, 50, 48, 118);
    const [fg, fs] = hpAt(t);
    const inK = E.outC(prog(t, T.fight, T.fight + 0.35));
    x.save(); x.globalAlpha = inK; x.translate(0, (1 - inK) * -60);
    hud(x, t, 0, 40, 200, 490, fg, 'GOKU', 1, '#ffffff', 'ULTRA INSTINCT', ['Goku', 'Gojo', 'Itachi']);
    hud(x, t, 1, 550, 200, 490, fs, 'SUKUNA', 1, '#ff3355', 'MALEVOLENT SHRINE', ['Sukuna', 'Naruto', 'Luffy']);
    x.restore();
    // escenario
    const SX = 40, SY = 640, SW = W - 80, SH = 900;
    let shx = 0, shy = 0;
    const shk = Math.max(pulse(t, T.slash, T.slash + 0.35, 0.01, 0.3), pulse(t, T.beam + 0.25, T.beam + 0.9, 0.01, 0.6) * 1.6, pulse(t, T.ko, T.ko + 0.4, 0.01, 0.35));
    if (shk > 0) { shx = noise(t * 40, 1) * 26 * shk; shy = noise(t * 40, 2) * 26 * shk; }
    x.save(); x.translate(shx, shy);
    rr(x, SX, SY, SW, SH, 24); x.save(); x.clip();
    const sg = x.createLinearGradient(0, SY, 0, SY + SH); sg.addColorStop(0, '#0c0b14'); sg.addColorStop(1, '#171222');
    x.fillStyle = sg; x.fillRect(SX, SY, SW, SH);
    const r = rng(3);
    for (let i = 0; i < 40; i++) { const sx = SX + r() * SW, sy = SY + r() * SH * 0.7, tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i)); x.fillStyle = `rgba(255,255,255,${0.5 * tw})`; x.fillRect(sx, sy, 4, 4); }
    glow(x, SX + SW * 0.25, SY + SH * 0.75, 520, 'rgba(255,51,68,.35)');
    glow(x, SX + SW * 0.75, SY + SH * 0.75, 520, 'rgba(61,139,255,.35)');
    // círculo mágico de Santuario
    const mk = pulse(t, T.slash - 0.6, T.beam + 0.2, 0.4, 0.3);
    if (mk > 0) {
      x.save(); x.globalAlpha = mk * 0.85; x.translate(SX + SW / 2, SY + SH * 0.86); x.scale(1, 0.28); x.rotate(t * 0.6);
      x.strokeStyle = '#ff2a3d'; x.lineWidth = 9; x.shadowColor = '#ff2a3d'; x.shadowBlur = 30;
      x.beginPath(); x.arc(0, 0, 470, 0, TAU); x.stroke(); x.beginPath(); x.arc(0, 0, 400, 0, TAU); x.stroke();
      x.beginPath(); for (let i = 0; i <= 5; i++) { const a = (i * 2 * TAU) / 5 - Math.PI / 2; x.lineTo(Math.cos(a) * 400, Math.sin(a) * 400); } x.stroke();
      x.restore();
    }
    // cartas
    const cw = 330, ch = 440, cy = SY + SH * 0.5 - ch / 2 + 40;
    const inL = E.outBack(prog(t, T.fight + 0.05, T.fight + 0.5)), inR = E.outBack(prog(t, T.fight + 0.15, T.fight + 0.6));
    let gx = lerp(-400, SX + 60, inL), sx2 = lerp(W + 400, SX + SW - 60 - cw, inR);
    let grot = -0.09, srot = 0.09, sY = cy, sA = 1;
    // Sukuna ataca: se lanza hacia Goku
    const atk = pulse(t, T.slash - 0.25, T.slash + 0.15, 0.25, 0.15);
    sx2 -= atk * 180;
    // Goku recibe
    const hitG = pulse(t, T.slash, T.slash + 0.3, 0.01, 0.3); gx -= hitG * 40; grot -= hitG * 0.1;
    // Goku carga y lanza
    const chg = pulse(t, T.cutin, T.beam + 0.6, 0.2, 0.3);
    const hitS = pulse(t, T.beam + 0.25, T.beam + 0.7, 0.01, 0.4);
    sx2 += hitS * 70; srot += hitS * 0.2;
    const ko = t >= T.ko;
    if (ko) { const kk = E.inC(prog(t, T.ko, T.ko + 0.7)); sY += kk * 160; srot += kk * 0.6; sA = 1 - prog(t, T.ko + 0.4, T.ko + 0.9) * 0.4; }
    x.save(); x.translate(gx + cw / 2, cy + ch / 2); x.rotate(grot); x.scale(1 + chg * 0.06, 1 + chg * 0.06); fcard(x, t, 0, -cw / 2, -ch / 2, cw, ch, img.Goku, 1 + chg * 1.2, false); x.restore();
    x.save(); x.globalAlpha = sA; x.translate(sx2 + cw / 2, sY + ch / 2); x.rotate(srot); fcard(x, t, 1, -cw / 2, -ch / 2, cw, ch, img.Sukuna, 1 + atk, ko); x.restore();
    // VS
    const vs = pulse(t, T.fight + 0.35, T.slash - 0.35, 0.15, 0.25);
    if (vs > 0) {
      x.save(); x.globalAlpha = vs; x.translate(SX + SW / 2, cy + ch / 2); const vk = E.outBack(prog(t, T.fight + 0.35, T.fight + 0.6)); x.scale(vk * 1.4, vk * 1.4); x.rotate(-0.08);
      x.font = F(900, 150, DISP); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 16; x.strokeStyle = '#000'; x.strokeText('VS', 0, 0); x.fillStyle = C.gold; x.fillText('VS', 0, 0); x.restore();
      text(x, 'DUEL 1', SX + SW / 2, SY + SH - 50, F(900, 40), `rgba(243,230,200,${0.6 * vs})`, 'center', 18);
    }
    // tajos de Santuario sobre Goku
    if (t > T.slash - 0.05 && t < T.slash + 0.7) {
      for (let i = 0; i < 3; i++) {
        const d = t - (T.slash - 0.05 + i * 0.07); if (d < 0) continue;
        const k = clamp(d / 0.12), a = 1 - prog(d, 0.2, 0.55);
        const cx_ = gx + cw / 2, cy_ = cy + ch / 2, ang = -0.7 + i * 0.5;
        x.save(); x.globalAlpha = a; x.translate(cx_, cy_); x.rotate(ang); x.globalCompositeOperation = 'lighter';
        x.strokeStyle = '#ffffff'; x.lineWidth = 10; x.shadowColor = '#ff2a3d'; x.shadowBlur = 40; x.lineCap = 'round';
        x.beginPath(); x.moveTo(-300, (i - 1) * 60); x.lineTo(-300 + 600 * k, (i - 1) * 60 + 20 * k); x.stroke(); x.restore();
      }
    }
    numPop(x, t, T.slash + 0.1, '-1874', gx + cw / 2, cy + 80, 150);
    // carga del Kamehameha
    if (chg > 0) {
      const ox = gx + cw - 20, oy = cy + ch * 0.45;
      const cr = 60 + 90 * prog(t, T.cutin, T.beam) + Math.sin(t * 40) * 8;
      glow(x, ox, oy, cr * 3.2, 'rgba(90,170,255,.9)', chg);
      glow(x, ox, oy, cr * 1.3, 'rgba(255,255,255,1)', chg);
      const rr_ = rng(Math.floor(t * 30));
      x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = 'rgba(160,210,255,.8)'; x.lineWidth = 4;
      for (let i = 0; i < 14; i++) { const a = rr_() * TAU, d1 = cr * 2.2 + rr_() * 160; x.beginPath(); x.moveTo(ox + Math.cos(a) * d1, oy + Math.sin(a) * d1); x.lineTo(ox + Math.cos(a) * (d1 - 60), oy + Math.sin(a) * (d1 - 60)); x.stroke(); }
      x.restore();
    }
    // rayo
    const bm = pulse(t, T.beam, T.beam + 0.85, 0.08, 0.3);
    if (bm > 0) {
      const ox = gx + cw - 20, oy = cy + ch * 0.45, ex = sx2 + cw * 0.5, ey = sY + ch * 0.45;
      const reach = E.outC(prog(t, T.beam, T.beam + 0.18));
      const tx_ = lerp(ox, ex, reach), ty_ = lerp(oy, ey, reach);
      x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
      [[120, 'rgba(60,120,255,.35)'], [80, 'rgba(110,180,255,.6)'], [46, 'rgba(200,235,255,.9)'], [22, '#ffffff']].forEach(([lw, c]) => {
        x.strokeStyle = c; x.lineWidth = lw * bm * (1 + Math.sin(t * 60) * 0.06); x.beginPath(); x.moveTo(ox, oy); x.lineTo(tx_, ty_); x.stroke();
      });
      x.restore();
      if (reach >= 1) {
        const ik = prog(t, T.beam + 0.18, T.beam + 0.8);
        glow(x, ex, ey, 380 * bm, 'rgba(255,255,255,1)', 1);
        glow(x, ex, ey, 600 * bm, 'rgba(90,160,255,.8)', 1);
        x.save(); x.globalCompositeOperation = 'lighter'; x.translate(ex, ey);
        for (let i = 0; i < 16; i++) { x.rotate(TAU / 16); x.fillStyle = `rgba(255,255,255,${0.35 * (1 - ik)})`; x.beginPath(); x.moveTo(-14, 0); x.lineTo(14, 0); x.lineTo(0, 600 * E.outC(ik)); x.fill(); }
        x.restore();
        x.save(); x.globalAlpha = 1 - ik; x.strokeStyle = '#cfe6ff'; x.lineWidth = 14; x.beginPath(); x.arc(ex, ey, 60 + ik * 520, 0, TAU); x.stroke(); x.restore();
      }
    }
    numPop(x, t, T.beam + 0.3, '-3110', sx2 + cw / 2, cy + 40, 230);
    x.restore(); // clip escenario
    x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 3; rr(x, SX, SY, SW, SH, 24); x.stroke();
    x.restore(); // temblor
    // cut-in de habilidad
    const ci = pulse(t, T.cutin, T.beam - 0.02, 0.12, 0.12);
    if (ci > 0) {
      const k = E.outC(prog(t, T.cutin, T.cutin + 0.2));
      x.save(); x.translate(0, SY + 250); x.rotate(-0.12);
      x.globalAlpha = ci;
      const bandX = lerp(-W, 0, k);
      const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#ff3344'); g.addColorStop(1, '#ff9a3d');
      x.fillStyle = g; x.fillRect(bandX - 100, -10, W + 300, 360);
      x.save(); x.beginPath(); x.rect(bandX - 100, -10, W + 300, 360); x.clip();
      cover(x, img.Goku, bandX - 60, -10, 440, 360, 0.5, 0.18, 1.05 + prog(t, T.cutin, T.beam) * 0.1);
      const sl = (t * 3000) % 200; x.fillStyle = 'rgba(255,255,255,.18)'; for (let i = -1; i < 9; i++) x.fillRect(bandX + 520 + i * 200 - sl, 20, 120, 6);
      x.restore();
      text(x, 'GOKU · ULTRA INSTINCT', bandX + 410, 110, F(800, 32), 'rgba(255,255,255,.9)', 'left', 6);
      x.save(); x.translate(bandX + 400, 245); x.font = F(900, 116, DISP); x.lineWidth = 14; x.strokeStyle = '#2a0006'; x.lineJoin = 'round'; x.strokeText('KAMEHAMEHA', 0, 0); x.fillStyle = '#fff'; x.fillText('KAMEHAMEHA', 0, 0); x.restore();
      x.restore();
    }
    // flash de impacto (fotogramas en negativo, como el juego)
    const fl = t >= T.beam + 0.2 && t < T.beam + 0.3;
    if (fl) { x.save(); x.globalCompositeOperation = 'difference'; x.fillStyle = '#fff'; x.fillRect(0, 0, W, h); x.restore(); }
    // comentarista y registro
    const lines = [[T.fight + 0.3, 'This looks one-sided!', 'Goku vs Sukuna'], [T.slash, 'First blood!', 'Sukuna opens the Shrine and slashes'], [T.cutin, 'No way!', 'Goku: "Kamehameha"'], [T.ko, 'Brutal K.O.!', 'Sukuna falls · Leo wins']];
    let L = lines[0]; for (const l of lines) if (t >= l[0]) L = l;
    const lk = E.outC(prog(t, L[0], L[0] + 0.25));
    x.save(); x.globalAlpha = inK; text(x, '🎙 ' + L[1], W / 2, 1625 + (1 - lk) * 20, F(900, 50), C.gold, 'center'); x.restore();
    x.fillStyle = '#121216'; rr(x, 40, 1680, W - 80, 150, 16); x.fill(); x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = 3; x.stroke();
    x.fillStyle = C.gold; x.fillRect(40, 1680, 9, 150);
    text(x, L[2], 100, 1772, F(800, 48), '#fff');
    // K.O. y victoria
    if (t >= T.ko + 0.15) {
      const k = prog(t, T.ko + 0.15, T.ko + 0.45), s = lerp(4, 1, E.outBack(k));
      const out = prog(t, T.win - 0.1, T.win + 0.15);
      x.save(); x.globalAlpha = clamp(k * 3) * (1 - out); x.translate(W / 2, SY + SH / 2); x.scale(s, s); x.rotate(-0.1);
      x.font = F(900, 330, DISP); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
      x.lineWidth = 34; x.strokeStyle = '#000'; x.strokeText('K.O.', 0, 0); x.fillStyle = C.p1; x.fillText('K.O.', 0, 0);
      x.lineWidth = 6; x.strokeStyle = '#fff'; x.strokeText('K.O.', 0, 0); x.restore();
    }
    if (t >= T.win) {
      const k = E.outBack(prog(t, T.win, T.win + 0.35));
      x.save(); x.fillStyle = `rgba(0,0,0,${0.55 * clamp(k)})`; x.fillRect(0, 0, W, h);
      x.translate(W / 2, h * 0.47); x.scale(k, k);
      const g = x.createLinearGradient(-W / 2, 0, W / 2, 0); g.addColorStop(0, '#ff3344'); g.addColorStop(1, '#ff7a3d');
      x.rotate(-0.05); x.fillStyle = g; x.fillRect(-W / 2 - 50, -170, W + 100, 340);
      text(x, 'PLAYER 1 WINS!', 0, -30, F(900, 100, DISP), '#fff', 'center', 2);
      text(x, 'LEO · VICTORY', 0, 80, F(900, 56), 'rgba(255,255,255,.92)', 'center', 10);
      x.restore();
      confetti(x, t, T.win, 33, W / 2, h * 0.5, 140, 1.3);
    }
  }
  function wipe(x, t, h) { // "¡Combate!" como el del juego
    const a = prog(t, T.wipe, T.wipe + 0.45), b = prog(t, T.fight - 0.05, T.fight + 0.4);
    const ea = E.ioC(a), eb = E.ioC(b);
    const x0 = lerp(-W, 0, ea) + lerp(0, W, eb);
    if (x0 >= W || x0 <= -W) return;
    x.save(); x.fillStyle = '#141412'; x.fillRect(x0, 0, W, h);
    x.beginPath(); x.rect(x0, 0, W, h); x.clip();
    const s = 1 + 0.08 * Math.sin(prog(t, T.wipe + 0.3, T.fight) * Math.PI);
    x.translate(W / 2, h / 2); x.scale(s, s); x.rotate(-0.06);
    text(x, 'FIGHT!', 0, 80, F(900, 280, DISP), C.acc, 'center', 2);
    x.restore();
  }

  // ---------- contenido de la web según el tiempo ----------
  function content(x, t, h) {
    if (t < T.menu) {
      x.fillStyle = '#0d0c10'; x.fillRect(0, 0, W, h);
      const k = E.outBack(prog(t, T.go + 0.05, T.menu - 0.05));
      glow(x, W / 2, h * 0.4, 700 * k, 'rgba(122,60,240,.6)');
      x.save(); x.translate(W / 2, h * 0.4); x.scale(k, k); x.drawImage(img.icon, -160, -160, 320, 320); x.restore();
    } else if (t < T.room) menuPage(x, t, h);
    else if (t < T.start + 0.05) roomPage(x, t, h);
    else if (t < T.wipe + 0.45) auction(x, t, h);
    else fight(x, t, h);
    if (t >= T.wipe && t < T.fight + 0.5) wipe(x, t, h);
    if (t >= T.start - 0.1 && t < T.auction + 0.12) { x.save(); x.globalAlpha = pulse(t, T.start - 0.1, T.auction + 0.12, 0.1, 0.12); x.fillStyle = '#fff'; x.fillRect(0, 0, W, h); x.restore(); }
  }

  function drawPhone(t, who) {
    const x = who === 'dani' ? phX2 : phX;
    x.save();
    if (who === 'dani') {
      if (t < 6.0) feedScreen(x, t);
      else callScreen(x, t, 'dani');
    } else if (t < T.wake) { x.fillStyle = '#050507'; x.fillRect(0, 0, PW, PH); }
    else if (t < T.dial) lockScreen(x, t);
    else if (t < T.browser) callScreen(x, t, 'leo');
    else if (t < T.go + 0.05) browserTyping(x, t);
    else {
      // web: barra de dirección arriba y la página debajo
      const ch = PH - 330;
      x.save(); x.translate(0, 330); content(x, t, ch); x.restore();
      browserChrome(x, t, SITE, prog(t, T.go, T.menu));
      homeBar(x);
    }
    roundMask(x);
    x.restore();
    return who === 'dani' ? phC2 : phC;
  }
  function drawFull(t) { conX.save(); content(conX, t, H); conX.restore(); return conC; }
  return { drawPhone, drawFull, avatar, confetti, glow, text, rr, F, DISP, C };
}
