// Hoja de fotogramas de un clip: node tools/clipsheet.mjs clips/park1.mp4 salida.jpg [t1,t2,...]
import { launch, serve, open } from './cdp.mjs';
import path from 'node:path'; import fs from 'node:fs';
const [clip, out, ts] = process.argv.slice(2);
const srv = await serve(path.resolve('..'), 3222, path.resolve('out'));
const cdp = await launch({ port: 9345 });
try {
  await open(cdp, 'http://127.0.0.1:3222/promo/spot.html?noop=1', { width: 300, height: 300 });
  const r = await cdp.eval(`(async()=>{
    const bl=await (await fetch('/promo/${clip}')).blob();const v=document.createElement('video');v.muted=true;v.src=URL.createObjectURL(bl);await new Promise((r,j)=>{v.onloadeddata=r;v.onerror=()=>j(new Error('video error '+(v.error&&v.error.code)))});
    const times=${ts ? '[' + ts + ']' : 'null'}||[0.2,1,2,3,4,5,6,7.5].filter(t=>t<v.duration);
    const sc=0.22,cols=4,w=v.videoWidth*sc,h=v.videoHeight*sc,c=document.createElement('canvas');c.width=w*cols;c.height=h*Math.ceil(times.length/cols);const x=c.getContext('2d');
    for(let i=0;i<times.length;i++){v.currentTime=times[i];await new Promise(r=>v.onseeked=r);await new Promise(r=>{v.requestVideoFrameCallback(()=>r());setTimeout(r,400)});x.drawImage(v,(i%cols)*w,Math.floor(i/cols)*h,w,h);x.fillStyle='#ff0';x.font='700 18px monospace';x.fillText(times[i].toFixed(1),(i%cols)*w+5,Math.floor(i/cols)*h+20)}
    return {d:v.duration,w:v.videoWidth,h:v.videoHeight,url:c.toDataURL('image/jpeg',.82)}})()`);
  fs.writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64'));
  console.log(JSON.stringify({ duration: r.d, w: r.w, h: r.h }));
} catch (e) { console.error('ERROR', e.message); } finally { cdp.kill(); srv.close(); }
