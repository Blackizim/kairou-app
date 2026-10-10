import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, X, Play, ChevronDown, Bookmark, SlidersHorizontal, Menu, User, LogOut, Edit3, Heart, ShieldCheck, Crown, Sparkles, ExternalLink } from 'lucide-react';
import KairouIcon from './KairouIcon';
import { TelegramIcon } from './DiscordNoticeModal';
import { isUserAdmin } from '../services/adminAnalytics';
import { getUserLevelInfo, isVipUser } from '../services/vipService';

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
  onOpenAdmin,
  onOpenDiscordNotice,
  onOpenSubscription,
  onOpenDonation,
  onSignOut,
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const levelInfo = getUserLevelInfo(user, profile);
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

          {/* Botão de Doações Pix (PixGG) */}
          <a
            href="https://pixgg.com/pommern"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/35 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 group"
            title="Apoiar com qualquer valor via PixGG"
            aria-label="Doar via PixGG"
          >
            <Heart size={13} className="fill-emerald-400 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Doar Pix</span>
          </a>

          {/* Botão de Assinatura VIP (MB WAY & Crypto) com Glassmorphism Azul */}
          <button
            onClick={onOpenSubscription || onOpenDonation}
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500/15 via-blue-500/15 to-sky-500/15 hover:from-sky-500/25 hover:to-blue-500/25 border border-sky-400/40 backdrop-blur-md text-sky-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.15)] active:scale-95 shrink-0 group"
            title="Assinatura VIP — 100% Sem Anúncios, 4K & Downloads (Aceitamos MB WAY e Criptomoedas)"
            aria-label="Assinar Kairou VIP"
          >
            <Crown size={14} className="text-amber-400 fill-amber-400/30 group-hover:scale-110 transition-transform" />
            <span>Assinar VIP</span>
            <span className="hidden xl:inline text-[10px] text-sky-400/80 font-normal border-l border-sky-400/30 pl-1.5">MB WAY · Crypto</span>
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
            <div className="relative flex items-center gap-1.5">
              {/* Badge de Nível Visível no Topo */}
              <div
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-white/10 hover:border-sky-400/40 transition-all cursor-pointer select-none text-xs"
                title={`Nível: ${levelInfo.title} (${levelInfo.isVip ? 'VIP Diamante' : `${levelInfo.currentXp} XP`})`}
              >
                {levelInfo.isVip ? (
                  <span className="flex items-center gap-1 text-amber-300 font-extrabold text-[11px]">
                    <Crown size={12} className="fill-amber-400 text-amber-400" />
                    <span>VIP</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sky-400 text-[11px] font-bold">
                    <span>Nv. {levelInfo.level}</span>
                    <span className="text-[10px] text-slate-400 font-normal max-w-[85px] truncate">({levelInfo.title})</span>
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-800/60 transition-colors focus:outline-none"
              >
                <div className={`w-8 h-8 rounded-full overflow-hidden border ${levelInfo.isVip ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-sky-400/60'} bg-slate-800 flex items-center justify-center`}>
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
                <div className="absolute right-0 top-full mt-3 w-64 rounded-2xl bg-[#0f141e] border border-white/[0.1] shadow-2xl p-3 animate-scale-in z-50">
                  {/* Cabeçalho do Perfil com Nível e XP */}
                  <div className="px-3 py-2 border-b border-slate-800/80">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-white truncate">
                        {profile?.display_name || user.user_metadata?.display_name || 'Membro Kairou'}
                      </p>
                      {levelInfo.isVip ? (
                        <span className="flex items-center gap-1 text-[9px] font-black text-amber-300 bg-amber-500/20 border border-amber-400/35 px-1.5 py-0.5 rounded-full shrink-0">
                          <Crown size={10} className="fill-amber-400 text-amber-400" />
                          <span>VIP</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-sky-400 bg-sky-500/15 border border-sky-400/25 px-1.5 py-0.5 rounded-full shrink-0">
                          {levelInfo.tierBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>

                    {/* Barra de Progresso de XP */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                      <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
                        <span className="font-semibold text-slate-200">{levelInfo.title}</span>
                        <span className="text-slate-400 font-mono text-[9px]">
                          {levelInfo.isVip ? 'XP Máximo 👑' : `${levelInfo.currentXp} / ${levelInfo.nextLevelXp} XP`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            levelInfo.isVip
                              ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500'
                              : 'bg-gradient-to-r from-sky-400 to-blue-500'
                          }`}
                          style={{ width: `${levelInfo.progressPercent}%` }}
                        />
                      </div>

                      {!levelInfo.isVip && (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            (onOpenSubscription || onOpenDonation)?.();
                          }}
                          className="mt-2.5 w-full py-1.5 px-2 rounded-xl bg-gradient-to-r from-sky-500/20 to-blue-500/20 hover:from-sky-500/30 hover:to-blue-500/30 border border-sky-400/40 text-sky-300 hover:text-white text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Crown size={12} className="text-amber-400 fill-amber-400" />
                          <span>Virar VIP (Zero Anúncios & 4K)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 mt-2 text-xs">
                    {isUserAdmin(user) && (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onOpenAdmin?.();
                        }}
                        className="w-full text-left px-3 py-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl transition-colors flex items-center gap-2.5 font-bold border border-amber-500/25 mb-1 cursor-pointer"
                      >
                        <ShieldCheck size={14} className="text-amber-400" />
                        <span>Painel Admin</span>
                        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold uppercase tracking-wider">
                          Admin
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors flex items-center gap-2.5 font-medium"
                    >
                      <Edit3 size={14} className="text-sky-400" />
                      <span>Meu Nível & Editar Perfil</span>
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

          {/* Botão Painel Admin no Menu Mobile (Apenas shizuu122@gmail.com) */}
          {isUserAdmin(user) && (
            <button
              type="button"
              onClick={() => {
                onOpenAdmin?.();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold text-amber-400 hover:text-white bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 flex items-center justify-between transition-all mt-3 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={16} className="text-amber-400" />
                <span>Painel Administrativo</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 font-extrabold uppercase">
                Admin
              </span>
            </button>
          )}

          {/* Botão Assinatura VIP no Menu Mobile */}
          <button
            type="button"
            onClick={() => {
              (onOpenSubscription || onOpenDonation)?.();
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold text-sky-300 hover:text-white bg-gradient-to-r from-sky-500/20 via-blue-500/20 to-sky-500/20 hover:from-sky-500/30 hover:to-blue-500/30 border border-sky-400/40 backdrop-blur-md flex items-center justify-between transition-all mt-3 cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <Crown size={16} className="text-amber-400 fill-amber-400" />
              <span>Assinatura VIP (MB WAY & Crypto)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/30 text-sky-200 font-extrabold uppercase">
              Sem Anúncios
            </span>
          </button>

          {/* Botão Doar Pix (PixGG) no Menu Mobile */}
          <a
            href="https://pixgg.com/pommern"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-400 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-between transition-all mt-2.5 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Heart size={16} className="fill-emerald-400 text-emerald-400" />
              <span>Apoiar (Doar PixGG)</span>
            </div>
            <ExternalLink size={14} className="text-emerald-400" />
          </a>

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
