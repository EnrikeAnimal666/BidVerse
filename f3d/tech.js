/* BidVerse 3D · TÉCNICAS: cada familia (rayo, esfera, del cielo, púrpura, vórtice, destello negro, onda, corte, relámpago, fuego,
   agua/arena, ráfaga de golpes y enjambre) con su coreografía en 3D, pasada por el ESTILO de quien la lanza (f3d/style.js): quien no
   tiene energía (Toji, Adam, Levi…) nunca lanza rayos; sus técnicas son golpes de verdad (corte iai, la cadena, el bastón, el golpe
   demoledor…), los Stands pegan con su Stand y la telequinesis aplasta a distancia. Devuelven una promesa que se cumple al impactar. */
import * as THREE from 'three';
import { energyMat, TEX, rr, TAU } from './fx.js';
import { ghostOf } from './model.js';
import { EL } from './style.js';

export function makeTech(X) {
  const V3 = THREE.Vector3, t1 = new V3(), t2 = new V3();
  const fx = () => X.fx, S = () => X.scene;
  const SPH = new THREE.SphereGeometry(1, 32, 20), CYL = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true); CYL.translate(0, .5, 0); CYL.rotateX(Math.PI / 2);
  const orb = (r, col, core = '#ffffff', k = 2.4) => { const m = new THREE.Mesh(SPH, energyMat(col, core, 0, k)); m.scale.setScalar(r); m.renderOrder = 6; S().add(m); return m; };
  const kill = m => { if (!m) return; S().remove(m); m.traverse(o => { if (o.material) o.material.dispose(); }); };
  const vic = a => 1 - a, vx = a => { const s = X.FT[1 - a]; return s ? s.A.R.x : X.homeX(1 - a); }, vz = a => { const s = X.FT[1 - a]; return s ? s.A.R.z : 0; };
  const src2 = a => X.hand(a, 'R').add(X.hand(a, 'L', t2)).multiplyScalar(.5).add(t1.set(X.dir(a) * .12, 0, 0));
  const srcR = a => X.hand(a, 'R').add(t1.set(X.dir(a) * .12, 0, 0));
  const STEEL = X.STEEL;
  // rayo limpio: núcleo blanco nítido, halo de su color que se difumina hacia el borde y un flujo suave hacia el rival (sin parpadeos ni ruido)
  function beamMat(col, k) {
    return new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(col).multiplyScalar(k) }, t: { value: 0 }, op: { value: 1 } },
      vertexShader: `varying vec3 vN;varying vec3 vV;varying vec2 vUv;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.0);vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader: `uniform vec3 col;uniform float t;uniform float op;varying vec3 vN;varying vec3 vV;varying vec2 vUv;
