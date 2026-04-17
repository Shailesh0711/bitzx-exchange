import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, User, LayoutDashboard, Menu, X, Wallet, Bell, ExternalLink, Shield, Zap, LineChart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { exchangeWsPath, normalizeMarketsList } from '@/services/marketApi';
import { exchangeApiOrigin } from '@/lib/apiBase';

const LOGO = 'https://customer-assets.emergentagent.com/job_bitzx-launch/artifacts/egv3g6nq_Bitzx%20Logo%20%281%29.png';
const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);
const TOKEN_SITE_URL = import.meta.env.VITE_TOKEN_URL || 'https://bitzx.io';

function userAvatarSrc(user) {
  if (!user?.avatar_url) return null;
  const u = user.avatar_url;
  if (u.startsWith('http')) return u;
  const base = API.replace(/\/$/, '');
  return `${base}${u.startsWith('/') ? u : `/${u}`}`;
}
const TICKER_PAIRS   = ['BZXUSDT','BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT'];
/** Tailwind `w-52` — menu width for viewport clamp math */
const USER_MENU_WIDTH_PX = 208;
const USER_MENU_EDGE_GAP = 8;

const NAV_LINKS = [
  { label: 'Markets', to: '/markets' },
  { label: 'Trade',   to: '/trade/BZXUSDT' },
  { label: 'Wallet',  to: '/wallet' },
  { label: 'P&L',     to: '/portfolio' },
];

