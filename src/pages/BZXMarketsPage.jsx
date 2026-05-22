/**
 * BZX Markets — paginated catalog + lightweight live updates.
 */
import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Star, TrendingUp, TrendingDown, ArrowRight, RefreshCw, BarChart2,
  Activity, Flame, Snowflake, LayoutGrid, Table2, ChevronRight,
  Layers, Clock, ChevronLeft, Loader2,
} from 'lucide-react';
import { COIN_ICONS } from '@/services/marketApi';
import { useBzxMarkets } from '@/hooks/useBzxMarkets';
import MarketsPagination from '@/components/markets/MarketsPagination';

const fmtP = (v) => {
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n === 0) return '—';
  return n >= 1000
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : n >= 1 ? n.toFixed(4)
    : n.toFixed(6);
};

const fmtVol = (v) => {
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n === 0) return '—';
  return n >= 1e9 ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
    : n >= 1e3 ? `${(n / 1e3).toFixed(2)}K`
    : n.toFixed(2);
};

const fmtSpread = (bid, ask) => {
  const b = parseFloat(bid);
  const a = parseFloat(ask);
  if (!Number.isFinite(b) || !Number.isFinite(a) || a < b) return { abs: '—', bps: '' };
  const abs = a - b;
  const mid = (a + b) / 2;
  const bps = mid > 0 ? (abs / mid) * 10000 : 0;
  const absStr = abs >= 1 ? abs.toFixed(4) : abs.toExponential(2);
  return { abs: absStr, bps: `${bps.toFixed(2)} bps` };
};

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

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
  const l = num(low), h = num(high), p = num(price);
  if (h <= l) return <div className="h-1 w-16 rounded-full bg-white/10" />;
  const x = Math.min(100, Math.max(0, ((p - l) / (h - l)) * 100));
  return (
    <div className="h-1.5 w-14 sm:w-20 rounded-full bg-white/10 overflow-hidden relative">
      <div className="absolute top-0 bottom-0 left-0 rounded-full bg-gradient-to-r from-red-500/70 via-gold/80 to-green-500/70" style={{ width: '100%' }} />
      <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow border border-white/40" style={{ left: `calc(${x}% - 3px)` }} />
    </div>
  );
}

const BZX_LOGO = 'https://customer-assets.emergentagent.com/job_bitzx-launch/artifacts/egv3g6nq_Bitzx%20Logo%20%281%29.png';
const HEATMAP_CAP = 36;

const TIER_TABS = [
  { id: 'featured', label: 'Featured', short: 'Top' },
  { id: 'major', label: 'Majors', short: 'Major' },
  { id: 'web3', label: 'Web3', short: 'Web3' },
  { id: 'all', label: 'All', short: 'All' },
];

