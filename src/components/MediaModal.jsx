import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Plus,
  Check,
  Star,
  Film,
  Tv,
  Clock,
  Calendar,
  Users,
  Clapperboard,
  Loader2
} from 'lucide-react';
import { fetchMediaDetails, fetchSeasonEpisodes } from '../services/tmdb';

export default function MediaModal({
  media,
  onClose,
  onPlay,
  onToggleWatchlist,
  isInWatchlist,
  onSelectMedia
}) {
  if (!media) return null;

  const inWatchlist = isInWatchlist(media.id);
  const [detailedMedia, setDetailedMedia] = useState(media);
  const [loadingDetails, setLoadingDetails] = useState(true);

  // Seasons & Episodes State
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Fetch TMDB rich details on modal open
  useEffect(() => {
    let isMounted = true;
    setLoadingDetails(true);

    fetchMediaDetails(media.tmdbId, media.type).then((details) => {
      if (!isMounted) return;
      if (details) {
        setDetailedMedia((prev) => ({ ...prev, ...details }));
      }
      setLoadingDetails(false);
    });

    return () => {
      isMounted = false;
    };
  }, [media.tmdbId, media.type]);

  // Fetch Season Episodes if it's a TV series
  const isSeries = detailedMedia.type === 'series' || detailedMedia.type === 'tv' || detailedMedia.type === 'anime';
  const availableSeasons = detailedMedia.seasons || [];

  useEffect(() => {
    if (!isSeries || !detailedMedia.tmdbId) return;

    let isMounted = true;
    setLoadingEpisodes(true);

    fetchSeasonEpisodes(detailedMedia.tmdbId, selectedSeasonNumber).then((epList) => {
      if (!isMounted) return;
      setEpisodes(epList || []);
      setLoadingEpisodes(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isSeries, detailedMedia.tmdbId, selectedSeasonNumber]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md animate-fade-in select-none">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose}></div>

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-[#0e121a] border border-white/[0.08] rounded-2xl sm:rounded-3xl shadow-modal overflow-hidden z-10 my-auto animate-scale-in max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-[#07090e]/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/[0.08] flex items-center justify-center backdrop-blur-md transition-colors"
          aria-label="Fechar detalhes"
        >
          <X size={18} />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto no-scrollbar flex-1">
          {/* Hero Backdrop Banner */}
          <div className="relative w-full aspect-video sm:aspect-[21/9] max-h-[400px] overflow-hidden bg-slate-950">
            <img
              src={detailedMedia.backdrop}
              alt={detailedMedia.title}
              className="w-full h-full object-cover object-center"
            />
            {/* Scrims */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e121a] via-[#0e121a]/50 to-transparent"></div>
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#07090e]/70 to-transparent"></div>

            {/* In-hero Title & Actions */}
            <div className="absolute bottom-6 left-6 sm:left-10 right-6 flex items-end justify-between">
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                  {detailedMedia.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      if (isSeries && episodes.length > 0) {
                        onPlay(detailedMedia, { ...episodes[0], season: selectedSeasonNumber });
                      } else if (isSeries) {
                        onPlay(detailedMedia, { ep: 1, season: selectedSeasonNumber, title: 'Episódio 1' });
                      } else {
                        onPlay(detailedMedia);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-sm transition-all shadow-md hover:scale-[1.02]"
                  >
                    <Play size={16} className="fill-slate-950 ml-0.5" />
                    Assistir Agora
                  </button>

                  <button
                    onClick={() => onToggleWatchlist(detailedMedia)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                      inWatchlist
                        ? 'bg-sky-500/20 text-sky-400 border-sky-400/60'
                        : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                    }`}
                    title={inWatchlist ? "Remover da lista" : "Adicionar à Minha Lista"}
                  >
                    {inWatchlist ? <Check size={18} /> : <Plus size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-6 sm:p-10 space-y-8">
            {/* Meta & Synopsis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left 2 cols */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Star size={12} className="fill-emerald-400" />
                    {detailedMedia.matchScore}% Relevante
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300">{detailedMedia.year}</span>
                  <span className="text-slate-600">•</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-semibold text-xs border border-slate-800">
                    {detailedMedia.rating}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300 font-medium">
                    {detailedMedia.duration}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-semibold text-xs border border-slate-800 ml-1">
                    4K Ultra HD
                  </span>
                </div>

                <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
                  {detailedMedia.synopsis}
                </p>
              </div>

              {/* Right 1 col: Technical info & Cast */}
              <div className="space-y-3.5 p-4 rounded-2xl bg-[#131822] border border-white/[0.06] text-xs">
                {detailedMedia.cast && detailedMedia.cast.length > 0 && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Elenco Principal:</span>
                    <span className="text-slate-200 leading-relaxed">
                      {detailedMedia.cast.join(', ')}
                    </span>
                  </div>
                )}

                {detailedMedia.director && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Direção:</span>
                    <span className="text-slate-200">{detailedMedia.director}</span>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Gêneros:</span>
                  <div className="flex flex-wrap gap-1">
                    {detailedMedia.genres?.map((g, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/80 text-[11px]"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Idiomas de Transmissão:</span>
                  <span className="text-slate-300 text-[11px]">
                    Português [Original], Inglês (Dolby 5.1), Espanhol • Legendas em PT-BR e EN
                  </span>
                </div>
              </div>
            </div>

            {/* Series Seasons and Episodes */}
            {isSeries && availableSeasons.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Tv size={18} className="text-sky-400" />
                    <h3 className="text-lg font-bold text-white">Temporadas & Episódios</h3>
                  </div>

                  {/* Season Selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">Temporada:</label>
                    <select
                      value={selectedSeasonNumber}
                      onChange={(e) => setSelectedSeasonNumber(Number(e.target.value))}
                      className="bg-[#131822] border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-400"
                    >
                      {availableSeasons.map((s) => (
                        <option key={s.season_number} value={s.season_number}>
                          {s.name || `Temporada ${s.season_number}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Episodes List */}
                {loadingEpisodes ? (
                  <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                    <Loader2 size={20} className="animate-spin text-sky-400" />
                    <span className="text-xs">Carregando episódios...</span>
                  </div>
                ) : episodes.length > 0 ? (
                  <div className="space-y-3">
                    {episodes.map((ep) => (
                      <div
                        key={ep.ep}
                        onClick={() => onPlay(detailedMedia, { ...ep, season: selectedSeasonNumber })}
                        className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-2xl bg-[#131822]/80 hover:bg-[#1a2230] border border-white/[0.06] hover:border-slate-600 transition-all cursor-pointer"
                      >
                        <span className="text-base font-bold text-slate-500 group-hover:text-sky-400 w-6 text-center hidden sm:block">
                          {ep.ep}
                        </span>

                        <div className="relative w-full sm:w-40 aspect-video rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-800">
                          <img
                            src={ep.thumbnail}
                            alt={ep.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center shadow-md">
                              <Play size={14} className="fill-slate-950 ml-0.5" />
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                              {ep.ep}. {ep.title}
                            </h4>
                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                              <Clock size={12} className="text-slate-400" />
                              {ep.duration}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                            {ep.synopsis}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    Episódios desta temporada estão sendo processados pela distribuidora.
                  </p>
                )}
              </div>
            )}

            {/* Similar Titles Grid */}
            {detailedMedia.similar && detailedMedia.similar.length > 0 && (
              <div className="pt-6 border-t border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Film size={16} className="text-sky-400" />
                  Títulos Semelhantes
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {detailedMedia.similar.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectMedia(item)}
                      className="group cursor-pointer rounded-xl overflow-hidden bg-[#131822] border border-white/[0.06] hover:border-slate-600 transition-all hover:scale-[1.02]"
                    >
                      <div className="aspect-[2/3] w-full overflow-hidden relative">
                        <img
                          src={item.poster}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-sky-300">
                          {item.title}
                        </h4>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.year}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
