// Decorados: salón de Leo, habitación de Dani, plató final y el móvil. Texturas generadas con canvas 2D.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, TAU } from './util.js';

const RB = (w, h, d, r = 0.05, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, r);
function mesh(geo, mat, parent, pos = [0, 0, 0], rot, scale) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scale) Array.isArray(scale) ? m.scale.set(...scale) : m.scale.setScalar(scale);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, ...o });

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, { repeat, aniso = 8, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

// ---------- texturas ----------
function woodFloor() {
  const [c, x] = cv(1024, 1024), r = rng(11);
  const rows = 8, h = 1024 / rows;
  for (let i = 0; i < rows; i++) {
    let px = -r() * 400;
    while (px < 1024) {
      const len = 300 + r() * 380, l = 38 + r() * 12, hue = 26 + r() * 8;
      x.fillStyle = `hsl(${hue} ${42 + r() * 10}% ${l}%)`;
      x.fillRect(px, i * h, len, h);
      // vetas
      for (let k = 0; k < 16; k++) {
        x.strokeStyle = `hsla(${hue - 4} 50% ${l - 10 - r() * 8}% / ${0.12 + r() * 0.18})`;
        x.lineWidth = 1 + r() * 2.5;
        x.beginPath();
        const y0 = i * h + r() * h;
        x.moveTo(px, y0);
        for (let s = 0; s <= 8; s++) x.lineTo(px + (len * s) / 8, y0 + Math.sin(s * 0.9 + r() * 2) * 3);
        x.stroke();
      }
      x.fillStyle = 'rgba(30,15,5,.55)'; x.fillRect(px, i * h, 3, h);
      px += len;
    }
    x.fillStyle = 'rgba(30,15,5,.6)'; x.fillRect(0, i * h, 1024, 3);
  }
  return c;
}
function paint(base, n = 0.05, seed = 3) {
  const [c, x] = cv(512, 512), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { x.fillStyle = r() < 0.5 ? `rgba(255,255,255,${r() * n})` : `rgba(0,0,0,${r() * n})`; x.fillRect(r() * 512, r() * 512, 2, 2); }
  return c;
}
function rugTex(cols) {
  const [c, x] = cv(1024, 1024);
  for (let i = 0; i < 14; i++) { x.fillStyle = cols[i % cols.length]; x.beginPath(); x.arc(512, 512, 512 - i * 36, 0, TAU); x.fill(); }
  const r = rng(5);
  for (let i = 0; i < 30000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.07})`; x.fillRect(r() * 1024, r() * 1024, 2, 3); }
  return c;
}
function fabricTex(base, seed = 9) {
  const [c, x] = cv(256, 256), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 2) { x.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`; x.fillRect(0, i, 256, 1); x.fillRect(i, 0, 1, 256); }
  return c;
}

