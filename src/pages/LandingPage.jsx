import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight, Shield, Zap, BarChart2, Wallet, Lock,
  TrendingUp, TrendingDown, Globe, Star, ChevronRight,
  Users, Activity, Award, RefreshCw, CheckCircle, X,
  Cpu, Eye, Sparkles, ArrowUpRight,
  LayoutDashboard, LineChart, Flame, Snowflake,
} from 'lucide-react';
import { COIN_ICONS, PAIRS, exchangeWsPath, normalizeMarketsList } from '@/services/marketApi';

const LOGO = 'https://customer-assets.emergentagent.com/job_bitzx-launch/artifacts/egv3g6nq_Bitzx%20Logo%20%281%29.png';

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Zap,       color: '#EBD38D', title: 'Ultra-Fast Execution',  desc: 'Sub-millisecond matching engine handles 1M+ TPS. Orders confirmed before you blink.' },
  { icon: Shield,    color: '#22c55e', title: 'Bank-Grade Security',   desc: '95% cold wallet storage, 2FA, whitelisting, and real-time threat monitoring.' },
  { icon: BarChart2, color: '#60a5fa', title: 'TradingView Charts',    desc: 'Full-feature charts with 100+ indicators, drawing tools, and multi-timeframe analysis.' },
  { icon: Globe,     color: '#a78bfa', title: 'Global Liquidity',      desc: 'Deep order books aggregated across providers for tight spreads around the clock.' },
  { icon: Wallet,    color: '#f97316', title: 'Multi-Asset Portfolio', desc: 'Trade 100+ pairs. Manage, deposit and withdraw all your assets in one place.' },
  { icon: Lock,      color: '#ec4899', title: 'Fully KYC Compliant',   desc: 'Regulated platform serving 100+ countries. Identity verified, funds protected.' },
];

const HOW_STEPS = [
  { n: '01', icon: Users,      title: 'Create Account',  desc: 'Sign up free in under 2 minutes. Complete KYC verification to unlock all features.' },
  { n: '02', icon: Wallet,     title: 'Deposit Funds',   desc: 'Add USDT or crypto via wallet transfer. Funds appear instantly in your account.' },
  { n: '03', icon: TrendingUp, title: 'Start Trading',   desc: 'Pick a pair, set your price, and execute orders with professional tools.' },
];

const TESTIMONIALS = [
  { name: 'Alex R.',     role: 'Day Trader',         avatar: 'A', text: 'BITZX execution speed is unreal. My limit orders fill almost instantly and the fees are the lowest I have seen on any exchange.', rating: 5 },
  { name: 'Priya S.',    role: 'Crypto Investor',    avatar: 'P', text: 'The KYC process was smooth and the interface is very intuitive. Best exchange UI I have used. Charts are top notch.', rating: 5 },
  { name: 'Marcus K.',   role: 'Portfolio Manager',  avatar: 'M', text: 'Love the portfolio P&L tracking in real time. Makes it very easy to monitor my positions and decide when to take profit.', rating: 5 },
];

const VS_TABLE = [
  { feature: 'Trading fee (spot)', bitzx: 'From 0.05% maker', other: 'Often 0.1–0.5%' },
  { feature: 'Markets snapshot',   bitzx: 'Full 24h OHLC + vol', other: 'Varies by app' },
  { feature: 'Charting',           bitzx: 'TradingView-grade', other: 'Basic' },
  { feature: 'Portfolio & P&amp;L', bitzx: 'Unified dashboard', other: 'Split tools' },
  { feature: 'Quick trade',        bitzx: 'Dedicated flow',   other: 'Not always' },
  { feature: 'KYC & withdrawals', bitzx: 'Guided, secure', other: 'Slow / opaque' },
];

/** Landing market table — volume helpers */
function fmtLandingVol(v) {
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n === 0) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}

