// Renderiza el spot 2 (parque + fútbol): node tools/render2.mjs [nombre.mp4] [url-de-la-web]
import { launch, serve, open } from './cdp.mjs';
import path from 'node:path';
const name = process.argv[2] || 'BidVerse_park_football.mp4', site = process.argv[3] || '';
const srv = await serve(path.resolve('..'), 3221, path.resolve('out'));
const cdp = await launch({ port: 9344 });
try {
  await open(cdp, `http://127.0.0.1:3221/promo/spot2.html${site ? '?site=' + encodeURIComponent(site) : ''}`, { width: 900, height: 1000 });
  for (let i = 0; i < 300; i++) { const r = await cdp.eval('window.SPOT_READY ? 1 : (window.SPOT_ERROR || 0)'); if (r === 1) break; if (r) throw new Error(r); await new Promise(r => setTimeout(r, 200)); }
  console.log(JSON.stringify(await cdp.eval(`SPOT.render({ name: ${JSON.stringify(name)} })`)));
} catch (e) { console.error('ERROR', e.message); process.exitCode = 1; } finally { cdp.kill(); srv.close(); }