// Ventana con lluvia: cielo de tarde, luces de ciudad desenfocadas y gotas que resbalan. Se redibuja cada fotograma.
function rainWindow() {
  const [c, x] = cv(512, 640);
  const r = rng(77);
  const lights = Array.from({ length: 46 }, () => ({ x: r() * 512, y: 330 + r() * 300, s: 6 + r() * 22, h: [38, 200, 280, 20][Math.floor(r() * 4)], a: 0.2 + r() * 0.5 }));
  const drops = Array.from({ length: 70 }, () => ({ x: r() * 512, y0: r() * 640, v: 30 + r() * 140, s: 2 + r() * 4, ph: r() * 10 }));
  const blds = Array.from({ length: 12 }, (_, i) => ({ x: i * 46 - 10, w: 40 + r() * 30, h: 140 + r() * 220 }));
  const t_ = tex(c);
  return {
    tex: t_,
    draw(t, mood = 0) {
      const g = x.createLinearGradient(0, 0, 0, 640);
      g.addColorStop(0, mood ? '#1a1446' : '#1c2a44'); g.addColorStop(0.55, mood ? '#3a2a78' : '#3c4f6e'); g.addColorStop(1, '#141b2b');
      x.fillStyle = g; x.fillRect(0, 0, 512, 640);
      for (const b of blds) { x.fillStyle = 'rgba(12,16,28,.85)'; x.fillRect(b.x, 640 - b.h, b.w, b.h); }
      for (const l of lights) {
        const gg = x.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.s);
        gg.addColorStop(0, `hsla(${l.h} 90% 70% / ${l.a})`); gg.addColorStop(1, `hsla(${l.h} 90% 60% / 0)`);
        x.fillStyle = gg; x.fillRect(l.x - l.s, l.y - l.s, l.s * 2, l.s * 2);
      }
      x.strokeStyle = 'rgba(200,220,255,.10)'; x.lineWidth = 1;
      for (let i = 0; i < 90; i++) { const xx = (i * 61.7 + t * 300) % 560 - 20, yy = (i * 97.3 + t * 900) % 700 - 30; x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx - 4, yy + 26); x.stroke(); }
      for (const d of drops) {
        const y = (d.y0 + t * d.v * (0.6 + 0.4 * Math.sin(t * 2 + d.ph))) % 680 - 20;
        x.fillStyle = 'rgba(220,235,255,.28)'; x.beginPath(); x.ellipse(d.x, y, d.s * 0.8, d.s, 0, 0, TAU); x.fill();
        x.fillStyle = 'rgba(220,235,255,.10)'; x.fillRect(d.x - d.s * 0.3, y - d.s * 8, d.s * 0.6, d.s * 8);
        x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.arc(d.x - d.s * 0.3, y - d.s * 0.3, d.s * 0.25, 0, TAU); x.fill();
      }
      t_.needsUpdate = true;
    },
  };
}

function clockFace() {
  const [c, x] = cv(512, 512);
  x.fillStyle = '#f7f2e8'; x.beginPath(); x.arc(256, 256, 256, 0, TAU); x.fill();
  x.fillStyle = '#1d1d1d';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU, big = i % 5 === 0;
    x.save(); x.translate(256, 256); x.rotate(a); x.fillRect(-(big ? 6 : 2), -236, big ? 12 : 4, big ? 40 : 16); x.restore();
  }
  x.font = '800 54px Nunito'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * TAU; x.fillText(i, 256 + Math.sin(a) * 160, 256 - Math.cos(a) * 160); }
  return tex(c);
}

