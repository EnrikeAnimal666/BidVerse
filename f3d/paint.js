/* BidVerse 3D · ROPA PINTADA: texturas para el torso (pecho arriba, abdomen abajo) y para el faldón/haori.
   El lienzo da la vuelta al cuerpo: x 128 = delante, x 0/256 = espalda. Patrones (look.o / look.cp) por personaje. */
const W = 256;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const poly = (g, pts, col) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fillStyle = col; g.fill(); };
const line = (g, pts, w, col) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); };
const circ = (g, x, y, r, col, stroke) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); if (stroke) { g.lineWidth = stroke; g.strokeStyle = col; g.stroke(); } else { g.fillStyle = col; g.fill(); } };
const both = (f, x) => { f(x); if (x < 40) f(x + W); if (x > W - 40) f(x - W); }; // dibujos que cruzan la costura de la espalda
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k)))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };
function cloud(g, x, y, s) { // nube de Akatsuki
  const p = [[-1.1, .2, .55], [-.45, -.25, .6], [.35, -.3, .65], [1.05, .15, .55], [0, .25, .6]];
  for (const [w, c] of [[s * .22, '#ffffff'], [0, '#c81d2a']]) { g.fillStyle = c; for (const [dx, dy, r] of p) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s + w, 0, Math.PI * 2); g.fill(); } }
}
function kanji(g, x, y, r, ch, bg = '#ffffff', fg = '#111111') { both(xx => { circ(g, xx, y, r, bg); g.fillStyle = fg; g.font = `900 ${Math.round(r * 1.35)}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, xx, y + r * .06); }, x); }
function abs(g, sk, y0) { // pecho y abdominales marcados (sin camiseta)
  const d = shade(sk, .78); line(g, [[92, y0 + 70], [118, y0 + 92], [128, y0 + 84], [138, y0 + 92], [164, y0 + 70]], 3, d);
  line(g, [[128, y0 + 96], [128, y0 + 250]], 2, d);
  for (const y of [y0 + 150, y0 + 190, y0 + 228]) { line(g, [[104, y], [124, y + 4]], 2, d); line(g, [[132, y + 4], [152, y]], 2, d); }
}
export function paintTorso(lk, name) {
  const [c, g] = mk(W, 512), t = lk.t || '#555566', t2 = lk.t2 || shade(t, .7), sk = lk.sk || '#f3c9a4', o = lk.o || '';
  const fill = (col, y0 = 0, y1 = 512) => { g.fillStyle = col; g.fillRect(0, y0, W, y1 - y0); };
  fill(t);
  const bare = o === 'bare' || (lk.sl === 0 && t.toLowerCase() === sk.toLowerCase());
  if (bare) abs(g, sk, 0);
  switch (o) {
    case 'gi': poly(g, [[78, 0], [128, 170], [178, 0]], t2); kanji(g, 166, 120, 24, lk.kj || '亀'); kanji(g, 0, 150, 42, lk.kj || '亀'); break;
    case 'naruto': fill('#1b1b1b', 0, 92); line(g, [[128, 40], [128, 512]], 3, '#f2f2f2'); both(x => { circ(g, x, 170, 34, '#c8202a', 7); circ(g, x, 170, 14, '#c8202a', 5); }, 0); break;
    case 'akatsuki': fill('#141418'); fill('#c81d2a', 0, 34); for (const [x, y, s] of [[70, 140, 22], [190, 120, 22], [20, 260, 24], [140, 330, 22], [230, 420, 22], [80, 470, 20]]) both(xx => cloud(g, xx, y, s), x); break;
    case 'survey': fill(t2); poly(g, [[0, 0], [96, 0], [96, 230], [0, 230]], t); poly(g, [[160, 0], [256, 0], [256, 230], [160, 230]], t);
      line(g, [[96, 30], [160, 200]], 7, '#3a2a1f'); line(g, [[160, 30], [96, 200]], 7, '#3a2a1f'); fill('#3a2a1f', 360, 376);
      both(x => { circ(g, x, 120, 34, '#f2f2f2'); poly(g, [[x - 26, 130], [x - 4, 96], [x - 2, 140]], '#2f5fb0'); poly(g, [[x + 26, 130], [x + 4, 96], [x + 2, 140]], '#f2f2f2'); line(g, [[x + 4, 96], [x + 26, 130]], 3, '#2f5fb0'); }, 0); break;
    case 'jjk': fill(shade(t, 1.25), 0, 44); for (const y of [70, 150, 230, 320, 410]) circ(g, 128, y, 7, '#d4af37'); if (lk.t2) { g.fillStyle = lk.t2; both(x => g.fillRect(x - 70, 0, 140, 70), 0); } break; // capucha roja de Yuji
    case 'gakuran': fill(shade(t, 1.3), 0, 36); for (const y of [80, 170, 260, 350, 440]) circ(g, 128, y, 6, lk.t2 || '#d4af37'); break;
    case 'shihaku': poly(g, [[92, 0], [128, 190], [164, 0]], '#f2f2f2'); poly(g, [[104, 0], [128, 150], [152, 0]], t); line(g, [[92, 0], [128, 190], [164, 0]], 3, shade(t, .7)); fill(lk.bl || '#f2f2f2', 380, 420); break;
    case 'kimono': poly(g, [[86, 0], [128, 200], [170, 0]], lk.t2 || '#f2f2f2'); poly(g, [[100, 0], [140, 180], [150, 0]], t); line(g, [[86, 0], [140, 200]], 4, shade(t, .7)); fill(lk.bl || shade(t, .6), 370, 430); break;
    case 'suit': poly(g, [[92, 0], [128, 250], [164, 0]], '#f4f4f4'); poly(g, [[118, 20], [128, 300], [138, 20]], lk.t2 || '#b3262e'); line(g, [[92, 0], [128, 250]], 5, shade(t, .7)); line(g, [[164, 0], [128, 250]], 5, shade(t, .7)); circ(g, 140, 330, 5, shade(t, .6)); circ(g, 140, 400, 5, shade(t, .6)); break;
    case 'vest': fill(sk); abs(g, sk, 0); g.fillStyle = t; g.fillRect(0, 0, 86, 300); g.fillRect(170, 0, 86, 300); line(g, [[104, 70], [152, 150]], 5, '#a8574a'); line(g, [[152, 70], [104, 150]], 5, '#a8574a'); break;
    case 'armor': poly(g, [[34, 20], [222, 20], [206, 250], [50, 250]], '#f2f2f2'); line(g, [[50, 22], [80, 0]], 14, '#d4af37'); line(g, [[206, 22], [176, 0]], 14, '#d4af37'); line(g, [[50, 250], [206, 250]], 6, '#d4af37'); fill(shade('#f2f2f2', .85), 290, 330); break;
    case 'samurai': for (let y = 20; y < 300; y += 34) line(g, [[0, y], [W, y]], 4, shade(t, .55)); fill(lk.t2 || '#2b2b2b', 300, 512); for (let y = 330; y < 512; y += 30) line(g, [[0, y], [W, y]], 3, shade(t, .7)); break;
    case 'tank': g.fillStyle = sk; g.fillRect(0, 0, 70, 70); g.fillRect(186, 0, 70, 70); poly(g, [[96, 0], [128, 50], [160, 0]], sk); break;
    case 'hoodie': circ(g, 128, 130, 34, lk.t2 || '#ffd23f'); line(g, [[110, 140], [128, 152], [146, 140]], 6, t); circ(g, 116, 118, 5, t); circ(g, 140, 118, 5, t); break;
    case 'flak': poly(g, [[100, 0], [128, 60], [156, 0]], lk.t2 || '#2b2f45'); for (const x of [76, 180]) { g.fillStyle = shade(t, .8); g.fillRect(x - 26, 130, 52, 70); line(g, [[x - 26, 130], [x + 26, 130]], 4, shade(t, .6)); } line(g, [[128, 60], [128, 300]], 3, shade(t, .65)); break;
    case 'zip': line(g, [[128, 30], [128, 512]], 4, shade(t, .7)); fill(shade(t, .85), 0, 30); break;
    case 'frieza': poly(g, [[60, 40], [196, 40], [170, 190], [86, 190]], lk.t2 || '#8e3fd1'); circ(g, 40, 30, 40, lk.t2 || '#8e3fd1'); circ(g, 216, 30, 40, lk.t2 || '#8e3fd1'); break;
    case 'cell': for (let i = 0; i < 60; i++) circ(g, (i * 53) % W, (i * 97) % 512, 5 + (i % 4) * 2, '#111111'); break;
    case 'robe': poly(g, [[90, 0], [128, 160], [166, 0]], lk.t2 || shade(t, 1.3)); fill(lk.bl || shade(t, .7), 360, 400); break;
  }
  if (!o && !bare && lk.t2) poly(g, [[100, 0], [128, 50], [156, 0]], lk.t2); // cuello de la camiseta de debajo
  return c;
}
export function paintCoat(lk) {
  const p = lk.cp || (lk.o === 'akatsuki' ? 'akatsuki' : ''); if (!p) return null;
  const [c, g] = mk(W, 256), col = (lk.x && lk.x.coat) || '#f2f2f2';
  g.fillStyle = col; g.fillRect(0, 0, W, 256);
  if (p === 'checker') { for (let y = 0; y < 256; y += 32) for (let x = 0; x < W; x += 32) if (((x + y) / 32) % 2 === 0) { g.fillStyle = '#0d0d0d'; g.fillRect(x, y, 32, 32); } }
  else if (p === 'tri') { g.fillStyle = '#ffffff'; for (let y = 10; y < 256; y += 42) for (let x = (y / 42 % 2) * 21; x < W; x += 42) poly(g, [[x, y + 30], [x + 15, y], [x + 30, y + 30]], '#ffffff'); }
  else if (p === 'giyu') { g.fillStyle = '#7a1f2e'; g.fillRect(0, 0, W / 2, 256); for (let y = 0; y < 256; y += 28) for (let x = W / 2; x < W; x += 32) { const k = ((x + y) / 4) % 3; poly(g, [[x + 16, y], [x + 32, y + 14], [x + 16, y + 28], [x, y + 14]], k < 1 ? '#3f8a4a' : k < 2 ? '#e8c840' : '#d86a2a'); } }
  else if (p === 'flame') { for (let i = 0; i < 12; i++) { const x = i * 22; poly(g, [[x - 8, 256], [x + 6, 150 - (i % 3) * 20], [x + 26, 256]], '#e5531a'); poly(g, [[x, 256], [x + 8, 190 - (i % 3) * 14], [x + 18, 256]], '#ffb020'); } }
  else if (p === 'akatsuki') { g.fillStyle = '#141418'; g.fillRect(0, 0, W, 256); for (const [x, y] of [[40, 60], [150, 40], [230, 140], [90, 180], [180, 230]]) cloud(g, x, y, 20); }
  else if (p === 'hem') { g.fillStyle = '#1b1b1b'; for (let x = 0; x < W; x += 24) poly(g, [[x, 256], [x + 12, 226], [x + 24, 256]], '#1b1b1b'); }
  return c;
}
