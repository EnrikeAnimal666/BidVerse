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
// ---- temporizador: nadie puja -> descartes -> reparto ----
{const g=E.create({cat:'anime',pool:POOLS.anime,rng:E.mulberry32(2)});E.next(g);
 let last;for(let i=0;i<E.SECS;i++)last=E.tick(g);
 ok(last.ev.some(e=>e.t==='deal')&&!last.ev.some(e=>e.t==='sold'),'sin pujas al agotar el tiempo: reparto al azar');
 ok(g.P[0].c.length===3&&g.P[1].c.length===3&&g.idx>=g.deck.length,'reparto completa 3+3');
 ok(E.next(g).ev[0].t==='finish','y se acaba');}
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
 const st=(a,b,N=5000)=>{let one=0,weak=0,h=0;for(let i=0;i<N;i++){const r=E.duel(rng,{pw:P(a),f:1},{pw:P(b),f:1});h+=r.hits.length;if(r.hits.length===1)one++;if(r.w!==(P(a)>=P(b)?0:1))weak++}return{one:one/N,weak:weak/N,h:h/N}};
 const gm=st('Goku','Madara');ok(gm.one<.1&&gm.weak<.02&&gm.h>3,'Goku no revienta a Madara de un golpe');
 const gr=st('Goku','Reigen');ok(gr.one>.9,'Goku sí revienta a Reigen');
 const ns=st('Naruto','Sasuke');ok(ns.weak>.4&&ns.weak<.6,'Naruto-Sasuke igualados');}
console.log('OK',n,'comprobaciones');
