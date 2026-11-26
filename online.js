/* BidVerse · CLIENTE ONLINE: sala (crear/entrar), conexión con el servidor y reconexión automática.
   No decide nada del juego: manda "pujo"/"paso" y pinta lo que el servidor responde (usa startOnline/netState/netFight de game.js). */
(function(){
  const $=id=>document.getElementById(id);
  let ws=null,token=null,myName='',retry=0,wantOpen=false,connected=false,room=null,pending=null,peerOff=false,rcTimer=0,inGame=false,lastCat='anime',iCreated=false,lbShow=0,seekCat=null;
  try{token=localStorage.getItem('bvtoken');myName=localStorage.getItem('bvname')||''}catch(e){}
  const say=(id,txt)=>{const e=$(id);if(e)e.textContent=txt||''};
  const bar=txt=>{const b=$('netbar');if(!b)return;b.style.display=txt?'block':'none';b.textContent=txt||''};
  const show=v=>{['olForm','olWait','olConn'].forEach(x=>{const e=$(x);if(e)e.style.display=x===v?'block':'none'})};
  const send=o=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))};
  const myAv=()=>window.bvAv?bvAv():null; // personaje elegido como foto de perfil (lo pone el menú)
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
  window.olCancel=function(){pending=null;if(seekCat){seekCat=null;send({t:'unseek'})}send({t:'leave'});olReset();closeOnline();hideLobby(true)};
  // BUSCAR PARTIDA: el servidor te empareja con el primero que esté buscando en la misma categoría
  window.olSeek=function(cat){if(location.protocol==='file:'){alert(u('olNoServer'));return}
    seekCat=cat;lastCat=cat;iCreated=false;preload(cat);pending={t:'seek',cat};seekScreen(cat);flush()};
  window.olUnseek=function(){if(!seekCat)return;seekCat=null;pending=null;send({t:'unseek'});hideLobby(true)};
  window.olCopy=function(){const url=location.origin+location.pathname+'?sala='+room.code;
    (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>say('olCopyOk',u('olCopied')),()=>{prompt(u('olCopy'),url)})};
  function flush(){if(connected&&pending){const p=pending;pending=null;
    send({t:'hello',name:name()||undefined,av:myAv(),token,auth:window.bvAuth?bvAuth():undefined}); // refresca el nombre y el avatar antes de crear/entrar
    send(p)}else if(!connected)connect()}

  function connect(){
    if(ws&&(ws.readyState===0||ws.readyState===1))return;
    wantOpen=true;bar(retry?u('olReconnecting'):'');
    ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');
    ws.onopen=()=>{retry=0;send({t:'hello',name:name()||undefined,av:myAv(),token,auth:window.bvAuth?bvAuth():undefined})};
    ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}on(m)};
    ws.onclose=()=>{connected=false;ws=null;if(!wantOpen)return;if(inGame||room)bar(u('olReconnecting'));clearTimeout(rcTimer);rcTimer=setTimeout(connect,Math.min(8000,500*2**retry++))};
    ws.onerror=()=>{};
  }

  function on(m){switch(m.t){
    case 'welcome':connected=true;token=m.token;if(seekCat&&!room&&!inGame&&!pending)pending={t:'seek',cat:seekCat}; // se cortó mientras buscaba: vuelve a la cola
      if(!m.user&&window.bvAuth&&bvAuth()&&window.bvLoggedOut)bvLoggedOut(); // el servidor no reconoce la sesión guardada
      try{localStorage.setItem('bvtoken',token);if(!myName)localStorage.setItem('bvname',m.name)}catch(e){}
      if(!myName)$('olName').value=m.name;flush();break;
    case 'room': // sala en espera (o actualización)
      room=m;preload(m.cat);if(m.phase==='lobby'){inGame=false;$('olCodeBig').textContent=m.code;say('olCopyOk','');closeOnline();clearTimeout(lbShow);lbShow=setTimeout(()=>lobby(m),iCreated?0:300)}break; // sala en espera: pantalla propia
    case 'seeking':if(seekCat){const e=$('skN');if(e)e.textContent=m.n>1?lt('seekN').replace('{0}',m.n):''}break;
    case 'start': // empieza (o se reanuda / revancha) una partida
      seekCat=null;clearTimeout(lbShow);hideLobby(false);
      room=Object.assign(room||{},{code:room&&room.code,cat:m.cat,names:m.names,you:m.you});inGame=true;closeOnline();bar('');peerOff=false;
      startOnline(m.cat,m.names,m.you,send,m.avs);break;
    case 'state':if(inGame&&net)netState(m.s,m.ev);break;
    case 'tick':if(inGame&&net){left=G.left=m.left;timer();tickSnd()}break;
    case 'fight':if(inGame&&net)netFight(m);break;
    case 'order':if(inGame&&net)netOrder(m);break;
    case 'orderReady':if(inGame&&net)netOrderReady(m.i);break;
    case 'peer':if(m.connected){peerOff=false;bar(u('olPeerBack'));setTimeout(()=>{if(!peerOff)bar('')},2500)}else{peerOff=true;bar(u('olPeerOff'))}break;
    case 'again':{const b=document.querySelector('.res p');if(b)b.textContent=u('olAgainAsk')}break;
    case 'peerleft':bar((m.timeout?u('olTimeout'):u('olPeerLeft'))+(m.pts&&window.bvPtsText?' '+bvPtsText(m.pts,m.you,true):''));if(net){const b=document.createElement('button');b.textContent=u('olBackMenu');b.onclick=()=>toMenu();$('netbar').appendChild(b)}room=null;inGame=false;break;
    case 'kicked':wantOpen=false;bar(u('olKicked'));hideLobby(true);break;
    case 'err':{const msg=errText(m.code);if(seekCat){seekCat=null;hideLobby(true)}
      if(m.code==='needLogin'&&window.openLogin){if(window.bvLoggedOut)bvLoggedOut();closeOnline();openLogin('in');break} // sin sesión: ventana de cuenta
      if($('online').classList.contains('open')){const c=$('olConn');if(c&&c.style.display!=='none')show('olForm');say('olErr',msg)}else if(net)err(net.me,t(m.code,m.arg));else alert(msg)}break;
  }}
  function preload(c){try{if(c&&typeof wantImg==='function'&&POOLS[c])wantImg(POOLS[c])}catch(e){}} // fotos de la categoría mientras se espera al rival
  window.bvPreload=preload;
  window.addEventListener('beforeunload',()=>{wantOpen=false});

  /* ---------- PANTALLA DE ESPERA: al crear una sala te lleva aquí hasta que entra el rival ---------- */
  const LB={es:{title:'Sala creada',sub:'Pásale el código o el enlace a tu rival. La partida empieza sola en cuanto entre.',code:'Código de sala',link:'Copiar enlace',copy:'Copiar código',share:'Compartir',copied:'¡Copiado!',
      cat3:'Fútbol',you:'Tú',ready:'Listo',wait:'Esperando rival',notYet:'Todavía no ha entrado',waiting:'Esperando',cancel:'Cancelar sala',back:'← Menú',player:'Jugador',
      anime:['3 personajes por jugador','$20 para pujar','10 s por puja','Combate por equipos'],ufc:['1 peleador por categoría','8 categorías','$40 para pujar','Noche de combates'],futbol:['11 jugadores · 4-3-3','100M para fichar','50 leyendas + 250 actuales','Partido simulado'],shareTxt:'¡Únete a mi sala de BidVerse! Código: ',
      seekT:'Buscando rival',seekSub:'Te emparejamos con el primero que busque partida en esta categoría. La partida empieza sola.',seekCpu:'Jugar contra la CPU mientras tanto',seekCancel:'Dejar de buscar',seekN:'{0} jugadores buscando ahora'},
    en:{title:'Room created',sub:'Send the code or the link to your rival. The game starts on its own as soon as they join.',code:'Room code',link:'Copy link',copy:'Copy code',share:'Share',copied:'Copied!',
      cat3:'Football',you:'You',ready:'Ready',wait:'Waiting for rival',notYet:'Not here yet',waiting:'Waiting',cancel:'Cancel room',back:'← Menu',player:'Player',
      anime:['3 characters per player','$20 to bid','10 s per bid','Team battle'],ufc:['1 fighter per division','8 divisions','$40 to bid','Fight night'],futbol:['11 players · 4-3-3','100M to sign','50 legends + 250 current','Simulated match'],shareTxt:'Join my BidVerse room! Code: ',
      seekT:'Finding an opponent',seekSub:'You will be paired with the first player looking for a game in this category. The game starts on its own.',seekCpu:'Play the CPU meanwhile',seekCancel:'Stop searching',seekN:'{0} players searching now'}};
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
<div class="lb-vs"><div class="lb-pl me">${myAv()&&window.bvAvTag?bvAvTag(myAv(),'lb-n'):'<span class="lb-n">1</span>'}<div><b>${nm.replace(/[<>&]/g,'')}</b><small>${lt('you')} · ${lt('ready')}</small></div></div>
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
  function seekScreen(cat){
    let el=$('lobby');if(!el){$('menu').insertAdjacentHTML('afterend','<section id="lobby" class="lobby"></section>');el=$('lobby')}
    if(!(lbRoom&&lbRoom.seek&&lbRoom.cat===cat))lbT0=Date.now();
    lbRoom={code:'',cat,seek:1};document.body.classList.add('inlobby');$('menu').style.display='none';el.className='lobby lb-'+cat+' lb-seek';
    const av=myAv()&&window.bvAvTag?bvAvTag(myAv(),'sk-me'):'<span class="sk-me">?</span>';
    el.innerHTML=`<div class="lb-card"><div class="lb-band"><button class="lb-back" id="lbBack">${lt('back')}</button><span class="lb-cat">${cat==='ufc'?'UFC':cat==='futbol'?(lt('cat3')||'Fútbol'):'Anime'}</span></div>
<div class="lb-body"><div class="sk-radar" aria-hidden="true"><i></i><i></i><i></i>${av}</div>
<h2 class="lb-h">${lt('seekT')}<em class="lb-dots"><i></i><i></i><i></i></em></h2><p class="lb-sub">${lt('seekSub')}</p>
<p class="sk-t"><b id="lbTime">0:00</b><small id="skN"></small></p>
<ul class="lb-rules">${lt(cat==='ufc'||cat==='futbol'?cat:'anime').map(r=>`<li>${r}</li>`).join('')}</ul>
<div class="lb-acts"><button class="lb-btn" id="skCpu">${lt('seekCpu')}</button></div>
<button class="lb-cancel" id="lbCancel">${lt('seekCancel')}</button></div></div>`;
    $('lbBack').onclick=$('lbCancel').onclick=()=>olUnseek();
    $('skCpu').onclick=()=>{olUnseek();if(window.startCpu)startCpu(cat,2)};
    clearInterval(lbClock);lbClock=setInterval(tickLobby,1000);tickLobby();scrollTo(0,0);
  }
  function hideLobby(toMenu){
    clearTimeout(lbShow);clearInterval(lbClock);lbRoom=null;
    if(!document.body.classList.contains('inlobby'))return;
    document.body.classList.remove('inlobby');const el=$('lobby');if(el)el.innerHTML='';
    if(toMenu)$('menu').style.display='block';
    if(location.hash==='#sala')try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  }
  window.addEventListener('popstate',()=>{if(document.body.classList.contains('inlobby'))olCancel()}); // botón Atrás = cancelar sala
  const sl=window.setLang;window.setLang=function(l){sl(l);if(lbRoom)lbRoom.seek?seekScreen(lbRoom.cat):paintLobby()};
})();

