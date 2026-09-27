import React, { useEffect } from 'react';
import { X, AlertTriangle, ExternalLink, ShieldCheck, RefreshCw, BellRing, MessageCircle } from 'lucide-react';
import KairouIcon from './KairouIcon';

export function TelegramIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      role="img"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.937z"/>
    </svg>
  );
}

// Alias para compatibilidade
export const DiscordIcon = TelegramIcon;

export default function DiscordNoticeModal({ isOpen, onClose }) {
  // Fechar ao pressionar ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      {/* Background click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-[#0d121c] border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-2xl z-10 animate-scale-in overflow-hidden">
        {/* Glow de fundo temático Telegram + Kairou */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-[#229ED9]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/[0.08] transition-colors z-20 cursor-pointer"
          title="Fechar aviso"
          aria-label="Fechar aviso"
        >
          <X size={18} />
        </button>

        {/* Top Header com Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <AlertTriangle size={13} className="text-rose-400" />
            <span>Fomos Banidos do Discord!</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#229ED9]/15 border border-[#229ED9]/30 text-[#4cb8ed] text-xs font-bold">
            <TelegramIcon size={14} className="fill-[#229ED9]" />
            <span>Novo Canal Oficial</span>
          </div>
        </div>

        {/* Título Principal */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2.5">
            <KairouIcon size={32} />
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
              Migramos para o Telegram!
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Nosso servidor do Discord foi <strong className="text-rose-400">derrubado e banido</strong>. Como o site pode sofrer instabilidades e cair a qualquer hora, agora nosso canal oficial de suporte e avisos é 100% no <span className="text-[#229ED9] font-bold">Telegram</span>!
          </p>
        </div>

        {/* Card Informativo com Benefícios do Telegram */}
        <div className="p-4 rounded-2xl bg-[#141a27]/80 border border-white/[0.06] space-y-3 mb-6">
          <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <MessageCircle size={15} className="text-[#229ED9]" />
            <span>Por que entrar no nosso canal do Telegram agora?</span>
          </p>

          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2.5">
              <RefreshCw size={15} className="text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white font-semibold">Links e Espelhos Imediatos:</strong> Se o domínio cair, postamos os novos links alternativos imediatamente no Telegram.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white font-semibold">Sem Censura & Suporte Rápido:</strong> Fale com nossa equipe, relate episódios fora do ar e peça novos conteúdos.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <BellRing size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white font-semibold">Novidades em Tempo Real:</strong> Notificações instantâneas de novos animes, filmes e episódios adicionados.
              </span>
            </li>
          </ul>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-2.5">
          {/* Botão Telegram Principal */}
          <a
            href="https://t.me/+MIU924pI1MoyYTRk"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#229ED9] hover:bg-[#1c8ec4] text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-[#229ED9]/25 hover:shadow-[#229ED9]/40 hover:scale-[1.02] active:scale-[0.98] group cursor-pointer"
          >
            <TelegramIcon size={22} className="fill-white transition-transform group-hover:scale-110" />
            <span>Entrar no Canal do Telegram</span>
            <ExternalLink size={16} className="text-white/80 ml-0.5" />
          </a>

          {/* Botão Fechar / Continuar para o site */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer text-center"
          >
            Entendido, continuar para o Kairou
          </button>
        </div>
      </div>
    </div>
  );
}
