// BidVerse · lógica del juego. Datos: data-anime.js (POOLS.anime) y data-ufc.js (UFC) · idiomas: lang/*.js (LANGS)
POOLS.ufc=UFC;if(typeof FUT!=='undefined')POOLS.futbol=FUT;const FUTP=POOLS.futbol||[],FDIVS=typeof FUT_DIVS!=='undefined'?FUT_DIVS:[];
const {MAXC,SECS}=BidEngine; // las reglas viven en engine.js; aquí solo se pinta
let lastBid=0,G,net=null,cur,bid,leader,left,tick=0,P,skips,locked,cat,passed,free=-1,bt=0,scTab='anime'; // net = datos de la partida online (null = partida local) // G = estado del motor; el resto es un espejo para pintar
const $=id=>document.getElementById(id),pad2=n=>String(n).padStart(2,'0');
const byN=new Map([...POOLS.anime,...UFC,...FUTP].map(c=>[c.n,c])),imgOf=n=>(byN.get(n)||{}).img;
/* ---------- IDIOMAS: u() = plantilla {0},{1}… de lang/xx.js · X = mensajes compuestos · t() = ambos ---------- */
let lang='en'; // idioma oficial: inglés. El traductor del navegador se encarga del resto (no hay botón de idioma).
const EXT={ // textos que no están en lang/*.js (fútbol); FUTX solo se usa durante una partida de fútbol (dinero en millones)
 es:{cat3:'Fútbol',cat3d:'Ficha un once de leyendas y cracks actuales. 4-3-3 y 100 millones para gastar.',nPlayers:'{0} futbolistas',tabFut:'Fútbol',olCreateFutbol:'Crear sala · Fútbol',
  div_GK:'Porteros',div_DEF:'Defensas',div_MID:'Centrocampistas',div_FWD:'Delanteros',legend:'Leyenda',
  scaleNoteFut:'Media de 40 a 99 como en los videojuegos: las 50 leyendas, en su mejor temporada; el resto, su nivel en la temporada 2026-27. Las fotos salen de Wikipedia.'},
 en:{cat3:'Football',cat3d:'Sign an XI of legends and current stars. 4-3-3 and 100 million to spend.',nPlayers:'{0} players',tabFut:'Football',olCreateFutbol:'Create room · Football',
  div_GK:'Goalkeepers',div_DEF:'Defenders',div_MID:'Midfielders',div_FWD:'Forwards',legend:'Legend',
  scaleNoteFut:'Rated 40-99 like the video games: the 50 legends at their best season, everyone else at their 2026-27 level. Photos come from Wikipedia.'}};
const FUTX={es:{paid:'{0}M',forPrice:'{0}M',errMoney:'Solo te quedan {0}M.',errOver:'Tienes que pujar más de {0}M.',bidPh:'Millones'},
 en:{paid:'{0}M',forPrice:'{0}M',errMoney:'You only have {0}M left.',errOver:'You must bid more than {0}M.',bidPh:'Millions'}};
const u=(k,...a)=>k==='player'&&net&&net.names&&net.names[a[0]-1]?net.names[a[0]-1]:String((cat==='futbol'?(FUTX[lang]||FUTX.es)[k]:undefined)??LANGS[lang].ui[k]??(EXT[lang]||EXT.es)[k]??LANGS.en.ui[k]??EXT.en[k]??k).replace(/\{(\d+)\}/g,(m,i)=>a[i]??m);
const money=v=>cat==='futbol'?v+'M':'$'+v;
const X={
soldLine:(p,b)=>`${u('sold')}<br>${u('player',p)} · $${b}`,
stampSold:(p,nm,pr)=>`<small>${u('sold')}</small><strong>${u('player',p)}</strong><u>${u('takes','<b>'+nm+'</b>')}</u><em>${pr}</em>`,
discard:()=>`${u('lotDiscarded')}<br>${u('minusSkip')}`,noBidsStamp:()=>`${u('noBids')}<br>${u('minusSkipEach')}`,
brokeStamp:()=>`<small>${u('noMoney')}</small><strong>${u('randomDeal')}</strong><u>${u('brokeLine')}</u>`,
afkStamp:()=>`<small>${u('nobodyBids')}</small><strong>${u('randomDeal')}</strong><u>${u('afkLine')}</u>`,
infoFree:(p,nm,f)=>u(f?'infoFreeForced':'infoFree',p,nm),
hintFree:(o,f,n)=>n?u('hintFree',o,f,n):u('hintFreeForced',o,f),
sends:(p,nm)=>u('sends',p,`<b>${nm}</b>`),
giftInfo:(w,nm)=>lang==='es'?`${u('player',2-w)} pasa de ${nm}: se lo queda ${u('player',w+1)} gratis.`:`${u('player',2-w)} passes on ${nm}: ${u('player',w+1)} gets it for free.`,
infoSold:(p,nm,pr,m)=>cat==='futbol'?(lang==='es'?`${u('player',p)} ficha a ${nm} por ${pr}M. Le quedan ${m}M.`:`${u('player',p)} signs ${nm} for ${pr}M. ${m}M left.`):u('infoSold',p,nm,pr,m),
passGift:()=>lang==='es'?'Saltar · se lo queda el rival gratis':'Skip · your rival gets it free',
stampRand:(p,nm,broke)=>`<small>${u(broke?'noMoney':'nobodyBids')}</small><strong>${u('player',p)}</strong><u>${u('takes','<b>'+nm+'</b>')}</u><em>${lang==='es'?'Al azar':'Random'}</em>`,
randInfo:(p,nm,broke)=>lang==='es'?`${broke?'Nadie tiene dinero':'Nadie ha pujado'} por ${nm}: se lo lleva ${u('player',p)} al azar. La subasta sigue.`:`${broke?'Nobody has money':'Nobody bid'} for ${nm}: ${u('player',p)} gets it at random. The auction goes on.`};
const t=(k,...a)=>X[k]?X[k](...a):u(k,...a);
const dn=c=>LANGS[lang].names?.[c.n]||c.n,dnh=c=>`<span translate="no">${dn(c)}</span>`,an=a=>LANGS[lang].animes?.[a]||a,fe=c=>LANGS[lang].feats?.[c.n]||c.f;
/* ---------- SONIDO (generado con el navegador, sin archivos) ---------- */
const SND=(()=>{
  let ctx=null,on=true;try{on=localStorage.getItem('bvsnd')!=='0'}catch(e){}
  const unlock=()=>{if(!ctx){try{ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(ctx&&ctx.state==='suspended')ctx.resume()};
  ['pointerdown','keydown'].forEach(ev=>addEventListener(ev,unlock,{passive:true})); // los navegadores exigen un clic antes de dejar sonar
  const tone=(f,at,d,type,v)=>{if(!on||!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+at;
    o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+d+.02)};
  const sweep=(f1,f2,d,type,v)=>{if(!on||!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;
    o.type=type;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+d+.02)};
  return{
    get on(){return on},
    toggle(){on=!on;try{localStorage.setItem('bvsnd',on?'1':'0')}catch(e){}return on},
    bid(p,amt){const f=(p?392:330)*(1+Math.min(amt||0,40)/100);tone(f,0,.1,'square',.05);tone(f*1.5,.08,.14,'triangle',.06)},  // puja: dos notas, más agudas cuanto más alta
    sold(){[523,659,784,1047].forEach((f,i)=>tone(f,i*.09,.22,'triangle',.07))},                                              // vendido: arpegio
    tick(){tone(880,0,.06,'square',.035)},
    fx(k){if(!on||!ctx)return;switch(k){                                                                                     // combate de anime
      case 'hit':tone(140,0,.07,'square',.07);tone(90,.02,.1,'sawtooth',.05);break;
      case 'crit':tone(160,0,.08,'square',.08);tone(70,.02,.16,'sawtooth',.07);tone(1320,.03,.12,'triangle',.05);break;
      case 'whiff':sweep(900,300,.12,'triangle',.035);break;
      case 'charge':sweep(220,880,.55,'sawtooth',.03);break;
      case 'beam':sweep(600,180,.35,'sawtooth',.05);tone(90,0,.4,'square',.04);break;
      case 'hum':tone(110+Math.random()*30,0,.2,'sawtooth',.035);break;
      case 'boom':sweep(160,40,.45,'square',.09);tone(55,0,.5,'sawtooth',.06);break;
      case 'awake':[392,523,659,784,1047].forEach((f,i)=>tone(f,i*.07,.25,'square',.04));break;
      case 'ko':sweep(440,60,.7,'sawtooth',.07);break
      case 'time':sweep(1400,90,1,'sine',.07);tone(60,0,1,'sawtooth',.04);break
      case 'domain':[130,98,73].forEach((f,i)=>tone(f,i*.12,.7,'sawtooth',.045));sweep(300,1200,.8,'triangle',.03);break
      case 'sig':tone(110,0,.55,'sawtooth',.05);tone(165,0,.55,'sawtooth',.035);sweep(300,1400,.35,'triangle',.03);tone(880,.32,.35,'square',.03);break // habilidad única
      case 'write':for(let i=0;i<10;i++)tone(1700+Math.random()*900,i*.08,.04,'square',.012);break
      case 'heart':[0,.45].forEach(t=>tone(980,t,.12,'sine',.08));tone(980,.95,.9,'sine',.07);break
      case 'slot':for(let i=0;i<10;i++)tone(700+i*40,i*.08,.05,'square',.03);[784,988,1175,1568].forEach((f,i)=>tone(f,.85+i*.08,.25,'triangle',.06));break
      case 'quake':tone(45,0,.9,'sawtooth',.08);sweep(120,30,.8,'square',.05);break
      case 'slash':sweep(3000,600,.12,'sawtooth',.04);sweep(2400,500,.1,'sawtooth',.03);break
      case 'haki':tone(60,0,.7,'sawtooth',.08);for(let i=0;i<6;i++)tone(200+Math.random()*300,i*.06,.05,'square',.03);break
      case 'chain':[1200,1500,1100,1650].forEach((f,i)=>tone(f,i*.06,.08,'triangle',.04));break
      case 'nuke':sweep(200,30,1.2,'sawtooth',.1);tone(40,0,1.3,'square',.07);break
      case 'whistle':[0,.12,.24].forEach(t=>{tone(2900,t,.09,'square',.03);tone(3100,t+.045,.06,'square',.025)});tone(2950,.36,.45,'square',.03);break // fútbol
      case 'kick':tone(95,0,.06,'square',.06);break
      case 'save':tone(120,0,.09,'square',.07);tone(70,.02,.12,'sawtooth',.05);break
      case 'post':tone(1250,0,.35,'triangle',.07);tone(1870,0,.25,'triangle',.04);break
      case 'goal':[392,523,659,784,1047,1319].forEach((f,i)=>tone(f,i*.08,.3,'square',.04));sweep(200,900,1.2,'sawtooth',.025);break}}};
})();
function toggleSnd(){const b=$('snd');if(b)b.textContent=SND.toggle()?'🔊':'🔇'}
(function(){const b=$('snd');if(b)b.textContent=SND.on?'🔊':'🔇'})();
const tickSnd=()=>{if(left<=3&&left>0)SND.tick()};
function popBid(e,prev){ // efecto visual de la última puja: número que salta, destello del color de quien puja y "+$N" flotando
  const b=$('bid');b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');
  const L=$('lot');L.classList.remove('flash');void L.offsetWidth;L.classList.add('flash');
  const pr=document.querySelector('.pr'),d=e.amount-(prev||0);
  if(pr&&d>0){const f=document.createElement('span');f.className='fl';f.textContent='+'+money(d);pr.appendChild(f);setTimeout(()=>f.remove(),950)}
}
function lotText(){$('fr').textContent=cur.kind==='ufc'||cur.kind==='futbol'?u('div_'+cur.cls):an(cur.a);
  if(cur.kind==='futbol'){$('nm').innerHTML=dnh(cur)+`<small>${cur.e} ${roleT(cur.role)} · ${cur.club}${cur.leg?` ${cur.yr} · <em class="lg">${u('legend')}</em>`:''}</small>`;return}
  $('nm').innerHTML=dnh(cur)+(cur.kind==='anime'&&cur.tr?`<small class="trl">${UNQ.has(cur.tr)?'★':'✦'} <b>${trT(cur.tr,0)}</b> · ${trT(cur.tr,1)}</small>`:'')+(cur.kind==='ufc'?`<small>${cur.e} ${cur.nick?'“'+cur.nick+'” · ':''}${u('sty_'+cur.sty)}</small>`:'')}
function menuInfo(){if($('ch-foot'))$('ch-foot').textContent=u('nPlayers',FUTP.length)+' · 4-3-3';$('ch-anime').textContent=u('nChars',POOLS.anime.length);$('ch-ufc').textContent=u('nFighters',UFC.length)+' · '+u('nDivs',UFC_DIVS.length)}
function applyLang(){
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-i]').forEach(e=>e.textContent=t(e.dataset.i));
  document.querySelectorAll('[data-ph]').forEach(e=>e.placeholder=t(e.dataset.ph));
  document.querySelectorAll('.lang button').forEach(b=>b.classList.toggle('on',b.dataset.l===lang));
  $('mq').textContent=t('marquee').repeat(8);menuInfo();
}
function setLang(l){
  lang=l;try{localStorage.setItem('bvlang',l)}catch(e){}
  applyLang();
  if(P&&cur){document.querySelectorAll('.side h2').forEach((h,i)=>h.textContent=t('player',i+1));lotText();hint();render()}
  if($('scale').classList.contains('open'))openScale();
}
applyLang();
function panel(p){const n=p+1;return `<section class="side" style="--c:var(--p${n});--on:var(--on${n})">
<header><div class="pad">${n}</div><div><h2>${t('player',n)}</h2></div><div class="money" id="m${p}"></div></header>
<div id="s${p}"></div>
<div class="ctl"><label class="inp"><span>${cat==='futbol'?'€':'$'}</span><input id="i${p}" type="number" min="1" step="1" inputmode="numeric" placeholder="${t('bidPh')}" onkeydown="if(event.key==='Enter')place(${p})"></label>
<button class="go" id="g${p}" onclick="place(${p})">${t('bidBtn')}</button><button class="go plus" id="u${p}" onclick="plus(${p})" title="${cat==='futbol'?'+1M':'+$1'}">${cat==='futbol'?'+1M':'+$1'}</button></div>
<button class="skip" id="k${p}" onclick="skip(${p})"><span class="sl" id="kl${p}">${t('skipLbl')}</span><span class="pips" id="kp${p}"></span></button>
<div class="msg" id="e${p}"></div></section>`}
function start(c){
  closeLineup();gameBg(c);bt++;clearInterval(tick);tick=0;$('wipe').className='wipe';document.querySelector('.board').style.display='';
  $('end').className='end';$('end').innerHTML='';
  net=null;cat=c;$('game').classList.toggle('ufc',c==='ufc');$('game').classList.toggle('fut',c==='futbol');
  G=BidEngine.create({cat:c,pool:POOLS[c],divs:c==='futbol'?FDIVS:UFC_DIVS});mirror();wantImg(G.deck);
  $('P1').innerHTML=panel(0);$('P2').innerHTML=panel(1);
  $('menu').style.display='none';$('game').style.display='block';$('end').style.display='none';
  apply(BidEngine.next(G));
}
/* ---------- ONLINE: el servidor manda; aquí solo se prepara la pantalla y se pinta lo que llega ---------- */
function startOnline(cat_,names,me,send){
  closeLineup();gameBg(cat_);bt++;clearInterval(tick);tick=0;$('wipe').className='wipe';document.querySelector('.board').style.display='';
  $('end').className='end';$('end').innerHTML='';$('end').style.display='none';
  cat=cat_;net={names,me,send};$('game').classList.toggle('ufc',cat==='ufc');$('game').classList.toggle('fut',cat==='futbol');
  G={cat,P:[{m:0,c:[]},{m:0,c:[]}],dv:'',phase:'idle',cur:null,bid:0,leader:-1,left:SECS,free:-1,passed:[false,false],skips:[2,2],locked:true};mirror();
  wantImg(POOLS[cat]);
  $('P1').innerHTML=panel(0);$('P2').innerHTML=panel(1);
  $('menu').style.display='none';$('game').style.display='block';
  $('P'+(me+1)).firstElementChild.classList.add('me');
}
function mismatch(){const b=$('netbar');if(!b)return;b.style.display='block';b.textContent=lang==='en'?'The server runs a different game version than this page. Restart the server with the updated files and reload with Ctrl+F5.':'El servidor tiene una versión distinta del juego que esta página. Reinicia el servidor con los archivos actualizados y recarga con Ctrl+F5.'}
const unk=l=>{const m=l.some(n=>n&&!byN.has(n));if(m)mismatch();return m}; // nombres que el servidor manda y esta página no conoce = versiones mezcladas
function netState(s,ev){if(unk([s.cur,...s.P.flatMap(p=>p.c.map(c=>c.n))]))return; // estado completo del servidor + eventos que lo han provocado
  G={cat:s.cat,dv:s.dv,phase:s.phase,cur:s.cur?byN.get(s.cur):null,bid:s.bid,leader:s.leader,left:s.left,free:s.free,passed:s.passed,skips:s.skips,locked:s.locked,
     P:s.P.map(p=>({m:p.m,c:p.c.map(c=>({...byN.get(c.n),paid:c.paid,free:c.free}))}))};
  mirror();
  for(const e of ev)onEv(e);
}
function netFight(f){closeLineup();const ns=[];JSON.stringify(f.script,(k,v)=>{if((k==='n'||k==='a'||k==='b')&&typeof v==='string')ns.push(v);return v});if(unk(ns))return;const tk=++bt;(f.kind==='ufc'?night:f.kind==='futbol'?match:run)(tk,f.script).catch(er=>{if(er!==0)throw er})}
function toMenu(){closeLineup();if(net){net.send({t:'leave'});net=null;if(window.olReset)olReset()}$('gbg').style.display='none';document.body.classList.remove('night','ingame');bt++;clearInterval(tick);tick=0;$('wipe').className='wipe';$('game').style.display='none';$('menu').style.display='block'}
const out=p=>BidEngine.out(G,p);
function hint(){if(free>=0){$('info').textContent=t('hintFree',2-free,free+1,skips[free]);return}const a=[0,1].filter(p=>passed[p]);$('info').textContent=a.length?t('hintPass',a[0]+1,2-a[0]):t('hintBase')}
/* ---------- PUENTE CON EL MOTOR: cada acción devuelve {ev, wait}; aquí se pintan los eventos y se programan las esperas ---------- */
function mirror(){cur=G.cur;bid=G.bid;leader=G.leader;left=G.left;locked=G.locked;free=G.free;P=G.P;skips=G.skips;passed=G.passed}
function apply(res){
  mirror();const tk=bt;
  for(const e of res.ev)onEv(e);
  if(G.phase==='bidding'){if(!tick)tick=setInterval(()=>apply(BidEngine.tick(G)),1000)}else{clearInterval(tick);tick=0}
  if(res.wait){const w=res.wait;setTimeout(()=>{if(tk===bt)apply(w.act==='close'?BidEngine.close(G,false):BidEngine.next(G))},w.ms)}
}
function onEv(e){switch(e.t){
  case 'lot':
    wantImg([cur],true);
    $('pic').innerHTML=(cur.img?`<img src="${cur.img}" alt="${cur.n}">`:`<div class="e">${cur.e}</div>`)+(cur.kind==='futbol'?`<div class="fovr${cur.leg?' leg':''}"><b>${cur.ovr}</b><span>${roleT(cur.role)}</span></div>`:'')+'<div class="stamp" id="stamp"><span id="st"></span></div>';
    $('pic').style.setProperty('--h',cur.h);
    $('lot').classList.toggle('ufc',cur.kind==='ufc'||cur.kind==='futbol');
    lastBid=0;lotText();hint();render();timer();break;
  case 'forced':render();break;
  case 'tick':timer();tickSnd();break;
  case 'bid':
    timer();$('i0').value=$('i1').value='';SND.bid(e.p,e.amount);gavel(e.p);
    if(!e.closing){const prev=lastBid;render();popBid(e,prev)}
    lastBid=e.amount;break;
  case 'err':err(e.p,t(e.code,e.arg));break;
  case 'pass':timer();render();hint();break;
  case 'sold':{
    SND.sold();render();gavel(e.p,true);const w=e.p,m=$('m'+w),sd=$('P'+(w+1)).firstElementChild;
    stamp(e.rand?t('stampRand',w+1,dnh(cur),e.broke):t('stampSold',w+1,dnh(cur),e.free?t('free'):t('forPrice',e.price)),'win w'+(w+1));
    if(e.rand)$('bid').textContent=t('random');
    m.classList.add('pop');sd.classList.add('won');
    $('s'+w).children[cat==='ufc'?UFC_DIVS.findIndex(d=>d.k===cur.cls):cat==='futbol'?futSlot(w,cur):P[w].c.length-1].classList.add('new');
    $('info').textContent=e.rand?t('randInfo',w+1,dn(cur),e.broke):e.gift?t('giftInfo',w+1,dn(cur)):e.free?t('infoFree',w+1,dn(cur),skips[w]<=0):t('infoSold',w+1,dn(cur),e.price,P[w].m);
    setTimeout(()=>{m.classList.remove('pop');sd.classList.remove('won')},1600);break}
  case 'discard':stamp(t('discard'));$('info').textContent='';render();break;
  case 'noBids':stamp(t('noBidsStamp'));$('info').textContent='';render();break;
  case 'deal':
    stamp(t(e.broke?'brokeStamp':'afkStamp'),'win w0');
    $('info').textContent=t((e.broke?'brokeInfo':'afkInfo')+(cat==='ufc'?'U':''));
    render();break;
  case 'finish':
    clearInterval(tick);tick=0;render();$('info').textContent=t('auctionOver');
    if(net)break; // online: el servidor manda 'order' (anime) y luego 'fight'
    {const tk=++bt,go=()=>(cat==='ufc'?night:cat==='futbol'?match:run)(tk).catch(er=>{if(er!==0)throw er});
     if(cat==='anime'&&P.some(p=>p.c.length>1))lineup({me:null}).then(o=>{if(tk!==bt)return;o.forEach((x,p)=>BidEngine.order(G,p,x));go()});else go()}break;
}}
function timer(){$('bar').style.width=Math.max(left,0)/SECS*100+'%';$('barw').classList.toggle('low',left<=3);$('tm').textContent='0:'+pad2(Math.max(left,0))}
function futSlot(p,c){let off=0;for(const d of FDIVS){if(d.k===c.cls)return off+P[p].c.filter(x=>x.cls===d.k).length-1;off+=d.n}return 0}
const POS_S={es:{GK:'POR',DEF:'DEF',MID:'MED',FWD:'DEL'},en:{GK:'GK',DEF:'DEF',MID:'MID',FWD:'FWD'}};
function render(){
  $('bid').textContent=leader<0?'—':bid?money(bid):t('free');
  $('who').textContent=leader<0?t(free>=0?'freeLot':'noBids'):t('player',leader+1);
  $('who').className='who'+(leader>=0?' w'+(leader+1):'');
  $('lot').classList.toggle('lead1',leader===0);$('lot').classList.toggle('lead2',leader===1);
  for(let p=0;p<2;p++){
    $('m'+p).textContent=money(P[p].m);
    let h='';
    const SL=cat==='ufc'?UFC_DIVS.map(d=>P[p].c.find(c=>c.cls===d.k)||d.k):cat==='futbol'?FDIVS.flatMap(d=>{const got=P[p].c.filter(c=>c.cls===d.k);return Array.from({length:d.n},(_,i)=>got[i]||d.k)}):Array.from({length:MAXC},(_,i)=>P[p].c[i]);
    SL.forEach(c=>{const dl=typeof c==='string'?c:c&&cat!=='anime'?c.cls:'',dt=cat==='futbol'?(c&&c.n?`${roleT(c.role)} · ${c.ovr} · `:(POS_S[lang]||POS_S.es)[dl]):dl?u('div_'+dl).split(' · ')[0]+(c&&c.n?' · ':''):'';
      h+=c&&c.n?`<div class="slot full" style="--h:${c.h}"><div class="av">${imgOf(c.n)?`<img src="${imgOf(c.n)}" alt="${c.n}">`:c.e}</div><div><b>${dnh(c)}</b><small>${dt}${c.paid?t('paid',c.paid):c.free?t('free'):t('random')}</small></div></div>`
          :`<div class="slot"><div class="av"></div>${dl?`<div><small>${dt}</small></div>`:''}</div>`});
    $('s'+p).innerHTML=h;
    $('g'+p).disabled=$('i'+p).disabled=locked||passed[p];
    $('u'+p).disabled=locked||passed[p]||free===p||bid+1>P[p].m;
    $('i'+p).disabled=$('i'+p).disabled||free===p;$('g'+p).textContent=t(free===p?'takeBtn':'bidBtn');$('i'+p).placeholder=t(free===p?'free':'bidPh');
    $('k'+p).disabled=locked||leader===p||!(leader>=0)&&(passed[p]||skipLocked(p));
    $('kl'+p).textContent=leader>=0&&leader!==p?t('concede',leader+1):passed[p]?t(out(p)?'autoPass':'passed'):skipLocked(p)?t('noSkips'):t(free===p?(BidEngine.can(G,1-p)?'passGift':'passFree'):'skipLbl');
    $('kp'+p).innerHTML=[0,1].map(i=>`<i class="${i<skips[p]?'on':''}"></i>`).join('');
    $('k'+p).classList.toggle('conc',leader>=0&&leader!==p&&!locked);
    if(net&&p!==net.me)$('g'+p).disabled=$('u'+p).disabled=$('i'+p).disabled=$('k'+p).disabled=true; // el panel del rival no se toca
  }
}
function err(p,t){$('e'+p).textContent=t;setTimeout(()=>{if($('e'+p).textContent===t)$('e'+p).textContent=''},2500)}
function place(p){if(net){if(p===net.me)net.send({t:'bid',amount:$('i'+p).value});return}apply(BidEngine.place(G,p,$('i'+p).value))}
function plus(p){const v=bid+1;if(net){if(p===net.me)net.send({t:'bid',amount:v});return}apply(BidEngine.place(G,p,v))} // puja la última +1 ($1 o 1M)
function stamp(t,c){const s=$('stamp');$('st').className=c||'';$('st').innerHTML=t;s.style.display='grid'}
const skipLocked=p=>skips[p]<=0;
function skip(p){if(net){if(p===net.me)net.send({t:'skip'});return}apply(BidEngine.skip(G,p))}
function again(){if(net){net.send({t:'rematch'});const b=document.querySelector('.res button');if(b){b.disabled=true;b.textContent=u('olAgainWait')}}else start(cat)}

/* ---------- ORDEN DE COMBATE (anime): antes de pelear cada jugador decide quién sale primero ----------
   Local: los dos ordenan en la misma pantalla. Online: solo ves tu equipo; el del rival sale sin orden hasta el combate. */
const LU_T={en:{title:'Battle order',sub:'Who fights first? The winner of each duel stays in with the HP they have left.',ready:'Ready',waiting:'Choosing…',done:'Ready ✓',up:'Move up',down:'Move down'},
 es:{title:'Orden de combate',sub:'¿Quién sale primero? El que gana un duelo sigue con la vida que le quede.',ready:'Listo',waiting:'Eligiendo…',done:'Listo ✓',up:'Subir',down:'Bajar'}};
const luT=k=>(LU_T[lang]||LU_T.en)[k];
let LU=null;
function closeLineup(){if(!LU)return;clearInterval(LU.clock);LU.el.remove();LU=null}
function lineup(o){ // o: { me: null (local) | 0 | 1, ms?, done?, send? } → en local devuelve una promesa con los dos órdenes
  closeLineup();
  return new Promise(res=>{
    const ord=[0,1].map(p=>P[p].c.map((_,i)=>i)),ready=(o.done||[false,false]).slice(),mine=p=>o.me==null||o.me===p;
    const el=document.createElement('div');el.className='modal open lu';document.body.appendChild(el);
    const end=o.ms?Date.now()+o.ms:0;
    LU={el,ready,paint:null,clock:0};
    const card=(p,i,k,ctl)=>{const c=P[p].c[i];return `<li class="lu-c" style="--h:${c.h}"><span class="lu-n">${ctl||o.me==null?k+1:'?'}</span><span class="lu-av">${spr(c)}</span><span class="lu-t"><b>${dnh(c)}</b>${trBadge(c)}<small>${an(c.a)}</small></span>${ctl?`<span class="lu-mv"><button data-p="${p}" data-k="${k}" data-d="-1" ${k?'':'disabled'} aria-label="${luT('up')}">▲</button><button data-p="${p}" data-k="${k}" data-d="1" ${k<ord[p].length-1?'':'disabled'} aria-label="${luT('down')}">▼</button></span>`:''}</li>`};
    const col=p=>{const ctl=mine(p)&&!ready[p];return `<section class="lu-col" style="--c:var(--p${p+1});--on:var(--on${p+1})"><h4>${t('player',p+1)}</h4><ol>${ord[p].map((i,k)=>card(p,i,k,ctl)).join('')||'<li class="lu-c e">—</li>'}</ol>${mine(p)?`<button class="lu-go" data-go="${p}" ${ready[p]?'disabled':''}>${luT(ready[p]?'done':'ready')}</button>`:`<p class="lu-st${ready[p]?' ok':''}">${luT(ready[p]?'done':'waiting')}</p>`}</section>`};
    const paint=()=>{el.innerHTML=`<div class="mbox lu-box"><div class="mh"><h3>${luT('title')}</h3>${end?'<b class="lu-tm" id="lutm"></b>':''}</div><p class="lu-sub">${luT('sub')}</p><div class="lu-cols">${col(0)}${col(1)}</div></div>`;tm()};
    const tm=()=>{const e=el.querySelector('#lutm');if(e)e.textContent=Math.max(0,Math.ceil((end-Date.now())/1000))+'s'};
    LU.paint=paint;if(end)LU.clock=setInterval(tm,250);
    el.onclick=ev=>{const b=ev.target.closest('button');if(!b||b.disabled)return;
      if(b.dataset.go!=null){const p=+b.dataset.go;ready[p]=true;if(o.send)o.send(ord[p]);paint();if(o.me==null&&ready[0]&&ready[1]){closeLineup();res(ord)}return}
      const p=+b.dataset.p,k=+b.dataset.k,j=k+(+b.dataset.d),a=ord[p];[a[k],a[j]]=[a[j],a[k]];paint()};
    paint();
  });
}
function netOrder(m){if(cat==='anime')lineup({me:net.me,ms:m.ms,done:m.done,send:o=>net.send({t:'order',order:o})})}
function netOrderReady(i){if(LU){LU.ready[i]=true;LU.paint()}}

/* ---------- COMBATE FINAL ---------- */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Escala logarítmica: cada POWER_BASE puntos = 10 veces más poder (250 -> 100 puntos de diferencia = x2,5).
const POWER_BASE=250,S=c=>Math.pow(10,c.pw/POWER_BASE);
const spr=c=>imgOf(c.n)?`<img src="${imgOf(c.n)}" alt="${c.n}">`:`<div class="e">${c.e}</div>`;

async function arenaIn(z,html){ // transición común
  const w=$('wipe');w.className='wipe in';await z(750);
  document.querySelector('.board').style.display='none';
  const E=$('end');E.className='end battle';E.style.display='block';E.innerHTML=html;scrollTo(0,0);
  await z(450);w.className='wipe out';await z(750);return E;
}
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1)),pick=a=>a[rnd(0,a.length-1)];
const C=n=>byN.get(n);

