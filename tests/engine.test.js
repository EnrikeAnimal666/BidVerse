// Pruebas del motor: node tests/engine.test.js
const fs=require('fs'),assert=require('assert');
const load=f=>{const s=fs.readFileSync(__dirname+'/../'+f,'utf8').replace(/^const /gm,'var ');return s};
const ctx={};new Function('ctx',load('data-anime.js')+load('data-ufc.js')+';ctx.POOLS=POOLS;ctx.UFC=UFC;ctx.UFC_DIVS=UFC_DIVS;ctx.R=R')(ctx);
const E=require('../engine.js');const {POOLS,UFC,UFC_DIVS}=ctx;
let n=0;const ok=(c,m)=>{assert(c,m);n++};

// ---- reglas sueltas ----
{const g=E.create({cat:'anime',pool:POOLS.anime,rng:E.mulberry32(1)});
 ok(g.P[0].m===20&&g.P[1].m===20,'20$ anime');
 let r=E.next(g);ok(r.ev[0].t==='lot'&&g.phase==='bidding'&&g.cur,'primer lote');
 ok(E.place(g,0,'abc').ev[0].code==='errValid','puja inválida');
 ok(E.place(g,0,0).ev[0].code==='errValid','puja 0');
 ok(E.place(g,0,-5).ev[0].code==='errValid','puja negativa');
 ok(E.place(g,0,21).ev[0].code==='errMoney','más dinero del que tiene');
 ok(E.place(g,0,Infinity).ev[0].code==='errMoney','infinito');
 ok(E.place(g,2,5).ev.length===0&&E.place(g,-1,5).ev.length===0&&E.place(g,'0',5).ev.length===0,'jugador inexistente');
 r=E.place(g,0,5.9);ok(g.bid===5&&g.leader===0&&r.ev[0].t==='bid','puja 5.9 -> 5');
 ok(E.place(g,1,5).ev[0].code==='errOver','igualar no vale');
 ok(E.place(g,1,6).ev[0].t==='bid'&&g.leader===1,'subir');
 r=E.skip(g,1);ok(r.ev.length===0,'el líder no puede saltar');
 r=E.skip(g,0);ok(r.ev[0].t==='sold'&&r.ev[0].p===1&&r.ev[0].price===6&&g.P[1].m===14,'conceder: vende al líder');
 ok(r.wait&&r.wait.act==='next','espera para siguiente');
 ok(E.place(g,0,3).ev.length===0&&E.tick(g).ev.length===0&&E.close(g,false).ev.length===0,'nada vale tras cerrar (sin doble venta)');
 ok(E.next(g).ev[0].t==='lot','siguiente lote');
 ok(E.next(g).ev.length===0,'next doble ignorado');
}
// ---- temporizador: nadie puja ni pasa -> solo ese lote va a uno al azar, gratis, y la subasta sigue ----
{const g=E.create({cat:'anime',pool:POOLS.anime,rng:E.mulberry32(2)});E.next(g);
 let last;for(let i=0;i<E.SECS;i++)last=E.tick(g);
 const s=last.ev.find(e=>e.t==='sold');ok(s&&s.rand&&s.price===0,'sin pujas al agotar el tiempo: al azar');
 ok(g.P[0].c.length+g.P[1].c.length===1&&g.P[0].m===20&&g.P[1].m===20,'solo ese lote y gratis');
 ok(E.next(g).ev[0].t==='lot','la subasta sigue');}
