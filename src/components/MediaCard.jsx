import React from 'react';

export default function MediaCard({
  media,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist,
  aspect = 'poster' // 'poster' (2:3) or 'backdrop' (16:9)
}) {
  const isBackdrop = aspect === 'backdrop';

  return (
    <div
      className="relative flex-shrink-0 group cursor-pointer transition-all duration-300 select-none"
      style={{
        width: isBackdrop ? 'clamp(220px, 42vw, 290px)' : 'clamp(130px, 30vw, 185px)',
      }}
      onClick={() => onOpenDetails(media)}
    >
      {/* Thumbnail Frame */}
      <div
        className={`relative w-full overflow-hidden rounded-xl bg-[#131822] border border-white/[0.08] group-hover:border-sky-400/40 transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-elevated group-hover:z-20 ${isBackdrop ? 'aspect-video' : 'aspect-[2/3]'}`}
      >
        <img
          src={isBackdrop ? media.backdrop : media.poster}
          alt={media.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Cinematic Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
          <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/70 text-slate-400 font-semibold text-[10px]">
            4K
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/70 text-slate-300 font-semibold text-[10px]">
            {media.rating || '14+'}
          </span>
        </div>

        {/* Bottom Details */}
        <div className="absolute inset-x-0 bottom-0 p-3 z-10 flex flex-col justify-end">
          <h3 className="text-xs sm:text-sm font-bold text-white leading-snug truncate drop-shadow-sm">
            {media.title}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] mt-1 text-slate-400">
            <span className="text-emerald-400 font-semibold">{media.matchScore}%</span>
            <span>•</span>
            <span>{media.year}</span>
            <span>•</span>
            <span className="truncate">{media.genres?.[0] || 'Cinema'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
