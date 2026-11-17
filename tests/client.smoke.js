// Prueba de humo del cliente: ejecuta game.js REAL contra un DOM falso y un reloj simulado. Comprueba que la lógica de enlace no lanza errores
// y que partidas completas (anime y UFC) llegan hasta el final. NO comprueba cómo se ve nada.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
function mkEl(id){
  const store={id,value:'',textContent:'',innerHTML:'',disabled:false,dataset:{},className:'',_cls:new Set(),placeholder:''};
  const stub=new Proxy(store,{
    get(t,k){
      if(k in t)return t[k];
      if(k==='classList')return{add:(...a)=>a.forEach(x=>t._cls.add(x)),remove:(...a)=>a.forEach(x=>t._cls.delete(x)),toggle:(x,f)=>{const on=f===undefined?!t._cls.has(x):f;on?t._cls.add(x):t._cls.delete(x);return on},contains:x=>t._cls.has(x)};
      if(k==='style')return t.style||(t.style={setProperty(){},display:'',width:''});
      if(k==='children')return new Proxy([],{get:(a,i)=>mkEl('child'+String(i))});
      if(k==='firstElementChild'||k==='querySelector'&&0)return mkEl('first');
      if(k==='insertAdjacentHTML')return(w,h)=>{t.innerHTML+=h};
      if(k==='querySelector')return()=>mkEl('q');
      if(k==='querySelectorAll')return()=>[];
      if(k==='offsetWidth')return 0;
      if(k==='getBoundingClientRect')return()=>({left:0,top:0,width:100,height:100});
      if(k==='matches')return()=>false;
      if(typeof k==='symbol'||k==='then')return undefined; // 'then' indefinido: si no, await del elemento se queda colgado
      return()=>{};
    },
    set(t,k,v){t[k]=v;return true}
  });return stub;
}
function run(cat,seed,opts={}){
  const els={},clock={now:0,q:[],id:0};
  const st=(fn,ms)=>{const id=++clock.id;clock.q.push({id,at:clock.now+(ms||0),fn});return id};
  const si=(fn,ms)=>{const id=++clock.id;const rec={id,at:clock.now+ms,fn:()=>{rec.at=clock.now+ms;clock.q.push(rec);fn()}};clock.q.push(rec);return id};
  const clr=id=>{clock.q=clock.q.filter(x=>x.id!==id)};
  const doc={getElementById:id=>els[id]||(els[id]=mkEl(id)),body:mkEl('body'),documentElement:mkEl('html'),hidden:false,
    querySelector:()=>mkEl('q'),querySelectorAll:sel=>/\.fc/.test(sel)?[mkEl('fa'),mkEl('fb')]:[],createElement:()=>mkEl('c'),addEventListener(){}};
  const ui=new Proxy({},{get:(_,k)=>String(k)});
  const L={ui,names:{},animes:{},feats:{}};
  let seedN=seed;const rng=()=>{seedN=(seedN*1664525+1013904223)%4294967296;return seedN/4294967296};
  class Img{set src(v){st(()=>this.onerror&&this.onerror(),0)}}
  const sandbox={document:doc,window:{},navigator:{language:'es'},localStorage:{getItem:()=>null,setItem(){}},LANGS:{en:L,es:L},
    setTimeout:st,setInterval:si,clearInterval:clr,clearTimeout:clr,Image:Img,fetch:()=>Promise.reject(new Error('sin red')),console,scrollTo(){},
    Math:Object.assign(Object.create(Math),{random:rng}),Promise,JSON,Set,Map,Array,Object,Number,String,Proxy,Date,
    addEventListener(){},location:{}};
  sandbox.window=sandbox;sandbox.self=sandbox;
  const ctx=vm.createContext(sandbox);
  const errors=[];
  for(const f of['data-anime.js','data-ufc.js','engine.js','game.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
  return{ctx,els,clock,errors};
}
async function drain(h,until,maxSteps=200000){
  let steps=0;
  while(steps++<maxSteps){
    if(until())return true;
    h.clock.q.sort((a,b)=>a.at-b.at||a.id-b.id);
    const x=h.clock.q.shift();if(!x)return until();
    h.clock.now=Math.max(h.clock.now,x.at);x.fn();
    for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r)); // deja correr las promesas
  }
  throw new Error('demasiados pasos');
}
const J=(h,code)=>require('vm').runInContext(code,h.ctx);
async function play(cat,seed){
  const h=run(cat,seed);
  J(h,`start('${cat}')`);
  let ticks=0;
  // un jugador "humano" pulsa botones al azar mientras la subasta está viva
  const human=()=>{
    const g=J(h,'G');if(g.phase==='fight')return;
    const p=Math.random()<.5?0:1,a=Math.random();
    if(g.phase==='bidding'){
      if(a<.5){h.els['i'+p]=h.els['i'+p]||h.ctx.document.getElementById('i'+p);h.ctx.document.getElementById('i'+p).value=String(Math.floor(Math.random()*22));J(h,`place(${p})`)}
      else if(a<.75)J(h,`skip(${p})`);
    }
  };
  let guard=0;
  while(J(h,'G.phase')!=='fight'&&guard++<4000){
    human();
    // avanza un poco el reloj simulado (varios eventos)
    for(let k=0;k<3&&h.clock.q.length;k++){h.clock.q.sort((a,b)=>a.at-b.at||a.id-b.id);const x=h.clock.q.shift();h.clock.now=Math.max(h.clock.now,x.at);x.fn();await new Promise(r=>setImmediate(r))}
  }
  assert.strictEqual(J(h,'G.phase'),'fight','la subasta debe llegar al combate');
  // deja que se reproduzca todo el combate
  const done=()=>{const e=h.ctx.document.getElementById('end');return /class="res[ "]/.test(String(e.innerHTML))};
  // anime: pantalla de orden de combate → los dos pulsan "Listo" (el jugador 2 antes sube a su último luchador)
  const click=ds=>J(h,`LU&&LU.el.onclick({target:{closest:()=>({disabled:false,dataset:${JSON.stringify(ds)}})}})`);
  await drain(h,()=>J(h,'!!LU')||done());
  if(J(h,'!!LU')){if(J(h,'P[1].c.length')>1)click({p:'1',k:String(J(h,'P[1].c.length')-1),d:'-1'});click({go:'0'});click({go:'1'});assert(!J(h,'LU'),'la pantalla de orden se cierra')}
  await drain(h,done);
  assert(done(),'el combate termina y muestra el resultado');
  const P=J(h,'G.P');
  assert(P[0].m>=0&&P[1].m>=0);
  return{t:Math.round(h.clock.now/1000),n0:P[0].c.length,n1:P[1].c.length};
}
process.on('unhandledRejection',e=>{throw e});
(async()=>{
  let ok=0;const rows=[];
  for(const cat of['anime','ufc'])for(let s=1;s<=15;s++){const r=await play(cat,s*7919);ok++;if(s<=2)rows.push(cat+' #'+s+': '+JSON.stringify(r))}
  console.log(rows.join('\n'));console.log('OK',ok,'partidas completas (subasta + combate) sin errores');process.exit(0);
})().catch(e=>{console.error('FALLO:',e);process.exit(1)});
