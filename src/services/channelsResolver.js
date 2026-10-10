// Serviço Local de Resolução de Canais de TV Ao Vivo
// Waterfall: BestCine (primário) → RDSE (secundário) → BestCine iframe (fallback)

const cache = new Map();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutos

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
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
 * Resolve o stream de um canal de TV via /api/channels (backend local).
 * @param {string} slug  ex: "sportv", "cazetv", "globosp"
 * @returns {Promise<{ ok, streamUrl, isHls, isIframe, type, slug }>}
 */
export async function resolveChannelStream(slug) {
  if (!slug) return { ok: false, error: 'Slug do canal não informado' };

  const cleanSlug = String(slug).trim().toLowerCase();

  // 1. Cache em memória (25 min TTL)
  if (cache.has(cleanSlug)) {
    const entry = cache.get(cleanSlug);
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return { ok: true, cached: true, ...entry.result };
    }
  }

  // 2. Backend local → /api/channels (faz o waterfall BestCine → RDSE)
  try {
    const res = await fetchWithTimeout(`/api/channels?slug=${cleanSlug}`, {}, 6000);
    if (res?.ok) {
      const data = await res.json();
      if (data?.ok && data.streamUrl) {
        const result = {
          type: data.type || 'iframe',
          isHls: Boolean(data.isHls),
          isIframe: Boolean(data.isIframe),
          streamUrl: data.streamUrl,
          fallbackRdse: data.fallbackRdse || `https://v1.rdse.buzz/${cleanSlug}`,
          slug: cleanSlug,
          source: data.source || 'api',
        };
        cache.set(cleanSlug, { result, timestamp: Date.now() });
        return { ok: true, ...result };
      }
    }
  } catch (err) {
    console.warn('[channelsResolver] Erro na API local:', err?.message);
  }

  // 3. Fallback: Embed direto v2.rdembed.sbs
  const embedUrl = `https://v2.rdembed.sbs/${cleanSlug}`;
  return {
    ok: true,
    type: 'iframe',
    isHls: false,
    isIframe: true,
    streamUrl: embedUrl,
    fallbackRdse: embedUrl,
    slug: cleanSlug,
    source: 'client_fallback',
  };
}
