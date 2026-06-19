import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ChevronDown, Globe, Search, Loader2, X } from 'lucide-react';
import { PAIRS, coinIconUrl, marketApi, parsePairFromApiSymbol } from '@/services/marketApi';

const USDT_PAIRS = PAIRS.filter((p) => p.quote === 'USDT');
const STATIC_BZX_PAIRS = PAIRS.filter((p) => p.quote === 'BZX');

function normalizeListedUsdtPair(m) {
  if (!m?.symbol) return null;
  const sym = String(m.symbol).toUpperCase();
  const base = (m.base || sym.replace(/USDT$/, '')).toUpperCase();
  return {
    symbol: sym,
    base,
    quote: 'USDT',
    logo_url: m.logo_url,
    token_name: m.token_name,
    project_name: m.project_name,
    source: 'listed',
  };
}

function normalizeBzxMarket(m) {
  if (!m?.symbol) return null;
  const sym = String(m.symbol).toUpperCase();
  const { base } = parsePairFromApiSymbol(sym);
  return {
    symbol: sym,
    base,
    quote: 'BZX',
    logo_url: m.logo_url,
    token_name: m.token_name,
    project_name: m.project_name,
  };
}

function filterPairs(pairs, q) {
  const needle = (q || '').trim().toUpperCase();
  if (!needle) return pairs;
  return pairs.filter((p) => {
    const sym = p.symbol.toUpperCase();
    const b = (p.base || '').toUpperCase();
    return sym.includes(needle) || b.includes(needle) || `${b}/${p.quote}`.includes(needle);
  });
}

function PairRow({ pr, active, onPick, accent }) {
  const b = pr.base;
  const q = pr.symbol;
  const iconSrc = coinIconUrl(b, pr.logo_url);
  const isBzx = pr.quote === 'BZX';
  const activeBg = isBzx ? 'rgba(235,211,141,0.12)' : 'rgba(91,184,255,0.07)';
  const activeColor = isBzx ? '#EBD38D' : '#5BB8FF';
  const badgeBg = isBzx ? 'rgba(235,211,141,0.15)' : 'rgba(91,184,255,0.15)';

  return (
    <button
      type="button"
      onClick={() => onPick(q)}
      className="w-full flex items-center gap-3 px-4 py-2.5 border-0 cursor-pointer transition-colors hover:bg-white/5"
      style={{
        background: q === active ? activeBg : 'transparent',
        color: q === active ? activeColor : '#fff',
      }}
    >
      {iconSrc ? (
        <img src={iconSrc} alt={b} className="w-[26px] h-[26px] rounded-full shrink-0 object-cover" loading="lazy" />
      ) : (
        <div className="w-[26px] h-[26px] rounded-full shrink-0 bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/70">
          {b.slice(0, 2)}
        </div>
      )}
      <div className="flex-1 text-left min-w-0">
        <div className="font-bold text-sm truncate">
          {b}/{pr.quote}
        </div>
        <div className="text-[11px] truncate" style={{ color: isBzx ? 'rgba(235,211,141,0.5)' : 'rgba(255,255,255,0.5)' }}>
          {isBzx ? 'BZX market' : 'Spot'}
        </div>
      </div>
      {q === active && (
        <span className="text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0" style={{ background: badgeBg, color: activeColor }}>
          ACTIVE
        </span>
      )}
    </button>
  );
}

/**
 * Searchable spot pair selector — static USDT list + paginated/search BZX markets API.
 */
