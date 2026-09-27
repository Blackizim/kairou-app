import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, X, Play, ChevronDown, Bookmark, SlidersHorizontal, Menu, User, LogOut, Edit3, Heart } from 'lucide-react';
import KairouIcon from './KairouIcon';
import { TelegramIcon } from './DiscordNoticeModal';

export default function Navbar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  watchlistCount,
  user,
  profile,
  onOpenAuth,
  onOpenProfile,
  onOpenDiscordNotice,
  onOpenDonation,
  onSignOut,
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', label: 'Início' },
    { id: 'series', label: 'Séries' },
    { id: 'movies', label: 'Filmes' },
    { id: 'anime', label: 'Animes' },
    { id: 'channels', label: 'Canais' },
    { id: 'watchlist', label: `Minha Lista ${watchlistCount > 0 ? `(${watchlistCount})` : ''}` },
  ];

  const handleSearchToggle = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#07090e]/95 backdrop-blur-xl border-b border-white/[0.08] py-3 shadow-md'
          : 'bg-gradient-to-b from-[#07090e]/90 via-[#07090e]/40 to-transparent py-5'
      }`}
    >
      <div className="max-w-[1680px] mx-auto px-3 sm:px-8 lg:px-12 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Desktop Navigation */}
        <div className="flex items-center gap-4 sm:gap-8 lg:gap-10 shrink-0">
          <button
            onClick={() => {
              setActiveTab('home');
              setSearchQuery('');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 group focus:outline-none"
          >
            <KairouIcon size={34} className="group-hover:scale-110 transition-transform" />
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center">
              kai<span className="text-sky-400">rou</span>
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id && !searchQuery;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSearchQuery('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                    isActive
                      ? 'text-sky-400 bg-sky-500/10 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Tools: Live Search, Notifications, Profile, Hamburger */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {/* TMDB Live Search Bar */}
          <div className="relative flex items-center">
            <div
              className={`flex items-center transition-all duration-300 rounded-full ${
                searchOpen || searchQuery
                  ? 'w-36 sm:w-72 bg-[#131822] border border-slate-700 px-2.5 sm:px-3 py-1.5'
                  : 'w-9 h-9 justify-center hover:bg-slate-800/60'
              }`}
            >
              <Search
                onClick={handleSearchToggle}
                className={`w-4 h-4 cursor-pointer transition-colors flex-shrink-0 ${
                  searchOpen || searchQuery ? 'text-sky-400' : 'text-slate-300 hover:text-white'
                }`}
              />
              {(searchOpen || searchQuery) && (
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar filmes, séries, animes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 ml-2 focus:outline-none"
                />
              )}
              {(searchOpen || searchQuery) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className="text-slate-400 hover:text-white ml-1 p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Botão de Doações Pix */}
          <button
            onClick={onOpenDonation}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/35 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
            title="Apoiar o Kairou com qualquer valor via Pix"
            aria-label="Doar via Pix"
          >
            <Heart size={13} className="fill-emerald-400 text-emerald-400" />
            <span>Doar Pix</span>
          </button>

          {/* Telegram Community Button (Desktop / Tablet) */}
          <a
            href="https://t.me/+MIU924pI1MoyYTRk"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center text-slate-300 hover:text-[#229ED9] hover:bg-[#229ED9]/10 transition-all relative cursor-pointer"
            title="Telegram Oficial — Suporte 24h & Avisos"
            aria-label="Telegram Oficial"
          >
            <TelegramIcon size={18} className="fill-current" />
          </a>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors relative"
              aria-label="Notificações"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-sky-400 rounded-full"></span>
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-88 rounded-2xl bg-[#131822] border border-white/[0.08] shadow-2xl p-4 animate-scale-in z-50">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-semibold text-white">Lançamentos Recentes</span>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Fechar
                  </button>
                </div>
                <div className="mt-3 space-y-2 text-xs text-slate-300">
                  <div className="p-2 rounded-lg bg-slate-800/40">
                    <p className="font-semibold text-white">Catálogo Sincronizado</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Filmes e séries mundiais atualizados em tempo real com áudio e legendas.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Login Button */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-800/60 transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-sky-400/60 bg-slate-800 flex items-center justify-center">
                  <img
                    src={profile?.avatar_url || user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                    alt="Perfil"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-[#0f141e] border border-white/[0.1] shadow-2xl p-3 animate-scale-in z-50">
                  <div className="px-3 py-2 border-b border-slate-800/80">
                    <p className="text-xs font-bold text-white truncate">
                      {profile?.display_name || user.user_metadata?.display_name || 'Membro Kairou'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>
                  </div>
                  <div className="space-y-1 mt-2 text-xs">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors flex items-center gap-2.5 font-medium"
                    >
                      <Edit3 size={14} className="text-sky-400" />
                      <span>Editar Perfil & Foto</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('watchlist');
                        setProfileOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors flex items-center gap-2.5 font-medium"
                    >
                      <Bookmark size={14} className="text-sky-400" />
                      <span>Minha Lista ({watchlistCount})</span>
                    </button>
                    <div className="pt-1.5 border-t border-slate-800/80 mt-1">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onSignOut();
                        }}
                        className="w-full text-left px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-2.5 font-semibold"
                      >
                        <LogOut size={14} />
                        <span>Sair da Conta</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center gap-1.5 hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
            >
              <User size={14} />
              <span>Entrar</span>
            </button>
          )}

          {/* Mobile Menu Burger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 min-w-[36px] rounded-xl flex items-center justify-center text-slate-200 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 shrink-0 transition-colors cursor-pointer"
            aria-label="Menu de Navegação"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#07090e]/95 border-b border-slate-800 px-6 py-4 space-y-2 backdrop-blur-xl animate-scale-in">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSearchQuery('');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === item.id && !searchQuery
                  ? 'text-sky-400 bg-sky-500/15 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* Botão Doar Pix no Menu Mobile */}
          <button
            type="button"
            onClick={() => {
              onOpenDonation();
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-400 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center gap-2.5 transition-all mt-3 cursor-pointer"
          >
            <Heart size={16} className="fill-emerald-400 text-emerald-400" />
            <span>Apoiar o Kairou (Doar Pix)</span>
          </button>

          {/* Link Telegram no Menu Mobile */}
          <a
            href="https://t.me/+MIU924pI1MoyYTRk"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold text-[#4cb8ed] hover:text-white bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/30 flex items-center gap-2.5 transition-all mt-2 cursor-pointer"
          >
            <TelegramIcon size={16} className="fill-[#229ED9]" />
            <span>Entrar no Telegram Oficial (Suporte)</span>
          </a>
        </div>
      )}
    </header>
  );
}
