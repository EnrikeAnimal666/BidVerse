// BidVerse · lógica del juego. Datos: data-anime.js (POOLS.anime) y data-ufc.js (UFC) · idiomas: lang/*.js (LANGS)
POOLS.ufc=UFC;
const CFG={anime:{start:20},ufc:{start:40}},MAXC=3,SECS=10;
let deck,idx,cur,bid,leader,left,tick,P,skips,locked,cat,passed,free=-1,bt=0,dv='',scTab='anime';
const $=id=>document.getElementById(id),pad2=n=>String(n).padStart(2,'0');
const byN=new Map([...POOLS.anime,...UFC].map(c=>[c.n,c])),imgOf=n=>(byN.get(n)||{}).img;
/* ---------- IDIOMAS: u() = plantilla {0},{1}… de lang/xx.js · X = mensajes compuestos · t() = ambos ---------- */
let lang=(()=>{try{const s=localStorage.getItem('bvlang');if(s&&LANGS[s])return s}catch(e){}return /^es/i.test(navigator.language||'')?'es':'en'})();
const u=(k,...a)=>String(LANGS[lang].ui[k]??LANGS.en.ui[k]??k).replace(/\{(\d+)\}/g,(m,i)=>a[i]??m);
const X={
soldLine:(p,b)=>`${u('sold')}<br>${u('player',p)} · $${b}`,
stampSold:(p,nm,pr)=>`<small>${u('sold')}</small><strong>${u('player',p)}</strong><u>${u('takes','<b>'+nm+'</b>')}</u><em>${pr}</em>`,
discard:()=>`${u('lotDiscarded')}<br>${u('minusSkip')}`,noBidsStamp:()=>`${u('noBids')}<br>${u('minusSkipEach')}`,
brokeStamp:()=>`<small>${u('noMoney')}</small><strong>${u('randomDeal')}</strong><u>${u('brokeLine')}</u>`,
afkStamp:()=>`<small>${u('nobodyBids')}</small><strong>${u('randomDeal')}</strong><u>${u('afkLine')}</u>`,
infoFree:(p,nm,f)=>u(f?'infoFreeForced':'infoFree',p,nm),
hintFree:(o,f,n)=>n?u('hintFree',o,f,n):u('hintFreeForced',o,f),
sends:(p,nm)=>u('sends',p,`<b>${nm}</b>`)};
const t=(k,...a)=>X[k]?X[k](...a):u(k,...a);
const dn=c=>LANGS[lang].names?.[c.n]||c.n,an=a=>LANGS[lang].animes?.[a]||a,fe=c=>LANGS[lang].feats?.[c.n]||c.f;
function lotText(){$('fr').textContent=cur.kind==='ufc'?u('div_'+cur.cls):an(cur.a);
  $('nm').innerHTML=dn(cur)+(cur.kind==='ufc'?`<small>${cur.e} ${cur.nick?'“'+cur.nick+'” · ':''}${u('sty_'+cur.sty)}</small>`:'')}
function peek(k){const L=k==='ufc'?UFC:POOLS.anime,c=L[Math.floor(Math.random()*L.length)],e=$('pc-'+k);
  e.style.setProperty('--h',c.h);e.innerHTML=`<i class="pe">${c.e}</i><b>${dn(c)}</b><span class="pb"><u style="width:${c.pw/10}%"></u></span><em>${u('rating')} ${c.pw}</em>`;
  e.classList.remove('sw');void e.offsetWidth;e.classList.add('sw')}
