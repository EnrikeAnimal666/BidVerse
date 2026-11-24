/* BidVerse 3D · EFECTOS: partículas (brillo aditivo y humo), chispas alargadas, destellos, ondas, grietas en el suelo, escombros
   y el material de "energía" (orbes, rayos, auras). Los colores por encima de 1 son los que hacen brillar al bloom. */
import * as THREE from 'three';

const TAU = Math.PI * 2, rr = (a, b) => a + Math.random() * (b - a);
const cvs = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
export const TEX = {
  glow: cvs(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(.6, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }),
  star: cvs(256, 256, g => { g.translate(128, 128); const n = 10; g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, r = i % 2 ? 22 : (i % 4 ? 90 : 124); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath();
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 124); r.addColorStop(0, '#fff'); r.addColorStop(.35, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fill(); }),
  ring: cvs(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 40, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(.7, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }),
  crack: cvs(256, 256, g => { g.translate(128, 128); g.strokeStyle = '#fff'; g.lineCap = 'round';
    for (let i = 0; i < 11; i++) { let a = i / 11 * TAU + rr(-.2, .2), x = 0, y = 0; g.lineWidth = rr(3, 6); g.beginPath(); g.moveTo(0, 0); for (let k = 0; k < 6; k++) { a += rr(-.4, .4); const d = rr(12, 22); x += Math.cos(a) * d; y += Math.sin(a) * d; g.lineTo(x, y); g.lineWidth *= .8; } g.stroke(); }
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 60); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.beginPath(); g.arc(0, 0, 60, 0, TAU); g.fill(); }),
  crescent: cvs(256, 256, g => { g.translate(128, 128); const r = g.createLinearGradient(-120, 0, 120, 0); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(.75, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = r;
    g.beginPath(); g.arc(0, 0, 120, -1.25, 1.25); g.arc(-38, 0, 104, 1.1, -1.1, true); g.closePath(); g.fill(); }),
};
const NOISE = `float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
// modo 0 orbe (núcleo blanco y borde) · 1 rayo (centro brillante, franjas que corren) · 2 aura (llamas que suben por el borde)
export function energyMat(col, core = '#ffffff', mode = 0, k = 2.4) {
  return new THREE.ShaderMaterial({
    uniforms: { col: { value: new THREE.Color(col).multiplyScalar(k) }, core: { value: new THREE.Color(core).multiplyScalar(k * 1.1) }, t: { value: 0 }, op: { value: 1 }, mode: { value: mode }, sp: { value: 1 } },
    vertexShader: `uniform float t;uniform float mode;uniform float sp;varying vec3 vN;varying vec3 vV;varying vec2 vUv;varying vec3 vP;${NOISE}
