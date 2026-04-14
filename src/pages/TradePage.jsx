/**
 * TradePage — two-zone layout
 *
 * ┌──────────────────────────────────────────────────────────────────┐  ← top of viewport
 * │  Sticky Navbar (70px, handled by App.jsx/Navbar)                 │
 * ├──────────────────────────────────────────────────────────────────┤
 * │  ZONE 1 — height: calc(100vh - 70px)  fills the visible screen  │
 * │  ┌──────────────────────────────────────────────────────────┐   │
 * │  │  Page header: pair selector · live price · 24h stats     │   │
 * │  ├────────────────────┬──────────────┬─────────────────────┤   │
 * │  │  TradingView Chart │  Order Book  │  Trade Form         │   │
 * │  │   (flex-1)         │   (~340px)   │   (420px, scroll)   │   │
 * │  └────────────────────┴──────────────┴─────────────────────┘   │
 * └──────────────────────────────────────────────────────────────────┘  ← fold
 *
 * ┌──────────────────────────────────────────────────────────────────┐  ← scroll ↓
 * │  ZONE 2 — Positions | Open Orders | Order History                │
 * └──────────────────────────────────────────────────────────────────┘
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal }  from 'react-dom';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ChevronDown, TrendingUp, TrendingDown, Globe,
  RefreshCw, X, Clock, CheckCircle, AlertCircle,
  BarChart2, DollarSign,
} from 'lucide-react';
import { COIN_ICONS, PAIRS, exchangeWsPath } from '@/services/marketApi';
import { useAuth, authFetch } from '@/context/AuthContext';
import TradingChart    from '@/components/trading/TradingChart';
import OrderBook       from '@/components/trading/OrderBook';
import TradeForm       from '@/components/trading/TradeForm';
import ClosePositionModal from '@/components/trading/ClosePositionModal';

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
      <span className="text-[11px] text-[#ffffff] uppercase tracking-widest font-bold whitespace-nowrap">{label}</span>
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

async function parseApiError(res) {
  try {
    const j = await res.json();
    if (typeof j.detail === 'string') return j.detail;
    if (Array.isArray(j.detail)) {
      return j.detail.map(e => (typeof e === 'string' ? e : e.msg || JSON.stringify(e))).join('; ');
    }
    return res.statusText || 'Request failed';
  } catch {
    return res.statusText || 'Request failed';
  }
}

/** Short context line under tabs (Binance-style “what is this table”). */
function TabHint({ children }) {
  return (
    <div
      style={{
        padding: '10px 22px 12px',
        fontSize: 12,
        color: '#ffffff',
        lineHeight: 1.5,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.22)',
      }}
    >
      {children}
    </div>
  );
}

/** Two-line column header: title + plain-English hint. */
function Th({ main, sub, align, title: tip }) {
  const a = align === 'right' ? 'right' : 'left';
  return (
    <span
      title={tip}
      style={{
        textAlign: a,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontSize: 11,
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontWeight: 800,
      }}
    >
      <span>{main}</span>
      {sub ? (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#ffffff',
            textTransform: 'none',
            letterSpacing: '0.02em',
            lineHeight: 1.3,
            whiteSpace: 'normal',
          }}
        >
          {sub}
        </span>
      ) : null}
    </span>
  );
}

function shortOrderId(id) {
  if (!id || typeof id !== 'string') return '—';
  return id.length > 14 ? `${id.slice(0, 10)}…` : id;
}

