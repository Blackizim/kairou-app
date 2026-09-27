// Vercel Serverless Function: /api/channels
// Resolves direct HLS streams from Rei dos Embeds (via BRFLIX TV resolver and direct fallbacks)
// Returns direct .m3u8 HLS streams to play 100% natively in hls.js with ZERO ADS and no iframes.

const cache = new Map();
const CACHE_TTL_MS = 25 * 60 * 1000; // 25 minutes

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch {
    clearTimeout(id);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug, m3u8, format } = req.query || {};

  if (!slug) {
    return res.status(400).json({ ok: false, error: 'Parâmetro slug é obrigatório' });
  }

  const cleanSlug = String(slug).trim().toLowerCase();

  // 1. Check in-memory cache
  if (cache.has(cleanSlug)) {
    const entry = cache.get(cleanSlug);
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      if (m3u8 === '1' || format === 'm3u8') {
        const mRes = await fetchWithTimeout(entry.streamUrl, {
          headers: { 'Referer': 'https://v1.rdse.buzz/', 'User-Agent': 'Mozilla/5.0' }
        }, 5000);
        if (mRes && mRes.ok) {
          const text = await mRes.text();
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.status(200).send(text);
        }
      }
      return res.status(200).json({
        ok: true,
        cached: true,
        type: 'hls',
        isHls: true,
        streamUrl: entry.streamUrl,
        slug: cleanSlug,
      });
    }
  }

  // 2. Primary: Resolve via BRFLIX TV's dedicated high-speed resolver
  try {
    const resolveUrl = `https://brflix.online/api/resolve/${cleanSlug}?directUrl=${cleanSlug}`;
    const brRes = await fetchWithTimeout(resolveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://brflix.online/',
      },
    }, 4500);

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

        if (m3u8 === '1' || format === 'm3u8') {
          const mRes = await fetchWithTimeout(fullStreamUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          }, 5000);
          if (mRes && mRes.ok) {
            const text = await mRes.text();
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.status(200).send(text);
          }
        }

        return res.status(200).json({
          ok: true,
          type: 'hls',
          isHls: true,
          streamUrl: fullStreamUrl,
          rawHlsUrl: data.rawHlsUrl,
          slug: cleanSlug,
          source: 'brflix_direct',
        });
      }
    }
  } catch (err) {
    console.warn('[channels] Erro ao resolver via brflix:', err.message);
  }

  // 3. Secondary: Direct Rei dos Embeds Scraper
  const domains = ['https://v1.rdse.buzz', 'https://v2.rdse.site'];
  for (const domain of domains) {
    try {
      const channelUrl = `${domain}/${cleanSlug}`;
      const pageRes = await fetchWithTimeout(channelUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `${domain}/`,
        },
      }, 4000);

      if (!pageRes || !pageRes.ok) continue;
      const html = await pageRes.text();
      const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
      if (!iframeMatch) continue;

      const iframeUrl = iframeMatch[1].replace(/&amp;/g, '&');
      const ifrRes = await fetchWithTimeout(iframeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': channelUrl,
        },
      }, 4000);

      if (!ifrRes || !ifrRes.ok) continue;
      const ifrHtml = await ifrRes.text();
      const sourcesMatch = ifrHtml.match(/var\s+sources\s*=\s*(\[[^;]+\]);/) || ifrHtml.match(/sources\s*=\s*(\[[^;]+\])/);
      if (!sourcesMatch) continue;

      const sources = JSON.parse(sourcesMatch[1]);
      if (Array.isArray(sources) && sources.length > 0 && sources[0].src) {
        const streamUrl = sources[0].src;
        cache.set(cleanSlug, {
          streamUrl,
          timestamp: Date.now(),
        });

        return res.status(200).json({
          ok: true,
          type: 'hls',
          isHls: true,
          streamUrl,
          slug: cleanSlug,
          source: 'rdse_direct',
        });
      }
    } catch {
      // Continue
    }
  }

  // 4. Fallback: return direct stream endpoint
  return res.status(200).json({
    ok: true,
    type: 'hls',
    isHls: true,
    streamUrl: `https://brflix.online/api/resolve/${cleanSlug}?directUrl=${cleanSlug}`,
    slug: cleanSlug,
  });
}
