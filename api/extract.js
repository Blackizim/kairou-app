// Vercel Serverless & Local PC Node.js Function: /api/extract
// Resolves video streams directly from Stremio Addons (FrostStream, FenixFlix, Zeus)
// and high-speed web providers with 100% Zero BRFLIX dependency.

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const FETCH_TIMEOUT_MS = 4500;

// Memória Cache de Alta Performance em RAM do Servidor Node.js (< 1ms resposta)
const serverExtractCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas
const imdbIdCache = new Map();

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

// Normaliza streams, descarta placeholders e garante que HLS sem CORS passem pelo proxy local
function normalizeStreamUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let u = url.trim();

  // Descartar placeholders de manutenção e arquivos incompatíveis ou caídos
  if (
    u.toLowerCase().includes('manutencao.mp4') ||
    u.toLowerCase().includes('.mkv') ||
    u.includes('koyeb.app') ||
    u.includes('squareweb.app') ||
    u.includes('imagesskill.com') ||
    u.includes('v-net.work')
  ) {
    return '';
  }

  // Se já for rota de proxy local
  if (u.startsWith('/api/proxy')) {
    return u;
  }

  // Remove referências antigas a proxy brflix se houver
  if (u.includes('brflix.lat/dynamic-proxy/')) {
    u = u.replace(/https?:\/\/brflix\.lat\/dynamic-proxy\//i, '');
    if (!u.startsWith('http')) u = `https://${u}`;
  }

  // Qualquer stream em IP direto sem SSL (ex: http://152.233.*.* ou http://\d+\.\d+\.\d+\.\d+)
  // DEVE passar pelo Turbo Proxy local para ganhar CORS, Range HTTP 206 e evitar bloqueio de Mixed Content no browser
  if (/^https?:\/\/\d+\.\d+\.\d+\.\d+/i.test(u)) {
    return `/api/proxy?url=${encodeURIComponent(u)}`;
  }

  // Hosts que bloqueiam CORS no browser: encapsular no proxy local de alta velocidade
  if (
    u.includes('devcorp.me') ||
    u.includes('36ghhjjbxtv71.site') ||
    u.includes('hcjgkko87g.shop') ||
    u.includes('embedplayer2.xyz') ||
    u.includes('embedplayer.online') ||
    u.includes('112234152.xyz') ||
    u.includes('clickhost.xyz') ||
    u.includes('embed-api')
  ) {
    return `/api/proxy?url=${encodeURIComponent(u)}`;
  }

  // Upgrade de HTTP para HTTPS em hosts conhecidos para evitar bloqueio de mixed content
  if (
    u.startsWith('http://') &&
    (u.includes('workers.dev') ||
      u.includes('p2vipserver.top') ||
      u.includes('2kbrfonte.space') ||
      u.includes('marciadesouza.com') ||
      u.includes('apperror404.com') ||
      u.includes('77zzhf54vdll71.com') ||
      u.includes('iptvmais.one'))
  ) {
    u = u.replace(/^http:\/\//i, 'https://').replace(/:80(?=\/|$)/, '');
  }

  return u;
}

function detectQuality(url = '', name = '', title = '', explicitQuality = null) {
  const numQ = Number(explicitQuality);
  if (numQ === 2160 || explicitQuality === '4k' || explicitQuality === '4K' || explicitQuality === '2160p') {
    return { quality: '4K Ultra HD', rank: 1, is4k: true };
  }
  if (numQ === 1440 || explicitQuality === '2k' || explicitQuality === '2K' || explicitQuality === '1440p') {
    return { quality: '1440p 2K', rank: 2, is2k: true };
  }
  if (numQ === 1080 || explicitQuality === '1080p' || explicitQuality === '1080') {
    return { quality: '1080p Full HD', rank: 3, is1080: true };
  }
  if (numQ === 720 || explicitQuality === '720p' || explicitQuality === '720') {
    return { quality: '720p HD', rank: 4, is720: true };
  }

  const metaText = `${name} ${title}`.toLowerCase();
  // Analisar apenas o caminho do arquivo / rota sem tokens ou parâmetros de query
  const urlPath = (url || '').toLowerCase().split('?')[0];

  // 1. 4K Ultra HD (2160p / 4K / UHD) - Rigoroso em limites de palavra
  if (
    /\b(4k|uhd|2160p?|ultra\s*hd|ultrahd)\b/i.test(metaText) ||
    /(?:_|-|\/|\.)(?:2160p?|4k|uhd)(?:_|-|\/|\.|$)/i.test(urlPath) ||
    urlPath.includes('3840x2160')
  ) {
    return { quality: '4K Ultra HD', rank: 1, is4k: true };
  }

  // 2. 1440p 2K (QHD) - Apenas se especificado explicitamente como resolução (evita falso positivo com IDs de stream tipo 11440939)
  if (
    /\b(1440p?|2560x1440|qhd)\b/i.test(metaText) ||
    /(?:_|-|\/|\.)(?:1440p?|qhd)(?:_|-|\/|\.|$)/i.test(urlPath) ||
    urlPath.includes('2560x1440')
  ) {
    return { quality: '1440p 2K', rank: 2, is2k: true };
  }

  // 3. 1080p Full HD (1080p / FHD)
  if (
    /\b(1080p?|full\s*hd|fhd)\b/i.test(metaText) ||
    /(?:_|-|\/|\.)(?:1080p?|fhd)(?:_|-|\/|\.|$)/i.test(urlPath) ||
    urlPath.includes('1920x1080')
  ) {
    return { quality: '1080p Full HD', rank: 3, is1080: true };
  }

  // 4. 720p HD (Apenas se especificado explicitamente 720 ou 720p)
  if (
    /\b(720p?)\b/i.test(metaText) ||
    /(?:_|-|\/|\.)(?:720p?)(?:_|-|\/|\.|$)/i.test(urlPath) ||
    urlPath.includes('1280x720')
  ) {
    return { quality: '720p HD', rank: 4, is720: true };
  }

  // 5. 480p / 360p SD
  if (
    numQ === 480 ||
    /\b(480p?|360p?|sd)\b/i.test(metaText) ||
    /(?:_|-|\/|\.)(?:480p?|360p?)(?:_|-|\/|\.|$)/i.test(urlPath)
  ) {
    return { quality: '480p', rank: 5 };
  }

  // Padrão de servidores de alta qualidade: 1080p Full HD
  return { quality: '1080p Full HD', rank: 3, is1080: true };
}

const TMDB_READ_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MjljMjk3OTUwZTYxZTBjNzE3OGI1ZmQ5YzllNmZhMCIsIm5iZiI6MTc1MTgyNDMyMC40NTcsInN1YiI6IjY4NmFiN2MwZDQ4OWE5YzMyYTUzZmFjNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.IBBf0y2Nv9mzgXSpswQC2MsezfsDKAkhtKTC3211BpY';

// Resolução de IMDb ID via TMDB com fallback inteligente de tipo (tv <-> movie)
async function resolveImdbId(tmdbId, isSeries) {
  if (!tmdbId || isNaN(Number(tmdbId))) return null;
  const primaryType = isSeries ? 'tv' : 'movie';
  const fallbackType = isSeries ? 'movie' : 'tv';
  const cacheKey = `${primaryType}-${tmdbId}`;
  if (imdbIdCache.has(cacheKey)) {
    return imdbIdCache.get(cacheKey);
  }
  try {
    let res = await fetchWithTimeout(
      `https://api.themoviedb.org/3/${primaryType}/${tmdbId}/external_ids`,
      { headers: { Authorization: `Bearer ${TMDB_READ_TOKEN}` } },
      3000
    );
    let data = res && res.ok ? await res.json() : null;
    let imdbId = data?.imdb_id || null;

    if (!imdbId) {
      // Tentar tipo alternativo (ex: anime ou série marcado como filme ou vice-versa)
      res = await fetchWithTimeout(
        `https://api.themoviedb.org/3/${fallbackType}/${tmdbId}/external_ids`,
        { headers: { Authorization: `Bearer ${TMDB_READ_TOKEN}` } },
        3000
      );
      data = res && res.ok ? await res.json() : null;
      imdbId = data?.imdb_id || null;
    }

    if (imdbId) {
      imdbIdCache.set(cacheKey, imdbId);
      return imdbId;
    }
  } catch {}
  return null;
}

const tmdbFromImdbCache = new Map();

// Resolução de TMDB ID a partir de IMDb ID (ex: tt31450459) via TMDB /find/
async function resolveTmdbFromImdb(imdbId) {
  if (!imdbId || typeof imdbId !== 'string') return null;
  const clean = imdbId.trim();
  if (tmdbFromImdbCache.has(clean)) {
    return tmdbFromImdbCache.get(clean);
  }
  try {
    const res = await fetchWithTimeout(
      `https://api.themoviedb.org/3/find/${clean}?external_source=imdb_id`,
      {
        headers: { Authorization: `Bearer ${TMDB_READ_TOKEN}` }
      },
      3000
    );
    if (res && res.ok) {
      const data = await res.json();
      const movie = data.movie_results?.[0];
      if (movie?.id) {
        const item = { tmdbId: movie.id, type: 'movie' };
        tmdbFromImdbCache.set(clean, item);
        return item;
      }
      const tv = data.tv_results?.[0];
      if (tv?.id) {
        const item = { tmdbId: tv.id, type: 'series' };
        tmdbFromImdbCache.set(clean, item);
        return item;
      }
    }
  } catch {}
  return null;
}

// 0. BestCine (Stremio Multi-Source Oficial PT-BR - 4K Ultra HD & 1080p Dublado / HLS / MP4)
async function extractBestCine({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const targetId = imdbId || (await resolveImdbId(tmdbId, isSeries)) || (tmdbId ? `tmdb:${tmdbId}` : null);
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://bestcine.dpdns.org/stream/${path}`;
  const streams = [];

  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
      }
    }, 4500);

    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data.streams)) {
        for (let idx = 0; idx < data.streams.length; idx++) {
          const s = data.streams[idx];
          // Descartar qualquer torrent / P2P
          if (!s || !s.url || s.infoHash || s.behaviorHints?.p2p) continue;

          let streamUrl = normalizeStreamUrl(s.url);
          if (!streamUrl) continue;

          // Se for rota do BestCine ou sem SSL direto, encapsular no proxy local
          if (s.behaviorHints?.notWebReady || streamUrl.includes('bestcine.dpdns.org') || !streamUrl.startsWith('https://')) {
            if (!streamUrl.startsWith('/api/proxy')) {
              streamUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`;
            }
          }

          const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('master.txt');
          const titleText = s.title || s.description || '';
          const nameText = s.name || '';
          const metaLower = `${titleText} ${nameText}`.toLowerCase();
          const hasDubAudio =
            metaLower.includes('dublado') ||
            metaLower.includes('dub') ||
            metaLower.includes('dual') ||
            metaLower.includes('multi') ||
            metaLower.includes('nacional') ||
            metaLower.includes('português') ||
            metaLower.includes('portugues') ||
            metaLower.includes('pt-br') ||
            metaLower.includes('ptbr') ||
            metaLower.includes('🇧🇷');
          const isLegOnly = !hasDubAudio && (metaLower.includes('legendado') || metaLower.includes('legend') || metaLower.includes('sub') || metaLower.includes('🇺🇸') || metaLower.includes('🇯🇵') || metaLower.includes('japones') || metaLower.includes('japonês'));
          const isDub = hasDubAudio || !isLegOnly;

          const qInfo = detectQuality(streamUrl, nameText, titleText);

          streams.push({
            id: `kairou-best-${idx}-${Date.now()}`,
            server: 'Kairou',
            providerName: isDub ? `Kairou · Servidor (${qInfo.quality}) [Dublado]` : `Kairou · Áudio Original (${qInfo.quality}) [Legendado PT-BR]`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            priority: isDub ? 1 : 2,
            isDub,
            isBest: true,
            subtitles: s.subtitles || [],
          });
        }
      }
    }
  } catch (e) {
    console.warn('[extractBestCine] Erro:', e?.message);
  }

  return streams;
}

// 1. FrostStream (Stremio Addon Direto - 4K e 1080p Ultra HD Dublado)
async function extractFrostStream({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const targetId = imdbId || (await resolveImdbId(tmdbId, isSeries));
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://froststream.cloutteam.com/stream/${path}`;
  const streams = [];

  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
      }
    }, 4500);

    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data.streams) && data.streams.length > 0) {
        // Testar rapidamente se o backend do FrostStream está online ou com streams expiradas (404)
        const sampleUrl = data.streams[0]?.url;
        if (sampleUrl) {
          try {
            const probe = await fetchWithTimeout(sampleUrl, { method: 'HEAD' }, 1500);
            if (probe && probe.status === 404) {
              console.warn('[extractFrostStream] FrostStream retornando 404. Ignorando streams caídos...');
              return [];
            }
          } catch {}
        }

        for (let idx = 0; idx < data.streams.length; idx++) {
          const s = data.streams[idx];
          let streamUrl = normalizeStreamUrl(s.url);
          if (!streamUrl) continue;
          if (s.behaviorHints?.notWebReady && !streamUrl.startsWith('/api/proxy')) {
            streamUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`;
          }

          const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('master.txt');
          const titleText = s.title || s.description || '';
          const nameText = s.name || '';
          const qInfo = detectQuality(streamUrl, nameText, titleText);
          const metaLower = `${titleText} ${nameText}`.toLowerCase();
          const isLeg = metaLower.includes('legendado') || metaLower.includes('legend') || metaLower.includes('sub') || metaLower.includes('🇺🇸') || metaLower.includes('🇯🇵') || metaLower.includes('japones') || metaLower.includes('japonês');
          const isDub = !isLeg && (metaLower.includes('português') || metaLower.includes('portugues') || metaLower.includes('dublado') || metaLower.includes('dub') || metaLower.includes('nacional') || metaLower.includes('🇧🇷'));

          streams.push({
            id: `kairou-frost-${idx}-${Date.now()}`,
            server: 'Kairou',
            providerName: isDub ? `Kairou · Servidor (${qInfo.quality}) [Dublado]` : `Kairou · Áudio Original (${qInfo.quality}) [Legendado PT-BR]`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            priority: isDub ? 1 : 2,
            isDub,
            isFrost: true,
            subtitles: s.subtitles || [],
          });
        }
      }
    }
  } catch (e) {
    console.warn('[extractFrostStream] Erro:', e?.message);
  }

  return streams;
}

// 2. FenixFlix (Stremio Addon Direto - PT-BR Dublado / Legendado)
async function extractFenixFlix({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const targetId = imdbId || (await resolveImdbId(tmdbId, isSeries)) || `tmdb:${tmdbId}`;

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://fenixflix.fenixhub.online/stream/${path}`;
  const streams = [];

  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
      }
    }, 4500);

    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data.streams)) {
        for (let idx = 0; idx < data.streams.length; idx++) {
          const s = data.streams[idx];
          if (!s || !s.url) continue;
          const streamUrl = normalizeStreamUrl(s.url);
          if (!streamUrl) continue;

          const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('master.txt');
          const titleText = (s.title || s.description || '');
          const nameText = (s.name || '');
          const qInfo = detectQuality(streamUrl, nameText, titleText);
          const metaLower = `${titleText} ${nameText}`.toLowerCase();
          const isLeg = metaLower.includes('legendado') || metaLower.includes('legend') || metaLower.includes('sub') || metaLower.includes('🇺🇸') || metaLower.includes('🇯🇵') || metaLower.includes('japones') || metaLower.includes('japonês');
          const isDub = !isLeg && (metaLower.includes('dublado') || metaLower.includes('dub') || metaLower.includes('nacional') || metaLower.includes('🇧🇷') || metaLower.includes('dual') || metaLower.includes('português') || metaLower.includes('portugues'));

          streams.push({
            id: `kairou-fenix-${idx}-${Date.now()}`,
            server: 'Kairou',
            providerName: isDub ? `Kairou · Servidor (${qInfo.quality}) [Dublado]` : `Kairou · Áudio Original (${qInfo.quality}) [Legendado PT-BR]`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            priority: isDub ? 1 : 2,
            isDub,
            isFenix: true,
            subtitles: s.subtitles || [],
          });
        }
      }
    }
  } catch (e) {
    console.warn('[extractFenixFlix] Erro:', e?.message);
  }

  return streams;
}

