import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Loader2, Wallet, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import MarketCoinCell from '@/components/markets/MarketCoinCell';
import MarketsPagination from '@/components/markets/MarketsPagination';
import { useBscDirectory } from '@/hooks/useBscDirectory';
import { fmtMarketPrice, fmtMarketVol, num } from '@/lib/marketFormat';

function shortContract(addr) {
  const a = (addr || '').trim();
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function TokenCard({ item, compact }) {
  const pct = num(item.priceChangePercent);
  const hasPct = item.has_live_price && item.priceChangePercent !== '';
  const up = pct >= 0;

  return (
    <div
      className={`rounded-2xl border border-surface-border bg-white/[0.03] flex flex-col gap-2.5 ${
        compact ? 'p-3' : 'p-3.5 sm:p-4'
      }`}
    >
      <div className="flex items-start gap-2 min-w-0">
        <MarketCoinCell market={item} size={compact ? 32 : 36} showQuote={false} />
        <div className="flex-1 min-w-0 text-right">
          {item.has_live_price && item.price ? (
            <p className="text-sm font-mono font-bold text-white tabular-nums">
              ${fmtMarketPrice(item.price, item.base)}
            </p>
          ) : (
            <p className="text-[11px] text-zinc-500">Price on deposit</p>
          )}
          {hasPct ? (
            <p className={`text-xs font-bold tabular-nums ${up ? 'text-emerald-400' : 'text-red-400'}`}>
              {up ? '+' : ''}{pct.toFixed(2)}%
            </p>
          ) : null}
        </div>
      </div>

      {item.contract_address ? (
        <p className="text-[10px] font-mono text-zinc-500 truncate" title={item.contract_address}>
          {shortContract(item.contract_address)}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {item.deposit_enabled || item.universal_bep20 ? (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Deposit
          </span>
        ) : (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Soon
          </span>
        )}
        {item.is_listed ? (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-200 border border-sky-500/30">
            Listed
          </span>
        ) : null}
      </div>

      <div className="flex gap-2 mt-auto">
        <Link
          to="/wallet"
          state={{ depositAsset: item.base }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gold/15 border border-gold/30 text-gold-light text-xs font-bold"
        >
          <Wallet size={13} /> Deposit
        </Link>
        {item.actions?.trade ? (
          <Link
            to={`/trade/${item.trade_symbol || `${item.base}BZX`}`}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-surface-border text-xs font-bold text-white hover:border-gold/30"
          >
            Trade BZX <ArrowRight size={12} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

const FILTERS = [
  { id: 'all', label: 'All BEP-20' },
  { id: 'web3', label: 'Web3 directory', web3Only: true },
  { id: 'listed', label: 'Listed', listedOnly: true },
  { id: 'deposit', label: 'Depositable', depositOnly: true },
];

/**
 * Full BSC token directory — same coins as wallet deposit, optimized grid + table.
 */
export default function BscTokenDirectory({
  title = 'BNB Chain (BEP-20) tokens',
  subtitle,
  variant = 'full',
  className = '',
}) {
  const [filterId, setFilterId] = useState('all');
  const activeFilter = FILTERS.find((f) => f.id === filterId) || FILTERS[0];

  const {
    query,
    setQuery,
    items,
    total,
    counts,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
  } = useBscDirectory({
    depositOnly: Boolean(activeFilter.depositOnly),
    listedOnly: Boolean(activeFilter.listedOnly),
    web3Only: Boolean(activeFilter.web3Only),
    pageSize: variant === 'compact' ? 24 : 48,
  });

  const countLabel = useMemo(() => {
    if (!counts) return total > 0 ? `${total} tokens` : '';
    return `${total} tokens · ${counts.deposit_enabled ?? 0} depositable · ${counts.web3_directory ?? counts.with_live_price ?? 0} with live price`;
  }, [counts, total]);

  return (
    <section className={className}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
        <div className="min-w-0">
          {title ? <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-1">{title}</h2> : null}
          {subtitle ? (
            <p className="text-sm text-zinc-500 max-w-2xl">{subtitle}</p>
          ) : (
            <p className="text-sm text-zinc-500 max-w-2xl">
              Same catalog as Wallet → Deposit. Search any BEP-20 on BNB Chain; live USD prices where available.
            </p>
          )}
        </div>
        {countLabel ? (
          <p className="text-[11px] text-zinc-500 font-mono shrink-0">{countLabel}</p>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-surface-border bg-white/[0.04] px-3 py-2.5 min-w-0">
          <Search size={16} className="text-zinc-500 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol, name, contract…"
            className="flex-1 bg-transparent text-sm text-white outline-none min-w-0 placeholder:text-zinc-500"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} className="text-zinc-500 hover:text-white p-0.5">
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterId(f.id)}
            className={`flex-shrink-0 snap-start rounded-full px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
              filterId === f.id
                ? 'bg-gold text-surface-dark'
                : 'bg-white/[0.05] text-zinc-400 border border-white/10 hover:border-gold/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-amber-200 py-8 text-center">{error}</p>
      ) : null}

      {loading && !items.length ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="animate-spin text-gold-light" size={32} />
        </div>
      ) : null}

      {!loading && !items.length && !error ? (
        <p className="text-center text-zinc-500 py-12 text-sm">No tokens match your search.</p>
      ) : null}

      {/* Desktop table */}
      {items.length > 0 ? (
        <div className="hidden lg:block rounded-2xl border border-surface-border overflow-hidden mb-4">
          <div className="overflow-x-auto max-h-[min(520px,60vh)] overflow-y-auto overscroll-contain">
            <table className="w-full text-left text-sm min-w-[900px]">
              <thead className="sticky top-0 z-[1] bg-[#12141a] border-b border-white/10 text-[10px] uppercase text-zinc-500 font-bold">
                <tr>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-3 py-3">Price (USD)</th>
                  <th className="px-3 py-3">24h</th>
                  <th className="px-3 py-3">Vol</th>
                  <th className="px-3 py-3">Contract</th>
                  <th className="px-3 py-3 text-right"> </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const pct = num(it.priceChangePercent);
                  const up = pct >= 0;
                  return (
                    <tr key={`${it.base}-${it.catalog_source}`} className="border-b border-white/[0.06] hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <MarketCoinCell market={it} size={32} showQuote={false} />
                      </td>
                      <td className="px-3 py-3 font-mono text-white tabular-nums">
                        {it.has_live_price ? `$${fmtMarketPrice(it.price, it.base)}` : '—'}
                      </td>
                      <td className={`px-3 py-3 font-bold tabular-nums ${it.has_live_price ? (up ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-600'}`}>
                        {it.has_live_price ? `${up ? '+' : ''}${pct.toFixed(2)}%` : '—'}
                      </td>
                      <td className="px-3 py-3 font-mono text-zinc-400 text-xs tabular-nums">
                        {it.has_live_price ? `$${fmtMarketVol(it.quoteVolume)}` : '—'}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-zinc-500">
                        {shortContract(it.contract_address) || '—'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link to="/wallet" className="text-xs font-bold text-gold-light hover:underline">
                          Deposit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Cards — mobile + tablet */}
      <div
        className={`lg:hidden grid gap-3 ${
          variant === 'compact'
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
        }`}
      >
        {items.map((it) => (
          <TokenCard key={`${it.base}-${it.catalog_source}-card`} item={it} compact={variant === 'compact'} />
        ))}
      </div>

      <MarketsPagination
        shown={items.length}
        total={total}
        pageSize={variant === 'compact' ? 24 : 48}
        onLoadMore={loadMore}
        loading={loadingMore}
      />
    </section>
  );
}
