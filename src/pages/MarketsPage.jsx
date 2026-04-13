import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Star, TrendingUp, TrendingDown, ArrowRight, RefreshCw, BarChart2,
  Activity, Flame, Snowflake, LayoutGrid, Table2, ChevronRight,
  Layers, Sparkles, Clock,
} from 'lucide-react';
import { marketApi, COIN_ICONS } from '@/services/marketApi';

const fmtP = (v, base) => {
  const n = parseFloat(v);
  if (!n) return '—';
  if (base === 'BTC') return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n >= 1 ? n.toFixed(4) : n.toFixed(6);
};

const fmtVol = v => {
  const n = parseFloat(v);
  if (!n) return '—';
  return n >= 1e9 ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3 ? `${(n / 1e3).toFixed(2)}K`
        : n.toFixed(2);
};

/** Bid–ask spread: absolute + basis points */
const fmtSpread = (bid, ask, base) => {
  const b = parseFloat(bid);
  const a = parseFloat(ask);
  if (!Number.isFinite(b) || !Number.isFinite(a) || a < b) return { abs: '—', bps: '' };
  const abs = a - b;
  const mid = (a + b) / 2;
  const bps = mid > 0 ? (abs / mid) * 10000 : 0;
  const absStr = abs >= 1 ? abs.toFixed(2) : abs >= 0.01 ? abs.toFixed(4) : abs.toExponential(2);
  return { abs: `$${absStr}`, bps: `${bps.toFixed(2)} bps` };
};

const num = v => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** Interpolate background for heatmap: red → neutral → green */
function heatBg(pct, minP, maxP) {
  if (maxP <= minP) return 'rgba(156, 121, 65, 0.22)';
  const t = (pct - minP) / (maxP - minP);
  const r = Math.round(239 + (34 - 239) * t);
  const g = Math.round(68 + (197 - 68) * t);
  const b = Math.round(68 + (94 - 68) * t);
  const a = 0.15 + Math.abs(t - 0.5) * 0.35;
  return `rgba(${r},${g},${b},${a})`;
}

