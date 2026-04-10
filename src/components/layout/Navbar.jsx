import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, User, LayoutDashboard, Menu, X, Wallet, Bell, ExternalLink, Shield, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { marketApi } from '@/services/marketApi';

const LOGO = 'https://customer-assets.emergentagent.com/job_bitzx-launch/artifacts/egv3g6nq_Bitzx%20Logo%20%281%29.png';
const TOKEN_SITE_URL = import.meta.env.VITE_TOKEN_URL || 'http://localhost:3000';
const TICKER_PAIRS   = ['BZXUSDT','BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT'];

const NAV_LINKS = [
  { label: 'Markets',     to: '/markets' },
  { label: 'Trade',       to: '/trade/BZXUSDT' },
];

function LiveTicker() {
  const [tickers, setTickers] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await marketApi.getMarkets();
        setTickers(data.filter(m => TICKER_PAIRS.includes(m.symbol)).slice(0, 6));
      } catch { /* silently fail */ }
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (!tickers.length) return null;

  const items = [...tickers, ...tickers];

  return (
    <div className="border-b border-white/[.06] overflow-hidden"
      style={{ background: 'rgba(8,9,12,0.45)', backdropFilter: 'blur(12px)' }}>
      <div className="flex">
        <div
          className="flex gap-10 py-2 px-6 whitespace-nowrap"
          style={{ animation: 'ticker 35s linear infinite' }}
        >
          {items.map((t, i) => {
            const pct  = parseFloat(t.priceChangePercent ?? 0);
            const base = t.symbol.replace('USDT','');
            return (
              <Link key={i} to={`/trade/${t.symbol}`}
                className="flex items-center gap-2.5 text-sm hover:opacity-80 transition-opacity">
                <span className="text-[#8A8B90] font-semibold">{base}/USDT</span>
                <span className="text-white font-mono font-medium">
                  ${parseFloat(t.price || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
                <span className={`font-semibold ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [userOpen,  setUserOpen]  = useState(false);
  const [scrolled,  setScrolled]  = useState(false);
  const userRef = useRef(null);

  const isTrade = location.pathname.startsWith('/trade');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = e => { if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      {/* Hide ticker only on /trade pages to maximise chart height */}
      {!isTrade && <LiveTicker />}
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled || isTrade
            ? 'rgba(10,11,15,0.92)'
            : 'rgba(8,9,12,0.35)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Main nav bar — taller and full-width */}
        <div className="flex items-center gap-3 sm:gap-6 px-4 sm:px-6 lg:px-12 2xl:px-20 h-18" style={{ height: '70px' }}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
            <motion.img
              src={LOGO} alt="BITZX"
              className="h-11 w-11 object-contain"
              whileHover={{ rotate: 8, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            />
            <span className="font-extrabold text-xl tracking-tight">
              <span className="text-white">BITZ</span>
              <span className="text-gradient">X</span>
              <span className="ml-2 text-xs font-bold text-[#4A4B50] tracking-widest uppercase">Exchange</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV_LINKS.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-4 py-2 rounded-lg text-base font-semibold transition-colors ${
                  location.pathname === l.to ||
                  location.pathname.startsWith(l.to.split('/').slice(0, 2).join('/'))
                    ? 'text-gold-light bg-gold/10'
                    : 'text-[#8A8B90] hover:text-white hover:bg-surface-hover'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Quick Trade — dedicated page link */}
          <Link
            to="/quick-trade"
            className="hidden sm:flex items-center gap-2 ml-4 px-4 py-2 rounded-xl
              font-extrabold text-sm transition-all
              hover:shadow-lg hover:shadow-gold/20 hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(135deg, rgba(156,121,65,0.22), rgba(235,211,141,0.18))',
              border: '1px solid rgba(235,211,141,0.38)',
              color: '#EBD38D',
              textDecoration: 'none',
            }}
          >
            <Zap size={15} />
            Quick Trade
          </Link>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-4">
            {/* Token site link */}
            <a
              href={TOKEN_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 text-sm text-[#4A4B50] hover:text-[#8A8B90] transition-colors border border-surface-border px-3 py-1.5 rounded-lg hover:border-[#4A4B50]/50"
            >
              <ExternalLink size={13} /> Token Site
            </a>

            {user ? (
              <>
                {/* Notification */}
                <button className="relative p-2.5 rounded-lg text-[#4A4B50] hover:text-white hover:bg-surface-hover transition-colors">
                  <Bell size={18} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold rounded-full" />
                </button>

                {/* User menu */}
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setUserOpen(v => !v)}
                    className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-surface-card border border-surface-border hover:border-gold/40 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center text-gold-light text-sm font-bold">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-base text-white font-semibold max-w-[100px] truncate">
                      {user.name}
                    </span>
                    <ChevronDown size={15} className="text-[#4A4B50]" />
                  </button>

                  <AnimatePresence>
                    {userOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-surface-card border border-surface-border rounded-xl shadow-2xl py-1 z-50"
                      >
                        <Link to="/dashboard" onClick={() => setUserOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-3 text-base text-[#D5D5D0] hover:bg-surface-hover hover:text-white transition-colors">
                          <LayoutDashboard size={16} /> Dashboard
                        </Link>
                        <Link to="/wallet" onClick={() => setUserOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-3 text-base text-[#D5D5D0] hover:bg-surface-hover hover:text-white transition-colors">
                          <Wallet size={16} /> My Wallet
                        </Link>
                        <Link to="/profile" onClick={() => setUserOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-3 text-base text-[#D5D5D0] hover:bg-surface-hover hover:text-white transition-colors">
                          <User size={16} /> Edit Profile
                        </Link>
                        <Link to="/kyc" onClick={() => setUserOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-3 text-base text-[#D5D5D0] hover:bg-surface-hover hover:text-white transition-colors">
                          <Shield size={16} /> KYC Verification
                        </Link>
                        <div className="border-t border-surface-border my-1" />
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-base text-red-400 hover:bg-surface-hover transition-colors">
                          <LogOut size={16} /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login"
                  className="hidden sm:block px-5 py-2 text-base font-semibold text-[#8A8B90] hover:text-white transition-colors">
                  Log In
                </Link>
                <Link to="/register"
                  className="px-5 py-2.5 text-base font-bold bg-gradient-to-r from-gold to-gold-light text-surface-dark rounded-xl hover:shadow-lg hover:shadow-gold/20 hover:scale-[1.03] transition-all">
                  Sign Up Free
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 text-[#8A8B90] hover:text-white">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="md:hidden overflow-hidden border-t border-surface-border bg-surface-dark"
            >
              <div className="px-6 py-4 space-y-1">
                {/* Quick Trade — mobile */}
                <Link to="/quick-trade" onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5
                    rounded-xl font-extrabold text-base mb-2 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgba(156,121,65,0.22), rgba(235,211,141,0.18))',
                    border: '1px solid rgba(235,211,141,0.38)',
                    color: '#EBD38D',
                    textDecoration: 'none',
                  }}
                >
                  <Zap size={17} /> Quick Trade
                </Link>

                {NAV_LINKS.map(l => (
                  <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl text-base font-semibold text-[#8A8B90] hover:text-white hover:bg-surface-hover transition-colors">
                    {l.label}
                  </Link>
                ))}
                {user && (
                  <>
                    <Link to="/wallet" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-semibold text-[#8A8B90] hover:text-white hover:bg-surface-hover transition-colors">
                      <Wallet size={15} /> Wallet
                    </Link>
                    <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-semibold text-[#8A8B90] hover:text-white hover:bg-surface-hover transition-colors">
                      <LayoutDashboard size={15} /> Dashboard
                    </Link>
                    <Link to="/profile" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-semibold text-[#8A8B90] hover:text-white hover:bg-surface-hover transition-colors">
                      <User size={15} /> Edit Profile
                    </Link>
                    <Link to="/kyc" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-semibold text-[#8A8B90] hover:text-white hover:bg-surface-hover transition-colors">
                      <Shield size={15} /> KYC Verification
                    </Link>
                  </>
                )}
                <a href={TOKEN_SITE_URL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 text-base text-[#4A4B50] hover:text-[#8A8B90] transition-colors">
                  <ExternalLink size={14} /> Token Site
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

    </>
  );
}