/* ===== CUENTAS Y RANKING ===== */
/* BidVerse · menú de inicio: cuenta (usuario + contraseña guardados en la base de datos del servidor), foto de perfil, ranking,
   crear sala desde la pancarta y unirse con código. Textos ES/EN propios.
   La sesión es un código secreto que da el servidor al entrar: se guarda en este navegador (localStorage 'bvauth') y viaja en cada petición.
   El avatar es SIEMPRE un personaje del juego (no se suben fotos): así nadie puede poner nada ofensivo y no hay nada que moderar. */
(function(){
  const $=id=>document.getElementById(id);
  const M={es:{have:'¿Te han pasado un código de sala?',codePh:'CÓDIGO',join:'Unirse',create:'Crear sala',login:'Iniciar sesión',edit:'Mi perfil',
      signIn:'Iniciar sesión',signUp:'Crear cuenta',profile:'Tu perfil',user:'Usuario',pass:'Contraseña',avatar:'Foto de perfil',
      avSearch:'Busca un personaje o un anime…',avNone:'Sin foto',avEmpty:'Ningún personaje coincide',avPick:'Elegido: ',hi:'Hola, ',
      goIn:'Entrar',goUp:'Crear cuenta',save:'Guardar',logout:'Cerrar sesión',toUp:'¿No tienes cuenta?',toUpB:'Créala aquí',toIn:'¿Ya tienes cuenta?',toInB:'Inicia sesión',
      meLine:'Has iniciado sesión como {0} · {1} puntos',
      e_badName:'El usuario debe tener de 3 a 16 letras o números (también . _ -), sin espacios.',e_badPass:'La contraseña debe tener al menos 6 caracteres.',
      e_taken:'Ese nombre de usuario ya existe.',e_wrong:'Usuario o contraseña incorrectos.',e_slow:'Demasiados intentos. Espera unos minutos.',
      e_net:'No se puede conectar con el servidor.',e_file:'Abre la web desde el servidor (http://localhost:3000) para usar las cuentas y el ranking.',
      connecting:'Conectando con la sala…',play:'Jugar',psTitle:'¿Cómo quieres jugar?',seek:'Buscar partida',seekD:'Online contra otro jugador al azar · cuenta para el ranking',
      cpu:'Contra la CPU',cpuD:'Partida rápida tú solo · elige la dificultad',lv1:'Fácil',lv2:'Normal',lv3:'Difícil',room:'Sala privada',roomD:'Crea una sala y pásale el código a un amigo',rank:'Ranking',rankTitle:'Ranking',rkWeek:'Esta semana',rkAll:'Histórico',rkLoading:'Cargando…',
      rkEmpty:'Todavía no se ha jugado ninguna partida online.',rkEmptyW:'Nadie ha jugado esta semana. ¡Sé el primero!',
      rkNoteW:'Puntos ganados (o perdidos) en las partidas online desde el lunes {0}. Se reinicia solo cada semana.',
      rkNoteA:'Puntuación total. Todos empiezan con 1000: ganar a alguien con más puntos da más y perder contra alguien con menos quita más. Solo cuentan las partidas online entre dos cuentas.',
      rkWLD:'{0} V · {1} D · {2} E',rkYou:'Tú',ptsLine:'{0} puntos de ranking · ahora tienes {1}',ptsLeft:'Ganas por abandono: {0} puntos.',
      stTitle:'Tus estadísticas online',stNone:'Aún no has jugado online con esta cuenta.',stRecent:'Últimas partidas',stStreakW:'Racha: {0} victorias seguidas',stStreakL:'Racha: {0} derrotas seguidas',stVs:'contra {0}',stLeave:'abandono',stTimeout:'no volvió',stLoad:'Cargando…',stErr:'No se han podido cargar.',
      w:'V',l:'D',d:'E',cats:{anime:'Anime',ufc:'UFC',futbol:'Fútbol'}},
    en:{have:'Got a room code?',codePh:'CODE',join:'Join',create:'Create room',login:'Log in',edit:'My profile',
      signIn:'Log in',signUp:'Create account',profile:'Your profile',user:'Username',pass:'Password',avatar:'Profile picture',
      avSearch:'Search a character or an anime…',avNone:'No picture',avEmpty:'No character matches',avPick:'Picked: ',hi:'Hi, ',
      goIn:'Log in',goUp:'Create account',save:'Save',logout:'Log out',toUp:'No account yet?',toUpB:'Create one',toIn:'Already have an account?',toInB:'Log in',
      meLine:'Logged in as {0} · {1} points',
      e_badName:'Usernames need 3 to 16 letters or numbers (. _ - also allowed), no spaces.',e_badPass:'The password needs at least 6 characters.',
      e_taken:'That username is already taken.',e_wrong:'Wrong username or password.',e_slow:'Too many attempts. Wait a few minutes.',
      e_net:'Cannot reach the server.',e_file:'Open the site from the server (http://localhost:3000) to use accounts and the ranking.',
      connecting:'Connecting to the room…',play:'Play',psTitle:'How do you want to play?',seek:'Find a match',seekD:'Online against a random player · counts for the ranking',
      cpu:'Against the CPU',cpuD:'Quick solo game · pick the difficulty',lv1:'Easy',lv2:'Normal',lv3:'Hard',room:'Private room',roomD:'Create a room and send the code to a friend',rank:'Ranking',rankTitle:'Ranking',rkWeek:'This week',rkAll:'All time',rkLoading:'Loading…',
      rkEmpty:'No online games have been played yet.',rkEmptyW:'Nobody has played this week. Be the first!',
      rkNoteW:'Points won (or lost) in online games since Monday {0}. Resets on its own every week.',
      rkNoteA:'Total score. Everyone starts at 1000: beating someone with more points gives more, losing to someone with fewer takes more. Only online games between two accounts count.',
      rkWLD:'{0} W · {1} L · {2} D',rkYou:'You',ptsLine:'{0} ranking points · you now have {1}',ptsLeft:'You win by forfeit: {0} points.',
      stTitle:'Your online stats',stNone:'No online games with this account yet.',stRecent:'Recent games',stStreakW:'Streak: {0} wins in a row',stStreakL:'Streak: {0} losses in a row',stVs:'vs {0}',stLeave:'forfeit',stTimeout:'timed out',stLoad:'Loading…',stErr:'Could not load them.',
      w:'W',l:'L',d:'D',cats:{anime:'Anime',ufc:'UFC',futbol:'Football'}}};
  const NAME_RE=/^[\p{L}\p{N}][\p{L}\p{N}._-]{2,15}$/u; // la misma regla que el servidor (server/db.js)
  const dict=()=>M[typeof lang!=='undefined'&&M[lang]?lang:'es'];
  const fmt=(s,...a)=>s.replace(/\{(\d+)\}/g,(m,i)=>a[i]??m);
  const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k)||'';v?localStorage.setItem(k,v):localStorage.removeItem(k)}catch(e){return ''}};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
  const ANIME=POOLS.anime,isAv=n=>!!n&&ANIME.some(c=>c.n===n);
  const shown=c=>(LANGS[lang]&&LANGS[lang].names&&LANGS[lang].names[c.n])||c.n; // Frieza -> Freezer en español
  const local=location.protocol==='file:';
  // ---- sesión ----
  let tok=ls('bvauth'),me=tok&&ls('bvuser')?{name:ls('bvuser'),av:isAv(ls('bvav'))?ls('bvav'):null,rating:+ls('bvpts')||0}:null,sel='',pend=null,mode='in',busy=false,rkTab='week',rkReq=0;
  const save=()=>{ls('bvauth',tok||'');ls('bvuser',me?me.name:'');ls('bvname',me?me.name:'');ls('bvav',me&&me.av||'');ls('bvpts',me?String(me.rating):'')};
  const api=(path,body)=>local?Promise.reject(new Error('file')):fetch('/api/'+path,{method:body?'POST':'GET',
      headers:Object.assign({'Content-Type':'application/json'},tok?{Authorization:'Bearer '+tok}:{}),body:body?JSON.stringify(body):undefined})
    .then(r=>r.json().catch(()=>({err:'server'})).then(j=>Object.assign(j,{status:r.status})));
  const dropLocal=()=>{tok='';me=null;save();paint()};
  window.bvAuth=()=>tok||null;
  window.bvAv=()=>me&&me.av||null;
  window.bvLoggedOut=()=>{if(tok)dropLocal()}; // el servidor no reconoce la sesión (caducada o base de datos nueva)
  const avTag=(n,cls)=>`<span class="${cls} pav" data-n="${esc(n)}">${avInner(n)}</span>`;
  window.bvAvTag=avTag;
  function paint(){const x=dict();
    document.querySelectorAll('[data-m]').forEach(e=>e.textContent=x[e.dataset.m]);
    document.querySelectorAll('[data-mph]').forEach(e=>e.placeholder=x[e.dataset.mph]);
    $('hLogin').textContent=me?x.edit:x.login;$('hLogin').className='cta '+(me?'s':'p'); // con sesión, el botón pasa a segundo plano
    const a=$('acct');a.innerHTML=me?(me.av?avTag(me.av,'hav'):'')+`<span>${esc(x.hi+me.name)}</span>`:'';a.style.display=me?'':'none';
    if($('login').classList.contains('open'))paintModal();
    if($('rank').classList.contains('open'))rankTab(rkTab)}
  // ---- selector de avatar ----
  function pick(){const x=dict(),c=ANIME.find(c=>c.n===sel);$('avCur').textContent=c?x.avPick+shown(c)+' · '+c.a:x.avPick+x.avNone}
  function grid(){
    const x=dict(),q=$('avQ').value.trim().toLowerCase();
    const list=ANIME.filter(c=>!q||[c.n,shown(c),c.a].some(s=>s.toLowerCase().includes(q)));
    $('avGrid').innerHTML=(q?'':`<button type="button" class="avo none${sel?'':' on'}" data-av=""><span>${x.avNone}</span></button>`)+
      list.map(c=>`<button type="button" class="avo${sel===c.n?' on':''}" data-av="${esc(c.n)}" title="${esc(shown(c)+' · '+c.a)}" aria-label="${esc(shown(c))}"><span data-n="${esc(c.n)}">${avInner(c.n)}</span></button>`).join('')+
      (list.length?'':`<p class="avno">${x.avEmpty}</p>`);
    pick();if(typeof wantImg==='function')wantImg(list);
  }
  $('avGrid').onclick=e=>{const b=e.target.closest('.avo');if(!b)return;sel=b.dataset.av;$('avGrid').querySelectorAll('.avo').forEach(o=>o.classList.toggle('on',o===b));pick()};
  $('avQ').oninput=grid;
  // ---- ventana de cuenta: 'in' = iniciar sesión · 'up' = crear cuenta · 'me' = perfil (con la sesión iniciada) ----
  function paintModal(){const x=dict();
    $('lgTitle').textContent=mode==='me'?x.profile:mode==='up'?x.signUp:x.signIn;
    $('lgUserF').style.display=$('lgPassF').style.display=mode==='me'?'none':'';
    $('lgAvF').style.display=mode==='in'?'none':'';
    $('lgMe').style.display=mode==='me'?'':'none';$('lgMe').textContent=me?fmt(x.meLine,me.name,me.rating):'';
    $('lgGo').textContent=mode==='me'?x.save:mode==='up'?x.goUp:x.goIn;
    $('lgOut').style.display=mode==='me'?'':'none';
    $('lgStats').style.display=mode==='me'?'':'none';if(mode==='me')stats();
    $('lgSwP').style.display=mode==='me'?'none':'';$('lgSwT').textContent=mode==='up'?x.toIn:x.toUp;$('lgSw').textContent=mode==='up'?x.toInB:x.toUpB;
    $('lgPass').autocomplete=mode==='up'?'new-password':'current-password';
    if(mode!=='in')grid()}
  // ---- estadísticas del perfil: victorias/derrotas/empates online por categoría, racha y últimas partidas (GET /api/stats) ----
  const wld=(o,x)=>`${o.w} ${x.w} · ${o.l} ${x.l} · ${o.d} ${x.d}`;
  let stReq=0;
  async function stats(){const x=dict(),el=$('lgStats'),id=++stReq;
    const box=body=>{el.innerHTML=`<h3 class="st-h">${x.stTitle}</h3>${body}`};
    box(`<p class="st-none">${x.stLoad}</p>`);
    if(local){box(`<p class="st-none">${x.e_file}</p>`);return}
    const r=await api('stats').catch(()=>null);if(id!==stReq)return;
    if(r&&r.status===401){mode='in';dropLocal();return} // la sesión ya no vale: pasa a iniciar sesión (mode antes de dropLocal, que repinta la ventana)
    if(!r||!r.total){box(`<p class="st-none">${x.stErr}</p>`);return}
    const n=r.total.w+r.total.l+r.total.d;if(!n){box(`<p class="st-none">${x.stNone}</p>`);return}
    const st=r.streak>1?`<p class="st-streak w">${fmt(x.stStreakW,r.streak)}</p>`:r.streak<-1?`<p class="st-streak l">${fmt(x.stStreakL,-r.streak)}</p>`:'';
    const cats=['anime','ufc','futbol'].filter(k=>r.cats[k]).map(k=>`<li><span>${x.cats[k]}</span><b>${wld(r.cats[k],x)}</b></li>`).join('');
    const rec=r.recent.map(g=>`<li class="st-g ${g.res}"><i>${x[g.res]}</i><span>${esc(fmt(x.stVs,g.opp))}<small>${x.cats[g.cat]||esc(g.cat)}${g.reason==='leave'?' · '+x.stLeave:g.reason==='timeout'?' · '+x.stTimeout:''}</small></span><b>${g.d>0?'+':''}${g.d}</b></li>`).join('');
    box(`<p class="st-tot">${wld(r.total,x)}</p>${st}<ul class="st-cats">${cats}</ul><h4>${x.stRecent}</h4><ol class="st-rec">${rec}</ol>`);
  }
  const err=t=>{$('lgErr').textContent=t||''};
  window.openLogin=m=>{mode=me?'me':(m==='up'?'up':'in');sel=me&&me.av||'';$('avQ').value='';err('');if(!me)$('lgPass').value='';
    paintModal();$('login').classList.add('open');setTimeout(()=>(mode==='me'?$('lgGo'):$('lgName')).focus(),50)};
  window.closeLogin=()=>{$('login').classList.remove('open');pend=null};
  window.lgSwitch=()=>{mode=mode==='up'?'in':'up';err('');paintModal();$('lgName').focus()};
  window.doLogin=async()=>{const x=dict();if(busy)return;
    if(local){err(x.e_file);return}
    if(mode!=='me'){const n=$('lgName').value.normalize('NFC').trim(),p=$('lgPass').value;
      if(mode==='up'&&!NAME_RE.test(n)){err(x.e_badName);$('lgName').focus();return}
      if(!n){$('lgName').focus();return}
      if(mode==='up'&&p.length<6){err(x.e_badPass);$('lgPass').focus();return}
      if(!p){$('lgPass').focus();return}}
    busy=true;$('lgGo').disabled=true;err('');
    try{
      if(mode==='me'){const r=await api('profile',{av:isAv(sel)?sel:null});
        if(r.user){me=r.user;save();closeLogin();paint()}else if(r.status===401){dropLocal();mode='in';paintModal()}else err(x.e_net)}
      else{const r=await api(mode==='up'?'register':'login',{user:$('lgName').value.normalize('NFC').trim(),pass:$('lgPass').value,av:mode==='up'&&isAv(sel)?sel:undefined});
        if(r.token){tok=r.token;me=r.user;save();$('lgPass').value='';const f=pend;$('login').classList.remove('open');pend=null;paint();if(f)f()}
        else err(x['e_'+r.err]||x.e_net)}
    }catch(e){err(local?x.e_file:x.e_net)}
    finally{busy=false;$('lgGo').disabled=false}};
  window.doLogout=()=>{const t=tok;dropLocal();closeLogin();if(t&&!local)fetch('/api/logout',{method:'POST',headers:{Authorization:'Bearer '+t}}).catch(()=>{})};
  window.loginBtn=()=>openLogin();
  $('acct').onclick=()=>openLogin();
  // ---- puntos de ranking al acabar una partida online (los manda el servidor con el combate) ----
  const ptsText=(pts,i)=>{const d=pts.d[i];return fmt(dict().ptsLine,(d>0?'+':'')+d,pts.r[i])};
  window.bvPtsText=(pts,i,left)=>pts&&pts.d?(left&&pts.d[i]>0?fmt(dict().ptsLeft,'+'+pts.d[i]):ptsText(pts,i)):'';
  window.bvPts=(pts,i)=>{if(!pts||!pts.d)return;if(me){me.rating=pts.r[i];save()}
    const r=[...document.querySelectorAll('.res')].pop();if(!r)return;const old=r.querySelector('.rkpts');if(old)old.remove();
    const d=pts.d[i],p=document.createElement('p');p.className='rkpts'+(d>0?' up':d<0?' down':'');p.textContent=ptsText(pts,i);
    const b=r.querySelector('button');b?r.insertBefore(p,b):r.appendChild(p)};
  // ---- ranking: esta semana / histórico ----
  window.openRank=()=>{$('rank').classList.add('open');rankTab(rkTab)};
  window.closeRank=()=>$('rank').classList.remove('open');
  window.rankTab=async k=>{rkTab=k==='all'?'all':'week';const x=dict(),L=$('rkList'),id=++rkReq,msg=t=>`<p class="rkmsg">${t}</p>`;
    document.querySelectorAll('#rank .tabs button').forEach(b=>b.classList.toggle('on',b.dataset.rk===rkTab));
    $('rkNote').textContent=rkTab==='week'?fmt(x.rkNoteW,''):x.rkNoteA;
    if(local){L.innerHTML=msg(x.e_file);return}
    L.innerHTML=msg(x.rkLoading);
    let r=null;try{r=await api('ranking?period='+rkTab)}catch(e){}
    if(id!==rkReq)return;
    if(!r||!Array.isArray(r.rows)){L.innerHTML=msg(x.e_net);return}
    if(r.since)$('rkNote').textContent=fmt(x.rkNoteW,new Date(r.since).toLocaleDateString(lang==='es'?'es-ES':'en-GB',{day:'numeric',month:'numeric'}));
    if(!r.rows.length){L.innerHTML=msg(rkTab==='week'?x.rkEmptyW:x.rkEmpty);return}
    const row=p=>`<li class="${p.me?'me':''}${p.pos<=3?' t'+p.pos:''}"><b class="rk-pos">${p.pos}</b>${p.av&&isAv(p.av)?avTag(p.av,'rk-av'):`<span class="rk-av">${esc((p.name[0]||'?').toUpperCase())}</span>`}`+
      `<span class="rk-nm"><b>${esc(p.name)}${p.me?` <em>${x.rkYou}</em>`:''}</b><small>${fmt(x.rkWLD,p.w,p.l,p.d)}</small></span><strong class="rk-pt">${rkTab==='week'&&p.pts>0?'+':''}${p.pts}</strong></li>`;
    L.innerHTML=`<ol class="rkl">${r.rows.map(row).join('')}</ol>${r.me?`<ol class="rkl rk-me">${row(r.me)}</ol>`:''}`;
    if(typeof wantImg==='function')wantImg(r.rows.concat(r.me||[]).map(p=>ANIME.find(c=>c.n===p.av)).filter(Boolean))};
  const sw=window.setLang;window.setLang=function(l){sw(l);paint()};paint();
  if(tok&&!local)api('me').then(r=>{if(r.user){me=r.user;save();paint()}else if(r.status===401)dropLocal()}).catch(()=>{}); // comprueba la sesión guardada
  // ---- salas: para jugar online hace falta haber iniciado sesión ----
  const need=fn=>{if(me)fn();else{openLogin('in');pend=fn}}; // sin sesión: pide entrar (o crear cuenta) y luego sigue con lo que querías hacer
  const go=fn=>{openOnline('olConn');if(local)return;$('olName').value=me.name;fn()};
  window.mkRoom=cat=>{if(window.bvPreload)bvPreload(cat);need(()=>go(()=>olCreate(cat)))};
  let psCat='anime';
  window.playSheet=cat=>{psCat=cat;if(window.bvPreload)bvPreload(cat);$('psCat').textContent=u(cat==='ufc'?'cat2':cat==='futbol'?'cat3':'cat1');$('play').className='modal open ps-'+cat;setTimeout(()=>$('psSeek').focus(),50)};
  window.closePlay=()=>$('play').classList.remove('open');
  $('psSeek').onclick=()=>{closePlay();need(()=>{if(local){openOnline('olConn');return}olSeek(psCat)})};
  $('psRoom').onclick=()=>{closePlay();mkRoom(psCat)};
  document.querySelectorAll('#play [data-lv]').forEach(b=>b.onclick=()=>{closePlay();if(window.bvPreload)bvPreload(psCat);startCpu(psCat,+b.dataset.lv)});
  const join=()=>{const c=$('hCode').value.trim();if(!c){$('hCode').focus();return}need(()=>go(()=>{$('olCode').value=c.toUpperCase();olJoin()}))};
  $('hJoin').onclick=join;$('hCode').onkeydown=e=>{if(e.key==='Enter')join()};
  const m=/[?&]sala=([A-Za-z0-9]{5})/i.exec(location.search);
  if(m){$('hCode').value=m[1].toUpperCase();
    try{history.replaceState(null,'',location.pathname+location.search.replace(/[?&]sala=[A-Za-z0-9]{5}/i,'').replace(/^&/,'?')+location.hash)}catch(e){}
    if(!local)setTimeout(join,0)}
})();
