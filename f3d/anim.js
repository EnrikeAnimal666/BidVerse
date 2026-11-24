/* BidVerse 3D · ANIMACIÓN: poses clave y un reproductor que las encadena con suavizado, más el movimiento del cuerpo entero
   (dash, retroceso, saltos, caer al suelo) y capas automáticas (respiración, rebote de guardia, capa y cola que se mecen).
   Convenciones (el modelo mira a +z, L = su izquierda = +x): brazo/pierna hacia delante = x negativo · codo/rodilla doblados = x −/+ ·
   inclinar el tronco hacia delante = x positivo · girar el pecho hacia su izquierda = y positivo · abrir brazo izquierdo = z positivo. */
export const JK = ['body', 'spine', 'chest', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'hdL', 'hdR', 'hpL', 'hpR', 'knL', 'knR', 'ftL', 'ftR'];
const NJ = JK.length, NV = NJ * 3 + 2; // + altura de cadera (hy) y adelanto (bz)
const P = {
  rest: { shL: [0, 0, .12], shR: [0, 0, -.12] },
  stance: { hy: -.1, body: [0, -.15, 0], spine: [.1, 0, 0], chest: [0, -.3, 0], head: [.1, .38, 0], shL: [-1, 0, .25], elL: [-1.7, 0, 0], shR: [-.7, 0, -.3], elR: [-1.95, 0, 0], hdL: [.2, 0, 0], hdR: [.2, 0, 0],
    hpL: [-.5, 0, .1], knL: [.9, 0, 0], ftL: [-.4, 0, 0], hpR: [.3, 0, -.12], knR: [.4, 0, 0], ftR: [-.7, 0, 0] },
  stanceW: { hy: -.12, body: [0, -.2, 0], spine: [.12, 0, 0], chest: [0, -.2, 0], head: [.1, .3, 0], shR: [-.85, 0, -.12], elR: [-.7, 0, 0], hdR: [.5, 0, 0], shL: [-.8, 0, -.3], elL: [-.95, 0, 0],
    hpL: [-.5, 0, .1], knL: [.9, 0, 0], ftL: [-.4, 0, 0], hpR: [.3, 0, -.12], knR: [.4, 0, 0], ftR: [-.7, 0, 0] },
  dash: { hy: -.14, spine: [.6, 0, 0], head: [-.35, 0, 0], shR: [.95, 0, -.25], elR: [-.4, 0, 0], shL: [.95, 0, .25], elL: [-.4, 0, 0], hpL: [-.9, 0, 0], knL: [1.2, 0, 0], ftL: [-.2, 0, 0], hpR: [.5, 0, 0], knR: [.9, 0, 0] },
  jabR: { hy: -.12, bz: .06, body: [0, .25, 0], spine: [.2, 0, 0], chest: [0, .5, 0], head: [0, -.5, 0], shR: [-1.55, 0, -.05], elR: [-.05, 0, 0], shL: [-.9, 0, .3], elL: [-1.8, 0, 0],
    hpL: [-.7, 0, .1], knL: [.65, 0, 0], ftL: [.05, 0, 0], hpR: [.5, 0, -.1], knR: [.15, 0, 0], ftR: [-.6, 0, 0] },
  hookR: { hy: -.14, body: [0, .35, 0], spine: [.15, 0, 0], chest: [0, .8, 0], head: [0, -.7, 0], shR: [-.45, 0, -1.4], elR: [-1.6, 0, 0], shL: [-.9, 0, .3], elL: [-1.8, 0, 0],
    hpL: [-.6, 0, .15], knL: [.8, 0, 0], ftL: [-.2, 0, 0], hpR: [.4, 0, -.15], knR: [.35, 0, 0], ftR: [-.7, 0, 0] },
  upperR: { hy: -.02, spine: [-.25, 0, 0], chest: [-.1, .4, 0], head: [-.3, -.3, 0], shR: [-2.4, 0, -.2], elR: [-1.1, 0, 0], shL: [-.8, 0, .4], elL: [-1.6, 0, 0], hpL: [-.4, 0, .1], knL: [.4, 0, 0], hpR: [.3, 0, -.1], knR: [.2, 0, 0], ftR: [-.4, 0, 0] },
  kickR: { hy: -.04, body: [0, -.3, 0], spine: [-.35, 0, 0], chest: [0, -.2, 0], head: [.25, .4, 0], shL: [-.6, 0, .9], elL: [-1, 0, 0], shR: [.3, 0, -.6], elR: [-1.2, 0, 0],
    hpR: [-1.65, 0, -.25], knR: [.12, 0, 0], ftR: [.5, 0, 0], hpL: [.12, 0, .05], knL: [.3, 0, 0], ftL: [-.35, 0, 0] },
  kneeR: { hy: -.02, spine: [.3, 0, 0], head: [-.1, 0, 0], shL: [-1.2, 0, .1], elL: [-1.3, 0, 0], shR: [-1.2, 0, -.1], elR: [-1.3, 0, 0], hpR: [-1.8, 0, 0], knR: [2.1, 0, 0], ftR: [.5, 0, 0], hpL: [.15, 0, 0], knL: [.2, 0, 0] },
  slashA: { hy: -.08, spine: [-.15, 0, 0], chest: [0, .2, 0], head: [.15, -.2, 0], shR: [-2.7, 0, -.35], elR: [-.55, 0, 0], shL: [-2.5, 0, .35], elL: [-.65, 0, 0], hpL: [-.5, 0, .1], knL: [.7, 0, 0], hpR: [.35, 0, -.1], knR: [.4, 0, 0], ftR: [-.6, 0, 0] },
  slashB: { hy: -.2, bz: .08, spine: [.45, 0, 0], chest: [0, -.25, 0], head: [-.25, .2, 0], shR: [-.45, 0, .1], elR: [-.1, 0, 0], shL: [-.5, 0, -.25], elL: [-.3, 0, 0], hdR: [.6, 0, 0], hpL: [-.9, 0, .1], knL: [.9, 0, 0], ftL: [-.1, 0, 0], hpR: [.6, 0, -.1], knR: [.25, 0, 0], ftR: [-.8, 0, 0] },
  slashH1: { hy: -.12, chest: [0, -.8, 0], head: [0, .7, 0], shR: [-1.2, 0, -1.35], elR: [-.3, 0, 0], shL: [-.6, 0, .4], elL: [-1.2, 0, 0], hpL: [-.5, 0, .1], knL: [.8, 0, 0], hpR: [.35, 0, -.1], knR: [.4, 0, 0] },
  slashH2: { hy: -.16, bz: .06, spine: [.2, 0, 0], chest: [0, .9, 0], head: [0, -.8, 0], shR: [-1.45, 0, .7], elR: [-.15, 0, 0], shL: [-.4, 0, .7], elL: [-.9, 0, 0], hpL: [-.8, 0, .1], knL: [.8, 0, 0], hpR: [.55, 0, -.1], knR: [.2, 0, 0], ftR: [-.6, 0, 0] },
  beamCharge: { hy: -.2, body: [0, -.3, 0], spine: [.2, 0, 0], chest: [0, -.8, 0], head: [.1, .9, 0], shR: [.35, 0, -.25], elR: [-1.4, 0, 0], shL: [-.3, 0, -.55], elL: [-1.3, 0, 0],
    hpL: [-.4, 0, .3], knL: [.75, 0, 0], ftL: [-.3, 0, 0], hpR: [.3, 0, -.3], knR: [.55, 0, 0], ftR: [-.7, 0, 0] },
  beamFire: { hy: -.22, bz: .05, spine: [.15, 0, 0], head: [.1, 0, 0], shR: [-1.5, 0, .14], elR: [-.05, 0, 0], shL: [-1.5, 0, -.14], elL: [-.05, 0, 0], hdR: [-.9, 0, 0], hdL: [-.9, 0, 0],
    hpL: [-.6, 0, .3], knL: [.8, 0, 0], ftL: [-.2, 0, 0], hpR: [.45, 0, -.3], knR: [.35, 0, 0], ftR: [-.8, 0, 0] },
  cast: { hy: -.12, spine: [.1, 0, 0], chest: [0, .4, 0], head: [0, -.4, 0], shR: [-1.55, 0, -.1], elR: [-.1, 0, 0], hdR: [-1.1, 0, 0], shL: [-.2, 0, .45], elL: [-.6, 0, 0],
    hpL: [-.5, 0, .1], knL: [.7, 0, 0], hpR: [.35, 0, -.12], knR: [.35, 0, 0], ftR: [-.7, 0, 0] },
  raise: { hy: -.06, spine: [-.2, 0, 0], head: [-.45, 0, 0], shR: [-3, 0, -.3], elR: [-.2, 0, 0], shL: [-3, 0, .3], elL: [-.2, 0, 0], hpL: [0, 0, .25], knL: [.3, 0, 0], hpR: [0, 0, -.25], knR: [.3, 0, 0] },
  throw: { hy: -.16, bz: .06, spine: [.4, 0, 0], head: [-.2, 0, 0], shR: [-1.25, 0, -.1], elR: [-.1, 0, 0], shL: [-1.25, 0, .1], elL: [-.1, 0, 0], hpL: [-.7, 0, .15], knL: [.8, 0, 0], hpR: [.45, 0, -.15], knR: [.3, 0, 0] },
  power: { hy: -.22, spine: [-.15, 0, 0], chest: [-.22, 0, 0], head: [-.4, 0, 0], shR: [.25, 0, -.6], elR: [-.55, 0, 0], shL: [.25, 0, .6], elL: [-.55, 0, 0], hdR: [.3, 0, 0], hdL: [.3, 0, 0],
    hpL: [0, 0, .38], knL: [.6, 0, 0], ftL: [-.3, 0, 0], hpR: [0, 0, -.38], knR: [.6, 0, 0], ftR: [-.3, 0, 0] },
  hitL: { hy: -.06, bz: -.05, spine: [-.35, 0, 0], chest: [-.2, 0, 0], head: [-.55, .2, .15], shR: [-.5, 0, -.65], elR: [-.6, 0, 0], shL: [-.5, 0, .65], elL: [-.6, 0, 0], hpL: [-.2, 0, .1], knL: [.4, 0, 0], hpR: [.25, 0, -.1], knR: [.3, 0, 0] },
  hitB: { hy: -.16, spine: [.6, 0, 0], chest: [.35, 0, 0], head: [.3, 0, 0], shR: [-.75, 0, -.2], elR: [-1.35, 0, 0], shL: [-.75, 0, .2], elL: [-1.35, 0, 0], hpL: [-.35, 0, .1], knL: [.7, 0, 0], hpR: [.1, 0, -.1], knR: [.6, 0, 0] },
  fly: { hy: 0, spine: [-.6, 0, 0], head: [-.6, 0, 0], shR: [-2.6, 0, -.8], elR: [-.4, 0, 0], shL: [-2.6, 0, .8], elL: [-.4, 0, 0], hpR: [-.6, 0, 0], knR: [.9, 0, 0], hpL: [-.3, 0, 0], knL: [.5, 0, 0] },
  down: { hy: 0, head: [-.2, .4, 0], shL: [-.2, 0, 1.3], elL: [-.3, 0, 0], shR: [-.2, 0, -1.2], elR: [-.4, 0, 0], hpL: [-.15, 0, .15], knL: [.3, 0, 0], hpR: [-.1, 0, -.1], knR: [.15, 0, 0] },
  dodgeB: { hy: -.14, bz: -.06, spine: [-.5, 0, 0], head: [-.15, .3, 0], shL: [-1, 0, .3], elL: [-1.7, 0, 0], shR: [-.8, 0, -.3], elR: [-1.9, 0, 0], hpL: [-.2, 0, .1], knL: [.5, 0, 0], hpR: [.4, 0, -.1], knR: [.6, 0, 0] },
  dodgeS: { hy: -.3, spine: [.2, 0, .3], chest: [0, 0, .15], head: [0, .3, -.3], shL: [-1, 0, .3], elL: [-1.7, 0, 0], shR: [-.8, 0, -.3], elR: [-1.9, 0, 0], hpL: [-.5, 0, .3], knL: [1.1, 0, 0], ftL: [-.6, 0, 0], hpR: [-.1, 0, -.35], knR: [1, 0, 0], ftR: [-.9, 0, 0] },
  guard: { hy: -.14, head: [.25, 0, 0], shR: [-1.55, 0, .55], elR: [-1.5, 0, 0], shL: [-1.55, 0, -.55], elL: [-1.5, 0, 0], hpL: [-.45, 0, .12], knL: [.8, 0, 0], hpR: [.3, 0, -.12], knR: [.5, 0, 0] },
  victory: { hy: 0, chest: [-.05, .15, 0], head: [-.15, -.1, 0], shR: [-3.05, 0, -.2], elR: [-.1, 0, 0], shL: [.2, 0, .55], elL: [-1, 0, 0], hpL: [0, 0, .12], hpR: [0, 0, -.12], knL: [.05, 0, 0] },
  cocky: { hy: 0, head: [-.1, .15, 0], shR: [-1.3, 0, .75], elR: [-1.95, 0, 0], shL: [-1.3, 0, -.75], elL: [-1.95, 0, 0], hpL: [0, 0, .14], hpR: [0, 0, -.14] },
  land: { hy: -.55, spine: [.6, 0, 0], head: [-.35, 0, 0], shR: [-.95, 0, -.25], elR: [0, 0, 0], shL: [.6, 0, .6], elL: [-.4, 0, 0], hpL: [-1.4, 0, .2], knL: [2.1, 0, 0], ftL: [-.7, 0, 0], hpR: [.35, 0, -.2], knR: [1.5, 0, 0], ftR: [-1.1, 0, 0] },
  airborne: { hy: 0, spine: [.1, 0, 0], head: [.2, 0, 0], shR: [-.4, 0, -.6], elR: [-.5, 0, 0], shL: [-.4, 0, .6], elL: [-.5, 0, 0], hpL: [-.9, 0, 0], knL: [1.5, 0, 0], hpR: [-.4, 0, 0], knR: [1.2, 0, 0] },
};
const vecOf = o => { const v = new Float32Array(NV); JK.forEach((k, i) => { const r = o[k]; if (r) { v[i * 3] = r[0]; v[i * 3 + 1] = r[1]; v[i * 3 + 2] = r[2]; } }); v[NJ * 3] = o.hy || 0; v[NJ * 3 + 1] = o.bz || 0; return v; };
const mirrorO = o => { const m = {}; for (const k in o) { const r = o[k]; if (!Array.isArray(r)) { m[k] = r; continue; } const k2 = k.endsWith('L') ? k.slice(0, -1) + 'R' : k.endsWith('R') ? k.slice(0, -1) + 'L' : k; m[k2] = [r[0], -r[1], -r[2]]; } return m; };
export const POSE = {};
for (const k in P) { POSE[k] = vecOf(P[k]); POSE[k + '_m'] = vecOf(mirrorO(P[k])); }
export const EASE = { lin: t => t, out: t => 1 - Math.pow(1 - t, 3), in: t => t * t * t, io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, snap: t => 1 - Math.pow(1 - t, 5) };