function fmtLandingPrice(v, base) {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return '—';
  if (base === 'BTC') return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

const num = v => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** Live market intelligence: volume, top movers, breadth — from API tickers */
function useMarketIntel(markets) {
  return useMemo(() => {
    if (!markets?.length) {
      return {
        totalQuoteVol: 0,
        pairCount: 0,
        gainers: [],
        losers: [],
        upCount: 0,
        downCount: 0,
        flatCount: 0,
      };
    }
    const totalQuoteVol = markets.reduce((s, m) => s + num(m.quoteVolume), 0);
    const gainers = [...markets]
      .filter(m => num(m.priceChangePercent) > 0)
      .sort((a, b) => num(b.priceChangePercent) - num(a.priceChangePercent))
      .slice(0, 5);
    const losers = [...markets]
      .filter(m => num(m.priceChangePercent) < 0)
      .sort((a, b) => num(a.priceChangePercent) - num(b.priceChangePercent))
      .slice(0, 5);
    const upCount = markets.filter(m => num(m.priceChangePercent) > 0).length;
    const downCount = markets.filter(m => num(m.priceChangePercent) < 0).length;
    const flatCount = markets.filter(m => num(m.priceChangePercent) === 0).length;
    return {
      totalQuoteVol,
      pairCount: markets.length,
      gainers,
      losers,
      upCount,
      downCount,
      flatCount,
    };
  }, [markets]);
}

function PulsePairRow({ market, rank }) {
  const pct = num(market.priceChangePercent);
  const up = pct >= 0;
  const base = market.base || market.symbol?.replace('USDT', '');
  const icon = COIN_ICONS[base];
  return (
    <Link
      to={`/trade/${market.symbol}`}
      className="group flex items-center gap-3 py-3 px-3 -mx-1 rounded-xl border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04] transition-all"
    >
      <span className="text-[10px] font-mono text-white/30 w-4 tabular-nums">{rank}</span>
      {icon ? (
        <img src={icon} alt="" className="w-8 h-8 rounded-full ring-1 ring-white/10 flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-[10px] font-bold text-gold-light flex-shrink-0">{base?.slice(0, 2)}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white truncate">{base}<span className="text-zinc-500 font-normal">/USDT</span></p>
        <p className="text-[12px] font-mono text-zinc-500">${fmtLandingPrice(market.price, base)}</p>
      </div>
      <span className={`text-[15px] font-semibold tabular-nums flex-shrink-0 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
        {up ? '+' : ''}{pct.toFixed(2)}%
      </span>
      <ChevronRight size={14} className="text-white/20 group-hover:text-gold-light/70 flex-shrink-0" />
    </Link>
  );
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ end, duration = 2 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const numEnd = parseFloat(end.replace(/[^0-9.]/g, ''));
    let start = 0;
    const step = numEnd / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= numEnd) { setCount(numEnd); clearInterval(timer); }
      else setCount(start);
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, end, duration]);
  const display = end.includes('B') ? `$${count.toFixed(2)}B`
    : end.includes('M') ? `${count.toFixed(2)}M+`
    : end.includes('%') ? `${count.toFixed(2)}%`
    : `${Math.round(count)}+`;
  return <span ref={ref}>{display}</span>;
}

// ── Tilt card (3-D hover effect) ──────────────────────────────────────────────
function TiltCard({ children, className, style }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-60, 60], [6, -6]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-60, 60], [-6, 6]), { stiffness: 200, damping: 20 });

  const handleMouse = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top  - rect.height / 2);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      style={{ rotateX, rotateY, transformPerspective: 1000, ...style }}
      className={className}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
    >
      {children}
    </motion.div>
  );
}

/** Hero background — Earth in space (stars / light). Override with VITE_HERO_VIDEO_URL. */
function heroVideoSources() {
  const env = import.meta.env.VITE_HERO_VIDEO_URL;
  const list = [];
  if (env) list.push(env);
  // Full HD when CDN allows — Earth & sunlight / orbit (Pexels, pexels.com/license)
  list.push('https://videos.pexels.com/video-files/10415311/10415311-hd_1920_1080_24fps.mp4');
  // Bundled HD (720p): Mixkit "3D rendering of planet earth rotating in space" — works offline / same clip
  list.push('/hero-bg.mp4');
  list.push('https://assets.mixkit.co/videos/34314/34314-720.mp4');
  return list;
}

function HeroVideoBackground() {
  const videoRef = useRef(null);
  const [srcIndex, setSrcIndex] = useState(0);
  const [allowMotion, setAllowMotion] = useState(true);
  const sources = useMemo(() => heroVideoSources(), []);
  const activeSrc = sources[srcIndex] ?? '';

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setAllowMotion(!mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !allowMotion || !activeSrc) return;
    const tryPlay = () => {
      el.play().catch(() => {});
    };
    el.addEventListener('loadeddata', tryPlay);
    tryPlay();
    return () => el.removeEventListener('loadeddata', tryPlay);
  }, [activeSrc, allowMotion]);

  const onVideoError = () => {
    if (srcIndex < sources.length - 1) setSrcIndex(i => i + 1);
  };

  if (!allowMotion) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden bg-[#030405]"
      aria-hidden
    >
      <video
        key={activeSrc}
        ref={videoRef}
        className="absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 scale-[1.12] object-cover opacity-95"
        style={{
          width: '100vw',
          height: '56.25vw',
          minHeight: '100vh',
          minWidth: '177.77vh',
          filter: 'brightness(0.52) contrast(1.08) saturate(1.05)',
        }}
        src={activeSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onError={onVideoError}
      />
    </div>
  );
}

// ── Market row (CoinSwitch-style dense table: OHLC + volumes) ────────────────
function MarketRow({ market, i }) {
  const pct = parseFloat(market.priceChangePercent ?? 0);
  const isUp = pct >= 0;
  const base = market.base || market.symbol?.replace('USDT', '');
  const icon = COIN_ICONS[base];
  const price = market.price;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }} transition={{ delay: Math.min(i * 0.04, 0.4) }}
      className="border-b border-white/[0.06] hover:bg-white/[0.04] group transition-colors"
    >
      <td className="sticky left-0 z-[1] bg-[#0c0e12] px-3 sm:px-5 py-4 sm:py-4 border-r border-white/[0.04] group-hover:bg-white/[0.04]">
        <div className="flex items-center gap-3 min-w-[140px] sm:min-w-[180px]">
          {icon ? (
            <img src={icon} alt={base} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0 ring-1 ring-white/10" />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold-light text-xs font-bold flex-shrink-0">
              {base?.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-semibold text-[15px] sm:text-base">{base}</span>
              <span className="text-zinc-500 text-xs sm:text-sm font-normal">/ USDT</span>
              {base === 'BZX' && (
                <span className="text-[10px] bg-gold/15 text-gold-light px-1.5 py-0.5 rounded font-bold border border-gold/25">BITZX</span>
              )}
            </div>
            <p className="text-[10px] text-white/35 font-medium mt-0.5 hidden sm:block">Spot</p>
          </div>
        </div>
      </td>
      <td className="px-3 sm:px-4 py-4 font-mono font-semibold text-white text-sm sm:text-base whitespace-nowrap tabular-nums">
        ${fmtLandingPrice(price, base)}
      </td>
      <td className="px-3 sm:px-4 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1 font-semibold text-[15px] sm:text-base tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {isUp ? <TrendingUp size={14} className="flex-shrink-0 opacity-90" /> : <TrendingDown size={14} className="flex-shrink-0 opacity-90" />}
          {isUp ? '+' : ''}{pct.toFixed(2)}%
        </span>
      </td>
      <td className="hidden md:table-cell px-3 sm:px-4 py-4 font-mono text-sm text-white/90 tabular-nums whitespace-nowrap">
        ${fmtLandingPrice(market.highPrice, base)}
      </td>
      <td className="hidden md:table-cell px-3 sm:px-4 py-4 font-mono text-sm text-white/90 tabular-nums whitespace-nowrap">
        ${fmtLandingPrice(market.lowPrice, base)}
      </td>
      <td className="hidden lg:table-cell px-3 sm:px-4 py-4 font-mono text-sm text-white/80 tabular-nums whitespace-nowrap">
        {fmtLandingVol(market.volume)} <span className="text-white/35 text-xs ml-1">{base}</span>
      </td>
      <td className="px-3 sm:px-4 py-4 font-mono text-sm text-white/90 tabular-nums whitespace-nowrap">
        ${fmtLandingVol(market.quoteVolume)}
      </td>
      <td className="sticky right-0 z-[1] bg-[#0c0e12] px-3 sm:px-5 py-4 text-right border-l border-white/[0.04] group-hover:bg-white/[0.04]">
        <Link
          to={`/trade/${market.symbol}`}
          className="inline-flex items-center gap-1.5 text-[13px] sm:text-sm font-medium text-gold-light bg-gold/10 hover:bg-gold/20 border border-gold/25 hover:border-gold/40 px-3 sm:px-4 py-2 rounded-lg transition-colors"
        >
          Trade <ArrowRight size={14} />
        </Link>
      </td>
    </motion.tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [markets, setMarkets] = useState([]);
  const [liveMarketFilter, setLiveMarketFilter] = useState('all');

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
            setMarkets(normalizeMarketsList(j.markets));
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

  const marketIntel = useMarketIntel(markets);

  const filteredLandingMarkets = useMemo(() => {
    if (!markets.length) return [];
    if (liveMarketFilter === 'gainers') {
      return [...markets]
        .filter(m => num(m.priceChangePercent) > 0)
        .sort((a, b) => num(b.priceChangePercent) - num(a.priceChangePercent));
    }
    if (liveMarketFilter === 'losers') {
      return [...markets]
        .filter(m => num(m.priceChangePercent) < 0)
        .sort((a, b) => num(a.priceChangePercent) - num(b.priceChangePercent));
    }
    if (liveMarketFilter === 'volume') {
      return [...markets].sort((a, b) => num(b.quoteVolume) - num(a.quoteVolume));
    }
    return markets;
  }, [markets, liveMarketFilter]);

  const heroStatCards = useMemo(() => {
    const volDisplay =
      marketIntel.totalQuoteVol > 0
        ? `$${fmtLandingVol(marketIntel.totalQuoteVol)}`
        : '—';
    const breadth =
      marketIntel.pairCount > 0
        ? `${marketIntel.upCount} ↑ · ${marketIntel.downCount} ↓`
        : '—';
    return [
      { label: '24h volume (USDT)', value: volDisplay, sub: 'Quote volume, all pairs', icon: Activity, color: '#EBD38D' },
      { label: 'Spot pairs live', value: String(marketIntel.pairCount || '—'), sub: 'USDT markets', icon: BarChart2, color: '#60a5fa' },
      { label: '24h breadth', value: breadth, sub: 'Gainers vs losers', icon: TrendingUp, color: '#22c55e' },
      { label: 'Users (est.)', value: '2.55M+', sub: 'Registered globally', icon: Users, color: '#a78bfa' },
    ];
  }, [marketIntel]);

  return (
    <div className="overflow-x-hidden" style={{ background: 'transparent' }}>

      {/* ══════════════════════════════════════════════════════════════════
          HERO
          ══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[100svh] flex flex-col overflow-hidden">

        <div className="absolute inset-0 z-0 bg-[#030405]" />
        <HeroVideoBackground />
        <div
          className="pointer-events-none absolute inset-0 z-[2] opacity-90"
          style={{ background: 'radial-gradient(ellipse 100% 70% at 50% -15%, rgba(156,121,65,0.12), transparent 52%)' }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-[2] opacity-70"
          style={{ background: 'radial-gradient(ellipse 50% 45% at 95% 25%, rgba(59,130,246,0.06), transparent 50%)' }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-[2] opacity-50"
          style={{ background: 'radial-gradient(ellipse 40% 35% at 5% 60%, rgba(168,85,247,0.05), transparent 55%)' }}
        />
        <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-transparent via-transparent to-[#0a0b0d]" />
        <div
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-[#030405]/95 via-[#030405]/45 to-transparent sm:max-w-[75%]"
          aria-hidden
        />

        <div className="pointer-events-none absolute inset-0 z-[2]">
          <div
            className="absolute inset-0 opacity-[0.028]"
            style={{
              backgroundImage: 'linear-gradient(rgba(156,121,65,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(156,121,65,0.9) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_35%,rgba(8,9,12,0.94)_100%)]" />
        </div>

        <div className="relative z-[3] flex-1 flex flex-col justify-center">
          <div className="bitzx-landing-container py-14 sm:py-16 md:py-20 lg:py-24">
            <div className="max-w-3xl xl:max-w-4xl">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 mb-7 sm:mb-8 backdrop-blur-md"
                >
                  <Sparkles size={14} className="text-gold-light shrink-0" />
                  <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
                    Spot · USDT · Pro charts
                  </span>
                  <span className="hidden sm:inline w-px h-3.5 bg-white/15" />
                  <span className="hidden sm:inline text-[11px] font-medium text-emerald-400/95 tracking-wide">Live matching engine</span>
                </motion.div>

                <div className="mb-6 sm:mb-8 space-y-4">
                  <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className="bitzx-display [text-shadow:0_4px_48px_rgba(0,0,0,0.85)]"
                  >
                    Buy &amp; sell crypto on one exchange
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.12 }}
                    className="text-lg sm:text-xl md:text-2xl font-semibold text-gradient leading-snug tracking-tight max-w-[22ch]"
                  >
                    Spot markets, depth &amp; full 24h stats
                  </motion.p>
                </div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="bitzx-lead mb-9 sm:mb-10"
                >
                  Trade USDT pairs with live order books, full 24h OHLC, volumes in base &amp; quote, TradingView charts,
                  portfolio P&amp;L, and bank-grade security — everything you need in a single professional terminal.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-3.5 mb-11 sm:mb-12"
                >
                  <Link
                    to="/register"
                    className="bitzx-hover-scale group inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-light px-8 py-3.5 text-[15px] font-semibold text-surface-dark shadow-xl shadow-gold/20"
                  >
                    Create account
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    to="/quick-trade"
                    className="bitzx-hover-border bitzx-hover-glow inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-8 py-3.5 text-[15px] font-medium text-white"
                  >
                    <Zap size={18} className="text-gold-light" />
                    Quick trade
                  </Link>
                  <Link to="/markets" className="group bitzx-footer-link inline-flex items-center justify-center gap-1.5 py-3.5 text-[15px] font-medium text-gold-light/95">
                    Browse markets <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
                >
                  {[
                    { k: 'Maker fee', v: '0.05%', icon: BarChart2 },
                    { k: 'Taker fee', v: '0.10%', icon: Activity },
                    { k: 'Cold storage', v: 'Majority', icon: Shield },
                    { k: 'Uptime', v: '99.98%', icon: Award },
                  ].map(({ k, v, icon: Icon }, i) => (
                    <div
                      key={k}
                      className="bitzx-hover-lift bitzx-hover-border rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 sm:py-4"
                    >
                      <Icon size={15} className="text-gold-light/85 mb-2.5" />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{k}</p>
                      <p className="text-[15px] sm:text-base font-semibold text-white mt-1 tabular-nums">{v}</p>
                    </div>
                  ))}
                </motion.div>
            </div>
          </div>
        </div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
          className="relative z-[3] flex flex-col items-center gap-2 text-white/50 pb-8 pt-2"
        >
          <span className="text-xs font-semibold uppercase tracking-widest">Explore</span>
          <div className="w-px h-7 bg-gradient-to-b from-white/40 to-transparent rounded-full" />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PRODUCT STRIP — CoinSwitch-style quick access (Spot · Markets · Portfolio)
          ══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative z-[3] border-y border-white/[0.06]"
        style={{ background: 'linear-gradient(180deg, rgba(10,11,14,0.98) 0%, rgba(8,9,12,1) 100%)' }}
      >
        <div className="bitzx-landing-container py-8 md:py-10">
          <p className="text-center bitzx-eyebrow bitzx-muted mb-6 tracking-[0.22em]">
            One platform — spot trading, markets &amp; portfolio
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {[
              { to: '/trade/BZXUSDT', label: 'Spot trade', sub: 'Limit · Market · Charts', icon: BarChart2 },
              { to: '/markets', label: 'Markets', sub: 'All pairs · 24h data', icon: Globe },
              { to: '/dashboard', label: 'Portfolio', sub: 'P&L · Balances', icon: LayoutDashboard },
              { to: '/portfolio', label: 'Analytics', sub: 'Fills · Performance', icon: LineChart },
              { to: '/wallet', label: 'Wallet', sub: 'Deposit · Withdraw', icon: Wallet },
            ].map(({ to, label, sub, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group bitzx-hover-border flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 sm:px-6 sm:py-4 min-w-[148px] sm:min-w-[168px] transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 border border-gold/20 text-gold-light flex-shrink-0">
                  <Icon size={19} />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[15px] font-semibold text-white leading-snug">{label}</p>
                  <p className="text-[11px] sm:text-xs text-zinc-500 font-normal mt-1 line-clamp-2 leading-relaxed">{sub}</p>
                </div>
                <ChevronRight size={16} className="text-white/25 group-hover:text-gold-light/80 flex-shrink-0 hidden sm:block" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          MARKET PULSE — live gainers / losers (API)
          ══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative z-[2] border-b border-white/[0.06] overflow-x-hidden"
        style={{ background: 'linear-gradient(165deg, rgba(8,9,12,1) 0%, rgba(12,14,20,0.98) 45%, rgba(10,11,15,1) 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(235,211,141,0.08),transparent_55%)]" />
        <div className="relative bitzx-landing-container bitzx-section-y-tight">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-10 mb-10 md:mb-12"
          >
            <div className="max-w-xl">
              <p className="bitzx-eyebrow mb-3">Live snapshot</p>
              <h2 className="bitzx-title-lg mb-3">Market pulse</h2>
              <p className="bitzx-lead text-zinc-500 max-w-none">
                Top movers by 24h change — tap a pair to open the terminal. Totals aggregate every listed USDT market.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-3.5">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 min-w-[148px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">24h quote volume</p>
                <p className="text-xl font-semibold text-white tabular-nums mt-1.5 tracking-tight">
                  {marketIntel.totalQuoteVol > 0 ? `$${fmtLandingVol(marketIntel.totalQuoteVol)}` : '—'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 min-w-[124px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Pairs</p>
                <p className="text-xl font-semibold text-white tabular-nums mt-1.5 tracking-tight">{marketIntel.pairCount || '—'}</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] px-5 py-4 min-w-[104px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400/90">Up 24h</p>
                <p className="text-xl font-semibold text-emerald-300 tabular-nums mt-1.5 tracking-tight">{marketIntel.pairCount ? marketIntel.upCount : '—'}</p>
              </div>
              <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.06] px-5 py-4 min-w-[104px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-400/90">Down 24h</p>
                <p className="text-xl font-semibold text-red-300 tabular-nums mt-1.5 tracking-tight">{marketIntel.pairCount ? marketIntel.downCount : '—'}</p>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-[#0c0d12] to-[#0a0b0f] p-1 shadow-[0_0_0_1px_rgba(16,185,129,0.06)]"
            >
              <div className="rounded-[22px] bg-[#0a0b0f]/90 backdrop-blur-sm border border-white/[0.06] p-5 sm:p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/25">
                    <Flame className="text-emerald-400" size={22} />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-semibold text-white tracking-tight">Hot gainers</h3>
                    <p className="text-[13px] text-zinc-500 font-normal mt-0.5">Highest 24h % change</p>
                  </div>
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {markets.length === 0 ? (
                    <p className="text-sm text-white/45 py-8 text-center">Loading tickers…</p>
                  ) : marketIntel.gainers.length === 0 ? (
                    <p className="text-sm text-white/45 py-8 text-center">No advancers in this snapshot.</p>
                  ) : (
                    marketIntel.gainers.map((m, idx) => <PulsePairRow key={m.symbol} market={m} rank={idx + 1} />)
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-950/35 via-[#0c0d12] to-[#0a0b0f] p-1 shadow-[0_0_0_1px_rgba(239,68,68,0.06)]"
            >
              <div className="rounded-[22px] bg-[#0a0b0f]/90 backdrop-blur-sm border border-white/[0.06] p-5 sm:p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/15 border border-red-400/25">
                    <Snowflake className="text-red-400" size={22} />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-semibold text-white tracking-tight">24h losers</h3>
                    <p className="text-[13px] text-zinc-500 font-normal mt-0.5">Largest negative 24h %</p>
                  </div>
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {markets.length === 0 ? (
                    <p className="text-sm text-white/45 py-8 text-center">Loading tickers…</p>
                  ) : marketIntel.losers.length === 0 ? (
                    <p className="text-sm text-white/45 py-8 text-center">No decliners in this snapshot.</p>
                  ) : (
                    marketIntel.losers.map((m, idx) => <PulsePairRow key={m.symbol} market={m} rank={idx + 1} />)
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          STATS (live + brand)
          ══════════════════════════════════════════════════════════════════ */}
      <section className="border-y border-surface-border"
        style={{ background: 'linear-gradient(135deg, rgba(10,11,15,0.96), rgba(13,15,20,0.98))' }}>
        <div className="bitzx-landing-container bitzx-section-y grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8 lg:gap-10">
          {heroStatCards.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <TiltCard className="bitzx-hover-glow flex flex-col items-center text-center p-7 sm:p-8 rounded-2xl cursor-default min-h-[200px] justify-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <motion.div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}
                  whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }}
                  transition={{ duration: 0.5 }}>
                  <s.icon size={24} style={{ color: s.color }} />
                </motion.div>
                <p className="text-2xl sm:text-3xl lg:text-[2rem] font-semibold text-white mb-2 tabular-nums tracking-tight">
                  {s.label === 'Users (est.)' ? <AnimatedCounter end="2.55M+" /> : s.value}
                </p>
                <p className="text-[15px] text-white font-medium leading-snug">{s.label}</p>
                {s.sub && <p className="text-[12px] text-zinc-500 font-normal mt-2 max-w-[13rem] mx-auto leading-relaxed">{s.sub}</p>}
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PLATFORM PREVIEW STRIP
          ══════════════════════════════════════════════════════════════════ */}
      <section className="relative bitzx-section-y overflow-hidden" style={{ background: 'rgba(10,11,15,0.97)' }}>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_50%,rgba(96,165,250,0.04),transparent_65%)]" />
        <div className="bitzx-landing-container">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12 md:mb-16 max-w-3xl mx-auto">
            <p className="bitzx-eyebrow mb-4">Pro platform</p>
            <h2 className="bitzx-title-lg mb-5">Spot · Charts · Portfolio in one place</h2>
            <p className="bitzx-lead-wide mx-auto text-zinc-400">
              Same workflow as leading pro apps: pick a market, read full 24h stats, trade with depth, track P&amp;L — without switching tools.
            </p>
          </motion.div>

          {/* Feature highlights — icon + text horizontal list */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 mb-12 md:mb-20">
            {[
              { icon: Cpu,       color: '#EBD38D', title: 'Matching Engine',   stat: '< 1ms latency'    },
              { icon: BarChart2, color: '#60a5fa', title: 'TradingView Charts', stat: '100+ indicators' },
              { icon: Eye,       color: '#22c55e', title: 'Live P&L Tracking', stat: 'Real-time updates' },
              { icon: Zap,       color: '#f97316', title: 'Quick Trade',        stat: '1-click orders'  },
            ].map((item, i) => (
              <motion.div key={item.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -3, scale: 1.008 }}
                transition={{ type: 'tween', duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="bitzx-hover-glow flex items-start gap-4 p-6 rounded-2xl cursor-default"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${item.color}20` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                  <item.icon size={20} style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-white font-semibold text-[15px] leading-snug">{item.title}</p>
                  <p className="text-[13px] font-medium mt-1.5 opacity-90" style={{ color: item.color }}>{item.stat}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Coin showcase row */}
          <div className="flex flex-wrap justify-center gap-4">
            {PAIRS.map((pair, i) => {
              const icon = COIN_ICONS[pair.base];
              return (
                <motion.div key={pair.symbol}
                  initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4, scale: 1.04 }}
                  transition={{ type: 'tween', duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link to={`/trade/${pair.symbol}`}
                    className="bitzx-hover-border flex flex-col items-center gap-2 p-4 rounded-2xl w-20"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {icon
                      ? <img src={icon} alt={pair.base} className="w-10 h-10 rounded-full" />
                      : <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center font-bold text-gold-light text-sm">{pair.base[0]}</div>
                    }
                    <span className="text-xs font-bold text-white">{pair.base}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          LIVE MARKETS — CoinSwitch-style snapshot (pair · last · 24h · OHLC · vol)
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bitzx-landing-container pb-20 md:pb-28 pt-4 md:pt-6" style={{ background: 'rgba(10,11,15,0.97)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="flex flex-wrap items-end justify-between gap-6 mb-8 md:mb-10">
          <div className="max-w-2xl">
            <p className="bitzx-eyebrow mb-3">Markets</p>
            <h2 className="bitzx-title-lg mb-3">Live USDT pairs</h2>
            <p className="bitzx-lead text-zinc-500 max-w-none">
              Last price, 24h change, high / low, volume in coin and in USDT — same fields you expect on a pro markets screen.
            </p>
          </div>
          <motion.div whileHover={{ x: 3 }} transition={{ type: 'tween', duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
            <Link to="/markets" className="flex items-center gap-2 text-gold-light text-[15px] font-medium">
              Full markets <ArrowRight size={16} />
            </Link>
          </motion.div>
        </motion.div>

        <div className="flex flex-wrap gap-2.5 mb-5">
          {[
            { id: 'all', label: 'All' },
            { id: 'gainers', label: '24h Gainers' },
            { id: 'losers', label: '24h Losers' },
            { id: 'volume', label: 'By volume' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setLiveMarketFilter(id)}
              className={`rounded-full px-5 py-2.5 text-[13px] sm:text-sm font-medium transition-colors ${
                liveMarketFilter === id
                  ? 'bg-gold text-surface-dark shadow-md shadow-gold/10'
                  : 'bg-white/[0.05] text-zinc-300 border border-white/10 hover:border-gold/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* No touch-pan-x: it locks touch to horizontal-only and blocks vertical page scroll on mobile. */}
        <div
          className="bitzx-hover-lift bitzx-hover-border rounded-2xl overflow-x-auto overscroll-x-contain touch-manipulation [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <table className="w-full text-left" style={{ minWidth: 920 }}>
            <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <tr className="text-[11px] sm:text-xs text-zinc-400 uppercase tracking-[0.14em] font-semibold">
                <th className="sticky left-0 z-[2] bg-[#0a0b0f] px-4 sm:px-5 py-4 border-r border-white/[0.06]">Pair</th>
                <th className="px-3 sm:px-4 py-4 whitespace-nowrap">Last (USDT)</th>
                <th className="px-3 sm:px-4 py-4 whitespace-nowrap">24h Change</th>
                <th className="hidden md:table-cell px-3 sm:px-4 py-4 whitespace-nowrap">24h High</th>
                <th className="hidden md:table-cell px-3 sm:px-4 py-4 whitespace-nowrap">24h Low</th>
                <th className="hidden lg:table-cell px-3 sm:px-4 py-4 whitespace-nowrap">24h Vol (base)</th>
                <th className="px-3 sm:px-4 py-4 whitespace-nowrap">24h Vol (USDT)</th>
                <th className="sticky right-0 z-[2] bg-[#0a0b0f] px-3 sm:px-5 py-3 sm:py-4 text-right border-l border-white/[0.06] w-[100px] sm:w-auto"> </th>
              </tr>
            </thead>
            <tbody>
              {markets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-white/50">
                    <RefreshCw size={28} className="animate-spin text-gold-light mx-auto mb-2" />
                    Loading markets…
                  </td>
                </tr>
              ) : filteredLandingMarkets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-white/50 text-sm">
                    No pairs match this filter.
                  </td>
                </tr>
              ) : (
                filteredLandingMarkets.map((m, i) => <MarketRow key={m.symbol} market={m} i={i} />)
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FEATURES
          ══════════════════════════════════════════════════════════════════ */}
      <section className="bitzx-section-y border-y border-surface-border"
        style={{ background: 'rgba(10,11,15,0.97)' }}>
        <div className="bitzx-landing-container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12 md:mb-16 max-w-2xl mx-auto">
            <p className="bitzx-eyebrow mb-4">Why BITZX</p>
            <h2 className="bitzx-title-lg mb-5">Built for serious traders</h2>
            <p className="bitzx-lead-wide mx-auto text-zinc-400">
              Everything you need to trade with confidence — from beginner to professional.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -4, scale: 1.012 }}
                transition={{ type: 'tween', duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="group bitzx-hover-glow glass rounded-2xl p-8 sm:p-9 cursor-default"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <motion.div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}
                  whileHover={{ rotate: [0, -5, 5, 0], scale: 1.06 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                  <f.icon size={24} style={{ color: f.color }} />
                </motion.div>
                <h3 className="text-white font-semibold text-[17px] sm:text-lg mb-3 leading-snug group-hover:text-gradient transition-all">
                  {f.title}
                </h3>
                <p className="text-zinc-400 text-[15px] leading-[1.65]">{f.desc}</p>

                {/* Animated bottom line on hover */}
                <motion.div className="h-0.5 mt-6 rounded-full" initial={{ width: 0 }}
                  whileHover={{ width: '100%' }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  style={{ background: `linear-gradient(90deg, ${f.color}, transparent)` }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bitzx-landing-container bitzx-section-y" style={{ background: 'rgba(10,11,15,0.97)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-12 md:mb-16 max-w-2xl mx-auto">
          <p className="bitzx-eyebrow mb-4">Get started</p>
          <h2 className="bitzx-title-lg">Start in three simple steps</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-10 md:gap-12 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-14 left-[calc(16%+48px)] right-[calc(16%+48px)] h-px"
            style={{ background: 'linear-gradient(90deg, rgba(156,121,65,0.3), rgba(235,211,141,0.5), rgba(156,121,65,0.3))' }} />

          {HOW_STEPS.map((s, i) => (
            <motion.div key={s.n}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              whileHover={{ y: -3 }}
              transition={{ type: 'tween', duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="relative text-center cursor-default"
            >
              <motion.div className="w-24 h-24 rounded-3xl flex flex-col items-center justify-center mx-auto mb-8"
                style={{ background: 'linear-gradient(135deg, rgba(156,121,65,0.15), rgba(235,211,141,0.08))', border: '1px solid rgba(156,121,65,0.3)' }}
                whileHover={{ scale: 1.045, rotate: [0, -3, 3, 0] }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                <span className="text-3xl font-extrabold text-gold leading-none">{s.n}</span>
              </motion.div>
              <h3 className="text-white font-semibold text-xl mb-3 tracking-tight">{s.title}</h3>
              <p className="text-zinc-400 text-[15px] leading-[1.65]">{s.desc}</p>

              <motion.div className="mt-8" whileHover={{ scale: 1.03 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <Link to={i === 0 ? '/register' : i === 1 ? '/wallet' : '/trade/BZXUSDT'}
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium text-gold-light hover:text-gold transition-colors">
                  {i === 0 ? 'Sign Up Free' : i === 1 ? 'Go to Wallet' : 'Start Trading'} <ChevronRight size={14} />
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          COMPARISON TABLE
          ══════════════════════════════════════════════════════════════════ */}
      <section className="bitzx-section-y border-y border-surface-border"
        style={{ background: 'rgba(10,11,15,0.97)' }}>
        <div className="bitzx-landing-container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12 md:mb-14 max-w-2xl mx-auto">
            <p className="bitzx-eyebrow mb-4">Why choose BITZX</p>
            <h2 className="bitzx-title-lg">We stack up against anyone</h2>
          </motion.div>

          <div className="max-w-3xl mx-auto rounded-2xl overflow-x-auto touch-manipulation [-webkit-overflow-scrolling:touch]"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ minWidth: 480 }}>
            {/* Header */}
            <div className="grid grid-cols-3"
              style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-4 sm:px-6 py-4 text-xs font-extrabold text-white uppercase tracking-widest">Feature</div>
              <div className="px-4 sm:px-6 py-4 text-center">
                <span className="text-sm font-extrabold text-gold-light flex items-center justify-center gap-2">
                  <img src={LOGO} alt="BITZX" className="w-5 h-5 object-contain" /> BITZX
                </span>
              </div>
              <div className="px-4 sm:px-6 py-4 text-center">
                <span className="text-sm font-bold text-white">Others</span>
              </div>
            </div>
            {/* Rows */}
            {VS_TABLE.map((row, i) => (
              <motion.div key={row.feature}
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="grid grid-cols-3 hover:bg-white/[.025] transition-colors"
                style={{ borderBottom: i < VS_TABLE.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div className="px-4 sm:px-6 py-4 text-xs sm:text-sm font-semibold text-white">{row.feature}</div>
                <div className="px-4 sm:px-6 py-4 flex items-center justify-center gap-1 sm:gap-2">
                  <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-green-400">{row.bitzx}</span>
                </div>
                <div className="px-4 sm:px-6 py-4 flex items-center justify-center gap-1 sm:gap-2">
                  <X size={14} className="text-white flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-white">{row.other}</span>
                </div>
              </motion.div>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          TESTIMONIALS
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full bitzx-landing-container bitzx-section-y" style={{ background: 'rgba(10,11,15,0.97)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-12 md:mb-14 max-w-2xl mx-auto">
          <p className="bitzx-eyebrow mb-4">Community</p>
          <h2 className="bitzx-title-lg mb-4">Loved by traders</h2>
          <p className="bitzx-lead-wide mx-auto text-zinc-400">Join thousands of traders who trust BITZX for their daily trading.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={t.name}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.12 }}
              whileHover={{ y: -4, scale: 1.012 }}
              transition={{ type: 'tween', duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="bitzx-hover-glow rounded-2xl p-8 cursor-default"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(t.rating)].map((_, si) => (
                  <motion.div key={si} initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + si * 0.06 }}>
                    <Star size={16} className="text-gold fill-gold" />
                  </motion.div>
                ))}
              </div>
              <p className="text-zinc-300 text-[15px] leading-[1.7] mb-7">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center font-semibold text-base text-surface-dark"
                  style={{ background: 'linear-gradient(135deg, #9C7941, #EBD38D)' }}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-white font-medium text-[15px]">{t.name}</p>
                  <p className="text-zinc-500 text-[13px] mt-0.5">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CTA BANNER
          ══════════════════════════════════════════════════════════════════ */}
      <section className="bitzx-landing-container pb-24 md:pb-32 pt-4" style={{ background: 'rgba(10,11,15,0.97)' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden px-8 py-14 sm:px-12 sm:py-16 md:py-20 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(156,121,65,0.18), rgba(235,211,141,0.06), rgba(10,11,15,0.98))', border: '1px solid rgba(235,211,141,0.22)' }}>

          {/* Background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(156,121,65,0.35),transparent_65%)] pointer-events-none" />

          {/* Animated orbs */}
          {[['15%','20%','240px'],['75%','60%','180px'],['50%','80%','160px']].map(([l, t, w], i) => (
            <motion.div key={i} className="absolute rounded-full blur-3xl pointer-events-none"
              style={{ left: l, top: t, width: w, height: w, background: 'rgba(156,121,65,0.15)' }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4 + i, repeat: Infinity, delay: i * 1.2 }} />
          ))}

          <div className="relative">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-gold/10 border border-gold/25 text-gold-light text-[13px] font-medium px-5 py-2.5 rounded-full mb-7 tracking-wide">
              <Sparkles size={14} /> Limited time — free demo balance
            </motion.div>

            <h2 className="bitzx-title-lg max-w-[18ch] mx-auto mb-6">
              Ready to start<br />
              <span className="text-gradient">trading?</span>
            </h2>
            <p className="bitzx-lead-wide mx-auto mb-10 sm:mb-12 text-zinc-400 px-2 sm:px-0">
              Join over 2.5M traders on BITZX Exchange. Get a free demo account with $5,000 USDT
              instantly — no deposit required.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 px-2 sm:px-0">
              <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.985 }} transition={{ type: 'tween', duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <Link to="/register"
                  className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-gold to-gold-light
                    text-surface-dark font-semibold px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl text-[15px] sm:text-base gold-glow shadow-xl shadow-gold/25">
                  Create free account <ArrowRight size={20} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.985 }} transition={{ type: 'tween', duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <Link to="/markets"
                  className="flex items-center justify-center gap-2.5 border border-white/15 text-white font-medium
                    px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl text-[15px] sm:text-base hover:bg-white/[.05] hover:border-white/25 transition-all">
                  <BarChart2 size={18} /> Explore markets
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
