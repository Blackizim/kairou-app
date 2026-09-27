import React, { useState } from 'react';
import { Bookmark, Film, Tv } from 'lucide-react';
import MediaCard from './MediaCard';

export default function WatchlistTab({
  watchlist,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist,
  onExploreCatalog
}) {
  const [filterType, setFilterType] = useState('all');

  const filteredItems = watchlist.filter((item) => {
    if (filterType === 'movie') return item.type === 'movie';
    if (filterType === 'series') return item.type === 'series';
    return true;
  });

  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12 pt-24 pb-16 min-h-[70vh] select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
            <Bookmark size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Minha Lista
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {watchlist.length}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Títulos salvos para assistir no Kairou.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        {watchlist.length > 0 && (
          <div className="flex items-center gap-1.5 bg-[#131822] p-1 rounded-xl border border-white/[0.08] self-start sm:self-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'all'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Todos ({watchlist.length})
            </button>
            <button
              onClick={() => setFilterType('movie')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                filterType === 'movie'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Film size={12} /> Filmes
            </button>
            <button
              onClick={() => setFilterType('series')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                filterType === 'series'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Tv size={12} /> Séries
            </button>
          </div>
        )}
      </div>

      {/* Grid or Empty */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 mt-8">
          {filteredItems.map((media) => (
            <MediaCard
              key={media.id}
              media={media}
              aspect="poster"
              onPlay={onPlay}
              onOpenDetails={onOpenDetails}
              onToggleWatchlist={onToggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#131822] border border-white/[0.08] flex items-center justify-center text-slate-500 mb-4">
            <Bookmark size={24} className="text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">Sua lista está vazia</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Você ainda não salvou nenhum título. Passe o cursor sobre os filmes ou séries do catálogo e clique no botão de adição para salvá-los aqui.
          </p>
          <button
            onClick={onExploreCatalog}
            className="px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition-colors"
          >
            Explorar Catálogo
          </button>
        </div>
      )}
    </div>
  );
}
