import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import ContinueWatchingRow from './components/ContinueWatchingRow';
import CategoryFilters from './components/CategoryFilters';
import MediaRow from './components/MediaRow';
import MediaModal from './components/MediaModal';
import VideoPlayer from './components/VideoPlayer';
import WatchlistTab from './components/WatchlistTab';
import ChannelsTab from './components/ChannelsTab';
import SearchResults from './components/SearchResults';
import Footer from './components/Footer';
import Toast from './components/Toast';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import AdminPanelModal from './components/AdminPanelModal';
import GlobalAnnouncementBanner from './components/GlobalAnnouncementBanner';
import SupportPromptModal from './components/SupportPromptModal';
import DonationSection from './components/DonationSection';
import VipSubscriptionModal from './components/VipSubscriptionModal';
import {
  isUserAdmin,
  getAdminSpotlight,
  getMaintenanceMode,
  setMaintenanceMode,
  recordVisitHit,
  initRealtimePresence,
  syncGlobalSystemSettings,
} from './services/adminAnalytics';
import {
  initAdConsent,
  setAdConsent,
  disableAds,
  loadAdScript,
  loadWatchingAds,
  unloadWatchingAds,
} from './services/adConsent';
import { isVipUser } from './services/vipService';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  supabase,
  getUserProfile,
  signOutUser,
  getWatchProgressList,
  removeWatchProgress
} from './services/supabase';

