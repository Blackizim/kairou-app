// Vercel Serverless Function: /api/extract
// Resolves direct video streams (HLS/MP4) from Kairou providers server-side
// Completely eliminates browser CORS restrictions and 3-minute cascading timeouts.

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
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

function detectQuality(url = '', name = '', title = '', explicitQuality = null) {
  if (explicitQuality === 2160) return { quality: '4K Ultra HD', rank: 1, is4k: true };
  if (explicitQuality === 1440) return { quality: '1440p (2K)', rank: 2, is2k: true };
  if (explicitQuality === 1080) return { quality: '1080p Full HD', rank: 3, is1080: true };
  if (explicitQuality === 720) return { quality: '720p HD', rank: 4, is720: true };

  const metaText = `${name} ${title}`.toLowerCase();
  const urlLower = url.toLowerCase();

  // 4K Ultra HD (2160p / 4K / UHD)
  if (
    /\b(4k|uhd|2160p?|ultra\s*hd)\b/i.test(metaText) ||
    /(?:_|\/|-|\.)(?:2160p?|4k|uhd)(?:_|\/|-|\.|$)/i.test(urlLower) ||
    urlLower.includes('3840x2160')
  ) {
    return { quality: '4K Ultra HD', rank: 1, is4k: true };
  }

  // 1440p 2K
  if (
    /\b(2k|1440p?)\b/i.test(metaText) ||
    /(?:_|\/|-|\.)(?:1440p?|2k)(?:_|\/|-|\.|$)/i.test(urlLower) ||
    urlLower.includes('2560x1440')
  ) {
    return { quality: '1440p (2K)', rank: 2, is2k: true };
  }

  // 1080p Full HD
  if (
    /\b(1080p?|full\s*hd|fhd)\b/i.test(metaText) ||
    /(?:_|\/|-|\.)(?:1080p?|fhd)(?:_|\/|-|\.|$)/i.test(urlLower) ||
    urlLower.includes('1920x1080') ||
    urlLower.includes('s1q2105')
  ) {
    return { quality: '1080p Full HD', rank: 3, is1080: true };
  }

  // 720p HD
  if (
    /\b(720p?|hd)\b/i.test(metaText) ||
    /(?:_|\/|-|\.)(?:720p?|hd)(?:_|\/|-|\.|$)/i.test(urlLower) ||
    urlLower.includes('1280x720')
  ) {
    return { quality: '720p HD', rank: 4, is720: true };
  }

  if (explicitQuality === 480 || /\b480p?\b/i.test(metaText) || urlLower.includes('480')) {
    return { quality: '480p', rank: 5 };
  }

  return { quality: '720p HD', rank: 4 };
}

