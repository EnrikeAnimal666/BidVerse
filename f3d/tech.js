/* BidVerse 3D · TÉCNICAS: cada familia (rayo, esfera, del cielo, púrpura, vórtice, destello negro, onda, corte, relámpago, fuego,
   agua/arena, ráfaga de golpes y enjambre) con su coreografía en 3D. Devuelven una promesa que se cumple en el instante del impacto. */
import * as THREE from 'three';
import { energyMat, TEX, rr, TAU } from './fx.js';
import { ghostOf } from './model.js';

export function makeTech(X) {
  const V3 = THREE.Vector3, t1 = new V3(), t2 = new V3();
  const fx = () => X.fx, S = () => X.scene;
  const SPH = new THREE.SphereGeometry(1, 32, 20), CYL = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true); CYL.translate(0, .5, 0); CYL.rotateX(Math.PI / 2);
  const orb = (r, col, core = '#ffffff', k = 2.4) => { const m = new THREE.Mesh(SPH, energyMat(col, core, 0, k)); m.scale.setScalar(r); m.renderOrder = 6; S().add(m); return m; };
  const kill = m => { if (!m) return; S().remove(m); m.traverse(o => { if (o.material) o.material.dispose(); }); };
  const vic = a => 1 - a, vx = a => { const s = X.FT[1 - a]; return s ? s.A.R.x : X.homeX(1 - a); };
  const src2 = a => X.hand(a, 'R').add(X.hand(a, 'L', t2)).multiplyScalar(.5).add(t1.set(X.dir(a) * .12, 0, 0));
  const srcR = a => X.hand(a, 'R').add(t1.set(X.dir(a) * .12, 0, 0));
  function beamMesh(col, core = '#ffffff') {
    const o = new THREE.Mesh(CYL, energyMat(col, core, 1, 1.5)), i = new THREE.Mesh(CYL, energyMat(core, '#ffffff', 1, 1.6)); i.scale.set(.38, .38, 1); o.add(i); o.renderOrder = i.renderOrder = 6; S().add(o);
    return { o, set(a, b, w) { o.position.copy(a); o.lookAt(b); o.scale.set(w, w, Math.max(.001, a.distanceTo(b))); }, t(dt) { o.material.uniforms.t.value += dt; i.material.uniforms.t.value += dt; }, op(v) { o.material.uniforms.op.value = v; i.material.uniforms.op.value = v; }, kill() { kill(o); } };
  }
  const impact = (d, C, big = 1) => { const p = X.chest(d); fx().sprite(p, 2 * big, C, .4, { k: 1.7 }); fx().sprite(p, .9 * big, '#ffffff', .18, { k: 1.4 }); fx().ring(p, 2.6 * big, C, .4); fx().glow(p, 50 * big, C, { max: 8 * big, l1: .7 }); fx().spark(p, 24, C, { max: 14 }); X.shake(.4 * big); };
  const fire = (a, pose, hold = .4) => { X.busy(a, hold + .6); X.expr(a, 'a', hold + .5); X.play(a, pose); X.setActor(a); };
  const back = (a, sec) => X.later(sec, () => X.home(a));

  // ---- rayo de energía (Kamehameha, Final Flash…) ----
  function beam(a, big, C, core = '#ffffff') {
    const d = vic(a); fire(a, [['beamCharge', .14, 'out', .16], ['beamFire', .06, 'snap', .55]], 1); X.shot('side', a, 1200);
    const o = orb(.05, C, core); fx().anim(.3, (k, dt) => { o.position.copy(src2(a)); o.scale.setScalar(.05 + .3 * k * (big ? 1.3 : 1)); o.material.uniforms.t.value += dt; }, () => kill(o));
    const s0 = src2(a); fx().glow(s0, 30, C, { to: s0.clone(), pull: 10, sx: 1.2, sy: 1.2, sz: 1.2, max: .1, l0: .3, l1: .4 });
    X.later(.3, () => { const B = beamMesh(C, core), w = big ? .3 : .22; fx().sprite(src2(a), 1.1, C, .7, { g0: 1, g1: .2, k: 1.6 }); X.shake(.3); X.kick(2);
      fx().anim(.8, (k, dt) => { const a0 = src2(a), tg = X.chest(d), ext = Math.min(1, k / .15), b = a0.clone().lerp(tg, ext);
        B.set(a0, b, w * (k < .78 ? 1 : Math.max(.02, 1 - (k - .78) / .22)) * (1 + .07 * Math.sin(k * 90))); B.t(dt);
        if (ext >= 1 && Math.random() < .7) { fx().spark(tg, 3, C, { max: 11 }); if (Math.random() < .25) fx().sprite(tg, 1.3, C, .12, { k: 1.5 }); } }, () => B.kill()); });
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
  function cut(d, C) { const c = X.chest(d), an = rr(-1.3, 1.3), L = rr(1, 1.6); fx().bolt(c.clone().add(t1.set(Math.cos(an) * -L, Math.sin(an) * -L, rr(-.2, .2))), c.clone().add(t2.set(Math.cos(an) * L, Math.sin(an) * L, rr(-.2, .2))), C, .22, { disp: 0, w: .06, k: 3 }); }
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
  // ---- choque de técnicas ----
  let CL = null;
  function clash() {
    const s0 = X.FT[0], s1 = X.FT[1]; if (!s0 || !s1) return;
    for (const p of [0, 1]) { X.play(p, [['beamFire', .12, 'snap']], true); X.busy(p, 5); X.expr(p, 'a', 5); }
    const c0 = X.colOf(0), c1 = X.colOf(1), b0 = beamMesh(c0), b1 = beamMesh(c1), ball = orb(.5, '#ffffff', '#ffffff', 2); X.shot('wide', 0, 4500);
    CL = { x: .5, tx: .5, done: false };
    CL.an = fx().anim(30, (k, dt) => { if (!CL || CL.done) return; CL.x += (CL.tx - CL.x) * Math.min(1, dt * 8);
      const h0 = src2(0).clone(), h1 = src2(1).clone(), m = h0.clone().lerp(h1, CL.x); b0.set(h0, m, .32 * (1 + .1 * Math.sin(k * 900))); b1.set(h1, m, .32 * (1 + .1 * Math.cos(k * 800))); b0.t(dt); b1.t(dt);
      ball.position.copy(m); ball.scale.setScalar(.55 + .12 * Math.sin(k * 700)); ball.material.uniforms.t.value += dt;
      if (Math.random() < .8) fx().spark(m, 3, Math.random() < .5 ? c0 : c1, { max: 10, life: .35 }); if (Math.random() < dt * 14) fx().bolt(m, m.clone().add(t1.set(rr(-1.6, 1.6), rr(-1.2, 1.2), rr(-1, 1))), Math.random() < .5 ? c0 : c1, .12, { w: .05 });
      if (Math.random() < dt * 6) X.shake(.08); }, () => { b0.kill(); b1.kill(); kill(ball); });
  }
  function clashEnd(l) { if (!CL) return; CL.done = true; CL.an.t = CL.an.d; CL = null; for (const p of [0, 1]) { const s = X.FT[p]; if (s && !s.dead) X.play(p, [[s.A.base, .3, 'io']]); } }
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
    switch (ar.ar) {
      case 'purple': return purple(a); case 'sky': return sky(a, big, C); case 'vortex': return vortex(a, big, C, ar.v); case 'sphere': return sphere(a, big, C, ar.v);
      case 'bflash': return bflash(a); case 'shock': return shock(a, big, C, ar.v); case 'slash': return slash(a, big, C, ar.v); case 'lightning': return lightning(a, big, C, ar.v);
      case 'fire': return fireT(a, big, C, ar.v); case 'water': return water(a, big, C, ar.v); case 'barrage': return barrage(a, big, C, o, name); case 'swarm': return swarm(a, big, C, ar.v);
      default: return beam(a, big, C);
    }
  }
  return { run, beam: (a, big, col) => beam(a, big, col || X.colOf(a)), clash, clashX: x => { if (CL) CL.tx = Math.max(.06, Math.min(.94, x)); }, clashEnd, cut, shield, meteor, stomp, clone, shades, shadeHit };
}
