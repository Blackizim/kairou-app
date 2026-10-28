import React, { useState, useRef } from 'react';
import { Heart, Sparkles, Zap, Copy, Check, X, ExternalLink, ShieldCheck } from 'lucide-react';

const PRESET_AMOUNTS = [
  { label: 'R$ 5', value: '5.00' },
  { label: 'R$ 10', value: '10.00' },
  { label: 'R$ 20', value: '20.00' },
  { label: 'R$ 30,33', value: '30.33' },
  { label: 'R$ 50', value: '50.00' },
  { label: 'R$ 100', value: '100.00' },
];

export function formatPixAmount(rawInput) {
  if (!rawInput) return '10.00';
  let cleaned = String(rawInput).trim().replace(',', '.').replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return '10.00';
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

  const pixggUrl = 'https://pixgg.com/pommern';
  const formattedValue = formatPixAmount(customAmount);

  const handlePresetClick = (val) => {
    setSelectedPreset(val);
    setCustomAmount(val);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setCustomAmount(val);
    setSelectedPreset(null);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pixggUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const content = (
    <div className={`relative overflow-hidden rounded-3xl bg-[#0c101a]/90 border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl ${isModal ? 'p-6 sm:p-8' : 'p-6 sm:p-10'}`}>
      {/* Ambient Radial Backlights */}
      <div className="absolute -top-24 -left-20 w-72 h-72 bg-sky-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Botão Fechar se for Modal */}
      {isModal && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/[0.08] transition-colors z-20 cursor-pointer"
          title="Fechar"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      )}

      {/* Cabeçalho */}
      <div className="relative z-10 text-center max-w-xl mx-auto mb-7">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-3.5 shadow-sm">
          <Heart size={13} className="fill-emerald-400 text-emerald-400 animate-pulse" />
          <span>Apoie o Kairou</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug mb-2.5">
          Ajude a manter o Kairou <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">no ar e gratuito</span>
        </h2>

        <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed">
          Sem mensalidades, sem anúncios e com servidores 4K de alta velocidade. Nossa infraestrutura é 100% independente e mantida pela comunidade.
        </p>
      </div>

      {/* Caixa Interativa de Doação */}
      <div className="relative z-10 max-w-md mx-auto">
        {/* Presets de Valor */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center sm:text-left">
            Escolha um valor sugerido:
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESET_AMOUNTS.map((preset) => {
              const isSelected = selectedPreset === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetClick(preset.value)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/30'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input de Valor Personalizado */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center sm:text-left">
            Ou digite outro valor (R$):
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-4 pointer-events-none text-slate-400 font-bold text-base sm:text-lg">
              R$
            </div>
            <input
              type="text"
              inputMode="decimal"
              placeholder="10.00"
              value={customAmount}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  linkRef.current?.click();
                }
              }}
              className="w-full bg-slate-950/80 border border-white/[0.1] focus:border-sky-400 rounded-xl py-3 pl-12 pr-4 text-white text-base sm:text-lg font-bold tracking-wide placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/20 transition-all text-left"
            />
          </div>
        </div>

        {/* Botão de Doação Principal via PixGG */}
        <a
          ref={linkRef}
          href={pixggUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer no-underline select-none mb-3"
        >
          <Zap size={16} className="fill-slate-950 text-slate-950" />
          <span>Doar R$ {formattedValue.replace('.', ',')} no PixGG</span>
          <ExternalLink size={15} className="text-slate-950 ml-0.5" />
        </a>

        {/* Link Copiável PixGG */}
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-2.5 text-xs">
          <div className="min-w-0 flex-1 pl-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
              Chave / Destino Oficial
            </span>
            <span className="text-emerald-400/90 font-mono text-[11px] truncate block select-all">
              {pixggUrl}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-[11px] font-semibold"
            title="Copiar link do PixGG"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        {/* Rodapé de Confiança */}
        <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-center gap-4 text-[10px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-400" />
            100% Seguro
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1">
            <Zap size={12} className="text-sky-400" />
            Pix Instantâneo
          </span>
          <span className="text-slate-600">•</span>
          <span>Apoio Voluntário</span>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
        <div className="fixed inset-0" onClick={onClose} />
        <div className="relative w-full max-w-xl z-10 max-h-[92vh] overflow-y-auto custom-scrollbar">
          {content}
        </div>
      </div>
    );
  }

  return (
    <section className="relative w-full py-12 px-4 sm:px-6 select-none">
      <div className="max-w-2xl mx-auto">
        {content}
      </div>
    </section>
  );
}
