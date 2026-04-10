/**
 * TradePage — two-zone layout
 *
 * ┌──────────────────────────────────────────────────────────────────┐  ← top of viewport
 * │  Sticky Navbar (70px, handled by App.jsx/Navbar)                 │
 * ├──────────────────────────────────────────────────────────────────┤
 * │  ZONE 1 — height: calc(100vh - 70px)  fills the visible screen  │
 * │  ┌──────────────────────────────────────────────────────────┐   │
 * │  │  Page header: pair selector · live price · quick trade   │   │
 * │  ├────────────────────┬──────────────┬─────────────────────┤   │
 * │  │  TradingView Chart │  Order Book  │  Trade Form         │   │
 * │  │   (flex-1)         │   (310px)    │   (420px, scroll)   │   │
 * │  └────────────────────┴──────────────┴─────────────────────┘   │
 * └──────────────────────────────────────────────────────────────────┘  ← fold
 *
 * ┌──────────────────────────────────────────────────────────────────┐  ← scroll ↓
 * │  ZONE 2 — Positions | Open Orders | Order History                │
 * └──────────────────────────────────────────────────────────────────┘
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal }  from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronDown, TrendingUp, TrendingDown, Star, Globe,
  ArrowUpDown, RefreshCw, X, Clock, CheckCircle, AlertCircle,
  Zap, BarChart2, DollarSign,
} from 'lucide-react';
import { marketApi, COIN_ICONS, PAIRS } from '@/services/marketApi';
import { useAuth, authFetch } from '@/context/AuthContext';
import TradingChart    from '@/components/trading/TradingChart';
import OrderBook       from '@/components/trading/OrderBook';
import TradeForm       from '@/components/trading/TradeForm';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtP = (v, base) => {
  const n = parseFloat(v); if (!n) return '—';
  if (base === 'BTC') return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
       : n >= 1    ? n.toFixed(4)
                   : n.toFixed(6);
};
const fmtVol = v => {
  const n = parseFloat(v); if (!n) return '—';
  return n >= 1e9 ? (n / 1e9).toFixed(2) + 'B'
       : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M'
       : n >= 1e3 ? (n / 1e3).toFixed(2) + 'K'
                  : n.toFixed(2);
};

function StatItem({ label, value, color }) {
  return (
    <div className="flex flex-col gap-0.5 pl-5 border-l border-white/[.06]">
      <span className="text-[11px] text-[#4A4B50] uppercase tracking-widest font-bold whitespace-nowrap">{label}</span>
      <span className={`text-[15px] font-mono font-extrabold whitespace-nowrap ${color ?? 'text-white'}`}>{value}</span>
    </div>
  );
}

const API       = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const ALL_PAIRS = PAIRS.map(p => p.symbol);

// ─── Date formatter ───────────────────────────────────────────────────────────
const ORDER_FMT = iso => new Date(iso).toLocaleString('en-US', {
  month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});
const fmtOrdP = v => {
  const n = parseFloat(v);
  return n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
       : n >= 1    ? n.toFixed(4)
                   : n.toFixed(6);
};

// ─── Positions tab — live P&L ─────────────────────────────────────────────────
function PositionsTab({ activePair }) {
  const { user } = useAuth();
  const [positions, setPositions] = useState([]);
  const [prices,    setPrices]    = useState({});   // { "BTC": 71000, ... }
  const [loading,   setLoading]   = useState(false);

  const fetchPositions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await authFetch(`${API}/api/portfolio/positions`);
      if (res.ok) {
        const data = await res.json();
        setPositions(data);
        // Fetch current price for each asset
        const priceMap = {};
        await Promise.all(data.map(async pos => {
          try {
            const t = await marketApi.getTicker(pos.symbol);
            priceMap[pos.asset] = parseFloat(t?.price ?? 0);
          } catch { /* silent */ }
        }));
        setPrices(priceMap);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    fetchPositions();
    const id = setInterval(fetchPositions, 5000);
    return () => clearInterval(id);
  }, [fetchPositions]);

  if (!user) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10, color: '#4A4B50' }}>
      <BarChart2 size={28} />
      <span style={{ fontSize: 14 }}>Please log in to view positions</span>
      <Link to="/login" style={{ color: '#EBD38D', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
    </div>
  );

  if (loading && positions.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8, color: '#4A4B50', fontSize: 14 }}>
      <RefreshCw size={16} className="animate-spin" /> Loading positions…
    </div>
  );

  if (positions.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10, color: '#4A4B50' }}>
      <DollarSign size={28} />
      <span style={{ fontSize: 14 }}>No open positions</span>
      <span style={{ fontSize: 12 }}>Place a trade to see your positions here</span>
    </div>
  );

  // Total portfolio P&L
  let totalInvested = 0, totalValue = 0;
  positions.forEach(p => {
    const cur = prices[p.asset] ?? 0;
    totalInvested += p.total_invested ?? 0;
    totalValue    += cur * p.amount;
  });
  const totalPnl    = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <div style={{ flex: 1 }}>
      {/* Portfolio summary strip */}
      <div style={{
        display: 'flex', gap: 24, padding: '12px 16px',
        background: 'rgba(255,255,255,0.025)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        alignItems: 'center', flexWrap: 'wrap', overflowX: 'auto',
      }} className="scrollbar-hide">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: '#4A4B50', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Value</span>
          <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 900, fontSize: 20 }}>
            ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: '#4A4B50', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Invested</span>
          <span style={{ color: '#D5D5D0', fontFamily: 'monospace', fontWeight: 700, fontSize: 18 }}>
            ${totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: '#4A4B50', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unrealized P&L</span>
          <span style={{
            fontFamily: 'monospace', fontWeight: 900, fontSize: 20,
            color: totalPnl >= 0 ? '#22c55e' : '#ef4444',
          }}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span style={{ fontSize: 14, marginLeft: 8, opacity: 0.8 }}>
              ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
            </span>
          </span>
        </div>
        <button onClick={fetchPositions} disabled={loading}
          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: '#4A4B50', opacity: loading ? 0.4 : 1 }}
          className="hover:text-white transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Scrollable grid table */}
      <div style={{ overflowX: 'auto' }}>
      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '0.8fr 1fr 1fr 1fr 1.2fr 1.2fr 1fr',
        gap: 8, padding: '12px 24px', minWidth: 680,
        fontSize: 12, color: '#4A4B50', textTransform: 'uppercase',
        letterSpacing: '0.06em', fontWeight: 800,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.015)',
      }}>
        <span>Asset</span>
        <span style={{ textAlign: 'right' }}>Amount</span>
        <span style={{ textAlign: 'right' }}>Avg Cost</span>
        <span style={{ textAlign: 'right' }}>Cur Price</span>
        <span style={{ textAlign: 'right' }}>Value</span>
        <span style={{ textAlign: 'right' }}>P&L</span>
        <span style={{ textAlign: 'right' }}>P&L %</span>
      </div>

      {/* Rows */}
      {positions.map(pos => {
        const currentPrice = prices[pos.asset] ?? 0;
        const currentValue = currentPrice * pos.amount;
        const pnl          = currentValue - (pos.total_invested ?? 0);
        const pnlPct       = (pos.total_invested ?? 0) > 0 ? (pnl / pos.total_invested) * 100 : 0;
        const isUp         = pnl >= 0;
        const icon         = COIN_ICONS[pos.asset];

        return (
          <div key={pos.asset}
            style={{
              display: 'grid',
              gridTemplateColumns: '0.8fr 1fr 1fr 1fr 1.2fr 1.2fr 1fr',
              gap: 8, padding: '16px 24px', alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              transition: 'background 0.15s',
            }}
            className="hover:bg-white/[.03]">

            {/* Asset */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {icon && <img src={icon} alt={pos.asset} style={{ width: 28, height: 28, borderRadius: '50%' }} />}
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{pos.asset}</div>
                <div style={{ color: '#4A4B50', fontSize: 11, fontWeight: 600 }}>USDT Pair</div>
              </div>
            </div>

            {/* Amount */}
            <span style={{ textAlign: 'right', color: '#D5D5D0', fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>
              {pos.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </span>

            {/* Avg Cost */}
            <span style={{ textAlign: 'right', color: '#8A8B90', fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}>
              ${fmtOrdP(pos.avg_cost)}
            </span>

            {/* Current Price — live */}
            <span style={{ textAlign: 'right', color: '#fff', fontFamily: 'monospace', fontSize: 14, fontWeight: 800 }}>
              {currentPrice ? `$${fmtOrdP(currentPrice)}` : <span style={{ color: '#4A4B50' }}>—</span>}
            </span>

            {/* Value */}
            <span style={{ textAlign: 'right', color: '#fff', fontFamily: 'monospace', fontWeight: 800, fontSize: 15 }}>
              ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>

            {/* P&L */}
            <span style={{
              textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 15,
              color: isUp ? '#22c55e' : '#ef4444',
            }}>
              {isUp ? '+' : ''}{pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>

            {/* P&L % badge */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{
                fontFamily: 'monospace', fontWeight: 800, fontSize: 14,
                padding: '4px 10px', borderRadius: 8,
                background: isUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                color: isUp ? '#22c55e' : '#ef4444',
              }}>
                {isUp ? '+' : ''}{pnlPct.toFixed(2)}%
              </span>
            </div>
          </div>
        );
      })}
      </div>{/* end overflow-x-auto */}
    </div>
  );
}

// ─── ZONE 2: Unified bottom panel ─────────────────────────────────────────────
function BottomPanel({ symbol }) {
  const { user, openOrders, orderHistory, ordersLoading, fetchOrders, fetchWallet } = useAuth();
  const [tab,        setTab]        = useState('positions');
  const [cancelling, setCancelling] = useState(null);

  const handleCancel = async id => {
    setCancelling(id);
    try {
      const res = await authFetch(`${API}/api/orders/${id}`, { method: 'DELETE' });
      if (res.ok) await Promise.all([fetchOrders(), fetchWallet()]);
    } catch { /* ignore */ }
    finally { setCancelling(null); }
  };

  const statusColor = s =>
    s === 'filled'           ? '#22c55e' :
    s === 'partially_filled' ? '#60a5fa' :
    s === 'cancelled'        ? '#ef4444' : '#6B6B70';

  const statusIcon = s =>
    s === 'filled'    ? <CheckCircle size={11} /> :
    s === 'cancelled' ? <AlertCircle size={11} />
                      : <Clock size={11} />;

  const TABS = [
    { id: 'positions', label: 'Positions',    badge: null },
    { id: 'orders',    label: 'Open Orders',  badge: openOrders.length || null },
    { id: 'history',   label: 'Order History' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 460, background: '#0d0f14' }}>

      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0, paddingLeft: 8, paddingRight: 14,
        position: 'sticky', top: 0, zIndex: 90,
        background: '#0d0f14', overflowX: 'auto',
      }} className="scrollbar-hide">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '14px 22px', fontSize: 15, fontWeight: 700,
              borderBottom: `2px solid ${tab === t.id ? '#EBD38D' : 'transparent'}`,
              color: tab === t.id ? '#EBD38D' : '#4A4B50',
              background: 'transparent', border: 'none',
              cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
            {t.label}
            {t.badge > 0 && (
              <span style={{ fontSize: 12, background: 'rgba(235,211,141,0.2)', color: '#EBD38D', padding: '2px 9px', borderRadius: 20, fontWeight: 800 }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}

        {(tab === 'orders' || tab === 'history') && (
          <button onClick={fetchOrders} disabled={ordersLoading}
            style={{ marginLeft: 'auto', padding: 7, background: 'transparent', border: 'none', cursor: 'pointer', color: '#4A4B50', opacity: ordersLoading ? 0.4 : 1 }}
            className="hover:text-white transition-colors">
            <RefreshCw size={16} className={ordersLoading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Positions */}
      {tab === 'positions' && <PositionsTab activePair={symbol} />}

      {/* Open Orders / History */}
      {(tab === 'orders' || tab === 'history') && (() => {
        const rows = tab === 'orders' ? openOrders : orderHistory;
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr 0.8fr 0.8fr 1.2fr 1.2fr 1.2fr 1fr',
              gap: 8, padding: '12px 24px', minWidth: 700,
              fontSize: 12, color: '#4A4B50', textTransform: 'uppercase',
              letterSpacing: '0.06em', fontWeight: 800,
              borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
              background: 'rgba(255,255,255,0.015)',
            }}>
              <span>Date / Time</span>
              <span>Pair</span>
              <span>Type</span>
              <span>Side</span>
              <span style={{ textAlign: 'right' }}>Price</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
              <span style={{ textAlign: 'right' }}>Filled</span>
              <span style={{ textAlign: 'right' }}>{tab === 'orders' ? 'Action' : 'Status'}</span>
            </div>

            {/* Rows */}
            <div style={{ flex: 1 }}>
              {ordersLoading && rows.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10, color: '#4A4B50', fontSize: 15 }}>
                  <RefreshCw size={18} className="animate-spin" /> Loading…
                </div>
              ) : !user ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, color: '#4A4B50' }}>
                  <Clock size={32} />
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Please log in to view orders</span>
                  <Link to="/login" style={{ color: '#EBD38D', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
                </div>
              ) : rows.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, color: '#4A4B50' }}>
                  <Clock size={32} />
                  <span style={{ fontSize: 16, fontWeight: 600 }}>No {tab === 'orders' ? 'open orders' : 'order history'}</span>
                  {tab === 'orders' && (
                    <span style={{ fontSize: 13 }}>Resting limit orders will appear here</span>
                  )}
                </div>
              ) : rows.map(o => (
                <div key={o.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.6fr 1fr 0.8fr 0.8fr 1.2fr 1.2fr 1.2fr 1fr',
                    gap: 8, padding: '14px 24px', alignItems: 'center', minWidth: 700,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s',
                  }}
                  className="hover:bg-white/[.03]">
                  <span style={{ color: '#6B6B70', fontSize: 13, fontFamily: 'monospace' }}>{ORDER_FMT(o.created_at)}</span>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{o.symbol.replace('USDT', '/USDT')}</span>
                  <span style={{ color: '#8A8B90', textTransform: 'capitalize', fontSize: 14, fontWeight: 600 }}>{o.type}</span>
                  <span style={{
                    color: o.side === 'buy' ? '#22c55e' : '#ef4444',
                    fontWeight: 800, textTransform: 'uppercase', fontSize: 14,
                    background: o.side === 'buy' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    padding: '2px 8px', borderRadius: 6, display: 'inline-block',
                  }}>
                    {o.side}
                  </span>
                  <span style={{ textAlign: 'right', color: '#D5D5D0', fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>
                    {o.type === 'market' ? <span style={{ color: '#4A4B50', fontWeight: 800 }}>MKT</span> : `$${fmtOrdP(o.price)}`}
                  </span>
                  <span style={{ textAlign: 'right', color: '#D5D5D0', fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>
                    {o.amount.toFixed(4)}
                  </span>
                  <span style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 14 }}>
                    <span style={{ color: o.filled > 0 ? '#fff' : '#4A4B50', fontWeight: 700 }}>{o.filled.toFixed(4)}</span>
                    {o.amount > 0 && (
                      <span style={{ color: '#4A4B50', fontSize: 12, marginLeft: 4 }}>
                        ({((o.filled / o.amount) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </span>
                  {tab === 'orders' ? (
                    <div style={{ textAlign: 'right' }}>
                      <button onClick={() => handleCancel(o.id)} disabled={cancelling === o.id}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          color: '#ef4444', background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: 8, padding: '4px 10px',
                          cursor: 'pointer', fontSize: 13, fontWeight: 700,
                          opacity: cancelling === o.id ? 0.4 : 1,
                        }}>
                        {cancelling === o.id ? <RefreshCw size={12} className="animate-spin" /> : <><X size={12} /> Cancel</>}
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5,
                      color: statusColor(o.status), fontSize: 14, fontWeight: 700, textTransform: 'capitalize',
                    }}>
                      {statusIcon(o.status)} {o.status.replace('_', ' ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div style={{ height: 40, flexShrink: 0 }} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TradePage() {
  const { symbol: p } = useParams();
  const navigate = useNavigate();
  const { user, balance, lockedBalance } = useAuth();

  const [symbol,        setSymbol]        = useState((p || 'BZXUSDT').toUpperCase());
  const [ticker,        setTicker]        = useState(null);
  const [pairOpen,      setPairOpen]      = useState(false);
  const [formPrice,     setFormPrice]     = useState('');
  const [mobilePanelTab, setMobilePanelTab] = useState('trade'); // 'trade' | 'book'
  const [favorites,  setFavorites]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('bitzxex_favs') || '[]'); } catch { return []; }
  });

  const dropRef = useRef(null);
  const timer   = useRef(null);
  const [dropPos, setDropPos] = useState(null);

  const base = symbol.replace('USDT', '');
  const icon = COIN_ICONS[base];

  const loadTicker = useCallback(() => {
    marketApi.getTicker(symbol).then(setTicker).catch(() => {});
  }, [symbol]);

  useEffect(() => {
    setTicker(null); loadTicker();
    timer.current = setInterval(loadTicker, 2000);
    return () => clearInterval(timer.current);
  }, [symbol, loadTicker]);

  const switchPair = sym => {
    setSymbol(sym); navigate(`/trade/${sym}`, { replace: true });
    setPairOpen(false); setFormPrice('');
  };

  const toggleFav = () => {
    const next = favorites.includes(symbol)
      ? favorites.filter(f => f !== symbol)
      : [...favorites, symbol];
    setFavorites(next); localStorage.setItem('bitzxex_favs', JSON.stringify(next));
  };

  const pct       = parseFloat(ticker?.priceChangePercent ?? 0);
  const isUp      = pct >= 0;
  const livePrice = ticker?.price ?? null;
  const isFav     = favorites.includes(symbol);

  const availQuote  = parseFloat(balance?.USDT   ?? 0);
  const availBase   = parseFloat(balance?.[base]  ?? 0);
  const lockedQuote = parseFloat(lockedBalance?.USDT   ?? 0);
  const lockedBase  = parseFloat(lockedBalance?.[base] ?? 0);

  /* ── Shared header JSX (used in both mobile & desktop) ── */
  const PairDropdown = (
    <>
      <div style={{ position: 'relative', flexShrink: 0 }} ref={dropRef}>
        <button
          onClick={() => {
            if (!pairOpen && dropRef.current) {
              const r = dropRef.current.getBoundingClientRect();
              setDropPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 310) });
            }
            setPairOpen(v => !v);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderRadius: 10,
            background: '#161820',
            border: `1px solid ${pairOpen ? 'rgba(235,211,141,0.45)' : 'rgba(255,255,255,0.07)'}`,
            cursor: 'pointer', transition: 'border-color 0.2s', flexShrink: 0,
          }}>
          {icon && <img src={icon} alt={base} style={{ width: 24, height: 24, borderRadius: '50%' }} />}
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{base}</span>
          <span style={{ fontSize: 13, color: '#4A4B50' }}>/USDT</span>
          <ChevronDown size={13} color="#4A4B50"
            style={{ transform: pairOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </button>
      </div>
      {pairOpen && dropPos && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setPairOpen(false)} />
          <div style={{
            position: 'fixed', top: dropPos.top, left: dropPos.left,
            width: Math.min(300, window.innerWidth - 16), background: '#161820',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 12, boxShadow: '0 32px 64px rgba(0,0,0,0.85)',
            zIndex: 9999, maxHeight: '65vh', overflowY: 'auto', padding: '6px 0',
          }} className="scrollbar-hide">
            {ALL_PAIRS.map(q => {
              const b = q.replace('USDT', '');
              return (
                <button key={q} onClick={() => switchPair(q)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 16px', cursor: 'pointer',
                    background: q === symbol ? 'rgba(235,211,141,0.07)' : 'transparent',
                    border: 'none', color: q === symbol ? '#EBD38D' : '#D5D5D0',
                    transition: 'background 0.15s',
                  }}
                  className="hover:bg-white/5">
                  {COIN_ICONS[b] && <img src={COIN_ICONS[b]} alt={b} style={{ width: 26, height: 26, borderRadius: '50%' }} />}
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{b}/USDT</div>
                    <div style={{ fontSize: 11, color: '#4A4B50', marginTop: 1 }}>Spot</div>
                  </div>
                  {q === symbol && (
                    <span style={{ fontSize: 10, background: 'rgba(235,211,141,0.15)', color: '#EBD38D', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                      ACTIVE
                    </span>
                  )}
                </button>
              );
            })}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }}>
              <Link to="/markets" onClick={() => setPairOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', color: '#8A8B90', fontSize: 14, textDecoration: 'none' }}
                className="hover:text-white hover:bg-white/5 transition-colors">
                <Globe size={15} /> All markets
              </Link>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );

  return (
    <div style={{ background: '#0a0b0f' }}>

      {/* ══════════════════════════════════════════════════════════
          MOBILE LAYOUT  (hidden on md+)
          ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:hidden">

        {/* Mobile Header */}
        <div style={{
          padding: '10px 12px 8px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#0d0f14', position: 'relative', zIndex: 200,
        }}>
          {/* Row 1: pair + price + fav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto' }}
            className="scrollbar-hide">
            {PairDropdown}

            {ticker ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 20, fontWeight: 900, fontFamily: 'monospace', color: isUp ? '#22c55e' : '#ef4444', letterSpacing: '-0.5px', flexShrink: 0 }}>
                  ${fmtP(livePrice, base)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 6, background: isUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: isUp ? '#22c55e' : '#ef4444', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                  {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {isUp ? '+' : ''}{pct.toFixed(2)}%
                </span>
              </div>
            ) : (
              <div style={{ flex: 1 }}>
                <div style={{ height: 28, width: 140, background: '#161820', borderRadius: 6 }} className="animate-pulse" />
              </div>
            )}

            <button
              onClick={() => navigate('/quick-trade')}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(156,121,65,0.2), rgba(235,211,141,0.15))',
                border: '1px solid rgba(235,211,141,0.35)',
                color: '#EBD38D', fontSize: 11, fontWeight: 800,
              }}>
              <Zap size={12} /> Quick
            </button>

            <button onClick={toggleFav}
              style={{ flexShrink: 0, padding: 5, borderRadius: 7, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <Star size={16} color={isFav ? '#EBD38D' : '#4A4B50'} fill={isFav ? '#EBD38D' : 'none'} />
            </button>
          </div>

          {/* Row 2: balances (mobile) */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.04)', overflowX: 'auto' }}
              className="scrollbar-hide">
              <span style={{ color: '#4A4B50', flexShrink: 0, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avail.</span>
              <span style={{ flexShrink: 0, color: '#fff', fontFamily: 'monospace', fontWeight: 800, fontSize: 12 }}>
                {availQuote.toFixed(2)} <span style={{ color: '#6B6B70', fontSize: 11 }}>USDT</span>
              </span>
              <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
              <span style={{ flexShrink: 0, color: '#fff', fontFamily: 'monospace', fontWeight: 800, fontSize: 12 }}>
                {availBase.toFixed(4)} <span style={{ color: '#6B6B70', fontSize: 11 }}>{base}</span>
              </span>
              <Link to="/wallet"
                style={{ marginLeft: 'auto', color: '#EBD38D', fontSize: 11, fontWeight: 800, textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                className="hover:opacity-80">
                <ArrowUpDown size={11} /> Deposit
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Chart — explicit pixel height so TradingView renders */}
        <div style={{ height: 280, position: 'relative', overflow: 'hidden', pointerEvents: pairOpen ? 'none' : 'auto' }}>
          <TradingChart symbol={symbol} />
        </div>

        {/* Mobile panel tabs */}
        <div style={{
          display: 'flex', background: '#0d0f14',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          {[['trade','Trade'],['book','Order Book']].map(([id, label]) => (
            <button key={id} onClick={() => setMobilePanelTab(id)}
              style={{
                flex: 1, padding: '13px 0', fontSize: 14, fontWeight: 700,
                color: mobilePanelTab === id ? '#EBD38D' : '#4A4B50',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${mobilePanelTab === id ? '#EBD38D' : 'transparent'}`,
                transition: 'color 0.15s',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Mobile active panel — natural height, page scrolls */}
        <div style={{ background: '#0a0b0f', minHeight: 520 }}>
          {mobilePanelTab === 'trade'
            ? <TradeForm symbol={symbol} currentPrice={formPrice || fmtP(livePrice, base)} />
            : <div style={{ height: 520, position: 'relative', overflow: 'hidden' }}>
                <OrderBook symbol={symbol} onPriceClick={pr => { setFormPrice(pr); setMobilePanelTab('trade'); }} />
              </div>
          }
        </div>

        {/* Mobile Zone 2 */}
        <div style={{ borderTop: '2px solid rgba(235,211,141,0.15)' }}>
          <BottomPanel symbol={symbol} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (hidden below md)
          ══════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col"
        style={{ height: 'calc(100vh - 70px)', overflow: 'hidden' }}>

        {/* Desktop Header */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          padding: '8px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#0d0f14', flexShrink: 0,
          position: 'relative', zIndex: 200,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, overflowX: 'auto' }}
            className="scrollbar-hide">
            {PairDropdown}

            {ticker ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0, overflowX: 'auto' }}
                className="scrollbar-hide">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 20, flexShrink: 0 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, fontFamily: 'monospace', color: isUp ? '#22c55e' : '#ef4444', letterSpacing: '-0.5px' }}>
                    ${fmtP(livePrice, base)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, background: isUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: isUp ? '#22c55e' : '#ef4444', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
                    {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isUp ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                </div>
                <div className="hidden lg:flex">
                  <StatItem label="24h High"   value={`$${fmtP(ticker.highPrice, base)}`}  color="text-green-300" />
                  <StatItem label="24h Low"    value={`$${fmtP(ticker.lowPrice, base)}`}   color="text-red-300" />
                  <StatItem label="24h Volume" value={`${fmtVol(ticker.volume)} ${base}`} />
                  <StatItem label="Quote Vol"  value={`$${fmtVol(ticker.quoteVolume)}`} />
                </div>
              </div>
            ) : (
              <div style={{ flex: 1 }}>
                <div style={{ height: 34, width: 220, background: '#161820', borderRadius: 8 }} className="animate-pulse" />
              </div>
            )}

            <button onClick={() => navigate('/quick-trade')}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(156,121,65,0.2), rgba(235,211,141,0.15))',
                border: '1px solid rgba(235,211,141,0.35)',
                color: '#EBD38D', fontSize: 13, fontWeight: 800, transition: 'all 0.2s',
              }}
              className="hover:border-gold/60 hover:bg-gold/20">
              <Zap size={14} /> Quick Trade
            </button>

            <button onClick={toggleFav}
              style={{ flexShrink: 0, padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer' }}
              className="hover:bg-white/5 transition-colors">
              <Star size={18} color={isFav ? '#EBD38D' : '#4A4B50'} fill={isFav ? '#EBD38D' : 'none'} />
            </button>
          </div>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.04)', overflowX: 'auto' }}
              className="scrollbar-hide">
              <span style={{ color: '#4A4B50', flexShrink: 0, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available</span>
              <span style={{ flexShrink: 0 }}>
                <span style={{ color: '#fff', fontWeight: 800, fontFamily: 'monospace', fontSize: 14 }}>
                  {availQuote.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{ color: '#6B6B70', marginLeft: 4, fontWeight: 700, fontSize: 12 }}>USDT</span>
                {lockedQuote > 0.0001 && <span style={{ color: '#f59e0b', marginLeft: 8, fontSize: 12, fontWeight: 700 }}>({lockedQuote.toFixed(2)} locked)</span>}
              </span>
              <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
              <span style={{ flexShrink: 0 }}>
                <span style={{ color: '#fff', fontWeight: 800, fontFamily: 'monospace', fontSize: 14 }}>
                  {availBase.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}
                </span>
                <span style={{ color: '#6B6B70', marginLeft: 4, fontWeight: 700, fontSize: 12 }}>{base}</span>
                {lockedBase > 0.0001 && <span style={{ color: '#f59e0b', marginLeft: 8, fontSize: 12, fontWeight: 700 }}>({lockedBase.toFixed(6)} locked)</span>}
              </span>
              <Link to="/wallet"
                style={{ marginLeft: 'auto', color: '#EBD38D', fontSize: 12, fontWeight: 800, textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                className="hover:opacity-80">
                <ArrowUpDown size={12} /> Deposit / Withdraw
              </Link>
            </div>
          )}
        </div>

        {/* Desktop three columns */}
        <div style={{ display: 'flex', flex: '1 1 0', minHeight: 0 }}>
          {/* Chart */}
          <div style={{ flex: '1 1 0', minWidth: 0, position: 'relative', overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,0.06)', pointerEvents: pairOpen ? 'none' : 'auto' }}>
            <TradingChart symbol={symbol} />
          </div>
          {/* Order Book */}
          <div style={{ width: 310, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <OrderBook symbol={symbol} onPriceClick={pr => setFormPrice(pr)} />
          </div>
          {/* Trade Form */}
          <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: '1 1 0', overflowY: 'auto' }} className="scrollbar-hide">
              <TradeForm symbol={symbol} currentPrice={formPrice || fmtP(livePrice, base)} />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Zone 2 */}
      <div className="hidden md:block" style={{ borderTop: '2px solid rgba(235,211,141,0.15)' }}>
        <BottomPanel symbol={symbol} />
      </div>

    </div>
  );
}
