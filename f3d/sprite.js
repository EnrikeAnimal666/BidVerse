/* BidVerse 3D · LUCHADORES CON SU DIBUJO REAL: cada personaje es su propia ilustración (PNG de cuerpo entero sin fondo en
   luchadores/<Nombre>.png o .webp) puesta de pie en el escenario 3D, mirando siempre a cámara. Se mueve con las mismas poses que
   antes (f3d/anim.js mueve un esqueleto invisible), pero el dibujo nunca se deforma por partes: como en los combates de Pokémon,
   se mueve entero (se inclina girando sobre los pies, se agacha y respira, se lanza hacia el rival, retrocede, tiembla al recibir y
   cae al suelo). Contorno oscuro, borde de luz del color del aura y destello blanco al recibir un golpe.
   Sin PNG propio: su retrato del juego en un medallón flotante (provisional, hasta que haya dibujo de cuerpo entero). */
import * as THREE from 'three';

// Dibujos de luchadores/ que miran hacia la IZQUIERDA (por defecto se supone que miran a la derecha). Se voltean solos según el lado.
export const FACE_L = new Set(['Asta', 'Cell', 'Feitan', 'Garou', 'Giyu', 'Joseph Joestar', 'Jotaro Kujo', 'Kars', 'Madara', 'Phinks',
  'Sung Jin-Woo', 'Tatsumaki', 'Yuji', 'Zenitsu', 'Zeno Zoldyck', 'Zeus', 'Law', 'Lelouch']);
// Tamaño de un dibujo concreto si sale grande o pequeño (1 = normal). Ej.: { 'Kaido': 1.3 }
export const ART_K = {};
const SIZE = { m: 1, f: .96, big: 1.08, huge: 1.2, kid: .8, slim: 1, tall: 1.1 }; // complexión (f3d/looks.js)
const MAXD = 1024, PAD = 10, CACHE = new Map(), KEEP = 24;
const NJ3 = 17 * 3; // f3d/anim.js: 17 articulaciones × 3 + altura de cadera y adelanto

