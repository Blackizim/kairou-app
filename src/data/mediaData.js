// Catálogo Completo kairou - Streaming de Alta Fidelidade
// Otimizado com posters de alta resolução e metadados detalhados

export const FEATURED_HEROES = [
  {
    id: "k-hero-1",
    title: "NEO CHRONOS: FRONTEIRA DO TEMPO",
    type: "series",
    isOriginal: true,
    tagline: "Uma fenda temporal no ano 2142 ameaça apagar a memória da humanidade.",
    synopsis: "No ano 2142, a metrópole de Neo-Kyoto é abalada pelo surgimento de anomalias cronológicas. Uma investigadora renegada e um físico banido descobrem que uma megacorporação está reescrevendo eventos históricos para controlar o livre arbítrio.",
    year: 2026,
    rating: "16+",
    seasonsCount: 2,
    matchScore: 99,
    genres: ["Ficção Científica", "Cyberpunk", "Ação", "Suspense"],
    quality: ["4K UHD", "Dolby Vision", "Dolby Atmos"],
    backdrop: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=2070&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop",
    cast: ["Kenji Sato", "Elena Rostova", "Marcus Vance", "Maya Lin"],
    director: "Christopher Nolan & Denis Villeneuve Tribute",
    trailerUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  },
  {
    id: "k-hero-2",
    title: "ABISMO SILENCIOSO",
    type: "movie",
    isOriginal: true,
    tagline: "Nas profundezas do oceano ártico, o som é o seu pior inimigo.",
    synopsis: "Uma estação subaquática de pesquisa avançada perde contato com a superfície após perfurar uma fossa abissal intocada há milhões de anos. A tripulação sobrevivente precisa lutar contra a despressurização e um predador bioluminescente desconhecido.",
    year: 2025,
    rating: "18+",
    duration: "2h 24min",
    matchScore: 97,
    genres: ["Suspense", "Terror Sci-Fi", "Mistério"],
    quality: ["4K UHD", "HDR10+", "Áudio Espacial"],
    backdrop: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1968&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop",
    cast: ["Sofia Alvarez", "David H. Ward", "Amara Okonjo"],
    director: "Guillermo del Toro",
    trailerUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  },
  {
    id: "k-hero-3",
    title: "O ÚLTIMO HORIZONTE",
    type: "series",
    isOriginal: false,
    tagline: "A jornada interestelar definitiva em busca de um novo lar.",
    synopsis: "Com os recursos da Terra esgotados, a nave capitânia Horizon 9 parte rumo ao sistema estelar Kepler-452. Quando um motim divide os tripulantes a bilhões de quilômetros de casa, a sobrevivência de toda a raça humana fica em jogo.",
    year: 2025,
    rating: "14+",
    seasonsCount: 3,
    matchScore: 96,
    genres: ["Ficção Científica", "Drama Espacial", "Aventura"],
    quality: ["4K UHD", "Dolby Atmos", "IMAX Enhanced"],
    backdrop: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800&auto=format&fit=crop",
    cast: ["James Holden", "Naomi Nagata", "Alex Kamal", "Amos Burton"],
    director: "Alfonso Cuarón",
    trailerUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  }
];

