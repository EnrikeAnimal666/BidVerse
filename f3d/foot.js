/* BidVerse 3D · PARTIDO DE FÚTBOL (window.FOOT3D)
   Estadio de noche con focos, grada animada, 22 futbolistas 3D articulados (carrera, pase, tiro, regate, entrada, cabezazo,
   estirada del portero, celebraciones), balón con física sencilla, árbitro y cámara de retransmisión.
   El guion (quién pasa, a quién regatea, quién remata y qué pasa) lo pone el motor (engine.js · resolveFutbol); game.js lo va leyendo
   y llama aquí a cada jugada, esperando a que termine. Solo decora: no cambia ningún resultado. Sin WebGL2, game.js usa el campo 2D.
   Coordenadas: x a lo largo del campo (−52,5 … 52,5), z a lo ancho (−34 … 34), y hacia arriba. El jugador 1 (p = 0) ataca hacia +x.
   Cada equipo sale con su formación (game.js manda u, v y la línea de cada hueco). Tras cada gol hay repetición desde otro ángulo:
   se graban los últimos segundos (posiciones, poses, balón y redes) y se vuelven a ver con otras cámaras y a cámara lenta. */
import * as THREE from 'three';

const V3 = THREE.Vector3, TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, rr = (a, b) => a + Math.random() * (b - a);
const sm = t => t * t * (3 - 2 * t), sgn = v => v < 0 ? -1 : 1;
const kf = (u, K) => { if (u <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (u <= K[i][0]) { const [t0, a] = K[i - 1], [t1, b] = K[i]; return a + (b - a) * sm((u - t0) / ((t1 - t0) || 1)); } return K[K.length - 1][1]; };
const L = 52.5, WD = 34, GW = 3.66, GH = 2.44, NET = 1.9, BR = .11;
const D = p => p ? -1 : 1;                                     // hacia dónde ataca cada equipo
const F433 = [[.03, 0], [.22, -.68], [.17, -.24], [.17, .24], [.22, .68], [.42, -.36], [.33, 0], [.42, .36], [.62, -.7], [.66, 0], [.62, .7]]; // [u, v] si no llega la formación: u 0 = su portería … 1 = la rival · v −1 izquierda … 1 derecha
const wpt = (p, u, v) => ({ x: (u * 2 - 1) * L * D(p), z: v * WD * D(p) });
const uOf = (p, x) => (x * D(p) / L + 1) / 2, vOf = (p, z) => z * D(p) / WD;

let SUP = null, failed = false, R = null, scene = null, cam = null, cv = null, host = null, tagEl = null, fadeEl = null, ro = null, G = null;
let on = false, gen = 0, last = 0, W = 0, H = 0, PR = 1, T = 0, SPEED = 1.38, lagT = 0, opts = {}, poss = 0, hype = 0, low = false, sizeT = 0;
const P = [[], []], WAITS = [], NETS = [], KIT = [null, null], TM = [null, null]; // TM[p] = quién es quién en su formación (delantero centro, medio centro, centrales…)
let ball = null, refP = null, crowdU = null, boards = null, focus = null;
const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = s => new Promise(r => WAITS.push({ t: T + s, r }));
const until = async (f, max = 4) => { const t0 = T; while (on && !f() && T - t0 < max) await sleep(1 / 30); };
const sfx = k => { try { if (opts.sfx) opts.sfx(k); } catch (e) { /* nada */ } };

/* ---------------- texturas ---------------- */
const canvasTex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } t.anisotropy = 8; return t; };
function pitchTex() { // 113 × 76 m (campo + 4 m de margen), césped a franjas y líneas reglamentarias
  const MX = 4, MW = 105 + 2 * MX, MH = 68 + 2 * MX, S = low ? 12 : 18;
  return canvasTex(MW * S, MH * S, (g, w, h) => {
    g.fillStyle = '#25722f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) { g.fillStyle = i % 2 ? '#2d8a38' : '#287d33'; g.fillRect((MX + i * 105 / 18) * S, MX * S, 105 / 18 * S + 1, 68 * S); }
    const id = g.getImageData(0, 0, w, h), d = id.data; for (let k = 0; k < d.length; k += 4) { const n = (Math.random() - .5) * 14; d[k] += n; d[k + 1] += n * 1.3; d[k + 2] += n * .6; } g.putImageData(id, 0, 0);
    const X = m => (MX + m) * S, Y = m => (MX + m) * S;
    g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = .13 * S; g.fillStyle = 'rgba(255,255,255,.95)';
    const rect = (x, y, ww, hh) => g.strokeRect(X(x), Y(y), ww * S, hh * S);
    rect(0, 0, 105, 68); g.beginPath(); g.moveTo(X(52.5), Y(0)); g.lineTo(X(52.5), Y(68)); g.stroke();
    g.beginPath(); g.arc(X(52.5), Y(34), 9.15 * S, 0, TAU); g.stroke();
    for (const s of [0, 1]) { const x0 = s ? 105 - 16.5 : 0, x1 = s ? 105 - 5.5 : 0;
      rect(x0, 34 - 20.16, 16.5, 40.32); rect(x1, 34 - 9.16, 5.5, 18.32);
      const px = s ? 105 - 11 : 11; g.beginPath(); g.arc(X(px), Y(34), .22 * S, 0, TAU); g.fill();
      const a = Math.acos(5.5 / 9.15); g.beginPath(); if (s) g.arc(X(px), Y(34), 9.15 * S, Math.PI - a, Math.PI + a); else g.arc(X(px), Y(34), 9.15 * S, -a, a); g.stroke(); }
    g.beginPath(); g.arc(X(52.5), Y(34), .25 * S, 0, TAU); g.fill();
    for (const [cx, cy, a0] of [[0, 0, 0], [105, 0, Math.PI / 2], [105, 68, Math.PI], [0, 68, -Math.PI / 2]]) { g.beginPath(); g.arc(X(cx), Y(cy), 1 * S, a0, a0 + Math.PI / 2); g.stroke(); }
  });
}
const netTex = () => canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 16); g.lineTo(w, i * 16); g.stroke(); } }, true);
const ballTex = () => canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#16161a';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const x = (c + (r % 2) * .5) * w / 8, y = (r + .5) * h / 4, s = 11 - Math.abs(r - 1.5) * 2; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU - Math.PI / 2; g.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); } g.fill(); } });
const numTex = (n, col, ink) => canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = '900 46px Impact,"Arial Black",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = col; g.strokeText(n, 32, 34); g.fillStyle = ink; g.fillText(n, 32, 34); });
const boardTex = cols => canvasTex(1024, 64, (g, w, h) => { const seg = ['BIDVERSE', '⚽', 'FC 27', '★', 'BIDVERSE', '⚽', 'MATCH DAY', '★'];
  let x = 0; g.fillStyle = '#05060a'; g.fillRect(0, 0, w, h); g.font = '900 40px Impact,"Arial Black",sans-serif'; g.textBaseline = 'middle';
  seg.forEach((s, i) => { const ww = g.measureText(s).width + 50; g.fillStyle = i % 2 ? '#ffd23f' : cols[(i / 2 | 0) % 2]; g.fillText(s, x + 25, 34); x += ww; }); }, true);

/* ---------------- estadio ---------------- */
function readCol(k, def) { try { const v = getComputedStyle(document.body).getPropertyValue(k).trim(); if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v; } catch (e) { /* nada */ } return def; }
function buildStadium(cols) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec3 vP;void main(){float y=normalize(vP).y;vec3 c=mix(vec3(.09,.12,.2),vec3(.012,.02,.05),smoothstep(-.05,.5,y));gl_FragColor=vec4(c,1.0);}' }));
  scene.add(sky);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), new THREE.MeshStandardMaterial({ color: '#173d1d', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.02; ground.receiveShadow = true; scene.add(ground);
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(113, 76), new THREE.MeshStandardMaterial({ map: pitchTex(), roughness: .95 })); pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true; scene.add(pitch);
  // porterías: palos, larguero y red (la del fondo se abomba con los goles)
  const postM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .35 }), nt = netTex(), netM = new THREE.MeshBasicMaterial({ map: nt, transparent: true, alphaTest: .25, side: THREE.DoubleSide, color: '#e8eef5', depthWrite: false });
  for (const s of [1, -1]) {
    const g = new THREE.Group(); g.position.x = s * L; scene.add(g);
    for (const z of [-GW, GW]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, GH, 10), postM); m.position.set(0, GH / 2, z); m.castShadow = true; g.add(m); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, GW * 2 + .12, 10), postM); bar.rotation.x = Math.PI / 2; bar.position.y = GH; bar.castShadow = true; g.add(bar);
    for (const z of [-GW, GW]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, Math.hypot(NET, GH - 1.6), 6), postM); m.position.set(s * NET / 2, (GH + 1.6) / 2 + .02, z); m.rotation.z = s * Math.atan2(NET, GH - 1.6); g.add(m); }
    const back = new THREE.PlaneGeometry(GW * 2, 1.6, 18, 6), bm = new THREE.Mesh(back, netM); bm.rotation.y = Math.PI / 2; bm.position.set(s * NET, .8, 0); g.add(bm);
    nt.repeat.set(6, 2);
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(NET, GH - 1.6), GW * 2), netM); roof.rotation.set(-Math.PI / 2, 0, 0); roof.rotation.y = -s * Math.atan2(GH - 1.6, NET); roof.position.set(s * NET / 2, (GH + 1.6) / 2, 0); g.add(roof);
    for (const z of [-GW, GW]) { const sg = new THREE.BufferGeometry(), v = new Float32Array([0, 0, z, s * NET, 0, z, s * NET, 1.6, z, 0, 0, z, s * NET, 1.6, z, 0, GH, z]), uv = new Float32Array([0, 0, 1, 0, 1, .7, 0, 0, 1, .7, 0, 1]);
      sg.setAttribute('position', new THREE.BufferAttribute(v, 3)); sg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.add(new THREE.Mesh(sg, netM)); }
    NETS.push({ s, geo: back, base: back.attributes.position.array.slice(), a: 0, z: 0, y: 1 });
  }
  // banderines de córner
  const flagM = new THREE.MeshBasicMaterial({ color: '#ffd23f', side: THREE.DoubleSide });
  for (const x of [-L, L]) for (const z of [-WD, WD]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.5, 5), postM); pole.position.set(x, .75, z); scene.add(pole); const f = new THREE.Mesh(new THREE.PlaneGeometry(.35, .25), flagM); f.position.set(x, 1.38, z + .17 * sgn(-z)); scene.add(f); }
  // vallas de publicidad (LED que se desplaza)
  const bt = boardTex(cols); bt.repeat.set(6, 1); boards = bt;
  const bm = new THREE.MeshBasicMaterial({ map: bt }), bgeo = (len) => new THREE.BoxGeometry(len, .9, .15);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(bgeo(118), bm); b.position.set(0, .45, s * (WD + 4.5)); scene.add(b); const e = new THREE.Mesh(bgeo(78), bm); e.rotation.y = Math.PI / 2; e.position.set(s * (L + 5), .45, 0); scene.add(e); }
  // gradas con público (instancias; botan con los goles)
  const fan = new THREE.BoxGeometry(.44, .95, .3); fan.translate(0, .48, 0);
  const pos = [], colA = [], step = low ? 1.05 : .78, cA = new THREE.Color(cols[0]), cB = new THREE.Color(cols[1]), tc = new THREE.Color();
  const tier = (n, row0, f) => { for (let r = 0; r < row0; r++) for (let k = 0; k < n; k++) if (Math.random() > .07) { const o = f(r, k); pos.push(o); } };
  const nx = Math.floor(118 / step), nz = Math.floor(78 / step);
  for (const s of [-1, 1]) tier(nx, s < 0 ? 30 : 22, (r, k) => ({ x: -59 + k * step + rr(-.1, .1), y: 1.3 + r * .62, z: s * (WD + (s < 0 ? 9 : 16) + r * .9), ry: s < 0 ? 0 : Math.PI }));
  for (const s of [-1, 1]) tier(nz, 26, (r, k) => ({ x: s * (L + 10 + r * .9), y: 1.3 + r * .62, z: -39 + k * step + rr(-.1, .1), ry: s * -Math.PI / 2 }));
  const im = new THREE.InstancedMesh(fan, new THREE.MeshLambertMaterial({ color: '#ffffff' }), pos.length), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), ph = new Float32Array(pos.length);
  pos.forEach((o, i) => { q.setFromAxisAngle(new V3(0, 1, 0), o.ry); sc.set(1, rr(.85, 1.1), 1); mtx.compose(new V3(o.x, o.y, o.z), q, sc); im.setMatrixAt(i, mtx);
    const r = Math.random(), home = o.x < 0 ? cA : cB; tc.copy(r < .62 ? home : r < .8 ? (o.x < 0 ? cB : cA) : r < .9 ? tc.set('#f0f0f0') : tc.set('#22252c'));
    tc.multiplyScalar(rr(.55, 1)); im.setColorAt(i, tc); ph[i] = rr(0, TAU); });
  im.geometry.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1));
  crowdU = { uT: { value: 0 }, uH: { value: 0 } };
  im.material.onBeforeCompile = sh => { sh.uniforms.uT = crowdU.uT; sh.uniforms.uH = crowdU.uH;
    sh.vertexShader = 'attribute float aPh;\nuniform float uT;\nuniform float uH;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += max(0.0, sin(uT * (3.0 + uH * 9.0) + aPh)) * (0.04 + uH * 0.5);'); };
  im.frustumCulled = false; scene.add(im);
  if (!low) { const hg = new THREE.IcosahedronGeometry(.15, 0); hg.translate(0, 1.08, 0); const hm = new THREE.InstancedMesh(hg, im.material, pos.length), SK = ['#f1c9a5', '#d9a27e', '#b97f5a', '#8d5a3b', '#5e3a26'].map(c => new THREE.Color(c));
    for (let i = 0; i < pos.length; i++) { im.getMatrixAt(i, mtx); hm.setMatrixAt(i, mtx); hm.setColorAt(i, tc.copy(SK[i % 5]).multiplyScalar(rr(.6, .9))); }
    hm.geometry.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1)); hm.frustumCulled = false; scene.add(hm); }
  // estructura: gradas de hormigón, techo y torres de focos
  const conc = new THREE.MeshStandardMaterial({ color: '#1b1f28', roughness: 1 }), roofM = new THREE.MeshStandardMaterial({ color: '#0d1016', roughness: .9 }), litM = new THREE.MeshBasicMaterial({ color: '#fff6dc' });
  const slab = (w, d, x, y, z, rx, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), conc); m.rotation.set(rx, ry, 0, 'YXZ'); m.position.set(x, y, z); scene.add(m); };
  const ang = Math.atan2(.62, .9);
  slab(124, 34, 0, 10, -(WD + 9 + 14), -Math.PI / 2 + ang, 0); slab(124, 26, 0, 8, WD + 16 + 11, -Math.PI / 2 + ang, Math.PI);
  slab(84, 30, -(L + 10 + 12), 9, 0, -Math.PI / 2 + ang, -Math.PI / 2); slab(84, 30, L + 10 + 12, 9, 0, -Math.PI / 2 + ang, Math.PI / 2);
  for (const [w, d, x, z, ry] of [[130, 16, 0, -(WD + 30), 0], [96, 14, -(L + 30), 0, Math.PI / 2], [96, 14, L + 30, 0, Math.PI / 2]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, .6, d), roofM); r.position.set(x, 23, z); r.rotation.y = ry; scene.add(r);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w * .96, .12, .4), litM); strip.position.set(x + (ry ? sgn(-x) * d / 2 : 0), 22.6, z + (ry ? 0 : d / 2)); strip.rotation.y = ry; scene.add(strip); }
  const glowT = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(.25, 'rgba(255,240,200,.55)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const tx = x * (L + 22), tz = z * (WD + 24), pole = new THREE.Mesh(new THREE.CylinderGeometry(.5, .8, 38, 8), roofM); pole.position.set(tx, 19, tz); scene.add(pole);
    const pan = new THREE.Mesh(new THREE.BoxGeometry(8, 4, .6), litM); pan.position.set(tx, 38, tz); pan.lookAt(0, 0, 0); scene.add(pan);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); gl.scale.setScalar(34); gl.position.set(tx, 38, tz); scene.add(gl); }
  // luces: cielo, focos (con sombras) y relleno
  scene.add(new THREE.HemisphereLight('#c9d8ff', '#24502a', .75));
  const key = new THREE.DirectionalLight('#fff7e8', 2.3); key.position.set(-28, 70, 34); key.castShadow = !low;
  key.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048); const sc2 = key.shadow.camera; sc2.left = -64; sc2.right = 64; sc2.top = 44; sc2.bottom = -44; sc2.near = 20; sc2.far = 170; key.shadow.bias = -.0004; key.shadow.normalBias = .03; scene.add(key);
  const fill = new THREE.DirectionalLight('#bcd0ff', .65); fill.position.set(34, 50, -30); scene.add(fill);
  scene.fog = new THREE.Fog('#0e1524', 120, 330);
}