// ─── Positions tab — live P&L (via AuthContext /ws/exchange/account) ─────────
function PositionsTab({ activePair }) {
  const { user, fetchWallet, fetchOrders, liveSpotPositions, fetchLiveSpotPositions } = useAuth();
  const [posRefreshing, setPosRefreshing] = useState(false);
  const [closeTarget, setCloseTarget] = useState(null);

  const positions = liveSpotPositions ?? [];
  const prices = useMemo(() => {
    const priceMap = {};
    for (const pos of positions) {
      priceMap[pos.asset] = Number(pos.current_price ?? 0);
    }
    return priceMap;
  }, [positions]);

  const loading = Boolean(user && liveSpotPositions == null);

  const handleRefreshPositions = useCallback(async () => {
    setPosRefreshing(true);
    try {
      await fetchLiveSpotPositions();
    } finally {
      setPosRefreshing(false);
    }
  }, [fetchLiveSpotPositions]);

  if (!user) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10, color: '#ffffff' }}>
      <BarChart2 size={28} />
      <span style={{ fontSize: 14 }}>Please log in to view positions</span>
      <Link to="/login" style={{ color: '#EBD38D', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
    </div>
  );

  if (loading && positions.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8, color: '#ffffff', fontSize: 14 }}>
      <RefreshCw size={16} className="animate-spin" /> Loading positions…
    </div>
  );

  if (positions.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10, color: '#ffffff', textAlign: 'center', maxWidth: 360, margin: '0 auto' }}>
      <DollarSign size={28} />
      <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>No spot assets</span>
      <span style={{ fontSize: 12, lineHeight: 1.45 }}>
        Buy crypto on the right to build a balance. Like Binance / Coinbase spot, each coin is one row with size and unrealized P&amp;L (USDT).
      </span>
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
      {/* Portfolio summary — USDT, labels match typical exchange “assets” strip */}
      <div style={{
        display: 'flex', gap: 28, padding: '14px 20px',
        background: 'rgba(255,255,255,0.025)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        alignItems: 'flex-start', flexWrap: 'wrap', overflowX: 'auto',
      }} className="scrollbar-hide">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ color: '#ffffff', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total value</span>
          <span style={{ color: '#ffffff', fontSize: 11 }}>Est. worth at mark price</span>
          <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 900, fontSize: 20 }}>
            ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>USDT</span>
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ color: '#ffffff', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Cost basis</span>
          <span style={{ color: '#ffffff', fontSize: 11 }}>Avg. buy cost × size</span>
          <span style={{ color: '#ffffff', fontFamily: 'monospace', fontWeight: 800, fontSize: 18 }}>
            ${totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>USDT</span>
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ color: '#ffffff', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Unrealized P&amp;L</span>
          <span style={{ color: '#ffffff', fontSize: 11 }}>Not sold yet — vs cost basis</span>
          <span style={{
            fontFamily: 'monospace', fontWeight: 900, fontSize: 20,
            color: totalPnl >= 0 ? '#22c55e' : '#ef4444',
          }}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
            <span style={{ fontSize: 14, fontWeight: 800, opacity: 0.9 }}>
              ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
            </span>
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            to="/portfolio"
            style={{ fontSize: 12, fontWeight: 800, color: '#EBD38D', textDecoration: 'none', whiteSpace: 'nowrap' }}
            className="hover:underline"
          >
            P&amp;L analysis →
          </Link>
          <button onClick={handleRefreshPositions} disabled={loading || posRefreshing}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff', opacity: loading || posRefreshing ? 0.4 : 1 }}
            className="hover:text-white transition-colors">
            <RefreshCw size={16} className={loading || posRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Spot assets table — similar to exchange “assets / wallet” breakdown */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(120px,1.05fr) 0.85fr 0.9fr 0.9fr 0.9fr 0.9fr minmax(132px,1fr) 1.12fr minmax(88px,0.75fr)',
          gap: 10, padding: '12px 20px', minWidth: 1080,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.015)',
          alignItems: 'end',
        }}>
        <Th main="Coin" sub="Spot pair" title="Asset you hold" />
        <Th main="Size" sub="Total balance" align="right" title="Total coins in wallet (incl. locked in orders)" />
        <Th main="Available" sub="Free to sell" align="right" title="Balance not locked in open sell orders" />
        <Th main="Avg. entry" sub="USDT per coin" align="right" title="Average buy price from your trade history" />
        <Th main="Mark" sub="Last / index" align="right" title="Current market price in USDT" />
        <Th main="Value" sub="USDT" align="right" title="Size × mark price" />
        <Th main="Last fill" sub="Buy or sell" align="right" title="Most recent execution on this pair (spot)" />
        <Th main="Unrealized P&amp;L" sub="USDT &amp; ROI %" align="right" title="Value minus cost basis; profit if you sold at mark" />
        <Th main="Action" sub="Reduce / close" align="right" />
      </div>

      {/* Rows */}
      {positions.map(pos => {
        const currentPrice = prices[pos.asset] ?? 0;
        const currentValue = currentPrice * pos.amount;
        const pnl          = currentValue - (pos.total_invested ?? 0);
        const pnlPct       = (pos.total_invested ?? 0) > 0 ? (pnl / pos.total_invested) * 100 : 0;
        const isUp         = pnl >= 0;
        const icon         = COIN_ICONS[pos.asset];
        const isActivePair = activePair && pos.symbol === String(activePair).toUpperCase();

        const locked = Number(pos.locked ?? 0);
        return (
          <div key={pos.asset}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(120px,1.05fr) 0.85fr 0.9fr 0.9fr 0.9fr 0.9fr minmax(132px,1fr) 1.12fr minmax(88px,0.75fr)',
              gap: 10, padding: '14px 20px', alignItems: 'center', minWidth: 1080,
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              borderLeft: isActivePair ? '3px solid rgba(235,211,141,0.65)' : '3px solid transparent',
              transition: 'background 0.15s',
            }}
            className="hover:bg-white/[.03]">

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {icon && <img src={icon} alt={pos.asset} style={{ width: 28, height: 28, borderRadius: '50%' }} />}
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{pos.asset}</div>
                <div style={{ color: '#ffffff', fontSize: 11, fontWeight: 600 }}>{pos.symbol?.replace('USDT', '/USDT') || `${pos.asset}/USDT`}</div>
              </div>
            </div>

            <span style={{ textAlign: 'right', color: '#ffffff', fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
              {pos.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}{' '}
              <span style={{ color: '#ffffff', fontSize: 11 }}>{pos.asset}</span>
            </span>

            <span style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}>
              <span style={{ color: '#fff', fontWeight: 700 }}>{Number(pos.available ?? 0).toLocaleString(undefined, { maximumFractionDigits: 8 })}</span>
              {locked > 1e-10 && (
                <span style={{ display: 'block', fontSize: 10, color: '#ffffff', marginTop: 2 }}>
                  {locked.toLocaleString(undefined, { maximumFractionDigits: 6 })} locked
                </span>
              )}
            </span>

            <span style={{ textAlign: 'right', color: '#ffffff', fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
              ${fmtOrdP(pos.avg_cost)}
            </span>

            <span style={{ textAlign: 'right', color: '#fff', fontFamily: 'monospace', fontSize: 13, fontWeight: 800 }}>
              {currentPrice ? `$${fmtOrdP(currentPrice)}` : <span style={{ color: '#ffffff' }}>—</span>}
            </span>

            <span style={{ textAlign: 'right', color: '#fff', fontFamily: 'monospace', fontWeight: 800, fontSize: 14 }}>
              ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>

            <div style={{ textAlign: 'right', fontSize: 11 }}>
              {pos.last_fill_side ? (
                <>
                  <span style={{
                    fontWeight: 900,
                    color: String(pos.last_fill_side).toLowerCase() === 'buy' ? '#22c55e' : '#ef4444',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    {String(pos.last_fill_side).toLowerCase() === 'buy' ? 'Buy' : 'Sell'}
                  </span>
                  <div style={{ color: '#ffffff', fontFamily: 'monospace', marginTop: 4, fontWeight: 600 }}>
                    {Number(pos.last_fill_amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} @ ${fmtOrdP(pos.last_fill_price)}
                  </div>
                  <div style={{ color: '#ffffff', fontSize: 10, marginTop: 2 }}>
                    {pos.last_fill_at ? new Date(pos.last_fill_at).toLocaleString() : ''}
                  </div>
                  <div style={{ color: '#ffffff', fontSize: 10, marginTop: 4 }} title="Lifetime base volume from your fills">
                    Σ buy {Number(pos.lifetime_buy_qty ?? 0).toFixed(4)} · Σ sell {Number(pos.lifetime_sell_qty ?? 0).toFixed(4)}
                  </div>
                </>
              ) : (
                <span style={{ color: '#ffffff' }}>—</span>
              )}
            </div>

            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
              <span style={{ fontWeight: 900, fontSize: 14, color: isUp ? '#22c55e' : '#ef4444' }}>
                {isUp ? '+' : ''}${pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  marginLeft: 8,
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: isUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  color: isUp ? '#22c55e' : '#ef4444',
                }}
              >
                {isUp ? '+' : ''}{pnlPct.toFixed(2)}%
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setCloseTarget({
                  ...pos,
                  symbol: String(pos.symbol || '').replace(/\//g, '').toUpperCase(),
                  current_price: pos.current_price ?? currentPrice,
                })}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 800,
                  color: '#EBD38D', background: 'rgba(235,211,141,0.12)',
                  border: '1px solid rgba(235,211,141,0.35)', cursor: 'pointer',
                }}
                className="hover:bg-gold/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        );
      })}
      </div>{/* end overflow-x-auto */}

      {closeTarget && (
        <ClosePositionModal
          position={closeTarget}
          onDismiss={() => setCloseTarget(null)}
          onSuccess={async () => {
            await Promise.all([fetchLiveSpotPositions(), fetchWallet(), fetchOrders()]);
          }}
        />
      )}
    </div>
  );
}

