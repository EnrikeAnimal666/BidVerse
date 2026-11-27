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
import { styleOf, elCol, EL } from './style.js';

const V3 = THREE.Vector3, now = () => performance.now();
let SUP = null, failed = false, R = null, composer = null, bloom = null, scene = null, cam = null, fx = null, cv = null, ro = null;
let stage = null, opts = {}, on = false, gen = 0, last = 0, W = 1, H = 1, PR = 1, lagT = 0, okT = 0;
let HS = 0, slowK = 1, slowU = 0, actor = -1, T = 0, PAUSE = false, sizeT = 0;
const FT = [null, null], LATER = [], WHITE = new THREE.Color(1, 1, 1), tmp = new V3(), tmp2 = new V3(), tmp3 = new V3();
const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// cada luchador a un paso del otro: su sitio depende de lo ancho que es su dibujo (la cámara se acerca hasta que llenan la pantalla)
const halfW = p => { const s = FT[p], w = s && s.F.halfW ? s.F.halfW() : null; return w ? Math.max(.38, Math.min(1.25, w)) : .55; };
const dir = p => p ? -1 : 1, homeX = p => ((W / H < 1.3 ? .45 : .95) + halfW(p)) * (p ? 1 : -1);
const STEEL = EL.steel, styOf = p => FT[p] ? FT[p].sty : styleOf('');
const tcOf = p => { const st = styOf(p); return elCol(st) || (!st.au ? STEEL : colOf(p)); }; // color de sus golpes: su elemento, acero si no tiene aura, o su aura
const PC = ['#ff3344', '#4aa3ff'], pcol = p => PC[p];
const readPC = () => { for (const p of [0, 1]) try { const v = getComputedStyle(document.body).getPropertyValue('--p' + (p + 1)).trim(); if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) PC[p] = v; } catch (e) { /* nada */ } };
const colOf = p => { const s = FT[p], e = opts.elOf && opts.elOf(p); return (s && s.look.au) || (e && e.c) || pcol(p); };
const later = (sec, fn) => LATER.push({ t: sec, fn });
const okc = c => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c.trim()) ? c.trim() : null; // game.js a veces pasa var(--p1)

/* ---------------- escena ---------------- */
const ENV = { top: new THREE.Color(), hor: new THREE.Color(), glow: new THREE.Color(), base: new THREE.Color(), moon: new THREE.Color(), dz: 0, dzc: new THREE.Color() };
const AMB = { // def: un vacío oscuro y limpio con un foco tenue en el suelo; el resto, los ambientes de las habilidades
  def: { top: '#010103', hor: '#0b0911', glow: '#2b2442', base: '#070609', moon: '#000000' },
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
vec3 p=d*160.0;vec3 id=floor(p);float h=fract(sin(dot(id,vec3(12.9898,78.233,37.719)))*43758.5453);float s=step(.9985,h)*smoothstep(.5,.1,length(fract(p)-.5))*smoothstep(.06,.4,y);
c+=vec3(s)*(.2+.15*sin(t*2.0+h*60.0))*(1.0-smoothstep(.3,.9,dot(hor,vec3(.3,.6,.1))));gl_FragColor=vec4(c,1.0);}` });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(95, 32, 16), skyM); sky.renderOrder = -10; scene.add(sky);
  // suelo: negro con un foco suave encima de los luchadores y el color de cada jugador a sus pies (las runas solo en las expansiones de dominio)
  floorM = new THREE.ShaderMaterial({ uniforms: { base: { value: ENV.base }, glow: { value: ENV.glow }, hor: { value: ENV.hor }, c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, p0: { value: new THREE.Vector2(-1.5, 0) }, p1: { value: new THREE.Vector2(1.5, 0) }, t: { value: 0 }, dz: { value: 0 }, dzc: { value: ENV.dzc } },
    vertexShader: `varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform vec3 base;uniform vec3 glow;uniform vec3 hor;uniform vec3 c0;uniform vec3 c1;uniform vec2 p0;uniform vec2 p1;uniform float t;uniform float dz;uniform vec3 dzc;varying vec3 vW;