/* ---------------- futbolistas ---------------- */
function geos() {
  const cap = (r, l, y) => { const g = new THREE.CapsuleGeometry(r, l, 4, 10); g.translate(0, y, 0); return g; };
  G = {
    torso: (() => { const g = new THREE.CapsuleGeometry(.155, .28, 4, 12); g.scale(1.22, 1, .78); g.translate(0, .27, 0); return g; })(),
    shorts: (() => { const g = new THREE.CylinderGeometry(.185, .17, .26, 12); g.translate(0, -.05, 0); return g; })(),
    thigh: cap(.078, .3, -.2), shin: cap(.057, .31, -.21),
    boot: (() => { const g = new THREE.BoxGeometry(.1, .075, .27); g.translate(0, -.005, .055); return g; })(),
    uarm: cap(.053, .17, -.13), farm: cap(.043, .19, -.13), hand: new THREE.SphereGeometry(.047, 8, 6),
    neck: (() => { const g = new THREE.CylinderGeometry(.052, .058, .12, 8); g.translate(0, .05, 0); return g; })(),
    head: (() => { const g = new THREE.SphereGeometry(.112, 16, 12); g.scale(.9, 1.07, .98); g.translate(0, .08, .005); return g; })(),
    hair: (() => { const g = new THREE.SphereGeometry(.118, 16, 10, 0, TAU, 0, Math.PI * .5); g.scale(.93, 1.0, 1.03); g.translate(0, .1, -.012); return g; })(),
    eye: new THREE.SphereGeometry(.013, 6, 4), num: new THREE.PlaneGeometry(.21, .21), card: new THREE.PlaneGeometry(.09, .12),
  };
}
const MATS = new Map();
const std = (c, o) => { const k = c + JSON.stringify(o || {}); if (!MATS.has(k)) MATS.set(k, new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .72 }, o || {}))); return MATS.get(k); };
const lum = c => { const x = new THREE.Color(c); return .3 * x.r + .59 * x.g + .11 * x.b; };
const GKC = ['#2fd27a', '#ff4fa3', '#b06cff', '#e8e8e8', '#ffd23f', '#1fd6e0'];
const cdist = (a, b) => { const x = new THREE.Color(a), y = new THREE.Color(b); return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b); };
function gkCols(cols) { // los dos porteros: lo más distinto posible de las dos camisetas (y entre ellos)
  const sc = c => Math.min(cdist(c, cols[0]), cdist(c, cols[1])), a = GKC.slice().sort((x, y) => sc(y) - sc(x)), b = a.find(c => c !== a[0] && cdist(c, a[0]) > .5) || a[1];
  return [a[0], b];
}
function kitOf(p, cols, gc) { // camiseta del color del jugador; porteros de otro color
  const c = cols[p], dark = lum(c) < .45, g = gc[p];
  return { shirt: std(c), shorts: std(p ? '#151a24' : '#f2f2f2'), socks: std(c), boot: std('#101114', { roughness: .4 }), ink: dark ? '#ffffff' : '#0a0a0b', col: c,
    gk: { shirt: std(g), shorts: std('#101114'), socks: std(g), glove: std('#f5f5f5'), ink: lum(g) < .45 ? '#ffffff' : '#0a0a0b', col: g } };
}
function mkBody(kit, look, number, gk) {
  const root = new THREE.Group(), body = new THREE.Group(), pelvis = new THREE.Group(), spine = new THREE.Group(), neck = new THREE.Group(), head = new THREE.Group();
  root.add(body); body.add(pelvis); pelvis.position.y = .95; pelvis.add(spine); spine.position.y = .02;
  const skin = std(look.skin, { roughness: .62 }), hair = std(look.hair, { roughness: .85 }), K = gk ? kit.gk : kit;
  const mesh = (g, m, par, cast = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; par.add(o); return o; };
  mesh(G.shorts, K.shorts, pelvis); mesh(G.torso, K.shirt, spine);
  if (number) { const n = new THREE.Mesh(G.num, new THREE.MeshBasicMaterial({ map: numTex(number, K.col, K.ink), transparent: true, depthWrite: false })); n.position.set(0, .31, -.127); n.rotation.y = Math.PI; spine.add(n); }
  spine.add(neck); neck.position.y = .5; mesh(G.neck, skin, neck, false); neck.add(head); head.position.y = .1; mesh(G.head, skin, head); if (look.hair !== 'none') mesh(G.hair, hair, head, false);
  const eyeM = std('#15100c'); for (const s of [-1, 1]) { const e = mesh(G.eye, eyeM, head, false); e.position.set(s * .036, .095, .1); }
  const arm = s => { const sh = new THREE.Group(); sh.position.set(.215 * s, .45, 0); spine.add(sh); mesh(G.uarm, K.shirt, sh); const el = new THREE.Group(); el.position.y = -.26; sh.add(el); mesh(G.farm, gk ? K.shirt : skin, el, false); const h = mesh(G.hand, gk ? K.glove : skin, el, false); h.position.y = -.27; return { sh, el, h }; };
  const leg = s => { const hp = new THREE.Group(); hp.position.set(.098 * s, -.05, 0); pelvis.add(hp); mesh(G.thigh, skin, hp); const kn = new THREE.Group(); kn.position.y = -.42; hp.add(kn); mesh(G.shin, K.socks, kn); const an = new THREE.Group(); an.position.y = -.43; kn.add(an); mesh(G.boot, kit.boot, an); return { hp, kn, an }; };
  return { root, body, pelvis, spine, neck, head, aL: arm(1), aR: arm(-1), lL: leg(1), lR: leg(-1) };
}
// tono de piel y de pelo sacados de la foto del jugador (si la hay); si no, uno neutro
const LOOK0 = { skin: '#c99a78', hair: '#2a1d16' };
function lookFromImg(url, cb) {
  if (!url) return; const im = new Image(); im.crossOrigin = 'anonymous';
  im.onload = () => { try {
    const c = document.createElement('canvas'), S = 48; c.width = c.height = S; const g = c.getContext('2d'); g.drawImage(im, 0, 0, S, S); const d = g.getImageData(0, 0, S, S).data;
    const px = (x0, x1, y0, y1, f) => { const out = []; for (let y = y0 * S | 0; y < y1 * S; y++) for (let x = x0 * S | 0; x < x1 * S; x++) { const k = (y * S + x) * 4, r = d[k], gg = d[k + 1], b = d[k + 2]; if (f(r, gg, b)) out.push([r, gg, b]); } return out; };
    const med = a => { const m = [0, 1, 2].map(i => a.map(v => v[i]).sort((x, y) => x - y)[a.length >> 1]); return '#' + m.map(v => v.toString(16).padStart(2, '0')).join(''); };
    const sk = px(.36, .64, .18, .42, (r, g2, b) => r > 45 && r > g2 && g2 >= b * .9 && r - b > 12 && r < 250);
    const hr = px(.32, .68, .02, .16, (r, g2, b) => r + g2 + b < 330 && Math.abs(r - b) < 70);
    cb({ skin: sk.length > 25 ? med(sk) : LOOK0.skin, hair: hr.length > 12 ? med(hr) : LOOK0.hair });
  } catch (e) { /* imagen sin CORS: se queda el tono neutro */ } };
  im.src = url;
}
function setLook(pl, look) { const sk = std(look.skin, { roughness: .62 }), hr = std(look.hair, { roughness: .85 });
  pl.head.children.forEach(m => { if (m.geometry === G.head) m.material = sk; else if (m.geometry === G.hair) m.material = hr; });
  pl.neck.children.forEach(m => { if (m.geometry === G.neck) m.material = sk; });
  for (const a of [pl.aL, pl.aR]) a.el.children.forEach(m => { if (!pl.gk) m.material = sk; });
  for (const l of [pl.lL, pl.lR]) l.hp.children.forEach(m => { if (m.geometry === G.thigh) m.material = sk; }); }
function mkPlayer(p, i, info) {
  const gk = i === 0, b = mkBody(KIT[p], LOOK0, String(info.num || ''), gk);
  b.root.traverse(o => { if (o.isMesh) o.receiveShadow = false; });
  scene.add(b.root);
  const uv = info.u != null && info.v != null ? [info.u, info.v] : F433[i] || [.4, 0];
  const pl = Object.assign(b, { p, i, info, gk, x: 0, z: 0, vx: 0, vz: 0, yaw: 0, yv: 0, lean: 0, acc: 0, ph: rr(0, TAU), home: { x: 0, z: 0 }, pin: null, urg: .6, act: null, faceT: null, mv: null, press: false, line: null,
    fu: uv[0], fv: uv[1], ln: gk ? -1 : info.ln != null ? info.ln : i <= 4 ? 0 : i <= 7 ? 1 : 2, jr: new Float32Array(22),
    spd: 5.4 + clamp((info.pac || 70) - 50, 0, 50) / 50 * 3.6 });
  if (info.img) lookFromImg(info.img, lk => { if (P[p][i] === pl) setLook(pl, lk); });
  return pl;
}
function mkRef() {
  const k = { shirt: std('#111216'), shorts: std('#111216'), socks: std('#111216'), boot: std('#101114'), col: '#111', ink: '#fff' };
  const b = mkBody(k, { skin: '#c49372', hair: '#1c1612' }, '', false); scene.add(b.root);
  const card = new THREE.Mesh(G.card, new THREE.MeshBasicMaterial({ color: '#ffd23f', side: THREE.DoubleSide })); card.position.set(0, -.33, .02); card.visible = false; b.aR.el.add(card);
  return Object.assign(b, { p: -1, i: -1, info: {}, gk: false, x: 0, z: WD - 10, vx: 0, vz: 0, yaw: 0, yv: 0, lean: 0, acc: 0, ph: 0, home: { x: 0, z: 0 }, pin: null, urg: .7, act: null, faceT: null, mv: null, line: null, fu: .5, fv: 0, ln: -1, jr: new Float32Array(22), spd: 7.2, card });
}

// quién es quién en cada formación: delantero centro, su pareja, medio centro, centrales, medios y delanteros
function teamIdx(T) {
  const out = T.filter(q => !q.gk), by = l => out.filter(q => q.ln === l), fw = by(2), md = by(1), df = by(0);
  const st = fw.slice().sort((a, b) => Math.abs(a.fv) - Math.abs(b.fv))[0] || out.slice().sort((a, b) => b.fu - a.fu)[0];
  const pa = fw.filter(q => q !== st).sort((a, b) => Math.abs(a.fv) - Math.abs(b.fv))[0] || out.filter(q => q !== st).sort((a, b) => b.fu - a.fu)[0];
  const c0 = md.slice().sort((a, b) => Math.abs(a.fv) + a.fu - Math.abs(b.fv) - b.fu)[0] || out[0];
  const cb = df.filter(q => q.info.pos ? q.info.pos === 'CB' : Math.abs(q.fv) < .45); if (!cb.length) cb.push(...df.slice(0, 2));
  return { st, pa, c0, cb, md: md.length ? md : out, fw: fw.length ? fw : [st], df, am: md.slice().sort((a, b) => b.fu - a.fu)[0] || st };
}
const pickOf = a => a[Math.random() * a.length | 0];

