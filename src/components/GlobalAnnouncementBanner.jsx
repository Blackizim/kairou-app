import React, { useState, useEffect } from 'react';
import { getGlobalAnnouncement } from '../services/adminAnalytics';
import { Megaphone, ExternalLink, X } from 'lucide-react';

export default function GlobalAnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(() => getGlobalAnnouncement());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setAnnouncement(getGlobalAnnouncement());
      setDismissed(false);
    };

    window.addEventListener('kairou_announcement_changed', handleUpdate);
    return () => window.removeEventListener('kairou_announcement_changed', handleUpdate);
  }, []);

  if (!announcement || !announcement.active || !announcement.text || dismissed) {
    return null;
  }

  const { text, badge, type, link } = announcement;

  const styleConfig = {
    green: {
      bg: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200',
      badge: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40',
      link: 'text-emerald-300 hover:text-emerald-100',
    },
    blue: {
      bg: 'bg-sky-950/80 border-sky-500/30 text-sky-200',
      badge: 'bg-sky-500/25 text-sky-300 border-sky-500/40',
      link: 'text-sky-300 hover:text-sky-100',
    },
    amber: {
      bg: 'bg-amber-950/80 border-amber-500/30 text-amber-200',
      badge: 'bg-amber-500/25 text-amber-300 border-amber-500/40',
      link: 'text-amber-300 hover:text-amber-100',
    },
    red: {
      bg: 'bg-rose-950/80 border-rose-500/30 text-rose-200',
      badge: 'bg-rose-500/25 text-rose-300 border-rose-500/40',
      link: 'text-rose-300 hover:text-rose-100',
    },
  }[type || 'green'];

  return (
    <div
      className={`relative z-40 w-full px-4 py-2 text-xs border-b backdrop-blur-md flex items-center justify-between gap-3 shadow-md animate-fade-in ${styleConfig.bg}`}
    >
      <div className="max-w-[1680px] mx-auto w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 truncate">
          <span
            className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wider border shrink-0 ${styleConfig.badge}`}
          >
            {badge || 'Aviso'}
          </span>
          <p className="truncate font-medium text-xs text-white">{text}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1 font-bold text-xs underline transition-colors cursor-pointer ${styleConfig.link}`}
            >
              <span>Acessar</span>
              <ExternalLink size={12} />
            </a>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Fechar aviso"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