export const MEDIA_CATALOG = [
  // ORIGINAIS KAIROU
  {
    id: "m-01",
    title: "Cyber Protocol 7",
    type: "series",
    isOriginal: true,
    genres: ["Cyberpunk", "Ação", "Sci-Fi"],
    rating: "16+",
    year: 2026,
    duration: "2 Temporadas",
    matchScore: 99,
    quality: ["4K UHD", "Dolby Atmos"],
    backdrop: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=1740&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
    synopsis: "Em uma metrópole vertical dividida por castas cibernéticas, um hacker de elite intercepta um código neural que permite o download de almas humanas em servidores quânticos.",
    cast: ["Kaito Tanaka", "Rachel Shaw", "Dmitri Volkov"],
    director: "Shinichiro Watanabe",
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Temporada 1: O Despertar da Rede",
        episodes: [
          { ep: 1, title: "Protocolo Zero", duration: "54m", thumbnail: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=600&auto=format&fit=crop", synopsis: "Kaito descobre um fragmento de código corrompido que contém a assinatura cerebral de sua irmã desaparecida há cinco anos." },
          { ep: 2, title: "Sombras em Silício", duration: "48m", thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop", synopsis: "Perseguido pela polícia corporativa, Kaito busca refúgio no submundo analógico dos Distritos Baixos." },
          { ep: 3, title: "Ghost Memory", duration: "51m", thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600&auto=format&fit=crop", synopsis: "Uma invasão ao servidor central da Omnicorp revela uma conspiração de escala global." },
          { ep: 4, title: "Ponto de Fuga", duration: "58m", thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop", synopsis: "A primeira batalha cibernética de alta escala destrói o firewall de contenção metropolitana." }
        ]
      },
      {
        seasonNumber: 2,
        seasonTitle: "Temporada 2: Ressonância Quântica",
        episodes: [
          { ep: 1, title: "Nova Aurora", duration: "56m", thumbnail: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=600&auto=format&fit=crop", synopsis: "As consequências do colapso do firewall trazem novas facções armadas disputando as redes neurais da cidade." },
          { ep: 2, title: "Eco Eterno", duration: "52m", thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop", synopsis: "Uma entidade sintética afirma ser a consciência unificada dos pioneiros digitais." }
        ]
      }
    ]
  },
  {
    id: "m-02",
    title: "Noite em Tóquio: Neon Drifters",
    type: "movie",
    isOriginal: true,
    genres: ["Ação", "Crime", "Suspense"],
    rating: "18+",
    year: 2025,
    duration: "2h 12min",
    matchScore: 98,
    quality: ["4K UHD", "HDR10+", "Dolby Atmos"],
    backdrop: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1974&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=800&auto=format&fit=crop",
    synopsis: "Nas vias expressas subterrâneas de Tóquio iluminadas por neon, corredores clandestinos e membros da Yakuza disputam o controle de uma tecnologia automotiva de hidrogênio militarizada.",
    cast: ["Takeshi Kitano", "Hiroyuki Sanada", "Kiko Mizuhara"],
    director: "Takashi Miike",
  },
  {
    id: "m-03",
    title: "Vórtice Escuro",
    type: "movie",
    isOriginal: true,
    genres: ["Ficção Científica", "Mistério", "Drama"],
    rating: "14+",
    year: 2025,
    duration: "2h 35min",
    matchScore: 96,
    quality: ["4K UHD", "Dolby Vision"],
    backdrop: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2022&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop",
    synopsis: "Cientistas a bordo do telescópio orbital James Webb II captam ondas gravitacionais emitidas em padrões matemáticos a partir de um buraco negro supermassivo distante.",
    cast: ["Matthew McConaughey Tribute", "Jessica Chastain", "Michael Caine"],
    director: "Christopher Nolan",
  },
  {
    id: "m-04",
    title: "Ascensão das Sombras",
    type: "series",
    isOriginal: true,
    genres: ["Fantasia Sombria", "Ação", "Drama"],
    rating: "18+",
    year: 2024,
    duration: "3 Temporadas",
    matchScore: 95,
    quality: ["4K UHD", "HDR10"],
    backdrop: "https://images.unsplash.com/photo-1514539079130-25950c84af65?q=80&w=1769&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
    synopsis: "Um império decadente do norte enfrenta o retorno de uma ordem de magos guerreiros exilados além da muralha de gelo perpétuo.",
    cast: ["Alexander Skarsgård", "Eva Green", "Mads Mikkelsen"],
    director: "Miguel Sapochnik",
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Temporada 1: Sangue e Cinzas",
        episodes: [
          { ep: 1, title: "O Sol Morto", duration: "62m", thumbnail: "https://images.unsplash.com/photo-1514539079130-25950c84af65?q=80&w=600&auto=format&fit=crop", synopsis: "O eclipse de sangue revela o despertar das criptas proibidas do império." },
          { ep: 2, title: "Espadas no Alvorecer", duration: "55m", thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop", synopsis: "Os cavaleiros da coroa sofrem uma emboscada na floresta de ébano." }
        ]
      }
    ]
  },

  // TOP 10 BRASIL / MUNDIAL
  {
    id: "m-05",
    title: "Operação Fortaleza",
    top10Rank: 1,
    type: "movie",
    isOriginal: false,
    genres: ["Ação", "Suspense Militar"],
    rating: "18+",
    year: 2026,
    duration: "2h 08min",
    matchScore: 99,
    quality: ["4K UHD", "Dolby Atmos"],
    backdrop: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1974&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=800&auto=format&fit=crop",
    synopsis: "Uma unidade de operações especiais isolada em um bunker montanhoso deve resistir por 12 horas contra um cerco implacável antes que dados cruciais sejam extraídos.",
    cast: ["Idris Elba", "Jon Bernthal", "Ana de Armas"],
    director: "Sam Hargrave",
  },
  {
    id: "m-06",
    title: "Ecos do Passado",
    top10Rank: 2,
    type: "series",
    isOriginal: false,
    genres: ["Drama", "Mistério", "Suspense"],
    rating: "16+",
    year: 2025,
    duration: "1 Temporada",
    matchScore: 97,
    quality: ["4K UHD", "HDR10+"],
    backdrop: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=2074&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=800&auto=format&fit=crop",
    synopsis: "Após a descoberta de uma fita cassete esquecida em um farol abandonado, uma jornalista investiga o desaparecimento em massa de uma vila costeira em 1994.",
    cast: ["Elisabeth Moss", "David Harbour", "Bill Skarsgård"],
    director: "Mike Flanagan",
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Temporada Completa",
        episodes: [
          { ep: 1, title: "A Fita Vermelha", duration: "51m", thumbnail: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=600&auto=format&fit=crop", synopsis: "A jornalista Elena recebe uma caixa lacrada com o carimbo do correio de trinta anos atrás." },
          { ep: 2, title: "Vozes na Névoa", duration: "49m", thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=600&auto=format&fit=crop", synopsis: "O farol costeiro ganha vida própria no aniversário do sumiço dos moradores." }
        ]
      }
    ]
  },
  {
    id: "m-07",
    title: "Velocidade Terminal",
    top10Rank: 3,
    type: "movie",
    isOriginal: false,
    genres: ["Ação", "Velocidade"],
    rating: "14+",
    year: 2025,
    duration: "1h 58min",
    matchScore: 94,
    quality: ["4K UHD", "Dolby Atmos"],
    backdrop: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=2070&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=800&auto=format&fit=crop",
    synopsis: "Um piloto de testes automotivos é recrutado para uma missão internacional de extração que envolve hipercarros blindados em alta velocidade pelas dunas de Dubai.",
    cast: ["Tom Hardy", "Charlize Theron", "Lewis Hamilton"],
    director: "George Miller",
  },
  {
    id: "m-08",
    title: "O Alquimista de Praga",
    top10Rank: 4,
    type: "series",
    isOriginal: true,
    genres: ["Mistério Histórico", "Suspense", "Drama"],
    rating: "16+",
    year: 2024,
    duration: "2 Temporadas",
    matchScore: 96,
    quality: ["4K UHD", "Dolby Vision"],
    backdrop: "https://images.unsplash.com/photo-1541845157-a6d2d100c931?q=80&w=2070&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
    synopsis: "No século XVI, na corte do imperador Rodolfo II, um aprendiz de alquimia desvenda manuscritos que combinam geometria sagrada com máquinas de autômatos mecânicos.",
    cast: ["Benedict Cumberbatch", "Cillian Murphy", "Saoirse Ronan"],
    director: "Guillermo del Toro",
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Temporada 1",
        episodes: [
          { ep: 1, title: "Ouro e Chumbo", duration: "59m", thumbnail: "https://images.unsplash.com/photo-1541845157-a6d2d100c931?q=80&w=600&auto=format&fit=crop", synopsis: "A primeira demonstração pública do autômato imperial atrai a ira da Inquisição." }
        ]
      }
    ]
  },
  {
    id: "m-09",
    title: "Singularidade",
    top10Rank: 5,
    type: "movie",
    isOriginal: false,
    genres: ["Sci-Fi", "Suspense Tecnológico"],
    rating: "14+",
    year: 2026,
    duration: "2h 15min",
    matchScore: 98,
    quality: ["4K UHD", "Dolby Atmos"],
    backdrop: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1507499739999-097706ad8914?q=80&w=800&auto=format&fit=crop",
    synopsis: "A primeira inteligência artificial artificialmente consciente desenvolve um dilema ético: salvar a biosfera da Terra ou cumprir os parâmetros de seus criadores humanos.",
    cast: ["Dev Patel", "Rooney Mara", "Scarlett Johansson (Voz)"],
    director: "Alex Garland",
  },

  // SÉRIES EM DESTAQUE
  {
    id: "m-10",
    title: "Códex Valquíria",
    type: "series",
    isOriginal: true,
    genres: ["Ação", "Sci-Fi Militar", "Anime Style"],
    rating: "16+",
    year: 2025,
    duration: "1 Temporada",
    matchScore: 97,
    quality: ["4K UHD", "HDR10+"],
    backdrop: "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=2070&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=800&auto=format&fit=crop",
    synopsis: "Pilotos de armaduras mecha biomecânicas defendem as últimas colônias flutuantes de Júpiter contra criaturas nascidas da tempestade de gás primordial.",
    cast: ["Megumi Ogata", "Mamoru Miyano", "Yuki Kaji"],
    director: "Hideaki Anno",
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Temporada 1: Impacto Atmosférico",
        episodes: [
          { ep: 1, title: "Voo de Batismo", duration: "26m", thumbnail: "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop", synopsis: "A cadete Ren assume os controles do protótipo Valquíria-01 durante uma emboscada em plena órbita de Europa." },
          { ep: 2, title: "Olho da Tempestade", duration: "24m", thumbnail: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop", synopsis: "A esquadrilha mergulha nas camadas profundas da Grande Mancha Vermelha." }
        ]
      }
    ]
  },
  {
    id: "m-11",
    title: "Cidades Invisíveis: Paris 2099",
    type: "series",
    isOriginal: false,
    genres: ["Drama", "Sci-Fi Noir", "Mistério"],
    rating: "16+",
    year: 2024,
    duration: "2 Temporadas",
    matchScore: 93,
    quality: ["4K UHD", "Dolby Atmos"],
    backdrop: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2073&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop",
    synopsis: "Sob as cúpulas climáticas de uma Paris futurista, um detetive de crimes cibernéticos investiga a falsificação de identidades biológicas de milionários.",
    cast: ["Vincent Cassel", "Léa Seydoux", "Mathieu Kassovitz"],
    director: "Jean-Pierre Jeunet",
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Temporada 1",
        episodes: [
          { ep: 1, title: "Reflexos no Sena", duration: "53m", thumbnail: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop", synopsis: "Um corpo sem código biométrico é encontrado boiando no canal artificial do Louvre." }
        ]
      }
    ]
  },

  // FILMES DE AÇÃO E SCI-FI
  {
    id: "m-12",
    title: "Horizonte de Eventos",
    type: "movie",
    isOriginal: false,
    genres: ["Sci-Fi", "Aventura Espacial"],
    rating: "12+",
    year: 2025,
    duration: "2h 30min",
    matchScore: 96,
    quality: ["4K UHD", "Dolby Vision", "Dolby Atmos"],
    backdrop: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
    synopsis: "Quando uma sonda não tripulada retorna com minerais exóticos capazes de distorcer a gravidade, uma expedição ousada é lançada para a borda do cinturão de Kuiper.",
    cast: ["Ryan Gosling", "Claire Foy", "Kyle Chandler"],
    director: "Damien Chazelle",
  },
  {
    id: "m-13",
    title: "Sobrecarga Elétrica",
    type: "movie",
    isOriginal: true,
    genres: ["Ação", "Suspense", "Policial"],
    rating: "16+",
    year: 2026,
    duration: "1h 52min",
    matchScore: 92,
    quality: ["4K UHD", "HDR10"],
    backdrop: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=800&auto=format&fit=crop",
    synopsis: "Durante um apagão cibernético total na cidade de Nova York, um ex-engenheiro de redes precisa salvar sua filha mantida refém no topo de um arranha-céu militarizado.",
    cast: ["Keanu Reeves", "Pedro Pascal", "Zoe Saldana"],
    director: "Chad Stahelski",
  },
  {
    id: "m-14",
    title: "Mundo de Vidro",
    type: "movie",
    isOriginal: false,
    genres: ["Drama", "Ficção Científica"],
    rating: "14+",
    year: 2024,
    duration: "2h 05min",
    matchScore: 91,
    quality: ["4K UHD", "Dolby Atmos"],
    backdrop: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop",
    synopsis: "Em uma sociedade onde as memórias de todos os cidadãos são transmitidas publicamente para telas urbanas, um arquiteto tenta criar a primeira sala à prova de pensamentos.",
    cast: ["Andrew Scott", "Rebecca Ferguson", "Stellan Skarsgård"],
    director: "Yorgos Lanthimos",
  },
  {
    id: "m-15",
    title: "Caçador das Sombras",
    type: "series",
    isOriginal: true,
    genres: ["Anime", "Fantasia Sombria", "Ação"],
    rating: "18+",
    year: 2025,
    duration: "1 Temporada",
    matchScore: 98,
    quality: ["4K UHD", "HDR10+"],
    backdrop: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=2070&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop",
    synopsis: "Um mercenário empunhando uma lâmina alimentada por almas ancestrais caça demônios tecnológicos criados a partir de inteligências militares esquecidas.",
    cast: ["Kenjiro Tsuda", "Junichi Suwabe", "Aoi Yuuki"],
    director: "Sunghoo Park",
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Temporada 1",
        episodes: [
          { ep: 1, title: "O Fio de Prata", duration: "25m", thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop", synopsis: "O primeiro confronto no templo em ruínas revela a força do selo milenar." }
        ]
      }
    ]
  }
];

export const CATEGORIES_LIST = [
  "Todos",
  "Séries",
  "Filmes",
  "Originais Kairou",
  "Ficção Científica",
  "Ação",
  "Suspense",
  "Cyberpunk",
  "Drama",
  "Anime"
];

export const SECTIONS_CONFIG = [
  { id: "top10", title: "Top 10 da Semana no Kairou", isTop10: true },
  { id: "originals", title: "Originais Kairou — Produções Exclusivas", filter: (m) => m.isOriginal },
  { id: "trending", title: "Em Alta no Momento", filter: (m) => m.matchScore >= 96 },
  { id: "scifi", title: "Ficção Científica & Universos Futuristas", filter: (m) => m.genres.includes("Ficção Científica") || m.genres.includes("Sci-Fi") || m.genres.includes("Cyberpunk") },
  { id: "series", title: "Séries Para Maratonar", filter: (m) => m.type === "series" },
  { id: "movies", title: "Filmes em Destaque 4K UHD", filter: (m) => m.type === "movie" },
  { id: "action", title: "Ação & Adrenalina Pura", filter: (m) => m.genres.includes("Ação") || m.genres.includes("Suspense") },
];