/* ---------------- animación (poses por articulación) ---------------- */
const JK = ['bx', 'bz', 'by', 'py', 'sx', 'sy', 'sz', 'nx', 'lsx', 'lsz', 'lex', 'rsx', 'rsz', 'rex', 'lhx', 'lhz', 'lkx', 'lax', 'rhx', 'rhz', 'rkx', 'rax'];
const J = {}; JK.forEach(k => { J[k] = 0; });
const ACTS = {
  kick(u, o, X) { const k = o.k == null ? .5 : o.k;
    X.rhx = kf(u, [[0, 0], [.38, .45 + .45 * k], [.5, -.5 - .6 * k], [.72, -.75 - .7 * k], [1, -.1]]); X.rkx = kf(u, [[0, .15], [.38, .9 + .7 * k], [.5, .2], [.72, .12], [1, .1]]);
    X.lhx = kf(u, [[0, 0], [.4, -.3], [.6, -.15], [1, 0]]); X.lkx = kf(u, [[0, .15], [.45, .4], [1, .12]]);
    X.sx = kf(u, [[0, .08], [.38, -.1], [.55, .12 + .15 * k], [1, .06]]); X.sy = kf(u, [[0, 0], [.38, -.25 * k], [.55, .2 * k], [1, 0]]);
    X.lsz = kf(u, [[0, .15], [.45, .45 + .55 * k], [1, .15]]); X.rsz = -kf(u, [[0, .15], [.45, .3 + .4 * k], [1, .15]]);
    X.lsx = kf(u, [[0, 0], [.5, -.55 * k], [1, 0]]); X.rsx = kf(u, [[0, 0], [.5, .45 * k], [1, 0]]); X.lex = -.35; X.rex = -.35; X.by = kf(u, [[0, 0], [.52, .06 * k], [.7, 0], [1, 0]]); },
  header(u, o, X) { X.by = kf(u, [[0, 0], [.2, -.08], [.45, .52], [.75, .02], [.85, -.04], [1, 0]]);
    X.lhx = kf(u, [[0, 0], [.2, -.4], [.45, -.2], [.8, -.1], [1, 0]]); X.rhx = kf(u, [[0, 0], [.2, -.1], [.45, .25], [.8, -.05], [1, 0]]);
    X.lkx = kf(u, [[0, .2], [.2, 1], [.45, .5], [.8, .4], [1, .1]]); X.rkx = kf(u, [[0, .2], [.2, .9], [.45, 1.1], [.8, .4], [1, .1]]);
    X.sx = kf(u, [[0, .05], [.35, -.35], [.5, .5], [.7, .15], [1, .05]]); X.nx = kf(u, [[0, 0], [.35, -.3], [.5, .45], [1, 0]]);
    X.lsz = kf(u, [[0, .2], [.3, 1.1], [.7, .9], [1, .15]]); X.rsz = -X.lsz; X.lsx = kf(u, [[0, 0], [.3, -.6], [1, 0]]); X.rsx = X.lsx; X.lex = -.6; X.rex = -.6; },
  dive(u, o, X) { const s = o.s, h = o.h;
    X.bz = -s * kf(u, [[0, 0], [.1, .1], [.32, .9 + .45 * (1 - h)], [.45, 1.35], [.72, 1.45], [.86, .5], [1, 0]]);
    X.by = kf(u, [[0, 0], [.1, -.12], [.3, .25 + .6 * h], [.45, .14], [.72, .03], [1, 0]]);
    X.lsz = kf(u, [[0, .4], [.12, .8], [.3, 2.75], [.72, 2.6], [.88, .6], [1, .2]]); X.rsz = -X.lsz;
    X.lsx = kf(u, [[0, -.3], [.3, -.2], [.72, -.3], [1, 0]]); X.rsx = X.lsx; X.lex = -.15; X.rex = -.15;
    X.lhz = kf(u, [[0, 0], [.3, .35], [.72, .2], [1, 0]]); X.rhz = -X.lhz; X.lkx = kf(u, [[0, .5], [.1, .9], [.3, .2], [.72, .3], [.88, 1], [1, .1]]); X.rkx = X.lkx;
    X.sx = kf(u, [[0, .3], [.1, .45], [.3, 0], [1, 0]]); X.sz = -s * kf(u, [[0, 0], [.3, .2], [.72, .2], [1, 0]]); },
  slide(u, o, X) { X.bx = kf(u, [[0, 0], [.15, -.95], [.6, -1.05], [.85, -.35], [1, 0]]); X.by = kf(u, [[0, 0], [.15, .12], [.6, .1], [1, 0]]);
    X.rhx = kf(u, [[0, 0], [.15, -.6], [.6, -.6], [.85, -.2], [1, 0]]); X.rkx = .1; X.lhx = kf(u, [[0, 0], [.15, .5], [.6, .5], [1, 0]]); X.lkx = kf(u, [[0, .2], [.15, 1.6], [.6, 1.6], [.85, .8], [1, .1]]);
    X.sx = kf(u, [[0, .1], [.15, .5], [.6, .5], [1, .05]]); X.lsz = kf(u, [[0, .2], [.15, .9], [.6, .9], [1, .15]]); X.rsz = -kf(u, [[0, .2], [.15, .5], [.6, .5], [1, .15]]); X.rsx = kf(u, [[0, 0], [.15, .6], [.6, .6], [1, 0]]); },
  tackle(u, o, X) { X.rhx = kf(u, [[0, 0], [.4, -.95], [.7, -.6], [1, 0]]); X.rkx = kf(u, [[0, .2], [.4, .1], [1, .1]]); X.lkx = kf(u, [[0, .2], [.4, .8], [1, .15]]);
    X.by = kf(u, [[0, 0], [.4, -.18], [1, 0]]); X.sx = kf(u, [[0, .1], [.4, .35], [1, .05]]); X.lsz = .5; X.rsz = -.4; },
  stumble(u, o, X) { const s = o.s || 1; X.sy = kf(u, [[0, 0], [.3, .6 * s], [.7, .3 * s], [1, 0]]); X.sx = kf(u, [[0, .05], [.3, .45], [.7, .3], [1, .05]]);
    X.lsz = kf(u, [[0, .2], [.3, 1.3], [.7, .8], [1, .15]]); X.rsz = -kf(u, [[0, .2], [.3, 1.1], [.7, .6], [1, .15]]); X.by = kf(u, [[0, 0], [.3, -.08], [1, 0]]); X.lkx = kf(u, [[0, .1], [.3, .6], [1, .1]]); X.rkx = X.lkx; },
  fall(u, o, X) { X.bx = kf(u, [[0, 0], [.2, .6], [.38, 1.45], [.72, 1.5], [.88, .5], [1, 0]]); X.lsx = kf(u, [[0, 0], [.3, -1.6], [.72, -1.5], [1, 0]]); X.rsx = X.lsx; X.lex = -.3; X.rex = -.3;
    X.lhx = kf(u, [[0, 0], [.3, .3], [.72, .1], [1, 0]]); X.rhx = kf(u, [[0, 0], [.3, -.2], [.72, .1], [1, 0]]); X.lkx = .3; X.rkx = .5; X.by = kf(u, [[0, 0], [.38, .05], [.72, .05], [1, 0]]); },
  feint(u, o, X) { const s = o.s || 1; X.sz = kf(u, [[0, 0], [.3, .35 * s], [.6, -.3 * s], [1, 0]]); X.sy = kf(u, [[0, 0], [.3, -.4 * s], [.6, .4 * s], [1, 0]]);
    X.lhz = kf(u, [[0, 0], [.3, .35 * Math.max(0, s)], [.6, 0], [1, 0]]); X.rhz = kf(u, [[0, 0], [.3, -.35 * Math.max(0, -s)], [1, 0]]); X.by = kf(u, [[0, 0], [.3, -.06], [.6, .02], [1, 0]]);
    X.lsz = kf(u, [[0, .15], [.3, .7], [.6, .4], [1, .15]]); X.rsz = -kf(u, [[0, .15], [.3, .4], [.6, .7], [1, .15]]); },
  block(u, o, X) { X.lsx = .55; X.rsx = .55; X.lex = -.2; X.rex = -.2; X.sx = kf(u, [[0, .05], [.3, .35], [1, .05]]); X.sy = kf(u, [[0, 0], [.3, .35], [1, 0]]); X.by = kf(u, [[0, 0], [.3, .08], [1, 0]]); },
  claim(u, o, X) { X.by = kf(u, [[0, 0], [.2, -.1], [.45, .55], [.75, 0], [1, 0]]); X.lsx = kf(u, [[0, 0], [.3, -2.8], [.55, -2.6], [.8, -1.2], [1, -1.2]]); X.rsx = X.lsx;
    X.lex = kf(u, [[0, 0], [.55, -.2], [.8, -1.1], [1, -1.1]]); X.rex = X.lex; X.lkx = kf(u, [[0, .2], [.45, .9], [1, .2]]); X.rkx = kf(u, [[0, .2], [.45, .3], [1, .2]]); },
  catch(u, o, X) { X.lsx = -1.15; X.rsx = -1.15; X.lex = -1.15; X.rex = -1.15; X.lsz = -.28; X.rsz = .28; X.sx = .16; },
  plane(u, o, X) { X.lsz = 1.45; X.rsz = -1.45; X.lsx = -.1; X.rsx = -.1; X.lex = 0; X.rex = 0; X.sz = .22 * Math.sin(T * 2.4); X.sx = -.04; },
  fist(u, o, X) { X.by = kf(u, [[0, 0], [.2, -.1], [.4, .55], [.6, 0], [1, 0]]); X.rsx = kf(u, [[0, 0], [.3, -2.9], [.8, -2.9], [1, -.5]]); X.rex = -.2;
    X.lsx = kf(u, [[0, 0], [.3, -.4], [1, 0]]); X.lex = -1.4; X.lkx = kf(u, [[0, .1], [.4, 1.2], [.6, .2], [1, .1]]); X.rkx = kf(u, [[0, .1], [.4, .9], [.6, .2], [1, .1]]); },
  knee(u, o, X) { X.by = kf(u, [[0, 0], [.15, -.44], [1, -.44]]); X.lkx = kf(u, [[0, .2], [.15, 1.62], [1, 1.62]]); X.rkx = X.lkx; X.lhx = -.05; X.rhx = -.05;
    X.bx = kf(u, [[0, 0], [.15, -.3], [.6, -.4], [1, -.35]]); X.lsz = kf(u, [[0, .2], [.2, 2.7], [1, 2.7]]); X.rsz = -X.lsz; X.sx = -.2; X.nx = -.4; },
  arms(u, o, X) { X.lsx = kf(u, [[0, 0], [.2, -2.8], [.85, -2.8], [1, 0]]); X.rsx = X.lsx; X.lex = -.1; X.rex = -.1; X.by = Math.abs(Math.sin(u * Math.PI * 3)) * .28; X.lkx = .2 + X.by; X.rkx = X.lkx; },
  hug(u, o, X) { X.lsx = -1.3; X.rsx = -1.3; X.lsz = .55; X.rsz = -.55; X.lex = -.6; X.rex = -.6; X.sx = .12; },
  down(u, o, X) { X.sx = .75; X.lsx = -.55; X.rsx = -.55; X.lex = -.3; X.rex = -.3; X.lkx = .38; X.rkx = .38; X.lhx = -.25; X.rhx = -.25; X.py = -.05; X.nx = .3; },
  card(u, o, X) { X.rsx = kf(u, [[0, 0], [.2, -2.95], [.85, -2.95], [1, 0]]); X.rex = -.05; X.sx = -.05; },
  ready(u, o, X) { X.lkx = .55; X.rkx = .55; X.lhx = -.35; X.rhx = -.35; X.sx = .32; X.py = -.07; X.lsz = .55; X.rsz = -.55; X.lsx = -.45; X.rsx = -.45; X.lex = -.6; X.rex = -.6; },
};
function play(pl, k, d, o = {}) { if (!pl) return; pl.act = { k, t: 0, d, o }; }
function loco(pl, dt) {
  const v = Math.hypot(pl.vx, pl.vz), g = clamp(v / 1.8, 0, 1), a = clamp((v - 1) / 7, 0, 1);
  if (v > .15) pl.ph += dt * (5 + 1.15 * v);
  const s = Math.sin(pl.ph), c = Math.cos(pl.ph), ha = g * (.22 + .62 * a), ka = g * (.3 + 1.2 * a), aa = g * (.18 + .62 * a);
  JK.forEach(k => { J[k] = 0; });
  J.lhx = -s * ha; J.rhx = s * ha;
  J.lkx = .07 + .12 * a + ka * Math.max(0, c); J.rkx = .07 + .12 * a + ka * Math.max(0, -c);
  J.lax = -.3 * ka * Math.max(0, -c); J.rax = -.3 * ka * Math.max(0, c);
  J.lsx = s * aa; J.rsx = -s * aa; J.lex = -(.2 + .95 * a) * g - .12; J.rex = J.lex; J.lsz = .1 + .05 * a; J.rsz = -J.lsz;
  J.sx = .04 + .26 * a + (1 - g) * .012 * Math.sin(T * 1.7 + pl.i); J.sy = s * .13 * a; J.py = -.035 * a + .035 * a * Math.cos(2 * pl.ph) - .01 * g;
  // se inclina hacia dentro en las curvas y hacia delante al arrancar (hacia atrás al frenar): menos de robot
  pl.lean += (clamp(-pl.yv * v * .016, -.2, .2) - pl.lean) * (1 - Math.exp(-dt * 7)); J.bz = pl.lean; J.sx += clamp(pl.acc * .011, -.09, .12);
  if (g < .35) { const br = Math.sin(T * 1.9 + pl.ph); J.sy += .05 * Math.sin(T * .7 + pl.ph); J.lsz += .03 * br; J.rsz -= .03 * br; J.nx = .04 * Math.sin(T * .9 + pl.i); } // de pie: respira y mira alrededor
  if (pl.gk && !pl.act && g < .6 && ball && Math.abs(ball.x - pl.x) < 34) { const X = {}; ACTS.ready(0, {}, X); const w = (1 - g / .6) * .85; for (const k in X) J[k] += (X[k] - J[k]) * w; }
}
function actPose(pl, dt) {
  const A = pl.act; if (!A) return; A.t += dt; const u = A.t / A.d;
  if (u >= 1 && !A.o.hold) { pl.act = null; return; }
  const w = sm(A.o.hold ? clamp(A.t / .12, 0, 1) : Math.min(clamp(A.t / .1, 0, 1), clamp((A.d - A.t) / .18, 0, 1))), X = {};
  ACTS[A.k](Math.min(u, 1), A.o, X, pl);
  for (const k in X) J[k] += (X[k] - J[k]) * w;
}
function applyPose(pl) {
  pl.body.rotation.set(J.bx, 0, J.bz); pl.body.position.y = J.by; pl.pelvis.position.y = .95 + J.py;
  pl.spine.rotation.set(J.sx, J.sy, J.sz); pl.neck.rotation.x = J.nx;
  pl.aL.sh.rotation.set(J.lsx, 0, J.lsz); pl.aL.el.rotation.x = J.lex; pl.aR.sh.rotation.set(J.rsx, 0, J.rsz); pl.aR.el.rotation.x = J.rex;
  pl.lL.hp.rotation.set(J.lhx, 0, J.lhz); pl.lL.kn.rotation.x = J.lkx; pl.lL.an.rotation.x = J.lax;
  pl.lR.hp.rotation.set(J.rhx, 0, J.rhz); pl.lR.kn.rotation.x = J.rkx; pl.lR.an.rotation.x = J.rax;
}