// 1. MegaEmbed (mgeb.top)
async function extractMegaEmbed({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  // MegaEmbed opera estritamente com TMDB ID numérico (passar IMDb gera erro ou vídeo incorreto)
  const id = tmdbId || imdbId;
  const path = isSeries
    ? `/embed/${id}/${season}/${episode}`
    : `/embed/${id}`;

  let res = await fetchWithTimeout(`https://mgeb.top${path}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://mgeb.top/',
      'Connection': 'close',
    },
  }, 7000);

  if (!res || !res.ok) {
    try {
      res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://mgeb.top${path}`)}`, {}, 7000);
    } catch {}
  }

  if (!res || !res.ok) return [];
  const html = await res.text();

  // Validação: Descartar se retornar página genérica de erro ou player vazio
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim().toLowerCase() : '';
  if (pageTitle === 'player' || pageTitle.includes('404')) {
    return [];
  }

  const sourcesMatch = html.match(/var\s+sources\s*=\s*(\[[\s\S]*?\]);/);
  if (!sourcesMatch) return [];

  try {
    const rawSources = JSON.parse(sourcesMatch[1]);
    return rawSources
      .filter((s) => s.file && typeof s.file === 'string' && !s.file.includes('trailer') && !s.file.toLowerCase().includes('.mkv') && !s.file.includes('koyeb.app'))
      .map((s, idx) => {
        const fileUrl = s.file.trim();
        const isHls = s.type === 'hls' || fileUrl.includes('.m3u8') || fileUrl.includes('hls.php');
        const label = s.label ? s.label.trim() : `Opção ${idx + 1}`;
        const qInfo = detectQuality(fileUrl, label, '');

        return {
          id: `kairou-s1-${idx}-${Date.now()}`,
          server: 'Kairou',
          providerName: `Kairou · Servidor Principal (${qInfo.quality})`,
          url: fileUrl,
          type: isHls ? 'hls' : 'mp4',
          quality: qInfo.quality,
          rank: qInfo.rank,
          isHls,
          priority: qInfo.rank,
        };
      });
  } catch {
    return [];
  }
}

// 2. ClickHost (embed-api.clickhost.xyz) - Executado em paralelo!
async function extractClickHost({ tmdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  const path = isSeries
    ? `/embed/serie/${tmdbId}/${season}/${episode}?ad_played=1`
    : `/embed/filme/${tmdbId}?ad_played=1`;

  const res = await fetchWithTimeout(`https://embed-api.clickhost.xyz${path}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://embed-api.clickhost.xyz/',
      'Origin': 'https://embed-api.clickhost.xyz',
    },
  }, 4500);

  if (!res || !res.ok) return [];
  const html = await res.text();
  const serversMatch = html.match(/const\s+servers\s*=\s*(\[[\s\S]*?\]);/);
  if (!serversMatch) return [];

  try {
    const serversList = JSON.parse(serversMatch[1]);
    // Inicializar streams EM PARALELO (não sequencial!)
    const initPromises = serversList.map(async (srv) => {
      if (!srv.id) return null;
      try {
        const initRes = await fetchWithTimeout(`https://embed-api.clickhost.xyz/embed/stream/${srv.id}/init`, {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': `https://embed-api.clickhost.xyz${path}`,
            'Origin': 'https://embed-api.clickhost.xyz',
          },
        }, 3500);

        if (!initRes || !initRes.ok) return null;
        const initJson = await initRes.json();
        if (initJson && initJson.ok && initJson.url) {
          const streamUrl = initJson.url.startsWith('http')
            ? initJson.url
            : `https://embed-api.clickhost.xyz${initJson.url}`;
          const isHls = Boolean(initJson.is_hls || streamUrl.includes('.m3u8'));
          const qInfo = detectQuality(streamUrl, srv.name || '', '');
          return {
            id: `kairou-s2-${srv.id}`,
            server: 'Kairou',
            providerName: `Kairou · Servidor Alta Velocidade (${qInfo.quality})`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            priority: qInfo.rank + 1,
          };
        }
      } catch {
        return null;
      }
      return null;
    });

    const settled = await Promise.allSettled(initPromises);
    return settled
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value);
  } catch {
    return [];
  }
}

// 3. SuperFlix (superflixapi.beer)
async function extractSuperFlix({ tmdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  const path = isSeries
    ? `/serie/${tmdbId}/${season}/${episode}`
    : `/filme/${tmdbId}`;

  const res = await fetchWithTimeout(`https://superflixapi.beer${path}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://superflixapi.beer/',
    },
  }, 2500);

  if (!res || !res.ok) return [];
  const html = await res.text();
  const streamRegex = /(?:file|source|src):\s*["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i;
  const match = html.match(streamRegex);
  if (match && match[1]) {
    const url = match[1];
    const isHls = url.includes('.m3u8');
    const qInfo = detectQuality(url, '', '');
    return [{
      id: `kairou-s3-${Date.now()}`,
      server: 'Kairou',
      providerName: `Kairou · Servidor Rápido (${qInfo.quality})`,
      url,
      type: isHls ? 'hls' : 'mp4',
      quality: qInfo.quality,
      rank: qInfo.rank,
      isHls,
      priority: qInfo.rank,
    }];
  }
  return [];
}

// 4. WarezCDN (warezcdn.lat)
async function extractWarezCDN({ tmdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  const path = isSeries
    ? `/serie/${tmdbId}/${season}/${episode}`
    : `/filme/${tmdbId}`;

  const res = await fetchWithTimeout(`https://warezcdn.lat${path}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://warezcdn.lat/',
    },
  }, 2500);

  if (!res || !res.ok) return [];
  const html = await res.text();
  const streamRegex = /(?:file|source|src):\s*["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i;
  const match = html.match(streamRegex);
  if (match && match[1]) {
    const url = match[1];
    const isHls = url.includes('.m3u8');
    const qInfo = detectQuality(url, '', '');
    return [{
      id: `kairou-s4-${Date.now()}`,
      server: 'Kairou',
      providerName: `Kairou · Servidor Estável (${qInfo.quality})`,
      url,
      type: isHls ? 'hls' : 'mp4',
      quality: qInfo.quality,
      rank: qInfo.rank,
      isHls,
      priority: qInfo.rank,
    }];
  }
  return [];
}

