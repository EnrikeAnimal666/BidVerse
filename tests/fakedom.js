// DOM falso mínimo para probar game.js/online.js sin navegador (solo lógica; no comprueba el aspecto)
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
      if(k==='querySelector')return()=>null;
      if(k==='querySelectorAll')return()=>[];
      if(k==='offsetWidth')return 0;
      if(k==='matches')return()=>false;
      if(typeof k==='symbol'||k==='then')return undefined; // 'then' indefinido: si no, await del elemento se queda colgado
      return()=>{};
    },
    set(t,k,v){t[k]=v;return true}
  });return stub;
}

module.exports={mkEl};
