// Serviço Oficial TMDB para kairou Streaming
const TMDB_READ_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MjljMjk3OTUwZTYxZTBjNzE3OGI1ZmQ5YzllNmZhMCIsIm5iZiI6MTc1MTgyNDMyMC40NTcsInN1YiI6IjY4NmFiN2MwZDQ4OWE5YzMyYTUzZmFjNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.IBBf0y2Nv9mzgXSpswQC2MsezfsDKAkhtKTC3211BpY';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_W500 = 'https://image.tmdb.org/t/p/w500';
const IMAGE_BASE_ORIGINAL = 'https://image.tmdb.org/t/p/original';

const GENRE_MAP = {
  28: "Ação",
  12: "Aventura",
  16: "Animação",
  35: "Comédia",
  80: "Crime",
  99: "Documentário",
  18: "Drama",
  10751: "Família",
  14: "Fantasia",
  36: "História",
  27: "Terror",
  10402: "Música",
  9648: "Mistério",
  10749: "Romance",
  878: "Ficção Científica",
  10770: "Cinema TV",
  53: "Suspense",
  10752: "Guerra",
  37: "Faroeste",
  10759: "Ação & Aventura",
  10762: "Kids",
  10763: "Notícias",
  10764: "Reality",
  10765: "Sci-Fi & Fantasia",
  10766: "Novela",
  10767: "Talk Show",
  10768: "Guerra & Política",
};

export const GENRE_FILTERS = [
  { id: 'all', label: 'Todos', genreId: null, icon: 'Flame' },
  { id: 'series', label: 'Séries', type: 'series', icon: 'Tv' },
  { id: 'movies', label: 'Filmes', type: 'movie', icon: 'Film' },
  { id: 'anime', label: 'Animes', type: 'anime', icon: 'Sparkles' },
  { id: 'action', label: 'Ação', genreId: 28, icon: 'Zap' },
  { id: 'scifi', label: 'Ficção Científica', genreId: 878, icon: 'Sparkles' },
  { id: 'thriller', label: 'Suspense', genreId: 53, icon: 'Shield' },
  { id: 'animation', label: 'Animação', genreId: 16, icon: 'Clapperboard' },
  { id: 'drama', label: 'Drama', genreId: 18, icon: 'Compass' },
  { id: 'crime', label: 'Crime', genreId: 80, icon: 'Search' },
];

export const getPosterUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop';
  return `${IMAGE_BASE_W500}${path}`;
};

export const getBackdropUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=2070&auto=format&fit=crop';
  return `${IMAGE_BASE_ORIGINAL}${path}`;
};

async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('language', 'pt-BR');
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      url.searchParams.set(key, val);
    }
  });

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${TMDB_READ_TOKEN}`,
        accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`TMDB error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`Falha ao buscar TMDB [${endpoint}]:`, error);
    return null;
  }
}

