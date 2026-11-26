// Banda sonora y efectos sintetizados con OfflineAudioContext (determinista, sin samples externos).
// 120 BPM: 1 tiempo = 0.5 s, 1 compás = 2 s. El drop cae en t = 14 s.
import { T, BIDS } from './ui.js';

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = {
  Am: [45, [57, 60, 64, 67]], F: [41, [57, 60, 65, 69]], C: [48, [55, 60, 64, 67]], G: [43, [55, 59, 62, 67]],
  Am9: [45, [52, 55, 59, 60, 64]], Fmaj7: [41, [52, 57, 60, 64]], Cmaj7: [48, [55, 59, 64, 67]],
};
// progresión del tema (tiempo de inicio, acorde)
const PROG = [[6, 'Am'], [8, 'F'], [9, 'G'], [10, 'Am'], [12, 'F'], [13, 'G'], [14, 'Am'], [16, 'F'], [18, 'C'], [19, 'G'], [20, 'Am'], [22, 'F'], [23, 'G'], [24.25, null], [25.15, 'C'], [26, 'Am'], [27, 'F'], [28, 'G'], [29, 'C'], [33, null]];

export const LINES = {
  leo1: { t: 7.55, text: 'Wanna play some BidVerse?', base: 250 },
  dani1: { t: 8.95, text: 'Yesss! Make a room!', base: 330 },
  dani2: { t: 16.25, text: 'Twelve!', base: 345 },
  leo2: { t: 16.95, text: 'FIFTEEN!', base: 265 },
  leo3: { t: 26.25, text: "LET'S GOOO!", base: 270 },
  dani3: { t: 27.55, text: 'REMATCH!', base: 340 },
};

