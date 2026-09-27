import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from './MediaCard';
import TopTenCard from './TopTenCard';

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
  const rowRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setCanScrollLeft(scrollLeft > 20);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  const handleScroll = (direction) => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="relative w-full py-4 sm:py-5 group select-none">
      {/* Section Header */}
      <div className="max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12 flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-base sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Horizontal Carousel Area */}
      <div className="relative max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 sm:w-12 h-20 sm:h-28 rounded-r-xl bg-[#07090e]/85 hover:bg-[#131822] border-y border-r border-white/[0.08] text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
            aria-label="Rolar para a esquerda"
          >
            <ChevronLeft size={22} className="text-slate-300 hover:text-white" />
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={rowRef}
          onScroll={checkScroll}
          className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2 px-1"
        >
          {isTop10
            ? items.map((item, idx) => (
                <TopTenCard
                  key={item.id}
                  media={item}
                  rank={idx + 1}
                  onPlay={onPlay}
                  onOpenDetails={onOpenDetails}
                  onToggleWatchlist={onToggleWatchlist}
                  isInWatchlist={isInWatchlist}
                />
              ))
            : items.map((item) => (
                <MediaCard
                  key={item.id}
                  media={item}
                  aspect={aspect}
                  onPlay={onPlay}
                  onOpenDetails={onOpenDetails}
                  onToggleWatchlist={onToggleWatchlist}
                  isInWatchlist={isInWatchlist}
                />
              ))}
        </div>

        {/* Right Scroll Button */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll('right')}
            className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 sm:w-12 h-20 sm:h-28 rounded-l-xl bg-[#07090e]/85 hover:bg-[#131822] border-y border-l border-white/[0.08] text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
            aria-label="Rolar para a direita"
          >
            <ChevronRight size={22} className="text-slate-300 hover:text-white" />
          </button>
        )}
      </div>
    </section>
  );
}