const TMDB_READ_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MjljMjk3OTUwZTYxZTBjNzE3OGI1ZmQ5YzllNmZhMCIsIm5iZiI6MTc1MTgyNDMyMC40NTcsInN1YiI6IjY4NmFiN2MwZDQ4OWE5YzMyYTUzZmFjNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.IBBf0y2Nv9mzgXSpswQC2MsezfsDKAkhtKTC3211BpY';

// Resolução rápida de IMDb ID via TMDB (essencial para animes no FenixFlix / Stremio)
async function resolveImdbId(tmdbId, isSeries) {
  try {
    const res = await fetchWithTimeout(
      `https://api.themoviedb.org/3/${isSeries ? 'tv' : 'movie'}/${tmdbId}/external_ids`,
      {
        headers: { Authorization: `Bearer ${TMDB_READ_TOKEN}` }
      },
      4000
    );
    if (res && res.ok) {
      const data = await res.json();
      return data.imdb_id || null;
    }
  } catch {}
  return null;
}

// 5. FenixFlix (Stremio Addon do BRFLIX - Provedor Principal para Animes e Séries)
async function extractFenixFlix({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  // O protocolo Cinemeta / Stremio do FenixFlix opera ESTRITAMENTE com IMDb IDs (tt...)
  // Passar IDs numéricos brutos do TMDB gera colisões de índices ou títulos incompatíveis
  if (!imdbId || !String(imdbId).startsWith('tt')) return [];

  const path = isSeries
    ? `series/${imdbId}:${season}:${episode}.json`
    : `movie/${imdbId}.json`;

  let res = await fetchWithTimeout(`https://fenixflix.fenixhub.online/stream/${path}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
    },
  }, 4500);

  // Fallback se a Vercel sofrer bloqueio de IP/Cloudflare (403)
  if (!res || !res.ok) {
    try {
      res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://fenixflix.fenixhub.online/stream/${path}`)}`, {
        headers: { 'Accept': 'application/json' },
      }, 4500);
    } catch {}
  }

  if (!res || !res.ok) return [];

  try {
    const data = await res.json();
    if (!data || !Array.isArray(data.streams)) return [];

    return data.streams
      .filter((s) => {
        if (!s.url || typeof s.url !== 'string') return false;
        const u = s.url.toLowerCase();
        const name = (s.name || '').toLowerCase();
        const title = (s.title || s.description || '').toLowerCase();
        // Arquivos .mkv (Matroska) não são suportados nativamente por navegadores web (Chrome, Safari, iOS, etc.)
        if (u.includes('.mkv') || name.includes('.mkv') || title.includes('.mkv')) return false;
        // Proxies koyeb.app entram em suspensão / travam o carregamento de vídeo
        if (u.includes('koyeb.app')) return false;
        return true;
      })
      .map((s, idx) => {
        let streamUrl = s.url.trim();
        // Upgrade de workers.dev, p2vipserver e 2kbrfonte para https para não violar política de Mixed Content no navegador
        if (streamUrl.startsWith('http://') && streamUrl.includes('workers.dev')) {
          streamUrl = streamUrl.replace(/^http:\/\//i, 'https://');
        }
        if (streamUrl.includes('p2vipserver.top')) {
          streamUrl = streamUrl.replace(/^http:\/\//i, 'https://').replace('p2vipserver.top:80', 'p2vipserver.top');
        }
        if (streamUrl.includes('2kbrfonte.space')) {
          streamUrl = streamUrl.replace(/^http:\/\//i, 'https://').replace('2kbrfonte.space:80', '2kbrfonte.space');
        }

        const isHls = streamUrl.includes('.m3u8');
        const titleText = (s.title || s.description || '');
        const nameText = (s.name || '');
        const qInfo = detectQuality(streamUrl, nameText, titleText);
        const isDub = (titleText + ' ' + nameText).toLowerCase().includes('dublado') || (titleText + ' ' + nameText).toLowerCase().includes('dub');
        const isAnime = type === 'anime' || (titleText + ' ' + nameText).toLowerCase().includes('anime');

        return {
          id: `kairou-fenix-${idx}-${Date.now()}`,
          server: 'Kairou',
          providerName: `Kairou · Servidor ${isAnime ? 'Anime' : 'Especial'} (${qInfo.quality})${isDub ? ' (Dublado)' : ''}`,
          url: streamUrl,
          type: isHls ? 'hls' : 'mp4',
          quality: qInfo.quality,
          rank: qInfo.rank,
          isHls,
          priority: qInfo.rank,
        };
      });
  } catch {
    return [];
  }
}

// 6. BRFLIX Parallel Resolver (best-stream-resolve do BRFLIX)
async function extractBrflixResolver({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  const promises = [1, 0].map(async (dubbed) => {
    try {
      const params = new URLSearchParams({
        mediaType: isSeries ? 'tv' : 'movie',
        tmdbId: String(tmdbId),
        season: String(season),
        episode: String(episode),
        dubbed: String(dubbed),
        hq: '1',
        _t: String(Date.now()),
      });
      if (imdbId) params.set('imdbId', imdbId);

      let res = await fetchWithTimeout(`https://brflix.online/best-stream-resolve?${params.toString()}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://brflix.online/',
        },
      }, 4000);

      if (!res || !res.ok) {
        res = await fetchWithTimeout(`https://brflix.lat/best-stream-resolve?${params.toString()}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://brflix.lat/',
          },
        }, 4000);
      }

      if (!res || !res.ok) {
        try {
          res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://brflix.online/best-stream-resolve?${params.toString()}`)}`, {
            headers: { 'Accept': 'application/json' },
          }, 4000);
        } catch {}
      }

      if (!res || !res.ok) return [];
      const data = await res.json();
      if (!data || !data.ok) return [];

      const items = [];
      if (data.url && typeof data.url === 'string') {
        items.push({
          url: data.url,
          quality: data.quality,
          provider: data.provider,
          type: data.type,
          dubbed: Boolean(data.dubbed),
        });
      }
      if (Array.isArray(data.candidates)) {
        for (const c of data.candidates) {
          if (c && c.url && typeof c.url === 'string' && c.type !== 'iframe' && c.url !== data.url) {
            items.push({
              url: c.url,
              quality: c.quality,
              provider: c.provider,
              type: c.type,
              dubbed: typeof c.dubbed === 'boolean' ? c.dubbed : Boolean(dubbed),
            });
          }
        }
      }

      const results = [];
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const rawUrl = item.url.trim();
        if (
          rawUrl.includes('superflixapi') ||
          rawUrl.toLowerCase().includes('.mkv') ||
          rawUrl.includes('koyeb.app')
        ) {
          continue;
        }

        const fullUrl = rawUrl.startsWith('/') ? `https://brflix.lat${rawUrl}` : rawUrl;
        const isHls = fullUrl.includes('.m3u8') || item.type === 'hls';
        const qInfo = detectQuality(fullUrl, item.provider || '', '', item.quality);
        const isDub = item.dubbed;

        results.push({
          id: `kairou-brflix-${dubbed}-${idx}-${Date.now()}`,
          server: 'Kairou',
          providerName: `Kairou · Servidor Especial (${qInfo.quality})${isDub ? ' (Dublado)' : ''}`,
          url: fullUrl,
          type: isHls ? 'hls' : 'mp4',
          quality: qInfo.quality,
          rank: qInfo.rank,
          isHls,
          priority: qInfo.rank,
        });
      }
      return results;
    } catch {
      return [];
    }
  });

  const settled = await Promise.allSettled(promises);
  const all = [];
  for (const r of settled) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      all.push(...r.value);
    }
  }
  return all;
}

