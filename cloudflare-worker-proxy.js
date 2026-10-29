/**
 * Cloudflare Worker - Kairou Turbo Streaming Proxy
 * URL do seu Worker: https://kairou-proxy.sukiwooky-professional.workers.dev
 * 
 * Funcionalidades:
 * 1. Suporte completo a CORS (*, Range, Content-Range, Content-Length)
 * 2. Suporte a streaming de vídeo MP4 com busca (Range Requests 206 Partial Content)
 * 3. Reescrita inteligente de playlists HLS (.m3u8):
 *    - Converte segmentos relativos (.ts, .m4s) em links absolutos roteados pelo Worker
 *    - Reescreve chaves de criptografia (#EXT-X-KEY) e faixas de áudio/legenda
 * 4. Conversão automática de legendas SRT para WebVTT (.vtt)
 * 5. Bypassing de bloqueios anti-hotlink (User-Agent real, sem vazamento de Referer para IPTVs)
 * 6. Fallback inteligente para o proxy da VPS caso haja redirecionamento para IP direto
 * 
 * Uso:
 * https://kairou-proxy.sukiwooky-professional.workers.dev/?url=http://exemplo.com/video.mp4
 */

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Fallback VPS da Kairou para streams que usam IP direto (ex: 152.233.x.x)
const VPS_FALLBACK_URL = 'https://kairou.space/api/proxy';

// Converte legendas SRT para WebVTT
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

// Cabeçalhos CORS padrão
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
    // 1. Resposta para requisições de preflight CORS (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }

    const requestUrl = new URL(request.url);

    // 2. Extrai a URL alvo (?url=... ou /https://...)
    let targetUrl = requestUrl.searchParams.get('url');
    if (!targetUrl) {
      const pathname = requestUrl.pathname.slice(1);
      if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
        targetUrl = pathname + requestUrl.search;
      }
    }

    // Se nenhuma URL foi informada, exibe status e documentação rápida
    if (!targetUrl) {
      return new Response(
        JSON.stringify(
          {
            service: 'Kairou Cloudflare Turbo Proxy',
            status: 'online',
            author: 'Kairou Team',
            usage: `${requestUrl.origin}/?url=https://exemplo.com/video.mp4`,
            features: [
              'CORS Everywhere (*)',
              'HLS .m3u8 Rewriter (.ts / .m4s / .key)',
              'Range & Seeking (HTTP 206 Partial Content)',
              'SRT to WebVTT Converter',
              'Anti-Hotlink & IPTV Header Bypass',
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

      // Se a URL alvo for um IP numérico direto (ex: http://152.233.36.145:80/...)
      // O Cloudflare bloqueia por padrão (Error 1003). Então redirecionamos para o proxy da VPS!
      const isRawIp = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(parsedTarget.host);
      if (isRawIp) {
        return Response.redirect(`${VPS_FALLBACK_URL}?url=${encodeURIComponent(targetUrl)}`, 307);
      }

      // Parâmetros opcionais de spoofing
      const customReferer = requestUrl.searchParams.get('referer');
      const customOrigin = requestUrl.searchParams.get('origin');
      const customUserAgent = requestUrl.searchParams.get('ua');

      // Monta os headers de saída simulando um navegador real
      const forwardHeaders = new Headers();
      forwardHeaders.set('User-Agent', customUserAgent || DEFAULT_USER_AGENT);
      forwardHeaders.set('Accept', '*/*');
      forwardHeaders.set('Accept-Language', 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7');

      // IMPORTANTE: Só envia Referer se explicitamente solicitado!
      // Servidores de IPTV rejeitam requisições com 403 se houver Referer.
      if (customReferer) {
        forwardHeaders.set('Referer', customReferer);
      }

      if (customOrigin) {
        forwardHeaders.set('Origin', customOrigin);
      }

      // Encaminha header Range para permitir navegação/seek na barra de progresso
      const rangeHeader = request.headers.get('Range');
      if (rangeHeader) {
        forwardHeaders.set('Range', rangeHeader);
      }

      // Executa o fetch para o servidor original do vídeo
      let upstreamRes = await fetch(targetUrl, {
        method: request.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: forwardHeaders,
        redirect: 'manual',
      });

      // Se redirecionar (301, 302, 307, 308)
      if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
        const location = upstreamRes.headers.get('location');
        if (location) {
          const resolvedLocation = new URL(location, targetUrl).href;
          const parsedLocation = new URL(resolvedLocation);

          // Se redirecionou para um IP direto (ex: pfsv.io -> 152.233.36.145)
          const targetIsIp = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(parsedLocation.host);
          if (targetIsIp) {
            return Response.redirect(`${VPS_FALLBACK_URL}?url=${encodeURIComponent(resolvedLocation)}`, 307);
          }

          // Caso contrário, segue o redirecionamento pelo próprio Worker
          upstreamRes = await fetch(resolvedLocation, {
            method: request.method === 'HEAD' ? 'HEAD' : 'GET',
            headers: forwardHeaders,
            redirect: 'follow',
          });
        }
      }

      // Se retornou 403 (alguns CDNs exigem referer), tenta retry com referer da origem
      if (upstreamRes.status === 403 && !customReferer) {
        const retryHeaders = new Headers(forwardHeaders);
        retryHeaders.set('Referer', `${parsedTarget.origin}/`);
        const retryRes = await fetch(targetUrl, {
          method: request.method === 'HEAD' ? 'HEAD' : 'GET',
          headers: retryHeaders,
          redirect: 'follow',
        });
        if (retryRes.status < 400) {
          upstreamRes = retryRes;
        }
      }

      // Prepara os cabeçalhos de resposta para o navegador
      const responseHeaders = new Headers(upstreamRes.headers);

      // Aplica cabeçalhos CORS
      const cors = getCorsHeaders();
      for (const [key, value] of Object.entries(cors)) {
        responseHeaders.set(key, value);
      }

      // Remove proteções de framing que quebram o player
      responseHeaders.delete('Content-Security-Policy');
      responseHeaders.delete('X-Frame-Options');
      responseHeaders.delete('Strict-Transport-Security');

      // Garante suporte a seek / range
      responseHeaders.set('Accept-Ranges', 'bytes');

      const contentType = upstreamRes.headers.get('Content-Type') || '';

      // 3. Conversão de Legendas (.srt para .vtt)
      const isSubtitle =
        requestUrl.searchParams.get('format') === 'vtt' ||
        targetUrl.includes('.srt') ||
        targetUrl.includes('.vtt') ||
        contentType.includes('subrip') ||
        contentType.includes('text/vtt');

      if (isSubtitle && request.method !== 'HEAD') {
        const text = await upstreamRes.text();
        responseHeaders.set('Content-Type', 'text/vtt; charset=utf-8');
        responseHeaders.set('Cache-Control', 'public, max-age=86400');
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

        // Se for um m3u8 válido, reescreve todos os caminhos para passarem pelo Worker
        if (text.includes('#EXTM3U') || text.includes('#EXT-X')) {
          const lines = text.split('\n');
          const rewrittenLines = lines.map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;

            // Tags com URI="..." (ex: chaves #EXT-X-KEY ou áudio alternativo)
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
          responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          return new Response(rewrittenLines.join('\n'), {
            status: 200,
            headers: responseHeaders,
          });
        }
      }

      // 5. Streaming Direto de Mídia (MP4, TS, AAC, etc.)
      responseHeaders.set('Cache-Control', 'public, max-age=86400');

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
