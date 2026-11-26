// Spot 2: "What game is that?" — dos amigos en un parque (clips reales generados con IA) + simulación del modo fútbol.
// Los clips van en promo/clips/: park1.mp4 (pregunta), park2.mp4 (explicación), park3.mp4 (reacción). Si faltan, se ve un hueco gris.
import { createFutbol, FT, FUT_NAMES } from './futbol.js';
import { K, E, clamp, prog, lerp, pulse, rng, TAU } from './util.js';
import { exportMP4 } from './encode.js';

export const W = 1080, H = 1920, FPS = 30;
const SITE = new URLSearchParams(location.search).get('site') || 'bidverse-cdiy.onrender.com';

// guion global (segundos)
export const S = {
  clip1: [0, 6.3], clip2: [6.3, 6.3], ui: [6.3, 6.3 + FT.end],
};
S.clip3 = [S.ui[1], S.ui[1] + 4.8];
S.end = [S.clip3[1], S.clip3[1] + 4.2];
export const DUR = S.end[1];
// recortes dentro de cada clip (inicio en el archivo)
const CLIP_IN = { park1: 0.0, park2: 0.0, park3: 0.0 };
// subtítulos: lo que dice cada uno (las frases de los clips las dicen ellos; las del juego las explica él en voz en off)
const SUBS = [
  [4.3, 6.3, 'B', 'Yo… what game is that?'],
  [6.4, 9.2, 'A', "It's BidVerse! You each get €100M…"],
  [9.2, 11.6, 'A', '…and bid LIVE on real players!'],
  [11.6, 14.3, 'A', 'Legends + stars. Build your XI…'],
  [14.3, 19.0, 'A', '…then your teams play the match!'],
  [19.0, 23.4, 'A', 'Best squad wins. Bragging rights!'],
  [S.clip3[0] + 0.4, S.clip3[1], 'B', 'No way. Send me the link!'],
];

const loadImg = (src, cors) => new Promise(ok => { const i = new Image(); if (cors) i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; setTimeout(() => ok(null), 15000); });
async function loadVideo(src) {
  // se carga entero como blob: el servidor local no admite peticiones parciales y así el seek es exacto
  const r = await fetch(src).catch(() => null);
  if (!r || !r.ok) return null;
  const url = URL.createObjectURL(await r.blob());
  return new Promise(ok => {
    const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.playsInline = true;
    v.onloadeddata = () => ok(v); v.onerror = () => ok(null); v.src = url; setTimeout(() => ok(null), 20000);
  });
}

