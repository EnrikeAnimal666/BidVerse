// Personajes estilo película de animación (tipo Pixar): proporciones humanas algo estilizadas,
// cara con mandíbula, mejillas, nariz y orejas, ojos expresivos con párpados, manos de cinco dedos.
// Rig jerárquico: root > hips > (torso > (head, shoulders > elbows > hands > dedos), legs > knees > feet).
// Escala real: ~1,72 m de pie.
import * as THREE from 'three';

const geoCache = new Map();
const G = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
const sph = (r, ws = 40, hs = 28) => G(`s${r}|${ws}`, () => new THREE.SphereGeometry(r, ws, hs));
const cap = (r, l, rs = 24) => G(`c${r}|${l}|${rs}`, () => new THREE.CapsuleGeometry(r, l, 10, rs));
const tor = (r, t, arc = Math.PI * 2) => G(`t${r}|${t}|${arc}`, () => new THREE.TorusGeometry(r, t, 12, 40, arc));

export function mats(o) {
  const skinC = new THREE.Color(o.skin);
  const skin = new THREE.MeshPhysicalMaterial({ color: skinC, roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color('#ff9f8a'), sheenRoughness: 0.5, clearcoat: 0.06, clearcoatRoughness: 0.6 });
  const skinDark = new THREE.MeshPhysicalMaterial({ color: skinC.clone().multiplyScalar(0.86).offsetHSL(0.0, 0.06, 0), roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#ff9f8a') });
  const lipM = new THREE.MeshPhysicalMaterial({ color: skinC.clone().lerp(new THREE.Color('#c0565a'), 0.45), roughness: 0.4, clearcoat: 0.2 });
  const hair = new THREE.MeshPhysicalMaterial({ color: o.hair, roughness: 0.42, sheen: 1, sheenColor: new THREE.Color(o.hair).lerp(new THREE.Color('#ffffff'), 0.35), sheenRoughness: 0.35, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  const fabric = (c, s = 0.8) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.88, sheen: s, sheenColor: new THREE.Color(c).lerp(new THREE.Color('#ffffff'), 0.45), sheenRoughness: 0.7 });
  const top = fabric(o.top), top2 = fabric(o.top2 || o.top);
  const pants = new THREE.MeshPhysicalMaterial({ color: o.pants, roughness: 0.8, sheen: 0.5, sheenColor: new THREE.Color('#9fb6ff'), sheenRoughness: 0.6 });
  const shoe = new THREE.MeshPhysicalMaterial({ color: o.shoe || '#f4f1ea', roughness: 0.45, clearcoat: 0.15 });
  const sole = new THREE.MeshPhysicalMaterial({ color: o.sole || '#e6463c', roughness: 0.6 });
  const white = new THREE.MeshPhysicalMaterial({ color: '#f7f4ee', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
  const iris = new THREE.MeshPhysicalMaterial({ color: o.eye || '#3b2416', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
  const pupil = new THREE.MeshPhysicalMaterial({ color: '#070504', roughness: 0.1, clearcoat: 1 });
  const glint = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.86, 0.86, 0.86), toneMapped: false });
  const mouth = new THREE.MeshPhysicalMaterial({ color: '#4a1418', roughness: 0.6 });
  const tongue = new THREE.MeshPhysicalMaterial({ color: '#d75f66', roughness: 0.45, clearcoat: 0.4 });
  const teeth = new THREE.MeshPhysicalMaterial({ color: '#fbfaf6', roughness: 0.3, clearcoat: 0.3 });
  const blush = new THREE.MeshStandardMaterial({ color: '#ff7a6e', roughness: 0.8, transparent: true, opacity: 0.16, depthWrite: false });
  const cord = new THREE.MeshPhysicalMaterial({ color: '#f5f0e6', roughness: 0.6 });
  const brow = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(o.hair).multiplyScalar(0.8), roughness: 0.6 });
  return { skin, skinDark, lipM, hair, top, top2, pants, shoe, sole, white, iris, pupil, glint, mouth, tongue, teeth, blush, cord, brow };
}

function M(geo, mat, parent, pos = [0, 0, 0], scale, rot) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (scale) Array.isArray(scale) ? m.scale.set(...scale) : m.scale.setScalar(scale);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
const grp = (parent, pos = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };

const HC = [0, 0.135, 0.0];          // centro del cráneo (local de la cabeza)
const SK = [0.104, 0.122, 0.112];    // radios del cráneo
const HEAD_SCALE = 1.28;            // cabeza algo grande, estilo animación

/** o: {skin, hair, top, top2, pants, shoe, sole, eye, hairStyle:'swoop'|'curly', seed} */
export function makeToy(o) {
  const m = mats(o);
  const root = new THREE.Group();
  const hips = grp(root, [0, 0.86, 0]);
  const R = { root, hips, m, o };

  // ---------- pelvis y piernas ----------
  M(sph(0.145), m.pants, hips, [0, 0.0, 0], [1.03, 0.72, 0.8]);
  R.leg = [1, -1].map(s => {
    const hip = grp(hips, [0.084 * s, -0.04, 0]);
    M(cap(0.066, 0.27), m.pants, hip, [0, -0.19, 0], [1, 1, 0.95]);
    const knee = grp(hip, [0, -0.4, 0]);
    M(sph(0.057), m.pants, knee, [0, 0, 0.005]);
    M(cap(0.052, 0.28), m.pants, knee, [0, -0.175, 0]);
    M(tor(0.052, 0.013), m.pants, knee, [0, -0.33, 0], 1, [Math.PI / 2, 0, 0]);
    M(cap(0.034, 0.04), m.skin, knee, [0, -0.36, 0]); // tobillo
    const foot = grp(knee, [0, -0.39, 0]);
    M(sph(0.058), m.shoe, foot, [0, -0.012, 0.045], [0.82, 0.62, 1.85]);
    M(sph(0.058), m.shoe, foot, [0, 0.012, -0.005], [0.78, 0.75, 0.95]);
    M(sph(0.06), m.sole, foot, [0, -0.04, 0.045], [0.86, 0.26, 1.9]);
    M(sph(0.02), m.sole, foot, [0.045 * s, -0.004, 0.04], [0.25, 0.6, 2.2]); // franja lateral
    M(cap(0.006, 0.05), m.cord, foot, [0, 0.022, 0.07], 1, [1.2, 0, Math.PI / 2]); // cordones
    return { hip, knee, foot };
  });

  // ---------- torso (sudadera) ----------
  const torso = grp(hips, [0, 0.04, 0]);
  R.torso = torso;
  M(cap(0.13, 0.1), m.top, torso, [0, 0.11, 0], [1.08, 1, 0.78]);
  M(cap(0.138, 0.09), m.top, torso, [0, 0.27, 0], [1.12, 1, 0.74]);
  [1, -1].forEach(s => M(sph(0.072), m.top, torso, [0.148 * s, 0.385, 0], [1, 0.85, 0.95]));
  M(tor(0.133, 0.024), m.top2, torso, [0, 0.025, 0], [1.08, 0.82, 1], [Math.PI / 2, 0, 0]);
  M(cap(0.035, 0.11, 16), m.top2, torso, [0, 0.11, 0.103], [1, 1, 0.32], [0, 0, Math.PI / 2]); // bolsillo
  M(tor(0.068, 0.038), m.top2, torso, [0, 0.44, -0.03], [1.2, 1, 1], [Math.PI / 2.4, 0, 0]); // capucha
  R.cords = [1, -1].map(s => M(cap(0.0055, 0.07, 8), m.cord, torso, [0.028 * s, 0.35, 0.108], 1, [0.18, 0, 0.05 * s]));
  M(G('neck', () => new THREE.CylinderGeometry(0.04, 0.045, 0.1, 20)), m.skin, torso, [0, 0.47, 0.005]);

  // ---------- cabeza ----------
  const head = grp(torso, [0, 0.5, 0.008]);
  head.scale.setScalar(HEAD_SCALE);
  R.head = head;
  M(sph(1, 64, 48), m.skin, head, HC, SK);                                   // cráneo
  M(sph(0.09, 48, 32), m.skin, head, [0, 0.088, 0.012], [1.0, 0.92, 0.97]);   // mandíbula (se funde con el cráneo)
  M(sph(0.03, 32, 24), m.skin, head, [0, 0.03, 0.058], [1.15, 0.85, 1.0]);     // barbilla
  R.blush = [1, -1].map(s => M(sph(0.022), m.blush, head, [0.06 * s, 0.098, 0.085], [1, 0.62, 0.25], [0.1, 0.55 * s, 0]));
  [1, -1].forEach(s => {
    M(sph(0.03), m.skin, head, [0.103 * s, 0.128, -0.002], [0.42, 1, 0.72]);
    M(sph(0.016), m.skinDark, head, [0.112 * s, 0.128, 0.004], [0.35, 0.75, 0.55]);
  });
  M(cap(0.012, 0.03, 16), m.skin, head, [0, 0.142, 0.103], 1, [0.35, 0, 0]); // puente de la nariz
  M(sph(0.022, 32, 24), m.skinDark, head, [0, 0.117, 0.118], [0.95, 0.85, 1.05]); // punta de la nariz
  [1, -1].forEach(s => M(sph(0.011), m.skinDark, head, [0.014 * s, 0.11, 0.11]));   // aletas

  // ojos
  R.eyes = [1, -1].map(s => {
    const socket = grp(head, [0.045 * s, 0.153, 0.082]);
    socket.rotation.y = 0.2 * s;
    const ball = grp(socket, [0, 0, 0]);
    M(sph(0.031), m.white, ball, [0, 0, 0], [1, 1.06, 0.9]);
    M(sph(0.0205), m.iris, ball, [0, 0, 0.0178], [1, 1.04, 0.55]);
    M(sph(0.0112), m.pupil, ball, [0, 0, 0.0238], [1, 1.04, 0.45]);
    M(sph(0.005, 16, 12), m.glint, ball, [0.0078, 0.009, 0.0285]);
    M(sph(0.0024, 12, 8), m.glint, ball, [-0.006, -0.0072, 0.0285]);
    const lid = grp(socket, [0, 0, 0]);
    M(G('lid', () => new THREE.SphereGeometry(0.0335, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2)), m.skin, lid, [0, 0, 0], [1.04, 1.07, 0.97]);
    M(tor(0.0326, 0.0026, Math.PI), m.pupil, lid, [0, 0, 0], [1.04, 1, 0.97], [Math.PI / 2, 0, 0]); // pestañas
    const lidLow = grp(socket, [0, 0, 0]);
    M(G('lidl', () => new THREE.SphereGeometry(0.0328, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), m.skin, lidLow, [0, 0, 0], [1.03, 1.06, 0.96]);
    const brow = grp(head, [0.046 * s, 0.2, 0.1]);
    brow.rotation.y = 0.2 * s;
    M(cap(0.0085, 0.036, 12), m.brow, brow, [0, 0, 0], [1, 1, 0.7], [0, 0, Math.PI / 2]);
    return { socket, ball, lid, lidLow, brow, s };
  });

  // boca
  const mouth = grp(head, [0, 0.07, 0.1]);
  mouth.rotation.x = 0.32;
  R.mouth = mouth;
  R.smile = M(tor(0.025, 0.0045, Math.PI), m.lipM, mouth, [0, 0.006, 0], 1, [0, 0, Math.PI]);
  const open = grp(mouth, [0, 0, 0]);
  R.open = open;
  M(sph(0.027), m.mouth, open, [0, 0, -0.004], [1, 1, 0.45]);
  M(tor(0.025, 0.0045), m.lipM, open, [0, 0, 0.002], [1.02, 1, 1]);
  R.tongue = M(sph(0.016), m.tongue, open, [0, -0.012, 0.0], [1.2, 0.6, 0.5]);
  R.teeth = M(sph(0.021), m.teeth, open, [0, 0.017, -0.001], [0.9, 0.3, 0.42]);

  // ---------- pelo ----------
  const hairG = grp(head, [0, 0, 0]);
  R.hairG = hairG;
  const rnd = (() => { let s = o.seed || 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const UP = new THREE.Vector3(0, 1, 0);
  const dir = (th, ph) => new THREE.Vector3(Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th));
  const onSkull = (n, lift = 0) => n.clone().multiply(new THREE.Vector3(...SK)).multiplyScalar(1 + lift).add(new THREE.Vector3(...HC));
  const chunk = (th, ph, sx, sy, sz, sweep = 0, lift = 0.02, tiltF = 0) => {
    const n = dir(th, ph), p = onSkull(n, lift);
    const mm = M(sph(1, 36, 22), m.hair, hairG, [p.x, p.y, p.z], [sx, sy, sz]);
    mm.quaternion.setFromUnitVectors(UP, n); mm.rotateY(sweep); mm.rotateX(tiltF);
    return mm;
  };
  const capG = G('hcap', () => new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5));
  if (o.hairStyle === 'curly') {
    M(capG, m.hair, hairG, [0, HC[1] - 0.004, -0.004], [SK[0] * 1.04, SK[1] * 1.03, SK[2] * 1.04], [-0.75, 0, 0]);
    let placed = 0;
    for (let i = 0; i < 600 && placed < 170; i++) {
      const th = rnd() * Math.PI * 2, ph = 0.03 + rnd() * 1.5;
      const n = dir(th, ph);
      if (n.z > 0.25 && n.y < 0.62) continue;          // cara y frente libres
      if (n.y < -0.05) continue;
      if (Math.abs(n.x) > 0.75 && n.y < 0.32 && n.z > -0.4) continue; // orejas libres
      const r = 0.017 + rnd() * 0.013;
      const p = onSkull(n, 0.12 + r * 3.5 + (n.y > 0.5 ? 0.06 : 0));
      M(sph(r, 16, 12), m.hair, hairG, [p.x, p.y, p.z]);
      placed++;
    }
  } else {
    // pelo corto peinado hacia un lado, con volumen arriba
    M(capG, m.hair, hairG, [0, HC[1] - 0.002, -0.006], [SK[0] * 1.05, SK[1] * 1.04, SK[2] * 1.05], [-0.72, 0, 0]);
    for (let i = 0; i < 6; i++) chunk(-0.95 + i * 0.36, 0.78 - Math.abs(i - 2.5) * 0.035, 0.042, 0.017, 0.032, 0.6, 0.06, 0.3);
    chunk(0.25, 0.3, 0.085, 0.034, 0.075, 0.45, 0.06);
    chunk(-0.45, 0.48, 0.07, 0.028, 0.06, 0.95, 0.06);
    chunk(0.65, 0.5, 0.065, 0.026, 0.055, -0.6, 0.06);
    chunk(Math.PI, 0.55, 0.08, 0.026, 0.07, 0, 0.04);
    [1, -1].forEach(s => chunk(1.38 * s, 1.0, 0.024, 0.014, 0.04, 0, 0.04));
    [[2.6, 0.32, 0.4], [3.2, 0.25, -0.2]].forEach(([th, ph, sw]) => chunk(th, ph, 0.017, 0.045, 0.02, sw, 0.12, -0.5));
  }

  // ---------- brazos y manos ----------
  R.arm = [1, -1].map(s => {
    const sh = grp(torso, [0.18 * s, 0.39, 0]);
    M(cap(0.046, 0.19), m.top, sh, [0, -0.125, 0]);
    const el = grp(sh, [0, -0.275, 0]);
    M(sph(0.043), m.top, el, [0, 0, 0]);
    M(cap(0.04, 0.17), m.top, el, [0, -0.11, 0]);
    M(tor(0.038, 0.013), m.top2, el, [0, -0.215, 0], 1, [Math.PI / 2, 0, 0]);
    M(cap(0.026, 0.03), m.skin, el, [0, -0.235, 0]); // muñeca
    const hand = grp(el, [0, -0.255, 0]);
    const palm = grp(hand, [0, 0, 0]);
    palm.rotation.y = -s * Math.PI / 2; // palma hacia el cuerpo con el brazo caído
    M(sph(0.036), m.skin, palm, [0, -0.035, 0], [1.05, 1.15, 0.55]);
    const fingers = [];
    [[-0.024, 0.034], [-0.008, 0.039], [0.008, 0.037], [0.023, 0.031]].forEach(([fx, len]) => {
      const f = grp(palm, [fx, -0.07, 0.002]);
      M(cap(0.0095, len * 0.55, 10), m.skin, f, [0, -len * 0.35, 0]);
      const f2 = grp(f, [0, -len * 0.68, 0]);
      M(cap(0.0088, len * 0.45, 10), m.skin, f2, [0, -len * 0.25, 0]);
      fingers.push([f, f2]);
    });
    const thumb = grp(palm, [-0.03, -0.03, 0.016]);
    thumb.rotation.set(0.5, 0, 0.75);
    M(cap(0.011, 0.03, 10), m.skin, thumb, [0, -0.022, 0]);
    return { sh, el, hand, palm, fingers, thumb, s };
  });

  R.base = { hipsY: 0.86 };
  R.HC = new THREE.Vector3(...HC);
  R.EYE = new THREE.Vector3(0, 0.155, 0.1);
  R.TOP = 0.3;
  pose(R, {});
  return R;
}

// Postura: radianes; lo que falte = 0 (de pie, brazos caídos).
// Expresión: lid (0 abierto..1 cerrado), look [x,y], brow, browTilt (+ enfado), smile (-1..1), open (0..1), eyeScale, squint, grip (0 mano abierta..1 puño)
export function pose(R, p) {
  const v = (k, d = 0) => (p[k] === undefined ? d : p[k]);
  R.root.position.set(v('x'), v('y'), v('z'));
  R.root.rotation.set(v('rx'), v('ry'), v('rz'));
  R.hips.position.set(v('hx', 0), R.base.hipsY + v('hy', 0), v('hz', 0));
  R.hips.rotation.set(v('hipRx'), v('hipRy'), v('hipRz'));
  R.torso.rotation.set(v('lean'), v('twist'), v('side'));
  const br = v('breath');
  R.torso.scale.set(1 + br * 0.012, 1 + br * 0.012, 1 + br * 0.02);
  R.head.rotation.set(v('nod'), v('turn'), v('tilt'));
  const K = ['L', 'R'];
  R.arm.forEach((a, i) => {
    const k = K[i];
    a.sh.rotation.set(v('armFwd' + k), v('armTwist' + k), v('armOut' + k, 0.1) * a.s);
    a.el.rotation.set(-v('elbow' + k, 0.15), 0, 0);
    a.hand.rotation.set(v('wristX' + k), v('wristY' + k), v('wristZ' + k));
    const g = v('grip' + k, v('grip', 0.25));
    a.fingers.forEach(([f, f2], j) => { f.rotation.x = g * 1.35 + j * 0.03; f2.rotation.x = g * 1.5; });
    a.thumb.rotation.set(0.5 + g * 0.5, 0, 0.75 - g * 0.35);
  });
  R.leg.forEach((l, i) => {
    const k = K[i];
    l.hip.rotation.set(-v('thigh' + k), 0, v('legOut' + k, 0.03) * (i ? -1 : 1));
    l.knee.rotation.set(v('knee' + k), 0, 0);
    l.foot.rotation.set(v('ankle' + k), 0, 0);
  });
  // cara
  const lid = v('lid', 0.12), lidL = v('lidL', lid), lidR = v('lidR', lid);
  const look = p.look || [0, 0];
  const es = v('eyeScale', 1);
  R.eyes.forEach((e, i) => {
    const l = i === 0 ? lidL : lidR;
    e.ball.rotation.set(-look[1] * 0.4, look[0] * 0.5 - 0.16 * e.s * 0.7, 0);
    e.socket.scale.setScalar(1 + (es - 1) * 0.6);
    e.lid.rotation.x = -1.5 + l * 3.0;
    e.lidLow.rotation.x = 0.55 - v('squint', 0) * 0.5;
    e.lidLow.visible = v('squint', 0) > 0.02;
    const b = v('brow', 0), bt = v('browTilt', 0);
    e.brow.position.y = 0.195 + b * 0.012 + (i ? 0 : v('browAsym', 0) * 0.008);
    e.brow.rotation.z = bt * 0.35 * -e.s + b * 0.12 * e.s;
  });
  const smile = v('smile', 0.2), open = v('open', 0);
  R.smile.visible = open < 0.12;
  R.smile.scale.set(1 - Math.abs(smile) * 0.08 + v('wide', 0) * 0.35, Math.max(0.1, Math.abs(smile) * 0.85), 1);
  R.smile.rotation.z = smile >= 0 ? Math.PI : 0;
  R.smile.position.y = smile >= 0 ? 0.006 + smile * 0.006 : -0.008 - smile * 0.004;
  R.open.visible = open >= 0.12;
  R.open.scale.set(0.8 + v('wide', 0) * 0.45 + open * 0.15 + Math.max(0, smile) * 0.15, 0.3 + open * 0.9, 1);
  R.teeth.visible = v('teeth', 1) > 0.5;
  R.blush.forEach(b => (b.material.opacity = 0.16 + v('blush', 0) * 0.4));
  R.cords.forEach((c, i) => (c.rotation.z = (i ? -1 : 1) * 0.05 + v('cordSwing', 0)));
}

// Posturas base
export const SIT = { thighL: Math.PI / 2, thighR: Math.PI / 2, kneeL: Math.PI / 2 - 0.05, kneeR: Math.PI / 2 - 0.05, ankleL: 0, ankleR: 0, legOutL: 0.1, legOutR: 0.1 };
export const STAND = { thighL: 0, thighR: 0, kneeL: 0, kneeR: 0 };
