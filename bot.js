/* BidVerse · IA RIVAL (modo "contra la IA")
   Sin DOM: solo mira el estado del motor (engine.js) y devuelve qué haría. Corre igual en el navegador (window.BidBot) y en Node.
     decide(g, p, mem) → null (esperar) | { act: 'bid', amount } | { act: 'take' } (lote gratis) | { act: 'skip' } (pasar o aceptar)
     order(g, p)       → orden de combate (anime) para su equipo
   mem es un objeto que guarda quien la usa entre llamadas (el "humor" de la IA en cada lote, para que no sea siempre igual).
   Idea: cada lote vale según lo fuerte que es el personaje DENTRO de su categoría (percentil) y el dinero que queda por hueco libre.
   Los muy buenos se pagan caros, los flojos se dejan pasar, y si quedan pocos lotes para llenar los huecos, se puja más. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.BidBot = factory(root.BidEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';
  const DIVC = g => g.cat !== 'anime';
  const need = (g, k) => { const d = (g.divs || []).find(d => d.k === k); return (d && d.n) || 1; };
  // huecos que le quedan: en esta categoría (now) y en total contando las que faltan (all)
  function slots(g, p) {
    const c = g.P[p].c;
    if (!DIVC(g)) { const n = E.MAXC - c.length; return { now: n, all: n }; }
    let all = 0, seen = false;
    for (const d of g.divs || []) { if (d.k === g.dv) seen = true; if (seen) all += Math.max(0, d.n - c.filter(x => x.cls === d.k).length); }
    return { now: Math.max(0, need(g, g.dv) - c.filter(x => x.cls === g.dv).length), all: Math.max(1, all) };
  }
  // lotes que quedan después del actual en esta categoría (anime: en todo el mazo)
  function lotsLeft(g) {
    if (!DIVC(g)) return g.deck.length - g.idx - 1;
    let n = g.idx + 1; while (n < g.deck.length && g.deck[n].cls === g.dv) n++;
    return n - g.idx - 1;
  }
  // percentil de fuerza (0 = el peor, 1 = el mejor) entre las cartas de su categoría que hay en el mazo
  function pct(g, c) {
    const same = g.deck.filter(x => !DIVC(g) || x.cls === c.cls);
    if (same.length < 2) return .5;
    return same.filter(x => x.pw < c.pw).length / (same.length - 1);
  }
  // precio máximo que pagaría por el lote actual
  function value(g, p, mem) {
    const c = g.cur, s = slots(g, p), m = g.P[p].m;
    if (!c || s.now <= 0 || m < 1) return 0;
    if (!mem || mem.idx !== g.idx) Object.assign(mem || {}, { idx: g.idx, mood: .85 + Math.random() * .3 }); // cada lote, un humor distinto
    const q = pct(g, c), left = lotsLeft(g), per = m / s.all;
    let w = .25 + 2.4 * q * q * q;                                    // fuerte = muy caro; flojo = casi nada
    if (left < s.now) w = Math.max(w, 1.6);                           // no quedan lotes suficientes: hay que llevárselo
    else if (left < s.now * 2) w *= 1.3;                              // quedan pocos
    if (g.cat === 'anime' && c.pw >= E.ROTO_PW) w = Math.max(w, 3.2); // un "roto" (God, Zeno…) gana casi solo una partida
    if (g.cat === 'anime' && c.tr === 'dnote' && g.P.some(x => x.c.some(y => y.pw >= E.ROTO_PW))) w = Math.max(w, 2.2); // con un roto en juego, el Death Note es la única respuesta
    const v = Math.floor(per * w * ((mem && mem.mood) || 1));
    return Math.max(0, Math.min(v, m - Math.max(0, s.all - 1) * (g.cat === 'futbol' ? 2 : 1))); // deja algo para los huecos que faltan
  }

  function decide(g, p, mem = {}) {
    if (g.phase !== 'bidding' || g.locked || g.passed[p]) return null;
    const o = 1 - p, s = slots(g, p), max = value(g, p, mem), q = g.cur ? pct(g, g.cur) : 0;
    if (g.free === p) { // se lo puede quedar gratis
      if (g.fp || s.now <= 0) return { act: 'take' };                 // el rival ha pasado: regalo
      const left = lotsLeft(g);
      if (q >= .35 || g.skips[p] <= 0 || left <= s.now || E.gives(g, p)) return { act: 'take' };
      return { act: 'skip' };                                          // flojo y el rival no puede pujar: espera uno mejor
    }
    if (g.leader === p) return null;                                   // va ganando: esperar
    if (g.leader === o) {                                              // el rival va ganando
      if (g.bid + 1 <= max) {
        const room = max - g.bid, jump = room > 6 && Math.random() < .35 ? 1 + Math.floor(Math.random() * Math.min(4, room / 3)) : 1;
        return { act: 'bid', amount: g.bid + jump };
      }
      return { act: 'skip' };                                          // demasiado caro: lo acepta
    }
    // nadie ha pujado
    if (max >= 1 && (q >= .3 || max >= 2)) return { act: 'bid', amount: Math.max(1, Math.min(max, Math.round(max * (.25 + Math.random() * .2)))) };
    if (g.skips[p] > 0 && lotsLeft(g) > s.now) return { act: 'skip' }; // no le interesa: pasa (el rival se lo puede llevar gratis)
    return max >= 1 ? { act: 'bid', amount: 1 } : null;
  }

  // Orden de combate: el más fuerte al final (aguanta la remontada), el segundo primero para desgastar
  function order(g, p) {
    const c = g.P[p].c.map((x, i) => ({ i, pw: x.pw })).sort((a, b) => b.pw - a.pw).map(x => x.i);
    return c.length === 3 ? [c[1], c[2], c[0]] : c.reverse();
  }

  return { decide, order, value };
});
