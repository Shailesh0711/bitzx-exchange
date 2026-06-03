/**
 * BZX ↔ USDT instant swap + recent swap history (wallet tab).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownUp, ArrowRight, ChevronDown, ChevronUp,
  RefreshCw, Zap, Wallet, History, Info,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { COIN_ICONS } from '@/services/marketApi';
import {
  fetchSwapQuote,
  executeSwap,
  fetchSwapOrderHistory,
} from '@/services/walletSwapApi';

const PCT = [0.25, 0.5, 0.75, 1];

function num(v) {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(v, dp = 4) {
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

function AssetChip({ asset, large }) {
  const icon = COIN_ICONS[asset];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 shrink-0 ${large ? 'px-4 py-2' : 'px-3 py-1.5'}`}>
      {icon ? (
        <img src={icon} alt="" className={large ? 'h-8 w-8' : 'h-6 w-6'} />
      ) : (
        <span className={`flex items-center justify-center rounded-full bg-gold/25 font-bold text-gold-light ${large ? 'h-8 w-8 text-xs' : 'h-6 w-6 text-[10px]'}`}>
          {asset.slice(0, 2)}
        </span>
      )}
      <span className={`font-bold text-gold-light ${large ? 'text-base' : 'text-sm'}`}>{asset}</span>
    </span>
  );
}

function DetailRow({ label, value, accent }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-white/[0.06] last:border-0">
      <span className="text-xs text-white/50">{label}</span>
      <span className={`text-xs font-mono text-right ${accent || 'text-white'}`}>{value}</span>
    </div>
  );
}

function BalanceTile({ asset, available, usdHint }) {
  const icon = COIN_ICONS[asset];
  return (
    <div className="rounded-xl border border-surface-border bg-white/[0.03] p-4 flex items-center gap-3">
      {icon ? (
        <img src={icon} alt="" className="h-10 w-10 rounded-full object-contain" />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold-light">
          {asset.slice(0, 2)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-white/45">{asset} available</p>
        <p className="text-lg font-bold text-white font-mono truncate">
          {fmt(available, asset === 'USDT' ? 2 : 4)}
        </p>
        {usdHint ? <p className="text-[10px] text-white/40 mt-0.5">{usdHint}</p> : null}
      </div>
    </div>
  );
}

function swapRouteLabel(order) {
  const side = String(order.side || '').toLowerCase();
  return side === 'sell' ? 'BZX → USDT' : 'USDT → BZX';
}

export default function BzxSwapPanel() {
  const { walletAssets, walletLoading, fetchWallet } = useAuth();

  const [direction, setDirection] = useState('bzx_to_usdt');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fromAsset = direction === 'bzx_to_usdt' ? 'BZX' : 'USDT';
  const toAsset = direction === 'bzx_to_usdt' ? 'USDT' : 'BZX';

  const bzxBal = useMemo(() => {
    const w = walletAssets.find((x) => x.asset === 'BZX');
    return w ? num(w.available) : 0;
  }, [walletAssets]);

  const usdtBal = useMemo(() => {
    const w = walletAssets.find((x) => x.asset === 'USDT');
    return w ? num(w.available) : 0;
  }, [walletAssets]);

  const payBalance = fromAsset === 'BZX' ? bzxBal : usdtBal;

  const available = useMemo(() => {
    if (quote?.available_from != null) return num(quote.available_from);
    return payBalance;
  }, [payBalance, quote]);

  const feeOk = useMemo(() => {
    if (!quote?.fee_bzx_estimated) return true;
    return bzxBal + 1e-9 >= num(quote.fee_bzx_estimated);
  }, [quote, bzxBal]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await fetchSwapOrderHistory(12));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const flip = () => {
    setDirection((d) => (d === 'bzx_to_usdt' ? 'usdt_to_bzx' : 'bzx_to_usdt'));
    setQuote(null);
    setError('');
    setSuccess('');
  };

  const loadQuote = useCallback(async () => {
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setQuote(null);
      return;
    }
    setQuoteLoading(true);
    setError('');
    try {
      setQuote(await fetchSwapQuote(direction, n));
    } catch (e) {
      setQuote(null);
      setError(e.message || 'Could not load quote');
    } finally {
      setQuoteLoading(false);
    }
  }, [amount, direction]);

  useEffect(() => {
    const t = setTimeout(() => { void loadQuote(); }, 400);
    return () => clearTimeout(t);
  }, [loadQuote]);

  const setPct = (p) => {
    if (available <= 0) return;
    const dp = fromAsset === 'USDT' ? 2 : 6;
    setAmount(fmt(available * p, dp).replace(/,/g, ''));
  };

  const onSwap = async () => {
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter an amount.');
      return;
    }
    if (n > available + 1e-9) {
      setError(`Insufficient ${fromAsset}.`);
      return;
    }
    if (!feeOk) {
      setError(`Need ~${fmt(quote?.fee_bzx_estimated, 4)} BZX for fees.`);
      return;
    }
    setSwapping(true);
    setError('');
    setSuccess('');
    try {
      await executeSwap(direction, n);
      setSuccess(`Swapped ${fmt(n, fromAsset === 'USDT' ? 2 : 4)} ${fromAsset}.`);
      setAmount('');
      setQuote(null);
      await Promise.all([fetchWallet(), loadHistory()]);
    } catch (e) {
      setError(e.message || 'Swap failed');
    } finally {
      setSwapping(false);
    }
  };

  const rateLine = quote?.price_usdt
    ? direction === 'bzx_to_usdt'
      ? `1 BZX = $${fmt(quote.price_usdt, 4)} USDT`
      : `1 BZX = $${fmt(quote.price_usdt, 4)} · 1 USDT ≈ ${fmt(1 / quote.price_usdt, 4)} BZX`
    : 'Enter an amount to load live rate';

  const receiveVal = quote
    ? fmt(quote.to_amount_estimated, toAsset === 'USDT' ? 2 : 4)
    : '0.0';

  const fmtDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
      });
    } catch {
      return '';
    }
  };

  const bzxUsd = quote?.price_usdt && bzxBal > 0
    ? `≈ $${fmt(bzxBal * quote.price_usdt, 2)}`
    : null;

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header — full width */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-extrabold text-white">Swap</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 border border-gold/40 px-2.5 py-0.5 text-[10px] font-bold uppercase text-gold-light">
              <Zap size={11} /> Instant
            </span>
          </div>
          <p className="text-sm text-white/55 mt-1.5 max-w-xl">
            Convert BZX and USDT instantly at the live BZXUSDT market price. Fees are charged in BZX.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchWallet()}
          disabled={walletLoading}
          className="inline-flex items-center gap-2 text-xs font-bold text-gold-light border border-gold/30 px-4 py-2 rounded-xl hover:bg-gold/10 disabled:opacity-40"
        >
          <RefreshCw size={14} className={walletLoading ? 'animate-spin' : ''} />
          Refresh balances
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* ── Left: swap form ── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-surface-border bg-surface-DEFAULT overflow-hidden shadow-lg shadow-black/20">
            <div className="h-1 bg-gradient-to-r from-gold/80 via-gold-light to-gold/40" />

            <div className="p-5 sm:p-6 space-y-1">
              <div className="rounded-xl border border-surface-border bg-surface-dark/60 p-4 sm:p-5">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/50 mb-3">
                  <span>You pay</span>
                  <span className="font-mono text-gold-light">
                    {fmt(payBalance, fromAsset === 'USDT' ? 2 : 4)} {fromAsset} available
                  </span>
                </div>
                <div className="flex items-center gap-4 min-w-0">
                  <input
                    className="min-w-0 flex-1 bg-transparent font-mono text-3xl sm:text-4xl text-white outline-none placeholder:text-white/20"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.0"
                  />
                  <AssetChip asset={fromAsset} large />
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {PCT.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPct(p)}
                      className="rounded-lg border border-surface-border bg-white/[0.04] py-2.5 text-[11px] font-bold text-white/70 hover:border-gold/40 hover:bg-gold/10 hover:text-gold-light transition-colors"
                    >
                      {p === 1 ? 'MAX' : `${p * 100}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center py-2 relative z-10">
                <button
                  type="button"
                  onClick={flip}
                  aria-label={`Swap direction: ${fromAsset} to ${toAsset}`}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-surface-DEFAULT bg-gradient-to-br from-gold to-gold-light text-surface-dark shadow-xl shadow-gold/30 hover:scale-105 active:scale-95 transition-transform"
                >
                  <ArrowDownUp size={24} strokeWidth={2.5} />
                </button>
              </div>

              <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-4 sm:p-5">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/50 mb-3">
                  <span>You receive</span>
                  {quoteLoading ? (
                    <span className="text-gold-light animate-pulse font-semibold">Updating…</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-4 min-w-0">
                  <span className="min-w-0 flex-1 font-mono text-3xl sm:text-4xl text-gold-light">{receiveVal}</span>
                  <AssetChip asset={toAsset} large />
                </div>
                <p className="mt-3 font-mono text-xs text-white/50">{rateLine}</p>
              </div>
            </div>

            {error ? (
              <p className="mx-5 sm:mx-6 mb-2 text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2">{error}</p>
            ) : null}
            {success ? (
              <p className="mx-5 sm:mx-6 mb-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-3 py-2">{success}</p>
            ) : null}

            <div className="px-5 sm:px-6 pb-5 sm:pb-6">
              <button
                type="button"
                disabled={swapping || quoteLoading || !amount || !feeOk}
                onClick={onSwap}
                className="w-full rounded-xl bg-gradient-to-r from-gold to-gold-light py-4 text-base font-bold text-surface-dark disabled:opacity-50 hover:opacity-95 transition-opacity shadow-lg shadow-gold/20"
              >
                {swapping ? 'Swapping…' : direction === 'bzx_to_usdt' ? 'Swap BZX for USDT' : 'Swap USDT for BZX'}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-white/40 flex items-start gap-2 px-1">
            <Info size={14} className="shrink-0 mt-0.5 text-white/30" />
            Swaps execute as market orders on BZXUSDT. Final fill may differ slightly from the quote.
          </p>
        </div>

        {/* ── Right: balances, details, history ── */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-surface-border bg-surface-DEFAULT p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={16} className="text-gold-light" />
              <h3 className="text-sm font-bold text-white">Wallet balances</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <BalanceTile asset="BZX" available={bzxBal} usdHint={bzxUsd} />
              <BalanceTile asset="USDT" available={usdtBal} usdHint="Stablecoin" />
            </div>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-DEFAULT p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-gold-light" />
              <h3 className="text-sm font-bold text-white">Swap details</h3>
            </div>
            <DetailRow label="Route" value={`${fromAsset} → ${toAsset}`} />
            <DetailRow label="Market" value="BZXUSDT" />
            <DetailRow label="Price impact" value="~0% (market)" accent="text-emerald-400" />
            <DetailRow label="Execution" value="Market order" />
            <DetailRow
              label="Minimum received"
              value={quote ? `${receiveVal} ${toAsset}` : '—'}
            />
            <DetailRow
              label="Trading fee"
              value={quote ? `≈ ${fmt(quote.fee_bzx_estimated, 4)} BZX` : 'Charged in BZX'}
            />
            {quote?.min_from_amount != null ? (
              <DetailRow
                label="Minimum pay"
                value={`${fmt(quote.min_from_amount, fromAsset === 'USDT' ? 2 : 4)} ${fromAsset}`}
              />
            ) : null}
            {!feeOk && quote ? (
              <p className="text-xs text-amber-400/90 mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                Add BZX for fees — need ~{fmt(quote.fee_bzx_estimated, 4)}, have {fmt(bzxBal, 4)}.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-DEFAULT p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History size={16} className="text-gold-light" />
                <h3 className="text-sm font-bold text-white">Recent swaps</h3>
              </div>
              <button
                type="button"
                onClick={() => loadHistory()}
                className="text-white/40 hover:text-gold-light"
                aria-label="Refresh swap history"
              >
                <RefreshCw size={14} className={historyLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {historyLoading ? (
              <p className="text-xs text-white/45 py-6 text-center">Loading history…</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-white/45 py-4 text-center rounded-xl bg-white/[0.02] border border-dashed border-surface-border">
                No BZX/USDT swaps yet. Your executions will appear here.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-hide pr-1">
                {history.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between rounded-xl border border-surface-border bg-white/[0.02] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{swapRouteLabel(o)}</p>
                      <p className="text-[11px] font-mono text-white/45 mt-0.5 truncate">
                        {fmt(o.filled ?? o.amount, 4)} · {String(o.status || '').replace('_', ' ')}
                      </p>
                    </div>
                    <span className="text-[10px] text-white/40 shrink-0 ml-2">{fmtDate(o.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/dashboard"
              className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-gold-light hover:underline"
            >
              View all orders on Dashboard
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
