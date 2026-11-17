'use strict';
/* BidVerse · genera data-imgs.js con la foto de Wikipedia de cada peleador de UFC y cada futbolista.
   Así el juego no tiene que preguntar a Wikipedia durante la partida (y no choca con su límite de peticiones).
   Uso:  node tools/build-imgs.js        (vuelve a ejecutarlo si añades jugadores nuevos) */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var ');
const out = {};
new Function('out', read('data-anime.js') + read('data-ufc.js') + read('data-futbol.js') + ';out.ufc=UFC;out.futbol=FUT')(out);

const UA = { 'User-Agent': 'BidVerse-image-builder/1.0 (game asset script)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = 'https://en.wikipedia.org/w/api.php?format=json&';
async function get(qs) {
  for (let k = 0; k < 5; k++) {
    const r = await fetch(api + qs, { headers: UA });
    if (r.status === 429) { await sleep(5000 * (k + 1)); continue; }
    if (!r.ok) return {};
    return (await r.json()).query || {};
  }
  return {};
}
const thumbs = '&prop=pageimages|pageprops&ppprop=disambiguation&piprop=thumbnail&pithumbsize=320&pilimit=50';
const good = pg => pg && pg.thumbnail && !(pg.pageprops && 'disambiguation' in pg.pageprops);

(async () => {
  const all = [...out.ufc, ...out.futbol], res = {}, miss = [];
  for (let i = 0; i < all.length; i += 50) { // 1) por título exacto, 50 por petición
    const ch = all.slice(i, i + 50), q = await get('action=query&redirects=1' + thumbs + '&titles=' + encodeURIComponent(ch.map(c => c.q).join('|')));
    const nm = {}, rd = {}, byT = {};
    (q.normalized || []).forEach(x => nm[x.from] = x.to); (q.redirects || []).forEach(x => rd[x.from] = x.to);
    Object.values(q.pages || {}).forEach(pg => { if (good(pg)) byT[pg.title] = pg.thumbnail.source; });
    ch.forEach(c => { let t = nm[c.q] || c.q; t = rd[t] || t; byT[t] ? res[c.n] = byT[t].split('?')[0] : miss.push(c); });
    await sleep(700);
  }
  console.log('Por título:', Object.keys(res).length, '· a buscar:', miss.length);
  for (const c of miss) { // 2) los que faltan, con el buscador (igual que hacía el juego)
    const q = await get('action=query&generator=search&gsrlimit=1' + thumbs + '&gsrsearch=' + encodeURIComponent(c.q + ' ' + (c.kind === 'futbol' ? 'footballer' : 'mixed martial artist')));
    const pg = Object.values(q.pages || {})[0];
    if (good(pg)) res[c.n] = pg.thumbnail.source.split('?')[0]; else console.log('  sin foto:', c.n);
    await sleep(700);
  }
  const body = '// Generado por tools/build-imgs.js — fotos de Wikipedia de UFC y fútbol. No editar a mano.\nconst IMG_URLS=' + JSON.stringify(res, null, 0).replace(/","/g, '",\n"') + ';\n';
  fs.writeFileSync(path.join(ROOT, 'data-imgs.js'), body);
  console.log('Hecho:', Object.keys(res).length, 'de', all.length, 'fotos → data-imgs.js');
})();