// ─── Map order id → sum of realized P&L (USDT) from sell fills ───────────────
function buildOrderRealizedPnlMap(trades) {
  const m = new Map();
  if (!Array.isArray(trades)) return m;
  for (const t of trades) {
    const oid = t.order_id;
    if (!oid) continue;
    const sd = String(t.side || '').toLowerCase();
    if (sd !== 'sell') continue;
    const rp = t.realized_pnl;
    if (rp == null || Number.isNaN(Number(rp))) continue;
    m.set(oid, (m.get(oid) || 0) + Number(rp));
  }
  return m;
}

// ─── ZONE 2: Unified bottom panel ─────────────────────────────────────────────
function BottomPanel({ symbol }) {
  const {
    user,
    openOrders,
    orderHistory,
    ordersLoading,
    fetchOrders,
    fetchWallet,
    fetchLiveSpotPositions,
    userTrades,
    userTradesLoading,
    fetchUserTrades,
  } = useAuth();
  const [tab,        setTab]        = useState('positions');
  const [cancelling, setCancelling] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  useEffect(() => {
    if (tab !== 'orders') setCancelError(null);
  }, [tab]);

  const orderPnlById = useMemo(() => buildOrderRealizedPnlMap(userTrades), [userTrades]);

  const historyTotalRealizedPnl = useMemo(() => {
    let s = 0;
    for (const o of orderHistory) {
      if (String(o.side || '').toLowerCase() !== 'sell') continue;
      if ((o.filled ?? 0) < 1e-10) continue;
      const v = orderPnlById.get(o.id);
      if (v != null && !Number.isNaN(v)) s += v;
    }
    return s;
  }, [orderHistory, orderPnlById]);

  const handleCancel = async id => {
    if (!window.confirm('Cancel this open order? Any locked funds for this order will be returned.')) return;
    setCancelError(null);
    setCancelling(id);
    try {
      const res = await authFetch(`${API}/api/orders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await Promise.all([fetchOrders(), fetchWallet(), fetchLiveSpotPositions()]);
      } else {
        setCancelError(await parseApiError(res));
      }
    } catch (e) {
      setCancelError(e.message || 'Network error');
    } finally {
      setCancelling(null);
    }
  };

  const statusColor = s =>
    s === 'filled'           ? '#22c55e' :
    s === 'partially_filled' ? '#60a5fa' :
    s === 'cancelled'        ? '#ef4444' : '#ffffff';

  const statusIcon = s =>
    s === 'filled'    ? <CheckCircle size={11} /> :
    s === 'cancelled' ? <AlertCircle size={11} />
                      : <Clock size={11} />;

  const TABS = [
    { id: 'positions', label: 'Assets',       badge: null },
    { id: 'orders',    label: 'Open orders',  badge: openOrders.length || null },
    { id: 'history',   label: 'Order history' },
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
              color: tab === t.id ? '#EBD38D' : '#ffffff',
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
          <button
            onClick={async () => {
              await fetchOrders();
              if (tab === 'history') await fetchUserTrades();
            }}
            disabled={ordersLoading || (tab === 'history' && userTradesLoading)}
            style={{ marginLeft: 'auto', padding: 7, background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff', opacity: ordersLoading || (tab === 'history' && userTradesLoading) ? 0.4 : 1 }}
            className="hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={ordersLoading || (tab === 'history' && userTradesLoading) ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {tab === 'positions' && (
        <TabHint>
          <strong style={{ color: '#ffffff' }}>Spot holdings</strong> (like Binance &quot;Assets&quot; or Coinbase balance): one row per coin.
          <strong style={{ color: '#ffffff' }}> Unrealized P&amp;L</strong> is estimated profit or loss in USDT if you sold at the mark price, using your average buy cost.
        </TabHint>
      )}
      {tab === 'orders' && (
        <TabHint>
          Orders that are <strong style={{ color: '#ffffff' }}>working on the book</strong> (limit) or waiting to complete (market).
          Nothing here is final P&amp;L until the order <strong style={{ color: '#ffffff' }}>fills</strong> — then it moves to order history and your asset balance updates.
        </TabHint>
      )}
      {tab === 'history' && (
        <TabHint>
          <strong style={{ color: '#ffffff' }}>Ledger of past orders</strong> (each row = one order you placed).
          <strong style={{ color: '#ffffff' }}> Realized P&amp;L</strong> (USDT) only on <strong style={{ color: '#ffffff' }}>sells</strong> that executed — buys open or add to your position; they show &quot;—&quot; here.
          For every individual fill, use the <Link to="/portfolio" style={{ color: '#EBD38D', fontWeight: 700 }}>P&amp;L</Link> page.
        </TabHint>
      )}

      {/* Positions */}
      {tab === 'positions' && <PositionsTab activePair={symbol} />}

      {/* Open Orders / History */}
      {(tab === 'orders' || tab === 'history') && (() => {
        const rows = tab === 'orders' ? openOrders : orderHistory;
        const histPnl = tab === 'history';
        const gridCols = histPnl
          ? '1.22fr 0.78fr 0.48fr 0.48fr 0.88fr 0.88fr 1.05fr 1.02fr 0.88fr 0.62fr'
          : '1.38fr 0.85fr 0.5fr 0.5fr 0.92fr 0.88fr 0.92fr 0.9fr';
        const minW = histPnl ? 980 : 760;
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
            {tab === 'orders' && cancelError && (
              <div
                style={{
                  margin: '8px 16px 0', padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#fca5a5', fontSize: 13, fontWeight: 600,
                }}
                role="alert"
              >
                {cancelError}
              </div>
            )}
            {histPnl && user && rows.length > 0 && (
              <div
                style={{
                  margin: '10px 16px 0',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 13,
                }}
              >
                <span style={{ color: '#ffffff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Total realized P&amp;L (USDT)
                </span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: 16,
                    color: historyTotalRealizedPnl >= 0 ? '#22c55e' : '#ef4444',
                  }}
                >
                  {historyTotalRealizedPnl >= 0 ? '+' : ''}
                  ${historyTotalRealizedPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span style={{ color: '#ffffff', fontSize: 12, maxWidth: 480, lineHeight: 1.45 }}>
                  Sum of the <strong style={{ color: '#ffffff' }}>Realized P&amp;L</strong> column below (only rows where you <strong style={{ color: '#ffffff' }}>sold</strong> and the order executed). Same average-cost method as major spot exchanges. Per-fill detail:{' '}
                  <Link to="/portfolio" style={{ color: '#EBD38D', fontWeight: 700, textDecoration: 'none' }} className="hover:underline">
                    P&amp;L &amp; fills
                  </Link>
                  .
                </span>
              </div>
            )}
            <div style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              gap: 10, padding: '12px 20px', minWidth: minW,
              borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
              background: 'rgba(255,255,255,0.015)',
              alignItems: 'end',
            }}>
              <Th main="Time" sub="Order placed" title="When you submitted the order" />
              <Th main="Pair" sub="Market" />
              <Th main="Type" sub="Limit / market" />
              <Th main="Side" sub="Buy or sell" />
              <Th main="Order price" sub="Limit or MKT" align="right" title="Limit: your price. Market: executes at book." />
              {histPnl && (
                <Th main="Avg. fill" sub="Execution" align="right" title="Volume-weighted average price of filled size (USDT)" />
              )}
              <Th main={histPnl ? 'Executed' : 'Order qty'} sub={histPnl ? 'Filled / total' : 'Requested size'} align="right" />
              {!histPnl && <Th main="Filled" sub="So far" align="right" title="Amount already matched" />}
              {histPnl && (
                <Th main="Realized P&amp;L" sub="USDT · sells" align="right" title="Profit or loss on sold size for this order (avg. cost)" />
              )}
              <Th main={tab === 'orders' ? 'Action' : 'Status'} sub={tab === 'orders' ? 'Cancel' : 'Final state'} align="right" />
              {histPnl && <Th main="Order ID" sub="Reference" title="Internal order id — support may ask for this" />}
            </div>

            {/* Rows */}
            <div style={{ flex: 1 }}>
              {ordersLoading && rows.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10, color: '#ffffff', fontSize: 15 }}>
                  <RefreshCw size={18} className="animate-spin" /> Loading…
                </div>
              ) : !user ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, color: '#ffffff' }}>
                  <Clock size={32} />
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Please log in to view orders</span>
                  <Link to="/login" style={{ color: '#EBD38D', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
                </div>
              ) : rows.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 56, gap: 10, color: '#ffffff', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
                  <Clock size={32} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                    {tab === 'orders' ? 'No open orders' : 'No order history yet'}
                  </span>
                  <span style={{ fontSize: 12, lineHeight: 1.45 }}>
                    {tab === 'orders'
                      ? 'Place a limit order (or a market order that rests) and it will show here until it fills or you cancel.'
                      : 'Completed and cancelled orders appear here — like an account ledger. Realized P&L shows on sells that executed.'}
                  </span>
                </div>
              ) : rows.map(o => {
                const sellSide = String(o.side || '').toLowerCase() === 'sell';
                const hasFill = (o.filled ?? 0) > 1e-10;
                const rowPnl = histPnl && sellSide && hasFill ? orderPnlById.get(o.id) : null;
                const showRowPnl = rowPnl != null && !Number.isNaN(Number(rowPnl));
                const baseSym = o.symbol?.replace('USDT', '') || '';
                const avgFill = hasFill && (o.avg_price ?? 0) > 0 ? o.avg_price : null;
                return (
                <div key={o.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: gridCols,
                    gap: 10, padding: '14px 20px', alignItems: 'center', minWidth: minW,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s',
                  }}
                  className="hover:bg-white/[.03]">
                  <span style={{ color: '#ffffff', fontSize: 12, fontFamily: 'monospace' }}>{ORDER_FMT(o.created_at)}</span>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{o.symbol.replace('USDT', '/USDT')}</span>
                  <span style={{ color: '#ffffff', textTransform: 'capitalize', fontSize: 13, fontWeight: 600 }}>{o.type}</span>
                  <span style={{
                    color: o.side === 'buy' ? '#22c55e' : '#ef4444',
                    fontWeight: 800, textTransform: 'uppercase', fontSize: 13,
                    background: o.side === 'buy' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    padding: '2px 8px', borderRadius: 6, display: 'inline-block',
                  }}>
                    {o.side}
                  </span>
                  <span style={{ textAlign: 'right', color: '#ffffff', fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                    {o.type === 'market' ? <span style={{ color: '#ffffff', fontWeight: 800 }}>Market</span> : `$${fmtOrdP(o.price)}`}
                  </span>
                  {histPnl && (
                    <span style={{ textAlign: 'right', color: '#ffffff', fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                      {avgFill != null ? `$${fmtOrdP(avgFill)}` : <span style={{ color: '#ffffff' }}>—</span>}
                    </span>
                  )}
                  {histPnl ? (
                    <span style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: '#ffffff' }}>
                      <span style={{ color: o.filled > 0 ? '#fff' : '#ffffff', fontWeight: 700 }}>{Number(o.filled).toFixed(6)}</span>
                      <span style={{ color: '#ffffff', margin: '0 4px' }}>/</span>
                      <span style={{ fontWeight: 600 }}>{Number(o.amount).toFixed(6)}</span>
                      {o.amount > 0 && (
                        <span style={{ display: 'block', fontSize: 10, color: '#ffffff', marginTop: 2 }}>
                          {((o.filled / o.amount) * 100).toFixed(0)}% {baseSym}
                        </span>
                      )}
                    </span>
                  ) : (
                    <>
                      <span style={{ textAlign: 'right', color: '#ffffff', fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                        {Number(o.amount).toFixed(6)} <span style={{ color: '#ffffff', fontSize: 11 }}>{baseSym}</span>
                      </span>
                      <span style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}>
                        <span style={{ color: o.filled > 0 ? '#fff' : '#ffffff', fontWeight: 700 }}>{Number(o.filled).toFixed(6)}</span>
                        {o.amount > 0 && (
                          <span style={{ color: '#ffffff', fontSize: 11, marginLeft: 4 }}>
                            ({((o.filled / o.amount) * 100).toFixed(0)}%)
                          </span>
                        )}
                      </span>
                    </>
                  )}
                  {histPnl && (
                    <span
                      style={{
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontSize: 13,
                        fontWeight: 800,
                        color: showRowPnl ? (rowPnl >= 0 ? '#22c55e' : '#ef4444') : '#ffffff',
                      }}
                    >
                      {showRowPnl ? (
                        <>{rowPnl >= 0 ? '+' : ''}${Number(rowPnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}</>
                      ) : (
                        '—'
                      )}
                    </span>
                  )}
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
                      color: statusColor(o.status), fontSize: 13, fontWeight: 700, textTransform: 'capitalize',
                    }}>
                      {statusIcon(o.status)} {o.status.replace('_', ' ')}
                    </div>
                  )}
                  {histPnl && (
                    <span style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: '#ffffff' }} title={o.id}>
                      {shortOrderId(o.id)}
                    </span>
                  )}
                </div>
                );
              })}
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
  const [searchParams] = useSearchParams();
  const sideQ = searchParams.get('side');
  const formInitialSide = sideQ === 'sell' ? 'sell' : sideQ === 'buy' ? 'buy' : undefined;

  const [symbol,        setSymbol]        = useState((p || 'BZXUSDT').toUpperCase());
  const [ticker,        setTicker]        = useState(null);
  const [pairOpen,      setPairOpen]      = useState(false);
  const [formPrice,     setFormPrice]     = useState('');
  const [mobilePanelTab, setMobilePanelTab] = useState('trade'); // 'trade' | 'book'

  const dropRef = useRef(null);
  const [dropPos, setDropPos] = useState(null);

  const base = symbol.replace('USDT', '');
  const icon = COIN_ICONS[base];

  useEffect(() => {
    setTicker(null);
    const qs = new URLSearchParams({ symbol });
    const url = exchangeWsPath(`/api/ws/exchange/ticker?${qs.toString()}`);
    let closed = false;
    let reconnectTimer = null;
    let ws = null;
    const connect = () => {
      if (closed) return;
      ws = new WebSocket(url);
      ws.onmessage = (ev) => {
        try {
          const j = JSON.parse(ev.data);
          if (j.type === 'exchange_ticker' && j.ticker) setTicker(j.ticker);
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
  }, [symbol]);

  useEffect(() => {
    if (p) setSymbol(String(p).toUpperCase());
  }, [p]);

  const switchPair = sym => {
    setSymbol(sym);
    navigate(`/trade/${sym}`, { replace: true });
    setPairOpen(false); setFormPrice('');
  };

  const onOrderBookPrice = useCallback(pr => { setFormPrice(pr); }, []);
  const onOrderBookPriceMobile = useCallback(pr => {
    setFormPrice(pr);
    setMobilePanelTab('trade');
  }, []);

  const pct       = parseFloat(ticker?.priceChangePercent ?? 0);
  const isUp      = pct >= 0;
  const livePrice = ticker?.price ?? null;

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
          }}
          className="bitzx-chip">
          {icon && <img src={icon} alt={base} style={{ width: 24, height: 24, borderRadius: '50%' }} />}
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{base}</span>
          <span style={{ fontSize: 13, color: '#ffffff' }}>/USDT</span>
          <ChevronDown size={13} color="#ffffff"
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
                    border: 'none', color: q === symbol ? '#EBD38D' : '#ffffff',
                    transition: 'background 0.15s',
                  }}
                  className="hover:bg-white/5">
                  {COIN_ICONS[b] && <img src={COIN_ICONS[b]} alt={b} style={{ width: 26, height: 26, borderRadius: '50%' }} />}
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{b}/USDT</div>
                    <div style={{ fontSize: 11, color: '#ffffff', marginTop: 1 }}>Spot</div>
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
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', color: '#ffffff', fontSize: 14, textDecoration: 'none' }}
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
          </div>
        </div>

        {/* Mobile Chart — explicit pixel height so TradingView renders */}
        <div style={{ height: 280, position: 'relative', overflow: 'hidden', pointerEvents: pairOpen ? 'none' : 'auto' }}>
          <TradingChart symbol={symbol} />
        </div>

        <div style={{
          display: 'flex', background: '#0d0f14',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          {[['trade', 'Trade'], ['book', 'Order Book']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setMobilePanelTab(id)}
              style={{
                flex: 1, padding: '13px 0', fontSize: 14, fontWeight: 700,
                color: mobilePanelTab === id ? '#EBD38D' : '#ffffff',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${mobilePanelTab === id ? '#EBD38D' : 'transparent'}`,
                transition: 'color 0.15s',
              }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ background: '#0a0b0f', minHeight: 520 }}>
          {mobilePanelTab === 'trade'
            ? <TradeForm symbol={symbol} currentPrice={formPrice || fmtP(livePrice, base)} initialSide={formInitialSide} />
            : <div style={{ height: 520, position: 'relative', overflow: 'hidden' }}>
                <OrderBook
                  symbol={symbol}
                  baseAsset={base}
                  lastPrice={livePrice}
                  onPriceClick={onOrderBookPriceMobile}
                />
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
          </div>
        </div>

        {/* Desktop three columns */}
        <div style={{ display: 'flex', flex: '1 1 0', minHeight: 0 }}>
          <div style={{ flex: '1 1 0', minWidth: 0, position: 'relative', overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,0.06)', pointerEvents: pairOpen ? 'none' : 'auto' }}>
            <TradingChart symbol={symbol} />
          </div>
          <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <OrderBook
              symbol={symbol}
              baseAsset={base}
              lastPrice={livePrice}
              onPriceClick={onOrderBookPrice}
            />
          </div>
          <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: '1 1 0', overflowY: 'auto' }} className="scrollbar-hide">
              <TradeForm symbol={symbol} currentPrice={formPrice || fmtP(livePrice, base)} initialSide={formInitialSide} />
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
