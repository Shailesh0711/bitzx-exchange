import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import MarketCoinCell from '@/components/markets/MarketCoinCell';
import MarketsSpotMobileCard from '@/components/markets/MarketsSpotMobileCard';
import MarketsPagination from '@/components/markets/MarketsPagination';
import { fmtMarketPrice, fmtMarketVol, num } from '@/lib/marketFormat';
import { hasLive24hStats, isUsdtSpotMarket } from '@/lib/marketStats';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'gainers', label: '24h Gainers' },
  { id: 'losers', label: '24h Losers' },
  { id: 'volume', label: 'By volume' },
  { id: 'listed', label: 'Listed' },
];

const PAGE_SIZE = 40;

function filterMarkets(markets, filterId) {
  if (!markets?.length) return [];
  const spot = markets.filter(isUsdtSpotMarket);
  if (filterId === 'gainers') {
    return [...spot]
      .filter((m) => hasLive24hStats(m) && num(m.priceChangePercent) > 0)
      .sort((a, b) => num(b.priceChangePercent) - num(a.priceChangePercent));
  }
  if (filterId === 'losers') {
    return [...spot]
      .filter((m) => hasLive24hStats(m) && num(m.priceChangePercent) < 0)
      .sort((a, b) => num(a.priceChangePercent) - num(b.priceChangePercent));
  }
  if (filterId === 'volume') {
    return [...spot]
      .filter(hasLive24hStats)
      .sort((a, b) => num(b.quoteVolume) - num(a.quoteVolume));
  }
  if (filterId === 'listed') {
    return spot.filter((m) => m.is_listed || m.source === 'listed' || m.source === 'internal_mock');
  }
  return spot;
}

function DesktopRow({ market }) {
  const pct = num(market.priceChangePercent);
  const isUp = pct >= 0;
  const base = market.base || market.symbol?.replace('USDT', '') || '';

  return (
    <tr className="border-b border-white/[0.06] hover:bg-white/[0.04] group transition-colors">
      <td className="sticky left-0 z-[1] bg-[#0c0e12] group-hover:bg-[#12151c] px-3 sm:px-4 py-3.5 border-r border-white/[0.05]">
        <MarketCoinCell market={market} size={36} />
      </td>
      <td className="px-3 sm:px-4 py-3.5 font-mono font-semibold text-white text-sm tabular-nums whitespace-nowrap">
        ${fmtMarketPrice(market.price, base)}
      </td>
      <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1 font-semibold text-sm tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {isUp ? '+' : ''}{pct.toFixed(2)}%
        </span>
      </td>
      <td className="hidden md:table-cell px-3 sm:px-4 py-3.5 font-mono text-sm text-white/85 tabular-nums whitespace-nowrap">
        ${fmtMarketPrice(market.highPrice, base)}
      </td>
      <td className="hidden md:table-cell px-3 sm:px-4 py-3.5 font-mono text-sm text-white/85 tabular-nums whitespace-nowrap">
        ${fmtMarketPrice(market.lowPrice, base)}
      </td>
      <td className="hidden lg:table-cell px-3 sm:px-4 py-3.5 font-mono text-sm text-white/75 tabular-nums whitespace-nowrap">
        {fmtMarketVol(market.volume)} <span className="text-white/35 text-xs">{base}</span>
      </td>
      <td className="px-3 sm:px-4 py-3.5 font-mono text-sm text-white/85 tabular-nums whitespace-nowrap">
        ${fmtMarketVol(market.quoteVolume)}
      </td>
      <td className="sticky right-0 z-[1] bg-[#0c0e12] group-hover:bg-[#12151c] px-3 sm:px-4 py-3.5 text-right border-l border-white/[0.05]">
        <Link
          to={`/trade/${market.symbol}`}
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-gold-light bg-gold/10 hover:bg-gold/20 border border-gold/25 px-3 py-1.5 rounded-lg transition-colors"
        >
          Trade <ArrowRight size={13} />
        </Link>
      </td>
    </tr>
  );
}

/**
 * Responsive live markets block — desktop table + mobile cards, paginated.
 */
