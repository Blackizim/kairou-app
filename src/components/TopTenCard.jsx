import React from 'react';

export default function TopTenCard({
  media,
  rank,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist
}) {
  return (
    <div
      className="relative flex-shrink-0 flex items-center group cursor-pointer select-none transition-all duration-300"
      style={{ width: 'clamp(180px, 40vw, 240px)' }}
      onClick={() => onOpenDetails(media)}
    >
      {/* Sculpted Matte Rank Number */}
      <div className="relative w-14 sm:w-20 flex-shrink-0 pointer-events-none flex items-center justify-end -mr-2 z-0">
        <span
          className="text-6xl sm:text-8xl font-black italic tracking-tighter leading-none transition-transform duration-300 group-hover:scale-105"
          style={{
            color: '#07090e',
            WebkitTextStroke: '2px #334155',
            textShadow: '-3px 3px 0 #1e293b',
          }}
        >
          {rank}
        </span>
      </div>

      {/* Poster Frame */}
      <div
        className="relative flex-1 aspect-[2/3] overflow-hidden rounded-xl bg-[#131822] border border-white/[0.08] group-hover:border-sky-400/50 group-hover:scale-[1.03] transition-all duration-300 z-10"
      >
        <img
          src={media.poster}
          alt={media.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/25 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/80 text-slate-300 font-bold text-[9px] uppercase tracking-wider">
            TOP {rank}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/80 text-slate-400 font-semibold text-[9px]">
            4K
          </span>
        </div>

        {/* Bottom Info */}
        <div className="absolute inset-x-0 bottom-0 p-3 z-10 flex flex-col justify-end">
          <h3 className="text-xs font-bold text-white truncate drop-shadow-sm">
            {media.title}
          </h3>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
            <span className="text-emerald-400 font-semibold">{media.matchScore}%</span>
            <span>•</span>
            <span className="truncate">{media.genres?.[0] || 'Cinema'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
