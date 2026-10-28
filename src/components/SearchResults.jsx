import React from 'react';
import MediaCard from './MediaCard';
import { KaiClose, KaiSearch } from './KaiIcons';

export default function SearchResults({
  searchQuery,
  results,
  loading,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist,
  onClearSearch
}) {
  return (
    <div className="page-width pt-28 pb-20 min-h-[75vh]">
      <div className="view-heading flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1>
            Resultados para <span className="text-[#bdd9ff]">"{searchQuery}"</span>
          </h1>
          <p>
            {loading
              ? 'Buscando títulos...'
              : `${results.length} ${results.length === 1 ? 'título encontrado' : 'títulos encontrados'}`}
          </p>
        </div>

        <button
          onClick={onClearSearch}
          className="button-glass"
          style={{ minHeight: '36px', padding: '8px 16px', fontSize: '11px' }}
        >
          <KaiClose size={10} />
          <span>Limpar busca</span>
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center gap-3 text-xs text-[#9db0cb]">
          <div className="loading-orbit" />
          <span>Buscando no catálogo...</span>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 mt-8">
          {results.map((media) => (
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
          <KaiSearch size={28} />
          <h2>Nenhum título encontrado</h2>
          <p>
            Não encontramos títulos correspondentes a "{searchQuery}". Verifique a ortografia ou tente outro nome.
          </p>
          <button className="button-glass" onClick={onClearSearch}>
            Explorar catálogo
          </button>
        </div>
      )}
    </div>
  );
}
