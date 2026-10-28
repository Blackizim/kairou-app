// Serviço de Extração de Streams Diretos (HLS / MP4) para Kairou & Servidores
// Converte os endpoints dos servidores em fontes de vídeo nativas para nosso player próprio.
// Integração das melhores fontes BR: BestCine, FrostStream, Vê Tela, MagnetFlix, BsCine e FenixFlix
// Prioridade máxima estrita: 4K Ultra HD Dublado > 4K Legendado > 1080p Full HD Dublado

import { fetchMediaExternalIds } from './tmdb.js';

const FETCH_TIMEOUT_MS = 5000;

// Cache em memória para aceleração instantânea de mídias já consultadas (< 5ms)
const streamCache = new Map();

// Helper com timeout e suporte a AbortController
async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    return null;
  }
}

// Normaliza streams, descarta placeholders e garante compatibilidade de CORS e mixed content
export function normalizeStreamUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let u = url.trim();

  // Descartar placeholders de manutenção e mkv
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

  // Se já for rota do proxy local
  if (u.startsWith('/api/proxy')) {
    return u;
  }

  // Únicos hosts diretos com HTTPS válido, alta velocidade e CORS nativo que NÃO devem passar pelo proxy:
  // (Nota: bestcine.dpdns.org NUNCA deve passar pelo proxy da VPS pois a Cloudflare bloqueia IPs de datacenter)
  const isDirectFastHost =
    u.includes('bestcine.dpdns.org') ||
    u.includes('froststream.cloutteam.com') ||
    u.includes('cnvods.com') ||
    u.includes('wasabisys.com') ||
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

