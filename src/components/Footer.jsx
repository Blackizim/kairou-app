import React from 'react';
import { KaiHeart, KaiTelegram } from './KaiIcons';

export default function Footer({ onOpenDonation }) {
  return (
    <footer className="page-width footer">
      <a
        className="brand"
        href="#inicio"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        <img src="/kairou.svg" alt="Kairou" />
        <span>kairou</span>
      </a>

      <div className="footer-links">
        <a
          href="https://pixgg.com/pommern"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-[#76dbb4] transition-colors"
        >
          <KaiHeart size={12} className="text-[#76dbb4]" />
          <span>Apoiar via Pix</span>
        </a>
        <a
          href="https://t.me/+MIU924pI1MoyYTRk"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-[#80cbf0] transition-colors"
        >
          <KaiTelegram size={12} className="text-[#80cbf0]" />
          <span>Telegram</span>
        </a>
        <span>Filmes, séries e animes em 4K e 1080p.</span>
      </div>
    </footer>
  );
}