const loadImg = (src, cors) => new Promise(ok => { const im = new Image(); if (cors) im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const ctx = c => c.getContext('2d', { willReadFrequently: true });

// PNG con transparencia: se reduce, se recorta a lo que ocupa el personaje y se deja un margen para el contorno
function cutFull(im) {
  const k = Math.min(1, MAXD / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
  const c = canvasOf(w, h), g = ctx(c); g.drawImage(im, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, al = (x, y) => d[(y * w + x) * 4 + 3];
  if (al(0, 0) > 200 && al(w - 1, 0) > 200 && al(0, h - 1) > 200 && al(w - 1, h - 1) > 200) return null; // tiene fondo: no es un recorte
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, o = canvasOf(cw + PAD * 2, ch + PAD * 2); o.getContext('2d').drawImage(c, x0, y0, cw, ch, PAD, PAD, cw, ch);
  return o;
}
// retrato (primer plano con fondo): un recorte centrado arriba, que el shader enmarca en un medallón
function cutBust(im) {
  const W0 = im.naturalWidth, H0 = im.naturalHeight, cw = Math.min(W0, H0 * .9), ch = Math.min(H0, cw * 1.1), sx = (W0 - cw) / 2, sy = (H0 - ch) * .2;
  const k = Math.min(1, 640 / ch), o = canvasOf(cw * k, ch * k); o.getContext('2d').drawImage(im, sx, sy, cw, ch, 0, 0, o.width, o.height);
  ctx(o).getImageData(0, 0, 1, 1); // si la imagen es de otro dominio sin permiso, falla aquí (y no se puede usar en WebGL)
  return o;
}
function emojiCanvas(e) { const c = canvasOf(320, 352), g = c.getContext('2d'); g.fillStyle = '#1a1226'; g.fillRect(0, 0, c.width, c.height); g.font = '210px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e || '?', 160, 186); return c; }
// puntos de color del dibujo (para la desintegración en polvo)
function samplePts(c, bust) {
  const w = c.width, h = c.height, d = ctx(c).getImageData(0, 0, w, h).data, st = Math.max(2, Math.round(Math.sqrt(w * h / 1600))), out = [];
  for (let y = 0; y < h; y += st) for (let x = 0; x < w; x += st) { const i = (y * w + x) * 4; let a = d[i + 3];
    if (bust && Math.hypot((x / w - .5) / .5, (y / h - .5) / .46) > .9) a = 0;
    if (a > 120) out.push([x / w, 1 - y / h, d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]); }
  return out;
}
const texOf = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
let MASK = null; // máscara redonda para las estelas del medallón
const maskTex = () => { if (MASK) return MASK; const c = canvasOf(128, 128), g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 40, 64, 64, 62); r.addColorStop(0, '#fff'); r.addColorStop(1, '#000'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return (MASK = new THREE.CanvasTexture(c)); };

// src = { full: [urls de luchadores/], pic: retrato del juego, emoji }
export function loadArt(name, src) {
  if (CACHE.has(name)) { const p = CACHE.get(name); CACHE.delete(name); CACHE.set(name, p); return p; }
  const p = (async () => {
    const ims = await Promise.all((src.full || []).map(u => loadImg(u, true)));
    for (const im of ims) if (im) { try { const c = cutFull(im); if (c) return { c, bust: false }; } catch (e) { /* sigue */ } }
    if (src.pic) { const im = await loadImg(src.pic, true); if (im) try { return { c: cutBust(im), bust: true }; } catch (e) { /* sin permiso */ } }
    return { c: emojiCanvas(src.emoji), bust: true };
  })().catch(() => ({ c: emojiCanvas(src.emoji), bust: true })).then(a => { a.pts = samplePts(a.c, a.bust); a.tex = texOf(a.c); return a; });
  CACHE.set(name, p);
  while (CACHE.size > KEEP) { const k = CACHE.keys().next().value, q = CACHE.get(k); CACHE.delete(k); q.then(a => a.tex.dispose()); } // si alguien la usa aún, three la vuelve a subir
  return p;
}

const VS = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const FS = `uniform sampler2D map;uniform vec2 px;uniform float flash;uniform float op;uniform float bust;uniform float rimK;uniform vec3 rimC;uniform vec3 tint;uniform vec3 olc;varying vec2 vUv;
float al(vec2 o){return texture2D(map,vUv+o).a;}
void main(){vec4 c=texture2D(map,vUv);float a=c.a;vec3 col=c.rgb*tint;
if(bust>.5){vec2 q=(vUv-.5)/vec2(.5,.46);float d=length(q);a=(1.0-smoothstep(.8,.92,d))*smoothstep(-.05,.3,vUv.y);
  float ring=smoothstep(.05,.0,abs(d-.9))*smoothstep(.0,.35,vUv.y);col=mix(col,rimC*(1.6+rimK*1.4),ring);a=max(a,ring);}
else{vec2 r=px*3.0,s=r*.707;float t0=al(vec2(r.x,0.)),t1=al(vec2(-r.x,0.)),t2=al(vec2(0.,r.y)),t3=al(vec2(0.,-r.y)),t4=al(s),t5=al(-s),t6=al(vec2(s.x,-s.y)),t7=al(vec2(-s.x,s.y));
  float mx=max(max(max(t0,t1),max(t2,t3)),max(max(t4,t5),max(t6,t7))),mn=min(min(min(t0,t1),min(t2,t3)),min(min(t4,t5),min(t6,t7)));
  col+=rimC*a*(1.0-mn)*rimK*1.8;float e=clamp(mx-a,0.,1.),A=a+e*(1.0-a);vec3 oc=mix(olc,rimC*2.2,rimK*.8);col=(col*a+oc*e*(1.0-a))/max(A,.001);a=A;}
col=mix(col,vec3(1.7),flash);a*=op;if(a<.06)discard;gl_FragColor=vec4(col,a);}`;

// pedazos del dibujo al morir (F.shatter): cada triángulo gira sobre su centro, sale disparado y cae hasta el suelo (fy)
const SVS = `uniform float t;uniform float crack;uniform float jit;uniform float fy;attribute vec3 aC;attribute vec3 aV;attribute vec3 aAx;attribute float aSp;attribute float aD;attribute vec3 aB;
varying vec2 vUv;varying vec3 vB;varying float vD;
vec3 rot(vec3 p,vec3 k,float a){float c=cos(a),s=sin(a);return p*c+cross(k,p)*s+k*dot(k,p)*(1.0-c);}
void main(){vUv=uv;vB=aB;vD=aD;vec3 p=rot(position-aC,aAx,aSp*t)*(1.0-.4*smoothstep(.3,1.0,t));
vec3 c=aC+aV*t+vec3(0.0,-5.0*t*t,0.0);c.y=max(c.y,fy);p+=c;p.xy+=vec2(sin(aD*91.0+crack*63.0),cos(aD*57.0+crack*71.0))*jit;
gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`;
const SFS = `uniform sampler2D map;uniform float bust;uniform float t;uniform float crack;uniform float op;uniform vec3 hot;uniform vec3 tint;varying vec2 vUv;varying vec3 vB;varying float vD;
void main(){vec4 c=texture2D(map,vUv);float a=c.a;
if(bust>.5){vec2 q=(vUv-.5)/vec2(.5,.46);a=(1.0-smoothstep(.8,.92,length(q)))*smoothstep(-.05,.3,vUv.y);}
if(a<.3)discard;vec3 col=c.rgb*tint;float on=smoothstep(vD-.2,vD,crack),e=min(min(vB.x,vB.y),vB.z);
col=mix(col,hot,smoothstep(.07,.0,e)*on);col=mix(col,hot,.55*step(.001,t)*(1.0-smoothstep(0.0,.25,t)));
gl_FragColor=vec4(col,a*op);}`;
const cr = new THREE.Vector3();
export function buildSprite(name, look, artP) {
  const S = (SIZE[look.b] || 1) * (ART_K[name] || 1), faceL = FACE_L.has(name);
  const F = { name, look, sprite: true, root: new THREE.Group(), J: {}, mats: [], tails: [], kag: [], extra: {}, H: 2.2 * S, S, hipY: 1.02 };
  F.root.scale.setScalar(S);
  // esqueleto invisible (las mismas medidas que el muñeco 3D): sus manos y pecho son de donde salen los efectos
  const joint = (k, par, x, y, z) => { const j = new THREE.Group(); j.position.set(x, y, z); par.add(j); F.J[k] = j; return j; };
  const body = joint('body', F.root, 0, 1.02, 0), spine = joint('spine', body, 0, .05, 0), chest = joint('chest', spine, 0, .24, 0), neck = joint('neck', chest, 0, .38, 0); joint('head', neck, 0, .1, 0);
  for (const [k, s] of [['L', 1], ['R', -1]]) { const sh = joint('sh' + k, chest, s * .24, .31, 0), el = joint('el' + k, sh, 0, -.32, 0); joint('hd' + k, el, 0, -.3, 0);
    const hp = joint('hp' + k, body, s * .1, -.05, 0), kn = joint('kn' + k, hp, 0, -.5, 0); joint('ft' + k, kn, 0, -.48, 0); }
  const X = look.x || {}; F.armed = !!(X.sword || X.bigsword || X.dual); F.pole = !!(X.staff || X.spear || X.axe || X.hammer || X.club);

  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, .5, 0); const base = Float32Array.from(geo.attributes.position.array), pos = geo.attributes.position;
  const U = { map: { value: null }, px: { value: new THREE.Vector2(.002, .002) }, flash: { value: 0 }, op: { value: 1 }, bust: { value: 0 }, rimK: { value: 0 }, rimC: { value: new THREE.Color() }, tint: { value: new THREE.Color(1, 1, 1) }, olc: { value: new THREE.Color('#0a0710') } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, transparent: true, depthWrite: true });
  const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 4.5; mesh.visible = false; mesh.rotation.order = 'YXZ'; mesh.frustumCulled = false; F.mesh = mesh;
  let art = null, w = 1, h = 1, y0 = 0, flip = 1, dead = false;
  artP.then(a => { if (dead) return; art = a; U.map.value = a.tex; U.px.value.set(1 / a.c.width, 1 / a.c.height); U.bust.value = a.bust ? 1 : 0;
    h = a.bust ? 1.5 * S : F.H; w = h * a.c.width / a.c.height; y0 = a.bust ? .62 * S : 0; }).catch(e => console.warn('F3D sprite', e));

  // cada fotograma (después de mover la cámara): postura del dibujo a partir de la pose del esqueleto
  F.sync = (s, cam, o) => {
    if (!art || !F.root.visible) { mesh.visible = false; return; } mesh.visible = true;
    const A = s.A, R = A.R, c = A.cur, T = A.T, idle = A.idle;
    cr.setFromMatrixColumn(cam.matrixWorld, 0); const fs = o.dir * cr.x >= 0 ? 1 : -1; // hacia dónde mira en pantalla
    flip = (fs < 0) !== faceL ? -1 : 1; F.fs = fs;
    // de la pose solo se toma el movimiento del cuerpo entero (sin doblar el dibujo)
    const lean = c[3] * .8 + c[6] * .5, hy = c[NJ3], bz = c[NJ3 + 1];
    const ext = Math.max(0, Math.min(2, -c[18]) - .9, (Math.min(2, -c[15]) - .9) * .8), up = Math.max(0, -Math.min(c[15], c[18]) - 2.3), kick = Math.max(0, -c[36] - 1, -c[33] - 1);
    const br = Math.sin(T * 2.3) * idle, bob = Math.abs(Math.sin(T * 3.1)) * idle;
    const sy = 1 + (hy + .1) * .32 + up * .05 + br * .012 - bob * .008, sx = 1 - (hy + .1) * .16; // agacharse y respirar: un leve aplastamiento
    const tilt = Math.max(-.2, Math.min(.28, lean * .2)) + br * .006;        // inclinarse: el dibujo gira sobre los pies
    const lunge = (ext * .16 + bz * .8 + kick * .16) * S, jit = s.fl > 0 ? Math.sin(T * 97) * .06 * s.fl : 0; // lanzarse hacia el rival y temblar al recibir
    for (let i = 0; i < pos.count; i++) pos.setXY(i, base[i * 3] * w * sx * flip + fs * (lunge + jit), base[i * 3 + 1] * h * sy);
    pos.needsUpdate = true;
    const roll = fs * -R.rx, lift = Math.abs(Math.sin(roll)) * w * .42;
    mesh.position.set(R.x, R.y + y0 + lift, R.z);
    mesh.rotation.set(0, Math.atan2(cam.position.x - R.x, cam.position.z - R.z), roll - fs * tilt);
    const na = s.sty && !s.sty.au; // sin aura (Toji…): apenas un borde de luz neutro
    U.flash.value = Math.min(1, s.fl * 1.1); U.rimK.value = Math.min(1, s.lv * .5) * (na ? .25 : 1);
    if (s.lv > .2 && !na) U.rimC.value.copy(s.auraC); else U.rimC.value.set(na && s.lv > .2 ? '#d8dce6' : o.pc);
    U.tint.value.copy(o.tint);
  };
  F.halfW = () => art ? w * .5 : null; // media anchura del dibujo (main.js coloca a los dos luchadores pegados según esto)
  F.opacity = v => { U.op.value = v; };
  F.setExpr = () => {};
  // copia fantasma (estelas, clones, sombras): el dibujo tal y como está ahora, teñido
  F.ghost = (color, opacity, additive = true) => {
    const m = new THREE.MeshBasicMaterial({ map: art ? art.tex : null, alphaMap: art && art.bust ? maskTex() : null, color: new THREE.Color(color), transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, alphaTest: .05 });
    const g = new THREE.Mesh(geo.clone(), m); g.position.copy(mesh.position); g.rotation.copy(mesh.rotation); g.renderOrder = 4; g.visible = !!art; g.userData.mat = m;
    m.addEventListener('dispose', () => g.geometry.dispose()); return g;
  };
  // puntos del dibujo en el mundo, con su color (desintegración)
  F.points = () => { if (!art) return []; mesh.updateMatrixWorld(true); const out = [];
    for (const [u, v, r, g, b] of art.pts) out.push([mesh.localToWorld(new THREE.Vector3((u - .5) * w * flip, v * h, 0)), new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace)]);
    return out; };
  /* MUERTE: el dibujo partido en triángulos (cada uno con su trozo del dibujo) exactamente donde está ahora. Devuelve la malla de
     los pedazos; quien la usa la añade a la escena y mueve sus uniformes: crack 0→1 la grieta avanza desde el golpe (hv = altura del
     golpe, 0-1), jit tiembla, t = segundos desde que estalla (salen volando lejos del rival, girando y cayendo), op, hot = color de la grieta. */
  F.shatter = (hv = .6) => {
    if (!art) return null;
    const asp = w / h, NY = 11, NX = Math.max(3, Math.round(NY * asp * 1.1)), occ = new Uint8Array(NX * NY), fs = F.fs || 1;
    for (const [u, v] of art.pts) occ[Math.min(NY - 1, Math.floor(v * NY)) * NX + Math.min(NX - 1, Math.floor(u * NX))] = 1;
    const G = []; for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) G.push([i / NX + (i > 0 && i < NX ? (Math.random() - .5) * .7 / NX : 0), j / NY + (j > 0 && j < NY ? (Math.random() - .5) * .7 / NY : 0)]);
    const A = { position: [], uv: [], aC: [], aV: [], aAx: [], aSp: [], aD: [], aB: [] }, X = u => (u - .5) * w * flip, Y = v => v * h, rr = (a, b) => a + Math.random() * (b - a), BC = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const tri = (...k) => {
      const cu = (k[0][0] + k[1][0] + k[2][0]) / 3, cv = (k[0][1] + k[1][1] + k[2][1]) / 3, cx = X(cu), cy = Y(cv), dx = cx, dy = cy - hv * h, L = Math.hypot(dx, dy) || 1;
      const v = [dx / L * rr(1.2, 3.5) - fs * rr(1.5, 4.5), dy / L * rr(.8, 2.6) + rr(.6, 2.6), rr(-2, 3.5)];
      let ax = [rr(-1, 1), rr(-1, 1), rr(-1, 1)]; const al = Math.hypot(...ax) || 1; ax = ax.map(x => x / al);
      const sp = rr(5, 13) * (Math.random() < .5 ? -1 : 1), d = Math.min(1, Math.hypot((cu - .5) * asp, cv - hv) / .75);
      k.forEach((q, i) => { A.position.push(X(q[0]), Y(q[1]), 0); A.uv.push(q[0], q[1]); A.aC.push(cx, cy, 0); A.aV.push(...v); A.aAx.push(...ax); A.aSp.push(sp); A.aD.push(d); A.aB.push(...BC[i]); });
    };
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { if (!occ[j * NX + i]) continue; const a = G[j * (NX + 1) + i], b = G[j * (NX + 1) + i + 1], c = G[(j + 1) * (NX + 1) + i], d = G[(j + 1) * (NX + 1) + i + 1];
      if (Math.random() < .5) { tri(a, b, d); tri(a, d, c); } else { tri(a, b, c); tri(b, d, c); } }
    const g = new THREE.BufferGeometry(); for (const k in A) g.setAttribute(k, new THREE.Float32BufferAttribute(A[k], k === 'uv' ? 2 : k === 'aSp' || k === 'aD' ? 1 : 3));
    const SU = { map: { value: art.tex }, bust: { value: art.bust ? 1 : 0 }, t: { value: 0 }, crack: { value: 0 }, jit: { value: 0 }, op: { value: 1 }, hot: { value: new THREE.Color(3, 2, 1) }, tint: { value: U.tint.value.clone() }, fy: { value: .03 - mesh.position.y } };
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: SU, vertexShader: SVS, fragmentShader: SFS, side: THREE.DoubleSide, transparent: true }));
    m.position.copy(mesh.position); m.rotation.copy(mesh.rotation); m.renderOrder = 4.6; m.frustumCulled = false;
    m.userData.U = SU; m.userData.dispose = () => { g.dispose(); m.material.dispose(); };
    return m;
  };
  F.dispose = () => { dead = true; geo.dispose(); mat.dispose(); };
  return F;
}
