// Banda sonora del spot 2 (parque + modo fútbol). Mezcla además el audio real de los clips de IA si existen.
import { S, DUR as DUR2 } from './park.js';
import { FT } from './futbol.js';

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const CH = { Am: [45, [57, 60, 64, 67]], F: [41, [57, 60, 65, 69]], C: [48, [55, 60, 64, 67]], G: [43, [55, 59, 62, 67]], Em: [40, [55, 59, 64, 67]] };

export async function renderSoundtrack2(dur = DUR2, _clips, clipIn = { park1: 0, park2: 0, park3: 0 }) {
  const sr = 48000, ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const at = (p, v, t) => p.setValueAtTime(v, Math.max(0, t)), lin = (p, v, t) => p.linearRampToValueAtTime(v, Math.max(0, t)), ex = (p, v, t) => p.exponentialRampToValueAtTime(Math.max(1e-4, v), Math.max(0, t));
  const gain = (v = 1, d) => { const g = ctx.createGain(); g.gain.value = v; if (d) g.connect(d); return g; };
  const filt = (type, f, q = 0.7, d) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; if (d) b.connect(d); return b; };
  const osc = (type, f, d) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (d) o.connect(d); return o; };
  const play = (o, t, len) => { o.start(Math.max(0, t)); o.stop(t + len + 0.05); };

  const lim = ctx.createDynamicsCompressor(); Object.entries({ threshold: -3, knee: 0, ratio: 20, attack: 0.001, release: 0.08 }).forEach(([k, v]) => (lim[k].value = v)); lim.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); Object.entries({ threshold: -16, knee: 10, ratio: 3, attack: 0.004, release: 0.2 }).forEach(([k, v]) => (comp[k].value = v)); comp.connect(lim);
  const master = gain(0.85, comp);
  const musicBus = gain(1, master), music = gain(0.6, musicBus), sfx = gain(0.85, master), voice = gain(1.25, master);
  const irLen = Math.floor(sr * 2.2), ir = ctx.createBuffer(2, irLen, sr);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let s = 77 + c; for (let i = 0; i < irLen; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647 * 2 - 1) * Math.pow(1 - i / irLen, 3); } }
  const verb = ctx.createConvolver(); verb.buffer = ir; verb.connect(gain(0.3, master)); const rev = gain(1, verb);
  const duck = gain(1, music);
  const nb = ctx.createBuffer(1, sr * 2, sr); { const d = nb.getChannelData(0); let s = 5; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 2147483647 * 2 - 1; } }
  let off = 0; const noise = (t, len, d) => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.connect(d); off = (off + 0.41) % 1.9; s.start(Math.max(0, t), off); s.stop(t + len + 0.05); };

  // ---- instrumentos (mismos que el spot 1, más ligeros) ----
  const kicks = [];
  const kick = (t, v = 1) => { kicks.push(t); const g = gain(0, music), o = osc('sine', 150, g); at(o.frequency, 160, t); ex(o.frequency, 44, t + 0.13); at(g.gain, 0, t); lin(g.gain, 0.95 * v, t + 0.003); ex(g.gain, 0.001, t + 0.42); play(o, t, 0.45); };
  const clap = (t, v = 1) => { const g = gain(0); filt('bandpass', 1600, 0.9, g); g.connect(music); g.connect(gain(0.25, rev)); const bp = filt('bandpass', 1600, 0.9, g); noise(t, 0.3, bp); at(g.gain, 0, t); [0, 0.011, 0.022].forEach(o => { at(g.gain, 0.5 * v, t + o); lin(g.gain, 0.1 * v, t + o + 0.009); }); lin(g.gain, 0.35 * v, t + 0.03); ex(g.gain, 0.001, t + 0.2); };
  const hat = (t, v = 1, open = false) => { const g = gain(0, music); noise(t, open ? 0.3 : 0.06, filt('highpass', 8500, 0.7, g)); at(g.gain, 0.14 * v, t); ex(g.gain, 0.001, t + (open ? 0.22 : 0.045)); };
  const shaker = (t, v = 1) => { const g = gain(0, music); noise(t, 0.08, filt('bandpass', 6000, 1.5, g)); at(g.gain, 0, t); lin(g.gain, 0.08 * v, t + 0.03); ex(g.gain, 0.001, t + 0.08); };
  const bass = (t, m, len, v = 1) => { const g = gain(0, duck), lp = filt('lowpass', 600, 4, g); const o1 = osc('sawtooth', mtof(m), lp), o2 = osc('square', mtof(m - 12), lp); at(lp.frequency, 1300, t); ex(lp.frequency, 360, t + Math.min(len, 0.2)); at(g.gain, 0, t); lin(g.gain, 0.26 * v, t + 0.006); at(g.gain, 0.26 * v, t + len - 0.03); lin(g.gain, 0, t + len); play(o1, t, len); play(o2, t, len); };
  const pad = (t, notes, len, v = 1, br = 2000) => { const g = gain(0); const lp = filt('lowpass', br, 0.5, g); g.connect(duck); g.connect(gain(0.35, rev)); notes.forEach(m => [-8, 8].forEach(dt => { const o = osc('sawtooth', mtof(m), lp); o.detune.value = dt; play(o, t, len + 0.6); })); at(g.gain, 0, t); lin(g.gain, 0.05 * v, t + 0.12); at(g.gain, 0.05 * v, t + len); lin(g.gain, 0, t + len + 0.5); };
  const pluck = (t, m, len = 0.2, v = 1) => { const g = gain(0, music); g.connect(gain(0.3, rev)); const lp = filt('lowpass', 5000, 2, g); const o1 = osc('square', mtof(m), lp), o2 = osc('sawtooth', mtof(m), lp); o2.detune.value = 9; at(lp.frequency, 6000, t); ex(lp.frequency, 900, t + 0.18); at(g.gain, 0, t); lin(g.gain, 0.11 * v, t + 0.004); ex(g.gain, 0.001, t + len + 0.15); play(o1, t, len + 0.2); play(o2, t, len + 0.2); };
  const guitar = (t, m, v = 1) => { const g = gain(0, music); g.connect(gain(0.4, rev)); [[1, 1], [2, 0.35], [3, 0.12]].forEach(([h, a]) => { const og = gain(a, g); play(osc('triangle', mtof(m) * h, og), t, 1.2); }); at(g.gain, 0, t); lin(g.gain, 0.09 * v, t + 0.005); ex(g.gain, 0.001, t + 1.1); };
  // ---- efectos ----
  const coin = (t, v = 1, hi = 0) => { const g = gain(0, sfx), o = osc('square', mtof(83 + hi), g); at(o.frequency, mtof(83 + hi), t); at(o.frequency, mtof(88 + hi), t + 0.07); at(g.gain, 0.07 * v, t); ex(g.gain, 0.001, t + 0.35); play(o, t, 0.4); };
  const whoosh = (t, len = 0.4, v = 1, f0 = 300, f1 = 3500) => { const g = gain(0, sfx); g.connect(gain(0.3, rev)); const bp = filt('bandpass', f0, 1.4, g); noise(t, len, bp); at(bp.frequency, f0, t); ex(bp.frequency, f1, t + len * 0.6); ex(bp.frequency, f0 * 1.5, t + len); at(g.gain, 0, t); lin(g.gain, 0.45 * v, t + len * 0.55); ex(g.gain, 0.001, t + len); };
  const impact = (t, v = 1, f = 70) => { const g = gain(0, sfx), o = osc('sine', f * 2.2, g); at(o.frequency, f * 2.2, t); ex(o.frequency, f * 0.5, t + 0.5); at(g.gain, 0.8 * v, t); ex(g.gain, 0.001, t + 0.8); play(o, t, 0.9); const ng = gain(0, sfx); noise(t, 0.4, filt('lowpass', 1200, 0.8, ng)); at(ng.gain, 0.5 * v, t); ex(ng.gain, 0.001, t + 0.4); };
  const knock = (t, v = 1) => { const g = gain(0, sfx); g.connect(gain(0.3, rev)); [[620, 0.09, 0.7], [1180, 0.05, 0.3], [180, 0.18, 0.8]].forEach(([f, d, a]) => { const og = gain(0, g); play(osc('sine', f, og), t, d); at(og.gain, a, t); ex(og.gain, 0.001, t + d); }); at(g.gain, 0.9 * v, t); };
  const pop = (t, v = 1) => { const g = gain(0, sfx), o = osc('sine', 900, g); at(o.frequency, 900, t); ex(o.frequency, 260, t + 0.08); at(g.gain, 0.25 * v, t); ex(g.gain, 0.001, t + 0.1); play(o, t, 0.12); };
  const tick = (t, v = 1) => { const g = gain(0, sfx), o = osc('sine', 1900, g); at(g.gain, 0.16 * v, t); ex(g.gain, 0.001, t + 0.035); play(o, t, 0.05); };
  const ballKick = (t, v = 1) => { const g = gain(0, sfx), o = osc('sine', 220, g); at(o.frequency, 260, t); ex(o.frequency, 90, t + 0.06); at(g.gain, 0.5 * v, t); ex(g.gain, 0.001, t + 0.1); play(o, t, 0.12); const ng = gain(0, sfx); noise(t, 0.02, filt('bandpass', 1500, 1, ng)); at(ng.gain, 0.3 * v, t); ex(ng.gain, 0.001, t + 0.025); };
  const whistle = (t, len = 0.35, v = 1) => { const g = gain(0, sfx); g.connect(gain(0.3, rev)); const o = osc('sine', 2900, g); const lfo = osc('sine', 38); const lg = gain(160); lfo.connect(lg); lg.connect(o.frequency); play(o, t, len); play(lfo, t, len); at(g.gain, 0, t); lin(g.gain, 0.14 * v, t + 0.02); at(g.gain, 0.14 * v, t + len - 0.04); lin(g.gain, 0, t + len); };
  // público: ruido filtrado con "olas"; rugido en los goles
  const crowd = (t0, t1, v = 1) => { const g = gain(0); const bp = filt('bandpass', 900, 0.6); const lp = filt('lowpass', 2600, 0.7, g); bp.connect(lp); g.connect(sfx); noise(t0, t1 - t0, bp); at(g.gain, 0, t0); lin(g.gain, 0.09 * v, t0 + 0.6); for (let k = t0 + 1; k < t1 - 0.5; k += 1.3) lin(g.gain, (0.07 + 0.04 * Math.abs(Math.sin(k * 1.7))) * v, k); lin(g.gain, 0, t1); };
  const roar = (t, v = 1, len = 2.4) => { const g = gain(0); const bp = filt('bandpass', 1100, 0.5, g); g.connect(sfx); g.connect(gain(0.5, rev)); noise(t, len, bp); at(bp.frequency, 700, t); ex(bp.frequency, 1500, t + 0.4); at(g.gain, 0, t); lin(g.gain, 0.4 * v, t + 0.15); ex(g.gain, 0.12 * v, t + len * 0.7); lin(g.gain, 0, t + len); };
  const ooh = (t, v = 1) => { const g = gain(0); const bp = filt('bandpass', 600, 1.2, g); g.connect(sfx); noise(t, 1.2, bp); at(bp.frequency, 900, t); ex(bp.frequency, 450, t + 1); at(g.gain, 0, t); lin(g.gain, 0.25 * v, t + 0.12); lin(g.gain, 0, t + 1.1); };
  const horn = (t, v = 1) => { const g = gain(0); const lp = filt('lowpass', 2400, 1, g); g.connect(sfx); g.connect(gain(0.4, rev)); [233, 234.5, 466].forEach(f => play(osc('sawtooth', f, lp), t, 0.9)); at(g.gain, 0, t); lin(g.gain, 0.1 * v, t + 0.04); at(g.gain, 0.1 * v, t + 0.75); lin(g.gain, 0, t + 0.9); };
  const birds = (t0, t1) => { let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let k = t0; k < t1; k += 0.4 + r() * 1.1) { const n = 2 + Math.floor(r() * 4), base = 2600 + r() * 1800; for (let j = 0; j < n; j++) { const tt = k + j * 0.09, g = gain(0, sfx), o = osc('sine', base, g); at(o.frequency, base * 1.25, tt); ex(o.frequency, base * 0.85, tt + 0.07); at(g.gain, 0.025, tt); ex(g.gain, 0.001, tt + 0.08); play(o, tt, 0.1); } } };
  const breeze = (t0, t1, v = 1) => { const g = gain(0); const lp = filt('lowpass', 900, 0.5, g); g.connect(sfx); noise(t0, t1 - t0, lp); at(g.gain, 0, t0); lin(g.gain, 0.05 * v, t0 + 0.5); lin(g.gain, 0, t1); };

  // ================= guion =================
  const U = u => S.ui[0] + u; // tiempo local del juego → global
  // parque (clips): ambiente + guitarra suave
  birds(0, S.ui[0] + 0.2); breeze(0, S.ui[0] + 0.3, 1);
  [[0, [57, 64, 69, 72]], [2.4, [53, 60, 65, 69]], [4.8, [48, 55, 64, 67]]].forEach(([t, ns]) => ns.forEach((m, i) => guitar(t + i * 0.06, m, 0.8)));
  // entra el juego: ¡ritmo!
  const beat = (t0, t1, full = true) => { for (let b = t0; b < t1 - 1e-6; b += 0.5) { kick(b); if (Math.round((b - t0) * 2) % 4 === 2) clap(b, 0.8); hat(b + 0.25, 0.9, true); if (full) { hat(b, 0.4); shaker(b + 0.125); shaker(b + 0.375, 0.7); } } };
  const harm = (t0, t1, prog, arp = true) => {
    for (let t = t0, i = 0; t < t1 - 1e-6; t += 2, i++) {
      const [root, ns] = CH[prog[i % prog.length]], e = Math.min(t + 2, t1);
      for (let k = t; k < e - 1e-6; k += 0.25) bass(k, root + (Math.round(k * 4) % 2 ? 12 : 0), 0.2);
      pad(t, ns, e - t - 0.05, 1, 2300);
      if (arp) { const pat = [0, 1, 2, 3, 2, 1, 3, 1]; let j = 0; for (let k = t; k < e - 1e-6; k += 0.125) { pluck(k, ns[pat[j % 8] % ns.length] + 12, 0.1, 0.5); j++; } }
    }
  };
  const g0 = S.ui[0];
  impact(g0, 0.6, 60); whoosh(g0 - 0.3, 0.35, 0.8, 400, 5000);
  beat(g0, U(FT.kickoff - 0.5)); harm(g0, U(FT.kickoff - 0.5), ['Am', 'F', 'C', 'G']);
  // subasta
  [[FT.bid1, 0], [FT.bid2, 1], [FT.bid3, 0]].forEach(([u, p]) => { coin(U(u), 1, p ? -5 : 0); pop(U(u), 0.4); });
  for (let n = 3; n >= 1; n--) tick(U(FT.bid3 + (10 - n) / 7.3), 1.2);
  knock(U(FT.sold), 1.3); impact(U(FT.sold), 0.7, 80); for (let i = 0; i < 5; i++) pop(U(FT.sold) + 0.08 + i * 0.05, 0.3);
  [0, 1, 2].forEach(i => { whoosh(U(FT.montage + i * 0.45 - 0.15), 0.3, 0.6, 500, 6000); knock(U(FT.montage + i * 0.45 + 0.15), 0.7); });
  // once 4-3-3: un "pop" por jugador
  for (let i = 0; i < 11; i++) { pop(U(FT.squad + 0.3 + i * 0.12), 0.5); pluck(U(FT.squad + 0.3 + i * 0.12), 72 + [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 19][i], 0.12, 0.6); }
  // saque inicial
  whoosh(U(FT.kickoff - 0.55), 0.5, 0.8, 200, 4000); whistle(U(FT.kickoff), 0.45); crowd(U(FT.kickoff - 0.3), U(FT.end) + 0.5, 1);
  beat(U(FT.kickoff), U(FT.full)); harm(U(FT.kickoff), U(FT.full), ['Am', 'F', 'C', 'G', 'Am', 'Em', 'F', 'G'], false);
  // pases y disparos (mismos tiempos que la animación)
  const passes = [0, 0.55, 1.1, 1.6, 2.05].map(d => FT.kickoff + d).concat([FT.goal1 + 1.0, FT.goal1 + 1.35, FT.goal1 + 1.75, FT.goal1 + 2.05, FT.save + 0.45, FT.save + 0.85, FT.save + 1.25, FT.goal2 - 0.3]);
  passes.forEach(u => ballKick(U(u), 0.8));
  [FT.goal1 - 0.35, FT.save - 0.25, FT.goal2 - 0.12].forEach(u => ballKick(U(u), 1.3));
  [FT.goal1, FT.goal2].forEach(u => { impact(U(u), 1, 55); roar(U(u), 1.2, 2.6); horn(U(u) + 0.15, 1); [72, 76, 79, 84].forEach((m, i) => pluck(U(u) + 0.05 + i * 0.08, m, 0.3, 1)); });
  ooh(U(FT.save) - 0.05, 1); knock(U(FT.save), 0.6);
  // pitido final y fanfarria
  [0, 0.3, 0.6].forEach(d => whistle(U(FT.full) + d, d === 0.6 ? 0.6 : 0.22));
  roar(U(FT.full) + 0.5, 1, 2.4);
  [[0, [72, 76, 79]], [0.25, [74, 77, 81]], [0.5, [76, 79, 84]], [1.0, [72, 76, 79, 84]]].forEach(([d, ns]) => ns.forEach(m => pluck(U(FT.full) + 0.5 + d, m, d === 1 ? 0.6 : 0.18, 1)));
  // reacción del amigo: la música baja, vuelve el parque
  birds(S.clip3[0], S.end[0] + 0.5); breeze(S.clip3[0], S.end[0] + 0.5, 0.8);
  [[S.clip3[0], [57, 64, 69, 72]], [S.clip3[0] + 2.2, [53, 60, 65, 69]]].forEach(([t, ns]) => ns.forEach((m, i) => guitar(t + i * 0.06, m, 0.9)));
  // cierre
  const e0 = S.end[0];
  kick(e0, 1.3); impact(e0, 0.7, 60); whoosh(e0 - 0.3, 0.35, 0.7);
  pad(e0, [55, 60, 64, 67, 72, 76], dur - e0 - 0.4, 1.4, 3000); bass(e0, 48, 2.6, 1.1);
  [0, 0.12, 0.24, 0.36].forEach((d, i) => pluck(e0 + 0.5 + d, [72, 76, 79, 84][i], 0.3, 0.9));
  knock(e0 + 0.5, 1.1);

  // ---- audio real de los clips (si existen) ----
  async function clipAudio(name, t0, t1, fadeOut = 0.15) {
    try {
      const buf = await (await fetch(`clips/${name}.mp4`)).arrayBuffer();
      const ab = await ctx.decodeAudioData(buf);
      const src = ctx.createBufferSource(); src.buffer = ab; const g = gain(0, voice); src.connect(g);
      src.start(t0, clipIn[name] || 0, Math.max(0.01, t1 - t0));
      at(g.gain, 0, t0); lin(g.gain, 1, t0 + 0.05); at(g.gain, 1, t1 - fadeOut); lin(g.gain, 0, t1);
      // la música se aparta mientras hablan
      at(musicBus.gain, 1, t0 - 0.2); lin(musicBus.gain, 0.35, t0); at(musicBus.gain, 0.35, t1 - 0.1); lin(musicBus.gain, 1, t1 + 0.2);
      return true;
    } catch { return false; }
  }
  await clipAudio('park1', S.clip1[0], S.clip1[1]);
  await clipAudio('park2', S.clip2[0], S.clip2[1] + 0.3, 0.4);
  await clipAudio('park3', S.clip3[0], S.clip3[1]);

  at(master.gain, 0.85, dur - 1.3); lin(master.gain, 0, dur - 0.05);
  kicks.sort((a, b) => a - b).forEach(k => { at(duck.gain, 1, k - 0.001); lin(duck.gain, 0.4, k + 0.01); lin(duck.gain, 1, k + 0.2); });
  return ctx.startRendering();
}
