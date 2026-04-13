import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, TrendingUp, TrendingDown, Filter, ArrowLeft } from 'lucide-react';
import { authFetch } from '@/context/AuthContext';
import { PAIRS, COIN_ICONS } from '@/services/marketApi';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const PAIR_OPTIONS = PAIRS.map(p => p.symbol);

/** API symbols are like BTCUSDT; normalize for comparisons. */
function normSymbol(s) {
  if (s == null || s === '') return '';
  return String(s).replace(/\//g, '').toUpperCase();
}

/** Local calendar day bounds for yyyy-mm-dd from &lt;input type="date" /&gt;. */
function localDayBounds(ymd) {
  const parts = ymd.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return null;
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  return { start, end };
}

function parseTradeTimeMs(iso) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

const TRADE_FMT = iso =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export default function PnLAnalyticsPage() {
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pairFilter, setPairFilter] = useState(''); // applies to positions + fills
  const [posPnlFilter, setPosPnlFilter] = useState('all'); // all | profit | loss
  const [tradeSide, setTradeSide] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loadError, setLoadError] = useState(null);

  const allPairOptions = useMemo(() => {
    const set = new Set(PAIR_OPTIONS.map(normSymbol));
    positions.forEach(p => {
      if (p.symbol) set.add(normSymbol(p.symbol));
    });
    trades.forEach(t => {
      if (t.symbol) set.add(normSymbol(t.symbol));
    });
    return Array.from(set).filter(Boolean).sort();
  }, [positions, trades]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [pr, tr] = await Promise.all([
        authFetch(`${API}/api/portfolio/positions`),
        authFetch(`${API}/api/orders/trades`),
      ]);
      const errs = [];
      if (pr.ok) {
        setPositions(await pr.json());
      } else {
        setPositions([]);
        if (pr.status === 401) errs.push('Session expired — sign in again.');
        else errs.push(`Positions could not be loaded (${pr.status}).`);
      }
      if (tr.ok) {
        setTrades(await tr.json());
      } else {
        setTrades([]);
        if (tr.status === 401) errs.push('Session expired — sign in again.');
        else errs.push(`Trades could not be loaded (${tr.status}).`);
      }
      setLoadError(errs.length ? [...new Set(errs)].join(' ') : null);
    } catch (e) {
      setLoadError(e.message || 'Network error while loading.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fromBounds = dateFrom ? localDayBounds(dateFrom) : null;
  const toBounds = dateTo ? localDayBounds(dateTo) : null;

  const filteredPositions = useMemo(() => {
    const want = normSymbol(pairFilter);
    return positions.filter(p => {
      if (want && normSymbol(p.symbol) !== want) return false;
      const upnl = Number(p.unrealized_pnl ?? 0);
      if (posPnlFilter === 'profit' && upnl <= 0) return false;
      if (posPnlFilter === 'loss' && upnl >= 0) return false;
      return true;
    });
  }, [positions, pairFilter, posPnlFilter]);

  const filteredTrades = useMemo(() => {
    const want = normSymbol(pairFilter);
    return trades.filter(t => {
      if (want && normSymbol(t.symbol) !== want) return false;
      if (tradeSide !== 'all' && String(t.side).toLowerCase() !== tradeSide) return false;
      const ms = parseTradeTimeMs(t.created_at);
      if (fromBounds && (ms == null || ms < fromBounds.start)) return false;
      if (toBounds && (ms == null || ms > toBounds.end)) return false;
      return true;
    });
  }, [trades, pairFilter, tradeSide, fromBounds, toBounds]);

  const posSummary = useMemo(() => {
    const unrealized = filteredPositions.reduce((s, p) => s + Number(p.unrealized_pnl ?? 0), 0);
    const invested = filteredPositions.reduce((s, p) => s + Number(p.total_invested ?? 0), 0);
    const mval = filteredPositions.reduce((s, p) => s + Number(p.market_value_usdt ?? 0), 0);
    return { unrealized, invested, mval, count: filteredPositions.length };
  }, [filteredPositions]);

  const tradeSummary = useMemo(() => {
    let buyVol = 0;
    let sellVol = 0;
    let feesUsdt = 0;
    let realizedSum = 0;
    for (const t of filteredTrades) {
      const notional = Number(t.price) * Number(t.amount);
      const sd = String(t.side || '').toLowerCase();
      if (sd === 'buy') buyVol += notional;
      else sellVol += notional;
      if (t.fee_asset === 'USDT') feesUsdt += Number(t.fee ?? 0);
      if (sd === 'sell' && t.realized_pnl != null && !Number.isNaN(Number(t.realized_pnl))) {
        realizedSum += Number(t.realized_pnl);
      }
    }
    return { buyVol, sellVol, feesUsdt, realizedSum, count: filteredTrades.length };
  }, [filteredTrades]);

  const resetFilters = () => {
    setPairFilter('');
    setPosPnlFilter('all');
    setTradeSide('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="min-h-screen bg-surface-dark text-white pb-16">
      <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-8">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Link
            to="/trade/BZXUSDT"
            className="inline-flex items-center gap-2 text-white hover:text-gold-light text-sm font-semibold transition-colors"
          >
            <ArrowLeft size={16} /> Back to trade
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">P&amp;L &amp; fills</h1>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-border text-sm font-bold text-white hover:text-white hover:border-gold/30 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loadError && (
          <div
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300"
            role="alert"
          >
            {loadError}
          </div>
        )}

        {/* Filters */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-2 text-gold-light font-bold text-sm mb-4">
            <Filter size={16} /> Filters
          </div>
          <p className="text-white text-xs mb-4 -mt-2">
            Pair applies to both open positions and trade fills. Dates use your device timezone.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-extrabold text-white uppercase tracking-widest">Pair</label>
              <select
                value={pairFilter}
                onChange={e => setPairFilter(normSymbol(e.target.value))}
                className="mt-1.5 w-full rounded-xl bg-[#0d0f14] border border-white/[.08] px-3 py-2.5 text-sm font-semibold"
              >
                <option value="">All pairs</option>
                {allPairOptions.map(s => (
                  <option key={s} value={s}>
                    {s.replace('USDT', '/USDT')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-extrabold text-white uppercase tracking-widest">Unrealized P&amp;L</label>
              <select
                value={posPnlFilter}
                onChange={e => setPosPnlFilter(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-[#0d0f14] border border-white/[.08] px-3 py-2.5 text-sm font-semibold"
              >
                <option value="all">All positions</option>
                <option value="profit">Profitable only</option>
                <option value="loss">Losing only</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-extrabold text-white uppercase tracking-widest">Trade side</label>
              <select
                value={tradeSide}
                onChange={e => setTradeSide(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-[#0d0f14] border border-white/[.08] px-3 py-2.5 text-sm font-semibold"
              >
                <option value="all">Buy &amp; sell</option>
                <option value="buy">Buy only</option>
                <option value="sell">Sell only</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-extrabold text-white uppercase tracking-widest">From date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-[#0d0f14] border border-white/[.08] px-3 py-2.5 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] font-extrabold text-white uppercase tracking-widest">To date</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-[#0d0f14] border border-white/[.08] px-3 py-2.5 text-sm font-semibold"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 text-xs font-bold text-gold-light hover:underline"
          >
            Reset all filters
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
          <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
            <p className="text-white text-xs font-extrabold uppercase tracking-widest mb-1">Filtered unrealized P&amp;L</p>
            <p className={`text-2xl font-extrabold font-mono flex items-center gap-2 ${posSummary.unrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {posSummary.unrealized >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
              {posSummary.unrealized >= 0 ? '+' : ''}
              ${posSummary.unrealized.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-white text-xs mt-2">{posSummary.count} position(s) in view</p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
            <p className="text-white text-xs font-extrabold uppercase tracking-widest mb-1">Market value (filtered)</p>
            <p className="text-2xl font-extrabold font-mono text-white">
              ${posSummary.mval.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-white text-xs mt-2">Cost basis ${posSummary.invested.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
            <p className="text-white text-xs font-extrabold uppercase tracking-widest mb-1">Trade volume (filtered)</p>
            <p className="text-lg font-bold text-white">
              Buy ${tradeSummary.buyVol.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-lg font-bold text-white">
              Sell ${tradeSummary.sellVol.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
            <p className="text-white text-xs font-extrabold uppercase tracking-widest mb-1">Est. USDT fees (filtered)</p>
            <p className="text-2xl font-extrabold font-mono text-amber-200/90">
              ${tradeSummary.feesUsdt.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </p>
            <p className="text-white text-xs mt-2">{tradeSummary.count} fill(s) in view</p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
            <p className="text-white text-xs font-extrabold uppercase tracking-widest mb-1">Realized P&amp;L on sells (filtered)</p>
            <p
              className={`text-2xl font-extrabold font-mono ${
                tradeSummary.realizedSum >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {tradeSummary.realizedSum >= 0 ? '+' : ''}
              ${tradeSummary.realizedSum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-white text-xs mt-2">Average-cost basis; buy fills show no per-fill P&amp;L</p>
          </div>
        </div>

        {/* Positions table */}
        <section className="mb-12">
          <h2 className="text-lg font-extrabold mb-4">Open positions</h2>
          <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
            {loading && positions.length === 0 ? (
              <div className="flex items-center justify-center py-16 gap-2 text-white">
                <RefreshCw className="animate-spin" size={20} /> Loading…
              </div>
            ) : filteredPositions.length === 0 ? (
              <p className="text-center py-14 text-white">No positions match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-extrabold text-white uppercase tracking-widest border-b border-white/[.06] bg-white/[.02]">
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Avg cost</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Value</th>
                      <th className="px-4 py-3 text-right">Unrealized P&amp;L</th>
                      <th className="px-4 py-3 text-right">P&amp;L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPositions.map(p => {
                      const icon = COIN_ICONS[p.asset];
                      const upnl = Number(p.unrealized_pnl ?? 0);
                      const pct = Number(p.unrealized_pnl_pct ?? 0);
                      return (
                        <tr key={p.asset} className="border-b border-white/[.04] hover:bg-white/[.02]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {icon && <img src={icon} alt="" className="w-7 h-7 rounded-full" />}
                              <span className="font-extrabold">{p.asset}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{Number(p.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                          <td className="px-4 py-3 text-right font-mono text-white">${Number(p.avg_cost).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                          <td className="px-4 py-3 text-right font-mono">${Number(p.current_price).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">${Number(p.market_value_usdt).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${upnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {upnl >= 0 ? '+' : ''}${upnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-white text-xs mt-3">
            Close or reduce holdings from the <Link to="/trade/BZXUSDT" className="text-gold-light font-semibold hover:underline">Trade</Link> page → Positions tab → Close.
          </p>
        </section>

        {/* Trades */}
        <section>
          <h2 className="text-lg font-extrabold mb-4">Trade fills</h2>
          <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
            {loading && trades.length === 0 ? (
              <div className="flex items-center justify-center py-16 gap-2 text-white">
                <RefreshCw className="animate-spin" size={20} /> Loading…
              </div>
            ) : filteredTrades.length === 0 ? (
              <p className="text-center py-14 text-white">No fills match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-extrabold text-white uppercase tracking-widest border-b border-white/[.06] bg-white/[.02]">
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Pair</th>
                      <th className="px-4 py-3">Side</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Notional</th>
                      <th className="px-4 py-3 text-right">Realized P&amp;L</th>
                      <th className="px-4 py-3 text-right">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map(t => {
                      const n = Number(t.price) * Number(t.amount);
                      const rp = t.realized_pnl != null ? Number(t.realized_pnl) : null;
                      const showPnl = t.side === 'sell' && rp != null && !Number.isNaN(rp);
                      return (
                        <tr key={t.id} className="border-b border-white/[.04] hover:bg-white/[.02]">
                          <td className="px-4 py-3 font-mono text-white">{TRADE_FMT(t.created_at)}</td>
                          <td className="px-4 py-3 font-bold">{t.symbol.replace('USDT', '/USDT')}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-extrabold uppercase px-2 py-1 rounded-md ${
                                t.side === 'buy' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                              }`}
                            >
                              {t.side}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">${Number(t.price).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                          <td className="px-4 py-3 text-right font-mono">{Number(t.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${showPnl ? (rp >= 0 ? 'text-green-400' : 'text-red-400') : 'text-white'}`}>
                            {showPnl ? (
                              <>
                                {rp >= 0 ? '+' : ''}${rp.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-white">
                            {Number(t.fee).toLocaleString(undefined, { maximumFractionDigits: 8 })} {t.fee_asset}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-white text-xs mt-3 max-w-3xl">
            <strong className="text-white">Realized P&amp;L</strong> is shown only on{' '}
            <strong className="text-white">sell</strong> fills: net USDT received minus average cost of that
            size (same method as open positions). Buy fills open or add to inventory, so they show &quot;—&quot;.
            History is replayed on up to 10,000 past fills for correct cost basis.
          </p>
        </section>
      </div>
    </div>
  );
}
