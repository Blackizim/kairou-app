import React, { useState, useEffect, useRef } from 'react';
import {
  KaiSearch,
  KaiClose,
  KaiHome,
  KaiFilm,
  KaiSeries,
  KaiAnime,
  KaiTv,
  KaiHeart,
  KaiTelegram,
} from './KaiIcons';

export default function Navbar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  watchlistCount = 0,
  user,
  profile,
  onOpenAuth,
  onOpenProfile,
  onOpenDonation,
  onSignOut,
}) {
  const [barAlpha, setBarAlpha] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef(null);

  // Dynamic alpha on scroll matching kai4
  useEffect(() => {
    let pendingScroll = false;
    const handleScroll = () => {
      if (pendingScroll) return;
      pendingScroll = true;
      requestAnimationFrame(() => {
        const alpha = Math.min(Math.max(window.scrollY, 0) / 180, 1) * 0.97;
        setBarAlpha(alpha);
        pendingScroll = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => document.body.classList.remove('menu-open');
  }, [mobileMenuOpen]);

  const handleOpenSearch = () => {
    setMobileMenuOpen(false);
    setSearchOpen(true);
    document.body.classList.add('search-open');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    document.body.classList.remove('search-open');
  };

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setSearchQuery('');
    setMobileMenuOpen(false);
    setSearchOpen(false);
    document.body.classList.remove('search-open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine user avatar initial
  const userInitial = profile?.display_name?.[0] || user?.user_metadata?.display_name?.[0] || user?.email?.[0] || 'K';

  return (
    <>
      <header
        id="topbar"
        style={{ '--bar-alpha': barAlpha, background: `rgba(9, 13, 20, ${barAlpha})` }}
      >
        <div className="topbar-inner">
          {/* Brand Logo */}
          <a
            className="brand"
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              handleSelectTab('home');
            }}
            aria-label="Kairou início"
          >
            <img src="/kairou.svg" alt="Kairou" />
            <span>kairou</span>
          </a>

          {/* Desktop Nav */}
          <nav className="desktop-nav" aria-label="Menu principal">
            <button
              onClick={() => handleSelectTab('home')}
              className={activeTab === 'home' && !searchQuery ? 'active' : ''}
            >
              Início
            </button>
            <button
              onClick={() => handleSelectTab('movies')}
              className={activeTab === 'movies' && !searchQuery ? 'active' : ''}
            >
              Filmes
            </button>
            <button
              onClick={() => handleSelectTab('series')}
              className={activeTab === 'series' && !searchQuery ? 'active' : ''}
            >
              Séries
            </button>
            <button
              onClick={() => handleSelectTab('anime')}
              className={activeTab === 'anime' && !searchQuery ? 'active' : ''}
            >
              Animes
            </button>
            <button
              onClick={() => handleSelectTab('channels')}
              className={activeTab === 'channels' && !searchQuery ? 'active' : ''}
            >
              Canais
            </button>
            <button
              onClick={() => handleSelectTab('watchlist')}
              className={activeTab === 'watchlist' && !searchQuery ? 'active' : ''}
            >
              Minha lista
              {watchlistCount > 0 && <span className="list-dot" />}
            </button>
          </nav>

          {/* Header Actions */}
          <div className="header-actions">
            {/* Desktop Community buttons */}
            <div className="desktop-community" aria-label="Apoio e comunidade">
              <a
                href="https://pixgg.com/pommern"
                target="_blank"
                rel="noopener noreferrer"
                className="community-button community-donate"
                aria-label="Doar via PixGG"
                title="Apoiar com qualquer valor via Pix"
              >
                <KaiHeart size={13} />
                <span className="community-text">Doar</span>
              </a>
              <a
                href="https://t.me/+MIU924pI1MoyYTRk"
                target="_blank"
                rel="noopener noreferrer"
                className="community-button community-telegram"
                aria-label="Comunidade Telegram"
                title="Canal e grupo no Telegram"
              >
                <KaiTelegram size={14} />
                <span className="community-text">Telegram</span>
              </a>
            </div>

            {/* Expandable Search Shell */}
            <div
              className={`search-shell ${searchOpen || searchQuery ? 'open' : ''}`}
              id="search-shell"
            >
              <button
                className="circle search-toggle"
                id="search-toggle"
                onClick={searchOpen || searchQuery ? handleCloseSearch : handleOpenSearch}
                aria-label="Abrir busca"
                aria-expanded={searchOpen || Boolean(searchQuery)}
              >
                <KaiSearch size={14} />
              </button>
              <input
                ref={searchInputRef}
                id="search-input"
                type="search"
                autoComplete="off"
                placeholder="Buscar filmes, séries…"
                aria-label="Buscar filmes e séries"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleCloseSearch();
                }}
              />
              {(searchOpen || searchQuery) && (
                <button
                  className="search-close"
                  id="search-close"
                  onClick={handleCloseSearch}
                  aria-label="Fechar busca"
                >
                  <KaiClose size={11} />
                </button>
              )}
            </div>

            {/* Profile Avatar Button */}
            <button
              className="profile"
              id="profile"
              onClick={() => {
                if (user) {
                  onOpenProfile();
                } else {
                  onOpenAuth();
                }
              }}
              aria-label={user ? 'Meu perfil' : 'Entrar na conta'}
              title={user ? (profile?.display_name || user.email) : 'Entrar ou Criar Conta'}
            >
              {userInitial.toUpperCase()}
            </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              className="circle menu-toggle"
              id="menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Abrir menu"
              aria-expanded={mobileMenuOpen}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop Veil */}
      <div
        className="menu-veil"
        id="menu-veil"
        hidden={!mobileMenuOpen}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu Drawer */}
      <aside
        className={`menu ${mobileMenuOpen ? 'open' : ''}`}
        id="menu"
        aria-label="Menu"
      >
        <div className="menu-top">
          <a
            className="brand"
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              handleSelectTab('home');
            }}
          >
            <img src="/kairou.svg" alt="" />
            <span>kairou</span>
          </a>
          <button
            className="circle"
            id="menu-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
          >
            <KaiClose size={12} />
          </button>
        </div>

        <span className="menu-label">EXPLORE</span>
        <nav className="drawer-nav" aria-label="Categorias">
          <button
            onClick={() => handleSelectTab('home')}
            className={activeTab === 'home' && !searchQuery ? 'active' : ''}
          >
            <span><KaiHome size={15} /></span>
            <span>
              Início
              <small>Veja os destaques</small>
            </span>
          </button>
          <button
            onClick={() => handleSelectTab('movies')}
            className={activeTab === 'movies' && !searchQuery ? 'active' : ''}
          >
            <span><KaiFilm size={15} /></span>
            <span>
              Filmes
              <small>Encontre seu próximo filme</small>
            </span>
          </button>
          <button
            onClick={() => handleSelectTab('series')}
            className={activeTab === 'series' && !searchQuery ? 'active' : ''}
          >
            <span><KaiSeries size={15} /></span>
            <span>
              Séries
              <small>Escolha sua próxima maratona</small>
            </span>
          </button>
          <button
            onClick={() => handleSelectTab('anime')}
            className={activeTab === 'anime' && !searchQuery ? 'active' : ''}
          >
            <span><KaiAnime size={15} /></span>
            <span>
              Animes
              <small>Histórias para descobrir</small>
            </span>
          </button>
          <button
            onClick={() => handleSelectTab('channels')}
            className={activeTab === 'channels' && !searchQuery ? 'active' : ''}
          >
            <span><KaiTv size={15} /></span>
            <span>
              Canais Ao Vivo
              <small>Televisão em tempo real</small>
            </span>
          </button>
          <button
            onClick={() => handleSelectTab('watchlist')}
            className={activeTab === 'watchlist' && !searchQuery ? 'active' : ''}
          >
            <span><KaiHeart size={15} /></span>
            <span>
              Minha lista
              <small>O que você quer assistir</small>
            </span>
            <b className="saved-count">{watchlistCount}</b>
          </button>
        </nav>

        <div className="menu-links">
          <span className="menu-label">APOIO E COMUNIDADE</span>
          <a
            href="https://pixgg.com/pommern"
            target="_blank"
            rel="noopener noreferrer"
            className="support-link"
          >
            <span><KaiHeart size={16} /></span>
            <span>
              Apoiar o projeto
              <small>Ajude o Kairou a crescer via Pix</small>
            </span>
          </a>
          <a
            href="https://t.me/+MIU924pI1MoyYTRk"
            target="_blank"
            rel="noopener noreferrer"
            className="telegram-link"
          >
            <span><KaiTelegram size={16} /></span>
            <span>
              Comunidade Telegram
              <small>Novidades e suporte direto</small>
            </span>
          </a>
        </div>

        <div className="menu-foot">
          Filmes, séries e animes. Do seu jeito.
        </div>
      </aside>
    </>
  );
}