// ---- saltar: si uno pasa, el otro se lo lleva gratis (pulsando o sin hacer nada) ----
{const g=E.create({cat:'anime',pool:POOLS.anime,rng:E.mulberry32(6)});E.next(g);
 let r=E.skip(g,0);ok(r.ev[0].t==='pass'&&g.free===1&&g.fp,'pasa el 0: el 1 lo tiene gratis');
 ok(E.place(g,0,3).ev.length===0,'quien ha pasado ya no puja');
 let last;for(let i=0;i<E.SECS;i++)last=E.tick(g);
 const s=last.ev.find(e=>e.t==='sold');ok(s&&s.p===1&&s.price===0&&!s.rand,'sin hacer nada: se lo lleva quien NO ha pasado (no al azar)');
 ok(g.P[1].m===20&&g.skips[0]===2&&g.skips[1]===2,'gratis y sin gastar saltos');
 E.next(g);E.skip(g,1);r=E.place(g,0,'');ok(r.ev[0].t==='sold'&&r.ev[0].p===0&&r.ev[0].price===0&&g.P[0].m===20,'pulsando: se lo queda gratis (no hace falta pujar $1)');}
{const g=E.create({cat:'anime',pool:POOLS.anime,rng:E.mulberry32(7)});E.next(g);g.skips=[2,0];
 const r=E.skip(g,0);ok(r.ev.some(e=>e.t==='forced')&&r.wait.act==='close','al rival no le quedan saltos: es suyo');
 const c=E.close(g,false);ok(c.ev[0].t==='sold'&&c.ev[0].p===1&&c.ev[0].price===0,'se lo lleva gratis');}
// ---- sin dinero: regalar el lote al rival no gasta saltos ----
{const g=E.create({cat:'anime',pool:POOLS.anime,rng:E.mulberry32(8)});g.P[1].m=0;g.skips=[0,2];
 let r=E.next(g);ok(g.free===0&&!g.fp&&g.phase==='bidding'&&E.gives(g,0),'sin saltos pero puede regalarlo: no está obligado');
 r=E.skip(g,0);ok(r.ev[0].t==='sold'&&r.ev[0].p===1&&r.ev[0].gift&&g.skips[0]===0,'regalo al rival sin dinero, sin gastar saltos');
 g.skips=[1,2];E.next(g);r=E.skip(g,0);ok(r.ev[0].gift&&g.skips[0]===1,'con saltos tampoco gasta');}
{const g=E.create({cat:'anime',pool:POOLS.anime,rng:E.mulberry32(9)});g.P[1].m=0;g.P[1].c=g.deck.splice(-3);
 E.next(g);ok(g.free===0&&!E.gives(g,0),'el rival no tiene hueco: no se le puede regalar');
 const r=E.skip(g,0);ok(r.ev[0].t==='discard'&&g.skips[0]===1,'descartar sí gasta un salto');}
// ---- vida en puntos ----
{const hp=n=>E.hpMax(E.stats(POOLS.anime.find(c=>c.n===n)));
 ok(hp('Goku')>hp('Naruto')&&hp('Naruto')>hp('Reigen')&&hp('Reigen')>=100,'cada personaje tiene su vida');}
// ---- skips: ambos pasan, se descarta, se gastan descartes ----
{const g=E.create({cat:'anime',pool:POOLS.anime,rng:E.mulberry32(3)});E.next(g);
 E.skip(g,0);let r=E.skip(g,1);ok(r.ev[0].t==='noBids'&&g.skips[0]===1&&g.skips[1]===1,'ambos pasan: -1 descarte a cada uno');}
// ---- UFC: un peleador por categoría ----
{const g=E.create({cat:'ufc',pool:UFC,divs:UFC_DIVS,rng:E.mulberry32(4)});E.next(g);
 const d=g.dv;E.place(g,0,3);E.skip(g,1);ok(g.P[0].c.length===1&&g.P[0].c[0].cls===d,'compra');
 E.next(g);ok(g.cur.cls===d,'sigue en la misma categoría');ok(E.can(g,0)===false,'jugador 0 ya cubrió la categoría');}

