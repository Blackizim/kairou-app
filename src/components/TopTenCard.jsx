import React from 'react';
import { prefetchMediaStreams } from '../services/extractor';
import { KaiPlay, KaiCheck } from './KaiIcons';

export default function TopTenCard({
  media,
  rank,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist
}) {
  const inWatchlist = isInWatchlist(media.id);
  const isSeries = media.type === 'series' || media.type === 'tv' || media.type === 'anime';

  return (
    <button
      className="media-card ranked-card"
      onClick={() => onOpenDetails(media)}
      onMouseEnter={() => {
        if (media?.tmdbId || media?.id) {
          prefetchMediaStreams({
            tmdbId: media.tmdbId || media.id,
            type: isSeries ? 'series' : 'movie',
            season: 1,
            episode: 1,
            title: media.title,
          });
        }
      }}
      aria-label={`Ver ${media.title}`}
    >
      <span className="rank-number" aria-hidden="true">{rank}</span>
      <div className="media-art">
        <img
          src={media.poster || media.backdrop}
          alt={media.title}
          loading="lazy"
          decoding="async"
        />
        <div className="media-tags">
          <span className="media-tag rank-tag">TOP {rank}</span>
          {inWatchlist && (
            <span className="media-tag" aria-label="Na minha lista">
              <KaiCheck size={9} />
            </span>
          )}
        </div>
        <span className="media-play" aria-hidden="true">
          <KaiPlay size={10} />
        </span>
        <div className="media-info">
          <h3>{media.title}</h3>
          <div className="media-sub">
            {media.matchScore && <span className="score">{media.matchScore}%</span>}
            {media.year && (
              <>
                <span className="dot">•</span>
                <span>{media.year}</span>
              </>
            )}
            {media.genres?.[0] && (
              <>
                <span className="dot">•</span>
                <span>{media.genres[0]}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
