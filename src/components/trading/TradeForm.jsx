import { useState, useEffect, useMemo, useRef } from 'react';
import { Wallet, Plus, TrendingUp, AlertCircle, CheckCircle, Shield, Clock } from 'lucide-react';
import { useAuth, authFetch } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  validateSpotOrder,
  MIN_BASE_AMOUNT,
  MIN_ORDER_VALUE_USDT,
  MARKET_BUY_LOCK_BUFFER,
  parseLimitPrice,
  parseMarketReferencePrice,
  parseAmount,
} from '@/lib/tradeRules';

const API  = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const PCTS = [25, 50, 75, 100];
const FEE_RATE = 0.001;

/** Format ticker last for display / placeholders (live-updating when `n` changes each tick). */
function fmtLiveUsdt(n) {
  if (n == null || !Number.isFinite(Number(n)) || Number(n) <= 0) return '—';
  const v = Number(n);
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1) return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  return v.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 });
}

/** Trim trailing zeros for order form strings. */
function trimDecimalString(s, maxDecimals) {
  if (s == null || s === '') return '';
  const n = parseFloat(String(s).replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return '';
  const t = Math.floor(n * 10 ** maxDecimals + 1e-12) / 10 ** maxDecimals;
  let out = t.toFixed(maxDecimals);
  out = out.replace(/\.?0+$/, '');
  return out || '0';
}

export default function TradeForm({ symbol, lastPrice, limitPriceSeed = '', initialSide }) {
  const { user, balance, fetchWallet, fetchOrders, fetchLiveSpotPositions, kyc } = useAuth();
  const navigate = useNavigate();
  const base = symbol.replace('USDT', '');

  const [side,    setSide]    = useState(
    initialSide === 'sell' ? 'sell' : initialSide === 'buy' ? 'buy' : 'buy',
  );

  useEffect(() => {
    if (initialSide === 'buy' || initialSide === 'sell') setSide(initialSide);
  }, [initialSide, symbol]);
  const [type,    setType]    = useState('limit');
  const [price,   setPrice]   = useState('');
  const [amount,  setAmount]  = useState('');
  /** Limit order: quote (USDT) notional — synced with amount × limit price in real time. */
  const [totalUsdt, setTotalUsdt] = useState('');
  const limitSizeSourceRef = useRef('amount'); // 'amount' | 'total' — which field user last edited for limit sizing
  const amountRef = useRef(amount);
  const totalUsdtRef = useRef(totalUsdt);
  const limitPriceSyncKeyRef = useRef('');
  amountRef.current = amount;
  totalUsdtRef.current = totalUsdt;
  const [placing, setPlacing] = useState(false);
  const [result,  setResult]  = useState(null);

  useEffect(() => {
    setAmount('');
    setTotalUsdt('');
    limitSizeSourceRef.current = 'amount';
    limitPriceSyncKeyRef.current = '';
  }, [symbol]);

  /* Order-book click → prefill limit price only (do not freeze market reference — that uses `lastPrice`). */
  useEffect(() => {
    const s = limitPriceSeed == null ? '' : String(limitPriceSeed).replace(/,/g, '').trim();
    if (!s) return;
    setPrice(s);
  }, [limitPriceSeed, symbol]);

  useEffect(() => {
    if (type === 'market') {
      setTotalUsdt('');
      limitPriceSyncKeyRef.current = '';
    }
  }, [type]);

  const isBuy    = side === 'buy';
  const isMarket = type === 'market';

  /* Limit: when limit price changes (typing or order book), keep amount ↔ total consistent (exchange-style). */
  useEffect(() => {
    if (isMarket) return;
    const px = parseLimitPrice(price);
    if (px == null || px <= 0) return;
    const key = `${symbol}|${price}`;
    if (limitPriceSyncKeyRef.current === key) return;
    limitPriceSyncKeyRef.current = key;
    if (limitSizeSourceRef.current === 'total') {
      const t = parseAmount(totalUsdtRef.current);
      if (t != null && t > 0) setAmount(trimDecimalString(String(t / px), 8));
    } else {
      const a = parseAmount(amountRef.current);
      if (a != null && a > 0) setTotalUsdt(trimDecimalString(String(a * px), 6));
    }
  }, [price, symbol, isMarket]);

  const amtNum   = parseFloat(amount || 0) || 0;
  const markPx   = parseMarketReferencePrice(lastPrice);
  const limitPx  = parseLimitPrice(price);
  const effPrice = isMarket ? (markPx ?? 0) : (limitPx ?? 0);
  const notionalUsdt = effPrice * amtNum;
  const avail    = isBuy ? (balance?.USDT || 0) : (balance?.[base] || 0);

  const limitRestsOnBook =
    !isMarket && markPx != null && limitPx != null
      ? (isBuy ? limitPx < markPx : limitPx > markPx)
      : false;
  const limitMayCross =
    !isMarket && markPx != null && limitPx != null
      ? (isBuy ? limitPx >= markPx : limitPx <= markPx)
      : false;

  const usdtLockLimit = !isMarket && isBuy && limitPx != null ? limitPx * amtNum : null;
  const usdtLockMarket =
    isMarket && isBuy && markPx != null ? markPx * MARKET_BUY_LOCK_BUFFER * amtNum : null;
  const estFeeBuyBase = amtNum > 0 ? amtNum * FEE_RATE : 0;
  const estFeeSellUsdt = notionalUsdt > 0 ? notionalUsdt * FEE_RATE : 0;

  const spotCheck = useMemo(
    () =>
      validateSpotOrder({
        symbol,
        side,
        type,
        amountStr: amount,
        priceStr: price,
        currentPrice: lastPrice,
        balanceUSDT: balance?.USDT ?? 0,
        balanceBase: balance?.[base] ?? 0,
        baseAsset: base,
        userLoggedIn: !!user,
      }),
    [symbol, side, type, amount, price, lastPrice, balance, base, user],
  );

  const setPct = pct => {
    limitSizeSourceRef.current = 'amount';
    const next = isBuy
      ? ((avail * (pct / 100)) / (effPrice || 1)).toFixed(6)
      : ((avail * pct) / 100).toFixed(6);
    setAmount(next);
    if (!isMarket) {
      const px = parseLimitPrice(price);
      const a = parseFloat(next) || 0;
      if (px != null && px > 0 && a > 0) setTotalUsdt(trimDecimalString(String(a * px), 6));
      else setTotalUsdt('');
    }
  };

  const onAmountInputChange = e => {
    const v = e.target.value;
    setAmount(v);
    if (!isMarket) {
      limitSizeSourceRef.current = 'amount';
      const px = parseLimitPrice(price);
      const a = parseAmount(v);
      if (px != null && px > 0 && a != null && a > 0) {
        setTotalUsdt(trimDecimalString(String(a * px), 6));
      } else if (!String(v).trim()) {
        setTotalUsdt('');
      }
    }
  };

  const onTotalUsdtInputChange = e => {
    const v = e.target.value;
    setTotalUsdt(v);
    if (!isMarket) {
      limitSizeSourceRef.current = 'total';
      const px = parseLimitPrice(price);
      const t = parseAmount(v);
      if (px != null && px > 0 && t != null && t > 0) {
        setAmount(trimDecimalString(String(t / px), 8));
      } else if (!String(v).trim()) {
        setAmount('');
      }
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!user) {
      if (!spotCheck.ok && spotCheck.message) {
        setResult({ ok: false, error: spotCheck.message });
        setTimeout(() => setResult(null), 7000);
        return;
      }
      navigate('/login');
      return;
    }
    if (!spotCheck.ok) {
      setResult({ ok: false, error: spotCheck.message || 'Check your order details.' });
      setTimeout(() => setResult(null), 7000);
      return;
    }

    setPlacing(true);
    setResult(null);
    try {
      const body = {
        symbol, side, type,
        amount: parseFloat(amount),
        ...(isMarket ? {} : { price: parseFloat(price) }),
      };
      const res  = await authFetch(`${API}/api/orders`, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Order placement failed');
      setResult({ ok: true, order: data });
      setAmount('');
      setTotalUsdt('');
      limitSizeSourceRef.current = 'amount';
      limitPriceSyncKeyRef.current = '';
      if (!isMarket) setPrice('');
      await Promise.all([fetchWallet(), fetchOrders(), fetchLiveSpotPositions()]);
      setTimeout(() => setResult(null), 5500);
    } catch (err) {
      setResult({ ok: false, error: err.message });
      setTimeout(() => setResult(null), 7000);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-DEFAULT">

      {/* Buy / Sell tabs */}
      <div className="flex border-b border-surface-border flex-shrink-0">
        {['buy', 'sell'].map(s => (
          <button key={s} type="button" onClick={() => setSide(s)}
            className={`flex-1 py-4 text-base font-extrabold capitalize transition-colors border-b-2 tracking-wide ${
              side === s
                ? s === 'buy'
                  ? 'border-green-400 text-green-400 bg-green-500/[.07]'
                  : 'border-red-400 text-red-400 bg-red-500/[.07]'
                : 'border-transparent text-white hover:text-white'
            }`}>
            {s === 'buy' ? `▲ Buy ${base}` : `▼ Sell ${base}`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 scrollbar-hide">

        {/* Order type */}
        <div className="flex gap-2 bg-surface-card rounded-xl p-1.5">
          {['limit', 'market'].map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`flex-1 py-2.5 text-sm capitalize rounded-lg font-bold transition-colors ${
                type === t ? 'bg-surface-hover text-white shadow' : 'text-white hover:text-white'
              }`}>{t === 'limit' ? 'Limit' : 'Market'}</button>
          ))}
        </div>
        <p className="text-[11px] text-white/55 px-0.5 leading-relaxed -mt-2">
          {isMarket
            ? 'Fills at the best available prices now. Size is in ' + base + ' (same as API). Totals below track the last price in real time.'
            : 'Sets a firm price: your order rests on the book until the market reaches this price or better.'}
        </p>

        {/* Available balance + deposit */}
        <div className="flex items-center justify-between gap-2 text-sm text-white px-1">
          <span className="flex items-center gap-1.5 font-semibold min-w-0">
            <Wallet size={14} className="shrink-0" aria-hidden /> Available
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-white font-mono font-bold text-base tabular-nums">
              {isBuy
                ? `${avail.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`
                : `${avail.toFixed(6)} ${base}`}
            </span>
            <Link
              to="/wallet?tab=deposit"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gold/35 bg-gold/10 text-gold-light hover:bg-gold/20 hover:border-gold/55 transition-colors"
              title="Deposit"
              aria-label="Deposit"
            >
              <Plus size={20} strokeWidth={2.75} className="shrink-0" aria-hidden />
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Price input */}
          {!isMarket ? (
            <div>
              <label className="block text-xs text-white mb-1 uppercase tracking-widest font-extrabold">
                Limit price
              </label>
              <p className="text-[10px] text-white/55 mb-2 px-0.5">
                USDT you pay per 1 {base} (quote per base).
              </p>
              <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 transition-colors ${
                spotCheck.errors.price ? 'border-red-500/50' : 'border-surface-border focus-within:border-gold/60'
              }`}>
                <input
                  type="number" step="any" min="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder={markPx != null ? String(markPx) : '0'}
                  className="flex-1 bg-transparent text-lg text-white outline-none font-mono font-semibold"
                  aria-label="Limit price in USDT"
                />
                <span className="text-sm text-white ml-2 font-bold flex-shrink-0">USDT</span>
              </div>
              {spotCheck.errors.price && (
                <p className="text-xs text-red-400 mt-1.5 font-semibold">{spotCheck.errors.price}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs text-white mb-1 uppercase tracking-widest font-extrabold">
                Last price
              </label>
              <p className="text-[10px] text-white/55 mb-2 px-0.5">
                Reference for sizing &amp; previews (updates with each ticker). Order fills at actual book prices.
              </p>
              <div className="bg-surface-card border border-surface-border rounded-xl px-4 py-3.5 flex justify-between items-center">
                <span className="text-sm text-white font-bold">USDT</span>
                <span className="text-lg text-white font-mono font-bold tabular-nums">
                  {markPx != null && markPx > 0 ? `$${fmtLiveUsdt(markPx)}` : '—'}
                </span>
              </div>
              {spotCheck.errors.price && (
                <p className="text-xs text-red-400 mt-1.5 font-semibold">{spotCheck.errors.price}</p>
              )}
            </div>
          )}

          {/* Amount input */}
          <div>
            <label className="block text-xs text-white mb-1 uppercase tracking-widest font-extrabold">
              {isMarket ? 'Amount (size)' : 'Amount'}
            </label>
            <p className="text-[10px] text-white/70 px-0.5 mb-2 leading-relaxed">
              Order size in <span className="text-white font-semibold">{base}</span>
              {' '}· Min {MIN_BASE_AMOUNT} {base} · Min notional ${MIN_ORDER_VALUE_USDT.toFixed(2)} USDT
              {isMarket && isBuy && (
                <> · Buy locks ≈ {((MARKET_BUY_LOCK_BUFFER - 1) * 100).toFixed(1)}% above last for slippage</>
              )}
            </p>
            <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 transition-colors ${
              spotCheck.errors.amount || spotCheck.errors.balance
                ? 'border-red-500/50'
                : 'border-surface-border focus-within:border-gold/60'
            }`}>
              <input
                type="number" step="any" min="0"
                value={amount}
                onChange={onAmountInputChange}
                placeholder="0.0000"
                className="flex-1 bg-transparent text-lg text-white outline-none font-mono font-semibold"
              />
              <span className="text-sm text-white ml-2 font-bold flex-shrink-0">{base}</span>
            </div>
            {spotCheck.errors.amount && (
              <p className="text-xs text-red-400 mt-1.5 font-semibold">{spotCheck.errors.amount}</p>
            )}
            {spotCheck.errors.balance && (
              <p className="text-xs text-red-400 mt-1.5 font-semibold">{spotCheck.errors.balance}</p>
            )}
            {spotCheck.errors.symbol && (
              <p className="text-xs text-red-400 mt-1.5 font-semibold">{spotCheck.errors.symbol}</p>
            )}
          </div>

          {!isMarket && (
            <div>
              <label className="block text-xs text-white mb-1 uppercase tracking-widest font-extrabold">
                Total
              </label>
              <p className="text-[10px] text-white/70 px-0.5 mb-2 leading-relaxed">
                Order value in <span className="text-white font-semibold">USDT</span>
                {' '}(updates live with limit price and {base} size). Edit total to size by quote; edit {base} to size by base.
              </p>
              <div className={`flex items-center bg-surface-card border rounded-xl px-4 py-3.5 transition-colors ${
                spotCheck.errors.total ? 'border-red-500/50' : 'border-surface-border focus-within:border-gold/60'
              }`}>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={totalUsdt}
                  onChange={onTotalUsdtInputChange}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-lg text-white outline-none font-mono font-semibold"
                  aria-label="Limit order total in USDT"
                />
                <span className="text-sm text-white ml-2 font-bold flex-shrink-0">USDT</span>
              </div>
              {spotCheck.errors.total && (
                <p className="text-xs text-red-400 mt-1.5 font-semibold">{spotCheck.errors.total}</p>
              )}
            </div>
          )}

          {/* % quick-fill buttons */}
          <div className="grid grid-cols-4 gap-2">
            {PCTS.map(pct => (
              <button key={pct} type="button" onClick={() => setPct(pct)}
                className="py-3 text-sm rounded-xl bg-surface-card text-white
                  hover:bg-gold/10 hover:text-gold-light
                  border border-surface-border transition-colors font-bold">
                {pct}%
              </button>
            ))}
          </div>

          {/* Live order summary */}
          <div className="bg-surface-card border border-surface-border rounded-xl px-4 py-4 space-y-2.5">
            <p className="text-[10px] text-white/60 uppercase tracking-widest font-extrabold mb-1">
              Order summary {isMarket ? '(market · live)' : '(limit)'}
            </p>

            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80 font-semibold">Last price</span>
              <span className="text-white font-mono font-bold tabular-nums">
                {markPx != null && markPx > 0 ? `$${fmtLiveUsdt(markPx)}` : '—'}
              </span>
            </div>

            {!isMarket && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80 font-semibold">Your limit</span>
                <span className="text-gold-light font-mono font-bold tabular-nums">
                  {limitPx != null ? `$${limitPx.toLocaleString(undefined, { maximumFractionDigits: 8 })}` : '—'}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80 font-semibold">Size</span>
              <span className="text-white font-mono font-bold tabular-nums">
                {amtNum > 0 ? `${amtNum.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${base}` : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80 font-semibold">{isMarket ? 'Est. total (USDT)' : 'Total (USDT)'}</span>
              <span className="text-white font-mono font-bold tabular-nums">
                {amtNum > 0 && effPrice > 0 ? `$${notionalUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '—'}
              </span>
            </div>

            {isBuy && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80 font-semibold">
                  {isMarket ? 'USDT reserved (incl. buffer)' : 'USDT reserved (locked)'}
                </span>
                <span className="text-white font-mono font-bold tabular-nums">
                  {isMarket
                    ? (usdtLockMarket != null && amtNum > 0
                      ? `≈ ${usdtLockMarket.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
                      : '—')
                    : (usdtLockLimit != null && amtNum > 0
                      ? usdtLockLimit.toLocaleString(undefined, { maximumFractionDigits: 4 })
                      : '—')}
                </span>
              </div>
            )}

            {!isBuy && amtNum > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80 font-semibold">{base} locked</span>
                <span className="text-white font-mono font-bold tabular-nums">
                  {amtNum.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                </span>
              </div>
            )}

            {amtNum > 0 && (
              <div className="flex items-center justify-between text-xs text-white pt-2 border-t border-surface-border/60">
                <span className="font-semibold">Est. fee ({(FEE_RATE * 100).toFixed(1)}%)</span>
                <span className="font-mono font-bold text-white">
                  {isBuy
                    ? `${estFeeBuyBase.toFixed(6)} ${base}`
                    : `${estFeeSellUsdt.toFixed(4)} USDT`}
                </span>
              </div>
            )}

            {!isMarket && markPx != null && limitPx != null && amtNum > 0 && (
              <div
                className={`rounded-lg px-3 py-2 text-xs font-bold leading-snug ${
                  limitRestsOnBook
                    ? 'bg-blue-500/10 text-blue-300 border border-blue-500/25'
                    : limitMayCross
                      ? 'bg-amber-500/10 text-amber-200 border border-amber-500/25'
                      : 'bg-white/5 text-white/70 border border-white/10'
                }`}
              >
                {limitRestsOnBook
                  ? 'Rests on the order book until the market reaches your limit. Unfilled size stays in Open orders.'
                  : limitMayCross
                    ? 'At or better than mark — matches visible liquidity first; any remainder stays in Open orders as a limit.'
                    : 'Limit vs mark — check price and size.'}
              </div>
            )}
          </div>

          {/* Not logged in */}
          {!user && (
            <div className="text-center py-2">
              <p className="text-sm text-white mb-3">Sign in to start trading</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => navigate('/login')}
                  className="flex-1 py-3 bg-gold/90 hover:bg-gold text-surface-dark font-bold rounded-xl text-sm transition-all">
                  Log In
                </button>
                <button type="button" onClick={() => navigate('/register')}
                  className="flex-1 py-3 border border-gold/30 text-gold-light hover:bg-gold/10 font-bold rounded-xl text-sm transition-all">
                  Register
                </button>
              </div>
            </div>
          )}

          {/* KYC gate */}
          {user && kyc?.status !== 'approved' && (
            <div className={`rounded-xl p-4 border ${
              kyc?.status === 'pending'
                ? 'bg-amber-500/8 border-amber-500/25'
                : 'bg-red-500/8 border-red-500/25'
            }`}>
              <p className={`font-extrabold flex items-center gap-2 mb-2 text-sm ${
                kyc?.status === 'pending' ? 'text-amber-300' : 'text-red-300'}`}>
                {kyc?.status === 'pending'
                  ? <><Clock size={14} /> KYC Under Review</>
                  : <><Shield size={14} /> KYC Verification Required</>}
              </p>
              <p className="text-white text-xs mb-3 leading-relaxed">
                {kyc?.status === 'pending'
                  ? 'Your documents are being reviewed. Trading will be enabled once approved.'
                  : kyc?.status === 'rejected'
                  ? 'Your KYC was rejected. Please resubmit with valid documents.'
                  : 'Complete identity verification to start trading on BITZX Exchange.'}
              </p>
              <Link to="/kyc"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold ${
                  kyc?.status === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-gold/20 text-gold-light hover:bg-gold/30'
                } transition-colors`}>
                <Shield size={13} />
                {kyc?.status === 'pending' ? 'Check Status' : kyc?.status === 'rejected' ? 'Resubmit KYC' : 'Verify Now →'}
              </Link>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={
              placing
              || (user && kyc?.status !== 'approved')
              || !spotCheck.ok
            }
            className={`w-full py-4 rounded-xl font-extrabold text-base tracking-wider
              transition-all disabled:opacity-40 active:scale-[.98] ${
              isBuy
                ? 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-900/30'
                : 'bg-red-500   hover:bg-red-400   text-white shadow-lg shadow-red-900/30'
            }`}>
            {placing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Placing Order…
              </span>
            ) : isBuy
              ? `Buy ${base}`
              : `Sell ${base}`}
          </button>
        </form>

        {/* Result toast */}
        {result && (
          <div className={`rounded-xl p-4 space-y-2 ${
            result.ok
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            {result.ok ? (
              <>
                <p className="text-sm text-green-400 font-extrabold flex items-center gap-2">
                  <CheckCircle size={15} />
                  {result.order.status === 'filled'
                    ? 'Order filled'
                    : result.order.status === 'open'
                      ? 'Limit order placed — see Open orders'
                      : result.order.status === 'partially_filled'
                        ? 'Partially filled — remainder in Open orders'
                        : `Order: ${result.order.status}`}
                </p>
                <p className="text-sm text-white font-mono">
                  {result.order.side.toUpperCase()}{' '}
                  {result.order.type === 'limit' && result.order.price
                    ? `@ $${Number(result.order.price).toLocaleString(undefined, { maximumFractionDigits: 8 })} · `
                    : ''}
                  rem {Number(result.order.remaining ?? result.order.amount).toFixed(6)} /{' '}
                  {Number(result.order.amount).toFixed(6)} {base}
                  {result.order.avg_price > 0 && result.order.filled > 0 && (
                    <span>{` · avg $${Number(result.order.avg_price).toFixed(4)}`}</span>
                  )}
                </p>
                {result.order.total_fee > 0 && (
                  <p className="text-xs text-white font-mono">
                    Fee: {result.order.total_fee.toFixed(6)} {result.order.total_fee_asset}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-red-400 flex items-center gap-2 font-semibold">
                <AlertCircle size={15} /> {result.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