/* ---------- COMBATE FINAL (anime) v3: el motor resuelve todo y devuelve un guion; aquí solo se anima ----------
   HUD de juego de lucha (retrato, barras inclinadas con estela de daño, ki por segmentos, equipo), escenario por capas (nebulosa, rayos,
   suelo en perspectiva, ascuas), marcos de impacto, líneas de velocidad, zoom de cámara, técnicas con nombre propio, choques, despertar,
   habilidades únicas con su cut-in de firma y su propia animación, K.O. y doble K.O. */
const ST_LBL={es:{STR:'FUE',SPD:'VEL',DUR:'RES',TEC:'TÉC',ENE:'ENE'},en:{STR:'STR',SPD:'SPD',DUR:'DUR',TEC:'TEC',ENE:'ENG'}};
const stT=(c,st)=>{const s=st||BidEngine.stats(c),L=ST_LBL[lang]||ST_LBL.es;return '<div class="sts">'+['STR','SPD','DUR','TEC','ENE'].map(k=>`<span><small>${L[k]}</small><i><u style="width:${Math.min(100,s[k]/10)}%"></u></i><b>${s[k]}</b></span>`).join('')+'</div>'};
const AB_T={
 es:{duel:'Duelo',ki:'KI',skip:'Saltar animación',special:'Técnica especial',
  hit:['<b>{a}</b> golpea a {d}','<b>{a}</b> encadena un combo sobre {d}','<b>{a}</b> conecta un directo a {d}','Patada voladora de <b>{a}</b>','<b>{a}</b> aparece detrás de {d} y golpea','<b>{a}</b> carga contra {d}'],
  crit:['¡Golpe crítico de <b>{a}</b>!','¡<b>{a}</b> encuentra el punto débil de {d}!'],
  sp:'<b>{a}</b>: «{m}»',spc:'¡<b>{a}</b> a plena potencia: «{m}»!',
  miss:['<b>{d}</b> esquiva a {a}','<b>{d}</b> bloquea el golpe de {a}','{a} falla: <b>{d}</b> es más rápido'],missSp:'<b>{d}</b> esquiva «{m}»',
  ctr:'¡<b>{a}</b> contraataca!',clash:'¡Choque de técnicas! «{m1}» contra «{m2}»',clashWin:'¡<b>{w}</b> se impone en el choque!',
  awake:'¡<b>{a}</b> despierta su verdadero poder!',critPop:'¡Crítico!',dodgePop:'¡Esquiva!',awakePop:'¡Despertar!',clashPop:'¡Choque!',
  log:'<b>{0}</b> derrota a {1} · le queda un {2} %',kos:'{0} K.O.',kos1:'1 K.O.',mvp:'MVP',
  uctr:'¡El cuerpo de <b>{a}</b> esquiva y contraataca solo!',uiPop:'Ultra Instinto',bfPop:'¡Destello Negro!',asPop:'¡Asura!',
  clone:'¡Un clon de <b>{a}</b> golpea a {d}!',roller:'¡<b>{a}</b> aplasta a {d} con una apisonadora!',copied:'<b>{a}</b> devuelve «{m}»',
  fc:'«{m}» vuelve contra {d} con el doble de fuerza',dko:'¡Doble K.O.!',dkoLog:'<b>{0}</b> y <b>{1}</b> caen a la vez',
  sac:'<b>{0}</b> ha sido sacrificado',sacLog:'{0} cae sacrificado en el Eclipse',unique:'Habilidad única',illusion:'¡Ilusión!',erased:'Borrado',
  ult:{hakai:'Hakai',gates:'Night Guy',mugetsu:'Mugetsu',rumbling:'El Retumbar'}},
 en:{duel:'Duel',ki:'KI',skip:'Skip animation',special:'Special technique',
  hit:['<b>{a}</b> hits {d}','<b>{a}</b> chains a combo on {d}','<b>{a}</b> lands a straight on {d}','Flying kick by <b>{a}</b>','<b>{a}</b> appears behind {d} and strikes','<b>{a}</b> charges at {d}'],
  crit:['Critical hit by <b>{a}</b>!','<b>{a}</b> finds {d}’s weak spot!'],
  sp:'<b>{a}</b>: “{m}”',spc:'<b>{a}</b> at full power: “{m}”!',
  miss:['<b>{d}</b> dodges {a}','<b>{d}</b> blocks {a}’s strike','{a} misses: <b>{d}</b> is faster'],missSp:'<b>{d}</b> dodges “{m}”',
  ctr:'<b>{a}</b> counterattacks!',clash:'Technique clash! “{m1}” vs “{m2}”',clashWin:'<b>{w}</b> wins the clash!',
  awake:'<b>{a}</b> awakens their true power!',critPop:'Critical!',dodgePop:'Dodge!',awakePop:'Awakening!',clashPop:'Clash!',
  log:'<b>{0}</b> defeats {1} · {2}% left',kos:'{0} K.O.s',kos1:'1 K.O.',mvp:'MVP',
  uctr:'<b>{a}</b>’s body dodges and counters on its own!',uiPop:'Ultra Instinct',bfPop:'Black Flash!',asPop:'Asura!',
  clone:'A clone of <b>{a}</b> hits {d}!',roller:'<b>{a}</b> crushes {d} with a road roller!',copied:'<b>{a}</b> fires back “{m}”',
  fc:'“{m}” hits {d} back at double power',dko:'Double K.O.!',dkoLog:'<b>{0}</b> and <b>{1}</b> fall together',
  sac:'<b>{0}</b> has been sacrificed',sacLog:'{0} is sacrificed in the Eclipse',unique:'Unique ability',illusion:'Illusion!',erased:'Erased',
  ult:{hakai:'Hakai',gates:'Night Guy',mugetsu:'Mugetsu',rumbling:'The Rumbling'}}};