export async function renderSoundtrack(dur = 33, sr = 48000) {
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const at = (p, v, t) => p.setValueAtTime(v, Math.max(0, t));
  const lin = (p, v, t) => p.linearRampToValueAtTime(v, Math.max(0, t));
  const ex = (p, v, t) => p.exponentialRampToValueAtTime(Math.max(1e-4, v), Math.max(0, t));
  const gain = (v = 1, dest) => { const g = ctx.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; };
  const filt = (type, f, q = 0.7, dest) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; if (dest) b.connect(dest); return b; };
  const osc = (type, f, dest) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (dest) o.connect(dest); return o; };
  const pan = (p, dest) => { const s = ctx.createStereoPanner(); s.pan.value = p; if (dest) s.connect(dest); return s; };

  // ---- cadena master ----
  const limiter = ctx.createDynamicsCompressor();
  Object.entries({ threshold: -3, knee: 0, ratio: 20, attack: 0.001, release: 0.08 }).forEach(([k, v]) => (limiter[k].value = v));
  limiter.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor();
  Object.entries({ threshold: -16, knee: 10, ratio: 3, attack: 0.004, release: 0.2 }).forEach(([k, v]) => (comp[k].value = v));
  comp.connect(limiter);
  const master = gain(0.85, comp);
  const music = gain(0.62, master);
  const sfx = gain(0.9, master);
  const vox = gain(1.0, master);
  // reverb
  const irLen = Math.floor(sr * 2.6), ir = ctx.createBuffer(2, irLen, sr);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let s = 1234 + c * 99; for (let i = 0; i < irLen; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647 * 2 - 1) * Math.pow(1 - i / irLen, 3.2); } }
  const verb = ctx.createConvolver(); verb.buffer = ir; const verbOut = gain(0.32, master); verb.connect(verbOut);
  const rev = gain(1, verb);
  // delay punteado (3/16 a 120 BPM)
  const dl = ctx.createDelay(1); dl.delayTime.value = 0.375; const dlfb = gain(0.32); const dlf = filt('lowpass', 3200);
  dl.connect(dlf); dlf.connect(dlfb); dlfb.connect(dl); const dlOut = gain(0.35, master); dlf.connect(dlOut);
  const del = gain(1, dl);
  // bus con sidechain (bajo y pads se agachan en cada bombo)
  const duck = gain(1, music);

  // ruido blanco
  const nb = ctx.createBuffer(1, sr * 2, sr); { const d = nb.getChannelData(0); let s = 99; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 2147483647 * 2 - 1; } }
  let nOff = 0;
  const noise = (t, len, dest) => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.connect(dest); nOff = (nOff + 0.377) % 1.9; s.start(Math.max(0, t), nOff); s.stop(t + len + 0.05); return s; };
  const play = (o, t, len) => { o.start(Math.max(0, t)); o.stop(t + len + 0.05); };

  // ---- batería ----
  const kicks = [];
  function kick(t, v = 1) {
    kicks.push(t);
    const g = gain(0, music), o = osc('sine', 150, g);
    at(o.frequency, 160, t); ex(o.frequency, 44, t + 0.13);
    at(g.gain, 0, t); lin(g.gain, 0.95 * v, t + 0.003); ex(g.gain, 0.001, t + 0.45);
    play(o, t, 0.5);
    const cg = gain(0, music); const cf = filt('highpass', 2500, 0.7, cg); noise(t, 0.02, cf);
    at(cg.gain, 0.25 * v, t); ex(cg.gain, 0.001, t + 0.02);
  }
  function clap(t, v = 1) {
    const g = gain(0); const bp = filt('bandpass', 1600, 0.9, g); g.connect(music); const s = gain(0.25, rev); g.connect(s);
    noise(t, 0.3, bp);
    at(g.gain, 0, t);
    [0, 0.011, 0.022].forEach(o => { at(g.gain, 0.55 * v, t + o); lin(g.gain, 0.1 * v, t + o + 0.009); });
    lin(g.gain, 0.4 * v, t + 0.03); ex(g.gain, 0.001, t + 0.22);
    const tg = gain(0, music), to = osc('triangle', 190, tg); at(tg.gain, 0.25 * v, t); ex(tg.gain, 0.001, t + 0.1); play(to, t, 0.12);
  }
  function snare(t, v = 1) {
    const g = gain(0, music); const bp = filt('highpass', 1200, 0.7, g); noise(t, 0.2, bp);
    at(g.gain, 0.4 * v, t); ex(g.gain, 0.001, t + 0.13);
    const tg = gain(0, music), to = osc('triangle', 210, tg); at(tg.gain, 0.3 * v, t); ex(tg.gain, 0.001, t + 0.08); play(to, t, 0.1);
  }
  function hat(t, v = 1, open = false) {
    const g = gain(0); const hp = filt('highpass', 8500, 0.7, g); const p = pan(0.25, music); g.connect(p);
    noise(t, open ? 0.3 : 0.06, hp);
    at(g.gain, 0.16 * v, t); ex(g.gain, 0.001, t + (open ? 0.24 : 0.045));
  }
  function crash(t, v = 1) {
    const g = gain(0); const hp = filt('highpass', 5000, 0.5, g); g.connect(music); const s = gain(0.4, rev); g.connect(s);
    noise(t, 2.2, hp); at(g.gain, 0.3 * v, t); ex(g.gain, 0.001, t + 2.0);
  }
  function tom(t, f = 110, v = 1) {
    const g = gain(0, music), o = osc('sine', f, g); at(o.frequency, f * 1.6, t); ex(o.frequency, f, t + 0.08);
    at(g.gain, 0.6 * v, t); ex(g.gain, 0.001, t + 0.35); play(o, t, 0.4);
  }

  // ---- instrumentos ----
  function bass(t, m, len, v = 1) {
    const g = gain(0, duck), lp = filt('lowpass', 600, 4, g);
    const o1 = osc('sawtooth', mtof(m), lp), o2 = osc('square', mtof(m - 12), lp);
    o2.detune.value = 4;
    at(lp.frequency, 1400, t); ex(lp.frequency, 380, t + Math.min(len, 0.22));
    at(g.gain, 0, t); lin(g.gain, 0.28 * v, t + 0.006); at(g.gain, 0.28 * v, t + len - 0.03); lin(g.gain, 0, t + len);
    play(o1, t, len); play(o2, t, len);
  }
  function pad(t, notes, len, v = 1, bright = 1800) {
    const g = gain(0); const lp = filt('lowpass', bright, 0.5, g); g.connect(duck); const s = gain(0.35, rev); g.connect(s);
    notes.forEach((m, i) => [-8, 8].forEach(dt => { const o = osc('sawtooth', mtof(m), pan(dt > 0 ? 0.3 : -0.3, lp)); o.detune.value = dt + (i % 2) * 3; play(o, t, len + 0.6); }));
    at(g.gain, 0, t); lin(g.gain, 0.055 * v, t + 0.12); at(g.gain, 0.055 * v, t + len); lin(g.gain, 0, t + len + 0.5);
  }
  function pluck(t, m, len = 0.2, v = 1, p = 0) {
    const g = gain(0); const lp = filt('lowpass', 5000, 2, g); const pp = pan(p, music); g.connect(pp); const d = gain(0.45, del); g.connect(d);
    const o1 = osc('square', mtof(m), lp), o2 = osc('sawtooth', mtof(m), lp); o2.detune.value = 9;
    at(lp.frequency, 6000, t); ex(lp.frequency, 900, t + 0.18);
    at(g.gain, 0, t); lin(g.gain, 0.12 * v, t + 0.004); ex(g.gain, 0.001, t + len + 0.15);
    play(o1, t, len + 0.2); play(o2, t, len + 0.2);
  }
  function epiano(t, m, len, v = 1) {
    const g = gain(0); g.connect(music); const s = gain(0.5, rev); g.connect(s);
    const trem = gain(1); trem.connect(g); const lfo = osc('sine', 4.5); const lg = gain(0.18); lfo.connect(lg); lg.connect(trem.gain); play(lfo, t, len + 1);
    [[1, 1], [2, 0.22], [3, 0.06], [4.01, 0.04]].forEach(([h, a]) => { const og = gain(a, trem); const o = osc('sine', mtof(m) * h, og); play(o, t, len + 1); });
    at(g.gain, 0, t); lin(g.gain, 0.12 * v, t + 0.01); ex(g.gain, 0.04 * v, t + len * 0.7); lin(g.gain, 0, t + len + 0.8);
  }
  function marimba(t, m, v = 1, dest = sfx) {
    const g = gain(0, dest);
    [[1, 1], [4, 0.25], [10, 0.05]].forEach(([h, a]) => { const og = gain(a, g); const o = osc('sine', mtof(m) * h, og); play(o, t, 0.6); });
    at(g.gain, 0, t); lin(g.gain, 0.32 * v, t + 0.003); ex(g.gain, 0.001, t + 0.45);
  }
  function bell(t, f, v = 1) {
    const g = gain(0); g.connect(sfx); const s = gain(0.6, rev); g.connect(s);
    [[1, 1, 1.6], [2.76, 0.5, 0.9], [5.4, 0.25, 0.5], [8.93, 0.12, 0.3]].forEach(([h, a, d]) => { const og = gain(0, g); const o = osc('sine', f * h, og); at(og.gain, a, t); ex(og.gain, 0.001, t + d); play(o, t, d); });
    at(g.gain, 0.3 * v, t);
  }

  // ---- efectos ----
  function click(t, v = 1, f = 2400) {
    const g = gain(0, sfx), o = osc('sine', f, g); at(g.gain, 0.22 * v, t); ex(g.gain, 0.001, t + 0.03); play(o, t, 0.04);
    const ng = gain(0, sfx); noise(t, 0.01, filt('highpass', 4000, 0.7, ng)); at(ng.gain, 0.1 * v, t); ex(ng.gain, 0.001, t + 0.012);
  }
  function tick(t, hi = true, v = 1) {
    const g = gain(0, sfx), o = osc('sine', hi ? 1900 : 1500, g); at(g.gain, 0.18 * v, t); ex(g.gain, 0.001, t + 0.035); play(o, t, 0.05);
    const ng = gain(0, sfx); noise(t, 0.008, filt('bandpass', 3500, 2, ng)); at(ng.gain, 0.12 * v, t); ex(ng.gain, 0.001, t + 0.01);
  }
  function coin(t, v = 1, hi = 0) {
    const g = gain(0, sfx), o = osc('square', mtof(83 + hi), g); const lp = filt('lowpass', 5000);
    at(o.frequency, mtof(83 + hi), t); at(o.frequency, mtof(88 + hi), t + 0.07);
    at(g.gain, 0.08 * v, t); at(g.gain, 0.09 * v, t + 0.07); ex(g.gain, 0.001, t + 0.35); play(o, t, 0.4);
  }
  function whoosh(t, len = 0.45, v = 1, f0 = 300, f1 = 3500) {
    const g = gain(0); const bp = filt('bandpass', f0, 1.4, g); const p = pan(0, sfx); g.connect(p); const s = gain(0.3, rev); g.connect(s);
    noise(t, len, bp);
    at(bp.frequency, f0, t); ex(bp.frequency, f1, t + len * 0.6); ex(bp.frequency, f0 * 1.5, t + len);
    at(p.pan, -0.6, t); lin(p.pan, 0.6, t + len);
    at(g.gain, 0, t); lin(g.gain, 0.5 * v, t + len * 0.55); ex(g.gain, 0.001, t + len);
  }
  function riser(t0, t1, v = 1) {
    const g = gain(0); const hp = filt('highpass', 300, 2, g); g.connect(sfx); const s = gain(0.4, rev); g.connect(s);
    noise(t0, t1 - t0, hp); at(hp.frequency, 300, t0); ex(hp.frequency, 9000, t1);
    at(g.gain, 0, t0); lin(g.gain, 0.22 * v, t1 - 0.02); lin(g.gain, 0, t1);
    const og = gain(0, music); const lp = filt('lowpass', 2500, 1, og); const o = osc('sawtooth', 220, lp); const o2 = osc('sawtooth', 221.5, lp);
    [o, o2].forEach(oo => { at(oo.frequency, 180, t0); ex(oo.frequency, 1400, t1); play(oo, t0, t1 - t0); });
    at(og.gain, 0, t0); lin(og.gain, 0.06 * v, t1 - 0.02); lin(og.gain, 0, t1);
  }
  function reverseCym(t1, len = 1.2, v = 1) {
    const t0 = t1 - len; const g = gain(0); const hp = filt('highpass', 4000, 0.6, g); g.connect(sfx); noise(t0, len, hp);
    at(g.gain, 0.001, t0); ex(g.gain, 0.28 * v, t1 - 0.01); lin(g.gain, 0, t1);
  }
  function impact(t, v = 1, f = 70) {
    const g = gain(0, sfx), o = osc('sine', f * 2.2, g); at(o.frequency, f * 2.2, t); ex(o.frequency, f * 0.5, t + 0.5);
    at(g.gain, 0.9 * v, t); ex(g.gain, 0.001, t + 0.9); play(o, t, 1);
    const ng = gain(0); const lp = filt('lowpass', 1200, 0.8, ng); ng.connect(sfx); const s = gain(0.6, rev); ng.connect(s);
    noise(t, 0.5, lp); at(lp.frequency, 3000, t); ex(lp.frequency, 200, t + 0.45);
    at(ng.gain, 0.6 * v, t); ex(ng.gain, 0.001, t + 0.5);
  }
  function knock(t, v = 1) { // martillo de subasta sobre madera
    const g = gain(0); g.connect(sfx); const s = gain(0.35, rev); g.connect(s);
    [[620, 0.09, 0.7], [1180, 0.05, 0.3], [180, 0.18, 0.8]].forEach(([f, d, a]) => { const og = gain(0, g); const o = osc('sine', f, og); at(og.gain, a, t); ex(og.gain, 0.001, t + d); play(o, t, d); });
    const ng = gain(0, g); noise(t, 0.02, filt('bandpass', 2200, 1.2, ng)); at(ng.gain, 0.6, t); ex(ng.gain, 0.001, t + 0.025);
    at(g.gain, 0.9 * v, t);
  }
  function slash(t, v = 1) {
    const g = gain(0); const bp = filt('bandpass', 7000, 3, g); g.connect(sfx); const s = gain(0.3, rev); g.connect(s);
    noise(t, 0.2, bp); at(bp.frequency, 8000, t); ex(bp.frequency, 1500, t + 0.16); at(g.gain, 0.5 * v, t); ex(g.gain, 0.001, t + 0.18);
    const mg = gain(0, sfx); [3150, 4720, 6300].forEach(f => { const o = osc('sine', f, mg); play(o, t, 0.5); }); at(mg.gain, 0.05 * v, t); ex(mg.gain, 0.001, t + 0.45);
  }
  function charge(t0, t1, v = 1) {
    const g = gain(0); const lp = filt('lowpass', 900, 3, g); g.connect(sfx); const s = gain(0.4, rev); g.connect(s);
    [-12, 0, 7, 12.1].forEach(dt => { const o = osc('sawtooth', 110, lp); o.detune.value = dt * 100; at(o.frequency, 110, t0); ex(o.frequency, 440, t1); play(o, t0, t1 - t0); });
    at(lp.frequency, 400, t0); ex(lp.frequency, 6000, t1);
    const lfo = osc('square', 18); const lg = gain(0.04); lfo.connect(lg); lg.connect(g.gain); play(lfo, t0, t1 - t0);
    at(g.gain, 0, t0); lin(g.gain, 0.09 * v, t1); lin(g.gain, 0, t1 + 0.02);
  }
  function beamSnd(t, len = 0.9, v = 1) {
    const g = gain(0); const lp = filt('lowpass', 2500, 1, g); g.connect(sfx); const s = gain(0.5, rev); g.connect(s);
    const ws = ctx.createWaveShaper(); const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 3); } ws.curve = curve; ws.connect(lp);
    [55, 55.4, 82.5, 110.7].forEach(f => { const o = osc('sawtooth', f, ws); play(o, t, len); });
    noise(t, len, ws);
    at(lp.frequency, 6000, t); ex(lp.frequency, 900, t + len);
    at(g.gain, 0, t); lin(g.gain, 0.22 * v, t + 0.04); at(g.gain, 0.22 * v, t + len * 0.6); lin(g.gain, 0, t + len);
  }
  function gong(t, v = 1) {
    const g = gain(0); g.connect(sfx); const s = gain(0.8, rev); g.connect(s);
    [[1, 1, 2.8], [1.48, 0.6, 2], [2.08, 0.45, 1.6], [2.94, 0.3, 1.1], [3.7, 0.2, 0.8]].forEach(([h, a, d]) => { const og = gain(0, g); const o = osc('sine', 92 * h, og); at(og.gain, a, t); ex(og.gain, 0.001, t + d); play(o, t, d); });
    at(g.gain, 0.32 * v, t);
  }
  function pop(t, v = 1) { const g = gain(0, sfx), o = osc('sine', 900, g); at(o.frequency, 900, t); ex(o.frequency, 220, t + 0.08); at(g.gain, 0.3 * v, t); ex(g.gain, 0.001, t + 0.1); play(o, t, 0.12); }
  function plof(t, v = 1) {
    const g = gain(0, sfx), o = osc('sine', 200, g); at(o.frequency, 220, t); ex(o.frequency, 55, t + 0.16); at(g.gain, 0.8 * v, t); ex(g.gain, 0.001, t + 0.25); play(o, t, 0.3);
    const ng = gain(0, sfx); noise(t, 0.06, filt('lowpass', 900, 0.7, ng)); at(ng.gain, 0.4 * v, t); ex(ng.gain, 0.001, t + 0.07);
  }
  function buzz(t, len, v = 1) {
    const g = gain(0); const lp = filt('lowpass', 320, 1, g); g.connect(sfx); const o = osc('square', 150, lp); play(o, t, len);
    for (let k = t; k < t + len; k += 0.42) { at(g.gain, 0, k); lin(g.gain, 0.35 * v, k + 0.02); at(g.gain, 0.35 * v, k + 0.26); lin(g.gain, 0, k + 0.29); }
  }
  function ringback(t0, t1) {
    const g = gain(0); const bp = filt('bandpass', 425, 1.5, g); g.connect(sfx); const o = osc('sine', 425, bp); play(o, t0, t1 - t0);
    for (let k = t0; k < t1; k += 3) { at(g.gain, 0, k); lin(g.gain, 0.14, k + 0.02); at(g.gain, 0.14, Math.min(t1, k + 1.5) - 0.02); lin(g.gain, 0, Math.min(t1, k + 1.5)); }
  }
  function dtmf(t, d, v = 1) {
    const R = [697, 770, 852, 941], Cc = [1209, 1336, 1477];
    const g = gain(0, sfx); [R[d % 4], Cc[d % 3]].forEach(f => play(osc('sine', f, g), t, 0.1));
    at(g.gain, 0.09 * v, t); at(g.gain, 0.09 * v, t + 0.09); lin(g.gain, 0, t + 0.1);
  }
  // voces "galimatías" tipo Sims: sílabas con formantes de la vocal escrita
  const FORM = { a: [950, 1450], e: [560, 2250], i: [360, 2750], o: [620, 1050], u: [420, 900] };
  function voice(t, txt, base, v = 1) {
    const s0 = txt.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const loud = /!/.test(txt) ? 1.25 : 1, q = /\?/.test(txt);
    const sylls = [];
    for (let i = 0; i < s0.length; i++) { const c = s0[i]; if (FORM[c]) sylls.push({ v: c, cons: s0[i - 1] || ' ' }); }
    let tt = t; const r = (() => { let s = Math.round(base * 13); return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    const caps = txt === txt.toUpperCase();
    sylls.forEach((sy, i) => {
      const last = i === sylls.length - 1, len = (last ? 0.16 : 0.075 + r() * 0.03) * (caps ? 1.15 : 1);
      let f = base * (1 + (r() - 0.5) * 0.18) * (caps ? 1.12 : 1);
      if (q && i >= sylls.length - 2) f *= 1.25 + (i - sylls.length + 2) * 0.12;
      const g = gain(0); g.connect(vox); const rs = gain(0.18, rev); g.connect(rs);
      const [f1, f2] = FORM[sy.v];
      const b1 = filt('bandpass', f1 * 1.15, 7, g), b2 = filt('bandpass', f2 * 1.15, 9, g); const b2g = gain(0.6); b2g.connect(b2);
      const o = osc('sawtooth', f); o.connect(b1); o.connect(b2g);
      const vib = osc('sine', 7); const vg = gain(f * 0.02); vib.connect(vg); vg.connect(o.frequency); play(vib, tt, len);
      at(o.frequency, f * 1.05, tt); ex(o.frequency, f * (last && !q ? 0.88 : 1), tt + len);
      at(g.gain, 0, tt); lin(g.gain, 0.7 * v * loud, tt + 0.012); at(g.gain, 0.7 * v * loud, tt + len - 0.02); lin(g.gain, 0, tt + len);
      play(o, tt, len);
      if ('sczjfx'.includes(sy.cons)) { const ng = gain(0, vox); noise(tt - 0.03, 0.05, filt('highpass', 5000, 1, ng)); at(ng.gain, 0.12 * v, tt - 0.03); lin(ng.gain, 0, tt + 0.01); }
      if ('ptkbdgq'.includes(sy.cons)) { const ng = gain(0, vox); noise(tt - 0.005, 0.01, filt('bandpass', 1800, 1, ng)); at(ng.gain, 0.25 * v, tt - 0.005); lin(ng.gain, 0, tt + 0.008); }
      tt += len + (r() < 0.15 ? 0.03 : 0.005);
    });
  }
  function sigh(t, v = 1) {
    const g = gain(0); g.connect(vox); const s = gain(0.2, rev); g.connect(s);
    const b1 = filt('bandpass', 900, 5, g), b2 = filt('bandpass', 1400, 6, g);
    const o = osc('sawtooth', 210); o.connect(b1); o.connect(b2); at(o.frequency, 230, t); ex(o.frequency, 140, t + 1.1); play(o, t, 1.2);
    noise(t, 1.2, b1);
    at(g.gain, 0, t); lin(g.gain, 0.4 * v, t + 0.15); lin(g.gain, 0.25 * v, t + 0.7); lin(g.gain, 0, t + 1.15);
  }
  function rain(t0, t1, v = 1) {
    const g = gain(0); const lp = filt('lowpass', 2800, 0.5); const hp = filt('highpass', 500, 0.5, g); lp.connect(hp); g.connect(sfx); noise(t0, t1 - t0, lp);
    at(g.gain, 0.0, t0); lin(g.gain, 0.06 * v, t0 + 0.4); at(g.gain, 0.06 * v, t1 - 0.4); lin(g.gain, 0, t1);
  }
  function crackle(t0, t1) {
    let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let k = t0; k < t1; k += 0.02 + r() * 0.12) { const g = gain(0, music); noise(k, 0.004, filt('highpass', 3000, 0.7, g)); at(g.gain, 0.05 + r() * 0.08, k); lin(g.gain, 0, k + 0.004); }
  }

  // =================== guion sonoro ===================
  // Acto 1: aburrimiento (0-6)
  rain(0, 6.3, 1); crackle(0, 6.0);
  for (let s = 0.2; s < 5.9; s += 1) tick(s, Math.round(s) % 2 === 0, 0.9);
  const ch1 = (t, name, len) => { const [b, n] = CHORDS[name]; epiano(t, b, len, 0.9); n.forEach((m, i) => epiano(t + i * 0.035, m, len, 0.55)); };
  ch1(0.05, 'Am9', 2.4); ch1(2.45, 'Fmaj7', 1.6);
  sigh(1.05, 1);
  bell(4.0, mtof(84), 1); bell(4.0, mtof(91), 0.4);
  [72, 76, 79, 84, 88].forEach((m, i) => marimba(4.35 + i * 0.07, m, 0.8));
  ch1(4.3, 'Cmaj7', 1.6);
  whoosh(4.55, 0.35, 0.5, 600, 4000);
  [5, 2, 8, 0].forEach((d, i) => dtmf(5.12 + i * 0.12, d));
  ringback(5.6, T.answer);

  // Acto 2: la llamada (6-10) — groove ligero
  for (let b = 6; b < 10; b += 0.5) { hat(b + 0.25, 0.7); if ((b * 2) % 4 === 2) clap(b, 0.55); }
  [[6, 'Am'], [8, 'F'], [9, 'G']].forEach(([t, n], i, a) => { const end = a[i + 1] ? a[i + 1][0] : 10; for (let k = t; k < end; k += 0.5) bass(k, CHORDS[n][0] + 12 * (Math.floor(k * 2) % 2), 0.22, 0.7); pad(t, CHORDS[n][1], end - t - 0.1, 0.6, 1100); });
  // tono de llamada de Dani (marimba) + vibración; el móvil sale volando y lo caza
  const RING = 6.2, riff = [76, 79, 83, 88, 83, 79];
  for (let rep = 0; rep < 2; rep++) riff.forEach((m, i) => marimba(RING + rep * 0.62 + i * 0.09, m, 0.7));
  buzz(RING, 1.05, 1);
  whoosh(RING + 0.03, 0.5, 0.7, 600, 5000); pop(RING + 0.05, 0.8);
  [0, 1, 2].forEach(i => tick(RING + 0.2 + i * 0.09, i % 2 === 0, 0.5));
  plof(RING + 0.55, 0.45); click(RING + 0.56, 1, 1200);
  click(T.answer - 0.08, 1, 1700);
  voice(LINES.leo1.t, LINES.leo1.text, LINES.leo1.base, 1);
  voice(LINES.dani1.t, LINES.dani1.text, LINES.dani1.base, 1);

  // Acto 3: entrar en la web (10-14) — subida
  for (let b = 10; b < 13.85; b += 0.25) hat(b, b > 12 ? 0.9 : 0.6);
  for (let b = 10; b < 12; b += 1) kick(b, 0.7);
  [[10, 'Am'], [12, 'F'], [13, 'G']].forEach(([t, n], i, a) => { const end = Math.min(13.85, a[i + 1] ? a[i + 1][0] : 14); for (let k = t; k < end; k += 0.25) bass(k, CHORDS[n][0] + 12 * (Math.floor(k * 4) % 2), 0.12, 0.6); pad(t, CHORDS[n][1], end - t - 0.05, 0.8, 900 + (t - 10) * 500); });
  for (let k = 12; k < 13.0; k += 0.25) snare(k, 0.4 + (k - 12) * 0.3);
  for (let k = 13; k < 13.5; k += 0.125) snare(k, 0.6);
  for (let k = 13.5; k < 13.85; k += 0.0625) snare(k, 0.75);
  riser(11.9, 13.85, 1);
  for (let i = 0; i < 8; i++) click(T.typeA + i * ((T.typeB - T.typeA) / 8), 0.7, 2000 + (i % 3) * 300);
  click(T.go - 0.05, 1, 1600); whoosh(T.go, 0.4, 0.7);
  bell(T.go + 0.2, mtof(81), 0.5); pluck(T.go + 0.2, 69, 0.4, 1); pluck(T.go + 0.2, 76, 0.4, 0.8); pluck(T.go + 0.2, 81, 0.5, 0.8);
  whoosh(T.menu + 0.1, 0.5, 0.45, 200, 2000);
  click(T.tapAnime, 1.2, 1500); pop(T.tapAnime + 0.02, 0.6);
  for (let i = 0; i < 5; i++) tick(T.room + 0.25 + i * 0.07, true, 0.6);
  marimba(T.joined, 79, 1); marimba(T.joined + 0.1, 84, 1); pop(T.joined, 0.8);
  reverseCym(14.0, 1.2, 1);

  // Acto 4: DROP — subasta (14-20)
  const drop = (t0, t1, opt = {}) => {
    for (let b = t0; b < t1 - 1e-6; b += 0.5) {
      kick(b, 1);
      if ((Math.round(b * 2) % 4) === 2) clap(b, 0.85);
      hat(b + 0.25, 0.9, true);
      hat(b, 0.5); hat(b + 0.125, 0.35); hat(b + 0.375, 0.4);
    }
  };
  drop(14, 18.5); crash(14, 1); impact(14, 0.5, 60);
  kick(18.5, 1.2); crash(18.5, 0.9);
  drop(19, 20);
  const harm = (t0, t1, arp = true, padV = 1) => {
    PROG.forEach(([t, n], i) => {
      if (!n) return; const end = PROG[i + 1][0]; const a = Math.max(t, t0), b = Math.min(end, t1); if (b <= a) return;
      const [root, notes] = CHORDS[n];
      for (let k = a; k < b - 1e-6; k += 0.25) bass(k, root + (Math.round(k * 4) % 2 ? 12 : 0), 0.2, 1);
      pad(a, notes, b - a - 0.05, padV, 2400);
      if (arp) { const pat = [0, 1, 2, 3, 2, 1, 3, 1]; let j = 0; for (let k = a; k < b - 1e-6; k += 0.125) { pluck(k, notes[pat[j % 8] % notes.length] + 12, 0.1, 0.55, (j % 2 ? 0.3 : -0.3)); j++; } }
    });
  };
  harm(14, 18.5, true); harm(19, 20, true);
  // gancho melódico del drop
  const hook = [[0, 69, 0.5], [0.5, 72, 0.5], [1, 76, 0.75], [1.75, 74, 0.25], [2, 72, 0.5], [2.5, 76, 0.5], [3, 81, 0.5], [3.5, 79, 0.5], [4, 77, 0.75], [4.75, 76, 0.25], [5, 72, 0.5], [5.5, 69, 0.5], [6, 72, 0.5], [6.5, 74, 0.5], [7, 76, 1]];
  hook.forEach(([b, m, l]) => pluck(14 + b * 0.5, m + 12, l * 0.5, 1.1, 0));
  BIDS.forEach(([t, p]) => { coin(t, 1, p ? -5 : 0); click(t - 0.02, 0.6); });
  for (let n = 3; n >= 0; n--) tick(17 + (10 - n) / 6.8, true, 1.3);
  knock(T.sold, 1.3); impact(T.sold, 0.8, 80); whoosh(T.sold - 0.3, 0.3, 0.4, 500, 3000);
  for (let i = 0; i < 6; i++) pop(T.sold + 0.08 + i * 0.05, 0.35);
  coin(T.sold + 0.55, 1.2, 5);
  voice(LINES.dani2.t, LINES.dani2.text, LINES.dani2.base, 1.05);
  voice(LINES.leo2.t, LINES.leo2.text, LINES.leo2.base, 1.1);
  whoosh(15.95, 0.3, 0.7, 400, 5000); whoosh(17.45, 0.3, 0.7, 400, 5000);

  // Acto 5: ¡Combate! (20-26)
  whoosh(T.wipe, 0.5, 1, 200, 4000); impact(T.wipe + 0.45, 1, 55); tom(T.wipe + 0.45, 80, 1); crash(T.wipe + 0.45, 0.8);
  for (let b = 20.75; b < T.cutin - 0.05; b += 0.5) { kick(b, 1); hat(b + 0.25, 0.8, true); if ((Math.round((b - 0.75) * 2) % 4) === 2) clap(b, 0.8); }
  harm(20.75, T.cutin, true, 1.1);
  whoosh(T.fight + 0.05, 0.35, 0.6); whoosh(T.fight + 0.15, 0.35, 0.6);
  impact(T.fight + 0.4, 0.7, 90); knock(T.fight + 0.4, 0.6);
  whoosh(T.slash - 0.25, 0.25, 0.8, 800, 6000);
  [0, 0.07, 0.14].forEach(d => slash(T.slash - 0.05 + d, 1));
  impact(T.slash + 0.1, 0.6, 100);
  whoosh(T.cutin, 0.3, 0.8, 400, 6000); slash(T.cutin + 0.05, 0.5);
  charge(T.cutin + 0.1, T.beam, 1);
  for (let k = T.cutin; k < T.beam - 0.05; k += Math.max(0.06, 0.25 - (k - T.cutin) * 0.25)) kick(k, 0.6 + (k - T.cutin) * 0.4);
  beamSnd(T.beam, 0.9, 1); impact(T.beam + 0.22, 1.2, 50); crash(T.beam + 0.22, 1);
  impact(T.ko, 1.3, 45); gong(T.ko + 0.05, 1); tom(T.ko, 60, 1);
  // victoria
  const fan = [[0, [72, 76, 79]], [0.25, [74, 77, 81]], [0.5, [76, 79, 84]], [1.0, [72, 76, 79, 84]]];
  fan.forEach(([d, ns]) => ns.forEach(m => pluck(T.win + d, m, d === 1 ? 0.6 : 0.18, 1.0)));
  crash(T.win, 1); kick(T.win, 1.1);
  for (let i = 0; i < 8; i++) pop(T.win + 0.05 + i * 0.04, 0.3);
  drop(T.win + 0.35, 29); harm(T.win, 29, true, 1);

  // Acto 6: reacciones (26-29)
  voice(LINES.leo3.t, LINES.leo3.text, LINES.leo3.base, 1.15);
  voice(LINES.dani3.t, LINES.dani3.text, LINES.dani3.base, 1.15);
  whoosh(25.95, 0.3, 0.6, 400, 5000);
  reverseCym(29.0, 1.0, 0.8);

  // Acto 7: cierre (29-33)
  kick(29, 1.3); crash(29, 1.1); impact(29, 0.7, 60);
  const [rC, nC] = CHORDS.C;
  pad(29, [...nC, 72, 76], 3.2, 1.4, 3000); bass(29, rC, 2.5, 1.1);
  [0, 0.12, 0.24, 0.36, 0.48].forEach((d, i) => pluck(29 + d, [72, 76, 79, 84, 88][i], 0.3, 0.9));
  whoosh(29.35, 0.4, 0.6, 300, 4000); knock(29.75, 1.2); impact(29.75, 0.6, 70);
  bell(30.4, mtof(96), 0.35); bell(31.2, mtof(91), 0.25);
  for (let i = 0; i < 6; i++) pop(29.78 + i * 0.05, 0.3);

  // fundido final
  at(master.gain, 0.85, 31.6); lin(master.gain, 0.0, dur - 0.05);
  // sidechain: el bus de bajo/pads se agacha en cada bombo
  kicks.sort((a, b) => a - b).forEach(k => { at(duck.gain, 1, k - 0.001); lin(duck.gain, 0.35, k + 0.01); lin(duck.gain, 1, k + 0.2); });
  return ctx.startRendering();
}
