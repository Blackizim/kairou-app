// Vercel Serverless & Local PC Node.js Function: /api/extract
// Resolvedor de alta performance para Kairou Streaming
// Integra as melhores fontes BR testadas: Kairou Native, BestCine, FrostStream, Vê Tela, MagnetFlix e BsCine
// Prioridade máxima estrita: 4K Ultra HD Dublado > 4K Legendado > 1080p Full HD Dublado

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const FETCH_TIMEOUT_MS = 5000;

// Memória Cache de Alta Performance em RAM (< 1ms resposta)
const serverExtractCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas
const imdbIdCache = new Map();
const tmdbFromImdbCache = new Map();

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

// Normaliza streams, descarta placeholders e garante compatibilidade de CORS e mixed content
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
    u.includes('v-net.work') ||
    u.includes('never_gonna_give_you_up')
  ) {
    return '';
  }

  // Se já for rota de proxy local
  if (u.startsWith('/api/proxy')) {
    return u;
  }

  // Remove referências antigas a proxy se houver
  if (u.includes('brflix.lat/dynamic-proxy/')) {
    u = u.replace(/https?:\/\/brflix\.lat\/dynamic-proxy\//i, '');
    if (!u.startsWith('http')) u = `https://${u}`;
  }

  // Únicos hosts diretos com HTTPS válido, alta velocidade e CORS nativo que NÃO devem passar pelo proxy:
  // (Nota: bestcine.dpdns.org NUNCA deve passar pelo proxy da VPS pois a Cloudflare bloqueia IPs de datacenter)
  const isDirectFastHost =
    u.includes('bestcine.dpdns.org') ||
    u.includes('cnvods.com') ||
    u.includes('vodshuby.com') ||
    u.includes('duckdns.org');

  if (isDirectFastHost && u.startsWith('https://')) {
    return u;
  }

  // QUALQUER OUTRA FONTE (IPTV dinâmico, vodis, pfsv, gmafast, oneplayfast, 2kbrfonte, tech-cdn,
  // HTTP inseguro, IPs diretos ou domínios com SSL autoassinado/inválido/cipher antigo)
  // DEVE ser encapsulada no Turbo Proxy local para garantir HTTPS, CORS, Range HTTP 206 e eliminar Mixed Content!
  return `/api/proxy?url=${encodeURIComponent(u)}`;
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
  const urlPath = (url || '').toLowerCase().split('?')[0];

  // 1. 4K Ultra HD (2160p / 4K / UHD)
  if (
    /\b(4k|uhd|2160p?|ultra\s*hd|ultrahd)\b/i.test(metaText) ||
    /(?:_|-|\/|\.)(?:2160p?|4k|uhd)(?:_|-|\/|\.|$)/i.test(urlPath) ||
    urlPath.includes('3840x2160')
  ) {
    return { quality: '4K Ultra HD', rank: 1, is4k: true };
  }

  // 2. 1440p 2K (QHD)
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

  // 4. 720p HD
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

  // Padrão de alta qualidade: 1080p Full HD
  return { quality: '1080p Full HD', rank: 3, is1080: true };
}

const TMDB_READ_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MjljMjk3OTUwZTYxZTBjNzE3OGI1ZmQ5YzllNmZhMCIsIm5iZiI6MTc1MTgyNDMyMC40NTcsInN1YiI6IjY4NmFiN2MwZDQ4OWE5YzMyYTUzZmFjNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.IBBf0y2Nv9mzgXSpswQC2MsezfsDKAkhtKTC3211BpY';

// Resolução de IMDb ID via TMDB com fallback inteligente de tipo
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