export default function BZXMarketsPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('split');
  const [sortKey, setSortKey] = useState('quoteVolume');
  const [sortDir, setSortDir] = useState(-1);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bitzx_bzxmkt_favs') || '[]'); } catch { return []; }
  });

  const {
    tier,
    setTier,
    query,
    setQuery,
    items,
    total,
    catalogTotal,
    summary,
    topGainers,
    topLosers,
    bzxPrice,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useBzxMarkets({ tier: 'featured' });

  const toggleFav = (sym) => {
    const next = favorites.includes(sym) ? favorites.filter((f) => f !== sym) : [...favorites, sym];
    setFavorites(next);
    localStorage.setItem('bitzx_bzxmkt_favs', JSON.stringify(next));
  };

  const handleSort = (k) => {
    if (sortKey === k) setSortDir((d) => -d);
    else {
      setSortKey(k);
      setSortDir(k === 'priceChangePercent' || k === 'quoteVolume' || k === 'volume' ? -1 : 1);
    }
  };

  const heatmapRows = useMemo(() => items.slice(0, HEATMAP_CAP), [items]);
  const { minPct, maxPct } = useMemo(() => {
    const pcts = heatmapRows.map((m) => num(m.priceChangePercent));
    return {
      minPct: pcts.length ? Math.min(...pcts) : 0,
      maxPct: pcts.length ? Math.max(...pcts) : 0,
    };
  }, [heatmapRows]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (tier === 'favorites') {
      list = list.filter((m) => favorites.includes(m.symbol));
    }
    return list.sort((a, b) => (num(a[sortKey] ?? 0) - num(b[sortKey] ?? 0)) * sortDir);
  }, [items, tier, favorites, sortKey, sortDir]);

  const pairLabel = summary?.total_pairs ?? catalogTotal;
  const upCount = summary?.gainers ?? 0;
  const downCount = summary?.losers ?? 0;
  const totalVol = summary?.total_quote_volume ?? 0;

  const SortTh = ({ label, field, className = '' }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-2 md:px-3 py-2.5 md:py-3.5 text-left text-[10px] md:text-xs font-semibold text-white uppercase tracking-wide cursor-pointer hover:text-gold-light/90 select-none whitespace-nowrap ${className}`}
    >
      {label}{' '}
      {sortKey === field && <span className="text-gold-light">{sortDir > 0 ? '↑' : '↓'}</span>}
    </th>
  );

  const renderMoverRow = (m, i) => {
    const base = m.base || m.symbol?.replace('BZX', '');
    const pct = num(m.priceChangePercent);
    const icon = COIN_ICONS[base];
    return (
      <button key={m.symbol} type="button" onClick={() => navigate(`/trade/${m.symbol}`)}
        className="group/row w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.055]">
        <span className="text-xs font-mono text-white/40 w-5">{i + 1}</span>
        {icon ? <img src={icon} alt="" className="w-8 h-8 rounded-full" /> : (
          <div className="w-8 h-8 rounded-full bg-gold/20 text-[10px] font-bold flex items-center justify-center text-gold-light">{base?.slice(0, 2)}</div>
        )}
        <div className="flex-1 min-w-0">
          <span className="font-bold text-white">{base}</span>
          <span className="text-white/50 text-sm"> /BZX</span>
        </div>
        <span className={`font-extrabold tabular-nums ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
        </span>
        <ChevronRight size={16} className="text-white/30" />
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-surface-dark w-full min-w-0 overflow-x-hidden">
      <div className="w-full max-w-[100vw] min-w-0 px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-8 md:py-10 pb-10 sm:pb-14">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button type="button" onClick={() => navigate('/markets')}
            className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-semibold mb-4 transition-colors">
            <ChevronLeft size={14} /> Back to Markets
          </button>
          <div className="flex items-center gap-3 mb-2">
            <img src={BZX_LOGO} alt="BZX" className="w-8 h-8 rounded-full ring-2 ring-gold/30" />
            <span className="text-gold-light text-xs sm:text-sm font-bold uppercase tracking-widest">BZX Markets</span>
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-2">BZX-Quoted Pairs</h1>
          <p className="text-sm sm:text-base text-white/80 max-w-3xl">
            Trade hundreds of BEP-20 tokens against BZX. Featured majors load instantly; explore Web3 with search and pagination.
            {bzxPrice != null && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 border border-gold/25 text-gold-light text-xs font-bold">
                BZX/USDT ≈ ${parseFloat(bzxPrice).toFixed(4)}
              </span>
            )}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Catalog', value: String(pairLabel || '—'), sub: 'Tradable vs BZX', icon: Activity },
            { label: 'Showing', value: String(items.length), sub: `${total} in view · ${tier}`, icon: Layers },
            { label: 'Gainers', value: String(upCount), sub: '24h ▲', icon: Flame, accent: 'text-green-400' },
            { label: 'Losers', value: String(downCount), sub: '24h ▼', icon: Snowflake, accent: 'text-red-400' },
          ].map(({ label, value, sub, icon: Icon, accent }) => (
            <div key={label} className="bitzx-hover-lift bitzx-hover-glow rounded-2xl border border-surface-border px-4 py-4 sm:py-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="bitzx-hover-lift bitzx-hover-border rounded-2xl border border-surface-border overflow-hidden" style={{ background: 'rgba(34,197,94,0.04)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-green-500/10">
              <span className="text-sm font-extrabold text-green-400 flex items-center gap-2"><Flame size={16} /> Top gainers</span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {loading ? <div className="py-8 text-center text-white/50 text-sm">Loading…</div>
                : topGainers.length === 0 ? <div className="py-6 text-center text-white/50 text-sm">No gainers</div>
                  : topGainers.map(renderMoverRow)}
            </div>
          </div>
          <div className="bitzx-hover-lift bitzx-hover-border rounded-2xl border border-surface-border overflow-hidden" style={{ background: 'rgba(239,68,68,0.04)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-red-500/10">
              <span className="text-sm font-extrabold text-red-400 flex items-center gap-2"><Snowflake size={16} /> Top losers</span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {loading ? <div className="py-8 text-center text-white/50 text-sm">Loading…</div>
                : topLosers.length === 0 ? <div className="py-6 text-center text-white/50 text-sm">No losers</div>
                  : topLosers.map(renderMoverRow)}
            </div>
          </div>
        </div>

        {viewMode !== 'table' && (
          <div className="mb-8">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <LayoutGrid size={18} className="text-gold-light" /> Heatmap (top {HEATMAP_CAP})
              </h2>
            </div>
            <div className="grid grid-cols-2 min-[380px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-2.5">
              {loading ? <div className="col-span-full py-12 text-center text-white/50">Loading…</div>
                : heatmapRows.map((m) => {
                  const pct = num(m.priceChangePercent);
                  const base = m.base || m.symbol?.replace('BZX', '');
                  return (
                    <Link key={m.symbol} to={`/trade/${m.symbol}`}
                      className="bitzx-hover-lift rounded-xl border border-white/10 p-3 flex flex-col items-center justify-center min-h-[88px]"
                      style={{ background: heatBg(pct, minPct, maxPct) }}>
                      <span className="text-sm font-extrabold text-white">{base}</span>
                      <span className="text-[10px] text-white/50 font-mono">/BZX</span>
                      <span className={`text-xs font-bold mt-1 ${pct >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5 sm:mb-6 min-w-0">
          <div className="space-y-2 w-full min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Clock size={12} /> Browse
            </p>
            <div className="-mx-3 px-3 sm:mx-0 overflow-x-auto [scrollbar-width:thin]">
              <div className="flex flex-nowrap gap-2 pb-1">
                {TIER_TABS.map(({ id, label, short }) => (
                  <button key={id} type="button" onClick={() => setTier(id)}
                    className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-bold border whitespace-nowrap ${
                      tier === id ? 'bg-gold text-surface-dark border-gold' : 'border-surface-border text-white/70'
                    }`}>
                    {short} · {label}
                  </button>
                ))}
                <button type="button" onClick={() => setTier('favorites')}
                  className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-bold border whitespace-nowrap ${
                    tier === 'favorites' ? 'bg-gold text-surface-dark border-gold' : 'border-surface-border text-white/70'
                  }`}>
                  ★ Watchlist
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto min-w-0">
            <div className="flex items-center gap-2 rounded-xl border border-surface-border px-3 py-2.5 flex-1 min-w-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Search size={16} className="text-white/60 shrink-0" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search token…"
                className="bg-transparent text-sm text-white outline-none flex-1 min-w-0 placeholder:text-white/40" />
            </div>
            <button type="button" onClick={() => setViewMode((v) => (v === 'split' ? 'table' : v === 'table' ? 'heatmap' : 'split'))}
              className="px-3 py-2.5 rounded-xl border border-surface-border text-white text-xs font-bold">
              {viewMode === 'split' ? 'Table' : viewMode === 'table' ? 'Heatmap' : 'Full'}
            </button>
            <button type="button" onClick={() => refresh()} className="p-2.5 rounded-xl border border-surface-border text-white" aria-label="Refresh">
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 mb-4">{error}</div>
        ) : null}

        <p className="text-[11px] text-white/45 mb-3">
          {loading ? 'Loading…' : `Showing ${filtered.length} of ${total} in this view (${catalogTotal} in catalog). Vol (BZX): ${fmtVol(totalVol)}`}
        </p>

        {viewMode !== 'heatmap' && (
          <div className="hidden md:block w-full min-w-0 rounded-2xl border border-surface-border bg-[#0d0f14] overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-surface-border bg-white/[0.02]">
                  <tr>
                    <th className="w-10 px-2 py-3" />
                    <th className="px-3 py-3 text-xs text-white uppercase">Pair</th>
                    <SortTh label="Price" field="price" />
                    <SortTh label="24h %" field="priceChangePercent" />
                    <SortTh label="Vol" field="quoteVolume" />
                    <th className="px-3 py-3 text-right text-xs text-white uppercase">Trade</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !items.length ? (
                    <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-gold" /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-white/50">No pairs match.</td></tr>
                  ) : filtered.map((m) => {
                    const base = m.base || m.symbol?.replace('BZX', '');
                    const pct = num(m.priceChangePercent);
                    const isUp = pct >= 0;
                    return (
                      <tr key={m.symbol} className="border-b border-surface-border/40 hover:bg-white/[0.03]">
                        <td className="px-2 py-3">
                          <button type="button" onClick={() => toggleFav(m.symbol)}>
                            <Star size={14} className={favorites.includes(m.symbol) ? 'text-gold fill-gold' : 'text-white/25'} />
                          </button>
                        </td>
                        <td className="px-3 py-3 font-bold text-white">{base}<span className="text-white/45 font-normal">/BZX</span></td>
                        <td className="px-3 py-3 font-mono tabular-nums">{fmtP(m.price)}</td>
                        <td className={`px-3 py-3 font-bold tabular-nums ${isUp ? 'text-green-400' : 'text-red-400'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</td>
                        <td className="px-3 py-3 font-mono text-white/70 tabular-nums">{fmtVol(m.quoteVolume)}</td>
                        <td className="px-3 py-3 text-right">
                          <Link to={`/trade/${m.symbol}`} className="text-gold-light text-xs font-bold hover:underline">Trade</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode !== 'heatmap' && (
          <div className="md:hidden space-y-3 mb-4">
            {filtered.map((m) => {
              const base = m.base || m.symbol?.replace('BZX', '');
              const pct = num(m.priceChangePercent);
              return (
                <div key={m.symbol} className="rounded-2xl border border-surface-border p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-white">{base}/BZX</span>
                    <span className={`font-bold ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>
                  </div>
                  <p className="font-mono text-sm text-white mb-3">{fmtP(m.price)}</p>
                  <Link to={`/trade/${m.symbol}`} className="block text-center py-2 rounded-xl bg-gold/15 border border-gold/30 text-gold-light text-sm font-bold">Trade</Link>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && tier !== 'favorites' ? (
          <MarketsPagination
            shown={items.length}
            total={total}
            loading={loadingMore}
            onLoadMore={loadMore}
          />
        ) : null}

        <p className="text-white/45 text-xs text-center mt-8">
          Full Web3 catalog trades vs BZX with synthetic liquidity. Search to find any listed token. Not financial advice.
        </p>
      </div>
    </div>
  );
}
