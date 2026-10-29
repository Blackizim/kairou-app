/**
 * Cloudflare Worker - Kairou Turbo Ultra-Fast Streaming Proxy
 * URL do seu Worker: https://kairou-proxy.sukiwooky-professional.workers.dev
 * 
 * Otimizações de Ultra Velocidade:
 * 1. Cloudflare Edge Caching (cf: cacheEverything): Armazena chunks .ts e .m4s na memória da Cloudflare (latência < 10ms)
 * 2. Range Requests HTTP 206 nativos com byte-seeking instantâneo
 * 3. Reescrita ultra-rápida de playlists HLS (.m3u8) com preservação de qualidade
 * 4. Stale-While-Revalidate para reprodução instantânea de playlists
 * 5. Bypassing inteligente de bloqueios de IPTV (sem envio de Referer conflitante)
 * 6. Suporte completo a CORS (*) em todos os métodos
 * 7. Conversão instantânea de legendas SRT -> WebVTT em cache
 */

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const VPS_FALLBACK_URL = 'https://kairou.space/api/proxy';

// Conversão rápida de SRT para WebVTT
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

// Cabeçalhos CORS com suporte total a streaming
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers':
      'Content-Length, Content-Range, Accept-Ranges, Content-Type, Content-Disposition',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env, ctx) {
    // 1. Preflight CORS instantâneo
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }

    const requestUrl = new URL(request.url);

    // 2. Extrai a URL alvo
    let targetUrl = requestUrl.searchParams.get('url');
    if (!targetUrl) {
      const pathname = requestUrl.pathname.slice(1);
      if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
        targetUrl = pathname + requestUrl.search;
      }
    }

    if (!targetUrl) {
      return new Response(
        JSON.stringify(
          {
            service: 'Kairou Cloudflare Turbo Proxy',
            status: 'online',
            turboSpeed: 'enabled',
            author: 'Kairou Team',
            usage: `${requestUrl.origin}/?url=https://exemplo.com/video.mp4`,
            features: [
              'Global Edge RAM Caching (0ms)',
              'HLS .m3u8 Instant Rewriter',
              'Byte-Range Seeking (HTTP 206)',
              'Zero Mixed Content on HTTPS',
              'Anti-Hotlink & IPTV Bypass',
            ],
          },
          null,
          2
        ),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...getCorsHeaders(),
          },
        }
      );
    }

    try {
      const parsedTarget = new URL(targetUrl);
      const workerBaseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

      // Se for IP direto numérico (ex: 152.233.x.x), a Cloudflare não permite outbound direto.
      // Faz fallback seguro para a VPS que aceita IPs diretamente!
      const isRawIp = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(parsedTarget.host);
      if (isRawIp) {
        return Response.redirect(`${VPS_FALLBACK_URL}?url=${encodeURIComponent(targetUrl)}`, 307);
      }

      const customReferer = requestUrl.searchParams.get('referer');
      const customOrigin = requestUrl.searchParams.get('origin');
      const customUserAgent = requestUrl.searchParams.get('ua');

      const forwardHeaders = new Headers();
      forwardHeaders.set('User-Agent', customUserAgent || DEFAULT_USER_AGENT);
      forwardHeaders.set('Accept', '*/*');
      forwardHeaders.set('Accept-Language', 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7');

      // Só envia Referer se explicitamente solicitado (IPTVs travam se enviado)
      if (customReferer) {
        forwardHeaders.set('Referer', customReferer);
      }
      if (customOrigin) {
        forwardHeaders.set('Origin', customOrigin);
      }

      // Encaminha Range para seek de vídeo rápido
      const rangeHeader = request.headers.get('Range');
      if (rangeHeader) {
        forwardHeaders.set('Range', rangeHeader);
      }

      // Identifica tipo de arquivo para aplicar cache turbo na borda da Cloudflare
      const isMediaChunk =
        targetUrl.includes('.ts') ||
        targetUrl.includes('.m4s') ||
        targetUrl.includes('.aac') ||
        targetUrl.includes('.mp3');

      // Opções avançadas de aceleração da Cloudflare Edge
      const cfOptions = {
        scrapeShield: false,
        mirage: false,
        polish: 'off',
        minify: { javascript: false, css: false, html: false },
      };

      // Chunks de vídeo estáticos (.ts, .m4s) são cacheados na borda global por 24h
      if (isMediaChunk) {
        cfOptions.cacheEverything = true;
        cfOptions.cacheTtlByStatus = { '200-299': 86400, '404': 1, '500-599': 0 };
      }

      // Requisição upstream
      let upstreamRes = await fetch(targetUrl, {
        method: request.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: forwardHeaders,
        redirect: 'manual',
        cf: cfOptions,
      });

      // Trata redirecionamentos (301, 302, 307, 308)
      if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
        const location = upstreamRes.headers.get('location');
        if (location) {
          const resolvedLocation = new URL(location, targetUrl).href;
          const parsedLocation = new URL(resolvedLocation);

          // Se redirecionou para IP direto (comum em IPTVs pfsv -> 152.233.x.x)
          const targetIsIp = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(parsedLocation.host);
          if (targetIsIp) {
            return Response.redirect(`${VPS_FALLBACK_URL}?url=${encodeURIComponent(resolvedLocation)}`, 307);
          }

          upstreamRes = await fetch(resolvedLocation, {
            method: request.method === 'HEAD' ? 'HEAD' : 'GET',
            headers: forwardHeaders,
            redirect: 'follow',
            cf: cfOptions,
          });
        }
      }

      // Se retornou 403, tenta retry automático com referer do próprio host
      if (upstreamRes.status === 403 && !customReferer) {
        const retryHeaders = new Headers(forwardHeaders);
        retryHeaders.set('Referer', `${parsedTarget.origin}/`);
        const retryRes = await fetch(targetUrl, {
          method: request.method === 'HEAD' ? 'HEAD' : 'GET',
          headers: retryHeaders,
          redirect: 'follow',
          cf: cfOptions,
        });
        if (retryRes.status < 400) {
          upstreamRes = retryRes;
        }
      }

      const responseHeaders = new Headers(upstreamRes.headers);

      // Injeta CORS
      const cors = getCorsHeaders();
      for (const [key, value] of Object.entries(cors)) {
        responseHeaders.set(key, value);
      }

      responseHeaders.delete('Content-Security-Policy');
      responseHeaders.delete('X-Frame-Options');
      responseHeaders.delete('Strict-Transport-Security');
      responseHeaders.set('Accept-Ranges', 'bytes');

      const contentType = upstreamRes.headers.get('Content-Type') || '';

      // 3. Legendas (.srt para .vtt)
      const isSubtitle =
        requestUrl.searchParams.get('format') === 'vtt' ||
        targetUrl.includes('.srt') ||
        targetUrl.includes('.vtt') ||
        contentType.includes('subrip') ||
        contentType.includes('text/vtt');

      if (isSubtitle && request.method !== 'HEAD') {
        const text = await upstreamRes.text();
        responseHeaders.set('Content-Type', 'text/vtt; charset=utf-8');
        responseHeaders.set('Cache-Control', 'public, max-age=604800, immutable');
        return new Response(srtToVtt(text), {
          status: 200,
          headers: responseHeaders,
        });
      }

      // 4. Detecção e Reescrita de Playlist HLS (.m3u8)
      const isMediaSegment =
        targetUrl.includes('.ts') ||
        targetUrl.includes('.m4s') ||
        contentType.includes('video/') ||
        (contentType.includes('audio/') && !contentType.includes('mpegurl')) ||
        contentType.includes('mp2t');

      const isM3u8 =
        !isMediaSegment &&
        (targetUrl.includes('.m3u8') ||
          targetUrl.includes('master.txt') ||
          (targetUrl.includes('hls-proxy') && !targetUrl.includes('.ts') && !targetUrl.includes('.m4s')) ||
          contentType.includes('mpegurl') ||
          contentType.includes('application/x-mpegURL') ||
          contentType.includes('vnd.apple.mpegurl'));

      if (isM3u8 && request.method !== 'HEAD') {
        const text = await upstreamRes.text();

        if (text.includes('#EXTM3U') || text.includes('#EXT-X')) {
          const lines = text.split('\n');
          const rewrittenLines = lines.map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;

            // Tags com URI="..." (chaves de criptografia ou áudios)
            if (trimmed.startsWith('#')) {
              if (trimmed.includes('URI="')) {
                return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
                  try {
                    const fullUri = new URL(uri, targetUrl).href;
                    let proxied = `${workerBaseUrl}/?url=${encodeURIComponent(fullUri)}`;
                    if (customReferer) proxied += `&referer=${encodeURIComponent(customReferer)}`;
                    return `URI="${proxied}"`;
                  } catch {
                    return `URI="${uri}"`;
                  }
                });
              }
              return line;
            }

            // URLs de segmentos (.ts, .m4s) ou sub-playlists (.m3u8)
            try {
              const fullSegmentUrl = new URL(trimmed, targetUrl).href;
              let proxiedSegment = `${workerBaseUrl}/?url=${encodeURIComponent(fullSegmentUrl)}`;
              if (customReferer) proxiedSegment += `&referer=${encodeURIComponent(customReferer)}`;
              return proxiedSegment;
            } catch {
              return line;
            }
          });

          responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
          // Cache inteligente para playlists: 30s de cache e stale-while-revalidate de 300s para início instantâneo
          responseHeaders.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=300');
          return new Response(rewrittenLines.join('\n'), {
            status: 200,
            headers: responseHeaders,
          });
        }
      }

      // 5. Streaming Direto de Chunks e Vídeos com Cache na Borda
      if (isMediaChunk) {
        responseHeaders.set('Cache-Control', 'public, max-age=86400, immutable');
      } else {
        responseHeaders.set('Cache-Control', 'public, max-age=86400');
      }

      return new Response(request.method === 'HEAD' ? null : upstreamRes.body, {
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: 'Proxy Error',
          message: err.message || String(err),
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...getCorsHeaders(),
          },
        }
      );
    }
  },
};
