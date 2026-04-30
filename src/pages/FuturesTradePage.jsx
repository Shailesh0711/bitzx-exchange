/**
 * FuturesTradePage — same two-zone layout as the spot TradePage.
 *
 * Zone 1 (calc(100vh - 70px)):
 *   ┌──────────────────────────────────────────────────────┐
 *   │  Pair dropdown · mark price · funding · max leverage │
 *   ├────────────────────┬──────────────┬──────────────────┤
 *   │  Chart (flex-1)    │  Order Book  │  Trade Form      │
 *   │                    │  (~340px)    │  (420px, scroll) │
 *   └────────────────────┴──────────────┴──────────────────┘
 *
 * Zone 2 (scroll): Positions | Open orders | Order history
 *
 * Source-of-truth: the URL `/futures/:symbol`. The page calls
 * `setActiveSymbol(routeSymbol)` whenever the param changes — the context
 * never writes back to the URL.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronDown, TrendingUp, TrendingDown, Globe, RefreshCw } from 'lucide-react';
import { COIN_ICONS } from '@/services/marketApi';
import { FuturesProvider, useFutures } from '@/context/FuturesContext';
import { futuresApi } from '@/services/futuresApi';
import { useAuth } from '@/context/AuthContext';
import FuturesChart        from '@/components/futures/FuturesChart';
import FuturesOrderBook    from '@/components/futures/FuturesOrderBook';
import FuturesRecentTrades from '@/components/futures/FuturesRecentTrades';
import FuturesTradeForm    from '@/components/futures/FuturesTradeForm';
import FuturesPositions    from '@/components/futures/FuturesPositions';
import FuturesOpenOrders   from '@/components/futures/FuturesOpenOrders';
import FuturesOrderHistory from '@/components/futures/FuturesOrderHistory';
import FuturesWalletPanel  from '@/components/futures/FuturesWalletPanel';

const DEFAULT_SYMBOL = 'BTCUSDT-PERP';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtPrice = (v) => {
  const n = Number(v); if (!n) return '—';
  return n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
       : n >= 1    ? n.toFixed(4)
                   : n.toFixed(6);
};

function StatItem({ label, value, color }) {
  return (
    <div className="flex flex-col gap-0.5 pl-5 border-l border-white/[.06]">
      <span className="text-[11px] uppercase tracking-widest font-bold text-white whitespace-nowrap">{label}</span>
      <span className={`text-[15px] font-mono font-extrabold whitespace-nowrap ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}

// ─── Pair dropdown (portal, like TradePage) ─────────────────────────────────
function PairDropdown({ activeSymbol, symbols }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  const meta = symbols.find((s) => s.symbol === activeSymbol);
  const base = meta?.base || (activeSymbol || '').split('USDT')[0] || '';
  const icon = COIN_ICONS[base];

  const switchTo = (sym) => { navigate(`/futures/${sym}`); setOpen(false); };

  return (
    <>
      <div ref={ref} className="relative shrink-0">
        <button
          onClick={() => {
            if (!open && ref.current) {
              const r = ref.current.getBoundingClientRect();
              setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 310) });
            }
            setOpen((v) => !v);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderRadius: 10, background: '#161820',
            border: `1px solid ${open ? 'rgba(235,211,141,0.45)' : 'rgba(255,255,255,0.07)'}`,
            cursor: 'pointer', transition: 'border-color 0.2s',
          }}
        >
          {icon && <img src={icon} alt={base} style={{ width: 24, height: 24, borderRadius: '50%' }} />}
          <span className="text-[15px] font-bold text-white">{base}</span>
          <span className="text-[13px] text-white/70">USDT-PERP</span>
          <ChevronDown size={13} color="#fff"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </button>
      </div>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'fixed', top: pos.top, left: pos.left,
              width: Math.min(310, window.innerWidth - 16), background: '#161820',
              border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12,
              boxShadow: '0 32px 64px rgba(0,0,0,0.85)', zIndex: 9999,
              maxHeight: '65vh', overflowY: 'auto', padding: '6px 0',
            }}
            className="scrollbar-hide"
          >
            <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest text-white/50 font-bold">
              Perpetuals
            </div>
            {symbols.map((s) => {
              const b = s.base;
              const active = s.symbol === activeSymbol;
              return (
                <button
                  key={s.symbol}
                  onClick={() => switchTo(s.symbol)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 16px', cursor: 'pointer',
                    background: active ? 'rgba(235,211,141,0.07)' : 'transparent',
                    border: 'none', color: active ? '#EBD38D' : '#fff',
                    transition: 'background 0.15s',
                  }}
                  className="hover:bg-white/5"
                >
                  {COIN_ICONS[b] && <img src={COIN_ICONS[b]} alt={b} style={{ width: 26, height: 26, borderRadius: '50%' }} />}
                  <div className="flex-1 text-left">
                    <div className="font-bold text-[14px]">{b}/USDT-PERP</div>
                    <div className="text-[11px] text-white/50">Up to {s.max_leverage}× · tick {s.tick_size}</div>
                  </div>
                  {active && (
                    <span className="text-[10px] font-bold rounded-full bg-amber-300/15 text-amber-300 px-2 py-0.5">ACTIVE</span>
                  )}
                </button>
              );
            })}
            <div className="border-t border-white/5 mt-1">
              <Link
                to="/markets"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-white/60 text-sm hover:bg-white/5"
              >
                <Globe size={15} /> Spot markets
              </Link>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

// ─── Bottom panel — Positions / Open orders / Order history ─────────────────
function BottomPanel() {
  const [tab, setTab] = useState('positions');
  const { positions, openOrders, orderHistory } = useFutures();

  const TABS = [
    { id: 'positions', label: 'Positions',     count: positions.length },
    { id: 'open',      label: 'Open orders',   count: openOrders.length },
    { id: 'history',   label: 'Order history', count: orderHistory.length },
  ];

  return (
    <div className="flex flex-col bg-[#0d0f14]" style={{ minHeight: 460 }}>
      <div
        className="sticky top-0 z-10 flex items-center bg-[#0d0f14] overflow-x-auto scrollbar-hide"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', paddingLeft: 8, paddingRight: 14 }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '14px 22px', fontSize: 15, fontWeight: 700,
              borderBottom: `2px solid ${tab === t.id ? '#EBD38D' : 'transparent'}`,
              color: tab === t.id ? '#EBD38D' : '#ffffff',
              background: 'transparent', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span className="text-[12px] font-extrabold rounded-full bg-amber-300/20 text-amber-300 px-2.5 py-0.5">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1">
        {tab === 'positions' && <FuturesPositions />}
        {tab === 'open'      && <FuturesOpenOrders />}
        {tab === 'history'   && <FuturesOrderHistory />}
      </div>
    </div>
  );
}

// ─── Top header (mobile + desktop) ──────────────────────────────────────────
function MarketHeader({ funding }) {
  const { activeSymbol, symbols, markets, orderbook, recentTrades } = useFutures();
  const meta = symbols.find((s) => s.symbol === activeSymbol);
  const m = markets[activeSymbol];

  const mark    = Number(m?.mark_price  || 0);
  const idx     = Number(m?.index_price || 0);
  const bestBid = Number(orderbook?.bids?.[0]?.price || 0);
  const bestAsk = Number(orderbook?.asks?.[0]?.price || 0);
  const last    = Number(recentTrades?.[0]?.price || 0);
  const basis   = mark && idx ? ((mark - idx) / idx) * 100 : 0;
  const isUp    = basis >= 0;

  return (
    <div
      className="flex flex-col px-4 py-2 bg-[#0d0f14]"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 200, flexShrink: 0 }}
    >
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
        <PairDropdown activeSymbol={activeSymbol} symbols={symbols} />
        <div className="flex items-center gap-3 pr-5 shrink-0">
          <span className={`font-mono font-black text-[28px] sm:text-[32px] tracking-[-0.5px] ${isUp ? 'text-emerald-300' : 'text-rose-300'}`}>
            ${fmtPrice(mark)}
          </span>
          <span
            className={`hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[14px] font-extrabold ${
              isUp ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
            }`}
          >
            {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {isUp ? '+' : ''}{basis.toFixed(3)}% basis
          </span>
        </div>
        <div className="hidden md:flex">
          <StatItem label="Index"        value={idx ? `$${fmtPrice(idx)}` : '—'} />
          <StatItem label="Last trade"   value={last ? `$${fmtPrice(last)}` : '—'} />
          <StatItem label="Best bid"     value={bestBid ? `$${fmtPrice(bestBid)}` : '—'}
                    color="text-emerald-300" />
          <StatItem label="Best ask"     value={bestAsk ? `$${fmtPrice(bestAsk)}` : '—'}
                    color="text-rose-300" />
        </div>
        <div className="hidden lg:flex">
          <StatItem label="Funding"      value={funding != null ? `${(funding * 100).toFixed(4)}%` : '—'}
                    color={funding != null ? (funding >= 0 ? 'text-amber-300' : 'text-emerald-300') : null} />
          <StatItem label="Max leverage" value={meta ? `${meta.max_leverage}×` : '—'} />
          <StatItem label="Tick / Lot"   value={meta ? `${meta.tick_size} / ${meta.lot_size}` : '—'} />
        </div>
        <div className="ml-auto hidden md:flex items-center gap-2 text-[11px] text-white/50">
          <RefreshCw size={12} /> live
        </div>
      </div>
    </div>
  );
}

// ─── Inner page (uses context) ──────────────────────────────────────────────
function FuturesTradePageInner() {
  const { symbol: routeSym } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { symbols, activeSymbol, setActiveSymbol } = useFutures();

  const [funding,     setFunding]     = useState(null);
  const [mobileTab,   setMobileTab]   = useState('trade');
  // Price seed from order-book row clicks — propagated to FuturesTradeForm
  // exactly the same as spot TradePage's formPrice / onOrderBookPrice.
  // Tagged with symbol so the trade form ignores stale seeds from a previous pair.
  const [obPriceSeed, setObPriceSeed] = useState({ symbol: '', price: '' });

  const onOrderBookPrice = useCallback(
    (px) => setObPriceSeed({ symbol: activeSymbol, price: px }),
    [activeSymbol],
  );
  const onOrderBookPriceMobile = useCallback(
    (px) => { setObPriceSeed({ symbol: activeSymbol, price: px }); setMobileTab('trade'); },
    [activeSymbol],
  );

  // 1) Catalog ready, no route symbol → redirect to default.
  useEffect(() => {
    if (!routeSym && symbols.length) {
      const target = symbols.find((s) => s.symbol === DEFAULT_SYMBOL) || symbols[0];
      if (target) navigate(`/futures/${target.symbol}`, { replace: true });
    }
  }, [routeSym, symbols, navigate]);

  // 2) Route symbol → context. URL is the source of truth.
  useEffect(() => {
    if (!routeSym || !symbols.length) return;
    const upper = routeSym.toUpperCase();
    const found = symbols.find((s) => s.symbol === upper);
    if (found && found.symbol !== activeSymbol) {
      setActiveSymbol(found.symbol);
    } else if (!found) {
      // Bad symbol in URL — redirect to default.
      const target = symbols.find((s) => s.symbol === DEFAULT_SYMBOL) || symbols[0];
      if (target) navigate(`/futures/${target.symbol}`, { replace: true });
    }
  }, [routeSym, symbols, activeSymbol, setActiveSymbol, navigate]);

  // 3) Funding — fetch latest each time symbol changes.
  useEffect(() => {
    let cancelled = false;
    if (!activeSymbol) return undefined;
    futuresApi.fundingRate(activeSymbol)
      .then((data) => { if (!cancelled) setFunding(data?.rate ?? null); })
      .catch(() => { if (!cancelled) setFunding(null); });
    return () => { cancelled = true; };
  }, [activeSymbol]);

  if (!activeSymbol) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-70px)] bg-[#0a0b0f] text-white/40 text-sm gap-2">
        <RefreshCw size={14} className="animate-spin" /> Loading futures…
      </div>
    );
  }

  return (
    <div className="bg-[#0a0b0f] text-white">
      {/* ═════════ MOBILE LAYOUT ═════════ */}
      <div className="flex flex-col md:hidden">
        <MarketHeader funding={funding} />

        <div style={{ height: 280 }} className="relative overflow-hidden">
          <FuturesChart symbol={activeSymbol} />
        </div>

        <div className="sticky top-0 z-10 flex bg-[#0d0f14] border-y border-white/5">
          {[['trade', 'Trade'], ['book', 'Order Book'], ['wallet', 'Wallet']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setMobileTab(id)}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                mobileTab === id ? 'text-amber-300 border-b-2 border-amber-300'
                                 : 'text-white/60 border-b-2 border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-[#0a0b0f] min-h-[520px] p-2">
          {mobileTab === 'trade'  && <FuturesTradeForm symbol={activeSymbol} limitPriceSeed={obPriceSeed} />}
          {mobileTab === 'wallet' && <FuturesWalletPanel />}
          {mobileTab === 'book'   && (
            <div className="grid grid-rows-2 gap-2 h-[520px]">
              <FuturesOrderBook onPriceClick={onOrderBookPriceMobile} />
              <FuturesRecentTrades />
            </div>
          )}
        </div>

        <div style={{ borderTop: '2px solid rgba(235,211,141,0.15)' }}>
          <BottomPanel />
        </div>
      </div>

      {/* ═════════ DESKTOP LAYOUT ═════════ */}
      <div className="hidden md:flex md:flex-col" style={{ height: 'calc(100vh - 70px)', overflow: 'hidden' }}>
        <MarketHeader funding={funding} />

        <div className="flex flex-1 min-h-0">
          {/* Chart */}
          <div className="flex-1 min-w-0 relative overflow-hidden border-r border-white/[.06]">
            <FuturesChart symbol={activeSymbol} />
          </div>

          {/* Order book + trades stacked */}
          <div className="hidden md:flex flex-col w-[340px] shrink-0 border-r border-white/[.06] min-h-0">
            <div className="flex-1 min-h-0">
              <FuturesOrderBook onPriceClick={onOrderBookPrice} />
            </div>
            <div className="h-[260px] border-t border-white/[.06] min-h-0">
              <FuturesRecentTrades />
            </div>
          </div>

          {/* Wallet + trade form */}
          <div className="flex flex-col w-[420px] shrink-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-3">
              <FuturesWalletPanel />
              <FuturesTradeForm symbol={activeSymbol} limitPriceSeed={obPriceSeed} />
              {!user && (
                <div className="text-[12px] text-white/50 text-center py-2">
                  <Link to="/login" className="text-amber-300 font-bold hover:underline">Sign in</Link> to trade futures
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop bottom panel */}
      <div className="hidden md:block" style={{ borderTop: '2px solid rgba(235,211,141,0.15)' }}>
        <BottomPanel />
      </div>
    </div>
  );
}

export default function FuturesTradePage() {
  return (
    <FuturesProvider>
      <FuturesTradePageInner />
    </FuturesProvider>
  );
}