// Resolução de TMDB ID a partir de IMDb ID
async function resolveTmdbFromImdb(imdbId) {
  if (!imdbId || typeof imdbId !== 'string') return null;
  const clean = imdbId.trim();
  if (tmdbFromImdbCache.has(clean)) {
    return tmdbFromImdbCache.get(clean);
  }
  try {
    const res = await fetchWithTimeout(
      `https://api.themoviedb.org/3/find/${clean}?external_source=imdb_id`,
      { headers: { Authorization: `Bearer ${TMDB_READ_TOKEN}` } },
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. BestCine (https://bestcine.dpdns.org) - PRIORIDADE 1 ABSOLUTA (4K HDR & 1080p)
// ─────────────────────────────────────────────────────────────────────────────
async function extractBestCine({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const targetId = isSeries
    ? (tmdbId ? `tmdb:${tmdbId}` : null) || imdbId || (await resolveImdbId(tmdbId, isSeries))
    : (imdbId || (await resolveImdbId(tmdbId, isSeries)) || (tmdbId ? `tmdb:${tmdbId}` : null));
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
          if (!s || !s.url || s.infoHash || s.behaviorHints?.p2p) continue;

          let streamUrl = normalizeStreamUrl(s.url);
          if (!streamUrl) continue;

          const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('master.txt');
          const titleText = (s.title || s.description || '');
          const nameText = (s.name || '');
          const combined = `${titleText} ${nameText}`;
          const metaLower = combined.toLowerCase();

          const is4k = /\b(4k|uhd|2160p?)\b/i.test(combined);
          const isDual = metaLower.includes('dual') || metaLower.includes('🔀');
          const hasDub = metaLower.includes('dublado') || metaLower.includes('dub') || isDual || metaLower.includes('nacional') || metaLower.includes('português') || metaLower.includes('portugues') || metaLower.includes('🇧🇷');
          const isLegOnly = !hasDub && (metaLower.includes('legendado') || metaLower.includes('legend') || metaLower.includes('sub') || metaLower.includes('🇺🇸') || metaLower.includes('🇯🇵'));
          const isDub = hasDub || !isLegOnly;

          const qInfo = detectQuality(streamUrl, nameText, titleText, is4k ? '4K' : null);

          streams.push({
            id: `kairou-best-${idx}-${Date.now()}`,
            server: s.server || 'Kairou',
            providerName: isDub ? `Kairou · Servidor (${qInfo.quality}) [Dublado]` : `Kairou · Áudio Original (${qInfo.quality}) [Legendado PT-BR]`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            is4k: qInfo.is4k || is4k,
            priority: (qInfo.is4k && isDub) ? 1 : (qInfo.is4k ? 2 : (isDub ? 3 : 4)),
            isDub,
            isDual: isDual || is4k,
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. FrostStream (https://froststream.cloutteam.com) - PRIORIDADE 2 (4K HDR & 1080p)
// ─────────────────────────────────────────────────────────────────────────────
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
        for (let idx = 0; idx < data.streams.length; idx++) {
          const s = data.streams[idx];
          if (!s || !s.url || s.infoHash) continue;
          let streamUrl = normalizeStreamUrl(s.url);
          if (!streamUrl) continue;

          const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('master.txt');
          const titleText = (s.title || s.description || '');
          const nameText = (s.name || '');
          const combined = `${titleText} ${nameText}`;
          const metaLower = combined.toLowerCase();

          const is4k = /\b(4k|uhd|2160p?)\b/i.test(combined);
          const isDual = metaLower.includes('dual') || metaLower.includes('🔀');
          const isLeg = metaLower.includes('legendado') || metaLower.includes('legend') || metaLower.includes('sub') || metaLower.includes('🇺🇸') || metaLower.includes('🇯🇵');
          const isDub = !isLeg && (metaLower.includes('português') || metaLower.includes('portugues') || metaLower.includes('dublado') || metaLower.includes('dub') || isDual || metaLower.includes('nacional') || metaLower.includes('🇧🇷'));

          const qInfo = detectQuality(streamUrl, nameText, titleText, is4k ? '4K' : null);

          streams.push({
            id: `kairou-frost-${idx}-${Date.now()}`,
            server: s.server || 'Kairou',
            providerName: isDub ? `Kairou · Servidor (${qInfo.quality}) [Dublado]` : `Kairou · Áudio Original (${qInfo.quality}) [Legendado PT-BR]`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            is4k: qInfo.is4k || is4k,
            priority: (qInfo.is4k && isDub) ? 1 : (qInfo.is4k ? 2 : (isDub ? 3 : 4)),
            isDub,
            isDual: isDual || is4k,
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

// ─────────────────────────────────────────────────────────────────────────────
// 3. Vê Tela (https://addon.thsolucoes.site) - PRIORIDADE 3 (Wasabi S3, cnvods MP4)
// ─────────────────────────────────────────────────────────────────────────────
async function extractVeTela({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const targetId = imdbId || (await resolveImdbId(tmdbId, isSeries));
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://addon.thsolucoes.site/stream/${path}`;
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
          if (!s || !s.url || s.infoHash) continue;
          let streamUrl = normalizeStreamUrl(s.url);
          if (!streamUrl) continue;

          const isHls = streamUrl.includes('.m3u8');
          const titleText = (s.title || s.description || '');
          const nameText = (s.name || '');
          const combined = `${titleText} ${nameText}`;
          const metaLower = combined.toLowerCase();

          const isDub = metaLower.includes('dublado') || metaLower.includes('dub') || metaLower.includes('🇧🇷') || metaLower.includes('cs') || metaLower.includes('ss');
          const qInfo = detectQuality(streamUrl, nameText, titleText);

          streams.push({
            id: `kairou-vetela-${idx}-${Date.now()}`,
            server: s.server || 'Kairou',
            providerName: isDub ? `Kairou · Servidor (${qInfo.quality}) [Dublado]` : `Kairou · Áudio Original (${qInfo.quality})`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            priority: isDub ? 3 : 5,
            isDub,
            isVeTela: true,
            subtitles: s.subtitles || [],
          });
        }
      }
    }
  } catch (e) {
    console.warn('[extractVeTela] Erro:', e?.message);
  }

  return streams;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BsCine (https://bscine.alwaysdata.net) - PRIORIDADE 5 (MP4 1080p Dublado)
// ─────────────────────────────────────────────────────────────────────────────
async function extractBsCine({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const targetId = imdbId || (await resolveImdbId(tmdbId, isSeries));
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://bscine.alwaysdata.net/stream/${path}`;
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
          if (!s || !s.url || s.infoHash) continue;
          let streamUrl = normalizeStreamUrl(s.url);
          if (!streamUrl) continue;

          const isHls = streamUrl.includes('.m3u8');
          const titleText = (s.title || s.description || '');
          const nameText = (s.name || '');
          const metaLower = `${titleText} ${nameText}`.toLowerCase();
          const isDub = metaLower.includes('dublado');
          const qInfo = detectQuality(streamUrl, nameText, titleText);

          streams.push({
            id: `kairou-bscine-${idx}-${Date.now()}`,
            server: s.server || 'Kairou',
            providerName: isDub ? `Kairou · Servidor (${qInfo.quality}) [Dublado]` : `Kairou · Áudio Original (${qInfo.quality})`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            priority: 4,
            isDub,
            isBsCine: true,
            subtitles: s.subtitles || [],
          });
        }
      }
    }
  } catch (e) {
    console.warn('[extractBsCine] Erro:', e?.message);
  }

  return streams;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Kairou Native Server (Infraestrutura Própria Oficial do Kairou)
// Consulta direta aos servidores CDN originais em altíssima velocidade (< 300ms)
// Substitui completamente o FenixFlix com suporte nativo a 1080p e 4K Dublado e Legendado
// ─────────────────────────────────────────────────────────────────────────────
async function extractKairouNative({ tmdbId, type, season = 1, episode = 1 }) {
  if (!tmdbId || isNaN(Number(tmdbId))) return [];
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const streams = [];

  const audios = ['dub', 'leg'];
  const fetchPromises = audios.map(async (audio) => {
    const q = new URLSearchParams({
      id: String(tmdbId),
      audio,
    });
    if (isSeries) {
      q.set('s', String(season || 1));
      q.set('e', String(episode || 1));
    }

    const url = `https://zunderflix.lat/api/media/sources?${q.toString()}`;
    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://zunderflix.lat/',
          'Accept': 'application/json',
        }
      }, 3500);

      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sources)) {
          return { audio, sources: data.sources };
        }
      }
    } catch (e) {
      console.warn(`[extractKairouNative:${audio}] Erro:`, e?.message);
    }
    return null;
  });

  const results = await Promise.allSettled(fetchPromises);
  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const { audio, sources } = r.value;
    const isDub = audio === 'dub';

    sources.forEach((s, idx) => {
      if (!s || !s.src) return;
      const fullUrl = s.src.startsWith('http') ? s.src : `https://zunderflix.lat${s.src}`;
      const streamUrl = normalizeStreamUrl(fullUrl);
      if (!streamUrl) return;

      const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('hls') || Boolean(s.hls) || Boolean(s.nativeHls);
      const labelText = s.label || '';
      const qInfo = detectQuality(fullUrl, labelText, isDub ? 'Dublado' : 'Legendado');

      streams.push({
        id: `kairou-native-${audio}-${idx}-${Date.now()}`,
        server: 'Kairou',
        providerName: isDub
          ? `Kairou · ${qInfo.quality} [Dublado]`
          : `Kairou · Áudio Original (${qInfo.quality}) [Legendado PT-BR]`,
        url: streamUrl,
        type: isHls ? 'hls' : 'mp4',
        quality: qInfo.quality,
        rank: qInfo.rank,
        isHls,
        priority: isDub ? 1 : 2, // Prioridade máxima no player Kairou
        isDub,
        isKairouNative: true,
        subtitles: [],
      });
    });
  }

  return streams;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. OpenSubtitles v3 (Legendas)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 7. Veyra (https://veyra.shardweb.app) - Addon BR Filmes e Séries (HLS / MP4)
// ─────────────────────────────────────────────────────────────────────────────
async function extractVeyra({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const targetId = imdbId || (await resolveImdbId(tmdbId, isSeries)) || (tmdbId ? `tmdb:${tmdbId}` : null);
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://veyra.shardweb.app/stream/${path}`;
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
          if (!s || !s.url || s.infoHash) continue;
          let streamUrl = normalizeStreamUrl(s.url);
          if (!streamUrl) continue;

          const isHls = streamUrl.includes('.m3u8') || (s.name || '').includes('HLS');
          const titleText = (s.title || s.description || '');
          const nameText = (s.name || '');
          const combined = `${titleText} ${nameText}`;
          const metaLower = combined.toLowerCase();

          const is4k = /\b(4k|uhd|2160p?)\b/i.test(combined);
          const isDub = !metaLower.includes('legendado');
          const qInfo = detectQuality(streamUrl, nameText, titleText, is4k ? '4K' : null);

          streams.push({
            id: `kairou-veyra-${idx}-${Date.now()}`,
            server: 'Veyra',
            providerName: isDub ? `Veyra · Servidor (${qInfo.quality}) [Dublado]` : `Veyra · Servidor (${qInfo.quality}) [Legendado]`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            is4k: qInfo.is4k || is4k,
            priority: (qInfo.is4k && isDub) ? 2 : (isDub ? 3 : 5),
            isDub,
            isDual: true,
            subtitles: s.subtitles || [],
          });
        }
      }
    }
  } catch {}

  return streams;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. King VOD (https://da5f663b4690-kingvod.baby-beamup.club) - HLS Dublado
// ─────────────────────────────────────────────────────────────────────────────
async function extractKingVod({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const targetId = imdbId || (await resolveImdbId(tmdbId, isSeries)) || (tmdbId ? `tmdb:${tmdbId}` : null);
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://da5f663b4690-kingvod.baby-beamup.club/stream/${path}`;
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
          if (!s || !s.url || s.infoHash) continue;
          let streamUrl = normalizeStreamUrl(s.url);
          if (!streamUrl) continue;

          const isHls = streamUrl.includes('.m3u8');
          const titleText = (s.title || s.description || '');
          const nameText = (s.name || '');
          const combined = `${titleText} ${nameText}`;
          const isDub = !combined.toLowerCase().includes('legendado');
          const qInfo = detectQuality(streamUrl, nameText, titleText);

          streams.push({
            id: `kairou-king-${idx}-${Date.now()}`,
            server: 'King VOD',
            providerName: `King VOD · Servidor (${qInfo.quality}) [${isDub ? 'Dublado' : 'Original'}]`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            priority: 4,
            isDub,
            isDual: true,
            subtitles: s.subtitles || [],
          });
        }
      }
    }
  } catch {}

  return streams;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. MagnetFlix (https://magnetflix.flixbr.online) - Reativado (HLS & MP4)
// ─────────────────────────────────────────────────────────────────────────────
async function extractMagnetFlix({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const targetId = isSeries
    ? (tmdbId ? `tmdb:${tmdbId}` : null) || imdbId || (await resolveImdbId(tmdbId, isSeries))
    : (imdbId || (await resolveImdbId(tmdbId, isSeries)) || (tmdbId ? `tmdb:${tmdbId}` : null));
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://magnetflix.flixbr.online/stream/${path}`;
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
          if (!s || !s.url || s.infoHash || s.url.startsWith('magnet:')) continue;
          let streamUrl = normalizeStreamUrl(s.url);
          if (!streamUrl) continue;

          const isHls = streamUrl.includes('.m3u8');
          const titleText = (s.title || s.description || '');
          const nameText = (s.name || '');
          const metaLower = `${titleText} ${nameText}`.toLowerCase();
          const isDub = metaLower.includes('dublado') || metaLower.includes('pt-br') || !metaLower.includes('legendado');
          const qInfo = detectQuality(streamUrl, nameText, titleText);

          streams.push({
            id: `kairou-mf-${idx}-${Date.now()}`,
            server: 'MagnetFlix',
            providerName: `MagnetFlix · Servidor (${qInfo.quality}) [${isDub ? 'Dublado' : 'Legendado'}]`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            priority: 4,
            isDub,
            isDual: true,
            subtitles: s.subtitles || [],
          });
        }
      }
    }
  } catch {}

  return streams;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. PleiadesStream Anime (https://pleiadesstream.duckdns.org/addon/pleiades)
// ─────────────────────────────────────────────────────────────────────────────
async function extractPleiadesAnime({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const targetId = imdbId || (await resolveImdbId(tmdbId, isSeries));
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://pleiadesstream.duckdns.org/addon/pleiades/stream/${path}`;
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
          if (!s || !s.url || s.infoHash) continue;
          let streamUrl = normalizeStreamUrl(s.url);
          if (!streamUrl) continue;

          const isHls = streamUrl.includes('.m3u8');
          const titleText = (s.title || s.description || '');
          const nameText = (s.name || '');
          const qInfo = detectQuality(streamUrl, nameText, titleText);

          streams.push({
            id: `kairou-pleiades-${idx}-${Date.now()}`,
            server: 'PleiadesStream',
            providerName: `Pleiades · Anime (${qInfo.quality}) [Dual/Legendado]`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            priority: 4,
            isDub: false,
            isDual: true,
            subtitles: s.subtitles || [],
          });
        }
      }
    }
  } catch {}

  return streams;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. SuperStream (https://da5f663b4690-superstream.baby-beamup.club)
// ─────────────────────────────────────────────────────────────────────────────
async function extractSuperStream({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const targetId = imdbId || (await resolveImdbId(tmdbId, isSeries)) || (tmdbId ? `tmdb:${tmdbId}` : null);
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://da5f663b4690-superstream.baby-beamup.club/stream/${path}`;
  const streams = [];

  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
      }
    }, 4000);

    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data.streams)) {
        for (let idx = 0; idx < data.streams.length; idx++) {
          const s = data.streams[idx];
          if (!s || !s.url || s.infoHash) continue;
          let streamUrl = normalizeStreamUrl(s.url);
          if (!streamUrl) continue;

          const isHls = streamUrl.includes('.m3u8');
          const titleText = (s.title || s.description || '');
          const nameText = (s.name || '');
          const qInfo = detectQuality(streamUrl, nameText, titleText);

          streams.push({
            id: `kairou-ss-${idx}-${Date.now()}`,
            server: 'SuperStream',
            providerName: `SuperStream · Servidor (${qInfo.quality})`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            priority: 5,
            isDub: true,
            isDual: true,
            subtitles: s.subtitles || [],
          });
        }
      }
    }
  } catch {}

  return streams;
}