void main(){vec2 q=vW.xz;float r=length(q*vec2(.8,1.25));float a=atan(q.y,q.x);vec3 c=base;
c+=glow*.32*(1.0-smoothstep(.4,5.5,r));
vec2 d0=q-p0,d1=q-p1;c+=c0*exp(-dot(d0,d0)*.7)*.3+c1*exp(-dot(d1,d1)*.7)*.3;
float rr=length(q),a2=a+t*.35;float rune=step(.55,fract(a2/6.2832*18.0))*smoothstep(.12,0.0,abs(rr-4.6))+smoothstep(.05,0.0,abs(rr-4.2))+smoothstep(.05,0.0,abs(rr-5.0))+step(.5,fract(rr*3.0-t))*smoothstep(4.0,0.0,rr)*.18;
c=mix(c,c*.3+dzc*rune*1.4,dz);c=mix(c,hor*.35,smoothstep(6.0,30.0,rr));gl_FragColor=vec4(c,1.0);}` });
  const fl = new THREE.Mesh(new THREE.CircleGeometry(60, 96), floorM); fl.rotation.x = -Math.PI / 2; fl.renderOrder = -9; scene.add(fl);
  // luna: invisible (negra) salvo en los ambientes que la necesitan (Tsukuyomi, Santuario, eclipse, la luz de Dios…)
  moonG = new THREE.MeshBasicMaterial({ color: ENV.moon, fog: false }); moon = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16), moonG); moon.position.set(-26, 20, -70); scene.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color('#b8a8ff').multiplyScalar(.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); halo.scale.setScalar(34); halo.position.copy(moon.position); scene.add(halo); lights.halo = halo;
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
  const sty = styleOf(name || '?', look); // cómo pelea (f3d/style.js)
  const s = { p, F, A, look, name, sty, aura, pool, shadow, lv: 0, boost: 0, auraC: new THREE.Color(col), auraK: '', fl: 0, expr: 'n', exprU: 0, blink: rr(1.5, 4), dead: false, gone: false, win: false, busyU: 0, lie: 0, cls: '', emitT: 0, op: 1, opT: 1 };
  if (sty.k === 'blade' || sty.k === 'pole') A.setBase('stanceW');
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
function afterimage(p, col, n = 3, gap = .04, op = .3, add = true) { const s = FT[p]; if (!s || RM) return; for (let i = 0; i < n; i++) later(i * gap, () => { const S = FT[p]; if (!S || S.dead) return; const g = ghostOf(S.F, col || colOf(p), op, add); scene.add(g); const m = g.userData.mat; fx.anim(.28, k => { m.opacity = op * (1 - k); }, () => { scene.remove(g); m.dispose(); }); }); }
// estelas al moverse rápido: de su color, o sombras oscuras si no tiene energía (Toji, Levi…); los velocísimos dejan más
function ghosts(p, n) { const s = FT[p]; if (!s) return; const st = s.sty, na = !st.au; afterimage(p, na ? '#16171d' : null, n || (st.fast ? 4 : 2), st.fast ? .026 : .035, na ? .55 : .35, !na); }
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
  const Rr = A.R;
  if (T >= s.busyU && !Rr.tw && !s.dead && !s.gone) { const hx = homeX(p); if (Math.abs(Rr.x - hx) > .005 || Math.abs(Rr.z) > .005) { const k = Math.min(1, wdt * 3); Rr.x += (hx - Rr.x) * k; Rr.z -= Rr.z * k; } } // vuelve a su sitio si algo lo dejó fuera
  // el esqueleto invisible sigue al dibujo: de sus manos y su pecho salen los golpes, rayos y estelas
  F.root.position.set(Rr.x, Rr.y + s.lie * .2 * F.S, Rr.z); F.root.rotation.set(Rr.rx, (p ? -Math.PI / 2 : Math.PI / 2) + A.yawOff, Rr.rz);
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
  const H = F.H, lv = Math.min(3, s.lv), au = s.aura, na = !s.sty.au;
  au.position.set(Rr.x, Rr.y + H * .5 + s.lie * .1, Rr.z); au.scale.set(.5 * F.S + lv * .1, H * (.58 + lv * .05), .45 * F.S + lv * .1);
  au.material.uniforms.op.value = Math.min(.8, lv * .3) * (s.op); au.material.uniforms.t.value = T; au.material.uniforms.sp.value = 1 + lv * .5; au.visible = lv > .02 && !na;
  if (lv > .15 && !s.dead) { s.emitT -= dt * lv * (na ? 16 : 38) * fx.q1; while (s.emitT < 0) { s.emitT += 1; const a = rr(0, TAU), r = rr(.15, .5) * F.S;
    if (na) fx.smokeP.add({ x: Rr.x + Math.cos(a) * r * 1.4, y: Rr.y + rr(0, .3), z: Rr.z + Math.sin(a) * r, vx: Math.cos(a) * rr(.5, 1.4), vy: rr(.25, .9), vz: Math.sin(a) * rr(.2, .6), l: rr(.6, 1.1), s: rr(.25, .5), r: .3, gg: .28, b: .34, a: .3, grow: 1.4, dr: 1.2, fi: 2, fo: 5 }); // sin energía: la presión levanta polvo
    else if (st.dark) fx.smokeP.add({ x: Rr.x + Math.cos(a) * r, y: Rr.y + rr(0, H * .6), z: Rr.z + Math.sin(a) * r, vx: 0, vy: rr(1, 2.2), vz: 0, l: rr(.5, .9), s: rr(.3, .55), r: .05, gg: .02, b: .08, a: .5, grow: 1, dr: .8, fi: 2, fo: 6 });
    else { const c = s.auraC; fx.glowP.add({ x: Rr.x + Math.cos(a) * r, y: Rr.y + rr(0, H * .5), z: Rr.z + Math.sin(a) * r, vx: 0, vy: rr(1.6, 3.4) * (.7 + lv * .3), vz: 0, l: rr(.35, .7), s: rr(.04, .11), r: c.r * 2.4, gg: c.g * 2.4, b: c.b * 2.4, dr: .5, shr: 1 }); } } }
  s.pool.position.set(Rr.x, .02, Rr.z); s.pool.scale.setScalar(2.6 + lv * .9); s.pool.material.color.copy(lv > .2 ? s.auraC : tmpC.set(pcol(p))).multiplyScalar(.35 + lv * .45); s.pool.material.opacity = s.op;
  const hgt = Math.max(0, Rr.y); s.shadow.position.set(Rr.x, .015, Rr.z); s.shadow.scale.setScalar(Math.max(.4, 1.5 * F.S - hgt * .25)); s.shadow.material.opacity = .7 * s.op * Math.max(.2, 1 - hgt * .2);
  // destello al recibir un golpe, parpadeo y expresión
  if (s.fl > 0 || s.flOn) { s.fl = Math.max(0, s.fl - dt * 7); s.flOn = s.fl > 0; for (const m of F.mats) { const e0 = m.userData.e0; m.emissive.setRGB(e0.r + (1 - e0.r) * s.fl, e0.g + (1 - e0.g) * s.fl, e0.b + (1 - e0.b) * s.fl); m.emissiveIntensity = Math.max(m.userData.i0 * (1 - s.fl), s.fl * .42); } }
  if (T > s.exprU && s.expr !== 'n' && !s.dead) { s.expr = 'n'; F.setExpr('n'); }
  if ((s.blink -= dt) <= 0 && !s.dead) { s.blink = rr(2, 5); if (s.expr === 'n') { F.setExpr('b'); later(.11, () => { if (FT[p] === s && s.expr === 'n' && !s.dead) F.setExpr('n'); }); } }
  if (F.extra.halo) F.extra.halo.rotation.z += dt * .6;
}
function powerBurst(p, k = 1) { const s = FT[p]; if (!s) return; s.boost = Math.max(s.boost, k); const na = !s.sty.au, c = na ? '#d8d4e0' : colOf(p), f = feet(p);
  fx.ring(tmp.copy(f).setY(.05), 2.4 * k, c, .55, { flat: 1, inner: .7, k: na ? 1.1 : 2.4 }); fx.smoke(f, na ? 18 : 10, na ? '#4a4452' : '#2a2233', { max: 3.6, up: .3 }); fx.debris(tmp.copy(f).setY(.1), na ? 14 : 8);
  if (!na) fx.glow(chest(p), 30, c, { max: 5, l1: .6 }); shake(.35); shot('focus', p, 900); }
function vanish(p) { const s = FT[p]; if (!s) return; s.gone = true; const c = chest(p); fx.glow(c, 120, '#ffffff', { max: 6, sx: .3, sy: .8, sz: .3, l1: 1 }); fx.sprite(c, 4, '#ffffff', .4); }

/* ---------------- cámara ---------------- */
const CAM = { pos: new V3(0, 1.8, 10), look: new V3(0, 1.1, 0), tPos: new V3(), tLook: new V3(), fov: 30, kick: 0, trauma: 0, shot: null, until: 0, ko: 0, focus: new V3(0, 1.3, 0) };
const FILL = .82; // el más alto de los dos ocupa ~82 % de la franja libre (entre las placas de vida y el diálogo)
/* FRANJA LIBRE: las placas de vida y ki (arriba) y el diálogo (abajo) flotan sobre el escenario. La cámara encuadra la pelea solo en
   el hueco que dejan (setViewOffset: el «cuadro» de la cámara es esa franja; lo que sale de ella, rayos o saltos, se sigue pintando
   por debajo del HUD). Durante un combate solo crece, para que la cámara no dé saltos si el diálogo pasa a dos líneas. */
let BT = 0, BB = 0, BH = 1;
function band(force) {
  if (!stage || !cam || !H) return;
  const ab = stage.parentElement, top = ab && ab.querySelector(':scope>.ab-top'), bot = ab && ab.querySelector(':scope>.ab-bot'), sr = stage.getBoundingClientRect();
  const edge = (el, low) => { if (!el || !el.offsetHeight) return 0; // lo que tapa: por arriba hasta su borde inferior, por abajo desde su borde superior
    if (el.offsetParent && el.offsetParent === stage.offsetParent) return low ? stage.offsetTop + H - el.offsetTop : el.offsetTop + el.offsetHeight - stage.offsetTop;
    const r = el.getBoundingClientRect(); return low ? sr.bottom - r.top : r.bottom - sr.top; };
  let t = Math.max(BT, Math.max(0, edge(top, 0)) + 6), b = Math.max(BB, Math.max(0, edge(bot, 1)) + 6);
  const room = H * .5; if (H - t - b < room) { const k = (H - room) / Math.max(1, t + b); t *= k; b *= k; } // pantallas muy bajas: la pelea nunca baja de la mitad
  if (!force && Math.abs(t - BT) < .5 && Math.abs(b - BB) < .5) return;
  BT = t; BB = b; BH = Math.max(2, H - t - b);
  cam.aspect = W / BH; cam.setViewOffset(W, BH, 0, -BT, W, H); cam.updateProjectionMatrix();
}
function shot(kind, p, ms) { CAM.shot = { kind, p, t0: T }; CAM.until = T + (ms || 1000) / 1000; }
function shake(k) { if (RM) k *= .3; CAM.trauma = Math.min(1, CAM.trauma + k); }
function camUpdate(dt) {
  const asp = W / BH, tanH = Math.tan(THREE.MathUtils.degToRad(CAM.fov / 2));
  const x0 = FT[0] ? FT[0].A.R.x : homeX(0), x1 = FT[1] ? FT[1].A.R.x : homeX(1), xa = Math.min(x0 - halfW(0), x1 - halfW(1)), xb = Math.max(x0 + halfW(0), x1 + halfW(1)), mx = (xa + xb) / 2;
  const Hm = Math.max(FT[0] ? FT[0].F.H : 2.2, FT[1] ? FT[1].F.H : 2.2), half = (xb - xa) / 2 + .3;
  const dist = Math.min(30, Math.max(Hm / FILL / (2 * tanH), half / (tanH * asp))), ly = dist * tanH * .84; // ly: altura a la que mira (los pies justo encima del borde de abajo de la franja)
  const yaw = Math.sin(T * .21) * .15 + Math.sin(T * .13) * .06;
  let k = 2.6, sh = T < CAM.until ? CAM.shot : null;
  if (sh) { const p = sh.p, fxp = FT[p] ? FT[p].A.R.x : homeX(p), d = dir(p), Hh = FT[p] ? FT[p].F.H : 2.2;
    if (sh.kind === 'focus' || sh.kind === 'win') { CAM.tPos.set(fxp + d * 2.2, Hh * .62, 5.9); CAM.tLook.set(fxp + d * .35, Hh * .66, 0); k = 3.6; }
    else if (sh.kind === 'low') { CAM.tPos.set(fxp + d * 2.1, .75, 5.6); CAM.tLook.set(fxp + d * .3, Hh * .7, 0); k = 4; }
    else if (sh.kind === 'side') { const v = FT[1 - p] ? FT[1 - p].A.R.x : homeX(1 - p); CAM.tPos.set(fxp - d * 1.6, 2.2, dist * .9); CAM.tLook.set((fxp + v) / 2 + d * .5, 1.35, 0); k = 3.4; }
    else if (sh.kind === 'hit') { CAM.tPos.set(fxp * .6 + mx * .4, 1.8, dist * .78); CAM.tLook.set(fxp * .7 + mx * .3, 1.4, 0); k = 5; }
    else if (sh.kind === 'ko') { const a = (T - sh.t0) * .55 + .3; CAM.tPos.set(fxp + Math.sin(a) * 4.8, 1.5, Math.cos(a) * 4.8 + .6); CAM.tLook.set(fxp, .55, 0); k = 3; }
    else if (sh.kind === 'wide') { CAM.tPos.set(mx + Math.sin(yaw) * dist * 1.2, 2.6, Math.cos(yaw) * dist * 1.2); CAM.tLook.set(mx, 1.4, 0); k = 3; }
    else if (sh.kind === 'clash') { const f = CAM.focus, u = Math.min(1, (T - sh.t0) / 2.5); // choque: cámara baja que se va acercando al punto donde chocan
      CAM.tPos.set(f.x * .7 + mx * .3 + .55 + Math.sin(yaw) * .8, .95, dist * (1 - .14 * u)); CAM.tLook.set(f.x * .8 + mx * .2, Math.max(1.05, f.y * .9), 0); k = 2.4; }
  } else { CAM.tPos.set(mx + Math.sin(yaw) * dist, ly + .45 + Math.sin(T * .17) * .06, Math.cos(yaw) * dist); CAM.tLook.set(mx, ly, 0); } // un poco desde arriba, con los pies sobre el diálogo
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
  R.setSize(w, h, false); composer.setPixelRatio(PR); composer.setSize(w, h); OL_U.asp.value = w / h; BT = BB = 0; band(true);
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
    if ((sizeT -= rdt) <= 0) { sizeT = .5; if (stage.clientWidth !== W || stage.clientHeight !== H) resize(); else band(); } // por si el ResizeObserver no avisa (pestaña en segundo plano); y el HUD puede crecer
    let wdt = rdt; if (HS > 0) { HS -= rdt; wdt = 0; }
    const tstop = stage.classList.contains('tstop'), fdt = wdt * (t < slowU ? slowK : 1) * (tstop ? .02 : 1);
    for (let i = LATER.length - 1; i >= 0; i--) { const o = LATER[i]; o.t -= wdt; if (o.t <= 0) { LATER.splice(i, 1); try { o.fn(); } catch (e) { console.warn('F3D', e); } } }
    for (const s of FT) if (s) updFighter(s, rdt, wdt);
    fx.update(fdt, cam);
    ambience(rdt); skyM.uniforms.t.value = T; floorM.uniforms.t.value = T;
    for (const p of [0, 1]) { const s = FT[p], c = floorM.uniforms['c' + p].value; c.set(pcol(p)).multiplyScalar(s && !s.dead ? .6 : .15); floorM.uniforms['p' + p].value.set(s ? s.A.R.x : homeX(p), s ? s.A.R.z : 0); }
    lights.r0.color.set(pcol(0)); lights.r1.color.set(pcol(1));
    for (const r of rocks) r.m.position.y = r.y + Math.sin(T * r.sp + r.ph) * .35;
    if (Math.random() < rdt * 4 * fx.q1) { const c = ENV.glow; fx.glowP.add({ x: rr(-7, 7), y: 0, z: rr(-5, 1.5), vx: rr(-.15, .15), vy: rr(.3, .8), vz: 0, l: rr(3, 6), s: rr(.025, .05), r: c.r * 1.4 + .08, gg: c.g * 1.4 + .06, b: c.b * 1.4 + .1, dr: 0, fi: 1, fo: 3 }); } // motas de polvo, pocas
    camUpdate(rdt); cam.updateMatrixWorld();
    for (const s of FT) if (s && s.F.sync) s.F.sync(s, cam, { dir: dir(s.p), pc: pcol(s.p), tint: TINT });
    fx.glowP.m.material.uniforms.scale.value = fx.smokeP.m.material.uniforms.scale.value = BH * PR / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))); // el fov abarca la franja libre (BH), no todo el alto
    composer.render();
  } catch (e) { console.warn('F3D', e); }
}
function stop() { on = false; if (ro) ro.disconnect(); LATER.length = 0; for (const p of [0, 1]) removeFighter(p); if (fx) fx.clear(); PEND.forEach(r => r()); PEND.clear(); }
const PEND = new Set(); // promesas de las técnicas que siguen abiertas (se resuelven si el combate se corta)
const pend = (sec, fn) => new Promise(res => { const r = () => { PEND.delete(r); res(); }; PEND.add(r); later(sec, () => { try { fn && fn(); } finally { r(); } }); });

/* ---------------- lo que llama game.js ---------------- */
// corte recto en el aire (espadas, garras, cuchillas): una línea brillante que se apaga
function cutAt(p, an, L, col, w = .05, life = .22) { const u = new V3(Math.cos(an) * L, Math.sin(an) * L, 0); fx.bolt(p.clone().sub(u), p.clone().add(u), col, life, { disp: 0, w, k: 3 }); }
/* IMPACTO según cómo pega quien golpea (a) a quien recibe (d), en el punto p: la espada deja cortes y chispas blancas, el puño una
   onda de choque (y con puño americano, chispas de metal y la marca de los nudillos), la cadena y la lanza perforan, las mazas y
   bastones revientan, las garras dejan tres zarpazos, el Stand una lluvia de golpes, la telequinesis ondas; ki y magia, energía. */
function impactFx(a, d, p, big, c) {
  const st = styOf(a), k = st.k, w = st.w, D = dir(a);
  switch (k) {
    case 'blade': { const an = rr(.35, 1.1) * (Math.random() < .5 ? 1 : -1); cutAt(p, an, big ? 1.5 : 1.05, c, big ? .07 : .05); cutAt(p, an, big ? 1.2 : .85, '#ffffff', .022);
      if (big) later(.05, () => cutAt(chest(d), -an, 1.35, c, .06));
      fx.spark(p, big ? 26 : 12, '#ffffff', { dir: tmp.set(D, .2, 0), spread: .9, max: big ? 14 : 10, k: 2.4 }); fx.sprite(p, big ? 1.3 : .7, c, .12, { tex: TEX.star, k: 2 }); break; }
    case 'pole':
      if (w === 'chain' || w === 'spear') { cutAt(p, rr(-.35, .35), .9, '#ffffff', .035); fx.spark(p, big ? 30 : 14, '#ffffff', { dir: tmp.set(D, .1, 0), spread: .35, max: 14, k: 2.2 }); fx.sprite(p, big ? 1 : .6, '#ffffff', .1, { tex: TEX.star, k: 2.2 }); fx.ring(p, big ? 1.2 : .7, c, .22, { inner: .9 }); }
      else { fx.ring(p, big ? 2 : 1.2, c, .3, { inner: .86 }); fx.sprite(p, big ? 1.6 : 1, '#ffffff', .12, { tex: TEX.star, k: 2 }); fx.debris(p, big ? 6 : 3); fx.smoke(p, 3, '#3a3344', { max: 1.4 }); }
      break;
    case 'claw': { const an = rr(.5, 1.2) * (Math.random() < .5 ? 1 : -1); for (let j = -1; j <= 1; j++) cutAt(tmp3.copy(p).add(tmp2.set(-Math.sin(an) * j * .17, Math.cos(an) * j * .17, 0)), an, big ? 1 : .75, c, .045);
      fx.spark(p, 10, c, { max: 9 }); break; }
    case 'stand': { const sc = st.sc || c; for (let i = 0; i < (big ? 4 : 2); i++) later(i * .035, () => fx.sprite(chest(d).add(tmp2.set(-D * .2, rr(-.3, .4), rr(-.3, .3))), rr(.5, .9), i % 2 ? sc : '#ffffff', .1, { tex: TEX.star, k: 2.4 }));
      fx.ring(p, big ? 1.6 : 1, sc, .25, { inner: .9 }); break; }
    case 'psy': fx.ring(p, big ? 2 : 1.3, c, .3, { inner: .92 }); later(.06, () => fx.ring(chest(d), big ? 1.4 : .9, '#ffffff', .25, { inner: .9 })); fx.glow(p, big ? 20 : 8, c, { max: 3, l1: .4 }); fx.debris(feet(d).setY(.15), big ? 5 : 2); break;
    case 'fist': { const kn = w === 'knuckle';
      fx.ring(p, big ? 1.9 : 1.1, kn ? '#ffe7a8' : '#ffffff', big ? .32 : .22, { inner: .9, k: kn ? 2.6 : 2 }); fx.sprite(p, big ? 1.8 : 1, c, .14, { tex: TEX.star, k: 2.2 }); fx.smoke(p, big ? 4 : 2, '#3a3344', { max: 1.6, vx: D * 1.5 });
      if (kn) { fx.spark(p, big ? 34 : 16, '#ffe2a0', { dir: tmp.set(D, .2, 0), spread: .9, max: big ? 16 : 11, k: 3, w: .03 }); fx.sprite(p, big ? 1.25 : .8, '#fff3d0', .2, { tex: TEX.knuckle, k: 2.4, rot: 0 }); }
      else fx.spark(p, big ? 18 : 8, c, { dir: tmp.set(D, .15, 0), spread: .9, max: 12 });
      if (st.heavy && big) { const f = feet(d); fx.debris(tmp.copy(f).setY(.2), 8); fx.crater(f.x, f.z, .9, c); } break; }
    default: // ki y magia: el golpe de energía
      fx.spark(p, big ? 34 : 14, c, { dir: tmp.set(D, .15, 0), spread: big ? 1.1 : .8, max: big ? 16 : 11 });
      fx.sprite(p, big ? 2 : 1.1, c, big ? .2 : .14, { tex: TEX.star, k: 2.2 }); fx.sprite(p, big ? 1 : .6, '#ffffff', .1, { k: 1.6 }); fx.ring(p, big ? 1.7 : .9, c, big ? .35 : .25);
  }
  if (st.el && TECH) TECH.flourish(st.el, p, big ? 14 : 5);
}
const X = { THREE, get scene() { return scene; }, get fx() { return fx; }, get cam() { return cam; }, FT, dir, homeX, chest, hand, feet, play, move, home, busy, later, pend, shot, shake, expr, afterimage, ghosts, colOf, pcol, powerBurst,
  sty: styOf, tc: tcOf, STEEL, hitFx: (a, d, p, big, c) => impactFx(a, d, p.clone(), big, c || tcOf(a)), unbusy: (p, sec) => { const s = FT[p]; if (s) s.busyU = T + sec; }, camAt: v => CAM.focus.copy(v),
  hitstop: ms => { HS = Math.max(HS, ms / 1000); }, kick: k => { CAM.kick = Math.max(CAM.kick, k); }, setActor: a => { actor = a; },
  word: (txt, pos, col) => { const box = stage && stage.querySelector('#abfx'); if (!box) return; const v = pos.clone().project(cam), el = document.createElement('span'); el.className = 'ab-num txt'; el.textContent = txt; el.style.left = ((v.x + 1) / 2 * W) + 'px'; el.style.top = ((1 - v.y) / 2 * H) + 'px'; if (col) el.style.color = col; box.appendChild(el); setTimeout(() => el.remove(), 800); } };
const TECH = makeTech(X);
/* GOLPE BÁSICO de cada estilo. game.js llama a attack() y ~0,17 s después a hurt() + hit() en el rival: el golpe tiene que llegar a tiempo. */
function melee(a, o = {}) {
  const s = FT[a], v = FT[1 - a]; if (!s || s.dead) return; const d = dir(a), vx = v ? v.A.R.x : homeX(1 - a), vz = v ? v.A.R.z : 0;
  const st = s.sty, w = st.w, crit = o.big, n = (s.combo = (s.combo || 0) + 1), C = tcOf(a), sp = o.ts ? .6 : st.fast ? .78 : st.heavy ? 1.15 : 1;
  actor = a; busy(a, .7); expr(a, 'a', .6);
  if (st.k === 'psy') return psyJab(a, o);
  if (st.k === 'stand') return standJab(a, o);
  if (st.k === 'mage') return mageJab(a, o);
  let seq, reach = 1.02, k = 'R', tw = .09, keep = .09, steel = false;
  if (st.k === 'blade') { const m = [['slashA', 'slashB'], ['slashH1', 'slashH2'], ['slashH2', 'slashB']][n % 3]; seq = [['dash', .05, 'out'], [m[0], .06, 'out'], [m[1], .06, 'snap', .12]];
    reach = w === 'big' ? 1.55 : w === 'kunai' ? 1 : 1.35; tw = w === 'big' ? .22 : .15; keep = .13; steel = true; }
  else if (st.k === 'pole') { steel = true;
    if (w === 'chain') { seq = [['dash', .04, 'out'], [n % 2 ? 'slashH1' : 'slashH2', .06, 'out'], ['jabR', .05, 'snap', .14]]; reach = 1.9; later(.05, () => FT[a] === s && TECH.chain(a, 1 - a, .26)); } // Toji: el cuchillo con cadena desde media distancia
    else if (w === 'spear') { seq = [['dash', .06, 'out'], ['jabR', .07, 'snap', .14]]; reach = 1.7; }
    else if (w === 'staff') { seq = [['dash', .05, 'out'], [n % 2 ? 'slashH1' : 'slashH2', .07, 'snap', .12]]; reach = 1.45; tw = .14; }
    else { seq = [['dash', .06, 'out'], ['upperR', .07, 'out'], ['slashB', .06, 'snap', .14]]; reach = 1.3; tw = .18; } } // maza, hacha, martillo: de arriba abajo
  else if (st.k === 'claw') { seq = [['dash', .05, 'out'], [n % 2 ? 'slashH1' : 'slashH2', .06, 'snap', .1]]; reach = w === 'tail' || w === 'whip' || w === 'kagune' ? 1.7 : 1.1; tw = .11; }
  else { // puños (fist) y ki
    const kicks = w === 'kick', L = crit ? (kicks ? ['kickR', 'kneeR', 'kickR_m', 'upperR'] : ['upperR', 'kickR', 'hookR', 'kneeR']) : kicks ? ['kickR', 'kickR_m', 'kneeR', 'kickR', 'hookR'] : ['jabR', 'jabR_m', 'hookR', 'kickR', 'jabR_m', 'hookR_m'];
    const m = L[n % L.length]; seq = [['dash', .06, 'out'], [m, .08, 'snap', .1]]; reach = /kick/.test(m) ? 1.25 : m === 'kneeR' ? .85 : 1.02; k = /_m$/.test(m) ? 'L' : 'R';
    if (st.k === 'ki' && n % 3 === 0) later(.14 * sp, () => { if (FT[a] === s) fx.sprite(hand(a, k), .7, colOf(a), .14, { k: 2 }); }); // un golpe con ki a bocajarro
    if (w === 'knuckle') later(.03, () => { if (FT[a] === s) fx.sprite(hand(a, k), .5, '#fff0c0', .18, { tex: TEX.star, k: 2.4 }); }); // brilla el puño americano
  }
  seq = seq.map(x => [x[0], x[1] * sp, x[2], (x[3] || 0) * sp]);
  play(a, seq); move(a, { x: vx - d * reach, z: vz, d: (o.ts ? .08 : .13) * Math.min(1, sp), e: 'out' });
  ghosts(a);
  fx.trail(() => hand(a, k), C, .24, { w: tw, keep });
  if (steel) fx.trail(() => hand(a, k).add(tmp2.set(d * .45, .22, 0)), '#ffffff', .2, { w: tw * .55, keep: keep * .8 }); // el filo o la punta del arma
  later((o.miss ? .5 : .42) * Math.max(1, sp), () => home(a));
}
// telequinesis: no se acerca; un gesto y la fuerza invisible golpea (el impacto lo pone hit())
function psyJab(a, o) { const s = FT[a]; play(a, [['cast', .1, 'out', .25]]); move(a, { x: s.A.R.x + dir(a) * .2, d: .12, e: 'out' });
  const c = chest(1 - a); fx.glow(hand(a), 10, colOf(a), { to: c, pull: 30, max: 1, l0: .18, l1: .26, dr: 1 }); later(.45, () => home(a)); }
// Stand: el usuario apenas se mueve; su Stand sale disparado y pega
function standJab(a, o) { const s = FT[a]; play(a, [['cocky', .1, 'out', .3]]); move(a, { x: s.A.R.x + dir(a) * .3, d: .14, e: 'out' });
  TECH.standGhost(a, s.sty.sc || colOf(a), .42, { reach: .7 }); later(.5, () => home(a)); }
// magia y jutsu: un paso y un disparo corto de su elemento (carta, aguja o bala si es su arma)
function mageJab(a, o) { const s = FT[a], D = dir(a), C = tcOf(a), w = s.sty.w, thin = w === 'cards' || w === 'needle' || w === 'gun';
  play(a, [['cast', .08, 'out', .22]]); move(a, { x: s.A.R.x + D * .3, d: .1, e: 'out' });
  const from = hand(a), m = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(C).multiplyScalar(2.4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  m.scale.set(thin ? .7 : .45, thin ? .12 : .45, 1); scene.add(m);
  fx.anim(.13, k => { const to = chest(1 - a); if (o.miss) to.y += .8; m.position.lerpVectors(from, to, k); fx.glow(m.position, 1, C, { max: .4, l0: .1, l1: .2 }); }, () => { scene.remove(m); m.material.dispose(); });
  later(.45, () => home(a)); }
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
  if (lv > 1) { // golpe mortal: sale despedido hacia atrás de pie (sin tumbarse) y frena arrastrando los pies; dissolve() lo hace pedazos
    busy(d, 1.8); play(d, [['hitB', .06, 'snap', .4]], true); expr(d, 'k', 9);
    A.move({ x: Math.max(-6.5, Math.min(6.5, A.R.x - D * 2.4)), y: 0, d: .45, e: 'out', arc: .45 });
    for (let i = 1; i <= 4; i++) later(.22 + i * .05, () => { if (FT[d]) fx.smoke(feet(d), 3, '#3a3344', { max: 1.2, up: .2 }); });
    later(.3, () => { const S = FT[d]; if (!S) return; fx.crater(S.A.R.x, S.A.R.z, .8, colOf(1 - d)); fx.debris(tmp.copy(feet(d)).setY(.2), 8); shake(.35); });
    later(1.8, () => { const S = FT[d]; if (S && !S.dead) { play(d, [[S.A.base, .3, 'io']]); home(d, .4, .1); } }); // por si no era el final
    shot('hit', d, 900);
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
    // el ambiente vuelve al de siempre de golpe: sin esto el combate nuevo empezaba con el cielo y el suelo del anterior (eclipse, dominio…)
    const A = AMB.def; ambK = 'def'; ENV.top.set(A.top); ENV.hor.set(A.hor); ENV.glow.set(A.glow); ENV.base.set(A.base); ENV.moon.set(A.moon); ENV.dzc.set(0, 0, 0); ENV.dz = 0; floorM.uniforms.dz.value = 0; TINT.set(1, 1, 1);
    if (opts.artOf && opts.names) opts.names.forEach(n => loadArt(n, opts.artOf(n))); // los dibujos se cargan antes de que entren
    on = true; last = now(); const g = ++gen; frame(0); requestAnimationFrame(() => loop(g)); return true; // frame(0): borra ya el último fotograma del combate anterior
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
    const s = FT[d]; if (!s || s.dead) return; busy(d, .6); const A = s.A, side = Math.random() < .5, na = !s.sty.au;
    afterimage(d, na ? '#16171d' : '#bfe9ff', na ? 2 : 1, .03, .5, !na);
    if (side) { const z = (Math.random() < .5 ? -1 : 1) * 1; play(d, [['dodgeS', .07, 'out', .2]]); A.move({ z, x: A.R.x - dir(d) * .2, d: .1, e: 'out' }); }
    else { play(d, [['dodgeB', .07, 'out', .2]]); A.move({ x: A.R.x - dir(d) * .7, d: .12, e: 'out', arc: .25 }); }
    later(.36, () => home(d, .3, .1)); },
  dash(p) { ghosts(p, 2); },
  charge(a, col) { col = okc(col); const s = FT[a]; if (!s || s.dead) return; busy(a, .9); play(a, [['power', .12, 'out', .6]]); expr(a, 'a', .9); s.boost = Math.max(s.boost, 1.3);
    const f = feet(a), cp = chest(a);
    if (!s.sty.au) { // sin energía (Toji, Saitama…): no brilla; se planta, el suelo cruje y el aire sale despedido
      fx.smoke(f, 16, '#4a4452', { max: 3.4, up: .35, a: .45 }); fx.ring(tmp.copy(f).setY(.05), 2.4, '#d8d4e0', .5, { flat: 1, inner: .85, k: 1.1 }); fx.debris(tmp.copy(f).setY(.1), 6);
      fx.spark(cp, 18, '#ffffff', { max: 9, k: 1.2, life: .3, w: .025 }); fx.crater(f.x, f.z, .7, '#8a8494'); shot('low', a, 900); shake(.18); return; }
    const c = col || colOf(a); fx.glow(cp, 50, c, { max: .1, l0: .5, l1: .8, to: cp, pull: 9, sx: 1.6, sy: 1.4, sz: 1.6, s0: .04, s1: .1 });
    fx.smoke(f, 8, '#2e2638', { max: 2.6, up: .2 }); fx.ring(tmp.copy(f).setY(.05), 1.8, c, .5, { flat: 1 }); shot('low', a, 900); shake(.15); },
  hit(d, big, col) { col = okc(col); const c = col || tcOf(1 - d), p = chest(d).add(tmp2.set(-dir(d) * .25, 0, .15));
    if (T < (QUIET[d] || 0)) { fx.sprite(p, .8, c, .15); return; }
    impactFx(1 - d, d, p, big, c); // cada estilo deja su marca (f3d/style.js)
    if (big) { if (styOf(1 - d).au) fx.glow(p, 24, c, { max: 6, l1: .5 }); fx.smoke(feet(d), 6, '#3a3344', { max: 2 }); shake(.32); shot('hit', d, 420); } else shake(.12); },
  boom(p, col, k = 1) { col = okc(col); const c = col || tcOf(1 - p), cp = chest(p), f = feet(p);
    fx.sprite(cp, 5 * k, c, .5, { k: 2.4 }); fx.sprite(cp, 3 * k, '#ffffff', .25, { k: 2.4 }); fx.ring(cp, 3.4 * k, c, .5); fx.ring(tmp.copy(f).setY(.06), 4 * k, c, .7, { flat: 1, inner: .6 });
    fx.glow(cp, 70 * k, c, { max: 9 * k, l1: .9 }); fx.spark(cp, 40, c, { max: 18, up: .3 }); fx.smoke(f, 18 * k, '#2e2638', { max: 4.5 * k, size: 1.4, up: .8 }); fx.debris(tmp.copy(f).setY(.2), 16 * k, { big: 1 });
    fx.crater(f.x, f.z, 1.3 * k, c); shake(.6 * k); X.kick(3); },
  beam(a, big, col) { return TECH.beam(a, big, okc(col)); },
  tech(a, name, big, col, o) { if (!on || !FT[a] || !FT[1 - a]) return null; const ar = opts.arche ? opts.arche(String(name || '')) : { ar: 'beam', v: '', col: null }; const p = TECH.run(a, ar, big, okc(col) || okc(ar.col) || colOf(a), o || {}, String(name || '')); return p && p.then(() => { QUIET[1 - a] = T + .3; }); },
  clash() { TECH.clash(); }, clashX(x) { TECH.clashX(x); }, clashEnd(l) { TECH.clashEnd(l); if (l === 0 || l === 1) API.boom(l, null, 1.1); },
  slow(k, ms) { slowK = k; slowU = now() + ms; },
  bf(d) { const c = chest(d); for (let i = 0; i < 9; i++) fx.bolt(c, tmp.copy(c).add(tmp2.set(rr(-1.6, 1.6), rr(-1.2, 1.4), rr(-1, 1))), i % 3 ? '#ff1f3d' : '#1a0005', .32, { w: .07, k: i % 3 ? 3 : .2 }); fx.sprite(c, 3.4, '#ff1f3d', .3); shake(.5); X.hitstop(110); },
  slash(d, col) { col = okc(col); for (let i = 0; i < 5; i++) later(i * .055, () => TECH.cut(d, col || '#ff1f3d')); },
  hakai(d) { const c = chest(d); fx.glow(c, 140, '#a43cff', { max: .2, to: c, pull: 7, sx: 2.2, sy: 2, sz: 2, l0: .6, l1: .8 }); later(.75, () => API.boom(d, '#a43cff', 1.3)); },
  nuke(d) { const c = chest(d), f = feet(d); fx.sprite(c, 16, '#ffffff', .7, { k: 3 }); fx.sprite(c, 9, '#ff9ec4', 1, { k: 2.2 }); fx.ring(tmp.copy(f).setY(.08), 14, '#ffffff', 1, { flat: 1, inner: .9 }); fx.ring(c, 10, '#ff9ec4', .9);
    fx.smoke(f, 40, '#3a2a33', { max: 6, size: 2, up: 2.5, life: 1.6 }); fx.glow(c, 160, '#ffc0d8', { max: 12, l1: 1.2 }); fx.debris(tmp.copy(f).setY(.2), 30, { big: 1 }); fx.crater(f.x, f.z, 2.4, '#ff9ec4'); shake(1); X.kick(5); shot('wide', d, 1600); },
  /* MUERTE (K.O.), rápida y sin caerse: destello → el dibujo se agrieta desde el pecho con las grietas al rojo del color de quien le ha
     matado (0,22 s) → estalla en pedazos que salen volando lejos del rival, girando, y se apagan al caer. ~1,2 s en total */
  dissolve(p) { const s = FT[p]; if (!s || s.dead) return false; s.dead = true; s.lv = 0; s.boost = 0;
    const F = s.F, D = dir(p), kc = colOf(1 - p), hot = new THREE.Color(kc).lerp(WHITE, .4).multiplyScalar(3), alive = () => FT[p] === s;
    busy(p, 9); expr(p, 'k', 99); s.fl = 1; shot('hit', p, 1300); shake(.3); X.kick(2);
    const hide = () => { if (alive()) { F.root.visible = false; s.aura.visible = false; s.op = s.opT = 0; } };
    const burst = () => { const cp = chest(p), f = feet(p);
      fx.sprite(cp, 4.5, kc, .35, { k: 2.6 }); fx.sprite(cp, 2.4, '#ffffff', .16, { k: 2.6 }); fx.ring(cp, 3.2, kc, .45); fx.ring(tmp.copy(f).setY(.05), 3.6, kc, .6, { flat: 1, inner: .8 });
      fx.spark(cp, 46, kc, { max: 20, up: .3 }); fx.glow(cp, 50, kc, { max: 7, l1: .7 }); fx.smoke(f, 12, '#2e2638', { max: 3, up: .6 }); fx.crater(f.x, f.z, 1.1, kc);
      const pts = F.points ? F.points() : [], st = Math.max(1, Math.ceil(pts.length / (160 * fx.q1))); // polvo brillante con los colores del dibujo
      for (let i = 0; i < pts.length; i += st) { const [q, c] = pts[i]; fx.glowP.add({ x: q.x, y: q.y, z: q.z, vx: -D * rr(1, 5) + (q.x - cp.x) * 2, vy: rr(.5, 4) + (q.y - cp.y) * 2, vz: rr(-2, 3), l: rr(.4, .9), s: rr(.03, .07), r: c.r * 1.6, gg: c.g * 1.6, b: c.b * 1.6, dr: 2.2, g: -4, shr: 1 }); }
      shake(.7); X.kick(4); X.hitstop(70); API.slow(.4, 280); };
    const sh = F.shatter ? F.shatter(.6) : null;
    if (sh) { scene.add(sh); hide(); const U = sh.userData.U; U.hot.value.copy(hot);
      fx.anim(.22, k => { U.crack.value = k * 1.2; U.jit.value = .018 * k; }, () => { if (!on) { scene.remove(sh); sh.userData.dispose(); return; } U.jit.value = 0; U.crack.value = 1.2; burst();
        fx.anim(1, k => { U.t.value = k; U.op.value = 1 - Math.max(0, (k - .5) / .5); }, () => { scene.remove(sh); sh.userData.dispose(); }); });
    } else later(.2, () => { burst(); hide(); }); // muñeco 3D (sin dibujo): estalla en polvo
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