export function detectQuality(url = '', name = '', title = '', explicitQuality = null) {
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

  return { quality: '1080p Full HD', rank: 3, is1080: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Extrator BestCine (Stremio Multi-Source Oficial PT-BR - 4K Ultra HD & 1080p)
// ─────────────────────────────────────────────────────────────────────────────
export async function extractBestCine({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  let targetId = imdbId;
  if (!targetId || !String(targetId).startsWith('tt')) {
    try {
      targetId = await fetchMediaExternalIds(tmdbId, isSeries ? 'tv' : 'movie');
    } catch {}
  }
  const idToUse = targetId || (tmdbId ? `tmdb:${tmdbId}` : null);
  if (!idToUse) return [];

  const path = isSeries
    ? `series/${idToUse}:${season}:${episode}.json`
    : `movie/${idToUse}.json`;

  const url = `https://bestcine.dpdns.org/stream/${path}`;
  const streams = [];

  try {
    const res = await fetchWithTimeout(url, {}, 4500);
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
            server: 'Kairou',
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
  } catch {}

  return streams;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Extrator FrostStream (Stremio Addon Direto - 4K e 1080p Ultra HD Dublado)
// ─────────────────────────────────────────────────────────────────────────────
export async function extractFrostStream({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  let targetId = imdbId;
  if (!targetId || !String(targetId).startsWith('tt')) {
    try {
      targetId = await fetchMediaExternalIds(tmdbId, isSeries ? 'tv' : 'movie');
    } catch {}
  }
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://froststream.cloutteam.com/stream/${path}`;
  const streams = [];

  try {
    const res = await fetchWithTimeout(url, {}, 4500);
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
            server: 'Kairou',
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
  } catch {}

  return streams;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Extrator Vê Tela (https://addon.thsolucoes.site) - Wasabi S3 e cnvods MP4
// ─────────────────────────────────────────────────────────────────────────────
export async function extractVeTela({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  let targetId = imdbId;
  if (!targetId || !String(targetId).startsWith('tt')) {
    try {
      targetId = await fetchMediaExternalIds(tmdbId, isSeries ? 'tv' : 'movie');
    } catch {}
  }
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://addon.thsolucoes.site/stream/${path}`;
  const streams = [];

  try {
    const res = await fetchWithTimeout(url, {}, 4500);
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
            server: 'Kairou',
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
  } catch {}

  return streams;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Extrator BsCine (https://bscine.alwaysdata.net) - MP4 1080p Dublado
// ─────────────────────────────────────────────────────────────────────────────
export async function extractBsCine({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  let targetId = imdbId;
  if (!targetId || !String(targetId).startsWith('tt')) {
    try {
      targetId = await fetchMediaExternalIds(tmdbId, isSeries ? 'tv' : 'movie');
    } catch {}
  }
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://bscine.alwaysdata.net/stream/${path}`;
  const streams = [];

  try {
    const res = await fetchWithTimeout(url, {}, 4500);
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
            server: 'Kairou',
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
  } catch {}

  return streams;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Extrator FenixFlix (Fallback Secundário)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 7. Extrator Veyra (https://veyra.shardweb.app) - Addon BR Filmes e Séries
// ─────────────────────────────────────────────────────────────────────────────
export async function extractVeyra({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  let targetId = imdbId;
  if (!targetId || !String(targetId).startsWith('tt')) {
    try {
      targetId = await fetchMediaExternalIds(tmdbId, isSeries ? 'tv' : 'movie');
    } catch {}
  }
  const idToUse = targetId || (tmdbId ? `tmdb:${tmdbId}` : null);
  if (!idToUse) return [];

  const path = isSeries
    ? `series/${idToUse}:${season}:${episode}.json`
    : `movie/${idToUse}.json`;

  const url = `https://veyra.shardweb.app/stream/${path}`;
  const streams = [];

  try {
    const res = await fetchWithTimeout(url, {}, 4500);
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
// 8. Extrator King VOD (https://da5f663b4690-kingvod.baby-beamup.club)
// ─────────────────────────────────────────────────────────────────────────────
export async function extractKingVod({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  let targetId = imdbId;
  if (!targetId || !String(targetId).startsWith('tt')) {
    try {
      targetId = await fetchMediaExternalIds(tmdbId, isSeries ? 'tv' : 'movie');
    } catch {}
  }
  const idToUse = targetId || (tmdbId ? `tmdb:${tmdbId}` : null);
  if (!idToUse) return [];

  const path = isSeries
    ? `series/${idToUse}:${season}:${episode}.json`
    : `movie/${idToUse}.json`;

  const url = `https://da5f663b4690-kingvod.baby-beamup.club/stream/${path}`;
  const streams = [];

  try {
    const res = await fetchWithTimeout(url, {}, 4500);
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
// 9. Extrator MagnetFlix (https://magnetflix.flixbr.online) - Reativado
// ─────────────────────────────────────────────────────────────────────────────
export async function extractMagnetFlix({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const targetId = isSeries
    ? (tmdbId ? `tmdb:${tmdbId}` : null) || imdbId
    : (imdbId || (tmdbId ? `tmdb:${tmdbId}` : null));
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://magnetflix.flixbr.online/stream/${path}`;
  const streams = [];

  try {
    const res = await fetchWithTimeout(url, {}, 4500);
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
// 10. Extrator Pleiades Anime (https://pleiadesstream.duckdns.org/addon/pleiades)
// ─────────────────────────────────────────────────────────────────────────────
export async function extractPleiadesAnime({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  let targetId = imdbId;
  if (!targetId || !String(targetId).startsWith('tt')) {
    try {
      targetId = await fetchMediaExternalIds(tmdbId, isSeries ? 'tv' : 'movie');
    } catch {}
  }
  if (!targetId) return [];

  const path = isSeries
    ? `series/${targetId}:${season}:${episode}.json`
    : `movie/${targetId}.json`;

  const url = `https://pleiadesstream.duckdns.org/addon/pleiades/stream/${path}`;
  const streams = [];

  try {
    const res = await fetchWithTimeout(url, {}, 4500);
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

export async function extractFenixFlixClient({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  let targetId = imdbId;
  if (!targetId || !String(targetId).startsWith('tt')) {
    try {
      targetId = await fetchMediaExternalIds(tmdbId, isSeries ? 'tv' : 'movie');
    } catch {}
  }
  const idToUse = targetId || `tmdb:${tmdbId}`;

  const path = isSeries
    ? `series/${idToUse}:${season}:${episode}.json`
    : `movie/${idToUse}.json`;

  const url = `https://fenixflix.fenixhub.online/stream/${path}`;
  const streams = [];

  try {
    const res = await fetchWithTimeout(url, {}, 4500);
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
          const isLeg = metaLower.includes('legendado') || metaLower.includes('legend') || metaLower.includes('sub') || metaLower.includes('🇺🇸') || metaLower.includes('🇯🇵');
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
            priority: isDub ? 3 : 5,
            isDub,
            isFenix: true,
            subtitles: s.subtitles || [],
          });
        }
      }
    }
  } catch {}

  return streams;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDENAÇÃO E FORMATAÇÃO KAIROU COM PRIORIDADE 4K MÁXIMA
// ─────────────────────────────────────────────────────────────────────────────
export function formatKairouServers(streams) {
  if (!Array.isArray(streams) || streams.length === 0) return [];

  // Se já foi curado no backend, preserva sem alterar
  if (streams.some((s) => s && s.isCurated)) {
    return streams;
  }

  const pools = {
    '4k_dub': [],
    '4k_sub': [],
    '1080_dub': [],
    '1080_sub': [],
    '720_dub': [],
    'others': [],
  };

  const seenUrls = new Set();

  for (const s of streams) {
    if (!s) continue;
    const isApprovedIframe = Boolean(s.isIframe || s.type === 'iframe');
    if (!isApprovedIframe && (s.isEmbed || s.type === 'iframe')) continue;
    const url = isApprovedIframe ? s.url : normalizeStreamUrl(s.url || '');
    if (!url) continue;

    if (s.server === 'WarezCDN' || s.server === 'VidRU' || s.server === 'VidLink' || isApprovedIframe || s.isEmbed || s.type === 'iframe') {
      continue;
    }

    const urlClean = url.split('?')[0];
    if (seenUrls.has(urlClean)) continue;
    seenUrls.add(urlClean);

    const is4k = Boolean(s.is4k || (s.quality || '').includes('4K') || (s.name || '').includes('4k') || (s.title || '').includes('4k') || (s.providerName || '').includes('4K'));
    const is1080 = Boolean((s.quality || '').includes('1080') || (s.providerName || '').includes('1080'));
    const is720 = Boolean((s.quality || '').includes('720') || (s.providerName || '').includes('720'));
    const isDub = Boolean(s.isDub || (s.providerName || '').includes('[Dublado]'));

    if (is4k) {
      if (isDub) {
        pools['4k_dub'].push({ ...s, url });
        pools['4k_sub'].push({
          ...s,
          id: `${s.id || 'k4'}-orig`,
          url,
          isDub: false,
          lang: 'en',
          isDual: true,
        });
      } else {
        pools['4k_sub'].push({ ...s, url });
      }
    } else if (is1080) {
      if (isDub) {
        pools['1080_dub'].push({ ...s, url });
        if (s.isDual) {
          pools['1080_sub'].push({
            ...s,
            id: `${s.id || 'k1080'}-orig`,
            url,
            isDub: false,
            lang: 'en',
          });
        }
      } else {
        pools['1080_sub'].push({ ...s, url });
      }
    } else if (is720) {
      if (isDub) pools['720_dub'].push({ ...s, url });
      else pools['1080_sub'].push({ ...s, url });
    } else {
      pools['others'].push({ ...s, url });
    }
  }

  const sortPool = (list) => {
    return list.sort((a, b) => {
      const aAlive = a.alive !== false ? 1 : 0;
      const bAlive = b.alive !== false ? 1 : 0;
      if (aAlive !== bAlive) return bAlive - aAlive;

      const getCdnScore = (u) => {
        if (!u) return 10;
        if (u.includes('wasabisys.com')) return 1;
        if (u.includes('cnvods.com')) return 2;
        if (u.includes('bestcine.dpdns.org')) return 3;
        if (u.includes('froststream.cloutteam.com')) return 4;
        if (u.includes('shardweb.app')) return 5;
        if (u.includes('baby-beamup.club')) return 6;
        if (u.includes('qzz.io')) return 7;
        return 8;
      };
      return getCdnScore(a.url) - getCdnScore(b.url);
    });
  };

  const curated = [];

  const pickTop = (pool, maxCount, namePrefix, qualityLabel, isDub) => {
    sortPool(pool);
    const pickedUrls = new Set();
    const chosen = [];
    for (const item of pool) {
      const u = item.url.split('?')[0];
      if (!pickedUrls.has(u)) {
        pickedUrls.add(u);
        chosen.push(item);
        if (chosen.length >= maxCount) break;
      }
    }

    chosen.forEach((s, idx) => {
      let finalName = '';
      if (chosen.length === 1) {
        finalName = `${namePrefix} · Mais Estável`;
      } else {
        finalName = idx === 0 ? `${namePrefix} · Mais Estável (Opção 1)` : `${namePrefix} (Opção ${idx + 1})`;
      }

      curated.push({
        ...s,
        server: s.server || 'Kairou',
        providerName: finalName,
        quality: qualityLabel,
        is4k: qualityLabel.includes('4K'),
        isDub,
        lang: isDub ? 'pt' : 'en',
        subtitles: s.subtitles || [],
        isCurated: true,
      });
    });
  };

  // 1. 💎 4K Ultra HD Dublado (até 2 opções)
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

  // 6. Others se nenhum dublado foi encontrado
  if (curated.filter((s) => s.isDub).length === 0 && pools['others'].length > 0) {
    pickTop(pools['others'], 1, '⚡ Kairou Direto [Dublado]', '1080p Full HD', true);
  }



  return curated;
}

export function clearStreamCache(key) {
  if (key) {
    streamCache.delete(key);
  } else {
    streamCache.clear();
  }
}

export function getStreamCacheSize() {
  return streamCache.size;
}

export function findPreferredDefaultServerIndex(serversList) {
  if (!serversList || !Array.isArray(serversList) || serversList.length === 0) return 0;
  const isServer4k = (s) => Boolean(s.is4k || (s.quality || '').includes('4K') || (s.providerName || '').includes('4K'));

  // 1. Procurar Dublado em 1080p Full HD que esteja vivo
  const dub1080Alive = serversList.findIndex((s) => s.isDub && !isServer4k(s) && s.alive !== false && ((s.quality || '').includes('1080') || (s.providerName || '').includes('1080')));
  if (dub1080Alive >= 0) return dub1080Alive;

  // 2. Procurar Dublado em 720p HD vivo
  const dub720Alive = serversList.findIndex((s) => s.isDub && !isServer4k(s) && s.alive !== false && ((s.quality || '').includes('720') || (s.providerName || '').includes('720')));
  if (dub720Alive >= 0) return dub720Alive;

  // 3. Qualquer Dublado abaixo de 4K vivo
  const dubAnyNon4kAlive = serversList.findIndex((s) => s.isDub && !isServer4k(s) && s.alive !== false);
  if (dubAnyNon4kAlive >= 0) return dubAnyNon4kAlive;

  // 4. Qualquer Dublado abaixo de 4K
  const dubAnyNon4k = serversList.findIndex((s) => s.isDub && !isServer4k(s));
  if (dubAnyNon4k >= 0) return dubAnyNon4k;

  // 5. Legendado vivo 1080p
  const sub1080Alive = serversList.findIndex((s) => !isServer4k(s) && s.alive !== false && ((s.quality || '').includes('1080') || (s.providerName || '').includes('1080')));
  if (sub1080Alive >= 0) return sub1080Alive;

  // 6. Legendado vivo 720p
  const sub720Alive = serversList.findIndex((s) => !isServer4k(s) && s.alive !== false && ((s.quality || '').includes('720') || (s.providerName || '').includes('720')));
  if (sub720Alive >= 0) return sub720Alive;

  // 7. Qualquer Legendado não-4k
  const subAnyNon4k = serversList.findIndex((s) => !isServer4k(s));
  if (subAnyNon4k >= 0) return subAnyNon4k;

  // 8. Se literalmente só existir 4K disponível, seleciona o primeiro
  return 0;
}

// Teste veloz de conectividade e velocidade no navegador do cliente (corrida paralela < 900ms)
export async function testCandidateServersSpeed(serversList, maxToTest = 4) {
  if (!Array.isArray(serversList) || serversList.length <= 1) return serversList;

  const isServer4k = (s) => Boolean(s.is4k || (s.quality || '').includes('4K') || (s.providerName || '').includes('4K'));
  const hasDub = serversList.some((s) => s.isDub && !isServer4k(s));

  const candidateIndices = [];
  serversList.forEach((s, idx) => {
    if (!isServer4k(s) && (hasDub ? s.isDub : true)) {
      candidateIndices.push(idx);
    }
  });

  const topIndices = candidateIndices.slice(0, maxToTest);
  if (topIndices.length <= 1) return serversList;

  const probeTasks = topIndices.map(async (idx) => {
    const s = serversList[idx];
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 900);
      const isHls = s.isHls || (s.url || '').includes('.m3u8');
      const headers = isHls ? {} : { Range: 'bytes=0-256' };
      const probeUrl = s.url.startsWith('http://') ? `/api/proxy?url=${encodeURIComponent(s.url)}` : s.url;

      const res = await fetch(probeUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      const dt = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
      if (res.ok || res.status === 206) {
        try {
          if (res.body) {
            const reader = res.body.getReader();
            await reader.cancel();
          }
        } catch {}
        return { idx, alive: true, latency: dt };
      }
      return { idx, alive: false, latency: 9999 };
    } catch {
      return { idx, alive: false, latency: 9999 };
    }
  });

  const results = await Promise.allSettled(probeTasks);
  results.forEach((r) => {
    if (r.status === 'fulfilled' && r.value) {
      const { idx, alive, latency } = r.value;
      if (serversList[idx]) {
        serversList[idx].alive = alive;
        if (alive && latency < 9000) {
          serversList[idx].latency = latency;
        }
      }
    }
  });

  return serversList;
}

export function addEmbedPlayerServer(streams) {
  return streams;
}

const activePrefetches = new Set();
export function prefetchMediaStreams({ tmdbId, imdbId, type = 'movie', season = 1, episode = 1, title = '' }) {
  if (!tmdbId) return;
  const isSeries = type === 'series' || type === 'tv';
  const normalizedType = isSeries ? 'series' : 'movie';
  const cacheKey = `${tmdbId}-${normalizedType}-${season}-${episode}`;
  if (streamCache.has(cacheKey) || activePrefetches.has(cacheKey)) return;

  activePrefetches.add(cacheKey);
  const trigger = typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback
    : (cb) => setTimeout(cb, 60);

  trigger(() => {
    extractAllServers({
      tmdbId,
      imdbId,
      type: normalizedType,
      season,
      episode,
      title,
    })
      .catch(() => {})
      .finally(() => {
        activePrefetches.delete(cacheKey);
      });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRATOR PRINCIPAL CONSOLIDADO
// ─────────────────────────────────────────────────────────────────────────────
export async function extractAllServers({
  tmdbId,
  imdbId,
  title,
  type = 'movie',
  season = 1,
  episode = 1,
  onProgress,
  onStreamsAvailable,
}) {
  if (!tmdbId) {
    return [];
  }

  const isSeries = type === 'series' || type === 'tv' || type === 'anime';
  const normalizedType = isSeries ? 'series' : 'movie';
  const cacheKey = `${tmdbId}-${normalizedType}-${season}-${episode}`;

  // Cache instantâneo
  if (streamCache.has(cacheKey)) {
    const cached = streamCache.get(cacheKey);
    if (Array.isArray(cached) && cached.length > 0) {
      onProgress?.(`${cached.length} servidores carregados do cache instantâneo!`);
      onStreamsAvailable?.(cached);
      return cached;
    }
  }

  const query = new URLSearchParams({
    type: normalizedType,
    season: String(season || 1),
    episode: String(episode || 1),
  });
  if (tmdbId && !isNaN(Number(tmdbId))) {
    query.set('tmdbId', String(tmdbId));
  }
  if (imdbId) {
    query.set('imdbId', String(imdbId));
  }
  if (title) {
    query.set('title', String(title));
  }

  onProgress?.('Conectando aos servidores de alta velocidade...');

  const isNativeApp =
    typeof window !== 'undefined' &&
    (Boolean(window.Capacitor) ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:');

  const collectedStreams = [];
  const seenUrls = new Set();
  let hasSentInitialPlayback = false;

  const pushStreams = (newStreams) => {
    if (!Array.isArray(newStreams) || newStreams.length === 0) return;
    let addedCount = 0;
    for (const s of newStreams) {
      if (!s || !s.url) continue;
      const isApprovedIframe = Boolean(s.isIframe || s.type === 'iframe');
      if (!isApprovedIframe && (s.isEmbed || s.type === 'iframe')) continue;
      if (!seenUrls.has(s.url)) {
        seenUrls.add(s.url);
        collectedStreams.push(s);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      const formatted = formatKairouServers([...collectedStreams]);
      if (!hasSentInitialPlayback && formatted.length > 0) {
        hasSentInitialPlayback = true;
        onProgress?.(`${formatted.length} servidores prontos para reprodução!`);
        onStreamsAvailable?.(formatted);
      }
    }
  };

  // EXECUÇÃO CONCORRENTE: API da VPS + Provedores Diretos do Cliente
  const tasks = [];

  // 1. Requisição à API do Backend Node.js da VPS
  if (!isNativeApp) {
    tasks.push(
      fetchWithTimeout(`/api/extract?${query.toString()}`, {}, 6500)
        .then(async (apiRes) => {
          if (apiRes && apiRes.ok) {
            const data = await apiRes.json();
            if (data && data.ok && Array.isArray(data.streams) && data.streams.length > 0) {
              pushStreams(data.streams);
            }
          }
        })
        .catch(() => {})
    );
  }

  // 2. BestCine direto no navegador do cliente (IP residencial desbloqueia 4K da Cloudflare)
  tasks.push(
    extractBestCine({ tmdbId, imdbId, type: normalizedType, season, episode })
      .then(pushStreams)
      .catch(() => {}),
    extractVeyra({ tmdbId, imdbId, type: normalizedType, season, episode })
      .then(pushStreams)
      .catch(() => {}),
    extractKingVod({ tmdbId, imdbId, type: normalizedType, season, episode })
      .then(pushStreams)
      .catch(() => {}),
    extractMagnetFlix({ tmdbId, imdbId, type: normalizedType, season, episode })
      .then(pushStreams)
      .catch(() => {}),
    extractPleiadesAnime({ tmdbId, imdbId, type: normalizedType, season, episode })
      .then(pushStreams)
      .catch(() => {})
  );

  // 3. Se for app nativo Capacitor, roda todas as fontes locais
  if (isNativeApp) {
    tasks.push(
      extractFrostStream({ tmdbId, imdbId, type: normalizedType, season, episode }).then(pushStreams).catch(() => {}),
      extractVeTela({ tmdbId, imdbId, type: normalizedType, season, episode }).then(pushStreams).catch(() => {}),
      extractMagnetFlix({ tmdbId, imdbId, type: normalizedType, season, episode }).then(pushStreams).catch(() => {}),
      extractBsCine({ tmdbId, imdbId, type: normalizedType, season, episode }).then(pushStreams).catch(() => {}),
      extractFenixFlixClient({ tmdbId, imdbId, type: normalizedType, season, episode }).then(pushStreams).catch(() => {})
    );
  }

  await Promise.allSettled(tasks);

  const finalStreams = formatKairouServers([...collectedStreams]);

  if (finalStreams.length > 0) {
    streamCache.set(cacheKey, finalStreams);
    onProgress?.(`${finalStreams.length} servidores Kairou prontos!`);
    onStreamsAvailable?.(finalStreams);
    return finalStreams;
  }

  return [];
}
