import { Link } from 'react-router-dom';
import { Send, Mail, Shield, Zap, ExternalLink } from 'lucide-react';

const LOGO = 'https://customer-assets.emergentagent.com/job_bitzx-launch/artifacts/egv3g6nq_Bitzx%20Logo%20%281%29.png';

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
    { label: 'Help Center',    href: '#' },
    { label: 'API Docs',       href: '#' },
    { label: 'Status',         href: '#' },
  ],
};

const SOCIAL = [
  { icon: ExternalLink, href: '#', label: 'Twitter'  },
  { icon: Send,         href: '#', label: 'Telegram' },
  { icon: ExternalLink, href: '#', label: 'GitHub'   },
  { icon: Mail,         href: '#', label: 'Email'    },
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
                <a key={s.label} href={s.href} aria-label={s.label}
                  className="bitzx-social-btn p-2 rounded-lg bg-surface-card border border-surface-border text-white hover:text-gold-light hover:border-gold/30">
                  <s.icon size={15} />
                </a>
              ))}
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
                      <a href={item.href} target="_blank" rel="noopener noreferrer"
                        className="bitzx-footer-link text-white/90 text-base">
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
          <div className="flex items-center gap-5 text-white text-sm">
            <span className="flex items-center gap-1"><Shield size={11} /> Secured</span>
            <span className="flex items-center gap-1"><Zap size={11} /> Fast Execution</span>
            <span>Trading involves risk. Demo platform only.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
