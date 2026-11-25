/* BidVerse 3D · ESCENARIO DEL COMBATE DE ANIME (window.F3D).
   Sustituye a las tarjetas y al lienzo 2D cuando el navegador tiene WebGL2: mismas llamadas que el VFX 2D de game.js
   (enter, hit, boom, knock, tech, clash, dissolve…) más las del cuerpo (attack, hurt, dodge) y screen() para colocar los textos.
   Solo decora: no toca el guion ni el resultado. Si algo falla, game.js usa el combate 2D de siempre. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { lookOf } from './looks.js';
import { buildFighter, ghostOf, OL_U } from './model.js';
import { Anim } from './anim.js';
import { FX, TEX, energyMat, rr, TAU } from './fx.js';
import { makeTech } from './tech.js';
import { buildSprite, loadArt } from './sprite.js';

const V3 = THREE.Vector3, now = () => performance.now();
let SUP = null, failed = false, R = null, composer = null, bloom = null, scene = null, cam = null, fx = null, cv = null, ro = null;
let stage = null, opts = {}, on = false, gen = 0, last = 0, W = 1, H = 1, PR = 1, lagT = 0, okT = 0;
let HS = 0, slowK = 1, slowU = 0, actor = -1, T = 0, PAUSE = false, sizeT = 0;
const FT = [null, null], LATER = [], WHITE = new THREE.Color(1, 1, 1), tmp = new V3(), tmp2 = new V3();
const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const dir = p => p ? -1 : 1, homeX = p => (W / H < 1.3 ? 1.75 : 2.3) * (p ? 1 : -1);
const PC = ['#ff3344', '#4aa3ff'], pcol = p => PC[p];
const readPC = () => { for (const p of [0, 1]) try { const v = getComputedStyle(document.body).getPropertyValue('--p' + (p + 1)).trim(); if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) PC[p] = v; } catch (e) { /* nada */ } };
const colOf = p => { const s = FT[p], e = opts.elOf && opts.elOf(p); return (s && s.look.au) || (e && e.c) || pcol(p); };
const later = (sec, fn) => LATER.push({ t: sec, fn });
const okc = c => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c.trim()) ? c.trim() : null; // game.js a veces pasa var(--p1)