// Rasgos: [nombre, qué hace, frase al activarse, frase alternativa]. Las reglas están en engine.js (RASGOS).
const TR_T={
 en:{touch:['Touch of God','Acts first and erases anyone with a single touch','<b>{a}</b> reaches out… one touch is enough.'],
  inf:['Infinity','The first 2 attacks never reach them','{b}’s attack stops in mid-air: <b>{a}</b>’s Infinity!'],
  time:['Time Stop','Once per duel: 2 hits that can’t be dodged','<b>{a}</b>: “Time, stop!”'],
  ui:['Untouchable','Rivals miss 18% more often',''],
  req:['Requiem','Cancels the first blow that would K.O. them · rivals can’t awaken','<b>{a}</b>’s Requiem returns the blow to zero!'],
  serious:['Serious Punch','After taking 3 hits, the next attack takes at least 55% HP','<b>{a}</b> gets serious…'],
  toll:['The Toll','Each duel starts with the rival losing 40% ki and 10% HP','<b>{a}</b> collects the toll from {d}'],
  domain:['Domain Expansion','Once per duel: 4 attacks that never miss and hit 40% harder','<b>{a}</b>: “Domain Expansion!”'],
  regen:['Regeneration','Below 60% HP heals 7% each turn (up to 4 times)','<b>{a}</b> regenerates'],
  adapt:['Adaptation','Each hit taken deals 10% less (up to 4 times)','<b>{a}</b> adapts to the attacks'],
  gen:['Genjutsu','On their first turn the rival loses 2 turns','<b>{a}</b> traps {d} in a genjutsu'],
  stun:['','','<b>{a}</b> is trapped and can’t move'],
  rage:['Berserk','Below 40% HP hits 30% harder','<b>{a}</b> goes berserk!'],
  sun:['The One','Hits 50% harder during the first 4 turns','<b>{a}</b>: the sun is at its peak!'],
  ultra:['Ultra Instinct','Rivals miss 22% more and every dodge becomes a full-power counter',''],
  ego:['Ultra Ego','Every hit taken raises all stats by 22 (up to 6 times)','<b>{a}</b> grows stronger with the pain'],
  hakai:['Hakai','Once per duel: destroys a rival below 35% HP','<b>{a}</b> raises a hand: “Hakai.”'],
  erase:['Erase','Each duel starts with a 50% chance of erasing the rival on a whim','<b>{a}</b> points at {d}… and erases them.','<b>{a}</b> is distracted, playing…'],
  rewind:['Temporal Do-Over','Once per duel: undoes the first hit of 15%+ and the rival loses a turn','<b>{a}</b> rewinds time three seconds'],
  copy:['Mimicry','When hit by a technique, copies it and fires it back (twice per duel)','<b>{a}</b> copies “{m}”!'],
  clones:['Shadow Clones','A clone also strikes in their first 3 attacks','<b>{a}</b>: “Multi Shadow Clone Jutsu!”'],
  amaterasu:['Amaterasu','The first hit sets black flames: the rival burns 4% every turn','Black flames engulf {d}!'],
  burn:['','','{d} burns in the black flames'],
  meteor:['Tengai Shinsei','Opens each duel by dropping 2 meteors','<b>{a}</b>: “Tengai Shinsei!”'],
  rock:['','','A meteor crashes onto {d}!','{d} dodges the meteor'],
  tsukuyomi:['Tsukuyomi','First turn: the rival loses 2 turns, 12% HP and 30% ki','<b>{a}</b>: “Welcome to my Tsukuyomi.”'],
  kamui:['Kamui','Sends the rival’s first technique to another dimension','<b>{a}</b> swallows “{m}” into another dimension!'],
  gates:['Eighth Gate','Once below 35%: Night Guy, a 60%+ blow that burns their own body','<b>{a}</b> opens the Eighth Gate: the Gate of Death!'],
  gear5:['Gear 5','Once below 50%: heals 25%, +70 to all stats and hits more often','<b>{a}</b> laughs… the Drums of Liberation are beating!'],
  asura:['Asura','More critical hits, and they hit ×2.4',''],
  quake:['Gura Gura','Techniques shake the world: 50% chance the rival loses a turn','The world cracks: {d} loses their footing!'],
  haki:['Conqueror’s Haki','Rivals 200+ power weaker faint; the rest lose their first turn','<b>{a}</b> unleashes Conqueror’s Haki','{d} faints from the pressure!'],
  mugetsu:['Mugetsu','Once below 30%: a 65%+ blow, then loses their powers','<b>{a}</b> becomes the Getsuga itself: “Mugetsu.”'],
  kyoka:['Kyōka Suigetsu','The rival’s first 2 attacks hit an illusion','<b>{a}</b>: “Since when were you under the impression…?”'],
  mirage:['','','{b} attacks… an illusion. <b>{a}</b> was never there.'],
  shrine:['Malevolent Shrine','Domain: 4 sure hits at +40%, and the slashes cut the rival every turn','<b>{a}</b>: “Domain Expansion: Malevolent Shrine.”'],
  slash:['','','Dismantle slices {d}'],
  bflash:['Black Flash','15% of hits become Black Flash (×2.5, recovers ki); each one makes the next likelier',''],
  jackpot:['Jackpot','Each turn 12% to hit the jackpot: full heal and the next 4 hits regenerate instantly','JACKPOT! <b>{a}</b> is unkillable for a while'],
  jpheal:['','','<b>{a}</b> regenerates instantly'],
  rumbling:['The Rumbling','Once below 40%: 3 Colossal Titan stomps that can’t be dodged','<b>{a}</b> unleashes the Rumbling'],
  ackerman:['Ackerman','The stronger the rival, the harder the blows: up to +80%','<b>{a}</b> sizes up the giant'],
  adult:['Adult Gon','Once below 30%: +220 to all stats for 3 turns, then burns out (−150)','<b>{a}</b> gives everything: “This is where it ends.”'],
  spent:['','','<b>{a}</b> has burned out'],
  rose:['Poor Man’s Rose','When they fall, the rose explodes: 50% damage to the rival','<b>{a}</b> smiles… and the Poor Man’s Rose goes off'],
  steal:['Skill Hunter','Steals the rival’s ability at the start of each duel','<b>{a}</b> opens the book and steals “{s}”'],
  chain:['Judgment Chain','Kills any Phantom Troupe member on the spot; against others, Emperor Time (+90, costs 3% HP a turn)','<b>{a}</b>’s chain pierces {d}’s heart','<b>{a}</b>’s eyes turn scarlet: Emperor Time'],
  hinokami:['Hinokami Kagura','After the first technique, the dance chains 3 more without ki','<b>{a}</b> dances the Dance of the Fire God'],
  anti:['Anti-Magic','Cancels the rival’s ability; techniques do 40% less to them','<b>{a}</b> cuts {d}’s “{s}” in half'],
  zawarudo:['ZA WARUDO','Once per duel: stops time, strikes and finishes with a road roller','<b>{a}</b>: “ZA WARUDO! Toki wo tomare!”'],
  roller:['','','“ROAD ROLLER DA!”'],
  heaven:['Made in Heaven','Time accelerates: takes at least 60% of the turns','<b>{a}</b>: “Made in Heaven!” Time accelerates'],
  counter:['Full Counter','Sends the rival’s first technique back at double power','<b>{a}</b>: “Full Counter!”'],
  arise:['Arise','Opens each duel with the shadow army: 2 shadows +1 per rival defeated','<b>{a}</b>: “Arise.”'],
  shadow:['','','A shadow soldier strikes {d}'],
  geass:['Geass','One order per person: the rival’s first attack turns against them','<b>{a}</b>: “Lelouch vi Britannia commands you!”'],
  self:['','','<b>{a}</b> obeys the Geass and strikes themselves'],
  eclipse:['Eclipse','Once, instead of falling, sacrifices the next teammate and is reborn at 60%','<b>{a}</b> offers up {s}… the Eclipse begins'],
  dnote:['Death Note','Writes the rival’s name before anyone moves: the rival kills Light with one blow and dies of a heart attack 40 s later. Both always fall','<b>{a}</b> writes {d}’s name in the Death Note…','','Heart attack · 40 s'],
  heart:['','','40 seconds later… {d}’s heart stops.'],
  pops:{stun:'Trapped!',adapt:'Adapted',regen:'Regen'}},
 es:{touch:['Toque de Dios','Actúa primero y borra a cualquiera de un solo toque','<b>{a}</b> extiende la mano… basta un toque.'],
  inf:['Infinito','Los 2 primeros ataques no le llegan','El ataque de {b} se frena en el aire: ¡Infinito de <b>{a}</b>!'],
  time:['Tiempo detenido','1 vez por duelo: 2 golpes imposibles de esquivar','<b>{a}</b>: «¡Tiempo, detente!»'],
  ui:['Intocable','El rival falla un 18 % más',''],
  req:['Requiem','Anula el primer golpe que le dejaría K.O. · el rival no puede despertar','¡El Requiem de <b>{a}</b> devuelve el golpe a cero!'],
  serious:['Golpe serio','Tras recibir 3 golpes, su siguiente ataque quita al menos un 55 %','<b>{a}</b> se pone serio…'],
  toll:['El peaje','Cada duelo el rival empieza perdiendo un 40 % de ki y un 10 % de vida','<b>{a}</b> cobra el peaje a {d}'],
  domain:['Expansión de dominio','1 vez por duelo: 4 ataques que no fallan y hacen un 40 % más','<b>{a}</b>: «¡Expansión de dominio!»'],
  regen:['Regeneración','Por debajo del 60 % se cura un 7 % por turno (hasta 4 veces)','<b>{a}</b> se regenera'],
  adapt:['Adaptación','Cada golpe recibido le hace un 10 % menos (hasta 4 veces)','<b>{a}</b> se adapta a los ataques'],
  gen:['Genjutsu','En su primer turno el rival pierde 2 turnos','<b>{a}</b> atrapa a {d} en un genjutsu'],
  stun:['','','<b>{a}</b> está atrapado y no puede moverse'],
  rage:['Furia','Por debajo del 40 % pega un 30 % más','¡<b>{a}</b> entra en furia!'],
  sun:['The One','Pega un 50 % más en sus 4 primeros turnos','<b>{a}</b>: ¡el sol está en lo más alto!'],
  ultra:['Ultra Instinto','El rival falla un 22 % más y cada esquiva es un contraataque a plena potencia',''],
  ego:['Ultra Ego','Cada golpe que recibe le sube 22 a todo (hasta 6 veces)','<b>{a}</b> se crece con el dolor'],
  hakai:['Hakai','1 vez por duelo: destruye a un rival por debajo del 35 %','<b>{a}</b> levanta la mano: «Hakai».'],
  erase:['Borrar','Cada duelo empieza con un 50 % de borrar al rival por capricho','<b>{a}</b> señala a {d}… y lo borra.','<b>{a}</b> se distrae jugando…'],
  rewind:['Retroceso temporal','1 vez por duelo: deshace el primer golpe de más del 15 % y el rival pierde un turno','<b>{a}</b> rebobina el tiempo tres segundos'],
  copy:['Imitación','Cuando le alcanza una técnica, la copia y la devuelve (2 veces por duelo)','¡<b>{a}</b> copia «{m}»!'],
  clones:['Multiclones de Sombra','En sus 3 primeros ataques un clon también golpea','<b>{a}</b>: «¡Multiclones de Sombra!»'],
  amaterasu:['Amaterasu','Su primer golpe prende llamas negras: el rival arde un 4 % cada turno','¡Las llamas negras envuelven a {d}!'],
  burn:['','','{d} arde en las llamas negras'],
  meteor:['Tengai Shinsei','Empieza cada duelo dejando caer 2 meteoritos','<b>{a}</b>: «¡Tengai Shinsei!»'],
  rock:['','','¡Un meteorito se estrella contra {d}!','{d} esquiva el meteorito'],
  tsukuyomi:['Tsukuyomi','Primer turno: el rival pierde 2 turnos, un 12 % de vida y un 30 % de ki','<b>{a}</b>: «Bienvenido a mi Tsukuyomi».'],
  kamui:['Kamui','Manda la primera técnica del rival a otra dimensión','¡<b>{a}</b> se traga «{m}» a otra dimensión!'],
  gates:['Octava Puerta','1 vez por debajo del 35 %: Night Guy, un golpe de más del 60 % que le quema el cuerpo','¡<b>{a}</b> abre la Octava Puerta: la Puerta de la Muerte!'],
  gear5:['Gear 5','1 vez por debajo del 50 %: se cura un 25 %, +70 a todo y acierta más','<b>{a}</b> se ríe… ¡suenan los Tambores de la Liberación!'],
  asura:['Asura','Más críticos, y sus críticos pegan ×2,4',''],
  quake:['Gura Gura','Sus técnicas parten el mundo: 50 % de que el rival pierda un turno','¡El mundo se agrieta: {d} pierde el equilibrio!'],
  haki:['Haki del Rey','Los rivales con 200 de poder menos se desmayan; el resto pierde su primer turno','<b>{a}</b> desata el Haki del Rey','¡{d} se desmaya por la presión!'],
  mugetsu:['Mugetsu','1 vez por debajo del 30 %: un golpe de más del 65 %, y después pierde sus poderes','<b>{a}</b> se convierte en el Getsuga: «Mugetsu».'],
  kyoka:['Kyōka Suigetsu','Los 2 primeros ataques del rival golpean una ilusión','<b>{a}</b>: «¿Desde cuándo creías que…?»'],
  mirage:['','','{b} ataca… a una ilusión. <b>{a}</b> nunca estuvo ahí.'],
  shrine:['Santuario Malévolo','Dominio: 4 golpes seguros con un 40 % más, y los cortes hieren al rival cada turno','<b>{a}</b>: «Expansión de dominio: Santuario Malévolo».'],
  slash:['','','Desmantelar corta a {d}'],
  bflash:['Destello Negro','El 15 % de sus golpes son Destello Negro (×2,5, recupera ki); cada uno hace más probable el siguiente',''],
  jackpot:['Jackpot','Cada turno, 12 % de premio: se cura entero y regenera al instante los 4 golpes siguientes','¡JACKPOT! <b>{a}</b> es inmortal durante un rato'],
  jpheal:['','','<b>{a}</b> se regenera al instante'],
  rumbling:['El Retumbar','1 vez por debajo del 40 %: 3 pisotones de Titanes Colosales imposibles de esquivar','<b>{a}</b> desata el Retumbar'],
  ackerman:['Ackerman','Cuanto más fuerte el rival, más duro pega: hasta un 80 % más','<b>{a}</b> mide al gigante'],
  adult:['Gon adulto','1 vez por debajo del 30 %: +220 a todo durante 3 turnos; después se consume (−150)','<b>{a}</b> lo da todo: «Esto se acaba aquí».'],
  spent:['','','<b>{a}</b> se ha consumido'],
  rose:['Rosa del Pobre','Al caer, la rosa explota: un 50 % de daño al rival','<b>{a}</b> sonríe… y la Rosa del Pobre explota'],
  steal:['Skill Hunter','Roba la habilidad del rival al empezar cada duelo','<b>{a}</b> abre el libro y roba «{s}»'],
  chain:['Cadena del Juicio','Mata al instante a cualquier miembro de la Brigada Fantasma; contra el resto, Emperor Time (+90, cuesta un 3 % de vida por turno)','La cadena de <b>{a}</b> atraviesa el corazón de {d}','Los ojos de <b>{a}</b> se vuelven escarlata: Emperor Time'],
  hinokami:['Hinokami Kagura','Tras su primera técnica, la danza encadena 3 más sin gastar ki','<b>{a}</b> baila la Danza del Dios del Fuego'],
  anti:['Anti-magia','Anula la habilidad del rival; las técnicas le hacen un 40 % menos','<b>{a}</b> parte en dos «{s}» de {d}'],
  zawarudo:['ZA WARUDO','1 vez por duelo: detiene el tiempo, golpea y remata con una apisonadora','<b>{a}</b>: «¡ZA WARUDO! ¡Toki wo tomare!»'],
  roller:['','','«¡ROAD ROLLER DA!»'],
  heaven:['Made in Heaven','El tiempo se acelera: tiene al menos el 60 % de los turnos','<b>{a}</b>: «¡Made in Heaven!» El tiempo se acelera'],
  counter:['Full Counter','Devuelve la primera técnica del rival con el doble de fuerza','<b>{a}</b>: «¡Full Counter!»'],
  arise:['Arise','Empieza cada duelo con su ejército de sombras: 2 sombras +1 por cada rival derrotado','<b>{a}</b>: «Arise».'],
  shadow:['','','Un soldado de las sombras golpea a {d}'],
  geass:['Geass','Una orden por persona: el primer ataque del rival se vuelve contra él','<b>{a}</b>: «¡Lelouch vi Britannia te lo ordena!»'],
  self:['','','<b>{a}</b> obedece el Geass y se golpea'],
  eclipse:['Eclipse','1 vez, en vez de caer, sacrifica al siguiente de su equipo y renace al 60 %','<b>{a}</b> ofrece a {s}… comienza el Eclipse'],
  dnote:['Death Note','Escribe el nombre del rival antes que nadie: el rival mata a Light de un golpe y 40 s después muere de un ataque al corazón. Caen los dos siempre','<b>{a}</b> escribe el nombre de {d} en el Death Note…','','Ataque al corazón · 40 s'],
  heart:['','','40 segundos después… el corazón de {d} se para.'],
  pops:{stun:'¡Atrapado!',adapt:'Adaptado',regen:'Regenera'}}};
