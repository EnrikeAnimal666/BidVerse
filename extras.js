/* BidVerse · extras: ventana de créditos (de dónde salen las fotos y sus licencias), instalar como app (PWA) y service worker.
   Va después de game.js, cpu.js y online.js: usa lang, setLang e IMG_URLS (data-imgs.js). */
(function(){
  const $=id=>document.getElementById(id);
  const T={
    es:{credits:'Créditos',install:'Instalar app',
      crPhotos:'Fotos de UFC y fútbol',
      crPhotosTxt:'Salen de Wikipedia y Wikimedia Commons. Cada foto tiene su autor y su licencia (casi siempre Creative Commons): pulsa un nombre para abrir la página de la foto, donde aparecen los dos.',
      crAnime:'Personajes de anime',
      crAnimeTxt:'Los personajes, sus nombres y sus imágenes pertenecen a sus autores, editoriales y estudios. BidVerse es un proyecto de fans sin ánimo de lucro y no está afiliado con ninguno de ellos. Las fotos que no vienen con el juego se buscan en MyAnimeList (a través de la API de Jikan).',
      crData:'Datos',crDataTxt:'Las escalas de poder y las medias son una estimación propia del juego, no datos oficiales.',
      crFonts:'Tipografías y librerías',crFontsTxt:'Nunito y Big Shoulders Display, de Google Fonts (licencia SIL Open Font). Los combates y partidos en 3D usan three.js (licencia MIT).',
      crList:'Ver las {0} fotos y sus fuentes'},
    en:{credits:'Credits',install:'Install app',
      crPhotos:'UFC and football photos',
      crPhotosTxt:'They come from Wikipedia and Wikimedia Commons. Each photo has its own author and license (almost always Creative Commons): click a name to open the photo page, which shows both.',
      crAnime:'Anime characters',
      crAnimeTxt:'Characters, their names and their images belong to their creators, publishers and studios. BidVerse is a non-profit fan project and is not affiliated with any of them. Photos not bundled with the game are looked up on MyAnimeList (through the Jikan API).',
      crData:'Data',crDataTxt:'Power scales and ratings are the game\'s own estimates, not official data.',
      crFonts:'Fonts and libraries',crFontsTxt:'Nunito and Big Shoulders Display, from Google Fonts (SIL Open Font License). The 3D fights and matches use three.js (MIT License).',
      crList:'See all {0} photos and their sources'}};
  const x=k=>(T[typeof lang!=='undefined'&&T[lang]?lang:'en'])[k];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
  function texts(){document.querySelectorAll('[data-x]').forEach(e=>e.textContent=x(e.dataset.x))}

  /* ---------- créditos ---------- */
  // URL de la miniatura -> página del archivo en Wikipedia/Commons (allí están el autor y la licencia)
  function filePage(u){
    const m=/\/wikipedia\/([a-z-]+)\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/.exec(u||'');if(!m)return null;
    return (m[1]==='commons'?'https://commons.wikimedia.org':'https://'+m[1]+'.wikipedia.org')+'/wiki/File:'+m[2];
  }
  window.openCredits=function(){
    const urls=typeof IMG_URLS!=='undefined'?IMG_URLS:{};
    const list=Object.keys(urls).sort((a,b)=>a.localeCompare(b)).map(n=>{const p=filePage(urls[n]);return p?`<li><a href="${esc(p)}" target="_blank" rel="noopener noreferrer">${esc(n)}</a></li>`:''}).join('');
    const n=(list.match(/<li>/g)||[]).length;
    $('crBody').innerHTML=`<section><h4>${x('crPhotos')}</h4><p>${x('crPhotosTxt')}</p>${n?`<details><summary>${x('crList').replace('{0}',n)}</summary><ul class="cr-list">${list}</ul></details>`:''}</section>
<section><h4>${x('crAnime')}</h4><p>${x('crAnimeTxt')}</p></section>
<section><h4>${x('crData')}</h4><p>${x('crDataTxt')}</p></section>
<section><h4>${x('crFonts')}</h4><p>${x('crFontsTxt')}</p></section>`;
    $('credits').classList.add('open');
  };
  window.closeCredits=()=>$('credits').classList.remove('open');
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCredits()});

  /* ---------- instalar como app ---------- */
  let ask=null;
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();ask=e;$('pwaBtn').hidden=false});
  addEventListener('appinstalled',()=>{ask=null;$('pwaBtn').hidden=true});
  window.pwaInstall=()=>{if(!ask)return;ask.prompt();ask.userChoice.finally(()=>{ask=null;$('pwaBtn').hidden=true})};
  // service worker: guarda la web para abrirla rápido y jugar contra la IA sin conexión (las partidas online siguen necesitando red)
  if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

  if(typeof setLang==='function'){const sl=window.setLang;window.setLang=function(l){sl(l);texts()}}
  texts();
})();
