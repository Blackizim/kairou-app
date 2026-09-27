import React, { useState, useRef } from 'react';
import { Heart, Sparkles, ArrowRight, ShieldCheck, Zap, Copy, Check, X } from 'lucide-react';

const PRESET_AMOUNTS = [
  { label: 'R$ 5', value: '5.00' },
  { label: 'R$ 10', value: '10.00' },
  { label: 'R$ 20', value: '20.00' },
  { label: 'R$ 30,33', value: '30.33' },
  { label: 'R$ 50', value: '50.00' },
  { label: 'R$ 100', value: '100.00' },
];

export function formatPixAmount(rawInput) {
  if (!rawInput) return '5.00';
  
  // Substitui vírgula por ponto e remove caracteres não numéricos exceto ponto
  let cleaned = String(rawInput).trim().replace(',', '.').replace(/[^0-9.]/g, '');
  
  // Se tiver múltiplos pontos, mantém apenas o primeiro
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return '5.00';

  // Se o usuário digitou casas decimais, preserva exatamente até 2 casas
  if (cleaned.includes('.')) {
    const [intPart, decPart] = cleaned.split('.');
    return `${intPart || '0'}.${decPart.slice(0, 2).padEnd(2, '0')}`;
  }

  return `${num}.00`;
}

export default function DonationSection({ isModal = false, onClose }) {
  const [customAmount, setCustomAmount] = useState('10.00');
  const [selectedPreset, setSelectedPreset] = useState('10.00');
  const [copied, setCopied] = useState(false);
  const linkRef = useRef(null);

  // Calcula o valor final formatado (ex: 30.33 ou 30.00)
  const formattedValue = formatPixAmount(customAmount);
  const targetUrl = `https://linkspix.app/pmmr/${formattedValue}`;

  const handlePresetClick = (val) => {
    setSelectedPreset(val);
    setCustomAmount(val);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setCustomAmount(val);
    setSelectedPreset(null);
  };

  const handleDonate = (e) => {
    if (!formattedValue || parseFloat(formattedValue) <= 0) {
      e?.preventDefault();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const content = (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0e1422] via-[#090d16] to-[#07090e] border border-white/[0.1] shadow-2xl ${isModal ? 'p-6 sm:p-8' : 'p-6 sm:p-10 lg:p-12'}`}>
      {/* Luzes / Efeitos de Fundo Glassmorphism */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Botão Fechar se for Modal */}
      {isModal && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/[0.08] transition-colors z-20 cursor-pointer"
          title="Fechar"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      )}

      {/* Cabeçalho */}
      <div className="relative z-10 text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/15 to-sky-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
          <Heart size={14} className="fill-emerald-400 text-emerald-400 animate-pulse" />
          <span>Apoie o Projeto Kairou</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight mb-3">
          Faça uma doação de <span className="bg-gradient-to-r from-sky-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">qualquer valor</span>
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
          O Kairou é 100% independente e gratuito. Nossos servidores de alta velocidade, reprodutor próprio e catálogo em 4K são mantidos com a ajuda direta da comunidade via Pix.
        </p>
      </div>

      {/* Card Central Interativo */}
      <div className="relative z-10 max-w-xl mx-auto bg-slate-900/70 border border-white/[0.08] rounded-2xl p-5 sm:p-7 backdrop-blur-xl shadow-xl">
        {/* Presets Rápidos */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Valores Sugeridos
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESET_AMOUNTS.map((preset) => {
              const isSelected = selectedPreset === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetClick(preset.value)}
                  className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 border-emerald-400/80 shadow-lg shadow-sky-500/25'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input para Qualquer Valor Personalizado */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Ou digite qualquer outro valor (R$)
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-4 pointer-events-none text-slate-400 font-bold text-lg sm:text-xl">
              R$
            </div>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 30.33 ou 15.00"
              value={customAmount}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  linkRef.current?.click();
                }
              }}
              className="w-full bg-slate-950/80 border border-white/[0.12] focus:border-sky-400/80 rounded-xl py-3.5 pl-12 pr-4 text-white text-lg sm:text-xl font-extrabold tracking-wide placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/20 transition-all"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <Sparkles size={12} className="text-sky-400 shrink-0" />
            <span>Qualquer centavo ou valor é aceito via chave Pix direta.</span>
          </p>
        </div>

        {/* Preview do Link Gerado em Tempo Real */}
        <div className="mb-6 p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.06] flex items-center justify-between gap-3 text-xs">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Destino Seguro do Pix
            </span>
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 font-mono font-medium truncate block select-all text-[11px] sm:text-xs hover:underline hover:text-sky-300 transition-colors"
              title="Abrir link do Pix em nova aba"
            >
              {targetUrl}
            </a>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Copiar link com valor"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Botão de Doação com Redirecionamento (Link nativo <a> para nunca ser bloqueado por popup blockers) */}
        <a
          ref={linkRef}
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleDonate}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-black text-sm sm:text-base tracking-wide transition-all shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer group text-center no-underline select-none"
        >
          <Zap size={18} className="fill-slate-950 text-slate-950 group-hover:animate-bounce" />
          <span>Contribuir R$ {formattedValue.replace('.', ',')} via Pix</span>
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </a>

        {/* Garantias / Badges Informativas */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Processado pelo LinksPix Oficial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-sky-400" />
            <span>Acesso Imediato sem Registro</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
        <div className="fixed inset-0" onClick={onClose} />
        <div className="relative w-full max-w-2xl z-10 animate-scale-in">
          {content}
        </div>
      </div>
    );
  }

  return (
    <section id="doacoes" className="w-full py-10 sm:py-16 px-4 sm:px-8 lg:px-12 max-w-[1680px] mx-auto select-none">
      {content}
    </section>
  );
}
