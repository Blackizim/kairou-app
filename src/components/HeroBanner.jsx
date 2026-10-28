import React, { useState, useEffect, useRef } from 'react';
import { prefetchMediaStreams } from '../services/extractor';
import { KaiPlay, KaiPlus, KaiCheck, KaiInfo, KaiRight } from './KaiIcons';

export default function HeroBanner({
  featuredItems,
  user,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeSlot, setActiveSlot] = useState('a');
  const [artA, setArtA] = useState('');
  const [artB, setArtB] = useState('');
  const [copyAnimKey, setCopyAnimKey] = useState(0);

  const items = featuredItems || [];
  const count = items.length;
  const currentItem = items[currentIndex] || items[0];

  // Initialize and update crossfade backdrop
  useEffect(() => {
    if (!currentItem) return;
    const url = currentItem.backdrop || currentItem.poster;
    if (activeSlot === 'a') {
      setArtA(url);
    } else {
      setArtB(url);
    }
  }, [currentIndex, currentItem, activeSlot]);

  // Transition to next slide
  const goToSlide = (index) => {
    if (count <= 0) return;
    const nextIdx = (index + count) % count;
    const nextItem = items[nextIdx];
    const nextUrl = nextItem?.backdrop || nextItem?.poster || '';

    if (activeSlot === 'a') {
      setArtB(nextUrl);
      setActiveSlot('b');
    } else {
      setArtA(nextUrl);
      setActiveSlot('a');
    }
    setCurrentIndex(nextIdx);
    setCopyAnimKey((k) => k + 1);
  };

  // Prefetch active item streams
  useEffect(() => {
    if (!currentItem?.tmdbId && !currentItem?.id) return;
    const isTv = currentItem.type === 'series' || currentItem.type === 'tv' || currentItem.type === 'anime';
    prefetchMediaStreams({
      tmdbId: currentItem.tmdbId || currentItem.id,
      type: isTv ? 'series' : 'movie',
      season: 1,
      episode: 1,
      title: currentItem.title,
    });
  }, [currentItem]);

  // Autoplay rotation every 10 seconds
  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => {
      goToSlide(currentIndex + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, [currentIndex, count]);

  if (!currentItem) return null;

  const inWatchlist = isInWatchlist(currentItem.id);
  const isSeries = currentItem.type === 'series' || currentItem.type === 'tv' || currentItem.type === 'anime';

  return (
    <section className="hero" id="hero" aria-label="Destaques">
      {/* Dual Art Layers with crossfade and subtle drift */}
      <div
        className={`hero-art hero-art-a ${activeSlot === 'a' ? 'active' : ''}`}
        style={{ backgroundImage: `url("${artA || currentItem.backdrop}")` }}
      />
      <div
        className={`hero-art hero-art-b ${activeSlot === 'b' ? 'active' : ''}`}
        style={{ backgroundImage: `url("${artB}")` }}
      />
      <div className="hero-shade" />

      <div className="hero-inner page-width">
        <div className="hero-copy enter" key={copyAnimKey}>
          {/* Title Slot */}
          <div className="hero-title-slot">
            <h1 id="hero-title" aria-label={currentItem.title}>
              {currentItem.title}
            </h1>
          </div>

          {/* Metadata Badges */}
          <div className="hero-meta" id="hero-meta">
            {currentItem.matchScore && (
              <span className="score">{currentItem.matchScore}%</span>
            )}
            {currentItem.rating && (
              <span className="cert">{currentItem.rating}</span>
            )}
            {currentItem.year && (
              <span>{currentItem.year}</span>
            )}
            <span>
              {isSeries
                ? 'Série'
                : (currentItem.duration || currentItem.genres?.slice(0, 2).join(' · '))}
            </span>
            <span className="type-label">
              {isSeries ? 'SÉRIE' : 'FILME'}
            </span>
          </div>

          {/* Description */}
          <p className="hero-description" id="hero-description">
            {currentItem.synopsis || currentItem.overview || 'Veja os detalhes deste título disponível no catálogo.'}
          </p>

          {/* Action Buttons */}
          <div className="hero-buttons">
            <button
              className="button-primary"
              id="hero-watch"
              onClick={() => {
                onPlay(currentItem, isSeries ? { ep: 1, season: 1, title: 'Episódio 1' } : null);
              }}
              onMouseEnter={() => {
                prefetchMediaStreams({
                  tmdbId: currentItem.tmdbId || currentItem.id,
                  type: isSeries ? 'series' : 'movie',
                  season: 1,
                  episode: 1,
                  title: currentItem.title,
                });
              }}
            >
              <KaiPlay size={11} />
              Assistir
            </button>

            <button
              className="button-glass"
              id="hero-save"
              onClick={() => onToggleWatchlist(currentItem)}
              aria-label={inWatchlist ? 'Remover da minha lista' : 'Adicionar à minha lista'}
              aria-pressed={inWatchlist}
            >
              {inWatchlist ? <KaiCheck size={13} /> : <KaiPlus size={13} />}
              <span className="save-label">
                {inWatchlist ? 'Na minha lista' : 'Minha lista'}
              </span>
            </button>

            <button
              className="circle hero-info"
              id="hero-info"
              onClick={() => onOpenDetails(currentItem)}
              aria-label="Mais informações"
            >
              <KaiInfo size={14} />
            </button>
          </div>
        </div>

        {/* Hero Controls (Counter, Dots, Next button) */}
        {count > 1 && (
          <div className="hero-controls">
            <span className="hero-counter" id="hero-counter">
              {String(currentIndex + 1).padStart(2, '0')}{' '}
              <i>/ {String(count).padStart(2, '0')}</i>
            </span>

            <div className="hero-dots" id="hero-dots" aria-label="Escolher destaque">
              {items.map((item, idx) => (
                <button
                  key={item.id || idx}
                  className={`hero-dot ${idx === currentIndex ? 'active' : ''}`}
                  onClick={() => goToSlide(idx)}
                  aria-label={`Destaque: ${item.title}`}
                  aria-pressed={idx === currentIndex}
                />
              ))}
            </div>

            <button
              className="circle"
              id="hero-next"
              onClick={() => goToSlide(currentIndex + 1)}
              aria-label="Próximo destaque"
            >
              <KaiRight size={12} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
