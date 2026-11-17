/* BidVerse · MOTOR DE REGLAS
   Sin DOM, sin setTimeout, sin Date: solo estado + reglas. Corre igual en el navegador (window.BidEngine) y en Node (require).
   Quien lo use (el cliente hoy, el servidor mañana) llama a las acciones y recibe { ev, wait }:
     ev   = lista de eventos que han ocurrido (para pintarlos o enviarlos a los jugadores)
     wait = null, o { ms, act:'close'|'next' } = "llámame a close()/next() dentro de ms milisegundos"
   El reloj de 1 segundo lo pone quien use el motor: mientras g.phase==='bidding' llama a tick(g) cada segundo.
   Los jugadores son 0 y 1. Las tarjetas son los objetos de POOLS.anime / UFC (necesitan n, pw, cls, sty…). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BidEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = '2026-11-18a';
  const CFG = { anime: { start: 20 }, ufc: { start: 40 }, futbol: { start: 100 } }, MAXC = 3, SECS = 10;
  // Fútbol: 4-3-3 (1 portero, 4 defensas, 3 medios, 3 delanteros). Se subasta por posiciones, igual que la UFC por categorías.
  const FUT_DIVS = [{ k: 'GK', n: 1 }, { k: 'DEF', n: 4 }, { k: 'MID', n: 3 }, { k: 'FWD', n: 3 }];
  const NONE = () => ({ ev: [], wait: null });

  /* ---------- utilidades (siempre con el rng recibido: en el servidor será criptográfico) ---------- */
  const pad2 = n => String(n).padStart(2, '0');
  const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rndi = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (rng, a) => a[rndi(rng, 0, a.length - 1)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Rareza (solo anime): los dioses casi no salen y los más fuertes salen la mitad de veces. Orden ponderado (Efraimidis-Spirakis).
  const rarity = c => c.pw >= 950 ? .12 : c.pw >= 900 ? .5 : 1;
  const wshuffle = (rng, a, w) => a.map(c => ({ c, k: Math.pow(rng(), 1 / w(c)) })).sort((x, y) => y.k - x.k).map(x => x.c);
  const shuffle = (rng, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- estado ---------- */
  function create({ cat, pool, divs = [], rng = Math.random }) {
    if (!CFG[cat]) throw new Error('categoría desconocida: ' + cat);
    if (cat === 'futbol' && !(divs && divs.length)) divs = FUT_DIVS;
    const deck = cat !== 'anime'
      ? divs.flatMap(d => shuffle(rng, pool.filter(x => x.cls === d.k)))
      : wshuffle(rng, [...pool], rarity);
    return {
      cat, rng, divs, deck, idx: -1, dv: '', cur: null, bid: 0, leader: -1, left: SECS, free: -1,
      passed: [false, false], skips: [2, 2], locked: false,
      phase: 'idle', // idle → bidding → (forced) → closing → … → fight
      P: [{ m: CFG[cat].start, c: [] }, { m: CFG[cat].start, c: [] }],
    };
  }

  // anime: hasta 3 personajes · UFC: un peleador por categoría · fútbol: los huecos de cada posición (dv = categoría/posición en subasta)
  const DIVC = g => g.cat !== 'anime';
  const need = (g, k) => { const d = (g.divs || []).find(d => d.k === k); return (d && d.n) || 1; };
  const can = (g, p) => DIVC(g) ? g.P[p].c.filter(c => c.cls === g.dv).length < need(g, g.dv) : g.P[p].c.length < MAXC;
  const out = (g, p) => !can(g, p) || g.P[p].m < 1;
  const divEnd = g => { let n = g.idx; while (n < g.deck.length && g.deck[n].cls === g.dv) n++; return n; };

  /* ---------- subasta ---------- */
  function next(g) {
    if (!['idle', 'closing', 'dealt'].includes(g.phase)) return NONE();
    g.idx++;
    if (DIVC(g) && (g.idx >= g.deck.length || g.deck[g.idx].cls !== g.dv || (!can(g, 0) && !can(g, 1)))) { // categoría cerrada: pasa a la siguiente
      if (g.idx < g.deck.length && g.deck[g.idx].cls === g.dv) g.idx = divEnd(g);
      if (g.idx < g.deck.length) { g.dv = g.deck[g.idx].cls; g.skips = [2, 2]; }
    }
    if (g.idx >= g.deck.length || (g.cat === 'anime' && !can(g, 0) && !can(g, 1))) {
      g.locked = true; g.phase = 'fight';
      return { ev: [{ t: 'finish' }], wait: null };
    }
    g.cur = g.deck[g.idx]; g.bid = 0; g.leader = -1; g.left = SECS; g.free = -1;
    const e = [can(g, 0), can(g, 1)], b = [e[0] && g.P[0].m >= 1, e[1] && g.P[1].m >= 1], dead = e[0] && e[1] && !b[0] && !b[1];
    if (e[0] && e[1]) { if (b[0] !== b[1]) g.free = b[0] ? 0 : 1; } else g.free = e[0] ? 0 : 1; // lote gratis para quien aún puede coger
    g.passed = [false, false]; if (g.free >= 0) g.passed[1 - g.free] = true;
    g.locked = dead; g.phase = 'bidding';
    const ev = [{ t: 'lot' }];
    if (dead) { const r = giveRandom(g, true); return { ev: ev.concat(r.ev), wait: r.wait }; } // nadie tiene dinero: este lote va a uno al azar
    if (g.free >= 0 && g.skips[g.free] <= 0) { // no le quedan descartes: se lo lleva gratis
      g.locked = true; g.leader = g.free; g.phase = 'forced';
      return { ev: ev.concat({ t: 'forced' }), wait: { ms: 1600, act: 'close' } };
    }
    return { ev, wait: null };
  }

  function tick(g) {
    if (g.phase !== 'bidding') return NONE();
    g.left--;
    if (g.left <= 0) { const r = close(g, true); r.ev.unshift({ t: 'tick' }); return r; }
    return { ev: [{ t: 'tick' }], wait: null };
  }

  function place(g, p, raw) {
    if ((p !== 0 && p !== 1) || g.phase !== 'bidding' || g.locked || g.passed[p]) return NONE();
    if (g.free === p) { g.leader = p; g.bid = 0; return close(g, false); } // lote gratis: se lo queda
    const v = Math.floor(Number(raw)), err = (code, arg) => ({ ev: [{ t: 'err', p, code, arg }], wait: null });
    if (!v || v < 1) return err('errValid');
    if (v <= g.bid) return err('errOver', g.bid);
    if (v > g.P[p].m) return err('errMoney', g.P[p].m);
    g.bid = v; g.leader = p; g.left = SECS;
    const closing = !!g.passed[1 - p], ev = [{ t: 'bid', p, amount: v, closing }];
    if (closing) { const r = close(g, false); return { ev: ev.concat(r.ev), wait: r.wait }; }
    return { ev, wait: null };
  }

  function skip(g, p) {
    if ((p !== 0 && p !== 1) || g.phase !== 'bidding' || g.locked || g.leader === p) return NONE();
    if (g.leader >= 0) return close(g, false); // el otro va ganando: aceptas
    if (g.skips[p] <= 0 || g.passed[p]) return NONE();
    g.passed[p] = true;
    if (g.passed[1 - p]) return close(g, false);
    g.left = SECS;
    return { ev: [{ t: 'pass', p }], wait: null };
  }

  function close(g, afk) {
    if (g.phase !== 'bidding' && g.phase !== 'forced') return NONE();
    g.locked = true; g.phase = 'closing';
    if (afk && g.leader < 0 && g.free >= 0) { g.leader = g.free; g.bid = 0; }
    const ev = [];
    if (g.leader >= 0) {
      const p = g.leader;
      g.P[p].m -= g.bid; g.P[p].c.push({ ...g.cur, paid: g.bid, free: g.free === p });
      ev.push({ t: 'sold', p, price: g.bid, free: g.free === p });
    } else if (afk) return giveRandom(g, false); // se acabó el tiempo sin pujas: SOLO este lote va a uno de los dos al azar
    else if (g.free >= 0) { const o = 1 - g.free; g.skips[g.free] = Math.max(0, g.skips[g.free] - 1); if (can(g, o)) { g.P[o].c.push({ ...g.cur, paid: 0, free: true }); ev.push({ t: 'sold', p: o, price: 0, free: true, gift: true }); } else ev.push({ t: 'discard' }); } // el rival sin dinero pero con hueco se lo queda gratis; si no tiene hueco, se descarta
    else { ev.push({ t: 'noBids' }); g.skips = g.skips.map(s => Math.max(0, s - 1)); }
    return { ev, wait: { ms: 2600, act: 'next' } };
  }

  // Nadie puja (o nadie tiene dinero): el lote actual, y solo ese, se lo lleva uno de los dos al azar. La subasta sigue.
  function giveRandom(g, broke) {
    g.locked = true; g.phase = 'closing';
    const o = [0, 1].filter(p => can(g, p));
    if (!o.length) return { ev: [{ t: 'discard' }], wait: { ms: 2600, act: 'next' } };
    const p = o.length === 1 ? o[0] : (g.rng() < .5 ? 0 : 1);
    g.leader = p; g.bid = 0;
    g.P[p].c.push({ ...g.cur, paid: 0, rand: true });
    return { ev: [{ t: 'sold', p, price: 0, free: false, rand: true, broke: !!broke }], wait: { ms: 2800, act: 'next' } };
  }

  /* ---------- ESTADÍSTICAS (anime) ----------
     Cada personaje tiene 5 estadísticas en la escala del poder (0-1000): STR fuerza · SPD velocidad · DUR resistencia · TEC técnica · ENE energía.
     Salen de su poder y de su perfil (B/S/T/M/D/U), con una pequeña variación fija por nombre. */
  const PRO = { A: [0, 0, 0, 0, 0], B: [60, -40, 50, -60, -10], S: [-40, 90, -50, 30, -30], T: [0, 30, -30, 90, -60], M: [-50, 0, -20, 10, 80], D: [0, -50, 100, -20, 10], U: [-60, 0, -20, 60, 50] };
  const hsh = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function stats(c) {
    if (c.st) return c.st;
    const o = PRO[c.pr] || PRO.A, h = hsh(c.n), v = o.map((x, i) => Math.max(5, Math.min(1000, Math.round(c.pw + x * .6 + ((h >>> (i * 5)) % 31) - 15))));
    return c.st = { STR: v[0], SPD: v[1], DUR: v[2], TEC: v[3], ENE: v[4] };
  }

  /* ---------- DUELO (anime) v2 ----------
     Idea: diferencias pequeñas de poder = combate igualado; diferencias enormes = paliza. La ventaja crece despacio hasta ~250 puntos
     y muy deprisa a partir de ~400 (un dios borra a un humano de un golpe). Calibrado con miles de duelos simulados (mismo perfil, sin daño previo):
       +50 → ~57 %   +100 → ~65 %   +150 → ~73 %   +250 → ~87 %   +400 → ~98 %   +600 → 100 %
     Mecánicas (todas salen en el guion para animarlas):
       · golpe / crítico                · técnica especial (gasta ki, más daño)   · esquiva (+ contraataque)
       · choque de técnicas: los dos lanzan su técnica a la vez y empujan; el que gana revienta al otro
       · despertar: la primera vez que un personaje baja del 33 % de vida puede (55 %) sacar su verdadero poder (+stats, recupera ki). Una vez por combate.
     La vida y el ki que le quedan al ganador pasan al siguiente duelo (el ki se recupera un poco entre duelos). */
  const AN = { FORM: 80, K1: 7000, K3: 900, BASE: .19, KS: 3000, KA: 2600, AWK: 55, AWHP: .33, AWP: .55, SPC: .34, REGEN: .05, CAP: 80 };
  const ex = d => d / AN.K1 + Math.sign(d) * Math.pow(Math.abs(d) / AN.K3, 3); // exponente: lineal suave + cúbico (castiga las diferencias enormes)
  const mul = d => Math.pow(10, ex(d));
  /* ---------- RASGOS (anime): habilidades propias de algunos personajes. La clave está en data-anime.js (TRAITS) y llega como c.tr ----------
       touch   God: actúa primero y borra al rival de un solo toque
       inf     Infinito: los 2 primeros ataques que recibe no le llegan
       time    Tiempo detenido: 1 vez por duelo, 2 golpes seguidos imposibles de esquivar
       ui      Intocable: el rival falla un 18 % más
       req     Requiem: anula el primer golpe que le dejaría K.O. y el rival no puede despertar
       serious Golpe serio: tras recibir 3 golpes, su siguiente ataque quita al menos un 55 % de vida (atraviesa el Infinito)
       toll    Peaje: al empezar el duelo el rival pierde un 40 % de ki y un 10 % de vida
       domain  Expansión de dominio: 1 vez por duelo (gasta 50 % de ki): sus 4 siguientes ataques no fallan y hacen un 40 % más
       regen   Regeneración: por debajo del 60 % de vida se cura un 7 % al actuar (hasta 4 veces por duelo)
       adapt   Adaptación: cada golpe que recibe le hace un 10 % menos de daño (hasta 4 veces)
       gen     Genjutsu: en su primer turno deja al rival 2 turnos sin actuar
       rage    Furia: por debajo del 40 % de vida pega un 30 % más
       sun     The One: sus 4 primeros turnos pega un 50 % más
     Todo sale en el guion como golpes { k:'tr', tr:<clave> } para animarlo. */
  const TR = { INF: 2, TS: 2, UI: .18, TOLLE: .4, TOLLH: .1, DOMC: .5, DOMN: 4, DOMX: 1.4, RGHP: .6, RG: .07, RGN: 4, AD: .1, ADN: 4, GEN: 2, RAGEHP: .4, RAGEX: 1.3, SUNN: 4, SUNX: 1.5, SER: 3, SERX: .55 };
  function duel(rng, A, B) {
    const fm = [0, 1].map(() => (rng() - .5) * 2 * AN.FORM), F = [A, B];
    const base = F.map((c, i) => { const s = c.st || stats(c); return { STR: s.STR + fm[i], SPD: s.SPD + fm[i], DUR: s.DUR + fm[i], TEC: s.TEC + fm[i], ENE: s.ENE + fm[i] }; });
    const hp = F.map(c => c.f == null ? 1 : c.f), en = F.map(c => c.e == null ? 1 : c.e), aw = F.map(c => !!c.aw), bo = [0, 0], dmg = [0, 0], hits = [];
    const tr = F.map(c => c.tr || ''), has = (i, k) => tr[i] === k;
    const inf = tr.map(t => t === 'inf' ? TR.INF : 0), used = [{}, {}], dom = [0, 0], stun = [0, 0], acts = [0, 0], taken = [0, 0], ad = [0, 0], rg = [0, 0];
    const S = (i, k) => base[i][k] + bo[i];
    const rec = o => hits.push(Object.assign(o, { hp: hp.map(x => +x.toFixed(4)), en: en.map(x => +x.toFixed(3)) }, dom[0] || dom[1] ? { dz: [...dom] } : null));
    const pA = () => clamp(1 / (1 + Math.pow(10, -ex(S(0, 'SPD') - S(1, 'SPD')) * AN.K1 / AN.KS)), .2, .8);
    const skill = i => .6 * S(i, 'SPD') + .4 * S(i, 'TEC');
    const hurt = (d, x) => { const v = Math.min(hp[d], x); hp[d] = Math.max(0, hp[d] - x); dmg[1 - d] += v; return v; };
    const saves = (d, x) => has(d, 'req') && !used[d].req && x >= hp[d]; // Requiem: ¿este golpe se anula?
    const save = d => { used[d].req = 1; rec({ a: d, k: 'tr', tr: 'req' }); };
    const boost = (a, d) => (dom[a] > 0 ? TR.DOMX : 1) * (has(a, 'sun') && acts[a] <= TR.SUNN ? TR.SUNX : 1) * (has(a, 'rage') && hp[a] < TR.RAGEHP ? TR.RAGEX : 1) * (has(d, 'adapt') ? 1 - TR.AD * ad[d] : 1);
    const took = (d, v) => { if (!(v > 0)) return; taken[d]++; if (has(d, 'adapt') && ad[d] < TR.ADN && hp[d] > 0) { ad[d]++; rec({ a: d, k: 'tr', tr: 'adapt', lv: ad[d] }); } };
    const awaken = d => { // despertar: solo si sigue en pie, aún no lo ha usado y el rival no tiene Requiem
      if (aw[d] || hp[d] <= 0 || hp[d] > AN.AWHP || has(1 - d, 'req')) return;
      aw[d] = true; if (rng() > AN.AWP) return; // solo lo intenta una vez por combate, y no siempre sale
      bo[d] += AN.AWK; hp[d] = Math.min(1, hp[d] + .06); en[d] = Math.min(1, en[d] + .5);
      rec({ a: d, k: 'awake' });
    };
    const strike = (a, kind, extra) => { // kind: 'hit' | 'sp' | 'ctr'
      const d = 1 - a, sp = kind === 'sp', ctr = kind === 'ctr';
      if (inf[d] > 0) { inf[d]--; rec(Object.assign({ a: d, k: 'tr', tr: 'inf', by: a }, extra)); return; }
      const crit = rng() < .06 + clamp(S(a, 'TEC'), 0, 1000) / 1000 * .1;
      const P = sp ? S(a, 'ENE') : S(a, 'STR');
      const x = Math.min(1, AN.BASE * mul(P - S(d, 'DUR')) * (.7 + .6 * rng()) * (crit ? 1.6 : 1) * (sp ? 1.55 : 1) * (ctr ? .6 : 1) * boost(a, d));
      if (saves(d, x)) return save(d);
      const v = hurt(d, x);
      rec(Object.assign({ a, k: ctr ? 'ctr' : sp ? (crit ? 'spc' : 'sp') : crit ? 'crit' : 'hit', crit, dmg: +v.toFixed(4), v: rndi(rng, 0, 5) }, extra));
      took(d, v); awaken(d);
    };
    const turn = a => {
      const d = 1 - a;
      if (stun[a] > 0) { stun[a]--; rec({ a, k: 'tr', tr: 'stun' }); return; }
      acts[a]++;
      en[a] = Math.min(1, en[a] + AN.REGEN);
      // rasgos que se activan al empezar su turno
      if (has(a, 'regen') && hp[a] < TR.RGHP && rg[a] < TR.RGN) { rg[a]++; hp[a] = Math.min(1, hp[a] + TR.RG); rec({ a, k: 'tr', tr: 'regen', heal: TR.RG }); }
      if (has(a, 'rage') && hp[a] < TR.RAGEHP && !used[a].rage) { used[a].rage = 1; rec({ a, k: 'tr', tr: 'rage' }); }
      if (has(a, 'gen') && !used[a].gen) { used[a].gen = 1; stun[d] = TR.GEN; rec({ a, k: 'tr', tr: 'gen' }); return; }
      if (has(a, 'serious') && !used[a].ser && taken[a] >= TR.SER) { // atraviesa el Infinito; solo el Requiem lo para
        used[a].ser = 1; rec({ a, k: 'tr', tr: 'serious' });
        const x = Math.max(TR.SERX, Math.min(1, AN.BASE * mul(S(a, 'STR') - S(d, 'DUR')) * 2.5));
        if (saves(d, x)) return save(d);
        const v = hurt(d, x); rec({ a, k: 'spc', crit: true, dmg: +v.toFixed(4), v: 0 }); took(d, v); awaken(d); return;
      }
      if (has(a, 'time') && !used[a].ts && (hp[a] < .75 || rng() < .25)) {
        used[a].ts = 1; rec({ a, k: 'tr', tr: 'time' });
        for (let j = 0; j < TR.TS && hp[d] > 0; j++) strike(a, 'hit', { ts: 1 });
        return;
      }
      if (has(a, 'domain') && !used[a].dom && en[a] >= TR.DOMC && (hp[a] < .8 || rng() < .25)) { used[a].dom = 1; en[a] -= TR.DOMC; dom[a] = TR.DOMN; rec({ a, k: 'tr', tr: 'domain' }); return; }
      const sure = dom[a] > 0;
      const wantSp = en[a] >= AN.SPC && rng() < .2 + (S(a, 'ENE') >= S(a, 'STR') ? .14 : 0) + (hp[a] < .4 ? .12 : 0);
      if (wantSp) {
        en[a] -= AN.SPC;
        if (en[d] >= AN.SPC && rng() < .3) { // CHOQUE DE TÉCNICAS
          en[d] -= AN.SPC;
          const q = clamp(1 / (1 + Math.pow(10, -ex(S(a, 'ENE') - S(d, 'ENE')) * AN.K1 / AN.KS)), .1, .9), w = rng() < q ? a : 1 - a, l = 1 - w;
          let x = .5; const fr = []; // punto de choque (0 = lado del jugador 0, 1 = lado del jugador 1); empuja hacia el perdedor
          for (let i = 0; i < 4; i++) { x = clamp(x + (rng() - .5) * .34 + (l === 1 ? .05 : -.05), .2, .8); fr.push(+x.toFixed(2)); }
          fr.push(l === 1 ? 1 : 0);
          const crit = rng() < .1, dx = Math.min(1, AN.BASE * mul(S(w, 'ENE') - S(l, 'DUR')) * (.8 + .4 * rng()) * 1.7 * (crit ? 1.4 : 1) * boost(w, l));
          const neg = saves(l, dx), v = neg ? 0 : hurt(l, dx);
          rec({ a, k: 'clash', w, crit, fr, dmg: +v.toFixed(4), v: rndi(rng, 0, 5), vw: rndi(rng, 0, 5) });
          if (neg) save(l); else { took(l, v); awaken(l); }
          return;
        }
      }
      const acc = sure ? 1 : clamp(.8 + (skill(a) - skill(d)) / AN.KA + (wantSp ? .05 : 0) - (has(d, 'ui') ? TR.UI : 0), .35, .95);
      if (rng() > acc) {
        rec({ a, k: 'miss', crit: false, sp: wantSp, v: rndi(rng, 0, 5) });
        if (rng() < .22 + Math.max(0, S(d, 'TEC') - S(a, 'TEC')) / 1500) strike(d, 'ctr');
        return;
      }
      strike(a, wantSp ? 'sp' : 'hit');
    };
    const act = a => { const inDom = dom[a] > 0; turn(a); if (inDom) dom[a] = Math.max(0, dom[a] - 1); };
    // GOD: actúa primero y borra al rival de un solo toque (si los dos lo fueran, combate normal)
    const gd = tr.map(t => t === 'touch');
    if (gd[0] !== gd[1]) {
      const a = gd[0] ? 0 : 1;
      rec({ a, k: 'tr', tr: 'touch' });
      const v = hurt(1 - a, hp[1 - a]);
      rec({ a, k: 'spc', crit: true, dmg: +v.toFixed(4), v: 0 });
      return { w: a, hp, hits, en, aw, dmg };
    }
    for (const i of [0, 1]) { // rasgos que se activan al empezar el duelo
      const o = 1 - i;
      if (has(i, 'toll')) { en[o] = Math.max(0, en[o] - TR.TOLLE); const v = hurt(o, Math.max(0, Math.min(hp[o] - .02, TR.TOLLH))); rec({ a: i, k: 'tr', tr: 'toll', dmg: +v.toFixed(4) }); }
      if (has(i, 'sun')) rec({ a: i, k: 'tr', tr: 'sun' });
    }
    while (hp[0] > 0 && hp[1] > 0 && hits.length < AN.CAP) act(rng() < pA() ? 0 : 1);
    if (hp[0] > 0 && hp[1] > 0) { // tope de golpes: el que va peor cae con un último golpe
      const l = hp[0] < hp[1] ? 0 : hp[1] < hp[0] ? 1 : +(rng() < .5), v = hurt(l, hp[l]);
      rec({ a: 1 - l, k: 'crit', crit: true, dmg: +v.toFixed(4), v: rndi(rng, 0, 5) });
    }
    return { w: hp[0] > 0 ? 0 : 1, hp, hits, en, aw, dmg };
  }

  // Antes del combate de anime cada jugador puede ordenar a sus luchadores. perm = nuevo orden con los índices actuales (p. ej. [2,0,1]).
  function order(g, p, perm) {
    if (g.cat !== 'anime' || g.phase !== 'fight' || (p !== 0 && p !== 1)) return false;
    const c = g.P[p].c;
    if (!Array.isArray(perm) || perm.length !== c.length || new Set(perm).size !== c.length || perm.some(x => !Number.isInteger(x) || x < 0 || x >= c.length)) return false;
    g.P[p].c = perm.map(x => c[x]); return true;
  }

  // Combate final de anime: devuelve el guion completo (eventos) para animarlo. Solo lleva nombres, vida, ki y estadísticas.
  function resolveAnime(g) {
    const rng = g.rng, T = g.P.map(p => p.c.map(c => ({ n: c.n, pw: c.pw, tr: c.tr || '', st: stats(c), f: 1, e: 1, aw: false, dead: false, ko: 0, dmg: 0 }))), i = [0, 0];
    const alive = p => i[p] < T[p].length, ev = [{ t: 'start', teams: T.map(t => t.map(c => c.n)) }];
    const send = p => { const c = T[p][i[p]]; ev.push({ t: 'send', p, k: i[p], n: c.n, f: +c.f.toFixed(4), e: +c.e.toFixed(3), aw: c.aw, st: c.st }); };
    if (alive(0)) send(0);
    if (alive(1)) send(1);
    let k = 0;
    while (alive(0) && alive(1)) {
      const A = T[0][i[0]], B = T[1][i[1]], sim = duel(rng, A, B), wp = sim.w, lp = 1 - wp, W = T[wp][i[wp]], L = T[lp][i[lp]];
      ev.push({ t: 'duel', k: k++, a: A.n, b: B.n, hits: sim.hits });
      A.dmg += sim.dmg[0]; B.dmg += sim.dmg[1]; A.aw = sim.aw[0]; B.aw = sim.aw[1];
      const rem = Math.max(.03, sim.hp[wp]);
      W.f = rem; W.e = Math.min(1, sim.en[wp] + .3); W.ko++; L.f = 0; L.dead = true;
      ev.push({ t: 'down', p: lp, k: i[lp], n: L.n }, { t: 'stands', p: wp, n: W.n, pct: Math.round(rem * 100), e: +W.e.toFixed(3) });
      i[lp]++; if (alive(lp)) send(lp);
    }
    const w = alive(0) ? 0 : alive(1) ? 1 : -1;
    const all = T.flatMap((t, p) => t.map(c => ({ p, n: c.n, ko: c.ko, dmg: c.dmg })));
    const mvp = all.length ? all.sort((x, y) => y.ko - x.ko || y.dmg - x.dmg)[0] : null;
    ev.push({ t: 'end', w, sv: w < 0 ? [] : T[w].filter(c => !c.dead).map(c => ({ n: c.n, f: c.f })), mvp: mvp && { p: mvp.p, n: mvp.n, ko: mvp.ko, dmg: +mvp.dmg.toFixed(3) } });
    return { ev, winner: w };
  }

  /* ---------- NOCHE DE COMBATES (UFC): un combate por categoría, gana quien tenga más victorias ---------- */
  const POOLF = { S: ['koPunch', 'koPunch', 'koKick', 'koKnee', 'tkoStrikes'], G: ['subRNC', 'subArm', 'subTri', 'subGuil', 'subKimura'], W: ['tkoGnp', 'tkoGnp', 'tkoStrikes', 'subRNC', 'subArm'], B: ['koPunch', 'koKick', 'tkoGnp', 'subRNC', 'subGuil', 'subArm', 'tkoStrikes'] };
  const FINP = { S: .62, G: .58, W: .45, B: .55 }; // probabilidad de finalizar según el estilo del ganador
  // P(gana A) = 1/(1+10^((rB-rA)/UFC_D)). Antes UFC_D = 250 era demasiado plano: Jon Jones (980) solo ganaba a Chuck Liddell (860) el 75 % de las veces.
  // Con 125: +50 → 72 %, +100 → 86 %, +120 (Jones-Liddell) → 90 %, +200 → 97,5 %.
  const UFC_D = 125;
  function decide(rng, A, B) { // A = jugador 0, B = jugador 1
    const pA = 1 / (1 + Math.pow(10, (B.pw - A.pw) / UFC_D)), aw = rng() < pA, W = aw ? A : B, L = aw ? B : A, gap = Math.abs(A.pw - B.pw), fav = W.pw > L.pw;
    if (rng() < Math.min(.97, FINP[W.sty] + (fav ? gap / 250 : 0))) {
      const big = fav && gap >= 110, rd = big ? 1 : rndi(rng, 1, 3);
      return { aw, fin: 1, big, rd, key: pick(rng, POOLF[W.sty]), time: big ? '0:' + pad2(rndi(rng, 5, 59)) : rndi(rng, 0, 4) + ':' + pad2(rndi(rng, 0, 59)) };
    }
    const sp = rng() < .12 + .3 * (1 - Math.abs(2 * pA - 1));
    return { aw, fin: 0, rd: 3, key: sp ? 'decS' : 'decU', sc: sp ? pick(rng, ['29-28, 28-29, 29-28', '29-28, 29-28, 28-29']) : pick(rng, ['30-27, 30-27, 30-27', '30-27, 29-28, 30-27', '29-28, 29-28, 29-28', '30-27, 30-27, 29-28']) };
  }

  // Devuelve todos los combates ya resueltos, con la coreografía golpe a golpe (vida de cada luchador tras cada golpe).
  function resolveUfc(g) {
    const rng = g.rng, bouts = [], sc = [0, 0], fn = [0, 0];
    const bs = g.divs.map(d => [g.P[0].c.find(c => c.cls === d.k), g.P[1].c.find(c => c.cls === d.k)]).filter(b => b[0] && b[1]);
    bs.forEach(([A, B], k) => {
      const o = decide(rng, A, B), wp = o.aw ? 0 : 1, lp = 1 - wp;
      const lt = o.fin ? 0 : .25 + rng() * .2, wt = o.fin ? .45 + rng() * .4 : .55 + rng() * .3, per = o.big ? 1 : 3, H = o.rd * per;
      let e = 0; const hp = [1, 1], rounds = [];
      for (let r = 1; r <= o.rd; r++) {
        const ex = [];
        for (let j = 0; j < per; j++) {
          e++; const beats = [];
          hp[lp] = 1 - (1 - lt) * e / H; beats.push({ a: wp, hp: [...hp] });                       // el ganador conecta
          if (per > 1 && j === 1) { hp[wp] = 1 - (1 - wt) * e / H; beats.push({ a: lp, hp: [...hp] }); } // el perdedor contraataca
          ex.push(beats);
        }
        rounds.push({ r, time: o.fin && r === o.rd ? o.time : '5:00', ex });
      }
      hp[wp] = wt; sc[wp]++; if (o.fin) fn[wp]++;
      bouts.push({ k, cls: A.cls, a: A.n, b: B.n, w: wp, fin: o.fin, big: !!o.big, rd: o.rd, key: o.key, time: o.time, sc: o.sc, rounds, hpEnd: [...hp] });
    });
    const w = sc[0] !== sc[1] ? +(sc[1] > sc[0]) : fn[0] !== fn[1] ? +(fn[1] > fn[0]) : -1, tb = sc[0] === sc[1] && w >= 0;
    return { bouts, result: { w, tb, sc, fn } };
  }


  /* ---------- FÚTBOL: partido simulado minuto a minuto ----------
     Cada equipo: portero, defensa, medio y ataque (media de cada línea). En cada minuto puede haber una jugada de ataque;
     quién ataca depende sobre todo del centro del campo, y la calidad de la ocasión del ataque rival contra la defensa propia.
     El remate lo hace un jugador concreto (más probable si es delantero centro y cuanto mejor sea) y el portero puede pararlo.
     Calibrado con miles de partidos simulados (victoria en 90' / contando penaltis):
       iguales ≈ 2,8 goles y 25 % de empates · +5 de media ≈ 51 % / 65 % · +10 ≈ 66 % / 79 % · +20 ≈ 88 % / 95 %.
     Si hay empate se decide en una tanda de penaltis. */
  const FT = { K: 130, SH: 80, GK: 250, Q0: .12, ATT: .225, CARD: .032 };
  const avg = a => a.reduce((x, c) => x + c.ovr, 0) / a.length;
  function futXI(cards) { // 11 huecos: 0 POR · 1-4 DEF (LI, DFC, DFC, LD) · 5-7 MED (MC, MCD, MC) · 8-10 DEL (EI, DC, ED)
    const by = k => cards.filter(c => c.cls === k), fill = (a, n, k) => { a = a.slice(0, n); while (a.length < n) a.push({ n: '', ovr: 50, cls: k, role: '', ghost: 1 }); return a; };
    const take = (a, roles) => { const i = a.findIndex(c => roles.includes(c.role)); return i >= 0 ? a.splice(i, 1)[0] : a.shift(); };
    const d = fill(by('DEF'), 4, 'DEF'), m = fill(by('MID'), 3, 'MID'), f = fill(by('FWD'), 3, 'FWD'), gk = fill(by('GK'), 1, 'GK')[0];
    const lb = take(d, ['LI']), rb = take(d, ['LD']), cdm = take(m, ['MCD']), st = take(f, ['DC']), lw = take(f, ['EI']);
    return [gk, lb, d[0], d[1], rb, m[0], cdm, m[1], lw, st, f[0]];
  }
  const SHW = c => !c || c.ghost ? .05 : ({ DC: 3.4, EI: 2.4, ED: 2.4, MCO: 1.5, MC: .9, MCD: .45 }[c.role] || (c.cls === 'FWD' ? 2.6 : c.cls === 'MID' ? .9 : c.cls === 'DEF' ? .25 : 0)) * Math.pow((c.ovr || 50) / 80, 4);
  function wpick(rng, ids, w) { const t = ids.reduce((s, i) => s + w(i), 0); let r = rng() * t; for (const i of ids) { r -= w(i); if (r <= 0) return i; } return ids[ids.length - 1]; }
  function resolveFutbol(g) {
    const rng = g.rng, X = g.P.map(p => futXI(p.c));
    const T = X.map(x => { const G = x[0].ovr, D = avg(x.slice(1, 5)), M = avg(x.slice(5, 8)), A = avg(x.slice(8)); return { G, D, M, A, AP: .6 * A + .3 * M + .1 * D, DP: .6 * D + .4 * M }; });
    const sh0 = clamp(1 / (1 + Math.pow(10, -((T[0].M - T[1].M) * .7 + ((T[0].AP - T[1].DP) - (T[1].AP - T[0].DP)) * .3) / FT.SH)), .28, .72);
    const sc = [0, 0], st = { sh: [0, 0], sot: [0, 0], xg: [0, 0], yc: [0, 0], att: [0, 0] }, R = X.map(x => x.map(c => c.ghost ? 0 : 6.4 + (c.ovr - 80) / 40)), yc = [new Set(), new Set()];
    const ev = [{ t: 'lineups', L: X.map(x => x.map(c => c.n)), T: T.map(t => ({ G: Math.round(t.G), D: Math.round(t.D), M: Math.round(t.M), A: Math.round(t.A) })) }, { t: 'ko', h: 1 }];
    const ids = [...Array(11).keys()];
    const attack = (m, p) => {
      const o = 1 - p, x = X[p], gk = X[o][0];
      st.att[p]++;
      if (rng() < .025) { // penalti
        const s = wpick(rng, ids.slice(5), i => SHW(x[i]) * (x[i].role === 'DC' ? 1.6 : 1)), q = clamp(.76 + (x[s].ovr - gk.ovr) / 250, .55, .92), goal = rng() < q;
        const out = goal ? 'goal' : rng() < .65 ? 'save' : 'wide';
        st.sh[p]++; st.xg[p] += .76; if (out !== 'wide') st.sot[p]++;
        if (goal) { sc[p]++; R[p][s] += 1; R[o][0] -= .3; } else if (out === 'save') R[o][0] += .9;
        ev.push({ t: 'att', m, p, pen: 1, ch: [], sh: s, out, xg: .76, sc: [...sc], d: rndi(rng, 0, 2) });
        return;
      }
      const ch = [rng() < .15 ? 0 : rndi(rng, 1, 4)]; // salida: portero o defensa
      const nm = rng() < .5 ? 1 : 2; for (let i = 0; i < nm; i++) ch.push(rndi(rng, 5, 7));
      if (rng() < .55) ch.push(rndi(rng, 8, 10));
      const s = wpick(rng, ids.slice(1), i => SHW(x[i]) * (i === ch[ch.length - 1] ? .6 : 1));
      if (ch[ch.length - 1] === s) ch.pop();
      const q = clamp(FT.Q0 * Math.pow(10, (T[p].AP - T[o].DP) / FT.K) * Math.pow(10, (x[s].ovr - gk.ovr) / FT.GK) * (.45 + 1.1 * rng()), .01, .7);
      const r = rng(); let out;
      if (r < q) out = rng() < .05 ? 'var' : 'goal';
      else { const u = rng(); out = u < .38 ? 'save' : u < .44 ? 'post' : u < .66 ? 'block' : 'wide'; }
      st.sh[p]++; st.xg[p] += q; if (out === 'goal' || out === 'save' || out === 'var') st.sot[p]++;
      let as = -1;
      if (out === 'goal') {
        sc[p]++; R[p][s] += 1.1; R[o][0] -= .25; for (let i = 1; i <= 4; i++) R[o][i] -= .1;
        const last = ch[ch.length - 1]; if (last != null && last >= 5 && rng() < .8) { as = last; R[p][as] += .6; }
      } else if (out === 'save') R[o][0] += .25 + q;
      else if (out === 'block') R[o][rndi(rng, 1, 4)] += .2;
      ev.push({ t: 'att', m, p, ch, sh: s, as, out, xg: +q.toFixed(2), sc: [...sc], d: rndi(rng, 0, 2), bl: out === 'block' ? rndi(rng, 1, 4) : -1 });
    };
    const card = (m) => {
      const p = rng() < .5 ? 0 : 1, i = wpick(rng, ids.slice(1), i => i <= 4 ? 1.6 : i <= 7 ? 1.2 : .5);
      if (X[p][i].ghost || yc[p].has(i)) return;
      yc[p].add(i); st.yc[p]++; R[p][i] -= .3;
      ev.push({ t: 'yc', m, p, i });
    };
    const half = (from, to, extra) => {
      for (let m = from; m <= to + extra; m++) {
        if (rng() < FT.ATT) attack(m > to ? to + '+' + (m - to) : m, rng() < sh0 ? 0 : 1);
        if (rng() < FT.CARD) card(m > to ? to + '+' + (m - to) : m);
      }
    };
    half(1, 45, rndi(rng, 1, 3)); ev.push({ t: 'ht', sc: [...sc] }, { t: 'ko', h: 2 });
    half(46, 90, rndi(rng, 2, 6)); ev.push({ t: 'ft', sc: [...sc] });
    let pens = null, w = sc[0] > sc[1] ? 0 : sc[1] > sc[0] ? 1 : -1;
    if (w < 0) { // tanda de penaltis
      const order = x => [9, 8, 10, 5, 7, 6, 1, 4, 2, 3, 0].filter(i => !x[i].ghost);
      const O = X.map(x => { const o = order(x); return o.length ? o : [9]; }), ps = [0, 0], seq = [];
      for (let k = 0; k < 30; k++) {
        const p = k % 2, o = 1 - p, s = O[p][Math.floor(k / 2) % O[p].length], gk = X[o][0];
        const goal = rng() < clamp(.75 + (X[p][s].ovr - gk.ovr) / 220, .55, .92); if (goal) ps[p]++;
        seq.push({ p, s, goal, out: goal ? 'goal' : rng() < .65 ? 'save' : 'wide', d: rndi(rng, 0, 2), gd: rndi(rng, 0, 2), ps: [...ps] });
        if (k < 10) { const rem0 = 5 - Math.ceil((k + 1) / 2), rem1 = 5 - Math.floor((k + 1) / 2); if (ps[0] > ps[1] + rem1 || ps[1] > ps[0] + rem0) break; }
        else if (p === 1 && ps[0] !== ps[1]) break;
      }
      pens = ps; w = ps[0] > ps[1] ? 0 : ps[1] > ps[0] ? 1 : +(rng() < .5); R[w][0] += .4;
      ev.push({ t: 'pens', seq });
    }
    R[w].forEach((v, i) => { R[w][i] = v + .3; });
    let best = { p: 0, i: 0, r: -1 }; R.forEach((rr, p) => rr.forEach((r, i) => { if (!X[p][i].ghost && r > best.r) best = { p, i, r }; }));
    const poss = Math.round(clamp(sh0 * 100 + (rng() - .5) * 8, 28, 72));
    ev.push({ t: 'end', w, sc: [...sc], pens, st: { poss: [poss, 100 - poss], sh: st.sh, sot: st.sot, xg: st.xg.map(v => +v.toFixed(2)), yc: st.yc },
      motm: { p: best.p, i: best.i, n: X[best.p][best.i].n, r: +clamp(best.r, 5, 10).toFixed(1) } });
    return { ev, winner: w };
  }
  // Para el servidor: resuelve el final de cualquier categoría y devuelve lo que hay que mandar a los jugadores como 'fight'.
  function resolve(g) {
    if (g.cat === 'ufc') return { kind: 'ufc', script: resolveUfc(g) };
    if (g.cat === 'futbol') return { kind: 'futbol', script: resolveFutbol(g) };
    return { kind: 'anime', script: resolveAnime(g) };
  }

  return { VERSION, CFG, MAXC, SECS, AN, TR, order, FT, FUT_DIVS, futXI, resolveFutbol, resolve, create, can, out, next, tick, place, skip, close, duel, stats, decide, resolveAnime, resolveUfc, mulberry32 };
});