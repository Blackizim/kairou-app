import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Tv,
  Search,
  X,
  Play,
  Trophy,
  Baby,
  Newspaper,
  Clock,
  Sparkles,
  Radio,
  Wifi,
  Film,
  Flame,
  Calendar,
  Users,
  Swords,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import channelsData from '../data/channels.json';
import { fetchMatchesList } from '../services/matchesResolver.js';
import { resolveChannelStream } from '../services/channelsResolver.js';

// Genre filter list for channels
const CHANNEL_GENRES = [
  { id: 'all', label: 'Todos os Canais', icon: Sparkles },
  { id: 'esportes', label: 'Esportes', icon: Trophy },
  { id: 'canais-abertos', label: 'Canais Abertos', icon: Tv },
  { id: 'infantil', label: 'Infantil', icon: Baby },
  { id: 'noticias', label: 'Notícias', icon: Newspaper },
  { id: '24-horas', label: 'Canais 24h', icon: Clock },
  { id: 'filmes-series', label: 'Filmes & Séries', icon: Film },
];

// Main tab categories
const SPORTS_CATEGORIES = [
  { id: 'all', label: 'Todos os Jogos', icon: Flame },
  { id: 'futebol', label: 'Futebol Ao Vivo', icon: Trophy },
  { id: 'basquete', label: 'NBA & Basquete', icon: Flame },
  { id: 'lutas', label: 'UFC & Lutas', icon: Swords },
  { id: 'motor', label: 'F1 & Motor', icon: Flame },
  { id: 'channels', label: 'Grade de Canais (319)', icon: Tv },
];

