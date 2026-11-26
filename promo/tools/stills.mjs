// Uso (SPOT=spot2.html para el segundo spot): node tools/stills.mjs <carpeta_salida> sheet:<nombre>:<t1,t2,...> | still:<nombre>:<t>  (varios)
import { launch, serve, open } from './cdp.mjs';
import path from 'node:path'; import fs from 'node:fs';
const root = path.resolve('..');
const [outDir, ...jobs] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const srv = await serve(root, 3212, path.resolve('out'));
const cdp = await launch({ port: 9335 });
try {
  await open(cdp, 'http://127.0.0.1:3212/promo/' + (process.env.SPOT || 'spot.html') + (process.env.SITE ? '?site=' + encodeURIComponent(process.env.SITE) : ''), { width: 900, height: 1000 });
  for (let i = 0; i < 300; i++) { const r = await cdp.eval('window.SPOT_READY ? 1 : (window.SPOT_ERROR || 0)'); if (r === 1) break; if (r) throw new Error(r); await new Promise(r => setTimeout(r, 200)); }
  for (const j of jobs) {
    const [kind, name, arg, extra] = j.split(':');
    const t0 = Date.now();
    const url = kind === 'sheet' ? await cdp.eval(`SPOT.sheet([${arg}], ${extra || 4}, 0.25)`) : await cdp.eval(`SPOT.still(${arg}, ${extra || 0.5})`);
    fs.writeFileSync(path.join(outDir, name + '.jpg'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('ok', name, Date.now() - t0, 'ms');
  }
} catch (e) { console.error('ERROR', e.message); } finally { cdp.kill(); srv.close(); }
