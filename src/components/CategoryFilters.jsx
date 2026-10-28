import React from 'react';
import { GENRE_FILTERS } from '../services/tmdb';

export default function CategoryFilters({
  selectedFilterId,
  onSelectFilter
}) {
  const currentMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());

  return (
    <div className="page-width browse-intro" id="browse-intro">
      <div className="browse-chips" id="browse-chips">
        {GENRE_FILTERS.map((item) => {
          const isSelected = selectedFilterId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectFilter(item)}
              className={isSelected ? 'active' : ''}
              data-genre={item.id}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <span id="month-note">Destaques de {currentMonth}</span>
    </div>
  );
}
