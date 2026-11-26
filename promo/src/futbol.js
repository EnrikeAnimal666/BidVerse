// Simulación vistosa del modo fútbol de BidVerse (en inglés) para el segundo spot.
// drawFutbol(ctx, u): u = segundos desde el inicio de la secuencia. Subasta → once 4-3-3 → partido.
import { K, E, clamp, prog, lerp, rng, TAU, pulse, noise } from './util.js';

export const W = 1080, H = 1920;
const C = { bg: '#07130c', ink: '#f3e6c8', mut: '#9aa39c', p1: '#ffb02e', p2: '#4aa3ff', gold: '#f5c542', green: '#2fd04f', red: '#ff3344' };
const PC = [C.p1, C.p2];
const F = (w, s, fam = 'Nunito') => `${w} ${s}px "${fam}"`;
const DISP = 'Big Shoulders Display';

// tiempos de la secuencia (segundos locales)
export const FT = { auction: 0, bid1: 0.55, bid2: 1.15, bid3: 1.75, sold: 3.1, montage: 3.75, squad: 5.2, kickoff: 8.0, goal1: 10.6, save: 12.9, goal2: 14.7, full: 15.9, end: 17.2 };

export const P1 = ['Gianluigi Buffon', 'Cafu', 'Paolo Maldini', 'Franz Beckenbauer', 'Roberto Carlos', 'Andrea Pirlo', 'Zinedine Zidane', 'Jude Bellingham', 'Lamine Yamal', 'Kylian Mbappé', 'Cristiano Ronaldo'];
export const P2 = ['Iker Casillas', 'Achraf Hakimi', 'Sergio Ramos', 'Virgil van Dijk', 'Carles Puyol', 'Luka Modrić', 'Andrés Iniesta', 'Kevin De Bruyne', 'Thierry Henry', 'Erling Haaland', 'Lionel Messi'];
const OVR = { 'Kylian Mbappé': 92, 'Lionel Messi': 98, 'Cristiano Ronaldo': 97, 'Zinedine Zidane': 95, 'Gianluigi Buffon': 93 };
const ROLE = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
const short = n => { const p = n.split(' '); return p.length > 1 && n !== 'Cafu' ? p[p.length - 1] : n; };

function rr(x, X, Y, w, h, r) { x.beginPath(); x.roundRect(X, Y, w, h, r); }
function text(x, s, X, Y, font, col, align = 'left', ls = 0, base = 'alphabetic') {
  x.font = font; x.fillStyle = col; x.textAlign = align; x.textBaseline = base; x.letterSpacing = ls + 'px'; x.fillText(s, X, Y); x.letterSpacing = '0px';
}
function outlined(x, s, X, Y, size, col, stroke = '#05110a', lw = 0.12, rot = 0, sc = 1) {
  x.save(); x.translate(X, Y); x.rotate(rot); x.scale(sc, sc);
  x.font = F(900, size, DISP); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = size * lw; x.strokeStyle = stroke; x.strokeText(s, 0, 0); x.fillStyle = col; x.fillText(s, 0, 0); x.restore();
}
function cover(x, img, X, Y, w, h, ox = 0.5, oy = 0.2, zoom = 1) {
  if (!img || !img.width) { x.fillStyle = '#1d2a22'; x.fillRect(X, Y, w, h); return; }
  const s = Math.max(w / img.width, h / img.height) * zoom, iw = img.width * s, ih = img.height * s;
  x.save(); x.beginPath(); x.rect(X, Y, w, h); x.clip(); x.drawImage(img, X + (w - iw) * ox, Y + (h - ih) * oy, iw, ih); x.restore();
}
function glow(x, X, Y, r, col, a = 1) {
  const g = x.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.save(); x.globalAlpha = a; x.globalCompositeOperation = 'lighter'; x.fillStyle = g; x.fillRect(X - r, Y - r, r * 2, r * 2); x.restore();
}
function confetti(x, u, u0, seed, ox, oy, n = 120, cols = ['#ffb02e', '#ffffff', '#f5c542', '#2fd04f']) {
  const d = u - u0; if (d < 0 || d > 3) return;
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.6, v = 900 + r() * 1600, w = 14 + r() * 16, h = 8 + r() * 10, sp = (r() - 0.5) * 20, dr = 1.6 + r();
    const px = ox + Math.cos(a) * v * (1 - Math.exp(-d * dr)) / dr + Math.sin(d * 3 + i) * 40 * d;
    const py = oy + Math.sin(a) * v * (1 - Math.exp(-d * dr)) / dr + 900 * d * d * 0.5;
    x.save(); x.globalAlpha = clamp(3 - d); x.translate(px, py); x.rotate(sp * d); x.scale(1, Math.cos(d * (6 + i % 5)));
    x.fillStyle = cols[i % cols.length]; x.fillRect(-w / 2, -h / 2, w, h); x.restore();
  }
}
function face(x, img, X, Y, r, col, name, dim = 0) {
  x.save(); x.beginPath(); x.arc(X, Y, r, 0, TAU); x.clip();
  x.fillStyle = '#16231b'; x.fillRect(X - r, Y - r, r * 2, r * 2);
  if (img && img.width) cover(x, img, X - r, Y - r, r * 2, r * 2, 0.5, 0.15);
  else { x.fillStyle = col; x.font = F(900, r * 0.9); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name.split(' ').map(s => s[0]).join('').slice(0, 2), X, Y); }
  if (dim) { x.fillStyle = `rgba(0,0,0,${dim})`; x.fillRect(X - r, Y - r, r * 2, r * 2); }
  x.restore();
  x.strokeStyle = col; x.lineWidth = Math.max(4, r * 0.16); x.beginPath(); x.arc(X, Y, r, 0, TAU); x.stroke();
}