function RangeBar({ low, high, price }) {
  const l = num(low);
  const h = num(high);
  const p = num(price);
  if (h <= l) {
    return <div className="h-1 w-16 rounded-full bg-white/10" />;
  }
  const x = Math.min(100, Math.max(0, ((p - l) / (h - l)) * 100));
  return (
    <div className="h-1.5 w-14 sm:w-20 rounded-full bg-white/10 overflow-hidden relative" title="Price position in 24h range">
      <div
        className="absolute top-0 bottom-0 left-0 rounded-full bg-gradient-to-r from-red-500/70 via-gold/80 to-green-500/70"
        style={{ width: '100%' }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow border border-white/40"
        style={{ left: `calc(${x}% - 3px)` }}
      />
    </div>
  );
}

/** Large-cap USDT pairs (for “Major” tab) */
const MAJOR_BASES = new Set(['BTC', 'ETH', 'BNB', 'SOL', 'XRP']);

const MARKET_MODES = [
  { id: 'spot', label: 'Spot', desc: 'USDT pairs' },
  { id: 'futures', label: 'Futures', desc: 'Coming soon', soon: true },
  { id: 'options', label: 'Options', desc: 'Coming soon', soon: true },
];

const CATEGORY_TABS = [
  { id: 'all', label: 'All markets', short: 'All' },
  { id: 'major', label: 'Major', short: 'Major' },
  { id: 'alt', label: 'Altcoins', short: 'Alts' },
  { id: 'bzx', label: 'BITZX', short: 'BZX' },
  { id: 'favorites', label: 'Watchlist', short: '★', icon: Star },
  { id: 'gainers', label: '24h Gainers', short: '▲' },
  { id: 'losers', label: '24h Losers', short: '▼' },
  { id: 'topVolume', label: 'By volume', short: 'Vol' },
];

export default function MarketsPage() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [marketMode, setMarketMode] = useState('spot');
  const [category, setCategory] = useState('all');
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bitzxex_favs') || '[]'); } catch { return []; }
  });
  const [sortKey, setSortKey] = useState('quoteVolume');
  const [sortDir, setSortDir] = useState(-1);
  /** split = heatmap + table; table = list only; heatmap = map only */
  const [viewMode, setViewMode] = useState('split');
  const timer = useRef(null);

  const load = () =>
    marketApi.getMarkets().then(d => { setMarkets(d); setLoading(false); }).catch(() => setLoading(false));

  useEffect(() => {
    load();
    timer.current = setInterval(load, 5000);
    return () => clearInterval(timer.current);
  }, []);

  const toggleFav = sym => {
    const next = favorites.includes(sym) ? favorites.filter(f => f !== sym) : [...favorites, sym];
    setFavorites(next);
    localStorage.setItem('bitzxex_favs', JSON.stringify(next));
  };

  const handleSort = k => {
    if (sortKey === k) setSortDir(d => -d);
    else {
      setSortKey(k);
      if (k === 'spread') setSortDir(1);
      else setSortDir(k === 'priceChangePercent' || k === 'quoteVolume' || k === 'volume' || k === 'count' ? -1 : 1);
    }
  };

  const { minPct, maxPct, gainers, losers, totalQuoteVol, upCount, downCount } = useMemo(() => {
    const pcts = markets.map(m => num(m.priceChangePercent));
    const minP = pcts.length ? Math.min(...pcts) : 0;
    const maxP = pcts.length ? Math.max(...pcts) : 0;
    const sorted = [...markets].sort((a, b) => num(b.priceChangePercent) - num(a.priceChangePercent));
    const gain = sorted.filter(m => num(m.priceChangePercent) > 0).slice(0, 6);
    const lose = [...markets].sort((a, b) => num(a.priceChangePercent) - num(b.priceChangePercent)).filter(m => num(m.priceChangePercent) < 0).slice(0, 6);
    const tqv = markets.reduce((s, m) => s + num(m.quoteVolume), 0);
    const up = markets.filter(m => num(m.priceChangePercent) > 0).length;
    const down = markets.filter(m => num(m.priceChangePercent) < 0).length;
    return { minPct: minP, maxPct: maxP, gainers: gain, losers: lose, totalQuoteVol: tqv, upCount: up, downCount: down };
  }, [markets]);

  const selectCategory = id => {
    setCategory(id);
    if (id === 'topVolume') {
      setSortKey('quoteVolume');
      setSortDir(-1);
    }
  };

  const filtered = useMemo(() => {
    if (marketMode !== 'spot') return [];
    let list = markets.filter(m => {
      const base = m.base || m.symbol?.replace('USDT', '');
      if (category === 'favorites') return favorites.includes(m.symbol);
      if (category === 'bzx') return base === 'BZX';
      if (category === 'major') return MAJOR_BASES.has(base);
      if (category === 'alt') return !MAJOR_BASES.has(base) && base !== 'BZX';
      if (category === 'gainers') return num(m.priceChangePercent) > 0;
      if (category === 'losers') return num(m.priceChangePercent) < 0;
      return true;
    });
    list = list.filter(m =>
      !search || m.symbol?.toLowerCase().includes(search.toLowerCase()) || m.base?.toLowerCase().includes(search.toLowerCase()),
    );
    if (sortKey === 'spread') {
      list = [...list].sort((a, b) => {
        const sa = num(a.askPrice) - num(a.bidPrice);
        const sb = num(b.askPrice) - num(b.bidPrice);
        return (sa - sb) * sortDir;
      });
    } else {
      list.sort((a, b) => {
        const va = num(a[sortKey] ?? 0);
        const vb = num(b[sortKey] ?? 0);
        return (va - vb) * sortDir;
      });
    }
    return list;
  }, [markets, marketMode, category, favorites, search, sortKey, sortDir]);

  const SortTh = ({ label, field, className = '' }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-2 md:px-3 py-2.5 md:py-3.5 text-left text-[10px] md:text-xs font-semibold text-white uppercase tracking-wide md:tracking-wider cursor-pointer hover:text-gold-light/90 select-none whitespace-nowrap ${className}`}
    >
      {label}{' '}
      {sortKey === field && <span className="text-gold-light">{sortDir > 0 ? '↑' : '↓'}</span>}
    </th>
  );

  return (
    <div className="min-h-screen bg-surface-dark w-full min-w-0 overflow-x-hidden">
      <div className="w-full max-w-[100vw] min-w-0 px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-8 md:py-10 pb-10 sm:pb-14">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <BarChart2 size={22} className="text-gold-light" />
            <span className="text-gold-light text-xs sm:text-sm font-bold uppercase tracking-widest">Live Markets</span>
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-2">Markets</h1>
          <p className="text-sm sm:text-base text-white/80 max-w-3xl">
            Spot markets with last price, 24h OHLC, weighted average, best bid/ask, spread, volumes, and trade count — refreshed every 5s.
          </p>
        </motion.div>

        {/* Market type: Spot | Futures | Options */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6">
          {MARKET_MODES.map(({ id, label, desc, soon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMarketMode(id)}
              className={`bitzx-hover-lift bitzx-hover-border flex items-center gap-2 sm:gap-2.5 rounded-xl border px-3 sm:px-4 py-2.5 sm:py-3 text-left w-full min-w-0 ${
                marketMode === id
                  ? 'border-gold/50 bg-gold/15 text-white ring-1 ring-gold/30'
                  : 'border-surface-border bg-white/[0.03] text-white/80 hover:border-white/20'
              }`}
            >
              <Layers size={17} className={`flex-shrink-0 ${marketMode === id ? 'text-gold-light' : 'text-white/45'}`} />
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-xs sm:text-sm font-extrabold truncate">{label}</span>
                <span className="block text-[9px] sm:text-[10px] text-white/45 font-medium truncate">{desc}</span>
              </span>
              {soon && (
                <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider text-gold-light/90 bg-gold/10 px-1.5 py-0.5 rounded">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>

        {marketMode !== 'spot' && (
          <div
            className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 mb-10 text-center"
          >
            <Sparkles className="mx-auto mb-3 text-gold-light/80" size={28} />
            <p className="text-lg font-extrabold text-white mb-2">
              {marketMode === 'futures' ? 'Futures markets' : 'Options markets'} — not available yet
            </p>
            <p className="text-sm text-white/55 max-w-md mx-auto mb-6">
              We&apos;re building pro-grade derivatives listings. Spot USDT pairs below stay live — switch to Spot to browse full data.
            </p>
            <button
              type="button"
              onClick={() => setMarketMode('spot')}
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-extrabold text-surface-dark"
            >
              Go to Spot markets <ArrowRight size={16} />
            </button>
          </div>
        )}

        {marketMode === 'spot' && (
        <>
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Pairs listed', value: String(markets.length), sub: 'USDT markets', icon: Activity },
            { label: '24h volume (USDT)', value: `$${fmtVol(totalQuoteVol)}`, sub: 'Quote volume', icon: BarChart2 },
            { label: 'Gainers', value: String(upCount), sub: '24h ▲', icon: Flame, accent: 'text-green-400' },
            { label: 'Losers', value: String(downCount), sub: '24h ▼', icon: Snowflake, accent: 'text-red-400' },
          ].map(({ label, value, sub, icon: Icon, accent }) => (
            <div
              key={label}
              className="bitzx-hover-lift bitzx-hover-glow rounded-2xl border border-surface-border px-4 py-4 sm:py-5"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/55">{label}</p>
                  <p className={`text-xl sm:text-2xl font-extrabold mt-1 tabular-nums ${accent || 'text-white'}`}>{loading ? '—' : value}</p>
                  <p className="text-[11px] text-white/45 mt-0.5">{sub}</p>
                </div>
                <Icon size={20} className={accent || 'text-gold-light/80'} />
              </div>
            </div>
          ))}
        </div>

        {/* Gainers / Losers quick lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="bitzx-hover-lift bitzx-hover-border rounded-2xl border border-surface-border overflow-hidden" style={{ background: 'rgba(34,197,94,0.04)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-green-500/10">
              <span className="text-sm font-extrabold text-green-400 flex items-center gap-2">
                <Flame size={16} /> Top gainers (24h)
              </span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {loading ? (
                <div className="py-8 text-center text-white/50 text-sm">Loading…</div>
              ) : gainers.length === 0 ? (
                <div className="py-6 text-center text-white/50 text-sm">No gainers in this window</div>
              ) : (
                gainers.map((m, i) => {
                  const base = m.base || m.symbol?.replace('USDT', '');
                  const pct = num(m.priceChangePercent);
                  const icon = COIN_ICONS[base];
                  return (
                    <button
                      key={m.symbol}
                      type="button"
                      onClick={() => navigate(`/trade/${m.symbol}`)}
                      className="group/row w-full flex items-center gap-3 px-4 py-3 text-left transition-[background,padding,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.055] hover:pl-5"
                    >
                      <span className="text-xs font-mono text-white/40 w-5">{i + 1}</span>
                      {icon ? <img src={icon} alt="" className="w-8 h-8 rounded-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/row:scale-[1.06]" /> : <div className="w-8 h-8 rounded-full bg-gold/20 text-[10px] font-bold flex items-center justify-center text-gold-light">{base?.slice(0, 2)}</div>}
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-white">{base}</span>
                        <span className="text-white/50 text-sm"> /USDT</span>
                      </div>
                      <span className="text-green-400 font-extrabold tabular-nums">+{pct.toFixed(2)}%</span>
                      <ChevronRight size={16} className="text-white/30 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/row:translate-x-0.5" />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="bitzx-hover-lift bitzx-hover-border rounded-2xl border border-surface-border overflow-hidden" style={{ background: 'rgba(239,68,68,0.04)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-red-500/10">
              <span className="text-sm font-extrabold text-red-400 flex items-center gap-2">
                <Snowflake size={16} /> Top losers (24h)
              </span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {loading ? (
                <div className="py-8 text-center text-white/50 text-sm">Loading…</div>
              ) : losers.length === 0 ? (
                <div className="py-6 text-center text-white/50 text-sm">No losers in this window</div>
              ) : (
                losers.map((m, i) => {
                  const base = m.base || m.symbol?.replace('USDT', '');
                  const pct = num(m.priceChangePercent);
                  const icon = COIN_ICONS[base];
                  return (
                    <button
                      key={m.symbol}
                      type="button"
                      onClick={() => navigate(`/trade/${m.symbol}`)}
                      className="group/row w-full flex items-center gap-3 px-4 py-3 text-left transition-[background,padding,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.055] hover:pl-5"
                    >
                      <span className="text-xs font-mono text-white/40 w-5">{i + 1}</span>
                      {icon ? <img src={icon} alt="" className="w-8 h-8 rounded-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/row:scale-[1.06]" /> : <div className="w-8 h-8 rounded-full bg-gold/20 text-[10px] font-bold flex items-center justify-center text-gold-light">{base?.slice(0, 2)}</div>}
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-white">{base}</span>
                        <span className="text-white/50 text-sm"> /USDT</span>
                      </div>
                      <span className="text-red-400 font-extrabold tabular-nums">{pct.toFixed(2)}%</span>
                      <ChevronRight size={16} className="text-white/30 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/row:translate-x-0.5" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 24h performance heatmap */}
        {viewMode !== 'table' && (
          <div className="mb-8">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <LayoutGrid size={18} className="text-gold-light" /> 24h performance heatmap
              </h2>
              <span className="text-[10px] sm:text-xs text-white/45 hidden sm:inline">Darker red = lower % · Green = higher %</span>
            </div>
            <div className="grid grid-cols-2 min-[380px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-2.5">
              {loading ? (
                <div className="col-span-full py-12 text-center text-white/50">Loading heatmap…</div>
              ) : (
                markets.map(m => {
                  const pct = num(m.priceChangePercent);
                  const base = m.base || m.symbol?.replace('USDT', '');
                  const bg = heatBg(pct, minPct, maxPct);
                  return (
                    <Link
                      key={m.symbol}
                      to={`/trade/${m.symbol}`}
                      className="bitzx-hover-lift rounded-xl border border-white/10 p-3 sm:p-3.5 flex flex-col items-center justify-center min-h-[88px] transition-[box-shadow] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_0_0_1px_rgba(235,211,141,0.2),0_12px_40px_rgba(0,0,0,0.35)]"
                      style={{ background: bg }}
                    >
                      <span className="text-sm font-extrabold text-white">{base}</span>
                      <span className={`text-xs font-bold mt-1 ${pct >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Category tabs — horizontal scroll on small screens */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5 sm:mb-6 min-w-0">
          <div className="space-y-2 w-full min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Clock size={12} className="flex-shrink-0" /> Categories
            </p>
            <div className="-mx-3 px-3 sm:mx-0 sm:px-0 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x [scrollbar-width:thin] [scrollbar-color:rgba(156,121,65,0.45)_transparent]">
              <div className="flex flex-nowrap gap-2 pb-1.5 sm:flex-wrap sm:overflow-visible sm:pb-0">
                {CATEGORY_TABS.map(({ id, label, short, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectCategory(id)}
                    className={`bitzx-hover-border inline-flex flex-shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-[11px] sm:text-sm font-bold whitespace-nowrap snap-start ${
                      category === id
                        ? 'bg-gold text-surface-dark'
                        : 'bg-white/[0.05] text-white border border-surface-border hover:border-gold/30'
                    }`}
                  >
                    {Icon && <Icon size={12} className={category === id ? 'text-surface-dark' : 'text-gold-light/80'} />}
                    <span className="min-[400px]:hidden">{short}</span>
                    <span className="hidden min-[400px]:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto lg:min-w-[280px] min-w-0">
            <div
              className="flex items-center gap-2 rounded-xl border border-surface-border px-3 py-2.5 w-full min-w-0"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <Search size={16} className="text-white/60 flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search pair…"
                className="bg-transparent text-sm text-white outline-none flex-1 min-w-0 placeholder:text-white/40"
              />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setViewMode(v => (v === 'split' ? 'table' : v === 'table' ? 'heatmap' : 'split'))}
                className="flex-1 sm:flex-none px-2.5 sm:px-3 py-2.5 rounded-xl border border-surface-border text-white text-[11px] sm:text-xs font-bold hover:bg-white/[0.06] flex items-center justify-center gap-1.5 sm:gap-2 min-w-0"
                title="Switch layout: full · table · heatmap"
              >
                {viewMode === 'split' && <><Table2 size={14} className="flex-shrink-0" /> <span className="truncate">Table</span></>}
                {viewMode === 'table' && <><LayoutGrid size={14} className="flex-shrink-0" /> <span className="truncate">Heatmap</span></>}
                {viewMode === 'heatmap' && <><BarChart2 size={14} className="flex-shrink-0" /> <span className="truncate">Full</span></>}
              </button>
              <button
                type="button"
                onClick={() => { setLoading(true); load(); }}
                className="p-2.5 rounded-xl border border-surface-border text-white hover:bg-white/[0.06] flex-shrink-0"
                aria-label="Refresh markets"
              >
                <RefreshCw size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* Tablet/desktop table — horizontal scroll on narrow widths; sticky pair column from lg */}
        {viewMode !== 'heatmap' && (
          <div className="hidden md:block w-full min-w-0 rounded-2xl border border-surface-border bg-[#0d0f14] overflow-hidden">
            <p className="px-3 py-2 text-[10px] text-white/45 border-b border-white/[0.06] bg-white/[0.02] 2xl:hidden">
              Swipe or scroll horizontally for all columns — pair &amp; trade stay pinned on large screens.
            </p>
            <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:thin] [scrollbar-color:rgba(156,121,65,0.4)_rgba(255,255,255,0.06)]">
              <table className="w-full min-w-[720px] md:min-w-[880px] lg:min-w-[1000px] xl:min-w-[1180px] 2xl:min-w-[1320px] text-left text-xs md:text-sm">
                <thead className="border-b border-surface-border bg-white/[0.02]">
                  <tr>
                    <th className="px-1.5 md:px-2 py-2.5 md:py-3 w-10 lg:sticky lg:left-0 lg:z-[2] lg:bg-[#12141a] lg:backdrop-blur-sm lg:border-r lg:border-white/[0.06]" />
                    <th className="px-2 md:px-3 py-2.5 md:py-3 text-[10px] md:text-xs font-semibold text-white uppercase tracking-wide lg:sticky lg:left-10 lg:z-[2] lg:min-w-[118px] xl:min-w-[138px] lg:bg-[#12141a] lg:backdrop-blur-sm lg:border-r lg:border-white/[0.06]">
                      Pair
                    </th>
                    <SortTh label="Last" field="price" />
                    <SortTh label="24h %" field="priceChangePercent" />
                    <th className="px-1 md:px-2 py-2.5 md:py-3 text-[10px] md:text-xs font-semibold text-white uppercase tracking-wide hidden md:table-cell">Range</th>
                    <SortTh label="High" field="highPrice" className="hidden md:table-cell" />
                    <SortTh label="Low" field="lowPrice" className="hidden md:table-cell" />
                    <SortTh label="Open" field="openPrice" className="hidden xl:table-cell" />
                    <SortTh label="Wtd avg" field="weightedAvgPrice" className="hidden xl:table-cell" />
                    <SortTh label="Bid" field="bidPrice" className="hidden 2xl:table-cell" />
                    <SortTh label="Ask" field="askPrice" className="hidden 2xl:table-cell" />
                    <SortTh label="Spread" field="spread" className="hidden 2xl:table-cell" />
                    <SortTh label="Vol" field="volume" />
                    <SortTh label="Vol USDT" field="quoteVolume" className="hidden md:table-cell" />
                    <SortTh label="Trades" field="count" className="hidden lg:table-cell" />
                    <th className="px-2 md:px-3 py-2.5 md:py-3 text-right text-[10px] md:text-xs font-semibold text-white uppercase tracking-wide lg:sticky lg:right-0 lg:z-[2] lg:bg-[#12141a] lg:backdrop-blur-sm lg:border-l lg:border-white/[0.06]">
                      Trade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={17} className="py-20 text-center">
                        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={17} className="py-16 text-center text-white/60">No pairs match your filters.</td>
                    </tr>
                  ) : (
                    filtered.map((m, i) => {
                      const pct = num(m.priceChangePercent);
                      const isUp = pct >= 0;
                      const base = m.base || m.symbol?.replace('USDT', '');
                      const icon = COIN_ICONS[base];
                      const isFav = favorites.includes(m.symbol);
                      const pc = num(m.priceChange);
                      const chLabel = (() => {
                        if (!Number.isFinite(pc) || Math.abs(pc) < 1e-12) return null;
                        const abs = Math.abs(pc);
                        const s = abs >= 1 ? abs.toFixed(2) : abs.toFixed(6);
                        return `${pc >= 0 ? '+' : '-'} $${s}`;
                      })();
                      const spread = fmtSpread(m.bidPrice, m.askPrice, base);
                      return (
                        <motion.tr
                          key={m.symbol}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.4) }}
                          className="bitzx-hover-table-row border-b border-surface-border/50 group"
                        >
                          <td className="px-1.5 md:px-2 py-3 md:py-3.5 lg:sticky lg:left-0 lg:z-[1] bg-[#12141a] lg:group-hover:bg-white/[0.04] border-r border-transparent lg:border-white/[0.06]">
                            <button type="button" onClick={() => toggleFav(m.symbol)} className="p-0.5 md:p-1" aria-label={isFav ? 'Remove from watchlist' : 'Add to watchlist'}>
                              <Star size={15} className={isFav ? 'text-gold fill-gold' : 'text-white/25 group-hover:text-white/50'} />
                            </button>
                          </td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5 lg:sticky lg:left-10 lg:z-[1] bg-[#12141a] lg:group-hover:bg-white/[0.04] border-r border-transparent lg:border-white/[0.06] min-w-[118px] xl:min-w-[138px]">
                            <div className="flex items-center gap-2 md:gap-3">
                              {icon ? (
                                <img src={icon} alt="" className="w-8 h-8 md:w-9 md:h-9 rounded-full flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gold/20 flex items-center justify-center text-gold-light text-[10px] md:text-xs font-bold flex-shrink-0">{base?.slice(0, 2)}</div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-white font-bold text-xs md:text-sm">{base}</span>
                                  <span className="text-white/50 text-[11px] md:text-sm">/USDT</span>
                                  {base === 'BZX' && (
                                    <span className="text-[9px] bg-gold/20 text-gold-light px-1 py-0.5 rounded font-bold">BZX</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5 text-white font-mono text-xs md:text-sm font-semibold tabular-nums whitespace-nowrap">${fmtP(m.price, base)}</td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5">
                            <div className="flex flex-col gap-0.5 min-w-[4.5rem]">
                              <span className={`font-bold text-xs md:text-sm ${isUp ? 'text-green-400' : 'text-red-400'} flex items-center gap-0.5`}>
                                {isUp ? <TrendingUp size={12} className="md:w-3.5 md:h-3.5 flex-shrink-0" /> : <TrendingDown size={12} className="md:w-3.5 md:h-3.5 flex-shrink-0" />}
                                {isUp ? '+' : ''}{pct.toFixed(2)}%
                              </span>
                              {chLabel && (
                                <span className="text-[9px] md:text-[10px] text-white/45 font-mono leading-tight hidden sm:block">{chLabel} 24h</span>
                              )}
                            </div>
                          </td>
                          <td className="px-1 md:px-2 py-3 md:py-3.5 hidden md:table-cell">
                            <RangeBar low={m.lowPrice} high={m.highPrice} price={m.price} />
                          </td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5 text-white/90 font-mono text-[11px] md:text-sm hidden md:table-cell tabular-nums whitespace-nowrap">${fmtP(m.highPrice, base)}</td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5 text-white/90 font-mono text-[11px] md:text-sm hidden md:table-cell tabular-nums whitespace-nowrap">${fmtP(m.lowPrice, base)}</td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5 text-white/85 font-mono text-[11px] md:text-sm hidden xl:table-cell tabular-nums whitespace-nowrap">${fmtP(m.openPrice, base)}</td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5 text-white/85 font-mono text-[11px] md:text-sm hidden xl:table-cell tabular-nums whitespace-nowrap">${fmtP(m.weightedAvgPrice, base)}</td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5 text-emerald-300/90 font-mono text-[11px] md:text-sm hidden 2xl:table-cell tabular-nums whitespace-nowrap">${fmtP(m.bidPrice, base)}</td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5 text-rose-300/90 font-mono text-[11px] md:text-sm hidden 2xl:table-cell tabular-nums whitespace-nowrap">${fmtP(m.askPrice, base)}</td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5 hidden 2xl:table-cell">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-white/90 font-mono text-[11px] md:text-sm">{spread.abs}</span>
                              {spread.bps && <span className="text-[9px] text-white/40 font-mono">{spread.bps}</span>}
                            </div>
                          </td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5 text-white/90 font-mono text-[11px] md:text-sm tabular-nums whitespace-nowrap">{fmtVol(m.volume)}</td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5 text-white/90 font-mono text-[11px] md:text-sm hidden md:table-cell tabular-nums whitespace-nowrap">${fmtVol(m.quoteVolume)}</td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5 text-white/80 text-[11px] md:text-sm hidden lg:table-cell tabular-nums whitespace-nowrap">
                            {m.count != null ? parseInt(m.count, 10).toLocaleString() : '—'}
                          </td>
                          <td className="px-2 md:px-3 py-3 md:py-3.5 text-right lg:sticky lg:right-0 lg:z-[1] bg-[#12141a] lg:group-hover:bg-white/[0.04] border-l border-transparent lg:border-white/[0.06]">
                            <Link
                              to={`/trade/${m.symbol}`}
                              className="bitzx-hover-scale inline-flex items-center gap-0.5 md:gap-1 bg-gold/10 hover:bg-gold/25 text-gold-light border border-gold/25 text-[10px] md:text-xs font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-lg whitespace-nowrap"
                            >
                              Trade <ArrowRight size={11} className="md:w-3 md:h-3" />
                            </Link>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mobile / narrow — card list (full data, stacked) */}
        {viewMode !== 'heatmap' && (
          <div className="md:hidden space-y-3 w-full min-w-0 max-w-full">
            {loading ? (
              <div className="py-16 flex justify-center">
                <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-white/60 py-12">No pairs match your filters.</p>
            ) : (
              filtered.map(m => {
                const pct = num(m.priceChangePercent);
                const isUp = pct >= 0;
                const base = m.base || m.symbol?.replace('USDT', '');
                const icon = COIN_ICONS[base];
                const isFav = favorites.includes(m.symbol);
                return (
                  <div
                    key={m.symbol}
                    className="bitzx-hover-lift bitzx-hover-glow rounded-2xl border border-surface-border p-3 min-[400px]:p-4 space-y-2.5 min-[400px]:space-y-3 max-w-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button type="button" onClick={() => toggleFav(m.symbol)} className="flex-shrink-0 pt-0.5" aria-label="Watchlist">
                          <Star size={15} className={isFav ? 'text-gold fill-gold' : 'text-white/25'} />
                        </button>
                        {icon ? <img src={icon} alt="" className="w-9 h-9 min-[400px]:w-10 min-[400px]:h-10 rounded-full flex-shrink-0" /> : <div className="w-9 h-9 min-[400px]:w-10 min-[400px]:h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold-light text-xs font-bold flex-shrink-0">{base?.slice(0, 2)}</div>}
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-white text-sm min-[400px]:text-base truncate">{base}/USDT</p>
                          <p className="text-base min-[400px]:text-lg font-mono font-bold text-white break-all leading-tight">${fmtP(m.price, base)}</p>
                        </div>
                      </div>
                      <div className={`text-right font-extrabold text-sm min-[400px]:text-base flex-shrink-0 tabular-nums ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {isUp ? '+' : ''}{pct.toFixed(2)}%
                      </div>
                    </div>
                    <RangeBar low={m.lowPrice} high={m.highPrice} price={m.price} />
                    <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2.5 text-[10px] min-[400px]:text-[11px] sm:text-xs">
                      <div>
                        <p className="text-white/45 uppercase tracking-wider font-bold">24h high</p>
                        <p className="text-white font-mono">${fmtP(m.highPrice, base)}</p>
                      </div>
                      <div>
                        <p className="text-white/45 uppercase tracking-wider font-bold">24h low</p>
                        <p className="text-white font-mono">${fmtP(m.lowPrice, base)}</p>
                      </div>
                      <div>
                        <p className="text-white/45 uppercase tracking-wider font-bold">Open</p>
                        <p className="text-white font-mono">${fmtP(m.openPrice, base)}</p>
                      </div>
                      <div>
                        <p className="text-white/45 uppercase tracking-wider font-bold">Wtd avg</p>
                        <p className="text-white font-mono">${fmtP(m.weightedAvgPrice, base)}</p>
                      </div>
                      <div>
                        <p className="text-white/45 uppercase tracking-wider font-bold">Bid / Ask</p>
                        <p className="text-white font-mono">
                          <span className="text-emerald-400/90">${fmtP(m.bidPrice, base)}</span>
                          <span className="text-white/35"> · </span>
                          <span className="text-rose-400/90">${fmtP(m.askPrice, base)}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-white/45 uppercase tracking-wider font-bold">Spread</p>
                        <p className="text-white font-mono">
                          {(() => {
                            const s = fmtSpread(m.bidPrice, m.askPrice, base);
                            return (
                              <>
                                {s.abs}
                                {s.bps && <span className="block text-[10px] text-white/40">{s.bps}</span>}
                              </>
                            );
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/45 uppercase tracking-wider font-bold">Vol (USDT)</p>
                        <p className="text-white font-mono">${fmtVol(m.quoteVolume)}</p>
                      </div>
                      <div>
                        <p className="text-white/45 uppercase tracking-wider font-bold">Vol (base)</p>
                        <p className="text-white font-mono">{fmtVol(m.volume)}</p>
                      </div>
                      <div>
                        <p className="text-white/45 uppercase tracking-wider font-bold">Trades</p>
                        <p className="text-white font-mono tabular-nums">
                          {m.count != null ? parseInt(m.count, 10).toLocaleString() : '—'}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/trade/${m.symbol}`}
                      className="bitzx-hover-scale flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gold/15 border border-gold/30 text-gold-light font-bold text-sm"
                    >
                      Trade <ArrowRight size={14} />
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        )}

        </>
        )}

        <p className="text-white/45 text-xs sm:text-sm text-center mt-8 px-2">
          BZX from BITZX API · Other pairs from Binance public 24h ticker · Not financial advice
        </p>
      </div>
    </div>
  );
}
