import React, { useState } from 'react';
import MediaCard from './MediaCard';
import { KaiHeart } from './KaiIcons';

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
    if (filterType === 'series') return item.type === 'series' || item.type === 'tv' || item.type === 'anime';
    return true;
  });

  return (
    <div className="page-width pt-28 pb-20 min-h-[75vh]">
      <div className="view-heading flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1>Minha Lista</h1>
          <p>
            {watchlist.length === 1
              ? '1 título salvo para assistir no Kairou.'
              : `${watchlist.length} títulos salvos para assistir no Kairou.`}
          </p>
        </div>

        {watchlist.length > 0 && (
          <div className="browse-chips" style={{ padding: 0 }}>
            <button
              onClick={() => setFilterType('all')}
              className={filterType === 'all' ? 'active' : ''}
            >
              Todos ({watchlist.length})
            </button>
            <button
              onClick={() => setFilterType('movie')}
              className={filterType === 'movie' ? 'active' : ''}
            >
              Filmes
            </button>
            <button
              onClick={() => setFilterType('series')}
              className={filterType === 'series' ? 'active' : ''}
            >
              Séries & Animes
            </button>
          </div>
        )}
      </div>

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
        <div className="empty-state mt-12">
          <KaiHeart size={28} />
          <h2>Sua lista começa aqui.</h2>
          <p>
            Toque em “Minha lista” nos filmes e séries para guardar tudo o que você quer assistir depois.
          </p>
          <button className="button-glass" onClick={onExploreCatalog}>
            Explorar catálogo
          </button>
        </div>
      )}
    </div>
  );
}
