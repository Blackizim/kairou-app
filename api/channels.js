// Vercel Serverless & Local Node API: /api/channels
// Source waterfall: BestCine (primary) → Rei dos Embeds → Direct iframe fallback
// Zero ads on HLS path; iframe fallback uses the original embed page cleanly.

const cache = new Map();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

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

// Try to extract a direct .m3u8 HLS URL from an embed page HTML
function extractHlsFromHtml(html) {
  // Pattern 1: sources = [{src: "..."}]
  const m1 = html.match(/sources\s*=\s*(\[[\s\S]*?\])/);
  if (m1) {
    try {
      const srcs = JSON.parse(m1[1]);
      if (Array.isArray(srcs) && srcs[0]?.src) return srcs[0].src;
    } catch { /* continue */ }
  }
  // Pattern 2: "file":"https://...m3u8..."
  const m2 = html.match(/"file"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/);
  if (m2) return m2[1];
  // Pattern 3: source src="...m3u8"
  const m3 = html.match(/src=['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
  if (m3) return m3[1];
  // Pattern 4: hls.loadSource("...")
  const m4 = html.match(/hls\.loadSource\(['"](https?:\/\/[^'"]+)['"]\)/);
  if (m4) return m4[1];
  // Pattern 5: var source = "..."
  const m5 = html.match(/var\s+source\s*=\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
  if (m5) return m5[1];
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { slug, format } = req.query || {};
  if (!slug) return res.status(200).json({ ok: true, service: 'Kairou Channels API Online' });

  const cleanSlug = String(slug).trim().toLowerCase();

  // 1. Memory cache hit
  if (cache.has(cleanSlug)) {
    const entry = cache.get(cleanSlug);
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      if (entry.isIframe) {
        return res.status(200).json({ ok: true, cached: true, type: 'iframe', isIframe: true, streamUrl: entry.streamUrl, slug: cleanSlug });
      }
      if (format === 'm3u8') {
        const mRes = await fetchWithTimeout(entry.streamUrl, { headers: { Referer: 'https://bestcine.dpdns.org/', 'User-Agent': 'Mozilla/5.0' } }, 5000);
        if (mRes?.ok) {
          const text = await mRes.text();
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          return res.status(200).send(text);
        }
      }
      return res.status(200).json({ ok: true, cached: true, type: 'hls', isHls: true, streamUrl: entry.streamUrl, slug: cleanSlug });
    }
  }

  // ----------------------------------------------------------------
  // 2. PRIMARY: BestCine
  // ----------------------------------------------------------------
  const bestcineUrl = `https://bestcine.dpdns.org/stream/tv/${cleanSlug}`;
  try {
    const bcRes = await fetchWithTimeout(bestcineUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://bestcine.dpdns.org/',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
    }, 4000);

    if (bcRes?.ok) {
      const html = await bcRes.text();
      // Check for iframe redirect to a player
      const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
      if (iframeMatch) {
        const embedUrl = iframeMatch[1].replace(/&amp;/g, '&');
        const embedRes = await fetchWithTimeout(embedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': bestcineUrl },
        }, 4000);
        if (embedRes?.ok) {
          const embedHtml = await embedRes.text();
          const hlsUrl = extractHlsFromHtml(embedHtml);
          if (hlsUrl) {
            cache.set(cleanSlug, { streamUrl: hlsUrl, isIframe: false, timestamp: Date.now() });
            return res.status(200).json({ ok: true, type: 'hls', isHls: true, streamUrl: hlsUrl, slug: cleanSlug, source: 'bestcine_hls' });
          }
        }
      }
      // Direct HLS in page
      const directHls = extractHlsFromHtml(html);
      if (directHls) {
        cache.set(cleanSlug, { streamUrl: directHls, isIframe: false, timestamp: Date.now() });
        return res.status(200).json({ ok: true, type: 'hls', isHls: true, streamUrl: directHls, slug: cleanSlug, source: 'bestcine_direct' });
      }
    }
  } catch { /* Fall through */ }

  // ----------------------------------------------------------------
  // 3. SECONDARY: Rei dos Embeds scraper
  // ----------------------------------------------------------------
  const rdseDomains = ['https://v1.rdse.buzz', 'https://v2.rdse.site', 'https://reidosembeds.com'];
  for (const domain of rdseDomains) {
    try {
      const channelUrl = `${domain}/${cleanSlug}`;
      const pageRes = await fetchWithTimeout(channelUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `${domain}/`,
        },
      }, 3500);
      if (!pageRes?.ok) continue;

      const html = await pageRes.text();
      const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
      if (!iframeMatch) continue;

      const iframeUrl = iframeMatch[1].replace(/&amp;/g, '&');
      const ifrRes = await fetchWithTimeout(iframeUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': channelUrl },
      }, 3500);
      if (!ifrRes?.ok) continue;

      const ifrHtml = await ifrRes.text();
      const hlsUrl = extractHlsFromHtml(ifrHtml);
      if (hlsUrl) {
        cache.set(cleanSlug, { streamUrl: hlsUrl, isIframe: false, timestamp: Date.now() });
        if (format === 'm3u8') {
          const mRes = await fetchWithTimeout(hlsUrl, { headers: { Referer: domain, 'User-Agent': 'Mozilla/5.0' } }, 4000);
          if (mRes?.ok) {
            const text = await mRes.text();
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            return res.status(200).send(text);
          }
        }
        return res.status(200).json({ ok: true, type: 'hls', isHls: true, streamUrl: hlsUrl, slug: cleanSlug, source: 'rdse' });
      }
    } catch { /* Try next domain */ }
  }

  // ----------------------------------------------------------------
  // 4. FALLBACK: Direct RDSE / Embed iframe
  // ----------------------------------------------------------------
  const fallbackUrl = `https://v2.rdembed.sbs/${cleanSlug}`;
  cache.set(cleanSlug, { streamUrl: fallbackUrl, isIframe: true, timestamp: Date.now() });
  return res.status(200).json({
    ok: true,
    type: 'iframe',
    isIframe: true,
    streamUrl: fallbackUrl,
    fallbackRdse: fallbackUrl,
    slug: cleanSlug,
    source: 'rdse_iframe',
  });
}