// 3. Servidor Zeus (Stremio Addon Direto BeamUp - Descontinuado/Offline)
async function extractZeus({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  return [];
}

// 4. ClickHost (embed-api.clickhost.xyz)
async function extractClickHost({ tmdbId, type, season = 1, episode = 1 }) {
  if (!tmdbId) return [];
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const path = isSeries
    ? `/embed/serie/${tmdbId}/${season}/${episode}?ad_played=1`
    : `/embed/filme/${tmdbId}?ad_played=1`;

  try {
    const res = await fetchWithTimeout(`https://embed-api.clickhost.xyz${path}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://embed-api.clickhost.xyz/',
        'Origin': 'https://embed-api.clickhost.xyz',
      },
    }, 4500);

    if (!res || !res.ok) return [];
    const html = await res.text();
    const serversMatch = html.match(/(?:const\s+servers\s*=\s*|servers\s*:\s*)(\[[\s\S]*?\])/);
    if (!serversMatch) return [];

    let serversList = [];
    try {
      serversList = JSON.parse(serversMatch[1]);
    } catch {
      return [];
    }

    const initPromises = serversList.map(async (srv) => {
      if (!srv.id || srv.down) return null;
      try {
        const initRes = await fetchWithTimeout(`https://embed-api.clickhost.xyz/embed/stream/${srv.id}/init`, {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': `https://embed-api.clickhost.xyz${path}`,
            'Origin': 'https://embed-api.clickhost.xyz',
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
          },
        }, 4000);

        if (!initRes || !initRes.ok) return null;
        const initJson = await initRes.json();
        if (initJson && initJson.ok && initJson.url) {
          const rawUrl = initJson.url.startsWith('http')
            ? initJson.url
            : `https://embed-api.clickhost.xyz${initJson.url}`;
          const streamUrl = normalizeStreamUrl(rawUrl);
          if (!streamUrl) return null;
          const isHls = Boolean(initJson.is_hls || streamUrl.includes('.m3u8'));
          const qInfo = detectQuality(streamUrl, srv.label || srv.name || '', '');
          return {
            id: `kairou-click-${srv.id}`,
            server: 'Kairou',
            providerName: `Kairou · ClickHost (${qInfo.quality}) [Dublado]`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            priority: 2,
            isDub: true,
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

// 5. SuperFlix (superflixapi.beer)
async function extractSuperFlix({ tmdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const path = isSeries
    ? `/serie/${tmdbId}/${season}/${episode}`
    : `/filme/${tmdbId}`;

  try {
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
        id: `kairou-sflix-${Date.now()}`,
        server: 'Kairou',
        providerName: `Kairou · SuperFlix (${qInfo.quality})`,
        url,
        type: isHls ? 'hls' : 'mp4',
        quality: qInfo.quality,
        rank: qInfo.rank,
        isHls,
        priority: qInfo.rank,
        isDub: true,
      }];
    }
  } catch {}
  return [];
}

// 6. WarezCDN (warezcdn.lat)
async function extractWarezCDN({ tmdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const path = isSeries
    ? `/serie/${tmdbId}/${season}/${episode}`
    : `/filme/${tmdbId}`;

  try {
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
        id: `kairou-warez-${Date.now()}`,
        server: 'Kairou',
        providerName: `Kairou · Warez (${qInfo.quality})`,
        url,
        type: isHls ? 'hls' : 'mp4',
        quality: qInfo.quality,
        rank: qInfo.rank,
        isHls,
        priority: qInfo.rank,
        isDub: true,
      }];
    }
  } catch {}
  return [];
}

