/* BidVerse · CLIENTE ONLINE: sala (crear/entrar), conexión con el servidor y reconexión automática.
   No decide nada del juego: manda "pujo"/"paso" y pinta lo que el servidor responde (usa startOnline/netState/netFight de game.js). */
(function(){
  const $=id=>document.getElementById(id);
  let ws=null,token=null,myName='',retry=0,wantOpen=false,connected=false,room=null,pending=null,peerOff=false,rcTimer=0,inGame=false,lastCat='anime',iCreated=false,lbShow=0;
  try{token=localStorage.getItem('bvtoken');myName=localStorage.getItem('bvname')||''}catch(e){}
  const say=(id,txt)=>{const e=$(id);if(e)e.textContent=txt||''};
  const bar=txt=>{const b=$('netbar');if(!b)return;b.style.display=txt?'block':'none';b.textContent=txt||''};
  const show=v=>{['olForm','olWait','olConn'].forEach(x=>{const e=$(x);if(e)e.style.display=x===v?'block':'none'})};
  const send=o=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))};
  const errText=c=>{const k='ol_'+c;const s=u(k);return s===k?u('ol_server'):s};

  window.openOnline=function(view){
    if(location.protocol==='file:'){alert(u('olNoServer'));return}
    $('olName').value=myName;say('olErr','');show(room&&!inGame?'olWait':(view||'olForm'));$('online').classList.add('open');
    const m=/[?&]sala=([A-Za-z0-9]{5})/.exec(location.search);if(m&&!room)$('olCode').value=m[1].toUpperCase();
    if(!connected)connect();
  };
  window.closeOnline=function(){$('online').classList.remove('open')};
  window.olReset=function(){room=null;inGame=false;peerOff=false;bar('');say('olErr','')};

  function name(){const n=$('olName').value.trim();myName=n;try{localStorage.setItem('bvname',n)}catch(e){}return n}
  window.olCreate=function(cat){pending={t:'create',cat};lastCat=cat;iCreated=true;say('olErr','');flush()};
  window.olJoin=function(){const c=$('olCode').value.trim().toUpperCase();if(!c)return;pending={t:'join',code:c};iCreated=false;say('olErr','');flush()};
  window.olCancel=function(){pending=null;send({t:'leave'});olReset();closeOnline();hideLobby(true)};
  window.olCopy=function(){const url=location.origin+location.pathname+'?sala='+room.code;
    (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>say('olCopyOk',u('olCopied')),()=>{prompt(u('olCopy'),url)})};
  function flush(){if(connected&&pending){const p=pending;pending=null;
    send({t:'hello',name:name()||undefined,token}); // refresca el nombre antes de crear/entrar
    send(p)}else if(!connected)connect()}

  function connect(){
    if(ws&&(ws.readyState===0||ws.readyState===1))return;
    wantOpen=true;bar(retry?u('olReconnecting'):'');
    ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');
    ws.onopen=()=>{retry=0;send({t:'hello',name:name()||undefined,token})};
    ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}on(m)};
    ws.onclose=()=>{connected=false;ws=null;if(!wantOpen)return;if(inGame||room)bar(u('olReconnecting'));clearTimeout(rcTimer);rcTimer=setTimeout(connect,Math.min(8000,500*2**retry++))};
    ws.onerror=()=>{};
  }

  function on(m){switch(m.t){
    case 'welcome':connected=true;token=m.token;try{localStorage.setItem('bvtoken',token);if(!myName)localStorage.setItem('bvname',m.name)}catch(e){}
      if(!myName)$('olName').value=m.name;flush();break;
    case 'room': // sala en espera (o actualización)
      room=m;preload(m.cat);if(m.phase==='lobby'){inGame=false;$('olCodeBig').textContent=m.code;say('olCopyOk','');closeOnline();clearTimeout(lbShow);lbShow=setTimeout(()=>lobby(m),iCreated?0:300)}break; // sala en espera: pantalla propia
    case 'start': // empieza (o se reanuda / revancha) una partida
      clearTimeout(lbShow);hideLobby(false);
      room=Object.assign(room||{},{code:room&&room.code,cat:m.cat,names:m.names,you:m.you});inGame=true;closeOnline();bar('');peerOff=false;
      startOnline(m.cat,m.names,m.you,send);break;
    case 'state':if(inGame&&net)netState(m.s,m.ev);break;
    case 'tick':if(inGame&&net){left=G.left=m.left;timer();tickSnd()}break;
    case 'fight':if(inGame&&net)netFight(m);break;
    case 'order':if(inGame&&net)netOrder(m);break;
    case 'orderReady':if(inGame&&net)netOrderReady(m.i);break;
    case 'peer':if(m.connected){peerOff=false;bar(u('olPeerBack'));setTimeout(()=>{if(!peerOff)bar('')},2500)}else{peerOff=true;bar(u('olPeerOff'))}break;
    case 'again':{const b=document.querySelector('.res p');if(b)b.textContent=u('olAgainAsk')}break;
    case 'peerleft':bar(m.timeout?u('olTimeout'):u('olPeerLeft'));if(net){const b=document.createElement('button');b.textContent=u('olBackMenu');b.onclick=()=>toMenu();$('netbar').appendChild(b)}room=null;inGame=false;break;
    case 'kicked':wantOpen=false;bar(u('olKicked'));hideLobby(true);break;
    case 'err':{const msg=errText(m.code);
      if($('online').classList.contains('open')){const c=$('olConn');if(c&&c.style.display!=='none')show('olForm');say('olErr',msg)}else if(net)err(net.me,t(m.code,m.arg));else alert(msg)}break;
  }}
  function preload(c){try{if(c&&typeof wantImg==='function'&&POOLS[c])wantImg(POOLS[c])}catch(e){}} // fotos de la categoría mientras se espera al rival
  window.bvPreload=preload;
  window.addEventListener('beforeunload',()=>{wantOpen=false});

  /* ---------- PANTALLA DE ESPERA: al crear una sala te lleva aquí hasta que entra el rival ---------- */
  const LB={es:{title:'Sala creada',sub:'Pásale el código o el enlace a tu rival. La partida empieza sola en cuanto entre.',code:'Código de sala',link:'Copiar enlace',copy:'Copiar código',share:'Compartir',copied:'¡Copiado!',
      cat3:'Fútbol',you:'Tú',ready:'Listo',wait:'Esperando rival',notYet:'Todavía no ha entrado',waiting:'Esperando',cancel:'Cancelar sala',back:'← Menú',player:'Jugador',
      anime:['3 personajes por jugador','$20 para pujar','10 s por puja','Combate por equipos'],ufc:['1 peleador por categoría','8 categorías','$40 para pujar','Noche de combates'],futbol:['11 jugadores · 4-3-3','100M para fichar','50 leyendas + 250 actuales','Partido simulado'],shareTxt:'¡Únete a mi sala de BidVerse! Código: '},
    en:{title:'Room created',sub:'Send the code or the link to your rival. The game starts on its own as soon as they join.',code:'Room code',link:'Copy link',copy:'Copy code',share:'Share',copied:'Copied!',
      cat3:'Football',you:'You',ready:'Ready',wait:'Waiting for rival',notYet:'Not here yet',waiting:'Waiting',cancel:'Cancel room',back:'← Menu',player:'Player',
      anime:['3 characters per player','$20 to bid','10 s per bid','Team battle'],ufc:['1 fighter per division','8 divisions','$40 to bid','Fight night'],futbol:['11 players · 4-3-3','100M to sign','50 legends + 250 current','Simulated match'],shareTxt:'Join my BidVerse room! Code: '}};
  const lt=k=>(LB[typeof lang!=='undefined'&&LB[lang]?lang:'es'])[k];
  let lbClock=0,lbT0=0,lbRoom=null;
  const url=c=>location.origin+location.pathname+'?sala='+c;
  const copy=txt=>(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>{say('lbOk',lt('copied'));setTimeout(()=>say('lbOk',''),1800)},()=>prompt(lt('link'),txt));
  function paintLobby(){
    const m=lbRoom;if(!m)return;const cat=m.cat||lastCat,el=$('lobby'),nm=myName||($('olName')&&$('olName').value)||'—';
    el.className='lobby lb-'+cat;
    el.innerHTML=`<div class="lb-card">
<div class="lb-band"><button class="lb-back" id="lbBack">${lt('back')}</button><span class="lb-cat">${cat==='ufc'?'UFC':cat==='futbol'?(lt('cat3')||'Fútbol'):'Anime'}</span></div>
<div class="lb-body"><h2 class="lb-h">${lt('title')}</h2><p class="lb-sub">${lt('sub')}</p>
<small class="lb-lbl">${lt('code')}</small><div class="lb-code" aria-label="${m.code}">${String(m.code).split('').map(c=>`<b>${c}</b>`).join('')}</div>
<div class="lb-acts"><button class="lb-btn p" id="lbLink">${lt('link')}</button><button class="lb-btn" id="lbCopy">${lt('copy')}</button>${navigator.share?`<button class="lb-btn" id="lbShare">${lt('share')}</button>`:''}</div>
<p class="lb-ok" id="lbOk" aria-live="polite"></p>
<div class="lb-vs"><div class="lb-pl me"><span class="lb-n">1</span><div><b>${nm.replace(/[<>&]/g,'')}</b><small>${lt('you')} · ${lt('ready')}</small></div></div>
<i class="lb-x">VS</i>
<div class="lb-pl wait"><span class="lb-n">2</span><div><b>${lt('wait')}<em class="lb-dots"><i></i><i></i><i></i></em></b><small>${lt('notYet')} · <span id="lbTime">0:00</span></small></div></div></div>
<ul class="lb-rules">${lt(cat==='ufc'||cat==='futbol'?cat:'anime').map(r=>`<li>${r}</li>`).join('')}</ul>
<button class="lb-cancel" id="lbCancel">${lt('cancel')}</button></div></div>`;
    $('lbBack').onclick=$('lbCancel').onclick=()=>olCancel();
    $('lbLink').onclick=()=>copy(url(m.code));$('lbCopy').onclick=()=>copy(m.code);
    if($('lbShare'))$('lbShare').onclick=()=>navigator.share({title:'BidVerse',text:lt('shareTxt')+m.code,url:url(m.code)}).catch(()=>{});
    tickLobby();
  }
  function tickLobby(){const e=$('lbTime');if(!e)return;const s=Math.floor((Date.now()-lbT0)/1000);e.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
  function lobby(m){
    let el=$('lobby');if(!el){$('menu').insertAdjacentHTML('afterend','<section id="lobby" class="lobby"></section>');el=$('lobby')}
    const fresh=!document.body.classList.contains('inlobby')||!lbRoom||lbRoom.code!==m.code;
    lbRoom=m;if(fresh)lbT0=Date.now();
    document.body.classList.add('inlobby');$('menu').style.display='none';paintLobby();
    clearInterval(lbClock);lbClock=setInterval(tickLobby,1000);
    if(fresh&&!(history.state&&history.state.bvLobby))try{history.pushState({bvLobby:1},'',location.pathname+location.search+'#sala')}catch(e){}
    scrollTo(0,0);
  }
  function hideLobby(toMenu){
    clearTimeout(lbShow);clearInterval(lbClock);lbRoom=null;
    if(!document.body.classList.contains('inlobby'))return;
    document.body.classList.remove('inlobby');const el=$('lobby');if(el)el.innerHTML='';
    if(toMenu)$('menu').style.display='block';
    if(location.hash==='#sala')try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  }
  window.addEventListener('popstate',()=>{if(document.body.classList.contains('inlobby'))olCancel()}); // botón Atrás = cancelar sala
  const sl=window.setLang;window.setLang=function(l){sl(l);if(lbRoom)paintLobby()};
})();

