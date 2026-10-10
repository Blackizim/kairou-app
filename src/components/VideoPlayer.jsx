import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Sliders,
  MessageSquare,
  Check,
  Server,
  Radio,
  RefreshCw,
  AlertCircle,
  Loader2,
  Tv,
  Film,
  Layers,
  ChevronRight,
  ChevronDown,
  Cast,
  Airplay,
  Monitor,
  Wifi,
  X,
  SkipBack,
  SkipForward,
  Send,
  Activity,
  Crown,
  Download,
  Sparkles
} from 'lucide-react';
import { extractAllServers, clearStreamCache } from '../services/extractor';
import { saveWatchProgress } from '../services/supabase';
import { fetchSeasonEpisodes, fetchMediaDetails, fetchMediaExternalIds } from '../services/tmdb';
import { resolveChannelStream } from '../services/channelsResolver';
import { isVipUser } from '../services/vipService';
import { loadWatchingAds, unloadWatchingAds } from '../services/adConsent';

// Opções de Qualidade Padrão
const STANDARD_QUALITIES = [
  { key: 'auto', label: 'Automático (Adaptativo)' },
  { key: '1080p', label: '1080p Full HD', height: 1080 },
  { key: '720p', label: '720p HD', height: 720 },
  { key: '480p', label: '480p', height: 480 },
  { key: '360p', label: '360p', height: 360 },
];

// Helper para processar e ordenar níveis de qualidade do HLS (maior resolução primeiro)
function processHlsLevels(rawLevels) {
  if (!rawLevels || rawLevels.length === 0) return [];
  const parsed = rawLevels.map((lvl, originalIndex) => {
    let height = lvl.height || 0;
    let width = lvl.width || 0;
    const bitrate = lvl.bitrate || 0;

    // Se height não vier direto, extrair de RESOLUTION (string "1920x1080")
    if (!height) {
      const res = lvl.attrs?.RESOLUTION || lvl._attrs?.[0]?.RESOLUTION || lvl.attrs?.resolution || '';
      if (typeof res === 'string' && res.includes('x')) {
        const parts = res.split('x');
        width = parseInt(parts[0], 10) || width;
        height = parseInt(parts[1], 10) || height;
      }
    }

    // Se ainda não tiver height, tentar pelo nome (ex: "1080", "1080p", "720")
    if (!height && lvl.name) {
      const match = String(lvl.name).match(/(\d{3,4})p?/);
      if (match) {
        height = parseInt(match[1], 10);
      }
    }

    // Se ainda não tiver height, tentar pela URL da playlist (ex: "index_1920x1080.m3u8")
    if (!height && lvl.url) {
      const urlStr = Array.isArray(lvl.url) ? lvl.url.join(' ') : String(lvl.url);
      const urlMatch = urlStr.match(/(?:_|\/|-)(\d{3,4})x(\d{3,4})|(?:_|\/|-)(\d{3,4})p/i);
      if (urlMatch) {
        height = parseInt(urlMatch[2] || urlMatch[3], 10);
      }
    }

    // Se ainda não tiver height, inferir pelo bitrate
    if (!height && bitrate > 0) {
      if (bitrate >= 10000000) height = 2160;
      else if (bitrate >= 3500000) height = 1080;
      else if (bitrate >= 1600000) height = 720;
      else if (bitrate >= 800000) height = 480;
      else height = 360;
    }

    // Se não tiver metadados de resolução, assumir o padrão Full HD 1080p
    if (!height) {
      height = 1080;
      width = 1920;
    }

    let label = '';
    let key = '';
    if (height >= 2160 || width >= 3840) {
      label = '4K Ultra HD';
      key = '4k';
    } else if (height >= 1440 || width >= 2560) {
      label = '1440p 2K';
      key = '1440p';
    } else if (height >= 1080 || width >= 1920) {
      label = '1080p Full HD';
      key = '1080p';
    } else if (height >= 720 || width >= 1280) {
      label = '720p HD';
      key = '720p';
    } else if (height >= 480) {
      label = '480p';
      key = '480p';
    } else if (height >= 360) {
      label = '360p';
      key = '360p';
    } else if (height > 0) {
      label = `${height}p`;
      key = `${height}p`;
    } else {
      label = '1080p Full HD';
      key = '1080p';
    }

    return {
      index: originalIndex,
      height,
      width,
      bitrate,
      label,
      key,
    };
  });

  // Deduplicar níveis com a mesma chave (mantém o de maior bitrate)
  const unique = [];
  const seenKeys = new Set();
  const sorted = parsed.sort((a, b) => (b.height - a.height) || (b.bitrate - a.bitrate));

  for (const lvl of sorted) {
    if (!seenKeys.has(lvl.key)) {
      seenKeys.add(lvl.key);
      unique.push(lvl);
    }
  }

  return unique;
}

// Normalizador de áudio: Converte 'man', 'mandingo', 'main' em 'Inglês (Original)' e padroniza Português
function normalizeAudioTrackLabel(tr, index, allTracks) {
  const rawLang = String(tr.lang || '').toLowerCase().trim();
  const rawName = String(tr.name || '').toLowerCase().trim();

  // Caso relatado: streams onde "main" foi codificado como ISO "man" ou auto-rotulado "Mandingo"
  const isMandingoOrMain =
    rawLang === 'man' ||
    rawLang === 'main' ||
    rawLang === 'mand' ||
    rawName.includes('mandingo') ||
    rawName.includes('main');

  const isEnglish =
    isMandingoOrMain ||
    rawLang === 'eng' ||
    rawLang === 'en' ||
    rawLang === 'en-us' ||
    rawLang === 'en-gb' ||
    rawName.includes('english') ||
    rawName.includes('inglês') ||
    rawName.includes('ingles') ||
    rawName.includes('original');

  if (isEnglish) {
    return 'Inglês (Original)';
  }

  const isPortuguese =
    rawLang === 'por' ||
    rawLang === 'pt' ||
    rawLang === 'pt-br' ||
    rawLang === 'pob' ||
    rawName.includes('portug') ||
    rawName.includes('dublado') ||
    rawName.includes('brasil') ||
    rawName.includes('brazil');

  if (isPortuguese) {
    return 'Português (Dublado)';
  }

  if (rawLang === 'spa' || rawLang === 'es' || rawName.includes('espanhol') || rawName.includes('spanish')) {
    return 'Espanhol';
  }

  if (rawLang === 'jpn' || rawLang === 'ja' || rawName.includes('japones') || rawName.includes('japanese')) {
    return 'Japonês';
  }

  if (rawLang === 'fra' || rawLang === 'fre' || rawLang === 'fr' || rawName.includes('frances') || rawName.includes('french')) {
    return 'Francês';
  }

  // Se há exatamente 2 faixas e a outra é Português, esta é o Áudio Original (Inglês)
  if (allTracks && allTracks.length === 2) {
    const otherTrack = allTracks.find((_, i) => i !== index);
    if (otherTrack) {
      const otherLang = String(otherTrack.lang || '').toLowerCase();
      const otherName = String(otherTrack.name || '').toLowerCase();
      if (otherLang.includes('por') || otherLang.includes('pt') || otherName.includes('portug') || otherName.includes('dublado')) {
        return 'Inglês (Original)';
      }
    }
  }

  if (tr.name && tr.name.trim()) {
    return tr.name.replace(/mandingo/gi, 'Inglês (Original)').trim();
  }

  return `Áudio ${index + 1}`;
}

// Helper para detecção estrita de áudio em Português / Dublado
function isPortugueseAudioTrack(tr) {
  if (!tr) return false;
  const rawLang = String(tr.lang || tr.language || '').toLowerCase().trim();
  const rawName = String(tr.name || tr.label || '').toLowerCase().trim();
  return (
    rawLang.startsWith('por') ||
    rawLang.startsWith('pt') ||
    rawLang === 'pob' ||
    rawName.includes('portug') ||
    rawName.includes('dublado') ||
    rawName.includes('brasil') ||
    rawName.includes('brazil') ||
    rawName.includes('nacional') ||
    rawName.includes('pt-br')
  );
}

// Normalizador de Legendas
function normalizeSubtitleTrackLabel(st, index) {
  const lang = String(st.lang || '').toLowerCase().trim();
  const name = String(st.name || '').toLowerCase().trim();

  if (lang.startsWith('por') || lang.startsWith('pt') || name.includes('portug') || name.includes('dublado')) {
    return 'Português [CC]';
  }
  if (lang.startsWith('eng') || lang.startsWith('en') || name.includes('english') || name.includes('inglês') || name.includes('ingles')) {
    return 'Inglês (English)';
  }
  if (lang.startsWith('spa') || lang.startsWith('es') || name.includes('espanhol') || name.includes('spanish')) {
    return 'Espanhol';
  }
  if (lang.startsWith('fra') || lang.startsWith('fr') || name.includes('franc') || name.includes('french')) {
    return 'Francês';
  }
  if (lang.startsWith('jpn') || lang.startsWith('ja') || name.includes('japon') || name.includes('japanese')) {
    return 'Japonês';
  }
  if (st.name && st.name.trim()) {
    return st.name.trim();
  }
  return `Legenda ${index + 1}`;
}

