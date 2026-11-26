// Mini cliente de Chrome DevTools Protocol sin dependencias (Node >= 22 trae WebSocket global)
// y servidor estático para servir el proyecto (pics/, bg/, promo/) por http y no ensuciar el canvas.
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.wav': 'audio/wav' };

// Sirve `root`. POST /__save?f=nombre guarda el cuerpo en outDir/nombre (así la página nos devuelve el MP4).
export function serve(root, port, outDir) {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST' && u.pathname === '/__save') {
      const name = path.basename(u.searchParams.get('f') || 'out.bin');
      fs.mkdirSync(outDir, { recursive: true });
      const ws = fs.createWriteStream(path.join(outDir, name));
      req.pipe(ws);
      ws.on('finish', () => { res.writeHead(200); res.end('ok'); });
      return;
    }
    const p = path.join(root, decodeURIComponent(u.pathname));
    if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.stat(p, (e, st) => {
      if (e || !st.isFile()) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(p).pipe(res);
    });
  });
  return new Promise(r => srv.listen(port, '127.0.0.1', () => r(srv)));
}

export async function launch({ port = 9333, headless = true, width = 1080, height = 1920, extra = [] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bvpromo-'));
  const args = [
    `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check',
    '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    `--window-size=${width},${height}`, ...extra, 'about:blank'];
  if (headless) args.unshift('--headless=new');
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  let ver;
  for (let i = 0; i < 100; i++) {
    try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await new Promise(r => setTimeout(r, 150)); }
  }
  if (!ver) throw new Error('Chrome no arrancó');
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find(t => t.type === 'page');
  const cdp = await connect(page.webSocketDebuggerUrl);
  cdp.kill = () => { try { proc.kill(); } catch {} };
  return cdp;
}

export function connect(url) {
  const ws = new WebSocket(url);
  let id = 0; const pend = new Map(); const subs = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { const { ok, ko } = pend.get(m.id); pend.delete(m.id); m.error ? ko(new Error(m.error.message)) : ok(m.result); }
    else if (m.method) (subs.get(m.method) || []).forEach(f => f(m.params));
  };
  const api = {
    send(method, params = {}) { return new Promise((ok, ko) => { const i = ++id; pend.set(i, { ok, ko }); ws.send(JSON.stringify({ id: i, method, params })); }); },
    on(ev, f) { if (!subs.has(ev)) subs.set(ev, []); subs.get(ev).push(f); },
    async eval(expr) {
      const r = await api.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
      return r.result.value;
    },
    close() { ws.close(); },
  };
  return new Promise((ok, ko) => { ws.onopen = () => ok(api); ws.onerror = ko; });
}

export async function open(cdp, url, { width = 1080, height = 1920, scale = 1 } = {}) {
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
  cdp.on('Runtime.consoleAPICalled', p => console.log('[page]', p.args.map(a => a.value ?? a.description).join(' ')));
  cdp.on('Runtime.exceptionThrown', p => console.log('[page error]', p.exceptionDetails.exception?.description || p.exceptionDetails.text));
  const loaded = new Promise(r => cdp.on('Page.loadEventFired', r));
  await cdp.send('Page.navigate', { url });
  await loaded;
}
