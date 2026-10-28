import React, { useState, useEffect } from 'react';
import { fetchMediaDetails, fetchSeasonEpisodes } from '../services/tmdb';
import { prefetchMediaStreams } from '../services/extractor';
import { KaiPlay, KaiPlus, KaiCheck, KaiClose, KaiTv } from './KaiIcons';

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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch TMDB rich details on modal open
  useEffect(() => {
    let isMounted = true;
    setLoadingDetails(true);

    fetchMediaDetails(media.tmdbId || media.id, media.type).then((details) => {
      if (!isMounted) return;
      if (details) {
        setDetailedMedia((prev) => ({ ...prev, ...details }));
      }
      setLoadingDetails(false);
    });

    return () => {
      isMounted = false;
    };
  }, [media.tmdbId, media.id, media.type]);

  const isSeries = detailedMedia.type === 'series' || detailedMedia.type === 'tv' || detailedMedia.type === 'anime';
  const availableSeasons = detailedMedia.seasons || [];

  // Fetch Season Episodes if it's a TV series
  useEffect(() => {
    if (!isSeries || (!detailedMedia.tmdbId && !detailedMedia.id)) return;

    let isMounted = true;
    setLoadingEpisodes(true);

    fetchSeasonEpisodes(detailedMedia.tmdbId || detailedMedia.id, selectedSeasonNumber).then((epList) => {
      if (!isMounted) return;
      setEpisodes(epList || []);
      setLoadingEpisodes(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isSeries, detailedMedia.tmdbId, detailedMedia.id, selectedSeasonNumber]);

  const handleStartPlay = () => {
    if (isSeries && episodes.length > 0) {
      onPlay(detailedMedia, { ...episodes[0], season: selectedSeasonNumber });
    } else if (isSeries) {
      onPlay(detailedMedia, { ep: 1, season: selectedSeasonNumber, title: 'Episódio 1' });
    } else {
      onPlay(detailedMedia);
    }
  };

  const castList = Array.isArray(detailedMedia.cast) ? detailedMedia.cast : [];

  return (
    <div
      className="modal-veil"
      id="modal-veil"
      onClick={(e) => {
        if (e.target.id === 'modal-veil') onClose();
      }}
    >
      <section
        className="detail-modal"
        id="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={detailedMedia.title}
        tabIndex="-1"
      >
        {/* Close Button */}
        <button
          className="circle modal-close"
          id="modal-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <KaiClose size={12} />
        </button>

        <div id="modal-body">
          {/* Cover Header */}
          <div className="detail-cover">
            <img
              src={detailedMedia.backdrop || detailedMedia.poster}
              alt=""
            />
          </div>

          {/* Content Details */}
          <div className="detail-content">
            <h2 className="detail-title">{detailedMedia.title}</h2>

            {/* Meta tags */}
            <div className="hero-meta">
              {detailedMedia.matchScore && (
                <span className="score">{detailedMedia.matchScore}%</span>
              )}
              {detailedMedia.rating && (
                <span className="cert">{detailedMedia.rating}</span>
              )}
              {detailedMedia.year && (
                <span>{detailedMedia.year}</span>
              )}
              <span>
                {detailedMedia.duration || detailedMedia.genres?.slice(0, 2).join(' · ')}
              </span>
              <span className="type-label">
                {isSeries ? 'SÉRIE' : 'FILME'}
              </span>
            </div>

            {/* Overview */}
            <p className="detail-overview">
              {detailedMedia.synopsis || detailedMedia.overview || 'Sinopse não disponível para este título.'}
            </p>

            {/* Buttons */}
            <div className="detail-buttons">
              <button
                className="button-primary"
                onClick={handleStartPlay}
              >
                <KaiPlay size={11} />
                Assistir
              </button>

              <button
                className="button-glass"
                onClick={() => onToggleWatchlist(detailedMedia)}
                aria-pressed={inWatchlist}
              >
                {inWatchlist ? <KaiCheck size={13} /> : <KaiPlus size={13} />}
                <span>{inWatchlist ? 'Na minha lista' : 'Minha lista'}</span>
              </button>
            </div>

            {/* Cast Rail */}
            {castList.length > 0 && (
              <>
                <h3 className="detail-subtitle">Elenco</h3>
                <div className="cast-rail">
                  {castList.slice(0, 10).map((person, idx) => {
                    const name = typeof person === 'string' ? person : (person.name || '');
                    const role = typeof person === 'object' ? person.character : '';
                    const photo = typeof person === 'object' ? person.image : null;
                    const initial = (name[0] || 'K').toUpperCase();

                    return (
                      <div className="cast-item" key={idx}>
                        {photo ? (
                          <img src={photo} alt={name} loading="lazy" />
                        ) : (
                          <span className="cast-fallback">{initial}</span>
                        )}
                        <strong>{name}</strong>
                        {role && <small>{role}</small>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* TV Series Seasons & Episodes */}
            {isSeries && availableSeasons.length > 0 && (
              <div className="mt-8 pt-6 border-t border-white/[0.08]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2">
                    <KaiTv size={16} className="text-[#8bd4ff]" />
                    <h3 className="text-base font-bold text-white m-0">Temporadas e Episódios</h3>
                  </div>

                  {/* Season Dropdown */}
                  <div className="flex items-center gap-2 text-xs text-[#aeb6c5]">
                    <span>Temporada:</span>
                    <select
                      value={selectedSeasonNumber}
                      onChange={(e) => setSelectedSeasonNumber(Number(e.target.value))}
                      className="bg-[#172133] border border-white/10 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#bdd9ff]"
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
                  <div className="py-12 flex items-center justify-center text-xs text-slate-400 gap-2">
                    <div className="loading-orbit" />
                    <span>Carregando episódios...</span>
                  </div>
                ) : episodes.length > 0 ? (
                  <div className="space-y-2.5">
                    {episodes.map((ep) => (
                      <div
                        key={ep.ep}
                        onClick={() => onPlay(detailedMedia, { ...ep, season: selectedSeasonNumber })}
                        onMouseEnter={() => {
                          prefetchMediaStreams({
                            tmdbId: detailedMedia.tmdbId || detailedMedia.id,
                            type: 'series',
                            season: selectedSeasonNumber,
                            episode: ep.ep,
                            title: detailedMedia.title,
                          });
                        }}
                        className="group flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3 rounded-xl bg-[#172133]/60 hover:bg-[#1a263b] border border-white/[0.06] hover:border-[#bdd9ff]/30 transition-all cursor-pointer"
                      >
                        <span className="text-sm font-bold text-[#637892] group-hover:text-[#bdd9ff] w-6 text-center hidden sm:block">
                          {ep.ep}
                        </span>

                        <div className="relative w-full sm:w-36 aspect-video rounded-lg overflow-hidden bg-[#0e141f] flex-shrink-0 border border-white/10">
                          {ep.still ? (
                            <img
                              src={ep.still}
                              alt={ep.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <KaiTv size={20} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="w-8 h-8 rounded-full bg-[#def0ffed] text-[#172538] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-100 scale-75">
                              <KaiPlay size={10} />
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#bdd9ff] transition-colors truncate">
                              {ep.ep}. {ep.title || `Episódio ${ep.ep}`}
                            </h4>
                            {ep.duration && (
                              <span className="text-[11px] text-[#8fa4bf] flex-shrink-0">
                                {ep.duration}
                              </span>
                            )}
                          </div>
                          {ep.overview && (
                            <p className="text-[11px] text-[#8fa4bf] line-clamp-2 mt-1 leading-relaxed">
                              {ep.overview}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8fa4bf] text-center py-6">
                    Nenhum episódio listado para esta temporada.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
