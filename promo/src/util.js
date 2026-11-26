// Utilidades de animación: todo es función pura del tiempo t, así cada fotograma es reproducible.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = t => t * t * (3 - 2 * t);

export const E = {
  lin: t => t,
  in: t => t * t,
  out: t => 1 - (1 - t) * (1 - t),
  io: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inC: t => t * t * t,
  outC: t => 1 - Math.pow(1 - t, 3),
  ioC: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQ: t => 1 - Math.pow(1 - t, 5),
  inQ: t => t * t * t * t * t,
  outBack: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outBackS: t => { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inBack: t => { const c1 = 1.7, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  outElastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
  outBounce: t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  step: t => (t < 1 ? 0 : 1),
};

// Fotogramas clave: [[t, valor], [t, valor, 'curva'], ...]; la curva se aplica al tramo que acaba en esa clave.
// El valor puede ser número o array de números.
export function K(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const k = (E[e || 'io'])(t1 === t0 ? 1 : (t - t0) / (t1 - t0));
      return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return keys[keys.length - 1][1];
}

// Generador pseudoaleatorio con semilla (mulberry32)
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// Ruido suave 1D en [-1, 1] (para cámara en mano, respiración, etc.)
export function noise(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  const a = hash(i + seed * 57.3) * 2 - 1, b = hash(i + 1 + seed * 57.3) * 2 - 1;
  return lerp(a, b, u);
}
export const fbm = (x, seed = 0) => noise(x, seed) * 0.6 + noise(x * 2.3, seed + 7) * 0.3 + noise(x * 5.1, seed + 13) * 0.1;

// Pulso que sube y baja: 0 fuera de [a, b], 1 en el centro de la meseta
export function pulse(t, a, b, fadeIn = 0.1, fadeOut = 0.1) {
  if (t < a || t > b) return 0;
  return Math.min(1, (t - a) / Math.max(1e-6, fadeIn), (b - t) / Math.max(1e-6, fadeOut));
}
export const TAU = Math.PI * 2;
