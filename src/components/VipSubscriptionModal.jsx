import React, { useState } from 'react';
import {
  X,
  Crown,
  Heart,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  Download,
  Volume2,
  Tv,
  Coins,
  Smartphone,
  KeyRound,
  ArrowRight,
  CreditCard,
  HelpCircle,
  CheckCircle2,
  Wallet,
  Info
} from 'lucide-react';
import { PAYMENT_METHODS, redeemVipCode, isVipUser } from '../services/vipService';
import CinetugaIcon from './CinetugaIcon';

export default function VipSubscriptionModal({ isOpen, onClose, user, profile, onVipActivated }) {
  const [activeTab, setActiveTab] = useState('crypto'); // 'crypto' | 'mbway' | 'key'
  const [selectedPlan, setSelectedPlan] = useState(PAYMENT_METHODS.plans[1]); // Default 3 meses
  const [activationKey, setActivationKey] = useState('');
  const [keyMessage, setKeyMessage] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen) return null;

  const isCurrentlyVip = isVipUser(user, profile);

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRedeemKey = (e) => {
    e.preventDefault();
    setKeyMessage(null);
    const result = redeemVipCode(activationKey);
    if (result.success) {
      setKeyMessage({ type: 'success', text: result.message });
      onVipActivated?.(result.data);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setKeyMessage({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      {/* Background click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-[#0b0f19] border border-sky-400/30 rounded-3xl p-5 sm:p-8 shadow-2xl z-10 animate-scale-in max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Glows de fundo temáticos */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/[0.08] transition-colors z-20 cursor-pointer"
          title="Fechar"
        >
          <X size={18} />
        </button>

        {/* Header com Badges */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3 shadow-sm">
            <Crown size={14} className="fill-amber-400 text-amber-400 animate-pulse" />
            <span>Assinatura Cinetuga VIP</span>
            <Sparkles size={13} className="text-yellow-300" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Desbloqueie o Máximo do Cinema
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mt-2 leading-relaxed">
            Tenha acesso à experiência definitiva com <strong>zero anúncios</strong>, servidores prioritários em 4K e downloads liberados.
          </p>
        </div>

        {/* Grid de Perks Exclusivos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/[0.06] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">100% Sem Anúncios</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Zero comerciais</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/[0.06] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Zap size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Servidores 4K Ultra</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Sem filas ou travas</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/[0.06] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Download size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Downloads Offline</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Baixe filmes em MP4</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/[0.06] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Volume2 size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Dolby Sound Boost</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Volume até +150%</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/[0.06] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Tv size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Canais TV Full HD</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Transmissão VIP 60fps</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/[0.06] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0">
              <Crown size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Insígnia VIP Ouro</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Nível máximo no perfil</p>
            </div>
          </div>
        </div>

        {/* Seleção de Planos */}
        <div className="mb-6">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
            1. Selecione seu Plano VIP:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PAYMENT_METHODS.plans.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-sky-500/15 border-sky-400 text-white shadow-lg shadow-sky-500/15 scale-[1.02]'
                      : 'bg-slate-900/60 border-white/[0.08] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-sm">
                      {plan.badge}
                    </span>
                  )}
                  <p className="text-xs font-bold text-slate-300">{plan.title}</p>
                  <p className="text-lg font-black text-white mt-1">
                    {plan.priceEur}{' '}
                    <span className="text-xs font-medium text-slate-400">({plan.priceCrypto})</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{plan.period}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Abas de Formas de Pagamento (MB WAY vs BNB Smart Chain vs Chave) */}
        <div>
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
            2. Método de Pagamento Aceito:
          </p>

          <div className="flex flex-wrap sm:flex-nowrap rounded-2xl bg-slate-950/80 p-1 border border-white/[0.08] mb-4 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('pix')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pix'
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Heart size={15} className={activeTab === 'pix' ? 'fill-slate-950 text-slate-950' : 'text-emerald-400'} />
              <span>Pix (PixGG)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('crypto')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'crypto'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Coins size={15} />
              <span>BNB Smart Chain</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mbway')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'mbway'
                  ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone size={15} />
              <span>Tutorial MB WAY</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('key')}
              className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'key'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound size={15} />
              <span>Chave VIP</span>
            </button>
          </div>

          {/* ABA 1: TUTORIAL MB WAY (COMPRAR CRIPTO COM MBNET EM 1 MINUTO) */}
          {activeTab === 'mbway' && (
            <div className="p-4 sm:p-6 rounded-2xl bg-[#0f1422] border border-sky-400/20 space-y-4">
              {/* Header do Guia */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-sky-500/15 border border-sky-400/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                      <span>Como Pagar com MB WAY (via Cartão MBNet)</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold uppercase">
                        1 Minuto
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      A forma mais simples e sem taxas para utilizadores em Portugal
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-white/[0.08] pt-2 sm:pt-0 sm:pl-4">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor do Plano</span>
                  <span className="text-base font-black text-amber-300">{selectedPlan.priceEur}</span>
                </div>
              </div>

              {/* Passos Detalhados */}
              <div className="p-4 sm:p-5 rounded-xl border border-white/[0.08] bg-slate-950/70 space-y-4 text-xs text-slate-300 leading-relaxed">
                {/* Passo 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                      <span>Criar Cartão MBNet no seu app MB WAY</span>
                      <CreditCard size={14} className="text-sky-400" />
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Abra o aplicativo <strong>MB WAY</strong> no telemóvel, toque em <strong>"Cartões" ➔ "Criar Cartão MBNet"</strong>. Escolha <strong>"Compra Única"</strong> e coloque o valor do plano (<strong>{selectedPlan.priceEur}</strong>). O MB WAY gera um cartão temporário com Número, Validade e CVV na hora!
                    </p>
                  </div>
                </div>

                {/* Passo 2 */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                      <span>Comprar USDT ou BNB no seu app favorito</span>
                      <Coins size={14} className="text-amber-400" />
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Abra o app da <strong>Binance</strong> (ou Revolut, Bybit, MoonPay), vá em <strong>"Comprar Cripto"</strong>, escolha <strong>USDT</strong> ou <strong>BNB</strong>, selecione pagamento por <strong>Cartão</strong> e digite os números do cartão MBNet gerado. O saldo entra na sua carteira na hora.
                    </p>
                  </div>
                </div>

                {/* Passo 3 */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                      <span>Enviar via BNB Smart Chain (BEP-20)</span>
                      <Wallet size={14} className="text-emerald-400" />
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Toque em <strong>"Levantar / Sacar"</strong> ➔ Selecione a rede <strong>BNB Smart Chain (BEP20)</strong> (taxa inferior a $0.05) e envie para o nosso endereço oficial:
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={PAYMENT_METHODS.crypto.address}
                        className="flex-1 bg-slate-900 border border-amber-400/30 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-amber-300 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(PAYMENT_METHODS.crypto.address, 'guide-address')}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        {copiedField === 'guide-address' ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedField === 'guide-address' ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Passo 4 */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    4
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                      <span>Ativação Instantânea no Telegram</span>
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Basta enviar o comprovativo no nosso canal do Telegram. Ativamos a sua assinatura VIP em menos de 5 minutos!
                    </p>
                  </div>
                </div>
              </div>

              {/* Botão Telegram */}
              <a
                href="https://t.me/+MIU924pI1MoyYTRk"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl bg-[#229ED9] hover:bg-[#1c8ec4] text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-[#229ED9]/25 hover:scale-[1.01] cursor-pointer"
              >
                <span>Enviar Comprovativo no Telegram (Suporte 24h)</span>
                <ExternalLink size={14} />
              </a>
            </div>
          )}

          {/* ABA 2: BNB SMART CHAIN (BEP-20) APENAS */}
          {activeTab === 'crypto' && (
            <div className="p-4 sm:p-6 rounded-2xl bg-[#0f1422] border border-amber-400/30 space-y-4">
              {/* Badge de Destaque da Rede Única */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-400/35">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-black uppercase text-amber-300">
                      Rede Oficial: BNB Smart Chain (BEP-20)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold uppercase">
                    Taxa &lt; $0.05
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                  Aceitamos <strong>USDT (BEP-20)</strong> e <strong>BNB</strong> exclusivamente na rede BNB Smart Chain. Transação instantânea (3 segundos) e sem taxas pesadas.
                </p>
              </div>

              {/* Endereço de Pagamento */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <Wallet size={14} className="text-amber-400" />
                    <span>Endereço da Carteira (BEP-20):</span>
                  </label>
                  <a
                    href={PAYMENT_METHODS.crypto.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                  >
                    <span>Ver no BscScan</span>
                    <ExternalLink size={10} />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={PAYMENT_METHODS.crypto.address}
                    className="flex-1 bg-slate-950 border border-amber-400/40 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-amber-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(PAYMENT_METHODS.crypto.address, 'crypto-address')}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {copiedField === 'crypto-address' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedField === 'crypto-address' ? 'Copiado!' : 'Copiar Endereço'}</span>
                  </button>
                </div>
              </div>

              {/* Informações do Plano e Cripto */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.08] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Plano Selecionado:</span>
                  <span className="font-bold text-white">{selectedPlan.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Valor Estimado:</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">{selectedPlan.priceCrypto}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/[0.06]">
                  <span>Confirmação da Rede:</span>
                  <span className="text-emerald-400 font-semibold">1 Confirmação (Instantâneo)</span>
                </div>
              </div>

              {/* Atalho para o tutorial MB WAY */}
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-sky-400 shrink-0" />
                  <span className="text-slate-300 text-[11px]">
                    Não tem USDT/BNB na carteira? Pode comprar em 1 minuto usando MB WAY!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('mbway')}
                  className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer"
                >
                  Ver Como Fazer
                </button>
              </div>

              {/* Botão de Enviar Comprovativo */}
              <a
                href="https://t.me/+MIU924pI1MoyYTRk"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl bg-[#229ED9] hover:bg-[#1c8ec4] text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-[#229ED9]/25 hover:scale-[1.01] cursor-pointer"
              >
                <span>Confirmar Pagamento Crypto no Telegram</span>
                <ExternalLink size={14} />
              </a>
            </div>
          )}

          {/* ABA 3: PIX (PIXGG) */}
          {activeTab === 'pix' && (
            <div className="p-4 sm:p-6 rounded-2xl bg-[#0f1422] border border-emerald-400/30 space-y-4">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-400/35">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart size={16} className="fill-emerald-400 text-emerald-400 animate-pulse" />
                    <span className="text-xs font-black uppercase text-emerald-300">
                      Doações e Assinaturas via Pix (PixGG)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold uppercase">
                    Instantâneo
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                  Contribua com qualquer valor de doação ou pague seu plano VIP diretamente pela plataforma oficial <strong>PixGG (pommern)</strong>.
                </p>
              </div>

              {/* Informações do Plano Selecionado */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.08] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Plano Selecionado:</span>
                  <span className="font-bold text-white">{selectedPlan.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Valor em Euro:</span>
                  <span className="font-mono font-bold text-emerald-300 text-sm">{selectedPlan.priceEur}</span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-white/[0.06]">
                  Ou contribua com qualquer valor que desejar para apoiar os servidores do projeto!
                </p>
              </div>

              {/* Botão PixGG Oficial */}
              <a
                href="https://pixgg.com/pommern"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/25 hover:scale-[1.01] cursor-pointer"
              >
                <Heart size={16} className="fill-slate-950 text-slate-950" />
                <span>Abrir PixGG (pommern) e Doar via Pix</span>
                <ExternalLink size={14} />
              </a>

              {/* Aviso envio no telegram */}
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-400/20 text-xs text-slate-300 leading-relaxed">
                <p className="font-bold text-sky-300 mb-1">Como ativar o VIP após o Pix?</p>
                <p className="text-[11px] text-slate-400">
                  Após realizar o pagamento no PixGG, envie o comprovativo no nosso canal do Telegram. Ativamos a sua assinatura VIP em menos de 5 minutos!
                </p>
              </div>

              {/* Botão de Enviar Comprovativo no Telegram */}
              <a
                href="https://t.me/+MIU924pI1MoyYTRk"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#229ED9] hover:bg-[#1c8ec4] text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-[#229ED9]/25 hover:scale-[1.01] cursor-pointer"
              >
                <span>Enviar Comprovativo Pix no Telegram</span>
                <ExternalLink size={14} />
              </a>
            </div>
          )}

          {/* ABA 4: CHAVE DE ATIVAÇÃO VIP */}
          {activeTab === 'key' && (
            <form onSubmit={handleRedeemKey} className="p-4 sm:p-5 rounded-2xl bg-[#0f1422] border border-sky-400/20 space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Possui um Código ou Chave VIP?
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  Insira o código promocional recebido pelo Telegram de suporte para ativação instantânea no seu navegador.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value)}
                    placeholder="Ex: VIP-CINETUGA"
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase tracking-wider font-mono outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                  >
                    Ativar Agora
                  </button>
                </div>
              </div>

              {keyMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    keyMessage.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {keyMessage.type === 'success' ? <Check size={16} /> : <X size={16} />}
                  <span>{keyMessage.text}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
