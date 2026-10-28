// Servidor de Streaming em Produção Kairou
// Executa os extratores (FrostStream, FenixFlix, Zeus), o Turbo Proxy HLS/MP4
// e atende as rotas /api e arquivos estáticos da VPS com latência mínima.

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

import extractHandler from '../api/extract.js';
import proxyHandler from '../api/proxy.js';
import channelsHandler from '../api/channels.js';
import matchesHandler from '../api/matches.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

// Configuração de Proxies Reversos de Addons
const REVERSE_PROXIES = [
  { prefix: '/api-clickhost', target: 'https://embed-api.clickhost.xyz' },
  { prefix: '/api-mgeb', target: 'https://mgeb.top' },
  { prefix: '/api-superflix', target: 'https://superflixapi.beer' },
  { prefix: '/api-warez', target: 'https://warezcdn.lat' },
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
};

function getLocalNetworkIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return res.end();

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const search = parsedUrl.search;
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

  // 1. Roteamento de Proxies Reversos de Addons (/api-fenixflix, etc.)
  for (const p of REVERSE_PROXIES) {
    if (pathname.startsWith(p.prefix)) {
      const subPath = pathname.slice(p.prefix.length);
      const targetUrl = `${p.target}${subPath}${search}`;
      try {
        const upstreamRes = await fetch(targetUrl, {
          method: req.method,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': req.headers.accept || '*/*',
            'Referer': `${p.target}/`,
            'Origin': p.target,
          },
        });

        res.statusCode = upstreamRes.status;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        const ct = upstreamRes.headers.get('content-type');
        if (ct) res.setHeader('Content-Type', ct);

        if (upstreamRes.body) {
          const nodeStream = Readable.fromWeb(upstreamRes.body);
          return nodeStream.pipe(res);
        }
        return res.end();
      } catch (err) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    }
  }

  // 2. Roteamento de APIs Principais
  let apiHandler = null;
  if (pathname.startsWith('/api/extract')) apiHandler = extractHandler;
  else if (pathname.startsWith('/api/proxy')) apiHandler = proxyHandler;
  else if (pathname.startsWith('/api/channels')) apiHandler = channelsHandler;
  else if (pathname.startsWith('/api/matches')) apiHandler = matchesHandler;

  if (apiHandler) {
    let body = {};
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        const buffers = [];
        for await (const chunk of req) buffers.push(chunk);
        const raw = Buffer.concat(buffers).toString();
        if (raw) {
          try {
            body = JSON.parse(raw);
          } catch {
            body = raw;
          }
        }
      } catch (err) {
        console.warn('[Server] Erro ao ler body:', err.message);
      }
    }

    req.query = query;
    req.body = body;

    if (!res.status) {
      res.status = function(code) {
        this.statusCode = code;
        return this;
      };
    }
    if (!res.json) {
      res.json = function(data) {
        this.setHeader('Content-Type', 'application/json; charset=utf-8');
        this.end(JSON.stringify(data));
      };
    }
    if (!res.send) {
      res.send = function(data) {
        this.end(data);
      };
    }

    try {
      await apiHandler(req, res);
    } catch (e) {
      console.error(`[Server API Error ${pathname}]:`, e);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }
    return;
  }

  // Se qualquer rota começar com /api e não foi tratada, retornar 404 JSON
  if (pathname.startsWith('/api') || pathname.startsWith('/api-')) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'Endpoint não encontrado' }));
  }

  // 3. Servir arquivos estáticos do frontend (dist/)
  if (fs.existsSync(DIST_DIR)) {
    let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');

      const stream = fs.createReadStream(filePath);
      return stream.pipe(res);
    }
  }

  // Fallback se a pasta dist ainda não foi gerada
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.statusCode = 200;
  res.end(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Kairou Streaming Server</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #07090e; color: #fff; padding: 40px; text-align: center; }
        .box { max-width: 600px; margin: 40px auto; background: #0f141e; padding: 30px; border-radius: 16px; border: 1px solid #1c2436; }
        h1 { color: #38bdf8; }
        p { color: #94a3b8; font-size: 15px; line-height: 1.6; }
        code { background: #1c2436; padding: 4px 8px; border-radius: 6px; color: #38bdf8; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>✨ Kairou Streaming Server Online</h1>
        <p>Motor de extração e Turbo Proxy HLS ativo.</p>
        <p>Execute <code>npm run build</code> para servir a interface gráfica completa.</p>
      </div>
    </body>
    </html>
  `);
});

server.listen(PORT, HOST, () => {
  const lanIp = getLocalNetworkIp();
  console.log('\n' + '='.repeat(60));
  console.log('   🚀 KAIROU STREAMING - SERVIDOR DE PRODUÇÃO');
  console.log('='.repeat(60));
  console.log(`  🔗 Porta: ${PORT} (http://localhost:${PORT} / http://${lanIp}:${PORT})`);
  console.log('  ⚡ Provedores & Turbo Proxy HLS Ativos');
  console.log('='.repeat(60) + '\n');
});
