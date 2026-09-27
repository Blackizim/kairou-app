// Servico Local de Resolucao de Canais de TV Ao Vivo (100% Client-Side)
// Elimina a dependencia do endpoint /api/channels da Vercel.
// Resolve streams HLS diretos (.m3u8) para reproducao nativa no player.

const cache = new Map();
const CACHE_TTL_MS = 25 * 60 * 1000; // 25 minutos

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        ...(options.headers || {}),
      },
    });
    clearTimeout(id);
    return res;
  } catch {
    clearTimeout(id);
    return null;
  }
}

/**
 * Resolve o stream direto de um canal de TV via slug (ex: premiere, sportv, espn, cazetv)
 * @param {string} slug 
 * @returns {Promise<{ ok: boolean, streamUrl: string, type: 'hls'|'iframe', isHls: boolean, isIframe: boolean, slug: string }>}
 */
export async function resolveChannelStream(slug) {
  if (!slug) {
    return { ok: false, error: 'Slug do canal não informado' };
  }

  const cleanSlug = String(slug).trim().toLowerCase();

  // 1. Checar cache em memória
  if (cache.has(cleanSlug)) {
    const entry = cache.get(cleanSlug);
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return {
        ok: true,
        cached: true,
        type: 'hls',
        isHls: true,
        isIframe: false,
        streamUrl: entry.streamUrl,
        slug: cleanSlug,
      };
    }
  }

  // 2. Primário: Resolver via BRFLIX TV API
  try {
    const resolveUrl = `https://brflix.online/api/resolve/${cleanSlug}?directUrl=${cleanSlug}`;
    const brRes = await fetchWithTimeout(resolveUrl, {}, 4500);

    if (brRes && brRes.ok) {
      const data = await brRes.json();
      if (data && data.ok && data.hlsUrl) {
        const fullStreamUrl = data.hlsUrl.startsWith('http')
          ? data.hlsUrl
          : `https://brflix.online${data.hlsUrl}`;

        cache.set(cleanSlug, {
          streamUrl: fullStreamUrl,
          rawHlsUrl: data.rawHlsUrl,
          timestamp: Date.now(),
        });

        return {
          ok: true,
          type: 'hls',
          isHls: true,
          isIframe: false,
          streamUrl: fullStreamUrl,
          rawHlsUrl: data.rawHlsUrl,
          slug: cleanSlug,
          source: 'brflix_direct',
        };
      }
    }
  } catch (err) {
    console.warn('[channelsResolver] Tentativa primária falhou:', err?.message);
  }

  // 3. Secundário: Tentar proxy CORS se direto falhou
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://brflix.online/api/resolve/${cleanSlug}?directUrl=${cleanSlug}`)}`;
    const pRes = await fetchWithTimeout(proxyUrl, {}, 4000);
    if (pRes && pRes.ok) {
      const data = await pRes.json();
      if (data && data.ok && data.hlsUrl) {
        const fullStreamUrl = data.hlsUrl.startsWith('http')
          ? data.hlsUrl
          : `https://brflix.online${data.hlsUrl}`;

        cache.set(cleanSlug, {
          streamUrl: fullStreamUrl,
          timestamp: Date.now(),
        });

        return {
          ok: true,
          type: 'hls',
          isHls: true,
          isIframe: false,
          streamUrl: fullStreamUrl,
          slug: cleanSlug,
          source: 'brflix_proxy',
        };
      }
    }
  } catch {}

  // 4. Fallback confiável: URL direta de resolução ou embed Rei dos Embeds
  const fallbackHls = `https://brflix.online/api/resolve/${cleanSlug}?directUrl=${cleanSlug}`;
  return {
    ok: true,
    type: 'hls',
    isHls: true,
    isIframe: false,
    streamUrl: fallbackHls,
    fallbackIframeUrl: `https://v1.rdse.buzz/${cleanSlug}`,
    slug: cleanSlug,
  };
}