function posterTex(kind) {
  const [c, x] = cv(512, 720);
  if (kind === 'retro') {
    const g = x.createLinearGradient(0, 0, 0, 720); g.addColorStop(0, '#ff8a3d'); g.addColorStop(0.55, '#ff3d7f'); g.addColorStop(1, '#5b2bd1');
    x.fillStyle = g; x.fillRect(0, 0, 512, 720);
    x.fillStyle = '#ffe27a'; x.beginPath(); x.arc(256, 330, 150, 0, TAU); x.fill();
    x.fillStyle = '#5b2bd1'; for (let i = 0; i < 7; i++) x.fillRect(80, 330 + i * 24, 352, 10 + i * 1.5);
    x.fillStyle = '#1b0e33'; x.font = '900 96px "Big Shoulders Display"'; x.textAlign = 'center'; x.fillText('GAME', 256, 600); x.fillText('NIGHT', 256, 690);
  } else if (kind === 'wave') {
    x.fillStyle = '#14213d'; x.fillRect(0, 0, 512, 720);
    for (let i = 0; i < 12; i++) { x.strokeStyle = `hsl(${190 + i * 8} 80% ${55 + i * 2}%)`; x.lineWidth = 10; x.beginPath(); for (let k = 0; k <= 512; k += 8) x.lineTo(k, 200 + i * 38 + Math.sin(k * 0.02 + i) * 30); x.stroke(); }
    x.fillStyle = '#fca311'; x.font = '900 80px "Big Shoulders Display"'; x.textAlign = 'center'; x.fillText('LO-FI', 256, 120);
  } else {
    x.fillStyle = '#f1e9da'; x.fillRect(0, 0, 512, 720);
    const r = rng(4);
    for (let i = 0; i < 9; i++) { x.fillStyle = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#1d3557'][i % 5]; x.beginPath(); x.arc(r() * 512, r() * 720, 40 + r() * 110, 0, TAU); x.fill(); }
  }
  return tex(c);
}

function neonTextTex(text, color) {
  const [c, x] = cv(1024, 256);
  x.font = '900 190px "Big Shoulders Display"'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineJoin = 'round'; x.strokeStyle = color; x.lineWidth = 14; x.strokeText(text, 512, 132);
  x.fillStyle = '#ffffff'; x.globalAlpha = 0.85; x.lineWidth = 5; x.strokeStyle = '#fff'; x.strokeText(text, 512, 132);
  return tex(c);
}

// ---------- piezas comunes ----------
export function sofa(parent, col = '#2f6650', pos = [0, 0, 0]) {
  const g = new THREE.Group(); g.position.set(...pos); parent.add(g);
  const fab = phys(col, { roughness: 0.9, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(col).lerp(new THREE.Color('#ffffff'), 0.45), map: tex(fabricTex('#ffffff'), { repeat: [4, 4] }) });
  const wood = std('#3b2618', { roughness: 0.5 });
  mesh(RB(2.5, 0.22, 0.85, 0.06), fab, g, [0, 0.18, 0]);
  [-1, 1].forEach(s => mesh(RB(1.17, 0.18, 0.47, 0.08), fab, g, [0.59 * s, 0.37, 0.2]));
  mesh(RB(2.5, 0.66, 0.22, 0.09), fab, g, [0, 0.6, -0.315]);
  [-1, 1].forEach(s => mesh(RB(1.13, 0.5, 0.2, 0.1), fab, g, [0.58 * s, 0.68, -0.13], [-0.12, 0, 0]));
  [-1, 1].forEach(s => mesh(RB(0.26, 0.54, 0.85, 0.1), fab, g, [1.25 * s, 0.4, 0]));
  [[-1.2, -0.36], [1.2, -0.36], [-1.2, 0.36], [1.2, 0.36]].forEach(([x_, z]) => mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.08, 12), wood, g, [x_, 0.04, z]));
  return g;
}
function pillow(parent, col, pos, rot, size = 0.42) {
  const m = phys(col, { roughness: 0.85, sheen: 0.8, sheenColor: new THREE.Color('#fff') });
  return mesh(RB(size, size, 0.14, 0.065, 5), m, parent, pos, rot);
}
function plant(parent, pos, scale = 1) {
  const g = new THREE.Group(); g.position.set(...pos); g.scale.setScalar(scale); parent.add(g);
  mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.36, 28), phys('#e9e2d4', { roughness: 0.35, clearcoat: 0.5 }), g, [0, 0.18, 0]);
  mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.02, 28), std('#3b2a1e'), g, [0, 0.35, 0]);
  const leaf = phys('#3f8f4e', { roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide });
  const r = rng(8);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + r(), up = 0.5 + r() * 0.7;
    const stem = new THREE.Group(); stem.position.set(0, 0.35, 0); stem.rotation.set(0, a, 0); g.add(stem);
    mesh(new THREE.SphereGeometry(0.12, 16, 10), leaf, stem, [0, up * 0.75, 0.18 + r() * 0.1], [0.5 + r() * 0.5, 0, 0], [0.55, 0.12, 1.3]);
  }
  return g;
}
function floorLamp(parent, pos, warm = '#ffcf8a') {
  const g = new THREE.Group(); g.position.set(...pos); parent.add(g);
  const metal = phys('#1f1f22', { metalness: 0.8, roughness: 0.3 });
  mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 32), metal, g, [0, 0.015, 0]);
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.55, 12), metal, g, [0, 0.8, 0]);
  const shadeM = phys('#f3e6cc', { roughness: 0.8, side: THREE.DoubleSide, transmission: 0.0, emissive: new THREE.Color(warm), emissiveIntensity: 0.6 });
  const shade = mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.3, 36, 1, true), shadeM, g, [0, 1.62, 0]);
  shade.castShadow = false;
  const light = new THREE.PointLight(warm, 2.2, 6, 1.6); light.position.set(0, 1.55, 0); g.add(light);
  return { g, light, shadeM };
}
function table(parent, pos) {
  const g = new THREE.Group(); g.position.set(...pos); parent.add(g);
  const wood = phys('#7a5232', { roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  mesh(RB(1.1, 0.05, 0.55, 0.02), wood, g, [0, 0.38, 0]);
  [[-0.48, -0.22], [0.48, -0.22], [-0.48, 0.22], [0.48, 0.22]].forEach(([x_, z]) => mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.36, 12), wood, g, [x_, 0.18, z]));
  // bol de patatas
  const bowl = phys('#e63946', { roughness: 0.25, clearcoat: 1, side: THREE.DoubleSide });
  mesh(new THREE.SphereGeometry(0.13, 32, 16, 0, TAU, Math.PI / 2, Math.PI / 2), bowl, g, [-0.28, 0.53, 0.02]);
  const chip = phys('#f2c14e', { roughness: 0.5 });
  const r = rng(21);
  for (let i = 0; i < 16; i++) mesh(new THREE.SphereGeometry(0.035, 12, 8), chip, g, [-0.28 + (r() - 0.5) * 0.16, 0.49 + r() * 0.06, 0.02 + (r() - 0.5) * 0.16], [r() * 3, r() * 3, r() * 3], [1, 0.25, 0.8]);
  // lata
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.13, 24), phys('#7a3cf0', { metalness: 0.7, roughness: 0.25 }), g, [0.38, 0.47, -0.1]);
  mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.012, 24), phys('#cfcfd6', { metalness: 0.9, roughness: 0.2 }), g, [0.38, 0.54, -0.1]);
  // mando de la tele
  mesh(RB(0.05, 0.018, 0.17, 0.008), std('#222'), g, [0.12, 0.415, 0.13], [0, 0.4, 0]);
  return g;
}

