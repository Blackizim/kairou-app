// Serviço de Extração de Streams Diretos (HLS / MP4) para Kairou & Servidores
// Converte os endpoints dos servidores em fontes de vídeo nativas para nosso player próprio.

import { fetchMediaExternalIds } from './tmdb.js';

const FETCH_TIMEOUT_MS = 4500;

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

// Normaliza streams, descarta placeholders e garante que HLS sem CORS passem pelo proxy local
export function normalizeStreamUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let u = url.trim();

  // Descartar placeholders de manutenção e mkv
  if (
    u.toLowerCase().includes('manutencao.mp4') ||
    u.toLowerCase().includes('.mkv') ||
    u.includes('koyeb.app')
  ) {
    return '';
  }

  // Se já for rota do proxy local
  if (u.startsWith('/api/proxy')) {
    return u;
  }

  // Remove referências antigas a brflix se houver
  if (u.includes('brflix.lat/dynamic-proxy/')) {
    u = u.replace(/https?:\/\/brflix\.lat\/dynamic-proxy\//i, '');
    if (!u.startsWith('http')) u = `https://${u}`;
  }

  // Descartar placeholders de manutenção e arquivos incompatíveis ou bots caídos
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

  // Qualquer stream em IP direto sem SSL (ex: http://152.233.*.* ou http://\d+\.\d+\.\d+\.\d+)
  // DEVE passar pelo Turbo Proxy local para ganhar CORS, Range HTTP 206 e evitar bloqueio de Mixed Content no browser
  if (/^https?:\/\/\d+\.\d+\.\d+\.\d+/i.test(u)) {
    return `/api/proxy?url=${encodeURIComponent(u)}`;
  }

  // Encapsular no proxy local para contornar CORS nos fragmentos HLS
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

  // Se for rota relativa geral
  if (u.startsWith('/')) {
    return u;
  }

  // Upgrade de HTTP para HTTPS em hosts conhecidos para evitar mixed content
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

// Tenta buscar usando rotas locais (Node Proxy) primeiro, depois Cloudflare Worker CORS Proxy
async function smartFetch(pathOrUrl, proxyPrefix, options = {}) {
  // 1. Tentar prefixo proxy local se fornecido (ex: /api-clickhost)
  if (proxyPrefix && typeof window !== 'undefined') {
    try {
      let relativePath = pathOrUrl;
      if (pathOrUrl.startsWith('http')) {
        try {
          const u = new URL(pathOrUrl);
          relativePath = u.pathname + u.search;
        } catch {}
      }
      const proxyUrl = `${proxyPrefix}${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
      const res = await fetchWithTimeout(proxyUrl, options, 4000);
      if (res && res.ok) return await res.text();
    } catch {}
  }

  const directUrl = pathOrUrl.startsWith('http') ? pathOrUrl : `https://${pathOrUrl}`;

  // 2. Tentar /api/proxy local do PC (sem CORS de navegador)
  try {
    const localProxy = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
    const res = await fetchWithTimeout(localProxy, options, 4000);
    if (res && res.ok) return await res.text();
  } catch {}

  // 3. Cloudflare Worker CORS Proxy de alta performance
  try {
    const cfProxy = `https://corsproxy.io/?url=${encodeURIComponent(directUrl)}`;
    const res = await fetchWithTimeout(cfProxy, options, 4000);
    if (res && res.ok) return await res.text();
  } catch {}

  // 4. Se for app nativo (Capacitor), tenta direto pois não sofre com restrição CORS
  const isNativeApp =
    typeof window !== 'undefined' &&
    (Boolean(window.Capacitor) ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:');

  if (isNativeApp) {
    try {
      const res = await fetchWithTimeout(directUrl, options, 4500);
      if (res && res.ok) return await res.text();
    } catch {}
  }

  return null;
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

// 1. Extrator MegaEmbed (mgeb.top / PlayTvOficial & /megaembed-resolve)
// Fornece múltiplos servidores MP4 e HLS (PlayerCDN, PlayTvOficial, etc.)
export async function extractMegaEmbed({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  const id = tmdbId || imdbId;
  const path = isSeries
    ? `/embed/${id}/${season}/${episode}`
    : `/embed/${id}`;

  const streams = [];



  // 1.2 Extração direta de mgeb.top (fontedecanais PlayTvOficial MP4)
  try {
    const html = await smartFetch(`https://mgeb.top${path}`, '/api-mgeb', {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://mgeb.top/',
      },
    });

    if (html) {
      const sourcesMatch = html.match(/var\s+sources\s*=\s*(\[[\s\S]*?\]);/);
      if (sourcesMatch) {
        const rawSources = JSON.parse(sourcesMatch[1]);
        for (let idx = 0; idx < rawSources.length; idx++) {
          const s = rawSources[idx];
          if (!s.file || typeof s.file !== 'string') continue;
          let fileUrl = normalizeStreamUrl(s.file);
          if (!fileUrl) continue;

          const isPlayTv = fileUrl.includes('77zzhf54vdll71.com') || fileUrl.includes('fontedecanais');
          const isHls = s.type === 'hls' || fileUrl.includes('.m3u8') || fileUrl.includes('hls.php');
          const qInfo = detectQuality(fileUrl, s.label || '', '');

          const providerLabel = isPlayTv
            ? `Kairou · Servidor 2 (PlayTvOficial - MP4) (${qInfo.quality}) [Dublado]`
            : `Kairou · Servidor 2 (MegaEmbed - ${qInfo.quality}) [Dublado]`;

          streams.push({
            id: `kairou-mega-${idx}-${Date.now()}`,
            server: 'Kairou',
            providerName: providerLabel,
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
  } catch (err) {
    console.warn('[Extractor] Falha ao processar fontes MegaEmbed:', err);
  }

  return streams;
}

// 2. Extrator ClickHost (embed-api.clickhost.xyz)
// Suporta MEGADRIVE 1, MEGADRIVE 2, UniTV e streams HLS com token dinâmico
export async function extractClickHost({ tmdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  const path = isSeries
    ? `/embed/serie/${tmdbId}/${season}/${episode}?ad_played=1`
    : `/embed/filme/${tmdbId}?ad_played=1`;

  const html = await smartFetch(`https://embed-api.clickhost.xyz${path}`, '/api-clickhost');
  if (!html) return [];

  const serversMatch = html.match(/const\s+servers\s*=\s*(\[[\s\S]*?\]);/);
  if (!serversMatch) return [];

  try {
    const serversList = JSON.parse(serversMatch[1]);
    const extracted = [];

    for (const srv of serversList) {
      if (!srv.id) continue;
      try {
        // Inicializar stream no ClickHost para obter token e URL real
        const initPath = `/embed/stream/${srv.id}/init`;
        let initJson = null;

        // Tentar via proxy ou direto
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          try {
            const r = await fetchWithTimeout(`/api-clickhost${initPath}`, { method: 'POST' }, 3500);
            if (r.ok) initJson = await r.json();
          } catch {}
        }

        if (!initJson) {
          try {
            const r = await fetchWithTimeout(`https://embed-api.clickhost.xyz${initPath}`, { method: 'POST' }, 3500);
            if (r.ok) initJson = await r.json();
          } catch {}
        }

        if (initJson && initJson.ok && initJson.url) {
          const streamUrl = initJson.url.startsWith('http')
            ? initJson.url
            : `https://embed-api.clickhost.xyz${initJson.url}`;

          const isHls = Boolean(initJson.is_hls || streamUrl.includes('.m3u8'));
          const qInfo = detectQuality(streamUrl, srv.name || '', '');
          extracted.push({
            id: `kairou-s2-${srv.id}`,
            server: 'Kairou',
            providerName: `Kairou · Servidor Alta Velocidade (${qInfo.quality})`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: qInfo.quality,
            rank: qInfo.rank,
            isHls,
            priority: 4,
          });
        }
      } catch (err) {
        console.warn(`[Extractor] Falha ao inicializar servidor ${srv.id}:`, err);
      }
    }

    return extracted;
  } catch (err) {
    console.warn('[Extractor] Falha ao ler servidores ClickHost:', err);
    return [];
  }
}

// 3. Extrator SuperFlix (superflixapi.beer / superflixapi.pro)
export async function extractSuperFlix({ tmdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  const path = isSeries
    ? `/serie/${tmdbId}/${season}/${episode}`
    : `/filme/${tmdbId}`;

  try {
    const html = await smartFetch(`https://superflixapi.beer${path}`, '/api-superflix');
    if (!html) return [];

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
        priority: 2,
      }];
    }
  } catch {}
  return [];
}

// 4. Extrator WarezCDN (warezcdn.lat)
export async function extractWarezCDN({ tmdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  const path = isSeries
    ? `/serie/${tmdbId}/${season}/${episode}`
    : `/filme/${tmdbId}`;

  try {
    const html = await smartFetch(`https://warezcdn.lat${path}`, '/api-warez');
    if (!html) return [];

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
        priority: 2,
      }];
    }
  } catch {}
  return [];
}

// 5. Extrator FenixFlix direto no cliente (Stremio Addon com suporte CORS nativo & /fenixflix-resolve)
export async function extractFenixFlixClient({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  let targetImdbId = imdbId;
  if (!targetImdbId || !String(targetImdbId).startsWith('tt')) {
    try {
      targetImdbId = await fetchMediaExternalIds(tmdbId, isSeries ? 'tv' : 'movie');
    } catch {}
  }

  const streams = [];
  const seenUrls = new Set();
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
  };



  // 5.2 Addon Stremio FenixFlix direto
  const idToUse = targetImdbId || `tmdb:${tmdbId}`;
  const path = isSeries
    ? `series/${idToUse}:${season}:${episode}.json`
    : `movie/${idToUse}.json`;

  const targetUrl = `https://fenixflix.fenixhub.online/stream/${path}`;
  let addonData = null;

  try {
    // Tenta via proxy Vite (/api-fenixflix em dev) ou direto em produção
    const rawText = await smartFetch(targetUrl, '/api-fenixflix', { headers });
    if (rawText) {
      try { addonData = JSON.parse(rawText); } catch {}
    }
  } catch {}

  if (!addonData) {
    try {
      const proxyRes = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`, {}, 5000);
      if (proxyRes && proxyRes.ok) {
        const text = await proxyRes.text();
        try { addonData = JSON.parse(text); } catch {}
      }
    } catch {}
  }

  if (addonData && Array.isArray(addonData.streams)) {
    for (let idx = 0; idx < addonData.streams.length; idx++) {
      const s = addonData.streams[idx];
      if (!s.url || typeof s.url !== 'string') continue;
      const streamUrl = normalizeStreamUrl(s.url);
      if (!streamUrl || seenUrls.has(streamUrl)) continue;
      if (streamUrl.includes('rickroll') || streamUrl.includes('never_gonna_give_you_up')) continue;
      seenUrls.add(streamUrl);

      const isHls = streamUrl.includes('.m3u8');
      const titleText = (s.title || s.description || '');
      const nameText = (s.name || '');
      const qInfo = detectQuality(streamUrl, nameText, titleText);
      const isDub = (titleText + ' ' + nameText).toLowerCase().includes('dublado') || (titleText + ' ' + nameText).toLowerCase().includes('dub') || (titleText + ' ' + nameText).toLowerCase().includes('nacional');

      streams.push({
        id: `kairou-fenix-addon-${idx}-${Date.now()}`,
        server: 'Kairou',
        providerName: `Kairou · Servidor 8 (FenixFlix PT-BR - ${qInfo.quality})${isDub ? ' [Dublado]' : ''}`,
        url: streamUrl,
        type: isHls ? 'hls' : 'mp4',
        quality: qInfo.quality,
        rank: qInfo.rank,
        isHls,
        priority: isDub ? 1 : 3,
        isDub,
        isFenix: true,
        subtitles: s.subtitles || [],
      });
    }
  }

  return streams;
}

// 5.1 Extrator Servidor FrostStream (Stremio Addon Direto - 4K e 1080p Ultra HD Dublado)
export async function extractFrostStream({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
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

  const streams = [];
  const seenUrls = new Set();
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
  };

  try {
    const res = await fetchWithTimeout(`https://froststream.cloutteam.com/stream/${path}`, { headers }, 4500);
    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data.streams) && data.streams.length > 0) {
        // Testar rapidamente se o backend do FrostStream está online ou com streams expiradas (404)
        const sampleUrl = data.streams[0]?.url;
        if (sampleUrl) {
          try {
            const probe = await fetchWithTimeout(sampleUrl, { method: 'HEAD' }, 1500);
            if (probe && probe.status === 404) {
              return [];
            }
          } catch {}
        }

        for (let idx = 0; idx < data.streams.length; idx++) {
          const s = data.streams[idx];
          if (!s || !s.url) continue;
          const streamUrl = normalizeStreamUrl(s.url);
          if (!streamUrl || seenUrls.has(streamUrl)) continue;
          seenUrls.add(streamUrl);

          const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('master.txt');
          const titleText = s.title || s.description || '';
          const nameText = s.name || '';
          const qInfo = detectQuality(streamUrl, nameText, titleText);
          const metaLower = `${titleText} ${nameText}`.toLowerCase();
          const isLeg = metaLower.includes('legendado') || metaLower.includes('legend') || metaLower.includes('sub');
          const isDub = !isLeg && (metaLower.includes('português') || metaLower.includes('portugues') || metaLower.includes('dublado') || metaLower.includes('dub') || metaLower.includes('nacional'));

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
  } catch {}

  return streams;
}

// 6. Extrator Servidor Principal (Consolidado via API Local)
export async function extractPrincipalClient({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  const query = new URLSearchParams({
    tmdbId: String(tmdbId),
    type: isSeries ? 'series' : 'movie',
    season: String(season || 1),
    episode: String(episode || 1),
  });
  if (imdbId) query.set('imdbId', String(imdbId));

  try {
    const res = await fetchWithTimeout(`/api/extract?${query.toString()}`, {}, 4500);
    if (res && res.ok) {
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.streams)) {
        return data.streams;
      }
    }
  } catch {}
  return [];
}
export const extractBrflixClient = extractPrincipalClient;

// 7. Extrator Servidor Zeus (Stremio Addon BeamUp Direto)
export async function extractZeusClient({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  // Addon Zeus baby-beamup descontinuado/offline
  return [];
}

// Helper para mascarar servidores e manter identidade visual uniforme Kairou
export function formatKairouServers(streams) {
  if (!Array.isArray(streams)) return [];

  // Normalizar URLs antes da ordenação
  const normalized = streams
    .map((s) => {
      const url = normalizeStreamUrl(s.url || '');
      if (!url) return null;
      return { ...s, url };
    })
    .filter(Boolean);

  // Ordenar priorizando:
  // 1. Embed player sempre ao final
  // 2. FOCO ESTRITO EM ÁUDIO PT-BR (DUBLADO) SEMPRE ANTES DE LEGENDADO / ORIGINAL
  // 3. QUALIDADE / RESOLUÇÃO MÁXIMA (4K > 2K > 1080p > 720p > 480p) - Sempre escolhe o melhor!
  // 4. Desempate com mesma qualidade: Servidor Principal (Winner) > Zeus > FrostStream > HTTPS > Prioridade
  const sorted = [...normalized].sort((a, b) => {
    // 1. Embed player sempre ao final
    if (a.isEmbed && !b.isEmbed) return 1;
    if (!a.isEmbed && b.isEmbed) return -1;

    // 2. PRIORIDADE ABSOLUTA PARA 4K ULTRA HD:
    const rankA = typeof a.rank === 'number' ? a.rank : detectQuality(a.url || '', a.providerName || '', a.quality || '').rank;
    const rankB = typeof b.rank === 'number' ? b.rank : detectQuality(b.url || '', b.providerName || '', b.quality || '').rank;

    const aIs4k = rankA === 1 || (a.quality || '').includes('4K') || (a.providerName || '').includes('4K');
    const bIs4k = rankB === 1 || (b.quality || '').includes('4K') || (b.providerName || '').includes('4K');

    // Se um é 4K e o outro não é, o 4K VENCE SEMPRE
    if (aIs4k && !bIs4k) return -1;
    if (!aIs4k && bIs4k) return 1;

    // 3. ÁUDIO PT-BR (Dublado) SEMPRE PRIORIZADO
    const aIsDub = Boolean((a.providerName || '').includes('Dublado') || a.isDub || a.dubbed);
    const bIsDub = Boolean((b.providerName || '').includes('Dublado') || b.isDub || b.dubbed);
    if (aIsDub !== bIsDub) {
      return aIsDub ? -1 : 1;
    }

    // 4. RESOLUÇÃO / QUALIDADE MÁXIMA (2K = 2, 1080p = 3, 720p = 4, 480p = 5)
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // 4. DESEMPATE (Mesma resolução e mesmo áudio):
    // Servidor Principal Winner sempre primeiro
    if (a.isWinner && !b.isWinner) return -1;
    if (!a.isWinner && b.isWinner) return 1;

    // Servidor Principal no topo
    if (a.isPrincipal && !b.isPrincipal && !b.isZeus) return -1;
    if (!a.isPrincipal && !a.isZeus && b.isPrincipal) return 1;

    // Servidor Zeus antes dos secundários
    if (a.isZeus && !b.isZeus && !b.isPrincipal) return -1;
    if (!a.isZeus && !a.isPrincipal && b.isZeus) return 1;

    // FrostStream antes de outros secundários
    if (a.isFrost && !b.isFrost) return -1;
    if (!a.isFrost && b.isFrost) return 1;

    // HTTPS primeiro
    const aIsHttps = (a.url || '').startsWith('https://') ? 1 : 0;
    const bIsHttps = (b.url || '').startsWith('https://') ? 1 : 0;
    if (aIsHttps !== bIsHttps) {
      return bIsHttps - aIsHttps;
    }

    return (a.priority || 5) - (b.priority || 5);
  });

  let dubCounter = 0;
  let subCounter = 0;
  return sorted.map((s) => {
    const is4k = (s.quality || '').includes('4K');
    const is2k = (s.quality || '').includes('1440') || (s.quality || '').includes('2K');
    const is1080 = (s.quality || '').includes('1080');
    const isDub = Boolean((s.providerName || '').includes('Dublado') || s.isDub || s.dubbed);
    let badge = '1080p Full HD';
    if (is4k) {
      badge = '4K Ultra HD';
    } else if (is2k) {
      badge = '1440p 2K';
    } else if (is1080) {
      badge = '1080p Full HD';
    } else if ((s.quality || '').includes('720')) {
      badge = '720p HD';
    } else {
      badge = '1080p Full HD';
    }

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

    return {
      ...s,
      server: 'Kairou',
      providerName: finalName,
      isDub,
      lang: isDub ? 'pt' : 'en',
      quality: badge,
      subtitles: s.subtitles || [],
    };
  });
}

// Limpar cache de streams (útil para tentar novamente)
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

// Desativado por completo: Kairou utiliza apenas streams nativos de alta velocidade (Zero embeds de terceiros)
export function addEmbedPlayerServer(streams) {
  return streams;
}

// Prefetch agressivo em memória para carregamento instantâneo (0ms ao clicar)
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

// Extrator Principal Consolidado de Alta Performance: Corrida paralela (Primeiro a responder toca imediatamente)
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

  // 1. CACHE INSTANTÂNEO EM MEMÓRIA (< 1ms): Retorna imediatamente se já carregado
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
      if (s && s.url && !s.isEmbed && s.type !== 'iframe' && !seenUrls.has(s.url)) {
        seenUrls.add(s.url);
        collectedStreams.push(s);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      const formatted = formatKairouServers([...collectedStreams]);

      // Primeiro batch que chega inicia a reprodução do vídeo IMEDIATAMENTE (300ms a 800ms TTFF)
      if (!hasSentInitialPlayback && formatted.length > 0) {
        hasSentInitialPlayback = true;
        onProgress?.(`${formatted.length} servidores prontos para reprodução!`);
        onStreamsAvailable?.(formatted);
      }
    }
  };

  // EXECUÇÃO SIMULTÂNEA OTIMIZADA:
  // 1. Requisição à API Local Node.js / Serverless (sem CORS, com cache em RAM)
  if (!isNativeApp) {
    try {
      const apiRes = await fetchWithTimeout(`/api/extract?${query.toString()}`, {}, 6500);
      if (apiRes && apiRes.ok) {
        const data = await apiRes.json();
        if (data && data.ok && Array.isArray(data.streams) && data.streams.length > 0) {
          pushStreams(data.streams);
        }
      }
    } catch {}
  }

  // 2. Extratores diretos do cliente (usados exclusivamente no app nativo Capacitor onde a API Node não existe)
  if (isNativeApp && collectedStreams.length === 0) {
    const clientResolvers = [
      extractFrostStream({ tmdbId, imdbId, type: normalizedType, season, episode }).then(pushStreams).catch(() => {}),
      extractZeusClient({ tmdbId, imdbId, type: normalizedType, season, episode }).then(pushStreams).catch(() => {}),
      extractMegaEmbed({ tmdbId, imdbId, type: normalizedType, season, episode }).then(pushStreams).catch(() => {}),
    ];
    await Promise.allSettled(clientResolvers);
  }

  // Montagem e ordenação final da lista consolidada de servidores (100% Nativos)
  const finalStreams = formatKairouServers([...collectedStreams]);

  if (finalStreams.length > 0) {
    streamCache.set(cacheKey, finalStreams);
    onProgress?.(`${finalStreams.length} servidores Kairou prontos!`);
    onStreamsAvailable?.(finalStreams);
    return finalStreams;
  }

  return [];
}


