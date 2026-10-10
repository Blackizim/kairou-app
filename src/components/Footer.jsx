import React from 'react';
import { Crown, Sparkles, Heart } from 'lucide-react';
import KairouIcon from './KairouIcon';
import { TelegramIcon } from './DiscordNoticeModal';

export default function Footer({ onOpenSubscription, onOpenDonation, onOpenDiscordNotice }) {
  const handleOpenVip = onOpenSubscription || onOpenDonation;

  return (
    <footer className="w-full bg-[#07090e] border-t border-white/[0.06] pt-12 pb-10 text-slate-400 select-none">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* Brand Top Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <KairouIcon size={24} />
              <span className="text-lg font-extrabold text-white tracking-tight">
                kai<span className="text-sky-400">rou</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm">
              Plataforma de streaming de alta fidelidade para assistir filmes, séries e animes gratuitamente em alta definição.
            </p>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {/* Botão Doar Pix (PixGG) */}
            <a
              href="https://pixgg.com/pommern"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/40 backdrop-blur-md text-emerald-300 hover:text-white transition-all text-xs font-semibold cursor-pointer shadow-sm active:scale-95 group"
              title="Apoiar o projeto com qualquer valor via PixGG"
            >
              <Heart size={15} className="text-emerald-400 fill-emerald-400/30 group-hover:scale-110 transition-transform" />
              <span>Doar via Pix (PixGG)</span>
            </a>

            {handleOpenVip && (
              <button
                type="button"
                onClick={handleOpenVip}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500/15 via-blue-500/15 to-sky-500/15 hover:from-sky-500/25 hover:to-blue-500/25 border border-sky-400/40 backdrop-blur-md text-sky-300 hover:text-white transition-all text-xs font-semibold cursor-pointer shadow-sm active:scale-95 group"
                title="Assinatura VIP — 100% Sem Anúncios (MB WAY & Cripto)"
              >
                <Crown size={15} className="text-amber-400 fill-amber-400/30 group-hover:scale-110 transition-transform" />
                <span>Assinatura VIP (MB WAY · Crypto)</span>
              </button>
            )}

            <a
              href="https://t.me/+MIU924pI1MoyYTRk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/30 text-[#4cb8ed] hover:text-white transition-all text-xs font-semibold cursor-pointer shadow-sm"
              title="Entrar no canal oficial do Telegram"
            >
              <TelegramIcon size={16} className="fill-[#229ED9]" />
              <span>Telegram Oficial</span>
            </a>
          </div>
        </div>

        {/* Footer Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 text-xs">
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-2.5 text-[11px]">Navegação</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-sky-400 transition-colors">Início</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Séries Populares</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Filmes em Alta</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Top 10 Avaliados</a></li>
              <li>
                <a
                  href="https://pixgg.com/pommern"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 text-emerald-400/90 transition-colors cursor-pointer text-left flex items-center gap-1.5"
                >
                  <Heart size={12} className="text-emerald-400 fill-emerald-400" />
                  <span>Apoiar via PixGG</span>
                </a>
              </li>
              {handleOpenVip && (
                <li>
                  <button
                    type="button"
                    onClick={handleOpenVip}
                    className="hover:text-sky-300 text-sky-400/90 transition-colors cursor-pointer text-left flex items-center gap-1.5"
                  >
                    <Crown size={12} className="text-amber-400 fill-amber-400" />
                    <span>Planos VIP (Sem Anúncios)</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-2.5 text-[11px]">Formatos</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-sky-400 transition-colors">4K Ultra HD</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Dolby Vision & HDR10</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Dolby Atmos</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Áudio Espacial</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-2.5 text-[11px]">Ajuda</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://t.me/+MIU924pI1MoyYTRk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4cb8ed] hover:text-white transition-colors flex items-center gap-1.5 font-medium"
                >
                  <TelegramIcon size={13} className="fill-[#229ED9]" />
                  <span>Telegram Oficial (Suporte)</span>
                </a>
              </li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Dispositivos Compatíveis</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Preferências</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-2.5 text-[11px]">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-sky-400 transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Aviso Legal</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Kairou. Todos os direitos reservados.</p>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Design Cinema Clean</span>
            <span className="text-slate-600">•</span>
            <span className="text-sky-400 font-semibold">Kairou Streaming</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