export function createFutbol(img, logo) {
  // fondo del modo fútbol: verde oscuro con focos de estadio
  function bg(x, u) {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1f13'); g.addColorStop(1, '#030806');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const cx = 100 + i * 220 + Math.sin(u * 0.6 + i) * 30, a = 0.05 + 0.03 * Math.sin(u * 1.3 + i * 2);
      const gg = x.createLinearGradient(cx, 0, cx, H * 0.9); gg.addColorStop(0, `rgba(220,255,220,${a + 0.05})`); gg.addColorStop(1, 'rgba(220,255,220,0)');
      x.fillStyle = gg; x.beginPath(); x.moveTo(cx - 30, 0); x.lineTo(cx + 30, 0); x.lineTo(cx + 170, H * 0.9); x.lineTo(cx - 170, H * 0.9); x.fill();
    }
    x.restore();
    if (logo) { const h = 110, w = logo.width / logo.height * h; x.drawImage(logo, 46, 46, w, h); }
  }

  // ---------- SUBASTA ----------
  const BIDS = [[FT.bid1, 0, 15], [FT.bid2, 1, 22], [FT.bid3, 0, 31]];
  function card(x, X, Y, w, h, name, ovr, pos, club, flag, lead, price, inc, since, extra = {}) {
    const lc = lead < 0 ? '#5d6b62' : PC[lead], flash = since < 9 ? Math.exp(-since * 7) : 0;
    if (lead >= 0) glow(x, X + w / 2, Y + h / 2, w, lead ? 'rgba(74,163,255,.35)' : 'rgba(255,176,46,.35)', 0.7 + flash);
    x.fillStyle = '#0d1410'; rr(x, X, Y, w, h, 12); x.fill();
    x.lineWidth = 10 + flash * 10; x.strokeStyle = lc; rr(x, X, Y, w, h, 12); x.stroke();
    text(x, extra.header || 'FORWARDS', X + 34, Y + 62, F(800, 32), C.ink, 'left', 8);
    const ih = h * 0.6;
    cover(x, img[name], X + 8, Y + 92, w - 16, ih, 0.5, 0.18, 1 + Math.min(since, 4) * 0.01);
    if (flash > 0.01) { x.save(); x.globalAlpha = flash * 0.45; x.fillStyle = lc; x.fillRect(X + 8, Y + 92, w - 16, ih); x.restore(); }
    // insignia de media
    x.fillStyle = 'rgba(8,12,10,.88)'; rr(x, X + 30, Y + 116, 150, 160, 10); x.fill(); x.strokeStyle = C.ink; x.lineWidth = 4; x.stroke();
    text(x, String(ovr), X + 105, Y + 218, F(900, 96, DISP), C.ink, 'center');
    text(x, pos, X + 105, Y + 258, F(900, 30), C.ink, 'center', 4);
    text(x, name, X + 40, Y + 92 + ih + 96, F(900, name.length > 14 ? 70 : 84), C.ink);
    text(x, `${flag}  ${ovr} ${pos} · ${club}`, X + 42, Y + 92 + ih + 150, F(700, 34), C.mut);
    text(x, 'LAST BID', X + 42, Y + h - 150, F(700, 30), C.mut, 'left', 6);
    const bump = 1 + Math.exp(-since * 9) * 0.4 * (price ? 1 : 0);
    x.save(); x.translate(X + 40, Y + h - 40); x.scale(bump, bump); text(x, price ? price + 'M' : '—', 0, 0, F(900, 130, DISP), C.ink); x.restore();
    if (price) {
      const fl = prog(since, 0, 0.9);
      x.save(); x.globalAlpha = 1 - fl * 0.6; text(x, '+' + inc + 'M', X + w - 40, Y + h - 150 - fl * 30, F(900, 66), lc, 'right'); x.restore();
      x.fillStyle = lc; rr(x, X + w - 300, Y + h - 120, 260, 72, 6); x.fill();
      text(x, `PLAYER ${lead + 1}`, X + w - 170, Y + h - 72, F(900, 32), lead ? '#fff' : '#1a1100', 'center', 4);
    }
  }
  function budgets(x, u, spent, filled) {
    [0, 1].forEach(p => {
      const X = p ? 560 : 40, Y = 200, w = 480, h = 150;
      x.fillStyle = 'rgba(10,18,13,.92)'; rr(x, X, Y, w, h, 14); x.fill(); x.fillStyle = PC[p]; x.fillRect(X, Y, w, 7);
      const al = p ? 'right' : 'left', tx = p ? X + w - 30 : X + 30;
      text(x, `PLAYER ${p + 1}`, tx, Y + 56, F(800, 28), PC[p], al, 6);
      const m = 100 - spent[p], pop = spent[p] ? pulse(u, FT.sold + 0.4, FT.sold + 0.9, 0.05, 0.3) : 0;
      x.save(); x.translate(p ? X + 30 : X + w - 30, Y + 70); x.scale(1 + pop * 0.25, 1 + pop * 0.25);
      text(x, '€' + Math.round(m) + 'M', 0, 0, F(900, 62, DISP), pop > 0.05 ? C.gold : C.ink, p ? 'left' : 'right', 0, 'middle'); x.restore();
      for (let i = 0; i < 11; i++) { x.fillStyle = i < filled[p] ? PC[p] : 'rgba(255,255,255,.12)'; rr(x, (p ? X + w - 30 - (11 - i) * 38 + 8 : X + 30 + i * 38), Y + 112, 30, 14, 7); x.fill(); }
    });
  }
  function auction(x, u) {
    bg(x, u);
    let b = null, prev = null; for (const bb of BIDS) if (u >= bb[0]) { prev = b; b = bb; }
    const sold = u >= FT.sold;
    const spent = [sold ? 31 : 0, 0];
    budgets(x, u, spent, [sold ? 7 : 6, 6]);
    const inK = E.outBack(prog(u, -0.05, 0.4)), outK = E.inC(prog(u, FT.montage - 0.1, FT.montage + 0.2));
    x.save(); x.translate(W / 2 - outK * W * 1.1, 0); x.translate(0, 1050); x.scale(inK, inK); x.rotate((1 - inK) * -0.12); x.translate(-W / 2, -1050);
    card(x, 140, 410, 800, 1120, 'Kylian Mbappé', 92, 'FWD', 'Real Madrid', '🇫🇷', b ? b[1] : -1, b ? b[2] : 0, b ? b[2] - (prev ? prev[2] : 0) : 0, b ? u - b[0] : 9);
    if (sold) {
      const k = prog(u, FT.sold, FT.sold + 0.3);
      x.save(); x.globalAlpha = 0.55 * clamp(k * 2); x.fillStyle = '#000'; rr(x, 140, 410, 800, 1120, 12); x.fill(); x.restore();
      x.save(); x.translate(W / 2, 880); x.rotate(-0.14); const s = lerp(3, 1, E.outBack(k)); x.scale(s, s); x.globalAlpha = clamp(k * 3);
      x.strokeStyle = C.p1; x.lineWidth = 14; rr(x, -300, -105, 600, 210, 24); x.stroke(); x.lineWidth = 5; rr(x, -278, -84, 556, 168, 16); x.stroke();
      text(x, 'SOLD!', 0, 0, F(900, 170, DISP), C.p1, 'center', 4, 'middle'); x.restore();
      if (k < 1) { x.save(); x.globalAlpha = 1 - k; x.strokeStyle = '#fff'; x.lineWidth = 16; x.beginPath(); x.arc(W / 2, 880, 200 + k * 520, 0, TAU); x.stroke(); x.restore(); }
    }
    x.restore();
    // reloj
    let tm = !b ? 10 - u * 2 : b[0] === FT.bid3 ? 10 - (u - b[0]) * 7.3 : 10 - (u - b[0]) * 3;
    tm = sold ? 0 : clamp(tm, 0, 10);
    if (u < FT.montage) {
      const urgent = tm < 3.5 && !sold, ty = 1625;
      text(x, '0:' + String(Math.ceil(tm)).padStart(2, '0'), 110, ty + 30, F(900, 90, DISP), urgent && Math.floor(u * 6) % 2 ? C.red : C.ink, 'center');
      x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(200, ty - 14, W - 260, 30);
      x.fillStyle = urgent ? C.red : C.ink; x.fillRect(200, ty - 14, (W - 260) * tm / 10, 30);
    }
    if (sold && u < FT.montage) confetti(x, u, FT.sold + 0.05, 9, W / 2, 900, 120);
    // montaje rápido de más lotes
    if (u >= FT.montage - 0.1) {
      const lots = [['Lionel Messi', 98, 'FWD', 'Barcelona', '🇦🇷', 1, 38], ['Cristiano Ronaldo', 97, 'FWD', 'Real Madrid', '🇵🇹', 0, 35], ['Zinedine Zidane', 95, 'MID', 'Real Madrid', '🇫🇷', 0, 24]];
      lots.forEach((l, i) => {
        const t0 = FT.montage + i * 0.45, k = prog(u, t0 - 0.15, t0 + 0.2), ko = prog(u, t0 + 0.32, t0 + 0.55);
        if (k <= 0 || (ko >= 1 && i < 2)) return;
        const X = lerp(W * 1.1, 160, E.outC(k)) - E.inC(ko) * W * (i < 2 ? 1.2 : 0);
        x.save(); x.translate(X, 460); x.rotate((i - 1) * 0.04); x.scale(0.72, 0.72);
        card(x, 0, 0, 800, 1180, l[0], l[1], l[2], l[3], l[4], l[5], l[6], l[6], 9, { header: l[2] === 'MID' ? 'MIDFIELDERS' : 'FORWARDS' });
        const sk = E.outBack(prog(u, t0 + 0.12, t0 + 0.3));
        if (sk > 0) { x.save(); x.translate(400, 420); x.rotate(-0.14); x.scale(sk, sk); x.strokeStyle = PC[l[5]]; x.lineWidth = 14; rr(x, -290, -100, 580, 200, 24); x.stroke(); text(x, 'SOLD!', 0, 0, F(900, 160, DISP), PC[l[5]], 'center', 4, 'middle'); x.restore(); }
        x.restore();
      });
    }
  }

  // ---------- ONCE 4-3-3 ----------
  const SLOT = [[0.5, 0.88], [0.13, 0.68], [0.37, 0.72], [0.63, 0.72], [0.87, 0.68], [0.22, 0.47], [0.5, 0.5], [0.78, 0.47], [0.17, 0.24], [0.5, 0.2], [0.83, 0.24]];
  function pitchV(x, X, Y, w, h, alpha = 1) {
    x.save(); x.globalAlpha = alpha;
    for (let i = 0; i < 10; i++) { x.fillStyle = i % 2 ? '#2f8f45' : '#2a823f'; x.fillRect(X, Y + (h / 10) * i, w, h / 10 + 1); }
    x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 5;
    x.strokeRect(X + 14, Y + 14, w - 28, h - 28);
    x.beginPath(); x.moveTo(X + 14, Y + h / 2); x.lineTo(X + w - 14, Y + h / 2); x.stroke();
    x.beginPath(); x.arc(X + w / 2, Y + h / 2, w * 0.14, 0, TAU); x.stroke();
    [Y + 14, Y + h - 14].forEach((gy, i) => {
      const s = i ? -1 : 1;
      x.strokeRect(X + w * 0.22, gy, w * 0.56, s * h * 0.15);
      x.strokeRect(X + w * 0.37, gy, w * 0.26, s * h * 0.06);
      x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(X + w * 0.43, gy - s * 12, w * 0.14, s * 12);
    });
    x.restore();
  }
  function squad(x, u) {
    bg(x, u);
    const d = u - FT.squad;
    const ink = E.outC(prog(d, 0, 0.35));
    x.save(); x.globalAlpha = ink;
    text(x, 'YOUR XI', W / 2, 270, F(900, 110, DISP), C.ink, 'center', 4);
    text(x, '4-3-3 · €100M BUDGET', W / 2, 330, F(800, 36), C.p1, 'center', 6);
    x.restore();
    const PX = 70, PY = 380, PW = 940, PH = 1170;
    x.save(); x.translate(0, (1 - ink) * 200); pitchV(x, PX, PY, PW, PH, ink);
    P1.forEach((n, i) => {
      const k = E.outBack(prog(d, 0.25 + i * 0.12, 0.5 + i * 0.12));
      const [sx, sy] = SLOT[i], X = PX + sx * PW, Y = PY + sy * PH;
      if (k <= 0) { x.setLineDash([12, 10]); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 4; x.beginPath(); x.arc(X, Y, 70, 0, TAU); x.stroke(); x.setLineDash([]); text(x, ROLE[i], X, Y + 12, F(800, 30), 'rgba(255,255,255,.6)', 'center'); return; }
      x.save(); x.translate(X, Y); x.scale(k, k);
      face(x, img[n], 0, 0, 74, C.p1, n);
      x.fillStyle = 'rgba(5,12,8,.85)'; rr(x, -95, 82, 190, 46, 23); x.fill();
      text(x, short(n), 0, 115, F(900, 30), '#fff', 'center');
      x.restore();
    });
    x.restore();
    // media del equipo
    const ovr = Math.round(lerp(0, 93, E.outC(prog(d, 0.3, 1.8))));
    x.save(); x.globalAlpha = ink; x.fillStyle = 'rgba(10,18,13,.92)'; rr(x, 300, 1580, 480, 110, 55); x.fill(); x.strokeStyle = C.p1; x.lineWidth = 5; x.stroke();
    text(x, 'TEAM OVR', 360, 1650, F(800, 34), C.mut, 'left', 4); text(x, String(ovr), 730, 1662, F(900, 84, DISP), C.gold, 'right'); x.restore();
    // VS antes del saque
    const vs = prog(u, FT.kickoff - 0.55, FT.kickoff - 0.05);
    if (vs > 0) {
      x.save(); x.fillStyle = `rgba(0,0,0,${0.75 * E.outC(vs)})`; x.fillRect(0, 0, W, H);
      const k = E.outBack(vs);
      outlined(x, 'KICK-OFF!', W / 2, H * 0.47, 210, '#fff', '#05110a', 0.12, -0.06, k);
      x.restore();
    }
  }

  // ---------- PARTIDO ----------
  const PX = 40, PY = 380, PW = 1000, PH = 1180;
  const base = (team, i) => { const [sx, sy] = SLOT[i]; return team === 0 ? [sx, 0.5 + (sy - 0.5) * 0.92] : [1 - sx, 0.5 - (sy - 0.5) * 0.92]; };
  // posesiones: [t, equipo, jugador] → el balón va de uno a otro; 'G' = gol, 'S' = parada
  const SEQ = [
    [FT.kickoff, 0, 6], [FT.kickoff + 0.55, 0, 5], [FT.kickoff + 1.1, 0, 7], [FT.kickoff + 1.6, 0, 6], [FT.kickoff + 2.05, 0, 9],
    [FT.goal1 - 0.35, 'shot', 0], [FT.goal1, 'G', 0],
    [FT.goal1 + 1.0, 1, 0], [FT.goal1 + 1.35, 1, 5], [FT.goal1 + 1.75, 1, 6], [FT.goal1 + 2.05, 1, 10], [FT.save - 0.25, 'shot', 1], [FT.save, 'S', 0],
    [FT.save + 0.45, 0, 1], [FT.save + 0.85, 0, 7], [FT.save + 1.25, 0, 8], [FT.goal2 - 0.3, 0, 10], [FT.goal2 - 0.12, 'shot', 0], [FT.goal2, 'G', 0],
    [FT.goal2 + 0.9, 1, 9],
  ];
  const toPx = ([sx, sy]) => [PX + sx * PW, PY + sy * PH];
  function teamPos(u) {
    // presión: el equipo con balón sube, el otro recula
    let att = 0; for (const s of SEQ) if (u >= s[0] && (s[1] === 0 || s[1] === 1)) att = s[1];
    const push = Math.min(1, prog(u, FT.kickoff, FT.kickoff + 1.5));
    const pos = [[], []];
    for (const tm of [0, 1]) for (let i = 0; i < 11; i++) {
      let [x, y] = base(tm, i);
      const dir = tm === 0 ? -1 : 1, forward = tm === att ? 0.08 : -0.05;
      if (i > 0) y += dir * forward * push;
      x += noise(u * 0.7 + i * 3.1, tm * 10 + i) * 0.035; y += noise(u * 0.6 + i * 1.7, tm * 20 + i) * 0.025;
      pos[tm].push([clamp(x, 0.06, 0.94), clamp(y, 0.04, 0.96)]);
    }
    return pos;
  }
  function ballAt(u, pos) {
    // encuentra el tramo actual
    let i = 0; while (i < SEQ.length - 1 && u >= SEQ[i + 1][0]) i++;
    const holder = s => {
      if (s[1] === 'G') return s[2] === 0 ? [0.5, 0.015] : [0.5, 0.985];
      if (s[1] === 'S') return pos[s[2] === 0 ? 0 : 1][0].map((v, j) => v + (j ? 0.02 : 0));
      if (s[1] === 'shot') { const p = pos[s[2] === 0 ? 0 : 1]; return null; }
      return pos[s[1]][s[2]];
    };
    const cur = SEQ[i], nxt = SEQ[Math.min(i + 1, SEQ.length - 1)];
    if (u < SEQ[0][0]) return [0.5, 0.5, 0];
    let a = holder(cur), b = holder(nxt);
    if (!a) a = holder(SEQ[i - 1]);
    if (!b) b = holder(SEQ[Math.min(i + 2, SEQ.length - 1)]);
    const k = cur === nxt ? 1 : clamp((u - cur[0]) / (nxt[0] - cur[0]));
    const isShot = cur[1] === 'shot';
    const e = isShot ? E.in(k) : E.io(k);
    const p = [lerp(a[0], b[0], e), lerp(a[1], b[1], e)];
    const h = isShot ? 0 : Math.sin(k * Math.PI) * 0.025 * (Math.abs(a[1] - b[1]) > 0.15 ? 1 : 0.3);
    return [p[0], p[1], h];
  }
  function scoreAt(u) { return [(u >= FT.goal1 ? 1 : 0) + (u >= FT.goal2 ? 1 : 0), 0]; }
  function match(x, u) {
    bg(x, u);
    const pos = teamPos(u), [s1, s2] = scoreAt(u);
    const minute = Math.min(90, Math.floor(lerp(0, 90, prog(u, FT.kickoff, FT.full))));
    // marcador
    x.fillStyle = 'rgba(10,18,13,.95)'; rr(x, 40, 200, 1000, 150, 14); x.fill(); x.strokeStyle = 'rgba(255,255,255,.15)'; x.lineWidth = 3; x.stroke();
    x.fillStyle = C.p1; x.fillRect(40, 200, 12, 150); x.fillStyle = C.p2; x.fillRect(1028, 200, 12, 150);
    text(x, 'Player 1', 80, 293, F(900, 46), '#fff'); text(x, 'Player 2', 1000, 293, F(900, 46), '#fff', 'right');
    const gk = Math.max(pulse(u, FT.goal1, FT.goal1 + 0.6, 0.02, 0.5), pulse(u, FT.goal2, FT.goal2 + 0.6, 0.02, 0.5));
    x.save(); x.translate(W / 2, 262); x.scale(1 + gk * 0.35, 1 + gk * 0.35); text(x, `${s1} – ${s2}`, 0, 0, F(900, 96, DISP), gk > 0.05 ? C.gold : '#fff', 'center', 0, 'middle'); x.restore();
    text(x, `${minute}'  ${minute < 45 ? '1ST HALF' : '2ND HALF'}`, W / 2, 335, F(800, 26), C.green, 'center', 4);
    // campo con temblor en los goles
    const shk = gk * 14; x.save(); x.translate(noise(u * 40, 1) * shk, noise(u * 40, 2) * shk);
    pitchV(x, PX, PY, PW, PH);
    const ball = ballAt(u, pos), bp = toPx(ball);
    // estela del balón
    for (let j = 1; j <= 6; j++) { const pb = toPx(ballAt(u - j * 0.025, pos)); x.fillStyle = `rgba(255,255,255,${0.16 - j * 0.02})`; x.beginPath(); x.arc(pb[0], pb[1], 16 - j, 0, TAU); x.fill(); }
    // jugadores (el que tiene el balón, más grande y con nombre)
    let holder = null; for (const s of SEQ) if (u >= s[0] && (s[1] === 0 || s[1] === 1)) holder = s;
    for (const tm of [1, 0]) pos[tm].forEach((p, i) => {
      const [X, Y] = toPx(p), on = holder && holder[1] === tm && holder[2] === i && u - holder[0] < 0.6;
      const r = on ? 50 : 38;
      face(x, img[(tm ? P2 : P1)[i]], X, Y, r, PC[tm], (tm ? P2 : P1)[i]);
      if (on) { x.fillStyle = PC[tm]; rr(x, X - 80, Y + 52, 160, 38, 8); x.fill(); text(x, short((tm ? P2 : P1)[i]), X, Y + 80, F(900, 26), tm ? '#fff' : '#1a1100', 'center'); }
    });
    // balón
    const bs = 1 + ball[2] * 12;
    x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(bp[0] + 6, bp[1] + 8, 15, 10, 0, 0, TAU); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(bp[0], bp[1] - ball[2] * 300, 15 * bs, 0, TAU); x.fill();
    x.fillStyle = '#222'; x.beginPath(); x.arc(bp[0] - 4, bp[1] - ball[2] * 300 - 3, 5 * bs, 0, TAU); x.fill();
    // red que se mueve en el gol
    for (const g of [FT.goal1, FT.goal2]) { const k = pulse(u, g, g + 0.8, 0.01, 0.7); if (k > 0) { glow(x, W / 2, PY + 20, 380 * k, 'rgba(255,200,80,.9)'); } }
    // parada
    const sv = prog(u, FT.save, FT.save + 0.9);
    if (sv > 0 && sv < 1) outlined(x, 'SAVE!', W / 2 + 140, PY + PH - 160, 130, '#fff', '#05110a', 0.14, 0.08, E.outBack(clamp(sv * 4)));
    x.restore();
    // comentario
    const lines = [[FT.kickoff - 0.2, 'Kick-off! Both XIs walk out'], [FT.kickoff + 0.6, 'Pirlo spreads it wide…'], [FT.kickoff + 2.05, '<b>Kylian Mbappé</b> is through on goal!'], [FT.goal1, 'GOAL! <b>Kylian Mbappé</b> buries it!'],
      [FT.goal1 + 1.75, '<b>Lionel Messi</b> dribbles past two…'], [FT.save, '<b>Gianluigi Buffon</b> saves Messi\'s shot!'], [FT.save + 1.2, '<b>Lamine Yamal</b> whips in a cross…'], [FT.goal2, 'GOAL! <b>Cristiano Ronaldo</b> heads it in!'], [FT.full, 'Full time! Player 1 wins 2–0']];
    let L = lines[0]; for (const l of lines) if (u >= l[0]) L = l;
    const lk = E.outC(prog(u, L[0], L[0] + 0.2));
    x.fillStyle = '#0d1410'; rr(x, 40, 1585, 1000, 120, 14); x.fill(); x.fillStyle = C.gold; x.fillRect(40, 1585, 10, 120);
    x.save(); x.globalAlpha = lk; let tx = 85; L[1].split(/(<b>.*?<\/b>)/).filter(Boolean).forEach(seg => { const bold = seg.startsWith('<b>'), s = seg.replace(/<\/?b>/g, ''); x.font = F(bold ? 900 : 700, 44); x.fillStyle = bold ? '#fff' : '#d7dcd8'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(s, tx, 1647); tx += x.measureText(s).width; }); x.restore();
    // ¡GOOOL!
    for (const [g, who] of [[FT.goal1, 'MBAPPÉ'], [FT.goal2, 'RONALDO']]) {
      const k = prog(u, g, g + 1.3);
      if (k > 0 && k < 1) {
        x.save(); x.globalAlpha = 1 - prog(k, 0.75, 1);
        if (k < 0.08) { x.fillStyle = 'rgba(255,240,200,.75)'; x.fillRect(0, 0, W, H); }
        const s = lerp(2.6, 1, E.outBack(clamp(k * 4)));
        outlined(x, 'GOOOAL!', W / 2, 900, 250, C.gold, '#1a0d00', 0.12, -0.08, s);
        outlined(x, who, W / 2, 1080, 110, '#fff', '#1a0d00', 0.14, -0.08, s);
        x.restore();
        confetti(x, u, g + 0.02, Math.round(g * 10), W / 2, 950, 140);
      }
    }
    // pitido final
    if (u >= FT.full) {
      const k = E.outBack(prog(u, FT.full, FT.full + 0.35));
      x.save(); x.fillStyle = `rgba(0,0,0,${0.6 * clamp(k)})`; x.fillRect(0, 0, W, H);
      x.translate(W / 2, H * 0.46); x.scale(k, k); x.rotate(-0.05);
      const g = x.createLinearGradient(-W / 2, 0, W / 2, 0); g.addColorStop(0, '#ffb02e'); g.addColorStop(1, '#ff7a3d');
      x.fillStyle = g; x.fillRect(-W / 2 - 60, -190, W + 120, 380);
      text(x, 'FULL TIME · 2–0', 0, -60, F(900, 70, DISP), '#1a0d00', 'center', 8);
      text(x, 'PLAYER 1 WINS!', 0, 70, F(900, 130, DISP), '#fff', 'center', 2);
      x.restore();
      confetti(x, u, FT.full, 77, W / 2, H * 0.45, 160);
    }
  }

  function draw(x, u) {
    x.save();
    if (u < FT.squad) auction(x, u);
    else if (u < FT.kickoff) squad(x, u);
    else match(x, u);
    // cortinillas entre partes
    for (const c of [FT.squad, FT.kickoff]) { const k = pulse(u, c - 0.12, c + 0.12, 0.12, 0.12); if (k > 0) { x.fillStyle = `rgba(255,255,255,${0.7 * k})`; x.fillRect(0, 0, W, H); } }
    x.restore();
  }
  return { draw };
}

export const FUT_NAMES = [...new Set([...P1, ...P2])];
