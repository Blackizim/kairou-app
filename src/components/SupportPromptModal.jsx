import React, { useEffect } from 'react';
import { X, Heart, Shield, Sparkles, Check } from 'lucide-react';
import KairouIcon from './KairouIcon';

export default function SupportPromptModal({ isOpen, onSelectChoice, onOpenDonation }) {
  // Fechar ao pressionar ESC (escolhe continuar sem anuncios por padrao)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onSelectChoice(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSelectChoice]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      {/* Background click to dismiss as without ads */}
      <div className="fixed inset-0" onClick={() => onSelectChoice(false)} />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-[#0d121c] border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-2xl z-10 animate-scale-in overflow-hidden">
        {/* Glows de fundo temáticos em azul/sky */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Botao Fechar (X) - Continua sem anuncios */}
        <button
          onClick={() => onSelectChoice(false)}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/[0.08] transition-colors z-20 cursor-pointer"
          title="Continuar sem anúncios"
          aria-label="Fechar e continuar sem anúncios"
        >
          <X size={18} />
        </button>

        {/* Header / Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-bold tracking-wide">
            <Heart size={13} className="fill-sky-400 text-sky-400 animate-pulse" />
            <span>Apoio à Comunidade</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
            <Sparkles size={13} className="text-sky-400" />
            <span>100% Opcional</span>
          </div>
        </div>

        {/* Titulo e Descricao */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2.5">
            <KairouIcon size={32} />
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              Quer apoiar o projeto Kairou?
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            O Kairou é uma plataforma independente e gratuita. Para mantermos a alta velocidade e os custos de infraestrutura no ar, você pode escolher se quer nos apoiar assistindo a anúncios ou continuar navegando sem nenhum anúncio.
          </p>
          
          {/* Informacao discreta (nao parece botao) */}
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
            <Sparkles size={14} className="text-sky-400 shrink-0" />
            <span>Você decide livremente se deseja assistir com anúncios ou continuar sem.</span>
          </div>
        </div>

        {/* Opcoes de Acao */}
        <div className="space-y-3">
          {/* Opcao 1: Apoiar com Anuncios (Azul Kairou) */}
          <button
            type="button"
            onClick={() => onSelectChoice(true)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold transition-all shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.01] active:scale-[0.99] cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Heart size={20} className="fill-white text-white" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-extrabold leading-tight">
                  Sim, quero apoiar com anúncios ❤️
                </p>
                <p className="text-xs text-sky-100 font-normal mt-0.5">
                  Ajuda a manter nossos servidores e player rápidos
                </p>
              </div>
            </div>
            <Check size={18} className="text-white/90 shrink-0 ml-2" />
          </button>

          {/* Opcao 2: Continuar sem Anuncios */}
          <button
            type="button"
            onClick={() => onSelectChoice(false)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                <Shield size={18} className="text-slate-400 group-hover:text-sky-400 transition-colors" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold leading-tight">
                  Continuar sem anúncios
                </p>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                  Navegação limpa sem nenhum anúncio
                </p>
              </div>
            </div>
          </button>

          {/* Opcao 3: Apoiar com Doação Pix */}
          {onOpenDonation && (
            <button
              type="button"
              onClick={() => {
                onSelectChoice(false);
                onOpenDonation();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white border border-emerald-500/25 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Heart size={16} className="fill-emerald-400 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold leading-tight">
                    Prefere apoiar com Pix? (Qualquer valor)
                  </p>
                  <p className="text-[11px] text-emerald-400/80 font-normal mt-0.5">
                    Contribua com qualquer valor direto pelo LinksPix
                  </p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