export default function LiveMarketsSection({
  markets = [],
  loading = false,
  title = 'Live USDT pairs',
  subtitle,
  showFilters = true,
  filter: controlledFilter,
  onFilterChange,
  marketsLink = '/markets',
  listCoinLink = '/list-coin',
  className = '',
}) {
  const [internalFilter, setInternalFilter] = useState('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const filter = controlledFilter ?? internalFilter;
  const setFilter = onFilterChange ?? setInternalFilter;

  const filtered = useMemo(() => filterMarkets(markets, filter), [markets, filter]);
  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  return (
    <section className={`w-full ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6 md:mb-8">
        <div className="max-w-2xl min-w-0">
          <p className="bitzx-eyebrow mb-2 sm:mb-3">Markets</p>
          <h2 className="bitzx-title-lg mb-2 sm:mb-3">{title}</h2>
          {subtitle ? (
            <p className="bitzx-lead text-zinc-500 max-w-none text-sm sm:text-base">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
          {listCoinLink ? (
            <Link to={listCoinLink} className="text-sm font-medium text-white/75 hover:text-gold-light">
              List your coin
            </Link>
          ) : null}
          {marketsLink ? (
            <Link to={marketsLink} className="text-sm font-medium text-gold-light flex items-center gap-1">
              Full markets <ArrowRight size={15} />
            </Link>
          ) : null}
        </div>
      </div>

      {showFilters ? (
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-2 mb-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => { setFilter(id); setLimit(PAGE_SIZE); }}
              className={`flex-shrink-0 snap-start rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                filter === id
                  ? 'bg-gold text-surface-dark shadow-md shadow-gold/10'
                  : 'bg-white/[0.05] text-zinc-300 border border-white/10 hover:border-gold/30'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="flex-shrink-0 self-center text-[10px] text-zinc-500 font-mono pl-1">
            {filtered.length} pairs
          </span>
        </div>
      ) : null}

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02]">
        <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
          <table className="w-full text-left min-w-[800px]">
            <thead className="border-b border-white/[0.08] bg-[#0a0b0f]/90">
              <tr className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                <th className="sticky left-0 z-[2] bg-[#0a0b0f] px-3 sm:px-4 py-3 border-r border-white/[0.06]">Pair</th>
                <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Last</th>
                <th className="px-3 sm:px-4 py-3 whitespace-nowrap">24h</th>
                <th className="hidden md:table-cell px-3 sm:px-4 py-3 whitespace-nowrap">High</th>
                <th className="hidden md:table-cell px-3 sm:px-4 py-3 whitespace-nowrap">Low</th>
                <th className="hidden lg:table-cell px-3 sm:px-4 py-3 whitespace-nowrap">Vol (base)</th>
                <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Vol USDT</th>
                <th className="sticky right-0 z-[2] bg-[#0a0b0f] px-3 sm:px-4 py-3 border-l border-white/[0.06]" />
              </tr>
            </thead>
            <tbody>
              {loading && !visible.length ? (
                <tr>
                  <td colSpan={8} className="text-center py-14 text-zinc-500">
                    <RefreshCw size={24} className="animate-spin text-gold-light mx-auto mb-2" />
                    Loading markets…
                  </td>
                </tr>
              ) : !visible.length ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-500 text-sm">
                    No pairs match this filter.
                  </td>
                </tr>
              ) : (
                visible.map((m) => <DesktopRow key={m.symbol} market={m} />)
              )}
            </tbody>
          </table>
        </div>
        <MarketsPagination
          shown={visible.length}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onLoadMore={() => setLimit((n) => n + PAGE_SIZE)}
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading && !visible.length ? (
          <div className="py-14 flex justify-center">
            <RefreshCw size={26} className="animate-spin text-gold-light" />
          </div>
        ) : !visible.length ? (
          <p className="text-center text-zinc-500 py-10 text-sm">No pairs match this filter.</p>
        ) : (
          visible.map((m, i) => (
            <motion.div
              key={m.symbol}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.2) }}
            >
              <MarketsSpotMobileCard market={m} />
            </motion.div>
          ))
        )}
        <MarketsPagination
          shown={visible.length}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onLoadMore={() => setLimit((n) => n + PAGE_SIZE)}
        />
      </div>
    </section>
  );
}
