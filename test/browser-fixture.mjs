// Local-only browser fixture. It never calls Nexum and is not imported by api/.
// This fixture is deliberately outside public/ and is never part of production.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createHandler } from '../api/index.js';
const env = { NEXUM_CHAT_ID: 'local-test', NEXUM_API_CREDENTIAL: 'local-test', CHECKOUT_SESSION_SECRET: 'local-browser-test-secret-never-use-in-production', WHATSAPP_URL: 'https://wa.me/5575988393742' };
let status = 'PENDING';
const handle = createHandler({ env, fetcher: async (url, options) => {
  if (url.endsWith('/pix/create')) return Response.json({ ok: true, tx_id: 'local_test_transaction', amount: 1597, status: 'PENDING', qr_code_text: 'TESTE LOCAL — NÃO É UM PIX VÁLIDO — NÃO PAGAR', expires_in_seconds: 86400 });
  return Response.json({ ok: true, tx_id: 'local_test_transaction', status, amount: 1597 });
} });
const root = resolve('public');
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/fixture/paid') { status = 'PAID'; res.end('Local test now returns PAID.'); return; }
    if (url.pathname.startsWith('/api/')) {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const result = await handle(new Request(url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined }));
      res.writeHead(result.status, Object.fromEntries(result.headers)); res.end(await result.text()); return;
    }
    const routes = { '/': 'index.html', '/obrigado': 'obrigado.html', '/privacidade': 'privacidade.html' };
    const file = resolve(root, routes[url.pathname] || `.${url.pathname}`);
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  } catch { res.writeHead(404).end(); }
}).listen(4174, '127.0.0.1', () => console.log('Local test only (no real payment): http://127.0.0.1:4174'));