// ---- propiedad: 400 partidas completas con bots al azar ----
function bot(cat,seed){
  const rng=E.mulberry32(seed),g=E.create({cat,pool:cat==='ufc'?UFC:POOLS.anime,divs:UFC_DIVS,rng:E.mulberry32(seed*7+1)});
  const log=[];let steps=0;const evs=[];
  const sched=r=>{evs.push(...r.ev);return r.wait};
  let w=sched(E.next(g));
  while(g.phase!=='fight'&&steps++<20000){
    if(w){w=sched(w.act==='close'?E.close(g,false):E.next(g));continue}
    // invariantes en cada paso
    for(const p of[0,1]){ok(Number.isInteger(g.P[p].m)&&g.P[p].m>=0,'dinero entero y >=0');
      ok(cat==='ufc'?new Set(g.P[p].c.map(c=>c.cls)).size===g.P[p].c.length:g.P[p].c.length<=3,'huecos')}
    const a=rng();let r;
    if(a<.45)r=E.place(g,rng()<.5?0:1,Math.floor(rng()*25)-2);
    else if(a<.65)r=E.skip(g,rng()<.5?0:1);
    else if(a<.9)r=E.tick(g);
    else r=E.place(g,rng()<.5?0:1,(g.bid||0)+1);
    w=sched(r);
  }
  ok(g.phase==='fight','la partida termina (semilla '+seed+')');
  const names=[...g.P[0].c,...g.P[1].c].map(c=>c.n);ok(new Set(names).size===names.length,'ninguna carta repetida');
  if(cat==='anime'){ok(g.P[0].c.length>=1||g.P[1].c.length>=1,'alguien tiene equipo');
    const f=E.resolveAnime(g),ev=f.ev;ok(ev[0].t==='start'&&ev[ev.length-1].t==='end','guion completo');
    let sends=0,downs=0;for(const e of ev){if(e.t==='send')sends++;if(e.t==='down')downs++;
      if(e.t==='duel'){ok(e.hits.length>=1&&e.hits.length<=30,'golpes');let pv=[1,1];
        for(const h of e.hits){ok(h.hp[0]>=0&&h.hp[1]>=0&&h.hp[0]<=1&&h.hp[1]<=1,'hp en rango')}}
      ok(!('pw' in e),'el guion no lleva poder')}
    ok(ev.filter(e=>e.t==='send').every(e=>e.hm>0),'cada luchador sale con su vida máxima');
    ok(sends===downs+2||sends===downs+1||sends===downs,'cada caído tiene su envío');
    const end=ev[ev.length-1];ok(end.w===-1||end.sv.length>=1,'ganador con supervivientes');
  }else{const f=E.resolveUfc(g);ok(f.bouts.length<=8,'<=8 combates');
    f.bouts.forEach(b=>{ok(b.hpEnd[b.w]>0&&b.rounds.length===b.rd,'combate coherente');if(b.big)ok(b.rd===1,'finalización rápida = 1 asalto')});
    ok([f.result.w].every(x=>x>=-1&&x<=1),'resultado')}
  return g;
}
for(let s=1;s<=200;s++){bot('anime',s);bot('ufc',s)}

// ---- rng criptográfico y determinismo ----
{const a=bot('anime',99),b=bot('anime',99);ok(JSON.stringify(a.P)===JSON.stringify(b.P),'misma semilla = misma partida')}
// ---- duelo: números de referencia ----
{const rng=E.mulberry32(5),P=n=>ctx.R.find(r=>r[0]===n)[2];
 const st=(a,b,N=5000)=>{let one=0,weak=0,h=0;for(let i=0;i<N;i++){const r=E.duel(rng,{n:a,pw:P(a),f:1},{n:b,pw:P(b),f:1});h+=r.hits.length;if(r.hits.length===1)one++;if(r.w!==(P(a)>=P(b)?0:1))weak++}return{one:one/N,weak:weak/N,h:h/N}};
 const gm=st('Goku','Madara');ok(gm.one<.1&&gm.weak>.1&&gm.weak<.3&&gm.h>3,'Goku no revienta a Madara de un golpe (+195: gana ~80 %)');
 const gr=st('Goku','Reigen');ok(gr.one>.6&&gr.weak<.01,'Goku sí revienta a Reigen');
 const ns=st('Naruto','Sasuke');ok(ns.weak>.4&&ns.weak<.6,'Naruto-Sasuke igualados');}
console.log('OK',n,'comprobaciones');
