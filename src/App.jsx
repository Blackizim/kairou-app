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
import DonationSection from './components/DonationSection';
import SupportPromptModal from './components/SupportPromptModal';
import HalloweenSection from './components/HalloweenSection';
import { initAdConsent, setAdConsent } from './services/adConsent';

import { Loader2 } from 'lucide-react';
import {
  supabase,
  getUserProfile,
  signOutUser,
  getWatchProgressList,
  removeWatchProgress
} from './services/supabase';

import {
  fetchHeroHighlights,
  fetchWeeklyTrendingMovies,
  fetchTrending,
  fetchTopRatedMovies,
  fetchPopularMovies,
  fetchNowPlaying,
  fetchPopularTV,
  fetchTrendingTVWeekly,
  fetchHorrorMovies,
  fetchByGenre,
  fetchAnimeSeries,
  fetchAnimeMovies,
  fetchTopAnime,
  searchTMDB,
  GENRE_FILTERS
} from './services/tmdb';

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'series', 'movies', 'anime', 'watchlist', 'channels'
  const [selectedFilter, setSelectedFilter] = useState(GENRE_FILTERS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // TMDB Catalogs
  const [heroHighlights, setHeroHighlights] = useState([]);
  const [weeklyTrendingMovies, setWeeklyTrendingMovies] = useState([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [horrorMovies, setHorrorMovies] = useState([]);
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

  // Modal de doação PixGG & Apoio com Anúncios
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
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
        loadUserProgress();
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
        loadUserProgress();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProgress]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      setProfile(null);
      loadUserProgress();
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
          heroes,
          trending,
          weeklyMovies,
          popMovies,
          nowPlaying,
          popTV,
          trendTV,
          topRatedMovies,
          action,
          scifi,
          horror,
          animation,
          animesTV,
          animesMovies,
          topAnimes
        ] = await Promise.all([
          fetchHeroHighlights(),
          fetchTrending('all', 'week'),
          fetchWeeklyTrendingMovies(),
          fetchPopularMovies(),
          fetchNowPlaying('BR'),
          fetchPopularTV(),
          fetchTrendingTVWeekly(),
          fetchTopRatedMovies(),
          fetchByGenre(28, 'movie'), // Ação
          fetchByGenre(878, 'movie'), // Ficção Científica
          fetchHorrorMovies(), // Uma Noite de Terror
          fetchByGenre(16, 'movie'), // Animação
          fetchAnimeSeries(), // Séries de Anime
          fetchAnimeMovies(), // Filmes de Anime
          fetchTopAnime(), // Animes Mais Bem Avaliados
        ]);

        if (!isMounted) return;

        setHeroHighlights(heroes || []);
        setTrendingAll(trending || []);
        setWeeklyTrendingMovies(weeklyMovies || []);
        setPopularMovies(popMovies || []);
        setNowPlayingMovies(nowPlaying || []);
        setPopularTV(popTV || []);
        setTrendingTV(trendTV || []);
        setTopRated(topRatedMovies || []);
        setActionMovies(action || []);
        setScifiMovies(scifi || []);
        setHorrorMovies(horror || []);
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

  // Inicialização do AdShield (Garante plataforma 100% livre de anúncios)
  useEffect(() => {
    initAdConsent();
  }, []);

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
    // Exibe tela com escolha: assistir com anúncios, sem anúncios ou apoiar Pix
    setPendingPlayMedia({ media, episode, ...options });
    setSupportModalOpen(true);
  };

  const handleSelectAdConsent = (consented) => {
    setAdConsent(consented);
    setSupportModalOpen(false);

    if (consented) {
      showToast('Muito obrigado por apoiar o Kairou! ❤️');
    } else {
      showToast('Iniciando sem anúncios.');
    }

    if (pendingPlayMedia) {
      setActiveVideoPlayer(pendingPlayMedia);
      setPendingPlayMedia(null);
    }
  };

  const handleOpenDetails = (media) => {
    setActiveMediaModal(media);
  };

  // Featured Hero titles (4 destaques mensais do TMDB com logos oficiais em PNG)
  const featuredHeroes = useMemo(() => {
    let list = [];
    if (activeTab === 'anime') {
      list = animeSeries.length > 0 ? animeSeries.slice(0, 4) : [];
    } else if (activeTab === 'series') {
      list = trendingTV.length > 0 ? trendingTV.slice(0, 4) : popularTV.slice(0, 4);
    } else if (activeTab === 'movies') {
      list = nowPlayingMovies.length > 0 ? nowPlayingMovies.slice(0, 4) : popularMovies.slice(0, 4);
    } else {
      list = heroHighlights.length > 0 ? heroHighlights.slice(0, 4) : trendingAll.slice(0, 4);
    }
    return list;
  }, [heroHighlights, trendingAll, trendingTV, popularTV, nowPlayingMovies, popularMovies, animeSeries, activeTab]);

  return (
    <div className="min-h-screen bg-[#0b0e15] text-[#f4f6fb] flex flex-col selection:bg-sky-500/30 selection:text-sky-200">
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
                isPaused={
                  Boolean(
                    activeVideoPlayer ||
                    activeMediaModal ||
                    authModalOpen ||
                    profileModalOpen ||
                    supportModalOpen ||
                    donationModalOpen ||
                    searchQuery.trim().length > 0
                  )
                }
              />
            )}

            {/* Continuar Assistindo (Progresso Salvo na Nuvem - Apenas para usuários autenticados) */}
            {activeTab === 'home' && user && watchProgressList.length > 0 && (
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
            <div className="content-sections pb-20">
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

                      {/* Halloween Interactive Spotlight (kai4) */}
                      {activeTab === 'home' && (
                        <HalloweenSection
                          onSelectHorror={() => handleSelectFilter({ id: '27', label: 'Terror', genreId: 27, type: 'movie' })}
                          posters={actionMovies.slice(0, 2)}
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
                      {/* Top 10 Rail: /trending/movie/week (1 a 10 pela ordem de tendências do TMDB) */}
                      {activeTab === 'home' && (weeklyTrendingMovies.length > 0 || topRated.length > 0) && (
                        <MediaRow
                          title="Top 10 da Semana no Kairou"
                          subtitle="Os filmes mais assistidos e em alta nesta semana"
                          items={(weeklyTrendingMovies.length > 0 ? weeklyTrendingMovies : topRated).slice(0, 10)}
                          isTop10={true}
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Em Alta na Semana: /trending/all/week */}
                      {activeTab !== 'movies' && trendingAll.length > 0 && (
                        <MediaRow
                          title="Em Alta na Semana"
                          subtitle="Os títulos mais populares globalmente"
                          items={trendingAll.slice(0, 16)}
                          aspect="backdrop"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Agora nos Cinemas: /movie/now_playing?region=BR */}
                      {activeTab !== 'series' && nowPlayingMovies.length > 0 && (
                        <MediaRow
                          title="Agora nos Cinemas"
                          subtitle="Grandes lançamentos em cartaz nas salas de cinema do Brasil"
                          items={nowPlayingMovies.slice(0, 16)}
                          aspect="poster"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Séries Para Maratonar: /trending/tv/week */}
                      {activeTab !== 'movies' && (trendingTV.length > 0 || popularTV.length > 0) && (
                        <MediaRow
                          title="Séries Para Maratonar"
                          subtitle="As produções de TV mais assistidas no momento"
                          items={(trendingTV.length > 0 ? trendingTV : popularTV).slice(0, 16)}
                          aspect="backdrop"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Halloween Interactive Spotlight: Capas da seção de Terror */}
                      {activeTab === 'home' && (
                        <HalloweenSection
                          onSelectHorror={() => handleSelectFilter({ id: '27', label: 'Terror', genreId: 27, type: 'movie' })}
                          posters={horrorMovies.length >= 2 ? horrorMovies.slice(0, 2) : actionMovies.slice(0, 2)}
                        />
                      )}

                      {/* Uma Noite de Terror: /discover/movie?with_genres=27 */}
                      {horrorMovies.length > 0 && (
                        <MediaRow
                          title="Uma Noite de Terror"
                          subtitle="Suspense psicológico, sustos e o melhor do cinema de horror"
                          items={horrorMovies.slice(0, 16)}
                          aspect="poster"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Bem Avaliados: /movie/top_rated */}
                      {topRated.length > 0 && (
                        <MediaRow
                          title="Bem Avaliados"
                          subtitle="Filmes aclamados pela crítica e pelo público mundial"
                          items={topRated.slice(0, 16)}
                          aspect="poster"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Universo Anime em Alta */}
                      {activeTab !== 'movies' && animeSeries.length > 0 && (
                        <MediaRow
                          title="Universo Anime em Alta"
                          subtitle="Shonen, Seinen, Isekai e grandes aventuras japonesas"
                          items={animeSeries.slice(0, 16)}
                          aspect="backdrop"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Filmes em Destaque 4K UHD */}
                      {activeTab !== 'series' && popularMovies.length > 0 && (
                        <MediaRow
                          title="Filmes em Destaque 4K UHD"
                          subtitle="Sucessos de bilheteria e grandes produções cinematográficas"
                          items={popularMovies.slice(0, 16)}
                          aspect="poster"
                          onPlay={handlePlayMedia}
                          onOpenDetails={handleOpenDetails}
                          onToggleWatchlist={toggleWatchlist}
                          isInWatchlist={isInWatchlist}
                        />
                      )}

                      {/* Filmes de Anime na Aba Filmes */}
                      {activeTab === 'movies' && animeMovies.length > 0 && (
                        <MediaRow
                          title="Filmes de Anime 4K"
                          subtitle="Grandes produções e longas de anime do cinema"
                          items={animeMovies.slice(0, 16)}
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
                          items={scifiMovies.slice(0, 16)}
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
                          items={actionMovies.slice(0, 16)}
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
                          subtitle="Obras-primas da animação mundial para todas as idades"
                          items={animationMedia.slice(0, 16)}
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

            {/* Seção de Doação PixGG no Catálogo */}
            <DonationSection />
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
          onClose={() => {
            setActiveVideoPlayer(null);
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
        onSignOut={handleSignOut}
      />

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Modal de Escolha: Assistir com anúncios, sem anúncios ou apoiar Pix */}
      <SupportPromptModal
        isOpen={supportModalOpen}
        onSelectChoice={handleSelectAdConsent}
        onOpenDonation={() => {
          setSupportModalOpen(false);
          setDonationModalOpen(true);
          if (pendingPlayMedia) {
            setActiveVideoPlayer(pendingPlayMedia);
            setPendingPlayMedia(null);
          }
        }}
      />

      {/* Modal de Doação PixGG */}
      {donationModalOpen && (
        <DonationSection
          isModal={true}
          onClose={() => setDonationModalOpen(false)}
        />
      )}

      {/* Footer */}
      <Footer
        onOpenDonation={() => setDonationModalOpen(true)}
      />
    </div>
  );
}