const trT=(k,i)=>{const d=TR_T[lang]||TR_T.en,v=d[k];return v?v[i]||'':''};
// Habilidades únicas (una por personaje icónico) y su color de firma
const SIGC={touch:'#fff3c4',inf:'#7fd8ff',serious:'#ffd23f',sun:'#ffb02e',ultra:'#dfe7ff',ego:'#b04dff',hakai:'#a43cff',erase:'#ffffff',rewind:'#7ad7ff',copy:'#ff4d6d',
 clones:'#ff9d2e',amaterasu:'#a35cff',meteor:'#ff7a2e',tsukuyomi:'#ff2a3a',kamui:'#8f6bff',gates:'#3dff9e',gear5:'#ffffff',asura:'#7dff8a',quake:'#cfe9ff',haki:'#ff2a2a',
 mugetsu:'#aab2c8',kyoka:'#8affd0',shrine:'#ff1f3d',bflash:'#ff1f3d',jackpot:'#ffd23f',rumbling:'#ffb27a',ackerman:'#c9d6e3',adult:'#ffd23f',rose:'#ff9ec4',steal:'#b07cff',
 chain:'#ffcf5a',hinokami:'#ff6a00',anti:'#9dff6a',zawarudo:'#ffd23f',heaven:'#9be7ff',counter:'#ff3b6b',arise:'#8a7cff',geass:'#ff2a55',eclipse:'#ff1f1f',dnote:'#f2f2f2'};
const UNQ=new Set(Object.keys(SIGC));
const trB=k=>k?`<em class="trb${UNQ.has(k)?' u':''}" title="${trT(k,1)}"${UNQ.has(k)?` style="--sc:${SIGC[k]}"`:''}>${UNQ.has(k)?'★':'✦'} ${trT(k,0)}</em>`:'';
const trBadge=c=>c&&c.tr?trB(c.tr):'';
const abT=(k,...a)=>{let s=(AB_T[lang]||AB_T.es)[k];if(Array.isArray(s))s=s[(a[0]||0)%s.length];return String(s??k)};
const abF=(s,o)=>s.replace(/\{(\w+)\}/g,(m,k)=>o[k]??m);
const mvOf=(c,v)=>{const l=c?(lang==='es'?c.mvEs:c.mv)||c.mv||[]:[];return l.length?l[(v||0)%l.length]:abT('special')};
let ABS=1; // las peleas siempre a velocidad normal
function abArena(){
  const plate=p=>`<div class="ab-pl a${p}" style="--c:var(--p${p+1});--on:var(--on${p+1})">
<div class="ab-face" id="abfc${p}"></div>
<div class="ab-pm"><div class="ab-who"><span>${t('player',p+1)}</span><b id="abn${p}">—</b></div><div class="ab-trn" id="abtr${p}"></div>
<div class="ab-bar ab-hp"><i class="g" id="abg${p}"></i><i class="v" id="abh${p}"></i><em id="abhp${p}">100%</em></div>
<div class="ab-bar ab-ki"><i id="abk${p}"></i></div>
<div class="ab-tm" id="abt${p}"></div></div><div class="ab-stw" id="abs${p}"></div></div>`;
  const emb=Array.from({length:18},(_,i)=>`<s style="left:${rnd(2,98)}%;--s:${rnd(3,7)}px;--d:${rnd(6,13)}s;--dl:-${rnd(0,13)}s;--x:${rnd(-70,70)}px;--ec:var(--p${i%2+1})"></s>`).join('');
  const fighter=p=>`<div class="ab-f a${p}" id="abf${p}" style="--c:var(--p${p+1})"><i class="ab-aura"></i><div class="ab-card" id="abc${p}"></div><i class="ab-shd"></i></div>`;
  return `<div class="ab" id="ab"><div class="ab-top">${plate(0)}<div class="ab-c"><small>${abT('duel')}</small><b id="abdn">1</b></div>${plate(1)}</div>
<div class="ab-stage" id="abst"><div class="ab-world" id="abw"><div class="ab-sky"></div><div class="ab-neb"></div><div class="ab-alt"></div><div class="ab-floor"></div><div class="ab-emb">${emb}</div>${fighter(0)}${fighter(1)}</div>
<div class="ab-spl"></div><div class="ab-vig"></div><div class="ab-fx" id="abfx"></div></div>
<div class="ab-com" id="abcom" aria-live="polite"></div>
<div class="ab-bot"><div class="ab-dlg" id="abdl"></div></div>
<div class="ab-log" id="ablog"></div></div>`;
}
// Elemento de las técnicas (solo cambia el color y el estilo del rayo). Sin elemento = color del jugador.
const ELEM={fire:['Mereoleona','Deidara','Ace','Tanjiro','Feitan','Rengoku','Roy Mustang','Jogo','Escanor','Demon King'],
 bolt:['Fourth Raikage','Sasuke','Minato','Hajime Kashimo','Zeus','Killua','Zenitsu','Thor','Killer B'],
 water:['Dagon','Uraume','Whitebeard','Giyu','Kisame','Noelle','Tobirama Senju'],
 dark:['Light Yagami','Lucifero','Dante Zogratis','Shisui Uchiha','Kabuto','Sung Jin-Woo','Yami','Pride','Muzan','Madara','Itachi','Obito','Sukuna','Mahito','Kenjaku','Geto','Dio Brando','Zeldris','Aizen','Choso','Father','Griffith','Meruem','Kaneki','Chrollo Lucilfer','Orochimaru','Pain'],
 light:['Nanika','Giorno Giovanna','God','Grand Priest','Whis','Hagoromo Otsutsuki','Netero','Saitama','Van Hohenheim','Yuki Tsukumo'],
 void:['Kaguya Otsutsuki','Gojo','Frieza','Beerus','Zeno','Truth','Rick Sanchez','Boros'],
 wind:['Danzo','Takako Uro','Naruto','Zoro','Yuno','Asta'],
 psy:['Tatsumaki','Mob','Broly','Hashirama']};
const ELC={fire:['#ff6a00','#ffe08a'],bolt:['#5fd0ff','#ffffff'],water:['#1f7bff','#bfe9ff'],dark:['#8a2be2','#14021f'],light:['#ffc400','#fffbe6'],void:['#b13cff','#ffd1ff'],wind:['#39e6a0','#f0fff8'],psy:['#2bff6e','#e6ffe9']};
const ELN={};for(const k in ELEM)ELEM[k].forEach(n=>ELN[n]=k);
// Comentarista: frases según lo que pasa (diferencia de poder, remontadas, sorpresas…)
const COM_T={en:{first:'First blood!',gap:['<b>{a}</b> is toying with {b}…','This looks like a mismatch!'],even:'Evenly matched: anything can happen!',
  comeback:'What a comeback by <b>{a}</b>!',flawless:'Flawless! <b>{a}</b> didn’t take a scratch.',upset:'Upset! <b>{a}</b> beats a far stronger rival!',
  close:'<b>{a}</b> survives by a thread!',last:'<b>{a}</b> is {p}’s last hope!',combo:'{0} HITS'},
 es:{first:'¡Primera sangre!',gap:['<b>{a}</b> está jugando con {b}…','¡Esto parece muy desigual!'],even:'¡Igualadísimo: puede pasar cualquier cosa!',
  comeback:'¡Qué remontada de <b>{a}</b>!',flawless:'¡Impecable! <b>{a}</b> no ha recibido ni un rasguño.',upset:'¡Sorpresa! <b>{a}</b> tumba a un rival mucho más fuerte',
  close:'¡<b>{a}</b> sobrevive por los pelos!',last:'<b>{a}</b> es la última esperanza de {p}',combo:'{0} GOLPES'}};