void main(){float f=abs(dot(normalize(vN),vV));float flow=.86+.14*sin(vUv.y*10.0-t*20.0);float a=pow(f,1.7)*flow*smoothstep(0.0,.04,vUv.y);
vec3 c=mix(col,vec3(3.0),smoothstep(.62,.97,f));gl_FragColor=vec4(c,clamp(a,0.0,1.0)*op);}`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  }
  function beamMesh(col) {
    const o = new THREE.Mesh(CYL, beamMat(col, 2)), i = new THREE.Mesh(CYL, beamMat('#ffffff', 1.5)); i.scale.set(.34, .34, 1); o.add(i); o.renderOrder = i.renderOrder = 6; S().add(o);
    return { o, set(a, b, w) { o.position.copy(a); o.lookAt(b); o.scale.set(w, w, Math.max(.001, a.distanceTo(b))); }, t(dt) { o.material.uniforms.t.value += dt; i.material.uniforms.t.value += dt; }, op(v) { o.material.uniforms.op.value = v; i.material.uniforms.op.value = v; }, kill() { kill(o); } };
  }
  const glowSpr = (col, s, k = 1.8) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(col).multiplyScalar(k), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); m.scale.setScalar(s); m.renderOrder = 8; S().add(m); return m; };
  const impact = (d, C, big = 1) => { const p = X.chest(d); fx().sprite(p, 2 * big, C, .4, { k: 1.7 }); fx().sprite(p, .9 * big, '#ffffff', .18, { k: 1.4 }); fx().ring(p, 2.6 * big, C, .4); fx().glow(p, 50 * big, C, { max: 8 * big, l1: .7 }); fx().spark(p, 24, C, { max: 14 }); X.shake(.4 * big); };
  const fire = (a, pose, hold = .4) => { X.busy(a, hold + .6); X.expr(a, 'a', hold + .5); X.play(a, pose); X.setActor(a); };
  const back = (a, sec) => X.later(sec, () => X.home(a));
  const line = (a, b, C, life, w) => fx().bolt(a, b, C, life, { disp: 0, w, k: 3 });

  // ---- rayo de energía (Kamehameha, Final Flash…) ----
  function beam(a, big, C) {
    const d = vic(a); fire(a, [['beamCharge', .14, 'out', .16], ['beamFire', .06, 'snap', .55]], 1); X.shot('side', a, 1200);
    const o = orb(.05, C); fx().anim(.3, (k, dt) => { o.position.copy(src2(a)); o.scale.setScalar(.05 + .3 * k * (big ? 1.3 : 1)); o.material.uniforms.t.value += dt; }, () => kill(o));
    const s0 = src2(a); fx().glow(s0, 30, C, { to: s0.clone(), pull: 10, sx: 1.2, sy: 1.2, sz: 1.2, max: .1, l0: .3, l1: .4 });
    X.later(.3, () => { const B = beamMesh(C), w = big ? .26 : .19, mz = glowSpr(C, .9, 2), hit = glowSpr(C, 1.2, 1.6); fx().sprite(src2(a), 1.1, C, .5, { g0: 1, g1: .2, k: 1.6 }); X.shake(.3); X.kick(2);
      fx().anim(.8, (k, dt) => { const a0 = src2(a), tg = X.chest(d), ext = Math.min(1, k / .15), b = a0.clone().lerp(tg, ext), fade = k < .78 ? 1 : Math.max(.02, 1 - (k - .78) / .22);
        B.set(a0, b, w * fade * (1 + .025 * Math.sin(k * 60))); B.t(dt); mz.position.copy(a0); mz.scale.setScalar(.9 * fade); hit.position.copy(b); hit.scale.setScalar(ext >= 1 ? 1.4 * fade : .01);
        if (ext >= 1 && Math.random() < .35) fx().spark(tg, 2, C, { max: 10 }); }, () => { B.kill(); kill(mz); kill(hit); }); });
    return X.pend(.42, () => impact(d, C, big ? 1.3 : 1));
  }
  // ---- esfera (Rasengan, Rasen Shuriken, Bijūdama, puño gigante…) ----
  function sphere(a, big, C, v) {
    const d = vic(a), melee = v === '' || v === 'fist', dark = v === 'dark', R0 = v === 'fist' ? .42 : big ? .38 : .3, hitAt = .52;
    fire(a, [['cast', .14, 'out', .2]], .6); X.shot(melee ? 'hit' : 'side', melee ? d : a, 900);
    const o = orb(.02, C, dark ? '#140020' : '#ffffff'); let ring = null;
    if (v === 'shuriken') { ring = new THREE.Mesh(new THREE.RingGeometry(.6, 1, 4, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(C).multiplyScalar(2.6), transparent: true, opacity: .8, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })); o.add(ring); }
    let from = null;
    X.later(.28, () => { if (melee) { X.play(a, [['dash', .05, 'out'], ['jabR', .08, 'snap', .2]]); X.move(a, { x: vx(a) - X.dir(a) * 1.05, d: .2, e: 'out' }); X.afterimage(a, C, 2, .05); back(a, .62); } else X.play(a, [['throw', .1, 'snap', .2]]); });
    fx().anim(hitAt, (k, dt) => { const el = k * hitAt; o.material.uniforms.t.value += dt; o.rotation.y += dt * 9; if (ring) ring.rotation.z += dt * 30;
      if (melee || el < .3) { o.position.copy(srcR(a)).add(t1.set(X.dir(a) * R0 * .6, 0, 0)); o.scale.setScalar(R0 * Math.min(1, el / .22)); if (Math.random() < .5) fx().glow(o.position, 1, C, { max: 1.5, l1: .3 }); }
      else { if (!from) from = o.position.clone(); const u = (el - .3) / (hitAt - .3); o.position.lerpVectors(from, X.chest(d), u * u); } }, () => { kill(o); });
    return X.pend(hitAt, () => { impact(d, C, big ? 1.3 : 1.1); if (v === 'shuriken') for (let i = 0; i < 6; i++) X.later(i * .05, () => X.FT[d] && fx().sprite(X.chest(d), 2.4, '#ffffff', .15, { tex: TEX.star })); });
  }
  // ---- del cielo (Genkidama, Bola de la Muerte, meteoritos) ----
  function sky(a, big, C) {
    const d = vic(a), hitAt = .85, R0 = big ? 1.5 : 1.1; fire(a, [['raise', .2, 'out', .45], ['throw', .1, 'snap', .3]], 1); X.shot('wide', a, 1500);
    const top = () => X.chest(a).add(t1.set(X.dir(a) * .2, 2.5, 0)), o = orb(.05, C, '#ffffff', 2.2);
    const tp = top(); fx().glow(tp, 90, C, { to: tp.clone(), pull: 5, sx: 4, sy: 3, sz: 3, max: .1, l0: .5, l1: .65 });
    let from = null;
    fx().anim(hitAt, (k, dt) => { const el = k * hitAt; o.material.uniforms.t.value += dt;
      if (el < .55) { o.position.copy(top()); const u = el / .55; o.scale.setScalar(.05 + R0 * (1 - Math.pow(1 - u, 3))); }
      else { if (!from) from = o.position.clone(); const u = (el - .55) / .3; o.position.lerpVectors(from, X.chest(d), u * u); o.position.y += Math.sin(u * Math.PI) * .6; if (Math.random() < .8) fx().glow(o.position, 2, C, { max: 1, l1: .4, s0: .1, s1: .25 }); } }, () => kill(o));
    return X.pend(hitAt, () => X.boom(d, C, big ? 1.6 : 1.3));
  }
  // ---- Púrpura Hueco: rojo y azul se juntan y sale disparada una esfera que lo borra todo a su paso ----
  function purple(a) {
    const d = vic(a), D = X.dir(a), hitAt = .66; fire(a, [['cast', .15, 'out', .45], ['beamFire', .06, 'snap', .35]], 1); X.shot('side', a, 1400);
    const base = () => X.chest(a).add(t1.set(D * .75, .1, 0)), red = orb(.2, '#ff2a3a', '#ffd0d0'), blue = orb(.2, '#2a6aff', '#d0e0ff'), pu = orb(.01, '#b13cff', '#ffd1ff', 2.8);
    let from = null, path = 0;
    fx().anim(1.1, (k, dt) => { const el = k * 1.1, c = base(); [red, blue, pu].forEach(m => { m.material.uniforms.t.value += dt; });
      if (el < .4) { const u = el / .4, s = 1 - u * u; red.position.copy(c).add(t2.set(0, .15, 1.15 * s)); blue.position.copy(c).add(t2.set(0, .15, -1.15 * s)); red.scale.setScalar(.2 + u * .1); blue.scale.setScalar(.2 + u * .1); }
      else { red.visible = blue.visible = false; }
      if (el >= .4 && el < .5) { pu.position.copy(c); pu.scale.setScalar(.1 + (el - .4) / .1 * .7); if (!pu.userData.f) { pu.userData.f = 1; fx().sprite(c, 4, '#d6b8ff', .4); X.shake(.4); } }
      else if (el >= .5) { if (!from) from = c.clone(); const u = (el - .5) / (hitAt - .5); pu.position.copy(from).add(t2.set(D * Math.max(0, u) * Math.abs(X.chest(d).x - from.x), 0, 0)); pu.scale.setScalar(.85);
        if (el > .5 && (path -= dt) <= 0) { path = .04; fx().crater(pu.position.x, 0, .6, '#b13cff'); fx().glow(pu.position, 6, '#b13cff', { max: 3, l1: .5 }); }
        if (el > hitAt) pu.material.uniforms.op.value = Math.max(0, 1 - (el - hitAt) / .44); } }, () => { kill(red); kill(blue); kill(pu); });
    return X.pend(hitAt, () => { impact(d, '#b13cff', 1.5); X.kick(4); });
  }
  // ---- vórtice / agujero negro / Chibaku Tensei ----
  function vortex(a, big, C, v) {
    const d = vic(a), cb = v === 'chibaku', hitAt = .7; fire(a, [['cast', .15, 'out', .55]], .8); X.shot('hit', d, 1100);
    const ctr = () => X.chest(d).add(t1.set(0, cb ? 1.7 : 0, 0));
    const core = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: 0x000000 })); core.scale.setScalar(.01); S().add(core);
    const disk = new THREE.Mesh(new THREE.RingGeometry(.3, 1, 48), new THREE.MeshBasicMaterial({ map: TEX.ring, color: new THREE.Color(C).multiplyScalar(2.6), transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })); S().add(disk);
    fx().anim(1.05, (k, dt) => { const el = k * 1.05, c = ctr(), g = el < hitAt ? Math.min(1, el / .35) : Math.max(0, 1 - (el - hitAt) / .35);
      core.position.copy(c); core.scale.setScalar(.02 + (cb ? .55 : .4) * g * (big ? 1.2 : 1)); disk.position.copy(c); disk.scale.setScalar(.05 + 1.3 * g * (big ? 1.2 : 1)); disk.quaternion.copy(X.cam.quaternion); disk.rotateX(-1.1); disk.rotateZ(el * 9);
      if (el < hitAt && Math.random() < .9) fx().glow(c, 3, C, { to: c.clone(), pull: 14, sx: 2.2, sy: 1.6, sz: 2.2, max: .1, l0: .3, l1: .45 });
      if (cb && el < hitAt && Math.random() < .3) fx().debris(X.feet(d).add(t2.set(rr(-2, 2), .1, rr(-1.5, 1.5))), 1); }, () => { kill(core); S().remove(disk); disk.geometry.dispose(); disk.material.dispose(); });
    return X.pend(hitAt, () => impact(d, C, 1.2));
  }
  // ---- Destello Negro ----
  function bflash(a) {
    const d = vic(a); fire(a, [['dash', .05, 'out'], ['jabR', .06, 'snap', .16]], .3); X.move(a, { x: vx(a) - X.dir(a) * 1, d: .1, e: 'out' }); X.afterimage(a, '#ff1f3d', 2, .03); back(a, .5);
    return X.pend(.14, () => { const c = X.chest(d); for (let i = 0; i < 10; i++) fx().bolt(c, c.clone().add(t1.set(rr(-1.7, 1.7), rr(-1.3, 1.5), rr(-1, 1))), i % 3 ? '#ff1f3d' : '#140006', .36, { w: .07, k: i % 3 ? 3 : .15 });
      fx().sprite(c, 3.6, '#ff1f3d', .32, { tex: TEX.star, k: 3 }); X.hitstop(130); X.shake(.6); X.kick(3); });
  }
  // ---- ondas de choque (Puñetazo Serio, Gura Gura, Shinra Tensei, Haki…) ----
  function shock(a, big, C, v) {
    const d = vic(a), D = X.dir(a), hitAt = .3;
    if (v === 'serious') { fire(a, [['dash', .06, 'out'], ['jabR', .09, 'snap', .3]], .5); X.move(a, { x: vx(a) - D * 1.05, d: .2, e: 'out' }); X.afterimage(a, '#ffd23f', 3, .05); back(a, .9); X.shot('hit', d, 1200);
      return X.pend(hitAt, () => { const c = X.chest(d); for (let i = 0; i < 6; i++) X.later(i * .05, () => fx().ring(c.clone().add(t1.set(D * i * .9, 0, 0)), 2 + i * 1.1, '#ffd23f', .5));
        fx().spark(c, 90, '#fff3c4', { dir: t1.set(D, 0, 0), spread: .5, max: 34, life: .6, w: .08 }); fx().sprite(c, 8, '#ffffff', .4, { k: 3 }); for (let i = 0; i < 12; i++) fx().crater(c.x + D * i * .8, rr(-1, 1), 1.2, '#ffd23f');
        X.shake(1); X.kick(6); X.hitstop(160); }); }
    if (v === 'gura') { fire(a, [['jabR', .1, 'snap', .4]], .6); X.shot('wide', a, 1000);
      return X.pend(hitAt, () => { const m = X.chest(a).lerp(X.chest(d), .5); fx().sprite(m, 3.4, '#cfe9ff', .7, { tex: TEX.crack, g0: .8, g1: .4, k: 2.6 }); fx().sprite(X.chest(d), 3, '#cfe9ff', .5, { tex: TEX.crack });
        for (let i = 0; i < 4; i++) X.later(i * .08, () => fx().ring(m, 3 + i * 1.5, '#cfe9ff', .5)); X.shake(.9); X.kick(3); }); }
    fire(a, [['power', .1, 'snap', .4]], .5); X.shot('wide', a, 900);
    const o = orb(.1, C, '#ffffff', 1.6); fx().anim(.55, (k, dt) => { o.position.copy(X.chest(a)); o.scale.setScalar(.2 + k * 6); o.material.uniforms.op.value = Math.pow(1 - k, 1.5) * .8; o.material.uniforms.t.value += dt; }, () => kill(o));
    fx().ring(X.feet(a).setY(.05), 7, C, .6, { flat: 1, inner: .9 }); fx().smoke(X.feet(a), 16, '#2e2638', { max: 5, up: .2 });
    return X.pend(hitAt, () => impact(d, C, 1));
  }
  // ---- cortes (espadas, Getsuga Tenshō, Santuario) ----
  function crescentFly(a, C, dark, tilt) {
    const d = vic(a), m = new THREE.SpriteMaterial({ map: TEX.crescent, color: new THREE.Color(C).multiplyScalar(dark ? 1.2 : 3), transparent: true, blending: dark ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, rotation: (a ? Math.PI : 0) + tilt });
    const s = new THREE.Sprite(m); s.scale.setScalar(2.2); s.renderOrder = 8; S().add(s); const from = srcR(a);
    fx().anim(.22, k => { s.position.lerpVectors(from, X.chest(d), k); s.scale.setScalar(1.6 + k * 1.4); }, () => { fx().anim(.18, k => { m.opacity = 1 - k; s.scale.setScalar(3 + k); }, () => { S().remove(s); m.dispose(); }); });
  }
  function slash(a, big, C, v) {
    const d = vic(a), hitAt = .22; fire(a, [['slashA', .08, 'out'], ['slashB', .08, 'snap', .25]], .5); X.shot('side', a, 800);
    const w = X.FT[a].F.extra.weapon; if (w) fx().trail(() => w.localToWorld(t1.set(0, 0, 1.1)), C, .2, { w: .24, keep: .12 });
    if (v === 'cross') { X.later(.12, () => { const c = X.chest(d); for (const r of [-.7, .7]) { const m = new THREE.SpriteMaterial({ map: TEX.crescent, color: new THREE.Color(C).multiplyScalar(3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, rotation: r + Math.PI / 2 }), s = new THREE.Sprite(m); s.position.copy(c); S().add(s); fx().anim(.35, k => { s.scale.setScalar(.5 + k * 3); m.opacity = 1 - k * k; }, () => { S().remove(s); m.dispose(); }); } }); }
    else { if (v === 'getsuga') crescentFly(a, '#0a0006', true, 0); crescentFly(a, C, false, rr(-.3, .3)); }
    return X.pend(hitAt, () => { impact(d, C, big ? 1.2 : 1); for (let i = 0; i < 3; i++) X.later(i * .05, () => cut(d, C)); });
  }
  function cutAt(c, C) { const an = rr(-1.3, 1.3), L = rr(1, 1.6); fx().bolt(c.clone().add(t1.set(Math.cos(an) * -L, Math.sin(an) * -L, rr(-.2, .2))), c.clone().add(t2.set(Math.cos(an) * L, Math.sin(an) * L, rr(-.2, .2))), C, .22, { disp: 0, w: .06, k: 3 }); }
  function cut(d, C) { cutAt(X.chest(d), C); }
  // ---- relámpago (Chidori, Raikiri, Velocidad Divina, Trueno y Destello) ----
  function lightning(a, big, C, v) {
    const d = vic(a), flash = v === 'flash', hitAt = flash ? .12 : .3, D = X.dir(a);
    if (!flash) { fire(a, [['cast', .1, 'out', .16], ['dash', .05, 'out'], ['jabR', .06, 'snap', .2]], .4);
      for (let i = 0; i < 8; i++) fx().bolt(srcR(a), srcR(a), C, .3, { w: .04, disp: .9, get: () => { const h = srcR(a); return [h, h.clone().add(t2.set(rr(-.6, .6), rr(-.6, .6), rr(-.6, .6)))]; } });
      X.later(.18, () => { X.move(a, { x: vx(a) - D * 1, d: .12, e: 'out' }); X.afterimage(a, C, 3, .03); fx().trail(() => srcR(a), C, .2, { w: .18, keep: .15 }); }); back(a, .7); X.shot('hit', d, 800);
    } else { fire(a, [['dash', .04, 'snap'], ['slashB', .05, 'snap', .3]], .5); const from = X.chest(a);
      X.move(a, { x: vx(a) - D * .9, d: .06, e: 'out' }); X.later(.07, () => fx().bolt(from, X.chest(a), '#ffd23f', .35, { w: .12, disp: .15 })); X.afterimage(a, '#ffd23f', 4, .015, .6); back(a, .8); }
    return X.pend(hitAt, () => { const c = X.chest(d); for (let i = 0; i < 6; i++) fx().bolt(c, c.clone().add(t1.set(rr(-1.4, 1.4), rr(-1, 1.3), rr(-1, 1))), C, .3, { w: .05 }); impact(d, C, big ? 1.2 : 1); });
  }
  // ---- fuego (llamarada, Amaterasu, la flecha de Fuga) ----
  function fireT(a, big, C, v) {
    const d = vic(a), hitAt = v === 'black' ? .35 : .4;
    if (v === 'black') { fire(a, [['cast', .12, 'out', .4]], .4); X.shot('hit', d, 900);
      fx().anim(.5, () => { const c = X.chest(d); fx().smokeP.add({ x: c.x + rr(-.4, .4), y: c.y - .8 + rr(0, .6), z: c.z + rr(-.3, .3), vx: 0, vy: rr(1.5, 3), vz: 0, l: rr(.5, .9), s: rr(.3, .6), r: .02, gg: 0, b: .05, a: .8, grow: 1, dr: .6, fi: 2, fo: 8 }); fx().glow(c.clone().setY(c.y - .6), 2, '#8a2be2', { max: 1, vy: 2, l1: .5 }); });
      return X.pend(hitAt, () => { fx().sprite(X.chest(d), 3, '#8a2be2', .4); X.shake(.4); }); }
    if (v === 'arrow') { fire(a, [['cast', .15, 'out', .5]], .5); X.shot('side', a, 900);
      const m = new THREE.Mesh(SPH, energyMat(C, '#ffffff', 0, 2.8)); m.scale.set(.12, .12, .9); S().add(m); const from = srcR(a);
      fx().anim(hitAt, (k, dt) => { const u = Math.max(0, (k * hitAt - .15) / (hitAt - .15)); m.position.lerpVectors(from, X.chest(d), u * u); m.lookAt(X.chest(d)); m.material.uniforms.t.value += dt; if (u > 0) fx().glow(m.position, 3, C, { max: 1.5, l1: .35 }); }, () => kill(m));
      return X.pend(hitAt, () => X.boom(d, C, 1.1)); }
    fire(a, [['cast', .1, 'out', .45]], .5); X.shot('side', a, 1000);
    fx().anim(.42, () => { const h = srcR(a), tg = X.chest(d), dv = tg.clone().sub(h); const L = dv.length(); dv.normalize();
      for (let i = 0; i < 6 * fx().q1; i++) fx().glowP.add({ x: h.x, y: h.y, z: h.z, vx: dv.x * L * 2.6 + rr(-.6, .6), vy: dv.y * L * 2.6 + rr(-.4, .9), vz: dv.z * L * 2.6 + rr(-.6, .6), l: rr(.3, .45), s: rr(.12, .3) * (big ? 1.3 : 1), r: 3, gg: 1.1 + Math.random(), b: .2, dr: .5, grow: 1.2, fi: 3 }); });
    return X.pend(hitAt, () => { X.boom(d, C, big ? 1.2 : 1); });
  }
  // ---- agua / arena: un dragón que serpentea hasta el rival ----
  function water(a, big, C, v) {
    const d = vic(a), hitAt = .36, sand = v === 'sand', col = sand ? '#d8b878' : C; fire(a, [['cast', .12, 'out', .4]], .5); X.shot('side', a, 900);
    const from = srcR(a); fx().anim(hitAt, k => { const tg = X.chest(d), p = from.clone().lerp(tg, k); p.y += Math.sin(k * 9) * .5 * (1 - k); p.z += Math.cos(k * 7) * .6 * (1 - k);
      if (sand) fx().smoke(p, 2, '#b89a62', { max: .6, size: .8, a: .7, life: .6 }); fx().glow(p, 8, col, { max: 1.4, l0: .3, l1: .6, s0: .08, s1: .2, k: sand ? 1.2 : 2.2 }); });
    return X.pend(hitAt, () => { const c = X.chest(d); fx().glow(c, 80, col, { max: 6, g: -6, l1: .8, s1: .2, k: sand ? 1.2 : 2.2 }); if (sand) fx().smoke(c, 20, '#a88a52', { max: 3, size: 1.4 }); fx().ring(c, 2.4, col, .4); X.shake(.4); });
  }
  // ---- ráfaga de golpes (Ora Ora, Muda Muda, Puños Consecutivos…) ----
  function barrage(a, big, C, o, name) {
    const d = vic(a), D = X.dir(a), hitAt = .62, wd = /ora/i.test(name) ? 'ORA' : /muda/i.test(name) ? 'MUDA' : /dora/i.test(name) ? 'DORA' : '';
    X.busy(a, 1.1); X.expr(a, 'a', 1); X.setActor(a); X.move(a, { x: vx(a) - D * 1, d: .1, e: 'out' }); X.afterimage(a, C, 2, .03); X.shot('hit', d, 1100);
    const seq = [['dash', .05, 'out']]; for (let i = 0; i < 9; i++) seq.push([i % 2 ? 'jabR' : 'jabR_m', .045, 'snap', .015]); X.play(a, seq);
    for (let i = 0; i < 14; i++) X.later(.1 + i * .038, () => { const c = X.chest(d).add(t1.set(-D * .25, rr(-.35, .45), rr(-.35, .35))); fx().sprite(c, rr(.6, 1.1), i % 3 ? C : '#ffffff', .1, { tex: TEX.star, k: 2.4 }); if (i % 2 === 0) fx().spark(c, 4, C, { max: 9 });
      if (wd && i % 3 === 0) X.word(wd, c.clone().add(t2.set(0, .6, 0)), C); if (i % 3 === 0 && o && o.snd) o.snd(); if (X.FT[d] && i % 2) X.FT[d].fl = .6; });
    back(a, .85);
    return X.pend(hitAt, () => impact(d, C, 1));
  }
  // ---- enjambre (pétalos, sangre, sombras, papel, hielo, agujas, flores) ----
  const SW = { petal: ['#ff8fc8', '#ffd0e8'], blood: ['#d1132b', '#5a0010'], shadow: ['#3a1050', '#8a2be2'], paper: ['#f4f1e8', '#ffffff'], ice: ['#bfe9ff', '#ffffff'], needle: ['#e8e8f0', '#ffffff'], flower: ['#ff6fae', '#ffd23f'] };
  function swarm(a, big, C, v) {
    const d = vic(a), hitAt = .45, cl = SW[v] || [C, '#ffffff']; fire(a, [['cast', .12, 'out', .45]], .5); X.shot('side', a, 900);
    const tg = X.chest(d), h = srcR(a);
    for (let i = 0; i < 70 * fx().q1; i++) fx().glowP.add({ x: h.x + rr(-.3, .3), y: h.y + rr(-.3, .3), z: h.z + rr(-.3, .3), vx: rr(-3, 3), vy: rr(-1, 3), vz: rr(-3, 3), to: tg, pull: 22, dr: 3.2, l: rr(.5, .7), s: rr(.05, .12),
      r: new THREE.Color(cl[i % 2]).r * 2, gg: new THREE.Color(cl[i % 2]).g * 2, b: new THREE.Color(cl[i % 2]).b * 2, dl: rr(0, .18), shr: 1 });
    if (v === 'shadow') fx().smoke(h, 10, '#14061c', { max: 2, a: .7 });
    return X.pend(hitAt, () => { fx().glow(tg, 40, cl[0], { max: 5, l1: .6 }); fx().ring(tg, 2, cl[0], .35); X.shake(.35); });
  }
  /* ---- CHOQUE de técnicas, cada uno a su estilo: con energía, su rayo; sin energía (Toji, Adam…), se lanza al punto del choque y aguanta
     con el puño, la espada o el arma (y si los dos son así, intercambian golpes a toda velocidad); los Stands pegan en el punto de choque.
     Donde se encuentran: un núcleo blanco nítido, el color de cada uno a su lado, una pared de energía fina y una onda a cada empujón. ---- */
  let CL = null;
  const modeOf = p => { const st = X.sty(p); return st.k === 'stand' ? 'stand' : st.ce ? 'beam' : 'body'; };
  const reachOf = p => { const st = X.sty(p); return st.k === 'blade' ? 1.05 : st.k === 'pole' ? (st.w === 'chain' ? 1.5 : 1.25) : st.k === 'claw' ? .95 : .8; };
  const holdPose = (p, alt) => { const st = X.sty(p); return st.k === 'blade' || st.k === 'claw' ? (alt ? 'slashH2' : 'slashB') : st.k === 'pole' ? (alt ? 'slashH1' : 'jabR') : st.w === 'kick' ? (alt ? 'kickR_m' : 'kickR') : (alt ? 'jabR_m' : 'jabR'); };
  function clash() {
    const s0 = X.FT[0], s1 = X.FT[1]; if (!s0 || !s1) return; if (CL) clashEnd(-1);
    const M = [modeOf(0), modeOf(1)], C = [0, 1].map(p => M[p] === 'body' ? X.tc(p) : M[p] === 'stand' ? X.sty(p).sc || X.colOf(p) : X.colOf(p)), A = [X.chest(0), X.chest(1)];
    const own = [], add = o => { S().add(o); own.push(o); return o; }, B = [null, null], G = [null, null], mz = [null, null];
    for (const p of [0, 1]) { X.busy(p, 6); X.expr(p, 'a', 6);
      if (M[p] === 'beam') { X.play(p, [['beamCharge', .1, 'out'], ['beamFire', .1, 'snap']], true); B[p] = beamMesh(C[p]); mz[p] = add(glowSpr(C[p], .8, 2)); }
      else if (M[p] === 'stand') { X.play(p, [['cocky', .14, 'out']], true); const g = ghostOf(X.FT[p].F, C[p], .6); g.renderOrder = 4.7; G[p] = add(g); }
      else { X.play(p, [['dash', .06, 'out'], [holdPose(p), .08, 'snap']], true); X.ghosts(p, 3); } }
    const mix = new THREE.Color(C[0]).lerp(new THREE.Color(C[1]), .5).lerp(new THREE.Color('#ffffff'), .35), mixH = '#' + mix.getHexString();
    const core = add(glowSpr('#ffffff', .8, 2.2)), h0 = add(glowSpr(C[0], 1.4, 1.5)), h1 = add(glowSpr(C[1], 1.4, 1.5));
    const wallG = new THREE.PlaneGeometry(1, 1), poolG = new THREE.PlaneGeometry(1, 1);
    const wall = add(new THREE.Mesh(wallG, new THREE.MeshBasicMaterial({ map: TEX.glow, color: mix.clone().multiplyScalar(1.6), transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))); wall.renderOrder = 7;
    const pool = add(new THREE.Mesh(poolG, new THREE.MeshBasicMaterial({ map: TEX.glow, color: mix.clone().multiplyScalar(.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))); pool.rotation.x = -Math.PI / 2; pool.renderOrder = 2;
    X.shot('clash', 0, 6000);
    const m = new V3(); let tt = 0, pulse = .3, dust = 0, ex = .1, alt = false;
    const me = CL = { x: .5, tx: .5, M, C, surge: [0, 0], m };
    me.an = fx().anim(30, (k, dt) => { if (CL !== me) return; tt += dt; me.x += (me.tx - me.x) * Math.min(1, dt * 7);
      m.copy(M[0] === 'beam' ? src2(0) : A[0]).lerp(M[1] === 'beam' ? src2(1) : A[1], me.x); m.z = 0; X.camAt(m);
      const sg = me.surge; sg[0] = Math.max(0, sg[0] - dt * 3); sg[1] = Math.max(0, sg[1] - dt * 3);
      for (const p of [0, 1]) { const D = X.dir(p), s = X.FT[p]; if (!s) continue;
        if (M[p] === 'beam') { const a0 = src2(p); B[p].set(a0, m, .19 * (1 + .45 * sg[p]) * (1 + .03 * Math.sin(tt * 31 + p * 2))); B[p].t(dt); mz[p].position.copy(a0); mz[p].scale.setScalar(.75 + .08 * Math.sin(tt * 27 + p)); }
        else if (M[p] === 'stand') { const R = s.F.mesh; G[p].position.set(m.x - D * (.72 + .1 * Math.sin(tt * 64 + p)), (R ? R.position.y : 0) + .12, .3); // el Stand pega sin parar en el punto del choque
          if (Math.random() < dt * 14) fx().sprite(t1.copy(m).add(t2.set(-D * .15, rr(-.3, .3), rr(-.2, .2))), rr(.4, .7), Math.random() < .5 ? C[p] : '#ffffff', .09, { tex: TEX.star, k: 2.4 }); }
        else { const R = s.A.R, tx = m.x - D * reachOf(p) + Math.sin(tt * 55 + p * 3) * .012, q = Math.min(1, dt * 12); R.tw = null; R.x += (tx - R.x) * q; R.z -= R.z * q; } } // aguanta en el punto del choque, temblando
      if (M[0] === 'body' || M[1] === 'body') { if ((ex -= dt) <= 0) { const both = M[0] === 'body' && M[1] === 'body'; ex = both ? .13 : .22; alt = !alt;
        for (const p of [0, 1]) if (M[p] === 'body') X.play(p, [[holdPose(p, alt), .05, 'snap']], true);
        if (both) { fx().sprite(m, rr(.7, 1.1), '#ffffff', .09, { tex: TEX.star, k: 2.4 }); fx().ring(m, .9, mixH, .2, { inner: .9 }); fx().spark(m, 8, '#ffffff', { dir: t1.set(0, 1, 0), spread: 1.2, max: 10, life: .25 }); X.shake(.06); } } }
      const sp = 1 + .3 * (sg[0] + sg[1]);
      core.position.copy(m); core.scale.setScalar(.75 * sp * (1 + .05 * Math.sin(tt * 23)));
      h0.position.copy(m).x -= .2; h1.position.copy(m).x += .2; h0.scale.setScalar(1.3 * (1 + .4 * sg[0])); h1.scale.setScalar(1.3 * (1 + .4 * sg[1]));
      wall.position.copy(m); wall.rotation.set(0, Math.PI / 2, tt * 1.2); wall.scale.setScalar(1.7 * sp * (1 + .06 * Math.sin(tt * 17)));
      pool.position.set(m.x, .025, 0); pool.scale.setScalar(2.6 * sp);
      if (Math.random() < dt * 26) fx().spark(m, 2, Math.random() < .5 ? C[0] : C[1], { dir: t1.set(rr(-.25, .25), rr(-1, 1), rr(-1, 1)), spread: .4, max: 9, life: .3, w: .035 });
      if ((M[0] === 'beam' || M[1] === 'beam') && Math.random() < dt * 1.6) fx().bolt(m, m.clone().add(t1.set(rr(-.9, .9), rr(-.8, .8), rr(-.6, .6))), Math.random() < .5 ? C[0] : C[1], .09, { w: .035 });
      if ((pulse -= dt) <= 0) { pulse = .55; fx().ring(m, 1.4, mixH, .45, { inner: .93 }); }
      if ((dust -= dt) <= 0) { dust = .09; fx().smoke(t1.set(m.x, .05, rr(-.3, .3)), 1, '#3a3344', { max: 2.6, up: .08, a: .4, vz: rr(-1, 1) }); }
      if (Math.random() < dt * 2.5) X.shake(.05);
    }, () => { for (const b of B) if (b) b.kill(); for (const o of own) { S().remove(o); if (o.material) o.material.dispose(); else if (o.userData.mat) o.userData.mat.dispose(); } wallG.dispose(); poolG.dispose(); });
  }
  // empujón: el punto del choque avanza hacia quien cede; el que empuja se ensancha un instante y sale una onda
  function clashX(x) { const c = CL; if (!c) return; x = Math.max(.06, Math.min(.94, x)); if (x === c.tx) return; const w = x > c.tx ? 0 : 1; c.tx = x; c.surge[w] = 1;
    fx().ring(c.m, 2, c.C[w], .4, { inner: .9 }); fx().sprite(c.m, 1.5, '#ffffff', .14, { k: 2 }); fx().spark(c.m, 14, c.C[w], { dir: t1.set(X.dir(w) * .6, .5, 0), spread: 1, max: 12, life: .35 }); fx().crater(c.m.x, 0, .7, c.C[w]);
    X.kick(1.4); X.shake(.16); }
  // final: el rayo ganador atraviesa al rival; quien pega con el cuerpo se lanza a rematar; el Stand da el último golpe
  function clashEnd(l) { const c = CL; if (!c) return; CL = null; c.an.t = c.an.d; const w = l === 0 || l === 1 ? 1 - l : -1; X.shot(w >= 0 ? 'hit' : 'wide', w >= 0 ? l : 0, w >= 0 ? 800 : 1);
    if (w >= 0) { const D = X.dir(w);
      if (c.M[w] === 'beam') { const B = beamMesh(c.C[w]); fx().anim(.5, (k, dt) => { const a0 = src2(w), tg = X.chest(l).add(t1.set(D * 1.6 * Math.min(1, k * 3), 0, 0)), b = a0.clone().lerp(tg, Math.min(1, k / .18));
          B.set(a0, b, .2 * (1 + k * .7) * (k > .7 ? Math.max(.05, 1 - (k - .7) / .3) : 1)); B.t(dt); }, () => B.kill()); }
      else if (c.M[w] === 'stand') standGhost(w, c.C[w], .45, { reach: .5 });
      else { const st = X.sty(w); X.play(w, [['dash', .04, 'snap'], [st.k === 'blade' || st.k === 'claw' ? 'slashB' : st.w === 'kick' ? 'kickR' : 'upperR', .07, 'snap', .25]]);
        X.move(w, { x: X.chest(l).x - D * .95, z: 0, d: .08, e: 'out' }); X.ghosts(w, 3); X.later(.55, () => X.home(w)); } }
    for (const p of [0, 1]) { const s = X.FT[p]; if (!s || s.dead) continue; X.unbusy(p, .5); if (p !== l && c.M[p] !== 'body') X.play(p, [[s.A.base, .3, 'io']]); if (w < 0) X.home(p); }
  }
  /* ---- TÉCNICAS SIN ENERGÍA: se hacen con el cuerpo y el arma ---- */
  const ELA = { fire: 'fire', water: 'water', lightning: 'thunder' }, SWE = { blood: 'blood', ice: 'ice', shadow: 'shadow', paper: 'paper' };
  const elOf = ar => ar.ar === 'water' && ar.v === 'sand' ? 'sand' : ELA[ar.ar] || (ar.ar === 'swarm' ? SWE[ar.v] || '' : '');
  // pasa la técnica por el estilo: lo que no encaja con cómo pelea se convierte en su golpe
  function styled(ar, st) { const k = st.k;
    if (k === 'stand' && (ar.def || ar.ar === 'barrage' || ar.ar === 'beam' || (ar.ar === 'sphere' && ar.v === 'fist'))) return { ar: 'stand' }; // Star Finger, Road Roller, ORA ORA…: pega el Stand
    if (ar.ar === 'barrage' && (k === 'blade' || k === 'pole' || k === 'claw')) return { ar: 'strike', v: 'flurry', el: elOf(ar) };
    if (!st.ce) { if (ar.ar === 'barrage' || ar.ar === 'bflash' || (ar.ar === 'lightning' && ar.v === 'flash') || (ar.ar === 'shock' && ar.v === 'serious')) return ar;
      return { ar: 'strike', v: '', el: elOf(ar) }; }
    if ((k === 'pole' || k === 'claw') && ar.ar === 'slash') return { ar: 'strike', v: '', el: '' }; // un bastón o una cola no lanzan cortes voladores: golpean
    if (ar.def) { if (k === 'mage' && (st.w === 'cards' || st.w === 'needle')) return { ar: 'swarm', v: st.w === 'cards' ? 'paper' : 'needle' }; // Hisoka, Illumi: una lluvia de cartas o agujas
      return k === 'ki' || k === 'mage' ? ar : k === 'blade' ? { ar: 'slash', v: '' } : k === 'psy' ? { ar: 'psyc' } : { ar: 'strike', v: '', el: '' }; }
    return ar;
  }
  const wOf = (st, name) => /cloud|staff|bokken/i.test(name) ? 'staff' : st.w === 'chain' && /spear|chain|knife|heaven/i.test(name) ? 'chain' : /hammer|mj.lnir|gavel/i.test(name) ? 'hammer' : st.w;
  function strike(a, big, C0, st, ar, name, o) {
    const E = ar.el || st.el, C = (E && EL[E]) || (st.au ? C0 : STEEL), w = wOf(st, name), fl = ar.v === 'flurry' || /spin|crazy|rampage|cyclone|dance|berserk|frenzy/i.test(name);
    if (st.k === 'blade') return fl ? flurry(a, big, C, E, st) : iai(a, big, C, E, st);
    if (st.k === 'claw') return fl ? flurry(a, big, C, E, st) : rake(a, big, C, E, st);
    if (st.k === 'pole') return fl ? flurry(a, big, C, E, st) : w === 'chain' ? chainT(a, big, C, E, st) : w === 'spear' ? spearT(a, big, C, E, st) : w === 'staff' ? staffT(a, big, C, E, st) : smashT(a, big, C, E, st);
    if (st.k === 'stand') return standRush(a, big, st.sc || C0, name, o);
    if (st.k === 'psy') return psyCrush(a, big, C0);
    return power(a, big, C, E, st);
  }
  // golpe demoledor (Saitama, Adam con su puño americano, Yujiro…): se impulsa agrietando el suelo y la onda de choque sale por detrás del rival
  function power(a, big, C, E, st) {
    const d = vic(a), D = X.dir(a), hv = st.heavy, kick = st.w === 'kick', kn = st.w === 'knuckle', hitAt = hv ? .4 : .32;
    fire(a, [['power', .1, 'out', hv ? .14 : .08], ['dash', .05, 'out'], [kick ? 'kickR' : big ? 'upperR' : 'jabR', .07, 'snap', .3]], .6); X.shot('side', a, 500); X.later(.2, () => X.shot('hit', d, 900));
    const f0 = X.feet(a); fx().smoke(f0, 8, '#3a3344', { max: 2.4, up: .2 }); fx().crater(f0.x, f0.z, .6, C);
    if (kn) fx().sprite(X.hand(a, 'R'), .9, '#fff0c0', .3, { tex: TEX.star, k: 2.6, spin: 4 }); // destello del puño americano
    X.later(hitAt - .15, () => { X.move(a, { x: vx(a) - D * (kick ? 1.2 : 1), z: vz(a), d: .12, e: 'out' }); X.ghosts(a, 3); fx().trail(() => X.hand(a, 'R'), C, .2, { w: .15, keep: .14 }); });
    back(a, hitAt + .5);
    return X.pend(hitAt, () => { const c = X.chest(d); X.hitFx(a, d, c, true, C);
      for (let i = 0; i < (hv ? 5 : 4); i++) X.later(i * .04, () => fx().ring(t1.copy(c).add(t2.set(D * i * .55, 0, 0)), .9 + i * .55, i % 2 ? C : '#ffffff', .32, { inner: .9 }));
      fx().spark(c, 40, kn ? '#ffe2a0' : '#ffffff', { dir: t1.set(D, .1, 0), spread: .5, max: 20, life: .45 }); if (kn) fx().sprite(c, 1.8, '#fff3d0', .3, { tex: TEX.knuckle, k: 2.6, rot: 0 });
      if (E) flourish(E, c, 30); const f = X.feet(d); fx().debris(t1.copy(f).setY(.2), hv ? 18 : 10, { big: 1, vx: D * 4 }); fx().crater(f.x + D * .5, f.z, hv ? 1.6 : 1.1, C); fx().smoke(f, 12, '#2e2638', { max: 3.5, vx: D * 2 });
      X.hitstop(hv ? 150 : 110); X.shake(hv ? .9 : .65); X.kick(hv ? 5 : 4); });
  }
  // corte iai: desenvaina, atraviesa al rival en un instante y el corte aparece después, con él ya de espaldas (y su elemento si respira agua, fuego…)
  function iai(a, big, C, E, st) {
    const d = vic(a), D = X.dir(a), hitAt = .34; fire(a, [['slashA', .1, 'out', .1], ['dash', .03, 'snap'], ['slashB', .05, 'snap', .4]], .7); X.shot('side', a, 1100);
    fx().sprite(X.hand(a, 'R').add(t1.set(D * .3, .2, 0)), .6, '#ffffff', .2, { tex: TEX.star, k: 2.2 });
    X.later(.17, () => { const from = X.chest(a); X.move(a, { x: vx(a) + D * 1.25, z: vz(a) + .35, d: .07, e: 'out' }); X.ghosts(a, 4);
      X.later(.075, () => { const end = X.chest(a); line(from, end, C, .32, .1); line(from, end, '#ffffff', .22, .045); if (E) for (let i = 0; i <= 8; i++) flourish(E, from.clone().lerp(end, i / 8), 3); }); });
    X.later(.45, () => X.move(a, { x: X.homeX(a), z: 0, d: .4, e: 'io', arc: .55 })); // vuelve a su sitio de un salto por encima
    return X.pend(hitAt, () => { const c = X.chest(d); for (let i = 0; i < (big ? 5 : 3); i++) X.later(i * .035, () => cut(d, i % 2 ? '#ffffff' : C)); X.hitFx(a, d, c, true, C); if (E) flourish(E, c, 24); X.hitstop(120); X.shake(.6); X.kick(3); });
  }
  // ráfaga de cortes (Corte Giratorio, Corte Loco, la motosierra…)
  function flurry(a, big, C, E, st) {
    const d = vic(a), D = X.dir(a), hitAt = .55; X.busy(a, 1.1); X.expr(a, 'a', 1); X.setActor(a); X.shot('hit', d, 1000);
    X.move(a, { x: vx(a) - D * 1.2, z: vz(a), d: .1, e: 'out' }); X.ghosts(a, 2);
    const seq = [['dash', .05, 'out']]; for (let i = 0; i < 7; i++) seq.push([i % 2 ? 'slashH1' : 'slashH2', .05, 'snap', .01]); X.play(a, seq);
    fx().trail(() => X.hand(a, 'R'), C, .5, { w: .16, keep: .1 });
    for (let i = 0; i < 9; i++) X.later(.1 + i * .045, () => { if (!X.FT[d]) return; cut(d, i % 3 ? C : '#ffffff'); if (E && i % 2) flourish(E, X.chest(d), 4); if (i % 2) X.FT[d].fl = .5; fx().spark(X.chest(d), 5, '#ffffff', { max: 9 }); });
    back(a, .85);
    return X.pend(hitAt, () => { X.hitFx(a, d, X.chest(d), true, C); X.shake(.5); });
  }
  // zarpazos: tres cortes paralelos (con cola, látigo o kagune, desde más lejos)
  function claws(d, C, an) { const c = X.chest(d); for (let j = -1; j <= 1; j++) { const o = new V3(-Math.sin(an) * j * .17, Math.cos(an) * j * .17, .1), u = new V3(Math.cos(an) * 1.1, Math.sin(an) * 1.1, 0); line(c.clone().add(o).sub(u), c.clone().add(o).add(u), C, .26, .05); } }
  function whip(a, d, C, life) { const tip = X.chest(a); fx().anim(life, k => { const u = Math.min(1, k / .6); tip.copy(X.chest(a)).lerp(X.chest(d), u); tip.y += Math.sin(u * Math.PI) * .8; });
    fx().bolt(tip, tip, C, life, { w: .07, disp: .12, k: 2.4, get: () => [X.chest(a), tip.clone()] }); }
  function rake(a, big, C, E, st) {
    const d = vic(a), D = X.dir(a), long = /tail|whip|kagune/.test(st.w), hitAt = .3; fire(a, [['dash', .05, 'out'], ['slashH1', .07, 'out'], ['slashH2', .06, 'snap', .25]], .5); X.shot('hit', d, 900);
    X.move(a, { x: vx(a) - D * (long ? 1.8 : 1.05), z: vz(a), d: .12, e: 'out' }); X.ghosts(a, 2);
    if (long) whip(a, d, C, .3); else fx().trail(() => X.hand(a, 'R'), C, .3, { w: .14, keep: .12 });
    back(a, .8);
    return X.pend(hitAt, () => { claws(d, C, rr(-1, -.4)); X.later(.08, () => X.FT[d] && claws(d, '#ffffff', rr(.4, 1))); X.hitFx(a, d, X.chest(d), true, C); if (E) flourish(E, X.chest(d), 20); X.shake(.5); X.hitstop(90); });
  }
  // el cuchillo con cadena (Lanza Celestial Invertida de Toji): la cadena sale de su mano y el filo restalla contra el rival
  function chain(a, d, life = .3) { const tip = X.hand(a, 'R');
    fx().anim(life, k => { const u = Math.min(1, k / .55); tip.copy(X.hand(a, 'R')).lerp(X.chest(d), u); tip.y += Math.sin(u * Math.PI) * .45; });
    fx().bolt(tip, tip, '#c8cfdc', life + .04, { w: .022, disp: .05, k: 1.4, get: () => [X.hand(a, 'R'), tip.clone()] });
    fx().trail(() => tip.clone(), '#ffffff', life, { w: .08, keep: .1 }); }
  function chainT(a, big, C, E, st) {
    const d = vic(a), D = X.dir(a), hitAt = .36; X.busy(a, 1.1); X.expr(a, 'a', 1); X.setActor(a); X.shot('side', a, 1100);
    X.play(a, [['dash', .04, 'out'], ['slashH1', .07, 'out', .05], ['slashH2', .05, 'snap', .3]]);
    X.move(a, { x: vx(a) - D * 2.2, z: .9, d: .08, e: 'out' }); X.ghosts(a, 4); // a toda velocidad: aparece a un lado y luego al otro
    X.later(.1, () => { X.move(a, { x: vx(a) - D * 1.9, z: -.5, d: .07, e: 'out' }); X.ghosts(a, 3); });
    X.later(.18, () => chain(a, d, .3));
    back(a, .8);
    return X.pend(hitAt, () => { const c = X.chest(d); X.hitFx(a, d, c, true, '#ffffff'); for (let i = 0; i < 3; i++) X.later(i * .04, () => X.FT[d] && cut(d, i % 2 ? STEEL : '#ffffff'));
      fx().ring(c, 1.8, '#ffffff', .3, { inner: .94 }); fx().sprite(c, 1.6, '#ffffff', .12, { tex: TEX.star, k: 2.6 }); X.hitstop(120); X.shake(.55); X.kick(3); });
  }
  // bastón (Nube Juguetona…): dos golpes secos y uno de abajo arriba
  function staffT(a, big, C, E, st) {
    const d = vic(a), D = X.dir(a), hitAt = .46; X.busy(a, 1.1); X.expr(a, 'a', 1); X.setActor(a); X.shot('hit', d, 1100);
    X.move(a, { x: vx(a) - D * 1.4, z: vz(a), d: .1, e: 'out' }); X.ghosts(a, 3);
    X.play(a, [['dash', .05, 'out'], ['slashH1', .06, 'snap', .04], ['slashH2', .06, 'snap', .04], ['upperR', .07, 'snap', .2]]);
    fx().trail(() => X.hand(a, 'R').add(t1.set(D * .6, .3, 0)), STEEL, .45, { w: .2, keep: .12 });
    for (const [t, k] of [[.14, .6], [.27, .8]]) X.later(t, () => { if (!X.FT[d]) return; const c = X.chest(d); fx().ring(c, 1.2 * k, '#ffffff', .25, { inner: .88 }); fx().sprite(c, k, '#ffffff', .1, { tex: TEX.star }); fx().debris(c, 3); X.FT[d].fl = .6; X.shake(.25); });
    back(a, .9);
    return X.pend(hitAt, () => { const c = X.chest(d); X.hitFx(a, d, c, true, C); fx().ring(c, 2.6, C, .4, { inner: .9 }); fx().debris(X.feet(d).setY(.2), 12, { big: 1 }); if (E) flourish(E, c, 20); X.hitstop(130); X.shake(.7); X.kick(4); });
  }
  // lanza o alabarda: una estocada que atraviesa
  function spearT(a, big, C, E, st) {
    const d = vic(a), D = X.dir(a), hitAt = .3; fire(a, [['power', .1, 'out', .06], ['dash', .04, 'out'], ['jabR', .06, 'snap', .3]], .5); X.shot('side', a, 1000);
    X.later(.14, () => { X.move(a, { x: vx(a) - D * 1.7, z: vz(a), d: .1, e: 'out' }); X.ghosts(a, 3); fx().trail(() => X.hand(a, 'R').add(t1.set(D * .9, 0, 0)), C, .2, { w: .1, keep: .16 }); });
    back(a, .8);
    return X.pend(hitAt, () => { const c = X.chest(d); X.hitFx(a, d, c, true, C); fx().spark(c, 40, '#ffffff', { dir: t1.set(D, 0, 0), spread: .25, max: 22, life: .4 });
      line(c.clone().add(t2.set(-D * .4, 0, 0)), c.clone().add(t2.set(D * 2.2, 0, 0)), C, .25, .08); fx().ring(c.clone().add(t2.set(D * .9, 0, 0)), 1.6, C, .3, { inner: .9 });
      if (E) flourish(E, c, 24); X.hitstop(110); X.shake(.55); X.kick(3); });
  }
  // maza, hacha o martillo: salta y lo descarga de arriba abajo
  function smashT(a, big, C, E, st) {
    const d = vic(a), D = X.dir(a), hitAt = .46; fire(a, [['raise', .14, 'out', .12], ['slashB', .07, 'snap', .35]], .7); X.shot('wide', a, 1300);
    X.move(a, { x: vx(a) - D * 1.2, z: vz(a), y: 0, d: .4, e: 'io', arc: 1.6 }); X.ghosts(a, 2);
    X.later(.3, () => fx().trail(() => X.hand(a, 'R').add(t1.set(D * .5, .4, 0)), C, .16, { w: .26, keep: .1 }));
    back(a, 1);
    return X.pend(hitAt, () => { const f = X.feet(d); X.hitFx(a, d, X.chest(d), true, C); fx().ring(f.clone().setY(.05), 5, C, .6, { flat: 1, inner: .7 }); fx().crater(f.x, f.z, 1.8, C); fx().debris(f.clone().setY(.2), 22, { big: 1 }); fx().smoke(f, 22, '#2e2638', { max: 4.5, size: 1.4 });
      if (E) flourish(E, X.chest(d), 30); X.hitstop(150); X.shake(1); X.kick(5); });
  }
  // Stand: sale del usuario, se planta delante del rival y le da una lluvia de golpes (ORA ORA, MUDA MUDA…)
  function standGhost(a, C, dur, o = {}) { const s = X.FT[a]; if (!s) return null; const D = X.dir(a), g = ghostOf(s.F, C, .6), m = g.userData.mat; g.renderOrder = 4.7; S().add(g);
    const x0 = g.position.x + D * .15, y0 = g.position.y + .12, z0 = g.position.z + .3;
    fx().anim(dur, k => { const el = k * dur, tx = vx(a) - D * (o.reach ?? .75), u = Math.min(1, el / .12), jab = o.rush ? Math.sin(el * 70) * .12 : Math.sin(Math.min(1, el / .25) * Math.PI) * .22;
      g.position.set(x0 + (tx - x0) * (1 - Math.pow(1 - u, 3)) + D * jab, y0 + Math.sin(el * 6) * .04, z0); m.opacity = .6 * Math.min(1, el / .05) * (k > .75 ? (1 - k) / .25 : 1); },
      () => { S().remove(g); m.dispose(); });
    return g; }
  function standRush(a, big, C, name, o) {
    const d = vic(a), D = X.dir(a), hitAt = .62, wd = /ora/i.test(name) ? 'ORA' : /muda/i.test(name) ? 'MUDA' : /dora/i.test(name) ? 'DORA' : '';
    fire(a, [['cocky', .12, 'out', .7]], .8); X.shot('hit', d, 1200); standGhost(a, C, .95, { reach: .7, rush: 1 });
    for (let i = 0; i < 14; i++) X.later(.14 + i * .034, () => { if (!X.FT[d]) return; const c = X.chest(d).add(t1.set(-D * .25, rr(-.35, .45), rr(-.35, .35))); fx().sprite(c, rr(.5, 1), i % 3 ? C : '#ffffff', .1, { tex: TEX.star, k: 2.4 }); if (i % 2 === 0) fx().spark(c, 4, C, { max: 9 });
      if (wd && i % 3 === 0) X.word(wd, c.clone().add(t2.set(0, .6, 0)), C); if (i % 3 === 0 && o && o.snd) o.snd(); if (i % 2) X.FT[d].fl = .6; });
    return X.pend(hitAt, () => { X.hitFx(a, d, X.chest(d), true, C); fx().ring(X.chest(d), 2.4, C, .4, { inner: .9 }); X.shake(.6); X.kick(3); });
  }
  // telequinesis: levanta rocas alrededor del rival, lo estruja con anillos que se cierran y lo aplasta con todo
  function implode(p, r, C, life) { const g = new THREE.RingGeometry(.9, 1, 48), m = new THREE.MeshBasicMaterial({ color: new THREE.Color(C).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), o = new THREE.Mesh(g, m); o.position.copy(p); o.renderOrder = 8; S().add(o);
    fx().anim(life, k => { o.scale.setScalar(.1 + r * (1 - k * k)); m.opacity = Math.sin(k * Math.PI); o.quaternion.copy(X.cam.quaternion); }, () => { S().remove(o); g.dispose(); m.dispose(); }); }
  function psyCrush(a, big, C) {
    const d = vic(a), hitAt = .6, F = fx(); fire(a, [['raise', .14, 'out', .5]], .8); X.shot('hit', d, 1100);
    const f = X.feet(d);
    for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(F.rockG, F.rockM), an = rr(0, TAU), R0 = rr(1.4, 2.4); r.scale.setScalar(rr(.12, .26)); r.position.set(f.x + Math.cos(an) * R0, .1, f.z + Math.sin(an) * R0 * .6); S().add(r); const p0 = r.position.clone(); let from = null;
      F.anim(hitAt, (k, dt) => { const el = k * hitAt, u = el / .38; r.rotation.x += dt * 3; r.rotation.y += dt * 4;
        if (u < 1) r.position.set(p0.x, .1 + 1.8 * (1 - Math.pow(1 - u, 3)), p0.z); else { if (!from) from = r.position.clone(); const v = Math.min(1, (el - .38) / (hitAt - .38)); r.position.lerpVectors(from, X.chest(d), v * v); } }, () => S().remove(r)); }
    F.glow(X.chest(d), 40, C, { to: X.chest(d), pull: 6, sx: 1.4, sy: 1.4, sz: 1.4, max: .1, l0: .5, l1: .6 });
    for (let i = 0; i < 3; i++) X.later(i * .15, () => X.FT[d] && implode(X.chest(d), 2.2, C, .3));
    return X.pend(hitAt, () => { const c = X.chest(d); X.hitFx(a, d, c, true, C); F.debris(c, 10, { big: 1 }); F.ring(c, 2.8, C, .4, { inner: .88 }); X.shake(.6); X.kick(3); });
  }
  // detalle del elemento en los golpes físicos (Respiración del Agua, del Fuego, el Trueno, la sangre, el Hamon…)
  function flourish(E, p, n = 10) { const C = EL[E] || '#ffffff', F = fx();
    switch (E) {
      case 'fire': case 'sun': F.glow(p, n, C, { max: 2.6, vy: 1.6, l0: .3, l1: .6, s0: .08, s1: .2, k: 2.4, grow: .6 }); F.smoke(p, Math.ceil(n / 6), '#2a1a14', { max: 1.2, up: 1.2, a: .45 }); break;
      case 'water': F.glow(p, n, C, { max: 3.4, g: -7, l0: .4, l1: .7, s0: .05, s1: .13, k: 2 }); if (n > 15) F.ring(p, 1.6, '#bfe9ff', .35, { inner: .9 }); break;
      case 'thunder': for (let i = 0; i < Math.max(1, n / 8); i++) F.bolt(p, p.clone().add(t1.set(rr(-1.2, 1.2), rr(-1, 1.2), rr(-.8, .8))), C, .18, { w: .04 }); F.glow(p, n / 2, C, { max: 3, l1: .35 }); break;
      case 'blood': F.glow(p, n, C, { max: 3, g: -6, l0: .4, l1: .8, s0: .05, s1: .12, k: 1.6 }); break;
      case 'dark': case 'shadow': F.smoke(p, Math.ceil(n / 3), '#14061c', { max: 1.6, a: .7 }); F.glow(p, n / 2, C, { max: 2.4 }); break;
      case 'ice': F.glow(p, n, C, { max: 3, l1: .5 }); if (n > 15) F.sprite(p, 1.4, C, .2, { tex: TEX.star }); break;
      case 'cut': for (let i = 0; i < Math.max(1, n / 10); i++) cutAt(p, C); break;
      default: F.glow(p, n, C, { max: 2.4 });
    }
  }
  // ---- extras de las habilidades ----
  function shield(p) { const g = new THREE.IcosahedronGeometry(1, 2), m = new THREE.MeshBasicMaterial({ color: new THREE.Color(X.colOf(p)).multiplyScalar(2.4), wireframe: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), w = new THREE.Mesh(g, m), o = orb(1, X.colOf(p), '#ffffff', 1.2);
    S().add(w); fx().anim(.75, (k, dt) => { const c = X.chest(p), s = (X.FT[p] ? X.FT[p].F.H : 2.2) * .55 * (k < .15 ? k / .15 : 1); w.position.copy(c); o.position.copy(c); w.scale.setScalar(s); o.scale.setScalar(s * .98); m.opacity = 1 - k; o.material.uniforms.op.value = (1 - k) * .5; o.material.uniforms.t.value += dt; w.rotation.y += dt; },
      () => { S().remove(w); g.dispose(); m.dispose(); kill(o); }); }
  function meteor(p, miss) { const f = X.feet(p).add(t1.set(miss ? X.dir(p) * -1.6 : 0, 0, miss ? 1 : 0)), from = f.clone().add(t2.set(-X.dir(p) * 5, 11, -3)), tgt = f.clone().setY(miss ? 0 : 1);
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.6, 0), new THREE.MeshToonMaterial({ color: '#3a2a22', emissive: new THREE.Color('#ff6a1a'), emissiveIntensity: .6 })); S().add(m);
    fx().anim(.52, (k, dt) => { m.position.lerpVectors(from, tgt, k * k); m.rotation.x += dt * 4; m.rotation.z += dt * 3; fx().glow(m.position, 4, '#ff7a2e', { max: 1.2, l1: .4, s0: .15, s1: .35 }); if (Math.random() < .5) fx().smoke(m.position, 1, '#2a2020', { max: .5, life: .6 }); },
      () => { S().remove(m); m.geometry.dispose(); m.material.dispose(); fx().sprite(tgt, 4, '#ff7a2e', .45); fx().ring(f.clone().setY(.05), 4, '#ff7a2e', .6, { flat: 1, inner: .7 }); fx().crater(f.x, f.z, 1.4, '#ff7a2e'); fx().debris(f.clone().setY(.2), 16, { big: 1 }); fx().smoke(f, 16, '#2e2638', { max: 4 }); X.shake(.7); }); }
  function stomp(p) { const f = X.feet(p), m = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 1.6, 6, 16), new THREE.MeshToonMaterial({ color: '#9a6a58' })); m.rotation.x = Math.PI / 2; S().add(m);
    fx().anim(.5, k => { m.position.set(f.x, 12 - 10.6 * k * k, f.z - .4); }, () => { fx().ring(f.clone().setY(.05), 6, '#ffb27a', .7, { flat: 1, inner: .6 }); fx().smoke(f, 30, '#5a4030', { max: 6, size: 1.6 }); fx().debris(f.clone().setY(.2), 24, { big: 1 }); fx().crater(f.x, f.z, 2.2, '#ffb27a'); X.shake(1);
      fx().anim(.6, k => { m.position.y = 1.4 + k * 6; m.material.opacity = 1 - k; m.material.transparent = true; }, () => { S().remove(m); m.geometry.dispose(); m.material.dispose(); }); }); }
  function clone(a, d) { const s = X.FT[a]; if (!s) return; const g = ghostOf(s.F, X.colOf(a), .55), mat = g.userData.mat; g.position.z += .9; S().add(g); const x0 = g.position.x, x1 = vx(a) - X.dir(a) * 1;
    fx().anim(.42, k => { g.position.x = x0 + (x1 - x0) * Math.min(1, k / .45); mat.opacity = .55 * (k < .6 ? 1 : 1 - (k - .6) / .4); if (k > .45 && !g.userData.h) { g.userData.h = 1; fx().sprite(X.chest(d), 1.4, X.colOf(a), .15, { tex: TEX.star }); } }, () => { S().remove(g); mat.dispose(); }); }
  const SH = [];
  function shades(a, n) { const s = X.FT[a]; if (!s) return; const D = X.dir(a);
    for (let i = 0; i < n; i++) { const g = ghostOf(s.F, '#120018', .9, false), mat = g.userData.mat; g.position.x -= D * (1 + i * .45); g.position.z = (i % 2 ? -1 : 1) * (.6 + i * .3); g.position.y = -2.4; S().add(g); SH.push(g);
      fx().smoke(X.feet(a).add(t1.set(-D * (1 + i * .45), 0, g.position.z)), 6, '#14061c', { max: 1.5, a: .7 });
      fx().anim(1.7, k => { g.position.y = k < .3 ? -2.4 * (1 - k / .3) : k > .8 ? -2.4 * (k - .8) / .2 : 0; mat.opacity = .9; }, () => { S().remove(g); mat.dispose(); const j = SH.indexOf(g); if (j >= 0) SH.splice(j, 1); }); } }
  function shadeHit(a, d) { const s = X.FT[a]; if (!s) return; const g = ghostOf(s.F, '#14001e', .85, false), mat = g.userData.mat; g.position.x -= X.dir(a) * 1.2; S().add(g); const x0 = g.position.x, x1 = vx(a) - X.dir(a) * 1;
    fx().anim(.32, k => { g.position.x = x0 + (x1 - x0) * k * k; mat.opacity = .85 * (1 - k * .3); }, () => { fx().smoke(X.chest(d), 10, '#14061c', { max: 2, a: .7 }); fx().glow(X.chest(d), 16, '#8a2be2', { max: 4 }); S().remove(g); mat.dispose(); }); }

  function run(a, ar, big, C, o, name) {
    const st = X.sty(a); ar = styled(ar, st);
    switch (ar.ar) {
      case 'strike': return strike(a, big, C, st, ar, name, o); case 'stand': return standRush(a, big, st.sc || C, name, o); case 'psyc': return psyCrush(a, big, C);
      case 'purple': return purple(a); case 'sky': return sky(a, big, C); case 'vortex': return vortex(a, big, C, ar.v); case 'sphere': return sphere(a, big, C, ar.v);
      case 'bflash': return bflash(a); case 'shock': return shock(a, big, C, ar.v); case 'slash': return slash(a, big, C, ar.v); case 'lightning': return lightning(a, big, C, ar.v);
      case 'fire': return fireT(a, big, C, ar.v); case 'water': return water(a, big, C, ar.v); case 'barrage': return barrage(a, big, C, o, name); case 'swarm': return swarm(a, big, C, ar.v);
      default: return beam(a, big, C);
    }
  }
  // rayo suelto (Night Guy, o si una técnica no se pudo animar): quien no tiene energía lo sustituye por su golpe
  const beamS = (a, big, col) => { const st = X.sty(a); return st.ce ? beam(a, big, col || X.colOf(a)) : strike(a, big, col || X.tc(a), st, { ar: 'beam', v: '', el: '' }, '', {}); };
  return { run, beam: beamS, clash, clashX, clashEnd, cut, shield, meteor, stomp, clone, shades, shadeHit, flourish, standGhost, chain };
}
