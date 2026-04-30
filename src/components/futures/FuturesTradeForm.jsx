/**
 * FuturesTradeForm
 *
 * Price field behaviour (identical to spot TradeForm):
 *   - Starts EMPTY. The current mark/best-bid-ask is shown only as a placeholder.
 *   - User types their own price freely. It never auto-overwrites what they typed.
 *   - "Latest" button → one-shot snap to the current best bid (buy) or ask (sell),
 *     exactly like clicking a level in the order book. After that the field is
 *     static again — no live tracking.
 *   - When price changes → qty / order-value / margin re-derive from whichever
 *     size field was last edited (sizeSourceRef), identical to spot's
 *     amount ↔ total sync.
 *
 * Bidirectional Quantity ↔ Order value (USDT) ↔ Margin (USDT):
 *   Edit any one of the three → the other two recalculate instantly.
 *
 * Leverage change → Margin re-derives; order value / qty are unchanged.
 *
 * Symbol switch → all inputs reset.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFutures } from '@/context/FuturesContext';
import { futuresApi } from '@/services/futuresApi';
import LeverageSelector from './LeverageSelector';

const TYPES = [
  { id: 'limit',      label: 'Limit'  },
  { id: 'market',     label: 'Market' },
  { id: 'stop_limit', label: 'Stop'   },
];

const SIZE_PCTS = [10, 25, 50, 75, 100];

const MAKER_FEE_RATE       = 0.0002;
const TAKER_FEE_RATE       = 0.0005;
const MMR_DEFAULT_FOR_HINT = 0.005;

// ── Number helpers ────────────────────────────────────────────────────────

function decimalsFor(step) {
  const t = Number(step) || 0.01;
  if (t >= 1) return 0;
  return Math.max(0, Math.min(8, -Math.floor(Math.log10(t))));
}

/** Align to nearest tick and render with tick's natural precision. */
function tickAlign(value, tick) {
  if (!Number.isFinite(value) || value <= 0) return '';
  const t = Number(tick) || 0.01;
  const v = Math.round(value / t) * t;
  return v.toFixed(decimalsFor(t));
}

/** Floor a quantity to the nearest lot and strip trailing zeros. */
function lotFloor(value, lot) {
  if (!Number.isFinite(value) || value <= 0) return '';
  const t = Number(lot) || 0.001;
  const v = Math.floor(value / t) * t;
  if (v <= 0) return '';
  return v.toFixed(decimalsFor(t)).replace(/\.?0+$/, '') || '0';
}

/** Round a USDT amount to ``dp`` decimals, strip trailing zeros. */
function trimUsdt(value, dp = 4) {
  if (!Number.isFinite(value) || value <= 0) return '';
  return value.toFixed(dp).replace(/\.?0+$/, '');
}

/** Walk the visible order-book to estimate a market order's avg / worst / slippage. */
function walkBook(levels, qty) {
  if (!levels?.length || !qty || qty <= 0) return null;
  let need = qty;
  let cost = 0;
  let last = 0;
  for (const lv of levels) {
    const lvQty = Number(lv.qty || 0);
    const lvPx  = Number(lv.price || 0);
    if (lvQty <= 0 || lvPx <= 0) continue;
    const take = Math.min(need, lvQty);
    cost += take * lvPx;
    last  = lvPx;
    need -= take;
    if (need <= 1e-12) break;
  }
  const filled = qty - Math.max(0, need);
  if (filled <= 0) return null;
  const avg = cost / filled;
  const top = Number(levels[0]?.price || 0);
  return {
    avg, last,
    exhausted: need > 1e-12,
    filled,
    slippage_pct: top ? Math.abs(avg - top) / top * 100 : 0,
  };
}

// ── Main component ────────────────────────────────────────────────────────

