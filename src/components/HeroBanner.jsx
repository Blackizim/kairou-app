import React, { useState, useEffect } from 'react';
import { Play, Plus, Check, Info, ChevronLeft, ChevronRight, Star } from 'lucide-react';

export default function HeroBanner({
  featuredItems,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem = featuredItems?.[currentIndex] || featuredItems?.[0];

  useEffect(() => {
    if (!featuredItems || featuredItems.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    }, 9000);
    return () => clearInterval(timer);
  }, [featuredItems]);

  if (!currentItem) return null;

  const inWatchlist = isInWatchlist(currentItem.id);

  return (
    <section className="relative w-full min-h-[80vh] sm:min-h-[84vh] lg:min-h-[88vh] flex items-end justify-start overflow-hidden pt-16 sm:pt-20 select-none">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <img
          key={currentItem.id}
          src={currentItem.backdrop}
          alt={currentItem.title}
          className="w-full h-full object-cover object-center scale-100 transition-all duration-700 ease-out"
        />

        {/* Cinematic Scrims — full coverage on mobile, partial on desktop */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/90 to-transparent w-full sm:w-[80%] lg:w-[58%]"></div>
        <div className="absolute inset-x-0 bottom-0 h-52 sm:h-64 bg-gradient-to-t from-[#07090e] via-[#07090e]/70 to-transparent"></div>
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#07090e]/80 to-transparent"></div>
      </div>

      {/* Hero Content Stage */}
      <div className="relative z-10 max-w-[1680px] w-full mx-auto px-4 sm:px-8 lg:px-12 pb-16 sm:pb-18">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl space-y-3 sm:space-y-4">
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1">
              <Star size={11} className="fill-emerald-400 text-emerald-400" />
              {currentItem.matchScore}% Relevante
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-700/80 text-xs font-semibold">
              {currentItem.rating || '14+'}
            </span>
            <span className="text-slate-300 font-medium text-xs">
              {currentItem.year}
            </span>
            <span className="text-slate-400 font-medium text-xs">
              {currentItem.type === 'series' ? 'Série' : currentItem.duration}
            </span>
            <div className="hidden sm:flex items-center gap-1.5 ml-1">
              {currentItem.quality?.map((q, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-900/90 text-slate-300 border border-slate-700/80"
                >
                  {q}
                </span>
              ))}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.08] drop-shadow-md">
            {currentItem.title}
          </h1>

          {/* Tagline or Genre pills */}
          {currentItem.tagline ? (
            <p className="text-sm sm:text-base font-medium text-slate-300 italic line-clamp-1">
              "{currentItem.tagline}"
            </p>
          ) : (
            <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
              {currentItem.genres?.slice(0, 3).join(' • ')}
            </div>
          )}

          {/* Synopsis */}
          <p className="text-sm sm:text-base text-slate-300 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-2xl">
            {currentItem.synopsis}
          </p>

          {/* Action Buttons */}
          <div className="pt-2 sm:pt-3 flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Play Button */}
            <button
              onClick={() => {
                const isSeries = currentItem.type === 'series' || currentItem.type === 'tv' || currentItem.type === 'anime';
                onPlay(currentItem, isSeries ? { ep: 1, season: 1, title: 'Episódio 1' } : null);
              }}
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-sm sm:text-base transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play size={18} className="fill-slate-950 ml-0.5" />
              Assistir Agora
            </button>

            {/* Watchlist Button */}
            <button
              onClick={() => onToggleWatchlist(currentItem)}
              className={`inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl font-semibold text-sm border transition-all ${
                inWatchlist
                  ? 'bg-sky-500/20 text-sky-400 border-sky-400/60'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-500'
              }`}
            >
              {inWatchlist ? (
                <>
                  <Check size={18} />
                  Na Lista
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Minha Lista
                </>
              )}
            </button>

            {/* Info Button */}
            <button
              onClick={() => onOpenDetails(currentItem)}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-[#131822]/90 hover:bg-[#1a2230] text-slate-200 border border-slate-700/80 hover:border-slate-500 font-semibold text-sm transition-all"
            >
              <Info size={18} className="text-sky-400" />
              <span className="hidden sm:inline">Mais Informações</span>
              <span className="sm:hidden">Info</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide Navigation Dots — bottom center */}
      {featuredItems?.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-900/70 border border-slate-700/60 rounded-full px-3 py-1.5 backdrop-blur-sm">
          <button
            onClick={() =>
              setCurrentIndex((prev) => (prev === 0 ? featuredItems.length - 1 : prev - 1))
            }
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="flex items-center gap-1 px-1">
            {featuredItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? 'w-5 bg-sky-400'
                    : 'w-1.5 bg-slate-600 hover:bg-slate-400'
                }`}
                aria-label={`Destaque ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() =>
              setCurrentIndex((prev) => (prev + 1) % featuredItems.length)
            }
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            aria-label="Próximo"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </section>
  );
}
