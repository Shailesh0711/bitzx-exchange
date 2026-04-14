/**
 * QuickTradePage — full-screen instant market-order interface.
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  Page header: title + subtitle                                    │
 * ├────────────────────────────┬─────────────────────────────────────┤
 * │  LEFT — Pair grid          │  RIGHT — Order form + Recent fills   │
 * │  Live price cards for all  │  Large buy/sell form, balance,       │
 * │  supported pairs. Click    │  % presets, summary, submit CTA.    │
 * │  to switch.                │  Recent trade history below.         │
 * └────────────────────────────┴─────────────────────────────────────┘
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Zap, AlertCircle, CheckCircle,
  Loader2, RefreshCw, Wallet, Shield, BarChart2,
  ArrowRight, Star, ChevronDown, Search, X,
} from 'lucide-react';
import { COIN_ICONS, PAIRS, exchangeWsPath, normalizeMarketsList } from '@/services/marketApi';
import { useAuth, authFetch } from '@/context/AuthContext';

const API  = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const FEE  = 0.001;
const PCTS = [{ label: '25%', v: 25 }, { label: '50%', v: 50 }, { label: '75%', v: 75 }, { label: 'MAX', v: 100 }];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtPrice(n) {
  const v = parseFloat(n);
  if (!v) return '—';
  if (v >= 10000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1)     return v.toFixed(4);
  return v.toFixed(6);
}
function fmtCompact(n) {
  const v = parseFloat(n);
  if (!v) return '—';
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
  return v.toFixed(2);
}

// ── Pair card ─────────────────────────────────────────────────────────────────
function PairCard({ pair, ticker, isSelected, onSelect }) {
  const base    = pair.base;
  const icon    = COIN_ICONS[base];
  const price   = parseFloat(ticker?.price ?? 0);
  const pct     = parseFloat(ticker?.priceChangePercent ?? 0);
  const isUp    = pct >= 0;

  return (
    <motion.button
      layout
      onClick={() => onSelect(pair.symbol)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
        width: '100%', textAlign: 'left', border: 'none',
        background: isSelected
          ? 'linear-gradient(135deg, rgba(156,121,65,0.18), rgba(235,211,141,0.08))'
          : 'rgba(255,255,255,0.03)',
        borderStyle: 'solid', borderWidth: 1,
        borderColor: isSelected ? 'rgba(235,211,141,0.45)' : 'rgba(255,255,255,0.07)',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {icon
          ? <img src={icon} alt={base} style={{ width: 40, height: 40, borderRadius: '50%' }} />
          : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(235,211,141,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#EBD38D', fontSize: 14 }}>{base[0]}</div>
        }
        {isSelected && (
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: '#22c55e', border: '2px solid #0a0b0f' }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: isSelected ? '#EBD38D' : '#fff', lineHeight: 1 }}>
          {base}<span style={{ color: '#ffffff', fontWeight: 600 }}>/USDT</span>
        </div>
        <div style={{ fontSize: 11, color: '#ffffff', marginTop: 3, fontWeight: 600 }}>
          Vol {fmtCompact(ticker?.volume)} {base}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {price > 0 ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: '#fff', lineHeight: 1 }}>
              ${fmtPrice(price)}
            </div>
            <div style={{
              fontSize: 12, fontWeight: 800, marginTop: 3,
              color: isUp ? '#22c55e' : '#ef4444',
            }}>
              {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{pct.toFixed(2)}%
            </div>
          </>
        ) : (
          <div style={{ width: 70, height: 28, background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} className="animate-pulse" />
        )}
      </div>
    </motion.button>
  );
}

// ── Recent fills ──────────────────────────────────────────────────────────────
const ORDER_FMT = iso => new Date(iso).toLocaleString('en-US', {
  month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});

function RecentFills() {
  const { user, orderHistory, ordersLoading, fetchOrders } = useAuth();

  const last5 = orderHistory.slice(0, 5);

  if (!user) return null;

  return (
    <div style={{
      marginTop: 20, borderRadius: 18, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.02)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Recent Fills</p>
        <button onClick={fetchOrders} disabled={ordersLoading}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff', opacity: ordersLoading ? 0.4 : 1 }}
          className="hover:text-white transition-colors">
          <RefreshCw size={14} className={ordersLoading ? 'animate-spin' : ''} />
        </button>
      </div>
      {last5.length === 0 ? (
        <div style={{ padding: '24px 18px', textAlign: 'center', color: '#ffffff', fontSize: 13 }}>
          No recent fills. Place a trade to get started.
        </div>
      ) : last5.map(o => (
        <div key={o.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)',
          transition: 'background 0.15s',
        }} className="hover:bg-white/[.03]">
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: o.side === 'buy' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {o.side === 'buy' ? <TrendingUp size={15} color="#22c55e" /> : <TrendingDown size={15} color="#ef4444" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
              {o.symbol.replace('USDT', '/USDT')}
            </div>
            <div style={{ fontSize: 12, color: '#ffffff', marginTop: 1 }}>
              {ORDER_FMT(o.created_at)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 13, fontWeight: 800, fontFamily: 'monospace',
              color: o.side === 'buy' ? '#22c55e' : '#ef4444',
            }}>
              {o.side === 'buy' ? '+' : '-'}{o.filled.toFixed(4)}
            </div>
            <div style={{ fontSize: 12, color: '#ffffff', fontFamily: 'monospace' }}>
              {o.avg_price > 0 ? `@ $${fmtPrice(o.avg_price)}` : 'MKT'}
            </div>
          </div>
          <div style={{
            fontSize: 12, fontWeight: 700,
            color: o.status === 'filled' ? '#22c55e' : '#ffffff',
            background: o.status === 'filled' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
            padding: '3px 8px', borderRadius: 6, flexShrink: 0,
          }}>
            {o.status}
          </div>
        </div>
      ))}
      <div style={{ padding: '12px 18px', textAlign: 'center' }}>
        <Link to="/trade/BZXUSDT" style={{ fontSize: 13, color: '#EBD38D', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          className="hover:opacity-80">
          View full order history <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QuickTradePage() {
  const navigate = useNavigate();
  const { user, balance, kyc, fetchOrders, fetchWallet, fetchLiveSpotPositions } = useAuth();

  const [symbol,        setSymbol]        = useState('BTCUSDT');
  const [tickers,       setTickers]       = useState({});
  const [side,          setSide]          = useState('buy');
  const [amount,        setAmount]        = useState('');
  const [placing,       setPlacing]       = useState(false);
  const [result,        setResult]        = useState(null);
  const [mobileDropOpen, setMobileDropOpen] = useState(false);
  const [sheetSearch,   setSheetSearch]   = useState('');
  const [favs,          setFavs]          = useState(() => {
    try { return JSON.parse(localStorage.getItem('bitzxex_qt_favs') || '[]'); } catch { return []; }
  });

  const base    = symbol.replace('USDT', '');
  const icon    = COIN_ICONS[base];
  const ticker  = tickers[symbol];
  const price   = parseFloat(ticker?.price ?? 0);
  const pct     = parseFloat(ticker?.priceChangePercent ?? 0);
  const isUp    = pct >= 0;

  // Available balances
  const availUSDT = parseFloat(balance?.USDT  ?? 0);
  const availBase = parseFloat(balance?.[base] ?? 0);
  const maxBase   = side === 'buy' ? (price > 0 ? availUSDT / price : 0) : availBase;

  // Order math
  const qty     = parseFloat(amount) || 0;
  const cost    = qty * price;
  const fee     = cost * FEE;
  const receive = side === 'buy' ? qty - qty * FEE : cost - fee;

  const kycBlocked = user && kyc?.status !== 'approved';

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
            const all = normalizeMarketsList(j.markets);
            const map = {};
            all.forEach(t => { map[t.symbol] = t; });
            setTickers(map);
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

  const applyPct = pct => {
    const max = maxBase * (pct / 100);
    setAmount(max > 0 ? max.toFixed(base === 'BTC' ? 6 : base === 'ETH' ? 5 : 4) : '');
  };

  const handleSelect = sym => {
    setSymbol(sym);
    setAmount('');
    setResult(null);
    setMobileDropOpen(false);
    setSheetSearch('');
  };

  const toggleFav = sym => {
    const next = favs.includes(sym) ? favs.filter(f => f !== sym) : [...favs, sym];
    setFavs(next);
    localStorage.setItem('bitzxex_qt_favs', JSON.stringify(next));
  };

  const handleSubmit = async () => {
    if (!user)          { navigate('/login'); return; }
    if (!qty || qty <= 0) { setResult({ ok: false, error: 'Enter a valid amount' }); return; }
    if (kycBlocked)     { setResult({ ok: false, error: 'KYC verification required before trading' }); return; }

    setPlacing(true);
    setResult(null);
    try {
      const res  = await authFetch(`${API}/api/orders`, {
        method: 'POST',
        body: JSON.stringify({ symbol, side, type: 'market', amount: qty, price: 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Order failed');
      setResult({ ok: true, order: data });
      setAmount('');
      await Promise.all([fetchOrders(), fetchWallet(), fetchLiveSpotPositions()]);
      setTimeout(() => setResult(null), 6000);
    } catch (err) {
      setResult({ ok: false, error: err.message });
      setTimeout(() => setResult(null), 7000);
    } finally { setPlacing(false); }
  };

  // Sort: favourites first, then rest
  const sortedPairs = [
    ...PAIRS.filter(p => favs.includes(p.symbol)),
    ...PAIRS.filter(p => !favs.includes(p.symbol)),
  ];

  // Sheet filtered list
  const sheetPairs = sheetSearch
    ? sortedPairs.filter(p => p.base.toLowerCase().includes(sheetSearch.toLowerCase()) || p.symbol.toLowerCase().includes(sheetSearch.toLowerCase()))
    : sortedPairs;

  return (
    <div className="min-h-screen bg-surface-dark">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(156,121,65,0.07) 0%, transparent 55%)' }} />

      {/* ══ MOBILE BOTTOM SHEET — pair selector ══════════════════════════ */}
      {mobileDropOpen && createPortal(
        <AnimatePresence>
          <motion.div key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9998 }}
            onClick={() => { setMobileDropOpen(false); setSheetSearch(''); }}
          />
          <motion.div key="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
              background: '#0d0f14', borderRadius: '24px 24px 0 0',
              maxHeight: '82vh', display: 'flex', flexDirection: 'column',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
            {/* Sheet header */}
            <div style={{ padding: '16px 20px 12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Select Trading Pair</p>
                <button
                  onClick={() => { setMobileDropOpen(false); setSheetSearch(''); }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, padding: '6px 8px', cursor: 'pointer', color: '#ffffff' }}>
                  <X size={18} />
                </button>
              </div>
              {/* Search */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 14, padding: '10px 14px',
              }}>
                <Search size={16} color="#ffffff" />
                <input
                  value={sheetSearch}
                  onChange={e => setSheetSearch(e.target.value)}
                  placeholder="Search pairs…"
                  autoFocus
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 15, fontWeight: 600 }}
                />
                {sheetSearch && (
                  <button onClick={() => setSheetSearch('')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff', padding: 0 }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Pair list */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 10px 20px' }} className="scrollbar-hide">
              {sheetPairs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#ffffff', fontSize: 14 }}>
                  No pairs found for "{sheetSearch}"
                </div>
              ) : sheetPairs.map(pair => {
                const b    = pair.base;
                const ico  = COIN_ICONS[b];
                const tk   = tickers[pair.symbol];
                const pr   = parseFloat(tk?.price ?? 0);
                const pc   = parseFloat(tk?.priceChangePercent ?? 0);
                const up   = pc >= 0;
                const isSel = symbol === pair.symbol;
                const isFav = favs.includes(pair.symbol);
                return (
                  <button key={pair.symbol}
                    onClick={() => handleSelect(pair.symbol)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      width: '100%', padding: '13px 12px', borderRadius: 14,
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: isSel ? 'linear-gradient(135deg, rgba(156,121,65,0.18), rgba(235,211,141,0.08))' : 'transparent',
                      marginBottom: 2, transition: 'background 0.15s',
                    }}
                    className="hover:bg-white/[.04]">
                    {/* Icon */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {ico
                        ? <img src={ico} alt={b} style={{ width: 42, height: 42, borderRadius: '50%' }} />
                        : <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(235,211,141,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#EBD38D', fontSize: 15 }}>{b[0]}</div>
                      }
                      {isSel && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#22c55e', border: '2px solid #0d0f14' }} />}
                    </div>
                    {/* Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: isSel ? '#EBD38D' : '#fff', lineHeight: 1.1 }}>
                        {b}<span style={{ color: '#ffffff', fontWeight: 600, fontSize: 14 }}>/USDT</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#ffffff', marginTop: 3, fontWeight: 600 }}>
                        Vol {fmtCompact(tk?.volume)} {b}
                      </div>
                    </div>
                    {/* Price + % */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {pr > 0 ? (
                        <>
                          <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: '#fff', lineHeight: 1.1 }}>
                            ${fmtPrice(pr)}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, marginTop: 3, color: up ? '#22c55e' : '#ef4444' }}>
                            {up ? '▲ +' : '▼ '}{pc.toFixed(2)}%
                          </div>
                        </>
                      ) : (
                        <div style={{ width: 70, height: 32, background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} className="animate-pulse" />
                      )}
                    </div>
                    {/* Fav star */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleFav(pair.symbol); }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '4px 2px', opacity: isFav ? 1 : 0.35, transition: 'opacity 0.15s' }}>
                      <Star size={15} color="#EBD38D" fill={isFav ? '#EBD38D' : 'none'} />
                    </button>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      <div className="relative z-10 w-full px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #9C7941, #EBD38D)' }}>
              <Zap size={18} color="#0d0f14" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-none">Quick Trade</h1>
              <p className="text-white text-xs sm:text-sm mt-0.5">
                Instant market orders · 0.1% fee
              </p>
            </div>
          </div>
          <Link to="/trade/BZXUSDT"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold
              text-white hover:text-white transition-colors border border-surface-border
              hover:border-white/20">
            <BarChart2 size={14} /> Advanced
          </Link>
        </div>

        {/* ── MOBILE pair selector button (< lg) ──────────────────────────── */}
        <button
          onClick={() => setMobileDropOpen(true)}
          className="lg:hidden w-full flex items-center gap-4 p-4 rounded-2xl mb-5 active:scale-[.98] transition-transform"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
          {icon
            ? <img src={icon} alt={base} style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
            : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(235,211,141,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#EBD38D', fontSize: 16, flexShrink: 0 }}>{base[0]}</div>
          }
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
              {base}<span style={{ color: '#ffffff', fontWeight: 600, fontSize: 15 }}>/USDT</span>
            </p>
            {price > 0 && (
              <p style={{ fontSize: 14, fontWeight: 800, marginTop: 3, color: isUp ? '#22c55e' : '#ef4444' }}>
                ${fmtPrice(price)} &nbsp;{isUp ? '▲ +' : '▼ '}{pct.toFixed(2)}%
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: '#ffffff', fontWeight: 600 }}>Change</span>
            <ChevronDown size={20} color="#EBD38D" />
          </div>
        </button>

        {/* ── Two-column layout ────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* LEFT — Pair selector grid (desktop only, lg+) ─────────────────── */}
          <div className="hidden lg:block w-[380px] xl:w-[420px] flex-shrink-0 space-y-2">
            <p className="text-xs font-extrabold text-white uppercase tracking-widest px-1 mb-3">
              Select Pair
            </p>
            {sortedPairs.map(pair => (
              <div key={pair.symbol} style={{ position: 'relative' }}>
                <PairCard
                  pair={pair}
                  ticker={tickers[pair.symbol]}
                  isSelected={symbol === pair.symbol}
                  onSelect={handleSelect}
                />
                <button
                  onClick={e => { e.stopPropagation(); toggleFav(pair.symbol); }}
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    opacity: favs.includes(pair.symbol) ? 1 : 0.3,
                    transition: 'opacity 0.15s',
                  }}
                  className="hover:opacity-100">
                  <Star size={13} color="#EBD38D" fill={favs.includes(pair.symbol) ? '#EBD38D' : 'none'} />
                </button>
              </div>
            ))}
          </div>

          {/* RIGHT — Order form ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 w-full">

            {/* Selected pair hero — hidden on mobile (info is in dropdown button above) */}
            <div className="hidden sm:block rounded-2xl p-5 sm:p-6 mb-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-4 mb-5">
                {icon && <img src={icon} alt={base} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full" />}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-none">
                    {base}<span className="text-white font-bold">/USDT</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-white mt-1 font-semibold">Spot · Market Order</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {price > 0 ? (
                    <>
                      <p className="text-3xl sm:text-4xl font-extrabold font-mono"
                        style={{ color: isUp ? '#22c55e' : '#ef4444' }}>
                        ${fmtPrice(price)}
                      </p>
                      <p className="text-sm sm:text-base font-extrabold mt-1"
                        style={{ color: isUp ? '#22c55e' : '#ef4444' }}>
                        {isUp ? '▲ +' : '▼ '}{pct.toFixed(2)}% (24h)
                      </p>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="h-9 w-36 sm:w-48 rounded-xl bg-white/5 animate-pulse" />
                      <div className="h-5 w-24 sm:w-28 rounded-lg bg-white/5 animate-pulse ml-auto" />
                    </div>
                  )}
                </div>
              </div>

              {/* 24h stats */}
              {ticker && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '24h High', value: `$${fmtPrice(ticker.highPrice)}`, color: '#22c55e' },
                    { label: '24h Low',  value: `$${fmtPrice(ticker.lowPrice)}`,  color: '#ef4444' },
                    { label: '24h Vol',  value: `${fmtCompact(ticker.volume)} ${base}`, color: '#ffffff' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 sm:p-4"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-widest mb-1">{s.label}</p>
                      <p className="text-base sm:text-lg font-extrabold font-mono" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile compact stats bar */}
            {ticker && (
              <div className="sm:hidden flex items-center justify-between px-1 mb-4 gap-2">
                {[
                  { label: 'High', value: `$${fmtPrice(ticker.highPrice)}`, color: '#22c55e' },
                  { label: 'Low',  value: `$${fmtPrice(ticker.lowPrice)}`,  color: '#ef4444' },
                  { label: 'Vol',  value: fmtCompact(ticker.volume), color: '#ffffff' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', flex: 1 }}>
                    <p style={{ fontSize: 10, color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: s.color, marginTop: 2 }}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Order form card */}
            <div className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>

              {/* Buy / Sell tabs */}
              <div className="grid grid-cols-2">
                {['buy', 'sell'].map(s => (
                  <button key={s} onClick={() => { setSide(s); setAmount(''); setResult(null); }}
                    className="py-4 sm:py-5 font-extrabold text-base sm:text-lg tracking-wide transition-all border-b-2"
                    style={{
                      background: side === s
                        ? (s === 'buy' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)')
                        : 'transparent',
                      color: side === s
                        ? (s === 'buy' ? '#22c55e' : '#ef4444')
                        : '#ffffff',
                      borderBottomColor: side === s
                        ? (s === 'buy' ? '#22c55e' : '#ef4444')
                        : 'transparent',
                      borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent',
                      cursor: 'pointer',
                    }}>
                    {s === 'buy'
                      ? <span className="flex items-center justify-center gap-2"><TrendingUp size={20} /> Buy {base}</span>
                      : <span className="flex items-center justify-center gap-2"><TrendingDown size={20} /> Sell {base}</span>}
                  </button>
                ))}
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">

                {/* Market price indicator */}
                <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-widest mb-0.5">Execution Price</p>
                    <p className="text-base sm:text-lg font-extrabold font-mono text-white">
                      {price > 0 ? `$${fmtPrice(price)}` : '—'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p className="text-[10px] font-extrabold text-white uppercase tracking-widest mb-0.5">Type</p>
                    <p className="text-sm font-bold text-white">Market</p>
                  </div>
                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                    ● LIVE
                  </span>
                </div>

                {/* Available balance */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Wallet size={15} /> Available
                  </span>
                  <span className="text-lg font-extrabold font-mono text-white">
                    {side === 'buy'
                      ? `${availUSDT.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`
                      : `${availBase.toFixed(6)} ${base}`}
                  </span>
                </div>

                {/* Amount input */}
                <div>
                  <label className="block text-xs sm:text-sm font-extrabold text-white mb-2 uppercase tracking-widest">
                    Amount ({base})
                  </label>
                  <div className="flex items-center rounded-xl px-4 sm:px-5 py-3 sm:py-4 transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: `2px solid ${amount ? 'rgba(235,211,141,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    }}>
                    <input
                      type="number" min="0" step="any"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.0000"
                      className="flex-1 bg-transparent outline-none font-extrabold font-mono"
                      style={{ fontSize: 20, color: '#fff' }}
                    />
                    <span className="text-sm sm:text-base font-extrabold ml-3" style={{ color: '#ffffff' }}>{base}</span>
                  </div>
                </div>

                {/* % presets */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {PCTS.map(({ label, v }) => (
                    <button key={v} onClick={() => applyPct(v)}
                      className="py-2.5 sm:py-3.5 text-sm sm:text-base font-extrabold rounded-xl transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        color: '#ffffff',
                      }}
                      onMouseEnter={e => { e.target.style.background = 'rgba(156,121,65,0.15)'; e.target.style.color = '#EBD38D'; e.target.style.borderColor = 'rgba(235,211,141,0.3)'; }}
                      onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = '#ffffff'; e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Order summary */}
                {qty > 0 && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl p-5 space-y-3"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {[
                        { label: 'Order Total', value: `$${cost.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`, color: '#fff' },
                        { label: 'Fee (0.1%)',  value: `$${fee.toLocaleString(undefined, { maximumFractionDigits: 4 })} USDT`, color: '#f59e0b' },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white">{row.label}</span>
                          <span className="text-base font-extrabold font-mono" style={{ color: row.color }}>{row.value}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-3"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <span className="text-base font-extrabold text-white">You Receive</span>
                        <span className="text-xl font-extrabold font-mono"
                          style={{ color: side === 'buy' ? '#22c55e' : '#ef4444' }}>
                          {side === 'buy'
                            ? `${receive.toFixed(base === 'BTC' ? 6 : 4)} ${base}`
                            : `$${receive.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                        </span>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* KYC gate */}
                {kycBlocked && (
                  <div className="rounded-xl p-4 flex items-start gap-3"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}>
                    <Shield size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-extrabold text-amber-300 mb-1">KYC Verification Required</p>
                      <p className="text-xs text-white mb-3">
                        {kyc?.status === 'pending'
                          ? 'Your documents are under review. Trading will be enabled once approved.'
                          : 'Complete identity verification to start trading.'}
                      </p>
                      <Link to="/kyc"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-extrabold text-amber-300 hover:bg-amber-500/20 transition-colors"
                        style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                        <Shield size={13} /> {kyc?.status === 'pending' ? 'Check Status' : 'Verify Now →'}
                      </Link>
                    </div>
                  </div>
                )}

                {/* Result feedback */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="rounded-xl p-4 flex items-start gap-3"
                      style={{
                        background: result.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${result.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      }}>
                      {result.ok ? <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" /> : <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />}
                      <div>
                        {result.ok ? (
                          <>
                            <p className="text-sm font-extrabold text-green-400">
                              {result.order.status === 'filled' ? 'Order Filled Instantly!' : 'Order Placed!'}
                            </p>
                            <p className="text-xs text-white mt-1 font-mono">
                              {result.order.side.toUpperCase()}{' '}
                              {result.order.filled > 0 ? result.order.filled.toFixed(6) : result.order.amount.toFixed(6)}{' '}
                              {base}
                              {result.order.avg_price > 0 && ` @ $${fmtPrice(result.order.avg_price)}`}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-bold text-red-400">{result.error}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                {!user ? (
                  <div className="space-y-3 pt-1">
                    <p className="text-center text-xs sm:text-sm text-white">Sign in to start trading</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Link to="/login"
                        className="flex items-center justify-center py-3 sm:py-4 rounded-xl font-extrabold text-sm sm:text-base transition-all"
                        style={{ background: 'linear-gradient(135deg, #9C7941, #EBD38D)', color: '#0d0f14' }}>
                        Log In
                      </Link>
                      <Link to="/register"
                        className="flex items-center justify-center py-3 sm:py-4 rounded-xl font-extrabold text-sm sm:text-base transition-all text-gold-light"
                        style={{ border: '1px solid rgba(235,211,141,0.3)', background: 'rgba(156,121,65,0.08)' }}>
                        Register Free
                      </Link>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={placing || kycBlocked || !qty || qty <= 0}
                    className="w-full py-4 sm:py-5 rounded-xl font-extrabold text-base sm:text-lg tracking-wide
                      transition-all active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: placing || kycBlocked || !qty
                        ? 'rgba(255,255,255,0.06)'
                        : side === 'buy'
                          ? 'linear-gradient(135deg, #16a34a, #22c55e)'
                          : 'linear-gradient(135deg, #dc2626, #ef4444)',
                      color: placing || kycBlocked || !qty ? '#ffffff' : '#fff',
                      boxShadow: placing || kycBlocked || !qty ? 'none'
                        : side === 'buy' ? '0 8px 32px rgba(34,197,94,0.3)'
                                         : '0 8px 32px rgba(239,68,68,0.3)',
                    }}>
                    {placing ? (
                      <span className="flex items-center justify-center gap-3">
                        <Loader2 size={20} className="animate-spin" /> Processing…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-3">
                        {side === 'buy' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        {side === 'buy' ? `Buy ${base} Now` : `Sell ${base} Now`}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Recent fills */}
            <RecentFills />
          </div>
        </div>
      </div>
    </div>
  );
}