// ---------- móvil ----------
export function makePhone(screenTex, caseCol = '#7a3cf0') {
  const g = new THREE.Group();
  const body = phys(caseCol, { roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const black = phys('#050507', { roughness: 0.08, clearcoat: 1, metalness: 0.2 });
  mesh(RB(0.142, 0.29, 0.02, 0.022, 6), body, g, [0, 0, 0]);
  mesh(RB(0.134, 0.282, 0.004, 0.018, 4), black, g, [0, 0, 0.0095]);
  const scrM = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.124, 0.268), scrM);
  scr.position.set(0, 0, 0.0118); g.add(scr);
  // cámaras traseras
  mesh(RB(0.06, 0.06, 0.008, 0.012), black, g, [-0.035, 0.1, -0.012]);
  [[-0.05, 0.115], [-0.02, 0.115], [-0.05, 0.085]].forEach(([x_, y]) => mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 20), phys('#111', { metalness: 0.9, roughness: 0.1 }), g, [x_, y, -0.017], [Math.PI / 2, 0, 0]));
  g.userData = { scr, scrM };
  return g;
}

// ---------- salón de Leo ----------
export function livingRoom(assets) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#10141c');
  const S = { scene };
  const floor = mesh(new THREE.PlaneGeometry(16, 16), std('#ffffff', { map: tex(woodFloor(), { repeat: [4, 4] }), roughness: 0.45 }), scene, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  floor.castShadow = false;
  S.wallM = std('#ffffff', { map: tex(paint('#56677f', 0.05)), roughness: 0.95 });
  mesh(new THREE.PlaneGeometry(16, 7), S.wallM, scene, [0, 3.5, -1.25]);
  mesh(new THREE.BoxGeometry(16, 0.12, 0.03), std('#e8e2d6'), scene, [0, 0.06, -1.23]);
  // pared lateral izquierda (para planos de lado)
  mesh(new THREE.PlaneGeometry(10, 7), S.wallM, scene, [-3.2, 3.5, 2], [0, Math.PI / 2, 0]);

  S.sofa = sofa(scene, '#2f6650', [0, 0, -0.8]);
  pillow(scene, '#f2b134', [-1.0, 0.66, -0.88], [-0.15, 0.25, 0.22]);
  pillow(scene, '#e86a92', [1.02, 0.66, -0.88], [-0.15, -0.3, -0.18], 0.38);
  mesh(new THREE.CircleGeometry(1.7, 64), std('#ffffff', { map: tex(rugTex(['#d9c7a7', '#c9b28c', '#e7dcc6', '#b89e76'])), roughness: 0.95 }), scene, [0, 0.004, 0.3], [-Math.PI / 2, 0, 0]).castShadow = false;
  S.table = table(scene, [0, 0, 0.45]);
  S.plant = plant(scene, [-1.55, 0, -0.95], 1.15);
  S.lamp = floorLamp(scene, [1.6, 0, -0.95]);

  // ventana
  const win = new THREE.Group(); win.position.set(-0.55, 2.0, -1.24); scene.add(win);
  S.rain = rainWindow();
  S.glassM = new THREE.MeshBasicMaterial({ map: S.rain.tex, toneMapped: true });
  mesh(new THREE.PlaneGeometry(1.0, 1.25), S.glassM, win, [0, 0, 0.01]).castShadow = false;
  const frameM = phys('#f1ece2', { roughness: 0.5 });
  [[0, 0.65, 1.12, 0.06], [0, -0.65, 1.12, 0.06], [0.53, 0, 0.06, 1.36], [-0.53, 0, 0.06, 1.36], [0, 0, 0.035, 1.25], [0, 0.05, 1.0, 0.035]].forEach(([x_, y, w, h]) => mesh(RB(w, h, 0.06, 0.012), frameM, win, [x_, y, 0.03]));
  mesh(RB(1.25, 0.05, 0.16, 0.015), frameM, win, [0, -0.69, 0.07]);
  // cortinas
  const curtM = phys('#d9a441', { roughness: 0.9, sheen: 1, sheenColor: new THREE.Color('#ffe2a0') });
  [-1, 1].forEach(s => { for (let i = 0; i < 4; i++) mesh(new THREE.CapsuleGeometry(0.05, 1.45, 6, 12), curtM, win, [s * (0.62 + i * 0.07), -0.12, 0.12 + (i % 2) * 0.03]); });
  mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 10), phys('#222', { metalness: 0.8, roughness: 0.3 }), win, [0, 0.76, 0.14], [0, 0, Math.PI / 2]);
  // reloj
  const clock = new THREE.Group(); clock.position.set(0.78, 2.55, -1.22); scene.add(clock);
  mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 48), phys('#1b1b1d', { roughness: 0.4, clearcoat: 0.6 }), clock, [0, 0, 0.0], [Math.PI / 2, 0, 0]);
  mesh(new THREE.CircleGeometry(0.19, 48), new THREE.MeshStandardMaterial({ map: clockFace(), roughness: 0.6 }), clock, [0, 0, 0.022]).castShadow = false;
  const hand = (len, w, col) => { const p = new THREE.Group(); p.position.z = 0.028; clock.add(p); mesh(new THREE.BoxGeometry(w, len, 0.006), std(col), p, [0, len / 2 - 0.02, 0]); return p; };
  S.clockH = hand(0.1, 0.014, '#111'); S.clockM = hand(0.15, 0.01, '#111'); S.clockS = hand(0.16, 0.004, '#e63946');
  mesh(new THREE.SphereGeometry(0.012, 12, 8), std('#e63946'), clock, [0, 0, 0.034]);
  // cartel de neón de BidVerse (apagado al principio)
  const sign = new THREE.Group(); sign.position.set(0.8, 1.72, -1.21); scene.add(sign);
  mesh(RB(0.62, 0.62, 0.025, 0.03), phys('#0e0e12', { roughness: 0.25, clearcoat: 1, transparent: true, opacity: 0.9 }), sign, [0, 0, 0]);
  S.signM = new THREE.MeshBasicMaterial({ map: assets.icon, transparent: true, toneMapped: true, color: new THREE.Color(0.08, 0.08, 0.1) });
  mesh(new THREE.PlaneGeometry(0.54, 0.54), S.signM, sign, [0, 0.0, 0.016]).castShadow = false;
  S.signLight = new THREE.PointLight('#9b5cff', 0, 3.5, 1.5); S.signLight.position.set(0.8, 1.72, -0.9); scene.add(S.signLight);
  // póster
  const pst = new THREE.Group(); pst.position.set(-0.5, 3.05, -1.22); scene.add(pst);
  // tira LED detrás del sofá
  S.ledM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.05, 0.06), toneMapped: true });
  mesh(new THREE.BoxGeometry(2.6, 0.02, 0.02), S.ledM, scene, [0, 0.95, -1.2]).castShadow = false;
  S.led1 = new THREE.PointLight('#8a3cff', 0, 4, 1.3); S.led1.position.set(-0.9, 1.05, -1.05); scene.add(S.led1);
  S.led2 = new THREE.PointLight('#2f8cff', 0, 4, 1.3); S.led2.position.set(0.9, 1.05, -1.05); scene.add(S.led2);
  // estantería con libros
  const shelf = new THREE.Group(); shelf.position.set(1.25, 3.55, -1.12); scene.add(shelf);
  mesh(RB(0.9, 0.035, 0.22, 0.01), std('#e8e2d6'), shelf, [0, 0, 0]);
  const r = rng(31);
  let bx = -0.38;
  while (bx < 0.36) { const w = 0.035 + r() * 0.03, h = 0.18 + r() * 0.08; mesh(RB(w, h, 0.16, 0.006), std(['#e63946', '#f4a261', '#2a9d8f', '#264653', '#e9c46a', '#8d5bd6'][Math.floor(r() * 6)], { roughness: 0.6 }), shelf, [bx + w / 2, h / 2 + 0.02, 0], [0, 0, bx > 0.2 ? -0.25 : 0]); bx += w + 0.006; }

  // luces
  S.hemi = new THREE.HemisphereLight('#b9c9e6', '#3b2e24', 0.6); scene.add(S.hemi);
  S.key = new THREE.DirectionalLight('#dfe8ff', 1.6); S.key.position.set(-2.6, 4.2, 3.6); S.key.target.position.set(0, 0.8, -0.6);
  S.key.castShadow = true; S.key.shadow.mapSize.set(2048, 2048); S.key.shadow.bias = -0.0004; S.key.shadow.normalBias = 0.02; S.key.shadow.radius = 4;
  Object.assign(S.key.shadow.camera, { left: -3, right: 3, top: 3.5, bottom: -1.5, near: 0.5, far: 14 });
  scene.add(S.key, S.key.target);
  S.rim = new THREE.DirectionalLight('#7f9cff', 1.2); S.rim.position.set(-0.6, 3, -4); scene.add(S.rim);
  S.face = new THREE.PointLight('#bfa3ff', 0, 1.6, 1.4); scene.add(S.face); // brillo del móvil en la cara
  S.update = (t, mood) => {
    S.rain.draw(t, mood > 0.5 ? 1 : 0);
    const sec = 42 * 60 + 17 * 3600 + Math.floor(t) + (1 - Math.pow(1 - Math.min(1, (t % 1) * 8), 3));
    S.clockS.rotation.z = -(sec % 60) / 60 * TAU;
    S.clockM.rotation.z = -((sec / 60) % 60) / 60 * TAU;
    S.clockH.rotation.z = -((sec / 3600) % 12) / 12 * TAU;
  };
  return S;
}

