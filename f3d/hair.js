/* BidVerse 3D · PELO: mechones curvos y aplanados (como se dibujan en el anime) colocados con una receta por peinado.
   Cada mechón: dónde nace en el cuero cabelludo (az, el), hacia dónde apunta (taz, tel), largo y grosor (en radios de cabeza)
   y cuánto se curva. az 0 = delante · 90 = su izquierda · 180 = detrás (grados). */
import * as THREE from 'three';

const D2R = Math.PI / 180, UP = new THREE.Vector3(0, 1, 0);
const dirOf = (az, el) => new THREE.Vector3(Math.sin(az * D2R) * Math.cos(el * D2R), Math.sin(el * D2R), Math.cos(az * D2R) * Math.cos(el * D2R));
const GEO = new Map();
function lockGeo(len, w, bend, flat) { // cono que se curva hacia -z y es más fino en z (un mechón)
  const k = [len, w, bend, flat].map(v => v.toFixed(3)).join('|'); let g = GEO.get(k); if (g) return g;
  g = new THREE.ConeGeometry(w, len, 8, 6); g.translate(0, len / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = Math.max(0, p.getY(i) / len); p.setZ(i, p.getZ(i) * flat - bend * len * t * t); p.setX(i, p.getX(i) * (1 - .15 * t)); }
  g.computeVertexNormals(); GEO.set(k, g); return g;
}
// h: { part(geo, col, parent, pos, rot, scl, o), group, R, rnd, col }
export function buildHair(h, lk) {
  const { R, rnd, g: G } = h, hc = lk.hc || '#151515', hs = lk.hs || 'short';
  const grav = new THREE.Vector3(0, -1, -.35).normalize(), m4 = new THREE.Matrix4(), X = new THREE.Vector3(), Z = new THREE.Vector3();
  const lock = (az, el, len, w, taz, tel, bend = .3, flat = .55, col = hc) => {
    const D = dirOf(taz, tel), K = grav.clone().sub(D.clone().multiplyScalar(grav.dot(D))); if (K.lengthSq() < 1e-4) K.set(0, 0, -1); K.normalize();
    Z.copy(K).negate(); X.crossVectors(D, Z).normalize(); Z.crossVectors(X, D);
    const m = h.part(lockGeo(len * R, w * R * 1.35, bend, flat), col, G, null, null, null, { shared: 1 }); m4.makeBasis(X, D, Z); m.quaternion.setFromRotationMatrix(m4); // (1.35: mechones anchos en la raíz)
    m.position.copy(dirOf(az, el)).multiplyScalar(R * .8); return m;
  };
  const j = (v, a) => v + (rnd() * 2 - 1) * a; // pequeña variación estable por personaje
  const cap = (th = 70, tilt = -17, k = 1.07, col = hc) => h.part(new THREE.SphereGeometry(R * k, 28, 16, 0, Math.PI * 2, 0, th * D2R), col, G, [0, 0, 0], [tilt * D2R, 0, 0]);
  const ball = (az, el, r, d = .95) => h.part(new THREE.SphereGeometry(r * R, 14, 10), hc, G, dirOf(az, el).multiplyScalar(R * d).toArray());
  const fringe = (n, len, spread = 60, down = -40, w = .26, el = 58) => { for (let i = 0; i < n; i++) { const a = n > 1 ? -spread / 2 + spread * i / (n - 1) : 0; lock(j(a, 4), el, j(len, .1), w, a * 1.25, j(down, 6), .3, .45); } };
  const frame = (len = 1.6, az = 62, w = .22) => { for (const s of [-1, 1]) lock(s * az, 35, len, w, s * (az + 8), -82, .15, .4); }; // mechones largos a los lados de la cara
  const backSheet = (n, len, w = .3, spread = 120, flat = .35) => { for (let i = 0; i < n; i++) { const a = 180 - spread / 2 + spread * i / Math.max(1, n - 1); lock(a, j(28, 8), j(len, .25), w, a, -80, .2, flat); } };
  switch (hs) {
    case 'bald': return;
    case 'dome': cap(72, -12, 1.035); return;
    case 'buzz': cap(74, -14, 1.03); return;
    case 'spiky': // Goku: tres puntas arriba, dos a cada lado, flequillo en punta y la nuca hacia abajo
      cap(66, -18); fringe(3, 1.05, 54, -22, .27, 60);
      lock(-8, 84, j(1.6, .1), .36, 175, 66, .55); lock(42, 74, j(1.5, .1), .34, 62, 58, .45); lock(-46, 74, j(1.5, .1), .34, -64, 58, .45);
      lock(-95, 46, 1.35, .32, -112, 28, .35); lock(95, 46, 1.35, .32, 112, 28, .35);
      lock(150, 56, 1.45, .34, 165, 26, .4); lock(-150, 56, 1.45, .34, -165, 26, .4); lock(180, 36, 1.3, .32, 180, 4, .35); lock(124, 24, 1.05, .28, 134, -16, .3); lock(-124, 24, 1.05, .28, -134, -16, .3); return;
    case 'naruto': case 'minato':
      cap(68, -16);
      for (let i = 0; i < 16; i++) { const a = 40 + i * (280 / 15), el = i % 2 ? 62 : 34; lock(j(a, 6), el, j(hs === 'minato' ? 1.1 : 1, .12), .3, a + (a > 180 ? 8 : -8), el + 12, .35); }
      lock(0, 84, 1.1, .3, 0, 75, .4); fringe(5, .95, 70, -42, .24, 58); if (hs === 'minato') frame(1.55, 64, .2); else frame(.95, 74, .2); return;
    case 'vegeta': // llama alta con pico en la frente
      cap(64, -10);
      for (let i = 0; i < 11; i++) { const a = -150 + i * 30, top = Math.abs(a) < 80; lock(j(a, 6), top ? 66 : 48, j(top ? 2.1 : 1.6, .15), .36, a * .4, j(78, 5), .25); }
      lock(0, 60, .55, .22, 0, 72, .2); lock(-26, 58, .5, .2, -22, 70, .2); lock(26, 58, .5, .2, 22, 70, .2); return;
    case 'gojo': cap(66, -16);
      for (let i = 0; i < 14; i++) { const a = j(-160 + i * 24.6, 5), el = j(i % 2 ? 66 : 46, 6); lock(a, el, j(1.15, .15), .3, a * .9, el + 18, .35); }
      fringe(4, .95, 60, -28, .25, 58); return;
    case 'sasuke': cap(70, -14); // nuca en punta hacia atrás y arriba, flequillo largo enmarcando la cara
      for (let i = 0; i < 9; i++) { const a = 180 + (i - 4) * 20; lock(j(a, 4), j(i % 2 ? 62 : 46, 6), j(1.9, .15), .4, a, j(i % 2 ? 50 : 34, 6), .35); }
      for (const s of [-1, 1]) { lock(s * 100, 50, 1.4, .34, s * 125, 40, .35); lock(s * 40, 40, 1.7, .26, s * 50, -82, .12, .4); }
      lock(0, 62, 1.1, .26, 8, -60, .25, .45); lock(-18, 64, 1, .24, -10, -55, .25, .45); return;
    case 'kakashi': cap(64, -14);
      for (let i = 0; i < 8; i++) { const a = -60 + i * 26; lock(j(a, 5), j(62, 8), j(1.7, .2), .38, j(88, 10), j(55, 8), .35); }
      lock(10, 58, 1.1, .26, 40, -35, .3, .45); lock(-20, 58, 1, .24, 20, -40, .3, .45); return;
    case 'tall': cap(64, -14);
      for (let i = 0; i < 7; i++) { const a = i * 51.4; lock(j(a, 8), 68, j(2, .3), .34, a, j(84, 4), .15); }
      lock(0, 85, 2.3, .4, 180, 86, .1); fringe(3, .8, 50, -30, .24, 58); return;
    case 'flame': cap(64, -24); // peinado hacia atrás y arriba (Rengoku, Hisoka)
      for (let i = 0; i < 10; i++) { const a = j(-130 + i * 29, 5), el = j(60, 8); lock(a, el, j(1.5, .15), .32, a * .5 + (a > 0 ? 160 : -160) * .5, j(48, 6), .4); }
      if (h.name !== 'Hisoka') fringe(3, .9, 44, -30, .25, 60); return;
    case 'messy': cap(68, -16);
      for (let i = 0; i < 15; i++) { const a = j(-170 + i * 24, 8), el = j(i % 3 ? 44 : 66, 10); if (Math.abs(a) < 40 && el < 55) continue; lock(a, el, j(.8, .15), .28, a, el + j(10, 12), .35); }
      fringe(4, .85, 64, -34, .25, 58); return;
    case 'fluffy': case 'curly': cap(70, -14);
      for (let i = 0; i < (hs === 'curly' ? 20 : 14); i++) { const a = rnd() * 360, el = 12 + rnd() * 70; if (Math.cos(a * D2R) > .7 && el < 50) continue; ball(a, el, hs === 'curly' ? .28 : .34, 1); }
      if (hs === 'fluffy') for (let i = 0; i < 9; i++) { const a = -160 + i * 40; lock(j(a, 8), j(50, 12), .7, .3, a, j(40, 10), .4); }
      fringe(4, .75, 60, -30, .26, 58); return;
    case 'long': cap(72, -16); backSheet(7, 2.6, .32); frame(1.9, 58, .24); fringe(3, .8, 44, -38, .24, 60); return;
    case 'longspiky': cap(70, -14);
      for (let i = 0; i < 12; i++) { const a = 120 + i * 10.9; lock(j(a, 4), j(30, 10), j(2.6, .3), .38, a + j(0, 20), j(-58, 12), .25, .45); }
      for (let i = 0; i < 6; i++) { const a = (i < 3 ? -1 : 1) * (70 + (i % 3) * 18); lock(a, 40, 1.6, .3, a * 1.1, -45, .25, .45); }
      fringe(4, 1.1, 64, -30, .28, 60); return;
    case 'pony': cap(72, -16); lock(180, 38, 1.4, .3, 180, -55, .2, .5); lock(180, 0, 1.9, .26, 180, -80, .15, .5); fringe(3, .85, 50, -38, .24, 60); frame(1.3, 60, .2); return;
    case 'bob': cap(72, -14);
      for (let i = 0; i < 11; i++) { const a = 55 + i * 25; lock(a, 22, j(1.15, .08), .32, a, -84, .1, .4); }
      fringe(5, .72, 72, -60, .26, 56); return;
    case 'bowl': cap(88, -22, 1.09); fringe(7, .55, 96, -80, .22, 46); return;
    case 'slick': cap(70, -30);
      for (let i = 0; i < 6; i++) { const a = 180 + (i - 2.5) * 26; lock(a, 50, j(1, .1), .3, a, -8, .3, .4); }
      if (h.name === 'Aizen') lock(8, 64, 1.1, .16, 20, -60, .2, .4); return;
    case 'side': cap(70, -16); lock(-20, 60, 1.25, .34, 40, -55, .35, .4); lock(12, 62, 1, .28, 55, -45, .3, .4); lock(60, 48, .9, .26, 80, -60, .2, .45); fringe(2, .7, 30, -40, .22, 60); return;
    case 'undercut': cap(66, -18, 1.06); lock(-6, 72, 1.1, .3, -55, -35, .3, .4); lock(6, 72, 1.1, .3, 55, -35, .3, .4); lock(-30, 60, .8, .24, -60, -50, .3, .45); lock(30, 60, .8, .24, 60, -50, .3, .45); return;
    case 'wild': cap(70, -14);
      for (let i = 0; i < 16; i++) { const a = 50 + i * (260 / 15); lock(j(a, 6), j(i % 2 ? 50 : 22, 8), j(2, .35), .4, a + (a < 180 ? -10 : 10), j(i % 2 ? 30 : -25, 12), .3, .45); }
      fringe(4, 1, 64, -26, .3, 60); return;
    case 'pomp': cap(70, -24); lock(0, 70, 1.5, .55, 0, 14, -.25, .55); for (let i = 0; i < 4; i++) { const a = 180 + (i - 1.5) * 30; lock(a, 45, .9, .3, a, -10, .3, .4); } return;
    case 'bun': cap(72, -22); ball(180, 48, .42, 1.05); fringe(3, .8, 46, -36, .24, 60); frame(1.4, 60, .18); return;
    case 'twinbun': cap(72, -18); ball(140, 62, .34, 1); ball(-140, 62, .34, 1); fringe(3, .8, 50, -36, .24, 58); return;
    case 'twin': cap(72, -16); for (const s of [-1, 1]) { lock(s * 130, 30, 1.3, .3, s * 150, -60, .2, .5); lock(s * 135, -5, 1.6, .28, s * 150, -82, .15, .5); } fringe(3, .8, 50, -38, .24, 60); return;
    case 'topknot': cap(52, -10, 1.03); ball(180, 72, .32, 1.08); return;
    case 'crest': for (let i = -1; i <= 1; i++) lock(i * 40, 70, i ? 1.3 : 1.7, .45, i * 50 + 180, 40, .3, .25); return;
    default: cap(70, -16); fringe(4, .7, 60, -36, .24, 58);
  }
}
