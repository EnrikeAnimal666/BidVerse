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
  window.mkRoom=cat=>need(()=>go(()=>olCreate(cat)));
  const join=()=>{const c=$('hCode').value.trim();if(!c){$('hCode').focus();return}need(()=>go(()=>{$('olCode').value=c.toUpperCase();olJoin()}))};
  $('hJoin').onclick=join;$('hCode').onkeydown=e=>{if(e.key==='Enter')join()};
  const m=/[?&]sala=([A-Za-z0-9]{5})/.exec(location.search);if(m)$('hCode').value=m[1].toUpperCase();
})();