/* BidVerse 3D · CARAS: se dibujan en un lienzo (ojos, cejas, boca y marcas de cada personaje) y se pegan delante de la cabeza.
   Expresiones: n normal · a ataque · h dolor · k K.O. · b parpadeo. El lienzo es 256×128 y cubre ~130° × 80° de la esfera:
   un píxel a lo ancho ocupa menos que uno a lo alto, así que lo redondo se dibuja algo más ancho (KX). */
const KX = 1.15, W = 256, H = 128, EX = 40, EY = 50;
const has = (lk, k) => (' ' + (lk.f || '') + ' ').includes(' ' + k + ' ');
function ell(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(.5, rx * KX), Math.max(.5, ry), rot, 0, Math.PI * 2); }
function line(g, pts, w, col) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
const INK = '#1a1016';
function eye(g, lk, x, side, expr, ic) { // side: -1 = ojo de la izquierda de la imagen, 1 = derecha
  const kid = lk.b === 'kid', fem = lk.fem, big = kid || fem || has(lk, 'zeno'), ry = expr === 'a' ? 12 : big ? 19 : 16, rx = big ? 15 : 14, y = EY;
  if (expr === 'h') { line(g, [[x + 11 * side, y - 9], [x - 9 * side, y], [x + 11 * side, y + 9]], 4.5, INK); return; }
  if (expr === 'k') { line(g, [[x - 11, y - 9], [x + 11, y + 9]], 4.5, INK); line(g, [[x + 11, y - 9], [x - 11, y + 9]], 4.5, INK); return; }
  if (expr === 'b' || has(lk, 'closed')) { line(g, [[x - 14, y + 2], [x, y + 6], [x + 14, y + 2]], 4, INK); return; }
  if (has(lk, 'dot')) { ell(g, x, y + 2, 3.2, 4.2); g.fillStyle = INK; g.fill(); return; }
  if (has(lk, 'blind')) return;
  if (has(lk, 'nanika')) { ell(g, x, y, rx * .9, ry); g.fillStyle = '#000'; g.fill(); return; }
  if (has(lk, 'zeno')) { ell(g, x, y, 15, 20); g.fillStyle = '#0b0b12'; g.fill(); ell(g, x - 4, y - 7, 5, 6); g.fillStyle = '#fff'; g.fill(); ell(g, x + 5, y + 6, 2.5, 3); g.fill(); return; }
  const blackS = has(lk, 'genos') || (has(lk, 'kaneki') && side < 0);
  ell(g, x, y, rx, ry); g.fillStyle = blackS ? '#0b0b0b' : '#fbfbff'; g.fill();
  g.save(); ell(g, x, y, rx, ry); g.clip();
  const iris = ic, ix = x + side * -2.5;
  ell(g, ix, y + 1, 10, ry * .86); g.fillStyle = iris; g.fill();
  if (has(lk, 'rinne')) { g.lineWidth = 1.6; g.strokeStyle = '#3a2a5a'; for (const r of [3, 6, 9]) { ell(g, ix, y + 1, r, r * 1.2); g.stroke(); } }
  else if (has(lk, 'byak')) { ell(g, ix, y + 1, 10, ry * .86); g.fillStyle = '#e9e4f6'; g.fill(); }
  else {
    ell(g, ix, y + 2, 5, ry * .42); g.fillStyle = '#0b0710'; g.fill();
    if (iris.toLowerCase() === '#d1132b' && (has(lk, 'shar') || (has(lk, 'sharL') && side < 0))) { g.fillStyle = '#0b0710'; for (let i = 0; i < 3; i++) { const a = i * 2.1 + .4; ell(g, ix + Math.cos(a) * 6.5, y + 1 + Math.sin(a) * 8, 2, 2.4); g.fill(); } }
    const gr = g.createLinearGradient(0, y - ry, 0, y + ry); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); g.fillStyle = gr; ell(g, ix, y + 1, 10, ry * .86); g.fill();
    ell(g, ix - 3, y - ry * .4, 3.4, 4); g.fillStyle = '#fff'; g.fill(); ell(g, ix + 3, y + ry * .35, 1.6, 1.8); g.fill();
  }
  g.restore();
  const lid = has(lk, 'dead') || has(lk, 'tired') ? 6 : 0, lw = fem ? 5.5 : 4.5; // párpado y pestañas
  if (lid) { g.fillStyle = lk.sk; g.fillRect(x - 17 * KX, y - ry - 2, 34 * KX, ry * .55 + 2); }
  line(g, [[x - side * 15 * KX, y - ry * .55 + lid], [x - side * 2, y - ry - 1 + lid], [x + side * 13 * KX, y - ry * .7 + lid], [x + side * 19 * KX, y - ry * .3 + lid]], lw, INK);
  line(g, [[x - side * 11 * KX, y + ry * .9], [x + side * 9 * KX, y + ry * .85]], 1.6, 'rgba(26,16,22,.6)');
  if (fem) line(g, [[x + side * 16 * KX, y - ry * .5], [x + side * 22 * KX, y - ry * .9]], 3, INK);
}
export function drawFace(g, lk, expr) {
  g.clearRect(0, 0, W, H);
  const sk = lk.sk || '#f3c9a4', ic = has(lk, 'scarlet') || has(lk, 'shar') ? '#d1132b' : lk.ey || '#2a1f1a';
  const L = W / 2 - EX, R = W / 2 + EX;
  if (has(lk, 'mask') || has(lk, 'toge')) { g.fillStyle = has(lk, 'toge') ? lk.t || '#1b2433' : '#28304a'; g.fillRect(0, 72, W, H); }
  if (has(lk, 'oro')) { g.fillStyle = 'rgba(120,40,160,.55)'; ell(g, L, EY - 4, 20, 20); g.fill(); ell(g, R, EY - 4, 20, 20); g.fill(); }
  if (has(lk, 'gaara') || has(lk, 'demon')) { g.lineWidth = 6; g.strokeStyle = has(lk, 'demon') ? 'rgba(20,10,20,.85)' : '#1a1018'; ell(g, L, EY, 19, 21); g.stroke(); ell(g, R, EY, 19, 21); g.stroke(); }
  if (has(lk, 'friez')) { g.fillStyle = '#8e3fd1'; ell(g, L - 14, EY + 26, 9, 8); g.fill(); ell(g, R + 14, EY + 26, 9, 8); g.fill(); }
  if (has(lk, 'cyclops')) eye(g, Object.assign({}, lk, { b: 'kid' }), W / 2, 1, expr, ic);
  else if (!has(lk, 'truth')) {
    const isL = s => s < 0;
    for (const s of [-1, 1]) {
      const x = s < 0 ? L : R;
      if (has(lk, 'patch') && s > 0) { g.fillStyle = '#121216'; ell(g, x, EY, 18, 18); g.fill(); line(g, [[x - 26, EY - 30], [x + 28, EY + 30]], 3, '#121216'); continue; }
      if (has(lk, 'scarEye') && isL(s)) { line(g, [[x - 13, EY + 2], [x + 13, EY + 2]], 4, INK); line(g, [[x + 2, EY - 22], [x - 2, EY + 24]], 3, '#a8574a'); continue; }
      const iris = (has(lk, 'sharL') && isL(s)) || (has(lk, 'geass') && isL(s)) || (has(lk, 'kaneki') && isL(s)) ? '#d1132b' : ic;
      eye(g, Object.assign({}, lk, has(lk, 'sharL') && isL(s) ? { f: lk.f + ' shar' } : null), x, s, expr, iris);
      if (has(lk, 'geass') && isL(s) && expr !== 'k' && expr !== 'b') line(g, [[x - 6, EY], [x, EY - 6], [x + 6, EY], [x, EY + 6], [x - 6, EY]], 1.4, '#ff6a8a');
    }
  }
  if (has(lk, 'sukuna')) { line(g, [[L - 14, EY + 26], [L + 12, EY + 22]], 3.5, '#1a1016'); line(g, [[R - 12, EY + 22], [R + 14, EY + 26]], 3.5, '#1a1016');
    for (const x of [L, R]) { ell(g, x + (x < W / 2 ? -6 : 6), EY + 18, 6, 4); g.fillStyle = '#fbfbff'; g.fill(); ell(g, x + (x < W / 2 ? -6 : 6), EY + 18, 3, 3); g.fillStyle = '#d1132b'; g.fill(); } }
  if (has(lk, 'whisk')) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const x = W / 2 + s * 58, y = 72 + i * 8; line(g, [[x - s * 12, y], [x + s * 10, y - 2 + i]], 2.6, INK); }
  if (has(lk, 'scarL')) { line(g, [[L - 10, EY + 26], [L + 8, EY + 24]], 2.5, '#8a3a2a'); for (const k of [-5, 0, 5]) line(g, [[L + k, EY + 21], [L + k, EY + 29]], 1.6, '#8a3a2a'); }
  if (has(lk, 'scars3')) for (const k of [-8, 0, 8]) line(g, [[L - 14 + k, EY - 22], [L + 6 + k, EY + 22]], 2.6, '#8a3a2a');
  if (has(lk, 'lines')) { line(g, [[L - 8, EY + 22], [L - 2, EY + 34]], 2.2, '#5a3030'); line(g, [[R + 8, EY + 22], [R + 2, EY + 34]], 2.2, '#5a3030'); }
  if (has(lk, 'jiraiya')) { line(g, [[L - 4, EY + 20], [L - 6, EY + 48]], 4, '#c8202a'); line(g, [[R + 4, EY + 20], [R + 6, EY + 48]], 4, '#c8202a'); }
  if (has(lk, 'akaza')) for (const x of [L, R]) for (const k of [-6, 6]) line(g, [[x + k, EY + 22], [x + k * 1.6, EY + 50]], 2.4, '#2f4fa8');
  if (has(lk, 'tobi')) for (const x of [L - 10, R + 10]) line(g, [[x, EY + 20], [x, EY + 44]], 4, '#c8202a');
  if (has(lk, 'choso')) { g.fillStyle = 'rgba(40,20,30,.85)'; g.fillRect(L + 6, EY + 18, R - L - 12, 8); }
  if (has(lk, 'gills')) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) line(g, [[W / 2 + s * 58, 74 + i * 7], [W / 2 + s * 70, 70 + i * 7]], 2, '#3a5a7a');
  if (has(lk, 'stitch')) { line(g, [[L - 20, 18], [R + 20, 30]], 2.4, '#3a2a2a'); for (let i = 0; i < 9; i++) { const x = L - 16 + i * 14; line(g, [[x, 18 + i * 1.4], [x + 3, 30 + i * 1.4]], 1.6, '#3a2a2a'); } }
  if (has(lk, 'scarNose')) line(g, [[L + 10, EY + 18], [R - 10, EY + 14]], 3, '#8a3a2a');
  if (has(lk, 'scarFace')) for (let i = 0; i < 4; i++) line(g, [[R + 6, 12 + i * 22], [R + 34, 20 + i * 22]], 2.2, 'rgba(120,70,60,.8)');
  if (has(lk, 'freck')) { g.fillStyle = '#a8603a'; for (const x of [L, R]) for (const [dx, dy] of [[-6, 28], [0, 31], [6, 28], [-3, 34]]) { ell(g, x + dx, EY + dy, 1.4, 1.4); g.fill(); } }
  if (has(lk, 'pierce')) { g.fillStyle = '#b8bcc8'; for (const [x, y] of [[W / 2, EY + 20], [W / 2, EY + 28], [L - 8, EY + 24], [R + 8, EY + 24], [W / 2 - 14, 108], [W / 2 + 14, 108]]) { ell(g, x, y, 2.4, 2.4); g.fill(); } }
  if (has(lk, 'needles')) { g.fillStyle = '#c8ccd4'; for (const [x, y] of [[L - 18, EY + 30], [R + 18, EY + 24], [W / 2 + 22, 96], [L + 4, 18]]) { ell(g, x, y, 3, 3); g.fill(); } }
  if (has(lk, 'bindi')) { g.fillStyle = '#c8202a'; ell(g, W / 2, 20, 4, 4); g.fill(); }
  if (has(lk, 'old')) { line(g, [[L - 16, EY + 26], [L - 4, EY + 30]], 1.6, 'rgba(90,50,40,.5)'); line(g, [[R + 16, EY + 26], [R + 4, EY + 30]], 1.6, 'rgba(90,50,40,.5)'); }
  // cejas
  if (!has(lk, 'nobrow') && !has(lk, 'blind') && !has(lk, 'truth') && !has(lk, 'cyclops') && !has(lk, 'nanika') && !has(lk, 'zeno')) {
    const bw = has(lk, 'brows') ? 8 : 3.6, bc = lk.hc && lk.hs !== 'bald' && lk.hs !== 'dome' ? lk.hc : '#3a2a2a', ang = expr === 'a' ? 9 : expr === 'h' ? -6 : 2;
    if (has(lk, 'unibrow')) line(g, [[L - 18, EY - 24], [W / 2, EY - 18 + ang], [R + 18, EY - 24]], bw + 2, bc);
    else for (const s of [-1, 1]) { const x = s < 0 ? L : R; line(g, [[x - s * 16, EY - 27 - (expr === 'a' ? 2 : 0)], [x + s * 12, EY - 25 + ang]], bw, bc); }
    if (has(lk, 'curl')) { g.lineWidth = 2.4; g.strokeStyle = bc; g.beginPath(); g.arc(R + 16, EY - 28, 4, 0, 5); g.stroke(); }
  }
  if (has(lk, 'blind')) { g.fillStyle = '#121216'; g.fillRect(0, EY - 20, W, 36); }
  // boca
  if (has(lk, 'mask') || has(lk, 'toge')) return;
  const my = 96;
  if (has(lk, 'bamboo')) { g.fillStyle = '#7fae5a'; g.fillRect(W / 2 - 42, my - 7, 84, 13); g.fillStyle = '#4a6a3a'; g.fillRect(W / 2 - 44, my - 8, 6, 15); g.fillRect(W / 2 + 38, my - 8, 6, 15); return; }
  if (has(lk, 'truth') || has(lk, 'nanika')) { ell(g, W / 2, my - 4, has(lk, 'truth') ? 44 : 12, has(lk, 'truth') ? 12 : 12); g.fillStyle = '#0b0b0b'; g.fill();
    if (has(lk, 'truth')) { g.fillStyle = '#f4f4f4'; for (let i = -4; i <= 4; i++) g.fillRect(W / 2 + i * 8 - 3, my - 12, 6, 6); } return; }
  if (expr === 'a' || expr === 'h') { ell(g, W / 2, my, expr === 'a' ? 13 : 9, expr === 'a' ? 9 : 7); g.fillStyle = '#4a0f18'; g.fill(); g.fillStyle = '#f8f0f0'; g.fillRect(W / 2 - 9, my - 8, 18, 3); if (has(lk, 'teeth')) { for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(W / 2 + i * 5 - 2, my - 6); g.lineTo(W / 2 + i * 5, my - 1); g.lineTo(W / 2 + i * 5 + 2, my - 6); g.fill(); } } }
  else if (expr === 'k') line(g, [[W / 2 - 7, my + 2], [W / 2, my - 2], [W / 2 + 7, my + 2]], 3, INK);
  else line(g, has(lk, 'teeth') ? [[W / 2 - 12, my - 3], [W / 2, my + 2], [W / 2 + 12, my - 3]] : [[W / 2 - 8, my], [W / 2 + 6, my - 1]], 3, INK);
  if (has(lk, 'goatee') || has(lk, 'stubble')) { g.fillStyle = has(lk, 'stubble') ? 'rgba(40,30,30,.35)' : (lk.hc || '#2a2a2a'); ell(g, W / 2, 122, has(lk, 'stubble') ? 40 : 7, 8); g.fill(); }
  if (has(lk, 'scarLip')) line(g, [[W / 2 + 10, my - 10], [W / 2 + 4, my + 10]], 2.4, '#a8574a');
}
export const FACE = { W, H };