/* ---------------- movimiento ---------------- */
const all = () => P[0].concat(P[1]);
function pin(pl, x, z, urg = 1) { if (!pl) return; pl.pin = { x: clamp(x, -L - 3, L + 3), z: clamp(z, -WD - 2, WD + 2) }; pl.urg = urg; }
const unpin = pl => { if (pl) { pl.pin = null; pl.faceT = null; } };
const unpinAll = () => { for (const pl of all()) { unpin(pl); pl.line = null; } };
function place(pl, x, z, yaw) { pl.x = x; pl.z = z; pl.vx = pl.vz = 0; pl.yv = 0; pl.acc = 0; pl.mv = null; pl.act = null; pl.line = null; pl.pin = { x, z }; pl.urg = .5; if (yaw != null) pl.yaw = yaw; }
// penaltis: el portero se queda SOBRE LA LÍNEA (solo se mueve de lado a lado) hasta que sale el balón
function onLine(gk, x, sway) { gk.line = { x, sway: !!sway }; gk.pin = { x, z: gk.z }; }
const yawTo = (pl, x, z) => Math.atan2(x - pl.x, z - pl.z);
function shape() { // dónde estaría cada uno según el balón y quién lo tiene
  const bx = ball.x, bz = ball.z;
  for (const p of [0, 1]) {
    const ub = clamp(uOf(p, bx), 0, 1), vb = clamp(vOf(p, bz), -1, 1), mine = poss === p;
    P[p].forEach((pl, i) => {
      const u0 = pl.fu, v0 = pl.fv; let u, v;
      if (pl.gk) { u = .03 + clamp(ub - .5, 0, .5) * .14; v = vb * .12; }
      else { const ln = clamp(pl.ln, 0, 2), sh = mine ? (ub - .35) * .55 + .06 : (ub - .55) * .5 - .04;
        u = u0 + sh * [.85, 1, .8][ln]; u = clamp(u, [.06, .15, mine ? .32 : .36][ln], [mine ? .62 : .5, .8, mine ? .9 : .72][ln]);
        v = clamp(v0 * (mine ? 1.05 : .8) + vb * (mine ? .15 : .3), -.95, .95); }
      const w = wpt(p, u, v), k = pl.gk ? .25 : 1; // y nadie se queda clavado: cada uno se va recolocando un poco
      pl.home.x = w.x + k * (Math.sin(T * .31 + pl.ph * 1.3) * 1.1 + Math.sin(T * .73 + pl.ph) * .45); pl.home.z = w.z + k * (Math.sin(T * .27 + pl.ph * 2.1) * 1.3 + Math.sin(T * .61 + pl.ph * .7) * .4); pl.press = false;
    });
  }
  // el más cercano del equipo que defiende va a presionar al que lleva el balón
  const own = ball.own;
  if (own && ball.st === 'held' && !own.gk) { const o = 1 - own.p; let best = null, bd = 1e9;
    for (const pl of P[o]) if (!pl.gk && !pl.pin) { const d = Math.hypot(pl.x - own.x, pl.z - own.z); if (d < bd) { bd = d; best = pl; } }
    if (best && bd < 22) { const gx = -D(o) * L; const dx = gx - own.x, dz = -own.z, n = Math.hypot(dx, dz) || 1; best.home.x = own.x + dx / n * 1.8; best.home.z = own.z + dz / n * 1.8; best.press = true; } }
}
function steer(pl, dt) {
  if (pl.mv) { // movimiento forzado (estirada, entrada, caída)
    const m = pl.mv; if (T >= m.t1) pl.mv = null; else { if (T >= m.t0) { pl.vx = m.vx; pl.vz = m.vz; } else { pl.vx *= .8; pl.vz *= .8; } pl.x += pl.vx * dt; pl.z += pl.vz * dt; return; }
  }
  const lock = pl.act && ['dive', 'slide', 'fall', 'knee', 'down', 'catch', 'card', 'claim'].includes(pl.act.k) && !pl.act.o.move;
  if (pl.line) { const Ln = pl.line; pl.pin = { x: Ln.x, z: Ln.sway && ball && ball.st !== 'fly' ? Math.sin(T * 2.3 + pl.ph) * .45 : pl.pin ? pl.pin.z : pl.z }; pl.urg = .3; }
  const t = pl.pin || pl.home, dx = t.x - pl.x, dz = t.z - pl.z, d = Math.hypot(dx, dz);
  const urg = pl.pin ? pl.urg : pl.press ? .82 : .55, mx = pl.spd * urg * (pl === refP ? .9 : 1);
  let wx = 0, wz = 0; if (d > .25 && !lock) { const sp = Math.min(mx, d * 1.8); wx = dx / d * sp; wz = dz / d * sp; }
  const pvx = pl.vx, pvz = pl.vz, ax = wx - pl.vx, az = wz - pl.vz, a = Math.hypot(ax, az), lim = (lock ? 14 : 10) * dt;
  if (a > lim) { pl.vx += ax / a * lim; pl.vz += az / a * lim; } else { pl.vx = wx; pl.vz = wz; }
  pl.x += pl.vx * dt; pl.z += pl.vz * dt;
  if (pl.line) pl.x = clamp(pl.x, pl.line.x - .15, pl.line.x + .15); // de la línea no se mueve
  if (dt > 0) { const fa = ((pl.vx - pvx) * Math.sin(pl.yaw) + (pl.vz - pvz) * Math.cos(pl.yaw)) / dt; pl.acc += (clamp(fa, -10, 10) - pl.acc) * (1 - Math.exp(-dt * 6)); }
}
function separate() {
  const A = all(); A.push(refP);
  for (let a = 0; a < A.length; a++) for (let b = a + 1; b < A.length; b++) { const p = A[a], q = A[b], dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
    if (d < .95 && d > 1e-4) { const k = (.95 - d) / 2 * .5, ux = dx / d, uz = dz / d; if (!p.mv) { p.x -= ux * k; p.z -= uz * k; } if (!q.mv) { q.x += ux * k; q.z += uz * k; } } }
}
function face(pl, dt) {
  let ty = pl.yaw; const v = Math.hypot(pl.vx, pl.vz);
  if (pl.faceT) ty = yawTo(pl, pl.faceT.x, pl.faceT.z);
  else if (pl.act && ['dive', 'slide', 'fall', 'knee'].includes(pl.act.k)) ty = pl.yaw;
  else if (v > 1.3 && !(pl.gk && ball && Math.abs(ball.x - pl.x) < 30)) ty = Math.atan2(pl.vx, pl.vz);
  else if (ball) ty = yawTo(pl, ball.x, ball.z);
  // giro con inercia (arranca y frena suave) en vez de a velocidad fija
  let d = ty - pl.yaw; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
  pl.yv += (clamp(d * 9, -10, 10) - pl.yv) * (1 - Math.exp(-dt * 18)); pl.yaw += pl.yv * dt;
}
function updPlayer(pl, dt) {
  steer(pl, dt); face(pl, dt); loco(pl, dt); actPose(pl, dt); applyPose(pl);
  pl.root.position.set(pl.x, 0, pl.z); pl.root.rotation.y = pl.yaw;
  for (let q = 0; q < 22; q++) pl.jr[q] = J[JK[q]]; // para la repetición
}
const handPos = (pl, out = new V3()) => { const a = pl.aL.h.getWorldPosition(new V3()), b = pl.aR.h.getWorldPosition(new V3()); return out.copy(a).add(b).multiplyScalar(.5); };

/* ---------------- balón ---------------- */
function mkBall() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(BR, 18, 12), new THREE.MeshStandardMaterial({ map: ballTex(), roughness: .45 })); m.castShadow = true; scene.add(m);
  return { m, x: 0, y: BR, z: 0, vx: 0, vy: 0, vz: 0, st: 'held', own: null, F: null, want: null, end: null, net: null };
}
function attach(pl, gkHold) { ball.st = gkHold ? 'gk' : 'held'; ball.own = pl; ball.F = null; ball.want = null; ball.end = null; ball.net = null; poss = pl.p; focus = pl; if (gkHold) play(pl, 'catch', 1, { hold: 1 }); }
const tmpV = new V3(), tmpW = new V3();
function updBall(dt) {
  const b = ball, ox = b.x, oz = b.z, oy = b.y;
  if (b.st === 'held' && b.own) { const pl = b.own, sp = Math.hypot(pl.vx, pl.vz), r = .42 + (sp > 2 ? .25 * Math.abs(Math.sin(pl.ph)) : 0);
    const tx = pl.x + Math.sin(pl.yaw) * r, tz = pl.z + Math.cos(pl.yaw) * r, k = 1 - Math.exp(-dt * 16); b.x += (tx - b.x) * k; b.z += (tz - b.z) * k; b.y += (BR - b.y) * k; b.vx = b.vz = 0; }
  else if (b.st === 'gk' && b.own) { handPos(b.own, tmpV); const k = 1 - Math.exp(-dt * 20); b.x += (tmpV.x - b.x) * k; b.y += (Math.max(BR, tmpV.y) - b.y) * k; b.z += (tmpV.z - b.z) * k; }
  else if (b.st === 'fly' && b.F) { const F = b.F, u = clamp((T - F.t0) / F.d, 0, 1);
    let ex = F.b.x, ey = F.b.y, ez = F.b.z; if (F.home) { F.home(tmpW); const w = clamp((u - .35) / .65, 0, 1); ex = lerp(ex, tmpW.x, w); ey = lerp(ey, tmpW.y, w); ez = lerp(ez, tmpW.z, w); }
    const e = F.ease ? sm(u) * .3 + u * .7 : F.ez ? F.ez * (1 - (1 - u) * (1 - u)) + (1 - F.ez) * u : u;
    b.x = lerp(F.a.x, ex, e) + (F.cz || 0) * Math.sin(Math.PI * u); b.z = lerp(F.a.z, ez, e) + (F.cx || 0) * Math.sin(Math.PI * u);
    b.y = Math.max(BR, lerp(F.a.y, ey, e) + F.peak * 4 * u * (1 - u));
    if (u >= 1) { const vx = (b.x - ox) / dt, vz = (b.z - oz) / dt; b.F = null; b.st = 'roll'; b.vx = vx * .45; b.vz = vz * .45; b.vy = 0; const f = b.end; b.end = null; if (f) f(); } }
  else if (b.st === 'roll' || b.st === 'loose') { if (b.y > BR + .01 || b.vy) { b.vy -= 9.8 * dt; b.y += b.vy * dt; if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy) > 1.2 ? -b.vy * .45 : 0; } }
    const f = Math.exp(-dt * (b.net ? 3.5 : .9)); b.vx *= f; b.vz *= f; b.x += b.vx * dt; b.z += b.vz * dt;
    if (b.net) { const s = b.net, gx = s * (L + NET - .2); if (s * b.x > s * gx) { b.x = gx; b.vx = 0; } b.z = clamp(b.z, -GW + .2, GW - .2); }
    else { if (Math.abs(b.x) > L + 6) { b.x = sgn(b.x) * (L + 6); b.vx = 0; } if (Math.abs(b.z) > WD + 3.5) { b.z = sgn(b.z) * (WD + 3.5); b.vz = 0; } } }
  if (b.st === 'roll' && b.want) { const w = b.want; if (Math.hypot(w.x - b.x, w.z - b.z) < .9 && b.y < .9) attach(w); }
  const mvx = b.x - ox, mvz = b.z - oz, d = Math.hypot(mvx, mvz) + Math.abs(b.y - oy) * .2; if (d > 1e-5) { tmpV.set(mvz, 0, -mvx).normalize(); b.m.rotateOnWorldAxis(tmpV, d / BR); }
  b.m.position.set(b.x, b.y, b.z);
}
// golpeo: el jugador se gira, arma la pierna y suelta el balón en el momento del golpe
async function strike(pl, x, y, z, o = {}) {
  pl.faceT = { x, z }; const t0 = T; await until(() => { let d = yawTo(pl, x, z) - pl.yaw; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI; return Math.abs(d) < .35; }, .3);
  const kd = o.kd || .5; if (!o.noAnim) play(pl, o.anim || 'kick', kd, { k: o.k == null ? .5 : o.k }); await sleep(kd * .46);
  const a = { x: ball.x, y: Math.max(BR, ball.y), z: ball.z }, dist = Math.hypot(x - a.x, z - a.z, (y - a.y) * .5);
  const dur = o.dur || Math.max(.22, dist / (o.spd || 21) + (o.peak ? .12 + o.peak * .045 : .03));
  ball.st = 'fly'; ball.own = null; ball.want = o.want || null; ball.end = o.end || null; ball.net = null;
  ball.F = { a, b: { x, y, z }, t0: T, d: dur, peak: o.peak || 0, home: o.home || null, cx: o.cx || 0, cz: o.cz || 0, ease: !!o.ease, ez: o.ez || 0 };
  if (!o.silent) sfx('kick'); pl.faceT = null; focus = o.want || null;
  return dur + (T - t0) * 0;
}
async function kickTo(pl, x, y, z, o) { const d = await strike(pl, x, y, z, o); await sleep(d); return d; }
const lead = (pl, k = 5) => { const t = pl.pin || pl.home, dx = t.x - pl.x, dz = t.z - pl.z, d = Math.hypot(dx, dz); return d < k ? { x: t.x, z: t.z } : { x: pl.x + dx / d * k, z: pl.z + dz / d * k }; };
async function pass(from, to, o = {}) {
  if (!from || !to || from === to) return;
  const tg = o.at || lead(to, o.lead || 4); pin(to, tg.x, tg.z, 1);
  const d = Math.hypot(tg.x - from.x, tg.z - from.z), loft = o.loft || d > 34;
  await strike(from, tg.x, BR, tg.z, { k: loft ? .75 : clamp(d / 40, .3, .65), spd: loft ? 21 : o.spd || 19, peak: loft ? clamp(d * .15, 2, 10) : 0, ez: loft ? .2 : .5, want: to, kd: o.kd });
  await until(() => ball.own === to, 2.2);
  if (ball.own !== to) attach(to);
}
async function gain(p, i) { // el balón acaba en los pies del jugador i del equipo p (con un pase, un despeje del rival o recogiéndolo)
  const to = i == null ? TM[p].c0 : P[p][i]; if (!to) return; if (ball.own === to && ball.st !== 'gk') return;
  if (ball.st === 'gk' && ball.own) { const g = ball.own; if (g.p === p && g === to) { ball.st = 'held'; g.act = null; return; } g.act = null; ball.st = 'held'; await sleep(.25); await punt(g, to); return; }
  if (ball.own && ball.own.p === p) { await pass(ball.own, to); return; }
  if (ball.own) { const fr = ball.own, tx = to.x + rr(-2, 2), tz = to.z + rr(-2, 2); pin(to, tx, tz, 1); await kickTo(fr, tx, BR, tz, { k: .8, spd: 22, peak: 7, want: to }); await until(() => ball.own === to, 2); if (ball.own !== to) attach(to); return; }
  pin(to, ball.x, ball.z, 1); ball.want = to; await until(() => ball.own === to || Math.hypot(to.x - ball.x, to.z - ball.z) < 1, 3.5); if (ball.own !== to) attach(to);
}
async function punt(g, to) { const tx = to.x + rr(-2, 2), tz = to.z + rr(-2, 2); pin(to, tx, tz, 1); await kickTo(g, tx, BR, tz, { k: 1, spd: 24, peak: 11, want: to, kd: .6 }); await until(() => ball.own === to, 2.2); if (ball.own !== to) attach(to); }