export default function TradePairPicker({ symbol, onSelect, displayBase, apiQuote, icon, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [allBzx, setAllBzx] = useState([]);
  const [listedUsdt, setListedUsdt] = useState([]);
  const [bzxLoading, setBzxLoading] = useState(false);

  const btnRef = useRef(null);
  const searchRef = useRef(null);

  const activeSym = String(symbol || '').toUpperCase();
  const { base: activeBase, quote: activeQuote } = parsePairFromApiSymbol(activeSym);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 280);
    return () => window.clearTimeout(t);
  }, [query]);

  const loadListedUsdt = useCallback(() => {
    marketApi
      .getMarkets()
      .then((markets) => {
        const staticSyms = new Set(USDT_PAIRS.map((p) => p.symbol));
        const extra = (markets || [])
          .filter((m) => m?.symbol?.endsWith('USDT') && (m.is_listed || m.source === 'listed' || m.source === 'internal_mock'))
          .map(normalizeListedUsdtPair)
          .filter((p) => p && !staticSyms.has(p.symbol));
        setListedUsdt(extra);
      })
      .catch(() => setListedUsdt([]));
  }, []);

  const loadAllBzx = useCallback(() => {
    setBzxLoading(true);
    marketApi
      .fetchAllBzxMarkets()
      .then((markets) => {
        const staticSyms = new Set(STATIC_BZX_PAIRS.map((p) => p.symbol));
        const extra = (markets || [])
          .map(normalizeBzxMarket)
          .filter((p) => p && !staticSyms.has(p.symbol));
        setAllBzx(extra);
      })
      .catch(() => setAllBzx([]))
      .finally(() => setBzxLoading(false));
  }, []);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    loadListedUsdt();
    loadAllBzx();
    window.setTimeout(() => searchRef.current?.focus(), 80);
  }, [open, loadAllBzx, loadListedUsdt]);

  useEffect(() => {
    loadListedUsdt();
  }, [loadListedUsdt]);

  const openPicker = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const mobile = window.innerWidth < 768;
      if (mobile) {
        setPos({ mobile: true });
      } else {
        const w = Math.min(400, window.innerWidth - 24);
        setPos({
          mobile: false,
          top: r.bottom + 6,
          left: Math.max(12, Math.min(r.left, window.innerWidth - w - 12)),
          width: w,
        });
      }
    }
    setOpen((v) => !v);
    if (!open) {
      setQuery('');
      setDebouncedQ('');
      setTab('all');
    }
  };

  const close = () => {
    setOpen(false);
    setQuery('');
    setDebouncedQ('');
  };

  const pick = (sym) => {
    onSelect(sym);
    close();
  };

  const usdtPairs = useMemo(() => {
    const seen = new Set(USDT_PAIRS.map((p) => p.symbol));
    const merged = [...USDT_PAIRS];
    for (const p of listedUsdt) {
      if (p?.symbol && !seen.has(p.symbol)) {
        seen.add(p.symbol);
        merged.push(p);
      }
    }
    if (activeQuote === 'USDT' && activeSym && !seen.has(activeSym)) {
      merged.unshift({ symbol: activeSym, base: activeBase, quote: 'USDT' });
    }
    return merged;
  }, [listedUsdt, activeSym, activeBase, activeQuote]);

  const usdtFiltered = useMemo(() => filterPairs(usdtPairs, debouncedQ), [usdtPairs, debouncedQ]);

  const bzxList = useMemo(() => {
    const seen = new Set(STATIC_BZX_PAIRS.map((p) => p.symbol));
    const merged = [...STATIC_BZX_PAIRS];
    for (const p of allBzx) {
      if (p && !seen.has(p.symbol)) {
        seen.add(p.symbol);
        merged.push(p);
      }
    }
    if (activeQuote === 'BZX' && !seen.has(activeSym)) {
      merged.unshift({ symbol: activeSym, base: activeBase, quote: 'BZX' });
    }
    return filterPairs(merged, debouncedQ);
  }, [debouncedQ, allBzx, activeSym, activeBase, activeQuote]);

  const showUsdt = tab === 'all' || tab === 'usdt';
  const showBzx = tab === 'all' || tab === 'bzx';
  const empty =
    (showUsdt ? usdtFiltered.length : 0) + (showBzx ? bzxList.length : 0) === 0;

  const panel = open && pos && (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/50 md:bg-transparent" onClick={close} aria-hidden />
      <div
        className={`fixed z-[9999] flex flex-col bg-[#161820] border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.85)] overflow-hidden ${
          pos.mobile
            ? 'left-2 right-2 bottom-2 rounded-2xl max-h-[min(78dvh,640px)]'
            : 'rounded-xl max-h-[min(70vh,560px)]'
        }`}
        style={
          pos.mobile
            ? undefined
            : { top: pos.top, left: pos.left, width: pos.width }
        }
        role="dialog"
        aria-label="Select trading pair"
      >
        <div className="shrink-0 p-3 border-b border-white/[0.06] space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-xl bg-[#0d0f14] border border-white/[0.08] px-3 py-2.5 focus-within:border-[rgba(91,184,255,0.45)]">
              <Search size={16} className="text-white/45 shrink-0" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pair (e.g. BTC, DOT, ULTIMA)"
                className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                autoComplete="off"
                enterKeyHint="search"
              />
              {query ? (
                <button type="button" onClick={() => setQuery('')} className="text-white/50 hover:text-white p-0.5" aria-label="Clear search">
                  <X size={16} />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={close}
              className="md:hidden shrink-0 h-10 w-10 rounded-xl border border-white/10 text-white/70 flex items-center justify-center"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex gap-1.5">
            {[
              ['all', 'All'],
              ['usdt', 'USDT'],
              ['bzx', 'BZX'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                  tab === id
                    ? id === 'bzx'
                      ? 'bg-amber-400/15 border-amber-400/35 text-amber-200'
                      : 'bg-blue-500/15 border-blue-500/35 text-blue-300'
                    : 'bg-transparent border-white/[0.08] text-white/55 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          {bzxLoading && showBzx ? (
            <div className="flex items-center justify-center gap-2 py-8 text-white/50 text-sm">
              <Loader2 size={18} className="animate-spin" /> Loading all BZX markets…
            </div>
          ) : null}

          {!bzxLoading && empty ? (
            <p className="text-center text-sm text-white/45 py-10 px-4">
              No pairs match &ldquo;{debouncedQ}&rdquo;. Try a symbol or name.
            </p>
          ) : null}

          {showUsdt && usdtFiltered.length > 0 ? (
            <section>
              <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/35">
                USDT pairs
              </div>
              {usdtFiltered.map((pr) => (
                <PairRow key={pr.symbol} pr={pr} active={activeSym} onPick={pick} />
              ))}
            </section>
          ) : null}

          {showBzx && bzxList.length > 0 ? (
            <section className={showUsdt && usdtFiltered.length ? 'border-t border-white/[0.06]' : ''}>
              <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-200/55">
                BZX pairs ({bzxList.length})
              </div>
              {bzxList.map((pr) => (
                <PairRow key={pr.symbol} pr={pr} active={activeSym} onPick={pick} />
              ))}
            </section>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-white/[0.06] flex flex-col sm:flex-row">
          <Link
            to="/markets"
            onClick={close}
            className="flex-1 flex items-center gap-2.5 px-4 py-3 text-white/70 text-sm hover:bg-white/5 no-underline"
          >
            <Globe size={15} /> Spot markets
          </Link>
          <Link
            to="/bzx-markets"
            onClick={close}
            className="flex-1 flex items-center gap-2.5 px-4 py-3 text-amber-200/80 text-sm hover:bg-white/5 no-underline border-t sm:border-t-0 sm:border-l border-white/[0.06]"
          >
            <Globe size={15} /> BZX markets
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div ref={btnRef} className="relative shrink-0 max-w-[min(100%,200px)] sm:max-w-none">
        <button
          type="button"
          onClick={openPicker}
          className="bitzx-chip flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-[7px] rounded-[10px] bg-[#161820] cursor-pointer transition-[border-color] w-full sm:w-auto min-w-0"
          style={{
            border: `1px solid ${open ? 'rgba(91,184,255,0.45)' : 'rgba(255,255,255,0.07)'}`,
          }}
        >
          {icon ? (
            <img src={icon} alt={displayBase} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0" />
          ) : null}
          <span className="text-sm sm:text-[15px] font-bold text-white truncate shrink-0">
            {displayBase}
            <span
              className="text-xs sm:text-[13px]"
              style={{ color: apiQuote === 'BZX' ? '#EBD38D' : 'rgba(255,255,255,0.7)' }}
            >/{apiQuote}</span>
          </span>
          <ChevronDown
            size={13}
            color="#ffffff"
            className="shrink-0 ml-auto sm:ml-0"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
          />
        </button>
      </div>
      {panel && createPortal(panel, document.body)}
    </>
  );
}