const comT=k=>(COM_T[lang]||COM_T.en)[k];
const STAGE_FX=['dz0','dz1','tstop','fin','gen','god','tsk','ecl','mih','shr','rmb','mug','hki','dark','rwd'];
async function run(tk,script){
  const S0=script||BidEngine.resolveAnime(G);
  const z=async ms=>{await sleep(ms/ABS);if(tk!==bt)throw 0};
  $('gbg').classList.add('fight'); // se acabó la subasta: los martillos se apartan
  const E=await arenaIn(async ms=>{await sleep(ms);if(tk!==bt)throw 0},abArena());
  const AB=$('ab'),ST=$('abst'),FX=$('abfx'),WD=$('abw');
  ABS=1;AB.style.setProperty('--k',1);
  const T0=S0.ev[0]&&S0.ev[0].teams; // orden real de cada equipo (el motor lo manda; si no, el de la compra)
  const team=[0,1].map(p=>T0?T0[p]:(P[p]&&P[p].c||[]).map(c=>c.n)),ko=[[],[]],act=[-1,-1],cur=[null,null];let hpN=[1,1],lastDown='',lastL=null,dno=0;
  const roster=p=>$('abt'+p).innerHTML=team[p].map((n,k)=>{const c=C(n);return c?`<i class="ab-th${k===act[p]?' on':''}${ko[p][k]?' ko':''}" data-n="${n}" style="--h:${c.h}">${spr(c)}</i>`:''}).join('');
  roster(0);roster(1);
  const say=async(h,ms)=>{$('abdl').innerHTML='<span>'+h+'</span>';if(ms)await z(ms)};
  const re=(el,c)=>{el.classList.remove(c);void el.offsetWidth;el.classList.add(c)};
  const com=h=>{const c=$('abcom');c.innerHTML='<span>🎙 '+h+'</span>';re(c,'on')};
  const tmp=(html,ms)=>{const w=document.createElement('div');w.innerHTML=html;const el=w.firstElementChild;FX.appendChild(el);setTimeout(()=>el.remove(),ms/Math.min(ABS,2));return el};
  const ctr=(p,f=.42)=>{const s=ST.getBoundingClientRect(),r=$('abc'+p).getBoundingClientRect();return{x:r.left+r.width/2-s.left,y:r.top+r.height*f-s.top}};
  const setB=(p,hp,en)=>{const v=$('abh'+p);if(hp!=null){hp=Math.max(0,Math.min(1,hp));v.style.width=$('abg'+p).style.width=hp*100+'%';v.className='v'+(hp>.5?'':hp>.2?' mid':' low');$('abhp'+p).textContent=Math.ceil(hp*100)+'%'}if(en!=null)$('abk'+p).style.width=Math.max(0,Math.min(1,en))*100+'%'};
  const num=(p,txt,k='')=>{const c=ctr(p,.22);tmp(`<span class="ab-num ${k}" style="left:${c.x+(Math.random()*40-20)}px;top:${c.y}px">${txt}</span>`,1200)};
  const elC=a=>{const e=cur[a]&&ELC[ELN[cur[a].n]];return e?e[0]:null};
  const at=(p,f,cls,inner='',ms=1200,st='')=>{const c=ctr(p,f);return tmp(`<span class="${cls}" style="left:${c.x}px;top:${c.y}px;${st}">${inner}</span>`,ms)};
  const burst=(p,big,col)=>at(p,.42,'ab-burst','',650,`--s:${big?180:100}px;--c:${col||`var(--p${2-p})`}`);
  const pop=(txt,k='',col)=>tmp(`<b class="ab-pop ${k}" style="${col?'--pc:'+col:''}">${txt}</b>`,1000);
  const shake=()=>re(ST,'shk'),flash=c=>{ST.style.setProperty('--fc',c||'#fff');re(ST,'fl')};
  const imp=()=>re(ST,'imp'); // marco de impacto: dos fotogramas en negativo, como en el anime
  const zoom=p=>{const c=ctr(p,.5);WD.style.setProperty('--zx',c.x+'px');re(ST,'zm')}; // golpe de cámara hacia quien recibe
  const speed=p=>{const c=ctr(p,.5),w=ST.getBoundingClientRect().width||1;ST.style.setProperty('--sx',c.x/w*100+'%');re(ST,'spd')};
  const shield=p=>at(p,.5,'ab-shield','',800,`--c:var(--p${p+1})`);
  const mark=(p,c,on=true)=>$('abf'+p).classList.toggle(c,on),stg=(c,on=true)=>ST.classList.toggle(c,on);
  const fa=(p,c)=>{const f=$('abf'+p);f.classList.remove('in','atk','hit','dodge');void f.offsetWidth;f.classList.add(c)};
  const lunge=p=>{fa(p,'atk');speed(1-p)},hurt=p=>{fa(p,'hit');re($('abfc'+p),'hit')},dodge=p=>fa(p,'dodge');
  const sfx=k=>{if(ABS<=2)SND.fx(k)};
  const pct=x=>'-'+Math.max(1,Math.round(x*100))+'%';
  const badge=(p,k,cut)=>{$('abtr'+p).innerHTML=cut?`<span class="trx">${$('abtr'+p).innerHTML}</span>`:trB(k)};
  const cutin=async(p,c,m)=>{const el=tmp(`<div class="ab-cut${p?' r':''}" style="--c:var(--p${p+1});--on:var(--on${p+1})"><span class="ci" style="--h:${c.h}">${spr(c)}</span><span class="ct"><small>${dnh(c)}</small><b>${m}</b></span></div>`,1000);sfx('charge');await z(820);return el};
  // cut-in de firma de las habilidades únicas: retrato enorme, banda del color de la habilidad y su nombre
  const sig=async(a,k,name)=>{const c=cur[a];if(!c)return;sfx('sig');
    tmp(`<div class="ab-sig${a?' r':''}" style="--c:${SIGC[k]||`var(--p${a+1})`};--pc:var(--p${a+1})"><i class="sg-bg"></i><span class="sg-pic" style="--h:${c.h}">${spr(c)}</span><span class="sg-t"><small>★ ${abT('unique')} · ${dnh(c)}</small><b>${name||trT(k,0)}</b></span></div>`,1500);
    await z(1300)};
  const beam=(a,big,col)=>{const A=ctr(a),D=ctr(1-a),l=Math.min(A.x,D.x),w=Math.abs(D.x-A.x),k=cur[a]&&ELN[cur[a].n],e=ELC[k];
    tmp(`<i class="ab-beam${k&&!col?' el-'+k:''}" style="left:${l}px;width:${w}px;top:${(A.y+D.y)/2}px;--c:${col||(e?e[0]:`var(--p${a+1})`)};${e&&!col?`--core:${e[1]};`:''}--o:${a?'right':'left'};--bh:${big?42:28}px"></i>`,700);sfx('beam')};
  const drop=(p,kind,miss)=>{const c=ctr(p,.5);return tmp(`<i class="ab-drop ${kind}" style="left:${c.x+(miss?(p?-1:1)*80:0)}px;top:${c.y}px"></i>`,1150)};
  const ghost=(a,d)=>{const A=ctr(a,.5),D=ctr(d,.5),c=cur[a];tmp(`<span class="ab-ghost" style="left:${A.x}px;top:${A.y}px;--dx:${D.x-A.x}px;--h:${c.h};--c:var(--p${a+1})">${spr(c)}</span>`,650);sfx('whiff')};
  const slashes=(p,col,n=4)=>{let h='';for(let i=0;i<n;i++)h+=`<i style="--a:${rnd(-70,70)}deg;--dl:${i*70}ms;--y:${rnd(-40,40)}px"></i>`;at(p,.45,'ab-slash',h,900,`--c:${col||'#fff'}`)};
  const shades=(a,n)=>{for(let i=0;i<n;i++)at(a,.98,'ab-shade','',1500,`--dx:${(i-(n-1)/2)*44}px;--dl:${i*90}ms`)};
  const shadeHit=(a,d)=>{const A=ctr(a,.5),D=ctr(d,.5);tmp(`<span class="ab-shade go" style="left:${A.x}px;top:${A.y}px;--tx:${D.x-A.x}px"></span>`,600)};
  const chain=(a,d)=>{const A=ctr(a,.45),D=ctr(d,.45);tmp(`<i class="ab-chain" style="left:${Math.min(A.x,D.x)}px;width:${Math.abs(D.x-A.x)}px;top:${A.y}px;--o:${a?'right':'left'}"></i>`,1500)};
  const book=(from,to)=>{const A=ctr(from,.3),D=ctr(to,.3);tmp(`<span class="ab-book" style="left:${A.x}px;top:${A.y}px;--dx:${D.x-A.x}px">📖</span>`,1000)};
  const note=d=>{const n=dn(cur[d]);tmp(`<div class="ab-dnote"><small>DEATH NOTE</small><b style="--n:${n.length}">${n}</b><em>${trT('dnote',4)}</em></div>`,2300)};
  const ecg=()=>tmp('<div class="ab-ecg"><svg viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,50 70,50 82,22 96,84 108,50 170,50 182,26 195,80 206,50 400,50"/></svg><b>♥</b></div>',1900);
  const slot=()=>tmp(`<div class="ab-slot">${[0,1,2].map(i=>`<span style="--i:${i}"><i><b>💎</b><b>🍒</b><b>⭐</b><b>🔔</b><b>7</b></i></span>`).join('')}</div>`,1500);
  const crack=()=>tmp('<svg class="ab-crack" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path d="M50 30L38 18L30 20L18 6M50 30L64 14L72 16L84 2M50 30L40 44L26 46L12 58M50 30L62 44L76 42L92 58M50 30L20 32L4 28M50 30L80 30L98 34"/></svg>',1300);
  // golpe final: viñeta y bandas de cine centradas en el que cae
  const finisher=async t=>{const c=ctr(t,.5);tmp(`<div class="ab-fin" style="--fx:${c.x}px"></div>`,1600);ST.classList.add('fin');sfx('charge');await z(560)};
  let combo={a:-1,n:0},first=false,behind=[0,0];
  const comboHit=a=>{if(combo.a===a)combo.n++;else combo={a,n:1};if(combo.n>=3){const c=ctr(a,.02);tmp(`<b class="ab-combo" style="left:${c.x}px;top:${c.y}px;--c:var(--p${a+1})">${abF(comT('combo'),{0:combo.n})}</b>`,900)}};
  const scene=h=>{ST.classList.toggle('dz0',!!(h.dz&&h.dz[0]));ST.classList.toggle('dz1',!!(h.dz&&h.dz[1]));if(!(h.dz&&(h.dz[0]||h.dz[1])))stg('shr',false);
    if(!h.ts&&h.k!=='tr')stg('tstop',false);if(h.u!=='rumbling'&&h.tr!=='rumbling')stg('rmb',false);if(h.u!=='mugetsu'&&h.tr!=='mugetsu')stg('mug',false)};
  const pops=()=>(TR_T[lang]||TR_T.en).pops;
  // golpes definitivos de las habilidades únicas (no se esquivan)
  const ultHit=async(h,a,d,lethal,upd)=>{
    const dmgFx=(big=true)=>{hurt(d);burst(d,big,SIGC[h.u]);num(d,pct(h.dmg),'crit');shake();zoom(d);imp();upd()};
    say(`<b>${dnh(cur[a])}</b>: «${(AB_T[lang]||AB_T.es).ult[h.u]||''}»`);
    if(lethal)await finisher(d);
    if(h.u==='hakai'){at(d,.45,'ab-orb','',1300);sfx('time');await z(750);dmgFx();if(lethal)mark(d,'gone');flash('#a43cff');sfx('boom');await z(900)}
    else if(h.u==='rumbling'){drop(d,'stomp');await z(520);dmgFx();sfx('quake');await z(520)}
    else if(h.u==='mugetsu'){tmp('<i class="ab-mug"></i>',1300);sfx('beam');await z(520);dmgFx();flash('#000');sfx('boom');await z(1000)}
    else{lunge(a);beam(a,true,SIGC[h.u]);await z(260);dmgFx();flash(SIGC[h.u]);sfx('boom');await z(950)} // Night Guy
  };
  const trait=async(h,a,d,An,Dn,upd)=>{ // animación de cada rasgo (a = dueño del rasgo, salvo 'stun' y 'self' = quien lo sufre)
    const k=h.tr,nm=trT(k,0),by=h.by==null?d:h.by,col=SIGC[k]||`var(--p${a+1})`;
    const sName=h.s?(TR_T.en[h.s]?trT(h.s,0):C(h.s)?dnh(C(h.s)):h.s):'';
    const L=i=>abF(trT(k,i),{a:An,d:Dn,b:dnh(cur[by]),m:h.m!=null?mvOf(cur[by],h.m):'',s:sName});
    const dmgOn=(p,big)=>{if(h.dmg>0){hurt(p);burst(p,big,col);num(p,pct(h.dmg),big?'crit':'')}};
    const line=L(2);if(line&&!['erase','haki','chain','rock'].includes(k))say(line);
    switch(k){
      // ---- compartidos ----
      case 'inf':lunge(by);await z(170);shield(a);num(a,'∞','txt');sfx('whiff');pop(nm,'',col);await z(650);break;
      case 'time':stg('tstop');pop(nm,'',col);sfx('time');await z(950);break;
      case 'req':shield(a);flash('#ffd23f');pop(nm,'','#ffd23f');sfx('awake');num(a,'0','txt');await z(1100);break;
      case 'serious':await sig(a,k);break;
      case 'toll':pop(nm,'',`var(--p${a+1})`);flash('#fff');hurt(d);if(h.dmg)num(d,pct(h.dmg));sfx('boom');upd();await z(1000);break;
      case 'domain':await cutin(a,cur[a],nm);stg('dz'+a);sfx('domain');await z(400);break;
      case 'regen':num(a,'+'+Math.round((h.heal||0)*100)+'%','heal');sfx('awake');upd();await z(650);break;
      case 'adapt':shield(a);num(a,pops().adapt+(h.lv>1?' ×'+h.lv:''),'txt');sfx('hum');await z(600);break;
      case 'gen':flash('#c4001a');stg('gen');pop(nm,'','#ff3b3b');sfx('charge');await z(1000);stg('gen',false);break;
      case 'stun':num(a,pops().stun,'txt');sfx('whiff');await z(650);break;
      case 'rage':mark(a,'rg');pop(nm,'','#ff3b3b');sfx('awake');shake();await z(900);break;
      case 'sun':await sig(a,k);flash('#ffd23f');break;
      case 'touch':await sig(a,k);stg('god');sfx('awake');await z(1100);stg('god',false);break;
      // ---- únicas ----
      case 'ego':mark(a,'ego');$('abf'+a).style.setProperty('--lv',h.lv||1);if((h.lv||1)===1)await sig(a,k);else{num(a,'EGO ×'+h.lv,'txt');sfx('hum');await z(450)}break;
      case 'hakai':await sig(a,k);break;
      case 'erase':if(h.no){say(L(3));pop('…','',col);sfx('whiff');await z(1000);break}
        say(line);await sig(a,k);flash('#fff');mark(d,'gone');num(d,abT('erased'),'txt');sfx('boom');upd();await z(1200);break;
      case 'rewind':tmp('<i class="ab-rew"></i>',1400);stg('rwd');sfx('time');num(a,'↺','txt');await z(1200);stg('rwd',false);break;
      case 'copy':pop(nm,'',col);sfx('charge');await z(700);break;
      case 'clones':await sig(a,k);mark(a,'cln');break;
      case 'amaterasu':mark(d,'burn');pop(nm,'',col);flash('#2a0838');sfx('boom');await z(850);break;
      case 'burn':hurt(d);num(d,pct(h.dmg));sfx('hum');upd();await z(450);break;
      case 'meteor':await sig(a,k);break;
      case 'rock':if(h.miss){say(L(3));drop(d,'meteor',true);await z(520);dodge(d);num(d,abT('dodgePop'),'txt');sfx('boom');shake();await z(500);break}
        say(line);drop(d,'meteor');await z(540);dmgOn(d,true);shake();imp();sfx('boom');upd();await z(520);break;
      case 'tsukuyomi':await sig(a,k);stg('tsk');flash('#c4001a');sfx('charge');if(h.dmg){hurt(d);num(d,pct(h.dmg))}upd();await z(1300);stg('tsk',false);break;
      case 'kamui':lunge(by);await z(170);at(a,.45,'ab-vtx','',1100);sfx('time');pop(nm,'',col);upd();await z(950);break;
      case 'gates':mark(a,'gt');upd();await sig(a,k);break;
      case 'gear5':await sig(a,k);mark(a,'g5');if(h.heal)num(a,'+'+Math.round(h.heal*100)+'%','heal');sfx('awake');upd();await z(500);break;
      case 'quake':crack();shake();setTimeout(shake,260);sfx('quake');num(d,pops().stun,'txt');await z(900);break;
      case 'haki':say(line);at(a,.5,'ab-ring','',1100);stg('hki');shake();sfx('haki');await z(750);
        if(h.ko){say(L(3));hurt(d);num(d,pct(h.dmg),'crit');imp();upd()}else num(d,pops().stun,'txt');await z(850);stg('hki',false);break;
      case 'mugetsu':stg('mug');await sig(a,k);break;
      case 'kyoka':await sig(a,k);break;
      case 'mirage':lunge(by);await z(170);mark(a,'mir');num(a,abT('illusion'),'txt');sfx('whiff');await z(650);mark(a,'mir',false);break;
      case 'shrine':await sig(a,k);stg('shr');stg('dz'+a);sfx('domain');await z(300);break;
      case 'slash':slashes(d,col);hurt(d);num(d,pct(h.dmg));sfx('slash');upd();await z(500);break;
      case 'jackpot':slot();sfx('slot');await z(1350);mark(a,'jp');num(a,'+'+Math.round((h.heal||0)*100)+'%','heal');flash('#ffd23f');sfx('awake');upd();await z(500);break;
      case 'jpheal':lunge(by);await z(170);hurt(a);num(a,pops().regen,'heal');sfx('hit');await z(450);break;
      case 'rumbling':await sig(a,k);stg('rmb');break;
      case 'ackerman':pop(nm,'',col);sfx('charge');await z(800);break;
      case 'adult':await sig(a,k);mark(a,'adult');sfx('awake');break;
      case 'spent':mark(a,'adult',false);mark(a,'spent');sfx('whiff');await z(800);break;
      case 'rose':at(d,.5,'ab-rose','',1700);flash('#fff');imp();shake();sfx('nuke');await z(700);dmgOn(d,true);shake();upd();await z(1000);break;
      case 'steal':book(d,a);sfx('charge');await z(700);badge(a,h.s);badge(d,'',true);pop(trT(h.s,0),'',col);sfx('awake');await z(800);break;
      case 'anti':slashes(d,'#0b0b0b',3);mark(a,'anti');badge(d,'',true);sfx('slash');pop(nm,'',col);await z(950);break;
      case 'chain':if(h.ko){say(line);chain(a,d);sfx('chain');await z(750);hurt(d);imp();shake();num(d,pct(h.dmg),'crit');upd();await z(950)}
        else{say(L(3));await sig(a,k,'Emperor Time');mark(a,'emp')}break;
      case 'hinokami':await sig(a,k);mark(a,'hk');break;
      case 'zawarudo':await sig(a,k);stg('tstop');sfx('time');await z(450);break;
      case 'roller':pop('ROAD ROLLER','',col);await z(450);break;
      case 'heaven':await sig(a,k);stg('mih');break;
      case 'counter':shield(a);sfx('charge');pop(nm,'',col);await z(750);break;
      case 'arise':await sig(a,k);shades(a,h.n||2);sfx('hum');await z(700);break;
      case 'shadow':shadeHit(a,d);await z(260);dmgOn(d,false);sfx('hit');upd();await z(380);break;
      case 'geass':await sig(a,k);mark(d,'gs');break;
      case 'self':mark(a,'gs',false);fa(a,'hit');burst(a,false,'#ff2a55');num(a,pct(h.dmg));sfx('hit');upd();await z(700);break;
      case 'eclipse':stg('ecl');await sig(a,k);flash('#ff1f1f');num(a,'+60%','heal');sfx('awake');upd();await z(700);break;
      case 'dnote':note(d);sfx('write');await z(2100);mark(d,'dn');break;
      case 'heart':stg('dark');ecg();sfx('heart');await z(1750);mark(d,'dn',false);hurt(d);num(d,'♥','crit');flash('#ff2a3a');upd();await z(800);stg('dark',false);break;
      default:await z(300);
    }
    upd();
  };
  for(const e of S0.ev){
    if(e.t==='start')await say(t('fightStart'),900);
    else if(e.t==='send'){
      const c=C(e.n),p=e.p,f=$('abf'+p),card=$('abc'+p);act[p]=e.k;cur[p]=c;hpN[p]=e.f==null?1:e.f;
      $('abn'+p).innerHTML=dnh(c);$('abtr'+p).innerHTML=trBadge(c);card.dataset.n=c.n;card.style.setProperty('--h',c.h);card.innerHTML=spr(c);
      const fc=$('abfc'+p);fc.className='ab-face';fc.dataset.n=c.n;fc.style.setProperty('--h',c.h);fc.innerHTML=spr(c);
      f.className='ab-f a'+p;f.style.setProperty('--lv','');re(f,'in');setB(p,hpN[p],e.e==null?1:e.e);$('abs'+p).innerHTML=stT(c,e.st);roster(p);
      if(team[p].length>1&&e.k===team[p].length-1)com(abF(comT('last'),{a:dnh(c),p:t('player',p+1)}));
      await say(t('sends',p+1,dnh(c)),1150);
    }else if(e.t==='duel'){
      const A=C(e.a),B=C(e.b);$('abdn').textContent=++dno;
      STAGE_FX.forEach(c=>stg(c,false));[0,1].forEach(p=>{mark(p,'win',false);if(cur[p])$('abtr'+p).innerHTML=trBadge(cur[p])});
      tmp(`<div class="ab-vs"><div class="vs-s l"><b>${dnh(A)}</b></div><b class="vs-x">${t('vs')}</b><div class="vs-s r"><b>${dnh(B)}</b></div><small class="vs-n">${abT('duel')} ${dno}</small></div>`,1700);
      sfx('charge');
      const gp=A.pw-B.pw;if(Math.abs(gp)>=250){const s=gp>0?[A,B]:[B,A];com(abF(comT('gap')[dno%2],{a:dnh(s[0]),b:dnh(s[1])}))}else if(Math.abs(gp)<=40)com(comT('even'));
      combo={a:-1,n:0};behind=[0,0];
      await say(`<b>${dnh(A)}</b> ${t('vs')} <b>${dnh(B)}</b>`,1650);
      for(const h of e.hits){
        const a=h.a,d=1-a,An=dnh(cur[a]),Dn=dnh(cur[d]),prev=[...hpN],v=h.v||0;
        const upd=()=>{hpN=[h.hp[0],h.hp[1]];setB(0,h.hp[0],h.en&&h.en[0]);setB(1,h.hp[1],h.en&&h.en[1])};
        const dm=p=>h.dmg!=null?h.dmg:Math.max(0,prev[p]-h.hp[p]);
        const tg=h.k==='clash'?1-(h.w==null?a:h.w):d,lethal=['hit','crit','ctr','sp','spc','clash'].includes(h.k)&&h.hp[tg]<=0&&prev[tg]>0;
        if(h.dmg>0&&!first&&h.k!=='tr'&&h.k!=='clash'){first=true;com(comT('first'))}
        if(h.k==='hit'||h.k==='crit'||h.k==='ctr'){
          say(h.k==='ctr'?abF(abT(h.ui?'uctr':'ctr'),{a:An,d:Dn}):h.cl?abF(abT('clone'),{a:An,d:Dn}):h.rr?abF(abT('roller'),{a:An,d:Dn}):abF(abT(h.k==='crit'?'crit':'hit',v),{a:An,d:Dn}));
          if(lethal)await finisher(d);
          if(h.rr){drop(d,'roller');await z(560)}else if(h.cl){ghost(a,d);await z(220)}else{lunge(a);await z(h.ts?110:170)}
          const big=h.crit||lethal||h.bf||h.rr;
          hurt(d);burst(d,big,h.bf?'#ff1f3d':h.as?'#7dff8a':null);num(d,pct(dm(d)),big?'crit':'');sfx(big?'crit':'hit');
          if(h.bf){at(d,.45,'ab-bfl','<b>黒閃</b>',950);pop(abT('bfPop'),'','#ff1f3d');imp()}
          else if(h.as){slashes(d,'#7dff8a',3);pop(abT('asPop'),'','#7dff8a')}
          else if(h.ui)pop(abT('uiPop'),'','#dfe7ff');
          if(big){shake();zoom(d);if(!lethal&&!h.bf&&!h.as&&!h.ui&&!h.rr)pop(abT('critPop'))}if(lethal){flash();imp()}
          comboHit(a);upd();await z(lethal?950:h.ts?380:big?720:520);
        }else if(h.k==='sp'||h.k==='spc'){
          if(h.u)await ultHit(h,a,d,lethal,upd);
          else{
            const m=h.cp!=null?mvOf(cur[d],h.cp):h.fc!=null?mvOf(cur[d],h.fc):mvOf(cur[a],v);
            say(h.cp!=null?abF(abT('copied'),{a:An,m}):h.fc!=null?abF(abT('fc'),{a:An,d:Dn,m}):abF(abT(h.k),{a:An,m}));if(h.en)setB(a,null,h.en[a]);
            if(h.fc==null)await cutin(a,cur[a],m);if(lethal)await finisher(d);
            lunge(a);beam(a,h.k==='spc'||lethal,h.cp!=null?elC(d):h.fc!=null?SIGC.counter:null);await z(240);
            hurt(d);burst(d,true,elC(a));shake();zoom(d);flash(elC(a));num(d,pct(dm(d)),'crit');if(h.k==='spc'&&!lethal)pop(abT('critPop'));if(h.k==='spc'||lethal)imp();
            sfx('boom');comboHit(a);upd();await z(lethal?1050:760);
          }
        }else if(h.k==='miss'){
          combo={a:-1,n:0};
          say(h.sp?abF(abT('missSp'),{a:An,d:Dn,m:mvOf(cur[a],v)}):abF(abT('miss',v),{a:An,d:Dn}));
          lunge(a);await z(150);dodge(d);num(d,abT('dodgePop'),'txt');sfx('whiff');upd();await z(470);
        }else if(h.k==='clash'){
          const w=h.w==null?a:h.w,l=1-w,m1=mvOf(cur[a],v),m2=mvOf(cur[d],h.vw||0);combo={a:-1,n:0};
          say(abF(abT('clash'),{m1,m2}));if(h.en){setB(0,null,h.en[0]);setB(1,null,h.en[1])}
          const c0=ctr(0),c1=ctr(1),cl=tmp(`<div class="ab-clash" style="left:${c0.x}px;width:${c1.x-c0.x}px;top:${(c0.y+c1.y)/2}px;--x:.5"><i class="l"></i><i class="r"></i><b></b></div>`,4000);
          pop(abT('clashPop'),'',`var(--p${a+1})`);sfx('beam');shake();await z(600);
          for(const x of (h.fr||[.45,.55,l?1:0])){cl.style.setProperty('--x',x);if(x===0||x===1)break;sfx('hum');await z(330)}
          if(lethal)await finisher(l);
          await z(260);cl.remove();hurt(l);burst(l,true,elC(w));shake();zoom(l);imp();flash(elC(w));if(h.dmg>0)num(l,pct(dm(l)),'crit');sfx('boom');upd();
          await say(abF(abT('clashWin'),{w:dnh(cur[w])}),lethal?1100:900);
        }else if(h.k==='awake'){
          say(abF(abT('awake'),{a:An}));mark(a,'aw');flash(`var(--p${a+1})`);pop(abT('awakePop'),'',`var(--p${a+1})`);sfx('awake');
          if(h.hp[a]>prev[a])num(a,'+'+Math.round((h.hp[a]-prev[a])*100)+'%','heal');upd();await z(1250);
        }else if(h.k==='tr')await trait(h,a,d,An,Dn,upd);
        else{upd();await z(300)}
        scene(h);if(lethal)stg('fin',false);
        behind=[0,1].map(p=>Math.max(behind[p],h.hp[1-p]-h.hp[p]));
      }
    }else if(e.t==='sac'){
      ko[e.p][e.k]=true;roster(e.p);const s=C(e.n);
      $('ablog').insertAdjacentHTML('beforeend',`<div><i>${dno}.</i>${abF(abT('sacLog'),{0:dnh(s)})}</div>`);
      await say(abF(abT('sac'),{0:dnh(s)}),1000);
    }else if(e.t==='down'){
      ko[e.p][e.k]=true;lastL=C(e.n);lastDown=dn(lastL);pop('K.O.','ko');sfx('ko');shake();STAGE_FX.filter(c=>c!=='ecl').forEach(c=>stg(c,false));
      await say(t('down',dnh(lastL)),250);$('abf'+e.p).classList.add('ko');$('abfc'+e.p).classList.add('ko');roster(e.p);await z(1300);
      $('abc'+e.p).innerHTML='';delete $('abc'+e.p).dataset.n;
    }else if(e.t==='dko'){
      pop(abT('dko'),'ko');sfx('ko');shake();
      $('ablog').insertAdjacentHTML('beforeend',`<div><i>${dno}.</i>${abF(abT('dkoLog'),{0:dnh(C(e.a)),1:dnh(C(e.b))})}</div>`);
      await say(abF(abT('dkoLog'),{0:dnh(C(e.a)),1:dnh(C(e.b))}),1500);
    }else if(e.t==='stands'){
      [0,1].forEach(p=>$('abf'+p).classList.remove('aw','rg'));if(e.e!=null)setB(e.p,null,e.e);mark(e.p,'win');
      const W=C(e.n);let cm='';
      if(e.pct>=100)cm='flawless';else if(lastL&&lastL.pw-W.pw>=120)cm='upset';else if(behind[e.p]>=.35)cm='comeback';else if(e.pct<=10)cm='close';
      if(cm)com(abF(comT(cm),{a:dnh(W)}));
      $('ablog').insertAdjacentHTML('beforeend',`<div><i>${$('abdn').textContent}.</i>${abF(abT('log'),{0:dnh(W),1:dnh(lastL),2:e.pct})}</div>`);
      await say(t('stands',dnh(W),e.pct),1300);
    }else if(e.t==='end'){
      await say(e.w<0?t('tie'):t('wins',e.w+1),200);
      const sv=(e.sv||[]).map(s=>{const c=C(s.n);return `<span class="ab-svc"><i class="ab-th" data-n="${s.n}" style="--h:${c.h}">${spr(c)}</i><b>${dnh(c)}</b><small>${Math.max(1,Math.round(s.f*100))}%</small></span>`}).join('');
      const mv=e.mvp&&C(e.mvp.n)?`<div class="ab-mvp" style="--c:var(--p${e.mvp.p+1})"><em>${abT('mvp')}</em><i class="ab-th" data-n="${e.mvp.n}" style="--h:${C(e.mvp.n).h}">${spr(C(e.mvp.n))}</i><span><b>${dnh(C(e.mvp.n))}</b><small>${t('player',e.mvp.p+1)} · ${e.mvp.ko===1?abT('kos1'):abF(abT('kos'),{0:e.mvp.ko})}</small></span></div>`:'';
      E.insertAdjacentHTML('beforeend',`<div class="res ab-res"${e.w>=0?` style="--c:var(--p${e.w+1})"`:''}><h2>${e.w<0?t('tie'):t('winsH',e.w+1)}</h2><p class="ab-note"></p><div class="ab-sv">${sv||`<small>${t('nobody')}</small>`}</div>${mv}<button onclick="again()">${t('again')}</button></div>`);
      E.querySelector('.ab-res').scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  }
}

/* ---------- NOCHE DE COMBATES (UFC): el motor devuelve los combates ya resueltos con la coreografía golpe a golpe ---------- */
let FAST=0;
async function night(tk,script){
  FAST=0;
  const z=async ms=>{await sleep(FAST?Math.min(ms,50):ms);if(tk!==bt)throw 0};
  const F=script||BidEngine.resolveUfc(G),bs=F.bouts;
  wantImg(bs.flatMap(b=>[C(b.a),C(b.b)]),true);
  const E=await arenaIn(z,`<div class="arena fn"><h2 class="fnh">${u('fnTitle')}</h2><div class="fsc" id="fsc"></div><div id="fst"></div><div class="dlg" id="dlg"></div><div class="flg" id="flg"></div></div>`);
  const sc=[0,0],say=async(h,ms=1000)=>{$('dlg').innerHTML=h;await z(ms)};
  const board=()=>$('fsc').innerHTML=`<span>${u('player',1)} <b>${sc[0]}</b></span><i>–</i><span><b>${sc[1]}</b> ${u('player',2)}</span>`;
  const card=(c,p)=>`<div class="fc" data-n="${c.n}" style="--c:var(--p${p+1})"><div class="sp" style="--h:${c.h}">${spr(c)}</div><b>${dnh(c)}</b><div class="fhp"><i id="fh${p}"></i></div><small>${u('player',p+1)}</small></div>`;
  const hp=(p,f)=>{const e=$('fh'+p);e.style.width=Math.max(f,0)*100+'%';e.className=f>.5?'':f>.2?'mid':'low'};
  const hx=(p,c)=>{const s=document.querySelectorAll('#fst .fc .sp')[p];s.classList.remove('atk','hit');void s.offsetWidth;s.classList.add(c)};
  board();
  for(const b of bs){
    const A=C(b.a),B=C(b.b),wp=b.w,lp=1-wp,W=wp?B:A,L=wp?A:B;
    $('fst').innerHTML=`<div class="fbt">${u('fnBout',b.k+1,bs.length)} · ${u('div_'+b.cls)}</div><div class="fvs">${card(A,0)}<span class="vs">${u('vs')}</span>${card(B,1)}</div>`;
    await say(u('fnIntro',`<b>${dnh(A)}</b>`,`<b>${dnh(B)}</b>`),b.k?750:1100);
    await say(u('fnBell'),450);
    for(const rd of b.rounds){
      await say(u('fnRound',rd.r,rd.time),300);
      for(const ex of rd.ex){
        for(let q=0;q<ex.length;q++){const bx=ex[q];if(q>0)await z(140);hx(bx.a,'atk');await z(120);hx(1-bx.a,'hit');hp(0,bx.hp[0]);hp(1,bx.hp[1])}
        await z(200);
      }
    }
    hp(0,b.hpEnd[0]);hp(1,b.hpEnd[1]);
    const txt=u(b.key,dn(W),dn(L),b.sc);
    sc[wp]++;board();
    const cs=document.querySelectorAll('#fst .fc');cs[wp].classList.add('win');cs[lp].classList.add('lose');
    await say(`<b>${txt}</b>`,1500);
    $('flg').insertAdjacentHTML('beforeend',`<div><i>${b.k+1}.</i> ${txt}</div>`);
  }
  const r=F.result,msg=r.w<0?u('fnDrawCard',r.sc[0],r.sc[1]):u('fnWinsCard',r.w+1,r.sc[r.w],r.sc[1-r.w])+(r.tb?' · '+u('fnTieBreak'):'');
  $('dlg').innerHTML=r.w<0?u('tie'):u('wins',r.w+1);
  document.querySelector('.fskip')?.remove();
  E.insertAdjacentHTML('beforeend',`<div class="res"><h2>${r.w<0?u('tie'):u('winsH',r.w+1)}</h2><p>${msg}</p><button onclick="again()">${u('again')}</button></div>`);
}

/* ---------- PARTIDO DE FÚTBOL: el motor devuelve el partido ya jugado (guion minuto a minuto); aquí se anima sobre un campo ----------
   Campo visto desde arriba, 22 fichas en 4-3-3 (Jugador 1 ataca hacia la derecha), balón que viaja por la jugada, marcador con reloj,
   goles con celebración, paradas, palos, VAR, tarjetas, descanso, tanda de penaltis y estadísticas finales. Velocidad x1 / x2 / saltar. */
const FM_T={
 es:{half1:'1ª parte',half2:'2ª parte',ht:'Descanso',ft:'Final',pens:'Penaltis',kick:'¡Empieza el partido!',kick2:'¡Arranca la segunda parte!',
  lineups:'Saltan al campo los dos onces',goal:'¡GOOOL!',assist:'Asist.',save:['¡Paradón de <b>{g}</b>!','<b>{g}</b> atrapa el disparo de {s}','Mano salvadora de <b>{g}</b>'],
  wide:['El disparo de <b>{s}</b> se va fuera','<b>{s}</b> la manda a las nubes','¡Rozando el palo! Remate de <b>{s}</b>'],post:'¡AL PALO! <b>{s}</b> lo tuvo',
  block:'<b>{b}</b> tapa el disparo de {s}',pen:'¡PENALTI a favor del {p}!',penGoal:'<b>{s}</b> no falla desde los once metros',
  penSave:'¡<b>{g}</b> para el penalti!',penWide:'<b>{s}</b> manda el penalti fuera',shoot:['Remata <b>{s}</b>…','¡<b>{s}</b> se planta solo!','Disparo de <b>{s}</b>…'],
  build:['Juega {a}…','{a} conduce…','{a} abre a banda…'],var:'Revisión del VAR…',varNo:'GOL ANULADO por fuera de juego',yc:'Tarjeta amarilla para <b>{n}</b>',
  shootout:'Tanda de penaltis',stats:['Posesión','Tiros','A puerta','Goles esperados (xG)','Amarillas'],motm:'Jugador del partido',saveP:'¡PARADA!',postP:'¡AL PALO!',
  ovr:'MED',lines:['POR','DEF','MED','DEL'],pen1:'penalti',penPop:'¡PENALTI!'},
 en:{half1:'1st half',half2:'2nd half',ht:'Half-time',ft:'Full time',pens:'Penalties',kick:'Kick-off!',kick2:'Second half under way!',
  lineups:'Both XIs walk out',goal:'GOOOAL!',assist:'Ast.',save:['Great save by <b>{g}</b>!','<b>{g}</b> holds {s}’s shot','<b>{g}</b> to the rescue'],
  wide:['<b>{s}</b> drags it wide','<b>{s}</b> blazes it over','Just past the post from <b>{s}</b>!'],post:'OFF THE POST! So close for <b>{s}</b>',
  block:'<b>{b}</b> blocks {s}’s shot',pen:'PENALTY to {p}!',penGoal:'<b>{s}</b> buries the penalty',
  penSave:'<b>{g}</b> saves the penalty!',penWide:'<b>{s}</b> misses the penalty',shoot:['<b>{s}</b> shoots…','<b>{s}</b> is through on goal!','<b>{s}</b> lets fly…'],
  build:['{a} on the ball…','{a} drives forward…','{a} spreads it wide…'],var:'VAR check…',varNo:'GOAL DISALLOWED for offside',yc:'Yellow card for <b>{n}</b>',
  shootout:'Penalty shootout',stats:['Possession','Shots','On target','Expected goals (xG)','Yellow cards'],motm:'Player of the match',saveP:'SAVE!',postP:'POST!',
  ovr:'OVR',lines:['GK','DEF','MID','FWD'],pen1:'penalty',penPop:'PENALTY!'}};
const fmT=(k,i)=>{let s=(FM_T[lang]||FM_T.es)[k];if(Array.isArray(s))s=s[(i||0)%s.length];return String(s??k)};
const ROLE_EN={POR:'GK',DFC:'CB',LI:'LB',LD:'RB',MCD:'CDM',MC:'CM',MCO:'CAM',EI:'LW',ED:'RW',DC:'ST'};
const roleT=r=>lang==='en'?(ROLE_EN[r]||r):r;
const PART=new Set(['van','de','di','da','dos','du','der','den','Van','De','Di','Da','Mac','Le','La','del']);
const shortN=n=>{if(!n)return'';const c=C(n),w=(c?dn(c):n).split(' ');if(w.length<2)return w[0];if(/^(Júnior|Junior|Jr\.?)$/.test(w[w.length-1]))return w[w.length-2];let k=w.length-1;while(k>0&&PART.has(w[k-1]))k--;return w.slice(k).join(' ')};
const FM_NUM=[1,3,4,5,2,8,6,10,11,9,7];
const FM_BASE=[[5,50],[23,15],[19,37],[19,63],[23,85],[37,27],[32,50],[37,73],[47,17],[48,50],[47,83]];
let FMS=1;try{FMS=+localStorage.getItem('bvfms')===2?2:1}catch(e){}
async function match(tk,script){
  const S0=script||BidEngine.resolveFutbol(G),ev=S0.ev,L=ev.find(e=>e.t==='lineups')||{L:[[],[]],T:[{},{}]};
  const z=async ms=>{await sleep(ms/FMS);if(tk!==bt)throw 0};
  const team=p=>L.L[p].map(n=>C(n)||null);
  const XI=[team(0),team(1)];
  const tok=(p,i)=>{const c=XI[p][i];return `<div class="fm-pl a${p}${i===0?' gk':''}" id="fp${p}_${i}" style="--c:var(--p${p+1})"><i class="fm-dot"${c?` data-n="${c.n}"`:''}>${c&&imgOf(c.n)?`<img src="${imgOf(c.n)}" alt="">`:`<b>${FM_NUM[i]}</b>`}</i><span>${c?shortN(c.n):'—'}</span></div>`};
  const lineTxt=p=>{const T=L.T[p]||{};return (FM_T[lang]||FM_T.es).lines.map((l,i)=>`${l} ${[T.G,T.D,T.M,T.A][i]??'—'}`).join(' · ')};
  const html=`<div class="fm" id="fm">
<div class="fm-sb"><div class="fm-t a0" style="--c:var(--p1)"><i class="fm-sw"></i><div><b>${t('player',1)}</b><small>${lineTxt(0)}</small></div></div>
<div class="fm-c"><div class="fm-sc"><b id="fms0">0</b><i>–</i><b id="fms1">0</b></div><div class="fm-clk"><span id="fmclk">0'</span><small id="fmhalf">${fmT('half1')}</small></div></div>
<div class="fm-t a1" style="--c:var(--p2)"><div><b>${t('player',2)}</b><small>${lineTxt(1)}</small></div><i class="fm-sw"></i></div></div>
<div class="fm-pens" id="fmpens"></div>
<div class="fm-pitch" id="fmp"><svg class="fm-lines" viewBox="0 0 105 68" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="rgba(255,255,255,.75)" stroke-width=".35">
<rect x=".6" y=".6" width="103.8" height="66.8"/><line x1="52.5" y1=".6" x2="52.5" y2="67.4"/><circle cx="52.5" cy="34" r="9.15"/>
<rect x=".6" y="13.84" width="16.5" height="40.32"/><rect x=".6" y="24.84" width="5.5" height="18.32"/><rect x="87.9" y="13.84" width="16.5" height="40.32"/><rect x="98.9" y="24.84" width="5.5" height="18.32"/>
<path d="M17.1 26.7a9.15 9.15 0 0 1 0 14.6M87.9 26.7a9.15 9.15 0 0 0 0 14.6"/></g><g fill="rgba(255,255,255,.85)"><circle cx="52.5" cy="34" r=".5"/><circle cx="11" cy="34" r=".45"/><circle cx="94" cy="34" r=".45"/></g></svg>
<i class="fm-net l" id="fmn0"></i><i class="fm-net r" id="fmn1"></i>
${[0,1].map(p=>XI[p].map((c,i)=>tok(p,i)).join('')).join('')}
<i class="fm-ball" id="fmb"></i><div class="fm-fx" id="fmfx"></div></div>
<div class="fm-bot"><div class="ab-dlg" id="fmdl"></div><div class="ab-spd" id="fmspd"><button data-s="1">x1</button><button data-s="2">x2</button><button data-s="40" aria-label="»">»</button></div></div>
<div class="fm-log"><div class="a0" id="fml0"></div><div class="a1" id="fml1"></div></div></div>`;
  const E=await arenaIn(async ms=>{await sleep(ms);if(tk!==bt)throw 0},html);
  const FM=$('fm'),FX=$('fmfx'),B=$('fmb');
  const setSpd=s=>{FMS=s;FM.style.setProperty('--k',1/s);FM.classList.toggle('fast',s>2);$('fmspd').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.s===s));if(s<=2)try{localStorage.setItem('bvfms',s)}catch(e){}};
  setSpd(FMS);$('fmspd').onclick=e=>{const b=e.target.closest('button');if(b)setSpd(+b.dataset.s)};
  const say=h=>{$('fmdl').innerHTML='<span>'+h+'</span>'};
  const sfx=k=>{if(FMS<=2)SND.fx(k)};
  const nm=(p,i)=>{const c=XI[p][i];return c?dn(c):'—'};
  const P_=p=>t('player',p+1);
  const el=(p,i)=>$('fp'+p+'_'+i);
  const base=(p,i)=>{const [x,y]=FM_BASE[i];return p?[100-x,100-y]:[x,y]};
  const put=(e,x,y,ms)=>{e.style.transitionDuration=(ms==null?700:ms)/FMS+'ms';e.style.left=x+'%';e.style.top=y+'%'};
  const jit=()=>Math.random()*4-2;
  const layout=(att,ms)=>{ // att: equipo que ataca (-1 = neutro, -2 = saque de centro)
    const T=[[],[]];
    for(let p=0;p<2;p++)for(let i=0;i<11;i++){let [x,y]=base(p,i);const dir=p?-1:1;
      if(att===p)x+=dir*[4,13,13,13,13,17,15,17,26,30,26][i];
      else if(att>=0)x-=dir*[0,3,4,4,3,6,7,6,10,12,10][i];
      else if(att===-1)x+=dir*[2,6,6,6,6,p?4:9,p?3:8,p?4:9,p?9:13,p?11:15,p?9:13][i];
      else if(i>=8)x-=dir*(i===9&&p===0?1:5);
      if(att>=-1&&i)y+=jit();
      T[p][i]=[Math.max(2,Math.min(98,x)),Math.max(5,Math.min(95,y))]}
    for(let it=0;it<4;it++)for(let a=0;a<22;a++)for(let b=a+1;b<22;b++){ // separa las fichas que se pisan (en metros: 105 x 68)
      const A=T[a/11|0][a%11],Bp=T[b/11|0][b%11],dx=(Bp[0]-A[0])*1.05,dy=(Bp[1]-A[1])*.68,d=Math.hypot(dx,dy);
      if(d<5&&(a%11)&&(b%11)){const k=(5-d)/2/(d||1),ux=d?dx:0,uy=d?dy:1;A[0]-=ux*k/1.05;A[1]-=uy*k/.68;Bp[0]+=ux*k/1.05;Bp[1]+=uy*k/.68}}
    for(let p=0;p<2;p++)for(let i=0;i<11;i++){const [x,y]=T[p][i];put(el(p,i),Math.max(2,Math.min(98,x)),Math.max(4,Math.min(96,y)),ms)}};
  const at=(p,i)=>{const e=el(p,i);return [parseFloat(e.style.left),parseFloat(e.style.top)]};
  const hold=(p,i)=>{FM.querySelectorAll('.fm-pl.hb').forEach(e=>e.classList.remove('hb'));if(p!=null)el(p,i).classList.add('hb')};
  const ball=async(x,y,ms=320,arc)=>{B.classList.toggle('air',!!arc);put(B,x,y,ms);await z(ms)};
  const passTo=async(p,i,ms=330)=>{const [x,y]=at(p,i);sfx('kick');await ball(x+(p?-1.2:1.2),y,ms);hold(p,i)};
  const tmp=(h,ms,host=FX)=>{const w=document.createElement('div');w.innerHTML=h;const e=w.firstElementChild;host.appendChild(e);setTimeout(()=>e.remove(),ms/Math.min(FMS,2));return e};
  const pop=(txt,x,y,k='')=>tmp(`<b class="fm-pop ${k}" style="left:${x}%;top:${y}%">${txt}</b>`,1300);
  const net_=g=>{const n=$('fmn'+g);n.classList.remove('hit');void n.offsetWidth;n.classList.add('hit')};
  let clock=0,half=1;
  const setClk=m=>{$('fmclk').textContent=m+"'"};
  const advance=async to=>{const n=parseInt(to)||0;let side=Math.random()<.5?0:1;
    while(clock<n){clock++;setClk(clock);await z(95);
      if(clock%4===0){side=Math.random()<.7?side:1-side;const i=5+Math.floor(Math.random()*3);const [x,y]=at(side,i);hold(side,i);put(B,x+(side?-1.2:1.2),y,520)}}
    if(String(to).includes('+'))setClk(to)};
  const sc=[0,0],logs=[$('fml0'),$('fml1')];
  const log=(p,h)=>logs[p].insertAdjacentHTML('beforeend',`<div>${h}</div>`);
  const score=(s,pop_)=>{for(let p=0;p<2;p++){const b=$('fms'+p);if(+b.textContent!==s[p]){b.textContent=s[p];if(pop_){b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop')}}}};
  const goalX=(p,inNet)=>p?(inNet?-.5:1.2):(inNet?100.5:98.8);
  const GY=[45.6,50,54.4];
  const confetti=p=>{for(let k=0;k<44;k++){const x=40+Math.random()*20,dx=(Math.random()-.5)*90,dy=-30-Math.random()*60;
    tmp(`<i class="fm-cf" style="left:${x}%;top:55%;--dx:${dx}vw;--dy:${dy}vh;--r:${Math.random()*720-360}deg;--d:${.9+Math.random()*.9}s;background:${k%3?`var(--p${p+1})`:'#fff'}"></i>`,2200)}};
  const goalBanner=async(p,s,as,m,pen)=>{const c=XI[p][s];
    tmp(`<div class="fm-gb" style="--c:var(--p${p+1});--on:var(--on${p+1})"><b>${fmT('goal')}</b><div><i class="fm-gp">${c&&imgOf(c.n)?`<img src="${imgOf(c.n)}" alt="">`:`<em>${FM_NUM[s]}</em>`}</i><span><strong>${nm(p,s)}</strong><small>${m}'${pen?' · '+fmT('pen1'):''}${as>=0?' · '+fmT('assist')+' '+nm(p,as):''}</small></span></div></div>`,2600);
    confetti(p);sfx('goal');await z(2300)};
  const pensRow=()=>{const host=$('fmpens');host.classList.add('on');host.innerHTML=[0,1].map(p=>`<div class="a${p}" style="--c:var(--p${p+1})"><small>${P_(p)}</small><span id="fpr${p}"></span></div>`).join('')};
  const penMark=(p,ok)=>$('fpr'+p).insertAdjacentHTML('beforeend',`<i class="${ok?'ok':'ko'}">${ok?'●':'✕'}</i>`);
  // salida al campo
  for(let p=0;p<2;p++)for(let i=0;i<11;i++)put(el(p,i),50,104,0);
  put(B,50,50,0);B.style.opacity=0;
  for(const e of ev){
    if(e.t==='lineups'){say(fmT('lineups'));await z(120);
      for(let i=0;i<11;i++){for(let p=0;p<2;p++){const [x,y]=base(p,i);put(el(p,i),x,y,900)}await z(70)}
      await z(1200);
    }else if(e.t==='ko'){
      half=e.h;$('fmhalf').textContent=fmT(half===1?'half1':'half2');clock=half===1?0:45;setClk(clock);
      layout(-2,600);B.style.opacity=1;await ball(50,50,300);
      tmp(`<div class="fm-ov"><b>${fmT(half===1?'kick':'kick2')}</b></div>`,1400);say(fmT(half===1?'kick':'kick2'));sfx('whistle');
      await z(1200);await passTo(half===1?0:1,6,420);
    }else if(e.t==='att'){
      await advance(e.m);
      const p=e.p,o=1-p,s=e.sh,gk=[...at(o,0)];
      if(e.pen){
        hold(null);pop(fmT('penPop'),p?18:82,30,'big');sfx('whistle');
        say(fmT('pen').replace('{p}',P_(p)));await z(900);
        const sx=p?10.5:89.5;layout(-1,500);for(let i=1;i<11;i++){const [x]=at(p,i);if(p?x<18:x>82)put(el(p,i),p?22:78,at(p,i)[1],500)}
        for(let i=1;i<11;i++){const [x]=at(o,i);if(p?x<18:x>82)put(el(o,i),p?22:78,at(o,i)[1],500)}
        put(el(p,s),p?sx+3:sx-3,50,600);put(el(o,0),goalX(p,false),50,600);await ball(sx,50,600);hold(p,s);await z(700);
        const ty=GY[e.d],gy=e.out==='save'?ty:GY[(e.d+1+Math.floor(Math.random()*2))%3];
        put(el(o,0),goalX(p,false),gy,380);el(o,0).classList.add('dive');sfx('kick');
        if(e.out==='goal'){await ball(goalX(p,true),ty,380,1);net_(p?0:1);score(e.sc,1);say(fmT('penGoal').replace('{s}',nm(p,s)));log(p,`⚽ ${e.m}' ${nm(p,s)} (p)`);await goalBanner(p,s,-1,e.m,1)}
        else if(e.out==='save'){await ball(goalX(p,false)+(p?2:-2),ty,380);pop(fmT('saveP'),p?8:92,ty-8);sfx('save');say(fmT('penSave').replace('{g}',nm(o,0)));await ball(goalX(p,false)+(p?7:-7),ty+(ty<50?-14:14),400)}
        else{await ball(goalX(p,true),ty<50?36:64,420,1);say(fmT('penWide').replace('{s}',nm(p,s)))}
        await z(900);el(o,0).classList.remove('dive');
        if(e.out==='goal'){layout(-2,600);await ball(50,50,400);await passTo(o,6,400)}else{layout(-1,700);await passTo(o,0,500)}
        continue;
      }
      layout(p,650);
      const ch=e.ch||[];
      for(let k=0;k<ch.length;k++){await passTo(p,ch[k],k?320:420);if(k===ch.length-1||Math.random()<.4)say(fmT('build',Math.floor(Math.random()*3)).replace('{a}',nm(p,ch[k])));await z(150)}
      // el rematador se mete en el área
      const [sx0,sy0]=at(p,s),sx=p?Math.min(sx0,26):Math.max(sx0,74),sy=Math.max(28,Math.min(72,sy0));put(el(p,s),sx,sy,420);
      if(e.out==='block'&&e.bl>=0)put(el(o,e.bl),sx+(p?-5:5),sy+(sy>50?-3:3),420);
      await z(380);await passTo(p,s,300);
      say(fmT('shoot',e.d).replace('{s}',nm(p,s)));await z(380);
      const ty=GY[e.d];sfx('kick');hold(null);
      if(e.out==='goal'||e.out==='var'){
        put(el(o,0),goalX(p,false),GY[(e.d+1)%3],360);el(o,0).classList.add('dive');
        await ball(goalX(p,true),ty,360,1);net_(p?0:1);
        const sc2=e.out==='var'?e.sc.map((v,i)=>i===p?v+1:v):e.sc;score(sc2,1);
        await goalBanner(p,s,e.as,e.m);
        if(e.out==='var'){tmp(`<div class="fm-ov var"><b>${fmT('var')}</b></div>`,1600);say(fmT('var'));await z(1500);score(e.sc);
          tmp(`<div class="fm-ov no"><b>${fmT('varNo')}</b></div>`,1700);say(fmT('varNo'));await z(1500)}
        else log(p,`⚽ ${e.m}' ${nm(p,s)}${e.as>=0?` <small>(${nm(p,e.as)})</small>`:''}`);
        el(o,0).classList.remove('dive');
        if(e.out==='goal'){layout(-2,700);await ball(50,50,450);await passTo(o,6,400)}else{layout(-1,700);await passTo(o,0,500)}
      }else if(e.out==='save'){
        put(el(o,0),goalX(p,false),ty,320);el(o,0).classList.add('dive');
        await ball(goalX(p,false)+(p?1.5:-1.5),ty,340);sfx('save');pop(fmT('saveP'),p?9:91,ty-9);say(fmT('save',e.d).replace('{g}',nm(o,0)).replace('{s}',nm(p,s)));
        await z(650);el(o,0).classList.remove('dive');layout(-1,700);await passTo(o,0,300);await z(400);await passTo(o,2+Math.floor(Math.random()*2),500);
      }else if(e.out==='post'){
        const py=e.d<1?44.6:55.4;await ball(goalX(p,false)+(p?-.6:.6),py,360);sfx('post');pop(fmT('postP'),p?9:91,py-9,'post');say(fmT('post').replace('{s}',nm(p,s)));
        await ball(goalX(p,false)+(p?9:-9),py+(py<50?-12:12),420);await z(500);layout(-1,700);await passTo(o,1+Math.floor(Math.random()*4),500);
      }else if(e.out==='block'){
        const b=e.bl>=0?e.bl:2,[bx,by]=at(o,b);await ball(bx,by,240);sfx('save');el(o,b).classList.add('blk');say(fmT('block').replace('{b}',nm(o,b)).replace('{s}',nm(p,s)));
        await z(500);el(o,b).classList.remove('blk');await ball(bx+(p?12:-12),by+(Math.random()*20-10),420);layout(-1,700);await passTo(o,b,400);
      }else{ // fuera
        await ball(goalX(p,true)+(p?-2:2),e.d===0?38:e.d===2?62:30,420,1);say(fmT('wide',e.d).replace('{s}',nm(p,s)));
        await z(600);layout(-1,700);await passTo(o,0,500);
      }
      await z(250);
    }else if(e.t==='yc'){
      await advance(e.m);const [x,y]=at(e.p,e.i);
      tmp(`<i class="fm-card" style="left:${x}%;top:${y}%"></i>`,1400);sfx('whistle');say(fmT('yc').replace('{n}',nm(e.p,e.i)));log(e.p,`<span class="yc"></span> ${e.m}' ${nm(e.p,e.i)}`);await z(1000);
    }else if(e.t==='ht'||e.t==='ft'){
      await advance(e.t==='ht'?45:90);hold(null);sfx('whistle');
      tmp(`<div class="fm-ov"><b>${fmT(e.t)}</b><span>${e.sc[0]} – ${e.sc[1]}</span></div>`,1900);say(`${fmT(e.t)} · ${e.sc[0]} – ${e.sc[1]}`);
      $('fmhalf').textContent=fmT(e.t);layout(-2,800);await ball(50,50,600);await z(1700);
    }else if(e.t==='pens'){
      pensRow();$('fmhalf').textContent=fmT('pens');tmp(`<div class="fm-ov"><b>${fmT('shootout')}</b></div>`,1700);say(fmT('shootout'));await z(1500);
      // todos al círculo central; se tira en la portería derecha
      for(let p=0;p<2;p++)for(let i=0;i<11;i++)put(el(p,i),p?55:45,22+i*5.5,800);
      await z(800);
      for(const k of e.seq){
        const p=k.p,o=1-p;put(el(o,0),98.6,50,500);put(el(p,0),p?55:45,22,500);
        put(el(p,k.s),86,50,550);await ball(89.5,50,450);hold(p,k.s);await z(650);
        const ty=GY[k.d],gy=k.out==='save'?ty:GY[k.gd===k.d?(k.gd+1)%3:k.gd];
        put(el(o,0),98.6,gy,360);el(o,0).classList.add('dive');sfx('kick');hold(null);
        if(k.out==='goal'){await ball(100.5,ty,360,1);net_(1);sfx('goal')}
        else if(k.out==='save'){await ball(97,ty,340);sfx('save');pop(fmT('saveP'),92,ty-9)}
        else{await ball(100.5,ty<50?36:64,380,1)}
        penMark(p,k.goal);say(`${nm(p,k.s)}: ${k.goal?'⚽':'✕'} · ${k.ps[0]} – ${k.ps[1]}`);
        await z(900);el(o,0).classList.remove('dive');put(el(p,k.s),p?55:45,22+k.s*5.5,500);await ball(89.5,50,300);
      }
    }else if(e.t==='end'){
      $('fmspd').style.visibility='hidden';hold(null);sfx('whistle');
      const w=e.w,st=e.st||{},rows=[['poss','%'],['sh',''],['sot',''],['xg',''],['yc','']];
      say(w<0?t('tie'):t('wins',w+1));
      const bar=(k,suf,i)=>{const v=st[k]||[0,0],a=+v[0],b=+v[1],tot=a+b||1;return `<div class="fm-st"><span>${a}${suf}</span><div><small>${fmT('stats',i)}</small><i><u style="width:${a/tot*100}%"></u></i></div><span>${b}${suf}</span></div>`};
      const m=e.motm,mc=m&&C(m.n);
      E.insertAdjacentHTML('beforeend',`<div class="res fm-res"${w>=0?` style="--c:var(--p${w+1})"`:''}><h2>${w<0?t('tie'):t('winsH',w+1)}</h2><p class="ab-note"></p>
<div class="fm-fin"><b>${e.sc[0]}</b><i>–</i><b>${e.sc[1]}</b>${e.pens?`<small>${fmT('pens')} ${e.pens[0]} – ${e.pens[1]}</small>`:''}</div>
<div class="fm-sts">${rows.map(([k,s],i)=>bar(k,s,i)).join('')}</div>
${mc?`<div class="ab-mvp" style="--c:var(--p${m.p+1})"><em>${fmT('motm')}</em><i class="ab-th" data-n="${mc.n}" style="--h:${mc.h}">${spr(mc)}</i><span><b>${dnh(mc)}</b><small>${P_(m.p)} · ${m.r.toFixed(1)}</small></span></div>`:''}
<button onclick="again()">${t('again')}</button></div>`);
      E.querySelector('.fm-res').scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  }
}

/* ---------- ESCALA DE PODER (pestañas Anime / UFC) ---------- */
function scaleTab(k){scTab=k;openScale()}
// Los tres de 1000 empatan en poder: en la escala va primero God, luego Zeno y luego La Verdad
const TOP3=['God','Zeno','Truth'],topRank=c=>{const i=TOP3.indexOf(c.n);return i<0?9:i};
function openScale(){
  wantImg(POOLS[scTab]);
  const row=(c,k,m)=>`<div class="sr"><span class="rk">${k}</span><div class="av" data-n="${c.n}" style="--h:${c.h}">${c.img?`<img src="${c.img}" alt="">`:c.e}</div><div><b>${dnh(c)}</b>${c.kind==='anime'?trBadge(c):''}<small>${m}</small><div class="bar2"><i style="width:${c.kind==='futbol'?Math.max(0,(c.ovr-40)/59*100):c.pw/10}%"></i></div>${c.kind==='anime'?stT(c):''}</div><span class="pv">${c.kind==='futbol'?c.ovr:c.pw}</span></div>`;
  $('scn').textContent=u(scTab==='ufc'?'scaleNoteUfc':scTab==='futbol'?'scaleNoteFut':'scaleNote');
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.k===scTab));
  $('scl').innerHTML=scTab==='futbol'
    ?FDIVS.map(d=>`<h4 class="dh">${u('div_'+d.k)}</h4>`+FUTP.filter(c=>c.cls===d.k).sort((a,b)=>b.ovr-a.ovr||b.leg-a.leg).map((c,k)=>row(c,k+1,`${c.e} ${roleT(c.role)} · ${c.club}${c.leg?` ${c.yr} · ★ ${u('legend')}`:''}`)).join('')).join('')
    :scTab==='ufc'
    ?UFC_DIVS.map(d=>`<h4 class="dh">${u('div_'+d.k)}</h4>`+UFC.filter(c=>c.cls===d.k).sort((a,b)=>b.pw-a.pw).map((c,k)=>row(c,k+1,`${c.e} ${c.nick?c.nick+' · ':''}${u('sty_'+c.sty)}`)).join('')).join('')
    :[...POOLS.anime].sort((a,b)=>b.pw-a.pw||topRank(a)-topRank(b)).map((c,k)=>row(c,k+1,`${an(c.a)} · ${fe(c)}`)).join('');
  $('scale').classList.add('open');
}
function closeScale(){$('scale').classList.remove('open')}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeScale()});

