// Comprueba el MP4 en Chrome: duración, tamaño, audio y hoja de fotogramas decodificados.
import { launch, serve, open } from './cdp.mjs';
import path from 'node:path'; import fs from 'node:fs';
const file = process.argv[2] || 'BidVerse_promo.mp4', sheetOut = process.argv[3];
const srv = await serve(path.resolve('..'), 3215, path.resolve('out'));
const cdp = await launch({ port: 9338 });
try {
  await open(cdp, 'http://127.0.0.1:3215/promo/spot.html?noop=1', { width: 600, height: 600 });
  const r = await cdp.eval(`(async()=>{
    const b = await (await fetch('/promo/out/${file}')).blob();
    const v = document.createElement('video'); v.muted = false; v.src = URL.createObjectURL(b); v.preload = 'auto';
    await new Promise((ok, ko) => { v.onloadeddata = ok; v.onerror = () => ko(new Error('error de vídeo ' + (v.error && v.error.code))); });
    const info = { size: b.size, duration: v.duration, w: v.videoWidth, h: v.videoHeight };
    v.volume = 1; await v.play().catch(e => info.playErr = e.message); await new Promise(r => setTimeout(r, 1500)); v.pause();
    info.audioBytes = v.webkitAudioDecodedByteCount; info.videoBytes = v.webkitVideoDecodedByteCount;
    const times = [0.5, 3.0, 5.0, 6.0, 7.2, 9.0, 11.0, 13.5, 17.0, 19.5, 21.5, 23.0, 24.5, 26.5, 29.5, 32.0];
    const sc = 0.2, cols = 8, c = document.createElement('canvas'); c.width = 1080 * sc * cols; c.height = 1920 * sc * 2; const x = c.getContext('2d');
    for (let i = 0; i < times.length; i++) {
      v.currentTime = times[i]; await new Promise(r => v.onseeked = r); await new Promise(r => { v.requestVideoFrameCallback(() => r()); setTimeout(r, 400); });
      x.drawImage(v, (i % cols) * 1080 * sc, Math.floor(i / cols) * 1920 * sc, 1080 * sc, 1920 * sc);
      x.fillStyle = '#ff0'; x.font = '700 20px monospace'; x.fillText(times[i], (i % cols) * 1080 * sc + 6, Math.floor(i / cols) * 1920 * sc + 22);
    }
    info.sheet = c.toDataURL('image/jpeg', 0.8);
    return info;
  })()`);
  if (sheetOut) fs.writeFileSync(sheetOut, Buffer.from(r.sheet.split(',')[1], 'base64'));
  delete r.sheet; console.log(JSON.stringify(r));
} catch (e) { console.error('ERROR', e.message); process.exitCode = 1; } finally { cdp.kill(); srv.close(); }