export function formatMedia(item, explicitType = null) {
  if (!item) return null;

  let type = explicitType;
  if (!type) {
    if (item.media_type === 'tv' || item.media_type === 'series') {
      type = 'series';
    } else if (item.media_type === 'movie') {
      type = 'movie';
    } else if (item.name && !item.title) {
      type = 'series';
    } else if (item.title && !item.name) {
      type = 'movie';
    } else if (item.number_of_seasons || item.seasons) {
      type = 'series';
    } else {
      type = 'movie';
    }
  }

  const genres = item.genres
    ? item.genres.map((g) => g.name)
    : item.genre_ids
    ? item.genre_ids.map((id) => GENRE_MAP[id] || 'Cinema').filter(Boolean)
    : ['Cinema'];

  const releaseDate = item.release_date || item.first_air_date || '';
  const year = releaseDate ? releaseDate.substring(0, 4) : '2025';

  const rawRating = item.vote_average || 7.6;
  const matchScore = Math.min(99, Math.max(85, Math.round(rawRating * 10)));

  return {
    id: `${type}-${item.id}`,
    tmdbId: item.id,
    imdbId: item.imdb_id || item.external_ids?.imdb_id || null,
    type,
    title: item.title || item.name || item.original_title || item.original_name || 'Sem Título',
    tagline: item.tagline || '',
    synopsis: item.overview || 'Sinopse oficial disponível em breve para esta produção.',
    year,
    rating: item.adult ? '18+' : item.vote_average >= 8 ? '16+' : '14+',
    matchScore,
    backdrop: getBackdropUrl(item.backdrop_path || item.poster_path),
    poster: getPosterUrl(item.poster_path || item.backdrop_path),
    genres: genres.length > 0 ? genres : ['Cinema'],
    quality: ['4K Ultra HD', 'HDR10', 'Dolby Atmos'],
    voteAverage: rawRating.toFixed(1),
    duration: item.runtime
      ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}min`
      : item.number_of_seasons
      ? `${item.number_of_seasons} Temporada${item.number_of_seasons > 1 ? 's' : ''}`
      : type === 'series'
      ? 'Série Kairou'
      : '2h 10min',
    seasonsCount: item.number_of_seasons || 1,
    seasons: item.seasons || [],
    trailerKey: null,
  };
}

// Catálogos e Trilhos
export async function fetchTrending(type = 'all', time = 'week') {
  const data = await tmdbFetch(`/trending/${type}/${time}`);
  if (!data?.results) return [];
  return data.results
    .filter((i) => i.poster_path && i.backdrop_path && (i.media_type !== 'person'))
    .map((item) => formatMedia(item));
}

export async function fetchTopRatedMovies() {
  const data = await tmdbFetch('/movie/top_rated');
  if (!data?.results) return [];
  return data.results
    .filter((i) => i.poster_path && i.backdrop_path)
    .slice(0, 10)
    .map((item) => formatMedia(item, 'movie'));
}

export async function fetchPopularMovies() {
  const data = await tmdbFetch('/movie/popular');
  if (!data?.results) return [];
  return data.results
    .filter((i) => i.poster_path && i.backdrop_path)
    .map((item) => formatMedia(item, 'movie'));
}

export async function fetchPopularTV() {
  const data = await tmdbFetch('/tv/popular');
  if (!data?.results) return [];
  return data.results
    .filter((i) => i.poster_path && i.backdrop_path)
    .map((item) => formatMedia(item, 'series'));
}

export async function fetchByGenre(genreId, type = 'movie') {
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
  const data = await tmdbFetch(endpoint, {
    with_genres: genreId,
    sort_by: 'popularity.desc',
  });
  if (!data?.results) return [];
  return data.results
    .filter((i) => i.poster_path && i.backdrop_path)
    .map((item) => formatMedia(item, type));
}

export async function fetchAnimeSeries() {
  const data = await tmdbFetch('/discover/tv', {
    with_genres: 16,
    with_original_language: 'ja',
    sort_by: 'popularity.desc',
  });
  if (!data?.results) return [];
  return data.results
    .filter((i) => i.poster_path && i.backdrop_path)
    .map((item) => formatMedia(item, 'series'));
}

export async function fetchAnimeMovies() {
  const data = await tmdbFetch('/discover/movie', {
    with_genres: 16,
    with_original_language: 'ja',
    sort_by: 'popularity.desc',
  });
  if (!data?.results) return [];
  return data.results
    .filter((i) => i.poster_path && i.backdrop_path)
    .map((item) => formatMedia(item, 'movie'));
}

export async function fetchTopAnime() {
  const data = await tmdbFetch('/discover/tv', {
    with_genres: 16,
    with_original_language: 'ja',
    sort_by: 'vote_average.desc',
    'vote_count.gte': 150,
  });
  if (!data?.results) return [];
  return data.results
    .filter((i) => i.poster_path && i.backdrop_path)
    .map((item) => formatMedia(item, 'series'));
}

// Detalhes Completos com Elenco, Trailer e Títulos Semelhantes
export async function fetchMediaDetails(tmdbId, type = 'movie') {
  const isSeries = type === 'series' || type === 'tv';
  const endpoint = isSeries ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
  const data = await tmdbFetch(endpoint, {
    append_to_response: 'credits,videos,similar,external_ids',
  });

  if (!data) return null;

  const formatted = formatMedia(data, isSeries ? 'series' : 'movie');
  formatted.imdbId = data.external_ids?.imdb_id || data.imdb_id || null;

  // Elenco principal
  if (data.credits?.cast) {
    formatted.cast = data.credits.cast.slice(0, 6).map((c) => c.name);
  }

  // Direção
  if (data.credits?.crew) {
    const director = data.credits.crew.find((c) => c.job === 'Director');
    if (director) formatted.director = director.name;
  }

  // Trailer do YouTube
  if (data.videos?.results) {
    const officialTrailer =
      data.videos.results.find(
        (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      ) || data.videos.results.find((v) => v.site === 'YouTube');
    if (officialTrailer) {
      formatted.trailerKey = officialTrailer.key;
    }
  }

  // Títulos Semelhantes
  if (data.similar?.results) {
    formatted.similar = data.similar.results
      .filter((i) => i.poster_path)
      .slice(0, 6)
      .map((item) => formatMedia(item, type));
  }

  // Temporadas completas (para TV)
  if (type === 'series' && data.seasons) {
    formatted.seasons = data.seasons.filter((s) => s.season_number > 0);
  }

  return formatted;
}

// Busca episódios de uma temporada específica
export async function fetchSeasonEpisodes(tvTmdbId, seasonNumber) {
  const data = await tmdbFetch(`/tv/${tvTmdbId}/season/${seasonNumber}`);
  if (!data?.episodes) return [];
  return data.episodes.map((ep) => ({
    ep: ep.episode_number,
    title: ep.name || `Episódio ${ep.episode_number}`,
    duration: ep.runtime ? `${ep.runtime}m` : '50m',
    thumbnail: ep.still_path
      ? getPosterUrl(ep.still_path)
      : 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=600&auto=format&fit=crop',
    synopsis: ep.overview || 'Sinopse deste episódio disponível na transmissão.',
  }));
}

// Busca Ao Vivo
export async function searchTMDB(query) {
  if (!query || !query.trim()) return [];
  const data = await tmdbFetch('/search/multi', {
    query: query.trim(),
    page: 1,
    include_adult: false,
  });
  return data.results
    .filter((item) => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
    .map((item) => formatMedia(item, item.media_type === 'tv' ? 'series' : 'movie'));
}

// Busca IDs externos (IMDb ID)
export async function fetchMediaExternalIds(id, type = 'movie') {
  const isSeries = type === 'series' || type === 'tv';
  const data = await tmdbFetch(`/${isSeries ? 'tv' : 'movie'}/${id}/external_ids`);
  return data?.imdb_id || null;
}