export default function ChannelsTab({ onPlayChannel }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedChannelGenre, setSelectedChannelGenre] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [loadingSlug, setLoadingSlug] = useState(null);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const heroTimerRef = useRef(null);

  // 1. Fetch live matches localmente (ESPN API direta + fallbacks) a cada 60s
  const fetchMatches = async (showLoading = false) => {
    if (showLoading) setIsLoadingMatches(true);
    try {
      const list = await fetchMatchesList();
      if (Array.isArray(list) && list.length > 0) {
        setMatches(list);
      }
    } catch (err) {
      console.warn('[ChannelsTab] Erro ao carregar partidas esportivas:', err);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  useEffect(() => {
    fetchMatches(true);
    const interval = setInterval(() => {
      fetchMatches(false);
    }, 60000); // 60s auto-refresh
    return () => clearInterval(interval);
  }, []);

  // 2. Featured Matches for Hero Carousel
  const featuredMatches = useMemo(() => {
    const list = matches.filter((m) => m.isFeatured || m.isLive);
    return list.length > 0 ? list.slice(0, 5) : matches.slice(0, 5);
  }, [matches]);

  // Rotate hero carousel automatically every 8 seconds
  useEffect(() => {
    if (featuredMatches.length <= 1) return;
    heroTimerRef.current = setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % featuredMatches.length);
    }, 8000);
    return () => clearInterval(heroTimerRef.current);
  }, [featuredMatches.length]);

  const currentFeatured = featuredMatches[activeHeroIndex] || featuredMatches[0];

  // 3. Filtered Matches by Search & Category
  const filteredMatches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return matches.filter((m) => {
      const matchCat =
        activeCategory === 'all' ||
        activeCategory === 'channels' ||
        m.sport === activeCategory;

      const matchSearch =
        !q ||
        m.homeTeam.name.toLowerCase().includes(q) ||
        m.awayTeam.name.toLowerCase().includes(q) ||
        m.league.toLowerCase().includes(q) ||
        (m.channel?.name && m.channel.name.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [matches, activeCategory, searchQuery]);

  // Group matches by sport category
  const soccerMatches = useMemo(
    () => filteredMatches.filter((m) => m.sport === 'futebol'),
    [filteredMatches]
  );
  const basketballMatches = useMemo(
    () => filteredMatches.filter((m) => m.sport === 'basquete'),
    [filteredMatches]
  );
  const fightMatches = useMemo(
    () => filteredMatches.filter((m) => m.sport === 'lutas'),
    [filteredMatches]
  );
  const motorMatches = useMemo(
    () => filteredMatches.filter((m) => m.sport === 'motor'),
    [filteredMatches]
  );

  // 4. Filtered Channels Catalog
  const filteredChannels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return channelsData.filter((ch) => {
      const matchesGenre =
        selectedChannelGenre === 'all' || ch.genre === selectedChannelGenre;
      const matchesSearch =
        !q ||
        ch.title.toLowerCase().includes(q) ||
        ch.slug.toLowerCase().includes(q) ||
        (ch.category && ch.category.toLowerCase().includes(q));
      return matchesGenre && matchesSearch;
    });
  }, [selectedChannelGenre, searchQuery]);

  // 5. Handle Play Click (for Channel or Match)
  const handlePlay = async (target, options = {}) => {
    const slug = target.slug || target.channel?.slug;
    const title = target.title || `${target.homeTeam?.name} x ${target.awayTeam?.name}`;
    const poster = target.logo || target.homeTeam?.logo;

    if (!slug) return;
    if (loadingSlug) return;
    setLoadingSlug(slug);

    try {
      const data = await resolveChannelStream(slug);

      if (data && data.ok && data.streamUrl) {
        onPlayChannel({
          id: `live-${slug}`,
          title: title,
          type: 'live',
          isLive: true,
          slug: slug,
          streamUrl: data.streamUrl,
          isIframe: Boolean(data.isIframe),
          poster,
          backdrop_path: target.bannerBackdrop || poster,
        });
      } else {
        // Fallback to iframe
        onPlayChannel({
          id: `live-${slug}`,
          title: title,
          type: 'live',
          isLive: true,
          slug: slug,
          streamUrl: `https://v1.rdse.buzz/${slug}`,
          isIframe: true,
          poster,
          backdrop_path: target.bannerBackdrop || poster,
        });
      }
    } catch (err) {
      console.warn('[ChannelsTab] Fallback direto:', err);
      onPlayChannel({
        id: `live-${slug}`,
        title: title,
        type: 'live',
        isLive: true,
        slug: slug,
        streamUrl: `https://v1.rdse.buzz/${slug}`,
        isIframe: true,
        poster,
      });
    } finally {
      setLoadingSlug(null);
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 pb-24 min-h-[85vh] select-none">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/35 text-rose-400 text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-rose-500/10">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Ao Vivo & Grade de TV
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-sky-400 font-semibold px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20">
              <Wifi size={12} /> HLS Nativo • Zero Anúncios
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Jogos de Hoje & Canais Ao Vivo
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Acompanhe futebol brasileiro e europeu, NBA, UFC e 319 canais de TV 24h com transmissão direta em Full HD.
          </p>
        </div>

        {/* Universal Search Bar */}
        <div className="w-full md:w-96 relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar time, jogo ou canal (ex: Flamengo, NBA, SporTV)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 bg-[#121722]/90 border border-white/[0.12] rounded-2xl pl-11 pr-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-inner backdrop-blur-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Categories Navigation Pills */}
      <div className="py-5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          {SPORTS_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 border cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-slate-950 border-sky-400 shadow-lg shadow-sky-500/25 font-bold scale-[1.02]'
                    : 'bg-[#101520]/80 text-slate-300 border-white/[0.08] hover:bg-[#161e2e] hover:text-white hover:border-white/[0.15]'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-slate-950' : 'text-sky-400'} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => fetchMatches(true)}
          disabled={isLoadingMatches}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 text-slate-400 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors shrink-0 cursor-pointer"
          title="Atualizar placares ao vivo"
        >
          <RefreshCw size={13} className={isLoadingMatches ? 'animate-spin text-sky-400' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* 1. CINEMATIC HERO SPOTLIGHT BANNER (Jogo em Destaque) */}
      {!searchQuery && activeCategory !== 'channels' && currentFeatured && (
        <div className="relative w-full rounded-3xl overflow-hidden border border-white/[0.12] bg-[#0c1018] shadow-2xl mb-12 group transition-all">
          {/* Stadium Background with Atmospheric Gradients */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-45 group-hover:scale-105 transition-all duration-700"
            style={{
              backgroundImage: `url('${currentFeatured.bannerBackdrop || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1600&auto=format&fit=crop'}')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/90 md:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />

          {/* Banner Content */}
          <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col md:flex-row md:items-center justify-between gap-8 min-h-[300px] sm:min-h-[340px]">
            {/* Left Column: Match Details */}
            <div className="space-y-4 max-w-xl">
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    currentFeatured.isLive
                      ? 'bg-rose-500/25 border-rose-500/50 text-rose-400 animate-pulse'
                      : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${currentFeatured.isLive ? 'bg-rose-500 animate-ping' : 'bg-amber-400'}`} />
                  {currentFeatured.statusDetail || currentFeatured.status}
                </span>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900/80 text-slate-300 border border-white/[0.1] uppercase tracking-wider">
                  {currentFeatured.league}
                </span>

                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-400/20">
                  Full HD 1080p
                </span>
              </div>

              {/* Match Header Title */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex items-center gap-3">
                  <img
                    src={currentFeatured.homeTeam.logo}
                    alt={currentFeatured.homeTeam.name}
                    className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-2xl"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                    {currentFeatured.homeTeam.name}
                  </span>
                </div>

                <div className="px-3 py-1 rounded-xl bg-white/10 text-sky-400 font-extrabold text-xs sm:text-sm tracking-wider border border-white/15">
                  VS
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                    {currentFeatured.awayTeam.name}
                  </span>
                  <img
                    src={currentFeatured.awayTeam.logo}
                    alt={currentFeatured.awayTeam.name}
                    className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-2xl"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              </div>

              {/* Viewers and Broadcast Channel */}
              <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-300">
                <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                  <Tv size={15} />
                  Transmissão: {currentFeatured.channel?.name || 'Kairou Live TV'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Users size={14} />
                  {currentFeatured.viewers}
                </span>
              </div>
            </div>

            {/* Right Column: Hero Match Widget & Action Button */}
            <div className="bg-[#121724]/90 border border-white/[0.12] rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center min-w-[280px] sm:min-w-[320px] text-center space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-3 py-1 rounded-full bg-slate-900 border border-white/[0.08]">
                {currentFeatured.league}
              </span>

              <div className="flex items-center justify-center gap-6 py-1">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-2xl bg-black/50 p-2.5 border border-white/10 flex items-center justify-center">
                    <img
                      src={currentFeatured.homeTeam.logo}
                      alt={currentFeatured.homeTeam.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <span className="text-xs font-bold text-white max-w-[90px] truncate">
                    {currentFeatured.homeTeam.shortName || currentFeatured.homeTeam.name}
                  </span>
                </div>

                <div className="text-sm font-black text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-400/20">
                  VS
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-2xl bg-black/50 p-2.5 border border-white/10 flex items-center justify-center">
                    <img
                      src={currentFeatured.awayTeam.logo}
                      alt={currentFeatured.awayTeam.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <span className="text-xs font-bold text-white max-w-[90px] truncate">
                    {currentFeatured.awayTeam.shortName || currentFeatured.awayTeam.name}
                  </span>
                </div>
              </div>

              {/* Big "Assistir Agora" Button */}
              <button
                onClick={() => handlePlay(currentFeatured)}
                disabled={loadingSlug === currentFeatured.channel?.slug}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-300 hover:from-sky-300 hover:to-sky-200 text-slate-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-sky-400/20 active:scale-98 transition-all cursor-pointer"
              >
                {loadingSlug === currentFeatured.channel?.slug ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play size={18} className="fill-slate-950" />
                    <span>Assistir Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Carousel Dot Indicators */}
          {featuredMatches.length > 1 && (
            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 z-20">
              {featuredMatches.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveHeroIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeHeroIndex ? 'w-8 bg-sky-400' : 'w-2 bg-white/30 hover:bg-white/60'
                  }`}
                  aria-label={`Ir para destaque ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. SECTION: FUTEBOL AO VIVO — DESTAQUES */}
      {activeCategory !== 'channels' && (activeCategory === 'all' || activeCategory === 'futebol') && (
        <div className="mb-14 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                ⚽ FUTEBOL AO VIVO — DESTAQUES
              </h2>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
              AO VIVO
            </span>
          </div>

          {soccerMatches.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[#0f1420]/80 border border-white/[0.08] text-center text-slate-400 text-xs sm:text-sm">
              Nenhuma partida de futebol encontrada no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {soccerMatches.map((match, idx) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  index={idx + 1}
                  isLoading={loadingSlug === match.channel?.slug}
                  onPlay={() => handlePlay(match)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. SECTION: NBA & BASQUETE */}
      {activeCategory !== 'channels' && (activeCategory === 'all' || activeCategory === 'basquete') && (
        <div className="mb-14 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                🏀 NBA & BASQUETE
              </h2>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              NBA / WNBA
            </span>
          </div>

          {basketballMatches.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-[#0e131d]/90 border border-white/[0.08] flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
                🏀
              </div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                Nenhuma partida de Basquete / NBA agendada para hoje
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                Acompanhe a transmissão 24h dos canais ao vivo (ESPN, SporTV, Prime Video) no menu de canais!
              </p>
              <button
                onClick={() => {
                  setActiveCategory('channels');
                  setSelectedChannelGenre('esportes');
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-xs font-semibold border border-sky-400/30 transition-all cursor-pointer"
              >
                Ver Canais de Esportes 24h
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {basketballMatches.map((match, idx) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  index={idx + 1}
                  isLoading={loadingSlug === match.channel?.slug}
                  onPlay={() => handlePlay(match)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. SECTION: UFC & LUTAS */}
      {activeCategory !== 'channels' && (activeCategory === 'all' || activeCategory === 'lutas') && (
        <div className="mb-14 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                🥊 UFC & LUTAS
              </h2>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
              UFC / MMA
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {fightMatches.map((match, idx) => (
              <MatchCard
                key={match.id}
                match={match}
                index={idx + 1}
                isLoading={loadingSlug === match.channel?.slug}
                onPlay={() => handlePlay(match)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 5. SECTION: FÓRMULA 1 & MOTOR */}
      {activeCategory !== 'channels' && (activeCategory === 'all' || activeCategory === 'motor') && (
        <div className="mb-14 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                🏁 FÓRMULA 1 & MOTOR
              </h2>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              F1 / MOTOGP
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {motorMatches.map((match, idx) => (
              <MatchCard
                key={match.id}
                match={match}
                index={idx + 1}
                isLoading={loadingSlug === match.channel?.slug}
                onPlay={() => handlePlay(match)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 6. SECTION: GRADE COMPLETA DE CANAIS DE TV 24H (319 CANAIS) */}
      <div className="pt-6 border-t border-white/[0.08] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                📺 Grade de Canais de TV Ao Vivo
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/[0.08]">
                {channelsData.length} canais
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Transmissão contínua 24 horas por dia em alta definição
            </p>
          </div>

          {/* Channels Genre Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {CHANNEL_GENRES.map((g) => {
              const Icon = g.icon;
              const isSelected = selectedChannelGenre === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedChannelGenre(g.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
                    isSelected
                      ? 'bg-sky-400 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-400/20'
                      : 'bg-[#121722] text-slate-300 border-white/[0.08] hover:bg-[#182030] hover:text-white'
                  }`}
                >
                  <Icon size={12} className={isSelected ? 'text-slate-950' : 'text-sky-400'} />
                  <span>{g.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 319 Channels Grid */}
        {filteredChannels.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs sm:text-sm">
            Nenhum canal encontrado para "{searchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
            {filteredChannels.map((channel) => {
              const isSelectedLoading = loadingSlug === channel.slug;

              return (
                <div
                  key={channel.id}
                  onClick={() => handlePlay(channel)}
                  className="group relative bg-[#0e121a]/95 hover:bg-[#151c2a] border border-white/[0.07] hover:border-sky-400/50 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-2xl hover:shadow-sky-500/10 cursor-pointer overflow-hidden transform hover:-translate-y-1"
                >
                  <div className="absolute inset-x-0 -top-8 h-16 bg-sky-500/0 group-hover:bg-sky-500/15 blur-xl transition-all duration-300 pointer-events-none" />

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black/60 border border-white/[0.08] p-2 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-sky-400/40 transition-colors">
                        <img
                          src={channel.logo}
                          alt={channel.title}
                          className="max-h-full max-w-full object-contain drop-shadow transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="hidden items-center justify-center text-sky-400">
                          <Tv size={24} />
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          Ao Vivo
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80">
                          Full HD
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-white text-xs sm:text-sm line-clamp-1 tracking-tight group-hover:text-sky-300 transition-colors">
                      {channel.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-medium">
                      {channel.category}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 group-hover:text-slate-300 transition-colors">
                      <Radio size={11} className="text-sky-400" />
                      <span>HLS Direto</span>
                    </span>

                    <div className="w-7 h-7 rounded-full bg-sky-400/10 group-hover:bg-sky-400 text-sky-400 group-hover:text-slate-950 flex items-center justify-center transition-all shadow-sm">
                      {isSelectedLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play size={12} className="fill-current ml-0.5" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component: Individual Sports Match Card (Exactly like the user's uploaded images!)
function MatchCard({ match, index, isLoading, onPlay }) {
  return (
    <div
      onClick={onPlay}
      className="group relative bg-[#0f1420]/90 hover:bg-[#141c2c] border border-white/[0.08] hover:border-sky-400/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-sky-500/10 cursor-pointer overflow-hidden transform hover:-translate-y-1"
    >
      {/* Top Header: Number and League Label */}
      <div>
        <div className="flex items-center justify-between gap-1 mb-3">
          <span className="text-[11px] font-bold text-slate-400 tracking-wide truncate max-w-[140px]">
            {index}. {match.league}
          </span>
          {match.isLive && (
            <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              Ao Vivo
            </span>
          )}
        </div>

        {/* Head-to-Head Visual Matchup Box */}
        <div className="relative h-20 rounded-xl bg-black/50 border border-white/[0.06] p-2 flex items-center justify-around mb-3 group-hover:border-sky-400/30 transition-colors">
          {/* Team 1 */}
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
            <img
              src={match.homeTeam.logo}
              alt={match.homeTeam.name}
              className="w-10 h-10 object-contain drop-shadow transition-transform duration-300 group-hover:scale-110"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-[10px] font-bold text-white text-center truncate max-w-[70px]">
              {match.homeTeam.shortName || match.homeTeam.name}
            </span>
          </div>

          {/* VS Badge / Score */}
          <div className="flex flex-col items-center shrink-0 px-1">
            {match.homeTeam.score !== '' && match.awayTeam.score !== '' ? (
              <div className="text-xs font-black text-white px-2 py-0.5 rounded bg-slate-800 border border-white/10">
                {match.homeTeam.score} - {match.awayTeam.score}
              </div>
            ) : (
              <div className="text-[10px] font-extrabold text-sky-400 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-400/20">
                VS
              </div>
            )}
            <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
              {match.time}
            </span>
          </div>

          {/* Team 2 */}
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
            <img
              src={match.awayTeam.logo}
              alt={match.awayTeam.name}
              className="w-10 h-10 object-contain drop-shadow transition-transform duration-300 group-hover:scale-110"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-[10px] font-bold text-white text-center truncate max-w-[70px]">
              {match.awayTeam.shortName || match.awayTeam.name}
            </span>
          </div>
        </div>

        {/* Match Title */}
        <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight line-clamp-1 group-hover:text-sky-300 transition-colors">
          {match.homeTeam.name} x {match.awayTeam.name}
        </h3>
      </div>

      {/* Footer Info: Broadcast Channel, Quality, Viewers */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-sky-400 font-semibold truncate max-w-[120px]">
          <Tv size={12} className="shrink-0" />
          <span className="truncate">{match.channel?.name || 'SporTV'}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80">
            HD
          </span>
          <div className="w-6 h-6 rounded-full bg-sky-400/10 group-hover:bg-sky-400 text-sky-400 group-hover:text-slate-950 flex items-center justify-center transition-all shadow-sm">
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play size={10} className="fill-current ml-0.5" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
