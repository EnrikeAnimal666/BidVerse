// Renderiza el spot completo a MP4: node tools/render.mjs [nombre.mp4] [prefer-hardware|prefer-software] [url-de-la-web]
import { launch, serve, open } from './cdp.mjs';
import path from 'node:path';
const name = process.argv[2] || 'BidVerse_promo.mp4', hw = process.argv[3] || 'prefer-hardware', site = process.argv[4] || '';
const srv = await serve(path.resolve('..'), 3214, path.resolve('out'));
const cdp = await launch({ port: 9337 });
try {
  await open(cdp, `http://127.0.0.1:3214/promo/spot.html?hw=${hw}${site ? '&site=' + encodeURIComponent(site) : ''}`, { width: 900, height: 1000 });
  for (let i = 0; i < 300; i++) { const r = await cdp.eval('window.SPOT_READY ? 1 : (window.SPOT_ERROR || 0)'); if (r === 1) break; if (r) throw new Error(r); await new Promise(r => setTimeout(r, 200)); }
  const r = await cdp.eval(`SPOT.exportMP4({ name: ${JSON.stringify(name)} })`);
  console.log(JSON.stringify(r));
} catch (e) { console.error('ERROR', e.message); process.exitCode = 1; } finally { cdp.kill(); srv.close(); }