/* ---------- FOTOS: anime → Jikan (MyAnimeList) · UFC → Wikipedia; se guardan en caché ---------- */
const loads=src=>new Promise(ok=>{const im=new Image();im.onload=()=>ok(1);im.onerror=()=>ok(0);im.src=src});
const wk=(q,s)=>`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q+' '+(s||'mixed martial artist'))}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=320&format=json&origin=*`;
async function findWiki(c){const r=await fetch(wk(c.q,c.kind==='futbol'?'footballer':''));if(r.status===429)throw 'rl';if(!r.ok)return;const pg=Object.values((await r.json()).query?.pages||{})[0],src=pg?.thumbnail?.source;if(src&&await loads(src))return src}
let IMGC={};try{IMGC=JSON.parse(localStorage.getItem('bvimg')||'{}')}catch(e){}
if(typeof IMG_URLS!=='undefined')for(const k in IMG_URLS)IMGC[k]=IMG_URLS[k]; // data-imgs.js (tools/build-imgs.js)
const jk=q=>`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(q)}&order_by=favorites&sort=desc&limit=1`;
// Prioridad 1: fotos propias en pics/ (nombre del personaje + .jpg/.png/.webp/.jpeg). Se buscan TODAS a la vez al cargar la página, sin esperar a la cola de internet.
const LOC_EXT=['jpg','png','webp','jpeg'],ALT={Frieza:['Freezer'],'Grand Priest':['Gran Sacerdote','Daishinkan'],Truth:['La Verdad'],Father:['Padre'],Whitebeard:['Barbablanca','Edward Newgate'],'Sung Jin-Woo':['Jinwoo','Sung Jinwoo']};
const tryLoad=src=>new Promise(ok=>{const im=new Image();im.onload=()=>ok(src);im.onerror=()=>ok(0);im.src=src});
const picNames=c=>[...new Set([c.n,LANGS.es&&LANGS.es.names&&LANGS.es.names[c.n],LANGS.en&&LANGS.en.names&&LANGS.en.names[c.n],...(ALT[c.n]||[])].filter(Boolean))];
async function localImg(c){const ufc=c.kind==='ufc'||c.kind==='futbol',pre=c.kind==='futbol'?'fut-':c.kind==='ufc'?'ufc-':'',v=(ufc?[c.n]:picNames(c)).flatMap(n=>(ufc?['jpg']:LOC_EXT).map(x=>'pics/'+pre+encodeURIComponent(n)+'.'+x));return (await Promise.all(v.map(tryLoad))).find(Boolean)}
let localDone=Promise.resolve();
function scanLocal(){
  POOLS.anime.forEach(c=>{if(!c.img&&IMGC[c.n])c.img=IMGC[c.n]}); // caché de internet: al instante
  const L=[...POOLS.anime];let k=0;
  const worker=async()=>{while(k<L.length){const c=L[k++];try{const l=await localImg(c);if(l){c.loc=1;if(c.img!==l){c.img=l;imgShown(c)}}}catch(e){}}};
  return localDone=Promise.all(Array.from({length:16},worker));
}
async function findImg(c){
  if(c.kind==='futbol'){const l=await localImg(c);if(l){c.loc=1;return l}return findWiki(c)}
  if(c.kind==='ufc')return findWiki(c);
  for(const q of c.q.split('|')){
    let r=await fetch(jk(q));
    if(r.status===429){await sleep(3000);r=await fetch(jk(q))}
    if(r.ok){
      const u=((await r.json()).data||[])[0]?.images?.jpg?.image_url;
      if(u&&!/questionmark/.test(u)&&await new Promise(ok=>{const im=new Image();im.onload=()=>ok(1);im.onerror=()=>ok(0);im.src=u}))return u;
    }
    await sleep(1100);
  }
}
// Anime (Jikan): de una en una por su límite de peticiones.
// UFC y fútbol (Wikipedia): en lotes de 50 nombres por petición (300 jugadores = 6 peticiones; en paralelo Wikipedia responde 429).
// Los que no salen por el título exacto se buscan luego uno a uno.
let imgQA=[],imgQW=[],wkPend=[],busyA=false,busyW=false,busyB=false;
const saveC=()=>{try{localStorage.setItem('bvimg',JSON.stringify(IMGC))}catch(e){}};
const got=(c,u)=>{c.img=u;IMGC[c.n]=u;imgShown(c)};
async function grab(c){
  if(c.loc||(c.img&&c.kind!=='ufc'))return;
  if(IMGC[c.n]){c.img=IMGC[c.n];imgShown(c);return}
  const u=await findImg(c);if(u){got(c,u);saveC()}
}
async function pumpA(){busyA=true;await localDone;
  while(imgQA.length){const c=imgQA.shift();try{await grab(c)}catch(e){}await sleep(1100)}busyA=false}