export class Anim {
  constructor(F, side) {
    this.F = F; this.side = side; this.cur = new Float32Array(POSE.stance); this.from = new Float32Array(NV); this.to = null; this.t = 0; this.d = 0; this.e = EASE.io; this.hold = 0;
    this.q = []; this.base = F.armed || F.pole ? 'stanceW' : 'stance'; this.idle = 1; this.T = Math.random() * 10; this.onEnd = null;
    this.R = { x: 0, y: 0, z: 0, rx: 0, rz: 0, tw: null, vx: 0 }; this.yawOff = 0; this.yawT = 0; this.capeA = .12; this.frozen = false; this.lastX = 0;
  }
  // seq: [[pose, segundos, suavizado, espera], …]. Al acabar vuelve a la guardia (salvo keep: se queda en la última pose).
  play(seq, keep) { this.q = seq.map(s => ({ p: typeof s[0] === 'string' ? POSE[s[0]] || POSE.stance : s[0], d: Math.max(.001, s[1]), e: EASE[s[2]] || EASE.io, h: s[3] || 0 })); this.keep = !!keep; this.next(); }
  next() { const s = this.q.shift(); if (!s) { this.to = null; return; } this.from.set(this.cur); this.to = s.p; this.t = 0; this.d = s.d; this.e = s.e; this.hold = s.h; }
  setBase(b) { this.base = b; }
  // movimiento del cuerpo entero (posición en el mundo, salto en arco y giro para tumbarse)
  move(o) { const R = this.R; R.tw = { x0: R.x, y0: R.y, z0: R.z, rx0: R.rx, rz0: R.rz, x: o.x ?? R.x, y: o.y ?? 0, z: o.z ?? R.z, rx: o.rx ?? R.rx, rz: o.rz ?? R.rz, d: Math.max(.001, o.d || .3), t: 0, e: EASE[o.e] || EASE.io, arc: o.arc || 0 }; }
  update(dt) {
    if (this.frozen) dt = 0;
    this.T += dt;
    if (this.to) {
      this.t += dt;
      const k = this.e(Math.min(1, this.t / this.d)), a = this.from, b = this.to, c = this.cur;
      for (let i = 0; i < NV; i++) c[i] = a[i] + (b[i] - a[i]) * k;
      if (this.t >= this.d + this.hold) {
        if (this.q.length) this.next();
        else if (!this.keep && this.to !== POSE[this.base]) { this.q = [{ p: POSE[this.base], d: .28, e: EASE.io, h: 0 }]; this.next(); }
        else this.to = null;
      }
    }
    const resting = !this.to || (this.to === POSE[this.base]);
    const iw = resting && !this.keep ? 1 : 0; this.idle += (iw - this.idle) * Math.min(1, dt * (iw ? 3 : 14));
    const R = this.R;
    if (R.tw) { const w = R.tw; w.t += dt; const k = w.e(Math.min(1, w.t / w.d)), u = Math.min(1, w.t / w.d);
      R.x = w.x0 + (w.x - w.x0) * k; R.z = w.z0 + (w.z - w.z0) * k; R.y = w.y0 + (w.y - w.y0) * k + Math.sin(u * Math.PI) * w.arc; R.rx = w.rx0 + (w.rx - w.rx0) * k; R.rz = w.rz0 + (w.rz - w.rz0) * k;
      if (u >= 1) R.tw = null; }
    R.vx = dt > 0 ? (R.x - this.lastX) / dt : 0; this.lastX = R.x;
    this.apply(dt);
  }
  apply(dt) {
    const F = this.F, J = F.J, c = this.cur, T = this.T, w = this.idle;
    const br = Math.sin(T * 2.3), bob = Math.abs(Math.sin(T * 3.1));
    for (let i = 0; i < JK.length; i++) { const j = J[JK[i]]; if (j) j.rotation.set(c[i * 3], c[i * 3 + 1], c[i * 3 + 2]); }
    J.chest.rotation.x += br * .035 * w; J.head.rotation.x -= br * .02 * w;
    J.shL.rotation.z += br * .03 * w; J.shR.rotation.z -= br * .03 * w;
    J.body.position.y = (F.hipY || .92) + c[NJ * 3] - bob * .03 * w; J.body.position.z = c[NJ * 3 + 1];
    J.knL.rotation.x += bob * .12 * w; J.knR.rotation.x += bob * .1 * w; J.hpL.rotation.x -= bob * .06 * w; J.hpR.rotation.x -= bob * .05 * w;
    // capa y faldón: se levantan con la velocidad y se mecen
    const sp = Math.min(1, Math.abs(this.R.vx) / 14), tgt = .12 + sp * 1.1 + Math.sin(T * 5.3) * .04 + (this.R.y > .2 ? .4 : 0);
    this.capeA += (tgt - this.capeA) * Math.min(1, (dt || 0) * 8);
    if (F.cape) F.cape.rotation.x = this.capeA - c[3] * .5;
    if (F.coat) F.coat.rotation.x = -this.capeA * .25 + .05 - c[3] * .3;
    F.tails.forEach((t, i) => { t.rotation.z = Math.sin(T * 2.4 - i * .7) * .25; });
    F.kag.forEach((t, i) => { t.rotation.y = Math.sin(T * 1.7 + i) * .25; });
    if (F.extra.wheel) F.extra.wheel.rotation.y += (dt || 0) * (F.wheelSpin || .3);
  }
}