function LiveTicker() {
  const [tickers, setTickers] = useState([]);

  useEffect(() => {
    const url = exchangeWsPath('/api/ws/exchange/markets');
    let closed = false;
    let reconnectTimer = null;
    let ws = null;
    const connect = () => {
      if (closed) return;
      ws = new WebSocket(url);
      ws.onmessage = (ev) => {
        try {
          const j = JSON.parse(ev.data);
          if (j.type === 'exchange_markets' && Array.isArray(j.markets)) {
            const data = normalizeMarketsList(j.markets);
            setTickers(data.filter(m => TICKER_PAIRS.includes(m.symbol)).slice(0, 6));
          }
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        ws = null;
        if (!closed) reconnectTimer = window.setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
    };
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
                className="bitzx-ticker-link flex items-center gap-2.5 text-sm opacity-90 hover:opacity-100">
                <span className="text-white font-semibold">{base}/USDT</span>
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
  const [userMenuPos, setUserMenuPos] = useState(null);
  const userTriggerRef = useRef(null);
  const userMenuPanelRef = useRef(null);

  const isTrade = location.pathname.startsWith('/trade');
  const isHome = location.pathname === '/';

  useEffect(() => {
    setUserOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const updateUserMenuPosition = useCallback(() => {
    const el = userTriggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = r.right - USER_MENU_WIDTH_PX;
    left = Math.max(
      USER_MENU_EDGE_GAP,
      Math.min(left, window.innerWidth - USER_MENU_WIDTH_PX - USER_MENU_EDGE_GAP),
    );
    setUserMenuPos({ top: r.bottom + USER_MENU_EDGE_GAP, left });
  }, []);

  useLayoutEffect(() => {
    if (!userOpen) {
      setUserMenuPos(null);
      return;
    }
    updateUserMenuPosition();
    window.addEventListener('scroll', updateUserMenuPosition, true);
    window.addEventListener('resize', updateUserMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateUserMenuPosition, true);
      window.removeEventListener('resize', updateUserMenuPosition);
    };
  }, [userOpen, updateUserMenuPosition]);

  useEffect(() => {
    const onClick = e => {
      if (userTriggerRef.current?.contains(e.target)) return;
      if (userMenuPanelRef.current?.contains(e.target)) return;
      setUserOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };
  const navAvatarSrc = user ? userAvatarSrc(user) : null;

  return (
    <>
      {/* Hide on trade (chart height) and on home (clean video hero) */}
      {!isTrade && !isHome && <LiveTicker />}
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
        <div className="w-full flex items-center gap-3 sm:gap-6 px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 h-18" style={{ height: '70px' }}>
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
              <span className="ml-2 text-xs font-bold text-white tracking-widest uppercase">Exchange</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV_LINKS.map(l => {
              const active =
                location.pathname === l.to ||
                location.pathname.startsWith(l.to.split('/').slice(0, 2).join('/'));
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-4 py-2 rounded-lg text-base font-semibold transition-colors ${
                    active
                      ? 'text-gold-light bg-gold/10'
                      : 'text-white hover:text-white hover:bg-surface-hover bitzx-nav-link'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Quick Trade — dedicated page link */}
          <Link
            to="/quick-trade"
            className="bitzx-hover-scale hidden sm:flex items-center gap-2 ml-4 px-4 py-2 rounded-xl
              font-extrabold text-sm shadow-md shadow-black/20"
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
              className="hidden lg:flex items-center gap-1.5 text-sm text-white hover:text-white transition-colors border border-surface-border px-3 py-1.5 rounded-lg hover:border-white/40"
            >
              <ExternalLink size={13} /> Token Site
            </a>

            {user ? (
              <>
                {/* Notification */}
                <button className="relative p-2.5 rounded-lg text-white hover:text-white hover:bg-surface-hover transition-colors">
                  <Bell size={18} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold rounded-full" />
                </button>

                {/* User menu — portaled + fixed so sticky header / transforms never misalign the panel */}
                <div className="relative" ref={userTriggerRef}>
                  <button
                    type="button"
                    onClick={() => setUserOpen(v => !v)}
                    className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-surface-card border border-surface-border hover:border-gold/40 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center text-gold-light text-sm font-bold overflow-hidden flex-shrink-0">
                      {navAvatarSrc ? (
                        <img src={navAvatarSrc} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.name?.[0]?.toUpperCase()
                      )}
                    </div>
                    <span className="hidden sm:block text-base text-white font-semibold max-w-[100px] truncate">
                      {user.name}
                    </span>
                    <ChevronDown size={15} className="text-white" />
                  </button>
                </div>

                {typeof document !== 'undefined' && userOpen && userMenuPos != null && createPortal(
                  <motion.div
                    ref={userMenuPanelRef}
                    role="menu"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="w-52 bg-surface-card border border-surface-border rounded-xl shadow-2xl py-1"
                    style={{
                      position: 'fixed',
                      top: userMenuPos.top,
                      left: userMenuPos.left,
                      zIndex: 10050,
                    }}
                  >
                    <Link to="/dashboard" onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-base text-white hover:bg-surface-hover hover:text-white transition-colors">
                      <LayoutDashboard size={16} /> Dashboard
                    </Link>
                    <Link to="/portfolio" onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-base text-white hover:bg-surface-hover hover:text-white transition-colors">
                      <LineChart size={16} /> P&amp;L &amp; fills
                    </Link>
                    <Link to="/wallet" onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-base text-white hover:bg-surface-hover hover:text-white transition-colors">
                      <Wallet size={16} /> My Wallet
                    </Link>
                    <Link to="/profile" onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-base text-white hover:bg-surface-hover hover:text-white transition-colors">
                      <User size={16} /> Edit Profile
                    </Link>
                    <Link to="/kyc" onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-base text-white hover:bg-surface-hover hover:text-white transition-colors">
                      <Shield size={16} /> KYC Verification
                    </Link>
                    <div className="border-t border-surface-border my-1" />
                    <button type="button" onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-base text-red-400 hover:bg-surface-hover transition-colors">
                      <LogOut size={16} /> Sign Out
                    </button>
                  </motion.div>,
                  document.body,
                )}
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login"
                  className="hidden sm:block px-5 py-2 text-base font-semibold text-white hover:text-white transition-colors">
                  Log In
                </Link>
                <Link to="/register"
                  className="px-5 py-2.5 text-base font-bold bg-gradient-to-r from-gold to-gold-light text-surface-dark rounded-xl hover:shadow-lg hover:shadow-gold/20 hover:scale-[1.03] transition-all">
                  Sign Up Free
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 text-white hover:text-white">
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
                    className="block px-4 py-3 rounded-xl text-base font-semibold text-white hover:text-white hover:bg-surface-hover transition-colors">
                    {l.label}
                  </Link>
                ))}
                {user && (
                  <>
                    <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-semibold text-white hover:text-white hover:bg-surface-hover transition-colors">
                      <LayoutDashboard size={15} /> Dashboard
                    </Link>
                    <Link to="/profile" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-semibold text-white hover:text-white hover:bg-surface-hover transition-colors">
                      <User size={15} /> Edit Profile
                    </Link>
                    <Link to="/kyc" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-semibold text-white hover:text-white hover:bg-surface-hover transition-colors">
                      <Shield size={15} /> KYC Verification
                    </Link>
                  </>
                )}
                <a href={TOKEN_SITE_URL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 text-base text-white hover:text-white transition-colors">
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
