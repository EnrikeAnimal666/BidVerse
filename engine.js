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

  const VERSION = '2026-11-24a';
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
  const shuffle = (rng, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  /* Rareza (solo anime): los rotos (poder ≥ 900: God, Zeno, La Verdad, Gran Sacerdote, Whis, Saitama, Goku, Beerus) salen en 1 de cada 10 partidas.
     Con probabilidad ROTO_P uno de ellos (al azar) entra entre los 6 primeros lotes, que toda partida llega a ver; los demás van al fondo del mazo.
     En esas partidas el resto del mazo se endurece para que quien no se lleve el roto tenga una pequeña oportunidad:
       · los débiles se van al fondo: barajado con pesos (poder < 300 pesa 0,2 y < 450 pesa 0,5), así salen muchos menos al principio
       · Light Yagami (el Death Note se lleva por delante a cualquiera, hasta a God) tiene LIGHT_P más de colarse entre los LIGHT_TOP primeros lotes
     Calibrado con 20.000 mazos (10 primeros lotes): débiles (< 300) ~1,5 → ~0,4 · medios (300-449) ~4,8 → ~3,5 · Light ~6 % → ~23 %. */
  const ROTO_PW = 900, ROTO_P = 1 / 10, LIGHT_P = .15, LIGHT_TOP = 10;
  const deckW = c => c.tr === 'dnote' ? 1 : c.pw < 300 ? .2 : c.pw < 450 ? .5 : 1;
  const wshuffle = (rng, a, w) => a.map(c => ({ c, k: Math.pow(rng(), 1 / w(c)) })).sort((x, y) => y.k - x.k).map(x => x.c); // Efraimidis-Spirakis
  function animeDeck(rng, pool) {
    const roto = c => c.pw >= ROTO_PW, rest = pool.filter(c => !roto(c)), top = shuffle(rng, pool.filter(roto));
    if (!top.length || rng() >= ROTO_P) return shuffle(rng, rest).concat(top);
    const deck = wshuffle(rng, rest, deckW), li = deck.findIndex(c => c.tr === 'dnote');
    if (li >= LIGHT_TOP && rng() < LIGHT_P) deck.splice(rndi(rng, 0, LIGHT_TOP - 2), 0, deck.splice(li, 1)[0]); // (luego entra el roto: Light sigue entre los 10 primeros)
    deck.splice(rndi(rng, 0, Math.min(5, deck.length)), 0, top.shift());
    return deck.concat(top);
  }

  /* ---------- estado ---------- */
  function create({ cat, pool, divs = [], rng = Math.random }) {
    if (!CFG[cat]) throw new Error('categoría desconocida: ' + cat);
    if (cat === 'futbol' && !(divs && divs.length)) divs = FUT_DIVS;
    const deck = cat !== 'anime'
      ? divs.flatMap(d => shuffle(rng, pool.filter(x => x.cls === d.k)))
      : animeDeck(rng, pool);
    return {
      cat, rng, divs, deck, idx: -1, dv: '', cur: null, bid: 0, leader: -1, left: SECS, free: -1, fp: false,
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
  /* Lote gratis (g.free = quien se lo puede quedar sin pagar). Hay dos motivos:
       · el rival no puede pujar (sin dinero o sin hueco): g.fp = false
       · el rival ha pasado (saltado) este lote:          g.fp = true
     gives(g, p): pasar ahora le regala el lote al rival sin gastar saltos (el rival no tiene dinero pero sí hueco). */
  const gives = (g, p) => g.free === p && !g.fp && can(g, 1 - p);

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
    g.cur = g.deck[g.idx]; g.bid = 0; g.leader = -1; g.left = SECS; g.free = -1; g.fp = false;
    const e = [can(g, 0), can(g, 1)], b = [e[0] && g.P[0].m >= 1, e[1] && g.P[1].m >= 1], dead = e[0] && e[1] && !b[0] && !b[1];
    if (e[0] && e[1]) { if (b[0] !== b[1]) g.free = b[0] ? 0 : 1; } else g.free = e[0] ? 0 : 1; // lote gratis para quien aún puede coger
    g.passed = [false, false]; if (g.free >= 0) g.passed[1 - g.free] = true;
    g.locked = dead; g.phase = 'bidding';
    const ev = [{ t: 'lot' }];
    if (dead) { const r = giveRandom(g, true); return { ev: ev.concat(r.ev), wait: r.wait }; } // nadie tiene dinero: este lote va a uno al azar
    if (g.free >= 0 && g.skips[g.free] <= 0 && !gives(g, g.free)) { // no le quedan descartes (y no puede regalárselo al rival): se lo lleva gratis
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
    if (g.passed[p] || (g.skips[p] <= 0 && !gives(g, p))) return NONE(); // regalárselo al rival sin dinero no gasta saltos
    g.passed[p] = true;
    if (g.free === p) return close(g, false); // pasa quien tenía el lote gratis: regalo, descarte o los dos pasan
    // Pasa con el lote abierto: el rival se lo puede llevar GRATIS (y se lo lleva si no hace nada). Si a él tampoco le quedan saltos, ya es suyo.
    const o = 1 - p; g.free = o; g.fp = true; g.left = SECS;
    const ev = [{ t: 'pass', p }];
    if (g.skips[o] <= 0) { g.locked = true; g.leader = o; g.phase = 'forced'; ev.push({ t: 'forced' }); return { ev, wait: { ms: 1600, act: 'close' } }; }
    return { ev, wait: null };
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
    else if (g.free >= 0 && !g.fp) { // pasa quien lo tenía gratis porque el rival no podía pujar
      const o = 1 - g.free;
      if (can(g, o)) { g.P[o].c.push({ ...g.cur, paid: 0, free: true }); ev.push({ t: 'sold', p: o, price: 0, free: true, gift: true }); } // el rival sin dinero pero con hueco se lo queda gratis (no cuesta saltos)
      else { g.skips[g.free] = Math.max(0, g.skips[g.free] - 1); ev.push({ t: 'discard' }); } // sin hueco en el rival: se descarta y cuesta un salto
    }
    else { ev.push({ t: 'noBids' }); g.skips = g.skips.map(s => Math.max(0, s - 1)); } // pasan los dos
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
  /* PUNTOS DE VIDA (anime): cada personaje tiene su vida máxima, sobre todo por su resistencia (DUR) y algo por el resto.
     Crece en exponencial como el poder: ~400 PS un humano corriente, ~2.000 a media tabla, ~10.000 un dios.
     El duelo se sigue calculando en fracción de vida (0-1); el daño en puntos = fracción × vida máxima de quien lo recibe. */
  function hpMax(s) {
    if (!s) return 1000;
    const v = .7 * s.DUR + .3 * (s.STR + s.SPD + s.TEC + s.ENE) / 4;
    return Math.max(100, Math.round(400 * Math.pow(10, 1.4 * clamp(v, 0, 1100) / 1000) / 10) * 10);
  }

  /* ---------- DUELO (anime) v3 ----------
     Idea: diferencias pequeñas de poder = combate igualado; a partir de ~100 puntos el más fuerte gana casi siempre y con 300+ es una paliza
     (realista: el débil solo tiene una pequeña oportunidad). Calibrado con miles de duelos simulados (mismo perfil, sin daño previo):
       +25 → ~57 %   +50 → ~64 %   +100 → ~78 %   +150 → ~87 %   +200 → ~94 %   +300 → ~99 %   +400 → 100 %
     (v2 era mucho más plana: +100 → 65 %, +200 → 79 %, +300 → 92 %.) Lo que la endurece: menos forma del día (FORM), menos azar en el daño (VAR),
     ventaja de velocidad y de precisión más marcada (K1, KS, KA) y un despertar menos frecuente y más flojo (AWP, AWK).
     Mecánicas (todas salen en el guion para animarlas):
       · golpe / crítico                · técnica especial (gasta ki, más daño)   · esquiva (+ contraataque)
       · choque de técnicas: los dos lanzan su técnica a la vez y empujan; el que gana revienta al otro
       · despertar: la primera vez que un personaje baja del 33 % de vida puede (40 %) sacar su verdadero poder (+stats, recupera ki). Una vez por combate.
     La vida y el ki que le quedan al ganador pasan al siguiente duelo (el ki se recupera un poco entre duelos). */
  const AN = { FORM: 35, K1: 2000, K3: 900, BASE: .19, KS: 1500, KA: 1500, AWK: 45, AWHP: .33, AWP: .4, SPC: .34, REGEN: .05, CAP: 80, VAR: .4 };
  const ex = d => d / AN.K1 + Math.sign(d) * Math.pow(Math.abs(d) / AN.K3, 3); // exponente: lineal suave + cúbico (castiga las diferencias enormes)
  const mul = d => Math.pow(10, ex(d));
  /* ---------- RASGOS (anime): habilidades propias de algunos personajes. La clave está en data-anime.js (TRAITS) y llega como c.tr ----------
     COMPARTIDOS
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
     ÚNICAS (una por personaje icónico)
       ultra     Goku: el rival falla un 22 % más y cada esquiva es un contraataque a plena potencia
       ego       Vegeta: cada golpe recibido le sube 22 a todo (hasta 6 veces)
       hakai     Beerus: 1 vez, si el rival baja del 35 %, lo destruye
       erase     Zeno: al empezar el duelo, 50 % de borrar al rival
       rewind    Whis: 1 vez, deshace el primer golpe de 15 %+ y el rival pierde un turno
       copy      Garou: cuando le alcanza una técnica la copia y la devuelve (2 veces)
       clones    Naruto: en sus 3 primeros ataques un clon también golpea (60 %)
       amaterasu Sasuke: su primer golpe prende llamas negras: el rival pierde un 4 % en cada turno (8 turnos)
       meteor    Madara: empieza el duelo con 2 meteoritos (esquivables si el rival es más rápido)
       tsukuyomi Itachi: en su primer turno el rival pierde 2 turnos, un 12 % de vida y un 30 % de ki
       kamui     Kakashi: la primera técnica del rival se va a otra dimensión
       gates     Might Guy: 1 vez por debajo del 35 %: Night Guy (60 %+) a cambio de quemarse el cuerpo
       gear5     Luffy: 1 vez por debajo del 50 %: +25 % de vida, +70 a todo y acierta más
       asura     Zoro: +15 % de críticos y sus críticos pegan ×2,4
       quake     Barbablanca: sus técnicas tienen un 50 % de dejar al rival sin turno
       haki      Shanks: el rival con 200 de poder menos se desmaya; el resto pierde su primer turno
       mugetsu   Ichigo: 1 vez por debajo del 30 %: golpe de 65 %+, y después pierde sus poderes
       kyoka     Aizen: los 2 primeros ataques del rival golpean una ilusión
       shrine    Sukuna: dominio (como domain) y además los cortes hieren al rival un 5 % cada turno mientras dura
       bflash    Yuji: 15 % de Destello Negro en sus golpes (×2,5, recupera ki); +10 % tras cada uno
       jackpot   Hakari: cada turno 12 % de premio: se cura entero y los 4 golpes siguientes se regeneran al instante
       rumbling  Eren: 1 vez por debajo del 40 %: 3 pisotones de Colosales imposibles de esquivar
       ackerman  Levi y Mikasa: +1 % de daño por cada 8 de poder que el rival tenga de más (hasta +80 %)
       adult     Gon: 1 vez por debajo del 30 %: +220 a todo 3 turnos; después se consume (−150)
       rose      Netero: al caer, la Rosa del Pobre le hace un 50 % al rival
       steal     Chrollo: roba la habilidad del rival al empezar el duelo (menos el Toque de Dios)
       chain     Kurapika: mata al instante a la Brigada Fantasma; contra el resto, Emperor Time (+90, −3 % de vida por turno)
       hinokami  Tanjiro: tras su primera técnica encadena 3 más sin gastar ki
       anti      Asta: anula la habilidad del rival (menos el Death Note) y las técnicas le hacen un 40 % menos
       zawarudo  Dio: 1 vez: detiene el tiempo, un golpe y remata con una apisonadora
       heaven    Pucci: el tiempo se acelera: tiene al menos el 60 % de los turnos
       counter   Meliodas: devuelve la primera técnica del rival con el doble de fuerza
       arise     Sung Jin-Woo: al empezar el duelo atacan sus sombras: 2 + 1 por rival derrotado (hasta 5)
       geass     Lelouch: una orden por persona: el primer ataque del rival se vuelve contra él
       eclipse   Griffith: 1 vez, en vez de caer, sacrifica al siguiente de su equipo y renace al 60 %
       dnote     Light Yagami: antes que nadie escribe el nombre del rival; el rival lo mata de un golpe (es un simple humano) y
                 40 s después muere de un ataque al corazón. Caen los dos siempre: nada lo para, ni God, ni robarlo ni anularlo.
       perfect   Cell: 1 vez, en vez de caer se regenera de una sola célula: vuelve al 20 % con +30 a todo (Zenkai)
       shock     C.C.: el primer rival que la golpea ve la Imagen de Choque: pierde 1 turno y un 40 % de ki
       makanko   Piccolo: en su 3.er turno suelta el Makankosappo que estaba cargando: no se esquiva, atraviesa el Infinito y quita al menos un 30 %
       mokuton   Hashirama: 1 vez por debajo del 50 %: el Dragón de Madera atrapa al rival (2 turnos), le absorbe el ki y Hashirama se cura un 12 %
       poison    Muzan: cada golpe que conecta le inyecta su sangre al rival: pierde un 1,5 % por dosis en cada turno (hasta 4 dosis)
       kakuja    Kaneki: por debajo del 50 % se cubre con su kakuja: recibe un 30 % menos y cada golpe que da le cura un 4 %
       snatch    Ban: cada golpe que conecta le roba 12 a todo al rival y se lo queda (hasta 5 veces)
       seal      Father: suprime la alquimia: el rival no puede usar técnicas especiales (ni chocarlas), solo golpes
       byakugo   Tsunade: 1 vez por debajo del 35 %: libera el Byakugō, se cura un 40 % y su siguiente golpe pega ×1,8
       exblood   Nezuko: cuando la golpean su sangre explota y quema al atacante un 5 % (hasta 4 veces)
       terpsi    Neferpitou: al caer, Terpsícore mueve su cuerpo como una marioneta: 2 golpes más contra el rival
       hiraishin Minato: actúa siempre el primero y sus 3 primeros turnos de ataque no se pueden esquivar
       room      Law: 1 vez por debajo del 25 %: Shambles intercambia su vida con la del rival (si el rival tiene al menos un 25 % más)
       ispear    Toji: sus golpes atraviesan el Infinito y nada los anula (Requiem, rebobinar, Jackpot, Eclipse, portales…), ni las ilusiones
       judge     Higuruma: en su primer turno juzga al rival: le confisca la habilidad y, si es culpable (60 %), la Espada del Verdugo
                 hace que su siguiente golpe quite al menos un 55 %
       mob100    Mob: tras recibir 3 golpes sus emociones llegan al 100 %: +100 a todo el resto del duelo
       black     Frieza: 1 vez por debajo del 50 %: Black Freezer, +100 a todo
       bungee    Hisoka: en cuanto le conecta un golpe, el Bungee Gum lo deja pegado: el rival ya no puede esquivar sus ataques
       portal    Rick: el primer golpe que le dejaría K.O. entra por un portal y le da al atacante (hasta un 15 %)
     Todo sale en el guion como golpes { k:'tr', tr:<clave>, a:<dueño> } para animarlo. */
  const TR = { INF: 2, TS: 2, UI: .18, TOLLE: .4, TOLLH: .1, DOMC: .5, DOMN: 4, DOMX: 1.4, RGHP: .6, RG: .07, RGN: 4, AD: .1, ADN: 4, GEN: 2, RAGEHP: .4, RAGEX: 1.3, SUNN: 4, SUNX: 1.5, SER: 3, SERX: .55,
    ULTRA: .22, EGO: 22, EGON: 6, HAKAI: .35, ERASE: .5, RWD: .15, CPN: 2, CLN: 3, CLX: .6, BURN: .04, BURNN: 8, MET: 2, GATEHP: .35, G5HP: .5, G5B: 70, G5H: .25, G5A: .12,
    ASC: .15, ASX: 2.4, QK: .5, HAKI: 200, MUGHP: .3, MUGB: 90, KYO: 2, SLASH: .05, BF: .15, BFU: .1, BFX: 2.5, JP: .12, JPN: 4, RBHP: .4, RBN: 3, ACK: 800, ACKX: .8,
    GONHP: .3, GONB: 220, GONN: 3, GONP: 150, ROSE: .5, EMB: 90, EMH: .03, HKN: 3, ANTI: .6, ZWN: 1, MIH: .6, ECL: .6, GS: 1, SHAD: 2, SHADN: 5, FC: .4,
    PFH: .2, PFB: 30, SHK: 1, SHKE: .4, MKT: 3, MKX: .3, MOKHP: .5, MOKN: 2, MOKH: .12, PS: .015, PSN: 4, KJHP: .5, KJD: .7, KJH: .04, SN: 12, SNN: 5,
    BKHP: .35, BKH: .4, BKX: 1.8, XB: .05, XBN: 4, TPN: 2, HRN: 3, RMHP: .25, RMD: .25, JDP: .6, JDX: .55, MOB: 3, MOBB: 100, BLHP: .5, BLB: 100, PTX: .15 };
  // habilidades que paran o desvían golpes (la Lanza Celestial Invertida de Toji las atraviesa)
  const GUARDS = ['inf', 'req', 'rewind', 'jackpot', 'eclipse', 'kyoka', 'perfect', 'portal'];
  const DOT = new Set(['burn', 'slash', 'venom', 'exblood', 'portalhit']); // daño continuo o de rebote: no cuenta como golpe para las reacciones
  const TROUPE = ['Chrollo Lucilfer', 'Uvogin', 'Feitan', 'Phinks', 'Nobunaga', 'Franklin', 'Machi', 'Shalnark', 'Pakunoda', 'Shizuku', 'Bonolenov', 'Kortopi', 'Kalluto']; // Brigada Fantasma (Kurapika)
  function duel(rng, A, B) {
    const fm = [0, 1].map(() => (rng() - .5) * 2 * AN.FORM), F = [A, B];
    const base = F.map((c, i) => { const s = c.st || stats(c); return { STR: s.STR + fm[i], SPD: s.SPD + fm[i], DUR: s.DUR + fm[i], TEC: s.TEC + fm[i], ENE: s.ENE + fm[i] }; });
    const hp = F.map(c => c.f == null ? 1 : c.f), en = F.map(c => c.e == null ? 1 : c.e), aw = F.map(c => !!c.aw), bo = [0, 0], dmg = [0, 0], hits = [];
    const tr = F.map(c => c.tr || ''), has = (i, k) => tr[i] === k, pwOf = i => F[i].pw || 0;
    const X = [{}, {}], used = [{}, {}], dom = [0, 0], stun = [0, 0], acts = [0, 0], taken = [0, 0], inf = [0, 0];
    const S = (i, k) => base[i][k] + bo[i];
    const rec = o => { hits.push(Object.assign(o, { hp: hp.map(x => +x.toFixed(4)), en: en.map(x => +x.toFixed(3)) }, dom[0] || dom[1] ? { dz: [...dom] } : null)); return o; };
    const pA = () => {
      let p = clamp(1 / (1 + Math.pow(10, -ex(S(0, 'SPD') - S(1, 'SPD')) * AN.K1 / AN.KS)), .2, .8);
      if (has(0, 'heaven')) p = Math.max(p, TR.MIH); if (has(1, 'heaven')) p = Math.min(p, 1 - TR.MIH); // Made in Heaven
      return p;
    };
    const skill = i => .6 * S(i, 'SPD') + .4 * S(i, 'TEC');
    const fx = (a, d, k, P = 'ENE') => AN.BASE * mul(S(a, P) - S(d, 'DUR')) * k; // daño "de fórmula" de las técnicas de los rasgos
    const hurt = (d, x) => { const v = Math.min(hp[d], x); hp[d] = Math.max(0, hp[d] - x); dmg[1 - d] += v; return v; };
    // ¿Algo anula este golpe de a contra d? Devuelve la clave del rasgo que lo para (y lo gasta), o ''. Nada para la Lanza Celestial Invertida.
    const guard = (d, x, a) => {
      if (has(a, 'ispear')) return '';
      if (X[d].jp > 0) { X[d].jp--; return 'jpheal'; }                                                                                 // Jackpot: regeneración instantánea
      if (has(d, 'req') && !used[d].req && x >= hp[d]) { used[d].req = 1; return 'req'; }                                              // Requiem
      if (has(d, 'rewind') && !used[d].rw && x >= TR.RWD) { used[d].rw = 1; stun[1 - d] = Math.max(stun[1 - d], 1); return 'rewind'; } // Whis
      if (has(d, 'eclipse') && !used[d].ecl && x >= hp[d] && F[d].mate) { used[d].ecl = 1; hp[d] = TR.ECL; X[d].sac = 1; return 'eclipse'; } // Griffith
      if (has(d, 'perfect') && !used[d].pf && x >= hp[d]) { used[d].pf = 1; hp[d] = TR.PFH; bo[d] += TR.PFB; return 'perfect'; }        // Cell: renace de una célula
      if (has(d, 'portal') && !used[d].pt && x >= hp[d]) { used[d].pt = 1; X[d].px = Math.min(TR.PTX, x); return 'portal'; }          // Rick: el golpe entra por un portal
      return '';
    };
    const block = (d, g, a) => {
      const r = rec(Object.assign({ a: d, k: 'tr', tr: g, by: a }, g === 'eclipse' ? { s: F[d].mate } : null));
      if (g === 'portal' && hp[a] > 0) { const v = hurt(a, X[d].px || 0); rec({ a: d, k: 'tr', tr: 'portalhit', dmg: +v.toFixed(4) }); took(a, v, 1); awaken(a); } // ...y sale por otro detrás del atacante
      return r;
    };
    const boost = (a, d) => (dom[a] > 0 ? TR.DOMX : 1) * (has(a, 'sun') && acts[a] <= TR.SUNN ? TR.SUNX : 1) * (has(a, 'rage') && hp[a] < TR.RAGEHP ? TR.RAGEX : 1)
      * (has(d, 'adapt') ? 1 - TR.AD * (X[d].ad || 0) : 1) * (has(a, 'ackerman') ? 1 + clamp((pwOf(d) - pwOf(a)) / TR.ACK, 0, TR.ACKX) : 1) * (X[d].kj ? TR.KJD : 1);
    const took = (d, v, dot) => {
      if (!(v > 0)) return; taken[d]++;
      if (hp[d] <= 0) return;
      const o = 1 - d;
      if (has(d, 'mob100') && !used[d].mb && taken[d] >= TR.MOB) { used[d].mb = 1; bo[d] += TR.MOBB; rec({ a: d, k: 'tr', tr: 'mob100' }); }
      if (!dot && has(d, 'shock') && !used[d].shk) { used[d].shk = 1; stun[o] = Math.max(stun[o], TR.SHK); en[o] = Math.max(0, en[o] - TR.SHKE); rec({ a: d, k: 'tr', tr: 'shock' }); }
      if (!dot && has(d, 'exblood') && (X[d].xb || 0) < TR.XBN && hp[o] > 0) { X[d].xb = (X[d].xb || 0) + 1; chip(d, o, TR.XB, 'exblood', null, 1); }
      if (has(d, 'adapt') && (X[d].ad || 0) < TR.ADN) { X[d].ad = (X[d].ad || 0) + 1; rec({ a: d, k: 'tr', tr: 'adapt', lv: X[d].ad }); }
      if (has(d, 'ego') && (X[d].eg || 0) < TR.EGON) { X[d].eg = (X[d].eg || 0) + 1; bo[d] += TR.EGO; rec({ a: d, k: 'tr', tr: 'ego', lv: X[d].eg }); }
    };
    const awaken = d => { // despertar: solo si sigue en pie, aún no lo ha usado y el rival no tiene Requiem
      if (aw[d] || hp[d] <= 0 || hp[d] > AN.AWHP || has(1 - d, 'req')) return;
      aw[d] = true; if (rng() > AN.AWP) return; // solo lo intenta una vez por combate, y no siempre sale
      bo[d] += AN.AWK; hp[d] = Math.min(1, hp[d] + .06); en[d] = Math.min(1, en[d] + .5);
      rec({ a: d, k: 'awake' });
    };
    const chip = (a, d, x, key, tag, pierce) => { // daño directo de un rasgo (meteoritos, sombras, llamas, cortes…)
      if (!pierce && inf[d] > 0) { inf[d]--; rec({ a: d, k: 'tr', tr: 'inf', by: a }); return 0; }
      const g = guard(d, x, a); if (g) { block(d, g, a); return 0; }
      const v = hurt(d, x); rec(Object.assign({ a, k: 'tr', tr: key, dmg: +v.toFixed(4) }, tag)); took(d, v, DOT.has(key)); awaken(d); return v;
    };
    const ult = (a, x, tag) => { // golpe definitivo de un rasgo: no se puede esquivar y atraviesa el Infinito
      const d = 1 - a; x = Math.min(1, x);
      const g = guard(d, x, a); if (g) { block(d, g, a); return 0; }
      const v = hurt(d, x); rec(Object.assign({ a, k: 'spc', crit: true, dmg: +v.toFixed(4), v: 0 }, tag)); took(d, v); awaken(d); return v;
    };
    const strike = (a, kind, tag, mlt = 1, P) => { // kind: 'hit' | 'sp' | 'ctr' · P: poder a usar si no es el de siempre
      const d = 1 - a, sp = kind === 'sp', ctr = kind === 'ctr';
      if (inf[d] > 0 && !has(a, 'ispear')) { inf[d]--; rec(Object.assign({ a: d, k: 'tr', tr: 'inf', by: a }, tag)); return null; }
      const bk = !ctr && X[a].bk, sw = !ctr && X[a].sw; if (bk) X[a].bk = 0; if (sw) X[a].sw = 0; // Byakugō (×1,8) y Espada del Verdugo (50 %+): solo el siguiente golpe
      const crit = rng() < .06 + clamp(S(a, 'TEC'), 0, 1000) / 1000 * .1 + (has(a, 'asura') ? TR.ASC : 0);
      const bf = !sp && has(a, 'bflash') && rng() < TR.BF + TR.BFU * (X[a].bf || 0); // Destello Negro
      if (bf) { X[a].bf = (X[a].bf || 0) + 1; en[a] = Math.min(1, en[a] + .25); }
      const pw = P != null ? P : sp ? S(a, 'ENE') : S(a, 'STR');
      let x = Math.min(1, AN.BASE * mul(pw - S(d, 'DUR')) * (1 - AN.VAR / 2 + AN.VAR * rng()) * (crit ? (has(a, 'asura') ? TR.ASX : 1.6) : 1) * (sp ? 1.55 : 1)
        * (ctr && !(tag && tag.ui) ? .6 : 1) * (bf ? TR.BFX : 1) * (sp && has(d, 'anti') ? TR.ANTI : 1) * (bk ? TR.BKX : 1) * mlt * boost(a, d));
      if (sw) x = Math.max(x, TR.JDX);
      const g = guard(d, x, a); if (g) { block(d, g, a); return null; }
      const v = hurt(d, x), ext = {};
      if (bk) ext.bk = 1; if (sw) ext.ex = 1;
      if (v > 0 && has(a, 'poison') && (X[d].ps || 0) < TR.PSN) ext.ps = X[d].ps = (X[d].ps || 0) + 1;                                   // Muzan: una dosis más de sangre
      if (v > 0 && X[a].kj && hp[a] > 0) { const h0 = hp[a]; hp[a] = Math.min(1, hp[a] + TR.KJH); ext.lf = +(hp[a] - h0).toFixed(4); }   // Kaneki se alimenta
      if (v > 0 && has(a, 'snatch') && (X[a].sn || 0) < TR.SNN) { ext.sn = X[a].sn = (X[a].sn || 0) + 1; bo[a] += TR.SN; bo[d] -= TR.SN; } // Ban roba fuerza
      const r = rec(Object.assign({ a, k: ctr ? 'ctr' : sp ? (crit ? 'spc' : 'sp') : crit ? 'crit' : 'hit', crit, dmg: +v.toFixed(4), v: rndi(rng, 0, 5) }, bf ? { bf: 1 } : null, crit && has(a, 'asura') ? { as: 1 } : null, ext, tag));
      took(d, v); awaken(d);
      if (hp[d] > 0 && hp[a] > 0) {
        if (has(a, 'bungee') && !X[a].bg && v > 0) { X[a].bg = 1; rec({ a, k: 'tr', tr: 'bungee' }); } // Hisoka: el rival queda pegado
        if (has(a, 'amaterasu') && !used[a].am) { used[a].am = 1; X[d].burn = TR.BURNN; rec({ a, k: 'tr', tr: 'amaterasu' }); }
        if (sp && has(a, 'quake') && rng() < TR.QK) { stun[d] = Math.max(stun[d], 1); rec({ a, k: 'tr', tr: 'quake' }); }
        if (sp && has(d, 'copy') && (X[d].cp || 0) < TR.CPN && !(tag && tag.cp != null)) { // Garou copia la técnica y la devuelve
          X[d].cp = (X[d].cp || 0) + 1; rec({ a: d, k: 'tr', tr: 'copy', m: r.v, by: a });
          strike(d, 'sp', { cp: r.v }, 1.15, Math.max(S(d, 'STR'), S(d, 'ENE')));
        }
      }
      return r;
    };
    const clone = a => { if (X[a].cl > 0 && hp[0] > 0 && hp[1] > 0) { X[a].cl--; strike(a, 'hit', { cl: 1 }, TR.CLX); } }; // Naruto: el clon también golpea
    const turn = a => {
      const d = 1 - a;
      // daño al empezar su turno (aunque esté atrapado): llamas negras y cortes del Santuario
      if (X[a].burn > 0) { X[a].burn--; chip(d, a, TR.BURN, 'burn', null, 1); if (hp[a] <= 0) return; }
      if (dom[d] > 0 && has(d, 'shrine')) { chip(d, a, TR.SLASH, 'slash', null, 1); if (hp[a] <= 0) return; }
      if (X[a].ps > 0) { chip(d, a, TR.PS * X[a].ps, 'venom', { lv: X[a].ps }, 1); if (hp[a] <= 0) return; }
      if (stun[a] > 0) { stun[a]--; rec({ a, k: 'tr', tr: 'stun' }); return; }
      acts[a]++;
      en[a] = Math.min(1, en[a] + AN.REGEN);
      if (X[a].emp) hp[a] = Math.max(.01, hp[a] - TR.EMH); // Emperor Time: cada turno le cuesta vida
      if (X[a].gon > 0 && --X[a].gon === 0) { bo[a] -= TR.GONB + TR.GONP; rec({ a, k: 'tr', tr: 'spent' }); } // Gon adulto: se consume
      // rasgos que se activan al empezar su turno
      if (has(a, 'regen') && hp[a] < TR.RGHP && (X[a].rg || 0) < TR.RGN) { X[a].rg = (X[a].rg || 0) + 1; hp[a] = Math.min(1, hp[a] + TR.RG); rec({ a, k: 'tr', tr: 'regen', heal: TR.RG }); }
      if (has(a, 'rage') && hp[a] < TR.RAGEHP && !used[a].rage) { used[a].rage = 1; rec({ a, k: 'tr', tr: 'rage' }); }
      if (has(a, 'jackpot') && !used[a].jp && rng() < TR.JP) { used[a].jp = 1; const h0 = hp[a]; hp[a] = 1; X[a].jp = TR.JPN; rec({ a, k: 'tr', tr: 'jackpot', heal: +(1 - h0).toFixed(4) }); }
      if (has(a, 'clones') && !used[a].cl) { used[a].cl = 1; X[a].cl = TR.CLN; rec({ a, k: 'tr', tr: 'clones' }); }
      if (has(a, 'kakuja') && !X[a].kj && hp[a] < TR.KJHP) { X[a].kj = 1; rec({ a, k: 'tr', tr: 'kakuja' }); }
      if (has(a, 'judge') && !used[a].jd) { // Sentencia mortal: confisca la habilidad del rival y, si es culpable, la Espada del Verdugo
        used[a].jd = 1; const s = tr[d];
        if (s) { tr[d] = ''; if (s === 'inf') inf[d] = 0; if (s === 'kyoka') X[a].ill = 0; if (s === 'geass') X[a].gs = 0; if (s === 'domain' || s === 'shrine') dom[d] = 0; if (s === 'kakuja') X[d].kj = 0; }
        const guilty = rng() < TR.JDP; if (guilty) X[a].sw = 1;
        rec({ a, k: 'tr', tr: 'judge', s, g: guilty ? 1 : 0 }); return;
      }
      if (has(a, 'gen') && !used[a].gen) { used[a].gen = 1; stun[d] = TR.GEN; rec({ a, k: 'tr', tr: 'gen' }); return; }
      if (has(a, 'tsukuyomi') && !used[a].tk) {
        used[a].tk = 1; stun[d] = TR.GEN; en[d] = Math.max(0, en[d] - .3);
        const v = hurt(d, Math.max(0, Math.min(hp[d] - .02, .12))); rec({ a, k: 'tr', tr: 'tsukuyomi', dmg: +v.toFixed(4) }); return;
      }
      if (has(a, 'hakai') && !used[a].hk && hp[d] < TR.HAKAI) { used[a].hk = 1; rec({ a, k: 'tr', tr: 'hakai' }); if (ult(a, hp[d], { u: 'hakai' }) && hp[d] <= 0) X[d].gone = 1; return; }
      if (has(a, 'gates') && !used[a].gt && hp[a] < TR.GATEHP) { used[a].gt = 1; hp[a] = Math.max(.01, hp[a] * .4); rec({ a, k: 'tr', tr: 'gates' }); ult(a, Math.max(.6, fx(a, d, 3, 'STR')), { u: 'gates' }); return; }
      if (has(a, 'mugetsu') && !used[a].mg && hp[a] < TR.MUGHP) { used[a].mg = 1; rec({ a, k: 'tr', tr: 'mugetsu' }); ult(a, Math.max(.65, fx(a, d, 3)), { u: 'mugetsu' }); en[a] = 0; bo[a] -= TR.MUGB; return; }
      if (has(a, 'rumbling') && !used[a].rb && hp[a] < TR.RBHP) { used[a].rb = 1; rec({ a, k: 'tr', tr: 'rumbling' }); for (let j = 0; j < TR.RBN && hp[d] > 0; j++) ult(a, Math.max(.08, fx(a, d, .6, 'STR')), { u: 'rumbling', j }); return; }
      if (has(a, 'gear5') && !used[a].g5 && hp[a] < TR.G5HP) { used[a].g5 = 1; X[a].g5 = 1; bo[a] += TR.G5B; const h0 = hp[a]; hp[a] = Math.min(1, hp[a] + TR.G5H); rec({ a, k: 'tr', tr: 'gear5', heal: +(hp[a] - h0).toFixed(4) }); return; }
      if (has(a, 'makanko') && !used[a].mk && acts[a] >= TR.MKT) { used[a].mk = 1; rec({ a, k: 'tr', tr: 'makanko' }); ult(a, Math.max(TR.MKX, fx(a, d, 1.6)), { u: 'makanko' }); return; }
      if (has(a, 'mokuton') && !used[a].mok && hp[a] < TR.MOKHP) { used[a].mok = 1; stun[d] = Math.max(stun[d], TR.MOKN); en[d] = 0; const h0 = hp[a]; hp[a] = Math.min(1, hp[a] + TR.MOKH); rec({ a, k: 'tr', tr: 'mokuton', heal: +(hp[a] - h0).toFixed(4) }); return; }
      if (has(a, 'byakugo') && !used[a].bk && hp[a] < TR.BKHP) { used[a].bk = 1; X[a].bk = 1; const h0 = hp[a]; hp[a] = Math.min(1, hp[a] + TR.BKH); rec({ a, k: 'tr', tr: 'byakugo', heal: +(hp[a] - h0).toFixed(4) }); return; }
      if (has(a, 'black') && !used[a].bl && hp[a] < TR.BLHP) { used[a].bl = 1; bo[a] += TR.BLB; rec({ a, k: 'tr', tr: 'black' }); return; }
      if (has(a, 'room') && !used[a].rm && hp[a] < TR.RMHP && hp[d] - hp[a] >= TR.RMD) { used[a].rm = 1; const t = hp[a]; hp[a] = hp[d]; hp[d] = t; rec({ a, k: 'tr', tr: 'room' }); return; }
      if (has(a, 'adult') && !used[a].gon && hp[a] < TR.GONHP) { used[a].gon = 1; X[a].gon = TR.GONN + 1; bo[a] += TR.GONB; rec({ a, k: 'tr', tr: 'adult' }); return; }
      if (has(a, 'serious') && !used[a].ser && taken[a] >= TR.SER) { used[a].ser = 1; rec({ a, k: 'tr', tr: 'serious' }); ult(a, Math.max(TR.SERX, fx(a, d, 2.5, 'STR'))); return; } // atraviesa el Infinito
      if (has(a, 'time') && !used[a].ts && (hp[a] < .75 || rng() < .25)) {
        used[a].ts = 1; rec({ a, k: 'tr', tr: 'time' });
        for (let j = 0; j < TR.TS && hp[d] > 0; j++) strike(a, 'hit', { ts: 1 });
        return;
      }
      if (has(a, 'zawarudo') && !used[a].ts && (hp[a] < .75 || rng() < .25)) {
        used[a].ts = 1; rec({ a, k: 'tr', tr: 'zawarudo' });
        for (let j = 0; j < TR.ZWN && hp[d] > 0; j++) strike(a, 'hit', { ts: 1 });
        if (hp[d] > 0) { rec({ a, k: 'tr', tr: 'roller' }); strike(a, 'hit', { ts: 1, rr: 1 }, 1.3); }
        return;
      }
      if ((has(a, 'domain') || has(a, 'shrine')) && !used[a].dom && en[a] >= TR.DOMC && (hp[a] < .8 || rng() < .25)) { used[a].dom = 1; en[a] -= TR.DOMC; dom[a] = TR.DOMN; rec({ a, k: 'tr', tr: tr[a] }); return; }
      if (X[a].ill > 0 && !has(a, 'ispear')) { X[a].ill--; rec({ a: d, k: 'tr', tr: 'mirage', by: a }); return; } // Kyōka Suigetsu: ataca a una ilusión
      if (X[a].gs > 0) { X[a].gs--; const v = hurt(a, Math.min(.2, AN.BASE * (.6 + .4 * rng()))); rec({ a, k: 'tr', tr: 'self', dmg: +v.toFixed(4) }); awaken(a); return; } // Geass: se golpea a sí mismo
      const hr = has(a, 'hiraishin') && acts[a] <= TR.HRN, sure = dom[a] > 0 || hr || X[a].bg; // dominio, Dios del Trueno Volador o Bungee Gum: no se esquiva
      const sealed = has(d, 'seal'), free = !sealed && X[a].hk > 0; // Hinokami Kagura: la danza encadena técnicas sin gastar ki · Father: sin técnicas
      const wantSp = !sealed && (free || en[a] >= AN.SPC && rng() < .2 + (S(a, 'ENE') >= S(a, 'STR') ? .14 : 0) + (hp[a] < .4 ? .12 : 0));
      if (wantSp) {
        if (free) X[a].hk--; else en[a] -= AN.SPC;
        if (has(d, 'kamui') && !used[d].km) { used[d].km = 1; rec({ a: d, k: 'tr', tr: 'kamui', by: a, m: rndi(rng, 0, 5) }); return; }
        if (has(d, 'counter') && !used[d].fc) { // Full Counter: le devuelve su propia técnica con el doble de fuerza
          used[d].fc = 1; const m = rndi(rng, 0, 5); rec({ a: d, k: 'tr', tr: 'counter', by: a, m });
          const x = Math.min(TR.FC, 2 * AN.BASE * mul(S(a, 'ENE') - S(d, 'DUR')) * 1.55 * (.7 + .6 * rng())), g = guard(a, x, d);
          if (g) { block(a, g, d); return; }
          const v = hurt(a, x); rec({ a: d, k: 'spc', crit: true, dmg: +v.toFixed(4), v: 0, fc: m }); took(a, v); awaken(a); return;
        }
        if (!has(a, 'seal') && en[d] >= AN.SPC && rng() < .3) { // CHOQUE DE TÉCNICAS (si Father suprime la alquimia, el rival no puede responder)
          en[d] -= AN.SPC;
          const q = clamp(1 / (1 + Math.pow(10, -ex(S(a, 'ENE') - S(d, 'ENE')) * AN.K1 / AN.KS)), .1, .9), w = rng() < q ? a : 1 - a, l = 1 - w;
          let x = .5; const fr = []; // punto de choque (0 = lado del jugador 0, 1 = lado del jugador 1); empuja hacia el perdedor
          for (let i = 0; i < 4; i++) { x = clamp(x + (rng() - .5) * .34 + (l === 1 ? .05 : -.05), .2, .8); fr.push(+x.toFixed(2)); }
          fr.push(l === 1 ? 1 : 0);
          const crit = rng() < .1, dx = Math.min(1, AN.BASE * mul(S(w, 'ENE') - S(l, 'DUR')) * (.8 + .4 * rng()) * 1.7 * (crit ? 1.4 : 1) * (has(l, 'anti') ? TR.ANTI : 1) * boost(w, l));
          const g = guard(l, dx, w), v = g ? 0 : hurt(l, dx);
          rec({ a, k: 'clash', w, crit, fr, dmg: +v.toFixed(4), v: rndi(rng, 0, 5), vw: rndi(rng, 0, 5) });
          if (g) block(l, g, w); else { took(l, v); awaken(l); }
          return;
        }
      }
      const acc = sure ? 1 : clamp(.8 + (skill(a) - skill(d)) / AN.KA + (wantSp ? .05 : 0) + (X[a].g5 ? TR.G5A : 0) - (has(d, 'ui') ? TR.UI : has(d, 'ultra') ? TR.ULTRA : 0), .35, .95);
      if (rng() > acc) {
        rec({ a, k: 'miss', crit: false, sp: wantSp, v: rndi(rng, 0, 5) });
        if (has(d, 'ultra')) strike(d, 'ctr', { ui: 1 }); // Ultra Instinto: cada esquiva es un contraataque a plena potencia
        else if (rng() < .22 + Math.max(0, S(d, 'TEC') - S(a, 'TEC')) / 1500) strike(d, 'ctr');
        clone(a); return;
      }
      strike(a, wantSp ? 'sp' : 'hit', hr ? { hr: 1 } : null);
      if (wantSp && has(a, 'hinokami') && !used[a].hn && hp[0] > 0 && hp[1] > 0) { used[a].hn = 1; X[a].hk = TR.HKN; rec({ a, k: 'tr', tr: 'hinokami' }); }
      clone(a);
    };
    const act = a => { const inDom = dom[a] > 0; turn(a); if (inDom) dom[a] = Math.max(0, dom[a] - 1); };
    const end = () => {
      for (const i of [0, 1]) if (hp[i] <= 0 && has(i, 'rose') && !X[i].gone && hp[1 - i] > 0) { // Rosa del Pobre: cuando Netero cae, la bomba explota
        const g = guard(1 - i, TR.ROSE, i);
        if (g) { rec({ a: i, k: 'tr', tr: 'rose', dmg: 0 }); block(1 - i, g, i); }
        else { const v = hurt(1 - i, TR.ROSE); rec({ a: i, k: 'tr', tr: 'rose', dmg: +v.toFixed(4) }); }
      }
      for (const i of [0, 1]) if (hp[i] <= 0 && has(i, 'terpsi') && !X[i].gone && hp[1 - i] > 0) { // Terpsícore: el cuerpo de Pitou sigue luchando
        rec({ a: i, k: 'tr', tr: 'terpsi' });
        for (let j = 0; j < TR.TPN && hp[1 - i] > 0; j++) chip(i, 1 - i, clamp(fx(i, 1 - i, 1, 'STR'), .05, .35), 'puppet', { j });
      }
      return { w: hp[0] > 0 ? 0 : hp[1] > 0 ? 1 : -1, hp, hits, en, aw, dmg, sac: X.map(x => !!x.sac) }; // w = -1: caen los dos
    };
    const KO = () => hp[0] <= 0 || hp[1] <= 0;
    // DEATH NOTE: antes que nada (ni God llega a tiempo, y no se puede robar ni anular). Light escribe el nombre, el rival lo mata
    // de un golpe porque es un simple humano y 40 segundos después al rival se le para el corazón. Siempre caen los dos.
    const dw = tr.indexOf('dnote');
    if (dw >= 0 && tr[1 - dw] !== 'dnote') {
      const v = 1 - dw;
      rec({ a: dw, k: 'tr', tr: 'dnote' });
      const x = hurt(dw, hp[dw]); rec({ a: v, k: 'crit', crit: true, dmg: +x.toFixed(4), v: rndi(rng, 0, 5) });
      const y = hurt(v, hp[v]); rec({ a: dw, k: 'tr', tr: 'heart', dmg: +y.toFixed(4) });
      return end();
    }
    // GOD: actúa primero y borra al rival de un solo toque (si los dos lo fueran, combate normal)
    const gd = tr.map(t => t === 'touch');
    if (gd[0] !== gd[1]) {
      const a = gd[0] ? 0 : 1; X[1 - a].gone = 1;
      rec({ a, k: 'tr', tr: 'touch' });
      const v = hurt(1 - a, hp[1 - a]);
      rec({ a, k: 'spc', crit: true, dmg: +v.toFixed(4), v: 0 });
      return end();
    }
    // al empezar el duelo, por este orden: anti-magia → Cadena del Juicio → Skill Hunter → Haki / Borrar → el resto
    for (const i of [0, 1]) { const o = 1 - i; if (has(i, 'anti') && tr[o]) { rec({ a: i, k: 'tr', tr: 'anti', s: tr[o] }); tr[o] = ''; } }
    for (const i of [0, 1]) {
      const o = 1 - i; if (!has(i, 'chain') || KO()) continue;
      if (TROUPE.includes(F[o].n)) { const v = hurt(o, hp[o]); rec({ a: i, k: 'tr', tr: 'chain', ko: 1, dmg: +v.toFixed(4) }); }
      else { bo[i] += TR.EMB; X[i].emp = 1; rec({ a: i, k: 'tr', tr: 'chain' }); }
    }
    if (KO()) return end();
    for (const i of [0, 1]) { const o = 1 - i; if (has(i, 'steal') && tr[o] && tr[o] !== 'touch') { rec({ a: i, k: 'tr', tr: 'steal', s: tr[o] }); tr[i] = tr[o]; tr[o] = ''; } }
    for (const i of [0, 1]) inf[i] = has(i, 'inf') ? TR.INF : 0;
    for (const i of [0, 1]) {
      const o = 1 - i; if (KO()) break;
      if (has(i, 'haki')) {
        if (pwOf(i) - pwOf(o) >= TR.HAKI) { const v = hurt(o, hp[o]); rec({ a: i, k: 'tr', tr: 'haki', ko: 1, dmg: +v.toFixed(4) }); }
        else { stun[o] = Math.max(stun[o], 1); rec({ a: i, k: 'tr', tr: 'haki' }); }
      }
      if (has(i, 'erase')) {
        if (rng() < TR.ERASE) { X[o].gone = 1; const v = hurt(o, hp[o]); rec({ a: i, k: 'tr', tr: 'erase', dmg: +v.toFixed(4) }); }
        else rec({ a: i, k: 'tr', tr: 'erase', no: 1 });
      }
    }
    if (KO()) return end();
    for (const i of [0, 1]) { // el resto de rasgos que se activan al empezar el duelo
      const o = 1 - i; if (KO()) break;
      if (has(i, 'toll')) { en[o] = Math.max(0, en[o] - TR.TOLLE); const v = hurt(o, Math.max(0, Math.min(hp[o] - .02, TR.TOLLH))); rec({ a: i, k: 'tr', tr: 'toll', dmg: +v.toFixed(4) }); }
      if (has(i, 'sun')) rec({ a: i, k: 'tr', tr: 'sun' });
      if (has(i, 'heaven')) rec({ a: i, k: 'tr', tr: 'heaven' });
      if (has(i, 'seal')) rec({ a: i, k: 'tr', tr: 'seal' });
      if (has(i, 'hiraishin')) rec({ a: i, k: 'tr', tr: 'hiraishin' });
      if (has(i, 'ispear') && GUARDS.includes(tr[o])) rec({ a: i, k: 'tr', tr: 'ispear', s: tr[o] });
      if (has(i, 'kyoka')) { X[o].ill = TR.KYO; rec({ a: i, k: 'tr', tr: 'kyoka' }); }
      if (has(i, 'geass')) { X[o].gs = TR.GS; rec({ a: i, k: 'tr', tr: 'geass' }); }
      if (has(i, 'ackerman') && pwOf(o) - pwOf(i) >= 40) rec({ a: i, k: 'tr', tr: 'ackerman' });
      if (has(i, 'meteor')) {
        rec({ a: i, k: 'tr', tr: 'meteor' });
        for (let j = 0; j < TR.MET && hp[o] > 0; j++) {
          if (rng() < clamp(.15 + (S(o, 'SPD') - S(i, 'SPD')) / 1000, .05, .5)) rec({ a: i, k: 'tr', tr: 'rock', miss: 1, j });
          else chip(i, o, clamp(fx(i, o, .8), .07, .4), 'rock', { j });
        }
      }
      if (has(i, 'arise')) {
        const n = Math.min(TR.SHADN, TR.SHAD + (F[i].ko || 0)); rec({ a: i, k: 'tr', tr: 'arise', n });
        for (let j = 0; j < n && hp[o] > 0; j++) chip(i, o, clamp(fx(i, o, .3), .03, .12), 'shadow', { j });
      }
    }
    if (KO()) return end();
    let first = has(0, 'hiraishin') ? 0 : has(1, 'hiraishin') ? 1 : -1; // Dios del Trueno Volador: Minato siempre se mueve el primero
    while (hp[0] > 0 && hp[1] > 0 && hits.length < AN.CAP) { act(first >= 0 ? first : rng() < pA() ? 0 : 1); first = -1; }
    if (hp[0] > 0 && hp[1] > 0) { // tope de golpes: el que va peor cae con un último golpe
      const l = hp[0] < hp[1] ? 0 : hp[1] < hp[0] ? 1 : +(rng() < .5), v = hurt(l, hp[l]);
      rec({ a: 1 - l, k: 'crit', crit: true, dmg: +v.toFixed(4), v: rndi(rng, 0, 5) });
    }
    return end();
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
    const rng = g.rng, T = g.P.map(p => p.c.map(c => { const st = stats(c); return { n: c.n, pw: c.pw, tr: c.tr || '', st, hm: hpMax(st), f: 1, e: 1, aw: false, dead: false, ko: 0, dmg: 0 }; })), i = [0, 0];
    const alive = p => i[p] < T[p].length, ev = [{ t: 'start', teams: T.map(t => t.map(c => c.n)) }];
    const adv = p => { do i[p]++; while (i[p] < T[p].length && T[p][i[p]].dead); }; // el siguiente que siga vivo (el Eclipse puede llevarse a uno)
    const mate = p => { for (let j = i[p] + 1; j < T[p].length; j++) if (!T[p][j].dead) return j; return -1; };
    const send = p => { const c = T[p][i[p]]; ev.push({ t: 'send', p, k: i[p], n: c.n, f: +c.f.toFixed(4), e: +c.e.toFixed(3), aw: c.aw, st: c.st, hm: c.hm }); };
    if (alive(0)) send(0);
    if (alive(1)) send(1);
    let k = 0;
    while (alive(0) && alive(1)) {
      const A = T[0][i[0]], B = T[1][i[1]];
      [A, B].forEach((c, p) => { const j = mate(p); c.mate = j < 0 ? '' : T[p][j].n; });
      const sim = duel(rng, A, B);
      ev.push({ t: 'duel', k: k++, a: A.n, b: B.n, hits: sim.hits });
      A.dmg += sim.dmg[0]; B.dmg += sim.dmg[1]; A.aw = sim.aw[0]; B.aw = sim.aw[1];
      [0, 1].forEach(p => { const j = sim.sac[p] ? mate(p) : -1; if (j >= 0) { const s = T[p][j]; s.dead = true; s.f = 0; ev.push({ t: 'sac', p, k: j, n: s.n }); } }); // Eclipse
      if (sim.w < 0) { // doble K.O.: caen los dos a la vez (Death Note, Rosa del Pobre…)
        [A, B].forEach((c, p) => { c.f = 0; c.dead = true; c.ko++; ev.push({ t: 'down', p, k: i[p], n: c.n }); });
        ev.push({ t: 'dko', a: A.n, b: B.n });
        adv(0); adv(1);
        if (alive(0)) send(0);
        if (alive(1)) send(1);
        continue;
      }
      const wp = sim.w, lp = 1 - wp, W = T[wp][i[wp]], L = T[lp][i[lp]];
      const rem = Math.max(.03, sim.hp[wp]);
      W.f = rem; W.e = Math.min(1, sim.en[wp] + .3); W.ko++; L.f = 0; L.dead = true;
      ev.push({ t: 'down', p: lp, k: i[lp], n: L.n }, { t: 'stands', p: wp, n: W.n, pct: Math.round(rem * 100), hp: Math.ceil(rem * W.hm), hm: W.hm, e: +W.e.toFixed(3) });
      adv(lp); if (alive(lp)) send(lp);
    }
    const w = alive(0) ? 0 : alive(1) ? 1 : -1;
    const all = T.flatMap((t, p) => t.map(c => ({ p, n: c.n, ko: c.ko, dmg: c.dmg })));
    const mvp = all.length ? all.sort((x, y) => y.ko - x.ko || y.dmg - x.dmg)[0] : null;
    ev.push({ t: 'end', w, sv: w < 0 ? [] : T[w].filter(c => !c.dead).map(c => ({ n: c.n, f: c.f, hm: c.hm })), mvp: mvp && { p: mvp.p, n: mvp.n, ko: mvp.ko, dmg: +mvp.dmg.toFixed(3) } });
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

  return { VERSION, CFG, MAXC, SECS, AN, TR, TROUPE, GUARDS, ROTO_PW, ROTO_P, LIGHT_P, order, FT, FUT_DIVS, futXI, resolveFutbol, resolve, create, can, out, gives, next, tick, place, skip, close, duel, stats, hpMax, decide, resolveAnime, resolveUfc, mulberry32 };
});