void main(){vUv=uv;vec3 p=position;
if(mode>1.5){float h=clamp(p.y*.5+.5,0.0,1.0);float n=n3(vec3(p.x*2.6,p.y*1.6-t*2.6*sp,p.z*2.6));p.xz*=1.0-h*h*.6;p+=normal*(n-.45)*.32*(.35+h);p.y+=max(0.0,n-.5)*.9*h*h;}
vP=position;vec4 w=modelMatrix*vec4(p,1.0);vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform vec3 col;uniform vec3 core;uniform float t;uniform float op;uniform float mode;uniform float sp;varying vec3 vN;varying vec3 vV;varying vec2 vUv;varying vec3 vP;${NOISE}
void main(){float f=abs(dot(normalize(vN),vV));vec3 c;float a;
if(mode<0.5){float n=n3(vP*4.0+vec3(t*2.0,-t*3.0,t));float rim=pow(1.0-f,2.0);c=mix(core,col,clamp(1.2-f*1.3+n*.35,0.0,1.0));a=.55+rim*.9;}
else if(mode<1.5){float s=sin(vUv.y*36.0-t*40.0*sp)*.5+.5;float n=n3(vec3(vUv*vec2(6.0,30.0),t*4.0));c=mix(col,core,pow(f,3.0));a=pow(f,1.1)*(.7+.3*s)*(.8+.4*n);}
else{float n=n3(vP*vec3(5.0,2.4,5.0)+vec3(0.0,-t*4.0*sp,0.0));float rim=pow(1.0-f,1.8);float fl=smoothstep(.5,.95,n*1.1+rim*.45-vUv.y*.25);c=mix(col,core,fl*.5);a=(rim*.55+.25)*fl*1.5*smoothstep(0.0,.15,vUv.y);}
gl_FragColor=vec4(c,clamp(a,0.0,1.0)*op);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: mode > 1.5 ? THREE.DoubleSide : THREE.FrontSide
  });
}
function pointsMat(add) {
  return new THREE.ShaderMaterial({
    uniforms: { scale: { value: 400 } },
    vertexShader: `attribute float sz;attribute vec4 rgba;uniform float scale;varying vec4 vC;void main(){vC=rgba;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=clamp(sz*scale/-mv.z,1.0,256.0);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: add ? `varying vec4 vC;void main(){vec2 d=gl_PointCoord-.5;float r=dot(d,d)*4.0;if(r>1.0)discard;gl_FragColor=vec4(vC.rgb,vC.a*pow(1.0-r,1.8));}`
      : `varying vec4 vC;void main(){vec2 d=gl_PointCoord-.5;float r=dot(d,d)*4.0;if(r>1.0)discard;gl_FragColor=vec4(vC.rgb,vC.a*(1.0-r)*(1.0-r));}`,
    transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending
  });
}
class Pts { // partículas redondas
  constructor(scene, N, add) {
    this.N = N; this.n = 0; this.P = new Float32Array(N * 3); this.C = new Float32Array(N * 4); this.S = new Float32Array(N); this.D = [];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.P, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('rgba', new THREE.BufferAttribute(this.C, 4).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('sz', new THREE.BufferAttribute(this.S, 1).setUsage(THREE.DynamicDrawUsage));
    this.g = g; this.m = new THREE.Points(g, pointsMat(add)); this.m.frustumCulled = false; this.m.renderOrder = add ? 6 : 5; scene.add(this.m);
  }
  add(o) { if (this.D.length >= this.N) return; o.m = o.l; this.D.push(o); }
  update(dt) {
    const D = this.D; let n = 0;
    for (let i = D.length - 1; i >= 0; i--) { const p = D[i]; if (p.dl > 0) { p.dl -= dt; continue; } p.l -= dt; if (p.l <= 0) { D[i] = D[D.length - 1]; D.pop(); } }
    for (const p of D) {
      if (p.dl > 0) continue;
      const k = Math.exp(-(p.dr ?? 1.5) * dt); p.vx *= k; p.vy *= k; p.vz *= k; p.vy += (p.g || 0) * dt;
      if (p.to) { p.vx += (p.to.x - p.x) * p.pull * dt; p.vy += (p.to.y - p.y) * p.pull * dt; p.vz += (p.to.z - p.z) * p.pull * dt; }
      if (p.sw) { const a = p.sw * dt, cx = p.cx ?? 0, cz = p.cz ?? 0, dx = p.x - cx, dz = p.z - cz; p.x = cx + dx * Math.cos(a) - dz * Math.sin(a); p.z = cz + dx * Math.sin(a) + dz * Math.cos(a); }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.fl != null && p.y < p.fl) { p.y = p.fl; p.vy *= -.3; }
      const t = p.l / p.m, a = Math.min(1, t * (p.fi || 2.2), (1 - t) * (p.fo || 30)) * (p.a ?? 1);
      this.P[n * 3] = p.x; this.P[n * 3 + 1] = p.y; this.P[n * 3 + 2] = p.z;
      this.C[n * 4] = p.r; this.C[n * 4 + 1] = p.gg; this.C[n * 4 + 2] = p.b; this.C[n * 4 + 3] = a;
      this.S[n] = p.s * (p.grow ? 1 + (1 - t) * p.grow : p.shr ? .25 + .75 * t : 1); n++;
    }
    this.n = n; this.g.setDrawRange(0, n);
    for (const k of ['position', 'rgba', 'sz']) this.g.attributes[k].needsUpdate = true;
  }
}
class Quads { // segmentos que miran a la cámara (chispas alargadas, rayos, estelas)
  constructor(scene, N) {
    this.N = N; this.list = []; this.P = new Float32Array(N * 12); this.C = new Float32Array(N * 16); this.W = new Float32Array(N * 4);
    const idx = new Uint16Array(N * 6); for (let i = 0; i < N; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    const g = new THREE.BufferGeometry(); g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setAttribute('position', new THREE.BufferAttribute(this.P, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('rgba', new THREE.BufferAttribute(this.C, 4).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('w', new THREE.BufferAttribute(this.W, 1));
    for (let i = 0; i < N; i++) this.W.set([-1, 1, 1, -1], i * 4);
    this.g = g; this.m = new THREE.Mesh(g, new THREE.ShaderMaterial({
      vertexShader: `attribute vec4 rgba;attribute float w;varying vec4 vC;varying float vW;void main(){vC=rgba;vW=w;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying vec4 vC;varying float vW;void main(){float a=1.0-abs(vW);gl_FragColor=vec4(vC.rgb,vC.a*a*a);}`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.m.frustumCulled = false; this.m.renderOrder = 7; scene.add(this.m);
    this.a = new THREE.Vector3(); this.b = new THREE.Vector3(); this.d = new THREE.Vector3(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3();
  }
  // q: segmento suelto (o.ax..o.bz, o.w ancho, o.c color, o.a alfa de cola→cabeza). Se dibujan los que hay en this.frame
  begin() { this.k = 0; }
  seg(ax, ay, az, bx, by, bz, w, r, g, b, a0, a1, cam) {
    if (this.k >= this.N) return; const i = this.k++;
    this.d.set(bx - ax, by - ay, bz - az); this.v.set(cam.x - (ax + bx) / 2, cam.y - (ay + by) / 2, cam.z - (az + bz) / 2);
    this.s.crossVectors(this.d, this.v); const L = this.s.length() || 1; this.s.multiplyScalar(w / 2 / L);
    const P = this.P, o = i * 12, s = this.s;
    P[o] = ax - s.x; P[o + 1] = ay - s.y; P[o + 2] = az - s.z; P[o + 3] = ax + s.x; P[o + 4] = ay + s.y; P[o + 5] = az + s.z;
    P[o + 6] = bx + s.x; P[o + 7] = by + s.y; P[o + 8] = bz + s.z; P[o + 9] = bx - s.x; P[o + 10] = by - s.y; P[o + 11] = bz - s.z;
    const C = this.C, c = i * 16; C.set([r, g, b, a0, r, g, b, a0, r, g, b, a1, r, g, b, a1], c);
  }
  end() { this.g.setDrawRange(0, this.k * 6); this.g.attributes.position.needsUpdate = true; this.g.attributes.rgba.needsUpdate = true; }
}
const tmpC = new THREE.Color();
export class FX {
  constructor(scene) {
    this.scene = scene; this.glowP = new Pts(scene, 5000, true); this.smokeP = new Pts(scene, 1400, false); this.q = new Quads(scene, 2400);
    this.sparks = []; this.bolts = []; this.trails = []; this.tw = []; this.craters = []; this.rocks = []; this.q1 = 1;
    this.rockG = new THREE.IcosahedronGeometry(1, 0); this.rockM = new THREE.MeshToonMaterial({ color: '#2b2433' });
    this.crG = new THREE.PlaneGeometry(1, 1);
  }
  col(c, k = 1) { tmpC.set(c); return [tmpC.r * k, tmpC.g * k, tmpC.b * k]; }
  // ---- partículas ----
  glow(p, n, c, o = {}) { const [r, g, b] = this.col(c, o.k ?? 2); n = Math.round(n * this.q1);
    for (let i = 0; i < n; i++) { const a = rr(0, TAU), e = rr(-1, 1), sp = rr(o.min ?? .5, o.max ?? 4), ce = Math.sqrt(1 - e * e);
      this.glowP.add({ x: p.x + rr(-1, 1) * (o.sx || 0), y: p.y + rr(-1, 1) * (o.sy || 0), z: p.z + rr(-1, 1) * (o.sz || 0), vx: Math.cos(a) * ce * sp + (o.vx || 0), vy: e * sp * (o.flat ? .3 : 1) + (o.vy || 0), vz: Math.sin(a) * ce * sp + (o.vz || 0),
        l: rr(o.l0 ?? .3, o.l1 ?? .8), s: rr(o.s0 ?? .05, o.s1 ?? .16), r, gg: g, b, g: o.g || 0, dr: o.dr ?? 2, shr: o.grow ? 0 : 1, grow: o.grow, to: o.to, pull: o.pull, dl: o.dl ? rr(0, o.dl) : 0, fl: o.fl }); } }
  smoke(p, n, c = '#3a3344', o = {}) { const [r, g, b] = this.col(c, 1); n = Math.round(n * this.q1);
    for (let i = 0; i < n; i++) { const a = rr(0, TAU), sp = rr(o.min ?? .4, o.max ?? 2.2);
      this.smokeP.add({ x: p.x + rr(-.2, .2), y: p.y + rr(0, .2), z: p.z + rr(-.2, .2), vx: Math.cos(a) * sp + (o.vx || 0), vy: rr(.2, 1) * (o.up ?? 1), vz: Math.sin(a) * sp * .6 + (o.vz || 0), l: rr(.7, 1.4) * (o.life || 1), s: rr(.5, 1.1) * (o.size || 1), r, gg: g, b, a: o.a ?? .55, grow: 1.6, dr: 1.6, fi: 1.5, fo: 4 }); } }
  spark(p, n, c, o = {}) { const [r, g, b] = this.col(c, o.k ?? 3); n = Math.round(n * this.q1);
    for (let i = 0; i < n; i++) { let dx, dy, dz; if (o.dir) { dx = o.dir.x + rr(-1, 1) * (o.spread ?? .7); dy = o.dir.y + rr(-1, 1) * (o.spread ?? .7) + (o.up || 0); dz = o.dir.z + rr(-1, 1) * (o.spread ?? .7); } else { dx = rr(-1, 1); dy = rr(-1, 1) + (o.up || 0); dz = rr(-1, 1); }
      const L = Math.hypot(dx, dy, dz) || 1, sp = rr(o.min ?? 4, o.max ?? 12);
      this.sparks.push({ x: p.x, y: p.y, z: p.z, vx: dx / L * sp, vy: dy / L * sp, vz: dz / L * sp, l: rr(.15, o.life ?? .4), m: 0, w: rr(.02, o.w ?? .05), r, g, b, gr: o.g ?? -6 }); this.sparks[this.sparks.length - 1].m = this.sparks[this.sparks.length - 1].l; }
    if (this.sparks.length > 900) this.sparks.splice(0, this.sparks.length - 900); }
  // ---- formas ----
  sprite(p, size, c, life = .25, o = {}) { const m = new THREE.SpriteMaterial({ map: o.tex || TEX.glow, color: new THREE.Color(c).multiplyScalar(o.k ?? 1.7), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: o.dt ?? true, rotation: o.rot ?? rr(0, TAU) });
    const s = new THREE.Sprite(m); s.position.copy(p); s.scale.setScalar(size); s.renderOrder = 8; this.scene.add(s);
    this.anim(life, k => { const e = 1 - Math.pow(1 - k, 2); s.scale.setScalar(size * ((o.g0 ?? .6) + e * (o.g1 ?? .6))); m.opacity = Math.pow(1 - k, o.fade ?? 1.4); if (o.spin) m.rotation += o.spin * .016; }, () => { this.scene.remove(s); m.dispose(); }); return s; }
  ring(p, r, c, life = .4, o = {}) { const g = new THREE.RingGeometry(o.inner ?? .82, 1, 64), m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(o.k ?? 2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m); mesh.position.copy(p); mesh.renderOrder = 8; if (o.flat) mesh.rotation.x = -Math.PI / 2; this.scene.add(mesh); const cam = this.cam;
    this.anim(life, k => { const e = 1 - Math.pow(1 - k, 3); mesh.scale.setScalar(.1 + r * e); m.opacity = Math.pow(1 - k, 1.3); if (!o.flat && cam) mesh.quaternion.copy(cam.quaternion); }, () => { this.scene.remove(mesh); g.dispose(); m.dispose(); }); return mesh; }
  crater(x, z, r, c) { // grieta en el suelo: brilla al rojo y se enfría, y se queda marcada
    const mk = (add, col) => { const m = new THREE.MeshBasicMaterial({ map: TEX.crack, color: col, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -4 });
      const p = new THREE.Mesh(this.crG, m); p.rotation.set(-Math.PI / 2, 0, rr(0, TAU)); p.position.set(x, add ? .018 : .012, z); p.scale.setScalar(r * 2); this.scene.add(p); return p; };
    const dark = mk(false, new THREE.Color('#050308')), hot = mk(true, new THREE.Color(c).multiplyScalar(2.6)); dark.material.opacity = .85;
    this.craters.push(dark, hot); while (this.craters.length > 28) { const o = this.craters.shift(); this.scene.remove(o); o.material.dispose(); }
    this.anim(2.4, k => { hot.material.opacity = Math.pow(1 - k, 2); }, () => { this.scene.remove(hot); hot.material.dispose(); const i = this.craters.indexOf(hot); if (i >= 0) this.craters.splice(i, 1); }); }
  debris(p, n, o = {}) { n = Math.round(n * this.q1); for (let i = 0; i < n && this.rocks.length < 90; i++) { const m = new THREE.Mesh(this.rockG, this.rockM), s = rr(.04, o.big ? .16 : .1); m.scale.setScalar(s); m.position.copy(p); this.scene.add(m);
    this.rocks.push({ m, vx: rr(-3, 3) + (o.vx || 0), vy: rr(2.5, 7), vz: rr(-2.5, 2.5), rx: rr(-9, 9), ry: rr(-9, 9), l: rr(1.2, 2), s }); } }
  // ---- rayo en zigzag: se regenera cada pocos ms ----
  bolt(a, b, c, life = .18, o = {}) { this.bolts.push({ a: a.clone(), b: b.clone(), c: this.col(c, o.k ?? 3), l: life, m: life, w: o.w ?? .06, disp: o.disp ?? .3, pts: null, t: 0, get: o.get }); }
  zig(a, b, disp) { let pts = [a.clone(), b.clone()]; const d = new THREE.Vector3(), n = new THREE.Vector3();
    for (let k = 0; k < 5; k++) { const out = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1]; d.subVectors(q, p); const L = d.length(); n.set(rr(-1, 1), rr(-1, 1), rr(-1, 1)).multiplyScalar(disp * L * .5); out.push(p.clone().add(q).multiplyScalar(.5).add(n), q); } pts = out; disp *= .62; } return pts; }
  // ---- estela que sigue a un punto (puño, espada, dash) ----
  trail(get, c, life = .3, o = {}) { this.trails.push({ get, c: this.col(c, o.k ?? 2.6), pts: [], life, t: 0, keep: o.keep ?? .16, w: o.w ?? .1 }); }
  // ---- animación genérica: f(k 0..1, dt) cada fotograma y end() al acabar ----
  anim(d, f, end) { const o = { t: 0, d, f, end }; this.tw.push(o); return o; }
  update(dt, cam) {
    this.cam = cam;
    for (let i = this.tw.length - 1; i >= 0; i--) { const o = this.tw[i]; o.t += dt; const k = Math.min(1, o.t / o.d); try { o.f && o.f(k, dt); } catch (e) { o.t = o.d; } if (k >= 1) { this.tw.splice(i, 1); try { o.end && o.end(); } catch (e) { /* nada */ } } }
    this.glowP.update(dt); this.smokeP.update(dt);
    for (let i = this.rocks.length - 1; i >= 0; i--) { const r = this.rocks[i], m = r.m; r.l -= dt; r.vy -= 16 * dt; m.position.x += r.vx * dt; m.position.y += r.vy * dt; m.position.z += r.vz * dt; m.rotation.x += r.rx * dt; m.rotation.y += r.ry * dt;
      if (m.position.y < r.s) { m.position.y = r.s; r.vy *= -.35; r.vx *= .6; r.vz *= .6; r.rx *= .6; } if (r.l < .3) m.scale.setScalar(r.s * Math.max(0, r.l / .3)); if (r.l <= 0) { this.scene.remove(m); this.rocks.splice(i, 1); } }
    const q = this.q, cp = cam.position; q.begin();
    for (let i = this.sparks.length - 1; i >= 0; i--) { const s = this.sparks[i]; s.l -= dt; if (s.l <= 0) { this.sparks.splice(i, 1); continue; } const k = Math.exp(-2.2 * dt); s.vx *= k; s.vy = s.vy * k + s.gr * dt; s.vz *= k; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      const t = s.l / s.m, L = .035; q.seg(s.x - s.vx * L, s.y - s.vy * L, s.z - s.vz * L, s.x, s.y, s.z, s.w * (.4 + .6 * t), s.r, s.g, s.b, 0, Math.min(1, t * 2), cp); }
    for (let i = this.bolts.length - 1; i >= 0; i--) { const b = this.bolts[i]; b.l -= dt; b.t -= dt; if (b.l <= 0) { this.bolts.splice(i, 1); continue; } if (b.get) { const r = b.get(); if (r) { b.a.copy(r[0]); b.b.copy(r[1]); } }
      if (!b.pts || b.t <= 0) { b.pts = this.zig(b.a, b.b, b.disp); b.t = .045; } const al = Math.min(1, b.l / b.m * 2.5);
      for (let j = 0; j < b.pts.length - 1; j++) { const p = b.pts[j], n = b.pts[j + 1]; q.seg(p.x, p.y, p.z, n.x, n.y, n.z, b.w * 2.6, b.c[0] * .5, b.c[1] * .5, b.c[2] * .5, al * .5, al * .5, cp); q.seg(p.x, p.y, p.z, n.x, n.y, n.z, b.w, b.c[0] + 1, b.c[1] + 1, b.c[2] + 1, al, al, cp); } }
    for (let i = this.trails.length - 1; i >= 0; i--) { const tr = this.trails[i]; tr.t += dt; if (tr.t < tr.life) { const p = tr.get(); if (p) tr.pts.push({ p: p.clone(), t: tr.t }); } while (tr.pts.length && tr.t - tr.pts[0].t > tr.keep) tr.pts.shift(); if (tr.t >= tr.life + tr.keep) { this.trails.splice(i, 1); continue; }
      for (let j = 0; j < tr.pts.length - 1; j++) { const a = tr.pts[j], b = tr.pts[j + 1], fa = 1 - (tr.t - a.t) / tr.keep, fb = 1 - (tr.t - b.t) / tr.keep; q.seg(a.p.x, a.p.y, a.p.z, b.p.x, b.p.y, b.p.z, tr.w * Math.max(.1, fb), tr.c[0], tr.c[1], tr.c[2], Math.max(0, fa), Math.max(0, fb), cp); } }
    q.end();
  }
  clear() { for (const o of this.tw.splice(0)) { try { o.end && o.end(); } catch (e) { /* nada */ } } this.glowP.D.length = 0; this.smokeP.D.length = 0; this.sparks.length = 0; this.bolts.length = 0; this.trails.length = 0;
    for (const r of this.rocks) this.scene.remove(r.m); this.rocks.length = 0; for (const c of this.craters) { this.scene.remove(c); c.material.dispose(); } this.craters.length = 0; }
}
export { rr, TAU };
