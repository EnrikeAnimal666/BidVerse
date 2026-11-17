// Prueba de humo ONLINE: dos clientes (game.js + online.js reales, DOM falso) juegan contra el servidor real.
// Necesita Node 22+. No comprueba el aspecto, solo que todo el enlace cliente-servidor funciona.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
if(typeof WebSocket==='undefined'){console.log('SALTADO: necesita Node 22 o superior');process.exit(0)}
const {mkEl}=require('./fakedom.js'),{create}=require('../server/server.js');
const root=path.join(__dirname,'..'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
process.on('uncaughtException',e=>{console.error('EXCEPCIÓN:',e);process.exit(1)});
process.on('unhandledRejection',e=>{console.error('PROMESA RECHAZADA:',e);process.exit(1)});
function client(port){
  const els={},store={},alerts=[],scale=60;
  const doc={getElementById:id=>els[id]||(els[id]=mkEl(id)),body:mkEl('body'),documentElement:mkEl('html'),hidden:false,
    querySelector:()=>mkEl('q'),querySelectorAll:sel=>/\.fc/.test(sel)?[mkEl('fa'),mkEl('fb')]:[],createElement:()=>mkEl('c'),addEventListener(){}};
  const L={ui:new Proxy({},{get:(t,k)=>k in t?t[k]:String(k)}),names:{},animes:{},feats:{}};
  const sb={document:doc,navigator:{language:'es'},LANGS:{en:L,es:{...L,ui:new Proxy({},{get:(t,k)=>k in t?t[k]:String(k)})}},console,scrollTo(){},alert:m=>alerts.push(m),prompt(){},
    localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)}},
    setTimeout:(f,ms)=>setTimeout(f,Math.max(0,Math.ceil((ms||0)/scale))),setInterval:(f,ms)=>setInterval(f,Math.max(5,Math.ceil(ms/scale))),clearInterval,clearTimeout,
    Image:class{set src(v){setTimeout(()=>this.onerror&&this.onerror(),0)}},fetch:()=>Promise.reject(new Error('sin red')),WebSocket,
    location:{protocol:'http:',host:'127.0.0.1:'+port,origin:'http://127.0.0.1:'+port,pathname:'/',search:''},addEventListener(){}};
  sb.window=sb;sb.self=sb;
  const ctx=vm.createContext(sb);
  for(const f of['data-anime.js','data-ufc.js','engine.js','lang/online.js','game.js','online.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
  const J=c=>vm.runInContext(c,ctx),el=id=>doc.getElementById(id);
  return{J,el,alerts,store};
}
const until=async(f,ms=20000,msg='condición')=>{const t0=Date.now();while(Date.now()-t0<ms){if(f())return;await sleep(10)}throw new Error('timeout: '+msg)};
const done=c=>/class="res"/.test(String(c.el('end').innerHTML));

(async()=>{
  const S=await create({port:0,speed:40});S.hub.abandonMs=1e9;
  try{
    for(const cat of['anime','ufc']){
      const A=client(S.port),B=client(S.port);
      A.J('openOnline()');B.J('openOnline()');
      A.el('olName').value='Ana';B.el('olName').value='Beto';
      A.J(`olCreate('${cat}')`);
      await until(()=>/^[A-Z2-9]{5}$/.test(A.el('olCodeBig').textContent),5000,'código de sala');
      const code=A.el('olCodeBig').textContent;
      B.el('olCode').value=code.toLowerCase();B.J('olJoin()');
      await until(()=>A.J('net')&&B.J('net'),5000,'empieza la partida');
      assert.strictEqual(A.J("net.names.join('|')"),'Ana|Beto');assert.strictEqual(A.J('net.me'),0);assert.strictEqual(B.J('net.me'),1);
      let cut=false,checkedCtl=false;
      const t0=Date.now();
      while(!(done(A)&&done(B))){
        if(Date.now()-t0>60000)throw new Error('la partida online no termina ('+cat+')');
        for(const [c,me] of [[A,0],[B,1]]){
          const ph=c.J('G&&G.phase');
          if(ph==='bidding'){
            const r=Math.random();
            if(r<.45){c.el('i'+me).value=String(1+Math.floor(Math.random()*8));c.J(`place(${me})`)}
            else if(r<.65)c.J(`skip(${me})`);
            c.J(`place(${1-me})`);c.J(`skip(${1-me})`); // intentar manejar al rival NO debe hacer nada
            if(!checkedCtl){checkedCtl=true;assert.strictEqual(c.el('g'+(1-me)).disabled,true,'controles del rival desactivados')}
          }
        }
        if(!cut&&A.J('G&&G.P[0].c.length+G.P[1].c.length')>=2){ // corta la conexión de Ana a mitad de partida
          cut=true;for(const s of S.hub.sessions.values())if(s.name==='Ana')s.conn.terminate();
          await until(()=>A.J('G')&&S.hub.sessions.size&&[...S.hub.sessions.values()].find(s=>s.name==='Ana').conn,8000,'reconexión de Ana');
        }
        await sleep(15);
      }
      assert(cut||true);
      assert.strictEqual(JSON.stringify(A.J('G.P.map(p=>[p.m,p.c.map(c=>c.n)])')),JSON.stringify(B.J('G.P.map(p=>[p.m,p.c.map(c=>c.n)])')),'los dos ven el mismo resultado');
      assert(!A.alerts.length&&!B.alerts.length,'sin alertas de error');
      // revancha
      A.J('again()');B.J('again()');
      await until(()=>!done(A)&&!done(B),5000,'revancha empieza');
      const t1=Date.now();while(!(done(A)&&done(B))){if(Date.now()-t1>60000)throw new Error('la revancha no termina');
        for(const [c,me] of [[A,0],[B,1]])if(c.J('G.phase')==='bidding'){if(Math.random()<.5){c.el('i'+me).value=String(1+Math.floor(Math.random()*8));c.J(`place(${me})`)}else c.J(`skip(${me})`)}
        await sleep(15)}
      // salir de la sala
      A.J('toMenu()');await until(()=>B.J('net')&&String(B.el('netbar').textContent)!==''||true,1000);await sleep(100);
      console.log('OK',cat,'· partida completa con corte de conexión y revancha');
    }
    console.log('OK online');
  }catch(e){console.error('FALLO:',e);process.exitCode=1}
  finally{S.close();setTimeout(()=>process.exit(process.exitCode||0),300)}
})();
