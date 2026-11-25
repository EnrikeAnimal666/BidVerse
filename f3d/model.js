/* BidVerse 3D · MODELO de un luchador: figura de estilo anime (cabeza grande, sombreado de 3 tonos y contorno negro)
   hecha con piezas articuladas. Mira hacia +z; las articulaciones (J) son las que mueve f3d/anim.js. */
import * as THREE from 'three';
import { drawFace, FACE } from './face.js';
import { buildHair } from './hair.js';
import { paintTorso, paintCoat } from './paint.js';

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

// Cráneo de anime: redondo arriba y la mitad de abajo se estrecha hacia una barbilla en punta (se aplica igual a la cabeza y a la cara)
function animeHead(g, R) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y >= 0) continue;
    const t = Math.min(1, -y / R), front = Math.max(0, z / R), k = 1 - .34 * t * t;
    p.setXYZ(i, x * k, y * (1 + .16 * t * front), z * (1 - .1 * t) + R * .07 * t * t * front); }
  g.computeVertexNormals(); return g;
}
export function buildFighter(name, lk) {
  const [S, SW, LW, HD] = BUILD[lk.b] || BUILD.m, rnd = rng0(hsh(name));
  const F = { name, look: lk, root: new THREE.Group(), J: {}, mats: [], geos: new Set(), texs: [], ol: outlineMat(), tails: [], kag: [], extra: {} };
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
  const texMat = (canvas, rep, off, side) => { // material con una textura pintada (ropa)
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = THREE.RepeatWrapping; if (rep) { t.repeat.set(rep[0], rep[1]); t.offset.set(off[0], off[1]); }
    const m = new THREE.MeshToonMaterial({ color: 0xffffff, map: t, gradientMap: GRAD, side: side ? THREE.DoubleSide : THREE.FrontSide });
    if (lk.glow) { m.emissive = new THREE.Color(lk.t || '#ffffff'); m.emissiveIntensity = .3; }
    F.mats.push(m); F.texs.push(t); return m;
  };
  const part = (geo, col, parent, pos, rot, scl, o = {}) => {
    const m = new THREE.Mesh(geo, o.mat || F.mat(col, o));
    if (pos) m.position.set(pos[0], pos[1], pos[2]); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); if (scl) m.scale.set(scl[0], scl[1], scl[2]);
    if (!o.noOl) { const ol = new THREE.Mesh(geo, F.ol); ol.userData.ol = 1; m.add(ol); }
    parent.add(m); if (!o.shared) F.geos.add(geo); return m;
  };
  const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 16), sph = (r, w = 22, h = 14) => new THREE.SphereGeometry(r, w, h);
  const joint = (k, parent, x, y, z) => { const j = new THREE.Group(); j.position.set(x, y, z); parent.add(j); F.J[k] = j; return j; };
  const limb = (j, len, r, col, o) => part(cap(r, Math.max(.01, len - r * .6)), col, j, [0, -len / 2, 0], null, null, o);

  const sk = lk.sk || '#f3c9a4', top = lk.t || '#555566', pants = lk.p || '#2a2a33', shoes = lk.sh || '#1b1b1b', hands = lk.g || sk;
  const slv = lk.sl == null ? 1 : lk.sl, armU = slv >= 1 ? top : sk, armL = slv >= 2 ? top : sk;
  const hipY = 1.02, R = .225 * HD; // proporciones de anime (~5 cabezas), no chibi
  F.hipY = hipY; F.root.scale.setScalar(S); F.S = S;
  // ropa pintada: el mismo lienzo para el pecho (mitad de arriba) y el abdomen (mitad de abajo)
  const tc = paintTorso(lk, name), chestM = texMat(tc, [1, .5], [0, .5]), absM = texMat(tc, [1, .5], [0, 0]);
  const body = joint('body', F.root, 0, hipY, 0);
  part(sph(.15), pants, body, [0, -.02, 0], null, [1.28 * SW, .9, .95]);
  const spine = joint('spine', body, 0, .05, 0);
  part(cap(.135 * Math.sqrt(SW), .16), null, spine, [0, .13, 0], [0, Math.PI, 0], [1.15 * SW, 1, .8], { mat: absM });
  if (lk.bl) part(new THREE.CylinderGeometry(.158 * SW, .162 * SW, .055, 22), lk.bl, spine, [0, .0, 0], null, [1, 1, .74]);
  const chest = joint('chest', spine, 0, .24, 0);
  part(cap(.17, .2), null, chest, [0, .17, 0], [0, Math.PI, 0], [1.42 * SW, 1, .78], { mat: chestM });
  const neck = joint('neck', chest, 0, .38, 0);
  part(new THREE.CylinderGeometry(.046, .056, .15, 12), sk, neck, [0, .04, 0]);
  const head = joint('head', neck, 0, .1, 0), HC = R * .92;
  F.headC = new THREE.Vector3(0, HC, 0); F.R = R;
  const skull = part(animeHead(sph(R, 32, 24), R), sk, head, [0, HC, 0], null, [.95, 1.04, .98]);
  // cara
  const fc = document.createElement('canvas'); fc.width = FACE.W; fc.height = FACE.H; const fg = fc.getContext('2d');
  const tex = new THREE.CanvasTexture(fc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  F.faceMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const fgeo = animeHead(new THREE.SphereGeometry(R * 1.012, 40, 20, Math.PI / 2 - 1.15, 2.3, 1.0, 1.4), R); F.geos.add(fgeo); // la cara cubre ~130° × 80° de la cabeza
  const face = new THREE.Mesh(fgeo, F.faceMat); face.scale.set(.95, 1.04, .98); face.position.y = HC; head.add(face); F.face = face;
  F.expr = '';
  F.setExpr = e => { if (e === F.expr) return; F.expr = e; drawFace(fg, lk, e); tex.needsUpdate = true; };
  F.setExpr('n');
  // pelo (f3d/hair.js)
  const hairG = new THREE.Group(); hairG.position.y = HC; head.add(hairG);
  buildHair({ part, g: hairG, R, rnd, name }, lk);
  // abrigo / haori: tela pintada que cubre espalda y hombros (y las mangas si tiene dibujo)
  const coatC = lk.x && lk.x.coat ? paintCoat(lk) : null, coatM = coatC ? texMat(coatC, null, null, 1) : null, sleeve = coatM && lk.cp ? { mat: coatM } : undefined;
  if (lk.x && lk.x.coat) part(new THREE.CylinderGeometry(.205 * SW, .19 * SW, .44, 24, 1, true, .95, Math.PI * 2 - 1.9), lk.x.coat === true ? '#f2f2f2' : lk.x.coat, chest, [0, .18, -.005], null, [1.2, 1, .86], coatM ? { mat: coatM } : { side: 1 });
  // brazos y piernas
  for (const [s, k] of [[1, 'L'], [-1, 'R']]) {
    const sh = joint('sh' + k, chest, s * .24 * SW, .31, 0);
    part(sph(.072 * LW), armU, sh, [0, -.01, 0], null, [1.05, 1, 1], sleeve);
    limb(sh, .32, .062 * LW, armU, sleeve);
    const el = joint('el' + k, sh, 0, -.32, 0);
    limb(el, .3, .053 * LW, armL, slv >= 2 || sleeve ? sleeve : undefined);
    const hd = joint('hd' + k, el, 0, -.3, 0);
    part(sph(.068 * LW, 16, 12), hands, hd, [0, -.02, 0], null, [1, 1.12, 1.05]);
    const hp = joint('hp' + k, body, s * .1 * SW, -.05, 0);
    limb(hp, .5, .088 * LW, pants);
    const kn = joint('kn' + k, hp, 0, -.5, 0);
    limb(kn, .48, .07 * LW, pants);
    const ft = joint('ft' + k, kn, 0, -.48, 0);
    part(cap(.055 * Math.sqrt(LW), .14), shoes, ft, [0, -.02, .06], [Math.PI / 2, 0, 0]);
  }
  F.H = (hipY + .05 + .24 + .38 + .1 + HC + R) * S;
  const J = F.J, X = lk.x || {}, ex = (k, d) => X[k] === true ? d : X[k] || d;
  // extras
  if (X.cape) { const g = new THREE.BoxGeometry(.62 * SW, 1.2, .025); g.translate(0, -.6, 0); const p = joint('cape', chest, 0, .34, -.14); part(g, ex('cape', '#f2f2f2'), p, null, [.12, 0, 0]); F.cape = p; }
  if (X.coat) { const g = new THREE.CylinderGeometry(.25 * SW, .38 * SW, .86, 22, 1, true, .7, Math.PI * 2 - 1.4); g.translate(0, -.43, 0); const p = joint('coat', spine, 0, .2, 0); part(g, ex('coat', '#f2f2f2'), p, null, null, [1, 1, .85], coatM ? { mat: coatM } : { side: 1 }); F.coat = p;
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
  if (X.mustache) { const big = lk.b === 'huge', L = R * (big ? 1.05 : .5), a = big ? 1.0 : 1.3; // media luna: cada mitad sale del centro hacia fuera y arriba
    for (const s of [-1, 1]) part(cap(R * (big ? .1 : .07), L), ex('mustache', '#f2f2f2'), head, [s * Math.sin(a) * L * .5, HC - R * .36 + Math.cos(a) * L * .5, R * .86], [0, 0, -s * a]); }
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
    } else if (h === 'fedora') { const c = X.hatc || '#f2f2f2'; part(new THREE.CylinderGeometry(R * 1.6, R * 1.6, .02, 32), c, hg, [0, -.01, 0]); part(new THREE.CylinderGeometry(R * .9, R * 1.02, R * .62, 24), c, hg, [0, R * .28, 0]); part(new THREE.CylinderGeometry(R * 1.03, R * 1.03, R * .14, 24), '#1b1b1b', hg, [0, R * .06, 0], null, null, { noOl: true });
    } else if (h === 'law') { part(new THREE.CylinderGeometry(R * 1.12, R * 1.08, R * .95, 24), '#f2f2f2', hg, [0, R * .3, 0]); for (let i = 0; i < 5; i++) { const a = i * 1.25; part(sph(.04, 8, 6), '#3a2a1a', hg, [Math.sin(a) * R * 1.12, R * .3 + (i % 2) * .08, Math.cos(a) * R * 1.12], null, null, { noOl: true }); } }
    else { part(new THREE.CylinderGeometry(R * 1.1, R * 1.05, R * .45, 24), '#1b1b26', hg, [0, R * .05, 0]); part(new THREE.BoxGeometry(R * 1.3, .03, R * .7), '#1b1b26', hg, [0, -R * .12, R * 1.05], [.25, 0, 0]); part(new THREE.BoxGeometry(.12, .07, .02), '#d4af37', hg, [0, R * .05, R * 1.1], null, null, { noOl: true }); }
  }
  if (X.hood) part(new THREE.SphereGeometry(R * 1.22, 26, 16, Math.PI / 2 + .95, Math.PI * 2 - 1.9, 0, 2.2), X.hood, head, [0, HC + R * .04, -R * .06], null, null, { side: 1 }); // capucha
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
  F.dispose = () => { F.geos.forEach(g => g.dispose()); F.mats.forEach(m => m.dispose()); F.texs.forEach(t => t.dispose()); F.ol.dispose(); F.faceMat.dispose(); tex.dispose(); };
  return F;
}
// Copia fantasma (estelas, clones de Naruto, sombras de Sung Jin-Woo): misma pose, un solo material translúcido
export function ghostOf(F, color, opacity, additive = true) {
  if (F.ghost) return F.ghost(color, opacity, additive); // luchador con dibujo (f3d/sprite.js)
  const g = F.root.clone(true), mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  g.traverse(o => { if (o.isMesh) { if (o.userData.ol || o.material === F.faceMat) o.visible = false; else o.material = mat; } });
  g.userData.mat = mat; return g;
}
