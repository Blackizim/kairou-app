// Serviço de Extração de Streams Diretos (HLS / MP4) para Kairou & Servidores
// Converte os endpoints dos servidores em fontes de vídeo nativas para nosso player próprio.

import { fetchMediaExternalIds } from './tmdb.js';

const FETCH_TIMEOUT_MS = 3500;

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

// Tenta buscar usando rotas locais (Vite Proxy) primeiro, depois direta, depois proxy CORS público
async function smartFetch(pathOrUrl, proxyPrefix, options = {}) {
  // 1. Tentar Vite dev proxy se disponível
  if (proxyPrefix && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    try {
      const proxyUrl = `${proxyPrefix}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
      const res = await fetchWithTimeout(proxyUrl, options, 4000);
      if (res && res.ok) return await res.text();
    } catch {
      // continua para tentativa direta
    }
  }

  // 2. Tentar URL direta
  const directUrl = pathOrUrl.startsWith('http') ? pathOrUrl : `https://${pathOrUrl}`;
  try {
    const res = await fetchWithTimeout(directUrl, options, 4500);
    if (res && res.ok) return await res.text();
  } catch {
    // continua para proxy CORS
  }

  // 3. Fallback: Proxy CORS público confiável (allorigins)
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
    const res = await fetchWithTimeout(proxyUrl, options, 4500);
    if (res && res.ok) return await res.text();
  } catch {
    // Falhou rapidamente sem travar a interface
  }

  return null;
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

// 1. Extrator MegaEmbed (mgeb.top)
// Fornece múltiplos servidores MP4 e HLS (PlayerCDN, Novix, etc.)
export async function extractMegaEmbed({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  // MegaEmbed opera estritamente com TMDB ID numérico
  const id = tmdbId || imdbId;
  const path = isSeries
    ? `/embed/${id}/${season}/${episode}`
    : `/embed/${id}`;

  const html = await smartFetch(`https://mgeb.top${path}`, '/api-mgeb', {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
      'Referer': 'https://mgeb.top/',
    },
  });

  if (!html) return [];

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
  } catch (err) {
    console.warn('[Extractor] Falha ao processar fontes:', err);
    return [];
  }
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
          extracted.push({
            id: `kairou-s2-${srv.id}`,
            server: 'Kairou',
            providerName: `Kairou · Servidor Alta Velocidade`,
            url: streamUrl,
            type: isHls ? 'hls' : 'mp4',
            quality: '720p HD',
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
      return [{
        id: `kairou-s3-${Date.now()}`,
        server: 'Kairou',
        providerName: 'Kairou · Servidor Rápido',
        url,
        type: isHls ? 'hls' : 'mp4',
        quality: '1080p Full HD',
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
      return [{
        id: `kairou-s4-${Date.now()}`,
        server: 'Kairou',
        providerName: 'Kairou · Servidor Estável',
        url,
        type: isHls ? 'hls' : 'mp4',
        quality: '1080p Full HD',
        isHls,
        priority: 2,
      }];
    }
  } catch {}
  return [];
}

// 5. Extrator FenixFlix direto no cliente (Stremio Addon com suporte CORS nativo)
export async function extractFenixFlixClient({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
  const isSeries = type === 'series' || type === 'tv';
  let targetImdbId = imdbId;
  if (!targetImdbId || !String(targetImdbId).startsWith('tt')) {
    try {
      targetImdbId = await fetchMediaExternalIds(tmdbId, isSeries ? 'tv' : 'movie');
    } catch {}
  }
  if (!targetImdbId || !String(targetImdbId).startsWith('tt')) return [];

  const path = isSeries
    ? `series/${targetImdbId}:${season}:${episode}.json`
    : `movie/${targetImdbId}.json`;

  const targetUrl = `https://fenixflix.fenixhub.online/stream/${path}`;
  let data = null;

  try {
    const res = await fetchWithTimeout(targetUrl, {
      headers: { 'Accept': 'application/json, text/plain, */*' },
    }, 4500);
    if (res && res.ok) {
      data = await res.json();
    }
  } catch {}

  if (!data) {
    try {
      const proxyRes = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`, {}, 4500);
      if (proxyRes && proxyRes.ok) {
        data = await proxyRes.json();
      }
    } catch {}
  }

  if (!data || !Array.isArray(data.streams)) return [];

  return data.streams
    .filter((s) => {
      if (!s.url || typeof s.url !== 'string') return false;
      const u = s.url.toLowerCase();
      const name = (s.name || '').toLowerCase();
      const title = (s.title || s.description || '').toLowerCase();
      if (u.includes('.mkv') || name.includes('.mkv') || title.includes('.mkv')) return false;
      if (u.includes('koyeb.app')) return false;
      return true;
    })
    .map((s, idx) => {
      let streamUrl = s.url.trim();
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
}

// 6. Extrator BRFLIX Resolver direto no cliente (com suporte CORS nativo)
export async function extractBrflixClient({ tmdbId, imdbId, type, season = 1, episode = 1 }) {
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

      let data = null;
      try {
        const res = await fetchWithTimeout(`https://brflix.online/best-stream-resolve?${params.toString()}`, {}, 4000);
        if (res && res.ok) data = await res.json();
      } catch {}

      if (!data || !data.ok) {
        try {
          const res = await fetchWithTimeout(`https://brflix.lat/best-stream-resolve?${params.toString()}`, {}, 4000);
          if (res && res.ok) data = await res.json();
        } catch {}
      }

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

        const fullUrl = rawUrl.startsWith('/') ? `https://brflix.online${rawUrl}` : rawUrl;
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

// Helper para mascarar servidores e manter identidade visual uniforme Kairou
export function formatKairouServers(streams) {
  if (!Array.isArray(streams)) return [];

  // Normalizar URLs antes da ordenação (garantir upgrade HTTPS em URLs conhecidas)
  const normalized = streams.map((s) => {
    let url = s.url || '';
    if (url.startsWith('http://') && url.includes('workers.dev')) {
      url = url.replace(/^http:\/\//i, 'https://');
    }
    if (url.includes('p2vipserver.top')) {
      url = url.replace(/^http:\/\//i, 'https://').replace('p2vipserver.top:80', 'p2vipserver.top');
    }
    if (url.includes('2kbrfonte.space')) {
      url = url.replace(/^http:\/\//i, 'https://').replace('2kbrfonte.space:80', '2kbrfonte.space');
    }
    return { ...s, url };
  });

  // Ordenar priorizando HTTPS (evita bloqueio de Mixed Content no navegador) e máxima qualidade (4K > 2K > 1080p > 720p)
  const sorted = [...normalized].sort((a, b) => {
    const aIsHttps = (a.url || '').startsWith('https://') ? 1 : 0;
    const bIsHttps = (b.url || '').startsWith('https://') ? 1 : 0;
    if (aIsHttps !== bIsHttps) {
      return bIsHttps - aIsHttps; // HTTPS primeiro
    }
    const rankA = a.rank ?? (a.quality?.includes('4K') ? 1 : a.quality?.includes('1440') ? 2 : a.quality?.includes('1080') ? 3 : 4);
    const rankB = b.rank ?? (b.quality?.includes('4K') ? 1 : b.quality?.includes('1440') ? 2 : b.quality?.includes('1080') ? 3 : 4);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return (a.priority || 5) - (b.priority || 5);
  });

  return sorted.map((s, idx) => {
    const normalCount = idx + 1;
    const is4k = (s.quality || '').includes('4K');
    const is2k = (s.quality || '').includes('1440') || (s.quality || '').includes('2K');
    const is1080 = (s.quality || '').includes('1080');
    const isDub = (s.providerName || '').includes('Dublado');
    let badge = 'HD';
    if (is4k) {
      badge = '4K Ultra HD';
    } else if (is2k) {
      badge = '1440p 2K';
    } else if (is1080) {
      badge = normalCount === 1 ? 'Ultra HD 1080p' : 'Full HD 1080p';
    } else {
      badge = normalCount <= 2 ? 'Alta Velocidade HD' : 'Estável';
    }

    return {
      ...s,
      server: 'Kairou',
      providerName: `Kairou · Servidor ${normalCount} (${badge})${isDub ? ' [Dublado]' : ''}`,
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

// Extrator Principal Consolidado: Tenta serverless e rota direta resiliente do navegador
export async function extractAllServers({ tmdbId, imdbId, title, type = 'movie', season = 1, episode = 1, onProgress }) {
  if (!tmdbId) {
    return [];
  }

  const isSeries = type === 'series' || type === 'tv';
  const normalizedType = isSeries ? 'series' : 'movie';
  const cacheKey = `${tmdbId}-${normalizedType}-${season}-${episode}`;
  if (streamCache.has(cacheKey)) {
    const cached = streamCache.get(cacheKey);
    if (Array.isArray(cached) && cached.length > 0) {
      onProgress?.(`${cached.length} servidores carregados do cache instantâneo!`);
      return cached;
    }
  }

  const query = new URLSearchParams({
    tmdbId: String(tmdbId),
    type: normalizedType,
    season: String(season || 1),
    episode: String(episode || 1),
  });
  if (imdbId) {
    query.set('imdbId', String(imdbId));
  }
  if (title) {
    query.set('title', String(title));
  }

  onProgress?.('Conectando aos servidores Kairou...');

  const isLocalApp =
    typeof window !== 'undefined' &&
    (Boolean(window.Capacitor) ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  // Função interna para rodar todos os extratores diretamente no cliente em paralelo
  const runDirectClientExtraction = async () => {
    onProgress?.('Buscando servidores de alta velocidade...');
    try {
      const directResults = await Promise.allSettled([
        extractFenixFlixClient({ tmdbId, imdbId, type: normalizedType, season, episode }),
        extractBrflixClient({ tmdbId, imdbId, type: normalizedType, season, episode }),
        extractMegaEmbed({ tmdbId, imdbId, type: normalizedType, season, episode }),
        extractClickHost({ tmdbId, type: normalizedType, season, episode }),
        extractSuperFlix({ tmdbId, type: normalizedType, season, episode }),
        extractWarezCDN({ tmdbId, type: normalizedType, season, episode }),
      ]);

      const fallbackStreams = [];
      for (const res of directResults) {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          fallbackStreams.push(...res.value);
        }
      }

      if (fallbackStreams.length > 0) {
        // Desduplicar streams por URL
        const seenUrls = new Set();
        const uniqueFallback = [];
        for (const s of fallbackStreams) {
          if (s.url && !seenUrls.has(s.url)) {
            seenUrls.add(s.url);
            uniqueFallback.push(s);
          }
        }

        const finalStreams = formatKairouServers(uniqueFallback);
        streamCache.set(cacheKey, finalStreams);
        onProgress?.(`${finalStreams.length} servidores Kairou prontos!`);
        return finalStreams;
      }
    } catch (directErr) {
      console.warn('[Extractor] Falha na extração direta:', directErr);
    }
    return [];
  };

  // Se estiver rodando no app localmente (APK/Capacitor), executa direto no cliente sem depender de servidor
  if (isLocalApp) {
    const localStreams = await runDirectClientExtraction();
    if (localStreams && localStreams.length > 0) {
      return localStreams;
    }
  }

  // 1. VIA RÁPIDA: Chamada ao Serverless /api/extract (se em ambiente web online)
  try {
    const apiRes = await fetchWithTimeout(`/api/extract?${query.toString()}`, {}, 3500);
    if (apiRes && apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.ok && Array.isArray(data.streams) && data.streams.length > 0) {
        const finalStreams = formatKairouServers(data.streams);
        streamCache.set(cacheKey, finalStreams);
        onProgress?.(`${finalStreams.length} servidores Kairou prontos!`);
        return finalStreams;
      }
    }
  } catch (apiErr) {
    console.warn('[Extractor] API Serverless offline ou inacessível, ativando rota direta do cliente...');
  }

  // 2. FALLBACK DIRETO: Se a API Serverless falhou ou o site caiu
  const directStreams = await runDirectClientExtraction();
  if (directStreams && directStreams.length > 0) {
    return directStreams;
  }

  // Se nenhuma fonte respondeu, retorna array vazio para o player exibir o status amigável
  return [];
}