async function pumpW(){busyW=true;
  while(imgQW.length){const c=imgQW.shift();try{await grab(c)}catch(e){if(e==='rl'){imgQW.unshift(c);await sleep(6000)}}await sleep(250)}busyW=false}
const wkT=ts=>`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(ts.join('|'))}&redirects=1&prop=pageimages|pageprops&ppprop=disambiguation&piprop=thumbnail&pithumbsize=320&pilimit=50&format=json&origin=*`;
async function pumpB(){busyB=true;
  while(wkPend.length){const ch=wkPend.splice(0,50).filter(c=>!c.img),miss=[];if(!ch.length)continue;
    try{let r=null;
      for(let k=0;k<3;k++){try{r=await fetch(wkT(ch.map(c=>c.q)))}catch(e){r=null}if(r&&r.status===429){await sleep(1500*(k+1));continue}break}
      if(r&&r.status===429){wkPend.unshift(...ch);await sleep(6000);continue}
      const q=r&&r.ok?((await r.json()).query||{}):{},nm={},rd={},byT={};
      (q.normalized||[]).forEach(x=>nm[x.from]=x.to);(q.redirects||[]).forEach(x=>rd[x.from]=x.to);
      Object.values(q.pages||{}).forEach(pg=>{if(pg.thumbnail&&!(pg.pageprops&&'disambiguation' in pg.pageprops))byT[pg.title]=pg.thumbnail.source});
      ch.forEach(c=>{let t=nm[c.q]||c.q;t=rd[t]||t;const u=byT[t];if(u){got(c,u);new Image().src=u}else miss.push(c)}); // new Image: la foto se descarga ya y queda en la caché del navegador
      saveC();
    }catch(e){miss.push(...ch.filter(c=>!c.img))}
    imgQW.push(...miss);if(!busyW)pumpW();
  }
  busyB=false}
