// Cinetuga VIP & User Level Service
import { isUserAdmin } from './adminAnalytics';

const VIP_STORAGE_KEY = 'cinetuga_vip_subscription_v1';
const VIP_PROMO_KEYS = [
  'VIP-CINETUGA',
  'CINETUGA-VIP',
  'CINETUGA-PREMIUM',
  'VIP-BORLAFLIX',
  'BORLA-VIP-2026',
  'MBWAY-VIP',
  'CRYPTO-VIP',
  'VIP-SHIZU',
  'STREAM-VIP'
];

/**
 * Verifica se o usuário atual é VIP
 */
export function isVipUser(user, profile) {
  if (!user) return false;

  // 1. Administrador tem VIP perpétuo
  if (isUserAdmin(user)) return true;

  // 2. Metadados do usuário no Supabase
  if (profile?.is_vip || user?.user_metadata?.is_vip || profile?.membership === 'vip') {
    return true;
  }

  // 3. Assinatura salva localmente no dispositivo
  try {
    const raw = localStorage.getItem(VIP_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.active && data?.expiresAt) {
        if (new Date(data.expiresAt).getTime() > Date.now()) {
          return true;
        }
      }
    }
  } catch (_) {}

  return false;
}

/**
 * Retorna dados detalhados da assinatura VIP
 */
export function getVipSubscriptionData(user, profile) {
  const isVip = isVipUser(user, profile);
  let expiresAt = null;
  let plan = 'Gratuito';

  if (isUserAdmin(user)) {
    return {
      isVip: true,
      plan: 'Administrador VIP Vitalício',
      expiresAt: 'Vitalício',
      daysRemaining: 9999,
      method: 'Admin Grant',
    };
  }

  try {
    const raw = localStorage.getItem(VIP_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.expiresAt) {
        expiresAt = data.expiresAt;
        plan = data.plan || 'VIP Premium';
      }
    }
  } catch (_) {}

  const daysRemaining = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  return {
    isVip,
    plan: isVip ? plan : 'Gratuito (com Anúncios)',
    expiresAt,
    daysRemaining,
  };
}

/**
 * Ativa assinatura VIP via chave ou confirmação
 */
export function activateVipSubscription({ days = 30, plan = 'VIP Mensal', key = '' } = {}) {
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const payload = {
    active: true,
    plan,
    activatedAt: new Date().toISOString(),
    expiresAt,
    key,
  };

  try {
    localStorage.setItem(VIP_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('cinetuga_vip_updated', { detail: payload }));
    window.dispatchEvent(new CustomEvent('borlaflix_vip_updated', { detail: payload }));
  } catch (e) {
    console.warn('[VIP] Erro ao salvar status VIP:', e);
  }

  return payload;
}

/**
 * Valida e ativa uma chave VIP promocional
 */
export function redeemVipCode(code) {
  if (!code) return { success: false, message: 'Digite uma chave de ativação.' };
  const clean = String(code).trim().toUpperCase();

  const isValid = VIP_PROMO_KEYS.includes(clean) || clean.startsWith('CINETUGA-') || clean.startsWith('BORLA-') || clean.startsWith('VIP-');
  if (isValid) {
    const activated = activateVipSubscription({ days: 30, plan: 'VIP Premium (Chave)', key: clean });
    return { success: true, message: 'VIP ativado com sucesso por 30 dias!', data: activated };
  }

  return { success: false, message: 'Chave VIP inválida ou expirada. Verifique os dígitos.' };
}

/**
 * Calcula o nível e a progressão do usuário com base no histórico de títulos
 */