/* ===== menu.js (fusionado) ===== */
/* BidVerse · menú de inicio: inicio de sesión (perfil local), crear sala desde la pancarta, unirse con código. Textos ES/EN propios. */
(function(){
  const $=id=>document.getElementById(id);
  const M={es:{have:'¿Te han pasado un código de sala?',codePh:'CÓDIGO',join:'Unirse',create:'Crear sala',login:'Iniciar sesión',logout:'Cerrar sesión',loginTitle:'Iniciar sesión',user:'Nombre de usuario',loginBtn:'Entrar',hi:'Hola, ',connecting:'Conectando con la sala…'},
           en:{have:'Got a room code?',codePh:'CODE',join:'Join',create:'Create room',login:'Log in',logout:'Log out',loginTitle:'Log in',user:'Username',loginBtn:'Enter',hi:'Hi, ',connecting:'Connecting to the room…'}};
  const dict=()=>M[typeof lang!=='undefined'&&M[lang]?lang:'es'];
  const get=()=>{try{return localStorage.getItem('bvuser')||''}catch(e){return ''}};
  const put=v=>{try{v?localStorage.setItem('bvuser',v):localStorage.removeItem('bvuser');localStorage.setItem('bvname',v)}catch(e){}};
  let user=get(),pend=null;
  function paint(){const x=dict();
    document.querySelectorAll('[data-m]').forEach(e=>e.textContent=x[e.dataset.m]);
    document.querySelectorAll('[data-mph]').forEach(e=>e.placeholder=x[e.dataset.mph]);
    $('hLogin').textContent=user?x.logout:x.login;$('acct').textContent=user?x.hi+user:'';$('acct').style.display=user?'':'none'}
  const sw=window.setLang;window.setLang=function(l){sw(l);paint()};paint();
  window.openLogin=()=>{$('lgName').value='';$('login').classList.add('open');setTimeout(()=>$('lgName').focus(),50)};
  window.closeLogin=()=>{$('login').classList.remove('open');pend=null};
  window.doLogin=()=>{const n=$('lgName').value.trim();if(!n){$('lgName').focus();return}
    user=n;put(n);const f=pend;$('login').classList.remove('open');pend=null;paint();if(f)f()};
  window.loginBtn=()=>{if(user){user='';put('');paint()}else openLogin()};
  const need=fn=>{if(user)fn();else{openLogin();pend=fn}}; // sin sesión: pide el nombre y luego sigue con lo que querías hacer
  const go=fn=>{openOnline('olConn');if(location.protocol==='file:')return;$('olName').value=user;fn()};
  window.mkRoom=cat=>{if(window.bvPreload)bvPreload(cat);need(()=>go(()=>olCreate(cat)))};
  const join=()=>{const c=$('hCode').value.trim();if(!c){$('hCode').focus();return}need(()=>go(()=>{$('olCode').value=c.toUpperCase();olJoin()}))};
  $('hJoin').onclick=join;$('hCode').onkeydown=e=>{if(e.key==='Enter')join()};
  const m=/[?&]sala=([A-Za-z0-9]{5})/i.exec(location.search);
  if(m){$('hCode').value=m[1].toUpperCase();
    try{history.replaceState(null,'',location.pathname+location.search.replace(/[?&]sala=[A-Za-z0-9]{5}/i,'').replace(/^&/,'?')+location.hash)}catch(e){}
    if(location.protocol!=='file:')setTimeout(join,0)}
})();