function wantImg(list,front){
  (list||[]).forEach(c=>{if(!c||c.img)return;
    if(c.kind==='anime'){const k=imgQA.indexOf(c);if(k>=0){if(front&&k>0){imgQA.splice(k,1);imgQA.unshift(c)}return}
      if(c.done)return;c.done=true;front?imgQA.unshift(c):imgQA.push(c);return}
    if(IMGC[c.n]){c.done=true;c.img=IMGC[c.n];imgShown(c);return} // caché: al instante
    const k=imgQW.indexOf(c);if(k>=0){if(front&&k>0){imgQW.splice(k,1);imgQW.unshift(c)}return}
    const j=wkPend.indexOf(c);if(j>=0){if(front&&j>0){wkPend.splice(j,1);wkPend.unshift(c)}return}
    if(c.done)return;c.done=true;front?wkPend.unshift(c):wkPend.push(c)});
  if(imgQA.length&&!busyA)pumpA();
  if(wkPend.length&&!busyB)pumpB();
}
function imgShown(c){
  if(cur&&cur.n===c.n){const e=$('pic').querySelector('.e');if(e)e.outerHTML=`<img src="${c.img}" alt="${c.n}">`}
  if(P&&P.some(p=>p.c.some(x=>x.n===c.n)))render();
  document.querySelectorAll('[data-n]').forEach(e=>{if(e.dataset.n===c.n)(e.matches('.fc')?e.querySelector('.sp'):e).innerHTML=`<img src="${c.img}" alt="">`});
}
scanLocal();
// si una foto falla al cargar, vuelve al emoji en vez de mostrar el icono roto
document.addEventListener('error',e=>{const im=e.target;if(!im||im.tagName!=='IMG')return;const c=byN.get(im.alt);
  if(c){c.img='';c.loc=0;im.outerHTML=`<div class="e">${c.e}</div>`}else im.style.visibility='hidden'},true);

/* ---------- FONDOS: escena animada por defecto; si existe bg/anime.gif|mp4|webm|webp|jpg|png (idem ufc y futbol) se usa en su lugar ---------- */
const BGX=['mp4','webm','gif','webp','jpg','png'];
const probeVid=s=>new Promise(ok=>{const v=document.createElement('video');v.preload='metadata';v.onloadedmetadata=()=>ok(s);v.onerror=()=>ok(0);v.src=s;setTimeout(()=>ok(0),2500)});
async function bgFile(n){return (await Promise.all(BGX.map(x=>(x==='mp4'||x==='webm'?probeVid:tryLoad)('bg/'+n+'.'+x)))).find(Boolean)}
async function paintBg(el,n){
  const s=await bgFile(n);if(!s)return;
  el.querySelectorAll('.media').forEach(m=>m.remove());
  el.insertAdjacentHTML('afterbegin',/\.(mp4|webm)$/.test(s)?`<video class="media" src="${s}" autoplay muted loop playsinline></video>`:`<img class="media" alt="" src="${s}">`);
  el.classList.add('custom');
}
function initFx(el){
  if(el.dataset.fx)return;el.dataset.fx=1;
  const k=el.classList.contains('fx-anime')?'a':'o';let h='';
  if(k==='a')for(let i=0;i<18;i++)h+=`<s class="pt" style="left:${rnd(0,100)}%;width:${rnd(8,15)}px;height:${rnd(11,20)}px;animation-duration:${rnd(7,15)}s;animation-delay:-${rnd(0,15)}s"></s>`;
  else for(let i=0;i<3;i++)h+=`<s class="bm" style="left:${10+i*33}%;animation-delay:-${i*1.7}s;animation-duration:${4+i}s"></s>`;
  el.insertAdjacentHTML('beforeend',h);
}
function gameBg(c){
  document.body.classList.add('ingame');
  const g=$('gbg'),k=c==='ufc'?'ufc':c==='futbol'?'futbol':'anime';
  document.body.classList.toggle('night',k==='anime');g.dataset.fx='';g.style.display='block';
  if(c==='futbol'){g.className='fx fx-foot fx-stadium';g.innerHTML='<i></i><b></b>';initFx(g);return} // fútbol: estadio con focos, sin foto
  if(k==='anime'){g.className='fx-auction';g.innerHTML=gavelScene();return} // anime: sin foto de fondo; martillos de subasta en vectorial
  g.className='fx fx-'+k;g.innerHTML='<i></i><b></b>';initFx(g);paintBg(g,k);
}
/* ---------- FONDO DE SUBASTA (anime): martillos que golpean su base, paletas de puja que suben y dos martillos grandes que reaccionan a cada puja ---------- */
const GV_SYM=`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="gv-h" viewBox="0 0 240 216"><path d="M84 111L212 113Q226 113 226 120Q226 127 212 127L84 129Z" fill="#f3e6c8" stroke="#0a0a0b" stroke-width="5" stroke-linejoin="round"/><circle cx="221" cy="120" r="11" style="fill:var(--band,#d62839)" stroke="#0a0a0b" stroke-width="5"/><rect x="82" y="104" width="14" height="32" rx="3" style="fill:var(--band,#d62839)" stroke="#0a0a0b" stroke-width="5"/><rect x="34" y="62" width="52" height="116" rx="7" fill="#f3e6c8" stroke="#0a0a0b" stroke-width="5"/><rect x="34" y="88" width="52" height="11" style="fill:var(--band,#d62839)" stroke="#0a0a0b" stroke-width="4"/><rect x="34" y="141" width="52" height="11" style="fill:var(--band,#d62839)" stroke="#0a0a0b" stroke-width="4"/><rect x="27" y="52" width="66" height="18" rx="4" fill="#f3e6c8" stroke="#0a0a0b" stroke-width="5"/><rect x="27" y="170" width="66" height="18" rx="4" fill="#f3e6c8" stroke="#0a0a0b" stroke-width="5"/></symbol>
<symbol id="gv-s" viewBox="0 0 240 216"><path d="M84 111L212 113Q226 113 226 120Q226 127 212 127L84 129Z"/><circle cx="221" cy="120" r="11"/><rect x="27" y="52" width="66" height="136" rx="6"/></symbol>
<symbol id="gv-p" viewBox="0 0 100 160"><rect x="42" y="84" width="16" height="70" rx="6" fill="#d62839" stroke="#0a0a0b" stroke-width="5"/><circle cx="50" cy="48" r="40" fill="#f3e6c8" stroke="#0a0a0b" stroke-width="5"/></symbol>
</defs></svg>`;
const gvOne=(cls,st)=>`<div class="${cls}" style="${st}"><svg viewBox="0 0 270 250" aria-hidden="true">
<rect x="26" y="202" width="108" height="24" rx="6" fill="#7a0f1d" stroke="#0a0a0b" stroke-width="5"/>
<g class="imp"><ellipse cx="80" cy="202" rx="56" ry="11" fill="none" stroke="var(--gc,#f3e6c8)" stroke-width="5"/><path d="M28 182L12 170M132 182L148 170M80 176V156" stroke="var(--gc,#f3e6c8)" stroke-width="5" stroke-linecap="round"/></g>
<g class="ham"><use href="#gv-s" x="29" y="19" width="240" height="216" fill="var(--gs,#3a0710)"/><use href="#gv-h" x="20" y="10" width="240" height="216"/></g></svg></div>`;
function gavelScene(){
  const A=[[5,9,125,3.4,-.4,-1,.24],[31,3,92,2.9,-1.8,1,.17],[61,7,104,3.8,-2.6,-1,.2],[90,14,132,3.1,-1.1,1,.24],[13,47,84,4.2,-3,1,.15],
           [83,49,90,3.6,-.9,-1,.15],[47,80,112,3.3,-2.2,1,.2],[23,86,74,2.7,-.3,-1,.13],[71,90,80,4,-1.5,1,.13]];
  const N=[5,12,20,3,8,15,2,10];
  return GV_SYM+'<div class="gv-amb">'+A.map(([x,y,s,d,dl,m,o])=>gvOne('gv',`left:${x}%;top:${y}%;--s:${s}px;--d:${d}s;--dl:${dl}s;--m:${m};--o:${o}`)).join('')
    +N.map((n,i)=>`<div class="gp" style="--x:${6+i*12.5}%;--s:${46+(i*17)%30}px;--d:${16+(i*7)%10}s;--dl:-${(i*5.3)%22}s;--o:${.1+(i%3)*.04}"><svg viewBox="0 0 100 160" aria-hidden="true"><use href="#gv-p" width="100" height="160"/><text x="50" y="62" text-anchor="middle">${n}</text></svg></div>`).join('')+'</div>'
    +gvOne('gv-big p0','--band:var(--p1);--gc:var(--p1);--gs:color-mix(in srgb,var(--p1) 35%,#000)')+gvOne('gv-big p1','--band:var(--p2);--gc:var(--p2);--gs:color-mix(in srgb,var(--p2) 35%,#000)')
    +'<i class="gv-glow p0"></i><i class="gv-glow p1"></i>';
}
function gavel(p,big){ // martillazo del lado de quien puja (y más fuerte al vender)
  const g=$('gbg');if(!g||!g.classList.contains('fx-auction'))return;
  [g.querySelector('.gv-big.p'+p),g.querySelector('.gv-glow.p'+p)].forEach(el=>{if(!el)return;el.classList.remove('slam','sold');void el.getBoundingClientRect();el.classList.add(big?'sold':'slam')});
}
document.querySelectorAll('.fx-anime,.fx-ufc,.fx-foot').forEach(e=>{initFx(e);paintBg(e,e.classList.contains('fx-anime')?'anime':e.classList.contains('fx-ufc')?'ufc':'futbol')});


/* ---------- LOGO: se busca en pics/ y fotos/ (varios nombres y extensiones); si no hay ninguno, se muestra el nombre en grande ---------- */
(function(){
  const h=document.querySelector('h1.brandimg'),im=h&&h.querySelector('.logoimg');if(!im)return;
  const cands=names=>['pics/','fotos/'].flatMap(d=>names.flatMap(n=>['png','webp','svg','png.png'].map(x=>d+n+'.'+x)));
  const probe=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(src);i.onerror=()=>r(0);i.src=src});
  const first=async list=>{for(let i=0;i<list.length;i+=4){const r=(await Promise.all(list.slice(i,i+4).map(probe))).find(Boolean);if(r)return r}return 0};
  first(cands(['LogoBidVerse','logo-light','Logo-light','logo','Logo','BidverseLogo'])).then(s=>{
    if(!s){console.warn('BidVerse: no encuentro el logo. Pon pics/logo.png junto a index.html.');h.innerHTML='<span class="wordmark">BidVerse</span>';return}
    im.src=s;
  });
})();