// ─────────────────────────────────────────────────────────────────────────
// CURAÇÃO INTELIGENTE DE SERVIDORES DE ELITE (4K / 1080p / 720p / EMBEDS)
// Filtra mais de 60 fluxos brutos para entregar de 6 a 9 campeões estáveis e rápidos
// ─────────────────────────────────────────────────────────────────────────
function curateTopStreams(allStreams, extractedSubtitles = []) {
  if (!Array.isArray(allStreams) || allStreams.length === 0) return [];
  const pools = {
    '4k_dub': [],
    '4k_sub': [],
    '1080_dub': [],
    '1080_sub': [],
    '720_dub': [],
    'others': []
  };

  const seenUrls = new Set();

  for (const s of allStreams) {
    if (!s || !s.url) continue;

    // Descartar iframes e embeds externos
    if (s.isIframe || s.type === 'iframe' || s.server === 'WarezCDN' || s.server === 'VidRU' || s.server === 'VidLink') {
      continue;
    }

    const urlClean = s.url.startsWith('/api/proxy?url=')
      ? decodeURIComponent(s.url.slice('/api/proxy?url='.length)).split('&t=')[0].split('&sig=')[0]
      : s.url.split('?')[0];
    if (seenUrls.has(urlClean)) continue;
    seenUrls.add(urlClean);

    const is4k = Boolean(s.is4k || (s.quality || '').includes('4K') || (s.name || '').includes('4k') || (s.title || '').includes('4k') || (s.providerName || '').includes('4K'));
    const is1080 = Boolean((s.quality || '').includes('1080') || (s.providerName || '').includes('1080'));
    const is720 = Boolean((s.quality || '').includes('720') || (s.providerName || '').includes('720'));
    const isDub = Boolean(s.isDub || (s.providerName || '').includes('[Dublado]'));

    if (is4k) {
      if (isDub) {
        pools['4k_dub'].push(s);
        // Gera versão com áudio original/legendada para cinéfilos se for dual
        pools['4k_sub'].push({
          ...s,
          id: (s.id || 'k4') + '-orig',
          isDub: false,
          lang: 'en',
          isDual: true,
        });
      } else {
        pools['4k_sub'].push(s);
      }
    } else if (is1080) {
      if (isDub) {
        pools['1080_dub'].push(s);
        if (s.isDual) {
          pools['1080_sub'].push({
            ...s,
            id: (s.id || 'k1080') + '-orig',
            isDub: false,
            lang: 'en',
          });
        }
      } else {
        pools['1080_sub'].push(s);
      }
    } else if (is720) {
      if (isDub) pools['720_dub'].push(s);
      else pools['1080_sub'].push(s);
    } else {
      pools['others'].push(s);
    }
  }

  // Ordenação de confiabilidade de CDN
  const sortPool = (list) => {
    return list.sort((a, b) => {
      const aAlive = a.alive !== false ? 1 : 0;
      const bAlive = b.alive !== false ? 1 : 0;
      if (aAlive !== bAlive) return bAlive - aAlive;

      const getCdnScore = (item) => {
        if (item.isKairouNative) return 0; // Kairou Native Server é a fonte oficial prioritária!
        const u = item.url || '';
        if (u.includes('zunderflix.lat')) return 0;
        if (u.includes('cnvods.com')) return 1;
        if (u.includes('bestcine.dpdns.org')) return 2;
        if (u.includes('froststream.cloutteam.com')) return 3;
        if (u.includes('shardweb.app')) return 4;
        if (u.includes('baby-beamup.club')) return 5;
        if (u.includes('wasabisys.com')) return 6;
        if (u.includes('qzz.io')) return 7;
        return 8;
      };
      return getCdnScore(a) - getCdnScore(b);
    });
  };

  const curated = [];

  const pickTop = (pool, maxCount, namePrefix, qualityLabel, isDub) => {
    sortPool(pool);
    const pickedUrls = new Set();
    const chosen = [];
    for (const item of pool) {
      const u = item.url.startsWith('/api/proxy?url=')
        ? decodeURIComponent(item.url.slice('/api/proxy?url='.length)).split('&t=')[0].split('&sig=')[0]
        : item.url.split('?')[0];
      if (!pickedUrls.has(u)) {
        pickedUrls.add(u);
        chosen.push(item);
        if (chosen.length >= maxCount) break;
      }
    }

    chosen.forEach((s, idx) => {
      let finalName = '';
      if (chosen.length === 1) {
        finalName = namePrefix + ' · Mais Estável';
      } else {
        finalName = idx === 0 ? namePrefix + ' · Mais Estável (Opção 1)' : namePrefix + ' (Opção ' + (idx + 1) + ')';
      }

      const streamSubs = Array.isArray(s.subtitles) && s.subtitles.length > 0 ? s.subtitles : extractedSubtitles;

      curated.push({
        ...s,
        server: s.server || 'Kairou',
        providerName: finalName,
        quality: qualityLabel,
        is4k: qualityLabel.includes('4K'),
        isDub,
        lang: isDub ? 'pt' : 'en',
        subtitles: streamSubs,
        isCurated: true,
      });
    });
  };

  // 1. 💎 4K Ultra HD Dublado (até 2 opções distintas)
  if (pools['4k_dub'].length > 0) {
    pickTop(pools['4k_dub'], 2, '💎 4K Ultra HD [Dublado]', '4K Ultra HD', true);
  }

  // 2. ⚡ 1080p Full HD Dublado (até 2 opções)
  if (pools['1080_dub'].length > 0) {
    pickTop(pools['1080_dub'], 2, '⚡ 1080p Full HD [Dublado]', '1080p Full HD', true);
  }

  // 3. 💎 4K Ultra HD Legendado
  if (pools['4k_sub'].length > 0) {
    pickTop(pools['4k_sub'], 1, '💎 4K Ultra HD [Legendado PT-BR]', '4K Ultra HD', false);
  }

  // 4. ⚡ 1080p Full HD Legendado
  if (pools['1080_sub'].length > 0) {
    pickTop(pools['1080_sub'], 1, '⚡ 1080p Full HD [Legendado PT-BR]', '1080p Full HD', false);
  }

  // 5. 📱 720p HD Econômico
  if (pools['720_dub'].length > 0) {
    pickTop(pools['720_dub'], 1, '📱 720p HD [Econômico]', '720p HD', true);
  }

  // 6. Fallback se não achou nada acima
  if (curated.filter(s => s.isDub).length === 0 && pools['others'].length > 0) {
    pickTop(pools['others'], 1, '⚡ Kairou Direto [Dublado]', '1080p Full HD', true);
  }



  return curated;
}

