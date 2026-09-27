import React from 'react';
import {
  Flame,
  Tv,
  Film,
  Zap,
  Sparkles,
  Shield,
  Clapperboard,
  Compass,
  Search
} from 'lucide-react';
import { GENRE_FILTERS } from '../services/tmdb';

const ICON_MAP = {
  Flame,
  Tv,
  Film,
  Zap,
  Sparkles,
  Shield,
  Clapperboard,
  Compass,
  Search,
};

export default function CategoryFilters({
  selectedFilterId,
  onSelectFilter
}) {
  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12 py-3">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 select-none">
        {GENRE_FILTERS.map((item) => {
          const isSelected = selectedFilterId === item.id;
          const IconComponent = ICON_MAP[item.icon] || Flame;

          return (
            <button
              key={item.id}
              onClick={() => onSelectFilter(item)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 flex items-center gap-2 ${
                isSelected
                  ? 'bg-sky-400 text-slate-950 shadow-md'
                  : 'bg-[#131822] hover:bg-[#1a2230] text-slate-300 hover:text-white border border-white/[0.08]'
              }`}
            >
              <IconComponent size={14} className={isSelected ? 'text-slate-950' : 'text-sky-400'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