// ---------- habitación de Dani ----------
export function bedroom(assets) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a1214');
  const S = { scene };
  const floor = mesh(new THREE.PlaneGeometry(16, 16), std('#ffffff', { map: tex(woodFloor(), { repeat: [5, 5] }), roughness: 0.5, color: '#d8c3b0' }), scene, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  floor.castShadow = false;
  S.wallM = std('#ffffff', { map: tex(paint('#c9705a', 0.05, 8)), roughness: 0.95 });
  mesh(new THREE.PlaneGeometry(16, 7), S.wallM, scene, [0, 3.5, -1.3]);
  mesh(new THREE.BoxGeometry(16, 0.12, 0.03), std('#f0e6da'), scene, [0, 0.06, -1.28]);
  // cama: el cabecero a la izquierda, la cama a lo largo del eje x
  const bed = new THREE.Group(); bed.position.set(0, 0, -0.5); scene.add(bed); S.bed = bed;
  const woodM = phys('#e9dcc7', { roughness: 0.6 });
  mesh(RB(2.2, 0.3, 1.25, 0.05), woodM, bed, [0, 0.2, 0]);
  mesh(RB(2.1, 0.2, 1.18, 0.09), phys('#fbf7f0', { roughness: 0.9, sheen: 0.6 }), bed, [0, 0.43, 0]);
  const duvet = phys('#3d6fd6', { roughness: 0.92, sheen: 1, sheenColor: new THREE.Color('#9db8ff'), map: tex(fabricTex('#ffffff', 4), { repeat: [3, 3] }) });
  mesh(RB(1.3, 0.1, 1.24, 0.05), duvet, bed, [0.45, 0.55, 0.0]);
  mesh(new THREE.CapsuleGeometry(0.09, 1.1, 8, 16), duvet, bed, [-0.18, 0.56, 0.05], [Math.PI / 2, 0, 0.05]); // pliegue del edredón
  mesh(RB(0.12, 1.0, 1.3, 0.05), woodM, bed, [-1.12, 0.6, 0]); // cabecero
  mesh(RB(0.32, 0.16, 0.62, 0.08), phys('#ffffff', { roughness: 0.85, sheen: 0.8 }), bed, [-0.82, 0.6, 0.0], [0, 0, -0.35]); // almohada
  pillow(bed, '#ffcf5a', [-0.9, 0.72, -0.4], [0.1, 0.4, -0.5], 0.34);
  // mesilla y lámpara
  const ns = new THREE.Group(); ns.position.set(-1.55, 0, -0.85); scene.add(ns);
  mesh(RB(0.45, 0.5, 0.4, 0.04), woodM, ns, [0, 0.25, 0]);
  mesh(new THREE.SphereGeometry(0.12, 24, 16), phys('#fff4dc', { emissive: new THREE.Color('#ffcf8a'), emissiveIntensity: 1.2, roughness: 0.4 }), ns, [0, 0.62, 0]).castShadow = false;
  const nl = new THREE.PointLight('#ffc27a', 1.6, 4, 1.5); nl.position.set(-1.55, 0.9, -0.7); scene.add(nl);
  // pósters
  const posters = [['retro', -0.2, 2.15, 0.06], ['wave', 0.8, 2.05, -0.05], ['dots', 1.65, 2.25, 0.04]];
  for (const [k, x_, y, rz] of posters) {
    const p = new THREE.Group(); p.position.set(x_, y, -1.28); p.rotation.z = rz; scene.add(p);
    mesh(new THREE.BoxGeometry(0.62, 0.84, 0.02), std('#111'), p, [0, 0, 0]);
    mesh(new THREE.PlaneGeometry(0.56, 0.78), new THREE.MeshStandardMaterial({ map: posterTex(k), roughness: 0.5 }), p, [0, 0, 0.012]).castShadow = false;
  }
  // guirnalda de luces
  S.fairy = [];
  const fairyM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.8), toneMapped: true });
  const wire = [];
  for (let i = 0; i <= 26; i++) {
    const u = i / 26, x_ = -1.9 + u * 4.2, y = 2.95 - Math.sin(u * Math.PI) * 0.32 - Math.sin(u * Math.PI * 3) * 0.04;
    wire.push(new THREE.Vector3(x_, y, -1.24));
    if (i % 2 === 0) S.fairy.push(mesh(new THREE.SphereGeometry(0.022, 12, 8), fairyM, scene, [x_, y - 0.03, -1.22]));
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wire), 80, 0.004, 6), std('#222'), scene);
  // luces
  S.hemi = new THREE.HemisphereLight('#ffd9c2', '#3a2620', 0.55); scene.add(S.hemi);
  S.key = new THREE.DirectionalLight('#ffe8d6', 1.5); S.key.position.set(2.5, 4.5, 3.5); S.key.target.position.set(0, 0.6, -0.5);
  S.key.castShadow = true; S.key.shadow.mapSize.set(2048, 2048); S.key.shadow.bias = -0.0004; S.key.shadow.normalBias = 0.02; S.key.shadow.radius = 4;
  Object.assign(S.key.shadow.camera, { left: -3, right: 3, top: 3.5, bottom: -1.5, near: 0.5, far: 14 });
  scene.add(S.key, S.key.target);
  S.rim = new THREE.DirectionalLight('#9fb8ff', 0.9); S.rim.position.set(1, 3, -4); scene.add(S.rim);
  S.led = new THREE.PointLight('#ff4fa0', 0, 4, 1.3); S.led.position.set(0.3, 1.7, -1.2); scene.add(S.led);
  S.face = new THREE.PointLight('#bfa3ff', 0, 1.6, 1.4); scene.add(S.face);
  S.update = () => {};
  return S;
}

