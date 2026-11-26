// Extrae un fotograma de un clip a JPEG a tamaño completo: node tools/clipframe.mjs clips/park1.mp4 7.9 clips/park1_last.jpg
import { launch, serve, open } from './cdp.mjs';
import path from 'node:path'; import fs from 'node:fs';
const [clip, t, out] = process.argv.slice(2);
const srv = await serve(path.resolve('..'), 3224, path.resolve('out'));
const cdp = await launch({ port: 9347 });
try {
  await open(cdp, 'http://127.0.0.1:3224/promo/spot.html?noop=1', { width: 300, height: 300 });
  const url = await cdp.eval(`(async()=>{const bl=await (await fetch('/promo/${clip}')).blob();const v=document.createElement('video');v.muted=true;v.src=URL.createObjectURL(bl);await new Promise(r=>v.onloadeddata=r);
    v.currentTime=${t};await new Promise(r=>v.onseeked=r);await new Promise(r=>{v.requestVideoFrameCallback(()=>r());setTimeout(r,500)});
    const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);return c.toDataURL('image/jpeg',0.95)})()`);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log('ok', out);
} catch (e) { console.error('ERROR', e.message); } finally { cdp.kill(); srv.close(); }
