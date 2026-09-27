import React from 'react';

/**
 * Kairou Spiral Icon — mathematically precise Archimedean spiral.
 * Points computed as: x = cx + r*sin(θ), y = cy - r*cos(θ)
 * where r = a + b*θ (Archimedean spiral), 2.5 turns.
 */
export default function KairouIcon({ size = 28, className = '', glow = true }) {
  // Spiral parameters (viewBox 0 0 100 100, center at 50,50)
  // 2.5 turns, inner radius 1.5, outer radius ~38
  const points =
    "50,48.5 50.9,47.8 52.3,47.7 53.9,48.4 55.1,50 55.5,52.3 54.9,54.9 53.0,57.2 50,58.7 46.3,58.9 42.6,57.4 39.5,54.4 37.7,50 37.8,44.9 40.0,40.0 44.3,36.1 50,34.1 56.4,34.5 62.5,37.5 67.2,42.9 69.5,50 68.8,57.8 65.1,65.1 58.5,70.5 50,73.1 40.8,72.2 32.4,67.6 26.1,59.9 23.3,50 24.5,39.4 29.8,29.8 38.8,22.8";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={`inline-block select-none transition-transform duration-300 ${className}`}
      style={{ width: size, height: size, flexShrink: 0 }}
      aria-label="Kairou"
      role="img"
    >
      {glow && (
        <defs>
          <filter id="kglow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      <polyline
        points={points}
        stroke="#38bdf8"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={glow ? 'url(#kglow)' : undefined}
      />

      {/* Center dot */}
      <circle
        cx="50"
        cy="50"
        r="2.5"
        fill="#38bdf8"
        filter={glow ? 'url(#kglow)' : undefined}
      />
    </svg>
  );
}
