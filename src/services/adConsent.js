// Kairou AdShield & Voluntary Ad Consent Service
// Permite que o usuário escolha livremente entre assistir com anúncios ou navegar 100% sem anúncios

const AD_CONSENT_KEY = 'kairou_ad_consent';

export const PROFITON_CONFIG = {
  shuffleboxSrc: '//zk.xoanonpacking.com/sbl3cqVvEjZvSYM7/158176',
  shuffleboxZone: '158176',
  popsSrc: '//dq.purinsproved.com/rntVAiwady9dRymk/158174',
  popsZone: '158174',
  smartlinkUrl: 'https://vu.rabbinshoodlum.com/i7KIyHtsHii7u0B/158175',
};

/**
 * Remove qualquer script de rede de anúncios do DOM e desregistra workers
 */
export function purgeAllAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    document
      .querySelectorAll(
        'script[src*="xoanonpacking"], script[src*="purinsproved"], script[src*="rabbinshoodlum"], script[src*="3nbf4"], script[src*="clickadu"], script[src*="monetag"], script[src*="propeller"], #profiton-shufflebox-script, #profiton-pops-script'
      )
      .forEach((el) => el.remove());

    document.querySelectorAll('[data-shb], [id*="profiton"], [class*="shb-"]').forEach((el) => el.remove());
  } catch (e) {}

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const reg of registrations) {
          reg.unregister().catch(() => {});
        }
      })
      .catch(() => {});
  }
}

/**
 * Bloqueia popups invasivos se o usuário optou por NÃO ver anúncios
 */
function protectAgainstRoguePopups() {
  if (typeof window === 'undefined') return;
  if (window.__kairou_shield_installed) return;
  window.__kairou_shield_installed = true;

  const originalOpen = window.open;
  window.open = function (url, target, features) {
    try {
      const choice = localStorage.getItem(AD_CONSENT_KEY);
      if (choice === 'no_ads') {
        const urlStr = String(url || '').toLowerCase();
        // Permite apenas links legítimos de navegação ou doação direta PixGG / Telegram
        if (
          urlStr.includes('pixgg.com') ||
          urlStr.includes('t.me') ||
          urlStr.includes('telegram') ||
          (urlStr.startsWith(window.location.origin) && !urlStr.includes('ad'))
        ) {
          return originalOpen.apply(this, arguments);
        }

        console.warn('[AdShield] Popunder bloqueado para usuário sem anúncios:', url);
        return null;
      }
    } catch (e) {
      return null;
    }
    return originalOpen.apply(this, arguments);
  };
}

/**
 * Carrega anúncios apenas se o usuário tiver escolhido apoiar
 */
export function loadWatchingAds() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.__kairou_ads_active = true;
  try {
    localStorage.setItem(AD_CONSENT_KEY, 'with_ads');
  } catch (e) {}

  // Injetar script de Shufflebox se ainda não existir
  if (PROFITON_CONFIG.shuffleboxSrc && !document.getElementById('profiton-shufflebox-script')) {
    const s = document.createElement('script');
    s.id = 'profiton-shufflebox-script';
    s.setAttribute('data-cfasync', 'false');
    s.async = true;
    s.type = 'text/javascript';
    s.src = PROFITON_CONFIG.shuffleboxSrc;
    document.head.appendChild(s);
  }

  // Injetar script de Pops se ainda não existir
  if (PROFITON_CONFIG.popsSrc && !document.getElementById('profiton-pops-script')) {
    const p = document.createElement('script');
    p.id = 'profiton-pops-script';
    p.setAttribute('data-cfasync', 'false');
    p.async = true;
    p.type = 'text/javascript';
    p.src = PROFITON_CONFIG.popsSrc;
    document.head.appendChild(p);
  }
}

export const loadAdScript = loadWatchingAds;

/**
 * Desativa completamente anúncios
 */
export function disableAds() {
  window.__kairou_ads_active = false;
  try {
    localStorage.setItem(AD_CONSENT_KEY, 'no_ads');
  } catch (e) {}
  purgeAllAds();
  return true;
}

/**
 * Define a escolha do usuário
 */
export function setAdConsent(consented) {
  if (consented) {
    loadWatchingAds();
    return false;
  } else {
    return disableAds();
  }
}

/**
 * Inicialização no boot da aplicação
 */
export function initAdConsent() {
  if (typeof window === 'undefined') return;
  protectAgainstRoguePopups();

  try {
    const choice = localStorage.getItem(AD_CONSENT_KEY);
    if (choice === 'with_ads') {
      loadWatchingAds();
    } else {
      disableAds();
    }
  } catch (err) {
    console.warn('[AdConsent] Erro na inicialização:', err);
  }
}

export function getStoredAdConsent() {
  try {
    return localStorage.getItem(AD_CONSENT_KEY) || 'no_ads';
  } catch {
    return 'no_ads';
  }
}

export function isAdScriptLoaded() {
  return Boolean(window.__kairou_ads_active);
}

export function injectShuffleBox() {}
export function injectPops() {}
export function unloadWatchingAds() {
  purgeAllAds();
}
export function openProfitOnSmartlink() {
  if (PROFITON_CONFIG.smartlinkUrl) {
    window.open(PROFITON_CONFIG.smartlinkUrl, '_blank');
  }
}
