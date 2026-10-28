process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// High-Performance Streaming & HLS Proxy for Kairou
// Runs locally on the user's PC to eliminate CORS restrictions and buffer latency
import { Readable } from 'node:stream';

function srtToVtt(srtText) {
  if (!srtText || typeof srtText !== 'string') return 'WEBVTT\n\n';
  let clean = srtText.replace(/^\uFEFF/, '').trim();
  if (clean.startsWith('WEBVTT')) {
    return clean
      .replace(/<font[^>]*>/gi, '')
      .replace(/<\/font>/gi, '')
      .replace(/\{\\[^}]+\}/g, '');
  }
  clean = clean
    .replace(/\r\n|\r/g, '\n')
    .replace(/(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})/g, (_m, h, m, s, ms) => {
      const hh = h ? (h.length === 1 ? `0${h}` : h) : '00';
      return `${hh}:${m}:${s}.${ms}`;
    })
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/\{\\[^}]+\}/g, '');
  return `WEBVTT\n\n${clean}`;
}

export default async function handler(req, res) {
  // Global CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query?.url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(200).json({ ok: true, service: 'Kairou Turbo Proxy Online' });
  }

  try {
    const parsedTarget = new URL(targetUrl);
    const forwardHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Referer': `${parsedTarget.origin}/`,
    };

    if (req.headers?.range) {
      forwardHeaders['Range'] = req.headers.range;
    }

    let upstreamRes;
    try {
      upstreamRes = await fetch(targetUrl, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: forwardHeaders,
        redirect: 'follow',
      });
    } catch (fetchErr) {
      // Se falhar em HTTPS por certificado autoassinado ou porta bloqueada, tenta HTTP puro
      if (targetUrl.startsWith('https://')) {
        const httpUrl = targetUrl.replace(/^https:\/\//i, 'http://');
        upstreamRes = await fetch(httpUrl, {
          method: req.method === 'HEAD' ? 'HEAD' : 'GET',
          headers: forwardHeaders,
          redirect: 'follow',
        });
      } else {
        throw fetchErr;
      }
    }

    let status = upstreamRes.status;
    if (status >= 400 && targetUrl.startsWith('https://')) {
      try {
        const httpUrl = targetUrl.replace(/^https:\/\//i, 'http://');
        const altRes = await fetch(httpUrl, {
          method: req.method === 'HEAD' ? 'HEAD' : 'GET',
          headers: forwardHeaders,
          redirect: 'follow',
        });
        if (altRes.status < 400) {
          upstreamRes = altRes;
          status = upstreamRes.status;
        }
      } catch {}
    }
    if (status >= 400) {
      res.statusCode = status;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.end(`Upstream returned HTTP ${status}`);
    }

    const contentType = upstreamRes.headers.get('content-type') || '';
    const isVttRequest =
      req.query?.format === 'vtt' ||
      targetUrl.includes('.srt') ||
      targetUrl.includes('.vtt') ||
      targetUrl.includes('strem.io/en/download') ||
      contentType.includes('subrip') ||
      contentType.includes('text/vtt');

    if (isVttRequest && req.method !== 'HEAD') {
      const text = await upstreamRes.text();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      if (typeof res.send === 'function') {
        return res.send(srtToVtt(text));
      }
      return res.end(srtToVtt(text));
    }

    const isM3u8 =
      targetUrl.includes('.m3u8') ||
      targetUrl.includes('master.txt') ||
      contentType.includes('mpegurl') ||
      contentType.includes('application/x-mpegURL') ||
      contentType.includes('vnd.apple.mpegurl');

    // Se for playlist HLS (m3u8 ou master.txt), reescreve segmentos para passar pelo proxy local
    if (isM3u8 && req.method !== 'HEAD') {
      const text = await upstreamRes.text();

      // Validação de formato HLS
      if (!text.includes('#EXTM3U') && !text.includes('#EXT-X')) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.end('Invalid HLS playlist from upstream');
      }

      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

      const lines = text.split('\n');
      const rewritten = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // Tags HLS com URI="..." (ex: chaves de criptografia #EXT-X-KEY)
        if (trimmed.startsWith('#')) {
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
              const fullUri = uri.startsWith('http') ? uri : new URL(uri, baseUrl).toString();
              return `URI="/api/proxy?url=${encodeURIComponent(fullUri)}"`;
            });
          }
          return line;
        }

        // Linha de URL de segmento ou sub-playlist
        const fullSegmentUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, baseUrl).toString();
        return `/api/proxy?url=${encodeURIComponent(fullSegmentUrl)}`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.status(200).send(rewritten.join('\n'));
    }

    // Stream de mídia binária (MP4, TS, AAC, etc.)
    res.statusCode = status;
    const passHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    for (const h of passHeaders) {
      const val = upstreamRes.headers.get(h);
      if (val) res.setHeader(h, val);
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (req.method === 'HEAD' || !upstreamRes.body) {
      return res.end();
    }

    // Piping contínuo com controle de fluxo / backpressure nativo
    const nodeStream = Readable.fromWeb(upstreamRes.body);
    nodeStream.on('error', (err) => {
      if (!res.headersSent) {
        res.statusCode = 502;
        res.end(`Stream error: ${err.message}`);
      }
    });
    if (typeof res.on === 'function') {
      res.on('close', () => {
        try {
          nodeStream.destroy();
        } catch {}
      });
    }
    nodeStream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`Proxy error: ${err.message}`);
    }
  }
}

