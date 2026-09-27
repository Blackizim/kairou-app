import React from 'react';
import { Search, AlertCircle, X } from 'lucide-react';
import MediaCard from './MediaCard';

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
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12 pt-24 pb-16 min-h-[75vh] select-none">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
            <Search size={18} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Resultados para <span className="text-sky-400">"{searchQuery}"</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {loading ? "Buscando títulos..." : `${results.length} ${results.length === 1 ? 'título encontrado' : 'títulos encontrados'}`}
            </p>
          </div>
        </div>

        <button
          onClick={onClearSearch}
          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors self-start sm:self-auto"
        >
          <X size={14} />
          <span>Limpar busca</span>
        </button>
      </div>

      {/* Grid or Empty */}
      {results.length > 0 ? (
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
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#131822] border border-white/[0.08] flex items-center justify-center text-slate-400 mb-4">
            <AlertCircle size={24} className="text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">Nenhum resultado encontrado</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Não encontramos títulos correspondentes no catálogo oficial. Verifique a ortografia ou tente pesquisar pelo nome original em inglês.
          </p>
          <button
            onClick={onClearSearch}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-700 text-xs font-semibold transition-colors"
          >
            Ver todos os títulos
          </button>
        </div>
      ) : null}
    </div>
  );
}