// ---------- plató final ----------
export function studio(assets) {
  const scene = new THREE.Scene();
  const S = { scene };
  const [c, x] = cv(64, 1024);
  const g = x.createLinearGradient(0, 0, 0, 1024);
  g.addColorStop(0, '#1b0b3d'); g.addColorStop(0.45, '#5a22c9'); g.addColorStop(0.75, '#7b3cf0'); g.addColorStop(1, '#2a7bff');
  x.fillStyle = g; x.fillRect(0, 0, 64, 1024);
  const bgTex = tex(c);
  scene.background = bgTex;
  // ciclorama: suelo + fondo curvo
  const cyc = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 9, 64, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshStandardMaterial({ map: bgTex, side: THREE.BackSide, roughness: 0.9, emissive: new THREE.Color('#2a0f66'), emissiveIntensity: 0.6 }));
  cyc.position.set(0, 4.4, 1.5); cyc.receiveShadow = true; scene.add(cyc);
  const fl = mesh(new THREE.CircleGeometry(7, 64), phys('#3a1f86', { roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 }), scene, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  fl.castShadow = false;
  // pedestal redondo
  mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.16, 64), phys('#16102b', { roughness: 0.3, clearcoat: 1 }), scene, [0, 0.08, 0]);
  S.ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.9, 4.0), toneMapped: true });
  mesh(new THREE.TorusGeometry(1.56, 0.015, 8, 128), S.ringM, scene, [0, 0.16, 0], [Math.PI / 2, 0, 0]).castShadow = false;
  S.hemi = new THREE.HemisphereLight('#c9b6ff', '#2a1660', 0.9); scene.add(S.hemi);
  S.key = new THREE.DirectionalLight('#ffffff', 2.2); S.key.position.set(2, 5, 4); S.key.target.position.set(0, 0.8, 0);
  S.key.castShadow = true; S.key.shadow.mapSize.set(2048, 2048); S.key.shadow.bias = -0.0004; S.key.shadow.normalBias = 0.02; S.key.shadow.radius = 5;
  Object.assign(S.key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -1, near: 0.5, far: 14 });
  scene.add(S.key, S.key.target);
  const fill = new THREE.DirectionalLight('#ffe6f0', 0.9); fill.position.set(-1.5, 2, 5); scene.add(fill);
  const r1 = new THREE.PointLight('#ff3d7f', 6, 6, 1.4); r1.position.set(-2, 1.8, -1); scene.add(r1);
  const r2 = new THREE.PointLight('#2f8cff', 6, 6, 1.4); r2.position.set(2, 1.8, -1); scene.add(r2);
  S.update = () => {};
  return S;
}