/* ---------------- cámara ---------------- */
const CAM = { pos: new V3(0, 40, 70), look: new V3(), tp: new V3(), tl: new V3(), pv: new V3(), lv: new V3(), fov: 30, tf: 30, mode: 'wide', snap: true, k: 2.2, who: null, gx: L };
// muelle críticamente amortiguado (como SmoothDamp): la cámara arranca y frena suave en vez de dar tirones al cambiar de plano
function damp(cur, tgt, vel, st, dt) { const w = 2 / Math.max(.05, st), x = w * dt, ex = 1 / (1 + x + .48 * x * x + .235 * x * x * x);
  for (const k of ['x', 'y', 'z']) { const ch = cur[k] - tgt[k], tmp = (vel[k] + w * ch) * dt; vel[k] = (vel[k] - w * tmp) * ex; cur[k] = tgt[k] + (ch + tmp) * ex; } }
const narrowK = () => Math.pow(clamp(1.78 / (W / Math.max(1, H)), .75, 1.7), .25) * (W < 560 ? .88 : 1); // en pantallas estrechas, algo más cerca
function setCam(mode, o = {}) { CAM.mode = mode; Object.assign(CAM, o); }
function camUpd(dt) {
  const asp = W / Math.max(1, H), nar = Math.pow(clamp(1.78 / asp, .75, 1.7), .25) * (W < 560 ? .88 : 1) /* en pantallas estrechas, algo más cerca */, bx = ball.x, bz = ball.z, f = focus || ball.own;
  const tl = CAM.tl, tp = CAM.tp; let tf = 24, k = CAM.k;
  if (CAM.mode === 'wide') { tl.set(0, 0, 2); tp.set(0, 50, 84); tf = 34 * nar; k = 1.4; }
  else if (CAM.mode === 'broad') { const lx = clamp(bx + (ball.st === 'fly' ? 0 : (f ? f.vx : 0) * .35), -L + 9, L - 9); tl.set(lx, 0, bz * .45 - 1); tp.set(lx * .86, 17, 37); tf = 23 * nar; k = 2.4; }
  else if (CAM.mode === 'shot') { const g = CAM.gx; tl.set(lerp(bx, g, .32), .9, bz * .35); tp.set(g * .76, 11.5, 27); tf = 23 * nar; k = 2.2; }
  else if (CAM.mode === 'celeb' && CAM.who) { const w = CAM.who, s = D(w.p); tl.set(w.x, 1.1, w.z); tp.set(w.x - s * 3.5, 2.5, w.z + 8.5); tf = 30 * nar; k = 2.6; }
  else if (CAM.mode === 'pen') { const g = CAM.gx, s = sgn(g); tl.set(g, 1.2, 0); tp.set(g - s * 20, 3, 1.6); tf = 27 * nar; k = 3; }
  else if (CAM.mode === 'close' && f) { tl.set(f.x, 1, f.z); tp.set(f.x * .9, 9.5, f.z + 20); tf = 24 * nar; k = 2.2; }
  if (CAM.snap) { CAM.pos.copy(tp); CAM.look.copy(tl); CAM.fov = tf; CAM.snap = false; CAM.pv.set(0, 0, 0); CAM.lv.set(0, 0, 0); }
  else { damp(CAM.pos, tp, CAM.pv, 1.1 / k, dt); damp(CAM.look, tl, CAM.lv, .75 / k, dt); CAM.fov += (tf - CAM.fov) * (1 - Math.exp(-dt * k)); }
  cam.position.copy(CAM.pos); cam.lookAt(CAM.look); if (Math.abs(cam.fov - CAM.fov) > .01) { cam.fov = CAM.fov; cam.updateProjectionMatrix(); }
}
async function cut(fn) { if (fadeEl) fadeEl.style.opacity = 1; await sleep(.22); try { fn(); } finally { CAM.snap = true; RB.cuts.push(T); if (RB.cuts.length > 12) RB.cuts.shift(); } await sleep(.06); if (fadeEl) fadeEl.style.opacity = 0; }

/* ---------------- bucle ---------------- */
function init() {
  cv = document.createElement('canvas'); cv.className = 'fm3-cv'; cv.setAttribute('aria-hidden', 'true');
  low = Math.min(screen.width, screen.height) < 600 || (navigator.hardwareConcurrency || 8) <= 4;
  R = new THREE.WebGLRenderer({ canvas: cv, antialias: !low, powerPreference: 'high-performance' });
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  R.shadowMap.enabled = !low; R.shadowMap.type = THREE.PCFSoftShadowMap;
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); failed = true; stop(); });
  PR = Math.min(window.devicePixelRatio || 1, low ? 1.25 : 1.6); R.setPixelRatio(PR);
  cam = new THREE.PerspectiveCamera(30, 16 / 9, .5, 900);
  geos();
}
function resize() { if (!host || !R) return; const w = Math.max(2, host.clientWidth), h = Math.max(2, host.clientHeight); if (w === W && h === H) return; W = w; H = h; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
function quality(dt) { if (dt > .03) { lagT += dt; if (lagT > 1.5 && PR > .75) { PR = Math.max(.75, PR * .8); R.setPixelRatio(PR); W = 0; resize(); lagT = 0; if (PR < 1 && R.shadowMap.enabled) { R.shadowMap.enabled = false; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); } } } else lagT = Math.max(0, lagT - dt * .5); }
const prj = new V3();
function frame(fixed) { // fixed = segundos simulados (para depurar con la pestaña oculta)
  const t = performance.now(), rdt = fixed != null ? fixed : Math.min(.05, (t - last) / 1000); last = t; if (fixed == null) quality(rdt);
  if (host.offsetParent === null) return;
  if ((sizeT -= rdt) <= 0) { sizeT = .5; resize(); }
  if (FRZ) { R.render(scene, cam); return; } // congelado (solo para depurar)
  if (RP) { rpFrame(rdt); return; } // repetición: el partido se queda en pausa
  const dt = rdt * SPEED; T += dt;
  for (let i = WAITS.length - 1; i >= 0; i--) if (WAITS[i].t <= T) { const w = WAITS.splice(i, 1)[0]; w.r(); }
  shape();
  for (const pl of all()) updPlayer(pl, dt);
  // árbitro: cerca del balón, sin estorbar
  if (!refP.pin) { refP.home.x = clamp(ball.x - sgn(ball.x || 1) * 9, -L + 6, L - 6); refP.home.z = clamp(ball.z + (ball.z > 0 ? -10 : 10), -WD + 4, WD - 4); }
  updPlayer(refP, dt); separate(); updBall(dt);
  hype = Math.max(0, hype - dt * .22); crowdU.uT.value = T; crowdU.uH.value = hype; boards.offset.x = (T * .025) % 1;
  for (const n of NETS) if (n.a > .001) { n.a *= Math.exp(-dt * 2.6); netDeform(n, n.a, T); }
  record();
  camUpd(rdt);
  for (const pl of all()) pl.root.visible = Math.hypot(pl.x - cam.position.x, pl.z - cam.position.z) > 2.6 || cam.position.y > 6;
  if (tagEl) { const f = (ball.st === 'held' || ball.st === 'gk') ? ball.own : focus;
    if (f && f.info && f.info.sh) { f.head.getWorldPosition(prj); prj.y += .42; prj.project(cam); const vis = prj.z < 1 && Math.abs(prj.x) < 1.1 && Math.abs(prj.y) < 1.1;
      tagEl.style.opacity = vis ? 1 : 0; tagEl.style.transform = `translate(${((prj.x + 1) / 2 * W).toFixed(1)}px,${((1 - prj.y) / 2 * H).toFixed(1)}px) translate(-50%,-100%)`;
      if (tagEl._f !== f) { tagEl._f = f; tagEl.innerHTML = `<b>${f.info.num || ''}</b>${f.info.sh}`; tagEl.style.setProperty('--c', f.gk ? KIT[f.p].gk.col : KIT[f.p].col); } }
    else tagEl.style.opacity = 0; }
  R.render(scene, cam);
}
function netDeform(n, a, t) { const pa = n.geo.attributes.position, b = n.base; for (let k = 0; k < pa.count; k++) { const x = b[k * 3], y = b[k * 3 + 1], d2 = (x - n.zl) ** 2 + (y - n.yl) ** 2; pa.array[k * 3 + 2] = b[k * 3 + 2] - a * Math.exp(-d2 / .9) * Math.cos(t * 18) * .5 - a * Math.exp(-d2 / .9); } pa.needsUpdate = true; }

/* ---------------- REPETICIÓN DEL GOL ----------------
   Se graban 40 fotos por segundo de juego de los últimos ~14 s: de cada uno de los 23 (22 + árbitro) posición, giro y las 22 articulaciones;
   del balón posición y giro; de las redes cómo se abomban; la tarjeta del árbitro y el ánimo de la grada. Tras el gol se vuelve a ver:
   primero la jugada desde la otra banda (contracampo) y después el remate a cámara lenta desde detrás de la portería (o pegado al goleador). */
const RB = { n: 560, per: 25, st: 0, buf: null, t: null, head: 0, len: 0, last: -1e9, cuts: [], goal: null };
let RP = null, rpEl = null, FRZ = false;
const people = () => P[0].concat(P[1], [refP]);
function recReset() { RB.st = 23 * RB.per + 7 + 6 + 2; if (!RB.buf || RB.buf.length !== RB.n * RB.st) { RB.buf = new Float32Array(RB.n * RB.st); RB.t = new Float64Array(RB.n); } RB.head = 0; RB.len = 0; RB.last = -1e9; RB.cuts = []; RB.goal = null; }
function record() {
  if (!RB.buf || T - RB.last < 1 / 40) return; RB.last = T;
  const k = RB.head, b = RB.buf; let j = k * RB.st; RB.t[k] = T;
  for (const pl of people()) { b[j++] = pl.x; b[j++] = pl.z; b[j++] = pl.yaw; for (let q = 0; q < 22; q++) b[j++] = pl.jr[q]; }
  const m = ball.m; b[j++] = m.position.x; b[j++] = m.position.y; b[j++] = m.position.z; b[j++] = m.quaternion.x; b[j++] = m.quaternion.y; b[j++] = m.quaternion.z; b[j++] = m.quaternion.w;
  for (let q = 0; q < 2; q++) { const n = NETS[q]; b[j++] = n ? n.a : 0; b[j++] = n ? n.zl || 0 : 0; b[j++] = n ? n.yl || 0 : 0; }
  b[j++] = refP.card.visible ? 1 : 0; b[j++] = hype;
  RB.head = (k + 1) % RB.n; RB.len = Math.min(RB.n, RB.len + 1);
}
const ringAt = i => (RB.head - RB.len + i + RB.n) % RB.n, recT = i => RB.t[ringAt(i)];
function rpIdx(t) { let lo = 0, hi = RB.len - 1; if (t <= recT(0)) return [0, 0, 0]; if (t >= recT(hi)) return [hi, hi, 0];
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (recT(mid) <= t) lo = mid; else hi = mid; }
  const ta = recT(lo), tb = recT(hi); return [lo, hi, tb > ta ? (t - ta) / (tb - ta) : 0]; }