import {
  fetchTrending,
  fetchTopRatedMovies,
  fetchPopularMovies,
  fetchPopularTV,
  fetchByGenre,
  fetchAnimeSeries,
  fetchAnimeMovies,
  fetchTopAnime,
  searchTMDB,
  GENRE_FILTERS
} from './services/tmdb';

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'series', 'movies', 'anime', 'watchlist'
  const [selectedFilter, setSelectedFilter] = useState(GENRE_FILTERS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // TMDB Catalogs
  const [trendingAll, setTrendingAll] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularTV, setPopularTV] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [scifiMovies, setScifiMovies] = useState([]);
  const [animationMedia, setAnimationMedia] = useState([]);
  const [animeSeries, setAnimeSeries] = useState([]);
  const [animeMovies, setAnimeMovies] = useState([]);
  const [topAnime, setTopAnime] = useState([]);
  const [genreResults, setGenreResults] = useState([]);
  const [loadingGenre, setLoadingGenre] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Modals and Active Player
  const [activeMediaModal, setActiveMediaModal] = useState(null);
  const [activeVideoPlayer, setActiveVideoPlayer] = useState(null);
  const [toast, setToast] = useState(null);

  // Supabase Auth & Profile
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminSpotlight, setAdminSpotlight] = useState(() => getAdminSpotlight());
  const [isMaintenance, setIsMaintenance] = useState(() => getMaintenanceMode());
  const [previewVisitorMaintenance, setPreviewVisitorMaintenance] = useState(false);

  // Popup de apoio / anúncios e Modal de Assinatura VIP
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [pendingPlayMedia, setPendingPlayMedia] = useState(null);

  // Continuar Assistindo (Watch Progress)
  const [watchProgressList, setWatchProgressList] = useState([]);
  const [loadingWatchProgress, setLoadingWatchProgress] = useState(false);

  // Função para recarregar o progresso do usuário
  const loadUserProgress = useCallback(async () => {
    try {
      setLoadingWatchProgress(true);
      const list = await getWatchProgressList();
      setWatchProgressList(list || []);
    } catch (err) {
      console.warn('Erro ao carregar progresso:', err);
    } finally {
      setLoadingWatchProgress(false);
    }
  }, []);

  // Monitorar Autenticação no Supabase
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const p = await getUserProfile(session.user.id);
        setProfile(p);
        loadUserProgress();
      } else {
        setUser(null);
        setProfile(null);
        setWatchProgressList([]);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const p = await getUserProfile(session.user.id);
        setProfile(p);
        loadUserProgress();
      } else {
        setUser(null);
        setProfile(null);
        setWatchProgressList([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProgress]);

  // Registrar acesso e escutar alterações do painel admin
  useEffect(() => {
    recordVisitHit();
    initRealtimePresence(user);
    syncGlobalSystemSettings();

    const handleSpotlight = () => setAdminSpotlight(getAdminSpotlight());
    const handleMaintenance = (e) => {
      if (e?.detail?.enabled !== undefined) {
        setIsMaintenance(Boolean(e.detail.enabled));
      } else {
        setIsMaintenance(getMaintenanceMode());
      }
    };

    window.addEventListener('kairou_spotlight_changed', handleSpotlight);
    window.addEventListener('kairou_maintenance_changed', handleMaintenance);
    return () => {
      window.removeEventListener('kairou_spotlight_changed', handleSpotlight);
      window.removeEventListener('kairou_maintenance_changed', handleMaintenance);
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      setProfile(null);
      setWatchProgressList([]);
      showToast('Você saiu da sua conta.');
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  const handleRemoveWatchProgress = async (mediaId, season, episode) => {
    try {
      await removeWatchProgress(mediaId, season, episode);
      setWatchProgressList((prev) =>
        prev.filter((item) => !(String(item.media_id) === String(mediaId) && Number(item.season) === Number(season) && Number(item.episode) === Number(episode)))
      );
      showToast('Item removido de Continuar Assistindo.');
    } catch (err) {
      console.error('Erro ao remover progresso:', err);
    }
  };

  // Watchlist persisted in localStorage
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem('kairou_watchlist_tmdb');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('kairou_watchlist_tmdb', JSON.stringify(watchlist));
    } catch (e) {
      console.error('Falha ao salvar no localStorage', e);
    }
  }, [watchlist]);

  // Dynamic SEO Page Title
  useEffect(() => {
    if (activeVideoPlayer) {
      document.title = `Assistindo ${activeVideoPlayer.title || 'Mídia'} — Kairou`;
    } else if (activeMediaModal) {
      document.title = `${activeMediaModal.title || 'Detalhes'} — Assistir no Kairou`;
    } else if (searchQuery.trim()) {
      document.title = `Buscar "${searchQuery}" — Kairou Filmes e Séries`;
    } else if (activeTab === 'movies') {
      document.title = 'Filmes Online Grátis — Assistir Filmes em HD e 4K | Kairou';
    } else if (activeTab === 'series') {
      document.title = 'Séries Online Completas — Assistir Séries em HD e 4K | Kairou';
    } else if (activeTab === 'anime') {
      document.title = 'Animes Online Grátis — Assistir Animes Dublados e Legendados | Kairou';
    } else if (activeTab === 'channels') {
      document.title = 'Canais de TV Ao Vivo — Assistir TV Online Grátis em HD | Kairou';
    } else if (activeTab === 'watchlist') {
      document.title = 'Minha Lista de Favoritos — Kairou Streaming';
    } else {
      document.title = 'Kairou — Assistir Filmes, Séries e Animes Online Grátis em HD e 4K';
    }
  }, [activeVideoPlayer, activeMediaModal, searchQuery, activeTab]);

  // Initial Load from TMDB API
  useEffect(() => {
    let isMounted = true;

    async function loadTMDBData() {
      try {
        const [
          trending,
          top,
          popMovies,
          popTV,
          action,
          scifi,
          animation,
          animesTV,
          animesMovies,
          topAnimes
        ] = await Promise.all([
          fetchTrending('all', 'week'),
          fetchTopRatedMovies(),
          fetchPopularMovies(),
          fetchPopularTV(),
          fetchByGenre(28, 'movie'), // Ação
          fetchByGenre(878, 'movie'), // Ficção Científica
          fetchByGenre(16, 'movie'), // Animação
          fetchAnimeSeries(), // Séries de Anime
          fetchAnimeMovies(), // Filmes de Anime
          fetchTopAnime(), // Animes Mais Bem Avaliados
        ]);

        if (!isMounted) return;

        setTrendingAll(trending || []);
        setTopRated(top || []);
        setPopularMovies(popMovies || []);
        setPopularTV(popTV || []);
        setActionMovies(action || []);
        setScifiMovies(scifi || []);
        setAnimationMedia(animation || []);
        setAnimeSeries(animesTV || []);
        setAnimeMovies(animesMovies || []);
        setTopAnime(topAnimes || []);
      } catch (err) {
        console.error('Erro ao carregar dados TMDB:', err);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }

    loadTMDBData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter selection handler
  const handleSelectFilter = async (filterItem) => {
    setSelectedFilter(filterItem);
    if (filterItem.id === 'all') {
      setGenreResults([]);
      return;
    }

    setLoadingGenre(true);
    if (filterItem.id === 'anime' || filterItem.type === 'anime') {
      setGenreResults([...animeSeries, ...animeMovies]);
    } else if (filterItem.genreId) {
      const data = await fetchByGenre(filterItem.genreId, filterItem.type || 'movie');
      setGenreResults(data || []);
    } else if (filterItem.type === 'series') {
      setGenreResults(popularTV);
    } else if (filterItem.type === 'movie') {
      setGenreResults(popularMovies);
    }
    setLoadingGenre(false);
  };

  // Debounced Live TMDB Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const delayTimer = setTimeout(async () => {
      const results = await searchTMDB(searchQuery);
      setSearchResults(results || []);
      setSearchLoading(false);
    }, 350);

    return () => clearTimeout(delayTimer);
  }, [searchQuery]);

  const showToast = (message) => {
    setToast({ message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 3000);
  };

  // Inicialização do consentimento de anúncios & escuta de ativação VIP
  useEffect(() => {
    initAdConsent(user, profile);

    const handleVipUpdate = () => {
      disableAds(user, profile);
    };
    window.addEventListener('kairou_vip_updated', handleVipUpdate);
    window.addEventListener('borlaflix_vip_updated', handleVipUpdate);
    return () => {
      window.removeEventListener('kairou_vip_updated', handleVipUpdate);
      window.removeEventListener('borlaflix_vip_updated', handleVipUpdate);
    };
  }, [user, profile]);

  const handleSelectAdConsent = (consented) => {
    setSupportModalOpen(false);
    if (consented) {
      loadAdScript();
      showToast('Muito obrigado por apoiar o Kairou! ❤️');
    } else {
      // Usuário gratuito não pode desativar anúncios sem assinatura VIP
      const isVip = isVipUser(user, profile);
      if (isVip) {
        disableAds(user, profile);
        showToast('Modo VIP: Sem anúncios.');
      } else {
        loadAdScript();
        showToast('Anúncios mantêm o Kairou no ar. Apoie via PixGG para manter o projeto!');
      }
    }

    if (pendingPlayMedia) {
      setActiveVideoPlayer(pendingPlayMedia);
      setPendingPlayMedia(null);
    }
  };

  const isInWatchlist = (id) => watchlist.some((m) => m.id === id);

  const toggleWatchlist = (media) => {
    if (isInWatchlist(media.id)) {
      setWatchlist((prev) => prev.filter((m) => m.id !== media.id));
      showToast(`"${media.title}" foi removido da Minha Lista.`);
    } else {
      setWatchlist((prev) => [media, ...prev]);
      showToast(`"${media.title}" foi adicionado à Minha Lista.`);
    }
  };

  const handlePlayMedia = (media, episode = null, options = {}) => {
    // Apenas usuários logados podem assistir filmes, séries e canais
    if (!user) {
      setPendingPlayMedia({ media, episode, ...options });
      setAuthModalMode('login');
      setAuthModalOpen(true);
      showToast('Faça login ou crie uma conta gratuita para assistir!');
      return;
    }

    const isVip = isVipUser(user, profile);
    if (isVip) {
      // Assinante VIP: Zero anúncios, servidores 4K e bitrate máximo
      disableAds(user, profile);
      setActiveVideoPlayer({ media, episode, ...options });
      showToast('👑 Reproduzindo em modo VIP: Zero Anúncios & 4K!');
    } else {
      // Usuário Gratuito: Anúncios ativados apenas no momento da reprodução
      loadWatchingAds(user, profile);
      setActiveVideoPlayer({ media, episode, ...options });
    }
  };

  const handleOpenDetails = (media) => {
    setActiveMediaModal(media);
  };

  // Featured Hero titles from live TMDB
  const featuredHeroes = useMemo(() => {
    let list = [];
    if (activeTab === 'anime') {
      list = animeSeries.length > 0 ? animeSeries.slice(0, 5) : [];
    } else if (activeTab === 'series') {
      list = popularTV.slice(0, 4);
    } else if (activeTab === 'movies') {
      list = popularMovies.slice(0, 4);
    } else {
      list = trendingAll.slice(0, 5);
    }

    if (adminSpotlight && activeTab === 'home') {
      return [adminSpotlight, ...list.filter((item) => String(item.id) !== String(adminSpotlight.id))];
    }
    return list;
  }, [trendingAll, popularTV, popularMovies, animeSeries, activeTab, adminSpotlight]);

  // Modo Manutenção Preventiva (bloqueia visitantes, ou quando o admin ativa "Ver como Visitante")
  if (isMaintenance && (!isUserAdmin(user) || previewVisitorMaintenance)) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
        {previewVisitorMaintenance && (
          <div className="fixed top-5 z-50 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-2xl text-xs font-bold backdrop-blur-md flex items-center gap-3 shadow-2xl">
            <AlertTriangle size={16} />
            <span>👀 Visualizando modo visitante (simulação da tela de bloqueio)</span>
            <button
              onClick={() => setPreviewVisitorMaintenance(false)}
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
            >
              Voltar ao Painel Admin
            </button>
          </div>
        )}

        <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 animate-pulse shadow-lg shadow-amber-500/10">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Kairou em Manutenção Preventiva</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mt-3 leading-relaxed">
          Estamos aprimorando a infraestrutura de servidores e adicionando novos títulos e canais em alta velocidade. Voltaremos em breve!
        </p>

        {!isUserAdmin(user) && (
          <button
            onClick={() => {
              setAuthModalMode('login');
              setAuthModalOpen(true);
            }}
            className="mt-8 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Acesso Administrativo (Login)
          </button>
        )}

        {authModalOpen && (
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            initialMode={authModalMode}
            onAuthSuccess={async (u) => {
              setUser(u);
              const p = await getUserProfile(u.id);
              setProfile(p);
              loadUserProgress();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-sky-500/30 selection:text-sky-200">
      {/* Alerta de Manutenção Ativa Exclusivo para o Administrador */}
      {isMaintenance && isUserAdmin(user) && !previewVisitorMaintenance && (
        <div className="sticky top-0 z-[100] bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 text-white px-4 py-2 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-2xl border-b border-amber-300/40">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-200 shrink-0" />
            <span>
              MODO MANUTENÇÃO ATIVO: O site está bloqueado para todos os visitantes normais no mundo todo.
              Você está navegando com passe livre de Administrador.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewVisitorMaintenance(true)}
              className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-white text-[11px] font-semibold border border-white/20 transition-all cursor-pointer"
            >
              👁️ Ver como Visitante
            </button>
            <button
              onClick={() => {
                setMaintenanceMode(false);
                setIsMaintenance(false);
                showToast('Modo manutenção desativado!');
              }}
              className="px-2.5 py-1 rounded-lg bg-white text-rose-700 hover:bg-rose-50 text-[11px] font-black transition-all cursor-pointer shadow-sm"
            >
              Desativar Agora
            </button>
          </div>
        </div>
      )}

      {/* Global Announcement Broadcast Banner */}
      <GlobalAnnouncementBanner />

      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedFilter(GENRE_FILTERS[0]);
          setGenreResults([]);
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        watchlistCount={watchlist.length}
        user={user}
        profile={profile}
        onOpenAuth={() => {
          setAuthModalMode('login');
          setAuthModalOpen(true);
        }}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenAdmin={() => setAdminModalOpen(true)}
        onOpenSubscription={() => setVipModalOpen(true)}
        onOpenDonation={() => window.open('https://pixgg.com/pommern', '_blank')}
        onSignOut={handleSignOut}
      />

      {/* Main Streaming Experience */}
      <main className="flex-1 w-full">
        {/* VIEW 1: Live TMDB Search */}
        {searchQuery ? (
          <SearchResults
            searchQuery={searchQuery}
            results={searchResults}
            loading={searchLoading}
            onPlay={handlePlayMedia}
            onOpenDetails={handleOpenDetails}
            onToggleWatchlist={toggleWatchlist}
            isInWatchlist={isInWatchlist}
            onClearSearch={() => setSearchQuery('')}
          />
        ) : activeTab === 'watchlist' ? (
          /* VIEW 2: Minha Lista */
          <WatchlistTab
            watchlist={watchlist}
            onPlay={handlePlayMedia}
            onOpenDetails={handleOpenDetails}
            onToggleWatchlist={toggleWatchlist}
            isInWatchlist={isInWatchlist}
            onExploreCatalog={() => setActiveTab('home')}
          />
        ) : activeTab === 'channels' ? (
          /* VIEW: Canais de TV Ao Vivo */
          <ChannelsTab
            onPlayChannel={handlePlayMedia}
          />
        ) : initialLoading ? (
          /* Initial Loading Skeleton */
          <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="text-sky-400 animate-spin" />
            <span className="text-xs text-slate-400 font-medium tracking-wide">
              Carregando catálogo...
            </span>
          </div>
        ) : (
          /* VIEW 3: Direct Streaming Experience */
          <>
            {/* Cinematic Hero Spotlight */}
            {featuredHeroes.length > 0 && (
              <HeroBanner
                featuredItems={featuredHeroes}
                user={user}
                onPlay={handlePlayMedia}
                onOpenDetails={handleOpenDetails}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            )}

            {/* Continuar Assistindo (Progresso Salvo na Nuvem) */}
            {activeTab === 'home' && (
              <ContinueWatchingRow
                user={user}
                items={watchProgressList}
                loading={loadingWatchProgress}
                onPlay={handlePlayMedia}
                onRemove={handleRemoveWatchProgress}
                onOpenAuth={() => {
                  setAuthModalMode('login');
                  setAuthModalOpen(true);
                }}
              />
            )}

            {/* Quick Filters */}
            <CategoryFilters
              selectedFilterId={selectedFilter.id}
              onSelectFilter={handleSelectFilter}
            />

            {/* Catalog Rails Container */}
            <div className="space-y-4 sm:space-y-6 pb-20">
              {/* Filtered View if a specific genre or filter is active */}
              {selectedFilter.id !== 'all' ? (
                loadingGenre ? (
                  <div className="py-20 flex items-center justify-center gap-2 text-slate-400 text-xs">
                    <Loader2 size={18} className="animate-spin text-sky-400" />
                    <span>Carregando títulos de {selectedFilter.label}...</span>
                  </div>
                ) : (
                  <MediaRow
                    title={`Catálogo: ${selectedFilter.label}`}
                    subtitle={`Títulos em destaque disponíveis para você`}
                    items={genreResults}
                    aspect="poster"
                    onPlay={handlePlayMedia}
                    onOpenDetails={handleOpenDetails}
                    onToggleWatchlist={toggleWatchlist}
                    isInWatchlist={isInWatchlist}
                  />
                )
              ) : (
                /* Complete Rails Experience */
                <>
                  {/* ANIME TAB DEDICATED VIEW */}
                  {activeTab === 'anime' ? (
                    <>
                      {/* Top 10 Anime */}
                      {topAnime.length > 0 && (
                        <MediaRow
                          title="Top 10 Animes Mais Bem Avaliados"
                          subtitle="As obras-primas da animação japonesa consagradas pelo público e pela crítica"
                          items={topAnime}
                          isTop10={true}
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Anime Series */}
                      {animeSeries.length > 0 && (
                        <MediaRow
                          title="Séries de Anime Para Maratonar"
                          subtitle="Os maiores sucessos e estreias dos estúdios japoneses"
                          items={animeSeries}
                          aspect="backdrop"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Anime Movies */}
                      {animeMovies.length > 0 && (
                        <MediaRow
                          title="Filmes de Anime em Destaque 4K"
                          subtitle="Longas-metragens e sucessos cinematográficos da animação"
                          items={animeMovies}
                          aspect="poster"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Animation Classics */}
                      {animationMedia.length > 0 && (
                        <MediaRow
                          title="Grandes Animações Mundiais"
                          subtitle="Clássicos e produções premiadas para todas as idades"
                          items={animationMedia}
                          aspect="poster"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}
                    </>
                  ) : (
                    /* HOME, SERIES, OR MOVIES TABS */
                    <>
                      {/* Top 10 Rail */}
                      {activeTab === 'home' && topRated.length > 0 && (
                        <MediaRow
                          title="Top 10 da Semana no Kairou"
                          subtitle="Os filmes mais bem avaliados pela crítica e público mundial"
                          items={topRated}
                          isTop10={true}
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Trending Rail */}
                      {activeTab !== 'movies' && trendingAll.length > 0 && (
                        <MediaRow
                          title="Em Alta na Semana"
                          subtitle="Os títulos mais populares globalmente"
                          items={trendingAll}
                          aspect="backdrop"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Popular Movies Rail */}
                      {activeTab !== 'series' && popularMovies.length > 0 && (
                        <MediaRow
                          title="Filmes em Destaque 4K UHD"
                          subtitle="Sucessos de bilheteria e grandes lançamentos"
                          items={popularMovies}
                          aspect="poster"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Popular Series Rail */}
                      {activeTab !== 'movies' && popularTV.length > 0 && (
                        <MediaRow
                          title="Séries Para Maratonar"
                          subtitle="As produções de TV mais assistidas no momento"
                          items={popularTV}
                          aspect="backdrop"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Anime Spotlight on Home/Series */}
                      {activeTab !== 'movies' && animeSeries.length > 0 && (
                        <MediaRow
                          title="Universo Anime em Alta"
                          subtitle="Shonen, Seinen, Isekai e grandes aventuras japonesas"
                          items={animeSeries}
                          aspect="backdrop"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Anime Movies on Movies tab */}
                      {activeTab === 'movies' && animeMovies.length > 0 && (
                        <MediaRow
                          title="Filmes de Anime 4K"
                          subtitle="Grandes produções e longas de anime do cinema"
                          items={animeMovies}
                          aspect="poster"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Sci-Fi & Future Rail */}
                      {scifiMovies.length > 0 && (
                        <MediaRow
                          title="Ficção Científica & Futuro"
                          subtitle="Exploração espacial, realidades alternativas e distopias"
                          items={scifiMovies}
                          aspect="poster"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Action & Adrenaline Rail */}
                      {actionMovies.length > 0 && (
                        <MediaRow
                          title="Ação & Adrenalina"
                          subtitle="Combates e grandes perseguições cinematográficas"
                          items={actionMovies}
                          aspect="poster"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Animation Rail */}
                      {animationMedia.length > 0 && (
                        <MediaRow
                          title="Grandes Animações"
                          subtitle="Obras-primas da animação mundial"
                          items={animationMedia}
                          aspect="poster"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Seção de Assinatura VIP no Catálogo */}
            <DonationSection onOpenVipModal={() => setVipModalOpen(true)} />
          </>
        )}
      </main>

      {/* Media Details Modal */}
      {activeMediaModal && (
        <MediaModal
          media={activeMediaModal}
          user={user}
          profile={profile}
          onClose={() => setActiveMediaModal(null)}
          onPlay={handlePlayMedia}
          onOpenSubscription={() => setVipModalOpen(true)}
          onToggleWatchlist={toggleWatchlist}
          isInWatchlist={isInWatchlist}
          onSelectMedia={(newMedia) => setActiveMediaModal(newMedia)}
        />
      )}

      {/* Video Player */}
      {activeVideoPlayer && (
        <VideoPlayer
          media={activeVideoPlayer.media}
          episode={activeVideoPlayer.episode}
          initialTime={activeVideoPlayer.initialTime || 0}
          autoCast={Boolean(activeVideoPlayer.autoCast)}
          user={user}
          profile={profile}
          onOpenSubscription={() => setVipModalOpen(true)}
          onClose={() => {
            setActiveVideoPlayer(null);
            unloadWatchingAds();
            loadUserProgress();
          }}
        />
      )}

      {/* Auth Modal (Login / Cadastro via Supabase) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={async (u) => {
          setUser(u);
          const p = await getUserProfile(u.id);
          setProfile(p);
          loadUserProgress();
          showToast(`Bem-vindo(a) ao Kairou, ${p?.display_name || u.user_metadata?.display_name || 'Membro'}!`);
          if (pendingPlayMedia) {
            const isVip = isVipUser(u, p);
            if (isVip) {
              disableAds(u, p);
              showToast('👑 VIP Reconhecido: Zero Anúncios!');
            } else {
              loadWatchingAds(u, p);
            }
            setActiveVideoPlayer(pendingPlayMedia);
            setPendingPlayMedia(null);
          }
        }}
      />

      {/* Profile Modal (Editar Nome & Foto de Perfil) */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        profile={profile}
        onProfileUpdated={(updated) => {
          setProfile(updated);
          showToast('Perfil atualizado com sucesso!');
        }}
        onOpenAdmin={() => setAdminModalOpen(true)}
        onOpenSubscription={() => setVipModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Admin Panel Modal (Exclusivo para shizuu122@gmail.com) */}
      <AdminPanelModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        user={user}
        showToast={showToast}
        onPreviewMaintenance={() => {
          setAdminModalOpen(false);
          setPreviewVisitorMaintenance(true);
        }}
      />

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Modal de Assinatura VIP (MB WAY & Criptomoedas) */}
      <VipSubscriptionModal
        isOpen={vipModalOpen || donationModalOpen}
        onClose={() => {
          setVipModalOpen(false);
          setDonationModalOpen(false);
        }}
        user={user}
        profile={profile}
        onVipActivated={() => {
          showToast('🎉 Assinatura VIP ativada com sucesso! Aproveite 4K e Zero Anúncios.');
          disableAds(user, profile);
        }}
      />

      {/* Footer */}
      <Footer
        onOpenSubscription={() => setVipModalOpen(true)}
        onOpenDonation={() => window.open('https://pixgg.com/pommern', '_blank')}
      />
    </div>
  );
}
