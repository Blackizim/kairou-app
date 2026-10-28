import React from 'react';
import { KaiRight } from './KaiIcons';

export default function HalloweenSection({ onSelectHorror, posters = [] }) {
  // Default horror posters if none passed
  const defaultPosters = [
    'https://image.tmdb.org/t/p/w342/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg',
    'https://image.tmdb.org/t/p/w342/d5NXSklXo0qyIYkgV94XAgMIckC.jpg'
  ];

  const posterA = posters[0]?.poster || defaultPosters[0];
  const posterB = posters[1]?.poster || defaultPosters[1];

  return (
    <section className="page-width halloween" id="halloween">
      <button onClick={onSelectHorror} aria-label="Abrir seleção de terror">
        <div className="halloween-copy">
          <span className="orange-label">HALLOWEEN · 31 OUT</span>
          <h2>
            Escolha seu filme.<br />
            Apague as luzes.
          </h2>
          <p>Uma seleção especial para a sua noite de terror.</p>
          <span className="halloween-action">
            Ver filmes <KaiRight size={11} />
          </span>
        </div>

        <div className="halloween-art" id="halloween-art" aria-hidden="true">
          <img src={posterA} alt="" loading="lazy" />
          <img src={posterB} alt="" loading="lazy" />
        </div>

        <div className="halloween-glow" />
      </button>
    </section>
  );
}
