// Servidor de Streaming Local Cinetuga para PC
// Executa os provedores Stremio (FrostStream, FenixFlix, Zeus) e o Turbo Proxy HLS/MP4
// diretamente na sua máquina local, com latência mínima e ZERO dependência de BRFLIX.

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
import systemHandler from '../api/system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

// Configuração de Proxies Reversos de Addons (espelha o vite.config.js para produção local)
const REVERSE_PROXIES = [
  { prefix: '/api-fenixflix', target: 'https://fenixflix.fenixhub.online' },
  { prefix: '/api-clickhost', target: 'https://embed-api.clickhost.xyz' },
  { prefix: '/api-mgeb', target: 'https://mgeb.top' },
  { prefix: '/api-superflix', target: 'https://superflixapi.beer' },
  { prefix: '/api-warez', target: 'https://warezcdn.lat' },
];

// Tipos MIME para arquivos estáticos
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

// Descobre o IP da rede local (Wi-Fi / Ethernet)
function getLocalNetworkIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
        return net.address;
      }
    }
  }
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return res.end();

  // Parsing da URL e query params
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
  else if (pathname.startsWith('/api/system')) apiHandler = systemHandler;

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

  // Se qualquer rota começar com /api e não foi tratada, retornar 404 JSON (NUNCA index.html!)
  if (pathname.startsWith('/api') || pathname.startsWith('/api-')) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'Endpoint não encontrado' }));
  }

  // 3. Se a pasta 'dist' existir, serve o frontend compilado
  if (fs.existsSync(DIST_DIR)) {
    let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);

    // Se arquivo não existe, fallback para SPA (index.html) apenas para rotas normais
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

  // Página informativa se a pasta dist ainda não foi compilada
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.statusCode = 200;
  res.end(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Cinetuga - Servidor Local</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #0b0f19; color: #fff; padding: 40px; text-align: center; }
        .box { max-width: 600px; margin: 40px auto; background: #131b2e; padding: 30px; border-radius: 12px; border: 1px solid #1f293d; }
        h1 { color: #6366f1; }
        p { color: #94a3b8; font-size: 16px; line-height: 1.6; }
        code { background: #0f172a; padding: 4px 8px; border-radius: 6px; color: #38bdf8; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>🚀 Cinetuga PC Streaming Server Online!</h1>
        <p>O motor de streaming Stremio (Frost, Fenix, Zeus) está rodando localmente com latência ultra-baixa.</p>
        <p>Para abrir a interface web no navegador, execute em outro terminal:</p>
        <p><code>npm run dev</code></p>
        <p>Ou gere a versão de produção com <code>npm run build</code> para servir tudo por este servidor!</p>
      </div>
    </body>
    </html>
  `);
});

server.listen(PORT, HOST, () => {
  const lanIp = getLocalNetworkIp();
  console.log('\n' + '='.repeat(60));
  console.log('   🚀 Cinetuga PC STREAMING SERVER - MOTOR LOCAL NATIVO');
  console.log('='.repeat(60));
  console.log('  ⚡ Provedores Stremio Nativos (Sem BRFLIX):');
  console.log('     • FrostStream (4K Ultra HD & 1080p Dublado)');
  console.log('     • FenixFlix   (1080p Dublado / Legendado)');
  console.log('     • Zeus        (1080p Dublado / Legendado)');
  console.log('     • Turbo Proxy (HLS M3U8 & MP4 com Range 206 local)');
  console.log('');
  console.log('  🔗 Como assistir:');
  console.log(`     • No seu PC:        http://localhost:${PORT}`);
  console.log(`     • Celular/TV/Wi-Fi: http://${lanIp}:${PORT}`);
  console.log('');
  console.log('  👥 Compartilhar com amigos fora de casa:');
  console.log(`     • Inicie o Cloudflare Tunnel: cloudflared tunnel --url http://localhost:${PORT}`);
  console.log(`     • Ou use Tailscale / ngrok http ${PORT}`);
  console.log('='.repeat(60) + '\n');
});