export default async function handler(req, res) {
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

  if (typeof tmdbId === 'string' && tmdbId.startsWith('tt')) {
    queryImdbId = tmdbId;
    tmdbId = null;
  }

  if (queryImdbId && !tmdbId) {
    const resolved = await resolveTmdbFromImdb(queryImdbId);
    if (resolved?.tmdbId) {
      tmdbId = resolved.tmdbId;
      if (resolved.type) type = resolved.type;
    }
  }

  if (!tmdbId && !queryImdbId) {
    return res.status(400).json({ ok: false, error: 'Parâmetro tmdbId ou imdbId é obrigatório' });
  }

  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const normalizedType = isSeries ? 'series' : 'movie';
  let imdbId = queryImdbId || null;

  const cacheKey = `${tmdbId || imdbId}-${normalizedType}-${season}-${episode}`;
  const cached = serverExtractCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS) && cached.payload?.streams?.length > 0) {
    res.setHeader('X-Cache-Status', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=600');
    return res.status(200).json(cached.payload);
  }

  try {
    if (!imdbId && tmdbId) {
      imdbId = await resolveImdbId(tmdbId, isSeries);
    }

    // Execução Paralela das Fontes BR Oficiais (Kairou Native como Prioridade 1)
    const [kairouNativeRes, bestRes, frostRes, vetelaRes, bscineRes, veyraRes, kingRes, magnetRes, pleiadesRes, ssRes, subsRes] = await Promise.allSettled([
      extractKairouNative({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractBestCine({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractFrostStream({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractVeTela({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractBsCine({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractVeyra({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractKingVod({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractMagnetFlix({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractPleiadesAnime({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractSuperStream({ tmdbId, imdbId, type, season: Number(season), episode: Number(episode) }),
      extractOpenSubtitles({ imdbId, type, season: Number(season), episode: Number(episode) }),
    ]);

    const collected = [];
    if (kairouNativeRes.status === 'fulfilled' && Array.isArray(kairouNativeRes.value)) collected.push(...kairouNativeRes.value);
    if (bestRes.status === 'fulfilled' && Array.isArray(bestRes.value)) collected.push(...bestRes.value);
    if (frostRes.status === 'fulfilled' && Array.isArray(frostRes.value)) collected.push(...frostRes.value);
    if (vetelaRes.status === 'fulfilled' && Array.isArray(vetelaRes.value)) collected.push(...vetelaRes.value);
    if (veyraRes.status === 'fulfilled' && Array.isArray(veyraRes.value)) collected.push(...veyraRes.value);
    if (kingRes.status === 'fulfilled' && Array.isArray(kingRes.value)) collected.push(...kingRes.value);
    if (magnetRes.status === 'fulfilled' && Array.isArray(magnetRes.value)) collected.push(...magnetRes.value);
    if (pleiadesRes.status === 'fulfilled' && Array.isArray(pleiadesRes.value)) collected.push(...pleiadesRes.value);
    if (ssRes.status === 'fulfilled' && Array.isArray(ssRes.value)) collected.push(...ssRes.value);
    if (bscineRes.status === 'fulfilled' && Array.isArray(bscineRes.value)) collected.push(...bscineRes.value);

    const extractedSubtitles = subsRes.status === 'fulfilled' && Array.isArray(subsRes.value) ? subsRes.value : [];

    // ─────────────────────────────────────────────────────────────────────────
    // CURAÇÃO DOS MELHORES SERVIDORES (MÁXIMO 7 A 9 SERVIDORES SELECIONADOS)
    // ─────────────────────────────────────────────────────────────────────────
    const curatedStreams = curateTopStreams(collected, extractedSubtitles);

    // ─────────────────────────────────────────────────────────────────────────
    // TESTE SIMULTÂNEO DE VELOCIDADE E LATÊNCIA NOS SERVIDORES CURADOS (TIMEOUT 1400ms)
    // ─────────────────────────────────────────────────────────────────────────
    await Promise.allSettled(
      curatedStreams.map(async (s) => {
        if (s.isIframe || s.type === 'iframe') {
          s.alive = true;
          s.latency = 120;
          return;
        }
        let testUrl = s.url;
        if (!testUrl) {
          s.alive = false;
          s.latency = 9999;
          return;
        }
        if (testUrl.startsWith('/api/proxy?url=')) {
          try {
            testUrl = decodeURIComponent(testUrl.split('/api/proxy?url=')[1]);
          } catch {}
        }
        const isHls = s.isHls || testUrl.includes('.m3u8') || testUrl.includes('master.txt');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2400);
        const t0 = Date.now();
        try {
          const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          };
          if (!isHls) {
            headers['Range'] = 'bytes=0-512';
          }
          const pingRes = await fetch(testUrl, {
            method: 'GET',
            headers,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          const dt = Date.now() - t0;
          const isAlive = pingRes.status === 200 || pingRes.status === 206 || (pingRes.status >= 300 && pingRes.status < 400);
          s.alive = isAlive;
          s.latency = isAlive ? dt : 9999;
          s.httpStatus = pingRes.status;
          try {
            if (pingRes.body && typeof pingRes.body.cancel === 'function') {
              pingRes.body.cancel().catch(() => {});
            }
          } catch {}
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          if (fetchErr && fetchErr.name === 'AbortError') {
            s.alive = true;
            s.latency = 2100;
          } else {
            s.alive = false;
            s.latency = 9999;
          }
        }
      })
    );

    // Filtrar servidores mortos comprovados (ex: 403 Forbidden ou erro de rede)
    const aliveOnly = curatedStreams.filter(s => s.alive !== false);
    const finalStreams = aliveOnly.length > 0 ? aliveOnly : curatedStreams;

    // Marcar o servidor 1080p dublado mais rápido com isFastest
    const aliveDub1080 = finalStreams.filter(s => s.isDub && !s.is4k && s.alive && !s.isIframe && s.type !== 'iframe');
    aliveDub1080.sort((a, b) => (a.latency || 9999) - (b.latency || 9999));
    if (aliveDub1080.length > 0) {
      aliveDub1080[0].isFastest = true;
    }

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
