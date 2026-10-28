import React, { useRef } from 'react';
import { Play, X, ChevronLeft, ChevronRight, Clock, History, LogIn, Sparkles } from 'lucide-react';

const resolveImageUrl = (path, size = 'w780') => {
  if (!path || typeof path !== 'string') return null;
  const trimmed = path.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const clean = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `https://image.tmdb.org/t/p/${size}${clean}`;
};

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

  // Se não houver itens em andamento ou estiver carregando vazio, oculta a linha
  if (items.length === 0) {
    return null;
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
            const isExplicitMovie = item.media_type === 'movie' || String(item.media_id).startsWith('movie-');
            const isSeries = !isExplicitMovie && (item.media_type === 'series' || item.media_type === 'tv' || String(item.media_id).startsWith('series-') || Boolean(item.episode_title));
            const episodeLabel = isSeries ? `T${item.season || 1}:E${item.episode || 1}` : null;
            const remainingText = formatRemaining(item.duration, item.playback_time);

            const backdropUrl = resolveImageUrl(item.backdrop_path, 'w780');
            const posterUrl = resolveImageUrl(item.poster_path, 'w500');
            const primaryBanner = backdropUrl || posterUrl;
            const hasOnlyPoster = !backdropUrl && Boolean(posterUrl);

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
                      poster: posterUrl || item.poster_path,
                      backdrop: backdropUrl || posterUrl || item.backdrop_path,
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
                  {/* Blurry backdrop if only vertical poster exists to maintain 16:9 banner consistency */}
                  {hasOnlyPoster && (
                    <div
                      className="absolute inset-0 bg-cover bg-center filter blur-md scale-110 opacity-40 pointer-events-none"
                      style={{ backgroundImage: `url(${posterUrl})` }}
                    />
                  )}

                  <img
                    src={primaryBanner || '/kairou.svg'}
                    alt={item.title}
                    onError={(e) => {
                      if (posterUrl && e.currentTarget.src !== posterUrl) {
                        e.currentTarget.src = posterUrl;
                      } else {
                        e.currentTarget.src = '/kairou.svg';
                      }
                    }}
                    className={`w-full h-full ${hasOnlyPoster ? 'object-contain relative z-[1]' : 'object-cover'} group-hover:scale-105 transition-transform duration-500`}
                    loading="lazy"
                  />

                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-[2]" />

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
