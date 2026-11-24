/* BidVerse 3D · MODELO de un luchador: figura de estilo anime (cabeza grande, sombreado de 3 tonos y contorno negro)
   hecha con piezas articuladas. Mira hacia +z; las articulaciones (J) son las que mueve f3d/anim.js. */
import * as THREE from 'three';
import { drawFace, FACE } from './face.js';

const UP = new THREE.Vector3(0, 1, 0);
export const GRAD = (() => { const t = new THREE.DataTexture(new Uint8Array([72, 150, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
export const OL_U = { th: { value: .0036 }, asp: { value: 1 } }; // grosor del contorno (en pantalla) y proporción de la cámara, compartidos
function outlineMat() {
  return new THREE.ShaderMaterial({
    uniforms: { th: OL_U.th, asp: OL_U.asp, col: { value: new THREE.Color(0x0a0710) }, op: { value: 1 } },
    vertexShader: `uniform float th;uniform float asp;
void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);vec3 n=normalize(normalMatrix*normal);vec4 c=projectionMatrix*vec4(n,0.0);
vec2 d=c.xy;float l=length(d);d=l>1e-5?d/l:vec2(0.0);p.xy+=d*vec2(1.0/asp,1.0)*th*p.w*2.0;gl_Position=p;}`,
    fragmentShader: `uniform vec3 col;uniform float op;void main(){gl_FragColor=vec4(col,op);}`,
    side: THREE.BackSide
  });
}
const BUILD = { m: [1, 1, 1, 1], f: [.95, .84, .82, 1.02], big: [1.08, 1.24, 1.32, .92], huge: [1.26, 1.42, 1.5, .84], kid: [.8, .92, .9, 1.14], slim: [1.02, .9, .82, .98], tall: [1.14, 1, .95, .9] }; // escala, hombros, grosor, cabeza
const hsh = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng0 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const dirOf = (az, el) => new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); // az 0 = delante (+z)

export function buildFighter(name, lk) {
  const [S, SW, LW, HD] = BUILD[lk.b] || BUILD.m, rnd = rng0(hsh(name));
  const F = { name, look: lk, root: new THREE.Group(), J: {}, mats: [], geos: new Set(), ol: outlineMat(), tails: [], kag: [], extra: {} };
  const matC = new Map();
  F.mat = (col, o = {}) => {
    const k = col + (o.glow || 0) + (o.side || 0); let m = matC.get(k);
    if (!m) {
      m = new THREE.MeshToonMaterial({ color: new THREE.Color(col), gradientMap: GRAD, side: o.side ? THREE.DoubleSide : THREE.FrontSide });
      if (o.glow || lk.glow) { m.emissive = new THREE.Color(col); m.emissiveIntensity = o.glow || .35; }
      matC.set(k, m); F.mats.push(m);
    }
    return m;
  };
  const part = (geo, col, parent, pos, rot, scl, o = {}) => {
    const m = new THREE.Mesh(geo, o.mat || F.mat(col, o));
    if (pos) m.position.set(pos[0], pos[1], pos[2]); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); if (scl) m.scale.set(scl[0], scl[1], scl[2]);
    if (!o.noOl) { const ol = new THREE.Mesh(geo, F.ol); ol.userData.ol = 1; m.add(ol); }
    parent.add(m); F.geos.add(geo); return m;
  };
  const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 14), sph = (r, w = 22, h = 14) => new THREE.SphereGeometry(r, w, h);
  const joint = (k, parent, x, y, z) => { const j = new THREE.Group(); j.position.set(x, y, z); parent.add(j); F.J[k] = j; return j; };
  const limb = (j, len, r, col, o) => part(cap(r, Math.max(.01, len - r * .6)), col, j, [0, -len / 2, 0], null, null, o);

  const sk = lk.sk || '#f3c9a4', top = lk.t || '#555566', pants = lk.p || '#2a2a33', shoes = lk.sh || '#1b1b1b', hands = lk.g || sk;
  const slv = lk.sl == null ? 1 : lk.sl, armU = slv >= 1 ? top : sk, armL = slv >= 2 ? top : sk;
  const hipY = .92, R = .29 * HD;
  F.root.scale.setScalar(S); F.S = S; F.H = (hipY + .05 + .22 + .34 + .12 + R * .85 + R) * S;
  const body = joint('body', F.root, 0, hipY, 0);
  part(sph(.17), pants, body, [0, -.02, 0], null, [1.3 * SW, .9, .95]);
  const spine = joint('spine', body, 0, .05, 0);
  part(cap(.15 * Math.sqrt(SW), .14), top, spine, [0, .12, 0], null, [1.18 * SW, 1, .82]);
  if (lk.bl) part(new THREE.CylinderGeometry(.165 * Math.sqrt(SW) * 1.18, .17 * Math.sqrt(SW) * 1.18, .06, 20), lk.bl, spine, [0, .0, 0], null, [1, 1, .74]);
  const chest = joint('chest', spine, 0, .22, 0);
  part(cap(.19, .17), top, chest, [0, .16, 0], null, [1.36 * SW, 1, .82]);
  if (lk.t2) part(cap(.1, .1), lk.t2, chest, [0, .2, .1], null, [1.1, 1, .7], { noOl: true }); // camiseta interior / cuello
  const neck = joint('neck', chest, 0, .34, 0);
  part(new THREE.CylinderGeometry(.06, .07, .16, 12), sk, neck, [0, .04, 0]);
  const head = joint('head', neck, 0, .12, 0), HC = R * .85;
  F.headC = new THREE.Vector3(0, HC, 0); F.R = R;
  const skull = part(sph(R, 28, 20), sk, head, [0, HC, 0], null, [1, 1.03, .97]);
  // cara
  const fc = document.createElement('canvas'); fc.width = FACE.W; fc.height = FACE.H; const fg = fc.getContext('2d');
  const tex = new THREE.CanvasTexture(fc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  F.faceMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const fgeo = new THREE.SphereGeometry(R * 1.012, 40, 20, Math.PI / 2 - 1.15, 2.3, 1.0, 1.4); // la cara cubre ~130° × 80° de la cabeza F.geos.add(fgeo);
  const face = new THREE.Mesh(fgeo, F.faceMat); face.scale.set(1, 1.03, .97); face.position.y = HC; head.add(face); F.face = face;
  F.expr = '';
  F.setExpr = e => { if (e === F.expr) return; F.expr = e; drawFace(fg, lk, e); tex.needsUpdate = true; };
  F.setExpr('n');
  // pelo
  const hc = lk.hc || '#151515', hairG = new THREE.Group(); hairG.position.y = HC; head.add(hairG);
  const capH = (th, tilt = -.3, k = 1.06, col = hc) => part(new THREE.SphereGeometry(R * k, 26, 14, 0, Math.PI * 2, 0, th), col, hairG, [0, 0, 0], [tilt, 0, 0]);
  const spike = (base, dir, len, rad, col = hc) => { const g = new THREE.ConeGeometry(rad, len, 8); g.translate(0, len / 2, 0); const m = part(g, col, hairG); m.quaternion.setFromUnitVectors(UP, dir.clone().normalize()); m.position.copy(base).multiplyScalar(R * .84); return m; };
  const ball = (az, el, r, d = .95, col = hc) => part(sph(r, 14, 10), col, hairG, dirOf(az, el).multiplyScalar(R * d).toArray());
  const bangs = (n, len, spread = .5, down = -.45) => { for (let i = 0; i < n; i++) { const az = (i / (n - 1 || 1) - .5) * spread * 2, b = dirOf(az, .62); spike(b, dirOf(az * 1.2, down).add(new THREE.Vector3(0, 0, .3)), len * (.8 + rnd() * .4), .07); } };
  const back = (len = .55, w = 1.5, col = hc) => part(cap(.16, len), col, hairG, [0, -R * .2 - len * .45, -R * .62], [.12, 0, 0], [w, 1, .55]);
  const hs = lk.hs || 'short';
  if (hs !== 'bald') {
    if (hs === 'dome') capH(1.25, -.2, 1.03);
    else if (hs === 'buzz') capH(1.3, -.25, 1.03);
    else if (hs === 'bowl') { capH(1.55, -.32, 1.08); }
    else if (hs === 'bob') { capH(1.15, -.25, 1.07); part(new THREE.SphereGeometry(R * 1.09, 26, 14, Math.PI / 2 + .85, Math.PI * 2 - 1.7, .4, 1.55), hc, hairG, [0, 0, 0], null, null, { side: 1 }); bangs(4, .16, .55, -.7); }
    else capH(hs === 'topknot' ? .95 : 1.22, hs === 'slick' ? -.42 : -.3);
    if (hs === 'spiky') { for (let i = 0; i < 11; i++) { const az = 1.05 + (i / 10) * 4.2 + (rnd() - .5) * .2, el = .3 + rnd() * .65; spike(dirOf(az, el * .8), dirOf(az, el + .25), .3 + rnd() * .18, .1 + rnd() * .03); }
      for (let i = 0; i < 3; i++) spike(dirOf((i - 1) * .5, 1.15), dirOf((i - 1) * .9, 1.3), .32 + rnd() * .1, .1); bangs(3, .2, .45); }
    else if (hs === 'tall') { for (let i = 0; i < 5; i++) { const az = (i / 4) * 6.28, el = 1.25 + rnd() * .2; spike(dirOf(az, 1.2), dirOf(az, el), .5 + rnd() * .25, .1 + rnd() * .04); } spike(dirOf(0, 1.5), UP, .7, .13); bangs(3, .18, .4); }
    else if (hs === 'flame') { for (let i = 0; i < 8; i++) { const az = 2.2 + (i / 7) * 1.9, el = .9 + rnd() * .4; spike(dirOf(az, 1), dirOf(az, el).add(new THREE.Vector3(0, .4, 0)), .42 + rnd() * .18, .11); } spike(dirOf(0, 1.25), dirOf(Math.PI, 1.2), .5, .14); }
    else if (hs === 'messy') { for (let i = 0; i < 14; i++) { const az = rnd() * 6.28, el = .35 + rnd() * .9; if (Math.cos(az) > .7 && el < .9) continue; spike(dirOf(az, el * .85), dirOf(az, el + .1), .16 + rnd() * .12, .085); } bangs(4, .2, .5); }
    else if (hs === 'wild') { for (let i = 0; i < 16; i++) { const az = 1 + rnd() * 4.3, el = -.2 + rnd() * 1.1; spike(dirOf(az, el * .7), dirOf(az, el - .1), .35 + rnd() * .25, .12); } back(.7, 1.9); bangs(3, .2, .5); }
    else if (hs === 'long') { back(.62, 1.6); for (const s of [-1, 1]) part(cap(.06, .34), hc, hairG, [s * R * .8, -R * .55, R * .15], [0, 0, s * .08]); bangs(3, .17, .45); }
    else if (hs === 'pony') { part(cap(.07, .42), hc, hairG, [0, -R * .35, -R * 1.05], [.55, 0, 0]); bangs(3, .17, .45); }
    else if (hs === 'bun') { ball(Math.PI, .7, .12, 1.02); bangs(3, .16, .45); }
    else if (hs === 'twinbun') { ball(Math.PI * .72, .75, .1, 1); ball(-Math.PI * .72, .75, .1, 1); bangs(3, .15, .45); }
    else if (hs === 'twin') { for (const s of [-1, 1]) part(cap(.07, .45), hc, hairG, [s * R * .72, -R * .55, -R * .55], [.2, 0, s * .15]); bangs(3, .16, .45); }
    else if (hs === 'fluffy' || hs === 'curly') { const n = hs === 'curly' ? 18 : 13; for (let i = 0; i < n; i++) { const az = rnd() * 6.28, el = .15 + rnd() * 1.2; if (Math.cos(az) > .75 && el < .8) continue; ball(az, el, (hs === 'curly' ? .085 : .11) + rnd() * .03, 1); } if (hs === 'fluffy') for (let i = 0; i < 6; i++) { const az = 1.4 + rnd() * 3.4, el = .3 + rnd() * .8; spike(dirOf(az, el), dirOf(az, el), .17, .09); } bangs(3, .15, .45); }
    else if (hs === 'pomp') { part(cap(.15, .32), hc, hairG, [0, R * .78, R * .38], [Math.PI / 2 - .35, 0, 0], [1.1, 1, .8]); }
    else if (hs === 'crest') { const g = new THREE.ConeGeometry(.2, .55, 4); g.translate(0, .27, 0); const m = part(g, hc, hairG, [0, R * .7, -R * .2], [-.9, 0, 0], [.35, 1, 1]); for (const s of [-1, 1]) part(g, hc, hairG, [s * R * .55, R * .5, -R * .1], [-.8, 0, s * .6], [.25, .7, .8]); }
    else if (hs === 'topknot') { ball(Math.PI, 1.2, .1, 1.08); }
    else if (hs === 'side') { part(cap(.09, .26), hc, hairG, [R * .25, R * .42, R * .82], [.3, 0, 1.05], [1, 1, .45]); bangs(2, .15, .3); }
    else if (hs === 'undercut') { for (const s of [-1, 1]) part(cap(.08, .2), hc, hairG, [s * R * .32, R * .55, R * .72], [.5, 0, s * 1.2], [1, 1, .5]); }
    else if (hs === 'slick') { for (let i = 0; i < 4; i++) { const az = Math.PI + (i - 1.5) * .45; spike(dirOf(az, .5), dirOf(az, -.3), .18, .09); } }
    else if (hs === 'short') bangs(4, .15, .5);
  }
  // brazos y piernas
  for (const [s, k] of [[1, 'L'], [-1, 'R']]) {
    const sh = joint('sh' + k, chest, s * .25 * SW, .28, 0);
    part(sph(.1 * LW), armU, sh, [0, -.02, 0]);
    limb(sh, .3, .075 * LW, armU);
    const el = joint('el' + k, sh, 0, -.3, 0);
    limb(el, .28, .066 * LW, armL);
    const hd = joint('hd' + k, el, 0, -.28, 0);
    part(sph(.082 * LW, 16, 12), hands, hd, [0, -.02, 0], null, [1, 1.1, 1.05]);
    const hp = joint('hp' + k, body, s * .11 * SW, -.05, 0);
    limb(hp, .44, .1 * LW, pants);
    const kn = joint('kn' + k, hp, 0, -.44, 0);
    limb(kn, .42, .086 * LW, pants);
    const ft = joint('ft' + k, kn, 0, -.42, 0);
    part(cap(.068 * Math.sqrt(LW), .13), shoes, ft, [0, -.02, .06], [Math.PI / 2, 0, 0]);
  }
  const J = F.J, X = lk.x || {}, ex = (k, d) => X[k] === true ? d : X[k] || d;
  // extras
  if (X.cape) { const g = new THREE.BoxGeometry(.62 * SW, 1.2, .025); g.translate(0, -.6, 0); const p = joint('cape', chest, 0, .36, -.17); part(g, ex('cape', '#f2f2f2'), p, null, [.12, 0, 0]); F.cape = p; }
  if (X.coat) { const g = new THREE.CylinderGeometry(.25 * SW, .38 * SW, .86, 22, 1, true, .7, Math.PI * 2 - 1.4); g.translate(0, -.43, 0); const p = joint('coat', spine, 0, .2, 0); part(g, ex('coat', '#f2f2f2'), p, null, null, [1, 1, .85], { side: 1 }); F.coat = p;
    part(cap(.11 * LW, .05), ex('coat', '#f2f2f2'), J.shL, [0, -.06, 0], null, [1.15, 1, 1.15], { noOl: true }); part(cap(.11 * LW, .05), ex('coat', '#f2f2f2'), J.shR, [0, -.06, 0], null, [1.15, 1, 1.15], { noOl: true }); }
  if (X.scarf) { part(new THREE.TorusGeometry(.12, .05, 8, 20), ex('scarf', '#c41e2a'), neck, [0, 0, 0], [Math.PI / 2, 0, 0]); part(cap(.045, .3), ex('scarf', '#c41e2a'), neck, [.06, -.15, -.12], [.4, 0, .1]); }
  if (X.band) { part(new THREE.CylinderGeometry(R * 1.05, R * 1.05, .075, 26, 1, true), ex('band', '#2c3e70'), head, [0, HC + R * .38, 0], [-.18, 0, 0], null, { side: 1 }); part(new THREE.BoxGeometry(.2, .065, .02), '#c8ccd4', head, [0, HC + R * .42, R * .98], [-.25, 0, 0], null, { noOl: true }); }
  if (X.turban) { part(sph(R * 1.12, 20, 14), ex('turban', '#f4f4f4'), head, [0, HC + R * .5, -R * .05], null, [1, .75, 1.05]); part(new THREE.CylinderGeometry(R * 1.1, R * 1.1, .05, 22, 1, true), '#7a3ab8', head, [0, HC + R * .32, 0], null, null, { side: 1, noOl: true }); }
  if (X.horns) for (const s of [-1, 1]) { const g = new THREE.ConeGeometry(.055, .32, 8); g.translate(0, .16, 0); part(g, ex('horns', '#e8e2d0'), head, [s * R * .5, HC + R * .72, -R * .1], [-.2, 0, -s * .45]); }
  if (X.ears) for (const s of [-1, 1]) { const g = new THREE.ConeGeometry(.1, .26, 4); g.translate(0, .13, 0); part(g, ex('ears', sk), head, [s * R * .62, HC + R * .66, -R * .05], [0, 0, -s * .38], [1, 1, .35]); }
  if (X.halo) { const m = new THREE.Mesh(new THREE.TorusGeometry(R * .9, .022, 8, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(ex('halo', '#ffd23f')).multiplyScalar(2.6) })); m.position.set(0, HC + R * 1.45, -R * .15); m.rotation.x = Math.PI / 2 - .25; head.add(m); F.geos.add(m.geometry); F.extra.halo = m; }
  if (X.wheel) { const w = new THREE.Group(); w.position.set(0, HC + R * 1.6, 0); head.add(w); const c = ex('wheel', '#d4af37'); part(new THREE.TorusGeometry(.32, .035, 8, 32), c, w, null, [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; part(new THREE.CylinderGeometry(.02, .02, .64, 6), c, w, [0, 0, 0], [Math.PI / 2, 0, a], null, { noOl: true }); part(sph(.05, 8, 6), c, w, [Math.cos(a) * .32, 0, Math.sin(a) * .32]); }
    F.extra.wheel = w; }
  if (X.wings) for (const s of [-1, 1]) part(sph(.4, 16, 10), ex('wings', '#f2f2f2'), chest, [s * .34, .3, -.24], [.2, s * .5, s * .7], [.35, 1, .1]);
  if (X.tail) { let par = body; const c = ex('tail', sk); for (let i = 0; i < 4; i++) { const t = joint('tail' + i, par, 0, i ? -.2 : -.02, i ? 0 : -.14); t.rotation.x = i ? -.35 : 1.9; part(cap(.06 - i * .008, .16), c, t, [0, -.1, 0]); F.tails.push(t); par = t; } }
  if (X.kagune) for (let i = 0; i < 4; i++) { const t = joint('kg' + i, body, (i - 1.5) * .07, .1, -.15); t.rotation.set(-.9 + (i % 2) * .3, 0, (i - 1.5) * .55); const g = new THREE.ConeGeometry(.07, 1.3, 10); g.translate(0, .65, 0); part(g, ex('kagune', '#d1132b'), t, null, null, null, { glow: .5 }); F.kag.push(t); }
  if (X.gourd) { part(sph(.17, 16, 12), ex('gourd', '#c8a165'), chest, [.05, .05, -.28]); part(sph(.12, 14, 10), ex('gourd', '#c8a165'), chest, [.05, .33, -.27]); }
  if (X.glasses) for (const s of [-1, 1]) part(new THREE.TorusGeometry(.055, .009, 6, 18), ex('glasses', '#1b1b1b'), head, [s * R * .32, HC + R * .1, R * .98], [0, s * .25, 0], null, { noOl: true });
  if (X.mustache) for (const s of [-1, 1]) part(cap(.03, lk.b === 'huge' ? .2 : .1), ex('mustache', '#f2f2f2'), head, [s * R * .2, HC - R * .28, R * .93], [0, 0, s * (lk.b === 'huge' ? 1.1 : 1.35)]);
  if (X.beard) part(sph(R * .55, 16, 12), ex('beard', '#f2f2f2'), head, [0, HC - R * .72, R * .5], [.3, 0, 0], [1, 1.25, .7]);
  if (X.flower) part(sph(.06, 10, 8), ex('flower', '#f2f2f2'), head, [R * .7, HC + R * .5, R * .2]);
  if (X.tentacles) for (let i = 0; i < 6; i++) { const a = (i / 5 - .5) * 2.4; part(cap(.035, .2), ex('tentacles', '#8a2a2a'), head, [Math.sin(a) * R * .8, HC - R * .75, Math.cos(a) * R * .55], [.2, 0, Math.sin(a) * .3]); }
  if (X.volcano) { part(new THREE.CylinderGeometry(R * .55, R * .95, R * .7, 18), '#2b1f1a', head, [0, HC + R * .8, 0]); const m = new THREE.Mesh(new THREE.CircleGeometry(R * .48, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(ex('volcano', '#ff6a1a')).multiplyScalar(3) })); m.rotation.x = -Math.PI / 2; m.position.set(0, HC + R * 1.16, 0); head.add(m); F.geos.add(m.geometry); }
  if (X.boar) { skull.visible = face.visible = false; hairG.visible = false; const c = ex('boar', '#8a8a92'); part(sph(R * 1.14, 22, 16), c, head, [0, HC, 0], null, [1, .95, 1.1]); part(new THREE.CylinderGeometry(.11, .13, .2, 14), '#c8a8a8', head, [0, HC - R * .2, R * 1.05], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) { const g = new THREE.ConeGeometry(.09, .2, 5); part(g, c, head, [s * R * .6, HC + R * .85, 0], [0, 0, -s * .5]); part(sph(.035, 8, 6), '#1b1b1b', head, [s * R * .38, HC + R * .25, R * 1.02], null, null, { noOl: true }); } }
  if (X.hat) { const h = X.hat, hg = new THREE.Group(); hg.position.set(0, HC + R * .62, -R * .02); hg.rotation.x = -.12; head.add(hg);
    if (h === 'straw' || h === 'cow' || h === 'wide' || h === 'hokage') {
      const c = h === 'straw' ? '#e8c86a' : h === 'cow' ? '#e8862a' : h === 'hokage' ? '#f2f2f2' : '#2b1a1a', br = h === 'wide' || h === 'hokage' ? R * 2.1 : R * 1.85;
      if (h === 'hokage') part(new THREE.ConeGeometry(br, R * .9, 28, 1, true), c, hg, [0, R * .35, 0], null, null, { side: 1 });
      else { part(new THREE.CylinderGeometry(br, br, .02, 32), c, hg); part(sph(R * 1.04, 22, 12), c, hg, [0, .02, 0], null, [1, .8, 1]); if (h === 'straw') part(new THREE.CylinderGeometry(R * 1.02, R * 1.05, .07, 24), '#c8202a', hg, [0, .06, 0], null, null, { noOl: true }); }
    } else if (h === 'law') { part(new THREE.CylinderGeometry(R * 1.12, R * 1.08, R * .95, 24), '#f2f2f2', hg, [0, R * .3, 0]); for (let i = 0; i < 5; i++) { const a = i * 1.25; part(sph(.04, 8, 6), '#3a2a1a', hg, [Math.sin(a) * R * 1.12, R * .3 + (i % 2) * .08, Math.cos(a) * R * 1.12], null, null, { noOl: true }); } }
    else { part(new THREE.CylinderGeometry(R * 1.1, R * 1.05, R * .45, 24), '#1b1b26', hg, [0, R * .05, 0]); part(new THREE.BoxGeometry(R * 1.3, .03, R * .7), '#1b1b26', hg, [0, -R * .12, R * 1.05], [.25, 0, 0]); part(new THREE.BoxGeometry(.12, .07, .02), '#d4af37', hg, [0, R * .05, R * 1.1], null, null, { noOl: true }); }
  }
  // armas (en la mano derecha, apuntando hacia delante de la mano: +z)
  const blade = (hd, col, len, wide) => { const g = new THREE.Group(); hd.add(g); g.position.set(0, -.03, 0);
    part(new THREE.CylinderGeometry(.026, .026, .24, 8), '#2a1f1f', g, [0, 0, .02], [Math.PI / 2, 0, 0]);
    part(new THREE.CylinderGeometry(wide ? .1 : .065, wide ? .1 : .065, .02, 14), '#c8a040', g, [0, 0, .15], [Math.PI / 2, 0, 0]);
    const b = new THREE.BoxGeometry(wide ? .05 : .022, wide ? .24 : .055, len); b.translate(0, 0, .16 + len / 2); part(b, col, g, null, null, null, { glow: .12 }); return g; };
  if (X.sword) F.extra.weapon = blade(J.hdR, ex('sword', '#d8dde6'), .95, false);
  if (X.bigsword) F.extra.weapon = blade(J.hdR, ex('bigsword', '#5a5a66'), 1.45, true);
  if (X.dual) { F.extra.weapon = blade(J.hdR, ex('dual', '#d8dde6'), .85, false); blade(J.hdL, ex('dual', '#d8dde6'), .85, false); }
  const pole = (col, len, tip) => { const g = new THREE.Group(); J.hdR.add(g); g.position.y = -.03; part(new THREE.CylinderGeometry(.03, .03, len, 10), col, g, [0, 0, .2], [Math.PI / 2, 0, 0]);
    if (tip === 'spear') { const c = new THREE.ConeGeometry(.06, .28, 8); part(c, '#d8dde6', g, [0, 0, .2 + len / 2 + .12], [Math.PI / 2, 0, 0]); }
    if (tip === 'axe') part(new THREE.BoxGeometry(.03, .42, .3), '#c8ccd4', g, [0, .14, .2 + len / 2 - .12]);
    if (tip === 'hammer') part(new THREE.CylinderGeometry(.13, .13, .36, 14), col, g, [0, 0, .2 + len / 2]);
    if (tip === 'club') part(new THREE.CylinderGeometry(.1, .07, .9, 10), col, g, [0, 0, .2 + len / 2 - .2], [Math.PI / 2, 0, 0]);
    F.extra.weapon = g; return g; };
  if (X.staff) pole(ex('staff', '#5a3a2a'), 1.8);
  if (X.spear) pole(ex('spear', '#8a8a92'), 1.8, 'spear');
  if (X.axe) pole('#5a3a2a', 1.1, 'axe');
  if (X.hammer) pole(ex('hammer', '#6a6a72'), .7, 'hammer');
  if (X.club) pole(ex('club', '#3a3a42'), .9, 'club');
  if (X.gun) { part(new THREE.BoxGeometry(.07, .1, .26), '#c8ccd4', J.hdR, [0, -.02, .12]); const m = new THREE.Mesh(sph(.04, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(ex('gun', '#7dff8a')).multiplyScalar(3) })); m.position.set(0, -.02, .27); J.hdR.add(m); }
  if (X.book) part(new THREE.BoxGeometry(.04, .2, .15), ex('book', '#151515'), J.hdL, [.04, -.05, .04]);
  if (X.chain) for (let i = 0; i < 3; i++) part(new THREE.TorusGeometry(.03, .008, 6, 12), ex('chain', '#c8ccd4'), J.hdR, [0, -.06 - i * .05, .05], [0, i % 2 ? Math.PI / 2 : 0, 0], null, { noOl: true });
  if (X.blade) part(new THREE.BoxGeometry(.03, .7, .12), ex('blade', '#f2f2f2'), J.elR, [0, -.55, .05], null, null, { glow: .15 });
  F.armed = !!(X.sword || X.bigsword || X.dual);
  F.pole = !!(X.staff || X.spear || X.axe || X.hammer || X.club);
  // opacidad (desintegración, ilusiones) y limpieza
  F.opacity = o => { const t = o < .999; for (const m of F.mats) { m.transparent = t; m.opacity = o; m.depthWrite = !t || o > .5; } F.ol.uniforms.op.value = o; F.ol.transparent = t; F.faceMat.opacity = o; };
  F.dispose = () => { F.geos.forEach(g => g.dispose()); F.mats.forEach(m => m.dispose()); F.ol.dispose(); F.faceMat.dispose(); tex.dispose(); };
  return F;
}
// Copia fantasma (estelas, clones de Naruto, sombras de Sung Jin-Woo): misma pose, un solo material translúcido
export function ghostOf(F, color, opacity, additive = true) {
  const g = F.root.clone(true), mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  g.traverse(o => { if (o.isMesh) { if (o.userData.ol || o.material === F.faceMat) o.visible = false; else o.material = mat; } });
  g.userData.mat = mat; return g;
}
