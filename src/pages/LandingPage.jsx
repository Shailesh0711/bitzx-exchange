import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight, Shield, Zap, BarChart2, Wallet, Lock,
  TrendingUp, TrendingDown, Globe, Star, ChevronRight,
  Users, Activity, Award, RefreshCw, CheckCircle, X,
  Cpu, Eye, Sparkles,
} from 'lucide-react';
import { marketApi, COIN_ICONS, PAIRS } from '@/services/marketApi';

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

const STATS = [
  { label: '24h Volume',    value: '$3.28B', suffix: '', icon: Activity,  color: '#EBD38D' },
  { label: 'Trading Pairs', value: '100+',   suffix: '', icon: BarChart2, color: '#60a5fa' },
  { label: 'Active Traders',value: '2.55M+', suffix: '', icon: Users,     color: '#22c55e' },
  { label: 'Uptime',        value: '99.98%', suffix: '', icon: Award,     color: '#a78bfa' },
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
  { feature: 'Trading Fee',      bitzx: '0.1%',          other: '0.1–0.5%' },
  { feature: 'KYC Onboarding',   bitzx: '< 5 minutes',   other: '1–3 days'  },
  { feature: 'Charting',         bitzx: 'TradingView Pro', other: 'Basic'   },
  { feature: 'Demo Account',     bitzx: 'Yes — free',    other: 'Limited'   },
  { feature: 'P&L Tracking',     bitzx: 'Real-time',     other: 'Manual'    },
  { feature: 'Quick Trade',      bitzx: 'Dedicated page', other: 'No'       },
];

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

