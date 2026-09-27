// Servico de Gerenciamento de Avisos (24h) e Consentimento de Anuncios com Isolamento Real
const NOTICE_TIMESTAMP_KEY = 'kairou_notice_dismissed_time';
const AD_CONSENT_KEY = 'kairou_ad_consent';
const DAILY_ENTRY_DATE_KEY = 'kairou_daily_ad_entry_date';

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 horas em ms

/**
 * Verifica se o aviso do Telegram/Discord deve ser exibido (a cada 24 horas)
 */
export function shouldShowNoticeModal() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return true;
  }
  try {
    const lastDismissedStr = localStorage.getItem(NOTICE_TIMESTAMP_KEY);
    if (!lastDismissedStr) return true;

    const timestamp = parseInt(lastDismissedStr, 10);
    if (isNaN(timestamp)) return true;

    return (Date.now() - timestamp) >= TWENTY_FOUR_HOURS;
  } catch (err) {
    console.warn('[Notice] Erro ao verificar localStorage:', err);
    return true;
  }
}

/**
 * Registra o fechamento do aviso no localStorage com timestamp de 24 horas
 */
export function markNoticeModalDismissed() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(NOTICE_TIMESTAMP_KEY, Date.now().toString());
  } catch (err) {
    console.warn('[Notice] Erro ao salvar timestamp do aviso:', err);
  }
}

/**
 * Verifica se e o primeiro acesso do dia no site para exibir o popup de anuncios
 */
export function shouldShowDailyEntryPrompt() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return true;
  }
  try {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem(DAILY_ENTRY_DATE_KEY);
    return lastDate !== today;
  } catch (err) {
    console.warn('[AdConsent] Erro ao checar primeiro acesso do dia:', err);
    return true;
  }
}

/**
 * Marca que o popup do primeiro acesso do dia foi exibido
 */
export function markDailyEntryPromptShown() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(DAILY_ENTRY_DATE_KEY, new Date().toDateString());
  } catch (err) {
    console.warn('[AdConsent] Erro ao salvar data do primeiro acesso:', err);
  }
}

/**
 * Verifica se os scripts de anuncios foram carregados na janela atual
 */
export function isAdScriptLoaded() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  return Boolean(
    window.__kairou_ads_active ||
    document.querySelector('script[src*="quge5.com"]') ||
    document.querySelector('script[src*="5gvci.com"]')
  );
}

/**
 * Injeta script de anúncios (Monetag removido)
 */
export function loadAdScript() {
  // Monetag ads removed por solicitação do usuário
  window.__kairou_ads_active = false;
}

/**
 * Desativa anuncios, desregistra Service Workers e remove elementos do DOM
 * Retorna true se um reload de memoria for necessario para limpar listeners
 */
export function disableAds() {
  if (typeof window === 'undefined') return false;

  const wasActive = isAdScriptLoaded();
  window.__kairou_ads_active = false;

  try {
    localStorage.setItem(AD_CONSENT_KEY, 'no_ads');
  } catch (e) {}

  // Remove elementos e scripts de anuncios
  try {
    document.querySelectorAll('script[src*="quge5.com"], script[src*="5gvci.com"], script[src*="3nbf4.com"]').forEach(el => el.remove());
    document.querySelectorAll('iframe[src*="quge5.com"], iframe[src*="5gvci.com"]').forEach(el => el.remove());
    document.querySelectorAll('div[id*="zone_"], div[class*="zone_"]').forEach(el => el.remove());
  } catch (e) {}

  // Desregistra Service Workers para cessar notificacoes e redirects
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
  }

  return wasActive;
}

/**
 * Salva a escolha do usuario
 */
export function setAdConsent(consented) {
  if (consented) {
    loadAdScript();
    return false; // Nao requer reload
  } else {
    return disableAds(); // Retorna se requer reload para limpar memoria
  }
}

/**
 * Neutralizador de popunders e redirecionamentos quando o usuario escolhe sem anuncios
 */
function protectAgainstRoguePopups() {
  if (typeof window === 'undefined') return;

  if (window.__kairou_shield_installed) return;
  window.__kairou_shield_installed = true;

  const originalOpen = window.open;
  window.open = function(url, target, features) {
    try {
      const choice = localStorage.getItem(AD_CONSENT_KEY);
      if (choice === 'no_ads') {
        const urlStr = String(url || '').toLowerCase();
        // Se a URL for de rede de anuncios ou externa suspeita
        if (
          urlStr.includes('quge5') ||
          urlStr.includes('5gvci') ||
          urlStr.includes('3nbf4') ||
          urlStr.includes('click') ||
          urlStr.includes('zone') ||
          (urlStr.startsWith('http') && !urlStr.startsWith(window.location.origin))
        ) {
          console.warn('[AdShield] Bloqueando popunder indesejado:', url);
          return null;
        }
      }
    } catch (e) {}
    return originalOpen.apply(this, arguments);
  };
}

/**
 * Inicializacao no boot da aplicacao
 */
export function initAdConsent() {
  if (typeof window === 'undefined') return;
  protectAgainstRoguePopups();

  // NUNCA auto-carrega scripts de anuncios no boot sem consentimento explicito
  // Se estiver sem anuncios, garante que os service workers estejam desativados
  try {
    const choice = localStorage.getItem(AD_CONSENT_KEY);
    if (choice === 'no_ads') {
      disableAds();
    }
  } catch (err) {
    console.warn('[AdConsent] Erro na inicializacao:', err);
  }
}
