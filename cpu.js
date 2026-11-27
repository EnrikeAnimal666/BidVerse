/* BidVerse · CPU: rival automático para jugar solo (siempre es el jugador 2).
   Decide igual que una persona con la escala de poder delante: cuánto vale el lote (lo bueno que es dentro de su categoría),
   cuánto dinero le queda y cuántos huecos le faltan. Puja, sube, se retira, pasa o se lleva los lotes gratis.
   Niveles: 1 fácil (despistado y tacaño) · 2 normal · 3 difícil (afina más y reacciona antes). No ve nada que no vea el jugador. */
(function () {
  const ME = 1, OP = 0;
  const LV = { 1: { noise: .35, mult: .72, delay: [1100, 2700], open: .25 }, 2: { noise: .16, mult: 1, delay: [700, 1900], open: .4 }, 3: { noise: .06, mult: 1.12, delay: [450, 1300], open: .55 } };
  let tm = 0, sig = '';
  const lv = () => LV[(CPU && CPU.lvl) || 2] || LV[2];
  const str = c => c.kind === 'futbol' ? c.ovr : c.kind === 'anime' ? BidEngine.vpw(c) : c.pw; // anime: Light Yagami vale como un fuerte (Death Note)
  const poolOf = c => c.kind === 'anime' ? POOLS.anime : (c.kind === 'ufc' ? UFC : FUTP).filter(x => x.cls === c.cls);
  const SORT = new Map();
  function pct(c) { // 0 = el peor de su categoría · 1 = el mejor
    const k = c.kind + '|' + (c.kind === 'anime' ? '' : c.cls); let a = SORT.get(k);
    if (!a) { a = poolOf(c).map(str).sort((x, y) => x - y); SORT.set(k, a); }
    const v = str(c); let lo = 0; while (lo < a.length && a[lo] < v) lo++; let hi = lo; while (hi < a.length && a[hi] <= v) hi++;
    return a.length > 1 ? Math.min(1, (lo + hi) / 2 / (a.length - 1)) : .5;
  }
  function slots() { // huecos que le faltan: en total (de aquí en adelante) y en la categoría que se subasta ahora
    const g = G, c = g.P[ME].c;
    if (g.cat === 'anime') { const n = MAXC - c.length; return { all: n, now: n }; }
    const divs = g.cat === 'futbol' ? FDIVS : UFC_DIVS, i0 = Math.max(0, divs.findIndex(d => d.k === g.dv)); let all = 0, now = 0;
    divs.forEach((d, i) => { const need = Math.max(0, (d.n || 1) - c.filter(x => x.cls === d.k).length); if (i >= i0) all += need; if (d.k === g.dv) now = need; });
    return { all, now };
  }
  function value(c) { // lo máximo que está dispuesta a pagar por este lote
    const L = lv(), m = G.P[ME].m, s = slots(); if (s.now <= 0 || m < 1) return 0;
    const q = pct(c), share = m / Math.max(1, s.all);
    let v = share * (.3 + 2.1 * Math.pow(q, 2.2)) * L.mult;
    if (c.kind === 'anime' && c.pw >= BidEngine.ROTO_PW) v = m;      // los rotos lo valen todo
    if (s.all === 1) v = Math.max(v, m * (.3 + .7 * q));             // último hueco: puede gastarlo casi todo en uno bueno
    v *= 1 + (Math.random() * 2 - 1) * L.noise;
    return Math.max(0, Math.min(m - Math.max(0, s.all - 1), Math.round(v))); // deja $1 por cada hueco que aún le quede
  }
  // exigencia: con los dos saltos guardados solo entra a por los buenos; según los gasta (o se acaban los lotes de la categoría) se conforma con menos
  function minQ() {
    const g = G, sk = g.skips[ME], base = sk >= 2 ? .55 : sk === 1 ? .38 : 0, need = slots().now;
    if (g.cat === 'anime') return need >= 3 ? base : base * .8;
    let left = 0; for (let i = g.idx; i < g.deck.length && g.deck[i].cls === g.dv; i++) left++;
    return left <= need * 2 ? 0 : base * .8;
  }
  function act() {
    tm = 0; const g = G;
    if (!CPU || net || !g || g.phase !== 'bidding' || g.locked || g.passed[ME] || g.leader === ME || !g.cur) return;
    if (!BidEngine.can(g, ME)) return;
    const c = g.cur, v = value(c), q = pct(c), L = lv(), mq = minQ() * (CPU.lvl === 1 ? .6 : 1);
    if (g.free === ME) { // se lo puede llevar gratis
      const keep = q >= mq * .95 || (g.skips[ME] <= 0 && !BidEngine.gives(g, ME));
      apply(keep ? BidEngine.place(g, ME, 1) : BidEngine.skip(g, ME)); return;
    }
    if (g.leader === OP) { // el jugador va ganando: subir o retirarse
      const nb = g.bid + 1;
      if (nb <= v && nb <= g.P[ME].m && q >= mq * .75) { const jump = CPU.lvl >= 2 && v - nb >= 4 && Math.random() < .3 ? Math.min(v, nb + 1 + Math.floor(Math.random() * 2)) : nb; apply(BidEngine.place(g, ME, jump)); }
      else apply(BidEngine.skip(g, ME)); // aceptar: se lo lleva el jugador
      return;
    }
    if (q < mq && (g.skips[ME] > 0 || BidEngine.gives(g, ME))) { apply(BidEngine.skip(g, ME)); return; } // no le compensa: pasa
    if (v >= 1 && g.P[ME].m >= 1) { const o = Math.max(1, Math.min(v, Math.round(v * L.open * Math.random() + (q > .85 ? v * .3 : 0)))); apply(BidEngine.place(g, ME, o)); return; }
    if (g.skips[ME] > 0 || BidEngine.gives(g, ME)) { apply(BidEngine.skip(g, ME)); return; }
    tm = -1; // no le interesa y no puede pasar: deja correr el reloj
  }
  // game.js la llama después de cada cambio de la subasta; solo vuelve a pensar si el lote o las pujas han cambiado
  window.cpuThink = function () {
    if (!CPU || net) return; const g = G;
    if (!g || g.phase !== 'bidding') { if (tm > 0) clearTimeout(tm); tm = 0; sig = ''; return; }
    const s = [g.idx, g.bid, g.leader, g.free, g.passed.join(), g.locked].join('|'); if (s === sig && tm) return;
    sig = s; if (tm > 0) clearTimeout(tm); tm = 0;
    if (g.locked || g.passed[ME] || g.leader === ME) return;
    const L = lv(); let d = L.delay[0] + Math.random() * (L.delay[1] - L.delay[0]);
    d = Math.min(d, Math.max(300, (g.left - 1.5) * 1000));
    const tk = bt; tm = setTimeout(() => { if (tk === bt) act(); }, d);
  };
  // orden de combate (anime): normal y difícil sacan primero al más fuerte; fácil, al azar
  window.cpuOrder = function () {
    const c = G.P[ME].c, idx = c.map((_, i) => i);
    if (!CPU || CPU.lvl === 1) { for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx; }
    return idx.sort((a, b) => BidEngine.vpw(c[b]) - BidEngine.vpw(c[a]));
  };
})();
