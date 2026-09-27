import React, { useRef } from 'react';
import { Play, X, ChevronLeft, ChevronRight, Clock, History, LogIn, Sparkles } from 'lucide-react';

export default function ContinueWatchingRow({
  user,
  items = [],
  loading = false,
  onPlay,
  onRemove,
  onOpenAuth,
}) {
  const rowRef = useRef(null);

  const scroll = (direction) => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const formatRemaining = (duration, playbackTime) => {
    const diff = Math.max(0, duration - playbackTime);
    const mins = Math.round(diff / 60);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `Restam ${h}h ${m}m`;
    }
    return `Restam ${mins} min`;
  };

  // 1. Caso o usuário NÃO esteja logado: Aviso para fazer login
  if (!user) {
    return (
      <section className="relative px-4 sm:px-8 lg:px-12 my-8 select-none">
        <div className="max-w-[1680px] mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <History size={20} className="text-sky-400" />
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Continuar Assistindo
            </h2>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-sky-500/10 via-[#0f141e] to-blue-600/10 border border-sky-400/20 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                  Progresso em Nuvem
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Sincronização instantânea
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Faça login para salvar de onde você parou
              </h3>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Acesse sua conta do Kairou para retomar seus filmes e episódios de onde parou em qualquer dispositivo (Smart TV, celular ou PC).
              </p>
            </div>

            <button
              onClick={onOpenAuth}
              className="px-6 py-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2 shrink-0"
            >
              <LogIn size={16} />
              <span>Entrar ou Criar Conta</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // 2. Caso o usuário esteja logado, mas ainda não tenha itens
  if (!loading && items.length === 0) {
    return null; // Oculta a linha se a lista estiver vazia
  }

  // 3. Usuário logado com itens em andamento
  return (
    <section className="relative px-4 sm:px-8 lg:px-12 my-8 select-none group/section">
      <div className="max-w-[1680px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <History size={20} className="text-sky-400" />
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Continuar Assistindo
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {items.length}
            </span>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-1.5 opacity-0 group-hover/section:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center transition-colors shadow-sm"
              aria-label="Rolar para esquerda"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center transition-colors shadow-sm"
              aria-label="Rolar para direita"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Horizontal Row Cards */}
        <div
          ref={rowRef}
          className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
        >
          {items.map((item) => {
            const isSeries = item.media_type === 'series' || item.media_type === 'tv' || Boolean(item.season);
            const episodeLabel = isSeries ? `T${item.season || 1}:E${item.episode || 1}` : null;
            const remainingText = formatRemaining(item.duration, item.playback_time);

            return (
              <div
                key={`${item.media_id}-${item.season}-${item.episode}`}
                className="relative flex-shrink-0 rounded-2xl bg-[#0f141e] border border-white/[0.08] hover:border-sky-400/40 overflow-hidden group transition-all duration-300 hover:scale-[1.02] shadow-md hover:shadow-xl"
                style={{ width: 'clamp(190px, 45vw, 280px)' }}
              >
                {/* Thumbnail Image */}
                <div
                  onClick={() => {
                    const mediaObj = {
                      id: item.media_id,
                      tmdbId: parseInt(String(item.media_id).replace(/^(movie|series|tv)-/, ''), 10),
                      title: item.title,
                      type: isSeries ? 'series' : 'movie',
                      poster: item.poster_path,
                      backdrop: item.backdrop_path || item.poster_path,
                    };
                    const epObj = isSeries
                      ? {
                          ep: item.episode || 1,
                          season: item.season || 1,
                          title: item.episode_title || `Episódio ${item.episode || 1}`,
                        }
                      : null;
                    onPlay(mediaObj, epObj, { initialTime: item.playback_time });
                  }}
                  className="relative aspect-video w-full overflow-hidden bg-slate-950 cursor-pointer"
                >
                  <img
                    src={item.backdrop_path || item.poster_path}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Play Icon Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                      <Play size={20} className="fill-slate-950 ml-1" />
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.media_id, item.season, item.episode);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 z-10"
                    title="Remover do Continuar Assistindo"
                  >
                    <X size={14} />
                  </button>

                  {/* Remaining Time Badge */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-white font-semibold bg-black/70 px-2 py-0.5 rounded backdrop-blur-xs">
                    <Clock size={11} className="text-sky-400" />
                    <span>{remainingText}</span>
                  </div>

                  {/* Progress Bar on Bottom of Image */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                    <div
                      className="h-full bg-sky-400 rounded-r-full"
                      style={{ width: `${item.progress_percent || 0}%` }}
                    />
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-3">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h4 className="font-bold text-xs text-white truncate group-hover:text-sky-300 transition-colors">
                      {item.title}
                    </h4>
                    {episodeLabel && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 shrink-0 font-semibold">
                        {episodeLabel}
                      </span>
                    )}
                  </div>
                  {isSeries && item.episode_title && (
                    <p className="text-[11px] text-slate-400 truncate">
                      {item.episode_title}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