export default function FuturesTradeForm({ symbol, limitPriceSeed = null }) {
  const { user } = useAuth();
  const {
    wallet, settings, placeOrder, activeMark, symbols, orderbook, recentTrades,
  } = useFutures();

  // ── Derived symbol metadata ──────────────────────────────────────────
  const meta     = useMemo(() => symbols.find((s) => s.symbol === symbol) || {}, [symbols, symbol]);
  const base     = meta.base || (symbol || '').replace(/USDT.*/i, '') || 'BASE';
  const leverage = settings[symbol]?.leverage ?? 10;
  const tick     = Number(meta.tick_size || 0.01);
  const lot      = Number(meta.lot_size  || 0.001);
  const free     = Number(wallet?.free_margin || 0);

  // ── Live market data ─────────────────────────────────────────────────
  // REST-seed the mark price so the placeholder is visible immediately,
  // before the first WS tick arrives.
  const [seedMark, setSeedMark] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setSeedMark(0);
    if (!symbol) return undefined;
    futuresApi.markPrice(symbol)
      .then((r) => { if (!cancelled) setSeedMark(Number(r?.mark_price || 0)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [symbol]);

  const wsMark  = Number(activeMark?.mark_price  || 0);
  const mark    = wsMark || seedMark;
  const index   = Number(activeMark?.index_price || 0) || seedMark;
  const bestBid = Number(orderbook?.bids?.[0]?.price || 0);
  const bestAsk = Number(orderbook?.asks?.[0]?.price || 0);
  const spread  = bestBid > 0 && bestAsk > 0 ? bestAsk - bestBid : 0;
  const last    = Number(recentTrades?.[0]?.price || 0);

  // ── User inputs ──────────────────────────────────────────────────────
  const [side,       setSide]    = useState('buy');
  const [type,       setType]    = useState('limit');
  const [price,      setPrice]   = useState('');     // empty by default (same as spot)
  const [stopPrice,  setStop]    = useState('');
  const [qty,        setQty]     = useState('');
  const [totalUsdt,  setTotal]   = useState('');     // order value = qty × price
  const [marginUsdt, setMargin]  = useState('');     // = totalUsdt / leverage
  const [reduceOnly, setRO]      = useState(false);
  const [tif,        setTif]     = useState('GTC');
  const [busy,       setBusy]    = useState(false);
  const [err,        setErr]     = useState(null);
  const [ok,         setOk]      = useState(null);

  // Tracks which size field the user last touched so that when the price
  // changes (user typing or "Latest" snap) the correct companion field is
  // re-derived, identical to spot's `limitSizeSourceRef`.
  const sizeSourceRef  = useRef('qty');
  // De-dup key so the price-change sync effect doesn't re-run for the same
  // (symbol, price) pair twice in a row — same technique as spot's
  // `limitPriceSyncKeyRef`.
  const priceSyncKeyRef = useRef('');

  // Stable mirrors so the price-sync effect can read them without adding
  // them to its dependency array (prevents feedback loops).
  const qtyRef    = useRef(qty);
  const totalRef  = useRef(totalUsdt);
  const marginRef = useRef(marginUsdt);
  qtyRef.current    = qty;
  totalRef.current  = totalUsdt;
  marginRef.current = marginUsdt;

  // ── Reset on symbol change ───────────────────────────────────────────
  useEffect(() => {
    setPrice(''); setStop(''); setQty(''); setTotal(''); setMargin('');
    setErr(null); setOk(null);
    sizeSourceRef.current  = 'qty';
    priceSyncKeyRef.current = '';
  }, [symbol]);

  // ── Order-book row click → pre-fill price ────────────────────────────
  // `limitPriceSeed` is { symbol, price } — we only apply it when the seed
  // is for THIS symbol, so switching pairs never carries over a stale price.
  useEffect(() => {
    if (!limitPriceSeed?.price || limitPriceSeed.symbol !== symbol) return;
    priceSyncKeyRef.current = ''; // allow the sync effect to re-run
    setPrice(String(limitPriceSeed.price));
  }, [limitPriceSeed, symbol]);

  // Clear sizes when switching to market (no price, no total field).
  useEffect(() => {
    if (type === 'market') {
      setTotal('');
      priceSyncKeyRef.current = '';
    }
  }, [type]);

  // ── Price → size sync (same as spot's equivalent effect) ────────────
  // When the limit price changes (user typing or "Latest" button), keep
  // qty / order-value / margin consistent.
  useEffect(() => {
    if (type === 'market') return;
    const px = parseFloat(price);
    if (!Number.isFinite(px) || px <= 0) return;
    const key = `${symbol}|${price}`;
    if (priceSyncKeyRef.current === key) return;
    priceSyncKeyRef.current = key;

    const lev = Math.max(1, leverage);
    const src = sizeSourceRef.current;

    if (src === 'total') {
      const t = parseFloat(totalRef.current);
      if (Number.isFinite(t) && t > 0) {
        setQty(lotFloor(t / px, lot));
        setMargin(trimUsdt(t / lev, 4));
      }
    } else if (src === 'margin') {
      const m = parseFloat(marginRef.current);
      if (Number.isFinite(m) && m > 0) {
        const tot = m * lev;
        setTotal(trimUsdt(tot, 4));
        setQty(lotFloor(tot / px, lot));
      }
    } else {
      // default: qty is the source
      const q = parseFloat(qtyRef.current);
      if (Number.isFinite(q) && q > 0) {
        const tot = q * px;
        setTotal(trimUsdt(tot, 4));
        setMargin(trimUsdt(tot / lev, 4));
      }
    }
  }, [price, symbol, type, leverage, lot]);

  // ── Effective price for market-order previews ────────────────────────
  // For limit the user's typed price is the reference; for market we use
  // the relevant side of the book / mark so the summary is honest.
  const limitPx  = type !== 'market' ? (parseFloat(price) || 0) : 0;
  const marketPx = type === 'market'
    ? (side === 'buy' ? (bestAsk || mark || bestBid || last) : (bestBid || mark || bestAsk || last))
    : 0;
  const refPx = type === 'market' ? marketPx : limitPx;

  // ── Bidirectional size-field onChange handlers ───────────────────────
  // Each handler sets its own field and re-derives the other two.

  const onQtyChange = (raw) => {
    sizeSourceRef.current = 'qty';
    setQty(raw);
    const px  = refPx;
    const lev = Math.max(1, leverage);
    const q   = parseFloat(raw);
    if (!Number.isFinite(q) || q <= 0 || px <= 0) { setTotal(''); setMargin(''); return; }
    const tot = q * px;
    setTotal(trimUsdt(tot, 4));
    setMargin(trimUsdt(tot / lev, 4));
  };

  const onTotalChange = (raw) => {
    sizeSourceRef.current = 'total';
    setTotal(raw);
    const px  = refPx;
    const lev = Math.max(1, leverage);
    const t   = parseFloat(raw);
    if (!Number.isFinite(t) || t <= 0 || px <= 0) { setQty(''); setMargin(''); return; }
    setQty(lotFloor(t / px, lot));
    setMargin(trimUsdt(t / lev, 4));
  };

  const onMarginChange = (raw) => {
    sizeSourceRef.current = 'margin';
    setMargin(raw);
    const px  = refPx;
    const lev = Math.max(1, leverage);
    const m   = parseFloat(raw);
    if (!Number.isFinite(m) || m <= 0) { setQty(''); setTotal(''); return; }
    const tot = m * lev;
    setTotal(trimUsdt(tot, 4));
    if (px > 0) setQty(lotFloor(tot / px, lot));
    else setQty('');
  };

  // ── Leverage-change propagation ──────────────────────────────────────
  // When leverage changes, re-derive Margin from the current order value.
  const prevLevRef = useRef(leverage);
  useEffect(() => {
    if (leverage === prevLevRef.current) return;
    prevLevRef.current = leverage;
    const lev = Math.max(1, leverage);
    const t   = parseFloat(totalRef.current);
    if (Number.isFinite(t) && t > 0) {
      setMargin(trimUsdt(t / lev, 4));
    }
  }, [leverage]);

  // ── Derived summary values ───────────────────────────────────────────
  const qtyNum        = Math.max(0, parseFloat(qty || 0) || 0);
  const notional      = type === 'market' && qtyNum > 0 ? qtyNum * marketPx : qtyNum * limitPx;
  const initialMargin = leverage > 0 && notional > 0 ? notional / leverage : 0;
  const insufficient  = !!user && initialMargin > 0 && initialMargin > free;

  const marketFill = useMemo(() => {
    if (type !== 'market' || qtyNum <= 0) return null;
    const levels = side === 'buy' ? orderbook?.asks : orderbook?.bids;
    return walkBook(levels, qtyNum);
  }, [type, side, qtyNum, orderbook]);

  // Maker when the limit price rests without crossing; taker when it crosses.
  const limitRestsBook = !!(
    type === 'limit' && mark > 0 && limitPx > 0 &&
    (side === 'buy' ? limitPx < mark : limitPx > mark)
  );
  const limitCrossBook = !!(
    type === 'limit' && mark > 0 && limitPx > 0 && !limitRestsBook
  );
  const limitRole = type === 'limit' && limitPx > 0
    ? (limitRestsBook ? 'maker' : 'taker')
    : null;

  const feeRate = limitRole === 'maker' ? MAKER_FEE_RATE : TAKER_FEE_RATE;
  const estFee  = notional * feeRate;
  const liqEst  = (() => {
    if (!refPx || !leverage) return null;
    const factor = side === 'buy'
      ? 1 - 1 / leverage + MMR_DEFAULT_FOR_HINT
      : 1 + 1 / leverage - MMR_DEFAULT_FOR_HINT;
    const v = refPx * factor;
    return v > 0 ? v : null;
  })();

  // ── % of free margin shortcut ─────────────────────────────────────────
  const onPickPct = (pct) => {
    if (!refPx || refPx <= 0 || !free) return;
    const targetMargin = (free * pct) / 100;
    onMarginChange(trimUsdt(targetMargin, 4));
  };

  // ── "Latest" button ───────────────────────────────────────────────────
  // One-shot snap to the best bid (buy) / best ask (sell), exactly like
  // clicking an order-book row in the spot view. After the snap the field
  // stays static until the user types or clicks Latest again.
  const snapToLatest = () => {
    const ref = side === 'buy'
      ? (bestBid || mark || bestAsk || last)
      : (bestAsk || mark || bestBid || last);
    if (!ref) return;
    const aligned = tickAlign(ref, tick);
    priceSyncKeyRef.current = ''; // force sync effect to re-run
    setPrice(aligned);
  };

  // ── Order submission ─────────────────────────────────────────────────
  const submit = async () => {
    setErr(null); setOk(null);
    try {
      setBusy(true);
      const order = await placeOrder({
        symbol, side, type,
        quantity:   qtyNum,
        price:      type === 'market' ? null : limitPx || null,
        stop_price: type === 'stop_limit' ? (parseFloat(stopPrice) || null) : null,
        leverage, tif,
        reduce_only: reduceOnly,
      });
      setOk(`Order ${order.id?.slice(0, 12)}… ${order.status}`);
      setQty(''); setTotal(''); setMargin('');
      sizeSourceRef.current = 'qty';
    } catch (e) {
      setErr(e?.detail || e?.message || 'order failed');
    } finally {
      setBusy(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────

  // ── Placeholder for the price input ─────────────────────────────────
  // Shows the live mark/best-bid-ask so the user knows what level to fill
  // at — but it never auto-writes to the field.
  const pricePlaceholder = (() => {
    const ref = side === 'buy'
      ? (bestBid || mark || bestAsk || last)
      : (bestAsk || mark || bestBid || last);
    return ref ? tickAlign(ref, tick) : '0.00';
  })();

  return (
    <div className="bg-white/[.02] border border-white/10 rounded-xl p-3 space-y-3">

      {/* ── Buy / Sell tabs ── */}
      <div className="flex gap-2">
        {['buy', 'sell'].map((id) => {
          const isBuy = id === 'buy';
          const active = side === id;
          const color = isBuy
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
            : 'bg-rose-500/15 text-rose-300 border-rose-400/40';
          return (
            <button key={id} onClick={() => setSide(id)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-extrabold transition-colors flex items-center justify-center gap-1.5 ${
                active
                  ? `${color} border`
                  : 'bg-white/[.04] text-white/55 hover:bg-white/[.07] border border-transparent'
              }`}>
              {isBuy ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {isBuy ? `Buy ${base} / Long` : `Sell ${base} / Short`}
            </button>
          );
        })}
      </div>

      {/* ── Order type ── */}
      <div className="flex flex-wrap gap-1">
        {TYPES.map((t) => (
          <button key={t.id}
            onClick={() => setType(t.id)}
            className={`px-3 py-1 text-xs rounded-md font-bold transition-colors ${
              type === t.id
                ? 'bg-amber-300/15 text-amber-300 border border-amber-300/40'
                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'}`}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Live market ticker ── */}
      <div className="rounded-lg bg-black/30 border border-white/[0.06] px-3 py-2 grid grid-cols-2 gap-y-1 text-[11px]">
        <PriceCell label="Mark"     value={mark}    cls="text-amber-200" />
        <PriceCell label="Index"    value={index}   cls="text-white/75" />
        <PriceCell label="Best bid" value={bestBid} cls="text-emerald-300" />
        <PriceCell label="Best ask" value={bestAsk} cls="text-rose-300" />
        <div className="flex items-center justify-between col-span-2 mt-1 pt-1 border-t border-white/5">
          <span className="text-white/50">Spread</span>
          <span className="font-mono text-white">
            {spread > 0
              ? <>{tickAlign(spread, tick)}{' '}
                  <span className="text-white/40">
                    ({mark > 0 ? ((spread / mark) * 100).toFixed(3) : '—'}%)
                  </span>
                </>
              : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between col-span-2">
          <span className="text-white/50">Last trade</span>
          <span className="font-mono text-white">{last ? tickAlign(last, tick) : '—'}</span>
        </div>
      </div>

      {/* ── Leverage ── */}
      <LeverageSelector symbol={symbol} max={meta.max_leverage} />

      {/* ── Available margin ── */}
      <div className="rounded-lg bg-black/30 border border-white/5 px-3 py-2 flex items-center justify-between text-xs">
        <span className="text-white/55">Available margin</span>
        <span className="font-mono text-white">
          {free.toFixed(2)} <span className="text-white/40">USDT</span>
        </span>
      </div>

      {/* ── Price input — limit / stop_limit ── */}
      {type === 'market' ? (
        /* Market: read-only reference (same as spot's "Last price" display) */
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">
            Reference price (market)
          </label>
          <p className="text-[10px] text-white/40 mb-1.5">
            Order fills at the best available prices — totals below use this reference for sizing.
          </p>
          <div className="flex items-center justify-between bg-black/30 border border-white/[.06] rounded-lg px-3 py-2.5">
            <span className="text-xs text-white/50 font-bold">
              {side === 'buy' ? 'Best ask' : 'Best bid'}
            </span>
            <span className="font-mono text-sm text-white font-bold">
              {pricePlaceholder || '—'}
            </span>
          </div>
        </div>
      ) : (
        <div>
          {/* Header row: label + "Latest" snap button (identical to clicking the book) */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">
              Price (USDT)
            </span>
            <button
              type="button"
              onClick={snapToLatest}
              title={`Snap to current ${side === 'buy' ? 'best bid' : 'best ask'}`}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:text-amber-200 transition-colors"
            >
              <RefreshCw size={10} /> Latest
            </button>
          </div>
          <input
            type="number"
            inputMode="decimal"
            step={tick}
            value={price}
            onChange={(e) => {
              priceSyncKeyRef.current = ''; // allow the sync effect to fire
              setPrice(e.target.value);
            }}
            placeholder={pricePlaceholder}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-300/50 placeholder:text-white/30"
          />
          {/* Maker / taker hint */}
          {limitRole && (
            <p className={`text-[10px] mt-1 ${limitRole === 'maker' ? 'text-emerald-300' : 'text-amber-300'}`}>
              <Info size={10} className="inline mr-1" />
              {limitRole === 'maker'
                ? `Rests on the book (maker) — fee ${(MAKER_FEE_RATE * 100).toFixed(3)}%.`
                : `Crosses the book (taker) — fee ${(TAKER_FEE_RATE * 100).toFixed(3)}%.`}
            </p>
          )}
          {limitRestsBook && (
            <p className="text-[10px] mt-1 text-sky-300">
              <Info size={10} className="inline mr-1" />
              Rests on the order book — stays in Open orders until the market reaches your price.
            </p>
          )}
          {limitCrossBook && (
            <p className="text-[10px] mt-1 text-amber-200">
              <Info size={10} className="inline mr-1" />
              At or better than mark — matches visible liquidity first; remainder rests as a limit.
            </p>
          )}
        </div>
      )}

      {/* ── Stop trigger (stop_limit only) ── */}
      {type === 'stop_limit' && (
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">
            Stop trigger (USDT)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step={tick}
            value={stopPrice}
            onChange={(e) => setStop(e.target.value)}
            placeholder={pricePlaceholder}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-300/50 placeholder:text-white/30"
          />
          <p className="text-[10px] text-white/40 mt-1">
            Trigger price that activates the limit order at your "Price" above.
          </p>
        </div>
      )}

      {/* ── Bidirectionally synced size fields ── */}
      <SizeField
        label={`Quantity (${base})`}
        value={qty}
        step={lot}
        unit={base}
        placeholder="0"
        onChange={onQtyChange}
      />

      {/* Order value only makes sense for limit / stop where we know the price */}
      {type !== 'market' && (
        <SizeField
          label="Order value"
          value={totalUsdt}
          step="any"
          unit="USDT"
          placeholder="0.00"
          onChange={onTotalChange}
          hint={`= quantity × price. Edit to size by USDT directly.`}
        />
      )}

      <SizeField
        label={`Margin (${leverage}× leverage)`}
        value={marginUsdt}
        step="any"
        unit="USDT"
        placeholder="0.00"
        onChange={onMarginChange}
        hint="USDT reserved from your wallet = order value ÷ leverage."
        warn={insufficient ? `Exceeds available margin (${free.toFixed(2)} USDT)` : null}
      />

      {/* ── % of free margin shortcuts ── */}
      <div className="grid grid-cols-5 gap-1">
        {SIZE_PCTS.map((p) => (
          <button key={p}
            onClick={() => onPickPct(p)}
            disabled={!user || !refPx || free <= 0}
            className="text-[11px] py-1.5 rounded bg-white/[.04] text-white/70 hover:bg-white/10 disabled:opacity-40 font-bold"
          >{p}%</button>
        ))}
      </div>

      {/* ── Order summary ── */}
      <div className="rounded-lg bg-black/20 border border-white/[0.06] p-2.5 space-y-1.5 text-xs">
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
          Order summary
        </p>
        <SummaryRow label="Pair"
          value={`${base} / USDT-PERP`} />
        <SummaryRow label="Side"
          value={side === 'buy' ? `Long ${base}` : `Short ${base}`}
          cls={side === 'buy' ? 'text-emerald-300' : 'text-rose-300'} />

        {type !== 'market' && limitPx > 0 && (
          <SummaryRow label="Limit price"
            value={`$${tickAlign(limitPx, tick)}`}
            cls="text-amber-300" />
        )}
        {type === 'market' && (
          <SummaryRow label="Reference price"
            value={marketPx > 0 ? `$${tickAlign(marketPx, tick)}` : '—'} />
        )}

        <SummaryRow label="Quantity"
          value={qtyNum > 0 ? `${qtyNum.toFixed(decimalsFor(lot))} ${base}` : '—'} />
        <SummaryRow label="Order value"
          value={notional > 0 ? `${notional.toFixed(2)} USDT` : '—'} />
        <SummaryRow label="Initial margin"
          value={initialMargin > 0 ? `${initialMargin.toFixed(2)} USDT` : '—'}
          cls={insufficient ? 'text-rose-300' : 'text-white'} />
        <SummaryRow label={`Est. fee (${(feeRate * 100).toFixed(3)}%)`}
          value={estFee > 0 ? `${estFee.toFixed(4)} USDT` : '—'} />

        {type === 'market' && marketFill && (
          <>
            <SummaryRow label="Est. avg fill" value={`$${tickAlign(marketFill.avg, tick)}`} />
            <SummaryRow label="Worst fill"    value={`$${tickAlign(marketFill.last, tick)}`} />
            <SummaryRow label="Slippage"
              value={`${marketFill.slippage_pct.toFixed(3)}%`}
              cls={marketFill.slippage_pct > 0.5 ? 'text-rose-300' : 'text-white'} />
            {marketFill.exhausted && (
              <p className="text-[10px] text-rose-300 pt-1">
                <Info size={9} className="inline mr-1" />
                Order book too thin — remainder fills at synthetic mark price if enabled.
              </p>
            )}
          </>
        )}

        {type === 'limit' && qtyNum > 0 && mark > 0 && limitPx > 0 && (
          <SummaryRow label="Distance from mark"
            value={`${(((limitPx - mark) / mark) * 100).toFixed(3)}%`} />
        )}

        <SummaryRow label="Liq. price (est.)"
          value={liqEst ? `$${tickAlign(liqEst, tick)}` : '—'} />
      </div>

      {/* ── TIF + reduce-only ── */}
      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 text-white/60 cursor-pointer">
          <input type="checkbox" checked={reduceOnly}
            onChange={(e) => setRO(e.target.checked)} />
          Reduce only
        </label>
        <select value={tif} onChange={(e) => setTif(e.target.value)}
          className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white">
          <option>GTC</option><option>IOC</option><option>FOK</option>
        </select>
      </div>

      {err && <Banner type="error">{String(err)}</Banner>}
      {ok  && <Banner type="ok">{ok}</Banner>}

      {/* ── Submit button ── */}
      <button
        disabled={
          !user || busy || insufficient || qtyNum <= 0
          || (type !== 'market' && (!price || Number(price) <= 0))
          || (type === 'stop_limit' && (!stopPrice || Number(stopPrice) <= 0))
        }
        onClick={submit}
        className={`w-full py-3 rounded-lg text-sm font-extrabold transition-colors ${
          side === 'buy'
            ? 'bg-emerald-500 hover:bg-emerald-600 text-black'
            : 'bg-rose-500   hover:bg-rose-600   text-white'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {!user    ? 'Sign in to trade'
          : busy  ? 'Placing…'
          : `${side === 'buy' ? 'Buy / Long' : 'Sell / Short'} ${base}`}
      </button>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function SizeField({ label, value, step, unit, placeholder, onChange, hint, warn }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">
        {label}
      </label>
      <div className={`flex items-center bg-black/40 border rounded-lg px-3 py-2.5 transition-colors ${
        warn ? 'border-rose-500/50' : 'border-white/10 focus-within:border-amber-300/50'
      }`}>
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm font-mono text-white placeholder:text-white/25"
        />
        <span className="text-[11px] text-white/45 ml-2 font-bold shrink-0">{unit}</span>
      </div>
      {warn && <p className="text-[10px] mt-1 text-rose-300">{warn}</p>}
      {!warn && hint && <p className="text-[10px] mt-1 text-white/35">{hint}</p>}
    </div>
  );
}

function PriceCell({ label, value, cls }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50">{label}</span>
      <span className={`font-mono ${cls || 'text-white'}`}>
        {value > 0 ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'}
      </span>
    </div>
  );
}

function SummaryRow({ label, value, cls }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/55">{label}</span>
      <span className={`font-mono ${cls || 'text-white'}`}>{value}</span>
    </div>
  );
}

function Banner({ type, children }) {
  const cls = type === 'error'
    ? 'bg-rose-500/10 border-rose-400/30 text-rose-300'
    : 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300';
  return (
    <div className={`text-[11px] rounded border px-2.5 py-1.5 ${cls}`}>{children}</div>
  );
}