// ── Floating notification card ────────────────────────────────────────────────
function FloatNotification({ text, sub, color, icon: Icon, delay, x, y }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
      transition={{ delay, duration: 4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      className="absolute flex items-center gap-3 px-4 py-3 rounded-2xl select-none pointer-events-none"
      style={{
        left: x, top: y,
        background: 'rgba(13,15,20,0.92)',
        border: `1px solid ${color}30`,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${color}15`,
        zIndex: 20,
        minWidth: 200,
      }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="text-white font-bold text-sm leading-none">{text}</p>
        <p className="text-[10px] mt-1 font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
      </div>
    </motion.div>
  );
}

// ── Animated mock chart ───────────────────────────────────────────────────────
function MockChart() {
  const bars = [42, 58, 51, 72, 63, 88, 70, 84, 68, 95, 78, 90, 75, 100, 82, 95, 88, 100, 85, 98];
  return (
    <div className="flex items-end gap-1 h-24 w-full px-1">
      {bars.map((h, i) => (
        <motion.div key={i}
          className="flex-1 rounded-sm"
          style={{ background: i % 3 === 0 ? 'rgba(239,68,68,0.6)' : 'rgba(34,197,94,0.6)' }}
          initial={{ height: 0 }} animate={{ height: `${h}%` }}
          transition={{ delay: i * 0.03, duration: 0.35, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ── Market row ────────────────────────────────────────────────────────────────
function MarketRow({ market, i }) {
  const pct  = parseFloat(market.priceChangePercent ?? 0);
  const isUp = pct >= 0;
  const base = market.base || market.symbol?.replace('USDT', '');
  const icon = COIN_ICONS[base];
  const p    = parseFloat(market.price ?? 0);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }} transition={{ delay: i * 0.06 }}
      className="border-b border-surface-border/50 hover:bg-white/[.025] group transition-colors"
    >
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          {icon
            ? <motion.img src={icon} alt={base} className="w-10 h-10 rounded-full" whileHover={{ scale: 1.15, rotate: 8 }} transition={{ type: 'spring', stiffness: 300 }} />
            : <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold-light text-sm font-bold">{base?.slice(0, 2)}</div>
          }
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-base">{base}</span>
              <span className="text-[#6B6B78] text-sm">/USDT</span>
              {base === 'BZX' && (
                <motion.span animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}
                  className="text-xs bg-gold/20 text-gold-light px-2 py-0.5 rounded font-bold">
                  BZX
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 font-mono font-bold text-white text-base">
        ${p >= 1000 ? p.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p >= 1 ? p.toFixed(4) : p.toFixed(6)}
      </td>
      <td className="px-6 py-5">
        <motion.span
          className={`inline-flex items-center gap-1.5 font-extrabold text-base px-3 py-1 rounded-lg ${isUp ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}
          animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
        >
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isUp ? '+' : ''}{pct.toFixed(2)}%
        </motion.span>
      </td>
      <td className="px-6 py-5">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
          <Link to={`/trade/${market.symbol}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-gold-light
              bg-gold/10 hover:bg-gold/25 border border-gold/20 hover:border-gold/50
              px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
            Trade <ArrowRight size={14} />
          </Link>
        </motion.div>
      </td>
    </motion.tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    const load = () => marketApi.getMarkets()
      .then(d => setMarkets(d.slice(0, 8)))
      .catch(() => {});
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="overflow-x-hidden" style={{ background: 'transparent' }}>

      {/* ══════════════════════════════════════════════════════════════════
          HERO
          ══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col overflow-hidden">

        {/* Hero section overlays — star canvas is now global (fixed) in App.jsx */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          {/* Vignette so bottom text stays readable */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(8,9,12,0.70) 100%)' }} />
          {/* Very faint grid */}
          <div className="absolute inset-0 opacity-[.025]"
            style={{ backgroundImage: 'linear-gradient(#9C7941 1px,transparent 1px),linear-gradient(90deg,#9C7941 1px,transparent 1px)', backgroundSize: '70px 70px' }} />
        </div>


        {/* ── Main hero content ── */}
        <div className="relative flex-1 flex items-center" style={{ zIndex: 3 }}>
          <div className="w-full px-4 sm:px-10 lg:px-16 2xl:px-24 py-12 sm:py-16 lg:py-24 grid lg:grid-cols-2 gap-10 lg:gap-16 xl:gap-24 items-center">

            {/* LEFT — Text + CTAs */}
            <div>
              {/* Badge */}
              <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-2.5 bg-gold/10 border border-gold/25 text-gold-light text-sm font-bold px-5 py-2.5 rounded-full mb-8">
                  <motion.span className="w-2 h-2 bg-green-400 rounded-full" animate={{ scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                  Live Trading — Open 24/7
                </span>
              </motion.div>

              {/* Headline */}
              <div className="mb-8 overflow-hidden">
                {['Trade Crypto', 'Like a Pro.'].map((line, li) => (
                  <motion.div key={line}
                    initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.1 + li * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <h1 className={`font-extrabold leading-[1.0] ${li === 0 ? 'text-4xl sm:text-5xl md:text-7xl xl:text-8xl text-white' : 'text-4xl sm:text-5xl md:text-7xl xl:text-8xl text-gradient'}`}>
                      {line}
                    </h1>
                  </motion.div>
                ))}
              </div>

              {/* Description */}
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                className="text-base sm:text-xl text-[#C5C6CC] leading-relaxed max-w-xl mb-8 sm:mb-10">
                The next-generation centralized exchange. Real-time TradingView charts, a professional
                matching engine, live P&L tracking, and instant market orders — all in one platform.
              </motion.p>

              {/* CTA buttons */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                className="flex flex-wrap gap-4 mb-12">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/register"
                    className="group flex items-center gap-2.5 bg-gradient-to-r from-gold to-gold-light
                      text-surface-dark font-extrabold px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg
                      gold-glow transition-all shadow-xl shadow-gold/20">
                    Get Started Free
                    <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/quick-trade"
                    className="flex items-center gap-2.5 border-2 border-white/20 text-white
                      hover:border-gold/50 font-semibold px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg transition-all
                      bg-white/[.05] hover:bg-white/[.09]">
                    <Zap size={18} className="text-gold" /> Quick Trade
                  </Link>
                </motion.div>
              </motion.div>

              {/* Trust pills */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="flex flex-wrap gap-3">
                {[
                  { text: '0.1% fees',          color: '#EBD38D' },
                  { text: 'Instant execution',  color: '#22c55e' },
                  { text: 'KYC secured',         color: '#60a5fa' },
                  { text: '24/7 support',        color: '#a78bfa' },
                ].map(({ text, color }) => (
                  <motion.span key={text} whileHover={{ y: -2, scale: 1.05 }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-bold text-[#8A8B90] cursor-default"
                    style={{ background: `${color}0d`, border: `1px solid ${color}25`, color }}>
                    <CheckCircle size={12} /> {text}
                  </motion.span>
                ))}
              </motion.div>
            </div>

            {/* RIGHT — Premium trading card mockup */}
            <motion.div
              initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative hidden lg:block"
            >
              {/* Floating notification cards */}
              <FloatNotification text="+$1,248.30" sub="BTC/USDT · Profit" color="#22c55e" icon={TrendingUp}   delay={0.8} x="0%"   y="8%" />
              <FloatNotification text="Order Filled" sub="0.045 ETH @ $3,241" color="#60a5fa" icon={CheckCircle} delay={1.4} x="58%"  y="0%" />
              <FloatNotification text="KYC Verified" sub="Full access unlocked" color="#EBD38D" icon={Shield}      delay={2.0} x="5%"   y="80%" />

              <TiltCard className="relative z-10">
                <div className="rounded-3xl overflow-hidden shadow-[0_48px_96px_rgba(0,0,0,0.6)]"
                  style={{ border: '1px solid rgba(235,211,141,0.18)', background: '#0d0f14' }}>

                  {/* Terminal title bar */}
                  <div className="flex items-center gap-2 px-5 py-3"
                    style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['#ef4444','#f59e0b','#22c55e'].map(c => (
                      <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                    ))}
                    <span className="ml-3 text-xs text-[#4A4B50] font-mono">BITZX Exchange · BZX/USDT</span>
                    <motion.span className="ml-auto text-xs font-bold text-green-400 flex items-center gap-1"
                      animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      ● LIVE
                    </motion.span>
                  </div>

                  {/* Price header */}
                  <div className="flex items-center justify-between px-6 py-5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                      <img src={LOGO} alt="BZX" className="w-10 h-10 object-contain" />
                      <div>
                        <p className="text-white font-extrabold text-lg leading-none">BZX / USDT</p>
                        <p className="text-[#4A4B50] text-xs mt-1">BITZX Token · Spot</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <motion.p className="text-white font-mono font-extrabold text-2xl leading-none"
                        animate={{ color: ['#ffffff', '#22c55e', '#ffffff'] }}
                        transition={{ duration: 4, repeat: Infinity }}>
                        $0.4523
                      </motion.p>
                      <p className="text-green-400 text-sm font-bold mt-1">▲ +2.33%</p>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <MockChart />
                    {/* Volume bars */}
                    <div className="flex items-end gap-1 h-6 mt-1 opacity-40">
                      {[30,50,40,70,55,80,65,75,60,90,70,85,65,95,80,90,85,95,80,100].map((h, i) => (
                        <motion.div key={i} className="flex-1 rounded-sm bg-gold/60"
                          initial={{ height: 0 }} animate={{ height: `${h}%` }}
                          transition={{ delay: 0.6 + i * 0.03, duration: 0.3 }} />
                      ))}
                    </div>
                  </div>

                  {/* Order book mini */}
                  <div className="grid grid-cols-2 gap-px px-6 py-4"
                    style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p className="text-[10px] text-red-400/70 font-bold uppercase tracking-widest mb-2">Asks</p>
                      {['0.4561','0.4545','0.4532'].map((p, i) => (
                        <motion.div key={p} className="flex justify-between text-xs font-mono mb-1"
                          animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2 + i * 0.5, repeat: Infinity }}>
                          <span className="text-red-400">{p}</span>
                          <span className="text-[#4A4B50]">{(1.2 - i * 0.3).toFixed(2)}</span>
                        </motion.div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] text-green-400/70 font-bold uppercase tracking-widest mb-2 text-right">Bids</p>
                      {['0.4521','0.4510','0.4498'].map((p, i) => (
                        <motion.div key={p} className="flex justify-between text-xs font-mono mb-1"
                          animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.5 + i * 0.5, repeat: Infinity }}>
                          <span className="text-[#4A4B50]">{(0.9 + i * 0.2).toFixed(2)}</span>
                          <span className="text-green-400">{p}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Stat row */}
                  <div className="grid grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {[['24h High','$0.4812','#22c55e'],['24h Low','$0.4156','#ef4444'],['Volume','7.28M','#EBD38D']].map(([l, v, c]) => (
                      <div key={l} className="px-4 py-3" style={{ background: '#0d0f14' }}>
                        <p className="text-[10px] text-[#4A4B50] font-bold uppercase tracking-wider mb-1">{l}</p>
                        <p className="font-mono font-bold text-sm" style={{ color: c }}>{v}</p>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="p-5">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Link to="/trade/BZXUSDT"
                        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl
                          font-extrabold text-base text-surface-dark transition-all"
                        style={{ background: 'linear-gradient(135deg, #9C7941, #EBD38D)', boxShadow: '0 8px 24px rgba(156,121,65,0.4)' }}>
                        <Zap size={18} /> Trade BZX Now
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </TiltCard>

              {/* Glow behind card */}
              <div className="absolute inset-0 -z-10 blur-3xl scale-90 opacity-30"
                style={{ background: 'radial-gradient(ellipse, rgba(156,121,65,0.5), transparent 70%)' }} />
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          className="relative flex flex-col items-center gap-2 text-[#8A8B90] pb-10" style={{ zIndex: 3 }}>
          <span className="text-sm font-semibold">Scroll to explore</span>
          <div className="w-px h-8 bg-gradient-to-b from-[#8A8B90] to-transparent" />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          STATS
          ══════════════════════════════════════════════════════════════════ */}
      <section className="border-y border-surface-border"
        style={{ background: 'linear-gradient(135deg, rgba(10,11,15,0.96), rgba(13,15,20,0.98))' }}>
        <div className="w-full px-4 sm:px-10 lg:px-16 2xl:px-24 py-12 sm:py-16 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
          {STATS.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <TiltCard className="flex flex-col items-center text-center p-6 rounded-2xl cursor-default"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <motion.div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}
                  whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}>
                  <s.icon size={26} style={{ color: s.color }} />
                </motion.div>
                <p className="text-4xl font-extrabold text-white mb-1">
                  <AnimatedCounter end={s.value} />
                </p>
                <p className="text-base text-[#A0A1A8] font-semibold">{s.label}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PLATFORM PREVIEW STRIP
          ══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-16 sm:py-28 overflow-hidden" style={{ background: 'rgba(10,11,15,0.97)' }}>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_50%,rgba(96,165,250,0.04),transparent_65%)]" />
        <div className="w-full px-4 sm:px-10 lg:px-16 2xl:px-24">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-10 sm:mb-14">
            <p className="text-gold text-sm font-extrabold uppercase tracking-widest mb-4">Platform Features</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-5">Everything You Need to Win</h2>
            <p className="text-[#C5C6CC] text-base sm:text-xl max-w-2xl mx-auto leading-relaxed">
              Purpose-built for traders who demand speed, depth, and reliability.
            </p>
          </motion.div>

          {/* Feature highlights — icon + text horizontal list */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-10 sm:mb-16">
            {[
              { icon: Cpu,       color: '#EBD38D', title: 'Matching Engine',   stat: '< 1ms latency'    },
              { icon: BarChart2, color: '#60a5fa', title: 'TradingView Charts', stat: '100+ indicators' },
              { icon: Eye,       color: '#22c55e', title: 'Live P&L Tracking', stat: 'Real-time updates' },
              { icon: Zap,       color: '#f97316', title: 'Quick Trade',        stat: '1-click orders'  },
            ].map((item, i) => (
              <motion.div key={item.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="flex items-start gap-4 p-5 rounded-2xl cursor-default"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${item.color}20` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                  <item.icon size={20} style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-white font-bold text-base">{item.title}</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: item.color }}>{item.stat}</p>
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
                  whileHover={{ y: -8, scale: 1.1 }}
                >
                  <Link to={`/trade/${pair.symbol}`}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl w-20 transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {icon
                      ? <img src={icon} alt={pair.base} className="w-10 h-10 rounded-full" />
                      : <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center font-bold text-gold-light text-sm">{pair.base[0]}</div>
                    }
                    <span className="text-xs font-bold text-[#C0C1C8]">{pair.base}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          LIVE MARKETS
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full px-4 sm:px-10 lg:px-16 2xl:px-24 pb-16 sm:pb-28" style={{ background: 'rgba(10,11,15,0.97)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="flex flex-wrap items-end justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <p className="text-gold text-sm font-extrabold uppercase tracking-widest mb-2">Live Markets</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white">Top Trading Pairs</h2>
          </div>
          <motion.div whileHover={{ x: 4 }}>
            <Link to="/markets" className="flex items-center gap-2 text-gold-light text-sm sm:text-base font-bold">
              View All <ArrowRight size={16} />
            </Link>
          </motion.div>
        </motion.div>

        <div className="rounded-2xl overflow-x-auto"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <table className="w-full" style={{ minWidth: 460 }}>
            <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <tr className="text-xs text-[#8A8B90] uppercase tracking-widest font-extrabold">
                {['Pair', 'Price', '24h Change', ''].map(h => (
                  <th key={h} className="px-4 sm:px-6 py-4 sm:py-5 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {markets.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-16">
                  <RefreshCw size={28} className="animate-spin text-[#4A4B50] mx-auto" />
                </td></tr>
              ) : markets.map((m, i) => <MarketRow key={m.symbol} market={m} i={i} />)}
            </tbody>
          </table>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FEATURES
          ══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-28 border-y border-surface-border"
        style={{ background: 'rgba(10,11,15,0.97)' }}>
        <div className="w-full px-4 sm:px-10 lg:px-16 2xl:px-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16">
            <p className="text-gold text-sm font-extrabold uppercase tracking-widest mb-4">Why BITZX</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-5">Built for Serious Traders</h2>
            <p className="text-[#C5C6CC] max-w-2xl mx-auto text-xl leading-relaxed">
              Everything you need to trade with confidence — from beginner to professional.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group glass rounded-2xl p-8 cursor-default transition-all duration-300"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <motion.div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.15 }}
                  transition={{ duration: 0.5 }}>
                  <f.icon size={26} style={{ color: f.color }} />
                </motion.div>
                <h3 className="text-white font-extrabold text-xl mb-3 group-hover:text-gradient transition-all">
                  {f.title}
                </h3>
                <p className="text-[#C0C1C8] text-base leading-relaxed">{f.desc}</p>

                {/* Animated bottom line on hover */}
                <motion.div className="h-0.5 mt-6 rounded-full" initial={{ width: 0 }}
                  whileHover={{ width: '100%' }} transition={{ duration: 0.3 }}
                  style={{ background: `linear-gradient(90deg, ${f.color}, transparent)` }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS
          ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full px-4 sm:px-10 lg:px-16 2xl:px-24 py-16 sm:py-28" style={{ background: 'rgba(10,11,15,0.97)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-10 sm:mb-16">
          <p className="text-gold text-sm font-extrabold uppercase tracking-widest mb-4">Get Started</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white">Start in 3 Simple Steps</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-14 left-[calc(16%+48px)] right-[calc(16%+48px)] h-px"
            style={{ background: 'linear-gradient(90deg, rgba(156,121,65,0.3), rgba(235,211,141,0.5), rgba(156,121,65,0.3))' }} />

          {HOW_STEPS.map((s, i) => (
            <motion.div key={s.n}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              whileHover={{ y: -6 }}
              className="relative text-center cursor-default"
            >
              <motion.div className="w-24 h-24 rounded-3xl flex flex-col items-center justify-center mx-auto mb-8"
                style={{ background: 'linear-gradient(135deg, rgba(156,121,65,0.15), rgba(235,211,141,0.08))', border: '1px solid rgba(156,121,65,0.3)' }}
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.4 }}>
                <span className="text-3xl font-extrabold text-gold leading-none">{s.n}</span>
              </motion.div>
              <h3 className="text-white font-extrabold text-2xl mb-4">{s.title}</h3>
              <p className="text-[#C0C1C8] text-base leading-relaxed">{s.desc}</p>

              <motion.div className="mt-8" whileHover={{ scale: 1.05 }}>
                <Link to={i === 0 ? '/register' : i === 1 ? '/wallet' : '/trade/BZXUSDT'}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-gold-light hover:text-gold transition-colors">
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
      <section className="py-16 sm:py-28 border-y border-surface-border"
        style={{ background: 'rgba(10,11,15,0.97)' }}>
        <div className="w-full px-4 sm:px-10 lg:px-16 2xl:px-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16">
            <p className="text-gold text-sm font-extrabold uppercase tracking-widest mb-4">Why Choose BITZX</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-5">We Stack Up Against Anyone</h2>
          </motion.div>

          <div className="max-w-3xl mx-auto rounded-2xl overflow-x-auto"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ minWidth: 480 }}>
            {/* Header */}
            <div className="grid grid-cols-3"
              style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-4 sm:px-6 py-4 text-xs font-extrabold text-[#4A4B50] uppercase tracking-widest">Feature</div>
              <div className="px-4 sm:px-6 py-4 text-center">
                <span className="text-sm font-extrabold text-gold-light flex items-center justify-center gap-2">
                  <img src={LOGO} alt="BITZX" className="w-5 h-5 object-contain" /> BITZX
                </span>
              </div>
              <div className="px-4 sm:px-6 py-4 text-center">
                <span className="text-sm font-bold text-[#8A8B90]">Others</span>
              </div>
            </div>
            {/* Rows */}
            {VS_TABLE.map((row, i) => (
              <motion.div key={row.feature}
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="grid grid-cols-3 hover:bg-white/[.025] transition-colors"
                style={{ borderBottom: i < VS_TABLE.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div className="px-4 sm:px-6 py-4 text-xs sm:text-sm font-semibold text-[#C0C1C8]">{row.feature}</div>
                <div className="px-4 sm:px-6 py-4 flex items-center justify-center gap-1 sm:gap-2">
                  <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-green-400">{row.bitzx}</span>
                </div>
                <div className="px-4 sm:px-6 py-4 flex items-center justify-center gap-1 sm:gap-2">
                  <X size={14} className="text-[#4A4B50] flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-[#8A8B90]">{row.other}</span>
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
      <section className="w-full px-4 sm:px-10 lg:px-16 2xl:px-24 py-16 sm:py-28" style={{ background: 'rgba(10,11,15,0.97)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-10 sm:mb-14">
          <p className="text-gold text-sm font-extrabold uppercase tracking-widest mb-4">Community</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-5">Loved by Traders</h2>
          <p className="text-[#C5C6CC] text-xl max-w-xl mx-auto">Join thousands of traders who trust BITZX for their daily trading.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={t.name}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.12 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="rounded-2xl p-7 cursor-default"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {/* Stars */}
              <div className="flex gap-1 mb-5">
                {[...Array(t.rating)].map((_, si) => (
                  <motion.div key={si} initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + si * 0.06 }}>
                    <Star size={16} className="text-gold fill-gold" />
                  </motion.div>
                ))}
              </div>
              <p className="text-[#D5D5D0] text-base leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-lg text-surface-dark"
                  style={{ background: 'linear-gradient(135deg, #9C7941, #EBD38D)' }}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{t.name}</p>
                  <p className="text-[#8A8B90] text-xs mt-0.5">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CTA BANNER
          ══════════════════════════════════════════════════════════════════ */}
      <section className="px-6 sm:px-10 lg:px-16 2xl:px-24 pb-28" style={{ background: 'rgba(10,11,15,0.97)' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden p-16 text-center"
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
              className="inline-flex items-center gap-2 bg-gold/10 border border-gold/25 text-gold-light text-sm font-bold px-5 py-2.5 rounded-full mb-8">
              <Sparkles size={14} /> Limited Time — Free Demo Balance
            </motion.div>

            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
              Ready to Start<br />
              <span className="text-gradient">Trading?</span>
            </h2>
            <p className="text-[#C5C6CC] text-base sm:text-xl mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
              Join over 2.5M traders on BITZX Exchange. Get a free demo account with $5,000 USDT
              instantly — no deposit required.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 px-4 sm:px-0">
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Link to="/register"
                  className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-gold to-gold-light
                    text-surface-dark font-extrabold px-8 sm:px-12 py-4 sm:py-5 rounded-xl text-base sm:text-lg gold-glow shadow-xl shadow-gold/30">
                  Create Free Account <ArrowRight size={20} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Link to="/markets"
                  className="flex items-center justify-center gap-2.5 border border-white/15 text-[#D5D5D0] font-bold
                    px-8 sm:px-12 py-4 sm:py-5 rounded-xl text-base sm:text-lg hover:bg-white/[.05] hover:border-white/25 transition-all">
                  <BarChart2 size={18} /> Explore Markets
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
