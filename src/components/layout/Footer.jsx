import { Link } from 'react-router-dom';
import { Send, Mail, Shield, Zap, ExternalLink } from 'lucide-react';
import DunsRegisteredSeal from './DunsRegisteredSeal';

import { BRAND_LOGO } from '@/lib/brandAssets';

const LOGO = BRAND_LOGO;

const SUPPORT_EMAIL = 'support@bitzx.io';

const LINKS = {
  Exchange: [
    { label: 'Markets',        to: '/markets' },
    { label: 'Spot Trade',     to: '/trade/BZXUSDT' },
    { label: 'Dashboard',      to: '/dashboard' },
  ],
  Company: [
    { label: 'Token Website',  href: 'https://bitzx.io' },
    { label: 'Whitepaper',     href: 'https://bitzx.io/whitepaper' },
    { label: 'About',          href: 'https://bitzx.io/about' },
  ],
  Support: [
    { label: SUPPORT_EMAIL,    href: `mailto:${SUPPORT_EMAIL}`, isMailto: true },
    { label: 'Help Center',    href: '#' },
    { label: 'API Docs',       href: '#' },
    { label: 'Status',         href: '#' },
  ],
};

function FacebookIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

const SOCIAL = [
  { icon: ExternalLink, href: 'https://x.com/bitzxofficial', label: 'Twitter' },
  { icon: Send,         href: 'https://t.me/bitzxofficial', label: 'Telegram' },
  { icon: FacebookIcon, href: 'https://www.facebook.com/profile.php?id=61590368919405', label: 'Facebook' },
  { icon: InstagramIcon, href: 'https://www.instagram.com/thebitzx/', label: 'Instagram' },
  { icon: Mail,         href: `mailto:${SUPPORT_EMAIL}`, label: 'Email', isMailto: true },
];

export default function Footer() {
  return (
    <footer className="bg-surface-dark border-t border-surface-border mt-auto">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-10 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
            <img src={LOGO} alt="BITZX" className="h-10 w-10 object-contain" />
            <span className="font-extrabold text-xl">
              <span className="text-white">BITZ</span>
              <span className="text-gradient">X</span>
              <span className="ml-2 text-xs text-white font-semibold tracking-widest">EXCHANGE</span>
            </span>
            </div>
            <p className="text-white text-base leading-relaxed max-w-xs mb-6">
              Next-generation centralized crypto exchange. Fast, secure, and built for everyone.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                All systems operational
              </div>
            </div>
            <div className="flex items-center gap-3">
              {SOCIAL.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  {...(s.isMailto ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                  className="bitzx-social-btn p-2 rounded-lg bg-surface-card border border-surface-border text-white hover:text-gold-light hover:border-gold/30"
                >
                  <s.icon size={15} />
                </a>
              ))}
            </div>

            <div className="mt-6">
              <DunsRegisteredSeal />
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([col, items]) => (
            <div key={col}>
              <h4 className="text-white font-bold text-base mb-5">{col}</h4>
              <ul className="space-y-3">
                {items.map(item => (
                  <li key={item.label}>
                    {item.to ? (
                      <Link to={item.to} className="bitzx-footer-link text-white/90 text-base">
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        {...(item.isMailto ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                        className="bitzx-footer-link text-white/90 text-base"
                      >
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-surface-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white text-sm">© 2026 BITZX Exchange. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-5 gap-y-2 text-white text-sm">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-white/90 hover:text-gold-light transition-colors"
            >
              {SUPPORT_EMAIL}
            </a>
            <span className="flex items-center gap-1"><Shield size={11} /> Secured</span>
            <span className="flex items-center gap-1"><Zap size={11} /> Fast Execution</span>
            <span>Trading involves risk. Demo platform only.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
