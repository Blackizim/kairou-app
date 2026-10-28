import React, { useState, useEffect, useRef } from 'react';
import { prefetchMediaStreams } from '../services/extractor';
import { KaiPlay, KaiPlus, KaiCheck, KaiInfo, KaiRight } from './KaiIcons';

export default function HeroBanner({
  featuredItems,
  user,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist,
  isPaused = false,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeSlot, setActiveSlot] = useState('a');
  const [artA, setArtA] = useState('');
  const [artB, setArtB] = useState('');
  const [copyAnimKey, setCopyAnimKey] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [tabVisible, setTabVisible] = useState(typeof document !== 'undefined' ? !document.hidden : true);

  const heroRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const items = featuredItems || [];
  const count = items.length;
  const currentItem = items[currentIndex] || items[0];

  // Reseta estado de falha da logo ao trocar de destaque
  useEffect(() => {
    setLogoFailed(false);
  }, [currentIndex]);

  // Observer para checar se o banner está visível na tela
  useEffect(() => {
    if (!heroRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  // Monitora visibilidade da aba do navegador
  useEffect(() => {
    const handleVisChange = () => {
      setTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisChange);
    return () => document.removeEventListener('visibilitychange', handleVisChange);
  }, []);

  // Inicializa e atualiza transição de arte de fundo (crossfade)
  useEffect(() => {
    if (!currentItem) return;
    const url = currentItem.backdrop || currentItem.poster;
    if (activeSlot === 'a') {
      setArtA(url);
    } else {
      setArtB(url);
    }
  }, [currentIndex, currentItem, activeSlot]);

  // Transição para próximo slide
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

  // Suporte a gesto de deslizar (swipe) em dispositivos móveis
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - touchStartX.current;
    const deltaY = endY - touchStartY.current;

    // Detecta arrasto horizontal significativo (> 40px e mais horizontal que vertical)
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        goToSlide(currentIndex + 1);
      } else {
        goToSlide(currentIndex - 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Pré-carrega streams do item em exibição
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

  // Rotação automática a cada ~11 segundos (pausa quando modais/busca/aba oculta estão ativos ou reduz movimento)
  useEffect(() => {
    if (count <= 1) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (isPaused || !tabVisible || !isVisible || prefersReducedMotion) return;

    const timer = setInterval(() => {
      goToSlide(currentIndex + 1);
    }, 11000);

    return () => clearInterval(timer);
  }, [currentIndex, count, isPaused, tabVisible, isVisible]);

  if (!currentItem) return null;

  const inWatchlist = isInWatchlist(currentItem.id);
  const isSeries = currentItem.type === 'series' || currentItem.type === 'tv' || currentItem.type === 'anime';

  return (
    <section
      ref={heroRef}
      className="hero"
      id="hero"
      aria-label="Destaques"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Camadas duplas de arte com crossfade suave */}
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
          {/* Title Slot: Logo oficial em PNG raster do TMDB com fallback para texto h1 */}
          <div className="hero-title-slot">
            {currentItem.logo && !logoFailed ? (
              <img
                src={currentItem.logo}
                alt={currentItem.title}
                className="hero-logo-img"
                onError={() => setLogoFailed(true)}
                loading="eager"
              />
            ) : (
              <h1 id="hero-title" aria-label={currentItem.title}>
                {currentItem.title}
              </h1>
            )}
          </div>

          {/* Badges de Metadados */}
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

          {/* Sinopse */}
          <p className="hero-description" id="hero-description">
            {currentItem.synopsis || currentItem.overview || 'Veja os detalhes deste título disponível no catálogo.'}
          </p>

          {/* Botões de Ação */}
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

        {/* Controles do Carrossel (Contador numérico, Indicadores de ponto, Próximo) */}
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