const angL = (a, b, w) => { let d = b - a; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * w; };
const QA = new THREE.Quaternion(), QB = new THREE.Quaternion();
function rpApply(t) { // pinta la escena tal y como estaba en el instante t (interpolando entre dos fotos)
  const [i0, i1, w] = rpIdx(t), A = ringAt(i0) * RB.st, B = ringAt(i1) * RB.st, b = RB.buf; let j = 0;
  const lp = () => { const v = b[A + j] + (b[B + j] - b[A + j]) * w; j++; return v; };
  for (const pl of people()) { const x = lp(), z = lp(), yaw = angL(b[A + j], b[B + j], w); j++;
    for (let q = 0; q < 22; q++) J[JK[q]] = lp();
    applyPose(pl); pl.root.position.set(x, 0, z); pl.root.rotation.y = yaw; pl.rx = x; pl.rz = z; }
  const bx = lp(), by = lp(), bz = lp(); ball.m.position.set(bx, by, bz);
  QA.set(b[A + j], b[A + j + 1], b[A + j + 2], b[A + j + 3]); QB.set(b[B + j], b[B + j + 1], b[B + j + 2], b[B + j + 3]); j += 4; ball.m.quaternion.slerpQuaternions(QA, QB, w);
  for (let q = 0; q < 2; q++) { const n = NETS[q], a = lp(), zl = lp(), yl = lp(); if (n) { n.zl = zl; n.yl = yl; netDeform(n, a, t); } }
  refP.card.visible = lp() > .5; crowdU.uH.value = lp();
  return { x: bx, y: by, z: bz };
}
function rpCam(S, B, dt) { // cámaras de la repetición
  const G0 = RB.goal, s = G0.s, gx = G0.gx, nar = narrowK(), tl = CAM.tl, tp = CAM.tp, sh = G0.sh; let tf = 24;
  if (S.cam === 'rev') { const lx = clamp(B.x, -L + 8, L - 8); tl.set(lx, .9, clamp(B.z * .75, -WD + 4, WD - 4)); tp.set(lx - s * 5, 5.8, -(WD + 6)); tf = 22 * nar; }
  else if (S.cam === 'goal') { tl.set(lerp(B.x, gx, .12), clamp(B.y * .7, .6, 2), clamp(B.z * .85, -GW * 2.5, GW * 2.5)); tp.set(gx + s * 8.2, 3.1, G0.zs * 2.2 + clamp(B.z * .2, -3, 3)); tf = 34 * nar; }
  else { const px = sh.rx != null ? sh.rx : sh.x, pz = sh.rz != null ? sh.rz : sh.z; tl.set(lerp(px, gx, .3), 1.1, lerp(pz, 0, .3)); tp.set(px - s * 6.5, 2.3, pz + G0.zs * 3.2); tf = 32 * nar; }
  if (S.snap) { CAM.pos.copy(tp); CAM.look.copy(tl); CAM.fov = tf; CAM.pv.set(0, 0, 0); CAM.lv.set(0, 0, 0); S.snap = false; }
  else { damp(CAM.pos, tp, CAM.pv, S.cam === 'rev' ? .5 : .7, dt); damp(CAM.look, tl, CAM.lv, S.cam === 'rev' ? .28 : .35, dt); CAM.fov += (tf - CAM.fov) * (1 - Math.exp(-dt * 3)); }
  cam.position.copy(CAM.pos); cam.lookAt(CAM.look); if (Math.abs(cam.fov - CAM.fov) > .01) { cam.fov = CAM.fov; cam.updateProjectionMatrix(); }
}
function rpFrame(rdt) {
  const S = RP.seg; crowdU.uT.value += rdt * .8; boards.offset.x = (boards.offset.x + rdt * .02) % 1;
  if (S) {
    RP.t = Math.min(S.b, RP.t + rdt * S.r); const B = rpApply(RP.t); rpCam(S, B, rdt);
    for (const pl of all()) pl.root.visible = Math.hypot(pl.rx - cam.position.x, pl.rz - cam.position.z) > 2.6 || cam.position.y > 6;
    const f = RB.goal.sh; if (tagEl && f && f.info && f.info.sh) { f.head.getWorldPosition(prj); prj.y += .42; prj.project(cam); const vis = prj.z < 1 && Math.abs(prj.x) < 1.1 && Math.abs(prj.y) < 1.1;
      tagEl.style.opacity = vis ? 1 : 0; tagEl.style.transform = `translate(${((prj.x + 1) / 2 * W).toFixed(1)}px,${((1 - prj.y) / 2 * H).toFixed(1)}px) translate(-50%,-100%)`;
      if (tagEl._f !== f) { tagEl._f = f; tagEl.innerHTML = `<b>${f.info.num || ''}</b>${f.info.sh}`; tagEl.style.setProperty('--c', f.gk ? KIT[f.p].gk.col : KIT[f.p].col); } }
  }
  R.render(scene, cam);
  if (S && RP.t >= S.b && RP.done) { const d = RP.done; RP.done = null; d(); }
}
function rpBadge(label, show) { if (!rpEl) return; const b = rpEl.querySelector('b'); if (b && label) b.textContent = label; rpEl.classList.toggle('on', !!show); }
async function replay(o = {}) {
  if (!on || !RB.goal || RB.len < 12 || !RB.goal.sh) return;
  const G0 = RB.goal, g = G0.t, cutB = RB.cuts.filter(c => c <= g).pop(), t0 = Math.max(g - 4.4, (cutB != null ? cutB : -1e9) + .1, recT(0) + .02), t1 = Math.min(g + .95, recT(RB.len - 1));
  if (t1 - t0 < .8) return;
  const segs = [], split = g - 1.2; G0.zs = G0.zs || 1;
  if (split - t0 > 1.2) segs.push({ a: t0, b: split + .1, r: SPEED * .95, cam: 'rev', snap: true });
  segs.push({ a: Math.max(t0, g - 1.3), b: t1, r: .55, cam: Math.random() < .65 ? 'goal' : 'tight', snap: true });
  const wait = ms => new Promise(r => setTimeout(r, ms)), fade = v => { if (fadeEl) fadeEl.style.opacity = v; };
  fade(1); await wait(240); if (!on || RP) { fade(0); return; }
  const live = NETS.map(n => ({ a: n.a, zl: n.zl, yl: n.yl })), hy = crowdU.uH.value;
  RP = { seg: null, t: 0, done: null }; rpBadge(o.label || 'REPLAY', true); if (tagEl) { tagEl.style.opacity = 0; tagEl._f = null; }
  try {
    for (let i = 0; i < segs.length && on && RP; i++) {
      RP.seg = segs[i]; RP.t = segs[i].a; await wait(40); fade(0);
      await new Promise(r => { if (RP) RP.done = r; else r(); });
      if (!on || !RP) break; fade(1); await wait(220);
    }
  } finally {
    RP = null; rpBadge('', false); if (tagEl) tagEl._f = null;
    if (on) { NETS.forEach((n, k) => { const v = live[k]; n.a = v.a; n.zl = v.zl; n.yl = v.yl; netDeform(n, v.a, T); }); crowdU.uH.value = hy; CAM.snap = true; }
    await wait(60); fade(0);
  }
}

function loop(g) { if (!on || g !== gen) return; if (!cv.isConnected) { stop(); return; } requestAnimationFrame(() => loop(g)); try { frame(); } catch (e) { console.warn('FOOT3D', e); } }
function clearScene() { if (!scene) return; scene.traverse(o => { if (o.geometry && !Object.values(G || {}).includes(o.geometry)) o.geometry.dispose(); if (o.material) { const m = o.material; if (m.map) m.map.dispose(); if (!MATS.has([...MATS.keys()].find(k => MATS.get(k) === m))) m.dispose(); } }); scene = null; }
function stop() { on = false; if (ro) ro.disconnect(); if (RP) { const d = RP.done; RP = null; if (d) d(); } rpBadge('', false); WAITS.splice(0).forEach(w => w.r()); clearScene(); P[0] = []; P[1] = []; NETS.length = 0; ball = null; refP = null; focus = null; }