export default function VideoPlayer({
  media,
  episode,
  initialTime = 0,
  autoCast = false,
  user,
  profile,
  onOpenSubscription,
  onClose,
}) {
  const isVip = isVipUser(user, profile);
  const [ambientGlow, setAmbientGlow] = useState(isVip);
  const [dolbyBoost, setDolbyBoost] = useState(false);

  // Carrega anúncios apenas enquanto assiste (exclusivo para plano gratuito) e descarrega ao fechar
  useEffect(() => {
    if (!isVip) {
      loadWatchingAds(user, profile);
    }
    return () => {
      unloadWatchingAds();
    };
  }, [isVip, user, profile]);

  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hlsRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  // Estados de Reprodução
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Extração e servidores Kairou
  const [servers, setServers] = useState([]);
  const [activeServerIndex, setActiveServerIndex] = useState(0);
  const [isExtracting, setIsExtracting] = useState(true);
  const [extractionStatus, setExtractionStatus] = useState('Iniciando conexão com servidores Kairou...');
  const [isVideoBuffering, setIsVideoBuffering] = useState(true);
  const [streamError, setStreamError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Modais de Controle
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [serverLangFilter, setServerLangFilter] = useState('all'); // 'all' | 'dub' | 'sub'
  const [audioSubModalOpen, setAudioSubModalOpen] = useState(false);
  const [qualityModalOpen, setQualityModalOpen] = useState(false);
  const [castModalOpen, setCastModalOpen] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [airPlayAvailable, setAirPlayAvailable] = useState(false);

  // Faixas de Áudio, Legenda e Qualidade
  const [audioTracks, setAudioTracks] = useState([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState(0);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [activeSubtitleTrack, setActiveSubtitleTrack] = useState(-1);
  const [qualityLevels, setQualityLevels] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState('auto'); // 'auto', '1080p', '720p', etc.
  const [currentPlayingResolution, setCurrentPlayingResolution] = useState('');

  const activeSubtitleTrackRef = useRef(-1);
  const subtitleTracksRef = useRef([]);

  // Painel de Debug de Rede
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    serverUrl: '',
    ttfbMs: null,
    manifestMs: null,
    firstFrameMs: null,
    bandwidth: null,
    bufferLen: null,
    droppedFrames: null,
    readyState: null,
    networkState: null,
    startedAt: null,
    verdict: '',
  });

  useEffect(() => {
    activeSubtitleTrackRef.current = activeSubtitleTrack;
  }, [activeSubtitleTrack]);

  useEffect(() => {
    subtitleTracksRef.current = subtitleTracks;
  }, [subtitleTracks]);

  const activeServer = servers[activeServerIndex] || null;

  // Ctrl+D: toggle painel de debug de rede
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setShowDebug((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Atualizar info de debug a cada segundo quando painel estiver aberto
  useEffect(() => {
    if (!showDebug) return;
    const interval = setInterval(() => {
      const vid = videoRef.current;
      const hls = hlsRef.current;
      if (!vid) return;

      const buffered = vid.buffered.length > 0
        ? (vid.buffered.end(vid.buffered.length - 1) - vid.currentTime).toFixed(1)
        : '0';

      const bw = hls?.bandwidthEstimate
        ? (hls.bandwidthEstimate / 1e6).toFixed(2) + ' Mbps'
        : null;

      const dropped = vid.getVideoPlaybackQuality?.()?.droppedVideoFrames ?? null;
      const total = vid.getVideoPlaybackQuality?.()?.totalVideoFrames ?? null;
      const droppedStr = dropped !== null ? `${dropped}/${total}` : 'N/A';

      const rsMap = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
      const nsMap = ['EMPTY', 'IDLE', 'LOADING', 'NO_SOURCE'];

      setDebugInfo((prev) => {
        const now = Date.now();
        const elapsedSec = prev.startedAt ? ((now - prev.startedAt) / 1000).toFixed(1) : null;

        // Calcular veredito
        let verdict = '';
        if (prev.manifestMs === null && elapsedSec > 5) {
          verdict = '🔴 Servidor não respondeu ao manifesto — problema no servidor ou DNS/proxy';
        } else if (prev.manifestMs !== null && prev.firstFrameMs === null && elapsedSec > 8) {
          verdict = '🟡 Manifesto recebido mas sem frames — possível lentidão na sua rede';
        } else if (prev.firstFrameMs !== null && parseFloat(buffered) < 1 && !vid.paused) {
          verdict = '🟡 Buffer baixo (<1s) — sua conexão está acompanhando no limite';
        } else if (prev.firstFrameMs !== null && parseFloat(buffered) >= 2) {
          verdict = '🟢 Stream OK — buffer saudável';
        } else if (prev.firstFrameMs !== null) {
          verdict = '🟢 Reproduzindo';
        }

        return {
          ...prev,
          bandwidth: bw,
          bufferLen: buffered + 's',
          droppedFrames: droppedStr,
          readyState: rsMap[vid.readyState] || vid.readyState,
          networkState: nsMap[vid.networkState] || vid.networkState,
          verdict,
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showDebug]);


  // O modo iframe é exclusivo para canais de TV ao vivo quando não há stream HLS direto. Filmes e séries utilizam APENAS o player nativo.
  const isLiveMedia = Boolean(media?.type === 'live' || media?.isLive);
  const isIframeMode = Boolean(isLiveMedia && (activeServer?.isIframe || activeServer?.type === 'iframe'));

  const userSelectedAudioRef = useRef(false);
  const userSelectedSubtitleRef = useRef(false);
  const userSelectedServerRef = useRef(false);

  useEffect(() => {
    userSelectedAudioRef.current = false;
    userSelectedSubtitleRef.current = false;
  }, [activeServerIndex]);

  // Identificação do áudio do servidor ativo (Dublado vs Original)
  const isCurrentDub = Boolean(
    activeServer?.isDub ||
    (activeServer?.providerName || '').toLowerCase().includes('dub') ||
    (activeServer?.providerName || '').toLowerCase().includes('nacional')
  );

  // Servidor alternativo caso exista versão com áudio oposto (Dublado vs Legendado)
  const alternateAudioServer = useMemo(() => {
    if (!servers || servers.length <= 1) return null;
    const altIdx = servers.findIndex((s, idx) => {
      if (idx === activeServerIndex) return false;
      const sDub = Boolean(
        s.isDub ||
        (s.providerName || '').toLowerCase().includes('dub') ||
        (s.providerName || '').toLowerCase().includes('nacional')
      );
      return sDub !== isCurrentDub;
    });
    if (altIdx >= 0) {
      const srv = servers[altIdx];
      const isAltDub = Boolean(
        srv.isDub ||
        (srv.providerName || '').toLowerCase().includes('dub') ||
        (srv.providerName || '').toLowerCase().includes('nacional')
      );
      return { index: altIdx, server: srv, isDub: isAltDub };
    }
    return null;
  }, [servers, activeServerIndex, isCurrentDub]);

  // Contadores e Filtro de Servidores (Dublado 🇧🇷 vs Áudio Original 🇺🇸)
  const dubServersCount = useMemo(() => {
    return (servers || []).filter((s) => Boolean(s.isDub || (s.providerName || '').includes('[Dublado]'))).length;
  }, [servers]);

  const subServersCount = useMemo(() => {
    return (servers || []).filter((s) => !s.isDub && !(s.providerName || '').includes('[Dublado]')).length;
  }, [servers]);

  const filteredServers = useMemo(() => {
    if (!servers || servers.length === 0) return [];
    if (serverLangFilter === 'dub') {
      return servers.filter((s) => Boolean(s.isDub || (s.providerName || '').includes('[Dublado]')));
    }
    if (serverLangFilter === 'sub') {
      return servers.filter((s) => !s.isDub && !(s.providerName || '').includes('[Dublado]'));
    }
    return servers;
  }, [servers, serverLangFilter]);

  // Informações da mídia e Gerenciamento de Episódios
  const rawMediaId = String(media?.id || media?.tmdbId || '');
  const isImdb = rawMediaId.startsWith('tt');
  const parsedTmdb = parseInt(rawMediaId.replace(/^(movie|series|tv)-/, ''), 10);
  const tmdbId = media?.tmdbId || (!isNaN(parsedTmdb) ? parsedTmdb : null);
  const [detectedType, setDetectedType] = useState(null);
  const isExplicitMovie =
    detectedType === 'movie' ||
    media?.type === 'movie' ||
    media?.media_type === 'movie' ||
    media?.isMovie ||
    rawMediaId.startsWith('movie-') ||
    Boolean(media?.title && !media?.name && !media?.number_of_seasons && !media?.seasons?.length && !media?.first_air_date && !episode?.title);
  const isSeries = !isExplicitMovie && (media?.type === 'series' || media?.type === 'tv' || rawMediaId.startsWith('series-') || (Boolean(episode) && !isExplicitMovie) || (media?.seasons && media.seasons.length > 0) || Boolean(media?.number_of_seasons));
  const imdbId = media?.imdb_id || media?.imdbId || episode?.imdb_id || (isImdb ? rawMediaId : null);

  const [currentSeasonNumber, setCurrentSeasonNumber] = useState(episode?.season || 1);
  const [currentEpisodeNumber, setCurrentEpisodeNumber] = useState(episode?.ep || 1);
  const [currentEpisode, setCurrentEpisode] = useState(episode || null);
  const [seasons, setSeasons] = useState(media?.seasons || []);
  const [episodesList, setEpisodesList] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [episodesModalOpen, setEpisodesModalOpen] = useState(false);
  const isEpisodeSwitchedRef = useRef(false);

  const fetchedSeasonsRef = useRef(new Set());
  const fetchedEpisodesRef = useRef(new Set());
  const fetchedSubsRef = useRef(new Set());

  // Sincronizar caso a prop episode mude externamente
  useEffect(() => {
    if (episode) {
      setCurrentSeasonNumber(episode.season || 1);
      setCurrentEpisodeNumber(episode.ep || 1);
      setCurrentEpisode(episode);
    }
  }, [episode]);

  // Carregar lista de temporadas caso não venha no objeto media
  useEffect(() => {
    if (!isSeries || !tmdbId || detectedType === 'movie') return;
    if (fetchedSeasonsRef.current.has(tmdbId)) return;
    fetchedSeasonsRef.current.add(tmdbId);

    let isMounted = true;
    fetchMediaDetails(tmdbId, 'series').then((details) => {
      if (!isMounted) return;
      if (details?.type === 'movie' || (details?.title && !details?.number_of_seasons && !details?.seasons?.length)) {
        setDetectedType('movie');
        return;
      }
      if (details?.seasons && details.seasons.length > 0) {
        setSeasons(details.seasons);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isSeries, tmdbId, detectedType]);

  // Carregar lista de episódios da temporada ativa
  useEffect(() => {
    if (!isSeries || !tmdbId || detectedType === 'movie') return;
    const epKey = `${tmdbId}-s${currentSeasonNumber}`;
    if (fetchedEpisodesRef.current.has(epKey)) return;
    fetchedEpisodesRef.current.add(epKey);

    let isMounted = true;
    setLoadingEpisodes(true);

    fetchSeasonEpisodes(tmdbId, currentSeasonNumber)
      .then((eps) => {
        if (!isMounted) return;
        setEpisodesList(eps || []);
        setLoadingEpisodes(false);
        if (eps && eps.length > 0) {
          const found = eps.find((e) => e.ep === currentEpisodeNumber);
          if (found) {
            setCurrentEpisode((prev) => ({ ...prev, ...found, season: currentSeasonNumber }));
          }
        }
      })
      .catch(() => {
        if (isMounted) setLoadingEpisodes(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isSeries, tmdbId, currentSeasonNumber, detectedType]);

  // Carregamento resiliente de legendas do OpenSubtitles (Stremio v3)
  useEffect(() => {
    let isMounted = true;
    const effectiveIsSeries = isSeries && detectedType !== 'movie';
    const subKey = `${tmdbId || imdbId}-${effectiveIsSeries ? 's' + currentSeasonNumber + 'e' + currentEpisodeNumber : 'm'}`;
    if (fetchedSubsRef.current.has(subKey)) return;
    fetchedSubsRef.current.add(subKey);

    async function loadSubs() {
      let targetImdb = imdbId;
      if (!targetImdb && tmdbId) {
        try {
          targetImdb = await fetchMediaExternalIds(tmdbId, effectiveIsSeries ? 'series' : 'movie');
        } catch {}
      }
      if (!targetImdb || !isMounted) return;

      const path = effectiveIsSeries
        ? `series/${targetImdb}:${currentSeasonNumber}:${currentEpisodeNumber}.json`
        : `movie/${targetImdb}.json`;

      try {
        const res = await fetch(`https://opensubtitles-v3.strem.io/subtitles/${path}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !Array.isArray(data?.subtitles) || data.subtitles.length === 0) return;

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
        const sorted = [...data.subtitles].sort((a, b) => {
          const order = { pob: 1, por: 2, eng: 3, spa: 4, fre: 5, fra: 5 };
          return (order[a.lang] || 99) - (order[b.lang] || 99);
        });

        for (const item of sorted) {
          const l = item.lang;
          if (!allowed.includes(l)) continue;
          if (!item.url) continue;
          counts[l] = (counts[l] || 0) + 1;
          if (counts[l] <= 2) {
            const baseName = langNames[l] || l.toUpperCase();
            const label = counts[l] > 1 ? `${baseName} (Opção ${counts[l]})` : baseName;
            formatted.push({
              id: 1000 + formatted.length,
              originalId: item.id || `sub-${l}-${counts[l]}`,
              lang: l === 'pob' ? 'pt-BR' : (l === 'por' ? 'pt' : (l === 'eng' ? 'en' : l)),
              label,
              url: `/api/proxy?format=vtt&url=${encodeURIComponent(item.url)}`,
              originalUrl: item.url,
              isExternal: true,
            });
          }
        }

        if (isMounted && formatted.length > 0) {
          setSubtitleTracks((prev) => {
            if (!prev || prev.length === 0) {
              subtitleTracksRef.current = formatted;
              return formatted;
            }
            const combined = [...prev];
            for (const f of formatted) {
              if (!combined.some((c) => c.label.toLowerCase() === f.label.toLowerCase())) {
                combined.push(f);
              }
            }
            subtitleTracksRef.current = combined;
            return combined;
          });
        }
      } catch {}
    }

    loadSubs();

    return () => {
      isMounted = false;
    };
  }, [imdbId, tmdbId, isSeries, currentSeasonNumber, currentEpisodeNumber, detectedType]);

  // Mostra notificação temporária no player
  const triggerNotification = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification((prev) => (prev === msg ? null : prev)), 4000);
  }, []);

  // Se o usuário iniciou no modo de transmissão (Cast)
  useEffect(() => {
    if (autoCast) {
      setCastModalOpen(true);
    }
  }, [autoCast]);

  // Salvar progresso de visualização no Supabase periodicamente
  const lastSavedTimeRef = useRef(0);
  useEffect(() => {
    if (!media || duration <= 0 || currentTime <= 5) return;

    if (Math.abs(currentTime - lastSavedTimeRef.current) >= 10 || !isPlaying) {
      lastSavedTimeRef.current = currentTime;
      saveWatchProgress({
        mediaId: media.id || media.tmdbId,
        mediaType: isSeries ? 'series' : 'movie',
        title: media.title,
        posterPath: media.poster,
        backdropPath: media.backdrop,
        season: currentSeasonNumber,
        episode: currentEpisodeNumber,
        episodeTitle: currentEpisode?.title || '',
        currentTime,
        duration,
      });
    }
  }, [currentTime, isPlaying, duration, media, isSeries, currentSeasonNumber, currentEpisodeNumber, currentEpisode]);

  // Salvar progresso final ao desmontar/fechar o player
  useEffect(() => {
    return () => {
      const vid = videoRef.current;
      if (vid && vid.currentTime > 5 && vid.duration > 0 && media) {
        saveWatchProgress({
          mediaId: media.id || media.tmdbId,
          mediaType: isSeries ? 'series' : 'movie',
          title: media.title,
          posterPath: media.poster,
          backdropPath: media.backdrop,
          season: currentSeasonNumber,
          episode: currentEpisodeNumber,
          episodeTitle: currentEpisode?.title || '',
          currentTime: vid.currentTime,
          duration: vid.duration,
        });
      }
    };
  }, [media, isSeries, currentSeasonNumber, currentEpisodeNumber, currentEpisode]);

  // Referência para controlar servidores que falharam e evitar loops
  const failedServersRef = useRef(new Set());
  const lastFallbackTimeRef = useRef(0);
  const fallbackTimeoutRef = useRef(null);
  const previousLoadedUrlRef = useRef(null);


  // 1. Extração dos servidores Kairou ao carregar mídia ou mudar episódio
  useEffect(() => {
    let isMounted = true;

    // Caso seja canal de TV ao vivo com fluxo direto ou slug
    if (media?.type === 'live' || media?.isLive) {
      setIsExtracting(true);
      setStreamError(null);
      failedServersRef.current.clear();
      setExtractionStatus('Sintonizando transmissão ao vivo...');

      const liveStreamUrl = media.streamUrl;
      const slug = media.slug || media.channel?.slug;

      const isDirectStream = !media.isIframe && liveStreamUrl && (liveStreamUrl.includes('.txt') || liveStreamUrl.includes('.m3u8') || liveStreamUrl.includes('stream-proxy'));

      if (liveStreamUrl) {
        const liveServer = {
          id: `kairou-live-${slug || Date.now()}`,
          server: 'Kairou Live TV',
          providerName: `Kairou · ${media.title} (${isDirectStream ? 'HLS Nativo' : 'Transmissão Ao Vivo'})`,
          url: liveStreamUrl,
          type: isDirectStream ? 'hls' : 'iframe',
          isHls: isDirectStream,
          isIframe: !isDirectStream,
          quality: '1080p Full HD',
          isLive: true,
        };
        setServers([liveServer]);
        setActiveServerIndex(0);
        setIsExtracting(false);
        triggerNotification(`Ao Vivo: ${media.title}`);
        return;
      }

      if (slug) {
        resolveChannelStream(slug)
          .then((data) => {
            if (!isMounted) return;
            if (data && data.ok && data.streamUrl) {
              const isDirectHls = data.type === 'hls' && data.streamUrl && !data.isIframe;
              const liveServer = {
                id: `kairou-live-${slug}`,
                server: 'Kairou Live TV',
                providerName: `Kairou · ${media.title} (${isDirectHls ? 'HLS Nativo' : 'Transmissão Ao Vivo'})`,
                url: data.streamUrl || data.fallbackIframeUrl,
                type: isDirectHls ? 'hls' : 'iframe',
                isHls: isDirectHls,
                isIframe: !isDirectHls,
                quality: '1080p Full HD',
                isLive: true,
              };
              setServers([liveServer]);
              setActiveServerIndex(0);
              triggerNotification(`Ao Vivo: ${media.title}`);
            } else {
              setStreamError('Canal temporariamente fora do ar. Tente outro canal.');
            }
            setIsExtracting(false);
          })
          .catch(() => {
            if (!isMounted) return;
            setStreamError('Erro ao sintonizar canal ao vivo.');
            setIsExtracting(false);
          });
        return;
      }
    }

    if (!tmdbId && !media?.id && !imdbId) return;

    setIsExtracting(true);
    setStreamError(null);
    userSelectedServerRef.current = false;
    failedServersRef.current.clear();
    setExtractionStatus('Conectando aos servidores Kairou...');

    extractAllServers({
      tmdbId,
      imdbId,
      title: media?.title || '',
      type: isSeries ? 'series' : 'movie',
      season: currentSeasonNumber,
      episode: currentEpisodeNumber,
      onProgress: (status) => {
        if (isMounted) setExtractionStatus(status);
      },
      onStreamsAvailable: (fastList) => {
        if (!isMounted) return;
        if (fastList && fastList.length > 0) {
          setServers((prev) => {
            if (!prev || prev.length === 0) {
              setActiveServerIndex(0);
              triggerNotification(`Conectado: ${fastList[0].providerName}`);
              setIsExtracting(false);
              return fastList;
            }
            return prev;
          });
        }
      },
    })
      .then((extractedList) => {
        if (!isMounted) return;
        if (extractedList && extractedList.length > 0) {
          setServers((prevServers) => {
            const currentActive = prevServers && prevServers[activeServerIndex];

            // Se o usuário selecionou manualmente um servidor, mantenha a seleção dele buscando o mesmo ID/URL na nova lista
            if (userSelectedServerRef.current && currentActive) {
              const matchingIdx = extractedList.findIndex(
                (s) => (s.url && s.url === currentActive.url) || (s.id && s.id === currentActive.id)
              );
              if (matchingIdx >= 0) {
                setActiveServerIndex(matchingIdx);
              }
              return extractedList;
            }

            const currentRank = currentActive?.rank ?? 4;
            const newBestRank = extractedList[0]?.rank ?? 4;
            // Se a lista completa trouxe resolução superior (ex: 1080p ou 4K superando 720p)
            // mas apenas se o usuário NÃO selecionou um servidor e o servidor 0 ainda não tiver falhado!
            if (!userSelectedServerRef.current && !failedServersRef.current.has(0) && newBestRank < currentRank) {
              setActiveServerIndex(0);
              triggerNotification(`Qualidade máxima disponível: ${extractedList[0].providerName}`);
            } else if (!currentActive && !failedServersRef.current.has(0)) {
              setActiveServerIndex(0);
              triggerNotification(`Conectado: ${extractedList[0].providerName}`);
            }
            return extractedList;
          });
        } else {
          setStreamError(isSeries ? 'Ainda não temos este episódio disponível' : 'Ainda não temos este filme disponível');
        }
        setIsExtracting(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[VideoPlayer] Erro na extração Kairou:', err);
        setStreamError(isSeries ? 'Ainda não temos este episódio disponível' : 'Ainda não temos este filme disponível');
        setIsExtracting(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tmdbId, imdbId, isSeries, currentSeasonNumber, currentEpisodeNumber, media?.id, media?.title, triggerNotification]);

  // Função para tentar novamente a extração com 3 novas tentativas limpas
  const handleRetryExtraction = useCallback(() => {
    setIsExtracting(true);
    setIsVideoBuffering(true);
    setStreamError(null);
    setServers([]);
    setActiveServerIndex(0);
    failedServersRef.current.clear();
    setExtractionStatus('Reconectando aos servidores Kairou...');

    clearStreamCache(`${tmdbId}-${isSeries ? 'series' : 'movie'}-${currentSeasonNumber}-${currentEpisodeNumber}`);

    extractAllServers({
      tmdbId,
      imdbId,
      title: media?.title || '',
      type: isSeries ? 'series' : 'movie',
      season: currentSeasonNumber,
      episode: currentEpisodeNumber,
      onProgress: (status) => {
        setExtractionStatus(status);
      },
      onStreamsAvailable: (fastList) => {
        if (fastList && fastList.length > 0) {
          setServers((prev) => {
            if (!prev || prev.length === 0) {
              setActiveServerIndex(0);
              triggerNotification(`Conectado: ${fastList[0].providerName}`);
              setIsExtracting(false);
              return fastList;
            }
            return prev;
          });
        }
      },
    })
      .then((extractedList) => {
        if (extractedList && extractedList.length > 0) {
          setServers((prevServers) => {
            const currentActive = prevServers && prevServers[activeServerIndex];
            const currentRank = currentActive?.rank ?? 4;
            const newBestRank = extractedList[0]?.rank ?? 4;
            if (newBestRank < currentRank) {
              setActiveServerIndex(0);
              triggerNotification(`Qualidade máxima disponível: ${extractedList[0].providerName}`);
            } else if (!currentActive) {
              setActiveServerIndex(0);
              triggerNotification(`Conectado: ${extractedList[0].providerName}`);
            }
            return extractedList;
          });
        } else {
          setStreamError(isSeries ? 'Ainda não temos este episódio disponível' : 'Ainda não temos este filme disponível');
        }
        setIsExtracting(false);
      })
      .catch((err) => {
        console.error('[VideoPlayer] Erro na retentativa Kairou:', err);
        setStreamError(isSeries ? 'Ainda não temos este episódio disponível' : 'Ainda não temos este filme disponível');
        setIsExtracting(false);
      });
  }, [tmdbId, imdbId, isSeries, currentSeasonNumber, currentEpisodeNumber, triggerNotification]);

  // Função para trocar episódio diretamente no player
  const handleSwitchEpisode = useCallback(
    (targetEp, seasonNum = currentSeasonNumber) => {
      const vid = videoRef.current;
      if (vid && vid.currentTime > 5 && vid.duration > 0 && media) {
        saveWatchProgress({
          mediaId: media.id || media.tmdbId,
          mediaType: 'series',
          title: media.title,
          posterPath: media.poster,
          backdropPath: media.backdrop,
          season: currentSeasonNumber,
          episode: currentEpisodeNumber,
          episodeTitle: currentEpisode?.title || '',
          currentTime: vid.currentTime,
          duration: vid.duration,
        });
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (vid) {
        vid.pause();
        vid.removeAttribute('src');
        vid.load();
      }

      isEpisodeSwitchedRef.current = true;
      setCurrentTime(0);
      setDuration(0);
      setIsVideoBuffering(true);
      setIsPlaying(true);
      setServers([]);
      setActiveServerIndex(0);
      userSelectedServerRef.current = false;
      failedServersRef.current.clear();

      setCurrentSeasonNumber(seasonNum);
      setCurrentEpisodeNumber(targetEp.ep);
      setCurrentEpisode({
        ...targetEp,
        season: seasonNum,
      });

      setEpisodesModalOpen(false);
      triggerNotification(`Carregando T${seasonNum}:E${targetEp.ep} — ${targetEp.title || `Episódio ${targetEp.ep}`}`);
    },
    [media, currentSeasonNumber, currentEpisodeNumber, currentEpisode, triggerNotification]
  );

  // Navegação para episódio anterior e próximo
  const currentEpIndex = episodesList.findIndex((e) => e.ep === currentEpisodeNumber);
  const hasPrevEpisode = currentEpIndex > 0 || currentEpisodeNumber > 1;
  const hasNextEpisode =
    (currentEpIndex >= 0 && currentEpIndex < episodesList.length - 1) ||
    seasons.some((s) => s.season_number === currentSeasonNumber + 1);

  const handleNextEpisode = useCallback(() => {
    if (currentEpIndex >= 0 && currentEpIndex < episodesList.length - 1) {
      handleSwitchEpisode(episodesList[currentEpIndex + 1], currentSeasonNumber);
    } else if (seasons.some((s) => s.season_number === currentSeasonNumber + 1)) {
      const nextSeason = currentSeasonNumber + 1;
      fetchSeasonEpisodes(tmdbId, nextSeason).then((eps) => {
        if (eps && eps.length > 0) {
          handleSwitchEpisode(eps[0], nextSeason);
        }
      });
    } else {
      handleSwitchEpisode(
        { ep: currentEpisodeNumber + 1, title: `Episódio ${currentEpisodeNumber + 1}` },
        currentSeasonNumber
      );
    }
  }, [currentEpIndex, episodesList, seasons, currentSeasonNumber, currentEpisodeNumber, handleSwitchEpisode, tmdbId]);

  const handlePrevEpisode = useCallback(() => {
    if (currentEpIndex > 0) {
      handleSwitchEpisode(episodesList[currentEpIndex - 1], currentSeasonNumber);
    } else if (currentEpisodeNumber > 1) {
      handleSwitchEpisode(
        { ep: currentEpisodeNumber - 1, title: `Episódio ${currentEpisodeNumber - 1}` },
        currentSeasonNumber
      );
    }
  }, [currentEpIndex, episodesList, currentEpisodeNumber, currentSeasonNumber, handleSwitchEpisode]);

  // Função para alternar para o próximo servidor automaticamente em caso de falha
  const handleAutoFallback = useCallback(() => {
    const vid = videoRef.current;
    // Se o vídeo já começou a reproduzir ativamente, NUNCA aciona erro de fallback
    if (vid && (vid.currentTime > 0.5 || (!vid.paused && vid.readyState >= 2))) {
      setStreamError(null);
      return;
    }

    failedServersRef.current.add(activeServerIndex);

    const now = Date.now();
    if (now - lastFallbackTimeRef.current < 600) {
      if (!fallbackTimeoutRef.current) {
        fallbackTimeoutRef.current = setTimeout(() => {
          fallbackTimeoutRef.current = null;
          handleAutoFallback();
        }, 700);
      }
      return;
    }
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    lastFallbackTimeRef.current = now;

    if (media?.type === 'live' || media?.isLive) {
      const slug = media.slug || media.channel?.slug;
      if (slug && !activeServer?.isIframe) {
        console.warn('[VideoPlayer] Transmissão HLS nativa falhou. Alternando para servidor reserva de transmissão...');
        const fallbackTarget = media.fallbackUrl || `https://v2.rdembed.sbs/${slug}`;
        const iframeServer = {
          id: `kairou-live-fallback-${slug}`,
          server: 'Kairou Live TV (Reserva)',
          providerName: `Kairou · ${media.title} (Transmissão Reserva)`,
          url: fallbackTarget,
          type: 'iframe',
          isHls: false,
          isIframe: true,
          quality: '1080p Full HD',
          isLive: true,
        };
        setServers([iframeServer]);
        setActiveServerIndex(0);
        triggerNotification('Alternando para transmissão reserva');
        return;
      }
      setStreamError('Canal temporariamente fora do ar. Tente outro canal.');
      return;
    }

    if (!servers || servers.length === 0) {
      setStreamError(isSeries ? 'Ainda não temos este episódio disponível' : 'Ainda não temos este filme disponível');
      return;
    }

    failedServersRef.current.add(activeServerIndex);

    // Se todos os servidores disponíveis falharam
    if (failedServersRef.current.size >= servers.length) {
      console.warn('[VideoPlayer] Todos os servidores disponíveis falharam.');
      // Proteção: se o vídeo começou a tocar no momento da falha ou tem buffer carregado, não exibe modal
      if (vid && (vid.currentTime > 0 || vid.readyState >= 1 || !vid.paused)) {
        setStreamError(null);
        return;
      }
      setStreamError(isSeries ? 'Ainda não temos este episódio disponível' : 'Ainda não temos este filme disponível');
      return;
    }

    const currentServer = servers[activeServerIndex];
    const isCurrentDub = Boolean(
      currentServer?.isDub ||
      (currentServer?.providerName || '').toLowerCase().includes('dub') ||
      (currentServer?.providerName || '').toLowerCase().includes('nacional')
    );

    // 1. Encontrar primeiro outro servidor do MESMO idioma que ainda não foi tentado
    let nextIndex = -1;
    for (let i = 1; i < servers.length; i++) {
      const candidateIdx = (activeServerIndex + i) % servers.length;
      if (!failedServersRef.current.has(candidateIdx)) {
        const candidateSrv = servers[candidateIdx];
        const isCandidateDub = Boolean(
          candidateSrv?.isDub ||
          (candidateSrv?.providerName || '').toLowerCase().includes('dub') ||
          (candidateSrv?.providerName || '').toLowerCase().includes('nacional')
        );
        if (isCandidateDub === isCurrentDub) {
          nextIndex = candidateIdx;
          break;
        }
      }
    }

    // 2. Se não houver mais servidores do mesmo idioma, tentar qualquer outro não tentado
    if (nextIndex === -1) {
      for (let i = 1; i < servers.length; i++) {
        const candidateIdx = (activeServerIndex + i) % servers.length;
        if (!failedServersRef.current.has(candidateIdx)) {
          nextIndex = candidateIdx;
          break;
        }
      }
    }

    if (nextIndex === -1 || failedServersRef.current.has(nextIndex)) {
      if (vid && (vid.currentTime > 0.5 || vid.readyState >= 2)) {
        setStreamError(null);
        return;
      }
      setStreamError(isSeries ? 'Ainda não temos este episódio disponível' : 'Ainda não temos este filme disponível');
      return;
    }

    const nextSrv = servers[nextIndex];
    triggerNotification(`Servidor instável. Alternando para: ${nextSrv.providerName}`);
    setActiveServerIndex(nextIndex);
  }, [servers, activeServerIndex, isSeries, triggerNotification]);

  // Ref estável para handleAutoFallback — garante que o useEffect de playback não re-execute quando deps mudam
  const handleAutoFallbackRef = useRef(handleAutoFallback);
  useEffect(() => {
    handleAutoFallbackRef.current = handleAutoFallback;
  }, [handleAutoFallback]);

  // Aplica o modo 'showing' na trilha de legendas ativa e desativa as demais
  const applySubtitleMode = useCallback((trackId, customTracks = null) => {
    const video = videoRef.current;
    if (!video || !video.textTracks) return;

    const list = customTracks || subtitleTracksRef.current;
    const targetSub = trackId >= 0 && list && list.find((s) => s.id === trackId);

    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (trackId === -1) {
        track.mode = 'disabled';
      } else {
        const matches =
          i === trackId ||
          track.id === String(trackId) ||
          (targetSub && (
            (track.label && targetSub.label && track.label.toLowerCase() === targetSub.label.toLowerCase()) ||
            (track.language && targetSub.lang && track.language.toLowerCase() === targetSub.lang.toLowerCase())
          ));

        if (matches) {
          track.mode = 'showing';
        } else {
          track.mode = 'disabled';
        }
      }
    }
  }, []);

  // 2. Inicialização do Hls.js ou Vídeo Nativo quando o servidor ativo muda
  useEffect(() => {
    if (!activeServer) return;

    if (activeServer.isIframe || activeServer.type === 'iframe') {
      setIsVideoBuffering(false);
      setStreamError(null);
      setIsPlaying(true);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    if (!videoRef.current) return;

    const video = videoRef.current;
    const currentUrl = activeServer.url;

    // Se este mesmo stream já está carregando ou tocando, não reinicia tudo do zero!
    if (previousLoadedUrlRef.current === currentUrl && video.src) {
      return;
    }
    previousLoadedUrlRef.current = currentUrl;
    // Novo servidor/URL: limpar histórico de falhas para esta sessão de carregamento
    failedServersRef.current.clear();

    const isHlsStream = activeServer.type === 'hls' || activeServer.isHls || currentUrl.includes('.m3u8') || currentUrl.includes('__index.txt');

    const debugStartedAt = Date.now();
    setIsVideoBuffering(true);
    setStreamError(null);
    setDebugInfo({
      serverUrl: currentUrl,
      ttfbMs: null,
      manifestMs: null,
      firstFrameMs: null,
      bandwidth: null,
      bufferLen: null,
      droppedFrames: null,
      readyState: null,
      networkState: null,
      startedAt: debugStartedAt,
      verdict: '⏳ Conectando ao servidor...',
    });

    // Inicializar legendas externas se o servidor fornecer
    if (activeServer?.subtitles && activeServer.subtitles.length > 0) {
      const extSubs = activeServer.subtitles.map((ext, extIdx) => ({
        id: 1000 + extIdx,
        originalId: ext.id || `ext-${extIdx}`,
        label: ext.label || (ext.lang === 'por' || ext.lang === 'pt' ? 'Português [CC]' : (ext.lang || `Legenda Externa ${extIdx + 1}`)),
        lang: ext.lang || 'pt',
        url: ext.url,
        isExternal: true,
      }));
      setSubtitleTracks(extSubs);
      subtitleTracksRef.current = extSubs;
    } else {
      setSubtitleTracks([]);
      subtitleTracksRef.current = [];
    }

    // Destruir instância anterior de Hls se existir
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Preservar timestamp de reprodução ou continuar de initialTime (se trocou de episódio, inicia do 0)
    let lastTime = 0;
    if (isEpisodeSwitchedRef.current) {
      lastTime = 0;
      isEpisodeSwitchedRef.current = false;
    } else {
      lastTime = video.currentTime > 2 ? video.currentTime : (initialTime > 0 ? initialTime : 0);
    }

    let hasStartedPlayback = false;
    // Watchdog de carregamento inteligente:
    // Damos tempo hábil (25s para 1 servidor, 20s para múltiplos) para conexões via túnel/proxy baixarem o manifesto e os primeiros chunks HLS
    const timeoutDuration = servers && servers.length <= 1 ? 25000 : 20000;

    let watchdogTimer = null;

    const cancelWatchdog = () => {
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
    };

    const onPlaybackStarted = () => {
      if (hasStartedPlayback) return;
      hasStartedPlayback = true;
      cancelWatchdog();
      setIsVideoBuffering(false);
      setStreamError(null);
      const firstFrameMs = Date.now() - debugStartedAt;
      setDebugInfo((prev) => ({ ...prev, firstFrameMs }));
      console.info(`[Debug] 🎬 Primeiro frame: ${firstFrameMs}ms | Manifesto: ${prev => prev.manifestMs}ms`);
    };

    watchdogTimer = setTimeout(() => {
      const vid = videoRef.current;
      // Se a reprodução já iniciou, ou o elemento de vídeo já recebeu dados no buffer (readyState >= 2), não interrompe!
      if (hasStartedPlayback || (vid && (vid.currentTime > 0 || vid.readyState >= 2 || !vid.paused))) {
        cancelWatchdog();
        return;
      }
      console.warn(`[VideoPlayer] Servidor ${activeServer.providerName} demorou a responder. Alternando...`);
      handleAutoFallbackRef.current();
    }, timeoutDuration);

    video.addEventListener('playing', onPlaybackStarted);
    video.addEventListener('canplay', onPlaybackStarted);
    video.addEventListener('loadeddata', onPlaybackStarted);
    video.addEventListener('timeupdate', onPlaybackStarted);

    let cleanupTextTrackListeners = null;

    const isAppleDevice = typeof window !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      (/^((?!chrome|android).)*safari/i.test(navigator.userAgent))
    );

    const canPlayAppleHls = Boolean(
      video.canPlayType('application/vnd.apple.mpegurl') ||
      video.canPlayType('application/x-mpegURL')
    );

    // No iPhone, iPad e Safari da Apple:
    // O AVPlayer nativo da Apple é OBRIGATÓRIO para o AirPlay transmitir Vídeo + Áudio para a LG TV e Smart TVs.
    // Usar Hls.js com MSE (blob:) no iOS faz o AirPlay transmitir APENAS áudio e o vídeo fica preso no telefone.
    const useNativeAppleHls = isHlsStream && canPlayAppleHls && isAppleDevice;

    if (useNativeAppleHls) {
      video.src = currentUrl;
      video.load();

      const updateSafariAudioTracks = () => {
        if (video.audioTracks && video.audioTracks.length > 0) {
          const raw = Array.from(video.audioTracks);
          const list = raw.map((tr, idx) => ({
            id: idx,
            originalId: tr.id || String(idx),
            label: normalizeAudioTrackLabel(
              { name: tr.label || tr.name, lang: tr.language },
              idx,
              raw
            ),
            lang: tr.language,
            enabled: tr.enabled,
          }));
          setAudioTracks(list);

          // PRIORIZAÇÃO MÁXIMA ABSOLUTA DE ÁUDIO PT-BR (DUBLADO)
          if (!userSelectedAudioRef.current) {
            const ptIdx = raw.findIndex((tr) => isPortugueseAudioTrack(tr));
            if (ptIdx >= 0) {
              for (let i = 0; i < raw.length; i++) {
                raw[i].enabled = (i === ptIdx);
              }
              setActiveAudioTrack(ptIdx);
            } else {
              const activeIdx = list.findIndex((t) => t.enabled);
              if (activeIdx >= 0) setActiveAudioTrack(activeIdx);
            }
          } else {
            const activeIdx = list.findIndex((t) => t.enabled);
            if (activeIdx >= 0) setActiveAudioTrack(activeIdx);
          }
        }
      };

      const updateSafariTextTracks = () => {
        if (video.textTracks && video.textTracks.length > 0) {
          const raw = Array.from(video.textTracks).filter(
            (t) => t.kind === 'subtitles' || t.kind === 'captions' || !t.kind
          );
          if (raw.length > 0) {
            const subs = raw.map((st, idx) => ({
              id: idx,
              originalId: st.id || String(idx),
              label: normalizeSubtitleTrackLabel(
                { name: st.label, lang: st.language },
                idx
              ),
              lang: st.language,
            }));

            // Mesclar com legendas externas de activeServer.subtitles se existirem
            const externalSubs = (activeServer?.subtitles || []).map((ext, extIdx) => ({
              id: 1000 + extIdx,
              originalId: ext.id || `ext-${extIdx}`,
              label: ext.label || (ext.lang === 'por' || ext.lang === 'pt' ? 'Português [CC]' : (ext.lang || `Legenda Externa ${extIdx + 1}`)),
              lang: ext.lang || 'pt',
              url: ext.url,
              isExternal: true,
            }));

            const combined = [...subs];
            for (const ext of externalSubs) {
              if (!combined.some((c) => c.label.toLowerCase() === ext.label.toLowerCase())) {
                combined.push(ext);
              }
            }

            setSubtitleTracks(combined);
            subtitleTracksRef.current = combined;
            if (activeSubtitleTrackRef.current >= 0) {
              applySubtitleMode(activeSubtitleTrackRef.current, combined);
            }
          }
        }
      };

      const handleLoadedMetadata = () => {
        onPlaybackStarted();
        let tag = '';
        if (video.videoHeight > 0) {
          const vh = video.videoHeight;
          tag = vh >= 2160 ? '4K Ultra HD' : vh >= 1440 ? '1440p 2K' : vh >= 1080 ? '1080p Full HD' : vh >= 720 ? '720p HD' : `${vh}p`;
        }
        if (!tag) {
          if (activeServer?.quality?.includes('4K') || activeServer?.providerName?.includes('4K')) {
            tag = '4K Ultra HD';
          } else if (activeServer?.quality?.includes('1440') || activeServer?.quality?.includes('2K') || activeServer?.providerName?.includes('1440') || activeServer?.providerName?.includes('2K')) {
            tag = '1440p 2K';
          } else if (activeServer?.quality?.includes('720') || activeServer?.providerName?.includes('720')) {
            tag = '720p HD';
          } else {
            tag = '1080p Full HD';
          }
        }
        setCurrentPlayingResolution(tag);
        if (lastTime > 0) {
          video.currentTime = lastTime;
          lastTime = 0;
        }
        video.play().catch(() => setIsPlaying(false));

        updateSafariAudioTracks();
        updateSafariTextTracks();
      };

      setQualityLevels([]);

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('resize', handleLoadedMetadata);
      video.addEventListener('playing', handleLoadedMetadata);
      video.addEventListener('error', handleAutoFallback);

      if (video.audioTracks) {
        video.audioTracks.addEventListener('addtrack', updateSafariAudioTracks);
        video.audioTracks.addEventListener('change', updateSafariAudioTracks);
      }
      if (video.textTracks) {
        video.textTracks.addEventListener('addtrack', updateSafariTextTracks);
        video.textTracks.addEventListener('change', updateSafariTextTracks);
      }

      cleanupTextTrackListeners = () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('resize', handleLoadedMetadata);
        video.removeEventListener('playing', handleLoadedMetadata);
        video.removeEventListener('error', handleAutoFallback);
        if (video.audioTracks) {
          video.audioTracks.removeEventListener('addtrack', updateSafariAudioTracks);
          video.audioTracks.removeEventListener('change', updateSafariAudioTracks);
        }
        if (video.textTracks) {
          video.textTracks.removeEventListener('addtrack', updateSafariTextTracks);
          video.textTracks.removeEventListener('change', updateSafariTextTracks);
        }
      };
    } else if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 60,
        maxMaxBufferLength: 180,
        maxBufferSize: 350 * 1024 * 1024,
        maxBufferHole: 0.5,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 8,
        startFragPrefetch: true,
        renderTextTracksNatively: true,
        capLevelToPlayerSize: false,
        manifestLoadingTimeOut: 5000,
        levelLoadingTimeOut: 5000,
        fragLoadingTimeOut: 8000,
        abrEwmaDefaultEstimate: 50000000,
        abrBandwidthFactor: 0.95,
        abrBandwidthUpFactor: 0.9,
      });
      hlsRef.current = hls;

      hls.loadSource(currentUrl);
      hls.attachMedia(video);

      // Capturar métricas e latência diretamente dos eventos nativos do HLS (zero requisições paralelas, sem erro de CORS)
      hls.on(Hls.Events.MANIFEST_LOADED, (event, data) => {
        if (data?.stats?.loading) {
          const ttfbMs = Math.round(data.stats.loading.first - data.stats.loading.start);
          setDebugInfo((prev) => ({
            ...prev,
            ttfbMs: ttfbMs > 0 ? ttfbMs : 150,
          }));
        }
      });

      // Listener nos text tracks nativos do elemento de vídeo para garantir ativação e renderização
      const handleNativeTrackEvent = () => {
        if (activeSubtitleTrackRef.current >= 0) {
          applySubtitleMode(activeSubtitleTrackRef.current);
        }
      };
      if (video.textTracks) {
        video.textTracks.addEventListener('addtrack', handleNativeTrackEvent);
        video.textTracks.addEventListener('change', handleNativeTrackEvent);
        cleanupTextTrackListeners = () => {
          video.textTracks.removeEventListener('addtrack', handleNativeTrackEvent);
          video.textTracks.removeEventListener('change', handleNativeTrackEvent);
        };
      }

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        cancelWatchdog();
        setStreamError(null);
        setIsVideoBuffering(false);
        const manifestMs = Date.now() - debugStartedAt;
        console.info(`[Debug] 📋 Manifesto parseado: ${manifestMs}ms após início`);
        setDebugInfo((prev) => ({ ...prev, manifestMs, verdict: `⏳ Manifesto OK (${manifestMs}ms) — aguardando frames...` }));
        // Extrair níveis de resolução reais e ordenar (maior resolução primeiro)
        if (data.levels && data.levels.length > 0) {
          const sortedLevels = processHlsLevels(data.levels);
          setQualityLevels(sortedLevels);

          // SEMPRE PRIORIZAR A MÁXIMA QUALIDADE POSSÍVEL (4K Ultra HD > 1440p (2K) > 1080p Full HD > 720p HD):
          if (sortedLevels.length > 0) {
            const maxQualityLevel = sortedLevels[0]; // O 1º nível já é garantidamente o de maior resolução/bitrate
            hls.startLevel = maxQualityLevel.index;
            hls.nextLevel = maxQualityLevel.index;
            hls.loadLevel = maxQualityLevel.index;
            setCurrentPlayingResolution(maxQualityLevel.label);
          }
        }

        // SELEÇÃO E REGISTRO DE ÁUDIO AO PROCESSAR O MANIFESTO HLS
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          const tracks = hls.audioTracks.map((tr, idx) => ({
            id: idx,
            originalId: tr.id,
            label: normalizeAudioTrackLabel(tr, idx, hls.audioTracks),
            lang: tr.lang,
            name: tr.name,
          }));
          setAudioTracks(tracks);

          if (!userSelectedAudioRef.current) {
            const ptIdx = hls.audioTracks.findIndex((tr) => isPortugueseAudioTrack(tr));
            if (ptIdx >= 0) {
              if (hls.audioTrack !== ptIdx) {
                hls.audioTrack = ptIdx;
              }
              setActiveAudioTrack(ptIdx);
            }
          }
        }

        if (lastTime > 0) {
          video.currentTime = lastTime;
          lastTime = 0;
        }

        video.play().catch(() => setIsPlaying(false));
      });

      // Atualização contínua de níveis
      hls.on(Hls.Events.LEVELS_UPDATED, (event, data) => {
        if (data.levels && data.levels.length > 0) {
          const sortedLevels = processHlsLevels(data.levels);
          setQualityLevels(sortedLevels);
        }
      });

      // Rastrear faixas de áudio e focar ESTRITAMENTE em Português (Dublado)
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event, data) => {
        if (data.audioTracks && data.audioTracks.length > 0) {
          const tracks = data.audioTracks.map((tr, idx) => ({
            id: idx, // Índice no array hls.audioTracks para troca correta
            originalId: tr.id,
            label: normalizeAudioTrackLabel(tr, idx, data.audioTracks),
            lang: tr.lang,
            name: tr.name,
          }));
          setAudioTracks(tracks);

          // PRIORIZAÇÃO MÁXIMA ABSOLUTA DE ÁUDIO PT-BR (DUBLADO)
          if (!userSelectedAudioRef.current) {
            const ptIdx = data.audioTracks.findIndex((tr) => isPortugueseAudioTrack(tr));
            if (ptIdx >= 0) {
              if (hls.audioTrack !== ptIdx) {
                hls.audioTrack = ptIdx;
              }
              setActiveAudioTrack(ptIdx);
            } else {
              setActiveAudioTrack(hls.audioTrack >= 0 ? hls.audioTrack : 0);
            }
          } else {
            setActiveAudioTrack(hls.audioTrack >= 0 ? hls.audioTrack : 0);
          }
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (event, data) => {
        if (typeof data.id === 'number') {
          setActiveAudioTrack(data.id);
        }
      });

      // Rastrear legendas internas e externas e ativar visualização
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (event, data) => {
        if (data.subtitleTracks && data.subtitleTracks.length > 0) {
          const subs = data.subtitleTracks.map((st, idx) => ({
            id: idx,
            originalId: st.id,
            label: normalizeSubtitleTrackLabel(st, idx),
            lang: st.lang,
          }));

          // Mesclar com legendas externas de activeServer.subtitles se existirem
          const externalSubs = (activeServer?.subtitles || []).map((ext, extIdx) => ({
            id: 1000 + extIdx,
            originalId: ext.id || `ext-${extIdx}`,
            label: ext.label || (ext.lang === 'por' || ext.lang === 'pt' ? 'Português [CC]' : (ext.lang || `Legenda Externa ${extIdx + 1}`)),
            lang: ext.lang || 'pt',
            url: ext.url,
            isExternal: true,
          }));

          const combined = [...subs];
          for (const ext of externalSubs) {
            if (!combined.some((c) => c.label.toLowerCase() === ext.label.toLowerCase())) {
              combined.push(ext);
            }
          }

          setSubtitleTracks(combined);
          subtitleTracksRef.current = combined;
          if (activeSubtitleTrackRef.current >= 0) {
            hls.subtitleDisplay = true;
            hls.subtitleTrack = activeSubtitleTrackRef.current;
            applySubtitleMode(activeSubtitleTrackRef.current, combined);
          }
        }
      });

      hls.on(Hls.Events.SUBTITLE_TRACK_LOADED, () => {
        if (activeSubtitleTrackRef.current >= 0) {
          hls.subtitleDisplay = true;
          applySubtitleMode(activeSubtitleTrackRef.current);
        }
      });

      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (event, data) => {
        if (typeof data.id === 'number') {
          setActiveSubtitleTrack(data.id);
          activeSubtitleTrackRef.current = data.id;
          if (data.id >= 0) {
            hls.subtitleDisplay = true;
          }
          applySubtitleMode(data.id);
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        if (hls.levels && hls.levels[data.level]) {
          const lvl = hls.levels[data.level];
          let h = lvl.height || 0;
          if (!h) {
            const resStr = lvl.attrs?.RESOLUTION || lvl._attrs?.[0]?.RESOLUTION || '';
            if (typeof resStr === 'string' && resStr.includes('x')) {
              h = parseInt(resStr.split('x')[1], 10) || 0;
            }
          }
          if (!h && lvl.name) {
            const m = String(lvl.name).match(/(\d{3,4})p?/);
            if (m) h = parseInt(m[1], 10);
          }
          const tag = h >= 2160 ? '4K Ultra HD' : h >= 1440 ? '1440p 2K' : h >= 1080 ? '1080p Full HD' : h >= 720 ? '720p HD' : h >= 480 ? '480p' : h >= 360 ? '360p' : (h ? `${h}p` : '');
          if (tag) {
            setCurrentPlayingResolution(tag);
          }
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, () => {
        if (videoRef.current && videoRef.current.videoHeight > 0) {
          const vh = videoRef.current.videoHeight;
          const tag = vh >= 2160 ? '4K Ultra HD' : vh >= 1440 ? '1440p 2K' : vh >= 1080 ? '1080p Full HD' : vh >= 720 ? '720p HD' : `${vh}p`;
          setCurrentPlayingResolution(tag);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn('[VideoPlayer] Erro fatal HLS:', data.type, data.details);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Se o manifesto for inválido ou não parseável, alternar servidor imediatamente
              if (
                data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR ||
                data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
                data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT
              ) {
                console.warn('[VideoPlayer] Manifesto HLS inválido ou inacessível. Alternando para servidor reserva...');
                handleAutoFallbackRef.current();
              } else {
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              handleAutoFallbackRef.current();
              break;
          }
        } else if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          // Se houver qualquer micro-stall de sincronia de buffer, avança sutilmente para destravar
          if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.currentTime += 0.05;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && isHlsStream) {
      // Suporte Safari HLS nativo
      video.src = currentUrl;
      const handleMetadata = () => {
        onPlaybackStarted();
        let tag = '';
        if (video.videoHeight > 0) {
          const vh = video.videoHeight;
          tag = vh >= 2160 ? '4K Ultra HD' : vh >= 1440 ? '1440p 2K' : vh >= 1080 ? '1080p Full HD' : vh >= 720 ? '720p HD' : `${vh}p`;
        }
        if (!tag) {
          if (activeServer?.quality?.includes('4K') || activeServer?.providerName?.includes('4K')) {
            tag = '4K Ultra HD';
          } else if (activeServer?.quality?.includes('1440') || activeServer?.quality?.includes('2K') || activeServer?.providerName?.includes('1440') || activeServer?.providerName?.includes('2K')) {
            tag = '1440p 2K';
          } else if (activeServer?.quality?.includes('720') || activeServer?.providerName?.includes('720')) {
            tag = '720p HD';
          } else {
            tag = '1080p Full HD';
          }
        }
        setCurrentPlayingResolution(tag);
        if (lastTime > 0) {
          video.currentTime = lastTime;
          lastTime = 0;
        }
        video.play().catch(() => setIsPlaying(false));
      };
      video.addEventListener('loadedmetadata', handleMetadata);
      video.addEventListener('resize', handleMetadata);
      video.addEventListener('playing', handleMetadata);
      video.addEventListener('error', () => handleAutoFallbackRef.current());
    } else {
      // Reprodução direta MP4 / WebM
      setQualityLevels([]);

      video.src = currentUrl;
      video.load();
      let hasHandledData = false;
      const handleData = () => {
        if (hasHandledData) return;
        hasHandledData = true;
        onPlaybackStarted();
        let tag = '';
        if (video.videoHeight > 0) {
          const vh = video.videoHeight;
          tag = vh >= 2160 ? '4K Ultra HD' : vh >= 1440 ? '1440p 2K' : vh >= 1080 ? '1080p Full HD' : vh >= 720 ? '720p HD' : `${vh}p`;
        }
        if (!tag) {
          if (activeServer?.quality?.includes('4K') || activeServer?.providerName?.includes('4K')) {
            tag = '4K Ultra HD';
          } else if (activeServer?.quality?.includes('1440') || activeServer?.quality?.includes('2K') || activeServer?.providerName?.includes('1440') || activeServer?.providerName?.includes('2K')) {
            tag = '1440p 2K';
          } else if (activeServer?.quality?.includes('720') || activeServer?.providerName?.includes('720')) {
            tag = '720p HD';
          } else {
            tag = '1080p Full HD';
          }
        }
        setCurrentPlayingResolution(tag);
        if (lastTime > 0) {
          video.currentTime = lastTime;
          lastTime = 0;
        }
        video.play().catch(() => setIsPlaying(false));
      };

      const handleRealtimeResize = () => {
        if (video.videoHeight > 0) {
          const vh = video.videoHeight;
          const realTag = vh >= 2160 ? '4K Ultra HD' : vh >= 1440 ? '1440p 2K' : vh >= 1080 ? '1080p Full HD' : vh >= 720 ? '720p HD' : `${vh}p`;
          setCurrentPlayingResolution(realTag);
        }
      };

      const handleMp4Error = () => handleAutoFallbackRef.current();
      video.addEventListener('loadeddata', handleData, { once: true });
      video.addEventListener('canplay', handleData, { once: true });
      video.addEventListener('resize', handleRealtimeResize);
      video.addEventListener('playing', handleRealtimeResize);
      video.addEventListener('error', handleMp4Error);

      const prevCleanup = cleanupTextTrackListeners;
      cleanupTextTrackListeners = () => {
        if (prevCleanup) prevCleanup();
        video.removeEventListener('loadeddata', handleData);
        video.removeEventListener('canplay', handleData);
        video.removeEventListener('resize', handleRealtimeResize);
        video.removeEventListener('playing', handleRealtimeResize);
        video.removeEventListener('error', handleMp4Error);
      };
    }

    return () => {
      cancelWatchdog();
      video.removeEventListener('playing', onPlaybackStarted);
      video.removeEventListener('canplay', onPlaybackStarted);
      video.removeEventListener('loadeddata', onPlaybackStarted);
      video.removeEventListener('timeupdate', onPlaybackStarted);
      if (cleanupTextTrackListeners) {
        cleanupTextTrackListeners();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeServer, applySubtitleMode]);

  // Controle de ocultação automática dos controles
  // Fechar todos os modais abertos
  const closeAllModals = useCallback(() => {
    setServerModalOpen(false);
    setAudioSubModalOpen(false);
    setQualityModalOpen(false);
    setCastModalOpen(false);
    setEpisodesModalOpen(false);
  }, []);

  const isAnyModalOpen =
    serverModalOpen ||
    audioSubModalOpen ||
    qualityModalOpen ||
    castModalOpen ||
    episodesModalOpen;

  // Feedback visual de toque duplo (avanço / retrocesso)
  const [tapFeedback, setTapFeedback] = useState(null); // { type: 'rewind' | 'forward', id: number }
  const lastTapRef = useRef({ time: 0, x: 0 });

  // Controle de ocultação automática dos controles
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      if (
        isPlaying &&
        !serverModalOpen &&
        !audioSubModalOpen &&
        !qualityModalOpen &&
        !castModalOpen &&
        !episodesModalOpen
      ) {
        setShowControls(false);
      }
    }, 3500);
  }, [isPlaying, serverModalOpen, audioSubModalOpen, qualityModalOpen, castModalOpen, episodesModalOpen]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isPlaying, serverModalOpen, audioSubModalOpen, qualityModalOpen, castModalOpen, episodesModalOpen]);

  // Toque único no player: alterna a exibição dos controles (sem pausar bruscamente o vídeo)
  const handlePlayerTap = (e) => {
    if (e.target.closest('button, input, a, select, [role="button"], .modal-content')) return;

    if (isAnyModalOpen) {
      closeAllModals();
      return;
    }

    setShowControls((prev) => {
      const next = !prev;
      if (next) handleMouseMove();
      return next;
    });
  };

  // Gesto de Toque Duplo na tela para pular 10s no celular (esquerda -10s, direita +10s)
  const handleTouchEnd = (e) => {
    if (e.target.closest('button, input, a, select, [role="button"], .modal-content')) return;
    if (isAnyModalOpen) return;

    const now = Date.now();
    const touch = e.changedTouches?.[0];
    if (!touch) return;

    const rect = playerContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const width = rect.width;
    const timeDiff = now - lastTapRef.current.time;
    const distDiff = Math.abs(x - lastTapRef.current.x);

    // Se toque duplo (< 320ms e na mesma região)
    if (timeDiff < 320 && distDiff < 70) {
      if (x < width * 0.38) {
        skipTime(-10);
        setTapFeedback({ type: 'rewind', id: now });
        setTimeout(() => setTapFeedback((prev) => (prev?.id === now ? null : prev)), 750);
      } else if (x > width * 0.62) {
        skipTime(10);
        setTapFeedback({ type: 'forward', id: now });
        setTimeout(() => setTapFeedback((prev) => (prev?.id === now ? null : prev)), 750);
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x };
    }
  };

  // Controles de Vídeo Básicos
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
      handleMouseMove();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setDuration(videoRef.current.duration);
      }
      if (streamError && videoRef.current.currentTime > 0) {
        setStreamError(null);
      }
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
    }
    handleMouseMove();
  };

  const skipTime = (seconds) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration || 9999, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      handleMouseMove();
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
    }
    handleMouseMove();
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume || 0.85;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
      handleMouseMove();
    }
  };

  // Tela cheia otimizada para iOS (iPhone/iPad), Android e Desktop
  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    const video = videoRef.current;
    const isFs = Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      video?.webkitDisplayingFullscreen
    );

    if (!isFs) {
      if (container?.requestFullscreen) {
        container.requestFullscreen().catch(() => {
          if (video?.webkitEnterFullscreen) {
            video.webkitEnterFullscreen();
          }
        });
      } else if (container?.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (video?.webkitEnterFullscreen) {
        // Safari iOS nativo
        video.webkitEnterFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Sincronizar estado de tela cheia no iOS e desktop
  useEffect(() => {
    const video = videoRef.current;

    const handleFsChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      );
      setIsFullscreen(isFs);
    };

    const handleWebkitBegin = () => setIsFullscreen(true);
    const handleWebkitEnd = () => setIsFullscreen(false);

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);

    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleWebkitBegin);
      video.addEventListener('webkitendfullscreen', handleWebkitEnd);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', handleWebkitBegin);
        video.removeEventListener('webkitendfullscreen', handleWebkitEnd);
      }
    };
  }, []);

  // Troca de Servidor Manual
  const handleSelectServer = (idx) => {
    if (idx === activeServerIndex) return;
    userSelectedServerRef.current = true;
    failedServersRef.current.delete(idx);
    setActiveServerIndex(idx);
    setServerModalOpen(false);
    setSelectedQuality('auto');
    const srv = servers[idx];
    const initialDeclaredRes =
      srv?.quality?.includes('4K') || srv?.providerName?.includes('4K') ? '4K Ultra HD' :
      srv?.quality?.includes('1440') || srv?.quality?.includes('2K') || srv?.providerName?.includes('1440') || srv?.providerName?.includes('2K') ? '1440p 2K' :
      srv?.quality?.includes('1080') || srv?.providerName?.includes('1080') ? '1080p Full HD' :
      srv?.quality?.includes('720') || srv?.providerName?.includes('720') ? '720p HD' :
      '1080p Full HD';
    setCurrentPlayingResolution(initialDeclaredRes);
    triggerNotification(`Conectando a: ${servers[idx].providerName}`);
  };

  // Troca de Faixa de Áudio (Normalizado para Português / Inglês Original com troca suave)
  const handleSelectAudioTrack = (trackIndex) => {
    userSelectedAudioRef.current = true;
    if (hlsRef.current) {
      try {
        hlsRef.current.audioTrack = trackIndex;
        setActiveAudioTrack(trackIndex);
        const sel = audioTracks[trackIndex];
        if (sel) {
          triggerNotification(`Áudio: ${sel.label}`);
        }
        if (videoRef.current && isPlaying) {
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('[VideoPlayer] Falha ao alternar áudio:', err);
      }
    } else if (videoRef.current?.audioTracks && videoRef.current.audioTracks.length > 0) {
      try {
        const tracks = videoRef.current.audioTracks;
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].enabled = i === trackIndex;
        }
        setActiveAudioTrack(trackIndex);
        const sel = audioTracks[trackIndex];
        if (sel) {
          triggerNotification(`Áudio: ${sel.label}`);
        }
      } catch (err) {
        console.warn('[VideoPlayer] Falha ao alternar áudio nativo:', err);
      }
    }
  };

  // Troca de Legendas com ativação forçada de modo 'showing' e hls.subtitleDisplay
  const handleSelectSubtitleTrack = (trackId) => {
    userSelectedSubtitleRef.current = true;
    setActiveSubtitleTrack(trackId);
    activeSubtitleTrackRef.current = trackId;

    if (hlsRef.current) {
      if (trackId === -1) {
        hlsRef.current.subtitleDisplay = false;
        hlsRef.current.subtitleTrack = -1;
      } else if (trackId < 1000) {
        hlsRef.current.subtitleDisplay = true;
        hlsRef.current.subtitleTrack = trackId;
      } else {
        // Legenda externa VTT: desliga HLS interno para evitar conflito
        hlsRef.current.subtitleDisplay = false;
        hlsRef.current.subtitleTrack = -1;
      }
    }

    applySubtitleMode(trackId);
    const sel = subtitleTracks.find((s) => s.id === trackId);
    triggerNotification(trackId === -1 ? 'Legendas desativadas' : `Legendas: ${sel?.label || 'Ativada'}`);
  };

  // Auto-ativar legendas em Português se o servidor ativo for em Áudio Original (Inglês)
  useEffect(() => {
    if (!isCurrentDub && subtitleTracks.length > 0 && activeSubtitleTrack === -1 && !userSelectedSubtitleRef.current) {
      const ptSub = subtitleTracks.find(
        (s) =>
          s.lang === 'pt-BR' ||
          s.lang === 'pt' ||
          s.lang === 'pob' ||
          (s.label || '').toLowerCase().includes('português') ||
          (s.label || '').toLowerCase().includes('brasil')
      );
      if (ptSub) {
        handleSelectSubtitleTrack(ptSub.id);
      }
    }
  }, [isCurrentDub, subtitleTracks, activeSubtitleTrack]);

  // Troca de Qualidade
  const handleSelectQuality = (key) => {
    setSelectedQuality(key);
    setQualityModalOpen(false);

    if (!hlsRef.current) {
      triggerNotification(`Qualidade definida para: ${key.toUpperCase()}`);
      return;
    }

    const hls = hlsRef.current;

    if (key === 'auto') {
      // Usar nextLevel para evitar esvaziar o buffer de vídeo e congelar a tela
      hls.nextLevel = -1;
      triggerNotification('Qualidade: Automático (Adaptativo)');
      return;
    }

    if (hls.levels && hls.levels.length > 0) {
      let targetHeight = 1080;
      if (key === '4k') targetHeight = 2160;
      else if (key === '1080p') targetHeight = 1080;
      else if (key === '720p') targetHeight = 720;
      else if (key === '480p') targetHeight = 480;
      else if (key === '360p') targetHeight = 360;

      let matchedIndex = -1;
      let minDiff = Infinity;

      hls.levels.forEach((lvl, idx) => {
        let h = lvl.height || 0;
        if (!h) {
          const resStr = lvl.attrs?.RESOLUTION || lvl._attrs?.[0]?.RESOLUTION || '';
          if (typeof resStr === 'string' && resStr.includes('x')) {
            h = parseInt(resStr.split('x')[1], 10) || 0;
          }
        }
        if (!h && lvl.name) {
          const m = String(lvl.name).match(/(\d{3,4})p?/);
          if (m) h = parseInt(m[1], 10);
        }
        if (!h && lvl.url) {
          const uStr = Array.isArray(lvl.url) ? lvl.url.join(' ') : String(lvl.url);
          const uMatch = uStr.match(/(?:_|\/|-)(\d{3,4})x(\d{3,4})|(?:_|\/|-)(\d{3,4})p/i);
          if (uMatch) h = parseInt(uMatch[2] || uMatch[3], 10);
        }

        const diff = Math.abs((h || 720) - targetHeight);
        // Tolerância de até 100px para emparelhar com a resolução solicitada
        if (diff <= 100 && diff < minDiff) {
          minDiff = diff;
          matchedIndex = idx;
        }
      });

      if (matchedIndex !== -1) {
        hls.nextLevel = matchedIndex;
        hls.loadLevel = matchedIndex;
        const chosenLvl = hls.levels[matchedIndex];
        const h = chosenLvl.height || targetHeight;
        const label = h >= 2160 ? '4K Ultra HD' : h >= 1080 ? '1080p Full HD' : `${h}p HD`;
        setCurrentPlayingResolution(label);
        triggerNotification(`Qualidade definida para: ${label}`);
        return;
      } else {
        // Se a resolução não existir neste stream, não troca falsamente
        const maxLevelHeight = Math.max(...hls.levels.map((l) => l.height || 0), 720);
        triggerNotification(`${key.toUpperCase()} indisponível neste servidor (máx: ${maxLevelHeight}p). Troque para outro servidor.`);
        return;
      }
    }

    triggerNotification(`Qualidade definida: ${key.toUpperCase()}`);
  };

  // Transmissão para TV (Cast / AirPlay / Screen Mirroring)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 1. W3C Remote Playback API (Chromium, Google Chrome, Edge, Android, Brave)
    if (video.remote) {
      const handleConnect = () => {
        setIsCasting(true);
        triggerNotification('Transmitindo para a TV');
      };
      const handleConnecting = () => {
        triggerNotification('Conectando à TV...');
      };
      const handleDisconnect = () => {
        setIsCasting(false);
        triggerNotification('Transmissão na TV desconectada');
      };

      video.remote.addEventListener('connect', handleConnect);
      video.remote.addEventListener('connecting', handleConnecting);
      video.remote.addEventListener('disconnect', handleDisconnect);

      if (video.remote.state === 'connected') {
        setIsCasting(true);
      }

      return () => {
        video.remote.removeEventListener('connect', handleConnect);
        video.remote.removeEventListener('connecting', handleConnecting);
        video.remote.removeEventListener('disconnect', handleDisconnect);
      };
    }

    // 2. WebKit AirPlay API (Apple Safari iOS / iPadOS / macOS)
    const handleAirPlayTargetAvailability = (event) => {
      setAirPlayAvailable(event.availability === 'available');
    };

    const handleAirPlayChange = () => {
      const isWireless = Boolean(video.webkitCurrentPlaybackTargetIsWireless);
      setIsCasting(isWireless);
      if (isWireless) {
        // Se conectou ao AirPlay da TV e ainda estivesse rodando Hls.js em blob:
        if (hlsRef.current && activeServer?.url) {
          try {
            const curTime = video.currentTime;
            const wasPlaying = !video.paused;
            hlsRef.current.destroy();
            hlsRef.current = null;
            video.src = activeServer.url;
            video.currentTime = curTime;
            if (wasPlaying) video.play().catch(() => {});
          } catch (e) {
            console.warn('Erro ao alternar stream para AirPlay:', e);
          }
        }
        triggerNotification('Transmitindo vídeo e áudio via AirPlay para TV');
      } else {
        triggerNotification('Transmissão AirPlay encerrada');
      }
    };

    video.addEventListener('webkitplaybacktargetavailabilitychanged', handleAirPlayTargetAvailability);
    video.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', handleAirPlayChange);
    return () => {
      video.removeEventListener('webkitplaybacktargetavailabilitychanged', handleAirPlayTargetAvailability);
      video.removeEventListener('webkitcurrentplaybacktargetiswirelesschanged', handleAirPlayChange);
    };
  }, [triggerNotification, activeServer]);

  // Disparo 100% Nativo e Síncrono para WebKit AirPlay (iPhone, iPad, Mac)
  const handleTriggerAirPlay = () => {
    const video = videoRef.current;
    if (!video) return;

    // Se estiver rodando via Hls.js (blob:), migra para stream nativo direto antes do AirPlay:
    // Evita o erro onde a LG TV só recebe áudio porque não consegue ler blobs da memória do iPhone
    if (hlsRef.current && activeServer?.url) {
      try {
        const curTime = video.currentTime;
        const wasPlaying = !video.paused;
        hlsRef.current.destroy();
        hlsRef.current = null;
        video.src = activeServer.url;
        video.currentTime = curTime;
        if (wasPlaying) {
          video.play().catch(() => {});
        }
      } catch (err) {
        console.warn('[VideoPlayer] Falha ao alternar para stream nativo para AirPlay:', err);
      }
    }

    if (typeof video.webkitShowPlaybackTargetPicker === 'function') {
      try {
        video.webkitShowPlaybackTargetPicker();
      } catch (err) {
        console.warn('[VideoPlayer] Erro no seletor AirPlay:', err);
        triggerNotification('Não foi possível abrir o seletor do AirPlay.');
      }
    } else {
      triggerNotification('AirPlay disponível em dispositivos Apple (Safari no iPhone, iPad ou Mac).');
    }
  };

  // Iniciar Transmissão para Smart TV / Chromecast / AirPlay
  const handleTriggerCast = async () => {
    const video = videoRef.current;
    if (!video) return;

    const isApple = typeof window !== 'undefined' && (/iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent) || Boolean(window.WebKitPlaybackTargetAvailabilityEvent));

    // Se for dispositivo Apple (iPhone, iPad, Mac), abre o AirPlay de forma síncrona
    if (isApple && typeof video.webkitShowPlaybackTargetPicker === 'function') {
      handleTriggerAirPlay();
      return;
    }

    // Chrome, Edge, Android (Remote Playback API)
    if (video.remote && typeof video.remote.prompt === 'function') {
      try {
        await video.remote.prompt();
        return;
      } catch (err) {
        if (err.name !== 'NotFoundError' && err.name !== 'NotAllowedError') {
          console.warn('Remote playback prompt error:', err);
        }
      }
    }

    // Safari AirPlay Fallback
    if (typeof video.webkitShowPlaybackTargetPicker === 'function') {
      handleTriggerAirPlay();
      return;
    }

    // Se o navegador não der suporte nativo direto
    triggerNotification('Selecione "Espelhar Tela" abaixo ou utilize o Google Chrome.');
  };

  // Espelhamento de Tela / Aba (Miracast ou monitor sem fio)
  const handleScreenMirror = async () => {
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true,
        });
        setIsCasting(true);
        triggerNotification('Espelhamento iniciado! Selecione sua TV.');
        setCastModalOpen(false);

        const track = stream.getVideoTracks()[0];
        if (track) {
          track.onended = () => {
            setIsCasting(false);
            triggerNotification('Espelhamento de tela encerrado');
          };
        }
      } catch (err) {
        if (err.name !== 'NotAllowedError') {
          console.warn('Screen share error:', err);
        }
      }
    } else {
      triggerNotification('Espelhamento não suportado neste navegador.');
    }
  };

  // Parar Transmissão
  const handleStopCast = () => {
    const video = videoRef.current;
    if (video?.remote && typeof video.remote.prompt === 'function') {
      video.remote.prompt().catch(() => {});
    }
    setIsCasting(false);
    triggerNotification('Transmissão encerrada');
  };

  // Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar se o foco estiver em um input
      if (['input', 'textarea'].includes(e.target.tagName.toLowerCase())) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipTime(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipTime(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (videoRef.current) {
            const nextVol = Math.min(1, volume + 0.1);
            setVolume(nextVol);
            videoRef.current.volume = nextVol;
            setIsMuted(false);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (videoRef.current) {
            const nextVol = Math.max(0, volume - 0.1);
            setVolume(nextVol);
            videoRef.current.volume = nextVol;
            setIsMuted(nextVol === 0);
          }
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'Escape':
          if (serverModalOpen || audioSubModalOpen || qualityModalOpen || castModalOpen) {
            setServerModalOpen(false);
            setAudioSubModalOpen(false);
            setQualityModalOpen(false);
            setCastModalOpen(false);
          } else {
            onClose();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isPlaying, serverModalOpen, audioSubModalOpen, qualityModalOpen, castModalOpen, onClose]);

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
      onTouchEnd={handleTouchEnd}
      onClick={handlePlayerTap}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden touch-manipulation"
    >
      {/* Cinema Ambient Glow (Efeito Exclusivo VIP) */}
      {ambientGlow && (
        <div className="absolute inset-0 pointer-events-none scale-105 blur-3xl opacity-35 transition-opacity duration-1000 bg-gradient-to-r from-sky-600/30 via-blue-600/20 to-sky-600/30 -z-10" />
      )}

      {/* Elemento HTML5 Video com Renderizador Próprio ou Embed Iframe */}
      {isIframeMode ? (
        <div className="relative w-full h-full bg-black flex flex-col">
          {/* Barra Superior do Modo Iframe / Embed Player */}
          <div className="absolute top-0 inset-x-0 z-50 p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white flex items-center gap-2 border border-white/20 shadow-2xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                title="Voltar ao Catálogo"
              >
                <ArrowLeft size={16} className="text-sky-400" />
                <span className="text-xs font-semibold">{media?.title || 'Voltar'}</span>
              </button>

              {activeServer?.isLive ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold shadow-lg backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  AO VIVO
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-bold shadow-lg backdrop-blur-sm">
                  <Film size={12} />
                  EMBED PLAYER
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {servers.length > 1 && (
                <button
                  onClick={() => setServerModalOpen(true)}
                  className="px-3.5 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white flex items-center gap-1.5 border border-white/20 shadow-xl backdrop-blur-md text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                  title="Trocar Servidor"
                >
                  <Server size={14} className="text-sky-400" />
                  <span>Servidores ({servers.length})</span>
                </button>
              )}
            </div>
          </div>

          <iframe
            src={activeServer.url}
            allow="autoplay *; encrypted-media *; picture-in-picture *; fullscreen *; clipboard-write *"
            allowFullScreen
            className="w-full h-full border-0 bg-black pt-0"
            title={media?.title || 'Player'}
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          preload="auto"
          playsInline
          webkit-playsinline="true"
          x-webkit-airplay="allow"
          airplay="allow"
          disableRemotePlayback={false}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
          onWaiting={() => {
            const vid = videoRef.current;
            if (vid && vid.readyState < 3) {
              setIsVideoBuffering(true);
            }
          }}
          onCanPlay={() => {
            setIsVideoBuffering(false);
          }}
          onPlaying={() => {
            setIsVideoBuffering(false);
            setIsPlaying(true);
            setStreamError(null);
            failedServersRef.current.clear();
          }}
          onPause={() => setIsPlaying(false)}
          onDoubleClick={toggleFullscreen}
          className="w-full h-full object-contain bg-black"
        >
          {subtitleTracks.filter((s) => s.isExternal || s.url).map((sub, idx) => (
            <track
              key={`ext-sub-${sub.id || idx}-${sub.url}`}
              kind="subtitles"
              src={sub.url}
              srcLang={sub.lang || 'pt'}
              label={sub.label || `Legenda ${idx + 1}`}
              default={false}
            />
          ))}
        </video>
      )}

      {/* ════ Painel de Debug de Rede (Botão "Rede" ou Ctrl+D para abrir/fechar) ════ */}
      {showDebug && (
        <div className="absolute top-4 right-4 z-[999] w-88 max-w-[calc(100vw-2rem)] bg-slate-950/95 border border-sky-500/40 rounded-2xl p-4 text-xs font-mono backdrop-blur-md shadow-2xl select-text max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-sky-400 animate-pulse" />
              <span className="text-sky-400 font-bold text-sm">Diagnóstico de Rede</span>
            </div>
            <button
              onClick={() => setShowDebug(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Card: De quem é o tráfego? (PC vs Servidor) */}
          {(() => {
            const currentStreamUrl = debugInfo.serverUrl || activeServer?.url || '';
            const isLocalProxy = currentStreamUrl.includes('/api/proxy');

            return (
              <div className={`mb-3 p-3 rounded-xl border ${
                isLocalProxy
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              }`}>
                <div className="font-bold flex items-center gap-1.5 mb-1 text-[11px]">
                  {isLocalProxy ? '⚠️ Rota: PROXY DO SEU PC (/api/proxy)' : '🌐 Rota: CDN DIRETA DO SERVIDOR'}
                </div>
                <p className="text-[10px] leading-relaxed text-slate-300">
                  {isLocalProxy
                    ? 'Como o site está no seu PC, os vídeos passam pelo seu Node.js e USAM O UPLOAD DA SUA INTERNET RESIDENCIAL. Em streams 4K (25-50 Mbps), seu upload pode engasgar.'
                    : 'O tráfego de vídeo é baixado DIRETO da nuvem do provedor até o navegador. NÃO gasta o upload do seu PC!'}
                </p>
              </div>
            );
          })()}

          {/* Veredito */}
          <div className="mb-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] leading-snug">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold mb-0.5">Status Atual</span>
            {debugInfo.verdict || '⏳ Aguardando dados...'}
          </div>

          <div className="space-y-1.5 bg-black/40 p-2.5 rounded-xl border border-white/5">
            {/* TTFB */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">TTFB (1º byte do servidor)</span>
              <span className={debugInfo.ttfbMs === null ? 'text-slate-500' : debugInfo.ttfbMs < 0 ? 'text-yellow-400' : debugInfo.ttfbMs > 5000 ? 'text-rose-400 font-bold' : debugInfo.ttfbMs > 2000 ? 'text-yellow-400' : 'text-emerald-400'}>
                {debugInfo.ttfbMs === null ? '...' : debugInfo.ttfbMs < 0 ? 'N/A (CORS)' : `${debugInfo.ttfbMs}ms`}
              </span>
            </div>

            {/* Manifesto */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Manifesto HLS</span>
              <span className={debugInfo.manifestMs === null ? 'text-slate-500' : debugInfo.manifestMs > 10000 ? 'text-rose-400 font-bold' : debugInfo.manifestMs > 4000 ? 'text-yellow-400' : 'text-emerald-400'}>
                {debugInfo.manifestMs === null ? '...' : `${debugInfo.manifestMs}ms`}
              </span>
            </div>

            {/* Primeiro frame */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Primeiro frame na tela</span>
              <span className={debugInfo.firstFrameMs === null ? 'text-slate-500' : debugInfo.firstFrameMs > 15000 ? 'text-rose-400 font-bold' : debugInfo.firstFrameMs > 6000 ? 'text-yellow-400' : 'text-emerald-400 font-bold'}>
                {debugInfo.firstFrameMs === null ? '...' : `${debugInfo.firstFrameMs}ms`}
              </span>
            </div>

            {/* Bandwidth HLS */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Velocidade estimada (HLS)</span>
              <span className={!debugInfo.bandwidth ? 'text-slate-500' : 'text-sky-400 font-bold'}>
                {debugInfo.bandwidth || 'N/A'}
              </span>
            </div>

            {/* Buffer */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Buffer carregado</span>
              <span className={!debugInfo.bufferLen ? 'text-slate-500' : parseFloat(debugInfo.bufferLen) < 1 ? 'text-rose-400 font-bold' : parseFloat(debugInfo.bufferLen) < 3 ? 'text-yellow-400' : 'text-emerald-400 font-bold'}>
                {debugInfo.bufferLen || '...'}
              </span>
            </div>

            {/* Frames dropados */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Frames perdidos / total</span>
              <span className="text-slate-300">{debugInfo.droppedFrames || '...'}</span>
            </div>

            {/* readyState */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">readyState do player</span>
              <span className="text-slate-300 text-[10px]">{debugInfo.readyState || '...'}</span>
            </div>

            {/* networkState */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">networkState</span>
              <span className={debugInfo.networkState === 'LOADING' ? 'text-sky-400 animate-pulse' : 'text-slate-300 text-[10px]'}>
                {debugInfo.networkState || '...'}
              </span>
            </div>
          </div>

          {/* Servidor Ativo */}
          <div className="mt-3 pt-2 border-t border-white/10">
            <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-0.5">Servidor Ativo</span>
            <span className="text-sky-300 font-semibold block text-[11px] truncate">
              {activeServer?.providerName || 'Nenhum'}
            </span>
          </div>

          {/* URL */}
          <div className="mt-2 pt-2 border-t border-white/5">
            <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-0.5">URL da Fonte</span>
            <span className="text-slate-400 break-all text-[9px] leading-tight block select-all">
              {debugInfo.serverUrl || activeServer?.url || '—'}
            </span>
          </div>

          <div className="mt-3 text-slate-500 text-[9px] text-center">Atalho: Ctrl+D para abrir/fechar</div>
        </div>
      )}

      {/* Indicadores Visuais de Toque Duplo (Avanço / Retrocesso no Celular) */}
      {!isIframeMode && tapFeedback && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center w-24 h-24 rounded-full bg-sky-500/20 text-sky-400 border border-sky-400/40 backdrop-blur-sm animate-scale-in ${
            tapFeedback.type === 'rewind' ? 'left-8 sm:left-24' : 'right-8 sm:right-24'
          }`}
        >
          {tapFeedback.type === 'rewind' ? (
            <>
              <RotateCcw size={32} className="animate-pulse" />
              <span className="text-xs font-bold mt-1">-10s</span>
            </>
          ) : (
            <>
              <RotateCw size={32} className="animate-pulse" />
              <span className="text-xs font-bold mt-1">+10s</span>
            </>
          )}
        </div>
      )}

      {/* Spinner de Carregamento & Extração */}
      {(isExtracting || isVideoBuffering) && !streamError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs pointer-events-none transition-all">
          <div className="relative flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full border-4 border-sky-400/20 border-t-sky-400 animate-spin" />
            <Radio size={24} className="absolute text-sky-400 animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-white tracking-wide drop-shadow">
            {isExtracting ? extractionStatus : 'Carregando transmissão...'}
          </p>
          {activeServer && (
            <p className="text-xs text-sky-400/80 mt-1">
              {activeServer.providerName}
            </p>
          )}
        </div>
      )}

      {/* Notificação Toast Flutuante */}
      {notification && (
        <div className="absolute top-20 z-40 bg-sky-500/90 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
          <Radio size={14} className="animate-pulse" />
          {notification}
        </div>
      )}

      {/* Tela de Erro / Título Indisponível */}
      {streamError && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-4 sm:p-6 text-center animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && videoRef.current && (videoRef.current.currentTime > 0 || videoRef.current.readyState >= 1)) {
              setStreamError(null);
            }
          }}
        >
          <div className="relative max-w-md w-full bg-[#0d121c]/95 border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center">
            {/* Botão Fechar no Canto Superior Direito (Permite fechar pelo celular a qualquer momento!) */}
            <button
              onClick={() => {
                setStreamError(null);
                setIsVideoBuffering(false);
                if (videoRef.current && videoRef.current.paused && videoRef.current.readyState >= 2) {
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer z-10"
              title="Fechar mensagem"
            >
              <X size={18} />
            </button>

            {/* Ícone de Destaque */}
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-400/20 text-sky-400 flex items-center justify-center mb-4 shadow-lg shadow-sky-500/5">
              <Film size={32} className="text-sky-400" />
            </div>

            {/* Título Conforme Pedido do Usuário */}
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-2">
              {streamError.toLowerCase().includes('ainda não temos')
                ? (isSeries ? 'Ainda não temos este episódio' : 'Ainda não temos este filme')
                : 'Instabilidade na Transmissão'}
            </h3>

            {/* Descrição Explicativa */}
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mb-6">
              {streamError.toLowerCase().includes('ainda não temos')
                ? 'Nossos servidores tentaram conectar 3 vezes às fontes disponíveis, mas nenhuma transmissão estável foi encontrada no momento.'
                : streamError}
            </p>

            {/* Se o vídeo começou a tocar no fundo, botão de destaque para continuar assistindo! */}
            {videoRef.current && (videoRef.current.currentTime > 0 || !videoRef.current.paused || videoRef.current.readyState >= 2) && (
              <button
                onClick={() => {
                  setStreamError(null);
                  setIsVideoBuffering(false);
                  videoRef.current?.play().catch(() => {});
                }}
                className="w-full py-3 px-4 mb-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 animate-pulse"
              >
                <Play size={16} className="fill-current" />
                <span>Continuar Assistindo Transmissão</span>
              </button>
            )}

            {/* Ações */}
            <div className="w-full space-y-2.5">
              {/* Botão 1: Tentar Novamente */}
              <button
                onClick={handleRetryExtraction}
                className="w-full py-3 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs sm:text-sm font-bold transition-all shadow-lg shadow-sky-400/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <RotateCcw size={16} />
                <span>Tentar Novamente (3 tentativas)</span>
              </button>

              {/* Botão 2: Pedir no Telegram */}
              <a
                href="https://t.me/+MIU924pI1MoyYTRk"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/35 text-[#229ED9] hover:text-[#55bcee] text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Send size={16} />
                <span>Pedir este título no Telegram</span>
              </a>

              {/* Botão 3: Voltar ao Catálogo */}
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/[0.08] text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <ArrowLeft size={16} />
                <span>Voltar ao Catálogo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls Overlay com suporte à safe-area e notch */}
      {!isIframeMode && (
        <div
          className={`absolute top-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-b from-black/95 via-black/60 to-transparent flex items-center justify-between transition-opacity duration-300 z-40 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={onClose}
              className="w-10 h-10 min-w-[40px] rounded-full bg-slate-900/90 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-700/80 transition-colors shadow-lg cursor-pointer shrink-0"
              aria-label="Voltar ao catálogo"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight drop-shadow truncate max-w-[200px] sm:max-w-md md:max-w-lg">
                  {media?.title}
                </h2>
                {activeServer?.isLive && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    AO VIVO
                  </span>
                )}
              </div>
              {isSeries && (
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    onClick={() => {
                      const next = !episodesModalOpen;
                      closeAllModals();
                      setEpisodesModalOpen(next);
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 text-sky-300 hover:text-white border border-sky-400/40 text-[11px] font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm shrink-0"
                    title="Mudar Episódio Diretamente no Player"
                  >
                    <Layers size={12} className="text-sky-400" />
                    <span>Episódios</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ferramentas VIP no Topo: Download MP4, Dolby Boost, Ambient Glow & Status VIP */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Botão Iluminação Ambient Glow */}
            <button
              type="button"
              onClick={() => setAmbientGlow(!ambientGlow)}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                ambientGlow
                  ? 'bg-sky-500/25 border-sky-400 text-sky-300 shadow-md shadow-sky-500/20'
                  : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white'
              }`}
              title={ambientGlow ? "Desativar Cinema Ambient Glow" : "Ativar Cinema Ambient Glow (Iluminação Imersiva)"}
            >
              <Sparkles size={15} className={ambientGlow ? "text-sky-400" : ""} />
            </button>

            {/* Botão Dolby Audio Booster (+150%) */}
            <button
              type="button"
              onClick={() => {
                if (!isVip) {
                  onOpenSubscription?.();
                  return;
                }
                setDolbyBoost(!dolbyBoost);
                if (!dolbyBoost && videoRef.current) {
                  videoRef.current.volume = 1;
                }
              }}
              className={`px-2.5 py-1.5 rounded-full border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                dolbyBoost
                  ? 'bg-purple-500/25 border-purple-400 text-purple-300 shadow-md shadow-purple-500/25'
                  : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white'
              }`}
              title={isVip ? (dolbyBoost ? "Dolby Audio Booster Ativo (+150%)" : "Ativar Dolby Sound Booster") : "Dolby Audio Booster (Exclusivo VIP)"}
            >
              <Volume2 size={13} className={dolbyBoost ? "text-purple-400" : isVip ? "text-slate-300" : "text-slate-400"} />
              <span className="hidden sm:inline text-[11px]">{dolbyBoost ? "Dolby +150%" : "Dolby"}</span>
              {!isVip && (
                <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300 font-extrabold uppercase">
                  VIP
                </span>
              )}
            </button>

            {/* Botão Download Offline MP4 */}
            <button
              type="button"
              onClick={() => {
                if (isVip) {
                  alert(`Iniciando download MP4 em alta velocidade de "${media?.title}". O vídeo será transferido sem anúncios.`);
                } else {
                  onOpenSubscription?.();
                }
              }}
              className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                isVip
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white'
              }`}
              title={isVip ? "Baixar MP4 para assistir offline" : "Download Offline exclusivo para membros VIP"}
            >
              <Download size={13} className={isVip ? "text-amber-400" : "text-sky-400"} />
              <span className="hidden md:inline text-[11px]">Download</span>
              <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300 font-extrabold uppercase flex items-center gap-0.5">
                <Crown size={9} className="fill-amber-400" /> VIP
              </span>
            </button>

            {/* Badge de Status VIP ou Botão Assinar VIP */}
            {isVip ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black shadow-lg">
                <Crown size={13} className="fill-amber-400 text-amber-400" />
                <span className="hidden sm:inline text-[11px]">VIP Diamante</span>
                <span className="text-[10px] text-amber-200/80 font-normal hidden lg:inline">· 100% Sem Anúncios</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenSubscription?.()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-sky-500/20 via-blue-500/20 to-sky-500/20 hover:from-sky-500/30 hover:to-blue-500/30 border border-sky-400/40 backdrop-blur-md text-sky-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-md group"
                title="Assine com MB WAY ou Cripto para remover todos os anúncios e assistir em 4K"
              >
                <Crown size={13} className="text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px]">Assinar VIP</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Controles Centrais Touch (Play/Pause e Pular 10s) */}
      {!isIframeMode && !activeServer?.isLive && (
        <div
          className={`absolute z-20 flex items-center gap-6 sm:gap-10 transition-all duration-200 ${
            showControls && !isVideoBuffering && !isExtracting
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-75 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botão Pular -10s */}
          <button
            onClick={() => skipTime(-10)}
            className="w-12 h-12 rounded-full bg-black/65 hover:bg-black/85 text-white flex flex-col items-center justify-center border border-white/15 backdrop-blur-md active:scale-90 transition-all cursor-pointer shadow-xl"
            title="Voltar 10 segundos"
          >
            <RotateCcw size={20} />
            <span className="text-[9px] font-bold text-sky-400 -mt-0.5">10s</span>
          </button>

          {/* Botão Central de Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sky-400 hover:bg-sky-300 text-slate-950 flex items-center justify-center shadow-2xl active:scale-95 transition-all cursor-pointer"
            aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? (
              <Pause size={30} className="fill-slate-950" />
            ) : (
              <Play size={30} className="fill-slate-950 ml-1" />
            )}
          </button>

          {/* Botão Pular +10s */}
          <button
            onClick={() => skipTime(10)}
            className="w-12 h-12 rounded-full bg-black/65 hover:bg-black/85 text-white flex flex-col items-center justify-center border border-white/15 backdrop-blur-md active:scale-90 transition-all cursor-pointer shadow-xl"
            title="Avançar 10 segundos"
          >
            <RotateCw size={20} />
            <span className="text-[9px] font-bold text-sky-400 -mt-0.5">10s</span>
          </button>
        </div>
      )}

      {/* Bottom Controls Bar — Otimizada para Celular e Desktop */}
      {!isIframeMode && (
        <div
          className={`absolute bottom-0 left-0 right-0 px-3 pt-6 pb-4 sm:px-6 sm:pb-6 bg-gradient-to-t from-black/98 via-black/85 to-transparent space-y-2 sm:space-y-3 transition-opacity duration-300 z-30 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Linha 1: Barra de Progresso ou Badge de Ao Vivo */}
          {activeServer?.isLive ? (
            <div className="flex items-center justify-between py-1 px-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  AO VIVO
                </span>
                <span className="text-xs text-slate-300 font-medium truncate max-w-[200px] sm:max-w-md">
                  {activeServer.providerName || media?.title}
                </span>
              </div>
              <span className="text-[11px] font-mono text-sky-400 font-semibold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-400/20">
                1080p Full HD
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Tempo decorrido no Mobile */}
                <span className="text-[11px] font-mono text-slate-300 tabular-nums shrink-0 sm:hidden">
                  {formatTime(currentTime)}
                </span>

                {/* Timeline range slider */}
                <div className="relative flex-1 flex items-center group py-2">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 sm:h-1 bg-slate-700/80 rounded-full cursor-pointer accent-sky-400 appearance-none group-hover:h-2 transition-all"
                    style={{
                      background: `linear-gradient(to right, #38bdf8 ${(currentTime / (duration || 1)) * 100}%, #334155 ${(currentTime / (duration || 1)) * 100}%)`,
                    }}
                  />
                </div>

                {/* Tempo total no Mobile */}
                <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0 sm:hidden">
                  {formatTime(duration)}
                </span>
              </div>
            </div>
          )}

          {/* Linha 2: Botões de Ação (Com layout sem vazamento para celular) */}
          <div className="flex items-center justify-between text-white gap-2">
            {/* Lado Esquerdo: Play/Pause, Episódios (Série), Volume, Tempo Desktop */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <button
                onClick={togglePlay}
                className="text-white hover:text-sky-400 transition-colors p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} className="fill-white ml-0.5" />}
              </button>

              {!activeServer?.isLive && (
                <>
                  {/* Botões -10s e +10s visíveis apenas em desktop (já estão no centro no mobile) */}
                  <button
                    onClick={() => skipTime(-10)}
                    className="hidden sm:flex text-slate-300 hover:text-white transition-colors p-1.5 cursor-pointer"
                    title="Voltar 10s"
                  >
                    <RotateCcw size={18} />
                  </button>

                  <button
                    onClick={() => skipTime(10)}
                    className="hidden sm:flex text-slate-300 hover:text-white transition-colors p-1.5 cursor-pointer"
                    title="Avançar 10s"
                  >
                    <RotateCw size={18} />
                  </button>
                </>
              )}

              {/* Navegação Rápida entre Episódios */}
              {isSeries && (
                <div className="flex items-center gap-0.5 border-l border-slate-700/80 pl-1.5 sm:pl-2">
                  <button
                    onClick={handlePrevEpisode}
                    disabled={!hasPrevEpisode}
                    className="text-slate-300 hover:text-sky-400 disabled:opacity-25 disabled:hover:text-slate-300 transition-colors p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                    title="Episódio Anterior"
                  >
                    <SkipBack size={17} />
                  </button>
                  <button
                    onClick={handleNextEpisode}
                    disabled={!hasNextEpisode}
                    className="text-slate-300 hover:text-sky-400 disabled:opacity-25 disabled:hover:text-slate-300 transition-colors p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                    title="Próximo Episódio"
                  >
                    <SkipForward size={17} />
                  </button>
                </div>
              )}

              {/* Volume / Mute */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleMute}
                  className="text-slate-300 hover:text-white transition-colors p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                  title={isMuted ? 'Desmutar' : 'Mutar'}
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} className="text-rose-400" /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="hidden sm:block w-16 sm:w-20 h-1 bg-slate-700 rounded-full accent-sky-400 cursor-pointer"
                />
              </div>

              {/* Tempo no Desktop (apenas Filmes / Séries) */}
              {!activeServer?.isLive && (
                <span className="text-xs font-mono text-slate-400 tabular-nums hidden sm:inline">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              )}
            </div>

            {/* Lado Direito: Episódios, Servidores, Legendas, Qualidade, Transmitir, Fullscreen */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {isSeries && (
                <button
                  onClick={() => {
                    const next = !episodesModalOpen;
                    closeAllModals();
                    setEpisodesModalOpen(next);
                  }}
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors min-w-[34px] min-h-[34px] justify-center cursor-pointer ${
                    episodesModalOpen ? 'text-sky-400 bg-slate-800' : 'text-slate-300 hover:text-white'
                  }`}
                  title="Mudar Episódio"
                >
                  <Layers size={17} className="text-sky-400" />
                  <span className="hidden md:inline">Episódios</span>
                </button>
              )}

              {!activeServer?.isLive && (
                <>
                  <button
                    onClick={() => {
                      const next = !serverModalOpen;
                      closeAllModals();
                      setServerModalOpen(next);
                    }}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors min-w-[34px] min-h-[34px] justify-center cursor-pointer ${
                      serverModalOpen ? 'text-sky-400 bg-slate-800' : 'text-slate-300 hover:text-white'
                    }`}
                    title="Trocar Servidor Kairou"
                  >
                    <Server size={17} />
                    <span className="hidden md:inline">Servidores</span>
                  </button>

                  <button
                    onClick={() => {
                      const next = !audioSubModalOpen;
                      closeAllModals();
                      setAudioSubModalOpen(next);
                    }}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors min-w-[34px] min-h-[34px] justify-center cursor-pointer ${
                      audioSubModalOpen ? 'text-sky-400 bg-slate-800' : 'text-slate-300 hover:text-white'
                    }`}
                    title="Áudio e Legendas"
                  >
                    <MessageSquare size={17} />
                    <span className="hidden md:inline">Áudio / Legenda</span>
                  </button>

                  <button
                    onClick={() => {
                      const next = !qualityModalOpen;
                      closeAllModals();
                      setQualityModalOpen(next);
                    }}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors min-w-[34px] min-h-[34px] justify-center cursor-pointer ${
                      qualityModalOpen ? 'text-sky-400 bg-slate-800' : 'text-slate-300 hover:text-white'
                    }`}
                    title="Qualidade de Reprodução"
                  >
                    <Sliders size={17} />
                    <span className="hidden md:inline">
                      {selectedQuality === 'auto'
                        ? (currentPlayingResolution ? `Auto (${currentPlayingResolution.split(' ')[0]})` : 'Auto')
                        : selectedQuality.toUpperCase()}
                    </span>
                  </button>
                </>
              )}

              {/* Botão de Transmissão para TV (Cast) */}
              <button
                onClick={() => {
                  const next = !castModalOpen;
                  closeAllModals();
                  setCastModalOpen(next);
                }}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all min-w-[34px] min-h-[34px] justify-center cursor-pointer ${
                  isCasting
                    ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : castModalOpen
                    ? 'text-sky-400 bg-slate-800 border border-sky-400/40'
                    : 'text-sky-400 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-400/50 hover:text-white'
                }`}
                title="Transmitir para TV (Chromecast, Smart TV, AirPlay)"
              >
                <Cast size={17} className={isCasting ? 'animate-pulse text-emerald-400' : 'text-sky-400'} />
                <span className="hidden md:inline font-bold">
                  {isCasting ? 'Na TV' : 'Cast'}
                </span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="text-slate-300 hover:text-white transition-colors p-1.5 sm:p-2 min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer"
                title="Tela cheia"
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop universal para fechar qualquer modal ao clicar fora */}
      {isAnyModalOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs animate-fade-in"
          onClick={closeAllModals}
        />
      )}

      {/* Modal / Bottom Sheet de Seleção de servidores Kairou */}
      {serverModalOpen && (
        <div
          className="fixed sm:absolute bottom-0 sm:bottom-20 inset-x-0 sm:inset-x-auto sm:right-8 z-50 w-full sm:w-96 max-w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-[#0f141e]/98 sm:bg-[#0f141e]/95 border-t sm:border border-white/[0.1] p-4 sm:p-5 backdrop-blur-2xl shadow-2xl text-xs max-h-[85vh] sm:max-h-[72vh] flex flex-col animate-slide-up sm:animate-scale-in safe-bottom modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pílula de arrastar no celular */}
          <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-3 sm:hidden shrink-0" />

          {/* Cabeçalho do Modal */}
          <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-slate-800">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Server size={16} className="text-sky-400" />
                Servidores Kairou
              </h4>
              <p className="text-[11px] text-slate-400">
                Rede de Alta Velocidade Kairou
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-mono">
                {servers.length} servidores
              </span>
              <button
                onClick={closeAllModals}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Seletor de Idioma das Fontes: Dublado 🇧🇷 vs Original 🇺🇸 */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/90 rounded-xl mb-3 border border-slate-800/80 shrink-0">
            <button
              onClick={() => setServerLangFilter('dub')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                serverLangFilter === 'dub'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span className="text-base leading-none">🇧🇷</span>
              <span>Dublado</span>
              {dubServersCount > 0 && <span className="text-[10px] font-mono opacity-80">({dubServersCount})</span>}
            </button>

            <button
              onClick={() => setServerLangFilter('sub')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                serverLangFilter === 'sub'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span className="text-base leading-none">🇺🇸</span>
              <span>Original</span>
              {subServersCount > 0 && <span className="text-[10px] font-mono opacity-80">({subServersCount})</span>}
            </button>

            <button
              onClick={() => setServerLangFilter('all')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                serverLangFilter === 'all'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span className="text-base leading-none">🌐</span>
              <span>Todos</span>
              <span className="text-[10px] font-mono opacity-80">({servers.length})</span>
            </button>
          </div>

          {/* Lista de Servidores Filtrados */}
          <div className="overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {filteredServers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhum servidor disponível nesta categoria.
              </div>
            ) : (
              filteredServers.map((srv) => {
                const realIndex = servers.indexOf(srv);
                const isActive = realIndex === activeServerIndex;
                const isDub = Boolean(srv.isDub || (srv.providerName || '').includes('[Dublado]'));
                const is4k = (srv.quality || '').includes('4K');
                const is2k = (srv.quality || '').includes('1440') || (srv.quality || '').includes('2K');
                const is1080 = (srv.quality || '').includes('1080');

                return (
                  <button
                    key={srv.id || realIndex}
                    onClick={() => handleSelectServer(realIndex)}
                    className={`w-full text-left p-3 sm:p-2.5 rounded-xl flex items-center justify-between transition-all border cursor-pointer min-h-[48px] ${
                      isActive
                        ? 'bg-sky-500/20 text-white border-sky-400/50 font-semibold shadow-md shadow-sky-500/10'
                        : 'text-slate-300 bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col gap-1 flex-1 pr-2">
                      <span className="font-semibold text-xs text-white leading-tight">
                        {srv.providerName}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        {isDub ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                            <span>🇧🇷</span> Dublado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                            <span>🇺🇸</span> Original (Leg. PT)
                          </span>
                        )}

                        <span
                          className={`px-1.5 py-0.5 rounded font-mono font-semibold ${
                            is4k
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : is2k
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                              : is1080
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {srv.quality || 'Full HD'}
                        </span>
                      </div>
                    </div>

                    {isActive ? (
                      <div className="flex items-center gap-1 text-sky-400 font-bold text-[11px] shrink-0">
                        <span>Ativo</span>
                        <Check size={14} />
                      </div>
                    ) : (
                      <ChevronRight size={14} className="text-slate-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet de Áudio & Legendas */}
      {audioSubModalOpen && (
        <div
          className="fixed sm:absolute bottom-0 sm:bottom-20 inset-x-0 sm:inset-x-auto sm:right-8 z-50 w-full sm:w-80 max-w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-[#0f141e]/98 sm:bg-[#0f141e]/95 border-t sm:border border-white/[0.1] p-4 sm:p-5 backdrop-blur-2xl shadow-2xl text-xs max-h-[85vh] sm:max-h-[70vh] overflow-y-auto animate-slide-up sm:animate-scale-in safe-bottom modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pílula de arrastar no celular */}
          <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-3 sm:hidden shrink-0" />

          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="font-bold text-white text-sm flex items-center gap-2">
              <MessageSquare size={16} className="text-sky-400" />
              <span>Áudio & Legendas</span>
            </div>
            <button
              onClick={closeAllModals}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Faixas de Áudio */}
          <div className="space-y-2 mb-4">
            <span className="text-slate-400 font-semibold block text-[11px]">Áudio Disponível:</span>
            {audioTracks.length > 0 ? (
              <div className="space-y-1">
                {audioTracks.map((tr) => (
                  <button
                    key={tr.id}
                    onClick={() => handleSelectAudioTrack(tr.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors min-h-[40px] cursor-pointer ${
                      activeAudioTrack === tr.id
                        ? 'bg-sky-500/20 text-sky-400 font-semibold border border-sky-400/30'
                        : 'text-slate-300 hover:bg-slate-800/60 bg-slate-900/40'
                    }`}
                  >
                    <span>{tr.label}</span>
                    {activeAudioTrack === tr.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between bg-sky-500/20 text-sky-400 font-semibold border border-sky-400/30 min-h-[40px]">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">{isCurrentDub ? 'Português (Dublado)' : 'Áudio Original (Internacional)'}</span>
                    <span className="text-[10px] text-sky-300/80 font-normal">Áudio oficial integrado na transmissão</span>
                  </div>
                  <Check size={14} />
                </div>

                {alternateAudioServer && (
                  <button
                    onClick={() => handleSelectServer(alternateAudioServer.index)}
                    className="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors min-h-[40px] cursor-pointer text-slate-300 hover:bg-slate-800/60 bg-slate-900/40 border border-slate-800"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs">{alternateAudioServer.isDub ? 'Português (Dublado)' : 'Áudio Original (com Legendas)'}</span>
                      <span className="text-[10px] text-slate-500">Alternar transmissão</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-500" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Faixas de Legendas */}
          <div className="space-y-2">
            <span className="text-slate-400 font-semibold block text-[11px]">Legendas:</span>
            <div className="space-y-1">
              <button
                onClick={() => handleSelectSubtitleTrack(-1)}
                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors min-h-[40px] cursor-pointer ${
                  activeSubtitleTrack === -1
                    ? 'bg-sky-500/20 text-sky-400 font-semibold border border-sky-400/30'
                    : 'text-slate-300 hover:bg-slate-800/60 bg-slate-900/40'
                }`}
              >
                <span>Desativadas</span>
                {activeSubtitleTrack === -1 && <Check size={14} />}
              </button>

              {subtitleTracks.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleSelectSubtitleTrack(sub.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors min-h-[40px] cursor-pointer ${
                    activeSubtitleTrack === sub.id
                      ? 'bg-sky-500/20 text-sky-400 font-semibold border border-sky-400/30'
                      : 'text-slate-300 hover:bg-slate-800/60 bg-slate-900/40'
                  }`}
                >
                  <span>{sub.label}</span>
                  {activeSubtitleTrack === sub.id && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet de Qualidade */}
      {qualityModalOpen && (
        <div
          className="fixed sm:absolute bottom-0 sm:bottom-20 inset-x-0 sm:inset-x-auto sm:right-8 z-50 w-full sm:w-80 max-w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-[#0f141e]/98 sm:bg-[#0f141e]/95 border-t sm:border border-white/[0.1] p-4 sm:p-5 backdrop-blur-2xl shadow-2xl text-xs max-h-[85vh] sm:max-h-[70vh] overflow-y-auto animate-slide-up sm:animate-scale-in safe-bottom modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pílula de arrastar no celular */}
          <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-3 sm:hidden shrink-0" />

          <div className="mb-3 font-bold text-white border-b border-slate-800 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-sky-400" />
              <span>Qualidade de Vídeo</span>
            </div>
            <div className="flex items-center gap-2">
              {currentPlayingResolution && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-mono">
                  {currentPlayingResolution}
                </span>
              )}
              <button
                onClick={closeAllModals}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {/* Se for transmissão multi-qualidade HLS adaptativa */}
            {qualityLevels && qualityLevels.filter((l) => l.key !== 'auto').length > 0 ? (
              <>
                {/* Opção Automática / Adaptativa (única e exclusiva) */}
                <button
                  onClick={() => handleSelectQuality('auto')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all border cursor-pointer min-h-[46px] ${
                    selectedQuality === 'auto'
                      ? 'bg-sky-500/20 text-sky-400 border-sky-400/40 font-semibold shadow-sm'
                      : 'text-slate-300 bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">Automático (Adaptativo)</span>
                      {currentPlayingResolution && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-mono font-semibold whitespace-nowrap shrink-0 border border-slate-700/60">
                          {currentPlayingResolution}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">Ajusta automaticamente à velocidade da sua internet</span>
                  </div>
                  {selectedQuality === 'auto' && <Check size={16} className="text-sky-400 shrink-0 ml-2" />}
                </button>

                {/* Resoluções específicas disponíveis */}
                <div className="pt-1 space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                    Travar Resolução
                  </span>
                  {qualityLevels
                    .filter((lvl) => lvl.key !== 'auto')
                    .map((lvl) => {
                      const isSelected = selectedQuality === lvl.key;
                      let badgeText = '';
                      let badgeCls = '';
                      if (lvl.height >= 2160) {
                        badgeText = '4K UHD';
                        badgeCls = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                      } else if (lvl.height >= 1440) {
                        badgeText = '2K QHD';
                        badgeCls = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                      } else if (lvl.height >= 1080) {
                        badgeText = 'Full HD';
                        badgeCls = 'bg-sky-500/20 text-sky-300 border-sky-400/30';
                      } else if (lvl.height >= 720) {
                        badgeText = 'HD';
                        badgeCls = 'bg-slate-700/60 text-slate-300 border-slate-600/40';
                      }

                      return (
                        <button
                          key={lvl.key || lvl.index}
                          onClick={() => handleSelectQuality(lvl.key)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all border cursor-pointer min-h-[44px] ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-400 border-sky-400/40 font-semibold'
                              : 'text-slate-300 bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-xs truncate">{lvl.label}</span>
                            {badgeText && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${badgeCls}`}>
                                {badgeText}
                              </span>
                            )}
                          </div>
                          {isSelected && <Check size={16} className="text-sky-400 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                </div>
              </>
            ) : (
              /* Transmissão direta em resolução nativa sem compressão adaptativa */
              <div className="space-y-2">
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-400/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span>Resolução Máxima Nativa</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/25 text-sky-300 font-bold font-mono uppercase tracking-wider whitespace-nowrap border border-sky-400/30">
                        {currentPlayingResolution || (activeServer?.quality ? activeServer.quality.replace(/\b(hls|mp4)\b/gi, '').trim() : '1080p Full HD')}
                      </span>
                    </span>
                    <Check size={16} className="text-sky-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Esta fonte transmite em fluxo direto de estúdio com taxa de bits máxima e fidelidade visual original, sem oscilações de resolução.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setQualityModalOpen(false);
                    setServerModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-left font-medium text-xs border border-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Server size={14} className="text-sky-400 shrink-0" />
                    <span>Escolher outro Servidor de Vídeo</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-500" />
                </button>
              </div>
            )}
          </div>

          {/* Dica para alternar para servidor 1080p se a transmissão atual for inferior a 1080p */}
          {(!qualityLevels.some((l) => l.height >= 1080) &&
            currentPlayingResolution !== '1080p Full HD' &&
            currentPlayingResolution !== '1440p 2K' &&
            currentPlayingResolution !== '4K Ultra HD') && (
            <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-medium">
                <AlertCircle size={13} />
                <span>Transmissão atual em {currentPlayingResolution || '720p HD'}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                Para assistir em 1080p Full HD, selecione um dos servidores Full HD no menu de Servidores.
              </p>
              <button
                onClick={() => {
                  setQualityModalOpen(false);
                  setServerModalOpen(true);
                }}
                className="mt-1 w-full py-2 px-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 text-center font-semibold text-[11px] border border-sky-400/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Server size={12} />
                <span>Trocar para Servidor 1080p</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal / Bottom Sheet de Transmissão para TV (Cast / AirPlay / Screen Mirroring) */}
      {castModalOpen && (
        <div
          className="fixed sm:absolute bottom-0 sm:bottom-20 inset-x-0 sm:inset-x-auto sm:right-8 z-50 w-full sm:w-96 max-w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-[#0f141e]/98 sm:bg-[#0f141e]/95 border-t sm:border border-white/[0.1] p-4 sm:p-5 backdrop-blur-2xl shadow-2xl text-xs max-h-[85vh] sm:max-h-[75vh] flex flex-col animate-slide-up sm:animate-scale-in safe-bottom modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pílula de arrastar no celular */}
          <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-3 sm:hidden shrink-0" />

          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${isCasting ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'}`}>
                <Cast size={18} className={isCasting ? 'animate-pulse' : ''} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                  Transmitir para TV
                </h4>
                <p className="text-[11px] text-slate-400">
                  Chromecast • Smart TV • AirPlay
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1.5 ${
                  isCasting
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isCasting ? 'bg-emerald-400 animate-ping' : 'bg-sky-400'}`} />
                {isCasting ? 'Conectado' : 'Pronto'}
              </span>
              <button
                onClick={closeAllModals}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-2.5 overflow-y-auto pr-0.5 custom-scrollbar">
            {/* Ação 1: Transmissão via Apple AirPlay (iPhone, iPad, Mac) */}
            <button
              onClick={handleTriggerAirPlay}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-purple-600/20 hover:from-sky-500/30 hover:to-purple-600/30 border border-sky-400/40 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                  <Airplay size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">
                      Transmitir via AirPlay (LG TV / Smart TV / Apple TV)
                    </span>
                    <ChevronRight size={14} className="text-sky-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    Transmite vídeo e áudio completos em alta definição para sua LG TV (webOS) ou Smart TV via AirPlay 2.
                  </p>
                </div>
              </div>
            </button>

            {/* Ação 2: Enviar Vídeo Diretamente para Smart TV / Chromecast */}
            <button
              onClick={handleTriggerCast}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-sky-500/20 to-blue-600/20 hover:from-sky-500/30 hover:to-blue-600/30 border border-sky-400/30 hover:border-sky-400/50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                  <Tv size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">
                      {isCasting ? 'Trocar Dispositivo ou Reconectar' : 'Buscar Smart TV / Chromecast'}
                    </span>
                    <ChevronRight size={14} className="text-sky-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    Envia o vídeo para sua TV sem travar ou consumir bateria do celular/PC.
                  </p>
                </div>
              </div>
            </button>

            {/* Ação 3: Espelhar Tela / Aba (Miracast ou monitor sem fio) */}
            <button
              onClick={handleScreenMirror}
              className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-300 group-hover:text-white shrink-0 mt-0.5">
                  <Monitor size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 group-hover:text-white text-xs">
                      Espelhar Tela ou Aba na TV
                    </span>
                    <ChevronRight size={14} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Ideal para TVs via Miracast, HDMI sem fio ou quando a TV não possui Chromecast.
                  </p>
                </div>
              </div>
            </button>

            {/* Desconectar quando ativo */}
            {isCasting && (
              <button
                onClick={handleStopCast}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={14} />
                Desconectar da TV
              </button>
            )}

            {/* Dicas e Instruções de Conexão */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Como conectar à TV
              </span>

              <div className="flex items-start gap-2 text-[11px] text-slate-300">
                <Wifi size={13} className="text-sky-400 shrink-0 mt-0.5" />
                <span>Certifique-se de que sua TV e este aparelho estão na <strong>mesma rede Wi-Fi</strong>.</span>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-300">
                <Tv size={13} className="text-sky-400 shrink-0 mt-0.5" />
                <span>Compatível com <strong>Chromecast, Samsung, LG webOS, Roku, Fire TV e Apple TV</strong>.</span>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-400">
                <Radio size={13} className="text-slate-500 shrink-0 mt-0.5" />
                <span>No Google Chrome ou Edge, clique em <strong>Buscar</strong> para abrir a seleção do sistema.</span>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-sky-300/90 bg-sky-950/30 p-2 rounded-lg border border-sky-500/20 mt-1">
                <Airplay size={13} className="text-sky-400 shrink-0 mt-0.5" />
                <span><strong>iPhone para LG TV</strong>: O vídeo e o áudio são transmitidos em sincronia total direto para a tela da TV. Certifique-se de que o AirPlay está ligado nas configurações da LG TV.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Drawer Lateral de Seleção de Episódios Diretamente no Player */}
      {episodesModalOpen && isSeries && (
        <div className="absolute inset-0 z-50 flex items-center justify-end bg-black/65 backdrop-blur-md animate-fade-in">
          {/* Fundo para fechar */}
          <div className="absolute inset-0" onClick={() => setEpisodesModalOpen(false)} />

          <div
            className="relative w-full sm:w-[480px] lg:w-[540px] h-full bg-[#0d121c]/98 border-l border-white/[0.1] shadow-2xl p-4 sm:p-6 flex flex-col z-10 animate-scale-in"
            style={{
              paddingTop: 'max(1rem, env(safe-area-inset-top))',
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
              paddingLeft: 'max(1rem, env(safe-area-inset-left))',
              paddingRight: 'max(1rem, env(safe-area-inset-right))',
            }}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>Episódios</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 font-mono font-normal">
                      {episodesList.length} disponíveis
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-[260px] sm:max-w-xs">{media?.title}</p>
                </div>
              </div>

              <button
                onClick={() => setEpisodesModalOpen(false)}
                className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Seletor de Temporadas */}
            {seasons && seasons.length > 1 && (
              <div className="py-3 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-800/80">
                {seasons.map((s) => {
                  const num = s.season_number;
                  const isSelected = num === currentSeasonNumber;
                  return (
                    <button
                      key={num}
                      onClick={() => setCurrentSeasonNumber(num)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-400 text-slate-950 shadow-md font-bold'
                          : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-white/[0.06]'
                      }`}
                    >
                      {s.name || `Temporada ${num}`}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Lista de Episódios */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1 custom-scrollbar">
              {loadingEpisodes ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                  <Loader2 size={24} className="animate-spin text-sky-400" />
                  <span>Carregando episódios da Temporada {currentSeasonNumber}...</span>
                </div>
              ) : episodesList.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  Nenhum episódio encontrado para esta temporada.
                </div>
              ) : (
                episodesList.map((ep) => {
                  const isCurrentlyPlaying = ep.ep === currentEpisodeNumber;
                  return (
                    <button
                      key={ep.ep}
                      onClick={() => handleSwitchEpisode(ep, currentSeasonNumber)}
                      className={`w-full text-left p-3 rounded-2xl flex items-start gap-3.5 transition-all border group cursor-pointer ${
                        isCurrentlyPlaying
                          ? 'bg-sky-500/15 border-sky-400/50 shadow-lg shadow-sky-500/10'
                          : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Thumbnail com indicador */}
                      <div className="relative w-28 sm:w-32 aspect-video rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-white/[0.06]">
                        <img src={ep.thumbnail} alt={ep.title} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-slate-300">
                          {ep.duration}
                        </span>
                        {isCurrentlyPlaying ? (
                          <div className="absolute inset-0 bg-sky-500/30 flex items-center justify-center backdrop-blur-xs">
                            <Radio size={18} className="text-white animate-pulse" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play size={18} className="text-white fill-white" />
                          </div>
                        )}
                      </div>

                      {/* Informações do Episódio */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-bold ${
                              isCurrentlyPlaying ? 'text-sky-400' : 'text-slate-200 group-hover:text-white'
                            }`}
                          >
                            {ep.ep}. {ep.title}
                          </span>
                          {isCurrentlyPlaying && (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-sky-400 text-slate-950 font-bold shrink-0">
                              Reproduzindo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {ep.synopsis || 'Sinopse deste episódio disponível na transmissão.'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