export async function init(holder) {
  await Promise.all(['900 100px "Big Shoulders Display"', '800 100px "Big Shoulders Display"', '900 40px Nunito', '800 40px Nunito', '700 40px Nunito'].map(f => document.fonts.load(f)));
  await new Promise(ok => { const s = document.createElement('script'); s.src = '../data-imgs.js'; s.onload = ok; s.onerror = ok; document.head.appendChild(s); });
  const URLS = (() => { try { return (0, eval)('IMG_URLS'); } catch { return {}; } })();
  const img = {};
  await Promise.all(FUT_NAMES.map(async n => { img[n] = URLS[n] ? await loadImg(URLS[n], true) : null; }));
  const logo = await loadImg('../pics/LogoBidVerse.png');
  const clips = {};
  for (const k of ['park1', 'park2', 'park3']) clips[k] = await loadVideo(`clips/${k}.mp4`);
  const fut = createFutbol(img, logo);

  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const o = out.getContext('2d');
  const blurC = document.createElement('canvas'); blurC.width = W; blurC.height = H;

  // dibuja el fotograma de un clip (cover a 9:16); seek exacto para el render
  async function clipFrame(name, tLocal) {
    const v = clips[name];
    if (!v) { // hueco provisional
      const g = o.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6fa86a'); g.addColorStop(1, '#2d5a2a'); o.fillStyle = g; o.fillRect(0, 0, W, H);
      o.font = '900 80px Nunito'; o.fillStyle = 'rgba(255,255,255,.7)'; o.textAlign = 'center'; o.fillText(`[${name}: real park clip]`, W / 2, H / 2); return;
    }
    const tt = Math.min(v.duration - 0.05, CLIP_IN[name] + tLocal);
    if (Math.abs(v.currentTime - tt) > 0.001) { v.currentTime = tt; await new Promise(r => { v.onseeked = r; setTimeout(r, 1500); }); await new Promise(r => { v.requestVideoFrameCallback(() => r()); setTimeout(r, 120); }); }
    const s = Math.max(W / v.videoWidth, H / v.videoHeight), iw = v.videoWidth * s, ih = v.videoHeight * s;
    o.drawImage(v, (W - iw) / 2, (H - ih) / 2, iw, ih);
  }
  function subtitle(t) {
    const s = SUBS.find(x => t >= x[0] && t < x[1]); if (!s) return;
    const inUI = t >= S.ui[0] && t < S.ui[1];
    const k = E.outBack(prog(t, s[0], s[0] + 0.25)), a = 1 - prog(t, s[1] - 0.15, s[1]);
    const who = s[2], col = who === 'A' ? '#ffb02e' : '#4aa3ff';
    o.save(); o.globalAlpha = a; o.font = inUI ? '900 50px Nunito' : '900 58px Nunito';
    const words = s[3].split(' '), lines = []; let cur = '';
    for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (o.measureText(tr).width > W - 200 && cur) { lines.push(cur); cur = w; } else cur = tr; }
    lines.push(cur);
    const lh = inUI ? 62 : 72, bh = lines.length * lh + (inUI ? 36 : 50), bw = Math.max(...lines.map(l => o.measureText(l).width)) + 90, by = inUI ? H - 28 - bh : H - 330 - bh;
    o.translate(W / 2, by + bh / 2); o.scale(k, k); o.translate(-W / 2, -(by + bh / 2));
    o.fillStyle = 'rgba(8,10,12,.78)'; o.beginPath(); o.roundRect((W - bw) / 2, by, bw, bh, 30); o.fill();
    o.fillStyle = col; o.beginPath(); o.roundRect((W - bw) / 2, by, 12, bh, 6); o.fill();
    o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'middle';
    lines.forEach((l, i) => o.fillText(l, W / 2 + 6, by + (inUI ? 18 : 25) + lh / 2 + i * lh));
    o.restore();
  }
  function endCard(t) {
    const d = t - S.end[0];
    // fondo: último fotograma del parque desenfocado + degradado de marca
    o.save(); o.filter = 'blur(26px) brightness(.55)'; o.drawImage(blurC, -60, -60, W + 120, H + 120); o.restore();
    const g = o.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(91,34,201,.72)'); g.addColorStop(1, 'rgba(10,40,30,.82)'); o.fillStyle = g; o.fillRect(0, 0, W, H);
    const lk = prog(d, 0.05, 0.5), ls = lerp(2, 1, E.outBack(lk)), lw = 880, lh = lw * logo.height / logo.width;
    o.save(); o.globalAlpha = clamp(lk * 3); o.translate(W / 2, 420); o.scale(ls, ls);
    o.save(); o.globalCompositeOperation = 'lighter'; o.globalAlpha = 0.45; o.filter = 'blur(30px)'; o.drawImage(logo, -lw / 2, -lh / 2, lw, lh); o.restore();
    o.drawImage(logo, -lw / 2, -lh / 2, lw, lh); o.restore();
    const words = ['BID.', 'BUILD.', 'WIN.'], cols = ['#fff', '#ffb02e', '#fff'];
    o.save(); o.font = '900 120px "Big Shoulders Display"';
    const ws = words.map(w => o.measureText(w).width), tot = ws.reduce((a, b) => a + b, 0) + 52; let x0 = (W - tot) / 2;
    words.forEach((w, i) => { const k = E.outBack(prog(d, 0.45 + i * 0.15, 0.75 + i * 0.15)); o.save(); o.globalAlpha = clamp(k * 2); o.translate(x0 + ws[i] / 2, 740); o.scale(k, k); o.lineWidth = 14; o.lineJoin = 'round'; o.strokeStyle = 'rgba(10,4,30,.85)'; o.textAlign = 'center'; o.strokeText(w, 0, 0); o.fillStyle = cols[i]; o.fillText(w, 0, 0); o.restore(); x0 += ws[i] + 26; });
    o.restore();
    const sk = E.outC(prog(d, 0.9, 1.2));
    o.save(); o.globalAlpha = sk; o.font = '800 48px Nunito'; o.fillStyle = 'rgba(255,255,255,.95)'; o.textAlign = 'center';
    o.fillText('Live player auctions with your friends', W / 2, 850); o.fillText('Football · Anime · UFC — free to play', W / 2, 915); o.restore();
    // URL en grande
    const ck = E.outBack(prog(d, 0.7, 1.1)), pul = 1 + Math.sin(t * 5) * 0.015 * (d > 1.2 ? 1 : 0);
    o.save(); o.globalAlpha = clamp(ck * 2); o.translate(W / 2, 1370); o.scale(ck, ck);
    o.font = '900 80px "Big Shoulders Display"'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.letterSpacing = '6px';
    o.lineWidth = 12; o.lineJoin = 'round'; o.strokeStyle = 'rgba(10,4,30,.85)'; o.strokeText('PLAY NOW AT', 0, 0); o.fillStyle = '#ffcf5a'; o.fillText('PLAY NOW AT', 0, 0); o.letterSpacing = '0px'; o.restore();
    o.save(); o.translate(W / 2, 1540); o.scale(ck * pul, ck * pul);
    let fs = 96; o.font = '900 ' + fs + 'px Nunito'; while (o.measureText(SITE).width > W - 150 && fs > 40) { fs -= 2; o.font = '900 ' + fs + 'px Nunito'; }
    const uw = o.measureText(SITE).width + 90, uh = fs * 1.9;
    o.shadowColor = 'rgba(155,92,255,.9)'; o.shadowBlur = 60;
    const gg = o.createLinearGradient(-uw / 2, 0, uw / 2, 0); gg.addColorStop(0, '#ffb02e'); gg.addColorStop(0.5, '#9b5cff'); gg.addColorStop(1, '#3d8bff');
    o.fillStyle = gg; o.beginPath(); o.roundRect(-uw / 2 - 10, -uh / 2 - 10, uw + 20, uh + 20, (uh + 20) / 2); o.fill(); o.shadowBlur = 0;
    o.fillStyle = '#fff'; o.beginPath(); o.roundRect(-uw / 2, -uh / 2, uw, uh, uh / 2); o.fill();
    o.fillStyle = '#1b0b3d'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText(SITE, 0, 4); o.restore();
  }
  function vignette(strength = 1) {
    const g = o.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.35 * strength})`); o.fillStyle = g; o.fillRect(0, 0, W, H);
  }

  async function frame(t) {
    t = Math.min(t, DUR - 1e-3);
    o.save(); o.fillStyle = '#000'; o.fillRect(0, 0, W, H);
    if (t < S.clip1[1]) await clipFrame('park1', t - S.clip1[0]);
    else if (t < S.clip2[1]) await clipFrame('park2', t - S.clip2[0]);
    else if (t < S.ui[1]) fut.draw(o, t - S.ui[0]);
    else if (t < S.clip3[1]) { await clipFrame('park3', t - S.clip3[0]); if (t > S.clip3[1] - 0.2) blurC.getContext('2d').drawImage(out, 0, 0); }
    else endCard(t);
    vignette(t >= S.ui[0] && t < S.ui[1] ? 0.5 : 1);
    subtitle(t);
    // transiciones: destello al entrar/salir del juego y fundido final
    for (const c of [S.ui[0], S.ui[1], S.end[0]]) { const k = pulse(t, c - 0.1, c + 0.15, 0.1, 0.15); if (k > 0) { o.fillStyle = `rgba(255,255,255,${0.8 * k})`; o.fillRect(0, 0, W, H); } }
    const f = prog(t, DUR - 0.3, DUR); if (f > 0) { o.fillStyle = `rgba(0,0,0,${f})`; o.fillRect(0, 0, W, H); }
    o.restore();
    return out;
  }
  async function sheet(times, cols = 4, scale = 0.25) {
    const rows = Math.ceil(times.length / cols), s = document.createElement('canvas'); s.width = W * scale * cols; s.height = H * scale * rows;
    const x = s.getContext('2d'); x.fillStyle = '#222'; x.fillRect(0, 0, s.width, s.height);
    for (let i = 0; i < times.length; i++) { await frame(times[i]); const X = (i % cols) * W * scale, Y = Math.floor(i / cols) * H * scale; x.drawImage(out, X, Y, W * scale, H * scale); x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(X, Y, 120, 40); x.fillStyle = '#ff0'; x.font = '700 28px monospace'; x.fillText(times[i].toFixed(2), X + 8, Y + 30); }
    return s.toDataURL('image/jpeg', 0.85);
  }
  async function still(t, scale = 0.5) { await frame(t); const s = document.createElement('canvas'); s.width = W * scale; s.height = H * scale; s.getContext('2d').drawImage(out, 0, 0, s.width, s.height); return s.toDataURL('image/jpeg', 0.85); }
  async function render(opts = {}) {
    const mod = await import('./audio2.js').catch(() => null);
    const audio = mod ? await mod.renderSoundtrack2(DUR, clips, CLIP_IN) : null;
    return exportMP4({ canvas: out, frame, dur: DUR, fps: FPS, audio, name: opts.name || 'BidVerse_park_football.mp4', hw: opts.hw || 'prefer-hardware' });
  }
  if (holder) holder.appendChild(out);
  const missing = Object.entries(clips).filter(([, v]) => !v).map(([k]) => k);
  const noImg = FUT_NAMES.filter(n => !img[n]);
  return { frame, sheet, still, render, out, DUR, FPS, missing, noImg };
}