/* ---------------- escena ---------------- */
const ENV = { top: new THREE.Color(), hor: new THREE.Color(), glow: new THREE.Color(), base: new THREE.Color(), moon: new THREE.Color(), dz: 0, dzc: new THREE.Color() };
const AMB = {
  def: { top: '#05030c', hor: '#2a1446', glow: '#6a35a8', base: '#151022', moon: '#e9e2ff' },
  dz: { top: '#000000', hor: '#120818', glow: '#ffffff', base: '#07050a', moon: '#000000' },
  shr: { top: '#0c0000', hor: '#4a000c', glow: '#ff1f3d', base: '#140306', moon: '#ff1f3d' },
  gen: { top: '#0a0000', hor: '#4a000a', glow: '#c4001a', base: '#120204', moon: '#ff2a3a' },
  tsk: { top: '#2a0006', hor: '#c8101f', glow: '#ff2a3a', base: '#0c0204', moon: '#ff2a3a' },
  ecl: { top: '#120000', hor: '#3a0000', glow: '#ff3b1f', base: '#100202', moon: '#000000' },
  rmb: { top: '#2a160c', hor: '#a86a40', glow: '#ffb27a', base: '#24170e', moon: '#ffcf9a' },
  mug: { top: '#08090c', hor: '#1a1d26', glow: '#2a2d36', base: '#0c0d10', moon: '#6a6d76' },
  hki: { top: '#060000', hor: '#2a0000', glow: '#ff1e1e', base: '#0e0404', moon: '#ff1e1e' },
  dark: { top: '#000000', hor: '#000000', glow: '#000000', base: '#000000', moon: '#000000' },
  god: { top: '#fff6e0', hor: '#ffffff', glow: '#ffffff', base: '#d8d0c0', moon: '#ffffff' },
  mih0: { top: '#5ab8ff', hor: '#d8f2ff', glow: '#ffffff', base: '#3a4a5a', moon: '#ffffff' },
};
let floorM = null, skyM = null, moon = null, moonG = null, rocks = [], lights = {};
function buildEnv() {
  scene.fog = null;
  skyM = new THREE.ShaderMaterial({ uniforms: { top: { value: ENV.top }, hor: { value: ENV.hor }, glow: { value: ENV.glow }, t: { value: 0 } }, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform vec3 top;uniform vec3 hor;uniform vec3 glow;uniform float t;varying vec3 vD;
void main(){vec3 d=normalize(vD);float y=d.y;vec3 c=mix(hor,top,smoothstep(-.02,.55,y));c+=glow*pow(max(0.0,1.0-abs(y-.03)*3.5),3.0)*.55;
vec3 p=d*160.0;vec3 id=floor(p);float h=fract(sin(dot(id,vec3(12.9898,78.233,37.719)))*43758.5453);float s=step(.9965,h)*smoothstep(.5,.1,length(fract(p)-.5))*smoothstep(.02,.3,y);
c+=vec3(s)*(.55+.45*sin(t*2.0+h*60.0))*(1.0-smoothstep(.3,.9,dot(hor,vec3(.3,.6,.1))));gl_FragColor=vec4(c,1.0);}` });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(95, 32, 16), skyM); sky.renderOrder = -10; scene.add(sky);
  floorM = new THREE.ShaderMaterial({ uniforms: { base: { value: ENV.base }, glow: { value: ENV.glow }, hor: { value: ENV.hor }, c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, p0: { value: new THREE.Vector2(-2.3, 0) }, p1: { value: new THREE.Vector2(2.3, 0) }, t: { value: 0 }, dz: { value: 0 }, dzc: { value: ENV.dzc } },
    vertexShader: `varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform vec3 base;uniform vec3 glow;uniform vec3 hor;uniform vec3 c0;uniform vec3 c1;uniform vec2 p0;uniform vec2 p1;uniform float t;uniform float dz;uniform vec3 dzc;varying vec3 vW;
void main(){vec2 q=vW.xz;float r=length(q);float a=atan(q.y,q.x);vec3 c=base;
float rl=smoothstep(.47,.5,abs(fract(r*.5)-.5))*(1.0-smoothstep(3.0,13.0,r));float sl=smoothstep(.475,.5,abs(fract(a/6.2832*24.0)-.5))*smoothstep(1.2,2.5,r)*(1.0-smoothstep(5.0,11.0,r));
c+=glow*(rl*.10+sl*.05);c+=glow*smoothstep(.09,0.0,abs(r-7.0))*.55;
vec2 d0=q-p0,d1=q-p1;c+=c0*exp(-dot(d0,d0)*.45)*.5+c1*exp(-dot(d1,d1)*.45)*.5;
float a2=a+t*.35;float rune=step(.55,fract(a2/6.2832*18.0))*smoothstep(.12,0.0,abs(r-4.6))+smoothstep(.05,0.0,abs(r-4.2))+smoothstep(.05,0.0,abs(r-5.0))+step(.5,fract(r*3.0-t))*smoothstep(4.0,0.0,r)*.18;
c=mix(c,c*.3+dzc*rune*1.4,dz);c=mix(c,hor*.5,smoothstep(9.0,42.0,r));gl_FragColor=vec4(c,1.0);}` });
  const fl = new THREE.Mesh(new THREE.CircleGeometry(60, 96), floorM); fl.rotation.x = -Math.PI / 2; fl.renderOrder = -9; scene.add(fl);
  moonG = new THREE.MeshBasicMaterial({ color: ENV.moon, fog: false }); moon = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16), moonG); moon.position.set(-26, 20, -70); scene.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color('#b8a8ff').multiplyScalar(.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); halo.scale.setScalar(34); halo.position.copy(moon.position); scene.add(halo); lights.halo = halo;
  const rg = new THREE.DodecahedronGeometry(1, 0), rm = new THREE.MeshToonMaterial({ color: '#251d33' });
  for (let i = 0; i < 18; i++) { const a = Math.PI + (i / 17 - .5) * 3.6 + rr(-.08, .08), d = rr(15, 26), m = new THREE.Mesh(rg, rm); m.position.set(Math.sin(a) * d, 0, Math.cos(a) * d); m.scale.set(rr(1, 2.4), rr(2.5, 9), rr(1, 2.4)); m.rotation.set(rr(-.15, .15), rr(0, TAU), rr(-.15, .15)); scene.add(m); }
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(rg, rm), a = rr(-2.6, 2.6) + Math.PI, d = rr(8, 16); m.position.set(Math.sin(a) * d, rr(2.5, 6.5), Math.cos(a) * d); m.scale.setScalar(rr(.25, .8)); scene.add(m); rocks.push({ m, y: m.position.y, ph: rr(0, TAU), sp: rr(.4, .9) }); }
  lights.hemi = new THREE.HemisphereLight('#c8bfff', '#1c1226', 1.15); scene.add(lights.hemi);
  const key = new THREE.DirectionalLight('#fff3e6', 2.35); key.position.set(-3, 8, 9); scene.add(key); lights.key = key;
  lights.r0 = new THREE.DirectionalLight('#ff3344', 2.2); lights.r0.position.set(-7, 4, -8); scene.add(lights.r0);
  lights.r1 = new THREE.DirectionalLight('#4aa3ff', 2.2); lights.r1.position.set(7, 4, -8); scene.add(lights.r1);
}
let ambK = 'def';
function ambience(dt) {
  const L = stage.classList, has = c => L.contains(c);
  let k = has('dark') ? 'dark' : has('god') ? 'god' : has('shr') ? 'shr' : has('tsk') ? 'tsk' : has('ecl') ? 'ecl' : has('gen') ? 'gen' : has('hki') ? 'hki' : has('rmb') ? 'rmb' : has('mug') ? 'mug' : has('dz0') || has('dz1') ? 'dz' : has('mih') ? 'mih' : 'def';
  ambK = k; let A = AMB[k] || AMB.def;
  if (k === 'mih') { const s = Math.sin(T * 4) * .5 + .5; A = s > .5 ? AMB.mih0 : AMB.def; }
  const r = Math.min(1, dt * (k === 'god' || k === 'dark' ? 10 : k === 'mih' ? 12 : 3));
  ENV.top.lerp(tmpC.set(A.top), r); ENV.hor.lerp(tmpC.set(A.hor), r); ENV.base.lerp(tmpC.set(A.base), r); ENV.moon.lerp(tmpC.set(A.moon), r);
  const dzOn = k === 'dz' || k === 'shr'; if (dzOn) ENV.dzc.lerp(tmpC.set(k === 'shr' ? '#ff1f3d' : pcol(has('dz0') ? 0 : 1)), r);
  ENV.glow.lerp(tmpC.set(k === 'dz' ? '#' + ENV.dzc.getHexString() : A.glow), r);
  ENV.dz += ((dzOn ? 1 : 0) - ENV.dz) * Math.min(1, dt * 3); floorM.uniforms.dz.value = ENV.dz;
  TINT.lerp(tmpC.set(TINTS[k] || '#ffffff'), r);
  lights.hemi.intensity = k === 'dark' ? .25 : k === 'god' ? 2.2 : 1.15; lights.halo.material.color.copy(ENV.moon).multiplyScalar(.45);
}
const tmpC = new THREE.Color(), TINT = new THREE.Color(1, 1, 1); // TINT: luz de la escena sobre los dibujos de los luchadores
const TINTS = { dark: '#3a3a46', tsk: '#ffaaaa', shr: '#ffc4c4', gen: '#ffbcbc', hki: '#ffc8c8', ecl: '#ffb4a4', mug: '#aeb2be', rmb: '#ffe0c4', dz: '#e4dcf0' };

/* ---------------- luchadores ---------------- */
function slotOf(p) { return FT[p]; }
function removeFighter(p) { const s = FT[p]; if (!s) return; scene.remove(s.F.root); if (s.F.mesh) scene.remove(s.F.mesh); scene.remove(s.aura); scene.remove(s.pool); scene.remove(s.shadow); s.F.dispose(); s.aura.geometry.dispose(); s.aura.material.dispose(); s.pool.material.dispose(); s.shadow.material.dispose(); FT[p] = null; }
function addFighter(p, name) {
  removeFighter(p);
  const c = opts.charOf ? opts.charOf(name) : null, look = lookOf(c || { n: name });
  // su dibujo real (luchadores/ o, si no hay, su retrato); el muñeco 3D solo si game.js no da imágenes
  const F = opts.artOf ? buildSprite(name || '?', look, loadArt(name || '?', opts.artOf(name || '?'))) : buildFighter(name || '?', look), A = new Anim(F, p);
  F.root.rotation.order = 'YXZ'; scene.add(F.root); if (F.mesh) scene.add(F.mesh);
  F.mats.forEach(m => { m.userData.e0 = m.emissive.clone(); m.userData.i0 = m.emissiveIntensity; });
  const col = (look.au) || (opts.elOf && opts.elOf(p) && opts.elOf(p).c) || pcol(p);
  const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), energyMat(col, '#ffffff', 2, 2)); aura.material.uniforms.op.value = 0; aura.renderOrder = 4; scene.add(aura);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TEX.glow, color: new THREE.Color(pcol(p)), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pool.rotation.x = -Math.PI / 2; pool.renderOrder = 2; scene.add(pool);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TEX.glow, color: 0x000000, transparent: true, depthWrite: false, opacity: .75 })); shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 3; scene.add(shadow);
  const s = { p, F, A, look, name, aura, pool, shadow, lv: 0, boost: 0, auraC: new THREE.Color(col), auraK: '', fl: 0, expr: 'n', exprU: 0, blink: rr(1.5, 4), dead: false, gone: false, win: false, busyU: 0, lie: 0, cls: '', emitT: 0, op: 1, opT: 1 };
  FT[p] = s; A.R.x = homeX(p); A.lastX = A.R.x; A.yawOff = A.yawT = -.3 * dir(p);
  return s;
}
const chest = (p, out = new V3()) => { const s = FT[p]; if (!s) return out.set(homeX(p), 1.25, 0); return s.F.J.chest.getWorldPosition(out).add(tmp2.set(0, .12 * s.F.S, 0)); };
const hand = (p, k = 'R', out = new V3()) => { const s = FT[p]; if (!s) return out.set(homeX(p) + dir(p) * .5, 1.2, 0); return s.F.J['hd' + k].getWorldPosition(out); };
const feet = (p, out = new V3()) => { const s = FT[p]; return out.set(s ? s.A.R.x : homeX(p), 0, s ? s.A.R.z : 0); };
const expr = (p, e, sec) => { const s = FT[p]; if (!s) return; s.expr = e; s.exprU = T + sec; s.F.setExpr(e); };
function play(p, seq, keep) { const s = FT[p]; if (s && !s.dead) s.A.play(seq, keep); }
function move(p, o) { const s = FT[p]; if (s && !s.dead) s.A.move(o); }
function busy(p, sec) { const s = FT[p]; if (s) { s.busyU = Math.max(s.busyU, T + sec); s.A.yawT = 0; } }
function home(p, d = .32, arc = .18) { const s = FT[p]; if (!s || s.dead) return; s.A.move({ x: homeX(p), z: 0, y: 0, d, e: 'io', arc }); }
function afterimage(p, col, n = 3, gap = .04, op = .3) { const s = FT[p]; if (!s || RM) return; for (let i = 0; i < n; i++) later(i * gap, () => { const S = FT[p]; if (!S || S.dead) return; const g = ghostOf(S.F, col || colOf(p), op); scene.add(g); const m = g.userData.mat; fx.anim(.28, k => { m.opacity = op * (1 - k); }, () => { scene.remove(g); m.dispose(); }); }); }
function auraState(p) {
  const f = document.getElementById('abf' + p), L = f ? f.classList : null, pc = colOf(p);
  if (!L || L.contains('ko') || L.contains('dust') || L.contains('gone')) return { lv: 0, c: pc, c2: '#ffffff' };
  if (L.contains('g5')) return { lv: 2, c: '#ffffff', c2: '#ffffff' };
  if (L.contains('adult')) return { lv: 2.6, c: '#ffc21f', c2: '#fff3a0' };
  if (L.contains('gt')) return { lv: 2.4, c: '#ff3b3b', c2: '#3dff9e' };
  if (L.contains('hk')) return { lv: 2.1, c: '#ff6a00', c2: '#fff2a0' };
  if (L.contains('ego')) return { lv: 1.3 + .15 * (parseFloat(f.style.getPropertyValue('--lv')) || 1), c: '#a43cff', c2: '#f0c8ff' };
  if (L.contains('jp')) return { lv: 1.7, c: '#3dff9e', c2: '#ffd23f' };
  if (L.contains('rg')) return { lv: 1.8, c: '#ff2a2a', c2: '#ffb0a0' };
  if (L.contains('emp')) return { lv: 1.3, c: '#ff1f3d', c2: '#ffc0c8' };
  if (L.contains('aw')) return { lv: 2, c: pc, c2: '#ffffff' };
  if (L.contains('burn')) return { lv: 1.3, c: '#7a2ae0', c2: '#2a0840', dark: 1 };
  if (L.contains('anti')) return { lv: 1.5, c: '#2e5a1a', c2: '#0a1404', dark: 1 };
  if (L.contains('win')) return { lv: .45, c: pc, c2: '#ffffff' };
  return { lv: 0, c: pc, c2: '#ffffff' };
}
function updFighter(s, dt, wdt) {
  const p = s.p, F = s.F, A = s.A, J = F.J;
  if (T >= s.busyU) A.yawT = -.3 * dir(p);
  A.yawOff += (A.yawT - A.yawOff) * Math.min(1, dt * 7);
  const tstop = stage.classList.contains('tstop');
  A.update(tstop && p !== actor ? 0 : wdt);
  const Rr = A.R; F.root.position.set(Rr.x, Rr.y + s.lie * .2 * F.S, Rr.z); F.root.rotation.set(Rr.rx, (p ? -Math.PI / 2 : Math.PI / 2) + A.yawOff, Rr.rz);
  // clases que pone game.js en la tarjeta oculta del luchador
  const f = document.getElementById('abf' + p), cls = f ? f.className : '';
  if (cls !== s.cls) {
    const had = k => (' ' + s.cls + ' ').includes(' ' + k + ' '), hasK = k => (' ' + cls + ' ').includes(' ' + k + ' ');
    if (hasK('win') && !had('win') && !s.dead) { play(p, [['victory', .45, 'back', .1]], true); expr(p, 'n', 0); shot('win', p, 2200); }
    if (!hasK('win') && had('win') && !s.dead) play(p, [[A.base, .35, 'io']]);
    if (hasK('gone') && !s.gone) vanish(p);
    if (hasK('aw') && !had('aw')) powerBurst(p, 1.4);
    if ((hasK('g5') && !had('g5')) || (hasK('adult') && !had('adult')) || (hasK('gt') && !had('gt')) || (hasK('ego') && !had('ego'))) powerBurst(p, 1.8);
    s.mir = hasK('mir'); s.cln = hasK('cln');
    s.cls = cls;
  }
  s.opT = s.gone ? 0 : s.mir ? .35 + Math.sin(T * 30) * .15 : s.dead ? s.opT : 1;
  if (Math.abs(s.op - s.opT) > .002) { s.op += (s.opT - s.op) * Math.min(1, dt * (s.mir ? 30 : 6)); F.opacity(s.op); }
  if (s.cln && (s.emitC = (s.emitC || 0) - dt) <= 0) { s.emitC = .7; for (const z of [-.8, .8]) { const g = ghostOf(F, colOf(p), .35); g.position.z += z; g.position.x -= dir(p) * .3; scene.add(g); const m = g.userData.mat; fx.anim(.6, k => { m.opacity = .35 * Math.sin(k * Math.PI); }, () => { scene.remove(g); m.dispose(); }); } }
  // aura
  if ((s.auraT = (s.auraT || 0) - dt) <= 0) { s.auraT = .1; s.as = auraState(p); }
  const st = s.as || { lv: 0, c: colOf(p), c2: '#fff' }, lvT = s.dead ? 0 : st.lv + s.boost;
  s.boost = Math.max(0, s.boost - dt * .9); s.lv += (lvT - s.lv) * Math.min(1, dt * 5);
  if (st.c !== s.auraK) { s.auraK = st.c; s.auraC.set(st.c); s.aura.material.uniforms.col.value.set(st.c).multiplyScalar(2); s.aura.material.uniforms.core.value.set(st.c2 || '#fff').multiplyScalar(2.2); }
  const H = F.H, lv = Math.min(3, s.lv), au = s.aura;
  au.position.set(Rr.x, Rr.y + H * .5 + s.lie * .1, Rr.z); au.scale.set(.5 * F.S + lv * .1, H * (.58 + lv * .05), .45 * F.S + lv * .1);
  au.material.uniforms.op.value = Math.min(.8, lv * .3) * (s.op); au.material.uniforms.t.value = T; au.material.uniforms.sp.value = 1 + lv * .5; au.visible = lv > .02;
  if (lv > .15 && !s.dead) { s.emitT -= dt * lv * 38 * fx.q1; while (s.emitT < 0) { s.emitT += 1; const a = rr(0, TAU), r = rr(.15, .5) * F.S;
    if (st.dark) fx.smokeP.add({ x: Rr.x + Math.cos(a) * r, y: Rr.y + rr(0, H * .6), z: Rr.z + Math.sin(a) * r, vx: 0, vy: rr(1, 2.2), vz: 0, l: rr(.5, .9), s: rr(.3, .55), r: .05, gg: .02, b: .08, a: .5, grow: 1, dr: .8, fi: 2, fo: 6 });
    else { const c = s.auraC; fx.glowP.add({ x: Rr.x + Math.cos(a) * r, y: Rr.y + rr(0, H * .5), z: Rr.z + Math.sin(a) * r, vx: 0, vy: rr(1.6, 3.4) * (.7 + lv * .3), vz: 0, l: rr(.35, .7), s: rr(.04, .11), r: c.r * 2.4, gg: c.g * 2.4, b: c.b * 2.4, dr: .5, shr: 1 }); } } }
  s.pool.position.set(Rr.x, .02, Rr.z); s.pool.scale.setScalar(2.6 + lv * .9); s.pool.material.color.copy(lv > .2 ? s.auraC : tmpC.set(pcol(p))).multiplyScalar(.35 + lv * .45); s.pool.material.opacity = s.op;
  const hgt = Math.max(0, Rr.y); s.shadow.position.set(Rr.x, .015, Rr.z); s.shadow.scale.setScalar(Math.max(.4, 1.5 * F.S - hgt * .25)); s.shadow.material.opacity = .7 * s.op * Math.max(.2, 1 - hgt * .2);
  // destello al recibir un golpe, parpadeo y expresión
  if (s.fl > 0 || s.flOn) { s.fl = Math.max(0, s.fl - dt * 7); s.flOn = s.fl > 0; for (const m of F.mats) { const e0 = m.userData.e0; m.emissive.setRGB(e0.r + (1 - e0.r) * s.fl, e0.g + (1 - e0.g) * s.fl, e0.b + (1 - e0.b) * s.fl); m.emissiveIntensity = Math.max(m.userData.i0 * (1 - s.fl), s.fl * .42); } }
  if (T > s.exprU && s.expr !== 'n' && !s.dead) { s.expr = 'n'; F.setExpr('n'); }
  if ((s.blink -= dt) <= 0 && !s.dead) { s.blink = rr(2, 5); if (s.expr === 'n') { F.setExpr('b'); later(.11, () => { if (FT[p] === s && s.expr === 'n' && !s.dead) F.setExpr('n'); }); } }
  if (F.extra.halo) F.extra.halo.rotation.z += dt * .6;
}
function powerBurst(p, k = 1) { const s = FT[p]; if (!s) return; s.boost = Math.max(s.boost, k); const c = colOf(p), f = feet(p);
  fx.ring(tmp.copy(f).setY(.05), 2.4 * k, c, .55, { flat: 1, inner: .7 }); fx.smoke(f, 10, '#2a2233', { max: 3.2, up: .3 }); fx.debris(tmp.copy(f).setY(.1), 8);
  fx.glow(chest(p), 30, c, { max: 5, l1: .6 }); shake(.35); shot('focus', p, 900); }
function pillar(x, z, c, life) { // columna de luz que sube desde el suelo (el alma de un K.O.)
  const m = energyMat(c, '#ffffff', 1, 2.2), g = new THREE.CylinderGeometry(.5, .85, 16, 32, 1, true), b = new THREE.Mesh(g, m); b.position.set(x, 8, z); b.renderOrder = 5; scene.add(b);
  fx.anim(life, k => { m.uniforms.t.value = T; m.uniforms.op.value = Math.min(1, k * 8) * Math.pow(1 - k, 1.4) * .85; const r = k < .7 ? 1 + k * .3 : 1.21 * (1 - (k - .7) / .3 * .85); b.scale.set(r, 1, r); },
    () => { scene.remove(b); g.dispose(); m.dispose(); }); }
function vanish(p) { const s = FT[p]; if (!s) return; s.gone = true; const c = chest(p); fx.glow(c, 120, '#ffffff', { max: 6, sx: .3, sy: .8, sz: .3, l1: 1 }); fx.sprite(c, 4, '#ffffff', .4); }

/* ---------------- cámara ---------------- */
const CAM = { pos: new V3(0, 1.8, 10), look: new V3(0, 1.1, 0), tPos: new V3(), tLook: new V3(), fov: 30, kick: 0, trauma: 0, shot: null, until: 0, ko: 0 };
function shot(kind, p, ms) { CAM.shot = { kind, p, t0: T }; CAM.until = T + (ms || 1000) / 1000; }
function shake(k) { if (RM) k *= .3; CAM.trauma = Math.min(1, CAM.trauma + k); }
function camUpdate(dt) {
  const asp = W / H, tanH = Math.tan(THREE.MathUtils.degToRad(CAM.fov / 2));
  const x0 = FT[0] ? FT[0].A.R.x : homeX(0), x1 = FT[1] ? FT[1].A.R.x : homeX(1), mx = (x0 + x1) / 2;
  const half = Math.abs(x1 - x0) / 2 + (asp < 1.3 ? 1.15 : 1.75), dist = Math.min(30, Math.max(6.6, half / (tanH * asp), 2.3 / tanH));
  const yaw = Math.sin(T * .21) * .15 + Math.sin(T * .13) * .06;
  let k = 2.6, sh = T < CAM.until ? CAM.shot : null;
  if (sh) { const p = sh.p, fxp = FT[p] ? FT[p].A.R.x : homeX(p), d = dir(p), Hh = FT[p] ? FT[p].F.H : 2.2;
    if (sh.kind === 'focus' || sh.kind === 'win') { CAM.tPos.set(fxp + d * 2.2, Hh * .62, 5.9); CAM.tLook.set(fxp + d * .35, Hh * .66, 0); k = 3.6; }
    else if (sh.kind === 'low') { CAM.tPos.set(fxp + d * 2.1, .75, 5.6); CAM.tLook.set(fxp + d * .3, Hh * .7, 0); k = 4; }
    else if (sh.kind === 'side') { const v = FT[1 - p] ? FT[1 - p].A.R.x : homeX(1 - p); CAM.tPos.set(fxp - d * 1.6, 2.2, dist * .9); CAM.tLook.set((fxp + v) / 2 + d * .5, 1.35, 0); k = 3.4; }
    else if (sh.kind === 'hit') { CAM.tPos.set(fxp * .6 + mx * .4, 1.8, dist * .78); CAM.tLook.set(fxp * .7 + mx * .3, 1.4, 0); k = 5; }
    else if (sh.kind === 'ko') { const a = (T - sh.t0) * .55 + .3; CAM.tPos.set(fxp + Math.sin(a) * 4.8, 1.5, Math.cos(a) * 4.8 + .6); CAM.tLook.set(fxp, .55, 0); k = 3; }
    else if (sh.kind === 'die') { const u = T - sh.t0, a = u * .35 + .3, w = Math.min(u, 2), r = 5.2 + w * .9; CAM.tPos.set(fxp + Math.sin(a) * r, 1.3 + w * .5, Math.cos(a) * r + .6); CAM.tLook.set(fxp, .6 + Math.max(0, Math.min(u - .5, 1.5)) * .9, 0); k = 2.6; } // gira alrededor del cuerpo y sube con el alma
    else if (sh.kind === 'wide') { CAM.tPos.set(mx + Math.sin(yaw) * dist * 1.2, 2.6, Math.cos(yaw) * dist * 1.2); CAM.tLook.set(mx, 1.4, 0); k = 3; }
  } else { CAM.tPos.set(mx + Math.sin(yaw) * dist, 2.1 + Math.sin(T * .17) * .1, Math.cos(yaw) * dist); CAM.tLook.set(mx, 1.6, 0); } // mirando algo alto: el HUD tapa la parte de arriba
  if (CAM.snap) { CAM.snap = 0; CAM.pos.copy(CAM.tPos); CAM.look.copy(CAM.tLook); }
  CAM.pos.lerp(CAM.tPos, 1 - Math.exp(-dt * k)); CAM.look.lerp(CAM.tLook, 1 - Math.exp(-dt * (k + 2)));
  CAM.trauma = Math.max(0, CAM.trauma - dt * 1.7); CAM.kick *= Math.exp(-dt * 7);
  const s = CAM.trauma * CAM.trauma * .32, n = T * 38;
  cam.position.set(CAM.pos.x + Math.sin(n * 1.1) * s, CAM.pos.y + Math.sin(n * 1.37 + 1) * s * .8, CAM.pos.z + Math.sin(n * .9 + 2) * s * .5);
  cam.lookAt(CAM.look); cam.rotateZ(Math.sin(n * .7) * s * .12);
  const fov = CAM.fov - CAM.kick; if (Math.abs(cam.fov - fov) > .01) { cam.fov = fov; cam.updateProjectionMatrix(); }
}

/* ---------------- bucle ---------------- */
function init() {
  cv = document.createElement('canvas'); cv.className = 'ab-3d'; cv.setAttribute('aria-hidden', 'true');
  R = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance', alpha: false });
  R.setClearColor(0x05030c, 1); R.toneMapping = THREE.NoToneMapping;
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); failed = true; on = false; });
  scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(30, 2, .1, 220);
  PR = Math.min(window.devicePixelRatio || 1, 1.75); R.setPixelRatio(PR);
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(R, rt); composer.addPass(new RenderPass(scene, cam));
  bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), .62, .42, 1.05); composer.addPass(bloom); composer.addPass(new OutputPass());
  fx = new FX(scene); buildEnv();
  ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => resize()) : null;
}
function resize() {
  if (!stage || !R) return; const w = Math.max(2, stage.clientWidth), h = Math.max(2, stage.clientHeight);
  if (w === W && h === H) return; const jump = !W || W < 50 || H < 50; W = w; H = h; if (jump) CAM.snap = 1; // tamaño de verdad por primera vez: la cámara se coloca sin viaje
  R.setSize(w, h, false); composer.setPixelRatio(PR); composer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); OL_U.asp.value = w / h;
  cv.style.width = '100%'; cv.style.height = '100%';
}
function quality(dt) { // si el dispositivo no llega a 45 fps, baja la resolución y las partículas
  if (dt > .024) { lagT += dt; okT = 0; if (lagT > 1.2 && PR > .7) { PR = Math.max(.7, PR * .82); R.setPixelRatio(PR); composer.setPixelRatio(PR); composer.setSize(W, H); fx.q1 = Math.max(.4, fx.q1 * .85); lagT = 0; } }
  else { lagT = Math.max(0, lagT - dt * .5); okT += dt; }
}
function loop(g) {
  if (!on || g !== gen) return;
  if (!cv.isConnected) { stop(); return; }
  requestAnimationFrame(() => loop(g));
  frame();
}
function frame(fixed) { // un fotograma (fixed = segundos simulados, para depurar con la pestaña oculta)
  try {
    const t = now(), rdt = fixed != null ? fixed : Math.min(.05, (t - last) / 1000); last = t; if (PAUSE && fixed == null) { composer.render(); return; } T += rdt; if (fixed == null) quality(rdt);
    if (stage.offsetParent === null) return;
    if ((sizeT -= rdt) <= 0) { sizeT = .5; if (stage.clientWidth !== W || stage.clientHeight !== H) resize(); } // por si el ResizeObserver no avisa (pestaña en segundo plano)
    let wdt = rdt; if (HS > 0) { HS -= rdt; wdt = 0; }
    const tstop = stage.classList.contains('tstop'), fdt = wdt * (t < slowU ? slowK : 1) * (tstop ? .02 : 1);
    for (let i = LATER.length - 1; i >= 0; i--) { const o = LATER[i]; o.t -= wdt; if (o.t <= 0) { LATER.splice(i, 1); try { o.fn(); } catch (e) { console.warn('F3D', e); } } }
    for (const s of FT) if (s) updFighter(s, rdt, wdt);
    fx.update(fdt, cam);
    ambience(rdt); skyM.uniforms.t.value = T; floorM.uniforms.t.value = T;
    for (const p of [0, 1]) { const s = FT[p], c = floorM.uniforms['c' + p].value; c.set(pcol(p)).multiplyScalar(s && !s.dead ? .6 : .15); floorM.uniforms['p' + p].value.set(s ? s.A.R.x : homeX(p), s ? s.A.R.z : 0); }
    lights.r0.color.set(pcol(0)); lights.r1.color.set(pcol(1));
    for (const r of rocks) r.m.position.y = r.y + Math.sin(T * r.sp + r.ph) * .35;
    if (Math.random() < rdt * 14 * fx.q1) { const c = ENV.glow; fx.glowP.add({ x: rr(-9, 9), y: 0, z: rr(-6, 2), vx: rr(-.2, .2), vy: rr(.4, 1.1), vz: 0, l: rr(3, 6), s: rr(.03, .07), r: c.r * 1.6 + .2, gg: c.g * 1.6 + .1, b: c.b * 1.6 + .2, dr: 0, fi: 1, fo: 3 }); }
    camUpdate(rdt); cam.updateMatrixWorld();
    for (const s of FT) if (s && s.F.sync) s.F.sync(s, cam, { dir: dir(s.p), pc: pcol(s.p), tint: TINT });
    fx.glowP.m.material.uniforms.scale.value = fx.smokeP.m.material.uniforms.scale.value = H * PR / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
    composer.render();
  } catch (e) { console.warn('F3D', e); }
}
function stop() { on = false; if (ro) ro.disconnect(); LATER.length = 0; for (const p of [0, 1]) removeFighter(p); if (fx) fx.clear(); PEND.forEach(r => r()); PEND.clear(); }
const PEND = new Set(); // promesas de las técnicas que siguen abiertas (se resuelven si el combate se corta)
const pend = (sec, fn) => new Promise(res => { const r = () => { PEND.delete(r); res(); }; PEND.add(r); later(sec, () => { try { fn && fn(); } finally { r(); } }); });

/* ---------------- lo que llama game.js ---------------- */
const X = { THREE, get scene() { return scene; }, get fx() { return fx; }, get cam() { return cam; }, FT, dir, homeX, chest, hand, feet, play, move, home, busy, later, pend, shot, shake, expr, afterimage, colOf, pcol, powerBurst,
  hitstop: ms => { HS = Math.max(HS, ms / 1000); }, kick: k => { CAM.kick = Math.max(CAM.kick, k); }, setActor: a => { actor = a; },
  word: (txt, pos, col) => { const box = stage && stage.querySelector('#abfx'); if (!box) return; const v = pos.clone().project(cam), el = document.createElement('span'); el.className = 'ab-num txt'; el.textContent = txt; el.style.left = ((v.x + 1) / 2 * W) + 'px'; el.style.top = ((1 - v.y) / 2 * H) + 'px'; if (col) el.style.color = col; box.appendChild(el); setTimeout(() => el.remove(), 800); } };
const TECH = makeTech(X);
function melee(a, o = {}) {
  const s = FT[a], v = FT[1 - a]; if (!s || s.dead) return; const d = dir(a), vx = v ? v.A.R.x : homeX(1 - a);
  actor = a; busy(a, .7); expr(a, 'a', .6);
  const F = s.F, w = F.armed, pl = F.pole, crit = o.big, n = (s.combo = (s.combo || 0) + 1);
  let seq, reach = 1.02, k = 'R';
  if (w) { const v2 = n % 2; seq = v2 ? [['slashA', .07, 'out'], ['slashB', .07, 'snap', .12]] : [['slashH1', .07, 'out'], ['slashH2', .07, 'snap', .12]]; reach = 1.45; }
  else if (pl) { seq = [['jabR', .1, 'snap', .12]]; reach = 1.6; }
  else { const m = crit ? ['upperR', 'kickR', 'hookR', 'kneeR'][n % 4] : ['jabR', 'jabR_m', 'hookR', 'kickR', 'jabR_m', 'hookR_m'][n % 6]; seq = [['dash', .06, 'out'], [m, .08, 'snap', .1]]; reach = /kick/.test(m) ? 1.25 : m === 'kneeR' ? .85 : 1.02; k = /_m$/.test(m) ? 'L' : 'R'; }
  if (o.ts) seq = seq.map(x => [x[0], x[1] * .6, x[2], (x[3] || 0) * .5]);
  play(a, seq); move(a, { x: vx - d * reach, z: v ? v.A.R.z : 0, d: o.ts ? .08 : .13, e: 'out' });
  afterimage(a, null, 2, .035, .35);
  fx.trail(() => hand(a, k), w ? '#e8f2ff' : colOf(a), .24, { w: w ? .16 : .09, keep: w ? .12 : .09 });
  if (w) fx.trail(() => { const e = F.extra.weapon; return e ? e.localToWorld(tmp.set(0, 0, 1.1)) : null; }, '#ffffff', .24, { w: .2, keep: .12 });
  later(o.miss ? .5 : .42, () => home(a));
}
function hurt(d, big) {
  const s = FT[d]; if (!s || s.dead) return; s.fl = 1; expr(d, 'h', .45); busy(d, .5);
  const n = (s.hn = (s.hn || 0) + 1);
  play(d, [[big ? (n % 2 ? 'hitB' : 'hitL') : (n % 2 ? 'hitL' : 'hitL_m'), .05, 'snap', big ? .14 : .08]]);
  const A = s.A; move(d, { x: A.R.x - dir(d) * (big ? .35 : .16), d: .1, e: 'out' });
  if (big) { X.hitstop(75); X.kick(2.2); }
  later(.32, () => { const S = FT[d]; if (S && !S.dead && !S.A.R.tw) home(d, .3, 0); });
}
function knock(d, lv) {
  const s = FT[d]; if (!s || s.dead || !lv) return; const D = dir(d), A = s.A;
  if (lv > 1) { busy(d, 3); play(d, [['fly', .1, 'out']], true); expr(d, 'k', 9);
    A.move({ x: Math.max(-6.5, Math.min(6.5, A.R.x - D * 3.2)), y: 0, d: .7, e: 'out', arc: 1.6, rx: -Math.PI / 2 });
    later(.66, () => { const S = FT[d]; if (!S) return; S.lie = 1; play(d, [['down', .15, 'out']], true); fx.crater(S.A.R.x, S.A.R.z, 1.1, colOf(1 - d)); fx.smoke(feet(d), 14, '#3a3344', { max: 3 }); fx.debris(tmp.copy(feet(d)).setY(.2), 12, { big: 1 }); shake(.45); X.hitstop(90); });
    shot('ko', d, 2400);
  } else { busy(d, .9); play(d, [['hitL', .08, 'snap', .2], ['airborne', .2, 'io'], ['land', .1, 'out', .12]]);
    A.move({ x: Math.max(-6, Math.min(6, A.R.x - D * 1.1)), d: .45, e: 'out', arc: .35 });
    later(.45, () => { fx.smoke(feet(d), 6, '#3a3344', { max: 2 }); fx.crater(FT[d] ? FT[d].A.R.x : 0, 0, .6, colOf(1 - d)); });
    later(.9, () => home(d, .38, .1)); }
}
const API = {
  ok() { if (SUP === null) { try { SUP = !!document.createElement('canvas').getContext('webgl2'); } catch (e) { SUP = false; } } return SUP && !failed; },
  start(st, o) {
    stop(); if (!API.ok()) return false;
    try { if (!R) init(); } catch (e) { failed = true; console.warn('F3D', e); return false; }
    stage = st; opts = o || {}; readPC(); (st.querySelector('.ab-world') || st).appendChild(cv); W = H = 0; resize(); if (ro) ro.observe(st);
    actor = -1; HS = 0; slowU = 0; CAM.shot = null; CAM.until = 0; CAM.trauma = 0; CAM.snap = 1; T = 0;
    if (opts.artOf && opts.names) opts.names.forEach(n => loadArt(n, opts.artOf(n))); // los dibujos se cargan antes de que entren
    on = true; last = now(); const g = ++gen; requestAnimationFrame(() => loop(g)); return true;
  },
  stop,
  screen(p, f = .42) { const s = FT[p]; if (!cam || !W) return { x: 0, y: 0 }; const Hh = s ? s.F.H : 2.2, Rr = s ? s.A.R : { x: homeX(p), y: 0, z: 0 };
    const v = tmp.set(Rr.x, Rr.y + Hh * (1 - f) * (s && s.lie ? .2 : 1), Rr.z).project(cam); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H }; },
  enter(p) { if (!on) return; const card = document.getElementById('abc' + p), n = card && card.dataset.n; const s = addFighter(p, n);
    const A = s.A; A.R.y = 7; A.play([['airborne', .01, 'lin']], true); A.move({ y: 0, d: .34, e: 'in' }); busy(p, 1);
    shot('low', p, 1300);
    later(.34, () => { const S = FT[p]; if (S !== s) return; const f = feet(p); A.play([['land', .07, 'snap', .28], [A.base, .4, 'io']]);
      fx.ring(tmp.copy(f).setY(.05), 3, colOf(p), .6, { flat: 1, inner: .75 }); fx.crater(f.x, f.z, 1, colOf(p)); fx.smoke(f, 16, '#2e2638', { max: 3.6, up: .25 }); fx.debris(tmp.copy(f).setY(.1), 14); fx.sprite(tmp.copy(f).setY(.4), 3, colOf(p), .3);
      shake(.5); X.kick(2); }); },
  attack(a, o) { melee(a, o); }, hurt, knock, dodge(d) {
    const s = FT[d]; if (!s || s.dead) return; busy(d, .6); const A = s.A, side = Math.random() < .5;
    afterimage(d, '#bfe9ff', 1, 0, .5);
    if (side) { const z = (Math.random() < .5 ? -1 : 1) * 1; play(d, [['dodgeS', .07, 'out', .2]]); A.move({ z, x: A.R.x - dir(d) * .2, d: .1, e: 'out' }); }
    else { play(d, [['dodgeB', .07, 'out', .2]]); A.move({ x: A.R.x - dir(d) * .7, d: .12, e: 'out', arc: .25 }); }
    later(.36, () => home(d, .3, .1)); },
  dash(p) { afterimage(p, null, 2, .04, .35); },
  charge(a, col) { col = okc(col); const s = FT[a]; if (!s || s.dead) return; busy(a, .9); play(a, [['power', .12, 'out', .6]]); expr(a, 'a', .9); s.boost = Math.max(s.boost, 1.3);
    const c = col || colOf(a), cp = chest(a); fx.glow(cp, 50, c, { max: .1, l0: .5, l1: .8, to: cp, pull: 9, sx: 1.6, sy: 1.4, sz: 1.6, s0: .04, s1: .1 });
    fx.smoke(feet(a), 8, '#2e2638', { max: 2.6, up: .2 }); fx.ring(tmp.copy(feet(a)).setY(.05), 1.8, c, .5, { flat: 1 }); shot('low', a, 900); shake(.15); },
  hit(d, big, col) { col = okc(col); const s = FT[d]; const c = col || colOf(1 - d), p = chest(d).add(tmp2.set(-dir(d) * .25, 0, .15));
    if (T < (QUIET[d] || 0)) { fx.sprite(p, .8, c, .15); return; }
    fx.spark(p, big ? 34 : 14, c, { dir: tmp.set(dir(1 - d), .15, 0), spread: big ? 1.1 : .8, max: big ? 16 : 11 });
    fx.sprite(p, big ? 2 : 1.1, c, big ? .2 : .14, { tex: TEX.star, k: 2.2 }); fx.sprite(p, big ? 1 : .6, '#ffffff', .1, { k: 1.6 });
    fx.ring(p, big ? 1.7 : .9, c, big ? .35 : .25);
    if (big) { fx.glow(p, 24, c, { max: 6, l1: .5 }); fx.smoke(feet(d), 6, '#3a3344', { max: 2 }); shake(.32); shot('hit', d, 420); } else shake(.12); },
  boom(p, col, k = 1) { col = okc(col); const c = col || colOf(1 - p), cp = chest(p), f = feet(p);
    fx.sprite(cp, 5 * k, c, .5, { k: 2.4 }); fx.sprite(cp, 3 * k, '#ffffff', .25, { k: 2.4 }); fx.ring(cp, 3.4 * k, c, .5); fx.ring(tmp.copy(f).setY(.06), 4 * k, c, .7, { flat: 1, inner: .6 });
    fx.glow(cp, 70 * k, c, { max: 9 * k, l1: .9 }); fx.spark(cp, 40, c, { max: 18, up: .3 }); fx.smoke(f, 18 * k, '#2e2638', { max: 4.5 * k, size: 1.4, up: .8 }); fx.debris(tmp.copy(f).setY(.2), 16 * k, { big: 1 });
    fx.crater(f.x, f.z, 1.3 * k, c); shake(.6 * k); X.kick(3); },
  beam(a, big, col) { return TECH.beam(a, big, okc(col)); },
  tech(a, name, big, col, o) { if (!on || !FT[a] || !FT[1 - a]) return null; const ar = opts.arche ? opts.arche(String(name || '')) : { ar: 'beam', v: '', col: null }; const p = TECH.run(a, ar, big, okc(col) || okc(ar.col) || colOf(a), o || {}, String(name || '')); return p && p.then(() => { QUIET[1 - a] = T + .3; }); },
  clash() { TECH.clash(); }, clashX(x) { TECH.clashX(x); }, clashEnd(l) { TECH.clashEnd(l); API.boom(l, null, 1.2); },
  slow(k, ms) { slowK = k; slowU = now() + ms; },
  bf(d) { const c = chest(d); for (let i = 0; i < 9; i++) fx.bolt(c, tmp.copy(c).add(tmp2.set(rr(-1.6, 1.6), rr(-1.2, 1.4), rr(-1, 1))), i % 3 ? '#ff1f3d' : '#1a0005', .32, { w: .07, k: i % 3 ? 3 : .2 }); fx.sprite(c, 3.4, '#ff1f3d', .3); shake(.5); X.hitstop(110); },
  slash(d, col) { col = okc(col); for (let i = 0; i < 5; i++) later(i * .055, () => TECH.cut(d, col || '#ff1f3d')); },
  hakai(d) { const c = chest(d); fx.glow(c, 140, '#a43cff', { max: .2, to: c, pull: 7, sx: 2.2, sy: 2, sz: 2, l0: .6, l1: .8 }); later(.75, () => API.boom(d, '#a43cff', 1.3)); },
  nuke(d) { const c = chest(d), f = feet(d); fx.sprite(c, 16, '#ffffff', .7, { k: 3 }); fx.sprite(c, 9, '#ff9ec4', 1, { k: 2.2 }); fx.ring(tmp.copy(f).setY(.08), 14, '#ffffff', 1, { flat: 1, inner: .9 }); fx.ring(c, 10, '#ff9ec4', .9);
    fx.smoke(f, 40, '#3a2a33', { max: 6, size: 2, up: 2.5, life: 1.6 }); fx.glow(c, 160, '#ffc0d8', { max: 12, l1: 1.2 }); fx.debris(tmp.copy(f).setY(.2), 30, { big: 1 }); fx.crater(f.x, f.z, 2.4, '#ff9ec4'); shake(1); X.kick(5); shot('wide', d, 1600); },
  /* MUERTE (K.O.): golpe seco y la cámara gira alrededor del cuerpo → se le apaga el color y late dos veces → su alma (copia translúcida)
     sale de pie y sube dentro de una columna de luz → el cuerpo se quema desde la cabeza con el borde al rojo del color de quien le ha
     matado, y sus cenizas (con los colores del propio dibujo) se las lleva el viento en remolino → onda y quemadura en el suelo. ~1,9 s */
  dissolve(p) { const s = FT[p]; if (!s || s.dead) return false; s.dead = true; s.lv = 0; s.boost = 0;
    const F = s.F, D = dir(p), kc = colOf(1 - p), soul = '#cfe6ff', alive = () => FT[p] === s;
    const hot = new THREE.Color(kc).lerp(WHITE, .35).multiplyScalar(3.2);
    busy(p, 9); expr(p, 'k', 99); s.fl = 1; X.hitstop(120); shot('die', p, 2600);
    const fall = !s.lie, t0 = fall ? .45 : .1;
    if (fall) { s.A.play([['hitB', .12, 'out'], ['down', .35, 'in']], true); s.A.move({ rx: -Math.PI / 2, d: .42, e: 'in' });
      later(.4, () => { if (!alive()) return; s.lie = 1; fx.smoke(feet(p), 12, '#3a3344', { max: 2.6 }); fx.debris(tmp.copy(feet(p)).setY(.15), 8); shake(.3); }); }
    // 1) se le va la vida
    later(t0, () => { if (!alive()) return; fx.anim(.4, k => { if (F.gray) F.gray(k); s.fl = Math.max(s.fl, Math.max(0, Math.sin(k * Math.PI * 2)) * .4); }); fx.spark(chest(p), 14, kc, { max: 6, up: .5 }); });
    // 2) el alma sale del cuerpo y sube dentro de una columna de luz
    later(t0 + .25, () => { if (!alive()) return; const x = s.A.R.x, z = s.A.R.z, y0 = F.footY ? F.footY() : 0, g = ghostOf(F, soul, 0), m = g.userData.mat, sc = g.scale.clone();
      g.rotation.x = g.rotation.z = 0; scene.add(g);
      fx.anim(1.6, k => { const e = 1 - Math.pow(1 - k, 2); g.position.set(x + Math.sin(k * 7) * .07, y0 + e * 2.6, z); g.scale.copy(sc).multiplyScalar(1 + k * .18); m.opacity = .6 * Math.min(1, k * 5) * (1 - k);
        if (F.sprite) g.rotation.y = Math.atan2(cam.position.x - x, cam.position.z - z); }, () => { scene.remove(g); m.dispose(); });
      pillar(x, z, soul, 1.8); fx.ring(tmp.set(x, .06, z), 2.6, soul, .7, { flat: 1, inner: .78 }); fx.glow(tmp.set(x, .2, z), 30, soul, { max: 2.2, vy: 1.5, flat: 1, l1: 1 }); });
    // 3) el cuerpo se quema y se lo lleva el viento
    later(t0 + .35, () => { if (!alive()) return; const cx = s.A.R.x, cz = s.A.R.z, f = feet(p);
      fx.smoke(f, 10, '#2a2233', { max: 2, up: .6 }); fx.ring(tmp.copy(f).setY(.05), 2, kc, .5, { flat: 1, inner: .7 });
      const ash = (q, c, i) => { const sp = rr(.5, 1.6);
        fx.smokeP.add({ x: q.x + rr(-.03, .03), y: q.y, z: q.z + rr(-.03, .03), vx: -D * sp + rr(-.2, .2), vy: rr(.4, 1.3), vz: rr(-.6, .6), g: rr(.4, 1), l: rr(1.1, 2.1), s: rr(.035, .07), r: c.r, gg: c.g, b: c.b, a: .95, dr: .6, shr: 1, fi: 1.6, fo: 25, sw: rr(.5, 1.3) * (i % 2 ? 1 : -1), cx, cz });
        if (i % 2 === 0) fx.glowP.add({ x: q.x, y: q.y, z: q.z, vx: -D * rr(.2, 1), vy: rr(.8, 2.4), vz: rr(-.4, .4), l: rr(.35, .8), s: rr(.03, .06), r: hot.r * .8, gg: hot.g * .8, b: hot.b * .8, dr: 1.2, shr: 1 }); };
      const gone = () => { if (alive()) { F.root.visible = false; s.aura.visible = false; s.op = s.opT = 0; } };
      if (F.burn) { const pts = F.burnPts(), n = pts.length, every = Math.max(1, Math.ceil(n / (800 * fx.q1))); let i = 0; F.burn(.001, hot);
        fx.anim(1.1, k => { if (!alive()) return; const d = (k < .5 ? 2 * k * k : 1 - Math.pow(2 - 2 * k, 2) / 2) * 1.02; F.burn(Math.max(.001, d)); s.op = s.opT = 1 - k * .9;
          for (; i < n && pts[i][2] <= d; i++) if (i % every === 0) ash(pts[i][0], pts[i][1], i); }, gone);
      } else { // muñeco 3D (sin dibujo): sus vértices se convierten en ceniza de arriba abajo
        const pts = []; F.root.updateMatrixWorld(true); F.root.traverse(o => { if (o.isMesh && !o.userData.ol && o.visible && o.geometry.attributes.position) { const a = o.geometry.attributes.position, c = o.material.color || WHITE; for (let j = 0; j < a.count; j += 3) pts.push([tmp.fromBufferAttribute(a, j).applyMatrix4(o.matrixWorld).clone(), c]); } });
        pts.sort((a, b) => b[0].y - a[0].y); const n = pts.length, every = Math.max(1, Math.ceil(n / (700 * fx.q1))); let i = 0;
        fx.anim(1.1, k => { if (!alive()) return; F.opacity(Math.max(0, 1 - k * 1.1)); s.op = s.opT = 1 - k; for (; i < n && i <= k * n; i++) if (i % every === 0) ash(pts[i][0], pts[i][1], i); }, gone); } });
    // 4) final: onda y quemadura en el suelo
    later(t0 + 1.45, () => { const f = feet(p); fx.ring(tmp.copy(f).setY(.05), 3.4, kc, .8, { flat: 1, inner: .86 }); fx.crater(f.x, f.z, 1.2, kc); fx.glow(tmp.copy(f).setY(.3), 36, soul, { max: 3, vy: 2, l1: 1.1, flat: 1 }); shake(.22); });
    return true; },
  shield(p) { TECH.shield(p); }, meteor(p, miss) { TECH.meteor(p, miss); }, stomp(p) { TECH.stomp(p); }, clone(a, d) { TECH.clone(a, d); }, shades(a, n) { TECH.shades(a, n); }, shadeHit(a, d) { TECH.shadeHit(a, d); },
  finisher(t) { shot('hit', t, 900); X.kick(4); },
  pause(v) { PAUSE = !!v; }, // congela la escena (para depurar y hacer capturas)
  _dbg() { return { FT, scene, cam, R, CAM }; },
  _tick(n = 1, dt = 1 / 30) { if (!on) return; for (let i = 0; i < n; i++) frame(dt); }, // avanza la escena a mano (pestaña oculta)
  shake(k) { shake(k); }, punch(p) { shot('hit', p, 400); X.kick(2); },
};
const QUIET = [0, 0];
X.boom = (p, c, k) => API.boom(p, c, k);
window.F3D = API;
window.dispatchEvent(new Event('f3d-ready'));
