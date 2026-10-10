import { isVipUser } from './vipService';

// Servico de Gerenciamento de Avisos (24h) e Anúncios Isolados para Modo Reprodução Kairou
const NOTICE_TIMESTAMP_KEY = 'kairou_notice_dismissed_time';
const AD_CONSENT_KEY = 'kairou_ad_consent';

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 horas em ms

/**
 * Verifica se o aviso do Telegram deve ser exibido (a cada 24 horas)
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
 * Verifica se os scripts de anuncios foram carregados na janela atual
 */
export function isAdScriptLoaded() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  return Boolean(
    window.__kairou_ads_active ||
    window.__borlaflix_ads_active ||
    document.querySelector('script[src*="quge5.com"]') ||
    document.querySelector('script[src*="pemsrv.com"]') ||
    document.querySelector('script[src*="magsrv.com"]')
  );
}

/**
 * Remove todos os anúncios e listeners ao sair do player para não atrapalhar na página principal
 */
export function unloadWatchingAds() {
  if (typeof window === 'undefined') return;
  window.__kairou_is_watching = false;
  window.__kairou_ads_active = false;
  window.__borlaflix_is_watching = false;
  window.__borlaflix_ads_active = false;

  try {
    document.querySelectorAll('script[src*="quge5.com"], script[id*="multitag"], script[src*="pemsrv.com"], script[src*="magsrv.com"], script[id*="popunder"], script[id="popmagicldr"]').forEach(el => el.remove());
    document.querySelectorAll('iframe[src*="quge5.com"], iframe[src*="pemsrv.com"], iframe[src*="magsrv.com"]').forEach(el => el.remove());
    document.querySelectorAll('ins.eas6a97888e35, ins.eas6a97888e29').forEach(el => { el.style.display = 'none'; el.remove(); });
  } catch (e) {}

  // Desregistra Service Workers adicionados por redes de anúncios
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
  }

  console.info('[AdConsent] 🛡️ Anúncios desativados. Página principal mantida 100% limpa sem popunders.');
}

/**
 * Injeta script de anúncios SOMENTE quando o usuário está assistindo (VideoPlayer / canais)
 * Na página principal / catálogo, esta função NÃO é executada para não atrapalhar o usuário.
 */
export function loadWatchingAds(user = null, profile = null) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Membros VIP NUNCA recebem anúncios
  if (isVipUser(user, profile)) {
    unloadWatchingAds();
    return;
  }

  // Marca que o usuário está ativamente no modo player de vídeo
  window.__kairou_is_watching = true;
  window.__borlaflix_is_watching = true;
  if (window.__kairou_ads_active || window.__borlaflix_ads_active) return;
  window.__kairou_ads_active = true;
  window.__borlaflix_ads_active = true;

  try {
    localStorage.setItem(AD_CONSENT_KEY, 'with_ads');
  } catch (e) {}

  // Estratégia de monetização inteligente e usável:
  // - ZERO popups na página principal
  // - No player: limita a no máximo 1 interação a cada 20 minutos (Frequency Capping)
  const AD_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutos
  const lastAdTime = parseInt(sessionStorage.getItem('kairou_last_ad_time') || '0', 10);
  const now = Date.now();
  
  if (now - lastAdTime < AD_COOLDOWN_MS) {
    console.info('[AdConsent] 🛡️ Cooldown de anúncios ativo (1 a cada 20min). Navegação mantida limpa e fluida.');
    return;
  }
  sessionStorage.setItem('kairou_last_ad_time', now.toString());

  // 1. Multitag Principal (Carregamento único, controlado e profissional)
  if (!document.querySelector('script[src*="quge5.com"]') && !document.querySelector('script[src*="3nbf4.com"]')) {
    const sMulti = document.createElement('script');
    sMulti.src = 'https://quge5.com/88/tag.min.js';
    sMulti.setAttribute('data-zone', '291063');
    sMulti.setAttribute('data-cfasync', 'false');
    sMulti.async = true;
    sMulti.id = 'kairou_multitag_lovely';
    document.head.appendChild(sMulti);
    console.info('[AdConsent] 🎬 Anúncio controlado ativado no player com capping de 20 min.');
  }
}

// Mantem compatibilidade com chamadas legadas
export const loadAdScript = loadWatchingAds;

/**
 * Desativa anúncios SOMENTE para membros VIP
 */
export function disableAds(user = null, profile = null) {
  if (typeof window === 'undefined') return false;
  unloadWatchingAds();
  try {
    localStorage.setItem(AD_CONSENT_KEY, 'no_ads_vip');
  } catch (e) {}
  return true;
}

/**
 * Atualiza consentimento
 */
export function setAdConsent(consented, user = null, profile = null) {
  if (consented && (window.__kairou_is_watching || window.__borlaflix_is_watching)) {
    loadWatchingAds(user, profile);
    return false;
  } else {
    return disableAds(user, profile);
  }
}

/**
 * Escudo protetor inteligente contra popups/popunders:
 * - Se o usuário estiver na página principal / catálogo (não estiver assistindo): BLOQUEIA 100% de popunders para não atrapalhar!
 * - Se o usuário for VIP: BLOQUEIA 100% sempre.
 * - Somente se o usuário estiver ativamente assistindo no player (!isVip && isWatching) o popunder de apoio é autorizado.
 */
function protectAgainstRoguePopups(user = null, profile = null) {
  if (typeof window === 'undefined') return;

  if (window.__kairou_shield_installed || window.__borlaflix_shield_installed) return;
  window.__kairou_shield_installed = true;
  window.__borlaflix_shield_installed = true;

  const originalOpen = window.open;
  window.open = function(url, target, features) {
    try {
      const isVip = isVipUser(user, profile);
      const isWatching = Boolean(window.__kairou_is_watching || window.__borlaflix_is_watching);

      // Se for VIP OU se estiver na página principal (NÃO assistindo), bloqueia anúncios e popunders
      if (isVip || !isWatching) {
        const urlStr = String(url || '').toLowerCase();
        if (
          urlStr.includes('quge5') ||
          urlStr.includes('monetag') ||
          urlStr.includes('pemsrv') ||
          urlStr.includes('magsrv') ||
          urlStr.includes('exdynsrv') ||
          urlStr.includes('click') ||
          urlStr.includes('zone') ||
          urlStr.includes('ad-provider') ||
          (urlStr.startsWith('http') && !urlStr.startsWith(window.location.origin) && !urlStr.includes('t.me') && !urlStr.includes('telegram'))
        ) {
          console.warn('[AdShield] Popunder bloqueado (usuário na página principal ou VIP):', url);
          return null;
        }
      }
    } catch (e) {}
    return originalOpen.apply(this, arguments);
  };
}

/**
 * Inicializacao no boot da aplicacao
 * - Na página principal: NENHUM anúncio é carregado, garantindo navegação limpa e ágil.
 * - Ativa o escudo de proteção para barrar popunders fora do player.
 */
export function initAdConsent(user = null, profile = null) {
  if (typeof window === 'undefined') return;
  window.__kairou_is_watching = false;
  window.__borlaflix_is_watching = false;
  protectAgainstRoguePopups(user, profile);
  // Garante que a página principal comece limpa sem scripts de anúncios
  unloadWatchingAds();
}
