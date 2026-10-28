process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import react from '@vitejs/plugin-react';
import extractHandler from './api/extract.js';
import proxyHandler from './api/proxy.js';
import channelsHandler from './api/channels.js';
import matchesHandler from './api/matches.js';

function vercelApiPlugin() {
  const handlerMiddleware = async (req, res, next) => {
    if (!req.url) return next();

    let handler = null;
    if (req.url.startsWith('/api/extract')) {
      handler = extractHandler;
    } else if (req.url.startsWith('/api/proxy')) {
      handler = proxyHandler;
    } else if (req.url.startsWith('/api/channels')) {
      handler = channelsHandler;
    } else if (req.url.startsWith('/api/matches')) {
      handler = matchesHandler;
    }

    if (handler) {
      const urlObj = new URL(req.url, 'http://localhost');
      const query = Object.fromEntries(urlObj.searchParams.entries());

      let body = {};
      if (req.method === 'POST' || req.method === 'PUT') {
        try {
          const buffers = [];
          for await (const chunk of req) {
            buffers.push(chunk);
          }
          const raw = Buffer.concat(buffers).toString();
          if (raw) {
            try {
              body = JSON.parse(raw);
            } catch {
              body = raw;
            }
          }
        } catch (e) {
          console.warn('[Vite API] Erro ao ler body:', e);
        }
      }

      const fakeReq = { query, method: req.method, body, headers: req.headers };
      // Suporte completo a funções serverless no Vite (incluindo streaming, piping e chunking)
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      };
      res.send = (data) => {
        res.end(data);
      };

      try {
        await handler(fakeReq, res);
      } catch (e) {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      }
      return;
    }
    next();
  };

  return {
    name: 'vercel-api-plugin',
    configureServer(server) {
      server.middlewares.use(handlerMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handlerMiddleware);
    },
  };
}

const proxyConfig = {
  '/api-clickhost': {
    target: 'https://embed-api.clickhost.xyz',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api-clickhost/, ''),
    secure: false,
    headers: {
      Referer: 'https://embed-api.clickhost.xyz/',
      Origin: 'https://embed-api.clickhost.xyz',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },
  '/api-mgeb': {
    target: 'https://mgeb.top',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api-mgeb/, ''),
    secure: false,
    headers: {
      Referer: 'https://mgeb.top/',
      Origin: 'https://mgeb.top',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },
  '/api-superflix': {
    target: 'https://superflixapi.beer',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api-superflix/, ''),
    secure: false,
    headers: {
      Referer: 'https://superflixapi.beer/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },
  '/api-warez': {
    target: 'https://warezcdn.lat',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api-warez/, ''),
    secure: false,
    headers: {
      Referer: 'https://warezcdn.lat/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },
  '/api-pomfy': {
    target: 'https://pomfy.online',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api-pomfy/, ''),
    secure: false,
    headers: {
      Referer: 'https://pomfy.online/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },
  '/api-pomfy-stream': {
    target: 'https://api.pomfy.stream',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api-pomfy-stream/, ''),
    secure: false,
    headers: {
      Referer: 'https://api.pomfy.stream/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },
  '/api-fenixflix': {
    target: 'https://fenixflix.fenixhub.online',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api-fenixflix/, ''),
    secure: false,
    headers: {
      Referer: 'https://fenixflix.fenixhub.online/',
      Origin: 'https://fenixflix.fenixhub.online',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }
};

export default defineConfig({
  resolve: {
    alias: {
      'lucide-react': path.resolve(__dirname, 'src/components/Icons.jsx')
    }
  },
  plugins: [react(), vercelApiPlugin()],
  server: {
    port: 3000,
    open: false,
    allowedHosts: true,
    proxy: proxyConfig
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: proxyConfig
  }
});
