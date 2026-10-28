import React, { useRef, useState, useEffect } from 'react';
import MediaCard from './MediaCard';
import TopTenCard from './TopTenCard';
import { KaiBack, KaiRight } from './KaiIcons';

export default function MediaRow({
  title,
  subtitle,
  items,
  isTop10 = false,
  aspect = 'poster',
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist
}) {
  const railRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    if (!railRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = railRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    updateScrollState();
  }, [items]);

  const handleScroll = (direction) => {
    if (!railRef.current) return;
    const scrollAmount = direction * (railRef.current.clientWidth * 0.8);
    railRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="section page-width">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="section-actions">
          <button
            onClick={() => handleScroll(-1)}
            disabled={!canScrollLeft}
            aria-label={`Voltar em ${title}`}
          >
            <KaiBack size={10} />
          </button>
          <button
            onClick={() => handleScroll(1)}
            disabled={!canScrollRight}
            aria-label={`Avançar em ${title}`}
          >
            <KaiRight size={10} />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        onScroll={updateScrollState}
        className={`rail ${isTop10 ? 'ranked' : ''}`}
      >
        {isTop10
          ? items.map((item, idx) => (
              <TopTenCard
                key={item.id || idx}
                media={item}
                rank={idx + 1}
                onPlay={onPlay}
                onOpenDetails={onOpenDetails}
                onToggleWatchlist={onToggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            ))
          : items.map((item, idx) => (
              <MediaCard
                key={item.id || idx}
                media={item}
                aspect={aspect}
                onPlay={onPlay}
                onOpenDetails={onOpenDetails}
                onToggleWatchlist={onToggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            ))}
      </div>
    </section>
  );
}