// 7. MegaEmbed (mgeb.top / FontedeCanais)
async function extractMegaEmbed({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const id = tmdbId || imdbId;
  const path = isSeries
    ? `/embed/${id}/${season}/${episode}`
    : `/embed/${id}`;

  const streams = [];

  try {
    const res = await fetchWithTimeout(`https://mgeb.top${path}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://mgeb.top/',
      },
    }, 3000);

    if (res && res.ok) {
      const html = await res.text();
      const sourcesMatch = html.match(/var\s+sources\s*=\s*(\[[\s\S]*?\]);/);
      if (sourcesMatch) {
        const rawSources = JSON.parse(sourcesMatch[1]);
        for (let idx = 0; idx < rawSources.length; idx++) {
          const s = rawSources[idx];
          if (!s.file || typeof s.file !== 'string') continue;
          let fileUrl = normalizeStreamUrl(s.file);
          if (!fileUrl) continue;

          const isHls = s.type === 'hls' || fileUrl.includes('.m3u8') || fileUrl.includes('hls.php');
          const qInfo = detectQuality(fileUrl, s.label || '', '');

          streams.push({
            id: `kairou-mega-${idx}-${Date.now()}`,
            server: 'Kairou',
            providerName: `Kairou · MegaEmbed (${qInfo.quality}) [Dublado]`,
            url: fileUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            priority: 1,
            isDub: true,
          });
        }
      }
    }
  } catch {}

  return streams;
}

// 8. OpenSubtitles v3 (Stremio Addon Oficial - Legendas PT-BR, EN, ES)
async function extractOpenSubtitles({ imdbId, type, season = 1, episode = 1 }) {
  if (!imdbId) return [];
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const path = isSeries
    ? `series/${imdbId}:${season}:${episode}.json`
    : `movie/${imdbId}.json`;

  try {
    const res = await fetchWithTimeout(`https://opensubtitles-v3.strem.io/subtitles/${path}`, {}, 4000);
    if (!res || !res.ok) return [];
    const data = await res.json();
    const rawList = data.subtitles || [];
    if (!Array.isArray(rawList) || rawList.length === 0) return [];

    const langNames = {
      pob: 'Português (Brasil)',
      por: 'Português',
      eng: 'Inglês',
      spa: 'Espanhol',
      fre: 'Francês',
      fra: 'Francês',
    };

    const allowed = ['pob', 'por', 'eng', 'spa', 'fre', 'fra'];
    const counts = {};
    const formatted = [];

    const sorted = [...rawList].sort((a, b) => {
      const order = { pob: 1, por: 2, eng: 3, spa: 4, fre: 5, fra: 5 };
      return (order[a.lang] || 99) - (order[b.lang] || 99);
    });

    for (const item of sorted) {
      const l = item.lang;
      if (!allowed.includes(l)) continue;
      counts[l] = (counts[l] || 0) + 1;
      if (counts[l] <= 2) {
        const baseName = langNames[l] || l.toUpperCase();
        const label = counts[l] > 1 ? `${baseName} (Opção ${counts[l]})` : baseName;
        formatted.push({
          id: item.id || `sub-${l}-${counts[l]}`,
          lang: l === 'pob' ? 'pt-BR' : (l === 'por' ? 'pt' : (l === 'eng' ? 'en' : l)),
          label,
          url: `/api/proxy?format=vtt&url=${encodeURIComponent(item.url)}`,
          originalUrl: item.url,
          isExternal: true,
        });
      }
    }

    return formatted;
  } catch (e) {
    console.warn('[extractOpenSubtitles] Erro:', e?.message);
    return [];
  }
}

export default async function handler(req, res) {
  // CORS Headers para frontend
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

  let { tmdbId, type = 'movie', season = 1, episode = 1, imdbId: queryImdbId } = req.query || {};

  // Se tmdbId foi enviado como um ID do IMDb (ex: tt31450459)
  if (typeof tmdbId === 'string' && tmdbId.startsWith('tt')) {
    queryImdbId = tmdbId;
    tmdbId = null;
  }

  // Sanitizar tmdbId numérico inválido
  if (tmdbId === 'NaN' || tmdbId === 'undefined' || !tmdbId) {
    tmdbId = null;
  }

  let imdbId = queryImdbId || null;

  // Se temos imdbId mas não temos tmdbId numérico, resolver via TMDB /find/
  if (!tmdbId && imdbId) {
    const resolved = await resolveTmdbFromImdb(imdbId);
    if (resolved?.tmdbId) {
      tmdbId = resolved.tmdbId;
      if (resolved.type) type = resolved.type;
    }
  }

  if (!tmdbId && !imdbId) {
    return res.status(400).json({ ok: false, error: 'tmdbId ou imdbId é obrigatório' });
  }

  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const effectiveId = tmdbId || imdbId;
  const cacheKey = `${effectiveId}-${isSeries ? 'series' : 'movie'}-${season}-${episode}`;

  // 1. Cache Instantâneo em RAM do Servidor (< 1ms)
  const cached = serverExtractCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS) && cached.payload?.streams?.length > 0) {
    res.setHeader('X-Cache-Status', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=600');
    return res.status(200).json(cached.payload);
  }

  try {
    // 2. Resolver IMDb ID se tivermos apenas tmdbId
    if (!imdbId && tmdbId) {
      imdbId = await resolveImdbId(tmdbId, isSeries);
    }

    // 3. Execução Paralela de Provedores Stremio Nativos & Web (100% Streams Diretos) + OpenSubtitles
    const [bestRes, fenixRes, frostRes, zeusRes, clickRes, superRes, warezRes, megaRes, subsRes] = await Promise.allSettled([
      extractBestCine({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractFenixFlix({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractFrostStream({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractZeus({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractClickHost({ tmdbId, type, season: Number(season), episode: Number(episode) }),
      extractSuperFlix({ tmdbId, type, season: Number(season), episode: Number(episode) }),
      extractWarezCDN({ tmdbId, type, season: Number(season), episode: Number(episode) }),
      extractMegaEmbed({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractOpenSubtitles({ imdbId, type, season: Number(season), episode: Number(episode) }),
    ]);

    const collected = [];
    if (bestRes.status === 'fulfilled' && Array.isArray(bestRes.value)) collected.push(...bestRes.value);
    if (fenixRes.status === 'fulfilled' && Array.isArray(fenixRes.value)) collected.push(...fenixRes.value);
    if (frostRes.status === 'fulfilled' && Array.isArray(frostRes.value)) collected.push(...frostRes.value);
    if (zeusRes.status === 'fulfilled' && Array.isArray(zeusRes.value)) collected.push(...zeusRes.value);
    if (clickRes.status === 'fulfilled' && Array.isArray(clickRes.value)) collected.push(...clickRes.value);
    if (superRes.status === 'fulfilled' && Array.isArray(superRes.value)) collected.push(...superRes.value);
    if (warezRes.status === 'fulfilled' && Array.isArray(warezRes.value)) collected.push(...warezRes.value);
    if (megaRes.status === 'fulfilled' && Array.isArray(megaRes.value)) collected.push(...megaRes.value);

    const extractedSubtitles = subsRes.status === 'fulfilled' && Array.isArray(subsRes.value) ? subsRes.value : [];

    // Desduplicação por URL
    const seenUrls = new Set();
    const uniqueStreams = [];
    for (const s of collected) {
      // Ignorar qualquer stream de iframe ou embed
      if (!s.url || s.isEmbed || s.type === 'iframe') continue;
      if (!seenUrls.has(s.url)) {
        seenUrls.add(s.url);
        uniqueStreams.push(s);
      }
    }

    // Ordenação Inteligente com PRIORIDADE ABSOLUTA PARA 4K ULTRA HD:
    // 1. 4K TEM PRECEDÊNCIA MÁXIMA (Qualquer 4K vai para o topo imediatamente)
    // 2. Entre 4K (ou não-4K), ÁUDIO PT-BR (Dublado / Dual Áudio) vem em 1º lugar
    // 3. Resolução máxima (1080p > 720p > 480p)
    // 4. Desempate: BestCine (4K Dedicado) > FenixFlix > FrostStream > Zeus > ClickHost > HTTPS
    uniqueStreams.sort((a, b) => {
      const rankA = typeof a.rank === 'number' ? a.rank : detectQuality(a.url || '', a.providerName || '', a.quality || '').rank;
      const rankB = typeof b.rank === 'number' ? b.rank : detectQuality(b.url || '', b.providerName || '', b.quality || '').rank;

      const aIs4k = rankA === 1 || (a.quality || '').includes('4K') || (a.providerName || '').includes('4K');
      const bIs4k = rankB === 1 || (b.quality || '').includes('4K') || (b.providerName || '').includes('4K');

      // 4K SEMPRE NO TOPO: Se A é 4K e B não é, A vence imediatamente
      if (aIs4k && !bIs4k) return -1;
      if (!aIs4k && bIs4k) return 1;

      // Se ambos são 4K (ou ambos não são 4K), priorizar áudio Dublado / PT-BR
      const aIsDub = Boolean((a.providerName || '').includes('Dublado') || a.isDub || a.dubbed);
      const bIsDub = Boolean((b.providerName || '').includes('Dublado') || b.isDub || b.dubbed);
      if (aIsDub !== bIsDub) {
        return aIsDub ? -1 : 1;
      }

      // Entre streams de mesma categoria, resolução máxima
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // Desempate de mesma resolução:
      if (a.isBest && !b.isBest) return -1;
      if (!a.isBest && b.isBest) return 1;

      if (a.isFenix && !b.isFenix) return -1;
      if (!a.isFenix && b.isFenix) return 1;

      if (a.isFrost && !b.isFrost) return -1;
      if (!a.isFrost && b.isFrost) return 1;

      if (a.isZeus && !b.isZeus) return -1;
      if (!a.isZeus && b.isZeus) return 1;

      const aIsHttps = (a.url || '').startsWith('https://') ? 1 : 0;
      const bIsHttps = (b.url || '').startsWith('https://') ? 1 : 0;
      if (aIsHttps !== bIsHttps) {
        return bIsHttps - aIsHttps;
      }

      return (a.priority || 5) - (b.priority || 5);
    });

    // Mascarar nomes mantendo 100% Kairou (Zero vazamento de nomes originais)
    let dubCounter = 0;
    let subCounter = 0;

    const finalStreams = uniqueStreams.map((s) => {
      const is4k = (s.quality || '').includes('4K');
      const is2k = (s.quality || '').includes('1440') || (s.quality || '').includes('2K');
      const is1080 = (s.quality || '').includes('1080');
      const isDub = Boolean(s.isDub || s.dubbed || (s.providerName || '').includes('[Dublado]'));
      let badge = '1080p Full HD';
      if (is4k) badge = '4K Ultra HD';
      else if (is2k) badge = '1440p 2K';
      else if (is1080) badge = '1080p Full HD';
      else if ((s.quality || '').includes('720')) badge = '720p HD';
      else if ((s.quality || '').includes('480')) badge = '480p';

      let finalName = '';
      if (isDub) {
        dubCounter++;
        if (dubCounter === 1) {
          finalName = `Kairou · Servidor Principal (${badge}) [Dublado]`;
        } else if (dubCounter === 2) {
          finalName = `Kairou · Servidor Ultra (${badge}) [Dublado]`;
        } else if (dubCounter === 3) {
          finalName = `Kairou · Servidor Rápido (${badge}) [Dublado]`;
        } else if (dubCounter === 4) {
          finalName = `Kairou · Servidor Estável (${badge}) [Dublado]`;
        } else {
          finalName = `Kairou · Servidor Reserva ${dubCounter - 4} (${badge}) [Dublado]`;
        }
      } else {
        subCounter++;
        finalName = `Kairou · Áudio Original ${subCounter} (${badge}) [Legendado PT-BR]`;
      }

      const streamSubs = Array.isArray(s.subtitles) && s.subtitles.length > 0 ? s.subtitles : extractedSubtitles;

      return {
        ...s,
        server: 'Kairou',
        providerName: finalName,
        isDub,
        lang: isDub ? 'pt' : 'en',
        quality: badge,
        subtitles: streamSubs,
      };
    });

    const payload = {
      ok: true,
      count: finalStreams.length,
      streams: finalStreams,
      subtitles: extractedSubtitles,
    };

    if (finalStreams.length > 0) {
      serverExtractCache.set(cacheKey, { timestamp: Date.now(), payload });
    }

    return res.status(200).json(payload);
  } catch (err) {
    console.error('[API Extract] Erro:', err);
    return res.status(500).json({ ok: false, error: err.message, streams: [] });
  }
}


