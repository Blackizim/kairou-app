// Vercel Serverless Function: /api/matches
// Fetches live sports matches (Futebol, NBA, UFC, F1) from ESPN API
// Enriches with team logos, tournament details, broadcast channels, and viewer counts

const cache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

// Channel slug mapping based on competition & teams
function getBroadcastChannel(competition, homeTeam, awayTeam) {
  const compLower = (competition || '').toLowerCase();
  const homeLower = (homeTeam || '').toLowerCase();
  const awayLower = (awayTeam || '').toLowerCase();

  if (compLower.includes('brasileir') || compLower.includes('serie a') || compLower.includes('copa do brasil')) {
    if (homeLower.includes('flamengo') || awayLower.includes('flamengo') || homeLower.includes('palmeiras') || awayLower.includes('palmeiras')) {
      return { slug: 'premiere', name: 'Premiere HD' };
    }
    if (homeLower.includes('corinthians') || awayLower.includes('corinthians') || homeLower.includes('são paulo') || awayLower.includes('são paulo')) {
      return { slug: 'premiere-2', name: 'Premiere 2 HD' };
    }
    if (homeLower.includes('botafogo') || awayLower.includes('botafogo') || homeLower.includes('vasco') || awayLower.includes('vasco')) {
      return { slug: 'sportv', name: 'SporTV HD' };
    }
    if (homeLower.includes('grêmio') || awayLower.includes('grêmio') || homeLower.includes('internacional') || awayLower.includes('internacional')) {
      return { slug: 'premiere-3', name: 'Premiere 3 HD' };
    }
    if (homeLower.includes('cruzeiro') || awayLower.includes('cruzeiro') || homeLower.includes('atlético') || awayLower.includes('atlético')) {
      return { slug: 'premiere-4', name: 'Premiere 4 HD' };
    }
    return { slug: 'sportv', name: 'SporTV HD' };
  }

  if (compLower.includes('champions') || compLower.includes('uefa')) {
    return { slug: 'tnt', name: 'TNT HD' };
  }

  if (compLower.includes('premier league') || compLower.includes('laliga') || compLower.includes('serie a') || compLower.includes('bundesliga')) {
    return { slug: 'espn', name: 'ESPN HD' };
  }

  if (compLower.includes('libertadores') || compLower.includes('sudamericana')) {
    return { slug: 'espn-4', name: 'ESPN 4 HD' };
  }

  if (compLower.includes('nba') || compLower.includes('basquete')) {
    return { slug: 'espn-2', name: 'ESPN 2 HD' };
  }

  if (compLower.includes('ufc') || compLower.includes('luta') || compLower.includes('mma')) {
    return { slug: 'combate', name: 'Combate HD' };
  }

  if (compLower.includes('fórmula') || compLower.includes('f1') || compLower.includes('motor')) {
    return { slug: 'bandsports', name: 'BandSports HD' };
  }

  return { slug: 'cazetv', name: 'Cazé TV HD' };
}

// Generate realistic live viewer count based on match prestige
function getEstimatedViewers(homeTeam, awayTeam, isLive) {
  const teams = (homeTeam + ' ' + awayTeam).toLowerCase();
  let base = 45000;

  if (teams.includes('flamengo') || teams.includes('corinthians') || teams.includes('palmeiras') || teams.includes('real madrid') || teams.includes('barcelona')) {
    base = 140000;
  } else if (teams.includes('são paulo') || teams.includes('botafogo') || teams.includes('vasco') || teams.includes('liverpool') || teams.includes('manchester')) {
    base = 95000;
  } else if (teams.includes('santos') || teams.includes('grêmio') || teams.includes('cruzeiro') || teams.includes('atlético')) {
    base = 78000;
  }

  if (!isLive) {
    base = Math.floor(base * 0.35);
  }

  const jitter = ((homeTeam.length * 1337 + awayTeam.length * 43) % 25000);
  const total = base + jitter;
  return total >= 1000 ? Math.round(total / 1000) + 'k assistindo' : total + ' assistindo';
}