/* ---------------- jugadas (las llama game.js) ---------------- */
const gxOf = p => D(p) * L;
const kickoffPos = (pl, kicker) => { let u = Math.min(.47, pl.fu * .92 + (pl.ln === 2 ? .08 : 0)); if (!kicker && !pl.gk) u = Math.min(u, .41); return wpt(pl.p, u, pl.fv * .95); };
async function kickoff(p) {
  await cut(() => { unpinAll(); hype = Math.max(hype, .25);
    for (const q of [0, 1]) P[q].forEach(pl => { const w = kickoffPos(pl, q === p); place(pl, w.x, w.z, q ? -Math.PI / 2 : Math.PI / 2); unpin(pl); });
    const k = TM[p].st, m = TM[p].pa; // saca el delantero centro y se la da a su compañero place(k, -D(p) * .35, .2, D(p) > 0 ? Math.PI / 2 : -Math.PI / 2); place(m, -D(p) * 1.2, -D(p) * 3.5); unpin(k);
    ball.x = 0; ball.z = 0; ball.y = BR; attach(k); place(refP, -6, 8); unpin(refP); setCam('wide'); });
  await sleep(.6); setCam('broad');
}
async function walkout() {
  await cut(() => { unpinAll(); for (const q of [0, 1]) P[q].forEach((pl, i) => { place(pl, (q ? 1 : -1) * (1.6 + i * 1.05), WD + 1.2, Math.PI); const w = kickoffPos(pl, q === 0); pin(pl, w.x, w.z, .55); });
    place(refP, 0, WD + 1); pin(refP, -6, 8, .5); ball.st = 'loose'; ball.own = null; ball.x = 0; ball.z = 0; ball.y = BR; ball.vx = ball.vz = 0; setCam('wide'); hype = .8; });
  await sleep(3.2);
}
// posesión entre minutos: el equipo p mueve el balón por detrás y por el centro
async function idle(sec, p) {
  if (!on) return; const t0 = T; if (p == null || p < 0) p = poss;
  unpinAll(); setCam('broad'); if (ball.own && ball.own.p !== p || !ball.own || ball.st === 'gk') await gain(p, pickOf(TM[p].df.concat(TM[p].md)).i);
  while (on && T - t0 < sec) {
    const h = ball.own; if (!h || h.p !== p) break;
    // a veces conduce unos metros antes de soltarla (si tiene espacio), como en un partido de verdad
    const near = q => Math.min(...P[1 - p].map(r => Math.hypot(r.x - q.x, r.z - q.z)));
    if (Math.random() < .55 && near(h) > 5 && T - t0 < sec - 1.2) { pin(h, clamp(h.x + D(p) * rr(4, 9), -L + 9, L - 9), clamp(h.z + rr(-5, 5), -WD + 4, WD - 4), rr(.5, .72)); await sleep(rr(.45, .9)); if (ball.own !== h) break; }
    const c = P[p].filter(pl => !pl.gk && pl !== h && pl !== TM[p].st).filter(pl => { const d = Math.hypot(pl.x - h.x, pl.z - h.z); return d > 7 && d < 30; });
    if (!c.length || T - t0 > sec - .4) { pin(h, h.x + D(p) * 3, h.z, .4); await sleep(Math.min(.8, sec - (T - t0) + .1)); unpin(h); break; }
    // el pase va antes al compañero que está solo y más hacia delante
    const wt = c.map(q => Math.max(.15, 1 + (q.x - h.x) * D(p) * .035) * clamp(near(q) / 6, .15, 1)), tot = wt.reduce((a, b) => a + b, 0); let r = Math.random() * tot, to = c[c.length - 1];
    for (let k = 0; k < c.length; k++) { r -= wt[k]; if (r <= 0) { to = c[k]; break; } }
    await pass(h, to); await sleep(rr(.08, .3)); unpin(h);
  }
}
// salida del balón: la cadena de pases del guion (portero/defensa → medios)
async function build(p, ch, onPass) {
  unpinAll(); setCam('broad'); ch = (ch || []).slice(-2); if (!ch.length) return; // se ven los dos últimos pases de la salida
  await gain(p, ch[0]); if (onPass) onPass(ch[0]);
  for (let k = 1; k < ch.length; k++) { const to = P[p][ch[k]], adv = D(p) * rr(5, 9); pin(to, clamp(to.home.x + adv, -L + 10, L - 10), to.home.z * .9, 1); await sleep(.15);
    const fr = ball.own; await pass(fr, to); unpin(fr); if (onPass) onPass(ch[k]); }
}
// lo que pasa antes del remate (o la pérdida), según el tipo de ocasión del guion
async function chance(e) {
  const p = e.p, o = 1 - p, s = D(p), gx = gxOf(p), c = e.c >= 0 ? P[p][e.c] : null, dv = e.dv >= 0 ? P[o][e.dv] : null, gk = P[o][0], sh = e.sh >= 0 ? P[p][e.sh] : null;
  const toBall = async (pl, x, z, o2) => { if (ball.own === pl) return; if (!ball.own || ball.own.p !== p) await gain(p, pl.i); else await pass(ball.own, pl, Object.assign({ at: { x, z } }, o2 || {})); };
  const lostTo = async (d, how) => { // el defensor se queda el balón
    if (how === 'slide') { d.faceT = { x: ball.x, z: ball.z }; const dx = ball.x - d.x, dz = ball.z - d.z, n = Math.hypot(dx, dz) || 1; play(d, 'slide', 1.1); d.mv = { vx: dx / n * 6.5, vz: dz / n * 6.5, t0: T, t1: T + .38 }; await sleep(.3);
      const own = ball.own; if (own && own !== d) play(own, 'stumble', .7, { s: Math.random() < .5 ? -1 : 1 }); const mate = pickOf(TM[o].md.concat(TM[o].cb).filter(q => q !== d));
      ball.st = 'roll'; ball.own = null; ball.vx = -s * rr(4, 7) + rr(-2, 2); ball.vz = rr(-3, 3); ball.want = mate; sfx('save'); pin(mate, ball.x + ball.vx * .9, ball.z + ball.vz * .9, 1); await until(() => ball.own === mate, 2.2); if (ball.own !== mate) attach(mate); }
    else { play(d, 'tackle', .6); await sleep(.24); const own = ball.own; if (own && own !== d) play(own, 'stumble', .7, { s: 1 }); sfx('save'); attach(d); await sleep(.4); }
    unpinAll(); setCam('broad');
  };
  setCam('broad');
  if (e.k === 'mid') { // robo en el centro del campo
    const h = c || ball.own; if (!h) return; if (ball.own !== h) await toBall(h, h.x, h.z);
    pin(h, h.x + s * 6, h.z * .9, .45); pin(dv, h.x + s * 3, h.z, 1); await until(() => Math.hypot(dv.x - h.x, dv.z - h.z) < 1.6, 2.5);
    await lostTo(dv, Math.random() < .5 ? 'slide' : 'tackle'); return;
  }
  if (e.k === 'run') { // pase al hueco y carrera
    const zc = clamp(c.z * .55, -13, 13), TP = { x: gx - s * 15, z: zc };
    pin(c, gx - s * 23, zc + rr(-2, 2), .8); const pz = ball.own && ball.own.p === p ? ball.own : null; if (!pz) await gain(p, TM[p].c0.i);
    await sleep(.45); const fr = ball.own;
    if (e.out === 'lost') { const IP = { x: lerp(TP.x, dv.x, .45), z: lerp(TP.z, dv.z, .45) }; pin(c, TP.x, TP.z, 1); pin(dv, IP.x, IP.z, 1); focus = c;
      await strike(fr, IP.x, BR, IP.z, { k: .55, spd: 19, want: dv }); unpin(fr); await until(() => ball.own === dv, 2.4); if (ball.own !== dv) attach(dv); play(dv, 'tackle', .5); await sleep(.4); unpinAll(); return; }
    pin(c, TP.x, TP.z, 1); await sleep(.12); if (dv) pin(dv, TP.x - s * 1.5, TP.z + rr(-1, 1), 1);
    await strike(fr, TP.x, BR, TP.z, { k: .6, spd: 19, want: c }); unpin(fr); await until(() => ball.own === c, 2.6); if (ball.own !== c) attach(c);
    const SP = { x: gx - s * rr(10.5, 12.5), z: zc * .45 }; pin(c, SP.x, SP.z, 1); pin(gk, gx - s * 5.5, lerp(0, SP.z, .5), 1);
    if (dv) pin(dv, SP.x - s * 1.6, SP.z + 1, 1); setCam('shot', { gx }); await until(() => Math.hypot(c.x - SP.x, c.z - SP.z) < 1.2, 2.4); return;
  }
  if (e.k === 'drib') { // regate contra un defensor
    const zc = clamp(c.home.z * .7, -22, 22), RP = { x: gx - s * rr(22, 26), z: zc }; await toBall(c, RP.x, RP.z);
    pin(dv, RP.x + s * 4.5, RP.z * .9, .9); pin(c, RP.x + s * 4, RP.z * .9, .5); setCam('shot', { gx });
    await until(() => Math.hypot(dv.x - c.x, dv.z - c.z) < 2.5, 2.6);
    if (e.out === 'lost') { await lostTo(dv, Math.random() < .6 ? 'slide' : 'tackle'); return; }
    const side = Math.random() < .5 ? -1 : 1; play(c, 'feint', .55, { s: side }); await sleep(.3);
    pin(c, dv.x + s * 3.5, dv.z + side * 2.4, 1); play(dv, 'stumble', .8, { s: -side }); dv.mv = { vx: -s * 1.2, vz: -side * 1.5, t0: T, t1: T + .5 }; pin(dv, dv.x, dv.z, .3);
    await sleep(.55); const SP = { x: gx - s * rr(11, 14), z: clamp(dv.z + side * 3, -12, 12) }; pin(c, SP.x, SP.z, 1); pin(dv, SP.x - s * 2.5, SP.z, 1); pin(gk, gx - s * 2.5, SP.z * .3, 1);
    await until(() => Math.hypot(c.x - SP.x, c.z - SP.z) < 1.3, 2.2); return;
  }
  if (e.k === 'cross') { // centro desde la banda
    const zw = sgn(c.home.z || c.fv * D(p) || s) * (WD - 6), CP = { x: gx - s * 27, z: zw }; await toBall(c, CP.x, CP.z, { lead: 6 });
    pin(c, gx - s * 11, zw * .92, 1); setCam('shot', { gx });
    const hz = -sgn(zw) * rr(.5, 3), HP = { x: gx - s * rr(7, 9), z: hz }, tgt = sh && sh !== c ? sh : TM[p].st;
    pin(tgt, HP.x - s * 4, HP.z * .5, .8); for (const q of TM[p].fw.concat(TM[p].am)) { if (q !== c && q !== tgt) pin(q, gx - s * rr(9, 14), rr(-8, 8), .8); }
    const mk = dv && dv !== gk ? dv : TM[o].cb[0]; pin(mk, HP.x - s * 3, HP.z + 1, .8); pin(gk, gx - s * 1, zw * .1, .8);
    await until(() => Math.abs(c.x - (gx - s * 11)) < 2, 2.6);
    pin(tgt, HP.x, HP.z, 1); pin(mk, HP.x + s * .6, HP.z + .5, 1);
    if (e.out === 'lost' && dv === gk) { pin(gk, HP.x + s * 1.5, HP.z, 1);
      await strike(c, HP.x + s * 1.5, 2.2, HP.z, { k: .8, peak: 3.2, spd: 20, want: gk, home: o2 => handPos(gk, o2) }); unpin(c);
      await sleep(Math.max(0, ball.F ? ball.F.d - .5 : 0)); play(gk, 'claim', .9); await until(() => ball.st !== 'fly', 1.5); attach(gk, true); await sleep(.5); unpinAll(); return; }
    const d = await strike(c, HP.x, 1.9, HP.z, { k: .8, peak: 3.4, spd: 20, want: tgt }); unpin(c); CAM.cross = { t: T + d, to: e.out === 'lost' ? mk : tgt };
    if (e.out === 'lost') { await sleep(Math.max(0, d - .38)); play(mk, 'header', .8); await sleep(.36); const mate = TM[o].c0;
      ball.st = 'fly'; ball.F = { a: { x: ball.x, y: Math.max(1.6, ball.y), z: ball.z }, b: { x: ball.x - s * 22, y: BR, z: ball.z * .5 + rr(-8, 8) }, t0: T, d: 1.2, peak: 6 }; ball.want = mate; ball.end = null; sfx('kick');
      pin(mate, ball.F.b.x, ball.F.b.z, 1); await until(() => ball.own === mate, 2.4); if (ball.own !== mate) attach(mate); unpinAll(); setCam('broad'); }
    return;
  }
  if (e.k === 'box') { // paredes en la frontal
    const zc = clamp(c.home.z * .5, -14, 14), RP = { x: gx - s * 21, z: zc }; await toBall(c, RP.x, RP.z); setCam('shot', { gx });
    const tgt = sh || TM[p].st, SP = { x: gx - s * rr(12, 15), z: clamp(zc + rr(-7, 7), -10, 10) }; pin(tgt, SP.x, SP.z, 1); if (dv) pin(dv, lerp(RP.x, SP.x, .6), lerp(RP.z, SP.z, .6) + 1.2, .8);
    await sleep(.5);
    if (e.out === 'lost') { const IP = { x: lerp(c.x, SP.x, .55), z: lerp(c.z, SP.z, .55) }; pin(dv, IP.x, IP.z, 1); await strike(c, IP.x, BR, IP.z, { k: .4, spd: 20, want: dv }); unpin(c);
      await until(() => ball.own === dv, 2); if (ball.own !== dv) attach(dv); play(dv, 'tackle', .5); await sleep(.5); unpinAll(); setCam('broad'); return; }
    await pass(c, tgt, { at: SP }); unpin(c); return;
  }
  if (e.k === 'long') { // disparo lejano
    const RP = { x: gx - s * rr(25, 28), z: clamp(c.home.z * .4, -10, 10) }; await toBall(c, RP.x, RP.z); setCam('shot', { gx });
    pin(c, RP.x + s * 2, RP.z, .5); for (const q of TM[o].cb.slice(0, 2).concat(TM[o].c0)) pin(q, RP.x + s * rr(4, 7), RP.z + rr(-4, 4), .8); await sleep(.55); return;
  }
}
// el remate y lo que pasa con él (gol, parada, palo, rechace o fuera)
async function outcome(e) {
  const p = e.p, o = 1 - p, gx = e.gx != null ? e.gx : gxOf(p), s = sgn(gx), sh = P[p][e.sh], gk = P[o][0], out = e.out, pen = !!e.pen, k = e.k;
  setCam(pen ? 'pen' : 'shot', { gx });
  if (ball.own !== sh && k !== 'cross') { if (ball.own && ball.own.p === p) await pass(ball.own, sh); else attach(sh); }
  const head = k === 'cross';
  // a dónde va
  const side = e.d - 1; let tz = side * (GW - .65) + (side ? rr(-.3, .3) : rr(-1.2, 1.2)), ty = head ? rr(.3, 1.4) : [rr(.2, .5), rr(.7, 1.3), rr(1.6, 2.15)][Math.random() * 3 | 0];
  if (out === 'wide') { if (Math.random() < .45) { ty = GH + rr(.4, 1.8); tz = rr(-3, 3); } else { tz = (side || (Math.random() < .5 ? -1 : 1)) * (GW + rr(.6, 3)); ty = rr(.2, 1.6); } }
  if (out === 'post') { if (Math.random() < .3) { ty = GH; tz = rr(-2.8, 2.8); } else { tz = (side || 1) * GW; ty = rr(.4, 2.1); } }
  const bl = out === 'block' && e.bl >= 0 ? P[o][e.bl] : null;
  if (bl) { const bx = lerp(sh.x, gx, .2), bz = lerp(sh.z, 0, .2); pin(bl, bx, bz, 1); await until(() => Math.hypot(bl.x - bx, bl.z - bz) < .7, .6); if (Math.hypot(bl.x - bx, bl.z - bz) > 2) place(bl, bx, bz); }
  // portero: sobre la línea entre balón y portería, más adelantado si el tiro es de cerca
  if (!pen) { const dd = Math.hypot(gx - sh.x, sh.z), off = clamp(dd * .12, .6, 3.2); pin(gk, gx - s * off, sh.z * off / Math.max(dd, 1) * 1.1, 1); }
  else { place(gk, gx - s * .3, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2); onLine(gk, gx - s * .3, true); } // penalti: sobre la línea, nunca sale hacia el que tira
  if (pen) { const spot = gx - s * 11; place(sh, spot - s * 2.6, -.9, s > 0 ? Math.PI / 2 : -Math.PI / 2); ball.st = 'held'; ball.own = null; ball.x = spot; ball.z = 0; ball.y = BR; await sleep(.7); pin(sh, spot - s * .45, -.25, .5); await until(() => Math.abs(sh.x - (spot - s * .45)) < .35, 1.5); ball.own = sh; }
  // golpeo
  if (gk.line) gk.line.sway = false;
  const gl = { x: gx + s * (out === 'goal' || out === 'var' ? NET - .35 : out === 'wide' ? 4 : 0), y: ty, z: tz };
  if (out === 'goal' || out === 'var') { gl.y = Math.min(ty, 1.5); }
  const spd = head ? 15 : k === 'long' ? 31 : pen ? 25 : 28, dist = Math.hypot(gl.x - (head ? ball.x : sh.x), gl.z - (head ? ball.z : sh.z));
  let dur = Math.max(.28, dist / spd);
  const save = out === 'save', hands = o2 => handPos(gk, o2);
  if (save) { gl.x = gx - s * .35; }
  if (bl) { gl.x = bl.x; gl.z = bl.z; gl.y = 1; dur = Math.max(.15, Math.hypot(bl.x - sh.x, bl.z - sh.z) / spd); }
  if (head) { // el centro ya va por el aire: salta y cabecea al llegar
    const left = ball.F ? Math.max(0, ball.F.t0 + ball.F.d - T) : 0; await sleep(Math.max(0, left - .36)); play(sh, 'header', .8); await sleep(Math.min(.36, left));
    ball.st = 'fly'; ball.own = null; ball.want = null; ball.end = null; ball.F = { a: { x: ball.x, y: Math.max(1.5, ball.y), z: ball.z }, b: gl, t0: T, d: dur, peak: .3, home: save ? hands : null }; sfx('kick');
  } else await strike(sh, gl.x, gl.y, gl.z, { k: 1, spd, dur, peak: gl.y > 1.6 ? .6 : .15, home: save ? hands : null, kd: pen ? .55 : .5 });
  focus = gk; hype = Math.max(hype, .45);
  // estirada
  if (!bl) { const gz = gk.z, reach = 1.55, dz = tz - gz, beaten = out === 'goal' || out === 'var', wrong = beaten && (Math.abs(tz) < 1.3 || Math.random() < .35);
    const dir = wrong ? -sgn(dz || 1) : sgn(dz || 1), need = wrong ? rr(1, 2) : beaten ? Math.max(0, Math.abs(dz) - reach - .9) : Math.max(0, Math.abs(dz) - reach), h = clamp(ty / 2.2, 0, 1);
    const big = Math.abs(dz) > 1.1 || wrong || out === 'post' || (out === 'wide' && Math.abs(tz) < GW + 1.5), lag = Math.max(0, dur - .5);
    if (big && (out !== 'wide' || Math.random() < .55)) { await sleep(Math.min(lag, .25)); unpin(gk); gk.faceT = { x: gk.x - s * 5, z: gk.z }; const ls = dir * s; // estirada hacia el lado del balón (el +x del portero mira hacia +z·s)
      play(gk, 'dive', 1.5, { s: ls, h }); gk.mv = { vx: 0, vz: dir * need / .38, t0: T + .12, t1: T + .5 }; await sleep(Math.max(0, dur - Math.min(lag, .25)));
    } else { if (save) play(gk, Math.abs(ty) > 1.4 ? 'claim' : 'catch', .8, {}); await sleep(dur); }
  } else await sleep(dur);
  // desenlace
  if (out === 'goal' || out === 'var') { RB.goal = { t: T, s, gx, sh, p, zs: sgn(sh.z || 1) }; // para la repetición
    const n = NETS.find(q => q.s === s); if (n) { n.a = .55; n.zl = ball.z * -s; n.yl = ball.y - .8; }
    ball.st = 'roll'; ball.net = s; ball.vx = s * 2; ball.vz = 0; ball.vy = -1; ball.F = null; hype = 1; focus = sh;
  } else if (save) { const catchIt = Math.abs(tz) < 1.6 && ty < 1.6 && (e.xg || .3) < .32 && !head;
    sfx('save'); if (catchIt) { attach(gk, true); } else { ball.st = 'fly'; ball.F = { a: { x: ball.x, y: ball.y, z: ball.z }, b: { x: gx - s * rr(4, 9), y: BR, z: ball.z + sgn(tz || 1) * rr(5, 10) }, t0: T, d: .7, peak: 1.5 }; ball.want = null; } }
  else if (out === 'post') { sfx('post'); ball.st = 'fly'; ball.F = { a: { x: ball.x, y: ball.y, z: ball.z }, b: { x: gx - s * rr(6, 12), y: BR, z: ball.z * .6 + rr(-5, 5) }, t0: T, d: .8, peak: 1.2 }; }
  else if (bl) { sfx('save'); play(bl, 'block', .7); ball.st = 'fly'; ball.F = { a: { x: ball.x, y: ball.y, z: ball.z }, b: { x: ball.x - s * rr(4, 8), y: BR, z: ball.z + rr(-8, 8) }, t0: T, d: .6, peak: 1 }; }
  else if (out === 'wide') { ball.st = 'fly'; ball.F = { a: { x: ball.x, y: ball.y, z: ball.z }, b: { x: gx + s * 7, y: BR, z: ball.z * 1.3 }, t0: T, d: .5, peak: .5 }; ball.want = null; }
  await sleep(.6);
  if (gk.act && gk.act.k === 'dive') await sleep(.5);
}
// después de un remate que no es gol: el balón acaba en el equipo que defendía
async function after(e) {
  const o = 1 - e.p, s = D(e.p), gx = gxOf(e.p), gk = P[o][0];
  if (ball.st === 'gk') { unpinAll(); await sleep(.6); return; }
  if (e.out === 'wide' || e.out === 'var') { await sleep(.3); await cut(() => { unpinAll(); place(gk, gx - s * 5.5, 0); ball.st = 'held'; ball.x = gx - s * 6; ball.z = 0; attach(gk); setCam('broad'); }); return; }
  const near = P[o].filter(q => !q.gk).sort((a, b) => Math.hypot(a.x - ball.x, a.z - ball.z) - Math.hypot(b.x - ball.x, b.z - ball.z))[0];
  const B = ball.F ? ball.F.b : ball; ball.want = near; pin(near, B.x, B.z, 1); await until(() => ball.own === near, 2.5); if (ball.own !== near) attach(near); unpinAll(); setCam('broad');
}
async function celebrate(p, i) {
  const pl = P[p][i], s = D(p); if (!pl) return; unpinAll(); hype = 1; focus = pl;
  const cz = pl.z >= 0 ? 1 : -1, CP = { x: s * (L - 5), z: cz * (WD - 5) }; pin(pl, lerp(pl.x, CP.x, .65), lerp(pl.z, CP.z, .65), 1); play(pl, 'plane', 9, { hold: 1, move: 1 });
  setCam('celeb', { who: pl });
  const mates = P[p].filter(q => q !== pl && !q.gk).sort((a, b) => Math.hypot(a.x - pl.x, a.z - pl.z) - Math.hypot(b.x - pl.x, b.z - pl.z)).slice(0, 4);
  mates.forEach((q, k) => pin(q, pl.pin.x - s * (1.2 + k * .5), pl.pin.z + (k % 2 ? 1 : -1) * (.8 + k * .3), 1));
  for (const q of P[1 - p]) { if (q.gk) play(q, 'down', 3, {}); else pin(q, q.x * .9, q.z, .2); }
  await sleep(1.5); play(pl, ['knee', 'fist', 'arms'][(pl.info.num || i) % 3], 1.4, {}); mates.forEach(q => { pin(q, pl.x - s * .9 + rr(-.5, .5), pl.z + rr(-.9, .9), .8); play(q, 'hug', 1.5, { hold: 0 }); });
  await sleep(1.1);
}
async function penFoul(e) { // el delantero entra en el área y le hacen penalti
  const p = e.p, o = 1 - p, s = D(p), gx = gxOf(p), sh = P[p][e.sh], dv = e.dv >= 0 ? P[o][e.dv] : TM[o].cb[0];
  setCam('shot', { gx }); const RP = { x: gx - s * 20, z: rr(-8, 8) };
  if (ball.own !== sh) { if (ball.own && ball.own.p === p) await pass(ball.own, sh, { at: RP }); else { await gain(p); await pass(ball.own, sh, { at: RP }); } }
  const IN = { x: gx - s * 13.5, z: RP.z * .6 }; pin(sh, IN.x, IN.z, 1); pin(dv, sh.x - s * 1, sh.z + 1.5, 1);
  await until(() => Math.abs(sh.x - IN.x) < 2.2, 2.4); dv.faceT = { x: sh.x, z: sh.z }; play(dv, 'slide', 1.1); dv.mv = { vx: (sh.x - dv.x) * 3, vz: (sh.z - dv.z) * 3, t0: T, t1: T + .3 };
  await sleep(.28); play(sh, 'fall', 1.6); sh.mv = { vx: s * 2, vz: 0, t0: T, t1: T + .3 }; ball.st = 'roll'; ball.own = null; ball.vx = s * 3; ball.vz = rr(-1, 1); ball.want = null; await sleep(1.2);
}
async function penSetup(e) {
  const p = e.p, o = 1 - p, s = D(p), gx = gxOf(p), sh = P[p][e.sh];
  await cut(() => { unpinAll(); const spot = gx - s * 11;
    for (const q of [0, 1]) P[q].forEach(pl => { if (pl === sh || pl === P[o][0]) return; const z = rr(-18, 18); place(pl, gx - s * rr(18, 22), z, s > 0 ? Math.PI / 2 : -Math.PI / 2); });
    place(P[o][0], gx - s * .3, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2); onLine(P[o][0], gx - s * .3, true); place(sh, spot - s * 2.6, -.9, s > 0 ? Math.PI / 2 : -Math.PI / 2);
    place(refP, spot - s * 3, 7); ball.st = 'held'; ball.own = null; ball.x = spot; ball.z = 0; ball.y = BR; focus = sh; setCam('pen', { gx }); });
}
async function soSetup() { await cut(() => { unpinAll(); for (const q of [0, 1]) P[q].forEach((pl, i) => { place(pl, q ? 2 : -2, -9 + i * 1.7, Math.PI / 2 * (q ? -1 : 1)); pl.yaw = Math.PI / 2; });
  place(refP, 3, 9); ball.st = 'loose'; ball.own = null; ball.x = 0; ball.z = 0; setCam('wide'); }); await sleep(.5); }