export default async function handler(req, res) {
  // CORS Headers para acesso pelo frontend
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { tmdbId, type = 'movie', season = 1, episode = 1, imdbId: queryImdbId, title: queryTitle } = req.query || {};

  if (!tmdbId) {
    return res.status(400).json({ ok: false, error: 'tmdbId é obrigatório' });
  }

  const isSeries = type === 'series' || type === 'tv';

  try {
    // Resolver IMDb ID para animes, MegaEmbed e FenixFlix (Stremio)
    let imdbId = queryImdbId || null;
    if (!imdbId) {
      imdbId = await resolveImdbId(tmdbId, isSeries);
    }

    // Executar todos os extratores em paralelo (passando imdbId resolvido)
    const [fenixRes, brflixRes, megaRes, clickRes, superRes, warezRes] = await Promise.allSettled([
      extractFenixFlix({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractBrflixResolver({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractMegaEmbed({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractClickHost({ tmdbId, type, season: Number(season), episode: Number(episode) }),
      extractSuperFlix({ tmdbId, type, season: Number(season), episode: Number(episode) }),
      extractWarezCDN({ tmdbId, type, season: Number(season), episode: Number(episode) }),
    ]);

    const streams = [];
    if (fenixRes.status === 'fulfilled' && Array.isArray(fenixRes.value)) streams.push(...fenixRes.value);
    if (brflixRes.status === 'fulfilled' && Array.isArray(brflixRes.value)) streams.push(...brflixRes.value);
    if (megaRes.status === 'fulfilled' && Array.isArray(megaRes.value)) streams.push(...megaRes.value);
    if (clickRes.status === 'fulfilled' && Array.isArray(clickRes.value)) streams.push(...clickRes.value);
    if (superRes.status === 'fulfilled' && Array.isArray(superRes.value)) streams.push(...superRes.value);
    if (warezRes.status === 'fulfilled' && Array.isArray(warezRes.value)) streams.push(...warezRes.value);

    // Desduplicar streams por URL
    const seenUrls = new Set();
    const uniqueStreams = [];
    for (const s of streams) {
      if (s.url && !seenUrls.has(s.url)) {
        seenUrls.add(s.url);
        uniqueStreams.push(s);
      }
    }

    // Ordenar priorizando HTTPS (evita bloqueio de Mixed Content no navegador) e máxima qualidade (4K > 2K > 1080p > 720p)
    uniqueStreams.sort((a, b) => {
      const aIsHttps = (a.url || '').startsWith('https://') ? 1 : 0;
      const bIsHttps = (b.url || '').startsWith('https://') ? 1 : 0;
      if (aIsHttps !== bIsHttps) {
        return bIsHttps - aIsHttps; // HTTPS primeiro
      }
      const rankA = a.rank ?? (a.quality?.includes('4K') ? 1 : a.quality?.includes('1440') ? 2 : a.quality?.includes('1080') ? 3 : 4);
      const rankB = b.rank ?? (b.quality?.includes('4K') ? 1 : b.quality?.includes('1440') ? 2 : b.quality?.includes('1080') ? 3 : 4);
      if (rankA !== rankB) {
        return rankA - rankB; // Menor rank = Maior resolução (1 = 4K, 2 = 2K, 3 = 1080p, 4 = 720p)
      }
      return (a.priority || 5) - (b.priority || 5);
    });

    // Mascarar todas as fontes para a marca Kairou mantendo os badges de resolução fidedignos
    const maskedStreams = uniqueStreams.map((s, idx) => {
      const is4k = (s.quality || '').includes('4K');
      const is2k = (s.quality || '').includes('1440') || (s.quality || '').includes('2K');
      const is1080 = (s.quality || '').includes('1080');
      const isDub = (s.providerName || '').includes('Dublado');
      let tag = 'HD';
      if (is4k) {
        tag = '4K Ultra HD';
      } else if (is2k) {
        tag = '1440p (2K)';
      } else if (is1080) {
        tag = idx === 0 ? 'Ultra HD 1080p' : 'Full HD 1080p';
      } else {
        tag = idx <= 1 ? 'Alta Velocidade HD' : 'Estável';
      }

      return {
        ...s,
        server: 'Kairou',
        providerName: `Kairou · Servidor ${idx + 1} (${tag})${isDub ? ' [Dublado]' : ''}`,
      };
    });

    // Cache no Edge CDN da Vercel por 5 minutos apenas quando encontrar streams
    if (maskedStreams.length > 0) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    } else {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

    return res.status(200).json({
      ok: true,
      count: maskedStreams.length,
      streams: maskedStreams,
    });
  } catch (err) {
    console.error('[API Extract] Erro geral:', err);
    return res.status(500).json({ ok: false, error: err.message, streams: [] });
  }
}