function menuInfo(){$('ch-anime').textContent=u('nChars',POOLS.anime.length);$('ch-ufc').textContent=u('nFighters',UFC.length)+' · '+u('nDivs',UFC_DIVS.length);peek('anime');peek('ufc')}
let pk=0;setInterval(()=>{if($('menu').style.display!=='none'&&!document.hidden)peek(pk++%2?'ufc':'anime')},1800);
function applyLang(){
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-i]').forEach(e=>e.textContent=t(e.dataset.i));
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
<div class="ctl"><label class="inp"><span>$</span><input id="i${p}" type="number" min="1" step="1" inputmode="numeric" placeholder="${t('bidPh')}" onkeydown="if(event.key==='Enter')place(${p})"></label>
<button class="go" id="g${p}" onclick="place(${p})">${t('bidBtn')}</button></div>
<button class="skip" id="k${p}" onclick="skip(${p})"><span class="sl" id="kl${p}">${t('skipLbl')}</span><span class="pips" id="kp${p}"></span></button>
<div class="msg" id="e${p}"></div></section>`}
function start(c){
  gameBg(c);bt++;$('wipe').className='wipe';document.querySelector('.board').style.display='';
  $('end').className='end';$('end').innerHTML='';
  cat=c;dv='';$('game').classList.toggle('ufc',c==='ufc');
  const sh=a=>a.sort(()=>Math.random()-.5);
  deck=c==='ufc'?UFC_DIVS.flatMap(d=>sh(UFC.filter(x=>x.cls===d.k))):sh([...POOLS[c]]);idx=-1;wantImg(deck);
  P=[{m:CFG[c].start,c:[]},{m:CFG[c].start,c:[]}];skips=[2,2];
  $('P1').innerHTML=panel(0);$('P2').innerHTML=panel(1);
  $('menu').style.display='none';$('game').style.display='block';$('end').style.display='none';
  next();
}
function toMenu(){$('gbg').style.display='none';bt++;clearInterval(tick);$('wipe').className='wipe';$('game').style.display='none';$('menu').style.display='block'}
// anime: hasta 3 personajes · UFC: un peleador por categoría (dv = categoría en subasta)
const can=p=>cat==='ufc'?!P[p].c.some(c=>c.cls===dv):P[p].c.length<MAXC;
const divEnd=()=>{let n=idx;while(n<deck.length&&deck[n].cls===dv)n++;return n};
const out=p=>!can(p)||P[p].m<1;
function hint(){if(free>=0){$('info').textContent=t('hintFree',2-free,free+1,skips[free]);return}const a=[0,1].filter(p=>passed[p]);$('info').textContent=a.length?t('hintPass',a[0]+1,2-a[0]):t('hintBase')}
function next(){
  clearInterval(tick);idx++;
  if(cat==='ufc'&&(idx>=deck.length||deck[idx].cls!==dv||(!can(0)&&!can(1)))){ // categoría cerrada: pasa a la siguiente
    if(idx<deck.length&&deck[idx].cls===dv)idx=divEnd();
    if(idx<deck.length){dv=deck[idx].cls;skips=[2,2]}
  }
  if(idx>=deck.length||(cat==='anime'&&!can(0)&&!can(1)))return finish();
  cur=deck[idx];wantImg([cur],true);bid=0;leader=-1;left=SECS;free=-1;
  const e=[can(0),can(1)],b=[e[0]&&P[0].m>=1,e[1]&&P[1].m>=1],dead=e[0]&&e[1]&&!b[0]&&!b[1];
  if(e[0]&&e[1]){if(b[0]!==b[1])free=b[0]?0:1}else free=e[0]?0:1;
  passed=[false,false];if(free>=0)passed[1-free]=true;locked=dead;
  $('pic').innerHTML=(cur.img?`<img src="${cur.img}" alt="${cur.n}">`:`<div class="e">${cur.e}</div>`)+'<div class="stamp" id="stamp"><span id="st"></span></div>';
  $('pic').style.setProperty('--h',cur.h);
  $('lot').classList.toggle('ufc',cur.kind==='ufc');
  lotText();
  hint();render();timer();
  const tk=bt;
  if(dead)return afkDeal(true);
  if(free>=0&&skips[free]<=0){locked=true;leader=free;render();return void setTimeout(()=>{if(tk===bt)close()},1600)}
  tick=setInterval(()=>{left--;timer();if(left<=0)close(true)},1000);
}
function timer(){$('bar').style.width=Math.max(left,0)/SECS*100+'%';$('barw').classList.toggle('low',left<=3);$('tm').textContent='0:'+pad2(Math.max(left,0))}
function render(){
  $('bid').textContent=leader<0?'—':bid?'$'+bid:t('free');
  $('who').textContent=leader<0?t(free>=0?'freeLot':'noBids'):t('player',leader+1);
  for(let p=0;p<2;p++){
    $('m'+p).textContent='$'+P[p].m;
    let h='';
    const SL=cat==='ufc'?UFC_DIVS.map(d=>P[p].c.find(c=>c.cls===d.k)||d.k):Array.from({length:MAXC},(_,i)=>P[p].c[i]);
    SL.forEach(c=>{const dl=typeof c==='string'?c:c&&cat==='ufc'?c.cls:'',dt=dl?u('div_'+dl).split(' · ')[0]+(c&&c.n?' · ':''):'';
      h+=c&&c.n?`<div class="slot full" style="--h:${c.h}"><div class="av">${imgOf(c.n)?`<img src="${imgOf(c.n)}" alt="${c.n}">`:c.e}</div><div><b>${dn(c)}</b><small>${dt}${c.paid?t('paid',c.paid):c.free?t('free'):t('random')}</small></div></div>`
          :`<div class="slot"><div class="av"></div>${dl?`<div><small>${dt}</small></div>`:''}</div>`});
    $('s'+p).innerHTML=h;
    $('g'+p).disabled=$('i'+p).disabled=locked||passed[p];
    $('i'+p).disabled=$('i'+p).disabled||free===p;$('g'+p).textContent=t(free===p?'takeBtn':'bidBtn');$('i'+p).placeholder=t(free===p?'free':'bidPh');
    $('k'+p).disabled=locked||leader===p||!(leader>=0)&&(passed[p]||skipLocked(p));
    $('kl'+p).textContent=leader>=0&&leader!==p?t('concede',leader+1):passed[p]?t(out(p)?'autoPass':'passed'):skipLocked(p)?t('noSkips'):t(free===p?'passFree':'skipLbl');
    $('kp'+p).innerHTML=[0,1].map(i=>`<i class="${i<skips[p]?'on':''}"></i>`).join('');
    $('k'+p).classList.toggle('conc',leader>=0&&leader!==p&&!locked);
  }
}
function err(p,t){$('e'+p).textContent=t;setTimeout(()=>{if($('e'+p).textContent===t)$('e'+p).textContent=''},2500)}
function place(p){
  if(locked||passed[p])return;
  if(free===p){leader=p;bid=0;return close()}
  const v=Math.floor(Number($('i'+p).value));
  if(!v||v<1)return err(p,t('errValid'));
  if(v<=bid)return err(p,t('errOver',bid));
  if(v>P[p].m)return err(p,t('errMoney',P[p].m));
  bid=v;leader=p;left=SECS;timer();
  if(passed[1-p]){$('i0').value=$('i1').value='';return close()}
  $('i0').value=$('i1').value='';
  render();const b=$('bid');b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');
}
function stamp(t,c){const s=$('stamp');$('st').className=c||'';$('st').innerHTML=t;s.style.display='grid'}
function close(afk){
  clearInterval(tick);locked=true;
  if(afk&&leader<0&&free>=0){leader=free;bid=0}
  if(leader>=0){P[leader].m-=bid;P[leader].c.push({...cur,paid:bid,free:free===leader});stamp(t('soldLine',leader+1,bid));$('info').textContent='';}
  else if(afk){afkDeal();return}
  else if(free>=0){stamp(t('discard'));skips[free]=Math.max(0,skips[free]-1);$('info').textContent=''}
  else{stamp(t('noBidsStamp'));skips=skips.map(s=>Math.max(0,s-1));$('info').textContent='';}
  render();if(leader>=0){const m=$('m'+leader),sd=$('P'+(leader+1)).firstElementChild;
    stamp(t('stampSold',leader+1,dn(cur),free===leader?t('free'):t('forPrice',bid)),'win w'+(leader+1));
    m.classList.add('pop');sd.classList.add('won');
    $('s'+leader).children[cat==='ufc'?UFC_DIVS.findIndex(d=>d.k===cur.cls):P[leader].c.length-1].classList.add('new');
    $('info').textContent=free===leader?t('infoFree',leader+1,dn(cur),skips[leader]<=0):t('infoSold',leader+1,dn(cur),bid,P[leader].m);
    setTimeout(()=>{m.classList.remove('pop');sd.classList.remove('won')},1600)}
  const tk=bt;setTimeout(()=>{if(tk===bt)next()},2600);
}
function afkDeal(broke){
  const rest=deck.slice(idx).filter(c=>cat==='anime'||c.cls===dv).sort(()=>Math.random()-.5);
  while(rest.length&&(can(0)||can(1))){
    const o=[0,1].filter(can);
    const p=o.length===1?o[0]:P[0].c.length===P[1].c.length?Math.round(Math.random()):P[0].c.length<P[1].c.length?0:1;
    P[p].c.push({...rest.pop(),paid:0});
  }
  stamp(t(broke?'brokeStamp':'afkStamp'),'win w0');
  $('info').textContent=t((broke?'brokeInfo':'afkInfo')+(cat==='ufc'?'U':''));
  render();
  const tk=bt;setTimeout(()=>{if(tk===bt){if(cat==='anime')idx=deck.length;next()}},3800);
}
const skipLocked=p=>skips[p]<=0;
function skip(p){
  if(locked||leader===p)return;
  if(leader>=0){close();return}
  if(skipLocked(p)||passed[p])return;
  passed[p]=true;
  if(passed[1-p])return close();
  left=SECS;timer();render();hint();
}

/* ---------- COMBATE FINAL ---------- */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Escala logarítmica: cada POWER_BASE puntos = 10 veces más poder (250 -> 100 puntos de diferencia = x2,5).
const POWER_BASE=250,S=c=>Math.pow(10,c.pw/POWER_BASE);
const spr=c=>imgOf(c.n)?`<img src="${imgOf(c.n)}" alt="${c.n}">`:`<div class="e">${c.e}</div>`;
function arena(){return `<div class="arena">`+[1,0].map(p=>`<div class="fgt a${p}" style="--c:var(--p${p+1})"><div class="hpbox" id="hb${p}"><div class="hn"><b id="bn${p}"></b><span>${t('player',p+1)}</span></div><div class="hpr"><small>${t('ps')}</small><div class="hpb"><i id="bh${p}"></i></div></div><div class="bl" id="bb${p}"></div></div><div class="sp" id="bs${p}"></div></div>`).join('')+`<div class="dlg" id="dlg"></div></div>`}

function finish(){
  clearInterval(tick);locked=true;render();$('info').textContent=t('auctionOver');
  const tk=++bt;(cat==='ufc'?night:run)(tk).catch(e=>{if(e!==0)throw e});
}

async function run(tk){
  const z=async ms=>{await sleep(ms);if(tk!==bt)throw 0};
  const T=P.map(p=>p.c.map(c=>({...c,f:1,dead:false}))),i=[0,0],alive=p=>i[p]<T[p].length;
  const say=async(h,ms=2000)=>{$('dlg').innerHTML=h;await z(ms)};
  const setHp=(p,f)=>{const e=$('bh'+p);e.style.width=f*100+'%';e.className=f>.5?'':f>.2?'mid':'low'};
  const balls=p=>$('bb'+p).innerHTML=[0,1,2].map(k=>`<i class="${k<T[p].length?(T[p][k].dead?'x':'on'):''}"></i>`).join('');
  const fx=(p,c)=>{const s=$('bs'+p);s.className='sp';void s.offsetWidth;s.classList.add(c)};
  const enter=async p=>{const c=T[p][i[p]],s=$('bs'+p);
    s.innerHTML=spr(c);s.style.setProperty('--h',c.h);$('bn'+p).textContent=dn(c);
    setHp(p,c.f);balls(p);$('hb'+p).classList.add('show');fx(p,'in');
    await say(t('sends',p+1,dn(c)))};

  const E=await arenaIn(z,arena());
  await say(t('fightStart'),1800);

  // salen de uno en uno
  if(alive(0))await enter(0);
  if(alive(1))await enter(1);

  while(alive(0)&&alive(1)){
    const A=T[0][i[0]],B=T[1][i[1]],ea=S(A)*A.f,eb=S(B)*B.f;
    const wp=ea===eb?Math.round(Math.random()):+(eb>ea),lp=1-wp,W=T[wp][i[wp]],L=T[lp][i[lp]];
    const rem=Math.max(.04,(Math.max(ea,eb)-Math.min(ea,eb))/S(W));
    const w0=W.f,l0=L.f;
    await say(`<b>${dn(A)}</b> ${t('vs')} <b>${dn(B)}</b>`,1600);
    for(let k=1;k<=3;k++){
      fx(lp,'atk');await z(250);fx(wp,'hit');setHp(wp,w0-(w0-rem)*k/3);await z(800);
      fx(wp,'atk');await z(250);fx(lp,'hit');setHp(lp,l0*(1-k/3));await z(800);
    }
    W.f=rem;L.f=0;L.dead=true;
    await say(t('down',dn(L)),1100);
    fx(lp,'fnt');await z(900);$('bs'+lp).innerHTML='';$('hb'+lp).classList.remove('show');balls(lp);
    await say(t('stands',dn(W),Math.round(rem*100)),1400);
    i[lp]++;if(alive(lp))await enter(lp);
  }

  const wp=alive(0)?0:alive(1)?1:-1,sv=wp<0?[]:T[wp].filter(c=>!c.dead);
  await say(wp<0?t('tie'):t('wins',wp+1),300);
  E.insertAdjacentHTML('beforeend',`<div class="res"><h2>${wp<0?t('tie'):t('winsH',wp+1)}</h2><p>${sv.map(c=>dn(c)+' '+Math.round(c.f*100)+'%').join(' · ')||t('nobody')}</p><button onclick="start('${cat}')">${t('again')}</button></div>`);
}

/* ---------- NOCHE DE COMBATES (UFC): un combate por categoría, gana el Jugador con más victorias ---------- */
async function arenaIn(z,html){ // transición común
  const w=$('wipe');w.className='wipe in';await z(750);
  document.querySelector('.board').style.display='none';
  const E=$('end');E.className='end battle';E.style.display='block';E.innerHTML=html;scrollTo(0,0);
  await z(450);w.className='wipe out';await z(750);return E;
}
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1)),pick=a=>a[rnd(0,a.length-1)];
const POOLF={S:['koPunch','koPunch','koKick','koKnee','tkoStrikes'],G:['subRNC','subArm','subTri','subGuil','subKimura'],W:['tkoGnp','tkoGnp','tkoStrikes','subRNC','subArm'],B:['koPunch','koKick','tkoGnp','subRNC','subGuil','subArm','tkoStrikes']};
const FINP={S:.62,G:.58,W:.45,B:.55}; // probabilidad de finalizar según el estilo del ganador
function decide(A,B){ // A = Jugador 1, B = Jugador 2. P(gana A) = 1/(1+10^((rB-rA)/250))
  const pA=1/(1+Math.pow(10,(B.pw-A.pw)/250)),aw=Math.random()<pA,W=aw?A:B,L=aw?B:A;
  if(Math.random()<FINP[W.sty]){const rd=rnd(1,3);return{aw,W,L,fin:1,rd,key:pick(POOLF[W.sty]),time:rnd(0,4)+':'+pad2(rnd(0,59))}}
  const sp=Math.random()<.12+.3*(1-Math.abs(2*pA-1));
  return{aw,W,L,fin:0,rd:3,key:sp?'decS':'decU',sc:sp?pick(['29-28, 28-29, 29-28','29-28, 29-28, 28-29']):pick(['30-27, 30-27, 30-27','30-27, 29-28, 30-27','29-28, 29-28, 29-28','30-27, 30-27, 29-28'])};
}
let FAST=0;
async function night(tk){
  FAST=0;
  const z=async ms=>{await sleep(FAST?Math.min(ms,50):ms);if(tk!==bt)throw 0};
  const bs=UFC_DIVS.map(d=>[P[0].c.find(c=>c.cls===d.k),P[1].c.find(c=>c.cls===d.k)]).filter(b=>b[0]&&b[1]);
  wantImg(bs.flat(),true);
  const E=await arenaIn(z,`<div class="arena fn"><h2 class="fnh">${u('fnTitle')}</h2><div class="fsc" id="fsc"></div><div id="fst"></div><div class="dlg" id="dlg"></div><button class="fskip" onclick="FAST=1">»</button><div class="flg" id="flg"></div></div>`);
  const sc=[0,0],fn=[0,0],say=async(h,ms=1000)=>{$('dlg').innerHTML=h;await z(ms)};
  const board=()=>$('fsc').innerHTML=`<span>${u('player',1)} <b>${sc[0]}</b></span><i>–</i><span><b>${sc[1]}</b> ${u('player',2)}</span>`;
  const card=(c,p)=>`<div class="fc" data-n="${c.n}" style="--c:var(--p${p+1})"><div class="sp" style="--h:${c.h}">${spr(c)}</div><b>${dn(c)}</b><div class="fhp"><i id="fh${p}"></i></div><small>${u('player',p+1)}</small></div>`;
  const hp=(p,f)=>{const e=$('fh'+p);e.style.width=Math.max(f,0)*100+'%';e.className=f>.5?'':f>.2?'mid':'low'};
  const hx=(p,c)=>{const s=document.querySelectorAll('#fst .fc .sp')[p];s.classList.remove('atk','hit');void s.offsetWidth;s.classList.add(c)};
  board();
  for(let k=0;k<bs.length;k++){
    const [A,B]=bs[k],o=decide(A,B),wp=o.aw?0:1,lp=1-wp;
    $('fst').innerHTML=`<div class="fbt">${u('fnBout',k+1,bs.length)} · ${u('div_'+A.cls)}</div><div class="fvs">${card(A,0)}<span class="vs">${u('vs')}</span>${card(B,1)}</div>`;
    await say(u('fnIntro',`<b>${dn(A)}</b>`,`<b>${dn(B)}</b>`),k?750:1100);
    await say(u('fnBell'),450);
    const lt=o.fin?0:.25+Math.random()*.2,wt=o.fin?.45+Math.random()*.4:.55+Math.random()*.3,H=o.rd*3;let e=0;
    for(let r=1;r<=o.rd;r++){
      await say(u('fnRound',r,o.fin&&r===o.rd?o.time:'5:00'),300);
      for(let j=0;j<3;j++){e++;
        hx(wp,'atk');await z(120);hx(lp,'hit');hp(lp,1-(1-lt)*e/H);
        if(j===1){await z(140);hx(lp,'atk');await z(120);hx(wp,'hit');hp(wp,1-(1-wt)*e/H)}
        await z(200);}
    }
    hp(wp,wt);
    const txt=u(o.key,dn(o.W),dn(o.L),o.sc);
    sc[wp]++;if(o.fin)fn[wp]++;board();
    const cs=document.querySelectorAll('#fst .fc');cs[wp].classList.add('win');cs[lp].classList.add('lose');
    await say(`<b>${txt}</b>`,1500);
    $('flg').insertAdjacentHTML('beforeend',`<div><i>${k+1}.</i> ${txt}</div>`);
  }
  const w=sc[0]!==sc[1]?+(sc[1]>sc[0]):fn[0]!==fn[1]?+(fn[1]>fn[0]):-1,tb=sc[0]===sc[1]&&w>=0;
  const msg=w<0?u('fnDrawCard',sc[0],sc[1]):u('fnWinsCard',w+1,sc[w],sc[1-w])+(tb?' · '+u('fnTieBreak'):'');
  $('dlg').innerHTML=w<0?u('tie'):u('wins',w+1);
  document.querySelector('.fskip')?.remove();
  E.insertAdjacentHTML('beforeend',`<div class="res"><h2>${w<0?u('tie'):u('winsH',w+1)}</h2><p>${msg}</p><button onclick="start('ufc')">${u('again')}</button></div>`);
}

/* ---------- ESCALA DE PODER (pestañas Anime / UFC) ---------- */
function scaleTab(k){scTab=k;openScale()}
function openScale(){
  wantImg(POOLS[scTab]);
  const row=(c,k,m)=>`<div class="sr"><span class="rk">${k}</span><div class="av" data-n="${c.n}" style="--h:${c.h}">${c.img?`<img src="${c.img}" alt="">`:c.e}</div><div><b>${dn(c)}</b><small>${m}</small><div class="bar2"><i style="width:${c.pw/10}%"></i></div></div><span class="pv">${c.pw}</span></div>`;
  $('scn').textContent=u(scTab==='ufc'?'scaleNoteUfc':'scaleNote');
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.k===scTab));
  $('scl').innerHTML=scTab==='ufc'
    ?UFC_DIVS.map(d=>`<h4 class="dh">${u('div_'+d.k)}</h4>`+UFC.filter(c=>c.cls===d.k).sort((a,b)=>b.pw-a.pw).map((c,k)=>row(c,k+1,`${c.e} ${c.nick?c.nick+' · ':''}${u('sty_'+c.sty)}`)).join('')).join('')
    :[...POOLS.anime].sort((a,b)=>b.pw-a.pw).map((c,k)=>row(c,k+1,`${an(c.a)} · ${fe(c)}`)).join('');
  $('scale').classList.add('open');
}
function closeScale(){$('scale').classList.remove('open')}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeScale()});

/* ---------- FOTOS: anime → Jikan (MyAnimeList) · UFC → Wikipedia; se guardan en caché ---------- */
const loads=src=>new Promise(ok=>{const im=new Image();im.onload=()=>ok(1);im.onerror=()=>ok(0);im.src=src});
const wk=q=>`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q+' mixed martial artist')}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=320&format=json&origin=*`;
async function findWiki(c){const r=await fetch(wk(c.q));if(!r.ok)return;const pg=Object.values((await r.json()).query?.pages||{})[0],src=pg?.thumbnail?.source;if(src&&await loads(src))return src}
let IMGC={};try{IMGC=JSON.parse(localStorage.getItem('bvimg')||'{}')}catch(e){}
let imgQ=[],imgBusy=false;
const jk=q=>`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(q)}&order_by=favorites&sort=desc&limit=1`;
// Prioridad 1: fotos propias en pics/ (nombre del personaje + .jpg/.png/.webp/.jpeg). Se buscan TODAS a la vez al cargar la página, sin esperar a la cola de internet.
const LOC_EXT=['jpg','png','webp','jpeg'],ALT={Frieza:['Freezer'],'Grand Priest':['Gran Sacerdote','Daishinkan'],Truth:['La Verdad'],Father:['Padre'],Whitebeard:['Barbablanca','Edward Newgate'],'Sung Jin-Woo':['Jinwoo','Sung Jinwoo']};
const tryLoad=src=>new Promise(ok=>{const im=new Image();im.onload=()=>ok(src);im.onerror=()=>ok(0);im.src=src});
const picNames=c=>[...new Set([c.n,LANGS.es&&LANGS.es.names&&LANGS.es.names[c.n],LANGS.en&&LANGS.en.names&&LANGS.en.names[c.n],...(ALT[c.n]||[])].filter(Boolean))];
async function localImg(c){if(c.kind==='ufc')return;const v=picNames(c).flatMap(n=>LOC_EXT.map(x=>'pics/'+encodeURIComponent(n)+'.'+x));return (await Promise.all(v.map(tryLoad))).find(Boolean)}
let localDone=Promise.resolve();
function scanLocal(){
  POOLS.anime.forEach(c=>{if(!c.img&&IMGC[c.n])c.img=IMGC[c.n]}); // caché de internet: al instante
  const L=[...POOLS.anime];let k=0;
  const worker=async()=>{while(k<L.length){const c=L[k++];try{const l=await localImg(c);if(l){c.loc=1;if(c.img!==l){c.img=l;imgShown(c)}}}catch(e){}}};
  return localDone=Promise.all(Array.from({length:16},worker));
}
async function findImg(c){
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
async function pump(){
  imgBusy=true;await localDone;
  while(imgQ.length){
    const c=imgQ.shift();if(c.loc||(c.img&&c.kind!=='ufc'))continue;
    try{if(IMGC[c.n]){c.img=IMGC[c.n];imgShown(c);continue}
      const u=await findImg(c);if(u){c.img=u;IMGC[c.n]=u;try{localStorage.setItem('bvimg',JSON.stringify(IMGC))}catch(e){}imgShown(c)}}catch(e){}
    await sleep(c.kind==='ufc'?300:1100);
  }
  imgBusy=false;
}
function wantImg(list,front){
  list.forEach(c=>{if(c.img)return;const k=imgQ.indexOf(c);
    if(k>=0){if(front&&k>0){imgQ.splice(k,1);imgQ.unshift(c)}return}
    if(c.done)return;c.done=true;front?imgQ.unshift(c):imgQ.push(c)});
  if(!imgBusy)pump();
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
  const g=$('gbg'),k=c==='ufc'?'ufc':'anime';
  g.className='fx fx-'+k;g.dataset.fx='';g.innerHTML='<i></i><b></b>';initFx(g);g.style.display='block';paintBg(g,k);
}
document.querySelectorAll('.fx-anime,.fx-ufc,.fx-foot').forEach(e=>{initFx(e);paintBg(e,e.classList.contains('fx-anime')?'anime':e.classList.contains('fx-ufc')?'ufc':'futbol')});