async function soKick(k) { // tanda: todos en la portería de la derecha
  const p = k.p, o = 1 - p, sh = P[p][k.s], gk = P[o][0], other = P[p][0];
  await cut(() => { place(gk, L - .3, 0, -Math.PI / 2); onLine(gk, L - .3, true); if (other !== sh) place(other, L - 18, 12, Math.PI / 2); for (const q of [0, 1]) P[q].forEach((pl, i) => { if (pl !== gk && pl !== other && pl !== sh) place(pl, q ? 2 : -2, -9 + i * 1.7, Math.PI / 2); }); });
  await outcome({ p, sh: k.s, k: 'pen', pen: 1, out: k.out, d: k.d, xg: .76, gx: L });
  if (k.goal) hype = .8;
}
async function card(p, i) { const pl = P[p][i]; if (!pl) return; pin(refP, pl.x - 1.6, pl.z + 1.2, 1); pin(pl, pl.x, pl.z, .2); await until(() => Math.hypot(refP.x - pl.x + 1.6, refP.z - pl.z - 1.2) < 1, 2); refP.faceT = { x: pl.x, z: pl.z };
  refP.card.visible = true; play(refP, 'card', 1.4); focus = pl; await sleep(1.3); refP.card.visible = false; unpin(refP); unpin(pl); }
async function whistle(end) { unpinAll(); for (const pl of all()) pin(pl, pl.x * .7, pl.z * .85, .25); setCam('wide'); await sleep(1.4); }
function finale(w) { unpinAll(); setCam('wide'); for (const p of [0, 1]) P[p].forEach(pl => { if (w < 0) return; if (p === w) { play(pl, 'arms', 3); pin(pl, pl.x * .6, pl.z * .6, .4); } else play(pl, 'down', 4, { hold: 1 }); }); hype = w >= 0 ? 1 : .4; }

const API = {
  ok() { if (SUP === null) { try { SUP = !!document.createElement('canvas').getContext('webgl2'); } catch (e) { SUP = false; } } return SUP && !failed; },
  // teams[p][i] = { n, sh (nombre corto), num, pac, img }
  start(el, o) {
    stop(); if (!API.ok()) return false;
    try { if (!R) init(); } catch (e) { failed = true; console.warn('FOOT3D', e); return false; }
    host = el; opts = o || {}; scene = new THREE.Scene(); T = 0; hype = .3; poss = 0; focus = null; WAITS.length = 0;
    const cols = [readCol('--p1', '#ff3344'), readCol('--p2', '#4aa3ff')], gc = gkCols(cols); KIT[0] = kitOf(0, cols, gc); KIT[1] = kitOf(1, cols, gc);
    try { buildStadium(cols); for (const p of [0, 1]) P[p] = (opts.teams[p] || []).slice(0, 11).map((info, i) => mkPlayer(p, i, info || {})); while (P[0].length < 11 || P[1].length < 11) throw new Error('teams'); refP = mkRef(); ball = mkBall(); TM[0] = teamIdx(P[0]); TM[1] = teamIdx(P[1]); recReset(); }
    catch (e) { console.warn('FOOT3D', e); stop(); return false; }
    host.prepend(cv); if (!tagEl) { tagEl = document.createElement('div'); tagEl.className = 'fm3-tag'; } host.appendChild(tagEl); tagEl.style.opacity = 0; tagEl._f = null;
    if (!fadeEl) { fadeEl = document.createElement('div'); fadeEl.className = 'fm3-fade'; } host.appendChild(fadeEl); fadeEl.style.opacity = 0;
    if (!rpEl) { rpEl = document.createElement('div'); rpEl.className = 'fm3-rp'; rpEl.setAttribute('aria-hidden', 'true'); rpEl.innerHTML = '<i></i><b>REPLAY</b>'; } host.appendChild(rpEl); rpBadge('', false);
    W = H = 0; resize(); ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => resize()) : null; if (ro) ro.observe(host);
    for (const p of [0, 1]) P[p].forEach(pl => { const w = kickoffPos(pl, p === 0); place(pl, w.x, w.z); });
    place(refP, -6, 8); CAM.snap = true; setCam('wide');
    on = true; last = performance.now(); const g = ++gen; requestAnimationFrame(() => loop(g)); return true;
  },
  stop,
  walkout, kickoff, idle, build, chance, outcome, after, celebrate, penFoul, penSetup, soSetup, soKick, card, whistle, finale, replay,
  var(p) { const gk = P[1 - p] && P[1 - p][0]; if (gk && ball) { attach(gk, true); } },
  // posición en pantalla (en %) de un punto del campo: para colocar los rótulos
  scr(x, y, z) { if (!cam || !W) return { x: 50, y: 40 }; prj.set(x, y, z).project(cam); return { x: clamp((prj.x + 1) / 2 * 100, 6, 94), y: clamp((1 - prj.y) / 2 * 100, 8, 92) }; },
  goalScr(p) { return API.scr(gxOf(p), GH + 1.2, 0); },
  _dbg() { return { P, ball, CAM, T, scene, R, poss, TM, RB, RP }; },
  _speed(k) { SPEED = k; },
  _freeze(v) { FRZ = !!v; }, // congela la escena tal cual (depurar)
  _tick(n = 1, dt = 1 / 30) { if (!on) return; for (let i = 0; i < n; i++) frame(dt); }, // avanza la escena a mano (pestaña oculta)
};
window.FOOT3D = API;
window.dispatchEvent(new Event('foot3d-ready'));