// Curated Brazilian & International fallback matches when leagues are between matchdays
const DEFAULT_MATCHES = [
  {
    id: 'bra-bot-brag',
    sport: 'futebol',
    category: 'Futebol Ao Vivo',
    league: 'Brasileirão Série A',
    leagueShort: 'SÉRIE A',
    homeTeam: {
      name: 'Botafogo',
      shortName: 'BOT',
      logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/3454.png',
      score: '1',
    },
    awayTeam: {
      name: 'RB Bragantino',
      shortName: 'RBB',
      logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/10357.png',
      score: '0',
    },
    status: 'AO VIVO',
    statusDetail: "2º Tempo • 68'",
    time: '20:30',
    isLive: true,
    viewers: '105k assistindo',
    channel: { slug: 'premiere', name: 'Premiere HD' },
    isFeatured: true,
    bannerBackdrop: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 'bra-san-cruz',
    sport: 'futebol',
    category: 'Futebol Ao Vivo',
    league: 'Brasileirão Série A',
    leagueShort: 'SÉRIE A',
    homeTeam: {
      name: 'Santos',
      shortName: 'SAN',
      logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/2674.png',
      score: '2',
    },
    awayTeam: {
      name: 'Cruzeiro',
      shortName: 'CRU',
      logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/3450.png',
      score: '1',
    },
    status: 'AO VIVO',
    statusDetail: "1º Tempo • 41'",
    time: '19:00',
    isLive: true,
    viewers: '89k assistindo',
    channel: { slug: 'sportv', name: 'SporTV HD' },
    isFeatured: false,
  },
  {
    id: 'mls-mia-nash',
    sport: 'futebol',
    category: 'Futebol Ao Vivo',
    league: 'MLS',
    leagueShort: 'MLS',
    homeTeam: {
      name: 'Inter Miami',
      shortName: 'MIA',
      logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/19830.png',
      score: '3',
    },
    awayTeam: {
      name: 'Nashville SC',
      shortName: 'NSH',
      logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/19827.png',
      score: '1',
    },
    status: 'AO VIVO',
    statusDetail: "2º Tempo • 82'",
    time: '20:30',
    isLive: true,
    viewers: '120k assistindo',
    channel: { slug: 'cazetv', name: 'Cazé TV HD' },
    isFeatured: false,
  },
  {
    id: 'bra-pal-spfc',
    sport: 'futebol',
    category: 'Futebol Ao Vivo',
    league: 'Brasileirão Série A',
    leagueShort: 'SÉRIE A',
    homeTeam: {
      name: 'Palmeiras',
      shortName: 'PAL',
      logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/2029.png',
      score: '',
    },
    awayTeam: {
      name: 'São Paulo',
      shortName: 'SPFC',
      logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/2026.png',
      score: '',
    },
    status: 'EM BREVE',
    statusDetail: 'Hoje às 21:30',
    time: '21:30',
    isLive: false,
    viewers: '75k assistindo',
    channel: { slug: 'premiere-2', name: 'Premiere 2 HD' },
    isFeatured: true,
  },
  {
    id: 'bra-fla-cor',
    sport: 'futebol',
    category: 'Futebol Ao Vivo',
    league: 'Brasileirão Série A',
    leagueShort: 'SÉRIE A',
    homeTeam: {
      name: 'Flamengo',
      shortName: 'FLA',
      logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/2028.png',
      score: '',
    },
    awayTeam: {
      name: 'Corinthians',
      shortName: 'COR',
      logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/1930.png',
      score: '',
    },
    status: 'EM BREVE',
    statusDetail: 'Amanhã às 16:00',
    time: '16:00',
    isLive: false,
    viewers: '185k aguardando',
    channel: { slug: 'globo-sp', name: 'Globo SP HD' },
    isFeatured: true,
  },
  {
    id: 'cop-pri-nor',
    sport: 'futebol',
    category: 'Futebol Ao Vivo',
    league: 'Copa Paulista',
    leagueShort: 'COPA PAULISTA',
    homeTeam: {
      name: 'Primavera',
      shortName: 'PRI',
      logo: 'https://reidosembeds.online/img/sportv.png',
      score: '0',
    },
    awayTeam: {
      name: 'Noroeste',
      shortName: 'NOR',
      logo: 'https://reidosembeds.online/img/sportv2.png',
      score: '0',
    },
    status: 'AO VIVO',
    statusDetail: "1º Tempo • 28'",
    time: '15:00',
    isLive: true,
    viewers: '68k assistindo',
    channel: { slug: 'cazetv', name: 'Cazé TV HD' },
    isFeatured: false,
  },
  {
    id: 'ufc-noche',
    sport: 'lutas',
    category: 'UFC & Lutas',
    league: 'Noche UFC',
    leagueShort: 'UFC / MMA',
    homeTeam: {
      name: 'Jean Silva',
      shortName: 'J. SILVA',
      logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/mma.png',
      score: '',
    },
    awayTeam: {
      name: 'José Delgado',
      shortName: 'J. DELGADO',
      logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/mma.png',
      score: '',
    },
    status: 'AO VIVO',
    statusDetail: 'Card Principal • Round 2',
    time: '22:00',
    isLive: true,
    viewers: '180k assistindo',
    channel: { slug: 'combate', name: 'Combate HD' },
    isFeatured: true,
  },
  {
    id: 'f1-gp',
    sport: 'motor',
    category: 'Fórmula 1 & Motor',
    league: 'Fórmula 1',
    leagueShort: 'F1 / MOTOGP',
    homeTeam: {
      name: 'GP de São Paulo',
      shortName: 'INTERLAGOS',
      logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/f1.png',
      score: '',
    },
    awayTeam: {
      name: 'Classificação Oficial',
      shortName: 'QUALIFYING',
      logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/f1.png',
      score: '',
    },
    status: 'EM BREVE',
    statusDetail: 'Q3 • Hoje às 15:00',
    time: '15:00',
    isLive: false,
    viewers: '142k aguardando',
    channel: { slug: 'bandsports', name: 'BandSports HD' },
    isFeatured: false,
  }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check cache
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return res.status(200).json({ ok: true, cached: true, matches: cache.data });
  }

  const liveMatches = [];

  const endpoints = [
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard', leagueName: 'Brasileirão Série A', sport: 'futebol' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard', leagueName: 'Premier League', sport: 'futebol' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard', leagueName: 'UEFA Champions League', sport: 'futebol' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard', leagueName: 'LaLiga', sport: 'futebol' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.libertadores/scoreboard', leagueName: 'Copa Libertadores', sport: 'futebol' },
    { url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard', leagueName: 'NBA', sport: 'basquete' }
  ];

  await Promise.all(
    endpoints.map(async (ep) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const r = await fetch(ep.url, { signal: controller.signal });
        clearTimeout(timer);

        if (!r.ok) return;
        const data = await r.json();

        if (Array.isArray(data.events)) {
          for (const ev of data.events.slice(0, 4)) {
            const comp = ev.competitions && ev.competitions[0];
            if (!comp || !Array.isArray(comp.competitors) || comp.competitors.length < 2) continue;

            const home = comp.competitors.find((c) => c.homeAway === 'home') || comp.competitors[0];
            const away = comp.competitors.find((c) => c.homeAway === 'away') || comp.competitors[1];

            const homeName = (home.team && (home.team.displayName || home.team.name)) || 'Time A';
            const awayName = (away.team && (away.team.displayName || away.team.name)) || 'Time B';

            const homeLogo = (home.team && home.team.logo) || 'https://a.espncdn.com/i/teamlogos/soccer/500/default.png';
            const awayLogo = (away.team && away.team.logo) || 'https://a.espncdn.com/i/teamlogos/soccer/500/default.png';

            const statusState = ev.status && ev.status.type && ev.status.type.state;
            const isLive = statusState === 'in';
            const isFinished = statusState === 'post';

            let statusDetail = (ev.status && ev.status.type && (ev.status.type.detail || ev.status.type.shortDetail)) || 'Hoje';
            if (isLive) {
              statusDetail = 'AO VIVO • ' + ((ev.status && ev.status.displayClock) ? ev.status.displayClock + "'" : 'Em andamento');
            }

            const channel = getBroadcastChannel(ep.leagueName, homeName, awayName);
            const viewers = getEstimatedViewers(homeName, awayName, isLive);

            liveMatches.push({
              id: 'espn-' + ev.id,
              sport: ep.sport,
              category: ep.sport === 'basquete' ? 'NBA & Basquete' : 'Futebol Ao Vivo',
              league: ep.leagueName,
              leagueShort: ep.leagueName.toUpperCase(),
              homeTeam: {
                name: homeName,
                shortName: (home.team && home.team.abbreviation) || homeName.slice(0, 3).toUpperCase(),
                logo: homeLogo,
                score: (home && home.score) || (isLive ? '0' : ''),
              },
              awayTeam: {
                name: awayName,
                shortName: (away.team && away.team.abbreviation) || awayName.slice(0, 3).toUpperCase(),
                logo: awayLogo,
                score: (away && away.score) || (isLive ? '0' : ''),
              },
              status: isLive ? 'AO VIVO' : isFinished ? 'ENCERRADO' : 'EM BREVE',
              statusDetail,
              time: ev.date ? new Date(ev.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '20:00',
              isLive,
              isFinished,
              viewers,
              channel,
              isFeatured: isLive || liveMatches.length === 0,
            });
          }
        }
      } catch {
        // Ignore single endpoint errors
      }
    })
  );

  const finalMatches = [...liveMatches];
  for (const def of DEFAULT_MATCHES) {
    if (!finalMatches.some((m) => m.id === def.id || (m.homeTeam.name === def.homeTeam.name && m.awayTeam.name === def.awayTeam.name))) {
      finalMatches.push(def);
    }
  }

  finalMatches.sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0));

  cache.data = finalMatches;
  cache.timestamp = Date.now();

  return res.status(200).json({
    ok: true,
    matches: finalMatches,
    timestamp: Date.now(),
  });
}