export function getUserLevelInfo(user, profile, watchProgressList = []) {
  const isVip = isVipUser(user, profile);
  const titlesWatchedCount = Array.isArray(watchProgressList) ? watchProgressList.length : 0;

  // Cada título assistido concede 120 XP
  const baseCalculatedXp = titlesWatchedCount * 120 + 50;

  if (isVip) {
    return {
      level: 'VIP',
      levelNumber: 99,
      title: 'Membro VIP Diamante',
      tierBadge: '👑 VIP Premium',
      badgeColor: 'from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black',
      currentXp: 9999,
      nextLevelXp: 9999,
      progressPercent: 100,
      titlesCount: titlesWatchedCount,
      isVip: true,
      perks: [
        { name: '100% Sem Anúncios', description: 'Zero popups, popunders ou comerciais', active: true },
        { name: 'Qualidade 4K Ultra HD & Dolby Atmos', description: 'Bitrate máximo nativo', active: true },
        { name: 'Servidores VIP Prioritários', description: 'Largura de banda dedicada sem travas', active: true },
        { name: 'Downloads para Assistir Offline', description: 'Baixe episódios e filmes diretamente', active: true },
        { name: 'Áudio Booster Cinema (+150%)', description: 'Volume amplificado com reforço de graves', active: true },
        { name: 'Modo Cinema Ambient Glow', description: 'Iluminação imersiva reativa na tela', active: true },
      ],
    };
  }

  // Níveis Gratuitos
  const LEVELS = [
    { level: 1, title: 'Espectador Iniciante', minXp: 0, maxXp: 250, badge: '⭐ Nível 1' },
    { level: 2, title: 'Cinéfilo Aprendiz', minXp: 250, maxXp: 600, badge: '🎬 Nível 2' },
    { level: 3, title: 'Maratonador de Séries', minXp: 600, maxXp: 1200, badge: '🍿 Nível 3' },
    { level: 4, title: 'Crítico de Cinema', minXp: 1200, maxXp: 2400, badge: '🏆 Nível 4' },
    { level: 5, title: 'Mestre Cinetuga', minXp: 2400, maxXp: 5000, badge: '🌟 Nível 5' },
  ];

  let currentLevelData = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (baseCalculatedXp >= LEVELS[i].minXp) {
      currentLevelData = LEVELS[i];
      break;
    }
  }

  const range = currentLevelData.maxXp - currentLevelData.minXp;
  const progressInLevel = Math.max(0, baseCalculatedXp - currentLevelData.minXp);
  const progressPercent = Math.min(100, Math.round((progressInLevel / range) * 100));

  return {
    level: currentLevelData.level,
    levelNumber: currentLevelData.level,
    title: currentLevelData.title,
    tierBadge: currentLevelData.badge,
    badgeColor: 'from-sky-500/20 to-blue-500/20 text-sky-400 border border-sky-400/30',
    currentXp: baseCalculatedXp,
    nextLevelXp: currentLevelData.maxXp,
    progressPercent,
    titlesCount: titlesWatchedCount,
    isVip: false,
    perks: [
      { name: '100% Sem Anúncios', description: 'Zero anúncios nos filmes e séries', active: false },
      { name: 'Qualidade 4K Ultra HD', description: 'Resolução máxima sem perda de compressão', active: false },
      { name: 'Servidores VIP Prioritários', description: 'Acesso à rede ultra-rápida sem congestionamento', active: false },
      { name: 'Downloads Offline', description: 'Salvar arquivos MP4 no seu dispositivo', active: false },
      { name: 'Volume Booster & Ambient Light', description: 'Efeitos avançados de som e luz', active: false },
    ],
  };
}

/**
 * Detalhes de Pagamento (MB WAY & BNB Smart Chain)
 */
export const PAYMENT_METHODS = {
  mbway: {
    name: 'MB WAY (via MBNet)',
    badge: 'Portugal · Tutorial Rápido',
    instructions: 'Gere um cartão virtual MBNet na sua app MB WAY para comprar USDT ou BNB em menos de 1 minuto sem taxas.',
  },
  crypto: {
    network: 'BNB Smart Chain (BEP-20)',
    address: '0x8EA334A38a81bd8De8EF6Fea8fFC258cbb914d6a',
    tokens: 'USDT (BEP-20) e BNB',
    explorerUrl: 'https://bscscan.com/address/0x8EA334A38a81bd8De8EF6Fea8fFC258cbb914d6a',
    description: 'Aceitamos exclusivamente a rede BNB Smart Chain (BEP-20). Menor taxa do mercado (< $0.05) e confirmação em 3 segundos.',
  },
  plans: [
    {
      id: 'month',
      title: 'Plano 1 Mês VIP',
      priceEur: '3,99 €',
      priceCrypto: '4.50 USDT / BNB',
      period: '30 dias de acesso',
      popular: false,
      days: 30,
    },
    {
      id: 'quarter',
      title: 'Plano 3 Meses VIP',
      priceEur: '9,99 €',
      priceCrypto: '11.00 USDT / BNB',
      period: '90 dias de acesso',
      popular: true,
      badge: 'Mais Popular',
      days: 90,
    },
    {
      id: 'year',
      title: 'Plano Anual VIP',
      priceEur: '29,99 €',
      priceCrypto: '32.00 USDT / BNB',
      period: '365 dias de acesso',
      popular: false,
      badge: 'Melhor Valor',
      days: 365,
    },
  ],
};
